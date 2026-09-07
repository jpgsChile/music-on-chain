// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IMOCSettlement
/// @notice V1 interface for executing a MOC SettlementIntent on an EVM chain.
/// @dev The contract does not know Actor, Rights, Revenue, or EconomicEntitlement.
interface IMOCSettlement {
    function VERSION() external view returns (string memory);

    function VERSION_NUMBER() external view returns (uint8);

    function executor() external view returns (address);

    function asset() external view returns (address);

    function executed(bytes32 intentRef) external view returns (bool);

    /// @notice Execute a domain-authorized settlement instruction exactly once.
    /// @param intentRef keccak256(utf8(SettlementIntent.intentRef)) — not a tx hash.
    /// @param beneficiary Destination wallet capability. Not an Actor identity.
    /// @param amount Token minor units. Not a float.
    /// @param token Must equal the immutable asset (USDC).
    function settle(
        bytes32 intentRef,
        address beneficiary,
        uint256 amount,
        address token
    ) external;

    event SettlementExecuted(
        bytes32 indexed intentRef,
        address indexed beneficiary,
        address indexed asset,
        uint256 amount
    );
}
