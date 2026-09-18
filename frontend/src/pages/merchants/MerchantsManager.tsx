import React, { useEffect, useState, useMemo } from 'react';
import { ApiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
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
  X,
  Zap,
  Radio,
  ArrowUpRight,
  Lock,
  ChevronRight,
  TrendingUp,
  Download
} from 'lucide-react';

interface ProviderConfig {
  id: PaymentProviderType;
  name: string;
  badge: string;
  tagline: string;
  accentColor: string;
  textColor: string;
  bgGradient: string;
  cardBorder: string;
  shadowGlow: string;
  iconInitials: string;
  supportedFields: string[];
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'PAYTM',
    name: 'Paytm Business',
    badge: 'Direct MID API',
    tagline: 'Direct settlement via Paytm Business merchant MID & Key',
    accentColor: '#00BAF2',
    textColor: 'text-sky-400',
    bgGradient: 'from-[#00BAF2]/20 via-[#002970]/20 to-transparent',
    cardBorder: 'border-sky-500/30 hover:border-sky-400/60',
    shadowGlow: 'shadow-[0_0_25px_rgba(0,186,242,0.15)]',
    iconInitials: 'PT',
    supportedFields: ['mid', 'merchantKey', 'upiId', 'displayName']
  },
  {
    id: 'BHARATPE',
    name: 'BharatPe Merchant',
    badge: 'Dynamic QR & OTP',
    tagline: 'Live merchant QR session syncing via mobile OTP',
    accentColor: '#5F259F',
    textColor: 'text-purple-400',
    bgGradient: 'from-[#5F259F]/25 via-fuchsia-600/15 to-transparent',
    cardBorder: 'border-purple-500/30 hover:border-purple-400/60',
    shadowGlow: 'shadow-[0_0_25px_rgba(147,51,234,0.15)]',
    iconInitials: 'BP',
    supportedFields: ['mobile', 'merchantId', 'upiId', 'displayName']
  },
  {
    id: 'FAMPAY',
    name: 'FamPay (Gmail Sync)',
    badge: 'Email Alert Sync',
    tagline: 'Instant settlement detection via FamPay receipt emails',
    accentColor: '#F59E0B',
    textColor: 'text-amber-400',
    bgGradient: 'from-amber-500/25 via-orange-600/15 to-transparent',
    cardBorder: 'border-amber-500/30 hover:border-amber-400/60',
    shadowGlow: 'shadow-[0_0_25px_rgba(245,158,11,0.15)]',
    iconInitials: 'FP',
    supportedFields: ['gmailEmail', 'upiId', 'displayName']
  },
  {
    id: 'CUSTOM_UPI',
    name: 'Custom UPI Gateway',
    badge: 'Companion App SMS',
    tagline: 'Direct UPI VPA with 24/7 background bank SMS sensing',
    accentColor: '#10B981',
    textColor: 'text-emerald-400',
    bgGradient: 'from-emerald-500/25 via-teal-600/15 to-transparent',
    cardBorder: 'border-emerald-500/30 hover:border-emerald-400/60',
    shadowGlow: 'shadow-[0_0_25px_rgba(16,185,129,0.15)]',
    iconInitials: 'UPI',
    supportedFields: ['upiId', 'displayName']
  },
  {
    id: 'FREECHARGE',
    name: 'Freecharge Business',
    badge: 'Auto OTP Tracking',
    tagline: 'Comment-based payment tracking and automated OTP verification',
    accentColor: '#F43F5E',
    textColor: 'text-rose-400',
    bgGradient: 'from-rose-500/25 via-red-600/15 to-transparent',
    cardBorder: 'border-rose-500/30 hover:border-rose-400/60',
    shadowGlow: 'shadow-[0_0_25px_rgba(244,63,94,0.15)]',
    iconInitials: 'FC',
    supportedFields: ['mobile', 'upiId', 'displayName']
  },
  {
    id: 'CRYPTO',
    name: 'Crypto USDT/USDC',
    badge: 'Multi-Chain Settlement',
    tagline: 'Direct on-chain verification across TRC20, Polygon & BSC',
    accentColor: '#06B6D4',
    textColor: 'text-cyan-400',
    bgGradient: 'from-cyan-500/25 via-indigo-600/15 to-transparent',
    cardBorder: 'border-cyan-500/30 hover:border-cyan-400/60',
    shadowGlow: 'shadow-[0_0_25px_rgba(6,182,212,0.15)]',
    iconInitials: 'USDT',
    supportedFields: ['trc20', 'polygon', 'bsc']
  }
];

