export type TeamId = 'A' | 'B';

export type MatchPhase =
  | 'FIRST_HALF'
  | 'HALF_TIME'
  | 'SECOND_HALF'
  | 'FULL_TIME'
  | 'GOLDEN_RAID';

export type RaidActionType =
  | 'TOUCH_1'
  | 'TOUCH_2'
  | 'SUPER_RAID_3'
  | 'SUPER_RAID_4'
  | 'BONUS_1'
  | 'TOUCH_1_BONUS'
  | 'TOUCH_2_BONUS'
  | 'EMPTY_RAID'
  | 'TACKLE'
  | 'RAIDER_SELF_OUT'
  | 'TECH_POINT_RAIDER'
  | 'TECH_POINT_DEFENDER';

export interface PointBreakdown {
  raid: number;
  tackle: number;
  bonus: number;
  allOut: number;
  extra: number;
}

export interface TeamState {
  id: TeamId;
  name: string;
  shortCode: string;
  color: string;
  score: number;
  onMat: number; // 0 to 7 active players
  emptyRaidStreak: number; // 0, 1, or 2 (at 2, current/next raid is Do-or-Die)
  timeoutsLeft: number; // max 2 per half
  reviewsLeft: number; // max 1 per half (or retained)
  allOutsConceded: number;
  allOutsInflicted: number;
  breakdown: PointBreakdown;
}

export interface PlayLogEntry {
  id: string;
  raidNumber: number;
  phase: MatchPhase;
  clockSecondsRemaining: number;
  raidingTeam: TeamId;
  scoringTeam: TeamId | null;
  pointsAwarded: number;
  allOutBonusAwarded: number;
  label: string;
  detail: string;
  isDoOrDie: boolean;
  isSuperTackle: boolean;
  isAllOut: boolean;
  scoreSnapshot: { A: number; B: number };
}

export interface MatchConfig {
  halfDurationSeconds: number;
  raidDurationSeconds: number;
  autoSwitchRaider: boolean;
}

export interface MatchSnapshot {
  phase: MatchPhase;
  matchClockSeconds: number;
  raidClockSeconds: number;
  raidingTeam: TeamId;
  raidCount: number;
  teams: {
    A: TeamState;
    B: TeamState;
  };
  logs: PlayLogEntry[];
}

export interface MatchState extends MatchSnapshot {
  config: MatchConfig;
  isMatchClockRunning: boolean;
  isRaidClockRunning: boolean;
  undoStack: MatchSnapshot[];
}
