import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { activeNetwork } from '@/config/networks';

const COLUMNS: { title: string; links: { label: string; to?: string; href?: string }[] }[] = [
  {
    title: 'Protocol',
    links: [
      { label: 'Explore launches', to: '/' },
      { label: 'Launch a token', to: '/launch' },
      { label: 'Portfolio', to: '/portfolio' },
      { label: 'Faucet', to: '/faucet' },
      { label: 'Token Transfer', to: '/transfer' },
      {
        label: 'Contracts',
        href: `${activeNetwork.explorerUrl}/address/${activeNetwork.contracts.bulionManager}`,
      },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Telegram', href: 'https://t.me/bulionxyz' },
      { label: 'X', href: 'https://x.com/bulionxyz' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/[0.08] bg-[#070910]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-[1.6fr_1fr_1fr] gap-10 md:gap-0 py-12 md:divide-x md:divide-white/[0.05]">
          <div className="flex flex-col items-start gap-4 md:pr-12">
            <Logo />
            <p className="text-white/50 text-[14px] leading-relaxed max-w-[42ch]">
              Fair-launch memecoins on LitVM. Bonding-curve price discovery, a protective bid wall and
              creator fee streams — all powered by Uniswap v4 hooks.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
              {activeNetwork.label}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col gap-3 md:pl-12">
              <h4 className="eyebrow text-white/40">{col.title}</h4>
              {col.links.map((l) =>
                l.to ? (
                  <Link
                    key={l.label}
                    to={l.to}
                    className="text-white/60 hover:text-[#5865F2] transition-colors text-[14px] font-medium w-fit"
                  >
                    {l.label}
                  </Link>
                ) : (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/60 hover:text-[#5865F2] transition-colors text-[14px] font-medium w-fit"
                  >
                    {l.label}
                  </a>
                )
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.06] py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30">
            © {new Date().getFullYear()} Bulion
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30">
            Testnet build — tokens have no real value
          </p>
        </div>
      </div>
    </footer>
  );
}
