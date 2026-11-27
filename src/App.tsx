import { useEffect, useMemo, useState } from 'react';
import { ExactScoreboard } from './components/ExactScoreboard';
import { INITIAL_SCOREBOARD_STATE } from './data/presets';
import type { RaidingTeam, ScoreboardState } from './types/scoreboard';

const DEFAULT_SERVER_HOST = '192.168.220.6';
const DEFAULT_SERVER_PORT = 8765;
const RECONNECT_DELAY_MS = 2000;

type ControllerMessage = {
  team1_name?: unknown;
  team1_score?: unknown;
  team2_name?: unknown;
  team2_score?: unknown;
  timer?: unknown;
  timer_running?: unknown;
  raiding_team?: unknown;
};

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

function buildWebSocketUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const explicitUrl = params.get('ws');
  if (explicitUrl) return explicitUrl;

  // The host can be overridden in the OBS Browser Source URL:
  // ?host=192.168.1.25&port=8765
  const host = (params.get('host') || DEFAULT_SERVER_HOST).trim();
  const port = (params.get('port') || String(DEFAULT_SERVER_PORT)).trim();
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${host}:${port}`;
}

function readText(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : Number.NaN;
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

function readTimerSeconds(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.max(0, value) : null;
  }
  if (typeof value !== 'string' || value.trim() === '') return null;

  const trimmed = value.trim();
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
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

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return fallback;
}

function readRaidingTeam(value: unknown): RaidingTeam | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const normalized = String(value).trim().toLowerCase();

  if (['left', 'team1', 'team 1', '1', 'a'].includes(normalized)) return 'left';
  if (['right', 'team2', 'team 2', '2', 'b'].includes(normalized)) return 'right';
  if (['none', 'off', '0', 'false', ''].includes(normalized)) return 'none';

  return null;
}

export default function App() {
  const [scoreboard, setScoreboard] = useState<ScoreboardState>(INITIAL_OVERLAY_STATE);
  const websocketUrl = useMemo(buildWebSocketUrl, []);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let disposed = false;

    const connect = () => {
      if (disposed) return;

      try {
        socket = new WebSocket(websocketUrl);
      } catch (error) {
        console.error('Could not create scoreboard WebSocket:', error);
        reconnectTimer = window.setTimeout(connect, RECONNECT_DELAY_MS);
        return;
      }

      socket.onopen = () => {
        console.info('Kabaddi scoreboard connected:', websocketUrl);
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        try {
          const data = JSON.parse(event.data) as ControllerMessage;

          setScoreboard((current) => {
            const timerSeconds = readTimerSeconds(data.timer);
            const raidingTeam = readRaidingTeam(data.raiding_team);

            return {
              ...current,
              left: {
                ...current.left,
                name: readText(data.team1_name, current.left.name),
                score: readNumber(data.team1_score, current.left.score),
              },
              right: {
                ...current.right,
                name: readText(data.team2_name, current.right.name),
                score: readNumber(data.team2_score, current.right.score),
              },
              clock: {
                ...current.clock,
                mode: 'countdown',
                seconds: timerSeconds ?? current.clock.seconds,
                running: readBoolean(data.timer_running, current.clock.running),
                twoDigitSeconds: true,
                showTenthsUnder10: false,
              },
              raidingTeam: raidingTeam ?? current.raidingTeam,
            };
          });
        } catch (error) {
          console.error('Invalid scoreboard data received:', error);
        }
      };

      socket.onerror = () => {
        // onclose handles reconnection; no status element is shown over the stream.
      };

      socket.onclose = () => {
        if (!disposed) {
          reconnectTimer = window.setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [websocketUrl]);

  // This page is deliberately only the transparent broadcast graphic.
  // All score, team-name and timer controls stay on the operator laptop.
  return (
    <main className="overlay-viewport" aria-label="Kabaddi scoreboard overlay">
      <div className="overlay-frame">
        <ExactScoreboard state={scoreboard} />
      </div>
    </main>
  );
}
