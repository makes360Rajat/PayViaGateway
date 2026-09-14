import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Wallet,
  ReceiptText,
  PlusCircle,
  KeyRound,
  Palette,
  CreditCard,
  FileCode2,
  ShieldAlert,
  Smartphone,
  Zap,
  Activity,
  X
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isOpen, onClose }) => {
  const { user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Live Dashboard', icon: LayoutDashboard },
    { id: 'merchants', label: 'Connected Merchants', icon: Wallet, badge: 'Direct' },
    { id: 'orders', label: 'Orders & Settlements', icon: ReceiptText },
    { id: 'create-order', label: 'Create Order Link', icon: PlusCircle },
    { id: 'devices', label: 'Android SMS Gateway', icon: Smartphone, badge: 'Live App' },
    { id: 'api-keys', label: 'API Keys & Webhooks', icon: KeyRound },
    { id: 'payment-page', label: 'Checkout & 10 Templates', icon: Palette, badge: '10 Designs' },
    { id: 'plans', label: 'Plans & Billing', icon: CreditCard },
    { id: 'docs', label: 'Developer API Docs', icon: FileCode2 },
  ];

  if (user?.role === 'SUPER_ADMIN') {
    navItems.push({
      id: 'admin',
      label: 'Super Admin Center',
      icon: ShieldAlert,
      badge: 'Super VIP'
    });
  }

  const handleItemClick = (id: string) => {
    onNavigate(id);
    if (onClose) onClose();
  };

  const sidebarContent = (
    <div className="w-68 shrink-0 border-r border-emerald-500/20 bg-[#061410] backdrop-blur-2xl h-full p-4 flex flex-col justify-between shadow-2xl overflow-y-auto">
      <div className="space-y-6">

        {/* Workspace Menu Header */}
        <div className="px-3 pt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-glow" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 font-mono">
              Workspace Nav
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md">
              v2.4 Live
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="md:hidden rounded-lg p-1 text-emerald-400 hover:bg-emerald-500/15"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`group relative flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-xs font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-400 text-black font-extrabold shadow-glow translate-x-1'
                    : 'text-emerald-100/75 hover:bg-emerald-500/10 hover:text-white hover:translate-x-1'
                }`}
              >
                {/* Active Left Indicator Bar */}
                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-black rounded-r-full" />
                )}

                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 transition-transform duration-300 group-hover:scale-110 ${
                    isActive ? 'text-black' : 'text-emerald-400 group-hover:text-amber-300'
                  }`} />
                  <span className="tracking-wide">{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                    isActive
                      ? 'bg-black/20 text-black shadow-sm'
                      : item.id === 'admin'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Cyberpunk Gateway Status Widget */}
      <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-[#0b261d]/90 to-[#061410]/90 p-4 shadow-glow relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="text-xs font-bold text-amber-300 font-display">Gateway Engine</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
            <Activity className="h-3 w-3 animate-pulse" />
            <span>99.99%</span>
          </div>
        </div>

        <p className="mt-2 text-[10px] text-emerald-200/80 leading-relaxed font-sans">
          Direct QR & UPI intent pollers active with sub-second automated UTR matching.
        </p>

        <div className="mt-3 pt-2.5 border-t border-emerald-500/20 flex items-center justify-between text-[10px] font-mono text-emerald-400/80">
          <span>LATENCY: &lt;450ms</span>
          <span className="text-amber-400 font-bold">SECURE SSL</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block min-h-[calc(100vh-4rem)]">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar Overlay Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          {/* Drawer */}
          <div className="relative flex w-72 flex-col z-10 animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
