import React, { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';
import { MerchantAccount, PaymentProviderType } from '../../types';
import QRCode from 'qrcode';
import { 
  Wallet, 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  ShieldCheck, 
  Smartphone, 
  Mail, 
  Coins, 
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Edit3,
  Copy,
  Check,
  Search,
  Sliders,
  RefreshCw,
  Eye,
  Info,
  Layers,
  ArrowRight,
  X
} from 'lucide-react';

interface ProviderConfig {
  id: PaymentProviderType;
  name: string;
  badge: string;
  tagline: string;
  gradient: string;
  borderGlow: string;
  icon: string;
  supportedFields: string[];
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'PAYTM',
    name: 'Paytm Business',
    badge: 'Direct MID API',
    tagline: 'Instant settlement via Paytm Business merchant credentials',
    gradient: 'from-blue-600/20 via-indigo-600/10 to-transparent',
    borderGlow: 'border-blue-500/30 hover:border-blue-500/60',
    icon: 'PAYTM',
    supportedFields: ['mid', 'merchantKey', 'upiId', 'displayName']
  },
  {
    id: 'BHARATPE',
    name: 'BharatPe Merchant',
    badge: 'OTP & Dynamic QR',
    tagline: 'Live merchant QR session syncing via mobile OTP',
    gradient: 'from-purple-600/20 via-pink-600/10 to-transparent',
    borderGlow: 'border-purple-500/30 hover:border-purple-500/60',
    icon: 'BHARATPE',
    supportedFields: ['mobile', 'merchantId', 'upiId', 'displayName']
  },
  {
    id: 'FAMPAY',
    name: 'FamPay (Gmail)',
    badge: 'Email Alert Sync',
    tagline: 'Auto-detect incoming payment receipt emails from FamPay',
    gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    borderGlow: 'border-amber-500/30 hover:border-amber-500/60',
    icon: 'FAMPAY',
    supportedFields: ['gmailEmail', 'upiId', 'displayName']
  },
  {
    id: 'CUSTOM_UPI',
    name: 'Custom UPI (Gateway)',
    badge: 'Companion App',
    tagline: 'Android SMS & Notification sensing via 24/7 background listener',
    gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    borderGlow: 'border-emerald-500/30 hover:border-emerald-500/60',
    icon: 'UPI',
    supportedFields: ['upiId', 'displayName']
  },
  {
    id: 'FREECHARGE',
    name: 'Freecharge OTP',
    badge: 'Auto-Verify',
    tagline: 'Comment-based payment tracking and automated OTP verification',
    gradient: 'from-rose-500/20 via-red-500/10 to-transparent',
    borderGlow: 'border-rose-500/30 hover:border-rose-500/60',
    icon: 'FREECHARGE',
    supportedFields: ['mobile', 'upiId', 'displayName']
  },
  {
    id: 'CRYPTO',
    name: 'Crypto USDT/USDC',
    badge: 'Multi-Chain',
    tagline: 'On-chain verification across TRC20, Polygon & BSC networks',
    gradient: 'from-cyan-500/20 via-teal-500/10 to-transparent',
    borderGlow: 'border-cyan-500/30 hover:border-cyan-500/60',
    icon: 'CRYPTO',
    supportedFields: ['trc20', 'polygon', 'bsc']
  }
];

