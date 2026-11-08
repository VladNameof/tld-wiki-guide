import { MAP_CANVAS_SIZE } from './constants.ts';

export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesSearchQuery(query: string, ...haystacks: readonly string[]): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const tokens = normalizedQuery.split(' ').filter(Boolean);
  const combined = normalizeSearchText(haystacks.join(' '));
  return tokens.every((token) => combined.includes(token));
}

export function clampMapCoord(value: number): number {
  if (!Number.isFinite(value)) return MAP_CANVAS_SIZE / 2;
  return Math.max(0, Math.min(MAP_CANVAS_SIZE, Math.round(value)));
}

/**
 * Переводит координаты (x: 0..1000 слева направо, y: 0..1000 снизу вверх)
 * в буквенно-цифровой квадрат топографической сетки A1..H8 (A..H по X, 1..8 сверху вниз).
 */
export function formatGridSector(x: number, y: number): string {
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const colIdx = Math.max(0, Math.min(7, Math.floor((x / MAP_CANVAS_SIZE) * 8)));
  const rowFromTop = Math.max(1, Math.min(8, Math.floor(((MAP_CANVAS_SIZE - y) / MAP_CANVAS_SIZE) * 8) + 1));
  return `${cols[colIdx]}${rowFromTop}`;
}

export function formatWeightKg(kg: number): string {
  return `${kg.toFixed(2).replace(/\.?0+$/, '')} кг`;
}

export function formatSignedTempC(tempC: number): string {
  const sign = tempC > 0 ? '+' : '';
  return `${sign}${tempC}°C`;
}
