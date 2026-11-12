import * as THREE from 'three';
import { PALETTE, TONES } from './palette';
import { G, addOutline, group, part, rng, toon, toonUnique } from './toon';
import { Mist } from './effects';
import { busStopTexture, milestoneTexture, roadSignTexture, teaCrateTexture } from './textures';
import { BUS_STOP, ROAD } from './layout';

/** Munnar surroundings: tea-garden hillside, road, trees, mountains and mist. */

export interface World {
  update(dt: number, t: number): void;
  setNight(night: number): void;
}

const smooth = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

/** Flat shelf for the shop + road, tea hill rising behind, valley in front. */
export function terrainHeight(x: number, z: number): number {
  let h = 0;
  const d = -3.6 - z;
  if (d > 0) {
    // tea slope up to a low ridge, then a misty valley before the mountains
    h += 3.2 * smooth(d / 14) - 2.4 * smooth((d - 19) / 16);
    h += Math.sin(x * 0.11 + 1.3) * 0.9 * smooth(d / 14);
    h += Math.sin(x * 0.27 + z * 0.13) * 0.45 * smooth(d / 10);
  }
  const f = z - ROAD.valleyZ;
  if (f > 0) h -= f * 0.32 + Math.sin(x * 0.15) * 0.4 * smooth(f / 6);
  return h;
}

export function buildWorld(scene: THREE.Scene): World {
  const rand = rng(1234);
  buildTerrain(scene, rand);
  buildTeaRows(scene, rand);
  buildRoad(scene);
  buildMountains(scene, rand);
  buildNature(scene, rand);
  buildRoadside(scene);
  const streetLights = buildStreetLights(scene);
  const mist = new Mist(scene);
  return {
    update(_dt, t) {
      mist.update(t);
    },
    setNight(night) {
      const n = THREE.MathUtils.clamp(night, 0, 1);
      for (const l of streetLights) {
        l.light.intensity = n * 2.1;
        l.bulb.visible = n > 0.015;
      }
    },
  };
}

/** A deliberately small, shadowless light budget for the roadside at night. */
function buildStreetLights(scene: THREE.Scene) {
  const out: { light: THREE.PointLight; bulb: THREE.Mesh }[] = [];
  for (const [x, z] of [
    [-7.4, 3.65],
    [8.6, 3.65],
  ]) {
    const root = group(scene, [x, 0, z]);
    part(root, G.cyl(0.045, 0.07, 4.7, 8), toon('#73766F'), { pos: [0, 2.35, 0] });
    part(root, G.box(0.1, 0.1, 0.72), toon('#73766F'), { pos: [0, 4.55, 0.28] });
    const bulb = part(root, G.sphere(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: '#FFD789' }), {
      pos: [0, 4.42, 0.62], shadow: false, outline: false,
    });
    bulb.visible = false;
    const light = new THREE.PointLight('#FFC66E', 0, 8, 1.7);
    light.position.set(0, 4.42, 0.62);
    root.add(light);
    out.push({ light, bulb });
  }
  return out;
}

function buildTerrain(scene: THREE.Scene, rand: () => number) {
  const geo = new THREE.PlaneGeometry(200, 160, 120, 96);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -30);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const grass = new THREE.Color(TONES.grass);
  const slope = new THREE.Color('#3F6E3F');
  const far = new THREE.Color('#2F5A3C');
  const valley = new THREE.Color('#4E7E45');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, terrainHeight(x, z));
    c.copy(grass);
    if (z < -3.6) c.lerp(slope, smooth((-3.6 - z) / 4));
    if (z < -28) c.lerp(far, smooth((-28 - z) / 20));
    if (z > 8.6) c.lerp(valley, smooth((z - 8.6) / 5));
    c.offsetHSL(0, 0, (rand() - 0.5) * 0.03);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, toonUnique('#ffffff', { vertexColors: true }));
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  scene.add(mesh);
}

