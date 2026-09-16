import React, { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';
import { TenantTemplateSettings, PaymentTemplateConfig } from '../../types';
import { 
  Palette, 
  Sparkles, 
  Check, 
  Eye, 
  RotateCw, 
  Shuffle, 
  Pin,
  ExternalLink
} from 'lucide-react';

interface PaymentPageCustomizerProps {
  onNavigate: (page: string, params?: any) => void;
}

interface TemplateStat {
  template_id: string;
  views: number;
  success: number;
  conversion: number;
}

const TEMPLATE_MODES = [
  { id: 'fixed', label: 'Fixed', desc: 'Every link uses the template you pick.' },
  { id: 'random', label: 'Random', desc: 'A random enabled template for each new link.' },
  { id: 'rotate', label: 'Auto rotate', desc: 'Cycle through all enabled templates in order.' }
];

export const PaymentPageCustomizer: React.FC<PaymentPageCustomizerProps> = ({ onNavigate }) => {
  const [settings, setSettings] = useState<TenantTemplateSettings | null>(null);
  const [templates, setTemplates] = useState<PaymentTemplateConfig[]>([]);
  const [stats, setStats] = useState<TemplateStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form states
  const [templateMode, setTemplateMode] = useState<'fixed' | 'random' | 'rotate'>('fixed');
  const [defaultTemplate, setDefaultTemplate] = useState('template_1');
  const [enabledTemplates, setEnabledTemplates] = useState<string[]>([]);
  const [brandColor, setBrandColor] = useState('#8b5cf6');
  const [logoUrl, setLogoUrl] = useState('');
  const [supportNote, setSupportNote] = useState('');

  useEffect(() => {
    Promise.all([
      ApiService.getTemplateSettings(),
      ApiService.getTemplatesList()
    ]).then(([settingsRes, templatesRes]) => {
      if (settingsRes.status && settingsRes.data) {
        const s = settingsRes.data;
        setSettings(s);
        setTemplateMode(s.templateMode || s.mode || 'fixed');
        setDefaultTemplate(s.defaultTemplate || s.default_template_id || 'template_1');
        setEnabledTemplates(s.enabledTemplates || s.enabled_templates || [s.defaultTemplate || 'template_1']);
        setBrandColor(s.brandColor || s.brand_color || '#8b5cf6');
        setLogoUrl(s.logoUrl || s.logo_url || '');
        setSupportNote(s.supportNote || s.support_note || '');
        if (s.stats) {
          setStats(s.stats);
        }
      }
      if (templatesRes.status && templatesRes.data) {
        setTemplates(templatesRes.data);
      }
      setIsLoading(false);
    });
  }, []);

  const toggleEnabled = (id: string) => {
    setEnabledTemplates((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev; // Keep at least one enabled
        return prev.filter((t) => t !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    const payload = {
      templateMode,
      defaultTemplate,
      enabledTemplates: enabledTemplates.length ? enabledTemplates : [defaultTemplate],
      brandColor,
      logoUrl,
      supportNote
    };

    const res = await ApiService.updateTemplateSettings(payload);

    setIsSaving(false);
    if (res.status) {
      setFeedback('Saved');
      setTimeout(() => setFeedback(null), 2500);
    } else {
      setFeedback(res.error || 'Failed to save settings');
    }
  };

  const getTemplateStat = (id: string) => {
    return stats.find((s) => s.template_id === id) || { views: 0, success: 0, conversion: 0 };
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-2 sm:px-4 py-4 sm:py-6">
      
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">Payment page</h1>
            <span className="rounded-full bg-purple-500/10 border border-purple-500/30 px-2.5 py-0.5 text-[11px] font-mono font-semibold text-purple-400">
              11 Designs
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Pick how your checkout pages look. The API <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-purple-300">template</code> parameter overrides this per link.
          </p>
        </div>

        {feedback && (
          <div className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            feedback === 'Saved' 
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' 
              : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
          }`}>
            {feedback === 'Saved' ? '✓ Settings Saved' : feedback}
          </div>
        )}
      </header>

      {/* Section 1: Template Mode */}
      <section className="rounded-2xl border border-white/10 bg-[#13131f]/60 p-5 backdrop-blur-xl shadow-card">
        <h2 className="text-sm font-semibold text-white">Template mode</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {TEMPLATE_MODES.map((m) => {
            const isSelected = templateMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setTemplateMode(m.id as any)}
                className={`rounded-xl border px-4 py-3.5 text-left transition-all ${
                  isSelected
                    ? 'border-purple-500/70 bg-purple-500/15 ring-1 ring-purple-500/40 text-white shadow-glow'
                    : 'border-white/10 bg-[#0b0b12]/40 text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="text-sm font-bold text-white flex items-center justify-between">
                  <span>{m.label}</span>
                  {isSelected && <Check className="h-4 w-4 text-purple-400" />}
                </div>
                <div className="mt-1 text-[11px] text-slate-400 leading-relaxed">{m.desc}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 2: Branding */}
      <section className="rounded-2xl border border-white/10 bg-[#13131f]/60 p-5 backdrop-blur-xl shadow-card">
        <h2 className="text-sm font-semibold text-white">Branding</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          
          {/* Brand Colour */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Brand colour
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-10 w-12 rounded-lg border border-white/10 bg-transparent cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0b0b12]/60 px-3 py-2 font-mono text-xs text-white uppercase focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
              />
            </div>
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Logo URL (optional)
            </label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…/logo.png"
              className="w-full rounded-lg border border-white/10 bg-[#0b0b12]/60 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
            />
          </div>

          {/* Support Note */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Support note (optional)
            </label>
            <input
              type="text"
              value={supportNote}
              onChange={(e) => setSupportNote(e.target.value)}
              maxLength={160}
              placeholder="Need help? support@shop.com"
              className="w-full rounded-lg border border-white/10 bg-[#0b0b12]/60 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
            />
          </div>
        </div>
      </section>

      {/* Section 3: Templates */}
      <section className="rounded-2xl border border-white/10 bg-[#13131f]/60 p-5 backdrop-blur-xl shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Templates</h2>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[11px] text-purple-300">
            {enabledTemplates.length} enabled
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => {
            const stat = getTemplateStat(tpl.id);
            const isDefault = defaultTemplate === tpl.id;
            const isEnabled = enabledTemplates.includes(tpl.id);
            const swatch = tpl.swatch || ['#0b0b12', '#8b5cf6'];

            return (
              <div
                key={tpl.id}
                className={`rounded-2xl border p-3.5 transition-all flex flex-col justify-between ${
                  isDefault
                    ? 'border-purple-500/80 ring-1 ring-purple-500/50 bg-[#171727]/90 shadow-glow'
                    : 'border-white/10 bg-[#0b0b12]/70 hover:border-white/20'
                }`}
              >
                <div>
                  {/* Swatch preview banner */}
                  <div
                    className="flex h-20 items-end rounded-xl p-2.5 shadow-inner relative overflow-hidden"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${swatch[0]}, ${swatch[1]})`
                    }}
                  >
                    <span className="rounded bg-black/60 backdrop-blur-sm px-2 py-0.5 font-mono text-[10px] font-bold text-white shadow-sm">
                      {tpl.id}
                    </span>
                    {isDefault && (
                      <span className="ml-auto rounded-full bg-purple-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow">
                        Default
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="mt-3 text-sm font-bold text-white">{tpl.name}</div>
                  <p className="mt-1 text-[11px] text-slate-400 min-h-[32px] leading-relaxed">
                    {tpl.description}
                  </p>

                  {/* Stats */}
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                    <span>{stat.views} views</span>
                    <span>·</span>
                    <span>{stat.success} paid</span>
                    <span>·</span>
                    <span className="font-bold text-white">{stat.conversion}%</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDefaultTemplate(tpl.id);
                      if (!enabledTemplates.includes(tpl.id)) {
                        setEnabledTemplates((prev) => [...prev, tpl.id]);
                      }
                    }}
                    className={`flex-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                      isDefault
                        ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/40'
                        : 'border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {isDefault ? 'Default' : 'Set default'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('preview', { templateId: tpl.id })}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3 text-purple-400" />
                    <span>Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleEnabled(tpl.id)}
                    className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                      isEnabled
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'border border-white/10 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {isEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Save Settings Action Bar */}
      <div className="flex items-center gap-4 pt-2">
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={isSaving}
          className="rounded-xl bg-gradient-primary px-6 py-3 text-xs font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : 'Save settings'}
        </button>

        {feedback && (
          <span className="text-xs font-semibold text-slate-300">
            {feedback === 'Saved' ? '✓ Settings saved successfully' : feedback}
          </span>
        )}
      </div>

    </div>
  );
};
