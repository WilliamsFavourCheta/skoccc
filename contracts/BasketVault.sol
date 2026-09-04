// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract BasketVault is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint16 public constant TOTAL_WEIGHT_BPS = 10_000;

    address public immutable creator;
    address public immutable emergencyAdmin;
    address[] private _underlyingAssets;
    uint16[] private _weightsBps;
    bool public mintingPaused;

    error InvalidAmount();
    error InvalidComposition();
    error InvalidEmergencyAdmin();
    error MintingPaused();
    error UnauthorizedEmergencyAdmin();
    error InsufficientUnderlyingReceived(address token, uint256 expected, uint256 received);

    event BasketMintingPauseChanged(bool paused);
    event BasketMinted(address indexed account, uint256 shareAmount);
    event BasketRedeemed(address indexed account, uint256 shareAmount);

    modifier onlyEmergencyAdmin() {
        if (msg.sender != emergencyAdmin) revert UnauthorizedEmergencyAdmin();
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        address creator_,
        address emergencyAdmin_,
        address[] memory underlyingAssets_,
        uint16[] memory weightsBps_
    ) ERC20(name_, symbol_) {
        if (
            creator_ == address(0) ||
            emergencyAdmin_ == address(0) ||
            underlyingAssets_.length == 0 ||
            underlyingAssets_.length != weightsBps_.length
        ) {
            if (emergencyAdmin_ == address(0)) revert InvalidEmergencyAdmin();
            revert InvalidComposition();
        }

        uint256 totalWeight;

        for (uint256 i = 0; i < underlyingAssets_.length; i++) {
            if (underlyingAssets_[i] == address(0) || weightsBps_[i] == 0) {
                revert InvalidComposition();
            }

            totalWeight += weightsBps_[i];
            _underlyingAssets.push(underlyingAssets_[i]);
            _weightsBps.push(weightsBps_[i]);
        }

        if (totalWeight != TOTAL_WEIGHT_BPS) revert InvalidComposition();

        creator = creator_;
        emergencyAdmin = emergencyAdmin_;
    }

    function setMintingPaused(bool paused) external onlyEmergencyAdmin {
        mintingPaused = paused;
        emit BasketMintingPauseChanged(paused);
    }

    function mint(uint256 shareAmount) external nonReentrant {
        if (shareAmount == 0) revert InvalidAmount();
        if (mintingPaused) revert MintingPaused();

        for (uint256 i = 0; i < _underlyingAssets.length; i++) {
            address underlying = _underlyingAssets[i];
            uint256 requiredAmount = requiredUnderlyingAmount(shareAmount, i);
            uint256 balanceBefore = IERC20(underlying).balanceOf(address(this));
            IERC20(underlying).safeTransferFrom(msg.sender, address(this), requiredAmount);
            uint256 receivedAmount = IERC20(underlying).balanceOf(address(this)) - balanceBefore;

            if (receivedAmount < requiredAmount) {
                revert InsufficientUnderlyingReceived(underlying, requiredAmount, receivedAmount);
            }
        }

        _mint(msg.sender, shareAmount);

        emit BasketMinted(msg.sender, shareAmount);
    }

    function redeem(uint256 shareAmount) external nonReentrant {
        if (shareAmount == 0) revert InvalidAmount();

        _burn(msg.sender, shareAmount);

        for (uint256 i = 0; i < _underlyingAssets.length; i++) {
            uint256 returnedAmount = Math.mulDiv(shareAmount, _weightsBps[i], TOTAL_WEIGHT_BPS);
            IERC20(_underlyingAssets[i]).safeTransfer(msg.sender, returnedAmount);
        }

        emit BasketRedeemed(msg.sender, shareAmount);
    }

    function getComposition()
        external
        view
        returns (address[] memory assets, uint16[] memory weightsBps)
    {
        return (_underlyingAssets, _weightsBps);
    }

    function getUnderlyingAssets() external view returns (address[] memory) {
        return _underlyingAssets;
    }

    function getWeightsBps() external view returns (uint16[] memory) {
        return _weightsBps;
    }

    function getReserves() external view returns (uint256[] memory reserves) {
        reserves = new uint256[](_underlyingAssets.length);

        for (uint256 i = 0; i < _underlyingAssets.length; i++) {
            reserves[i] = IERC20(_underlyingAssets[i]).balanceOf(address(this));
        }
    }

    function underlyingAssetCount() external view returns (uint256) {
        return _underlyingAssets.length;
    }

    function underlyingAt(uint256 index) external view returns (address asset, uint16 weightBps) {
        return (_underlyingAssets[index], _weightsBps[index]);
    }

    function requiredUnderlyingAmount(uint256 shareAmount, uint256 index) public view returns (uint256) {
        return Math.mulDiv(shareAmount, _weightsBps[index], TOTAL_WEIGHT_BPS, Math.Rounding.Ceil);
    }
}