/** Contour rows of clipped tea bushes – the Munnar signature. */
function buildTeaRows(scene: THREE.Scene, rand: () => number) {
  const spots: THREE.Matrix4[] = [];
  const tints: THREE.Color[] = [];
  const palette = ['#3F7D45', '#4A8A4A', '#356E3E', '#4F8F48'].map((h) => new THREE.Color(h));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (let z = -5.4; z > -27; z -= 1.15) {
    for (let x = -46; x < 46; x += 0.95) {
      // winding footpath through the garden
      if (Math.abs(x - (z * 0.55 + 7)) < 0.9) continue;
      const jx = x + (rand() - 0.5) * 0.25;
      const jz = z + Math.sin(x * 0.2) * 0.25;
      const k = 0.9 + rand() * 0.25;
      p.set(jx, terrainHeight(jx, jz) + 0.2 * k, jz);
      q.setFromEuler(new THREE.Euler(0, rand() * Math.PI, 0));
      s.set(1.05 * k, 0.62 * k, 0.8 * k);
      spots.push(m.clone().compose(p, q, s));
      tints.push(palette[Math.floor(rand() * palette.length)]);
    }
  }
  const mesh = new THREE.InstancedMesh(G.ico(0.5, 1), toonUnique('#ffffff'), spots.length);
  spots.forEach((mat, i) => {
    mesh.setMatrixAt(i, mat);
    mesh.setColorAt(i, tints[i]);
  });
  mesh.receiveShadow = true;
  mesh.name = 'tea-rows';
  scene.add(mesh);
}

function buildRoad(scene: THREE.Scene) {
  const flat = (w: number, d: number, color: string, pos: [number, number, number], opacity = 1) => {
    const mesh = part(scene, G.plane(w, d), toon(color, opacity < 1 ? { opacity } : {}), {
      pos,
      rot: [-Math.PI / 2, 0, 0],
      shadow: false,
      outline: false,
    });
    return mesh;
  };
  // red laterite shoulder + shop yard
  flat(60, 2.6, TONES.soil, [0, 0.012, 3.15]);
  flat(9.2, 6.2, TONES.soil, [0, 0.01, -0.3]);
  // wet asphalt with edge lines, plus a far-side footpath
  const z0 = ROAD.center - ROAD.width / 2;
  const z1 = ROAD.center + ROAD.width / 2;
  flat(140, ROAD.width, TONES.asphalt, [0, 0.025, ROAD.center]);
  flat(140, 0.08, '#D9D2BE', [0, 0.03, z0 + 0.06]);
  flat(140, 0.08, '#D9D2BE', [0, 0.03, z1 - 0.06]);
  flat(140, ROAD.valleyZ - z1, '#9E6A4A', [0, 0.012, (z1 + ROAD.valleyZ) / 2]);
  const dashes = new THREE.InstancedMesh(G.plane(1.2, 0.1), toon(PALETTE.cream), 46);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 46; i++) {
    m.makeRotationX(-Math.PI / 2).setPosition(-69 + i * 3, 0.032, ROAD.center);
    dashes.setMatrixAt(i, m);
  }
  dashes.receiveShadow = true;
  scene.add(dashes);

  // Pedestrian Zebra Crossing near bus stop
  for (let i = 0; i < 6; i++) {
    part(scene, G.plane(0.48, ROAD.width - 0.3), toon('#F0EDE4'), {
      pos: [BUS_STOP.x - 1.2 + i * 0.85, 0.033, ROAD.center],
      rot: [-Math.PI / 2, 0, 0],
      shadow: false,
      outline: false,
    });
  }

  // Cat's eye reflective road studs along centerline
  for (let i = 0; i < 46; i += 2) {
    part(scene, G.box(0.08, 0.02, 0.08), toon(PALETTE.gold), {
      pos: [-69 + i * 3 + 1.5, 0.034, ROAD.center],
      rot: [0, Math.PI / 4, 0],
      shadow: false,
      outline: false,
    });
  }
  // puddles
  const puddles: [number, number, number, number][] = [
    [-1.6, 3.5, 0.9, 0.45],
    [3.6, 5.6, 1.2, 0.5],
    [-4.9, 6.9, 1.0, 0.4],
    [1.2, 7.6, 0.8, 0.35],
    [6.2, 3.2, 0.7, 0.4],
  ];
  for (const [x, z, sx, sz] of puddles) {
    part(scene, G.circle(1, 24), toon('#9CC0C8', { opacity: 0.7 }), {
      pos: [x, 0.036, z],
      rot: [-Math.PI / 2, 0, 0],
      scale: [sx, sz, 1],
      shadow: false,
    });
  }
}

