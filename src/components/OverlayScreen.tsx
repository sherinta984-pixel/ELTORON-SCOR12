import { useEffect, useMemo, useState } from 'react';
import { ExactScoreboard } from './ExactScoreboard';
import { BroadcastBug } from './BroadcastBug';
import {
  INITIAL_SCOREBOARD_STATE,
} from '../data/presets';
import type {
  RaidingTeam,
  ScoreboardState,
} from '../types/scoreboard';

const INITIAL_OVERLAY_STATE: ScoreboardState = {
  ...INITIAL_SCOREBOARD_STATE,
  left: { ...INITIAL_SCOREBOARD_STATE.left, name: 'TEAM 1', score: 0 },
  right: { ...INITIAL_SCOREBOARD_STATE.right, name: 'TEAM 2', score: 0 },
  clock: {
    ...INITIAL_SCOREBOARD_STATE.clock,
    mode: 'countdown',
    durationSeconds: 30,
    seconds: 30,
    running: false,
    twoDigitSeconds: true,
    showTenthsUnder10: false,
  },
  center: {
    ...INITIAL_SCOREBOARD_STATE.center,
    topCrownText: 'SV MEDIA',
    centerSubText: '',
    bottomBaseText: '',
  },
};

type ControllerMessage = {
  team1_name?: unknown;
  team1_score?: unknown;
  team2_name?: unknown;
  team2_score?: unknown;
  timer?: unknown;
  timer_running?: unknown;
  raiding_team?: unknown;
};

function parseTimer(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.max(0, value) : null;
  }
  if (typeof value !== 'string' || !value.trim()) return null;

  const input = value.trim();
  if (input.includes(':')) {
    const parts = input.split(':');
    if (parts.length !== 2) return null;
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);
    if (
      !Number.isFinite(minutes) ||
      !Number.isFinite(seconds) ||
      minutes < 0 ||
      seconds < 0 ||
      seconds >= 60
    ) return null;
    return minutes * 60 + seconds;
  }

  const parsed = Number(input);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

function parseNumber(value: unknown, fallback: number): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return fallback;
}

function parseRaidingTeam(value: unknown): RaidingTeam | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim().toLowerCase();

  if (['left', 'team1', 'team 1', '1', 'a'].includes(text)) return 'left';
  if (['right', 'team2', 'team 2', '2', 'b'].includes(text)) return 'right';
  if (['none', 'off', '0', 'false', ''].includes(text)) return 'none';

  return null;
}

