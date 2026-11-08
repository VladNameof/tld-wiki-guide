import { describe, expect, it } from 'vitest';
import { MARKER_CATEGORIES } from '../l0-primitives/constants.ts';
import { matchesSearchQuery, normalizeSearchText } from '../l0-primitives/textUtils.ts';
import {
  parseFandomQueryResponse,
  sanitizeUntrustedWikiText,
  validateFandomUrl,
} from '../l1-codecs/fandomCodec.ts';
import { parseSurvivorJournalJson } from '../l1-codecs/journalCodec.ts';
import {
  computeRegionProgress,
  filterRegionMarkers,
  getEffectiveLootLines,
  searchLocalEncyclopedia,
} from '../l2-models/selectors.ts';
import { TldCommandEngine } from './commandRegistry.ts';

describe('L0 Primitives — Russian search normalization', () => {
  it('normalizes ё to е and matches multi-token queries', () => {
    expect(normalizeSearchText('Охотничье ружьё!')).toBe('охотничье ружье');
    expect(matchesSearchQuery('ружье вогана', 'Винтовка Вогана — уникальное ружьё на ГЭС')).toBe(
      true,
    );
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
    expect(lines.join(' ')).toContain('Увеличительное стекло');
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
});

describe('L3 Command Engine — Everything is a Command', () => {
  it('executes commands deterministically for visited markers and custom charcoal notes', () => {
    const engine = new TldCommandEngine();
    engine.execute('survivor.resetJournal', {});

    engine.execute('survivor.toggleVisited', { markerId: 'ml-camp-office' });
    expect(engine.getState().journal.visitedMarkerIds).toContain('ml-camp-office');

    engine.execute('survivor.addCustomNote', {
      regionId: 'mystery-lake',
      x: 512,
      y: 418,
      title: 'Мой схрон у печки',
      note: '15 кг оленины и 4 л воды',
      icon: 'stash',
    });

    expect(engine.getState().journal.customNotes).toHaveLength(1);
    expect(engine.getState().journal.customNotes[0]?.title).toBe('Мой схрон у печки');

    engine.execute('map.setDifficulty', { difficulty: 'misery' });
    expect(engine.getState().difficulty).toBe('misery');
  });
});
