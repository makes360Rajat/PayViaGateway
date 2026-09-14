import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldCheck, 
  User, 
  LogOut, 
  ExternalLink, 
  Sparkles,
  Layers,
  PlusCircle,
  Menu
} from 'lucide-react';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage, onToggleMobileMenu }) => {
  const { user, plan, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-500/15 bg-[#040f0c]/90 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left: Mobile Menu Toggle & Brand */}
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={() => {
                console.log('Mobile menu toggle clicked');
                if (onToggleMobileMenu) onToggleMobileMenu();
              }}
              aria-label="Toggle Navigation Menu"
              className="md:hidden flex items-center justify-center rounded-xl p-2.5 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 transition active:scale-95 shadow-glow"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate(user ? 'dashboard' : 'landing')}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-amber-500 shadow-glow group-hover:scale-105 transition">
              <ShieldCheck className="h-6 w-6 text-black font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-xl font-bold tracking-tight text-white">PayVia</span>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  VIP GATEWAY
                </span>
              </div>
              <span className="text-[10px] text-emerald-300/70 font-mono tracking-wider hidden sm:block">CYBER-SETTLEMENT ENGINE</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Quick Create Button */}
              <button
                onClick={() => onNavigate('create-order')}
                className="hidden sm:flex items-center gap-1.5 rounded-xl bg-gradient-primary px-3.5 py-2 text-xs font-semibold text-black shadow-glow hover:brightness-110 transition active:scale-95"
              >
                <PlusCircle className="h-4 w-4" />
                <span>New Payment Link</span>
              </button>

              {/* Plan Badge */}
              <div 
                onClick={() => onNavigate('plans')}
                className="hidden md:flex items-center gap-1.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 cursor-pointer transition shadow-glow-amber"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                <span>{plan?.name || 'Active Plan'}</span>
              </div>

              {/* User Dropdown / Controls */}
              <div className="flex items-center gap-2 border-l border-emerald-500/20 pl-3">
                <div className="flex flex-col text-right hidden sm:block">
                  <span className="text-xs font-semibold text-emerald-100">{user.businessName || user.name}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">{user.role}</span>
                </div>

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="rounded-xl p-2 text-emerald-400 hover:bg-rose-500/15 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('docs')}
                className="text-xs font-medium text-emerald-300 hover:text-white transition px-3 py-1.5"
              >
                API Docs
              </button>
              <button
                onClick={() => onNavigate('auth')}
                className="rounded-xl bg-gradient-primary px-4 py-2 text-xs font-semibold text-black shadow-glow hover:brightness-110 transition"
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
