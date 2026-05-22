import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import next from 'next';

import type {
  LockTicketPayload,
  UnlockTicketPayload,
  UpdateTicketPayload,
  TicketLockedPayload,
  InitialStatePayload,
  PresenceUpdatePayload,
  AgentPresence,
} from './types/index';

import { ticketStore } from './server/ticketStore';
import { lockManager } from './server/lockManager';
import { generateTicket } from './server/ticketGenerator';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const TICKET_STREAM_INTERVAL_MS = 30_000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingInterval: 10_000,
    pingTimeout: 5_000,
  });

  // Give lockManager a reference to io so it can broadcast expirations
  lockManager.setIo(io);

  // ── Agent presence registry ─────────────────────────────────
  const agentRegistry = new Map<string, AgentPresence>();

  function broadcastPresence(): void {
    const agents = Array.from(agentRegistry.values());
    const payload: PresenceUpdatePayload = { agents };
    io.emit('presence_update', payload);
  }

  // ── Socket.io connection handler ────────────────────────────
  io.on('connection', (socket: Socket) => {
    const agentName =
      (socket.handshake.query.agentName as string) ||
      `Agent-${socket.id.slice(0, 4)}`;

    console.log(`[Socket] Connected: ${agentName} (${socket.id})`);

    // Register presence
    const presence: AgentPresence = {
      agentName,
      socketId: socket.id,
      connectedAt: Date.now(),
    };
    agentRegistry.set(socket.id, presence);
    broadcastPresence();

    // ── INITIAL STATE SYNC — sent on every connect/reconnect ──
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
        socket.emit('lock_denied', result.denied);
        console.log(
          `[Lock] DENIED: ${agent} → ${ticketId} (held by ${result.denied.lockedBy})`
        );
        return;
      }

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
        io.emit('ticket_unlocked', { ticketId });
        console.log(`[Lock] RELEASED: ${payload.agentName} → ${ticketId}`);
      }
    });

    // ── UPDATE TICKET ───────────────────────────────────────────
    socket.on('update_ticket', (payload: UpdateTicketPayload) => {
      const { ticket } = payload;
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
        lockManager.releaseLock(ticket.id, socket.id);
        io.emit('ticket_updated', { ticket: updated });
        io.emit('ticket_unlocked', { ticketId: ticket.id });
        console.log(`[Ticket] UPDATED: ${ticket.id} by ${agentName}`);
      }
    });

    // ── DISCONNECT ──────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(
        `[Socket] Disconnected: ${agentName} (${socket.id}) — ${reason}`
      );
      const releasedTicketIds = lockManager.releaseAllLocksForSocket(socket.id);
      releasedTicketIds.forEach((ticketId) => {
        io.emit('ticket_unlocked', { ticketId });
        console.log(
          `[Lock] AUTO-RELEASED on disconnect: ${ticketId} (was ${agentName})`
        );
      });
      agentRegistry.delete(socket.id);
      broadcastPresence();
    });
  });

  // ── PERIODIC TICKET STREAM ────────────────────────────────────
  setInterval(() => {
    const ticket = generateTicket();
    ticketStore.add(ticket);
    io.emit('new_ticket', { ticket });
    console.log(
      `[Stream] New ticket: ${ticket.id} — ${ticket.customerName}`
    );
  }, TICKET_STREAM_INTERVAL_MS);

  httpServer.listen(port, () => {
    console.log(
      `\n🚀 Live Ops Helpdesk ready at http://${hostname}:${port}\n`
    );
  });
});
