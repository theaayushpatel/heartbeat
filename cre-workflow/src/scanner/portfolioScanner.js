/**
 * Portfolio Scanner - Vital Scan
 * 
 * Scans a DAO's entire protocol portfolio for vulnerabilities similar to detected exploits.
 * Calculates vital risk scores based on code similarity and AI analysis.
 */

import axios from 'axios';
import { ethers } from 'ethers';
import { readFile } from 'fs/promises';
import { analyzeExploit } from '../analysis/aiAnalyzer.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Fetches contract source code from block explorer
 * @param {string} address - Contract address
 * @param {string} chain - Blockchain network
 * @returns {string} Contract source code
 */
async function fetchContractSource(address, chain = 'arbitrum-sepolia') {
    const apiKey = process.env.ARBISCAN_API_KEY || process.env.ETHERSCAN_API_KEY;
    
    let apiUrl;
    if (chain === 'arbitrum-sepolia') {
        apiUrl = 'https://api-sepolia.arbiscan.io/api';
    } else if (chain === 'arbitrum') {
        apiUrl = 'https://api.arbiscan.io/api';
    } else {
        apiUrl = 'https://api.etherscan.io/api';
    }
    
    try {
        const response = await axios.get(apiUrl, {
            params: {
                module: 'contract',
                action: 'getsourcecode',
                address: address,
                apikey: apiKey || ''
            }
        });
        
        if (response.data.status === '1' && response.data.result[0].SourceCode) {
            return response.data.result[0].SourceCode;
        }
        
        return null;
    } catch (error) {
        console.error(`Failed to fetch source for ${address}:`, error.message);
        return null;
    }
}

/**
 * Calculates code similarity between two contracts
 * Uses token-based Jaccard similarity
 * @param {string} code1 - First contract code
 * @param {string} code2 - Second contract code
 * @returns {number} Similarity score 0-1
 */
function calculateCodeSimilarity(code1, code2) {
    if (!code1 || !code2) return 0;
    
    const normalize = (code) => code
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '')
        .replace(/\s+/g, ' ')
        .toLowerCase();
    
    const normalized1 = normalize(code1);
    const normalized2 = normalize(code2);
    
    const tokens1 = new Set(normalized1.split(/\W+/).filter(t => t.length > 2));
    const tokens2 = new Set(normalized2.split(/\W+/).filter(t => t.length > 2));
    
    const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size;
}

/**
 * Checks for common vulnerability patterns in code
 * @param {string} code - Contract source code
 * @param {string} exploitType - Type of exploit to look for
 * @returns {number} Vulnerability score 0-10
 */
function checkVulnerabilityPatterns(code, exploitType) {
    if (!code) return 0;
    
    let score = 0;
    const lowerCode = code.toLowerCase();
    
    // Reentrancy patterns
    if (exploitType === 'reentrancy') {
        if (lowerCode.includes('.call{value:') && !lowerCode.includes('reentrancyguard')) score += 4;
        if (lowerCode.includes('transfer(') && lowerCode.includes('balance[')) score += 2;
        if (!lowerCode.includes('nonreentrant') && !lowerCode.includes('reentrancyguard')) score += 2;
    }
    
    // Flash loan patterns
    if (exploitType === 'flash-loan' || exploitType === 'flash_loan') {
        if (lowerCode.includes('flashloan') || lowerCode.includes('flash loan')) score += 3;
        if (lowerCode.includes('borrow') && lowerCode.includes('repay')) score += 2;
    }
    
    // Access control issues
    if (exploitType === 'access-control') {
        if (lowerCode.includes('onlyowner') || lowerCode.includes('only owner')) score += 1;
        if (!lowerCode.includes('accesscontrol') && !lowerCode.includes('ownable')) score += 3;
    }
    
    // Price manipulation
    if (exploitType === 'price-manipulation') {
        if (lowerCode.includes('getprice') || lowerCode.includes('price')) score += 2;
        if (lowerCode.includes('oracle')) score += 1;
        if (!lowerCode.includes('twap') && !lowerCode.includes('chainlink')) score += 2;
    }
    
    return Math.min(10, score);
}

/**
 * Loads portfolio configuration
 * @returns {Object} Portfolio configuration
 */
async function loadPortfolioConfig() {
    try {
        const config = JSON.parse(
            await readFile('./config/portfolio.json', 'utf-8')
        );
        return config;
    } catch (error) {
        console.error('Failed to load portfolio config:', error.message);
        return { portfolios: [], riskThresholds: {} };
    }
}

