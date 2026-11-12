import * as THREE from 'three';
import { PALETTE, TONES } from './palette';
import { G, V3, group, limb, part, toon, toonUnique } from './toon';

/** Procedural character, cooking-station and prop models. */

const PI = Math.PI;
const glassMat = () => toon(TONES.glass, { opacity: 0.42 });

// ================================================================ Chandrappan

export interface ShopkeeperLook {
  shirt: string;
  apron: string;
}

export type CharacterAnimState = 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'sit' | 'carry' | 'sleep';

export interface Shopkeeper {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  shirt: THREE.MeshToonMaterial;
  apron: THREE.MeshToonMaterial;
  update(t: number): void;
  setAnimationState(state: CharacterAnimState, speed: number, dt: number): void;
}

export function createShopkeeper(look: ShopkeeperLook = { shirt: TONES.shirt, apron: PALETTE.terracotta }): Shopkeeper {
  const root = new THREE.Group();
  root.name = 'Chandrappan';
  const body = group(root);
  const skin = toon(TONES.skin);
  const shirt = toonUnique(look.shirt);
  const apron = toonUnique(look.apron, { side: THREE.DoubleSide });
  const mundu = toon(PALETTE.softWhite);
  const gold = toon(PALETTE.gold);
  const dark = toon(PALETTE.charcoal);
  const silverGray = toon('#8A8884');
  const chrome = toon(TONES.steel);

  // Legs with hip pivots for natural walking, running and sitting
  const legs: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const hip = group(body, [s * 0.14, 0.76, 0]);
    // Traditional Kasavu Mundu leg fold
    part(hip, G.cyl(0.14, 0.165, 0.72, 16), mundu, { pos: [0, -0.36, 0] });
    // Woven golden Kasavu zari border at the bottom
    part(hip, G.cyl(0.165, 0.168, 0.08, 16), gold, { pos: [0, -0.67, 0] });
    part(hip, G.cyl(0.169, 0.17, 0.02, 16), toon('#B8860B'), { pos: [0, -0.7, 0], outline: false });

    // Authentic Kerala leather chappal (strapped slipper)
    const foot = group(hip, [0, -0.74, 0.05]);
    part(foot, G.box(0.13, 0.035, 0.28), toon('#4A2810'), { pos: [0, 0, 0] }); // sole
    part(foot, G.sphere(0.068), skin, { pos: [0, 0.04, 0.06], scale: [1, 0.58, 1.25] }); // bare foot
    // Chappal leather straps
    part(foot, G.box(0.12, 0.02, 0.05), toon('#321808'), { pos: [0, 0.06, 0.04], rot: [0.35, 0, 0], outline: false });
    part(foot, G.cyl(0.012, 0.012, 0.05, 6), toon('#321808'), { pos: [s * 0.02, 0.04, 0.1], outline: false }); // toe loop
    legs.push(hip);
  }
  const leftLeg = legs[0];
  const rightLeg = legs[1];

  // Mundu upper waist wrap with gold border fold ("Kavani")
  part(body, G.torus(0.285, 0.05, 8, 28), mundu, { pos: [0, 0.81, 0], rot: [PI / 2, 0, 0] });
  part(body, G.box(0.04, 0.45, 0.02), gold, { pos: [0.1, 0.65, 0.276], rot: [-0.065, 0, 0] });

  // Leather money belt with brass buckle
  const belt = group(body, [0, 0.84, 0]);
  part(belt, G.torus(0.29, 0.02, 6, 24), toon('#3A1E0E'), { rot: [PI / 2, 0, 0] });
  part(belt, G.box(0.08, 0.06, 0.03), gold, { pos: [0, 0, 0.292] }); // buckle

  // Torso with a proud round tea-master belly
  part(body, G.capsule(0.3, 0.3, 6, 18), shirt, { pos: [0, 1.1, 0], scale: [1, 1, 0.82] });
  part(body, G.sphere(0.31, 22, 16), shirt, { pos: [0, 0.98, 0.06], scale: [1, 0.92, 0.92] });

  // Apron: skirt, bib, straps, waist tie, large pocket
  part(body, G.cyl(0.355, 0.375, 0.54, 24, true, -PI * 0.36, PI * 0.72), apron, { pos: [0, 0.91, 0] });
  part(body, G.box(0.34, 0.27, 0.03), apron, { pos: [0, 1.29, 0.262], rot: [-0.1, 0, 0] });
  for (const s of [-1, 1]) limb(body, [s * 0.15, 1.41, 0.25], [s * 0.11, 1.56, 0.02], 0.016, apron);
  part(body, G.torus(0.33, 0.014, 6, 32), apron, { pos: [0, 1.17, 0], rot: [PI / 2, 0, 0], scale: [1, 0.82, 1] });
  // Apron pocket
  const pocket = group(body, [0, 0.74, 0.376]);
  part(pocket, G.box(0.22, 0.14, 0.025), gold, { pos: [0, 0, 0] });

  // Stainless Steel Tea Strainer (Arippa) tucked in Chandrappan's apron pocket
  const strainer = group(pocket, [0.08, 0.08, 0.02]);
  part(strainer, G.cyl(0.045, 0.02, 0.06, 10), chrome, { pos: [0, 0, 0], rot: [0.2, 0, 0.3] }); // mesh cone
  limb(strainer, [0, 0.03, 0], [0.06, 0.16, 0.04], 0.008, chrome); // wire handle

  // Arms with rolled-up half sleeves
  const arms: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const shoulder = group(body, [s * 0.33, 1.38, 0]);
    part(shoulder, G.sphere(0.115, 16, 12), shirt, { pos: [0, 0, 0] });
    limb(shoulder, [0, 0, 0], [s * 0.08, -0.26, 0.02], 0.096, shirt);
    // Rolled sleeve cuff fold
    part(shoulder, G.torus(0.082, 0.022, 6, 16), shirt, { pos: [s * 0.08, -0.26, 0.02], rot: [PI / 2, 0, 0] });
    // Forearm & hand
    limb(shoulder, [s * 0.08, -0.26, 0.02], [s * 0.05, -0.52, 0.18], 0.074, skin);
    part(shoulder, G.sphere(0.086, 14, 10), skin, { pos: [s * 0.05, -0.54, 0.19] });

    // Sacred red-and-black thread on right wrist ("Kappu Charadu")
    if (s === 1) {
      part(shoulder, G.torus(0.065, 0.008, 4, 14), toon('#A0241A'), { pos: [0.05, -0.48, 0.16], rot: [PI / 2, 0, 0], outline: false });
    }
    arms.push(shoulder);
  }
  const leftArm = arms[0];
  const rightArm = arms[1];

  // Neck + collar
  part(body, G.cyl(0.09, 0.1, 0.16, 12), skin, { pos: [0, 1.56, 0.01] });
  part(body, G.torus(0.12, 0.035, 6, 18), shirt, { pos: [0, 1.5, 0.01], rot: [PI / 2, 0, 0] });

  // Traditional Kerala Cotton Thorthu (towel) draped over shoulder with terracotta/red border
  const towel = toon(PALETTE.softWhite);
  const towelBorder = toon(PALETTE.terracotta);
  part(body, G.box(0.18, 0.045, 0.46), towel, { pos: [-0.25, 1.48, 0], rot: [0, 0, 0.28] });
  // Front drape
  const drapeF = part(body, G.box(0.18, 0.44, 0.04), towel, { pos: [-0.22, 1.25, 0.22], rot: [-0.15, 0, 0.1] });
  part(drapeF, G.box(0.184, 0.04, 0.045), towelBorder, { pos: [0, -0.15, 0], outline: false });
  part(drapeF, G.box(0.184, 0.015, 0.045), towelBorder, { pos: [0, -0.1, 0], outline: false });
  // Back drape
  const drapeB = part(body, G.box(0.18, 0.44, 0.04), towel, { pos: [-0.22, 1.25, -0.22], rot: [0.15, 0, 0.1] });
  part(drapeB, G.box(0.184, 0.04, 0.045), towelBorder, { pos: [0, -0.15, 0], outline: false });

  // Head
  const head = group(body, [0, 1.8, 0.02]);
  part(head, G.sphere(0.27, 26, 20), skin, { scale: [1, 0.96, 0.94] });

  // Chandana Kuri (sandalwood paste mark) and Kumkum pottu on forehead
  const forehead = group(head, [0, 0.13, 0.245]);
  part(forehead, G.box(0.09, 0.018, 0.01), toon('#FFF2D0'), { outline: false }); // yellow sandalwood line
  part(forehead, G.sphere(0.012, 6, 6), toon('#B01E18'), { pos: [0, -0.015, 0.005], outline: false }); // red bindi

  // Ears with traditional Golden "Kadukkan" (earrings)
  for (const s of [-1, 1]) {
    const ear = group(head, [s * 0.262, 0, -0.01]);
    part(ear, G.sphere(0.065, 12, 10), skin, { scale: [0.55, 1, 0.8] });
    // Golden Kadukkan stud
    part(ear, G.sphere(0.022, 8, 6), gold, { pos: [s * 0.03, -0.045, 0.01], outline: false });

    // Side salt-and-pepper hair
    part(head, G.sphere(0.09, 12, 10), dark, { pos: [s * 0.235, 0.07, -0.07], scale: [0.5, 0.85, 1] });
    part(head, G.sphere(0.065, 10, 8), silverGray, { pos: [s * 0.242, 0.05, -0.06], scale: [0.45, 0.65, 0.8], outline: false });

    // Expressive eyes with twinkle highlight & crow's feet
    part(head, G.sphere(0.038, 12, 10), dark, { pos: [s * 0.095, 0.035, 0.232], scale: [1, 1.25, 0.6] });
    part(head, G.sphere(0.014, 6, 6), toon(PALETTE.softWhite), { pos: [s * 0.095 + 0.012, 0.052, 0.252], outline: false });

    // Friendly thick eyebrows
    part(head, G.box(0.11, 0.028, 0.032), dark, { pos: [s * 0.1, 0.115, 0.23], rot: [0, 0, -s * 0.18] });

    // Rosy laughing cheeks
    part(head, G.sphere(0.055, 10, 8), toon(TONES.blush), { pos: [s * 0.152, -0.05, 0.2], scale: [1, 0.7, 0.5], outline: false });

    // The Famous Curled Kerala "Komban" Moustache
    limb(head, [s * 0.012, -0.076, 0.262], [s * 0.12, -0.098, 0.235], 0.036, dark);
    limb(head, [s * 0.12, -0.098, 0.235], [s * 0.165, -0.065, 0.21], 0.028, dark); // upward twirl!
  }

  // Receding hair cap with silver-gray temple highlights
  part(head, G.sphere(0.285, 24, 12, 0, PI * 0.42), dark, { pos: [0, 0.01, -0.03], rot: [-0.75, 0, 0] });
  part(head, G.sphere(0.286, 20, 10, 0, PI * 0.32), silverGray, { pos: [0, -0.02, -0.08], rot: [-0.95, 0, 0], outline: false });

  // Big friendly Kerala nose
  part(head, G.sphere(0.062, 12, 10), toon(TONES.skinDark), { pos: [0, -0.02, 0.268], scale: [1, 0.9, 0.9] });

  // Warm, smiling mouth
  part(head, G.torus(0.052, 0.014, 6, 12, PI), toon('#6E2A1F'), { pos: [0, -0.142, 0.232], rot: [0, 0, PI] });
  part(head, G.box(0.045, 0.012, 0.01), toon(PALETTE.softWhite), { pos: [0, -0.134, 0.236], outline: false }); // teeth smile!

  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });

  let walkPhase = 0;

  return {
    root,
    body,
    head,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    shirt,
    apron,
    update(t: number) {
      body.position.y = Math.sin(t * 1.6) * 0.006;
      body.scale.y = 1 + Math.sin(t * 1.6) * 0.006;
      head.rotation.z = 0.05 + Math.sin(t * 0.8) * 0.05;
      head.rotation.x = Math.sin(t * 0.55) * 0.04;
    },
    setAnimationState(state: CharacterAnimState, speed: number, dt: number) {
      if (state === 'walk' || state === 'run') {
        const freq = state === 'run' ? 14 : 9;
        const amp = state === 'run' ? 0.75 : 0.5;
        walkPhase += dt * freq * Math.max(0.4, speed / 3);

        const legSwing = Math.sin(walkPhase) * amp;
        leftLeg.rotation.x = legSwing;
        rightLeg.rotation.x = -legSwing;
        leftLeg.position.y = 0;
        rightLeg.position.y = 0;

        leftArm.rotation.x = -legSwing * 0.8;
        rightArm.rotation.x = legSwing * 0.8;
        leftArm.rotation.z = -0.1;
        rightArm.rotation.z = 0.1;

        body.position.y = Math.abs(Math.sin(walkPhase)) * (state === 'run' ? 0.08 : 0.04);
        body.rotation.y = Math.sin(walkPhase) * 0.08;
      } else if (state === 'sit') {
        // Sitting on chair/bench: hips bent forward 90 degrees, knees down
        leftLeg.rotation.x = -PI / 2;
        rightLeg.rotation.x = -PI / 2;
        leftLeg.position.y = -0.28;
        rightLeg.position.y = -0.28;

        leftArm.rotation.x = -0.4;
        rightArm.rotation.x = -0.4;
        leftArm.rotation.z = -0.15;
        rightArm.rotation.z = 0.15;

        body.position.y = -0.32;
        body.rotation.y = 0;
      } else if (state === 'carry') {
        const freq = 9;
        walkPhase += dt * freq * Math.max(0.4, speed / 3);
        const legSwing = speed > 0.1 ? Math.sin(walkPhase) * 0.45 : 0;
        leftLeg.rotation.x = legSwing;
        rightLeg.rotation.x = -legSwing;
        leftLeg.position.y = 0;
        rightLeg.position.y = 0;

        // Holding tray/cup with both hands in front
        leftArm.rotation.x = -0.85;
        leftArm.rotation.z = 0.25;
        rightArm.rotation.x = -0.85;
        rightArm.rotation.z = -0.25;

        body.position.y = speed > 0.1 ? Math.abs(Math.sin(walkPhase)) * 0.03 : 0;
        body.rotation.y = 0;
      } else if (state === 'jump' || state === 'fall') {
        leftLeg.rotation.x = -0.35;
        rightLeg.rotation.x = 0.2;
        leftArm.rotation.x = -1.1;
        rightArm.rotation.x = -1.1;
        body.position.y = 0.05;
        body.rotation.y = 0;
      } else if (state === 'sleep') {
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
        leftArm.rotation.x = -0.2;
        rightArm.rotation.x = -0.2;
        body.position.y = -0.7;
        body.rotation.x = -PI / 2;
      } else {
        // Idle breathing
        walkPhase *= 0.85;
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
        leftLeg.position.y = 0;
        rightLeg.position.y = 0;
        leftArm.rotation.x = 0;
        rightArm.rotation.x = 0;
        leftArm.rotation.z = 0;
        rightArm.rotation.z = 0;
        body.position.y = Math.sin(walkPhase) * 0.006;
        body.rotation.y = 0;
        body.rotation.x = 0;
      }
    },
  };
}

