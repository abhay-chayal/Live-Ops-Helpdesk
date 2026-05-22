// ============================================================
// Shared TypeScript types — used by both client and server
// ============================================================

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';

export interface Ticket {
  id: string;
  customerName: string;
  issue: string;
  priority: Priority;
  status: TicketStatus;
  assignedAgent: string | null;
  lockedBy: string | null;
  createdAt: string;
  updatedAt: string;
  category: string;
}

export interface TicketLock {
  ticketId: string;
  agentName: string;
  socketId: string;
  lockedAt: number;      // unix ms timestamp
  expiresAt: number;     // unix ms timestamp (lockedAt + LOCK_TTL_MS)
}

export interface AgentPresence {
  agentName: string;
  socketId: string;
  connectedAt: number;
  activeTicketId?: string;
}

// ── Socket event payloads ─────────────────────────────────────

export interface LockTicketPayload {
  ticketId: string;
  agentName: string;
}

export interface UnlockTicketPayload {
  ticketId: string;
  agentName: string;
}

export interface UpdateTicketPayload {
  ticket: Ticket;
}

export interface TicketLockedPayload {
  ticketId: string;
  agentName: string;
  expiresAt: number;
}

export type UnlockReason = 'manual' | 'disconnect' | 'expired' | 'save';

export interface TicketUnlockedPayload {
  ticketId: string;
  reason?: UnlockReason;   // why the lock was released
  agentName?: string;      // who held it (for disconnect toast)
}

export interface LockDeniedPayload {
  ticketId: string;
  lockedBy: string;
  reason: string;
  expiresAt: number;
}

export interface InitialStatePayload {
  tickets: Ticket[];
  locks: Record<string, TicketLock>;
  agents: AgentPresence[];
}

export interface PresenceUpdatePayload {
  agents: AgentPresence[];
}

export interface LockExpiredPayload {
  ticketId: string;
  agentName: string;
}

// ── Store types ───────────────────────────────────────────────

export interface TicketStore {
  tickets: Ticket[];
  locks: Record<string, TicketLock>;   // keyed by ticketId
  activeTicket: Ticket | null;
  agentPresence: AgentPresence[];
  socketConnected: boolean;
  loading: boolean;
  addTicket: (ticket: Ticket) => void;
  updateTicket: (ticket: Ticket) => void;
  lockTicket: (payload: TicketLockedPayload) => void;
  unlockTicket: (ticketId: string) => void;
  setActiveTicket: (ticket: Ticket | null) => void;
  setConnectionStatus: (connected: boolean) => void;
  setPresence: (agents: AgentPresence[]) => void;
  setInitialState: (payload: InitialStatePayload) => void;
  setLoading: (loading: boolean) => void;
}
