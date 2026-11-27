import { useEffect, useMemo, useState } from 'react';
import { ExactScoreboard } from './ExactScoreboard';
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
  const host = (params.get('host') || '127.0.0.1').trim();
  const port = (params.get('port') || '8765').trim();
  const websocketUrl = useMemo(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${host}:${port}`;
  }, [host, port]);

  const [scoreboard, setScoreboard] = useState<ScoreboardState>(INITIAL_OVERLAY_STATE);

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

  return (
    <main className="overlay-viewport" aria-label="Kabaddi scoreboard overlay">
      <div className="overlay-frame">
        <ExactScoreboard state={scoreboard} />
      </div>
    </main>
  );
}