// ============================================================ small kitchenware

export function createTeaGlass(parent: THREE.Object3D, pos: V3, scale = 1, filled = true): THREE.Group {
  const g = group(parent, pos);
  g.scale.setScalar(scale);
  part(g, G.cyl(0.05, 0.041, 0.15, 14), glassMat(), { pos: [0, 0.075, 0], shadow: false });
  if (filled) {
    part(g, G.cyl(0.044, 0.038, 0.1, 12), toon(TONES.tea), { pos: [0, 0.055, 0], outline: false });
    part(g, G.cyl(0.046, 0.044, 0.025, 12), toon(PALETTE.cream), { pos: [0, 0.115, 0], outline: false });
  }
  return g;
}

export function createGlassTray(): THREE.Group {
  const g = new THREE.Group();
  part(g, G.cyl(0.25, 0.24, 0.02, 24), toon(TONES.steel), { pos: [0, 0.01, 0] });
  part(g, G.torus(0.245, 0.012, 6, 28), toon(TONES.steelDark), { pos: [0, 0.022, 0], rot: [PI / 2, 0, 0] });
  const spots: [number, number, boolean][] = [
    [-0.12, -0.08, true],
    [0.0, -0.12, true],
    [0.12, -0.06, false],
    [-0.06, 0.08, false],
    [0.08, 0.1, true],
  ];
  for (const [x, z, f] of spots) createTeaGlass(g, [x, 0.02, z], 1, f);
  return g;
}

