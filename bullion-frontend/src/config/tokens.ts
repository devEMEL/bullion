export interface TokenConfig {
  address: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  logo: string;
}


export const TOKENS: TokenConfig[] = [
  {
    "address": "0xD2E89ec3ee53E017b9fE5755baD2D00622250a31" as `0x${string}`,
    "name": "Bullion ZKLTC",
    "symbol": "bUSDC",
    "decimals": 18,
    "logo": "/assets/busdc/logo.png"
  },
  {
    "address": "0x3600000000000000000000000000000000000000" as `0x${string}`,
    "name": "USDC",
    "symbol": "USDC",
    "decimals": 6,
    "logo": "/assets/0x3600000000000000000000000000000000000000/logo.png"
  },
  {
    "address": "0xc7F528A2E6040fAb641ea2DeCCba9fb270f76Bb5" as `0x${string}`,
    "name": "UniCrypt",
    "symbol": "UNCX",
    "decimals": 18,
    "logo": "/assets/0xc7F528A2E6040fAb641ea2DeCCba9fb270f76Bb5/logo.png"
  },
  {
    "address": "0x13676CC8CA2a92c745C01f1310ac775223A1a37a" as `0x${string}`,
    "name": "Flux",
    "symbol": "FLUX",
    "decimals": 18,
    "logo": "/assets/0x13676CC8CA2a92c745C01f1310ac775223A1a37a/logo.png"
  },
  {
    "address": "0x36bEE8F2DF69Cf3AFAb5c5ccA973fEb6441cAb11" as `0x${string}`,
    "name": "ML USDC",
    "symbol": "mUSDC",
    "decimals": 6,
    "logo": "/assets/0x36bEE8F2DF69Cf3AFAb5c5ccA973fEb6441cAb11/logo.png"
  },
  {
    "address": "0x795ff63d8Df87520d2430E26Ba858dc6c4385737" as `0x${string}`,
    "name": "Honey",
    "symbol": "HNY",
    "decimals": 18,
    "logo": "/assets/0x795ff63d8Df87520d2430E26Ba858dc6c4385737/logo.png"
  },
  {
    "address": "0x3A882b511D705FeE471B1276f106adB7f3680915" as `0x${string}`,
    "name": "Zilliqa",
    "symbol": "ZIL",
    "decimals": 18,
    "logo": "/assets/0x3A882b511D705FeE471B1276f106adB7f3680915/logo.png"
  },
  {
    "address": "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as `0x${string}`,
    "name": "EURC",
    "symbol": "EURC",
    "decimals": 6,
    "logo": "/assets/0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a/logo.png"
  },


  {
    "address": "0x8c277c071D42987Ef7712d135C4da1f46EA8Af8d",
    "name": "SoftDAO",
    "symbol": "SOFT",
    "decimals": 18,
    "logo": "/assets/0x8c277c071D42987Ef7712d135C4da1f46EA8Af8d/logo.png"
  },
  {
    "address": "0x10a2A353598E85Ea959B9176a6432a63C086A1Be",
    "name": "Reach",
    "symbol": "RCH",
    "decimals": 18,
    "logo": "/assets/0x10a2A353598E85Ea959B9176a6432a63C086A1Be/logo.jpeg"
  },
  {
    "address": "0x57700E377d85328322574FB8d92d4F017a2106E2",
    "name": "MONKE",
    "symbol": "MONKE",
    "decimals": 18,
    "logo": "/assets/0x57700E377d85328322574FB8d92d4F017a2106E2/logo.jpeg"
  }
];
