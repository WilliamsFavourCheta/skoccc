// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {MockStockToken} from "./MockStockToken.sol";

contract FeeOnTransferStockToken is MockStockToken {
    uint16 public immutable feeBps;

    constructor(string memory name_, string memory symbol_, uint16 feeBps_) MockStockToken(name_, symbol_) {
        feeBps = feeBps_;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from == address(0) || to == address(0) || feeBps == 0 || value == 0) {
            super._update(from, to, value);
            return;
        }

        uint256 fee = (value * feeBps) / 10_000;
        uint256 received = value - fee;

        if (fee > 0) {
            super._update(from, address(0), fee);
        }

        super._update(from, to, received);
    }
}
