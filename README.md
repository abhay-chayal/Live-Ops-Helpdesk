# 🚨 Live Ops Helpdesk

> **Commercial-grade real-time collaborative support platform** — solving multi-agent concurrency, race conditions, and ghost-lock problems using WebSockets.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-4-white?logo=socket.io&logoColor=black)](https://socket.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Zustand](https://img.shields.io/badge/Zustand-5-orange)](https://github.com/pmndrs/zustand)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)

---

## 🎯 What This Solves

In a multi-agent support environment, two agents editing the same ticket simultaneously causes:
- **Conflicting edits** — last save wins, earlier work lost
- **Agent collision** — both agents working the same case unknowingly
- **Ghost locks** — agent closes tab, ticket stuck blocked for hours
- **Stale data** — page refresh required to see current state

Live Ops Helpdesk eliminates all of these through real-time WebSocket synchronization.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔒 **Atomic Ticket Locking** | One agent edits at a time — server-enforced, not client-side |
| 🔓 **Ghost-Lock Cleanup** | Browser tab closed → locks auto-released within 5 seconds |
| ⏱️ **Lock TTL Expiration** | Locks auto-expire after 5 minutes with a live countdown badge |
| 🚫 **Lock Denied Toasts** | Targeted notification only to the blocked agent |
| 🔄 **Reconnect Sync** | Full state hydration on every reconnect — no page refresh |
| 📡 **Live Ticket Stream** | New tickets appear instantly across all connected clients |
| 👥 **Agent Presence** | Real-time avatar strip showing all online agents |
| 🔴 **Disconnect Banner** | Animated red banner during connection loss |
| ✅ **Reconnect Toast** | Confirmation toast when WebSocket re-establishes |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│        Next.js Client (:3000)           │
│  Zustand Store ◄── useSocket Hook       │
│                    ↕ WebSocket          │
│         lib/socket.ts (singleton)       │
└──────────────────┬──────────────────────┘
                   │ ws://
┌──────────────────▼──────────────────────┐
│     Express + Socket.io Server (:4000)  │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │ LockManager │  │  TicketStore     │  │
│  │ (atomic TTL)│  │  (in-memory)     │  │
│  └─────────────┘  └──────────────────┘  │
└─────────────────────────────────────────┘
```

### Socket Event Protocol

| Event | Direction | Target | Trigger |
|---|---|---|---|
| `initial_state` | Server → Client | Targeted | Every connect/reconnect |
| `lock_ticket` | Client → Server | — | Agent opens Edit |
| `ticket_locked` | Server → All | Broadcast | Lock acquired |
| `lock_denied` | Server → Client | **Targeted** | Lock rejected |
| `unlock_ticket` | Client → Server | — | Agent saves/cancels |
| `ticket_unlocked` | Server → All | Broadcast | Lock released (with `reason`) |
| `ticket_updated` | Server → All | Broadcast | Ticket saved |
| `lock_expired` | Server → All | Broadcast | TTL reached |
| `new_ticket` | Server → All | Broadcast | Inbound ticket stream |
| `presence_update` | Server → All | Broadcast | Agent connect/disconnect |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm

### 1. Clone & Install

```bash
git clone https://github.com/abhay-chayal/Live-Ops-Helpdesk.git
cd Live-Ops-Helpdesk
npm install
```

### 2. Environment Setup

```bash
# For local development (no changes needed — defaults work out of the box)
cp .env.local.example .env.local
```

### 3. Start the Socket.io Server

```bash
npm run server
# Server starts at http://localhost:4000
# Health check: http://localhost:4000/health
```

### 4. Start the Next.js Client

```bash
npm run dev
# Client starts at http://localhost:3000
```

### 5. Open Two Tabs for Demo

```
Tab A (Agent Alex): http://localhost:3000?agent=Agent+Alex
Tab B (Agent Sam):  http://localhost:3000?agent=Agent+Sam
```

---

## 🎭 Demo Scenarios

See [`presentation_notes.md`](./presentation_notes.md) for the full 7-scene demo script.

### Quick demo sequence:
1. **Lock propagation** — Edit a ticket in Tab A → Tab B instantly shows 🔒 Locked
2. **Lock denied** — Try editing the same locked ticket from Tab B → red toast fires only in Tab B
3. **Ghost disconnect** — Close Tab A completely → Tab B auto-unlocks within 5 seconds with cyan toast
4. **Reconnect sync** — Kill & restart the server → both tabs reconnect and show ✅ toast, state fully restored
5. **Live stream** — Wait 30 seconds → new ticket appears in both tabs simultaneously

---

## 📁 Project Structure

```
├── app/                    # Next.js App Router pages & layout
├── components/
│   ├── layout/             # Header, ConnectionBanner
│   └── tickets/            # TicketBoard, TicketRow, TicketModal, LockBadge, etc.
├── hooks/
│   ├── useSocket.ts        # All socket event bindings → Zustand
│   └── useTicketActions.ts # Lock/unlock/save emitters
├── lib/
│   └── socket.ts           # Module-level singleton socket instance
├── server/
│   ├── index.ts            # Express + Socket.io event router
│   ├── lockManager.ts      # Atomic locks, TTL expiry, disconnect cleanup
│   ├── ticketStore.ts      # In-memory ticket CRUD
│   └── ticketGenerator.ts  # Mock ticket streaming
├── store/
│   └── ticketStore.ts      # Zustand realtime store
├── types/
│   └── index.ts            # Shared TypeScript interfaces
├── utils/
│   └── formatters.ts       # Time-ago, countdown, priority/status styles
├── Prompts.md              # AI-assisted engineering decisions documentation
├── presentation_notes.md   # Full demo script with talking points
├── .env.local.example      # Local environment template
└── .env.production.example # Production environment template
```

---

## 🔧 Production Deployment

### Server (Render / Railway / Fly.io)

Set environment variables:
```
PORT=4000
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

### Client (Vercel)

Set environment variable:
```
NEXT_PUBLIC_SOCKET_URL=https://your-backend.onrender.com
```

See [`.env.production.example`](./.env.production.example) for full reference.

---

## 📖 Engineering Documentation

- **[`Prompts.md`](./Prompts.md)** — Detailed record of all AI-assisted engineering decisions: socket singleton design, lock manager architecture, ghost-disconnect cleanup, React Strict Mode handling, reconnect synchronization, and production deployment config.
- **[`presentation_notes.md`](./presentation_notes.md)** — Scene-by-scene demo guide with exact click instructions, audience talking points, and business value explanations.

---

## 🛡️ Key Engineering Decisions

- **Node.js single-threaded event loop** guarantees `acquireLock()` is atomic — no mutex needed
- **`socketId` as lock identity** — not agent name — so disconnect cleanup is precise
- **`useRef(false)` guard** in `useSocket` prevents React Strict Mode double-listener registration
- **`reason` field on `ticket_unlocked`** enables context-specific toasts (disconnect vs save vs expiry)
- **No `setInterval` on client** — pure event-driven; all state comes from server push

---

*Built with Next.js 16 · Socket.io 4 · TypeScript · Zustand · Tailwind CSS · Framer Motion*
