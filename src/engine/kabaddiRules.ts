import type {
  MatchConfig,
  MatchPhase,
  MatchSnapshot,
  MatchState,
  PlayLogEntry,
  RaidActionType,
  TeamId,
  TeamState,
} from '../types/kabaddi';

export const MAX_PLAYERS_ON_MAT = 7;
export const SUPER_TACKLE_THRESHOLD = 3;
export const BONUS_DEFENDER_THRESHOLD = 6;
export const ALL_OUT_BONUS_POINTS = 2;
export const DEFAULT_HALF_DURATION_SECONDS = 20 * 60; // 20:00
export const DEFAULT_RAID_DURATION_SECONDS = 30; // 30s
const MAX_UNDO_HISTORY = 50;

export function getOpponentId(teamId: TeamId): TeamId {
  return teamId === 'A' ? 'B' : 'A';
}

export function isSuperTackleActive(defendingTeam: TeamState): boolean {
  return defendingTeam.onMat >= 1 && defendingTeam.onMat <= SUPER_TACKLE_THRESHOLD;
}

export function isBonusActive(defendingTeam: TeamState): boolean {
  return defendingTeam.onMat >= BONUS_DEFENDER_THRESHOLD;
}

export function isDoOrDieRaid(raidingTeam: TeamState): boolean {
  return raidingTeam.emptyRaidStreak >= 2;
}

export function formatMatchClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatRaidClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  return String(clamped).padStart(2, '0');
}

export function getPhaseLabel(phase: MatchPhase): string {
  switch (phase) {
    case 'FIRST_HALF':
      return '1st Half';
    case 'HALF_TIME':
      return 'Half Time';
    case 'SECOND_HALF':
      return '2nd Half';
    case 'FULL_TIME':
      return 'Full Time';
    case 'GOLDEN_RAID':
      return 'Golden Raid';
  }
}

export function createDefaultTeam(
  id: TeamId,
  overrides?: Partial<Pick<TeamState, 'name' | 'shortCode' | 'color'>>
): TeamState {
  const defaults =
    id === 'A'
      ? { name: 'Team A', shortCode: 'A', color: '#E52C40' }
      : { name: 'Team B', shortCode: 'B', color: '#287CDB' };

  return {
    id,
    name: overrides?.name ?? defaults.name,
    shortCode: overrides?.shortCode ?? defaults.shortCode,
    color: overrides?.color ?? defaults.color,
    score: 0,
    onMat: MAX_PLAYERS_ON_MAT,
    emptyRaidStreak: 0,
    timeoutsLeft: 2,
    reviewsLeft: 1,
    allOutsConceded: 0,
    allOutsInflicted: 0,
    breakdown: {
      raid: 0,
      tackle: 0,
      bonus: 0,
      allOut: 0,
      extra: 0,
    },
  };
}

export function createInitialMatch(options?: {
  teamA?: Partial<Pick<TeamState, 'name' | 'shortCode' | 'color'>>;
  teamB?: Partial<Pick<TeamState, 'name' | 'shortCode' | 'color'>>;
  config?: Partial<MatchConfig>;
}): MatchState {
  const config: MatchConfig = {
    halfDurationSeconds:
      options?.config?.halfDurationSeconds ?? DEFAULT_HALF_DURATION_SECONDS,
    raidDurationSeconds:
      options?.config?.raidDurationSeconds ?? DEFAULT_RAID_DURATION_SECONDS,
    autoSwitchRaider: options?.config?.autoSwitchRaider ?? true,
  };

  return {
    phase: 'FIRST_HALF',
    matchClockSeconds: config.halfDurationSeconds,
    raidClockSeconds: config.raidDurationSeconds,
    raidingTeam: 'A',
    raidCount: 0,
    teams: {
      A: createDefaultTeam('A', options?.teamA),
      B: createDefaultTeam('B', options?.teamB),
    },
    logs: [],
    config,
    isMatchClockRunning: false,
    isRaidClockRunning: false,
    undoStack: [],
  };
}