function buildMountains(scene: THREE.Scene, rand: () => number) {
  const layers = [
    { r: 50, n: 16, color: '#3E7158', h: [10, 18] },
    { r: 70, n: 18, color: '#6A9583', h: [16, 26] },
    { r: 92, n: 20, color: '#94B8A9', h: [22, 36] },
  ];
  for (const L of layers) {
    for (let i = 0; i < L.n; i++) {
      const a = (i / L.n) * Math.PI * 2 + rand() * 0.25;
      const w = 16 + rand() * 14;
      const h = L.h[0] + rand() * (L.h[1] - L.h[0]);
      const x = Math.sin(a) * L.r;
      const z = Math.cos(a) * L.r;
      part(scene, G.sphere(1, 20, 10, 0, Math.PI / 2), toon(L.color), {
        pos: [x, terrainHeight(x, z) - 3, z],
        scale: [w, h, w * 0.75],
        rot: [0, a, 0],
        shadow: false,
        outline: false,
      });
    }
  }
}

function teaBush(parent: THREE.Object3D, x: number, z: number, rand: () => number) {
  const g = group(parent, [x, terrainHeight(x, z), z]);
  const greens = ['#3F7D45', '#4A8A4A', '#356E3E'];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const r = i === 0 ? 0 : 0.28;
    part(g, G.ico(0.32 + rand() * 0.1, 1), toon(greens[i % 3]), {
      pos: [Math.cos(a) * r, 0.32 + (i === 0 ? 0.12 : 0), Math.sin(a) * r],
      scale: [1, 0.78, 1],
    });
  }
  addOutline(g);
}

function silverOak(parent: THREE.Object3D, x: number, z: number, rand: () => number) {
  const h = 6 + rand() * 3;
  const g = group(parent, [x, terrainHeight(x, z), z]);
  part(g, G.cyl(0.07, 0.14, h, 7), toon('#6B5B4B'), { pos: [0, h / 2, 0] });
  const greens = ['#3C6B4A', '#467656', '#35603F'];
  for (let i = 0; i < 6; i++) {
    const y = h * (0.45 + (i / 6) * 0.55);
    const a = rand() * Math.PI * 2;
    part(g, G.ico(0.5 + rand() * 0.4, 0), toon(greens[i % 3]), {
      pos: [Math.cos(a) * 0.45, y, Math.sin(a) * 0.45],
      scale: [1, 0.75, 1],
    });
  }
}

function bananaPlant(parent: THREE.Object3D, x: number, z: number, rand: () => number) {
  const g = group(parent, [x, terrainHeight(x, z), z], [0, rand() * Math.PI, 0]);
  part(g, G.cyl(0.09, 0.14, 1.7, 10), toon('#7B8F48'), { pos: [0, 0.85, 0] });
  const leaf = [toon('#4F8F3F'), toon('#3F7A38'), toon('#5C9A47')];
  for (let i = 0; i < 7; i++) {
    const holder = group(g, [0, 1.6 + rand() * 0.15, 0], [0, (i / 7) * Math.PI * 2, 0]);
    part(holder, G.sphere(1, 12, 6), leaf[i % 3], {
      pos: [0, 0.18, 0.62],
      rot: [0.45 + rand() * 0.35, 0, 0],
      scale: [0.24, 0.025, 0.72],
    });
  }
  addOutline(g);
}

