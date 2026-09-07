// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IMOCSettlement} from "./interfaces/IMOCSettlement.sol";

/// @title MOCSettlement
/// @notice MOC Settlement Contract V1 — executes an authorized USDC settlement once.
/// @dev Blockchain executes and evidences settlement. It does not decide who is owed.
contract MOCSettlement is IMOCSettlement {
    string public constant VERSION = "MOC-SETTLEMENT-V1";
    uint8 public constant VERSION_NUMBER = 1;

    address public immutable override executor;
    address public immutable override asset;

    mapping(bytes32 => bool) public override executed;

    uint256 private _locked = 1;

    error Unauthorized();
    error AlreadyExecuted();
    error ZeroBeneficiary();
    error ZeroAmount();
    error InvalidIntent();
    error WrongAsset();
    error TransferFailed();
    error ZeroAsset();
    error ZeroExecutor();

    modifier nonReentrant() {
        if (_locked != 1) revert TransferFailed();
        _locked = 2;
        _;
        _locked = 1;
    }

    constructor(address executor_, address asset_) {
        if (executor_ == address(0)) revert ZeroExecutor();
        if (asset_ == address(0)) revert ZeroAsset();
        executor = executor_;
        asset = asset_;
    }

    /// @inheritdoc IMOCSettlement
    function settle(
        bytes32 intentRef,
        address beneficiary,
        uint256 amount,
        address token
    ) external nonReentrant {
        if (msg.sender != executor) revert Unauthorized();
        if (intentRef == bytes32(0)) revert InvalidIntent();
        if (beneficiary == address(0)) revert ZeroBeneficiary();
        if (amount == 0) revert ZeroAmount();
        if (token != asset) revert WrongAsset();
        if (executed[intentRef]) revert AlreadyExecuted();

        // Effects before interaction: replay protection is on-chain, not a DB flag.
        executed[intentRef] = true;

        _safeTransferFrom(token, msg.sender, beneficiary, amount);

        emit SettlementExecuted(intentRef, beneficiary, token, amount);
    }

    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 amount
    ) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(0x23b872dd, from, to, amount)
        );
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert TransferFailed();
        }
    }
}
