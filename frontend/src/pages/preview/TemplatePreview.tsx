import React, { useEffect, useState, useMemo } from 'react';
import { ApiService } from '../../services/api';
import { CheckoutData, PaymentTemplateConfig } from '../../types';
import { TemplateRenderer } from '../../components/templates/TemplateRenderer';
import { 
  Smartphone, 
  Monitor, 
  ArrowLeft, 
  RotateCcw,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface TemplatePreviewProps {
  templateId: string;
  onBack: () => void;
  onNavigate?: (page: string, params?: any) => void;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({ 
  templateId: initialTemplateId, 
  onBack,
  onNavigate
}) => {
  const [currentTplId, setCurrentTplId] = useState(initialTemplateId || 'template_1');
  const [templates, setTemplates] = useState<PaymentTemplateConfig[]>([]);
  const [data, setData] = useState<CheckoutData | null>(null);
  const [isMobileView, setIsMobileView] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(540);

  // Load all templates metadata for the quick switch bar
  useEffect(() => {
    ApiService.getTemplatesList().then((res) => {
      if (res.status && res.data) {
        setTemplates(res.data);
      }
    });
  }, []);

  // Countdown timer loop
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev <= 1 ? 600 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch preview data for current template ID
  useEffect(() => {
    ApiService.getTemplatePreview(currentTplId).then((res) => {
      if (res.status && res.data) {
        setData(res.data);
      }
    });
  }, [currentTplId]);

  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === currentTplId) || {
      id: currentTplId,
      name: currentTplId.replace('template_', 'Template '),
      description: 'Checkout template'
    };
  }, [templates, currentTplId]);

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0b0b12] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent shadow-[0_0_15px_rgba(139,92,246,0.5)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b12] text-white flex flex-col">
      
      {/* Sticky Top Preview Control Bar (Matching BlackPay / mxpay.vip) */}
      <div className="sticky top-0 z-50 flex flex-wrap items-center gap-2 border-b border-white/10 bg-slate-950/90 px-3 py-2 text-xs text-white backdrop-blur">
        
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-white/20 hover:text-white transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back</span>
        </button>

        {/* Template Name & ID */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">
            Preview · {activeTemplate.name}
          </span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-purple-300">
            {activeTemplate.id}
          </span>
          <span className="opacity-60 hidden sm:inline text-[11px] text-slate-400">
            sample data — not a real order
          </span>
        </div>

        {/* Template Switcher Buttons (1 to 11) */}
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {templates.map((tpl) => {
            const isSelected = tpl.id === currentTplId;
            const num = tpl.id.replace('template_', '');
            return (
              <button
                key={tpl.id}
                onClick={() => setCurrentTplId(tpl.id)}
                title={tpl.name}
                className={`rounded px-2 py-0.5 font-mono text-xs font-bold transition ${
                  isSelected
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                {num}
              </button>
            );
          })}

          {/* Viewport Toggles */}
          <div className="ml-2 pl-2 border-l border-white/20 flex items-center gap-1">
            <button
              onClick={() => setIsMobileView(true)}
              className={`p-1 rounded transition ${isMobileView ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Mobile View"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIsMobileView(false)}
              className={`p-1 rounded transition ${!isMobileView ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Desktop View"
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Preview Canvas */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-3 sm:p-6 bg-[#0b0b12] bg-[radial-gradient(rgba(139,92,246,0.15)_1px,transparent_1px)] [background-size:24px_24px]">
        <div className={`transition-all duration-300 ${isMobileView ? 'w-full max-w-[420px] rounded-3xl border-4 border-white/10 shadow-[0_20px_60px_-20px_rgba(139,92,246,0.45)] overflow-hidden' : 'w-full max-w-4xl'}`}>
          <TemplateRenderer
            data={{
              ...data,
              template: currentTplId
            }}
            timeRemaining={timeRemaining}
            isVerifying={false}
            onVerifyUtr={(utr) => alert(`Preview mode: UTR ${utr} verified with mock bank SMS!`)}
          />
        </div>
      </div>
    </div>
  );
};