interface MerchantsManagerProps {
  onNavigate?: (page: string) => void;
}

export const MerchantsManager: React.FC<MerchantsManagerProps> = ({ onNavigate }) => {
  const { isPlanActive, entitlements, planUsage } = useAuth();
  const [merchants, setMerchants] = useState<MerchantAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvider, setFilterProvider] = useState<string>('ALL');
  const [showPlanModal, setShowPlanModal] = useState(false);

  // In-Page Add / Connect Modal State
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

  // Test Live QR Modal State
  const [testQrAccount, setTestQrAccount] = useState<MerchantAccount | null>(null);
  const [testQrAmount, setTestQrAmount] = useState('100.00');
  const [testQrDataUrl, setTestQrDataUrl] = useState<string>('');

  // OTP Sync Modal State (BharatPe / Freecharge)
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [activeOtpMerchant, setActiveOtpMerchant] = useState<MerchantAccount | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Copy Feedback & Toast
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
    if (!isPlanActive) {
      setShowPlanModal(true);
      return;
    }
    const provConfig = PROVIDERS.find(p => p.id === providerId);
    setBuilderProvider(providerId);
    setLabel(`${provConfig?.name || providerId} Store`);
    setUpiId(providerId === 'CRYPTO' ? 'crypto-vault' : '');
    setDisplayName('My Business');
    setWeight(1);
    setIntentEnabled(true);
    setMid('');
    setMerchantKey('');
    setMobileNumber('');
    setGmailEmail('');
    setTrc20Address('');
    setPolygonAddress('');
    setIsBuilderOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPlanActive) {
      setIsBuilderOpen(false);
      setShowPlanModal(true);
      return;
    }
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
      label: label || `${builderProvider} Account`,
      upiId: upiId || 'gateway@upi',
      displayName: displayName || label || 'Store',
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

  const generateTestQr = async (account: MerchantAccount, amountVal: string) => {
    const amt = parseFloat(amountVal) || 1.00;
    const upiUri = `upi://pay?pa=${encodeURIComponent(account.upiId)}&pn=${encodeURIComponent(account.displayName || account.label)}&am=${amt.toFixed(2)}&cu=INR&tn=PayVia_Test_Scan`;
    try {
      const qr = await QRCode.toDataURL(upiUri, { 
        width: 320, 
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setTestQrDataUrl(qr);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShowTestQr = async (account: MerchantAccount) => {
    setTestQrAccount(account);
    await generateTestQr(account, testQrAmount);
  };

  const handleCopyUpi = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendOtp = async (account: MerchantAccount) => {
    setActiveOtpMerchant(account);
    setShowOtpModal(true);
    setOtpInput('');
    const res = await ApiService.sendMerchantOtp(account.id, account.credentials?.mobile || '9876543210');
    if (res.status) {
      showToast(`📲 OTP sent to registered mobile`);
    } else {
      showToast(`❌ ${res.error || 'Failed to send OTP'}`);
    }
  };

  const handleVerifyOtp = async () => {
    if (!activeOtpMerchant || !otpInput) return;
    setIsVerifyingOtp(true);
    const res = await ApiService.verifyMerchantOtp(
      activeOtpMerchant.id,
      otpInput,
      activeOtpMerchant.credentials?.mobile || ''
    );
    setIsVerifyingOtp(false);
    if (res.status) {
      setShowOtpModal(false);
      showToast(`✓ BharatPe session refreshed & active!`);
      loadMerchants();
    } else {
      showToast(`❌ Invalid OTP or verification failed`);
    }
  };

  // Filtered merchants computation
  const filteredMerchants = useMemo(() => {
    return merchants.filter((m) => {
      const matchesSearch = 
        m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.upiId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.provider.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesProvider = filterProvider === 'ALL' || m.provider === filterProvider;
      return matchesSearch && matchesProvider;
    });
  }, [merchants, searchQuery, filterProvider]);

  // Statistics
  const activeCount = merchants.filter(m => m.status === 'ACTIVE').length;
  const totalWeight = merchants.filter(m => m.status === 'ACTIVE').reduce((sum, m) => sum + (m.weight || 1), 0);
  const intentCount = merchants.filter(m => m.intentEnabled !== false).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-2 sm:px-4 py-4">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-[#13131f] border border-purple-500/40 px-5 py-3 text-xs font-bold text-white shadow-2xl backdrop-blur-xl animate-bounce flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 relative overflow-hidden bg-gradient-to-br from-[#13131f]/90 via-[#0b0b12]/80 to-[#181028]/90 shadow-2xl">
        {/* Glowing Orbs */}
        <div className="absolute -top-16 -right-16 w-80 h-80 bg-purple-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-sky-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-gradient-primary flex items-center justify-center text-white shadow-glow">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Connected Merchant Accounts
                </h1>
              </div>
            </div>

            {/* Live Metrics Chips */}
            <div className="pt-2 flex flex-wrap items-center gap-2.5 text-xs font-mono">
              <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-slate-300 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-400" />
                <strong className="text-white">{merchants.length}</strong> Total Routes
              </span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-emerald-400 flex items-center gap-1.5 font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <strong className="text-white">{activeCount}</strong> Live In Rotation
              </span>
              <span className="rounded-full bg-sky-500/10 border border-sky-500/30 px-3 py-1 text-sky-400 flex items-center gap-1.5">
                <strong className="text-white">{totalWeight}w</strong> Weighted Capacity
              </span>
              <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-amber-400 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                <strong className="text-white">{intentCount}</strong> Direct Intent Enabled
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={loadMerchants}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition active:scale-95"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => handleStartAddProvider('PAYTM')}
              className="flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-xs font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Connect Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Plan Required Warning Banner (Free Test Mode) */}
      {!isPlanActive && (
        <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-[#181624] to-[#0d0f1a] p-6 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-[0_0_35px_rgba(245,158,11,0.12)]">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 shadow-sm">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="font-display text-base font-bold text-amber-300">
                  Active Subscription Plan Required to Receive Live Payments
                </h3>
                <span className="text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-amber-400 text-black">
                  ✦ FREE TEST MODE
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                Your gateway account is currently running in Free Test Mode (allowance: 
                <strong className="text-amber-300 font-mono ml-1 mr-1">{entitlements?.testOrdersUsed ?? planUsage?.used ?? 0} / {entitlements?.testOrdersMax ?? planUsage?.limit ?? 5} test orders used</strong>).
                Connecting live merchant accounts (Paytm, BharatPe, FamPay, Custom UPI, etc.) to receive real customer payments requires upgrading to an active gateway subscription plan.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate ? onNavigate('plans') : (window.location.href = '#plans')}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:brightness-110 text-black px-6 py-3 text-xs font-bold transition active:scale-95 shadow-glow-amber shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            <span>Upgrade Plan Now</span>
          </button>
        </div>
      )}

      {/* Provider Hub: Vibrant Category Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-400" />
            <span>Supported Gateways & Channels</span>
          </h2>
          <span className="text-xs text-slate-400">Click &apos;+ Add&apos; on any provider to link your credentials</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROVIDERS.map((prov) => {
            const connectedList = merchants.filter(m => m.provider === prov.id);
            const activeList = connectedList.filter(m => m.status === 'ACTIVE');

            return (
              <div
                key={prov.id}
                className={`rounded-2xl border ${prov.cardBorder} bg-gradient-to-br ${prov.bgGradient} p-5 backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between ${prov.shadowGlow}`}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-12 w-12 rounded-2xl flex items-center justify-center font-extrabold text-sm text-white shadow-md font-mono"
                        style={{ background: prov.accentColor }}
                      >
                        {prov.iconInitials}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                          <span>{prov.name}</span>
                        </h3>
                        <span className={`inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border bg-black/40 ${prov.textColor} border-white/10 mt-0.5`}>
                          {prov.badge}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartAddProvider(prov.id)}
                      className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold text-white border border-white/15 transition active:scale-95 shadow-sm"
                    >
                      + Add
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-slate-300 leading-relaxed min-h-[36px]">
                    {prov.tagline}
                  </p>
                </div>

                {/* Bottom Channel Status */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${connectedList.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                    <span className="font-medium text-slate-300 text-[11px]">
                      {connectedList.length === 0 ? 'No accounts connected' : `${connectedList.length} linked (${activeList.length} active)`}
                    </span>
                  </div>

                  {connectedList.length > 0 && (
                    <button
                      onClick={() => setFilterProvider(prov.id)}
                      className={`text-[11px] font-semibold ${prov.textColor} hover:underline flex items-center gap-0.5`}
                    >
                      <span>View</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Accounts Section */}
      <div className="space-y-4">
        
        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-panel p-4 rounded-2xl border border-white/5">
          
          {/* Provider Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterProvider('ALL')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                filterProvider === 'ALL'
                  ? 'bg-gradient-primary text-white shadow-glow'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              All Accounts ({merchants.length})
            </button>

            {PROVIDERS.map((p) => {
              const count = merchants.filter(m => m.provider === p.id).length;
              if (count === 0 && filterProvider !== p.id) return null;
              const isSelected = filterProvider === p.id;

              return (
                <button
                  key={p.id}
                  onClick={() => setFilterProvider(p.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-glow'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.accentColor }} />
                  <span>{p.name.split(' ')[0]} ({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by label, UPI ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-slate-900/90 border border-white/10 pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Accounts Grid */}
        {filteredMerchants.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl border border-white/5 text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
              <Wallet className="h-7 w-7" />
            </div>
            <h3 className="font-bold text-base text-white">No Merchant Accounts Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {searchQuery || filterProvider !== 'ALL'
                ? 'No merchant accounts match your current filter or search criteria.'
                : 'Connect your first Paytm, BharatPe, FamPay, Freecharge, or Custom UPI account to start processing direct settlements.'}
            </p>
            <button
              onClick={() => handleStartAddProvider('PAYTM')}
              className="rounded-xl bg-gradient-primary px-5 py-2 text-xs font-bold text-white shadow-glow hover:brightness-110 transition"
            >
              + Connect First Merchant
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMerchants.map((account) => {
              const prov = PROVIDERS.find(p => p.id === account.provider) || PROVIDERS[3];
              const isActive = account.status === 'ACTIVE';

              return (
                <div
                  key={account.id}
                  className={`rounded-3xl border p-5 backdrop-blur-xl transition-all duration-300 relative flex flex-col justify-between ${
                    isActive
                      ? `${prov.cardBorder} bg-[#13131f]/90 ${prov.shadowGlow}`
                      : 'border-white/5 bg-[#0e0e17]/60 opacity-70'
                  }`}
                >
                  <div>
                    
                    {/* Card Top: Avatar, Label, Status Toggle */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="h-12 w-12 rounded-2xl flex items-center justify-center text-white font-mono font-bold text-sm shadow-md shrink-0"
                          style={{ background: prov.accentColor }}
                        >
                          {prov.iconInitials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-sm text-white truncate max-w-[140px]">{account.label}</h3>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-mono font-semibold ${prov.textColor}`}>
                              {prov.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Toggle Switch */}
                      <button
                        onClick={() => handleToggle(account)}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-mono font-bold flex items-center gap-1 transition ${
                          isActive
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                            : 'bg-slate-800 border border-white/10 text-slate-400'
                        }`}
                        title={isActive ? 'Click to Pause' : 'Click to Activate'}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                        <span>{isActive ? 'ACTIVE' : 'PAUSED'}</span>
                      </button>
                    </div>

                    {/* UPI ID Pill with 1-Click Copy */}
                    <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-xs font-mono">
                      <span className="text-slate-300 truncate font-semibold">{account.upiId}</span>
                      <button
                        onClick={() => handleCopyUpi(account.upiId, account.id)}
                        className="text-purple-400 hover:text-purple-300 shrink-0 flex items-center gap-1"
                        title="Copy UPI VPA"
                      >
                        {copiedId === account.id ? (
                          <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-0.5">
                            <Check className="h-3 w-3" /> Copied
                          </span>
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Weight & Intent Badge */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-xl bg-white/5 p-2 border border-white/5">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Routing Weight</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-bold text-white font-mono text-xs">w{account.weight || 1}</span>
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                              style={{ width: `${Math.min(100, ((account.weight || 1) / 10) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl bg-white/5 p-2 border border-white/5">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Direct Intent</span>
                        <span className={`text-xs font-bold font-mono ${account.intentEnabled !== false ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {account.intentEnabled !== false ? '⚡ ENABLED' : 'DISABLED'}
                        </span>
                      </div>
                    </div>

                    {/* Specific Provider Metadata */}
                    {account.provider === 'PAYTM' && account.credentials?.mid && (
                      <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                        MID: <span className="text-sky-300">{account.credentials.mid}</span>
                      </div>
                    )}
                    {account.provider === 'BHARATPE' && account.credentials?.mobile && (
                      <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                        <span>Mobile: {account.credentials.mobile}</span>
                        <button
                          onClick={() => handleSendOtp(account)}
                          className="text-purple-400 hover:text-purple-300 font-bold underline"
                        >
                          Sync OTP
                        </button>
                      </div>
                    )}
                    {account.provider === 'FAMPAY' && account.credentials?.gmailEmail && (
                      <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                        Gmail: <span className="text-amber-300">{account.credentials.gmailEmail}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleShowTestQr(account)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-purple-500/10 border border-purple-500/25 py-2 text-xs font-bold text-purple-300 hover:bg-purple-500/20 hover:text-white transition"
                    >
                      <QrCode className="h-3.5 w-3.5 text-purple-400" />
                      <span>Test QR</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(account)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition"
                      title="Edit Account Details"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(account)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition"
                      title="Disconnect Account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* ADD / CONNECT MERCHANT DRAWER / MODAL */}
      {/* ==================================================================== */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-[#13131f] border border-purple-500/30 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-primary flex items-center justify-center text-white shadow-glow">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">Connect Merchant Account</h3>
                  <p className="text-xs text-slate-400">Add a new UPI or Crypto settlement channel into live rotation</p>
                </div>
              </div>
              <button
                onClick={() => setIsBuilderOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Provider Selector Cards */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Select Gateway Provider
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PROVIDERS.map((p) => {
                  const isSelected = builderProvider === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setBuilderProvider(p.id)}
                      className={`rounded-2xl border p-3 text-left transition flex items-center gap-2.5 ${
                        isSelected
                          ? `${p.cardBorder} bg-gradient-to-br ${p.bgGradient} ring-1 ring-purple-500/50 shadow-glow`
                          : 'border-white/10 bg-[#0b0b12]/60 hover:bg-white/5'
                      }`}
                    >
                      <div 
                        className="h-8 w-8 rounded-xl flex items-center justify-center text-white font-mono font-bold text-xs shrink-0"
                        style={{ background: p.accentColor }}
                      >
                        {p.iconInitials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{p.name.split(' ')[0]}</div>
                        <div className="text-[9px] text-slate-400 truncate">{p.badge.split(' ')[0]}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Account Label</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Primary Paytm Store"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">UPI VPA Address</label>
                  <input
                    type="text"
                    required={builderProvider !== 'CRYPTO'}
                    placeholder="merchant@paytm / business@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Business Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Superstore"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Load Balancing Weight (1-10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Provider Specific Credential Inputs */}
              {builderProvider === 'PAYTM' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Paytm Merchant ID (MID)</label>
                    <input
                      type="text"
                      placeholder="e.g. PAYTM_MID_12345"
                      value={mid}
                      onChange={(e) => setMid(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Merchant Key</label>
                    <input
                      type="password"
                      placeholder="e.g. Paytm Production Key"
                      value={merchantKey}
                      onChange={(e) => setMerchantKey(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {(builderProvider === 'BHARATPE' || builderProvider === 'FREECHARGE') && (
                <div className="pt-2 border-t border-white/10">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Registered Mobile Number</label>
                  <input
                    type="text"
                    placeholder="9876543210"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>
              )}

              {builderProvider === 'FAMPAY' && (
                <div className="pt-2 border-t border-white/10">
                  <label className="block text-xs font-medium text-slate-400 mb-1">FamPay Linked Gmail Email</label>
                  <input
                    type="email"
                    placeholder="youraccount@gmail.com"
                    value={gmailEmail}
                    onChange={(e) => setGmailEmail(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              )}

              {builderProvider === 'CRYPTO' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">USDT TRC20 Address</label>
                    <input
                      type="text"
                      placeholder="TX9Q8yJz42mN8K9vP2bQw5R1t7YmU3x8Zb"
                      value={trc20Address}
                      onChange={(e) => setTrc20Address(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Polygon USDC/USDT Address</label>
                    <input
                      type="text"
                      placeholder="0x71C2a8B998E1f0E389aDe1b9319B1484C3F6e9A0"
                      value={polygonAddress}
                      onChange={(e) => setPolygonAddress(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Direct Intent Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <span className="text-xs font-bold text-white block">Direct Intent Routing</span>
                  <span className="text-[10px] text-slate-400">Trigger GPay, PhonePe, Paytm apps directly on customer mobile devices</span>
                </div>
                <input
                  type="checkbox"
                  checked={intentEnabled}
                  onChange={(e) => setIntentEnabled(e.target.checked)}
                  className="h-4 w-4 rounded bg-slate-800 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsBuilderOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-gradient-primary px-6 py-2.5 text-xs font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Connecting...' : 'Connect & Activate Route'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* EDIT MERCHANT MODAL */}
      {/* ==================================================================== */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#13131f] border border-purple-500/30 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-base text-white">Edit Account: {editingAccount.label}</h3>
              <button onClick={() => setEditingAccount(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Label</label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">UPI ID</label>
                <input
                  type="text"
                  value={editUpiId}
                  onChange={(e) => setEditUpiId(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Routing Weight (1-10)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={editWeight}
                  onChange={(e) => setEditWeight(Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="rounded-xl px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-primary px-5 py-2 font-bold text-white shadow-glow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TEST LIVE QR MODAL */}
      {/* ==================================================================== */}
      {testQrAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#13131f] border border-purple-500/30 p-6 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="text-left">
                <h3 className="font-bold text-sm text-white">Test QR: {testQrAccount.label}</h3>
                <p className="text-[11px] text-slate-400">{testQrAccount.upiId}</p>
              </div>
              <button onClick={() => setTestQrAccount(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Amount Selector */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 block font-medium">Test Amount (INR)</span>
              <div className="flex items-center justify-center gap-2">
                {['1.00', '10.00', '100.00', '499.00'].map((val) => (
                  <button
                    key={val}
                    onClick={() => {
                      setTestQrAmount(val);
                      generateTestQr(testQrAccount, val);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition ${
                      testQrAmount === val
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    ₹{val}
                  </button>
                ))}
              </div>
            </div>

            {/* QR Code Canvas */}
            <div className="p-3 bg-white rounded-2xl mx-auto w-fit shadow-xl border-2 border-slate-200">
              {testQrDataUrl ? (
                <img src={testQrDataUrl} alt="UPI QR" className="h-48 w-48 rounded-lg object-contain" />
              ) : (
                <div className="h-48 w-48 flex items-center justify-center text-slate-400 text-xs">Generating QR...</div>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              Scan with GPay, PhonePe, Paytm or BHIM to verify live routing.
            </p>

            <button
              onClick={() => setTestQrAccount(null)}
              className="w-full rounded-xl bg-white/10 hover:bg-white/15 py-2.5 text-xs font-bold text-white transition"
            >
              Close Test
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* OTP VERIFY MODAL (BharatPe) */}
      {/* ==================================================================== */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#13131f] border border-purple-500/30 p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-white">Enter BharatPe OTP</h3>
            <p className="text-xs text-slate-400">Enter the 6-digit OTP sent to your registered mobile number.</p>
            <input
              type="text"
              maxLength={6}
              placeholder="123456"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-center text-lg font-mono text-white tracking-widest"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowOtpModal(false)} className="px-3 py-1.5 text-xs text-slate-400">Cancel</button>
              <button
                onClick={handleVerifyOtp}
                disabled={isVerifyingOtp || otpInput.length < 4}
                className="rounded-xl bg-gradient-primary px-4 py-1.5 text-xs font-bold text-white"
              >
                {isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ACTIVE PLAN REQUIRED MODAL */}
      {/* ==================================================================== */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[#121324] border border-amber-500/40 p-6 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.25)] space-y-5 text-center relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/20 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="h-16 w-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 mx-auto flex items-center justify-center text-amber-400 shadow-glow-amber">
              <Lock className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono font-extrabold px-3 py-1 rounded-full bg-amber-400 text-black inline-block uppercase tracking-wider">
                ✦ Active Plan Required
              </span>
              <h3 className="font-display text-xl sm:text-2xl font-black text-white">
                Unlock Live Payment Accounts
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                Connecting Paytm, BharatPe, FamPay, Freecharge, or Custom UPI accounts to collect real customer money requires an active subscription.
              </p>
            </div>

            {/* Test Quota Summary */}
            <div className="rounded-2xl bg-black/40 border border-white/10 p-4 text-left space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Current Mode:</span>
                <span className="font-bold text-amber-300">Free Test Mode</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Free Test Orders:</span>
                <span className="font-bold text-white">
                  {entitlements?.testOrdersUsed ?? planUsage?.used ?? 0} / {entitlements?.testOrdersMax ?? planUsage?.limit ?? 5} Used
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-400 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round(((entitlements?.testOrdersUsed ?? planUsage?.used ?? 0) / (entitlements?.testOrdersMax ?? planUsage?.limit ?? 5)) * 100))}%`
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={() => {
                  setShowPlanModal(false);
                  if (onNavigate) onNavigate('plans');
                }}
                className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 hover:brightness-110 text-black py-3 text-xs font-black shadow-glow-amber transition active:scale-95 flex items-center justify-center gap-2 tracking-wide"
              >
                <Sparkles className="h-4 w-4" />
                <span>View Plans & Upgrade Now →</span>
              </button>
              <button
                onClick={() => setShowPlanModal(false)}
                className="w-full rounded-xl bg-white/5 hover:bg-white/10 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Stay in Test Mode
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
