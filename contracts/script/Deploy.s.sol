// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {HeartbeatGuardian} from "../src/HeartbeatGuardian.sol";
import {VitalRegistry} from "../src/VitalRegistry.sol";
import {ArrhythmicVault} from "../src/mocks/ArrhythmicVault.sol";

/**
 * @title Deploy
 * @notice Deployment script for Heartbeat Protocol contracts
 */
contract Deploy is Script {
    // Default configuration
    uint256 constant DEFAULT_COOLDOWN = 5 minutes;
    uint256 constant DEFAULT_MAX_WITHDRAWAL_BPS = 10000; // 100%

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Use deployer address as safe address if SAFE_ADDRESS not set
        address safeAddress = vm.envOr("SAFE_ADDRESS", deployer);
        
        console.log("=== Heartbeat Protocol Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Safe Address:", safeAddress);
        console.log("Network: Arbitrum Sepolia");
        console.log("");

        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy VitalRegistry (The Cardiogram)
        console.log("Deploying VitalRegistry...");
        VitalRegistry vitalRegistry = new VitalRegistry();
        console.log("VitalRegistry deployed at:", address(vitalRegistry));
        
        // 2. Deploy HeartbeatGuardian (The Defibrillator)
        console.log("Deploying HeartbeatGuardian...");
        HeartbeatGuardian guardian = new HeartbeatGuardian(
            address(vitalRegistry),
            safeAddress,
            DEFAULT_COOLDOWN,
            DEFAULT_MAX_WITHDRAWAL_BPS
        );
        console.log("HeartbeatGuardian deployed at:", address(guardian));
        
        // 3. Grant Guardian role to access VitalRegistry
        console.log("Configuring roles...");
        bytes32 guardianRole = vitalRegistry.GUARDIAN_ROLE();
        vitalRegistry.grantRole(guardianRole, address(guardian));
        console.log("Guardian role granted to HeartbeatGuardian contract");
        
        // 4. Deploy ArrhythmicVault for testing
        console.log("Deploying ArrhythmicVault (demo)...");
        ArrhythmicVault arrhythmicVault = new ArrhythmicVault();
        console.log("ArrhythmicVault deployed at:", address(arrhythmicVault));
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("");
        console.log("Update your .env file with:");
        console.log("GUARDIAN_ADDRESS=", address(guardian));
        console.log("RISK_REGISTRY_ADDRESS=", address(vitalRegistry));
        console.log("");
        console.log("Next steps:");
        console.log("1. Update .env with the addresses above");
        console.log("2. Grant CRE_WORKFLOW_ROLE to your CRE workflow address");
        console.log("3. Test with ArrhythmicVault at:", address(arrhythmicVault));
    }
}
