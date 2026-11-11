import { describe, expect, it } from 'vitest';
import { MARKER_CATEGORIES } from '../l0-primitives/constants.ts';
import {
  formatGridSector,
  matchesSearchQuery,
  normalizeSearchText,
} from '../l0-primitives/textUtils.ts';
import {
  parseFandomQueryResponse,
  sanitizeUntrustedWikiText,
  validateFandomUrl,
} from '../l1-codecs/fandomCodec.ts';
import { parseSurvivorJournalJson } from '../l1-codecs/journalCodec.ts';
import {
  AFFLICTION_ENTRIES,
  WIKI_ITEMS,
  WILDLIFE_ENTRIES,
} from '../l2-models/data/encyclopediaData.ts';
import {
  deconflictLeafletMarkers,
  resolveDeconflictedAtlasLayout,
} from '../l2-models/deconflictCartography.ts';
import {
  computeRegionProgress,
  filterRegionMarkers,
  getAllLeopardTrixGuides,
  getAllRegions,
  getAllStreetViewNodes,
  getEffectiveLootLines,
  getRegionStreetViewNodes,
  getStreetViewNodeById,
  getStreetViewVideoMeta,
  getWikiImageUrl,
  resolveRegionCartography,
  searchLocalEncyclopedia,
} from '../l2-models/selectors.ts';
import { TldCommandEngine } from './commandRegistry.ts';

describe('L0 Primitives — Russian search normalization & Grid Sector Oracle', () => {
  it('normalizes ё to е and matches multi-token queries', () => {
    expect(normalizeSearchText('Охотничье ружьё!')).toBe('охотничье ружье');
    expect(matchesSearchQuery('ружье вогана', 'Винтовка Вогана — уникальное ружьё на ГЭС')).toBe(
      true,
    );
  });

  it('converts 0..1000 map coordinates into A1..H8 topographic grid sectors', () => {
    expect(formatGridSector(0, 1000)).toBe('A1');
    expect(formatGridSector(999, 0)).toBe('H8');
    expect(formatGridSector(520, 410)).toBe('E5');
  });
});

describe('L1 Codecs — Prompt Defense & Untrusted Input Sanitization', () => {
  it('strips script tags, HTML, and MediaWiki templates from untrusted input', () => {
    const dirty =
      '<script>alert("xss")</script><b>Загадочное</b> {{Infobox|secret=1}} [[Милтон|Горный городок]]';
    expect(sanitizeUntrustedWikiText(dirty)).toBe('Загадочное Горный городок');
  });

  it('allows only HTTPS Fandom / Wikia URLs and rejects javascript: or external hosts', () => {
    expect(validateFandomUrl('javascript:alert(1)')).toBeNull();
    expect(validateFandomUrl('http://the-long-dark.fandom.com/ru/wiki/Test')).toBeNull();
    expect(validateFandomUrl('https://evil.example.com/ru/wiki/Test')).toBeNull();
    expect(validateFandomUrl('https://the-long-dark.fandom.com/ru/wiki/Волк')).toBe(
      'https://the-long-dark.fandom.com/ru/wiki/%D0%92%D0%BE%D0%BB%D0%BA',
    );
  });

  it('validates and clamps survivor journal JSON coordinates and sanitizes notes', () => {
    const raw = JSON.stringify({
      visitedMarkerIds: ['ml-camp-office', 'ml-camp-office', 123],
      customNotes: [
        {
          id: 'n1',
          regionId: 'mystery-lake',
          x: 1450,
          y: -90,
          title: '<img src=x onerror=alert(1)>Тайник с мясом',
          note: 'У рыбацкой будки',
          icon: 'unknown-icon',
        },
      ],
    });

    const parsed = parseSurvivorJournalJson(raw);
    expect(parsed.visitedMarkerIds).toEqual(['ml-camp-office']);
    expect(parsed.customNotes).toHaveLength(1);
    expect(parsed.customNotes[0]?.x).toBe(1000);
    expect(parsed.customNotes[0]?.y).toBe(0);
    expect(parsed.customNotes[0]?.title).toBe('Тайник с мясом');
    expect(parsed.customNotes[0]?.icon).toBe('stash');
  });

  it('parses MediaWiki query pages safely (both extracts and Fandom revisions/slots)', () => {
    const articles = parseFandomQueryResponse({
      query: {
        pages: {
          '10': {
            pageid: 10,
            title: 'Загадочное озеро',
            revisions: [
              {
                slots: {
                  main: {
                    '*': "{{Инфобокс Локация|сложность=Лёгкая}} '''Загадочное озеро''' — [[Регионы|центральный регион]] острова.",
                  },
                },
              },
            ],
            fullurl: 'https://the-long-dark.fandom.com/ru/wiki/Загадочное_озеро',
          },
        },
      },
    });
    expect(articles).toHaveLength(1);
    expect(articles[0]?.extract).toBe('Загадочное озеро — центральный регион острова.');
  });
});

