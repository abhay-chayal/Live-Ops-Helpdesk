'use client';

import { useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTicketStore } from '@/store/ticketStore';
import { useSocket } from '@/hooks/useSocket';
import { TicketRow } from './TicketRow';
import { TicketModal } from './TicketModal';
import { TicketSkeleton } from './TicketSkeleton';

interface TicketBoardProps {
  agentName: string;
}

const COLUMNS = [
  { label: 'Ticket ID', width: 'w-28' },
  { label: 'Priority', width: 'w-28' },
  { label: 'Customer', width: 'w-40' },
  { label: 'Issue', width: '' },
  { label: 'Status', width: 'w-32' },
  { label: 'Assigned To', width: 'w-32' },
  { label: 'Lock', width: 'w-40' },
  { label: 'Updated', width: 'w-24 text-right' },
  { label: '', width: 'w-24' },
];

// Track which ticket IDs are "new" (arrived after initial load)
const seenTicketIds = new Set<string>();

export function TicketBoard({ agentName }: TicketBoardProps) {
  const { tickets, loading } = useTicketStore();
  const initialLoadDone = useRef(false);

  // Bind all socket events — only registers once
  useSocket({ agentName });

  // Mark newly arrived tickets for the flash animation
  const ticketsWithNewFlag = tickets.map((t) => {
    const isNew = initialLoadDone.current && !seenTicketIds.has(t.id);
    seenTicketIds.add(t.id);
    return { ticket: t, isNew };
  });

  // After first render with data, set the flag
  if (!loading && !initialLoadDone.current) {
    tickets.forEach((t) => seenTicketIds.add(t.id));
    initialLoadDone.current = true;
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-white">Active Support Queue</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {loading ? 'Connecting...' : `${tickets.length} tickets — updates in real-time`}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Live stream active
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[900px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
              {COLUMNS.map((col, i) => (
                <th
                  key={i}
                  className={`px-6 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider first:pl-6 ${col.width}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9}>
                  <TicketSkeleton />
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-20 text-center text-slate-600">
                  <div className="text-4xl mb-3">🎯</div>
                  <p className="text-sm">No active tickets — queue is clear.</p>
                </td>
              </tr>
            ) : (
              <AnimatePresence initial={false}>
                {ticketsWithNewFlag.map(({ ticket, isNew }) => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    agentName={agentName}
                    isNew={isNew}
                  />
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal (portal would be ideal; keeping it here for simplicity) */}
      <TicketModal agentName={agentName} />
    </div>
  );
}
