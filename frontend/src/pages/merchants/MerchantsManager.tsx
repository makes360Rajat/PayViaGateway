import React, { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';
import { MerchantAccount, PaymentProviderType } from '../../types';
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
  QrCode
} from 'lucide-react';

export const MerchantsManager: React.FC = () => {
  const [merchants, setMerchants] = useState<MerchantAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Merchant Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProviderType>('PAYTM');
  const [label, setLabel] = useState('');
  const [upiId, setUpiId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [weight, setWeight] = useState(1);
  const [mid, setMid] = useState('');
  const [merchantKey, setMerchantKey] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  // OTP Modal
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [activeOtpMerchant, setActiveOtpMerchant] = useState<MerchantAccount | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await ApiService.createMerchant({
      provider: selectedProvider,
      label,
      upiId,
      displayName,
      weight,
      credentials: {
        mid,
        merchantKey,
        mobile: mobileNumber
      }
    });

    if (res.status) {
      setShowAddModal(false);
      resetForm();
      loadMerchants();
    } else {
      alert(res.error || 'Failed to connect merchant');
    }
  };

  const handleToggle = async (id: string) => {
    await ApiService.toggleMerchant(id);
    loadMerchants();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to disconnect this merchant account?')) {
      await ApiService.deleteMerchant(id);
      loadMerchants();
    }
  };

  const handleSendOtp = async (account: MerchantAccount) => {
    setActiveOtpMerchant(account);
    setShowOtpModal(true);
    await ApiService.sendMerchantOtp(account.id, account.credentials?.mobile);
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
      alert('Merchant account verified and live session connected!');
    } else {
      alert(res.error || 'OTP verification failed');
    }
  };

  const resetForm = () => {
    setLabel('');
    setUpiId('');
    setDisplayName('');
    setWeight(1);
    setMid('');
    setMerchantKey('');
    setMobileNumber('');
  };

  const providers = [
    { id: 'PAYTM', name: 'Paytm Business', desc: 'Direct status query API via MID', color: 'from-blue-600 to-indigo-600' },
    { id: 'BHARATPE', name: 'BharatPe Merchant', desc: 'OTP session & live QR scanner', color: 'from-purple-600 to-pink-600' },
    { id: 'FAMPAY', name: 'FamPay (Gmail)', desc: 'Instant email alert parser', color: 'from-yellow-500 to-orange-500' },
    { id: 'CUSTOM_UPI', name: 'Custom UPI (SMS App)', desc: 'Android SMS Gateway sync', color: 'from-emerald-600 to-teal-600' },
    { id: 'FREECHARGE', name: 'Freecharge OTP', desc: 'Auto-verify via comment & OTP', color: 'from-rose-600 to-red-600' },
    { id: 'CRYPTO', name: 'Crypto USDT/USDC', desc: 'TRC20, Polygon & BSC on-chain', color: 'from-teal-600 to-cyan-600' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white">Connected Merchant Accounts</h1>
            <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 text-xs font-mono text-indigo-400">
              {merchants.length} Connected
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Incoming orders rotate dynamically across active accounts according to their weight.
          </p>
        </div>

        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-primary px-4 py-2.5 text-xs font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Connect Merchant Account</span>
        </button>
      </div>

      {/* Grid of Merchant Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {merchants.map((account) => {
          const isBharatPeOrFreecharge = account.provider === 'BHARATPE' || account.provider === 'FREECHARGE';
          const isFamPay = account.provider === 'FAMPAY';

          return (
            <div 
              key={account.id} 
              className={`glass-card p-5 rounded-2xl border transition-all ${
                account.status === 'ACTIVE' 
                  ? 'border-indigo-500/20 hover:border-indigo-500/40' 
                  : 'border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center font-bold text-white shadow-glow text-xs">
                    {account.provider.slice(0, 3)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{account.label}</h3>
                    <span className="text-[10px] font-mono text-slate-400">{account.provider}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggle(account.id)}
                    title={account.status === 'ACTIVE' ? 'Pause Account' : 'Resume Account'}
                    className={`rounded-lg p-1.5 transition ${
                      account.status === 'ACTIVE' 
                        ? 'text-amber-400 hover:bg-amber-500/10' 
                        : 'text-emerald-400 hover:bg-emerald-500/10'
                    }`}
                  >
                    {account.status === 'ACTIVE' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
                    title="Disconnect Account"
                    className="rounded-lg p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* VPA / Credentials Info */}
              <div className="mt-4 rounded-xl bg-slate-900/60 p-3 border border-white/5 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">UPI VPA:</span>
                  <span className="text-slate-200 font-semibold truncate max-w-[160px]">{account.upiId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Routing Weight:</span>
                  <span className="text-indigo-400 font-bold">{account.weight}x</span>
                </div>
                {account.smsCount !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">SMS / Matched:</span>
                    <span className="text-emerald-400">{account.smsCount} Txns</span>
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
                    <span>Sync Session with OTP</span>
                  </button>
                </div>
              )}

              {isFamPay && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] rounded-xl bg-amber-500/10 border border-amber-500/20 p-2 text-amber-300">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{account.gmailConnected ? 'Gmail Synced' : 'Needs Gmail'}</span>
                    </span>
                    <span className="text-[10px] font-bold">{account.gmailEmail || 'Linked'}</span>
                  </div>
                </div>
              )}

              {/* Status footer */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px]">
                <span className={`inline-flex rounded-full px-2 py-0.5 font-bold ${
                  account.status === 'ACTIVE' 
                    ? 'bg-emerald-500/10 text-emerald-400' 
                    : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {account.status}
                </span>
                <span className="text-slate-500 font-mono">
                  {account.lastUsedAt ? `Last order: ${new Date(account.lastUsedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Ready'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h2 className="font-bold text-base text-white">Connect Payment Account</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Provider Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {providers.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProvider(p.id as PaymentProviderType)}
                      className={`p-2 rounded-xl border text-center font-bold text-[11px] transition ${
                        selectedProvider === p.id 
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-glow' 
                          : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Account Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Store North Paytm"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">UPI ID / VPA</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. yourshop@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Display Name</label>
                  <input
                    type="text"
                    placeholder="e.g. My Store"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Rotation Weight (1-10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={weight}
                    onChange={(e) => setWeight(parseInt(e.target.value) || 1)}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {selectedProvider === 'PAYTM' && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Paytm MID</label>
                    <input
                      type="text"
                      placeholder="PAYTM_MID_123"
                      value={mid}
                      onChange={(e) => setMid(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Merchant Key</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={merchantKey}
                      onChange={(e) => setMerchantKey(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {(selectedProvider === 'BHARATPE' || selectedProvider === 'FREECHARGE') && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Account Mobile Number</label>
                  <input
                    type="text"
                    placeholder="9876543210"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white font-mono"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-primary px-5 py-2 font-bold text-white shadow-glow hover:brightness-110"
                >
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OTP Verification Modal */}
      {showOtpModal && activeOtpMerchant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm glass-panel p-6 rounded-3xl border border-purple-500/30 shadow-2xl text-center">
            <Smartphone className="mx-auto h-10 w-10 text-purple-400 mb-2" />
            <h3 className="font-bold text-base text-white">Enter {activeOtpMerchant.provider} OTP</h3>
            <p className="text-xs text-slate-400 mt-1">
              An authentication OTP has been sent to your registered mobile number.
            </p>

            <div className="my-4">
              <input
                type="text"
                maxLength={6}
                placeholder="• • • • • •"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                className="w-full text-center text-xl tracking-widest font-mono rounded-xl bg-slate-900 border border-purple-500/30 px-3 py-2.5 text-white focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowOtpModal(false)}
                className="w-1/2 rounded-xl py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyOtp}
                disabled={isVerifyingOtp || !otpInput}
                className="w-1/2 rounded-xl bg-purple-600 hover:bg-purple-500 py-2 text-xs font-bold text-white shadow-glow disabled:opacity-50"
              >
                {isVerifyingOtp ? 'Verifying...' : 'Authenticate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
