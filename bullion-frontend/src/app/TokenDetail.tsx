import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAccount, usePublicClient, useReadContract } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  MessageCircle,
  Twitter,
} from 'lucide-react';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import { useLaunch } from '@/hooks/useLaunch';
import { useSwap } from '@/hooks/useSwap';
import { useSwapQuote } from '@/hooks/swap/useSwapQuote';
import { CONTRACTS, explorerTx } from '@/config/networks';
import type { TokenConfig } from '@/config/tokens';
import { calcExpectedRaise, countdown, fmtNative, fmtToken, progressPct, shortAddress, timeAgo } from '@/lib/format';
import { quoteFairLaunchBuy } from '@/lib/fairLaunchQuote';
import { bulionQuery, GET_POOL_DETAIL } from '@/lib/bulionQueries';
import Erc20Abi from '@/abi/ERC20.json';

function StatPill({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-[#121624] rounded-xl px-3 py-2 border border-white/[0.08] min-w-0">
      <p className="text-[10px] font-semibold text-white/40 truncate">{label}</p>
      <p className="text-[14px] font-bold text-white tabular-nums leading-tight mt-0.5 truncate">
        {value}
      </p>
      {hint && <p className="text-[9px] font-medium text-white/30 mt-0.5 truncate">{hint}</p>}
    </div>
  );
}

const getPriceFromSqrt = (sqrtPriceStr: string, token0: any, token1: any) => {
  if (!token0 || !token1 || !sqrtPriceStr) return 0;
  const sqrtPrice = Number(sqrtPriceStr);
  const decimals0 = Number(token0.decimals || 18);
  const decimals1 = Number(token1.decimals || 18);

  const t0Price = Math.pow(sqrtPrice / Math.pow(2, 96), 2) * Math.pow(10, decimals0 - decimals1);

  const getPriority = (symbol: string) => {
    const sym = (symbol || '').toUpperCase();
    if (sym === 'USDC' || sym === 'bUSDC' || sym === CONTRACTS.nativeTokenSymbol.toUpperCase()) return 100;
    if (sym === 'ETH' || sym === 'WETH') return 50;
    return 0;
  };

  const p0 = getPriority(token0.symbol);
  const p1 = getPriority(token1.symbol);

  if (p0 > p1) {
    return t0Price > 0 ? 1 / t0Price : 0;
  } else {
    return t0Price;
  }
};

const formatCurrency = (val: string | number | undefined) => {
  if (val === undefined || val === null || isNaN(Number(val))) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(Number(val));
};

const formatSmallCurrency = (val: string | number | undefined): React.ReactNode => {
  if (val === undefined || val === null || isNaN(Number(val))) return '$0.00';

  const num = Number(val);
  if (num === 0) return '$0.00';

  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  // For "normal" magnitude numbers, just use standard currency formatting
  if (abs >= 0.01) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  }

  // For tiny numbers, count leading zeros after the decimal point
  const str = abs.toFixed(20).split('.')[1]; // avoid scientific notation
  let zeroCount = 0;
  for (const ch of str) {
    if (ch === '0') zeroCount++;
    else break;
  }

  const significantDigits = str.slice(zeroCount, zeroCount + 4).replace(/0+$/, '') || '0';

  // Use subscript notation when there are 4 or more leading zeros (e.g. $0.0₆25)
  if (zeroCount >= 4) {
    return (
      <span>
        {sign}$0.0<sub className="text-[0.62em] font-extrabold relative -bottom-[0.05em] mx-[0.5px] select-none text-white/80">{zeroCount}</sub>{significantDigits}
      </span>
    );
  }

  // For 1-3 leading zeros, show standard decimal representation
  return `${sign}$0.${'0'.repeat(zeroCount)}${significantDigits}`;
};

const formatPrice = formatSmallCurrency;

function TokenInfoCard({
  launch,
  marketCap,
  fdv,
}: {
  launch: any;
  marketCap: number;
  fdv: number;
}) {
  const isGraduated = Boolean(launch.isGraduated || launch.poolInitialized);

  const items = [
    {
      label: 'Total supply',
      value: fmtToken(launch.totalSupply || launch.initialTokenFairLaunch),
    },
    {
      label: 'Market Cap',
      value: formatCurrency(marketCap),
    },
    {
      label: 'FDV',
      value: formatCurrency(fdv),
    },
    {
      label: 'Creator fee',
      value: `${Number(launch.creatorFeeAllocation) / 100}%`,
    },
    ...(!isGraduated
      ? [
        {
          label: 'Fair launch supply',
          value: fmtToken(launch.initialTokenFairLaunch),
        },
        {
          label: 'Duration',
          value: `${(Number(launch.fairLaunchDuration) / 3600).toFixed(1)}h`,
        },
        {
          label: 'Multiple',
          value: `${launch.multiple}×`,
        },
        {
          label: 'Expected raise',
          value: `${calcExpectedRaise(launch.targetMarketCap, launch.multiple)} ${CONTRACTS.nativeTokenSymbol}`,
        },
        {
          label: 'Starts',
          value:
            launch.fairLaunchStartsAt && Number(launch.fairLaunchStartsAt) > 0
              ? Number(launch.fairLaunchStartsAt) > Math.floor(Date.now() / 1000)
                ? `In ${countdown(Number(launch.fairLaunchStartsAt))}`
                : new Date(Number(launch.fairLaunchStartsAt) * 1000).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Immediate',
        },
        {
          label: 'Ends',
          value:
            launch.fairLaunchEndsAt && Number(launch.fairLaunchEndsAt) > 0
              ? new Date(Number(launch.fairLaunchEndsAt) * 1000).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
              : '—',
        },
      ]
      : []),
  ];

  return (
    <div className="bg-[#121624] rounded-xl p-3 border border-white/[0.08]">
      <h3 className="text-[12px] font-bold text-white mb-2">Info</h3>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg bg-white/5 border border-white/[0.06] px-2.5 py-2 min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-white/35 truncate">{item.label}</p>
            <p className="text-[12px] font-bold text-white mt-0.5 truncate tabular-nums">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
        <span className="text-[11px] font-medium text-white/40">Status</span>
        <span className={`chip ${launch.isLive ? 'chip-live' : launch.isScheduled ? 'text-amber-300 bg-amber-500/10 border-amber-500/20' : launch.fairLaunchClosed ? '' : 'chip-ink'}`}>
          {launch.fairLaunchClosed ? 'Closed' : launch.isScheduled ? 'Scheduled' : launch.isLive ? 'Live' : isGraduated ? 'Graduated' : 'Ended'}
        </span>
      </div>
    </div>
  );
}

