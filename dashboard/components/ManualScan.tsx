'use client';

/**
 * ManualScan Component
 * Enables ad-hoc vital diagnostics, scanning contracts against VitalRegistry, and triggering test defibrillations
 */

import { useState, useMemo } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { Search, Shield, AlertTriangle, ExternalLink, Plus, ChevronDown, ChevronUp, Zap, Activity, HeartPulse } from 'lucide-react';
import { contracts } from '@/lib/contracts';

const RISK_LEVEL_LABELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const ACTION_TYPE_LABELS = ['ALERT', 'WITHDRAWAL', 'GOVERNANCE_PROPOSAL'] as const;

const RISK_STYLES: Record<string, { badge: string; text: string; border: string; bg: string }> = {
  CRITICAL: { badge: 'bg-rose-500 text-white', text: 'text-rose-400', border: 'border-rose-500/50', bg: 'bg-rose-950/20' },
  HIGH:     { badge: 'bg-amber-500 text-black', text: 'text-amber-400', border: 'border-amber-500/50', bg: 'bg-amber-950/20' },
  MEDIUM:   { badge: 'bg-yellow-500/20 text-yellow-300', text: 'text-yellow-400', border: 'border-yellow-500/40', bg: 'bg-yellow-950/20' },
  LOW:      { badge: 'bg-cyan-500/20 text-cyan-300', text: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-950/20' },
};

const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

interface ManualScanProps {
  totalChronicleEvents?: number;
  onAddToWatchlist?: (address: string, name: string) => void;
}

export function ManualScan({ totalChronicleEvents = 50, onAddToWatchlist }: ManualScanProps) {
  const { isConnected } = useAccount();

  const [inputAddr, setInputAddr]       = useState('');
  const [scanAddr, setScanAddr]         = useState('');
  const [inputError, setInputError]     = useState('');
  const [expandedIds, setExpandedIds]   = useState<Set<number>>(new Set());

  const [showRecordForm, setShowRecordForm] = useState(false);
  const [riskLevelSel, setRiskLevelSel]     = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [actionTypeSel, setActionTypeSel]   = useState<'ALERT' | 'WITHDRAWAL' | 'GOVERNANCE_PROPOSAL'>('ALERT');
  const [exploitPattern, setExploitPattern] = useState('');

  const { writeContract, data: txHash, isPending, isError, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const fetchLimit = Math.max(totalChronicleEvents, 50);
  const { data: allEventsRaw, isFetching, refetch: refetchScan } = useReadContract({
    ...contracts.riskRegistry,
    functionName: 'getRecentEvents',
    args: [BigInt(0), BigInt(fetchLimit)],
    query: { enabled: !!scanAddr },
  });

  const protocolEvents = useMemo(() => {
    if (!allEventsRaw || !scanAddr) return [];
    return (allEventsRaw as any[])
      .filter((e: any) => e.protocol?.toLowerCase() === scanAddr.toLowerCase())
      .map((e: any, i: number) => ({
        id: Number(e.eventId ?? i),
        riskLevel: RISK_LEVEL_LABELS[Number(e.riskLevel)] ?? 'LOW',
        actionType: ACTION_TYPE_LABELS[Number(e.actionType)] ?? 'ALERT',
        timestamp: new Date(Number(e.timestamp) * 1000),
        exploitPattern: e.exploitPattern as string,
        amount: e.amount ? e.amount.toString() : '0',
      }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [allEventsRaw, scanAddr]);

  const riskCounts = useMemo(() => ({
    CRITICAL: protocolEvents.filter((e) => e.riskLevel === 'CRITICAL').length,
    HIGH:     protocolEvents.filter((e) => e.riskLevel === 'HIGH').length,
    MEDIUM:   protocolEvents.filter((e) => e.riskLevel === 'MEDIUM').length,
    LOW:      protocolEvents.filter((e) => e.riskLevel === 'LOW').length,
  }), [protocolEvents]);

  const highestRisk = protocolEvents.length === 0
    ? null
    : riskCounts.CRITICAL > 0 ? 'CRITICAL' : riskCounts.HIGH > 0 ? 'HIGH' : riskCounts.MEDIUM > 0 ? 'MEDIUM' : 'LOW';

  function handleScan() {
    setInputError('');
    const trimmed = inputAddr.trim();
    if (!trimmed.match(/^0x[0-9a-fA-F]{40}$/)) {
      setInputError('Invalid Ethereum address format (0x…40 hex characters)');
      return;
    }
    setScanAddr(trimmed);
  }

  function handleRecordThreat() {
    if (!scanAddr) return;
    const riskNum   = RISK_LEVEL_LABELS.indexOf(riskLevelSel);
    const actionNum = ACTION_TYPE_LABELS.indexOf(actionTypeSel);
    const pattern   = exploitPattern.trim() || `Manual vital scan: ${riskLevelSel} arrhythmia detected`;

    writeContract({
      ...contracts.riskRegistry,
      functionName: 'recordThreat',
      args: [
        scanAddr as `0x${string}`,
        ETH_ADDRESS as `0x${string}`,
        BigInt(0),
        riskNum as unknown as never,
        actionNum as unknown as never,
        pattern,
      ],
    });
  }

  return (
    <div className="border border-white/10 rounded-xl p-6 bg-[#0f1422]/90 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-rose-500" />
            Ad-Hoc Vital Diagnostics & Anomaly Ingestion
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Query The Cardiogram for any protocol address or record verified arrhythmia telemetry
          </p>
        </div>
      </div>

      {/* Address Input */}
      <div className="flex gap-2 mb-4">
        <input
          value={inputAddr}
          onChange={(e) => { setInputAddr(e.target.value); setInputError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleScan()}
          placeholder="Enter protocol address to diagnose (0x...)"
          className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/60 transition-colors"
        />
        <button
          onClick={handleScan}
          disabled={isFetching}
          className="bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg px-5 py-2.5 text-sm flex items-center gap-2 transition-all shadow-lg shadow-rose-600/20"
        >
          <Search className="w-4 h-4" />
          {isFetching ? 'Scanning…' : 'Diagnose'}
        </button>
      </div>

      {inputError && (
        <p className="text-xs text-rose-400 mb-4">{inputError}</p>
      )}

      {/* Scanned Protocol Health Report */}
      {scanAddr && (
        <div className="mt-4 border border-white/10 rounded-xl p-4 bg-black/30 space-y-4">
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
              <span className="text-xs text-slate-400">Target Protocol:</span>
              <p className="font-mono text-sm text-cyan-400">{scanAddr}</p>
            </div>
            {highestRisk ? (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${RISK_STYLES[highestRisk]?.badge}`}>
                {highestRisk} ARRHYTHMIA DETECTED
              </span>
            ) : (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                NORMAL RHYTHM (0 INCIDENTS)
              </span>
            )}
          </div>

          {onAddToWatchlist && (
            <button
              onClick={() => onAddToWatchlist(scanAddr, `Vault-${scanAddr.slice(2, 6)}`)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add to Vital Watchlist
            </button>
          )}

          {protocolEvents.length > 0 && (
            <div className="space-y-2 mt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Telemetry Log ({protocolEvents.length} events)
              </p>
              {protocolEvents.map((evt) => (
                <div key={evt.id} className="p-3 bg-black/40 rounded-lg border border-white/5 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-bold ${RISK_STYLES[evt.riskLevel]?.text}`}>{evt.riskLevel}</span>
                    <span className="text-slate-500 font-mono text-[11px]">{evt.timestamp.toLocaleString()}</span>
                  </div>
                  <p className="text-slate-300">{evt.exploitPattern}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
