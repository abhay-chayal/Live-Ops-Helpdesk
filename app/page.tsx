'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { TicketBoard } from '@/components/tickets/TicketBoard';

// Agent name is passed via ?agent=name for demo multi-tab setup.
// Default: "Agent Alpha" — override with ?agent=YourName
function DashboardContent() {
  const params = useSearchParams();
  const agentName = params.get('agent') || 'Agent Alpha';

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header agentName={agentName} />
      <main className="flex-1 overflow-hidden flex flex-col">
        <TicketBoard agentName={agentName} />
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-slate-400 text-sm">Connecting to Live Ops Server...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
