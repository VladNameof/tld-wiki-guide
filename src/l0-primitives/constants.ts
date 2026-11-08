import type { DifficultyId, DifficultyMeta, MarkerCategory, RegionTier } from './types.ts';

export const MAP_CANVAS_SIZE = 1000;

export const DIFFICULTIES: readonly DifficultyMeta[] = [
  {
    id: 'pilgrim',
    nameRu: 'Пилигрим',
    nameEn: 'Pilgrim',
    subtitle: 'Исследование и тихий апокалипсис',
    firearmsSpawn: true,
    manufacturedKnivesSpawn: true,
    lootAbundance: 'Очень много ресурсов',
    weatherSeverity: 'Мягкая зима, редкие метели',
    predatorBehavior: 'Хищники убегают (кроме спровоцированных)',
    badgeColor: '#5ea87a',
  },
  {
    id: 'voyageur',
    nameRu: 'Странник',
    nameEn: 'Voyageur',
    subtitle: 'Золотой стандарт выживания и изучения карт',
    firearmsSpawn: true,
    manufacturedKnivesSpawn: true,
    lootAbundance: 'Обильный лут, все виды оружия',
    weatherSeverity: 'Умеренное похолодание со временем',
    predatorBehavior: 'Хищники охотятся, но прощают ошибки',
    badgeColor: '#6cb4cc',
  },
  {
    id: 'stalker',
    nameRu: 'Сталкер',
    nameEn: 'Stalker',
    subtitle: 'Волчьи стаи, риск паразитов и суровый быт',
    firearmsSpawn: true,
    manufacturedKnivesSpawn: true,
    lootAbundance: 'Средний лут, ружья и револьверы доступны',
    weatherSeverity: 'Частые метели и густой туман',
    predatorBehavior: 'Максимальное число волков + риск паразитов',
    badgeColor: '#d97724',
  },
  {
    id: 'interloper',
    nameRu: 'Незваный гость',
    nameEn: 'Interloper',
    subtitle: 'Никаких ружей, ножей и топоров — только кузница',
    firearmsSpawn: false,
    manufacturedKnivesSpawn: false,
    lootAbundance: 'Крайний дефицит (ротация таблиц спавна)',
    weatherSeverity: 'Стремительное падение мировых температур',
    predatorBehavior: 'Смертельные схватки, редкая дичь',
    badgeColor: '#c94a4a',
  },
  {
    id: 'misery',
    nameRu: 'Страдания',
    nameEn: 'Misery',
    subtitle: 'Экстремальный режим с неизлечимыми недугами',
    firearmsSpawn: false,
    manufacturedKnivesSpawn: false,
    lootAbundance: 'Ещё меньше ресурсов, чем на Незваном госте',
    weatherSeverity: 'Ледяной ад с первых дней',
    predatorBehavior: '6 уникальных перманентных недугов (Озноб, Увядание и др.)',
    badgeColor: '#8f4ec9',
  },
];

export const DIFFICULTY_BY_ID: Readonly<Record<DifficultyId, DifficultyMeta>> = Object.fromEntries(
  DIFFICULTIES.map((d) => [d.id, d]),
) as Record<DifficultyId, DifficultyMeta>;

export interface MarkerCategoryMeta {
  readonly id: MarkerCategory;
  readonly labelRu: string;
  readonly shortRu: string;
  readonly colorHex: string;
  readonly inkHex: string;
}

export const MARKER_CATEGORIES: readonly MarkerCategoryMeta[] = [
  {
    id: 'shelter',
    labelRu: 'Убежища и постройки',
    shortRu: 'Убежища',
    colorHex: '#d98a36',
    inkHex: '#3b2410',
  },
  {
    id: 'loot',
    labelRu: 'Оружие и ценный лут',
    shortRu: 'Оружие / Лут',
    colorHex: '#e0584c',
    inkHex: '#3d1410',
  },
  {
    id: 'bunker',
    labelRu: 'Бункеры и тайники',
    shortRu: 'Бункеры',
    colorHex: '#9b7be8',
    inkHex: '#251a40',
  },
  {
    id: 'workbench',
    labelRu: 'Верстаки и кузницы',
    shortRu: 'Крафт / Горн',
    colorHex: '#56b4d3',
    inkHex: '#102e38',
  },
  {
    id: 'transition',
    labelRu: 'Переходы и пещеры',
    shortRu: 'Переходы',
    colorHex: '#59b881',
    inkHex: '#11331f',
  },
  {
    id: 'wildlife',
    labelRu: 'Хищники и охота',
    shortRu: 'Фауна',
    colorHex: '#c96b4b',
    inkHex: '#381b11',
  },
  {
    id: 'climb',
    labelRu: 'Тросы и вышки',
    shortRu: 'Тросы / Обзор',
    colorHex: '#b8b09c',
    inkHex: '#2b2822',
  },
];

export const REGION_TIER_META: Readonly<
  Record<RegionTier, { readonly labelRu: string; readonly colorClass: string }>
> = {
  starter: {
    labelRu: 'Начальный регион',
    colorClass: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40',
  },
  intermediate: {
    labelRu: 'Средняя сложность',
    colorClass: 'text-sky-300 border-sky-500/40 bg-sky-950/40',
  },
  advanced: {
    labelRu: 'Суровый регион',
    colorClass: 'text-amber-300 border-amber-500/40 bg-amber-950/40',
  },
  extreme: {
    labelRu: 'Экстремальный / DLC',
    colorClass: 'text-rose-300 border-rose-500/40 bg-rose-950/40',
  },
};
