import { MAP_CANVAS_SIZE } from '../l0-primitives/constants.ts';
import type { MapThemeId, RegionModel } from '../l0-primitives/types.ts';

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
 * Строит перпендикулярные штрихи скального обрыва (бергштрихи) вдоль ломаной линии.
 */
function buildCliffHachures(points: readonly (readonly [number, number])[], color: string): string {
  const ticks: string[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const x1 = p1[0];
    const y1 = toSvgY(p1[1]);
    const x2 = p2[0];
    const y2 = toSvgY(p2[1]);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 8) continue;

    const nx = -dy / len;
    const ny = dx / len;
    const steps = Math.max(2, Math.floor(len / 18));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const bx = x1 + dx * t;
      const by = y1 + dy * t;
      const tickLen = s % 2 === 0 ? 10 : 6.5;
      ticks.push(
        `<line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${(bx + nx * tickLen).toFixed(1)}" y2="${(by + ny * tickLen).toFixed(1)}" stroke="${color}" stroke-width="1.7" stroke-linecap="round" opacity="0.78" />`,
      );
    }
  }
  return ticks.join('');
}

/**
 * Строит опоры ЛЭП вдоль линии электропередач для удобного ориентирования в метель.
 */
function buildPowerlinePoles(points: readonly (readonly [number, number])[], color: string): string {
  const poles: string[] = [];
  for (let i = 0; i < points.length; i++) {
    const pt = points[i]!;
    const px = pt[0];
    const py = toSvgY(pt[1]);
    poles.push(`
      <g transform="translate(${px}, ${py})" stroke="${color}" stroke-width="1.6" fill="none" opacity="0.88">
        <line x1="0" y1="-7" x2="0" y2="6" />
        <line x1="-5" y1="-4" x2="5" y2="-4" />
        <circle cx="0" cy="0" r="2.2" fill="${color}" />
      </g>
    `);
    if (i < points.length - 1) {
      const next = points[i + 1]!;
      const mx = (px + next[0]) / 2;
      const my = (py + toSvgY(next[1])) / 2;
      if (Math.hypot(next[0] - px, toSvgY(next[1]) - py) > 130) {
        poles.push(`
          <g transform="translate(${mx.toFixed(1)}, ${my.toFixed(1)})" stroke="${color}" stroke-width="1.4" fill="none" opacity="0.78">
            <line x1="0" y1="-6" x2="0" y2="5" />
            <line x1="-4.5" y1="-3.5" x2="4.5" y2="-3.5" />
          </g>
        `);
      }
    }
  }
  return poles.join('');
}

/**
 * Генерирует высокодетализированную угольную SVG-карту региона с топографической сеткой A1..H8,
 * тропами, ЛЭП, скальными уступами, опасным тонким льдом, подписями урочищ и выходами в соседние регионы.
 */
