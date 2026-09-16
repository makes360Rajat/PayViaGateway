import React, { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';
import { Plan, TenantSubscription } from '../../types';
import { useAuth } from '../../context/AuthContext';
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
  Lock
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
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);

  // Modal payment state
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<Plan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'qr'>('upi');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

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
  }, []);

  const openPaymentModal = (p: Plan) => {
    setSelectedPlanForPayment(p);
    setPaymentSuccess(false);
  };

  const handleConfirmActivation = async () => {
    if (!selectedPlanForPayment) return;
    const planId = selectedPlanForPayment.id;
    setUpgradingPlanId(planId);
    
    try {
      const res = await ApiService.upgradePlan(planId);
      setUpgradingPlanId(null);

      if (res.status) {
        setPaymentSuccess(true);
        await refreshProfile();
        await loadPlans();
        
        // Auto navigate to dashboard after 1.8 seconds celebration
        setTimeout(() => {
          setSelectedPlanForPayment(null);
          if (onNavigate) {
            onNavigate('dashboard');
          }
        }, 1800);
      } else {
        alert(res.error || 'Failed to activate plan');
      }
    } catch (e: any) {
      setUpgradingPlanId(null);
      alert(e.message || 'Error processing activation');
    }
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
                  Your account is in setup mode. Choose a subscription plan below to unlock automated direct UPI settlement routing, companion app SMS gateway, and production API keys.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-[11px] font-mono font-bold text-amber-300 shrink-0 self-start sm:self-auto">
              STEP 2 OF 2
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
            Select the plan matching your business volume. All money moves directly to your own merchant accounts.
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
                    onClick={() => openPaymentModal(p)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-emerald-500/30 bg-[#061410] p-6 sm:p-8 shadow-2xl space-y-6">
            
            {/* Close Button */}
            {!paymentSuccess && (
              <button
                onClick={() => setSelectedPlanForPayment(null)}
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
                  🎉 Plan Activated Successfully!
                </h3>
                <p className="text-xs text-emerald-200/80 max-w-sm mx-auto">
                  Your <strong>{selectedPlanForPayment.name}</strong> subscription is active. Unlocking your workspace and redirecting to the live dashboard...
                </p>
                <div className="h-1 w-32 mx-auto bg-emerald-500/30 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full animate-pulse" />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-gradient-primary p-3 text-black shadow-glow">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">SECURE SUBSCRIPTION CHECKOUT</span>
                    <h3 className="font-display text-xl font-bold text-white">
                      Activate {selectedPlanForPayment.name} Plan
                    </h3>
                  </div>
                </div>

                {/* Plan Summary Box */}
                <div className="rounded-2xl border border-emerald-500/20 bg-[#0b261d]/60 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Plan Duration</span>
                    <span className="font-mono font-semibold text-white">{selectedPlanForPayment.validityDays} Days</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Daily Transaction Quota</span>
                    <span className="font-mono font-semibold text-white">{selectedPlanForPayment.maxOrdersPerDay.toLocaleString()} orders / day</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Connected Merchant Accounts</span>
                    <span className="font-mono font-semibold text-white">{selectedPlanForPayment.maxMerchantAccounts} Accounts</span>
                  </div>
                  <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Total Amount Due</span>
                    <span className="font-display text-2xl font-extrabold text-emerald-400 font-mono">
                      ₹{selectedPlanForPayment.price.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-3">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setPaymentMethod('upi')}
                      className={`rounded-xl border p-3 text-center transition flex flex-col items-center gap-1.5 ${
                        paymentMethod === 'upi'
                          ? 'border-emerald-500 bg-emerald-500/15 text-white shadow-glow'
                          : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Smartphone className="h-5 w-5 text-emerald-400" />
                      <span className="text-[11px] font-semibold">UPI Intent</span>
                    </button>

                    <button
                      onClick={() => setPaymentMethod('qr')}
                      className={`rounded-xl border p-3 text-center transition flex flex-col items-center gap-1.5 ${
                        paymentMethod === 'qr'
                          ? 'border-emerald-500 bg-emerald-500/15 text-white shadow-glow'
                          : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      <QrCode className="h-5 w-5 text-amber-400" />
                      <span className="text-[11px] font-semibold">Dynamic QR</span>
                    </button>

                    <button
                      onClick={() => setPaymentMethod('card')}
                      className={`rounded-xl border p-3 text-center transition flex flex-col items-center gap-1.5 ${
                        paymentMethod === 'card'
                          ? 'border-emerald-500 bg-emerald-500/15 text-white shadow-glow'
                          : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      <CreditCard className="h-5 w-5 text-purple-400" />
                      <span className="text-[11px] font-semibold">Cards / Net</span>
                    </button>
                  </div>
                </div>

                {/* Pay & Activate Button */}
                <div className="pt-2 space-y-2">
                  <button
                    onClick={handleConfirmActivation}
                    disabled={upgradingPlanId !== null}
                    className="w-full rounded-2xl bg-gradient-primary py-3.5 text-xs font-extrabold text-black shadow-glow hover:brightness-110 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    <span>
                      {upgradingPlanId ? 'Processing Payment & Activation...' : `Pay ₹${selectedPlanForPayment.price.toFixed(0)} & Unlock Workspace →`}
                    </span>
                  </button>
                  <p className="text-[10px] text-center text-slate-500 font-mono">
                    Direct Bank Credited • 256-Bit SSL Encrypted • Zero Settlement Lag
                  </p>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
