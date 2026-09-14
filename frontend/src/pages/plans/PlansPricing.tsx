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
  Clock
} from 'lucide-react';

export const PlansPricing: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSub, setCurrentSub] = useState<TenantSubscription | null>(null);
  const [usage, setUsage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);

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

  const handleUpgrade = async (planId: string) => {
    setUpgradingPlanId(planId);
    const res = await ApiService.upgradePlan(planId);
    setUpgradingPlanId(null);

    if (res.status) {
      await refreshProfile();
      await loadPlans();
      alert(res.message || 'Plan upgraded successfully!');
    } else {
      alert(res.error || 'Failed to upgrade plan');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white">Subscription Plans & Quota</h1>
            <span className="rounded-full bg-purple-500/10 border border-purple-500/30 px-2.5 py-0.5 text-xs font-mono text-purple-400">
              VIP Tier Available
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Transparent pricing based on connected merchant accounts and daily transaction volume.
          </p>
        </div>
      </div>

      {/* Current Quota Usage Bar */}
      {usage && (
        <div className="glass-panel p-6 rounded-3xl border border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase">Daily Orders Quota</span>
            <div className="text-xl font-bold text-white font-mono">
              {usage.ordersToday} / {usage.ordersMax}
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-500 h-full rounded-full" 
                style={{ width: `${Math.min(100, (usage.ordersToday / usage.ordersMax) * 100)}%` }} 
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
                style={{ width: `${Math.min(100, (usage.merchantsUsed / usage.merchantsMax) * 100)}%` }} 
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
                style={{ width: `${Math.min(100, (usage.apiKeysUsed / usage.apiKeysMax) * 100)}%` }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isCurrent = user?.planId === p.id;

          return (
            <div
              key={p.id}
              className={`glass-panel p-6 rounded-3xl border transition-all flex flex-col justify-between ${
                isCurrent 
                  ? 'border-purple-500/50 shadow-glow bg-purple-950/20' 
                  : 'border-white/5 hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-display font-bold text-lg text-white">{p.name}</span>
                  {p.id === 'plan_unlimited' && (
                    <span className="rounded-full bg-purple-500/20 border border-purple-500/40 px-2.5 py-0.5 text-[9px] font-bold text-purple-300">
                      Most Popular
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1 my-4">
                  <span className="text-3xl font-extrabold font-display text-white">₹{p.price}</span>
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
                  {p.features?.crypto && (
                    <li className="flex items-center gap-2 text-indigo-300 font-semibold">
                      <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span>Crypto (USDT / USDC) On-Chain</span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="pt-4 border-t border-white/10">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full rounded-xl bg-purple-600/30 border border-purple-500/40 py-2.5 text-xs font-bold text-purple-200 cursor-default"
                  >
                    ✓ Current Active Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(p.id)}
                    disabled={upgradingPlanId === p.id}
                    className="w-full rounded-xl bg-gradient-primary py-2.5 text-xs font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition disabled:opacity-50"
                  >
                    {upgradingPlanId === p.id ? 'Processing...' : 'Upgrade to this Plan →'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