export function createJar(content: string, lid: string, r = 0.1, h = 0.26, fill = 0.68): THREE.Group {
  const g = new THREE.Group();
  part(g, G.cyl(r * 0.88, r * 0.88, h * fill, 14), toon(content), { pos: [0, (h * fill) / 2 + 0.01, 0], outline: false });
  part(g, G.cyl(r, r, h, 16), glassMat(), { pos: [0, h / 2, 0], shadow: false });
  part(g, G.cyl(r * 0.92, r * 0.92, 0.05, 16), toon(lid), { pos: [0, h + 0.02, 0] });
  part(g, G.sphere(r * 0.3, 10, 8), toon(lid), { pos: [0, h + 0.05, 0] });
  return g;
}

export function createSodaBottle(): THREE.Group {
  const g = new THREE.Group();
  const bottle = toon('#5FA36E', { opacity: 0.7 });
  part(g, G.cyl(0.045, 0.045, 0.2, 12), bottle, { pos: [0, 0.1, 0], shadow: false });
  part(g, G.cyl(0.022, 0.045, 0.07, 12), bottle, { pos: [0, 0.235, 0], shadow: false });
  part(g, G.sphere(0.022, 8, 6), toon('#8FD1E0'), { pos: [0, 0.28, 0], outline: false });
  part(g, G.cyl(0.022, 0.022, 0.02, 10), toon(PALETTE.terracotta), { pos: [0, 0.3, 0] });
  return g;
}

