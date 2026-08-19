import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import {
  ArrowLeft,
  Check,
  ChevronDown,
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
import { CONTRACTS, explorerTx } from '@/config/networks';
import { calcExpectedRaise, countdown, fmtNative, fmtToken, progressPct, shortAddress, timeAgo } from '@/lib/format';
import { quoteFairLaunchBuy } from '@/lib/fairLaunchQuote';
import { gemfotQuery, GET_POOL_DETAIL } from '@/lib/gemfotQueries';
import Erc20Abi from '@/abi/ERC20.json';

function StatPill({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-[#121624] rounded-2xl px-4 py-3.5 border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.3)] min-w-0">
      <p className="text-[11px] font-semibold text-white/40 truncate">{label}</p>
      <p className="text-[18px] font-extrabold text-white tabular-nums leading-tight mt-1 truncate">
        {value}
      </p>
      {hint && <p className="text-[10px] font-medium text-white/30 mt-0.5 truncate">{hint}</p>}
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
    if (sym === 'USDC' || sym === 'BZKLTC' || sym === CONTRACTS.nativeTokenSymbol.toUpperCase()) return 100;
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

const formatSmallCurrency = (val: string | number | undefined) => {
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

  // Only use compact zero notation when there are 5 or more leading zeros
  if (zeroCount >= 5) {
    return `${sign}$0.0{${zeroCount}}${significantDigits}`;
  }

  // For 1-4 leading zeros, show standard decimal representation
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
                ? new Date(Number(launch.fairLaunchStartsAt) * 1000).toLocaleDateString(undefined, {
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
    <div className="bg-[#121624] rounded-[28px] p-5 md:p-6 border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      <h3 className="text-[15px] font-extrabold text-white mb-4">Info</h3>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl bg-white/5 border border-white/[0.06] px-3.5 py-3 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/35 truncate">{item.label}</p>
            <p className="text-[14px] font-extrabold text-white mt-1 truncate tabular-nums">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        <span className="text-[12px] font-medium text-white/40">Status</span>
        <span className={`chip ${launch.isLive ? 'chip-live' : launch.fairLaunchClosed ? '' : 'chip-ink'}`}>
          {launch.fairLaunchClosed ? 'Closed' : launch.isLive ? 'Live' : isGraduated ? 'Graduated' : 'Ended'}
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

  const { swap, step, error: swapError, txHash, isBusy } = useSwap(tokenAddress);

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
    <div className="bg-[#121624] text-white rounded-[28px] p-6 border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      <h3 className="text-[18px] font-extrabold text-white text-center mb-5">
        Trade {launch.symbol}
      </h3>

      {/* Buy / Sell Pill Switcher */}
      <div className="bg-white/5 p-1 rounded-2xl flex items-center mb-5 border border-white/[0.06]">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-2.5 rounded-xl text-[14px] font-extrabold transition-all cursor-pointer ${
            side === 'buy'
              ? 'bg-white text-black shadow-md'
              : 'text-white/50 hover:text-white'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-2.5 rounded-xl text-[14px] font-extrabold transition-all cursor-pointer ${
            side === 'sell'
              ? 'bg-white text-black shadow-md'
              : 'text-white/50 hover:text-white'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Currency indicator (Buying with BZKLTC) */}
      {side === 'buy' && (
        <div className="flex items-center justify-center mb-5">
          <span className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-[13px] font-extrabold flex items-center gap-1.5">
            Pay with {CONTRACTS.nativeTokenSymbol}
          </span>
        </div>
      )}

      {/* Main Input Display */}
      <div className="text-center mb-5">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/40 mb-2">
          {currentTokenSymbol} AMOUNT
        </p>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
          placeholder="0"
          inputMode="decimal"
          className="w-full text-center text-[38px] font-black text-white bg-transparent border-none outline-none placeholder:text-white/20 tabular-nums"
        />
      </div>

      {/* Preset Amount Pills */}
      {side === 'buy' ? (
        <div className="flex items-center justify-center gap-2 mb-5">
          {['0.001', '0.01', '0.1', '1'].map((val) => (
            <button
              key={val}
              onClick={() => setAmount(val)}
              className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 text-[13px] font-bold transition-all cursor-pointer"
            >
              {val}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 mb-5">
          {['10%', '25%', '50%', '100%'].map((pctStr) => (
            <button
              key={pctStr}
              onClick={() => {
                const pctVal = Number(pctStr.replace('%', ''));
                const calcAmt = (tokenBalNum * pctVal) / 100;
                setAmount(calcAmt ? String(calcAmt) : '');
              }}
              className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 text-[13px] font-bold transition-all cursor-pointer"
            >
              {pctStr}
            </button>
          ))}
        </div>
      )}

      {/* Estimated Receive output during Fair Launch buy */}
      {side === 'buy' && amount && Number(amount) > 0 && !launch.isGraduated && (
        <div className="mb-4 px-4 py-2.5 bg-[rgba(88,101,242,0.12)] border border-[rgba(88,101,242,0.25)] rounded-2xl flex items-center justify-between">
          <span className="text-[11px] font-semibold text-white/50">Estimated receive</span>
          <span className="text-[13px] font-extrabold text-[#5865F2] tabular-nums">
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

      {/* Balance Row */}
      <div className="flex items-center justify-center gap-2 text-[13px] font-semibold text-white/50 mb-3">
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

      {/* Slippage Dropdown Selector */}
      <div className="flex items-center justify-center gap-1 text-[12px] font-semibold text-white/40 mb-6">
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

      {/* Action Button */}
      {isSellDisabledInFairLaunch ? (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center text-white/50 text-[13px] font-semibold">
          Selling opens once token graduates to DEX
        </div>
      ) : (
        <button
          onClick={onSwap}
          disabled={!isConnected || isBusy || !amount || Number(amount) <= 0}
          className="btn btn-primary w-full h-14 py-3.5 text-[16px] font-extrabold rounded-2xl shadow-lg cursor-pointer"
        >
          {isBusy ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
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
        <p className="mt-3 text-[12px] text-red-400 text-center break-words leading-relaxed">
          {swapError}
        </p>
      )}

      {step === 'done' && txHash && (
        <a
          href={explorerTx(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-2 text-[12px] font-bold text-[#5865F2] hover:text-[#7983F5]"
        >
          <Check size={12} />
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
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!poolId) return;
    const fetchPoolDetail = async () => {
      try {
        setLoading(true);
        const data = await gemfotQuery<{ pool: any; swaps: any[] }>(GET_POOL_DETAIL, {
          id: poolId.toLowerCase(),
        });
        setPool(data.pool);
        setSwaps(data.swaps || []);
      } catch (err) {
        console.error('Error fetching pool details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPoolDetail();
  }, [poolId]);

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
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
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
          color: 'rgba(88,101,242,0.4)',
          width: 1,
          style: 3,
          labelVisible: false,
        },
        horzLine: {
          color: 'rgba(88,101,242,0.4)',
          width: 1,
          style: 3,
          labelVisible: false,
        },
      },
      handleScale: false,
      handleScroll: false,
      width: container.clientWidth || 500,
      height: container.clientHeight || 280,
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
      <div className="bg-[#121624] rounded-[28px] p-8 border border-white/[0.08] flex items-center justify-center gap-3">
        <Loader2 size={18} className="animate-spin text-[#5865F2]" />
        <span className="text-white/40 text-sm font-semibold">Loading DEX Analytics...</span>
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

      {/* Main Grid: Chart + Trade Widget, TVL & Info Card */}
      <div className="grid lg:grid-cols-[1.55fr_1fr] gap-5 items-start">
        {/* Price Chart */}
        <div className="bg-[#121624] rounded-[28px] p-5 md:p-6 border border-white/[0.08] shadow-md flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-white/40 uppercase tracking-[0.08em]">Price History</span>
              </div>
              <span className="text-[11px] font-semibold text-[#5865F2] bg-[#5865F2]/10 px-2.5 py-1 rounded-full">
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

          <div className="relative flex-1 min-h-[260px] flex items-end mt-4">
            {swaps.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-white/30 text-[13px] font-semibold">
                No DEX swap history recorded yet
              </div>
            ) : (
              <div ref={chartContainerRef} className="w-full h-full" />
            )}
          </div>
        </div>

        {/* Inline Trade Widget + TVL & Info Card */}
        <div className="space-y-5">
          <TradeWidget launch={launch} tokenAddress={tokenAddress} refetchLaunch={refetchLaunch} />
          <TokenInfoCard launch={launch} marketCap={currentMarketCap} fdv={targetCapUSD} />

          <div className="bg-[#121624] rounded-[28px] p-6 border border-white/[0.08] shadow-md">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/35">Total Value Locked</p>
            <p className="text-3xl font-extrabold text-white tabular-nums tracking-tight mt-2">
              {formatCurrency(pool?.totalValueLockedUSD)}
            </p>
          </div>

          <div className="bg-[#121624] rounded-[28px] p-6 border border-white/[0.08] shadow-md border-l-4 border-l-[#5865F2]">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/35 mb-4">Pool Balances</p>
            <div className="space-y-3">
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
      </div>

      {/* Recent DEX Swaps Table */}
      <div className="bg-[#121624] rounded-[28px] overflow-hidden border border-white/[0.08] shadow-md">
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <h3 className="text-[16px] font-extrabold text-white">Recent Swaps</h3>
          <span className="text-[11px] font-bold text-white/30 uppercase tracking-[0.1em]">
            {swaps.length} swaps
          </span>
        </div>

        <div className="hidden md:grid grid-cols-[1fr_1.5fr_1fr_1.2fr_1.2fr_1fr] gap-4 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-white/30 border-b border-white/[0.06] bg-white/[0.02]">
          <div>Time</div>
          <div>Type</div>
          <div>USD</div>
          <div>{pool?.token0?.symbol || 'Token0'}</div>
          <div>{pool?.token1?.symbol || 'Token1'}</div>
          <div className="text-right">Txn Hash</div>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {pagedSwaps.length > 0 ? (
            pagedSwaps.map((row: any) => {
              const formattedTime = new Date(Number(row.timestamp) * 1000).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const isSellToken0 = Number(row.amount0) < 0;
              const typeText = `Swap ${isSellToken0 ? `${pool.token0.symbol} for ${pool.token1.symbol}` : `${pool.token1.symbol} for ${pool.token0.symbol}`}`;

              return (
                <div
                  key={row.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1fr_1.2fr_1.2fr_1fr] gap-2 md:gap-4 px-6 py-3.5 items-center hover:bg-white/[0.03] transition-colors"
                >
                  <div className="text-[12px] font-medium text-white/50">{formattedTime}</div>
                  <div className="text-[13px] font-bold text-white">{typeText}</div>
                  <div className="text-[13px] font-bold text-white tabular-nums">{formatCurrency(row.amountUSD)}</div>
                  <div className={`text-[13px] font-bold tabular-nums ${isSellToken0 ? 'text-white/60' : 'text-[#5865F2]'}`}>
                    {Number(row.amount0).toFixed(4)} {pool.token0.symbol}
                  </div>
                  <div className={`text-[13px] font-bold tabular-nums ${Number(row.amount1) < 0 ? 'text-white/60' : 'text-[#5865F2]'}`}>
                    {Number(row.amount1).toFixed(4)} {pool.token1.symbol}
                  </div>
                  <div className="md:text-right">
                    <a
                      href={explorerTx(row.transaction.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-mono text-[#5865F2] hover:text-[#7983F5] inline-flex items-center gap-1"
                    >
                      {row.transaction.id.slice(0, 6)}...{row.transaction.id.slice(-4)}
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-white/30 text-xs">No recent DEX swaps found</div>
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-white/[0.08] flex items-center justify-between px-6 bg-white/[0.01]">
          <span className="text-[12px] font-medium text-white/30">Page {swapsPage + 1}</span>
          <div className="flex gap-3">
            <button
              disabled={swapsPage === 0}
              onClick={() => setSwapsPage((prev) => Math.max(0, prev - 1))}
              className="btn btn-soft h-8 px-4 text-[11px] disabled:opacity-30 disabled:pointer-events-none"
            >
              Prev
            </button>
            <button
              disabled={(swapsPage + 1) * 10 >= swaps.length}
              onClick={() => setSwapsPage((prev) => prev + 1)}
              className="btn btn-soft h-8 px-4 text-[11px] disabled:opacity-30 disabled:pointer-events-none"
            >
              Next
            </button>
          </div>
        </div>
      </div>
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
      <div className="pt-[64px] min-h-screen flex flex-col items-center justify-center gap-3 py-40">
        <Loader2 size={22} className="animate-spin text-[#5865F2]" />
        <p className="text-[13px] font-semibold text-white/40">Loading token…</p>
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
                  {launch.isLive ? (
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

            <div className="grid lg:grid-cols-[1.55fr_1fr] gap-5 items-start">
              {/* Left column: Bonding curve & Trade tape */}
              <div className="space-y-5">
                <div className="bg-[#121624] rounded-[28px] p-5 md:p-6 border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-[13px] font-bold text-white/50">Curve filled</span>
                    <span className="text-[15px] font-extrabold text-[#5865F2] tabular-nums">
                      {pct.toFixed(2)}%
                    </span>
                  </div>
                  <div className={`meter ${launch.isLive ? 'meter-live' : ''}`}>
                    <span style={{ width: `${Math.min(Math.max(pct, 1), 100)}%` }} />
                  </div>

                  {launch.description && (
                    <p className="text-white/60 text-[14px] leading-relaxed mt-5 pt-5 border-t border-white/[0.08]">
                      {launch.description}
                    </p>
                  )}

                  {(links.website || links.twitter || links.telegram) && (
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      {links.website && (
                        <a
                          href={links.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-soft h-9 px-4 text-[12px]"
                        >
                          <Globe size={13} />
                          Website
                        </a>
                      )}
                      {links.twitter && (
                        <a
                          href={links.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-soft h-9 px-4 text-[12px]"
                        >
                          <Twitter size={13} />
                          Twitter
                        </a>
                      )}
                      {links.telegram && (
                        <a
                          href={links.telegram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-soft h-9 px-4 text-[12px]"
                        >
                          <MessageCircle size={13} />
                          Telegram
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Trade tape */}
                <div className="bg-[#121624] rounded-[28px] overflow-hidden border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                  <div className="px-5 md:px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
                    <h2 className="text-[15px] font-extrabold text-white">Trade tape</h2>
                    <span className="text-[11px] font-bold text-white/30 uppercase tracking-[0.1em]">
                      {launch.buys.length} trades
                    </span>
                  </div>

                  {launch.buys.length === 0 ? (
                    <p className="px-6 py-14 text-center text-white/40 text-[14px]">
                      No buys yet — be the first.
                    </p>
                  ) : (
                    <>
                      <div className="hidden sm:grid grid-cols-[1fr_1.2fr_1fr_auto] gap-4 px-5 md:px-6 py-2.5 bg-white/[0.02]">
                        {['Buyer', 'Received', 'Paid', 'Time'].map((h) => (
                          <span key={h} className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/30">
                            {h}
                          </span>
                        ))}
                      </div>
                      <div className="divide-y divide-white/[0.06]">
                        {launch.buys.map((b) => (
                          <a
                            key={b.id}
                            href={explorerTx(b.transactionHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="grid sm:grid-cols-[1fr_1.2fr_1fr_auto] gap-1 sm:gap-4 px-5 md:px-6 py-3 hover:bg-white/[0.03] transition-colors items-baseline"
                          >
                            <span className="text-[13px] font-medium text-white/50">
                              {shortAddress(b.buyer, 4)}
                            </span>
                            <span className="text-[13px] font-bold text-white tabular-nums">
                              {fmtToken(b.tokensOut)}{' '}
                              <span className="text-white/35 font-medium">{launch.symbol}</span>
                            </span>
                            <span className="text-[13px] font-bold text-[#5865F2] tabular-nums">
                              {fmtNative(b.nativeIn)}{' '}
                              <span className="text-white/35 font-medium">{CONTRACTS.nativeTokenSymbol}</span>
                            </span>
                            <span className="text-[11px] font-medium text-white/30 sm:text-right">
                              {timeAgo(Number(b.timestamp))}
                            </span>
                          </a>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right column: Inline Trade Widget + Info Card */}
              <div className="space-y-5">
                <TradeWidget launch={launch} tokenAddress={tokenAddress || ''} refetchLaunch={refetch} />
                <TokenInfoCard launch={launch} marketCap={fairLaunchMarketCap} fdv={targetCapUSD} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
