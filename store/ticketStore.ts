import { create } from 'zustand';
import type {
  Ticket,
  TicketLock,
  AgentPresence,
  TicketLockedPayload,
  InitialStatePayload,
  TicketStore,
} from '@/types';

export const useTicketStore = create<TicketStore>((set) => ({
  // ── State ───────────────────────────────────────────────────
  tickets: [],
  locks: {},
  activeTicket: null,
  agentPresence: [],
  socketConnected: false,
  loading: true,

  // ── Actions ─────────────────────────────────────────────────

  /**
   * Adds a new ticket to the top of the list.
   */
  addTicket: (ticket: Ticket) =>
    set((state) => ({
      tickets: [ticket, ...state.tickets],
    })),

  /**
   * Replaces an existing ticket by id, preserving list order.
   */
  updateTicket: (ticket: Ticket) =>
    set((state) => ({
      tickets: state.tickets.map((t) => (t.id === ticket.id ? ticket : t)),
      // If this was the active ticket, close the modal
      activeTicket:
        state.activeTicket?.id === ticket.id ? null : state.activeTicket,
    })),

  /**
   * Records a lock event. Stores full lock metadata including expiresAt
   * so the UI can display a countdown timer.
   */
  lockTicket: (payload: TicketLockedPayload) =>
    set((state) => ({
      locks: {
        ...state.locks,
        [payload.ticketId]: {
          ticketId: payload.ticketId,
          agentName: payload.agentName,
          socketId: '',       // client doesn't need socketId
          lockedAt: Date.now(),
          expiresAt: payload.expiresAt,
        } satisfies TicketLock,
      },
      tickets: state.tickets.map((t) =>
        t.id === payload.ticketId ? { ...t, lockedBy: payload.agentName } : t
      ),
    })),

  /**
   * Removes a lock entry and clears lockedBy on the ticket.
   */
  unlockTicket: (ticketId: string) =>
    set((state) => {
      const { [ticketId]: _removed, ...remainingLocks } = state.locks;
      return {
        locks: remainingLocks,
        tickets: state.tickets.map((t) =>
          t.id === ticketId ? { ...t, lockedBy: null } : t
        ),
      };
    }),

  setActiveTicket: (ticket: Ticket | null) =>
    set({ activeTicket: ticket }),

  setConnectionStatus: (connected: boolean) =>
    set({ socketConnected: connected }),

  setPresence: (agents: AgentPresence[]) =>
    set({ agentPresence: agents }),

  /**
   * Hydrates the full store on connect / reconnect.
   * This is the single source of truth sync point.
   */
  setInitialState: (payload: InitialStatePayload) =>
    set({
      tickets: payload.tickets,
      locks: payload.locks,
      agentPresence: payload.agents,
      loading: false,
    }),

  setLoading: (loading: boolean) => set({ loading }),
}));
