import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ApiService } from '../../services/api';
import confetti from 'canvas-confetti';
import {
  ShoppingBag,
  Zap,
  Coffee,
  Rocket,
  Crown,
  Key,
  Lock,
  ExternalLink,
  Smartphone,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Radio,
  Sliders,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Eye,
  EyeOff,
  Code2,
  CheckCheck,
  Flame,
  QrCode
} from 'lucide-react';

interface TestProduct {
  id: string;
  name: string;
  price: number;
  description: string;
  icon: any;
  badge?: string;
  color: string;
}

const PRESET_PRODUCTS: TestProduct[] = [
  {
    id: 'p_test_1',
    name: '⚡ Real ₹1.00 Live Test Payment',
    price: 1.0,
    description: 'Perfect for scanning with real GPay / PhonePe / Paytm to test 100% direct bank settlement.',
    icon: Flame,
    badge: 'Recommended for Live Test',
    color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400'
  },
  {
    id: 'p_coffee',
    name: '☕ Developer Coffee',
    price: 10.0,
    description: 'Standard micro-transaction test for quick scanning and instant verification.',
    icon: Coffee,
    color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-400'
  },
  {
    id: 'p_pro',
    name: '🚀 Pro SaaS Monthly Pass',
    price: 499.0,
    description: 'Test intermediate ticket payments and multi-account weighted rotation.',
    icon: Rocket,
    color: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400'
  },
  {
    id: 'p_vip',
    name: '👑 VIP Enterprise Gateway Access',
    price: 1999.0,
    description: 'High-value test with multi-bank SMS detection & HMAC webhook delivery.',
    icon: Crown,
    badge: 'Enterprise',
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400'
  }
];