function cloneSnapshot(state: MatchSnapshot): MatchSnapshot {
  return {
    phase: state.phase,
    matchClockSeconds: state.matchClockSeconds,
    raidClockSeconds: state.raidClockSeconds,
    raidingTeam: state.raidingTeam,
    raidCount: state.raidCount,
    teams: {
      A: {
        ...state.teams.A,
        breakdown: { ...state.teams.A.breakdown },
      },
      B: {
        ...state.teams.B,
        breakdown: { ...state.teams.B.breakdown },
      },
    },
    logs: state.logs.map((entry) => ({
      ...entry,
      scoreSnapshot: { ...entry.scoreSnapshot },
    })),
  };
}

function pushUndo(state: MatchState): MatchSnapshot[] {
  const snapshot = cloneSnapshot(state);
  const next = [...state.undoStack, snapshot];
  if (next.length > MAX_UNDO_HISTORY) {
    return next.slice(next.length - MAX_UNDO_HISTORY);
  }
  return next;
}

function makeLogId(raidNumber: number, suffix: string): string {
  return `raid-${raidNumber}-${suffix}-${Date.now().toString(36)}`;
}

export function applyRaidAction(
  state: MatchState,
  action: RaidActionType
): MatchState {
  if (state.phase === 'HALF_TIME' || state.phase === 'FULL_TIME') {
    return state;
  }

  const raidingId = state.raidingTeam;
  const defendingId = getOpponentId(raidingId);

  // Clone teams cleanly
  const nextSnapshot = cloneSnapshot(state);
  const raiderTeam = nextSnapshot.teams[raidingId];
  const defenderTeam = nextSnapshot.teams[defendingId];

  const wasDoOrDie = isDoOrDieRaid(raiderTeam);
  const wasSuperTackle = isSuperTackleActive(defenderTeam);
  const bonusAvailable = isBonusActive(defenderTeam);

  // Prevent bonus-only or touch+bonus if defender < 6 on mat
  if (
    (action === 'BONUS_1' ||
      action === 'TOUCH_1_BONUS' ||
      action === 'TOUCH_2_BONUS') &&
    !bonusAvailable
  ) {
    return state;
  }

  const nextRaidNumber = nextSnapshot.raidCount + 1;
  let scoringTeam: TeamId | null = null;
  let pointsAwarded = 0;
  let allOutBonusAwarded = 0;
  let isAllOut = false;
  let label = '';
  let detail = '';

  const applyRaiderTouch = (requestedTouches: number, includeBonus: boolean) => {
    const actualTouches = Math.min(requestedTouches, defenderTeam.onMat);
    const bonusPts = includeBonus && bonusAvailable ? 1 : 0;

    if (actualTouches === 0 && bonusPts === 0) {
      return false;
    }

    scoringTeam = raidingId;
    pointsAwarded = actualTouches + bonusPts;
    raiderTeam.score += pointsAwarded;
    raiderTeam.breakdown.raid += actualTouches;
    raiderTeam.breakdown.bonus += bonusPts;
    raiderTeam.emptyRaidStreak = 0;

    defenderTeam.onMat = Math.max(0, defenderTeam.onMat - actualTouches);
    raiderTeam.onMat = Math.min(
      MAX_PLAYERS_ON_MAT,
      raiderTeam.onMat + actualTouches
    );

    if (defenderTeam.onMat === 0) {
      isAllOut = true;
      allOutBonusAwarded = ALL_OUT_BONUS_POINTS;
      raiderTeam.score += ALL_OUT_BONUS_POINTS;
      raiderTeam.breakdown.allOut += ALL_OUT_BONUS_POINTS;
      raiderTeam.allOutsInflicted += 1;
      defenderTeam.allOutsConceded += 1;
      defenderTeam.onMat = MAX_PLAYERS_ON_MAT;
      defenderTeam.emptyRaidStreak = 0;
    }

    if (actualTouches >= 3 || (actualTouches >= 2 && bonusPts === 1)) {
      label = `Super Raid (+${pointsAwarded})`;
    } else if (actualTouches > 0 && bonusPts > 0) {
      label = `Touch + Bonus (+${pointsAwarded})`;
    } else if (actualTouches > 0) {
      label = `Raid Touch (+${actualTouches})`;
    } else {
      label = 'Bonus Point (+1)';
    }

    const parts: string[] = [];
    if (actualTouches > 0) {
      parts.push(
        `${actualTouches} defender${actualTouches > 1 ? 's' : ''} out`
      );
    }
    if (bonusPts > 0) {
      parts.push('Bonus line crossed');
    }
    if (isAllOut) {
      parts.push(`ALL OUT (+${ALL_OUT_BONUS_POINTS} Lona)`);
    }
    detail = `${raiderTeam.shortCode} · ${parts.join(' · ')}`;
    return true;
  };

  const applyDefenderOutOnRaider = (
    points: number,
    isTackle: boolean,
    reasonLabel: string
  ) => {
    scoringTeam = defendingId;
    pointsAwarded = points;
    defenderTeam.score += points;
    defenderTeam.breakdown.tackle += points;
    raiderTeam.emptyRaidStreak = 0;

    if (raiderTeam.onMat > 0) {
      raiderTeam.onMat = Math.max(0, raiderTeam.onMat - 1);
    }
    defenderTeam.onMat = Math.min(MAX_PLAYERS_ON_MAT, defenderTeam.onMat + 1);

    if (raiderTeam.onMat === 0) {
      isAllOut = true;
      allOutBonusAwarded = ALL_OUT_BONUS_POINTS;
      defenderTeam.score += ALL_OUT_BONUS_POINTS;
      defenderTeam.breakdown.allOut += ALL_OUT_BONUS_POINTS;
      defenderTeam.allOutsInflicted += 1;
      raiderTeam.allOutsConceded += 1;
      raiderTeam.onMat = MAX_PLAYERS_ON_MAT;
      raiderTeam.emptyRaidStreak = 0;
    }

    label = reasonLabel;
    const parts: string[] = [`${raiderTeam.shortCode} raider out`];
    if (isTackle && wasSuperTackle) {
      parts.push('Super Tackle bonus');
    }
    if (isAllOut) {
      parts.push(`ALL OUT (+${ALL_OUT_BONUS_POINTS} Lona)`);
    }
    detail = `${defenderTeam.shortCode} · ${parts.join(' · ')}`;
  };

  switch (action) {
    case 'TOUCH_1': {
      if (!applyRaiderTouch(1, false)) return state;
      break;
    }
    case 'TOUCH_2': {
      if (!applyRaiderTouch(2, false)) return state;
      break;
    }
    case 'SUPER_RAID_3': {
      if (!applyRaiderTouch(3, false)) return state;
      break;
    }
    case 'SUPER_RAID_4': {
      if (!applyRaiderTouch(4, false)) return state;
      break;
    }
    case 'BONUS_1': {
      if (!applyRaiderTouch(0, true)) return state;
      break;
    }
    case 'TOUCH_1_BONUS': {
      if (!applyRaiderTouch(1, true)) return state;
      break;
    }
    case 'TOUCH_2_BONUS': {
      if (!applyRaiderTouch(2, true)) return state;
      break;
    }
    case 'EMPTY_RAID': {
      if (wasDoOrDie) {
        applyDefenderOutOnRaider(1, false, 'Do-or-Die Failed (+1)');
      } else {
        raiderTeam.emptyRaidStreak += 1;
        label = `Empty Raid (${raiderTeam.emptyRaidStreak}/2)`;
        detail = `${raiderTeam.shortCode} · ${
          raiderTeam.emptyRaidStreak === 2
            ? 'Next raid is Do-or-Die'
            : '1st consecutive empty raid'
        }`;
      }
      break;
    }
    case 'TACKLE': {
      const tacklePts = wasSuperTackle ? 2 : 1;
      applyDefenderOutOnRaider(
        tacklePts,
        true,
        wasSuperTackle ? 'Super Tackle (+2)' : 'Tackle (+1)'
      );
      break;
    }
    case 'RAIDER_SELF_OUT': {
      applyDefenderOutOnRaider(1, false, 'Raider Out of Bounds (+1)');
      break;
    }
    case 'TECH_POINT_RAIDER': {
      scoringTeam = raidingId;
      pointsAwarded = 1;
      raiderTeam.score += 1;
      raiderTeam.breakdown.extra += 1;
      label = 'Technical Point (+1)';
      detail = `${raiderTeam.shortCode} · Official technical point`;
      break;
    }
    case 'TECH_POINT_DEFENDER': {
      scoringTeam = defendingId;
      pointsAwarded = 1;
      defenderTeam.score += 1;
      defenderTeam.breakdown.extra += 1;
      label = 'Technical Point (+1)';
      detail = `${defenderTeam.shortCode} · Official technical point`;
      break;
    }
  }

  const logEntry: PlayLogEntry = {
    id: makeLogId(nextRaidNumber, action),
    raidNumber: nextRaidNumber,
    phase: nextSnapshot.phase,
    clockSecondsRemaining: nextSnapshot.matchClockSeconds,
    raidingTeam: raidingId,
    scoringTeam,
    pointsAwarded,
    allOutBonusAwarded,
    label,
    detail,
    isDoOrDie: wasDoOrDie,
    isSuperTackle: action === 'TACKLE' && wasSuperTackle,
    isAllOut,
    scoreSnapshot: {
      A: nextSnapshot.teams.A.score,
      B: nextSnapshot.teams.B.score,
    },
  };

  const shouldSwitchRaider =
    state.config.autoSwitchRaider &&
    action !== 'TECH_POINT_RAIDER' &&
    action !== 'TECH_POINT_DEFENDER';

  return {
    ...state,
    ...nextSnapshot,
    raidCount: nextRaidNumber,
    raidingTeam: shouldSwitchRaider ? defendingId : raidingId,
    raidClockSeconds:
      action === 'TECH_POINT_RAIDER' || action === 'TECH_POINT_DEFENDER'
        ? state.raidClockSeconds
        : state.config.raidDurationSeconds,
    isRaidClockRunning: false,
    logs: [logEntry, ...nextSnapshot.logs],
    undoStack: pushUndo(state),
  };
}