export function buildRegionCharcoalMapDataUrl(region: RegionModel, theme: MapThemeId): string {
  const isCharcoal = theme === 'charcoal';
  const seed = deterministicSeed(region.id);

  const bgCenter = isCharcoal ? '#dbd2be' : '#13212d';
  const bgMid = isCharcoal ? '#c9beaa' : '#0d1721';
  const bgEdge = isCharcoal ? '#958972' : '#060c12';
  const charcoalFog = isCharcoal ? '#231f1b' : '#030609';

  const inkPrimary = isCharcoal ? '#28231d' : '#d2dde8';
  const inkMuted = isCharcoal ? 'rgba(46, 40, 33, 0.25)' : 'rgba(148, 163, 184, 0.18)';
  const gridStroke = isCharcoal ? 'rgba(52, 43, 33, 0.22)' : 'rgba(125, 162, 192, 0.18)';
  const haloColor = isCharcoal ? 'rgba(222, 214, 195, 0.92)' : 'rgba(11, 19, 27, 0.92)';

  const lakeFill = isCharcoal ? 'rgba(126, 162, 181, 0.62)' : 'rgba(56, 139, 178, 0.32)';
  const lakeStroke = isCharcoal ? '#354b59' : '#6cb4cc';
  const thinIceStroke = isCharcoal ? '#b4342a' : '#f87171';
  const thinIceFill = isCharcoal ? 'rgba(196, 69, 54, 0.16)' : 'rgba(239, 68, 68, 0.18)';

  const railColor = isCharcoal ? '#241d17' : '#e5a25d';
  const roadColor = isCharcoal ? '#4f4234' : '#9fb1c4';
  const roadCore = isCharcoal ? '#ded5c3' : '#243646';
  const trailColor = isCharcoal ? '#6b4c2a' : '#fbbf24';
  const powerColor = isCharcoal ? '#3f4f59' : '#7dd3fc';
  const cliffColor = isCharcoal ? '#332b24' : '#94a3b8';
  const structFill = isCharcoal ? '#3b3129' : '#e2e8f0';
  const structStroke = isCharcoal ? '#18130f' : '#0f172a';
  const pineColor = isCharcoal ? 'rgba(41, 52, 40, 0.50)' : 'rgba(74, 132, 110, 0.36)';
  const labelColor = isCharcoal ? '#262019' : '#e2ebf3';

  // 1. Топографическая координатная сетка A1..H8 (8x8 секторов по 125 ед.)
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const gridMarkup: string[] = [];
  for (let i = 1; i < 8; i++) {
    const pos = i * 125;
    gridMarkup.push(
      `<line x1="${pos}" y1="22" x2="${pos}" y2="978" stroke="${gridStroke}" stroke-width="1" stroke-dasharray="6 6" />`,
      `<line x1="22" y1="${pos}" x2="978" y2="${pos}" stroke="${gridStroke}" stroke-width="1" stroke-dasharray="6 6" />`,
    );
  }
  for (let c = 0; c < 8; c++) {
    const cx = 62.5 + c * 125;
    gridMarkup.push(
      `<text x="${cx}" y="35" text-anchor="middle" fill="${labelColor}" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" opacity="0.58">${cols[c]}</text>`,
      `<text x="${cx}" y="974" text-anchor="middle" fill="${labelColor}" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" opacity="0.58">${cols[c]}</text>`,
    );
  }
  for (let r = 0; r < 8; r++) {
    const ry = 66 + r * 125;
    gridMarkup.push(
      `<text x="30" y="${ry}" text-anchor="middle" fill="${labelColor}" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" opacity="0.58">${r + 1}</text>`,
      `<text x="970" y="${ry}" text-anchor="middle" fill="${labelColor}" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" opacity="0.58">${r + 1}</text>`,
    );
  }

  // 2. Детерминированные топографические изолинии рельефа
  const contours: string[] = [];
  for (let i = 0; i < 9; i++) {
    const cx = 135 + ((seed + i * 179) % 730);
    const cy = 135 + ((seed * 3 + i * 233) % 730);
    const rx = 85 + ((seed + i * 89) % 135);
    const ry = 60 + ((seed + i * 67) % 105);
    const rot = ((seed + i * 41) % 64) - 32;
    contours.push(
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="none" stroke="${inkMuted}" stroke-width="1.35" stroke-dasharray="14 5 4 4" />`,
      `<ellipse cx="${cx}" cy="${cy}" rx="${Math.round(rx * 0.66)}" ry="${Math.round(ry * 0.66)}" transform="rotate(${rot} ${cx} ${cy})" fill="none" stroke="${inkMuted}" stroke-width="1.05" />`,
      `<ellipse cx="${cx}" cy="${cy}" rx="${Math.round(rx * 0.36)}" ry="${Math.round(ry * 0.36)}" transform="rotate(${rot} ${cx} ${cy})" fill="none" stroke="${inkMuted}" stroke-width="0.9" stroke-dasharray="5 4" />`,
    );
  }

  // 3. Отрисовка всех слоёв топографии (вода -> тонкий лёд -> лес -> дороги/тропы/ж.д./ЛЭП -> скалы/мосты/постройки)
  const waterLayer: string[] = [];
  const landLayer: string[] = [];
  const infraLayer: string[] = [];
  const structLayer: string[] = [];

  for (const feat of region.topography) {
    if (feat.kind === 'lake') {
      const d = pointsToSvgPath(feat.points, true);
      const center = feat.points.reduce(
        (acc, p) => [acc[0] + p[0] / feat.points.length, acc[1] + p[1] / feat.points.length],
        [0, 0],
      );
      waterLayer.push(`
        <g filter="url(#rough-charcoal)">
          <path d="${d}" fill="${lakeFill}" stroke="${lakeStroke}" stroke-width="3" stroke-linejoin="round" />
          <path d="${d}" fill="url(#ice-hatch)" opacity="0.5" />
        </g>
      `);
      if (feat.labelRu) {
        waterLayer.push(`
          <text x="${Math.round(center[0])}" y="${Math.round(toSvgY(center[1]))}" text-anchor="middle" fill="${lakeStroke}" stroke="${haloColor}" stroke-width="3.5" paint-order="stroke" font-family="Cormorant Garamond, Georgia, serif" font-style="italic" font-weight="700" font-size="19" letter-spacing="1.2">${escSvg(feat.labelRu)}</text>
        `);
      }
    } else if (feat.kind === 'thin_ice') {
      const d = pointsToSvgPath(feat.points, true);
      waterLayer.push(`
        <g>
          <path d="${d}" fill="${thinIceFill}" stroke="${thinIceStroke}" stroke-width="2.2" stroke-dasharray="8 5" stroke-linejoin="round" />
          <path d="${d}" fill="url(#thin-ice-hatch)" opacity="0.68" />
        </g>
      `);
    } else if (feat.kind === 'river') {
      const d = pointsToSvgPath(feat.points, false);
      waterLayer.push(`
        <path d="${d}" fill="none" stroke="${lakeStroke}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" opacity="0.45" filter="url(#rough-charcoal)" />
        <path d="${d}" fill="none" stroke="${lakeFill}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" filter="url(#rough-charcoal)" />
        <path d="${d}" fill="none" stroke="${lakeStroke}" stroke-width="1.8" stroke-dasharray="9 6" stroke-linecap="round" opacity="0.85" />
      `);
    } else if (feat.kind === 'forest') {
      for (const [fx, fy] of feat.points) {
        const sy = toSvgY(fy);
        const offsets = [
          [0, 0, 0.95],
          [-24, 13, 0.82],
          [23, 10, 0.86],
          [-11, -20, 0.76],
          [18, -17, 0.74],
          [39, -3, 0.72],
        ];
        for (const [ox, oy, sc] of offsets) {
          landLayer.push(`
            <g transform="translate(${fx + ox!}, ${sy + oy!}) scale(${sc})" fill="${pineColor}">
              <polygon points="0,-19 -8.5,-4 -3.5,-4 -11,7 -4.5,7 -13,18 13,18 4.5,7 11,7 3.5,-4 8.5,-4" />
              <rect x="-1.6" y="18" width="3.2" height="5.5" />
            </g>
          `);
        }
      }
    } else if (feat.kind === 'ridge') {
      for (const pt of feat.points) {
        const px = pt[0];
        const py = toSvgY(pt[1]);
        landLayer.push(`
          <g transform="translate(${px}, ${py})" stroke="${inkPrimary}" stroke-width="2.1" fill="none" opacity="0.58">
            <path d="M -36 17 L -11 -17 L 13 15 M -2 -5 L 21 -22 L 45 17" />
            <path d="M -11 -17 L -17 6 M 21 -22 L 14 8" stroke-width="1.2" opacity="0.65" />
          </g>
        `);
      }
    } else if (feat.kind === 'cliff') {
      const d = pointsToSvgPath(feat.points, false);
      landLayer.push(`
        <path d="${d}" fill="none" stroke="${cliffColor}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.82" />
        ${buildCliffHachures(feat.points, cliffColor)}
      `);
    } else if (feat.kind === 'road') {
      const d = pointsToSvgPath(feat.points, false);
      infraLayer.push(`
        <path d="${d}" fill="none" stroke="${roadColor}" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.72" />
        <path d="${d}" fill="none" stroke="${roadCore}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="0.88" />
        <path d="${d}" fill="none" stroke="${roadColor}" stroke-width="1.5" stroke-dasharray="10 7" stroke-linecap="round" opacity="0.85" />
      `);
    } else if (feat.kind === 'trail') {
      const d = pointsToSvgPath(feat.points, false);
      infraLayer.push(`
        <path d="${d}" fill="none" stroke="${haloColor}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.55" />
        <path d="${d}" fill="none" stroke="${trailColor}" stroke-width="2.3" stroke-dasharray="3.5 6.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.92" />
      `);
    } else if (feat.kind === 'railway') {
      const d = pointsToSvgPath(feat.points, false);
      infraLayer.push(`
        <path d="${d}" fill="none" stroke="${haloColor}" stroke-width="10" opacity="0.45" />
        <path d="${d}" fill="none" stroke="${railColor}" stroke-width="8.5" stroke-dasharray="2.6 8.4" opacity="0.82" />
        <path d="${d}" fill="none" stroke="${railColor}" stroke-width="2.5" opacity="0.95" />
      `);
    } else if (feat.kind === 'powerline') {
      const d = pointsToSvgPath(feat.points, false);
      infraLayer.push(`
        <path d="${d}" fill="none" stroke="${powerColor}" stroke-width="1.5" stroke-dasharray="12 4" opacity="0.82" />
        ${buildPowerlinePoles(feat.points, powerColor)}
      `);
    } else if (feat.kind === 'bridge') {
      const d = pointsToSvgPath(feat.points, false);
      structLayer.push(`
        <path d="${d}" fill="none" stroke="${structStroke}" stroke-width="11" stroke-linecap="butt" opacity="0.9" />
        <path d="${d}" fill="none" stroke="${isCharcoal ? '#c9a679' : '#fbbf24'}" stroke-width="6.5" stroke-linecap="butt" />
        <path d="${d}" fill="none" stroke="${structStroke}" stroke-width="6.5" stroke-dasharray="2 4.5" opacity="0.55" />
      `);
    } else if (feat.kind === 'structure') {
      for (let i = 0; i < feat.points.length; i += 2) {
        const p1 = feat.points[i]!;
        const p2 = feat.points[i + 1] ?? [p1[0] + 16, p1[1] + 12];
        const rx = Math.min(p1[0], p2[0]);
        const ry = Math.min(toSvgY(p1[1]), toSvgY(p2[1]));
        const rw = Math.max(13, Math.abs(p2[0] - p1[0]));
        const rh = Math.max(11, Math.abs(toSvgY(p2[1]) - toSvgY(p1[1])));
        structLayer.push(`
          <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="1.5" fill="${structFill}" stroke="${structStroke}" stroke-width="1.8" opacity="0.9" />
        `);
      }
    }
  }

  // 4. Подписи урочищ, ориентиров, тонкого льда и водоёмов (areaLabels)
  const areaLabelsMarkup: string[] = [];
  for (const lbl of region.areaLabels ?? []) {
    const lx = lbl.x;
    const ly = toSvgY(lbl.y);
    const fill =
      lbl.style === 'danger'
        ? isCharcoal
          ? '#9e231b'
          : '#fca5a5'
        : lbl.style === 'water'
          ? lakeStroke
          : lbl.style === 'forest'
            ? isCharcoal
              ? '#2f452d'
              : '#86efac'
            : labelColor;
    const fontFamily =
      lbl.style === 'water'
        ? 'Cormorant Garamond, Georgia, serif'
        : 'Oswald, sans-serif';
    const fontStyle = lbl.style === 'water' ? 'italic' : 'normal';
    const fontSize = lbl.style === 'landmark' || lbl.style === 'danger' ? 13.5 : 14.5;

    areaLabelsMarkup.push(`
      <g transform="translate(${lx}, ${ly})">
        <text x="0" y="0" text-anchor="middle" fill="${fill}" stroke="${haloColor}" stroke-width="4" stroke-linejoin="round" paint-order="stroke" font-family="${fontFamily}" font-style="${fontStyle}" font-weight="700" font-size="${fontSize}" letter-spacing="0.9">${escSvg(lbl.textRu)}</text>
        ${
          lbl.subRu
            ? `<text x="0" y="14" text-anchor="middle" fill="${labelColor}" stroke="${haloColor}" stroke-width="3.2" stroke-linejoin="round" paint-order="stroke" font-family="Inter, sans-serif" font-weight="600" font-size="10.5" opacity="0.86">${escSvg(lbl.subRu)}</text>`
            : ''
        }
      </g>
    `);
  }

  // 5. Плашки переходов по краям карты (exitBanners)
  const exitBannersMarkup: string[] = [];
  for (const ex of region.exitBanners ?? []) {
    const pillBg = isCharcoal ? 'rgba(34, 28, 22, 0.90)' : 'rgba(12, 22, 32, 0.92)';
    const pillBorder = isCharcoal ? '#d97724' : '#6cb4cc';
    const pillText = '#ffd699';
    const textEsc = escSvg(ex.labelRu);
    const estWidth = Math.max(136, Math.min(255, ex.labelRu.length * 7.4 + 22));

    let bx = 500;
    let by = 48;
    if (ex.edge === 'north') {
      bx = Math.max(estWidth / 2 + 40, Math.min(960 - estWidth / 2, (ex.posPct / 100) * 1000));
      by = 50;
    } else if (ex.edge === 'south') {
      bx = Math.max(estWidth / 2 + 40, Math.min(960 - estWidth / 2, (ex.posPct / 100) * 1000));
      by = 950;
    } else if (ex.edge === 'west') {
      bx = 42 + estWidth / 2;
      by = Math.max(125, Math.min(895, (ex.posPct / 100) * 1000));
    } else {
      bx = 958 - estWidth / 2;
      by = Math.max(155, Math.min(845, (ex.posPct / 100) * 1000));
    }

    exitBannersMarkup.push(`
      <g transform="translate(${bx.toFixed(1)}, ${by.toFixed(1)})">
        <rect x="${(-estWidth / 2).toFixed(1)}" y="-12" width="${estWidth.toFixed(1)}" height="23" rx="5" fill="${pillBg}" stroke="${pillBorder}" stroke-width="1.5" />
        <text x="0" y="3.5" text-anchor="middle" fill="${pillText}" font-family="Oswald, sans-serif" font-size="11" font-weight="700" letter-spacing="0.6">${textEsc}</text>
      </g>
    `);
  }

  // Декоративные ели по краям карты
  const borderPines: string[] = [];
  for (let i = 0; i < 18; i++) {
    const px = 80 + ((seed * 7 + i * 139) % 840);
    const py = 90 + ((seed * 11 + i * 173) % 820);
    if (px > 180 && px < 820 && py > 160 && py < 840) continue;
    borderPines.push(`
      <g transform="translate(${px}, ${py}) scale(0.68)" fill="${pineColor}" opacity="0.55">
        <polygon points="0,-18 -8,-4 -3,-4 -11,8 11,8 3,-4 8,-4" />
      </g>
    `);
  }

  const auroraGlow = !isCharcoal
    ? `
      <radialGradient id="aurora-band-1" cx="30%" cy="18%" r="55%">
        <stop offset="0%" stop-color="#3dd68c" stop-opacity="0.16" />
        <stop offset="60%" stop-color="#6cb4cc" stop-opacity="0.06" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="aurora-band-2" cx="78%" cy="26%" r="48%">
        <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.14" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>
    `
    : '';

  const legendBg = isCharcoal ? 'rgba(222, 213, 195, 0.88)' : 'rgba(11, 18, 26, 0.88)';
  const legendBorder = isCharcoal ? 'rgba(54, 44, 34, 0.55)' : 'rgba(108, 180, 204, 0.4)';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
    <defs>
      <radialGradient id="paper-grad" cx="50%" cy="50%" r="64%">
        <stop offset="0%" stop-color="${bgCenter}" />
        <stop offset="74%" stop-color="${bgMid}" />
        <stop offset="100%" stop-color="${bgEdge}" />
      </radialGradient>
      <radialGradient id="charcoal-vignette" cx="50%" cy="50%" r="58%">
        <stop offset="80%" stop-color="${charcoalFog}" stop-opacity="0" />
        <stop offset="95%" stop-color="${charcoalFog}" stop-opacity="${isCharcoal ? '0.36' : '0.62'}" />
        <stop offset="100%" stop-color="${charcoalFog}" stop-opacity="${isCharcoal ? '0.78' : '0.92'}" />
      </radialGradient>
      ${auroraGlow}
      <pattern id="ice-hatch" width="16" height="16" patternTransform="rotate(28)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="16" stroke="${lakeStroke}" stroke-width="0.9" opacity="0.38" />
      </pattern>
      <pattern id="thin-ice-hatch" width="12" height="12" patternTransform="rotate(-38)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="12" stroke="${thinIceStroke}" stroke-width="1.5" opacity="0.55" />
      </pattern>
      <filter id="rough-charcoal" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.032" numOctaves="3" seed="${seed % 100}" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.8" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>

    <!-- Базовый лист пергамента / ночного сланца -->
    <rect width="1000" height="1000" fill="url(#paper-grad)" />
    ${!isCharcoal ? '<rect width="1000" height="1000" fill="url(#aurora-band-1)" /><rect width="1000" height="1000" fill="url(#aurora-band-2)" />' : ''}

    <!-- Изолинии рельефа -->
    <g>${contours.join('')}</g>

    <!-- Фоновые таёжные ели -->
    <g>${borderPines.join('')}</g>

    <!-- Слои гидрографии, леса, дорог, ЛЭП и построек -->
    <g>${waterLayer.join('')}</g>
    <g>${landLayer.join('')}</g>
    <g>${infraLayer.join('')}</g>
    <g>${structLayer.join('')}</g>

    <!-- Координатная сетка A1..H8 -->
    <g>${gridMarkup.join('')}</g>

    <!-- Подписи урочищ и ориентиров на местности -->
    <g>${areaLabelsMarkup.join('')}</g>

    <!-- Направления переходов по краям карты -->
    <g>${exitBannersMarkup.join('')}</g>

    <!-- Компас выжившего (Роза ветров) -->
    <g transform="translate(912, 102)" stroke="${labelColor}" fill="none" opacity="0.88">
      <circle cx="0" cy="0" r="34" fill="${legendBg}" stroke-width="1.5" stroke-dasharray="6 3" />
      <circle cx="0" cy="0" r="4.5" fill="${labelColor}" />
      <polygon points="0,-30 -6.5,-7 0,-12 6.5,-7" fill="${isCharcoal ? '#9e231b' : '#f09a3e'}" stroke="none" />
      <line x1="0" y1="7" x2="0" y2="28" stroke-width="1.5" />
      <line x1="-28" y1="0" x2="28" y2="0" stroke-width="1.2" />
      <text x="0" y="-39" text-anchor="middle" fill="${labelColor}" stroke="none" font-family="Oswald, sans-serif" font-size="13" font-weight="700">С</text>
      <text x="0" y="47" text-anchor="middle" fill="${labelColor}" stroke="none" font-family="Oswald, sans-serif" font-size="10.5" opacity="0.8">Ю</text>
      <text x="-42" y="4" text-anchor="middle" fill="${labelColor}" stroke="none" font-family="Oswald, sans-serif" font-size="10.5" opacity="0.8">З</text>
      <text x="42" y="4" text-anchor="middle" fill="${labelColor}" stroke="none" font-family="Oswald, sans-serif" font-size="10.5" opacity="0.8">В</text>
    </g>

    <!-- Картуш заголовка карты -->
    <g transform="translate(52, 66)">
      <rect x="-10" y="-28" width="355" height="62" rx="6" fill="${legendBg}" stroke="${legendBorder}" stroke-width="1.2" />
      <text x="2" y="-2" fill="${labelColor}" font-family="Oswald, sans-serif" font-size="24" font-weight="700" letter-spacing="1.6">${escSvg(region.nameRu.toUpperCase())}</text>
      <text x="4" y="18" fill="${labelColor}" font-family="Cormorant Garamond, Georgia, serif" font-style="italic" font-size="15" font-weight="700" opacity="0.82">${escSvg(region.nameEn)} • Сетка ориентирования A1–H8</text>
    </g>

    <!-- Легенда условных обозначений для ориентирования (справа внизу) -->
    <g transform="translate(738, 845)">
      <rect x="0" y="0" width="214" height="106" rx="6" fill="${legendBg}" stroke="${legendBorder}" stroke-width="1.3" />
      <text x="10" y="16" fill="${labelColor}" font-family="Oswald, sans-serif" font-size="10.5" font-weight="700" letter-spacing="0.8">УСЛОВНЫЕ ОБОЗНАЧЕНИЯ:</text>

      <line x1="10" y1="30" x2="42" y2="30" stroke="${railColor}" stroke-width="6" stroke-dasharray="2.2 6" />
      <line x1="10" y1="30" x2="42" y2="30" stroke="${railColor}" stroke-width="2" />
      <text x="50" y="33.5" fill="${labelColor}" font-family="Inter, sans-serif" font-size="10" font-weight="600">Ж/д магистраль</text>

      <line x1="10" y1="45" x2="42" y2="45" stroke="${roadColor}" stroke-width="6" stroke-linecap="round" />
      <line x1="10" y1="45" x2="42" y2="45" stroke="${roadCore}" stroke-width="3" />
      <text x="50" y="48.5" fill="${labelColor}" font-family="Inter, sans-serif" font-size="10" font-weight="600">Шоссе / Дорога</text>

      <line x1="10" y1="60" x2="42" y2="60" stroke="${trailColor}" stroke-width="2.3" stroke-dasharray="3.5 5.5" stroke-linecap="round" />
      <text x="50" y="63.5" fill="${labelColor}" font-family="Inter, sans-serif" font-size="10" font-weight="600">Лесная тропа</text>

      <line x1="10" y1="75" x2="42" y2="75" stroke="${powerColor}" stroke-width="1.5" stroke-dasharray="8 3" />
      <circle cx="26" cy="75" r="2.2" fill="${powerColor}" />
      <text x="50" y="78.5" fill="${labelColor}" font-family="Inter, sans-serif" font-size="10" font-weight="600">Линия ЛЭП (опоры)</text>

      <line x1="10" y1="91" x2="25" y2="91" stroke="${cliffColor}" stroke-width="3" />
      <line x1="15" y1="91" x2="15" y2="97" stroke="${cliffColor}" stroke-width="1.5" />
      <line x1="21" y1="91" x2="21" y2="96" stroke="${cliffColor}" stroke-width="1.5" />
      <rect x="30" y="85" width="13" height="11" fill="${thinIceFill}" stroke="${thinIceStroke}" stroke-width="1.3" stroke-dasharray="3 2" />
      <text x="50" y="94.5" fill="${labelColor}" font-family="Inter, sans-serif" font-size="10" font-weight="600">Обрыв / Тонкий лёд</text>
    </g>

    <!-- Масштабная линейка (слева внизу) -->
    <g transform="translate(54, 935)" stroke="${labelColor}" fill="${labelColor}" opacity="0.82">
      <line x1="0" y1="0" x2="125" y2="0" stroke-width="2.2" />
      <line x1="0" y1="-5" x2="0" y2="5" stroke-width="2" />
      <line x1="62.5" y1="-3" x2="62.5" y2="3" stroke-width="1.5" />
      <line x1="125" y1="-5" x2="125" y2="5" stroke-width="2" />
      <text x="0" y="-9" stroke="none" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">1 сектор сетки ≈ 250 м</text>
    </g>

    <!-- Угольная рамка неисследованного тумана -->
    <rect width="1000" height="1000" fill="url(#charcoal-vignette)" pointer-events="none" />
    <rect x="20" y="20" width="960" height="960" fill="none" stroke="${inkPrimary}" stroke-width="3" stroke-dasharray="45 6 18 5 80 7" opacity="0.5" />
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
