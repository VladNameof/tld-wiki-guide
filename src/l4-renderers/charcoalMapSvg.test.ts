import { describe, expect, it } from 'vitest';
import { getAllRegions, resolveRegionCartography } from '../l2-models/selectors.ts';
import { buildRegionCharcoalMapDataUrl } from './charcoalMapSvg.ts';

describe('L4 Renderers — Charcoal & Aurora Difficulty-Reactive SVG Atlas', () => {
  it('renders valid 1600x1600 inline SVG maps for all 15 regions across difficulties and themes', () => {
    const regions = getAllRegions();
    expect(regions).toHaveLength(15);

    for (const region of regions) {
      const cartVoy = resolveRegionCartography(region.id, 'voyageur');
      const dataUrlVoy = buildRegionCharcoalMapDataUrl({
        region,
        theme: 'charcoal',
        difficulty: 'voyageur',
        cartography: cartVoy,
        showMicroDetails: true,
      });

      expect(dataUrlVoy.startsWith('data:image/svg+xml;utf8,')).toBe(true);
      const svgVoy = decodeURIComponent(dataUrlVoy.slice('data:image/svg+xml;utf8,'.length));
      expect(svgVoy).toContain('width="1600" height="1600"');
      expect(svgVoy).toContain('СЛОЙ СЛОЖНОСТИ: СТРАННИК');
      expect(svgVoy).not.toContain('<image ');

      const cartLoper = resolveRegionCartography(region.id, 'interloper');
      const dataUrlLoper = buildRegionCharcoalMapDataUrl({
        region,
        theme: 'aurora',
        difficulty: 'interloper',
        cartography: cartLoper,
        showMicroDetails: true,
      });

      const svgLoper = decodeURIComponent(dataUrlLoper.slice('data:image/svg+xml;utf8,'.length));
      expect(svgLoper).toContain('СЛОЙ СЛОЖНОСТИ: НЕЗВАНЫЙ ГОСТЬ');
      expect(svgLoper).not.toBe(svgVoy);
    }
  });
});
