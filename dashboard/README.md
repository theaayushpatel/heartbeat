# Heartbeat Protocol - Dashboard

Next.js 14 dashboard for monitoring real-time DeFi vital health, protocol arrhythmias, and resuscitation actions.

## Features

- Real-time protocol health & BPM monitoring
- The Cardiogram (vital timeline with all onchain detections & actions)
- Critical arrhythmia alert aggregation
- Non-blocking Web3 wallet connection with RainbowKit
- Heartbeat sleek dark telemetry theme (obsidian, crimson, cyan)

## Setup

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build
npm start
```

## Structure

```
dashboard/
├── app/
│   ├── page.tsx          # Main telemetry monitoring dashboard
│   ├── layout.tsx        # App layout
│   ├── providers.tsx     # Web3 and Query providers
│   └── globals.css       # Heartbeat custom styles & pulse animations
├── components/
│   ├── Header.tsx        # Vital telemetry header
│   ├── ProtocolCard.tsx  # Protocol vital health card
│   ├── RiskTimeline.tsx  # The Cardiogram timeline
│   ├── AlertCenter.tsx   # Critical arrhythmia alerts
│   └── ManualScan.tsx    # On-demand vital diagnostics trigger
└── lib/
    ├── wagmi.ts          # Wagmi client configuration
    └── contracts.ts      # HeartbeatGuardian & VitalRegistry ABIs
```
