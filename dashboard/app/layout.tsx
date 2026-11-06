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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Prevent multi-wallet extension collision (e.g. Phantom vs MetaMask)
              (function() {
                try {
                  var _eth = window.ethereum;
                  Object.defineProperty(window, 'ethereum', {
                    configurable: true,
                    enumerable: true,
                    get: function() { return _eth; },
                    set: function(v) { _eth = v; }
                  });
                } catch(e) {}
                
                // Suppress browser extension injection errors from triggering Next.js dev overlay
                window.addEventListener('error', function(e) {
                  if (
                    (e.filename && e.filename.indexOf('chrome-extension://') !== -1) ||
                    (e.message && e.message.indexOf('Cannot redefine property: ethereum') !== -1)
                  ) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
