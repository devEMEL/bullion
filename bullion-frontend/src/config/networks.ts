import { defineChain } from '@reown/appkit/networks';

/**
 * GemFot network registry.
 *
 * Only `arc_testnet` is supported for now. To add another chain later, append a
 * new entry to `NETWORKS` with the same shape and (optionally) flip
 * `DEFAULT_NETWORK_KEY`.
 */

export interface GemFotContracts {
  /** The native/quote token of every launch pool (USDC on Arc). */
  nativeToken: `0x${string}`;
  nativeTokenSymbol: string;
  nativeTokenDecimals: number;

  /** Uniswap v4 core */
  poolManager: `0x${string}`;
  positionManager: `0x${string}`;
  stateView: `0x${string}`;
  permit2: `0x${string}`;

  /** GemFot protocol */
  gemfotManager: `0x${string}`;
  launch: `0x${string}`;
  fairLaunch: `0x${string}`;
  bidWall: `0x${string}`;
  initialPrice: `0x${string}`;
  feeEscrow: `0x${string}`;
  feeExemptions: `0x${string}`;
  actionManager: `0x${string}`;
  notifier: `0x${string}`;
  indexer: `0x${string}`;
  protocolFeeRecipient: `0x${string}`;
  memecoinImplementation: `0x${string}`;
  memecoinTreasuryImplementation: `0x${string}`;
  poolSwap: `0x${string}`;
}

export interface GemFotNetwork {
  key: string;
  /** Human label shown in the UI */
  label: string;
  chainId: number;
  /** The graph-node network name used by the subgraph */
  subgraphNetwork: string;
  subgraphUrl: string;
  explorerUrl: string;
  rpcUrls: string[];
  /** Block the GemFotManager hook was deployed at (subgraph startBlock) */
  startBlock: number;
  contracts: GemFotContracts;
}

export const liteforgeTestnet = defineChain({
  id: 4441,
  caipNetworkId: 'eip155:4441',
  chainNamespace: 'eip155',
  name: 'Liteforge Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Liteforge ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [
        'https://liteforge.rpc.caldera.xyz/http',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'Liteforge Explorer',
      url: 'https://liteforge.explorer.caldera.xyz',
    },
  },
});

export const arcTestnet = liteforgeTestnet;

export const NETWORKS = {
  arc_testnet: {
    key: 'arc_testnet',
    label: 'Liteforge Testnet',
    chainId: 4441,
    subgraphNetwork: 'liteforge-testnet',
    subgraphUrl:
      import.meta.env.VITE_GEMFOT_SUBGRAPH_URL ||
      'https://api.goldsky.com/api/public/project_cmsysqw4m0s6q01tf52of958s/subgraphs/bullion-subgraph/1.0.0/gn',
    explorerUrl: 'https://liteforge.explorer.caldera.xyz',
    rpcUrls: [
      'https://liteforge.rpc.caldera.xyz/http',
    ],
    startBlock: 0,
    contracts: {
      nativeToken: '0xd03307a0d5092B17C12cA9380f707f7d7FCD8f09',
      nativeTokenSymbol: 'bUSDC',
      nativeTokenDecimals: 18,

      poolManager: '0xF351A424955ba04e3d49dDa6E549a5983dB264B9',
      positionManager: '0xf08E1E3EFF9d79F545E14179396004Ba92dA25B5',
      stateView: '0x2527Bf2E647a992e2359571DBeD8cfe346E2af9F',
      permit2: '0x988A89F9469D3B2D7BDbd4Af2b4B39D61701F3eC',

      gemfotManager: '0xB88770C9FE4C733EFb9dd259fc32F00979706fdC',
      launch: '0x007A690BBaD0eA1a33981b588e18b6f03B89F6be',
      fairLaunch: '0xC73c72Bff8135C01611473F8aC0318CD1cEd0266',
      bidWall: '0xEC3C61f62127FD8eF312b10E32B5848D7b2F06F9',
      initialPrice: '0x920219Df2957082a71BFbDD32C2B4C65bBD07d32',
      feeEscrow: '0x2DDe02847B6AC8E1C3A73138516Dc3e09f6796Ce',
      feeExemptions: '0x2C5B3eB6bEa6d2A911F19fdBA93E80c449419ec7',
      actionManager: '0x3E9EC6bBc8aae110339E369f9cDc5bC229970a1d',
      notifier: '0x1B85FCAa8C857376682846B0b1df72109bdcdF71',
      indexer: '0x4109012F218ABD74CEb47500d266F823B1e7ee12',
      protocolFeeRecipient: '0xd9A1f9a65070f75958934E6C1071CFC290484c65',
      memecoinImplementation: '0x4fCF84ac4E43A497cd8d756beaD902CdAeF548C7',
      memecoinTreasuryImplementation: '0xE3D01A9dB269b4Cd834F606a0069DC5D74EE4934',
      poolSwap: '0xf5992688c73b399EceC4Eec7b15265727C718BBa',
    },
  },
} satisfies Record<string, GemFotNetwork>;

export type NetworkKey = keyof typeof NETWORKS;

export const DEFAULT_NETWORK_KEY: NetworkKey = 'arc_testnet';

export const activeNetwork: GemFotNetwork = NETWORKS[DEFAULT_NETWORK_KEY];

export const CONTRACTS = activeNetwork.contracts;

/** Every chain the app is wired for (AppKit / wagmi) */
export const SUPPORTED_CHAINS = [arcTestnet];

export function explorerTx(hash: string): string {
  return `${activeNetwork.explorerUrl}/tx/${hash}`;
}

export function explorerAddress(address: string): string {
  return `${activeNetwork.explorerUrl}/address/${address}`;
}

export function explorerToken(address: string): string {
  return `${activeNetwork.explorerUrl}/token/${address}`;
}
