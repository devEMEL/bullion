// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";

import {BUSDC} from "@gemfot/BUSDC.sol";

contract MineBUSDC is Script {
    function run() external returns (address busdc_) {
        bytes32 salt = vm.envBytes32("BUSDC_SALT");

        vm.startBroadcast();

        BUSDC busdc = new BUSDC{salt: salt}(
            "Bullion USDC",
            "bUSDC",
            18,
            10_000_000_000 * 10 ** 18,
            vm.envAddress("ADDRESS_TO_MINT_TO")
        );

        vm.stopBroadcast();

        busdc_ = address(busdc);

        console.log("bUSDC deployed at:", address(busdc));
    }

    // Run this offline first to find the salt:
    // forge script script/MineMUSDC.s.sol --sig "mine()" --rpc-url sepolia
    function mine() external view {
        address deployer = msg.sender;
        bytes32 initCodeHash = hashInitCode(
            type(BUSDC).creationCode,
            abi.encode(
                "Bullion USDC",
                "bUSDC",
                uint8(18),
                uint256(10_000_000_000 * 10 ** 18),
                vm.envAddress("ADDRESS_TO_MINT_TO")
            )
        );

        console.log("Mining for 0x11 prefix...");
        console.log("Deployer:", deployer);

        for (uint256 i = 0; i < 10_000_000; i++) {
            bytes32 salt = bytes32(i);
            address predicted = vm.computeCreate2Address(salt, initCodeHash);

            if (uint160(predicted) >> 152 == 0x11) {
                console.log("Salt found:", vm.toString(salt));
                console.log("Address:  ", predicted);
                break;
            }
        }
    }
}
