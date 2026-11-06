'use client';

/**
 * ProtocolCard Component
 * Displays real-time vital health telemetry, BPM, and emergency defibrillation controls
 */

import { Activity, AlertTriangle, ShieldCheck, ExternalLink, Zap, Clock, HeartPulse } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { contracts } from '@/lib/contracts';

interface ProtocolCardProps {
  name: string;
  address: string;
  tvl: string;
  riskScore: number;
  lastCheck: Date;
  status: 'safe' | 'warning' | 'critical';
}

const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export function ProtocolCard({ name, address, tvl, riskScore, lastCheck, status }: ProtocolCardProps) {
  const { isConnected } = useAccount();
  const [selectedRisk, setSelectedRisk] = useState<'HIGH' | 'CRITICAL'>('CRITICAL');
  const [showWithdrawPanel, setShowWithdrawPanel] = useState(false);

  const { writeContract, data: txHash, isPending, isError, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const statusConfig = useMemo(() => {
    switch (status) {
      case 'critical':
        return {
          border: 'border-rose-500/60',
          bg: 'bg-rose-950/20',
          icon: <HeartPulse className="w-6 h-6 text-rose-500 animate-pulse" />,
          label: 'CARDIAC ARREST',
          labelColor: 'text-rose-400',
          badgeBg: 'bg-rose-500 text-white',
          bpm: '185 BPM (Critical)',
        };
      case 'warning':
        return {
          border: 'border-amber-500/60',
          bg: 'bg-amber-950/20',
          icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
          label: 'ARRHYTHMIA',
          labelColor: 'text-amber-400',
          badgeBg: 'bg-amber-500 text-black',
          bpm: '135 BPM (Elevated)',
        };
      default:
        return {
          border: 'border-emerald-500/40',
          bg: 'bg-emerald-950/10',
          icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
          label: 'NORMAL RHYTHM',
          labelColor: 'text-emerald-400',
          badgeBg: 'bg-emerald-500 text-black',
          bpm: '72 BPM (Stable)',
        };
    }
  }, [status]);

  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const arbiscanUrl = `https://sepolia.arbiscan.io/address/${address}`;

  function handleEmergencyWithdraw() {
    const riskLevelNum = selectedRisk === 'CRITICAL' ? 3 : 2;
    writeContract({
      ...contracts.guardian,
      functionName: 'emergencyWithdraw',
      args: [address as `0x${string}`, ETH_ADDRESS as `0x${string}`, BigInt(0), riskLevelNum as unknown as never],
    });
  }

  return (
    <div className={`border rounded-xl p-5 transition-all hover:shadow-2xl hover:border-opacity-80 backdrop-blur-sm ${statusConfig.border} ${statusConfig.bg}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-base font-bold text-white truncate">{name}</h3>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${statusConfig.badgeBg}`}>
              {statusConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <code className="text-xs text-slate-400 font-mono">{shortAddress}</code>
            <a
              href={arbiscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-rose-400 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <div className="shrink-0 p-2 rounded-lg bg-black/40 border border-white/5">
          {statusConfig.icon}
        </div>
      </div>

      {/* Vital Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-black/30 border border-white/5 rounded-lg p-2.5">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-0.5">Protected TVL</p>
          <p className="text-lg font-bold font-mono text-white">${parseInt(tvl).toLocaleString()}</p>
        </div>
        <div className="bg-black/30 border border-white/5 rounded-lg p-2.5">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-0.5">Vital Rhythm</p>
          <p className="text-sm font-semibold font-mono text-cyan-400">{statusConfig.bpm}</p>
        </div>
      </div>

      {/* Anomaly Score Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-400">Arrhythmia Severity</span>
          <span className={`font-bold font-mono ${riskScore >= 7 ? 'text-rose-400' : riskScore >= 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {riskScore} / 10
          </span>
        </div>
        <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              riskScore >= 8 ? 'bg-gradient-to-r from-rose-600 to-rose-400' :
              riskScore >= 5 ? 'bg-gradient-to-r from-amber-500 to-amber-300' :
              'bg-gradient-to-r from-emerald-600 to-emerald-400'
            }`}
            style={{ width: `${(riskScore / 10) * 100}%` }}
          />
        </div>
      </div>

      {/* Last Telemetry Check */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/10 mb-3">
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Last telemetry pulse:</span>
        </div>
        <span className="font-mono text-slate-300">{lastCheck.toLocaleTimeString()}</span>
      </div>

      {/* Emergency Defibrillator Controls */}
      <div className="pt-2">
        {!showWithdrawPanel ? (
          <button
            onClick={() => setShowWithdrawPanel(true)}
            className="w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/60 transition-all"
          >
            <Zap className="w-3.5 h-3.5 text-rose-400" />
            Emergency Defibrillation Action
          </button>
        ) : (
          <div className="bg-black/50 border border-rose-500/40 rounded-lg p-3 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-rose-300">Defibrillator Rescue</span>
              <button
                onClick={() => { setShowWithdrawPanel(false); reset(); }}
                className="text-[10px] text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedRisk('HIGH')}
                className={`py-1.5 px-2 rounded text-[11px] font-semibold border transition-all ${
                  selectedRisk === 'HIGH'
                    ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                Partial (80%)
              </button>
              <button
                onClick={() => setSelectedRisk('CRITICAL')}
                className={`py-1.5 px-2 rounded text-[11px] font-semibold border transition-all ${
                  selectedRisk === 'CRITICAL'
                    ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                Defibrillate (100%)
              </button>
            </div>

            <button
              onClick={handleEmergencyWithdraw}
              disabled={isPending || isConfirming || !isConnected}
              className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                !isConnected
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : isPending || isConfirming
                  ? 'bg-rose-800 text-white animate-pulse'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
              }`}
            >
              {!isConnected
                ? 'Connect Wallet to Defibrillate'
                : isPending
                ? 'Confirming Transaction…'
                : isConfirming
                ? 'Resuscitating Onchain…'
                : isSuccess
                ? 'Resuscitation Complete!'
                : `Execute ${selectedRisk} Rescue`}
            </button>

            {isError && (
              <p className="text-[11px] text-rose-400 text-center">
                {error?.message.includes('User rejected')
                  ? 'Transaction rejected'
                  : 'Transaction reverted (Check permissions)'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
