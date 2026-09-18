import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import payviaLogo from '../../assets/payvia_logo_white_text.png';
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
  const { user, plan, subscription, usage, entitlements, isPlanActive, planUsage, refreshProfile, logout } = useAuth();

  useEffect(() => {
    if (user) {
      refreshProfile();
    }
  }, [currentPage]);

  const handleScrollToOrNavigate = (sectionId: string) => {
    if (currentPage !== 'landing') {
      onNavigate('landing');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const ordersToday = usage?.ordersToday ?? subscription?.ordersToday ?? (subscription as any)?.orders_today ?? 0;
  const ordersMax = usage?.ordersMax ?? plan?.maxOrdersPerDay ?? (plan as any)?.max_orders_per_day ?? (user?.role === 'SUPER_ADMIN' ? '∞' : 2000);
  const maxNum = typeof ordersMax === 'number' ? ordersMax : (typeof ordersMax === 'string' && !isNaN(Number(ordersMax)) ? Number(ordersMax) : 2000);
  const progressPercent = Math.min(100, Math.max(6, Math.round((Number(ordersToday) / (maxNum || 1)) * 100)));

  const testOrdersUsed = entitlements?.testOrdersUsed ?? planUsage?.used ?? 0;
  const testOrdersMax = entitlements?.testOrdersMax ?? planUsage?.limit ?? 5;
  const testOrdersRemaining = entitlements?.testOrdersRemaining ?? planUsage?.remaining ?? Math.max(0, testOrdersMax - testOrdersUsed);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#070b14]/90 backdrop-blur-xl transition-all duration-300">
      <div className="flex h-16 sm:h-20 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left: Brand Identity / Mobile Hamburger */}
        <div className="flex items-center gap-3 sm:gap-4">
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
            <img src={payviaLogo} alt="PayVia360 Logo" className="h-10 sm:h-12 md:h-13 w-auto object-contain group-hover:scale-105 transition duration-300 drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]" />
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

              {/* Package & Quota Card: Active Pro Plan vs Free Test Mode */}
              {!isPlanActive ? (
                <div 
                  onClick={() => onNavigate('plans')}
                  className="group relative flex flex-col justify-center rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-950/40 to-[#12162a]/90 backdrop-blur-md px-3.5 py-1.5 shadow-[0_0_20px_rgba(245,158,11,0.15)] cursor-pointer hover:border-amber-400 hover:bg-[#181e36] transition-all duration-300 select-none"
                  title="Free Test Mode: 5 Test Orders Limit. Click to Upgrade to Live Payments."
                >
                  {/* Top Row: Free Test Badge + Upgrade Callout */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                      <span className="text-[11.5px] font-extrabold text-amber-300 font-display tracking-wide group-hover:text-amber-200 transition">
                        ✦ FREE TEST
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-black bg-amber-400 px-2 py-0.5 rounded-full group-hover:bg-amber-300 transition shadow-sm">
                      UPGRADE NOW
                    </span>
                  </div>

                  {/* Bottom Row: Test Orders Quota */}
                  <div className="mt-1 flex items-center justify-between gap-3 text-[10px] font-mono">
                    <span className="text-amber-200/80 font-sans font-medium text-[10px]">Test Orders</span>
                    <span className="font-bold tracking-wider">
                      <span className={testOrdersRemaining > 0 ? "text-amber-300 font-bold" : "text-rose-400 font-bold"}>
                        {testOrdersUsed}
                      </span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="text-slate-400 font-bold">{testOrdersMax}</span>
                    </span>
                  </div>

                  {/* Dynamic Progress Bar */}
                  <div className="mt-1.5 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        testOrdersUsed >= testOrdersMax
                          ? 'bg-gradient-to-r from-rose-500 to-rose-400'
                          : 'bg-gradient-to-r from-amber-400 to-orange-400'
                      }`}
                      style={{ 
                        width: `${Math.min(100, Math.max(8, Math.round((testOrdersUsed / (testOrdersMax || 1)) * 100)))}%` 
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => onNavigate('plans')}
                  className="group relative flex flex-col justify-center rounded-2xl border border-emerald-500/35 bg-[#101422]/90 backdrop-blur-md px-3.5 py-1.5 shadow-glow cursor-pointer hover:border-emerald-400/60 hover:bg-[#151a2e] transition-all duration-300 select-none"
                  title="View Subscription Plans & Daily Quota"
                >
                  {/* Top Row: Plan Name + Pulsing Active Indicator */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                      <span className="text-[11.5px] font-extrabold text-emerald-300 font-display tracking-wide group-hover:text-emerald-200 transition">
                        {plan?.name || (user?.role === 'SUPER_ADMIN' ? 'Enterprise VIP' : 'Pro Plan')}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                      ACTIVE
                    </span>
                  </div>

                  {/* Bottom Row: Daily Orders Quota */}
                  <div className="mt-1 flex items-center justify-between gap-3 text-[10px] font-mono">
                    <span className="text-slate-400 font-sans font-medium text-[10px]">Daily Orders Quota</span>
                    <span className="font-bold text-white tracking-wider">
                      <span className="text-emerald-400 font-bold">{ordersToday}</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="text-emerald-200 font-bold">{ordersMax}</span>
                    </span>
                  </div>

                  {/* Mini Dynamic Animated Progress Bar */}
                  <div className="mt-1.5 h-1 w-full bg-slate-800/80 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-500 shadow-sm"
                      style={{ 
                        width: `${progressPercent}%` 
                      }}
                    />
                  </div>
                </div>
              )}

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

