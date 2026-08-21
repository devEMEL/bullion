import { Address, BigInt } from '@graphprotocol/graph-ts';
import { Creator, PoolManager, Protocol } from '../../generated/schema';
import { ZERO_BD } from './constants';

export const ZERO_BI = BigInt.fromI32(0);
export const ONE_BI = BigInt.fromI32(1);
export const PROTOCOL_ID = 'gemfot';
export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';

export function getOrCreateProtocol(): Protocol {
  let protocol = Protocol.load(PROTOCOL_ID);
  if (protocol == null) {
    protocol = new Protocol(PROTOCOL_ID);
    protocol.launchCount = ZERO_BI;
    protocol.totalRevenue = ZERO_BI;
    protocol.totalBuys = ZERO_BI;
    protocol.save();
  }
  return protocol as Protocol;
}

export function getOrCreateCreator(address: Address): Creator {
  let id = address.toHexString();
  let creator = Creator.load(id);
  if (creator == null) {
    creator = new Creator(id);
    creator.launchCount = ZERO_BI;
    creator.totalRevenue = ZERO_BI;
    creator.save();
  }
  return creator as Creator;
}

/**
 * Safely loads or creates the GemFot PoolManager singleton.
 * Called from handlePoolSwap so volume/fees are always tracked
 * even if Initialize fired before this subgraph version was deployed.
 */
export function getOrCreateGemfotManager(poolManagerAddress: string): PoolManager {
  let poolManager = PoolManager.load(poolManagerAddress);
  if (poolManager === null) {
    poolManager = new PoolManager(poolManagerAddress);
    poolManager.poolCount = ZERO_BI;
    poolManager.totalVolumeUSD = ZERO_BD;
    poolManager.totalFeesUSD = ZERO_BD;
    poolManager.totalValueLockedUSD = ZERO_BD;
    poolManager.txCount = ZERO_BI;
    poolManager.owner = ADDRESS_ZERO;
    poolManager.save();
  }
  return poolManager as PoolManager;
}