export function createSteelTumblers(n = 3): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) part(g, G.cyl(0.05, 0.04, 0.12, 14), toon(TONES.steel), { pos: [0, 0.06 + i * 0.05, 0] });
  return g;
}

export function createTin(color: string, band: string, w = 0.26, h = 0.22, d = 0.2): THREE.Group {
  const g = new THREE.Group();
  part(g, G.box(w, h, d), toon(color), { pos: [0, h / 2, 0] });
  part(g, G.box(w + 0.01, h * 0.28, d + 0.01), toon(band), { pos: [0, h * 0.5, 0], outline: false });
  part(g, G.box(w + 0.02, 0.03, d + 0.02), toon(TONES.steelDark), { pos: [0, h + 0.015, 0] });
  return g;
}

export function createMilkCan(): THREE.Group {
  const g = new THREE.Group();
  part(
    g,
    G.lathe('milkcan', [
      [0, 0],
      [0.11, 0],
      [0.12, 0.02],
      [0.12, 0.26],
      [0.07, 0.32],
      [0.07, 0.36],
      [0, 0.36],
    ], 20),
    toon(TONES.steel),
  );
  part(g, G.cyl(0.08, 0.08, 0.04, 16), toon(TONES.steelDark), { pos: [0, 0.37, 0] });
  for (const s of [-1, 1]) part(g, G.torus(0.04, 0.01, 6, 10, PI), toon(TONES.steelDark), { pos: [s * 0.12, 0.27, 0], rot: [0, PI / 2, s * -PI / 2] });
  return g;
}

