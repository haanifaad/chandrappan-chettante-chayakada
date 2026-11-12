import * as THREE from 'three';
import { PALETTE, TONES } from './palette';
import { G, addOutline, group, limb, part, toon, toonUnique } from './toon';
import { createSteelTumblers } from './models';

/** Shop upgrades: definitions plus the 3D pieces that appear when bought. */

export type UpgradeId = 'roof' | 'stove' | 'seating' | 'hotel_wing' | 'hotel_balcony' | 'hotel_sign';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  cost: number;
  effect: string;
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'roof', name: 'Roof Improvement', cost: 90, effect: 'A striped front awning. Customers wait 10 seconds longer.' },
  { id: 'stove', name: 'Better Stove', cost: 120, effect: 'LPG gas burners. Cooking is 20% faster.' },
  { id: 'seating', name: 'Extra Seating', cost: 160, effect: 'Table, chairs and a big umbrella. One more customer can queue.' },
  { id: 'hotel_wing', name: 'Munnar Lodge Floor', cost: 350, effect: 'Upper wooden lodge floor with 4 guest rooms. Unlocks daily accommodation rent.' },
  { id: 'hotel_balcony', name: 'Valley Balcony & Suites', cost: 550, effect: 'Overlooking tea gardens. Adds 4 deluxe rooms and boosts cleanliness & tips.' },
  { id: 'hotel_sign', name: 'Residency Neon Signboard', cost: 200, effect: 'Illuminated sign on roof. Attracts more tourists and lodging visitors.' },
];

/** Awning geometry, shared with the line-of-sight fade test. */
export const AWNING = { z0: 2.95, z1: 4.15, y0: 3.6, y1: 3.38, width: 7.5 };

export interface UpgradeVisual {
  root: THREE.Group;
  /** Materials that fade with the roof when they block the camera. */
  fadeMaterials: THREE.MeshToonMaterial[];
}

