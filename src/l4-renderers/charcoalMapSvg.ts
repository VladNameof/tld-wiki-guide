import { DIFFICULTY_BY_ID, MAP_CANVAS_SIZE } from '../l0-primitives/constants.ts';
import type {
  BuildingAmenityKind,
  CanvasDetailLayers,
  DifficultyId,
  MapMicroSpawnKind,
  MapPathKind,
  MapThemeId,
  RegionModel,
} from '../l0-primitives/types.ts';
import type {
  ResolvedBuildingItem,
  ResolvedRegionCartography,
  ResolvedRopeItem,
} from '../l2-models/selectors.ts';
import { ATLAS_LEGEND_GROUPS } from './atlasLegendCatalog.ts';

/**
 * Точные границы Leaflet L.imageOverlay для L.CRS.Simple:
 * Игровое поле [0..1000, 0..1000] остаётся строго 1:1 для всех маркеров и заметок,
 * рамка линейки (100..2000 м) занимает поля [-36..0] и [1000..1036],
 * а полная 7-колоночная легенда атласа расположена ниже южной границы (lat -170..0).
 */
export const MAP_SVG_LEAFLET_BOUNDS: readonly [
  readonly [number, number],
  readonly [number, number],
] = [
  [-170, -36],
  [1036, 1036],
];

const FAUNA_KINDS: ReadonlySet<MapMicroSpawnKind> = new Set([
  'wolf',
  'timberwolf',
  'bear',
  'moose',
  'cougar',
  'deer',
  'rabbit',
  'ptarmigan',
  'carcass',
  'corpse',
]);

const FLORA_KINDS: ReadonlySet<MapMicroSpawnKind> = new Set([
  'reishi',
  'rosehip',
  'lichen',
  'cattail',
  'burdock',
  'acorns',
  'maple',
  'birch',
]);

function toSvgY(mapY: number): number {
  return MAP_CANVAS_SIZE - mapY;
}

function escSvg(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pointsToSvgPath(
  points: readonly (readonly [number, number])[],
  closed = false,
): string {
  if (points.length === 0) return '';
  const parts = points.map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'} ${x} ${toSvgY(y)}`);
  if (closed) parts.push('Z');
  return parts.join(' ');
}

function deterministicSeed(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/**
 * Бергштрихи скального обрыва вдоль ломаной линии.
 */
function buildCliffHachures(
  points: readonly (readonly [number, number])[],
  color: string,
  closed = false,
): string {
  const ticks: string[] = [];
  const total = closed ? points.length : points.length - 1;
  for (let i = 0; i < total; i++) {
    const p1 = points[i]!;
    const p2 = points[(i + 1) % points.length]!;
    const x1 = p1[0];
    const y1 = toSvgY(p1[1]);
    const x2 = p2[0];
    const y2 = toSvgY(p2[1]);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 12) continue;

    const nx = -dy / len;
    const ny = dx / len;
    const steps = Math.max(2, Math.floor(len / 20));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const bx = x1 + dx * t;
      const by = y1 + dy * t;
      const tickLen = s % 2 === 0 ? 9 : 5.5;
      ticks.push(
        `<line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${(bx + nx * tickLen).toFixed(1)}" y2="${(by + ny * tickLen).toFixed(1)}" stroke="${color}" stroke-width="1.4" stroke-linecap="round" opacity="0.68" />`,
      );
    }
  }
  return ticks.join('');
}

function buildPowerlinePoles(
  points: readonly (readonly [number, number])[],
  color: string,
): string {
  const poles: string[] = [];
  for (let i = 0; i < points.length; i++) {
    const pt = points[i]!;
    const px = pt[0];
    const py = toSvgY(pt[1]);
    poles.push(`
      <g transform="translate(${px}, ${py})" stroke="${color}" stroke-width="1.5" fill="none" opacity="0.9">
        <line x1="0" y1="-6.5" x2="0" y2="5.5" />
        <line x1="-4.5" y1="-3.5" x2="4.5" y2="-3.5" />
        <circle cx="0" cy="0" r="2" fill="${color}" />
      </g>
    `);
  }
  return poles.join('');
}

/**
 * Рендерит дорожную и тропиночную сеть, ж/д полотно, мосты, брёвна, водопады, изгороди и маршрут Незваного гостя.
 */
function renderExtraPath(
  kind: MapPathKind,
  points: readonly (readonly [number, number])[],
  isCharcoal: boolean,
): string {
  const d = pointsToSvgPath(points, false);
  if (!d) return '';

  const roadCurb = isCharcoal ? '#2b241d' : '#cbd5e1';
  const roadInner = isCharcoal ? '#f3ede0' : '#263a4d';
  const trailInk = isCharcoal ? '#3d3126' : '#e2e8f0';
  const goatInk = isCharcoal ? '#6e563a' : '#94a3b8';

  switch (kind) {
    case 'highway':
      return `
        <path d="${d}" fill="none" stroke="${roadCurb}" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9" />
        <path d="${d}" fill="none" stroke="${roadInner}" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="${d}" fill="none" stroke="${roadCurb}" stroke-width="1.3" stroke-dasharray="7 6" stroke-linecap="round" opacity="0.85" />
      `;
    case 'dirt_road':
      return `
        <path d="${d}" fill="none" stroke="${roadCurb}" stroke-width="5.2" stroke-dasharray="9 5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7" />
        <path d="${d}" fill="none" stroke="${roadInner}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.78" />
      `;
    case 'railway':
      return `
        <path d="${d}" fill="none" stroke="${roadCurb}" stroke-width="6.8" opacity="0.92" />
        <path d="${d}" fill="none" stroke="${roadInner}" stroke-width="4.4" stroke-dasharray="6.5 6.5" opacity="0.95" />
      `;
    case 'trail':
      return `
        <path d="${d}" fill="none" stroke="${trailInk}" stroke-width="2.2" stroke-dasharray="5.5 4.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.88" />
      `;
    case 'goat_path':
      return `
        <path d="${d}" fill="none" stroke="${goatInk}" stroke-width="2" stroke-dasharray="2 4.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9" />
      `;
    case 'bridge':
      return `
        <path d="${d}" fill="none" stroke="${roadCurb}" stroke-width="11.5" stroke-linecap="butt" />
        <path d="${d}" fill="none" stroke="${isCharcoal ? '#d8b482' : '#fbbf24'}" stroke-width="7.2" stroke-linecap="butt" />
        <path d="${d}" fill="none" stroke="${roadCurb}" stroke-width="7.2" stroke-dasharray="2 3.8" opacity="0.45" />
      `;
    case 'log_bridge':
      return `
        <path d="${d}" fill="none" stroke="#231910" stroke-width="6.4" stroke-linecap="round" />
        <path d="${d}" fill="none" stroke="#8c5828" stroke-width="4.2" stroke-linecap="round" />
      `;
    case 'waterfall': {
      const p1 = points[0];
      const p2 = points[points.length - 1];
      const mx = p1 && p2 ? (p1[0] + p2[0]) / 2 : 0;
      const my = p1 && p2 ? toSvgY((p1[1] + p2[1]) / 2) : 0;
      return `
        <path d="${d}" fill="none" stroke="#0284c7" stroke-width="8.5" stroke-linecap="round" opacity="0.85" />
        <path d="${d}" fill="none" stroke="#e0f2fe" stroke-width="4.5" stroke-dasharray="3 3" stroke-linecap="round" />
        <text x="${mx.toFixed(1)}" y="${(my - 6).toFixed(1)}" text-anchor="middle" fill="${isCharcoal ? '#0369a1' : '#7dd3fc'}" font-family="Oswald, sans-serif" font-size="7.2" font-weight="700">ВОДОПАД</text>
      `;
    }
    case 'fence':
      return `
        <path d="${d}" fill="none" stroke="${isCharcoal ? '#4a3c2f' : '#94a3b8'}" stroke-width="1.3" stroke-dasharray="4 3" opacity="0.82" />
      `;
    case 'interloper_route':
      return `
        <path d="${d}" fill="none" stroke="#ea580c" stroke-width="5.2" stroke-dasharray="10 7" stroke-linecap="round" stroke-linejoin="round" opacity="0.38" />
        <path d="${d}" fill="none" stroke="#f59e0b" stroke-width="2.3" stroke-dasharray="10 7" stroke-linecap="round" stroke-linejoin="round" opacity="0.94" />
      `;
  }
}

/**
 * Значки удобств внутри ключевого здания (прямо под рамочной плашкой названия, как на картах Stray Wolf).
 */
