import React, { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';
import { CheckoutData } from '../../types';
import { TemplateRenderer } from '../../components/templates/TemplateRenderer';
import { 
  Smartphone, 
  Monitor, 
  ArrowLeft, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface TemplatePreviewProps {
  templateId: string;
  onBack: () => void;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({ templateId, onBack }) => {
  const [data, setData] = useState<CheckoutData | null>(null);
  const [isMobileView, setIsMobileView] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(540);

  useEffect(() => {
    ApiService.getTemplatePreview(templateId).then((res) => {
      if (res.status && res.data) {
        setData(res.data);
      }
    });
  }, [templateId]);

  if (!data) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-white flex flex-col">
      
      {/* Top Preview Control Bar */}
      <div className="h-14 border-b border-white/10 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between z-50 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Templates</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            Previewing: {templateId}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileView(true)}
            className={`p-1.5 rounded-lg transition ${isMobileView ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            title="Mobile View"
          >
            <Smartphone className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsMobileView(false)}
            className={`p-1.5 rounded-lg transition ${!isMobileView ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            title="Desktop View"
          >
            <Monitor className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Interactive Preview Canvas */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 sm:p-8 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
        <div className={`transition-all duration-300 ${isMobileView ? 'w-full max-w-[420px] rounded-3xl border-4 border-slate-800 shadow-2xl overflow-hidden' : 'w-full max-w-4xl'}`}>
          <TemplateRenderer
            data={data}
            timeRemaining={timeRemaining}
            isVerifying={false}
            onVerifyUtr={(utr) => alert(`Preview mode: UTR ${utr} accepted!`)}
          />
        </div>
      </div>
    </div>
  );
};
