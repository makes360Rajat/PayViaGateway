import React from 'react';
import { 
  Lock, 
  ShieldAlert, 
  Sparkles, 
  ArrowRight, 
  Zap, 
  CheckCircle2, 
  Smartphone, 
  QrCode, 
  KeyRound, 
  Layers 
} from 'lucide-react';

interface SubscriptionLockNoticeProps {
  onNavigate: (page: string) => void;
  title?: string;
  subtitle?: string;
}

export const SubscriptionLockNotice: React.FC<SubscriptionLockNoticeProps> = ({ 
  onNavigate, 
  title = "Gateway Workspace Locked — Choose a Plan to Activate",
  subtitle = "An active subscription plan is required to enable direct UPI settlement routing, connect merchant accounts, and generate payment links."
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-[#0e2a20]/90 via-[#061410]/95 to-[#040f0c] p-6 sm:p-10 shadow-2xl backdrop-blur-2xl">
      {/* Background glow halos */}
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
        
        {/* Animated Lock Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-mono font-bold text-amber-300 shadow-glow-amber animate-pulse">
          <Lock className="h-4 w-4 text-amber-400" />
          <span>SUBSCRIPTION INACTIVE / SETUP MODE</span>
        </div>

        {/* Headline */}
        <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
          {title}
        </h2>

        <p className="text-xs sm:text-sm text-emerald-200/80 max-w-xl mx-auto leading-relaxed">
          {subtitle}
        </p>

        {/* Feature Lock Comparison Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-4">
          <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-slate-900/60 p-4">
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-400 border border-amber-500/20 shrink-0">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Dynamic UPI & Payment Links</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Automated UTR capture & zero-commission direct bank credits.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-slate-900/60 p-4">
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Android SMS Gateway Pairing</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Instant settlement listener across GPay, PhonePe, Paytm & Bank SMS.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-slate-900/60 p-4">
            <div className="rounded-xl bg-purple-500/10 p-2 text-purple-400 border border-purple-500/20 shrink-0">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Live API Keys & Webhooks</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Automate store checkouts with sub-second signed callback triggers.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-slate-900/60 p-4">
            <div className="rounded-xl bg-teal-500/10 p-2 text-teal-400 border border-teal-500/20 shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">10 Hosted Checkout Designs</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">High-converting mobile & desktop payment experience templates.</p>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('plans')}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 px-8 py-3.5 text-xs font-extrabold text-black shadow-glow hover:brightness-110 active:scale-95 transition w-full sm:w-auto"
          >
            <Zap className="h-4 w-4" />
            <span>Choose Plan & Activate Gateway →</span>
          </button>

          <button
            onClick={() => onNavigate('docs')}
            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-[#0b1f18] px-6 py-3.5 text-xs font-semibold text-emerald-200 hover:bg-[#11382b] transition w-full sm:w-auto"
          >
            <span>Explore Developer API Docs</span>
          </button>
        </div>

      </div>
    </div>
  );
};