export function createSack(color = '#E7D9B8'): THREE.Group {
  const g = new THREE.Group();
  part(g, G.sphere(0.2, 16, 12), toon(color), { pos: [0, 0.2, 0], scale: [1, 1.15, 0.9] });
  part(g, G.cyl(0.07, 0.1, 0.12, 12), toon(color), { pos: [0, 0.46, 0] });
  part(g, G.torus(0.07, 0.016, 6, 14), toon(PALETTE.wood), { pos: [0, 0.44, 0], rot: [PI / 2, 0, 0] });
  part(g, G.box(0.18, 0.1, 0.01), toon(PALETTE.leaf), { pos: [0, 0.2, 0.18], outline: false });
  return g;
}

export function createCoconut(parent: THREE.Object3D, pos: V3, r = 0.1): THREE.Mesh {
  return part(parent, G.ico(r, 1), toon(TONES.coconut), { pos, scale: [1, 0.92, 1] });
}

export function createBasket(): THREE.Group {
  const g = new THREE.Group();
  part(g, G.cyl(0.28, 0.21, 0.24, 18), toon('#B88A4A'), { pos: [0, 0.12, 0] });
  part(g, G.torus(0.28, 0.025, 6, 24), toon('#9C7038'), { pos: [0, 0.24, 0], rot: [PI / 2, 0, 0] });
  for (let i = 0; i < 4; i++) part(g, G.torus(0.25 - i * 0.012, 0.008, 4, 24), toon('#9C7038'), { pos: [0, 0.05 + i * 0.05, 0], rot: [PI / 2, 0, 0], outline: false });
  createCoconut(g, [-0.09, 0.27, 0.04]);
  createCoconut(g, [0.1, 0.27, -0.03]);
  createCoconut(g, [0.0, 0.33, 0.06]);
  return g;
}

export function createSteelBowl(content?: string): THREE.Group {
  const g = new THREE.Group();
  part(
    g,
    G.lathe('bowl', [
      [0, 0],
      [0.08, 0],
      [0.14, 0.04],
      [0.17, 0.1],
      [0.175, 0.105],
    ], 20),
    toon(TONES.steel, { side: THREE.DoubleSide }),
  );
  if (content) part(g, G.circle(0.15, 20), toon(content), { pos: [0, 0.075, 0], rot: [-PI / 2, 0, 0], outline: false });
  return g;
}