function renderAmenityMiniStrip(
  amenities: readonly BuildingAmenityKind[],
  isBurned: boolean,
): string {
  if (amenities.length === 0) return '';
  const visible = isBurned
    ? amenities.filter((a) => a === 'forge' || a === 'fire_barrel' || a === 'stove')
    : amenities;
  if (visible.length === 0) return '';

  const cellW = 12;
  const totalW = visible.length * cellW + 4;
  const startX = -totalW / 2 + cellW / 2 + 2;

  const badges = visible.map((am, idx) => {
    const cx = startX + idx * cellW;
    let glyph = '';
    let bg = '#1e293b';
    switch (am) {
      case 'bed':
        bg = '#0369a1';
        glyph = `<path d="M -3.2 2 V -2 M -3.2 0.6 H 3.2 V 2 M -1.8 -0.8 H 2.2" stroke="#f8fafc" stroke-width="1.1" fill="none" />`;
        break;
      case 'stove':
      case 'fire_barrel':
        bg = '#c2410c';
        glyph = `<path d="M 0 3 C -2.5 3, -3 0, 0 -3.2 C 3 0, 2.5 3, 0 3 Z" fill="#fde68a" />`;
        break;
      case 'workbench':
        bg = '#334155';
        glyph = `<path d="M -2.8 2 H 2.8 M -1.5 2 V -1.2 H 1.5 V 2 M 0 -1.2 V -2.8" stroke="#fbbf24" stroke-width="1.1" fill="none" />`;
        break;
      case 'forge':
        bg = '#7c2d12';
        glyph = `<path d="M -3 2.2 H 3 L 1.8 0 H -1.8 Z M -2.5 0 H 3.2 L 1.8 -2 H -2.5 Z" fill="#fde68a" />`;
        break;
      case 'ammo_bench':
        bg = '#4338ca';
        glyph = `<rect x="-1.6" y="-2.8" width="3.2" height="5.6" rx="1" fill="#fde047" />`;
        break;
      case 'safe':
        bg = '#1e293b';
        glyph = `<circle cx="0" cy="0" r="2.2" fill="none" stroke="#fde047" stroke-width="1.2" />`;
        break;
      case 'first_aid':
        bg = '#b91c1c';
        glyph = `<path d="M 0 -2.4 V 2.4 M -2.4 0 H 2.4" stroke="#ffffff" stroke-width="1.5" />`;
        break;
    }
    return `
      <g transform="translate(${cx.toFixed(1)}, 0)">
        <rect x="-5" y="-4.5" width="10" height="9" rx="1.8" fill="${bg}" stroke="#0f172a" stroke-width="0.8" />
        ${glyph}
      </g>
    `;
  });

  return `<g transform="translate(0, 11.5)">${badges.join('')}</g>`;
}

/**
 * Рендерит отдельную постройку (целую, рандомно повреждённую или сгоревшую в руины в зависимости от выбранной сложности!),
 * а также плашку названия и полоску значков удобств для ключевых ориентиров.
 */
function renderBuildingSvg(b: ResolvedBuildingItem, isCharcoal: boolean): string {
  const sx = b.x;
  const sy = toSvgY(b.y);
  const sc = b.scale ?? 1;
  const rot = b.rotDeg ?? 0;

  const strokeDark = '#18130e';
  const landmarkFill = '#c92a2a';
  const intactFill = isCharcoal ? '#332b24' : '#cbd5e1';
  const ruinColor = isCharcoal ? '#5c4b3e' : '#94a3b8';
  const halo = isCharcoal ? 'rgba(238, 231, 215, 0.94)' : 'rgba(13, 23, 33, 0.94)';

  let iconSvg = '';

  if (b.kind === 'cave') {
    iconSvg = `
      <g transform="scale(${sc})">
        <path d="M -9 7 C -9 -6, 9 -6, 9 7 Z" fill="#14110f" stroke="${isCharcoal ? '#b91c1c' : '#f87171'}" stroke-width="1.8" />
        <path d="M -5 7 C -5 -1, 5 -1, 5 7 Z" fill="#3a322c" />
      </g>
    `;
  } else if (b.kind === 'bunker') {
    iconSvg = `
      <g transform="scale(${sc})">
        <rect x="-7" y="-7" width="14" height="14" rx="2" fill="#1e293b" stroke="#fbbf24" stroke-width="1.8" />
        <line x1="-4" y1="0" x2="4" y2="0" stroke="#fbbf24" stroke-width="1.6" />
        <line x1="0" y1="-4" x2="0" y2="4" stroke="#fbbf24" stroke-width="1.6" />
      </g>
    `;
  } else if (b.kind === 'tower') {
    if (b.state === 'burned_ruin') {
      iconSvg = `
        <g transform="scale(${sc})" stroke="${ruinColor}" stroke-width="1.8" fill="none">
          <path d="M -6 9 L -3 -2 M 6 9 L 2 -4 M -7 9 H 7" />
          <line x1="-5" y1="-5" x2="5" y2="3" stroke="#dc2626" stroke-width="1.6" />
        </g>
      `;
    } else {
      iconSvg = `
        <g transform="scale(${sc})">
          <path d="M -6 10 L -2.5 -6 H 2.5 L 6 10 M -4.5 3 H 4.5 M -5 9 L 3 -1 M 5 9 L -3 -1" stroke="${strokeDark}" stroke-width="1.7" fill="none" />
          <polygon points="-5,-6 0,-12 5,-6" fill="${landmarkFill}" stroke="${strokeDark}" stroke-width="1.2" />
        </g>
      `;
    }
  } else if (b.kind === 'fishing_hut') {
    if (b.state === 'burned_ruin') {
      iconSvg = `
        <g transform="scale(${sc})">
          <path d="M -5 4 H 5 M -4 4 V 0 M 4 4 V 1" stroke="${ruinColor}" stroke-width="1.6" fill="none" />
        </g>
      `;
    } else {
      iconSvg = `
        <g transform="scale(${sc})">
          <rect x="-5.5" y="-4" width="11" height="8" rx="1" fill="${isCharcoal ? '#3f5e75' : '#38bdf8'}" stroke="${strokeDark}" stroke-width="1.4" />
          <line x1="-6.5" y1="-4" x2="6.5" y2="-4" stroke="${strokeDark}" stroke-width="2" />
          ${b.hasStove ? '<circle cx="0" cy="0" r="2" fill="#fb923c" />' : ''}
        </g>
      `;
    }
  } else if (b.kind === 'trailer') {
    if (b.state === 'burned_ruin') {
      iconSvg = `
        <g transform="rotate(${rot}) scale(${sc})">
          <rect x="-9" y="-4" width="18" height="8" fill="none" stroke="${ruinColor}" stroke-width="1.5" stroke-dasharray="3 2" />
          <line x1="-6" y1="-3" x2="6" y2="3" stroke="#dc2626" stroke-width="1.4" />
        </g>
      `;
    } else {
      iconSvg = `
        <g transform="rotate(${rot}) scale(${sc})">
          <rect x="-9.5" y="-4.5" width="19" height="9" rx="1.5" fill="${isCharcoal ? '#415566' : '#93c5fd'}" stroke="${strokeDark}" stroke-width="1.5" />
          <rect x="-6" y="-2" width="3.5" height="3.5" fill="#f8fafc" opacity="0.85" />
          <rect x="2.5" y="-2" width="3.5" height="3.5" fill="#f8fafc" opacity="0.85" />
        </g>
      `;
    }
  } else if (b.kind === 'industrial') {
    iconSvg = `
      <g transform="rotate(${rot}) scale(${sc})">
        <polygon points="-13,8 -13,-3 -6,-8 -6,-3 1,-8 1,-3 8,-8 13,-3 13,8" fill="${landmarkFill}" stroke="${strokeDark}" stroke-width="1.7" stroke-linejoin="round" />
        <rect x="7" y="-13" width="3.5" height="9" fill="${strokeDark}" />
        <rect x="-9" y="1" width="4" height="4" fill="#fde68a" />
        <rect x="-1" y="1" width="4" height="4" fill="#fde68a" />
      </g>
    `;
  } else {
    const fill = b.kind === 'landmark' ? landmarkFill : intactFill;
    if (b.state === 'intact') {
      iconSvg = `
        <g transform="rotate(${rot}) scale(${sc})">
          ${b.hasStove ? `<rect x="3" y="-11" width="3" height="6" fill="${strokeDark}" /><path d="M 4.5 -12 Q 7 -15 4.5 -18" stroke="${isCharcoal ? '#57534e' : '#cbd5e1'}" stroke-width="1.3" fill="none" />` : ''}
          <polygon points="-8,7 -8,-1 0,-8.5 8,-1 8,7" fill="${fill}" stroke="${strokeDark}" stroke-width="1.6" stroke-linejoin="round" />
          <polygon points="-9.5,-0.5 0,-9.5 9.5,-0.5" fill="none" stroke="${strokeDark}" stroke-width="2" stroke-linecap="round" />
          <rect x="-2.2" y="1" width="4.4" height="6" fill="${b.kind === 'landmark' ? '#fde68a' : '#d6cbb8'}" />
        </g>
      `;
    } else if (b.state === 'random_half') {
      iconSvg = `
        <g transform="rotate(${rot}) scale(${sc})">
          <polygon points="-8,7 -8,-1 0,-8 0,7" fill="${fill}" stroke="${strokeDark}" stroke-width="1.5" />
          <path d="M 0,7 H 8 V 1 L 4,-2" fill="none" stroke="${ruinColor}" stroke-width="1.5" stroke-dasharray="2.5 2" />
          <rect x="4" y="-6" width="2.8" height="9" fill="${ruinColor}" />
        </g>
      `;
    } else {
      iconSvg = `
        <g transform="rotate(${rot}) scale(${sc})">
          <path d="M -8,6 H 8 M -7,6 V 1 L -3,4 M 7,6 V 2" stroke="${ruinColor}" stroke-width="1.7" fill="none" stroke-linecap="round" />
          <rect x="1.5" y="-6.5" width="3.5" height="12.5" fill="${b.hasStove ? '#991b1b' : ruinColor}" stroke="${strokeDark}" stroke-width="1.1" />
          <line x1="-6" y1="-4" x2="0" y2="2" stroke="#dc2626" stroke-width="1.5" />
          <line x1="0" y1="-4" x2="-6" y2="2" stroke="#dc2626" stroke-width="1.5" />
        </g>
      `;
    }
  }

  let callout = '';
  if (b.labelRu) {
    const w = Math.max(76, b.labelRu.length * 6.3 + 14);
    const labelColor = isCharcoal ? '#1e3a8a' : '#93c5fd';
    const boxBg = isCharcoal ? 'rgba(250, 246, 236, 0.94)' : 'rgba(12, 21, 31, 0.94)';
    const boxStroke = b.kind === 'landmark' || b.kind === 'industrial' ? '#c92a2a' : labelColor;
    const amenities = b.amenities ?? (b.hasStove ? ['stove'] : []);
    const amenityStrip = renderAmenityMiniStrip(amenities, b.state === 'burned_ruin');
    const offsetY = amenities.length > 0 ? -18 * sc - 14 : -16 * sc - 6;

    callout = `
      <g transform="translate(0, ${offsetY.toFixed(1)})">
        <rect x="${(-w / 2).toFixed(1)}" y="-9" width="${w.toFixed(1)}" height="14" rx="2.5" fill="${boxBg}" stroke="${boxStroke}" stroke-width="1.15" />
        <text x="0" y="1" text-anchor="middle" fill="${b.kind === 'landmark' || b.kind === 'industrial' ? (isCharcoal ? '#991b1b' : '#fca5a5') : labelColor}" font-family="Oswald, sans-serif" font-size="8.8" font-weight="700" letter-spacing="0.4">${escSvg(b.labelRu)}</text>
        ${amenityStrip}
        <line x1="0" y1="${amenities.length > 0 ? '16.5' : '5'}" x2="0" y2="${(amenities.length > 0 ? 18 : 6 * sc).toFixed(1)}" stroke="${halo}" stroke-width="1.6" />
      </g>
    `;
  }

  return `<g transform="translate(${sx}, ${sy})">${iconSvg}${callout}</g>`;
}