export function buildUpgrade(id: UpgradeId, floor: number, hearthTop: number): UpgradeVisual {
  const root = new THREE.Group();
  root.name = `upgrade:${id}`;
  const fade: THREE.MeshToonMaterial[] = [];

  if (id === 'roof') {
    // striped canvas awning sloping toward the road
    const len = Math.hypot(AWNING.z1 - AWNING.z0, AWNING.y0 - AWNING.y1);
    const slope = Math.atan2(AWNING.y0 - AWNING.y1, AWNING.z1 - AWNING.z0);
    const sheet = group(root, [0, (AWNING.y0 + AWNING.y1) / 2, (AWNING.z0 + AWNING.z1) / 2], [slope, 0, 0]);
    const a = toonUnique(PALETTE.cream, { side: THREE.DoubleSide });
    const b = toonUnique(PALETTE.leaf, { side: THREE.DoubleSide });
    fade.push(a, b);
    const n = 16;
    const w = AWNING.width / n;
    for (let i = 0; i < n; i++) {
      part(sheet, G.box(w, 0.025, len), i % 2 ? a : b, { pos: [-AWNING.width / 2 + w * (i + 0.5), 0, 0], outline: false });
      // scalloped valance along the front edge
      part(sheet, G.cyl(w / 2, w / 2, 0.02, 12, false, 0, Math.PI), i % 2 ? a : b, {
        pos: [-AWNING.width / 2 + w * (i + 0.5), -0.02, len / 2 + 0.01],
        rot: [Math.PI / 2 - slope, 0, Math.PI / 2],
        outline: false,
      });
    }
    for (const s of [-1, 1]) {
      // poles stand back from the footpath so walkers pass in front of them
      part(root, G.cyl(0.04, 0.05, 3.46, 8), toon(TONES.woodDark), { pos: [s * 3.62, 1.73, 3.6] });
      part(root, G.sphere(0.06, 8, 6), toon(PALETTE.gold), { pos: [s * 3.62, 3.48, 3.6] });
    }
    addOutline(root);
  }

  if (id === 'stove') {
    // red LPG cylinder with a hose to the hearth, blue gas flames under the vessels
    const cyl = group(root, [-2.9, floor, 0.93]);
    const red = toon(PALETTE.terracotta);
    part(cyl, G.cyl(0.15, 0.15, 0.5, 18), red, { pos: [0, 0.27, 0] });
    part(cyl, G.sphere(0.15, 18, 8, 0, Math.PI / 2), red, { pos: [0, 0.52, 0] });
    part(cyl, G.cyl(0.11, 0.13, 0.04, 16), toon(TONES.steelDark), { pos: [0, 0.02, 0] });
    part(cyl, G.torus(0.07, 0.02, 6, 16), toon(TONES.steelDark), { pos: [0, 0.68, 0], rot: [Math.PI / 2, 0, 0] });
    part(cyl, G.cyl(0.035, 0.035, 0.1, 10), toon(TONES.steel), { pos: [0, 0.7, 0] });
    part(cyl, G.box(0.16, 0.05, 0.01), toon(PALETTE.softWhite), { pos: [0, 0.3, 0.152], outline: false });
    limb(root, [-2.9, floor + 0.74, 0.93], [-2.55, floor + 0.85, 0.6], 0.018, toon(PALETTE.charcoal));
    limb(root, [-2.55, floor + 0.85, 0.6], [-2.42, floor + 0.6, 0.3], 0.018, toon(PALETTE.charcoal));
    const flame = new THREE.MeshBasicMaterial({ color: '#6FC0FF', transparent: true, opacity: 0.9 });
    for (const z of [0.3, -0.55, -1.45]) {
      part(root, G.torus(0.13, 0.022, 6, 24), flame, { pos: [-2.78, hearthTop + 0.03, z], rot: [Math.PI / 2, 0, 0], shadow: false });
    }
    addOutline(cyl);
  }

  if (id === 'seating') {
    const set = group(root, [5.05, 0, 2.5]);
    const wood = toon(TONES.woodLight);
    part(set, G.cyl(0.46, 0.46, 0.05, 24), wood, { pos: [0, 0.74, 0] });
    part(set, G.cyl(0.05, 0.07, 0.72, 10), toon(PALETTE.wood), { pos: [0, 0.36, 0] });
    part(set, G.cyl(0.26, 0.3, 0.04, 16), toon(PALETTE.wood), { pos: [0, 0.02, 0] });
    // the classic Kerala plastic chairs
    const chair = (x: number, color: string, ry: number) => {
      const c = group(set, [x, 0, 0], [0, ry, 0]);
      const m = toon(color);
      part(c, G.box(0.42, 0.05, 0.42), m, { pos: [0, 0.45, 0] });
      part(c, G.box(0.42, 0.45, 0.05), m, { pos: [0, 0.7, -0.2], rot: [-0.12, 0, 0] });
      for (const lx of [-0.18, 0.18]) for (const lz of [-0.18, 0.18]) part(c, G.cyl(0.025, 0.03, 0.45, 6), m, { pos: [lx, 0.22, lz] });
    };
    chair(-0.72, '#C9423A', Math.PI / 2);
    chair(0.72, '#3E7FB1', -Math.PI / 2);
    // big rain umbrella
    part(set, G.cyl(0.025, 0.025, 2.4, 8), toon(TONES.steelDark), { pos: [0, 1.6, 0] });
    const canopy = group(set, [0, 2.55, 0]);
    for (let i = 0; i < 8; i++) {
      part(canopy, G.cyl(0, 1.05, 0.4, 1, false, (i / 8) * Math.PI * 2, Math.PI / 4), toon(i % 2 ? PALETTE.gold : PALETTE.leaf, { side: THREE.DoubleSide }), {
        outline: false,
      });
    }
    part(canopy, G.sphere(0.05, 8, 6), toon(PALETTE.charcoal), { pos: [0, 0.25, 0] });
    const cups = createSteelTumblers(1);
    cups.position.set(0.15, 0.765, 0.1);
    set.add(cups);
    addOutline(set);
  }

  if (id === 'hotel_wing') {
    // Upper floor lodge structure atop the rear of the shop
    const lodge = group(root, [0, 4.2, -1.2]);
    const woodWall = toon(TONES.woodDark);
    const tileMat = toon('#A8422B');
    const windowMat = toonUnique('#FFE89C');

    // Main second-storey wooden block
    part(lodge, G.box(6.8, 1.8, 3.2), woodWall, { pos: [0, 0.9, 0] });

    // Sloping tiled roof on upper floor
    part(lodge, G.box(7.2, 0.1, 3.6), tileMat, { pos: [0, 1.85, 0], rot: [0.08, 0, 0] });
    // Decorative roof ridge
    part(lodge, G.cyl(0.08, 0.08, 7.3, 8), toon('#702515'), { pos: [0, 1.95, 0], rot: [0, 0, Math.PI / 2] });

    // 4 room windows with warm lighting
    for (const wx of [-2.4, -0.8, 0.8, 2.4]) {
      part(lodge, G.box(0.7, 0.8, 0.1), windowMat, { pos: [wx, 0.9, 1.62] });
      // wooden cross mullions
      part(lodge, G.box(0.74, 0.04, 0.12), woodWall, { pos: [wx, 0.9, 1.63] });
      part(lodge, G.box(0.04, 0.84, 0.12), woodWall, { pos: [wx, 0.9, 1.63] });
    }
    addOutline(lodge);
  }

  if (id === 'hotel_balcony') {
    // Cantilevered wooden balcony on upper storey overlooking valley
    const balc = group(root, [0, 4.0, 0.7]);
    const teak = toon(TONES.woodMid);
    // Floor deck
    part(balc, G.box(6.0, 0.1, 1.0), teak, { pos: [0, 0, 0] });
    // Support diagonal timber brackets underneath
    for (const bx of [-2.4, -0.8, 0.8, 2.4]) {
      part(balc, G.box(0.1, 0.8, 0.1), teak, { pos: [bx, -0.35, -0.2], rot: [0.6, 0, 0] });
    }
    // Balustrade railings along front and sides
    part(balc, G.box(6.0, 0.06, 0.06), teak, { pos: [0, 0.75, 0.48] });
    part(balc, G.box(0.06, 0.06, 1.0), teak, { pos: [-2.97, 0.75, 0] });
    part(balc, G.box(0.06, 0.06, 1.0), teak, { pos: [2.97, 0.75, 0] });
    // Vertical balusters
    for (let i = -14; i <= 14; i++) {
      part(balc, G.cyl(0.02, 0.02, 0.7, 6), teak, { pos: [i * 0.2, 0.38, 0.48] });
    }
    // Flower boxes with green planters
    for (const fx of [-1.8, 0, 1.8]) {
      part(balc, G.box(0.9, 0.2, 0.25), toon('#355E3B'), { pos: [fx, 0.4, 0.62] });
      part(balc, G.sphere(0.12, 6, 6), toon('#E85D75'), { pos: [fx - 0.25, 0.52, 0.62] });
      part(balc, G.sphere(0.12, 6, 6), toon('#FFD166'), { pos: [fx + 0.25, 0.52, 0.62] });
    }
    addOutline(balc);
  }

  if (id === 'hotel_sign') {
    // Grand wooden hotel sign on the roof ridge
    const sign = group(root, [0, 4.9, 0.5]);
    const frame = toon(PALETTE.forest);
    const gold = toon(PALETTE.gold);
    // Wooden sign board
    part(sign, G.box(4.2, 0.75, 0.12), frame, { pos: [0, 0, 0] });
    part(sign, G.box(4.0, 0.55, 0.14), toon(PALETTE.cream), { pos: [0, 0, 0] });
    // Gold ornamental corner caps
    for (const cx of [-2.0, 2.0]) {
      for (const cy of [-0.3, 0.3]) {
        part(sign, G.sphere(0.07, 6, 6), gold, { pos: [cx, cy, 0.08] });
      }
    }
    // Top brass lantern
    part(sign, G.cyl(0.02, 0.02, 0.3, 6), gold, { pos: [0, 0.5, 0] });
    part(sign, G.sphere(0.12, 8, 6), toon('#FFF275'), { pos: [0, 0.65, 0] });
    addOutline(sign);
  }

  return { root, fadeMaterials: fade };
}
