import React from 'react';

interface SvMediaLogoProps {
  uid: string;
  transform?: string;
}

/**
 * Pure vector SVG recreation of the glossy 3D "SV MEDIA" broadcast emblem.
 * Uses pure geometricPrecision vectors (no offscreen filter rasterization on foreground glyphs)
 * for razor-sharp, 8x-MSAA-grade sub-pixel anti-aliasing at any scale.
 */
export const SvMediaLogo: React.FC<SvMediaLogoProps> = ({ uid, transform }) => {
  // Deep aerospace navy backing plate behind S, V, and MEDIA (x: 18..520, y: 10..102)
  const platePath =
    'M 64 10 L 204 10 Q 212 10 218 16 L 226 23 Q 231 26 238 26 L 510 26 Q 519 26 516 35 L 490 94 Q 486 102 475 102 L 18 102 L 34 78 Z';

  // Wide, sweeping 3D chrome S (x: 8..148, y: 10..102)
  const sPath =
    'M 148 10 ' +
    'L 130 31 ' +
    'L 66 31 ' +
    'C 54 31, 52 44, 65 44 ' +
    'L 108 44 ' +
    'C 134 44, 141 61, 134 80 ' +
    'C 127 95, 110 102, 86 102 ' +
    'L 8 102 ' +
    'L 29 78 ' +
    'L 96 78 ' +
    'C 108 78, 110 65, 97 65 ' +
    'L 52 65 ' +
    'C 33 65, 24 54, 27 38 ' +
    'C 30 22, 42 10, 68 10 ' +
    'Z';

  // Wide, glossy interlocking crimson V (x: 118..244, y: 10..102)
  const vPath =
    'M 118 10 L 148 10 L 174 67 L 207 10 L 244 10 L 198 102 L 148 102 Z';

  // Wide extended geometric MEDIA wordmark (upright 0..265 x 0..46, uniformly sheared by skewX(-18))
  const mediaPath =
    // M (0..56)
    'M 0 46 L 0 0 L 14.5 0 L 28 24 L 41.5 0 L 56 0 L 56 46 L 45 46 L 45 14 L 31.5 36 L 24.5 36 L 11 14 L 11 46 Z ' +
    // E (68..114)
    'M 68 0 L 114 0 L 114 9.5 L 79 9.5 L 79 18.5 L 108 18.5 L 108 27.5 L 79 27.5 L 79 36.5 L 114 36.5 L 114 46 L 68 46 Z ' +
    // D (126..176)
    'M 126 0 L 152 0 C 168 0, 176 8, 176 23 C 176 38, 168 46, 152 46 L 126 46 Z ' +
    'M 137 9.5 L 137 36.5 L 151 36.5 C 160.5 36.5, 165 31.5, 165 23 C 165 14.5, 160.5 9.5, 151 9.5 Z ' +
    // I (188..201)
    'M 188 0 L 201 0 L 201 46 L 188 46 Z ' +
    // A (211..265)
    'M 231 0 L 245 0 L 265 46 L 252.5 46 L 248.5 37 L 227.5 37 L 223.5 46 L 211 46 Z ' +
    'M 238 11 L 231 28 L 245 28 Z';

  return (
    <g transform={transform} shapeRendering="geometricPrecision">
      <defs>
        {/* Backing plate deep aerospace navy gradient */}
        <linearGradient id={`${uid}-sv2-plate`} x1="0%" y1="0%" x2="8%" y2="100%">
          <stop offset="0%" stopColor="#1b3c72" />
          <stop offset="28%" stopColor="#0b1b36" />
          <stop offset="76%" stopColor="#050e1f" />
          <stop offset="100%" stopColor="#02050d" />
        </linearGradient>

        {/* Top steel-blue specular rim */}
        <linearGradient id={`${uid}-sv2-top-rim`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
          <stop offset="28%" stopColor="#bae6fd" stopOpacity="0.95" />
          <stop offset="46%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="76%" stopColor="#7dd3fc" stopOpacity="0.88" />
          <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.4" />
        </linearGradient>

        {/* Bottom glossy crimson rail */}
        <linearGradient id={`${uid}-sv2-bottom-red`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#991b1b" />
          <stop offset="28%" stopColor="#dc2626" />
          <stop offset="52%" stopColor="#ff3b47" />
          <stop offset="60%" stopColor="#ffb8bd" />
          <stop offset="68%" stopColor="#ff2432" />
          <stop offset="88%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>

        {/* Crimson hotspot flare */}
        <radialGradient id={`${uid}-sv2-flare`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
          <stop offset="28%" stopColor="#ff4d57" stopOpacity="0.85" />
          <stop offset="65%" stopColor="#ff1e2d" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ff1e2d" stopOpacity="0" />
        </radialGradient>

        {/* Brushed 3D chrome fill for S and MEDIA */}
        <linearGradient id={`${uid}-sv2-chrome`} x1="0%" y1="0%" x2="10%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="26%" stopColor="#f1f5f9" />
          <stop offset="52%" stopColor="#cbd5e1" />
          <stop offset="72%" stopColor="#f8fafc" />
          <stop offset="90%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        {/* Soft diagonal gloss sheen for S */}
        <linearGradient id={`${uid}-sv2-s-sheen`} x1="0%" y1="0%" x2="65%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="38%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="52%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="72%" stopColor="#0f172a" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.24" />
        </linearGradient>

        {/* Deep glossy crimson gradient for V */}
        <linearGradient id={`${uid}-sv2-red`} x1="10%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#ff404c" />
          <stop offset="34%" stopColor="#e11d2a" />
          <stop offset="64%" stopColor="#b91c1c" />
          <stop offset="86%" stopColor="#991b1b" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>

        {/* Soft diagonal specular band across V */}
        <linearGradient id={`${uid}-sv2-v-gloss`} x1="15%" y1="0%" x2="75%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="36%" stopColor="#ffffff" stopOpacity="0.54" />
          <stop offset="48%" stopColor="#fecaca" stopOpacity="0.22" />
          <stop offset="62%" stopColor="#450a0a" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ff2432" stopOpacity="0.12" />
        </linearGradient>

        <clipPath id={`${uid}-sv2-s-clip`}>
          <path d={sPath} />
        </clipPath>
        <clipPath id={`${uid}-sv2-v-clip`}>
          <path d={vPath} />
        </clipPath>
      </defs>

      {/* Pure-Vector Ambient Crimson Underglow beneath bottom light rail */}
      <ellipse cx="350" cy="103" rx="135" ry="9" fill={`url(#${uid}-sv2-flare)`} opacity="0.52" />

      {/* Dark Navy Metallic Backing Plate */}
      <path
        d={platePath}
        fill={`url(#${uid}-sv2-plate)`}
        stroke="#02050c"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* Top Specular Ice-Blue & Chrome Rim */}
      <path
        d="M 232 26.5 L 511 26.5"
        fill="none"
        stroke={`url(#${uid}-sv2-top-rim)`}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M 66 10.8 L 204 10.8"
        fill="none"
        stroke="#94a3b8"
        strokeOpacity="0.55"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Bottom Glossy Crimson Rail + Central Flare */}
      <path
        d="M 148 96 L 486 96 L 481 102 L 148 102 Z"
        fill={`url(#${uid}-sv2-bottom-red)`}
      />
      <ellipse cx="352" cy="99" rx="48" ry="5" fill={`url(#${uid}-sv2-flare)`} />

      {/* Pure-Vector Anti-Aliased Brushed Chrome MEDIA Wordmark */}
      <g transform="translate(239.2, 42.4) skewX(-18)">
        <path d={mediaPath} fill="#020617" fillOpacity="0.42" fillRule="evenodd" />
      </g>
      <g transform="translate(238.1, 41.2) skewX(-18)">
        <path d={mediaPath} fill="#020617" fillOpacity="0.72" fillRule="evenodd" />
      </g>
      <g transform="translate(237, 40) skewX(-18)">
        <path
          d={mediaPath}
          fill={`url(#${uid}-sv2-chrome)`}
          fillRule="evenodd"
        />
      </g>

      {/* Pure-Vector Anti-Aliased Glossy 3D Crimson V */}
      <g transform="translate(3.2, 3.6)">
        <path d={vPath} fill="#020617" fillOpacity="0.45" />
      </g>
      <g transform="translate(1.8, 2.0)">
        <path d={vPath} fill="#020617" fillOpacity="0.78" />
      </g>
      <path d={vPath} fill={`url(#${uid}-sv2-red)`} />
      <path
        d={vPath}
        fill={`url(#${uid}-sv2-v-gloss)`}
        clipPath={`url(#${uid}-sv2-v-clip)`}
      />
      <path
        d="M 148 10.6 L 174 67 L 207 10.6 L 243 10.6 M 149 100.5 L 197 100.5 L 243 11"
        fill="none"
        stroke="#fecaca"
        strokeOpacity="0.58"
        strokeWidth="2.2"
        strokeLinejoin="round"
        clipPath={`url(#${uid}-sv2-v-clip)`}
      />

      {/* Pure-Vector Anti-Aliased Sculpted 3D Brushed Chrome S */}
      <g transform="translate(3.8, 4.2)">
        <path d={sPath} fill="#020617" fillOpacity="0.48" />
      </g>
      <g transform="translate(2.1, 2.3)">
        <path d={sPath} fill="#020617" fillOpacity="0.82" />
      </g>
      <path d={sPath} fill={`url(#${uid}-sv2-chrome)`} />
      <path
        d={sPath}
        fill={`url(#${uid}-sv2-s-sheen)`}
        clipPath={`url(#${uid}-sv2-s-clip)`}
      />
      <path
        d={sPath}
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.45"
        strokeWidth="2.2"
        strokeLinejoin="round"
        clipPath={`url(#${uid}-sv2-s-clip)`}
      />
    </g>
  );
};
