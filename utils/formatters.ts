import type { Priority, TicketStatus } from '@/types';

// ── Time formatting ───────────────────────────────────────────

export function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatLockCountdown(expiresAt: number): string {
  const remaining = Math.max(0, expiresAt - Date.now());
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ── Priority styling ──────────────────────────────────────────

export const priorityConfig: Record<
  Priority,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  critical: {
    label: 'CRITICAL',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
    dot: 'bg-red-500',
  },
  high: {
    label: 'HIGH',
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    dot: 'bg-orange-500',
  },
  medium: {
    label: 'MEDIUM',
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    dot: 'bg-yellow-500',
  },
  low: {
    label: 'LOW',
    bg: 'bg-green-500/15',
    text: 'text-green-400',
    border: 'border-green-500/30',
    dot: 'bg-green-500',
  },
};

// ── Status styling ────────────────────────────────────────────

export const statusConfig: Record<
  TicketStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  open: {
    label: 'Open',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
  },
  pending: {
    label: 'Pending',
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
  },
  resolved: {
    label: 'Resolved',
    bg: 'bg-green-500/15',
    text: 'text-green-400',
    border: 'border-green-500/30',
  },
  closed: {
    label: 'Closed',
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
  },
};

// ── Avatar color from name ────────────────────────────────────
const avatarColors = [
  'bg-violet-600', 'bg-cyan-600', 'bg-emerald-600',
  'bg-rose-600', 'bg-amber-600', 'bg-indigo-600',
  'bg-teal-600', 'bg-pink-600',
];

export function agentColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export function agentInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
