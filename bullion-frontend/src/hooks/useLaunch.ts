import { useCallback, useEffect, useState } from 'react';
import { gemfotQuery, type SubgraphLaunch } from '@/lib/gemfotQueries';
import { ipfsToHttp } from '@/lib/pinata';

export interface LaunchBuy {
  id: string;
  buyer: string;
  nativeIn: string;
  tokensOut: string;
  totalSold: string;
  timestamp: string;
  transactionHash: string;
}

export interface LaunchDetail extends SubgraphLaunch {
  imageUrl: string;
  description: string;
  links: Record<string, string | undefined>;
  isLive: boolean;
  poolInitialized?: boolean;
  isGraduated: boolean;
  buys: LaunchBuy[];
  swaps?: any[];
}

const GET_LAUNCH_BY_TOKEN = /* GraphQL */ `
  query GetLaunchByToken($memecoin: Bytes!) {
    launches(where: { memecoin: $memecoin }, first: 1) {
      id
      poolId
      memecoin
      name
      symbol
      tokenUri
      creator {
        id
      }
      tokenId
      currencyFlipped
      totalSupply
      initialTokenFairLaunch
      fairLaunchDuration
      fairLaunchStartsAt
      fairLaunchEndsAt
      fairLaunchClosed
      poolInitialized
      targetMarketCap
      multiple
      creatorFeeAllocation
      premineAmount
      revenue
      remainingSupply
      buyCount
      createdAtTimestamp
      transactionHash
      buys(first: 40, orderBy: timestamp, orderDirection: desc) {
        id
        buyer
        nativeIn
        tokensOut
        totalSold
        timestamp
        transactionHash
      }
      swaps(first: 100, orderBy: timestamp, orderDirection: desc) {
        id
        timestamp
        amount0
        amount1
        fee0
        fee1
        sqrtPriceX96
        transaction {
          id
        }
      }
    }
  }
`;

export function useLaunch(memecoin?: string, pollMs = 12_000) {
  const [launch, setLaunch] = useState<LaunchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!memecoin) return;
      if (!silent) setLoading(true);
      try {
        const data = await gemfotQuery<{ launches: any[] }>(GET_LAUNCH_BY_TOKEN, {
          memecoin: memecoin.toLowerCase(),
        });
        const raw = data.launches?.[0];
        if (!raw) {
          setLaunch(null);
          setError('Launch not found');
          return;
        }

        let meta: any = {};
        try {
          const res = await fetch(ipfsToHttp(raw.tokenUri));
          if (res.ok) meta = await res.json();
        } catch {
          /* metadata is best-effort */
        }

        const now = Math.floor(Date.now() / 1000);
        const poolInitialized = Boolean(raw.poolInitialized);
        setLaunch({
          ...raw,
          creator: typeof raw.creator === 'string' ? raw.creator : raw.creator?.id ?? '',
          imageUrl: ipfsToHttp(meta.image),
          description: meta.description ?? '',
          links: meta.links ?? {},
          isLive: !raw.fairLaunchClosed && now < Number(raw.fairLaunchEndsAt),
          poolInitialized,
          isGraduated: poolInitialized,
          buys: raw.buys ?? [],
          swaps: raw.swaps ?? [],
        });
        setError(null);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load launch');
      } finally {
        setLoading(false);
      }
    },
    [memecoin]
  );

  useEffect(() => {
    load();
    if (!pollMs) return;
    const id = setInterval(() => load(true), pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);

  return { launch, loading, error, refetch: () => load(true) };
}
