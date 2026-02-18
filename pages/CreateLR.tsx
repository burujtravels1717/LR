
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { lrService } from '../services/lrService';
import { entityService } from '../services/entityService';
import { LR, LRErrorState, BranchDetail } from '../types';

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

const Select = ({ label, value, onChange, error, options, disabled, loading, displayKey = 'name', valueKey = 'id' }: any) => (
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
        {options.map((opt: any) => {
          const isString = typeof opt === 'string';
          return (
            <option key={isString ? opt : opt[valueKey]} value={isString ? opt : opt[valueKey]}>
              {isString ? opt : opt[displayKey]}
            </option>
          );
        })}
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

const CreateLR: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = lrService.getCurrentUser();
  const [loading, setLoading] = useState(false);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [fetchingDestinations, setFetchingDestinations] = useState(false);
  const [selectedToOption, setSelectedToOption] = useState<string>('');
  const [availableBranches, setAvailableBranches] = useState<BranchDetail[]>([]);

  const [formData, setFormData] = useState<Omit<LR, 'id' | 'lrNumber' | 'date' | 'createdBy'>>({
    branch: currentUser?.branch === 'ALL' ? 'KPM' : currentUser?.branch || '',
    sender: { name: '', mobile: '', address: '' },
    receiver: { name: '', mobile: '', address: '' },
    shipment: { 
      fromLocation: '', 
      toLocation: '', 
      description: '', 
      weight: '', 
      packages: '' 
    },
    charges: '',
    paymentStatus: 'To Pay',
    transporterId: null,
    transporterName: null,
    transporterCommissionPercent: null,
    transporterCommissionAmount: null,
    netPayableToTransporter: null,
    assignedAt: null
  });

  const [errors, setErrors] = useState<LRErrorState>({});

  useEffect(() => {
    entityService.getBranches().then(list => {
      setAvailableBranches(list.filter(b => b.status === 'Active'));
    });
  }, []);

  useEffect(() => {
    if (availableBranches.length > 0 && formData.branch) {
      const selectedBranch = availableBranches.find(b => b.code === formData.branch);
      if (selectedBranch) {
        setFormData(prev => ({
          ...prev,
          shipment: {
            ...prev.shipment,
            fromLocation: selectedBranch.name,
            toLocation: ''
          }
        }));
        setSelectedToOption('');
      }
    }
  }, [formData.branch, availableBranches]);

  useEffect(() => {
    if (formData.shipment.fromLocation) {
      setFetchingDestinations(true);
      lrService.getDestinations(formData.shipment.fromLocation).then((data) => {
        setDestinations(data);
        if (!data.includes(selectedToOption) && selectedToOption !== 'Others') {
          setSelectedToOption('');
        }
        setFetchingDestinations(false);
      });
    } else {
      setDestinations([]);
    }
  }, [formData.shipment.fromLocation]);

  const validate = (): boolean => {
    const newErrors: LRErrorState = {};
    if (!formData.sender.name) newErrors.senderName = 'Sender name is required';
    if (!formData.sender.mobile || formData.sender.mobile.length !== 10) newErrors.senderMobile = 'Valid 10-digit mobile is required';
    if (!formData.receiver.name) newErrors.receiverName = 'Receiver name is required';
    if (!formData.receiver.mobile || formData.receiver.mobile.length !== 10) newErrors.receiverMobile = 'Valid 10-digit mobile is required';
    if (!formData.shipment.fromLocation) newErrors.fromLocation = 'Required';
    if (!formData.shipment.toLocation) newErrors.toLocation = 'Required';
    if (!formData.shipment.description) newErrors.description = 'Required';
    if (formData.shipment.weight && isNaN(Number(formData.shipment.weight))) newErrors.weight = 'Numeric weight required';
    if (!formData.shipment.packages || isNaN(Number(formData.shipment.packages))) newErrors.packages = 'Required (numeric)';
    if (!formData.charges || isNaN(Number(formData.charges))) newErrors.charges = 'Valid charges required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (section: string, field: string, value: string) => {
    if (section === 'root') {
      setFormData((prev) => ({ ...prev, [field]: value }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [section]: {
          ...(prev[section as keyof typeof prev] as any),
          [field]: value,
        },
      }));
    }
    const errKey = section === 'root' ? field : `${section}${field.charAt(0).toUpperCase() + field.slice(1)}`;
    if (errors[errKey]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[errKey];
        return next;
      });
    }
  };

  const handleMobileChange = (section: 'sender' | 'receiver', value: string) => {
    const sanitized = value.replace(/\D/g, '').slice(0, 10);
    handleChange(section, 'mobile', sanitized);
  };

  const handleToLocationSelect = (value: string) => {
    setSelectedToOption(value);
    if (value !== 'Others') {
      handleChange('shipment', 'toLocation', value);
    } else {
      handleChange('shipment', 'toLocation', '');
    }
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear the entire form?')) {
      const selectedBranchCode = currentUser?.branch === 'ALL' ? 'KPM' : (currentUser?.branch || '');
      const selectedBranchName = availableBranches.find(b => b.code === selectedBranchCode)?.name || '';
      
      setFormData({
        branch: selectedBranchCode,
        sender: { name: '', mobile: '', address: '' },
        receiver: { name: '', mobile: '', address: '' },
        shipment: { 
          fromLocation: selectedBranchName, 
          toLocation: '', 
          description: '', 
          weight: '', 
          packages: '' 
        },
        charges: '',
        paymentStatus: 'To Pay',
        transporterId: null,
        transporterName: null,
        transporterCommissionPercent: null,
        transporterCommissionAmount: null,
        netPayableToTransporter: null,
        assignedAt: null
      });
      setSelectedToOption('');
      setErrors({});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await lrService.createLR(formData);
      navigate(`/lr/${result.id}`);
    } catch (err) {
      alert('Error creating LR. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Generate Lorry Receipt</h1>
        <p className="text-slate-500 text-sm">Fill in the details below to create a new booking.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="max-w-xs">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Branch Location</label>
            <select
              disabled={currentUser?.branch !== 'ALL'}
              value={formData.branch}
              onChange={(e) => handleChange('root', 'branch', e.target.value)}
              className={`w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-blue-700 ${currentUser?.branch !== 'ALL' ? 'bg-slate-50 cursor-not-allowed opacity-80' : 'bg-white'}`}
            >
              {availableBranches.map(branch => (
                <option key={branch.id} value={branch.code}>{branch.code} - {branch.name}</option>
              ))}
            </select>
            {currentUser?.branch !== 'ALL' && (
              <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Limited to your assigned branch</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-blue-700 border-b border-slate-100 pb-2 mb-4">SENDER DETAILS</h2>
            <Input label="Sender Name" value={formData.sender.name} onChange={(v: string) => handleChange('sender', 'name', v)} error={errors.senderName} />
            <Input label="Mobile Number" value={formData.sender.mobile} onChange={(v: string) => handleMobileChange('sender', v)} error={errors.senderMobile} placeholder="10 digit mobile" maxLength={10} />
            <TextArea label="Address (Optional)" value={formData.sender.address} onChange={(v: string) => handleChange('sender', 'address', v)} error={errors.senderAddress} />
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-blue-700 border-b border-slate-100 pb-2 mb-4">RECEIVER DETAILS</h2>
            <Input label="Receiver Name" value={formData.receiver.name} onChange={(v: string) => handleChange('receiver', 'name', v)} error={errors.receiverName} />
            <Input label="Mobile Number" value={formData.receiver.mobile} onChange={(v: string) => handleMobileChange('receiver', v)} error={errors.receiverMobile} placeholder="10 digit mobile" maxLength={10} />
            <TextArea label="Address (Optional)" value={formData.receiver.address} onChange={(v: string) => handleChange('receiver', 'address', v)} error={errors.receiverAddress} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-blue-700 border-b border-slate-100 pb-2 mb-4">SHIPMENT DETAILS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="From Location" value={formData.shipment.fromLocation} readOnly={true} error={errors.fromLocation} />
            <div className="space-y-4">
              <Select label="To Location" value={selectedToOption} options={destinations} disabled={!formData.shipment.fromLocation || fetchingDestinations} loading={fetchingDestinations} onChange={handleToLocationSelect} error={errors.toLocation} />
              {selectedToOption === 'Others' && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <Input label="Enter Other Location" value={formData.shipment.toLocation} onChange={(v: string) => handleChange('shipment', 'toLocation', v)} placeholder="Type destination name" error={errors.toLocation} />
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <Input label="Description" value={formData.shipment.description} onChange={(v: string) => handleChange('shipment', 'description', v)} error={errors.description} placeholder="e.g. Household goods, Electronics" />
            </div>
            <Input label="Weight (Kg) (Optional)" value={formData.shipment.weight} onChange={(v: string) => handleChange('shipment', 'weight', v)} error={errors.weight} />
            <Input label="Packages" value={formData.shipment.packages} onChange={(v: string) => handleChange('shipment', 'packages', v)} error={errors.packages} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-blue-700 border-b border-slate-100 pb-2 mb-4">CHARGES & PAYMENT</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <Input label="Freight Charges (₹)" value={formData.charges} onChange={(v: string) => handleChange('root', 'charges', v)} error={errors.charges} placeholder="0.00" />
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Status</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" name="paymentStatus" checked={formData.paymentStatus === 'Paid'} onChange={() => handleChange('root', 'paymentStatus', 'Paid')} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Paid</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" name="paymentStatus" checked={formData.paymentStatus === 'To Pay'} onChange={() => handleChange('root', 'paymentStatus', 'To Pay')} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">To Pay</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4 sticky bottom-4">
          <button type="submit" disabled={loading} className={`flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}>
            {loading ? 'GENERATING...' : 'GENERATE LORRY RECEIPT'}
          </button>
          <button type="button" onClick={handleClear} className="px-8 py-3 bg-white border border-slate-300 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition-colors">CLEAR FORM</button>
        </div>
      </form>
    </div>
  );
};

export default CreateLR;
