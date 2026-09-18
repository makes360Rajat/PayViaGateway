import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ApiService } from '../../services/api';
import { Order, MerchantAccount, Device } from '../../types';
import { CreatePaymentLinkModal } from '../../components/orders/CreatePaymentLinkModal';
import { formatIST, isTodayIST } from '../../utils/dateUtils';
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
  Plus,
  Smartphone,
  Battery,
  BatteryCharging
} from 'lucide-react';

interface DashboardOverviewProps {
  onNavigate: (page: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const { user, plan, isPlanActive, entitlements, planUsage } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [merchants, setMerchants] = useState<MerchantAccount[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ordersRes, merchantsRes, devicesRes] = await Promise.all([
        ApiService.getOrders({ limit: 15 }),
        ApiService.getMerchants(),
        ApiService.getDevices()
      ]);

      if (ordersRes.status && ordersRes.data) {
        setOrders(ordersRes.data);
      }
      if (merchantsRes.status && merchantsRes.data) {
        setMerchants(merchantsRes.data);
      }
      if (devicesRes.status && devicesRes.data) {
        setDevices(devicesRes.data);
      }
    } catch (e) {}
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Metrics computation (strictly using Indian Standard Time - IST)
  const todayOrders = orders.filter(o => isTodayIST(o.createdAt));
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
  const onlineDevicesCount = devices.filter(d => d.isOnline).length;

  return (
    <div className="space-y-6">
      
      {/* Create Payment Link Modal */}
      <CreatePaymentLinkModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onOrderCreated={() => loadData()}
      />

      {/* Streamlined Top Header Row (No Cluttered Card) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              Dashboard
            </h1>
            {isPlanActive ? (
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 font-mono flex items-center gap-1.5 shadow-glow">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>LIVE</span>
              </span>
            ) : (
              <span className="rounded-full bg-amber-500/15 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 font-mono flex items-center gap-1.5 shadow-glow-amber">
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>FREE TEST MODE</span>
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Real-time settlement overview across {merchants.length} merchant routes and {devices.length} SMS gateway devices.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={loadData}
            title="Refresh Live Data"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
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
            className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 hover:text-white transition active:scale-95"
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>View All</span>
          </button>
        </div>
      </div>

      {/* Free Test Mode Account Ribbon */}
      {!isPlanActive && (
        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-[#181624] to-[#0c0e18] p-5 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm text-amber-300">Free Test Mode Active</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400 text-black font-extrabold">
                  {entitlements?.testOrdersUsed ?? planUsage?.used ?? 0} / {entitlements?.testOrdersMax ?? planUsage?.limit ?? 5} TEST ORDERS USED
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Connecting live merchant accounts and collecting customer UPI payments requires upgrading your plan.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('plans')}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:brightness-110 text-black px-5 py-2.5 text-xs font-bold transition active:scale-95 shadow-glow-amber shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            <span>Upgrade to Live Plan →</span>
          </button>
        </div>
      )}

      {/* Metrics Row (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
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
            {successfulOrders.length} settlements
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
            {orders.filter(o => o.status === 'PENDING').length} pending
          </div>
        </div>

        {/* Active Accounts */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 cursor-pointer hover:border-purple-500/30 transition" onClick={() => onNavigate('merchants')}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Merchants</span>
            <div className="h-8 w-8 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold font-display text-white">{activeMerchantsCount} Active</div>
          <div className="mt-1 text-[10px] text-purple-300">
            {merchants.length} connected
          </div>
        </div>

        {/* Connected Devices (SMS Gateways) */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 cursor-pointer hover:border-cyan-500/30 transition" onClick={() => onNavigate('devices')}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Devices</span>
            <div className="h-8 w-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Smartphone className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold font-display text-white">
            {devices.length} Connected
          </div>
          <div className="mt-1 text-[10px] text-cyan-300 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${onlineDevicesCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{onlineDevicesCount} Online Gateway</span>
            </span>
            {devices[0] && (
              <span className="font-mono text-[9px] text-slate-400 flex items-center gap-0.5">
                <Battery className="h-3 w-3 text-emerald-400" />
                {devices[0].batteryLevel ?? 100}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2-Column Grid for Connected Routes: Merchants & Android SMS Gateways */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Connected Merchants Card */}
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
              <span>Manage ({merchants.length})</span>
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
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {merchants.slice(0, 4).map((m) => {
                const isActive = m.status === 'ACTIVE';
                return (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-white/10 bg-[#0b0b12]/60 p-3.5 flex items-center justify-between hover:border-white/20 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-xs font-bold text-purple-300 font-mono">
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

        {/* Connected Android SMS Gateways Card */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-cyan-400" />
                <span>Connected Android SMS Gateways</span>
              </h2>
              <p className="text-[11px] text-slate-400">Paired phones sensing real-time bank credit SMS</p>
            </div>
            <button
              onClick={() => onNavigate('devices')}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>Pair Device ({devices.length})</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {devices.length === 0 ? (
            <div className="text-center py-6 border border-white/5 rounded-2xl bg-white/[0.02]">
              <p className="text-xs text-slate-400">No Android companion devices paired yet.</p>
              <button
                onClick={() => onNavigate('devices')}
                className="mt-2 text-xs text-cyan-400 hover:underline font-semibold"
              >
                + Pair your Android phone in 1-click →
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {devices.slice(0, 4).map((d) => {
                const isOnline = d.isOnline;
                const battery = d.batteryLevel ?? 100;
                return (
                  <div
                    key={d.id}
                    className="rounded-2xl border border-white/10 bg-[#0b0b12]/60 p-3.5 flex items-center justify-between hover:border-white/20 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-xs font-bold text-cyan-300">
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white truncate max-w-[150px]">{d.deviceName}</div>
                        <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                          <span>{d.pairingCode}</span>
                          <span>•</span>
                          <span className="text-emerald-400">{d.smsCapturedCount || 0} SMS sensed</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-white/10 text-[10px] font-mono text-slate-300" title={`Phone Battery Level: ${battery}%`}>
                        <Battery className={`h-3 w-3 ${battery > 20 ? 'text-emerald-400' : 'text-rose-400'}`} />
                        <span>{battery}%</span>
                      </div>

                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        isOnline 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {isOnline ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
                    <td className="py-3 text-[10px] text-slate-400 font-mono text-right whitespace-nowrap">
                      {formatIST(o.createdAt, { timeOnly: true })}
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
