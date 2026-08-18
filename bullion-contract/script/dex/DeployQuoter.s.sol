// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

import {V4Quoter} from "@uniswap/v4-periphery/src/lens/V4Quoter.sol";

contract DeployQuoter is Script {
    function run() external returns (address quoter_) {

        address poolManagerAddr = vm.envAddress("POOL_MANAGER");
        
        console.log("Deploying V4Quoter with PoolManager at:", poolManagerAddr);

        vm.startBroadcast();

        // Deploy V4Quoter (v4 swap quoter)
        V4Quoter quoter = new V4Quoter(IPoolManager(poolManagerAddr));

        vm.stopBroadcast();

        quoter_ = address(quoter);
        console.log("V4Quoter deployed at:", quoter_);
    }
}