function coconutPalm(parent: THREE.Object3D, x: number, z: number, rand: () => number) {
  const root = group(parent, [x, terrainHeight(x, z), z]);
  const leanAngle = 0.08 + rand() * 0.12;
  const leanDir = rand() * Math.PI * 2;
  const trunkBase = group(root, [0, 0, 0], [leanAngle, leanDir, 0]);

  let currentGroup = trunkBase;
  const numSegments = 6;
  const segHeight = 1.25 + rand() * 0.2;
  let currentR = 0.24;
  const trunkDark = toon('#5C4936');
  const trunkLight = toon('#75624E');
  const trunkFiber = toon('#433324');

  for (let s = 0; s < numSegments; s++) {
    const nextR = currentR * 0.91;
    part(currentGroup, G.cyl(nextR, currentR, segHeight, 9), s % 2 === 0 ? trunkDark : trunkLight, {
      pos: [0, segHeight / 2, 0],
    });
    part(currentGroup, G.cyl(currentR * 1.05, currentR * 1.05, 0.06, 9), trunkFiber, {
      pos: [0, 0.03, 0],
      outline: false,
    });
    const curveTilt = 0.04 + (s > 2 ? 0.05 : 0.02);
    const nextGroup = group(currentGroup, [0, segHeight, 0], [curveTilt, 0, 0]);
    currentGroup = nextGroup;
    currentR = nextR;
  }

  // Crown base (green crown sheath)
  part(currentGroup, G.cyl(0.14, 0.18, 0.65, 8), toon('#4A702E'), {
    pos: [0, 0.32, 0],
  });

  // Cluster of coconuts
  const nutColors = ['#5E7333', '#71853B', '#68542F', '#4E612B'];
  for (let c = 0; c < 7; c++) {
    const angle = (c / 7) * Math.PI * 2 + rand() * 0.3;
    const dist = 0.22 + rand() * 0.08;
    const yOff = 0.12 + rand() * 0.2;
    part(currentGroup, G.sphere(0.14 + rand() * 0.04, 8, 6), toon(nutColors[c % nutColors.length]), {
      pos: [Math.cos(angle) * dist, yOff, Math.sin(angle) * dist],
      scale: [0.85, 1.25, 0.85],
      rot: [rand() * 0.4, angle, rand() * 0.4],
    });
  }

  // Arching Kerala palm fronds
  const numFronds = 12;
  const frondGreens = ['#387732', '#44873C', '#2E6728', '#4F9444'];
  for (let f = 0; f < numFronds; f++) {
    const angle = (f / numFronds) * Math.PI * 2 + (rand() - 0.5) * 0.2;
    const frondHolder = group(currentGroup, [0, 0.55, 0], [0, angle, 0]);
    const innerStem = group(frondHolder, [0, 0, 0], [0.35 + (f % 2) * 0.18, 0, 0]);
    part(innerStem, G.box(0.06, 0.04, 1.5), toon('#486E31'), {
      pos: [0, 0.02, 0.75],
      outline: false,
    });
    part(innerStem, G.box(0.65, 0.02, 1.4), toon(frondGreens[f % frondGreens.length]), {
      pos: [0, 0.02, 0.75],
      rot: [0, 0, 0.1],
    });

    const outerStem = group(innerStem, [0, 0, 1.5], [0.65, 0, 0]);
    part(outerStem, G.box(0.04, 0.03, 1.6), toon('#486E31'), {
      pos: [0, 0.015, 0.8],
      outline: false,
    });
    part(outerStem, G.box(0.55, 0.018, 1.5), toon(frondGreens[(f + 1) % frondGreens.length]), {
      pos: [0, 0.015, 0.75],
    });
  }

  addOutline(root);
}

