import React, { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
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
  Filter,
  Smartphone,
  CreditCard,
  Building2,
  Eye,
  Key,
  Globe,
  Sliders,
  Battery,
  Wifi,
  WifiOff,
  ChevronRight,
  UserCheck,
  Power,
  Edit2,
  Sparkles,
  ArrowRightLeft
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { impersonate } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'orders' | 'plans' | 'inquiries'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Search and filters for Users
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'MERCHANT' | 'SUPER_ADMIN'>('ALL');

  // Search and filters for Orders
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | 'TXN_SUCCESS' | 'PENDING' | 'FAILED'>('ALL');

  // Search and filters for Inquiries
  const [inquiryFilter, setInquiryFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('ALL');
  const [selectedInquiry, setSelectedInquiry] = useState<any | null>(null);
  const [replyNotes, setReplyNotes] = useState('');

  // Deep Inspection Modal for a Specific Tenant
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
  const [tenantDetails, setTenantDetails] = useState<any | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [drawerActiveTab, setDrawerActiveTab] = useState<'gateways' | 'devices' | 'plan' | 'orders' | 'keys'>('gateways');

  // New Merchant Gateway Account Modal under inspected tenant
  const [showAddGatewayModal, setShowAddGatewayModal] = useState(false);
  const [newGatewayProvider, setNewGatewayProvider] = useState('CUSTOM_UPI');
  const [newGatewayUpiId, setNewGatewayUpiId] = useState('');
  const [newGatewayLabel, setNewGatewayLabel] = useState('');
  const [newGatewayDisplayName, setNewGatewayDisplayName] = useState('');

  // New Subscription Plan Modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('1999');
  const [planValidity, setPlanValidity] = useState('30');
  const [maxMerchants, setMaxMerchants] = useState('10');
  const [maxOrders, setMaxOrders] = useState('2000');
  const [maxKeys, setMaxKeys] = useState('5');

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, usersRes, ordersRes, contactsRes, plansRes] = await Promise.all([
        ApiService.getAdminStats(),
        ApiService.getAdminUsers(),
        ApiService.getAdminOrders({ limit: 100 }),
        ApiService.getAdminContacts(),
        ApiService.getAdminPlans()
      ]);

      if (statsRes.status) setStats(statsRes.data);
      if (usersRes.status) setUsers(usersRes.data || []);
      if (ordersRes.status) setOrders(ordersRes.data || []);
      if (contactsRes.status) setInquiries(contactsRes.data || []);
      if (plansRes.status) setPlans(plansRes.data || []);
    } catch (e) {
      console.error('Failed loading admin data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const openTenantInspection = async (user: any) => {
    setSelectedTenant(user);
    setDrawerActiveTab('gateways');
    setIsDetailsLoading(true);
    try {
      const res = await ApiService.getAdminUserDetails(user.id);
      if (res.status && res.data) {
        setTenantDetails(res.data);
      } else {
        // Fallback to local snapshot
        setTenantDetails({
          tenant: user,
          merchants: user.merchants || [],
          devices: user.devices || [],
          apiKeys: [],
          orders: []
        });
      }
    } catch (e) {
      setTenantDetails({
        tenant: user,
        merchants: user.merchants || [],
        devices: user.devices || [],
        apiKeys: [],
        orders: []
      });
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleToggleUser = async (user: any) => {
    const nextStatus = !user.isActive;
    await ApiService.updateAdminUser(user.id, { isActive: nextStatus });
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: nextStatus } : u));
    if (selectedTenant?.id === user.id) {
      setSelectedTenant({ ...selectedTenant, isActive: nextStatus });
    }
  };

  const handleChangeUserPlan = async (userId: string, newPlanId: string) => {
    await ApiService.updateAdminUser(userId, { planId: newPlanId });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlanId } : u));
    if (selectedTenant?.id === userId) {
      setSelectedTenant({ ...selectedTenant, plan: newPlanId });
    }
    alert('Tenant subscription plan updated successfully!');
  };

  const handleImpersonateTenant = async (tenantId: string) => {
    try {
      const res = await ApiService.impersonateTenant(tenantId);
      if (res.status && res.data?.token) {
        await impersonate(res.data.token);
        window.location.href = '/dashboard';
      } else {
        alert(res.error || 'Failed to switch workspace');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to switch workspace');
    }
  };

  const handleAddGatewayForTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    if (!newGatewayUpiId.trim()) {
      alert('Please enter a valid UPI ID');
      return;
    }

    const res = await ApiService.createAdminMerchant(selectedTenant.id, {
      provider: newGatewayProvider,
      upiId: newGatewayUpiId.trim(),
      label: newGatewayLabel.trim() || `${newGatewayProvider} Gateway`,
      displayName: newGatewayDisplayName.trim() || selectedTenant.businessName
    });

    if (res.status) {
      setShowAddGatewayModal(false);
      setNewGatewayUpiId('');
      setNewGatewayLabel('');
      setNewGatewayDisplayName('');
      alert('Merchant UPI Gateway connected successfully!');
      // Refresh inspection details
      openTenantInspection(selectedTenant);
      loadAdminData();
    } else {
      alert(res.error || 'Failed to connect gateway');
    }
  };

  const handleToggleMerchantGateway = async (merchantId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    const res = await ApiService.updateAdminMerchant(merchantId, { status: nextStatus });
    if (res.status) {
      if (tenantDetails?.merchants) {
        setTenantDetails({
          ...tenantDetails,
          merchants: tenantDetails.merchants.map((m: any) => m.id === merchantId ? { ...m, status: nextStatus } : m)
        });
      }
      loadAdminData();
    }
  };

  const handleDeleteMerchantGateway = async (merchantId: string) => {
    if (!window.confirm('Are you sure you want to delete this UPI Gateway account from the merchant?')) return;
    const res = await ApiService.deleteAdminMerchant(merchantId);
    if (res.status) {
      if (tenantDetails?.merchants) {
        setTenantDetails({
          ...tenantDetails,
          merchants: tenantDetails.merchants.filter((m: any) => m.id !== merchantId)
        });
      }
      loadAdminData();
    }
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
      loadAdminData();
    }
  };

  const pendingCount = inquiries.filter(i => i.status === 'PENDING').length;
  const filteredInquiries = inquiries.filter(i => {
    if (inquiryFilter === 'PENDING') return i.status === 'PENDING';
    if (inquiryFilter === 'RESOLVED') return i.status === 'RESOLVED';
    return true;
  });

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.businessName || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.phone || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.merchants || []).some((m: any) => (m.upiId || '').toLowerCase().includes(userSearch.toLowerCase()));

    const matchesStatus = 
      userStatusFilter === 'ALL' ? true :
      userStatusFilter === 'ACTIVE' ? u.isActive :
      !u.isActive;

    const matchesRole = 
      userRoleFilter === 'ALL' ? true :
      u.role === userRoleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      (o.orderId || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.utr || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.tenantEmail || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.tenantBusiness || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.upiId || '').toLowerCase().includes(orderSearch.toLowerCase());

    const matchesStatus = 
      orderStatusFilter === 'ALL' ? true :
      o.status === orderStatusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-rose-500/20 bg-rose-950/10 shadow-2xl">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-rose-400 animate-pulse" />
            <h1 className="font-display text-2xl font-bold text-white">Super Admin Control Center</h1>
            <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 text-xs font-mono text-rose-300 font-bold">
              PLATFORM ROOT & GOVERNANCE
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Comprehensive oversight over all merchant accounts, connected UPI gateways, Android companion devices, plan overrides & workspace controls.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'users', label: 'Merchants & Accounts', icon: Users, count: users.length },
            { id: 'orders', label: 'Global Orders', icon: Receipt },
            { id: 'plans', label: 'Subscription Plans', icon: Sliders },
            { id: 'inquiries', label: 'Inquiries & Support', icon: MessageSquare, count: pendingCount }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-rose-600 text-white shadow-glow'
                    : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="h-4 min-w-[16px] px-1 rounded-full bg-amber-500 text-black text-[10px] font-extrabold flex items-center justify-center">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-white/5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Gross Platform GMV</span>
              <div className="mt-2 text-2xl font-bold text-white font-display">₹{stats.totalVolume?.toFixed(2) || '0.00'}</div>
              <span className="text-[10px] text-emerald-400 font-mono">₹{stats.todayVolume?.toFixed(2) || '0.00'} Today</span>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/5 cursor-pointer hover:border-indigo-500/40 transition" onClick={() => setActiveTab('users')}>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Merchants</span>
              <div className="mt-2 text-2xl font-bold text-indigo-400 font-display">{stats.totalTenants}</div>
              <span className="text-[10px] text-indigo-300">{stats.activeTenants} Active Workspaces</span>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Connected UPI Gateways</span>
              <div className="mt-2 text-2xl font-bold text-purple-400 font-display">{stats.totalMerchants}</div>
              <span className="text-[10px] text-purple-300">{stats.activeMerchants} Active Gateways</span>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Companion Devices</span>
              <div className="mt-2 text-2xl font-bold text-cyan-400 font-display">{stats.totalDevices || 0}</div>
              <span className="text-[10px] text-cyan-300">{stats.onlineDevices || 0} Live Online</span>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Global Success Rate</span>
              <div className="mt-2 text-2xl font-bold text-emerald-400 font-display">{stats.successRate}%</div>
              <span className="text-[10px] text-slate-400">{stats.totalOrders} Total Orders</span>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-amber-500/20 bg-amber-950/10 cursor-pointer hover:border-amber-500/40 transition" onClick={() => setActiveTab('inquiries')}>
              <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Customer Inquiries</span>
              <div className="mt-2 text-2xl font-bold text-amber-300 font-display">{inquiries.length}</div>
              <span className="text-[10px] text-amber-400/80 font-bold">{pendingCount} Pending Response</span>
            </div>
          </div>

          {/* Connected Gateway Providers Breakdown */}
          {stats.providersDistribution && stats.providersDistribution.length > 0 && (
            <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-purple-400" />
                  <span>Gateway Provider Ecosystem Distribution</span>
                </h3>
                <span className="text-xs text-slate-400">Total {stats.totalMerchants} Active Merchant Endpoints</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {stats.providersDistribution.map((p: any, idx: number) => (
                  <div key={idx} className="bg-slate-900/80 border border-white/5 p-3 rounded-2xl space-y-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block truncate">{p.provider}</span>
                    <div className="text-lg font-bold text-white font-mono">{p.count} Accounts</div>
                    <span className="text-[10px] text-emerald-400 font-mono">{p.sms_count || 0} Captures</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. MERCHANTS & ACCOUNTS MANAGEMENT TAB */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          
          {/* Search & Filter Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by business, email, phone or UPI ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
              <div className="flex items-center gap-1 bg-slate-900 border border-white/10 p-1 rounded-xl text-xs">
                <span className="text-[10px] font-bold text-slate-400 px-2 uppercase">Status:</span>
                {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setUserStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      userStatusFilter === st ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-slate-900 border border-white/10 p-1 rounded-xl text-xs">
                <span className="text-[10px] font-bold text-slate-400 px-2 uppercase">Role:</span>
                {(['ALL', 'MERCHANT', 'SUPER_ADMIN'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setUserRoleFilter(r)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      userRoleFilter === r ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <button
                onClick={loadAdminData}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Merchants Table */}
          <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/5 bg-slate-900/60 text-slate-400 font-semibold uppercase text-[10px] font-mono">
                  <tr>
                    <th className="p-4">Merchant Business & Owner</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Connected UPI Accounts</th>
                    <th className="p-4">Companion Devices</th>
                    <th className="p-4">Active Plan & Limits</th>
                    <th className="p-4">GMV Volume</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Super Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No merchants found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const merchantList = u.merchants || [];
                      const deviceList = u.devices || [];
                      const isSuperAdmin = u.role === 'SUPER_ADMIN';

                      return (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition">
                          {/* Business & Owner Info */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-rose-500/20 border border-white/10 flex items-center justify-center font-bold text-white shrink-0">
                                {u.businessName ? u.businessName.charAt(0).toUpperCase() : u.name?.charAt(0).toUpperCase() || 'M'}
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  <span>{u.businessName || u.name}</span>
                                  {isSuperAdmin && (
                                    <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] px-1.5 py-0.2 rounded font-mono">
                                      ADMIN
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] font-mono text-slate-400">{u.email}</div>
                                {u.phone && <div className="text-[10px] text-slate-500 font-mono">{u.phone}</div>}
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="p-4 font-mono">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isSuperAdmin ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            }`}>
                              {u.role}
                            </span>
                          </td>

                          {/* Connected Accounts */}
                          <td className="p-4">
                            <div className="space-y-1 max-w-xs">
                              {merchantList.length === 0 ? (
                                <span className="text-slate-500 italic text-[11px]">No accounts linked</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {merchantList.slice(0, 3).map((m: any, idx: number) => (
                                    <span 
                                      key={idx} 
                                      title={m.upiId}
                                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-medium border ${
                                        m.status === 'ACTIVE' ? 'bg-purple-950/40 border-purple-500/30 text-purple-200' : 'bg-slate-900 border-white/10 text-slate-500 line-through'
                                      }`}
                                    >
                                      <span className={`h-1.5 w-1.5 rounded-full ${m.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                                      <span>{m.provider}</span>
                                    </span>
                                  ))}
                                  {merchantList.length > 3 && (
                                    <span className="text-[10px] text-slate-400 font-mono">+{merchantList.length - 3} more</span>
                                  )}
                                </div>
                              )}
                              <div className="text-[10px] text-slate-400 font-mono">
                                Total {u.merchantAccountsCount} Gateway Accounts
                              </div>
                            </div>
                          </td>

                          {/* Companion Devices */}
                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <Smartphone className="h-3.5 w-3.5 text-cyan-400" />
                                <span className="font-mono text-white font-semibold">{deviceList.length} Devices</span>
                              </div>
                              {deviceList.length > 0 && (
                                <div className="flex items-center gap-1 text-[10px]">
                                  <span className={`h-2 w-2 rounded-full ${u.onlineDevicesCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
                                  <span className={u.onlineDevicesCount > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                                    {u.onlineDevicesCount} Online
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Active Plan & Limits */}
                          <td className="p-4">
                            <div className="space-y-1">
                              <select
                                value={u.plan}
                                onChange={(e) => handleChangeUserPlan(u.id, e.target.value)}
                                className="rounded-lg bg-slate-900 border border-purple-500/30 text-purple-300 text-[11px] font-semibold px-2 py-1 focus:outline-none focus:border-purple-400"
                              >
                                <option value="plan_starter">Starter (₹0)</option>
                                <option value="plan_growth">Growth Tier (₹999)</option>
                                <option value="plan_pro">Pro Tier (₹1,499)</option>
                                <option value="plan_scale">Scale Tier (₹2,999)</option>
                                <option value="plan_vip">VIP Custom (₹4,999)</option>
                                <option value="plan_unlimited">Enterprise Unlimited (₹9,999)</option>
                              </select>
                            </div>
                          </td>

                          {/* Total Volume */}
                          <td className="p-4">
                            <div className="font-bold text-white font-mono">₹{u.totalVolume?.toFixed(2) || '0.00'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{u.totalOrdersCount || 0} Orders</div>
                          </td>

                          {/* Status */}
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              u.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                              <span>{u.isActive ? 'ACTIVE' : 'SUSPENDED'}</span>
                            </span>
                          </td>

                          {/* Super Admin Actions */}
                          <td className="p-4 text-right whitespace-nowrap space-x-1.5">
                            <button
                              onClick={() => openTenantInspection(u)}
                              className="rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/50 px-2.5 py-1 text-[11px] font-semibold transition inline-flex items-center gap-1"
                              title="Inspect All Accounts & Devices"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Inspect & Control</span>
                            </button>

                            <button
                              onClick={() => handleImpersonateTenant(u.id)}
                              className="rounded-lg bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/50 px-2.5 py-1 text-[11px] font-semibold transition inline-flex items-center gap-1"
                              title="Open and control merchant portal with 1-click"
                            >
                              <ArrowRightLeft className="h-3 w-3" />
                              <span>Manage Workspace</span>
                            </button>

                            {!isSuperAdmin && (
                              <button
                                onClick={() => handleToggleUser(u)}
                                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                                  u.isActive ? 'bg-slate-800 text-slate-300 hover:bg-rose-900/50 hover:text-rose-200' : 'bg-emerald-600 text-white hover:bg-emerald-500'
                                }`}
                              >
                                {u.isActive ? 'Suspend' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. GLOBAL ORDERS FIREHOSE TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search Order ID, UTR, Tenant Email..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-white/10 pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Status:</span>
              {(['ALL', 'TXN_SUCCESS', 'PENDING', 'FAILED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setOrderStatusFilter(st)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    orderStatusFilter === st
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-900 border border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-white/5 bg-slate-900/60 text-slate-400 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-4">Order Reference</th>
                    <th className="p-4">Merchant / Tenant</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Provider</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Bank UTR</th>
                    <th className="p-4">Created Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-white/[0.02] transition">
                      <td className="p-4 font-bold text-indigo-400">{o.orderId}</td>
                      <td className="p-4 font-sans">
                        <div className="font-bold text-white">{o.tenantBusiness || 'Direct Merchant'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{o.tenantEmail}</div>
                      </td>
                      <td className="p-4 font-bold text-white">₹{o.amount.toFixed(2)}</td>
                      <td className="p-4 text-purple-300">{o.provider}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          o.status === 'TXN_SUCCESS' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="p-4 text-emerald-400 font-bold">{o.utr || '—'}</td>
                      <td className="p-4 text-slate-400 text-[11px] whitespace-nowrap">{new Date(o.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. PLANS MANAGEMENT TAB */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-white">Manage Platform Subscription Plans</h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure account limits, validity, and feature tiers for all merchants under Super Admin.
              </p>
            </div>
            <button
              onClick={() => setShowPlanModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-glow hover:bg-rose-500 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create Custom Plan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((p) => (
              <div key={p.id} className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 hover:border-purple-500/40 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-display text-lg font-bold text-white">{p.name}</h4>
                    <span className="text-xs font-mono text-purple-400">{p.id}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-emerald-400 font-mono">₹{p.price}</span>
                    <span className="text-[10px] text-slate-400 block">/ {p.validity_days || 30} days</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Max Gateway Accounts:</span>
                    <span className="font-bold text-white">{p.max_merchant_accounts || 'Unlimited'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Max Orders / Day:</span>
                    <span className="font-bold text-white">{p.max_orders_per_day || 'Unlimited'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Max API Keys:</span>
                    <span className="font-bold text-white">{p.max_api_keys || 5}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. INQUIRIES & SUPPORT TAB */}
      {activeTab === 'inquiries' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Filter:</span>
              {(['ALL', 'PENDING', 'RESOLVED'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setInquiryFilter(filter)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    inquiryFilter === filter
                      ? 'bg-amber-500 text-black shadow-glow font-bold'
                      : 'bg-slate-900 border border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {filter === 'ALL' ? `All (${inquiries.length})` : filter === 'PENDING' ? `Pending (${pendingCount})` : `Resolved (${inquiries.length - pendingCount})`}
                </button>
              ))}
            </div>

            <button
              onClick={loadAdminData}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
            {filteredInquiries.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <MessageSquare className="h-10 w-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold">No contact inquiries found</p>
                <p className="text-xs text-slate-500">Inquiries submitted on the Contact Us page will automatically appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/5 bg-slate-900/60 text-slate-400 font-semibold uppercase text-[10px] font-mono">
                    <tr>
                      <th className="p-4">Sender</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Order Ref</th>
                      <th className="p-4">Message</th>
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

      {/* ------------------------------------------------------------- */}
      {/* 6. DEEP MERCHANT ACCOUNT INSPECTION & CONTROL MODAL / DRAWER */}
      {/* ------------------------------------------------------------- */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-4xl glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/30 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-indigo-500/40 flex items-center justify-center font-display text-xl font-bold text-white shadow-glow">
                  {selectedTenant.businessName ? selectedTenant.businessName.charAt(0).toUpperCase() : 'M'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-xl font-bold text-white">
                      {selectedTenant.businessName || selectedTenant.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {selectedTenant.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {selectedTenant.email} {selectedTenant.phone ? `• ${selectedTenant.phone}` : ''} • ID: {selectedTenant.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleImpersonateTenant(selectedTenant.id)}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-glow hover:bg-emerald-500 transition flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>Log in as Merchant</span>
                </button>
                <button
                  onClick={() => setSelectedTenant(null)}
                  className="text-slate-400 hover:text-white text-lg p-1.5 rounded-lg bg-slate-900 border border-white/10"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900/80 border border-white/5 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total GMV</span>
                <span className="text-lg font-bold text-white font-mono">₹{selectedTenant.totalVolume?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="bg-slate-900/80 border border-white/5 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Connected Gateways</span>
                <span className="text-lg font-bold text-purple-400 font-mono">
                  {tenantDetails?.merchants?.length || selectedTenant.merchantAccountsCount || 0} Accounts
                </span>
              </div>
              <div className="bg-slate-900/80 border border-white/5 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Companion Devices</span>
                <span className="text-lg font-bold text-cyan-400 font-mono">
                  {tenantDetails?.devices?.length || selectedTenant.devicesCount || 0} Paired
                </span>
              </div>
              <div className="bg-slate-900/80 border border-white/5 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Current Plan</span>
                <span className="text-sm font-bold text-purple-300 font-mono block mt-1">
                  {selectedTenant.plan}
                </span>
              </div>
            </div>

            {/* Drawer Tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-2 flex-wrap">
              {[
                { id: 'gateways', label: 'Connected Gateways', icon: CreditCard, count: tenantDetails?.merchants?.length || 0 },
                { id: 'devices', label: 'Companion Devices', icon: Smartphone, count: tenantDetails?.devices?.length || 0 },
                { id: 'plan', label: 'Plan & Limits', icon: Sliders },
                { id: 'orders', label: 'Recent Orders', icon: Receipt, count: tenantDetails?.orders?.length || 0 },
                { id: 'keys', label: 'API Keys & Webhooks', icon: Key }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setDrawerActiveTab(tab.id as any)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition flex items-center gap-1.5 ${
                      drawerActiveTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-glow'
                        : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="h-4 min-w-[16px] px-1 rounded-full bg-indigo-400/30 text-indigo-200 text-[10px] font-bold flex items-center justify-center">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Connected UPI Gateway Accounts */}
            {drawerActiveTab === 'gateways' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-white">UPI Merchant Gateway Accounts Working Under Tenant</h4>
                  <button
                    onClick={() => setShowAddGatewayModal(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-glow hover:bg-purple-500 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add Gateway for Merchant</span>
                  </button>
                </div>

                {(!tenantDetails?.merchants || tenantDetails.merchants.length === 0) ? (
                  <div className="py-12 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-white/5 space-y-2">
                    <CreditCard className="h-8 w-8 text-slate-600 mx-auto" />
                    <p className="text-xs">No UPI Gateway accounts linked under this merchant yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tenantDetails.merchants.map((m: any) => (
                      <div key={m.id} className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3 bg-slate-900/60">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-purple-300">
                              {m.provider}
                            </span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[9px] font-bold ${
                              m.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'
                            }`}>
                              {m.status}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleMerchantGateway(m.id, m.status)}
                              className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
                            >
                              {m.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => handleDeleteMerchantGateway(m.id)}
                              className="text-rose-400 hover:text-rose-300 p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">VPA / UPI ID</span>
                          <span className="text-white font-mono font-bold text-xs">{m.upi_id || m.upiId}</span>
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-white/5 font-mono">
                          <span>Label: {m.label || m.displayName || 'Default'}</span>
                          <span>SMS Captured: {m.sms_count || m.smsCount || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Companion Devices */}
            {drawerActiveTab === 'devices' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white">Android Companion Devices Paired with Tenant</h4>

                {(!tenantDetails?.devices || tenantDetails.devices.length === 0) ? (
                  <div className="py-12 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-white/5 space-y-2">
                    <Smartphone className="h-8 w-8 text-slate-600 mx-auto" />
                    <p className="text-xs">No Android companion devices paired to this tenant workspace.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tenantDetails.devices.map((d: any) => (
                      <div key={d.id} className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3 bg-slate-900/60">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-cyan-400" />
                            <span className="font-bold text-white text-xs">{d.device_name || d.deviceName || 'Android Device'}</span>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                            d.is_online || d.isOnline ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-500'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${d.is_online || d.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
                            <span>{d.is_online || d.isOnline ? 'LIVE ONLINE' : 'OFFLINE'}</span>
                          </span>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>Battery Level:</span>
                            <span className="font-mono text-white font-bold">{d.battery_level || d.batteryLevel || 100}%</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Pairing Code:</span>
                            <span className="font-mono text-cyan-300 font-bold">{d.pairing_code || d.pairingCode || '—'}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>SMS Notifications Processed:</span>
                            <span className="font-mono text-emerald-400 font-bold">{d.sms_captured_count || d.smsCapturedCount || 0}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Last Heartbeat:</span>
                            <span className="font-mono text-slate-300 text-[10px]">
                              {(d.last_heartbeat_at || d.lastHeartbeatAt) ? new Date(d.last_heartbeat_at || d.lastHeartbeatAt).toLocaleTimeString() : 'Never'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Plan & Limits */}
            {drawerActiveTab === 'plan' && (
              <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4 bg-slate-900/60">
                <h4 className="text-sm font-bold text-white">Manage Tenant Subscription Plan</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1.5">Assign Subscription Tier</label>
                    <select
                      value={selectedTenant.plan}
                      onChange={(e) => handleChangeUserPlan(selectedTenant.id, e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-purple-500/40 p-3 text-xs text-purple-300 font-bold focus:outline-none"
                    >
                      <option value="plan_starter">Starter Tier (₹0/mo - 1 Account, 100 txns/day)</option>
                      <option value="plan_growth">Growth Tier (₹999/mo - 3 Accounts, 500 txns/day)</option>
                      <option value="plan_pro">Pro Tier (₹1,499/mo - 5 Accounts, 1000 txns/day)</option>
                      <option value="plan_scale">Scale Tier (₹2,999/mo - 10 Accounts, 3000 txns/day)</option>
                      <option value="plan_vip">VIP Custom (₹4,999/mo - 25 Accounts, 10000 txns/day)</option>
                      <option value="plan_unlimited">Enterprise Unlimited (₹9,999/mo - Unlimited Everything)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1.5">Tenant Operational Status</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleUser(selectedTenant)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                          selectedTenant.isActive
                            ? 'bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:bg-rose-600/50'
                            : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-glow'
                        }`}
                      >
                        <Power className="h-4 w-4" />
                        <span>{selectedTenant.isActive ? 'Suspend Merchant Workspace' : 'Activate Merchant Workspace'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Recent Orders */}
            {drawerActiveTab === 'orders' && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white">Recent Payment Transactions for this Merchant</h4>
                {(!tenantDetails?.orders || tenantDetails.orders.length === 0) ? (
                  <div className="py-12 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-white/5 space-y-2">
                    <Receipt className="h-8 w-8 text-slate-600 mx-auto" />
                    <p className="text-xs">No orders created by this merchant yet.</p>
                  </div>
                ) : (
                  <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="border-b border-white/5 bg-slate-900/40 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Order ID</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">UTR</th>
                          <th className="p-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {tenantDetails.orders.map((o: any) => (
                          <tr key={o.id}>
                            <td className="p-3 text-indigo-400 font-bold">{o.order_id || o.orderId}</td>
                            <td className="p-3 text-white font-bold">₹{parseFloat(o.amount).toFixed(2)}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                o.status === 'TXN_SUCCESS' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                              }`}>
                                {o.status}
                              </span>
                            </td>
                            <td className="p-3 text-emerald-400">{o.utr || '—'}</td>
                            <td className="p-3 text-slate-400 text-[10px]">{new Date(o.created_at || o.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab 5: API Keys & Webhooks */}
            {drawerActiveTab === 'keys' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white">Merchant Developer API Keys & Webhooks</h4>
                {(!tenantDetails?.apiKeys || tenantDetails.apiKeys.length === 0) ? (
                  <div className="py-8 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-white/5">
                    <Key className="h-6 w-6 text-slate-600 mx-auto mb-1" />
                    <p className="text-xs">No active API keys generated by this tenant.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tenantDetails.apiKeys.map((k: any) => (
                      <div key={k.id} className="p-3 rounded-xl bg-slate-900 border border-white/5 flex justify-between items-center text-xs font-mono">
                        <div>
                          <div className="text-white font-bold">{k.name}</div>
                          <div className="text-slate-400 text-[11px]">{k.key_prefix || k.keyPrefix || 'pk_live_...'}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                          {k.status || 'ACTIVE'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. ADD GATEWAY ACCOUNT FOR MERCHANT MODAL */}
      {/* ------------------------------------------------------------- */}
      {showAddGatewayModal && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-purple-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="font-bold text-base text-white">Connect Gateway for Merchant</h3>
                <p className="text-[11px] text-purple-300 font-mono">{selectedTenant.businessName || selectedTenant.name}</p>
              </div>
              <button onClick={() => setShowAddGatewayModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddGatewayForTenant} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 uppercase text-[10px] mb-1">Provider Engine</label>
                <select
                  value={newGatewayProvider}
                  onChange={(e) => setNewGatewayProvider(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white font-semibold"
                >
                  <option value="PAYTM_BUSINESS">Paytm for Business (Dynamic QR & Soundbox)</option>
                  <option value="BHARATPE">BharatPe Merchant (Direct QR)</option>
                  <option value="PHONEPE_MERCHANT">PhonePe for Business</option>
                  <option value="SBI_UPI">SBI UPI Merchant QR</option>
                  <option value="HDFC_SMARTHUB">HDFC SmartHub UPI</option>
                  <option value="GOOGLEPAY_FOR_BUSINESS">Google Pay Business</option>
                  <option value="FAMPAY">FamPay Direct Merchant</option>
                  <option value="CUSTOM_UPI">Custom Direct UPI / Any VPA</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 uppercase text-[10px] mb-1">UPI ID (VPA) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. merchant@paytm or shop@bharatpe"
                  value={newGatewayUpiId}
                  onChange={(e) => setNewGatewayUpiId(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 uppercase text-[10px] mb-1">Account Label</label>
                <input
                  type="text"
                  placeholder="e.g. Primary Store QR"
                  value={newGatewayLabel}
                  onChange={(e) => setNewGatewayLabel(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 uppercase text-[10px] mb-1">Business Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rajat Official Store"
                  value={newGatewayDisplayName}
                  onChange={(e) => setNewGatewayDisplayName(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddGatewayModal(false)}
                  className="rounded-xl px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-5 py-2 font-bold text-white shadow-glow hover:bg-purple-500 transition"
                >
                  Save & Connect Gateway
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. INQUIRY DETAIL & INTERNAL NOTES MODAL */}
      {/* ------------------------------------------------------------- */}
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

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 uppercase">Customer Message</label>
              <div className="p-4 rounded-2xl bg-black/50 border border-emerald-500/20 text-emerald-100 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                {selectedInquiry.message}
              </div>
            </div>

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

      {/* ------------------------------------------------------------- */}
      {/* 9. CREATE SUBSCRIPTION PLAN MODAL */}
      {/* ------------------------------------------------------------- */}
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
                  className="rounded-xl bg-rose-600 px-5 py-2 font-bold text-white shadow-glow hover:bg-rose-500 transition"
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
