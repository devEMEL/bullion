// SPDX-License-Identifier: MIT
pragma solidity >=0.8.26 <0.9.0;

import {Script, console} from "forge-std/Script.sol";
import {Faucet} from "@gemfot/Faucet.sol";

contract AdminFaucet is Script {
    function run() external {
        address faucetAddress = vm.envAddress("FAUCET_ADDRESS");

        Faucet faucet = Faucet(faucetAddress);

        vm.startBroadcast();

        // --- Set cooldown ---
        // faucet.setCooldown(2 hours);

        // --- Update token amount ---
        // faucet.updateNativeToken(0xNewTokenAddress);
        // faucet.updateClaimAmount(500 * 10 ** 18);


        vm.stopBroadcast();

        console.log("Cooldown is now:", faucet.cooldown());
    }
}

// forge script script/AdminFaucet.sol \
//   --rpc-url liteforge_testnet \
//   --account myWallet \
//   --sender 0x5Ac521f6814c2D09188A6838e7CDBfe7aEaC0cf9 \
//   --broadcast

  