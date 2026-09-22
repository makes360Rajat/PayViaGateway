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
  Radio,
  Plus,
  Edit2,
  Trash2,
  Power,
  Eye,
  EyeOff,
  Layers,
  Settings
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

  // Super Admin Plan Management Controls
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isSubActive = !isSuperAdmin && subscription?.status === 'ACTIVE';

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [planFormData, setPlanFormData] = useState({
    name: '',
    price: 199,
    validityDays: 30,
    maxMerchantAccounts: 5,
    maxOrdersPerDay: 1000,
    maxApiKeys: 3,
    isActive: true,
    features: {
      webhooks: true,
      smsGateway: true,
      crypto: false,
      prioritySupport: false,
      customBranding: false
    }
  });

  // Purchase & Payment Modal State (for merchants)
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

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      if (isSuperAdmin) {
        const plansRes = await ApiService.getAdminPlans();
        if (plansRes.status && plansRes.data) setPlans(plansRes.data);
      } else {
        const [plansRes, currentRes] = await Promise.all([
          ApiService.getPlans(),
          ApiService.getCurrentSubscription()
        ]);

        if (plansRes.status && plansRes.data) setPlans(plansRes.data);
        if (currentRes.status && currentRes.data) {
          setCurrentSub(currentRes.data.subscription);
          setUsage(currentRes.data.usage);
        }
      }
    } catch (e) {
      console.error('Failed loading plans', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePlanStatus = async (plan: Plan) => {
    try {
      const res = await ApiService.toggleAdminPlanStatus(plan.id);
      if (res.status) {
        setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, isActive: !p.isActive } : p));
      } else {
        alert(res.error || 'Failed to toggle plan status');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to toggle plan status');
    }
  };

  const handleDeletePlan = async (plan: Plan) => {
    if (!window.confirm(`Are you sure you want to permanently delete plan "${plan.name}" from database? Any merchants on this plan will safely fallback to the Free Plan.`)) {
      return;
    }
    try {
      const res = await ApiService.deleteAdminPlan(plan.id);
      if (res.status) {
        setPlans(prev => prev.filter(p => p.id !== plan.id));
        alert(res.message || 'Plan deleted successfully');
      } else {
        alert(res.error || 'Failed to delete plan');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to delete plan');
    }
  };

  const openCreatePlanModal = () => {
    setEditingPlan(null);
    setPlanFormData({
      name: '',
      price: 199,
      validityDays: 30,
      maxMerchantAccounts: 5,
      maxOrdersPerDay: 1000,
      maxApiKeys: 3,
      isActive: true,
      features: {
        webhooks: true,
        smsGateway: true,
        crypto: false,
        prioritySupport: false,
        customBranding: false
      }
    });
    setShowPlanModal(true);
  };

  const openEditPlanModal = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanFormData({
      name: plan.name,
      price: plan.price,
      validityDays: plan.validityDays || 30,
      maxMerchantAccounts: plan.maxMerchantAccounts || 5,
      maxOrdersPerDay: plan.maxOrdersPerDay || 500,
      maxApiKeys: plan.maxApiKeys || 3,
      isActive: plan.isActive !== false,
      features: (typeof plan.features === 'object' && !Array.isArray(plan.features)) ? plan.features : {
        webhooks: true,
        smsGateway: true,
        crypto: false,
        prioritySupport: false,
        customBranding: false
      }
    });
    setShowPlanModal(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planFormData.name.trim()) {
      alert('Please enter a plan name');
      return;
    }
    setIsSavingPlan(true);
    try {
      if (editingPlan) {
        const res = await ApiService.updateAdminPlan(editingPlan.id, planFormData);
        if (res.status) {
          alert('✓ Plan updated successfully');
          setShowPlanModal(false);
          setEditingPlan(null);
          loadPlans();
        } else {
          alert(res.error || 'Failed to update plan');
        }
      } else {
        const res = await ApiService.createAdminPlan(planFormData);
        if (res.status) {
          alert('✓ New plan created successfully');
          setShowPlanModal(false);
          loadPlans();
        } else {
          alert(res.error || 'Failed to create plan');
        }
      }
    } catch (e: any) {
      alert(e.message || 'Error saving plan');
    } finally {
      setIsSavingPlan(false);
    }
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
        // An existing active subscription must not make a new purchase look
        // paid. Only the specific order's verified settlement activates it.
        if (res.status && res.data?.isSettled) {
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
        if (poll.status && poll.data?.isSettled) {
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
      {!isSubActive && user && !isSuperAdmin && (
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
            <h1 className="font-display text-2xl font-bold text-white">
              {isSuperAdmin ? 'Subscription Plans Management' : 'Subscription Plans & Quota'}
            </h1>
            {isSuperAdmin ? (
              <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 text-xs font-mono text-indigo-400 font-semibold">
                SUPER ADMIN CONTROLS
              </span>
            ) : (
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-mono text-emerald-400">
                0% Gateway Commissions
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {isSuperAdmin
              ? 'Control subscription tiers, activate/deactivate availability, configure pricing & limits, or create new plans stored in the database.'
              : 'Select the plan matching your business volume. Subscription payments route securely to the platform Super Admin to activate instant production credentials.'}
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={openCreatePlanModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-primary text-black text-xs font-extrabold shadow-glow hover:brightness-110 active:scale-95 transition shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Plan</span>
          </button>
        )}
      </div>

      {/* Current Quota Usage Bar (only for active merchants, not super admin) */}
      {!isSuperAdmin && isSubActive && usage && (
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
          const formattedPlanName = p.name.toLowerCase().endsWith('plan') ? p.name : `${p.name} Plan`;

          return (
            <div
              key={p.id}
              className={`glass-panel p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between relative overflow-hidden group ${
                isCurrent 
                  ? 'border-emerald-500/50 shadow-glow bg-[#0b261d]/80' 
                  : isPro
                  ? 'border-amber-500/40 shadow-glow-amber bg-[#12231c]/60 hover:scale-[1.02]'
                  : 'border-white/5 hover:border-emerald-500/30 hover:scale-[1.01]'
              } ${p.isActive === false ? 'opacity-70 border-dashed border-rose-500/30' : ''}`}
            >
              {isPro && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-400 to-amber-500 text-black font-extrabold text-[10px] px-3 py-1 rounded-bl-xl uppercase tracking-wider font-mono">
                  Recommended
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span className="font-display font-bold text-xl text-white">{formattedPlanName}</span>
                  {isSuperAdmin && (
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                      p.isActive !== false 
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                        : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    }`}>
                      {p.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 min-h-[32px]">
                  {isStarter && "Essential direct UPI gateway for early-stage stores and individual sellers."}
                  {isPro && "High-velocity rotating gateway with automated UTR detection and webhooks."}
                  {isVip && "Maximum scale multi-merchant cluster with dedicated settlement queues."}
                  {!isStarter && !isPro && !isVip && "Custom tailored subscription package configured by platform Super Admin."}
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
                {isSuperAdmin ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleTogglePlanStatus(p)}
                        className={`w-full rounded-xl py-2 px-3 text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                          p.isActive !== false
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                        }`}
                      >
                        <Power className="h-3.5 w-3.5" />
                        <span>{p.isActive !== false ? 'Deactivate' : 'Activate'}</span>
                      </button>

                      <button
                        onClick={() => openEditPlanModal(p)}
                        className="w-full rounded-xl bg-white/5 border border-white/10 py-2 px-3 text-xs font-bold text-white hover:bg-white/10 transition flex items-center justify-center gap-1.5"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Edit Plan</span>
                      </button>
                    </div>

                    {p.id !== 'plan_free' && (
                      <button
                        onClick={() => handleDeletePlan(p)}
                        className="w-full rounded-xl bg-rose-500/10 border border-rose-500/20 py-2 px-3 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Plan</span>
                      </button>
                    )}
                  </div>
                ) : isCurrent ? (
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
                      <span>Submit</span>
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
                  <span>Waiting for a verified Super Admin account receipt...</span>
                </div>
              </>
            ) : null}

          </div>
        </div>
      )}

      {/* Super Admin Create / Edit Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-indigo-500/30 bg-[#070f1a] p-6 sm:p-8 shadow-2xl space-y-6">
            
            {/* Close Button */}
            <button
              onClick={() => {
                setShowPlanModal(false);
                setEditingPlan(null);
              }}
              className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-500/20 border border-indigo-500/30 p-3 text-indigo-400 shadow-glow">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">DATABASE PLAN MANAGER</span>
                  <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[9px] font-mono text-indigo-300 border border-indigo-500/30">SUPER ADMIN</span>
                </div>
                <h3 className="font-display text-xl font-bold text-white">
                  {editingPlan ? `Edit ${editingPlan.name}` : 'Create New Subscription Plan'}
                </h3>
              </div>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              
              {/* Plan Name */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Tier, Custom Pro, Starter"
                  value={planFormData.name}
                  onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Price and Validity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Price (₹ INR)</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    required
                    value={planFormData.price}
                    onChange={(e) => setPlanFormData({ ...planFormData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Validity (Days)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={planFormData.validityDays}
                    onChange={(e) => setPlanFormData({ ...planFormData, validityDays: parseInt(e.target.value, 10) || 30 })}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Quotas: Merchants, Orders, API Keys */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Max Merchants</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={planFormData.maxMerchantAccounts}
                    onChange={(e) => setPlanFormData({ ...planFormData, maxMerchantAccounts: parseInt(e.target.value, 10) || 1 })}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Daily Orders Max</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={planFormData.maxOrdersPerDay}
                    onChange={(e) => setPlanFormData({ ...planFormData, maxOrdersPerDay: parseInt(e.target.value, 10) || 100 })}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Max API Keys</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={planFormData.maxApiKeys}
                    onChange={(e) => setPlanFormData({ ...planFormData, maxApiKeys: parseInt(e.target.value, 10) || 1 })}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Plan Active Status */}
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-slate-200 font-semibold">Plan Availability Status</div>
                  <div className="text-[11px] text-slate-400">If inactive, merchants cannot view or subscribe to this plan.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planFormData.isActive}
                    onChange={(e) => setPlanFormData({ ...planFormData, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Feature Checkboxes */}
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5 space-y-2.5">
                <div className="text-slate-200 font-semibold mb-2">Entitlements & Features</div>
                
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!planFormData.features?.crypto}
                    onChange={(e) => setPlanFormData({
                      ...planFormData,
                      features: { ...planFormData.features, crypto: e.target.checked }
                    })}
                    className="rounded border-white/20 bg-slate-900 text-indigo-500 focus:ring-0"
                  />
                  <span>Crypto Gateway (USDT / USDC Multi-Chain)</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!planFormData.features?.smsGateway}
                    onChange={(e) => setPlanFormData({
                      ...planFormData,
                      features: { ...planFormData.features, smsGateway: e.target.checked }
                    })}
                    className="rounded border-white/20 bg-slate-900 text-indigo-500 focus:ring-0"
                  />
                  <span>Android SMS & Notification Gateway App</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!planFormData.features?.webhooks}
                    onChange={(e) => setPlanFormData({
                      ...planFormData,
                      features: { ...planFormData.features, webhooks: e.target.checked }
                    })}
                    className="rounded border-white/20 bg-slate-900 text-indigo-500 focus:ring-0"
                  />
                  <span>Signed Webhook Callbacks</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!planFormData.features?.prioritySupport}
                    onChange={(e) => setPlanFormData({
                      ...planFormData,
                      features: { ...planFormData.features, prioritySupport: e.target.checked }
                    })}
                    className="rounded border-white/20 bg-slate-900 text-indigo-500 focus:ring-0"
                  />
                  <span>24/7 Priority Support & Dedicated Account Manager</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPlanModal(false);
                    setEditingPlan(null);
                  }}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlan}
                  className="rounded-xl bg-gradient-primary px-6 py-2.5 text-xs font-extrabold text-black shadow-glow hover:brightness-110 active:scale-95 disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {isSavingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span>{editingPlan ? 'Update Plan' : 'Save New Plan'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

