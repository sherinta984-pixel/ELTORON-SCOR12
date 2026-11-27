import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Keyboard,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { ClockAndCenterCard } from './components/ClockAndCenterCard';
import { ExactScoreboard } from './components/ExactScoreboard';
import { MatchLogPanel } from './components/MatchLogPanel';
import { TeamControlCard } from './components/TeamControlCard';
import {
  INITIAL_SCOREBOARD_STATE,
  MATCH_PRESETS,
} from './data/presets';
import {
  ClockState,
  MatchEvent,
  RaidingTeam,
  ScoreboardState,
  StageBackground,
  TeamState,
} from './types/scoreboard';
import { formatClockDisplay } from './utils/formatClock';

const STORAGE_KEY = 'broadcast_scoreboard_state_v3';
const CHANNEL_NAME = 'broadcast_scoreboard_sync_v3';

function loadInitialState(): ScoreboardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_SCOREBOARD_STATE;
    const parsed = JSON.parse(raw) as Partial<ScoreboardState>;
    return {
      ...INITIAL_SCOREBOARD_STATE,
      ...parsed,
      left: {
        ...INITIAL_SCOREBOARD_STATE.left,
        ...parsed.left,
        fillColor: INITIAL_SCOREBOARD_STATE.left.fillColor,
        scoreBgColor: INITIAL_SCOREBOARD_STATE.left.scoreBgColor,
        borderColor: INITIAL_SCOREBOARD_STATE.left.borderColor,
        glowColor: INITIAL_SCOREBOARD_STATE.left.glowColor,
        textColor: INITIAL_SCOREBOARD_STATE.left.textColor,
      },
      right: {
        ...INITIAL_SCOREBOARD_STATE.right,
        ...parsed.right,
        fillColor: INITIAL_SCOREBOARD_STATE.right.fillColor,
        scoreBgColor: INITIAL_SCOREBOARD_STATE.right.scoreBgColor,
        borderColor: INITIAL_SCOREBOARD_STATE.right.borderColor,
        glowColor: INITIAL_SCOREBOARD_STATE.right.glowColor,
        textColor: INITIAL_SCOREBOARD_STATE.right.textColor,
      },
      clock: { ...INITIAL_SCOREBOARD_STATE.clock, ...parsed.clock },
      center: {
        ...INITIAL_SCOREBOARD_STATE.center,
        ...parsed.center,
        topCrownText:
          !parsed.center?.topCrownText ||
          parsed.center.topCrownText.trim().toUpperCase() === 'KABADDI'
            ? 'SV MEDIA'
            : parsed.center.topCrownText,
      },
    };
  } catch {
    return INITIAL_SCOREBOARD_STATE;
  }
}

