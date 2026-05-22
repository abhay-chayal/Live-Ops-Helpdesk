import type { Ticket } from '../types';
import { generateInitialTickets } from './ticketGenerator';

// ── In-memory ticket store ────────────────────────────────────

class TicketStore {
  private tickets: Map<string, Ticket> = new Map();

  constructor() {
    // Seed with initial data
    const initial = generateInitialTickets(12);
    initial.forEach((t) => this.tickets.set(t.id, t));
  }

  getAll(): Ticket[] {
    return Array.from(this.tickets.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  get(id: string): Ticket | undefined {
    return this.tickets.get(id);
  }

  add(ticket: Ticket): Ticket {
    this.tickets.set(ticket.id, ticket);
    return ticket;
  }

  update(ticket: Ticket): Ticket | null {
    if (!this.tickets.has(ticket.id)) return null;
    const updated = { ...ticket, updatedAt: new Date().toISOString() };
    this.tickets.set(ticket.id, updated);
    return updated;
  }

  setLockState(ticketId: string, lockedBy: string | null): void {
    const ticket = this.tickets.get(ticketId);
    if (ticket) {
      this.tickets.set(ticketId, { ...ticket, lockedBy });
    }
  }
}

export const ticketStore = new TicketStore();
