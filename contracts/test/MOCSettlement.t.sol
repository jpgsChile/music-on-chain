// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MOCSettlement} from "../src/MOCSettlement.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {RevertingToken, SilentFailToken} from "../src/mocks/NonStandardTokens.sol";
import {Hevm} from "./helpers/Hevm.sol";

/// @dev Foundry tests for MOCSettlement V1. Also covered by Vitest bytecode tests.
contract MOCSettlementTest {
    Hevm internal constant vm = Hevm(address(uint160(uint256(keccak256("hevm cheat code")))));

    MOCSettlement internal settlement;
    MockUSDC internal usdc;

    address internal executor = address(0xA11CE);
    address internal beneficiary = address(0xBEEF);
    address internal stranger = address(0xBAD);

    bytes32 internal intentRef = keccak256(bytes("intent:entitlement-1"));
    uint256 internal amount = 1_000_000; // 1 USDC (6 decimals)

    function setUp() public {
        usdc = new MockUSDC();
        settlement = new MOCSettlement(executor, address(usdc));
        usdc.mint(executor, 10_000_000);
        vm.prank(executor);
        usdc.approve(address(settlement), type(uint256).max);
    }

    function test_happyPath() public {
        vm.prank(executor);
        settlement.settle(intentRef, beneficiary, amount, address(usdc));
        require(usdc.balanceOf(beneficiary) == amount, "paid");
        require(settlement.executed(intentRef), "marked");
    }

    function test_replayReverts() public {
        vm.prank(executor);
        settlement.settle(intentRef, beneficiary, amount, address(usdc));
        vm.expectRevert(MOCSettlement.AlreadyExecuted.selector);
        vm.prank(executor);
        settlement.settle(intentRef, beneficiary, amount, address(usdc));
    }

    function test_unauthorizedReverts() public {
        vm.expectRevert(MOCSettlement.Unauthorized.selector);
        vm.prank(stranger);
        settlement.settle(intentRef, beneficiary, amount, address(usdc));
    }

    function test_zeroBeneficiaryReverts() public {
        vm.expectRevert(MOCSettlement.ZeroBeneficiary.selector);
        vm.prank(executor);
        settlement.settle(intentRef, address(0), amount, address(usdc));
    }

    function test_zeroAmountReverts() public {
        vm.expectRevert(MOCSettlement.ZeroAmount.selector);
        vm.prank(executor);
        settlement.settle(intentRef, beneficiary, 0, address(usdc));
    }

    function test_invalidIntentReverts() public {
        vm.expectRevert(MOCSettlement.InvalidIntent.selector);
        vm.prank(executor);
        settlement.settle(bytes32(0), beneficiary, amount, address(usdc));
    }

    function test_wrongAssetReverts() public {
        MockUSDC other = new MockUSDC();
        vm.expectRevert(MOCSettlement.WrongAsset.selector);
        vm.prank(executor);
        settlement.settle(intentRef, beneficiary, amount, address(other));
    }

    function test_insufficientAllowanceReverts() public {
        vm.prank(executor);
        usdc.approve(address(settlement), 0);
        vm.expectRevert(MOCSettlement.TransferFailed.selector);
        vm.prank(executor);
        settlement.settle(intentRef, beneficiary, amount, address(usdc));
        require(!settlement.executed(intentRef), "not marked");
    }

    function test_insufficientBalanceReverts() public {
        vm.expectRevert(MOCSettlement.TransferFailed.selector);
        vm.prank(executor);
        settlement.settle(intentRef, beneficiary, 50_000_000, address(usdc));
        require(!settlement.executed(intentRef), "not marked");
    }

    function test_revertingTokenDoesNotConfirm() public {
        RevertingToken bad = new RevertingToken();
        MOCSettlement other = new MOCSettlement(executor, address(bad));
        vm.expectRevert(MOCSettlement.TransferFailed.selector);
        vm.prank(executor);
        other.settle(intentRef, beneficiary, amount, address(bad));
        require(!other.executed(intentRef), "not marked");
    }

    function test_silentFailTokenDoesNotConfirm() public {
        SilentFailToken bad = new SilentFailToken();
        MOCSettlement other = new MOCSettlement(executor, address(bad));
        vm.expectRevert(MOCSettlement.TransferFailed.selector);
        vm.prank(executor);
        other.settle(intentRef, beneficiary, amount, address(bad));
        require(!other.executed(intentRef), "not marked");
    }

    function test_zeroExecutorConstructorReverts() public {
        vm.expectRevert(MOCSettlement.ZeroExecutor.selector);
        new MOCSettlement(address(0), address(usdc));
    }

    function test_zeroAssetConstructorReverts() public {
        vm.expectRevert(MOCSettlement.ZeroAsset.selector);
        new MOCSettlement(executor, address(0));
    }
}
