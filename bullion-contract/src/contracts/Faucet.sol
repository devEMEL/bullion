// SPDX-License-Identifier: MIT
pragma solidity >=0.8.26 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Faucet is Ownable {
    address public nativeToken;
    uint256 public cooldown = 12 hours;
    uint256 public claimAmount;

    mapping(address => uint256) public lastClaim;

    event Claimed(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );
    event NativeTokenUpdated(address oldToken, address newToken);
    event ClaimAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event CooldownUpdated(uint256 newCooldown);

    constructor(
        address _nativeToken,
        uint256 _claimAmount
    ) Ownable(msg.sender) {
        require(_nativeToken != address(0), "Zero address");
        nativeToken = _nativeToken;
        claimAmount = _claimAmount;
    }

    function claim() external {
        require(
            lastClaim[msg.sender] == 0 ||
                block.timestamp >= lastClaim[msg.sender] + cooldown,
            "Cooldown active"
        );

        lastClaim[msg.sender] = block.timestamp;

        // Send native token (MATIC/LTC) via call
        // nativeToken is an ERC20 (BUSDC), so we use IERC20 transfer
        // But since it's referred to as "native token", we handle both ETH and ERC20
        // Based on "BUSDC" being an ERC20 (18 decimals, total supply 10B), we use IERC20
        if (
            claimAmount > 0 &&
            IERC20(nativeToken).balanceOf(address(this)) >= claimAmount
        ) {
            IERC20(nativeToken).transfer(msg.sender, claimAmount);
        }

        emit Claimed(msg.sender, nativeToken, claimAmount, block.timestamp);
    }

    function timeUntilNextClaim(address user) external view returns (uint256) {
        if (lastClaim[user] == 0) return 0;
        uint256 nextClaimTime = lastClaim[user] + cooldown;
        if (block.timestamp >= nextClaimTime) return 0;
        return nextClaimTime - block.timestamp;
    }

    // --- Admin functions ---

    function updateNativeToken(address _newToken) external onlyOwner {
        require(_newToken != address(0), "Zero address");
        address oldToken = nativeToken;
        nativeToken = _newToken;
        emit NativeTokenUpdated(oldToken, _newToken);
    }

    function setCooldown(uint256 _cooldownSeconds) external onlyOwner {
        cooldown = _cooldownSeconds;
        emit CooldownUpdated(_cooldownSeconds);
    }

    function updateClaimAmount(uint256 _newAmount) external onlyOwner {
        uint256 oldAmount = claimAmount;
        claimAmount = _newAmount;
        emit ClaimAmountUpdated(oldAmount, _newAmount);
    }

    // Withdraw native token balances (ERC20)
    function withdraw(uint256 amount, address to) external onlyOwner {
        IERC20(nativeToken).transfer(to, amount);
    }
}