export const MerchantsManager: React.FC = () => {
  const [merchants, setMerchants] = useState<MerchantAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvider, setFilterProvider] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // In-Page Builder State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderProvider, setBuilderProvider] = useState<PaymentProviderType>('PAYTM');
  const [label, setLabel] = useState('');
  const [upiId, setUpiId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [weight, setWeight] = useState(1);
  const [intentEnabled, setIntentEnabled] = useState(true);
  const [mid, setMid] = useState('');
  const [merchantKey, setMerchantKey] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [gmailEmail, setGmailEmail] = useState('');
  const [trc20Address, setTrc20Address] = useState('');
  const [polygonAddress, setPolygonAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [editingAccount, setEditingAccount] = useState<MerchantAccount | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editUpiId, setEditUpiId] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editWeight, setEditWeight] = useState(1);
  const [editIntentEnabled, setEditIntentEnabled] = useState(true);
  const [editMid, setEditMid] = useState('');
  const [editMerchantKey, setEditMerchantKey] = useState('');
  const [editMobile, setEditMobile] = useState('');

  // Test QR Modal State
  const [testQrAccount, setTestQrAccount] = useState<MerchantAccount | null>(null);
  const [testQrDataUrl, setTestQrDataUrl] = useState<string>('');

  // OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [activeOtpMerchant, setActiveOtpMerchant] = useState<MerchantAccount | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Copy Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadMerchants = async () => {
    setIsLoading(true);
    const res = await ApiService.getMerchants();
    if (res.status && res.data) {
      setMerchants(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadMerchants();
  }, []);

  const handleStartAddProvider = (providerId: PaymentProviderType) => {
    setBuilderProvider(providerId);
    setLabel(`${providerId.charAt(0) + providerId.slice(1).toLowerCase()} Account`);
    setUpiId(providerId === 'CRYPTO' ? 'crypto-vault' : '');
    setDisplayName('My Store');
    setWeight(1);
    setIntentEnabled(true);
    setMid('');
    setMerchantKey('');
    setMobileNumber('');
    setGmailEmail('');
    setTrc20Address('');
    setPolygonAddress('');
    setIsBuilderOpen(true);
    // Smooth scroll to builder
    setTimeout(() => {
      document.getElementById('inpage-builder-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const credentials: any = {};
    if (mid) credentials.mid = mid;
    if (merchantKey) credentials.merchantKey = merchantKey;
    if (mobileNumber) credentials.mobile = mobileNumber;
    if (gmailEmail) credentials.gmailEmail = gmailEmail;
    if (builderProvider === 'CRYPTO') {
      credentials.networks = [
        { chain: 'TRC20', address: trc20Address || 'TX9Q8yJz42mN8K9vP2bQw5R1t7YmU3x8Zb' },
        { chain: 'POLYGON', address: polygonAddress || '0x71C2a8B998E1f0E389aDe1b9319B1484C3F6e9A0' }
      ];
    }

    const res = await ApiService.createMerchant({
      provider: builderProvider,
      label,
      upiId: upiId || 'gateway@upi',
      displayName: displayName || label,
      weight: Number(weight) || 1,
      intentEnabled,
      credentials
    });

    setIsSubmitting(false);

    if (res.status) {
      setIsBuilderOpen(false);
      showToast(`✓ Successfully connected ${label}!`);
      loadMerchants();
    } else {
      showToast(`❌ ${res.error || 'Failed to connect merchant'}`);
    }
  };

  const handleToggle = async (account: MerchantAccount) => {
    const res = await ApiService.toggleMerchant(account.id);
    if (res.status) {
      const newStatus = account.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      showToast(newStatus === 'ACTIVE' ? `✓ Resumed ${account.label} for live traffic` : `⏸️ Paused ${account.label} from rotation`);
      loadMerchants();
    }
  };

  const handleDelete = async (account: MerchantAccount) => {
    if (confirm(`Are you sure you want to disconnect "${account.label}"?`)) {
      const res = await ApiService.deleteMerchant(account.id);
      if (res.status) {
        showToast(`🗑️ Disconnected ${account.label}`);
        loadMerchants();
      }
    }
  };

  const handleOpenEdit = (account: MerchantAccount) => {
    setEditingAccount(account);
    setEditLabel(account.label);
    setEditUpiId(account.upiId);
    setEditDisplayName(account.displayName);
    setEditWeight(account.weight || 1);
    setEditIntentEnabled(account.intentEnabled !== false);
    setEditMid(account.credentials?.mid || '');
    setEditMerchantKey(account.credentials?.merchantKey || '');
    setEditMobile(account.credentials?.mobile || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    const credentials = {
      ...editingAccount.credentials,
      mid: editMid,
      merchantKey: editMerchantKey,
      mobile: editMobile
    };

    const res = await ApiService.updateMerchant(editingAccount.id, {
      label: editLabel,
      upiId: editUpiId,
      displayName: editDisplayName,
      weight: Number(editWeight) || 1,
      intentEnabled: editIntentEnabled,
      credentials
    });

    if (res.status) {
      setEditingAccount(null);
      showToast(`✓ Updated ${editLabel} settings`);
      loadMerchants();
    } else {
      showToast(`❌ ${res.error || 'Failed to update merchant'}`);
    }
  };

  const handleShowTestQr = async (account: MerchantAccount) => {
    setTestQrAccount(account);
    const upiUri = `upi://pay?pa=${encodeURIComponent(account.upiId)}&pn=${encodeURIComponent(account.displayName)}&am=1.00&cu=INR&tn=PayVia_Test_Scan`;
    try {
      const qr = await QRCode.toDataURL(upiUri, { width: 320, margin: 2 });
      setTestQrDataUrl(qr);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('✓ Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendOtp = async (account: MerchantAccount) => {
    setActiveOtpMerchant(account);
    setShowOtpModal(true);
    await ApiService.sendMerchantOtp(account.id, account.credentials?.mobile);
    showToast(`📱 OTP code requested for ${account.credentials?.mobile || 'merchant number'}`);
  };

  const handleVerifyOtp = async () => {
    if (!activeOtpMerchant || !otpInput) return;
    setIsVerifyingOtp(true);
    const res = await ApiService.verifyMerchantOtp(activeOtpMerchant.id, otpInput, activeOtpMerchant.credentials?.mobile);
    setIsVerifyingOtp(false);

    if (res.status) {
      setShowOtpModal(false);
      setOtpInput('');
      loadMerchants();
      showToast('✓ Session synced and verified successfully!');
    } else {
      showToast(`❌ ${res.error || 'OTP verification failed'}`);
    }
  };

  // Filtered List
  const filteredMerchants = merchants.filter(m => {
    const matchesSearch = 
      m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.upiId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.provider.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProvider = filterProvider === 'ALL' || m.provider === filterProvider;
    const matchesStatus = filterStatus === 'ALL' || m.status === filterStatus;

    return matchesSearch && matchesProvider && matchesStatus;
  });

  const activeCount = merchants.filter(m => m.status === 'ACTIVE').length;
  const pausedCount = merchants.filter(m => m.status === 'PAUSED').length;
  const totalTxns = merchants.reduce((acc, m) => acc + (m.smsCount || 0), 0);

  return (
    <div className="space-y-8 pb-16">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-slate-900/95 border border-indigo-500/40 px-4 py-3 rounded-2xl text-white shadow-2xl backdrop-blur-md animate-fade-in text-xs font-semibold">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header & Quick Stats */}
      <div className="relative overflow-hidden glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-950/90 to-indigo-950/30 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold mb-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Dynamic Multi-Provider Smart Routing
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Connected Merchant Accounts
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Connect your Paytm, BharatPe, FamPay, Custom UPI and Crypto accounts. Orders automatically rotate across active channels according to configured weight.
            </p>
          </div>

          {/* Stat Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="glass-card px-4 py-3 rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Accounts</p>
                <p className="text-base font-bold text-white font-mono">{merchants.length}</p>
              </div>
            </div>

            <div className="glass-card px-4 py-3 rounded-2xl border border-emerald-500/20 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-wider">Active In Rotation</p>
                <p className="text-base font-bold text-emerald-300 font-mono">{activeCount}</p>
              </div>
            </div>

            <div className="glass-card px-4 py-3 rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Verified</p>
                <p className="text-base font-bold text-white font-mono">{totalTxns} Txns</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. In-Page Provider Launchpad (Start Adding Directly from Page) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <h2 className="font-display text-base font-bold text-white">Add & Connect Payment Channel</h2>
          </div>
          <span className="text-xs text-slate-400">Click any provider to start adding immediately</span>
        </div>

        {/* 6 Provider Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {PROVIDERS.map((prov) => {
            const isSelected = isBuilderOpen && builderProvider === prov.id;
            return (
              <button
                key={prov.id}
                onClick={() => handleStartAddProvider(prov.id)}
                className={`group relative text-left p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-b from-indigo-900/40 to-slate-900 border-indigo-500 shadow-glow scale-[1.02]'
                    : `bg-slate-900/60 ${prov.borderGlow} hover:scale-[1.02] hover:bg-slate-900/90`
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300 font-bold group-hover:text-indigo-300 transition">
                      {prov.icon}
                    </span>
                    <Plus className={`h-4 w-4 transition ${isSelected ? 'text-indigo-400 rotate-45' : 'text-slate-500 group-hover:text-white'}`} />
                  </div>
                  <h3 className="font-bold text-xs text-white group-hover:text-indigo-300 transition line-clamp-1">{prov.name}</h3>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{prov.tagline}</p>
                </div>
                
                <div className="mt-4 pt-2.5 border-t border-white/5 flex items-center justify-between text-[9px] font-semibold text-indigo-400">
                  <span>{prov.badge}</span>
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Expandable In-Page Interactive Builder */}
      {isBuilderOpen && (
        <div id="inpage-builder-section" className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/40 bg-slate-950/95 shadow-2xl animate-fade-in relative">
          <button 
            onClick={() => setIsBuilderOpen(false)}
            className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold text-sm shadow-glow">
              {builderProvider.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Connect New {PROVIDERS.find(p => p.id === builderProvider)?.name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                  {PROVIDERS.find(p => p.id === builderProvider)?.badge}
                </span>
              </div>
              <p className="text-xs text-slate-400">Enter account parameters below. It will immediately join the live smart rotation pool.</p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-5 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Account Label */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1.5">Account Label / Identifier</label>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Main Store UPI / Primary BharatPe"
                  className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* UPI ID / VPA */}
              {builderProvider !== 'CRYPTO' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1.5">UPI ID (VPA) for Collections</label>
                  <input
                    type="text"
                    required
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. merchant@paytm / store@okicici"
                    className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-white font-mono placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* Display Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1.5">Customer Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Official Tech Store"
                  className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Rotation Weight Slider */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-semibold text-slate-300 uppercase">Traffic Routing Weight</label>
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">{weight}x</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>1x (Standard)</span>
                  <span>5x (High)</span>
                  <span>10x (Priority)</span>
                </div>
              </div>

              {/* Provider-Specific Credentials */}
              {builderProvider === 'PAYTM' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1.5">Paytm MID (Merchant ID)</label>
                    <input
                      type="text"
                      value={mid}
                      onChange={(e) => setMid(e.target.value)}
                      placeholder="e.g. STORE982348123982"
                      className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-white font-mono placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1.5">Paytm Merchant Key</label>
                    <input
                      type="password"
                      value={merchantKey}
                      onChange={(e) => setMerchantKey(e.target.value)}
                      placeholder="Secret Merchant Key"
                      className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-white font-mono placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {(builderProvider === 'BHARATPE' || builderProvider === 'FREECHARGE') && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1.5">Registered Mobile Number</label>
                  <input
                    type="text"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-white font-mono placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              {builderProvider === 'FAMPAY' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1.5">FamPay Notification Email</label>
                  <input
                    type="email"
                    value={gmailEmail}
                    onChange={(e) => setGmailEmail(e.target.value)}
                    placeholder="e.g. yourstore@gmail.com"
                    className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-white font-mono placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              {builderProvider === 'CRYPTO' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1.5">TRC20 USDT Deposit Address</label>
                    <input
                      type="text"
                      value={trc20Address}
                      onChange={(e) => setTrc20Address(e.target.value)}
                      placeholder="e.g. TX9Q8yJz42mN8K9vP2bQw5R1t7YmU3x8Zb"
                      className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-white font-mono placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1.5">Polygon (USDT/USDC) Address</label>
                    <input
                      type="text"
                      value={polygonAddress}
                      onChange={(e) => setPolygonAddress(e.target.value)}
                      placeholder="e.g. 0x71C2a8B998E1f0E389aDe1b9319B1484C3F6e9A0"
                      className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-white font-mono placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

            </div>

            {/* UPI Intent Toggle */}
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="intentToggle"
                checked={intentEnabled}
                onChange={(e) => setIntentEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="intentToggle" className="text-xs text-slate-300 select-none cursor-pointer">
                Enable 1-Tap UPI Intent on Mobile Devices (GPay, PhonePe, Paytm apps)
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsBuilderOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-gradient-primary px-6 py-2.5 font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isSubmitting ? 'Connecting Account...' : 'Save & Activate Account'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Search & Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by label, UPI ID, or provider..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Status filter */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-white/5 text-xs">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${filterStatus === 'ALL' ? 'bg-indigo-600 text-white shadow-glow' : 'text-slate-400 hover:text-white'}`}
            >
              All ({merchants.length})
            </button>
            <button
              onClick={() => setFilterStatus('ACTIVE')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${filterStatus === 'ACTIVE' ? 'bg-emerald-600 text-white shadow-glow' : 'text-slate-400 hover:text-white'}`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilterStatus('PAUSED')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${filterStatus === 'PAUSED' ? 'bg-amber-600 text-white shadow-glow' : 'text-slate-400 hover:text-white'}`}
            >
              Paused ({pausedCount})
            </button>
          </div>

          <button
            onClick={loadMerchants}
            title="Refresh List"
            className="p-2 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-white transition"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4. Creative Grid of Connected Merchant Cards */}
      {filteredMerchants.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl border border-white/5">
          <Wallet className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Merchant Accounts Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || filterProvider !== 'ALL' || filterStatus !== 'ALL'
              ? 'Try adjusting your search or filters'
              : 'Click on any provider card above to connect your first merchant account and begin routing payments.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMerchants.map((account) => {
            const isBharatPeOrFreecharge = account.provider === 'BHARATPE' || account.provider === 'FREECHARGE';
            const isFamPay = account.provider === 'FAMPAY';
            const isCrypto = account.provider === 'CRYPTO';
            const isActive = account.status === 'ACTIVE';
            const provConfig = PROVIDERS.find(p => p.id === account.provider);

            return (
              <div 
                key={account.id} 
                className={`relative group glass-card p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between ${
                  isActive 
                    ? 'border-indigo-500/30 hover:border-indigo-500/60 bg-gradient-to-b from-slate-900/90 to-slate-950/90 shadow-xl' 
                    : 'border-amber-500/20 bg-slate-950/60 opacity-75'
                }`}
              >
                <div>
                  {/* Top Bar: Provider badge & Fast Actions */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-2xl bg-gradient-primary flex items-center justify-center font-bold text-white shadow-glow text-xs">
                        {account.provider.slice(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-white group-hover:text-indigo-300 transition">{account.label}</h3>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{account.displayName || account.provider}</span>
                      </div>
                    </div>

                    {/* Action Toolbar */}
                    <div className="flex items-center gap-1 bg-slate-900/80 border border-white/5 p-1 rounded-xl">
                      {/* Pause / Resume Button */}
                      <button
                        onClick={() => handleToggle(account)}
                        title={isActive ? 'Pause account from rotation' : 'Resume live traffic rotation'}
                        className={`p-1.5 rounded-lg transition ${
                          isActive 
                            ? 'text-emerald-400 hover:bg-emerald-500/10' 
                            : 'text-amber-400 hover:bg-amber-500/10'
                        }`}
                      >
                        {isActive ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />}
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenEdit(account)}
                        title="Edit Account Details"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>

                      {/* Test QR Preview Button */}
                      <button
                        onClick={() => handleShowTestQr(account)}
                        title="View & Test Live QR"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(account)}
                        title="Disconnect Merchant Account"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* VPA & Parameter Details Box */}
                  <div className="rounded-2xl bg-slate-900/80 p-3.5 border border-white/5 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">UPI / Address:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-200 font-semibold truncate max-w-[140px]">{account.upiId}</span>
                        <button
                          onClick={() => handleCopy(account.upiId, account.id)}
                          title="Copy UPI VPA"
                          className="text-slate-500 hover:text-white transition"
                        >
                          {copiedId === account.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Traffic Weight:</span>
                      <span className="text-indigo-400 font-bold">{account.weight || 1}x</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">UPI 1-Tap Intent:</span>
                      <span className={account.intentEnabled !== false ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {account.intentEnabled !== false ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>

                    {account.credentials?.mid && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">Merchant ID:</span>
                        <span className="text-slate-300 font-mono text-[10px]">{account.credentials.mid}</span>
                      </div>
                    )}
                  </div>

                  {/* Special Provider Actions */}
                  {isBharatPeOrFreecharge && (
                    <div className="mt-3">
                      <button
                        onClick={() => handleSendOtp(account)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition"
                      >
                        <Smartphone className="h-3.5 w-3.5" />
                        <span>Sync OTP Session ({account.credentials?.mobile || 'Linked'})</span>
                      </button>
                    </div>
                  )}

                  {isFamPay && (
                    <div className="mt-3 flex items-center justify-between text-[11px] rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        <span>{account.gmailConnected ? 'Gmail Synced' : 'FamPay Email'}</span>
                      </span>
                      <span className="text-[10px] font-bold font-mono">{account.gmailEmail || 'pankajpanks007@gmail.com'}</span>
                    </div>
                  )}

                  {isCrypto && (
                    <div className="mt-3 flex items-center justify-between text-[11px] rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-2.5 text-cyan-300 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Coins className="h-3.5 w-3.5" />
                        <span>TRC20 / Polygon</span>
                      </span>
                      <span className="text-[10px] font-bold">On-Chain</span>
                    </div>
                  )}
                </div>

                {/* Footer Bar */}
                <div className="mt-5 pt-3.5 border-t border-white/5 flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold ${
                      isActive 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      {account.status}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {account.smsCount ? `${account.smsCount} Txns` : '0 Txns'}
                    </span>
                  </div>

                  <span className="text-slate-500 font-mono">
                    {account.lastUsedAt 
                      ? `Last: ${new Date(account.lastUsedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                      : 'Standby'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg glass-panel p-6 sm:p-7 rounded-3xl border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Edit3 className="h-5 w-5 text-indigo-400" />
                <h3 className="font-bold text-base text-white">Edit Merchant Account</h3>
              </div>
              <button onClick={() => setEditingAccount(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 mt-5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Account Label</label>
                <input
                  type="text"
                  required
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">UPI ID (VPA)</label>
                <input
                  type="text"
                  required
                  value={editUpiId}
                  onChange={(e) => setEditUpiId(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Customer Display Name</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase">Traffic Routing Weight</label>
                  <span className="text-xs font-mono font-bold text-indigo-400">{editWeight}x</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={editWeight}
                  onChange={(e) => setEditWeight(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {editingAccount.provider === 'PAYTM' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Paytm MID</label>
                    <input
                      type="text"
                      value={editMid}
                      onChange={(e) => setEditMid(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Merchant Key</label>
                    <input
                      type="password"
                      value={editMerchantKey}
                      onChange={(e) => setEditMerchantKey(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {(editingAccount.provider === 'BHARATPE' || editingAccount.provider === 'FREECHARGE') && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Mobile Number</label>
                  <input
                    type="text"
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="editIntentToggle"
                  checked={editIntentEnabled}
                  onChange={(e) => setEditIntentEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="editIntentToggle" className="text-xs text-slate-300 select-none cursor-pointer">
                  Enable 1-Tap UPI Intent on Mobile
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-primary font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test QR Modal */}
      {testQrAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl text-center">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="font-bold text-sm text-white">Live Test QR Code</h3>
              <button onClick={() => setTestQrAccount(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="bg-white p-4 rounded-2xl inline-block shadow-xl mb-4">
              {testQrDataUrl ? (
                <img src={testQrDataUrl} alt="UPI QR" className="w-56 h-56 mx-auto" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400 font-mono text-xs">Generating...</div>
              )}
            </div>

            <div className="space-y-1 text-xs">
              <p className="font-bold text-white">{testQrAccount.displayName}</p>
              <p className="font-mono text-indigo-400">{testQrAccount.upiId}</p>
              <p className="text-[10px] text-slate-400 mt-2">Scan using any UPI app (GPay, PhonePe, Paytm, BHIM) to test live intent.</p>
            </div>

            <button
              onClick={() => setTestQrAccount(null)}
              className="mt-5 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* OTP Verification Modal */}
      {showOtpModal && activeOtpMerchant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-purple-500/30 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-purple-400" />
                <h3 className="font-bold text-base text-white">Sync {activeOtpMerchant.provider} Session</h3>
              </div>
              <button onClick={() => setShowOtpModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <p className="text-slate-400">
                Enter the OTP sent to <strong className="text-white font-mono">{activeOtpMerchant.credentials?.mobile || 'registered mobile'}</strong> to authenticate the live session.
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Enter 6-Digit OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 123456"
                  className="w-full text-center tracking-[0.5em] text-lg font-mono rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={isVerifyingOtp || otpInput.length < 4}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 font-bold text-white shadow-glow hover:bg-purple-500 transition disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isVerifyingOtp ? 'Verifying...' : 'Verify & Sync'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
