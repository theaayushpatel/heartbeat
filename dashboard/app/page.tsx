'use client';

import { Header } from '@/components/Header';
import { ProtocolCard } from '@/components/ProtocolCard';
import { RiskTimeline } from '@/components/RiskTimeline';
import { AlertCenter } from '@/components/AlertCenter';
import { ManualScan } from '@/components/ManualScan';
import { Activity, ShieldCheck, Plus, X, Search, RefreshCw, HeartPulse, Zap, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { contracts } from '@/lib/contracts';

const RISK_LEVEL_LABELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const ACTION_TYPE_LABELS = ['ALERT', 'WITHDRAWAL', 'GOVERNANCE_PROPOSAL'] as const;

interface Protocol {
  name: string;
  address: string;
  tvl: string;
  riskScore: number;
  lastCheck: Date;
  status: 'safe' | 'warning' | 'critical';
}

const DEFAULT_PROTOCOLS: Protocol[] = [
  {
    name: 'Arrhythmic Vault',
    address: '0x642f1bd9490C2A87C8Cd891E8E2F5EcB8cC03D45',
    tvl: '1000000',
    riskScore: 2,
    lastCheck: new Date(0),
    status: 'safe',
  },
];

export default function Home() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [protocols, setProtocols] = useState<Protocol[]>(DEFAULT_PROTOCOLS);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [newAddr, setNewAddr]   = useState('');
  const [newName, setNewName]   = useState('');
  const [newTvl, setNewTvl]     = useState('');
  const [addError, setAddError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    setLastRefresh(new Date());
    setProtocols((prev) => prev.map((p) => ({ ...p, lastCheck: new Date() })));
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Live chain reads ──────────────────────────────────────────────────────
  const { data: eventCount, refetch: refetchCount } = useReadContract({
    ...contracts.riskRegistry,
    functionName: 'eventCount',
    query: { refetchInterval: 30000, staleTime: 0, gcTime: 0 },
  });

  const { data: recentEventsRaw, refetch: refetchEvents } = useReadContract({
    ...contracts.riskRegistry,
    functionName: 'getRecentEvents',
    args: [BigInt(0), BigInt(20)],
    query: { refetchInterval: 30000, staleTime: 0, gcTime: 0 },
  });

  function handleRefresh() {
    refetchCount();
    refetchEvents();
    setLastRefresh(new Date());
    setProtocols((prev) => prev.map((p) => ({ ...p, lastCheck: new Date() })));
  }

  // ── Sync protocol risk scores from on-chain events ────────────────────────
  useEffect(() => {
    if (!recentEventsRaw) return;
    const events = recentEventsRaw as any[];
    const RISK_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    setProtocols((prevProtocols) =>
      prevProtocols.map((p) => {
        const matching = events.filter(
          (e: any) => e.protocol?.toLowerCase() === p.address.toLowerCase()
        );
        if (matching.length === 0) return p;

        const maxLevelIdx = matching.reduce((max: number, e: any) => {
          const idx = Number(e.riskLevel);
          return idx > max ? idx : max;
        }, 0);

        const calculatedScore = maxLevelIdx === 3 ? 9 : maxLevelIdx === 2 ? 7 : maxLevelIdx === 1 ? 5 : 2;
        const status: Protocol['status'] =
          calculatedScore >= 8 ? 'critical' : calculatedScore >= 5 ? 'warning' : 'safe';

        return {
          ...p,
          riskScore: calculatedScore,
          status,
          lastCheck: new Date(),
        };
      })
    );
  }, [recentEventsRaw]);

  // ── Format timeline events ───────────────────────────────────────────────
  const timelineEvents = (recentEventsRaw ? (recentEventsRaw as any[]) : []).map((e: any, i: number) => ({
    id: Number(e.eventId ?? i),
    protocol: e.protocol as string,
    riskLevel: (RISK_LEVEL_LABELS[Number(e.riskLevel)] ?? 'LOW') as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    actionType: (ACTION_TYPE_LABELS[Number(e.actionType)] ?? 'ALERT') as 'ALERT' | 'WITHDRAWAL' | 'GOVERNANCE_PROPOSAL',
    timestamp: new Date(Number(e.timestamp) * 1000),
    exploitPattern: e.exploitPattern as string,
    amount: e.amount ? e.amount.toString() : '0',
  }));

  // ── Format alert center alerts ────────────────────────────────────────────
  const recentAlerts = timelineEvents.slice(0, 10).map((e) => ({
    id: String(e.id),
    protocol: e.protocol,
    severity: (e.riskLevel.toLowerCase() as 'critical' | 'high' | 'medium' | 'low'),
    message: `${e.exploitPattern || 'Vital anomaly detected'} — ${e.actionType}`,
    timestamp: e.timestamp,
  }));

  const totalEvents = eventCount ? Number(eventCount) : timelineEvents.length;

  function handleAddProtocol() {
    setAddError('');
    const trimmed = newAddr.trim();
    if (!trimmed.match(/^0x[0-9a-fA-F]{40}$/)) {
      setAddError('Invalid Ethereum address format');
      return;
    }
    if (protocols.some((p) => p.address.toLowerCase() === trimmed.toLowerCase())) {
      setAddError('Protocol is already in watchlist');
      return;
    }
    const cleanTvl = newTvl.replace(/[^0-9]/g, '') || '500000';
    setProtocols((prev) => [
      ...prev,
      {
        name: newName.trim() || `Protocol ${trimmed.slice(0, 6)}…`,
        address: trimmed,
        tvl: cleanTvl,
        riskScore: 1,
        lastCheck: new Date(),
        status: 'safe',
      },
    ]);
    setNewAddr('');
    setNewName('');
    setNewTvl('');
    setShowAddPanel(false);
  }

  function addToWatchlist(address: string, name: string) {
    if (protocols.some((p) => p.address.toLowerCase() === address.toLowerCase())) return;
    setProtocols((prev) => [
      ...prev,
      {
        name,
        address,
        tvl: '500000',
        riskScore: 1,
        lastCheck: new Date(),
        status: 'safe',
      },
    ]);
  }

  function removeProtocol(address: string) {
    setProtocols((prev) => prev.filter((p) => p.address.toLowerCase() !== address.toLowerCase()));
  }

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-200">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Vital Health Banner */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-rose-950/40 via-[#121726]/80 to-cyan-950/30 border border-rose-500/20 backdrop-blur-md relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                <span className="text-xs uppercase tracking-widest font-mono font-bold text-rose-400">
                  REAL-TIME TELEMETRY DEFENSE
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Autonomous Vital Defense Engine
              </h2>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Continuous onchain vital telemetry, AI-driven arrhythmia detection, and sub-30 second emergency defibrillation before exploit drain.
              </p>
            </div>

            {/* Quick KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-mono">Protected TVL</p>
                <p className="text-base font-bold font-mono text-white">$1,000,000</p>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-mono">Protocols</p>
                <p className="text-base font-bold font-mono text-cyan-400">{protocols.length}</p>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-mono">Vital Events</p>
                <p className="text-base font-bold font-mono text-rose-400">{totalEvents}</p>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-mono">Response Time</p>
                <p className="text-base font-bold font-mono text-emerald-400">&lt; 30s</p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mb-6 border border-white/10 rounded-xl p-4 bg-[#0f1422]/80 backdrop-blur-sm flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <HeartPulse className="w-6 h-6 text-rose-500 animate-pulse" />
            <div>
              <p className="font-bold text-white text-sm flex items-center gap-2">
                PULSE MONITOR ACTIVE
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  NORMAL RHYTHM
                </span>
              </p>
              <p className="text-xs text-slate-400 font-mono">
                {protocols.length} protocols monitored &mdash; {totalEvents} telemetry events logged &mdash; last pulse {lastRefresh?.toLocaleTimeString() ?? '—'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={`https://sepolia.arbiscan.io/address/${contracts.guardian.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs border border-white/10 text-slate-300 hover:text-rose-400 hover:border-rose-500/40 transition-all rounded-lg px-3 py-1.5 bg-white/5"
            >
              HeartbeatGuardian ↗
            </a>
            <a
              href={`https://sepolia.arbiscan.io/address/${contracts.riskRegistry.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs border border-white/10 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-all rounded-lg px-3 py-1.5 bg-white/5"
            >
              VitalRegistry ↗
            </a>
            <button
              onClick={handleRefresh}
              className="text-xs border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 transition-all rounded-lg px-3 py-1.5 flex items-center gap-1.5 font-semibold"
            >
              <RefreshCw className="w-3 h-3" /> Refresh Pulse
            </button>
          </div>
        </div>

        {/* Arrhythmia Alert Center */}
        <div className="mb-6" id="resuscitation">
          <AlertCenter alerts={recentAlerts} />
        </div>

        {/* Monitored Protocols Section */}
        <div className="mb-6" id="monitor">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" /> Monitored DeFi Protocols
              <span className="text-sm font-normal text-slate-400">({protocols.length})</span>
            </h2>
            <button
              onClick={() => { setShowAddPanel(!showAddPanel); setAddError(''); }}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 hover:border-rose-500 transition-all"
            >
              {showAddPanel ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Protocol</>}
            </button>
          </div>

          {/* Add Protocol Panel */}
          {showAddPanel && (
            <div className="mb-4 border border-rose-500/30 rounded-xl p-5 bg-rose-950/10 space-y-3">
              <p className="text-sm font-semibold text-rose-300">Add Protocol to Vital Telemetry Watchlist</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  value={newAddr}
                  onChange={(e) => setNewAddr(e.target.value)}
                  placeholder="Contract address (0x...)"
                  className="col-span-1 sm:col-span-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-rose-500"
                />
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Protocol name"
                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
                <input
                  value={newTvl}
                  onChange={(e) => setNewTvl(e.target.value)}
                  placeholder="TVL e.g. 1,000,000"
                  className="col-span-1 sm:col-span-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-rose-500"
                />
                <button
                  onClick={handleAddProtocol}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-600/20"
                >
                  <Search className="w-4 h-4" /> Add & Monitor
                </button>
              </div>
              {addError && <p className="text-xs text-rose-400">❌ {addError}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {protocols.map((protocol) => (
              <div key={protocol.address} className="relative group">
                <button
                  onClick={() => removeProtocol(protocol.address)}
                  className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-700 flex items-center justify-center shadow-lg"
                  title="Remove from watchlist"
                >
                  &times;
                </button>
                <ProtocolCard {...protocol} />
              </div>
            ))}
          </div>
        </div>

        {/* The Cardiogram Timeline */}
        <div id="cardiogram" className="mb-6">
          <RiskTimeline events={timelineEvents} />
        </div>

        {/* Ad-Hoc Vital Diagnostics */}
        <div id="diagnostics" className="mb-6">
          <ManualScan
            totalChronicleEvents={totalEvents || 50}
            onAddToWatchlist={addToWatchlist}
          />
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-slate-500 space-y-1.5 border-t border-white/5 pt-6">
          <p className="font-medium text-slate-400">💓 Heartbeat Protocol — Autonomous DeFi Vital Defense & Emergency Resuscitation</p>
          <p className="font-mono text-[11px]">
            Guardian: <a href={`https://sepolia.arbiscan.io/address/${contracts.guardian.address}`} target="_blank" rel="noopener noreferrer" className="text-rose-400/80 hover:text-rose-300">{contracts.guardian.address ? `${contracts.guardian.address.slice(0, 10)}…` : 'Not deployed'}</a>
            &nbsp;|&nbsp;
            VitalRegistry: <a href={`https://sepolia.arbiscan.io/address/${contracts.riskRegistry.address}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400/80 hover:text-cyan-300">{contracts.riskRegistry.address ? `${contracts.riskRegistry.address.slice(0, 10)}…` : 'Not deployed'}</a>
          </p>
        </div>
      </main>
    </div>
  );
}
