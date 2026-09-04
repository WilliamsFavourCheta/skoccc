// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

contract MultiplierStockToken is ERC20 {
    uint256 public constant MULTIPLIER_SCALE = 1e18;

    uint256 private _uiMultiplier = MULTIPLIER_SCALE;

    event UIMultiplierUpdated(uint256 oldMultiplier, uint256 newMultiplier, uint256 effectiveAtTimestamp);

    error InvalidMultiplier();

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function setUIMultiplier(uint256 newMultiplier) external {
        if (newMultiplier == 0) revert InvalidMultiplier();

        uint256 oldMultiplier = _uiMultiplier;
        _uiMultiplier = newMultiplier;
        emit UIMultiplierUpdated(oldMultiplier, newMultiplier, block.timestamp);
    }

    function uiMultiplier() external view returns (uint256) {
        return _uiMultiplier;
    }

    function toUIAmount(uint256 rawAmount) external view returns (uint256) {
        return Math.mulDiv(rawAmount, _uiMultiplier, MULTIPLIER_SCALE);
    }
}
