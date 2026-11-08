import { useState } from 'react';
import { Anvil, ArrowUpRight, Compass, Flame, Hammer, Radio } from 'lucide-react';
import { REGION_TIER_META } from '../../l0-primitives/constants.ts';
import { formatSignedTempC } from '../../l0-primitives/textUtils.ts';
import { computeRegionProgress, getAllRegions, getRegionById } from '../../l2-models/selectors.ts';
import { executeCommand, useCommandState } from '../hooks/useCommandState.ts';

export function WorldIslandMap() {
  const state = useCommandState();
  const regions = getAllRegions();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const visitedSet = new Set(state.journal.visitedMarkerIds);
  const activePreviewRegion = getRegionById(hoveredId ?? state.selectedRegionId);
  const isCharcoal = state.mapTheme === 'charcoal';

  // Уникальные рёбра переходов между регионами
  const edges: {
    readonly key: string;
    readonly from: (typeof regions)[number];
    readonly to: (typeof regions)[number];
    readonly type: string;
    readonly viaRu: string;
  }[] = [];
  const seenPairs = new Set<string>();

  for (const reg of regions) {
    for (const conn of reg.connections) {
      const target = regions.find((r) => r.id === conn.targetRegionId);
      if (!target) continue;
      const pairKey = [reg.id, target.id].sort().join('::');
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      edges.push({
        key: pairKey,
        from: reg,
        to: target,
        type: conn.type,
        viaRu: conn.viaRu,
      });
    }
  }

  // SVG Y-ось инвертирована относительно 0..640 снизу вверх
  const toWorldSvgY = (y: number) => 640 - y;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Интерактивное полотно Острова Великого Медведя */}
      <div className="overflow-hidden rounded-xl border border-[#2d3e4f] bg-[#0e161e] shadow-2xl lg:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#243342] bg-[#121c26] px-4 py-2.5">
          <div>
            <h3 className="font-tld-display text-base font-bold tracking-wider text-[#f3efe6] uppercase">
              Схема переходов Острова Великого Медведя
            </h3>
            <p className="text-xs text-[#8ea3b5]">
              Нажмите на любой регион, чтобы открыть его детальную угольную карту (Leaflet)
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[#9eb2c4]">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 bg-[#f09a3e]" /> Ж/д магистраль
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-[#6cb4cc]" />{' '}
              Пещеры / Шахты
            </span>
          </div>
        </div>

        <div className="relative aspect-[1000/640] w-full select-none">
          <svg
            viewBox="0 0 1000 640"
            className="h-full w-full"
            role="img"
            aria-label="Интерактивная карта регионов Острова Великого Медведя"
          >
            <defs>
              <radialGradient id="world-bg" cx="50%" cy="48%" r="62%">
                <stop offset="0%" stopColor={isCharcoal ? '#d4cab4' : '#162533'} />
                <stop offset="75%" stopColor={isCharcoal ? '#baae95' : '#0e1923'} />
                <stop offset="100%" stopColor={isCharcoal ? '#877c66' : '#070d13'} />
              </radialGradient>
              <filter id="island-coast">
                <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="14" />
                <feDisplacementMap in="SourceGraphic" scale="9" />
              </filter>
            </defs>

            {/* Океан и контур замёрзшего острова */}
            <rect width="1000" height="640" fill={isCharcoal ? '#95a7b3' : '#081018'} />
            <path
              d="M 45 360 C 55 180, 165 65, 340 55 C 530 42, 780 35, 935 90 C 965 180, 950 380, 910 490 C 820 555, 620 555, 440 545 C 290 535, 130 495, 45 360 Z"
              fill="url(#world-bg)"
              stroke={isCharcoal ? '#3f4d57' : '#3a5870'}
              strokeWidth="4"
              filter="url(#island-coast)"
            />

            {/* Подпись океана */}
            <text
              x="710"
              y="595"
              fill={isCharcoal ? '#334652' : '#4a6b82'}
              fontFamily="Cormorant Garamond, Georgia, serif"
              fontStyle="italic"
              fontSize="20"
              fontWeight="700"
              letterSpacing="3"
              opacity="0.75"
            >
              СЕВЕРНЫЙ ТИХИЙ ОКЕАН • ЗАМЁРЗШИЙ ЗАЛИВ
            </text>

            {/* Связи между регионами */}
            {edges.map((edge) => {
              const x1 = edge.from.worldPos[0];
              const y1 = toWorldSvgY(edge.from.worldPos[1]);
              const x2 = edge.to.worldPos[0];
              const y2 = toWorldSvgY(edge.to.worldPos[1]);
              const isHighlighted =
                hoveredId === edge.from.id ||
                hoveredId === edge.to.id ||
                (!hoveredId &&
                  (state.selectedRegionId === edge.from.id ||
                    state.selectedRegionId === edge.to.id));

              const isRail = edge.type === 'railway';
              const stroke = isHighlighted
                ? '#f09a3e'
                : isRail
                  ? isCharcoal
                    ? '#3c2e21'
                    : '#c7823b'
                  : isCharcoal
                    ? '#475b69'
                    : '#5a829e';

              return (
                <g key={edge.key}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={stroke}
                    strokeWidth={isHighlighted ? 3.8 : 2.4}
                    strokeDasharray={isRail ? 'none' : '8 5'}
                    opacity={isHighlighted ? 1 : 0.72}
                  />
                </g>
              );
            })}

            {/* Узлы регионов */}
            {regions.map((reg) => {
              const cx = reg.worldPos[0];
              const cy = toWorldSvgY(reg.worldPos[1]);
              const isSelected = state.selectedRegionId === reg.id;
              const isHovered = hoveredId === reg.id;
              const prog = computeRegionProgress(reg.id, state.difficulty, visitedSet);

              const nodeFill = isSelected || isHovered ? '#d97724' : '#182430';
              const nodeStroke = isSelected
                ? '#ffd699'
                : reg.isDlc
                  ? '#a78bfa'
                  : isCharcoal
                    ? '#2b241d'
                    : '#6cb4cc';

              return (
                <g
                  key={reg.id}
                  transform={`translate(${cx}, ${cy})`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredId(reg.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() =>
                    executeCommand('map.selectRegion', {
                      regionId: reg.id,
                      openRegionMap: true,
                    })
                  }
                >
                  {/* Внешнее свечение при выборе */}
                  {(isSelected || isHovered) && (
                    <circle
                      r="25"
                      fill="none"
                      stroke="#f09a3e"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    />
                  )}

                  <circle
                    r="17"
                    fill={nodeFill}
                    stroke={nodeStroke}
                    strokeWidth="2.8"
                  />

                  <text
                    y="4"
                    textAnchor="middle"
                    fill="#f8f5ee"
                    fontFamily="JetBrains Mono, monospace"
                    fontSize="10"
                    fontWeight="700"
                  >
                    {prog.percentage}%
                  </text>

                  {/* Плашка названия региона */}
                  <g transform="translate(0, 31)">
                    <rect
                      x="-74"
                      y="-11"
                      width="148"
                      height="21"
                      rx="4"
                      fill={isCharcoal ? 'rgba(30, 26, 22, 0.88)' : 'rgba(10, 17, 24, 0.9)'}
                      stroke={isSelected || isHovered ? '#f09a3e' : 'rgba(148,163,184,0.3)'}
                      strokeWidth="1"
                    />
                    <text
                      y="3"
                      textAnchor="middle"
                      fill={isSelected || isHovered ? '#ffd699' : '#f1ede4'}
                      fontFamily="Oswald, sans-serif"
                      fontSize="11.5"
                      letterSpacing="0.5"
                    >
                      {reg.nameRu.replace(' (Дальние земли)', '').replace(' (Милтон)', '')}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Правая карточка сводки выбранного/наведённого региона */}
      <div className="flex flex-col justify-between rounded-xl border border-[#2c3d4f] bg-[#121b24] p-5 shadow-xl lg:col-span-4">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`rounded border px-2 py-0.5 text-xs font-medium ${
                REGION_TIER_META[activePreviewRegion.tier].colorClass
              }`}
            >
              {REGION_TIER_META[activePreviewRegion.tier].labelRu}
            </span>
            <span className="font-mono text-xs text-[#6cb4cc]">
              Ср. темп: {formatSignedTempC(activePreviewRegion.avgTempC)} • Метели:{' '}
              {activePreviewRegion.blizzardRisk}
            </span>
          </div>

          <h3 className="mt-3 font-tld-display text-2xl font-bold text-[#f5f1e8] uppercase">
            {activePreviewRegion.nameRu}
          </h3>
          <p className="font-tld-journal text-base italic text-[#9db0c0]">
            {activePreviewRegion.nameEn}
          </p>

          <p className="mt-3 text-sm leading-relaxed text-[#cbd5e1]">
            {activePreviewRegion.summaryRu}
          </p>

          {/* Инфраструктура выживания */}
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {activePreviewRegion.hasWorkbench && (
              <span className="inline-flex items-center gap-1 rounded border border-sky-500/30 bg-sky-950/40 px-2.5 py-1 text-sky-200">
                <Hammer className="h-3.5 w-3.5" /> Верстак
              </span>
            )}
            {activePreviewRegion.hasForge && (
              <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-950/40 px-2.5 py-1 text-amber-200">
                <Anvil className="h-3.5 w-3.5" /> Кузница
              </span>
            )}
            {activePreviewRegion.hasAmmoBench && (
              <span className="inline-flex items-center gap-1 rounded border border-rose-500/40 bg-rose-950/40 px-2.5 py-1 text-rose-200">
                <Flame className="h-3.5 w-3.5" /> Верстак патронов
              </span>
            )}
            {activePreviewRegion.hasTrader && (
              <span className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-1 text-emerald-200">
                <Radio className="h-3.5 w-3.5" /> Торговец Сазерленд
              </span>
            )}
          </div>

          {/* Маршруты переходов */}
          <div className="mt-5">
            <h4 className="text-xs font-semibold tracking-wider text-[#8ea3b5] uppercase">
              Связанные регионы и переходы:
            </h4>
            <ul className="mt-2 space-y-1.5 text-xs">
              {activePreviewRegion.connections.map((conn) => {
                const target = getRegionById(conn.targetRegionId);
                return (
                  <li key={conn.targetRegionId}>
                    <button
                      type="button"
                      onClick={() =>
                        executeCommand('map.selectRegion', {
                          regionId: target.id,
                          openRegionMap: true,
                        })
                      }
                      className="flex w-full cursor-pointer items-center justify-between rounded border border-[#223140] bg-[#0e161d] px-2.5 py-1.5 text-left transition hover:border-[#d97724]/50"
                    >
                      <span className="font-medium text-[#e4dfd5]">{target.nameRu}</span>
                      <span className="ml-2 truncate text-[11px] text-[#8ea3b5]">
                        {conn.viaRu}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            executeCommand('map.selectRegion', {
              regionId: activePreviewRegion.id,
              openRegionMap: true,
            })
          }
          className="mt-5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#d97724] px-4 py-2.5 font-tld-display text-sm font-bold tracking-wider text-[#0b1116] uppercase shadow-lg transition hover:bg-[#f09a3e]"
        >
          <Compass className="h-4 w-4" />
          Открыть угольную карту: {activePreviewRegion.nameRu}
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
