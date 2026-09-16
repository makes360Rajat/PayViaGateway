import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ApiService } from '../../services/api';
import { Order, MerchantAccount } from '../../types';
import { CreatePaymentLinkModal } from '../../components/orders/CreatePaymentLinkModal';
import {
  TrendingUp,
  Wallet,
  Receipt,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Zap,
  Activity,
  Plus
} from 'lucide-react';

interface DashboardOverviewProps {
  onNavigate: (page: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const { user, plan } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [merchants, setMerchants] = useState<MerchantAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ordersRes, merchantsRes] = await Promise.all([
        ApiService.getOrders({ limit: 15 }),
        ApiService.getMerchants()
      ]);

      if (ordersRes.status && ordersRes.data) {
        setOrders(ordersRes.data);
      }
      if (merchantsRes.status && merchantsRes.data) {
        setMerchants(merchantsRes.data);
      }
    } catch (e) {}
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Metrics computation
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter(o => o.createdAt && o.createdAt.startsWith(today));
  const successfulOrders = orders.filter(o => o.status === 'TXN_SUCCESS');
  const todayVolume = todayOrders
    .filter(o => o.status === 'TXN_SUCCESS')
    .reduce((sum, o) => sum + Number(o.amount || 0), 0);

  const totalVolume = successfulOrders
    .reduce((sum, o) => sum + Number(o.amount || 0), 0);

  const successRate = orders.length > 0 
    ? ((successfulOrders.length / orders.length) * 100).toFixed(1) 
    : '100.0';

  const activeMerchantsCount = merchants.filter(m => m.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      
      {/* Create Payment Link Modal */}
      <CreatePaymentLinkModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onOrderCreated={() => loadData()}
      />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="absolute -top-10 right-10 w-64 h-32 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              Dashboard
            </h1>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 font-mono">
              LIVE
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Overview of your direct UPI settlement across all {merchants.length} connected accounts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-primary px-4 py-2 text-xs font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Payment Link</span>
          </button>

          <button
            onClick={() => onNavigate('orders')}
            className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition"
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>View All</span>
          </button>
        </div>
      </div>

      {/* Metrics Row (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Today Volume */}
        <div className="glass-card p-5 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold font-display text-white">₹{todayVolume.toFixed(2)}</div>
          <div className="mt-1 text-[10px] text-emerald-400 flex items-center gap-1">
            <span>{todayOrders.filter(o => o.status === 'TXN_SUCCESS').length} of {todayOrders.length} paid</span>
          </div>
        </div>

        {/* Total Volume */}
        <div className="glass-card p-5 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Volume</span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold font-display text-white">₹{totalVolume.toFixed(2)}</div>
          <div className="mt-1 text-[10px] text-slate-400">
            {successfulOrders.length} successful settlements
          </div>
        </div>

        {/* Success Rate */}
        <div className="glass-card p-5 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Success Rate</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold font-display text-white">{successRate}%</div>
          <div className="mt-1 text-[10px] text-slate-400">
            {orders.filter(o => o.status === 'PENDING').length} pending verification
          </div>
        </div>

        {/* Active Accounts */}
        <div className="glass-card p-5 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Merchants</span>
            <div className="h-8 w-8 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold font-display text-white">{activeMerchantsCount} Active</div>
          <div className="mt-1 text-[10px] text-purple-300">
            {merchants.length} connected accounts
          </div>
        </div>
      </div>

      {/* Connected Merchants Grid Summary */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              <Wallet className="h-4 w-4 text-purple-400" />
              <span>Connected Merchant Accounts</span>
            </h2>
            <p className="text-[11px] text-slate-400">Direct settlement routes active in rotation</p>
          </div>
          <button
            onClick={() => onNavigate('merchants')}
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            <span>Manage Merchants</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {merchants.length === 0 ? (
          <div className="text-center py-6 border border-white/5 rounded-2xl bg-white/[0.02]">
            <p className="text-xs text-slate-400">No merchant accounts connected yet.</p>
            <button
              onClick={() => onNavigate('merchants')}
              className="mt-2 text-xs text-purple-400 hover:underline font-semibold"
            >
              + Connect your first merchant account →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {merchants.map((m) => {
              const isActive = m.status === 'ACTIVE';
              return (
                <div
                  key={m.id}
                  className="rounded-2xl border border-white/10 bg-[#0b0b12]/60 p-4 flex items-center justify-between hover:border-white/20 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-xs font-bold text-purple-300 font-mono">
                      {m.provider ? m.provider.slice(0, 2).toUpperCase() : 'UPI'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white truncate max-w-[150px]">{m.label || m.upiId}</div>
                      <div className="text-[10px] font-mono text-slate-400">{m.upiId}</div>
                    </div>
                  </div>

                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${
                    isActive 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isActive ? 'ROTATING' : 'PAUSED'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Orders Live Table (Full Width) */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <span>Recent Transactions</span>
            </h2>
            <p className="text-[11px] text-slate-400">Live transaction stream across all merchants</p>
          </div>
          <button
            onClick={() => onNavigate('orders')}
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            <span>View All Orders</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/5 text-slate-400 font-semibold uppercase text-[10px] font-mono">
              <tr>
                <th className="pb-3">Order Ref</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Provider</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">UTR / Ref</th>
                <th className="pb-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 font-sans">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 font-semibold text-white">
                      <div className="flex items-center gap-1.5">
                        <a 
                          href={o.paymentUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="hover:text-purple-400 underline decoration-purple-500/30"
                        >
                          {o.orderId}
                        </a>
                      </div>
                    </td>
                    <td className="py-3 font-bold text-slate-100 font-sans">₹{Number(o.amount).toFixed(2)}</td>
                    <td className="py-3">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                        {o.provider}
                      </span>
                    </td>
                    <td className="py-3 font-sans">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        o.status === 'TXN_SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : o.status === 'PENDING'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300">
                      {o.utr || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="py-3 text-[10px] text-slate-500 text-right">
                      {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
