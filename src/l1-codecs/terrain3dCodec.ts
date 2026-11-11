import type {
  Terrain3DRawJson,
  Terrain3DStructureKind,
} from '../l0-primitives/types.ts';

export interface DecodedTerrain3D {
  readonly raw: Terrain3DRawJson;
  readonly elevations: Float32Array;
}

export interface NearbyStructureInfo {
  readonly kind: Terrain3DStructureKind | 'label';
  readonly displayName: string;
  readonly worldX: number;
  readonly worldY: number;
  readonly worldZ: number;
  readonly distanceM: number;
  readonly bearingRu: string;
}

function decodeBase64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined' && typeof window === 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export function decodeTerrain3DJson(raw: Terrain3DRawJson): DecodedTerrain3D {
  const bytes = decodeBase64ToBytes(raw.heightGridU16B64);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = raw.gridRes * raw.gridRes;
  const elevations = new Float32Array(count);
  const spanY = raw.bounds.maxY - raw.bounds.minY;

  for (let i = 0; i < count; i += 1) {
    const q = i * 2 + 1 < bytes.length ? view.getUint16(i * 2, true) : 0;
    elevations[i] = raw.bounds.minY + (q / 65535) * spanY;
  }

  return { raw, elevations };
}

export function sampleTerrainElevation(
  terrain: DecodedTerrain3D,
  worldX: number,
  worldZ: number,
): number {
  const { bounds, gridRes } = terrain.raw;
  const u = Math.max(
    0,
    Math.min(1, (worldX - bounds.minX) / Math.max(1, bounds.maxX - bounds.minX)),
  );
  const v = Math.max(
    0,
    Math.min(1, (worldZ - bounds.minZ) / Math.max(1, bounds.maxZ - bounds.minZ)),
  );

  const fx = u * (gridRes - 1);
  const fz = v * (gridRes - 1);
  const x0 = Math.min(gridRes - 2, Math.floor(fx));
  const z0 = Math.min(gridRes - 2, Math.floor(fz));
  const tx = fx - x0;
  const tz = fz - z0;

  const h00 = terrain.elevations[z0 * gridRes + x0] ?? bounds.minY;
  const h10 = terrain.elevations[z0 * gridRes + x0 + 1] ?? bounds.minY;
  const h01 = terrain.elevations[(z0 + 1) * gridRes + x0] ?? bounds.minY;
  const h11 = terrain.elevations[(z0 + 1) * gridRes + x0 + 1] ?? bounds.minY;

  return (
    h00 * (1 - tx) * (1 - tz) +
    h10 * tx * (1 - tz) +
    h01 * (1 - tx) * tz +
    h11 * tx * tz
  );
}

export function sampleTerrainSlopeDeg(
  terrain: DecodedTerrain3D,
  worldX: number,
  worldZ: number,
): number {
  const eps = 6;
  const dx =
    (sampleTerrainElevation(terrain, worldX + eps, worldZ) -
      sampleTerrainElevation(terrain, worldX - eps, worldZ)) /
    (eps * 2);
  const dz =
    (sampleTerrainElevation(terrain, worldX, worldZ + eps) -
      sampleTerrainElevation(terrain, worldX, worldZ - eps)) /
    (eps * 2);
  const grad = Math.hypot(dx, dz);
  return Math.round((Math.atan(grad) * 180) / Math.PI);
}

export function formatCompassBearingRu(dx: number, dz: number): string {
  // Unity world: +Z = Север (N), +X = Восток (E)
  const rad = Math.atan2(dx, dz);
  const deg = ((rad * 180) / Math.PI + 360) % 360;
  const dirs = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
  return dirs[Math.round(deg / 45) % 8] ?? 'С';
}

function prettifyPrefabName(prefab: string, kind: Terrain3DStructureKind | 'label'): string {
  const cleaned = prefab
    .replace(/^(STRSPAWN_|STR_|OBJ_|TRN_|TRIGGER_LocationLabel_|Group_)/, '')
    .replace(/_Prefab.*$/i, '')
    .replace(/_LOD\d+$/i, '')
    .replace(/[_]+/g, ' ')
    .trim();

  if (cleaned.length > 0 && cleaned.length <= 36) return cleaned;
  switch (kind) {
    case 'building':
      return 'Постройка';
    case 'trailer':
      return 'Жилой прицеп';
    case 'tower':
      return 'Наблюдательная вышка';
    case 'bridge':
      return 'Мост / Переправа';
    case 'cave':
      return 'Пещера / Туннель';
    case 'vehicle':
      return 'Транспорт / Вагон';
    case 'road':
      return 'Дорога / Насыпь';
    case 'label':
      return 'Локация';
  }
}

export function getNearbyStructures(
  terrain: DecodedTerrain3D,
  worldX: number,
  worldZ: number,
  maxRadiusM = 450,
  limit = 10,
): readonly NearbyStructureInfo[] {
  const items: NearbyStructureInfo[] = [];

  for (const [labelName, x, y, z] of terrain.raw.labels) {
    const dist = Math.hypot(x - worldX, z - worldZ);
    if (dist <= maxRadiusM) {
      items.push({
        kind: 'label',
        displayName: labelName,
        worldX: x,
        worldY: y,
        worldZ: z,
        distanceM: Math.round(dist),
        bearingRu: formatCompassBearingRu(x - worldX, z - worldZ),
      });
    }
  }

  for (const [kind, prefab, x, y, z] of terrain.raw.structures) {
    if (kind === 'road') continue;
    const dist = Math.hypot(x - worldX, z - worldZ);
    if (dist <= maxRadiusM) {
      items.push({
        kind,
        displayName: prettifyPrefabName(prefab, kind),
        worldX: x,
        worldY: y,
        worldZ: z,
        distanceM: Math.round(dist),
        bearingRu: formatCompassBearingRu(x - worldX, z - worldZ),
      });
    }
  }

  items.sort((a, b) => a.distanceM - b.distanceM);
  return items.slice(0, limit);
}
