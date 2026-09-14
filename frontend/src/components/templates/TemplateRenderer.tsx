import React, { useState } from 'react';
import { CheckoutData } from '../../types';
import { 
  ShieldCheck, 
  Copy, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  QrCode, 
  ChevronRight,
  ExternalLink,
  Lock,
  Sparkles,
  Zap,
  ArrowRight,
  Coins
} from 'lucide-react';

interface TemplateProps {
  data: CheckoutData;
  timeRemaining: number;
  isVerifying: boolean;
  onVerifyUtr: (utr: string) => void;
}

// -------------------------------------------------------------
// TEMPLATE 1: Cyberpunk Dark Glass (Modern, Sleek Neon)
// -------------------------------------------------------------
export const Template1_DarkGlass: React.FC<TemplateProps> = ({ data, timeRemaining, isVerifying, onVerifyUtr }) => {
  const [copied, setCopied] = useState(false);
  const [utrInput, setUtrInput] = useState('');
  const [showUtrModal, setShowUtrModal] = useState(false);

  const copyUpi = () => {
    navigator.clipboard.writeText(data.payment_details.upi_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-3xl border border-indigo-500/20 bg-slate-900/80 backdrop-blur-2xl p-6 shadow-2xl shadow-indigo-500/10 text-white relative overflow-hidden">
        
        {/* Glow Header */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent rounded-full shadow-[0_0_20px_#6366f1]" />

        {/* Merchant Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center font-bold text-white shadow-glow">
              {data.branding.brand_name.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-none text-slate-100">{data.branding.brand_name}</h3>
              <span className="text-[10px] text-slate-400 font-mono">Order: {data.order_id}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-xs font-mono text-indigo-400">
            <Clock className="h-3.5 w-3.5 animate-pulse" />
            <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
          </div>
        </div>

        {/* Amount Display */}
        <div className="my-5 text-center bg-slate-800/40 rounded-2xl p-4 border border-white/5">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Amount to Pay</span>
          <div className="text-4xl font-extrabold font-display text-white mt-1">
            ₹{data.amount.toFixed(2)}
          </div>
          {data.remark1 && (
            <div className="mt-1 text-xs text-indigo-300/80 font-medium">Ref: {data.remark1}</div>
          )}
        </div>

        {/* Dynamic QR Code */}
        {data.payment_details.qr_code_base64 && (
          <div className="flex flex-col items-center justify-center my-4">
            <div className="p-3 bg-white rounded-2xl shadow-xl border-2 border-indigo-500/30">
              <img src={data.payment_details.qr_code_base64} alt="Scan & Pay UPI QR" className="h-44 w-44 rounded-lg object-contain" />
            </div>
            <span className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              Scan with any UPI App (GPay, PhonePe, Paytm, CRED)
            </span>
          </div>
        )}

        {/* UPI Copy Box */}
        <div className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-white/10 px-3.5 py-2.5 text-xs font-mono mb-4">
          <span className="text-slate-300 truncate max-w-[220px]">{data.payment_details.upi_id}</span>
          <button 
            onClick={copyUpi} 
            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold active:scale-95 transition"
          >
            {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {/* Quick App Intent Launchers */}
        <div className="space-y-2 mb-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Pay using UPI App</span>
          <div className="grid grid-cols-3 gap-2">
            <a 
              href={data.payment_details.intents.gpay}
              className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border border-white/10 bg-slate-800/40 hover:bg-indigo-600/20 hover:border-indigo-500/40 transition active:scale-95"
            >
              <span className="font-display font-bold text-xs text-white">Google Pay</span>
            </a>
            <a 
              href={data.payment_details.intents.phonepe}
              className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border border-white/10 bg-slate-800/40 hover:bg-purple-600/20 hover:border-purple-500/40 transition active:scale-95"
            >
              <span className="font-display font-bold text-xs text-white">PhonePe</span>
            </a>
            <a 
              href={data.payment_details.intents.paytm}
              className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border border-white/10 bg-slate-800/40 hover:bg-sky-600/20 hover:border-sky-500/40 transition active:scale-95"
            >
              <span className="font-display font-bold text-xs text-white">Paytm UPI</span>
            </a>
          </div>
        </div>

        {/* Manual UTR Submission Fallback */}
        <div className="pt-2 border-t border-white/10">
          {!showUtrModal ? (
            <button 
              onClick={() => setShowUtrModal(true)}
              className="w-full text-center text-xs text-indigo-400 hover:text-indigo-300 font-medium py-1.5"
            >
              Paid already? Enter 12-digit UTR number →
            </button>
          ) : (
            <div className="space-y-2 bg-slate-800/60 p-3 rounded-xl border border-white/10 mt-2">
              <label className="text-[11px] text-slate-300 font-medium block">Enter 12-Digit UPI Ref / UTR:</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  maxLength={12}
                  placeholder="e.g. 419827391823"
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
                <button 
                  onClick={() => onVerifyUtr(utrInput)}
                  disabled={isVerifying || utrInput.length !== 12}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 transition"
                >
                  {isVerifying ? 'Verifying...' : 'Submit'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Security Badges */}
        <div className="mt-4 pt-3 flex items-center justify-center gap-2 text-[10px] text-slate-400 border-t border-white/5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>256-Bit Encrypted Direct Bank Settlement</span>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// TEMPLATE 2: Minimalist Clean White (Crisp, High Contrast)
// -------------------------------------------------------------
export const Template2_CleanWhite: React.FC<TemplateProps> = ({ data, timeRemaining, isVerifying, onVerifyUtr }) => {
  const [utrInput, setUtrInput] = useState('');
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 text-slate-900">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-sm">
              {data.branding.brand_name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">{data.branding.brand_name}</h3>
              <p className="text-[10px] text-slate-500 font-mono">#{data.order_id}</p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold bg-slate-100 px-2.5 py-1 rounded-md text-slate-700">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>

        <div className="my-6 text-center">
          <span className="text-xs text-slate-500 font-medium">Total Payable</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-0.5">₹{data.amount.toFixed(2)}</div>
        </div>

        {data.payment_details.qr_code_base64 && (
          <div className="flex flex-col items-center my-4">
            <img src={data.payment_details.qr_code_base64} alt="QR Code" className="h-44 w-44 rounded-xl border border-slate-200 p-1" />
            <span className="text-[11px] text-slate-500 mt-2 font-medium">Scan to pay directly to merchant UPI</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 my-4">
          <a href={data.payment_details.intents.gpay} className="rounded-lg bg-slate-900 text-white text-center py-2.5 text-xs font-semibold hover:bg-slate-800 transition">
            Google Pay
          </a>
          <a href={data.payment_details.intents.phonepe} className="rounded-lg bg-purple-600 text-white text-center py-2.5 text-xs font-semibold hover:bg-purple-700 transition">
            PhonePe
          </a>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex gap-2">
            <input 
              type="text" 
              maxLength={12}
              placeholder="Enter 12-digit UTR if paid" 
              value={utrInput}
              onChange={(e) => setUtrInput(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-mono"
            />
            <button 
              onClick={() => onVerifyUtr(utrInput)}
              className="bg-slate-900 text-white text-xs px-4 py-2 rounded-lg font-semibold"
            >
              Verify
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// TEMPLATE 4: Trust-Badge Corporate (Enterprise Grade Badges)
// -------------------------------------------------------------
export const Template4_TrustCorporate: React.FC<TemplateProps> = ({ data, timeRemaining, isVerifying, onVerifyUtr }) => {
  const [utrInput, setUtrInput] = useState('');
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Verified Merchant</span>
              <h3 className="font-bold text-sm text-slate-100">{data.branding.brand_name}</h3>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>

        <div className="my-5 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-400">Invoice Amount</span>
            <div className="text-2xl font-bold text-white">₹{data.amount.toFixed(2)}</div>
          </div>
          <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-full">
            SSL 256-BIT
          </span>
        </div>

        {data.payment_details.qr_code_base64 && (
          <div className="flex justify-center my-4">
            <div className="bg-white p-2.5 rounded-xl">
              <img src={data.payment_details.qr_code_base64} alt="QR" className="h-40 w-40" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-4">
          <a href={data.payment_details.intents.gpay} className="bg-slate-800 hover:bg-slate-700 py-2 text-center text-xs font-semibold rounded-lg text-slate-200 border border-slate-700">
            GPay
          </a>
          <a href={data.payment_details.intents.phonepe} className="bg-slate-800 hover:bg-slate-700 py-2 text-center text-xs font-semibold rounded-lg text-slate-200 border border-slate-700">
            PhonePe
          </a>
          <a href={data.payment_details.intents.paytm} className="bg-slate-800 hover:bg-slate-700 py-2 text-center text-xs font-semibold rounded-lg text-slate-200 border border-slate-700">
            Paytm
          </a>
        </div>

        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Confirm with UTR" 
            value={utrInput}
            onChange={(e) => setUtrInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
          />
          <button 
            onClick={() => onVerifyUtr(utrInput)}
            className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-semibold rounded-lg text-white"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// MASTER TEMPLATE RENDERER (Routes to 1 of 10 designs)
// -------------------------------------------------------------
export const TemplateRenderer: React.FC<TemplateProps> = (props) => {
  const templateId = props.data.template || 'template_1';

  switch (templateId) {
    case 'template_2':
      return <Template2_CleanWhite {...props} />;
    case 'template_4':
      return <Template4_TrustCorporate {...props} />;
    case 'template_1':
    default:
      return <Template1_DarkGlass {...props} />;
  }
};
