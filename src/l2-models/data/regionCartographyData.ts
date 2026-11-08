import type { DifficultyId, RegionCartographyConfig } from '../../l0-primitives/types.ts';

const ALL_DIFFS: readonly DifficultyId[] = [
  'pilgrim',
  'voyageur',
  'stalker',
  'interloper',
  'misery',
];
const GUN_DIFFS: readonly DifficultyId[] = ['pilgrim', 'voyageur', 'stalker'];
const EASY_ROPE_DIFFS: readonly DifficultyId[] = ['pilgrim', 'voyageur'];
const UP_TO_STALKER: readonly DifficultyId[] = ['pilgrim', 'voyageur', 'stalker'];
const LOW_LOOT_DIFFS: readonly DifficultyId[] = ['interloper', 'misery'];
const HARD_PREDATOR_DIFFS: readonly DifficultyId[] = ['stalker', 'interloper', 'misery'];

export const REGION_CARTOGRAPHY_DATA: Readonly<Record<string, RegionCartographyConfig>> = {
  // ======================== 1. ЗАГАДОЧНОЕ ОЗЕРО (MYSTERY LAKE) ========================
  'mystery-lake': {
    regionId: 'mystery-lake',
    difficultyStars: 1,
    walkablePolygons: [
      // Главный коридор ж/д, озера, вырубки, зверолова и плотины с вырезами под скальные массивы
      [
        [65, 135],
        [240, 185],
        [435, 290],
        [505, 130],
        [695, 105],
        [895, 145],
        [915, 385],
        [845, 555],
        [885, 765],
        [955, 895],
        [885, 935],
        [725, 885],
        [620, 725],
        [495, 710],
        [435, 855],
        [255, 865],
        [65, 815],
        [105, 685],
        [170, 625],
        [165, 480],
        [295, 415],
        [265, 295],
        [85, 225],
      ],
    ],
    buildings: [
      // Ключевые базы
      { x: 520, y: 410, kind: 'landmark', rule: 'always_intact', hasStove: true, scale: 1.25, labelRu: 'ТУРБАЗА' },
      { x: 150, y: 735, kind: 'landmark', rule: 'always_intact', hasStove: true, scale: 1.2, labelRu: 'ДОМ ЗВЕРОЛОВА' },
      { x: 174, y: 722, kind: 'barn', rule: 'always_ruin' },
      { x: 825, y: 830, kind: 'industrial', rule: 'always_intact', hasStove: true, scale: 1.35, labelRu: 'ГЭС «КАРТЕР»' },
      { x: 752, y: 848, kind: 'trailer', rule: 'always_intact' },
      { x: 774, y: 842, kind: 'trailer', rule: 'always_intact' },
      // Вышки
      { x: 455, y: 660, kind: 'tower', rule: 'always_intact', hasStove: true },
      { x: 365, y: 550, kind: 'tower', rule: 'always_ruin' },
      // Лесозаготовка (3 вагончика + навес)
      { x: 326, y: 738, kind: 'trailer', rule: 'always_intact' },
      { x: 346, y: 732, kind: 'trailer', rule: 'always_intact' },
      { x: 336, y: 752, kind: 'trailer', rule: 'burns_on_interloper' },
      { x: 362, y: 736, kind: 'barn', rule: 'always_ruin', hasStove: true },
      // Одинокая хижина у Лося и Засидка у пруда
      { x: 235, y: 675, kind: 'cabin', rule: 'burns_on_interloper' },
      { x: 205, y: 565, kind: 'barn', rule: 'always_intact' },
      // Сошедшие вагоны и Погрузочный вагон
      { x: 584, y: 526, kind: 'trailer', rule: 'always_intact', rotDeg: 38 },
      { x: 600, y: 540, kind: 'trailer', rule: 'always_intact', rotDeg: -22 },
      { x: 685, y: 650, kind: 'trailer', rule: 'always_intact', rotDeg: 45 },
      // Летние домики на озере (часть сгорает на Сталкере и Незваном госте!)
      { x: 615, y: 392, kind: 'cabin', rule: 'burns_on_interloper' },
      { x: 642, y: 388, kind: 'cabin', rule: 'always_intact' },
      { x: 785, y: 365, kind: 'cabin', rule: 'burns_on_stalker' },
      { x: 718, y: 238, kind: 'cabin', rule: 'always_intact' },
      { x: 742, y: 232, kind: 'cabin', rule: 'burns_on_interloper' },
      { x: 766, y: 226, kind: 'cabin', rule: 'random_ruin' },
      // 4 Рыбацкие будки на льду Загадочного озера
      { x: 635, y: 325, kind: 'fishing_hut', rule: 'always_intact', hasStove: true },
      { x: 705, y: 295, kind: 'fishing_hut', rule: 'always_intact', hasStove: true },
      { x: 765, y: 325, kind: 'fishing_hut', rule: 'always_intact' },
      { x: 785, y: 235, kind: 'fishing_hut', rule: 'always_intact', hasStove: true },
      // Пещеры и бункер
      { x: 845, y: 175, kind: 'cave', rule: 'always_intact' },
      { x: 545, y: 165, kind: 'cave', rule: 'always_intact' },
      { x: 690, y: 495, kind: 'cave', rule: 'always_intact' },
      { x: 90, y: 785, kind: 'cave', rule: 'always_intact' },
      { x: 295, y: 830, kind: 'bunker', rule: 'always_intact' },
    ],
    ropes: [
      { top: [365, 545], bottom: [345, 485], deployedDifficulties: EASY_ROPE_DIFFS, labelRu: 'Трос у Ст. вышки' },
      { top: [645, 215], bottom: [625, 255], deployedDifficulties: UP_TO_STALKER, labelRu: 'Южный уступ озера' },
    ],
    extraPaths: [
      // Серпантин на Пожарную вышку
      { kind: 'trail', points: [[320, 650], [395, 685], [455, 660]] },
      // Тропа от Вырубки в Лесозаготовку и к бункеру
      { kind: 'dirt_road', points: [[320, 650], [340, 735], [295, 830]] },
      // Тропа от Зверолова к пещере в Милтон
      { kind: 'trail', points: [[150, 735], [112, 765], [90, 785]] },
      // Тропа через Безымянный пруд к ж/д туннелю
      { kind: 'trail', points: [[225, 550], [215, 415], [265, 300], [105, 175]] },
      // Ледовая тропа по бухтам озера к медвежьей пещере
      { kind: 'trail', points: [[520, 410], [635, 325], [705, 295], [785, 235], [845, 175]] },
      // Тропа вдоль реки к ГЭС
      { kind: 'trail', points: [[645, 430], [750, 425], [775, 560], [815, 700], [825, 830]] },
      // Поваленное дерево через овраг у вышки
      { kind: 'log_bridge', points: [[395, 595], [428, 615]] },
      // Козья тропа обхода без троса у Разрушенной вышки
      { kind: 'goat_path', points: [[365, 550], [395, 515], [385, 470]] },
      // Маршрут выживания Незваного гостя: ГЭС -> Турбаза (Лупа) -> Туннель на кузницу Топи
      {
        kind: 'interloper_route',
        onlyLowLoot: true,
        points: [[825, 830], [660, 610], [520, 410], [310, 305], [105, 175]],
      },
    ],
    microSpawns: [
      // Фауна
      { x: 675, y: 355, kind: 'wolf' },
      { x: 585, y: 510, kind: 'wolf' },
      { x: 755, y: 785, kind: 'wolf', allowedDifficulties: HARD_PREDATOR_DIFFS },
      { x: 315, y: 695, kind: 'wolf', allowedDifficulties: HARD_PREDATOR_DIFFS },
      { x: 830, y: 205, kind: 'bear' },
      { x: 215, y: 530, kind: 'bear' },
      { x: 245, y: 660, kind: 'moose' },
      { x: 795, y: 735, kind: 'moose', allowedDifficulties: UP_TO_STALKER },
      { x: 185, y: 335, kind: 'cougar', allowedDifficulties: HARD_PREDATOR_DIFFS },
      { x: 175, y: 755, kind: 'rabbit' },
      { x: 535, y: 445, kind: 'rabbit' },
      { x: 680, y: 515, kind: 'rabbit' },
      { x: 665, y: 285, kind: 'deer' },
      { x: 245, y: 565, kind: 'deer' },
      { x: 780, y: 615, kind: 'deer' },
      { x: 440, y: 675, kind: 'ptarmigan' },
      { x: 235, y: 585, kind: 'carcass' },
      { x: 745, y: 545, kind: 'corpse' },
      { x: 565, y: 540, kind: 'corpse' },
      // Флора и саженцы
      { x: 585, y: 385, kind: 'cattail' },
      { x: 765, y: 410, kind: 'cattail' },
      { x: 805, y: 665, kind: 'cattail' },
      { x: 265, y: 535, kind: 'reishi' },
      { x: 355, y: 765, kind: 'reishi' },
      { x: 510, y: 215, kind: 'rosehip' },
      { x: 140, y: 705, kind: 'rosehip' },
      { x: 425, y: 495, kind: 'lichen' },
      { x: 195, y: 785, kind: 'maple' },
      { x: 845, y: 495, kind: 'maple' },
      { x: 285, y: 615, kind: 'birch' },
      { x: 645, y: 175, kind: 'birch' },
      // Снаряжение по сложности
      { x: 135, y: 745, kind: 'rifle', allowedDifficulties: GUN_DIFFS },
      { x: 838, y: 812, kind: 'rifle', allowedDifficulties: GUN_DIFFS },
      { x: 698, y: 488, kind: 'rifle', allowedDifficulties: GUN_DIFFS },
      { x: 535, y: 398, kind: 'revolver', allowedDifficulties: GUN_DIFFS },
      { x: 468, y: 652, kind: 'revolver', allowedDifficulties: GUN_DIFFS },
      { x: 162, y: 745, kind: 'safe' },
      { x: 812, y: 842, kind: 'safe' },
      { x: 506, y: 418, kind: 'interloper_loot', allowedDifficulties: LOW_LOOT_DIFFS },
      { x: 808, y: 818, kind: 'interloper_loot', allowedDifficulties: LOW_LOOT_DIFFS },
      { x: 442, y: 668, kind: 'interloper_loot', allowedDifficulties: LOW_LOOT_DIFFS },
    ],
  },

  // ======================== 2. ГОРНЫЙ ГОРОДОК / МИЛТОН (MOUNTAIN TOWN) ========================
  'mountain-town': {
    regionId: 'mountain-town',
    difficultyStars: 2,
    walkablePolygons: [
      // Точная многоуровневая долина Милтона (Северный мост + Церковь + Город + Ферма + Самолёт + Парк + Котловина)
      [
        [155, 895],
        [335, 885],
        [435, 815],
        [445, 685],
        [595, 695],
        [755, 795],
        [855, 715],
        [835, 595],
        [795, 485],
        [685, 445],
        [735, 335],
        [925, 325],
        [915, 255],
        [665, 245],
        [545, 245],
        [445, 195],
        [375, 95],
        [165, 95],
        [145, 255],
        [335, 285],
        [395, 365],
        [175, 375],
        [165, 515],
        [355, 535],
        [385, 645],
        [295, 705],
        [245, 795],
        [145, 835],
      ],
    ],
    buildings: [
      // Ключевые красные постройки (как на референсной карте Милтона!)
      { x: 525, y: 565, kind: 'landmark', rule: 'always_intact', hasStove: true, scale: 1.3, labelRu: 'ДОМ СЕРОЙ МАТЕРИ' },
      { x: 245, y: 435, kind: 'landmark', rule: 'always_intact', hasStove: true, scale: 1.25, labelRu: 'ФЕРМА «РАЙСКИЕ ЛУГА»' },
      { x: 272, y: 448, kind: 'barn', rule: 'always_intact', scale: 1.15 },
      { x: 590, y: 405, kind: 'landmark', rule: 'always_intact', hasStove: true, scale: 1.2, labelRu: 'АЗС «КОСАТКА»' },
      { x: 365, y: 745, kind: 'landmark', rule: 'always_intact', scale: 1.2, labelRu: 'ЦЕРКОВЬ СВ. ХРИСТОФОРА' },
      // Банк, Почта и Сгоревшая школа
      { x: 475, y: 535, kind: 'house', rule: 'always_intact', scale: 1.15 },
      { x: 462, y: 558, kind: 'house', rule: 'always_intact', scale: 1.1 },
      { x: 418, y: 555, kind: 'barn', rule: 'always_ruin', hasStove: true, labelRu: 'СТАРАЯ ШКОЛА' },
      // Жилой квартал улиц Милтона (часть домов цела, часть заколочена/сгорает на Сталкере и Незваном госте!)
      { x: 488, y: 582, kind: 'house', rule: 'always_intact' },
      { x: 506, y: 588, kind: 'house', rule: 'burns_on_interloper' },
      { x: 545, y: 585, kind: 'house', rule: 'random_ruin' },
      { x: 558, y: 558, kind: 'house', rule: 'always_intact' },
      { x: 542, y: 538, kind: 'house', rule: 'burns_on_interloper' },
      { x: 518, y: 532, kind: 'house', rule: 'always_intact' },
      { x: 496, y: 518, kind: 'house', rule: 'burns_on_stalker' },
      { x: 516, y: 508, kind: 'house', rule: 'always_intact' },
      { x: 538, y: 512, kind: 'house', rule: 'burns_on_interloper' },
      { x: 556, y: 518, kind: 'house', rule: 'always_ruin' },
      { x: 452, y: 518, kind: 'house', rule: 'always_intact' },
      { x: 445, y: 540, kind: 'house', rule: 'burns_on_interloper' },
      { x: 505, y: 488, kind: 'house', rule: 'random_ruin' },
      { x: 528, y: 486, kind: 'house', rule: 'burns_on_stalker' },
      // Радиовышка, Офис Парка, Лесные участки, Лачуга отшельника
      { x: 605, y: 548, kind: 'tower', rule: 'always_intact' },
      { x: 615, y: 292, kind: 'cabin', rule: 'always_intact' },
      { x: 430, y: 665, kind: 'trailer', rule: 'burns_on_interloper' },
      { x: 635, y: 445, kind: 'barn', rule: 'always_ruin' },
      { x: 225, y: 185, kind: 'cabin', rule: 'always_ruin', hasStove: true, labelRu: 'ЛАЧУГА ОТШЕЛЬНИКА' },
      // Пещеры и бункер
      { x: 295, y: 830, kind: 'cave', rule: 'always_intact' },
      { x: 885, y: 295, kind: 'cave', rule: 'always_intact' },
      { x: 745, y: 515, kind: 'cave', rule: 'always_intact' },
      { x: 215, y: 865, kind: 'cave', rule: 'always_intact' },
      { x: 720, y: 745, kind: 'bunker', rule: 'always_intact' },
    ],
    ropes: [
      { top: [605, 278], bottom: [545, 245], deployedDifficulties: ALL_DIFFS, labelRu: 'Верхний трос Парка' },
      { top: [465, 225], bottom: [375, 195], deployedDifficulties: ALL_DIFFS, labelRu: 'Нижний трос в Котловину' },
      { top: [735, 495], bottom: [715, 365], deployedDifficulties: UP_TO_STALKER, labelRu: 'Трос у Скального убежища' },
      { top: [785, 315], bottom: [835, 305], deployedDifficulties: ALL_DIFFS, labelRu: 'Подъём к пещере Озера' },
    ],
    extraPaths: [
      // Главная дорога через весь регион
      { kind: 'highway', points: [[205, 880], [295, 815], [365, 745], [465, 625], [495, 545], [555, 465], [590, 405], [615, 285]] },
      // Дорога на Ферму «Райские луга» через мост
      { kind: 'dirt_road', points: [[465, 535], [385, 505], [315, 475], [245, 435]] },
      // Мосты через реку Милтона
      { kind: 'bridge', points: [[375, 500], [405, 512]] },
      { kind: 'bridge', points: [[445, 625], [475, 625]] },
      { kind: 'bridge', points: [[195, 875], [225, 885]] },
      // Восточный каньон к упавшему самолёту Маккензи и бункеру
      { kind: 'trail', points: [[525, 565], [605, 555], [685, 615], [785, 660]] },
      { kind: 'trail', points: [[685, 615], [720, 745]] },
      { kind: 'trail', points: [[605, 555], [685, 515], [745, 515]] },
      // Южный коридор от Парка через тросы в Котловину и к пещере Загадочного озера
      { kind: 'trail', points: [[615, 285], [745, 305], [885, 295]] },
      { kind: 'trail', points: [[545, 245], [465, 225]] },
      { kind: 'trail', points: [[375, 195], [295, 185], [245, 175], [210, 105]] },
      // Тропа к пещере Долины Тихой реки
      { kind: 'trail', points: [[345, 765], [295, 830]] },
      // Поваленное дерево у самолёта
      { kind: 'log_bridge', points: [[745, 645], [770, 655]] },
      // Маршрут выживания Незваного гостя: Дом Серой Матери -> Ферма (Молот/Спички) -> Орка -> Пещера в ЗО
      {
        kind: 'interloper_route',
        onlyLowLoot: true,
        points: [[245, 435], [495, 545], [525, 565], [590, 405], [615, 285], [885, 295]],
      },
    ],
    microSpawns: [
      { x: 505, y: 525, kind: 'wolf' },
      { x: 575, y: 425, kind: 'wolf' },
      { x: 265, y: 425, kind: 'wolf' },
      { x: 355, y: 725, kind: 'wolf', allowedDifficulties: HARD_PREDATOR_DIFFS },
      { x: 285, y: 215, kind: 'wolf', allowedDifficulties: HARD_PREDATOR_DIFFS },
      { x: 215, y: 860, kind: 'bear' },
      { x: 265, y: 165, kind: 'moose' },
      { x: 525, y: 695, kind: 'moose', allowedDifficulties: UP_TO_STALKER },
      { x: 205, y: 495, kind: 'cougar', allowedDifficulties: HARD_PREDATOR_DIFFS },
      { x: 395, y: 765, kind: 'deer' },
      { x: 225, y: 465, kind: 'deer' },
      { x: 295, y: 155, kind: 'deer' },
      { x: 545, y: 605, kind: 'rabbit' },
      { x: 635, y: 275, kind: 'rabbit' },
      { x: 765, y: 675, kind: 'ptarmigan' },
      { x: 755, y: 525, kind: 'maple' },
      { x: 215, y: 395, kind: 'maple' },
      { x: 735, y: 505, kind: 'birch' },
      { x: 285, y: 195, kind: 'birch' },
      { x: 395, y: 515, kind: 'cattail' },
      { x: 275, y: 145, kind: 'cattail' },
      { x: 435, y: 645, kind: 'reishi' },
      { x: 645, y: 455, kind: 'rosehip' },
      { x: 345, y: 735, kind: 'lichen' },
      { x: 795, y: 645, kind: 'corpse' },
      { x: 385, y: 725, kind: 'carcass' },
      { x: 235, y: 445, kind: 'rifle', allowedDifficulties: GUN_DIFFS },
      { x: 375, y: 755, kind: 'revolver', allowedDifficulties: GUN_DIFFS },
      { x: 538, y: 572, kind: 'revolver', allowedDifficulties: GUN_DIFFS },
      { x: 468, y: 528, kind: 'safe' },
      { x: 258, y: 448, kind: 'interloper_loot', allowedDifficulties: LOW_LOOT_DIFFS },
      { x: 598, y: 398, kind: 'interloper_loot', allowedDifficulties: LOW_LOOT_DIFFS },
    ],
  },

  // ======================== 3. ПРИБРЕЖНОЕ ШОССЕ (COASTAL HIGHWAY) ========================
  'coastal-highway': {
    regionId: 'coastal-highway',
    difficultyStars: 2,
    walkablePolygons: [
      [
        [55, 435],
        [185, 585],
        [245, 865],
        [555, 855],
        [755, 875],
        [895, 685],
        [955, 485],
        [935, 155],
        [565, 135],
        [155, 165],
        [65, 315],
      ],
    ],
    buildings: [
      { x: 660, y: 505, kind: 'landmark', rule: 'always_intact', hasStove: true, scale: 1.3, labelRu: 'ГАРАЖ «КВОНСЕТ»' },
      // Дома Прибрежного посёлка вокруг Квонсета (многие сгорают на Незваном госте!)
      { x: 625, y: 525, kind: 'house', rule: 'always_intact' },
      { x: 642, y: 535, kind: 'house', rule: 'burns_on_interloper' },
      { x: 678, y: 532, kind: 'house', rule: 'burns_on_stalker' },
      { x: 696, y: 518, kind: 'house', rule: 'always_intact' },
      { x: 632, y: 488, kind: 'house', rule: 'burns_on_interloper' },
      { x: 688, y: 488, kind: 'house', rule: 'random_ruin' },
      { x: 712, y: 496, kind: 'house', rule: 'always_ruin' },
      // Рыбацкий посёлок (4 домика + уличный верстак)
      { x: 305, y: 468, kind: 'cabin', rule: 'always_intact' },
      { x: 322, y: 472, kind: 'cabin', rule: 'always_intact', hasStove: true },
      { x: 338, y: 466, kind: 'cabin', rule: 'burns_on_interloper' },
      { x: 318, y: 452, kind: 'barn', rule: 'always_intact' },
      // Сортировка брёвен и Прибрежные коттеджи на востоке
      { x: 475, y: 485, kind: 'trailer', rule: 'always_intact' },
      { x: 835, y: 468, kind: 'cabin', rule: 'burns_on_interloper', hasStove: true },
      { x: 858, y: 462, kind: 'cabin', rule: 'burns_on_stalker' },
      { x: 878, y: 458, kind: 'cabin', rule: 'always_ruin', hasStove: true },
      // Острова и пирс Торговца
      { x: 440, y: 255, kind: 'landmark', rule: 'always_intact', scale: 1.15, labelRu: 'ОСТРОВ КРОЛИКОВ' },
      { x: 695, y: 265, kind: 'landmark', rule: 'always_intact', scale: 1.15, labelRu: 'ОСТРОВ МИЗАНТРОПА' },
      { x: 740, y: 315, kind: 'barn', rule: 'always_intact', labelRu: 'ПИРС ТОРГОВЦА' },
      // 6 Рыбацких будок на замёрзшем заливе
      { x: 355, y: 345, kind: 'fishing_hut', rule: 'always_intact', hasStove: true },
      { x: 485, y: 355, kind: 'fishing_hut', rule: 'always_intact' },
      { x: 565, y: 295, kind: 'fishing_hut', rule: 'always_intact', hasStove: true },
      { x: 625, y: 385, kind: 'fishing_hut', rule: 'always_intact' },
      { x: 765, y: 365, kind: 'fishing_hut', rule: 'always_intact', hasStove: true },
      { x: 245, y: 295, kind: 'fishing_hut', rule: 'burns_on_interloper' },
      // Верхние ярусы (Трейлеры, Вышка, Домик у кроликов, Шахта)
      { x: 545, y: 745, kind: 'tower', rule: 'always_intact', hasStove: true },
      { x: 215, y: 695, kind: 'cabin', rule: 'always_intact' },
      { x: 395, y: 765, kind: 'trailer', rule: 'always_intact' },
      { x: 685, y: 830, kind: 'cave', rule: 'always_intact' },
    ],
    ropes: [
      { top: [525, 725], bottom: [505, 645], deployedDifficulties: EASY_ROPE_DIFFS, labelRu: 'Спуск от Вышки' },
    ],
    extraPaths: [
      { kind: 'highway', points: [[85, 445], [320, 465], [475, 485], [660, 505], [855, 465], [925, 460]] },
      { kind: 'dirt_road', points: [[475, 485], [435, 635], [545, 745], [685, 830]] },
      { kind: 'dirt_road', points: [[395, 765], [275, 825], [215, 695], [185, 535]] },
      { kind: 'bridge', points: [[245, 455], [275, 462]] },
      { kind: 'bridge', points: [[345, 795], [375, 785]] },
      { kind: 'trail', points: [[660, 505], [695, 365], [740, 315], [695, 265]] },
      { kind: 'trail', points: [[320, 465], [395, 345], [440, 255]] },
      {
        kind: 'interloper_route',
        onlyLowLoot: true,
        points: [[275, 825], [545, 745], [685, 830], [660, 505], [925, 460]],
      },
    ],
    microSpawns: [
      { x: 645, y: 475, kind: 'wolf' },
      { x: 525, y: 395, kind: 'wolf' },
      { x: 365, y: 445, kind: 'wolf', allowedDifficulties: HARD_PREDATOR_DIFFS },
      { x: 685, y: 525, kind: 'wolf', allowedDifficulties: HARD_PREDATOR_DIFFS },
      { x: 715, y: 295, kind: 'bear' },
      { x: 395, y: 565, kind: 'bear' },
      { x: 675, y: 545, kind: 'moose' },
      { x: 245, y: 655, kind: 'cougar', allowedDifficulties: HARD_PREDATOR_DIFFS },
      { x: 445, y: 275, kind: 'rabbit' },
      { x: 225, y: 710, kind: 'rabbit' },
      { x: 515, y: 325, kind: 'deer' },
      { x: 815, y: 345, kind: 'deer' },
      { x: 235, y: 615, kind: 'maple' },
      { x: 755, y: 665, kind: 'birch' },
      { x: 435, y: 665, kind: 'reishi' },
      { x: 585, y: 755, kind: 'rosehip' },
      { x: 675, y: 495, kind: 'rifle', allowedDifficulties: GUN_DIFFS },
      { x: 558, y: 742, kind: 'revolver', allowedDifficulties: GUN_DIFFS },
      { x: 652, y: 515, kind: 'interloper_loot', allowedDifficulties: LOW_LOOT_DIFFS },
    ],
  },

  // ======================== 4. ОТРАДНАЯ ДОЛИНА (PLEASANT VALLEY) ========================
  'pleasant-valley': {
    regionId: 'pleasant-valley',
    difficultyStars: 3,
    walkablePolygons: [
      [
        [95, 835],
        [335, 865],
        [835, 885],
        [905, 685],
        [915, 295],
        [855, 135],
        [495, 145],
        [145, 175],
        [105, 455],
      ],
    ],
    buildings: [
      { x: 470, y: 420, kind: 'landmark', rule: 'always_intact', hasStove: true, scale: 1.3, labelRu: 'УСАДЬБА ДОЛИНЫ' },
      { x: 492, y: 432, kind: 'barn', rule: 'always_intact' },
      { x: 575, y: 535, kind: 'landmark', rule: 'always_intact', hasStove: true, scale: 1.25, labelRu: 'АМБАР МОЛЛИ' },
      { x: 715, y: 465, kind: 'landmark', rule: 'always_intact', hasStove: true, scale: 1.25, labelRu: 'ПЕРЕКРЁСТОК ТОМСОНА' },
      // Дома Перекрёстка Томсона
      { x: 695, y: 482, kind: 'house', rule: 'always_intact' },
      { x: 735, y: 480, kind: 'house', rule: 'always_intact' },
      { x: 738, y: 448, kind: 'house', rule: 'burns_on_interloper' },
      { x: 692, y: 446, kind: 'house', rule: 'burns_on_stalker' },
      { x: 755, y: 462, kind: 'house', rule: 'random_ruin' },
      // Сигнальный холм, Домик уклониста, Сгоревший хребет, Три удара
      { x: 310, y: 635, kind: 'tower', rule: 'always_intact', labelRu: 'СИГНАЛЬНЫЙ ХОЛМ' },
      { x: 292, y: 628, kind: 'house', rule: 'always_intact' },
      { x: 745, y: 715, kind: 'cabin', rule: 'burns_on_interloper' },
      { x: 770, y: 735, kind: 'cabin', rule: 'always_ruin', hasStove: true },
      { x: 255, y: 515, kind: 'barn', rule: 'always_ruin' },
      { x: 630, y: 735, kind: 'fishing_hut', rule: 'always_intact', hasStove: true },
      // Бункер у троса и пещеры переходов
      { x: 790, y: 805, kind: 'bunker', rule: 'always_intact' },
      { x: 145, y: 795, kind: 'cave', rule: 'always_intact' },
      { x: 875, y: 345, kind: 'cave', rule: 'always_intact' },
    ],
    ropes: [
      { top: [805, 865], bottom: [790, 815], deployedDifficulties: ALL_DIFFS, labelRu: 'Трос на Волчью гору' },
      { top: [315, 610], bottom: [345, 565], deployedDifficulties: EASY_ROPE_DIFFS, labelRu: 'Спуск с Сигн. холма' },
    ],
    extraPaths: [
      { kind: 'highway', points: [[165, 210], [470, 355], [715, 465], [875, 345]] },
      { kind: 'dirt_road', points: [[470, 355], [470, 420], [575, 535], [715, 465]] },
      { kind: 'dirt_road', points: [[365, 310], [255, 515], [310, 635]] },
      { kind: 'trail', points: [[575, 535], [565, 635], [630, 735], [790, 805]] },
      { kind: 'trail', points: [[310, 635], [145, 795]] },
      { kind: 'bridge', points: [[520, 375], [555, 395]] },
      { kind: 'bridge', points: [[695, 445], [730, 465]] },
      {
        kind: 'interloper_route',
        onlyLowLoot: true,
        points: [[790, 805], [575, 535], [470, 420], [310, 635], [145, 795]],
      },
    ],
    microSpawns: [
      { x: 435, y: 395, kind: 'bear' },
      { x: 755, y: 695, kind: 'bear' },
      { x: 565, y: 635, kind: 'moose' },
      { x: 515, y: 465, kind: 'wolf' },
      { x: 685, y: 495, kind: 'wolf' },
      { x: 355, y: 545, kind: 'wolf', allowedDifficulties: HARD_PREDATOR_DIFFS },
      { x: 225, y: 295, kind: 'cougar', allowedDifficulties: HARD_PREDATOR_DIFFS },
      { x: 585, y: 655, kind: 'birch' },
      { x: 545, y: 625, kind: 'birch' },
      { x: 245, y: 535, kind: 'maple' },
      { x: 535, y: 445, kind: 'cattail' },
      { x: 625, y: 755, kind: 'deer' },
      { x: 455, y: 445, kind: 'rabbit' },
      { x: 785, y: 785, kind: 'corpse' },
      { x: 482, y: 412, kind: 'rifle', allowedDifficulties: GUN_DIFFS },
      { x: 318, y: 642, kind: 'revolver', allowedDifficulties: GUN_DIFFS },
      { x: 462, y: 428, kind: 'interloper_loot', allowedDifficulties: LOW_LOOT_DIFFS },
      { x: 782, y: 798, kind: 'interloper_loot', allowedDifficulties: LOW_LOOT_DIFFS },
    ],
  },

  // ======================== 5. ОДИНОКАЯ ТОПЬ (FORLORN MUSKEG) ========================
  'forlorn-muskeg': {
    regionId: 'forlorn-muskeg',
    difficultyStars: 3,
    walkablePolygons: [
      [
        [45, 455],
        [145, 825],
        [485, 845],
        [895, 775],
        [955, 525],
        [915, 225],
        [545, 115],
        [195, 145],
        [65, 345],
      ],
    ],
    buildings: [
      { x: 280, y: 205, kind: 'landmark', rule: 'always_ruin', hasStove: true, scale: 1.3, labelRu: 'КУЗНИЦА СПЕНСА' },
      { x: 305, y: 215, kind: 'barn', rule: 'always_ruin' },
      { x: 560, y: 500, kind: 'trailer', rule: 'always_intact', hasStove: true, scale: 1.2, labelRu: 'ЛАГЕРЬ БРАКОНЬЕРОВ' },
      { x: 425, y: 500, kind: 'trailer', rule: 'always_intact' },
      { x: 685, y: 235, kind: 'tower', rule: 'always_intact' },
      { x: 325, y: 745, kind: 'tower', rule: 'always_intact' },
      { x: 705, y: 225, kind: 'bunker', rule: 'always_intact' },
      { x: 245, y: 785, kind: 'cave', rule: 'always_intact' },
      { x: 535, y: 135, kind: 'cave', rule: 'always_intact' },
      { x: 415, y: 285, kind: 'barn', rule: 'burns_on_interloper' },
      { x: 665, y: 645, kind: 'barn', rule: 'burns_on_stalker' },
    ],
    ropes: [
      { top: [265, 835], bottom: [245, 795], deployedDifficulties: ALL_DIFFS, labelRu: 'Подъём в Милтон' },
    ],
    extraPaths: [
      // Безопасный обход по южному берегу и кочкам к кузнице Спенса
      { kind: 'trail', points: [[920, 500], [835, 365], [685, 235], [535, 165], [280, 205]] },
      // Проверенный путь по снежным перешейкам от Лагеря браконьеров к Спенсу
      { kind: 'goat_path', points: [[560, 500], [455, 395], [375, 305], [280, 205]] },
      // Северный сухой обход к Марш-Ридж
      { kind: 'trail', points: [[885, 515], [725, 725], [465, 775], [245, 785], [115, 515]] },
      {
        kind: 'interloper_route',
        onlyLowLoot: true,
        points: [[945, 500], [560, 500], [455, 395], [280, 205]],
      },
    ],
    microSpawns: [
      { x: 485, y: 485, kind: 'bear' },
      { x: 345, y: 235, kind: 'bear' },
      { x: 265, y: 765, kind: 'moose' },
      { x: 765, y: 525, kind: 'moose', allowedDifficulties: UP_TO_STALKER },
      { x: 385, y: 345, kind: 'wolf' },
      { x: 645, y: 485, kind: 'wolf' },
      { x: 295, y: 245, kind: 'wolf', allowedDifficulties: HARD_PREDATOR_DIFFS },
      { x: 520, y: 565, kind: 'cattail' },
      { x: 625, y: 435, kind: 'cattail' },
      { x: 385, y: 595, kind: 'cattail' },
      { x: 465, y: 345, kind: 'cattail' },
      { x: 235, y: 755, kind: 'birch' },
      { x: 695, y: 255, kind: 'maple' },
      { x: 292, y: 196, kind: 'safe' },
      { x: 268, y: 198, kind: 'rifle', allowedDifficulties: GUN_DIFFS },
      { x: 275, y: 218, kind: 'interloper_loot', allowedDifficulties: LOW_LOOT_DIFFS },
      { x: 568, y: 512, kind: 'interloper_loot', allowedDifficulties: LOW_LOOT_DIFFS },
    ],
  },

  // ======================== 6. ВОЛЧЬЯ ГОРА (TIMBERWOLF MOUNTAIN) ========================
  'timberwolf-mountain': {
    regionId: 'timberwolf-mountain',
    difficultyStars: 4,
    walkablePolygons: [
      [
        [145, 145],
        [495, 135],
        [865, 225],
        [895, 585],
        [795, 895],
        [455, 875],
        [165, 745],
        [125, 425],
      ],
    ],
    buildings: [
      { x: 380, y: 230, kind: 'landmark', rule: 'always_intact', hasStove: true, scale: 1.25, labelRu: 'ХИЖИНА АЛЬПИНИСТОВ' },
      { x: 435, y: 255, kind: 'fishing_hut', rule: 'always_intact' },
      { x: 685, y: 825, kind: 'landmark', rule: 'always_ruin', hasStove: true, scale: 1.3, labelRu: 'ХВОСТ САМОЛЁТА (ВЕРШИНА)' },
      { x: 785, y: 545, kind: 'cave', rule: 'always_intact' },
      { x: 635, y: 785, kind: 'cave', rule: 'always_intact' },
      { x: 275, y: 585, kind: 'cave', rule: 'always_intact' },
      { x: 865, y: 395, kind: 'cave', rule: 'always_intact' },
    ],
    ropes: [
      { top: [685, 795], bottom: [725, 705], deployedDifficulties: ALL_DIFFS, labelRu: 'Финальный трос Вершины' },
      { top: [755, 535], bottom: [695, 445], deployedDifficulties: ALL_DIFFS, labelRu: 'Трос к Поляне оленей' },
      { top: [315, 625], bottom: [345, 525], deployedDifficulties: EASY_ROPE_DIFFS, labelRu: 'Западный трос у моста' },
    ],
    extraPaths: [
      { kind: 'trail', points: [[335, 145], [380, 230], [545, 265], [655, 295], [865, 395]] },
      { kind: 'trail', points: [[655, 295], [695, 445]] },
      { kind: 'trail', points: [[785, 545], [745, 665], [725, 705]] },
      { kind: 'trail', points: [[380, 230], [285, 395], [275, 585]] },
      { kind: 'log_bridge', points: [[445, 685], [495, 695]] },
      {
        kind: 'interloper_route',
        onlyLowLoot: true,
        points: [[335, 145], [380, 230], [655, 295], [785, 545], [685, 825]],
      },
    ],
    microSpawns: [
      { x: 625, y: 315, kind: 'bear' },
      { x: 335, y: 445, kind: 'bear' },
      { x: 525, y: 245, kind: 'moose' },
      { x: 415, y: 285, kind: 'wolf' },
      { x: 765, y: 525, kind: 'deer' },
      { x: 365, y: 205, kind: 'rabbit' },
      { x: 665, y: 835, kind: 'ptarmigan' },
      { x: 585, y: 335, kind: 'birch' },
      { x: 295, y: 465, kind: 'maple' },
      { x: 695, y: 815, kind: 'rifle', allowedDifficulties: GUN_DIFFS },
      { x: 392, y: 222, kind: 'interloper_loot', allowedDifficulties: LOW_LOOT_DIFFS },
      { x: 672, y: 832, kind: 'interloper_loot', allowedDifficulties: LOW_LOOT_DIFFS },
    ],
  },

  // ======================== 7. ПЕПЕЛЬНЫЙ КАНЬОН (ASH CANYON) ========================
  'ash-canyon': {
    regionId: 'ash-canyon',
    difficultyStars: 4,
    walkablePolygons: [
      [
        [145, 865],
        [465, 855],
        [835, 855],
        [865, 495],
        [795, 165],
        [235, 155],
        [155, 465],
      ],
    ],
    buildings: [
      { x: 485, y: 420, kind: 'landmark', rule: 'always_intact', hasStove: true, scale: 1.25, labelRu: 'УСАДЬБА РЫБОЛОВА' },
      { x: 715, y: 765, kind: 'landmark', rule: 'always_intact', hasStove: true, scale: 1.2, labelRu: 'ЛАГЕРЬ БРИГАДИРА' },
      { x: 685, y: 745, kind: 'barn', rule: 'always_ruin' },
      { x: 745, y: 265, kind: 'cabin', rule: 'burns_on_interloper', labelRu: 'ГОРЬКОЕ ПЛАТО' },
      { x: 765, y: 235, kind: 'fishing_hut', rule: 'always_intact' },
      { x: 245, y: 785, kind: 'cave', rule: 'always_intact', labelRu: 'ЗОЛОТОЙ РУДНИК' },
      { x: 215, y: 215, kind: 'cave', rule: 'always_intact' },
    ],
    ropes: [
      { top: [295, 765], bottom: [325, 685], deployedDifficulties: ALL_DIFFS, labelRu: 'Двойной спуск в Рудник' },
      { top: [715, 315], bottom: [685, 385], deployedDifficulties: UP_TO_STALKER, labelRu: 'Трос у Горького плато' },
    ],
    extraPaths: [
      { kind: 'trail', points: [[215, 215], [365, 335], [485, 420], [585, 555], [645, 685]] },
      // Знаменитые подвесные верёвочные мосты Пепельного каньона!
      { kind: 'bridge', points: [[615, 725], [675, 745]] },
      { kind: 'bridge', points: [[525, 785], [455, 795]] },
      { kind: 'bridge', points: [[395, 795], [335, 785]] },
      { kind: 'trail', points: [[715, 765], [525, 785], [335, 785], [245, 785]] },
      {
        kind: 'interloper_route',
        onlyLowLoot: true,
        points: [[215, 215], [485, 420], [645, 685], [715, 765], [245, 785]],
      },
    ],
    microSpawns: [
      { x: 675, y: 735, kind: 'bear' },
      { x: 355, y: 295, kind: 'moose' },
      { x: 465, y: 455, kind: 'wolf' },
      { x: 525, y: 395, kind: 'wolf', allowedDifficulties: HARD_PREDATOR_DIFFS },
      { x: 265, y: 545, kind: 'cougar', allowedDifficulties: HARD_PREDATOR_DIFFS },
      { x: 425, y: 365, kind: 'cattail' },
      { x: 545, y: 485, kind: 'cattail' },
      { x: 735, y: 785, kind: 'ptarmigan' },
      { x: 645, y: 615, kind: 'birch' },
      { x: 695, y: 755, kind: 'rifle', allowedDifficulties: GUN_DIFFS },
      { x: 258, y: 792, kind: 'interloper_loot', allowedDifficulties: ALL_DIFFS },
    ],
  },

  // ======================== 8. ЗОНА ЗАПУСТЕНИЯ (DESOLATION POINT) ========================
  'desolation-point': {
    regionId: 'desolation-point',
    difficultyStars: 3,
    walkablePolygons: [
      [
        [95, 435],
        [195, 785],
        [685, 815],
        [905, 585],
        [885, 245],
        [455, 185],
        [135, 285],
      ],
    ],
    buildings: [
      { x: 390, y: 350, kind: 'landmark', rule: 'always_intact', hasStove: true, scale: 1.3, labelRu: 'СУДНО «РИКЕН»' },
      { x: 785, y: 505, kind: 'industrial', rule: 'always_intact', hasStove: true, scale: 1.3, labelRu: 'ЗАВОД «ХАЙБЕРНИЯ»' },
      { x: 755, y: 525, kind: 'trailer', rule: 'always_intact' },
      { x: 185, y: 485, kind: 'tower', rule: 'always_intact', hasStove: true, scale: 1.25, labelRu: 'ОДИНОКИЙ МАЯК' },
      { x: 465, y: 665, kind: 'landmark', rule: 'always_ruin', hasStove: true, labelRu: 'КАМЕННАЯ ЦЕРКОВЬ' },
      { x: 615, y: 565, kind: 'cabin', rule: 'burns_on_interloper', labelRu: 'ДОМИК КЭЙТИ' },
      { x: 285, y: 715, kind: 'cave', rule: 'always_intact' },
      { x: 645, y: 745, kind: 'cave', rule: 'always_intact' },
    ],
    ropes: [],
    extraPaths: [
      { kind: 'highway', points: [[105, 555], [295, 585], [465, 625], [665, 565], [785, 505]] },
      { kind: 'bridge', points: [[545, 595], [585, 585]] },
      { kind: 'trail', points: [[185, 485], [390, 350], [785, 505]] },
      { kind: 'trail', points: [[465, 665], [645, 745]] },
      {
        kind: 'interloper_route',
        onlyLowLoot: true,
        points: [[105, 555], [185, 485], [390, 350], [785, 505]],
      },
    ],
    microSpawns: [
      { x: 565, y: 595, kind: 'bear' },
      { x: 545, y: 525, kind: 'moose' },
      { x: 745, y: 485, kind: 'wolf' },
      { x: 345, y: 445, kind: 'wolf' },
      { x: 485, y: 685, kind: 'rabbit' },
      { x: 625, y: 585, kind: 'maple' },
      { x: 445, y: 695, kind: 'birch' },
      { x: 798, y: 515, kind: 'safe' },
      { x: 198, y: 492, kind: 'rifle', allowedDifficulties: GUN_DIFFS },
      { x: 402, y: 342, kind: 'interloper_loot', allowedDifficulties: LOW_LOOT_DIFFS },
    ],
  },

  // ======================== 9. РАЗБИТАЯ Ж/Д (BROKEN RAILROAD) ========================
  'broken-railroad': {
    regionId: 'broken-railroad',
    difficultyStars: 3,
    walkablePolygons: [
      [
        [85, 395],
        [245, 895],
        [585, 895],
        [925, 545],
        [915, 325],
        [445, 225],
        [115, 265],
      ],
    ],
    buildings: [
      { x: 520, y: 475, kind: 'industrial', rule: 'always_intact', hasStove: true, scale: 1.35, labelRu: 'РЕМОНТНОЕ ДЕПО' },
      { x: 395, y: 845, kind: 'landmark', rule: 'always_intact', hasStove: true, scale: 1.25, labelRu: 'ОХОТНИЧИЙ ДОМИК' },
      { x: 645, y: 315, kind: 'barn', rule: 'burns_on_interloper' },
      { x: 265, y: 445, kind: 'cave', rule: 'always_intact' },
    ],
    ropes: [
      { top: [365, 815], bottom: [345, 695], deployedDifficulties: EASY_ROPE_DIFFS, labelRu: 'Трос у Охотничьего домика' },
      { top: [195, 455], bottom: [195, 365], deployedDifficulties: ALL_DIFFS, labelRu: 'Трос в ущелье моста' },
    ],
    extraPaths: [
      { kind: 'railway', points: [[95, 455], [520, 475], [935, 475]] },
      { kind: 'dirt_road', points: [[520, 475], [565, 665], [475, 775], [395, 845]] },
      { kind: 'bridge', points: [[155, 455], [225, 458]] },
      {
        kind: 'interloper_route',
        onlyLowLoot: true,
        points: [[935, 475], [520, 475], [395, 845]],
      },
    ],
    microSpawns: [
      { x: 295, y: 345, kind: 'bear' },
      { x: 435, y: 815, kind: 'moose' },
      { x: 545, y: 445, kind: 'wolf' },
      { x: 495, y: 525, kind: 'wolf', allowedDifficulties: HARD_PREDATOR_DIFFS },
      { x: 665, y: 345, kind: 'deer' },
      { x: 425, y: 865, kind: 'rabbit' },
      { x: 465, y: 795, kind: 'birch' },
      { x: 285, y: 495, kind: 'maple' },
      { x: 408, y: 852, kind: 'rifle', allowedDifficulties: GUN_DIFFS },
      { x: 535, y: 485, kind: 'interloper_loot', allowedDifficulties: LOW_LOOT_DIFFS },
    ],
  },

  // ======================== 10. ДОЛИНА ТИХОЙ РЕКИ (HUSHED RIVER VALLEY) ========================
  'hushed-river-valley': {
    regionId: 'hushed-river-valley',
    difficultyStars: 5,
    walkablePolygons: [
      [
        [135, 225],
        [165, 845],
        [825, 865],
        [875, 255],
        [515, 135],
      ],
    ],
    buildings: [
      // В регионе 0 рукотворных домов — только ледяные пещеры, бункер и сигнальный костёр!
      { x: 455, y: 525, kind: 'cave', rule: 'always_intact', labelRu: 'ЛЕДЯНЫЕ ПЕЩЕРЫ' },
      { x: 315, y: 745, kind: 'cave', rule: 'always_intact' },
      { x: 695, y: 385, kind: 'cave', rule: 'always_intact' },
      { x: 515, y: 165, kind: 'cave', rule: 'always_intact' },
      { x: 265, y: 365, kind: 'bunker', rule: 'always_intact' },
    ],
    ropes: [
      { top: [365, 685], bottom: [395, 595], deployedDifficulties: UP_TO_STALKER, labelRu: 'Трос у Монолитного озера' },
      { top: [645, 695], bottom: [615, 595], deployedDifficulties: ALL_DIFFS, labelRu: 'Трос к Сигнальному костру' },
    ],
    extraPaths: [
      { kind: 'trail', points: [[515, 165], [455, 355], [455, 525], [395, 595]] },
      { kind: 'trail', points: [[455, 525], [615, 595], [685, 775]] },
      { kind: 'log_bridge', points: [[525, 645], [565, 665]] },
      {
        kind: 'interloper_route',
        onlyLowLoot: true,
        points: [[515, 165], [455, 525], [685, 775]],
      },
    ],
    microSpawns: [
      { x: 325, y: 695, kind: 'moose' },
      { x: 595, y: 445, kind: 'bear' },
      { x: 475, y: 515, kind: 'wolf' },
      { x: 255, y: 625, kind: 'cougar', allowedDifficulties: HARD_PREDATOR_DIFFS },
      { x: 435, y: 395, kind: 'cattail' },
      { x: 525, y: 425, kind: 'cattail' },
      { x: 355, y: 765, kind: 'maple' },
      { x: 655, y: 745, kind: 'birch' },
      { x: 685, y: 775, kind: 'interloper_loot', allowedDifficulties: ALL_DIFFS },
    ],
  },

  // ======================== 11. БЛЕДНАЯ БУХТА (BLEAK INLET) ========================
  'bleak-inlet': {
    regionId: 'bleak-inlet',
    difficultyStars: 5,
    walkablePolygons: [
      // Нижняя дельта и верхнее восточное плато (разделены высоким обрывом!)
      [
        [95, 195],
        [145, 785],
        [565, 745],
        [645, 525],
        [875, 425],
        [865, 185],
      ],
      [
        [685, 665],
        [695, 885],
        [915, 885],
        [895, 655],
      ],
    ],
    buildings: [
      { x: 480, y: 350, kind: 'industrial', rule: 'always_intact', hasStove: true, scale: 1.35, labelRu: 'КОНСЕРВНЫЙ ЗАВОД' },
      { x: 535, y: 395, kind: 'trailer', rule: 'always_intact' },
      { x: 785, y: 785, kind: 'tower', rule: 'always_intact', labelRu: 'РАДИОВЫШКА «ЭХО-1»' },
      { x: 765, y: 775, kind: 'trailer', rule: 'always_intact' },
      { x: 225, y: 315, kind: 'cabin', rule: 'always_intact', hasStove: true, labelRu: 'ХИЖИНА НА ОТШИБЕ' },
      { x: 645, y: 595, kind: 'tower', rule: 'always_intact', hasStove: true, labelRu: 'ВЫШКА ЗАМОРСКАЯ' },
      { x: 825, y: 285, kind: 'lighthouse' as 'tower', rule: 'always_intact', labelRu: 'УПАВШИЙ МАЯК' },
      { x: 355, y: 285, kind: 'fishing_hut', rule: 'always_intact' },
      { x: 265, y: 745, kind: 'cave', rule: 'always_intact' },
    ],
    ropes: [
      { top: [715, 715], bottom: [665, 635], deployedDifficulties: ['pilgrim'], labelRu: 'Трос с плато Эхо-1 (нужно привязать!)' },
    ],
    extraPaths: [
      { kind: 'highway', points: [[225, 315], [480, 350], [825, 285]] },
      { kind: 'bridge', points: [[615, 335], [655, 325]] },
      { kind: 'trail', points: [[265, 745], [385, 565], [480, 350]] },
      { kind: 'trail', points: [[865, 855], [785, 785], [715, 715]] },
    ],
    microSpawns: [
      // Стаи лесных волков (Timberwolves)!
      { x: 495, y: 385, kind: 'timberwolf' },
      { x: 635, y: 365, kind: 'timberwolf' },
      { x: 765, y: 755, kind: 'timberwolf', allowedDifficulties: HARD_PREDATOR_DIFFS },
      { x: 345, y: 625, kind: 'moose' },
      { x: 255, y: 445, kind: 'bear' },
      { x: 415, y: 585, kind: 'cattail' },
      { x: 492, y: 338, kind: 'revolver', allowedDifficulties: GUN_DIFFS },
    ],
  },

  // ======================== 12. ЧЁРНЫЙ КАМЕНЬ (BLACKROCK) ========================
  blackrock: {
    regionId: 'blackrock',
    difficultyStars: 4,
    walkablePolygons: [
      [
        [135, 165],
        [155, 795],
        [445, 905],
        [665, 895],
        [875, 695],
        [865, 195],
      ],
    ],
    buildings: [
      { x: 495, y: 540, kind: 'industrial', rule: 'always_intact', hasStove: true, scale: 1.4, labelRu: 'ТЮРЬМА ЧЁРНЫЙ КАМЕНЬ' },
      { x: 245, y: 425, kind: 'industrial', rule: 'always_intact', labelRu: 'ПОДСТАНЦИЯ' },
      { x: 735, y: 365, kind: 'cabin', rule: 'always_intact', hasStove: true, labelRu: 'ДОМИК БРИГАДИРА' },
      { x: 685, y: 645, kind: 'barn', rule: 'burns_on_interloper', hasStove: true, labelRu: 'СТАРАЯ МЕЛЬНИЦА' },
      { x: 515, y: 845, kind: 'cave', rule: 'always_intact', labelRu: 'ШАХТА «ПОСЛЕДНЯЯ НАДЕЖДА»' },
    ],
    ropes: [
      { top: [515, 795], bottom: [515, 715], deployedDifficulties: ALL_DIFFS, labelRu: 'Каньон к Шахте' },
    ],
    extraPaths: [
      { kind: 'highway', points: [[165, 215], [345, 385], [495, 540], [795, 615]] },
      { kind: 'bridge', points: [[395, 445], [425, 475]] },
      { kind: 'trail', points: [[495, 540], [515, 715]] },
      { kind: 'trail', points: [[495, 540], [735, 365]] },
    ],
    microSpawns: [
      { x: 365, y: 415, kind: 'timberwolf' },
      { x: 645, y: 575, kind: 'timberwolf' },
      { x: 715, y: 395, kind: 'bear' },
      { x: 285, y: 565, kind: 'moose' },
      { x: 225, y: 685, kind: 'cougar', allowedDifficulties: HARD_PREDATOR_DIFFS },
      { x: 525, y: 855, kind: 'interloper_loot', allowedDifficulties: ALL_DIFFS },
    ],
  },

  // ======================== 13. БРОШЕННЫЙ АЭРОДРОМ (FORSAKEN AIRFIELD — DLC) ========================
  'forsaken-airfield': {
    regionId: 'forsaken-airfield',
    difficultyStars: 4,
    walkablePolygons: [
      [
        [115, 165],
        [125, 785],
        [525, 865],
        [905, 825],
        [915, 225],
        [485, 145],
      ],
    ],
    buildings: [
      { x: 640, y: 560, kind: 'industrial', rule: 'always_intact', hasStove: true, scale: 1.4, labelRu: 'ГЛАВНЫЙ АНГАР И ВЫШКА' },
      { x: 685, y: 585, kind: 'tower', rule: 'always_intact' },
      { x: 585, y: 535, kind: 'trailer', rule: 'always_intact' },
      { x: 255, y: 285, kind: 'landmark', rule: 'always_intact', hasStove: true, scale: 1.2, labelRu: 'ДР. ОСТРОВ (КОТТЕДЖ)' },
      { x: 215, y: 685, kind: 'landmark', rule: 'always_intact', hasStove: true, scale: 1.15, labelRu: 'РАЗУМНЫЙ ПРИЮТ' },
      { x: 315, y: 365, kind: 'fishing_hut', rule: 'always_intact', hasStove: true },
      { x: 465, y: 765, kind: 'barn', rule: 'burns_on_interloper' },
    ],
    ropes: [],
    extraPaths: [
      { kind: 'highway', points: [[895, 775], [765, 665], [640, 560]] },
      { kind: 'dirt_road', points: [[640, 560], [455, 455], [255, 285]] },
      { kind: 'trail', points: [[455, 455], [325, 585], [215, 685]] },
      {
        kind: 'interloper_route',
        onlyLowLoot: true,
        points: [[895, 775], [640, 560], [255, 285]],
      },
    ],
    microSpawns: [
      { x: 355, y: 315, kind: 'wolf' },
      { x: 565, y: 495, kind: 'wolf' },
      { x: 295, y: 595, kind: 'bear' },
      { x: 445, y: 735, kind: 'moose' },
      { x: 275, y: 295, kind: 'ptarmigan' },
      { x: 235, y: 695, kind: 'ptarmigan' },
      { x: 385, y: 245, kind: 'cattail' },
      { x: 655, y: 575, kind: 'interloper_loot', allowedDifficulties: ALL_DIFFS },
    ],
  },

  // ======================== 14. ЗОНА ЗАРАЖЕНИЯ (ZONE OF CONTAMINATION — DLC) ========================
  'zone-of-contamination': {
    regionId: 'zone-of-contamination',
    difficultyStars: 5,
    walkablePolygons: [
      [
        [145, 195],
        [165, 835],
        [845, 855],
        [875, 215],
      ],
    ],
    buildings: [
      { x: 520, y: 675, kind: 'industrial', rule: 'always_intact', hasStove: true, scale: 1.45, labelRu: 'КОНЦЕНТРАТОР И ШАХТА' },
      { x: 390, y: 470, kind: 'landmark', rule: 'always_intact', hasStove: true, scale: 1.25, labelRu: 'ХОЛОСТОЙ ЛАГЕРЬ' },
      { x: 365, y: 485, kind: 'trailer', rule: 'always_intact' },
      { x: 415, y: 485, kind: 'trailer', rule: 'always_intact' },
      { x: 545, y: 785, kind: 'cave', rule: 'always_intact', labelRu: 'ШАХТА «ЛЭНГСТОН»' },
    ],
    ropes: [
      { top: [395, 535], bottom: [435, 585], deployedDifficulties: ALL_DIFFS, labelRu: 'Трос к Концентратору' },
    ],
    extraPaths: [
      { kind: 'railway', points: [[865, 345], [645, 485], [520, 675]] },
      { kind: 'dirt_road', points: [[390, 470], [520, 675], [545, 785]] },
    ],
    microSpawns: [
      { x: 545, y: 545, kind: 'wolf' },
      { x: 635, y: 435, kind: 'wolf' },
      { x: 485, y: 595, kind: 'wolf', allowedDifficulties: HARD_PREDATOR_DIFFS },
      { x: 265, y: 665, kind: 'bear' },
      { x: 532, y: 685, kind: 'interloper_loot', allowedDifficulties: ALL_DIFFS },
    ],
  },

  // ======================== 15. РАСКОЛОТЫЙ ПЕРЕВАЛ (SUNDERED PASS — DLC) ========================
  'sundered-pass': {
    regionId: 'sundered-pass',
    difficultyStars: 5,
    walkablePolygons: [
      [
        [135, 645],
        [185, 885],
        [645, 865],
        [875, 485],
        [835, 165],
        [395, 195],
      ],
    ],
    buildings: [
      { x: 295, y: 790, kind: 'landmark', rule: 'always_intact', hasStove: true, scale: 1.35, labelRu: 'МЕТЕОСТАНЦИЯ' },
      { x: 325, y: 775, kind: 'tower', rule: 'always_intact' },
      { x: 620, y: 345, kind: 'landmark', rule: 'always_intact', hasStove: true, scale: 1.2, labelRu: 'ПРИЮТ В ДОЛИНЕ' },
      { x: 485, y: 545, kind: 'cabin', rule: 'always_ruin', hasStove: true, labelRu: 'ПОЛУЗАСЫПАННЫЙ ДОМ' },
      { x: 745, y: 265, kind: 'cave', rule: 'always_intact' },
    ],
    ropes: [
      { top: [415, 685], bottom: [465, 595], deployedDifficulties: ALL_DIFFS, labelRu: 'Ледниковый уступ' },
    ],
    extraPaths: [
      { kind: 'trail', points: [[795, 225], [620, 345], [485, 545], [415, 685], [295, 790]] },
      { kind: 'bridge', points: [[365, 735], [335, 755]] },
    ],
    microSpawns: [
      { x: 355, y: 765, kind: 'timberwolf' },
      { x: 455, y: 635, kind: 'timberwolf' },
      { x: 525, y: 495, kind: 'timberwolf', allowedDifficulties: HARD_PREDATOR_DIFFS },
      { x: 665, y: 385, kind: 'ptarmigan' },
      { x: 595, y: 315, kind: 'deer' },
      { x: 285, y: 798, kind: 'interloper_loot', allowedDifficulties: ALL_DIFFS },
    ],
  },
};
