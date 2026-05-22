'use client';

import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { connectSocket, getSocket } from '@/lib/socket';
import { useTicketStore } from '@/store/ticketStore';
import type {
  InitialStatePayload,
  TicketLockedPayload,
  TicketUnlockedPayload,
  LockDeniedPayload,
  LockExpiredPayload,
  PresenceUpdatePayload,
} from '@/types';

interface UseSocketOptions {
  agentName: string;
}

/**
 * useSocket — binds ALL socket events to Zustand store actions.
 * Must be called once at the app root (TicketBoard or page level).
 * Uses a ref to avoid registering duplicate listeners on re-renders.
 */
export function useSocket({ agentName }: UseSocketOptions) {
  const {
    addTicket,
    updateTicket,
    lockTicket,
    unlockTicket,
    setConnectionStatus,
    setPresence,
    setInitialState,
  } = useTicketStore();

  const boundRef = useRef(false);

  useEffect(() => {
    if (boundRef.current) return;
    boundRef.current = true;

    const socket = connectSocket(agentName);

    // ── CONNECTION EVENTS ───────────────────────────────────────

    socket.on('connect', () => {
      setConnectionStatus(true);
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      setConnectionStatus(false);
      console.warn('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      setConnectionStatus(false);
      console.error('[Socket] Connection error:', err.message);
    });

    // ── RECONNECT SYNC ──────────────────────────────────────────
    // Server emits initial_state on EVERY connect/reconnect.
    // This hydrates the full store with current server truth.
    socket.on('initial_state', (payload: InitialStatePayload) => {
      setInitialState(payload);
      console.log(
        `[Socket] State synced: ${payload.tickets.length} tickets, ${Object.keys(payload.locks).length} locks`
      );
    });

    // ── TICKET EVENTS ───────────────────────────────────────────

    socket.on('new_ticket', ({ ticket }) => {
      addTicket(ticket);
      toast.success(`New ticket: ${ticket.customerName}`, {
        icon: '🎫',
        duration: 4000,
      });
    });

    socket.on('ticket_updated', ({ ticket }) => {
      updateTicket(ticket);
    });

    // ── LOCK EVENTS ─────────────────────────────────────────────

    socket.on('ticket_locked', (payload: TicketLockedPayload) => {
      lockTicket(payload);
      // Only notify others — the locker already knows
      if (payload.agentName !== agentName) {
        toast(`🔒 ${payload.agentName} locked ticket`, {
          style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #334155' },
          duration: 3000,
        });
      }
    });

    socket.on('ticket_unlocked', ({ ticketId }: TicketUnlockedPayload) => {
      unlockTicket(ticketId);
    });

    // ── LOCK DENIED — only the requesting client receives this ──
    socket.on('lock_denied', (payload: LockDeniedPayload) => {
      toast.error(`🚫 Lock denied — ${payload.reason}`, {
        duration: 5000,
        style: { maxWidth: '400px' },
      });
    });

    // ── LOCK EXPIRED ────────────────────────────────────────────
    socket.on('lock_expired', (payload: LockExpiredPayload) => {
      unlockTicket(payload.ticketId);
      if (payload.agentName === agentName) {
        toast(`⏱️ Your lock on a ticket expired`, {
          icon: '⚠️',
          style: { background: '#7c2d12', color: '#fff' },
          duration: 5000,
        });
      }
    });

    // ── PRESENCE ────────────────────────────────────────────────
    socket.on('presence_update', (payload: PresenceUpdatePayload) => {
      setPresence(payload.agents);
    });

    // ── CLEANUP on component unmount ────────────────────────────
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('initial_state');
      socket.off('new_ticket');
      socket.off('ticket_updated');
      socket.off('ticket_locked');
      socket.off('ticket_unlocked');
      socket.off('lock_denied');
      socket.off('lock_expired');
      socket.off('presence_update');
      boundRef.current = false;
    };
  }, [agentName]); // Re-bind only if agentName changes
}
