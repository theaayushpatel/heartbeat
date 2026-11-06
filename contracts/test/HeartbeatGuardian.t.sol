// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {HeartbeatGuardian} from "../src/HeartbeatGuardian.sol";
import {VitalRegistry} from "../src/VitalRegistry.sol";
import {IVitalRegistry} from "../src/interfaces/IVitalRegistry.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockERC20 is IERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;

    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
        _totalSupply += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        _allowances[from][msg.sender] -= amount;
        _balances[from] -= amount;
        _balances[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        return true;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }
}

/**
 * @title HeartbeatGuardianTest
 * @notice Test suite for HeartbeatGuardian contract
 */
contract HeartbeatGuardianTest is Test {
    HeartbeatGuardian public guardian;
    VitalRegistry public vitalRegistry;
    MockERC20 public token;
    
    address public admin = address(1);
    address public creWorkflow = address(2);
    address public safeAddress = address(3);
    address public protocol = address(4);
    
    uint256 constant COOLDOWN = 5 minutes;
    uint256 constant MAX_WITHDRAWAL_BPS = 10000; // 100%

    event EmergencyWithdrawal(
        address indexed protocol,
        address indexed token,
        uint256 amount,
        HeartbeatGuardian.RiskLevel riskLevel,
        uint256 timestamp
    );

    function setUp() public {
        vm.startPrank(admin);
        
        // Deploy VitalRegistry first
        vitalRegistry = new VitalRegistry();
        
        // Deploy HeartbeatGuardian with VitalRegistry
        guardian = new HeartbeatGuardian(address(vitalRegistry), safeAddress, COOLDOWN, MAX_WITHDRAWAL_BPS);
        token = new MockERC20();
        
        // Grant roles
        guardian.grantRole(guardian.CRE_WORKFLOW_ROLE(), creWorkflow);
        vitalRegistry.grantRole(vitalRegistry.GUARDIAN_ROLE(), address(guardian));
        
        // Setup protocol with tokens
        token.mint(protocol, 1000 ether);
        
        vm.stopPrank();
    }

    function testConstructor() public view {
        assertEq(guardian.safeAddress(), safeAddress);
        assertEq(guardian.cooldownPeriod(), COOLDOWN);
        assertEq(guardian.maxWithdrawalBps(), MAX_WITHDRAWAL_BPS);
        assertEq(address(guardian.vitalRegistry()), address(vitalRegistry));
        assertEq(guardian.riskRegistry(), address(vitalRegistry));
    }

    function testConstructorRevertsInvalidSafeAddress() public {
        vm.expectRevert(HeartbeatGuardian.InvalidSafeAddress.selector);
        new HeartbeatGuardian(address(vitalRegistry), address(0), COOLDOWN, MAX_WITHDRAWAL_BPS);
    }

    function testConstructorRevertsInvalidWithdrawalPercentage() public {
        vm.expectRevert(HeartbeatGuardian.InvalidWithdrawalPercentage.selector);
        new HeartbeatGuardian(address(vitalRegistry), safeAddress, COOLDOWN, 10001); // Over 100%
    }

    function testEmergencyWithdrawCritical() public {
        uint256 amount = 100 ether;
        
        // Protocol approves Guardian
        vm.prank(protocol);
        token.approve(address(guardian), amount);
        
        // CRE workflow executes emergency withdrawal
        vm.prank(creWorkflow);
        vm.expectEmit(true, true, false, true);
        emit EmergencyWithdrawal(protocol, address(token), amount, HeartbeatGuardian.RiskLevel.CRITICAL, block.timestamp);
        
        guardian.emergencyWithdraw(
            protocol,
            address(token),
            amount,
            HeartbeatGuardian.RiskLevel.CRITICAL
        );
        
        // Verify funds moved to safe
        assertEq(token.balanceOf(safeAddress), amount);
        assertEq(token.balanceOf(protocol), 900 ether);
    }

    function testEmergencyWithdrawRevertsUnauthorized() public {
        uint256 amount = 100 ether;
        
        vm.prank(address(0x999)); // Unauthorized caller
        vm.expectRevert();
        guardian.emergencyWithdraw(
            protocol,
            address(token),
            amount,
            HeartbeatGuardian.RiskLevel.CRITICAL
        );
    }

    function testEmergencyWithdrawRevertsCooldownNotElapsed() public {
        uint256 amount = 100 ether;
        
        vm.prank(protocol);
        token.approve(address(guardian), 200 ether);
        
        // First withdrawal succeeds
        vm.prank(creWorkflow);
        guardian.emergencyWithdraw(
            protocol,
            address(token),
            amount,
            HeartbeatGuardian.RiskLevel.CRITICAL
        );
        
        // Second withdrawal immediately after should revert
        vm.prank(creWorkflow);
        vm.expectRevert(HeartbeatGuardian.CooldownNotElapsed.selector);
        guardian.emergencyWithdraw(
            protocol,
            address(token),
            amount,
            HeartbeatGuardian.RiskLevel.CRITICAL
        );
        
        // Advance time past cooldown
        vm.warp(block.timestamp + COOLDOWN + 1);
        
        // Second withdrawal should now succeed
        vm.prank(creWorkflow);
        guardian.emergencyWithdraw(
            protocol,
            address(token),
            amount,
            HeartbeatGuardian.RiskLevel.CRITICAL
        );
        
        assertEq(token.balanceOf(safeAddress), 200 ether);
    }

    function testEmergencyWithdrawRevertsExceedsLimit() public {
        uint256 limit = 50 ether;
        uint256 amount = 100 ether;
        
        // Set protocol limit
        vm.prank(admin);
        guardian.setProtocolLimit(protocol, limit);
        
        vm.prank(protocol);
        token.approve(address(guardian), amount);
        
        // Withdrawal exceeding limit should revert
        vm.prank(creWorkflow);
        vm.expectRevert(HeartbeatGuardian.ExceedsWithdrawalLimit.selector);
        guardian.emergencyWithdraw(
            protocol,
            address(token),
            amount,
            HeartbeatGuardian.RiskLevel.CRITICAL
        );
    }

    function testSetProtocolLimit() public {
        uint256 limit = 500 ether;
        
        vm.prank(admin);
        guardian.setProtocolLimit(protocol, limit);
        
        assertEq(guardian.protocolWithdrawalLimits(protocol), limit);
    }

    function testSetCooldownPeriod() public {
        uint256 newCooldown = 10 minutes;
        
        vm.prank(admin);
        guardian.setCooldownPeriod(newCooldown);
        
        assertEq(guardian.cooldownPeriod(), newCooldown);
    }

    function testSetCooldownRevertsInvalidCooldown() public {
        uint256 invalidCooldown = 8 days; // Exceeds 7 days max
        
        vm.prank(admin);
        vm.expectRevert(HeartbeatGuardian.InvalidCooldown.selector);
        guardian.setCooldownPeriod(invalidCooldown);
    }

    function testSetMaxWithdrawalBps() public {
        uint256 newMaxBps = 5000; // 50%
        
        vm.prank(admin);
        guardian.setMaxWithdrawalBps(newMaxBps);
        
        assertEq(guardian.maxWithdrawalBps(), newMaxBps);
    }

    function testSetMaxWithdrawalBpsRevertsInvalid() public {
        uint256 invalidBps = 10001; // Exceeds 100%
        
        vm.prank(admin);
        vm.expectRevert(HeartbeatGuardian.InvalidWithdrawalPercentage.selector);
        guardian.setMaxWithdrawalBps(invalidBps);
    }

    function testDifferentRiskLevels() public pure {
        HeartbeatGuardian.RiskLevel level;
        level = HeartbeatGuardian.RiskLevel.LOW;
        level = HeartbeatGuardian.RiskLevel.MEDIUM;
        level = HeartbeatGuardian.RiskLevel.HIGH;
        level = HeartbeatGuardian.RiskLevel.CRITICAL;
        level;
    }

    function testEmergencyWithdrawMediumNoTransfer() public {
        uint256 amount = 100 ether;

        vm.prank(protocol);
        token.approve(address(guardian), type(uint256).max);

        uint256 protocolBefore = token.balanceOf(protocol);
        uint256 safeBefore     = token.balanceOf(safeAddress);

        vm.prank(creWorkflow);
        guardian.emergencyWithdraw(protocol, address(token), amount, HeartbeatGuardian.RiskLevel.MEDIUM);

        // No tokens should move — MEDIUM = alert only
        assertEq(token.balanceOf(protocol),     protocolBefore);
        assertEq(token.balanceOf(safeAddress),  safeBefore);

        // Cooldown must NOT be stamped (no withdrawal occurred)
        assertEq(guardian.lastWithdrawal(protocol), 0);

        // A MEDIUM ALERT event should still appear in The Cardiogram
        VitalRegistry.VitalEvent memory evt = vitalRegistry.getEvent(1);
        assertEq(uint8(evt.riskLevel),  uint8(IVitalRegistry.RiskLevel.MEDIUM));
        assertEq(uint8(evt.actionType), uint8(IVitalRegistry.ActionType.ALERT));
        assertEq(evt.amount, 0);
    }

    function testEmergencyWithdrawLowNoTransfer() public {
        uint256 amount = 100 ether;

        vm.prank(protocol);
        token.approve(address(guardian), type(uint256).max);

        uint256 protocolBefore = token.balanceOf(protocol);

        vm.prank(creWorkflow);
        guardian.emergencyWithdraw(protocol, address(token), amount, HeartbeatGuardian.RiskLevel.LOW);

        // No tokens should move, cooldown not set
        assertEq(token.balanceOf(protocol), protocolBefore);
        assertEq(guardian.lastWithdrawal(protocol), 0);
    }

    function testEmergencyWithdrawHighTransfers80Percent() public {
        uint256 amount = 100 ether;

        vm.prank(protocol);
        token.approve(address(guardian), amount);

        vm.prank(creWorkflow);
        guardian.emergencyWithdraw(protocol, address(token), amount, HeartbeatGuardian.RiskLevel.HIGH);

        // HIGH = 80 %
        assertEq(token.balanceOf(safeAddress), 80 ether);
        assertEq(token.balanceOf(protocol),    920 ether); // 1000 - 80
        assertTrue(guardian.lastWithdrawal(protocol) > 0);
    }

    function testEmergencyWithdrawMediumDoesNotBlockSubsequentWithdrawal() public {
        uint256 amount = 100 ether;

        vm.prank(protocol);
        token.approve(address(guardian), type(uint256).max);

        // MEDIUM call — no cooldown should be set
        vm.prank(creWorkflow);
        guardian.emergencyWithdraw(protocol, address(token), amount, HeartbeatGuardian.RiskLevel.MEDIUM);
        assertEq(guardian.lastWithdrawal(protocol), 0);

        // Immediate CRITICAL call should succeed (cooldown not active)
        vm.prank(creWorkflow);
        guardian.emergencyWithdraw(protocol, address(token), amount, HeartbeatGuardian.RiskLevel.CRITICAL);
        assertEq(token.balanceOf(safeAddress), amount);
    }

    function testEmergencyWithdrawAmountRoundingGuard() public {
        uint256 tinyAmount = 1; // 1 wei — rounds to 0 after 80% bps math

        vm.prank(protocol);
        token.approve(address(guardian), tinyAmount);

        vm.prank(creWorkflow);
        guardian.emergencyWithdraw(protocol, address(token), tinyAmount, HeartbeatGuardian.RiskLevel.HIGH);

        // The rounding guard kicks in: 1 wei is transferred whole rather than 0
        assertEq(token.balanceOf(safeAddress), tinyAmount);
    }

    function testEmergencyWithdrawCapsAtMaxWithdrawalBps() public {
        uint256 amount = 1000;
        uint256 cappedBps = 5000; // lower than CRITICAL's 10000 or HIGH's 8000

        // Admin lowers the cap before the withdrawal
        vm.prank(admin);
        guardian.setMaxWithdrawalBps(cappedBps);

        vm.prank(protocol);
        token.approve(address(guardian), amount);

        vm.prank(creWorkflow);
        guardian.emergencyWithdraw(protocol, address(token), amount, HeartbeatGuardian.RiskLevel.CRITICAL);

        // Only cappedBps (50%) should be withdrawn, not the full 100%
        assertEq(token.balanceOf(safeAddress), (amount * cappedBps) / 10000);
    }
}
