import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, ArrowRight, Building2, ShieldAlert } from 'lucide-react';

interface AuthPageProps {
  onSuccess: (targetPage?: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const { login, register } = useAuth();
  const [accountType, setAccountType] = useState<'MERCHANT' | 'ADMIN'>('MERCHANT');
  const [isLogin, setIsLogin] = useState(true);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (isLogin) {
      const res = await login(email, password);
      setIsLoading(false);
      if (res.success) {
        if (accountType === 'ADMIN' || res.user?.role === 'SUPER_ADMIN') {
          onSuccess('admin');
        } else {
          onSuccess('dashboard');
        }
      } else {
        setError(res.error || 'Invalid credentials');
      }
    } else {
      const res = await register({ name, email, password, businessName, phone });
      setIsLoading(false);
      if (res.success) {
        // Direct new registrations immediately to Plans Window
        onSuccess('plans');
      } else {
        setError(res.error || 'Registration failed');
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#090d16]">
      <div className="w-full max-w-md">
        
        {/* Account Type Selector Banner (Secure - No Credentials Displayed) */}
        <div className="mb-5 glass-card p-3 rounded-2xl border border-white/10 text-xs shadow-glow">
          <div className="flex items-center justify-between text-slate-400 mb-2 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Account Access Type:</span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
              accountType === 'MERCHANT' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
            }`}>
              {accountType === 'MERCHANT' ? 'MERCHANT PORTAL' : 'SUPER ADMIN ROOT'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setAccountType('MERCHANT'); setError(null); }}
              className={`rounded-xl p-2.5 text-left transition flex items-center gap-2.5 ${
                accountType === 'MERCHANT'
                  ? 'bg-indigo-600/30 border border-indigo-500/50 shadow-glow text-white'
                  : 'bg-slate-900/60 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                accountType === 'MERCHANT' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-500'
              }`}>
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <div className="font-bold text-[12px] leading-tight">Merchant Account</div>
                <div className="text-[10px] text-slate-400">Gateway & Settlements</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => { setAccountType('ADMIN'); setError(null); }}
              className={`rounded-xl p-2.5 text-left transition flex items-center gap-2.5 ${
                accountType === 'ADMIN'
                  ? 'bg-purple-600/30 border border-purple-500/50 shadow-glow text-white'
                  : 'bg-slate-900/60 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                accountType === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-500'
              }`}>
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <div className="font-bold text-[12px] leading-tight">Super Admin</div>
                <div className="text-[10px] text-slate-400">Platform Governance</div>
              </div>
            </button>
          </div>
        </div>

        {/* Auth Card */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl">
          
          <div className="text-center mb-6">
            <img src="/payvia_logo_white_text.png" alt="PayVia360 Logo" className="h-16 sm:h-20 w-auto mx-auto mb-2 object-contain drop-shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-transform hover:scale-105" />
            <p className="text-[10px] sm:text-[11px] text-emerald-400 font-mono font-bold tracking-widest uppercase mb-3">PAYMENT-SETTLEMENT ENGINE</p>
            <h1 className="font-display text-xl font-bold text-white">
              {isLogin ? (accountType === 'ADMIN' ? 'Super Admin Portal' : 'Welcome Back') : 'Create Merchant Account'}
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              {isLogin 
                ? (accountType === 'ADMIN' ? 'Enter administrator credentials for root governance' : 'Sign in to access your merchant payment workspace') 
                : 'Launch your direct settlement gateway in seconds'}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-900/80 p-1 border border-white/5 mb-6 text-xs font-semibold">
            <button
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`rounded-lg py-2 transition ${isLogin ? 'bg-indigo-600 text-white shadow-glow' : 'text-slate-400 hover:text-white'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setAccountType('MERCHANT'); setError(null); }}
              className={`rounded-lg py-2 transition ${!isLogin ? 'bg-indigo-600 text-white shadow-glow' : 'text-slate-400 hover:text-white'}`}
            >
              Register Merchant
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pankaj Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Business / Brand Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pankaj Enterprises"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder={accountType === 'ADMIN' ? 'admin@yourdomain.com' : 'you@company.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full mt-2 rounded-xl py-3 text-xs font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition disabled:opacity-50 ${
                accountType === 'ADMIN' && isLogin ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-gradient-primary'
              }`}
            >
              {isLoading ? 'Authenticating...' : isLogin ? (accountType === 'ADMIN' ? 'Sign In as Super Admin →' : 'Sign In to Dashboard →') : 'Create Free Account →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
