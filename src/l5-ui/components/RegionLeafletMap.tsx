import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  ArrowRight,
  Backpack,
  Camera,
  CheckCircle2,
  Circle,
  Compass,
  Download,
  ExternalLink,
  Filter,
  Footprints,
  Globe2,
  Layers,
  MapPinPlus,
  Mountain,
  Navigation,
  Pencil,
  RotateCcw,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import {
  DIFFICULTIES,
  DIFFICULTY_BY_ID,
  MAP_CANVAS_SIZE,
  MARKER_CATEGORIES,
} from '../../l0-primitives/constants.ts';
import { formatGridSector, formatWeightKg } from '../../l0-primitives/textUtils.ts';
import type {
  CustomCharcoalNote,
  CustomNoteIcon,
  MapMarkerModel,
} from '../../l0-primitives/types.ts';
import { buildFandomWikiUrl } from '../../l1-codecs/fandomCodec.ts';
import { deconflictLeafletMarkers } from '../../l2-models/deconflictCartography.ts';
import { leafletCoordsToWorldXZ } from '../../l2-models/data/fandomMapsManifest.ts';
import {
  computeRegionProgress,
  filterRegionMarkers,
  findStreetViewNodeForMarker,
  getAllRegions,
  getEffectiveLootLines,
  getFandomMapMeta,
  getRegionById,
  getRegionLeopardTrixGuides,
  getRegionStreetViewNodes,
  getWikiImageUrl,
  isLowLootDifficulty,
  resolveRegionCartography,
} from '../../l2-models/selectors.ts';
import { commandEngine } from '../../l3-commands/commandRegistry.ts';
import {
  buildRegionCharcoalMapDataUrl,
  MAP_SVG_LEAFLET_BOUNDS,
} from '../../l4-renderers/charcoalMapSvg.ts';
import {
  createCharcoalLeafletIcon,
  createCustomNoteLeafletIcon,
  createStreetViewNodeLeafletIcon,
} from '../../l4-renderers/charcoalMarkerIcons.ts';
import { executeCommand, useCommandState } from '../hooks/useCommandState.ts';
import { AtlasLegendPanel } from './AtlasLegendPanel.tsx';
import { WorldIslandMap } from './WorldIslandMap.tsx';

interface PendingNoteCoords {
  readonly x: number;
  readonly y: number;
  readonly worldX: number;
  readonly worldZ: number;
}

