// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ArrhythmicVault
 * @notice Mock DeFi protocol with intentional reentrancy vulnerability (cardiac arrest simulation)
 * @dev Used for demonstrating Heartbeat's real-time detection, AI diagnostic, and defibrillation response
 */
contract ArrhythmicVault {
    mapping(address => uint256) public balances;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);

    /**
     * @notice Deposit ETH into the protocol
     */
    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw ETH - INTENTIONALLY VULNERABLE TO REENTRANCY!
     * @dev External call occurs before state update, causing an exploitable rhythm flaw
     */
    function withdraw() external {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "No balance");

        // VULNERABILITY: External call before state update
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");

        // State update happens AFTER external call
        balances[msg.sender] = 0;
        
        emit Withdrawal(msg.sender, balance);
    }

    /**
     * @notice Get contract's ETH balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Authorize HeartbeatGuardian to rescue tokens in cardiac arrest / emergency
     * @param token Token to approve
     * @param guardian HeartbeatGuardian contract address
     * @param amount Amount to approve
     */
    function approveGuardian(address token, address guardian, uint256 amount) external {
        IERC20(token).approve(guardian, amount);
    }

    receive() external payable {
        balances[msg.sender] += msg.value;
    }
}

/**
 * @notice Alias for backwards compatibility
 */
contract VulnerableProtocol is ArrhythmicVault {}
