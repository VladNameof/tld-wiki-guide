import { describe, expect, it } from 'vitest';
import { getAllRegions, resolveRegionCartography } from '../l2-models/selectors.ts';
import { ATLAS_LEGEND_GROUPS } from './atlasLegendCatalog.ts';
import { buildRegionCharcoalMapDataUrl } from './charcoalMapSvg.ts';

describe('L4 Renderers — Charcoal & Aurora Difficulty-Reactive SVG Atlas & Full Legend', () => {
  it('provides 50+ categorized legend symbols with non-empty SVG vector icons', () => {
    const allItems = ATLAS_LEGEND_GROUPS.flatMap((g) => g.items);
    expect(ATLAS_LEGEND_GROUPS).toHaveLength(6);
    expect(allItems.length).toBeGreaterThanOrEqual(50);
    for (const item of allItems) {
      expect(item.renderIcon(true).trim().length).toBeGreaterThan(10);
      expect(item.renderIcon(false).trim().length).toBeGreaterThan(10);
    }
  });

  it('renders valid 2144x2412 inline SVG maps with survey ruler, sub-locations, and 36-item sheet legend for all 15 regions', () => {
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
      expect(svgVoy).toContain('width="2144" height="2412"');
      expect(svgVoy).toContain('СЛОЙ СЛОЖНОСТИ: СТРАННИК');
      expect(svgVoy).toContain('THE LONG DARK • АТЛАС');
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
