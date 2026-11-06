# 💓 Heartbeat Protocol

**Autonomous AI-Powered DeFi Vital Defense & Resuscitation System**

Heartbeat Protocol monitors blockchains in real time for exploit arrhythmias, utilizes local Ollama AI to diagnose vulnerability patterns, scans portfolio contracts for matching systemic flaws, and executes automated defibrillation (emergency fund rescue) within 30 seconds—protecting protocols before copycat drains can materialize.

---

## 🏗️ Architecture

```
                       [ Chainlink CRE Trigger ]
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │     The Pulse Monitor     │
                    │   (Transaction Telemetry) │
                    └─────────────┬─────────────┘
                                  │ Arrhythmia Detected
                                  ▼
                    ┌───────────────────────────┐
                    │    AI Vital Diagnostics   │
                    │   (Local Ollama Engine)   │
                    └─────────────┬─────────────┘
                                  │ Severe Threat Identified
                                  ▼
         ┌─────────────────────────────────────────────────┐
         │                                                 │
         ▼                                                 ▼
┌───────────────────┐                             ┌───────────────────┐
│ HeartbeatGuardian │ ── Resuscitation (Rescue) ─►│   Safe Vault      │
│  (Defibrillator)  │                             │ (Treasury Wallet) │
└────────┬──────────┘                             └───────────────────┘
         │
         ▼
┌───────────────────┐
│   VitalRegistry   │ ── Immutable Audit Trail ──► [ The Cardiogram Dashboard ]
│ (Onchain Events)  │
└───────────────────┘
```

### 1. Smart Contracts (`contracts/`)
- **`HeartbeatGuardian.sol`** — Emergency defibrillator executing automated fund rescues when severe arrhythmias strike. Enforces cooldown periods and configurable withdrawal rate limits.
- **`VitalRegistry.sol`** — The Cardiogram: immutable onchain record of all vital anomalies, alerts, and emergency interventions.
- **`ArrhythmicVault.sol`** — Vulnerable mock protocol demonstrating reentrancy exploit detection and automated rescue.

### 2. Chainlink CRE Workflow (`cre-workflow/`)
- **`exploitDetector.js`** — Real-time telemetry scanner evaluating transaction gas anomalies and rhythm deviations.
- **`aiAnalyzer.js`** — Local Ollama AI diagnostic engine analyzing bytecode and event logs to pinpoint exploit patterns.
- **`portfolioScanner.js`** — Evaluates entire DAO portfolios for shared vulnerabilities and code similarities.
- **`responseExecutor.js`** — Mobilizes `HeartbeatGuardian` to execute automated resuscitation onchain.
- **`index.ts`** — Real Chainlink CRE SDK workflow compiled to WASM for DON execution.

### 3. Monitoring Dashboard (`dashboard/`)
- **Next.js 14 App Router** — Real-time vital health monitoring and interactive telemetry.
- **Wagmi + Viem + RainbowKit** — Fluid Web3 wallet connectivity and onchain state reads.
- **Tailwind CSS** — Sleek dark telemetry theme with heartbeat animations, vital status badges, and The Cardiogram timeline.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) >= 18.0.0
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- [Ollama](https://ollama.com) for local AI vital diagnostics
- Arbitrum Sepolia testnet ETH

### 1. Installation

```bash
# Install root and workspace dependencies
npm run install:all
```

### 2. Configure Environment

```bash
cp .env.example .env
cp cre-workflow/.env.example cre-workflow/.env
cp dashboard/.env.example dashboard/.env
```

### 3. Start Local AI Server

```bash
# Pull model and start Ollama
ollama pull llama3.1:8b
ollama serve
```

### 4. Build & Test Smart Contracts

```bash
cd contracts
forge test -vvv
```

All 41 Foundry tests pass cleanly:
- 19 `HeartbeatGuardian` tests (cooldowns, rate limits, access control, emergency withdrawals)
- 14 `VitalRegistry` tests (onchain logging, pagination, role verification)
- 8 `ArrhythmicVault` tests (reentrancy demonstration and withdrawal mechanics)

### 5. Launch Development Dashboard

```bash
npm run dev:dashboard
```

Navigate to `http://localhost:3000`.

---

## 🛠️ Development Commands

```bash
# Monorepo commands
npm run install:all              # Install all workspace dependencies
npm run build:contracts          # Build smart contracts via forge
npm run test:contracts           # Run all 41 contract unit tests
npm run dev:dashboard            # Start Next.js 14 dashboard dev server

# CRE Workflow commands (from cre-workflow/)
npm run test:detector            # Test telemetry anomaly detector
npm run test:analyzer            # Test Ollama AI vital diagnostics
npm run test:scanner             # Test DAO portfolio vulnerability scanner
npm run test:executor            # Test emergency response executor
npm run demo                     # Run full end-to-end simulated exploit demo
```

---

## 🔐 Security Parameters

- **Authorized Rescue Execution**: Defibrillation calls strictly require `CRE_WORKFLOW_ROLE`.
- **Refractory Cooldowns**: Enforced cooldown timers prevent repeated withdrawal spam.
- **Protocol Withdrawal Limits**: Maximum withdrawal caps enforced per protocol address.
- **Auditability**: Every detection, threat level, and emergency transfer is immutably indexed in `VitalRegistry`.

---

## 📄 License

MIT

**Heartbeat Protocol — The pulse that protects DeFi.** 💓