export function createLantern(): THREE.Group {
  const g = new THREE.Group();
  const red = toon(PALETTE.terracotta);
  part(g, G.cyl(0.09, 0.1, 0.07, 14), red, { pos: [0, 0.035, 0] });
  part(g, G.sphere(0.08, 14, 10), toon('#FFE8B0', { opacity: 0.55 }), { pos: [0, 0.16, 0], scale: [1, 1.25, 1] });
  part(g, G.cone(0.08, 0.06, 14), red, { pos: [0, 0.29, 0] });
  for (const a of [0, PI / 2]) part(g, G.box(0.006, 0.22, 0.17), toon(PALETTE.charcoal), { pos: [0, 0.17, 0], rot: [0, a, 0], outline: false });
  part(g, G.torus(0.07, 0.008, 4, 16, PI), toon(PALETTE.charcoal), { pos: [0, 0.32, 0] });
  return g;
}

export function createWallClock(): THREE.Group {
  const g = new THREE.Group();
  part(g, G.cyl(0.17, 0.17, 0.04, 24), toon(PALETTE.softWhite), { rot: [PI / 2, 0, 0] });
  part(g, G.torus(0.17, 0.025, 6, 24), toon(PALETTE.wood), {});
  part(g, G.box(0.015, 0.1, 0.01), toon(PALETTE.charcoal), { pos: [0, 0.04, 0.025], outline: false });
  part(g, G.box(0.07, 0.015, 0.01), toon(PALETTE.charcoal), { pos: [0.03, 0, 0.025], rot: [0, 0, 0.5], outline: false });
  return g;
}

// =============================================================== food models

export function createPazhampori(parent: THREE.Object3D, pos: V3, rotY = 0): THREE.Mesh {
  return part(parent, G.capsule(0.045, 0.12, 4, 10), toon(TONES.fried), { pos, rot: [0, rotY, PI / 2], scale: [1, 1, 0.7] });
}

export function createVada(parent: THREE.Object3D, pos: V3): THREE.Mesh {
  return part(parent, G.cyl(0.065, 0.07, 0.035, 12), toon(TONES.friedDark), { pos });
}

export function createUnniyappam(parent: THREE.Object3D, pos: V3): THREE.Mesh {
  return part(parent, G.sphere(0.035, 10, 8), toon('#7A4424'), { pos, scale: [1, 0.8, 1] });
}

// ============================================================ cooking stations

export interface StationModel {
  root: THREE.Group;
  steam: THREE.Vector3[];
}

/** Brass pump stove with the big aluminium chaya kettle. */
export function createChayaStation(): StationModel {
  const root = new THREE.Group();
  const brass = toon(TONES.brass);
  const iron = toon(TONES.iron);
  const steel = toon(TONES.steel);
  part(root, G.cyl(0.15, 0.17, 0.13, 20), brass, { pos: [0, 0.065, 0] });
  part(root, G.torus(0.15, 0.015, 6, 24), toon(TONES.brassDark), { pos: [0, 0.13, 0], rot: [PI / 2, 0, 0] });
  part(root, G.cyl(0.025, 0.025, 0.1, 8), iron, { pos: [0, 0.18, 0] });
  part(root, G.cyl(0.07, 0.055, 0.035, 16), iron, { pos: [0, 0.24, 0] });
  limb(root, [0.12, 0.12, 0.06], [0.16, 0.22, 0.08], 0.016, iron);
  part(root, G.sphere(0.026, 8, 6), toon(PALETTE.charcoal), { pos: [0.16, 0.24, 0.08] });
  part(root, G.cone(0.06, 0.09, 12), new THREE.MeshBasicMaterial({ color: '#7FC4FF', transparent: true, opacity: 0.8 }), {
    pos: [0, 0.3, 0],
    shadow: false,
  });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    limb(root, [Math.cos(a) * 0.13, 0.13, Math.sin(a) * 0.13], [Math.cos(a) * 0.17, 0.32, Math.sin(a) * 0.17], 0.012, iron);
  }
  part(root, G.torus(0.17, 0.013, 6, 24), iron, { pos: [0, 0.32, 0], rot: [PI / 2, 0, 0] });

  const kettle = group(root, [0, 0.33, 0]);
  part(
    kettle,
    G.lathe('kettle', [
      [0, 0],
      [0.17, 0],
      [0.22, 0.04],
      [0.235, 0.14],
      [0.215, 0.25],
      [0.15, 0.31],
      [0.085, 0.33],
      [0.085, 0.35],
      [0, 0.35],
    ], 28),
    steel,
  );
  part(kettle, G.torus(0.085, 0.012, 6, 20), toon(TONES.steelDark), { pos: [0, 0.345, 0], rot: [PI / 2, 0, 0] });
  part(kettle, G.sphere(0.035, 10, 8), toon(PALETTE.charcoal), { pos: [0, 0.38, 0] });
  limb(kettle, [0.18, 0.1, 0], [0.36, 0.3, 0], 0.028, steel);
  part(kettle, G.torus(0.17, 0.018, 6, 20, PI), toon(PALETTE.charcoal), { pos: [0, 0.34, 0], rot: [0, PI / 2, 0] });
  return { root, steam: [new THREE.Vector3(0.37, 0.66, 0), new THREE.Vector3(0, 0.72, 0)] };
}

