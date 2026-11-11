export type DifficultyId = 'pilgrim' | 'voyageur' | 'stalker' | 'interloper' | 'misery';

export type MapThemeId = 'charcoal' | 'aurora';

export type MarkerCategory =
  | 'shelter'
  | 'loot'
  | 'bunker'
  | 'transition'
  | 'workbench'
  | 'wildlife'
  | 'climb';

export type RegionTier = 'starter' | 'intermediate' | 'advanced' | 'extreme';

export type WikiSectionId =
  | 'home'
  | 'map'
  | 'regions'
  | 'items'
  | 'wildlife'
  | 'afflictions'
  | 'mechanics'
  | 'fandom';

export type ItemCategory = 'weapons' | 'tools' | 'clothing' | 'food' | 'medicine' | 'fire';

export type CustomNoteIcon = 'stash' | 'danger' | 'camp' | 'arrow';

export interface CustomCharcoalNote {
  readonly id: string;
  readonly regionId: string;
  /** Нормализованная координата X на карте региона (0..1000) */
  readonly x: number;
  /** Нормализованная координата Y на карте региона (0..1000, снизу вверх в L.CRS.Simple) */
  readonly y: number;
  readonly title: string;
  readonly note: string;
  readonly icon: CustomNoteIcon;
  readonly createdAt: string;
}

export interface SurvivorJournalState {
  readonly visitedMarkerIds: readonly string[];
  readonly customNotes: readonly CustomCharcoalNote[];
  readonly favoriteArticleIds: readonly string[];
}

export interface DifficultyMeta {
  readonly id: DifficultyId;
  readonly nameRu: string;
  readonly nameEn: string;
  readonly subtitle: string;
  readonly firearmsSpawn: boolean;
  readonly manufacturedKnivesSpawn: boolean;
  readonly lootAbundance: string;
  readonly weatherSeverity: string;
  readonly predatorBehavior: string;
  readonly badgeColor: string;
}

export interface RegionConnection {
  readonly targetRegionId: string;
  readonly viaRu: string;
  readonly type: 'cave' | 'mine' | 'railway' | 'ravine' | 'road' | 'river';
}

export type TopographyKind =
  | 'lake'
  | 'thin_ice'
  | 'river'
  | 'railway'
  | 'road'
  | 'trail'
  | 'powerline'
  | 'cliff'
  | 'ridge'
  | 'bridge'
  | 'structure'
  | 'forest';

export interface RegionTopographyFeature {
  readonly kind: TopographyKind;
  /** Набор точек [x, y] в пространстве 0..1000 */
  readonly points: readonly (readonly [number, number])[];
  readonly labelRu?: string;
}

export interface RegionAreaLabel {
  readonly x: number;
  readonly y: number;
  readonly textRu: string;
  readonly subRu?: string;
  readonly style?: 'landmark' | 'water' | 'danger' | 'forest';
}

export interface RegionExitBanner {
  readonly edge: 'north' | 'south' | 'west' | 'east';
  /** Смещение вдоль края (15..85 %) */
  readonly posPct: number;
  readonly labelRu: string;
  readonly targetRegionId?: string;
}

export type BuildingArchKind =
  | 'landmark'
  | 'house'
  | 'cabin'
  | 'trailer'
  | 'barn'
  | 'industrial'
  | 'fishing_hut'
  | 'tower'
  | 'cave'
  | 'bunker';

export type BuildingDifficultyRule =
  | 'always_intact'
  | 'burns_on_interloper'
  | 'burns_on_stalker'
  | 'random_ruin'
  | 'always_ruin';

export type BuildingAmenityKind =
  | 'bed'
  | 'stove'
  | 'fire_barrel'
  | 'workbench'
  | 'forge'
  | 'ammo_bench'
  | 'safe'
  | 'first_aid';

export interface MapBuildingFeature {
  readonly x: number;
  readonly y: number;
  readonly kind: BuildingArchKind;
  readonly rule: BuildingDifficultyRule;
  readonly rotDeg?: number;
  readonly scale?: number;
  readonly hasStove?: boolean;
  readonly amenities?: readonly BuildingAmenityKind[];
  readonly labelRu?: string;
}

export type MapPathKind =
  | 'highway'
  | 'dirt_road'
  | 'railway'
  | 'trail'
  | 'goat_path'
  | 'bridge'
  | 'log_bridge'
  | 'waterfall'
  | 'fence'
  | 'interloper_route';

