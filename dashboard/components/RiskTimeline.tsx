'use client';

/**
 * RiskTimeline Component
 * The Cardiogram — immutable onchain audit trail of all vital anomalies and emergency defibrillations
 */

import { AlertTriangle, Shield, AlertCircle, Eye, ExternalLink, Filter, Activity, HeartCrack } from 'lucide-react';
import { useMemo, useState } from 'react';

interface RiskEvent {
  id: number;
  protocol: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actionType: 'ALERT' | 'WITHDRAWAL' | 'GOVERNANCE_PROPOSAL';
  timestamp: Date;
  exploitPattern: string;
  amount?: string;
}

interface RiskTimelineProps {
  events: RiskEvent[];
}

const RISK_STYLES: Record<string, { border: string; bg: string; badge: string }> = {
  CRITICAL: { border: 'border-rose-500/50', bg: 'bg-rose-950/20', badge: 'bg-rose-500 text-white' },
  HIGH:     { border: 'border-amber-500/50', bg: 'bg-amber-950/20', badge: 'bg-amber-500 text-black' },
  MEDIUM:   { border: 'border-yellow-500/40', bg: 'bg-yellow-950/20', badge: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' },
  LOW:      { border: 'border-cyan-500/30', bg: 'bg-cyan-950/20', badge: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' },
};

const ACTION_LABELS: Record<string, string> = {
  WITHDRAWAL: '⚡ Emergency Defibrillation',
  GOVERNANCE_PROPOSAL: '🏛️ Governance Protocol Alert',
  ALERT: '💓 Vital Arrhythmia Flagged',
};

export function RiskTimeline({ events }: RiskTimelineProps) {
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const filteredEvents = useMemo(() => {
    return [...events]
      .filter((e) => riskFilter === 'ALL' || e.riskLevel === riskFilter)
      .filter((e) => actionFilter === 'ALL' || e.actionType === actionFilter)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [events, riskFilter, actionFilter]);

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function getIcon(riskLevel: string, actionType: string) {
    if (actionType === 'WITHDRAWAL') return <Activity className="w-4 h-4 text-rose-500 animate-pulse" />;
    if (riskLevel === 'CRITICAL') return <HeartCrack className="w-4 h-4 text-rose-400" />;
    if (riskLevel === 'HIGH') return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    if (riskLevel === 'MEDIUM') return <AlertCircle className="w-4 h-4 text-yellow-300" />;
    return <Eye className="w-4 h-4 text-cyan-400" />;
  }

  return (
    <div className="border border-white/10 rounded-xl p-6 bg-[#0f1422]/90 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          📊 The Cardiogram
          <span className="text-xs text-slate-400 font-normal font-mono">Onchain Telemetry Log</span>
        </h2>
        <span className="text-xs text-slate-400 border border-white/10 rounded-full px-3 py-1 bg-white/5 font-mono">
          {filteredEvents.length} / {events.length} vital events
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Filter className="w-3 h-3" /> Severity:
        </div>
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((level) => (
          <button
            key={level}
            onClick={() => setRiskFilter(level)}
            className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all ${
              riskFilter === level
                ? level === 'ALL'
                  ? 'bg-rose-500 text-white'
                  : RISK_STYLES[level]?.badge ?? 'bg-slate-700 text-white'
                : 'border border-white/10 text-slate-400 hover:border-white/20'
            }`}
          >
            {level}
          </button>
        ))}
        <div className="flex items-center gap-1 text-xs text-slate-400 ml-2">Action:</div>
        {['ALL', 'WITHDRAWAL', 'ALERT', 'GOVERNANCE_PROPOSAL'].map((type) => (
          <button
            key={type}
            onClick={() => setActionFilter(type)}
            className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all ${
              actionFilter === type
                ? 'bg-cyan-500 text-black'
                : 'border border-white/10 text-slate-400 hover:border-white/20'
            }`}
          >
            {type === 'GOVERNANCE_PROPOSAL' ? 'GOV' : type}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Shield className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-400" />
            <p className="text-sm">No vital anomalies recorded. All protocols beating normally.</p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const s = RISK_STYLES[event.riskLevel] ?? RISK_STYLES.LOW;
            const isExpanded = expanded.has(event.id);
            const shortAddr = event.protocol.startsWith('0x')
              ? `${event.protocol.slice(0, 6)}...${event.protocol.slice(-4)}`
              : event.protocol;

            return (
              <div
                key={event.id}
                className={`border rounded-xl transition-all hover:shadow-md cursor-pointer ${s.border} ${s.bg}`}
                onClick={() => toggleExpand(event.id)}
              >
                <div className="flex items-start gap-3 p-3.5">
                  <div className="shrink-0 mt-0.5">{getIcon(event.riskLevel, event.actionType)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.badge}`}>
                          {event.riskLevel}
                        </span>
                        <div className="flex items-center gap-1">
                          <code className="text-xs text-slate-300 font-mono">{shortAddr}</code>
                          {event.protocol.startsWith('0x') && (
                            <a
                              href={`https://sepolia.arbiscan.io/address/${event.protocol}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-400 hover:text-white"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0">
                        {event.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-rose-300 font-semibold mb-1">
                      {ACTION_LABELS[event.actionType] ?? event.actionType}
                    </p>
                    {isExpanded && (
                      <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2 text-xs">
                        <p className="text-slate-300">{event.exploitPattern}</p>
                        {event.amount && (
                          <p className="text-rose-400 font-mono">Rescued Amount: {event.amount} ETH</p>
                        )}
                        <p className="text-slate-500 font-mono text-[11px]">{event.timestamp.toLocaleString()}</p>
                      </div>
                    )}
                    {!isExpanded && event.exploitPattern && (
                      <p className="text-xs text-slate-400 truncate">{event.exploitPattern}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
