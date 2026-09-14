import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldCheck, 
  User, 
  LogOut, 
  ExternalLink, 
  Sparkles,
  Layers,
  PlusCircle
} from 'lucide-react';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage }) => {
  const { user, plan, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#090d16]/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate(user ? 'dashboard' : 'landing')}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 shadow-glow">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold tracking-tight text-white">PayVia</span>
              <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
                VIP GATEWAY
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono tracking-wider">DIRECT-TO-MERCHANT SETTLEMENT</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Demo Sandbox Quick Nav */}
          <button
            onClick={() => onNavigate('demo')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition border ${
              currentPage === 'demo'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Demo Store & Sandbox</span>
          </button>

          {user ? (
            <>
              {/* Quick Create Button */}
              <button
                onClick={() => onNavigate('create-order')}
                className="hidden sm:flex items-center gap-1.5 rounded-lg bg-gradient-primary px-3.5 py-1.5 text-xs font-semibold text-white shadow-glow hover:brightness-110 transition active:scale-95"
              >
                <PlusCircle className="h-4 w-4" />
                <span>New Payment Link</span>
              </button>

              {/* Plan Badge */}
              <div 
                onClick={() => onNavigate('plans')}
                className="hidden md:flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-500/20 cursor-pointer transition"
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                <span>{plan?.name || 'Active Plan'}</span>
              </div>

              {/* User Dropdown / Controls */}
              <div className="flex items-center gap-2 border-l border-white/10 pl-3">
                <div className="flex flex-col text-right hidden sm:block">
                  <span className="text-xs font-semibold text-slate-200">{user.businessName || user.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{user.role}</span>
                </div>

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('docs')}
                className="text-xs font-medium text-slate-300 hover:text-white transition px-3 py-1.5"
              >
                API Docs
              </button>
              <button
                onClick={() => onNavigate('auth')}
                className="rounded-lg bg-gradient-primary px-4 py-2 text-xs font-semibold text-white shadow-glow hover:brightness-110 transition"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
