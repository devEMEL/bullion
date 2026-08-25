// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IHooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {GemFotManager} from "@gemfot/GemFotManager.sol";
import {Launch} from "@gemfot/Launch.sol";
import {Ownable} from "@solady/auth/Ownable.sol";

/**
 * @title PremineSubscriber
 * @notice Hook subscriber that lets the token creator claim the premine amount stored in
 *         transient storage during `GemFotManager.launch`. The creator pays the required
 *         amount of the native token (USDC) to the bonding curve via `GemFotManager.buyFairLaunch`.
 */
contract PremineSubscriber is Ownable {
    /// Reference to the main manager contract.
    GemFotManager public immutable manager;
    Launch public immutable launch;

    /// @notice Tracks pools whose premine has already been executed.
    mapping(PoolId => bool) private claimed;

    constructor(address _manager, address _launch) {
        manager = GemFotManager(payable(_manager));
        launch = Launch(_launch);

        _initializeOwner(msg.sender);
    }

    /**
     * Called when the contract is subscribed to the Notifier.
     *
     * @dev This must return `true` to be subscribed.
     */
    function subscribe(
        bytes memory /* data */
    ) external pure returns (bool) {
        return true;
    }

    /**
     * Called when the contract is unsubscribed from the Notifier.
     */
    function unsubscribe() external {}

    function notify(
        PoolId poolId,
        bytes4 selector,
        bytes calldata data
    ) external {
        // Only accept notifications forwarded by the manager's Notifier; a direct
        // call must never be able to trigger a purchase charged to the creator.
        if (msg.sender != address(manager.notifier())) {
            return;
        }

        if (selector != IHooks.afterInitialize.selector) {
            return;
        }

        (uint256 tokenId, GemFotManager.LaunchParams memory params, uint256 nativeIn) = abi.decode(
            data,
            (uint256, GemFotManager.LaunchParams, uint256)
        );

        if (params.premineAmount == 0) {
            return;
        }
        address memecoin = launch.memecoin(tokenId);

        // Guard against double-execution: the manager clears its own transient
        // claim on purchase, but we must also ensure we only ever buy once.
        if (claimed[poolId]) {
            return;
        }
        claimed[poolId] = true;

        PoolKey memory key = manager.poolKey(memecoin);

        manager.buyFairLaunch(key, nativeIn);
    }
}