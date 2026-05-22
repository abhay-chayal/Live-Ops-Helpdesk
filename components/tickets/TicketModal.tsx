'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Ticket, Priority, TicketStatus } from '@/types';
import { useTicketStore } from '@/store/ticketStore';
import { useTicketActions } from '@/hooks/useTicketActions';
import { PriorityBadge } from './PriorityBadge';
import { LockBadge } from './LockBadge';
import { formatLockCountdown } from '@/utils/formatters';

interface TicketModalProps {
  agentName: string;
}

export function TicketModal({ agentName }: TicketModalProps) {
  const activeTicket = useTicketStore((s) => s.activeTicket);
  const locks = useTicketStore((s) => s.locks);
  const { closeTicket, saveTicket } = useTicketActions(agentName);

  const [form, setForm] = useState<Ticket | null>(null);

  // Populate form when ticket opens
  useEffect(() => {
    if (activeTicket) setForm({ ...activeTicket });
  }, [activeTicket?.id]);

  if (!activeTicket || !form) return null;

  const lock = locks[activeTicket.id];
  const isOwner = lock?.agentName === agentName;

  const handleSave = () => {
    if (!form) return;
    saveTicket(form);
  };

  const handleClose = () => {
    closeTicket(activeTicket.id);
  };

  const priorities: Priority[] = ['critical', 'high', 'medium', 'low'];
  const statuses: TicketStatus[] = ['open', 'in_progress', 'pending', 'resolved', 'closed'];
  const agents = ['Agent Alex', 'Agent Sam', 'Agent Jordan', 'Agent Riley', 'Agent Morgan', 'Agent Casey'];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/60"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-slate-500">{activeTicket.id}</span>
                <PriorityBadge priority={form.priority} size="sm" />
              </div>
              <h2 className="text-lg font-semibold text-white">Edit Ticket</h2>
              <p className="text-sm text-slate-400 mt-0.5">{activeTicket.customerName}</p>
            </div>
            <div className="flex items-center gap-3">
              {lock && <LockBadge lock={lock} isOwner={isOwner} />}
              <button
                onClick={handleClose}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Issue description */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Issue Description
              </label>
              <textarea
                value={form.issue}
                onChange={(e) => setForm({ ...form, issue: e.target.value })}
                rows={3}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as TicketStatus })}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500 appearance-none cursor-pointer"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s} className="bg-slate-900">
                      {s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Priority
                </label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500 appearance-none cursor-pointer"
                >
                  {priorities.map((p) => (
                    <option key={p} value={p} className="bg-slate-900">
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assigned agent */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Assigned Agent
              </label>
              <select
                value={form.assignedAgent ?? ''}
                onChange={(e) => setForm({ ...form, assignedAgent: e.target.value || null })}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500 appearance-none cursor-pointer"
              >
                <option value="" className="bg-slate-900">Unassigned</option>
                {agents.map((a) => (
                  <option key={a} value={a} className="bg-slate-900">{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white border border-violet-500 transition-all hover:shadow-lg hover:shadow-violet-500/25 active:scale-95"
            >
              Save & Release Lock
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
