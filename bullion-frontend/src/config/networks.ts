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
      nativeToken: '0x11Dcf8343f868d8b88eFb3e45da4a5fcD43C3Fc0',
      nativeTokenSymbol: 'bUSDC',
      nativeTokenDecimals: 18,

      poolManager: '0xc7F528A2E6040fAb641ea2DeCCba9fb270f76Bb5',
      positionManager: '0x3A882b511D705FeE471B1276f106adB7f3680915',
      stateView: '0x0cb11B2b45087ED222f608E97a9Cd466C06534c3',
      permit2: '0x795ff63d8Df87520d2430E26Ba858dc6c4385737',

      gemfotManager: '0x9fd953946FD2f6DDD32C3a44c73373EaBfD36fDC',
      launch: '0x10a2A353598E85Ea959B9176a6432a63C086A1Be',
      fairLaunch: '0xE65220a143ae351B2fDDBE72739891AD7Db2cb59',
      bidWall: '0x8F59a23C864bd8235252cC89ed13B0c3eBcB481F',
      initialPrice: '0xd1677Ce9ae9f1417F9ED610139126C6A4cdA3989',
      feeEscrow: '0x441171b80129045F885a5f0080f2329619BD7fBA',
      feeExemptions: '0x1321e798fCc0FF0c831441f28589BB06c9C13da6',
      actionManager: '0x8A05e95be232Fc6e6EdE196Bd7007c12bab31b6f',
      notifier: '0x8251fc7720699c3cB3676a907f20b29B05C49b32',
      indexer: '0x94eEF2472E403B70DdEBDe853aB9dBc972F55691',
      protocolFeeRecipient: '0xEB6D604A3ad8A85b812C50C74d26366a7412829E',
      memecoinImplementation: '0x400Bd64eb76604FD45a6cE9c47ED9E65529df08B',
      memecoinTreasuryImplementation: '0x1a76f8eC9851ae2985078d4671E7a837E2c6c23e',
      poolSwap: '0x3be547CdB18E5015AE0ad1e93E5374F6EEA48Db4',
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
