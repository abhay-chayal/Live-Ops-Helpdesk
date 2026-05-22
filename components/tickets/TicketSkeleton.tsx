'use client';

export function TicketSkeleton() {
  return (
    <div className="animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="border-b border-slate-800 px-6 py-4 flex items-center gap-4"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          {/* ID */}
          <div className="h-4 w-20 bg-slate-800 rounded" />
          {/* Priority */}
          <div className="h-5 w-16 bg-slate-800 rounded-md" />
          {/* Customer */}
          <div className="h-4 w-36 bg-slate-800 rounded flex-shrink-0" />
          {/* Issue */}
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-800 rounded w-3/4" />
            <div className="h-3 bg-slate-800/60 rounded w-1/2" />
          </div>
          {/* Status */}
          <div className="h-5 w-20 bg-slate-800 rounded-full" />
          {/* Agent */}
          <div className="h-4 w-24 bg-slate-800 rounded" />
          {/* Time */}
          <div className="h-4 w-12 bg-slate-800 rounded" />
          {/* Button */}
          <div className="h-8 w-16 bg-slate-800 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