function nowTimeString(): string {
  const d = new Date();
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function App() {
  const isOverlayMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('overlay') === '1';
  }, []);

  const [state, setState] = useState<ScoreboardState>(loadInitialState);
  const [undoStack, setUndoStack] = useState<ScoreboardState[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [stageBg, setStageBg] = useState<StageBackground>('studio');
  const [scalePct, setScalePct] = useState<number>(100);
  const [broadcastView, setBroadcastView] = useState<boolean>(false);
  const [copiedOverlay, setCopiedOverlay] = useState<boolean>(false);
  const [introTrigger, setIntroTrigger] = useState<number>(0);

  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastTickRef = useRef<number | null>(null);

  // Setup cross-tab BroadcastChannel sync for OBS / dual-window operation
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = ch;

    ch.onmessage = (ev: MessageEvent<{ type: string; payload: ScoreboardState }>) => {
      if (ev.data?.type === 'STATE_SYNC' && ev.data.payload) {
        setState(ev.data.payload);
      }
    };

    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, []);

  // Also listen for localStorage updates in overlay mode
  useEffect(() => {
    if (!isOverlayMode) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setState(JSON.parse(e.newValue) as ScoreboardState);
        } catch {
          // ignore malformed JSON
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [isOverlayMode]);

  // Persist & broadcast state whenever operator edits state
  useEffect(() => {
    if (isOverlayMode) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage quota errors
    }
    channelRef.current?.postMessage({ type: 'STATE_SYNC', payload: state });
  }, [state, isOverlayMode]);

  // Drift-free 100ms clock ticker (runs in operator mode; overlay mirrors via sync)
  useEffect(() => {
    if (isOverlayMode || !state.clock.running || state.clock.mode === 'static') {
      lastTickRef.current = null;
      return;
    }

    lastTickRef.current = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const prev = lastTickRef.current ?? now;
      const dt = (now - prev) / 1000;
      lastTickRef.current = now;

      setState((cur) => {
        if (!cur.clock.running || cur.clock.mode === 'static') return cur;
        if (cur.clock.mode === 'countdown') {
          const next = Math.max(0, cur.clock.seconds - dt);
          return {
            ...cur,
            clock: {
              ...cur.clock,
              seconds: next,
              running: next > 0,
            },
          };
        }
        return {
          ...cur,
          clock: {
            ...cur.clock,
            seconds: cur.clock.seconds + dt,
          },
        };
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [isOverlayMode, state.clock.running, state.clock.mode]);

  const logEvent = useCallback(
    (description: string, nextState: ScoreboardState) => {
      const entry: MatchEvent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: nowTimeString(),
        clockAtEvent: formatClockDisplay(nextState.clock),
        description,
        scoreSnapshot: `${nextState.left.score} - ${nextState.right.score}`,
      };
      setEvents((prev) => [entry, ...prev].slice(0, 50));
    },
    [],
  );

  const commitState = useCallback(
    (updater: (prev: ScoreboardState) => ScoreboardState, eventDescription?: string) => {
      setState((prev) => {
        const next = updater(prev);
        setUndoStack((stack) => [prev, ...stack].slice(0, 25));
        if (eventDescription) {
          queueMicrotask(() => logEvent(eventDescription, next));
        }
        return next;
      });
    },
    [logEvent],
  );

  const handleAdjustScore = useCallback(
    (side: 'left' | 'right', delta: number) => {
      commitState(
        (prev) => {
          const team = prev[side];
          const nextScore = Math.max(-99, Math.min(999, team.score + delta));
          return {
            ...prev,
            [side]: { ...team, score: nextScore },
          };
        },
        `${side === 'left' ? state.left.name : state.right.name} ${delta >= 0 ? `+${delta}` : delta} pt`,
      );
    },
    [commitState, state.left.name, state.right.name],
  );

  const handleSetRaidingTeam = useCallback(
    (team: RaidingTeam) => {
      setState((prev) => {
        if (prev.raidingTeam === team) return prev;
        const next: ScoreboardState = { ...prev, raidingTeam: team };
        setUndoStack((stack) => [prev, ...stack].slice(0, 25));
        const desc =
          team === 'none'
            ? 'Raid indicator cleared'
            : `${team === 'left' ? prev.left.name : prev.right.name} raiding`;
        queueMicrotask(() => logEvent(desc, next));
        return next;
      });
    },
    [logEvent],
  );

  const handleToggleRaidingTeam = useCallback(
    (side: 'left' | 'right') => {
      setState((prev) => {
        const nextTeam: RaidingTeam = prev.raidingTeam === side ? 'none' : side;
        const next: ScoreboardState = { ...prev, raidingTeam: nextTeam };
        setUndoStack((stack) => [prev, ...stack].slice(0, 25));
        const desc =
          nextTeam === 'none'
            ? 'Raid indicator cleared'
            : `${side === 'left' ? prev.left.name : prev.right.name} raiding`;
        queueMicrotask(() => logEvent(desc, next));
        return next;
      });
    },
    [logEvent],
  );

  const handleSwapSides = useCallback(() => {
    commitState(
      (prev) => ({
        ...prev,
        left: {
          ...prev.right,
          fillColor: INITIAL_SCOREBOARD_STATE.left.fillColor,
          scoreBgColor: INITIAL_SCOREBOARD_STATE.left.scoreBgColor,
          borderColor: INITIAL_SCOREBOARD_STATE.left.borderColor,
          glowColor: INITIAL_SCOREBOARD_STATE.left.glowColor,
          textColor: INITIAL_SCOREBOARD_STATE.left.textColor,
        },
        right: {
          ...prev.left,
          fillColor: INITIAL_SCOREBOARD_STATE.right.fillColor,
          scoreBgColor: INITIAL_SCOREBOARD_STATE.right.scoreBgColor,
          borderColor: INITIAL_SCOREBOARD_STATE.right.borderColor,
          glowColor: INITIAL_SCOREBOARD_STATE.right.glowColor,
          textColor: INITIAL_SCOREBOARD_STATE.right.textColor,
        },
        raidingTeam:
          prev.raidingTeam === 'left'
            ? 'right'
            : prev.raidingTeam === 'right'
              ? 'left'
              : 'none',
      }),
      'Swapped Left & Right sides',
    );
  }, [commitState]);

  const handleToggleRun = useCallback(() => {
    setState((prev) => {
      if (prev.clock.mode === 'static') return prev;
      if (prev.clock.mode === 'countdown' && prev.clock.seconds <= 0) {
        return {
          ...prev,
          clock: {
            ...prev.clock,
            seconds: prev.clock.durationSeconds,
            running: true,
          },
        };
      }
      return {
        ...prev,
        clock: { ...prev.clock, running: !prev.clock.running },
      };
    });
  }, []);

  const handleResetClock = useCallback(() => {
    commitState(
      (prev) => ({
        ...prev,
        clock: {
          ...prev.clock,
          seconds: prev.clock.mode === 'countup' ? 0 : prev.clock.durationSeconds,
          running: false,
        },
      }),
      'Reset match clock',
    );
  }, [commitState]);

  const handleResetMatch = useCallback(() => {
    commitState(
      (prev) => ({
        ...prev,
        raidingTeam: 'none',
        left: { ...prev.left, score: 0, ticks: 0 },
        right: { ...prev.right, score: 0, ticks: 0 },
        clock: {
          ...prev.clock,
          seconds: prev.clock.mode === 'countup' ? 0 : prev.clock.durationSeconds,
          running: false,
        },
      }),
      'Reset match scores & clock',
    );
  }, [commitState]);

  const handleUndo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const [previous, ...rest] = stack;
      setState(previous);
      logEvent('Undid last action', previous);
      return rest;
    });
  }, [logEvent]);

  const handleCopyOverlayUrl = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}?overlay=1`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedOverlay(true);
      window.setTimeout(() => setCopiedOverlay(false), 2000);
    } catch {
      setCopiedOverlay(false);
    }
  }, []);

  // Global keyboard shortcuts for live broadcast operation
  useEffect(() => {
    if (isOverlayMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && broadcastView) {
        setBroadcastView(false);
        return;
      }

      if (!state.hotkeysEnabled) return;
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (isTyping) return;

      const key = e.key.toLowerCase();
      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleRun();
      } else if (key === 'q') {
        e.preventDefault();
        handleAdjustScore('left', 1);
      } else if (key === 'a') {
        e.preventDefault();
        handleAdjustScore('left', -1);
      } else if (key === 'p') {
        e.preventDefault();
        handleAdjustScore('right', 1);
      } else if (key === 'l') {
        e.preventDefault();
        handleAdjustScore('right', -1);
      } else if (key === 's') {
        e.preventDefault();
        handleSwapSides();
      } else if (key === 'r') {
        e.preventDefault();
        handleResetClock();
      } else if (key === 'f') {
        e.preventDefault();
        setBroadcastView((v) => !v);
      } else if (key === '1') {
        e.preventDefault();
        handleToggleRaidingTeam('left');
      } else if (key === '2') {
        e.preventDefault();
        handleToggleRaidingTeam('right');
      } else if (key === '0') {
        e.preventDefault();
        handleSetRaidingTeam('none');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    isOverlayMode,
    broadcastView,
    state.hotkeysEnabled,
    handleToggleRun,
    handleAdjustScore,
    handleSwapSides,
    handleResetClock,
    handleToggleRaidingTeam,
    handleSetRaidingTeam,
  ]);

  // Pure OBS Browser Source Overlay Mode (?overlay=1)
  if (isOverlayMode) {
    return (
      <div className="min-h-screen w-full bg-transparent flex items-start justify-center pt-6 px-6">
        <div className="w-full max-w-[1400px]">
          <ExactScoreboard state={state} introTrigger={introTrigger} />
        </div>
      </div>
    );
  }

  const stageBgClass: Record<StageBackground, string> = {
    studio: 'bg-[#090b10]',
    white: 'bg-white',
    'chroma-green': 'bg-[#00ff00]',
    'chroma-blue': 'bg-[#0000ff]',
    transparent: 'checkerboard-bg',
  };

  // Fullscreen Broadcast View (HUD-only)
  if (broadcastView) {
    return (
      <div
        className={`min-h-screen w-full flex flex-col items-center justify-center p-6 sm:p-12 transition-colors ${stageBgClass[stageBg]}`}
      >
        <div
          className="w-full transition-transform duration-150"
          style={{ maxWidth: `${(1360 * scalePct) / 100}px` }}
        >
          <ExactScoreboard state={state} introTrigger={introTrigger} />
        </div>

        <div className="fixed bottom-5 right-5 flex items-center gap-2 flex-wrap bg-[#090b10]/90 backdrop-blur border border-white/15 rounded-lg p-1.5 shadow-xl">
          <button
            type="button"
            onClick={() => handleToggleRaidingTeam('left')}
            aria-pressed={state.raidingTeam === 'left'}
            className={`px-3 py-1.5 text-xs font-semibold rounded whitespace-nowrap transition-colors ${
              state.raidingTeam === 'left'
                ? 'bg-[#dc2626] text-white'
                : 'text-slate-200 bg-white/10 hover:bg-white/20'
            }`}
          >
            {state.left.name.slice(0, 8)} Raid
          </button>
          <button
            type="button"
            onClick={() => handleAdjustScore('left', 1)}
            className="px-3 py-1.5 text-xs font-mono-tabular font-semibold text-white bg-white/10 hover:bg-white/20 rounded whitespace-nowrap"
          >
            {state.left.name.slice(0, 8)} +1
          </button>
          <button
            type="button"
            onClick={handleToggleRun}
            className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded whitespace-nowrap"
          >
            {state.clock.running ? 'Pause' : 'Start'}
          </button>
          <button
            type="button"
            onClick={() => handleAdjustScore('right', 1)}
            className="px-3 py-1.5 text-xs font-mono-tabular font-semibold text-white bg-white/10 hover:bg-white/20 rounded whitespace-nowrap"
          >
            {state.right.name.slice(0, 8)} +1
          </button>
          <button
            type="button"
            onClick={() => handleToggleRaidingTeam('right')}
            aria-pressed={state.raidingTeam === 'right'}
            className={`px-3 py-1.5 text-xs font-semibold rounded whitespace-nowrap transition-colors ${
              state.raidingTeam === 'right'
                ? 'bg-[#dc2626] text-white'
                : 'text-slate-200 bg-white/10 hover:bg-white/20'
            }`}
          >
            {state.right.name.slice(0, 8)} Raid
          </button>
          <button
            type="button"
            onClick={() => setBroadcastView(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 rounded whitespace-nowrap"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            Exit (Esc)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex flex-col">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-[#090b10]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-[1440px] mx-auto px-6 py-3.5 flex items-center justify-between gap-8">
          <a
            href="#stage"
            className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            Broadcast Scoreboard Studio
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <a
              href="#stage"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Stage
            </a>
            <a
              href="#controls"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Controls
            </a>
            <a
              href="#presets"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Presets
            </a>
            <a
              href="#match-log"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Event Log
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setBroadcastView(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-white hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Broadcast View
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6 flex flex-col gap-6">
        {/* Dominant Focal Anchor: Live Scoreboard Stage */}
        <section id="stage" className="flex flex-col gap-3">
          {/* Stage Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#11141c] border border-white/10 rounded-xl px-4 py-2.5">
            {/* Stage Canvas Selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-slate-400 mr-1">Stage</span>
              <div className="flex items-center gap-1 p-1 bg-[#090b10] border border-white/10 rounded-lg">
                {(
                  [
                    { id: 'white', label: 'White' },
                    { id: 'studio', label: 'Studio' },
                    { id: 'chroma-green', label: 'Green' },
                    { id: 'chroma-blue', label: 'Blue' },
                    { id: 'transparent', label: 'Grid' },
                  ] as { id: StageBackground; label: string }[]
                ).map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setStageBg(bg.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      stageBg === bg.id
                        ? 'bg-white text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Graphic Feature Toggles & OBS Copy URL */}
            <div className="flex items-center gap-3 flex-wrap">
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={state.showTicks}
                  onChange={(e) => setState((p) => ({ ...p, showTicks: e.target.checked }))}
                  className="rounded border-white/20 bg-[#090b10]"
                />
                Ticks
              </label>

              <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={state.showLogos}
                  onChange={(e) => setState((p) => ({ ...p, showLogos: e.target.checked }))}
                  className="rounded border-white/20 bg-[#090b10]"
                />
                Logos
              </label>

              <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={state.showSparkChannels}
                  onChange={(e) =>
                    setState((p) => ({ ...p, showSparkChannels: e.target.checked }))
                  }
                  className="rounded border-white/20 bg-[#090b10]"
                />
                Accents
              </label>

              <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={state.showTextures}
                  onChange={(e) =>
                    setState((p) => ({ ...p, showTextures: e.target.checked }))
                  }
                  className="rounded border-white/20 bg-[#090b10]"
                />
                Textures
              </label>

              <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={state.animationsEnabled}
                  onChange={(e) =>
                    setState((p) => ({ ...p, animationsEnabled: e.target.checked }))
                  }
                  className="rounded border-white/20 bg-[#090b10]"
                />
                Motion
              </label>

              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-white/10">
                <span className="text-xs text-slate-400">Scale</span>
                <input
                  type="range"
                  min={65}
                  max={100}
                  value={scalePct}
                  onChange={(e) => setScalePct(Number(e.target.value))}
                  aria-label="Scoreboard stage scale"
                  className="w-20 accent-white cursor-pointer"
                />
                <span className="text-xs font-mono-tabular text-slate-300 w-9 text-right">
                  {scalePct}%
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIntroTrigger((k) => k + 1)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-white/5 hover:bg-white/10 border border-white/12 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Replay Intro
              </button>

              <button
                type="button"
                onClick={handleCopyOverlayUrl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-white/5 hover:bg-white/10 border border-white/12 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {copiedOverlay ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied OBS URL
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy OBS Overlay URL
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Live Scoreboard Canvas */}
          <div
            className={`relative w-full rounded-xl border border-white/12 px-4 sm:px-10 py-10 sm:py-14 flex items-center justify-center transition-colors min-h-[240px] overflow-hidden ${stageBgClass[stageBg]}`}
          >
            {stageBg === 'studio' && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(ellipse 75% 65% at 50% 50%, rgba(30, 41, 59, 0.35) 0%, rgba(9, 11, 16, 0) 75%)',
                }}
              />
            )}
            <div
              className="relative z-10 w-full transition-transform duration-150"
              style={{ maxWidth: `${(1280 * scalePct) / 100}px` }}
            >
              <ExactScoreboard state={state} introTrigger={introTrigger} />
            </div>
          </div>
        </section>

        {/* Operator Control Deck */}
        <section
          id="controls"
          className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch"
        >
          <TeamControlCard
            side="left"
            team={state.left}
            stepButtons={state.scoreStepButtons}
            showTicks={state.showTicks}
            showLogos={state.showLogos}
            isRaiding={state.raidingTeam === 'left'}
            hotkeyPlus="Q"
            hotkeyMinus="A"
            hotkeyRaid="1"
            onChange={(updated: Partial<TeamState>) =>
              setState((prev) => ({
                ...prev,
                left: { ...prev.left, ...updated },
              }))
            }
            onAdjustScore={(delta) => handleAdjustScore('left', delta)}
            onResetScore={() =>
              commitState(
                (prev) => ({ ...prev, left: { ...prev.left, score: 0 } }),
                `Reset ${state.left.name} score`,
              )
            }
            onToggleRaiding={() => handleToggleRaidingTeam('left')}
          />

          <ClockAndCenterCard
            clock={state.clock}
            center={state.center}
            raidingTeam={state.raidingTeam}
            leftName={state.left.name}
            rightName={state.right.name}
            onClockChange={(updated: Partial<ClockState>) =>
              setState((prev) => ({
                ...prev,
                clock: { ...prev.clock, ...updated },
              }))
            }
            onCenterChange={(updated) =>
              setState((prev) => ({
                ...prev,
                center: { ...prev.center, ...updated },
              }))
            }
            onToggleRun={handleToggleRun}
            onResetClock={handleResetClock}
            onSwapSides={handleSwapSides}
            onSetRaidingTeam={handleSetRaidingTeam}
          />

          <TeamControlCard
            side="right"
            team={state.right}
            stepButtons={state.scoreStepButtons}
            showTicks={state.showTicks}
            showLogos={state.showLogos}
            isRaiding={state.raidingTeam === 'right'}
            hotkeyPlus="P"
            hotkeyMinus="L"
            hotkeyRaid="2"
            onChange={(updated: Partial<TeamState>) =>
              setState((prev) => ({
                ...prev,
                right: { ...prev.right, ...updated },
              }))
            }
            onAdjustScore={(delta) => handleAdjustScore('right', delta)}
            onResetScore={() =>
              commitState(
                (prev) => ({ ...prev, right: { ...prev.right, score: 0 } }),
                `Reset ${state.right.name} score`,
              )
            }
            onToggleRaiding={() => handleToggleRaidingTeam('right')}
          />
        </section>

        {/* Presets & Keyboard Shortcuts */}
        <section
          id="presets"
          className="bg-[#11141c] border border-white/10 rounded-xl p-5 flex flex-col gap-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/8">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Match Presets &amp; Shortcuts
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Load ruleset presets and manage live keyboard shortcuts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setState((prev) => ({ ...prev, hotkeysEnabled: !prev.hotkeysEnabled }))
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  state.hotkeysEnabled
                    ? 'bg-white/10 text-white border-white/20'
                    : 'bg-transparent text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                Hotkeys: {state.hotkeysEnabled ? 'On' : 'Off'}
              </button>

              <button
                type="button"
                onClick={handleResetMatch}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-200 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Match
              </button>
            </div>
          </div>

          {/* Sport / Format Presets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {MATCH_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  commitState(
                    (prev) => preset.apply(prev),
                    `Applied preset: ${preset.name}`,
                  )
                }
                className="text-left p-3.5 bg-[#090b10] hover:bg-white/[0.04] border border-white/10 hover:border-white/25 rounded-lg transition-colors flex flex-col gap-1"
              >
                <span className="text-xs font-semibold text-white">{preset.name}</span>
                <span className="text-[11px] text-slate-400 leading-snug">
                  {preset.subtitle}
                </span>
              </button>
            ))}
          </div>

          {/* Keyboard Shortcuts Reference */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/8">
            <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400">
              <span>
                <kbd className="font-mono-tabular text-slate-200">Space</kbd> Start/Pause
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <kbd className="font-mono-tabular text-slate-200">Q / A</kbd> Left ±1
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <kbd className="font-mono-tabular text-slate-200">P / L</kbd> Right ±1
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <kbd className="font-mono-tabular text-slate-200">S</kbd> Swap
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <kbd className="font-mono-tabular text-slate-200">R</kbd> Reset Clock
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <kbd className="font-mono-tabular text-slate-200">1 / 2 / 0</kbd> Raid L/R/Off
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <kbd className="font-mono-tabular text-slate-200">F</kbd> Fullscreen
              </span>
            </div>
          </div>
        </section>

        {/* Match Event Log */}
        <div id="match-log">
          <MatchLogPanel
            events={events}
            canUndo={undoStack.length > 0}
            onUndo={handleUndo}
            onClear={() => setEvents([])}
          />
        </div>
      </main>
    </div>
  );
}