export function applyManualAdjust(
  state: MatchState,
  teamId: TeamId,
  field: 'score' | 'onMat' | 'emptyRaidStreak',
  delta: number
): MatchState {
  const nextSnapshot = cloneSnapshot(state);
  const team = nextSnapshot.teams[teamId];

  if (field === 'score') {
    const nextScore = Math.max(0, team.score + delta);
    if (nextScore === team.score) return state;
    const actualDelta = nextScore - team.score;
    team.score = nextScore;
    team.breakdown.extra = Math.max(0, team.breakdown.extra + actualDelta);

    const logEntry: PlayLogEntry = {
      id: makeLogId(nextSnapshot.raidCount, `ADJ-${teamId}`),
      raidNumber: nextSnapshot.raidCount,
      phase: nextSnapshot.phase,
      clockSecondsRemaining: nextSnapshot.matchClockSeconds,
      raidingTeam: nextSnapshot.raidingTeam,
      scoringTeam: actualDelta > 0 ? teamId : null,
      pointsAwarded: Math.abs(actualDelta),
      allOutBonusAwarded: 0,
      label:
        actualDelta > 0
          ? `Score Adjust (+${actualDelta})`
          : `Score Adjust (${actualDelta})`,
      detail: `${team.shortCode} · Manual score correction`,
      isDoOrDie: false,
      isSuperTackle: false,
      isAllOut: false,
      scoreSnapshot: {
        A: nextSnapshot.teams.A.score,
        B: nextSnapshot.teams.B.score,
      },
    };
    nextSnapshot.logs = [logEntry, ...nextSnapshot.logs];
  } else if (field === 'onMat') {
    const nextOnMat = Math.min(
      MAX_PLAYERS_ON_MAT,
      Math.max(1, team.onMat + delta)
    );
    if (nextOnMat === team.onMat) return state;
    team.onMat = nextOnMat;
  } else if (field === 'emptyRaidStreak') {
    const nextStreak = Math.min(2, Math.max(0, team.emptyRaidStreak + delta));
    if (nextStreak === team.emptyRaidStreak) return state;
    team.emptyRaidStreak = nextStreak;
  }

  return {
    ...state,
    ...nextSnapshot,
    undoStack: pushUndo(state),
  };
}

