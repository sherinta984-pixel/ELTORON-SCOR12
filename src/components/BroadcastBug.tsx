import { useRef, type MouseEvent } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';
import {
  formatRaidClock,
  getPhaseLabel,
} from '../engine/kabaddiRules';
import type { MatchPhase, TeamId, TeamState } from '../types/kabaddi';

interface BroadcastBugProps {
  teamA: TeamState;
  teamB: TeamState;
  phase: MatchPhase;
  raidClockSeconds: number;
  raidDurationSeconds: number;
  matchClockSeconds?: number;
  raidingTeam?: TeamId;
  isDoOrDie?: boolean;
  isSuperTackle?: boolean;
  isRaidClockRunning?: boolean;
  halfLabel?: string;
  animationCommand?: 'IN' | 'OUT';
}

const VIEWBOX_WIDTH = 2560;
const VIEWBOX_HEIGHT = 340;

const CHASSIS_OUTLINE_POINTS: ReadonlyArray<readonly [number, number]> = [
  [18, 46],
  [1138, 46],
  [1174, 12],
  [1386, 12],
  [1422, 46],
  [2542, 46],
  [2502, 210],
  [2458, 252],
  [2424, 252],
  [2376, 294],
  [1674, 294],
  [1628, 246],
  [1450, 246],
  [1410, 244],
  [1362, 296],
  [1280, 328],
  [1198, 296],
  [1150, 244],
  [1110, 246],
  [932, 246],
  [886, 294],
  [184, 294],
  [136, 252],
  [102, 252],
  [58, 210],
];

const CHASSIS_SVG_PATH =
  CHASSIS_OUTLINE_POINTS.map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'}${x} ${y}`).join(' ') + ' Z';

const CHASSIS_CSS_POLYGON = `polygon(${CHASSIS_OUTLINE_POINTS.map(
  ([x, y]) =>
    `${((x / VIEWBOX_WIDTH) * 100).toFixed(2)}% ${((y / VIEWBOX_HEIGHT) * 100).toFixed(2)}%`,
).join(', ')})`;

function getTeamNameFontSize(name: string): number {
  const len = name.trim().length;
  if (len <= 10) return 86;
  if (len <= 14) return 78;
  if (len <= 18) return 70;
  if (len <= 24) return 62;
  return 50;
}

