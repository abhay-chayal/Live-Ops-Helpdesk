'use client';

import { useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { useTicketStore } from '@/store/ticketStore';
import type { Ticket } from '@/types';

/**
 * useTicketActions — provides typed, socket-backed ticket actions.
 * Handles lock, unlock, and save with optimistic UI updates.
 */
export function useTicketActions(agentName: string) {
  const { setActiveTicket, lockTicket, unlockTicket } = useTicketStore();

  /**
   * Opens a ticket for editing — emits lock_ticket.
   * The server will either confirm (ticket_locked broadcast) or deny (lock_denied to us).
   */
  const openTicket = useCallback(
    (ticket: Ticket) => {
      const socket = getSocket();
      setActiveTicket(ticket);
      socket.emit('lock_ticket', { ticketId: ticket.id, agentName });
    },
    [agentName, setActiveTicket]
  );

  /**
   * Releases the lock and closes the modal without saving.
   */
  const closeTicket = useCallback(
    (ticketId: string) => {
      const socket = getSocket();
      socket.emit('unlock_ticket', { ticketId, agentName });
      setActiveTicket(null);
    },
    [agentName, setActiveTicket]
  );

  /**
   * Saves ticket edits — server will update, broadcast ticket_updated,
   * then automatically unlock (preventing double-emit).
   */
  const saveTicket = useCallback(
    (ticket: Ticket) => {
      const socket = getSocket();
      socket.emit('update_ticket', { ticket });
      setActiveTicket(null);
      // The server will emit ticket_unlocked after confirming the update
    },
    [setActiveTicket]
  );

  return { openTicket, closeTicket, saveTicket };
}
