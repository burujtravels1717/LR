
import React, { useState, useEffect } from 'react';
import { LR, BusinessSettings } from '../types';
import { entityService } from '../services/entityService';

interface PrintableLRProps {
  lr: LR;
}

const LRTemplate: React.FC<{ lr: LR; copyType: string }> = ({ lr, copyType }) => {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  useEffect(() => {
    entityService.getSettings().then(setSettings);
  }, []);

  if (!settings) {
    return <div className="text-center p-10 font-bold uppercase text-[#94a3b8]">Loading Document...</div>;
  }

  const businessName = settings.businessName || 'Entity System';
  const primaryName = settings.primaryName || '';
  const primaryPhone = settings.primaryPhone || '';
  const secondaryName = settings.secondaryName || '';
  const secondaryPhone = settings.secondaryPhone || '';

  return (
    <div className="w-[210mm] h-[148.5mm] p-[8mm] flex flex-col bg-white box-border relative overflow-hidden border-b border-[#e2e8f0] last:border-b-0 print:border-none">
      {/* Decorative Outer Border inside padding */}
      <div className="absolute inset-[6mm] border-[1.5pt] border-[#0f172a] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col h-full p-4">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h1 className="text-2xl font-black text-[#0f172a] leading-none uppercase tracking-tighter">{businessName}</h1>
            <p className="text-[9px] font-bold text-[#64748b] uppercase mt-1 tracking-tight">
              Branch: {lr.branch} | GSTIN: {settings?.gstin || '33ABCDE1234F1Z5'}
            </p>
            <p className="text-[8px] font-bold text-[#475569] mt-1 uppercase tracking-tight">
              Mob: {primaryName} - {primaryPhone} {secondaryName && `| ${secondaryName} - ${secondaryPhone}`}
            </p>
          </div>
          <div className="text-right">
            <div className="bg-[#0f172a] text-white px-3 py-0.5 text-[8px] font-black uppercase tracking-[0.2em] mb-1.5 inline-block">
              {copyType}
            </div>
            <div className="text-xl font-black text-[#0f172a] leading-none tracking-tight">LR: {lr.lrNumber}</div>
            <p className="text-[10px] font-bold text-[#475569] mt-1 uppercase">Date: {new Date(lr.date).toLocaleDateString('en-GB')}</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-2 gap-4 border-t-[1pt] border-b-[1pt] border-[#cbd5e1] py-2.5 mb-3">
          <div className="border-r border-[#f1f5f9] pr-4">
            <h3 className="text-[8px] font-black uppercase text-[#2563eb] mb-1 tracking-widest">Consignor (From)</h3>
            <p className="text-sm font-black text-[#0f172a] truncate">{lr.sender.name}</p>
            <p className="text-[10px] font-bold text-[#334155]">{lr.sender.mobile}</p>
            <p className="text-[9px] text-[#64748b] leading-tight mt-1 line-clamp-2 italic">{lr.sender.address || 'No Address Provided'}</p>
          </div>
          <div className="pl-4">
            <h3 className="text-[8px] font-black uppercase text-[#2563eb] mb-1 tracking-widest">Consignee (To)</h3>
            <p className="text-sm font-black text-[#0f172a] truncate">{lr.receiver.name}</p>
            <p className="text-[10px] font-bold text-[#334155]">{lr.receiver.mobile}</p>
            <p className="text-[9px] text-[#64748b] leading-tight mt-1 line-clamp-2 italic">{lr.receiver.address || 'No Address Provided'}</p>
          </div>
        </div>

        {/* Shipment Details Table */}
        <div className="flex-1">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] border border-[#cbd5e1]">
                <th className="px-3 py-1 text-[9px] font-black uppercase text-[#475569] text-left">Nature of Goods</th>
                <th className="px-3 py-1 text-[9px] font-black uppercase text-[#475569] text-center w-20">Pkgs</th>
                <th className="px-3 py-1 text-[9px] font-black uppercase text-[#475569] text-center w-24">Weight</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-x border-b border-[#cbd5e1]">
                <td className="px-3 py-2.5 h-16 align-top">
                  <p className="text-xs font-black text-[#1e293b] uppercase tracking-tight">{lr.shipment.description}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="text-[7px] font-black bg-[#dbeafe] text-[#1d4ed8] px-1.5 py-0.5 rounded uppercase">Route</span>
                    <span className="text-[8px] font-bold text-[#64748b]">{lr.shipment.fromLocation} → {lr.shipment.toLocation}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-sm font-black text-[#0f172a] text-center align-top border-l border-[#e2e8f0]">{lr.shipment.packages}</td>
                <td className="px-3 py-2.5 text-sm font-black text-[#0f172a] text-center align-top border-l border-[#e2e8f0]">
                  {lr.shipment.weight ? `${lr.shipment.weight} KG` : '---'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary / Signature Footer */}
        <div className="flex justify-between items-end mt-4">
          <div className="flex items-center gap-4 bg-[#f8fafc] border border-[#cbd5e1] p-2 min-w-[180px]">
            <div className="flex-1">
              <p className="text-[7px] font-black text-[#94a3b8] uppercase tracking-widest leading-none mb-1">Status</p>
              <p className="text-[10px] font-black text-[#0f172a] uppercase">{lr.paymentStatus}</p>
            </div>
            <div className="w-[1pt] h-6 bg-[#e2e8f0]"></div>
            <div className="text-right">
              <p className="text-[7px] font-black text-[#94a3b8] uppercase tracking-widest leading-none mb-1">Total</p>
              <p className="text-base font-black text-[#0f172a] leading-none">₹{parseFloat(lr.charges).toLocaleString()}</p>
            </div>
          </div>

          <div className="flex gap-6">
            {/* Receiver Signature Field */}
            <div className="text-center w-[110px]">
              <div className="h-[20px]"></div> {/* Spacer for virtual signature space */}
              <div className="h-[0.5pt] bg-[#cbd5e1] w-full mb-1"></div>
              <p className="text-[7px] font-black text-[#94a3b8] uppercase tracking-[0.2em]">Receiver Sign</p>
            </div>

            {/* Authorized Signature Field with Dynamic User Name */}
            <div className="text-center w-[120px] flex flex-col items-center">
              <p className="text-[10px] font-bold text-[#1e293b] mb-0.5 italic tracking-tight font-serif">{lr.createdBy}</p>
              <div className="h-[1pt] bg-[#0f172a] w-full mb-1"></div>
              <p className="text-[8px] font-black text-[#0f172a] uppercase tracking-[0.2em]">Authorized Sign</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PrintableLR: React.FC<PrintableLRProps> = ({ lr }) => {
  return (
    <div className="bg-[#e2e8f0] shadow-2xl p-4 print:p-0 print:bg-white print:shadow-none">
      {/* 
        OFF-SCREEN CLEAN CAPTURE TARGET 
        This is what html2pdf will capture for the Customer Copy PDF. 
        It is rendered at exactly 210mm x 148.5mm.
      */}
      <div className="fixed -left-[10000px] -top-[10000px] pointer-events-none">
        <div id="pdf-capture-target" className="w-[210mm] h-[148.5mm] overflow-hidden bg-white">
          <LRTemplate lr={lr} copyType="CUSTOMER COPY" />
        </div>
      </div>

      {/* ON-SCREEN A4 PREVIEW (Stacks two A5s perfectly) */}
      <div className="a4-preview-container bg-white mx-auto print:border-none border border-[#cbd5e1]">
        <div className="a5-copy">
          <LRTemplate lr={lr} copyType="CUSTOMER COPY" />
        </div>

        {/* Tear Indicator (Screen only) */}
        <div className="no-print h-0 w-full border-t border-dashed border-[#94a3b8] relative z-50">
          <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">
            FOLD / TEAR LINE
          </span>
        </div>

        <div className="a5-copy">
          <LRTemplate lr={lr} copyType="TRANSPORTER COPY" />
        </div>
      </div>
    </div>
  );
};

export default PrintableLR;
