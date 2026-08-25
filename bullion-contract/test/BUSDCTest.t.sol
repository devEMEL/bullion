// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {BUSDC} from "@gemfot/BUSDC.sol";

contract BUSDCTest is Test {
    BUSDC busdc;

    string constant NAME = "Bullion USDC";
    string constant SYMBOL = "bUSDC";
    uint8 constant DECIMALS = 18;
    // Genesis mint used by the deployment script: the full max supply.
    uint256 constant GENESIS = 10_000_000_000 * 10 ** 18;
    uint256 constant MAX_SUPPLY = 10_000_000_000 * 10 ** 18;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function _deploy(uint256 genesisAmount, address to) internal returns (BUSDC) {
        return new BUSDC(NAME, SYMBOL, DECIMALS, genesisAmount, to);
    }

    function setUp() public {
        busdc = _deploy(GENESIS, alice);
    }

    /* -------------------------------------------------------------------------- */
    /*                                Constructor                                 */
    /* -------------------------------------------------------------------------- */

    function test_ConstructorSetsMetadataAndMintsRecipient() public {
        assertEq(busdc.name(), NAME);
        assertEq(busdc.symbol(), SYMBOL);
        assertEq(busdc.decimals(), DECIMALS);
        assertEq(busdc.maxSupply(), MAX_SUPPLY);
        assertEq(busdc.balanceOf(alice), GENESIS);
        assertEq(busdc.totalSupply(), GENESIS);
    }

    function test_DecimalsAreConfigurable() public {
        BUSDC sixDecimals = new BUSDC(NAME, SYMBOL, 6, 1_000_000e6, alice);
        assertEq(sixDecimals.decimals(), 6);
        assertEq(sixDecimals.maxSupply(), 10_000_000_000 * 10 ** 6);
    }

    function test_RevertWhen_GenesisAmountExceedsMaxSupply() public {
        vm.expectRevert(bytes("Amount exceeds max supply"));
        new BUSDC(NAME, SYMBOL, 6, MAX_SUPPLY + 1, alice);
    }

    /* -------------------------------------------------------------------------- */
    /*                              Supply controls                               */
    /* -------------------------------------------------------------------------- */

    function test_MintIsDisabledOnceGenesisSupplyExists() public {
        vm.expectRevert(bytes("Minting is disabled"));
        busdc.mint(bob, 1);
    }

    function test_MintByAnyoneIsDisabledToo() public {
        vm.prank(bob);
        vm.expectRevert(bytes("Minting is disabled"));
        busdc.mint(bob, 1_000e18);
    }

    /* -------------------------------------------------------------------------- */
    /*                            Standard ERC20 paths                            */
    /* -------------------------------------------------------------------------- */

    function test_TransferMovesBalance() public {
        vm.prank(alice);
        assertTrue(busdc.transfer(bob, 100e18));
        assertEq(busdc.balanceOf(alice), GENESIS - 100e18);
        assertEq(busdc.balanceOf(bob), 100e18);
    }

    function test_TransferFromConsumesAllowance() public {
        vm.prank(alice);
        busdc.approve(bob, 50e18);

        vm.prank(bob);
        assertTrue(busdc.transferFrom(alice, bob, 50e18));

        assertEq(busdc.allowance(alice, bob), 0);
        assertEq(busdc.balanceOf(bob), 50e18);
    }

    function test_TransferEmitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit IERC20.Transfer(alice, bob, 42);
        busdc.transfer(bob, 42);
    }

    /* -------------------------------------------------------------------------- */
    /*      Misdeployment hazard (current behaviour, kept as documentation)       */
    /* -------------------------------------------------------------------------- */

    function test_Hazard_UnboundedFirstMintIfDeployedWithoutGenesisSupply() public {
        // If the token is ever deployed with amount = 0, the "minting disabled" guard
        // never latches during construction - and mint() has no maxSupply check - so
        // whoever calls first can print an arbitrary one-time supply. The guard only
        // engages afterwards (totalSupply() != 0), so this is a one-shot, not a faucet.
        BUSDC emptyBusdc = _deploy(0, alice);

        address attacker = makeAddr("attacker");
        emptyBusdc.mint(attacker, type(uint256).max);

        assertGt(emptyBusdc.totalSupply(), MAX_SUPPLY);
        assertEq(emptyBusdc.balanceOf(attacker), type(uint256).max);

        // Further mints are indeed locked out.
        vm.expectRevert(bytes("Minting is disabled"));
        emptyBusdc.mint(attacker, 1);
    }
}
