import {
  ArrowRight,
  Compass,
  ExternalLink,
  Flame,
  Globe,
  HeartPulse,
  Map as MapIcon,
  Package,
  PawPrint,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import { DIFFICULTIES, REGION_TIER_META } from '../../l0-primitives/constants.ts';
import { formatSignedTempC } from '../../l0-primitives/textUtils.ts';
import type { WikiSectionId } from '../../l0-primitives/types.ts';
import { computeRegionProgress, getAllRegions } from '../../l2-models/selectors.ts';
import { executeCommand, useCommandState } from '../hooks/useCommandState.ts';

const PORTAL_CARDS: readonly {
  readonly section: WikiSectionId;
  readonly title: string;
  readonly desc: string;
  readonly badge: string;
  readonly Icon: typeof Compass;
}[] = [
  {
    section: 'map',
    title: 'Интерактивная Угольная Карта',
    desc: 'Двухуровневая карта Острова Великого Медведя и регионов с фильтрами лута под сложность, бункерами и своими метками.',
    badge: 'Двухуровневая Leaflet CRS',
    Icon: MapIcon,
  },
  {
    section: 'regions',
    title: 'Мир и Регионы Острова',
    desc: 'Климат, кузницы, верстаки, переходы через шахты и советы по выживанию от Загадочного озера до Брошенного аэродрома.',
    badge: '12 ключевых регионов + DLC',
    Icon: Compass,
  },
  {
    section: 'items',
    title: 'Инвентарь, Оружие и Одежда',
    desc: 'Винтовки, револьверы, лук выжившего, кованые инструменты, топовая одежда, спальники из пуха и таблица доступности на Незваном госте.',
    badge: 'Сравнение тепла и веса',
    Icon: Package,
  },
  {
    section: 'wildlife',
    title: 'Животные, Охота и Флора',
    desc: 'Повадки волков, стай лесных волков, медведя, лося и пумы. Безопасная разделка туш, лечебные грибы Рейши, рогоз и лишайник.',
    badge: 'Тактика против хищников',
    Icon: PawPrint,
  },
  {
    section: 'afflictions',
    title: 'Болезни, Травмы и Лечение',
    desc: 'Переохлаждение, необратимое обморожение, кишечные паразиты, сломанные рёбра, клаустрофобия и цинга.',
    badge: 'Полный медсправочник',
    Icon: HeartPulse,
  },
  {
    section: 'mechanics',
    title: 'Геймплей, Крафт и Торговец',
    desc: 'Цепочка факелов, ковка в кузнице при 150°C, верстак боеприпасов, обустройство убежища и бартер с Сазерлендом.',
    badge: 'Секреты 500+ дней',
    Icon: Wrench,
  },
];

export function HomePortalView() {
  const state = useCommandState();
  const regions = getAllRegions();
  const visitedSet = new Set(state.journal.visitedMarkerIds);

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-8">
      {/* Атмосферный главный баннер Заглавной страницы */}
      <section className="relative overflow-hidden rounded-2xl border border-[#34485c] bg-gradient-to-br from-[#16232f] via-[#101922] to-[#1f1610] p-6 shadow-2xl sm:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[#d97724]/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#3dd68c]/10 blur-3xl"
        />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d97724]/45 bg-[#d97724]/15 px-3 py-1 text-xs font-semibold text-[#ffd699]">
            <Flame className="h-3.5 w-3.5 text-[#f09a3e]" />
            Энциклопедия Выжившего • Включая Tales from the Far Territory
          </div>

          <h1 className="mt-4 font-tld-display text-3xl font-bold tracking-wide text-[#f7f3eb] uppercase sm:text-5xl">
            Тихий апокалипсис <span className="text-[#f09a3e]">The Long Dark</span>
          </h1>

          <p className="mt-4 font-tld-journal text-lg leading-relaxed text-[#d1dbe4] sm:text-xl">
            Добро пожаловать в интерактивный справочник по Острову Великого Медведя, созданный по
            структуре русскоязычной вики — с живой угольной картой регионов, фильтрацией спавна под
            выбранную сложность и личным дневником исследователя.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => executeCommand('nav.setSection', { section: 'map' })}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#d97724] px-5 py-3 font-tld-display text-sm font-bold tracking-wider text-[#0b1116] uppercase shadow-lg transition hover:bg-[#f09a3e]"
            >
              <MapIcon className="h-4 w-4" />
              Открыть Угольную Карту
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                executeCommand('nav.setSection', { section: 'map' });
                executeCommand('map.setViewLevel', { level: 'world' });
              }}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#3a5168] bg-[#14202b]/90 px-5 py-3 font-tld-display text-sm font-bold tracking-wider text-[#f1ede4] uppercase transition hover:border-[#6cb4cc]"
            >
              <Compass className="h-4 w-4 text-[#6cb4cc]" />
              Схема всего Острова
            </button>

            <button
              type="button"
              onClick={() => executeCommand('nav.setSection', { section: 'fandom' })}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#2f4356] bg-[#0e161f]/90 px-4 py-3 text-xs font-semibold text-[#b8c8d8] transition hover:border-[#d97724]/60 hover:text-white"
            >
              <Globe className="h-4 w-4 text-[#f09a3e]" />
              Поиск в Fandom Wiki RU (API)
            </button>
          </div>
        </div>
      </section>

      {/* Главные тематические разделы (как на Заглавной странице Fandom Wiki) */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-tld-display text-xl font-bold tracking-wider text-[#f3efe6] uppercase sm:text-2xl">
            Разделы Базы Знаний
          </h2>
          <a
            href="https://the-long-dark.fandom.com/ru/wiki/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#6cb4cc] hover:underline"
          >
            Оригинал Fandom RU <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PORTAL_CARDS.map(({ section, title, desc, badge, Icon }) => (
            <button
              key={section}
              type="button"
              onClick={() => executeCommand('nav.setSection', { section })}
              className="group flex cursor-pointer flex-col justify-between rounded-xl border border-[#283949] bg-[#121b24] p-5 text-left shadow-md transition hover:-translate-y-0.5 hover:border-[#d97724]/65 hover:bg-[#15202b]"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#314559] bg-[#0d151d] text-[#f09a3e] transition group-hover:border-[#d97724]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded border border-[#2b3e50] bg-[#0c131a] px-2.5 py-0.5 text-[11px] text-[#8fa3b5]">
                    {badge}
                  </span>
                </div>
                <h3 className="mt-4 font-tld-display text-lg font-bold text-[#f5f1e8] group-hover:text-[#ffd699]">
                  {title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#a8bacb]">{desc}</p>
              </div>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#f09a3e]">
                Перейти в раздел <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Быстрый переход к ключевым регионам с прогрессом исследования */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-tld-display text-xl font-bold tracking-wider text-[#f3efe6] uppercase sm:text-2xl">
              Популярные регионы для экспедиций
            </h2>
            <p className="text-xs text-[#8ea3b5]">
              Глубоко размечены Загадочное озеро, Горный городок (Милтон), Прибрежное шоссе, Отрадная долина и др.
            </p>
          </div>
          <button
            type="button"
            onClick={() => executeCommand('nav.setSection', { section: 'regions' })}
            className="cursor-pointer text-xs font-semibold text-[#f09a3e] hover:underline"
          >
            Все 12 регионов →
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {regions.slice(0, 8).map((r) => {
            const prog = computeRegionProgress(r.id, state.difficulty, visitedSet);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() =>
                  executeCommand('map.selectRegion', {
                    regionId: r.id,
                    openRegionMap: true,
                  })
                }
                className="flex cursor-pointer flex-col justify-between rounded-xl border border-[#263747] bg-[#111a23] p-4 text-left transition hover:border-[#d97724]/60"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] font-medium ${
                        REGION_TIER_META[r.tier].colorClass
                      }`}
                    >
                      {REGION_TIER_META[r.tier].labelRu}
                    </span>
                    <span className="font-mono text-xs text-[#6cb4cc]">
                      {formatSignedTempC(r.avgTempC)}
                    </span>
                  </div>
                  <h3 className="mt-2.5 font-tld-display text-base font-bold text-[#f3efe6]">
                    {r.nameRu}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs text-[#95a8b8]">{r.summaryRu}</p>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-[11px] text-[#8ea3b5]">
                    <span>Обследовано</span>
                    <span className="font-mono text-[#3dd68c]">
                      {prog.visitedCount}/{prog.totalMarkers} ({prog.percentage}%)
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#0a1015]">
                    <div
                      className="h-full bg-[#d97724]"
                      style={{ width: `${prog.percentage}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Сравнительная таблица уровней сложности (интерактивно меняет режим справочника!) */}
      <section className="rounded-xl border border-[#293a4b] bg-[#111a22] p-5 shadow-lg">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-[#f09a3e]" />
            <h2 className="font-tld-display text-xl font-bold tracking-wider text-[#f3efe6] uppercase">
              Уровни сложности Выживания (нажмите для выбора)
            </h2>
          </div>
          <span className="text-xs text-[#8ea3b5]">
            Выбранная сложность автоматически перестраивает лут на карте!
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#243444] text-[#8fa3b5]">
                <th className="py-2.5 pr-3">Режим</th>
                <th className="px-3 py-2.5">Ружья / Револьверы</th>
                <th className="px-3 py-2.5">Фабричные ножи и топоры</th>
                <th className="px-3 py-2.5">Количество ресурсов</th>
                <th className="px-3 py-2.5">Хищники и особенности</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2a38]">
              {DIFFICULTIES.map((d) => {
                const selected = state.difficulty === d.id;
                return (
                  <tr
                    key={d.id}
                    onClick={() =>
                      executeCommand('map.setDifficulty', { difficulty: d.id })
                    }
                    className={`cursor-pointer transition ${
                      selected ? 'bg-[#d97724]/15' : 'hover:bg-[#17232f]'
                    }`}
                  >
                    <td className="py-3 pr-3 font-semibold">
                      <span
                        className="inline-block rounded px-2 py-0.5 text-[#0b1116]"
                        style={{ backgroundColor: d.badgeColor }}
                      >
                        {d.nameRu}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {d.firearmsSpawn ? (
                        <span className="text-emerald-400">✓ Доступны</span>
                      ) : (
                        <span className="text-rose-400">✕ Отсутствуют</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {d.manufacturedKnivesSpawn ? (
                        <span className="text-emerald-400">✓ Доступны</span>
                      ) : (
                        <span className="text-amber-300">Только кузница</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[#cbd5e1]">{d.lootAbundance}</td>
                    <td className="px-3 py-3 text-[#a8bacb]">{d.predatorBehavior}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
