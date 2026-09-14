import React from 'react';
import { 
  ShieldCheck, 
  Zap, 
  Wallet, 
  Smartphone, 
  RotateCw, 
  Sparkles, 
  CheckCircle2, 
  Lock, 
  ArrowRight,
  Code2,
  Cpu,
  Layers
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#040f0c] text-emerald-50">
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center overflow-hidden">
        
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] bg-emerald-500/15 blur-[140px] rounded-full pointer-events-none" />

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-300 mb-8 backdrop-blur-md shadow-glow">
          <Sparkles className="h-4 w-4 text-amber-400 animate-spin" />
          <span>Next-Gen Direct UPI & Cyber Settlement Infrastructure</span>
        </div>

        <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-[1.1]">
          The Zero-Commission <br />
          <span className="text-gradient">Direct-to-Merchant</span> Payment Gateway
        </h1>

        <p className="mt-6 text-base sm:text-xl text-emerald-200/80 max-w-3xl mx-auto leading-relaxed">
          Connect your existing Paytm Business, BharatPe, FamPay, Freecharge, and Custom UPI bank accounts. Money moves directly to your accounts with automated payment detection, dynamic QR codes, UPI app intents, and signed webhooks.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => onNavigate('auth')}
            className="flex items-center gap-2 rounded-xl bg-gradient-primary px-8 py-4 text-sm font-bold text-black shadow-glow hover:brightness-110 active:scale-95 transition"
          >
            <span>Start Free Merchant Workspace</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => onNavigate('docs')}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-[#0b1f18] px-6 py-4 text-sm font-semibold text-emerald-200 hover:bg-[#11382b] hover:border-emerald-500/50 transition backdrop-blur shadow-glow-amber"
          >
            <Code2 className="h-4 w-4 text-amber-400" />
            <span>Developer API Reference</span>
          </button>
        </div>

        {/* Feature Badges */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-emerald-500/20">
          <div className="flex flex-col items-center">
            <span className="font-display text-2xl font-bold text-emerald-400">0%</span>
            <span className="text-xs text-emerald-300/70">Holding & Gateway Lockups</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-display text-2xl font-bold text-amber-400">&lt;2s</span>
            <span className="text-xs text-emerald-300/70">Automated UTR Detection</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-display text-2xl font-bold text-lime-400">10 Designs</span>
            <span className="text-xs text-emerald-300/70">Conversion Checkout Templates</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-display text-2xl font-bold text-teal-300">Multi-User</span>
            <span className="text-xs text-emerald-300/70">Super Admin & Sub-Accounts</span>
          </div>
        </div>
      </section>

      {/* Supported Connectors */}
      <section className="py-16 px-4 max-w-7xl mx-auto border-t border-emerald-500/15">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400 font-mono">CONNECTIONS & ADAPTERS</span>
          <h2 className="font-display text-2xl sm:text-4xl font-bold mt-2 text-white">Connect Any Merchant Account You Own</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl glass-card-hover">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold mb-4">
              Paytm
            </div>
            <h3 className="font-bold text-lg text-white">Paytm Business Direct</h3>
            <p className="mt-2 text-xs text-emerald-200/70 leading-relaxed">
              Connect your Paytm Business MID & merchant key. Automatic transaction matching directly via official status query APIs.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl glass-card-hover">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold mb-4">
              BP
            </div>
            <h3 className="font-bold text-lg text-white">BharatPe Merchant</h3>
            <p className="mt-2 text-xs text-emerald-200/70 leading-relaxed">
              Session sync via OTP. Real-time QR settlement listener for merchant accounts with instant 12-digit UTR capture.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl glass-card-hover">
            <div className="h-10 w-10 rounded-xl bg-lime-500/15 text-lime-300 border border-lime-500/30 flex items-center justify-center font-bold mb-4">
              Fam
            </div>
            <h3 className="font-bold text-lg text-white">FamPay (Gmail OAuth)</h3>
            <p className="mt-2 text-xs text-emerald-200/70 leading-relaxed">
              Automated email notification ingestion via restricted Gmail API scope. Instant reference extraction on receipt.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl glass-card-hover">
            <div className="h-10 w-10 rounded-xl bg-teal-500/15 text-teal-300 border border-teal-500/30 flex items-center justify-center font-bold mb-4">
              SMS
            </div>
            <h3 className="font-bold text-lg text-white">Android SMS Gateway App</h3>
            <p className="mt-2 text-xs text-emerald-200/70 leading-relaxed">
              Pair your Android phone. Our companion app listens to bank credit SMS from 50+ Indian banks and automatically settles orders.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl glass-card-hover">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold mb-4">
              USDT
            </div>
            <h3 className="font-bold text-lg text-white">Crypto (USDT / USDC)</h3>
            <p className="mt-2 text-xs text-emerald-200/70 leading-relaxed">
              Multi-chain support for TRC-20, Polygon, BSC, and Solana with automated on-chain transaction hash verification.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl glass-card-hover">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold mb-4">
              Free
            </div>
            <h3 className="font-bold text-lg text-white">Freecharge OTP Engine</h3>
            <p className="mt-2 text-xs text-emerald-200/70 leading-relaxed">
              Encrypted session management with automatic remark and comment matching for high-velocity checkout links.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-20 px-4 max-w-5xl mx-auto text-center">
        <div className="glass-panel p-10 sm:p-14 rounded-3xl border border-emerald-500/35 relative overflow-hidden shadow-glow">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/15 blur-3xl rounded-full pointer-events-none" />
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white">Ready to Launch Your Gateway?</h2>
          <p className="mt-4 text-emerald-200/80 max-w-xl mx-auto text-sm sm:text-base">
            Create an account in 30 seconds and generate your first hosted payment link or API key.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={() => onNavigate('auth')}
              className="rounded-xl bg-gradient-primary px-8 py-3.5 text-sm font-bold text-black shadow-glow hover:brightness-110 active:scale-95 transition"
            >
              Get Started Now
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
