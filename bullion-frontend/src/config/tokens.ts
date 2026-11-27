export interface TokenConfig {
  address: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
}

export const TOKENS: TokenConfig[] = [];
