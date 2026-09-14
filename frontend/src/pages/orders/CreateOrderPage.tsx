import React, { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';
import { MerchantAccount, Order } from '../../types';
import { 
  PlusCircle, 
  Copy, 
  CheckCircle2, 
  ExternalLink, 
  Sparkles, 
  Wallet, 
  Palette,
  QrCode,
  ArrowRight
} from 'lucide-react';

export const CreateOrderPage: React.FC = () => {
  const [merchants, setMerchants] = useState<MerchantAccount[]>([]);
  const [amount, setAmount] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [remark1, setRemark1] = useState('');
  const [returnUrl, setReturnUrl] = useState('');
  const [merchantAccountId, setMerchantAccountId] = useState('');
  const [template, setTemplate] = useState('template_1');

  const [isLoading, setIsLoading] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    ApiService.getMerchants().then((res) => {
      if (res.status && res.data) {
        setMerchants(res.data);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    setIsLoading(true);
    const res = await ApiService.createOrderManual({
      amount: parseFloat(amount),
      customerMobile,
      customerName,
      remark1,
      returnUrl,
      merchantAccountId: merchantAccountId || undefined,
      template
    });
    setIsLoading(false);

    if (res.status && res.data) {
      setCreatedOrder(res.data);
    } else {
      alert(res.error || 'Failed to create payment link');
    }
  };

  const copyUrl = () => {
    if (createdOrder) {
      navigator.clipboard.writeText(createdOrder.paymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5">
        <h1 className="font-display text-2xl font-bold text-white">Create Direct UPI Payment Link</h1>
        <p className="mt-1 text-xs text-slate-400">
          Generate an instant hosted payment page URL valid for 10 minutes with dynamic QR and app intent launchers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Form Container */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Payment Amount (INR) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-indigo-400">₹</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="499.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 pl-8 pr-3 py-2.5 text-base font-bold text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Route to Merchant Account</label>
              <select
                value={merchantAccountId}
                onChange={(e) => setMerchantAccountId(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Auto-Rotate across active accounts (Recommended)</option>
                {merchants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.provider} — {m.upiId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Checkout Template Design</label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="template_1">Template 1: Cyberpunk Dark Glass</option>
                <option value="template_2">Template 2: Minimalist Clean White</option>
                <option value="template_4">Template 4: Trust-Badge Corporate</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Customer Mobile</label>
                <input
                  type="text"
                  placeholder="9876543210"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Customer Name</label>
                <input
                  type="text"
                  placeholder="Rahul Sharma"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Item Note / Remark</label>
              <input
                type="text"
                placeholder="e.g. Order #1042 - Premium Plan"
                value={remark1}
                onChange={(e) => setRemark1(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Return URL (Redirect on Success)</label>
              <input
                type="url"
                placeholder="https://yourstore.com/checkout/success"
                value={returnUrl}
                onChange={(e) => setReturnUrl(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-primary py-3 text-xs font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition disabled:opacity-50"
            >
              {isLoading ? 'Creating Link...' : 'Generate Pay Link →'}
            </button>
          </form>
        </div>

        {/* Live Preview / Link Result */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono block mb-4">
              Generated Payment Link
            </span>

            {createdOrder ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
                  <span className="text-xs font-bold text-emerald-400">Order ID: {createdOrder.orderId}</span>
                  <div className="text-3xl font-extrabold text-white mt-1">₹{createdOrder.amount.toFixed(2)}</div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Assigned Provider: {createdOrder.provider}</span>
                </div>

                <div className="rounded-xl bg-slate-900 p-3 border border-white/10 space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Public Pay URL:</span>
                  <div className="flex items-center justify-between gap-2 text-xs font-mono text-indigo-300">
                    <span className="truncate">{createdOrder.paymentUrl}</span>
                    <button
                      onClick={copyUrl}
                      className="rounded-lg bg-indigo-600 px-3 py-1 text-white font-semibold flex items-center gap-1 shrink-0"
                    >
                      {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <a
                  href={createdOrder.paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-indigo-500/30 bg-indigo-500/10 py-3 text-xs font-bold text-indigo-300 hover:bg-indigo-500/20 transition"
                >
                  <span>Open Checkout in New Tab</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                <QrCode className="h-16 w-16 mb-2 text-slate-700" />
                <p className="text-xs">Fill the details on the left and click "Generate Pay Link" to create a payment session.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 text-[11px] text-slate-500 flex items-center justify-between font-mono">
            <span>Direct Bank Settlement</span>
            <span>Zero Holding</span>
          </div>
        </div>
      </div>
    </div>
  );
};
