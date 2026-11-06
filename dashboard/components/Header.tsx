'use client';

/**
 * Header Component
 * Navigation and wallet connection for Heartbeat Protocol dashboard
 */

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Activity, Heart } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-rose-500/20 bg-[#0a0d14]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center">
              <Heart className="w-8 h-8 text-rose-500 fill-rose-500/20 animate-pulse" />
              <Activity className="w-4 h-4 text-cyan-400 absolute" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold bg-gradient-to-r from-rose-500 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
                  Heartbeat Protocol
                </h1>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  LIVE TELEMETRY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Autonomous DeFi Vital Defense & Resuscitation
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <a
              href="#monitor"
              className="text-slate-300 hover:text-rose-400 transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              <Activity className="w-4 h-4 text-rose-500" />
              Pulse Monitor
            </a>
            <a
              href="#cardiogram"
              className="text-slate-300 hover:text-rose-400 transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              The Cardiogram
            </a>
            <a
              href="#resuscitation"
              className="text-slate-300 hover:text-rose-400 transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              Resuscitation
            </a>
          </nav>

          {/* Wallet Connection */}
          <div>
            <ConnectButton
              chainStatus="icon"
              showBalance={false}
              accountStatus="address"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
