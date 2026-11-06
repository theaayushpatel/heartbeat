'use client';

/**
 * AlertCenter Component
 * Real-time arrhythmia & threat aggregation for Heartbeat Protocol
 */

import { Activity, AlertTriangle, CheckCircle, ExternalLink, HeartCrack, Info } from 'lucide-react';
import { useState } from 'react';

export interface Alert {
  id: string;
  protocol: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: Date;
  actionTaken?: string;
  txHash?: string;
}

interface AlertCenterProps {
  alerts: Alert[];
}

const SEVERITY_STYLES = {
  critical: {
    border: 'border-rose-500/50',
    bg: 'bg-rose-950/20',
    text: 'text-rose-400',
    badge: 'bg-rose-500 text-white',
  },
  high: {
    border: 'border-amber-500/50',
    bg: 'bg-amber-950/20',
    text: 'text-amber-400',
    badge: 'bg-amber-500 text-black',
  },
  medium: {
    border: 'border-yellow-500/40',
    bg: 'bg-yellow-950/20',
    text: 'text-yellow-300',
    badge: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
  },
  low: {
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-950/20',
    text: 'text-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
  },
};

export function AlertCenter({ alerts }: AlertCenterProps) {
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const activeAlerts = alerts.filter((a) => !dismissed.has(a.id));
  const filteredAlerts = filter === 'all' ? activeAlerts : activeAlerts.filter((a) => a.severity === filter);

  const counts = {
    critical: activeAlerts.filter((a) => a.severity === 'critical').length,
    high: activeAlerts.filter((a) => a.severity === 'high').length,
    medium: activeAlerts.filter((a) => a.severity === 'medium').length,
    low: activeAlerts.filter((a) => a.severity === 'low').length,
  };

  function dismissAll() {
    setDismissed(new Set(activeAlerts.map((a) => a.id)));
  }

  return (
    <div className="border border-white/10 rounded-xl p-6 bg-[#0f1422]/90 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-rose-500 animate-pulse" />
          Vital Arrhythmia Center
        </h2>
        {activeAlerts.length > 0 && (
          <button
            onClick={dismissAll}
            className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1 border border-white/10 rounded-lg px-3 py-1.5 hover:border-white/20 bg-white/5"
          >
            <CheckCircle className="w-3 h-3 text-emerald-400" /> Dismiss all
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {(['critical', 'high', 'medium', 'low'] as const).map((sev) => (
          <button
            key={sev}
            onClick={() => setFilter(filter === sev ? 'all' : sev)}
            className={`rounded-lg p-3 text-center border transition-all ${
              filter === sev
                ? SEVERITY_STYLES[sev].border + ' ' + SEVERITY_STYLES[sev].bg
                : 'border-white/5 bg-black/30 hover:border-white/15'
            }`}
          >
            <p className={`text-2xl font-bold font-mono ${SEVERITY_STYLES[sev].text}`}>{counts[sev]}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 capitalize font-medium">{sev}</p>
          </button>
        ))}
      </div>

      {/* Filter indicator */}
      {filter !== 'all' && (
        <div className="flex items-center gap-2 mb-3 text-xs text-slate-400">
          <span>Filtering by rhythm:</span>
          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${SEVERITY_STYLES[filter].badge}`}>
            {filter.toUpperCase()}
          </span>
          <button onClick={() => setFilter('all')} className="text-rose-400 hover:underline">
            Clear
          </button>
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <HeartCrack className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              {filter !== 'all' ? `No ${filter} arrhythmias recorded` : 'All protocol vitals stable. Pulse Monitor is active.'}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const s = SEVERITY_STYLES[alert.severity];
            const shortAddr = alert.protocol.startsWith('0x')
              ? `${alert.protocol.slice(0, 6)}...${alert.protocol.slice(-4)}`
              : alert.protocol;
            return (
              <div key={alert.id} className={`border rounded-xl p-3 ${s.border} ${s.bg}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${s.text}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.badge}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1">
                          <code className="text-xs text-slate-300 font-mono">{shortAddr}</code>
                          {alert.protocol.startsWith('0x') && (
                            <a
                              href={`https://sepolia.arbiscan.io/address/${alert.protocol}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-white"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <p className={`text-xs ${s.text}`}>{alert.message}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[11px] font-mono text-slate-400">
                      {alert.timestamp.toLocaleTimeString()}
                    </span>
                    <button
                      onClick={() => setDismissed((prev) => new Set([...prev, alert.id]))}
                      className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {dismissed.size > 0 && (
        <button
          onClick={() => setDismissed(new Set())}
          className="mt-3 text-xs text-slate-500 hover:text-slate-300 transition-colors w-full text-center"
        >
          Restore {dismissed.size} dismissed alert{dismissed.size > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}
