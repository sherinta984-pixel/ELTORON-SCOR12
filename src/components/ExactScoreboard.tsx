import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ScoreboardState } from '../types/scoreboard';
import { formatClockDisplay } from '../utils/formatClock';
import { SvMediaLogo } from './SvMediaLogo';

interface ExactScoreboardProps {
  state: ScoreboardState;
  introTrigger?: number;
  className?: string;
}

const EASE_BROADCAST = [0.16, 1, 0.3, 1] as const;
const RAIDING_IMAGE_URL = '/assets/aistudio/file_00000000ad70821195785606bba8471e_5f5acb72.png';

const LEFT_WING_SPARKS = [
  { cx: 185, cy: 250, r: 1.8, delay: '0s' },
  { cx: 280, cy: 230, r: 1.5, delay: '0.6s' },
  { cx: 385, cy: 258, r: 2.1, delay: '1.2s' },
  { cx: 495, cy: 238, r: 1.6, delay: '0.35s' },
  { cx: 615, cy: 254, r: 1.9, delay: '1.8s' },
];

const RIGHT_WING_SPARKS = LEFT_WING_SPARKS.map((s) => ({
  ...s,
  cx: 2200 - s.cx,
}));

function formatScore(value: number): string {
  if (value >= 0 && value < 10) {
    return `0${value}`;
  }
  return String(value);
}

type PolyVertex = readonly [number, number, number?];

/**
 * Generates a G1 tangent-continuous SVG path with Quadratic Bezier corner fillets
 * so every silhouette, pod, louver, and fang flows with super-smooth edges.
 */
function smoothPolyPath(
  vertices: ReadonlyArray<PolyVertex>,
  defaultRadius = 6,
  closed = true,
): string {
  const n = vertices.length;
  if (n < 2) return '';
  const fmt = (v: number) => Number(v.toFixed(2));
  const corners = vertices.map((curr, i) => {
    const rWanted = curr[2] ?? defaultRadius;
    if (rWanted <= 0 || (!closed && (i === 0 || i === n - 1))) {
      return { sharp: true as const, x: curr[0], y: curr[1] };
    }
    const prev = vertices[(i - 1 + n) % n];
    const next = vertices[(i + 1) % n];
    const dx1 = curr[0] - prev[0];
    const dy1 = curr[1] - prev[1];
    const dx2 = next[0] - curr[0];
    const dy2 = next[1] - curr[1];
    const len1 = Math.hypot(dx1, dy1);
    const len2 = Math.hypot(dx2, dy2);
    if (len1 < 0.01 || len2 < 0.01) {
      return { sharp: true as const, x: curr[0], y: curr[1] };
    }
    const r = Math.min(rWanted, len1 * 0.42, len2 * 0.42);
    return {
      sharp: false as const,
      cx: curr[0],
      cy: curr[1],
      inX: fmt(curr[0] - (dx1 / len1) * r),
      inY: fmt(curr[1] - (dy1 / len1) * r),
      outX: fmt(curr[0] + (dx2 / len2) * r),
      outY: fmt(curr[1] + (dy2 / len2) * r),
    };
  });

  const parts: string[] = [];
  const first = corners[0];
  parts.push(first.sharp ? `M ${first.x} ${first.y}` : `M ${first.outX} ${first.outY}`);

  for (let i = 1; i < n; i++) {
    const c = corners[i];
    if (c.sharp) {
      parts.push(`L ${c.x} ${c.y}`);
    } else {
      parts.push(`L ${c.inX} ${c.inY} Q ${c.cx} ${c.cy} ${c.outX} ${c.outY}`);
    }
  }

  if (closed) {
    if (!first.sharp) {
      parts.push(`L ${first.inX} ${first.inY} Q ${first.cx} ${first.cy} ${first.outX} ${first.outY}`);
    }
    parts.push('Z');
  }

  return parts.join(' ');
}

/**
 * Advanced Aggressive Broadcast Scoreboard (cx = 1100):
 * - Forward-swept wingtip aero fangs & stepped upper intake vent rails
 * - Multi-layered recessed cyber-armor Score Pods with rotating HUD target reticles & radar sweeps
 * - Forged titanium + obsidian recessed 2-digit Timer Core with 10-cell laser countdown gauge
 * - Sculpted low-profile under-chassis diffuser with sweeping laser rails, dual conduits & rotating center hex-reactor
 */