export function triggerTimeout(state: MatchState, teamId: TeamId): MatchState {
  const team = state.teams[teamId];
  if (team.timeoutsLeft <= 0) return state;

  const nextSnapshot = cloneSnapshot(state);
  nextSnapshot.teams[teamId].timeoutsLeft -= 1;

  const logEntry: PlayLogEntry = {
    id: makeLogId(nextSnapshot.raidCount, `TO-${teamId}`),
    raidNumber: nextSnapshot.raidCount,
    phase: nextSnapshot.phase,
    clockSecondsRemaining: nextSnapshot.matchClockSeconds,
    raidingTeam: nextSnapshot.raidingTeam,
    scoringTeam: null,
    pointsAwarded: 0,
    allOutBonusAwarded: 0,
    label: 'Team Timeout',
    detail: `${nextSnapshot.teams[teamId].shortCode} · ${nextSnapshot.teams[teamId].timeoutsLeft} remaining this half`,
    isDoOrDie: false,
    isSuperTackle: false,
    isAllOut: false,
    scoreSnapshot: {
      A: nextSnapshot.teams.A.score,
      B: nextSnapshot.teams.B.score,
    },
  };

  return {
    ...state,
    ...nextSnapshot,
    isMatchClockRunning: false,
    isRaidClockRunning: false,
    logs: [logEntry, ...nextSnapshot.logs],
    undoStack: pushUndo(state),
  };
}

