import React, { useState } from 'react';
import { ApiService } from '../../services/api';
import { 
  Mail, 
  Send, 
  MessageSquare, 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink,
  Sparkles,
  Phone,
  Clock,
  HelpCircle,
  ArrowRight,
  Headphones,
  AlertCircle
} from 'lucide-react';

interface ContactPageProps {
  onNavigate: (page: string) => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ onNavigate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('general');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setIsSending(true);
    setErrorMessage('');
    try {
      const res = await ApiService.submitContactMessage({
        name: name.trim(),
        email: email.trim(),
        subject,
        orderId: orderId.trim() || undefined,
        message: message.trim()
      });

      if (res.status) {
        setIsSubmitted(true);
      } else {
        setErrorMessage(res.error || 'Failed to submit message. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network connection failed. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setOrderId('');
    setMessage('');
    setErrorMessage('');
    setIsSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-[#040f0c] text-emerald-50 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto pt-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-300 backdrop-blur-md shadow-glow">
          <Headphones className="h-4 w-4 text-emerald-400" />
          <span>PayVia Developer & Merchant Support</span>
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Contact Our Engineering & Support Team
        </h1>
        <p className="text-emerald-200/80 text-sm sm:text-base leading-relaxed">
          Need help setting up your merchant routes, integrating our REST APIs, custom webhooks, or inquiring about high-volume enterprise limits? We are here 24/7.
        </p>
      </div>

      {/* Grid: Support Channels & Direct Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Direct Support Channels */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Email Support Card */}
          <div className="glass-panel p-6 rounded-3xl border border-emerald-500/25 space-y-3 relative overflow-hidden shadow-glow">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-center">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Email Support</h3>
                <p className="text-xs text-emerald-300/70">General inquiries, accounts & integrations</p>
              </div>
            </div>
            <p className="text-xs text-emerald-200/80 leading-relaxed">
              We respond to developer and merchant tickets within 1–2 business hours.
            </p>
            <div className="pt-2">
              <a 
                href="mailto:support@payvia360.com" 
                className="inline-flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-xl hover:bg-emerald-500/20 transition"
              >
                <span>support@payvia360.com</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Telegram Live Channel */}
          <div className="glass-panel p-6 rounded-3xl border border-cyan-500/25 bg-cyan-950/20 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Telegram Direct Channel</h3>
                <p className="text-xs text-cyan-300/70">Fastest real-time developer assistance</p>
              </div>
            </div>
            <p className="text-xs text-emerald-200/80 leading-relaxed">
              Connect directly with our lead architects on Telegram for rapid onboarding and pairing help.
            </p>
            <div className="pt-2">
              <a 
                href="https://t.me/makes360" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-3.5 py-2 rounded-xl hover:bg-cyan-500/20 transition shadow-glow"
              >
                <span>@makes360</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* WhatsApp / Phone Helpline */}
          <div className="glass-panel p-6 rounded-3xl border border-lime-500/25 bg-lime-950/20 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-lime-500/15 border border-lime-500/30 text-lime-300 flex items-center justify-center">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">WhatsApp Merchant Desk</h3>
                <p className="text-xs text-lime-300/70">Urgent settlement & pairing questions</p>
              </div>
            </div>
            <p className="text-xs text-emerald-200/80 leading-relaxed">
              Available 10:00 AM – 8:00 PM IST for Indian payment gateway merchants.
            </p>
            <div className="pt-2">
              <a 
                href="https://wa.me/919876543210" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-mono font-bold text-lime-400 bg-lime-500/10 border border-lime-500/30 px-3.5 py-2 rounded-xl hover:bg-lime-500/20 transition"
              >
                <span>+91 98765 43210</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Privacy & Deletion Requests */}
          <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-2 text-xs text-emerald-300/80 font-mono">
            <div className="flex items-center gap-2 text-white font-bold">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Privacy & Data Deletion</span>
            </div>
            <p className="text-[11px] text-emerald-200/70 leading-relaxed font-sans">
              To request deletion of your account, revoke Google OAuth connections, or purge SMS logs, email <strong className="text-white">support@payvia360.com</strong> with subject <em>"Data Deletion Request"</em>.
            </p>
          </div>

        </div>

        {/* Right Column: Interactive Support Ticket Form */}
        <div className="lg:col-span-7 glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/30 relative shadow-glow">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
          
          <div className="flex items-center justify-between pb-4 border-b border-emerald-500/15 mb-6">
            <div>
              <h2 className="font-display text-xl font-bold text-white">Send Direct Message</h2>
              <p className="text-xs text-emerald-300/70 mt-0.5">We typically reply within 60 minutes during business hours</p>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
            </div>
          </div>

          {isSubmitted ? (
            <div className="py-12 text-center space-y-4 animate-fadeIn">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-glow">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="font-display text-2xl font-bold text-white">Message Received!</h3>
              <p className="text-xs sm:text-sm text-emerald-200/80 max-w-md mx-auto">
                Thank you, <strong>{name}</strong>. Our developer support engineers have received your inquiry and will reply to <strong>{email}</strong> shortly.
              </p>
              <div className="pt-4">
                <button
                  onClick={handleReset}
                  className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-6 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition"
                >
                  Send Another Inquiry
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {errorMessage && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-emerald-300 uppercase mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl bg-slate-900/90 border border-emerald-500/20 px-3.5 py-2.5 text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-emerald-300 uppercase mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="you@yourdomain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl bg-slate-900/90 border border-emerald-500/20 px-3.5 py-2.5 text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-emerald-300 uppercase mb-1">Topic / Category</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-xl bg-slate-900/90 border border-emerald-500/20 px-3.5 py-2.5 text-white focus:border-emerald-400 focus:outline-none"
                  >
                    <option value="general">General Gateway Inquiry</option>
                    <option value="integration">API & Webhook Integration Help</option>
                    <option value="pairing">Android Companion SMS Pairing</option>
                    <option value="merchants">Paytm / BharatPe / FamPay Connection</option>
                    <option value="enterprise">Enterprise Custom Plan</option>
                    <option value="privacy">Security & Data Privacy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-emerald-300 uppercase mb-1">Order / Txn ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. PV_78B5B47D1B"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="w-full rounded-xl bg-slate-900/90 border border-emerald-500/20 px-3.5 py-2.5 text-white font-mono focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-emerald-300 uppercase mb-1">Your Message / Question *</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Describe your question, integration challenge, or feature request in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl bg-slate-900/90 border border-emerald-500/20 px-3.5 py-2.5 text-white focus:border-emerald-400 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full sm:w-auto rounded-xl bg-gradient-primary px-8 py-3 text-xs font-bold text-black shadow-glow hover:brightness-110 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSending ? 'Transmitting Message...' : 'Submit Support Ticket →'}</span>
                </button>
              </div>
            </form>
          )}

        </div>

      </div>

    </div>
  );
};
