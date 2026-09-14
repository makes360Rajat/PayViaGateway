import React, { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';
import { 
  ShieldAlert, 
  Users, 
  Receipt, 
  TrendingUp, 
  Settings, 
  Plus, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  Lock
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'orders' | 'plans'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // New Plan Modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('1999');
  const [planValidity, setPlanValidity] = useState('30');
  const [maxMerchants, setMaxMerchants] = useState('10');
  const [maxOrders, setMaxOrders] = useState('2000');
  const [maxKeys, setMaxKeys] = useState('5');

  const loadAdminData = async () => {
    setIsLoading(true);
    const [statsRes, usersRes, ordersRes] = await Promise.all([
      ApiService.getAdminStats(),
      ApiService.getAdminUsers(),
      ApiService.getAdminOrders({ limit: 50 })
    ]);

    if (statsRes.status) setStats(statsRes.data);
    if (usersRes.status) setUsers(usersRes.data);
    if (ordersRes.status) setOrders(ordersRes.data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleUser = async (user: any) => {
    await ApiService.updateAdminUser(user.id, { isActive: !user.isActive });
    loadAdminData();
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await ApiService.createAdminPlan({
      name: planName,
      price: parseFloat(planPrice),
      validityDays: parseInt(planValidity),
      maxMerchantAccounts: parseInt(maxMerchants),
      maxOrdersPerDay: parseInt(maxOrders),
      maxApiKeys: parseInt(maxKeys)
    });

    if (res.status) {
      setShowPlanModal(false);
      setPlanName('');
      alert('Custom Plan created successfully!');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-rose-500/20 bg-rose-950/10">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-rose-400" />
            <h1 className="font-display text-2xl font-bold text-white">Super Admin Control Center</h1>
            <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 text-xs font-mono text-rose-300">
              PLATFORM ROOT
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Platform-wide governance, global multi-tenant firehose, user plan assignments, and system health metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['overview', 'users', 'orders', 'plans'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold capitalize transition ${
                activeTab === tab
                  ? 'bg-rose-600 text-white shadow-glow'
                  : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-white/5">
              <span className="text-xs font-semibold text-slate-400 uppercase">Platform Volume</span>
              <div className="mt-2 text-2xl font-bold text-white font-display">₹{stats.totalVolume.toFixed(2)}</div>
              <span className="text-[10px] text-slate-400">₹{stats.todayVolume.toFixed(2)} Today</span>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/5">
              <span className="text-xs font-semibold text-slate-400 uppercase">Total Tenants</span>
              <div className="mt-2 text-2xl font-bold text-indigo-400 font-display">{stats.totalTenants}</div>
              <span className="text-[10px] text-emerald-400">{stats.activeTenants} Active Workspaces</span>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/5">
              <span className="text-xs font-semibold text-slate-400 uppercase">Connected Merchants</span>
              <div className="mt-2 text-2xl font-bold text-purple-400 font-display">{stats.totalMerchants}</div>
              <span className="text-[10px] text-purple-300">{stats.activeMerchants} Active Accounts</span>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/5">
              <span className="text-xs font-semibold text-slate-400 uppercase">Success Rate</span>
              <div className="mt-2 text-2xl font-bold text-emerald-400 font-display">{stats.successRate}%</div>
              <span className="text-[10px] text-slate-400">{stats.totalOrders} Global Orders</span>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/5 bg-slate-900/40 text-slate-400 font-semibold uppercase text-[10px] font-mono">
              <tr>
                <th className="p-4">Business / Tenant</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Active Plan</th>
                <th className="p-4">Merchants</th>
                <th className="p-4">Total Volume</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02]">
                  <td className="p-4 font-bold text-white">{u.businessName || u.name}</td>
                  <td className="p-4 font-mono text-slate-300">{u.email}</td>
                  <td className="p-4 font-mono text-[10px] text-indigo-400">{u.role}</td>
                  <td className="p-4">
                    <span className="rounded bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                      {u.plan}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-slate-300">{u.merchantAccountsCount} Accounts</td>
                  <td className="p-4 font-bold text-slate-100">₹{u.totalVolume.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      u.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {u.isActive ? 'ACTIVE' : 'SUSPENDED'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {u.role !== 'SUPER_ADMIN' && (
                      <button
                        onClick={() => handleToggleUser(u)}
                        className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-200"
                      >
                        {u.isActive ? 'Suspend' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Global Orders Firehose Tab */}
      {activeTab === 'orders' && (
        <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-white/5 bg-slate-900/40 text-slate-400 font-semibold uppercase text-[10px]">
              <tr>
                <th className="p-4">Order ID</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Provider</th>
                <th className="p-4">Status</th>
                <th className="p-4">UTR</th>
                <th className="p-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="p-4 font-bold text-indigo-400">{o.orderId}</td>
                  <td className="p-4 font-bold text-white">₹{o.amount.toFixed(2)}</td>
                  <td className="p-4 text-purple-300">{o.provider}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      o.status === 'TXN_SUCCESS' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="p-4 text-emerald-400 font-bold">{o.utr || '—'}</td>
                  <td className="p-4 text-slate-500">{new Date(o.createdAt).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-base text-white">Manage Platform Subscription Plans</h3>
            <button
              onClick={() => setShowPlanModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-glow"
            >
              <Plus className="h-4 w-4" />
              <span>Create Custom Plan</span>
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Define plan limits, pricing, and feature flags for all merchants on the platform.
          </p>
        </div>
      )}

      {/* Create Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-base text-white">Create Subscription Plan</h3>
              <button onClick={() => setShowPlanModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 uppercase text-[10px] mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Custom Tier"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 uppercase text-[10px] mb-1">Price (INR)</label>
                  <input
                    type="number"
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 uppercase text-[10px] mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    value={planValidity}
                    onChange={(e) => setPlanValidity(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 uppercase text-[10px] mb-1">Max Accounts</label>
                  <input
                    type="number"
                    value={maxMerchants}
                    onChange={(e) => setMaxMerchants(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 uppercase text-[10px] mb-1">Max Orders/Day</label>
                  <input
                    type="number"
                    value={maxOrders}
                    onChange={(e) => setMaxOrders(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 uppercase text-[10px] mb-1">Max API Keys</label>
                  <input
                    type="number"
                    value={maxKeys}
                    onChange={(e) => setMaxKeys(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="rounded-xl px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 px-5 py-2 font-bold text-white shadow-glow hover:bg-rose-500"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