export function BroadcastBug({
  teamA,
  teamB,
  phase,
  raidClockSeconds,
  raidDurationSeconds,
  matchClockSeconds: _matchClockSeconds,
  raidingTeam: _raidingTeam = 'A',
  isDoOrDie = false,
  isSuperTackle = false,
  isRaidClockRunning = false,
  halfLabel = '1ST HALF',
  animationCommand = 'IN',
}: BroadcastBugProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Interactive 3D tilt & specular sheen response on pointer hover
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 140, damping: 24, mass: 0.6 });
  const smoothY = useSpring(pointerY, { stiffness: 140, damping: 24, mass: 0.6 });

  const tiltRotateY = useTransform(smoothX, [-0.5, 0.5], [-2.2, 2.2]);
  const tiltRotateX = useTransform(smoothY, [-0.5, 0.5], [1.6, -1.6]);
  const specularShiftX = useTransform(smoothX, [-0.5, 0.5], [-24, 24]);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const normX = (event.clientX - rect.left) / rect.width - 0.5;
    const normY = (event.clientY - rect.top) / rect.height - 0.5;
    pointerX.set(normX);
    pointerY.set(normY);
  };

  const handleMouseLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  const phaseText = getPhaseLabel(phase).toUpperCase();
  const formattedScoreA = String(teamA.score).padStart(2, '0');
  const formattedScoreB = String(teamB.score).padStart(2, '0');
  const formattedRaid = formatRaidClock(raidClockSeconds);
  const raidRatio =
    raidDurationSeconds > 0
      ? Math.max(0, Math.min(1, raidClockSeconds / raidDurationSeconds))
      : 0;
  const isCriticalRaidTime = raidClockSeconds <= 5 && raidClockSeconds > 0;

  const sizeA = getTeamNameFontSize(teamA.name);
  const sizeB = getTeamNameFontSize(teamB.name);
  const scoreSizeA = formattedScoreA.length >= 3 ? 108 : 126;
  const scoreSizeB = formattedScoreB.length >= 3 ? 108 : 126;
  const progressBarMaxWidth = 172;
  const progressBarWidth = Math.max(0, Math.round(progressBarMaxWidth * raidRatio));

  return (
    <motion.div
      ref={containerRef}
      data-testid="broadcast-bug"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={animationCommand === 'OUT'
        ? { opacity: 0, y: 14, scale: 0.96 }
        : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: animationCommand === 'OUT' ? 0.28 : 0.35, ease: 'easeInOut' }}
      className="relative w-full max-w-[1440px] select-none"
      style={{ perspective: '1800px' }}
    >
      {/* Rich Stadium Team Ambient Backlights */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.65 }}
        animate={{ opacity: 0.58, scale: 1 }}
        transition={{ duration: 0.85, delay: 0.48, ease: 'easeInOut' }}
        className="pointer-events-none absolute -left-8 top-1/2 -translate-y-1/2 w-[45%] h-[180%] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(244, 28, 69, 0.48) 0%, rgba(190, 18, 60, 0.16) 45%, transparent 72%)',
        }}
      />
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.65 }}
        animate={{ opacity: 0.58, scale: 1 }}
        transition={{ duration: 0.85, delay: 0.48, ease: 'easeInOut' }}
        className="pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 w-[45%] h-[180%] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(32, 128, 255, 0.48) 0%, rgba(29, 78, 216, 0.16) 45%, transparent 72%)',
        }}
      />
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{
          opacity: isRaidClockRunning ? [0.45, 0.72, 0.45] : 0.48,
          scale: 1,
        }}
        transition={{
          opacity: { duration: isCriticalRaidTime ? 0.8 : 2.2, repeat: Infinity, ease: 'easeInOut' },
          scale: { duration: 0.6, ease: 'easeInOut' },
        }}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[28%] h-[160%] rounded-full blur-3xl"
        style={{
          background:
            isCriticalRaidTime || isDoOrDie
              ? 'radial-gradient(circle, rgba(245, 158, 11, 0.36) 0%, rgba(239, 68, 68, 0.14) 50%, transparent 76%)'
              : 'radial-gradient(circle, rgba(255, 212, 72, 0.25) 0%, rgba(148, 163, 184, 0.08) 48%, transparent 74%)',
        }}
      />

      {/* Wide Broadcast Glass Chassis */}
      <motion.div
        style={{
          rotateX: tiltRotateX,
          rotateY: tiltRotateY,
          transformStyle: 'preserve-3d',
        }}
        className="relative z-10 w-full aspect-[2560/340]"
      >
        {/* Grounded Arena Floor Reflection */}
        <motion.div
          aria-hidden="true"
          initial={{ scaleX: 0.14, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 0.6 }}
          transition={{ duration: 0.94, delay: 0.42, ease: [0.42, 0, 0.25, 1] }}
          className="pointer-events-none absolute left-[7%] right-[7%] -bottom-5 h-6 rounded-full blur-xl"
          style={{
            transformOrigin: 'center',
            background:
              'linear-gradient(90deg, rgba(244,28,69,0.34) 0%, rgba(255,206,72,0.24) 50%, rgba(32,128,255,0.34) 100%)',
          }}
        />

        {/* Rear Extruded Smoked-Glass Thickness Slab */}
        <motion.div
          aria-hidden="true"
          initial={{ scaleX: 0.12, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 0.85 }}
          transition={{ duration: 0.94, delay: 0.42, ease: [0.42, 0, 0.25, 1] }}
          className="pointer-events-none absolute inset-0 translate-y-[6px] scale-[0.998]"
          style={{
            transformOrigin: 'center',
            clipPath: CHASSIS_CSS_POLYGON,
            background:
              'linear-gradient(180deg, rgba(148,163,184,0.24) 0%, rgba(10,16,28,0.92) 45%, rgba(2,5,12,0.98) 100%)',
          }}
        />

        {/* Deep Obsidian-Crystal Backdrop Blur Core */}
        <motion.div
          aria-hidden="true"
          initial={{ scaleX: 0.12, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.94, delay: 0.42, ease: [0.42, 0, 0.25, 1] }}
          className="pointer-events-none absolute inset-0 backdrop-blur-xl backdrop-saturate-150 shadow-[0_28px_60px_rgba(0,0,0,0.92)]"
          style={{
            transformOrigin: 'center',
            clipPath: CHASSIS_CSS_POLYGON,
            background:
              'linear-gradient(180deg, rgba(14, 22, 36, 0.62) 0%, rgba(8, 12, 22, 0.8) 55%, rgba(4, 7, 14, 0.94) 100%)',
          }}
        />

        {/* Pointer-Reactive Overhead Specular Highlight */}
        <motion.div
          aria-hidden="true"
          initial={{ scaleX: 0.12, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.94, delay: 0.42, ease: [0.42, 0, 0.25, 1] }}
          className="pointer-events-none absolute inset-0"
          style={{
            transformOrigin: 'center',
            clipPath: CHASSIS_CSS_POLYGON,
            x: specularShiftX,
            background:
              'radial-gradient(ellipse 30% 44% at 50% 6%, rgba(255,255,255,0.16) 0%, transparent 70%)',
          }}
        />

        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          className="relative z-10 w-full h-full drop-shadow-[0_22px_42px_rgba(0,0,0,0.88)]"
          role="img"
          aria-label={`${teamA.name} ${teamA.score}, ${teamB.name} ${teamB.score}, ${getPhaseLabel(phase)}, Raid clock ${raidClockSeconds} seconds`}
        >
          <defs>
            {/* Precision Brushed Titanium & Cut Crystal Frame */}
            <linearGradient id="turbo-frame" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c2d0e4" stopOpacity="0.98" />
              <stop offset="0.16" stopColor="#586a84" stopOpacity="0.97" />
              <stop offset="0.52" stopColor="#1c2638" stopOpacity="0.97" />
              <stop offset="1" stopColor="#070b14" stopOpacity="0.99" />
            </linearGradient>

            {/* Deep Anodized Obsidian Shield Core */}
            <linearGradient id="turbo-dark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#263348" stopOpacity="0.97" />
              <stop offset="0.45" stopColor="#111928" stopOpacity="0.98" />
              <stop offset="1" stopColor="#060a12" stopOpacity="0.99" />
            </linearGradient>

            {/* Rich Multi-Stop Jewel Ruby & Cobalt-Azure Glass Wings */}
            <linearGradient id="turbo-red" x1="0" y1="0" x2="1" y2="0.55">
              <stop offset="0" stopColor="#520315" stopOpacity="0.98" />
              <stop offset="0.35" stopColor="#9d0626" stopOpacity="0.98" />
              <stop offset="0.72" stopColor="#d90b35" stopOpacity="0.98" />
              <stop offset="1" stopColor="#ff244e" stopOpacity="0.99" />
            </linearGradient>
            <linearGradient id="turbo-blue" x1="0" y1="0" x2="1" y2="0.55">
              <stop offset="0" stopColor="#04144c" stopOpacity="0.98" />
              <stop offset="0.35" stopColor="#093094" stopOpacity="0.98" />
              <stop offset="0.72" stopColor="#1458d6" stopOpacity="0.98" />
              <stop offset="1" stopColor="#2b8eff" stopOpacity="0.99" />
            </linearGradient>

            {/* Diamond-Cut Platinum Silver Score Plates */}
            <linearGradient id="turbo-silver" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.42" stopColor="#f1f6fc" />
              <stop offset="0.52" stopColor="#dce6f4" />
              <stop offset="1" stopColor="#9fb1c8" />
            </linearGradient>

            {/* 24K Championship Gold */}
            <linearGradient id="turbo-gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fffbeb" />
              <stop offset="0.38" stopColor="#fde047" />
              <stop offset="0.75" stopColor="#f59e0b" />
              <stop offset="1" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="turbo-gold-h" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#f59e0b" />
              <stop offset="0.5" stopColor="#fef08a" />
              <stop offset="1" stopColor="#f59e0b" />
            </linearGradient>
            <linearGradient id="turbo-urgent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe4e6" />
              <stop offset="0.4" stopColor="#fb7185" />
              <stop offset="1" stopColor="#e11d48" />
            </linearGradient>

            {/* Clear Crystal Specular & Metallic Glints */}
            <linearGradient id="turbo-gloss-cap" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.36" />
              <stop offset="0.4" stopColor="#ffffff" stopOpacity="0.14" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="turbo-gloss-shield" x1="0.1" y1="0" x2="0.9" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.26" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="turbo-gloss-streak" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.12" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="turbo-sheen" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="white" stopOpacity="0" />
              <stop offset="0.36" stopColor="white" stopOpacity="0.08" />
              <stop offset="0.5" stopColor="white" stopOpacity="0.42" />
              <stop offset="0.58" stopColor="#bae6fd" stopOpacity="0.18" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="turbo-tray-glass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#141e2e" stopOpacity="0.96" />
              <stop offset="1" stopColor="#070b12" stopOpacity="0.99" />
            </linearGradient>
            <radialGradient id="turbo-shield-caustic" cx="0.5" cy="0.48" r="0.54">
              <stop offset="0" stopColor="#ffd447" stopOpacity="0.22" />
              <stop offset="0.6" stopColor="#f59e0b" stopOpacity="0.06" />
              <stop offset="1" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="turbo-pip-red" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ff3b63" />
              <stop offset="0.44" stopColor="#ef0b38" />
              <stop offset="1" stopColor="#b50428" />
            </linearGradient>
            <linearGradient id="turbo-pip-blue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#42b0ff" />
              <stop offset="0.44" stopColor="#1373ff" />
              <stop offset="1" stopColor="#0742b5" />
            </linearGradient>

            {/* Micro-Textures: Speed Stripes, Carbon Hex Mesh & Diagonal Arena Grid */}
            <pattern
              id="turbo-speed"
              width="16"
              height="16"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M-4 4L4 -4M0 16L16 0M12 20L20 12"
                stroke="#ffffff"
                strokeOpacity="0.18"
                strokeWidth="2"
              />
            </pattern>
            <pattern
              id="turbo-carbon-hex"
              width="14"
              height="12"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M0 6L3.5 0H10.5L14 6L10.5 12H3.5Z"
                fill="none"
                stroke="#94a3b8"
                strokeOpacity="0.16"
                strokeWidth="0.9"
              />
            </pattern>
            <pattern
              id="turbo-wing-mesh"
              width="18"
              height="18"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M0 18L18 0"
                stroke="#ffffff"
                strokeOpacity="0.06"
                strokeWidth="1"
              />
              <circle cx="9" cy="9" r="0.9" fill="#ffffff" fillOpacity="0.09" />
            </pattern>

            {/* Clips */}
            <clipPath id="turbo-name-clip">
              <path d="M44 68H942L898 234H108L72 200Z" />
            </clipPath>
            <clipPath id="turbo-score-clip-left">
              <path d="M948 68H1142L1168 234H904Z" />
            </clipPath>
            <clipPath id="turbo-score-clip-right">
              <path d="M1418 68H1612L1656 234H1392Z" />
            </clipPath>
            <clipPath id="turbo-shield-clip">
              <path d="M1160 74H1400L1384 236L1346 274L1280 300L1214 274L1176 236Z" />
            </clipPath>
            <clipPath id="turbo-timer-slot-clip">
              <rect x="1172" y="84" width="216" height="154" />
            </clipPath>
            <clipPath id="turbo-bar-active-clip">
              <motion.rect
                y="246"
                height="8"
                rx="4"
                initial={false}
                animate={{
                  x: 1280 - progressBarWidth / 2,
                  width: progressBarWidth,
                }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              />
            </clipPath>
            <clipPath id="turbo-full-glass-clip">
              <path d={CHASSIS_SVG_PATH} />
            </clipPath>
            <clipPath id="reveal-left-half">
              <rect x="0" y="0" width="1280" height="340" />
            </clipPath>
            <clipPath id="reveal-right-half">
              <rect x="1280" y="0" width="1280" height="340" />
            </clipPath>

            {/* Wing Chassis Frame (Shared Left & Mirrored Right) */}
            <g id="turbo-wing-frame">
              {/* Outer 3D Drop Rim */}
              <path
                d="M12 52H1136L1164 82L1134 252H936L890 302H182L134 260H98L52 216Z"
                fill="#04070d"
                fillOpacity="0.9"
              />
              {/* Brushed Crystal-Chrome Chassis */}
              <path
                d="M18 46H1136L1160 78L1128 246H932L886 294H184L136 252H102L58 210Z"
                fill="url(#turbo-frame)"
                stroke="#dbeafe"
                strokeOpacity="0.42"
                strokeWidth="1.8"
              />
              {/* Top Specular Glass Chamfer */}
              <path
                d="M32 58H1136L1148 74H40Z"
                fill="#dbeafe"
                opacity="0.54"
              />
              {/* Inner Recessed Dark Well */}
              <path
                d="M44 68H1118L1092 238H108L72 200Z"
                fill="#080c14"
                fillOpacity="0.95"
              />
              {/* Lower Smoked Glass Player Tray with Carbon Hex Texture */}
              <path
                d="M152 246H902L868 286H190Z"
                fill="url(#turbo-tray-glass)"
                stroke="#94a3b8"
                strokeOpacity="0.3"
                strokeWidth="1.2"
              />
              <path
                d="M152 246H902L868 286H190Z"
                fill="url(#turbo-carbon-hex)"
              />
              <path
                d="M158 247H898"
                stroke="#ffffff"
                strokeOpacity="0.3"
                strokeWidth="1.1"
              />
              <path
                d="M192 285H866"
                stroke="#475569"
                strokeOpacity="0.5"
                strokeWidth="1.2"
              />
              {/* Corner Micro Aero Louvers on Outer Wing Shoulder */}
              <path
                d="M52 72H62L92 212H82Z"
                fill="#cbd5e1"
                opacity="0.22"
              />
              <path
                d="M104 226L146 266H164L122 226Z"
                fill="#cbd5e1"
                opacity="0.2"
              />
            </g>

            {/* Wing Glass Detail & Graphics Work */}
            <g id="turbo-wing-detail" clipPath="url(#turbo-name-clip)">
              {/* Fine Diagonal Arena Micro-Mesh */}
              <path d="M44 68H942L898 234H108L72 200Z" fill="url(#turbo-wing-mesh)" />
              {/* Upper Glass Bevel Refraction */}
              <path
                d="M44 68H942L914 84H49Z"
                fill="#ffffff"
                opacity="0.22"
              />
              {/* High-Velocity Speed Stripes & Aero Slashes */}
              <path d="M43 68H224L74 220H32Z" fill="url(#turbo-speed)" />
              <path
                d="M54 182L156 68H178L72 198Z"
                fill="#050b15"
                opacity="0.26"
              />
              <path
                d="M82 206L194 68H206L94 218Z"
                fill="#050b15"
                opacity="0.2"
              />
              <path
                d="M108 220L218 68H225L116 226Z"
                fill="#ffffff"
                opacity="0.16"
              />

              {/* Sleek Mirror-Gloss Upper Meniscus */}
              <path
                d="M44 68H942L933 112C714 98 310 100 62 116L52 102Z"
                fill="url(#turbo-gloss-cap)"
              />
              <path
                d="M62 116C310 100 714 98 933 112"
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.24"
                strokeWidth="1.2"
              />

              {/* Crisp Narrow Crystal Prism Facets */}
              <path
                d="M312 68H388L284 234H208Z"
                fill="url(#turbo-gloss-streak)"
              />
              <path
                d="M724 68H772L688 234H640Z"
                fill="url(#turbo-gloss-streak)"
                opacity="0.7"
              />

              {/* Razor-Sharp Top Inner White Catchlight */}
              <path
                d="M46 70H940"
                stroke="#ffffff"
                strokeOpacity="0.86"
                strokeWidth="2"
              />
              {/* Triple Aero Accent Bars */}
              <path
                d="M78 85H122L105 103H61Z"
                fill="#ffffff"
                opacity="0.9"
              />
              <path
                d="M129 85H144L127 103H112Z"
                fill="#ffffff"
                opacity="0.9"
              />
              <path
                d="M151 85H160L143 103H134Z"
                fill="#ffffff"
                opacity="0.58"
              />
              {/* Bottom Inner Glass Shadow */}
              <path
                d="M107 223H900L898 234H111Z"
                fill="#050810"
                opacity="0.34"
              />
            </g>
          </defs>

          {/* LEFT WING (TEAM A — Ruby Crystal, Mechanical Unfold From Center Core) */}
          <g clipPath="url(#reveal-left-half)">
            <g id="left-wing">
              <motion.g
                initial={{ x: 860, opacity: 0 }}
                animate={animationCommand === 'OUT' ? { x: 860, opacity: 0 } : { x: 0, opacity: 1 }}
                transition={{ duration: 0.96, delay: animationCommand === 'OUT' ? 0 : 0.44, ease: [0.42, 0, 0.25, 1] }}
              >
                <use href="#turbo-wing-frame" />
                <path d="M44 68H942L898 234H108L72 200Z" fill="url(#turbo-red)" />
                <use href="#turbo-wing-detail" />
                <path d="M109 226H899L898 234H108Z" fill="#ff6680" opacity="0.95" />
              </motion.g>

              {/* LEFT SCORE PLATE — Tier-1 Slide-Out & Interlock */}
              <motion.g
                id="left-score-plate"
                initial={{ x: 240, opacity: 0 }}
                animate={animationCommand === 'OUT' ? { x: 240, opacity: 0 } : { x: 0, opacity: 1 }}
                transition={{ duration: 0.72, delay: animationCommand === 'OUT' ? 0 : 0.3, ease: [0.42, 0, 0.25, 1] }}
              >
                <path
                  d="M940 65H1146L1172 239H896Z"
                  fill="#070c16"
                  fillOpacity="0.97"
                />
                <path d="M948 68H1142L1168 234H904Z" fill="url(#turbo-silver)" />
                <g clipPath="url(#turbo-score-clip-left)">
                  <path
                    d="M948 68H1142L1136 114C1080 104 992 106 938 118Z"
                    fill="#ffffff"
                    opacity="0.44"
                  />
                  <path
                    d="M1022 68H1066L984 234H940Z"
                    fill="#ffffff"
                    opacity="0.22"
                  />
                </g>
                <path d="M948 68H1142L1141 76H947Z" fill="#ffffff" />
                <path d="M905 226H1167L1168 234H904Z" fill="#7c90aa" />
                <path
                  d="M948 68H1142L1168 234H904Z"
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity="0.78"
                  strokeWidth="1.6"
                />
              </motion.g>
            </g>
          </g>

          {/* RIGHT WING (TEAM B — Cobalt-Azure Crystal, Mirrored Mechanical Unfold) */}
          <g clipPath="url(#reveal-right-half)">
            <g id="right-wing">
              <motion.g
                initial={{ x: -860, opacity: 0 }}
                animate={animationCommand === 'OUT' ? { x: -860, opacity: 0 } : { x: 0, opacity: 1 }}
                transition={{ duration: 0.96, delay: animationCommand === 'OUT' ? 0 : 0.44, ease: [0.42, 0, 0.25, 1] }}
              >
                <g transform={`translate(${VIEWBOX_WIDTH} 0) scale(-1 1)`}>
                  <use href="#turbo-wing-frame" />
                  <path d="M44 68H942L898 234H108L72 200Z" fill="url(#turbo-blue)" />
                  <use href="#turbo-wing-detail" />
                  <path d="M109 226H899L898 234H108Z" fill="#60a8ff" opacity="0.95" />
                </g>
              </motion.g>

              {/* RIGHT SCORE PLATE — Tier-1 Mirrored Slide-Out & Interlock */}
              <motion.g
                id="right-score-plate"
                initial={{ x: -240, opacity: 0 }}
                animate={animationCommand === 'OUT' ? { x: -240, opacity: 0 } : { x: 0, opacity: 1 }}
                transition={{ duration: 0.72, delay: animationCommand === 'OUT' ? 0 : 0.3, ease: [0.42, 0, 0.25, 1] }}
              >
                <path
                  d="M1414 65H1620L1664 239H1388Z"
                  fill="#070c16"
                  fillOpacity="0.97"
                />
                <path d="M1418 68H1612L1656 234H1392Z" fill="url(#turbo-silver)" />
                <g clipPath="url(#turbo-score-clip-right)">
                  <path
                    d="M1418 68H1612L1622 118C1568 106 1480 104 1424 114Z"
                    fill="#ffffff"
                    opacity="0.44"
                  />
                  <path
                    d="M1494 68H1538L1620 234H1576Z"
                    fill="#ffffff"
                    opacity="0.22"
                  />
                </g>
                <path d="M1418 68H1612L1613 76H1419Z" fill="#ffffff" />
                <path d="M1393 226H1655L1656 234H1392Z" fill="#7c90aa" />
                <path
                  d="M1418 68H1612L1656 234H1392Z"
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity="0.78"
                  strokeWidth="1.6"
                />
              </motion.g>
            </g>
          </g>

          {/* CENTRAL SHIELD (Core Armor Drop & Smooth Mechanical Lock-In) */}
          <motion.g
            id="central-shield"
            initial={{ opacity: 0, y: -52, scale: 0.74 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.72, ease: [0.42, 0, 0.25, 1] }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          >
            {/* Deep Outer Drop Shadow */}
            <path
              d="M1174 20H1386L1426 52L1442 74L1416 248L1366 302L1280 336L1194 302L1144 248L1118 74L1134 52Z"
              fill="#04070d"
              fillOpacity="0.94"
            />
            {/* Brushed Titanium Shield Perimeter */}
            <path
              d="M1174 12H1386L1422 46L1436 68L1410 244L1362 296L1280 328L1198 296L1150 244L1124 68L1138 46Z"
              fill="url(#turbo-frame)"
              stroke="#dbeafe"
              strokeOpacity="0.54"
              strokeWidth="2"
            />
            {/* Inner Dark Recessed Basin */}
            <path
              d="M1180 22H1380L1412 50L1422 72L1398 238L1354 286L1280 316L1206 286L1162 238L1138 72L1148 50Z"
              fill="#090e17"
              fillOpacity="0.97"
            />
            {/* Swept Chrome-Glass Crown Header Visor Plate */}
            <path
              d="M1182 25H1378L1406 48L1386 64H1174L1154 48Z"
              fill="#233044"
              fillOpacity="0.98"
              stroke="#ffffff"
              strokeOpacity="0.4"
              strokeWidth="1.2"
            />
            <path
              d="M1184 26H1376L1390 40H1170Z"
              fill="#ffffff"
              opacity="0.18"
            />
            {/* Shield Core Obsidian Carbon-Glass Face */}
            <path
              d="M1160 74H1400L1384 236L1346 274L1280 300L1214 274L1176 236Z"
              fill="url(#turbo-dark)"
              stroke="#ffffff"
              strokeOpacity="0.26"
              strokeWidth="1.5"
            />
            {/* Carbon Hex Weave Texture Inside Shield Core */}
            <path
              d="M1160 74H1400L1384 236L1346 274L1280 300L1214 274L1176 236Z"
              fill="url(#turbo-carbon-hex)"
            />
            {/* Subtle Kabaddi Mat Arc Watermark Graphics Inside Shield */}
            <g clipPath="url(#turbo-shield-clip)" opacity="0.1">
              <circle
                cx="1280"
                cy="168"
                r="82"
                fill="none"
                stroke="#f8fafc"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
              <circle
                cx="1280"
                cy="168"
                r="62"
                fill="none"
                stroke="#fde047"
                strokeWidth="1"
              />
              <path d="M1160 168H1208M1352 168H1400" stroke="#ffffff" strokeWidth="1.2" />
            </g>
            {/* Warm Gold Inner Ambient Caustic */}
            <path
              d="M1160 74H1400L1384 236L1346 274L1280 300L1214 274L1176 236Z"
              fill="url(#turbo-shield-caustic)"
              opacity={isDoOrDie ? '0.94' : '0.72'}
            />
            {/* Crisp Crystal Reflection Over Shield Core */}
            <g clipPath="url(#turbo-shield-clip)">
              <path
                d="M1160 74H1400L1392 124C1322 108 1238 110 1168 127Z"
                fill="url(#turbo-gloss-shield)"
              />
              <path
                d="M1168 127C1238 110 1322 108 1392 124"
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.22"
                strokeWidth="1.2"
              />
            </g>

            {/* Symmetrical Ruby & Sapphire Crystal Edge Blades — Smooth Unfold on Lock-In */}
            <motion.g
              initial={{ x: 28, y: -14, opacity: 0 }}
              animate={{ x: 0, y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4, ease: [0.42, 0, 0.25, 1] }}
            >
              <path d="M1134 74L1154 86L1172 232L1158 242Z" fill="#e11d48" />
              <path d="M1136 76L1153 86L1161 148L1146 138Z" fill="#ffffff" opacity="0.38" />
            </motion.g>
            <motion.g
              initial={{ x: -28, y: -14, opacity: 0 }}
              animate={{ x: 0, y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4, ease: [0.42, 0, 0.25, 1] }}
            >
              <path d="M1426 74L1406 86L1388 232L1402 242Z" fill="#2563eb" />
              <path d="M1424 76L1407 86L1399 148L1414 138Z" fill="#ffffff" opacity="0.38" />
            </motion.g>

            {/* Precision Corner HUD Ticks Inside Shield */}
            <path
              d="M1182 94H1198M1182 94V110M1378 94H1362M1378 94V110"
              stroke="#94a3b8"
              strokeOpacity="0.45"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* Steady Illuminated Inner Shield Trim During Live Raid */}
            <motion.path
              d="M1160 74H1400L1384 236L1346 274L1280 300L1214 274L1176 236Z"
              fill="none"
              stroke={isCriticalRaidTime ? '#fb7185' : '#fde047'}
              strokeWidth={isRaidClockRunning ? '2' : '1.2'}
              animate={
                isRaidClockRunning
                  ? { opacity: [0.36, 0.74, 0.36] }
                  : { opacity: 0.26 }
              }
              transition={
                isRaidClockRunning
                  ? { duration: isCriticalRaidTime ? 0.9 : 2.2, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.25 }
              }
            />

            {/* Precision Symmetrical Crystal Raid Countdown Track */}
            <g>
              <rect
                x="1190"
                y="244"
                width={progressBarMaxWidth + 8}
                height="9"
                rx="4.5"
                fill="#060a12"
                stroke="#475569"
                strokeOpacity="0.72"
                strokeWidth="1.1"
              />
              {progressBarWidth > 0 && (
                <g clipPath="url(#turbo-bar-active-clip)">
                  <motion.rect
                    y="245.5"
                    height="6"
                    rx="3"
                    initial={false}
                    animate={{
                      x: 1280 - progressBarWidth / 2,
                      width: progressBarWidth,
                    }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    fill={
                      isCriticalRaidTime || (isDoOrDie && raidRatio <= 0.35)
                        ? 'url(#turbo-urgent)'
                        : 'url(#turbo-gold-h)'
                    }
                    style={{
                      filter: isCriticalRaidTime
                        ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.72))'
                        : 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.5))',
                    }}
                  />
                </g>
              )}
              <path
                d="M1214 245V252M1247 245V252M1280 244.5V252.5M1313 245V252M1346 245V252"
                stroke="#0f172a"
                strokeOpacity="0.55"
                strokeWidth="1"
              />
            </g>

            {/* Lower Crest Gold Bevel Trim */}
            <path
              d="M1176 266L1214 290L1280 312L1346 290L1384 266L1362 296L1280 322L1198 296Z"
              fill="url(#turbo-gold)"
              opacity="0.96"
            />
            <path
              d="M1172 67H1388"
              stroke="#ffffff"
              strokeOpacity="0.62"
              strokeWidth="1.5"
            />
          </motion.g>

          {/* ENERGON IGNITION LOCK-IN FLASH + SMOOTH PERIODIC CRYSTAL SWEEP */}
          <g clipPath="url(#turbo-full-glass-clip)" pointerEvents="none" opacity="0.72">
            <g transform="skewX(-18)">
              <motion.rect
                x="-380"
                y="-20"
                width="320"
                height="380"
                fill="url(#turbo-sheen)"
                initial={{ x: -380 }}
                animate={{ x: 3080 }}
                transition={{
                  delay: 1.3,
                  duration: 1.0,
                  ease: 'easeInOut',
                }}
              />
              <motion.rect
                x="-380"
                y="-20"
                width="300"
                height="380"
                fill="url(#turbo-sheen)"
                animate={{ x: [-380, 3080] }}
                transition={{
                  delay: 5.8,
                  duration: 1.75,
                  repeat: Infinity,
                  repeatDelay: 4.5,
                  ease: 'easeInOut',
                }}
              />
            </g>
          </g>

          {/* WIDE TEAM NAMES — LOCK INTO DEPLOYED WINGS */}
          <g
            id="team-names"
            fontFamily="'Barlow Condensed', 'Plus Jakarta Sans', Arial, sans-serif"
            fontWeight="800"
            fontStyle="italic"
            fill="white"
            textAnchor="middle"
          >
            <motion.text
              id="team-a-name"
              x="518"
              y={Math.round(151 + sizeA * 0.34)}
              fontSize={sizeA}
              letterSpacing="1.4"
              initial={{ opacity: 0, x: 110 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.56, delay: 0.96, ease: [0.42, 0, 0.25, 1] }}
              style={{
                filter: 'drop-shadow(0 3px 8px rgba(0, 0, 0, 0.56))',
              }}
            >
              {teamA.name.toUpperCase()}
            </motion.text>
            <motion.text
              id="team-b-name"
              x="2042"
              y={Math.round(151 + sizeB * 0.34)}
              fontSize={sizeB}
              letterSpacing="1.4"
              initial={{ opacity: 0, x: -110 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.56, delay: 0.96, ease: [0.42, 0, 0.25, 1] }}
              style={{
                filter: 'drop-shadow(0 3px 8px rgba(0, 0, 0, 0.56))',
              }}
            >
              {teamB.name.toUpperCase()}
            </motion.text>
          </g>

          {/* ISOLATED UNCLIPPED SCORES WITH ( /   \ ) MIRROR SLOPES & MECHANICAL LOCK-IN */}
          <motion.g
            id="scores"
            fill="#0e1726"
            fontFamily="'Barlow Condensed', 'Plus Jakarta Sans', Arial, sans-serif"
            fontWeight="800"
            fontStyle="normal"
            textAnchor="middle"
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.54, delay: 0.82, ease: [0.42, 0, 0.25, 1] }}
            style={{
              transformBox: 'fill-box',
              transformOrigin: 'center',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <motion.text
              key={`A-${formattedScoreA}`}
              id="team-a-score"
              x="1030"
              y={Math.round(151 + scoreSizeA * 0.35)}
              fontSize={scoreSizeA}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              initial={{ opacity: 1, scale: 1.14 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              {formattedScoreA}
            </motion.text>
            <motion.text
              key={`B-${formattedScoreB}`}
              id="team-b-score"
              x="1530"
              y={Math.round(151 + scoreSizeB * 0.35)}
              fontSize={scoreSizeB}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              initial={{ opacity: 1, scale: 1.14 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              {formattedScoreB}
            </motion.text>
          </motion.g>

          {/* HIGH-CONTRAST ON-MAT PLAYER COUNT DESIGN — DROP-LOCK TRAYS */}
          <motion.g
            id="player-counts"
            initial={{ opacity: 0, y: -32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.54, delay: 1.08, ease: [0.42, 0, 0.25, 1] }}
          >
            {/* Team A Tray */}
            <g>
              <path
                d="M210 249H356L366 266L356 283H210L200 266Z"
                fill="#0b111e"
                stroke="#ff4d6d"
                strokeOpacity="0.82"
                strokeWidth="1.5"
              />
              <path
                d="M210 249H224L214 266L224 283H210L200 266Z"
                fill="url(#turbo-pip-red)"
              />
              <text
                x="234"
                y="272"
                fontSize="17"
                fontFamily="'Plus Jakarta Sans', Arial, sans-serif"
                fontWeight="800"
                letterSpacing="1.8"
                fill="#ffffff"
              >
                MAT
              </text>
              <g style={{ filter: 'drop-shadow(0 0 8px rgba(255, 36, 78, 0.52))' }}>
                <path
                  d="M300 252H352L360 266L352 280H300L292 266Z"
                  fill="url(#turbo-pip-red)"
                  stroke="#ff8fa3"
                  strokeOpacity="0.9"
                  strokeWidth="1.2"
                />
                <path
                  d="M302 253.5H350"
                  stroke="#ffffff"
                  strokeOpacity="0.58"
                  strokeWidth="1.1"
                />
              </g>
              <text
                id="team-a-players"
                x="326"
                y="275"
                fontSize="26"
                fontFamily="'Plus Jakarta Sans', Arial, sans-serif"
                fontWeight="800"
                fontStyle="normal"
                textAnchor="middle"
                fill="#ffffff"
                style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.45))' }}
              >
                {teamA.onMat}
              </text>
            </g>
            <g transform="translate(388 256)">
              {[0, 1, 2, 3, 4, 5, 6].map((idx) => {
                const active = idx < teamA.onMat;
                const xOff = idx * 64;
                return (
                  <motion.g
                    key={idx}
                    initial={false}
                    animate={active ? { opacity: 1, scale: 1 } : { opacity: 0.48, scale: 0.94 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      transformBox: 'fill-box',
                      transformOrigin: 'center',
                      filter: active ? 'drop-shadow(0 0 7px rgba(255, 36, 78, 0.56))' : 'none',
                    }}
                  >
                    <path
                      d={`M${xOff + 7} 0H${xOff + 53}L${xOff + 46} 20H${xOff}Z`}
                      fill={active ? 'url(#turbo-pip-red)' : '#0a101b'}
                      fillOpacity={active ? 1 : 0.95}
                      stroke={active ? '#ff8fa3' : '#334155'}
                      strokeOpacity={active ? 0.92 : 0.45}
                      strokeWidth="1.2"
                    />
                    {active ? (
                      <>
                        <path
                          d={`M${xOff + 8} 1.6H${xOff + 50}`}
                          stroke="#ffffff"
                          strokeOpacity="0.68"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                        <path
                          d={`M${xOff + 2} 18.6H${xOff + 44}`}
                          stroke="#4c0519"
                          strokeOpacity="0.55"
                          strokeWidth="1.1"
                          strokeLinecap="round"
                        />
                      </>
                    ) : (
                      <path
                        d={`M${xOff + 18} 10H${xOff + 35}`}
                        stroke="#475569"
                        strokeOpacity="0.6"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    )}
                  </motion.g>
                );
              })}
            </g>

            {/* Team B Tray (Exact Mirror) */}
            <g>
              <path
                d="M2204 249H2350L2360 266L2350 283H2204L2194 266Z"
                fill="#0b111e"
                stroke="#38bdf8"
                strokeOpacity="0.82"
                strokeWidth="1.5"
              />
              <path
                d="M2336 249H2350L2360 266L2350 283H2336L2346 266Z"
                fill="url(#turbo-pip-blue)"
              />
              <text
                x="2326"
                y="272"
                fontSize="17"
                fontFamily="'Plus Jakarta Sans', Arial, sans-serif"
                fontWeight="800"
                letterSpacing="1.8"
                textAnchor="end"
                fill="#ffffff"
              >
                MAT
              </text>
              <g style={{ filter: 'drop-shadow(0 0 8px rgba(36, 138, 255, 0.52))' }}>
                <path
                  d="M2208 252H2260L2268 266L2260 280H2208L2200 266Z"
                  fill="url(#turbo-pip-blue)"
                  stroke="#7dd3fc"
                  strokeOpacity="0.9"
                  strokeWidth="1.2"
                />
                <path
                  d="M2210 253.5H2258"
                  stroke="#ffffff"
                  strokeOpacity="0.58"
                  strokeWidth="1.1"
                />
              </g>
              <text
                id="team-b-players"
                x="2234"
                y="275"
                fontSize="26"
                fontFamily="'Plus Jakarta Sans', Arial, sans-serif"
                fontWeight="800"
                fontStyle="normal"
                textAnchor="middle"
                fill="#ffffff"
                style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.45))' }}
              >
                {teamB.onMat}
              </text>
            </g>
            <g transform="translate(1736 256)">
              {[0, 1, 2, 3, 4, 5, 6].map((idx) => {
                const active = idx < teamB.onMat;
                const xOff = (6 - idx) * 64;
                return (
                  <motion.g
                    key={idx}
                    initial={false}
                    animate={active ? { opacity: 1, scale: 1 } : { opacity: 0.48, scale: 0.94 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      transformBox: 'fill-box',
                      transformOrigin: 'center',
                      filter: active ? 'drop-shadow(0 0 7px rgba(36, 138, 255, 0.56))' : 'none',
                    }}
                  >
                    <path
                      d={`M${xOff} 0H${xOff + 46}L${xOff + 53} 20H${xOff + 7}Z`}
                      fill={active ? 'url(#turbo-pip-blue)' : '#0a101b'}
                      fillOpacity={active ? 1 : 0.95}
                      stroke={active ? '#7dd3fc' : '#334155'}
                      strokeOpacity={active ? 0.92 : 0.45}
                      strokeWidth="1.2"
                    />
                    {active ? (
                      <>
                        <path
                          d={`M${xOff + 3} 1.6H${xOff + 45}`}
                          stroke="#ffffff"
                          strokeOpacity="0.68"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                        <path
                          d={`M${xOff + 9} 18.6H${xOff + 51}`}
                          stroke="#082f49"
                          strokeOpacity="0.55"
                          strokeWidth="1.1"
                          strokeLinecap="round"
                        />
                      </>
                    ) : (
                      <path
                        d={`M${xOff + 18} 10H${xOff + 35}`}
                        stroke="#475569"
                        strokeOpacity="0.6"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    )}
                  </motion.g>
                );
              })}
            </g>
          </motion.g>

          {/* CENTRAL MATCH STATE: HALF & HUGE HEROIC SOLID-OPACITY RAID TIMER */}
          <motion.g
            id="match-state"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={animationCommand === 'OUT' ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }}
            transition={{ duration: 0.52, delay: animationCommand === 'OUT' ? 0 : 0.38, ease: [0.42, 0, 0.25, 1] }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          >
            <text
              id="half-label"
              x="1280"
              y="52"
              fontSize="21"
              textAnchor="middle"
              fontFamily="'Plus Jakarta Sans', Arial, sans-serif"
              fontWeight="700"
              letterSpacing="3"
              fill="#f8fafc"
            >
              {halfLabel}
            </text>
            <g clipPath="url(#turbo-timer-slot-clip)">
              <motion.text
                key={formattedRaid}
                id="raid-timer"
                x="1280"
                y="214"
                fontSize="144"
                textAnchor="middle"
                fontFamily="'Barlow Condensed', Arial, sans-serif"
                fontWeight="800"
                fontStyle="italic"
                fill={
                  isCriticalRaidTime || (isDoOrDie && raidRatio <= 0.35)
                    ? 'url(#turbo-urgent)'
                    : 'url(#turbo-gold)'
                }
                style={{
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                  filter: isCriticalRaidTime
                    ? 'drop-shadow(0 6px 20px rgba(239, 68, 68, 0.58))'
                    : 'drop-shadow(0 6px 18px rgba(255, 198, 52, 0.38))',
                }}
                initial={{ opacity: 1, scale: 1.04 }}
                animate={
                  isCriticalRaidTime
                    ? { opacity: 1, scale: [1.05, 1, 1.05] }
                    : { opacity: 1, scale: 1 }
                }
                transition={
                  isCriticalRaidTime
                    ? { duration: 0.65, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.14, ease: [0.22, 1, 0.36, 1] }
                }
              >
                {formattedRaid}
              </motion.text>
            </g>
            {isSuperTackle && (
              <motion.text
                x="1280"
                y="279"
                fontSize="13"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', Arial, sans-serif"
                fontWeight="700"
                letterSpacing="2.4"
                fill="#fde047"
                animate={{ opacity: [0.75, 1, 0.75] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                SUPER TACKLE
              </motion.text>
            )}
            {!isSuperTackle && isDoOrDie && (
              <motion.text
                x="1280"
                y="279"
                fontSize="13"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', Arial, sans-serif"
                fontWeight="700"
                letterSpacing="2.4"
                fill="#fb7185"
                animate={{ opacity: [0.75, 1, 0.75] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
              >
                DO OR DIE
              </motion.text>
            )}
          </motion.g>
        </svg>
      </motion.div>
    </motion.div>
  );
}
