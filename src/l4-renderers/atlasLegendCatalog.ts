import type { CanvasLayerKey } from '../l0-primitives/types.ts';

export interface AtlasLegendEntry {
  readonly id: string;
  readonly titleRu: string;
  readonly detailRu: string;
  readonly layerKey?: CanvasLayerKey;
  /** Возвращает внутреннюю векторную графику значка в локальной системе координат [-14..14, -9..9] */
  readonly renderIcon: (isCharcoal: boolean) => string;
}

export interface AtlasLegendGroup {
  readonly id: string;
  readonly titleRu: string;
  readonly subtitleRu: string;
  readonly layerKey?: CanvasLayerKey;
  readonly items: readonly AtlasLegendEntry[];
}

export const ATLAS_LEGEND_GROUPS: readonly AtlasLegendGroup[] = [
  {
    id: 'roads-terrain',
    titleRu: '1. Дороги, тропы, мосты и рельеф',
    subtitleRu: 'Транспортные ориентиры для навигации в метель и границы проходимой долины',
    layerKey: 'ropesAndRoutes',
    items: [
      {
        id: 'highway',
        titleRu: 'Главная дорога',
        detailRu: 'Асфальтированное шоссе — самый надёжный линейный ориентир в нулевую видимость.',
        renderIcon: () => `
          <line x1="-13" y1="0" x2="13" y2="0" stroke="#262019" stroke-width="6.2" stroke-linecap="round" />
          <line x1="-13" y1="0" x2="13" y2="0" stroke="#f3ede0" stroke-width="3.6" stroke-linecap="round" />
          <line x1="-11" y1="0" x2="11" y2="0" stroke="#262019" stroke-width="1.1" stroke-dasharray="4 3" />
        `,
      },
      {
        id: 'dirt_road',
        titleRu: 'Грунтовая дорога',
        detailRu: 'Просёлочная колея к фермам, вышкам, лесопилкам и бункерам.',
        renderIcon: () => `
          <line x1="-13" y1="0" x2="13" y2="0" stroke="#3f3226" stroke-width="4.4" stroke-dasharray="6 3.5" stroke-linecap="round" />
          <line x1="-13" y1="0" x2="13" y2="0" stroke="#efe6d5" stroke-width="2" stroke-linecap="round" />
        `,
      },
      {
        id: 'railway',
        titleRu: 'Ж/Д путь',
        detailRu: 'Железнодорожная магистраль острова со шпалами, связывающая Озеро, Топь и Разбитую Ж/Д.',
        renderIcon: () => `
          <line x1="-13" y1="0" x2="13" y2="0" stroke="#231d18" stroke-width="5.5" />
          <line x1="-12" y1="0" x2="12" y2="0" stroke="#f3ede0" stroke-width="3.5" stroke-dasharray="4 4" />
        `,
      },
      {
        id: 'trail',
        titleRu: 'Лесная тропа',
        detailRu: 'Утоптанная охотничья или туристическая тропинка между укрытиями.',
        layerKey: 'ropesAndRoutes',
        renderIcon: (isCharcoal) => `
          <line x1="-13" y1="0" x2="13" y2="0" stroke="${isCharcoal ? '#3d3126' : '#e2e8f0'}" stroke-width="2.2" stroke-dasharray="4.5 3.5" stroke-linecap="round" />
        `,
      },
      {
        id: 'goat_path',
        titleRu: 'Пеший обход (козья тропа)',
        detailRu: 'Крутой спуск по уступам без альпинистского троса (осторожно: риск растяжения лодыжки!).',
        layerKey: 'ropesAndRoutes',
        renderIcon: (isCharcoal) => `
          <line x1="-13" y1="0" x2="13" y2="0" stroke="${isCharcoal ? '#6e563a' : '#94a3b8'}" stroke-width="2" stroke-dasharray="1.8 3.5" stroke-linecap="round" />
        `,
      },
      {
        id: 'bridge',
        titleRu: 'Мост / Подвесной мост',
        detailRu: 'Автомобильный, каменный или верёвочный подвесной мост через ущелье или реку.',
        renderIcon: () => `
          <line x1="-12" y1="0" x2="12" y2="0" stroke="#231c16" stroke-width="8.5" />
          <line x1="-12" y1="0" x2="12" y2="0" stroke="#d8b482" stroke-width="5" />
          <line x1="-12" y1="0" x2="12" y2="0" stroke="#231c16" stroke-width="5" stroke-dasharray="2 3" opacity="0.45" />
        `,
      },
      {
        id: 'log_bridge',
        titleRu: 'Переход по бревну',
        detailRu: 'Поваленное дерево над пропастью или ручьём — узкая переправа.',
        layerKey: 'ropesAndRoutes',
        renderIcon: () => `
          <line x1="-12" y1="1" x2="12" y2="-1" stroke="#231910" stroke-width="5.5" stroke-linecap="round" />
          <line x1="-12" y1="1" x2="12" y2="-1" stroke="#8c5828" stroke-width="3.4" stroke-linecap="round" />
          <line x1="-3" y1="0" x2="-6" y2="-4" stroke="#5c3818" stroke-width="1.6" stroke-linecap="round" />
        `,
      },
      {
        id: 'interloper_route',
        titleRu: 'Путь выживания (НГ)',
        detailRu: 'Оранжевый пунктир оптимальной факельной цепочки к спичкам и кузнице на «Незваном госте» / «Страданиях».',
        layerKey: 'ropesAndRoutes',
        renderIcon: () => `
          <line x1="-13" y1="0" x2="13" y2="0" stroke="#ea580c" stroke-width="5" stroke-dasharray="6 4" opacity="0.4" stroke-linecap="round" />
          <line x1="-13" y1="0" x2="13" y2="0" stroke="#f59e0b" stroke-width="2.2" stroke-dasharray="6 4" stroke-linecap="round" />
        `,
      },
      {
        id: 'walkable_zone',
        titleRu: 'Доступная долина',
        detailRu: 'Светлая проходимая территория региона, окружённая скальными бергштрихами.',
        renderIcon: (isCharcoal) => `
          <rect x="-10" y="-5.5" width="20" height="11" rx="1.5" fill="${isCharcoal ? '#ebe4d3' : '#152636'}" stroke="${isCharcoal ? '#362d24' : '#6cb4cc'}" stroke-width="1.6" />
        `,
      },
      {
        id: 'unwalkable_rock',
        titleRu: 'Недоступные скалы',
        detailRu: 'Непроходимый горный массив с изолиниями высот за пределами игровой границы.',
        renderIcon: (isCharcoal) => `
          <rect x="-10" y="-5.5" width="20" height="11" rx="1.5" fill="${isCharcoal ? '#c8baa0' : '#081018'}" stroke="#57534e" stroke-width="1.3" />
          <path d="M -6 3 L -2 -3 L 2 2 L 5 -2 L 8 3" fill="none" stroke="#44403c" stroke-width="1.2" />
        `,
      },
      {
        id: 'thin_ice',
        titleRu: 'Слабый лёд (полынья)',
        detailRu: 'Красная штриховка тонкого льда: задержка дольше 3 секунд приводит к провалу в ледяную воду и гипотермии!',
        renderIcon: () => `
          <rect x="-10" y="-5.5" width="20" height="11" rx="1.5" fill="rgba(220,38,38,0.22)" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="3 2" />
          <line x1="-6" y1="4" x2="0" y2="-4" stroke="#dc2626" stroke-width="1.3" />
          <line x1="1" y1="4" x2="7" y2="-4" stroke="#dc2626" stroke-width="1.3" />
        `,
      },
      {
        id: 'waterfall_powerline',
        titleRu: 'Водопад / Линия ЛЭП',
        detailRu: 'Голубые каскады замёрзших водопадов и столбы ЛЭП (искрят во время Полярного сияния!).',
        renderIcon: () => `
          <path d="M -11 -3 H -2 M -9 0 H -4 M -10 3 H -3" stroke="#0284c7" stroke-width="1.8" stroke-linecap="round" />
          <line x1="6" y1="-6" x2="6" y2="5" stroke="#334155" stroke-width="1.6" />
          <line x1="2" y1="-3" x2="10" y2="-3" stroke="#334155" stroke-width="1.5" />
        `,
      },
    ],
  },
  {
    id: 'buildings-difficulty',
    titleRu: '2. Постройки и перестройка под уровень сложности',
    subtitleRu: 'Состояние крыш, печей и руин автоматически пересчитывается для Пилигрима — Страданий',
    layerKey: 'buildingsAndSublocs',
    items: [
      {
        id: 'landmark_building',
        titleRu: 'Особое / ключевое строение',
        detailRu: 'Главные именные базы региона (Турбаза, Дом Серой Матери, Квонсет, Усадьба, Ангар) — всегда уцелевшие.',
        layerKey: 'buildingsAndSublocs',
        renderIcon: () => `
          <polygon points="-7,6 -7,-1 0,-7 7,-1 7,6" fill="#c92a2a" stroke="#18130e" stroke-width="1.4" />
          <rect x="-2" y="1" width="4" height="5" fill="#fde68a" />
        `,
      },
      {
        id: 'intact_house',
        titleRu: 'Простое целое строение',
        detailRu: 'Уцелевший жилой дом, вагончик или хижина с защитой от ветра и контейнерами.',
        layerKey: 'buildingsAndSublocs',
        renderIcon: (isCharcoal) => `
          <polygon points="-7,6 -7,-1 0,-7 7,-1 7,6" fill="${isCharcoal ? '#332b24' : '#cbd5e1'}" stroke="#18130e" stroke-width="1.4" />
          <rect x="-2" y="1" width="4" height="5" fill="#d6cbb8" />
        `,
      },
      {
        id: 'stove_house',
        titleRu: 'Строение с тёплой печью',
        detailRu: 'Укрытие с камином, буржуйкой или 6-конфорочной плитой (труба с дымком над крышей).',
        layerKey: 'buildingsAndSublocs',
        renderIcon: (isCharcoal) => `
          <rect x="2.5" y="-8" width="2.6" height="5" fill="#18130e" />
          <path d="M 4 -8.5 Q 6.5 -10.5 4 -12" stroke="${isCharcoal ? '#57534e' : '#cbd5e1'}" stroke-width="1.2" fill="none" />
          <polygon points="-7,6 -7,-1 0,-6.5 7,-1 7,6" fill="${isCharcoal ? '#332b24' : '#cbd5e1'}" stroke="#18130e" stroke-width="1.4" />
        `,
      },
      {
        id: 'random_house',
        titleRu: 'Рандом (цел или руины)',
        detailRu: 'На Страннике/Сталкере в каждом новом забеге генератор случайно решает, цел этот дом или сгорел.',
        layerKey: 'buildingsAndSublocs',
        renderIcon: (isCharcoal) => `
          <polygon points="-7,6 -7,-1 0,-7 0,6" fill="${isCharcoal ? '#332b24' : '#cbd5e1'}" stroke="#18130e" stroke-width="1.3" />
          <path d="M 0,6 H 7 V 0" fill="none" stroke="#78716c" stroke-width="1.3" stroke-dasharray="2 2" />
          <rect x="3.5" y="-5" width="2.5" height="9" fill="#78716c" />
        `,
      },
      {
        id: 'burned_house',
        titleRu: 'Сгорело на этой сложности',
        detailRu: 'Одинокая печная труба и обломки: на «Сталкере» и особенно «Незваном госте» такие дома гарантированно сожжены!',
        layerKey: 'buildingsAndSublocs',
        renderIcon: () => `
          <path d="M -7,6 H 7 M -6,6 V 2 M 6,6 V 3" stroke="#78716c" stroke-width="1.5" fill="none" />
          <rect x="1" y="-5.5" width="3.2" height="11.5" fill="#991b1b" stroke="#18130e" stroke-width="1" />
          <line x1="-6" y1="-3" x2="-1" y2="2" stroke="#dc2626" stroke-width="1.5" />
          <line x1="-1" y1="-3" x2="-6" y2="2" stroke="#dc2626" stroke-width="1.5" />
        `,
      },
      {
        id: 'bunker_hatch',
        titleRu: 'Бункер выживальщика',
        detailRu: 'Подземный люк с припасами (в системе 9 бункеров TFTFT 3 из 9 заполнены богатым лутом на стандартных режимах).',
        layerKey: 'buildingsAndSublocs',
        renderIcon: () => `
          <rect x="-6" y="-6" width="12" height="12" rx="2" fill="#1e293b" stroke="#fbbf24" stroke-width="1.6" />
          <line x1="-3.5" y1="0" x2="3.5" y2="0" stroke="#fbbf24" stroke-width="1.5" />
          <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke="#fbbf24" stroke-width="1.5" />
        `,
      },
      {
        id: 'watchtower',
        titleRu: 'Вышка / Маяк / Радиомачта',
        detailRu: 'Высотная дозорная вышка лесника, каменный маяк или ретранслятор «Сигнал Пустоты».',
        layerKey: 'buildingsAndSublocs',
        renderIcon: () => `
          <path d="M -5 7 L -2 -4 H 2 L 5 7 M -4 2 H 4" stroke="#18130e" stroke-width="1.5" fill="none" />
          <polygon points="-4,-4 0,-8.5 4,-4" fill="#c92a2a" stroke="#18130e" stroke-width="1" />
        `,
      },
      {
        id: 'fishing_hut',
        titleRu: 'Рыбацкая будка и прорубь',
        detailRu: 'Деревянная будка на льду озера или залива (часто с буржуйкой для защиты от метели во время лова).',
        layerKey: 'buildingsAndSublocs',
        renderIcon: () => `
          <rect x="-6" y="-4" width="12" height="8" rx="1" fill="#3f5e75" stroke="#18130e" stroke-width="1.3" />
          <circle cx="0" cy="0" r="2" fill="#fb923c" />
        `,
      },
    ],
  },
  {
    id: 'ropes-caves-spawns',
    titleRu: '3. Альпинистские тросы, пещеры и точки старта',
    subtitleRu: 'Вертикальные переходы между ярусами карты и стартовые точки забега',
    layerKey: 'ropesAndRoutes',
    items: [
      {
        id: 'rope_deployed',
        titleRu: 'Место с привязанным тросом',
        detailRu: 'Альпинистский трос уже висит на скале с начала игры для выбранной вами сложности.',
        layerKey: 'ropesAndRoutes',
        renderIcon: () => `
          <circle cx="0" cy="0" r="6.5" fill="#fbbf24" stroke="#1c1917" stroke-width="1.4" />
          <path d="M -2.5 -2 C -2.5 -4.5, 2.5 -4.5, 2.5 -2 C 2.5 0.5, -2.5 0.5, -2.5 3.5" stroke="#1c1917" stroke-width="1.5" fill="none" />
        `,
      },
      {
        id: 'rope_missing',
        titleRu: 'Трос снят (нужен свой 5 кг)',
        detailRu: 'Пустой скальный уступ! На высокой сложности трос здесь убран — нужно принести и привязать свой.',
        layerKey: 'ropesAndRoutes',
        renderIcon: () => `
          <circle cx="0" cy="0" r="6.5" fill="#fef2f2" stroke="#dc2626" stroke-width="1.5" />
          <line x1="-3" y1="-3" x2="3" y2="3" stroke="#dc2626" stroke-width="1.8" />
          <line x1="3" y1="-3" x2="-3" y2="3" stroke="#dc2626" stroke-width="1.8" />
        `,
      },
      {
        id: 'cliff_direction',
        titleRu: 'Направление спуска с обрыва',
        detailRu: 'Шеврон вдоль троса указывает, в какую сторону склон уходит вниз (от верхней площадки к подножию).',
        layerKey: 'ropesAndRoutes',
        renderIcon: () => `
          <circle cx="0" cy="0" r="6.2" fill="#4c1d95" stroke="#fde68a" stroke-width="1.2" />
          <path d="M -3 -1.5 L 0 2.5 L 3 -1.5" fill="none" stroke="#fde68a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        `,
      },
      {
        id: 'major_cave',
        titleRu: 'Большая пещера / Шахта',
        detailRu: 'Глубокая переходная пещера или угольная шахта (в глубине держится плюсовая температура и спавнится уголь).',
        layerKey: 'buildingsAndSublocs',
        renderIcon: () => `
          <path d="M -8 6 C -8 -5, 8 -5, 8 6 Z" fill="#14110f" stroke="#dc2626" stroke-width="1.6" />
          <path d="M -4 6 C -4 0, 4 0, 4 6 Z" fill="#44403c" />
        `,
      },
      {
        id: 'small_cave',
        titleRu: 'Малая пещера / Грот',
        detailRu: 'Небольшая открытая пещера без экрана загрузки: спасает от ветра и «Замкнутого пространства» (Cabin Fever)!',
        layerKey: 'lootAndStations',
        renderIcon: () => `
          <path d="M 0 7 C -5 2, -6 -2, -6 -4 A 6 6 0 1 1 6 -4 C 6 -2, 5 2, 0 7 Z" fill="#0d9488" stroke="#134e4a" stroke-width="1.3" />
          <circle cx="0" cy="-3" r="2.2" fill="#ccfbf1" />
        `,
      },
      {
        id: 'start_spawn',
        titleRu: 'Возможное место старта',
        detailRu: 'Зелёный маркер точки, в которой игра может случайно высадить выжившего в начале нового забега.',
        layerKey: 'lootAndStations',
        renderIcon: () => `
          <path d="M 0 7 C -5 2, -6 -2, -6 -4 A 6 6 0 1 1 6 -4 C 6 -2, 5 2, 0 7 Z" fill="#16a34a" stroke="#052e16" stroke-width="1.3" />
          <text x="0" y="-0.5" text-anchor="middle" fill="#ffffff" font-family="Oswald, sans-serif" font-size="7.5" font-weight="700">S</text>
        `,
      },
    ],
  },
  {
    id: 'weapons-stations-loot',
    titleRu: '4. Оружие, верстаки, кузни, кровати и контейнеры',
    subtitleRu: 'Огнестрел и луки автоматически скрываются на Незваном госте, уступая место пулу ★ молота и лупы',
    layerKey: 'lootAndStations',
    items: [
      {
        id: 'rifle',
        titleRu: 'Возможно ружьё',
        detailRu: 'Точка возможного спавна Охотничьего ружья (или уникальных винтовок Вогана / Барбары / Храбреца). Скрыта на НГ.',
        layerKey: 'lootAndStations',
        renderIcon: () => `
          <g transform="rotate(-18)">
            <path d="M -10 1 L -5 2.5 L -2 0.5 H 10 M -4 0.5 V 3" stroke="#1e293b" stroke-width="2.4" fill="none" stroke-linecap="round" />
            <line x1="-2" y1="0.5" x2="10" y2="0.5" stroke="#d97706" stroke-width="1.2" />
          </g>
        `,
      },
      {
        id: 'revolver',
        titleRu: 'Возможен револьвер',
        detailRu: 'Точка возможного спавна револьвера для защиты от волков вблизи (не спавнится на Незваном госте).',
        layerKey: 'lootAndStations',
        renderIcon: () => `
          <path d="M -6 3 L -4 -1.5 H 6 M -1 -1.5 V 1.5" stroke="#1e293b" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="-1" cy="-0.5" r="2.2" fill="#f59e0b" />
        `,
      },
      {
        id: 'bow',
        titleRu: 'Возможен лук и стрелы',
        detailRu: 'Готовый охотничий или спортивный лук и стрелы (на Незваном госте лук крафтится только сам на верстаке).',
        layerKey: 'lootAndStations',
        renderIcon: () => `
          <path d="M -4 -6 Q 5 0 -4 6" fill="none" stroke="#78350f" stroke-width="2" stroke-linecap="round" />
          <line x1="-4" y1="-6" x2="-4" y2="6" stroke="#a8a29e" stroke-width="1" />
          <line x1="-7" y1="0" x2="6" y2="0" stroke="#1e293b" stroke-width="1.5" />
        `,
      },
      {
        id: 'interloper_loot',
        titleRu: '★ Молот / Лупа / Спички (НГ)',
        detailRu: 'Ключевые точки гарантированных таблиц лута «Незваного гостя» и «Страданий» (молот, ножовка, лупа, огниво, рюкзак).',
        layerKey: 'lootAndStations',
        renderIcon: () => `
          <circle cx="0" cy="0" r="6.5" fill="#ea580c" stroke="#fffbeb" stroke-width="1.3" />
          <text x="0" y="3" text-anchor="middle" fill="#fffbeb" font-family="Oswald, sans-serif" font-size="8.5" font-weight="700">★</text>
        `,
      },
      {
        id: 'workbench',
        titleRu: 'Верстак',
        detailRu: 'Ремесленный стол для крафта лука, стрел, крючков, ловушек и меховой одежды из шкур.',
        layerKey: 'lootAndStations',
        renderIcon: () => `
          <rect x="-6.5" y="-5" width="13" height="10" rx="1.8" fill="#334155" stroke="#fbbf24" stroke-width="1.2" />
          <path d="M -3.5 2 H 3.5 M -2 2 V -1.5 H 2 V 2 M 0 -1.5 V -3.5" stroke="#fbbf24" stroke-width="1.4" fill="none" />
        `,
      },
      {
        id: 'forge',
        titleRu: 'Кузнечный горн / Станок',
        detailRu: 'Высокотемпературная кузня (150 °C на угле для ковки наконечников, ножа и топора) или оружейный станок.',
        layerKey: 'lootAndStations',
        renderIcon: () => `
          <rect x="-6.5" y="-5" width="13" height="10" rx="1.8" fill="#7c2d12" stroke="#fdba74" stroke-width="1.2" />
          <path d="M -4.5 2.5 H 4.5 L 2.5 0 H -2.5 Z M -3.5 0 H 5 L 3 -2.5 H -3.5 Z" fill="#fde68a" />
        `,
      },
      {
        id: 'bed_fire',
        titleRu: 'Кровать / Бочка для огня',
        detailRu: 'Тёплое спальное место (восстанавливает бодрость и здоровье) и защищённая от ветра бочка/кострище.',
        layerKey: 'lootAndStations',
        renderIcon: () => `
          <path d="M -11 3 V -3 M -11 1 H -2 V 3 M -9 -1 H -3" stroke="#0284c7" stroke-width="1.7" fill="none" stroke-linecap="round" />
          <path d="M 6 4 C 3 4, 2 0, 6 -5 C 10 0, 9 4, 6 4 Z" fill="#ea580c" />
        `,
      },
      {
        id: 'first_aid_tools',
        titleRu: 'Аптечка и Инструменты',
        detailRu: 'Настенная аптечка первой помощи (антибиотики, бинты, шприц) и ящики с инструментами / монтировкой.',
        layerKey: 'lootAndStations',
        renderIcon: () => `
          <rect x="-11" y="-4.5" width="9" height="9" rx="1.5" fill="#dc2626" />
          <path d="M -6.5 -2.5 V 2.5 M -9 0 H -4" stroke="#ffffff" stroke-width="1.8" />
          <path d="M 3 3 L 9 -3 M 8 -4 L 10 -2" stroke="#475569" stroke-width="2" stroke-linecap="round" />
        `,
      },
      {
        id: 'safe_backpack_coal',
        titleRu: 'Сейф / Рюкзак / Уголь',
        detailRu: 'Кодовый сейф, походный рюкзак / пластиковый контейнер и возобновляемые россыпи каменного угля (+20 °C к огню).',
        layerKey: 'lootAndStations',
        renderIcon: () => `
          <rect x="-11" y="-4.5" width="9" height="9" rx="1.5" fill="#334155" stroke="#fde047" stroke-width="1.2" />
          <circle cx="-6.5" cy="0" r="1.8" fill="none" stroke="#fde047" stroke-width="1.1" />
          <rect x="2" y="-4" width="8" height="8.5" rx="2" fill="#92400e" stroke="#1c1917" stroke-width="1.1" />
          <line x1="3.5" y1="-1" x2="8.5" y2="-1" stroke="#fde68a" stroke-width="1.2" />
        `,
      },
    ],
  },
  {
    id: 'fauna-remains',
    titleRu: '5. Животные, хищники, туши и трупы',
    subtitleRu: 'Охотничьи угодья, ареалы патрулирования хищников и случайные находки (вороны в небе — ориентир!)',
    layerKey: 'faunaAndCarcasses',
    items: [
      {
        id: 'wolf_timberwolf',
        titleRu: 'Волк / Лесной волк (стая)',
        detailRu: 'Одиночные чёрные волки и стаи серых лесных волков со шкалой боевого духа (боятся факела и морских фальшфейеров).',
        layerKey: 'faunaAndCarcasses',
        renderIcon: () => `
          <path d="M -7 4 L -5 -1 L -7 -3 L -3 -3 L -1 -5.5 L 1 -3 L 6 -2 L 8 0 L 5 1.5 L 5 5 M -4 1 L -4 5" stroke="#991b1b" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        `,
      },
      {
        id: 'bear',
        titleRu: 'Чёрный медведь',
        detailRu: 'Тяжёлый хищник с фиксированным маршрутом обхода от берлоги с костями (30+ кг мяса и шкура на спальник).',
        layerKey: 'faunaAndCarcasses',
        renderIcon: () => `
          <ellipse cx="-0.5" cy="0.5" rx="6.5" ry="4.2" fill="#7f1d1d" />
          <circle cx="6" cy="-1" r="2.6" fill="#7f1d1d" />
          <circle cx="5" cy="-3.2" r="1.2" fill="#7f1d1d" />
          <line x1="-4.5" y1="3.5" x2="-4.5" y2="6" stroke="#7f1d1d" stroke-width="2.2" stroke-linecap="round" />
          <line x1="3.5" y1="3.5" x2="3.5" y2="6" stroke="#7f1d1d" stroke-width="2.2" stroke-linecap="round" />
        `,
      },
      {
        id: 'moose',
        titleRu: 'Лось (Сохатый)',
        detailRu: 'Редкий зверь без кровотечения: даёт шкуру на Сумку из лося (+5 кг к переносимому весу!), но ломает рёбра в атаке.',
        layerKey: 'faunaAndCarcasses',
        renderIcon: () => `
          <ellipse cx="-1" cy="1" rx="5.5" ry="3.4" fill="#9a3412" />
          <path d="M 4 -1 L 6 -4 M 5 -4 C 3 -7, 8 -7, 9 -3 M -4 3.5 V 6.5 M 2.5 3.5 V 6.5" stroke="#9a3412" stroke-width="1.8" fill="none" stroke-linecap="round" />
        `,
      },
      {
        id: 'cougar',
        titleRu: 'Пума (DLC Территория)',
        detailRu: 'Бесшумный территориальный хищник дополнения TFTFT (отключена на Пилигриме; коготь идёт на уникальный нож).',
        layerKey: 'faunaAndCarcasses',
        renderIcon: () => `
          <circle cx="0" cy="0" r="6.2" fill="#be123c" stroke="#fde047" stroke-width="1.2" />
          <path d="M -2.5 -2.5 L -1 2.5 M 0 -3 L 1 2.5 M 2.5 -2 L 3 2" stroke="#fde047" stroke-width="1.4" stroke-linecap="round" />
        `,
      },
      {
        id: 'deer_carcass',
        titleRu: 'Олень и Туша оленя',
        detailRu: 'Безопасная дичь без риска паразитов (8–11 кг оленины, 2 кишки и шкура на штаны/унты) + готовые замёрзшие туши.',
        layerKey: 'faunaAndCarcasses',
        renderIcon: (isCharcoal) => `
          <g stroke="${isCharcoal ? '#3f362d' : '#cbd5e1'}" stroke-width="1.5" fill="none" stroke-linecap="round">
            <ellipse cx="-5" cy="1.5" rx="3.8" ry="2.2" fill="${isCharcoal ? '#3f362d' : '#cbd5e1'}" />
            <path d="M -2 0 L -0.5 -4 M -0.5 -4 L -2 -6 M -0.5 -4 L 1.5 -5.5 M -7.5 3 V 6 M -3 3 V 6" />
          </g>
          <path d="M 4 3 Q 8 -2 12 3 M 6 -1 V 3.5 M 8 -1.5 V 3.5 M 10 -1 V 3.5" stroke="#991b1b" stroke-width="1.4" fill="none" />
        `,
      },
      {
        id: 'rabbit_ptarmigan',
        titleRu: 'Кролики и Куропатки',
        detailRu: 'Поляны для силков и камней (мех на шапку и варежки) + стайки белых куропаток на возвышенностях (пух для спальника!).',
        layerKey: 'faunaAndCarcasses',
        renderIcon: (isCharcoal) => `
          <g fill="${isCharcoal ? '#44403c' : '#cbd5e1'}">
            <ellipse cx="-5" cy="2" rx="3.2" ry="2.2" />
            <ellipse cx="-3.5" cy="-2" rx="1" ry="2.8" transform="rotate(-10 -3.5 -2)" />
            <ellipse cx="-2" cy="-1.8" rx="1" ry="2.5" transform="rotate(14 -2 -1.8)" />
          </g>
          <path d="M 3 2 C 5 -2, 8 -2, 10 0 L 12 -2 L 10 3 Z" fill="#f8fafc" stroke="#334155" stroke-width="1.2" />
        `,
      },
      {
        id: 'corpse',
        titleRu: 'Замёрзший труп человека',
        detailRu: 'Тело погибшего выжившего (рядом часто лежат перья воронов, рюкзак, спички, книга навыков или оружие). Рандомно!',
        layerKey: 'faunaAndCarcasses',
        renderIcon: () => `
          <circle cx="-5.5" cy="-1" r="2.1" fill="#334155" />
          <path d="M -3 -0.5 L 5 1.5 L 8 0.5 M 0 0.5 L -2 3.5 M 3 1 L 6 4" stroke="#334155" stroke-width="2" stroke-linecap="round" fill="none" />
        `,
      },
    ],
  },
  {
    id: 'flora-saplings',
    titleRu: '6. Дикорастущие растения и саженцы деревьев',
    subtitleRu: 'Природная аптека выжившего, калории без риска пищевого отравления и древесина на лук со стрелами',
    layerKey: 'floraAndSaplings',
    items: [
      {
        id: 'cattail',
        titleRu: 'Рогоз (Тимофеевка луговая)',
        detailRu: 'По берегам озёр, рек и болот: каждый стебель даёт 150 ккал не портящейся еды + трут для костра!',
        layerKey: 'floraAndSaplings',
        renderIcon: () => `
          <line x1="-2.5" y1="6" x2="-2.5" y2="-5.5" stroke="#15803d" stroke-width="1.5" stroke-linecap="round" />
          <line x1="-2.5" y1="-1" x2="-2.5" y2="-4.5" stroke="#78350f" stroke-width="3" stroke-linecap="round" />
          <line x1="2.5" y1="6" x2="2.5" y2="-4.5" stroke="#15803d" stroke-width="1.5" stroke-linecap="round" />
          <line x1="2.5" y1="0" x2="2.5" y2="-3.2" stroke="#78350f" stroke-width="3" stroke-linecap="round" />
        `,
      },
      {
        id: 'reishi',
        titleRu: 'Гриб Рейши (Трутовик)',
        detailRu: 'Растёт на старых пнях: отвар заменяет фабричные антибиотики при инфекциях, отравлении и паразитах.',
        layerKey: 'floraAndSaplings',
        renderIcon: () => `
          <path d="M -5 1 C -5 -4.5, 5 -4.5, 5 1 Z" fill="#b45309" stroke="#1c1917" stroke-width="1.1" />
          <rect x="-1.8" y="1" width="3.6" height="4" fill="#fde68a" stroke="#1c1917" stroke-width="0.8" />
        `,
      },
      {
        id: 'rosehip',
        titleRu: 'Куст шиповника',
        detailRu: 'Отвар из 24 подготовленных ягод заменяет обезболивающее при растяжениях, ожогах и сломанных рёбрах.',
        layerKey: 'floraAndSaplings',
        renderIcon: () => `
          <path d="M -4 4 Q 0 0 4 4 M 0 4 V -2" stroke="#166534" stroke-width="1.4" fill="none" />
          <circle cx="-3" cy="0" r="2.3" fill="#dc2626" />
          <circle cx="2.5" cy="-1.5" r="2.3" fill="#dc2626" />
          <circle cx="1" cy="2.5" r="2.1" fill="#dc2626" />
        `,
      },
      {
        id: 'lichen',
        titleRu: 'Старый висящий мох',
        detailRu: 'Свисает с ветвей елей: 3 пучка мха + тряпка дают бесплатную антисептическую повязку (почти не весит!).',
        layerKey: 'floraAndSaplings',
        renderIcon: () => `
          <line x1="-6" y1="-4.5" x2="6" y2="-4.5" stroke="#57534e" stroke-width="1.6" stroke-linecap="round" />
          <path d="M -3.5 -4 V 3 M 0 -4 V 5 M 3.5 -4 V 2.5" stroke="#65a30d" stroke-width="2" stroke-linecap="round" />
        `,
      },
      {
        id: 'maple',
        titleRu: 'Кленовое деревце',
        detailRu: 'Срезается ножовкой или топором; после 6 дней просушки в помещении идёт на крафт Охотничьего лука.',
        layerKey: 'floraAndSaplings',
        renderIcon: () => `
          <line x1="0" y1="6" x2="0" y2="-4" stroke="#78350f" stroke-width="1.6" />
          <polygon points="0,-6.5 -4.5,-1.5 -2,-1.5 -5,2 5,2 2,-1.5 4.5,-1.5" fill="#16a34a" stroke="#14532d" stroke-width="0.9" />
        `,
      },
      {
        id: 'birch',
        titleRu: 'Берёзовое деревце',
        detailRu: 'Белоствольный саженец: после 4 дней просушки даёт по 3 древка для охотничьих и оглушающих стрел.',
        layerKey: 'floraAndSaplings',
        renderIcon: () => `
          <line x1="0" y1="6" x2="0" y2="-5" stroke="#f8fafc" stroke-width="2.2" />
          <line x1="0" y1="6" x2="0" y2="-5" stroke="#1e293b" stroke-width="2.2" stroke-dasharray="1.5 2.5" />
          <circle cx="-3" cy="-2" r="2.2" fill="#ca8a04" />
          <circle cx="3" cy="-3" r="2.2" fill="#eab308" />
        `,
      },
      {
        id: 'burdock_acorns',
        titleRu: 'Корень лопуха и Жёлуди',
        detailRu: 'Выкапываемый корень лопуха (горячий сытный чай + антибиотик) и дубовые жёлуди для каши и кофе.',
        layerKey: 'floraAndSaplings',
        renderIcon: () => `
          <path d="M -8 4 C -10 -2, -5 -5, -4 2 C -3 -5, 2 -2, -1 4 Z" fill="#15803d" />
          <ellipse cx="6" cy="1.5" rx="3.2" ry="3.8" fill="#92400e" />
          <path d="M 2.5 -1 Q 6 -4.5 9.5 -1 Z" fill="#451a03" />
        `,
      },
    ],
  },
];