/**
 * Рендерит альпинистский трос + стрелку-шеврон направления спуска с обрыва!
 */
function renderRopeSvg(rope: ResolvedRopeItem, isCharcoal: boolean): string {
  const tx = rope.top[0];
  const ty = toSvgY(rope.top[1]);
  const bx = rope.bottom[0];
  const by = toSvgY(rope.bottom[1]);

  const mx = (tx + bx) / 2;
  const my = (ty + by) / 2;
  const angleDeg = (Math.atan2(by - ty, bx - tx) * 180) / Math.PI - 90;

  const ropeStroke = rope.isDeployed ? '#d97706' : '#dc2626';
  const badgeFill = rope.isDeployed ? '#fbbf24' : isCharcoal ? '#fef2f2' : '#1e293b';

  return `
    <g>
      <line x1="${tx}" y1="${ty}" x2="${bx}" y2="${by}" stroke="${ropeStroke}" stroke-width="2.6" stroke-dasharray="${rope.isDeployed ? '4 2' : '2.5 4'}" />
      <circle cx="${bx}" cy="${by}" r="3.2" fill="${ropeStroke}" />
      <!-- Шеврон направления спуска с обрыва -->
      <g transform="translate(${mx.toFixed(1)}, ${my.toFixed(1)}) rotate(${angleDeg.toFixed(1)})">
        <circle cx="0" cy="0" r="5.2" fill="#4c1d95" stroke="#fde68a" stroke-width="1" />
        <path d="M -2.5 -1.2 L 0 2 L 2.5 -1.2" fill="none" stroke="#fde68a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </g>
      <g transform="translate(${tx}, ${ty})">
        <circle cx="0" cy="0" r="7.5" fill="${badgeFill}" stroke="#1c1917" stroke-width="1.5" />
        ${
          rope.isDeployed
            ? `<path d="M -3 -2 C -3 -5, 3 -5, 3 -2 C 3 1, -3 1, -3 4 C -3 5, 3 5, 3 2" stroke="#1c1917" stroke-width="1.6" fill="none" />`
            : `<line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="#dc2626" stroke-width="2" /><line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="#dc2626" stroke-width="2" />`
        }
      </g>
    </g>
  `;
}

/**
 * Чёткие векторные силуэты всех 32 типов микро-объектов на карте (фауна, трупы, травы, саженцы, старт, пещеры, оружие и станции).
 */
