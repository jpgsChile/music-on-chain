// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Test token that always reverts on transferFrom.
contract RevertingToken {
    uint8 public constant decimals = 6;
    string public constant symbol = "USDC";

    function transferFrom(address, address, uint256) external pure returns (bool) {
        revert("REVERTING_TOKEN");
    }
}

/// @notice Test token that returns false instead of reverting.
contract SilentFailToken {
    uint8 public constant decimals = 6;
    string public constant symbol = "USDC";

    function transferFrom(address, address, uint256) external pure returns (bool) {
        return false;
    }
}
