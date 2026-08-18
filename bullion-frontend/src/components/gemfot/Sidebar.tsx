import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, Rocket, Briefcase, Coins, Send, ExternalLink } from 'lucide-react';
import { Logo } from './Logo';
import { activeNetwork } from '@/config/networks';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Explore', href: '/', icon: Compass },
  { label: 'Launch', href: '/launch', icon: Rocket },
  { label: 'Portfolio', href: '/portfolio', icon: Briefcase },
  { label: 'Faucet', href: '/faucet', icon: Coins },
  { label: 'Transfer', href: '/transfer', icon: Send },
];

export default function Sidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const { pathname } = useLocation();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {/* Desktop Sidebar (Fixed Left) */}
      <aside className="hidden md:flex flex-col fixed top-[76px] left-0 bottom-0 w-64 bg-[#0B0E17]/95 backdrop-blur-xl border-r border-white/[0.08] z-40 p-4 justify-between">
        <div className="flex flex-col gap-6">
          <div className="px-3 pt-2">
            <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">
              Navigation
            </span>
          </div>

          <nav className="flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              const isLaunch = item.href === '/launch';

              // Launch button gets a distinct vibrant gradient highlight
              if (isLaunch) {
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 shadow-lg ${
                      active
                        ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-purple-500/30 border border-violet-400/40 ring-2 ring-purple-500/20'
                        : 'bg-gradient-to-r from-violet-600/80 via-purple-600/80 to-indigo-600/80 text-white hover:from-violet-500 hover:to-indigo-500 hover:shadow-purple-500/20 border border-violet-500/30'
                    }`}
                  >
                    <Icon size={18} className="text-white animate-bounce-subtle" />
                    <span>{item.label}</span>
                    <span className="ml-auto text-[9px] uppercase tracking-wider font-extrabold bg-amber-400 text-black px-2 py-0.5 rounded-full shadow-sm">
                      HOT
                    </span>
                  </Link>
                );
              }

              // Normal items: active gets standard text highlight without dark background box for Explore
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    active
                      ? 'text-primary font-bold'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon
                    size={18}
                    className={active ? 'text-primary' : 'text-white/40 group-hover:text-white'}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Info Box */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-white/35 font-bold">
              Network
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {activeNetwork.label}
            </span>
          </div>

          <a
            href={`${activeNetwork.explorerUrl}/address/${activeNetwork.contracts.gemfotManager}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-xs text-white/40 hover:text-primary transition-colors pt-2 border-t border-white/[0.05]"
          >
            <span>Protocol Contract</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden bg-[#0B0E17]/95 backdrop-blur-2xl transition-all duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col h-full pt-[80px] px-6 pb-8 justify-between">
          <nav className="flex flex-col gap-2">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onCloseMobile}
                  className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-base transition-colors ${
                    active
                      ? 'bg-primary text-black shadow-lg shadow-primary/20'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {activeNetwork.label}
            </div>
            <span className="text-xs font-mono text-white/30">v1.0.0</span>
          </div>
        </div>
      </div>
    </>
  );
}
