import React, { useState, useEffect } from 'react';
import { ApiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Order, MerchantAccount, PaymentTemplateConfig } from '../../types';
import QRCode from 'qrcode';
import { 
  PlusCircle, 
  X, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  Zap, 
  Sparkles,
  Layers,
  Wallet
} from 'lucide-react';

interface CreatePaymentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated?: (order: Order) => void;
}

export const CreatePaymentLinkModal: React.FC<CreatePaymentLinkModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated
}) => {
  const { isPlanActive, entitlements, planUsage, refreshProfile } = useAuth();
  const testOrdersUsed = entitlements?.testOrdersUsed ?? planUsage?.used ?? 0;
  const testOrdersMax = entitlements?.testOrdersMax ?? planUsage?.limit ?? 5;
  const testOrdersRemaining = entitlements?.testOrdersRemaining ?? planUsage?.remaining ?? Math.max(0, testOrdersMax - testOrdersUsed);
  const isLimitReached = !isPlanActive && testOrdersRemaining <= 0;

  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [remark, setRemark] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('template_1');
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  
  const [merchants, setMerchants] = useState<MerchantAccount[]>([]);
  const [templates, setTemplates] = useState<PaymentTemplateConfig[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load active merchants & templates
      Promise.all([
        ApiService.getMerchants(),
        ApiService.getTemplatesList()
      ]).then(([merchantsRes, templatesRes]) => {
        if (merchantsRes.status && merchantsRes.data) {
          setMerchants(merchantsRes.data);
        }
        if (templatesRes.status && templatesRes.data) {
          setTemplates(templatesRes.data);
        }
      });
    } else {
      // Reset
      setCreatedOrder(null);
      setQrDataUrl('');
      setAmount('');
      setAmountError('');
      setCustomerName('');
      setCustomerMobile('');
      setRemark('');
      setCopied(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setAmountError('Please enter a valid amount greater than ₹0');
      return;
    }
    setAmountError('');

    setIsSubmitting(true);
    const res = await ApiService.createOrderManual({
      amount: parseFloat(amount),
      customerName: customerName.trim() || undefined,
      customerMobile: customerMobile.trim() || undefined,
      remark1: remark.trim() || undefined,
      template: selectedTemplate,
      merchantAccountId: selectedMerchantId || undefined
    });

    setIsSubmitting(false);

    if (res.status && res.data) {
      const order = res.data;
      setCreatedOrder(order);
      if (onOrderCreated) {
        onOrderCreated(order);
      }
      refreshProfile();

      // Generate dynamic QR for popup
      if (order.paymentUrl) {
        try {
          const qr = await QRCode.toDataURL(order.paymentUrl, {
            width: 240,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
          });
          setQrDataUrl(qr);
        } catch (err) {
          console.error('Failed to generate QR:', err);
        }
      }
    } else {
      alert(res.error || 'Failed to create payment link');
    }
  };

  const handleCopyLink = () => {
    if (!createdOrder?.paymentUrl) return;
    navigator.clipboard.writeText(createdOrder.paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleResetForAnother = () => {
    setCreatedOrder(null);
    setQrDataUrl('');
    setAmount('');
    setAmountError('');
    setCustomerName('');
    setCustomerMobile('');
    setRemark('');
    setCopied(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl bg-[#13131f] border border-purple-500/30 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-primary flex items-center justify-center text-white shadow-glow">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-white">Create Payment Link</h3>
              <p className="text-xs text-slate-400">Generate a direct settlement UPI checkout link</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success / Created View */}
        {createdOrder ? (
          <div className="space-y-5 text-center py-2 animate-fadeIn">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                {(createdOrder.isTest || createdOrder.mode === 'TEST') ? (
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    ✦ TEST SANDBOX LINK
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    ● LIVE PAYMENT LINK
                  </span>
                )}
              </div>
              <h4 className="font-display text-lg font-bold text-white">Payment Link Ready!</h4>
              <p className="text-xs text-slate-400 mt-0.5">Order ID: <span className="font-mono text-purple-300 font-bold">{createdOrder.orderId}</span></p>
              <div className="text-2xl font-black text-emerald-400 font-display mt-2">₹{Number(createdOrder.amount).toFixed(2)}</div>
              {(createdOrder.isTest || createdOrder.mode === 'TEST') && (
                <p className="text-[11px] text-amber-300/90 font-mono mt-1">
                  Test orders remaining: {Math.max(0, testOrdersRemaining)} / {testOrdersMax}
                </p>
              )}
            </div>

            {/* QR Preview */}
            {qrDataUrl && (
              <div className="bg-white p-3 rounded-2xl mx-auto w-fit shadow-xl border-2 border-slate-200">
                <img src={qrDataUrl} alt="Order QR" className="h-40 w-40 object-contain" />
              </div>
            )}

            {/* Payment URL Box */}
            <div className="rounded-2xl bg-black/40 border border-white/10 p-3.5 flex items-center justify-between gap-3 text-left">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Customer Checkout Link</span>
                <p className="text-xs font-mono text-purple-300 truncate">{createdOrder.paymentUrl}</p>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleCopyLink}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    copied 
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' 
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>

                <a
                  href={createdOrder.paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl p-1.5 bg-white/10 hover:bg-white/20 text-white transition"
                  title="Open Checkout Page"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Done Actions */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={onClose}
                className="rounded-xl px-5 py-2 text-xs font-bold bg-white/10 hover:bg-white/15 text-white transition"
              >
                Close
              </button>
              <button
                onClick={handleResetForAnother}
                className="rounded-xl bg-gradient-primary px-5 py-2 text-xs font-bold text-white shadow-glow hover:brightness-110 transition"
              >
                + Create Another Link
              </button>
            </div>
          </div>
        ) : (
          /* Input Form */
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            
            {/* Free Test Mode Ribbon */}
            {!isPlanActive && (
              <div className={`p-4 rounded-2xl border ${isLimitReached ? 'border-rose-500/50 bg-rose-950/30' : 'border-amber-500/40 bg-amber-950/30'} flex items-start gap-3`}>
                <Sparkles className={`h-5 w-5 ${isLimitReached ? 'text-rose-400' : 'text-amber-400'} shrink-0 mt-0.5`} />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${isLimitReached ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      ✦ FREE TEST MODE
                    </span>
                    <span className="text-xs font-mono text-slate-300">
                      Quota: <strong className={isLimitReached ? "text-rose-400" : "text-amber-300"}>{testOrdersUsed} / {testOrdersMax}</strong> used
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {isLimitReached
                      ? 'Free test order quota reached (5/5). Upgrade your gateway plan to create live orders and connect real UPI merchant accounts.'
                      : 'Test links run in simulated sandbox mode. Real customer funds and live routing require an active gateway plan.'
                    }
                  </p>
                </div>
              </div>
            )}
            
            {/* Amount & Presets */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Amount (INR) *
                </label>
                <div className="flex items-center gap-1.5">
                  {['100', '499', '999', '1999'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setAmount(val);
                        if (amountError) setAmountError('');
                      }}
                      className="rounded-lg bg-white/5 hover:bg-white/10 px-2 py-0.5 text-[10px] font-mono text-purple-300 border border-white/5 transition"
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="499.00"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Allow only digits and at most one decimal point
                    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                      setAmount(val);
                      if (amountError) setAmountError('');
                    }
                  }}
                  className={`w-full rounded-2xl bg-slate-900/90 border ${amountError ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-white/10'} pl-8 pr-4 py-2.5 text-base font-bold font-mono text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/30`}
                />
              </div>

              {amountError && (
                <p className="mt-1.5 text-xs text-rose-400 font-medium flex items-center gap-1.5 animate-fadeIn">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  <span>{amountError}</span>
                </p>
              )}
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Customer Mobile (Optional)
                </label>
                <input
                  type="text"
                  placeholder="9876543210"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  className="w-full rounded-xl bg-slate-900/80 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl bg-slate-900/80 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Remark / Note */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Order Remark / Item Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Premium Subscription / Invoice #1042"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="w-full rounded-xl bg-slate-900/80 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Template & Merchant Routing Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
              
              {/* Template Picker */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Checkout Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full rounded-xl bg-slate-900/80 border border-white/10 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="template_1">Classic Card (Default)</option>
                  <option value="template_2">Minimal Mono</option>
                  <option value="template_3">Gradient Glass</option>
                  <option value="template_4">Dark Neon</option>
                  <option value="template_5">Receipt</option>
                  <option value="template_6">Bold Split</option>
                  <option value="template_7">Soft Pastel</option>
                  <option value="template_8">Compact Sheet</option>
                  <option value="template_9">Guided Steps</option>
                  <option value="template_10">Brand Hero</option>
                  <option value="template_11">Modern Glass</option>
                </select>
              </div>

              {/* Merchant Account Routing */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Settlement Route
                </label>
                {!isPlanActive ? (
                  <div className="w-full rounded-xl bg-slate-900/60 border border-amber-500/30 px-3 py-2 text-xs text-amber-300 flex items-center gap-1.5 font-mono">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span>PayVia Test Sandbox (Simulated)</span>
                  </div>
                ) : (
                  <select
                    value={selectedMerchantId}
                    onChange={(e) => setSelectedMerchantId(e.target.value)}
                    className="w-full rounded-xl bg-slate-900/80 border border-white/10 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">⚡ Auto-Routed (Smart Rotation)</option>
                    {merchants.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} ({m.provider})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Actions */}
            {isLimitReached ? (
              <div className="pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new CustomEvent('payvia_navigate', { detail: 'plans' }));
                  }}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:brightness-110 text-black py-3 text-xs font-black shadow-glow-amber transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Upgrade Plan to Unlock Live Orders →</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !amount}
                  className="rounded-xl bg-gradient-primary px-6 py-2.5 text-xs font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition disabled:opacity-50 flex items-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>{isSubmitting ? 'Generating Link...' : (!isPlanActive ? 'Create Test Link (Sandbox) →' : 'Create Payment Link →')}</span>
                </button>
              </div>
            )}
          </form>
        )}

      </div>
    </div>
  );
};