function arecaPalm(parent: THREE.Object3D, x: number, z: number, rand: () => number) {
  const root = group(parent, [x, terrainHeight(x, z), z]);
  const h = 7.5 + rand() * 2.2;
  part(root, G.cyl(0.065, 0.09, h, 8), toon('#87937A'), {
    pos: [0, h / 2, 0],
  });
  const numRings = Math.floor(h / 0.45);
  for (let r = 1; r < numRings; r++) {
    part(root, G.cyl(0.082, 0.082, 0.03, 8), toon('#BDCAB4'), {
      pos: [0, r * 0.45, 0],
      outline: false,
    });
  }
  const crownshaftH = 0.9;
  part(root, G.cyl(0.075, 0.075, crownshaftH, 8), toon('#3E7A2E'), {
    pos: [0, h + crownshaftH / 2, 0],
  });
  for (let b = 0; b < 10; b++) {
    const a = rand() * Math.PI * 2;
    const r = 0.12 + rand() * 0.06;
    part(root, G.sphere(0.065, 6, 5), toon(rand() > 0.4 ? '#E08027' : '#CC6C18'), {
      pos: [Math.cos(a) * r, h + 0.15 + (rand() - 0.5) * 0.15, Math.sin(a) * r],
    });
  }
  const frondCount = 7;
  for (let f = 0; f < frondCount; f++) {
    const angle = (f / frondCount) * Math.PI * 2;
    const frond = group(root, [0, h + crownshaftH, 0], [0, angle, 0]);
    const arch = group(frond, [0, 0, 0], [0.35 + rand() * 0.15, 0, 0]);
    part(arch, G.box(0.035, 0.02, 1.7), toon('#3A6E2B'), {
      pos: [0, 0.01, 0.85],
      outline: false,
    });
    part(arch, G.box(0.42, 0.015, 1.6), toon('#488236'), {
      pos: [0, 0.01, 0.85],
    });
  }
  addOutline(root);
}

function floweringBush(parent: THREE.Object3D, x: number, z: number, flowerColor: string, rand: () => number) {
  const root = group(parent, [x, terrainHeight(x, z), z]);
  const greens = ['#2E6334', '#38753C', '#27562C', '#3E8044'];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rand() * 0.2;
    const dist = i === 0 ? 0 : 0.35 + rand() * 0.15;
    const radius = 0.42 + rand() * 0.18;
    part(root, G.ico(radius, 1), toon(greens[i % greens.length]), {
      pos: [Math.cos(a) * dist, radius * 0.85 + (i === 0 ? 0.2 : 0), Math.sin(a) * dist],
      scale: [1, 0.85, 1],
    });
  }
  const flowerCount = 12;
  for (let f = 0; f < flowerCount; f++) {
    const a = rand() * Math.PI * 2;
    const r = 0.35 + rand() * 0.35;
    const y = 0.35 + rand() * 0.6;
    const flower = part(root, G.sphere(0.08, 6, 6), toon(flowerColor), {
      pos: [Math.cos(a) * r, y, Math.sin(a) * r],
    });
    part(flower, G.sphere(0.03, 4, 4), toon(PALETTE.gold), {
      pos: [0, 0.06, 0],
      outline: false,
    });
  }
  addOutline(root);
}

function buildNature(scene: THREE.Scene, rand: () => number) {
  // the 2–4 tea bushes right beside the shop
  teaBush(scene, -5.1, 3.1, rand);
  teaBush(scene, -6.4, 1.3, rand);
  teaBush(scene, 5.7, 3.4, rand);
  teaBush(scene, 6.2, -0.8, rand);
  bananaPlant(scene, -6.6, -2.2, rand);
  bananaPlant(scene, -7.8, 0.3, rand);
  bananaPlant(scene, 7.6, -2.6, rand);
  const oaks: [number, number][] = [
    [-14, -11],
    [16, -14],
    [24, -7],
    [-26, -6],
    [-6, -23],
  ];
  for (const [x, z] of oaks) silverOak(scene, x, z, rand);

  // Coconut palms: behind the shop, along the roadside ridge, and on hillside slopes
  const coconuts: [number, number][] = [
    [-8.5, -4.2],
    [9.8, -4.8],
    [-18, 12.5],
    [16, 12.0],
    [-32, 11.0],
    [28, 13.0],
    [-22, -18.0],
    [18, -21.0],
  ];
  for (const [x, z] of coconuts) coconutPalm(scene, x, z, rand);

  // Areca nut palms (Kamuku): tall slender palms in plantation pockets
  const arecas: [number, number][] = [
    [-12.0, -7.0],
    [14.0, -6.0],
    [-4.5, -9.0],
    [21.0, -12.0],
  ];
  for (const [x, z] of arecas) arecaPalm(scene, x, z, rand);

  // Flowering Kerala shrubs (Hibiscus & Bougainvillea)
  floweringBush(scene, -6.8, 3.8, '#E63946', rand);
  floweringBush(scene, 7.2, 3.8, '#D92B6B', rand);
  floweringBush(scene, -9.2, 1.2, '#E85D04', rand);
  floweringBush(scene, 8.8, 0.8, '#E05780', rand);
  floweringBush(scene, -4.2, 3.2, '#E63946', rand);
}

