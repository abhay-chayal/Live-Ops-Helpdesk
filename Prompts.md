# Prompts.md 

## Live Ops Helpdesk | Real-Time Concurrency System

This document records all significant engineering decisions made during the development of the Live Ops Helpdesk system, with precise explanations of the rationale, alternatives considered, and why each approach was selected. It serves as a transparency record for AI-assisted engineering work.

---

## 1. Socket Singleton Architecture

**Decision:** Use a module-level singleton (`let socket: Socket | null = null`) in `lib/socket.ts` rather than creating a socket instance inside a React hook or component.

**Problem solved:** React components can re-render many times. If the socket were created inside a `useEffect` or component body, each render cycle would create a new socket instance — resulting in multiple parallel WebSocket connections per tab, each receiving duplicate events.

**Implementation:**
```typescript
// lib/socket.ts
let socket: Socket | null = null;

export function getSocket(agentName?: string): Socket {
  if (!socket) {
    socket = io(SERVER_URL, { autoConnect: false, ... });
  }
  return socket; // Always returns the same instance
}
```

**Why not React Context?** Context adds provider boilerplate and still re-creates on context value change. A module singleton is zero-overhead and framework-agnostic — it works identically whether called from a hook, a utility function, or a server action.

**Alternative considered:** `useRef` per component — rejected because refs are scoped to component instances, not the module, meaning two components would each hold different socket references.

---

## 2. Lock Manager Memory Map Design

**Decision:** Use `Map<ticketId, { agentName, socketId, lockedAt, expiresAt }>` as the lock store rather than a database, Redis, or a simple object.

**Problem solved:** The lock must be **atomic** — two agents clicking Edit at the exact same millisecond must not both succeed. Node.js's single-threaded event loop guarantees that `Map.get()` + `Map.set()` executes without preemption — no mutex required.

**Implementation:**
```typescript
// server/lockManager.ts
class LockManager {
  private locks: Map<string, TicketLock> = new Map();

  acquireLock(ticketId, agentName, socketId) {
    const existing = this.locks.get(ticketId);
    if (existing && existing.socketId !== socketId) {
      return { denied: { ... } }; // Atomic check-and-reject
    }
    this.locks.set(ticketId, { ticketId, agentName, socketId, lockedAt, expiresAt });
    return { lock };
  }
}
```

**Why not a database row lock?** Database round-trips add 5–50ms latency — far too slow for real-time UX. The in-memory map gives sub-millisecond lock acquisition. In a multi-server production deployment, this would migrate to Redis with `SET NX PX` (atomic set-if-not-exists with TTL).

**socketId as identity:** Instead of using agent names (which could collide), we use `socket.id` — a UUID assigned by Socket.io per connection. This makes stale lock cleanup on disconnect perfectly precise.

---

## 3. Ghost Disconnect Cleanup

**Decision:** On `socket.on("disconnect")`, immediately call `releaseAllLocksForSocket(socket.id)` and broadcast `ticket_unlocked` with `reason: 'disconnect'` to all remaining clients.

**Problem solved:** If an agent closes their browser tab without clicking Save or Cancel, their lock would persist indefinitely — blocking the entire support queue. This is the "ghost lock" problem.

**Implementation:**
```typescript
// server/index.ts
socket.on('disconnect', (reason) => {
  const releasedTicketIds = lockManager.releaseAllLocksForSocket(socket.id);
  releasedTicketIds.forEach((ticketId) => {
    io.emit('ticket_unlocked', { ticketId, reason: 'disconnect', agentName });
  });
  agentRegistry.delete(socket.id);
  broadcastPresence();
});
```

**Why `reason: 'disconnect'` on the payload?** The client needs to distinguish WHY a ticket was unlocked so it can show the appropriate toast:
- `'disconnect'` → `"🔓 Ticket unlocked — Agent Alex disconnected"` (cyan toast, informative)
- `'expired'` → `"⏱️ Your lock expired"` (amber toast, personal warning)
- `'save'` → silent (the `ticket_updated` event already updates the UI)
- `'manual'` → silent (the agent who cancelled already knows)

**Timing guarantee:** Socket.io fires the `disconnect` event synchronously on the server when the TCP connection is confirmed closed — typically within the `pingTimeout` window (5 seconds in this config). No polling required.

---

## 4. Lock Timeout / TTL Expiration System

**Decision:** Use `setTimeout` per lock in the `LockManager`, with the timer stored in a parallel `Map<ticketId, NodeJS.Timeout>`. Timer is cleared and reset on lock refresh (same-agent re-open).

**Problem solved:** An agent who gets pulled away from their desk mid-edit would hold the lock indefinitely without a TTL. Other agents would be blocked from that ticket for hours.

**Implementation:**
```typescript
private scheduleExpiry(ticketId, agentName): void {
  const timer = setTimeout(() => {
    this.locks.delete(ticketId);
    ticketStore.setLockState(ticketId, null);
    this.io.emit('lock_expired', { ticketId, agentName });
    this.io.emit('ticket_unlocked', { ticketId, reason: 'expired', agentName });
  }, LOCK_TTL_MS); // 5 minutes
  this.expiryTimers.set(ticketId, timer);
}
```

**Why `setTimeout` instead of a cron job?** Cron requires polling (checking every N seconds). `setTimeout` fires exactly at expiry with zero CPU overhead between invocations. Node.js's event loop timer implementation is efficient even at scale — thousands of concurrent timers are routinely used in production Node servers.

