// SPDX-License-Identifier: MIT
pragma solidity >=0.8.26 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BZKLTC is ERC20 {
    uint8 private _decimals;
    uint256 public immutable maxSupply;
    
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        uint256 amount,
        address _to
    ) ERC20(name, symbol) {
        _decimals = decimals_;
        maxSupply = 10_000_000_000 * 10 ** decimals_;
        require(amount <= maxSupply, "Amount exceeds max supply");
        _mint(_to, amount);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from == address(0)) {
            require(totalSupply() == 0, "Minting is disabled");
        }
        super._update(from, to, value);
    }
}