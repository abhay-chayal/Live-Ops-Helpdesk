# 🚀 Live Ops Helpdesk

> Commercial-grade real-time collaborative support platform — built to solve concurrency and race conditions in multi-agent environments.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-white?logo=socket.io&logoColor=black)](https://socket.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Zustand](https://img.shields.io/badge/Zustand-5-orange)](https://zustand-demo.pmnd.rs)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔴 **Live Ticket Board** | Real-time ticket streaming via WebSocket — no polling |
| 🔒 **Atomic Ticket Locking** | One agent locks → all others instantly blocked |
| ⏱️ **Lock Timeout System** | Locks auto-expire with live countdown (5-min TTL) |
| 🚫 **Lock Denied Toasts** | Targeted denial notifications — only the blocked agent sees it |
| 🔄 **Reconnect Sync** | Full state hydration on every connect/reconnect |
| 📡 **Multi-Agent Presence** | Live avatars showing every connected agent |
| 🌐 **Disconnect Banner** | Animated red banner on connection loss |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────┐
│              Next.js App (Port 3000)                │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │  Zustand     │  │  Socket.io  │  │  React UI  │  │
│  │  ticketStore │◄─┤  Client     │  │           │  │
│  └──────────────┘  └──────┬──────┘  └───────────┘  │
│                           │  (same origin WS)        │
│  ┌────────────────────────▼──────────────────────┐  │
│  │        Custom Express + Socket.io Server       │  │
│  │  LockManager  │  TicketStore  │  EventRouter   │  │
│  └────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

Socket server runs **embedded** in the same Node.js process as Next.js — single port, single deployment.

---

## 🚦 Socket Event Protocol

| Direction | Event | Payload | Purpose |
|---|---|---|---|
| Client → Server | `lock_ticket` | `{ticketId, agentName}` | Request lock |
| Server → All | `ticket_locked` | `{ticketId, agentName, expiresAt}` | Broadcast lock |
| Server → Requester | `lock_denied` | `{ticketId, lockedBy, reason}` | Rejection toast |
| Client → Server | `unlock_ticket` | `{ticketId, agentName}` | Release lock |
| Server → All | `ticket_unlocked` | `{ticketId}` | Clear lock UI |
| Server → All | `lock_expired` | `{ticketId, agentName}` | TTL expiry |
| Server → All | `ticket_updated` | `{ticket}` | Broadcast save |
| Server → All | `new_ticket` | `{ticket}` | Live stream |
| Server → Client | `initial_state` | `{tickets, locks, agents}` | Reconnect sync |

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4
- **State**: Zustand v5
- **Animations**: Framer Motion
- **Toasts**: react-hot-toast
- **WebSocket**: Socket.io v4 (client + server)
- **Server**: Custom Next.js server with embedded Socket.io

---

## ⚡ Quick Start

```bash
# 1. Clone
git clone https://github.com/abhay-chayal/Live-Ops-Helpdesk.git
cd Live-Ops-Helpdesk

# 2. Install
npm install

# 3. Run (starts both Next.js + Socket.io on port 3000)
npm run dev
```

Open two tabs for the demo:
```
Tab A: http://localhost:3000?agent=Agent+Alex
Tab B: http://localhost:3000?agent=Agent+Sam
```

---

## 🎬 Demo Sequence

1. **Tab A** clicks Edit on any ticket → lock acquired
2. **Tab B** sees the row go gray with 🔒 badge instantly
3. **Tab B** tries to edit → lock denied toast fires
4. **Tab A** saves → both tabs unlock simultaneously
5. Kill the server → both tabs show red "Connection Lost" banner
6. Restart server → banner disappears, state re-syncs automatically

See [`presentation_notes.md`](./presentation_notes.md) for the full 7-scene demo script.

---

## 📁 Project Structure

```
├── app/                    # Next.js App Router
├── components/
│   ├── layout/             # Header, ConnectionBanner
│   └── tickets/            # Board, Row, Modal, LockBadge
├── hooks/                  # useSocket, useTicketActions
├── lib/                    # socket.ts singleton
├── server/                 # LockManager, TicketStore, Generator
├── server-custom.ts        # Unified Next.js + Socket.io server
├── store/                  # Zustand ticketStore
├── types/                  # Shared TypeScript interfaces
└── utils/                  # Formatters, color maps
```

---

## 🌐 Deployment

### Vercel (Recommended)
> **Note**: Vercel's serverless platform does not support persistent WebSocket connections. For full real-time functionality, deploy to a platform that supports long-lived processes.

### Railway / Render (Full Real-Time)
```bash
# Build
npm run build

# Start (custom server with Socket.io)
npm start
```
Set environment variable: `PORT=3000`

---

## 📝 License

MIT
