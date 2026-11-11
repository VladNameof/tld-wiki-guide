import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Compass,
  ExternalLink,
  Footprints,
  Map as MapIcon,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Video,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { DIFFICULTY_BY_ID } from '../../l0-primitives/constants.ts';
import { formatGridSector } from '../../l0-primitives/textUtils.ts';
import type { StreetViewNode } from '../../l0-primitives/types.ts';
import {
  getAllStreetViewNodes,
  getRegionById,
  getRegionStreetViewNodes,
  getStreetViewNodeById,
  getStreetViewVideoMeta,
  resolveRegionCartography,
} from '../../l2-models/selectors.ts';
import { buildRegionCharcoalMapDataUrl } from '../../l4-renderers/charcoalMapSvg.ts';
import { executeCommand, useCommandState } from '../hooks/useCommandState.ts';

function formatSecClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function compassDirectionRu(deg: number): string {
  const norm = ((deg % 360) + 360) % 360;
  const dirs = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
  return dirs[Math.round(norm / 45) % 8] ?? 'С';
}

export function StreetViewWalkerModal() {
  const state = useCommandState();
  const nodeId = state.activeStreetViewNodeId;

  const activeNode: StreetViewNode | undefined = useMemo(
    () => (nodeId ? getStreetViewNodeById(nodeId) : undefined),
    [nodeId],
  );

  const [stepIdx, setStepIdx] = useState(0);
  const [lookYawDeg, setLookYawDeg] = useState(0);
  const [zoomScale, setZoomScale] = useState(1.12);
  const [isAutoWalking, setIsAutoWalking] = useState(false);
  const [showHdVideo, setShowHdVideo] = useState(false);

  const dragStartRef = useRef<{ x: number; yaw: number } | null>(null);

  const videoMeta = useMemo(
    () => (activeNode ? getStreetViewVideoMeta(activeNode.videoId) : undefined),
    [activeNode],
  );

  const stepSec = useMemo(() => {
    const raw = (videoMeta?.intervalMs ?? 10000) / 1000;
    return Math.max(2, raw);
  }, [videoMeta]);

  const totalSteps = useMemo(() => {
    if (!activeNode) return 1;
    const span = Math.max(stepSec, activeNode.endSec - activeNode.startSec);
    return Math.max(1, Math.floor(span / stepSec) + 1);
  }, [activeNode, stepSec]);

  // Сброс локального шага при переходе в другой узел Street View
  useEffect(() => {
    setStepIdx(0);
    setLookYawDeg(0);
    setShowHdVideo(false);
  }, [activeNode?.id]);

  const region = useMemo(
    () => (activeNode ? getRegionById(activeNode.regionId) : undefined),
    [activeNode],
  );

  const regionalNodes = useMemo(
    () => (activeNode ? getRegionStreetViewNodes(activeNode.regionId) : []),
    [activeNode],
  );

  const nextNode = useMemo(
    () => (activeNode?.nextNodeId ? getStreetViewNodeById(activeNode.nextNodeId) : undefined),
    [activeNode],
  );
  const prevNode = useMemo(
    () => (activeNode?.prevNodeId ? getStreetViewNodeById(activeNode.prevNodeId) : undefined),
    [activeNode],
  );

  const progressRatio = totalSteps > 1 ? Math.min(1, stepIdx / (totalSteps - 1)) : 0;

  // Живая интерполированная координата «Где я сейчас» вдоль маршрута на миникарте
  const livePos = useMemo(() => {
    if (!activeNode) return { x: 500, y: 500 };
    if (nextNode && nextNode.regionId === activeNode.regionId) {
      return {
        x: Math.round(activeNode.x + (nextNode.x - activeNode.x) * progressRatio * 0.72),
        y: Math.round(activeNode.y + (nextNode.y - activeNode.y) * progressRatio * 0.72),
      };
    }
    return { x: activeNode.x, y: activeNode.y };
  }, [activeNode, nextNode, progressRatio]);

  const liveHeading = activeNode ? ((activeNode.headingDeg + lookYawDeg) % 360 + 360) % 360 : 0;

  const jumpToNode = useCallback((target: StreetViewNode) => {
    setIsAutoWalking(false);
    executeCommand('streetview.openNode', {
      nodeId: target.id,
      regionId: target.regionId,
    });
  }, []);

  const handleStepForward = useCallback(() => {
    if (!activeNode) return;
    if (stepIdx < totalSteps - 1) {
      setStepIdx((s) => s + 1);
    } else if (nextNode) {
      jumpToNode(nextNode);
    }
  }, [activeNode, stepIdx, totalSteps, nextNode, jumpToNode]);

  const handleStepBack = useCallback(() => {
    if (!activeNode) return;
    if (stepIdx > 0) {
      setStepIdx((s) => s - 1);
    } else if (prevNode) {
      jumpToNode(prevNode);
    }
  }, [activeNode, stepIdx, prevNode, jumpToNode]);

  // Авто-прогулка по маршруту
  useEffect(() => {
    if (!isAutoWalking || !activeNode) return;
    const timer = window.setInterval(() => {
      if (stepIdx < totalSteps - 1) {
        setStepIdx((s) => s + 1);
      } else if (nextNode) {
        jumpToNode(nextNode);
      } else {
        setIsAutoWalking(false);
      }
    }, 1150);
    return () => window.clearInterval(timer);
  }, [isAutoWalking, activeNode, stepIdx, totalSteps, nextNode, jumpToNode]);

  // Клавиатурная навигация как в игре / Google Maps (WASD + Стрелки + Esc)
  useEffect(() => {
    if (!activeNode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        executeCommand('streetview.close', {});
      } else if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        e.preventDefault();
        handleStepForward();
      } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleStepBack();
      } else if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setLookYawDeg((y) => Math.max(-45, y - 15));
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        e.preventDefault();
        setLookYawDeg((y) => Math.min(45, y + 15));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeNode, handleStepForward, handleStepBack]);

  // Прегенерированная мини-карта текущего региона для радара «Где я сейчас»
  const miniMapSvgUrl = useMemo(() => {
    if (!region) return '';
    const cart = resolveRegionCartography(region.id, state.difficulty);
    return buildRegionCharcoalMapDataUrl({
      region,
      theme: state.mapTheme,
      difficulty: state.difficulty,
      cartography: cart,
      showMicroDetails: false,
      canvasLayers: {
        buildingsAndSublocs: true,
        ropesAndRoutes: true,
        faunaAndCarcasses: false,
        floraAndSaplings: false,
        lootAndStations: false,
        streetViewRoutes: true,
      },
      streetViewNodes: regionalNodes,
    });
  }, [region, state.difficulty, state.mapTheme, regionalNodes]);

  if (!activeNode || !region) return null;

  const currentSec = Math.min(activeNode.endSec, activeNode.startSec + stepIdx * stepSec);
  const cols = videoMeta?.cols ?? 3;
  const rows = videoMeta?.rows ?? 3;
  const perSheet = Math.max(1, cols * rows);
  const maxFrameIdx = videoMeta?.maxFrameIndex ?? 100;
  const frameIndex = Math.min(
    maxFrameIdx,
    Math.max(0, Math.round(currentSec / stepSec)),
  );
  const sheetIdx = Math.min(
    Math.max(0, (videoMeta?.sheetCount ?? 1) - 1),
    Math.floor(frameIndex / perSheet),
  );
  const slotIdx = frameIndex % perSheet;
  const col = slotIdx % cols;
  const row = Math.floor(slotIdx / cols);
  const bgPosX = cols > 1 ? (col / (cols - 1)) * 100 : 0;
  const bgPosY = rows > 1 ? (row / (rows - 1)) * 100 : 0;
  const panOffsetPct = (lookYawDeg / 45) * 14;
  const diffMeta = DIFFICULTY_BY_ID[state.difficulty];
  const allNodesCount = getAllStreetViewNodes().length;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/88 p-2 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={`Street View: ${activeNode.titleRu}`}
    >
      <div className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#2d4863] bg-[#0b131b] shadow-2xl">
        {/* Верхняя навигационная панель Google-Street-View */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c2e3f] bg-[#101c28] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0284c7] text-white shadow">
              <Footprints className="h-4 w-4" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[#0284c7]/25 px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#7dd3fc]">
                  STREET VIEW • [{formatGridSector(livePos.x, livePos.y)}]
                </span>
                <span className="text-xs font-semibold text-[#ffd699]">{region.nameRu}</span>
                <span className="text-[11px] text-[#7c94aa]">• {activeNode.routeTitleRu}</span>
              </div>
              <h2 className="font-tld-display text-base font-bold text-white sm:text-lg">
                {activeNode.titleRu}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHdVideo((v) => !v)}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                showHdVideo
                  ? 'border-rose-400 bg-rose-600/25 text-rose-100'
                  : 'border-[#2c435a] bg-[#162433] text-[#cbd5e1] hover:border-[#38bdf8]'
              }`}
            >
              <Video className="h-3.5 w-3.5 text-rose-400" />
              {showHdVideo ? 'Вернуться в шаговый Street View' : 'Смотреть HD видео с этой сек.'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsAutoWalking(false);
                executeCommand('streetview.close', {});
              }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#344b61] bg-[#162330] px-2.5 py-1.5 text-xs font-semibold text-[#e2e8f0] hover:border-rose-400 hover:text-white"
            >
              <X className="h-4 w-4" /> Закрыть
            </button>
          </div>
        </div>

        {/* Основная сцена + боковая панель */}
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-12">
          {/* Левая/центральная часть: Интерактивное окно первого лица */}
          <div className="relative flex flex-col bg-[#05090e] lg:col-span-8">
            <div
              className="relative aspect-video w-full overflow-hidden select-none"
              onPointerDown={(e) => {
                if (showHdVideo) return;
                dragStartRef.current = { x: e.clientX, yaw: lookYawDeg };
              }}
              onPointerMove={(e) => {
                if (!dragStartRef.current || showHdVideo) return;
                const dx = e.clientX - dragStartRef.current.x;
                setLookYawDeg(Math.max(-45, Math.min(45, dragStartRef.current.yaw - dx * 0.25)));
              }}
              onPointerUp={() => {
                dragStartRef.current = null;
              }}
              onPointerLeave={() => {
                dragStartRef.current = null;
              }}
            >
              {showHdVideo ? (
                <iframe
                  title={activeNode.titleEn}
                  src={`https://www.youtube.com/embed/${activeNode.videoId}?start=${Math.floor(currentSec)}&autoplay=1&rel=0`}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <>
                  {/* Слой кадра из локальной раскадровки LeopardTriX */}
                  <div
                    className="h-full w-full cursor-grab transition-all duration-300 ease-out active:cursor-grabbing"
                    style={{
                      backgroundImage: `url('./streetview/${activeNode.videoId}/m${sheetIdx}.webp')`,
                      backgroundSize: `${cols * 100}% ${rows * 100}%`,
                      backgroundPosition: `${bgPosX}% ${bgPosY}%`,
                      backgroundRepeat: 'no-repeat',
                      transform: `scale(${zoomScale}) translateX(${panOffsetPct.toFixed(2)}%)`,
                    }}
                  />

                  {/* Атмосферная виньетка выжившего и лента компаса сверху */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'radial-gradient(circle at center, transparent 58%, rgba(5, 9, 14, 0.78) 100%)',
                    }}
                  />

                  <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#38bdf8]/40 bg-[#08131e]/85 px-3 py-1 text-xs font-semibold text-[#e0f2fe] shadow-lg">
                      <Compass className="h-3.5 w-3.5 text-[#38bdf8]" />
                      Курс: <strong className="text-[#ffd699]">{Math.round(liveHeading)}° ({compassDirectionRu(liveHeading)})</strong>
                      <span className="text-[#7c9bb5]">•</span>
                      <span>
                        Шаг {stepIdx + 1}/{totalSteps} ({formatSecClock(currentSec)})
                      </span>
                    </div>

                    <div className="hidden rounded-full border border-[#33485c] bg-[#08131e]/85 px-3 py-1 text-[11px] text-[#cbd5e1] sm:block">
                      Тяните мышкой для обзора • W/S — шаг, A/D — осмотр
                    </div>
                  </div>

                  {/* Наземные стрелки направления Google Street View */}
                  <div className="absolute right-4 bottom-4 left-4 flex flex-wrap items-end justify-between gap-3">
                    {/* Мини-кнопки поворота и зума */}
                    <div className="flex items-center gap-1.5 rounded-xl border border-[#2a4055] bg-[#08121b]/88 p-1.5 backdrop-blur">
                      <button
                        type="button"
                        onClick={() => setLookYawDeg((y) => Math.max(-45, y - 15))}
                        className="cursor-pointer rounded-lg p-1.5 text-[#cbd5e1] hover:bg-[#162738] hover:text-white"
                        title="Осмотреться левее (A / ←)"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLookYawDeg((y) => Math.min(45, y + 15))}
                        className="cursor-pointer rounded-lg p-1.5 text-[#cbd5e1] hover:bg-[#162738] hover:text-white"
                        title="Осмотреться правее (D / →)"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <span className="mx-0.5 h-4 w-px bg-[#253a4d]" />
                      <button
                        type="button"
                        onClick={() => setZoomScale((z) => Math.max(1, Number((z - 0.2).toFixed(2))))}
                        className="cursor-pointer rounded-lg p-1.5 text-[#cbd5e1] hover:bg-[#162738]"
                        title="Отдалить камеру"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomScale((z) => Math.min(2.1, Number((z + 0.2).toFixed(2))))}
                        className="cursor-pointer rounded-lg p-1.5 text-[#cbd5e1] hover:bg-[#162738]"
                        title="Приблизить горизонт"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLookYawDeg(0);
                          setZoomScale(1.12);
                        }}
                        className="cursor-pointer rounded-lg p-1.5 text-[#9eb4c8] hover:bg-[#162738]"
                        title="Сброс ракурса"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Главные стрелки движения по маршруту */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleStepBack}
                        disabled={stepIdx === 0 && !prevNode}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#324a62] bg-[#0b1826]/92 px-3 py-2 text-xs font-bold text-[#e2e8f0] shadow-lg transition hover:border-[#38bdf8] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowDown className="h-4 w-4 text-[#7dd3fc]" />
                        {stepIdx > 0 ? 'Шаг назад' : prevNode ? `Назад: ${prevNode.titleRu.split('(')[0]!.trim()}` : 'Начало'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsAutoWalking((a) => !a)}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold shadow-lg transition ${
                          isAutoWalking
                            ? 'border-amber-400 bg-amber-500/25 text-amber-100'
                            : 'border-[#324a62] bg-[#0b1826]/92 text-[#ffd699] hover:border-amber-400'
                        }`}
                      >
                        {isAutoWalking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {isAutoWalking ? 'Пауза' : 'Авто-ход'}
                      </button>

                      <button
                        type="button"
                        onClick={handleStepForward}
                        disabled={stepIdx >= totalSteps - 1 && !nextNode}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0284c7] px-4 py-2 text-xs font-bold text-white shadow-xl transition hover:bg-[#0ea5e9] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowUp className="h-4 w-4" />
                        {stepIdx < totalSteps - 1
                          ? 'Шагать вперёд'
                          : nextNode
                            ? `Дальше ➔ ${nextNode.titleRu.split('(')[0]!.trim()}`
                            : 'Конец пути'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Ползунок прокрутки шагов и ветки-разветвления */}
            <div className="border-t border-[#1c2e3f] bg-[#0e1822] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-[200px] flex-1 items-center gap-2.5">
                  <span className="font-mono text-[11px] text-[#7dd3fc]">
                    {formatSecClock(activeNode.startSec)}
                  </span>
                  <input
                    type="range"
                    aria-label="Шаг вдоль отрезка маршрута"
                    min={0}
                    max={Math.max(0, totalSteps - 1)}
                    value={stepIdx}
                    onChange={(e) => {
                      setIsAutoWalking(false);
                      setStepIdx(Number(e.target.value));
                    }}
                    className="h-1.5 flex-1 cursor-pointer accent-[#0ea5e9]"
                  />
                  <span className="font-mono text-[11px] text-[#7dd3fc]">
                    {formatSecClock(activeNode.endSec)}
                  </span>
                </div>

                {activeNode.branches && activeNode.branches.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-[#94a3b8]">Развилки:</span>
                    {activeNode.branches.map((br) => {
                      const target = getStreetViewNodeById(br.targetNodeId);
                      if (!target) return null;
                      return (
                        <button
                          key={br.targetNodeId}
                          type="button"
                          onClick={() => jumpToNode(target)}
                          className="cursor-pointer rounded-lg border border-[#0284c7]/60 bg-[#082032] px-2.5 py-1 text-[11px] font-semibold text-[#bae6fd] transition hover:bg-[#0284c7] hover:text-white"
                        >
                          ↱ {br.labelRu}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Правая колонка: Живая мини-карта «Где я сейчас» + Описание + Точки региона */}
          <aside className="flex flex-col gap-3 border-l border-[#1c2e3f] bg-[#0e1720] p-4 lg:col-span-4">
            {/* Мини-радар «Где я сейчас» с конусом направления взгляда */}
            <div className="overflow-hidden rounded-xl border border-[#2a4055] bg-[#131e2a]">
              <div className="flex items-center justify-between border-b border-[#1e2f40] px-3 py-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-bold text-[#ffd699] uppercase">
                  <MapIcon className="h-3.5 w-3.5 text-[#38bdf8]" />
                  Где я сейчас ({diffMeta.nameRu})
                </span>
                <span className="font-mono text-[11px] text-[#7dd3fc]">
                  X:{livePos.x}, Y:{livePos.y}
                </span>
              </div>

              <div className="relative aspect-square w-full bg-[#1a222b]">
                <svg viewBox="0 0 1000 1000" className="h-full w-full">
                  <image href={miniMapSvgUrl} x="-36" y="-36" width="1072" height="1206" />

                  {/* Голубые точки всех доступных узлов Street View региона */}
                  {regionalNodes.map((n) => {
                    const isCurrent = n.id === activeNode.id;
                    return (
                      <g
                        key={n.id}
                        transform={`translate(${n.x}, ${1000 - n.y})`}
                        onClick={() => jumpToNode(n)}
                        className="cursor-pointer"
                      >
                        <circle
                          r={isCurrent ? 18 : 13}
                          fill={isCurrent ? '#38bdf8' : '#0284c7'}
                          stroke="#ffffff"
                          strokeWidth={isCurrent ? 4 : 2.5}
                          opacity={isCurrent ? 1 : 0.86}
                        />
                      </g>
                    );
                  })}

                  {/* Живой курсор выжившего (Pegman) + Конус обзора (FOV) */}
                  <g transform={`translate(${livePos.x}, ${1000 - livePos.y})`}>
                    <g transform={`rotate(${liveHeading})`}>
                      <path
                        d="M 0 0 L -52 -115 A 126 126 0 0 1 52 -115 Z"
                        fill="rgba(56, 189, 248, 0.34)"
                        stroke="#7dd3fc"
                        strokeWidth="2"
                      />
                    </g>
                    <circle
                      r="22"
                      fill="#0ea5e9"
                      stroke="#ffffff"
                      strokeWidth="5"
                    />
                    <circle r="8" fill="#fef08a" />
                  </g>
                </svg>
              </div>
            </div>

            {/* Описание текущей точки и ссылка на видео */}
            <div className="rounded-xl border border-[#243648] bg-[#131e29] p-3">
              <div className="text-xs leading-relaxed text-[#d4dee8]">
                {activeNode.descriptionRu}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#1e2d3d] pt-2 text-[11px]">
                <span className="text-[#8ba1b5]">
                  Источник: <strong className="text-[#cbd5e1]">@leopardtrixgaming</strong>
                </span>
                <a
                  href={`https://www.youtube.com/watch?v=${activeNode.videoId}&t=${Math.floor(currentSec)}s`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[#38bdf8] hover:underline"
                >
                  Открыть на YouTube <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Быстрый перечень узлов прогулки в текущем регионе */}
            <div className="flex-1 overflow-hidden rounded-xl border border-[#243648] bg-[#131e29] p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-[#9cb0c2] uppercase">
                <span>Узлы прогулки в регионе ({regionalNodes.length})</span>
                <span className="inline-flex items-center gap-1 text-[#38bdf8]">
                  <Maximize2 className="h-3 w-3" /> Всего {allNodesCount} на Острове
                </span>
              </div>
              <ul className="max-h-40 space-y-1 overflow-y-auto pr-1 text-xs">
                {regionalNodes.map((n) => {
                  const active = n.id === activeNode.id;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => jumpToNode(n)}
                        className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-left transition ${
                          active
                            ? 'bg-[#0284c7] font-bold text-white'
                            : 'text-[#cbd5e1] hover:bg-[#1a2938]'
                        }`}
                      >
                        <span className="truncate">
                          <span className="mr-1.5 font-mono text-[10px] opacity-80">
                            [{formatGridSector(n.x, n.y)}]
                          </span>
                          {n.titleRu}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
