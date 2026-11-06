/**
 * Root Layout
 * Heartbeat Protocol - Real-time DeFi Vital Defense System
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Heartbeat Protocol | Autonomous DeFi Vital Defense',
  description: 'AI-powered telemetry monitoring, arrhythmia detection, and automated resuscitation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
