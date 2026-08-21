// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IHooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {GemFotManager} from "../GemFotManager.sol";
import {SafeTransferLib} from "@solady/utils/SafeTransferLib.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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

    error Unauthorized();

    constructor(address _manager, address _notifier) {
        manager = GemFotManager(_manager);
        _initializeOwner(msg.sender);
    }

    function notify(
        PoolId poolId,
        bytes4 selector,
        bytes calldata data
    ) external {
  
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

        int256 stored = _tload(PoolId.unwrap(poolId));
        if (stored <= 0) {
            return; // either already cleared or never set.
        }

        PoolKey memory key = manager.poolKey(tokenId); 

        manager.buyFairLaunch(key, nativeIn);
    }

    function _tload(bytes32 _key) internal view returns (int value_) {
        assembly { value_ := tload(_key) }
    }
}