describe('L2 Models — Difficulty Oracle & Encyclopedia Search', () => {
  const allCats = new Set(MARKER_CATEGORIES.map((c) => c.id));

  it('hides firearm-only caches on Interloper and Misery difficulties', () => {
    const stalkerMarkers = filterRegionMarkers({
      regionId: 'mystery-lake',
      difficulty: 'stalker',
      enabledCategories: allCats,
    });
    const interloperMarkers = filterRegionMarkers({
      regionId: 'mystery-lake',
      difficulty: 'interloper',
      enabledCategories: allCats,
    });

    expect(stalkerMarkers.some((m) => m.id === 'ml-rifle-cache-alans')).toBe(true);
    expect(interloperMarkers.some((m) => m.id === 'ml-rifle-cache-alans')).toBe(false);
  });

  it('switches loot descriptions to Interloper tables on low-loot difficulties', () => {
    const [campOffice] = filterRegionMarkers({
      regionId: 'mystery-lake',
      difficulty: 'interloper',
      enabledCategories: allCats,
      searchQuery: 'Администрация турбазы',
    });
    expect(campOffice).toBeDefined();
    const lines = getEffectiveLootLines(campOffice!, 'interloper');
    expect(lines.join(' ')).toContain('Увеличительного стекла');
  });

  it('computes accurate region exploration percentage and searches across categories', () => {
    const stats = computeRegionProgress(
      'mystery-lake',
      'interloper',
      new Set(['ml-camp-office', 'ml-trappers-cabin']),
    );
    expect(stats.visitedCount).toBe(2);
    expect(stats.totalMarkers).toBeGreaterThanOrEqual(12);

    const hits = searchLocalEncyclopedia('технический рюкзак');
    expect(hits.length).toBeGreaterThan(0);
  });

  it('guarantees every region, item, wildlife, and affliction resolves a local .webp photo', () => {
    const regions = getAllRegions();
    expect(regions.length).toBe(15);
    for (const r of regions) {
      expect(getWikiImageUrl(r.imageKey), `Missing image for region ${r.id}`).toMatch(
        /^\.\/wiki-images\/.+\.webp$/,
      );
    }
    for (const item of WIKI_ITEMS) {
      expect(getWikiImageUrl(item.imageKey), `Missing image for item ${item.id}`).toMatch(
        /^\.\/wiki-images\/.+\.webp$/,
      );
    }
    for (const w of WILDLIFE_ENTRIES) {
      expect(getWikiImageUrl(w.imageKey), `Missing image for wildlife ${w.id}`).toMatch(
        /^\.\/wiki-images\/.+\.webp$/,
      );
    }
    for (const a of AFFLICTION_ENTRIES) {
      expect(getWikiImageUrl(a.imageKey), `Missing image for affliction ${a.id}`).toMatch(
        /^\.\/wiki-images\/.+\.webp$/,
      );
    }
  });

  it('dynamically burns houses, removes climbing ropes, and swaps firearms for Interloper routes across all 15 regions', () => {
    const regions = getAllRegions();
    for (const r of regions) {
      const cart = resolveRegionCartography(r.id, 'voyageur');
      expect(cart.walkablePolygons.length, `Missing walkable valley in ${r.id}`).toBeGreaterThan(0);
      expect(cart.buildings.length, `Missing buildings in ${r.id}`).toBeGreaterThan(0);
      expect(cart.subLocations.length, `Missing subLocations in ${r.id}`).toBeGreaterThanOrEqual(5);
      expect(cart.microSpawns.length, `Too few microSpawns in ${r.id}`).toBeGreaterThanOrEqual(25);
    }

    const miltonVoyageur = resolveRegionCartography('mountain-town', 'voyageur');
    const miltonInterloper = resolveRegionCartography('mountain-town', 'interloper');

    // На Незваном госте часть домов в Милтоне сгорает, а тросы снимаются со скал
    expect(miltonInterloper.intactCount).toBeLessThan(miltonVoyageur.intactCount);
    expect(miltonInterloper.halfOrRuinedCount).toBeGreaterThan(miltonVoyageur.halfOrRuinedCount);
    expect(miltonInterloper.deployedRopesCount).toBeLessThan(miltonVoyageur.deployedRopesCount);

    // Ружья, револьверы и готовые луки исчезают с полотна, уступая место спавнам молота/лупы и маршруту ковки
    expect(
      miltonVoyageur.microSpawns.some(
        (s) => s.kind === 'rifle' || s.kind === 'revolver' || s.kind === 'bow',
      ),
    ).toBe(true);
    expect(
      miltonInterloper.microSpawns.some(
        (s) => s.kind === 'rifle' || s.kind === 'revolver' || s.kind === 'bow',
      ),
    ).toBe(false);
    expect(miltonInterloper.microSpawns.some((s) => s.kind === 'interloper_loot')).toBe(true);
    expect(miltonInterloper.extraPaths.some((p) => p.kind === 'interloper_route')).toBe(true);
    expect(miltonVoyageur.extraPaths.some((p) => p.kind === 'interloper_route')).toBe(false);
  });

  it('guarantees every region has Street View walkthrough nodes backed by valid LeopardTriX sprite metadata and graph links', () => {
    const regions = getAllRegions();
    const guides = getAllLeopardTrixGuides();
    expect(guides.length).toBeGreaterThanOrEqual(60);

    for (const r of regions) {
      const svNodes = getRegionStreetViewNodes(r.id);
      expect(svNodes.length, `Missing Street View nodes for ${r.id}`).toBeGreaterThanOrEqual(2);
    }

    for (const node of getAllStreetViewNodes()) {
      const meta = getStreetViewVideoMeta(node.videoId);
      expect(meta, `Missing sprite metadata for video ${node.videoId}`).toBeDefined();
      expect(meta!.sheetCount).toBeGreaterThan(0);
      expect(node.endSec).toBeGreaterThanOrEqual(node.startSec);
      if (node.nextNodeId) {
        expect(getStreetViewNodeById(node.nextNodeId), `Broken nextNodeId on ${node.id}`).toBeDefined();
      }
      if (node.prevNodeId) {
        expect(getStreetViewNodeById(node.prevNodeId), `Broken prevNodeId on ${node.id}`).toBeDefined();
      }
    }
  });

  it('de-conflicts closely stacked spawns and Leaflet pins so icons never overlap', () => {
    const cart = resolveRegionCartography('mystery-lake', 'voyageur');
    const layout = resolveDeconflictedAtlasLayout({
      buildings: cart.buildings,
      microSpawns: cart.microSpawns,
      subLocations: cart.subLocations,
      areaLabels: [],
      exitBanners: [],
    });

    for (let i = 0; i < layout.microSpawns.length; i++) {
      for (let j = i + 1; j < layout.microSpawns.length; j++) {
        const a = layout.microSpawns[i]!;
        const b = layout.microSpawns[j]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(19);
      }
    }

    const mlMarkers = filterRegionMarkers({
      regionId: 'mystery-lake',
      difficulty: 'voyageur',
      enabledCategories: allCats,
    });
    const resolvedPins = deconflictLeafletMarkers(mlMarkers);
    for (let i = 0; i < resolvedPins.length; i++) {
      for (let j = i + 1; j < resolvedPins.length; j++) {
        const a = resolvedPins[i]!;
        const b = resolvedPins[j]!;
        expect(Math.hypot(a.displayX - b.displayX, a.displayY - b.displayY)).toBeGreaterThanOrEqual(
          26,
        );
      }
    }
  });
});

