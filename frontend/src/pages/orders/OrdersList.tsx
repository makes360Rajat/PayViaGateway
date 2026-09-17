import React, { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';
import { Order, OrderStatus, PaymentProviderType } from '../../types';
import { CreatePaymentLinkModal } from '../../components/orders/CreatePaymentLinkModal';
import { formatIST } from '../../utils/dateUtils';
import { 
  Receipt, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ExternalLink, 
  ShieldAlert, 
  Sparkles, 
  RefreshCw,
  Plus
} from 'lucide-react';

export const OrdersList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [providerFilter, setProviderFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Force verify modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [manualUtr, setManualUtr] = useState('');
  const [isSettling, setIsSettling] = useState(false);

  const loadOrders = async () => {
    setIsLoading(true);
    const res = await ApiService.getOrders({
      status: statusFilter,
      provider: providerFilter,
      search: searchQuery
    });
    if (res.status && res.data) {
      setOrders(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, providerFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  const handleForceSettle = async () => {
    if (!selectedOrder) return;
    setIsSettling(true);
    const res = await ApiService.forceVerifyOrder(selectedOrder.id, manualUtr);
    setIsSettling(false);

    if (res.status) {
      setSelectedOrder(null);
      setManualUtr('');
      loadOrders();
    } else {
      alert(res.error || 'Failed to force settle order');
    }
  };

  const handleCancelOrder = async (id: string) => {
    if (confirm('Cancel this order? The payment link will expire immediately.')) {
      await ApiService.cancelOrder(id);
      loadOrders();
    }
  };

  const exportCsv = () => {
    const headers = ['Order ID', 'Amount', 'Provider', 'Status', 'UTR', 'Customer Mobile', 'Remark', 'Created At'];
    const rows = orders.map(o => [
      o.orderId,
      o.amount,
      o.provider,
      o.status,
      o.utr || '',
      o.customerMobile || '',
      o.remark1 || '',
      o.createdAt
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `orders_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusBadges = {
    TXN_SUCCESS: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    AWAITING_VERIFY: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    FAILED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    EXPIRED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    CANCELLED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };

  return (
    <div className="space-y-6">
      
      {/* Create Payment Link Modal */}
      <CreatePaymentLinkModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onOrderCreated={() => loadOrders()}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white">Orders & Transaction Records</h1>
            <span className="rounded-full bg-purple-500/10 border border-purple-500/30 px-2.5 py-0.5 text-xs font-mono text-purple-400">
              {orders.length} Total
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Real-time status tracking, automated UTR matching, manual reconciliation, and webhook dispatch audits.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-primary px-4 py-2 text-xs font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Payment Link</span>
          </button>

          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
          
          <button
            onClick={loadOrders}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 text-xs font-semibold">
          {['ALL', 'PENDING', 'TXN_SUCCESS', 'FAILED', 'EXPIRED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 transition ${
                statusFilter === st 
                  ? 'bg-indigo-600 text-white shadow-glow' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {st === 'ALL' ? 'All Orders' : st}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-72">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search Order ID, UTR, Mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-white/10 pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-slate-800 border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            Search
          </button>
        </form>
      </div>

      {/* Orders Data Table */}
      <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/5 bg-slate-900/40 text-slate-400 font-semibold uppercase text-[10px] font-mono">
              <tr>
                <th className="p-4">Order ID</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Provider / Merchant</th>
                <th className="p-4">Status</th>
                <th className="p-4">UTR Number</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Created At</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500 font-sans">
                    No matching orders found.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-white/[0.02] transition">
                    <td className="p-4 font-bold text-white">
                      <a 
                        href={o.paymentUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="hover:text-indigo-400 flex items-center gap-1.5 underline decoration-indigo-500/30"
                      >
                        <span>{o.orderId}</span>
                        <ExternalLink className="h-3 w-3 text-slate-500" />
                      </a>
                    </td>
                    <td className="p-4 font-bold text-slate-100 font-sans">
                      ₹{o.amount.toFixed(2)}
                    </td>
                    <td className="p-4">
                      <div>
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                          {o.provider}
                        </span>
                        <div className="text-[10px] text-slate-500 truncate max-w-[120px] mt-0.5 font-sans">
                          {o.merchantAccountLabel}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-sans">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusBadges[o.status] || 'text-slate-400'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {o.utr ? (
                        <span className="text-emerald-400 font-bold">{o.utr}</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="p-4 font-sans">
                      <div className="text-slate-300 font-medium">{o.customerName || 'Direct Payer'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{o.customerMobile || '—'}</div>
                    </td>
                    <td className="p-4 text-[11px] text-slate-400 whitespace-nowrap">
                      {formatIST(o.createdAt)}
                    </td>
                    <td className="p-4 text-right space-x-1 font-sans">
                      {(o.status === 'PENDING' || o.status === 'EXPIRED' || o.status === 'AWAITING_VERIFY') && (
                        <>
                          <button
                            onClick={() => { setSelectedOrder(o); setManualUtr(''); }}
                            className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20 transition"
                          >
                            {o.status === 'EXPIRED' ? 'Verify / Settle' : 'Force Settle'}
                          </button>
                          {o.status === 'PENDING' && (
                            <button
                              onClick={() => handleCancelOrder(o.id)}
                              className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-2 py-1 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/20 transition"
                            >
                              Cancel
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Force Settle Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-emerald-500/30 shadow-2xl">
            <h3 className="font-bold text-base text-white">Manual Reconciliation & Force Settle</h3>
            <p className="text-xs text-slate-400 mt-1">
              Mark Order <span className="font-mono text-indigo-300">{selectedOrder.orderId}</span> (₹{selectedOrder.amount.toFixed(2)}) as SUCCESS and dispatch webhook.
            </p>

            <div className="my-4">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Bank UTR / Transaction Reference
              </label>
              <input
                type="text"
                placeholder="e.g. 419827391823"
                value={manualUtr}
                onChange={(e) => setManualUtr(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleForceSettle}
                disabled={isSettling}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-bold text-white shadow-glow disabled:opacity-50"
              >
                {isSettling ? 'Settling...' : 'Confirm Settle →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
