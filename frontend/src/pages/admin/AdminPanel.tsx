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
  Lock,
  MessageSquare,
  Mail,
  Clock,
  Trash2,
  Check,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'orders' | 'plans' | 'inquiries'>('overview');
  const [inquiryFilter, setInquiryFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('ALL');
  const [selectedInquiry, setSelectedInquiry] = useState<any | null>(null);
  const [replyNotes, setReplyNotes] = useState('');
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
    const [statsRes, usersRes, ordersRes, contactsRes] = await Promise.all([
      ApiService.getAdminStats(),
      ApiService.getAdminUsers(),
      ApiService.getAdminOrders({ limit: 50 }),
      ApiService.getAdminContacts()
    ]);

    if (statsRes.status) setStats(statsRes.data);
    if (usersRes.status) setUsers(usersRes.data);
    if (ordersRes.status) setOrders(ordersRes.data);
    if (contactsRes.status) setInquiries(contactsRes.data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleUser = async (user: any) => {
    await ApiService.updateAdminUser(user.id, { isActive: !user.isActive });
    loadAdminData();
  };

  const handleToggleInquiryStatus = async (inquiry: any) => {
    const newStatus = inquiry.status === 'RESOLVED' ? 'PENDING' : 'RESOLVED';
    await ApiService.updateAdminContact(inquiry.id, { status: newStatus });
    loadAdminData();
  };

  const handleDeleteInquiry = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this contact inquiry?')) return;
    await ApiService.deleteAdminContact(id);
    if (selectedInquiry?.id === id) setSelectedInquiry(null);
    loadAdminData();
  };

  const handleSaveReplyNotes = async () => {
    if (!selectedInquiry) return;
    await ApiService.updateAdminContact(selectedInquiry.id, { 
      replyNotes,
      status: selectedInquiry.status 
    });
    alert('Notes saved successfully!');
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

  const pendingCount = inquiries.filter(i => i.status === 'PENDING').length;
  const filteredInquiries = inquiries.filter(i => {
    if (inquiryFilter === 'PENDING') return i.status === 'PENDING';
    if (inquiryFilter === 'RESOLVED') return i.status === 'RESOLVED';
    return true;
  });

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
            Platform-wide governance, global multi-tenant firehose, user plan assignments, contact inquiries history & system health metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'users', label: 'Users' },
            { id: 'orders', label: 'Orders' },
            { id: 'plans', label: 'Plans' },
            { id: 'inquiries', label: 'Inquiries & Support', count: pendingCount }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold capitalize transition flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-rose-600 text-white shadow-glow'
                  : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="h-4 min-w-[16px] px-1 rounded-full bg-amber-500 text-black text-[10px] font-extrabold flex items-center justify-center animate-pulse">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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

            <div className="glass-card p-5 rounded-2xl border border-amber-500/20 bg-amber-950/10 cursor-pointer hover:border-amber-500/40 transition" onClick={() => setActiveTab('inquiries')}>
              <span className="text-xs font-semibold text-amber-400 uppercase">Contact Inquiries</span>
              <div className="mt-2 text-2xl font-bold text-amber-300 font-display">{inquiries.length}</div>
              <span className="text-[10px] text-amber-400/80 font-bold">{pendingCount} Pending Response</span>
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

      {/* Inquiries & Support Tab (Contact Us History) */}
      {activeTab === 'inquiries' && (
        <div className="space-y-4">
          
          {/* Top Control Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Filter:</span>
              {(['ALL', 'PENDING', 'RESOLVED'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setInquiryFilter(filter)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    inquiryFilter === filter
                      ? 'bg-amber-500 text-black shadow-glow'
                      : 'bg-slate-900 border border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {filter === 'ALL' ? `All Inquiries (${inquiries.length})` : filter === 'PENDING' ? `Pending (${pendingCount})` : `Resolved (${inquiries.length - pendingCount})`}
                </button>
              ))}
            </div>

            <button
              onClick={loadAdminData}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Inquiries</span>
            </button>
          </div>

          {/* Inquiries Table */}
          <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
            {filteredInquiries.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <MessageSquare className="h-10 w-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold">No contact inquiries found</p>
                <p className="text-xs text-slate-500">Inquiries submitted on the Contact Us page will automatically appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/5 bg-slate-900/40 text-slate-400 font-semibold uppercase text-[10px] font-mono">
                    <tr>
                      <th className="p-4">Sender</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Order Ref</th>
                      <th className="p-4">Message Snippet</th>
                      <th className="p-4">Received Time</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredInquiries.map((inq) => (
                      <tr key={inq.id} className="hover:bg-white/[0.02] transition">
                        <td className="p-4">
                          <div className="font-bold text-white">{inq.name}</div>
                          <a 
                            href={`mailto:${inq.email}?subject=Re: PayVia Support Inquiry (${inq.id})`}
                            className="text-[11px] font-mono text-emerald-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                          >
                            <span>{inq.email}</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </td>

                        <td className="p-4">
                          <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 uppercase">
                            {inq.subject || 'General'}
                          </span>
                        </td>

                        <td className="p-4 font-mono">
                          {inq.orderId ? (
                            <span className="rounded bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-[10px] text-indigo-300 font-bold">
                              {inq.orderId}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>

                        <td className="p-4 max-w-xs">
                          <p className="text-slate-300 truncate cursor-pointer hover:text-white" onClick={() => {
                            setSelectedInquiry(inq);
                            setReplyNotes(inq.replyNotes || '');
                          }}>
                            {inq.message}
                          </p>
                        </td>

                        <td className="p-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {inq.createdAt ? new Date(inq.createdAt).toLocaleString() : '—'}
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            inq.status === 'RESOLVED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                          }`}>
                            {inq.status === 'RESOLVED' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            <span>{inq.status}</span>
                          </span>
                        </td>

                        <td className="p-4 text-right whitespace-nowrap space-x-1.5">
                          <button
                            onClick={() => handleToggleInquiryStatus(inq)}
                            title={inq.status === 'RESOLVED' ? 'Mark as Pending' : 'Mark as Resolved'}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                              inq.status === 'RESOLVED'
                                ? 'bg-slate-800 text-slate-400 hover:text-white'
                                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-glow'
                            }`}
                          >
                            {inq.status === 'RESOLVED' ? 'Reopen' : 'Resolve'}
                          </button>

                          <button
                            onClick={() => {
                              setSelectedInquiry(inq);
                              setReplyNotes(inq.replyNotes || '');
                            }}
                            className="rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/50 px-2.5 py-1 text-[11px] font-semibold transition"
                          >
                            View & Notes
                          </button>

                          <button
                            onClick={() => handleDeleteInquiry(inq.id)}
                            className="rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-400 hover:bg-rose-600/40 p-1.5 transition"
                            title="Delete Inquiry"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Inquiry Detail & Internal Notes Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-2xl glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/30 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-400" />
                <h3 className="font-display text-lg font-bold text-white">Contact Inquiry Details</h3>
              </div>
              <button 
                onClick={() => setSelectedInquiry(null)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Sender Details Header */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-900/80 p-4 rounded-2xl border border-white/5">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Sender Name</span>
                <span className="text-white font-bold">{selectedInquiry.name}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Email Address</span>
                <a href={`mailto:${selectedInquiry.email}`} className="text-emerald-400 font-mono hover:underline">{selectedInquiry.email}</a>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Topic / Subject</span>
                <span className="text-purple-300 uppercase font-bold">{selectedInquiry.subject}</span>
              </div>
              {selectedInquiry.orderId && (
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Order Reference</span>
                  <span className="text-indigo-400 font-mono font-bold">{selectedInquiry.orderId}</span>
                </div>
              )}
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Submission IP</span>
                <span className="text-slate-300 font-mono">{selectedInquiry.ipAddress || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Date & Time</span>
                <span className="text-slate-300 font-mono">{new Date(selectedInquiry.createdAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Full Message Text */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 uppercase">Customer Message</label>
              <div className="p-4 rounded-2xl bg-black/50 border border-emerald-500/20 text-emerald-100 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                {selectedInquiry.message}
              </div>
            </div>

            {/* Internal Staff Notes */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 uppercase">Admin Internal Notes & Follow-up Log</label>
              <textarea
                rows={3}
                placeholder="e.g. Contacted user on WhatsApp / Sent pairing guide via email on 16-Sep..."
                value={replyNotes}
                onChange={(e) => setReplyNotes(e.target.value)}
                className="w-full rounded-2xl bg-slate-900 border border-white/10 p-3.5 text-xs text-white focus:border-emerald-400 focus:outline-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleInquiryStatus(selectedInquiry);
                    setSelectedInquiry({
                      ...selectedInquiry,
                      status: selectedInquiry.status === 'RESOLVED' ? 'PENDING' : 'RESOLVED'
                    });
                  }}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                    selectedInquiry.status === 'RESOLVED'
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-emerald-600 text-white shadow-glow'
                  }`}
                >
                  {selectedInquiry.status === 'RESOLVED' ? 'Reopen Inquiry' : '✓ Mark as Resolved'}
                </button>

                <a
                  href={`mailto:${selectedInquiry.email}?subject=Re: PayVia Inquiry (${selectedInquiry.subject})&body=Hi ${selectedInquiry.name},%0D%0A%0D%0AThank you for contacting PayVia Support regarding your inquiry...`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-600/50 px-4 py-2 text-xs font-bold transition inline-flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Reply via Email</span>
                </a>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInquiry(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveReplyNotes}
                  className="rounded-xl bg-gradient-primary px-5 py-2 text-xs font-bold text-black shadow-glow"
                >
                  Save Notes
                </button>
              </div>
            </div>

          </div>
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
