// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";

contract DeployPM is Script {
    function run() external returns (address pm_) {
        vm.startBroadcast();

        PoolManager manager = new PoolManager(vm.envAddress("ADDRESS_TO_MINT_TO"));

        vm.stopBroadcast();
        pm_ = address(manager);
    }
}

