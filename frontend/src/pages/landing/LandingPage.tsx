import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
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
  Layers,
  Check,
  ExternalLink,
  Mail,
  Send,
  Phone,
  HelpCircle,
  Database,
  KeyRound,
  QrCode,
  Webhook,
  Terminal,
  FileText
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  // Smooth scroll handler for anchor clicks (#what, #api, #google-data, #security)
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    // Check if hash present on mount
    if (window.location.hash) {
      const id = window.location.hash.replace('#', '');
      setTimeout(() => scrollToSection(id), 100);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#040f0c] text-emerald-50 selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center overflow-hidden">
        
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] bg-emerald-500/15 blur-[140px] rounded-full pointer-events-none" />

        {/* Prominent Hero Brand Logo */}
        <div className="flex justify-center mb-8">
          <button
            type="button"
            onClick={() => onNavigate(user ? 'dashboard' : 'auth')}
            className="inline-flex flex-col items-center justify-center group cursor-pointer relative z-10 p-2 rounded-2xl transition-all duration-300 hover:scale-105 focus:outline-none"
            aria-label="PayVia360 Portal Login / Dashboard"
          >
            <img 
              src="/weblogo.png" 
              alt="PayVia360 Payment Gateway" 
              className="h-20 sm:h-28 md:h-36 w-auto object-contain drop-shadow-[0_0_40px_rgba(16,185,129,0.35)] transition-transform duration-500 group-hover:brightness-110"
            />
            <span className="text-[10px] sm:text-xs font-mono font-bold text-emerald-400 tracking-[0.3em] uppercase mt-2.5 bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 rounded-full shadow-glow group-hover:bg-emerald-500/20 group-hover:border-emerald-400/50 transition-colors">
              PAYMENT-SETTLEMENT ENGINE
            </span>
          </button>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-300 mb-8 backdrop-blur-md shadow-glow">
          <Sparkles className="h-4 w-4 text-amber-400 animate-spin" />
          <span>Next-Gen Direct UPI & Cyber Settlement Infrastructure</span>
        </div>

        <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-[1.1]">
          Merchant Payment Collection <br />
          <span className="text-gradient">& Transaction Management</span>
        </h1>

        <p className="mt-6 text-base sm:text-xl text-emerald-200/80 max-w-3xl mx-auto leading-relaxed">
          PayVia is a merchant payment management platform. Connect the supported merchant and payment accounts you already own, create payment requests from the dashboard or the PayVia API, and let PayVia track each request until a supported incoming payment is detected and recorded.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => onNavigate(user ? 'dashboard' : 'auth')}
            className="flex items-center gap-2 rounded-xl bg-gradient-primary px-8 py-4 text-sm font-bold text-black shadow-glow hover:brightness-110 active:scale-95 transition"
          >
            <span>{user ? 'Open Merchant Dashboard' : 'Get Started Now'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => onNavigate('docs')}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-[#0b1f18] px-6 py-4 text-sm font-semibold text-emerald-200 hover:bg-[#11382b] hover:border-emerald-500/50 transition backdrop-blur shadow-glow-amber"
          >
            <Code2 className="h-4 w-4 text-amber-400" />
            <span>View Documentation</span>
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
            <span className="font-display text-2xl font-bold text-lime-400">11 Themes</span>
            <span className="text-xs text-emerald-300/70">Conversion Checkout Templates</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-display text-2xl font-bold text-teal-300">Multi-Channel</span>
            <span className="text-xs text-emerald-300/70">Smart Weighted Rotation</span>
          </div>
        </div>
      </section>

      {/* ========================================================
          1. PRODUCT SECTION (#what)
          ======================================================== */}
      <section id="what" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-emerald-500/15">
        <div className="text-center mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono">PRODUCT OVERVIEW</span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white">How PayVia Works</h2>
          <p className="text-emerald-200/80 max-w-3xl mx-auto text-sm sm:text-base leading-relaxed">
            PayVia does not replace your payment account. Payments are collected directly into your own connected accounts; PayVia generates the payment request, hosts the payment page, performs automated matching against available transaction information, and stores the resulting transaction records.
          </p>
        </div>

        {/* 5-Step Workflow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-16">
          <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 space-y-3 relative">
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">Step 1</span>
            <h3 className="font-bold text-sm text-white">Connect Account</h3>
            <p className="text-xs text-emerald-200/70 leading-relaxed">
              Connect accounts you own — Paytm Business, BharatPe, FamPay, Freecharge, or Custom UPI.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 space-y-3 relative">
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">Step 2</span>
            <h3 className="font-bold text-sm text-white">Create Request</h3>
            <p className="text-xs text-emerald-200/70 leading-relaxed">
              From the dashboard or REST API, create a payment request. PayVia returns a dynamic checkout page with QR and UPI intents.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 space-y-3 relative">
            <span className="text-xs font-mono font-bold text-lime-400 bg-lime-500/10 px-2.5 py-1 rounded-lg border border-lime-500/30">Step 3</span>
            <h3 className="font-bold text-sm text-white">Customer Pays</h3>
            <p className="text-xs text-emerald-200/70 leading-relaxed">
              Your customer completes the payment via any UPI app. Money moves directly to your own account.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 space-y-3 relative">
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30">Step 4</span>
            <h3 className="font-bold text-sm text-white">PayVia Detects</h3>
            <p className="text-xs text-emerald-200/70 leading-relaxed">
              Our automated sensing engine matches incoming credits by Amount, 12-digit UTR, and timestamp.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 space-y-3 relative">
            <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/30">Step 5</span>
            <h3 className="font-bold text-sm text-white">Webhook & Record</h3>
            <p className="text-xs text-emerald-200/70 leading-relaxed">
              PayVia updates the record, sends an HMAC-SHA256 signed webhook to your server, and redirects the user.
            </p>
          </div>
        </div>

        {/* Supported Gateways Grid */}
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400 font-mono">SUPPORTED CONNECTIONS</span>
          <h3 className="font-display text-2xl sm:text-3xl font-bold mt-1 text-white">Connect Any Account You Own & Control</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl glass-card-hover border border-emerald-500/20">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold mb-4">
              Paytm
            </div>
            <h4 className="font-bold text-base text-white">Paytm Business Direct</h4>
            <p className="mt-2 text-xs text-emerald-200/70 leading-relaxed">
              Merchant account you own. Direct MID & Merchant Key integration with official status queries.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl glass-card-hover border border-amber-500/20">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold mb-4">
              BP
            </div>
            <h4 className="font-bold text-base text-white">BharatPe Merchant</h4>
            <p className="mt-2 text-xs text-emerald-200/70 leading-relaxed">
              Connected with your own merchant login. PayVia reads real-time QR credit settlements with instant UTR matching.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl glass-card-hover border border-lime-500/20">
            <div className="h-10 w-10 rounded-xl bg-lime-500/15 text-lime-300 border border-lime-500/30 flex items-center justify-center font-bold mb-4">
              Fam
            </div>
            <h4 className="font-bold text-base text-white">FamPay (Gmail OAuth)</h4>
            <p className="mt-2 text-xs text-emerald-200/70 leading-relaxed">
              Optional Google connection. Reads strictly FamPay "payment received" notification emails to extract amount and UTR.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl glass-card-hover border border-teal-500/20">
            <div className="h-10 w-10 rounded-xl bg-teal-500/15 text-teal-300 border border-teal-500/30 flex items-center justify-center font-bold mb-4">
              SMS
            </div>
            <h4 className="font-bold text-base text-white">Android SMS Gateway App</h4>
            <p className="mt-2 text-xs text-emerald-200/70 leading-relaxed">
              Pair any Android phone with our native Companion App to forward bank credit SMS from 50+ Indian banks for zero-delay settlement.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl glass-card-hover border border-cyan-500/20">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center justify-center font-bold mb-4">
              USDT
            </div>
            <h4 className="font-bold text-base text-white">Crypto (USDT / USDC)</h4>
            <p className="mt-2 text-xs text-emerald-200/70 leading-relaxed">
              Multi-chain support for TRC-20, Polygon, BSC, and Solana with automated on-chain transaction hash verification.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl glass-card-hover border border-rose-500/20">
            <div className="h-10 w-10 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center justify-center font-bold mb-4">
              Free
            </div>
            <h4 className="font-bold text-base text-white">Freecharge OTP Engine</h4>
            <p className="mt-2 text-xs text-emerald-200/70 leading-relaxed">
              Encrypted session management with automatic remark and comment matching for high-velocity checkout links.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================
          2. API CAPABILITIES SECTION (#api)
          ======================================================== */}
      <section id="api" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-emerald-500/15">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-12">
          
          <div className="lg:w-1/2 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/35 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-300 font-mono">
              <Terminal className="h-3.5 w-3.5 text-indigo-400" />
              <span>DEVELOPER API & WEBSOCKETS</span>
            </div>
            
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white leading-tight">
              Powerful REST API Built for Developers
            </h2>
            
            <p className="text-emerald-200/80 text-sm sm:text-base leading-relaxed">
              PayVia provides modern APIs that let your application integrate payment collection and transaction management in minutes. Every capability is production-ready, fully documented, and backed by ready-made SDKs.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Programmatic Order Creation</h4>
                  <p className="text-xs text-emerald-200/70">POST amount and customer details with an API key to receive a dynamic checkout URL and token.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">HMAC-SHA256 Signed Webhooks</h4>
                  <p className="text-xs text-emerald-200/70">Receive cryptographic status callbacks the exact millisecond an incoming payment is detected.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">PHP Kit, Node, Python & Flutter</h4>
                  <p className="text-xs text-emerald-200/70">Download pre-built client libraries or use standard HTTP cURL requests.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-4">
              <button
                onClick={() => onNavigate('docs')}
                className="flex items-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 text-xs font-bold text-black shadow-glow hover:brightness-110 active:scale-95 transition"
              >
                <span>Read Full Documentation</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => onNavigate('api-keys')}
                className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-5 py-3 text-xs font-bold text-indigo-300 hover:bg-indigo-500/20 transition"
              >
                <KeyRound className="h-4 w-4" />
                <span>Get API Keys</span>
              </button>
            </div>
          </div>

          {/* Interactive Code Preview Box */}
          <div className="lg:w-1/2 w-full glass-panel p-6 rounded-3xl border border-white/10 bg-[#080b12] space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500" />
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-slate-400 ml-2">POST /api/orders</span>
              </div>
              <span className="text-emerald-400">200 OK</span>
            </div>

            <pre className="text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
{`curl -X POST https://payvia360.com/api/orders \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer pv_live_secret_key" \\
  -d '{
    "amount": 499.00,
    "customerMobile": "9876543210",
    "customerName": "Rahul Sharma",
    "remark1": "Order #PV1042",
    "template": "template_1"
  }'

# Response:
{
  "status": true,
  "data": {
    "orderId": "PV_78B5B47D1B",
    "paymentUrl": "https://payvia360.com/pay/94e90df257...",
    "status": "PENDING",
    "expiresAt": "2026-09-16T18:15:00Z"
  }
}`}
            </pre>
          </div>

        </div>
      </section>

      {/* ========================================================
          3. GOOGLE DATA TRANSPARENCY SECTION (#google-data)
          ======================================================== */}
      <section id="google-data" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-emerald-500/15">
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-emerald-500/30 relative overflow-hidden shadow-glow">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

          <div className="max-w-4xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-300 font-mono">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>GOOGLE DATA TRANSPARENCY & COMPLIANCE</span>
            </div>

            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
              Why PayVia Uses Google Account Data
            </h2>

            <p className="text-emerald-200/80 text-sm sm:text-base leading-relaxed">
              Google account access in PayVia is completely optional and is used for <strong>one specific feature only</strong>: verifying payments received on a FamPay merchant account that you connect yourself. PayVia does not use Google Sign-In to log you in, and it does not request Google Drive, Calendar, Sheets, or Contacts data.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="rounded-2xl bg-slate-900/80 p-4 border border-white/5 space-y-2">
                <span className="text-xs font-mono font-bold text-emerald-400 block">.../auth/userinfo.email</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Used solely to confirm the email address of the linked Google account and display it on your FamPay merchant card.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900/80 p-4 border border-white/5 space-y-2">
                <span className="text-xs font-mono font-bold text-amber-400 block">.../auth/gmail.readonly</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Gmail is searched strictly while one of your payment requests is pending, and only for FamPay "payment received" notification emails so the amount and UTR can be matched.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-950/40 p-5 border border-emerald-500/25 space-y-3 text-xs text-emerald-200/90 leading-relaxed">
              <h4 className="font-bold text-sm text-white">Google Limited Use Compliance Notice:</h4>
              <p>
                PayVia does not send, modify, or delete emails; does not read unrelated personal messages; and <strong>never sells Google data, uses it for advertising, or uses it to train AI models</strong>. PayVia’s use and transfer of information received from Google APIs adheres strictly to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold">Google API Services User Data Policy</a>, including the Limited Use requirements.
              </p>
              <p>
                You can disconnect your Google account from the Merchants tab at any time, or revoke access instantly via <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold">myaccount.google.com/permissions</a>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          4. SECURITY & PRIVACY SECTION (#security)
          ======================================================== */}
      <section id="security" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-emerald-500/15">
        <div className="text-center mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono">TRUST & ENCRYPTION</span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white">Security & Privacy Architecture</h2>
          <p className="text-emerald-200/80 max-w-3xl mx-auto text-sm sm:text-base leading-relaxed">
            PayVia is built with a zero-custody, non-holding philosophy. Funds travel directly from payer to your account with enterprise security safeguards at every layer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-3xl border border-emerald-500/20 space-y-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-white">Zero-Custody Non-Holding</h3>
            <p className="text-xs text-emerald-200/70 leading-relaxed">
              PayVia is not a bank and never holds or receives customer money. All UPI transfers and settlements move directly to your own verified merchant bank accounts.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-emerald-500/20 space-y-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <KeyRound className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-white">AES-256 Encrypted Vault</h3>
            <p className="text-xs text-emerald-200/70 leading-relaxed">
              All merchant credentials, OAuth tokens, and session identifiers are encrypted at rest with military-grade AES-256 encryption. We never store bank passwords or PINs.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-emerald-500/20 space-y-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Database className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-white">Data Control & Deletion Rights</h3>
            <p className="text-xs text-emerald-200/70 leading-relaxed">
              You own your data. Deleting a merchant route purges its credentials instantly. To delete your entire account and transaction logs, contact our data protection team.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================
          5. CTA & CONTACT SECTION
          ======================================================== */}
      <section className="py-20 px-4 max-w-5xl mx-auto text-center">
        <div className="glass-panel p-10 sm:p-14 rounded-3xl border border-emerald-500/35 relative overflow-hidden shadow-glow">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/15 blur-3xl rounded-full pointer-events-none" />
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white">Ready to Launch Your Gateway?</h2>
          <p className="mt-4 text-emerald-200/80 max-w-xl mx-auto text-sm sm:text-base">
            Create an account in 30 seconds, connect your accounts, and generate your first hosted payment link or API key.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => onNavigate(user ? 'dashboard' : 'auth')}
              className="rounded-xl bg-gradient-primary px-8 py-3.5 text-sm font-bold text-black shadow-glow hover:brightness-110 active:scale-95 transition"
            >
              {user ? 'Go to Dashboard' : 'Get Started Free'}
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-3.5 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20 transition"
            >
              Contact Support
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================
          6. FOOTER
          ======================================================== */}
      <footer className="border-t border-emerald-500/15 bg-[#030907] py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          <div className="space-y-4 md:col-span-1">
            <img src="/weblogo.png" alt="PayVia360 Logo" className="h-10 w-auto object-contain" />
            <p className="text-xs text-emerald-300/70 leading-relaxed font-mono">
              The high-velocity zero-commission direct-to-merchant payment management and transaction sensing platform.
            </p>
            <span className="text-[10px] text-emerald-400 font-mono font-bold block">
              © 2026 PayVia360 Engine. All rights reserved.
            </span>
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-white mb-3 font-mono">Product</h4>
            <ul className="space-y-2 text-xs text-emerald-300/70">
              <li><button onClick={() => scrollToSection('what')} className="hover:text-emerald-400 transition">Overview & Workflow</button></li>
              <li><button onClick={() => scrollToSection('what')} className="hover:text-emerald-400 transition">Supported Connectors</button></li>
              <li><button onClick={() => scrollToSection('api')} className="hover:text-emerald-400 transition">API Capabilities</button></li>
              <li><button onClick={() => onNavigate('plans')} className="hover:text-emerald-400 transition">Pricing Plans</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-white mb-3 font-mono">Developer & Trust</h4>
            <ul className="space-y-2 text-xs text-emerald-300/70">
              <li><button onClick={() => onNavigate('docs')} className="hover:text-emerald-400 transition">Documentation</button></li>
              <li><button onClick={() => scrollToSection('google-data')} className="hover:text-emerald-400 transition">Google Data Transparency</button></li>
              <li><button onClick={() => scrollToSection('security')} className="hover:text-emerald-400 transition">Security & Privacy</button></li>
              <li><button onClick={() => onNavigate('api-keys')} className="hover:text-emerald-400 transition">API Keys & Webhooks</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-white mb-3 font-mono">Support & Legal</h4>
            <ul className="space-y-2 text-xs text-emerald-300/70">
              <li><button onClick={() => onNavigate('contact')} className="hover:text-emerald-400 transition">Contact Support</button></li>
              <li><a href="https://t.me/makes360" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition flex items-center gap-1">Telegram (@makes360)</a></li>
              <li><a href="mailto:support@payvia360.com" className="hover:text-emerald-400 transition">support@payvia360.com</a></li>
              <li><button onClick={() => scrollToSection('security')} className="hover:text-emerald-400 transition">Terms of Service</button></li>
            </ul>
          </div>

        </div>
      </footer>

    </div>
  );
};

