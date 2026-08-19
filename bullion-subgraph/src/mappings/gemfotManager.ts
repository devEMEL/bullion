import { BigInt, Bytes, log, BigDecimal } from '@graphprotocol/graph-ts';
import { ONE_BI, ZERO_BD } from '../utils/constants'
import {
  PoolCreated,
  PoolScheduled,
  PoolPremine,
  PremineBurned,
  PoolSwap,
  HookSwap as HookSwapEvent,
  HookFee as HookFeeEvent,
  PoolStateUpdated,
} from '../../generated/GemFotManager/GemFotManager';
import { Launch, Pool, Swap, PoolManager, Token } from '../../generated/schema';
import { getOrCreateCreator, getOrCreateProtocol, ZERO_BI } from '../utils/entities';
import { convertTokenToDecimal, loadTransaction } from '../utils';
import { getSubgraphConfig, SubgraphConfig } from '../utils/chains'
import { findNativePerToken, sqrtPriceX96ToTokenPrices, getTrackedAmountUSD } from '../utils/pricing';
import {
  updateUniswapDayData,
  updatePoolDayData,
  updatePoolHourData,
  updateTokenDayData,
  updateTokenHourData,
} from '../utils/intervalUpdates';


export function handlePoolCreated(event: PoolCreated): void {
  let id = event.params._poolId.toHexString();
  let params = event.params._params;

  let creator = getOrCreateCreator(params.creator);
  let protocol = getOrCreateProtocol();

  let launch = new Launch(id);
  launch.poolId = event.params._poolId;
  launch.memecoin = event.params._memecoin;
  launch.memecoinTreasury = event.params._memecoinTreasury;
  launch.tokenId = event.params._tokenId;
  launch.currencyFlipped = event.params._currencyFlipped;

  launch.name = params.name;
  launch.symbol = params.symbol;
  launch.tokenUri = params.tokenUri;

  launch.creator = creator.id;
  launch.creatorFeeAllocation = BigInt.fromI32(params.creatorFeeAllocation);

  launch.totalSupply = params.totalSupply;
  launch.initialTokenFairLaunch = params.initialTokenFairLaunch;
  launch.fairLaunchDuration = params.fairLaunchDuration;
  launch.fairLaunchStartsAt = ZERO_BI;
  launch.fairLaunchEndsAt = ZERO_BI;
  launch.fairLaunchClosed = false;
  launch.poolInitialized = false; // MAKE IT TRUE IN INITIALIZE HANDLER

  launch.targetMarketCap = params.usdcMarketCap;
  launch.multiple = BigInt.fromI32(params.multiple);
  launch.initialPriceIndex = ZERO_BI;

  launch.premineAmount = params.premineAmount;
  launch.premineBurned = false;

  launch.revenue = ZERO_BI;
  launch.remainingSupply = params.initialTokenFairLaunch;
  launch.soldSupply = ZERO_BI;
  launch.buyCount = ZERO_BI;

  launch.flaunchesAt = params.launchAt;
  launch.createdAtTimestamp = event.block.timestamp;
  launch.createdAtBlock = event.block.number;
  launch.transactionHash = event.transaction.hash;

  launch.save();

  creator.launchCount = creator.launchCount.plus(BigInt.fromI32(1));
  creator.save();

  protocol.launchCount = protocol.launchCount.plus(BigInt.fromI32(1));
  protocol.save();
}

export function handlePoolScheduled(event: PoolScheduled): void {
  let launch = Launch.load(event.params._poolId.toHexString());
  if (launch == null) return;
  launch.scheduledAt = event.params._launchesAt;
  launch.flaunchesAt = event.params._launchesAt;
  launch.save();
}

export function handlePoolPremine(event: PoolPremine): void {
  let launch = Launch.load(event.params._poolId.toHexString());
  if (launch == null) return;
  launch.premineAmount = event.params._premineAmount;
  launch.save();
}

export function handlePremineBurned(event: PremineBurned): void {
  let launch = Launch.load(event.params._poolId.toHexString());
  if (launch == null) return;
  launch.premineBurned = true;
  launch.save();
}

export function handlePoolStateUpdated(event: PoolStateUpdated): void {
  let launch = Launch.load(event.params._poolId.toHexString());
  if (launch != null) {
    launch.poolInitialized = true;
    launch.save();
  }

  let pool = Pool.load(event.params._poolId.toHexString());
  if (pool != null) {
    pool.sqrtPrice = event.params._sqrtPriceX96;
    pool.tick = BigInt.fromI32(event.params._tick);
    pool.liquidity = event.params._liquidity;
    pool.feeTier = BigInt.fromI32(event.params._swapFee);
    // load the swap and set its sqrtPrice

    pool.save();
  }
}

