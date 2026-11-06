/**
 * Response Executor - Resuscitation Protocol
 * 
 * Executes emergency responses based on vital risk assessments.
 * Calls HeartbeatGuardian contract to withdraw funds from vulnerable protocols before cardiac arrest / exploit drain.
 */

import { ethers } from 'ethers';
import { readFile } from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

// HeartbeatGuardian contract ABI (minimal interface needed)
const GUARDIAN_ABI = [
    'function emergencyWithdraw(address protocol, address token, uint256 amount, uint8 riskLevel) external',
    'function lastWithdrawal(address) view returns (uint256)',
    'function cooldownPeriod() view returns (uint256)'
];

// Vital Risk level enum mapping
const RiskLevel = {
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2,
    CRITICAL: 3
};

/**
 * Converts risk score to Guardian RiskLevel enum
 * @param {number} riskScore - Risk score from 1-10
 * @returns {number} RiskLevel enum value
 */
function convertToRiskLevel(riskScore) {
    if (riskScore >= 9) return RiskLevel.CRITICAL;
    if (riskScore >= 7) return RiskLevel.HIGH;
    if (riskScore >= 5) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
}

/**
 * Checks if protocol is in cooldown period
 * @param {Object} guardian - Guardian contract instance
 * @param {string} protocolAddress - Protocol address to check
 * @returns {boolean} True if in cooldown
 */
async function isInCooldown(guardian, protocolAddress) {
    try {
        const lastWithdrawal = await guardian.lastWithdrawal(protocolAddress);
        const cooldownPeriod = await guardian.cooldownPeriod();
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (lastWithdrawal.toString() === '0') return false;
        
        const timeSinceLastWithdrawal = currentTime - parseInt(lastWithdrawal.toString());
        return timeSinceLastWithdrawal < parseInt(cooldownPeriod.toString());
    } catch (error) {
        console.error('Error checking cooldown:', error.message);
        return true;
    }
}

/**
 * Gets token balance from protocol
 * @param {Object} provider - Ethers provider
 * @param {string} tokenAddress - Token contract address
 * @param {string} protocolAddress - Protocol holding the tokens
 * @returns {bigint} Token balance
 */
async function getTokenBalance(provider, tokenAddress, protocolAddress) {
    const tokenABI = ['function balanceOf(address) view returns (uint256)'];
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);
    return await tokenContract.balanceOf(protocolAddress);
}

/**
 * Executes emergency defibrillation / response for vulnerable protocols
 * @param {Array} riskAssessments - Risk assessments from portfolio scan
 * @returns {Object} Execution results
 */
