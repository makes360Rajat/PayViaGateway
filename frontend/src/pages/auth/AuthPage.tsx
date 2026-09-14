import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Lock, Mail, Building, Phone, ArrowRight, Sparkles, UserCheck } from 'lucide-react';

interface AuthPageProps {
  onSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const { login, register } = useAuth();
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
        onSuccess();
      } else {
        setError(res.error || 'Invalid credentials');
      }
    } else {
      const res = await register({ name, email, password, businessName, phone });
      setIsLoading(false);
      if (res.success) {
        onSuccess();
      } else {
        setError(res.error || 'Registration failed');
      }
    }
  };

  const autofillMerchant = () => {
    setEmail('pankajpanks007@gmail.com');
    setPassword('Db@0125');
    setIsLogin(true);
  };

  const autofillAdmin = () => {
    setEmail('admin@payvia.vip');
    setPassword('Admin@123456');
    setIsLogin(true);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#090d16]">
      <div className="w-full max-w-md">
        
        {/* Quick Demo Credentials Autofill Banner */}
        <div className="mb-6 glass-card p-3.5 rounded-2xl border border-indigo-500/20 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-indigo-400 mb-2">
            <Sparkles className="h-4 w-4" />
            <span>Quick Login Presets</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={autofillMerchant}
              className="rounded-lg bg-indigo-600/20 border border-indigo-500/30 p-2 text-left hover:bg-indigo-600/30 transition text-slate-200"
            >
              <div className="font-bold text-[11px] text-white">Merchant Account</div>
              <div className="text-[10px] text-slate-400 font-mono">pankajpanks007@...</div>
            </button>
            <button
              onClick={autofillAdmin}
              className="rounded-lg bg-purple-600/20 border border-purple-500/30 p-2 text-left hover:bg-purple-600/30 transition text-slate-200"
            >
              <div className="font-bold text-[11px] text-purple-300">Super Admin</div>
              <div className="text-[10px] text-slate-400 font-mono">admin@payvia.vip</div>
            </button>
          </div>
        </div>

        {/* Auth Card */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl">
          
          <div className="text-center mb-6">
            <h1 className="font-display text-2xl font-bold text-white">
              {isLogin ? 'Welcome Back' : 'Create Merchant Account'}
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              {isLogin ? 'Sign in to access your payment workspace' : 'Launch your direct settlement gateway in seconds'}
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
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`rounded-lg py-2 transition ${!isLogin ? 'bg-indigo-600 text-white shadow-glow' : 'text-slate-400 hover:text-white'}`}
            >
              Register
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
                placeholder="you@company.com"
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
              className="w-full mt-2 rounded-xl bg-gradient-primary py-3 text-xs font-bold text-white shadow-glow hover:brightness-110 active:scale-95 transition disabled:opacity-50"
            >
              {isLoading ? 'Authenticating...' : isLogin ? 'Sign In to Dashboard →' : 'Create Free Account →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
