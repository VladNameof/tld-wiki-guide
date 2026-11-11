import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Backpack,
  Compass,
  Eye,
  Footprints,
  Mountain,
  Navigation,
  Sparkles,
  X,
} from 'lucide-react';
import type { Terrain3DRawJson } from '../../l0-primitives/types.ts';
import {
  decodeTerrain3DJson,
  formatCompassBearingRu,
  getNearbyStructures,
  sampleTerrainElevation,
  sampleTerrainSlopeDeg,
  type DecodedTerrain3D,
} from '../../l1-codecs/terrain3dCodec.ts';
import {
  getFandomMapMeta,
  getRegionById,
  getRegionStreetViewNodes,
} from '../../l2-models/selectors.ts';
import { worldXZToLeafletCoords } from '../../l2-models/data/fandomMapsManifest.ts';
import { executeCommand } from '../hooks/useCommandState.ts';
import { useCommandState } from '../hooks/useCommandState.ts';

const terrainCache = new Map<string, Promise<DecodedTerrain3D>>();

function loadRegionTerrain3D(regionId: string): Promise<DecodedTerrain3D> {
  const existing = terrainCache.get(regionId);
  if (existing) return existing;

  const p = fetch(`./terrain-3d/${regionId}.json`)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Не удалось загрузить 3D-рельеф региона (${res.status})`);
      }
      return res.json() as Promise<Terrain3DRawJson>;
    })
    .then((raw) => decodeTerrain3DJson(raw))
    .catch((err) => {
      terrainCache.delete(regionId);
      throw err;
    });

  terrainCache.set(regionId, p);
  return p;
}

function addBuildingMesh(
  scene: THREE.Scene,
  kind: string,
  wx: number,
  wy: number,
  wz: number,
  yaw: number,
  isNight: boolean,
): void {
  const g = new THREE.Group();
  g.position.set(wx, wy, wz);
  g.rotation.y = -yaw;

  if (kind === 'tower') {
    const legMat = new THREE.MeshStandardMaterial({ color: 0x5d4632, roughness: 0.9 });
    const cabMat = new THREE.MeshStandardMaterial({
      color: isNight ? 0x6b3f2b : 0x8d4c34,
      emissive: isNight ? 0x3b220c : 0x000000,
      roughness: 0.8,
    });
    const base = new THREE.Mesh(new THREE.BoxGeometry(5, 13, 5), legMat);
    base.position.y = 6.5;
    g.add(base);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(6.8, 4.2, 6.8), cabMat);
    cabin.position.y = 14.5;
    g.add(cabin);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(5.6, 3.2, 4),
      new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.85 }),
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 18.1;
    g.add(roof);
  } else if (kind === 'trailer') {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(10.5, 3.6, 3.8),
      new THREE.MeshStandardMaterial({ color: 0x3c696d, roughness: 0.78 }),
    );
    body.position.y = 1.9;
    g.add(body);
    const snow = new THREE.Mesh(
      new THREE.BoxGeometry(10.7, 0.5, 4.0),
      new THREE.MeshStandardMaterial({ color: isNight ? 0x5c7c96 : 0xeaf2f8, roughness: 0.9 }),
    );
    snow.position.y = 3.85;
    g.add(snow);
  } else if (kind === 'bridge') {
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(14, 1.4, 5.5),
      new THREE.MeshStandardMaterial({ color: 0x644a35, roughness: 0.92 }),
    );
    deck.position.y = 0.7;
    g.add(deck);
  } else if (kind === 'cave') {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(6.2, 0),
      new THREE.MeshStandardMaterial({ color: 0x3f4752, roughness: 0.95 }),
    );
    rock.scale.set(1.3, 0.9, 1.1);
    rock.position.y = 2.6;
    g.add(rock);
    const arch = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 3.2, 4.5),
      new THREE.MeshStandardMaterial({ color: 0x0b0f14, roughness: 1 }),
    );
    arch.position.set(0, 1.5, 4.2);
    g.add(arch);
  } else if (kind === 'vehicle') {
    const car = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 2.2, 2.5),
      new THREE.MeshStandardMaterial({ color: 0x5a4a42, roughness: 0.7 }),
    );
    car.position.y = 1.1;
    g.add(car);
  } else {
    // Жилой дом / хижина / цех / сарай
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(9.2, 4.6, 7.6),
      new THREE.MeshStandardMaterial({
        color: isNight ? 0x5a4132 : 0x7b563c,
        roughness: 0.88,
      }),
    );
    wall.position.y = 2.3;
    g.add(wall);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(7.2, 3.4, 4),
      new THREE.MeshStandardMaterial({
        color: isNight ? 0x6b3228 : 0x8f3328,
        roughness: 0.82,
      }),
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 6.2;
    g.add(roof);

    if (isNight) {
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 1.1, 0.2),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24 }),
      );
      win.position.set(0, 2.4, 3.85);
      g.add(win);
    }
  }

  scene.add(g);
}

export function LocationReconstructor3DModal() {
  const state = useCommandState();
  const target = state.active3DLocation;

  const [terrain, setTerrain] = useState<DecodedTerrain3D | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<'ground' | 'aerial'>('ground');
  const [skyTheme, setSkyTheme] = useState<'snow' | 'aurora'>(
    state.mapTheme === 'aurora' ? 'aurora' : 'snow',
  );
  const [camWorld, setCamWorld] = useState<{ x: number; y: number; z: number; heading: number }>({
    x: 0,
    y: 0,
    z: 0,
    heading: 0,
  });

  const mountRef = useRef<HTMLDivElement | null>(null);
  const cameraPoseRef = useRef({
    x: 0,
    z: 0,
    yaw: 0,
    pitch: -0.05,
  });
  const modeRef = useRef(cameraMode);
  modeRef.current = cameraMode;

  useEffect(() => {
    setSkyTheme(state.mapTheme === 'aurora' ? 'aurora' : 'snow');
  }, [state.mapTheme]);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    setTerrain(null);
    setLoadError(null);

    loadRegionTerrain3D(target.regionId)
      .then((decoded) => {
        if (!cancelled) {
          cameraPoseRef.current = {
            x: target.worldX,
            z: target.worldZ,
            yaw: 0,
            pitch: -0.04,
          };
          setTerrain(decoded);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [target]);

  // Построение Three.js сцены вокруг выбранной точки по реальным данным игры
  useEffect(() => {
    if (!target || !terrain) return;
    const container = mountRef.current;
    if (!container) return;

    const isNight = skyTheme === 'aurora';
    const w = Math.max(320, container.clientWidth);
    const h = Math.max(320, container.clientHeight);

    const scene = new THREE.Scene();
    const skyColor = isNight ? 0x07131d : 0xc7dae8;
    scene.background = new THREE.Color(skyColor);
    scene.fog = new THREE.FogExp2(skyColor, isNight ? 0.0018 : 0.0016);

    const camera = new THREE.PerspectiveCamera(68, w / h, 0.5, 1900);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Освещение (зимнее солнце или зелёно-бирюзовое полярное сияние)
    const hemi = new THREE.HemisphereLight(
      isNight ? 0x4ade80 : 0xf4f9ff,
      isNight ? 0x0e1b29 : 0x5c7387,
      isNight ? 0.85 : 1.05,
    );
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(
      isNight ? 0x5eead4 : 0xfff5e4,
      isNight ? 0.9 : 1.35,
    );
    sun.position.set(320, 460, 210);
    scene.add(sun);

    // Строим 3D-сетку реального рельефа региона в радиусе +-580м вокруг цели
    const centerX = target.worldX;
    const centerZ = target.worldZ;
    const patchRadius = 620;
    const segs = 124;
    const size = patchRadius * 2;
    const terrainGeo = new THREE.PlaneGeometry(size, size, segs, segs);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(posAttr.count * 3);

    for (let i = 0; i < posAttr.count; i += 1) {
      const lx = posAttr.getX(i);
      const lz = posAttr.getZ(i);
      const wx = centerX + lx;
      const wz = centerZ + lz;
      const wy = sampleTerrainElevation(terrain, wx, wz);
      posAttr.setXYZ(i, wx, wy, wz);
    }
    terrainGeo.computeVertexNormals();
    const normAttr = terrainGeo.attributes.normal as THREE.BufferAttribute;

    for (let i = 0; i < posAttr.count; i += 1) {
      const slopeY = Math.max(0, Math.min(1, normAttr.getY(i)));
      const wy = posAttr.getY(i);
      const altNorm = Math.max(
        0,
        Math.min(
          1,
          (wy - terrain.raw.bounds.minY) /
            Math.max(1, terrain.raw.bounds.maxY - terrain.raw.bounds.minY),
        ),
      );

      let r = 0.87;
      let g = 0.92;
      let b = 0.96;
      if (isNight) {
        r = 0.14;
        g = 0.24;
        b = 0.34;
      }

      if (slopeY < 0.72) {
        // Крутые скалы и обрывы
        const cliffFactor = Math.max(0, (0.72 - slopeY) / 0.45);
        r = THREE.MathUtils.lerp(r, isNight ? 0.08 : 0.28, cliffFactor);
        g = THREE.MathUtils.lerp(g, isNight ? 0.11 : 0.31, cliffFactor);
        b = THREE.MathUtils.lerp(b, isNight ? 0.15 : 0.35, cliffFactor);
      } else {
        // Тон высоты на снегу
        r = THREE.MathUtils.lerp(r * 0.92, r, altNorm);
        g = THREE.MathUtils.lerp(g * 0.94, g, altNorm);
        b = THREE.MathUtils.lerp(b * 0.98, b, altNorm);
      }
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.02,
      flatShading: false,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    scene.add(terrainMesh);

    // Плоскости льда и замёрзших озёр из игры
    for (const wp of terrain.raw.waterPlanes) {
      const overlaps =
        wp.maxX >= centerX - patchRadius &&
        wp.minX <= centerX + patchRadius &&
        wp.maxZ >= centerZ - patchRadius &&
        wp.minZ <= centerZ + patchRadius;
      if (!overlaps) continue;
      const pw = Math.min(size, wp.maxX - wp.minX);
      const pd = Math.min(size, wp.maxZ - wp.minZ);
      const iceGeo = new THREE.PlaneGeometry(pw, pd);
      iceGeo.rotateX(-Math.PI / 2);
      const iceMat = new THREE.MeshStandardMaterial({
        color: isNight ? 0x1e4e6e : 0x99c6e2,
        roughness: 0.25,
        metalness: 0.15,
        transparent: true,
        opacity: 0.84,
      });
      const iceMesh = new THREE.Mesh(iceGeo, iceMat);
      iceMesh.position.set((wp.minX + wp.maxX) / 2, wp.y + 0.15, (wp.minZ + wp.maxZ) / 2);
      scene.add(iceMesh);
    }

    // Реальные постройки, мосты, вышки, прицепы, пещеры вокруг выбранной точки
    for (const [kind, , wx, wy, wz, yaw] of terrain.raw.structures) {
      if (kind === 'road') continue;
      if (Math.hypot(wx - centerX, wz - centerZ) > patchRadius - 20) continue;
      const surfaceY = Math.max(wy, sampleTerrainElevation(terrain, wx, wz) - 0.5);
      addBuildingMesh(scene, kind, wx, surfaceY, wz, yaw, isNight);
    }

    // Хвойные деревья (InstancedMesh — сверхбыстрый рендеринг)
    const nearbyTrees = terrain.raw.trees.filter(
      ([wx, , wz]) => Math.hypot(wx - centerX, wz - centerZ) <= patchRadius - 20,
    );
    if (nearbyTrees.length > 0) {
      const coneGeo = new THREE.ConeGeometry(2.6, 11.5, 6);
      coneGeo.translate(0, 6.2, 0);
      const treeMat = new THREE.MeshStandardMaterial({
        color: isNight ? 0x122b23 : 0x1d3e2e,
        roughness: 0.95,
      });
      const instTrees = new THREE.InstancedMesh(coneGeo, treeMat, nearbyTrees.length);
      const dummy = new THREE.Object3D();
      nearbyTrees.forEach(([wx, , wz], idx) => {
        const wy = sampleTerrainElevation(terrain, wx, wz);
        const s = 0.8 + ((idx * 17) % 5) * 0.12;
        dummy.position.set(wx, wy - 0.3, wz);
        dummy.scale.set(s, s, s);
        dummy.rotation.y = (idx * 1.13) % (Math.PI * 2);
        dummy.updateMatrix();
        instTrees.setMatrixAt(idx, dummy.matrix);
      });
      scene.add(instTrees);
    }

    // Скальные валуны
    const nearbyRocks = terrain.raw.rocks.filter(
      ([wx, , wz]) => Math.hypot(wx - centerX, wz - centerZ) <= patchRadius - 20,
    );
    if (nearbyRocks.length > 0) {
      const rockGeo = new THREE.DodecahedronGeometry(3.2, 0);
      const rockMat = new THREE.MeshStandardMaterial({
        color: isNight ? 0x1e2833 : 0x525d69,
        roughness: 0.95,
      });
      const instRocks = new THREE.InstancedMesh(rockGeo, rockMat, nearbyRocks.length);
      const dummy = new THREE.Object3D();
      nearbyRocks.forEach(([wx, , wz], idx) => {
        const wy = sampleTerrainElevation(terrain, wx, wz);
        const s = 0.7 + ((idx * 13) % 6) * 0.22;
        dummy.position.set(wx, wy + s * 0.4, wz);
        dummy.scale.set(s * 1.2, s * 0.75, s);
        dummy.rotation.set(idx * 0.4, idx * 0.9, 0);
        dummy.updateMatrix();
        instRocks.setMatrixAt(idx, dummy.matrix);
      });
      scene.add(instRocks);
    }

    // Оранжевый маркер выбранной точки (маяк на месте клика)
    const centerY = sampleTerrainElevation(terrain, centerX, centerZ);
    const beaconRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.4, 0.22, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0xf97316 }),
    );
    beaconRing.rotation.x = Math.PI / 2;
    beaconRing.position.set(centerX, centerY + 0.35, centerZ);
    scene.add(beaconRing);

    const beaconPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 16, 8),
      new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.48 }),
    );
    beaconPillar.position.set(centerX, centerY + 8, centerZ);
    scene.add(beaconPillar);

    // Управление камерой (drag + WASD)
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    const keysDown = new Set<string>();

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      cameraPoseRef.current.yaw -= dx * 0.005;
      cameraPoseRef.current.pitch = Math.max(
        -1.35,
        Math.min(1.1, cameraPoseRef.current.pitch - dy * 0.004),
      );
    };
    const onPointerUp = () => {
      isDragging = false;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        executeCommand('terrain3d.close', {});
        return;
      }
      keysDown.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onResize = () => {
      if (!container) return;
      const nw = Math.max(320, container.clientWidth);
      const nh = Math.max(320, container.clientHeight);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    let rafId = 0;
    let lastTick = performance.now();
    let hudTimer = 0;

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(0.08, (now - lastTick) / 1000);
      lastTick = now;

      const pose = cameraPoseRef.current;
      const speed = (modeRef.current === 'aerial' ? 75 : 32) * dt;
      // Three.js Euler YXZ: yaw=0 смотрит на -Z; чтобы в Unity +Z был Север (0°), компенсируем
      const fwdX = -Math.sin(pose.yaw);
      const fwdZ = -Math.cos(pose.yaw);
      const rightX = Math.cos(pose.yaw);
      const rightZ = -Math.sin(pose.yaw);

      if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) {
        pose.x += fwdX * speed;
        pose.z += fwdZ * speed;
      }
      if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) {
        pose.x -= fwdX * speed;
        pose.z -= fwdZ * speed;
      }
      if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) {
        pose.x -= rightX * speed;
        pose.z -= rightZ * speed;
      }
      if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) {
        pose.x += rightX * speed;
        pose.z += rightZ * speed;
      }

      // Ограничиваем в пределах сгенерированного патча рельефа
      pose.x = Math.max(centerX - patchRadius + 40, Math.min(centerX + patchRadius - 40, pose.x));
      pose.z = Math.max(centerZ - patchRadius + 40, Math.min(centerZ + patchRadius - 40, pose.z));

      const groundY = sampleTerrainElevation(terrain, pose.x, pose.z);
      if (modeRef.current === 'aerial') {
        camera.position.set(
          pose.x - fwdX * 58,
          groundY + 54,
          pose.z - fwdZ * 58,
        );
        camera.lookAt(pose.x, groundY + 3, pose.z);
      } else {
        camera.position.set(pose.x, groundY + 2.2, pose.z);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = pose.yaw;
        camera.rotation.x = pose.pitch;
      }

      renderer.render(scene, camera);

      hudTimer += dt;
      if (hudTimer >= 0.08) {
        hudTimer = 0;
        const headingDeg =
          ((Math.atan2(fwdX, fwdZ) * 180) / Math.PI + 360) % 360;
        setCamWorld({
          x: Math.round(pose.x),
          y: Math.round(groundY),
          z: Math.round(pose.z),
          heading: Math.round(headingDeg),
        });
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      terrainGeo.dispose();
      terrainMat.dispose();
      renderer.dispose();
    };
  }, [target, terrain, skyTheme]);

  const region = target ? getRegionById(target.regionId) : null;
  const nearbyLandmarks = useMemo(() => {
    if (!terrain || !target) return [];
    return getNearbyStructures(terrain, camWorld.x || target.worldX, camWorld.z || target.worldZ, 520, 10);
  }, [terrain, target, camWorld.x, camWorld.z]);

  const nearestStreetView = useMemo(() => {
    if (!target) return null;
    const meta = getFandomMapMeta(target.regionId);
    const nodes = getRegionStreetViewNodes(target.regionId);
    if (!meta || nodes.length === 0) return null;
    let best = nodes[0]!;
    let bestDist = Infinity;
    for (const n of nodes) {
      const d = Math.hypot(n.x - target.leafletX, n.y - target.leafletY);
      if (d < bestDist) {
        bestDist = d;
        best = n;
      }
    }
    return bestDist <= 180 ? best : null;
  }, [target]);

  if (!target || !region) return null;

  const faceWorldPoint = (wx: number, wz: number) => {
    const dx = wx - cameraPoseRef.current.x;
    const dz = wz - cameraPoseRef.current.z;
    // fwd = (-sin(yaw), -cos(yaw)) -> хотим чтобы fwd совпадал с (dx, dz)
    cameraPoseRef.current.yaw = Math.atan2(-dx, -dz);
    cameraPoseRef.current.pitch = -0.04;
  };

  const stepCamera = (dx: number, dz: number) => {
    cameraPoseRef.current.x += dx;
    cameraPoseRef.current.z += dz;
  };

  const currentSlope = terrain
    ? sampleTerrainSlopeDeg(terrain, camWorld.x || target.worldX, camWorld.z || target.worldZ)
    : 0;
  const headingCompass = formatCompassBearingRu(
    Math.sin((camWorld.heading * Math.PI) / 180),
    Math.cos((camWorld.heading * Math.PI) / 180),
  );

  const handleDropStashHere = () => {
    const meta = getFandomMapMeta(target.regionId);
    const coords = meta
      ? worldXZToLeafletCoords(meta, camWorld.x || target.worldX, camWorld.z || target.worldZ)
      : { x: target.leafletX, y: target.leafletY };
    executeCommand('survivor.addCustomNote', {
      regionId: target.regionId,
      x: coords.x,
      y: coords.y,
      title: `Точка (${camWorld.x || target.worldX}, ${camWorld.z || target.worldZ})`,
      note: `Высота рельефа ${camWorld.y} м • Заметка с 3D-разведки`,
      icon: 'stash',
    });
    executeCommand('terrain3d.close', {});
  };

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/85 p-2 backdrop-blur-sm sm:p-4">
      <div className="flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-[#2d4054] bg-[#0b1116] shadow-2xl">
        {/* Заголовок 3D-реконструкции */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1f2e3d] bg-[#101820] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/15 text-amber-300">
              <Mountain className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#f3efe6] sm:text-base">
                3D-реконструкция местности из файлов игры: {region.nameRu}
              </h2>
              <p className="text-xs text-[#8ea2b4]">
                Координаты Unity X: {camWorld.x || target.worldX}м · Z: {camWorld.z || target.worldZ}м · Высота:{' '}
                <strong className="text-amber-300">{camWorld.y}м</strong> · Уклон {currentSlope}°
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCameraMode((m) => (m === 'ground' ? 'aerial' : 'ground'))}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                cameraMode === 'ground'
                  ? 'border-sky-500/50 bg-sky-950/50 text-sky-200'
                  : 'border-amber-500/50 bg-amber-950/40 text-amber-200'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              {cameraMode === 'ground' ? 'Вид от 1-го лица (с земли)' : 'Обзор с высоты 50м'}
            </button>

            <button
              type="button"
              onClick={() => setSkyTheme((s) => (s === 'snow' ? 'aurora' : 'snow'))}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#304558] bg-[#15202b] px-3 py-1.5 text-xs font-semibold text-[#d7e2ec] hover:border-[#6cb4cc]"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#6cb4cc]" />
              {skyTheme === 'snow' ? 'Зимний день' : 'Полярное сияние'}
            </button>

            <button
              type="button"
              onClick={() => executeCommand('terrain3d.close', {})}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#3b2929] bg-[#241616] px-2.5 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-950/60"
            >
              <X className="h-4 w-4" />
              Закрыть
            </button>
          </div>
        </div>

        {/* Основная 3D-область + правая панель ближайших реальных ориентиров */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-12">
          <div className="relative min-h-[360px] lg:col-span-9">
            <div ref={mountRef} className="h-full w-full cursor-grab active:cursor-grabbing" />

            {/* Верхний компасный HUD */}
            <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-[#2f4558] bg-[#0b1116]/85 px-4 py-1.5 text-xs font-semibold text-[#f3efe6] shadow-lg backdrop-blur">
              <span className="inline-flex items-center gap-2">
                <Compass className="h-3.5 w-3.5 text-amber-400" />
                Курс: <strong className="text-amber-300">{headingCompass}</strong> ({camWorld.heading}°) · Тяните мышью для обзора 360°, WASD/стрелки чтобы идти
              </span>
            </div>

            {/* Нижняя крестовина шагов для мыши/тача */}
            <div className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-xl border border-[#283948] bg-[#0d151c]/90 p-2 backdrop-blur">
              <button
                type="button"
                onClick={() => stepCamera(0, 25)}
                className="cursor-pointer rounded bg-[#182532] p-1.5 text-xs text-[#e4dfd5] hover:bg-[#233749]"
                title="Шагнуть на Север (+Z)"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => stepCamera(-25, 0)}
                className="cursor-pointer rounded bg-[#182532] p-1.5 text-xs text-[#e4dfd5] hover:bg-[#233749]"
                title="Шагнуть на Запад (-X)"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => stepCamera(0, -25)}
                className="cursor-pointer rounded bg-[#182532] p-1.5 text-xs text-[#e4dfd5] hover:bg-[#233749]"
                title="Шагнуть на Юг (-Z)"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => stepCamera(25, 0)}
                className="cursor-pointer rounded bg-[#182532] p-1.5 text-xs text-[#e4dfd5] hover:bg-[#233749]"
                title="Шагнуть на Восток (+X)"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {!terrain && !loadError && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0b1116]/90 text-sm text-[#a5b7c6]">
                Загрузка 3D-высот и объектов сцены из игры...
              </div>
            )}
            {loadError && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0b1116]/95 p-6 text-center text-sm text-red-300">
                {loadError}
              </div>
            )}
          </div>

          {/* Правая боковая панель ориентиров */}
          <aside className="flex flex-col justify-between overflow-y-auto border-t border-[#1e2d3b] bg-[#0e161d] p-4 lg:col-span-3 lg:border-t-0 lg:border-l">
            <div>
              <h3 className="text-xs font-bold tracking-wider text-amber-300 uppercase">
                Ближайшие ориентиры (в игре)
              </h3>
              <p className="mt-1 text-[11px] text-[#7e94a8]">
                Нажмите на любой объект, чтобы мгновенно развернуть камеру прямо на него:
              </p>

              <div className="mt-3 space-y-1.5">
                {nearbyLandmarks.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[#243545] p-3 text-xs text-[#73879b]">
                    В радиусе 520 м от точки — дикая природа без крупных построек (смотрите форму склонов и замёрзшие русла).
                  </p>
                ) : (
                  nearbyLandmarks.map((item, idx) => (
                    <button
                      key={`${item.displayName}-${idx}`}
                      type="button"
                      onClick={() => faceWorldPoint(item.worldX, item.worldZ)}
                      className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-[#223242] bg-[#131e28] px-3 py-2 text-left transition hover:border-amber-500/50 hover:bg-[#192836]"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-[#e4dfd5]">
                          {item.displayName}
                        </div>
                        <div className="text-[11px] text-[#7f95a9]">
                          Направление: <strong className="text-sky-300">{item.bearingRu}</strong>
                        </div>
                      </div>
                      <span className="shrink-0 rounded bg-[#0c1319] px-2 py-0.5 font-mono text-[11px] text-amber-300">
                        {item.distanceM} м
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-[#1e2d3b] pt-3">
              <button
                type="button"
                onClick={handleDropStashHere}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#d97724] px-3 py-2 text-xs font-bold text-[#0b1116] transition hover:bg-[#f08b36]"
              >
                <Backpack className="h-4 w-4" />
                Поставить метку / схрон в этой точке
              </button>

              {nearestStreetView && (
                <button
                  type="button"
                  onClick={() => {
                    executeCommand('terrain3d.close', {});
                    executeCommand('streetview.openNode', {
                      nodeId: nearestStreetView.id,
                      regionId: target.regionId,
                    });
                  }}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-sky-500/40 bg-sky-950/40 px-3 py-2 text-xs font-semibold text-sky-200 transition hover:bg-sky-900/50"
                >
                  <Footprints className="h-4 w-4 text-sky-400" />
                  Открыть ближайший Street View ({nearestStreetView.titleRu})
                </button>
              )}

              <div className="flex items-start gap-2 rounded-lg bg-[#0a1015] p-2.5 text-[11px] text-[#7c90a3]">
                <Navigation className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>
                  Рельеф, высоты, скалы, водоёмы и координаты построек извлечены напрямую (Read-Only) из Unity-сцен игры.
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
