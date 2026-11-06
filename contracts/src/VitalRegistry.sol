// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IVitalRegistry} from "./interfaces/IVitalRegistry.sol";

/**
 * @title VitalRegistry
 * @notice The Cardiogram - immutable record of all protocol vitals, anomalies, and emergency interventions
 * @dev Stores risk and resuscitation events onchain for transparency and auditability
 */
contract VitalRegistry is AccessControl, IVitalRegistry {
    /// @notice Role for HeartbeatGuardian contract to record events
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    /// @notice A Cardiogram entry - permanent record of a vital anomaly or rescue action
    struct VitalEvent {
        uint256 eventId;
        address protocol;
        address token;
        uint256 amount;
        RiskLevel riskLevel;
        ActionType actionType;
        uint256 timestamp;
        bytes32 threatHash;      // Hash of threat details for reference
        string exploitPattern;   // Diagnostic description from AI analysis
    }

    /// @notice Counter for event IDs
    uint256 public eventCount;

    /// @notice All recorded events (The Cardiogram)
    mapping(uint256 => VitalEvent) public events;

    /// @notice Events by protocol for efficient querying
    mapping(address => uint256[]) public protocolEvents;

    /// @notice Events by risk level
    mapping(RiskLevel => uint256[]) public eventsByRiskLevel;

    // Events emitted for indexing
    event ThreatDetected(
        uint256 indexed eventId,
        address indexed protocol,
        RiskLevel riskLevel,
        ActionType actionType,
        uint256 timestamp
    );

    event WithdrawalRecorded(
        uint256 indexed eventId,
        address indexed protocol,
        address token,
        uint256 amount
    );

    // Custom Errors
    error UnauthorizedRecorder();
    error EventNotFound();

    /**
     * @notice Initialize The Cardiogram registry
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Record a new vital threat detection in The Cardiogram
     * @param protocol Address of the threatened protocol
     * @param token Token involved (address(0) if native token)
     * @param amount Amount withdrawn (0 if no withdrawal)
     * @param riskLevel Severity of the vital anomaly
     * @param actionType Action taken in response
     * @param exploitPattern Description from AI diagnostics
     * @return eventId The ID of the recorded event
     */
    function recordThreat(
        address protocol,
        address token,
        uint256 amount,
        RiskLevel riskLevel,
        ActionType actionType,
        string calldata exploitPattern
    ) external onlyRole(GUARDIAN_ROLE) returns (uint256) {
        eventCount++;
        uint256 eventId = eventCount;

        bytes32 threatHash = keccak256(
            abi.encodePacked(protocol, token, riskLevel, block.timestamp)
        );

        VitalEvent memory newEvent = VitalEvent({
            eventId: eventId,
            protocol: protocol,
            token: token,
            amount: amount,
            riskLevel: riskLevel,
            actionType: actionType,
            timestamp: block.timestamp,
            threatHash: threatHash,
            exploitPattern: exploitPattern
        });

        events[eventId] = newEvent;
        protocolEvents[protocol].push(eventId);
        eventsByRiskLevel[riskLevel].push(eventId);

        emit ThreatDetected(eventId, protocol, riskLevel, actionType, block.timestamp);

        if (amount > 0) {
            emit WithdrawalRecorded(eventId, protocol, token, amount);
        }

        return eventId;
    }

    /**
     * @notice Get all events for a specific protocol
     * @param protocol Address of the protocol
     * @return Array of event IDs
     */
    function getProtocolEvents(address protocol) external view returns (uint256[] memory) {
        return protocolEvents[protocol];
    }

    /**
     * @notice Get all events by risk level
     * @param riskLevel The risk level to query
     * @return Array of event IDs
     */
    function getEventsByRiskLevel(RiskLevel riskLevel) external view returns (uint256[] memory) {
        return eventsByRiskLevel[riskLevel];
    }

    /**
     * @notice Get details of a specific event
     * @param eventId The event ID
     * @return The complete VitalEvent struct
     */
    function getEvent(uint256 eventId) external view returns (VitalEvent memory) {
        if (eventId == 0 || eventId > eventCount) revert EventNotFound();
        return events[eventId];
    }

    /**
     * @notice Get recent events (paginated)
     * @param offset Starting index (0 for most recent)
     * @param limit Number of events to return
     * @return Array of VitalEvents
     */
    function getRecentEvents(uint256 offset, uint256 limit) external view returns (VitalEvent[] memory) {
        if (eventCount == 0) {
            return new VitalEvent[](0);
        }

        uint256 start = eventCount > offset ? eventCount - offset : 0;
        uint256 end = start > limit ? start - limit : 0;
        uint256 resultCount = start - end;

        VitalEvent[] memory result = new VitalEvent[](resultCount);
        uint256 index = 0;

        for (uint256 i = start; i > end; i--) {
            result[index] = events[i];
            index++;
        }

        return result;
    }

    /**
     * @notice Get total count of events
     * @return Total number of recorded events
     */
    function getTotalEvents() external view returns (uint256) {
        return eventCount;
    }
}
