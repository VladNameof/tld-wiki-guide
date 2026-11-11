import { MAP_CANVAS_SIZE } from '../l0-primitives/constants.ts';
import type {
  BuildingAmenityKind,
  MapBuildingFeature,
  MapMarkerModel,
  MapMicroSpawn,
  MapSubLocationLabel,
  RegionAreaLabel,
  RegionExitBanner,
} from '../l0-primitives/types.ts';

export interface SvgBoxRect {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface DeconflictedBuildingPlacement {
  readonly x: number;
  readonly y: number;
  readonly calloutOffsetX: number;
  readonly calloutOffsetY: number;
  readonly calloutBoxWidth: number;
}

export interface DeconflictedMicroSpawn extends MapMicroSpawn {
  readonly origX: number;
  readonly origY: number;
  readonly wasShifted: boolean;
}

export interface DeconflictedLabelPoint {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly style?: 'landmark' | 'water' | 'danger' | 'forest';
}

export interface DeconflictedLeafletMarker {
  readonly marker: MapMarkerModel;
  readonly displayX: number;
  readonly displayY: number;
  readonly isShifted: boolean;
  readonly suppressLabelPill: boolean;
}

function toSvgY(mapY: number): number {
  return MAP_CANVAS_SIZE - mapY;
}

function rectsOverlap(a: SvgBoxRect, b: SvgBoxRect, pad = 3): boolean {
  return !(
    a.x2 + pad < b.x1 ||
    a.x1 - pad > b.x2 ||
    a.y2 + pad < b.y1 ||
    a.y1 - pad > b.y2
  );
}

function overlapArea(a: SvgBoxRect, b: SvgBoxRect): number {
  const ox = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
  const oy = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  return ox * oy;
}

function buildReservedUiRects(exitBanners: readonly RegionExitBanner[]): SvgBoxRect[] {
  const reserved: SvgBoxRect[] = [
    // Компас (левый верх)
    { x1: 12, y1: 12, x2: 148, y2: 148 },
    // Штамп активного режима (правый верх)
    { x1: 716, y1: 10, x2: 990, y2: 88 },
  ];

  for (const ex of exitBanners) {
    const estWidth = Math.max(132, Math.min(254, ex.labelRu.length * 7.1 + 20));
    let bx = 500;
    let by = 32;
    if (ex.edge === 'north') {
      bx = Math.max(estWidth / 2 + 24, Math.min(976 - estWidth / 2, (ex.posPct / 100) * 1000));
      by = 28;
    } else if (ex.edge === 'south') {
      bx = Math.max(estWidth / 2 + 24, Math.min(976 - estWidth / 2, (ex.posPct / 100) * 1000));
      by = 972;
    } else if (ex.edge === 'west') {
      bx = 24 + estWidth / 2;
      by = Math.max(135, Math.min(915, (ex.posPct / 100) * 1000));
    } else {
      bx = 976 - estWidth / 2;
      by = Math.max(155, Math.min(915, (ex.posPct / 100) * 1000));
    }
    reserved.push({
      x1: bx - estWidth / 2 - 4,
      y1: by - 13,
      x2: bx + estWidth / 2 + 4,
      y2: by + 13,
    });
  }

  return reserved;
}

export interface BuildingCalloutInput extends MapBuildingFeature {
  readonly state: 'intact' | 'random_half' | 'burned_ruin';
  readonly resolvedAmenities?: readonly BuildingAmenityKind[];
}

/**
 * Детерминированный алгоритм устранения наложений на SVG-атласе:
 * 1) Разносит плашки зданий (сверху/снизу/справа/слева);
 * 2) Разводит близко стоящие микро-иконки фауны, трав и станций с шагом >= 22 px;
 * 3) Раздвигает текстовые подписи урочищ и подлокаций, чтобы ни один знак не перекрывал соседа.
 */
export function resolveDeconflictedAtlasLayout(params: {
  readonly buildings: readonly BuildingCalloutInput[];
  readonly microSpawns: readonly MapMicroSpawn[];
  readonly subLocations: readonly MapSubLocationLabel[];
  readonly areaLabels: readonly RegionAreaLabel[];
  readonly exitBanners: readonly RegionExitBanner[];
}): {
  readonly buildingCallouts: readonly (DeconflictedBuildingPlacement | null)[];
  readonly microSpawns: readonly DeconflictedMicroSpawn[];
  readonly subLocations: readonly DeconflictedLabelPoint[];
  readonly areaLabels: readonly DeconflictedLabelPoint[];
} {
  const occupiedRects: SvgBoxRect[] = buildReservedUiRects(params.exitBanners);
  const buildingAnchorPoints: { readonly sx: number; readonly sy: number; readonly r: number }[] = [];

  for (const b of params.buildings) {
    const sx = b.x;
    const sy = toSvgY(b.y);
    const sc = b.scale ?? 1;
    buildingAnchorPoints.push({ sx, sy, r: 12 * sc });
    occupiedRects.push({
      x1: sx - 10 * sc,
      y1: sy - 10 * sc,
      x2: sx + 10 * sc,
      y2: sy + 10 * sc,
    });
  }

  // 1. Размещение плашек ключевых построек без наложения друг на друга и на здания
  const buildingCallouts: (DeconflictedBuildingPlacement | null)[] = params.buildings.map((b) => {
    if (!b.labelRu) return null;
    const sx = b.x;
    const sy = toSvgY(b.y);
    const sc = b.scale ?? 1;
    const w = Math.max(76, b.labelRu.length * 6.3 + 14);
    const hasAmenities = (b.amenities ?? (b.hasStove ? ['stove'] : [])).length > 0;
    const boxTopH = 10;
    const boxBotH = hasAmenities ? 18 : 6;

    const candidates: readonly [number, number][] = [
      [0, hasAmenities ? -18 * sc - 14 : -16 * sc - 6], // стандартно сверху
      [0, 22 * sc + 8],                                  // снизу под иконкой
      [w / 2 + 18 * sc, -4],                             // справа
      [-(w / 2 + 18 * sc), -4],                          // слева
      [0, hasAmenities ? -34 * sc - 16 : -30 * sc - 10], // выше сверху
      [0, 38 * sc + 10],                                 // ниже снизу
    ];

    let bestDx = candidates[0]![0];
    let bestDy = candidates[0]![1];
    let bestScore = Infinity;
    let bestRect: SvgBoxRect = {
      x1: sx + bestDx - w / 2,
      y1: sy + bestDy - boxTopH,
      x2: sx + bestDx + w / 2,
      y2: sy + bestDy + boxBotH,
    };

    for (const [dx, dy] of candidates) {
      const cx = sx + dx;
      const cy = sy + dy;
      if (cx - w / 2 < 12 || cx + w / 2 > 988 || cy - boxTopH < 12 || cy + boxBotH > 988) {
        continue;
      }
      const rect: SvgBoxRect = {
        x1: cx - w / 2,
        y1: cy - boxTopH,
        x2: cx + w / 2,
        y2: cy + boxBotH,
      };
      let score = 0;
      for (const occ of occupiedRects) {
        if (rectsOverlap(rect, occ, 2)) {
          score += overlapArea(rect, occ) + 120;
        }
      }
      if (score === 0) {
        bestDx = dx;
        bestDy = dy;
        bestRect = rect;
        bestScore = 0;
        break;
      }
      if (score < bestScore) {
        bestScore = score;
        bestDx = dx;
        bestDy = dy;
        bestRect = rect;
      }
    }

    occupiedRects.push(bestRect);
    return {
      x: b.x,
      y: b.y,
      calloutOffsetX: bestDx,
      calloutOffsetY: bestDy,
      calloutBoxWidth: w,
    };
  });

  // 2. Разведение микро-спавнов (минимум 22 px между иконками и >= 22 px от центра здания)
  const placedSpawns: { sx: number; sy: number }[] = [];
  const deconflictedSpawns: DeconflictedMicroSpawn[] = [];
  const minSpawnDist = 21;
  const radii = [0, 18, 26, 35, 44];

  for (const sp of params.microSpawns) {
    const ox = sp.x;
    const oy = toSvgY(sp.y);
    let chosenSx = ox;
    let chosenSy = oy;
    let placed = false;

    for (const r of radii) {
      const steps = r === 0 ? 1 : 12;
      for (let k = 0; k < steps; k++) {
        const angle = (k / steps) * Math.PI * 2 + (sp.kind.charCodeAt(0) % 7) * 0.4;
        const cx = ox + Math.cos(angle) * r;
        const cy = oy + Math.sin(angle) * r;
        if (cx < 30 || cx > 970 || cy < 30 || cy > 965) continue;

        const rect: SvgBoxRect = { x1: cx - 9.5, y1: cy - 9.5, x2: cx + 9.5, y2: cy + 9.5 };
        let blocked = occupiedRects.some((occ) => rectsOverlap(rect, occ, 1.5));
        if (!blocked) {
          blocked = buildingAnchorPoints.some(
            (b) => Math.hypot(cx - b.sx, cy - b.sy) < b.r + 13,
          );
        }
        if (!blocked) {
          blocked = placedSpawns.some((p) => Math.hypot(cx - p.sx, cy - p.sy) < minSpawnDist);
        }

        if (!blocked) {
          chosenSx = Number(cx.toFixed(1));
          chosenSy = Number(cy.toFixed(1));
          placed = true;
          break;
        }
      }
      if (placed) break;
    }

    const finalMapY = Number((MAP_CANVAS_SIZE - chosenSy).toFixed(1));
    placedSpawns.push({ sx: chosenSx, sy: chosenSy });
    occupiedRects.push({
      x1: chosenSx - 8.5,
      y1: chosenSy - 8.5,
      x2: chosenSx + 8.5,
      y2: chosenSy + 8.5,
    });
    deconflictedSpawns.push({
      ...sp,
      x: chosenSx,
      y: finalMapY,
      origX: sp.x,
      origY: sp.y,
      wasShifted: Math.hypot(chosenSx - ox, chosenSy - oy) > 6,
    });
  }

  // 3. Де-конфликтинг подписей урочищ и второстепенных подлокаций
  const labelOffsets: readonly [number, number][] = [
    [0, 0],
    [0, -14],
    [0, 14],
    [0, -26],
    [0, 26],
    [-28, 0],
    [28, 0],
  ];

  const placeTextLabels = (
    items: readonly { x: number; y: number; text: string; style?: 'landmark' | 'water' | 'danger' | 'forest' }[],
    fontScale: number,
  ): DeconflictedLabelPoint[] => {
    const out: DeconflictedLabelPoint[] = [];
    for (const item of items) {
      const sx = item.x;
      const sy = toSvgY(item.y);
      const halfW = (item.text.length * fontScale) / 2;
      let bestX = sx;
      let bestY = sy;
      let bestPenalty = Infinity;
      let bestRect: SvgBoxRect = { x1: sx - halfW, y1: sy - 9, x2: sx + halfW, y2: sy + 3 };

      for (const [dx, dy] of labelOffsets) {
        const cx = Math.max(halfW + 14, Math.min(986 - halfW, sx + dx));
        const cy = Math.max(24, Math.min(960, sy + dy));
        const rect: SvgBoxRect = { x1: cx - halfW, y1: cy - 9, x2: cx + halfW, y2: cy + 3 };
        let penalty = Math.abs(dx) * 0.2 + Math.abs(dy) * 0.4;
        for (const occ of occupiedRects) {
          if (rectsOverlap(rect, occ, 1.5)) {
            penalty += overlapArea(rect, occ) + 90;
          }
        }
        if (penalty === 0) {
          bestX = cx;
          bestY = cy;
          bestRect = rect;
          bestPenalty = 0;
          break;
        }
        if (penalty < bestPenalty) {
          bestPenalty = penalty;
          bestX = cx;
          bestY = cy;
          bestRect = rect;
        }
      }

      occupiedRects.push(bestRect);
      out.push({
        x: Number(bestX.toFixed(1)),
        y: Number((MAP_CANVAS_SIZE - bestY).toFixed(1)),
        text: item.text,
        style: item.style,
      });
    }
    return out;
  };

  const areaLabels = placeTextLabels(
    params.areaLabels.map((a) => ({
      x: a.x,
      y: a.y,
      text: a.textRu.toUpperCase(),
      style: a.style,
    })),
    6.4,
  );

  const subLocations = placeTextLabels(
    params.subLocations.map((s) => ({
      x: s.x,
      y: s.y,
      text: s.labelRu,
    })),
    5.2,
  );

  return {
    buildingCallouts,
    microSpawns: deconflictedSpawns,
    subLocations,
    areaLabels,
  };
}

/**
 * Разводит интерактивные Leaflet-пины (и скрывает пересекающиеся подписи-плашки),
 * чтобы иконки на карте никогда не наезжали друг на друга.
 */
export function deconflictLeafletMarkers(
  markers: readonly MapMarkerModel[],
): readonly DeconflictedLeafletMarker[] {
  const placedPoints: { x: number; y: number }[] = [];
  const labelBoxes: SvgBoxRect[] = [];
  const out: DeconflictedLeafletMarker[] = [];

  for (const m of markers) {
    let dx = m.x;
    let dy = m.y;
    const minPinDist = 28;
    const rings = [0, 22, 34, 46];
    let done = false;

    for (const r of rings) {
      const steps = r === 0 ? 1 : 10;
      for (let i = 0; i < steps; i++) {
        const ang = (i / steps) * Math.PI * 2 + 0.35;
        const cx = Math.max(24, Math.min(976, m.x + Math.cos(ang) * r));
        const cy = Math.max(24, Math.min(976, m.y + Math.sin(ang) * r));
        const collides = placedPoints.some((p) => Math.hypot(cx - p.x, cy - p.y) < minPinDist);
        if (!collides) {
          dx = Number(cx.toFixed(1));
          dy = Number(cy.toFixed(1));
          done = true;
          break;
        }
      }
      if (done) break;
    }

    placedPoints.push({ x: dx, y: dy });
    const pillHalfW = Math.min(72, Math.max(38, m.nameRu.length * 3.1));
    const pillRect: SvgBoxRect = {
      x1: dx - pillHalfW,
      y1: dy - 26,
      x2: dx + pillHalfW,
      y2: dy - 10,
    };
    const collidesLabel = labelBoxes.some((b) => rectsOverlap(pillRect, b, 2));
    if (!collidesLabel) {
      labelBoxes.push(pillRect);
    }

    out.push({
      marker: m,
      displayX: dx,
      displayY: dy,
      isShifted: Math.hypot(dx - m.x, dy - m.y) > 4,
      suppressLabelPill: collidesLabel,
    });
  }

  return out;
}
