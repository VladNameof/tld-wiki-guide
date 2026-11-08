import { useState } from 'react';
import {
  Anvil,
  Clock,
  Compass,
  ExternalLink,
  Flame,
  Globe,
  Hammer,
  Loader2,
  Map as MapIcon,
  Radio,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { REGION_TIER_META } from '../../l0-primitives/constants.ts';
import {
  formatSignedTempC,
  formatWeightKg,
  matchesSearchQuery,
} from '../../l0-primitives/textUtils.ts';
import type {
  FandomSyncedArticle,
  ItemCategory,
  RegionTier,
  WildlifeModel,
} from '../../l0-primitives/types.ts';
import {
  buildFandomWikiUrl,
  fetchLiveFandomSearch,
} from '../../l1-codecs/fandomCodec.ts';
import {
  AFFLICTION_ENTRIES,
  SURVIVAL_MECHANICS,
  WIKI_ITEMS,
  WILDLIFE_ENTRIES,
} from '../../l2-models/data/encyclopediaData.ts';
import {
  getAllRegions,
  getRegionById,
  getSeededFandomArticles,
  getWikiImageUrl,
} from '../../l2-models/selectors.ts';
import { executeCommand } from '../hooks/useCommandState.ts';

// ======================== 1. КАТАЛОГ РЕГИОНОВ (15 РЕГИОНОВ С ФОТО И НАВИГАЦИЕЙ) ========================
export function RegionsCatalogView() {
  const regions = getAllRegions();
  const [tierFilter, setTierFilter] = useState<RegionTier | 'all'>('all');
  const [onlyForge, setOnlyForge] = useState(false);

  const filtered = regions.filter((r) => {
    if (tierFilter !== 'all' && r.tier !== tierFilter) return false;
    if (onlyForge && !r.hasForge) return false;
    return true;
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-tld-display text-3xl font-bold text-[#f5f1e8] uppercase">
            Мир и Регионы Острова Великого Медведя ({regions.length})
          </h2>
          <p className="mt-1 text-sm text-[#95a8b8]">
            Иллюстрированный атлас всех 15 регионов (включая Дальние земли DLC), ориентиры в метель, кузницы и переходы.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {(
            [
              ['all', `Все (${regions.length})`],
              ['starter', 'Начальные'],
              ['intermediate', 'Средние'],
              ['advanced', 'Суровые'],
              ['extreme', 'Экстремальные / DLC'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTierFilter(id)}
              className={`cursor-pointer rounded-md border px-3 py-1.5 font-semibold transition ${
                tierFilter === id
                  ? 'border-[#d97724] bg-[#d97724] text-[#0b1116]'
                  : 'border-[#2b3c4e] bg-[#131d26] text-[#cbd5e1] hover:border-[#d97724]/50'
              }`}
            >
              {label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setOnlyForge((v) => !v)}
            className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-3 py-1.5 font-semibold transition ${
              onlyForge
                ? 'border-amber-400 bg-amber-950/60 text-amber-200'
                : 'border-[#2b3c4e] bg-[#131d26] text-[#9eb2c4]'
            }`}
          >
            <Anvil className="h-3.5 w-3.5" /> Только с кузницей
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {filtered.map((r) => {
          const imgUrl = getWikiImageUrl(r.imageKey);
          return (
            <article
              key={r.id}
              className="flex flex-col justify-between overflow-hidden rounded-xl border border-[#2a3b4c] bg-[#121b24] shadow-lg"
            >
              <div>
                {imgUrl && (
                  <div className="relative h-48 w-full overflow-hidden border-b border-[#223242] bg-[#0b1117]">
                    <img
                      src={imgUrl}
                      alt={r.nameRu}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 hover:scale-105"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#121b24] via-transparent to-transparent" />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span
                        className={`rounded border px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm ${
                          REGION_TIER_META[r.tier].colorClass
                        }`}
                      >
                        {REGION_TIER_META[r.tier].labelRu}
                      </span>
                      {r.isDlc && (
                        <span className="rounded border border-violet-400/50 bg-violet-950/85 px-2 py-0.5 text-xs font-bold text-violet-200">
                          DLC Far Territory
                        </span>
                      )}
                    </div>
                    <span className="absolute right-3 bottom-2.5 rounded bg-[#0b1219]/85 px-2.5 py-0.5 font-mono text-xs text-[#6cb4cc] border border-[#293c4f]">
                      Ср. {formatSignedTempC(r.avgTempC)} • Метели: {r.blizzardRisk}
                    </span>
                  </div>
                )}

                <div className="p-5">
                  <h3 className="font-tld-display text-2xl font-bold text-[#f5f1e8]">
                    {r.nameRu}{' '}
                    <span className="font-tld-journal text-base font-normal italic text-[#8fa3b5]">
                      ({r.nameEn})
                    </span>
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-[#cbd5e1]">{r.summaryRu}</p>

                  {/* Штурманский гид ориентирования */}
                  <div className="mt-3 rounded-lg border border-sky-500/25 bg-sky-950/20 p-3 text-xs leading-relaxed text-[#d6e4f0]">
                    <strong className="text-[#7dd3fc]">🧭 Как ориентироваться на местности: </strong>
                    {r.navigationGuideRu}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {r.hasWorkbench && (
                      <span className="inline-flex items-center gap-1 rounded bg-sky-950/60 px-2.5 py-1 text-sky-200">
                        <Hammer className="h-3.5 w-3.5" /> Верстак
                      </span>
                    )}
                    {r.hasForge && (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-950/60 px-2.5 py-1 text-amber-200">
                        <Anvil className="h-3.5 w-3.5" /> Кузница
                      </span>
                    )}
                    {r.hasAmmoBench && (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-950/60 px-2.5 py-1 text-rose-200">
                        <Flame className="h-3.5 w-3.5" /> Верстак боеприпасов
                      </span>
                    )}
                    {r.hasTrader && (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 px-2.5 py-1 text-emerald-200">
                        <Radio className="h-3.5 w-3.5" /> Торговец Сазерленд
                      </span>
                    )}
                  </div>

                  {/* Ключевые ориентиры с квадратами сетки */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.keyLandmarksRu.map((lm, idx) => (
                      <span
                        key={idx}
                        className="rounded border border-[#243546] bg-[#0d151d] px-2 py-0.5 text-[11px] text-[#b8c8d8]"
                      >
                        📍 {lm}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3.5 rounded-lg border border-[#1f2e3d] bg-[#0c131a] p-3">
                    <div className="text-xs font-semibold text-[#ffd699]">Советы по выживанию:</div>
                    <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-[#b8c8d8]">
                      {r.survivalTipsRu.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3 text-xs text-[#95a8b8]">
                    <strong className="text-[#cbd5e1]">Переходы: </strong>
                    {r.connections.map((c) => getRegionById(c.targetRegionId).nameRu).join(' • ')}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1e2c3a] bg-[#0f171f] px-5 py-3.5">
                <button
                  type="button"
                  onClick={() =>
                    executeCommand('map.selectRegion', {
                      regionId: r.id,
                      openRegionMap: true,
                    })
                  }
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#d97724] px-4 py-2 text-xs font-bold text-[#0b1116] transition hover:bg-[#f09a3e]"
                >
                  <MapIcon className="h-4 w-4" />
                  Открыть на Угольной Карте
                </button>

                <a
                  href={buildFandomWikiUrl(r.fandomSlug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#6cb4cc] hover:underline"
                >
                  Статья на Fandom RU <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// ======================== 2. ПРЕДМЕТЫ, ОРУЖИЕ И ОДЕЖДА (44 ПРЕДМЕТА С ФОТО) ========================
const ITEM_CAT_LABELS: readonly { readonly id: ItemCategory | 'all'; readonly label: string }[] = [
  { id: 'all', label: `Все предметы (${WIKI_ITEMS.length})` },
  { id: 'weapons', label: 'Оружие' },
  { id: 'tools', label: 'Инструменты и Снаряжение' },
  { id: 'clothing', label: 'Одежда и Защита' },
  { id: 'fire', label: 'Разведение огня' },
  { id: 'medicine', label: 'Медицина и Отвары' },
  { id: 'food', label: 'Еда и Рационы' },
];

export function ItemsCatalogView() {
  const [cat, setCat] = useState<ItemCategory | 'all'>('all');
  const [interloperOnly, setInterloperOnly] = useState(false);
  const [search, setSearch] = useState('');

  const items = WIKI_ITEMS.filter((item) => {
    if (cat !== 'all' && item.category !== cat) return false;
    if (interloperOnly && !item.availableOnInterloper) return false;
    if (
      search &&
      !matchesSearchQuery(
        search,
        item.nameRu,
        item.nameEn,
        item.slotOrSubcatRu,
        item.descriptionRu,
        item.whereToFindRu,
      )
    ) {
      return false;
    }
    return true;
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-tld-display text-3xl font-bold text-[#f5f1e8] uppercase">
            Инвентарь, Оружие, Одежда и Припасы ({items.length})
          </h2>
          <p className="mt-1 text-sm text-[#95a8b8]">
            Иллюстрированный справочник с точными ТТХ тепла, ветрозащиты, влагозащиты, калорий, разборки и спавна.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск (парка, унты, винтовка, пеммикан)..."
            aria-label="Поиск предметов"
            className="w-64 rounded-lg border border-[#2f4256] bg-[#0c131a] px-3 py-1.5 text-xs text-white focus:border-[#d97724] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setInterloperOnly((v) => !v)}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              interloperOnly
                ? 'border-rose-400 bg-rose-950/60 text-rose-200'
                : 'border-[#2f4256] bg-[#131d26] text-[#cbd5e1]'
            }`}
          >
            🔥 Только для «Незваного гостя»
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {ITEM_CAT_LABELS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              cat === c.id
                ? 'bg-[#d97724] text-[#0b1116]'
                : 'border border-[#263748] bg-[#121b24] text-[#b4c5d6] hover:text-white'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((item) => {
          const imgUrl = getWikiImageUrl(item.imageKey);
          return (
            <article
              key={item.id}
              className="flex flex-col justify-between rounded-xl border border-[#283949] bg-[#121b24] p-5 shadow-md"
            >
              <div>
                {/* Шапка предмета с реальной фотографией/иконкой из игры */}
                <div className="flex items-start gap-4">
                  {imgUrl && (
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#2b3e50] bg-gradient-to-br from-[#192634] to-[#0b1218] p-2 shadow-inner">
                      <img
                        src={imgUrl}
                        alt={item.nameRu}
                        loading="lazy"
                        className="max-h-full max-w-full object-contain drop-shadow-md"
                      />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="rounded bg-[#1a2836] px-2 py-0.5 text-[11px] font-semibold text-[#9cb4c9]">
                        {item.slotOrSubcatRu}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                          item.availableOnInterloper
                            ? 'bg-emerald-950/60 text-emerald-300'
                            : 'bg-rose-950/60 text-rose-300'
                        }`}
                      >
                        {item.availableOnInterloper
                          ? '✓ Есть на Незваном госте'
                          : '✕ Нет на Незваном госте'}
                      </span>
                    </div>

                    <h3 className="mt-1.5 font-tld-display text-xl font-bold text-[#f5f1e8]">
                      {item.nameRu}
                    </h3>
                    <p className="font-tld-journal text-sm italic text-[#8fa3b5]">{item.nameEn}</p>
                  </div>
                </div>

                {/* Плашки характеристик (ТТХ) */}
                <div className="mt-3 flex flex-wrap gap-1.5 font-mono text-[11px]">
                  <span className="rounded border border-[#253646] bg-[#0c141c] px-2 py-0.5 text-[#cbd5e1]">
                    ⚖️ {formatWeightKg(item.weightKg)}
                  </span>
                  {item.warmthC !== undefined && (
                    <span className="rounded border border-amber-500/30 bg-amber-950/40 px-2 py-0.5 text-amber-200">
                      🌡️ Тепло +{item.warmthC}°C
                    </span>
                  )}
                  {item.windproofC !== undefined && (
                    <span className="rounded border border-sky-500/30 bg-sky-950/40 px-2 py-0.5 text-sky-200">
                      💨 Ветер +{item.windproofC}°C
                    </span>
                  )}
                  {item.waterproofPct !== undefined && (
                    <span className="rounded border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 text-cyan-200">
                      💧 Влага {item.waterproofPct}%
                    </span>
                  )}
                  {item.protectionPct !== undefined && (
                    <span className="rounded border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-emerald-200">
                      🛡️ Броня {item.protectionPct}%
                    </span>
                  )}
                  {item.sprintPenaltyPct !== undefined && item.sprintPenaltyPct > 0 && (
                    <span className="rounded border border-rose-500/30 bg-rose-950/35 px-2 py-0.5 text-rose-200">
                      🏃 Бег -{item.sprintPenaltyPct}%
                    </span>
                  )}
                  {item.calories !== undefined && (
                    <span className="rounded border border-orange-500/30 bg-orange-950/40 px-2 py-0.5 text-orange-200">
                      🍖 {item.calories} ккал
                    </span>
                  )}
                  {item.vitaminC && item.vitaminC !== 'Нет' && (
                    <span className="rounded border border-lime-500/30 bg-lime-950/40 px-2 py-0.5 text-lime-200">
                      🍋 Вит. C: {item.vitaminC}
                    </span>
                  )}
                </div>

                <p className="mt-2.5 text-xs leading-relaxed text-[#d1dbe4]">
                  {item.descriptionRu}
                </p>

                <div className="mt-3 space-y-1.5 rounded-lg border border-[#1f2e3d] bg-[#0c131a] p-3 text-xs">
                  <div>
                    <strong className="text-[#ffd699]">Где искать: </strong>
                    <span className="text-[#c4d1de]">{item.whereToFindRu}</span>
                  </div>
                  <div>
                    <strong className="text-[#6cb4cc]">Крафт / Ремонт: </strong>
                    <span className="text-[#c4d1de]">{item.craftingOrRepairRu}</span>
                  </div>
                  <div>
                    <strong className="text-[#9cb4c9]">Износ / Свойства: </strong>
                    <span className="text-[#a9bccf]">{item.durabilityInfo}</span>
                  </div>
                  {item.harvestYieldRu && (
                    <div>
                      <strong className="text-emerald-300">Разборка: </strong>
                      <span className="text-[#c4d1de]">{item.harvestYieldRu}</span>
                    </div>
                  )}
                </div>

                {item.proTipsRu && item.proTipsRu.length > 0 && (
                  <ul className="mt-2.5 space-y-1 pl-4 list-disc text-[11px] text-[#a9c2d6]">
                    {item.proTipsRu.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-3 flex justify-end border-t border-[#1d2b38] pt-2.5">
                <a
                  href={buildFandomWikiUrl(item.fandomSlug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#6cb4cc] hover:underline"
                >
                  Подробнее на Fandom RU <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// ======================== 3. ФАУНА, РЫБА И ФЛОРА (15 ВИДОВ С ФОТО И ТАБЛИЦЕЙ ОХОТЫ) ========================
export function WildlifeCatalogView() {
  const [filterType, setFilterType] = useState<WildlifeModel['type'] | 'all'>('all');

  const filtered = WILDLIFE_ENTRIES.filter(
    (w) => filterType === 'all' || w.type === filterType,
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-tld-display text-3xl font-bold text-[#f5f1e8] uppercase">
            Животные, Охота, Рыбалка и Дикорастущая Флора ({filtered.length})
          </h2>
          <p className="mt-1 text-sm text-[#95a8b8]">
            Фотографии видов, время истечения кровью, выход мяса, сушка шкур, риск паразитов и боевая тактика.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs">
          {(
            [
              ['all', `Все виды (${WILDLIFE_ENTRIES.length})`],
              ['predator', 'Хищники'],
              ['passive', 'Дичь, Птицы и Рыба'],
              ['flora', 'Лекарственные растения'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilterType(id)}
              className={`cursor-pointer rounded-md border px-3 py-1.5 font-semibold transition ${
                filterType === id
                  ? 'border-[#d97724] bg-[#d97724] text-[#0b1116]'
                  : 'border-[#283949] bg-[#121b24] text-[#cbd5e1] hover:border-[#d97724]/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {filtered.map((w) => {
          const imgUrl = getWikiImageUrl(w.imageKey);
          return (
            <article
              key={w.id}
              className="flex flex-col justify-between overflow-hidden rounded-xl border border-[#283949] bg-[#121b24] shadow-md"
            >
              <div>
                <div className="flex flex-col sm:flex-row">
                  {imgUrl && (
                    <div className="flex h-44 w-full shrink-0 items-center justify-center overflow-hidden border-b border-[#223242] bg-[#0b1218] sm:h-auto sm:w-44 sm:border-r sm:border-b-0">
                      <img
                        src={imgUrl}
                        alt={w.nameRu}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-[#8fa3b5] uppercase">
                        {w.type === 'predator'
                          ? '🐾 Хищник'
                          : w.type === 'passive'
                            ? '🦌 Дичь / Промысел'
                            : '🌿 Целебная флора'}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                          w.dangerLevel === 'Смертельно'
                            ? 'bg-rose-950/80 text-rose-300'
                            : w.dangerLevel === 'Высокая угроза'
                              ? 'bg-amber-950/80 text-amber-300'
                              : w.dangerLevel === 'Средняя угроза'
                                ? 'bg-orange-950/80 text-orange-300'
                                : 'bg-emerald-950/80 text-emerald-300'
                        }`}
                      >
                        {w.dangerLevel}
                      </span>
                    </div>

                    <h3 className="mt-1.5 font-tld-display text-xl font-bold text-[#f5f1e8]">
                      {w.nameRu}
                    </h3>
                    <p className="font-tld-journal text-sm italic text-[#8fa3b5]">{w.nameEn}</p>
                    <p className="mt-2 text-xs leading-relaxed text-[#cbd5e1]">{w.descriptionRu}</p>
                  </div>
                </div>

                {/* Сводка охотника: Кровотечение, Вес мяса, Просушка, Паразиты */}
                <div className="grid grid-cols-2 gap-2 border-t border-[#1e2d3b] bg-[#0e161f] px-4 py-2.5 text-[11px] sm:grid-cols-4">
                  <div>
                    <div className="text-[#788e9f]">Урон / Кровотечение</div>
                    <div className="font-semibold text-[#f1ede4]">{w.bleedOutOrHpRu}</div>
                  </div>
                  <div>
                    <div className="text-[#788e9f]">Выход продукта</div>
                    <div className="font-semibold text-amber-200">{w.weightMeatKgRu}</div>
                  </div>
                  <div>
                    <div className="text-[#788e9f]">Сушка в тепле</div>
                    <div className="font-semibold text-sky-200">{w.curingTimeRu}</div>
                  </div>
                  <div>
                    <div className="text-[#788e9f]">Кишечные паразиты</div>
                    <div
                      className={`font-bold ${
                        w.parasiteRisk ? 'text-rose-300' : 'text-emerald-300'
                      }`}
                    >
                      {w.parasiteRisk ? '⚠️ Риск (хищник)' : '✓ Безопасно'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 p-4 text-xs">
                  <div className="rounded-lg border border-[#203040] bg-[#0c131a] p-3 space-y-2">
                    <div>
                      <strong className="text-[#ffd699]">Тактика выжившего: </strong>
                      <span className="text-[#d6e0ea]">{w.tacticsRu}</span>
                    </div>
                    <div>
                      <strong className="text-[#3dd68c]">Трофеи с разделки: </strong>
                      <span className="text-[#c4d1de]">{w.harvestYieldRu}</span>
                    </div>
                    <div>
                      <strong className="text-[#6cb4cc]">Ареал обитания: </strong>
                      <span className="text-[#9fb2c4]">{w.regionsSummaryRu}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-[#1e2c3a] px-4 py-2.5">
                <a
                  href={buildFandomWikiUrl(w.fandomSlug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#6cb4cc] hover:underline"
                >
                  Статья Fandom <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// ======================== 4. БОЛЕЗНИ И ТРАВМЫ (11 НЕДУГОВ С ИКОНКАМИ И СРОКАМИ ЛЕЧЕНИЯ) ========================
export function AfflictionsCatalogView() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h2 className="font-tld-display text-3xl font-bold text-[#f5f1e8] uppercase">
          Болезни, Травмы и Экстремальные Состояния ({AFFLICTION_ENTRIES.length})
        </h2>
        <p className="mt-1 text-sm text-[#95a8b8]">
          Медицинский атлас выжившего: иконки диагнозов, длительность исцеления, медикаменты и профилактика.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {AFFLICTION_ENTRIES.map((a) => {
          const imgUrl = getWikiImageUrl(a.imageKey);
          return (
            <article
              key={a.id}
              className="flex flex-col justify-between rounded-xl border border-[#2b3c4e] bg-[#121b24] p-5 shadow-md"
            >
              <div>
                <div className="flex items-start gap-3.5">
                  {imgUrl && (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#2c3f52] bg-[#0b1218] p-1.5">
                      <img
                        src={imgUrl}
                        alt={a.nameRu}
                        loading="lazy"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-tld-display text-xl font-bold text-[#f5f1e8]">
                        {a.nameRu}
                      </h3>
                      <span
                        className={`rounded px-2.5 py-0.5 text-xs font-bold ${
                          a.severity === 'Критическая'
                            ? 'bg-rose-950/75 text-rose-300'
                            : a.severity === 'Опасная'
                              ? 'bg-amber-950/75 text-amber-300'
                              : 'bg-sky-950/75 text-sky-300'
                        }`}
                      >
                        {a.severity}
                      </span>
                    </div>
                    <p className="font-tld-journal text-sm italic text-[#8fa3b5]">{a.nameEn}</p>
                    <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#ffd699]">
                      <Clock className="h-3 w-3 text-[#f09a3e]" /> Длительность: {a.durationRu}
                    </div>
                  </div>
                </div>

                {/* Быстрые теги предметов лечения */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {a.cureItemsRu.map((cure, idx) => (
                    <span
                      key={idx}
                      className="rounded border border-emerald-500/30 bg-emerald-950/35 px-2 py-0.5 text-[11px] font-medium text-emerald-200"
                    >
                      💊 {cure}
                    </span>
                  ))}
                </div>

                <dl className="mt-3 space-y-2 text-xs">
                  <div>
                    <dt className="font-semibold text-rose-300">Причина и симптомы:</dt>
                    <dd className="text-[#cbd5e1]">
                      {a.causeRu} {a.effectsRu}
                    </dd>
                  </div>
                  <div className="rounded border border-[#223242] bg-[#0c131a] p-2.5">
                    <dt className="font-semibold text-emerald-300">Протокол лечения:</dt>
                    <dd className="mt-0.5 text-[#e4dfd5]">{a.treatmentRu}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#6cb4cc]">Профилактика:</dt>
                    <dd className="text-[#a8bacb]">{a.preventionRu}</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-3 flex justify-end border-t border-[#1e2c3a] pt-2.5">
                <a
                  href={buildFandomWikiUrl(a.fandomSlug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#6cb4cc] hover:underline"
                >
                  Статья на Fandom RU <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// ======================== 5. МЕХАНИКИ ВЫЖИВАНИЯ И КРАФТ ========================
export function MechanicsCatalogView() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h2 className="font-tld-display text-3xl font-bold text-[#f5f1e8] uppercase">
          Механики Выживания, Навигация в Метель, Кузница и Торговля
        </h2>
        <p className="mt-1 text-sm text-[#95a8b8]">
          Ключевые правила игры, проверенные ветеранами 500-дневных забегов на «Незваном госте».
        </p>
      </div>

      <div className="space-y-5">
        {SURVIVAL_MECHANICS.map((m) => (
          <article
            key={m.id}
            className="rounded-xl border border-[#2a3b4c] bg-[#121b24] p-6 shadow-md"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded border border-[#d97724]/40 bg-[#d97724]/15 px-2.5 py-0.5 text-xs font-semibold text-[#ffd699]">
                {m.categoryRu}
              </span>
              <a
                href={buildFandomWikiUrl(m.fandomSlug)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#6cb4cc] hover:underline"
              >
                Открыть раздел на Fandom RU <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <h3 className="mt-3 font-tld-display text-2xl font-bold text-[#f5f1e8]">
              {m.titleRu}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#d1dbe4]">{m.summaryRu}</p>

            <ul className="mt-4 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-[#cbd5e1] sm:text-sm">
              {m.keyRulesRu.map((rule, idx) => (
                <li key={idx}>{rule}</li>
              ))}
            </ul>

            <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-950/25 px-4 py-3 text-xs text-emerald-200">
              <strong>Совет мастера:</strong> {m.proTipRu}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// ======================== 6. СИНХРОНИЗАЦИЯ И ЖИВОЙ ПОИСК В FANDOM WIKI RU (API) ========================
export function FandomLiveSyncView() {
  const seeded = getSeededFandomArticles();
  const [query, setQuery] = useState('');
  const [liveResults, setLiveResults] = useState<readonly FandomSyncedArticle[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLiveSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setLiveResults(null);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const results = await fetchLiveFandomSearch(query);
      setLiveResults(results);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Не удалось подключиться к MediaWiki API (проверьте интернет-соединение).',
      );
    } finally {
      setLoading(false);
    }
  };

  const displayed = liveResults ?? seeded;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="rounded-xl border border-[#2c3f52] bg-[#121b24] p-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6cb4cc]">
              <Globe className="h-4 w-4" />
              Прямая интеграция с MediaWiki API • the-long-dark.fandom.com/ru
            </div>
            <h2 className="mt-1 font-tld-display text-3xl font-bold text-[#f5f1e8] uppercase">
              Живой Поиск и Импорт Статей Fandom Wiki RU
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[#a8bacb] sm:text-sm">
              Ищите любую из 1500+ статей русскоязычной вики напрямую из нашего справочника без
              рекламы и тяжёлых баннеров. Локальный кэш также можно обновить из терминала командой{' '}
              <code className="rounded bg-[#0b1116] px-1.5 py-0.5 font-mono text-[#ffd699]">
                npm run sync:fandom
              </code>
              .
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            HTML/XSS-санитизация включена
          </div>
        </div>

        <form onSubmit={handleLiveSearch} className="mt-5 flex flex-wrap gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#788b9c]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Введите запрос в Fandom RU (напр. Wintermute, Пеммикан, Сазерленд, Достижения)..."
              aria-label="Живой запрос к Fandom MediaWiki API"
              className="w-full rounded-lg border border-[#32465a] bg-[#0b1116] py-2.5 pr-4 pl-9 text-sm text-white placeholder-[#6d8194] focus:border-[#d97724] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#d97724] px-5 py-2.5 font-tld-display text-sm font-bold tracking-wider text-[#0b1116] uppercase transition hover:bg-[#f09a3e] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Compass className="h-4 w-4" />}
            Найти в Fandom
          </button>
          {liveResults !== null && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setLiveResults(null);
              }}
              className="cursor-pointer rounded-lg border border-[#32465a] px-3 py-2.5 text-xs text-[#cbd5e1] hover:text-white"
            >
              Показать локальный кэш ({seeded.length})
            </button>
          )}
        </form>

        {errorMsg && (
          <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200">
            {errorMsg}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {displayed.map((art) => (
          <article
            key={`${art.pageId}-${art.title}`}
            className="flex flex-col justify-between rounded-xl border border-[#283949] bg-[#121b24] p-5 shadow-md"
          >
            <div>
              {art.thumbnail && (
                <img
                  src={art.thumbnail}
                  alt={art.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="mb-3 h-36 w-full rounded-lg border border-[#243444] object-cover"
                />
              )}
              <h3 className="font-tld-display text-lg font-bold text-[#f5f1e8]">{art.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#cbd5e1]">{art.extract}</p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[#1e2c3a] pt-3 text-xs">
              <span className="text-[11px] text-[#788b9c]">CC-BY-SA • Fandom RU</span>
              <a
                href={art.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#f09a3e] hover:underline"
              >
                Полная статья <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
