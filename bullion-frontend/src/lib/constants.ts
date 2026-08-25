export const USDC_ADDRESS = "0x11Dcf8343f868d8b88eFb3e45da4a5fcD43C3Fc0"; //busdc


export const POOLMANAGER_ADDRESS = "0xDF6166bEf93B3aE8BFCe73225Dc5348c5A0Ad96A";
export const V4_QUOTER_ADDRESS = "0x1c279A89769199D770DdbfC8f9c77B43822d5544";
export const PERMIT2_ADDRESS = "0x496C2CF27577473a4e44b3E995dDf46D643482bF";
export const WETH_ADDRESS="0xF611321abdeb9fbcb36C8238a694712f8B196392";
export const 
POSITION_MANAGER_ADDRESS="0xF611321abdeb9fbcb36C8238a694712f8B196392";
export const STATEVIEW_ADDRESS= "0x2D21B11f49065C6220db8316C9c151f2f5C2b1A7";
export const UNIVERSALROUTER_ADDRESS="0xCD5F5d183b449940C8E4ab3E3B95Ef7d725B0d65";

export const FAUCET_ADDRESS="0xDc888959343e0341d423c6B509eB77a199B20b2f";
export const POINTSHOOK_ADDRESS="0x3B4D3ec4508e79115b7D9c94E72e970dCf5d2FDC";

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


