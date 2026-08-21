import { activeNetwork } from '@/config/networks';

export const GEMFOT_SUBGRAPH_URL = activeNetwork.subgraphUrl;

export async function gemfotQuery<T>(
  query: string,
  variables: Record<string, any> = {}
): Promise<T> {
  const res = await fetch(GEMFOT_SUBGRAPH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  const { data, errors } = await res.json();
  if (errors?.length) {
    console.error('GemFot subgraph errors:', errors);
    throw new Error(errors[0]?.message ?? 'Subgraph query failed');
  }
  return data as T;
}

export const GET_LAUNCHES = /* GraphQL */ `
  query GetLaunches($first: Int!, $skip: Int!, $orderBy: Launch_orderBy!, $orderDirection: OrderDirection!) {
    launches(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection) {
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
      targetMarketCap
      multiple
      creatorFeeAllocation
      premineAmount
      revenue
      remainingSupply
      buyCount
      poolInitialized
      createdAtTimestamp
      createdAtBlock
      transactionHash
    }
  }
`;

export const GET_LAUNCH = /* GraphQL */ `
  query GetLaunch($id: ID!) {
    launch(id: $id) {
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
      initialTokenFairLaunch
      fairLaunchDuration
      fairLaunchStartsAt
      fairLaunchEndsAt
      fairLaunchClosed
      targetMarketCap
      multiple
      creatorFeeAllocation
      premineAmount
      revenue
      remainingSupply
      buyCount
      poolInitialized
      createdAtTimestamp
      transactionHash
      buys(first: 50, orderBy: timestamp, orderDirection: desc) {
        id
        nativeIn
        tokensOut
        totalSold
        timestamp
        transactionHash
      }
    }
  }
`;

/**
 * Protocol-wide volume: every fair-launch buy is USDC in.
 * `since` lets us slice the trailing 24h window.
 */
export const GET_VOLUME = /* GraphQL */ `
  query GetVolume($since: BigInt!) {
    allTime: fairLaunchBuys(first: 1000, orderBy: timestamp, orderDirection: desc) {
      id
      nativeIn
      timestamp
    }
    recent: fairLaunchBuys(
      first: 1000
      where: { timestamp_gte: $since }
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      nativeIn
      timestamp
    }
  }
`;

/**
 * Top pools by all-time volume — same data source as TokenDetail's pool.volumeUSD.
 */
export const GET_TOP_VOLUME_POOLS = /* GraphQL */ `
  query GetTopVolumePools {
    pools(
      first: 20
      orderBy: volumeUSD
      orderDirection: desc
      where: { volumeUSD_gt: "0" }
    ) {
      id
      volumeUSD
      feesUSD
      sqrtPrice
      token0 { id symbol name decimals }
      token1 { id symbol name decimals }
      poolDayData(first: 1, orderBy: date, orderDirection: desc) {
        volumeUSD
        date
      }
    }
  }
`;

/**
 * Top pools by all-time fees — same data source as TokenDetail's pool.feesUSD.
 */
export const GET_TOP_FEES_POOLS = /* GraphQL */ `
  query GetTopFeesPools {
    pools(
      first: 20
      orderBy: feesUSD
      orderDirection: desc
      where: { feesUSD_gt: "0" }
    ) {
      id
      feesUSD
      sqrtPrice
      token0 { id symbol name decimals }
      token1 { id symbol name decimals }
    }
  }
`;

/** Batch-fetch launch + pool data for a list of memecoin addresses (for market cap calc). */
export const GET_LAUNCHES_BY_MEMECOINS = /* GraphQL */ `
  query GetLaunchesByMemecoins($addrs: [Bytes!]!) {
    launches(where: { memecoin_in: $addrs }, first: 50) {
      memecoin
      totalSupply
      initialTokenFairLaunch
      pool {
        id
        sqrtPrice
        token0 { id symbol decimals }
        token1 { id symbol decimals }
      }
    }
  }
`;

/** Aggregate DEX totals from the poolManager singleton. */
export const GET_GLOBAL_STATS = /* GraphQL */ `
  query GetGlobalStats {
    poolManagers(first: 1) {
      totalVolumeUSD
      totalFeesUSD
    }
    uniswapDayDatas(first: 1, orderBy: date, orderDirection: desc) {
      date
      volumeUSD
      feesUSD
    }
  }
`;

export const GET_LAUNCHES_BY_CREATOR = /* GraphQL */ `
  query GetLaunchesByCreator($creator: Bytes!, $first: Int!) {
    launches(
      where: { creator: $creator }
      first: $first
      orderBy: createdAtTimestamp
      orderDirection: desc
    ) {
      id
      memecoin
      name
      symbol
      tokenUri
      revenue
      fairLaunchEndsAt
      fairLaunchClosed
      createdAtTimestamp
    }
  }
`;

export const GET_POOL_DETAIL = /* GraphQL */ `
  query GetPoolDetail($id: ID!) {
    pool(id: $id) {
      id
      createdAtTimestamp
      createdAtBlockNumber
      feeTier
      liquidity
      sqrtPrice
      token0Price
      token1Price
      tick
      tickSpacing
      volumeToken0
      volumeToken1
      volumeUSD
      feesUSD
      txCount
      collectedFeesToken0
      collectedFeesToken1
      collectedFeesUSD
      totalValueLockedToken0
      totalValueLockedToken1
      totalValueLockedUSD
      hooks
      token0 {
        id
        symbol
        name
        decimals
      }
      token1 {
        id
        symbol
        name
        decimals
      }
      poolDayData(first: 30, orderBy: date, orderDirection: desc) {
        id
        date
        volumeUSD
        feesUSD
        open
        high
        low
        close
      }
      swaps(first: 100, orderBy: timestamp, orderDirection: desc) {
        id
        timestamp
        origin
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

export interface SubgraphLaunch {
  id: string;
  poolId: string;
  memecoin: string;
  name: string;
  symbol: string;
  tokenUri: string;
  /** Related entity id (also accepts the raw `{ id }` shape before normalization) */
  creator: string | { id: string };
  tokenId: string;
  currencyFlipped: boolean;
  totalSupply?: string;
  initialTokenFairLaunch: string;
  fairLaunchDuration: string;
  fairLaunchStartsAt: string;
  fairLaunchEndsAt: string;
  fairLaunchClosed: boolean;
  targetMarketCap: string;
  multiple: string;
  creatorFeeAllocation: string;
  premineAmount: string;
  revenue: string;
  remainingSupply: string;
  buyCount: string;
  /** True once the Uniswap V4 pool has been initialized via handleInitialize */
  poolInitialized: boolean;
  createdAtTimestamp: string;
  createdAtBlock?: string;
  transactionHash: string;
}
