// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";

import {PremineSubscriber} from "@gemfot/subscribers/Premine.sol";

/**
 * Deploys the {PremineSubscriber} subscriber.
 *
 * Required environment variables:
 * - GEMFOT_MANAGER : the deployed {GemFotManager} hook address
 * - LAUNCH         : the deployed {Launch} ERC721 address
 *
 * @dev Owner-gated calls are still required to activate premines:
 *      1. `notifier.subscribe(premineSubscriber, 0x)` so launch notifications reach it
 *      2. `gemfotManager.setPremineContract(premineSubscriber)` so its `buyFairLaunch`
 *         calls are resolved as creator-premine buys rather than public buys
 */
contract DeployPremineSubscriber is Script {
    function run() external returns (address premineSubscriber_) {
        address gemfotManager = vm.envAddress("GEMFOT_MANAGER");
        address launch = vm.envAddress("LAUNCH");

        vm.startBroadcast();
        PremineSubscriber premine = new PremineSubscriber(gemfotManager, launch);
        vm.stopBroadcast();

        premineSubscriber_ = address(premine);

        console.log("PremineSubscriber:", premineSubscriber_);
    }
}
