import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import payviaLogo from '../../assets/payvia_logo_white_text.png';
import { Lock, Mail, ArrowRight, Building2, ShieldAlert } from 'lucide-react';

interface AuthPageProps {
  onSuccess: (targetPage?: string) => void;
  /** When true, shows the Super Admin tab. Never set this on the public /login route. */
  adminMode?: boolean;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, adminMode = false }) => {
  const { login, register } = useAuth();

  // In admin mode start on ADMIN tab; otherwise always MERCHANT
  const [accountType, setAccountType] = useState<'MERCHANT' | 'ADMIN'>(adminMode ? 'ADMIN' : 'MERCHANT');
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
    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const res = await login(email, password);
        if (res.success) {
          if (accountType === 'ADMIN' || res.user?.role === 'SUPER_ADMIN') {
            onSuccess('admin');
          } else {
            onSuccess('dashboard');
          }
        } else {
          setError(res.error || 'Invalid email or password');
        }
      } else {
        const res = await register({
          email,
          password,
          name,
          businessName,
          phone
        });
        if (res.success) {
          onSuccess('plans');
        } else {
          setError(res.error || 'Registration failed');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">

        {/* Account Type Selector — only shown in adminMode */}
        {adminMode && (
          <div className="bg-[#0e131f]/80 p-1.5 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => { setAccountType('MERCHANT'); setError(null); }}
                className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-semibold transition-all duration-300 ${
                  accountType === 'MERCHANT'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30 scale-[1.02]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className={`p-1 rounded-lg ${accountType === 'MERCHANT' ? 'bg-white/20' : 'bg-slate-800'}`}>
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-[12px] leading-tight">Merchant</div>
                  <div className="text-[10px] text-slate-400">Payment Gateway</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setAccountType('ADMIN'); setError(null); }}
                className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-semibold transition-all duration-300 ${
                  accountType === 'ADMIN'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/30 scale-[1.02]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className={`p-1 rounded-lg ${accountType === 'ADMIN' ? 'bg-white/20' : 'bg-slate-800'}`}>
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-[12px] leading-tight">Super Admin</div>
                  <div className="text-[10px] text-slate-400">Platform Governance</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Auth Card */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl">

          <div className="text-center mb-6">
            <img src={payviaLogo} alt="PayVia360 Logo" className="h-16 sm:h-20 w-auto mx-auto mb-2 object-contain drop-shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-transform hover:scale-105" />
            {accountType === 'ADMIN' && isLogin && (
              <h1 className="font-display text-xl font-bold text-white">Super Admin Portal</h1>
            )}
          </div>

          {/* Tab Switcher — hide Register tab in admin mode */}
          <div className={`grid gap-1 rounded-xl bg-slate-900/80 p-1 border border-white/5 mb-6 text-xs font-semibold ${adminMode ? 'grid-cols-2' : 'grid-cols-2'}`}>
            <button
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`rounded-lg py-2 transition ${isLogin ? 'bg-indigo-600 text-white shadow-glow' : 'text-slate-400 hover:text-white'}`}
            >
              Sign In
            </button>
            {/* Register tab is always visible on public /login; hidden on admin portal if desired */}
            <button
              onClick={() => { setIsLogin(false); setAccountType('MERCHANT'); setError(null); }}
              className={`rounded-lg py-2 transition ${!isLogin ? 'bg-indigo-600 text-white shadow-glow' : 'text-slate-400 hover:text-white'}`}
            >
              {adminMode ? 'Merchant Register' : 'Register Merchant'}
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

        {/* Subtle security note on admin portal */}
        {adminMode && (
          <p className="text-center text-[10px] text-slate-700 font-mono">
            Restricted access · Unauthorized use is prohibited
          </p>
        )}
      </div>
    </div>
  );
};
