# Heartbeat Protocol - Setup & Deployment Guide

Complete setup instructions for running the Heartbeat Protocol autonomous vital defense system.

## 💓 Deployed Contracts (Arbitrum Sepolia)

| Contract | Address |
|---|---|
| HeartbeatGuardian | [`0xa80f97675ff16407464b688cce4554f35a5a9214`](https://sepolia.arbiscan.io/address/0xa80f97675ff16407464b688cce4554f35a5a9214) |
| VitalRegistry | [`0x0988e36849863504d1db1e88eef5aef866ea3d79`](https://sepolia.arbiscan.io/address/0x0988e36849863504d1db1e88eef5aef866ea3d79) |
| ArrhythmicVault | [`0x67cd4c8051f7d38b1acf7ad09318dc8909c2644a`](https://sepolia.arbiscan.io/address/0x67cd4c8051f7d38b1acf7ad09318dc8909c2644a) |

> Network: Arbitrum Sepolia (Chain ID: 421614)

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- Foundry (`forge`, `cast`)
- Ollama (for local AI vital diagnostics)

### 1. Installation

```bash
# Root and workspace dependencies
npm run install:all

# Or individually:
cd cre-workflow && npm install && cd ..
cd dashboard && npm install && cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
cp cre-workflow/.env.example cre-workflow/.env
cp dashboard/.env.example dashboard/.env
```

### 3. Run Foundry Smart Contract Tests

```bash
cd contracts
forge test -vvv
```

### 4. Start Local AI Server

```bash
ollama pull llama3.1:8b
ollama serve
```

### 5. Run Standalone Exploit Diagnostic Demo

```bash
cd cre-workflow
npm run demo
```

### 6. Launch Real-time Telemetry Dashboard

```bash
cd dashboard
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

**💓 Heartbeat Protocol — The pulse that protects DeFi.**
