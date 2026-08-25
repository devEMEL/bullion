export const USDC_ADDRESS = "0x11Dcf8343f868d8b88eFb3e45da4a5fcD43C3Fc0"; //busdc


export const POOLMANAGER_ADDRESS = "0xc7F528A2E6040fAb641ea2DeCCba9fb270f76Bb5";
export const V4_QUOTER_ADDRESS = "0xDeC8D45eC5df64a72Ab19e17bC3Ea7A1495f7AD6";
export const PERMIT2_ADDRESS = "0x795ff63d8Df87520d2430E26Ba858dc6c4385737";
export const WETH_ADDRESS="0x3A882b511D705FeE471B1276f106adB7f3680915";
export const 
POSITION_MANAGER_ADDRESS="0x3A882b511D705FeE471B1276f106adB7f3680915";
export const STATEVIEW_ADDRESS= "0x0cb11B2b45087ED222f608E97a9Cd466C06534c3";
export const UNIVERSALROUTER_ADDRESS="0xFC86b2F3344Ab4a4BAE08ebC712eE59Ae7551589";

export const FAUCET_ADDRESS="0x13676CC8CA2a92c745C01f1310ac775223A1a37a";
export const POINTSHOOK_ADDRESS="0x9fd953946FD2f6DDD32C3a44c73373EaBfD36fDC";

export const ACTIONS = {
  // --- Liquidity Actions (PositionManager) ---
  INCREASE_LIQUIDITY: 0x00,              // 0
  DECREASE_LIQUIDITY: 0x01,              // 1
  MINT_POSITION: 0x02,                   // 2
  BURN_POSITION: 0x03,                   // 3
  INCREASE_LIQUIDITY_FROM_DELTAS: 0x04,  // 4
  MINT_POSITION_FROM_DELTAS: 0x05,       // 5

  // --- Swap Actions (Router) ---
  SWAP_EXACT_IN_SINGLE: 0x06,            // 6
  SWAP_EXACT_IN: 0x07,                   // 7
  SWAP_EXACT_OUT_SINGLE: 0x08,           // 8
  SWAP_EXACT_OUT: 0x09,                  // 9

  // --- Utility & Payments ---
  DONATE: 0x0a,                          // 10
  SETTLE: 0x0b,                          // 11
  SETTLE_ALL: 0x0c,                      // 12
  SETTLE_PAIR: 0x0d,                     // 13
  TAKE: 0x0e,                            // 14
  TAKE_ALL: 0x0f,                        // 15
  TAKE_PORTION: 0x10,                    // 16
  TAKE_PAIR: 0x11,                       // 17
  CLOSE_CURRENCY: 0x12,                  // 18
  CLEAR_OR_TAKE: 0x13,                   // 19
  SWEEP: 0x14,                           // 20
  WRAP: 0x15,                            // 21
  UNWRAP: 0x16,                          // 22

  // --- ERC-6909 Actions ---
  MINT_6909: 0x17,                       // 23
  BURN_6909: 0x18                        // 24
} as const;


