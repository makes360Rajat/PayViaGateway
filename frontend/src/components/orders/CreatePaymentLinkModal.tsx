import React, { useState, useEffect } from 'react';
import { ApiService } from '../../services/api';
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
  const [amount, setAmount] = useState('');
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
      setCustomerName('');
      setCustomerMobile('');
      setRemark('');
      setCopied(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

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
              <h4 className="font-display text-lg font-bold text-white">Payment Link Ready!</h4>
              <p className="text-xs text-slate-400 mt-0.5">Order ID: <span className="font-mono text-purple-300 font-bold">{createdOrder.orderId}</span></p>
              <div className="text-2xl font-black text-emerald-400 font-display mt-2">₹{Number(createdOrder.amount).toFixed(2)}</div>
            </div>

            {/* QR Preview */}
            {qrDataUrl && (
              <div className="bg-white p-3 rounded-2xl mx-auto w-fit shadow-xl border-2 border-slate-200">
                <img src={qrDataUrl} alt="Order QR" className="h-40 w-40 object-contain" />
              </div>
            )}

            {/* Link Copy Box */}
            <div className="flex items-center justify-between gap-2 bg-slate-900 px-4 py-3 rounded-2xl border border-white/10 text-xs font-mono text-left">
              <span className="text-purple-300 truncate">{createdOrder.paymentUrl}</span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="rounded-lg bg-purple-600 px-3 py-1.5 font-bold text-white hover:bg-purple-500 shrink-0 flex items-center gap-1 transition"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <a
                href={createdOrder.paymentUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 text-xs font-bold text-white shadow-glow hover:brightness-110 transition"
              >
                <span>Open Checkout Page</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <button
                type="button"
                onClick={handleResetForAnother}
                className="rounded-xl bg-white/10 hover:bg-white/15 py-2.5 text-xs font-semibold text-slate-200 transition"
              >
                + Create Another Link
              </button>
            </div>
          </div>
        ) : (
          /* Input Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            
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
                      onClick={() => setAmount(val)}
                      className="rounded-lg bg-white/5 hover:bg-white/10 px-2 py-0.5 text-[10px] font-mono text-purple-300 border border-white/5"
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="499.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-2xl bg-slate-900/90 border border-white/10 pl-8 pr-4 py-2.5 text-base font-bold font-mono text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
                />
              </div>
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
              </div>
            </div>

            {/* Actions */}
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
                <span>{isSubmitting ? 'Generating Link...' : 'Create Payment Link →'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
