/**
 * Wagmi Configuration
 * Wallet connection setup for Heartbeat Protocol
 */

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrumSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Heartbeat Protocol',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '3fcc6bba2d1de96240f1bb5e6f31a547',
  chains: [arbitrumSepolia],
  ssr: true,
});
