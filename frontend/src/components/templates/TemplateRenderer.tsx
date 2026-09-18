import React, { useState } from 'react';
import { CheckoutData } from '../../types';
import { 
  ShieldCheck, 
  Copy, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Zap, 
  ArrowRight, 
  Lock,
  Smartphone,
  Check,
  AlertCircle,
  QrCode
} from 'lucide-react';

export interface TemplateProps {
  data: CheckoutData;
  timeRemaining: number;
  isVerifying: boolean;
  onVerifyUtr: (utr: string) => void;
}

// Common helper for timer pill
const TimerPill: React.FC<{ minutes: number; seconds: number; tone?: 'amber' | 'dark' | 'brand' | 'cyan' | 'green' }> = ({ 
  minutes, 
  seconds, 
  tone = 'amber' 
}) => {
  const clock = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  let colorCls = 'bg-amber-50 text-amber-700 border border-amber-200';
  if (tone === 'dark') colorCls = 'bg-white/10 text-white border border-white/20';
  if (tone === 'brand') colorCls = 'bg-purple-500/10 text-purple-400 border border-purple-500/30';
  if (tone === 'cyan') colorCls = 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30';
  if (tone === 'green') colorCls = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono font-bold ${colorCls}`}>
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      <span>Waiting for payment · {clock}</span>
    </div>
  );
};

// Common helper for manual UTR verify form
const UtrVerifySection: React.FC<{
  onVerify: (utr: string) => void;
  isVerifying: boolean;
  dark?: boolean;
}> = ({ onVerify, isVerifying, dark = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [utr, setUtr] = useState('');

  if (!isOpen) {
    return (
      <div className="pt-2 text-center">
        <button
          onClick={() => setIsOpen(true)}
          className={`text-xs font-medium hover:underline transition ${dark ? 'text-purple-400' : 'text-indigo-600'}`}
        >
          Paid already? Enter 12-digit UTR / Ref number →
        </button>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-xl border mt-2 space-y-2 ${dark ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
      <label className={`text-[11px] font-semibold block ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
        Enter 12-Digit Bank Ref / UTR Number:
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          maxLength={12}
          placeholder="e.g. 419827391823"
          value={utr}
          onChange={(e) => setUtr(e.target.value)}
          className={`w-full rounded-lg px-3 py-1.5 text-xs font-mono border focus:outline-none ${
            dark 
              ? 'bg-slate-900 border-white/10 text-white focus:border-purple-500' 
              : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600'
          }`}
        />
        <button
          onClick={() => onVerify(utr)}
          disabled={isVerifying || utr.length !== 12}
          className="rounded-lg bg-gradient-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-glow disabled:opacity-50 transition"
        >
          {isVerifying ? 'Verifying...' : 'Submit'}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// TEMPLATE 1: Classic Card (Familiar checkout card. Safe, high-trust default.)
// ============================================================================
export const Template1_ClassicCard: React.FC<TemplateProps> = ({ data, timeRemaining, isVerifying, onVerifyUtr }) => {
  const [copied, setCopied] = useState(false);
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const brandColor = data.branding.brand_color || '#8b5cf6';

  const copyUpi = () => {
    navigator.clipboard.writeText(data.payment_details.upi_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0b0b12] flex items-center justify-center p-4 sm:p-6 text-slate-900 dark:text-white">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#13131f] shadow-2xl backdrop-blur-2xl">
        
        {/* Merchant Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div 
              className="flex h-11 w-11 items-center justify-center rounded-2xl font-bold text-white shadow-md text-base"
              style={{ background: brandColor }}
            >
              {data.branding.brand_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight text-slate-900 dark:text-white">{data.branding.brand_name}</h3>
              <p className="text-[11px] text-slate-400">Order #{data.order_id}</p>
            </div>
          </div>
          <TimerPill minutes={minutes} seconds={seconds} tone="brand" />
        </div>

        {/* Amount */}
        <div className="my-5 text-center px-6">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Amount to Pay</span>
          <div className="text-4xl font-extrabold font-display text-slate-900 dark:text-white mt-1">
            ₹{data.amount.toFixed(2)}
          </div>
          {data.remark1 && (
            <p className="mt-1 text-xs text-slate-500 font-medium">Ref: {data.remark1}</p>
          )}
        </div>

        {/* QR Code */}
        {data.payment_details.qr_code_base64 && (
          <div className="flex flex-col items-center justify-center px-6 my-4">
            <div className="rounded-2xl bg-white p-3 shadow-xl border-2 border-slate-100 dark:border-white/10">
              <img src={data.payment_details.qr_code_base64} alt="Scan UPI QR" className="h-44 w-44 rounded-lg object-contain" />
            </div>
            <span className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              Scan with any UPI app (GPay, PhonePe, Paytm, CRED)
            </span>
          </div>
        )}

        {/* UPI ID Copy Pill */}
        <div className="mx-6 mb-4 flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 px-4 py-2.5 text-xs font-mono">
          <span className="truncate max-w-[220px] text-slate-700 dark:text-slate-300">{data.payment_details.upi_id}</span>
          <button 
            onClick={copyUpi} 
            className="flex items-center gap-1 font-bold text-purple-600 dark:text-purple-400 hover:opacity-80 active:scale-95 transition"
          >
            {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {/* Quick App Launchers */}
        <div className="px-6 space-y-2 mb-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Pay using UPI App</span>
          <div className="grid grid-cols-3 gap-2">
            <a 
              href={data.payment_details.intents.gpay}
              className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 hover:border-purple-500/40 hover:bg-purple-600/10 transition active:scale-95"
            >
              <span className="font-bold text-xs">Google Pay</span>
            </a>
            <a 
              href={data.payment_details.intents.phonepe}
              className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 hover:border-purple-500/40 hover:bg-purple-600/10 transition active:scale-95"
            >
              <span className="font-bold text-xs text-purple-500">PhonePe</span>
            </a>
            <a 
              href={data.payment_details.intents.paytm}
              className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 hover:border-sky-500/40 hover:bg-sky-600/10 transition active:scale-95"
            >
              <span className="font-bold text-xs text-sky-500">Paytm</span>
            </a>
          </div>
        </div>

        {/* Manual UTR Section */}
        <div className="px-6 pb-4">
          <UtrVerifySection onVerify={onVerifyUtr} isVerifying={isVerifying} dark={true} />
        </div>

        {/* Security Footer */}
        <div className="border-t border-slate-100 dark:border-white/10 px-6 py-3 bg-slate-50/50 dark:bg-black/20 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>🔒 Secured UPI payment · Do not close this page until confirmed</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TEMPLATE 2: Minimal Mono (Typography-led, no chrome, fastest to read.)
// ============================================================================
export const Template2_MinimalMono: React.FC<TemplateProps> = ({ data, timeRemaining, isVerifying, onVerifyUtr }) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b0b12] flex items-center justify-center p-4 font-mono text-slate-900 dark:text-slate-100">
      <div className="w-full max-w-md border-2 border-slate-900 dark:border-white/20 p-6 rounded-2xl shadow-xl bg-white dark:bg-[#13131f]">
        
        <div className="flex justify-between items-baseline border-b border-slate-900 dark:border-white/20 pb-3">
          <div>
            <div className="text-[10px] uppercase text-slate-400">PAYMENT TO</div>
            <div className="font-bold text-base">{data.branding.brand_name}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase text-slate-400">TIME LEFT</div>
            <div className="font-bold text-sm text-purple-500">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
          </div>
        </div>

        <div className="my-6 text-center">
          <div className="text-[11px] text-slate-400 uppercase">TOTAL PAYABLE</div>
          <div className="text-4xl font-black mt-1">₹{data.amount.toFixed(2)}</div>
        </div>

        {data.payment_details.qr_code_base64 && (
          <div className="flex flex-col items-center my-4">
            <div className="p-2 border-2 border-slate-900 dark:border-white/30 rounded-xl bg-white">
              <img src={data.payment_details.qr_code_base64} alt="QR" className="h-44 w-44" />
            </div>
            <span className="text-[11px] text-slate-500 mt-2 font-mono">SCAN VIA ANY UPI APP</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 my-4">
          <a href={data.payment_details.intents.gpay} className="border border-slate-900 dark:border-white/20 py-2.5 text-center text-xs font-bold hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition">
            [GOOGLE PAY]
          </a>
          <a href={data.payment_details.intents.phonepe} className="border border-slate-900 dark:border-white/20 py-2.5 text-center text-xs font-bold hover:bg-purple-600 hover:text-white transition">
            [PHONEPE]
          </a>
        </div>

        <UtrVerifySection onVerify={onVerifyUtr} isVerifying={isVerifying} dark={true} />

        <div className="mt-4 pt-3 border-t border-slate-900/20 dark:border-white/10 text-center text-[10px] text-slate-400">
          ORDER ID: {data.order_id} // 256-BIT ENCRYPTED
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TEMPLATE 3: Gradient Glass (Frosted card on a brand gradient.)
// ============================================================================
export const Template3_GradientGlass: React.FC<TemplateProps> = ({ data, timeRemaining, isVerifying, onVerifyUtr }) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const brandColor = data.branding.brand_color || '#6366f1';

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 text-white relative overflow-hidden"
      style={{
        background: `radial-gradient(100% 100% at 50% 0%, ${brandColor} 0%, #0b0b12 70%)`
      }}
    >
      <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white/10 backdrop-blur-3xl p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] relative">
        
        <div className="flex items-center justify-between pb-4 border-b border-white/15">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-bold text-lg ring-1 ring-white/30">
              {data.branding.brand_name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-sm leading-none">{data.branding.brand_name}</h3>
              <span className="text-[10px] text-white/70 font-mono">#{data.order_id}</span>
            </div>
          </div>
          <TimerPill minutes={minutes} seconds={seconds} tone="dark" />
        </div>

        <div className="my-5 text-center bg-white/5 rounded-2xl p-4 border border-white/10">
          <span className="text-xs text-white/70 font-medium uppercase tracking-wider">Amount Due</span>
          <div className="text-4xl font-extrabold font-display mt-1">₹{data.amount.toFixed(2)}</div>
        </div>

        {data.payment_details.qr_code_base64 && (
          <div className="flex flex-col items-center my-4">
            <div className="p-3 bg-white rounded-2xl shadow-2xl">
              <img src={data.payment_details.qr_code_base64} alt="QR" className="h-44 w-44 rounded-lg" />
            </div>
            <span className="mt-2 text-xs text-white/80 font-medium">Scan to complete transaction</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 my-4">
          <a href={data.payment_details.intents.gpay} className="bg-white/15 hover:bg-white/25 border border-white/20 py-2.5 rounded-xl text-center text-xs font-bold transition">
            GPay
          </a>
          <a href={data.payment_details.intents.phonepe} className="bg-purple-600/80 hover:bg-purple-600 border border-white/20 py-2.5 rounded-xl text-center text-xs font-bold transition">
            PhonePe
          </a>
          <a href={data.payment_details.intents.paytm} className="bg-sky-600/80 hover:bg-sky-600 border border-white/20 py-2.5 rounded-xl text-center text-xs font-bold transition">
            Paytm
          </a>
        </div>

        <UtrVerifySection onVerify={onVerifyUtr} isVerifying={isVerifying} dark={true} />

        <div className="mt-4 pt-3 border-t border-white/10 text-center text-[10px] text-white/60">
          🔒 Secured direct-to-merchant UPI gateway
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TEMPLATE 4: Dark Neon (High-contrast dark surface with a glowing ring.)
// ============================================================================
export const Template4_DarkNeon: React.FC<TemplateProps> = ({ data, timeRemaining, isVerifying, onVerifyUtr }) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="min-h-screen bg-[#080b14] flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-cyan-500/30 bg-[#0c101d] p-6 shadow-[0_0_50px_rgba(34,211,238,0.15)] relative overflow-hidden">
        
        {/* Neon accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 shadow-[0_0_15px_#22d3ee]" />

        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center font-bold text-cyan-300">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">{data.branding.brand_name}</h3>
              <p className="text-[10px] text-cyan-400 font-mono">ORDER: {data.order_id}</p>
            </div>
          </div>
          <TimerPill minutes={minutes} seconds={seconds} tone="cyan" />
        </div>

        <div className="my-5 text-center bg-[#080b14] p-4 rounded-2xl border border-cyan-500/20">
          <span className="text-[11px] uppercase tracking-widest text-cyan-400 font-mono">PAYABLE TOTAL</span>
          <div className="text-4xl font-extrabold text-white mt-1">₹{data.amount.toFixed(2)}</div>
        </div>

        {data.payment_details.qr_code_base64 && (
          <div className="flex flex-col items-center my-4">
            <div className="p-3 bg-white rounded-2xl ring-4 ring-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
              <img src={data.payment_details.qr_code_base64} alt="QR" className="h-44 w-44 rounded-lg" />
            </div>
            <span className="mt-3 text-xs text-cyan-300/80 font-mono">SCAN TO PAY DIRECTLY</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 my-4">
          <a href={data.payment_details.intents.gpay} className="bg-slate-900 border border-cyan-500/30 hover:border-cyan-400 py-2.5 rounded-xl text-center text-xs font-bold transition">
            GPay
          </a>
          <a href={data.payment_details.intents.phonepe} className="bg-slate-900 border border-purple-500/30 hover:border-purple-400 py-2.5 rounded-xl text-center text-xs font-bold text-purple-300 transition">
            PhonePe
          </a>
          <a href={data.payment_details.intents.paytm} className="bg-slate-900 border border-sky-500/30 hover:border-sky-400 py-2.5 rounded-xl text-center text-xs font-bold text-sky-300 transition">
            Paytm
          </a>
        </div>

        <UtrVerifySection onVerify={onVerifyUtr} isVerifying={isVerifying} dark={true} />

        <div className="mt-4 pt-3 border-t border-white/10 text-center text-[10px] text-slate-500 font-mono">
          CYBERNETIC SSL 256-BIT ENCRYPTION
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TEMPLATE 5: Receipt (Perforated ticket styling with a torn edge.)
// ============================================================================
export const Template5_Receipt: React.FC<TemplateProps> = ({ data, timeRemaining, isVerifying, onVerifyUtr }) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="min-h-screen bg-[#f4f1ea] dark:bg-[#10101a] flex items-center justify-center p-4 text-slate-800">
      <div className="w-full max-w-md bg-[#fffdf9] rounded-2xl shadow-xl border border-amber-900/10 p-6 relative">
        
        {/* Perforated Top Header */}
        <div className="text-center border-b-2 border-dashed border-amber-900/20 pb-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
            Official Invoice Receipt
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-2">{data.branding.brand_name}</h2>
          <p className="text-xs font-mono text-slate-500">Order Ref: {data.order_id}</p>
        </div>

        <div className="my-5 text-center">
          <span className="text-xs text-slate-500 uppercase font-mono">Total Due</span>
          <div className="text-4xl font-extrabold text-slate-900 mt-0.5">₹{data.amount.toFixed(2)}</div>
          <div className="mt-2">
            <TimerPill minutes={minutes} seconds={seconds} tone="amber" />
          </div>
        </div>

        {data.payment_details.qr_code_base64 && (
          <div className="flex flex-col items-center my-4">
            <div className="p-2.5 bg-white rounded-xl border border-amber-900/10 shadow-sm">
              <img src={data.payment_details.qr_code_base64} alt="QR" className="h-44 w-44" />
            </div>
            <span className="text-[11px] text-slate-500 mt-2 font-mono">Scan barcode to settle invoice</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 my-4">
          <a href={data.payment_details.intents.gpay} className="rounded-xl bg-slate-900 text-white text-center py-2.5 text-xs font-bold hover:bg-slate-800 transition">
            Google Pay
          </a>
          <a href={data.payment_details.intents.phonepe} className="rounded-xl bg-purple-600 text-white text-center py-2.5 text-xs font-bold hover:bg-purple-700 transition">
            PhonePe
          </a>
        </div>

        <UtrVerifySection onVerify={onVerifyUtr} isVerifying={isVerifying} dark={false} />

        <div className="mt-5 pt-3 border-t-2 border-dashed border-amber-900/20 text-center text-[10px] font-mono text-slate-400">
          THANK YOU FOR YOUR BUSINESS · VERIFIED SETTLEMENT
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TEMPLATE 6: Bold Split (Big brand banner with an overlapping QR card.)
// ============================================================================
export const Template6_BoldSplit: React.FC<TemplateProps> = ({ data, timeRemaining, isVerifying, onVerifyUtr }) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const brandColor = data.branding.brand_color || '#2563eb';

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0b0b12] flex items-center justify-center p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-[#13131f] shadow-2xl border border-slate-200 dark:border-white/10">
        
        {/* Top Split Banner */}
        <div 
          className="p-6 text-white text-center relative"
          style={{ background: brandColor }}
        >
          <div className="text-xs font-medium opacity-80 uppercase tracking-wider">Payment Request</div>
          <h2 className="text-xl font-bold mt-1">{data.branding.brand_name}</h2>
          <div className="text-4xl font-extrabold mt-3">₹{data.amount.toFixed(2)}</div>
          <div className="mt-2 flex justify-center">
            <TimerPill minutes={minutes} seconds={seconds} tone="dark" />
          </div>
        </div>

        {/* Floating Body */}
        <div className="p-6 text-center text-slate-900 dark:text-white">
          {data.payment_details.qr_code_base64 && (
            <div className="flex flex-col items-center my-2">
              <div className="p-3 bg-white rounded-2xl shadow-xl border border-slate-100">
                <img src={data.payment_details.qr_code_base64} alt="QR" className="h-44 w-44" />
              </div>
              <span className="mt-2 text-xs text-slate-500 dark:text-slate-400">Scan QR or choose an app</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 my-4">
            <a href={data.payment_details.intents.gpay} className="py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 font-bold text-xs hover:bg-slate-100 transition">
              GPay
            </a>
            <a href={data.payment_details.intents.phonepe} className="py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 font-bold text-xs text-purple-500 hover:bg-purple-500/10 transition">
              PhonePe
            </a>
            <a href={data.payment_details.intents.paytm} className="py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 font-bold text-xs text-sky-500 hover:bg-sky-500/10 transition">
              Paytm
            </a>
          </div>

          <UtrVerifySection onVerify={onVerifyUtr} isVerifying={isVerifying} dark={true} />

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 text-[11px] text-slate-400">
            Order ID: {data.order_id}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TEMPLATE 7: Soft Pastel (Rounded friendly surfaces, low contrast.)
// ============================================================================
export const Template7_SoftPastel: React.FC<TemplateProps> = ({ data, timeRemaining, isVerifying, onVerifyUtr }) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="min-h-screen bg-[#e0f2fe] dark:bg-[#0c192c] flex items-center justify-center p-4 text-slate-800 dark:text-slate-100">
      <div className="w-full max-w-md rounded-3xl bg-white/90 dark:bg-[#112240] p-6 shadow-xl border border-sky-100 dark:border-sky-900 backdrop-blur-xl">
        
        <div className="flex items-center justify-between pb-3 border-b border-sky-100 dark:border-sky-900/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-sky-100 dark:bg-sky-900 text-sky-600 dark:text-sky-300 font-bold flex items-center justify-center text-sm">
              {data.branding.brand_name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-sm leading-none">{data.branding.brand_name}</h3>
              <p className="text-[10px] text-slate-400">UPI Payment</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 px-3 py-1 rounded-full">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>

        <div className="my-5 text-center bg-sky-50/50 dark:bg-sky-950/40 p-4 rounded-2xl">
          <span className="text-xs text-sky-700 dark:text-sky-400 font-semibold uppercase">Total Amount</span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">₹{data.amount.toFixed(2)}</div>
        </div>

        {data.payment_details.qr_code_base64 && (
          <div className="flex flex-col items-center my-4">
            <div className="p-3 bg-white rounded-2xl shadow-md border border-sky-100">
              <img src={data.payment_details.qr_code_base64} alt="QR" className="h-44 w-44" />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-2">Scan with Google Pay, PhonePe or Paytm</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 my-4">
          <a href={data.payment_details.intents.gpay} className="py-2.5 rounded-xl bg-sky-50 dark:bg-sky-900/40 text-sky-900 dark:text-sky-200 font-bold text-xs text-center hover:bg-sky-100 transition">
            GPay
          </a>
          <a href={data.payment_details.intents.phonepe} className="py-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200 font-bold text-xs text-center hover:bg-purple-100 transition">
            PhonePe
          </a>
          <a href={data.payment_details.intents.paytm} className="py-2.5 rounded-xl bg-sky-50 dark:bg-sky-900/40 text-sky-900 dark:text-sky-200 font-bold text-xs text-center hover:bg-sky-100 transition">
            Paytm
          </a>
        </div>

        <UtrVerifySection onVerify={onVerifyUtr} isVerifying={isVerifying} dark={true} />

        <div className="mt-4 pt-3 border-t border-sky-100 dark:border-sky-900/50 text-center text-[10px] text-slate-400">
          Order #{data.order_id} · Direct bank settlement
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TEMPLATE 8: Compact Sheet (Bottom-sheet layout, thumb-reachable actions.)
// ============================================================================
export const Template8_CompactSheet: React.FC<TemplateProps> = ({ data, timeRemaining, isVerifying, onVerifyUtr }) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="min-h-screen bg-slate-900 flex items-end sm:items-center justify-center p-0 sm:p-4 text-white">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#0f172a] border-t sm:border border-white/10 p-6 shadow-2xl">
        
        {/* Drag Handle on Mobile */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="font-bold text-base">{data.branding.brand_name}</h3>
            <p className="text-xs text-slate-400">₹{data.amount.toFixed(2)}</p>
          </div>
          <TimerPill minutes={minutes} seconds={seconds} tone="dark" />
        </div>

        {data.payment_details.qr_code_base64 && (
          <div className="flex justify-center my-4">
            <div className="p-3 bg-white rounded-2xl shadow-xl">
              <img src={data.payment_details.qr_code_base64} alt="QR" className="h-44 w-44" />
            </div>
          </div>
        )}

        {/* Big Touch-Friendly Buttons */}
        <div className="space-y-2.5 my-4">
          <a 
            href={data.payment_details.intents.gpay}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-primary font-bold text-sm text-white shadow-glow active:scale-95 transition"
          >
            <span>Pay with Google Pay</span>
            <ArrowRight className="h-4 w-4" />
          </a>
          <div className="grid grid-cols-2 gap-2">
            <a href={data.payment_details.intents.phonepe} className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-center font-bold text-xs text-purple-400 transition">
              PhonePe
            </a>
            <a href={data.payment_details.intents.paytm} className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-center font-bold text-xs text-sky-400 transition">
              Paytm UPI
            </a>
          </div>
        </div>

        <UtrVerifySection onVerify={onVerifyUtr} isVerifying={isVerifying} dark={true} />

        <div className="mt-4 pt-3 border-t border-white/10 text-center text-[10px] text-slate-400">
          Ref: {data.order_id} · Instant direct confirmation
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TEMPLATE 9: Guided Steps (Three-step walkthrough for first-time payers.)
// ============================================================================
export const Template9_GuidedSteps: React.FC<TemplateProps> = ({ data, timeRemaining, isVerifying, onVerifyUtr }) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0b12] flex items-center justify-center p-4 text-slate-900 dark:text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#13131f] p-6 shadow-xl">
        
        <div className="flex items-baseline justify-between border-b border-slate-100 dark:border-white/10 pb-4">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-slate-400">Paying</div>
            <div className="truncate text-sm font-semibold">{data.branding.brand_name}</div>
          </div>
          <div className="text-2xl font-bold text-emerald-500">₹{data.amount.toFixed(2)}</div>
        </div>

        {/* 3 Steps */}
        <ol className="my-5 space-y-3">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white bg-emerald-600">
              1
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-300">Open any UPI app on your phone (GPay, PhonePe, Paytm).</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white bg-emerald-600">
              2
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-300">Scan the QR code below or tap a quick launch button.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white bg-emerald-600">
              3
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-300">Enter your UPI PIN to confirm ₹{data.amount.toFixed(2)}.</span>
          </li>
        </ol>

        {data.payment_details.qr_code_base64 && (
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-4 text-center border border-slate-100 dark:border-white/5 my-4">
            <div className="mx-auto w-fit rounded-xl bg-white p-3 shadow-md">
              <img src={data.payment_details.qr_code_base64} alt="QR" className="h-44 w-44" />
            </div>
            <div className="mt-3">
              <TimerPill minutes={minutes} seconds={seconds} tone="green" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 my-4">
          <a href={data.payment_details.intents.gpay} className="py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-center font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            GPay
          </a>
          <a href={data.payment_details.intents.phonepe} className="py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-center font-bold text-xs text-purple-500 hover:bg-purple-500/10 transition">
            PhonePe
          </a>
          <a href={data.payment_details.intents.paytm} className="py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-center font-bold text-xs text-sky-500 hover:bg-sky-500/10 transition">
            Paytm
          </a>
        </div>

        <UtrVerifySection onVerify={onVerifyUtr} isVerifying={isVerifying} dark={true} />

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 text-center text-[10px] text-slate-400">
          Order ID: {data.order_id} · Direct bank settlement
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TEMPLATE 10: Brand Hero (Full-bleed hero with a QR medallion.)
// ============================================================================
export const Template10_BrandHero: React.FC<TemplateProps> = ({ data, timeRemaining, isVerifying, onVerifyUtr }) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const brandColor = data.branding.brand_color || '#a855f7';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] bg-white text-slate-900 shadow-2xl">
        
        {/* Full-bleed radial hero banner */}
        <div 
          className="relative px-6 py-8 text-center text-white"
          style={{
            backgroundImage: `radial-gradient(120% 90% at 50% 0%, ${brandColor} 0%, #111827 100%)`
          }}
        >
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white/20 ring-2 ring-white/30 flex items-center justify-center font-bold text-xl backdrop-blur">
            {data.branding.brand_name.charAt(0)}
          </div>
          <h1 className="mt-3 truncate text-lg font-bold">{data.branding.brand_name}</h1>
          <p className="text-[11px] opacity-75">Secure UPI Payment · Direct Bank</p>
          <div className="mt-4 text-5xl font-black tracking-tight">₹{data.amount.toFixed(2)}</div>
          <div className="mt-3 flex justify-center">
            <TimerPill minutes={minutes} seconds={seconds} tone="dark" />
          </div>
        </div>

        {/* QR Medallion and controls */}
        <div className="px-6 py-6 text-center">
          {data.payment_details.qr_code_base64 && (
            <div className="mx-auto w-fit rounded-3xl p-1 shadow-2xl" style={{ background: brandColor }}>
              <div className="rounded-[20px] bg-white p-3">
                <img src={data.payment_details.qr_code_base64} alt="QR" className="h-44 w-44" />
              </div>
            </div>
          )}
          <p className="mt-3 text-xs text-slate-500 font-medium">Scan with any UPI app</p>

          <div className="grid grid-cols-3 gap-2 my-5">
            <a href={data.payment_details.intents.gpay} className="py-2.5 rounded-xl border border-slate-200 font-bold text-xs hover:bg-slate-50 transition">
              GPay
            </a>
            <a href={data.payment_details.intents.phonepe} className="py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-purple-600 hover:bg-purple-50 transition">
              PhonePe
            </a>
            <a href={data.payment_details.intents.paytm} className="py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-sky-600 hover:bg-sky-50 transition">
              Paytm
            </a>
          </div>

          <UtrVerifySection onVerify={onVerifyUtr} isVerifying={isVerifying} dark={false} />

          <div className="mt-5 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
            Order: {data.order_id}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TEMPLATE 11: Modern Glass (A cutting-edge glassmorphism design with animated gradients.)
// ============================================================================
export const Template11_ModernGlass: React.FC<TemplateProps> = ({ data, timeRemaining, isVerifying, onVerifyUtr }) => {
  const [copied, setCopied] = useState(false);
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const copyUpi = () => {
    navigator.clipboard.writeText(data.payment_details.upi_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b0b12] via-[#10101a] to-[#0b0b12] flex items-center justify-center p-4 sm:p-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-purple-500/20 bg-[#13131f]/90 backdrop-blur-2xl p-6 shadow-[0_20px_60px_-20px_rgba(139,92,246,0.45)] relative overflow-hidden">
        
        {/* Glow Header */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent rounded-full shadow-[0_0_20px_#8b5cf6]" />

        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center font-bold text-white shadow-glow">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">{data.branding.brand_name}</h3>
              <p className="text-[10px] text-purple-300 font-mono">Order: {data.order_id}</p>
            </div>
          </div>
          <TimerPill minutes={minutes} seconds={seconds} tone="brand" />
        </div>

        <div className="my-5 text-center bg-[#0b0b12]/70 rounded-2xl p-4 border border-white/5">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Payable</span>
          <div className="text-4xl font-extrabold font-display text-white mt-1">₹{data.amount.toFixed(2)}</div>
        </div>

        {data.payment_details.qr_code_base64 && (
          <div className="flex flex-col items-center my-4">
            <div className="p-3 bg-white rounded-2xl shadow-2xl border-2 border-purple-500/30">
              <img src={data.payment_details.qr_code_base64} alt="QR" className="h-44 w-44 rounded-lg" />
            </div>
            <span className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-purple-400" />
              Instant auto-verification after UPI payment
            </span>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl bg-[#0b0b12]/80 border border-white/10 px-3.5 py-2.5 text-xs font-mono mb-4">
          <span className="text-slate-300 truncate max-w-[220px]">{data.payment_details.upi_id}</span>
          <button onClick={copyUpi} className="text-purple-400 font-bold hover:underline">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        {/* 3 Apps row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <a href={data.payment_details.intents.gpay} className="p-2.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-purple-600/20 text-center font-bold text-xs transition">
            Google Pay
          </a>
          <a href={data.payment_details.intents.phonepe} className="p-2.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-purple-600/20 text-center font-bold text-xs text-purple-400 transition">
            PhonePe
          </a>
          <a href={data.payment_details.intents.paytm} className="p-2.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-sky-600/20 text-center font-bold text-xs text-sky-400 transition">
            Paytm
          </a>
        </div>

        <UtrVerifySection onVerify={onVerifyUtr} isVerifying={isVerifying} dark={true} />

        <div className="mt-4 pt-3 border-t border-white/5 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>🔒 100% Encrypted & Settled Direct to Merchant</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PRODUCTION PAYMENT GATEWAY SHELL
// Deliberately compact: the payer only sees the merchant, amount, QR / UPI
// route, time left and an optional UTR fallback. Variants change the visual
// treatment without changing a familiar, trustworthy payment flow.
// ============================================================================
const GATEWAY_THEMES = [
  { page: 'bg-[#f6f8fc]', card: 'bg-white border-slate-200', text: 'text-slate-900', muted: 'text-slate-500', accent: '#2563eb', soft: 'bg-blue-50 border-blue-100', button: 'bg-[#2563eb] hover:bg-blue-700', label: 'UPI QUICK PAY' },
  { page: 'bg-[#faf7ff]', card: 'bg-white border-violet-100', text: 'text-slate-900', muted: 'text-slate-500', accent: '#6d28d9', soft: 'bg-violet-50 border-violet-100', button: 'bg-violet-700 hover:bg-violet-800', label: 'SECURE UPI PAYMENT' },
  { page: 'bg-[#f4f8ff]', card: 'bg-white border-sky-100', text: 'text-slate-900', muted: 'text-slate-500', accent: '#0284c7', soft: 'bg-sky-50 border-sky-100', button: 'bg-sky-600 hover:bg-sky-700', label: 'PAYMENT REQUEST' },
  { page: 'bg-[#0f172a]', card: 'bg-[#172033] border-slate-700', text: 'text-white', muted: 'text-slate-400', accent: '#22c55e', soft: 'bg-emerald-500/10 border-emerald-500/20', button: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950', label: 'VERIFIED CHECKOUT' },
  { page: 'bg-[#fffbeb]', card: 'bg-[#fffefb] border-amber-200', text: 'text-stone-900', muted: 'text-stone-500', accent: '#d97706', soft: 'bg-amber-50 border-amber-100', button: 'bg-amber-600 hover:bg-amber-700', label: 'PAYMENT DETAILS' },
  { page: 'bg-[#eef4ff]', card: 'bg-white border-indigo-100', text: 'text-slate-900', muted: 'text-slate-500', accent: '#4f46e5', soft: 'bg-indigo-50 border-indigo-100', button: 'bg-indigo-600 hover:bg-indigo-700', label: 'MOBILE PAYMENT' },
  { page: 'bg-[#f0fdfa]', card: 'bg-white border-teal-100', text: 'text-slate-900', muted: 'text-slate-500', accent: '#0f766e', soft: 'bg-teal-50 border-teal-100', button: 'bg-teal-700 hover:bg-teal-800', label: 'PAY WITH UPI' },
  { page: 'bg-[#f8fafc]', card: 'bg-white border-slate-200', text: 'text-slate-900', muted: 'text-slate-500', accent: '#334155', soft: 'bg-slate-50 border-slate-200', button: 'bg-slate-900 hover:bg-slate-800', label: 'QUICK SCAN & PAY' },
  { page: 'bg-[#f7fdf8]', card: 'bg-white border-emerald-100', text: 'text-slate-900', muted: 'text-slate-500', accent: '#16a34a', soft: 'bg-emerald-50 border-emerald-100', button: 'bg-emerald-600 hover:bg-emerald-700', label: 'GUIDED UPI PAYMENT' },
  { page: 'bg-[#f8f7ff]', card: 'bg-white border-purple-100', text: 'text-slate-900', muted: 'text-slate-500', accent: '#7c3aed', soft: 'bg-purple-50 border-purple-100', button: 'bg-purple-600 hover:bg-purple-700', label: 'MERCHANT CHECKOUT' },
  { page: 'bg-[#10131f]', card: 'bg-[#181c2c] border-indigo-400/20', text: 'text-white', muted: 'text-slate-400', accent: '#818cf8', soft: 'bg-indigo-400/10 border-indigo-400/20', button: 'bg-indigo-500 hover:bg-indigo-400', label: 'SECURE PAYMENT' }
];

const GatewayPaymentTemplate: React.FC<TemplateProps & { variant: number }> = ({ data, timeRemaining, isVerifying, onVerifyUtr, variant }) => {
  const [copied, setCopied] = useState(false);
  const theme = GATEWAY_THEMES[variant - 1] || GATEWAY_THEMES[0];
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const isDark = theme.page.includes('#0f') || theme.page.includes('#101');
  const copyUpi = async () => {
    await navigator.clipboard.writeText(data.payment_details.upi_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={`min-h-screen ${theme.page} flex items-center justify-center p-4 font-sans`}>
      <main className={`w-full max-w-[390px] overflow-hidden rounded-[28px] border ${theme.card} shadow-[0_24px_70px_-32px_rgba(15,23,42,0.45)]`}>
        <div className={`h-1.5 w-full`} style={{ background: theme.accent }} />
        <div className="p-5 sm:p-6">
          <header className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white shadow-sm" style={{ background: theme.accent }}>
                {data.branding.brand_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className={`text-[9px] font-bold tracking-[0.15em] ${theme.muted}`}>{theme.label}</p>
                <h1 className={`truncate text-sm font-bold ${theme.text}`}>{data.branding.brand_name}</h1>
              </div>
            </div>
            <div className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] font-mono font-bold ${theme.soft}`} style={{ color: theme.accent }}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
          </header>

          <section className={`mt-5 rounded-2xl border px-4 py-4 text-center ${theme.soft}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${theme.muted}`}>Amount to pay</p>
            <p className={`mt-1 font-display text-4xl font-extrabold tracking-tight ${theme.text}`}>₹{data.amount.toFixed(2)}</p>
            <p className={`mt-1 truncate text-[10px] ${theme.muted}`}>Order #{data.order_id}</p>
          </section>

          <section className="mt-5 flex flex-col items-center">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              {data.payment_details.qr_code_base64 ? <img src={data.payment_details.qr_code_base64} alt="UPI payment QR code" className="h-40 w-40 object-contain" /> : <QrCode className="h-40 w-40 p-5 text-slate-300" />}
            </div>
            <p className={`mt-2 text-[11px] ${theme.muted}`}>Scan with any UPI app to pay</p>
          </section>

          <button onClick={copyUpi} className={`mt-4 flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left text-xs transition ${theme.soft}`}>
            <span className={`min-w-0 truncate font-mono ${theme.text}`}>{data.payment_details.upi_id}</span>
            <span className="ml-3 shrink-0 font-bold" style={{ color: theme.accent }}>{copied ? 'Copied' : 'Copy UPI'}</span>
          </button>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <a href={data.payment_details.intents.gpay} className={`rounded-xl border px-2 py-2.5 text-center text-[10px] font-bold ${theme.card} ${theme.text}`}>Google Pay</a>
            <a href={data.payment_details.intents.phonepe} className={`rounded-xl border px-2 py-2.5 text-center text-[10px] font-bold ${theme.card} ${theme.text}`}>PhonePe</a>
            <a href={data.payment_details.intents.paytm} className={`rounded-xl border px-2 py-2.5 text-center text-[10px] font-bold ${theme.card} ${theme.text}`}>Paytm</a>
          </div>

          <div className="mt-4"><UtrVerifySection onVerify={onVerifyUtr} isVerifying={isVerifying} dark={isDark} /></div>
        </div>
        <footer className={`flex items-center justify-center gap-1.5 border-t px-4 py-3 text-[10px] ${theme.muted} ${isDark ? 'border-white/10 bg-black/10' : 'border-slate-100 bg-slate-50/70'}`}>
          <ShieldCheck className="h-3.5 w-3.5" style={{ color: theme.accent }} /> Secure UPI checkout · Do not refresh while payment is processing
        </footer>
      </main>
    </div>
  );
};

// ============================================================================
// MASTER ROUTER: Resolves any of the 11 payment gateway variants
// ============================================================================
export const TemplateRenderer: React.FC<TemplateProps> = (props) => {
  const templateId = props.data.template || 'template_1';

  switch (templateId) {
    case 'template_2':
      return <GatewayPaymentTemplate {...props} variant={2} />;
    case 'template_3':
      return <GatewayPaymentTemplate {...props} variant={3} />;
    case 'template_4':
      return <GatewayPaymentTemplate {...props} variant={4} />;
    case 'template_5':
      return <GatewayPaymentTemplate {...props} variant={5} />;
    case 'template_6':
      return <GatewayPaymentTemplate {...props} variant={6} />;
    case 'template_7':
      return <GatewayPaymentTemplate {...props} variant={7} />;
    case 'template_8':
      return <GatewayPaymentTemplate {...props} variant={8} />;
    case 'template_9':
      return <GatewayPaymentTemplate {...props} variant={9} />;
    case 'template_10':
      return <GatewayPaymentTemplate {...props} variant={10} />;
    case 'template_11':
      return <GatewayPaymentTemplate {...props} variant={11} />;
    case 'template_1':
    default:
      return <GatewayPaymentTemplate {...props} variant={1} />;
  }
};