function buildRoadside(scene: THREE.Scene) {
  // Kerala milestone
  const stone = group(scene, [8.4, 0, 3.4], [0, -0.35, 0]);
  part(stone, G.box(0.42, 0.55, 0.16), toon(PALETTE.softWhite), { pos: [0, 0.275, 0] });
  part(stone, G.cyl(0.21, 0.21, 0.16, 16, false, Math.PI / 2, Math.PI), toon(PALETTE.gold), {
    pos: [0, 0.55, 0],
    rot: [Math.PI / 2, 0, 0],
  });
  part(stone, G.plane(0.4, 0.5), toonUnique('#ffffff', { map: milestoneTexture() }), { pos: [0, 0.3, 0.081], outline: false });
  addOutline(stone);

  buildBusShelter(scene);

  // electric pole and drooping wires
  const pole = group(scene, [11.5, 0, 3.4]);
  part(pole, G.cyl(0.07, 0.11, 7, 6), toon('#A8A79A'), { pos: [0, 3.5, 0] });
  part(pole, G.box(0.08, 0.08, 1.2), toon('#7A7A70'), { pos: [0, 6.6, 0] });
  for (const z of [-0.5, 0.5]) part(pole, G.cyl(0.03, 0.03, 0.1, 6), toon(PALETTE.softWhite), { pos: [0, 6.7, z] });
  addOutline(pole);
  const wireMat = new THREE.LineBasicMaterial({ color: PALETTE.charcoal });
  for (const dz of [-0.5, 0.5]) {
    for (const dir of [-1, 1]) {
      const a = new THREE.Vector3(11.5, 6.72, 3.4 + dz);
      const b = new THREE.Vector3(11.5 + dir * 45, 6.4, 3.6 + dz);
      const mid = a.clone().lerp(b, 0.5);
      mid.y -= 1.6;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(30)), wireMat));
    }
  }

  // PWD black-and-white concrete boundary posts along the valley precipice
  for (let x = -56; x <= 56; x += 4.5) {
    const postY = terrainHeight(x, ROAD.valleyZ);
    const post = group(scene, [x, postY, ROAD.valleyZ]);
    part(post, G.box(0.24, 0.22, 0.2), toon('#1E1E1E'), { pos: [0, 0.11, 0] });
    part(post, G.box(0.24, 0.22, 0.2), toon('#EAEAEA'), { pos: [0, 0.33, 0] });
    part(post, G.box(0.24, 0.24, 0.2), toon('#1E1E1E'), { pos: [0, 0.56, 0] });
    part(post, G.cyl(0.12, 0.16, 0.08, 4), toon('#1E1E1E'), {
      pos: [0, 0.72, 0],
      rot: [0, Math.PI / 4, 0],
    });
    part(post, G.box(0.06, 0.06, 0.02), toon('#FF2A2A'), {
      pos: [0, 0.54, -0.105],
      outline: false,
    });
    addOutline(post);
  }

  // PWD Green directional highway signboard
  const signpost = group(scene, [-11.8, 0, 3.4], [0, 0.1, 0]);
  for (const px of [-0.65, 0.65]) {
    part(signpost, G.cyl(0.045, 0.045, 2.7, 8), toon(TONES.steelDark), { pos: [px, 1.35, 0] });
  }
  part(signpost, G.box(1.86, 0.98, 0.06), toon('#18442A'), { pos: [0, 2.05, 0] });
  part(signpost, G.plane(1.8, 0.9), toonUnique('#FFFFFF', { map: roadSignTexture() }), {
    pos: [0, 2.05, 0.035],
    outline: false,
  });
  addOutline(signpost);

  // Stack of KDHP Munnar Tea crates by the shop edge
  const crateStack = group(scene, [6.8, 0, 0.4]);
  const crateMat = toonUnique('#FFFFFF', { map: teaCrateTexture() });
  const woodSide = toon('#9C7A54');
  const ironTrim = toon('#342E28');

  const makeCrate = (parent: THREE.Object3D, pos: [number, number, number], rotY: number) => {
    const cg = group(parent, pos, [0, rotY, 0]);
    part(cg, G.box(0.68, 0.58, 0.68), woodSide, { pos: [0, 0.29, 0] });
    part(cg, G.plane(0.62, 0.52), crateMat, { pos: [0, 0.29, 0.345], outline: false });
    part(cg, G.plane(0.62, 0.52), crateMat, { pos: [0, 0.29, -0.345], rot: [0, Math.PI, 0], outline: false });
    for (const cx of [-0.34, 0.34]) {
      for (const cz of [-0.34, 0.34]) {
        part(cg, G.box(0.04, 0.58, 0.04), ironTrim, { pos: [cx, 0.29, cz], outline: false });
      }
    }
    addOutline(cg);
  };

  makeCrate(crateStack, [0, 0, 0], 0.08);
  makeCrate(crateStack, [0.74, 0, 0.05], -0.12);
  makeCrate(crateStack, [0.12, 0.58, -0.02], 0.18);
}

