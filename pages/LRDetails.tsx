
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { lrService } from '../services/lrService';
import { LR } from '../types';
import PrintableLR from '../components/PrintableLR';
import html2pdf from 'html2pdf.js';

const LRDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [lr, setLr] = useState<LR | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareStatus, setShareStatus] = useState<'idle' | 'downloading' | 'redirecting' | 'blocked'>('idle');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [businessName, setBusinessName] = useState('KPM SYSTEMS');

  useEffect(() => {
    import('../services/entityService').then(({ entityService }) => {
      entityService.getSettings().then(settings => {
        if (settings.businessName) {
          setBusinessName(settings.businessName);
          document.title = `${settings.businessName} - LR Document`;
        }
      });
    });

    if (id) {
      lrService.getLRById(id).then((data) => {
        setLr(data);
        setLoading(false);
      });
    }
  }, [id]);

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleShare = async () => {
    const element = document.getElementById('pdf-capture-target');
    if (!lr || !element) return;

    setShareStatus('downloading');

    try {
      // Precise A5 Landscape Configuration (210mm x 148.5mm)
      const opt = {
        margin: 0,
        filename: `${lr.lrNumber}_Customer_Copy.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollY: 0,
          scrollX: 0,
          backgroundColor: '#ffffff'
        },
        jsPDF: {
          unit: 'mm',
          format: 'a5',
          orientation: 'landscape' as const,
          compress: true
        }
      };

      // 0. Ensure fonts are ready
      if ((document as any).fonts) {
        await (document as any).fonts.ready;
      }

      // 1. Generate and Download
      await html2pdf().set(opt).from(element).save();

      // 2. Prepare WhatsApp
      setShareStatus('redirecting');

      const formattedDate = new Date(lr.date).toLocaleDateString('en-GB');
      const weightDisplay = lr.shipment.weight || 'N/A';

      const message = `*LR BOOKING CONFIRMATION*

*LR No:* ${lr.lrNumber}
*Date:* ${formattedDate}
*From:* ${lr.shipment.fromLocation}
*To:* ${lr.shipment.toLocation}

*Sender:* ${lr.sender.name} - ${lr.sender.mobile}
*Receiver:* ${lr.receiver.name} - ${lr.receiver.mobile}

*Pkgs:* ${lr.shipment.packages}
*Weight:* ${weightDisplay}
*Charges:* ₹${lr.charges}
*Status:* ${lr.paymentStatus}

_Generated via ${businessName}_`;

      const encodedMsg = encodeURIComponent(message);
      const url = `https://wa.me/${lr.receiver.mobile}?text=${encodedMsg}`;
      setWhatsappUrl(url);

      setTimeout(() => {
        const newWindow = window.open(url, '_blank');
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          setShareStatus('blocked');
        } else {
          setShareStatus('idle');
        }
      }, 1000);

    } catch (err: any) {
      console.error("Share error:", err);
      alert(`Error generating PDF: ${err.message || err.toString()}`);
      setShareStatus('idle');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-14 h-14 border-b-2 border-blue-600 rounded-full animate-spin"></div>
        <p className="mt-6 text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] animate-pulse">Processing Document</p>
      </div>
    );
  }

  if (!lr) return <div className="p-20 text-center font-bold text-red-500 tracking-widest uppercase">Document Not Found</div>;

  return (
    <div className="max-w-[1100px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* Action Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12 no-print bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{lr.lrNumber}</h1>
          </div>
          <p className="text-slate-400 font-bold text-[11px] uppercase tracking-widest ml-6">
            {businessName} SYSTEM • {lr.branch} BRANCH
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          {shareStatus === 'blocked' ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShareStatus('idle')}
              className="px-10 py-3.5 bg-green-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-green-700 flex items-center gap-3 animate-bounce shadow-2xl shadow-green-500/40"
            >
              OPEN WHATSAPP ➔
            </a>
          ) : (
            <button
              onClick={handleShare}
              disabled={shareStatus !== 'idle'}
              className={`px-8 py-3.5 bg-white border-2 border-slate-900 text-slate-900 font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-slate-900 hover:text-white transition-all flex items-center gap-3 group ${shareStatus !== 'idle' ? 'opacity-50 cursor-wait' : ''}`}
            >
              {shareStatus === 'downloading' ? 'GENERATING A5 PDF...' : shareStatus === 'redirecting' ? 'OPENING CHAT...' : 'DOWNLOAD & SHARE'}
              {shareStatus === 'idle' && (
                <svg className="w-4 h-4 group-hover:scale-125 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-8 py-3.5 bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-blue-700 transition-all flex items-center gap-3 shadow-xl shadow-blue-500/20"
          >
            PRINT A4 (DUAL COPY)
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex justify-center mb-12">
        <PrintableLR lr={lr} />
      </div>

      <div className="mt-12 text-center no-print pb-24">
        <Link to="/create" className="group text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-[0.4em] transition-all">
          <span className="group-hover:mr-4 transition-all inline-block">←</span> NEW BOOKING
        </Link>
      </div>
    </div>
  );
};

export default LRDetails;
