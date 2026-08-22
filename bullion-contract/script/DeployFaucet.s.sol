// SPDX-License-Identifier: MIT
pragma solidity >=0.8.26 <0.9.0;

import {Script, console} from "forge-std/Script.sol";
import {Faucet} from "@gemfot/Faucet.sol";

contract DeployFaucet is Script {
    function run() external returns (address faucet_) {
        address nativeToken = vm.envAddress("BUSDC");
        // 1,000 BUSDC per claim (18 decimals)
        uint256 claimAmount = 1_000 * 1e18;

        vm.startBroadcast();
        Faucet faucet = new Faucet(nativeToken, claimAmount);
        vm.stopBroadcast();

        faucet_ = address(faucet);

        console.log("Faucet deployed at:", faucet_);
        console.log("Native token (BUSDC):", nativeToken);
        console.log("Claim amount (wei):", claimAmount);
    }
}
