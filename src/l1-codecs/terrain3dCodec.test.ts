import { describe, expect, it } from 'vitest';
import type { Terrain3DRawJson } from '../l0-primitives/types.ts';
import {
  decodeTerrain3DJson,
  formatCompassBearingRu,
  getNearbyStructures,
  sampleTerrainElevation,
  sampleTerrainSlopeDeg,
} from './terrain3dCodec.ts';

function encodeUint16Grid(values: number[]): string {
  const buf = Buffer.alloc(values.length * 2);
  values.forEach((v, i) => buf.writeUInt16LE(v, i * 2));
  return buf.toString('base64');
}

describe('terrain3dCodec', () => {
  it('decodes 16-bit heightfield and samples bilinear elevation & slope accurately', () => {
    // 3x3 grid over X=[0..100], Z=[0..100], Y=[10..110]: sloping upward along +X and +Z
    const raw: Terrain3DRawJson = {
      regionId: 'test-region',
      gridRes: 3,
      bounds: { minX: 0, maxX: 100, minZ: 0, maxZ: 100, minY: 10, maxY: 110 },
      terrains: ['MainTerrain'],
      waterPlanes: [],
      labels: [['CampOffice', 50, 60, 80]],
      structures: [['building', 'STRSPAWN_Cabin_Prefab', 50, 60, 80, 0]],
      rocks: [],
      trees: [],
      heightGridU16B64: encodeUint16Grid([
        0, 32768, 65535,
        0, 32768, 65535,
        0, 32768, 65535,
      ]),
    };

    const decoded = decodeTerrain3DJson(raw);
    expect(sampleTerrainElevation(decoded, 0, 50)).toBeCloseTo(10, 1);
    expect(sampleTerrainElevation(decoded, 50, 50)).toBeCloseTo(60, 0);
    expect(sampleTerrainElevation(decoded, 100, 50)).toBeCloseTo(110, 1);
    expect(sampleTerrainSlopeDeg(decoded, 50, 50)).toBe(45);
    expect(formatCompassBearingRu(0, 100)).toBe('С');
    expect(formatCompassBearingRu(100, 0)).toBe('В');

    const nearby = getNearbyStructures(decoded, 50, 20, 200, 5);
    expect(nearby.length).toBeGreaterThanOrEqual(2);
    expect(nearby[0]?.bearingRu).toBe('С');
    expect(nearby[0]?.distanceM).toBe(60);
  });
});
