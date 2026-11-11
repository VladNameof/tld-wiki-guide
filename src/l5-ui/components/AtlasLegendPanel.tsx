import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Eye, EyeOff, Layers } from 'lucide-react';
import type { CanvasLayerKey } from '../../l0-primitives/types.ts';
import { ATLAS_LEGEND_GROUPS } from '../../l4-renderers/atlasLegendCatalog.ts';
import { executeCommand, useCommandState } from '../hooks/useCommandState.ts';

interface LayerToggleMeta {
  readonly key: CanvasLayerKey;
  readonly labelRu: string;
  readonly badgeEmoji: string;
}

const CANVAS_LAYER_SWITCHES: readonly LayerToggleMeta[] = [
  { key: 'streetViewRoutes', labelRu: 'Street View узлы и маршруты', badgeEmoji: '🚶' },
  { key: 'buildingsAndSublocs', labelRu: 'Постройки, удобства и подлокации', badgeEmoji: '🏠' },
  { key: 'ropesAndRoutes', labelRu: 'Тропы, тросы и путь ковки', badgeEmoji: '🪢' },
  { key: 'faunaAndCarcasses', labelRu: 'Животные, туши и трупы', badgeEmoji: '🐺' },
  { key: 'floraAndSaplings', labelRu: 'Травы, мхи и саженцы', badgeEmoji: '🌿' },
  { key: 'lootAndStations', labelRu: 'Поляроиды, вышки, авто и лут', badgeEmoji: '⚒️' },
];

export function AtlasLegendPanel() {
  const state = useCommandState();
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeGroupFilter, setActiveGroupFilter] = useState<string>('all');

  const isCharcoal = state.mapTheme === 'charcoal';
  const swatchBg = isCharcoal ? '#ebe4d3' : '#152636';
  const swatchBorder = isCharcoal ? '#786852' : '#334e68';

  const totalSymbols = ATLAS_LEGEND_GROUPS.reduce((acc, g) => acc + g.items.length, 0);
  const visibleGroups =
    activeGroupFilter === 'all'
      ? ATLAS_LEGEND_GROUPS
      : ATLAS_LEGEND_GROUPS.filter((g) => g.id === activeGroupFilter);

  return (
    <div className="overflow-hidden rounded-xl border border-[#2d4054] bg-[#111a23] shadow-xl">
      {/* Шапка интерактивной легенды */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#203040] bg-[#15212d] px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[#f09a3e]" />
          <h3 className="font-tld-display text-sm font-bold tracking-wide text-[#f6f1e7] uppercase">
            Полная картографическая легенда и слои полотна ({totalSymbols} условных знаков)
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#31465b] bg-[#0d151d] px-2.5 py-1 text-xs font-semibold text-[#ffd699] transition hover:border-[#d97724]"
        >
          {isExpanded ? (
            <>
              Свернуть легенду <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Развернуть все {totalSymbols} знаков <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Панель управления 5 слоями самого SVG-полотна карты */}
      <div className="border-b border-[#1d2c3b] bg-[#0e161f] px-4 py-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-[#9db0c0] uppercase">
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            Слои детализации на самом холсте карты (клик — включить/скрыть слой):
          </span>
          <div className="flex items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => executeCommand('map.setAllCanvasLayers', { enabled: true })}
              className="inline-flex cursor-pointer items-center gap-1 text-emerald-300 hover:underline"
            >
              <Eye className="h-3 w-3" /> Показать все слои
            </button>
            <span className="text-[#475b6d]">•</span>
            <button
              type="button"
              onClick={() => executeCommand('map.setAllCanvasLayers', { enabled: false })}
              className="inline-flex cursor-pointer items-center gap-1 text-[#8fa3b5] hover:underline"
            >
              <EyeOff className="h-3 w-3" /> Только чистый рельеф
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CANVAS_LAYER_SWITCHES.map((sw) => {
            const on = state.canvasLayers[sw.key];
            return (
              <button
                key={sw.key}
                type="button"
                onClick={() => executeCommand('map.toggleCanvasLayer', { layer: sw.key })}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                  on
                    ? 'border-emerald-500/45 bg-emerald-950/35 text-emerald-100 shadow-sm'
                    : 'border-[#253545] bg-[#131d27] text-[#7c91a4] opacity-70 hover:opacity-100'
                }`}
              >
                <span>{sw.badgeEmoji}</span>
                <span>{sw.labelRu}</span>
                <span
                  className={`rounded px-1 py-0.2 text-[10px] ${
                    on ? 'bg-emerald-500/25 text-emerald-300' : 'bg-[#0b1116] text-[#687d90]'
                  }`}
                >
                  {on ? 'Вкл' : 'Скр'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4">
          {/* Быстрые вкладки разделов легенды */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveGroupFilter('all')}
              className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                activeGroupFilter === 'all'
                  ? 'bg-[#d97724] text-[#0b1116]'
                  : 'border border-[#283949] bg-[#15212d] text-[#cbd5e1] hover:border-[#d97724]/50'
              }`}
            >
              Все разделы ({totalSymbols})
            </button>
            {ATLAS_LEGEND_GROUPS.map((grp) => (
              <button
                key={grp.id}
                type="button"
                onClick={() => setActiveGroupFilter(grp.id)}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  activeGroupFilter === grp.id
                    ? 'bg-[#d97724] text-[#0b1116]'
                    : 'border border-[#283949] bg-[#15212d] text-[#cbd5e1] hover:border-[#d97724]/50'
                }`}
              >
                {grp.titleRu.replace(/^\d+\.\s*/, '')} ({grp.items.length})
              </button>
            ))}
          </div>

          {/* Сетка всех категорий и пиктограмм легенды */}
          <div className="space-y-5">
            {visibleGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-lg border border-[#223242] bg-[#0c131a] p-3.5"
              >
                <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2 border-b border-[#1b2936] pb-2">
                  <h4 className="font-tld-display text-xs font-bold tracking-wider text-[#ffd699] uppercase sm:text-sm">
                    {group.titleRu}
                  </h4>
                  <span className="text-[11px] text-[#8ea3b5]">{group.subtitleRu}</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {group.items.map((item) => {
                    const layerOn = item.layerKey ? state.canvasLayers[item.layerKey] : true;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-start gap-2.5 rounded-lg border border-[#1f2e3d] bg-[#121c26] p-2.5 transition ${
                          layerOn ? '' : 'opacity-50'
                        }`}
                      >
                        {/* Реальный векторный образец значка в текущей теме карты */}
                        <div
                          className="mt-0.5 flex h-8 w-11 shrink-0 items-center justify-center rounded border shadow-inner"
                          style={{
                            backgroundColor: swatchBg,
                            borderColor: swatchBorder,
                          }}
                        >
                          <svg
                            viewBox="-15 -10 30 20"
                            className="h-6 w-9 overflow-visible"
                            aria-hidden="true"
                            dangerouslySetInnerHTML={{
                              __html: item.renderIcon(isCharcoal),
                            }}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-[#f3efe6]">{item.titleRu}</div>
                          <p className="mt-0.5 text-[11px] leading-snug text-[#9cb0c2]">
                            {item.detailRu}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
