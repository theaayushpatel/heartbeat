// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IVitalRegistry
 * @notice Interface for The Cardiogram - immutable record of protocol vitals, threats, and interventions
 */
interface IVitalRegistry {
    enum RiskLevel {
        LOW,        // 3-4: Minor BPM deviation, enhanced monitoring
        MEDIUM,     // 5-6: Arrhythmia alert & governance proposal
        HIGH,       // 7-8: Tachycardia, partial rescue (80%)
        CRITICAL    // 9-10: Cardiac arrest, emergency defibrillation (100%)
    }

    enum ActionType {
        ALERT,              // Arrhythmia telemetry alert created
        WITHDRAWAL,         // Emergency defibrillation/withdrawal executed
        GOVERNANCE_PROPOSAL // Protocol governance proposal dispatched
    }

    function recordThreat(
        address protocol,
        address token,
        uint256 amount,
        RiskLevel riskLevel,
        ActionType actionType,
        string calldata exploitPattern
    ) external returns (uint256);
}
