// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "forge-std/console.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";
import {IPositionDescriptor} from "@uniswap/v4-periphery/src/interfaces/IPositionDescriptor.sol";
import {PositionDescriptor} from "@uniswap/v4-periphery/src/PositionDescriptor.sol";
import {PositionManager} from "@uniswap/v4-periphery/src/PositionManager.sol";
import {IWETH9} from "@uniswap/v4-periphery/src/interfaces/external/IWETH9.sol";
import {WETH} from "solmate/src/tokens/WETH.sol";

contract DeployPositionManager is Script {
    function run() external returns (address posManager_, address weth_) {
        // Already deployed contracts
        address poolManagerAddr = vm.envAddress("POOL_MANAGER");
        address permit2Addr = vm.envAddress("PERMIT2_ADDRESS");
        address nativeToken = vm.envAddress("NATIVE_TOKEN");

        console.log("PoolManager:", poolManagerAddr);
        console.log("Permit2:", permit2Addr);

        vm.startBroadcast();

        // 1. Deploy WETH9
        WETH weth = new WETH();
        console.log("WETH deployed at:", address(weth));

        // 2. Deploy PositionDescriptor
        bytes32 nativeCurrencyLabel = bytes32("BZKLTC");
        PositionDescriptor descriptor = new PositionDescriptor(
            IPoolManager(poolManagerAddr),
            nativeToken,
            nativeCurrencyLabel
        );
        console.log("PositionDescriptor deployed at:", address(descriptor));

        // 3. Deploy PositionManager
        uint256 unsubscribeGasLimit = 100_000;
        PositionManager positionManager = new PositionManager(
            IPoolManager(poolManagerAddr),
            IAllowanceTransfer(permit2Addr),
            unsubscribeGasLimit,
            IPositionDescriptor(address(descriptor)),
            IWETH9(address(weth))
        );
        console.log("PositionManager deployed at:", address(positionManager));

        vm.stopBroadcast();

        posManager_ = address(positionManager);
        weth_ = address(weth);
    }
}