function renderMicroSpawnSvg(
  kind: MapMicroSpawnKind,
  x: number,
  y: number,
  difficulty: DifficultyId,
  isCharcoal: boolean,
): string {
  const sx = x;
  const sy = toSvgY(y);
  const passivePredators = difficulty === 'pilgrim';
  const predColor = passivePredators ? '#4d7c0f' : '#991b1b';
  const herbColor = isCharcoal ? '#15803d' : '#4ade80';
  const gameColor = isCharcoal ? '#3f362d' : '#cbd5e1';
  const haloBg = isCharcoal ? 'rgba(245, 239, 226, 0.82)' : 'rgba(15, 23, 42, 0.82)';

  let inner = '';
  switch (kind) {
    case 'wolf':
      inner = `
        <circle cx="0" cy="0" r="7.5" fill="${haloBg}" />
        <path d="M -6 3.5 L -4.2 -1 L -6 -2.8 L -2.5 -2.8 L -0.8 -5 L 1 -2.8 L 5.2 -1.8 L 6.8 0 L 4.2 1.5 L 4.2 4.5 M -3.5 1 L -3.5 4.5" stroke="${predColor}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      `;
      break;
    case 'timberwolf':
      inner = `
        <circle cx="0" cy="0" r="8" fill="#450a0a" stroke="#fca5a5" stroke-width="1.2" />
        <path d="M -4.5 3 L -3 -1 L -4.5 -2.5 L -1.5 -2.5 L 0 -4.5 L 1.5 -2.5 L 4.8 -1.5 L 5.8 0.5 L 3.5 1.8 L 3.5 4" stroke="#fef2f2" stroke-width="1.5" fill="none" stroke-linecap="round" />
      `;
      break;
    case 'bear':
      inner = `
        <circle cx="0" cy="0" r="8.5" fill="${haloBg}" stroke="${predColor}" stroke-width="1.1" />
        <ellipse cx="-0.8" cy="0.5" rx="5.5" ry="3.6" fill="${predColor}" />
        <circle cx="4.8" cy="-0.8" r="2.2" fill="${predColor}" />
        <circle cx="4" cy="-2.8" r="1.1" fill="${predColor}" />
        <line x1="-4" y1="3" x2="-4" y2="5.2" stroke="${predColor}" stroke-width="2" stroke-linecap="round" />
        <line x1="2.8" y1="3" x2="2.8" y2="5.2" stroke="${predColor}" stroke-width="2" stroke-linecap="round" />
      `;
      break;
    case 'moose':
      inner = `
        <circle cx="0" cy="0" r="8.5" fill="${haloBg}" stroke="#9a3412" stroke-width="1.1" />
        <ellipse cx="-1.2" cy="1" rx="4.6" ry="2.8" fill="#9a3412" />
        <path d="M 3 -0.5 L 4.8 -3.5 M 4 -3.5 C 2.2 -6, 6.8 -6, 7.5 -2.5 M -3.5 3 V 5.5 M 2 3 V 5.5" stroke="#9a3412" stroke-width="1.6" fill="none" stroke-linecap="round" />
      `;
      break;
    case 'cougar':
      inner = `
        <circle cx="0" cy="0" r="7.6" fill="#be123c" stroke="#fde047" stroke-width="1.3" />
        <path d="M -2.8 -2.8 L -1 2.8 M 0 -3.2 L 1 2.8 M 2.8 -2.2 L 3.2 2.2" stroke="#fde047" stroke-width="1.5" stroke-linecap="round" />
      `;
      break;
    case 'deer':
      inner = `
        <g stroke="${gameColor}" stroke-width="1.5" fill="none" stroke-linecap="round">
          <ellipse cx="-0.5" cy="1.5" rx="4" ry="2.2" fill="${gameColor}" />
          <path d="M 2.8 0 L 4.2 -4 M 4.2 -4 L 2.8 -6 M 4.2 -4 L 6 -5.5 M -3 3.2 L -3.2 6.2 M 2 3.2 L 2.5 6.2" />
        </g>
      `;
      break;
    case 'rabbit':
      inner = `
        <g fill="${gameColor}">
          <ellipse cx="0" cy="2" rx="3.3" ry="2.3" />
          <ellipse cx="1.5" cy="-2" rx="1" ry="2.8" transform="rotate(-12 1.5 -2)" />
          <ellipse cx="3" cy="-1.8" rx="1" ry="2.6" transform="rotate(14 3 -1.8)" />
        </g>
      `;
      break;
    case 'ptarmigan':
      inner = `
        <path d="M -4.2 2 C -2 -2, 2 -2, 4 0 L 6.2 -2 L 4.2 3.2 Z" fill="#f8fafc" stroke="#334155" stroke-width="1.3" />
      `;
      break;
    case 'carcass':
      inner = `
        <g stroke="#991b1b" stroke-width="1.5" fill="none" stroke-linecap="round">
          <path d="M -5.2 2.2 Q 0 -3.2 5.2 2.2 M -2.5 -1.8 V 3 M 0 -2.4 V 3.2 M 2.5 -1.8 V 3" />
        </g>
      `;
      break;
    case 'corpse':
      inner = `
        <circle cx="0" cy="0" r="6.8" fill="${haloBg}" />
        <circle cx="-4.2" cy="-0.8" r="1.9" fill="#1e293b" />
        <path d="M -2 -0.4 L 4.5 1.2 L 6.5 0.2 M 0.5 0.5 L -1.2 3.2 M 2.8 0.8 L 5 3.4" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round" fill="none" />
      `;
      break;
    case 'cattail':
      inner = `
        <g stroke="${herbColor}" stroke-width="1.5" stroke-linecap="round">
          <line x1="-2.2" y1="5.5" x2="-2.2" y2="-5" />
          <line x1="-2.2" y1="-1" x2="-2.2" y2="-4.2" stroke="#78350f" stroke-width="2.9" />
          <line x1="2.2" y1="5.5" x2="2.2" y2="-4" />
          <line x1="2.2" y1="0" x2="2.2" y2="-3" stroke="#78350f" stroke-width="2.9" />
        </g>
      `;
      break;
    case 'reishi':
      inner = `
        <path d="M -4.8 1 C -4.8 -4.2, 4.8 -4.2, 4.8 1 Z" fill="#b45309" stroke="#1c1917" stroke-width="1" />
        <rect x="-1.6" y="1" width="3.2" height="3.6" fill="#fde68a" stroke="#1c1917" stroke-width="0.7" />
      `;
      break;
    case 'rosehip':
      inner = `
        <path d="M -3.5 3.5 Q 0 0 3.5 3.5 M 0 3.5 V -1.5" stroke="#166534" stroke-width="1.2" fill="none" />
        <circle cx="-2.4" cy="0" r="2.2" fill="#dc2626" />
        <circle cx="2.2" cy="-1.5" r="2.2" fill="#dc2626" />
        <circle cx="0.8" cy="2.2" r="2" fill="#dc2626" />
      `;
      break;
    case 'lichen':
      inner = `
        <line x1="-4.5" y1="-4" x2="4.5" y2="-4" stroke="#57534e" stroke-width="1.4" stroke-linecap="round" />
        <path d="M -3 -3.5 V 2.8 M 0 -3.5 V 4.5 M 3 -3.5 V 2.2" stroke="#65a30d" stroke-width="1.9" stroke-linecap="round" />
      `;
      break;
    case 'burdock':
      inner = `
        <path d="M -1 4 C -5 1, -5 -4, -1 -1 C 0 -5, 4 -4, 1 4 Z" fill="#15803d" stroke="#052e16" stroke-width="0.8" />
      `;
      break;
    case 'acorns':
      inner = `
        <ellipse cx="0" cy="1.2" rx="3.2" ry="3.8" fill="#92400e" stroke="#1c1917" stroke-width="0.8" />
        <path d="M -3.6 -1 Q 0 -4.5 3.6 -1 Z" fill="#451a03" />
      `;
      break;
    case 'maple':
      inner = `
        <circle cx="0" cy="0" r="6.8" fill="${haloBg}" />
        <line x1="0" y1="5.2" x2="0" y2="-4" stroke="#78350f" stroke-width="1.5" />
        <polygon points="0,-6 -4.2,-1.2 -1.8,-1.2 -4.5,2 4.5,2 1.8,-1.2 4.2,-1.2" fill="#16a34a" stroke="#14532d" stroke-width="0.8" />
      `;
      break;
    case 'birch':
      inner = `
        <circle cx="0" cy="0" r="6.8" fill="${haloBg}" />
        <line x1="0" y1="5.2" x2="0" y2="-4.8" stroke="#f8fafc" stroke-width="2.2" />
        <line x1="0" y1="5.2" x2="0" y2="-4.8" stroke="#1e293b" stroke-width="2.2" stroke-dasharray="1.4 2.2" />
        <circle cx="-2.6" cy="-1.8" r="2" fill="#ca8a04" />
        <circle cx="2.6" cy="-2.6" r="2" fill="#eab308" />
      `;
      break;
    case 'start_spawn':
      inner = `
        <path d="M 0 7.5 C -5 2.2, -6.2 -2, -6.2 -4 A 6.2 6.2 0 1 1 6.2 -4 C 6.2 -2, 5 2.2, 0 7.5 Z" fill="#16a34a" stroke="#052e16" stroke-width="1.3" />
        <text x="0" y="-0.6" text-anchor="middle" fill="#ffffff" font-family="Oswald, sans-serif" font-size="7.5" font-weight="700">S</text>
      `;
      break;
    case 'small_cave':
      inner = `
        <path d="M 0 7.2 C -4.8 2, -5.8 -2, -5.8 -3.8 A 5.8 5.8 0 1 1 5.8 -3.8 C 5.8 -2, 4.8 2, 0 7.2 Z" fill="#0d9488" stroke="#134e4a" stroke-width="1.3" />
        <circle cx="0" cy="-3" r="2.1" fill="#ccfbf1" />
      `;
      break;
    case 'fishing':
      inner = `
        <ellipse cx="0" cy="2.5" rx="4.5" ry="2" fill="#38bdf8" stroke="#0c4a6e" stroke-width="1" />
        <path d="M 0 -5 V 1 C 0 3, 2.8 3, 2.8 0.8" fill="none" stroke="#0f172a" stroke-width="1.4" stroke-linecap="round" />
      `;
      break;
    case 'workbench':
      inner = `
        <rect x="-5.8" y="-4.8" width="11.6" height="9.6" rx="1.8" fill="#334155" stroke="#fbbf24" stroke-width="1.2" />
        <path d="M -3.2 2 H 3.2 M -1.8 2 V -1.2 H 1.8 V 2 M 0 -1.2 V -3" stroke="#fbbf24" stroke-width="1.3" fill="none" />
      `;
      break;
    case 'forge':
      inner = `
        <rect x="-6" y="-5" width="12" height="10" rx="1.8" fill="#7c2d12" stroke="#fdba74" stroke-width="1.2" />
        <path d="M -4 2.4 H 4 L 2.2 0 H -2.2 Z M -3 0 H 4.4 L 2.6 -2.2 H -3 Z" fill="#fde68a" />
      `;
      break;
    case 'bed':
      inner = `
        <rect x="-5.8" y="-4.5" width="11.6" height="9" rx="1.8" fill="#0369a1" stroke="#e0f2fe" stroke-width="1" />
        <path d="M -3.5 2.2 V -2 M -3.5 0.6 H 3.5 V 2.2 M -2 -0.8 H 2.2" stroke="#ffffff" stroke-width="1.3" fill="none" />
      `;
      break;
    case 'fire_barrel':
      inner = `
        <circle cx="0" cy="0" r="5.8" fill="#431407" stroke="#fb923c" stroke-width="1.1" />
        <path d="M 0 3.5 C -2.8 3.5, -3.2 0, 0 -3.8 C 3.2 0, 2.8 3.5, 0 3.5 Z" fill="#fb923c" />
      `;
      break;
    case 'first_aid':
      inner = `
        <rect x="-5" y="-5" width="10" height="10" rx="1.8" fill="#dc2626" stroke="#ffffff" stroke-width="1" />
        <path d="M 0 -2.8 V 2.8 M -2.8 0 H 2.8" stroke="#ffffff" stroke-width="1.8" />
      `;
      break;
    case 'tools':
      inner = `
        <circle cx="0" cy="0" r="5.8" fill="#334155" stroke="#cbd5e1" stroke-width="1" />
        <path d="M -3 3 L 2.5 -2.5 M 1.5 -3.5 L 3.5 -1.5" stroke="#fde047" stroke-width="1.8" stroke-linecap="round" />
      `;
      break;
    case 'backpack':
      inner = `
        <rect x="-4.5" y="-4.5" width="9" height="9.2" rx="2.2" fill="#92400e" stroke="#1c1917" stroke-width="1.1" />
        <line x1="-2.8" y1="-1" x2="2.8" y2="-1" stroke="#fde68a" stroke-width="1.3" />
      `;
      break;
    case 'coal':
      inner = `
        <circle cx="-2.2" cy="1.5" r="2.3" fill="#1c1917" stroke="#78716c" stroke-width="0.7" />
        <circle cx="2" cy="1.8" r="2.2" fill="#1c1917" stroke="#78716c" stroke-width="0.7" />
        <circle cx="0" cy="-1.5" r="2.3" fill="#292524" stroke="#a8a29e" stroke-width="0.7" />
      `;
      break;
    case 'rifle':
      inner = `
        <circle cx="0" cy="0" r="7.5" fill="${haloBg}" stroke="#fbbf24" stroke-width="1" />
        <g transform="rotate(-22)">
          <path d="M -6.8 0.8 L -3.2 2 L -1 0.3 H 6.8 M -2.5 0.3 V 2.3" stroke="#0f172a" stroke-width="2.1" fill="none" stroke-linecap="round" />
          <line x1="-1" y1="0.3" x2="6.8" y2="0.3" stroke="#d97706" stroke-width="1" />
        </g>
      `;
      break;
    case 'revolver':
      inner = `
        <circle cx="0" cy="0" r="6.4" fill="#1e293b" stroke="#fbbf24" stroke-width="1.2" />
        <path d="M -3 -0.8 H 3.5 M -2.5 -0.8 L -3.6 2.6" stroke="#fbbf24" stroke-width="1.7" stroke-linecap="round" />
      `;
      break;
    case 'bow':
      inner = `
        <circle cx="0" cy="0" r="6.8" fill="${haloBg}" stroke="#92400e" stroke-width="1" />
        <path d="M -2.5 -4.8 Q 4.5 0 -2.5 4.8" fill="none" stroke="#78350f" stroke-width="1.8" stroke-linecap="round" />
        <line x1="-4.8" y1="0" x2="4.8" y2="0" stroke="#1e293b" stroke-width="1.3" />
      `;
      break;
    case 'interloper_loot':
      inner = `
        <circle cx="0" cy="0" r="6.8" fill="#ea580c" stroke="#fffbeb" stroke-width="1.3" />
        <text x="0" y="3" text-anchor="middle" fill="#fffbeb" font-family="Oswald, sans-serif" font-size="8.5" font-weight="700">★</text>
      `;
      break;
    case 'safe':
      inner = `
        <rect x="-5" y="-5" width="10" height="10" rx="1.6" fill="#334155" stroke="#fde047" stroke-width="1.2" />
        <circle cx="0" cy="0" r="2.2" fill="none" stroke="#fde047" stroke-width="1.2" />
      `;
      break;
  }

  return `<g transform="translate(${sx}, ${sy})">${inner}</g>`;
}

