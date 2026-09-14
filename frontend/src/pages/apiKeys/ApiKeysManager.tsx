import React, { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';
import { ApiKey, ApiKeyScope, PaymentProviderType, MerchantAccount } from '../../types';
import { 
  KeyRound, 
  Plus, 
  Trash2, 
  RotateCw, 
  Copy, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Webhook, 
  ExternalLink,
  Sparkles
} from 'lucide-react';

export const ApiKeysManager: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [merchants, setMerchants] = useState<MerchantAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Key Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [scope, setScope] = useState<ApiKeyScope>('ALL');
  const [providerFilter, setProviderFilter] = useState<PaymentProviderType>('PAYTM');
  const [merchantAccountId, setMerchantAccountId] = useState('');
  const [pinnedTemplate, setPinnedTemplate] = useState('template_1');
  const [webhookUrl, setWebhookUrl] = useState('');

  // Newly created raw key popup
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

    if (res.status && res.rawKey) {
      setCreatedRawKey(res.rawKey);
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
      if (res.status && res.rawKey) {
        setCreatedRawKey(res.rawKey);
        loadData();
      }
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (confirm('Are you sure you want to revoke this API key?')) {
      await ApiService.deleteApiKey(id);
      loadData();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white">API Keys & Webhooks</h1>
            <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 text-xs font-mono text-indigo-400">
              {keys.length} Active Keys
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Create scoped API keys for your applications. Use HMAC-SHA256 signed webhooks for real-time order callback notifications.
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
        <div className="glass-panel p-5 rounded-3xl border border-emerald-500/40 bg-emerald-950/20 text-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span className="font-bold text-sm text-emerald-400">New API Key Generated!</span>
            </div>
            <button onClick={() => setCreatedRawKey(null)} className="text-slate-400 hover:text-white text-xs">Dismiss</button>
          </div>
          <p className="text-xs text-slate-300">
            Make sure to copy this key now. For your security, it will not be shown in plain text again!
          </p>
          <div className="flex items-center justify-between gap-2 bg-slate-900 px-4 py-2.5 rounded-xl border border-emerald-500/30 font-mono text-xs text-emerald-300">
            <span className="truncate">{createdRawKey}</span>
            <button
              onClick={() => copyToClipboard(createdRawKey)}
              className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1 font-bold text-white transition shrink-0"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      )}

      {/* API Keys Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {keys.map((key) => (
          <div key={key.id} className="glass-card p-5 rounded-2xl border border-white/5 space-y-4">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">{key.name}</h3>
                  <span className="text-[10px] font-mono text-slate-400">Prefix: {key.keyPrefix}••••</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleRotateKey(key.id)}
                  title="Rotate API Key"
                  className="rounded-lg p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteKey(key.id)}
                  title="Revoke Key"
                  className="rounded-lg p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/60 p-3 border border-white/5 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Routing Scope:</span>
                <span className="text-indigo-400 font-bold">{key.scope}</span>
              </div>
              {key.pinnedTemplate && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Pinned Template:</span>
                  <span className="text-slate-200">{key.pinnedTemplate}</span>
                </div>
              )}
              {key.webhookUrl && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Webhook URL:</span>
                  <span className="text-purple-300 truncate max-w-[160px]">{key.webhookUrl}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>Status: ACTIVE</span>
              <span>{key.lastUsedAt ? `Used ${new Date(key.lastUsedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Never used'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Key Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-base text-white">Create Scoped API Key</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateKey} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Key Name / Client</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production Web App"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Merchant Routing Scope</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as ApiKeyScope)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="ALL">All Merchants (Weighted Random Rotation)</option>
                  <option value="PROVIDER">Provider Scoped (Rotate only inside 1 provider)</option>
                  <option value="ACCOUNT">Fixed Account (Pin to 1 specific merchant)</option>
                </select>
              </div>

              {scope === 'PROVIDER' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Select Provider</label>
                  <select
                    value={providerFilter}
                    onChange={(e) => setProviderFilter(e.target.value as PaymentProviderType)}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="PAYTM">Paytm Business</option>
                    <option value="BHARATPE">BharatPe</option>
                    <option value="FAMPAY">FamPay</option>
                    <option value="CUSTOM_UPI">Custom UPI</option>
                    <option value="FREECHARGE">Freecharge</option>
                    <option value="CRYPTO">Crypto USDT/USDC</option>
                  </select>
                </div>
              )}

              {scope === 'ACCOUNT' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Select Fixed Account</label>
                  <select
                    value={merchantAccountId}
                    onChange={(e) => setMerchantAccountId(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="">Select Account</option>
                    {merchants.map((m) => (
                      <option key={m.id} value={m.id}>{m.label} ({m.provider})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Pinned Payment Page Template</label>
                <select
                  value={pinnedTemplate}
                  onChange={(e) => setPinnedTemplate(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white focus:outline-none"
                >
                  <option value="template_1">Template 1: Cyberpunk Dark Glass</option>
                  <option value="template_2">Template 2: Minimalist Clean White</option>
                  <option value="template_4">Template 4: Trust-Badge Corporate</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Webhook Callback URL</label>
                <input
                  type="url"
                  placeholder="https://api.yourstore.com/webhooks/payment"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-primary px-5 py-2 font-bold text-white shadow-glow hover:brightness-110"
                >
                  Generate Key →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
