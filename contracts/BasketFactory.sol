// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {BasketVault} from "./BasketVault.sol";

contract BasketFactory is Ownable, Pausable {
    uint16 public constant TOTAL_WEIGHT_BPS = 10_000;
    uint256 public constant MAX_ASSETS = 10;

    mapping(address token => bool approved) public approvedStockToken;
    mapping(address basket => bool created) public isBasket;
    mapping(bytes32 tickerKey => address basket) private _basketByTickerKey;
    address[] private _baskets;
    mapping(address creator => address[] baskets) private _creatorBaskets;

    error EmptyName();
    error EmptySymbol();
    error TickerAlreadyUsed(string ticker, address basket);
    error EmptyAssets();
    error TooManyAssets();
    error AssetWeightLengthMismatch();
    error DuplicateAsset(address token);
    error UnapprovedStockToken(address token);
    error InvalidWeight();
    error InvalidTotalWeight(uint256 totalWeight);
    error UnknownBasket(address basket);

    event StockTokenApprovalChanged(address indexed token, bool approved);
    event BasketMintingPauseChanged(address indexed basket, bool paused);
    event BasketCreated(
        address indexed basket,
        address indexed creator,
        string name,
        string symbol,
        address[] assets,
        uint16[] weightsBps
    );

    constructor(address[] memory approvedTokens) Ownable(msg.sender) {
        for (uint256 i = 0; i < approvedTokens.length; i++) {
            _setApprovedStockToken(approvedTokens[i], true);
        }
    }

    function setApprovedStockToken(address token, bool approved) external onlyOwner {
        _setApprovedStockToken(token, approved);
    }

    function pauseCreation() external onlyOwner {
        _pause();
    }

    function unpauseCreation() external onlyOwner {
        _unpause();
    }

    function setBasketMintingPaused(address basket, bool paused) external onlyOwner {
        if (!isBasket[basket]) revert UnknownBasket(basket);

        BasketVault(basket).setMintingPaused(paused);
        emit BasketMintingPauseChanged(basket, paused);
    }

    function createBasket(
        string calldata name_,
        string calldata symbol_,
        address[] calldata assets_,
        uint16[] calldata weightsBps_
    ) external whenNotPaused returns (address basket) {
        _validateBasketInput(name_, symbol_, assets_, weightsBps_);
        bytes32 tickerKey = _tickerKey(symbol_);
        address existingBasket = _basketByTickerKey[tickerKey];

        if (existingBasket != address(0)) revert TickerAlreadyUsed(symbol_, existingBasket);

        basket = address(new BasketVault(name_, symbol_, msg.sender, address(this), assets_, weightsBps_));
        isBasket[basket] = true;
        _basketByTickerKey[tickerKey] = basket;
        _baskets.push(basket);
        _creatorBaskets[msg.sender].push(basket);

        emit BasketCreated(basket, msg.sender, name_, symbol_, assets_, weightsBps_);
    }

    function getBaskets() external view returns (address[] memory) {
        return _baskets;
    }

    function getCreatorBaskets(address creator) external view returns (address[] memory) {
        return _creatorBaskets[creator];
    }

    function basketCount() external view returns (uint256) {
        return _baskets.length;
    }

    function getBasketByTicker(string calldata symbol_) external view returns (address) {
        return _basketByTickerKey[_tickerKey(symbol_)];
    }

    function _setApprovedStockToken(address token, bool approved) internal {
        if (token == address(0)) revert UnapprovedStockToken(token);

        approvedStockToken[token] = approved;
        emit StockTokenApprovalChanged(token, approved);
    }

    function _validateBasketInput(
        string calldata name_,
        string calldata symbol_,
        address[] calldata assets_,
        uint16[] calldata weightsBps_
    ) internal view {
        if (bytes(name_).length == 0) revert EmptyName();
        if (bytes(symbol_).length == 0) revert EmptySymbol();
        if (assets_.length == 0) revert EmptyAssets();
        if (assets_.length > MAX_ASSETS) revert TooManyAssets();
        if (assets_.length != weightsBps_.length) revert AssetWeightLengthMismatch();

        uint256 totalWeight;

        for (uint256 i = 0; i < assets_.length; i++) {
            address asset = assets_[i];
            uint16 weight = weightsBps_[i];

            if (!approvedStockToken[asset]) revert UnapprovedStockToken(asset);
            if (weight == 0) revert InvalidWeight();

            for (uint256 j = 0; j < i; j++) {
                if (assets_[j] == asset) revert DuplicateAsset(asset);
            }

            totalWeight += weight;
        }

        if (totalWeight != TOTAL_WEIGHT_BPS) revert InvalidTotalWeight(totalWeight);
    }

    function _tickerKey(string calldata symbol_) internal pure returns (bytes32) {
        bytes memory normalized = bytes(symbol_);

        for (uint256 i = 0; i < normalized.length; i++) {
            uint8 character = uint8(normalized[i]);

            if (character >= 65 && character <= 90) {
                normalized[i] = bytes1(character + 32);
            }
        }

        return keccak256(normalized);
    }
}
