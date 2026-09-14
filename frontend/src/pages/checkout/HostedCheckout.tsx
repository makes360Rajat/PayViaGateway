import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckoutData } from '../../types';
import { ApiService } from '../../services/api';
import { TemplateRenderer } from '../../components/templates/TemplateRenderer';
import { CheckCircle2, XCircle, Clock, AlertTriangle, ArrowRight } from 'lucide-react';

interface HostedCheckoutProps {
  token: string;
}

export const HostedCheckout: React.FC<HostedCheckoutProps> = ({ token }) => {
  const [data, setData] = useState<CheckoutData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(600);
  const [isVerifying, setIsVerifying] = useState(false);

  // Fetch initial checkout data
  const loadData = async () => {
    try {
      const res = await ApiService.getCheckoutData(token);
      if (res.status && res.data) {
        setData(res.data);
        const expiresAt = new Date(res.data.expires_at).getTime();
        const diffSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        setTimeRemaining(diffSeconds);
      } else {
        setError(res.error || 'Payment link not found or expired');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load checkout details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Polling loop every 2 seconds while PENDING
  useEffect(() => {
    if (!data || data.status === 'TXN_SUCCESS' || data.status === 'EXPIRED' || data.status === 'FAILED') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await ApiService.getCheckoutData(token);
        if (res.status && res.data) {
          if (res.data.status !== data.status) {
            setData(res.data);
            if (res.data.status === 'TXN_SUCCESS') {
              triggerSuccessCelebration(res.data);
            }
          }
        }
      } catch (e) {}
    }, 2000);

    return () => clearInterval(interval);
  }, [data, token]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining <= 0 || !data || data.status !== 'PENDING') return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, data]);

  const triggerSuccessCelebration = (orderData: CheckoutData) => {
    try {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    // Auto redirect if return_url exists
    if (orderData.return_url) {
      setTimeout(() => {
        window.location.href = orderData.return_url!;
      }, 3000);
    }
  };

  const handleVerifyUtr = async (utr: string) => {
    setIsVerifying(true);
    const res = await ApiService.submitManualUtr(token, utr);
    setIsVerifying(false);

    if (res.status && res.data) {
      await loadData();
    } else {
      alert(res.error || 'Invalid UTR reference number');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
          <span className="text-xs font-mono text-slate-400">Loading secure payment session...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-rose-500/20 bg-slate-900/80 p-6 text-center text-white">
          <XCircle className="mx-auto h-12 w-12 text-rose-500 mb-3" />
          <h2 className="text-lg font-bold">Payment Session Unavailable</h2>
          <p className="mt-1 text-xs text-slate-400">{error || 'This payment link has expired or does not exist.'}</p>
        </div>
      </div>
    );
  }

  // Success State View
  if (data.status === 'TXN_SUCCESS') {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-emerald-500/30 bg-slate-900/90 backdrop-blur-2xl p-8 text-center text-white shadow-2xl shadow-emerald-500/10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 mb-4 animate-bounce">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          </div>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 font-mono">
            PAYMENT CONFIRMED
          </span>
          <h2 className="text-2xl font-bold font-display mt-3">₹{data.amount.toFixed(2)} Paid</h2>
          <p className="mt-1 text-xs text-slate-400">Transaction settled directly to merchant.</p>

          <div className="my-6 rounded-2xl bg-slate-950/60 border border-white/5 p-4 text-left space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Order ID:</span>
              <span className="text-slate-200">{data.order_id}</span>
            </div>
            {data.utr && (
              <div className="flex justify-between">
                <span className="text-slate-400">Bank UTR / Ref:</span>
                <span className="text-emerald-400 font-bold">{data.utr}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Payment Mode:</span>
              <span className="text-indigo-300">{data.provider}</span>
            </div>
          </div>

          {data.return_url ? (
            <a
              href={data.return_url}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-primary py-3 text-sm font-bold text-white shadow-glow hover:brightness-110 transition"
            >
              <span>Return to Merchant Store</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          ) : (
            <p className="text-xs text-slate-500">You can safely close this window.</p>
          )}
        </div>
      </div>
    );
  }

  // Render Resolved Template
  return (
    <TemplateRenderer
      data={data}
      timeRemaining={timeRemaining}
      isVerifying={isVerifying}
      onVerifyUtr={handleVerifyUtr}
    />
  );
};
