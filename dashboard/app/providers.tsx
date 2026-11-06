'use client';

/**
 * Providers Component
 * Sets up Wagmi, RainbowKit, and React Query for Heartbeat dashboard
 */

import { useState, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { config } from '@/lib/wagmi';
import '@rainbow-me/rainbowkit/styles.css';

// Prevent browser extension collision errors from crashing dev overlay
if (typeof window !== 'undefined') {
  window.addEventListener(
    'error',
    (event) => {
      if (
        event.filename?.includes('chrome-extension://') ||
        event.message?.includes('Cannot redefine property: ethereum')
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    },
  },
});

// Custom Heartbeat theme for RainbowKit
const heartbeatTheme = darkTheme({
  accentColor: '#e11d48', // Heartbeat Crimson
  accentColorForeground: '#ffffff',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={heartbeatTheme}>
          {mounted ? children : <div className="min-h-screen bg-[#0a0d14]" />}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
