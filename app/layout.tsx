import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { ConnectionBanner } from '@/components/layout/ConnectionBanner';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Live Ops Helpdesk | Real-Time Support Platform',
  description:
    'Commercial-grade collaborative support platform with real-time ticket locking, multi-agent presence, and live state synchronization.',
  keywords: ['helpdesk', 'real-time', 'support', 'socket.io', 'live ops'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#0a0f1a] text-slate-100 antialiased">
        {/* Fixed disconnect banner — always rendered, animates in/out */}
        <ConnectionBanner />

        {children}

        {/* Toast notifications */}
        <Toaster
          position="bottom-right"
          gutter={8}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 500,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
              style: {
                background: '#1e293b',
                border: '1px solid rgba(239,68,68,0.4)',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