/** A Kerala roadside bus shelter: concrete slab roof, painted back wall, bench and a stop sign. */
function buildBusShelter(scene: THREE.Scene) {
  const g = group(scene, [BUS_STOP.x, 0, BUS_STOP.z]);
  const concrete = toon('#B9B4A6');
  const wall = toon('#E9DDC4');
  part(g, G.box(2.6, 0.12, 1.4), concrete, { pos: [0, 0.06, 0] });
  part(g, G.box(2.5, 2.1, 0.14), wall, { pos: [0, 1.17, -0.62] });
  part(g, G.box(2.52, 0.32, 0.15), toon(PALETTE.leaf), { pos: [0, 1.75, -0.615], outline: false });
  part(g, G.box(2.52, 0.08, 0.15), toon(PALETTE.gold), { pos: [0, 1.55, -0.615], outline: false });
  for (const x of [-1.15, 1.15]) part(g, G.box(0.14, 2.25, 0.14), concrete, { pos: [x, 1.18, 0.5] });
  part(g, G.box(2.9, 0.14, 1.65), concrete, { pos: [0, 2.36, -0.02], rot: [0.06, 0, 0] });
  part(g, G.box(2.0, 0.07, 0.42), toon(TONES.woodLight), { pos: [0, 0.48, -0.3] });
  for (const x of [-0.85, 0.85]) part(g, G.box(0.08, 0.42, 0.36), concrete, { pos: [x, 0.25, -0.3] });
  // stop sign on a post by the kerb
  const sign = group(scene, [BUS_STOP.x - 1.8, 0, ROAD.walkNear - 0.3]);
  part(sign, G.cyl(0.035, 0.035, 2.3, 8), toon(TONES.steelDark), { pos: [0, 1.15, 0] });
  part(sign, G.cyl(0.32, 0.32, 0.04, 24), toonUnique('#ffffff', { map: busStopTexture() }), {
    pos: [0, 2.35, 0],
    rot: [Math.PI / 2, 0, 0],
  });
  addOutline(g);
  addOutline(sign);
}
