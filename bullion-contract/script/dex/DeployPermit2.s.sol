// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "forge-std/Script.sol";
import "forge-std/console.sol";

import {Permit2} from "permit2/src/Permit2.sol";

contract DeployPermit2 is Script {
    function run() external returns (address permit2_) {
   
        console.log("Deploying Permit2");

        vm.startBroadcast();

        // Deploy Permit2
        Permit2 permit2 = new Permit2();

        vm.stopBroadcast();

        permit2_ = address(permit2);
        console.log("Permit2 deployed at:", permit2_);
    }
}

