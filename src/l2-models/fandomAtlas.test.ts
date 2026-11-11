import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FANDOM_MAPS_MANIFEST,
  leafletCoordsToWorldXZ,
  worldXZToLeafletCoords,
} from './data/fandomMapsManifest.ts';
import { getAllRegions } from './selectors.ts';

describe('fandomMapsManifest & extracted 3D terrain assets', () => {
  it('covers all 15 regions with calibrated sheets, Fandom webp images, and Unity 3D terrain files', () => {
    const regions = getAllRegions();
    expect(regions).toHaveLength(15);

    const projectRoot = path.resolve(process.cwd());
    for (const r of regions) {
      const meta = FANDOM_MAPS_MANIFEST[r.id];
      expect(meta, `Missing Fandom sheet manifest for ${r.id}`).toBeDefined();
      expect(Math.max(meta!.sheetW, meta!.sheetH)).toBe(1000);

      const webpRel = meta!.file.replace(/^\.\//, '');
      expect(fs.existsSync(path.join(projectRoot, 'public', webpRel)), `Missing ${webpRel}`).toBe(true);
      expect(
        fs.existsSync(path.join(projectRoot, 'public', 'terrain-3d', `${r.id}.json`)),
        `Missing terrain-3d/${r.id}.json`,
      ).toBe(true);

      // Проверяется обратимость преобразования координат листа <-> мира игры (в т.ч. для повёрнутых карт PV и BR)
      const midLeaflet = { x: meta!.sheetW * 0.52, y: meta!.sheetH * 0.48 };
      const world = leafletCoordsToWorldXZ(meta!, midLeaflet.x, midLeaflet.y);
      const back = worldXZToLeafletCoords(meta!, world.worldX, world.worldZ);
      expect(Math.abs(back.x - midLeaflet.x)).toBeLessThan(1.5);
      expect(Math.abs(back.y - midLeaflet.y)).toBeLessThan(1.5);
    }
  });
});