/**
 * Генерирует 7-колоночную полную легенду условных знаков атласа (42 пиктограммы!) в нижнем поле листа [svgY = 1012..1160].
 */
function renderMasterBottomLegend(opts: {
  readonly region: RegionModel;
  readonly difficultyLabelRu: string;
  readonly starsStr: string;
  readonly isCharcoal: boolean;
  readonly labelColor: string;
  readonly legendBg: string;
  readonly legendBorder: string;
}): string {
  const {
    region,
    difficultyLabelRu,
    starsStr,
    isCharcoal,
    labelColor,
    legendBg,
    legendBorder,
  } = opts;

  // Собираем 36 ключевых позиций из ATLAS_LEGEND_GROUPS в 6 колонок по 6 строк + левый титульный блок!
  const allEntries = ATLAS_LEGEND_GROUPS.flatMap((g) => g.items);
  const selected = allEntries.slice(0, 36);

  const columnsMarkup: string[] = [];
  const colPositions = [184, 322, 462, 602, 738, 872];

  for (let c = 0; c < 6; c++) {
    const colX = colPositions[c]!;
    const slice = selected.slice(c * 6, c * 6 + 6);
    const rows = slice.map((item, rIdx) => {
      const ry = 18 + rIdx * 21.5;
      const shortTitle =
        item.titleRu.length > 21 ? `${item.titleRu.slice(0, 20)}…` : item.titleRu;
      return `
        <g transform="translate(0, ${ry})">
          <g transform="translate(11, -3) scale(0.82)">${item.renderIcon(isCharcoal)}</g>
          <text x="27" y="0" fill="${labelColor}" font-family="Inter, sans-serif" font-size="8" font-weight="600">${escSvg(shortTitle)}</text>
        </g>
      `;
    });

    columnsMarkup.push(`
      <line x1="${colX - 8}" y1="8" x2="${colX - 8}" y2="140" stroke="${legendBorder}" stroke-width="0.8" opacity="0.35" />
      <g transform="translate(${colX}, 0)">${rows.join('')}</g>
    `);
  }

  return `
    <g transform="translate(0, 1012)">
      <rect x="0" y="0" width="1000" height="148" rx="5" fill="${legendBg}" stroke="${legendBorder}" stroke-width="1.8" />

      <!-- Левый титульный штамп Атласа -->
      <g transform="translate(14, 22)">
        <text x="0" y="0" fill="#c92a2a" font-family="Oswald, sans-serif" font-size="10.5" font-weight="700" letter-spacing="0.9">THE LONG DARK • АТЛАС</text>
        <text x="0" y="21" fill="${labelColor}" font-family="Oswald, sans-serif" font-size="15.5" font-weight="700">${escSvg(region.nameRu.toUpperCase())}</text>
        <text x="0" y="36" fill="${isCharcoal ? '#57534e' : '#94a3b8'}" font-family="Cormorant Garamond, Georgia, serif" font-style="italic" font-size="12" font-weight="700">${escSvg(region.nameEn)}</text>
        <text x="0" y="54" fill="${labelColor}" font-family="Oswald, sans-serif" font-size="10" font-weight="700">ОПАСНОСТЬ: <tspan fill="#d97706">${starsStr}</tspan></text>
        <rect x="0" y="63" width="154" height="19" rx="3" fill="${isCharcoal ? '#29221b' : '#1e293b'}" />
        <text x="77" y="76" text-anchor="middle" fill="#fde68a" font-family="Oswald, sans-serif" font-size="9.5" font-weight="700">СЛОЖНОСТЬ: ${escSvg(difficultyLabelRu.toUpperCase())}</text>
        <text x="0" y="97" fill="${labelColor}" font-family="JetBrains Mono, monospace" font-size="8" opacity="0.82">Сетка A1–H8: 1 кл. ≈ 250 м</text>
        <text x="0" y="110" fill="${isCharcoal ? '#7c2d12' : '#fbbf24'}" font-family="Inter, sans-serif" font-size="7.6" font-weight="600">Спавн лута и туш рандомен!</text>
      </g>

      ${columnsMarkup.join('')}
    </g>
  `;
}

/**
 * Генерирует высокодетализированную топографическую угольную карту региона (2144x2412)
 * с внешней геодезической линейкой 0..2000 м, вырезанными долинами, внутренними изолиниями,
 * улицами и постройками со значками удобств, подлокациями, водопадами, тросами и полной 36-знаковой легендой!
 */