describe('L3 Command Engine — Everything is a Command', () => {
  it('executes commands deterministically for visited markers, labels, canvas layers, streetview, and custom charcoal notes', () => {
    const engine = new TldCommandEngine();
    engine.execute('survivor.resetJournal', {});

    expect(engine.getState().activeStreetViewNodeId).toBeNull();
    engine.execute('streetview.openNode', {
      nodeId: 'sv-ml-camp-office',
      regionId: 'mystery-lake',
    });
    expect(engine.getState().activeStreetViewNodeId).toBe('sv-ml-camp-office');
    engine.execute('streetview.close', {});
    expect(engine.getState().activeStreetViewNodeId).toBeNull();

    expect(engine.getState().showMarkerLabels).toBe(false);
    engine.execute('map.toggleMarkerLabels', {});
    expect(engine.getState().showMarkerLabels).toBe(true);

    expect(engine.getState().showMapMicroDetails).toBe(true);
    expect(engine.getState().canvasLayers.floraAndSaplings).toBe(true);
    engine.execute('map.toggleCanvasLayer', { layer: 'floraAndSaplings' });
    expect(engine.getState().canvasLayers.floraAndSaplings).toBe(false);
    expect(engine.getState().showMapMicroDetails).toBe(true);

    engine.execute('map.setAllCanvasLayers', { enabled: false });
    expect(engine.getState().showMapMicroDetails).toBe(false);
    expect(engine.getState().canvasLayers.buildingsAndSublocs).toBe(false);

    engine.execute('survivor.toggleVisited', { markerId: 'ml-camp-office' });
    expect(engine.getState().journal.visitedMarkerIds).toContain('ml-camp-office');

    engine.execute('survivor.addCustomNote', {
      regionId: 'mystery-lake',
      x: 512,
      y: 418,
      title: 'Мой схрон у печки',
      note: 'Заберу по дороге с Одинокой топи',
      itemsSummary: '15 кг оленины и 4 л воды',
      weightKg: 19.25,
      icon: 'stash',
    });

    const added = engine.getState().journal.customNotes[0];
    expect(engine.getState().journal.customNotes).toHaveLength(1);
    expect(added?.title).toBe('Мой схрон у печки');
    expect(added?.itemsSummary).toBe('15 кг оленины и 4 л воды');
    expect(added?.weightKg).toBe(19.25);

    engine.execute('survivor.updateCustomNote', {
      noteId: added!.id,
      title: 'Остаток схрона',
      note: 'Мясо съел, оставил воду',
      itemsSummary: '4 л воды',
      weightKg: 4,
      icon: 'stash',
    });
    expect(engine.getState().journal.customNotes[0]?.weightKg).toBe(4);
    expect(engine.getState().journal.customNotes[0]?.title).toBe('Остаток схрона');

    expect(engine.getState().showWikiOverlayMarkers).toBe(false);
    engine.execute('map.toggleWikiOverlayMarkers', {});
    expect(engine.getState().showWikiOverlayMarkers).toBe(true);

    engine.execute('terrain3d.openPoint', {
      regionId: 'coastal-highway',
      leafletX: 480,
      leafletY: 390,
      worldX: -120,
      worldZ: 450,
    });
    expect(engine.getState().active3DLocation?.regionId).toBe('coastal-highway');
    expect(engine.getState().active3DLocation?.worldX).toBe(-120);
    engine.execute('terrain3d.close', {});
    expect(engine.getState().active3DLocation).toBeNull();

    engine.execute('map.setDifficulty', { difficulty: 'misery' });
    expect(engine.getState().difficulty).toBe('misery');
  });
});