export function triggerReview(
  state: MatchState,
  teamId: TeamId,
  retained: boolean
): MatchState {
  const team = state.teams[teamId];
  if (team.reviewsLeft <= 0) return state;

  const nextSnapshot = cloneSnapshot(state);
  if (!retained) {
    nextSnapshot.teams[teamId].reviewsLeft -= 1;
  }

  const logEntry: PlayLogEntry = {
    id: makeLogId(nextSnapshot.raidCount, `REV-${teamId}`),
    raidNumber: nextSnapshot.raidCount,
    phase: nextSnapshot.phase,
    clockSecondsRemaining: nextSnapshot.matchClockSeconds,
    raidingTeam: nextSnapshot.raidingTeam,
    scoringTeam: null,
    pointsAwarded: 0,
    allOutBonusAwarded: 0,
    label: retained ? 'TV Review Successful' : 'TV Review Unsuccessful',
    detail: `${nextSnapshot.teams[teamId].shortCode} · ${
      retained ? 'Review retained' : 'Review lost'
    }`,
    isDoOrDie: false,
    isSuperTackle: false,
    isAllOut: false,
    scoreSnapshot: {
      A: nextSnapshot.teams.A.score,
      B: nextSnapshot.teams.B.score,
    },
  };

  return {
    ...state,
    ...nextSnapshot,
    isMatchClockRunning: false,
    isRaidClockRunning: false,
    logs: [logEntry, ...nextSnapshot.logs],
    undoStack: pushUndo(state),
  };
}

export function switchRaidingTeam(
  state: MatchState,
  targetTeam?: TeamId
): MatchState {
  const nextRaider = targetTeam ?? getOpponentId(state.raidingTeam);
  if (nextRaider === state.raidingTeam) return state;

  return {
    ...state,
    raidingTeam: nextRaider,
    raidClockSeconds: state.config.raidDurationSeconds,
    isRaidClockRunning: false,
  };
}

