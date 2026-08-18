// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "forge-std/console.sol";

import {UniversalRouter} from "@uniswap/universal-router/contracts/UniversalRouter.sol";
import {RouterParameters} from "@uniswap/universal-router/contracts/types/RouterParameters.sol";

contract DeployUniversalRouter is Script {
    function run() external returns (address router_) {
        address permit2 = vm.envAddress("PERMIT2_ADDRESS");
        address weth = vm.envAddress("WETH_ADDRESS");
        address poolManager = vm.envAddress("POOL_MANAGER");
        address positionManager = vm.envAddress("POSITION_MANAGER_ADDRESS");

        console.log("Permit2:", permit2);
        console.log("WETH:", weth);
        console.log("PoolManager:", poolManager);
        console.log("PositionManager:", positionManager);

        require(weth != address(0), "WETH not deployed");

        vm.startBroadcast();

        RouterParameters memory params = RouterParameters({
            permit2: permit2,
            weth9: weth,
            v2Factory: address(0),
            v3Factory: address(0),
            pairInitCodeHash: bytes32(0),
            poolInitCodeHash: bytes32(0),
            v4PoolManager: poolManager,
            permissionsAdapterFactory: address(0),
            v3NFTPositionManager: address(0),
            v4PositionManager: positionManager,
            spokePool: address(0)
        });

        UniversalRouter router = new UniversalRouter(params);
        router_ = address(router);
        console.log("UniversalRouter deployed at:", router_);

        vm.stopBroadcast();
    }
}
