
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { lrService } from '../services/lrService';
import { LR, LRErrorState } from '../types';

const Input = ({ label, value, onChange, error, placeholder, type = "text", readOnly = false, maxLength }: any) => (
  <div className="space-y-1">
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => !readOnly && onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      maxLength={maxLength}
      className={`w-full px-4 py-2 border ${error ? 'border-red-500 ring-1 ring-red-100' : 'border-slate-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm ${readOnly ? 'bg-slate-100 font-medium text-slate-600' : 'bg-white text-slate-900'}`}
    />
    {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}
  </div>
);

const Select = ({ label, value, onChange, error, options, disabled, loading }: any) => (
  <div className="space-y-1">
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-4 py-2 bg-white border ${error ? 'border-red-500 ring-1 ring-red-100' : 'border-slate-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm appearance-none ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
      >
        <option value="">{loading ? 'Loading...' : `Select ${label}`}</option>
        {options.map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
    {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}
  </div>
);

const TextArea = ({ label, value, onChange, error, placeholder }: any) => (
  <div className="space-y-1">
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className={`w-full px-4 py-2 bg-white border ${error ? 'border-red-500 ring-1 ring-red-100' : 'border-slate-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm resize-none`}
    />
    {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}
  </div>
);

const EditLR: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [fetchingDestinations, setFetchingDestinations] = useState(false);
  const [selectedToOption, setSelectedToOption] = useState<string>('');
  const [formData, setFormData] = useState<LR | null>(null);
  const [errors, setErrors] = useState<LRErrorState>({});

  const user = lrService.getCurrentUser();
  if (user.role !== 'admin') {
     return <div className="p-20 text-center font-bold text-red-500 tracking-widest uppercase">Unauthorized Access</div>;
  }

  useEffect(() => {
    if (id) {
      lrService.getLRById(id).then((data) => {
        if (data) {
          setFormData(data);
          // Check if destination is in predefined list
          lrService.getDestinations(data.shipment.fromLocation).then(destList => {
             setDestinations(destList);
             if (destList.includes(data.shipment.toLocation)) {
                setSelectedToOption(data.shipment.toLocation);
             } else {
                setSelectedToOption('Others');
             }
             setFetchingData(false);
          });
        } else {
          navigate('/list');
        }
      });
    }
  }, [id]);

  const validate = (): boolean => {
    if (!formData) return false;
    const newErrors: LRErrorState = {};
    if (!formData.sender.name) newErrors.senderName = 'Sender name is required';
    if (!formData.sender.mobile || formData.sender.mobile.length !== 10) newErrors.senderMobile = 'Valid 10-digit mobile is required';
    if (!formData.receiver.name) newErrors.receiverName = 'Receiver name is required';
    if (!formData.receiver.mobile || formData.receiver.mobile.length !== 10) newErrors.receiverMobile = 'Valid 10-digit mobile is required';
    if (!formData.shipment.toLocation) newErrors.toLocation = 'Required';
    if (!formData.shipment.description) newErrors.description = 'Required';
    if (formData.shipment.weight && isNaN(Number(formData.shipment.weight))) newErrors.weight = 'Numeric weight required';
    if (!formData.shipment.packages || isNaN(Number(formData.shipment.packages))) newErrors.packages = 'Required (numeric)';
    if (!formData.charges || isNaN(Number(formData.charges))) newErrors.charges = 'Valid charges required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (section: string, field: string, value: string) => {
    if (!formData) return;
    if (section === 'root') {
      setFormData((prev) => prev ? ({ ...prev, [field]: value }) : null);
    } else {
      setFormData((prev) => prev ? ({
        ...prev,
        [section]: {
          ...(prev[section as keyof typeof prev] as any),
          [field]: value,
        },
      }) : null);
    }
  };

  const handleToLocationSelect = (value: string) => {
    setSelectedToOption(value);
    if (value !== 'Others') {
      handleChange('shipment', 'toLocation', value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !validate()) return;

    setLoading(true);
    try {
      await lrService.updateLR(formData.id, formData);
      navigate(`/lr/${formData.id}`);
    } catch (err) {
      alert('Error updating LR.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData || !formData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-b-2 border-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Loading Booking Data...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Lorry Receipt</h1>
          <p className="text-slate-500 text-sm">Modifying record for <span className="font-bold text-slate-900">{formData.lrNumber}</span></p>
        </div>
        <button 
          onClick={() => navigate('/list')}
          className="text-xs font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest"
        >
          Cancel Changes
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-blue-700 border-b border-slate-100 pb-2 mb-4">SENDER DETAILS</h2>
            <Input
              label="Sender Name"
              value={formData.sender.name}
              onChange={(v: string) => handleChange('sender', 'name', v)}
              error={errors.senderName}
            />
            <Input
              label="Mobile Number"
              value={formData.sender.mobile}
              onChange={(v: string) => handleChange('sender', 'mobile', v.replace(/\D/g, '').slice(0, 10))}
              error={errors.senderMobile}
              placeholder="10 digit mobile"
            />
            <TextArea
              label="Address"
              value={formData.sender.address}
              onChange={(v: string) => handleChange('sender', 'address', v)}
            />
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-blue-700 border-b border-slate-100 pb-2 mb-4">RECEIVER DETAILS</h2>
            <Input
              label="Receiver Name"
              value={formData.receiver.name}
              onChange={(v: string) => handleChange('receiver', 'name', v)}
              error={errors.receiverName}
            />
            <Input
              label="Mobile Number"
              value={formData.receiver.mobile}
              onChange={(v: string) => handleChange('receiver', 'mobile', v.replace(/\D/g, '').slice(0, 10))}
              error={errors.receiverMobile}
              placeholder="10 digit mobile"
            />
            <TextArea
              label="Address"
              value={formData.receiver.address}
              onChange={(v: string) => handleChange('receiver', 'address', v)}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-blue-700 border-b border-slate-100 pb-2 mb-4">SHIPMENT & CHARGES</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-4">
                <Select
                  label="To Location"
                  value={selectedToOption}
                  options={destinations}
                  onChange={handleToLocationSelect}
                  error={errors.toLocation}
                />
                {selectedToOption === 'Others' && (
                  <Input
                    label="Enter Other Location"
                    value={formData.shipment.toLocation}
                    onChange={(v: string) => handleChange('shipment', 'toLocation', v)}
                    error={errors.toLocation}
                  />
                )}
             </div>
             <Input
                label="Nature of Goods"
                value={formData.shipment.description}
                onChange={(v: string) => handleChange('shipment', 'description', v)}
                error={errors.description}
              />
              <Input
                label="Packages"
                value={formData.shipment.packages}
                onChange={(v: string) => handleChange('shipment', 'packages', v)}
                error={errors.packages}
              />
              <Input
                label="Freight Charges (₹)"
                value={formData.charges}
                onChange={(v: string) => handleChange('root', 'charges', v)}
                error={errors.charges}
              />
          </div>
        </div>

        <div className="flex gap-4 pt-4 sticky bottom-4">
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? 'SAVING CHANGES...' : 'SAVE UPDATED RECEIPT'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditLR;