**Client-side countdown:** The `expiresAt` timestamp is included in the `TicketLockedPayload`. The `LockBadge` component runs a `setInterval(tick, 1000)` only while it is mounted — when the badge unmounts (unlock), the interval is cleared via `useEffect` cleanup.

---

## 5. React Strict Mode Socket Duplication

**Decision:** Use a `useRef(false)` guard (`boundRef`) inside `useSocket` to prevent double event listener registration caused by React Strict Mode's double-mount behavior in development.

**Problem solved:** React 18 Strict Mode intentionally mounts → unmounts → re-mounts components in development to surface side effects. Without the guard, `useSocket` would register every event listener twice, causing every socket event to fire two handlers — resulting in duplicate toasts, double store updates, and subtle bugs.

**Implementation:**
```typescript
// hooks/useSocket.ts
const boundRef = useRef(false);

useEffect(() => {
  if (boundRef.current) return; // ← Guard: skip if already bound
  boundRef.current = true;

  const socket = connectSocket(agentName);
  socket.on('ticket_locked', handler);
  // ... all other listeners

  return () => {
    socket.off('ticket_locked', handler);
    // ... remove all listeners
    boundRef.current = false; // ← Reset on cleanup for true unmount
  };
}, [agentName]);
```

**Why `useRef` not `useState`?** `useState` triggers a re-render when mutated. `useRef` is a mutable container with no render side effects — ideal for tracking imperative state like "are listeners registered?"

**Why not `socket.once()`?** `socket.once()` removes the listener after first fire — subsequent events (e.g. second lock) would be silently ignored. We need persistent listeners.

---

## 6. Reconnect Synchronization Flow

**Decision:** Server emits `initial_state` (full tickets + locks + agents) on **every** `connect` event, not just the first one. Client calls `setInitialState()` which fully replaces store state.

**Problem solved:** When a client reconnects after a network drop, its Zustand store holds stale data. Locks may have expired, tickets may have been updated, new tickets may have streamed in. Without a sync step, the UI shows phantom lock badges and missing tickets.

**Flow:**
```
Client reconnects
  → Socket.io emits 'connect'
  → Server's io.on('connection') fires
  → Server emits 'initial_state' with current truth
  → Client's initial_state handler calls setInitialState()
  → Zustand replaces entire tickets[], locks{}, agents[]
  → UI re-renders with authoritative data
  → 'connect' handler shows " Reconnected — syncing state..." toast
```

**Why not a separate `resync` event?** Having a single `initial_state` event for both first-connect and reconnect simplifies the server logic — there is no conditional. The client uses `hasConnectedOnce` ref to differentiate first load (no toast) from reconnect (show toast).

**Why not optimistic merge?** Merging stale client state with server state risks partial inconsistency — e.g. a lock that expired server-side but is still in client state. Full replacement guarantees consistency.

---

## 7. Socket Event Architecture (Complete Protocol)

**Decision:** Strict separation between targeted events (`socket.emit`) and broadcast events (`io.emit`).

| Event | Direction | Target | Reason |
|---|---|---|---|
| `initial_state` | Server → Client | `socket.emit` (targeted) | Only the connecting client needs sync |
| `lock_denied` | Server → Client | `socket.emit` (targeted) | Only the rejected agent sees denial toast |
| `ticket_locked` | Server → All | `io.emit` (broadcast) | All clients must update lock UI |
| `ticket_unlocked` | Server → All | `io.emit` (broadcast) | All clients must clear lock UI |
| `ticket_updated` | Server → All | `io.emit` (broadcast) | All clients must reflect edit |
| `new_ticket` | Server → All | `io.emit` (broadcast) | All clients get new ticket |
| `presence_update` | Server → All | `io.emit` (broadcast) | All clients see who's online |
| `lock_expired` | Server → All | `io.emit` (broadcast) | Owner gets warning; others see unlock |

**Why explicit reason on unlock?** Every `ticket_unlocked` carries a `reason: 'manual' | 'save' | 'disconnect' | 'expired'` field. This allows the client to show precise, context-appropriate notifications without needing client-side inference.

**Ownership validation on update:** Before processing `update_ticket`, the server checks `lock.socketId === socket.id`. This prevents a race where a client submits an update after their lock was released by TTL expiry or disconnect.

---

## 8. Production WebSocket Deployment Configuration

**Decision:** Read `ALLOWED_ORIGINS` from environment variables on the server; read `NEXT_PUBLIC_SOCKET_URL` from env on the client. No hardcoded domains in source code.

**Server CORS pattern:**
```typescript
const rawOrigins = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
const allowedOrigins = rawOrigins.split(',').map(o => o.trim());

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, credentials: true }
});
```

**Why no wildcard `*` in production?** Wildcard CORS with `credentials: true` is rejected by browsers (CORS spec). It also allows any origin to connect to the WebSocket server — a security risk in production.

**WSS (secure WebSocket):** Socket.io-client automatically upgrades to `wss://` when the server URL uses `https://`. No additional config needed — the transport layer handles TLS.

**Deployment topology:**
```
Vercel (Next.js)  ──HTTPS──▶  Render/Railway (Express + Socket.io)
  NEXT_PUBLIC_SOCKET_URL=       ALLOWED_ORIGINS=https://your-app.vercel.app
  https://backend.onrender.com
```

---

*Document maintained by: Live Ops Helpdesk Engineering*
*Last updated: 2026-05-22*
