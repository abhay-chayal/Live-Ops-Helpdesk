import { io, Socket } from 'socket.io-client';

// ── Singleton socket instance ─────────────────────────────────
// In production (Vercel / Railway) the socket server runs on the
// same origin as Next.js via the custom server — so we use
// window.location.origin. In local dev, fall back to :3000.

let socket: Socket | null = null;

function getServerUrl(): string {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  // In the browser, use the current page origin (custom server co-located)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3000';
}

/**
 * Returns the singleton Socket.io client instance.
 * Creates it on first call, reuses on subsequent calls.
 */
export function getSocket(agentName?: string): Socket {
  if (!socket) {
    socket = io(getServerUrl(), {
      query: { agentName: agentName || 'Anonymous' },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.3,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

/**
 * Connect the socket. Call once at app startup.
 */
export function connectSocket(agentName: string): Socket {
  const s = getSocket(agentName);
  if (!s.connected) {
    (s as any).io.opts.query = { agentName };
    s.connect();
  }
  return s;
}

/**
 * Cleanly disconnect and destroy the singleton.
 */
export function destroySocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
