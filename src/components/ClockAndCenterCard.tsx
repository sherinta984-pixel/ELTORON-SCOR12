import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, Flame, Pause, Play, RotateCcw } from 'lucide-react';
import { CenterHubState, ClockState, RaidingTeam, TimerMode } from '../types/scoreboard';
import { formatClockDisplay, parseClockInput } from '../utils/formatClock';

interface ClockAndCenterCardProps {
  clock: ClockState;
  center: CenterHubState;
  raidingTeam: RaidingTeam;
  leftName: string;
  rightName: string;
  onClockChange: (updated: Partial<ClockState>) => void;
  onCenterChange: (updated: Partial<CenterHubState>) => void;
  onToggleRun: () => void;
  onResetClock: () => void;
  onSwapSides: () => void;
  onSetRaidingTeam: (team: RaidingTeam) => void;
}

export const ClockAndCenterCard: React.FC<ClockAndCenterCardProps> = ({
  clock,
  center,
  raidingTeam,
  leftName,
  rightName,
  onClockChange,
  onCenterChange,
  onToggleRun,
  onResetClock,
  onSwapSides,
  onSetRaidingTeam,
}) => {
  const [timeInput, setTimeInput] = useState(formatClockDisplay(clock));

  useEffect(() => {
    setTimeInput(formatClockDisplay(clock));
  }, [clock.seconds, clock.mode, clock.staticLabel, clock.twoDigitSeconds]);

  const commitTimeInput = () => {
    if (clock.mode === 'static') {
      onClockChange({ staticLabel: timeInput || 'VS' });
      return;
    }
    const parsed = parseClockInput(timeInput);
    if (parsed !== null) {
      const useTwoDigits = !timeInput.includes(':') && parsed < 100;
      onClockChange({
        seconds: parsed,
        durationSeconds: clock.mode === 'countdown' ? parsed : clock.durationSeconds,
        twoDigitSeconds: useTwoDigits,
      });
    } else {
      setTimeInput(formatClockDisplay(clock));
    }
  };

  const adjustSeconds = (delta: number) => {
    const next = Math.max(0, Math.round(clock.seconds + delta));
    onClockChange({ seconds: next });
  };

  const stepRoundLabel = (delta: number) => {
    const match = center.topCrownText.match(/^(.*?)(\d+)\s*$/);
    if (match) {
      const nextNum = Math.max(1, parseInt(match[2], 10) + delta);
      onCenterChange({ topCrownText: `${match[1]}${nextNum}` });
    }
  };

  const modes: { id: TimerMode; label: string }[] = [
    { id: 'countdown', label: 'Countdown' },
    { id: 'countup', label: 'Count Up' },
    { id: 'static', label: 'Static Text' },
  ];

  return (
    <section className="bg-[#11141c] border border-white/10 rounded-xl p-5 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/8">
        <h2 className="text-sm font-semibold text-slate-100">Center Hub &amp; Clock</h2>
        <button
          type="button"
          onClick={onSwapSides}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-400"
          title="Swap Left and Right teams (S)"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          Swap Sides
        </button>
      </div>

      {/* Timer Mode Segmented Switch */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-[#090b10] border border-white/10 rounded-lg">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onClockChange({ mode: m.id, running: false })}
            className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              clock.mode === m.id
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Main Clock Input & Run/Reset Controls */}
      {clock.mode !== 'static' ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              onBlur={commitTimeInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitTimeInput();
                  e.currentTarget.blur();
                }
              }}
              aria-label="Match clock seconds or MM:SS"
              className="h-12 w-full min-w-0 text-center text-2xl font-bold font-mono-tabular text-white bg-[#090b10] border border-white/12 rounded-lg focus:outline-none focus:border-white/35"
            />
            <button
              type="button"
              onClick={onToggleRun}
              className={`h-12 px-4 inline-flex items-center justify-center gap-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-400 ${
                clock.running
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              {clock.running ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onResetClock}
              className="h-12 px-3 inline-flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-200 transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-sky-400"
              aria-label="Reset clock"
              title="Reset clock (R)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {[
              { label: '-10s', delta: -10 },
              { label: '-5s', delta: -5 },
              { label: '+5s', delta: 5 },
              { label: '+10s', delta: 10 },
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={() => adjustSeconds(btn.delta)}
                className="py-1.5 text-xs font-mono-tabular font-medium text-slate-300 hover:text-white bg-[#090b10] hover:bg-white/8 border border-white/10 rounded-md transition-colors"
              >
                {btn.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                onClockChange({
                  mode: 'countdown',
                  durationSeconds: 30,
                  seconds: 30,
                  running: false,
                  twoDigitSeconds: true,
                  showTenthsUnder10: false,
                })
              }
              className="py-1.5 text-xs font-mono-tabular font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-md transition-colors"
              title="Set 30 second raid countdown"
            >
              30s
            </button>
          </div>
        </div>
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-400">Center Shield Label</span>
          <input
            type="text"
            value={clock.staticLabel}
            maxLength={10}
            onChange={(e) => onClockChange({ staticLabel: e.target.value })}
            placeholder="VS"
            className="h-12 w-full text-center text-xl font-bold text-white bg-[#090b10] border border-white/12 rounded-lg focus:outline-none focus:border-white/35"
          />
        </label>
      )}

      {/* Active Raider Display Switch */}
      <div className="flex flex-col gap-2 pt-3 border-t border-white/8">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium inline-flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-red-400" />
            Active Raider Display
          </span>
          <span className="font-mono-tabular text-slate-500">Keys: 1 / 0 / 2</span>
        </div>
        <div className="grid grid-cols-3 gap-1 p-1 bg-[#090b10] border border-white/10 rounded-lg">
          <button
            type="button"
            onClick={() => onSetRaidingTeam(raidingTeam === 'left' ? 'none' : 'left')}
            className={`py-1.5 px-2 text-xs font-semibold rounded-md transition-colors truncate ${
              raidingTeam === 'left'
                ? 'bg-[#dc2626] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title={`Show RAIDING on ${leftName}`}
          >
            {leftName.trim() || 'Team A'}
          </button>
          <button
            type="button"
            onClick={() => onSetRaidingTeam('none')}
            className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              raidingTeam === 'none'
                ? 'bg-white/15 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Off
          </button>
          <button
            type="button"
            onClick={() => onSetRaidingTeam(raidingTeam === 'right' ? 'none' : 'right')}
            className={`py-1.5 px-2 text-xs font-semibold rounded-md transition-colors truncate ${
              raidingTeam === 'right'
                ? 'bg-[#dc2626] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title={`Show RAIDING on ${rightName}`}
          >
            {rightName.trim() || 'Team B'}
          </button>
        </div>
      </div>

      {/* Top Crown, Center Sub-label, Bottom Base */}
      <div className="flex flex-col gap-3 pt-3 border-t border-white/8">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Top Crown (Period / Round)</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onCenterChange({ topCrownText: 'SV MEDIA' })}
                className="px-2 py-0.5 text-xs text-red-300 hover:text-white bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 rounded transition-colors"
                title="Display glossy SV MEDIA broadcast logo in top crown"
              >
                SV MEDIA
              </button>
              <button
                type="button"
                onClick={() => stepRoundLabel(-1)}
                className="px-2 py-0.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
                title="Decrement number in crown label"
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => stepRoundLabel(1)}
                className="px-2 py-0.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
                title="Increment number in crown label"
              >
                +1
              </button>
            </div>
          </div>
          <input
            type="text"
            value={center.topCrownText}
            maxLength={20}
            onChange={(e) => onCenterChange({ topCrownText: e.target.value })}
            placeholder="SV MEDIA"
            className="w-full px-3 py-2 text-sm font-medium text-white bg-[#090b10] border border-white/12 rounded-lg focus:outline-none focus:border-white/35"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">Center Sub-Label</span>
            <input
              type="text"
              value={center.centerSubText}
              maxLength={16}
              onChange={(e) => onCenterChange({ centerSubText: e.target.value })}
              placeholder="Optional"
              className="w-full px-3 py-2 text-sm font-medium text-white bg-[#090b10] border border-white/12 rounded-lg focus:outline-none focus:border-white/35"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">Bottom Base Label</span>
            <input
              type="text"
              value={center.bottomBaseText}
              maxLength={20}
              onChange={(e) => onCenterChange({ bottomBaseText: e.target.value })}
              placeholder="BEST OF 5"
              className="w-full px-3 py-2 text-sm font-medium text-white bg-[#090b10] border border-white/12 rounded-lg focus:outline-none focus:border-white/35"
            />
          </label>
        </div>
      </div>
    </section>
  );
};
