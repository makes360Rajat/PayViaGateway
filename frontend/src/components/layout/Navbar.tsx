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
  Menu,
  BookOpen,
  Code2,
  Lock,
  Headphones,
  Mail
} from 'lucide-react';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage, onToggleMobileMenu }) => {
  const { user, plan, logout } = useAuth();

  const handleScrollToOrNavigate = (sectionId: string) => {
    if (currentPage !== 'landing') {
      onNavigate('landing');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-500/15 bg-[#040f0c]/95 backdrop-blur-xl">
      <div className="flex min-h-[4.75rem] items-center justify-between px-4 sm:px-6 lg:px-8 py-2">
        
        {/* Left: Mobile Menu Toggle & Brand */}
        <div className="flex items-center gap-4">
          {user && (
            <button
              onClick={() => {
                if (onToggleMobileMenu) onToggleMobileMenu();
              }}
              aria-label="Toggle Navigation Menu"
              className="md:hidden flex items-center justify-center rounded-xl p-2.5 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 transition active:scale-95 shadow-glow"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div className="flex flex-col cursor-pointer group justify-center py-1" onClick={() => onNavigate(user ? 'dashboard' : 'landing')}>
            <img src="/payvia_logo_white_text.png" alt="PayVia360 Logo" className="h-10 sm:h-12 md:h-13 w-auto object-contain group-hover:scale-105 transition duration-300 drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]" />
            <span className="text-[8px] sm:text-[9.5px] text-emerald-400 font-mono font-bold tracking-widest uppercase mt-0.5">PAYMENT-SETTLEMENT ENGINE</span>
          </div>
        </div>

        {/* Center: Public Navigation Menu (Product, API, Documentation, Google Data, Security & Privacy, Contact) */}
        {!user && (
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-semibold text-emerald-200/90 font-mono">
            <button
              onClick={() => handleScrollToOrNavigate('what')}
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-emerald-500/10 transition"
            >
              Product
            </button>
            
            <button
              onClick={() => handleScrollToOrNavigate('api')}
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-emerald-500/10 transition"
            >
              API
            </button>

            <button
              onClick={() => onNavigate('docs')}
              className={`px-3 py-1.5 rounded-lg transition ${
                currentPage === 'docs' ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30' : 'hover:text-white hover:bg-emerald-500/10'
              }`}
            >
              Documentation
            </button>

            <button
              onClick={() => handleScrollToOrNavigate('google-data')}
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-emerald-500/10 transition"
            >
              Google data
            </button>

            <button
              onClick={() => handleScrollToOrNavigate('security')}
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-emerald-500/10 transition"
            >
              Security & Privacy
            </button>

            <button
              onClick={() => onNavigate('contact')}
              className={`px-3 py-1.5 rounded-lg transition ${
                currentPage === 'contact' ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30' : 'hover:text-white hover:bg-emerald-500/10'
              }`}
            >
              Contact
            </button>
          </nav>
        )}

        {/* Right: Action Controls & User Status */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Super Admin Center Button (for Root Admin) */}
              {user?.role === 'SUPER_ADMIN' && (
                <button
                  onClick={() => onNavigate('admin')}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
                    currentPage === 'admin'
                      ? 'bg-rose-600 border-rose-500 text-white shadow-glow'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-600/30 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4 text-rose-400" />
                  <span>Super Admin</span>
                </button>
              )}

              {/* Documentation link for signed-in users */}
              <button
                onClick={() => onNavigate('docs')}
                className={`hidden md:flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  currentPage === 'docs'
                    ? 'bg-emerald-600/30 border-emerald-500/60 text-white shadow-glow'
                    : 'bg-slate-900/80 border-white/10 text-slate-200 hover:border-emerald-500/40 hover:text-white'
                }`}
              >
                <BookOpen className="h-4 w-4 text-emerald-400" />
                <span>Docs</span>
              </button>

              {/* My Profile Button */}
              <button
                onClick={() => onNavigate('profile')}
                className={`hidden sm:flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition active:scale-95 ${
                  currentPage === 'profile'
                    ? 'bg-purple-600/30 border-purple-500/60 text-white shadow-glow'
                    : 'bg-slate-900/80 border-white/10 text-slate-200 hover:border-purple-500/40 hover:text-white'
                }`}
              >
                <User className="h-4 w-4 text-purple-400" />
                <span>My Profile</span>
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
              <div className="flex items-center gap-2 border-l border-white/10 pl-3">
                <div 
                  onClick={() => onNavigate('profile')}
                  className="flex flex-col text-right hidden sm:block cursor-pointer hover:opacity-80 transition"
                  title="View My Profile"
                >
                  <span className="text-xs font-semibold text-white">{user.businessName || user.name}</span>
                  <span className="text-[10px] text-purple-400 font-mono">{user.role}</span>
                </div>

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="rounded-xl p-2 text-slate-400 hover:bg-rose-500/15 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => onNavigate('auth')}
                className="text-xs font-medium text-emerald-300 hover:text-white transition px-3 py-1.5"
              >
                Sign In
              </button>
              
              <button
                onClick={() => onNavigate('auth')}
                className="rounded-xl bg-gradient-primary px-4 sm:px-5 py-2 text-xs font-bold text-black shadow-glow hover:brightness-110 active:scale-95 transition"
              >
                Get Started →
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

