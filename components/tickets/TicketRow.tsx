'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Ticket } from '@/types';
import { useTicketStore } from '@/store/ticketStore';
import { useTicketActions } from '@/hooks/useTicketActions';
import { PriorityBadge } from './PriorityBadge';
import { LockBadge } from './LockBadge';
import { statusConfig, timeAgo } from '@/utils/formatters';

interface TicketRowProps {
  ticket: Ticket;
  agentName: string;
  isNew?: boolean;
}

export function TicketRow({ ticket, agentName, isNew = false }: TicketRowProps) {
  const locks = useTicketStore((s) => s.locks);
  const { openTicket } = useTicketActions(agentName);

  const lock = locks[ticket.id];
  const isLockedByMe = lock?.agentName === agentName;
  const isLockedByOther = lock && !isLockedByMe;

  const status = statusConfig[ticket.status];

  return (
    <motion.tr
      layout
      initial={isNew ? { opacity: 0, y: -20, backgroundColor: 'rgba(139,92,246,0.15)' } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0, backgroundColor: 'rgba(0,0,0,0)' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`group border-b border-slate-800/60 transition-colors duration-200 ${
        isLockedByOther
          ? 'bg-slate-800/40 opacity-60'
          : 'hover:bg-slate-800/30'
      }`}
    >
      {/* ID */}
      <td className="px-6 py-3.5 w-28">
        <span className="text-xs font-mono text-slate-400">{ticket.id}</span>
      </td>

      {/* Priority */}
      <td className="px-3 py-3.5 w-28">
        <PriorityBadge priority={ticket.priority} />
      </td>

      {/* Customer */}
      <td className="px-3 py-3.5 w-40">
        <span className="text-sm font-medium text-slate-200 truncate block max-w-[140px]">
          {ticket.customerName}
        </span>
        <span className="text-[10px] text-slate-600">{ticket.category}</span>
      </td>

      {/* Issue */}
      <td className="px-3 py-3.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0">
            <p className="text-sm text-slate-300 leading-snug line-clamp-2">{ticket.issue}</p>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-3 py-3.5 w-32">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${status.bg} ${status.text} ${status.border}`}>
          {status.label}
        </span>
      </td>

      {/* Assigned agent */}
      <td className="px-3 py-3.5 w-32">
        <span className="text-xs text-slate-400">
          {ticket.assignedAgent ?? <span className="text-slate-600 italic">Unassigned</span>}
        </span>
      </td>

      {/* Lock badge */}
      <td className="px-3 py-3.5 w-40">
        <AnimatePresence mode="wait">
          {lock && (
            <LockBadge key={ticket.id} lock={lock} isOwner={isLockedByMe} />
          )}
        </AnimatePresence>
      </td>

      {/* Updated */}
      <td className="px-3 py-3.5 w-24 text-right">
        <span className="text-[11px] text-slate-600">{timeAgo(ticket.updatedAt)}</span>
      </td>

      {/* Action */}
      <td className="px-4 py-3.5 w-24 text-right">
        <button
          onClick={() => !isLockedByOther && openTicket(ticket)}
          disabled={isLockedByOther}
          title={isLockedByOther ? `Locked by ${lock.agentName}` : 'Edit ticket'}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
            isLockedByOther
              ? 'bg-slate-800/50 text-slate-600 border-slate-700 cursor-not-allowed'
              : 'bg-violet-600/20 text-violet-300 border-violet-500/40 hover:bg-violet-600/40 hover:text-violet-100 hover:border-violet-400 hover:shadow-lg hover:shadow-violet-500/10 active:scale-95'
          }`}
        >
          {isLockedByOther ? '🔒 Locked' : isLockedByMe ? '✏️ Editing' : 'Edit'}
        </button>
      </td>
    </motion.tr>
  );
}
