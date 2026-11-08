import L from 'leaflet';
import { MARKER_CATEGORIES } from '../l0-primitives/constants.ts';
import type { CustomNoteIcon, MarkerCategory } from '../l0-primitives/types.ts';

function getCategoryPictogramSvg(category: MarkerCategory): string {
  switch (category) {
    case 'shelter':
      return `<path d="M4 11.5 L12 4.5 L20 11.5 M6.5 10.2 V19.5 H17.5 V10.2" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    case 'loot':
      return `<path d="M5 18 L18.5 4.5 M14 4.5 H18.5 V9 M6.5 13.5 L10.5 17.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    case 'bunker':
      return `<circle cx="12" cy="12" r="7.5" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 7 V17 M7 12 H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
    case 'workbench':
      return `<path d="M4.5 9.5 H19.5 L17.5 14 H14 V18.5 H10 V14 H6.5 Z M7 18.5 H17" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" fill="none"/>`;
    case 'transition':
      return `<path d="M5 19 V11 C5 6.8 8.1 4.5 12 4.5 C15.9 4.5 19 6.8 19 11 V19 M9.5 14 L12 11.5 L14.5 14 M12 11.5 V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    case 'wildlife':
      return `<path d="M6 6 C7 10 9 11 12 11 C15 11 17 10 18 6 M4 8.5 C6 9.5 8 11 8.5 14 L12 19.5 L15.5 14 C16 11 18 9.5 20 8.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    case 'climb':
      return `<path d="M12 3.5 V20.5 M9 7.5 L15 10.5 M9 13 L15 16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>`;
  }
}

export function createCharcoalLeafletIcon(opts: {
  readonly category: MarkerCategory;
  readonly isVisited: boolean;
  readonly isFocused: boolean;
}): L.DivIcon {
  const meta =
    MARKER_CATEGORIES.find((c) => c.id === opts.category) ?? MARKER_CATEGORIES[0]!;
  const svgInner = getCategoryPictogramSvg(opts.category);

  const borderRing = opts.isFocused
    ? 'box-shadow: 0 0 0 4px rgba(240, 154, 62, 0.85), 0 6px 16px rgba(0,0,0,0.75); transform: scale(1.18);'
    : 'box-shadow: 0 3px 10px rgba(0,0,0,0.65);';

  const opacityStyle = opts.isVisited ? 'opacity: 0.62; filter: saturate(0.55);' : '';
  const visitedBadge = opts.isVisited
    ? `<span style="position:absolute;top:-5px;right:-5px;width:15px;height:15px;border-radius:999px;background:#3dd68c;color:#082014;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;border:1.5px solid #121b22;">✓</span>`
    : '';

  const html = `
    <div style="
      position: relative;
      width: 34px;
      height: 34px;
      border-radius: 50% 46% 52% 48%;
      background: #1b2228;
      border: 2.4px solid ${meta.colorHex};
      color: ${meta.colorHex};
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s ease;
      ${borderRing}
      ${opacityStyle}
    ">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">${svgInner}</svg>
      ${visitedBadge}
    </div>
  `;

  return L.divIcon({
    className: 'tld-charcoal-marker',
    html,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

export function createCustomNoteLeafletIcon(icon: CustomNoteIcon): L.DivIcon {
  const glyph =
    icon === 'danger' ? '!' : icon === 'camp' ? '🔥' : icon === 'arrow' ? '➤' : '✕';
  const color = icon === 'danger' ? '#ef4444' : '#f59e0b';

  const html = `
    <div style="
      width: 30px;
      height: 30px;
      border-radius: 6px;
      transform: rotate(-6deg);
      background: #231c14;
      border: 2px dashed ${color};
      color: ${color};
      font-family: Oswald, sans-serif;
      font-weight: 700;
      font-size: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 10px rgba(0,0,0,0.7);
    ">${glyph}</div>
  `;

  return L.divIcon({
    className: 'tld-custom-note-marker',
    html,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}
