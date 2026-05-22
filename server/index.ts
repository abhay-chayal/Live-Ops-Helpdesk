import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

import type {
  LockTicketPayload,
  UnlockTicketPayload,
  UpdateTicketPayload,
  TicketLockedPayload,
  InitialStatePayload,
  PresenceUpdatePayload,
} from '../types';
import type { AgentPresence } from '../types';

import { ticketStore } from './ticketStore';
import { lockManager } from './lockManager';
import { generateTicket } from './ticketGenerator';

// ── Server config ─────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 4000;
const TICKET_STREAM_INTERVAL_MS = 30_000; // new ticket every 30s

// ── CORS: read from env in production, fall back to localhost ──
const rawOrigins = process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000';
const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());
console.log('[CORS] Allowed origins:', allowedOrigins);

const app = express();
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 10_000,
  pingTimeout: 5_000,
});

// Give lockManager a reference to io so it can broadcast expirations
lockManager.setIo(io);

// ── Agent presence registry ───────────────────────────────────
const agentRegistry = new Map<string, AgentPresence>();

function broadcastPresence(): void {
  const agents = Array.from(agentRegistry.values());
  const payload: PresenceUpdatePayload = { agents };
  io.emit('presence_update', payload);
}

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    tickets: ticketStore.getAll().length,
    locks: Object.keys(lockManager.getAllLocks()).length,
    agents: agentRegistry.size,
  });
});

// ── Socket.io connection handler ──────────────────────────────
io.on('connection', (socket: Socket) => {
  const agentName = (socket.handshake.query.agentName as string) || `Agent-${socket.id.slice(0, 4)}`;

  console.log(`[Socket] Connected: ${agentName} (${socket.id})`);

  // Register presence
  const presence: AgentPresence = {
    agentName,
    socketId: socket.id,
    connectedAt: Date.now(),
  };
  agentRegistry.set(socket.id, presence);
  broadcastPresence();

  // ── INITIAL STATE SYNC ──────────────────────────────────────
  // Sent on EVERY connect / reconnect — no polling needed
  const initialState: InitialStatePayload = {
    tickets: ticketStore.getAll(),
    locks: lockManager.getAllLocks(),
    agents: Array.from(agentRegistry.values()),
  };
  socket.emit('initial_state', initialState);

  // ── LOCK TICKET ─────────────────────────────────────────────
  socket.on('lock_ticket', (payload: LockTicketPayload) => {
    const { ticketId, agentName: agent } = payload;

    const result = lockManager.acquireLock(ticketId, agent, socket.id);

    if ('denied' in result) {
      // Only the requesting socket gets the denial toast
      socket.emit('lock_denied', result.denied);
      console.log(`[Lock] DENIED: ${agent} → ${ticketId} (held by ${result.denied.lockedBy})`);
      return;
    }

    // Broadcast success to ALL clients
    const broadcastPayload: TicketLockedPayload = {
      ticketId,
      agentName: agent,
      expiresAt: result.lock.expiresAt,
    };
    io.emit('ticket_locked', broadcastPayload);
    console.log(`[Lock] ACQUIRED: ${agent} → ${ticketId}`);
  });

  // ── UNLOCK TICKET ───────────────────────────────────────────
  socket.on('unlock_ticket', (payload: UnlockTicketPayload) => {
    const { ticketId } = payload;
    const released = lockManager.releaseLock(ticketId, socket.id);

    if (released) {
      io.emit('ticket_unlocked', { ticketId, reason: 'manual', agentName: payload.agentName });
      console.log(`[Lock] RELEASED: ${payload.agentName} → ${ticketId}`);
    }
  });

  // ── UPDATE TICKET ───────────────────────────────────────────
  socket.on('update_ticket', (payload: UpdateTicketPayload) => {
    const { ticket } = payload;

    // Verify the requester holds the lock (or ticket is unlocked)
    const lock = lockManager.getLock(ticket.id);
    if (lock && lock.socketId !== socket.id) {
      socket.emit('update_denied', {
        ticketId: ticket.id,
        reason: `Ticket is locked by ${lock.agentName}`,
      });
      return;
    }

    const updated = ticketStore.update(ticket);
    if (updated) {
      // Release lock after save
      lockManager.releaseLock(ticket.id, socket.id);
      io.emit('ticket_updated', { ticket: updated });
      io.emit('ticket_unlocked', { ticketId: ticket.id, reason: 'save', agentName });
      console.log(`[Ticket] UPDATED: ${ticket.id} by ${agentName}`);
    }
  });

  // ── DISCONNECT ──────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Disconnected: ${agentName} (${socket.id}) — ${reason}`);

    // Release all locks held by this socket → prevents stale / ghost locks
    const releasedTicketIds = lockManager.releaseAllLocksForSocket(socket.id);
    releasedTicketIds.forEach((ticketId) => {
      // Broadcast with reason='disconnect' so other clients can show a specific toast
      io.emit('ticket_unlocked', { ticketId, reason: 'disconnect', agentName });
      console.log(`[Lock] GHOST-LOCK CLEARED on disconnect: ${ticketId} (was held by ${agentName})`);
    });

    // Remove presence
    agentRegistry.delete(socket.id);
    broadcastPresence();
  });
});

// ── PERIODIC TICKET STREAM ────────────────────────────────────
// Simulates live inbound support tickets from external systems
setInterval(() => {
  const ticket = generateTicket();
  ticketStore.add(ticket);
  io.emit('new_ticket', { ticket });
  console.log(`[Stream] New ticket emitted: ${ticket.id} — ${ticket.customerName}`);
}, TICKET_STREAM_INTERVAL_MS);

// ── Start server ──────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Live Ops Helpdesk Server running at http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Accepting WebSocket connections...\n`);
});
