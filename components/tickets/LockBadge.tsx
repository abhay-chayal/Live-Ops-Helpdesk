'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { TicketLock } from '@/types';
import { formatLockCountdown } from '@/utils/formatters';

interface LockBadgeProps {
  lock: TicketLock;
  isOwner: boolean;
}

export function LockBadge({ lock, isOwner }: LockBadgeProps) {
  const [countdown, setCountdown] = useState(() => formatLockCountdown(lock.expiresAt));
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    const tick = () => {
      const remaining = lock.expiresAt - Date.now();
      setCountdown(formatLockCountdown(lock.expiresAt));
      setIsExpiringSoon(remaining < 60_000); // < 1 minute
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lock.expiresAt]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, x: -8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.85, x: -8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold border ${
        isOwner
          ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
          : isExpiringSoon
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
          : 'bg-slate-700/80 text-slate-300 border-slate-600/50'
      }`}
    >
      <span className="text-sm">{isOwner ? '✏️' : '🔒'}</span>
      <span className="max-w-[120px] truncate">
        {isOwner ? 'You' : lock.agentName}
      </span>
      <span className={`text-[10px] opacity-70 tabular-nums ${isExpiringSoon ? 'text-amber-400' : ''}`}>
        {countdown}
      </span>
    </motion.div>
  );
}