export interface MapExtraPath {
  readonly kind: MapPathKind;
  readonly points: readonly (readonly [number, number])[];
  /** Показывать только на низком луте (Незваный гость / Страдания) как маршрут выживания */
  readonly onlyLowLoot?: boolean;
  readonly labelRu?: string;
}

export interface MapRopeFeature {
  readonly top: readonly [number, number];
  readonly bottom: readonly [number, number];
  /** На каких сложностях трос уже висит привязанным с начала игры */
  readonly deployedDifficulties: readonly DifficultyId[];
  readonly labelRu?: string;
}

export type MapMicroSpawnKind =
  | 'wolf'
  | 'timberwolf'
  | 'bear'
  | 'moose'
  | 'cougar'
  | 'deer'
  | 'rabbit'
  | 'ptarmigan'
  | 'carcass'
  | 'corpse'
  | 'reishi'
  | 'rosehip'
  | 'lichen'
  | 'cattail'
  | 'burdock'
  | 'acorns'
  | 'maple'
  | 'birch'
  | 'rifle'
  | 'revolver'
  | 'bow'
  | 'interloper_loot'
  | 'safe'
  | 'start_spawn'
  | 'small_cave'
  | 'fishing'
  | 'workbench'
  | 'forge'
  | 'bed'
  | 'fire_barrel'
  | 'first_aid'
  | 'tools'
  | 'backpack'
  | 'coal'
  | 'polaroid'
  | 'memento'
  | 'car'
  | 'mailbox'
  | 'transmitter';

export interface MapMicroSpawn {
  readonly x: number;
  readonly y: number;
  readonly kind: MapMicroSpawnKind;
  /** Если задано — спавнится только на перечисленных сложностях */
  readonly allowedDifficulties?: readonly DifficultyId[];
}

export interface MapSubLocationLabel {
  readonly x: number;
  readonly y: number;
  readonly labelRu: string;
}

export interface CanvasDetailLayers {
  readonly buildingsAndSublocs: boolean;
  readonly ropesAndRoutes: boolean;
  readonly faunaAndCarcasses: boolean;
  readonly floraAndSaplings: boolean;
  readonly lootAndStations: boolean;
  readonly streetViewRoutes: boolean;
}

export type CanvasLayerKey = keyof CanvasDetailLayers;

export type StreetViewRouteCategory =
  | 'bases'
  | 'route'
  | 'transition'
  | 'bunker'
  | 'polaroid'
  | 'cougar'
  | 'unique_loot';

export interface StreetViewBranch {
  readonly targetNodeId: string;
  readonly labelRu: string;
  readonly headingDeg: number;
}

export interface StreetViewNode {
  readonly id: string;
  readonly regionId: string;
  readonly routeId: string;
  readonly routeTitleRu: string;
  readonly routeCategory: StreetViewRouteCategory;
  readonly titleRu: string;
  readonly titleEn: string;
  readonly descriptionRu: string;
  readonly x: number;
  readonly y: number;
  readonly headingDeg: number;
  readonly videoId: string;
  readonly startSec: number;
  readonly endSec: number;
  readonly prevNodeId?: string;
  readonly nextNodeId?: string;
  readonly branches?: readonly StreetViewBranch[];
  readonly linkedMarkerId?: string;
}

export interface RegionCartographyConfig {
  readonly regionId: string;
  readonly difficultyStars: 1 | 2 | 3 | 4 | 5;
  /** Контуры доступной для ходьбы территории (долины, каньоны, плато, лёд) в координатах 0..1000 */
  readonly walkablePolygons: readonly (readonly (readonly [number, number])[])[];
  readonly buildings: readonly MapBuildingFeature[];
  readonly ropes: readonly MapRopeFeature[];
  readonly extraPaths: readonly MapExtraPath[];
  readonly microSpawns: readonly MapMicroSpawn[];
  readonly subLocations?: readonly MapSubLocationLabel[];
}

