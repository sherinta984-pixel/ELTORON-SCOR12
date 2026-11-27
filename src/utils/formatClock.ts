import { ClockState } from '../types/scoreboard';

export function formatClockDisplay(clock: ClockState): string {
  if (clock.mode === 'static') {
    return clock.staticLabel.trim() || 'VS';
  }

  const safe = Math.max(0, clock.seconds);
  const totalWholeSeconds = clock.mode === 'countdown' ? Math.ceil(safe) : Math.floor(safe);

  if (clock.twoDigitSeconds && totalWholeSeconds < 100) {
    return String(totalWholeSeconds).padStart(2, '0');
  }

  if (clock.mode === 'countdown' && clock.showTenthsUnder10 && safe < 10 && safe > 0) {
    return safe.toFixed(1);
  }

  const mins = Math.floor(totalWholeSeconds / 60);
  const secs = totalWholeSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function parseClockInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length !== 2) return null;
    const mins = Number(parts[0]);
    const secs = Number(parts[1]);
    if (!Number.isFinite(mins) || !Number.isFinite(secs) || mins < 0 || secs < 0 || secs >= 60) {
      return null;
    }
    return Math.round(mins * 60 + secs);
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num);
}
