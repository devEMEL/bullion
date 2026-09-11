import { useCallback, useEffect, useState } from 'react';
import { bulionQuery, GET_VOLUME } from '@/lib/bulionQueries';

interface BuyRow {
  id: string;
  nativeIn: string;
  timestamp: string;
}

export interface VolumeStats {
  /** USDC (native token) traded in the trailing 24 hours, raw bigint string */
  volume24h: string;
  /** USDC traded since genesis, raw bigint string */
  volumeAllTime: string;
  /** number of trades in the trailing 24 hours */
  trades24h: number;
}

const EMPTY: VolumeStats = { volume24h: '0', volumeAllTime: '0', trades24h: 0 };

const sum = (rows: BuyRow[] = []) =>
  rows.reduce((acc, r) => acc + BigInt(r.nativeIn || '0'), 0n).toString();

/**
 * Aggregates protocol volume from fair-launch buys + DEX pool aggregates.
 */
export function useVolume(pollMs = 30_000) {
  const [stats, setStats] = useState<VolumeStats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [dexVolumeAllTime, setDexVolumeAllTime] = useState('0');
  const [dex24hVolume, setDex24hVolume] = useState('0');
  const [feesAllTime, setFeesAllTime] = useState('0');

  const load = useCallback(async () => {
    try {
      const since = Math.floor(Date.now() / 1000) - 86_400;
      const data = await bulionQuery<{ allTime: BuyRow[]; recent: BuyRow[] }>(GET_VOLUME, {
        since: String(since),
      });

      setStats({
        volumeAllTime: sum(data.allTime),
        volume24h: sum(data.recent),
        trades24h: data.recent?.length ?? 0,
      });
    } catch {
      /* keep last known values */
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDex = useCallback(async () => {
    try {
      const { GET_GLOBAL_STATS } = await import('@/lib/bulionQueries');
      const data = await bulionQuery<{
        poolManagers: { totalVolumeUSD: string; totalFeesUSD: string }[];
        uniswapDayDatas: { date: number; volumeUSD: string; feesUSD: string }[];
      }>(GET_GLOBAL_STATS);

      const pm = data.poolManagers?.[0];
      if (pm) {
        setDexVolumeAllTime(pm.totalVolumeUSD ?? '0');
        setFeesAllTime(pm.totalFeesUSD ?? '0');
      }

      // Use the most recent day bucket as 24h DEX volume.
      // Only count it if the day bucket is from today or yesterday.
      const day = data.uniswapDayDatas?.[0];
      if (day) {
        const todayStart = Math.floor(Date.now() / 1000 / 86400) * 86400;
        const isRecent = Number(day.date) >= todayStart - 86400;
        setDex24hVolume(isRecent ? (day.volumeUSD ?? '0') : '0');
      }
    } catch {
      /* keep last known values */
    }
  }, []);

  useEffect(() => {
    load();
    loadDex();
    if (!pollMs) return;
    const id = setInterval(() => { load(); loadDex(); }, pollMs);
    return () => clearInterval(id);
  }, [load, loadDex, pollMs]);

  return { ...stats, dexVolumeAllTime, dex24hVolume, feesAllTime, loading, refetch: load };
}
