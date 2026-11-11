import L from 'leaflet';
import { MARKER_CATEGORIES } from '../l0-primitives/constants.ts';
import type { CustomNoteIcon, MarkerCategory } from '../l0-primitives/types.ts';

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shortenMarkerLabel(nameRu: string): string {
  const cleaned = nameRu.replace(/\s*\([^)]*\)/g, '').trim();
  return cleaned.length > 24 ? `${cleaned.slice(0, 22)}…` : cleaned;
}

function getCategoryPictogramSvg(category: MarkerCategory): string {
  switch (category) {
    case 'shelter':
      return `<path d="M4 11.5 L12 4.5 L20 11.5 M6.5 10.2 V19.5 H17.5 V10.2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    case 'loot':
      return `<path d="M5 18 L18.5 4.5 M14 4.5 H18.5 V9 M6.5 13.5 L10.5 17.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    case 'bunker':
      return `<circle cx="12" cy="12" r="7.5" stroke="currentColor" stroke-width="2.1" fill="none"/><path d="M12 7 V17 M7 12 H17" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>`;
    case 'workbench':
      return `<path d="M4.5 9.5 H19.5 L17.5 14 H14 V18.5 H10 V14 H6.5 Z M7 18.5 H17" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"/>`;
    case 'transition':
      return `<path d="M5 19 V11 C5 6.8 8.1 4.5 12 4.5 C15.9 4.5 19 6.8 19 11 V19 M9.5 14 L12 11.5 L14.5 14 M12 11.5 V19" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    case 'wildlife':
      return `<path d="M6 6 C7 10 9 11 12 11 C15 11 17 10 18 6 M4 8.5 C6 9.5 8 11 8.5 14 L12 19.5 L15.5 14 C16 11 18 9.5 20 8.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    case 'climb':
      return `<path d="M12 3.5 V20.5 M9 7.5 L15 10.5 M9 13 L15 16" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" fill="none"/>`;
  }
}

export function createCharcoalLeafletIcon(opts: {
  readonly category: MarkerCategory;
  readonly isVisited: boolean;
  readonly isFocused: boolean;
  readonly labelRu?: string;
  readonly showLabel?: boolean;
}): L.DivIcon {
  const meta =
    MARKER_CATEGORIES.find((c) => c.id === opts.category) ?? MARKER_CATEGORIES[0]!;
  const svgInner = getCategoryPictogramSvg(opts.category);

  const borderRing = opts.isFocused
    ? 'box-shadow: 0 0 0 3.5px rgba(240, 154, 62, 0.95), 0 5px 14px rgba(0,0,0,0.85); transform: scale(1.22); z-index: 40;'
    : 'box-shadow: 0 2px 7px rgba(0,0,0,0.7);';

  const opacityStyle = opts.isVisited ? 'opacity: 0.62; filter: saturate(0.55);' : '';
  const visitedBadge = opts.isVisited
    ? `<span style="position:absolute;top:-4px;right:-4px;width:12px;height:12px;border-radius:999px;background:#3dd68c;color:#082014;font-size:8.5px;font-weight:900;display:flex;align-items:center;justify-content:center;border:1.2px solid #121b22;">✓</span>`
    : '';

  const labelPill =
    opts.showLabel && opts.labelRu
      ? `<div style="
          position: absolute;
          top: 28px;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          background: ${opts.isFocused ? 'rgba(217, 119, 36, 0.96)' : 'rgba(18, 26, 34, 0.90)'};
          color: ${opts.isFocused ? '#0b1116' : '#f3efe6'};
          border: 1px solid ${opts.isFocused ? '#ffd699' : 'rgba(148, 163, 184, 0.35)'};
          border-radius: 4px;
          padding: 1px 5px;
          font-family: Inter, sans-serif;
          font-size: 9.5px;
          font-weight: ${opts.isFocused ? '800' : '600'};
          line-height: 1.25;
          pointer-events: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.55);
        ">${escHtml(shortenMarkerLabel(opts.labelRu))}</div>`
      : '';

  // Компактный значок (26x26), чтобы не перекрывать прорисованные на полотне улицы, тропинки и домики!
  const html = `
    <div style="position: relative; width: 26px; height: 26px;">
      <div style="
        position: relative;
        width: 26px;
        height: 26px;
        border-radius: 50% 46% 52% 48%;
        background: rgba(24, 31, 38, 0.92);
        border: 2px solid ${meta.colorHex};
        color: ${meta.colorHex};
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.15s ease;
        ${borderRing}
        ${opacityStyle}
      ">
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">${svgInner}</svg>
        ${visitedBadge}
      </div>
      ${labelPill}
    </div>
  `;

  return L.divIcon({
    className: 'tld-charcoal-marker',
    html,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

export function createStreetViewNodeLeafletIcon(opts: {
  readonly isActive: boolean;
  readonly headingDeg: number;
}): L.DivIcon {
  const glow = opts.isActive
    ? 'box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.55), 0 4px 12px rgba(2, 132, 199, 0.9); transform: scale(1.22);'
    : 'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.72);';

  const html = `
    <div style="
      position: relative;
      width: 24px;
      height: 24px;
      border-radius: 999px;
      background: linear-gradient(135deg, #0284c7, #0369a1);
      border: 2px solid #e0f2fe;
      display: flex;
      align-items: center;
      justify-content: center;
      ${glow}
    ">
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style="transform: rotate(${opts.headingDeg}deg);">
        <path d="M12 3 L17.5 17.5 L12 14.2 L6.5 17.5 Z" fill="#ffffff" />
      </svg>
    </div>
  `;

  return L.divIcon({
    className: 'tld-streetview-node',
    html,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

export function createCustomNoteLeafletIcon(icon: CustomNoteIcon): L.DivIcon {
  const glyph =
    icon === 'danger' ? '!' : icon === 'camp' ? '🔥' : icon === 'arrow' ? '➤' : '✕';
  const color = icon === 'danger' ? '#ef4444' : '#f59e0b';

  const html = `
    <div style="
      width: 26px;
      height: 26px;
      border-radius: 6px;
      transform: rotate(-6deg);
      background: #231c14;
      border: 2px dashed ${color};
      color: ${color};
      font-family: Oswald, sans-serif;
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 8px rgba(0,0,0,0.7);
    ">${glyph}</div>
  `;

  return L.divIcon({
    className: 'tld-custom-note-marker',
    html,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
}