export function OverlayScreen() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const design = params.get('design') === 'turbo' ? 'turbo' : 'exact';
  const halfLabel = params.get('halfLabel') ?? '1ST HALF';
  const host = (params.get('host') || '127.0.0.1').trim();
  const port = (params.get('port') || '8765').trim();
  const websocketUrl = useMemo(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${host}:${port}`;
  }, [host, port]);

  const [scoreboard, setScoreboard] = useState<ScoreboardState>(INITIAL_OVERLAY_STATE);
  const [animationCommand, setAnimationCommand] = useState<'IN' | 'OUT'>('IN');
  const [visible, setVisible] = useState(true);
  const [teamACount, setTeamACount] = useState(7);
  const [teamBCount, setTeamBCount] = useState(7);
  const [stinger, setStinger] = useState({ commandId: '', label: '' });

  useEffect(() => {
    // vMix commands are listened to only by Design 2. The original Design 1 is not affected.
    if (design !== 'turbo') return;

    const onVmixCommand = (command: string) => {
      if (command === 'IN' || command === 'OUT') {
        setAnimationCommand(command);
        setVisible(command === 'IN');
      } else if (command === 'TEAM_A_MINUS') {
        setTeamACount((v) => Math.max(0, v - 1));
      } else if (command === 'TEAM_A_PLUS') {
        setTeamACount((v) => Math.min(7, v + 1));
      } else if (command === 'TEAM_B_MINUS') {
        setTeamBCount((v) => Math.max(0, v - 1));
      } else if (command === 'TEAM_B_PLUS') {
        setTeamBCount((v) => Math.min(7, v + 1));
      }
    };

    const events = new EventSource('/vmix/events');
    events.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (typeof payload.command === 'string') onVmixCommand(payload.command);
      } catch {
        // Ignore malformed vMix events.
      }
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const command = typeof event.data === 'string' ? event.data : event.data?.command;
      if (typeof command === 'string') onVmixCommand(command);
    };
    window.addEventListener('message', onMessage);
    return () => {
      events.close();
      window.removeEventListener('message', onMessage);
    };
  }, [design]);

  useEffect(() => {
    if (design !== 'turbo') return;
    if (animationCommand === 'IN') setVisible(true);
    if (animationCommand === 'OUT') setVisible(false);
  }, [animationCommand, design]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;

      try {
        socket = new WebSocket(websocketUrl);
      } catch (error) {
        console.error('Could not create scoreboard connection:', error);
        reconnectTimer = window.setTimeout(connect, 2000);
        return;
      }

      socket.onopen = () => {
        console.info('Connected to Kabaddi controller:', websocketUrl);
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        try {
          const data = JSON.parse(event.data) as ControllerMessage;

          setScoreboard((current) => {
            const timer = parseTimer(data.timer);
            const raider = parseRaidingTeam(data.raiding_team);

            return {
              ...current,
              left: {
                ...current.left,
                name:
                  typeof data.team1_name === 'string'
                    ? data.team1_name
                    : current.left.name,
                score: parseNumber(data.team1_score, current.left.score),
              },
              right: {
                ...current.right,
                name:
                  typeof data.team2_name === 'string'
                    ? data.team2_name
                    : current.right.name,
                score: parseNumber(data.team2_score, current.right.score),
              },
              clock: {
                ...current.clock,
                mode: 'countdown',
                seconds: timer ?? current.clock.seconds,
                running: parseBoolean(data.timer_running, current.clock.running),
                twoDigitSeconds: true,
                showTenthsUnder10: false,
              },
              raidingTeam: raider ?? current.raidingTeam,
            };
          });
        } catch (error) {
          console.error('Invalid data received from Kabaddi controller:', error);
        }
      };

      socket.onerror = () => {
      };

      socket.onclose = () => {
        if (!stopped) reconnectTimer = window.setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [host, port, websocketUrl]);

  useEffect(() => {
    if (design !== 'exact') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'kabaddi-overlay-half-label') {
        setScoreboard((current) => ({
          ...current,
          center: { ...current.center, topCrownText: event.newValue || ' ' },
        }));
      }
    };
    return () => window.removeEventListener('storage', onStorage);
  }, [design]);

  useEffect(() => {
    if (design !== 'exact') return;
    if (halfLabel !== null) {
      setScoreboard((current) => ({
        ...current,
        center: { ...current.center, topCrownText: halfLabel },
      }));
    }
  }, [design, halfLabel]);

  const teamA = {
    id: 'A' as const,
    name: scoreboard.left.name,
    shortCode: scoreboard.left.name.slice(0, 3).toUpperCase(),
    color: '#E52C40',
    score: scoreboard.left.score,
    onMat: teamACount,
    emptyRaidStreak: 0,
    timeoutsLeft: 0,
    reviewsLeft: 0,
    allOutsConceded: 0,
    allOutsInflicted: 0,
    breakdown: { raid: 0, tackle: 0, bonus: 0, allOut: 0, extra: 0 },
  };
  const teamB = {
    id: 'B' as const,
    name: scoreboard.right.name,
    shortCode: scoreboard.right.name.slice(0, 3).toUpperCase(),
    color: '#287CDB',
    score: scoreboard.right.score,
    onMat: teamBCount,
    emptyRaidStreak: 0,
    timeoutsLeft: 0,
    reviewsLeft: 0,
    allOutsConceded: 0,
    allOutsInflicted: 0,
    breakdown: { raid: 0, tackle: 0, bonus: 0, allOut: 0, extra: 0 },
  };
  const phase = (halfLabel.toUpperCase().includes('2ND') || halfLabel.toUpperCase().includes('SECOND')
      ? 'SECOND_HALF'
      : 'FIRST_HALF') as 'FIRST_HALF' | 'SECOND_HALF';

  return (
    <main className={`overlay-viewport overlay-design-${design}`} aria-label="Kabaddi scoreboard overlay">
      <div className={`overlay-frame ${visible ? 'overlay-visible' : 'overlay-hidden'}`}>
        {design === 'turbo' ? (
          <BroadcastBug
            teamA={teamA}
            teamB={teamB}
            phase={phase}
            raidClockSeconds={scoreboard.clock.seconds}
            raidDurationSeconds={scoreboard.clock.durationSeconds || 30}
            raidingTeam={scoreboard.raidingTeam === 'right' ? 'B' : 'A'}
            isRaidClockRunning={scoreboard.clock.running}
            halfLabel={halfLabel}
            playerCountA={teamACount}
            playerCountB={teamBCount}
            animationCommand={animationCommand}
          />
        ) : (
          <ExactScoreboard state={scoreboard} introTrigger={animationCommand === 'IN' ? 1 : 0} />
        )}
      </div>
    </main>
  );
}
