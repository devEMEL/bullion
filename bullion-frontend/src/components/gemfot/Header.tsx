import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useDisconnect, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { Menu, X, LogOut, Copy, Check, ChevronDown, Search } from 'lucide-react';
import { Logo } from './Logo';
import { activeNetwork, CONTRACTS } from '@/config/networks';
import Erc20Abi from '@/abi/ERC20.json';

function Avatar({ address, size = 28 }: { address: string; size?: number }) {
  const seed = parseInt(address.slice(2, 10) || '0', 16);
  const hue = seed % 360;
  return (
    <span
      className="shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${hue} 80% 60%), hsl(${(hue + 80) % 360} 70% 50%))`,
      }}
    />
  );
}

const NAV_ITEMS = [
  { label: 'Explore', path: '/' },
  { label: 'Launch', path: '/launch', isHighlight: true },
  { label: 'Portfolio', path: '/portfolio' },
  { label: 'Faucet', path: '/faucet' },
  { label: 'Transfer', path: '/transfer' },
];

export default function Header() {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [dropdown, setDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/');
    }
  };

  const { data: nativeBalance } = useReadContract({
    address: CONTRACTS.nativeToken,
    abi: (Erc20Abi as any).abi || Erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const short = address ? `${address.slice(0, 4)}…${address.slice(-4)}` : '';
  const bal = nativeBalance
    ? Number(formatUnits(nativeBalance as bigint, CONTRACTS.nativeTokenDecimals)).toLocaleString(
        undefined,
        { maximumFractionDigits: 2 }
      )
    : '0.00';

  const copy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#0B0E17]/90 backdrop-blur-xl border-b border-white/[0.08] h-[76px]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-full flex items-center justify-between gap-4">
        {/* Left: App Logo & Header Nav */}
        <div className="flex items-center gap-6 shrink-0">
          <Logo />

          {/* Top Header Navigation Items without icons */}
          <nav className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/[0.06]">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);

              if (item.isHighlight) {
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="px-4 py-1.5 rounded-full text-[13px] font-black bg-[#5865F2] text-white hover:brightness-110 transition-all shadow-[0_0_12px_rgba(88,101,242,0.4)]"
                  >
                    {item.label}
                  </Link>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all ${
                    isActive
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Center: Token Search Bar */}
        <div className="flex-1 max-w-md mx-2">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 bg-black/50 border border-white/10 rounded-full pl-10 pr-4 text-sm text-white placeholder-white/35 focus:outline-none focus:border-primary/80 focus:bg-black/80 transition-all font-medium"
            />
          </form>
        </div>

        {/* Right: Wallet & Mobile Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-semibold text-white/40 border border-white/5 bg-white/[0.02] px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {activeNetwork.label}
          </div>

          <div className="relative">
            {!isConnected ? (
              <button
                onClick={() => open()}
                className="h-10 px-5 text-[13px] font-bold rounded-full bg-primary text-black hover:brightness-110 transition-all shadow-[0_2px_14px_rgba(255,210,23,0.35)] cursor-pointer flex items-center justify-center"
              >
                Connect Wallet
              </button>
            ) : (
              <>
                <button
                  onClick={() => setDropdown((v) => !v)}
                  className="flex items-center gap-2.5 h-10 pl-2 pr-3 rounded-full bg-[#121624] hover:bg-[#161B2E] transition-colors cursor-pointer border border-white/[0.1] shadow-md"
                >
                  <Avatar address={address!} size={26} />
                  <div className="flex flex-col items-start leading-tight gap-0.5">
                    <span className="text-[12px] font-bold text-white tracking-tight">{short}</span>
                    <span className="text-[10px] font-semibold text-white/45 font-mono">
                      {bal} {CONTRACTS.nativeTokenSymbol || 'BZKLTC'}
                    </span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-white/40 transition-transform ${dropdown ? 'rotate-180' : ''}`}
                  />
                </button>

                {dropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setDropdown(false)} />
                    <div className="absolute right-0 top-full mt-2 w-64 z-50 bg-[#121624] rounded-2xl shadow-2xl border border-white/[0.08] overflow-hidden">
                      <div className="p-3.5 border-b border-white/[0.08] flex items-center gap-3">
                        <Avatar address={address!} size={36} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-white">{short}</span>
                            <button
                              onClick={copy}
                              className="text-white/40 hover:text-primary transition-colors cursor-pointer"
                            >
                              {copied ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                            </button>
                          </div>
                          <span className="text-[11px] text-white/40 font-medium">
                            {activeNetwork.label}
                          </span>
                        </div>
                      </div>
                      <Link
                        to="/portfolio"
                        onClick={() => setDropdown(false)}
                        className="w-full flex items-center px-3.5 py-3 text-[13px] font-semibold text-white/70 hover:bg-white/[0.05] hover:text-white transition-colors"
                      >
                        My Portfolio
                      </Link>
                      <button
                        onClick={() => {
                          disconnect();
                          setDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-3 text-[13px] font-semibold text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer border-t border-white/[0.08]"
                      >
                        <LogOut size={13} />
                        Disconnect
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Mobile Hamburger Menu button */}
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle Navigation"
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#0B0E17]/95 px-4 py-4 space-y-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl text-[14px] font-bold ${
                  item.isHighlight
                    ? 'bg-[#5865F2] text-white'
                    : isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/70 hover:bg-white/5'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
