import { AnimatePresence, motion } from 'motion/react';

export interface BroadcastStinger {
  id: string;
  title: string;
  subtitle: string;
  tone: 'red' | 'blue' | 'gold';
}

interface EventStingerProps {
  stinger: BroadcastStinger | null;
}

export function EventStinger({ stinger }: EventStingerProps) {
  return (
    <div className="pointer-events-none absolute left-1/2 -bottom-2 -translate-x-1/2 z-30 flex items-center justify-center">
      <AnimatePresence>
        {stinger && (
          <motion.div
            key={stinger.id}
            data-testid="event-stinger"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`inline-flex items-center gap-3 rounded-xl border px-4 py-1.5 backdrop-blur-xl shadow-xl text-xs font-bold tracking-wider uppercase whitespace-nowrap ${
              stinger.tone === 'red'
                ? 'border-rose-400/45 bg-rose-950/80 text-rose-100'
                : stinger.tone === 'blue'
                  ? 'border-sky-400/45 bg-sky-950/80 text-sky-100'
                  : 'border-amber-400/50 bg-amber-950/85 text-amber-100'
            }`}
          >
            <span>{stinger.title}</span>
            <span className="text-white/40" aria-hidden="true">
              ·
            </span>
            <span className="font-medium text-white/85 normal-case tracking-normal">
              {stinger.subtitle}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