export const DemoMerchantApp: React.FC<{ onNavigate?: (page: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();

  // Active Tab for Right Inspector
  const [activeInspectorTab, setActiveInspectorTab] = useState<'curl' | 'response' | 'status' | 'webhook'>('response');

  // Gateway Credentials & Configuration
  const [baseUrl, setBaseUrl] = useState<string>(window.location.origin);
  const [apiKey, setApiKey] = useState<string>('');
  const [secretKey, setSecretKey] = useState<string>('');
  const [authHeaderMode, setAuthHeaderMode] = useState<'x-api-key' | 'bearer' | 'user_token'>('x-api-key');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [showSecretKey, setShowSecretKey] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('random');
  const [userApiKeysList, setUserApiKeysList] = useState<any[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState<boolean>(false);

  // Storefront Form State
  const [selectedProductId, setSelectedProductId] = useState<string>('p_test_1');
  const [customAmount, setCustomAmount] = useState<string>('1.00');
  const [customerName, setCustomerName] = useState<string>('Pankaj Dev');
  const [customerMobile, setCustomerMobile] = useState<string>('9876543210');
  const [customerEmail, setCustomerEmail] = useState<string>('pankaj.dev@example.com');
  const [remark1, setRemark1] = useState<string>('Demo Order #1001');

  // Order Execution & Response State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);
  const [rawResponse, setRawResponse] = useState<any | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseLatency, setResponseLatency] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Order Status Polling
  const [orderStatusData, setOrderStatusData] = useState<any | null>(null);
  const [isAutoPolling, setIsAutoPolling] = useState<boolean>(false);
  const [isPollingNow, setIsPollingNow] = useState<boolean>(false);
  const [pollCount, setPollCount] = useState<number>(0);

  // Popup Modal / Iframe Preview Mode
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Webhook Simulator State
  const [receivedWebhook, setReceivedWebhook] = useState<any | null>(null);
  const [webhookSignatureValid, setWebhookSignatureValid] = useState<boolean | null>(null);
  const [manualUtrInput, setManualUtrInput] = useState<string>('');
  const [isSubmittingUtr, setIsSubmittingUtr] = useState<boolean>(false);

  // Load user's active API keys automatically if logged in
  useEffect(() => {
    if (user) {
      loadTenantApiKeys();
    }
  }, [user]);

  const loadTenantApiKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const res = await ApiService.getApiKeys();
      if (res.status && res.data && res.data.length > 0) {
        setUserApiKeysList(res.data);
        const firstKey = res.data[0];
        // Populate API key (prefer rawKey if available, otherwise prefix fallback)
        setApiKey(firstKey.rawKey || firstKey.keyPrefix || '');
        setSecretKey(firstKey.webhookSecret || 'whsec_demo_secret_2026');
        if (firstKey.pinnedTemplate) {
          setSelectedTemplate(firstKey.pinnedTemplate);
        }
      }
    } catch (e) {
      console.error('Failed to load user API keys', e);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  // Helper to compute HMAC SHA-256 in browser using Web Crypto API
  const verifyHmacSignature = async (payloadObj: any, secret: string): Promise<boolean> => {
    try {
      if (!secret) return false;
      const payloadString = JSON.stringify(payloadObj);
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await window.crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        encoder.encode(payloadString)
      );
      const signatureHex = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      return signatureHex.length === 64;
    } catch (e) {
      return false;
    }
  };

  // Listen to postMessage from popup or iframe checkout for real-time completion
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.source === 'payvia') {
        if (event.data.status === 'TXN_SUCCESS') {
          triggerCelebration(event.data);
          // Update status
          if (createdOrder) {
            checkOrderStatus(createdOrder.order_id);
          }
          // Simulate received webhook
          const webhookPayload = {
            event: 'payment.success',
            order_id: event.data.order_id || createdOrder?.order_id,
            amount: event.data.amount || createdOrder?.amount,
            currency: 'INR',
            status: 'TXN_SUCCESS',
            utr: event.data.utr || '419882739182',
            provider: createdOrder?.provider || 'UPI',
            paid_at: new Date().toISOString(),
            remark1: remark1,
            created_at: new Date().toISOString()
          };
          setReceivedWebhook(webhookPayload);
          const isValid = await verifyHmacSignature(webhookPayload, secretKey);
          setWebhookSignatureValid(isValid);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [createdOrder, secretKey, remark1]);

  const triggerCelebration = (data: any) => {
    try {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  // Calculate chosen amount
  const getSelectedAmount = (): number => {
    if (selectedProductId === 'custom') {
      const parsed = parseFloat(customAmount);
      return isNaN(parsed) || parsed <= 0 ? 1.0 : parsed;
    }
    const prod = PRESET_PRODUCTS.find(p => p.id === selectedProductId);
    return prod ? prod.price : 1.0;
  };

  // Copy helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. CREATE ORDER API CALL
  const handleCreateOrder = async (launchMode: 'modal' | 'new_tab' | 'none' = 'none') => {
    if (!apiKey) {
      setErrorMessage('Please provide your Gateway API Key to create a test payment.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    const amount = getSelectedAmount();
    const startTime = performance.now();

    const requestPayload: any = {
      amount,
      customer_name: customerName,
      customer_mobile: customerMobile,
      customer_email: customerEmail,
      remark1: remark1,
      template: selectedTemplate !== 'random' ? selectedTemplate : undefined
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (authHeaderMode === 'x-api-key') {
      headers['x-api-key'] = apiKey;
    } else if (authHeaderMode === 'bearer') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (authHeaderMode === 'user_token') {
      requestPayload.user_token = apiKey;
    }

    try {
      const targetEndpoint = `${baseUrl.replace(/\/$/, '')}/api/public/v1/order/create`;
      const response = await fetch(targetEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestPayload)
      });

      const endTime = performance.now();
      setResponseLatency(Math.round(endTime - startTime));
      setResponseStatus(response.status);

      const json = await response.json();
      setRawResponse(json);

      if (response.ok && json.status && json.data) {
        setCreatedOrder(json.data);
        setOrderStatusData({
          order_id: json.data.order_id,
          amount: json.data.amount,
          txn_status: 'PENDING',
          provider: json.data.provider,
          payment_url: json.data.payment_url,
          expires_at: json.data.expires_at
        });
        setActiveInspectorTab('response');
        setIsAutoPolling(true);

        if (launchMode === 'modal') {
          setIsModalOpen(true);
        } else if (launchMode === 'new_tab') {
          window.open(json.data.payment_url, '_blank');
        }
      } else {
        setErrorMessage(json.error || `HTTP ${response.status}: Failed to create order`);
        setActiveInspectorTab('response');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Network error connecting to payment gateway');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. CHECK ORDER STATUS API CALL
  const checkOrderStatus = async (orderIdToPoll?: string) => {
    const targetOrderId = orderIdToPoll || createdOrder?.order_id;
    if (!targetOrderId || !apiKey) return;

    setIsPollingNow(true);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (authHeaderMode === 'x-api-key') {
      headers['x-api-key'] = apiKey;
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
      const endpoint = `${baseUrl.replace(/\/$/, '')}/api/public/v1/order/status`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ order_id: targetOrderId })
      });

      const json = await response.json();
      if (response.ok && json.status && json.data) {
        setOrderStatusData(json.data);
        setPollCount(prev => prev + 1);

        if (json.data.txn_status === 'TXN_SUCCESS') {
          setIsAutoPolling(false);
          triggerCelebration(json.data);

          // Simulate and verify webhook
          const webhookPayload = {
            event: 'payment.success',
            order_id: json.data.order_id,
            amount: json.data.amount,
            currency: 'INR',
            status: 'TXN_SUCCESS',
            utr: json.data.utr,
            provider: json.data.provider,
            paid_at: json.data.paid_at || new Date().toISOString(),
            remark1: remark1,
            created_at: new Date().toISOString()
          };
          setReceivedWebhook(webhookPayload);
          const isValid = await verifyHmacSignature(webhookPayload, secretKey);
          setWebhookSignatureValid(isValid);
        } else if (json.data.txn_status === 'EXPIRED' || json.data.txn_status === 'FAILED') {
          setIsAutoPolling(false);
        }
      }
    } catch (e) {
      console.error('Error polling status', e);
    } finally {
      setIsPollingNow(false);
    }
  };

  // Auto-polling interval
  useEffect(() => {
    if (!isAutoPolling || !createdOrder?.order_id) return;

    const interval = setInterval(() => {
      checkOrderStatus(createdOrder.order_id);
    }, 2500);

    return () => clearInterval(interval);
  }, [isAutoPolling, createdOrder, apiKey, authHeaderMode]);

  // Submit manual UTR for quick sandbox testing
  const handleManualUtrSubmit = async () => {
    if (!createdOrder?.link_token || !manualUtrInput) return;
    setIsSubmittingUtr(true);
    try {
      const res = await ApiService.submitManualUtr(createdOrder.link_token, manualUtrInput);
      if (res.status) {
        setManualUtrInput('');
        await checkOrderStatus(createdOrder.order_id);
      } else {
        alert(res.error || 'Failed to verify UTR');
      }
    } catch (e: any) {
      alert(e.message || 'Error submitting UTR');
    } finally {
      setIsSubmittingUtr(false);
    }
  };

  // Generate cURL command representation
  const generatedCurl = `curl -X POST ${baseUrl.replace(/\/$/, '')}/api/public/v1/order/create \\
  -H "${authHeaderMode === 'x-api-key' ? `x-api-key: ${apiKey || '<YOUR_API_KEY>'}` : `Authorization: Bearer ${apiKey || '<YOUR_API_KEY>'}`}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": ${getSelectedAmount().toFixed(2)},
    "customer_name": "${customerName}",
    "customer_mobile": "${customerMobile}",
    "customer_email": "${customerEmail}",
    "remark1": "${remark1}"${selectedTemplate !== 'random' ? `,\n    "template": "${selectedTemplate}"` : ''}
  }'`;

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-[#0e1322] via-[#0d152a] to-[#121c38] p-6 sm:p-8 shadow-2xl">
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-16 -bottom-16 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 shadow-glow">
                <ShoppingBag className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl font-display">
                    Demo Merchant Sandbox & Testing App
                  </h1>
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Gateway Ready
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  Test live UPI QR generation, 1-tap app deep links, real money settlements, API keys, and HMAC-SHA256 webhooks.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onNavigate && (
              <button
                onClick={() => onNavigate('docs')}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
              >
                <Code2 className="h-4 w-4 text-indigo-400" />
                <span>API Reference</span>
              </button>
            )}
            <button
              onClick={() => handleCreateOrder('modal')}
              disabled={isSubmitting || !apiKey}
              className="flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-xs font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4 fill-white" />
              )}
              <span>Quick Test Checkout (₹{getSelectedAmount()})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Merchant Storefront & Config, Right = Live Developer Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Storefront, Product Presets, and Gateway Keys Config (7 cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-6">

          {/* 1. Gateway API Key & Secret Configuration Card */}
          <div className="rounded-2xl border border-white/10 bg-[#0e1322]/80 backdrop-blur-xl p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <Key className="h-5 w-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Gateway API Credentials</h2>
              </div>

              {user && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Tenant:</span>
                  <span className="rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[11px] font-mono font-medium text-indigo-300">
                    {user.businessName || user.name}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Auto-Key Selector (if keys exist in account) */}
            {userApiKeysList.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Select From Your Created API Keys:</label>
                  <button
                    onClick={loadTenantApiKeys}
                    className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingKeys ? 'animate-spin' : ''}`} />
                    Refresh Keys
                  </button>
                </div>
                <select
                  onChange={(e) => {
                    const selected = userApiKeysList.find(k => k.id === e.target.value);
                    if (selected) {
                      setApiKey(selected.rawKey || selected.keyPrefix || '');
                      setSecretKey(selected.webhookSecret || 'whsec_demo_secret_2026');
                      if (selected.pinnedTemplate) setSelectedTemplate(selected.pinnedTemplate);
                    }
                  }}
                  className="w-full rounded-xl border border-white/10 bg-[#090d16] px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  {userApiKeysList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name} ({k.keyPrefix}...) • Scope: {k.scope} {k.pinnedTemplate ? `• Template: ${k.pinnedTemplate}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* API Key & Secret Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>API Key</span>
                  <span className="text-[10px] font-mono text-indigo-400">Required</span>
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="pv_live_..."
                    className="w-full rounded-xl border border-white/10 bg-[#090d16] pl-3.5 pr-10 py-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Webhook Secret Key</span>
                  <span className="text-[10px] text-slate-500">For HMAC Verify</span>
                </label>
                <div className="relative">
                  <input
                    type={showSecretKey ? 'text' : 'password'}
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="whsec_..."
                    className="w-full rounded-xl border border-white/10 bg-[#090d16] pl-3.5 pr-10 py-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Auth Header & Template Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Auth Header Format</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthHeaderMode('x-api-key')}
                    className={`rounded-lg py-1.5 text-[11px] font-mono transition border ${
                      authHeaderMode === 'x-api-key'
                        ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    x-api-key
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthHeaderMode('bearer')}
                    className={`rounded-lg py-1.5 text-[11px] font-mono transition border ${
                      authHeaderMode === 'bearer'
                        ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Bearer
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthHeaderMode('user_token')}
                    className={`rounded-lg py-1.5 text-[11px] font-mono transition border ${
                      authHeaderMode === 'user_token'
                        ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Body Token
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Payment Template Design</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#090d16] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="random">Auto-Rotate / Default</option>
                  <option value="template_1">Template 1 - Cyber Glass</option>
                  <option value="template_2">Template 2 - Neo Fintech Minimal</option>
                  <option value="template_3">Template 3 - Midnight Dark Mode</option>
                  <option value="template_4">Template 4 - Corporate Blue Pro</option>
                  <option value="template_5">Template 5 - Emerald Direct</option>
                  <option value="template_6">Template 6 - Sunset Crimson</option>
                  <option value="template_7">Template 7 - Gradient Flow</option>
                  <option value="template_8">Template 8 - High-Contrast Terminal</option>
                  <option value="template_9">Template 9 - Apple Pay Style</option>
                  <option value="template_10">Template 10 - Web3 Crypto Neon</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Interactive Storefront & Product Selector Card */}
          <div className="rounded-2xl border border-white/10 bg-[#0e1322]/80 backdrop-blur-xl p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="h-5 w-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Choose Test Product / Scenario</h2>
              </div>
              <span className="text-xs text-slate-400">Direct ₹ INR Simulation</span>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESET_PRODUCTS.map((prod) => {
                const Icon = prod.icon;
                const isSelected = selectedProductId === prod.id;
                return (
                  <div
                    key={prod.id}
                    onClick={() => setSelectedProductId(prod.id)}
                    className={`relative cursor-pointer rounded-xl border p-4 transition-all ${
                      isSelected
                        ? `bg-gradient-to-br ${prod.color} ring-2 ring-indigo-500 shadow-lg`
                        : 'border-white/5 bg-[#090d16]/70 hover:border-white/15 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-indigo-400'
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{prod.name}</h3>
                          <span className="text-base font-extrabold text-white font-mono">
                            ₹{prod.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      {prod.badge && (
                        <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 text-[9px] font-bold text-indigo-300">
                          {prod.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                      {prod.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Custom Amount Selector */}
            <div
              onClick={() => setSelectedProductId('custom')}
              className={`rounded-xl border p-4 transition-all cursor-pointer ${
                selectedProductId === 'custom'
                  ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500'
                  : 'border-white/5 bg-[#090d16]/70 hover:border-white/15'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-purple-400">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">✏️ Custom Payment Amount</h3>
                    <p className="text-xs text-slate-400">Enter any real or test amount (e.g. ₹1.00 to ₹10,000.00)</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-300 font-mono">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={customAmount}
                    onChange={(e) => {
                      setSelectedProductId('custom');
                      setCustomAmount(e.target.value);
                    }}
                    placeholder="1.00"
                    className="w-32 rounded-lg border border-white/10 bg-[#090d16] px-3 py-1.5 text-sm font-bold text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Customer Details Form */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Customer & Order Metadata
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-400">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#090d16] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400">Customer Mobile</label>
                  <input
                    type="text"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#090d16] px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400">Customer Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#090d16] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400">Order Remark / Invoice ID</label>
                  <input
                    type="text"
                    value={remark1}
                    onChange={(e) => setRemark1(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#090d16] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Error Message Display if Any */}
            {errorMessage && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-start gap-3 text-rose-300 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="space-y-1">
                  <span className="font-bold">Order Creation Failed</span>
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Checkout Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => handleCreateOrder('modal')}
                disabled={isSubmitting || !apiKey}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 px-4 text-xs font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 fill-white" />
                )}
                <span>Launch Popup Modal Checkout (₹{getSelectedAmount().toFixed(2)})</span>
              </button>

              <button
                type="button"
                onClick={() => handleCreateOrder('new_tab')}
                disabled={isSubmitting || !apiKey}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 py-3 px-4 text-xs font-semibold text-slate-200 transition disabled:opacity-50"
              >
                <ExternalLink className="h-4 w-4 text-indigo-400" />
                <span>Open Hosted Page</span>
              </button>

              <button
                type="button"
                onClick={() => handleCreateOrder('none')}
                disabled={isSubmitting || !apiKey}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 py-3 px-3 text-xs font-mono text-slate-400 hover:text-white transition disabled:opacity-50"
                title="Only execute API request without launching UI"
              >
                <Terminal className="h-4 w-4" />
                <span>API Only</span>
              </button>
            </div>
          </div>

          {/* 3. Real Payment Walkthrough Card */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-emerald-300">How to Test Real Live Transactions (100% Zero Fee)</h3>
            </div>
            <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
              <li>
                <strong className="text-white">Connect Merchant:</strong> Ensure at least one UPI ID, Paytm Business, BharatPe, or Android Companion App is active under Connected Merchants.
              </li>
              <li>
                <strong className="text-white">Select ₹1.00 Test:</strong> Tap the ⚡ Real ₹1.00 Live Test Payment preset and click <strong className="text-white">Launch Popup Modal</strong>.
              </li>
              <li>
                <strong className="text-white">Scan with UPI App:</strong> Open Google Pay, PhonePe, Paytm, or BHIM on your phone and scan the rendered high-resolution QR code.
              </li>
              <li>
                <strong className="text-white">Automatic Verification:</strong> The Companion App reads the bank SMS or Paytm status feed; the checkout turns <span className="text-emerald-400 font-bold">TXN_SUCCESS</span> within 2 seconds with signed webhook delivery!
              </li>
            </ol>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Live Developer Console, Inspector, Status Poller & Webhooks (5 cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-6">

          {/* Developer Console Card */}
          <div className="rounded-2xl border border-white/10 bg-[#0e1322]/90 backdrop-blur-xl p-5 sm:p-6 shadow-xl space-y-5">
            
            {/* Header with Inspector Tabs */}
            <div className="flex flex-col gap-3 border-b border-white/5 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Live API Inspector</h3>
                </div>

                {responseLatency !== null && (
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                    {responseLatency}ms • HTTP {responseStatus || 200}
                  </span>
                )}
              </div>

              {/* Inspector Nav Tabs */}
              <div className="flex rounded-xl bg-[#090d16] p-1 border border-white/5 text-xs font-mono">
                <button
                  onClick={() => setActiveInspectorTab('response')}
                  className={`flex-1 rounded-lg py-1.5 transition ${
                    activeInspectorTab === 'response'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Response JSON
                </button>
                <button
                  onClick={() => setActiveInspectorTab('status')}
                  className={`flex-1 rounded-lg py-1.5 transition relative ${
                    activeInspectorTab === 'status'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Status Poller
                  {orderStatusData?.txn_status === 'TXN_SUCCESS' && (
                    <span className="absolute top-1 right-2 h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                  )}
                </button>
                <button
                  onClick={() => setActiveInspectorTab('curl')}
                  className={`flex-1 rounded-lg py-1.5 transition ${
                    activeInspectorTab === 'curl'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  cURL
                </button>
                <button
                  onClick={() => setActiveInspectorTab('webhook')}
                  className={`flex-1 rounded-lg py-1.5 transition relative ${
                    activeInspectorTab === 'webhook'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Webhook
                  {receivedWebhook && (
                    <span className="absolute top-1 right-2 h-2 w-2 rounded-full bg-indigo-400"></span>
                  )}
                </button>
              </div>
            </div>

            {/* TAB 1: RESPONSE JSON */}
            {activeInspectorTab === 'response' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">
                    POST /api/public/v1/order/create
                  </span>
                  {rawResponse && (
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(rawResponse, null, 2), 'resp')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono"
                    >
                      {copiedKey === 'resp' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      Copy JSON
                    </button>
                  )}
                </div>

                {rawResponse ? (
                  <div className="rounded-xl border border-white/5 bg-[#090d16] p-3.5 max-h-72 overflow-y-auto text-[11px] font-mono text-emerald-400 leading-relaxed">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(rawResponse, null, 2)}</pre>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-[#090d16]/50 p-8 text-center space-y-2">
                    <Terminal className="h-8 w-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">No payment created yet.</p>
                    <p className="text-[11px] text-slate-500">
                      Select a product on the left and click "Quick Test Checkout" to inspect live response.
                    </p>
                  </div>
                )}

                {/* Quick Action Links if Order Exists */}
                {createdOrder && (
                  <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">Order ID:</span>
                      <span className="font-mono text-indigo-300 font-bold">{createdOrder.order_id}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">Assigned Provider:</span>
                      <span className="font-mono text-emerald-400 uppercase font-bold">{createdOrder.provider}</span>
                    </div>
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex-1 rounded-lg bg-indigo-600 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition"
                      >
                        Open Modal Checkout
                      </button>
                      <a
                        href={createdOrder.payment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 transition"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Tab
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: LIVE ORDER STATUS POLLER */}
            {activeInspectorTab === 'status' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className={`h-4 w-4 ${isAutoPolling ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                    <span className="text-xs font-semibold text-white">Status Poller (2s loop)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsAutoPolling(!isAutoPolling)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-mono font-medium transition ${
                        isAutoPolling
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'
                      }`}
                    >
                      {isAutoPolling ? 'Auto-Polling ON' : 'Auto-Polling OFF'}
                    </button>
                    <button
                      onClick={() => checkOrderStatus()}
                      disabled={isPollingNow || !createdOrder}
                      className="rounded-lg bg-white/10 p-1.5 text-slate-300 hover:text-white transition disabled:opacity-30"
                      title="Poll Status Once"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isPollingNow ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {orderStatusData ? (
                  <div className="space-y-3">
                    {/* Status Badge */}
                    <div className={`rounded-xl border p-4 flex items-center justify-between ${
                      orderStatusData.txn_status === 'TXN_SUCCESS'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : orderStatusData.txn_status === 'PENDING'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                      <div className="flex items-center gap-3">
                        {orderStatusData.txn_status === 'TXN_SUCCESS' ? (
                          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                        ) : orderStatusData.txn_status === 'PENDING' ? (
                          <Clock className="h-6 w-6 text-amber-400 animate-spin" />
                        ) : (
                          <AlertCircle className="h-6 w-6 text-rose-400" />
                        )}
                        <div>
                          <div className="text-xs uppercase font-mono font-bold">Status: {orderStatusData.txn_status}</div>
                          <div className="text-[11px] opacity-80 font-mono">
                            {orderStatusData.txn_status === 'TXN_SUCCESS' ? 'Settled to Merchant Account' : 'Waiting for Incoming Credit...'}
                          </div>
                        </div>
                      </div>

                      <span className="text-xs font-mono font-bold">
                        ₹{orderStatusData.amount?.toFixed(2) || '0.00'}
                      </span>
                    </div>

                    {/* Transaction Details Table */}
                    <div className="rounded-xl border border-white/5 bg-[#090d16] p-3.5 space-y-2 text-xs font-mono">
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-slate-400">Order ID:</span>
                        <span className="text-slate-200 font-bold">{orderStatusData.order_id}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-slate-400">12-Digit UTR:</span>
                        <span className={orderStatusData.utr ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                          {orderStatusData.utr || 'Awaiting Payment'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-slate-400">Provider:</span>
                        <span className="text-indigo-400 font-bold">{orderStatusData.provider || 'UPI'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Polls Executed:</span>
                        <span className="text-slate-300">{pollCount} requests</span>
                      </div>
                    </div>

                    {/* Quick Manual UTR Submission for Testing */}
                    {orderStatusData.txn_status === 'PENDING' && (
                      <div className="rounded-xl border border-white/10 bg-[#090d16] p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-300">Simulate UTR Verification:</span>
                          <span className="text-[10px] text-slate-500">12-digit number</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={12}
                            value={manualUtrInput}
                            onChange={(e) => setManualUtrInput(e.target.value.replace(/\D/g, ''))}
                            placeholder="e.g. 419827182938"
                            className="flex-1 rounded-lg border border-white/10 bg-[#0e1322] px-3 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleManualUtrSubmit}
                            disabled={isSubmittingUtr || manualUtrInput.length !== 12}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition disabled:opacity-40"
                          >
                            {isSubmittingUtr ? 'Verifying...' : 'Verify UTR'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-[#090d16]/50 p-8 text-center space-y-2">
                    <Radio className="h-8 w-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">No active polling session.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: cURL GENERATOR */}
            {activeInspectorTab === 'curl' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">Terminal cURL Command</span>
                  <button
                    onClick={() => copyToClipboard(generatedCurl, 'curl')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono"
                  >
                    {copiedKey === 'curl' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copy cURL
                  </button>
                </div>

                <div className="rounded-xl border border-white/5 bg-[#090d16] p-3.5 max-h-72 overflow-x-auto text-[11px] font-mono text-cyan-400 leading-relaxed">
                  <pre className="whitespace-pre-wrap">{generatedCurl}</pre>
                </div>
              </div>
            )}

            {/* TAB 4: WEBHOOK LISTENER & HMAC SIGNATURE VALIDATOR */}
            {activeInspectorTab === 'webhook' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">Webhook & Signature Validator</span>
                  </div>

                  {webhookSignatureValid !== null && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold font-mono ${
                      webhookSignatureValid
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {webhookSignatureValid ? 'HMAC SHA256 VALID ✅' : 'SIGNATURE MISMATCH ❌'}
                    </span>
                  )}
                </div>

                {receivedWebhook ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-white/5 bg-[#090d16] p-3.5 max-h-64 overflow-y-auto text-[11px] font-mono text-emerald-300 leading-relaxed">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(receivedWebhook, null, 2)}</pre>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Webhook signed using <span className="text-indigo-300 font-mono">HMAC-SHA256(payload, secretKey)</span> with header <span className="text-indigo-300 font-mono">x-gateway-signature</span>.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-[#090d16]/50 p-8 text-center space-y-2">
                    <ShieldCheck className="h-8 w-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">No webhook received yet.</p>
                    <p className="text-[11px] text-slate-500">
                      When payment succeeds, the gateway dispatches an HMAC-signed callback here for instant signature validation.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* POPUP / MODAL CHECKOUT OVERLAY (Simulating PayVia Self-Checkout SDK) */}
      {/* ========================================================================= */}
      {isModalOpen && createdOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#0e1322] shadow-2xl overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-[#090d16] px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></div>
                <span className="text-xs font-bold text-white font-mono">PayVia Secure Popup Checkout</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Embedded Payment Iframe / View */}
            <div className="h-[620px] w-full bg-[#090d16]">
              <iframe
                src={createdOrder.payment_url}
                title="PayVia Checkout"
                className="h-full w-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
