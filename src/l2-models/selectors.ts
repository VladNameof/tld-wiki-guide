import { matchesSearchQuery } from '../l0-primitives/textUtils.ts';
import type {
  DifficultyId,
  FandomSyncedArticle,
  MapMarkerModel,
  MarkerCategory,
  RegionModel,
  WikiSectionId,
} from '../l0-primitives/types.ts';
import {
  AFFLICTION_ENTRIES,
  SURVIVAL_MECHANICS,
  WIKI_ITEMS,
  WILDLIFE_ENTRIES,
} from './data/encyclopediaData.ts';
import fandomSeedJson from './data/fandomSynced.json';
import { MAP_MARKERS_DATA } from './data/markersData.ts';
import { REGIONS_DATA } from './data/regionsData.ts';

export function getAllRegions(): readonly RegionModel[] {
  return REGIONS_DATA;
}

export function getRegionById(regionId: string): RegionModel {
  return REGIONS_DATA.find((r) => r.id === regionId) ?? REGIONS_DATA[0]!;
}

export function getSeededFandomArticles(): readonly FandomSyncedArticle[] {
  return (fandomSeedJson.articles as FandomSyncedArticle[]) ?? [];
}

/**
 * Reference Oracle для фильтрации маркеров карты по региону, уровню сложности, активным категориям и поиску.
 */
export function filterRegionMarkers(params: {
  readonly regionId: string;
  readonly difficulty: DifficultyId;
  readonly enabledCategories: ReadonlySet<MarkerCategory>;
  readonly searchQuery?: string;
}): MapMarkerModel[] {
  const { regionId, difficulty, enabledCategories, searchQuery = '' } = params;

  return MAP_MARKERS_DATA.filter((marker) => {
    if (marker.regionId !== regionId) return false;
    if (!enabledCategories.has(marker.category)) return false;
    if (marker.allowedDifficulties && !marker.allowedDifficulties.includes(difficulty)) {
      return false;
    }
    if (
      searchQuery &&
      !matchesSearchQuery(
        searchQuery,
        marker.nameRu,
        marker.nameEn,
        marker.descriptionRu,
        ...marker.standardLootRu,
        ...marker.interloperLootRu,
      )
    ) {
      return false;
    }
    return true;
  });
}

export function isLowLootDifficulty(difficulty: DifficultyId): boolean {
  return difficulty === 'interloper' || difficulty === 'misery';
}

export function getEffectiveLootLines(
  marker: MapMarkerModel,
  difficulty: DifficultyId,
): readonly string[] {
  if (isLowLootDifficulty(difficulty)) {
    return marker.interloperLootRu.length > 0
      ? marker.interloperLootRu
      : ['На этой сложности стандартный фабричный лут здесь сильно урезан или отсутствует.'];
  }
  return marker.standardLootRu;
}

export interface RegionProgressStats {
  readonly totalMarkers: number;
  readonly visitedCount: number;
  readonly percentage: number;
}

export function computeRegionProgress(
  regionId: string,
  difficulty: DifficultyId,
  visitedIds: ReadonlySet<string>,
): RegionProgressStats {
  const applicable = MAP_MARKERS_DATA.filter(
    (m) =>
      m.regionId === regionId &&
      (!m.allowedDifficulties || m.allowedDifficulties.includes(difficulty)),
  );
  const totalMarkers = applicable.length;
  if (totalMarkers === 0) {
    return { totalMarkers: 0, visitedCount: 0, percentage: 0 };
  }
  const visitedCount = applicable.filter((m) => visitedIds.has(m.id)).length;
  return {
    totalMarkers,
    visitedCount,
    percentage: Math.round((visitedCount / totalMarkers) * 100),
  };
}

export interface GlobalSearchHit {
  readonly id: string;
  readonly titleRu: string;
  readonly subtitleRu: string;
  readonly badgeRu: string;
  readonly targetSection: WikiSectionId;
  readonly regionId?: string;
  readonly markerId?: string;
}

export function searchLocalEncyclopedia(query: string): GlobalSearchHit[] {
  if (!query.trim()) return [];
  const hits: GlobalSearchHit[] = [];

  for (const r of REGIONS_DATA) {
    if (matchesSearchQuery(query, r.nameRu, r.nameEn, r.summaryRu, ...r.keyLandmarksRu)) {
      hits.push({
        id: `region-${r.id}`,
        titleRu: r.nameRu,
        subtitleRu: r.summaryRu.slice(0, 110) + '…',
        badgeRu: 'Регион',
        targetSection: 'map',
        regionId: r.id,
      });
    }
  }

  for (const m of MAP_MARKERS_DATA) {
    if (
      matchesSearchQuery(
        query,
        m.nameRu,
        m.nameEn,
        m.descriptionRu,
        ...m.standardLootRu,
        ...m.interloperLootRu,
      )
    ) {
      const reg = getRegionById(m.regionId);
      hits.push({
        id: `marker-${m.id}`,
        titleRu: m.nameRu,
        subtitleRu: `${reg.nameRu} — ${m.descriptionRu.slice(0, 90)}…`,
        badgeRu: 'Точка на карте',
        targetSection: 'map',
        regionId: m.regionId,
        markerId: m.id,
      });
    }
  }

  for (const item of WIKI_ITEMS) {
    if (matchesSearchQuery(query, item.nameRu, item.nameEn, item.descriptionRu, item.whereToFindRu)) {
      hits.push({
        id: `item-${item.id}`,
        titleRu: item.nameRu,
        subtitleRu: item.descriptionRu.slice(0, 110) + '…',
        badgeRu: 'Предмет / Экипировка',
        targetSection: 'items',
      });
    }
  }

  for (const w of WILDLIFE_ENTRIES) {
    if (matchesSearchQuery(query, w.nameRu, w.nameEn, w.descriptionRu, w.tacticsRu)) {
      hits.push({
        id: `wild-${w.id}`,
        titleRu: w.nameRu,
        subtitleRu: w.tacticsRu.slice(0, 110) + '…',
        badgeRu: 'Фауна и Флора',
        targetSection: 'wildlife',
      });
    }
  }

  for (const a of AFFLICTION_ENTRIES) {
    if (matchesSearchQuery(query, a.nameRu, a.nameEn, a.causeRu, a.treatmentRu)) {
      hits.push({
        id: `aff-${a.id}`,
        titleRu: a.nameRu,
        subtitleRu: `Лечение: ${a.treatmentRu.slice(0, 95)}…`,
        badgeRu: 'Недуг / Болезнь',
        targetSection: 'afflictions',
      });
    }
  }

  for (const mech of SURVIVAL_MECHANICS) {
    if (matchesSearchQuery(query, mech.titleRu, mech.summaryRu, ...mech.keyRulesRu)) {
      hits.push({
        id: `mech-${mech.id}`,
        titleRu: mech.titleRu,
        subtitleRu: mech.summaryRu.slice(0, 110) + '…',
        badgeRu: 'Механика',
        targetSection: 'mechanics',
      });
    }
  }

  return hits.slice(0, 20);
}
