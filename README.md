# Bulion

**Fair-launch memecoin protocol on LitVM** — create tokens, discover price on a bonding curve, graduate to Uniswap v4 liquidity with hook-powered bid-wall protection and creator fee streams.


## What it is

Bulion lets anyone launch a memecoin against **bUSDC** (Bullion USDC), the protocol’s native asset. Launching is permissionless: creators configure supply, fair-launch size, duration, target market cap, curve multiple, optional premine, and creator fee share. Buyers purchase during a timed fair launch; when the window ends or supply sells out, remaining fair-launch tokens burn and raised liquidity seeds a Uniswap v4 pool. Ongoing swap fees fund a **BidWall** (plunge protection) and creator **treasury** actions.



---

## How it works

```
Launch  →  Fair launch (bonding curve)  →  Graduate to Uniswap v4  →  Trade + fees
```

1. **Launch** — Creator pays a launch fee in bUSDC. The protocol clones a memecoin ERC-20, a creator treasury, and mints a **Launch** NFT (ownership + revenue rights).
2. **Fair launch** — Buyers spend bUSDC on a linear bonding curve. Selling the memecoin is blocked until the window closes.
3. **Graduation** — Unsold fair-launch supply is burned; raised bUSDC and remaining tokens seed V4 ranges. Trading opens on the pool.
4. **Fees & BidWall** — Hook-captured swap fees waterfall to protocol → creator → BidWall (or treasury if the BidWall is disabled). The BidWall places single-sided bUSDC bids under spot to cushion dumps. Creators can run treasury actions (burn, buyback).

---

## Features

| Feature | Description |
|--------|-------------|
| **Bonding-curve fair launch** | Linear price discovery in bUSDC; no sells during the window |
| **Automatic liquidity** | Fair-launch proceeds seed Uniswap v4 pools on graduation |
| **Bid-wall protection** | Fee-funded floor support under spot |
| **Creator fee streams** | Configurable creator share via transferable Launch NFT |
| **Controlled premine** | Optional creator premine bought on-curve at launch |
| **bUSDC** | Protocol-native reserve token for launches, buys, and fees |
| **Testnet faucet** | Claim bUSDC on Liteforge (cooldown) |

---

## Monorepo

| Package | Role |
|---------|------|
| [`bullion-contract`](./bullion-contract) | Solidity protocol (Foundry): `GemFotManager` hook, FairLaunch, BidWall, Launch, bUSDC, FeeEscrow, treasury actions, Uniswap v4 stack |
| [`bullion-frontend`](./bullion-frontend) | Vite + React app: explore, launch, trade, portfolio, faucet, transfer |
| [`bullion-subgraph`](./bullion-subgraph) | The Graph / Goldsky indexer for launches, fair-launch buys, pools, swaps, and positions |

### Contracts (high level)

- **`GemFotManager`** — Central Uniswap v4 hook: launch, fair-launch buys, fee capture, BidWall coordination
- **`Launch`** — Clones memecoin + treasury; mints Launch NFT
- **`FairLaunch` / `LinearBondingCurve`** — Timed curve sale and graduation
- **`BidWall`** — Plunge protection from fee remainder
- **`BUSDC`** — Genesis-minted protocol reserve
- **`Notifier` + subscribers** — Premine and indexer fan-out on launch
- **`FeeEscrow` / `MemecoinTreasury`** — Claimable fees and creator actions

### Frontend

Explore launches, create tokens, buy on the curve or trade after graduation, view portfolio holdings and creator history, claim faucet bUSDC, and transfer tokens. Data comes from the Goldsky subgraph; writes go through wagmi/viem to `GemFotManager` and related contracts.

### Subgraph

Indexes `GemFotManager`, `FairLaunch`, Uniswap v4 `PoolManager`, and `PositionManager` on Liteforge. Powers explore lists, token detail, volume/leaderboards, and portfolio queries (launches, buys, pools, swaps, positions).

---

## Quick start

### Contracts

```bash
cd bullion-contract
forge build
forge test
# Deploy (see script/deploy.sh and .env)
```

### Frontend

```bash
cd bullion-frontend
bun install   # or npm / pnpm
bun dev       # http://localhost:3000
```

Set `VITE_WALLETCONNECT_PROJECT_ID` (and optional subgraph URL override) as needed. Network and contract addresses live in `src/config/networks.ts` and `src/lib/constants.ts`.

### Subgraph

```bash
cd bullion-subgraph
yarn codegen && yarn build
# Deploy e.g. via Goldsky: goldsky subgraph deploy bullion-subgraph/1.0.0 --path .
```

---

## Network

Currently targeting **Liteforge Testnet** (chain id `4441`) with a full in-repo Uniswap v4 periphery deployment. Testnet tokens have no real value.

---

## Disclaimer

Bulion is experimental software. Use at your own risk. Fair launches and memecoins are highly speculative; do your own research.
