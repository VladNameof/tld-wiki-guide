import { useState } from 'react';
import {
  Anvil,
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
} from '../../l2-models/selectors.ts';
import { executeCommand } from '../hooks/useCommandState.ts';

// ======================== 1. КАТАЛОГ РЕГИОНОВ ========================
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
            Мир и Регионы Острова Великого Медведя
          </h2>
          <p className="mt-1 text-sm text-[#95a8b8]">
            Климатические условия, кузницы, верстаки и граф переходов между регионами.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {(
            [
              ['all', 'Все регионы'],
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

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {filtered.map((r) => (
          <article
            key={r.id}
            className="flex flex-col justify-between rounded-xl border border-[#2a3b4c] bg-[#121b24] p-5 shadow-lg"
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`rounded border px-2.5 py-0.5 text-xs font-medium ${
                    REGION_TIER_META[r.tier].colorClass
                  }`}
                >
                  {REGION_TIER_META[r.tier].labelRu}
                </span>
                <span className="font-mono text-xs text-[#6cb4cc]">
                  Темп: {formatSignedTempC(r.avgTempC)} • Метели: {r.blizzardRisk}
                </span>
              </div>

              <h3 className="mt-3 font-tld-display text-2xl font-bold text-[#f5f1e8]">
                {r.nameRu}{' '}
                <span className="font-tld-journal text-base font-normal italic text-[#8fa3b5]">
                  ({r.nameEn})
                </span>
              </h3>

              <p className="mt-2.5 text-sm leading-relaxed text-[#cbd5e1]">{r.summaryRu}</p>

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

              <div className="mt-4 rounded-lg border border-[#1f2e3d] bg-[#0c131a] p-3">
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

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#1e2c3a] pt-4">
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
        ))}
      </div>
    </section>
  );
}

