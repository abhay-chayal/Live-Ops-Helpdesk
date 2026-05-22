'use client';

import { useTicketStore } from '@/store/ticketStore';
import { agentColor, agentInitials } from '@/utils/formatters';

interface HeaderProps {
  agentName: string;
}

export function Header({ agentName }: HeaderProps) {
  const { socketConnected, agentPresence, tickets, locks } = useTicketStore();
  const lockedCount = Object.keys(locks).length;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50">
      <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* ── Brand ── */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">LIVE OPS HELPDESK</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Real-time Support Platform</p>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="hidden md:flex items-center gap-6">
          <Stat label="Active Tickets" value={tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length} />
          <Stat label="Locked" value={lockedCount} accent={lockedCount > 0} />
          <Stat label="Online Agents" value={agentPresence.length} />
        </div>

        {/* ── Right side ── */}
        <div className="flex items-center gap-4">
          {/* Agent presence avatars */}
          <div className="flex -space-x-2">
            {agentPresence.slice(0, 5).map((agent) => (
              <div
                key={agent.socketId}
                title={agent.agentName}
                className={`h-7 w-7 rounded-full ${agentColor(agent.agentName)} border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white`}
              >
                {agentInitials(agent.agentName)}
              </div>
            ))}
            {agentPresence.length > 5 && (
              <div className="h-7 w-7 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-[10px] text-slate-400">
                +{agentPresence.length - 5}
              </div>
            )}
          </div>

          {/* My agent badge */}
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
            <div className={`h-5 w-5 rounded-full ${agentColor(agentName)} flex items-center justify-center text-[9px] font-bold text-white`}>
              {agentInitials(agentName)}
            </div>
            <span className="text-xs text-slate-300 font-medium">{agentName}</span>
          </div>

          {/* Live indicator */}
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
            socketConnected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${socketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            {socketConnected ? 'LIVE' : 'OFFLINE'}
          </div>
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="text-center">
      <div className={`text-xl font-bold tabular-nums ${accent ? 'text-amber-400' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}
