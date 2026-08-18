// SPDX-License-Identifier: MIT
pragma solidity >=0.8.26 <0.9.0;

import {Script, console} from "forge-std/Script.sol";
import {BZKLTC} from "@gemfot/BZKLTC.sol";

contract DeployBZKLTC is Script {
    function run() external returns (address bzklta_) {
        // Constructor(uint256 amount, address to) — mints `amount` to `to` at deployment.
        // 10_000_000_000 * 10**18 (18 decimals, full supply to the deployer).
        uint256 initialSupply = 10_000_000_000 * 10**18;

        vm.startBroadcast();
        BZKLTC bzklta = new BZKLTC(
            "Bullion ZKLTC",
            "bZKLTC",
            18,
            initialSupply,
            msg.sender // should be 0x5Ac521f6814c2D09188A6838e7CDBfe7aEaC0cf9
        );
        vm.stopBroadcast();

        bzklta_ = address(bzklta);

        console.log("BZKLTC deployed at:", bzklta_);
        console.log("Initial supply:", initialSupply);
    }
}
