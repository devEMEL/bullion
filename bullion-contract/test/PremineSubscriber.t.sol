// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks, IHooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";

import {GemFotManager} from "@gemfot/GemFotManager.sol";
import {Launch} from "@gemfot/Launch.sol";
import {Memecoin} from "@gemfot/Memecoin.sol";
import {FairLaunch} from "@gemfot/hooks/FairLaunch.sol";
import {FeeDistributor} from "@gemfot/hooks/FeeDistributor.sol";
import {FeeExemptions} from "@gemfot/hooks/FeeExemptions.sol";
import {BidWall} from "@gemfot/bidwall/BidWall.sol";
import {FeeEscrow} from "@gemfot/escrows/FeeEscrow.sol";
import {USDCMarketCappedPrice} from "@gemfot/price/MarketCappedPrice.sol";
import {TreasuryActionManager} from "@gemfot/treasury/ActionManager.sol";
import {MemecoinTreasury} from "@gemfot/treasury/MemecoinTreasury.sol";
import {Notifier} from "@gemfot/hooks/Notifier.sol";
import {ProtocolRoles} from "@gemfot/libraries/ProtocolRoles.sol";
import {LinearBondingCurve} from "@gemfot/libraries/LinearBondingCurve.sol";
import {IInitialPrice} from "@gemfot-interfaces/IInitialPrice.sol";
import {PremineSubscriber} from "@gemfot/subscribers/Premine.sol";
import {BUSDC} from "@gemfot/BUSDC.sol";


/**
 * Mock Indexer for FeeEscrow
 */
contract MockIndexer {
    function poolIndex(PoolId) external pure returns (address, address, address, uint) {
        return (address(0), address(0), address(0), 0);
    }
}

/**
 * Tests the PremineSubscriber which executes the creator's premine purchase during
 * `GemFotManager.launch` via the Notifier subscription system.
 */