export async function executeResponse(riskAssessments) {
    console.log('⚡ Resuscitation Protocol mobilizes...');
    
    if (!riskAssessments || riskAssessments.length === 0) {
        console.log('No risk assessments to process');
        return { 
            executed: [],
            skipped: [],
            failed: []
        };
    }
    
    try {
        const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC || process.env.RPC_URL;
        const privateKey = process.env.CRE_WORKFLOW_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
        const guardianAddress = process.env.GUARDIAN_ADDRESS;
        
        if (!rpcUrl || !privateKey || !guardianAddress) {
            throw new Error('Missing required environment variables: RPC_URL, PRIVATE_KEY, or GUARDIAN_ADDRESS');
        }
        
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const signer = new ethers.Wallet(privateKey, provider);
        const guardian = new ethers.Contract(guardianAddress, GUARDIAN_ABI, signer);
        
        console.log(`🛡️  HeartbeatGuardian contract: ${guardianAddress}`);
        console.log(`📡 Resuscitation Executor address: ${signer.address}`);
        
        const results = {
            executed: [],
            skipped: [],
            failed: []
        };
        
        for (const assessment of riskAssessments) {
            console.log(`\n🎯 Processing ${assessment.protocolName}...`);
            console.log(`   Vital Risk Score: ${assessment.riskScore}/10`);
            console.log(`   Action: ${assessment.recommendedAction}`);
            
            if (assessment.recommendedAction === 'MONITOR') {
                console.log('   ⏭️  Skipping - normal rhythm monitoring');
                results.skipped.push({
                    ...assessment,
                    reason: 'MONITOR action - no withdrawal needed'
                });
                continue;
            }
            
            if (assessment.recommendedAction === 'ALERT') {
                console.log('   ⏭️  Skipping - arrhythmia alert dispatched');
                results.skipped.push({
                    ...assessment,
                    reason: 'ALERT action - dashboard notification only'
                });
                continue;
            }
            
            const inCooldown = await isInCooldown(guardian, assessment.protocolAddress);
            if (inCooldown) {
                console.log('   ⏸️  Skipping - protocol in cooldown refractory period');
                results.skipped.push({
                    ...assessment,
                    reason: 'Cooldown period not elapsed'
                });
                continue;
            }
            
            try {
                const tokenAddress = process.env.TOKEN_ADDRESS || ethers.ZeroAddress;
                
                let balance;
                if (tokenAddress === ethers.ZeroAddress) {
                    balance = await provider.getBalance(assessment.protocolAddress);
                } else {
                    balance = await getTokenBalance(provider, tokenAddress, assessment.protocolAddress);
                }
                
                let withdrawalPercent = 100;
                if (assessment.recommendedAction === 'PARTIAL_WITHDRAW') {
                    withdrawalPercent = 80;
                }
                
                const withdrawalAmount = (balance * BigInt(withdrawalPercent)) / 100n;
                
                if (withdrawalAmount === 0n) {
                    console.log('   ⏭️  Skipping - no balance to rescue');
                    results.skipped.push({
                        ...assessment,
                        reason: 'No balance available'
                    });
                    continue;
                }
                
                console.log(`   💰 Rescuing ${ethers.formatEther(withdrawalAmount)} ETH (${withdrawalPercent}%)`);
                
                const riskLevel = convertToRiskLevel(assessment.riskScore);
                
                const tx = await guardian.emergencyWithdraw(
                    assessment.protocolAddress,
                    tokenAddress,
                    withdrawalAmount,
                    riskLevel
                );
                
                console.log(`   📝 Defibrillation transaction sent: ${tx.hash}`);
                console.log('   ⏳ Waiting for confirmation...');
                
                const receipt = await tx.wait();
                
                console.log(`   ✅ Emergency rescue executed successfully (Block ${receipt.blockNumber})`);
                
                results.executed.push({
                    ...assessment,
                    transactionHash: tx.hash,
                    blockNumber: receipt.blockNumber,
                    withdrawalAmount: ethers.formatEther(withdrawalAmount),
                    withdrawalPercent: withdrawalPercent
                });
                
            } catch (error) {
                console.error(`   ❌ Resuscitation failed: ${error.message}`);
                results.failed.push({
                    ...assessment,
                    error: error.message
                });
            }
        }
        
        console.log('\n📊 Resuscitation Summary:');
        console.log(`   ✅ Rescued: ${results.executed.length}`);
        console.log(`   ⏭️  Skipped: ${results.skipped.length}`);
        console.log(`   ❌ Failed: ${results.failed.length}`);
        
        return results;
        
    } catch (error) {
        console.error('❌ Resuscitation execution failed:', error.message);
        return {
            executed: [],
            skipped: [],
            failed: [{ error: error.message }]
        };
    }
}

// Standalone testing
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('Testing Response Executor...');
    
    const mockRiskAssessments = [
        {
            daoName: 'Test DAO',
            protocolName: 'Arrhythmic Vault',
            protocolAddress: '0x0000000000000000000000000000000000000001',
            chain: 'arbitrum-sepolia',
            riskScore: 9,
            recommendedAction: 'EMERGENCY_WITHDRAW'
        },
        {
            daoName: 'Test DAO',
            protocolName: 'Healthy Vault',
            protocolAddress: '0x0000000000000000000000000000000000000002',
            chain: 'arbitrum-sepolia',
            riskScore: 4,
            recommendedAction: 'MONITOR'
        }
    ];
    
    executeResponse(mockRiskAssessments)
        .then(result => {
            console.log('\n📋 Execution Results:');
            console.log(JSON.stringify(result, null, 2));
        })
        .catch(console.error);
}
