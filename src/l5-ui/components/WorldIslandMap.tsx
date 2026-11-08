import { useState } from 'react';
import { Anvil, ArrowUpRight, Compass, Flame, Hammer, Radio } from 'lucide-react';
import { REGION_TIER_META } from '../../l0-primitives/constants.ts';
import { formatSignedTempC } from '../../l0-primitives/textUtils.ts';
import {
  computeRegionProgress,
  getAllRegions,
  getRegionById,
  getWikiImageUrl,
} from '../../l2-models/selectors.ts';
import { executeCommand, useCommandState } from '../hooks/useCommandState.ts';

export function WorldIslandMap() {
  const state = useCommandState();
  const regions = getAllRegions();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const visitedSet = new Set(state.journal.visitedMarkerIds);
  const activePreviewRegion = getRegionById(hoveredId ?? state.selectedRegionId);
  const previewImg = getWikiImageUrl(activePreviewRegion.imageKey);
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
              Схема всех 15 регионов Острова Великого Медведя и Дальних земель
            </h3>
            <p className="text-xs text-[#8ea3b5]">
              Нажмите на любой регион, чтобы открыть его детальную угольную карту с сеткой A1–H8
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#9eb2c4]">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 bg-[#f09a3e]" /> Ж/д магистраль
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-[#6cb4cc]" />{' '}
              Пещеры / Перевалы
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-[#a78bfa]" />{' '}
              Дальние земли (DLC)
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

            {/* Океан и контур замёрзшего острова + западный выступ Дальних земель */}
            <rect width="1000" height="640" fill={isCharcoal ? '#95a7b3' : '#081018'} />
            <path
              d="M 28 320 C 32 140, 125 45, 330 48 C 530 40, 785 35, 945 90 C 972 185, 955 385, 915 495 C 820 560, 620 560, 440 548 C 265 535, 65 480, 28 320 Z"
              fill="url(#world-bg)"
              stroke={isCharcoal ? '#3f4d57' : '#3a5870'}
              strokeWidth="4"
              filter="url(#island-coast)"
            />

            {/* Подписи зон */}
            <text
              x="145"
              y="78"
              fill={isCharcoal ? '#4a3563' : '#c4b5fd'}
              fontFamily="Oswald, sans-serif"
              fontSize="13"
              fontWeight="700"
              letterSpacing="1.5"
              opacity="0.82"
            >
              ДАЛЬНИЕ ЗЕМЛИ (FAR TERRITORY)
            </text>
            <text
              x="700"
              y="602"
              fill={isCharcoal ? '#334652' : '#4a6b82'}
              fontFamily="Cormorant Garamond, Georgia, serif"
              fontStyle="italic"
              fontSize="19"
              fontWeight="700"
              letterSpacing="2.5"
              opacity="0.78"
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
                    strokeWidth={isHighlighted ? 3.8 : 2.3}
                    strokeDasharray={isRail ? 'none' : '8 5'}
                    opacity={isHighlighted ? 1 : 0.74}
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

              const shortTitle = reg.nameRu
                .replace(' (Дальние земли)', '')
                .replace(' (Милтон)', '');

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
                  {(isSelected || isHovered) && (
                    <circle
                      r="24"
                      fill="none"
                      stroke="#f09a3e"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    />
                  )}

                  <circle
                    r="16"
                    fill={nodeFill}
                    stroke={nodeStroke}
                    strokeWidth="2.8"
                  />

                  <text
                    y="3.5"
                    textAnchor="middle"
                    fill="#f8f5ee"
                    fontFamily="JetBrains Mono, monospace"
                    fontSize="9.5"
                    fontWeight="700"
                  >
                    {prog.percentage}%
                  </text>

                  <g transform="translate(0, 29)">
                    <rect
                      x="-68"
                      y="-10"
                      width="136"
                      height="19"
                      rx="4"
                      fill={isCharcoal ? 'rgba(30, 26, 22, 0.9)' : 'rgba(10, 17, 24, 0.92)'}
                      stroke={isSelected || isHovered ? '#f09a3e' : 'rgba(148,163,184,0.32)'}
                      strokeWidth="1"
                    />
                    <text
                      y="3"
                      textAnchor="middle"
                      fill={isSelected || isHovered ? '#ffd699' : '#f1ede4'}
                      fontFamily="Oswald, sans-serif"
                      fontSize="10.8"
                      letterSpacing="0.4"
                    >
                      {shortTitle}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Правая карточка сводки выбранного/наведённого региона с реальным фото */}
      <div className="flex flex-col justify-between overflow-hidden rounded-xl border border-[#2c3d4f] bg-[#121b24] shadow-xl lg:col-span-4">
        <div>
          {previewImg && (
            <div className="relative h-40 w-full overflow-hidden border-b border-[#243444]">
              <img
                src={previewImg}
                alt={activePreviewRegion.nameRu}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121b24] via-transparent to-transparent" />
              {activePreviewRegion.isDlc && (
                <span className="absolute top-2.5 right-2.5 rounded bg-violet-950/90 px-2 py-0.5 text-[11px] font-bold text-violet-200 border border-violet-400/40">
                  DLC: Tales from the Far Territory
                </span>
              )}
            </div>
          )}

          <div className="p-5">
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

            <h3 className="mt-2.5 font-tld-display text-2xl font-bold text-[#f5f1e8] uppercase">
              {activePreviewRegion.nameRu}
            </h3>
            <p className="font-tld-journal text-base italic text-[#9db0c0]">
              {activePreviewRegion.nameEn}
            </p>

            <p className="mt-2.5 text-xs leading-relaxed text-[#cbd5e1]">
              {activePreviewRegion.summaryRu}
            </p>

            <div className="mt-3 rounded-lg border border-[#233446] bg-[#0c131a] p-2.5 text-xs text-[#d6e0ea]">
              <strong className="text-[#ffd699]">🧭 Ориентиры: </strong>
              {activePreviewRegion.navigationGuideRu}
            </div>

            {/* Инфраструктура выживания */}
            <div className="mt-3.5 flex flex-wrap gap-1.5 text-xs">
              {activePreviewRegion.hasWorkbench && (
                <span className="inline-flex items-center gap-1 rounded border border-sky-500/30 bg-sky-950/40 px-2 py-0.5 text-sky-200">
                  <Hammer className="h-3 w-3" /> Верстак
                </span>
              )}
              {activePreviewRegion.hasForge && (
                <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-950/40 px-2 py-0.5 text-amber-200">
                  <Anvil className="h-3 w-3" /> Кузница
                </span>
              )}
              {activePreviewRegion.hasAmmoBench && (
                <span className="inline-flex items-center gap-1 rounded border border-rose-500/40 bg-rose-950/40 px-2 py-0.5 text-rose-200">
                  <Flame className="h-3 w-3" /> Верстак патронов
                </span>
              )}
              {activePreviewRegion.hasTrader && (
                <span className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-950/40 px-2 py-0.5 text-emerald-200">
                  <Radio className="h-3 w-3" /> Торговец Сазерленд
                </span>
              )}
            </div>

            {/* Маршруты переходов */}
            <div className="mt-4">
              <h4 className="text-xs font-semibold tracking-wider text-[#8ea3b5] uppercase">
                Связанные регионы ({activePreviewRegion.connections.length}):
              </h4>
              <ul className="mt-1.5 space-y-1 text-xs">
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
        </div>

        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={() =>
              executeCommand('map.selectRegion', {
                regionId: activePreviewRegion.id,
                openRegionMap: true,
              })
            }
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#d97724] px-4 py-2.5 font-tld-display text-sm font-bold tracking-wider text-[#0b1116] uppercase shadow-lg transition hover:bg-[#f09a3e]"
          >
            <Compass className="h-4 w-4" />
            Открыть угольную карту: {activePreviewRegion.nameRu}
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
