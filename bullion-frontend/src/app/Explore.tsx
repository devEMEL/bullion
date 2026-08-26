import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  RefreshCw,
  Loader2,
  AlertTriangle,
  Search,
  Flame,
  Sparkles,
  BarChart3,
  Copy,
  Check,
  TrendingUp,
  Award,
} from 'lucide-react';

import { useLaunches, type EnrichedLaunch } from '@/hooks/useLaunches';
import { useVolume } from '@/hooks/useVolume';
import { useTopTokens, type TopVolumeToken, type TopEarningToken } from '@/hooks/useTopPools';
import { CONTRACTS } from '@/config/networks';
import { calcExpectedRaise, countdown, fmtNative, progressPct, timeAgo } from '@/lib/format';

type Filter = 'all' | 'live' | 'trading' | 'ended';
type Sort = 'new' | 'raised' | 'progress';

function CopyTicker({ symbol }: { symbol: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(symbol);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="inline-flex items-center gap-1 text-[11px] font-medium text-white/40 hover:text-[#5865F2] transition-colors"
    >
      ${symbol}
      {copied ? <Check size={11} className="text-[#5865F2]" /> : <Copy size={11} />}
    </button>
  );
}

function LaunchBlock({ launch, index }: { launch: EnrichedLaunch; index: number }) {
  const pct = progressPct(launch.initialTokenFairLaunch, launch.remainingSupply);

  return (
    <Link
      to={`/token/${launch.memecoin}`}
      className="group flex flex-col justify-between bg-[#121624]/90 hover:bg-[#161B2E] rounded-2xl border border-white/[0.08] hover:border-[#5865F2]/50 transition-all duration-300 overflow-hidden animate-card-in p-4 shadow-lg hover:shadow-[0_8px_30px_rgba(88,101,242,0.15)] hover:-translate-y-0.5"
      style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
    >
      <div>
        {/* Header: Image + Title + Status Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-11 h-11 rounded-xl shrink-0 bg-black/40 border border-white/10 overflow-hidden shadow-inner">
              {launch.imageUrl ? (
                <img
                  src={launch.imageUrl}
                  alt={launch.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#5865F2]/25 to-[#3B82F6]/15">
                  <span className="text-[13px] font-extrabold text-[#5865F2]">
                    {launch.symbol.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex flex-col">
              <h3 className="text-[14px] font-extrabold tracking-tight text-white group-hover:text-[#5865F2] transition-colors truncate">
                {launch.name}
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/40 mt-0.5">
                <CopyTicker symbol={launch.symbol} />
                <span>·</span>
                <span className="text-white/30">{timeAgo(Number(launch.createdAtTimestamp))}</span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          {launch.isScheduled ? (
            <span className="chip text-amber-300 bg-amber-500/10 border-amber-500/20 shrink-0 text-[10px] py-1 px-2.5 rounded-full font-bold">
              Starts in {countdown(Number(launch.fairLaunchStartsAt))}
            </span>
          ) : launch.isLive ? (
            <span className="chip chip-live shrink-0 text-[10px] py-1 px-2.5 rounded-full font-bold bg-[#5865F2]/15 text-[#9FA6F8] border-[#5865F2]/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5865F2] animate-blink" />
              {countdown(Number(launch.fairLaunchEndsAt))}
            </span>
          ) : launch.poolInitialized ? (
            <span className="chip shrink-0 text-[10px] py-1 px-2.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Trading
            </span>
          ) : (
            <span className="chip shrink-0 text-[10px] py-1 px-2.5 rounded-full font-bold text-white/40 bg-white/5 border-white/[0.08]">
              Ended
            </span>
          )}
        </div>

        {/* Bonding Curve Meter */}
        <div className="my-3.5">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Fair Launch Fill</span>
            <span className="text-[12px] font-extrabold text-[#5865F2] tabular-nums">{pct.toFixed(1)}%</span>
          </div>
          <div className="meter h-1.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
            <span
              className="h-full bg-gradient-to-r from-[#5865F2] to-[#60A5FA] rounded-full transition-all duration-500 block"
              style={{ width: `${Math.min(Math.max(pct, 1), 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.06] bg-black/20 -mx-4 -mb-4 p-3 rounded-b-2xl">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/35">Raised</span>
          <span className="text-[13px] font-bold text-white tabular-nums">${fmtNative(launch.revenue)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/35">Target Cap</span>
          <span className="text-[13px] font-bold text-white tabular-nums">${fmtNative(launch.targetMarketCap)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/35">Exp. Raise</span>
          <span className="text-[13px] font-bold text-[#5865F2] tabular-nums">${calcExpectedRaise(launch.targetMarketCap, launch.multiple)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/35">Total Fairlaunch Buy</span>
          <span className="text-[13px] font-bold text-white tabular-nums">{launch.buyCount}</span>
        </div>
      </div>
    </Link>
  );
}

function fmtUSD(value: string | number) {
  const n = Number(value);
  if (isNaN(n)) return '$0';
  return '$' + n.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 2 });
}

function RankBadge({ rank }: { rank: number }) {
  const gold = rank === 1 ? 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10' : '';
  const silver = rank === 2 ? 'text-slate-300 border-slate-300/40 bg-slate-300/10' : '';
  const bronze = rank === 3 ? 'text-amber-600 border-amber-600/40 bg-amber-600/10' : '';
  const rest = rank > 3 ? 'text-white/30 border-white/10 bg-white/5' : '';
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full border text-[11px] font-black shrink-0 ${
        gold || silver || bronze || rest
      }`}
    >
      {rank}
    </span>
  );
}

function TokenAvatar({ imageUrl, symbol }: { imageUrl: string; symbol: string }) {
  return imageUrl ? (
    <img
      src={imageUrl}
      alt={symbol}
      className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0"
      loading="lazy"
    />
  ) : (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#5865F2]/30 to-[#3B82F6]/20 border border-white/10 flex items-center justify-center shrink-0">
      <span className="text-[10px] font-black text-[#5865F2]">{symbol.slice(0, 2).toUpperCase()}</span>
    </div>
  );
}

function TopVolumeTokenRow({
  token,
  rank,
  imageUrl,
}: {
  token: TopVolumeToken;
  rank: number;
  imageUrl: string;
}) {
  return (
    <Link
      to={`/token/${token.id}`}
      className="group flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] transition-colors"
    >
      <RankBadge rank={rank} />
      <TokenAvatar imageUrl={imageUrl} symbol={token.symbol} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-white truncate">{token.symbol}</p>
        <p className="text-[10px] text-white/35">
          MCap {token.marketCapUSD > 0 ? fmtUSD(token.marketCapUSD) : '—'}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[12px] font-bold text-white tabular-nums">{fmtUSD(token.volumeUSD)}</p>
        <p className="text-[10px] text-white/35">24h {token.vol24h ? fmtUSD(token.vol24h) : '—'}</p>
      </div>
    </Link>
  );
}


function TopEarningTokenRow({
  token,
  rank,
  imageUrl,
}: {
  token: TopEarningToken;
  rank: number;
  imageUrl: string;
}) {
  return (
    <Link
      to={`/token/${token.id}`}
      className="group flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] transition-colors"
    >
      <RankBadge rank={rank} />
      <TokenAvatar imageUrl={imageUrl} symbol={token.symbol} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-white truncate">{token.symbol}</p>
        <p className="text-[10px] text-white/35 truncate">{token.name}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[12px] font-bold text-amber-400 tabular-nums">{fmtUSD(token.feesUSD)}</p>
        <p className="text-[10px] text-white/35">fees</p>
      </div>
    </Link>
  );
}

export default function Explore() {
  const { launches, loading, error, refetch } = useLaunches();
  const { volume24h, volumeAllTime, trades24h, dexVolumeAllTime, dex24hVolume, feesAllTime } = useVolume();
  const { volumeTokens, earningTokens, loading: topLoading } = useTopTokens();

  // Build a quick address→imageUrl map from already-loaded launches
  const launchImageMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of launches) {
      if (l.memecoin && l.imageUrl) map.set(l.memecoin.toLowerCase(), l.imageUrl);
    }
    return map;
  }, [launches]);
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('new');
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';

  const setQ = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value.trim()) next.set('q', value);
    else next.delete('q');
    setSearchParams(next, { replace: true });
  };
  const stats = useMemo(() => {
    const totalRaised = launches.reduce((acc, l) => acc + BigInt(l.revenue || '0'), 0n);
    const live = launches.filter((l) => l.isLive).length;
    return { totalRaised, live };
  }, [launches]);

  const visible = useMemo(() => {
    let list = launches;
    if (filter === 'live') list = list.filter((l) => l.isLive);
    if (filter === 'trading') list = list.filter((l) => l.poolInitialized);
    if (filter === 'ended') list = list.filter((l) => !l.isLive && !l.poolInitialized);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(needle) ||
          l.symbol.toLowerCase().includes(needle) ||
          l.memecoin.toLowerCase().includes(needle)
      );
    }
    const sorted = [...list];
    if (sort === 'new')
      sorted.sort((a, b) => Number(b.createdAtTimestamp) - Number(a.createdAtTimestamp));
    if (sort === 'raised')
      sorted.sort((a, b) => (BigInt(b.revenue || 0) > BigInt(a.revenue || 0) ? 1 : -1));
    if (sort === 'progress')
      sorted.sort(
        (a, b) =>
          progressPct(b.initialTokenFairLaunch, b.remainingSupply) -
          progressPct(a.initialTokenFairLaunch, a.remainingSupply)
      );
    return sorted;
  }, [launches, filter, sort, q]);

  const sortTabs: { key: Sort; label: string; icon: typeof Flame }[] = [
    { key: 'raised', label: 'Most raised', icon: Flame },
    { key: 'new', label: 'Newest', icon: Sparkles },
    { key: 'progress', label: 'Closest to fill', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-[1280px] mx-auto px-3 md:px-5 py-4">
        {/* Top Hero Section: Protocol Stats Bar + Leaderboards */}
        <div className="mb-6 space-y-4">
          {/* 4 Stat Cards in 1 Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#121624]/90 rounded-2xl p-4 border border-white/[0.08] flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">Total Raised</span>
                <span className="p-1.5 rounded-lg bg-[#5865F2]/10 text-[#5865F2] border border-[#5865F2]/20">
                  <Flame size={14} />
                </span>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-extrabold text-white tabular-nums tracking-tight">
                  ${fmtNative(stats.totalRaised.toString())}
                </p>
                <p className="text-[11px] font-medium text-white/35 mt-0.5">{CONTRACTS.nativeTokenSymbol}</p>
              </div>
            </div>

            <div className="bg-[#121624]/90 rounded-2xl p-4 border border-[#5865F2]/25 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5865F2]">Live Curves</span>
                <span className="p-1.5 rounded-lg bg-[#5865F2]/15 text-[#9FA6F8] border border-[#5865F2]/30">
                  <Sparkles size={14} />
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl sm:text-2xl font-extrabold text-[#5865F2] tabular-nums tracking-tight">
                    {stats.live}
                  </p>
                  <span className="text-[11px] font-medium text-white/35">/ {launches.length} total</span>
                </div>
                <p className="text-[11px] font-medium text-[#5865F2]/70 mt-0.5">Active fair launches</p>
              </div>
            </div>

            <div className="bg-[#121624]/90 rounded-2xl p-4 border border-white/[0.08] flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">24h DEX Volume</span>
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <BarChart3 size={14} />
                </span>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-extrabold text-white tabular-nums tracking-tight">
                  ${Number(dex24hVolume).toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] font-medium text-white/35 mt-0.5">Swaps in 24h</p>
              </div>
            </div>

            <div className="bg-[#121624]/90 rounded-2xl p-4 border border-white/[0.08] flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">Total LP Fees</span>
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Award size={14} />
                </span>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-extrabold text-white tabular-nums tracking-tight">
                  ${Number(feesAllTime).toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] font-medium text-white/35 mt-0.5">Earned by LPs</p>
              </div>
            </div>
          </div>

          {/* 2 Leaderboards side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-[#121624]/90 rounded-2xl border border-white/[0.08] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-black/20">
                <TrendingUp size={14} className="text-[#5865F2]" />
                <span className="text-[13px] font-extrabold text-white">Top Volume Tokens</span>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-white/30">All time</span>
              </div>
              {topLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={16} className="animate-spin text-[#5865F2]" />
                </div>
              ) : volumeTokens.length === 0 ? (
                <p className="text-[12px] text-white/30 text-center py-8">No token data yet</p>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {volumeTokens.map((token, i) => (
                    <TopVolumeTokenRow
                      key={token.id}
                      token={token}
                      rank={i + 1}
                      imageUrl={launchImageMap.get(token.id.toLowerCase()) ?? ''}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#121624]/90 rounded-2xl border border-white/[0.08] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-black/20">
                <Award size={14} className="text-amber-400" />
                <span className="text-[13px] font-extrabold text-white">Top Earning Tokens</span>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-white/30">By LP fees</span>
              </div>
              {topLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={16} className="animate-spin text-amber-400" />
                </div>
              ) : earningTokens.length === 0 ? (
                <p className="text-[12px] text-white/30 text-center py-8">No token data yet</p>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {earningTokens.map((token, i) => (
                    <TopEarningTokenRow
                      key={token.id}
                      token={token}
                      rank={i + 1}
                      imageUrl={launchImageMap.get(token.id.toLowerCase()) ?? ''}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter Toolbar Container */}
        <div
          id="launches"
          className="bg-[#121624]/90 rounded-2xl p-3 md:p-4 border border-white/[0.08] shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 scroll-mt-20"
        >
          {/* Left: Sort Tabs & Filter Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort Tabs */}
            <div className="bg-black/30 p-1 rounded-xl border border-white/5 flex items-center gap-1">
              {sortTabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                    sort === key
                      ? 'bg-[#5865F2] text-white shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>

            {/* Filter Status Group */}
            <div className="bg-black/30 p-1 rounded-xl border border-white/5 flex items-center gap-1">
              {(
                [
                  ['all', 'All'],
                  ['live', 'Live'],
                  ['trading', 'Trading'],
                  ['ended', 'Ended'],
                ] as [Filter, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                    filter === key
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {key === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-[#5865F2] animate-pulse" />}
                  {key === 'trading' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  {key === 'ended' && <span className="w-1.5 h-1.5 rounded-full bg-white/30" />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Refresh & Count indicator */}
          <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
            <span className="text-[11px] font-bold text-white/40 tabular-nums bg-black/30 px-3 py-1.5 rounded-xl border border-white/5">
              Showing <span className="text-white font-extrabold">{visible.length}</span> of {launches.length} tokens
            </span>
            <button
              onClick={refetch}
              className="h-8 w-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
              title="Refresh"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {loading && launches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={18} className="animate-spin text-[#5865F2]" />
            <p className="text-[12px] font-semibold text-white/40">Loading launches…</p>
          </div>
        )}

        {error && launches.length === 0 && !loading && (
          <div className="bg-[#121624] rounded-xl p-8 border border-white/[0.08] flex flex-col items-center gap-3 text-center max-w-md mx-auto">
            <AlertTriangle size={18} className="text-red-500" />
            <p className="text-[14px] font-bold text-white">Couldn't reach the subgraph</p>
            <p className="text-[12px] text-white/45 break-words">{error}</p>
            <button onClick={refetch} className="btn btn-primary h-9 px-5 mt-1 text-[12px]">
              Try again
            </button>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div className="bg-[#121624] rounded-xl p-10 border border-white/[0.08] flex flex-col items-center gap-3 text-center">
            <p className="text-[15px] font-bold tracking-tight text-white">
              {launches.length === 0 ? 'No launches yet' : 'Nothing matches that filter'}
            </p>
            <p className="text-white/50 text-[12px] max-w-[40ch]">
              {launches.length === 0
                ? 'Be the first to put a token on the curve.'
                : 'Try a different search term or filter.'}
            </p>
            <Link to="/launch" className="btn btn-primary h-9 px-6 mt-1 text-[12px]">
              Launch a token
            </Link>
          </div>
        )}

        {visible.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
            {visible.map((l, i) => (
              <LaunchBlock key={l.id} launch={l} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