// we dont need handleHookSwap, we will do everything in handlePoolSwap as it contains all the info.


export function handlePoolSwap(event: PoolSwap): void {
  handlePoolSwapHelper(event)
}

export function handlePoolSwapHelper(
  event: PoolSwap,
  subgraphConfig: SubgraphConfig = getSubgraphConfig()
): void {
  const poolManagerAddress = subgraphConfig.poolManagerAddress
  const wrappedNativeAddress = subgraphConfig.wrappedNativeAddress
  const stablecoinAddresses = subgraphConfig.stablecoinAddresses
  const whitelistTokens = subgraphConfig.whitelistTokens

  const poolManager = PoolManager.load(poolManagerAddress)!
  const poolId = event.params.poolId.toHexString()
  const pool = Pool.load(poolId)

  if (!pool) {
    log.warning('Pool not found: {}', [poolId])
    return
  }

  const token0 = Token.load(pool.token0)
  const token1 = Token.load(pool.token1)

  if (!token0 || !token1) return

  // Calculate total amounts and fees (fl + isp + uni)
  let totalAmount0BI = event.params.flAmount0.plus(event.params.ispAmount0).plus(event.params.uniAmount0);
  let totalAmount1BI = event.params.flAmount1.plus(event.params.ispAmount1).plus(event.params.uniAmount1);
  let totalFee0BI = event.params.flFee0.plus(event.params.ispFee0).plus(event.params.uniFee0);
  let totalFee1BI = event.params.flFee1.plus(event.params.ispFee1).plus(event.params.uniFee1);


  // 1. Convert raw BigInt amounts and fees to decimal first
  const amount0 = convertTokenToDecimal(totalAmount0BI, token0.decimals)
  const amount1 = convertTokenToDecimal(totalAmount1BI, token1.decimals)
  const fee0 = convertTokenToDecimal(totalFee0BI, token0.decimals)
  const fee1 = convertTokenToDecimal(totalFee1BI, token1.decimals)

  // 2. Get absolute values (always positive) for volume tracking
  const amount0Abs = amount0.lt(ZERO_BD) ? amount0.times(BigDecimal.fromString('-1')) : amount0
  const amount1Abs = amount1.lt(ZERO_BD) ? amount1.times(BigDecimal.fromString('-1')) : amount1


  // ─── 2. Refresh token prices FIRST so all USD calcs use current prices ───
  token0.derivedNative = findNativePerToken(token0, wrappedNativeAddress, stablecoinAddresses)
  token1.derivedNative = findNativePerToken(token1, wrappedNativeAddress, stablecoinAddresses)


  const prices = sqrtPriceX96ToTokenPrices(pool.sqrtPrice, token0, token1)
  pool.token0Price = prices[0]
  pool.token1Price = prices[1]

  const amountTotalUSDTracked = getTrackedAmountUSD(
    amount0Abs, token0, amount1Abs, token1, whitelistTokens,
  ).div(BigDecimal.fromString('2'))
  const feesUSD = fee0.times(token0.derivedNative).plus(fee1.times(token1.derivedNative))

  // ─── 5. TVL (token amounts first, then USD) ───
  pool.totalValueLockedToken0 = pool.totalValueLockedToken0.plus(amount0)
  pool.totalValueLockedToken1 = pool.totalValueLockedToken1.plus(amount1)

  const oldPoolTVLUSD = pool.totalValueLockedUSD
  pool.totalValueLockedUSD = pool.totalValueLockedToken0
    .times(token0.derivedNative)
    .plus(pool.totalValueLockedToken1.times(token1.derivedNative))

  // ─── 6. Volume & fee accumulators ───
  pool.volumeToken0 = pool.volumeToken0.plus(amount0Abs)
  pool.volumeToken1 = pool.volumeToken1.plus(amount1Abs)
  pool.collectedFeesToken0 = pool.collectedFeesToken0.plus(fee0)
  pool.collectedFeesToken1 = pool.collectedFeesToken1.plus(fee1)
  pool.txCount = pool.txCount.plus(ONE_BI)

  // ─── 7. PoolManager aggregates ───
  poolManager.txCount = poolManager.txCount.plus(ONE_BI)
  poolManager.totalValueLockedUSD = poolManager.totalValueLockedUSD
    .minus(oldPoolTVLUSD)
    .plus(pool.totalValueLockedUSD)

  // ─── 8. Token aggregates ───
  token0.volume = token0.volume.plus(amount0Abs)
  token0.txCount = token0.txCount.plus(ONE_BI)
  token0.totalValueLocked = token0.totalValueLocked.plus(amount0)
  token0.totalValueLockedUSD = token0.totalValueLocked.times(token0.derivedNative)

  token1.volume = token1.volume.plus(amount1Abs)
  token1.txCount = token1.txCount.plus(ONE_BI)
  token1.totalValueLocked = token1.totalValueLocked.plus(amount1)
  token1.totalValueLockedUSD = token1.totalValueLocked.times(token1.derivedNative)

  // ─── 9. Swap entity ───

  let launchId = event.params.poolId.toHexString();
  let launch = Launch.load(launchId);
  const transaction = loadTransaction(event)


  let swap = new Swap(transaction.id.toString() + '-' + event.logIndex.toString());
  if (launch != null) {
    swap.launch = launch.id;
  }
  // Always attach to the current pool so Pool.swaps derived relation is reliable.
  swap.pool = pool.id;
  swap.token0 = pool.token0
  swap.token1 = pool.token1
  swap.transaction = transaction.id
  swap.origin = event.transaction.from;
  swap.flAmount0 = event.params.flAmount0;
  swap.flAmount1 = event.params.flAmount1;
  swap.flFee0 = event.params.flFee0;
  swap.flFee1 = event.params.flFee1;
  swap.ispAmount0 = event.params.ispAmount0;
  swap.ispAmount1 = event.params.ispAmount1;
  swap.ispFee0 = event.params.ispFee0;
  swap.ispFee1 = event.params.ispFee1;
  swap.uniAmount0 = event.params.uniAmount0;
  swap.uniAmount1 = event.params.uniAmount1;
  swap.uniFee0 = event.params.uniFee0;
  swap.uniFee1 = event.params.uniFee1;

  swap.amount0 = amount0;
  swap.amount1 = amount1;
  swap.fee0 = fee0;
  swap.fee1 = fee1;
  // Persist price/tick snapshots for analytics charting.
  swap.sqrtPriceX96 = pool.sqrtPrice;
  swap.tick = pool.tick;

  swap.timestamp = event.block.timestamp;
  swap.logIndex = event.logIndex;
  swap.save();


  // ─── 10. Time-series snapshots ───
  const uniswapDayData = updateUniswapDayData(event, poolManagerAddress)
  const poolDayData = updatePoolDayData(poolId, event)
  const poolHourData = updatePoolHourData(poolId, event)
  const token0DayData = updateTokenDayData(token0, event)
  const token1DayData = updateTokenDayData(token1, event)
  const token0HourData = updateTokenHourData(token0, event)
  const token1HourData = updateTokenHourData(token1, event)

  uniswapDayData.volumeUSD = uniswapDayData.volumeUSD.plus(amountTotalUSDTracked)
  uniswapDayData.feesUSD = uniswapDayData.feesUSD.plus(feesUSD)

  poolDayData.volumeUSD = poolDayData.volumeUSD.plus(amountTotalUSDTracked)
  poolDayData.volumeToken0 = poolDayData.volumeToken0.plus(amount0Abs)
  poolDayData.volumeToken1 = poolDayData.volumeToken1.plus(amount1Abs)
  poolDayData.feesUSD = poolDayData.feesUSD.plus(feesUSD)

  poolHourData.volumeUSD = poolHourData.volumeUSD.plus(amountTotalUSDTracked)
  poolHourData.volumeToken0 = poolHourData.volumeToken0.plus(amount0Abs)
  poolHourData.volumeToken1 = poolHourData.volumeToken1.plus(amount1Abs)
  poolHourData.feesUSD = poolHourData.feesUSD.plus(feesUSD)

  token0DayData.volume = token0DayData.volume.plus(amount0Abs)
  token0DayData.volumeUSD = token0DayData.volumeUSD.plus(amountTotalUSDTracked)
  token0DayData.feesUSD = token0DayData.feesUSD.plus(feesUSD)

  token1DayData.volume = token1DayData.volume.plus(amount1Abs)
  token1DayData.volumeUSD = token1DayData.volumeUSD.plus(amountTotalUSDTracked)
  token1DayData.feesUSD = token1DayData.feesUSD.plus(feesUSD)

  token0HourData.volume = token0HourData.volume.plus(amount0Abs)
  token0HourData.volumeUSD = token0HourData.volumeUSD.plus(amountTotalUSDTracked)
  token0HourData.feesUSD = token0HourData.feesUSD.plus(feesUSD)

  token1HourData.volume = token1HourData.volume.plus(amount1Abs)
  token1HourData.volumeUSD = token1HourData.volumeUSD.plus(amountTotalUSDTracked)
  token1HourData.feesUSD = token1HourData.feesUSD.plus(feesUSD)

  // ─── 11. Persist everything ───
  uniswapDayData.save()
  poolDayData.save()
  poolHourData.save()
  token0DayData.save()
  token1DayData.save()
  token0HourData.save()
  token1HourData.save()
  poolManager.save()
  pool.save()
  token0.save()
  token1.save()

}
