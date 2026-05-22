import { io, Socket } from 'socket.io-client';

// ── Singleton socket instance ─────────────────────────────────
// One connection per browser tab. Exported as a module-level
// singleton so every hook/component accesses the same socket.

const SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let socket: Socket | null = null;

/**
 * Returns the singleton Socket.io client instance.
 * Creates it on first call, reuses on subsequent calls.
 * agentName is encoded in the handshake query for server-side presence.
 */
export function getSocket(agentName?: string): Socket {
  if (!socket) {
    socket = io(SERVER_URL, {
      query: { agentName: agentName || 'Anonymous' },
      autoConnect: false,          // We control when to connect
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.3,
      transports: ['websocket', 'polling'], // websocket preferred, polling fallback
    });
  }
  return socket;
}

/**
 * Connect the socket (call once in the app root).
 */
export function connectSocket(agentName: string): Socket {
  const s = getSocket(agentName);
  if (!s.connected) {
    // Update query before connecting
    (s as any).io.opts.query = { agentName };
    s.connect();
  }
  return s;
}

/**
 * Cleanly disconnect and destroy the singleton.
 * Call on app unmount or logout.
 */
export function destroySocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