export function RegionLeafletMap() {
  const state = useCommandState();
  const allRegions = getAllRegions();
  const region = getRegionById(state.selectedRegionId);
  const fandomMeta = getFandomMapMeta(region.id);
  const regionImg = getWikiImageUrl(region.imageKey);
  const diffMeta = DIFFICULTY_BY_ID[state.difficulty];

  const [markerSearch, setMarkerSearch] = useState('');
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [hoverCoords, setHoverCoords] = useState<PendingNoteCoords | null>(null);
  const [clickedSpot, setClickedSpot] = useState<PendingNoteCoords | null>(null);
  const [pendingCoords, setPendingCoords] = useState<PendingNoteCoords | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteItemsSummary, setNoteItemsSummary] = useState('');
  const [noteWeightKg, setNoteWeightKg] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteIcon, setNoteIcon] = useState<CustomNoteIcon>('stash');
  const [importError, setImportError] = useState<string | null>(null);
  const [showPolaroid, setShowPolaroid] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const imageOverlayRef = useRef<L.ImageOverlay | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const cartography = useMemo(
    () => resolveRegionCartography(region.id, state.difficulty),
    [region.id, state.difficulty],
  );

  const enabledSet = useMemo(
    () => new Set(state.enabledCategories),
    [state.enabledCategories],
  );
  const visitedSet = useMemo(
    () => new Set(state.journal.visitedMarkerIds),
    [state.journal.visitedMarkerIds],
  );

  const visibleMarkers = useMemo(
    () =>
      filterRegionMarkers({
        regionId: region.id,
        difficulty: state.difficulty,
        enabledCategories: enabledSet,
        searchQuery: markerSearch,
      }),
    [region.id, state.difficulty, enabledSet, markerSearch],
  );

  const regionCustomNotes = useMemo(
    () => state.journal.customNotes.filter((n) => n.regionId === region.id),
    [state.journal.customNotes, region.id],
  );

  const streetViewNodes = useMemo(
    () => getRegionStreetViewNodes(region.id),
    [region.id],
  );

  const regionGuides = useMemo(
    () => getRegionLeopardTrixGuides(region.id),
    [region.id],
  );

  const deconflictedMarkers = useMemo(
    () => deconflictLeafletMarkers(visibleMarkers),
    [visibleMarkers],
  );

  const progress = useMemo(
    () => computeRegionProgress(region.id, state.difficulty, visitedSet),
    [region.id, state.difficulty, visitedSet],
  );

  const activeMarker: MapMarkerModel | undefined = useMemo(() => {
    const targetId = state.focusedMarkerId ?? selectedMarkerId;
    return (
      visibleMarkers.find((m) => m.id === targetId) ?? visibleMarkers[0]
    );
  }, [state.focusedMarkerId, selectedMarkerId, visibleMarkers]);

  // Инициализация Leaflet L.CRS.Simple в режиме региональной карты
  useEffect(() => {
    if (state.mapViewLevel !== 'region') return;
    const container = mapContainerRef.current;
    if (!container) return;

    const sheetH = fandomMeta?.sheetH ?? MAP_SVG_LEAFLET_BOUNDS[1][0];
    const sheetW = fandomMeta?.sheetW ?? MAP_SVG_LEAFLET_BOUNDS[1][1];
    const sheetBounds: L.LatLngBoundsExpression = [
      [0, 0],
      [sheetH, sheetW],
    ];

    const map = L.map(container, {
      crs: L.CRS.Simple,
      minZoom: -1.1,
      maxZoom: 3.2,
      zoomSnap: 0.25,
      maxBounds: [
        [-220, -220],
        [sheetH + 220, sheetW + 220],
      ],
      attributionControl: false,
    });

    map.fitBounds(sheetBounds);
    const layerGroup = L.layerGroup().addTo(map);

    leafletMapRef.current = map;
    markersLayerRef.current = layerGroup;

    return () => {
      map.remove();
      leafletMapRef.current = null;
      imageOverlayRef.current = null;
      markersLayerRef.current = null;
    };
  }, [state.mapViewLevel, region.id]);

  // Загрузка точной карты Fandom (в стилизации пергамент / полярное сияние)
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || state.mapViewLevel !== 'region') return;

    const themeClass =
      state.mapTheme === 'aurora'
        ? 'tld-fandom-sheet--aurora'
        : 'tld-fandom-sheet--charcoal';

    let overlayUrl: string;
    let sheetBounds: L.LatLngBoundsExpression;

    if (fandomMeta) {
      overlayUrl = fandomMeta.file;
      sheetBounds = [
        [0, 0],
        [fandomMeta.sheetH, fandomMeta.sheetW],
      ];
    } else {
      sheetBounds = [
        [MAP_SVG_LEAFLET_BOUNDS[0][0], MAP_SVG_LEAFLET_BOUNDS[0][1]],
        [MAP_SVG_LEAFLET_BOUNDS[1][0], MAP_SVG_LEAFLET_BOUNDS[1][1]],
      ];
      overlayUrl = buildRegionCharcoalMapDataUrl({
        region,
        theme: state.mapTheme,
        difficulty: state.difficulty,
        cartography,
        showMicroDetails: state.showMapMicroDetails,
        canvasLayers: state.canvasLayers,
        streetViewNodes,
      });
    }

    if (imageOverlayRef.current) {
      map.removeLayer(imageOverlayRef.current);
      imageOverlayRef.current = null;
    }

    const overlay = L.imageOverlay(overlayUrl, sheetBounds, {
      className: themeClass,
    }).addTo(map);
    imageOverlayRef.current = overlay;

    // Сброс локально выбранной точки при смене региона
    setClickedSpot(null);
    setPendingCoords(null);
    setEditingNoteId(null);
  }, [
    region,
    fandomMeta,
    state.mapTheme,
    state.difficulty,
    cartography,
    state.showMapMicroDetails,
    state.canvasLayers,
    streetViewNodes,
    state.mapViewLevel,
  ]);

  // Обработка клика и движения курсора по карте (включая выбор любой случайной точки для 3D / схрона)
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    const toCoords = (latlng: L.LatLng): PendingNoteCoords => {
      const sheetW = fandomMeta?.sheetW ?? MAP_CANVAS_SIZE;
      const sheetH = fandomMeta?.sheetH ?? MAP_CANVAS_SIZE;
      const lx = Math.max(0, Math.min(sheetW, Math.round(latlng.lng)));
      const ly = Math.max(0, Math.min(sheetH, Math.round(latlng.lat)));
      const world = fandomMeta
        ? leafletCoordsToWorldXZ(fandomMeta, latlng.lng, latlng.lat)
        : { worldX: lx, worldZ: ly };
      return { x: lx, y: ly, worldX: world.worldX, worldZ: world.worldZ };
    };

    const onMapClick = (e: L.LeafletMouseEvent) => {
      const coords = toCoords(e.latlng);
      setEditingNoteId(null);
      if (commandEngine.getState().isDrawingCustomNote) {
        setClickedSpot(null);
        setPendingCoords(coords);
      } else {
        setPendingCoords(null);
        setClickedSpot(coords);
      }
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      setHoverCoords(toCoords(e.latlng));
    };

    const onMouseOut = () => setHoverCoords(null);

    map.on('click', onMapClick);
    map.on('mousemove', onMouseMove);
    map.on('mouseout', onMouseOut);
    return () => {
      map.off('click', onMapClick);
      map.off('mousemove', onMouseMove);
      map.off('mouseout', onMouseOut);
    };
  }, [state.mapViewLevel, fandomMeta]);

  // Рендеринг выбранной случайной точки, пользовательских схронов/заметок, узлов Street View и (по желанию) справочных пинов поверх атласа Fandom
  useEffect(() => {
    const map = leafletMapRef.current;
    const group = markersLayerRef.current;
    if (!map || !group || state.mapViewLevel !== 'region') return;

    group.clearLayers();

    if (state.showWikiOverlayMarkers) {
      for (const item of deconflictedMarkers) {
        const { marker, displayX, displayY, isShifted, suppressLabelPill } = item;
        const isVisited = visitedSet.has(marker.id);
        const isFocused = activeMarker?.id === marker.id;
        const sector = formatGridSector(marker.x, marker.y);

        if (marker.dangerRadius && marker.dangerRadius > 0) {
          L.circle([marker.y, marker.x], {
            radius: marker.dangerRadius,
            color: '#ef4444',
            weight: 1.5,
            dashArray: '5 5',
            fillColor: '#ef4444',
            fillOpacity: 0.09,
            interactive: false,
          }).addTo(group);
        }

        if (isShifted) {
          L.polyline(
            [
              [marker.y, marker.x],
              [displayY, displayX],
            ],
            {
              color: '#f59e0b',
              weight: 1.4,
              dashArray: '3 3',
              opacity: 0.8,
              interactive: false,
            },
          ).addTo(group);
        }

        const leafletMarker = L.marker([displayY, displayX], {
          zIndexOffset: isFocused ? 1000 : 0,
          icon: createCharcoalLeafletIcon({
            category: marker.category,
            isVisited,
            isFocused,
            labelRu: marker.nameRu,
            showLabel: state.showMarkerLabels && !suppressLabelPill,
          }),
        });

        leafletMarker.bindTooltip(
          `<div style="font-weight:700;font-size:12px;">[${sector}] ${marker.nameRu}${isVisited ? ' ✓' : ''}</div>` +
            (marker.landmarkHintRu
              ? `<div style="font-size:11px;color:#cbd5e1;max-width:240px;white-space:normal;margin-top:2px;">🧭 ${marker.landmarkHintRu}</div>`
              : ''),
          { direction: 'top', offset: [0, -16] },
        );

        leafletMarker.on('click', () => {
          setSelectedMarkerId(marker.id);
          executeCommand('map.focusMarker', { markerId: marker.id });
        });

        leafletMarker.addTo(group);

        if (state.focusedMarkerId === marker.id) {
          map.flyTo([displayY, displayX], Math.max(map.getZoom(), 0.6), {
            duration: 0.45,
          });
        }
      }
    }

    // Узлы интерактивной прогулки LeopardTriX Street View
    if (state.canvasLayers.streetViewRoutes) {
      for (const sv of streetViewNodes) {
        const isActiveSv = state.activeStreetViewNodeId === sv.id;
        const svMarker = L.marker([sv.y, sv.x], {
          zIndexOffset: isActiveSv ? 1200 : 400,
          icon: createStreetViewNodeLeafletIcon({
            isActive: isActiveSv,
            headingDeg: sv.headingDeg,
          }),
        });

        svMarker.bindTooltip(
          `<div style="font-weight:700;font-size:12px;color:#7dd3fc;">🚶 Street View: ${sv.titleRu}</div>` +
            `<div style="font-size:11px;color:#cbd5e1;margin-top:2px;">Кликните для просмотра маршрута по кадрам видео</div>`,
          { direction: 'top', offset: [0, -12] },
        );

        svMarker.on('click', () => {
          executeCommand('streetview.openNode', {
            nodeId: sv.id,
            regionId: sv.regionId,
          });
        });

        svMarker.addTo(group);
      }
    }

    // Пользовательские заметки и схроны выжившего
    for (const custom of regionCustomNotes) {
      const world = fandomMeta
        ? leafletCoordsToWorldXZ(fandomMeta, custom.x, custom.y)
        : { worldX: custom.x, worldZ: custom.y };
      const noteMarker = L.marker([custom.y, custom.x], {
        zIndexOffset: 900,
        icon: createCustomNoteLeafletIcon(custom.icon, {
          title: custom.title,
          weightKg: custom.weightKg,
        }),
      });
      const stashBlock = custom.itemsSummary
        ? `<div style="margin-top:4px;padding:4px 6px;border-radius:5px;background:#16110a;border:1px solid #594122;font-size:11px;color:#fde68a;">🎒 ${custom.itemsSummary}${custom.weightKg ? ` <strong>(${formatWeightKg(custom.weightKg)})</strong>` : ''}</div>`
        : custom.weightKg
          ? `<div style="margin-top:4px;font-size:11px;color:#fde68a;">⚖️ Оставлено: ${formatWeightKg(custom.weightKg)}</div>`
          : '';
      noteMarker.bindPopup(
        `<div style="min-width:190px;">
          <div style="font-weight:700;color:#ffd699;margin-bottom:4px;">📌 ${custom.title}</div>
          <div style="font-size:12px;color:#cbd5e1;">${custom.note || 'Метка выжившего'}</div>
          ${stashBlock}
          <div style="font-size:10px;color:#788b9c;margin-top:6px;">Координаты игры: X ${world.worldX}м, Z ${world.worldZ}м</div>
        </div>`,
      );
      noteMarker.addTo(group);
    }

    // Прицел кликнутой случайной точки (для 3D / новой заметки)
    if (clickedSpot) {
      L.circleMarker([clickedSpot.y, clickedSpot.x], {
        radius: 9,
        color: '#f97316',
        weight: 2.5,
        fillColor: '#fb923c',
        fillOpacity: 0.3,
        interactive: false,
      }).addTo(group);
    }
  }, [
    deconflictedMarkers,
    streetViewNodes,
    state.showWikiOverlayMarkers,
    state.canvasLayers.streetViewRoutes,
    state.activeStreetViewNodeId,
    regionCustomNotes,
    clickedSpot,
    fandomMeta,
    visitedSet,
    activeMarker?.id,
    state.focusedMarkerId,
    state.mapViewLevel,
    state.showMarkerLabels,
  ]);

  const resetNoteForm = () => {
    setPendingCoords(null);
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteItemsSummary('');
    setNoteWeightKg('');
    setNoteBody('');
    setNoteIcon('stash');
  };

  const startEditingNote = (n: CustomCharcoalNote) => {
    const world = fandomMeta
      ? leafletCoordsToWorldXZ(fandomMeta, n.x, n.y)
      : { worldX: n.x, worldZ: n.y };
    setClickedSpot(null);
    setEditingNoteId(n.id);
    setPendingCoords({ x: n.x, y: n.y, worldX: world.worldX, worldZ: world.worldZ });
    setNoteTitle(n.title);
    setNoteItemsSummary(n.itemsSummary ?? '');
    setNoteWeightKg(n.weightKg ? String(n.weightKg) : '');
    setNoteBody(n.note);
    setNoteIcon(n.icon);
  };

  const handleSaveCustomNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingCoords) return;
    const parsedWeight = Number(noteWeightKg.replace(',', '.'));
    const weightKg = Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : undefined;

    if (editingNoteId) {
      executeCommand('survivor.updateCustomNote', {
        noteId: editingNoteId,
        title: noteTitle || 'Схрон выжившего',
        note: noteBody,
        icon: noteIcon,
        itemsSummary: noteItemsSummary,
        weightKg,
      });
    } else {
      executeCommand('survivor.addCustomNote', {
        regionId: region.id,
        x: pendingCoords.x,
        y: pendingCoords.y,
        title: noteTitle || 'Схрон выжившего',
        note: noteBody,
        icon: noteIcon,
        itemsSummary: noteItemsSummary,
        weightKg,
      });
    }
    resetNoteForm();
  };

  const handleExportJournal = () => {
    const json = commandEngine.exportJournalJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tld-survivor-journal-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJournalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        executeCommand('survivor.importJournal', { json: String(reader.result ?? '') });
        setImportError(null);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Ошибка чтения JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-6">
      {/* Верхняя панель управления картографией и сложностью */}
      <div className="mb-5 rounded-xl border border-[#2a3b4c] bg-[#111a22] p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Переключение: Весь Остров vs Детальная карта региона */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => executeCommand('map.setViewLevel', { level: 'world' })}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition sm:text-sm ${
                state.mapViewLevel === 'world'
                  ? 'bg-[#d97724] text-[#0b1116]'
                  : 'border border-[#2b3c4e] bg-[#16222d] text-[#cbd5e1] hover:border-[#d97724]/50'
              }`}
            >
              <Globe2 className="h-4 w-4" />
              Весь Остров ({allRegions.length} регионов)
            </button>

            <button
              type="button"
              onClick={() => executeCommand('map.setViewLevel', { level: 'region' })}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition sm:text-sm ${
                state.mapViewLevel === 'region'
                  ? 'bg-[#d97724] text-[#0b1116]'
                  : 'border border-[#2b3c4e] bg-[#16222d] text-[#cbd5e1] hover:border-[#d97724]/50'
              }`}
            >
              📜 Детальная угольная карта
            </button>

            {state.mapViewLevel === 'region' && (
              <select
                aria-label="Выбор региона на карте"
                value={region.id}
                onChange={(e) => {
                  setSelectedMarkerId(null);
                  executeCommand('map.selectRegion', {
                    regionId: e.target.value,
                    openRegionMap: true,
                  });
                }}
                className="rounded-lg border border-[#34495e] bg-[#0c1319] px-3 py-2 text-xs font-semibold text-[#f3efe6] focus:border-[#f09a3e] focus:outline-none sm:text-sm"
              >
                {allRegions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nameRu} ({r.nameEn}){r.isDlc ? ' [DLC]' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Переключатели прогулки Street View, деталей полотна, подписей и стиля */}
          <div className="flex flex-wrap items-center gap-2">
            {state.mapViewLevel === 'region' && (
              <>
                {streetViewNodes.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      executeCommand('streetview.openNode', {
                        nodeId: streetViewNodes[0]!.id,
                        regionId: region.id,
                      })
                    }
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#0284c7] px-3.5 py-2 text-xs font-bold text-white shadow transition hover:bg-[#0ea5e9]"
                  >
                    <Footprints className="h-3.5 w-3.5" />
                    Street View прогулка ({streetViewNodes.length})
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => executeCommand('map.toggleWikiOverlayMarkers', {})}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    state.showWikiOverlayMarkers
                      ? 'border-emerald-500/50 bg-emerald-950/35 text-emerald-200'
                      : 'border-[#32465a] bg-[#16222d] text-[#9eb2c4]'
                  }`}
                  title="Иконки самой карты Fandom всегда сохраняются; здесь можно включить или скрыть дополнительные интерактивные пины справки поверх"
                >
                  <Layers className="h-3.5 w-3.5 text-emerald-400" />
                  Справ. пины поверх: {state.showWikiOverlayMarkers ? 'Вкл' : 'Чистый атлас'}
                </button>

                {state.showWikiOverlayMarkers && (
                  <button
                    type="button"
                    onClick={() => executeCommand('map.toggleMarkerLabels', {})}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      state.showMarkerLabels
                        ? 'border-[#d97724]/60 bg-[#d97724]/15 text-[#ffd699]'
                        : 'border-[#32465a] bg-[#16222d] text-[#9eb2c4]'
                    }`}
                  >
                    <Tag className="h-3.5 w-3.5 text-[#f09a3e]" />
                    Подписи: {state.showMarkerLabels ? 'Вкл' : 'Скрыты'}
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() =>
                executeCommand('map.setTheme', {
                  theme: state.mapTheme === 'charcoal' ? 'aurora' : 'charcoal',
                })
              }
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#32465a] bg-[#16222d] px-3 py-2 text-xs font-medium text-[#e4dfd5] transition hover:border-[#6cb4cc]"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#6cb4cc]" />
              Стиль:{' '}
              <strong className="text-[#ffd699]">
                {state.mapTheme === 'charcoal'
                  ? 'Уголь на пергаменте'
                  : 'Полярное сияние'}
              </strong>
            </button>
          </div>
        </div>

        {/* Переключатель уровня сложности с живой сводкой построек, тросов, троп и лута */}
        <div className="mt-4 border-t border-[#1e2c3a] pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-semibold text-[#8fa3b5] uppercase">
                Сложность спавна:
              </span>
              {DIFFICULTIES.map((d) => {
                const active = state.difficulty === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() =>
                      executeCommand('map.setDifficulty', { difficulty: d.id })
                    }
                    className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs font-semibold transition ${
                      active
                        ? 'text-[#0b1116] shadow-sm'
                        : 'border-[#283848] bg-[#0d151c] text-[#a5b7c6] hover:text-white'
                    }`}
                    style={
                      active
                        ? {
                            backgroundColor: d.badgeColor,
                            borderColor: d.badgeColor,
                          }
                        : undefined
                    }
                  >
                    {d.nameRu}
                  </button>
                );
              })}
            </div>

            {state.mapViewLevel === 'region' ? (
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded border border-[#2a3c4f] bg-[#0c141c] px-2 py-0.5 text-[#e4dfd5]">
                  🏠 Целых построек: <strong className="text-emerald-300">{cartography.intactCount}</strong>
                </span>
                <span className="rounded border border-[#2a3c4f] bg-[#0c141c] px-2 py-0.5 text-[#e4dfd5]">
                  🏚️ Сгорело / руин: <strong className="text-rose-300">{cartography.halfOrRuinedCount}</strong>
                </span>
                <span className="rounded border border-[#2a3c4f] bg-[#0c141c] px-2 py-0.5 text-[#e4dfd5]">
                  🪢 Тросы: <strong className="text-amber-300">{cartography.deployedRopesCount}/{cartography.totalRopesCount}</strong>
                </span>
                {isLowLootDifficulty(state.difficulty) ? (
                  <span className="rounded border border-rose-500/40 bg-rose-950/40 px-2 py-0.5 text-rose-200">
                    🔥 Путь ковки + спавн ★ молота/лупы (огнестрел снят)
                  </span>
                ) : (
                  <span className="rounded border border-sky-500/35 bg-sky-950/35 px-2 py-0.5 text-sky-200">
                    🎯 Ружья, револьверы и бункеры на полотне
                  </span>
                )}
              </div>
            ) : (
              <div className="text-xs text-[#9cb0c2]">
                {isLowLootDifficulty(state.difficulty) ? (
                  <span className="text-rose-300">
                    ⚠️ Ружья/револьверы скрыты; показаны таблицы спичек, молота, лупы и угля!
                  </span>
                ) : (
                  <span>
                    ✓ Огнестрельное оружие, бункеры выживальщиков и полный пул лута активны
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Уровень 1: Карта всего Острова Великого Медведя */}
      {state.mapViewLevel === 'world' ? (
        <WorldIslandMap />
      ) : (
        /* Уровень 2: Интерактивная угольная карта региона (Leaflet) */
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Левая колонка: Фильтры категорий и Дневник выжившего */}
          <aside className="space-y-4 lg:col-span-3">
            {/* Прогресс исследования региона */}
            <div className="rounded-xl border border-[#2a3b4c] bg-[#121b24] p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold tracking-wider text-[#9db0c0] uppercase">
                  Чек-лист региона
                </span>
                <span className="font-mono font-bold text-[#3dd68c]">
                  {progress.visitedCount}/{progress.totalMarkers} ({progress.percentage}%)
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#0b1116]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#d97724] to-[#3dd68c] transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  executeCommand('map.setDrawingNoteMode', {
                    active: !state.isDrawingCustomNote,
                  })
                }
                className={`mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  state.isDrawingCustomNote
                    ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                    : 'border-[#314559] bg-[#17232f] text-[#e4dfd5] hover:border-[#d97724]'
                }`}
              >
                <MapPinPlus className="h-4 w-4 text-[#f09a3e]" />
                {state.isDrawingCustomNote
                  ? 'Кликните на карту для метки (Отмена)'
                  : 'Нанести свою метку углём'}
              </button>
            </div>

            {/* Фильтры маркеров */}
            <div className="rounded-xl border border-[#2a3b4c] bg-[#121b24] p-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-[#9db0c0] uppercase">
                  <Filter className="h-3.5 w-3.5 text-[#d97724]" />
                  Фильтры меток
                </h3>
                <div className="flex gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() =>
                      executeCommand('map.setAllCategories', { enabled: true })
                    }
                    className="cursor-pointer text-[#6cb4cc] hover:underline"
                  >
                    Все
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      executeCommand('map.setAllCategories', { enabled: false })
                    }
                    className="cursor-pointer text-[#8fa3b5] hover:underline"
                  >
                    Скрыть
                  </button>
                </div>
              </div>

              <input
                type="search"
                value={markerSearch}
                onChange={(e) => setMarkerSearch(e.target.value)}
                placeholder="Поиск (ружьё, бункер, ЛЭП, медведь)..."
                aria-label="Поиск маркеров на текущей карте"
                className="mt-2.5 w-full rounded-md border border-[#2a3b4c] bg-[#0b1116] px-2.5 py-1.5 text-xs text-[#e4dfd5] placeholder-[#687d90] focus:border-[#d97724] focus:outline-none"
              />

              <div className="mt-3 space-y-1.5">
                {MARKER_CATEGORIES.map((cat) => {
                  const checked = enabledSet.has(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() =>
                        executeCommand('map.toggleCategory', { category: cat.id })
                      }
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-xs transition ${
                        checked
                          ? 'border-[#33485c] bg-[#182532] text-[#f1ede4]'
                          : 'border-transparent bg-[#0d151d] text-[#687d90] opacity-65'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: cat.colorHex }}
                        />
                        {cat.labelRu}
                      </span>
                      <span className="text-[11px]">{checked ? 'Вкл' : 'Скр'}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2.5 text-[11px] text-[#7c91a4]">
                🔴 Пунктирные красные круги показывают зоны патрулирования медведей, лосей, стай и волков.
              </p>
            </div>

            {/* Пользовательские заметки / схроны лута и Бэкап дневника */}
            <div className="rounded-xl border border-[#2a3b4c] bg-[#121b24] p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-[#9db0c0] uppercase">
                  <Backpack className="h-3.5 w-3.5 text-amber-400" />
                  Заметки и схроны ({regionCustomNotes.length})
                </h3>
                {regionCustomNotes.some((n) => (n.weightKg ?? 0) > 0) && (
                  <span className="rounded bg-amber-950/60 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                    {formatWeightKg(
                      regionCustomNotes.reduce((acc, n) => acc + (n.weightKg ?? 0), 0),
                    )}
                  </span>
                )}
              </div>
              {regionCustomNotes.length === 0 ? (
                <p className="mt-2 text-xs text-[#778c9e]">
                  Кликните в любую точку карты — сможете оставить там схрон с лишним лутом (кг, список предметов) или осмотреть место в 3D.
                </p>
              ) : (
                <ul className="mt-2.5 max-h-56 space-y-2 overflow-y-auto text-xs">
                  {regionCustomNotes.map((n) => {
                    const world = fandomMeta
                      ? leafletCoordsToWorldXZ(fandomMeta, n.x, n.y)
                      : { worldX: n.x, worldZ: n.y };
                    return (
                      <li
                        key={n.id}
                        className="rounded-lg border border-[#263646] bg-[#0d151c] p-2.5"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              leafletMapRef.current?.flyTo([n.y, n.x], 1.2, { duration: 0.4 });
                            }}
                            className="min-w-0 cursor-pointer text-left font-semibold text-[#ffd699] hover:underline"
                          >
                            {n.title}
                          </button>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                executeCommand('terrain3d.openPoint', {
                                  regionId: region.id,
                                  leafletX: n.x,
                                  leafletY: n.y,
                                  worldX: world.worldX,
                                  worldZ: world.worldZ,
                                })
                              }
                              className="cursor-pointer rounded bg-[#152432] p-1 text-sky-300 hover:bg-sky-900/50"
                              title="Посмотреть это место в 3D"
                            >
                              <Mountain className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => startEditingNote(n)}
                              className="cursor-pointer rounded bg-[#18222d] p-1 text-amber-300 hover:bg-[#243242]"
                              title="Изменить список лута / заметку"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                executeCommand('survivor.removeCustomNote', { noteId: n.id })
                              }
                              className="cursor-pointer rounded bg-[#231519] p-1 text-rose-400 hover:bg-rose-950/60"
                              title="Удалить заметку"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        {n.itemsSummary && (
                          <div className="mt-1 text-[11px] text-[#e8d5b5]">
                            🎒 {n.itemsSummary}
                            {n.weightKg ? (
                              <strong className="ml-1 text-amber-300">
                                ({formatWeightKg(n.weightKg)})
                              </strong>
                            ) : null}
                          </div>
                        )}
                        {n.note && (
                          <div className="mt-0.5 text-[11px] text-[#8fa3b5]">{n.note}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#202e3c] pt-3">
                <button
                  type="button"
                  onClick={handleExportJournal}
                  className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded border border-[#2c3f52] bg-[#16222d] px-2 py-1.5 text-[11px] text-[#cbd5e1] hover:border-[#6cb4cc]"
                >
                  <Download className="h-3 w-3" /> Экспорт
                </button>
                <label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded border border-[#2c3f52] bg-[#16222d] px-2 py-1.5 text-[11px] text-[#cbd5e1] hover:border-[#6cb4cc]">
                  <Upload className="h-3 w-3" /> Импорт
                  <input
                    type="file"
                    accept="application/json"
                    onChange={handleImportJournalFile}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => executeCommand('survivor.resetJournal', {})}
                  className="inline-flex cursor-pointer items-center justify-center rounded border border-[#2c3f52] bg-[#16222d] px-2 py-1.5 text-[11px] text-rose-300 hover:border-rose-500/50"
                  title="Сбросить все отметки прогресса"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
              {importError && (
                <p className="mt-2 text-[11px] text-rose-400">{importError}</p>
              )}
            </div>
          </aside>

          {/* Центр: Холст интерактивной карты Leaflet + Памятка навигации по региону */}
          <div className="space-y-4 lg:col-span-6">
            <div className="relative overflow-hidden rounded-xl border-2 border-[#354656] bg-[#10171d] shadow-2xl">
              {state.isDrawingCustomNote && (
                <div className="absolute top-3 left-1/2 z-[500] -translate-x-1/2 rounded-full border border-amber-400/80 bg-[#1e160d]/95 px-4 py-1.5 text-xs font-semibold text-amber-200 shadow-lg">
                  ✏️ Кликните в любую точку карты, чтобы поставить метку / схрон
                </div>
              )}

              {clickedSpot && !pendingCoords && !state.isDrawingCustomNote && (
                <div className="absolute top-3 left-1/2 z-[500] flex max-w-[95%] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-xl border border-amber-400/75 bg-[#0e161ee8] px-3 py-2 text-xs shadow-2xl backdrop-blur">
                  <span className="font-mono font-bold text-[#ffd699]">
                    📍 X:{clickedSpot.worldX} Z:{clickedSpot.worldZ}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      executeCommand('terrain3d.openPoint', {
                        regionId: region.id,
                        leafletX: clickedSpot.x,
                        leafletY: clickedSpot.y,
                        worldX: clickedSpot.worldX,
                        worldZ: clickedSpot.worldZ,
                      })
                    }
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-[#0284c7] px-2.5 py-1 font-bold text-white hover:bg-[#0ea5e9]"
                  >
                    <Mountain className="h-3.5 w-3.5" /> Воссоздать в 3D
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingCoords(clickedSpot);
                      setClickedSpot(null);
                      setEditingNoteId(null);
                      setNoteTitle('');
                      setNoteItemsSummary('');
                      setNoteWeightKg('');
                      setNoteBody('');
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-[#d97724] px-2.5 py-1 font-bold text-[#0b1116] hover:bg-[#f09a3e]"
                  >
                    <Backpack className="h-3.5 w-3.5" /> Оставить схрон
                  </button>
                  <button
                    type="button"
                    onClick={() => setClickedSpot(null)}
                    className="cursor-pointer rounded px-1.5 py-0.5 text-[#9cb0c2] hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Живой индикатор мировых координат игры под курсором */}
              <div className="pointer-events-none absolute bottom-3 left-3 z-[450] rounded-md border border-[#33485c] bg-[#0b1219]/92 px-2.5 py-1 font-mono text-[11px] text-[#e4dfd5] shadow">
                {hoverCoords ? (
                  <>
                    Координаты игры:{' '}
                    <strong className="text-[#ffd699]">
                      X {hoverCoords.worldX}м, Z {hoverCoords.worldZ}м
                    </strong>{' '}
                    <span className="text-[#8ea3b5]">• Кликните для 3D или заметки</span>
                  </>
                ) : (
                  <span className="text-[#9cb0c2]">
                    Клик в любую точку карты: 3D-вид местности по файлам игры или схрон лута
                  </span>
                )}
              </div>

              {/* Приклеенный скотчем снимок Polaroid региона (в стиле атласа выжившего) */}
              {regionImg && (
                <div className="absolute right-3 bottom-12 z-[450] hidden sm:block">
                  {showPolaroid ? (
                    <div className="relative w-40 -rotate-2 rounded-sm border border-[#7c6a53] bg-[#efe5cf] p-1.5 pb-2 shadow-2xl transition hover:rotate-0">
                      {/* Полоска малярного скотча сверху */}
                      <div className="pointer-events-none absolute -top-2 left-1/2 h-3.5 w-14 -translate-x-1/2 rotate-2 rounded-[1px] border border-[#b59257]/60 bg-[#dfc184]/85 shadow-sm" />
                      <button
                        type="button"
                        onClick={() => setShowPolaroid(false)}
                        title="Свернуть снимок"
                        className="absolute top-2 right-2 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-black/65 text-white hover:bg-black"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <img
                        src={regionImg}
                        alt={region.nameRu}
                        className="h-24 w-full rounded-[1px] border border-[#8c7a64] object-cover contrast-105 sepia-[.18]"
                      />
                      <div className="mt-1 truncate text-center font-tld-display text-[10px] font-bold tracking-wide text-[#2a2118] uppercase">
                        {region.nameRu}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowPolaroid(true)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#3a4f63] bg-[#0b1219]/90 px-2.5 py-1 text-[11px] font-semibold text-[#ffd699] shadow hover:border-[#d97724]"
                    >
                      <Camera className="h-3.5 w-3.5 text-[#f09a3e]" />
                      Снимок
                    </button>
                  )}
                </div>
              )}

              <div
                ref={mapContainerRef}
                className={`h-[600px] w-full sm:h-[720px] ${
                  state.isDrawingCustomNote ? 'cursor-crosshair' : ''
                }`}
              />
            </div>

            {/* Быстрая панель действий при клике в любую случайную точку карты */}
            {clickedSpot && !pendingCoords && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/60 bg-[#15202b] p-3.5 shadow-xl">
                <div>
                  <div className="text-xs font-bold text-[#ffd699] uppercase">
                    📍 Выбрана точка на карте • Координаты X: {clickedSpot.worldX}м, Z: {clickedSpot.worldZ}м
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#9bb0c2]">
                    Воссоздайте 3D-местность вокруг этой точки (рельеф и постройки из игры) или отметьте свой схрон:
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      executeCommand('terrain3d.openPoint', {
                        regionId: region.id,
                        leafletX: clickedSpot.x,
                        leafletY: clickedSpot.y,
                        worldX: clickedSpot.worldX,
                        worldZ: clickedSpot.worldZ,
                      })
                    }
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#0284c7] px-3.5 py-2 text-xs font-bold text-white shadow transition hover:bg-[#0ea5e9]"
                  >
                    <Mountain className="h-4 w-4" />
                    Воссоздать место в 3D
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingCoords(clickedSpot);
                      setClickedSpot(null);
                      setEditingNoteId(null);
                      setNoteTitle('');
                      setNoteItemsSummary('');
                      setNoteWeightKg('');
                      setNoteBody('');
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#d97724] px-3.5 py-2 text-xs font-bold text-[#0b1116] shadow transition hover:bg-[#f09a3e]"
                  >
                    <Backpack className="h-4 w-4" />
                    Я здесь / Оставить схрон лута
                  </button>
                  <button
                    type="button"
                    onClick={() => setClickedSpot(null)}
                    className="cursor-pointer rounded-lg border border-[#304355] px-2.5 py-2 text-xs text-[#9cb0c2] hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Модальная форма добавления/редактирования заметки и схрона лута */}
            {pendingCoords && (
              <form
                onSubmit={handleSaveCustomNote}
                className="rounded-xl border border-[#d97724] bg-[#162029] p-4 shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-tld-display text-sm font-bold text-[#ffd699] uppercase">
                    {editingNoteId ? 'Редактировать заметку / схрон' : 'Новый схрон / метка на карте'} • X:{pendingCoords.worldX}м, Z:{pendingCoords.worldZ}м
                  </h4>
                  <button
                    type="button"
                    onClick={resetNoteForm}
                    className="cursor-pointer text-xs text-[#8ea3b5] hover:text-white"
                  >
                    Отмена
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input
                    type="text"
                    required
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Название (напр. Схрон у камня / Я тут)"
                    className="rounded border border-[#314559] bg-[#0c1319] px-3 py-1.5 text-xs text-white sm:col-span-2"
                  />
                  <select
                    value={noteIcon}
                    onChange={(e) => setNoteIcon(e.target.value as CustomNoteIcon)}
                    className="rounded border border-[#314559] bg-[#0c1319] px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="stash">🎒 Схрон лута / Место выгрузки</option>
                    <option value="arrow">📍 Я сейчас здесь</option>
                    <option value="camp">🔥 Временный лагерь / Костёр</option>
                    <option value="danger">⚠️ Опасность / Волк / Медведь</option>
                  </select>
                </div>

                <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <input
                    type="text"
                    value={noteItemsSummary}
                    onChange={(e) => setNoteItemsSummary(e.target.value)}
                    placeholder="Что оставил (напр. 12 кг оленины, 4 л воды, топор, уголь)..."
                    className="rounded border border-[#314559] bg-[#0c1319] px-3 py-1.5 text-xs text-white sm:col-span-3"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={noteWeightKg}
                    onChange={(e) => setNoteWeightKg(e.target.value)}
                    placeholder="Вес (кг), напр. 18.5"
                    className="rounded border border-[#314559] bg-[#0c1319] px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <input
                  type="text"
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Дополнительная заметка (под какой елью, забирать по пути назад)..."
                  className="mt-2.5 w-full rounded border border-[#314559] bg-[#0c1319] px-3 py-1.5 text-xs text-white"
                />
                <div className="mt-3 flex flex-wrap justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      executeCommand('terrain3d.openPoint', {
                        regionId: region.id,
                        leafletX: pendingCoords.x,
                        leafletY: pendingCoords.y,
                        worldX: pendingCoords.worldX,
                        worldZ: pendingCoords.worldZ,
                      })
                    }
                    className="inline-flex cursor-pointer items-center gap-1 rounded border border-sky-500/40 bg-sky-950/35 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-900/45"
                  >
                    <Mountain className="h-3.5 w-3.5" /> Проверить это место в 3D
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer rounded-md bg-[#d97724] px-4 py-1.5 text-xs font-bold text-[#0b1116] hover:bg-[#f09a3e]"
                  >
                    {editingNoteId ? 'Обновить заметку' : 'Сохранить на карту'}
                  </button>
                </div>
              </form>
            )}

            {/* Полная интерактивная легенда (48 условных знаков + выключатели 5 слоёв полотна) */}
            <AtlasLegendPanel />

            {/* Штурманская карточка ориентирования по региону + реальное фото локации */}
            <div className="overflow-hidden rounded-xl border border-[#2a3b4c] bg-[#121b24] shadow-lg">
              <div className="grid grid-cols-1 sm:grid-cols-12">
                {regionImg && (
                  <div className="sm:col-span-4">
                    <img
                      src={regionImg}
                      alt={region.nameRu}
                      loading="lazy"
                      className="h-44 w-full object-cover sm:h-full"
                    />
                  </div>
                )}
                <div className={`p-4 ${regionImg ? 'sm:col-span-8' : 'sm:col-span-12'}`}>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#ffd699] uppercase">
                    <Compass className="h-4 w-4 text-[#f09a3e]" />
                    Как ориентироваться в регионе «{region.nameRu}»
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#d1dbe4]">
                    {region.navigationGuideRu}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {region.connections.map((conn) => {
                      const target = getRegionById(conn.targetRegionId);
                      return (
                        <button
                          key={conn.targetRegionId}
                          type="button"
                          onClick={() => {
                            setSelectedMarkerId(null);
                            executeCommand('map.selectRegion', {
                              regionId: target.id,
                              openRegionMap: true,
                            });
                          }}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#2d4053] bg-[#0c141c] px-2.5 py-1 text-[11px] font-semibold text-[#cbd5e1] transition hover:border-[#d97724] hover:text-[#ffd699]"
                          title={conn.viaRu}
                        >
                          <ArrowRight className="h-3 w-3 text-[#f09a3e]" />
                          В «{target.nameRu}»
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Разобранные видео-гайды и маршруты @leopardtrixgaming по текущему региону */}
            {regionGuides.length > 0 && (
              <div className="rounded-xl border border-[#263a4e] bg-[#101922] p-4 shadow-lg">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#7dd3fc] uppercase">
                    <Video className="h-4 w-4 text-[#0ea5e9]" />
                    Разобранные гайды @leopardtrixgaming для «{region.nameRu}» ({regionGuides.length})
                  </div>
                  <span className="text-[11px] text-[#8ea3b5]">
                    База по 63 видео канала (переходы, бункеры, поляроиды, пума)
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {regionGuides.slice(0, 6).map((g) => (
                    <a
                      key={g.videoId}
                      href={`https://www.youtube.com/watch?v=${g.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start justify-between gap-2 rounded-lg border border-[#223446] bg-[#0b131b] p-2.5 text-left transition hover:border-[#38bdf8]"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-[#e2ebf3]">
                          {g.titleRu}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-[#8ea3b5]">
                          {g.summaryRu}
                        </p>
                      </div>
                      <span className="shrink-0 rounded bg-[#182736] px-1.5 py-0.5 font-mono text-[10px] text-[#7dd3fc]">
                        {g.durationLabel}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Правая колонка: Подробное досье выбранной локации + список всех точек региона */}
          <aside className="space-y-4 lg:col-span-3">
            {activeMarker ? (
              <div className="rounded-xl border border-[#d97724]/50 bg-[#131d26] p-4 shadow-xl">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-[#d97724]/20 px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#ffd699]">
                        Квадрат {formatGridSector(activeMarker.x, activeMarker.y)}
                      </span>
                      <span className="text-[11px] font-semibold text-[#f09a3e] uppercase">
                        {MARKER_CATEGORIES.find((c) => c.id === activeMarker.category)?.labelRu}
                      </span>
                    </div>
                    <h3 className="mt-1 font-tld-display text-lg font-bold text-[#f6f2e9]">
                      {activeMarker.nameRu}
                    </h3>
                    <p className="font-tld-journal text-sm italic text-[#8fa3b5]">
                      {activeMarker.nameEn}
                    </p>
                  </div>
                </div>

                {/* Подсказка как найти точку на местности */}
                {activeMarker.landmarkHintRu && (
                  <div className="mt-2.5 rounded-lg border border-sky-500/30 bg-sky-950/30 px-2.5 py-2 text-xs text-sky-100">
                    <span className="inline-flex items-center gap-1 font-semibold text-[#7dd3fc]">
                      <Navigation className="h-3 w-3" /> Ориентир:
                    </span>{' '}
                    {activeMarker.landmarkHintRu}
                  </div>
                )}

                {/* Теги удобств локации */}
                <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
                  {activeMarker.indoorWarmth && (
                    <span className="rounded bg-amber-950/60 px-2 py-0.5 text-amber-200">
                      🏠 Тёплое укрытие
                    </span>
                  )}
                  {activeMarker.hasBed && (
                    <span className="rounded bg-sky-950/60 px-2 py-0.5 text-sky-200">
                      🛏️ Кровать
                    </span>
                  )}
                  {activeMarker.hasStove && (
                    <span className="rounded bg-orange-950/60 px-2 py-0.5 text-orange-200">
                      🔥 Печь / Очаг
                    </span>
                  )}
                  {activeMarker.dangerRadius && (
                    <span className="rounded bg-rose-950/70 px-2 py-0.5 text-rose-200">
                      🐾 Зона хищника
                    </span>
                  )}
                </div>

                <p className="mt-3 text-xs leading-relaxed text-[#cbd5e1]">
                  {activeMarker.descriptionRu}
                </p>

                {/* Блок лута, зависящий от выбранной сложности */}
                <div className="mt-3.5 rounded-lg border border-[#243444] bg-[#0c131a] p-3">
                  <div className="text-[11px] font-semibold text-[#ffd699]">
                    Добыча для режима «{diffMeta.nameRu}»:
                  </div>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-[#d6e0ea]">
                    {getEffectiveLootLines(activeMarker, state.difficulty).map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    executeCommand('streetview.openNode', {
                      nodeId: findStreetViewNodeForMarker(region.id, activeMarker).id,
                      regionId: region.id,
                    })
                  }
                  className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0284c7] px-3 py-2 text-xs font-bold text-white shadow transition hover:bg-[#0ea5e9]"
                >
                  <Footprints className="h-4 w-4" />
                  Пройти в Street View (Как Google Maps)
                </button>

                <button
                  type="button"
                  onClick={() =>
                    executeCommand('survivor.toggleVisited', {
                      markerId: activeMarker.id,
                    })
                  }
                  className={`mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${
                    visitedSet.has(activeMarker.id)
                      ? 'border border-emerald-500/50 bg-emerald-950/50 text-emerald-300'
                      : 'bg-[#d97724] text-[#0b1116] hover:bg-[#f09a3e]'
                  }`}
                >
                  {visitedSet.has(activeMarker.id) ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Локация обследована (Снять отметку)
                    </>
                  ) : (
                    <>
                      <Circle className="h-4 w-4" />
                      Отметить как обследованную
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-[#2a3b4c] bg-[#121b24] p-4 text-xs text-[#8ea3b5]">
                Нет видимых маркеров с текущими фильтрами. Включите категории слева!
              </div>
            )}

            {/* Быстрый список локаций региона с координатами сетки */}
            <div className="rounded-xl border border-[#2a3b4c] bg-[#121b24] p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold tracking-wider text-[#9db0c0] uppercase">
                  Точки региона ({visibleMarkers.length})
                </h4>
                <a
                  href={buildFandomWikiUrl(region.fandomSlug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#6cb4cc] hover:underline"
                >
                  Fandom Wiki <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <ul className="mt-2.5 max-h-64 space-y-1 overflow-y-auto pr-1 text-xs">
                {visibleMarkers.map((m) => {
                  const done = visitedSet.has(m.id);
                  const current = activeMarker?.id === m.id;
                  const sector = formatGridSector(m.x, m.y);
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMarkerId(m.id);
                          executeCommand('map.focusMarker', { markerId: m.id });
                        }}
                        className={`flex w-full cursor-pointer items-center justify-between rounded px-2.5 py-1.5 text-left transition ${
                          current
                            ? 'bg-[#d97724]/25 text-[#ffd699]'
                            : 'text-[#cbd5e1] hover:bg-[#192633]'
                        }`}
                      >
                        <span className={`truncate ${done ? 'line-through opacity-65' : ''}`}>
                          <span className="mr-1.5 font-mono text-[10px] text-[#8ea3b5]">
                            [{sector}]
                          </span>
                          {m.nameRu}
                        </span>
                        {done && <span className="ml-1 text-emerald-400">✓</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
