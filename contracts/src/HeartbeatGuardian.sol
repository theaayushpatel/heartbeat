// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IVitalRegistry} from "./interfaces/IVitalRegistry.sol";

/**
 * @title HeartbeatGuardian
 * @notice The Defibrillator - executes emergency fund resuscitation when critical arrhythmias or exploit threats are detected
 * @dev Called by Chainlink CRE workflow to protect DeFi portfolios from exploit drain
 */
contract HeartbeatGuardian is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Role for CRE workflow to execute emergency resuscitation actions
    bytes32 public constant CRE_WORKFLOW_ROLE = keccak256("CRE_WORKFLOW_ROLE");

    /// @notice The Cardiogram - records all threats and defense actions
    IVitalRegistry public immutable vitalRegistry;

    /// @notice Address where rescued funds are sent (immutable for security)
    address public immutable safeAddress;

    /// @notice Cooldown period between withdrawals from the same protocol (seconds)
    uint256 public cooldownPeriod;

    /// @notice Maximum withdrawal percentage (basis points: 10000 = 100%)
    uint256 public maxWithdrawalBps;

    /// @notice Tracks last withdrawal timestamp for each protocol
    mapping(address => uint256) public lastWithdrawal;

    /// @notice Tracks withdrawal limits for each protocol
    mapping(address => uint256) public protocolWithdrawalLimits;

    /// @notice Vital risk levels for emergency actions
    enum RiskLevel {
        LOW,        // 3-4: Minor BPM deviation, enhanced monitoring only
        MEDIUM,     // 5-6: Arrhythmia alert + governance proposal
        HIGH,       // 7-8: Tachycardia, partial withdrawal (80%)
        CRITICAL    // 9-10: Cardiac arrest, emergency withdrawal (100%)
    }

    // Events
    event EmergencyWithdrawal(
        address indexed protocol,
        address indexed token,
        uint256 amount,
        RiskLevel riskLevel,
        uint256 timestamp
    );
    
    event ProtocolLimitUpdated(address indexed protocol, uint256 newLimit);
    event CooldownUpdated(uint256 newCooldown);
    event MaxWithdrawalUpdated(uint256 newMaxBps);

    // Custom Errors
    error UnauthorizedCaller();
    error CooldownNotElapsed();
    error ExceedsWithdrawalLimit();
    error InvalidSafeAddress();
    error InvalidCooldown();
    error InvalidWithdrawalPercentage();
    error WithdrawalFailed();

    /**
     * @notice Initialize HeartbeatGuardian with vital security parameters
     * @param _vitalRegistry Address of The Cardiogram (VitalRegistry)
     * @param _safeAddress Address where protected funds shall be safely routed
     * @param _cooldownPeriod Minimum time between consecutive withdrawals (seconds)
     * @param _maxWithdrawalBps Maximum withdrawal percentage in basis points (10000 = 100%)
     */
    constructor(
        address _vitalRegistry,
        address _safeAddress,
        uint256 _cooldownPeriod,
        uint256 _maxWithdrawalBps
    ) {
        if (_vitalRegistry == address(0)) revert InvalidSafeAddress();
        if (_safeAddress == address(0)) revert InvalidSafeAddress();
        if (_maxWithdrawalBps > 10000) revert InvalidWithdrawalPercentage();

        vitalRegistry = IVitalRegistry(_vitalRegistry);
        safeAddress = _safeAddress;
        cooldownPeriod = _cooldownPeriod;
        maxWithdrawalBps = _maxWithdrawalBps;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Compatibility getter for registry address
     */
    function riskRegistry() external view returns (address) {
        return address(vitalRegistry);
    }

    /**
     * @notice Resuscitation Protocol - Execute emergency withdrawal from an arrhythmic / threatened protocol
     * @param protocol Address of the vulnerable protocol
     * @param token Address of the token to withdraw
     * @param amount Amount to withdraw
     * @param riskLevel Severity of the detected vital threat
     */
    function emergencyWithdraw(
        address protocol,
        address token,
        uint256 amount,
        RiskLevel riskLevel
    ) external nonReentrant onlyRole(CRE_WORKFLOW_ROLE) {
        // Pulse Check - Check cooldown period (skip on first withdrawal)
        if (lastWithdrawal[protocol] > 0 && block.timestamp < lastWithdrawal[protocol] + cooldownPeriod) {
            revert CooldownNotElapsed();
        }

        // Vital Bounds - Verify withdrawal limits
        uint256 limit = protocolWithdrawalLimits[protocol];
        if (limit > 0 && amount > limit) {
            revert ExceedsWithdrawalLimit();
        }

        // Calculate withdrawal percentage based on risk level
        uint256 withdrawalBps = _getWithdrawalPercentage(riskLevel);
        if (withdrawalBps > maxWithdrawalBps) {
            withdrawalBps = maxWithdrawalBps;
        }

        // Calculate actual withdrawal amount — only for HIGH/CRITICAL (withdrawalBps > 0).
        // MEDIUM/LOW have withdrawalBps=0 -> no transfer, only an ALERT is recorded.
        uint256 actualAmount = 0;
        if (withdrawalBps > 0) {
            actualAmount = (amount * withdrawalBps) / 10000;
            // Guard against integer rounding to zero when amount is very small
            if (actualAmount == 0) actualAmount = amount;
        }

        // Update cooldown only when an actual withdrawal is executed
        if (actualAmount > 0) {
            lastWithdrawal[protocol] = block.timestamp;
        }

        // Execute the withdrawal (only for HIGH/CRITICAL)
        if (actualAmount > 0) {
            IERC20(token).safeTransferFrom(protocol, safeAddress, actualAmount);
        }

        // Record in The Cardiogram
        IVitalRegistry.ActionType actionType = withdrawalBps > 0 
            ? IVitalRegistry.ActionType.WITHDRAWAL 
            : IVitalRegistry.ActionType.ALERT;
        
        vitalRegistry.recordThreat(
            protocol,
            token,
            actualAmount,
            _convertRiskLevel(riskLevel),
            actionType,
            string(abi.encodePacked("Resuscitation action: ", _getRiskLevelString(riskLevel)))
        );

        emit EmergencyWithdrawal(protocol, token, actualAmount, riskLevel, block.timestamp);
    }

    /**
     * @notice Set withdrawal limit for a specific protocol
     * @param protocol Address of the protocol
     * @param limit Maximum amount that can be withdrawn in a single transaction
     */
    function setProtocolLimit(address protocol, uint256 limit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        protocolWithdrawalLimits[protocol] = limit;
        emit ProtocolLimitUpdated(protocol, limit);
    }

    /**
     * @notice Update the cooldown period between withdrawals
     * @param newCooldown New cooldown period in seconds
     */
    function setCooldownPeriod(uint256 newCooldown) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newCooldown > 7 days) revert InvalidCooldown();
        cooldownPeriod = newCooldown;
        emit CooldownUpdated(newCooldown);
    }

    /**
     * @notice Update maximum withdrawal percentage
     * @param newMaxBps New maximum in basis points (10000 = 100%)
     */
    function setMaxWithdrawalBps(uint256 newMaxBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newMaxBps > 10000) revert InvalidWithdrawalPercentage();
        maxWithdrawalBps = newMaxBps;
        emit MaxWithdrawalUpdated(newMaxBps);
    }

    /**
     * @notice Get withdrawal percentage based on risk level
     * @param riskLevel The assessed threat level
     * @return Withdrawal percentage in basis points
     */
    function _getWithdrawalPercentage(RiskLevel riskLevel) internal pure returns (uint256) {
        if (riskLevel == RiskLevel.CRITICAL) return 10000; // 100%
        if (riskLevel == RiskLevel.HIGH) return 8000;      // 80%
        if (riskLevel == RiskLevel.MEDIUM) return 0;       // No withdrawal, only alert
        return 0;                                           // LOW: No withdrawal
    }

    /**
     * @notice Convert HeartbeatGuardian RiskLevel to IVitalRegistry RiskLevel
     * @param riskLevel Guardian's risk level
     * @return IVitalRegistry's risk level
     */
    function _convertRiskLevel(RiskLevel riskLevel) internal pure returns (IVitalRegistry.RiskLevel) {
        if (riskLevel == RiskLevel.CRITICAL) return IVitalRegistry.RiskLevel.CRITICAL;
        if (riskLevel == RiskLevel.HIGH) return IVitalRegistry.RiskLevel.HIGH;
        if (riskLevel == RiskLevel.MEDIUM) return IVitalRegistry.RiskLevel.MEDIUM;
        return IVitalRegistry.RiskLevel.LOW;
    }

    /**
     * @notice Get string representation of risk level
     * @param riskLevel The risk level
     * @return String name of the risk level
     */
    function _getRiskLevelString(RiskLevel riskLevel) internal pure returns (string memory) {
        if (riskLevel == RiskLevel.CRITICAL) return "CRITICAL";
        if (riskLevel == RiskLevel.HIGH) return "HIGH";
        if (riskLevel == RiskLevel.MEDIUM) return "MEDIUM";
        return "LOW";
    }
}
