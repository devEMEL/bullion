import { defineChain } from '@reown/appkit/networks';

export const arcTestnet = defineChain({
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
        'https://rpc.testnet.liteforge.zeeve.net/',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'Liteforge Explorer',
      url: 'https://explorer.testnet.liteforge.zeeve.net/api',
    },
  },
});