export function advanceMatchPhase(
  state: MatchState,
  targetPhase?: MatchPhase
): MatchState {
  const nextSnapshot = cloneSnapshot(state);
  let nextPhase: MatchPhase;

  if (targetPhase) {
    nextPhase = targetPhase;
  } else {
    switch (state.phase) {
      case 'FIRST_HALF':
        nextPhase = 'HALF_TIME';
        break;
      case 'HALF_TIME':
        nextPhase = 'SECOND_HALF';
        break;
      case 'SECOND_HALF':
        nextPhase = 'FULL_TIME';
        break;
      case 'FULL_TIME':
        nextPhase =
          state.teams.A.score === state.teams.B.score
            ? 'GOLDEN_RAID'
            : 'FULL_TIME';
        break;
      case 'GOLDEN_RAID':
        nextPhase = 'FULL_TIME';
        break;
    }
  }

  if (nextPhase === state.phase) return state;

  nextSnapshot.phase = nextPhase;

  if (nextPhase === 'SECOND_HALF') {
    nextSnapshot.matchClockSeconds = state.config.halfDurationSeconds;
    nextSnapshot.raidClockSeconds = state.config.raidDurationSeconds;
    nextSnapshot.teams.A.timeoutsLeft = 2;
    nextSnapshot.teams.B.timeoutsLeft = 2;
    nextSnapshot.teams.A.reviewsLeft = 1;
    nextSnapshot.teams.B.reviewsLeft = 1;
    nextSnapshot.raidingTeam = 'B';
  } else if (nextPhase === 'GOLDEN_RAID') {
    nextSnapshot.matchClockSeconds = 0;
    nextSnapshot.raidClockSeconds = state.config.raidDurationSeconds;
    nextSnapshot.teams.A.onMat = MAX_PLAYERS_ON_MAT;
    nextSnapshot.teams.B.onMat = MAX_PLAYERS_ON_MAT;
    nextSnapshot.teams.A.emptyRaidStreak = 0;
    nextSnapshot.teams.B.emptyRaidStreak = 0;
  }

  const logEntry: PlayLogEntry = {
    id: makeLogId(nextSnapshot.raidCount, `PHASE-${nextPhase}`),
    raidNumber: nextSnapshot.raidCount,
    phase: nextPhase,
    clockSecondsRemaining: nextSnapshot.matchClockSeconds,
    raidingTeam: nextSnapshot.raidingTeam,
    scoringTeam: null,
    pointsAwarded: 0,
    allOutBonusAwarded: 0,
    label: getPhaseLabel(nextPhase),
    detail: `Score ${nextSnapshot.teams.A.shortCode} ${nextSnapshot.teams.A.score} - ${nextSnapshot.teams.B.score} ${nextSnapshot.teams.B.shortCode}`,
    isDoOrDie: false,
    isSuperTackle: false,
    isAllOut: false,
    scoreSnapshot: {
      A: nextSnapshot.teams.A.score,
      B: nextSnapshot.teams.B.score,
    },
  };

  return {
    ...state,
    ...nextSnapshot,
    isMatchClockRunning: false,
    isRaidClockRunning: false,
    logs: [logEntry, ...nextSnapshot.logs],
    undoStack: pushUndo(state),
  };
}

export function undoLastAction(state: MatchState): MatchState {
  if (state.undoStack.length === 0) return state;
  const previous = state.undoStack[state.undoStack.length - 1];
  const remainingStack = state.undoStack.slice(0, -1);

  return {
    ...state,
    ...cloneSnapshot(previous),
    isMatchClockRunning: false,
    isRaidClockRunning: false,
    undoStack: remainingStack,
  };
}

export function tickMatchClock(state: MatchState): MatchState {
  if (!state.isMatchClockRunning || state.matchClockSeconds <= 0) {
    return state.isMatchClockRunning
      ? { ...state, isMatchClockRunning: false }
      : state;
  }
  const nextSeconds = state.matchClockSeconds - 1;
  return {
    ...state,
    matchClockSeconds: nextSeconds,
    isMatchClockRunning: nextSeconds > 0,
  };
}

export function tickRaidClock(state: MatchState): MatchState {
  if (!state.isRaidClockRunning || state.raidClockSeconds <= 0) {
    return state.isRaidClockRunning
      ? { ...state, isRaidClockRunning: false }
      : state;
  }
  const nextSeconds = state.raidClockSeconds - 1;
  return {
    ...state,
    raidClockSeconds: nextSeconds,
    isRaidClockRunning: nextSeconds > 0,
  };
}
