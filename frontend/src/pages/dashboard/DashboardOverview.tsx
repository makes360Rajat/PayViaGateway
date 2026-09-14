import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ApiService } from '../../services/api';
import { Order, MerchantAccount } from '../../types';
import {
  TrendingUp,
  Wallet,
  Receipt,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  PlusCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface DashboardOverviewProps {
  onNavigate: (page: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const { user, plan } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [merchants, setMerchants] = useState<MerchantAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Quick order modal state
  const [quickAmount, setQuickAmount] = useState('');
  const [quickMobile, setQuickMobile] = useState('');
  const [quickRemark, setQuickRemark] = useState('');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ordersRes, merchantsRes] = await Promise.all([
        ApiService.getOrders({ limit: 10 }),
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

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAmount) return;

    setIsCreating(true);
    const res = await ApiService.createOrderManual({
      amount: parseFloat(quickAmount),
      customerMobile: quickMobile,
      remark1: quickRemark
    });
    setIsCreating(false);

    if (res.status && res.data) {
      setCreatedOrder(res.data);
      setQuickAmount('');
      setQuickMobile('');
      setQuickRemark('');
      loadData();
    } else {
      alert(res.error || 'Failed to create payment link');
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Metrics computation
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter(o => o.createdAt.startsWith(today));
  const successfulOrders = orders.filter(o => o.status === 'TXN_SUCCESS');
  const todayVolume = todayOrders
    .filter(o => o.status === 'TXN_SUCCESS')
    .reduce((sum, o) => sum + o.amount, 0);

  const successRate = orders.length > 0 
    ? ((successfulOrders.length / orders.length) * 100).toFixed(1) 
    : '100.0';

  const activeMerchantsCount = merchants.filter(m => m.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="absolute -top-10 right-10 w-64 h-32 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white">
              Welcome, {user?.businessName || user?.name}
            </h1>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 font-mono">
              LIVE
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Real-time direct UPI settlement overview across all {merchants.length} connected merchant accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => onNavigate('create-order')}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-primary px-4 py-2 text-xs font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Generate Pay Link</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Volume Today</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold font-display text-white">₹{todayVolume.toFixed(2)}</div>
          <div className="mt-1 text-[10px] text-emerald-400 flex items-center gap-1">
            <span>Direct bank credited</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Success Rate</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold font-display text-white">{successRate}%</div>
          <div className="mt-1 text-[10px] text-slate-400">
            {successfulOrders.length} of {orders.length} total orders
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Merchants</span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold font-display text-white">{activeMerchantsCount} Active</div>
          <div className="mt-1 text-[10px] text-purple-300">
            Rotating across {merchants.length} accounts
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subscription Quota</span>
            <div className="h-8 w-8 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold font-display text-white">{plan?.name || 'Pro Plan'}</div>
          <div className="mt-1 text-[10px] text-slate-400">
            Up to {plan?.maxOrdersPerDay || 2000} orders / day
          </div>
        </div>
      </div>

      {/* Quick Payment Generator + Recent Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Create Link Box */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-indigo-400" />
              <h2 className="font-bold text-sm text-white">Instant Payment Link</h2>
            </div>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
              AUTO-ROUTED
            </span>
          </div>

          <form onSubmit={handleQuickCreate} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Amount (INR)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="499.00"
                value={quickAmount}
                onChange={(e) => setQuickAmount(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-sm text-white font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Customer Mobile (Optional)</label>
              <input
                type="text"
                placeholder="9876543210"
                value={quickMobile}
                onChange={(e) => setQuickMobile(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Remark / Item Note</label>
              <input
                type="text"
                placeholder="Invoice #1042"
                value={quickRemark}
                onChange={(e) => setQuickRemark(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full rounded-xl bg-gradient-primary py-2.5 text-xs font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition disabled:opacity-50"
            >
              {isCreating ? 'Creating Link...' : 'Create Payment Link →'}
            </button>
          </form>

          {/* Newly Created Order Link Popup */}
          {createdOrder && (
            <div className="rounded-2xl bg-indigo-950/40 border border-indigo-500/30 p-4 space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Link Generated!
                </span>
                <span className="text-[10px] font-mono text-slate-400">{createdOrder.orderId}</span>
              </div>
              <div className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-white/5 text-xs font-mono">
                <span className="text-indigo-300 truncate">{createdOrder.paymentUrl}</span>
                <button
                  onClick={() => copyLink(createdOrder.paymentUrl)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold shrink-0"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <a
                href={createdOrder.paymentUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-indigo-600/30 border border-indigo-500/30 py-1.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-600/40 transition"
              >
                <span>Open Hosted Checkout Page</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Recent Orders Live Table */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-white">Recent Transactions</h2>
              <p className="text-[11px] text-slate-400">Live transaction stream across all merchants</p>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>View All</span>
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
                  <th className="pb-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500 font-sans">
                      No orders yet. Create your first payment link above!
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
                            className="hover:text-indigo-400 underline decoration-indigo-500/30"
                          >
                            {o.orderId}
                          </a>
                        </div>
                      </td>
                      <td className="py-3 font-bold text-slate-100 font-sans">₹{o.amount.toFixed(2)}</td>
                      <td className="py-3">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
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
                      <td className="py-3 text-[10px] text-slate-500">
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
    </div>
  );
};