export const ExactScoreboard: React.FC<ExactScoreboardProps> = ({
  state,
  introTrigger = 0,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const prefersReducedMotion = useReducedMotion();
  const animate = state.animationsEnabled && !prefersReducedMotion;

  const {
    left,
    right,
    raidingTeam,
    clock,
    center,
    showTicks,
    showLogos,
    showSparkChannels,
    showTextures,
  } = state;

  const prevLeftRef = useRef<number>(left.score);
  const prevRightRef = useRef<number>(right.score);
  const [leftFlash, setLeftFlash] = useState<{ key: number; delta: number } | null>(null);
  const [rightFlash, setRightFlash] = useState<{ key: number; delta: number } | null>(null);

  useEffect(() => {
    const prev = prevLeftRef.current;
    if (left.score !== prev) {
      const delta = left.score - prev;
      prevLeftRef.current = left.score;
      if (animate) {
        const key = Date.now() + Math.random();
        setLeftFlash({ key, delta });
        const timer = window.setTimeout(() => {
          setLeftFlash((cur) => (cur?.key === key ? null : cur));
        }, 800);
        return () => window.clearTimeout(timer);
      }
    }
  }, [left.score, animate]);

  useEffect(() => {
    const prev = prevRightRef.current;
    if (right.score !== prev) {
      const delta = right.score - prev;
      prevRightRef.current = right.score;
      if (animate) {
        const key = Date.now() + Math.random();
        setRightFlash({ key, delta });
        const timer = window.setTimeout(() => {
          setRightFlash((cur) => (cur?.key === key ? null : cur));
        }, 800);
        return () => window.clearTimeout(timer);
      }
    }
  }, [right.score, animate]);

  const clockText = formatClockDisplay(clock);
  const isUrgent =
    clock.mode === 'countdown' && clock.seconds < 10 && clock.seconds > 0;
  const isLongClock = clockText.length > 5;

  const countdownRatio =
    clock.mode === 'countdown' && clock.durationSeconds > 0
      ? Math.max(0, Math.min(1, clock.seconds / clock.durationSeconds))
      : 0;

  const leftNameFontSize =
    left.name.length > 20 ? 46 : left.name.length > 14 ? 56 : 70;
  const rightNameFontSize =
    right.name.length > 20 ? 46 : right.name.length > 14 ? 56 : 70;

  const leftScoreFontSize = Math.abs(left.score) >= 100 ? 80 : 110;
  const rightScoreFontSize = Math.abs(right.score) >= 100 ? 80 : 110;

  const leftNameX = showLogos ? 448 : 398;
  const rightNameX = showLogos ? 1752 : 1802;

  const isLeftRaiding = raidingTeam === 'left';
  const isRightRaiding = raidingTeam === 'right';

  const leftAccentColor = isLeftRaiding ? '#ff2432' : left.glowColor;
  const rightAccentColor = isRightRaiding ? '#ff2432' : right.glowColor;
  const timerCoreAccent = isUrgent ? '#ff2432' : raidingTeam !== 'none' ? '#ff3b47' : '#38bdf8';

  // ============================================================================
  // AGGRESSIVE AERODYNAMIC CHASSIS GEOMETRY (Smooth Filleted Mirrored cx = 1100)
  // ============================================================================

  const fullChassisOutlinePts: PolyVertex[] = [
    [942, 4, 8],
    [1258, 4, 8],
    [1278, 38, 7],
    [1304, 38, 7],
    [1316, 64, 7],
    [1580, 64, 9],
    [1618, 100, 9],
    [1880, 100, 8],
    [1900, 110, 7],
    [2246, 110, 10],
    [2218, 158, 7],
    [2232, 166, 9],
    [2106, 300, 10],
    [2012, 300, 8],
    [1992, 316, 8],
    [1452, 316, 8],
    [1436, 328, 8],
    [1210, 328, 7],
    [1196, 340, 8],
    [1004, 340, 8],
    [990, 328, 7],
    [764, 328, 8],
    [748, 316, 8],
    [208, 316, 8],
    [188, 300, 8],
    [94, 300, 10],
    [-32, 166, 9],
    [-18, 158, 7],
    [-46, 110, 10],
    [300, 110, 7],
    [320, 100, 8],
    [582, 100, 9],
    [620, 64, 9],
    [884, 64, 7],
    [896, 38, 7],
    [922, 38, 7],
  ];

  const fullChassisOutline = smoothPolyPath(fullChassisOutlinePts, 8);

  const leftChassisHalf = smoothPolyPath(
    [
      [942, 4, 8],
      [922, 38, 7],
      [896, 38, 7],
      [884, 64, 7],
      [620, 64, 9],
      [582, 100, 9],
      [320, 100, 8],
      [300, 110, 7],
      [-46, 110, 10],
      [-18, 158, 7],
      [-32, 166, 9],
      [94, 300, 10],
      [188, 300, 8],
      [208, 316, 8],
      [748, 316, 8],
      [764, 328, 8],
      [990, 328, 7],
      [1004, 340, 8],
      [1100, 340, 0],
      [1100, 4, 0],
    ],
    8,
  );

  const rightChassisHalf = smoothPolyPath(
    [
      [1258, 4, 8],
      [1278, 38, 7],
      [1304, 38, 7],
      [1316, 64, 7],
      [1580, 64, 9],
      [1618, 100, 9],
      [1880, 100, 8],
      [1900, 110, 7],
      [2246, 110, 10],
      [2218, 158, 7],
      [2232, 166, 9],
      [2106, 300, 10],
      [2012, 300, 8],
      [1992, 316, 8],
      [1452, 316, 8],
      [1436, 328, 8],
      [1210, 328, 7],
      [1196, 340, 8],
      [1100, 340, 0],
      [1100, 4, 0],
    ],
    8,
  );

  const leftTopStepEdge = smoothPolyPath(
    [
      [-46, 111],
      [300, 111, 7],
      [320, 101, 8],
      [582, 101, 9],
      [620, 65, 9],
      [884, 65, 7],
      [896, 39, 7],
      [922, 39, 7],
      [942, 5],
    ],
    8,
    false,
  );

  const rightTopStepEdge = smoothPolyPath(
    [
      [2246, 111],
      [1900, 111, 7],
      [1880, 101, 8],
      [1618, 101, 9],
      [1580, 65, 9],
      [1316, 65, 7],
      [1304, 39, 7],
      [1278, 39, 7],
      [1258, 5],
    ],
    8,
    false,
  );

  // Forward-Swept Outer Wingtip Aero Fangs
  const leftUpperFangPath = smoothPolyPath([[-36, 116], [8, 116], [24, 150], [-14, 150]], 5);
  const leftLowerFangPath = smoothPolyPath([[-22, 170], [24, 170], [106, 288], [76, 288]], 6);
  const rightUpperFangPath = smoothPolyPath([[2236, 116], [2192, 116], [2176, 150], [2214, 150]], 5);
  const rightLowerFangPath = smoothPolyPath([[2222, 170], [2176, 170], [2094, 288], [2124, 288]], 6);

  // Stepped Upper Wing Armor Vent Rails
  const leftUpperRailPath = smoothPolyPath([[322, 104], [580, 104], [594, 116], [308, 116]], 4);
  const rightUpperRailPath = smoothPolyPath([[1878, 104], [1620, 104], [1606, 116], [1892, 116]], 4);

  // Sleek Stepped Shoulder Visor Bays (above Score Pods)
  const leftShoulderBayPath = smoothPolyPath([[624, 70], [910, 70], [922, 98], [594, 98]], 5);
  const leftShoulderGlassPath = smoothPolyPath([[627, 74], [907, 74], [917, 94], [605, 94]], 4);
  const rightShoulderBayPath = smoothPolyPath([[1576, 70], [1290, 70], [1278, 98], [1606, 98]], 5);
  const rightShoulderGlassPath = smoothPolyPath([[1573, 74], [1293, 74], [1283, 94], [1595, 94]], 4);

  // Deployable Armored Hexagonal Raid Display Pods
  const leftRaidPodPath = smoothPolyPath([[612, 18], [902, 18], [924, 58], [910, 98], [598, 98], [578, 58]], 7);
  const leftRaidGlassPath = smoothPolyPath([[618, 23], [896, 23], [915, 58], [903, 93], [605, 93], [587, 58]], 5);

  const rightRaidPodPath = smoothPolyPath([[1588, 18], [1298, 18], [1276, 58], [1290, 98], [1602, 98], [1622, 58]], 7);
  const rightRaidGlassPath = smoothPolyPath([[1582, 23], [1304, 23], [1285, 58], [1297, 93], [1595, 93], [1613, 58]], 5);

  // Extended Swept Team Wings
  const leftWingPath = smoothPolyPath([[22, 122, 9], [622, 122, 7], [640, 106, 7], [698, 106, 8], [748, 282, 9], [118, 282, 10]], 8);
  const rightWingPath = smoothPolyPath([[2178, 122, 9], [1578, 122, 7], [1560, 106, 7], [1502, 106, 8], [1452, 282, 9], [2082, 282, 10]], 8);

  // Multi-Layered Armored Score Pods
  const leftScorePath = smoothPolyPath([[716, 104], [956, 104], [940, 154], [982, 282], [764, 282]], 8);
  const leftScoreChamberPath = smoothPolyPath([[728, 113], [945, 113], [932, 154], [970, 272], [774, 272]], 6);
  const rightScorePath = smoothPolyPath([[1484, 104], [1244, 104], [1260, 154], [1218, 282], [1436, 282]], 8);
  const rightScoreChamberPath = smoothPolyPath([[1472, 113], [1255, 113], [1268, 154], [1230, 272], [1426, 272]], 6);

  // Wide Center Crown & Clean White-Silver 2-Digit Timer Shield (timer shield geometry kept exact)
  const centerCrownPath = smoothPolyPath([[950, 12], [1250, 12], [1272, 56], [1246, 102], [954, 102], [928, 56]], 8);
  const centerShieldPath = 'M 982 114 L 1218 114 L 1242 154 L 1206 276 L 994 276 L 958 154 Z';
  const centerShieldInnerPath = 'M 989 122 L 1211 122 L 1232 154 L 1200 268 L 1000 268 L 968 154 Z';

  // Aligned Forward-Raked Under-Chassis Diffusers, Ticks/Conduits & Splitter Reactor
  const leftVentBayPath = smoothPolyPath([[206, 287], [740, 287], [750, 312], [222, 312]], 5);
  const rightVentBayPath = smoothPolyPath([[1994, 287], [1460, 287], [1450, 312], [1978, 312]], 5);

  const leftConduitBayPath = smoothPolyPath([[754, 287], [974, 287], [988, 324], [768, 324]], 5);
  const rightConduitBayPath = smoothPolyPath([[1446, 287], [1226, 287], [1212, 324], [1432, 324]], 5);

  const lowerCenterCorePath = smoothPolyPath([[988, 286], [1212, 286], [1198, 324], [1190, 336], [1010, 336], [1002, 324]], 6);

  const isSvMediaCrown =
    center.topCrownText.trim().toUpperCase() === 'SV MEDIA' ||
    center.topCrownText.trim().toUpperCase() === 'KABADDI';

  return (
    <div className={`w-full select-none ${className}`}>
      <svg
        key={introTrigger}
        viewBox="-72 -38 2344 408"
        className="w-full h-auto block overflow-visible"
        shapeRendering="geometricPrecision"
        textRendering="geometricPrecision"
        colorInterpolation="sRGB"
        role="img"
        aria-label={`${left.name} ${formatScore(left.score)} versus ${right.name} ${formatScore(right.score)}, ${center.topCrownText}, ${clockText}${raidingTeam !== 'none' ? `, ${raidingTeam === 'left' ? left.name : right.name} raiding` : ''}`}
      >
        <defs>
          {/* Dark Forged Gunmetal / Stealth Racing Chassis Gradients */}
          <linearGradient id={`${uid}-chassis-metal`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="8%" stopColor="#334155" />
            <stop offset="28%" stopColor="#1e293b" />
            <stop offset="56%" stopColor="#090d16" />
            <stop offset="86%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          <linearGradient id={`${uid}-armor-blade`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#0b0f19" />
            <stop offset="100%" stopColor="#030509" />
          </linearGradient>

          <linearGradient id={`${uid}-titanium-bevel`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="22%" stopColor="#94a3b8" />
            <stop offset="55%" stopColor="#475569" />
            <stop offset="88%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          {/* Raiding Display Window Backdrops */}
          <radialGradient id={`${uid}-raid-window-bg`} cx="45%" cy="55%" r="65%">
            <stop offset="0%" stopColor="#991b1b" stopOpacity="0.85" />
            <stop offset="48%" stopColor="#450a0a" stopOpacity="0.94" />
            <stop offset="100%" stopColor="#090b10" stopOpacity="1" />
          </radialGradient>

          <linearGradient id={`${uid}-raid-sweep-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff2432" stopOpacity="0" />
            <stop offset="45%" stopColor="#ff2432" stopOpacity="0.42" />
            <stop offset="52%" stopColor="#ffffff" stopOpacity="0.52" />
            <stop offset="60%" stopColor="#ff2432" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#ff2432" stopOpacity="0" />
          </linearGradient>

          {/* Left & Right Wing Gradients */}
          <linearGradient id={`${uid}-left-wing-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={left.fillColor} />
            <stop offset="48%" stopColor={left.fillColor} />
            <stop offset="100%" stopColor={leftAccentColor} stopOpacity="0.48" />
          </linearGradient>

          <linearGradient id={`${uid}-right-wing-grad`} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={right.fillColor} />
            <stop offset="48%" stopColor={right.fillColor} />
            <stop offset="100%" stopColor={rightAccentColor} stopOpacity="0.48" />
          </linearGradient>

          {/* Symmetrical Racing Wave Sweep Gradients */}
          <linearGradient id={`${uid}-left-race-wave`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={leftAccentColor} stopOpacity="0" />
            <stop offset="42%" stopColor={leftAccentColor} stopOpacity="0.38" />
            <stop offset="52%" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="62%" stopColor={leftAccentColor} stopOpacity="0.26" />
            <stop offset="100%" stopColor={leftAccentColor} stopOpacity="0" />
          </linearGradient>

          <linearGradient id={`${uid}-right-race-wave`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={rightAccentColor} stopOpacity="0" />
            <stop offset="38%" stopColor={rightAccentColor} stopOpacity="0.26" />
            <stop offset="48%" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="58%" stopColor={rightAccentColor} stopOpacity="0.38" />
            <stop offset="100%" stopColor={rightAccentColor} stopOpacity="0" />
          </linearGradient>

          {/* Dark Score Pod Gradients & Radar Sweeps */}
          <linearGradient id={`${uid}-score-pod-grad`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#171f2e" />
            <stop offset="45%" stopColor="#080c14" />
            <stop offset="100%" stopColor="#030407" />
          </linearGradient>

          <radialGradient id={`${uid}-left-score-spot`} cx="50%" cy="52%" r="62%">
            <stop offset="0%" stopColor={leftAccentColor} stopOpacity="0.46" />
            <stop offset="65%" stopColor={leftAccentColor} stopOpacity="0.12" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          <radialGradient id={`${uid}-right-score-spot`} cx="50%" cy="52%" r="62%">
            <stop offset="0%" stopColor={rightAccentColor} stopOpacity="0.46" />
            <stop offset="65%" stopColor={rightAccentColor} stopOpacity="0.12" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          <linearGradient id={`${uid}-left-radar-sweep`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={leftAccentColor} stopOpacity="0" />
            <stop offset="50%" stopColor={leftAccentColor} stopOpacity="0.34" />
            <stop offset="75%" stopColor="#ffffff" stopOpacity="0.25" />
            <stop offset="100%" stopColor={leftAccentColor} stopOpacity="0" />
          </linearGradient>

          <linearGradient id={`${uid}-right-radar-sweep`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={rightAccentColor} stopOpacity="0" />
            <stop offset="50%" stopColor={rightAccentColor} stopOpacity="0.34" />
            <stop offset="75%" stopColor="#ffffff" stopOpacity="0.25" />
            <stop offset="100%" stopColor={rightAccentColor} stopOpacity="0" />
          </linearGradient>


          {/* Center Crown & Shield Gradients */}
          <linearGradient id={`${uid}-crown-grad`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#262d3a" />
            <stop offset="28%" stopColor="#090b10" />
            <stop offset="100%" stopColor="#030406" />
          </linearGradient>

          <linearGradient id={`${uid}-center-shield`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="12%" stopColor="#f8fafc" />
            <stop offset="48%" stopColor="#ffffff" />
            <stop offset="88%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          {/* Shimmer & Ambient Light Sweep */}
          <linearGradient id={`${uid}-shimmer-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.54" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <linearGradient id={`${uid}-ambient-beam`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Aggressive Tactical Armor Patterns: Hex Mesh + Carbon Weave + Dot Matrix */}
          <pattern id={`${uid}-hex-armor`} width="28" height="24" patternUnits="userSpaceOnUse">
            <path
              d="M 7 0 L 21 0 L 28 12 L 21 24 L 7 24 L 0 12 Z"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.065"
              strokeWidth="0.9"
            />
            <path
              d="M 14 12 L 28 12"
              stroke="#000000"
              strokeOpacity="0.11"
              strokeWidth="1.2"
            />
          </pattern>

          <pattern id={`${uid}-dot-mesh`} width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.95" fill="#ffffff" fillOpacity="0.05" />
            <circle cx="7" cy="7" r="0.8" fill="#000000" fillOpacity="0.2" />
          </pattern>

          <pattern
            id={`${uid}-carbon-left`}
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(34)"
          >
            <line x1="0" y1="0" x2="0" y2="16" stroke="#ffffff" strokeOpacity="0.03" strokeWidth="2.2" />
            <line x1="8" y1="0" x2="8" y2="16" stroke="#000000" strokeOpacity="0.18" strokeWidth="2.2" />
          </pattern>

          <pattern
            id={`${uid}-carbon-right`}
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-34)"
          >
            <line x1="0" y1="0" x2="0" y2="16" stroke="#ffffff" strokeOpacity="0.03" strokeWidth="2.2" />
            <line x1="8" y1="0" x2="8" y2="16" stroke="#000000" strokeOpacity="0.18" strokeWidth="2.2" />
          </pattern>

          {/* Unclipped Pure-Blur Ambient Neon Filters (never rasterize crisp foreground paths) */}
          <filter
            id={`${uid}-neon-left`}
            filterUnits="userSpaceOnUse"
            x="-140"
            y="-80"
            width="2480"
            height="500"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="4.8" />
          </filter>

          <filter
            id={`${uid}-neon-right`}
            filterUnits="userSpaceOnUse"
            x="-140"
            y="-80"
            width="2480"
            height="500"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="4.8" />
          </filter>

          <filter
            id={`${uid}-chassis-shadow`}
            filterUnits="userSpaceOnUse"
            x="-140"
            y="-80"
            width="2480"
            height="500"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="10.5" />
          </filter>

          {/* Underglow gradients */}
          <radialGradient id={`${uid}-left-underglow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={leftAccentColor} stopOpacity="0.88" />
            <stop offset="55%" stopColor={leftAccentColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={leftAccentColor} stopOpacity="0" />
          </radialGradient>

          <radialGradient id={`${uid}-right-underglow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={rightAccentColor} stopOpacity="0.88" />
            <stop offset="55%" stopColor={rightAccentColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={rightAccentColor} stopOpacity="0" />
          </radialGradient>

          {/* Clip Paths */}
          <clipPath id={`${uid}-chassis-clip`}>
            <path d={fullChassisOutline} />
          </clipPath>
          <clipPath id={`${uid}-left-window-clip`}>
            <path d={leftRaidGlassPath} />
          </clipPath>
          <clipPath id={`${uid}-right-window-clip`}>
            <path d={rightRaidGlassPath} />
          </clipPath>
          <clipPath id={`${uid}-left-wing-clip`}>
            <path d={leftWingPath} />
          </clipPath>
          <clipPath id={`${uid}-right-wing-clip`}>
            <path d={rightWingPath} />
          </clipPath>
          <clipPath id={`${uid}-left-score-clip`}>
            <path d={leftScorePath} />
          </clipPath>
          <clipPath id={`${uid}-right-score-clip`}>
            <path d={rightScorePath} />
          </clipPath>
          <clipPath id={`${uid}-left-score-chamber-clip`}>
            <path d={leftScoreChamberPath} />
          </clipPath>
          <clipPath id={`${uid}-right-score-chamber-clip`}>
            <path d={rightScoreChamberPath} />
          </clipPath>
          <clipPath id={`${uid}-left-shoulder-clip`}>
            <path d={leftShoulderGlassPath} />
          </clipPath>
          <clipPath id={`${uid}-right-shoulder-clip`}>
            <path d={rightShoulderGlassPath} />
          </clipPath>
          <clipPath id={`${uid}-left-vent-clip`}>
            <path d={leftVentBayPath} />
          </clipPath>
          <clipPath id={`${uid}-right-vent-clip`}>
            <path d={rightVentBayPath} />
          </clipPath>
          <clipPath id={`${uid}-left-conduit-clip`}>
            <path d={leftConduitBayPath} />
          </clipPath>
          <clipPath id={`${uid}-right-conduit-clip`}>
            <path d={rightConduitBayPath} />
          </clipPath>
          <clipPath id={`${uid}-center-core-clip`}>
            <path d={lowerCenterCorePath} />
          </clipPath>
          <clipPath id={`${uid}-left-logo-clip`}>
            <circle cx="152" cy="202" r="44" />
          </clipPath>
          <clipPath id={`${uid}-right-logo-clip`}>
            <circle cx="2048" cy="202" r="44" />
          </clipPath>
        </defs>

        {/* Ambient Wing Underglows */}
        <ellipse
          cx="385"
          cy="322"
          rx={leftFlash || isLeftRaiding ? 350 : 290}
          ry={leftFlash || isLeftRaiding ? 26 : 19}
          fill={`url(#${uid}-left-underglow)`}
          className={animate ? 'animate-glow-breathe' : undefined}
        />
        <ellipse
          cx="1815"
          cy="322"
          rx={rightFlash || isRightRaiding ? 350 : 290}
          ry={rightFlash || isRightRaiding ? 26 : 19}
          fill={`url(#${uid}-right-underglow)`}
          className={animate ? 'animate-glow-breathe' : undefined}
        />

        {/* ================= LEFT ARMORED WING + FANGS + SCORE POD + RAID WINDOW ================= */}
        <motion.g
          initial={animate ? { x: 200, opacity: 0 } : false}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.05, ease: EASE_BROADCAST }}
        >
          {/* Dedicated Shadow-Only Layer so Foreground Geometry Renders Pure Vector */}
          <path
            d={leftChassisHalf}
            transform="translate(0, 9)"
            fill="#000000"
            fillOpacity="0.58"
            filter={`url(#${uid}-chassis-shadow)`}
          />

          {/* Left Chassis Base */}
          <path d={leftChassisHalf} fill={`url(#${uid}-chassis-metal)`} />

          {/* Smooth Outer Chassis Step Edge */}
          <path
            d={leftTopStepEdge}
            fill="none"
            stroke="#050609"
            strokeWidth="2.6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* ---- LEFT OUTER WINGTIP AERO FANGS ---- */}
          <g>
            <path
              d={leftUpperFangPath}
              fill={`url(#${uid}-armor-blade)`}
              stroke="#050609"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d={smoothPolyPath([[-24, 123], [2, 123], [11, 142], [-11, 142]], 3)}
              fill={leftAccentColor}
              fillOpacity="0.52"
              filter={`url(#${uid}-neon-left)`}
              className={animate ? 'animate-wingtip-pulse' : undefined}
            />
            <path
              d={smoothPolyPath([[-24, 123], [2, 123], [11, 142], [-11, 142]], 3)}
              fill={leftAccentColor}
              fillOpacity="0.92"
              stroke="#050609"
              strokeWidth="1.2"
              strokeLinejoin="round"
              className={animate ? 'animate-wingtip-pulse' : undefined}
            />
            <path
              d={leftLowerFangPath}
              fill={`url(#${uid}-armor-blade)`}
              stroke="#050609"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <line
              x1="-12"
              y1="176"
              x2="80"
              y2="282"
              stroke={leftAccentColor}
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeOpacity="0.65"
              filter={`url(#${uid}-neon-left)`}
              className={animate ? 'animate-wingtip-pulse' : undefined}
            />
            <line
              x1="-12"
              y1="176"
              x2="80"
              y2="282"
              stroke={leftAccentColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeOpacity="0.95"
              className={animate ? 'animate-wingtip-pulse' : undefined}
            />
          </g>

          {/* ---- LEFT STEPPED UPPER WING INTAKE RAIL ---- */}
          <g>
            <path
              d={leftUpperRailPath}
              fill="#070a11"
              stroke="#050609"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {[0, 1, 2, 3, 4].map((idx) => {
              const vx = 338 + idx * 46;
              return (
                <path
                  key={idx}
                  d={smoothPolyPath([[vx, 107], [vx + 28, 107], [vx + 36, 113], [vx + 8, 113]], 2)}
                  fill={isLeftRaiding ? '#ff2432' : left.borderColor}
                  fillOpacity={0.84}
                  stroke="#050609"
                  strokeWidth="1.1"
                  strokeLinejoin="round"
                  className={animate ? 'animate-louver-pulse' : undefined}
                  style={animate ? { animationDelay: `${idx * 0.12}s` } : undefined}
                />
              );
            })}
          </g>

          {/* ---- LEFT STEPPED SHOULDER VISOR BAY (MODERN ALIGNED CRIMSON ACCENT BLADE) ---- */}
          <g>
            <path
              d={leftShoulderBayPath}
              fill={`url(#${uid}-armor-blade)`}
              stroke="#050609"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <polygon
              points="625,71 908,71 905,74 622,74"
              fill={`url(#${uid}-titanium-bevel)`}
              fillOpacity="0.4"
            />
            <g clipPath={`url(#${uid}-left-shoulder-clip)`}>
              <path d={leftShoulderGlassPath} fill="#05070c" />
              {showTextures && (
                <path d={leftShoulderGlassPath} fill={`url(#${uid}-hex-armor)`} />
              )}
              {showSparkChannels ? (
                <g>
                  {/* 4 Progressive Forward-Raked Crimson Turbo-Fang Cells */}
                  {[0, 1, 2, 3].map((idx) => {
                    const sx = 612 + idx * 28;
                    return (
                      <path
                        key={idx}
                        d={smoothPolyPath([[sx + 10, 77], [sx + 30, 77], [sx + 20, 91], [sx, 91]], 2.5)}
                        fill="#ff2432"
                        fillOpacity={0.58 + idx * 0.13}
                        stroke="#050609"
                        strokeWidth="1.1"
                        strokeLinejoin="round"
                        className={animate ? 'animate-louver-pulse' : undefined}
                        style={animate ? { animationDelay: `${idx * 0.12}s` } : undefined}
                      />
                    );
                  })}
                  {/* Precision Glowing Crimson Hyper-Blade Rail */}
                  <path
                    d={smoothPolyPath([[734, 77], [908, 77], [914, 91], [726, 91]], 3)}
                    fill="#3f080d"
                    stroke="#050609"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="734"
                    y1="84"
                    x2="907"
                    y2="84"
                    stroke="#ff2432"
                    strokeWidth="5.2"
                    strokeOpacity={isLeftRaiding ? 0.72 : 0.6}
                    strokeLinecap="round"
                    filter={`url(#${uid}-neon-right)`}
                  />
                  <line
                    x1="734"
                    y1="84"
                    x2="907"
                    y2="84"
                    stroke="#ff2432"
                    strokeWidth="3.8"
                    strokeOpacity={isLeftRaiding ? 1 : 0.94}
                    strokeLinecap="round"
                  />
                  <line
                    x1="742"
                    y1="82.5"
                    x2="902"
                    y2="82.5"
                    stroke="#ffffff"
                    strokeOpacity="0.6"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  {animate && (
                    <rect
                      x="690"
                      y="74"
                      width="66"
                      height="20"
                      fill={`url(#${uid}-raid-sweep-grad)`}
                      className="animate-conduit-left"
                    />
                  )}
                </g>
              ) : (
                <g opacity="0.5">
                  {[0, 1, 2, 3].map((idx) => {
                    const sx = 612 + idx * 28;
                    return (
                      <polygon
                        key={idx}
                        points={`${sx + 10},77 ${sx + 30},77 ${sx + 20},91 ${sx},91`}
                        fill="#1e293b"
                        stroke="#050609"
                        strokeWidth="1"
                      />
                    );
                  })}
                  <polygon
                    points="734,79 908,79 912,89 728,89"
                    fill="#111827"
                    stroke="#050609"
                    strokeWidth="1"
                  />
                </g>
              )}
            </g>
            <path
              d={leftShoulderGlassPath}
              fill="none"
              stroke="#050609"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </g>

          {/* ---- DEPLOYABLE LEFT ARMORED HEXAGONAL RAID DISPLAY POD ---- */}
          <AnimatePresence>
            {isLeftRaiding && (
              <motion.g
                key="left-raid-pod"
                initial={animate ? { opacity: 0, y: 26, scaleY: 0.42 } : false}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={animate ? { opacity: 0, y: 20, scaleY: 0.45 } : undefined}
                transition={{ duration: 0.28, ease: EASE_BROADCAST }}
                style={{ transformOrigin: '752px 98px' }}
              >
                <path
                  d={leftRaidPodPath}
                  fill={`url(#${uid}-chassis-metal)`}
                  stroke="#050609"
                  strokeWidth="2.8"
                  strokeLinejoin="round"
                />
                <polygon
                  points="664,97 900,97 896,104 670,104"
                  fill="#ff2432"
                  fillOpacity="0.45"
                  filter={`url(#${uid}-neon-right)`}
                />
                <polygon
                  points="664,97 900,97 896,104 670,104"
                  fill="#ff2432"
                  stroke="#050609"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <g clipPath={`url(#${uid}-left-window-clip)`}>
                  <path d={leftRaidGlassPath} fill={`url(#${uid}-raid-window-bg)`} />
                  {showTextures && (
                    <path d={leftRaidGlassPath} fill={`url(#${uid}-dot-mesh)`} />
                  )}
                  {animate && (
                    <rect
                      x="560"
                      y="10"
                      width="140"
                      height="100"
                      fill={`url(#${uid}-raid-sweep-grad)`}
                      className="animate-raid-sweep"
                    />
                  )}
                  <g className={animate ? 'animate-raid-beacon' : undefined}>
                    <image
                      href={RAIDING_IMAGE_URL}
                      x="594"
                      y="8"
                      width="318"
                      height="106"
                      preserveAspectRatio="xMidYMid meet"
                      imageRendering="optimizeQuality"
                    />
                  </g>
                </g>
                <path
                  d={leftRaidGlassPath}
                  fill="none"
                  stroke="#050609"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d={leftRaidPodPath}
                  fill="none"
                  stroke="#ff2432"
                  strokeWidth="4.2"
                  strokeOpacity="0.6"
                  strokeLinejoin="round"
                  filter={`url(#${uid}-neon-right)`}
                />
                <path
                  d={leftRaidPodPath}
                  fill="none"
                  stroke="#ff2432"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                />
                {animate && (
                  <path
                    d={leftRaidPodPath}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                    strokeDasharray="110 760"
                    className="animate-edge-trace-fast"
                  />
                )}
                <path
                  d={leftRaidPodPath}
                  fill="none"
                  stroke="#050609"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </motion.g>
            )}
          </AnimatePresence>

          {/* ---- LOWER LEFT ADVANCED AERO VENTURI DIFFUSER ---- */}
          <g>
            <path
              d={leftVentBayPath}
              fill={`url(#${uid}-armor-blade)`}
              stroke="#050609"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <g clipPath={`url(#${uid}-left-vent-clip)`}>
              {/* Outer Titanium Winglet Bevel */}
              <path
                d={smoothPolyPath([[206, 287], [264, 287], [274, 312], [222, 312]], 3)}
                fill={`url(#${uid}-titanium-bevel)`}
                fillOpacity="0.34"
                stroke="#050609"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
              {/* 6 Aggressive Forward-Raked Plasma Gill Blades */}
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const lx = 282 + idx * 38;
                return (
                  <path
                    key={idx}
                    d={smoothPolyPath([[lx, 291], [lx + 22, 291], [lx + 30, 308], [lx + 8, 308]], 2.5)}
                    fill={leftAccentColor}
                    fillOpacity={leftFlash || isLeftRaiding ? 0.96 : 0.8}
                    stroke="#050609"
                    strokeWidth="1.1"
                    strokeLinejoin="round"
                    className={animate ? 'animate-louver-pulse' : undefined}
                    style={animate ? { animationDelay: `${idx * 0.1}s` } : undefined}
                  />
                );
              })}
              {/* Twin-Step Illuminated Diffuser Rail */}
              <path
                d={smoothPolyPath([[518, 291], [734, 291], [742, 307], [526, 307]], 3)}
                fill="#0b101b"
                stroke="#050609"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <line
                x1="526"
                y1="297"
                x2="730"
                y2="297"
                stroke={leftAccentColor}
                strokeWidth="3.6"
                strokeOpacity="0.6"
                strokeLinecap="round"
                filter={`url(#${uid}-neon-left)`}
              />
              <line
                x1="526"
                y1="297"
                x2="730"
                y2="297"
                stroke={leftAccentColor}
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <line
                x1="532"
                y1="303"
                x2="726"
                y2="303"
                stroke="#ffffff"
                strokeOpacity="0.45"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            </g>
            <path
              d={leftVentBayPath}
              fill="none"
              stroke="#050609"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </g>

          {/* ---- LOWER LEFT ALIGNED TICKS MAGAZINE & CYBER-ARMOR CONDUIT ---- */}
          <g>
            <path
              d={leftConduitBayPath}
              fill={`url(#${uid}-armor-blade)`}
              stroke="#050609"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <g clipPath={`url(#${uid}-left-conduit-clip)`}>
              {/* Machined Top Titanium Trim */}
              <polygon
                points="754,287 974,287 976,291 756,291"
                fill={`url(#${uid}-titanium-bevel)`}
                fillOpacity="0.34"
              />
              {showTicks ? (
                <g>
                  {/* 4 Aligned Forward-Raked Plasma Power-Cell Ticks */}
                  {[0, 1, 2, 3].map((idx) => {
                    const tx = 768 + idx * 51;
                    const isActive = left.ticksAllOn || idx < left.ticks;
                    return (
                      <g key={idx}>
                        {/* Recessed Armor Socket */}
                        <path
                          d={smoothPolyPath([[tx - 2, 292], [tx + 42, 292], [tx + 52, 320], [tx + 8, 320]], 3)}
                          fill="#05070c"
                          stroke="#050609"
                          strokeWidth="1.2"
                          strokeLinejoin="round"
                        />
                        {/* Active Blade Neon Glow Underlay */}
                        {isActive && (
                          <path
                            d={smoothPolyPath([[tx + 1, 294], [tx + 39, 294], [tx + 48, 317], [tx + 10, 317]], 2.5)}
                            fill={leftAccentColor}
                            fillOpacity="0.6"
                            filter={`url(#${uid}-neon-left)`}
                          />
                        )}
                        {/* Active / Standby Magazine Blade */}
                        <path
                          d={smoothPolyPath([[tx + 1, 294], [tx + 39, 294], [tx + 48, 317], [tx + 10, 317]], 2.5)}
                          fill={isActive ? leftAccentColor : '#121826'}
                          fillOpacity={isActive ? 0.94 : 0.9}
                          stroke="#050609"
                          strokeWidth="1.2"
                          strokeLinejoin="round"
                          className={isActive && animate ? 'animate-louver-pulse' : undefined}
                          style={isActive && animate ? { animationDelay: `${idx * 0.14}s` } : undefined}
                        />
                        {isActive ? (
                          <>
                            {/* Specular White-Hot Upper Filament & Diagonal Core Cut */}
                            <line
                              x1={tx + 4}
                              y1="297"
                              x2={tx + 37}
                              y2="297"
                              stroke="#ffffff"
                              strokeOpacity="0.85"
                              strokeWidth="2"
                            />
                            <polygon
                              points={`${tx + 18},294 ${tx + 29},294 ${tx + 38},317 ${tx + 27},317`}
                              fill="#ffffff"
                              fillOpacity="0.24"
                            />
                          </>
                        ) : (
                          <>
                            {/* Standby Dim Diagonal Vent & Micro-LED Slit */}
                            <line
                              x1={tx + 10}
                              y1="313"
                              x2={tx + 42}
                              y2="313"
                              stroke={leftAccentColor}
                              strokeOpacity="0.28"
                              strokeWidth="1.6"
                            />
                            <polygon
                              points={`${tx + 18},297 ${tx + 25},297 ${tx + 32},311 ${tx + 25},311`}
                              fill="#1e293b"
                              fillOpacity="0.65"
                            />
                          </>
                        )}
                      </g>
                    );
                  })}
                  {/* Bottom Plasma Rail Connecting Active Magazine */}
                  <line
                    x1="774"
                    y1="321"
                    x2="982"
                    y2="321"
                    stroke={leftAccentColor}
                    strokeOpacity={left.ticks > 0 || left.ticksAllOn ? 0.72 : 0.25}
                    strokeWidth="2"
                  />
                </g>
              ) : (
                <g>
                  {/* Upper 6-Cell Angled Telemetry Matrix */}
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const cx = 766 + idx * 33;
                    return (
                      <polygon
                        key={idx}
                        points={`${cx},293 ${cx + 22},293 ${cx + 27},304 ${cx + 5},304`}
                        fill={leftAccentColor}
                        fillOpacity={0.38 + (idx % 2) * 0.35}
                        stroke="#050609"
                        strokeWidth="0.9"
                        className={animate ? 'animate-louver-pulse' : undefined}
                        style={animate ? { animationDelay: `${idx * 0.13}s` } : undefined}
                      />
                    );
                  })}
                  {/* Lower Recessed High-Velocity Laser Filament */}
                  <polygon
                    points="768,308 978,308 984,321 774,321"
                    fill="#0b111e"
                    stroke="#050609"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="776"
                    y1="314.5"
                    x2="976"
                    y2="314.5"
                    stroke={leftAccentColor}
                    strokeWidth="3.2"
                    strokeOpacity="0.55"
                    filter={`url(#${uid}-neon-left)`}
                  />
                  <line
                    x1="776"
                    y1="314.5"
                    x2="976"
                    y2="314.5"
                    stroke={leftAccentColor}
                    strokeWidth="3"
                    strokeOpacity="0.95"
                    strokeLinecap="round"
                  />
                </g>
              )}
            </g>
            <path
              d={leftConduitBayPath}
              fill="none"
              stroke="#050609"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          </g>

          {/* Left Wing Interior */}
          <g clipPath={`url(#${uid}-left-wing-clip)`}>
            <path d={leftWingPath} fill={left.fillColor} />
            <path d={leftWingPath} fill={`url(#${uid}-left-wing-grad)`} />
            {showTextures && (
              <>
                <path d={leftWingPath} fill={`url(#${uid}-hex-armor)`} />
                <path d={leftWingPath} fill={`url(#${uid}-carbon-left)`} />
              </>
            )}

            {/* Recessed Stealth Armor Plate Cutout inside Left Wing */}
            <polygon
              points="160,136 626,136 668,266 204,266"
              fill="#05070c"
              fillOpacity="0.28"
              stroke={leftAccentColor}
              strokeOpacity="0.22"
              strokeWidth="1.4"
            />

            {/* Aggressive Racing Triple Speed-Canard Shards at Outer Wingtip */}
            {showTextures && (
              <g>
                <path
                  d="M 28 122 L 52 122 L 154 282 L 130 282 Z"
                  fill={leftAccentColor}
                  fillOpacity="0.4"
                />
                <path
                  d="M 62 122 L 78 122 L 180 282 L 164 282 Z"
                  fill={leftAccentColor}
                  fillOpacity="0.24"
                />
                <path
                  d="M 88 122 L 98 122 L 200 282 L 190 282 Z"
                  fill="#050609"
                  fillOpacity="0.55"
                />
                <polygon
                  points="575,106 594,106 644,282 625,282"
                  fill="#050609"
                  fillOpacity="0.34"
                />
                <polygon
                  points="604,106 614,106 664,282 654,282"
                  fill={leftAccentColor}
                  fillOpacity="0.24"
                />
              </g>
            )}

            {/* Tactical HUD Telemetry Tick Scale along Top & Bottom Wing Rails */}
            {showTextures && (
              <g opacity="0.55">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
                  const tx = 185 + i * 44;
                  return (
                    <g key={i}>
                      <line
                        x1={tx}
                        y1="124"
                        x2={tx + 4}
                        y2="132"
                        stroke={leftAccentColor}
                        strokeWidth={i % 3 === 0 ? '2' : '1.2'}
                      />
                      <line
                        x1={tx + 18}
                        y1="272"
                        x2={tx + 22}
                        y2="280"
                        stroke={leftAccentColor}
                        strokeWidth={i % 3 === 0 ? '2' : '1.2'}
                      />
                    </g>
                  );
                })}
                <polyline
                  points="182,158 172,144 196,144"
                  fill="none"
                  stroke={leftAccentColor}
                  strokeWidth="2"
                />
                <polyline
                  points="634,244 644,258 620,258"
                  fill="none"
                  stroke={leftAccentColor}
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Dual Symmetrical Kinetic Racing Chevron Streams */}
            {animate && (
              <>
                <g className={clock.running || isLeftRaiding ? 'animate-race-wave-left-fast' : 'animate-race-wave-left'}>
                  <polygon
                    points="110,98 275,98 370,295 205,295"
                    fill={`url(#${uid}-left-race-wave)`}
                  />
                  <polygon
                    points="268,118 294,118 242,202 294,286 268,286 216,202"
                    fill={leftAccentColor}
                    fillOpacity="0.28"
                  />
                  <polygon
                    points="312,118 326,118 274,202 326,286 312,286 260,202"
                    fill="#ffffff"
                    fillOpacity="0.16"
                  />
                </g>
                <g className="animate-race-wave-left-alt">
                  <polygon
                    points="190,118 214,118 162,202 214,286 190,286 138,202"
                    fill={leftAccentColor}
                    fillOpacity="0.2"
                  />
                </g>
              </>
            )}

            {/* Rising Energy Sparks */}
            {animate &&
              LEFT_WING_SPARKS.map((sp, i) => (
                <circle
                  key={i}
                  cx={sp.cx}
                  cy={sp.cy}
                  r={sp.r}
                  fill={i % 2 === 0 ? '#e0f2fe' : leftAccentColor}
                  className="animate-spark-left"
                  style={{ animationDelay: sp.delay }}
                />
              ))}

            {/* Score Trigger Shimmer */}
            {leftFlash && (
              <rect
                key={leftFlash.key}
                x="0"
                y="80"
                width="240"
                height="240"
                fill={`url(#${uid}-shimmer-grad)`}
                className="animate-wing-shimmer-left"
              />
            )}
          </g>

          {/* Left Wing Razor Neon Frame + Deep Black Outer Edge */}
          <path
            d={leftWingPath}
            fill="none"
            stroke={isLeftRaiding ? '#ff2432' : left.borderColor}
            strokeWidth={leftFlash || isLeftRaiding ? '6.5' : '4.8'}
            strokeLinejoin="round"
            filter={`url(#${uid}-neon-left)`}
          />
          <path
            d={leftWingPath}
            fill="none"
            stroke={isLeftRaiding ? '#ff2432' : left.borderColor}
            strokeWidth={leftFlash || isLeftRaiding ? '5.2' : '4'}
            strokeLinejoin="round"
          />
          <path
            d={leftWingPath}
            fill="none"
            stroke="#050609"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />

          {/* Continuous Traveling Neon Edge Trace */}
          {animate && (
            <path
              d={leftWingPath}
              fill="none"
              stroke={leftAccentColor}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeDasharray="175 1540"
              className={clock.running || isLeftRaiding ? 'animate-edge-trace-fast' : 'animate-edge-trace'}
            />
          )}

          {/* Interlocking Wing-to-Score Blade Seam */}
          <polygon
            points="700,105 712,105 760,282 748,282"
            fill="#050609"
          />
          <line
            x1="706"
            y1="112"
            x2="754"
            y2="275"
            stroke={leftAccentColor}
            strokeWidth="2.8"
            strokeOpacity="0.55"
            filter={`url(#${uid}-neon-left)`}
          />
          <line
            x1="706"
            y1="112"
            x2="754"
            y2="275"
            stroke={leftAccentColor}
            strokeWidth="2.2"
            strokeOpacity="0.92"
            strokeLinecap="round"
          />

          {/* ---- LEFT CYBER-ARMOR SCORE POD (00) ---- */}
          <g clipPath={`url(#${uid}-left-score-clip)`}>
            {/* Forged Metallic Outer Frame Backing */}
            <path d={leftScorePath} fill={`url(#${uid}-chassis-metal)`} />

            {/* Recessed Inner Chamber */}
            <g clipPath={`url(#${uid}-left-score-chamber-clip)`}>
              <path d={leftScoreChamberPath} fill={left.scoreBgColor} />
              <path d={leftScoreChamberPath} fill={`url(#${uid}-score-pod-grad)`} />
              <path
                d={leftScoreChamberPath}
                fill={`url(#${uid}-left-score-spot)`}
                opacity={leftFlash || isLeftRaiding ? 1 : 0.84}
              />
              {showTextures && (
                <>
                  <path d={leftScoreChamberPath} fill={`url(#${uid}-hex-armor)`} />
                  <path d={leftScoreChamberPath} fill={`url(#${uid}-dot-mesh)`} />
                </>
              )}

              {/* Rotating Segmented Tactical Reticle Rings behind 00 */}
              <g opacity={leftFlash || isLeftRaiding ? 0.52 : 0.3}>
                <circle
                  cx="848"
                  cy="196"
                  r="64"
                  fill="none"
                  stroke={leftAccentColor}
                  strokeWidth="1.5"
                  strokeDasharray="18 10 6 10"
                  className={animate ? 'animate-reticle-spin' : undefined}
                />
                <circle
                  cx="848"
                  cy="196"
                  r="48"
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity="0.45"
                  strokeWidth="1.2"
                  strokeDasharray="24 22"
                  className={animate ? 'animate-reticle-spin-reverse' : undefined}
                />
              </g>

              {/* Vertical Radar Scanline Sweep inside Score Chamber */}
              {animate && (
                <rect
                  x="720"
                  y="112"
                  width="260"
                  height="52"
                  fill={`url(#${uid}-left-radar-sweep)`}
                  className="animate-score-sweep"
                />
              )}

              {/* Aggressive Diagonal Corner Armor Gussets & Gill Slits */}
              <polygon points="728,113 778,113 736,154" fill="#050609" fillOpacity="0.82" />
              <polygon points="970,272 920,272 962,232" fill="#050609" fillOpacity="0.82" />
              <line x1="734" y1="146" x2="770" y2="115" stroke={leftAccentColor} strokeWidth="2.2" />
              <line x1="926" y1="269" x2="960" y2="238" stroke={leftAccentColor} strokeWidth="2.2" />

              {/* Side Vertical Power Equalizer Bars */}
              {[0, 1, 2, 3].map((i) => (
                <rect
                  key={i}
                  x={754 + i * 5}
                  y={178 - i * 3}
                  width="3"
                  height={20 + i * 5}
                  fill={leftAccentColor}
                  fillOpacity="0.68"
                  className={animate ? 'animate-pod-eq' : undefined}
                  style={animate ? { animationDelay: `${i * 0.16}s` } : undefined}
                />
              ))}

              {/* Crimson Raid Lock-On Beacon Bar inside top of Left Score Pod */}
              {isLeftRaiding && (
                <g>
                  <polygon
                    points="728,113 945,113 940,120 732,120"
                    fill="#ff2432"
                    fillOpacity="0.55"
                    filter={`url(#${uid}-neon-right)`}
                  />
                  <polygon
                    points="728,113 945,113 940,120 732,120"
                    fill="#ff2432"
                    strokeLinejoin="round"
                  />
                  <polygon
                    points="832,116 860,116 846,129"
                    fill="#ff2432"
                    stroke="#050609"
                    strokeWidth="1"
                    className={animate ? 'animate-chevron-pulse' : undefined}
                  />
                </g>
              )}

              {leftFlash && (
                <rect
                  key={`pod-${leftFlash.key}`}
                  x="700"
                  y="90"
                  width="300"
                  height="210"
                  fill={leftAccentColor}
                  opacity="0.26"
                />
              )}

              <motion.g
                key={`left-${left.score}`}
                initial={animate ? { y: -26, opacity: 0, scale: 1.15 } : false}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.22, ease: EASE_BROADCAST }}
                style={{ transformOrigin: '848px 196px' }}
              >
                <text
                  x="848"
                  y="196"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={left.textColor}
                  fontFamily="Barlow Condensed, sans-serif"
                  fontWeight="800"
                  fontSize={leftScoreFontSize}
                  letterSpacing="2"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatScore(left.score)}
                </text>
              </motion.g>
            </g>

            {/* Inner Recessed Bevel Neon Rim */}
            <path
              d={leftScoreChamberPath}
              fill="none"
              stroke={leftAccentColor}
              strokeOpacity={leftFlash || isLeftRaiding ? 0.95 : 0.45}
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {/* Glowing Laser Seam facing Center Timer */}
            <polyline
              points="945,113 932,154 970,272"
              fill="none"
              stroke={leftAccentColor}
              strokeWidth="3.2"
              strokeOpacity="0.55"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#${uid}-neon-left)`}
            />
            <polyline
              points="945,113 932,154 970,272"
              fill="none"
              stroke={leftAccentColor}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* Score Pod Black Edge Frame */}
          <path
            d={leftScorePath}
            fill="none"
            stroke={leftFlash ? left.borderColor : isLeftRaiding ? '#ff2432' : '#050609'}
            strokeWidth={leftFlash || isLeftRaiding ? '3' : '2.8'}
            strokeLinejoin="round"
          />

          {/* Optional Left Team Logo */}
          {showLogos && (
            <g>
              <circle
                cx="152"
                cy="202"
                r="46"
                fill="rgba(0,0,0,0.48)"
                stroke="#050609"
                strokeWidth="3"
              />
              {left.logoUrl ? (
                <image
                  href={left.logoUrl}
                  x="108"
                  y="158"
                  width="88"
                  height="88"
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#${uid}-left-logo-clip)`}
                  imageRendering="optimizeQuality"
                />
              ) : (
                <text
                  x="152"
                  y="204"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={left.textColor}
                  fontFamily="Barlow Condensed, sans-serif"
                  fontWeight="800"
                  fontSize="38"
                >
                  {(left.name.trim().slice(0, 2) || 'TA').toUpperCase()}
                </text>
              )}
            </g>
          )}

          {/* Left Team Name & Optional Tag */}
          {left.tag.trim() ? (
            <g>
              <text
                x={leftNameX}
                y="182"
                textAnchor="middle"
                dominantBaseline="central"
                fill={left.textColor}
                fontFamily="Barlow Condensed, sans-serif"
                fontWeight="800"
                fontStyle="italic"
                fontSize={leftNameFontSize}
                letterSpacing="2"
              >
                {left.name.toUpperCase()}
              </text>
              <text
                x={leftNameX}
                y="238"
                textAnchor="middle"
                dominantBaseline="central"
                fill={left.textColor}
                fillOpacity="0.74"
                fontFamily="Plus Jakarta Sans, sans-serif"
                fontWeight="700"
                fontSize="22"
                letterSpacing="4"
              >
                {left.tag.toUpperCase()}
              </text>
            </g>
          ) : (
            <text
              x={leftNameX}
              y="204"
              textAnchor="middle"
              dominantBaseline="central"
              fill={left.textColor}
              fontFamily="Barlow Condensed, sans-serif"
              fontWeight="800"
              fontStyle="italic"
              fontSize={leftNameFontSize}
              letterSpacing="2.5"
            >
              {left.name.toUpperCase()}
            </text>
          )}

          {/* Floating Score Delta Callout */}
          {leftFlash && (
            <motion.text
              key={`left-delta-${leftFlash.key}`}
              x="848"
              y="112"
              textAnchor="middle"
              fill="#ffffff"
              stroke="#050609"
              strokeWidth="5"
              paintOrder="stroke"
              fontFamily="Barlow Condensed, sans-serif"
              fontWeight="800"
              fontSize="38"
              initial={{ y: 12, opacity: 0, scale: 0.85 }}
              animate={{ y: -26, opacity: [0, 1, 1, 0], scale: 1.1 }}
              transition={{ duration: 0.78, ease: EASE_BROADCAST }}
            >
              {leftFlash.delta > 0 ? `+${leftFlash.delta}` : leftFlash.delta}
            </motion.text>
          )}
        </motion.g>

        {/* ================= RIGHT ARMORED WING + FANGS + SCORE POD + RAID WINDOW ================= */}
        <motion.g
          initial={animate ? { x: -200, opacity: 0 } : false}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.05, ease: EASE_BROADCAST }}
        >
          {/* Dedicated Shadow-Only Layer so Foreground Geometry Renders Pure Vector */}
          <path
            d={rightChassisHalf}
            transform="translate(0, 9)"
            fill="#000000"
            fillOpacity="0.58"
            filter={`url(#${uid}-chassis-shadow)`}
          />

          {/* Right Chassis Base */}
          <path d={rightChassisHalf} fill={`url(#${uid}-chassis-metal)`} />

          {/* Smooth Outer Chassis Step Edge */}
          <path
            d={rightTopStepEdge}
            fill="none"
            stroke="#050609"
            strokeWidth="2.6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* ---- RIGHT OUTER WINGTIP AERO FANGS ---- */}
          <g>
            <path
              d={rightUpperFangPath}
              fill={`url(#${uid}-armor-blade)`}
              stroke="#050609"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d={smoothPolyPath([[2224, 123], [2198, 123], [2189, 142], [2211, 142]], 3)}
              fill={rightAccentColor}
              fillOpacity="0.52"
              filter={`url(#${uid}-neon-right)`}
              className={animate ? 'animate-wingtip-pulse' : undefined}
            />
            <path
              d={smoothPolyPath([[2224, 123], [2198, 123], [2189, 142], [2211, 142]], 3)}
              fill={rightAccentColor}
              fillOpacity="0.92"
              stroke="#050609"
              strokeWidth="1.2"
              strokeLinejoin="round"
              className={animate ? 'animate-wingtip-pulse' : undefined}
            />
            <path
              d={rightLowerFangPath}
              fill={`url(#${uid}-armor-blade)`}
              stroke="#050609"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <line
              x1="2212"
              y1="176"
              x2="2120"
              y2="282"
              stroke={rightAccentColor}
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeOpacity="0.65"
              filter={`url(#${uid}-neon-right)`}
              className={animate ? 'animate-wingtip-pulse' : undefined}
            />
            <line
              x1="2212"
              y1="176"
              x2="2120"
              y2="282"
              stroke={rightAccentColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeOpacity="0.95"
              className={animate ? 'animate-wingtip-pulse' : undefined}
            />
          </g>

          {/* ---- RIGHT STEPPED UPPER WING INTAKE RAIL ---- */}
          <g>
            <path
              d={rightUpperRailPath}
              fill="#070a11"
              stroke="#050609"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {[0, 1, 2, 3, 4].map((idx) => {
              const vx = 1862 - idx * 46;
              return (
                <path
                  key={idx}
                  d={smoothPolyPath([[vx, 107], [vx - 28, 107], [vx - 36, 113], [vx - 8, 113]], 2)}
                  fill={isRightRaiding ? '#ff2432' : right.borderColor}
                  fillOpacity={0.84}
                  stroke="#050609"
                  strokeWidth="1.1"
                  strokeLinejoin="round"
                  className={animate ? 'animate-louver-pulse' : undefined}
                  style={animate ? { animationDelay: `${idx * 0.12}s` } : undefined}
                />
              );
            })}
          </g>

          {/* ---- RIGHT STEPPED SHOULDER VISOR BAY (MODERN ALIGNED CRIMSON ACCENT BLADE) ---- */}
          <g>
            <path
              d={rightShoulderBayPath}
              fill={`url(#${uid}-armor-blade)`}
              stroke="#050609"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <polygon
              points="1575,71 1292,71 1295,74 1578,74"
              fill={`url(#${uid}-titanium-bevel)`}
              fillOpacity="0.4"
            />
            <g clipPath={`url(#${uid}-right-shoulder-clip)`}>
              <path d={rightShoulderGlassPath} fill="#05070c" />
              {showTextures && (
                <path d={rightShoulderGlassPath} fill={`url(#${uid}-hex-armor)`} />
              )}
              {showSparkChannels ? (
                <g>
                  {/* 4 Progressive Forward-Raked Crimson Turbo-Fang Cells */}
                  {[0, 1, 2, 3].map((idx) => {
                    const sx = 1588 - idx * 28;
                    return (
                      <path
                        key={idx}
                        d={smoothPolyPath([[sx - 10, 77], [sx - 30, 77], [sx - 20, 91], [sx, 91]], 2.5)}
                        fill="#ff2432"
                        fillOpacity={0.58 + idx * 0.13}
                        stroke="#050609"
                        strokeWidth="1.1"
                        strokeLinejoin="round"
                        className={animate ? 'animate-louver-pulse' : undefined}
                        style={animate ? { animationDelay: `${idx * 0.12}s` } : undefined}
                      />
                    );
                  })}
                  {/* Precision Glowing Crimson Hyper-Blade Rail */}
                  <path
                    d={smoothPolyPath([[1466, 77], [1292, 77], [1286, 91], [1474, 91]], 3)}
                    fill="#3f080d"
                    stroke="#050609"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="1466"
                    y1="84"
                    x2="1293"
                    y2="84"
                    stroke="#ff2432"
                    strokeWidth="5.2"
                    strokeOpacity={isRightRaiding ? 0.72 : 0.6}
                    strokeLinecap="round"
                    filter={`url(#${uid}-neon-right)`}
                  />
                  <line
                    x1="1466"
                    y1="84"
                    x2="1293"
                    y2="84"
                    stroke="#ff2432"
                    strokeWidth="3.8"
                    strokeOpacity={isRightRaiding ? 1 : 0.94}
                    strokeLinecap="round"
                  />
                  <line
                    x1="1458"
                    y1="82.5"
                    x2="1298"
                    y2="82.5"
                    stroke="#ffffff"
                    strokeOpacity="0.6"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  {animate && (
                    <rect
                      x="1444"
                      y="74"
                      width="66"
                      height="20"
                      fill={`url(#${uid}-raid-sweep-grad)`}
                      className="animate-conduit-right"
                    />
                  )}
                </g>
              ) : (
                <g opacity="0.5">
                  {[0, 1, 2, 3].map((idx) => {
                    const sx = 1588 - idx * 28;
                    return (
                      <polygon
                        key={idx}
                        points={`${sx - 10},77 ${sx - 30},77 ${sx - 20},91 ${sx},91`}
                        fill="#1e293b"
                        stroke="#050609"
                        strokeWidth="1"
                      />
                    );
                  })}
                  <polygon
                    points="1466,79 1292,79 1288,89 1472,89"
                    fill="#111827"
                    stroke="#050609"
                    strokeWidth="1"
                  />
                </g>
              )}
            </g>
            <path
              d={rightShoulderGlassPath}
              fill="none"
              stroke="#050609"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </g>

          {/* ---- DEPLOYABLE RIGHT ARMORED HEXAGONAL RAID DISPLAY POD ---- */}
          <AnimatePresence>
            {isRightRaiding && (
              <motion.g
                key="right-raid-pod"
                initial={animate ? { opacity: 0, y: 26, scaleY: 0.42 } : false}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={animate ? { opacity: 0, y: 20, scaleY: 0.45 } : undefined}
                transition={{ duration: 0.28, ease: EASE_BROADCAST }}
                style={{ transformOrigin: '1448px 98px' }}
              >
                <path
                  d={rightRaidPodPath}
                  fill={`url(#${uid}-chassis-metal)`}
                  stroke="#050609"
                  strokeWidth="2.8"
                  strokeLinejoin="round"
                />
                <polygon
                  points="1536,97 1300,97 1304,104 1530,104"
                  fill="#ff2432"
                  fillOpacity="0.45"
                  filter={`url(#${uid}-neon-right)`}
                />
                <polygon
                  points="1536,97 1300,97 1304,104 1530,104"
                  fill="#ff2432"
                  stroke="#050609"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <g clipPath={`url(#${uid}-right-window-clip)`}>
                  <path d={rightRaidGlassPath} fill={`url(#${uid}-raid-window-bg)`} />
                  {showTextures && (
                    <path d={rightRaidGlassPath} fill={`url(#${uid}-dot-mesh)`} />
                  )}
                  {animate && (
                    <rect
                      x="1220"
                      y="10"
                      width="140"
                      height="100"
                      fill={`url(#${uid}-raid-sweep-grad)`}
                      className="animate-raid-sweep"
                    />
                  )}
                  <g className={animate ? 'animate-raid-beacon' : undefined}>
                    <image
                      href={RAIDING_IMAGE_URL}
                      x="1288"
                      y="8"
                      width="318"
                      height="106"
                      preserveAspectRatio="xMidYMid meet"
                      imageRendering="optimizeQuality"
                    />
                  </g>
                </g>
                <path
                  d={rightRaidGlassPath}
                  fill="none"
                  stroke="#050609"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d={rightRaidPodPath}
                  fill="none"
                  stroke="#ff2432"
                  strokeWidth="4.2"
                  strokeOpacity="0.6"
                  strokeLinejoin="round"
                  filter={`url(#${uid}-neon-right)`}
                />
                <path
                  d={rightRaidPodPath}
                  fill="none"
                  stroke="#ff2432"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                />
                {animate && (
                  <path
                    d={rightRaidPodPath}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                    strokeDasharray="110 760"
                    className="animate-edge-trace-fast"
                  />
                )}
                <path
                  d={rightRaidPodPath}
                  fill="none"
                  stroke="#050609"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </motion.g>
            )}
          </AnimatePresence>

          {/* ---- LOWER RIGHT ADVANCED AERO VENTURI DIFFUSER ---- */}
          <g>
            <path
              d={rightVentBayPath}
              fill={`url(#${uid}-armor-blade)`}
              stroke="#050609"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <g clipPath={`url(#${uid}-right-vent-clip)`}>
              {/* Outer Titanium Winglet Bevel */}
              <path
                d={smoothPolyPath([[1994, 287], [1936, 287], [1926, 312], [1978, 312]], 3)}
                fill={`url(#${uid}-titanium-bevel)`}
                fillOpacity="0.34"
                stroke="#050609"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
              {/* 6 Aggressive Forward-Raked Plasma Gill Blades */}
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const rx = 1918 - idx * 38;
                return (
                  <path
                    key={idx}
                    d={smoothPolyPath([[rx, 291], [rx - 22, 291], [rx - 30, 308], [rx - 8, 308]], 2.5)}
                    fill={rightAccentColor}
                    fillOpacity={rightFlash || isRightRaiding ? 0.96 : 0.8}
                    stroke="#050609"
                    strokeWidth="1.1"
                    strokeLinejoin="round"
                    className={animate ? 'animate-louver-pulse' : undefined}
                    style={animate ? { animationDelay: `${idx * 0.1}s` } : undefined}
                  />
                );
              })}
              {/* Twin-Step Illuminated Diffuser Rail */}
              <path
                d={smoothPolyPath([[1682, 291], [1466, 291], [1458, 307], [1674, 307]], 3)}
                fill="#0b101b"
                stroke="#050609"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <line
                x1="1674"
                y1="297"
                x2="1470"
                y2="297"
                stroke={rightAccentColor}
                strokeWidth="3.6"
                strokeOpacity="0.6"
                strokeLinecap="round"
                filter={`url(#${uid}-neon-right)`}
              />
              <line
                x1="1674"
                y1="297"
                x2="1470"
                y2="297"
                stroke={rightAccentColor}
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <line
                x1="1668"
                y1="303"
                x2="1474"
                y2="303"
                stroke="#ffffff"
                strokeOpacity="0.45"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            </g>
            <path
              d={rightVentBayPath}
              fill="none"
              stroke="#050609"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </g>

          {/* ---- LOWER RIGHT ALIGNED TICKS MAGAZINE & CYBER-ARMOR CONDUIT ---- */}
          <g>
            <path
              d={rightConduitBayPath}
              fill={`url(#${uid}-armor-blade)`}
              stroke="#050609"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <g clipPath={`url(#${uid}-right-conduit-clip)`}>
              {/* Machined Top Titanium Trim */}
              <polygon
                points="1446,287 1226,287 1224,291 1444,291"
                fill={`url(#${uid}-titanium-bevel)`}
                fillOpacity="0.34"
              />
              {showTicks ? (
                <g>
                  {/* 4 Aligned Forward-Raked Plasma Power-Cell Ticks */}
                  {[0, 1, 2, 3].map((idx) => {
                    const tx = 1432 - idx * 51;
                    const isActive = right.ticksAllOn || idx < right.ticks;
                    return (
                      <g key={idx}>
                        {/* Recessed Armor Socket */}
                        <path
                          d={smoothPolyPath([[tx + 2, 292], [tx - 42, 292], [tx - 52, 320], [tx - 8, 320]], 3)}
                          fill="#05070c"
                          stroke="#050609"
                          strokeWidth="1.2"
                          strokeLinejoin="round"
                        />
                        {/* Active Blade Neon Glow Underlay */}
                        {isActive && (
                          <path
                            d={smoothPolyPath([[tx - 1, 294], [tx - 39, 294], [tx - 48, 317], [tx - 10, 317]], 2.5)}
                            fill={rightAccentColor}
                            fillOpacity="0.6"
                            filter={`url(#${uid}-neon-right)`}
                          />
                        )}
                        {/* Active / Standby Magazine Blade */}
                        <path
                          d={smoothPolyPath([[tx - 1, 294], [tx - 39, 294], [tx - 48, 317], [tx - 10, 317]], 2.5)}
                          fill={isActive ? rightAccentColor : '#121826'}
                          fillOpacity={isActive ? 0.94 : 0.9}
                          stroke="#050609"
                          strokeWidth="1.2"
                          strokeLinejoin="round"
                          className={isActive && animate ? 'animate-louver-pulse' : undefined}
                          style={isActive && animate ? { animationDelay: `${idx * 0.14}s` } : undefined}
                        />
                        {isActive ? (
                          <>
                            <line
                              x1={tx - 4}
                              y1="297"
                              x2={tx - 37}
                              y2="297"
                              stroke="#ffffff"
                              strokeOpacity="0.85"
                              strokeWidth="2"
                            />
                            <polygon
                              points={`${tx - 18},294 ${tx - 29},294 ${tx - 38},317 ${tx - 27},317`}
                              fill="#ffffff"
                              fillOpacity="0.24"
                            />
                          </>
                        ) : (
                          <>
                            <line
                              x1={tx - 10}
                              y1="313"
                              x2={tx - 42}
                              y2="313"
                              stroke={rightAccentColor}
                              strokeOpacity="0.28"
                              strokeWidth="1.6"
                            />
                            <polygon
                              points={`${tx - 18},297 ${tx - 25},297 ${tx - 32},311 ${tx - 25},311`}
                              fill="#1e293b"
                              fillOpacity="0.65"
                            />
                          </>
                        )}
                      </g>
                    );
                  })}
                  <line
                    x1="1426"
                    y1="321"
                    x2="1218"
                    y2="321"
                    stroke={rightAccentColor}
                    strokeOpacity={right.ticks > 0 || right.ticksAllOn ? 0.72 : 0.25}
                    strokeWidth="2"
                  />
                </g>
              ) : (
                <g>
                  {/* Upper 6-Cell Angled Telemetry Matrix */}
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const cx = 1434 - idx * 33;
                    return (
                      <polygon
                        key={idx}
                        points={`${cx},293 ${cx - 22},293 ${cx - 27},304 ${cx - 5},304`}
                        fill={rightAccentColor}
                        fillOpacity={0.38 + (idx % 2) * 0.35}
                        stroke="#050609"
                        strokeWidth="0.9"
                        className={animate ? 'animate-louver-pulse' : undefined}
                        style={animate ? { animationDelay: `${idx * 0.13}s` } : undefined}
                      />
                    );
                  })}
                  {/* Lower Recessed High-Velocity Laser Filament */}
                  <polygon
                    points="1432,308 1222,308 1216,321 1426,321"
                    fill="#0b111e"
                    stroke="#050609"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="1424"
                    y1="314.5"
                    x2="1224"
                    y2="314.5"
                    stroke={rightAccentColor}
                    strokeWidth="3.2"
                    strokeOpacity="0.55"
                    filter={`url(#${uid}-neon-right)`}
                  />
                  <line
                    x1="1424"
                    y1="314.5"
                    x2="1224"
                    y2="314.5"
                    stroke={rightAccentColor}
                    strokeWidth="3"
                    strokeOpacity="0.95"
                    strokeLinecap="round"
                  />
                </g>
              )}
            </g>
            <path
              d={rightConduitBayPath}
              fill="none"
              stroke="#050609"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          </g>

          {/* Right Wing Interior */}
          <g clipPath={`url(#${uid}-right-wing-clip)`}>
            <path d={rightWingPath} fill={right.fillColor} />
            <path d={rightWingPath} fill={`url(#${uid}-right-wing-grad)`} />
            {showTextures && (
              <>
                <path d={rightWingPath} fill={`url(#${uid}-hex-armor)`} />
                <path d={rightWingPath} fill={`url(#${uid}-carbon-right)`} />
              </>
            )}

            {/* Recessed Stealth Armor Plate Cutout inside Right Wing */}
            <polygon
              points="2040,136 1574,136 1532,266 1996,266"
              fill="#05070c"
              fillOpacity="0.28"
              stroke={rightAccentColor}
              strokeOpacity="0.22"
              strokeWidth="1.4"
            />

            {/* Aggressive Racing Triple Speed-Canard Shards at Outer Wingtip */}
            {showTextures && (
              <g>
                <path
                  d="M 2172 122 L 2148 122 L 2046 282 L 2070 282 Z"
                  fill={rightAccentColor}
                  fillOpacity="0.4"
                />
                <path
                  d="M 2138 122 L 2122 122 L 2020 282 L 2036 282 Z"
                  fill={rightAccentColor}
                  fillOpacity="0.24"
                />
                <path
                  d="M 2112 122 L 2102 122 L 2000 282 L 2010 282 Z"
                  fill="#050609"
                  fillOpacity="0.55"
                />
                <polygon
                  points="1625,106 1606,106 1556,282 1575,282"
                  fill="#050609"
                  fillOpacity="0.34"
                />
                <polygon
                  points="1596,106 1586,106 1536,282 1546,282"
                  fill={rightAccentColor}
                  fillOpacity="0.24"
                />
              </g>
            )}

            {/* Tactical HUD Telemetry Tick Scale along Top & Bottom Wing Rails */}
            {showTextures && (
              <g opacity="0.55">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
                  const tx = 2015 - i * 44;
                  return (
                    <g key={i}>
                      <line
                        x1={tx}
                        y1="124"
                        x2={tx - 4}
                        y2="132"
                        stroke={rightAccentColor}
                        strokeWidth={i % 3 === 0 ? '2' : '1.2'}
                      />
                      <line
                        x1={tx - 18}
                        y1="272"
                        x2={tx - 22}
                        y2="280"
                        stroke={rightAccentColor}
                        strokeWidth={i % 3 === 0 ? '2' : '1.2'}
                      />
                    </g>
                  );
                })}
                <polyline
                  points="2018,158 2028,144 2004,144"
                  fill="none"
                  stroke={rightAccentColor}
                  strokeWidth="2"
                />
                <polyline
                  points="1566,244 1556,258 1580,258"
                  fill="none"
                  stroke={rightAccentColor}
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Dual Symmetrical Kinetic Racing Chevron Streams */}
            {animate && (
              <>
                <g className={clock.running || isRightRaiding ? 'animate-race-wave-right-fast' : 'animate-race-wave-right'}>
                  <polygon
                    points="2090,98 1925,98 1830,295 1995,295"
                    fill={`url(#${uid}-right-race-wave)`}
                  />
                  <polygon
                    points="1932,118 1906,118 1958,202 1906,286 1932,286 1984,202"
                    fill={rightAccentColor}
                    fillOpacity="0.28"
                  />
                  <polygon
                    points="1888,118 1874,118 1926,202 1874,286 1888,286 1940,202"
                    fill="#ffffff"
                    fillOpacity="0.16"
                  />
                </g>
                <g className="animate-race-wave-right-alt">
                  <polygon
                    points="2010,118 1986,118 2038,202 1986,286 2010,286 2062,202"
                    fill={rightAccentColor}
                    fillOpacity="0.2"
                  />
                </g>
              </>
            )}

            {/* Rising Energy Sparks */}
            {animate &&
              RIGHT_WING_SPARKS.map((sp, i) => (
                <circle
                  key={i}
                  cx={sp.cx}
                  cy={sp.cy}
                  r={sp.r}
                  fill={i % 2 === 0 ? '#fecaca' : rightAccentColor}
                  className="animate-spark-right"
                  style={{ animationDelay: sp.delay }}
                />
              ))}

            {/* Score Trigger Shimmer */}
            {rightFlash && (
              <rect
                key={rightFlash.key}
                x="1960"
                y="80"
                width="240"
                height="240"
                fill={`url(#${uid}-shimmer-grad)`}
                className="animate-wing-shimmer-right"
              />
            )}
          </g>

          {/* Right Wing Razor Neon Frame + Deep Black Outer Edge */}
          <path
            d={rightWingPath}
            fill="none"
            stroke={isRightRaiding ? '#ff2432' : right.borderColor}
            strokeWidth={rightFlash || isRightRaiding ? '6.5' : '4.8'}
            strokeLinejoin="round"
            filter={`url(#${uid}-neon-right)`}
          />
          <path
            d={rightWingPath}
            fill="none"
            stroke={isRightRaiding ? '#ff2432' : right.borderColor}
            strokeWidth={rightFlash || isRightRaiding ? '5.2' : '4'}
            strokeLinejoin="round"
          />
          <path
            d={rightWingPath}
            fill="none"
            stroke="#050609"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />

          {/* Continuous Traveling Neon Edge Trace */}
          {animate && (
            <path
              d={rightWingPath}
              fill="none"
              stroke={rightAccentColor}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeDasharray="175 1540"
              className={clock.running || isRightRaiding ? 'animate-edge-trace-fast' : 'animate-edge-trace'}
            />
          )}

          {/* Interlocking Wing-to-Score Blade Seam */}
          <polygon
            points="1500,105 1488,105 1440,282 1452,282"
            fill="#050609"
          />
          <line
            x1="1494"
            y1="112"
            x2="1446"
            y2="275"
            stroke={rightAccentColor}
            strokeWidth="2.8"
            strokeOpacity="0.55"
            filter={`url(#${uid}-neon-right)`}
          />
          <line
            x1="1494"
            y1="112"
            x2="1446"
            y2="275"
            stroke={rightAccentColor}
            strokeWidth="2.2"
            strokeOpacity="0.92"
            strokeLinecap="round"
          />

          {/* ---- RIGHT CYBER-ARMOR SCORE POD (00) ---- */}
          <g clipPath={`url(#${uid}-right-score-clip)`}>
            {/* Forged Metallic Outer Frame Backing */}
            <path d={rightScorePath} fill={`url(#${uid}-chassis-metal)`} />

            {/* Recessed Inner Chamber */}
            <g clipPath={`url(#${uid}-right-score-chamber-clip)`}>
              <path d={rightScoreChamberPath} fill={right.scoreBgColor} />
              <path d={rightScoreChamberPath} fill={`url(#${uid}-score-pod-grad)`} />
              <path
                d={rightScoreChamberPath}
                fill={`url(#${uid}-right-score-spot)`}
                opacity={rightFlash || isRightRaiding ? 1 : 0.84}
              />
              {showTextures && (
                <>
                  <path d={rightScoreChamberPath} fill={`url(#${uid}-hex-armor)`} />
                  <path d={rightScoreChamberPath} fill={`url(#${uid}-dot-mesh)`} />
                </>
              )}

              {/* Rotating Segmented Tactical Reticle Rings behind 00 */}
              <g opacity={rightFlash || isRightRaiding ? 0.52 : 0.3}>
                <circle
                  cx="1352"
                  cy="196"
                  r="64"
                  fill="none"
                  stroke={rightAccentColor}
                  strokeWidth="1.5"
                  strokeDasharray="18 10 6 10"
                  className={animate ? 'animate-reticle-spin-reverse' : undefined}
                />
                <circle
                  cx="1352"
                  cy="196"
                  r="48"
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity="0.45"
                  strokeWidth="1.2"
                  strokeDasharray="24 22"
                  className={animate ? 'animate-reticle-spin' : undefined}
                />
              </g>

              {/* Vertical Radar Scanline Sweep inside Score Chamber */}
              {animate && (
                <rect
                  x="1220"
                  y="112"
                  width="260"
                  height="52"
                  fill={`url(#${uid}-right-radar-sweep)`}
                  className="animate-score-sweep"
                />
              )}

              {/* Aggressive Diagonal Corner Armor Gussets & Gill Slits */}
              <polygon points="1472,113 1422,113 1464,154" fill="#050609" fillOpacity="0.82" />
              <polygon points="1230,272 1280,272 1238,232" fill="#050609" fillOpacity="0.82" />
              <line x1="1466" y1="146" x2="1430" y2="115" stroke={rightAccentColor} strokeWidth="2.2" />
              <line x1="1274" y1="269" x2="1240" y2="238" stroke={rightAccentColor} strokeWidth="2.2" />

              {/* Side Vertical Power Equalizer Bars */}
              {[0, 1, 2, 3].map((i) => (
                <rect
                  key={i}
                  x={1443 - i * 5}
                  y={178 - i * 3}
                  width="3"
                  height={20 + i * 5}
                  fill={rightAccentColor}
                  fillOpacity="0.68"
                  className={animate ? 'animate-pod-eq' : undefined}
                  style={animate ? { animationDelay: `${i * 0.16}s` } : undefined}
                />
              ))}

              {/* Crimson Raid Lock-On Beacon Bar inside top of Right Score Pod */}
              {isRightRaiding && (
                <g>
                  <polygon
                    points="1472,113 1255,113 1260,120 1468,120"
                    fill="#ff2432"
                    fillOpacity="0.55"
                    filter={`url(#${uid}-neon-right)`}
                  />
                  <polygon
                    points="1472,113 1255,113 1260,120 1468,120"
                    fill="#ff2432"
                    strokeLinejoin="round"
                  />
                  <polygon
                    points="1368,116 1340,116 1354,129"
                    fill="#ff2432"
                    stroke="#050609"
                    strokeWidth="1"
                    className={animate ? 'animate-chevron-pulse' : undefined}
                  />
                </g>
              )}

              {rightFlash && (
                <rect
                  key={`pod-${rightFlash.key}`}
                  x="1200"
                  y="90"
                  width="300"
                  height="210"
                  fill={rightAccentColor}
                  opacity="0.26"
                />
              )}

              <motion.g
                key={`right-${right.score}`}
                initial={animate ? { y: -26, opacity: 0, scale: 1.15 } : false}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.22, ease: EASE_BROADCAST }}
                style={{ transformOrigin: '1352px 196px' }}
              >
                <text
                  x="1352"
                  y="196"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={right.textColor}
                  fontFamily="Barlow Condensed, sans-serif"
                  fontWeight="800"
                  fontSize={rightScoreFontSize}
                  letterSpacing="2"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatScore(right.score)}
                </text>
              </motion.g>
            </g>

            {/* Inner Recessed Bevel Neon Rim */}
            <path
              d={rightScoreChamberPath}
              fill="none"
              stroke={rightAccentColor}
              strokeOpacity={rightFlash || isRightRaiding ? 0.95 : 0.45}
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {/* Glowing Laser Seam facing Center Timer */}
            <polyline
              points="1255,113 1268,154 1230,272"
              fill="none"
              stroke={rightAccentColor}
              strokeWidth="3.2"
              strokeOpacity="0.55"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#${uid}-neon-right)`}
            />
            <polyline
              points="1255,113 1268,154 1230,272"
              fill="none"
              stroke={rightAccentColor}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* Score Pod Black Edge Frame */}
          <path
            d={rightScorePath}
            fill="none"
            stroke={rightFlash ? right.borderColor : isRightRaiding ? '#ff2432' : '#050609'}
            strokeWidth={rightFlash || isRightRaiding ? '3' : '2.8'}
            strokeLinejoin="round"
          />

          {/* Optional Right Team Logo */}
          {showLogos && (
            <g>
              <circle
                cx="2048"
                cy="202"
                r="46"
                fill="rgba(0,0,0,0.48)"
                stroke="#050609"
                strokeWidth="3"
              />
              {right.logoUrl ? (
                <image
                  href={right.logoUrl}
                  x="2004"
                  y="158"
                  width="88"
                  height="88"
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#${uid}-right-logo-clip)`}
                  imageRendering="optimizeQuality"
                />
              ) : (
                <text
                  x="2048"
                  y="204"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={right.textColor}
                  fontFamily="Barlow Condensed, sans-serif"
                  fontWeight="800"
                  fontSize="38"
                >
                  {(right.name.trim().slice(0, 2) || 'TB').toUpperCase()}
                </text>
              )}
            </g>
          )}

          {/* Right Team Name & Optional Tag */}
          {right.tag.trim() ? (
            <g>
              <text
                x={rightNameX}
                y="182"
                textAnchor="middle"
                dominantBaseline="central"
                fill={right.textColor}
                fontFamily="Barlow Condensed, sans-serif"
                fontWeight="800"
                fontStyle="italic"
                fontSize={rightNameFontSize}
                letterSpacing="2"
              >
                {right.name.toUpperCase()}
              </text>
              <text
                x={rightNameX}
                y="238"
                textAnchor="middle"
                dominantBaseline="central"
                fill={right.textColor}
                fillOpacity="0.74"
                fontFamily="Plus Jakarta Sans, sans-serif"
                fontWeight="700"
                fontSize="22"
                letterSpacing="4"
              >
                {right.tag.toUpperCase()}
              </text>
            </g>
          ) : (
            <text
              x={rightNameX}
              y="204"
              textAnchor="middle"
              dominantBaseline="central"
              fill={right.textColor}
              fontFamily="Barlow Condensed, sans-serif"
              fontWeight="800"
              fontStyle="italic"
              fontSize={rightNameFontSize}
              letterSpacing="2.5"
            >
              {right.name.toUpperCase()}
            </text>
          )}

          {/* Floating Score Delta Callout */}
          {rightFlash && (
            <motion.text
              key={`right-delta-${rightFlash.key}`}
              x="1352"
              y="112"
              textAnchor="middle"
              fill="#ffffff"
              stroke="#050609"
              strokeWidth="5"
              paintOrder="stroke"
              fontFamily="Barlow Condensed, sans-serif"
              fontWeight="800"
              fontSize="38"
              initial={{ y: 12, opacity: 0, scale: 0.85 }}
              animate={{ y: -26, opacity: [0, 1, 1, 0], scale: 1.1 }}
              transition={{ duration: 0.78, ease: EASE_BROADCAST }}
            >
              {rightFlash.delta > 0 ? `+${rightFlash.delta}` : rightFlash.delta}
            </motion.text>
          )}
        </motion.g>

        {/* ================= AMBIENT CHASSIS SWEEP & DEEP BLACK OUTER RIM ================= */}
        {animate && (
          <g clipPath={`url(#${uid}-chassis-clip)`} pointerEvents="none">
            <rect
              x="0"
              y="-20"
              width="240"
              height="420"
              fill={`url(#${uid}-ambient-beam)`}
              className="animate-ambient-sweep"
            />
          </g>
        )}

        <motion.path
          d={fullChassisOutline}
          fill="none"
          stroke="#050609"
          strokeWidth="2.8"
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={animate ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        />

        {/* ================= CENTER CROWN, CYBER TIMER CORE & BOTTOM HYPER-REACTOR ================= */}
        <motion.g
          initial={animate ? { scale: 0.86, y: -12, opacity: 0 } : false}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ duration: 0.44, ease: EASE_BROADCAST }}
          style={{ transformOrigin: '1100px 190px' }}
        >
          {/* ---- LOWER CENTER HYPER-REACTOR & TWIN-WING SPLITTER ---- */}
          <g>
            <path
              d={lowerCenterCorePath}
              fill={`url(#${uid}-armor-blade)`}
              stroke="#050609"
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
            <g clipPath={`url(#${uid}-center-core-clip)`}>
              {showTextures && (
                <path d={lowerCenterCorePath} fill={`url(#${uid}-hex-armor)`} />
              )}
              {/* Brushed Titanium Upper Collar */}
              <polygon
                points="988,286 1212,286 1208,292 992,292"
                fill={`url(#${uid}-titanium-bevel)`}
                fillOpacity="0.48"
              />
              {/* Twin Aligned Lateral Armored Winglet Gussets */}
              <path
                d={smoothPolyPath([[988, 286], [1008, 286], [1022, 336], [1010, 336], [1002, 324]], 3)}
                fill="#0c1220"
                stroke="#050609"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <path
                d={smoothPolyPath([[1212, 286], [1192, 286], [1178, 336], [1190, 336], [1198, 324]], 3)}
                fill="#0c1220"
                stroke="#050609"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <line x1="993" y1="291" x2="1008" y2="331" stroke={leftAccentColor} strokeWidth="2.4" strokeLinecap="round" />
              <line x1="1207" y1="291" x2="1192" y2="331" stroke={rightAccentColor} strokeWidth="2.4" strokeLinecap="round" />

              {/* Bottom Keel Laser Bar */}
              {(isUrgent || raidingTeam !== 'none') && (
                <path
                  d={smoothPolyPath([[1028, 328], [1172, 328], [1166, 334], [1034, 334]], 2)}
                  fill={timerCoreAccent}
                  fillOpacity="0.55"
                  filter={`url(#${uid}-neon-right)`}
                />
              )}
              <path
                d={smoothPolyPath([[1028, 328], [1172, 328], [1166, 334], [1034, 334]], 2)}
                fill={timerCoreAccent}
                fillOpacity={isUrgent || raidingTeam !== 'none' ? 0.96 : 0.72}
              />

              {/* Lower Center Console Content: Base Text OR Rotating Hex-Core Reactor */}
              {center.bottomBaseText.trim() ? (
                <text
                  x="1100"
                  y="310"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#f8fafc"
                  fontFamily="Barlow Condensed, sans-serif"
                  fontWeight="800"
                  fontSize={center.bottomBaseText.length > 12 ? 18 : 22}
                  letterSpacing="2"
                >
                  {center.bottomBaseText.toUpperCase()}
                </text>
              ) : (
                <g>
                  {/* Rotating Cyber Octagon Ring around Core */}
                  <circle
                    cx="1100"
                    cy="310"
                    r="16.5"
                    fill="none"
                    stroke={timerCoreAccent}
                    strokeOpacity="0.6"
                    strokeWidth="1.4"
                    strokeDasharray="6 4"
                    className={animate ? 'animate-reticle-spin' : undefined}
                  />
                  {/* Center Pulsing Reactor Diamond */}
                  <path
                    d={smoothPolyPath([[1100, 298], [1112, 310], [1100, 322], [1088, 310]], 2.5)}
                    fill={timerCoreAccent}
                    stroke="#050609"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    className={animate ? 'animate-core-breathe' : undefined}
                  />
                  <path
                    d={smoothPolyPath([[1100, 304], [1106, 310], [1100, 316], [1094, 310]], 1.5)}
                    fill="#ffffff"
                    fillOpacity="0.9"
                  />
                  {/* 4 Swept Cyber Equalizer Blades Left */}
                  {[0, 1, 2, 3].map((i) => {
                    const bx = 1074 - i * 16;
                    const halfH = 6.8 - i * 1.1;
                    return (
                      <path
                        key={`lc-${i}`}
                        d={smoothPolyPath([[bx, 310 - halfH], [bx - 9, 310 - halfH], [bx - 14, 310 + halfH], [bx - 5, 310 + halfH]], 2)}
                        fill={isLeftRaiding ? '#ff2432' : left.borderColor}
                        stroke="#050609"
                        strokeWidth="1.1"
                        strokeLinejoin="round"
                        className={animate ? 'animate-blade-wave-left' : undefined}
                        style={animate ? { animationDelay: `${i * 0.13}s` } : undefined}
                      />
                    );
                  })}
                  {/* 4 Swept Cyber Equalizer Blades Right */}
                  {[0, 1, 2, 3].map((i) => {
                    const bx = 1126 + i * 16;
                    const halfH = 6.8 - i * 1.1;
                    return (
                      <path
                        key={`rc-${i}`}
                        d={smoothPolyPath([[bx, 310 - halfH], [bx + 9, 310 - halfH], [bx + 14, 310 + halfH], [bx + 5, 310 + halfH]], 2)}
                        fill={isRightRaiding ? '#ff2432' : right.borderColor}
                        stroke="#050609"
                        strokeWidth="1.1"
                        strokeLinejoin="round"
                        className={animate ? 'animate-blade-wave-right' : undefined}
                        style={animate ? { animationDelay: `${i * 0.13}s` } : undefined}
                      />
                    );
                  })}
                </g>
              )}
            </g>
            <path
              d={lowerCenterCorePath}
              fill="none"
              stroke="#050609"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
          </g>

          {/* Top Dark Hexagonal Crown */}
          <path
            d={centerCrownPath}
            fill={isSvMediaCrown ? '#05070c' : `url(#${uid}-crown-grad)`}
            stroke="#050609"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          {!isSvMediaCrown && (
            <line
              x1="988"
              y1="20"
              x2="1212"
              y2="20"
              stroke="#94a3b8"
              strokeOpacity="0.4"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          )}

          {/* Sculpted Jet-Intake Pockets & Twin Aggressive Crimson Apex Fangs */}
          {showSparkChannels && (
            <g>
              {/* Recessed Obsidian Intake Pockets */}
              <path
                d={smoothPolyPath([[886, 64], [898, 42], [924, 42], [937, 58], [926, 100], [896, 100]], 4)}
                fill="#05070c"
                stroke="#050609"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d={smoothPolyPath([[1314, 64], [1302, 42], [1276, 42], [1263, 58], [1274, 100], [1304, 100]], 4)}
                fill="#05070c"
                stroke="#050609"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              {/* Soft Neon Glow Underlay for Apex Fangs (unfiltered crisp fangs sit on top) */}
              <g opacity="0.45" filter={`url(#${uid}-neon-right)`}>
                <path
                  d="M 911 54 L 927 78 L 911 101 L 920 101 L 936 78 L 920 54 Z"
                  fill={isLeftRaiding ? '#ff3b47' : '#ff2432'}
                />
                <path
                  d="M 1289 54 L 1273 78 L 1289 101 L 1280 101 L 1264 78 L 1280 54 Z"
                  fill={isRightRaiding ? '#ff3b47' : '#ff2432'}
                />
              </g>
              <g>
                {/* Left Dual Apex Fangs */}
                <path
                  d="M 911 54 L 927 78 L 911 101 L 920 101 L 936 78 L 920 54 Z"
                  fill={isLeftRaiding ? '#ff3b47' : '#ff2432'}
                  stroke="#050609"
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                  className={animate ? 'animate-chevron-pulse' : undefined}
                />
                <path
                  d="M 916 57 L 931 78 L 916 98"
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity="0.55"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
                <path
                  d="M 894 60 L 907 78 L 894 96 L 901 96 L 914 78 L 901 60 Z"
                  fill="#ff2432"
                  fillOpacity="0.78"
                  stroke="#050609"
                  strokeWidth="0.7"
                  strokeLinejoin="round"
                  className={animate ? 'animate-chevron-pulse' : undefined}
                />
                {/* Right Dual Apex Fangs */}
                <path
                  d="M 1289 54 L 1273 78 L 1289 101 L 1280 101 L 1264 78 L 1280 54 Z"
                  fill={isRightRaiding ? '#ff3b47' : '#ff2432'}
                  stroke="#050609"
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                  className={animate ? 'animate-chevron-pulse' : undefined}
                />
                <path
                  d="M 1284 57 L 1269 78 L 1284 98"
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity="0.55"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
                <path
                  d="M 1306 60 L 1293 78 L 1306 96 L 1299 96 L 1286 78 L 1299 60 Z"
                  fill="#ff2432"
                  fillOpacity="0.78"
                  stroke="#050609"
                  strokeWidth="0.7"
                  strokeLinejoin="round"
                  className={animate ? 'animate-chevron-pulse' : undefined}
                />
              </g>
            </g>
          )}

          {/* Top Crown: Glossy 3D SV MEDIA Logo or Custom Text */}
          {isSvMediaCrown ? (
            <SvMediaLogo uid={uid} transform="translate(944.2, 24.0) scale(0.59)" />
          ) : (
            <text
              x="1100"
              y="60"
              textAnchor="middle"
              dominantBaseline="central"
              fill="#ffffff"
              fontFamily="Barlow Condensed, sans-serif"
              fontWeight="800"
              fontSize={center.topCrownText.length > 9 ? 34 : 42}
              letterSpacing="2.5"
            >
              {center.topCrownText.toUpperCase()}
            </text>
          )}

          {/* Center Bright White-Silver Beveled Shield (30) */}
          <path
            d={centerShieldPath}
            fill={`url(#${uid}-center-shield)`}
            stroke={isUrgent ? '#dc2626' : '#050609'}
            strokeWidth={isUrgent ? '4' : '3'}
            strokeLinejoin="miter"
            strokeMiterlimit="6"
          />

          {/* Urgency Strobe Outline when < 10s */}
          {animate && isUrgent && (
            <motion.path
              d={centerShieldPath}
              fill="none"
              stroke="#ef4444"
              strokeWidth="4"
              strokeLinejoin="miter"
              filter={`url(#${uid}-neon-right)`}
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {/* Machined Inner Dark Chamfer Frame */}
          <path
            d={centerShieldInnerPath}
            fill="none"
            stroke="rgba(5, 6, 9, 0.22)"
            strokeWidth="1.5"
            strokeLinejoin="miter"
          />

          {/* Sharp Chamfered Countdown Progress Bar */}
          {clock.mode === 'countdown' && clock.durationSeconds > 0 && (
            <g>
              <polygon
                points="998,260 1202,260 1198,265 1002,265"
                fill="rgba(5, 6, 9, 0.16)"
              />
              <polygon
                points={`998,260 ${998 + 204 * countdownRatio},260 ${Math.max(
                  998,
                  998 + 204 * countdownRatio - 4,
                )},265 1002,265`}
                fill={isUrgent ? '#dc2626' : '#050609'}
              />
            </g>
          )}

          {/* Optional Center Sub-Label inside white shield */}
          {center.centerSubText.trim() && (
            <text
              x="1100"
              y="142"
              textAnchor="middle"
              dominantBaseline="central"
              fill="#475569"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontWeight="700"
              fontSize="16"
              letterSpacing="2.5"
            >
              {center.centerSubText.toUpperCase()}
            </text>
          )}

          {/* Main Bold 2-Digit Clock / Static Text (30) */}
          <motion.text
            x="1100"
            y={center.centerSubText.trim() ? '204' : '195'}
            textAnchor="middle"
            dominantBaseline="central"
            fill={isUrgent ? '#dc2626' : '#090b10'}
            fontFamily="Barlow Condensed, sans-serif"
            fontWeight="800"
            fontSize={
              clock.mode === 'static'
                ? clockText.length > 4
                  ? 56
                  : 82
                : isLongClock
                  ? 62
                  : clockText.length > 2
                    ? 74
                    : 114
            }
            letterSpacing={clock.mode === 'static' ? '3' : '2'}
            style={{ fontVariantNumeric: 'tabular-nums', transformOrigin: '1100px 195px' }}
            animate={
              animate && isUrgent ? { scale: [1, 1.045, 1] } : { scale: 1 }
            }
            transition={
              animate && isUrgent
                ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.15 }
            }
          >
            {clockText}
          </motion.text>
        </motion.g>
      </svg>
    </div>
  );
};
