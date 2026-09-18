import React, { useEffect, useState, useRef } from 'react';
import { ApiService } from '../../services/api';
import { Plan, TenantSubscription } from '../../types';
import { useAuth } from '../../context/AuthContext';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { 
  CreditCard, 
  Sparkles, 
  Check, 
  ShieldCheck, 
  Zap, 
  Star,
  CheckCircle2, 
  Clock, 
  QrCode, 
  Smartphone, 
  ArrowRight, 
  X, 
  AlertTriangle, 
  Lock,
  Copy,
  ExternalLink,
  Loader2,
  Radio
} from 'lucide-react';

interface PlansPricingProps {
  onNavigate?: (page: string) => void;
}

export const PlansPricing: React.FC<PlansPricingProps> = ({ onNavigate }) => {
  const { user, subscription, refreshProfile } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSub, setCurrentSub] = useState<TenantSubscription | null>(null);
  const [usage, setUsage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Purchase & Payment Modal State
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<Plan | null>(null);
  const [purchaseOrder, setPurchaseOrder] = useState<any | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isInitiating, setIsInitiating] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [manualUtr, setManualUtr] = useState('');
  const [isSubmittingUtr, setIsSubmittingUtr] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrError, setUtrError] = useState('');

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isSubActive = user?.role === 'SUPER_ADMIN' || subscription?.status === 'ACTIVE';

  const loadPlans = async () => {
    setIsLoading(true);
    const [plansRes, currentRes] = await Promise.all([
      ApiService.getPlans(),
      ApiService.getCurrentSubscription()
    ]);

    if (plansRes.status && plansRes.data) setPlans(plansRes.data);
    if (currentRes.status && currentRes.data) {
      setCurrentSub(currentRes.data.subscription);
      setUsage(currentRes.data.usage);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadPlans();
    return () => {
      stopPolling();
    };
  }, []);

  const stopPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  const handleOpenPayment = async (plan: Plan) => {
    setSelectedPlanForPayment(plan);
    setPaymentSuccess(false);
    setPurchaseOrder(null);
    setQrDataUrl('');
    setManualUtr('');
    setUtrError('');
    setIsInitiating(true);

    try {
      const res = await ApiService.initiatePlanPurchase(plan.id);
      setIsInitiating(false);

      if (!res.status) {
        alert(res.error || 'Failed to create subscription order');
        setSelectedPlanForPayment(null);
        return;
      }

      // Check if Super Admin bypass or already settled
      if (res.data.isPlanActive && res.data.isSettled) {
        setPaymentSuccess(true);
        try {
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        } catch (e) {}
        await refreshProfile();
        await loadPlans();
        setTimeout(() => {
          setSelectedPlanForPayment(null);
          if (onNavigate) onNavigate('dashboard');
        }, 1800);
        return;
      }

      const orderData = res.data;
      setPurchaseOrder(orderData);

      // Generate QR Code with UPI intent URL
      const qrTarget = orderData.upiIntentUrl || orderData.paymentUrl;
      const qr = await QRCode.toDataURL(qrTarget, {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
      setQrDataUrl(qr);

      // Start Polling for Settlement (Companion App SMS detection or manual verify)
      startPolling(orderData.orderId, orderData.linkToken, plan);
    } catch (e: any) {
      setIsInitiating(false);
      alert(e.message || 'Error initiating plan purchase');
      setSelectedPlanForPayment(null);
    }
  };

  const startPolling = (orderId: string, token: string, plan: Plan) => {
    stopPolling();
    pollingTimerRef.current = setInterval(async () => {
      try {
        const res = await ApiService.checkPlanPurchaseStatus(orderId, token);
        if (res.status && res.data && (res.data.isSettled || res.data.isPlanActive)) {
          stopPolling();
          setPaymentSuccess(true);
          try {
            confetti({ particleCount: 160, spread: 85, origin: { y: 0.55 } });
          } catch (e) {}
          await refreshProfile();
          await loadPlans();
          setTimeout(() => {
            setSelectedPlanForPayment(null);
            if (onNavigate) onNavigate('dashboard');
          }, 2400);
        }
      } catch (err) {
        console.warn('Subscription status poll error:', err);
      }
    }, 2500);
  };

  const handleCopyUpi = () => {
    if (!purchaseOrder?.upiId) return;
    navigator.clipboard.writeText(purchaseOrder.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseOrder) return;
    const cleanUtr = manualUtr.trim().replace(/\D/g, '');
    if (cleanUtr.length !== 12) {
      setUtrError('Please enter a valid 12-digit UPI / UTR reference number');
      return;
    }

    setUtrError('');
    setIsSubmittingUtr(true);
    try {
      const res = await ApiService.submitManualUtr(purchaseOrder.linkToken, cleanUtr);
      setIsSubmittingUtr(false);
      if (res.status) {
        // Immediate check
        const poll = await ApiService.checkPlanPurchaseStatus(purchaseOrder.orderId, purchaseOrder.linkToken);
        if (poll.status && poll.data && (poll.data.isSettled || poll.data.isPlanActive)) {
          stopPolling();
          setPaymentSuccess(true);
          try {
            confetti({ particleCount: 160, spread: 85, origin: { y: 0.55 } });
          } catch (e) {}
          await refreshProfile();
          await loadPlans();
          setTimeout(() => {
            setSelectedPlanForPayment(null);
            if (onNavigate) onNavigate('dashboard');
          }, 2400);
        }
      } else {
        setUtrError(res.error || 'Failed to verify UTR. Please ensure payment was transferred.');
      }
    } catch (err: any) {
      setIsSubmittingUtr(false);
      setUtrError(err.message || 'Error submitting UTR');
    }
  };

  const handleCloseModal = () => {
    stopPolling();
    setSelectedPlanForPayment(null);
    setPurchaseOrder(null);
    setPaymentSuccess(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Pending Activation Onboarding Banner */}
      {!isSubActive && user && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-emerald-500/20 p-5 shadow-glow-amber">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-500/20 p-2 text-amber-400 border border-amber-500/30 shrink-0">
                <AlertTriangle className="h-5 w-5 animate-bounce" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-white">
                  Welcome to PayVia360! Select & Activate a Plan to Start
                </h3>
                <p className="text-xs text-amber-200/90 mt-0.5 leading-relaxed">
                  Your account is in Free Test Mode (5 test orders allowed). Choose a subscription plan below to unlock automated direct UPI settlement routing, companion app SMS gateway, and production live payment links.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-[11px] font-mono font-bold text-amber-300 shrink-0 self-start sm:self-auto">
              PAY-FIRST ACTIVATION
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white">Subscription Plans & Quota</h1>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-mono text-emerald-400">
              0% Gateway Commissions
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Select the plan matching your business volume. Subscription payments route securely to the platform Super Admin to activate instant production credentials.
          </p>
        </div>
      </div>

      {/* Current Quota Usage Bar (if active) */}
      {isSubActive && usage && (
        <div className="glass-panel p-6 rounded-3xl border border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase">Daily Orders Quota</span>
            <div className="text-xl font-bold text-white font-mono">
              {usage.ordersToday} / {usage.ordersMax}
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-500 h-full rounded-full" 
                style={{ width: `${Math.min(100, (usage.ordersToday / (usage.ordersMax || 1)) * 100)}%` }} 
              />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase">Connected Merchants</span>
            <div className="text-xl font-bold text-white font-mono">
              {usage.merchantsUsed} / {usage.merchantsMax}
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-purple-500 h-full rounded-full" 
                style={{ width: `${Math.min(100, (usage.merchantsUsed / (usage.merchantsMax || 1)) * 100)}%` }} 
              />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase">Active API Keys</span>
            <div className="text-xl font-bold text-white font-mono">
              {usage.apiKeysUsed} / {usage.apiKeysMax}
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-pink-500 h-full rounded-full" 
                style={{ width: `${Math.min(100, (usage.apiKeysUsed / (usage.apiKeysMax || 1)) * 100)}%` }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isCurrent = isSubActive && user?.planId === p.id;
          const isStarter = p.id === 'plan_starter';
          const isPro = p.id === 'plan_pro';
          const isVip = p.id === 'plan_unlimited';

          return (
            <div
              key={p.id}
              className={`glass-panel p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between relative overflow-hidden group ${
                isCurrent 
                  ? 'border-emerald-500/50 shadow-glow bg-[#0b261d]/80' 
                  : isPro
                  ? 'border-amber-500/40 shadow-glow-amber bg-[#12231c]/60 hover:scale-[1.02]'
                  : 'border-white/5 hover:border-emerald-500/30 hover:scale-[1.01]'
              }`}
            >
              {isPro && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-400 to-amber-500 text-black font-extrabold text-[10px] px-3 py-1 rounded-bl-xl uppercase tracking-wider font-mono">
                  Recommended
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display font-bold text-xl text-white">{p.name} Plan</span>
                </div>

                <p className="text-xs text-slate-400 min-h-[32px]">
                  {isStarter && "Essential direct UPI gateway for early-stage stores and individual sellers."}
                  {isPro && "High-velocity rotating gateway with automated UTR detection and webhooks."}
                  {isVip && "Maximum scale multi-merchant cluster with dedicated settlement queues."}
                </p>

                <div className="flex items-baseline gap-1 my-5 pt-3 border-t border-white/5">
                  <span className="text-3xl font-extrabold font-display text-white">₹{p.price.toFixed(0)}</span>
                  <span className="text-xs text-slate-400 font-medium">/ {p.validityDays} Days</span>
                </div>

                <ul className="space-y-3 text-xs text-slate-300 my-6">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span><strong>{p.maxMerchantAccounts}</strong> Connected Merchant Accounts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span><strong>{p.maxOrdersPerDay.toLocaleString()}</strong> Orders per day</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span><strong>{p.maxApiKeys}</strong> Scoped API Keys</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>All 10 Hosted Checkout Templates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Signed Webhook Callbacks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Android SMS & Notification Gateway App</span>
                  </li>
                  {p.features?.crypto && (
                    <li className="flex items-center gap-2 text-indigo-300 font-semibold">
                      <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span>Crypto (USDT / USDC) Multi-Chain</span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="pt-4 border-t border-white/10">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full rounded-xl bg-emerald-500/20 border border-emerald-500/40 py-3 text-xs font-bold text-emerald-300 cursor-default flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Active Plan</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenPayment(p)}
                    className="w-full rounded-xl bg-gradient-primary py-3 text-xs font-extrabold text-black shadow-glow hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    <span>{isSubActive ? `Upgrade to ${p.name} →` : `Select & Activate ${p.name} →`}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Plan Payment & Instant Activation Modal */}
      {selectedPlanForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-emerald-500/30 bg-[#061410] p-6 sm:p-8 shadow-2xl space-y-6">
            
            {/* Close Button */}
            {!paymentSuccess && (
              <button
                onClick={handleCloseModal}
                className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {paymentSuccess ? (
              <div className="py-8 text-center space-y-4 animate-in zoom-in-95 duration-300">
                <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-glow">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h3 className="font-display text-2xl font-extrabold text-white">
                  🎉 Payment Verified & Plan Activated!
                </h3>
                <p className="text-xs text-emerald-200/90 max-w-sm mx-auto leading-relaxed">
                  Super Admin successfully received <strong>₹{selectedPlanForPayment.price.toFixed(2)}</strong>. Your <strong>{selectedPlanForPayment.name}</strong> subscription is now active with full live gateway privileges.
                </p>
                <div className="h-1.5 w-40 mx-auto bg-emerald-500/20 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full animate-pulse" />
                </div>
                <button
                  onClick={() => {
                    handleCloseModal();
                    if (onNavigate) onNavigate('dashboard');
                  }}
                  className="rounded-xl bg-gradient-primary px-6 py-2.5 text-xs font-bold text-black shadow-glow"
                >
                  Go to Dashboard Now →
                </button>
              </div>
            ) : isInitiating ? (
              <div className="py-16 text-center space-y-4">
                <Loader2 className="h-10 w-10 text-emerald-400 animate-spin mx-auto" />
                <h3 className="font-display text-lg font-bold text-white">
                  Connecting to Super Admin Gateway...
                </h3>
                <p className="text-xs text-slate-400">
                  Routing subscription order to platform receiving account...
                </p>
              </div>
            ) : purchaseOrder ? (
              <>
                {/* Header Info */}
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-gradient-primary p-3 text-black shadow-glow">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">OFFICIAL SUPER ADMIN GATEWAY</span>
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-mono text-emerald-400 border border-emerald-500/30">DIRECT ROUTE</span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-white">
                      Activate {selectedPlanForPayment.name} Plan
                    </h3>
                  </div>
                </div>

                {/* Plan Summary Box */}
                <div className="rounded-2xl border border-emerald-500/20 bg-[#0b261d]/60 p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Target Plan</span>
                    <span className="font-bold text-white">{selectedPlanForPayment.name} ({selectedPlanForPayment.validityDays} Days)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Payee (Super Admin)</span>
                    <span className="font-semibold text-emerald-300">{purchaseOrder.payeeName}</span>
                  </div>
                  <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                    <span className="font-bold text-white">Amount Due</span>
                    <span className="font-display text-2xl font-extrabold text-emerald-400 font-mono">
                      ₹{purchaseOrder.amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* QR Code Presentation */}
                <div className="flex flex-col items-center justify-center p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                  {qrDataUrl ? (
                    <div className="p-3 bg-white rounded-2xl shadow-xl">
                      <img src={qrDataUrl} alt="UPI QR Code" className="w-52 h-52 object-contain" />
                    </div>
                  ) : (
                    <div className="w-52 h-52 flex items-center justify-center bg-slate-900 rounded-2xl">
                      <Loader2 className="h-6 w-6 text-emerald-400 animate-spin" />
                    </div>
                  )}

                  {/* Super Admin Payee UPI ID with Copy */}
                  <div className="flex items-center gap-2 bg-black/40 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs">
                    <span className="text-slate-400 text-[11px]">UPI ID:</span>
                    <span className="font-mono font-bold text-emerald-300 select-all">{purchaseOrder.upiId}</span>
                    <button
                      onClick={handleCopyUpi}
                      className="p-1 hover:text-emerald-400 text-slate-400 transition"
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400">Scan with any UPI app (GPay, PhonePe, Paytm, BHIM)</span>
                </div>

                {/* Quick Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={purchaseOrder.upiIntentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-gradient-primary py-2.5 text-center text-xs font-bold text-black shadow-glow flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition"
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>Pay via UPI App</span>
                  </a>

                  <a
                    href={purchaseOrder.paymentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-white/20 bg-white/5 py-2.5 text-center text-xs font-bold text-white flex items-center justify-center gap-1.5 hover:bg-white/10 transition"
                  >
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                    <span>Hosted Checkout</span>
                  </a>
                </div>

                {/* Manual UTR Verification Input */}
                <form onSubmit={handleSubmitUtr} className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                      Already Paid? Enter UTR / Ref No
                    </label>
                    <span className="text-[10px] font-mono text-slate-500">12 digits</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="e.g. 423871928374"
                      value={manualUtr}
                      onChange={(e) => setManualUtr(e.target.value.replace(/\D/g, ''))}
                      className="flex-1 rounded-xl bg-slate-900/80 border border-white/10 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingUtr || manualUtr.length !== 12}
                      className="rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40 transition flex items-center gap-1"
                    >
                      {isSubmittingUtr ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      <span>Verify</span>
                    </button>
                  </div>
                  {utrError && (
                    <p className="text-[11px] text-rose-400 font-medium">{utrError}</p>
                  )}
                </form>

                {/* Live Polling Status */}
                <div className="flex items-center justify-center gap-2 py-2 text-[11px] text-slate-400 font-mono">
                  <div className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </div>
                  <span>Waiting for Super Admin SMS receipt... Auto-detecting payment</span>
                </div>
              </>
            ) : null}

          </div>
        </div>
      )}

    </div>
  );
};
