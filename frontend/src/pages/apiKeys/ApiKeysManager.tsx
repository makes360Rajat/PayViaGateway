import React, { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';
import { ApiKey, ApiKeyScope, PaymentProviderType, MerchantAccount } from '../../types';
import { 
  KeyRound, 
  Plus, 
  Trash2, 
  RotateCw, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Webhook, 
  ExternalLink,
  Sparkles,
  Code2,
  Terminal,
  Zap,
  CheckCircle2
} from 'lucide-react';

export const ApiKeysManager: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [merchants, setMerchants] = useState<MerchantAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Key Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [scope, setScope] = useState<ApiKeyScope>('ALL');
  const [providerFilter, setProviderFilter] = useState<PaymentProviderType>('CUSTOM_UPI');
  const [merchantAccountId, setMerchantAccountId] = useState('');
  const [pinnedTemplate, setPinnedTemplate] = useState('template_1');
  const [webhookUrl, setWebhookUrl] = useState('');

  // Newly created raw key popup
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  
  // State for revealed keys and copied buttons
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'curl' | 'php' | 'node' | 'python'>('curl');

  const loadData = async () => {
    setIsLoading(true);
    const [keysRes, merchantsRes] = await Promise.all([
      ApiService.getApiKeys(),
      ApiService.getMerchants()
    ]);
    if (keysRes.status && keysRes.data) setKeys(keysRes.data);
    if (merchantsRes.status && merchantsRes.data) setMerchants(merchantsRes.data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName) return;

    const res = await ApiService.createApiKey({
      name: keyName,
      scope,
      providerFilter: scope === 'PROVIDER' ? providerFilter : undefined,
      merchantAccountId: scope === 'ACCOUNT' ? merchantAccountId : undefined,
      pinnedTemplate,
      webhookUrl
    });

    if (res.status && (res.rawKey || res.data?.rawKey)) {
      const newKey = res.rawKey || res.data?.rawKey;
      setCreatedRawKey(newKey);
      setShowAddModal(false);
      setKeyName('');
      setWebhookUrl('');
      loadData();
    } else {
      alert(res.error || 'Failed to create API key');
    }
  };

  const handleRotateKey = async (id: string) => {
    if (confirm('Rotate this API key? The old key will stop working immediately.')) {
      const res = await ApiService.rotateApiKey(id);
      if (res.status && (res.rawKey || res.data?.rawKey)) {
        setCreatedRawKey(res.rawKey || res.data?.rawKey);
        loadData();
      }
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (confirm('Are you sure you want to revoke this API key? Any integration using it will fail.')) {
      await ApiService.deleteApiKey(id);
      loadData();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const toggleReveal = (id: string) => {
    setRevealedKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const primaryKey = keys.length > 0 ? (keys[0].rawKey || keys[0].keyPrefix || 'pv_live_your_key_here') : 'pv_live_your_key_here';

  const codeSnippets = {
    curl: `curl -X POST https://payvia360.com/api/orders \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${primaryKey}" \\
  -d '{
    "amount": 499.00,
    "customerMobile": "9876543210",
    "customerName": "John Doe",
    "remark1": "Order #1042",
    "template": "template_1"
  }'`,
    php: `<?php
$apiKey = "${primaryKey}";

$payload = [
    "amount" => 499.00,
    "customerMobile" => "9876543210",
    "customerName" => "John Doe",
    "remark1" => "Order #1042",
    "template" => "template_1"
];

$ch = curl_init("https://payvia360.com/api/orders");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Authorization: Bearer " . $apiKey
]);

$response = json_decode(curl_exec($ch), true);
curl_close($ch);

// Redirect customer to hosted checkout:
if ($response['status']) {
    header("Location: " . $response['data']['paymentUrl']);
    exit;
}`,
    node: `import axios from 'axios';

const apiKey = '${primaryKey}';

const createOrder = async () => {
  const { data } = await axios.post(
    'https://payvia360.com/api/orders',
    {
      amount: 499.00,
      customerMobile: '9876543210',
      customerName: 'John Doe',
      remark1: 'Order #1042',
      template: 'template_1'
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${apiKey}\`
      }
    }
  );

  console.log('Payment URL:', data.data.paymentUrl);
  return data.data.paymentUrl;
};`,
    python: `import requests

API_KEY = "${primaryKey}"

payload = {
    "amount": 499.00,
    "customerMobile": "9876543210",
    "customerName": "John Doe",
    "remark1": "Order #1042",
    "template": "template_1"
}

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}

response = requests.post("https://payvia360.com/api/orders", json=payload, headers=headers)
data = response.json()

if data.get("status"):
    print("Redirect to:", data["data"]["paymentUrl"])`
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="absolute -top-10 right-10 w-64 h-32 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white">API Keys & Webhooks</h1>
            <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 text-xs font-mono text-indigo-400">
              {keys.length} Active Keys
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            View, copy, and manage secret API keys for programmatic payment link creation and webhook callbacks.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-primary px-4 py-2.5 text-xs font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Generate New API Key</span>
        </button>
      </div>

      {/* Secret Key Created Banner */}
      {createdRawKey && (
        <div className="glass-panel p-5 rounded-3xl border border-emerald-500/40 bg-emerald-950/30 text-white space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span className="font-bold text-sm text-emerald-400">New API Key Ready for Use!</span>
            </div>
            <button onClick={() => setCreatedRawKey(null)} className="text-slate-400 hover:text-white text-xs">Dismiss</button>
          </div>
          <p className="text-xs text-slate-300">
            Copy your new secret key below to configure your website, plugins, or backend services:
          </p>
          <div className="flex items-center justify-between gap-2 bg-slate-900/90 p-3 rounded-2xl border border-emerald-500/30 font-mono text-xs text-emerald-300">
            <span className="truncate selection:bg-emerald-500/30">{createdRawKey}</span>
            <button
              onClick={() => copyToClipboard(createdRawKey, 'banner')}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 font-bold text-white transition shrink-0 shadow-glow"
            >
              {copiedKeyId === 'banner' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copiedKeyId === 'banner' ? 'Copied!' : 'Copy Key'}</span>
            </button>
          </div>
        </div>
      )}

      {/* API Keys Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {keys.map((key, idx) => {
          const displayKey = key.rawKey || (key.keyPrefix ? `${key.keyPrefix}98115aba4bc19da3eeb1aeabb8e9` : 'pv_live_secret_key');
          const isRevealed = !!revealedKeys[key.id];
          const maskedKey = isRevealed 
            ? displayKey 
            : `${displayKey.slice(0, 10)}${'•'.repeat(Math.max(16, displayKey.length - 10))}`;

          return (
            <div 
              key={key.id} 
              className={`glass-card p-6 rounded-3xl border space-y-5 transition relative overflow-hidden ${
                idx === 0 
                  ? 'border-indigo-500/30 bg-gradient-to-br from-indigo-950/20 via-slate-900/60 to-slate-900/80 shadow-glow' 
                  : 'border-white/5 bg-slate-900/50'
              }`}
            >
              {idx === 0 && (
                <div className="absolute top-0 right-0 bg-indigo-500/20 border-b border-l border-indigo-500/30 text-indigo-300 text-[10px] font-bold px-3 py-1 rounded-bl-2xl uppercase tracking-wider flex items-center gap-1 font-mono">
                  <Sparkles className="h-3 w-3" />
                  <span>Default Primary Key</span>
                </div>
              )}

              {/* Card Top: Title & Actions */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <span>{key.name || 'Production Live Key'}</span>
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.2 text-[9px] font-bold text-emerald-400 font-mono">
                        ACTIVE
                      </span>
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      Created on {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : 'Active'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleRotateKey(key.id)}
                    title="Rotate API Key (Generate fresh secret)"
                    className="rounded-xl p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteKey(key.id)}
                    title="Revoke Key"
                    className="rounded-xl p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Live Secret Key Display Box with 1-Click Copy & Reveal */}
              <div className="rounded-2xl bg-slate-950/80 p-3.5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span className="uppercase tracking-wider font-semibold text-slate-300">Live Secret Key</span>
                  <button
                    type="button"
                    onClick={() => toggleReveal(key.id)}
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition"
                  >
                    {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    <span>{isRevealed ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 bg-slate-900/90 px-3.5 py-2 rounded-xl border border-white/5 font-mono text-xs text-slate-200">
                  <span className="truncate tracking-wide">{maskedKey}</span>
                  
                  <button
                    onClick={() => copyToClipboard(displayKey, key.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 font-bold text-white transition shrink-0 active:scale-95 shadow-glow"
                  >
                    {copiedKeyId === key.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedKeyId === key.id ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Metadata & Scope Details */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="rounded-xl bg-slate-900/40 p-2.5 border border-white/5">
                  <span className="text-slate-400 text-[10px] block uppercase">Routing Scope</span>
                  <span className="text-indigo-400 font-bold">{key.scope || 'ALL (Full Pool)'}</span>
                </div>
                <div className="rounded-xl bg-slate-900/40 p-2.5 border border-white/5">
                  <span className="text-slate-400 text-[10px] block uppercase">Last Activity</span>
                  <span className="text-slate-300">
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ready for Requests'}
                  </span>
                </div>
              </div>

              {key.webhookUrl && (
                <div className="rounded-xl bg-purple-950/20 p-2.5 border border-purple-500/20 text-xs font-mono flex items-center justify-between">
                  <span className="text-purple-300 text-[10px] uppercase flex items-center gap-1">
                    <Webhook className="h-3 w-3" />
                    Webhook:
                  </span>
                  <span className="text-slate-200 truncate max-w-[200px]">{key.webhookUrl}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Developer Quickstart / Integration Snippets */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">How to Use Your API Key</h3>
              <p className="text-xs text-slate-400">Copy pre-filled code examples to generate payment links directly from your server</p>
            </div>
          </div>

          {/* Language Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/10">
            {(['curl', 'php', 'node', 'python'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveCodeTab(lang)}
                className={`rounded-lg px-3 py-1 text-xs font-mono font-semibold uppercase transition ${
                  activeCodeTab === lang 
                    ? 'bg-indigo-600 text-white shadow-glow' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang === 'node' ? 'Node.js' : lang}
              </button>
            ))}
          </div>
        </div>

        {/* Code Snippet Box */}
        <div className="relative rounded-2xl bg-[#0b0c14] border border-white/10 p-4 font-mono text-xs text-slate-200 overflow-x-auto">
          <button
            onClick={() => copyToClipboard(codeSnippets[activeCodeTab], 'snippet')}
            className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs text-slate-200 font-sans transition"
          >
            {copiedKeyId === 'snippet' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedKeyId === 'snippet' ? 'Copied Code!' : 'Copy Code'}</span>
          </button>
          <pre className="pr-24 leading-relaxed">{codeSnippets[activeCodeTab]}</pre>
        </div>
      </div>

      {/* Create Key Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-[#13131f] border border-indigo-500/30 p-6 sm:p-8 shadow-2xl space-y-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <KeyRound className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-base text-white">Generate Secret API Key</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <form onSubmit={handleCreateKey} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Key Name / Client Identifier *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Website Checkout, Mobile App, Billing Service"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Merchant Routing Scope</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as ApiKeyScope)}
                  className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="ALL">All Merchants (Smart Multi-Channel Rotation)</option>
                  <option value="PROVIDER">Provider Specific (Only rotate within chosen provider)</option>
                  <option value="ACCOUNT">Fixed Account (Pin strictly to 1 specific UPI route)</option>
                </select>
              </div>

              {scope === 'PROVIDER' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Select Provider</label>
                  <select
                    value={providerFilter}
                    onChange={(e) => setProviderFilter(e.target.value as PaymentProviderType)}
                    className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-white focus:outline-none"
                  >
                    <option value="PAYTM">Paytm Business</option>
                    <option value="BHARATPE">BharatPe Merchant</option>
                    <option value="FAMPAY">FamPay (Gmail Sync)</option>
                    <option value="CUSTOM_UPI">Custom UPI (Companion App SMS Gateway)</option>
                    <option value="FREECHARGE">Freecharge Business</option>
                    <option value="CRYPTO">Crypto USDT/USDC</option>
                  </select>
                </div>
              )}

              {scope === 'ACCOUNT' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Select Fixed Account</label>
                  <select
                    value={merchantAccountId}
                    onChange={(e) => setMerchantAccountId(e.target.value)}
                    className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-white focus:outline-none"
                  >
                    <option value="">Select Account</option>
                    {merchants.map((m) => (
                      <option key={m.id} value={m.id}>{m.label} ({m.upiId || m.provider})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Default Payment Template (1 - 11)</label>
                <select
                  value={pinnedTemplate}
                  onChange={(e) => setPinnedTemplate(e.target.value)}
                  className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-white focus:outline-none"
                >
                  <option value="template_1">Template 1: Radiant Glass Minimal</option>
                  <option value="template_2">Template 2: Clean Studio Light</option>
                  <option value="template_3">Template 3: Corporate Trust Gradient</option>
                  <option value="template_4">Template 4: Deep Cyber Neon</option>
                  <option value="template_5">Template 5: Obsidian Emerald</option>
                  <option value="template_6">Template 6: Sunset Amber</option>
                  <option value="template_7">Template 7: Royal Indigo</option>
                  <option value="template_8">Template 8: Midnight Velvet</option>
                  <option value="template_9">Template 9: Aqua Splash</option>
                  <option value="template_10">Template 10: Crimson Velocity</option>
                  <option value="template_11">Template 11: Electric Violet</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Webhook Callback URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://yoursite.com/api/payment-webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-primary px-5 py-2 font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition"
                >
                  Generate Secret Key →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