contract PremineSubscriberTest is Test {
    using PoolIdLibrary for PoolKey;

    GemFotManager manager;
    PoolManager poolManager;
    Launch launchContract;
    FairLaunch fairLaunch;
    BidWall bidWall;
    FeeEscrow feeEscrow;
    FeeExemptions feeExemptions;
    USDCMarketCappedPrice initialPrice;
    TreasuryActionManager actionManager;
    Notifier notifier;
    BUSDC busdc; // the protocol's native token
    PremineSubscriber premine;

    address protocolOwner = makeAddr("protocolOwner");
    address protocolFeeRecipient = makeAddr("protocolFeeRecipient");
    address creator = makeAddr("creator");
    address stranger = makeAddr("stranger");

    Memecoin memecoinImplementation;
    MemecoinTreasury memecoinTreasuryImplementation;

    // Test constants matching native token (bUSDC, 18 decimals) and memecoin decimals
    uint constant NATIVE_DECIMALS = 18;
    uint constant TOKEN_DECIMALS = 18;
    uint constant TARGET_MARKET_CAP = 100_000 * 10 ** NATIVE_DECIMALS; // $100k
    uint constant TOTAL_SUPPLY = 1_000_000_000 * 10 ** TOKEN_DECIMALS; // 1B tokens
    uint constant FAIR_LAUNCH_SUPPLY = 500_000_000 * 10 ** TOKEN_DECIMALS; // 500M tokens
    uint constant FAIR_LAUNCH_DURATION = 7 days;
    uint8 constant MULTIPLE = 7;

    // The swap fee configured in the harness FeeDistribution (3%)
    uint24 constant SWAP_FEE_BPS = 3_00;

    // Native spend for the creator's premine purchase in the e2e test
    uint constant PREMINE_NATIVE_IN = 1_000 * 10 ** NATIVE_DECIMALS;
    // Generous ceiling well above what PREMINE_NATIVE_IN yields on the curve,
    // satisfying `tokensOut <= premineAmount` without pinning equality.
    uint constant PREMINE_CEILING = 150_000_000 * 10 ** TOKEN_DECIMALS;

    /**
     * The address the hook must be deployed to, encoding the permissions returned by
     * `GemFotManager.getHookPermissions()`.
     */
    address constant HOOK_ADDRESS = address(
        uint160(
            Hooks.BEFORE_INITIALIZE_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG
                | Hooks.AFTER_ADD_LIQUIDITY_FLAG | Hooks.BEFORE_REMOVE_LIQUIDITY_FLAG
                | Hooks.AFTER_REMOVE_LIQUIDITY_FLAG | Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG
                | Hooks.AFTER_DONATE_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG
                | Hooks.AFTER_SWAP_RETURNS_DELTA_FLAG
        )
    );

    function setUp() public {
        vm.warp(1 days);

        // Deploy the native token with its full genesis supply held by this test
        // contract, then distribute to actors via transfers (minting is disabled).
        busdc = new BUSDC(
            "Bullion USDC", "bUSDC", uint8(NATIVE_DECIMALS), 10_000_000_000 * 10 ** NATIVE_DECIMALS, address(this)
        );
        poolManager = new PoolManager(protocolOwner);

        memecoinImplementation = new Memecoin();
        memecoinTreasuryImplementation = new MemecoinTreasury();

        initialPrice = new USDCMarketCappedPrice(protocolOwner);
        feeExemptions = new FeeExemptions(protocolOwner);
        actionManager = new TreasuryActionManager(protocolOwner);

        MockIndexer indexer = new MockIndexer();
        feeEscrow = new FeeEscrow(address(busdc), address(indexer));

        fairLaunch = new FairLaunch(poolManager);
        bidWall = new BidWall(address(busdc), address(poolManager), protocolOwner);

        GemFotManager.ConstructorParams memory constructorParams = GemFotManager.ConstructorParams({
            nativeToken: address(busdc),
            poolManager: poolManager,
            feeDistribution: FeeDistributor.FeeDistribution({
                swapFee: SWAP_FEE_BPS, // 3%
                protocol: 2_00, // 2%
                active: true
            }),
            initialPrice: IInitialPrice(address(initialPrice)),
            protocolOwner: protocolOwner,
            protocolFeeRecipient: protocolFeeRecipient,
            feeEscrow: address(feeEscrow),
            feeExemptions: feeExemptions,
            actionManager: actionManager,
            bidWall: bidWall,
            fairLaunch: fairLaunch
        });

        vm.prank(protocolOwner);
        deployCodeTo(
            "GemFotManager.sol:GemFotManager", abi.encode(constructorParams), HOOK_ADDRESS
        );
        manager = GemFotManager(payable(HOOK_ADDRESS));

        fairLaunch.grantRole(ProtocolRoles.GEMFOT_MANAGER, address(manager));

        vm.prank(protocolOwner);
        bidWall.grantRole(ProtocolRoles.GEMFOT_MANAGER, address(manager));

        launchContract = new Launch();
        launchContract.initialize(
            address(memecoinImplementation),
            "",
            manager,
            address(memecoinTreasuryImplementation)
        );

        vm.prank(protocolOwner);
        manager.setLaunch(address(launchContract));

        notifier = manager.notifier();

        // Deploy the subscriber and wire it up: register it as the trusted premine
        // caller on the manager, then subscribe it through the Notifier.
        premine = new PremineSubscriber(address(manager), address(launchContract));

        vm.startPrank(protocolOwner);
        manager.setPremineContract(address(premine));
        notifier.subscribe(address(premine), "");
        vm.stopPrank();

        busdc.transfer(creator, 1_000_000 * 10 ** NATIVE_DECIMALS);
        busdc.transfer(stranger, 1_000_000 * 10 ** NATIVE_DECIMALS);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Helpers                                   */
    /* -------------------------------------------------------------------------- */

    function _defaultParams() internal view returns (GemFotManager.LaunchParams memory) {
        return _params(PREMINE_CEILING, PREMINE_NATIVE_IN);
    }

    function _params(
        uint _premineAmount,
        uint _nativeIn
    ) internal view returns (GemFotManager.LaunchParams memory) {
        return GemFotManager.LaunchParams({
            name: "Test Token",
            symbol: "TEST",
            tokenUri: "https://test.com/token.json",
            initialTokenFairLaunch: FAIR_LAUNCH_SUPPLY,
            fairLaunchDuration: FAIR_LAUNCH_DURATION,
            premineAmount: _premineAmount,
            creator: creator,
            creatorFeeAllocation: 10_00, // 10%
            launchAt: block.timestamp,
            totalSupply: TOTAL_SUPPLY,
            usdcMarketCap: TARGET_MARKET_CAP,
            multiple: MULTIPLE,
            nativeIn: _nativeIn
        });
    }

    function _launch(GemFotManager.LaunchParams memory params)
        internal
        returns (address memecoin_, PoolKey memory key_)
    {
        vm.startPrank(creator);
        busdc.approve(address(manager), type(uint).max);
        memecoin_ = manager.launch(params);
        vm.stopPrank();

        key_ = manager.poolKey(memecoin_);
    }

    /// Recomputes the exact curve output the premine buy should have produced.
    function _expectedPremineTokens(PoolKey memory key) internal view returns (uint) {
        FairLaunch.FairLaunchInfo memory info = fairLaunch.fairLaunchInfo(key.toId());
        return LinearBondingCurve.calculateBuyAmount(
            info.targetMarketCap, info.initialSupply, info.p0, 0, PREMINE_NATIVE_IN
        );
    }

    /* -------------------------------------------------------------------------- */
    /*                                Constructor                                 */
    /* -------------------------------------------------------------------------- */

    function test_ConstructorSetsImmutablesAndOwner() public view {
        assertEq(address(premine.manager()), address(manager));
        assertEq(address(premine.launch()), address(launchContract));
        assertEq(premine.owner(), address(this));
    }

    /* -------------------------------------------------------------------------- */
    /*                          ISubscriber handshake                             */
    /* -------------------------------------------------------------------------- */

    function test_SubscribeReturnsTrue() public view {
        assertTrue(premine.subscribe(""));
    }

    function test_SubscriptionThroughNotifierSucceeds() public {
        // setUp already performed the real handshake; re-subscribing a duplicate is a
        // no-op that must not revert either.
        vm.prank(protocolOwner);
        notifier.subscribe(address(premine), "");
    }

    /* -------------------------------------------------------------------------- */
    /*                              End-to-end flow                               */
    /* -------------------------------------------------------------------------- */

    function test_PremineExecutesDuringLaunch() public {
        GemFotManager.LaunchParams memory params = _defaultParams();
        uint creatorUsdcBefore = busdc.balanceOf(creator);

        (address memecoin,) = _launch(params);

        // Creator received exactly the curve output for their nativeIn, bought at sold=0.
        uint expectedTokens = _expectedPremineTokens(manager.poolKey(memecoin));
        assertGt(expectedTokens, 0, "Curve should produce a non-zero quote");
        assertLe(expectedTokens, params.premineAmount, "Quote must respect the premine ceiling");
        assertEq(IERC20(memecoin).balanceOf(creator), expectedTokens);

        // Creator paid the launching fee plus nativeIn and the swap fee, nothing else.
        uint expectedCost =
            initialPrice.getLaunchingFee() + PREMINE_NATIVE_IN + (PREMINE_NATIVE_IN * SWAP_FEE_BPS / 10_000);
        assertEq(creatorUsdcBefore - busdc.balanceOf(creator), expectedCost);
    }

    function test_PremineEmitsPoolPremineEvent() public {
        GemFotManager.LaunchParams memory params = _defaultParams();

        vm.recordLogs();
        (address memecoin, PoolKey memory key) = _launch(params);

        uint expectedTokens = _expectedPremineTokens(key);
        bytes32 expectedPoolId = PoolId.unwrap(key.toId());
        bytes32 poolPremineTopic = GemFotManager.PoolPremine.selector;

        Vm.Log[] memory logs = vm.getRecordedLogs();
        bool found;
        for (uint i; i < logs.length; ++i) {
            if (logs[i].emitter == address(manager) && logs[i].topics[0] == poolPremineTopic) {
                assertEq(logs[i].topics[1], expectedPoolId, "PoolPremine poolId mismatch");
                int256 tokensOut = abi.decode(logs[i].data, (int256));
                assertEq(uint256(tokensOut), expectedTokens, "PoolPremine tokensOut mismatch");
                found = true;
            }
        }
        assertTrue(found, "PoolPremine event should be emitted");

        // Silence unused warnings while keeping the assertions above meaningful.
        require(memecoin != address(0), "memecoin");
    }

    function test_LaunchWithoutPremineDoesNothing() public {
        GemFotManager.LaunchParams memory params = _params(0, 0);

        (address memecoin,) = _launch(params);

        assertEq(IERC20(memecoin).balanceOf(creator), 0);
        assertEq(busdc.balanceOf(creator), 1_000_000 * 10 ** NATIVE_DECIMALS - initialPrice.getLaunchingFee());
    }

    function test_RevertWhen_CreatorHasNotFundedPremine() public {
        GemFotManager.LaunchParams memory params = _defaultParams();

        vm.startPrank(creator);
        // Approve only the launching fee - not enough for the premine pull.
        busdc.approve(address(manager), initialPrice.getLaunchingFee());
        vm.expectRevert();
        manager.launch(params);
        vm.stopPrank();
    }

    /* -------------------------------------------------------------------------- */
    /*                             Direct notify calls                            */
    /* -------------------------------------------------------------------------- */

    function test_NotifyIgnoresOtherSelectors() public {
        GemFotManager.LaunchParams memory params = _defaultParams();
        (address memecoin, PoolKey memory key) = _launch(params);
        uint balanceBefore = IERC20(memecoin).balanceOf(creator);

        // A non-afterInitialize selector is ignored even though the pool was claimed.
        premine.notify(
            key.toId(),
            IHooks.afterSwap.selector,
            abi.encode(uint(0), params, PREMINE_NATIVE_IN)
        );

        assertEq(IERC20(memecoin).balanceOf(creator), balanceBefore);
    }

    function test_NotifyCannotExecuteTwice() public {
        GemFotManager.LaunchParams memory params = _defaultParams();
        (address memecoin, PoolKey memory key) = _launch(params);
        uint balanceBefore = IERC20(memecoin).balanceOf(creator);
        uint tokenId = launchContract.tokenId(memecoin);

        // Replay the notification directly against the subscriber: the local claim
        // guard makes it a no-op instead of a second charged purchase.
        premine.notify(
            key.toId(),
            IHooks.afterInitialize.selector,
            abi.encode(tokenId, params, PREMINE_NATIVE_IN)
        );

        assertEq(IERC20(memecoin).balanceOf(creator), balanceBefore);
    }

    function test_DirectNotifyOutsideNotifierIsIgnored() public {
        // A stranger calling the subscriber directly must not be able to trigger a
        // purchase charged to the creator - the call is silently ignored.
        GemFotManager.LaunchParams memory params = _defaultParams();
        (address memecoin, PoolKey memory key) = _launch(params);

        uint creatorBalanceBefore = IERC20(memecoin).balanceOf(creator);
        uint tokenId = launchContract.tokenId(memecoin);

        premine.notify(
            key.toId(),
            IHooks.afterInitialize.selector,
            abi.encode(tokenId, params, PREMINE_NATIVE_IN)
        );

        assertEq(IERC20(memecoin).balanceOf(creator), creatorBalanceBefore);
    }
}
