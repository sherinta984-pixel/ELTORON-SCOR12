import React, { useRef } from 'react';
import { Flame, Minus, Plus, RotateCcw, Upload, X } from 'lucide-react';
import { TeamState } from '../types/scoreboard';

interface TeamControlCardProps {
  side: 'left' | 'right';
  team: TeamState;
  stepButtons: number[];
  showTicks: boolean;
  showLogos: boolean;
  isRaiding: boolean;
  hotkeyPlus: string;
  hotkeyMinus: string;
  hotkeyRaid: string;
  onChange: (updated: Partial<TeamState>) => void;
  onAdjustScore: (delta: number) => void;
  onResetScore: () => void;
  onToggleRaiding: () => void;
}

export const TeamControlCard: React.FC<TeamControlCardProps> = ({
  side,
  team,
  stepButtons,
  showTicks,
  showLogos,
  isRaiding,
  hotkeyPlus,
  hotkeyMinus,
  hotkeyRaid,
  onChange,
  onAdjustScore,
  onResetScore,
  onToggleRaiding,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange({ logoUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const sideTitle = side === 'left' ? 'Left Wing (Home)' : 'Right Wing (Away)';

  return (
    <section className="bg-[#11141c] border border-white/10 rounded-xl p-5 flex flex-col gap-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/8">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-3 h-3 rounded-sm shrink-0 border border-white/20"
            style={{ backgroundColor: team.borderColor }}
            aria-hidden="true"
          />
          <h2 className="text-sm font-semibold text-slate-100 truncate">{sideTitle}</h2>
        </div>
        <button
          type="button"
          onClick={onResetScore}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          title="Reset team score to zero"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Score
        </button>
      </div>

      {/* Team Name & Tag */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="sm:col-span-2 flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-400">Team Name</span>
          <input
            type="text"
            value={team.name}
            maxLength={30}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Team name"
            className="w-full px-3 py-2 text-sm font-medium text-white bg-[#090b10] border border-white/12 rounded-lg focus:outline-none focus:border-white/35 transition-colors"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-400">Subtitle / Tag</span>
          <input
            type="text"
            value={team.tag}
            maxLength={14}
            onChange={(e) => onChange({ tag: e.target.value })}
            placeholder="Optional"
            className="w-full px-3 py-2 text-sm font-medium text-white bg-[#090b10] border border-white/12 rounded-lg focus:outline-none focus:border-white/35 transition-colors"
          />
        </label>
      </div>

      {/* Score Adjuster */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium">Score</span>
          <span className="font-mono-tabular text-slate-500">
            Keys: {hotkeyPlus} / {hotkeyMinus}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAdjustScore(-1)}
            className="h-11 px-3.5 inline-flex items-center justify-center bg-[#191e2a] hover:bg-[#232a3a] active:scale-[0.98] border border-white/12 rounded-lg text-slate-200 transition-all shrink-0 focus-visible:outline-2 focus-visible:outline-sky-400"
            aria-label={`Decrease ${team.name} score by 1`}
          >
            <Minus className="w-4 h-4" />
          </button>

          <input
            type="number"
            value={team.score}
            onChange={(e) => {
              const parsed = parseInt(e.target.value, 10);
              onChange({ score: Number.isNaN(parsed) ? 0 : Math.max(-99, Math.min(999, parsed)) });
            }}
            aria-label={`${team.name} score`}
            className="h-11 w-full min-w-0 text-center text-2xl font-bold font-mono-tabular text-white bg-[#090b10] border border-white/12 rounded-lg focus:outline-none focus:border-white/35"
          />

          {stepButtons.map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => onAdjustScore(step)}
              className="h-11 px-4 inline-flex items-center justify-center gap-1 font-mono-tabular text-sm font-semibold text-white rounded-lg border border-white/15 transition-all active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-400"
              style={{
                backgroundColor: team.borderColor,
              }}
              aria-label={`Increase ${team.name} score by ${step}`}
            >
              <Plus className="w-3.5 h-3.5" />
              {step}
            </button>
          ))}
        </div>
      </div>

      {/* Raid Display Window Toggle */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium">Raid Indicator Window</span>
          <span className="font-mono-tabular text-slate-500">Key: {hotkeyRaid}</span>
        </div>
        <button
          type="button"
          onClick={onToggleRaiding}
          aria-pressed={isRaiding}
          className={`h-11 px-4 w-full inline-flex items-center justify-center gap-2 text-sm font-semibold rounded-lg border transition-all active:scale-[0.99] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 ${
            isRaiding
              ? 'bg-[#dc2626] hover:bg-[#ef4444] text-white border-red-400/70 shadow-[0_0_24px_rgba(220,38,38,0.4)]'
              : 'bg-[#191e2a] hover:bg-[#232a3a] text-slate-200 border-white/12'
          }`}
        >
          <Flame className="w-4 h-4 shrink-0" />
          <span>{isRaiding ? 'Raiding Active — Stop' : 'Show Raiding'}</span>
        </button>
      </div>

      {/* Bottom 4 Indicator Ticks */}
      {showTicks && (
        <div className="flex flex-col gap-2 pt-3 border-t border-white/8">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400">Indicator Ticks (0–4)</span>
            <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={team.ticksAllOn}
                onChange={(e) => onChange({ ticksAllOn: e.target.checked })}
                className="rounded border-white/20 bg-[#090b10]"
              />
              Lock All 4 Lit
            </label>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {[0, 1, 2, 3, 4].map((count) => {
              const selected = !team.ticksAllOn && team.ticks === count;
              return (
                <button
                  key={count}
                  type="button"
                  disabled={team.ticksAllOn}
                  onClick={() => onChange({ ticks: count, ticksAllOn: false })}
                  className={`py-2 text-xs font-mono-tabular font-semibold rounded-md border transition-colors ${
                    team.ticksAllOn
                      ? 'opacity-40 cursor-not-allowed bg-[#090b10] border-white/8 text-slate-500'
                      : selected
                        ? 'bg-white text-slate-950 border-white'
                        : 'bg-[#090b10] text-slate-300 border-white/10 hover:border-white/25'
                  }`}
                >
                  {count}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Optional Logo Upload */}
      {showLogos && (
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/8">
          <span className="text-xs font-medium text-slate-400">Team Logo</span>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              {team.logoUrl ? 'Replace Logo' : 'Upload Logo'}
            </button>
            {team.logoUrl && (
              <button
                type="button"
                onClick={() => onChange({ logoUrl: null })}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-md transition-colors whitespace-nowrap shrink-0"
                aria-label="Remove team logo"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