export interface RegionModel {
  readonly id: string;
  readonly imageKey: string;
  readonly nameRu: string;
  readonly nameEn: string;
  readonly tier: RegionTier;
  readonly isDlc?: boolean;
  /** Позиция узла на глобальной карте Острова Великого Медведя (0..1000, 0..640) */
  readonly worldPos: readonly [number, number];
  readonly avgTempC: number;
  readonly blizzardRisk: 'Низкий' | 'Средний' | 'Высокий' | 'Экстремальный';
  readonly hasWorkbench: boolean;
  readonly hasForge: boolean;
  readonly hasAmmoBench: boolean;
  readonly hasTrader?: boolean;
  readonly summaryRu: string;
  readonly navigationGuideRu: string;
  readonly survivalTipsRu: readonly string[];
  readonly keyLandmarksRu: readonly string[];
  readonly connections: readonly RegionConnection[];
  readonly topography: readonly RegionTopographyFeature[];
  readonly areaLabels?: readonly RegionAreaLabel[];
  readonly exitBanners?: readonly RegionExitBanner[];
  readonly fandomSlug: string;
}

export interface MapMarkerModel {
  readonly id: string;
  readonly regionId: string;
  readonly nameRu: string;
  readonly nameEn: string;
  readonly category: MarkerCategory;
  /** Координата X (0..1000) */
  readonly x: number;
  /** Координата Y (0..1000) */
  readonly y: number;
  /** Квадрат сетки, если нужно подсказать ориентир, вычисляется автоматически по X/Y */
  readonly descriptionRu: string;
  readonly landmarkHintRu?: string;
  readonly indoorWarmth?: boolean;
  readonly hasBed?: boolean;
  readonly hasStove?: boolean;
  readonly dangerRadius?: number;
  readonly standardLootRu: readonly string[];
  /** Особые заметки для «Незваного гостя» / «Страданий» */
  readonly interloperLootRu: readonly string[];
  /** На каких сложностях метка актуальна (если не задано — на всех) */
  readonly allowedDifficulties?: readonly DifficultyId[];
}

export interface WikiItemModel {
  readonly id: string;
  readonly imageKey: string;
  readonly nameRu: string;
  readonly nameEn: string;
  readonly category: ItemCategory;
  readonly slotOrSubcatRu: string;
  readonly weightKg: number;
  readonly warmthC?: number;
  readonly windproofC?: number;
  readonly waterproofPct?: number;
  readonly protectionPct?: number;
  readonly sprintPenaltyPct?: number;
  readonly calories?: number;
  readonly vitaminC?: 'Высокий' | 'Средний' | 'Нет';
  readonly durabilityInfo: string;
  readonly availableOnInterloper: boolean;
  readonly whereToFindRu: string;
  readonly descriptionRu: string;
  readonly craftingOrRepairRu: string;
  readonly harvestYieldRu?: string;
  readonly proTipsRu?: readonly string[];
  readonly fandomSlug: string;
}

export interface WildlifeModel {
  readonly id: string;
  readonly imageKey: string;
  readonly nameRu: string;
  readonly nameEn: string;
  readonly type: 'predator' | 'passive' | 'flora';
  readonly dangerLevel: 'Безопасно' | 'Средняя угроза' | 'Высокая угроза' | 'Смертельно';
  readonly bleedOutOrHpRu: string;
  readonly weightMeatKgRu: string;
  readonly curingTimeRu: string;
  readonly parasiteRisk: boolean;
  readonly regionsSummaryRu: string;
  readonly harvestYieldRu: string;
  readonly tacticsRu: string;
  readonly descriptionRu: string;
  readonly fandomSlug: string;
}

export interface AfflictionModel {
  readonly id: string;
  readonly imageKey: string;
  readonly nameRu: string;
  readonly nameEn: string;
  readonly severity: 'Лёгкая' | 'Опасная' | 'Критическая';
  readonly durationRu: string;
  readonly cureItemsRu: readonly string[];
  readonly causeRu: string;
  readonly effectsRu: string;
  readonly treatmentRu: string;
  readonly preventionRu: string;
  readonly fandomSlug: string;
}

export interface SurvivalMechanicModel {
  readonly id: string;
  readonly titleRu: string;
  readonly categoryRu: 'Режимы игры' | 'Базовые нужды' | 'Крафт и Кузница' | 'Навыки и Торговля';
  readonly summaryRu: string;
  readonly keyRulesRu: readonly string[];
  readonly proTipRu: string;
  readonly fandomSlug: string;
}

export interface FandomSyncedArticle {
  readonly pageId: number;
  readonly title: string;
  readonly extract: string;
  readonly url: string;
  readonly thumbnail: string | null;
  readonly syncedAt: string;
}
