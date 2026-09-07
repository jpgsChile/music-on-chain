// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Minimal Foundry cheatcode surface so tests do not require a forge-std submodule.
interface Hevm {
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function expectRevert() external;
    function expectRevert(bytes4) external;
    function expectRevert(bytes memory) external;
    function deal(address, uint256) external;
    function addr(uint256 privateKey) external returns (address);
}

Hevm constant VM = Hevm(address(uint160(uint256(keccak256("hevm cheat code")))));
