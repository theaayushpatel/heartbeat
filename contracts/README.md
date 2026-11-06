# Heartbeat Protocol - Smart Contracts

Foundry-based Solidity smart contracts for autonomous DeFi vital defense and emergency resuscitation.

## Contracts

- **HeartbeatGuardian.sol** - Executes emergency fund resuscitation when cardiac arrest or severe arrhythmias are detected
- **VitalRegistry.sol** - Immutable onchain audit trail (The Cardiogram) of all detections and actions
- **ArrhythmicVault.sol** - Mock protocol with reentrancy flaw (for testing & demo)

## Setup

```bash
# Build
forge build

# Test
forge test -vvv

# Deploy
forge script script/Deploy.s.sol --rpc-url $ARBITRUM_SEPOLIA_RPC --broadcast --verify
```

## Structure

```
contracts/
├── src/
│   ├── HeartbeatGuardian.sol        # Defibrillator rescue executor
│   ├── VitalRegistry.sol            # The Cardiogram onchain log
│   ├── interfaces/
│   │   └── IVitalRegistry.sol       # Vital registry interface
│   └── mocks/
│       └── ArrhythmicVault.sol      # Vulnerable demo protocol
├── script/
│   └── Deploy.s.sol                 # Deployment script
└── test/
    ├── HeartbeatGuardian.t.sol      # 19 tests
    ├── VitalRegistry.t.sol          # 14 tests
    └── ArrhythmicVault.t.sol        # 8 tests (incl. reentrancy exploit demo)
```
