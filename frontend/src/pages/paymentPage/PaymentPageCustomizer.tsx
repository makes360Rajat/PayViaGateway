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
  Sliders,
  ExternalLink
} from 'lucide-react';

interface PaymentPageCustomizerProps {
  onNavigate: (page: string, params?: any) => void;
}

export const PaymentPageCustomizer: React.FC<PaymentPageCustomizerProps> = ({ onNavigate }) => {
  const [settings, setSettings] = useState<TenantTemplateSettings | null>(null);
  const [templates, setTemplates] = useState<PaymentTemplateConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // Form states
  const [templateMode, setTemplateMode] = useState<'fixed' | 'random' | 'rotate'>('rotate');
  const [defaultTemplate, setDefaultTemplate] = useState('template_1');
  const [brandName, setBrandName] = useState('');
  const [brandColor, setBrandColor] = useState('#6366f1');

  useEffect(() => {
    Promise.all([
      ApiService.getTemplateSettings(),
      ApiService.getTemplatesList()
    ]).then(([settingsRes, templatesRes]) => {
      if (settingsRes.status && settingsRes.data) {
        setSettings(settingsRes.data);
        setTemplateMode(settingsRes.data.templateMode);
        setDefaultTemplate(settingsRes.data.defaultTemplate);
        setBrandName(settingsRes.data.brandName || '');
        setBrandColor(settingsRes.data.brandColor || '#6366f1');
      }
      if (templatesRes.status && templatesRes.data) {
        setTemplates(templatesRes.data);
      }
      setIsLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await ApiService.updateTemplateSettings({
      templateMode,
      defaultTemplate,
      brandName,
      brandColor
    });

    if (res.status) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      alert(res.error || 'Failed to save settings');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white">Payment Page Designs & Branding</h1>
            <span className="rounded-full bg-pink-500/10 border border-pink-500/30 px-2.5 py-0.5 text-xs font-mono text-pink-400">
              10 Designs
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Customize branding and configure how your hosted payment pages rotate across 10 mobile-first conversion templates.
          </p>
        </div>

        {saved && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 text-xs font-bold text-emerald-400 animate-pulse">
            Settings Saved Successfully!
          </div>
        )}
      </div>

      {/* Global Branding & Mode Config */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
            
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Template Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateMode('rotate')}
                  className={`p-2.5 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1 transition ${
                    templateMode === 'rotate'
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-glow'
                      : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <RotateCw className="h-4 w-4" />
                  <span>Auto Rotate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateMode('random')}
                  className={`p-2.5 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1 transition ${
                    templateMode === 'random'
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-glow'
                      : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Shuffle className="h-4 w-4" />
                  <span>Random</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateMode('fixed')}
                  className={`p-2.5 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1 transition ${
                    templateMode === 'fixed'
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-glow'
                      : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Pin className="h-4 w-4" />
                  <span>Fixed</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Brand Name on Pay Page
              </label>
              <input
                type="text"
                placeholder="e.g. My Premium Store"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Brand Accent Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-9 w-12 rounded-lg bg-transparent cursor-pointer border border-white/10"
                />
                <input
                  type="text"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white font-mono uppercase"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="rounded-xl bg-gradient-primary px-6 py-2.5 text-xs font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition"
            >
              Save Payment Page Settings
            </button>
          </div>
        </form>
      </div>

      {/* 10 Templates Gallery */}
      <div className="space-y-4">
        <h2 className="font-display text-lg font-bold text-white">10 Conversion-Optimized Template Gallery</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((tpl, idx) => {
            const isDefault = defaultTemplate === tpl.id;

            return (
              <div
                key={tpl.id}
                className={`glass-card p-5 rounded-2xl border transition-all relative overflow-hidden ${
                  isDefault ? 'border-indigo-500 shadow-glow bg-slate-900/90' : 'border-white/5 hover:border-white/20'
                }`}
              >
                {tpl.badge && (
                  <span className="absolute top-3 right-3 rounded-full bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 text-[9px] font-bold text-indigo-300">
                    {tpl.badge}
                  </span>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                    {idx + 1}
                  </div>
                  <h3 className="font-bold text-sm text-white">{tpl.name}</h3>
                </div>

                <p className="text-xs text-slate-400 min-h-[36px]">{tpl.description}</p>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      setDefaultTemplate(tpl.id);
                      ApiService.updateTemplateSettings({ defaultTemplate: tpl.id });
                    }}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                      isDefault 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-slate-400 hover:text-white bg-slate-800'
                    }`}
                  >
                    {isDefault ? '✓ Current Default' : 'Set as Default'}
                  </button>

                  <button
                    onClick={() => onNavigate('preview', { templateId: tpl.id })}
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold text-[11px]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Live Preview</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
