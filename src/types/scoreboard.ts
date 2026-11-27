export type TimerMode = 'countdown' | 'countup' | 'static';

export type StageBackground = 'studio' | 'white' | 'chroma-green' | 'chroma-blue' | 'transparent';

export interface TeamState {
  name: string;
  tag: string;
  score: number;
  ticks: number; // 0..4 angled indicator ticks under score box
  ticksAllOn: boolean; // When true, matches static reference (all 4 solid)
  fillColor: string;
  scoreBgColor: string;
  borderColor: string;
  glowColor: string;
  textColor: string;
  logoUrl: string | null;
}

export interface ClockState {
  mode: TimerMode;
  durationSeconds: number; // Base duration for countdown resets
  seconds: number; // Current clock value in seconds (supports tenths)
  running: boolean;
  staticLabel: string; // Shown when mode === 'static' (e.g. 'VS')
  showTenthsUnder10: boolean;
  twoDigitSeconds?: boolean;
}

export interface CenterHubState {
  topCrownText: string; // Top black trapezoid (e.g. 'ROUND 1', '1ST HALF')
  bottomBaseText: string; // Bottom black trapezoid (e.g. 'GRAND FINALS')
  centerSubText: string; // Small optional label above timer inside white hex
}

export interface MatchEvent {
  id: string;
  timestamp: string;
  clockAtEvent: string;
  description: string;
  scoreSnapshot: string;
}

export type RaidingTeam = 'none' | 'left' | 'right';

export interface ScoreboardState {
  left: TeamState;
  right: TeamState;
  raidingTeam: RaidingTeam;
  clock: ClockState;
  center: CenterHubState;
  scoreStepButtons: number[]; // e.g. [1] or [1, 2, 3]
  showTicks: boolean;
  showLogos: boolean;
  showSparkChannels: boolean;
  showTextures: boolean;
  animationsEnabled: boolean;
  hotkeysEnabled: boolean;
}

export interface ColorThemePreset {
  id: string;
  name: string;
  left: Pick<TeamState, 'fillColor' | 'scoreBgColor' | 'borderColor' | 'glowColor' | 'textColor'>;
  right: Pick<TeamState, 'fillColor' | 'scoreBgColor' | 'borderColor' | 'glowColor' | 'textColor'>;
}

export interface MatchPreset {
  id: string;
  name: string;
  subtitle: string;
  apply: (current: ScoreboardState) => ScoreboardState;
}
