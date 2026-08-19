export const USDC_ADDRESS = "0xd03307a0d5092B17C12cA9380f707f7d7FCD8f09"; //bzkltc


export const POOLMANAGER_ADDRESS = "0xF351A424955ba04e3d49dDa6E549a5983dB264B9";
export const V4_QUOTER_ADDRESS = "0x3c0d37f415057a01b921aF943d4826A08A7C424b";
export const PERMIT2_ADDRESS = "0x988A89F9469D3B2D7BDbd4Af2b4B39D61701F3eC";
export const WETH_ADDRESS="0xd7569Bd95be12b864aAba642721D03063352c896";
export const 
POSITION_MANAGER_ADDRESS="0xf08E1E3EFF9d79F545E14179396004Ba92dA25B5";
export const STATEVIEW_ADDRESS= "0x2527Bf2E647a992e2359571DBeD8cfe346E2af9F";
export const UNIVERSALROUTER_ADDRESS="0x0c5877cee13e06295Bd6F589Fa5E0bBA5E60d862";

export const FAUCET_ADDRESS="0x68b6Bdb4AC1d0EBafe5D00309225998997d7137d";
export const POINTSHOOK_ADDRESS="0xB88770C9FE4C733EFb9dd259fc32F00979706fdC";

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


