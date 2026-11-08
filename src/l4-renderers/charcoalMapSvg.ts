import { DIFFICULTY_BY_ID, MAP_CANVAS_SIZE } from '../l0-primitives/constants.ts';
import type {
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

function pointsToSvgPath(points: readonly (readonly [number, number])[], closed = false): string {
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
    const steps = Math.max(2, Math.floor(len / 22));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const bx = x1 + dx * t;
      const by = y1 + dy * t;
      const tickLen = s % 2 === 0 ? 8.5 : 5.5;
      ticks.push(
        `<line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${(bx + nx * tickLen).toFixed(1)}" y2="${(by + ny * tickLen).toFixed(1)}" stroke="${color}" stroke-width="1.4" stroke-linecap="round" opacity="0.65" />`,
      );
    }
  }
  return ticks.join('');
}

function buildPowerlinePoles(points: readonly (readonly [number, number])[], color: string): string {
  const poles: string[] = [];
  for (let i = 0; i < points.length; i++) {
    const pt = points[i]!;
    const px = pt[0];
    const py = toSvgY(pt[1]);
    poles.push(`
      <g transform="translate(${px}, ${py})" stroke="${color}" stroke-width="1.5" fill="none" opacity="0.88">
        <line x1="0" y1="-6.5" x2="0" y2="5.5" />
        <line x1="-4.5" y1="-3.5" x2="4.5" y2="-3.5" />
        <circle cx="0" cy="0" r="2" fill="${color}" />
      </g>
    `);
  }
  return poles.join('');
}

/**
 * Рендерит дорожную и тропиночную сеть (главные дороги, грунтовки, ж/д, тропы, обходы, мосты, брёвна и маршрут Незваного гостя).
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
        <path d="${d}" fill="none" stroke="${roadCurb}" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.88" />
        <path d="${d}" fill="none" stroke="${roadInner}" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="${d}" fill="none" stroke="${roadCurb}" stroke-width="1.3" stroke-dasharray="7 6" stroke-linecap="round" opacity="0.85" />
      `;
    case 'dirt_road':
      return `
        <path d="${d}" fill="none" stroke="${roadCurb}" stroke-width="5.2" stroke-dasharray="9 5" stroke-linecap="round" stroke-linejoin="round" opacity="0.68" />
        <path d="${d}" fill="none" stroke="${roadInner}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.75" />
      `;
    case 'railway':
      return `
        <path d="${d}" fill="none" stroke="${roadCurb}" stroke-width="6.5" opacity="0.9" />
        <path d="${d}" fill="none" stroke="${roadInner}" stroke-width="4.2" stroke-dasharray="7 7" opacity="0.95" />
      `;
    case 'trail':
      return `
        <path d="${d}" fill="none" stroke="${trailInk}" stroke-width="2.2" stroke-dasharray="5.5 4.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.88" />
      `;
    case 'goat_path':
      return `
        <path d="${d}" fill="none" stroke="${goatInk}" stroke-width="1.9" stroke-dasharray="2 4.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.88" />
      `;
    case 'bridge':
      return `
        <path d="${d}" fill="none" stroke="${roadCurb}" stroke-width="11.5" stroke-linecap="butt" />
        <path d="${d}" fill="none" stroke="${isCharcoal ? '#d8b482' : '#fbbf24'}" stroke-width="7" stroke-linecap="butt" />
        <path d="${d}" fill="none" stroke="${roadCurb}" stroke-width="7" stroke-dasharray="2 4" opacity="0.45" />
      `;
    case 'log_bridge':
      return `
        <path d="${d}" fill="none" stroke="#231910" stroke-width="6.2" stroke-linecap="round" />
        <path d="${d}" fill="none" stroke="#8c5828" stroke-width="4" stroke-linecap="round" />
      `;
    case 'interloper_route':
      return `
        <path d="${d}" fill="none" stroke="#ea580c" stroke-width="5" stroke-dasharray="10 7" stroke-linecap="round" stroke-linejoin="round" opacity="0.38" />
        <path d="${d}" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-dasharray="10 7" stroke-linecap="round" stroke-linejoin="round" opacity="0.92" />
      `;
  }
}

/**
 * Рендерит отдельную постройку (целую, рандомно повреждённую или сгоревшую в руины в зависимости от выбранной сложности!),
 * а также плашку названия для ключевых ориентиров в духе карт Stray Wolf.
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
          <rect x="-5.5" y="-4" width="11" height="8" rx="1" fill="${ isCharcoal ? '#3f5e75' : '#38bdf8' }" stroke="${strokeDark}" stroke-width="1.4" />
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
    // Дома, хижины, амбары и ключевые усадьбы: 3 чётких состояния под сложность!
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
      // Домик (целый или сгоревший в зависимости от рандома / Сталкера) — полукрыша!
      iconSvg = `
        <g transform="rotate(${rot}) scale(${sc})">
          <polygon points="-8,7 -8,-1 0,-8 0,7" fill="${fill}" stroke="${strokeDark}" stroke-width="1.5" />
          <path d="M 0,7 H 8 V 1 L 4,-2" fill="none" stroke="${ruinColor}" stroke-width="1.5" stroke-dasharray="2.5 2" />
          <rect x="4" y="-6" width="2.8" height="9" fill="${ruinColor}" />
        </g>
      `;
    } else {
      // Сгоревший / разрушенный остов (печная труба + обгоревший фундамент на Незваном госте!)
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

  // Рамочная выноска названия ключевого места (как на карте Милтона Stray Wolf)
  let callout = '';
  if (b.labelRu) {
    const w = Math.max(76, b.labelRu.length * 6.3 + 14);
    const labelColor = isCharcoal ? '#1e3a8a' : '#93c5fd';
    const boxBg = isCharcoal ? 'rgba(250, 246, 236, 0.92)' : 'rgba(12, 21, 31, 0.92)';
    const boxStroke = b.kind === 'landmark' ? '#c92a2a' : labelColor;
    callout = `
      <g transform="translate(0, ${(-16 * sc - 6).toFixed(1)})">
        <rect x="${(-w / 2).toFixed(1)}" y="-9" width="${w.toFixed(1)}" height="14" rx="2.5" fill="${boxBg}" stroke="${boxStroke}" stroke-width="1.1" />
        <text x="0" y="1" text-anchor="middle" fill="${b.kind === 'landmark' ? (isCharcoal ? '#991b1b' : '#fca5a5') : labelColor}" font-family="Oswald, sans-serif" font-size="8.8" font-weight="700" letter-spacing="0.4">${escSvg(b.labelRu)}</text>
        <line x1="0" y1="5" x2="0" y2="${(6 * sc).toFixed(1)}" stroke="${halo}" stroke-width="2" />
      </g>
    `;
  }

  return `<g transform="translate(${sx}, ${sy})">${iconSvg}${callout}</g>`;
}

/**
 * Рендерит альпинистский трос: жёлтый узел (если трос висит на данной сложности) или пустое красное кольцо (если трос снят!).
 */
