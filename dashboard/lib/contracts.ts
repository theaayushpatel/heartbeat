/**
 * Contract Configuration
 * ABIs and addresses for Heartbeat Protocol contracts (HeartbeatGuardian & VitalRegistry)
 */

// HeartbeatGuardian Contract ABI
const GUARDIAN_ABI = [
  {
    "type": "function",
    "name": "emergencyWithdraw",
    "inputs": [
      { "name": "protocol", "type": "address" },
      { "name": "token", "type": "address" },
      { "name": "amount", "type": "uint256" },
      { "name": "riskLevel", "type": "uint8" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "safeAddress",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cooldownPeriod",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "maxWithdrawalBps",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "lastWithdrawal",
    "inputs": [{ "name": "", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "EmergencyWithdrawal",
    "inputs": [
      { "name": "protocol", "type": "address", "indexed": true },
      { "name": "token", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false },
      { "name": "riskLevel", "type": "uint8", "indexed": false },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ]
  }
] as const;

// VitalRegistry Contract ABI (The Cardiogram)
const VITAL_REGISTRY_ABI = [
  {
    "type": "function",
    "name": "recordThreat",
    "inputs": [
      { "name": "protocol", "type": "address" },
      { "name": "token", "type": "address" },
      { "name": "amount", "type": "uint256" },
      { "name": "riskLevel", "type": "uint8" },
      { "name": "actionType", "type": "uint8" },
      { "name": "exploitPattern", "type": "string" }
    ],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getEvent",
    "inputs": [{ "name": "eventId", "type": "uint256" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          { "name": "eventId", "type": "uint256" },
          { "name": "protocol", "type": "address" },
          { "name": "token", "type": "address" },
          { "name": "amount", "type": "uint256" },
          { "name": "riskLevel", "type": "uint8" },
          { "name": "actionType", "type": "uint8" },
          { "name": "timestamp", "type": "uint256" },
          { "name": "threatHash", "type": "bytes32" },
          { "name": "exploitPattern", "type": "string" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRecentEvents",
    "inputs": [
      { "name": "offset", "type": "uint256" },
      { "name": "limit", "type": "uint256" }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "components": [
          { "name": "eventId", "type": "uint256" },
          { "name": "protocol", "type": "address" },
          { "name": "token", "type": "address" },
          { "name": "amount", "type": "uint256" },
          { "name": "riskLevel", "type": "uint8" },
          { "name": "actionType", "type": "uint8" },
          { "name": "timestamp", "type": "uint256" },
          { "name": "threatHash", "type": "bytes32" },
          { "name": "exploitPattern", "type": "string" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "eventCount",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "ThreatDetected",
    "inputs": [
      { "name": "eventId", "type": "uint256", "indexed": true },
      { "name": "protocol", "type": "address", "indexed": true },
      { "name": "riskLevel", "type": "uint8", "indexed": false },
      { "name": "actionType", "type": "uint8", "indexed": false },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ]
  }
] as const;

export const contracts = {
  guardian: {
    address: (process.env.NEXT_PUBLIC_GUARDIAN_ADDRESS || '') as `0x${string}`,
    abi: GUARDIAN_ABI,
  },
  heartbeatGuardian: {
    address: (process.env.NEXT_PUBLIC_GUARDIAN_ADDRESS || '') as `0x${string}`,
    abi: GUARDIAN_ABI,
  },
  riskRegistry: {
    address: (process.env.NEXT_PUBLIC_RISK_REGISTRY_ADDRESS || '') as `0x${string}`,
    abi: VITAL_REGISTRY_ABI,
  },
  vitalRegistry: {
    address: (process.env.NEXT_PUBLIC_RISK_REGISTRY_ADDRESS || '') as `0x${string}`,
    abi: VITAL_REGISTRY_ABI,
  },
} as const;
