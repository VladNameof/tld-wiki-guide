import { matchesSearchQuery } from '../l0-primitives/textUtils.ts';
import type {
  BuildingDifficultyRule,
  DifficultyId,
  FandomMapSheetMeta,
  FandomSyncedArticle,
  MapBuildingFeature,
  MapExtraPath,
  MapMarkerModel,
  MapMicroSpawn,
  MapRopeFeature,
  MapSubLocationLabel,
  MarkerCategory,
  RegionModel,
  StreetViewNode,
  WikiSectionId,
} from '../l0-primitives/types.ts';
import {
  AFFLICTION_ENTRIES,
  SURVIVAL_MECHANICS,
  WIKI_ITEMS,
  WILDLIFE_ENTRIES,
} from './data/encyclopediaData.ts';
import fandomSeedJson from './data/fandomSynced.json';
import {
  LEOPARDTRIX_VIDEO_GUIDES,
  type LeopardTrixVideoGuide,
} from './data/leopardTrixGuidesData.ts';
import { MAP_MARKERS_DATA } from './data/markersData.ts';
import { REGION_ATLAS_ENRICHMENT } from './data/regionAtlasEnrichmentData.ts';
import { REGION_CARTOGRAPHY_DATA } from './data/regionCartographyData.ts';
import { REGIONS_DATA } from './data/regionsData.ts';
import { STREET_VIEW_NODES } from './data/streetViewData.ts';
import streetViewVideoMetaJson from './data/streetViewVideoMeta.json';
import wikiImagesManifest from './data/wikiImagesManifest.json';
import { FANDOM_MAPS_MANIFEST } from './data/fandomMapsManifest.ts';

const IMAGE_MANIFEST = wikiImagesManifest as Readonly<Record<string, string>>;

export function getFandomMapMeta(regionId: string): FandomMapSheetMeta | null {
  return FANDOM_MAPS_MANIFEST[regionId] ?? null;
}

export function getWikiImageUrl(imageKey: string): string | null {
  return IMAGE_MANIFEST[imageKey] ?? null;
}

export function getAllRegions(): readonly RegionModel[] {
  return REGIONS_DATA;
}

export function getRegionById(regionId: string): RegionModel {
  return REGIONS_DATA.find((r) => r.id === regionId) ?? REGIONS_DATA[0]!;
}

export function getSeededFandomArticles(): readonly FandomSyncedArticle[] {
  return (fandomSeedJson.articles as FandomSyncedArticle[]) ?? [];
}

export type ResolvedBuildingState = 'intact' | 'random_half' | 'burned_ruin';

export interface ResolvedBuildingItem extends MapBuildingFeature {
  readonly state: ResolvedBuildingState;
}

export interface ResolvedRopeItem extends MapRopeFeature {
  readonly isDeployed: boolean;
}

export interface ResolvedRegionCartography {
  readonly difficultyStars: 1 | 2 | 3 | 4 | 5;
  readonly walkablePolygons: readonly (readonly (readonly [number, number])[])[];
  readonly buildings: readonly ResolvedBuildingItem[];
  readonly ropes: readonly ResolvedRopeItem[];
  readonly extraPaths: readonly MapExtraPath[];
  readonly microSpawns: readonly MapMicroSpawn[];
  readonly subLocations: readonly MapSubLocationLabel[];
  readonly intactCount: number;
  readonly halfOrRuinedCount: number;
  readonly deployedRopesCount: number;
  readonly totalRopesCount: number;
}

export function resolveBuildingStateForDifficulty(
  rule: BuildingDifficultyRule,
  difficulty: DifficultyId,
): ResolvedBuildingState {
  switch (rule) {
    case 'always_intact':
      return 'intact';
    case 'always_ruin':
      return 'burned_ruin';
    case 'burns_on_stalker':
      if (difficulty === 'pilgrim' || difficulty === 'voyageur') return 'intact';
      return 'burned_ruin';
    case 'burns_on_interloper':
      if (difficulty === 'pilgrim' || difficulty === 'voyageur') return 'intact';
      if (difficulty === 'stalker') return 'random_half';
      return 'burned_ruin';
    case 'random_ruin':
      if (difficulty === 'pilgrim') return 'intact';
      if (difficulty === 'voyageur' || difficulty === 'stalker') return 'random_half';
      return 'burned_ruin';
  }
}

/**
 * Reference Oracle: вычисляет состояние построек (целые / полуразрушенные / сгоревшие),
 * привязанных тросов, тропинок и микро-спавнов региона строго под выбранную сложность.
 */
