'use client';

import { useTicketStore } from '@/store/ticketStore';
import { motion, AnimatePresence } from 'framer-motion';

export function ConnectionBanner() {
  const connected = useTicketStore((s) => s.socketConnected);

  return (
    <AnimatePresence>
      {!connected && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="bg-red-600 text-white text-sm font-medium px-4 py-2.5 flex items-center justify-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-200 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-100" />
            </span>
            <span>Connection Lost — Reconnecting to Live Ops Server...</span>
            <svg className="animate-spin h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