/** Iron cheenachatti full of hot oil with pazhampori and vada frying. */
export function createFryerStation(): StationModel {
  const root = new THREE.Group();
  const iron = toon(TONES.iron, { side: THREE.DoubleSide });
  const pan = group(root, [0, 0.03, 0]);
  part(
    pan,
    G.lathe('cheenachatti', [
      [0, 0],
      [0.12, 0.005],
      [0.24, 0.04],
      [0.33, 0.11],
      [0.38, 0.19],
      [0.395, 0.2],
    ], 30),
    iron,
  );
  part(pan, G.circle(0.35, 30), toon('#C98B2E', { emissive: '#5A3410', emissiveIntensity: 0.6 }), {
    pos: [0, 0.15, 0],
    rot: [-PI / 2, 0, 0],
    outline: false,
  });
  part(pan, G.torus(0.06, 0.016, 6, 12, PI), toon(TONES.iron), { pos: [0.4, 0.19, 0], rot: [PI / 2, 0, -PI / 2] });
  part(pan, G.torus(0.06, 0.016, 6, 12, PI), toon(TONES.iron), { pos: [-0.4, 0.19, 0], rot: [PI / 2, 0, PI / 2] });
  createPazhampori(pan, [-0.1, 0.165, 0.08], 0.4);
  createPazhampori(pan, [0.08, 0.165, -0.1], -0.7);
  createVada(pan, [0.12, 0.16, 0.12]);
  createVada(pan, [-0.12, 0.16, -0.12]);
  return { root, steam: [new THREE.Vector3(0, 0.3, 0)] };
}

/** Flat iron dosa tawa with a golden dosa on it. */
export function createTawaStation(): StationModel {
  const root = new THREE.Group();
  const iron = toon(TONES.iron);
  part(root, G.cyl(0.33, 0.31, 0.025, 30), iron, { pos: [0, 0.03, 0] });
  part(root, G.cyl(0.27, 0.27, 0.008, 30), toon('#E3B465'), { pos: [0, 0.046, 0] });
  part(root, G.cyl(0.17, 0.17, 0.006, 24), toon('#F0D49A'), { pos: [0, 0.05, 0], outline: false });
  part(root, G.torus(0.265, 0.01, 4, 30), toon('#B9772F'), { pos: [0, 0.05, 0], rot: [PI / 2, 0, 0], outline: false });
  part(root, G.box(0.24, 0.025, 0.05), iron, { pos: [0.42, 0.035, 0] });
  part(root, G.cyl(0.03, 0.03, 0.14, 10), toon(PALETTE.wood), { pos: [0.6, 0.035, 0], rot: [0, 0, PI / 2] });
  return { root, steam: [new THREE.Vector3(0, 0.1, 0)] };
}

/** Aluminium puttu kudam with the tall puttu kutti tube. */
export function createPuttuStation(): StationModel {
  const root = new THREE.Group();
  const steel = toon(TONES.steel);
  const ring = toon(TONES.steelDark);
  part(
    root,
    G.lathe('puttupot', [
      [0, 0],
      [0.15, 0],
      [0.2, 0.06],
      [0.21, 0.14],
      [0.17, 0.22],
      [0.09, 0.26],
      [0.09, 0.29],
      [0, 0.29],
    ], 24),
    steel,
    { pos: [0, 0.02, 0] },
  );
  for (const s of [-1, 1]) part(root, G.torus(0.04, 0.01, 6, 10, PI), ring, { pos: [s * 0.21, 0.18, 0], rot: [0, PI / 2, s * -PI / 2] });
  part(root, G.cyl(0.075, 0.075, 0.42, 20), steel, { pos: [0, 0.52, 0] });
  for (const y of [0.36, 0.52, 0.68]) part(root, G.torus(0.078, 0.012, 6, 20), ring, { pos: [0, y, 0], rot: [PI / 2, 0, 0] });
  part(root, G.cyl(0.085, 0.085, 0.03, 20), ring, { pos: [0, 0.745, 0] });
  part(root, G.sphere(0.022, 8, 6), toon(PALETTE.charcoal), { pos: [0, 0.775, 0] });
  return { root, steam: [new THREE.Vector3(0, 0.8, 0)] };
}