export function resolveRegionCartography(
  regionId: string,
  difficulty: DifficultyId,
): ResolvedRegionCartography {
  const raw = REGION_CARTOGRAPHY_DATA[regionId];
  if (!raw) {
    return {
      difficultyStars: 2,
      walkablePolygons: [],
      buildings: [],
      ropes: [],
      extraPaths: [],
      microSpawns: [],
      subLocations: [],
      intactCount: 0,
      halfOrRuinedCount: 0,
      deployedRopesCount: 0,
      totalRopesCount: 0,
    };
  }

  const lowLoot = isLowLootDifficulty(difficulty);
  const enrich = REGION_ATLAS_ENRICHMENT[regionId];

  const allRawBuildings = [
    ...raw.buildings,
    ...(enrich?.extraBuildings ?? []),
  ];

  const buildings: ResolvedBuildingItem[] = allRawBuildings.map((b) => {
    const extraAmenities = b.labelRu ? enrich?.amenitiesByLabel?.[b.labelRu] : undefined;
    return {
      ...b,
      amenities: b.amenities ?? extraAmenities,
      state: resolveBuildingStateForDifficulty(b.rule, difficulty),
    };
  });

  const ropes: ResolvedRopeItem[] = raw.ropes.map((r) => ({
    ...r,
    isDeployed: r.deployedDifficulties.includes(difficulty),
  }));

  const allExtraPaths = [
    ...raw.extraPaths,
    ...(enrich?.extraPaths ?? []),
  ];
  const extraPaths = allExtraPaths.filter((p) => !p.onlyLowLoot || lowLoot);

  const allMicroSpawns = [
    ...raw.microSpawns,
    ...(enrich?.extraSpawns ?? []),
  ];

  const microSpawns = allMicroSpawns.filter((sp) => {
    if (sp.allowedDifficulties && !sp.allowedDifficulties.includes(difficulty)) {
      return false;
    }
    if (difficulty === 'pilgrim' && sp.kind === 'cougar') {
      return false;
    }
    if (lowLoot && sp.kind === 'bow' && !sp.allowedDifficulties) {
      return false;
    }
    return true;
  });

  const subLocations = [
    ...(raw.subLocations ?? []),
    ...(enrich?.subLocations ?? []),
  ];

  const intactCount = buildings.filter((b) => b.state === 'intact').length;
  const halfOrRuinedCount = buildings.filter((b) => b.state !== 'intact').length;
  const deployedRopesCount = ropes.filter((r) => r.isDeployed).length;

  return {
    difficultyStars: raw.difficultyStars,
    walkablePolygons: raw.walkablePolygons,
    buildings,
    ropes,
    extraPaths,
    microSpawns,
    subLocations,
    intactCount,
    halfOrRuinedCount,
    deployedRopesCount,
    totalRopesCount: ropes.length,
  };
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
        marker.landmarkHintRu ?? '',
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
    if (
      matchesSearchQuery(
        query,
        r.nameRu,
        r.nameEn,
        r.summaryRu,
        r.navigationGuideRu,
        ...r.keyLandmarksRu,
      )
    ) {
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
        m.landmarkHintRu ?? '',
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
    if (
      matchesSearchQuery(
        query,
        item.nameRu,
        item.nameEn,
        item.slotOrSubcatRu,
        item.descriptionRu,
        item.whereToFindRu,
      )
    ) {
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
    if (
      matchesSearchQuery(
        query,
        w.nameRu,
        w.nameEn,
        w.descriptionRu,
        w.tacticsRu,
        w.harvestYieldRu,
      )
    ) {
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
    if (
      matchesSearchQuery(
        query,
        a.nameRu,
        a.nameEn,
        a.causeRu,
        a.treatmentRu,
        ...a.cureItemsRu,
      )
    ) {
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

  for (const sv of STREET_VIEW_NODES) {
    if (matchesSearchQuery(query, sv.titleRu, sv.titleEn, sv.routeTitleRu, sv.descriptionRu)) {
      hits.push({
        id: `sv-${sv.id}`,
        titleRu: `🚶 ${sv.titleRu}`,
        subtitleRu: sv.routeTitleRu,
        badgeRu: 'Street View маршрут',
        targetSection: 'map',
        regionId: sv.regionId,
        markerId: sv.linkedMarkerId,
      });
    }
  }

  return hits.slice(0, 20);
}

export interface StreetViewVideoMeta {
  readonly videoId: string;
  readonly title: string;
  readonly lengthSeconds: number;
  readonly frameW: number;
  readonly frameH: number;
  readonly frameCount: number;
  readonly cols: number;
  readonly rows: number;
  readonly intervalMs: number;
  readonly sheetCount: number;
  readonly maxFrameIndex: number;
}

const STREET_VIEW_META_MAP = streetViewVideoMetaJson as Readonly<
  Record<string, StreetViewVideoMeta>
>;

export function getAllStreetViewNodes(): readonly StreetViewNode[] {
  return STREET_VIEW_NODES;
}

export function getRegionStreetViewNodes(regionId: string): readonly StreetViewNode[] {
  return STREET_VIEW_NODES.filter((n) => n.regionId === regionId);
}

export function getStreetViewNodeById(nodeId: string): StreetViewNode | undefined {
  return STREET_VIEW_NODES.find((n) => n.id === nodeId);
}

export function findStreetViewNodeForMarker(
  regionId: string,
  marker: MapMarkerModel,
): StreetViewNode {
  const byLink = STREET_VIEW_NODES.find((n) => n.linkedMarkerId === marker.id);
  if (byLink) return byLink;

  const regional = getRegionStreetViewNodes(regionId);
  if (regional.length === 0) return STREET_VIEW_NODES[0]!;

  let best = regional[0]!;
  let bestDist = Infinity;
  for (const node of regional) {
    const d = Math.hypot(node.x - marker.x, node.y - marker.y);
    if (d < bestDist) {
      bestDist = d;
      best = node;
    }
  }
  return best;
}

export function getStreetViewVideoMeta(videoId: string): StreetViewVideoMeta | undefined {
  return STREET_VIEW_META_MAP[videoId];
}

export function getRegionLeopardTrixGuides(regionId: string): readonly LeopardTrixVideoGuide[] {
  return LEOPARDTRIX_VIDEO_GUIDES.filter((g) => g.regionIds.includes(regionId));
}

export function getAllLeopardTrixGuides(): readonly LeopardTrixVideoGuide[] {
  return LEOPARDTRIX_VIDEO_GUIDES;
}