function TradeWidget({
  launch,
  tokenAddress,
  refetchLaunch,
}: {
  launch: any;
  tokenAddress: string;
  refetchLaunch: () => void;
}) {
  const { address: account, isConnected } = useAccount();
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [payToken, setPayToken] = useState<string>(CONTRACTS.nativeTokenSymbol);
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('0.50%');

  // DEX swap quote state (used when `launch` is already graduated)
  const [dexPool, setDexPool] = useState<any>(null);
  const [dexPoolFetchError, setDexPoolFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!launch.isGraduated || !launch.poolId) return;
      setDexPoolFetchError(null);
      setDexPool(null);
      try {
        const data = await bulionQuery<{ pool: any }>(GET_POOL_DETAIL, {
          id: String(launch.poolId).toLowerCase(),
        });
        if (!cancelled) setDexPool(data.pool);
      } catch (e: any) {
        if (!cancelled) setDexPoolFetchError(e?.message ?? 'Failed to fetch pool');
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [launch.isGraduated, launch.poolId]);

  const nativeAddr = CONTRACTS.nativeToken.toLowerCase();
  const memAddr = tokenAddress.toLowerCase();

  const poolNativeDecimals =
    dexPool?.token0?.id?.toLowerCase() === nativeAddr
      ? Number(dexPool.token0.decimals)
      : dexPool?.token1?.id?.toLowerCase() === nativeAddr
        ? Number(dexPool.token1.decimals)
        : CONTRACTS.nativeTokenDecimals;

  const poolMemDecimals =
    dexPool?.token0?.id?.toLowerCase() === memAddr
      ? Number(dexPool.token0.decimals)
      : dexPool?.token1?.id?.toLowerCase() === memAddr
        ? Number(dexPool.token1.decimals)
        : 18;

  const nativeTokenConfig: TokenConfig = {
    address: CONTRACTS.nativeToken,
    name: CONTRACTS.nativeTokenSymbol,
    symbol: CONTRACTS.nativeTokenSymbol,
    decimals: poolNativeDecimals,
    logo: '',
  };

  const memTokenConfig: TokenConfig = {
    address: tokenAddress as `0x${string}`,
    name: launch.name ?? launch.symbol,
    symbol: launch.symbol,
    decimals: poolMemDecimals,
    logo: '',
  };

  const quoteToken0 = side === 'buy' ? nativeTokenConfig : memTokenConfig;
  const quoteToken1 = side === 'buy' ? memTokenConfig : nativeTokenConfig;

  const {
    outputAmount: dexOutputAmount,
    error: dexQuoteError,
    onInputChange: dexOnInputChange,
  } = useSwapQuote({
    token0: quoteToken0,
    token1: quoteToken1,
    poolFee: dexPool ? parseInt(dexPool.feeTier) : 3000,
    tickSpacing: dexPool ? parseInt(dexPool.tickSpacing) : 60,
    hooksAddress: (dexPool?.hooks ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
    sqrtPriceX96: dexPool?.sqrtPrice ?? '0',
  });

  useEffect(() => {
    if (!launch.isGraduated || !dexPool) return;
    // Keep quote output in sync with the amount the user is typing.
    dexOnInputChange(amount);
  }, [amount, side, launch.isGraduated, dexPool, dexOnInputChange]);

  const { swap, step, error: swapError, txHash, isBusy } = useSwap(tokenAddress, launch.isGraduated);

  const { data: nativeBalance } = useReadContract({
    address: CONTRACTS.nativeToken,
    abi: (Erc20Abi as any).abi || Erc20Abi,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    query: { enabled: !!account, refetchInterval: 12_000 },
  });

  const { data: tokenBalance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: (Erc20Abi as any).abi || Erc20Abi,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    query: { enabled: !!account && !!tokenAddress, refetchInterval: 12_000 },
  });

  const nativeBalNum = nativeBalance ? Number(formatUnits(nativeBalance as bigint, CONTRACTS.nativeTokenDecimals)) : 0;
  const tokenBalNum = tokenBalance ? Number(formatUnits(tokenBalance as bigint, 18)) : 0;

  const currentBalNum = side === 'buy' ? nativeBalNum : tokenBalNum;
  const currentTokenSymbol = side === 'buy' ? payToken : launch.symbol;

  const handleMax = () => {
    setAmount(currentBalNum ? String(currentBalNum) : '');
  };

  const onSwap = async () => {
    const hash = await swap(amount, side);
    if (hash) {
      setAmount('');
      refetchLaunch();
      setTimeout(() => refetchLaunch(), 1500);
      setTimeout(() => refetchLaunch(), 4000);
      setTimeout(() => refetchLaunch(), 7000);
    }
  };

  const isSellDisabledInFairLaunch = side === 'sell' && !launch.isGraduated;

  return (
    <div className="bg-[#121624] text-white rounded-xl p-3.5 border border-white/[0.08]">
      <h3 className="text-[13px] font-bold text-white text-center mb-3">
        Trade {launch.symbol}
      </h3>

      <div className="bg-white/5 p-0.5 rounded-lg flex items-center mb-3 border border-white/[0.06]">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-1.5 rounded-md text-[12px] font-bold transition-all cursor-pointer ${side === 'buy'
            ? 'bg-white text-black'
            : 'text-white/50 hover:text-white'
            }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-1.5 rounded-md text-[12px] font-bold transition-all cursor-pointer ${side === 'sell'
            ? 'bg-white text-black'
            : 'text-white/50 hover:text-white'
            }`}
        >
          Sell
        </button>
      </div>

      <div className="text-center mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/40 mb-1">
          {currentTokenSymbol} amount
        </p>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
          placeholder="0"
          inputMode="decimal"
          className="w-full text-center text-[28px] font-black text-white bg-transparent border-none outline-none placeholder:text-white/20 tabular-nums"
        />
      </div>

      {side === 'buy' ? (
        <div className="flex items-center justify-center gap-1.5 mb-3">
          {['10%', '25%', '50%', '100%'].map((pctStr) => (
            <button
              key={pctStr}
              onClick={() => {
                const pctVal = Number(pctStr.replace('%', ''));
                const calcAmt = (currentBalNum * pctVal) / 100;
                setAmount(calcAmt ? String(calcAmt) : '');
              }}
              className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 text-[11px] font-bold transition-all cursor-pointer"
            >
              {pctStr}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-1.5 mb-3">
          {['10%', '25%', '50%', '100%'].map((pctStr) => (
            <button
              key={pctStr}
              onClick={() => {
                const pctVal = Number(pctStr.replace('%', ''));
                const calcAmt = (tokenBalNum * pctVal) / 100;
                setAmount(calcAmt ? String(calcAmt) : '');
              }}
              className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 text-[11px] font-bold transition-all cursor-pointer"
            >
              {pctStr}
            </button>
          ))}
        </div>
      )}

      {side === 'buy' && amount && Number(amount) > 0 && !launch.isGraduated && (
        <div className="mb-2.5 px-3 py-2 bg-[rgba(88,101,242,0.12)] border border-[rgba(88,101,242,0.25)] rounded-lg flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold text-white/50">Est. receive</span>
          <span className="text-[12px] font-bold text-[#5865F2] tabular-nums truncate">
            ≈{' '}
            {fmtToken(
              (() => {
                const nativeIn = parseUnits(amount, CONTRACTS.nativeTokenDecimals);
                const quote = quoteFairLaunchBuy(
                  {
                    targetMarketCap: launch.targetMarketCap,
                    initialTokenFairLaunch: launch.initialTokenFairLaunch,
                    multiple: launch.multiple,
                    remainingSupply: launch.remainingSupply,
                  },
                  nativeIn
                );
                return quote.tokensOut.toString();
              })()
            )}{' '}
            {launch.symbol}
          </span>
        </div>
      )}

      {launch.isGraduated && amount && Number(amount) > 0 && dexPool && dexOutputAmount && !dexQuoteError && (
        <div className="mb-2.5 px-3 py-2 bg-[rgba(88,101,242,0.12)] border border-[rgba(88,101,242,0.25)] rounded-lg flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold text-white/50">Est. receive</span>
          <span className="text-[12px] font-bold text-[#5865F2] tabular-nums truncate">
            ≈ {dexOutputAmount}{' '}
            {side === 'buy' ? launch.symbol : CONTRACTS.nativeTokenSymbol}
          </span>
        </div>
      )}

      {dexQuoteError && launch.isGraduated && amount && Number(amount) > 0 && (
        <p className="mb-2 text-[11px] text-red-400 text-center break-words">
          {dexQuoteError}
        </p>
      )}

      {dexPoolFetchError && launch.isGraduated && (
        <p className="mb-2 text-[11px] text-red-400 text-center break-words">
          {dexPoolFetchError}
        </p>
      )}

      <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-white/50 mb-1.5">
        <span>
          Balance: {currentBalNum.toLocaleString(undefined, { maximumFractionDigits: 4 })} {currentTokenSymbol}
        </span>
        <button
          onClick={handleMax}
          className="text-[#5865F2] hover:underline cursor-pointer font-bold"
        >
          Max
        </button>
      </div>

      <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-white/40 mb-3">
        <span>Max slippage:</span>
        <button
          onClick={() => {
            const options = ['0.50%', '1.00%', '2.00%'];
            const idx = options.indexOf(slippage);
            setSlippage(options[(idx + 1) % options.length]);
          }}
          className="text-white hover:text-[#5865F2] inline-flex items-center gap-0.5 cursor-pointer font-bold"
        >
          {slippage}
          <ChevronDown size={12} />
        </button>
      </div>

      {isSellDisabledInFairLaunch ? (
        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-center text-white/50 text-[11px] font-semibold">
          Selling opens once token graduates to DEX
        </div>
      ) : launch.isScheduled ? (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center text-amber-300 text-[11px] font-bold">
          Fair launch starts in {countdown(Number(launch.fairLaunchStartsAt))}
        </div>
      ) : (
        <button
          onClick={onSwap}
          disabled={!isConnected || isBusy || !amount || Number(amount) <= 0}
          className="btn btn-primary w-full h-10 text-[13px] font-bold rounded-lg cursor-pointer"
        >
          {isBusy ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              {step === 'approving'
                ? 'Approving…'
                : step === 'signing'
                  ? 'Confirm in wallet…'
                  : 'Confirming…'}
            </span>
          ) : !isConnected ? (
            'Connect Wallet'
          ) : (
            `${side === 'buy' ? 'Buy' : 'Sell'} ${launch.symbol}`
          )}
        </button>
      )}

      {swapError && (
        <p className="mt-2 text-[11px] text-red-400 text-center break-words">
          {swapError}
        </p>
      )}

      {step === 'done' && txHash && (
        <a
          href={explorerTx(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#5865F2] hover:text-[#7983F5]"
        >
          <Check size={11} />
          Trade confirmed — view tx
        </a>
      )}
    </div>
  );
}

function DexPoolAnalytics({
  poolId,
  launch,
  tokenAddress,
  refetchLaunch,
  targetCapUSD,
  onPriceUpdate,
}: {
  poolId: string;
  launch: any;
  tokenAddress: string;
  refetchLaunch: () => void;
  targetCapUSD: number;
  onPriceUpdate?: (price: number) => void;
}) {
  const [pool, setPool] = useState<any>(null);
  const [swaps, setSwaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [swapsPage, setSwapsPage] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'trade' | 'info' | 'transactions'>('trade');
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!poolId) return;
    const fetchPoolDetail = async () => {
      try {
        setLoading(true);
        const data = await bulionQuery<{ pool: any }>(GET_POOL_DETAIL, {
          id: poolId.toLowerCase(),
        });
        setPool(data.pool);
        setSwaps(data.pool?.swaps?.length ? data.pool.swaps : launch.swaps || []);
      } catch (err) {
        console.error('Error fetching pool details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPoolDetail();
  }, [poolId, launch.swaps]);

  const reversedSwaps = useMemo(() => [...swaps].reverse(), [swaps]);
  const pointsData = useMemo(() => {
    if (!pool) return [];
    return reversedSwaps.map((swap: any, idx: number) => {
      const price = getPriceFromSqrt(swap.sqrtPriceX96, pool.token0, pool.token1);
      return {
        price,
        timestamp: Number(swap.timestamp),
        date: new Date(Number(swap.timestamp) * 1000),
        index: idx,
      };
    });
  }, [reversedSwaps, pool]);

  const currentPriceVal = pool ? getPriceFromSqrt(pool.sqrtPrice || '0', pool.token0, pool.token1) : 0;

  useEffect(() => {
    if (currentPriceVal > 0 && onPriceUpdate) {
      onPriceUpdate(currentPriceVal);
    }
  }, [currentPriceVal, onPriceUpdate]);
  const totalSupplyNum = launch?.totalSupply
    ? Number(formatUnits(BigInt(launch.totalSupply), 18))
    : launch?.initialTokenFairLaunch
      ? Number(formatUnits(BigInt(launch.initialTokenFairLaunch), 18))
      : 10_000_000_000;
  const currentMarketCap = currentPriceVal * totalSupplyNum;

  useEffect(() => {
    if (!chartContainerRef.current || swaps.length === 0 || !pool) return;

    const container = chartContainerRef.current;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.4)',
        fontFamily: 'Outfit, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.02)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.02)' },
      },
      rightPriceScale: {
        borderVisible: false,
        textColor: 'rgba(255, 255, 255, 0.4)',
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: {
          color: 'rgba(255,255,255,0.15)',
          width: 1,
          style: 3,
          labelVisible: false,
        },
        horzLine: {
          color: 'rgba(255,255,255,0.15)',
          width: 1,
          style: 3,
          labelVisible: false,
        },
      },
      handleScale: false,
      handleScroll: false,
      width: container.clientWidth || 500,
      height: container.clientHeight || 160,
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      priceFormat: {
        type: 'price',
        precision: 6,
        minMove: 0.000001,
      },
    });

    const chartData: { time: number; open: number; high: number; low: number; close: number }[] = [];
    let lastTime = 0;
    pointsData.forEach((pt, idx) => {
      let currentTime = pt.timestamp;
      if (currentTime <= lastTime) {
        currentTime = lastTime + 1;
      }
      const prevPrice = idx > 0 ? pointsData[idx - 1].price : pt.price;
      chartData.push({
        time: currentTime,
        open: prevPrice,
        high: Math.max(prevPrice, pt.price),
        low: Math.min(prevPrice, pt.price),
        close: pt.price,
      });
      lastTime = currentTime;
    });

    candlestickSeries.setData(chartData as any);
    chart.timeScale().fitContent();

    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        setHoveredPoint(null);
      } else {
        const timeVal = Number(param.time);
        const pt = chartData.find((d) => d.time === timeVal);
        if (pt) {
          setHoveredPoint({
            price: pt.close,
            date: new Date(pt.time * 1000),
          });
        } else {
          setHoveredPoint(null);
        }
      }
    });

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
      chart.timeScale().fitContent();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [swaps, pool, pointsData]);

  if (loading && !pool) {
    return (
      <div className="space-y-6">
        {/* Metric grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-[#121624] rounded-2xl p-4 border border-white/[0.08] flex flex-col gap-3">
              <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
              <div className="h-6 w-16 bg-white/5 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>

        {/* Chart + side panel skeleton */}
        <div className="grid lg:grid-cols-2 gap-5 items-stretch">
          {/* Chart skeleton */}
          <div className="bg-[#121624] rounded-[28px] p-5 md:p-6 border border-white/[0.08] min-h-[380px] flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
              <div className="h-5 w-28 bg-white/5 rounded-full animate-pulse" />
            </div>
            <div className="h-8 w-32 bg-white/5 rounded animate-pulse" />
            <div className="flex-1 min-h-[200px] bg-white/[0.02] rounded-2xl animate-pulse" />
          </div>

          {/* Side panel skeleton */}
          <div className="space-y-5">
            {/* Trade widget skeleton */}
            <div className="bg-[#121624] rounded-[28px] p-6 border border-white/[0.08] flex flex-col gap-4">
              <div className="h-5 w-32 bg-white/5 rounded animate-pulse mx-auto" />
              <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
              <div className="h-14 bg-white/5 rounded-2xl animate-pulse" />
              <div className="flex gap-2 justify-center">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="h-7 w-14 bg-white/5 rounded-full animate-pulse" />
                ))}
              </div>
              <div className="h-14 bg-white/5 rounded-2xl animate-pulse" />
            </div>
            {/* Info card skeleton */}
            <div className="bg-[#121624] rounded-[28px] p-6 border border-white/[0.08] flex flex-col gap-3">
              <div className="h-4 w-12 bg-white/5 rounded animate-pulse" />
              <div className="grid grid-cols-2 gap-3">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="rounded-2xl bg-white/5 border border-white/[0.06] px-3.5 py-3 flex flex-col gap-2">
                    <div className="h-2.5 w-16 bg-white/5 rounded animate-pulse" />
                    <div className="h-5 w-20 bg-white/5 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Swaps table skeleton */}
        <div className="bg-[#121624] rounded-[28px] overflow-hidden border border-white/[0.08]">
          <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
            <div className="h-5 w-28 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="divide-y divide-white/[0.06]">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.5fr_1fr_1.2fr_1.2fr_1fr] gap-4 px-6 py-4 items-center animate-pulse">
                <div className="h-4 bg-white/5 rounded w-12" />
                <div className="h-4 bg-white/5 rounded w-32" />
                <div className="h-4 bg-white/5 rounded w-14" />
                <div className="h-4 bg-white/5 rounded w-20" />
                <div className="h-4 bg-white/5 rounded w-20" />
                <div className="h-4 bg-white/5 rounded w-20 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentDayStart = Math.floor(Date.now() / 1000 / 86400) * 86400;
  const sevenDaysAgo = currentDayStart - 86400 * 7;
  const latestDay = pool?.poolDayData?.[0];
  const isRecent24h = latestDay && Number(latestDay.date) >= currentDayStart - 86400;

  const vol24h = isRecent24h ? Number(latestDay.volumeUSD) : 0;
  const fees24h = isRecent24h ? Number(latestDay.feesUSD) : 0;

  const vol7d = pool?.poolDayData?.reduce((acc: number, day: any) => {
    return Number(day.date) >= sevenDaysAgo ? acc + Number(day.volumeUSD) : acc;
  }, 0) || 0;
  const fees7d = pool?.poolDayData?.reduce((acc: number, day: any) => {
    return Number(day.date) >= sevenDaysAgo ? acc + Number(day.feesUSD) : acc;
  }, 0) || 0;

  const pagedSwaps = swaps.slice(swapsPage * 10, (swapsPage + 1) * 10);

  return (
    <div className="space-y-6">
      {/* 6 Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: '24h Volume', val: formatCurrency(vol24h) },
          { label: '7d Volume', val: formatCurrency(vol7d) },
          { label: 'All Time Volume', val: formatCurrency(pool?.volumeUSD) },
          { label: '24h Fees', val: formatCurrency(fees24h) },
          { label: '7d Fees', val: formatCurrency(fees7d) },
          { label: 'All Time Fees', val: formatCurrency(pool?.feesUSD) },
        ].map((m, i) => (
          <div
            key={i}
            className="bg-[#121624] rounded-2xl p-4 border border-white/[0.08] shadow-sm hover:border-white/15 transition-all flex flex-col justify-between"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/35">{m.label}</p>
            <p className="text-lg font-extrabold text-white mt-2 tabular-nums">{m.val}</p>
          </div>
        ))}
      </div>

      {/* Main Grid: Price Chart (Left) vs Right Side Tabs (Trade, Info, Transactions) */}
      <div className="grid lg:grid-cols-2 gap-5 items-stretch">
        {/* Left Side: Price History Chart */}
        <div className="bg-[#121624] rounded-[28px] p-5 md:p-6 border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between h-full min-h-[440px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-white/40 uppercase tracking-[0.08em]">Price History</span>
              </div>
              <span className="text-[11px] font-semibold text-[#5865F2] bg-[#5865F2]/10 px-2.5 py-1 rounded-full border border-[#5865F2]/20">
                Uniswap V4 Pool
              </span>
            </div>

            <div className="mb-2">
              <p className="text-3xl font-extrabold text-white tabular-nums tracking-tight">
                {hoveredPoint
                  ? formatPrice(hoveredPoint.price)
                  : currentPriceVal
                    ? formatPrice(currentPriceVal)
                    : '—'}
              </p>
              <p className="text-[12px] font-medium text-white/40 font-mono mt-1">
                {hoveredPoint ? hoveredPoint.date.toLocaleString() : ''}
              </p>
            </div>
          </div>

          <div className="relative flex-1 min-h-[240px] flex items-end mt-4">
            {swaps.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-white/30 text-[13px] font-semibold">
                No swap history available
              </div>
            ) : (
              <div ref={chartContainerRef} className="w-full h-full" />
            )}
          </div>
        </div>

        {/* Right Side: Tabbed Panel (Trade, Info, Transactions) */}
        <div className="bg-[#121624] rounded-[28px] p-5 md:p-6 border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col h-full">
          {/* Segmented Tab Headers */}
          <div className="flex bg-white/[0.04] p-1.5 rounded-2xl border border-white/[0.08] mb-5">
            <button
              onClick={() => setActiveTab('trade')}
              className={`flex-1 py-2 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer ${
                activeTab === 'trade'
                  ? 'bg-[#5865F2] text-white shadow-[0_2px_12px_rgba(88,101,242,0.4)]'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Trade
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
                activeTab === 'info'
                  ? 'bg-[#5865F2] text-white shadow-[0_2px_12px_rgba(88,101,242,0.4)]'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Info
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
                activeTab === 'transactions'
                  ? 'bg-[#5865F2] text-white shadow-[0_2px_12px_rgba(88,101,242,0.4)]'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Transactions
            </button>
          </div>

          {/* Tab 1: Trade */}
          {activeTab === 'trade' && (
            <TradeWidget launch={launch} tokenAddress={tokenAddress} refetchLaunch={refetchLaunch} />
          )}

          {/* Tab 2: Info */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <TokenInfoCard launch={launch} marketCap={currentMarketCap} fdv={targetCapUSD} />
              
              <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/[0.08]">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/35">Total Value Locked</p>
                <p className="text-2xl font-extrabold text-white tabular-nums tracking-tight mt-1">
                  {formatCurrency(pool?.totalValueLockedUSD)}
                </p>
              </div>

              <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/[0.08] border-l-4 border-l-[#5865F2]">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/35 mb-3">Pool Balances</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white/70">{pool?.token0?.symbol || 'Token0'}</span>
                    <span className="text-sm font-extrabold font-mono text-white tabular-nums">
                      {Number(pool?.totalValueLockedToken0 || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white/70">{pool?.token1?.symbol || 'Token1'}</span>
                    <span className="text-sm font-extrabold font-mono text-white tabular-nums">
                      {Number(pool?.totalValueLockedToken1 || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Transactions */}
          {activeTab === 'transactions' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h3 className="text-[13px] font-extrabold text-white">Recent DEX Swaps</h3>
                <span className="text-[11px] font-bold text-white/30 uppercase tracking-[0.1em]">
                  {swaps.length} swaps
                </span>
              </div>

              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {pagedSwaps.length > 0 ? (
                  pagedSwaps.map((row: any) => {
                    const formattedTime = new Date(Number(row.timestamp) * 1000).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const isSellToken0 = Number(row.amount0) < 0;
                    const nativeAddr = CONTRACTS.nativeToken.toLowerCase();
                    const isToken0Native = pool?.token0?.id?.toLowerCase() === nativeAddr;
                    const nativeAmount = isToken0Native ? Number(row.amount0) : Number(row.amount1);
                    const usdValue = Math.abs(nativeAmount);

                    const amount0Num = Math.abs(Number(row.amount0));
                    const amount1Num = Math.abs(Number(row.amount1));

                    return (
                      <a
                        key={row.id}
                        href={explorerTx(row.transaction.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-[#5865F2]/40 rounded-2xl transition-all space-y-2.5 group cursor-pointer shadow-sm"
                      >
                        {/* Header: Type + USD value */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                              isSellToken0
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {isSellToken0 ? `Sell ${pool?.token0?.symbol || 'Token'}` : `Buy ${pool?.token0?.symbol || 'Token'}`}
                          </span>
                          <span className="text-[13px] font-extrabold text-white tabular-nums group-hover:text-[#5865F2] transition-colors flex items-center gap-1">
                            {formatCurrency(usdValue)}
                            <ExternalLink size={11} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                          </span>
                        </div>

                        {/* Amounts Grid: Amount0 & Amount1 */}
                        <div className="grid grid-cols-2 gap-2 text-[12px] pt-0.5">
                          <div className="bg-white/[0.03] p-2 rounded-xl border border-white/[0.04]">
                            <span className="text-[10px] font-bold text-white/40 block uppercase tracking-wider mb-0.5">
                              {pool?.token0?.symbol || 'Amount 0'}
                            </span>
                            <span className="font-mono font-bold text-white tabular-nums">
                              {amount0Num < 0.0001 ? '<0.0001' : amount0Num.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            </span>
                          </div>
                          <div className="bg-white/[0.03] p-2 rounded-xl border border-white/[0.04] text-right">
                            <span className="text-[10px] font-bold text-white/40 block uppercase tracking-wider mb-0.5">
                              {pool?.token1?.symbol || 'Amount 1'}
                            </span>
                            <span className="font-mono font-bold text-white tabular-nums">
                              {amount1Num < 0.0001 ? '<0.0001' : amount1Num.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            </span>
                          </div>
                        </div>

                        {/* Footer: Time & Tx Hash */}
                        <div className="flex items-center justify-between text-[11px] text-white/35 pt-0.5 font-medium">
                          <span>{formattedTime}</span>
                          <span className="font-mono text-white/50 group-hover:text-[#5865F2] transition-colors">
                            {row.transaction.id.slice(0, 6)}...{row.transaction.id.slice(-4)}
                          </span>
                        </div>
                      </a>
                    );
                  })
                ) : (
                  <p className="py-8 text-center text-white/30 text-xs">No recent DEX swaps found</p>
                )}
              </div>

              {/* Pagination */}
              {swaps.length > 10 && (
                <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                  <span className="text-[11px] font-medium text-white/30">Page {swapsPage + 1}</span>
                  <div className="flex gap-2">
                    <button
                      disabled={swapsPage === 0}
                      onClick={() => setSwapsPage((prev) => Math.max(0, prev - 1))}
                      className="btn btn-soft h-7 px-3 text-[11px] disabled:opacity-30 disabled:pointer-events-none"
                    >
                      Prev
                    </button>
                    <button
                      disabled={(swapsPage + 1) * 10 >= swaps.length}
                      onClick={() => setSwapsPage((prev) => prev + 1)}
                      className="btn btn-soft h-7 px-3 text-[11px] disabled:opacity-30 disabled:pointer-events-none"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FairLaunchPriceChart({
  launch,
  currentPrice,
  pct,
}: {
  launch: any;
  currentPrice: number;
  pct: number;
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  const pointsData = useMemo(() => {
    if (!launch || !launch.buys) return [];
    const sortedBuys = [...launch.buys].sort((a: any, b: any) => Number(a.timestamp) - Number(b.timestamp));
    if (sortedBuys.length === 0) {
      const createdAt = Number(launch.createdAtTimestamp) || Math.floor(Date.now() / 1000) - 3600;
      const now = Math.floor(Date.now() / 1000);
      return [
        { time: createdAt, price: currentPrice, date: new Date(createdAt * 1000) },
        { time: now, price: currentPrice, date: new Date(now * 1000) },
      ];
    }
    const data: { time: number; price: number; date: Date }[] = [];
    let lastTime = 0;
    sortedBuys.forEach((buy: any) => {
      let t = Number(buy.timestamp);
      if (t <= lastTime) t = lastTime + 1;
      let tokens = 1;
      let native = 0;
      try {
        tokens = Number(formatUnits(BigInt(buy.tokensOut || '0'), 18)) || 1;
        native = Number(formatUnits(BigInt(buy.nativeIn || '0'), CONTRACTS.nativeTokenDecimals)) || 0;
      } catch {
        tokens = Number(buy.tokensOut) || 1;
        native = Number(buy.nativeIn) || 0;
      }
      const price = tokens > 0 ? native / tokens : currentPrice;
      data.push({ time: t, price, date: new Date(t * 1000) });
      lastTime = t;
    });
    return data;
  }, [launch, currentPrice]);

  useEffect(() => {
    if (!chartContainerRef.current || pointsData.length === 0) return;
    const container = chartContainerRef.current;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.4)',
        fontFamily: 'Outfit, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.02)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.02)' },
      },
      rightPriceScale: {
        borderVisible: false,
        textColor: 'rgba(255, 255, 255, 0.4)',
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: 'rgba(255,255,255,0.15)', width: 1, style: 3, labelVisible: false },
        horzLine: { color: 'rgba(255,255,255,0.15)', width: 1, style: 3, labelVisible: false },
      },
      handleScale: false,
      handleScroll: false,
      width: container.clientWidth || 500,
      height: container.clientHeight || 200,
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#5865F2',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#5865F2',
      wickDownColor: '#ef4444',
    });

    const chartData: { time: number; open: number; high: number; low: number; close: number }[] = [];
    let lastTime = 0;
    pointsData.forEach((pt, idx) => {
      let currentTime = pt.time;
      if (currentTime <= lastTime) currentTime = lastTime + 1;
      const prevPrice = idx > 0 ? pointsData[idx - 1].price : pt.price;
      chartData.push({
        time: currentTime,
        open: prevPrice,
        high: Math.max(prevPrice, pt.price),
        low: Math.min(prevPrice, pt.price),
        close: pt.price,
      });
      lastTime = currentTime;
    });

    candlestickSeries.setData(chartData as any);
    chart.timeScale().fitContent();

    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        setHoveredPoint(null);
      } else {
        const timeVal = Number(param.time);
        const pt = chartData.find((d) => d.time === timeVal);
        if (pt) {
          setHoveredPoint({ price: pt.close, date: new Date(pt.time * 1000) });
        } else {
          setHoveredPoint(null);
        }
      }
    });

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
      chart.timeScale().fitContent();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [pointsData]);

  const links = launch.links ?? {};

  return (
    <div className="bg-[#121624] rounded-[28px] p-5 md:p-6 border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between h-full space-y-5">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-white/40 uppercase tracking-[0.08em]">Price Chart</span>
          </div>
          <span className="text-[11px] font-semibold text-[#5865F2] bg-[#5865F2]/10 px-2.5 py-1 rounded-full border border-[#5865F2]/20">
            Fair Launch Curve
          </span>
        </div>

        <div className="mb-2">
          <p className="text-3xl font-extrabold text-white tabular-nums tracking-tight">
            {hoveredPoint ? formatPrice(hoveredPoint.price) : currentPrice ? formatPrice(currentPrice) : '—'}
          </p>
          <p className="text-[12px] font-medium text-white/40 font-mono mt-1">
            {hoveredPoint ? hoveredPoint.date.toLocaleString() : ''}
          </p>
        </div>

        <div className="relative w-full h-[200px] my-2">
          <div ref={chartContainerRef} className="w-full h-full" />
        </div>
      </div>

      {/* Curve progress section */}
      <div className="pt-4 border-t border-white/[0.08]">
        {launch.isScheduled && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <Clock size={16} className="text-amber-400" />
              </div>
              <div>
                <p className="text-[13px] font-extrabold text-amber-300">Fair Launch Starts Soon</p>
                <p className="text-[11px] font-medium text-amber-200/70 mt-0.5">
                  Opens {new Date(Number(launch.fairLaunchStartsAt) * 1000).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-[13px] font-extrabold text-amber-300 tabular-nums">
              Starts in {countdown(Number(launch.fairLaunchStartsAt))}
            </span>
          </div>
        )}

        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[13px] font-bold text-white/50">Curve filled</span>
          <span className="text-[14px] font-extrabold text-[#5865F2] tabular-nums">
            {pct.toFixed(2)}%
          </span>
        </div>
        <div className={`meter ${launch.isLive ? 'meter-live' : ''}`}>
          <span style={{ width: `${Math.min(Math.max(pct, 1), 100)}%` }} />
        </div>

        {launch.description && (
          <p className="text-white/60 text-[14px] leading-relaxed mt-4 pt-4 border-t border-white/[0.08]">
            {launch.description}
          </p>
        )}

        {(links.website || links.twitter || links.telegram) && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {links.website && (
              <a href={links.website} target="_blank" rel="noopener noreferrer" className="btn btn-soft h-8 px-3.5 text-[12px]">
                <Globe size={13} /> Website
              </a>
            )}
            {links.twitter && (
              <a href={links.twitter} target="_blank" rel="noopener noreferrer" className="btn btn-soft h-8 px-3.5 text-[12px]">
                <Twitter size={13} /> Twitter
              </a>
            )}
            {links.telegram && (
              <a href={links.telegram} target="_blank" rel="noopener noreferrer" className="btn btn-soft h-8 px-3.5 text-[12px]">
                <MessageCircle size={13} /> Telegram
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RightTabbedWidget({
  launch,
  tokenAddress,
  refetch,
  fairLaunchMarketCap,
  targetCapUSD,
}: {
  launch: any;
  tokenAddress: string;
  refetch: () => void;
  fairLaunchMarketCap: number;
  targetCapUSD: number;
}) {
  const [activeTab, setActiveTab] = useState<'trade' | 'info' | 'transactions'>('trade');

  return (
    <div className="bg-[#121624] rounded-[28px] p-5 md:p-6 border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col h-full">
      {/* Segmented Tab Headers: Trade (Default), Info, Transactions */}
      <div className="flex bg-white/[0.04] p-1.5 rounded-2xl border border-white/[0.08] mb-5">
        <button
          onClick={() => setActiveTab('trade')}
          className={`flex-1 py-2 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer ${
            activeTab === 'trade'
              ? 'bg-[#5865F2] text-white shadow-[0_2px_12px_rgba(88,101,242,0.4)]'
              : 'text-white/50 hover:text-white'
          }`}
        >
          Trade
        </button>
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
            activeTab === 'info'
              ? 'bg-[#5865F2] text-white shadow-[0_2px_12px_rgba(88,101,242,0.4)]'
              : 'text-white/50 hover:text-white'
          }`}
        >
          Info
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
            activeTab === 'transactions'
              ? 'bg-[#5865F2] text-white shadow-[0_2px_12px_rgba(88,101,242,0.4)]'
              : 'text-white/50 hover:text-white'
          }`}
        >
          Transactions
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'trade' && (
        <TradeWidget launch={launch} tokenAddress={tokenAddress} refetchLaunch={refetch} />
      )}

      {activeTab === 'info' && (
        <TokenInfoCard launch={launch} marketCap={fairLaunchMarketCap} fdv={targetCapUSD} />
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <span className="text-[13px] font-extrabold text-white">Trade Tape</span>
            <span className="text-[11px] font-bold text-white/30 uppercase tracking-[0.1em]">
              {(launch.buys || []).length} trades
            </span>
          </div>

          {(launch.buys || []).length === 0 ? (
            <p className="py-12 text-center text-white/40 text-[13px]">No trades yet — be the first.</p>
          ) : (
            <div className="divide-y divide-white/[0.06] max-h-[460px] overflow-y-auto pr-1">
              {(launch.buys || []).map((b: any) => (
                <a
                  key={b.id}
                  href={explorerTx(b.transactionHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between py-3 hover:bg-white/[0.03] px-2 rounded-xl transition-colors"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] font-medium text-white/60 font-mono">
                      {shortAddress(b.buyer, 4)}
                    </span>
                    <span className="text-[11px] font-medium text-white/30">
                      {timeAgo(Number(b.timestamp))}
                    </span>
                  </div>
                  <div className="text-right flex flex-col gap-0.5">
                    <span className="text-[13px] font-bold text-white tabular-nums">
                      {fmtToken(b.tokensOut)} <span className="text-white/35 font-medium">{launch.symbol}</span>
                    </span>
                    <span className="text-[12px] font-bold text-[#5865F2] tabular-nums">
                      {fmtNative(b.nativeIn)} <span className="text-white/35 font-medium">{CONTRACTS.nativeTokenSymbol}</span>
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TokenDetail() {
  const { address: tokenAddress } = useParams<{ address: string }>();
  const { launch, loading, error, refetch } = useLaunch(tokenAddress);
  const [copied, setCopied] = useState(false);
  const [dexPrice, setDexPrice] = useState<number | null>(null);

  const pct = useMemo(
    () => progressPct(launch?.initialTokenFairLaunch, launch?.remainingSupply),
    [launch]
  );

  const totalSupply = useMemo(() => {
    const rawSupply = launch?.totalSupply || launch?.initialTokenFairLaunch;
    if (!rawSupply) return 10_000_000_000;
    try {
      return Number(formatUnits(BigInt(rawSupply), 18));
    } catch {
      return 10_000_000_000;
    }
  }, [launch]);

  const targetCapUSD = useMemo(() => {
    if (!launch?.targetMarketCap) return 0;
    try {
      return Number(formatUnits(BigInt(launch.targetMarketCap), CONTRACTS.nativeTokenDecimals));
    } catch {
      return Number(launch.targetMarketCap);
    }
  }, [launch]);

  // Fair launch price and market cap calculations
  const fairLaunchMarketCap = targetCapUSD * (pct / 100);
  const fairLaunchPrice = totalSupply > 0 ? fairLaunchMarketCap / totalSupply : 0;
  const displayPrice = launch?.isGraduated ? dexPrice : fairLaunchPrice;

  const volume = useMemo(() => {
    if (!launch) return { day: 0n, all: 0n };
    const since = Math.floor(Date.now() / 1000) - 86_400;
    return launch.buys.reduce(
      (acc, b) => ({
        day: Number(b.timestamp) >= since ? acc.day + BigInt(b.nativeIn || 0) : acc.day,
        all: acc.all + BigInt(b.nativeIn || 0),
      }),
      { day: 0n, all: 0n }
    );
  }, [launch]);

  const copyAddress = () => {
    if (!tokenAddress) return;
    navigator.clipboard.writeText(tokenAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (loading && !launch) {
    return (
      <div className="min-h-screen">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
          {/* Back link skeleton */}
          <div className="h-4 w-24 bg-white/5 rounded animate-pulse mb-5" />

          {/* Token header skeleton */}
          <div className="bg-[#121624] rounded-[28px] p-5 md:p-6 border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.3)] mb-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-[20px] bg-white/5 shrink-0 animate-pulse" />
                <div className="flex flex-col gap-3 flex-1">
                  <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
                  <div className="flex gap-2">
                    <div className="h-5 w-24 bg-white/5 rounded-full animate-pulse" />
                    <div className="h-5 w-20 bg-white/5 rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="bg-white/[0.03] px-5 py-3 rounded-2xl border border-white/[0.08] flex flex-col gap-2">
                <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
                <div className="h-7 w-24 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Stats row skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 mb-5">
            {Array(7).fill(0).map((_, i) => (
              <div key={i} className="bg-[#121624] rounded-2xl px-4 py-3.5 border border-white/[0.08] flex flex-col gap-2">
                <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
                <div className="h-6 w-16 bg-white/5 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Main grid skeleton */}
          <div className="grid lg:grid-cols-2 gap-5 items-stretch">
            {/* Left col */}
            <div className="space-y-5">
              <div className="bg-[#121624] rounded-[28px] p-5 md:p-6 border border-white/[0.08] flex flex-col gap-4 min-h-[200px]">
                <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
                <div className="h-3 bg-white/5 rounded-full animate-pulse" />
                <div className="h-16 bg-white/5 rounded-2xl animate-pulse mt-2" />
              </div>
              <div className="bg-[#121624] rounded-[28px] overflow-hidden border border-white/[0.08]">
                <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
                  <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
                  <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
                </div>
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1.2fr_1fr_auto] gap-4 px-5 py-3 border-b border-white/[0.06] animate-pulse">
                    <div className="h-4 bg-white/5 rounded w-16" />
                    <div className="h-4 bg-white/5 rounded w-24" />
                    <div className="h-4 bg-white/5 rounded w-16" />
                    <div className="h-4 bg-white/5 rounded w-12" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right col */}
            <div className="space-y-5">
              <div className="bg-[#121624] rounded-[28px] p-6 border border-white/[0.08] flex flex-col gap-4">
                <div className="h-5 w-32 bg-white/5 rounded animate-pulse mx-auto" />
                <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
                <div className="h-14 bg-white/5 rounded-2xl animate-pulse" />
                <div className="flex gap-2 justify-center">
                  {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="h-7 w-14 bg-white/5 rounded-full animate-pulse" />
                  ))}
                </div>
                <div className="h-14 bg-white/5 rounded-2xl animate-pulse" />
              </div>
              <div className="bg-[#121624] rounded-[28px] p-5 md:p-6 border border-white/[0.08] flex flex-col gap-3">
                <div className="h-4 w-12 bg-white/5 rounded animate-pulse" />
                <div className="grid grid-cols-2 gap-3">
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="rounded-2xl bg-white/5 border border-white/[0.06] px-3.5 py-3 flex flex-col gap-2">
                      <div className="h-2.5 w-16 bg-white/5 rounded animate-pulse" />
                      <div className="h-5 w-20 bg-white/5 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!launch) {
    return (
      <div className="min-h-screen">
        <div className="max-w-md mx-auto px-4 py-24">
          <div className="bg-[#121624] rounded-[28px] p-12 text-center border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col items-center gap-4">
            <p className="text-[18px] font-extrabold text-white">Token not found</p>
            <p className="text-white/50 text-[14px]">{error ?? 'This launch does not exist yet.'}</p>
            <Link to="/" className="btn btn-primary h-11 px-7 mt-1">
              Back to explore
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const links = launch.links ?? {};

  return (
    <div className="min-h-screen">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white/40 hover:text-[#5865F2] transition-colors mb-5"
        >
          <ArrowLeft size={14} />
          All launches
        </Link>

        {/* Token Header */}
        <div className="bg-[#121624] rounded-[28px] p-5 md:p-6 border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.3)] mb-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4 md:gap-5 min-w-0">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-[20px] overflow-hidden bg-white/5 shrink-0 border border-white/10 shadow-md flex items-center justify-center">
                {launch.imageUrl ? (
                  <img
                    src={launch.imageUrl}
                    alt={launch.symbol}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[28px] font-black text-white/25 uppercase">
                    {launch.symbol.slice(0, 2)}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5 mb-2">
                  <h1 className="text-[26px] md:text-[32px] font-extrabold tracking-tight text-white leading-none">
                    {launch.name}
                  </h1>
                  <span className="text-[15px] font-bold text-white/35">${launch.symbol}</span>
                  {launch.isScheduled ? (
                    <span className="chip text-amber-300 bg-amber-500/10 border-amber-500/20">
                      <Clock size={11} className="text-amber-400" />
                      Starts in {countdown(Number(launch.fairLaunchStartsAt))}
                    </span>
                  ) : launch.isLive ? (
                    <span className="chip chip-live">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5865F2] animate-blink" />
                      {countdown(Number(launch.fairLaunchEndsAt))}
                    </span>
                  ) : launch.isGraduated ? (
                    <span className="chip chip-ink">Graduated to DEX</span>
                  ) : (
                    <span className="chip text-white/50 bg-white/5 border-white/10">Ended (Awaiting pool init)</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={copyAddress}
                    className="chip hover:border-[#5865F2]/40 transition-colors cursor-pointer text-white/70"
                  >
                    {copied ? (
                      <Check size={11} className="text-[#5865F2]" />
                    ) : (
                      <Copy size={11} />
                    )}
                    {shortAddress(launch.memecoin, 6)}
                  </button>
                  <span className="chip text-white/50">
                    by {shortAddress(String((launch as any).creator ?? ''), 4)}
                  </span>
                  <span className="chip text-white/50">{timeAgo(Number(launch.createdAtTimestamp))}</span>
                </div>
              </div>
            </div>

            {/* Token Price Header Badge Only */}
            <div className="bg-white/[0.03] px-5 py-3 rounded-2xl border border-white/[0.08] shrink-0 text-right md:text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/40">Token Price</p>
              <p className="text-xl md:text-2xl font-black text-white tabular-nums min-h-[32px] flex items-center justify-end">
                {displayPrice !== null ? (
                  formatPrice(displayPrice)
                ) : (
                  <span className="inline-block w-20 h-6 bg-white/10 rounded-md animate-pulse" />
                )}
              </p>
            </div>
          </div>
        </div>

        {/* DUAL MODE VIEW: DEX Analytics when graduated vs Fair Launch Bonding Curve */}
        {launch.isGraduated && launch.poolId ? (
          <DexPoolAnalytics
            poolId={launch.poolId}
            launch={launch}
            tokenAddress={tokenAddress || ''}
            refetchLaunch={refetch}
            targetCapUSD={targetCapUSD}
            onPriceUpdate={setDexPrice}
          />
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 mb-5">
              <StatPill label="Volume · 24h" value={`$${fmtNative(volume.day.toString())}`} hint={CONTRACTS.nativeTokenSymbol} />
              <StatPill label="Volume · all time" value={`$${fmtNative(volume.all.toString())}`} hint={CONTRACTS.nativeTokenSymbol} />
              <StatPill label="Raised" value={`$${fmtNative(launch.revenue)}`} hint={CONTRACTS.nativeTokenSymbol} />
              <StatPill label="Target MC" value={`$${fmtNative(launch.targetMarketCap)}`} hint={CONTRACTS.nativeTokenSymbol} />
              <StatPill label="Expected Raise" value={`$${calcExpectedRaise(launch.targetMarketCap, launch.multiple)}`} hint={CONTRACTS.nativeTokenSymbol} />
              <StatPill label="Remaining" value={fmtToken(launch.remainingSupply)} hint={launch.symbol} />
              <StatPill label="Buys" value={String(launch.buyCount)} hint="Fair launch trades" />
            </div>

            {/* Main Layout: Left Price Chart vs Right Side Tabs (Trade, Info, Transactions) */}
            <div className="grid lg:grid-cols-2 gap-5 items-stretch">
              {/* LEFT SIDE: Price Chart & Bonding Curve Card */}
              <FairLaunchPriceChart
                launch={launch}
                currentPrice={fairLaunchPrice}
                pct={pct}
              />

              {/* RIGHT SIDE: Tabbed Panel (Trade [default], Info, Transactions) */}
              <RightTabbedWidget
                launch={launch}
                tokenAddress={tokenAddress || ''}
                refetch={refetch}
                fairLaunchMarketCap={fairLaunchMarketCap}
                targetCapUSD={targetCapUSD}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
