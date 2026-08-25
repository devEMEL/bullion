import { defineChain } from '@reown/appkit/networks';
import { arcTestnet } from '@/lib/chains';

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
    startBlock: 44028100,
    contracts: {
      nativeToken: '0x11Dcf8343f868d8b88eFb3e45da4a5fcD43C3Fc0',
      nativeTokenSymbol: 'bUSDC',
      nativeTokenDecimals: 18,

      poolManager: '0xDF6166bEf93B3aE8BFCe73225Dc5348c5A0Ad96A',
      positionManager: '0xF611321abdeb9fbcb36C8238a694712f8B196392',
      stateView: '0x2D21B11f49065C6220db8316C9c151f2f5C2b1A7',
      permit2: '0x496C2CF27577473a4e44b3E995dDf46D643482bF',

      gemfotManager: '0x3B4D3ec4508e79115b7D9c94E72e970dCf5d2FDC',
      launch: '0xDcbb86a7d05360Dc454203ec1D1A7741669311D8',
      fairLaunch: '0x5Bd9a64a124a7ec0b64b3E19Bc1F70b894B1Fb12',
      bidWall: '0x5624D42dFd4ad454E88278991D67601Ba16E6fa6',
      initialPrice: '0x99d55FF1D08C106eC1EaB7eb128D2046C7332A2A',
      feeEscrow: '0xDdb5059a8AFE4bf6b5D9d27e50a447E0B8025455',
      feeExemptions: '0x13697C2c2329bf895Be1bED0e0A03647B206d15B',
      actionManager: '0x5Efe7FC45FC1b141699cFAE498De916A2772085E',
      notifier: '0x24DFF2AB05fcb2803DfF0F26F28B39380906ffd2',
      indexer: '0x678614D446e3A957d480Da2Ae621aC977de2E492',
      protocolFeeRecipient: '0x726ce52136f9f3A544F3273611a9d5669aD01137',
      memecoinImplementation: '0xCF6f06f47b81a81eB2dE531bBE117E020dAc7Ae9',
      memecoinTreasuryImplementation: '0x4da37519446AF21F5CBf465d4cdF3182C0b1A2f8',
      poolSwap: '0xA35125717a9B3589752695F12a5927E751E8fCa1',
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
