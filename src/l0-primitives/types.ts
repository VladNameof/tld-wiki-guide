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

export interface RegionTopographyFeature {
  readonly kind: 'lake' | 'river' | 'railway' | 'road' | 'ridge' | 'forest';
  /** Набор точек [x, y] в пространстве 0..1000 */
  readonly points: readonly (readonly [number, number])[];
  readonly labelRu?: string;
}

export interface RegionModel {
  readonly id: string;
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
  readonly survivalTipsRu: readonly string[];
  readonly keyLandmarksRu: readonly string[];
  readonly connections: readonly RegionConnection[];
  readonly topography: readonly RegionTopographyFeature[];
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
  readonly descriptionRu: string;
  readonly indoorWarmth?: boolean;
  readonly hasBed?: boolean;
  readonly hasStove?: boolean;
  readonly standardLootRu: readonly string[];
  /** Особые заметки для «Незваного гостя» / «Страданий» */
  readonly interloperLootRu: readonly string[];
  /** На каких сложностях метка актуальна (если не задано — на всех) */
  readonly allowedDifficulties?: readonly DifficultyId[];
}

export interface WikiItemModel {
  readonly id: string;
  readonly nameRu: string;
  readonly nameEn: string;
  readonly category: ItemCategory;
  readonly weightKg: number;
  readonly warmthC?: number;
  readonly windproofC?: number;
  readonly protectionPct?: number;
  readonly calories?: number;
  readonly durabilityInfo: string;
  readonly availableOnInterloper: boolean;
  readonly whereToFindRu: string;
  readonly descriptionRu: string;
  readonly craftingOrRepairRu: string;
  readonly fandomSlug: string;
}

export interface WildlifeModel {
  readonly id: string;
  readonly nameRu: string;
  readonly nameEn: string;
  readonly type: 'predator' | 'passive' | 'flora';
  readonly dangerLevel: 'Безопасно' | 'Средняя угроза' | 'Высокая угроза' | 'Смертельно';
  readonly regionsSummaryRu: string;
  readonly harvestYieldRu: string;
  readonly tacticsRu: string;
  readonly descriptionRu: string;
  readonly fandomSlug: string;
}

export interface AfflictionModel {
  readonly id: string;
  readonly nameRu: string;
  readonly nameEn: string;
  readonly severity: 'Лёгкая' | 'Опасная' | 'Критическая';
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