function renderRopeSvg(rope: ResolvedRopeItem, isCharcoal: boolean): string {
  const tx = rope.top[0];
  const ty = toSvgY(rope.top[1]);
  const bx = rope.bottom[0];
  const by = toSvgY(rope.bottom[1]);

  const ropeStroke = rope.isDeployed ? '#d97706' : '#dc2626';
  const badgeFill = rope.isDeployed ? '#fbbf24' : isCharcoal ? '#fef2f2' : '#1e293b';

  return `
    <g>
      <line x1="${tx}" y1="${ty}" x2="${bx}" y2="${by}" stroke="${ropeStroke}" stroke-width="2.6" stroke-dasharray="${rope.isDeployed ? '4 2' : '2.5 4'}" />
      <circle cx="${bx}" cy="${by}" r="3.2" fill="${ropeStroke}" />
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
 * Миниатюрные картографические пиктограммы фауны, целебных растений, саженцев, туш и снаряжения по сложности.
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
  const predColor = passivePredators ? '#4d7c0f' : '#b91c1c';
  const herbColor = isCharcoal ? '#15803d' : '#4ade80';
  const gameColor = isCharcoal ? '#44403c' : '#cbd5e1';

  let inner = '';
  switch (kind) {
    case 'wolf':
    case 'timberwolf':
      inner = `
        <circle cx="0" cy="0" r="6.8" fill="${kind === 'timberwolf' ? '#7f1d1d' : predColor}" opacity="0.9" />
        <path d="M -3.5 -2 L -2 -4.5 L 0 -2 L 2 -4.5 L 3.5 -2 L 2 3.5 L 0 4.5 L -2 3.5 Z" fill="#fffbeb" />
      `;
      break;
    case 'bear':
      inner = `
        <circle cx="0" cy="0" r="8.2" fill="${predColor}" stroke="#1c1917" stroke-width="1.2" />
        <circle cx="-3.5" cy="-3.5" r="2" fill="#fffbeb" />
        <circle cx="3.5" cy="-3.5" r="2" fill="#fffbeb" />
        <circle cx="0" cy="0.8" r="3.6" fill="#fffbeb" />
      `;
      break;
    case 'moose':
      inner = `
        <circle cx="0" cy="0" r="8.2" fill="#9a3412" stroke="#1c1917" stroke-width="1.2" />
        <path d="M -5 -3 C -5 -6, -2 -5, -1 -1 M 5 -3 C 5 -6, 2 -5, 1 -1 M 0 -1 V 4" stroke="#fde68a" stroke-width="1.7" fill="none" stroke-linecap="round" />
      `;
      break;
    case 'cougar':
      inner = `
        <circle cx="0" cy="0" r="8" fill="#be123c" stroke="#fde047" stroke-width="1.3" />
        <path d="M -3 -3 L -1 3 M 0 -3.5 L 1 3 M 3 -2.5 L 3.5 2.5" stroke="#fde047" stroke-width="1.6" stroke-linecap="round" />
      `;
      break;
    case 'deer':
      inner = `
        <g stroke="${gameColor}" stroke-width="1.6" fill="none" stroke-linecap="round">
          <ellipse cx="0" cy="1.5" rx="4" ry="2.4" fill="${gameColor}" />
          <path d="M 3 0 L 4.5 -4 M 4.5 -4 L 3 -6 M 4.5 -4 L 6.5 -5.5 M -2.5 3.5 L -3 6.5 M 2.5 3.5 L 3 6.5" />
        </g>
      `;
      break;
    case 'rabbit':
      inner = `
        <g fill="${gameColor}">
          <ellipse cx="0" cy="2" rx="3.2" ry="2.3" />
          <ellipse cx="1.5" cy="-2" rx="1" ry="2.8" transform="rotate(-12 1.5 -2)" />
          <ellipse cx="3" cy="-1.8" rx="1" ry="2.6" transform="rotate(14 3 -1.8)" />
        </g>
      `;
      break;
    case 'ptarmigan':
      inner = `
        <path d="M -4 2 C -2 -2, 2 -2, 4 0 L 6 -2 L 4 3 Z" fill="#f8fafc" stroke="#334155" stroke-width="1.3" />
      `;
      break;
    case 'carcass':
      inner = `
        <g stroke="#7c2d12" stroke-width="1.5" fill="none">
          <path d="M -5 2 Q 0 -3 5 2 M -2.5 -2 L -2.5 3 M 0 -2.5 L 0 3 M 2.5 -2 L 2.5 3" />
        </g>
      `;
      break;
    case 'corpse':
      inner = `
        <circle cx="0" cy="0" r="5.5" fill="#334155" stroke="#f8fafc" stroke-width="1" />
        <text x="0" y="3" text-anchor="middle" fill="#f8fafc" font-size="8" font-weight="700">✕</text>
      `;
      break;
    case 'cattail':
      inner = `
        <g stroke="${herbColor}" stroke-width="1.4" stroke-linecap="round">
          <line x1="-2" y1="5" x2="-2" y2="-5" />
          <line x1="-2" y1="-1" x2="-2" y2="-4" stroke="#78350f" stroke-width="2.8" />
          <line x1="2" y1="5" x2="2" y2="-4" />
          <line x1="2" y1="0" x2="2" y2="-3" stroke="#78350f" stroke-width="2.8" />
        </g>
      `;
      break;
    case 'reishi':
      inner = `
        <path d="M -4.5 1 C -4.5 -4, 4.5 -4, 4.5 1 Z" fill="#b45309" stroke="#1c1917" stroke-width="1" />
        <rect x="-1.5" y="1" width="3" height="3.5" fill="#fde68a" />
      `;
      break;
    case 'rosehip':
      inner = `
        <circle cx="-2" cy="0" r="2.3" fill="#dc2626" />
        <circle cx="2" cy="-1.5" r="2.3" fill="#dc2626" />
        <circle cx="1" cy="2.2" r="2.2" fill="#dc2626" />
      `;
      break;
    case 'lichen':
      inner = `
        <path d="M -3 -4 V 3 M 0 -4 V 4.5 M 3 -4 V 2.5" stroke="#65a30d" stroke-width="1.8" stroke-linecap="round" />
      `;
      break;
    case 'maple':
    case 'birch':
      inner = `
        <circle cx="0" cy="0" r="6" fill="${kind === 'maple' ? '#d97706' : '#0284c7'}" stroke="#1c1917" stroke-width="1.1" />
        <path d="M 0 3.5 V -3.5 M 0 0 L -2.5 -2 M 0 1 L 2.5 -1.5" stroke="#fffbeb" stroke-width="1.4" stroke-linecap="round" />
      `;
      break;
    case 'rifle':
      inner = `
        <g transform="rotate(-28)">
          <rect x="-7" y="-2" width="14" height="4" rx="1" fill="#1e293b" stroke="#fbbf24" stroke-width="1.1" />
        </g>
      `;
      break;
    case 'revolver':
      inner = `
        <circle cx="0" cy="0" r="5.8" fill="#1e293b" stroke="#fbbf24" stroke-width="1.2" />
        <path d="M -2.5 -1 H 3 M -2.5 -1 L -3.5 2.5" stroke="#fbbf24" stroke-width="1.6" stroke-linecap="round" />
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
        <rect x="-5" y="-5" width="10" height="10" rx="1.5" fill="#334155" stroke="#fde047" stroke-width="1.2" />
        <circle cx="0" cy="0" r="2.2" fill="none" stroke="#fde047" stroke-width="1.2" />
      `;
      break;
  }

  return `<g transform="translate(${sx}, ${sy})">${inner}</g>`;
}

/**
 * Генерирует высокодетализированную топографическую угольную карту региона (1600x1600)
 * в стилистике пергамента/авроры с границами доступных долин, индивидуальными постройками,
 * дорогами, тропами, тросами, ресурсами и легендой, динамически перестраиваемыми под уровень сложности!
 */
export function buildRegionCharcoalMapDataUrl(opts: {
  readonly region: RegionModel;
  readonly theme: MapThemeId;
  readonly difficulty: DifficultyId;
  readonly cartography: ResolvedRegionCartography;
  readonly showMicroDetails: boolean;
}): string {
  const { region, theme, difficulty, cartography, showMicroDetails } = opts;
  const isCharcoal = theme === 'charcoal';
  const diffMeta = DIFFICULTY_BY_ID[difficulty];
  const seed = deterministicSeed(region.id);

  // Двухтоновая палитра: Недоступные скалы снаружи vs Светлая проходимая долина внутри (в нашей угольной/аврора эстетике!)
  const outOfBoundsBg = isCharcoal ? '#c8baa0' : '#081018';
  const walkableFill = isCharcoal ? '#ebe4d3' : '#152636';
  const walkableStroke = isCharcoal ? '#362d24' : '#6cb4cc';
  const charcoalFog = isCharcoal ? '#231f1b' : '#030609';

  const inkPrimary = isCharcoal ? '#262019' : '#dce6f0';
  const inkMuted = isCharcoal ? 'rgba(54, 44, 34, 0.22)' : 'rgba(148, 163, 184, 0.16)';
  const subGridStroke = isCharcoal ? 'rgba(84, 68, 50, 0.12)' : 'rgba(125, 162, 192, 0.08)';
  const gridStroke = isCharcoal ? 'rgba(52, 43, 33, 0.26)' : 'rgba(125, 162, 192, 0.20)';
  const haloColor = isCharcoal ? 'rgba(235, 228, 211, 0.92)' : 'rgba(13, 23, 34, 0.92)';

  const lakeFill = isCharcoal ? '#9cc2d9' : 'rgba(56, 139, 178, 0.45)';
  const lakeStroke = isCharcoal ? '#2e526b' : '#7dd3fc';
  const thinIceStroke = isCharcoal ? '#b91c1c' : '#f87171';
  const thinIceFill = isCharcoal ? 'rgba(220, 38, 38, 0.16)' : 'rgba(239, 68, 68, 0.20)';

  const pineColor = isCharcoal ? 'rgba(45, 62, 43, 0.42)' : 'rgba(74, 132, 110, 0.34)';
  const labelColor = isCharcoal ? '#221c16' : '#e2ebf3';

  // 1. Контуры проходимой долины (Доступная область) + береговые обрывы скал
  const walkableMarkup: string[] = [];
  for (const poly of cartography.walkablePolygons) {
    const d = pointsToSvgPath(poly, true);
    walkableMarkup.push(`
      <path d="${d}" fill="${walkableFill}" stroke="${walkableStroke}" stroke-width="3.2" stroke-linejoin="round" filter="url(#rough-charcoal)" />
      ${difficulty === 'misery' ? `<path d="${d}" fill="url(#misery-frost)" opacity="0.35" />` : ''}
      ${buildCliffHachures(poly, walkableStroke, true)}
    `);
  }

  // 2. Координатная сетка (тонкая 50px + сектора A1..H8 по 125px)
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const gridMarkup: string[] = [];
  for (let p = 50; p < 1000; p += 50) {
    gridMarkup.push(
      `<line x1="${p}" y1="18" x2="${p}" y2="982" stroke="${subGridStroke}" stroke-width="0.7" />`,
      `<line x1="18" y1="${p}" x2="982" y2="${p}" stroke="${subGridStroke}" stroke-width="0.7" />`,
    );
  }
  for (let i = 1; i < 8; i++) {
    const pos = i * 125;
    gridMarkup.push(
      `<line x1="${pos}" y1="18" x2="${pos}" y2="982" stroke="${gridStroke}" stroke-width="1.1" stroke-dasharray="6 5" />`,
      `<line x1="18" y1="${pos}" x2="982" y2="${pos}" stroke="${gridStroke}" stroke-width="1.1" stroke-dasharray="6 5" />`,
    );
  }
  for (let c = 0; c < 8; c++) {
    const cx = 62.5 + c * 125;
    gridMarkup.push(
      `<text x="${cx}" y="31" text-anchor="middle" fill="${labelColor}" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" opacity="0.65">${cols[c]}</text>`,
    );
  }
  for (let r = 0; r < 8; r++) {
    const ry = 66 + r * 125;
    gridMarkup.push(
      `<text x="27" y="${ry}" text-anchor="middle" fill="${labelColor}" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" opacity="0.65">${r + 1}</text>`,
      `<text x="973" y="${ry}" text-anchor="middle" fill="${labelColor}" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" opacity="0.65">${r + 1}</text>`,
    );
  }

  // 3. Изолинии горного рельефа в недоступной зоне
  const contours: string[] = [];
  for (let i = 0; i < 10; i++) {
    const cx = 110 + ((seed + i * 179) % 780);
    const cy = 110 + ((seed * 3 + i * 233) % 780);
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
          <path d="${d}" fill="url(#ice-hatch)" opacity="0.5" />
        </g>
      `);
    } else if (feat.kind === 'thin_ice') {
      const d = pointsToSvgPath(feat.points, true);
      waterLayer.push(`
        <g>
          <path d="${d}" fill="${thinIceFill}" stroke="${thinIceStroke}" stroke-width="2" stroke-dasharray="7 4" stroke-linejoin="round" />
          <path d="${d}" fill="url(#thin-ice-hatch)" opacity="0.65" />
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
      pathLayer.push(renderExtraPath('trail', feat.points, isCharcoal));
    } else if (feat.kind === 'bridge') {
      pathLayer.push(renderExtraPath('bridge', feat.points, isCharcoal));
    } else if (feat.kind === 'powerline') {
      const d = pointsToSvgPath(feat.points, false);
      const pColor = isCharcoal ? '#3f4f59' : '#7dd3fc';
      pathLayer.push(`
        <path d="${d}" fill="none" stroke="${pColor}" stroke-width="1.3" stroke-dasharray="10 4" opacity="0.78" />
        ${buildPowerlinePoles(feat.points, pColor)}
      `);
    }
  }

  // Дополнительные детальные дороги, тропы, мосты и маршруты из regionCartographyData
  for (const ep of cartography.extraPaths) {
    pathLayer.push(renderExtraPath(ep.kind, ep.points, isCharcoal));
  }

  // 5. Тросы, микро-спавны (животные, растения, саженцы, оружие/лут) и индивидуальные постройки по сложности
  const ropesMarkup = cartography.ropes.map((r) => renderRopeSvg(r, isCharcoal));
  const spawnsMarkup = showMicroDetails
    ? cartography.microSpawns.map((sp) =>
        renderMicroSpawnSvg(sp.kind, sp.x, sp.y, difficulty, isCharcoal),
      )
    : [];
  const buildingsMarkup = cartography.buildings.map((b) => renderBuildingSvg(b, isCharcoal));

  // 6. Подписи урочищ на местности
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
        <text x="0" y="0" text-anchor="middle" fill="${fill}" stroke="${haloColor}" stroke-width="3.6" stroke-linejoin="round" paint-order="stroke" font-family="Oswald, sans-serif" font-weight="700" font-size="11.5" letter-spacing="0.7">${escSvg(lbl.textRu.toUpperCase())}</text>
      </g>
    `);
  }

  // 7. Яркие выходные стрелки переходов в соседние регионы (как красные указатели на карте Stray Wolf)
  const exitBannersMarkup: string[] = [];
  for (const ex of region.exitBanners ?? []) {
    const textEsc = escSvg(ex.labelRu);
    const estWidth = Math.max(132, Math.min(248, ex.labelRu.length * 7.1 + 20));
    let bx = 500;
    let by = 46;
    if (ex.edge === 'north') {
      bx = Math.max(estWidth / 2 + 40, Math.min(960 - estWidth / 2, (ex.posPct / 100) * 1000));
      by = 46;
    } else if (ex.edge === 'south') {
      bx = Math.max(estWidth / 2 + 40, Math.min(960 - estWidth / 2, (ex.posPct / 100) * 1000));
      by = 882;
    } else if (ex.edge === 'west') {
      bx = 38 + estWidth / 2;
      by = Math.max(135, Math.min(845, (ex.posPct / 100) * 1000));
    } else {
      bx = 962 - estWidth / 2;
      by = Math.max(155, Math.min(835, (ex.posPct / 100) * 1000));
    }

    exitBannersMarkup.push(`
      <g transform="translate(${bx.toFixed(1)}, ${by.toFixed(1)})">
        <rect x="${(-estWidth / 2).toFixed(1)}" y="-11" width="${estWidth.toFixed(1)}" height="21" rx="4" fill="${isCharcoal ? 'rgba(250, 245, 232, 0.95)' : 'rgba(15, 23, 42, 0.94)'}" stroke="#c92a2a" stroke-width="1.6" />
        <text x="0" y="3.5" text-anchor="middle" fill="${isCharcoal ? '#b91c1c' : '#fca5a5'}" font-family="Oswald, sans-serif" font-size="10.5" font-weight="700" letter-spacing="0.6">${textEsc}</text>
      </g>
    `);
  }

  const starsStr = '★'.repeat(cartography.difficultyStars) + '☆'.repeat(5 - cartography.difficultyStars);
  const legendBg = isCharcoal ? 'rgba(245, 239, 226, 0.95)' : 'rgba(10, 17, 25, 0.95)';
  const legendBorder = isCharcoal ? '#3f3429' : '#475569';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1600" height="1600">
    <defs>
      <radialGradient id="charcoal-vignette" cx="50%" cy="50%" r="62%">
        <stop offset="84%" stop-color="${charcoalFog}" stop-opacity="0" />
        <stop offset="96%" stop-color="${charcoalFog}" stop-opacity="${isCharcoal ? '0.28' : '0.55'}" />
        <stop offset="100%" stop-color="${charcoalFog}" stop-opacity="${isCharcoal ? '0.68' : '0.88'}" />
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

    <!-- 1. Фоновая недоступная скальная порода -->
    <rect width="1000" height="1000" fill="${outOfBoundsBg}" />
    <g>${contours.join('')}</g>

    <!-- 2. Светлая проходимая долина (Доступная область) -->
    <g>${walkableMarkup.join('')}</g>

    <!-- 3. Водоёмы, тонкий лёд, леса и скальные уступы внутри долины -->
    <g>${waterLayer.join('')}</g>
    <g>${landLayer.join('')}</g>

    <!-- 4. Сетка ориентирования A1..H8 -->
    <g>${gridMarkup.join('')}</g>

    <!-- 5. Дороги, тропы, ж/д полотно, мосты, поваленные деревья и маршрут Незваного гостя -->
    <g>${pathLayer.join('')}</g>

    <!-- 6. Альпинистские тросы (Привязаны vs Пустые крепления по сложности) -->
    <g>${ropesMarkup.join('')}</g>

    <!-- 7. Фауна, саженцы, травы и лут по сложности -->
    <g>${spawnsMarkup.join('')}</g>

    <!-- 8. Все индивидуальные постройки (Целые / Рандом / Сгоревшие по сложности!) -->
    <g>${buildingsMarkup.join('')}</g>

    <!-- 9. Подписи урочищ и выходные стрелки на краях -->
    <g>${areaLabelsMarkup.join('')}</g>
    <g>${exitBannersMarkup.join('')}</g>

    <!-- 10. Компас выжившего со звёздами сложности региона (слева вверху, как в атласе!) -->
    <g transform="translate(88, 92)">
      <g transform="rotate(-18)">
        <circle cx="0" cy="0" r="32" fill="${legendBg}" stroke="${labelColor}" stroke-width="1.6" stroke-dasharray="5 3" />
        <polygon points="0,-29 -6,-5 0,-9 6,-5" fill="#dc2626" />
        <polygon points="0,29 -6,5 0,9 6,5" fill="#2563eb" />
        <polygon points="-26,0 -6,-4 -9,0 -6,4" fill="${labelColor}" />
        <polygon points="26,0 6,-4 9,0 6,4" fill="${labelColor}" />
        <circle cx="0" cy="0" r="4" fill="#fbbf24" stroke="#1c1917" stroke-width="1.2" />
        <text x="0" y="-34" text-anchor="middle" fill="${labelColor}" font-family="Oswald, sans-serif" font-size="11" font-weight="700">N(С)</text>
        <text x="0" y="42" text-anchor="middle" fill="${labelColor}" font-family="Oswald, sans-serif" font-size="10" font-weight="700">S(Ю)</text>
        <text x="-38" y="3.5" text-anchor="middle" fill="${labelColor}" font-family="Oswald, sans-serif" font-size="9.5" font-weight="700">W(З)</text>
        <text x="38" y="3.5" text-anchor="middle" fill="${labelColor}" font-family="Oswald, sans-serif" font-size="9.5" font-weight="700">E(В)</text>
      </g>
      <text x="0" y="56" text-anchor="middle" fill="${labelColor}" font-family="Oswald, sans-serif" font-size="10.5" font-weight="700">СЛОЖНОСТЬ: <tspan fill="#d97706">${starsStr}</tspan></text>
    </g>

    <!-- 11. Штамп активного режима сложности и предупреждение о рандоме спавна (справа вверху) -->
    <g transform="translate(705, 58)">
      <rect x="0" y="0" width="258" height="62" rx="5" fill="${legendBg}" stroke="${legendBorder}" stroke-width="1.3" />
      <text x="10" y="16" fill="#c92a2a" font-family="Oswald, sans-serif" font-size="11" font-weight="700">СЛОЙ СЛОЖНОСТИ: ${escSvg(diffMeta.nameRu.toUpperCase())}</text>
      <text x="10" y="31" fill="${labelColor}" font-family="Inter, sans-serif" font-size="9.2" font-weight="600">Целых построек: ${cartography.intactCount} • Руин/сгорело: ${cartography.halfOrRuinedCount}</text>
      <text x="10" y="44" fill="${labelColor}" font-family="Inter, sans-serif" font-size="9" opacity="0.85">Привязано тросов: ${cartography.deployedRopesCount}/${cartography.totalRopesCount} • Лут и фауна перестроены</text>
      <text x="10" y="56" fill="${isCharcoal ? '#7c2d12' : '#fbbf24'}" font-family="Inter, sans-serif" font-size="8.2" font-weight="600">Внимание: точный спавн трупов и туш рандомен в каждом забеге!</text>
    </g>

    <!-- 12. Полная картографическая легенда внизу листа (в духе атласа Stray Wolf) -->
    <g transform="translate(36, 902)">
      <rect x="0" y="0" width="928" height="76" rx="5" fill="${legendBg}" stroke="${legendBorder}" stroke-width="1.5" />

      <!-- Блок заголовка региона в легенде -->
      <text x="14" y="22" fill="${labelColor}" font-family="Oswald, sans-serif" font-size="15" font-weight="700" letter-spacing="0.8">${escSvg(region.nameRu.toUpperCase())}</text>
      <text x="14" y="37" fill="${isCharcoal ? '#57534e' : '#94a3b8'}" font-family="Cormorant Garamond, Georgia, serif" font-style="italic" font-size="12.5" font-weight="700">${escSvg(region.nameEn)}</text>
      <text x="14" y="54" fill="#c92a2a" font-family="Oswald, sans-serif" font-size="10" font-weight="700">THE LONG DARK • УГОЛЬНЫЙ АТЛАС</text>
      <text x="14" y="67" fill="${labelColor}" font-family="JetBrains Mono, monospace" font-size="8.5" opacity="0.8">1 квадрат (A1–H8) ≈ 250 м</text>
      <line x1="196" y1="8" x2="196" y2="68" stroke="${legendBorder}" stroke-width="1" opacity="0.4" />

      <!-- Колонка 1: Дороги и тропы -->
      <g transform="translate(208, 15)" font-family="Inter, sans-serif" font-size="8.8" font-weight="600" fill="${labelColor}">
        <line x1="0" y1="0" x2="28" y2="0" stroke="#2b241d" stroke-width="6" />
        <line x1="0" y1="0" x2="28" y2="0" stroke="#f3ede0" stroke-width="3.4" />
        <text x="35" y="3">Главная дорога</text>

        <line x1="0" y1="15" x2="28" y2="15" stroke="${labelColor}" stroke-width="2" stroke-dasharray="5 4" />
        <text x="35" y="18">Лесная тропа</text>

        <line x1="0" y1="30" x2="28" y2="30" stroke="#6e563a" stroke-width="1.8" stroke-dasharray="2 4" />
        <text x="35" y="33">Пеший обход</text>

        <line x1="0" y1="45" x2="28" y2="45" stroke="#2b241d" stroke-width="5" />
        <line x1="0" y1="45" x2="28" y2="45" stroke="#f3ede0" stroke-width="3.2" stroke-dasharray="5 5" />
        <text x="35" y="48">Ж/Д и Мосты</text>
      </g>

      <!-- Колонка 2: Строения по сложности -->
      <g transform="translate(362, 15)" font-family="Inter, sans-serif" font-size="8.8" font-weight="600" fill="${labelColor}">
        <polygon points="6,4 6,-2 12,-7 18,-2 18,4" fill="#c92a2a" stroke="#18130e" stroke-width="1.2" />
        <text x="25" y="3">Особая база / Печь</text>

        <polygon points="6,19 6,13 12,8 18,13 18,19" fill="${isCharcoal ? '#332b24' : '#cbd5e1'}" stroke="#18130e" stroke-width="1.2" />
        <text x="25" y="18">Целое строение</text>

        <polygon points="6,34 6,28 12,23 12,34" fill="${isCharcoal ? '#332b24' : '#cbd5e1'}" />
        <rect x="14" y="25" width="2.5" height="9" fill="#78716c" />
        <text x="25" y="33">Рандом (цел/руины)</text>

        <rect x="10" y="40" width="3" height="9" fill="#991b1b" />
        <line x1="5" y1="43" x2="9" y2="48" stroke="#dc2626" stroke-width="1.4" />
        <text x="25" y="48">Сгорело на сложн.</text>
      </g>

      <!-- Колонка 3: Тросы, пещеры и рельеф -->
      <g transform="translate(532, 15)" font-family="Inter, sans-serif" font-size="8.8" font-weight="600" fill="${labelColor}">
        <circle cx="10" cy="0" r="5.5" fill="#fbbf24" stroke="#1c1917" stroke-width="1.1" />
        <text x="22" y="3">Трос привязан</text>

        <circle cx="10" cy="15" r="5.5" fill="#fef2f2" stroke="#dc2626" stroke-width="1.2" />
        <text x="22" y="18">Трос снят (нужен свой)</text>

        <path d="M 4 34 C 4 25, 16 25, 16 34 Z" fill="#14110f" stroke="#c92a2a" stroke-width="1.3" />
        <text x="22" y="33">Пещера / Шахта</text>

        <rect x="4" y="41" width="12" height="8" fill="${walkableFill}" stroke="${walkableStroke}" stroke-width="1.3" />
        <text x="22" y="48">Доступная долина</text>
      </g>

      <!-- Колонка 4: Животные, флора и лут по сложности -->
      <g transform="translate(718, 15)" font-family="Inter, sans-serif" font-size="8.8" font-weight="600" fill="${labelColor}">
        <circle cx="8" cy="0" r="5" fill="#b91c1c" />
        <text x="19" y="3">Волк / Медведь / Лось</text>

        <circle cx="8" cy="15" r="5" fill="#d97706" />
        <text x="19" y="18">Клён и Берёза (на лук)</text>

        <circle cx="8" cy="30" r="4.5" fill="#15803d" />
        <text x="19" y="33">Рогоз / Рейши / Шиповник</text>

        <circle cx="8" cy="45" r="5" fill="#ea580c" />
        <text x="19" y="48">${difficulty === 'interloper' || difficulty === 'misery' ? '★ Молот/Лупа + Путь ковки' : 'Ружьё / Револьвер / Сейф'}</text>
      </g>
    </g>

    <!-- Мягкая виньетка по краям листа -->
    <rect width="1000" height="1000" fill="url(#charcoal-vignette)" pointer-events="none" />
    <rect x="16" y="16" width="968" height="968" fill="none" stroke="${inkPrimary}" stroke-width="2.6" opacity="0.55" />
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
