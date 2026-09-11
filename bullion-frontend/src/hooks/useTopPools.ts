import { useCallback, useEffect, useState } from 'react';
import { formatUnits } from 'viem';
import {
  bulionQuery,
  GET_TOP_VOLUME_POOLS,
  GET_TOP_FEES_POOLS,
  GET_LAUNCHES_BY_MEMECOINS,
} from '@/lib/bulionQueries';
import { CONTRACTS } from '@/config/networks';

// ── Types ────────────────────────────────────────────────────────────────────

interface PoolToken {
  id: string;
  symbol: string;
  name: string;
  decimals: string;
}

interface RawPool {
  id: string;
  volumeUSD?: string;
  feesUSD?: string;
  sqrtPrice: string;
  token0: PoolToken;
  token1: PoolToken;
  poolDayData?: { volumeUSD: string; date: number }[];
}

export interface TopVolumeToken {
  /** Memecoin token address */
  id: string;
  symbol: string;
  name: string;
  /** All-time volume USD — read directly from pool.volumeUSD (same as TokenDetail) */
  volumeUSD: string;
  /** 24h volume from the latest poolDayData bucket (null if stale) */
  vol24h: string | null;
  /** Market cap = getPriceFromSqrt(sqrtPrice) × totalSupply */
  marketCapUSD: number;
}

export interface TopEarningToken {
  /** Memecoin token address */
  id: string;
  symbol: string;
  name: string;
  /** All-time fees USD — read directly from pool.feesUSD (same as TokenDetail) */
  feesUSD: string;
}

// ── Helpers (mirrors TokenDetail's getPriceFromSqrt) ─────────────────────────

const NATIVE_ADDR = CONTRACTS.nativeToken.toLowerCase();
const NATIVE_SYM = CONTRACTS.nativeTokenSymbol.toUpperCase();

function getPriority(symbol: string): number {
  const s = (symbol || '').toUpperCase();
  if (s === 'USDC' || s === 'BUSDC' || s === NATIVE_SYM) return 100;
  if (s === 'ETH' || s === 'WETH') return 50;
  return 0;
}

function getPriceFromSqrt(
  sqrtPriceStr: string,
  token0: PoolToken,
  token1: PoolToken
): number {
  if (!sqrtPriceStr || !token0 || !token1) return 0;
  const sqrtPrice = Number(sqrtPriceStr);
  const dec0 = Number(token0.decimals || 18);
  const dec1 = Number(token1.decimals || 18);
  const t0Price = Math.pow(sqrtPrice / Math.pow(2, 96), 2) * Math.pow(10, dec0 - dec1);
  const p0 = getPriority(token0.symbol);
  const p1 = getPriority(token1.symbol);
  if (p0 > p1) return t0Price > 0 ? 1 / t0Price : 0;
  return t0Price;
}

/** Returns true if this token is the native (bUSDC) token we want to exclude. */
function isNative(token: PoolToken): boolean {
  return token.id.toLowerCase() === NATIVE_ADDR;
}

/**
 * From a pool, pick the non-native token as the "memecoin".
 * Returns null if both or neither token is native (shouldn't happen, but safe).
 */
function memeTokenFromPool(pool: RawPool): PoolToken | null {
  if (isNative(pool.token0) && !isNative(pool.token1)) return pool.token1;
  if (isNative(pool.token1) && !isNative(pool.token0)) return pool.token0;
  // If neither is the native token, pick token0 (non-native/non-native pool)
  if (!isNative(pool.token0) && !isNative(pool.token1)) return pool.token0;
  return null; // both native — skip
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useTopTokens(pollMs = 30_000) {
  const [volumeTokens, setVolumeTokens] = useState<TopVolumeToken[]>([]);
  const [earningTokens, setEarningTokens] = useState<TopEarningToken[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [volData, feeData] = await Promise.all([
        bulionQuery<{ pools: RawPool[] }>(GET_TOP_VOLUME_POOLS),
        bulionQuery<{ pools: RawPool[] }>(GET_TOP_FEES_POOLS),
      ]);

      // ── Volume tokens ──────────────────────────────────────────────────────

      const currentDayStart = Math.floor(Date.now() / 1000 / 86400) * 86400;

      const volPools = (volData.pools ?? []);
      const seenVolIds = new Set<string>();
      const volTokenIds: string[] = [];
      const volRows: Omit<TopVolumeToken, 'marketCapUSD'>[] = [];

      for (const pool of volPools) {
        if (volRows.length >= 5) break;
        const tok = memeTokenFromPool(pool);
        if (!tok) continue;
        // Deduplicate — same token may appear in multiple pools
        if (seenVolIds.has(tok.id.toLowerCase())) continue;
        seenVolIds.add(tok.id.toLowerCase());

        const latestDay = pool.poolDayData?.[0];
        const isRecent = latestDay && Number(latestDay.date) >= currentDayStart - 86400;

        volTokenIds.push(tok.id);
        volRows.push({
          id: tok.id,
          symbol: tok.symbol,
          name: tok.name,
          volumeUSD: pool.volumeUSD ?? '0',
          vol24h: isRecent ? latestDay!.volumeUSD : null,
        });
      }

      // Batch fetch launches for market cap
      let launchMap = new Map<string, {
        totalSupply?: string;
        initialTokenFairLaunch?: string;
        pool?: {
          sqrtPrice: string;
          token0: PoolToken;
          token1: PoolToken;
        } | null;
      }>();

      if (volTokenIds.length > 0) {
        try {
          const launchData = await bulionQuery<{
            launches: {
              memecoin: string;
              totalSupply?: string;
              initialTokenFairLaunch?: string;
              pool?: { id: string; sqrtPrice: string; token0: PoolToken; token1: PoolToken } | null;
            }[];
          }>(GET_LAUNCHES_BY_MEMECOINS, { addrs: volTokenIds });

          for (const l of launchData.launches ?? []) {
            launchMap.set(l.memecoin.toLowerCase(), l);
          }
        } catch { /* market cap will be 0 */ }
      }

      const enrichedVol: TopVolumeToken[] = volRows.map((row) => {
        const launch = launchMap.get(row.id.toLowerCase());
        let marketCapUSD = 0;
        if (launch?.pool?.sqrtPrice) {
          const rawSupply = launch.totalSupply || launch.initialTokenFairLaunch;
          if (rawSupply) {
            try {
              const supply = Number(formatUnits(BigInt(rawSupply), 18));
              const price = getPriceFromSqrt(
                launch.pool.sqrtPrice,
                launch.pool.token0,
                launch.pool.token1
              );
              marketCapUSD = price * supply;
            } catch { /* ignore */ }
          }
        }
        return { ...row, marketCapUSD };
      });

      // ── Earning tokens ─────────────────────────────────────────────────────

      const seenFeeIds = new Set<string>();
      const feeRows: TopEarningToken[] = [];
      for (const pool of feeData.pools ?? []) {
        if (feeRows.length >= 5) break;
        const tok = memeTokenFromPool(pool);
        if (!tok) continue;
        if (seenFeeIds.has(tok.id.toLowerCase())) continue;
        seenFeeIds.add(tok.id.toLowerCase());
        feeRows.push({
          id: tok.id,
          symbol: tok.symbol,
          name: tok.name,
          feesUSD: pool.feesUSD ?? '0',
        });
      }

      setVolumeTokens(enrichedVol);
      setEarningTokens(feeRows);
    } catch {
      /* keep last known values */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (!pollMs) return;
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);

  return { volumeTokens, earningTokens, loading, refetch: load };
}
