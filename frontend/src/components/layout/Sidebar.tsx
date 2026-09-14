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
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
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

  return (
    <aside className="w-64 shrink-0 border-r border-white/5 bg-[#0b0f19]/60 backdrop-blur-xl min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden md:flex">
      <div className="space-y-6">
        <div>
          <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
            Navigation Menu
          </span>
          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-primary text-white shadow-glow'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 transition ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : item.id === 'admin'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Gateway Status Pill */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-semibold text-emerald-400">Gateway Online</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">99.98%</span>
        </div>
        <p className="mt-1 text-[10px] text-slate-400">All direct merchant pollers and webhook workers active.</p>
      </div>
    </aside>
  );
};
