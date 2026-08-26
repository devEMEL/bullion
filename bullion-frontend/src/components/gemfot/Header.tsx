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
    <header className="fixed top-0 inset-x-0 z-50 bg-[#070910]/95 backdrop-blur-xl border-b border-white/[0.08] h-[64px]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-5 h-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-5 shrink-0">
          <Logo />

          <nav className="hidden md:flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg border border-white/[0.06]">
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
                    className="px-3 py-1.5 rounded-md text-[12px] font-bold bg-[#5865F2]/15 border border-[#5865F2]/40 text-[#9FA6F8] hover:bg-[#5865F2] hover:text-white transition-all"
                  >
                    {item.label}
                  </Link>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 max-w-md mx-2">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 text-[13px] text-white placeholder-white/35 focus:outline-none focus:border-[#5865F2]/60 transition-all font-medium"
            />
          </form>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-semibold text-white/40 border border-white/5 bg-white/[0.02] px-2.5 py-1.5 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {activeNetwork.label}
          </div>

          <div className="relative">
            {!isConnected ? (
              <button
                onClick={() => open()}
                className="h-9 px-4 text-[12px] font-bold rounded-lg bg-[#5865F2] text-white hover:brightness-110 transition-all cursor-pointer"
              >
                Connect Wallet
              </button>
            ) : (
              <>
                <button
                  onClick={() => setDropdown((v) => !v)}
                  className="flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-lg bg-[#121624] hover:bg-[#161B2E] transition-colors cursor-pointer border border-white/[0.1]"
                >
                  <Avatar address={address!} size={24} />
                  <div className="flex flex-col items-start leading-tight gap-0.5">
                    <span className="text-[11px] font-bold text-white">{short}</span>
                    <span className="text-[10px] font-semibold text-white/45 font-mono">
                      {bal} {CONTRACTS.nativeTokenSymbol || 'bUSDC'}
                    </span>
                  </div>
                  <ChevronDown
                    size={13}
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
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white"
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#070910] px-4 py-3 space-y-1">
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
                className={`block px-3 py-2.5 rounded-lg text-[13px] font-bold ${
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