// ================================================================= furniture

export function createStool(): THREE.Group {
  const g = new THREE.Group();
  const wood = toon(TONES.woodLight);
  part(g, G.cyl(0.22, 0.22, 0.06, 18), wood, { pos: [0, 0.5, 0] });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2 + 0.3;
    limb(g, [Math.cos(a) * 0.13, 0.48, Math.sin(a) * 0.13], [Math.cos(a) * 0.2, 0.02, Math.sin(a) * 0.2], 0.025, toon(PALETTE.wood));
  }
  return g;
}

export function createBench(len = 1.8): THREE.Group {
  const g = new THREE.Group();
  const wood = toon(TONES.woodLight);
  part(g, G.box(0.42, 0.06, len), wood, { pos: [0, 0.46, 0] });
  for (const z of [-len / 2 + 0.15, len / 2 - 0.15])
    for (const x of [-0.15, 0.15]) part(g, G.box(0.06, 0.44, 0.06), toon(PALETTE.wood), { pos: [x, 0.22, z] });
  part(g, G.box(0.04, 0.05, len - 0.3), toon(PALETTE.wood), { pos: [0, 0.14, 0] });
  return g;
}

export function createBananaBunch(): THREE.Group {
  const g = new THREE.Group();
  part(g, G.cyl(0.006, 0.006, 0.5, 4), toon(PALETTE.charcoal), { pos: [0, 0.25, 0], outline: false });
  part(g, G.cyl(0.035, 0.045, 0.7, 10), toon('#6F7A3A'), { pos: [0, -0.3, 0] });
  const banana = toon(TONES.banana);
  const tiers = 4;
  for (let t = 0; t < tiers; t++) {
    const n = 7 - t;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2 + t * 0.5;
      const hand = group(g, [0, -0.08 - t * 0.15, 0], [0, a, 0]);
      part(hand, G.torus(0.12, 0.03, 6, 10, 1.3), banana, { pos: [0.02, -0.11, 0], rot: [0, 0, 0.35], outline: false });
    }
  }
  return g;
}

export function createSnackStrip(): THREE.Group {
  const g = new THREE.Group();
  const colors = [PALETTE.gold, PALETTE.terracotta, PALETTE.leaf, PALETTE.cream, PALETTE.gold];
  part(g, G.cyl(0.005, 0.005, 1.0, 4), toon(PALETTE.charcoal), { pos: [0, -0.5, 0], outline: false });
  colors.forEach((c, i) => part(g, G.box(0.14, 0.17, 0.025), toon(c), { pos: [0, -0.15 - i * 0.19, 0], rot: [0, i * 0.4, 0.05] }));
  return g;
}

/** Classic wood-and-glass snack almirah for the counter. */
export function createDisplayCase(): THREE.Group {
  const g = new THREE.Group();
  const wood = toon(TONES.woodLight);
  const W = 0.95;
  const D = 0.55;
  const H = 0.38;
  part(g, G.box(W, 0.06, D), wood, { pos: [0, 0.03, 0] });
  part(g, G.box(W, 0.045, D), wood, { pos: [0, 0.06 + H + 0.022, 0] });
  for (const x of [-W / 2 + 0.025, W / 2 - 0.025])
    for (const z of [-D / 2 + 0.025, D / 2 - 0.025]) part(g, G.box(0.04, H, 0.04), toon(PALETTE.wood), { pos: [x, 0.06 + H / 2, z] });
  part(g, G.box(W - 0.06, H, D - 0.06), glassMat(), { pos: [0, 0.06 + H / 2, 0], shadow: false });
  part(g, G.box(W - 0.08, 0.012, D - 0.08), toon(TONES.glass, { opacity: 0.6 }), { pos: [0, 0.25, 0], shadow: false });
  // bottom tray: pazhampori, top tray: parippuvada + unniyappam
  for (let i = 0; i < 4; i++) createPazhampori(g, [-0.3 + i * 0.13, 0.1, 0.04 * (i % 2 ? 1 : -1)], 0.2 * (i % 2 ? 1 : -1));
  for (let i = 0; i < 4; i++) createVada(g, [-0.32 + i * 0.12, 0.275, -0.08]);
  for (let i = 0; i < 6; i++) createUnniyappam(g, [0.12 + (i % 3) * 0.08, 0.29, 0.02 + Math.floor(i / 3) * 0.08]);
  return g;
}