// ======================== 2. ПРЕДМЕТЫ, ОРУЖИЕ И ОДЕЖДА ========================
const ITEM_CAT_LABELS: readonly { readonly id: ItemCategory | 'all'; readonly label: string }[] = [
  { id: 'all', label: 'Все предметы' },
  { id: 'weapons', label: 'Оружие' },
  { id: 'tools', label: 'Инструменты и Рюкзаки' },
  { id: 'clothing', label: 'Одежда и Экипировка' },
  { id: 'fire', label: 'Разведение огня' },
  { id: 'medicine', label: 'Медицина и Отвары' },
  { id: 'food', label: 'Еда и Припасы' },
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
      !matchesSearchQuery(search, item.nameRu, item.nameEn, item.descriptionRu, item.whereToFindRu)
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
            Инвентарь, Оружие и Одежда
          </h2>
          <p className="mt-1 text-sm text-[#95a8b8]">
            Характеристики веса, бонусов тепла, рецептов крафта и доступности на «Незваном госте».
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск предмета (напр. парка, ножовка)..."
            aria-label="Поиск предметов"
            className="rounded-lg border border-[#2f4256] bg-[#0c131a] px-3 py-1.5 text-xs text-white focus:border-[#d97724] focus:outline-none"
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
        {items.map((item) => (
          <article
            key={item.id}
            className="flex flex-col justify-between rounded-xl border border-[#283949] bg-[#121b24] p-5"
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-[#6cb4cc]">
                  Вес: {formatWeightKg(item.weightKg)}
                  {item.warmthC !== undefined && ` • Тепло: +${item.warmthC}°C`}
                  {item.windproofC !== undefined && ` • Ветер: +${item.windproofC}°C`}
                  {item.protectionPct !== undefined && ` • Защита: ${item.protectionPct}%`}
                  {item.calories !== undefined && ` • ${item.calories} ккал`}
                </span>

                <span
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                    item.availableOnInterloper
                      ? 'bg-emerald-950/60 text-emerald-300'
                      : 'bg-rose-950/60 text-rose-300'
                  }`}
                >
                  {item.availableOnInterloper
                    ? 'Доступно на Незваном госте'
                    : 'Не спавнится на Незваном госте'}
                </span>
              </div>

              <h3 className="mt-2.5 font-tld-display text-xl font-bold text-[#f5f1e8]">
                {item.nameRu}
              </h3>
              <p className="font-tld-journal text-sm italic text-[#8fa3b5]">{item.nameEn}</p>

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
              </div>
            </div>

            <div className="mt-3 flex justify-end">
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
        ))}
      </div>
    </section>
  );
}

// ======================== 3. ФАУНА И ФЛОРА ========================
export function WildlifeCatalogView() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h2 className="font-tld-display text-3xl font-bold text-[#f5f1e8] uppercase">
          Животные, Охота и Дикорастущая Флора
        </h2>
        <p className="mt-1 text-sm text-[#95a8b8]">
          Тактика защиты от хищников, трофеи с разделки и природные заменители медикаментов.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {WILDLIFE_ENTRIES.map((w) => (
          <article
            key={w.id}
            className="rounded-xl border border-[#283949] bg-[#121b24] p-5 shadow-md"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#8fa3b5] uppercase">
                {w.type === 'predator'
                  ? 'Хищник'
                  : w.type === 'passive'
                    ? 'Дичь / Охота'
                    : 'Лекарственная флора'}
              </span>
              <span
                className={`rounded px-2.5 py-0.5 text-xs font-bold ${
                  w.dangerLevel === 'Смертельно'
                    ? 'bg-rose-950/70 text-rose-300'
                    : w.dangerLevel === 'Высокая угроза'
                      ? 'bg-amber-950/70 text-amber-300'
                      : 'bg-emerald-950/70 text-emerald-300'
                }`}
              >
                {w.dangerLevel}
              </span>
            </div>

            <h3 className="mt-2 font-tld-display text-xl font-bold text-[#f5f1e8]">
              {w.nameRu}{' '}
              <span className="font-tld-journal text-base font-normal italic text-[#8fa3b5]">
                ({w.nameEn})
              </span>
            </h3>

            <p className="mt-2 text-xs leading-relaxed text-[#cbd5e1]">{w.descriptionRu}</p>

            <div className="mt-3.5 space-y-2 rounded-lg border border-[#203040] bg-[#0c131a] p-3 text-xs">
              <div>
                <strong className="text-[#ffd699]">Тактика выжившего: </strong>
                <span className="text-[#d6e0ea]">{w.tacticsRu}</span>
              </div>
              <div>
                <strong className="text-[#3dd68c]">Добыча и ресурсы: </strong>
                <span className="text-[#c4d1de]">{w.harvestYieldRu}</span>
              </div>
              <div>
                <strong className="text-[#6cb4cc]">Ареал: </strong>
                <span className="text-[#9fb2c4]">{w.regionsSummaryRu}</span>
              </div>
            </div>

            <div className="mt-3 flex justify-end">
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
        ))}
      </div>
    </section>
  );
}

// ======================== 4. БОЛЕЗНИ И ТРАВМЫ ========================
export function AfflictionsCatalogView() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h2 className="font-tld-display text-3xl font-bold text-[#f5f1e8] uppercase">
          Болезни, Травмы и Экстремальные Состояния
        </h2>
        <p className="mt-1 text-sm text-[#95a8b8]">
          Причины возникновения, штрафы к здоровью и точные дозировки лечения.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {AFFLICTION_ENTRIES.map((a) => (
          <article
            key={a.id}
            className="rounded-xl border border-[#2b3c4e] bg-[#121b24] p-5 shadow-md"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-tld-display text-xl font-bold text-[#f5f1e8]">{a.nameRu}</h3>
              <span
                className={`rounded px-2.5 py-0.5 text-xs font-bold ${
                  a.severity === 'Критическая'
                    ? 'bg-rose-950/70 text-rose-300'
                    : 'bg-amber-950/70 text-amber-300'
                }`}
              >
                {a.severity}
              </span>
            </div>
            <p className="font-tld-journal text-sm italic text-[#8fa3b5]">{a.nameEn}</p>

            <dl className="mt-3 space-y-2 text-xs">
              <div>
                <dt className="font-semibold text-rose-300">Причина и симптомы:</dt>
                <dd className="text-[#cbd5e1]">
                  {a.causeRu} {a.effectsRu}
                </dd>
              </div>
              <div className="rounded border border-[#223242] bg-[#0c131a] p-2.5">
                <dt className="font-semibold text-emerald-300">Точное лечение:</dt>
                <dd className="mt-0.5 text-[#e4dfd5]">{a.treatmentRu}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#6cb4cc]">Профилактика:</dt>
                <dd className="text-[#a8bacb]">{a.preventionRu}</dd>
              </div>
            </dl>
          </article>
        ))}
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
          Механики Выживания, Крафт, Кузница и Торговля
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