/**
 * Scans a portfolio of protocols for vulnerabilities
 * @param {Object} exploitPattern - Pattern extracted from recent exploit
 * @returns {Array} Risk assessments for all portfolio protocols
 */
export async function scanPortfolio(exploitPattern) {
    console.log('🩺 Portfolio Vital Scan begins...');
    console.log(`🎯 Searching for ${exploitPattern.exploitType} arrhythmias`);
    
    try {
        const config = await loadPortfolioConfig();
        const riskAssessments = [];
        
        for (const dao of config.portfolios) {
            console.log(`\n🏛️  Scanning portfolio for ${dao.daoName}...`);
            
            for (const protocol of dao.protocols) {
                console.log(`  🔍 Diagnosing ${protocol.name} (${protocol.address})...`);
                
                try {
                    const sourceCode = await fetchContractSource(
                        protocol.address,
                        protocol.chain
                    );
                    
                    if (!sourceCode) {
                        console.log(`    ⚠️  Source code not available for ${protocol.name}`);
                        continue;
                    }
                    
                    const vulnScore = checkVulnerabilityPatterns(
                        sourceCode,
                        exploitPattern.exploitType
                    );
                    
                    let similarityScore = 0;
                    if (exploitPattern.sourceCode) {
                        similarityScore = calculateCodeSimilarity(sourceCode, exploitPattern.sourceCode);
                    }

                    let aiConfidence = exploitPattern.confidence || 0;
                    if (similarityScore > 0.7) {
                        console.log(`    🔬 Similarity ${(similarityScore * 100).toFixed(0)}% — running AI vital diagnostic…`);
                        try {
                            const deepDive = await analyzeExploit({
                                hash: `vital-analysis-${protocol.address.slice(0, 10)}`,
                                from: 'N/A',
                                to: protocol.address,
                                value: '0',
                                gasUsed: 'N/A',
                                status: 1,
                                anomalyScore: Math.max(vulnScore, 5),
                                logs: [],
                            });
                            aiConfidence = deepDive.confidence;
                            console.log(`    🤖 Vital Diagnostic: ${deepDive.exploitType} (confidence=${aiConfidence}%)`);
                        } catch (err) {
                            console.warn(`    ⚠️  AI vital diagnostic failed: ${err.message}`);
                        }
                    }

                    const riskScore = Math.min(10, Math.round(
                        (vulnScore * 0.4) + 
                        (similarityScore * 10 * 0.3) + 
                        (aiConfidence / 10 * 0.3)
                    ));
                    
                    let recommendedAction = 'MONITOR';
                    if (riskScore >= 9) recommendedAction = 'EMERGENCY_WITHDRAW';
                    else if (riskScore >= 7) recommendedAction = 'PARTIAL_WITHDRAW';
                    else if (riskScore >= 5) recommendedAction = 'ALERT';
                    
                    const assessment = {
                        daoName: dao.daoName,
                        protocolName: protocol.name,
                        protocolAddress: protocol.address,
                        chain: protocol.chain,
                        tvl: protocol.tvl,
                        riskScore: riskScore,
                        vulnerabilityScore: vulnScore,
                        similarityScore: similarityScore,
                        exploitType: exploitPattern.exploitType,
                        recommendedAction: recommendedAction,
                        criticality: protocol.criticality,
                        timestamp: Date.now()
                    };
                    
                    riskAssessments.push(assessment);
                    
                    console.log(`    📊 Vital Risk Score: ${riskScore}/10`);
                    console.log(`    💓 Action: ${recommendedAction}`);
                    
                } catch (error) {
                    console.error(`    ❌ Error analyzing ${protocol.name}:`, error.message);
                }
            }
        }
        
        riskAssessments.sort((a, b) => b.riskScore - a.riskScore);
        
        console.log(`\n✅ Portfolio vital scan complete. ${riskAssessments.length} protocols assessed`);
        
        return riskAssessments;
        
    } catch (error) {
        console.error('❌ Portfolio vital scan failed:', error.message);
        return [];
    }
}

// Standalone testing
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('Testing Portfolio Scanner...');
    
    const mockExploitPattern = {
        exploitType: 'reentrancy',
        confidence: 85,
        vulnerabilityPattern: 'External call before state update',
        sourceCode: null
    };
    
    scanPortfolio(mockExploitPattern)
        .then(result => {
            console.log('\n📋 Scan Results:');
            console.log(JSON.stringify(result, null, 2));
        })
        .catch(console.error);
}
