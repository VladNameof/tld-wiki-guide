import { MAP_CANVAS_SIZE } from '../l0-primitives/constants.ts';
import type { MapThemeId, RegionModel } from '../l0-primitives/types.ts';

function toSvgY(mapY: number): number {
  return MAP_CANVAS_SIZE - mapY;
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
 * Генерирует атмосферную угольную SVG-карту региона в стилистике картографии углём из The Long Dark
 * и возвращает готовый Data URL для L.imageOverlay в Leaflet (L.CRS.Simple).
 */
export function buildRegionCharcoalMapDataUrl(region: RegionModel, theme: MapThemeId): string {
  const isCharcoal = theme === 'charcoal';
  const seed = deterministicSeed(region.id);

  const bgCenter = isCharcoal ? '#d7ceb9' : '#13202b';
  const bgMid = isCharcoal ? '#c5baa2' : '#0d1720';
  const bgEdge = isCharcoal ? '#8f846e' : '#060b10';
  const charcoalFog = isCharcoal ? '#23201c' : '#030609';

  const inkPrimary = isCharcoal ? '#2b2620' : '#cbd5e1';
  const inkMuted = isCharcoal ? 'rgba(46, 40, 33, 0.24)' : 'rgba(148, 163, 184, 0.16)';
  const lakeFill = isCharcoal ? 'rgba(136, 164, 179, 0.58)' : 'rgba(56, 139, 178, 0.28)';
  const lakeStroke = isCharcoal ? '#3f525e' : '#6cb4cc';
  const railColor = isCharcoal ? '#2a231d' : '#e09f5a';
  const roadColor = isCharcoal ? '#574b3d' : '#94a3b8';
  const pineColor = isCharcoal ? 'rgba(42, 48, 39, 0.52)' : 'rgba(74, 128, 108, 0.38)';
  const labelColor = isCharcoal ? '#2c251e' : '#dce6f0';

  // Детерминированные топографические изолинии высот
  const contours: string[] = [];
  for (let i = 0; i < 7; i++) {
    const cx = 160 + ((seed + i * 197) % 680);
    const cy = 160 + ((seed * 3 + i * 251) % 680);
    const rx = 95 + ((seed + i * 83) % 130);
    const ry = 65 + ((seed + i * 61) % 105);
    const rot = ((seed + i * 37) % 60) - 30;
    contours.push(
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="none" stroke="${inkMuted}" stroke-width="1.4" stroke-dasharray="14 6 5 4" />`,
      `<ellipse cx="${cx}" cy="${cy}" rx="${Math.round(rx * 0.64)}" ry="${Math.round(ry * 0.64)}" transform="rotate(${rot} ${cx} ${cy})" fill="none" stroke="${inkMuted}" stroke-width="1.1" />`,
    );
  }

  // Отрисовка озёр, рек, дорог, железных дорог, хребтов и хвойных массивов
  const featureMarkup: string[] = [];

  for (const feat of region.topography) {
    if (feat.kind === 'lake') {
      const d = pointsToSvgPath(feat.points, true);
      const [first] = feat.points;
      const center = feat.points.reduce(
        (acc, p) => [acc[0] + p[0] / feat.points.length, acc[1] + p[1] / feat.points.length],
        [0, 0],
      );
      featureMarkup.push(`
        <g filter="url(#rough-charcoal)">
          <path d="${d}" fill="${lakeFill}" stroke="${lakeStroke}" stroke-width="3" stroke-linejoin="round" />
          <path d="${d}" fill="url(#ice-hatch)" opacity="0.45" />
        </g>
      `);
      if (feat.labelRu && first) {
        featureMarkup.push(`
          <text x="${Math.round(center[0])}" y="${Math.round(toSvgY(center[1]))}" text-anchor="middle" fill="${lakeStroke}" font-family="Cormorant Garamond, Georgia, serif" font-style="italic" font-weight="700" font-size="21" letter-spacing="1.5" opacity="0.88">${feat.labelRu}</text>
        `);
      }
    } else if (feat.kind === 'river') {
      const d = pointsToSvgPath(feat.points, false);
      featureMarkup.push(`
        <path d="${d}" fill="none" stroke="${lakeFill}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" filter="url(#rough-charcoal)" />
        <path d="${d}" fill="none" stroke="${lakeStroke}" stroke-width="2.4" stroke-dasharray="10 5" stroke-linecap="round" filter="url(#rough-charcoal)" />
      `);
    } else if (feat.kind === 'railway') {
      const d = pointsToSvgPath(feat.points, false);
      featureMarkup.push(`
        <path d="${d}" fill="none" stroke="${railColor}" stroke-width="8" stroke-dasharray="2.5 9" opacity="0.75" />
        <path d="${d}" fill="none" stroke="${railColor}" stroke-width="2.4" opacity="0.92" />
      `);
    } else if (feat.kind === 'road') {
      const d = pointsToSvgPath(feat.points, false);
      featureMarkup.push(`
        <path d="${d}" fill="none" stroke="${roadColor}" stroke-width="6.5" stroke-linecap="round" opacity="0.32" />
        <path d="${d}" fill="none" stroke="${roadColor}" stroke-width="2" stroke-dasharray="12 7" stroke-linecap="round" opacity="0.85" />
      `);
    } else if (feat.kind === 'ridge') {
      for (let i = 0; i < feat.points.length; i++) {
        const pt = feat.points[i]!;
        const px = pt[0];
        const py = toSvgY(pt[1]);
        featureMarkup.push(`
          <g transform="translate(${px}, ${py})" stroke="${inkPrimary}" stroke-width="2.2" fill="none" opacity="0.55">
            <path d="M -38 18 L -12 -18 L 14 16 M -2 -6 L 22 -24 L 48 18" />
            <path d="M -12 -18 L -18 6 M 22 -24 L 15 8" stroke-width="1.3" opacity="0.65" />
          </g>
        `);
      }
    } else if (feat.kind === 'forest') {
      for (const [fx, fy] of feat.points) {
        const sy = toSvgY(fy);
        const offsets = [
          [0, 0, 1],
          [-26, 14, 0.85],
          [24, 11, 0.9],
          [-12, -22, 0.8],
          [19, -18, 0.78],
          [42, -4, 0.75],
        ];
        for (const [ox, oy, sc] of offsets) {
          featureMarkup.push(`
            <g transform="translate(${fx + ox!}, ${sy + oy!}) scale(${sc})" fill="${pineColor}">
              <polygon points="0,-20 -9,-5 -4,-5 -12,7 -5,7 -14,19 14,19 5,7 12,7 4,-5 9,-5" />
              <rect x="-1.8" y="19" width="3.6" height="6" />
            </g>
          `);
        }
      }
    }
  }

  // Декоративные ели по краям карты для ощущения живого таёжного чертежа
  const borderPines: string[] = [];
  for (let i = 0; i < 22; i++) {
    const px = 85 + ((seed * 7 + i * 139) % 830);
    const py = 95 + ((seed * 11 + i * 173) % 810);
    if (px > 210 && px < 790 && py > 180 && py < 820) continue;
    borderPines.push(`
      <g transform="translate(${px}, ${py}) scale(0.72)" fill="${pineColor}" opacity="0.65">
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

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
    <defs>
      <radialGradient id="paper-grad" cx="50%" cy="50%" r="62%">
        <stop offset="0%" stop-color="${bgCenter}" />
        <stop offset="72%" stop-color="${bgMid}" />
        <stop offset="100%" stop-color="${bgEdge}" />
      </radialGradient>
      <radialGradient id="charcoal-vignette" cx="50%" cy="50%" r="56%">
        <stop offset="76%" stop-color="${charcoalFog}" stop-opacity="0" />
        <stop offset="94%" stop-color="${charcoalFog}" stop-opacity="${isCharcoal ? '0.42' : '0.68'}" />
        <stop offset="100%" stop-color="${charcoalFog}" stop-opacity="${isCharcoal ? '0.82' : '0.95'}" />
      </radialGradient>
      ${auroraGlow}
      <pattern id="ice-hatch" width="18" height="18" patternTransform="rotate(28)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="18" stroke="${lakeStroke}" stroke-width="0.9" opacity="0.35" />
      </pattern>
      <pattern id="grid-subtle" width="100" height="100" patternUnits="userSpaceOnUse">
        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="${inkMuted}" stroke-width="0.8" stroke-dasharray="3 5" />
      </pattern>
      <filter id="rough-charcoal" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="${seed % 100}" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="4.5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>

    <!-- Базовый лист пергамента / ночного сланца -->
    <rect width="1000" height="1000" fill="url(#paper-grad)" />
    ${!isCharcoal ? '<rect width="1000" height="1000" fill="url(#aurora-band-1)" /><rect width="1000" height="1000" fill="url(#aurora-band-2)" />' : ''}
    <rect width="1000" height="1000" fill="url(#grid-subtle)" opacity="0.65" />

    <!-- Изолинии высот -->
    <g>${contours.join('')}</g>

    <!-- Фоновые таёжные ели -->
    <g>${borderPines.join('')}</g>

    <!-- Топография региона -->
    <g>${featureMarkup.join('')}</g>

    <!-- Компас выжившего (Роза ветров) -->
    <g transform="translate(905, 105)" stroke="${labelColor}" fill="none" opacity="0.82">
      <circle cx="0" cy="0" r="38" stroke-width="1.6" stroke-dasharray="6 3" />
      <circle cx="0" cy="0" r="5" fill="${labelColor}" />
      <polygon points="0,-34 -7,-8 0,-13 7,-8" fill="${isCharcoal ? '#8f2d22' : '#f09a3e'}" stroke="none" />
      <line x1="0" y1="8" x2="0" y2="32" stroke-width="1.6" />
      <line x1="-32" y1="0" x2="32" y2="0" stroke-width="1.3" />
      <text x="0" y="-43" text-anchor="middle" fill="${labelColor}" stroke="none" font-family="Oswald, sans-serif" font-size="14" font-weight="700">С</text>
      <text x="0" y="52" text-anchor="middle" fill="${labelColor}" stroke="none" font-family="Oswald, sans-serif" font-size="11" opacity="0.75">Ю</text>
      <text x="-46" y="4" text-anchor="middle" fill="${labelColor}" stroke="none" font-family="Oswald, sans-serif" font-size="11" opacity="0.75">З</text>
      <text x="46" y="4" text-anchor="middle" fill="${labelColor}" stroke="none" font-family="Oswald, sans-serif" font-size="11" opacity="0.75">В</text>
    </g>

    <!-- Картуш заголовка зарисованной углём карты -->
    <g transform="translate(56, 62)">
      <text x="0" y="0" fill="${labelColor}" font-family="Oswald, sans-serif" font-size="28" font-weight="700" letter-spacing="2" opacity="0.9">${region.nameRu.toUpperCase()}</text>
      <text x="2" y="22" fill="${labelColor}" font-family="Cormorant Garamond, Georgia, serif" font-style="italic" font-size="16" font-weight="600" letter-spacing="1.4" opacity="0.72">${region.nameEn} • Зарисовано древесным углём</text>
      <line x1="0" y1="30" x2="290" y2="30" stroke="${labelColor}" stroke-width="1.8" stroke-dasharray="28 4 8 3" opacity="0.55" />
    </g>

    <!-- Масштабная линейка внизу -->
    <g transform="translate(60, 945)" stroke="${labelColor}" fill="${labelColor}" opacity="0.72">
      <line x1="0" y1="0" x2="140" y2="0" stroke-width="2" />
      <line x1="0" y1="-5" x2="0" y2="5" stroke-width="2" />
      <line x1="70" y1="-3" x2="70" y2="3" stroke-width="1.5" />
      <line x1="140" y1="-5" x2="140" y2="5" stroke-width="2" />
      <text x="0" y="-10" stroke="none" font-family="JetBrains Mono, monospace" font-size="11">0 м</text>
      <text x="112" y="-10" stroke="none" font-family="JetBrains Mono, monospace" font-size="11">~1 км</text>
    </g>

    <!-- Угольная рваная рамка краёв неисследованного тумана -->
    <rect width="1000" height="1000" fill="url(#charcoal-vignette)" pointer-events="none" />
    <rect x="18" y="18" width="964" height="964" fill="none" stroke="${inkPrimary}" stroke-width="3.5" stroke-dasharray="45 6 18 5 80 7" opacity="0.45" filter="url(#rough-charcoal)" />
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
