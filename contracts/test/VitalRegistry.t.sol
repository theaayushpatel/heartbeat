// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {VitalRegistry} from "../src/VitalRegistry.sol";
import {IVitalRegistry} from "../src/interfaces/IVitalRegistry.sol";

/**
 * @title VitalRegistryTest
 * @notice Test suite for VitalRegistry contract
 */
contract VitalRegistryTest is Test {
    VitalRegistry public registry;
    
    address public admin = address(1);
    address public guardian = address(2);
    address public protocol1 = address(3);
    address public protocol2 = address(4);
    address public token = address(5);

    event ThreatDetected(
        uint256 indexed eventId,
        address indexed protocol,
        IVitalRegistry.RiskLevel riskLevel,
        IVitalRegistry.ActionType actionType,
        uint256 timestamp
    );

    event WithdrawalRecorded(
        uint256 indexed eventId,
        address indexed protocol,
        address token,
        uint256 amount
    );

    function setUp() public {
        vm.startPrank(admin);
        registry = new VitalRegistry();
        registry.grantRole(registry.GUARDIAN_ROLE(), guardian);
        vm.stopPrank();
    }

    function testConstructor() public view {
        assertEq(registry.eventCount(), 0);
        assertTrue(registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), admin));
    }

    function testRecordThreatCritical() public {
        uint256 amount = 100 ether;
        string memory pattern = "Cardiac arrest / Reentrancy vulnerability detected";
        
        vm.prank(guardian);
        vm.expectEmit(true, true, false, true);
        emit ThreatDetected(1, protocol1, IVitalRegistry.RiskLevel.CRITICAL, IVitalRegistry.ActionType.WITHDRAWAL, block.timestamp);
        
        uint256 eventId = registry.recordThreat(
            protocol1,
            token,
            amount,
            IVitalRegistry.RiskLevel.CRITICAL,
            IVitalRegistry.ActionType.WITHDRAWAL,
            pattern
        );
        
        assertEq(eventId, 1);
        assertEq(registry.eventCount(), 1);
    }

    function testRecordThreatRevertsUnauthorized() public {
        vm.prank(address(0x999));
        vm.expectRevert();
        registry.recordThreat(
            protocol1,
            token,
            100 ether,
            IVitalRegistry.RiskLevel.CRITICAL,
            IVitalRegistry.ActionType.WITHDRAWAL,
            "test"
        );
    }

    function testGetEvent() public {
        vm.prank(guardian);
        uint256 eventId = registry.recordThreat(
            protocol1,
            token,
            100 ether,
            IVitalRegistry.RiskLevel.HIGH,
            IVitalRegistry.ActionType.WITHDRAWAL,
            "Severe arrhythmia / Flash loan attack pattern"
        );
        
        VitalRegistry.VitalEvent memory vitalEvent = registry.getEvent(eventId);
        
        assertEq(vitalEvent.eventId, eventId);
        assertEq(vitalEvent.protocol, protocol1);
        assertEq(vitalEvent.token, token);
        assertEq(vitalEvent.amount, 100 ether);
        assertTrue(vitalEvent.riskLevel == IVitalRegistry.RiskLevel.HIGH);
        assertTrue(vitalEvent.actionType == IVitalRegistry.ActionType.WITHDRAWAL);
        assertEq(vitalEvent.exploitPattern, "Severe arrhythmia / Flash loan attack pattern");
    }

    function testGetEventRevertsNotFound() public {
        vm.expectRevert(VitalRegistry.EventNotFound.selector);
        registry.getEvent(999);
    }

    function testGetProtocolEvents() public {
        vm.startPrank(guardian);
        
        // Record multiple events for protocol1
        registry.recordThreat(protocol1, token, 100 ether, IVitalRegistry.RiskLevel.CRITICAL, IVitalRegistry.ActionType.WITHDRAWAL, "exploit1");
        registry.recordThreat(protocol2, token, 50 ether, IVitalRegistry.RiskLevel.HIGH, IVitalRegistry.ActionType.WITHDRAWAL, "exploit2");
        registry.recordThreat(protocol1, token, 75 ether, IVitalRegistry.RiskLevel.MEDIUM, IVitalRegistry.ActionType.ALERT, "exploit3");
        
        vm.stopPrank();
        
        uint256[] memory events = registry.getProtocolEvents(protocol1);
        assertEq(events.length, 2);
        assertEq(events[0], 1);
        assertEq(events[1], 3);
    }

    function testGetEventsByRiskLevel() public {
        vm.startPrank(guardian);
        
        registry.recordThreat(protocol1, token, 100 ether, IVitalRegistry.RiskLevel.CRITICAL, IVitalRegistry.ActionType.WITHDRAWAL, "critical1");
        registry.recordThreat(protocol2, token, 50 ether, IVitalRegistry.RiskLevel.HIGH, IVitalRegistry.ActionType.WITHDRAWAL, "high1");
        registry.recordThreat(protocol1, token, 200 ether, IVitalRegistry.RiskLevel.CRITICAL, IVitalRegistry.ActionType.WITHDRAWAL, "critical2");
        
        vm.stopPrank();
        
        uint256[] memory criticalEvents = registry.getEventsByRiskLevel(IVitalRegistry.RiskLevel.CRITICAL);
        assertEq(criticalEvents.length, 2);
        assertEq(criticalEvents[0], 1);
        assertEq(criticalEvents[1], 3);
        
        uint256[] memory highEvents = registry.getEventsByRiskLevel(IVitalRegistry.RiskLevel.HIGH);
        assertEq(highEvents.length, 1);
        assertEq(highEvents[0], 2);
    }

    function testGetRecentEvents() public {
        vm.startPrank(guardian);
        
        // Record 5 events
        for (uint256 i = 0; i < 5; i++) {
            registry.recordThreat(
                protocol1,
                token,
                100 ether,
                IVitalRegistry.RiskLevel.CRITICAL,
                IVitalRegistry.ActionType.WITHDRAWAL,
                string(abi.encodePacked("Exploit ", vm.toString(i)))
            );
        }
        
        vm.stopPrank();
        
        // Get last 3 events
        VitalRegistry.VitalEvent[] memory recent = registry.getRecentEvents(0, 3);
        assertEq(recent.length, 3);
        assertEq(recent[0].eventId, 5); // Most recent first
        assertEq(recent[1].eventId, 4);
        assertEq(recent[2].eventId, 3);
    }

    function testGetRecentEventsEmpty() public view {
        VitalRegistry.VitalEvent[] memory recent = registry.getRecentEvents(0, 10);
        assertEq(recent.length, 0);
    }

    function testGetRecentEventsPagination() public {
        vm.startPrank(guardian);
        
        // Record 10 events
        for (uint256 i = 0; i < 10; i++) {
            registry.recordThreat(
                protocol1,
                token,
                100 ether,
                IVitalRegistry.RiskLevel.CRITICAL,
                IVitalRegistry.ActionType.WITHDRAWAL,
                "Exploit"
            );
        }
        
        vm.stopPrank();
        
        // Get events 3-6 (offset 3, limit 3)
        VitalRegistry.VitalEvent[] memory page = registry.getRecentEvents(3, 3);
        assertEq(page.length, 3);
        assertEq(page[0].eventId, 7);
        assertEq(page[1].eventId, 6);
        assertEq(page[2].eventId, 5);
    }

    function testGetTotalEvents() public {
        assertEq(registry.getTotalEvents(), 0);
        
        vm.startPrank(guardian);
        registry.recordThreat(protocol1, token, 100 ether, IVitalRegistry.RiskLevel.CRITICAL, IVitalRegistry.ActionType.WITHDRAWAL, "test");
        vm.stopPrank();
        
        assertEq(registry.getTotalEvents(), 1);
    }

    function testMultipleActionTypes() public {
        vm.startPrank(guardian);
        
        registry.recordThreat(protocol1, token, 0, IVitalRegistry.RiskLevel.LOW, IVitalRegistry.ActionType.ALERT, "Low risk detected");
        registry.recordThreat(protocol1, token, 0, IVitalRegistry.RiskLevel.MEDIUM, IVitalRegistry.ActionType.GOVERNANCE_PROPOSAL, "Medium risk");
        registry.recordThreat(protocol1, token, 100 ether, IVitalRegistry.RiskLevel.HIGH, IVitalRegistry.ActionType.WITHDRAWAL, "High risk");
        
        vm.stopPrank();
        
        VitalRegistry.VitalEvent memory event1 = registry.getEvent(1);
        VitalRegistry.VitalEvent memory event2 = registry.getEvent(2);
        VitalRegistry.VitalEvent memory event3 = registry.getEvent(3);
        
        assertTrue(event1.actionType == IVitalRegistry.ActionType.ALERT);
        assertTrue(event2.actionType == IVitalRegistry.ActionType.GOVERNANCE_PROPOSAL);
        assertTrue(event3.actionType == IVitalRegistry.ActionType.WITHDRAWAL);
        
        assertEq(event1.amount, 0);
        assertEq(event2.amount, 0);
        assertEq(event3.amount, 100 ether);
    }

    function testWithdrawalRecordedEvent() public {
        vm.prank(guardian);
        vm.expectEmit(true, true, false, true);
        emit WithdrawalRecorded(1, protocol1, token, 100 ether);
        
        registry.recordThreat(
            protocol1,
            token,
            100 ether,
            IVitalRegistry.RiskLevel.CRITICAL,
            IVitalRegistry.ActionType.WITHDRAWAL,
            "Critical threat"
        );
    }

    function testThreatHash() public {
        vm.prank(guardian);
        uint256 eventId = registry.recordThreat(
            protocol1,
            token,
            100 ether,
            IVitalRegistry.RiskLevel.CRITICAL,
            IVitalRegistry.ActionType.WITHDRAWAL,
            "test"
        );
        
        VitalRegistry.VitalEvent memory vitalEvent = registry.getEvent(eventId);
        assertFalse(vitalEvent.threatHash == bytes32(0));
    }
}