export function buildRegionCharcoalMapDataUrl(opts: {
  readonly region: RegionModel;
  readonly theme: MapThemeId;
  readonly difficulty: DifficultyId;
  readonly cartography: ResolvedRegionCartography;
  readonly showMicroDetails: boolean;
  readonly canvasLayers?: CanvasDetailLayers;
}): string {
  const { region, theme, difficulty, cartography, showMicroDetails, canvasLayers } = opts;
  const layers: CanvasDetailLayers = canvasLayers ?? {
    buildingsAndSublocs: true,
    ropesAndRoutes: true,
    faunaAndCarcasses: showMicroDetails,
    floraAndSaplings: showMicroDetails,
    lootAndStations: showMicroDetails,
  };

  const isCharcoal = theme === 'charcoal';
  const diffMeta = DIFFICULTY_BY_ID[difficulty];
  const seed = deterministicSeed(region.id);

  const sheetMarginBg = isCharcoal ? '#ded4be' : '#060c12';
  const outOfBoundsBg = isCharcoal ? '#c8baa0' : '#081018';
  const walkableFill = isCharcoal ? '#ebe4d3' : '#152636';
  const walkableStroke = isCharcoal ? '#362d24' : '#6cb4cc';
  const charcoalFog = isCharcoal ? '#231f1b' : '#030609';

  const inkPrimary = isCharcoal ? '#262019' : '#dce6f0';
  const inkMuted = isCharcoal ? 'rgba(54, 44, 34, 0.22)' : 'rgba(148, 163, 184, 0.16)';
  const valleyContourStroke = isCharcoal
    ? 'rgba(105, 86, 63, 0.16)'
    : 'rgba(148, 163, 184, 0.12)';
  const subGridStroke = isCharcoal ? 'rgba(84, 68, 50, 0.12)' : 'rgba(125, 162, 192, 0.08)';
  const gridStroke = isCharcoal ? 'rgba(52, 43, 33, 0.26)' : 'rgba(125, 162, 192, 0.20)';
  const haloColor = isCharcoal ? 'rgba(235, 228, 211, 0.94)' : 'rgba(13, 23, 34, 0.94)';

  const lakeFill = isCharcoal ? '#9cc2d9' : 'rgba(56, 139, 178, 0.45)';
  const lakeStroke = isCharcoal ? '#2e526b' : '#7dd3fc';
  const thinIceStroke = isCharcoal ? '#b91c1c' : '#f87171';
  const thinIceFill = isCharcoal ? 'rgba(220, 38, 38, 0.16)' : 'rgba(239, 68, 68, 0.20)';

  const pineColor = isCharcoal ? 'rgba(45, 62, 43, 0.42)' : 'rgba(74, 132, 110, 0.34)';
  const labelColor = isCharcoal ? '#221c16' : '#e2ebf3';

  // 1. Контуры проходимой долины + ClipPath для внутреннего микрорельефа долины
  const walkableClipPaths: string[] = [];
  const walkableMarkup: string[] = [];
  for (const poly of cartography.walkablePolygons) {
    const d = pointsToSvgPath(poly, true);
    walkableClipPaths.push(`<path d="${d}" />`);
    walkableMarkup.push(`
      <path d="${d}" fill="${walkableFill}" stroke="${walkableStroke}" stroke-width="3.2" stroke-linejoin="round" filter="url(#rough-charcoal)" />
      ${difficulty === 'misery' ? `<path d="${d}" fill="url(#misery-frost)" opacity="0.35" />` : ''}
      ${buildCliffHachures(poly, walkableStroke, true)}
    `);
  }

  // Внутренние горизонтали рельефа, рощи и валуны строго внутри проходимой долины!
  const internalValleyDetails: string[] = [];
  for (let i = 0; i < 14; i++) {
    const vx = 120 + ((seed * 5 + i * 163) % 760);
    const vy = 120 + ((seed * 7 + i * 197) % 760);
    const rx = 45 + ((seed + i * 71) % 85);
    const ry = 28 + ((seed + i * 53) % 58);
    const rot = ((seed + i * 37) % 90) - 45;
    internalValleyDetails.push(
      `<ellipse cx="${vx}" cy="${vy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${vx} ${vy})" fill="none" stroke="${valleyContourStroke}" stroke-width="1" stroke-dasharray="9 6" />`,
    );
  }
  for (let i = 0; i < 22; i++) {
    const tx = 95 + ((seed * 11 + i * 137) % 810);
    const ty = 95 + ((seed * 13 + i * 149) % 810);
    if (i % 3 === 0) {
      // Каменные валуны на склонах
      internalValleyDetails.push(`
        <g transform="translate(${tx}, ${ty})" fill="${isCharcoal ? 'rgba(92,79,66,0.22)' : 'rgba(148,163,184,0.16)'}" stroke="${valleyContourStroke}" stroke-width="0.9">
          <polygon points="-6,3 -4,-3 2,-4 6,1 4,4" />
          <polygon points="5,4 7,0 11,1 10,4" />
        </g>
      `);
    } else {
      // Одиночные сосны и перелески
      internalValleyDetails.push(`
        <g transform="translate(${tx}, ${ty}) scale(0.58)" fill="${pineColor}" opacity="0.65">
          <polygon points="0,-16 -7,-3 -2.5,-3 -9,6 -3.5,6 -10,14 10,14 3.5,6 9,6 2.5,-3 7,-3" />
        </g>
      `);
    }
  }

  // 2. Внешняя геодезическая рамка с метровой шкалой (100..2000 м) и квадратами A1..H8 со всех 4 сторон!
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const gridMarkup: string[] = [];
  const rulerMarkup: string[] = [];

  for (let p = 50; p <= 950; p += 50) {
    const meters = p * 2;
    gridMarkup.push(
      `<line x1="${p}" y1="0" x2="${p}" y2="1000" stroke="${subGridStroke}" stroke-width="0.7" />`,
      `<line x1="0" y1="${p}" x2="1000" y2="${p}" stroke="${subGridStroke}" stroke-width="0.7" />`,
    );
    if (p % 100 === 0) {
      const invMeters = (1000 - p) * 2;
      rulerMarkup.push(
        `<line x1="${p}" y1="-6" x2="${p}" y2="0" stroke="${inkPrimary}" stroke-width="1.1" />`,
        `<text x="${p}" y="-9" text-anchor="middle" fill="${labelColor}" font-family="JetBrains Mono, monospace" font-size="7.5" opacity="0.75">${meters}</text>`,
        `<line x1="${p}" y1="1000" x2="${p}" y2="1005" stroke="${inkPrimary}" stroke-width="1.1" />`,
        `<text x="${p}" y="1009" text-anchor="middle" fill="${labelColor}" font-family="JetBrains Mono, monospace" font-size="7" opacity="0.65">${meters}</text>`,
        `<line x1="-6" y1="${p}" x2="0" y2="${p}" stroke="${inkPrimary}" stroke-width="1.1" />`,
        `<text x="-9" y="${p + 2.5}" text-anchor="end" fill="${labelColor}" font-family="JetBrains Mono, monospace" font-size="7.5" opacity="0.75">${invMeters}</text>`,
        `<line x1="1000" y1="${p}" x2="1006" y2="${p}" stroke="${inkPrimary}" stroke-width="1.1" />`,
        `<text x="1009" y="${p + 2.5}" text-anchor="start" fill="${labelColor}" font-family="JetBrains Mono, monospace" font-size="7.5" opacity="0.75">${invMeters}</text>`,
      );
    }
  }

  for (let i = 1; i < 8; i++) {
    const pos = i * 125;
    gridMarkup.push(
      `<line x1="${pos}" y1="0" x2="${pos}" y2="1000" stroke="${gridStroke}" stroke-width="1.15" stroke-dasharray="6 5" />`,
      `<line x1="0" y1="${pos}" x2="1000" y2="${pos}" stroke="${gridStroke}" stroke-width="1.15" stroke-dasharray="6 5" />`,
    );
  }
  for (let c = 0; c < 8; c++) {
    const cx = 62.5 + c * 125;
    rulerMarkup.push(
      `<text x="${cx}" y="-20" text-anchor="middle" fill="${labelColor}" font-family="Oswald, sans-serif" font-size="11" font-weight="700">${cols[c]}</text>`,
    );
  }
  for (let r = 0; r < 8; r++) {
    const ry = 66 + r * 125;
    rulerMarkup.push(
      `<text x="-25" y="${ry}" text-anchor="middle" fill="${labelColor}" font-family="Oswald, sans-serif" font-size="11" font-weight="700">${r + 1}</text>`,
      `<text x="1025" y="${ry}" text-anchor="middle" fill="${labelColor}" font-family="Oswald, sans-serif" font-size="11" font-weight="700">${r + 1}</text>`,
    );
  }

  // 3. Изолинии горного рельефа в недоступной зоне
  const contours: string[] = [];
  for (let i = 0; i < 12; i++) {
    const cx = 90 + ((seed + i * 179) % 820);
    const cy = 90 + ((seed * 3 + i * 233) % 820);
    const rx = 80 + ((seed + i * 89) % 130);
    const ry = 55 + ((seed + i * 67) % 95);
    const rot = ((seed + i * 41) % 64) - 32;
    contours.push(
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="none" stroke="${inkMuted}" stroke-width="1.2" stroke-dasharray="12 5" />`,
      `<ellipse cx="${cx}" cy="${cy}" rx="${Math.round(rx * 0.62)}" ry="${Math.round(ry * 0.62)}" transform="rotate(${rot} ${cx} ${cy})" fill="none" stroke="${inkMuted}" stroke-width="0.95" />`,
    );
  }

  // 4. Гидрография, леса и базовые линии рельефа из regionsData
  const waterLayer: string[] = [];
  const landLayer: string[] = [];
  const pathLayer: string[] = [];

  for (const feat of region.topography) {
    if (feat.kind === 'lake') {
      const d = pointsToSvgPath(feat.points, true);
      waterLayer.push(`
        <g filter="url(#rough-charcoal)">
          <path d="${d}" fill="${lakeFill}" stroke="${lakeStroke}" stroke-width="2.6" stroke-linejoin="round" />
          <path d="${d}" fill="url(#ice-hatch)" opacity="0.52" />
        </g>
      `);
    } else if (feat.kind === 'thin_ice') {
      const d = pointsToSvgPath(feat.points, true);
      waterLayer.push(`
        <g>
          <path d="${d}" fill="${thinIceFill}" stroke="${thinIceStroke}" stroke-width="2" stroke-dasharray="7 4" stroke-linejoin="round" />
          <path d="${d}" fill="url(#thin-ice-hatch)" opacity="0.68" />
        </g>
      `);
    } else if (feat.kind === 'river') {
      const d = pointsToSvgPath(feat.points, false);
      waterLayer.push(`
        <path d="${d}" fill="none" stroke="${lakeStroke}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" opacity="0.55" filter="url(#rough-charcoal)" />
        <path d="${d}" fill="none" stroke="${lakeFill}" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#rough-charcoal)" />
      `);
    } else if (feat.kind === 'forest') {
      for (const [fx, fy] of feat.points) {
        const sy = toSvgY(fy);
        const offsets = [
          [0, 0, 0.82],
          [-20, 11, 0.72],
          [19, 9, 0.75],
          [-9, -16, 0.68],
        ];
        for (const [ox, oy, sc] of offsets) {
          landLayer.push(`
            <g transform="translate(${fx + ox!}, ${sy + oy!}) scale(${sc})" fill="${pineColor}">
              <polygon points="0,-18 -8,-4 -3,-4 -10,6 -4,6 -12,16 12,16 4,6 10,6 3,-4 8,-4" />
            </g>
          `);
        }
      }
    } else if (feat.kind === 'cliff') {
      const d = pointsToSvgPath(feat.points, false);
      landLayer.push(`
        <path d="${d}" fill="none" stroke="${walkableStroke}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" />
        ${buildCliffHachures(feat.points, walkableStroke, false)}
      `);
    } else if (feat.kind === 'ridge') {
      for (const pt of feat.points) {
        landLayer.push(`
          <g transform="translate(${pt[0]}, ${toSvgY(pt[1])})" stroke="${inkPrimary}" stroke-width="1.9" fill="none" opacity="0.48">
            <path d="M -30 14 L -9 -14 L 11 12 M -2 -4 L 18 -18 L 38 14" />
          </g>
        `);
      }
    } else if (feat.kind === 'railway') {
      pathLayer.push(renderExtraPath('railway', feat.points, isCharcoal));
    } else if (feat.kind === 'road') {
      pathLayer.push(renderExtraPath('highway', feat.points, isCharcoal));
    } else if (feat.kind === 'trail') {
      if (layers.ropesAndRoutes) {
        pathLayer.push(renderExtraPath('trail', feat.points, isCharcoal));
      }
    } else if (feat.kind === 'bridge') {
      pathLayer.push(renderExtraPath('bridge', feat.points, isCharcoal));
    } else if (feat.kind === 'powerline') {
      const d = pointsToSvgPath(feat.points, false);
      const pColor = isCharcoal ? '#3f4f59' : '#7dd3fc';
      pathLayer.push(`
        <path d="${d}" fill="none" stroke="${pColor}" stroke-width="1.3" stroke-dasharray="10 4" opacity="0.8" />
        ${buildPowerlinePoles(feat.points, pColor)}
      `);
    }
  }

  for (const ep of cartography.extraPaths) {
    const isRouteToggleable =
      ep.kind === 'trail' ||
      ep.kind === 'goat_path' ||
      ep.kind === 'log_bridge' ||
      ep.kind === 'interloper_route';
    if (isRouteToggleable && !layers.ropesAndRoutes) continue;
    pathLayer.push(renderExtraPath(ep.kind, ep.points, isCharcoal));
  }

  // 5. Тросы, микро-спавны по подслоям (фауна / флора / лут и станции) и постройки
  const ropesMarkup = layers.ropesAndRoutes
    ? cartography.ropes.map((r) => renderRopeSvg(r, isCharcoal))
    : [];

  const spawnsMarkup = cartography.microSpawns
    .filter((sp) => {
      if (FAUNA_KINDS.has(sp.kind)) return layers.faunaAndCarcasses;
      if (FLORA_KINDS.has(sp.kind)) return layers.floraAndSaplings;
      return layers.lootAndStations;
    })
    .map((sp) => renderMicroSpawnSvg(sp.kind, sp.x, sp.y, difficulty, isCharcoal));

  const buildingsMarkup = layers.buildingsAndSublocs
    ? cartography.buildings.map((b) => renderBuildingSvg(b, isCharcoal))
    : [];

  // 6. Второстепенные подлокации (синий штурманский курсив/капитель как на карте Stray Wolf!) + урочища
  const subLocMarkup: string[] = [];
  if (layers.buildingsAndSublocs) {
    const subFill = isCharcoal ? '#1e40af' : '#7dd3fc';
    for (const sub of cartography.subLocations) {
      subLocMarkup.push(`
        <text x="${sub.x}" y="${toSvgY(sub.y)}" text-anchor="middle" fill="${subFill}" stroke="${haloColor}" stroke-width="3" stroke-linejoin="round" paint-order="stroke" font-family="Oswald, sans-serif" font-weight="700" font-size="8.6" letter-spacing="0.45">${escSvg(sub.labelRu)}</text>
      `);
    }
  }

  const areaLabelsMarkup: string[] = [];
  for (const lbl of region.areaLabels ?? []) {
    const lx = lbl.x;
    const ly = toSvgY(lbl.y);
    const fill =
      lbl.style === 'danger'
        ? isCharcoal
          ? '#991b1b'
          : '#fca5a5'
        : lbl.style === 'water'
          ? lakeStroke
          : lbl.style === 'forest'
            ? isCharcoal
              ? '#1e4620'
              : '#86efac'
            : isCharcoal
              ? '#1e3a8a'
              : '#93c5fd';

    areaLabelsMarkup.push(`
      <g transform="translate(${lx}, ${ly})">
        <text x="0" y="0" text-anchor="middle" fill="${fill}" stroke="${haloColor}" stroke-width="3.6" stroke-linejoin="round" paint-order="stroke" font-family="Oswald, sans-serif" font-weight="700" font-size="11" letter-spacing="0.7">${escSvg(lbl.textRu.toUpperCase())}</text>
      </g>
    `);
  }

  // 7. Яркие выходные стрелки переходов в соседние регионы (теперь юг свободен до самого края y=972!)
  const exitBannersMarkup: string[] = [];
  for (const ex of region.exitBanners ?? []) {
    const textEsc = escSvg(ex.labelRu);
    const estWidth = Math.max(132, Math.min(254, ex.labelRu.length * 7.1 + 20));
    let bx = 500;
    let by = 32;
    if (ex.edge === 'north') {
      bx = Math.max(estWidth / 2 + 24, Math.min(976 - estWidth / 2, (ex.posPct / 100) * 1000));
      by = 28;
    } else if (ex.edge === 'south') {
      bx = Math.max(estWidth / 2 + 24, Math.min(976 - estWidth / 2, (ex.posPct / 100) * 1000));
      by = 972;
    } else if (ex.edge === 'west') {
      bx = 24 + estWidth / 2;
      by = Math.max(135, Math.min(915, (ex.posPct / 100) * 1000));
    } else {
      bx = 976 - estWidth / 2;
      by = Math.max(155, Math.min(915, (ex.posPct / 100) * 1000));
    }

    exitBannersMarkup.push(`
      <g transform="translate(${bx.toFixed(1)}, ${by.toFixed(1)})">
        <rect x="${(-estWidth / 2).toFixed(1)}" y="-11" width="${estWidth.toFixed(1)}" height="21" rx="4" fill="${isCharcoal ? 'rgba(250, 245, 232, 0.96)' : 'rgba(15, 23, 42, 0.95)'}" stroke="#c92a2a" stroke-width="1.7" />
        <text x="0" y="3.5" text-anchor="middle" fill="${isCharcoal ? '#b91c1c' : '#fca5a5'}" font-family="Oswald, sans-serif" font-size="10.5" font-weight="700" letter-spacing="0.6">${textEsc}</text>
      </g>
    `);
  }

  const starsStr =
    '★'.repeat(cartography.difficultyStars) + '☆'.repeat(5 - cartography.difficultyStars);
  const legendBg = isCharcoal ? 'rgba(246, 240, 227, 0.97)' : 'rgba(10, 17, 25, 0.97)';
  const legendBorder = isCharcoal ? '#3f3429' : '#475569';

  const masterLegendMarkup = renderMasterBottomLegend({
    region,
    difficultyLabelRu: diffMeta.nameRu,
    starsStr,
    isCharcoal,
    labelColor,
    legendBg,
    legendBorder,
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-36 -36 1072 1206" width="2144" height="2412">
    <defs>
      <clipPath id="map-playfield-clip">
        <rect x="0" y="0" width="1000" height="1000" />
      </clipPath>
      <clipPath id="walkable-clip">
        ${walkableClipPaths.join('')}
      </clipPath>
      <radialGradient id="charcoal-vignette" cx="50%" cy="50%" r="64%">
        <stop offset="86%" stop-color="${charcoalFog}" stop-opacity="0" />
        <stop offset="97%" stop-color="${charcoalFog}" stop-opacity="${isCharcoal ? '0.24' : '0.5'}" />
        <stop offset="100%" stop-color="${charcoalFog}" stop-opacity="${isCharcoal ? '0.58' : '0.82'}" />
      </radialGradient>
      <pattern id="ice-hatch" width="14" height="14" patternTransform="rotate(28)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="14" stroke="${lakeStroke}" stroke-width="0.9" opacity="0.35" />
      </pattern>
      <pattern id="thin-ice-hatch" width="10" height="10" patternTransform="rotate(-38)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="10" stroke="${thinIceStroke}" stroke-width="1.5" opacity="0.55" />
      </pattern>
      <pattern id="misery-frost" width="22" height="22" patternTransform="rotate(18)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="22" stroke="#38bdf8" stroke-width="1.2" opacity="0.35" />
      </pattern>
      <filter id="rough-charcoal" x="-3%" y="-3%" width="106%" height="106%">
        <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="3" seed="${seed % 100}" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>

    <!-- 0. Поля геодезического планшета -->
    <rect x="-36" y="-36" width="1072" height="1206" fill="${sheetMarginBg}" />

    <!-- Игровое поле [0..1000, 0..1000] -->
    <g clip-path="url(#map-playfield-clip)">
      <!-- 1. Фоновая недоступная скальная порода -->
      <rect x="0" y="0" width="1000" height="1000" fill="${outOfBoundsBg}" />
      <g>${contours.join('')}</g>

      <!-- 2. Светлая проходимая долина (Доступная область) + внутренний микрорельеф -->
      <g>${walkableMarkup.join('')}</g>
      <g clip-path="url(#walkable-clip)">${internalValleyDetails.join('')}</g>

      <!-- 3. Водоёмы, тонкий лёд, леса и скальные уступы -->
      <g>${waterLayer.join('')}</g>
      <g>${landLayer.join('')}</g>

      <!-- 4. Топографическая сетка A1..H8 и 100-метровая подсетка -->
      <g>${gridMarkup.join('')}</g>

      <!-- 5. Дороги, тропы, ж/д полотно, мосты, водопады, изгороди и маршрут Незваного гостя -->
      <g>${pathLayer.join('')}</g>

      <!-- 6. Альпинистские тросы со стрелками обрыва -->
      <g>${ropesMarkup.join('')}</g>

      <!-- 7. Фауна, саженцы, травы, старт, малые пещеры, верстаки и лут по сложности -->
      <g>${spawnsMarkup.join('')}</g>

      <!-- 8. Постройки (Целые / Рандом / Сгоревшие) со значками удобств под плашками -->
      <g>${buildingsMarkup.join('')}</g>

      <!-- 9. Подлокации, урочища и выходные стрелки на краях -->
      <g>${subLocMarkup.join('')}</g>
      <g>${areaLabelsMarkup.join('')}</g>
      <g>${exitBannersMarkup.join('')}</g>

      <!-- 10. Компас выжившего со звёздами сложности региона -->
      <g transform="translate(76, 78)">
        <g transform="rotate(-18)">
          <circle cx="0" cy="0" r="31" fill="${legendBg}" stroke="${labelColor}" stroke-width="1.6" stroke-dasharray="5 3" />
          <polygon points="0,-28 -6,-5 0,-9 6,-5" fill="#dc2626" />
          <polygon points="0,28 -6,5 0,9 6,5" fill="#2563eb" />
          <polygon points="-25,0 -6,-4 -9,0 -6,4" fill="${labelColor}" />
          <polygon points="25,0 6,-4 9,0 6,4" fill="${labelColor}" />
          <circle cx="0" cy="0" r="4" fill="#fbbf24" stroke="#1c1917" stroke-width="1.2" />
          <text x="0" y="-33" text-anchor="middle" fill="${labelColor}" font-family="Oswald, sans-serif" font-size="10.5" font-weight="700">N(С)</text>
          <text x="0" y="40" text-anchor="middle" fill="${labelColor}" font-family="Oswald, sans-serif" font-size="9.5" font-weight="700">S(Ю)</text>
          <text x="-37" y="3.5" text-anchor="middle" fill="${labelColor}" font-family="Oswald, sans-serif" font-size="9" font-weight="700">W(З)</text>
          <text x="37" y="3.5" text-anchor="middle" fill="${labelColor}" font-family="Oswald, sans-serif" font-size="9" font-weight="700">E(В)</text>
        </g>
        <text x="0" y="54" text-anchor="middle" fill="${labelColor}" font-family="Oswald, sans-serif" font-size="10" font-weight="700">СЛОЖНОСТЬ: <tspan fill="#d97706">${starsStr}</tspan></text>
      </g>

      <!-- 11. Штамп активного режима сложности и предупреждение о рандоме спавна -->
      <g transform="translate(724, 18)">
        <rect x="0" y="0" width="258" height="60" rx="5" fill="${legendBg}" stroke="${legendBorder}" stroke-width="1.4" />
        <text x="10" y="15" fill="#c92a2a" font-family="Oswald, sans-serif" font-size="10.8" font-weight="700">СЛОЙ СЛОЖНОСТИ: ${escSvg(diffMeta.nameRu.toUpperCase())}</text>
        <text x="10" y="29" fill="${labelColor}" font-family="Inter, sans-serif" font-size="9" font-weight="600">Целых построек: ${cartography.intactCount} • Руин/сгорело: ${cartography.halfOrRuinedCount}</text>
        <text x="10" y="42" fill="${labelColor}" font-family="Inter, sans-serif" font-size="8.8" opacity="0.88">Тросов: ${cartography.deployedRopesCount}/${cartography.totalRopesCount} • Объектов на полотне: ${cartography.microSpawns.length}</text>
        <text x="10" y="54" fill="${isCharcoal ? '#7c2d12' : '#fbbf24'}" font-family="Inter, sans-serif" font-size="8" font-weight="600">Расположение трупов, туш и рюкзаков РАНДОМНО!</text>
      </g>

      <rect x="0" y="0" width="1000" height="1000" fill="url(#charcoal-vignette)" pointer-events="none" />
    </g>

    <!-- Внешняя рамка поля [0..1000] и метровые деления 100..2000 м -->
    <rect x="0" y="0" width="1000" height="1000" fill="none" stroke="${inkPrimary}" stroke-width="2.4" />
    <rect x="-32" y="-32" width="1064" height="1198" fill="none" stroke="${inkPrimary}" stroke-width="1.2" opacity="0.55" />
    <g>${rulerMarkup.join('')}</g>

    <!-- 12. Полная 7-колоночная картографическая легенда Атласа внизу листа (не перекрывает карту!) -->
    ${masterLegendMarkup}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
