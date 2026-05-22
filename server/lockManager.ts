import type { Server } from 'socket.io';
import type { TicketLock, LockDeniedPayload, TicketLockedPayload, LockExpiredPayload } from '../types';
import { ticketStore } from './ticketStore';

// ── Constants ─────────────────────────────────────────────────
export const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Lock Manager ──────────────────────────────────────────────
//   Maintains atomic, self-expiring ticket locks.
//   On socket disconnect: all locks owned by that socket are released.

class LockManager {
  private locks: Map<string, TicketLock> = new Map();
  private expiryTimers: Map<string, NodeJS.Timeout> = new Map();
  private io: Server | null = null;

  setIo(io: Server): void {
    this.io = io;
  }

  /**
   * Attempt to acquire a lock for a ticket.
   * Returns the lock on success, or null + denial payload on failure.
   */
  acquireLock(
    ticketId: string,
    agentName: string,
    socketId: string
  ): { lock: TicketLock } | { denied: LockDeniedPayload } {
    const existing = this.locks.get(ticketId);

    // Existing lock owned by same socket — refresh TTL
    if (existing && existing.socketId === socketId) {
      return this.refreshLock(existing);
    }

    // Existing lock owned by different agent — deny
    if (existing) {
      return {
        denied: {
          ticketId,
          lockedBy: existing.agentName,
          reason: `Ticket is currently being edited by ${existing.agentName}`,
          expiresAt: existing.expiresAt,
        },
      };
    }

    // Acquire new lock
    const now = Date.now();
    const lock: TicketLock = {
      ticketId,
      agentName,
      socketId,
      lockedAt: now,
      expiresAt: now + LOCK_TTL_MS,
    };

    this.locks.set(ticketId, lock);
    ticketStore.setLockState(ticketId, agentName);
    this.scheduleExpiry(ticketId, agentName);

    return { lock };
  }

  /**
   * Release a lock. Only the owning socket or server can release.
   */
  releaseLock(ticketId: string, socketId: string): boolean {
    const existing = this.locks.get(ticketId);
    if (!existing) return false;
    // Allow release by owner OR by server (socketId = '__server__')
    if (existing.socketId !== socketId && socketId !== '__server__') return false;

    this.clearExpiry(ticketId);
    this.locks.delete(ticketId);
    ticketStore.setLockState(ticketId, null);
    return true;
  }

  /**
   * Release ALL locks held by a given socket (called on disconnect).
   * Returns array of ticketIds that were released.
   */
  releaseAllLocksForSocket(socketId: string): string[] {
    const released: string[] = [];
    for (const [ticketId, lock] of this.locks.entries()) {
      if (lock.socketId === socketId) {
        this.clearExpiry(ticketId);
        this.locks.delete(ticketId);
        ticketStore.setLockState(ticketId, null);
        released.push(ticketId);
      }
    }
    return released;
  }

  getLock(ticketId: string): TicketLock | undefined {
    return this.locks.get(ticketId);
  }

  getAllLocks(): Record<string, TicketLock> {
    const result: Record<string, TicketLock> = {};
    for (const [id, lock] of this.locks.entries()) {
      result[id] = lock;
    }
    return result;
  }

  // ── Private helpers ─────────────────────────────────────────

  private refreshLock(existing: TicketLock): { lock: TicketLock } {
    this.clearExpiry(existing.ticketId);
    const updated: TicketLock = {
      ...existing,
      expiresAt: Date.now() + LOCK_TTL_MS,
    };
    this.locks.set(existing.ticketId, updated);
    this.scheduleExpiry(existing.ticketId, existing.agentName);
    return { lock: updated };
  }

  private scheduleExpiry(ticketId: string, agentName: string): void {
    const timer = setTimeout(() => {
      const lock = this.locks.get(ticketId);
      if (!lock) return;

      this.locks.delete(ticketId);
      ticketStore.setLockState(ticketId, null);
      this.expiryTimers.delete(ticketId);

      // Broadcast expiry to all clients
      if (this.io) {
        const payload: LockExpiredPayload = { ticketId, agentName };
        this.io.emit('lock_expired', payload);

        // Also emit unlock so UI clears the lock row
        this.io.emit('ticket_unlocked', { ticketId });
      }

      console.log(`[LockManager] Lock expired: ${ticketId} (was held by ${agentName})`);
    }, LOCK_TTL_MS);

    this.expiryTimers.set(ticketId, timer);
  }

  private clearExpiry(ticketId: string): void {
    const timer = this.expiryTimers.get(ticketId);
    if (timer) {
      clearTimeout(timer);
      this.expiryTimers.delete(ticketId);
    }
  }
}

export const lockManager = new LockManager();
