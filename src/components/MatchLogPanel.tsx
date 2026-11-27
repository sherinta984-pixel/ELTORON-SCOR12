import React from 'react';
import { Trash2, Undo2 } from 'lucide-react';
import { MatchEvent } from '../types/scoreboard';

interface MatchLogPanelProps {
  events: MatchEvent[];
  canUndo: boolean;
  onUndo: () => void;
  onClear: () => void;
}

export const MatchLogPanel: React.FC<MatchLogPanelProps> = ({
  events,
  canUndo,
  onUndo,
  onClear,
}) => {
  return (
    <section className="bg-[#11141c] border border-white/10 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-semibold text-slate-100">Match Event Log</h2>
          <span className="text-xs font-mono-tabular text-slate-400">
            {events.length} {events.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
              canUndo
                ? 'text-slate-200 bg-white/5 hover:bg-white/10 border-white/10'
                : 'text-slate-600 bg-transparent border-white/5 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo Last
          </button>
          <button
            type="button"
            disabled={events.length === 0}
            onClick={onClear}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
              events.length > 0
                ? 'text-slate-300 hover:text-rose-300 bg-white/5 hover:bg-rose-500/10 border-white/10'
                : 'text-slate-600 bg-transparent border-white/5 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center">
          No match events recorded yet. Score updates, clock resets, and side swaps appear here.
        </p>
      ) : (
        <div className="overflow-x-auto max-h-52 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-white/8">
                <th className="py-2 pr-4 font-medium">Time</th>
                <th className="py-2 pr-4 font-medium">Clock</th>
                <th className="py-2 pr-4 font-medium">Event</th>
                <th className="py-2 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-white/[0.02]">
                  <td className="py-2 pr-4 font-mono-tabular text-slate-400 whitespace-nowrap">
                    {ev.timestamp}
                  </td>
                  <td className="py-2 pr-4 font-mono-tabular text-slate-300 whitespace-nowrap">
                    {ev.clockAtEvent}
                  </td>
                  <td className="py-2 pr-4 text-slate-200">{ev.description}</td>
                  <td className="py-2 text-right font-mono-tabular font-semibold text-white whitespace-nowrap">
                    {ev.scoreSnapshot}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
