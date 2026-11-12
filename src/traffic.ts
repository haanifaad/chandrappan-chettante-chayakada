import * as THREE from 'three';
import { PALETTE, TONES } from './palette';
import { G, addOutline, group, limb, part, toon, toonUnique } from './toon';
import { destinationTexture, ksrtcBannerTexture, licensePlateTexture } from './textures';
import { BUS_STOP, ROAD } from './layout';

/**
 * Enhanced Kerala Road Traffic:
 * - Iconic KSRTC "Aanavandi" Fast Passenger bus with dual windscreens, destination boards & luggage rack.
 * - Classic Kerala Ambassador Taxi & modern swift hatchback with realistic bumpers, grills, lights, wipers & license plates.
 * - Authentic Kerala Auto-Rickshaw (Tuk-Tuk) with curved canopy, meter, passenger bench, rain flaps & spare tire.
 * - Vintage Kerala Scooter (Bajaj Chetak style) with leg shield, spare wheel, chrome exhaust & helmeted rider.
 * - Kerala Plantation 4x4 Jeep with 7-slot grille, roll cage, jerry can, mudflaps & roof spotlights.
 */

type Kind = 'car' | 'auto' | 'scooter' | 'jeep' | 'bus';

interface Vehicle {
  kind: Kind;
  root: THREE.Group;
  wheels: { g: THREE.Group; r: number }[];
  length: number;
  dir: 1 | -1;
  laneZ: number;
  speed: number;
  maxSpeed: number;
  bus?: { state: 'driving' | 'stopping' | 'stopped' | 'leaving'; wait: number; stops: boolean };
}

const END = 68;
const PI = Math.PI;

// ------------------------------------------------------------- enhanced wheels

function wheel(parent: THREE.Object3D, x: number, z: number, r: number, w = 0.22, dual = false) {
  const g = group(parent, [x, r, z]);
  const tireMat = toon('#181816');
  const rimMat = toon(TONES.steel);
  const hubMat = toon('#343638');

  const addSingle = (offsetZ: number) => {
    // Outer tire rubber
    part(g, G.cyl(r, r, w, 18), tireMat, { pos: [0, 0, offsetZ], rot: [PI / 2, 0, 0] });
    // Tire tread rim
    part(g, G.torus(r * 0.94, w * 0.42, 6, 20), tireMat, { pos: [0, 0, offsetZ], rot: [0, 0, 0], outline: false });
    // Metallic wheel rim
    part(g, G.cyl(r * 0.64, r * 0.64, w + 0.015, 14), rimMat, { pos: [0, 0, offsetZ], rot: [PI / 2, 0, 0], outline: false });
    // Center hubcap with lug bolts
    part(g, G.cyl(r * 0.3, r * 0.3, w + 0.03, 10), hubMat, { pos: [0, 0, offsetZ], rot: [PI / 2, 0, 0], outline: false });
    // Lug accents
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2;
      const lx = Math.cos(a) * r * 0.45;
      const ly = Math.sin(a) * r * 0.45;
      part(g, G.sphere(0.02, 6, 4), toon(TONES.steelDark), { pos: [lx, ly, offsetZ + (offsetZ >= 0 ? w / 2 + 0.01 : -w / 2 - 0.01)], outline: false });
    }
  };

  if (dual) {
    addSingle(-w * 0.58);
    addSingle(w * 0.58);
  } else {
    addSingle(0);
  }

  return { g, r };
}

// ------------------------------------------------------------- lighting & plates

function addVehicleLights(parent: THREE.Object3D, frontX: number, backX: number, y: number, halfW: number, isRound = false) {
  const headMat = new THREE.MeshBasicMaterial({ color: '#FFF8E0' });
  const headBezel = toon(TONES.steel);
  const amberMat = new THREE.MeshBasicMaterial({ color: '#FFA826' });
  const tailMat = new THREE.MeshBasicMaterial({ color: '#E8281E' });
  const reverseMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });

  for (const s of [-1, 1]) {
    const z = s * halfW;
    if (isRound) {
      // Classic round chrome bezel + sealed beam lamp
      part(parent, G.cyl(0.14, 0.14, 0.06, 14), headBezel, { pos: [frontX, y, z], rot: [0, 0, PI / 2] });
      part(parent, G.sphere(0.11, 12, 8, 0, PI / 2), headMat, { pos: [frontX + 0.03, y, z], rot: [0, 0, -PI / 2], shadow: false, outline: false });
      // Amber turn indicator below
      part(parent, G.sphere(0.045, 8, 6), amberMat, { pos: [frontX + 0.02, y - 0.16, z], shadow: false, outline: false });
    } else {
      // Modern aerodynamic headlight block with turn section
      part(parent, G.box(0.08, 0.15, 0.26), headMat, { pos: [frontX, y, z], shadow: false });
      part(parent, G.box(0.08, 0.15, 0.08), amberMat, { pos: [frontX, y, z + s * 0.14], shadow: false, outline: false });
    }

    // Tail light cluster (Red brake, amber indicator, white reverse)
    part(parent, G.box(0.06, 0.16, 0.14), tailMat, { pos: [backX, y, z], shadow: false });
    part(parent, G.box(0.06, 0.07, 0.08), amberMat, { pos: [backX, y + 0.04, z + s * 0.08], shadow: false, outline: false });
    part(parent, G.box(0.06, 0.05, 0.08), reverseMat, { pos: [backX, y - 0.04, z + s * 0.08], shadow: false, outline: false });
  }
}

function addLicensePlates(parent: THREE.Object3D, frontX: number, backX: number, y: number, code: string, commercial = true) {
  const plateTex = licensePlateTexture(code, commercial);
  const mat = toonUnique('#ffffff', { map: plateTex });
  // Front plate
  part(parent, G.plane(0.48, 0.14), mat, { pos: [frontX, y, 0], rot: [0, PI / 2, 0], outline: false, shadow: false });
  // Rear plate
  part(parent, G.plane(0.48, 0.14), mat, { pos: [backX, y, 0], rot: [0, -PI / 2, 0], outline: false, shadow: false });
}

const glass = () => toon('#2C424E', { opacity: 0.88 });

// ----------------------------------------------------------------- car models

function buildAmbassadorTaxi(): Vehicle {
  const root = new THREE.Group();
  const isYellowBlack = Math.random() < 0.6;
  const bodyPaint = toon(isYellowBlack ? '#1E1E1E' : '#F6F4EB');
  const roofPaint = toon(isYellowBlack ? '#F4BF28' : '#F6F4EB');
  const chrome = toon(TONES.steel);
  const dark = toon(PALETTE.charcoal);

  // Lower chassis & curved fenders
  part(root, G.box(3.7, 0.52, 1.62), bodyPaint, { pos: [0, 0.58, 0] });
  // Rounded curved bonnet / hood
  part(root, G.sphere(0.9, 16, 10, 0, PI / 2), bodyPaint, { pos: [1.1, 0.62, 0], scale: [1.0, 0.38, 0.88], rot: [0, 0, -PI / 2] });
  // Rounded curved boot / trunk
  part(root, G.sphere(0.85, 16, 10, 0, PI / 2), bodyPaint, { pos: [-1.1, 0.62, 0], scale: [0.95, 0.36, 0.88], rot: [0, 0, PI / 2] });

  // Chrome Vintage Front Grille
  const grille = group(root, [1.86, 0.58, 0]);
  part(grille, G.box(0.04, 0.32, 0.88), chrome, { pos: [0, 0, 0] });
  for (let i = -3; i <= 3; i++) {
    part(grille, G.box(0.05, 0.28, 0.03), dark, { pos: [0.01, 0, i * 0.11], outline: false });
  }
  // Front emblem
  part(grille, G.cyl(0.04, 0.04, 0.06, 8), toon(PALETTE.gold), { pos: [0.02, 0.18, 0], rot: [0, 0, PI / 2] });

  // Chrome Bumpers with rubber overriders
  for (const [bx, dir] of [[1.88, 1], [-1.88, -1]] as [number, number][]) {
    const bmp = group(root, [bx, 0.42, 0]);
    part(bmp, G.box(0.08, 0.14, 1.68), chrome, { pos: [0, 0, 0] });
    for (const s of [-0.48, 0.48]) {
      part(bmp, G.box(0.12, 0.22, 0.08), dark, { pos: [dir * 0.02, 0.04, s] });
    }
  }

  // Cabin with rounded curves
  part(root, G.box(2.05, 0.58, 1.48), roofPaint, { pos: [-0.15, 1.12, 0] });
  // Windscreen with chrome rim & wipers
  part(root, G.box(0.05, 0.46, 1.34), glass(), { pos: [0.88, 1.14, 0], rot: [0, 0, 0.42], outline: false });
  for (const wz of [-0.3, 0.3]) {
    limb(root, [0.89, 0.94, wz], [0.84, 1.25, wz + 0.15], 0.014, dark);
  }
  // Rear glass
  part(root, G.box(0.05, 0.44, 1.32), glass(), { pos: [-1.18, 1.14, 0], rot: [0, 0, -0.42], outline: false });
  // Side windows
  for (const s of [-1, 1]) {
    part(root, G.box(1.78, 0.38, 0.04), glass(), { pos: [-0.15, 1.15, s * 0.74], outline: false });
    // Chrome side mirror on front door
    const sm = group(root, [0.72, 0.98, s * 0.84]);
    part(sm, G.cyl(0.012, 0.012, 0.12, 6), chrome, { rot: [s * 0.4, 0, 0] });
    part(sm, G.circle(0.06, 12), chrome, { pos: [0, 0, s * 0.06], rot: [0, s > 0 ? -PI / 2 : PI / 2, 0] });
    // Chrome door handle
    part(root, G.box(0.12, 0.025, 0.03), chrome, { pos: [-0.15, 0.86, s * 0.82] });
    part(root, G.box(0.12, 0.025, 0.03), chrome, { pos: [0.35, 0.86, s * 0.82] });
  }

  // Roof Luggage Rack with tied travel bags
  const rack = group(root, [-0.2, 1.48, 0]);
  part(rack, G.box(1.4, 0.04, 1.28), chrome, { pos: [0, 0, 0] });
  for (const rz of [-0.62, 0.62]) part(rack, G.box(1.42, 0.1, 0.03), chrome, { pos: [0, 0.05, rz] });
  for (const rx of [-0.68, 0.68]) part(rack, G.box(0.03, 0.1, 1.24), chrome, { pos: [rx, 0.05, 0] });
  // Suitcases on rack
  const bagColors = ['#8A4228', '#2F4F4F', '#A06E35'];
  part(rack, G.box(0.65, 0.22, 0.45), toon(bagColors[0]), { pos: [-0.2, 0.13, -0.22], rot: [0, 0.1, 0] });
  part(rack, G.box(0.58, 0.2, 0.42), toon(bagColors[1]), { pos: [0.32, 0.12, 0.18], rot: [0, -0.05, 0] });
  part(rack, G.box(0.48, 0.18, 0.38), toon(bagColors[2]), { pos: [-0.15, 0.11, 0.28], rot: [0, 0.2, 0] });

  // TAXI roof board
  const taxiBox = group(root, [0.35, 1.48, 0]);
  part(taxiBox, G.box(0.32, 0.14, 0.22), toon(PALETTE.gold), { pos: [0, 0.07, 0] });
  part(taxiBox, G.plane(0.28, 0.1), toon('#181816'), { pos: [0, 0.07, 0.112], outline: false });
  part(taxiBox, G.plane(0.28, 0.1), toon('#181816'), { pos: [0, 0.07, -0.112], rot: [0, PI, 0], outline: false });

  // Lighting & Plates
  addVehicleLights(root, 1.86, -1.86, 0.64, 0.58, true);
  addLicensePlates(root, 1.94, -1.94, 0.44, 'KL 07 B 1994', true);

  const wheels = [-1.15, 1.15].flatMap((x) => [-0.76, 0.76].map((z) => wheel(root, x, z, 0.32)));
  return { kind: 'car', root, wheels, length: 3.8, dir: 1, laneZ: 0, speed: 0, maxSpeed: 8.5 + Math.random() * 2.5 };
}

function buildModernHatchback(): Vehicle {
  const root = new THREE.Group();
  const colors = ['#C9382B', '#2E6BA4', '#F4F4F0', '#424549', '#D9A426'];
  const paint = toon(colors[Math.floor(Math.random() * colors.length)]);
  const dark = toon(PALETTE.charcoal);

  // Aerodynamic body
  part(root, G.box(3.5, 0.56, 1.58), paint, { pos: [0, 0.6, 0] });
  // Sloped hood
  part(root, G.box(1.05, 0.18, 1.52), paint, { pos: [1.2, 0.82, 0], rot: [0, 0, -0.14] });
  // Front bumper & lower grille
  part(root, G.box(0.12, 0.32, 1.56), dark, { pos: [1.76, 0.46, 0] });
  part(root, G.box(0.13, 0.12, 0.7), toon('#111111'), { pos: [1.77, 0.42, 0], outline: false });
  // Fog lamps in bumper
  for (const s of [-0.62, 0.62]) {
    part(root, G.sphere(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: '#FFF8B0' }), { pos: [1.78, 0.42, s], outline: false });
  }

  // Cabin
  part(root, G.box(2.0, 0.58, 1.44), paint, { pos: [-0.25, 1.16, 0] });
  // Raked front windscreen + dual wipers
  part(root, G.box(0.06, 0.54, 1.32), glass(), { pos: [0.72, 1.18, 0], rot: [0, 0, 0.56], outline: false });
  limb(root, [0.72, 0.94, -0.2], [0.65, 1.25, 0.05], 0.015, dark);
  limb(root, [0.72, 0.94, 0.35], [0.65, 1.25, 0.6], 0.015, dark);
  // Rear hatch glass & roof spoiler
  part(root, G.box(0.06, 0.52, 1.3), glass(), { pos: [-1.22, 1.18, 0], rot: [0, 0, -0.52], outline: false });
  part(root, G.box(0.24, 0.06, 1.36), paint, { pos: [-1.28, 1.48, 0] });

  // Side mirrors and black B-pillar
  for (const s of [-1, 1]) {
    // Windows
    part(root, G.box(1.82, 0.42, 0.04), glass(), { pos: [-0.25, 1.18, s * 0.72], outline: false });
    // B-pillar
    part(root, G.box(0.14, 0.44, 0.05), dark, { pos: [-0.22, 1.18, s * 0.73], outline: false });
    // Mirror
    const sm = group(root, [0.62, 1.02, s * 0.82]);
    part(sm, G.box(0.08, 0.08, 0.14), paint, { pos: [0, 0, 0] });
    part(sm, G.plane(0.07, 0.12), toon(TONES.steel), { pos: [-0.042, 0, 0], rot: [0, -PI / 2, 0], outline: false });
  }

  // Roof shark-fin antenna
  part(root, G.cone(0.04, 0.12, 4), dark, { pos: [-0.95, 1.5, 0], rot: [0, 0, 0.3] });

  // Lighting & Plates
  addVehicleLights(root, 1.76, -1.76, 0.68, 0.6, false);
  addLicensePlates(root, 1.83, -1.83, 0.46, 'KL 04 AB 8842', false);

  const wheels = [-1.15, 1.15].flatMap((x) => [-0.74, 0.74].map((z) => wheel(root, x, z, 0.31)));
  return { kind: 'car', root, wheels, length: 3.6, dir: 1, laneZ: 0, speed: 0, maxSpeed: 9 + Math.random() * 3 };
}

function buildCar(): Vehicle {
  return Math.random() < 0.5 ? buildAmbassadorTaxi() : buildModernHatchback();
}

// ------------------------------------------------------------- auto rickshaw

function buildAuto(): Vehicle {
  const root = new THREE.Group();
  const yellow = toon('#F4C428');
  const black = toon(PALETTE.charcoal);
  const dark = toon('#1E1E1C');
  const chrome = toon(TONES.steel);
  const seatMat = toon('#5C241E'); // maroon vinyl cushion

  // Lower chassis
  part(root, G.box(1.65, 0.62, 1.34), yellow, { pos: [-0.3, 0.62, 0] });
  // Tapering front nose cowl
  part(root, G.box(0.95, 0.54, 0.94), yellow, { pos: [0.8, 0.58, 0] });
  // Front wheel fender
  part(root, G.cyl(0.3, 0.3, 0.22, 12, false, 0, PI), black, { pos: [0.98, 0.36, 0], rot: [0, 0, 0] });

  // Curved black roof canopy
  part(root, G.box(2.35, 0.08, 1.4), black, { pos: [-0.02, 1.74, 0] });
  part(root, G.sphere(0.72, 16, 8, 0, PI / 2), black, { pos: [-0.02, 1.72, 0], scale: [1.62, 0.24, 0.98] });

  // Thin tubular roll pillars
  for (const z of [-0.62, 0.62]) {
    // Front pillar
    part(root, G.cyl(0.022, 0.022, 0.88, 8), black, { pos: [0.58, 1.3, z] });
    // Rear pillar
    part(root, G.cyl(0.022, 0.022, 0.88, 8), black, { pos: [-1.05, 1.3, z] });
    // Passenger entrance grab rail
    part(root, G.cyl(0.016, 0.016, 0.62, 6), chrome, { pos: [-0.35, 1.15, z * 0.98] });
    // Rolled up weather curtain with leather straps
    const curtain = group(root, [-0.2, 1.66, z * 0.95]);
    part(curtain, G.cyl(0.038, 0.038, 0.72, 8), toon('#D4C8A8'), { rot: [0, 0, PI / 2] });
    for (const sx of [-0.22, 0.22]) {
      part(curtain, G.box(0.04, 0.09, 0.04), toon('#5A311E'), { pos: [sx, 0, 0], outline: false });
    }
  }

  // Front Windscreen with black rubber surround & single wiper
  part(root, G.box(0.05, 0.56, 1.08), glass(), { pos: [0.96, 1.28, 0], rot: [0, 0, 0.16], outline: false });
  part(root, G.box(0.06, 0.58, 0.04), black, { pos: [0.96, 1.28, -0.54], rot: [0, 0, 0.16], outline: false });
  part(root, G.box(0.06, 0.58, 0.04), black, { pos: [0.96, 1.28, 0.54], rot: [0, 0, 0.16], outline: false });
  // Wiper blade
  limb(root, [0.97, 1.04, -0.1], [0.92, 1.38, 0.18], 0.014, dark);

  // Handlebar steering & dashboard meter console
  const dash = group(root, [0.55, 1.08, 0]);
  part(dash, G.box(0.24, 0.22, 0.7), black, { pos: [0, 0, 0] });
  limb(dash, [0.08, 0.12, -0.3], [0.08, 0.12, 0.3], 0.024, chrome);
  // Fare Taxi Meter box on the right
  const meter = group(dash, [0.08, 0.16, 0.28]);
  part(meter, G.box(0.12, 0.12, 0.12), toon(PALETTE.gold), { pos: [0, 0, 0] });
  part(meter, G.plane(0.09, 0.09), toon('#111111'), { pos: [-0.062, 0, 0], rot: [0, -PI / 2, 0], outline: false });

  // Rear passenger cushioned bench
  const seat = group(root, [-0.68, 0.65, 0]);
  part(seat, G.box(0.55, 0.22, 1.22), seatMat, { pos: [0, 0.11, 0] });
  part(seat, G.box(0.16, 0.52, 1.22), seatMat, { pos: [-0.22, 0.44, 0], rot: [0, 0, 0.12] });

  // Driver in khaki uniform
  part(root, G.capsule(0.2, 0.26, 4, 10), toon('#B8A06A'), { pos: [0.18, 1.12, 0] });
  part(root, G.sphere(0.17, 12, 10), toon('#A86E45'), { pos: [0.18, 1.54, 0] });
  part(root, G.sphere(0.18, 12, 8, 0, PI * 0.45), toon(PALETTE.charcoal), { pos: [0.18, 1.56, -0.01], rot: [-0.3, 0, 0] }); // hair
  // Hands on handlebar
  limb(root, [0.18, 1.25, -0.2], [0.55, 1.15, -0.26], 0.05, toon('#B8A06A'));
  limb(root, [0.18, 1.25, 0.2], [0.55, 1.15, 0.26], 0.05, toon('#B8A06A'));

  // Front chrome round headlamp
  part(root, G.cyl(0.12, 0.12, 0.08, 12), chrome, { pos: [1.28, 0.74, 0], rot: [0, 0, PI / 2] });
  part(root, G.sphere(0.09, 10, 8, 0, PI / 2), new THREE.MeshBasicMaterial({ color: '#FFF8D0' }), {
    pos: [1.32, 0.74, 0],
    rot: [0, 0, -PI / 2],
    shadow: false,
    outline: false,
  });
  // Amber indicators
  for (const s of [-0.32, 0.32]) {
    part(root, G.sphere(0.04, 6, 6), new THREE.MeshBasicMaterial({ color: '#FFA826' }), { pos: [1.24, 0.74, s], outline: false });
  }

  // Back rear details: spare tire, louver grille & bumper
  const spare = group(root, [-1.22, 0.85, 0]);
  part(spare, G.cyl(0.24, 0.24, 0.14, 14), toon('#181816'), { rot: [0, 0, PI / 2] });
  part(spare, G.cyl(0.14, 0.14, 0.16, 10), chrome, { rot: [0, 0, PI / 2], outline: false });
  // Rear bumper with red reflectors
  const rBmp = group(root, [-1.22, 0.38, 0]);
  part(rBmp, G.box(0.08, 0.1, 1.36), black, { pos: [0, 0, 0] });
  for (const s of [-0.55, 0.55]) {
    part(rBmp, G.box(0.06, 0.06, 0.16), new THREE.MeshBasicMaterial({ color: '#E8281E' }), { pos: [-0.02, 0, s], outline: false });
  }
  // License plates
  addLicensePlates(root, 1.3, -1.26, 0.42, 'KL 05 D 3120', true);

  const wheels = [wheel(root, 0.98, 0, 0.25, 0.16), wheel(root, -0.72, -0.64, 0.27, 0.18), wheel(root, -0.72, 0.64, 0.27, 0.18)];
  return { kind: 'auto', root, wheels, length: 2.6, dir: 1, laneZ: 0, speed: 0, maxSpeed: 7 + Math.random() * 2 };
}

// ----------------------------------------------------------------- scooter

function buildScooter(): Vehicle {
  const root = new THREE.Group();
  const colors = ['#C9423A', '#2E6BA4', '#D4BA82', '#3F7A4D', '#1E1E1E'];
  const paint = toon(colors[Math.floor(Math.random() * colors.length)]);
  const chrome = toon(TONES.steel);
  const dark = toon(PALETTE.charcoal);

  // Step-through footboard
  part(root, G.box(1.15, 0.16, 0.42), paint, { pos: [0, 0.38, 0] });
  part(root, G.box(0.7, 0.02, 0.34), dark, { pos: [-0.05, 0.47, 0], outline: false }); // rubber floor mat

  // Curved front leg-shield
  const shield = group(root, [0.46, 0.72, 0], [0, 0, -0.32]);
  part(shield, G.box(0.12, 0.72, 0.48), paint, { pos: [0, 0, 0] });
  part(shield, G.cyl(0.015, 0.015, 0.72, 6), chrome, { pos: [0.06, 0, 0] }); // chrome front horn casting

  // Handlebars & Headlamp
  const bar = group(root, [0.44, 1.05, 0]);
  part(bar, G.box(0.16, 0.12, 0.56), paint, { pos: [0, 0, 0] });
  limb(bar, [0, 0, -0.28], [0, 0, 0.28], 0.025, dark);
  // Chrome round headlamp
  part(bar, G.cyl(0.09, 0.09, 0.06, 12), chrome, { pos: [0.08, 0.02, 0], rot: [0, 0, PI / 2] });
  part(bar, G.sphere(0.07, 10, 8, 0, PI / 2), new THREE.MeshBasicMaterial({ color: '#FFF8E0' }), {
    pos: [0.11, 0.02, 0],
    rot: [0, 0, -PI / 2],
    shadow: false,
    outline: false,
  });
  // Dual chrome round mirrors
  for (const s of [-0.25, 0.25]) {
    const m = group(bar, [-0.02, 0.14, s]);
    limb(m, [0, 0, 0], [0, 0.12, s * 0.05], 0.01, chrome);
    part(m, G.circle(0.045, 10), chrome, { pos: [0, 0, s * 0.05], rot: [0, -PI / 2, 0] });
  }

  // Rounded bulbous side engine cowl
  part(root, G.sphere(0.42, 14, 10), paint, { pos: [-0.42, 0.58, 0], scale: [1.2, 0.65, 0.65] });
  // Louver vents
  for (let i = 0; i < 3; i++) {
    part(root, G.box(0.24, 0.02, 0.02), dark, { pos: [-0.42, 0.52 + i * 0.05, 0.28], outline: false });
  }

  // Contoured two-up seat
  const seat = group(root, [-0.25, 0.74, 0]);
  part(seat, G.box(0.72, 0.12, 0.32), toon('#2A2A28'), { pos: [0, 0, 0] });
  part(seat, G.cyl(0.015, 0.015, 0.34, 6), chrome, { pos: [-0.34, 0.08, 0], rot: [PI / 2, 0, 0] }); // grab rail

  // Chrome exhaust silencer pipe
  limb(root, [-0.15, 0.3, 0.22], [-0.75, 0.28, 0.22], 0.035, chrome);

  // Rear covered spare wheel
  const spare = group(root, [-0.76, 0.62, 0]);
  part(spare, G.cyl(0.24, 0.24, 0.12, 12), paint, { rot: [PI / 2, 0, 0] });

  // Tail light & plates
  part(root, G.box(0.06, 0.08, 0.12), new THREE.MeshBasicMaterial({ color: '#E8281E' }), { pos: [-0.78, 0.72, 0], shadow: false });
  addLicensePlates(root, 0.58, -0.78, 0.38, 'KL 07 CD 2045', false);

  // Rider in raincoat/shirt with helmet
  const coat = toon(['#E8C341', '#3E7FB1', '#C9423A', '#428B55'][Math.floor(Math.random() * 4)]);
  const helmetColor = toon(['#F6F4EB', '#C9382B', '#1E1E1E', '#3E7FB1'][Math.floor(Math.random() * 4)]);
  part(root, G.capsule(0.21, 0.32, 4, 10), coat, { pos: [-0.22, 1.25, 0], rot: [0, 0, -0.16] });
  // Helmet with visor
  const helm = group(root, [-0.15, 1.76, 0]);
  part(helm, G.sphere(0.21, 14, 12), helmetColor, { pos: [0, 0, 0] });
  part(helm, G.box(0.12, 0.09, 0.26), dark, { pos: [0.15, 0.01, 0], outline: false }); // black visor
  // Arms gripping handlebar
  for (const s of [-0.22, 0.22]) {
    limb(root, [-0.15, 1.44, s], [0.42, 1.08, s * 1.15], 0.06, coat);
    limb(root, [-0.28, 0.92, s], [0.08, 0.52, s * 0.95], 0.07, toon('#3A3D46')); // legs
  }

  const wheels = [wheel(root, 0.58, 0, 0.25, 0.12), wheel(root, -0.58, 0, 0.25, 0.12)];
  return { kind: 'scooter', root, wheels, length: 1.85, dir: 1, laneZ: 0, speed: 0, maxSpeed: 8 + Math.random() * 3 };
}

// ------------------------------------------------------------- 4x4 estate jeep

function buildJeep(): Vehicle {
  const root = new THREE.Group();
  const colors = ['#2E5339', '#8C7B58', '#C93A2B', '#3E4A56', '#F4F2E6'];
  const paint = toon(colors[Math.floor(Math.random() * colors.length)]);
  const dark = toon(PALETTE.charcoal);
  const chrome = toon(TONES.steel);
  const canvasMat = toon('#C8BC9D'); // rugged estate canvas hood

  // Lower chassis & sturdy body
  part(root, G.box(3.7, 0.68, 1.68), paint, { pos: [0, 0.74, 0] });
  // High-clearance black fender flares
  for (const [fx, fz] of [[1.18, 0.88], [1.18, -0.88], [-1.15, 0.88], [-1.15, -0.88]]) {
    part(root, G.box(0.85, 0.14, 0.16), dark, { pos: [fx, 0.75, fz] });
  }

  // Raised hood / bonnet
  part(root, G.box(1.22, 0.32, 1.54), paint, { pos: [1.24, 1.18, 0] });
  // Iconic 7-slot vertical radiator grille
  const grille = group(root, [1.86, 0.88, 0]);
  part(grille, G.box(0.04, 0.44, 1.12), paint, { pos: [0, 0, 0] });
  for (let i = -3; i <= 3; i++) {
    part(grille, G.box(0.05, 0.32, 0.04), dark, { pos: [0.01, 0, i * 0.13], outline: false });
  }

  // Heavy-duty channel front bumper with red recovery tow-hooks
  const fBmp = group(root, [1.9, 0.48, 0]);
  part(fBmp, G.box(0.12, 0.18, 1.74), dark, { pos: [0, 0, 0] });
  for (const s of [-0.55, 0.55]) {
    part(fBmp, G.torus(0.05, 0.018, 4, 10), toon('#C9382B'), { pos: [0.08, 0, s], rot: [0, PI / 2, 0] });
  }

  // Foldable Windscreen with metal frame & twin wipers
  const ws = group(root, [0.62, 1.52, 0], [0, 0, 0.18]);
  part(ws, G.box(0.06, 0.66, 1.52), paint, { pos: [0, 0, 0] });
  part(ws, G.box(0.07, 0.52, 1.34), glass(), { pos: [0, 0, 0], outline: false });
  // Wipers
  for (const wz of [-0.34, 0.34]) {
    limb(ws, [0.04, 0.28, wz], [0.04, -0.18, wz + 0.18], 0.015, dark);
  }

  // Canvas soft-top canopy with side and rear windows
  const hood = group(root, [-0.62, 1.62, 0]);
  part(hood, G.box(2.28, 0.82, 1.64), canvasMat, { pos: [0, 0, 0] });
  // Vinyl side window cutouts
  for (const s of [-1, 1]) {
    part(hood, G.box(1.75, 0.44, 0.04), glass(), { pos: [-0.08, 0.05, s * 0.83], outline: false });
  }
  // Rear canvas window
  part(hood, G.box(0.04, 0.42, 1.15), glass(), { pos: [-1.15, 0.05, 0], outline: false });

  // Roof Roll-Bar with auxiliary off-road spotlights
  const rack = group(root, [0.55, 2.05, 0]);
  part(rack, G.box(0.08, 0.06, 1.6), dark, { pos: [0, 0, 0] });
  for (const rz of [-0.48, -0.16, 0.16, 0.48]) {
    part(rack, G.cyl(0.07, 0.07, 0.06, 10), chrome, { pos: [0.04, 0.08, rz], rot: [0, 0, PI / 2] });
    part(rack, G.sphere(0.055, 8, 6, 0, PI / 2), new THREE.MeshBasicMaterial({ color: '#FFF6D8' }), {
      pos: [0.07, 0.08, rz],
      rot: [-PI / 2, 0, 0],
      outline: false,
    });
  }

  // Side foot step bars (rock sliders)
  for (const s of [-0.88, 0.88]) {
    part(root, G.cyl(0.03, 0.03, 1.65, 8), dark, { pos: [-0.05, 0.38, s], rot: [0, 0, PI / 2] });
  }

  // Rear full-size spare tire on tailgate
  const spare = group(root, [-1.92, 0.95, -0.22]);
  part(spare, G.cyl(0.38, 0.38, 0.24, 16), toon('#181816'), { rot: [0, 0, PI / 2] });
  part(spare, G.cyl(0.24, 0.24, 0.26, 12), dark, { rot: [0, 0, PI / 2], outline: false });

  // Red Fuel Jerry-Can mounted on rear quarter
  const can = group(root, [-1.88, 0.98, 0.52]);
  part(can, G.box(0.18, 0.44, 0.28), toon('#C9382B'), { pos: [0, 0, 0] });
  part(can, G.cyl(0.025, 0.025, 0.08, 6), dark, { pos: [0, 0.24, 0.08] }); // cap

  // Lights & Plates
  addVehicleLights(root, 1.86, -1.86, 0.92, 0.62, true);
  addLicensePlates(root, 1.96, -1.96, 0.48, 'KL 06 E 4004', false);

  const wheels = [-1.15, 1.2].flatMap((x) => [-0.78, 0.78].map((z) => wheel(root, x, z, 0.38, 0.26)));
  return { kind: 'jeep', root, wheels, length: 3.9, dir: 1, laneZ: 0, speed: 0, maxSpeed: 8 + Math.random() * 2 };
}

// ------------------------------------------------------------- KSRTC bus

let destTex: THREE.Texture | null = null;
let ksrtcSideTex: THREE.Texture | null = null;

function buildBus(): Vehicle {
  const root = new THREE.Group();
  const red = toon('#B8342A'); // KSRTC signature red
  const cream = toon('#F2E3C2'); // KSRTC cream
  const gold = toon(PALETTE.gold);
  const dark = toon(PALETTE.charcoal);
  const chrome = toon(TONES.steel);
  const L = 9.4;

  // Main body: Red lower half & Cream upper half
  part(root, G.box(L, 1.05, 2.3), red, { pos: [0, 0.98, 0] });
  part(root, G.box(L, 0.96, 2.28), cream, { pos: [0, 1.95, 0] });
  // Waistline gold belt stripe
  part(root, G.box(L + 0.04, 0.12, 2.32), gold, { pos: [0, 1.48, 0], outline: false });
  // Curved roof
  part(root, G.box(L - 0.25, 0.24, 2.22), cream, { pos: [0, 2.52, 0] });
  part(root, G.sphere(1.1, 16, 8, 0, PI / 2), cream, { pos: [0, 2.52, 0], scale: [L / 2.2, 0.16, 1.0] });

  // KSRTC Side Banner Decals
  if (!ksrtcSideTex) ksrtcSideTex = ksrtcBannerTexture();
  const bannerMat = toonUnique('#ffffff', { map: ksrtcSideTex });
  for (const s of [-1, 1]) {
    part(root, G.plane(4.8, 0.44), bannerMat, {
      pos: [0, 1.15, s * 1.155],
      rot: [0, s > 0 ? 0 : PI, 0],
      outline: false,
      shadow: false,
    });
  }

  // Windows with aluminum frames & horizontal safety bars
  part(root, G.box(L - 1.8, 0.68, 2.34), glass(), { pos: [-0.4, 2.02, 0], outline: false });
  for (let i = 0; i < 8; i++) {
    const wx = -4.1 + i * 1.04;
    part(root, G.box(0.08, 0.7, 2.35), cream, { pos: [wx, 2.02, 0], outline: false });
    // Passenger safety bars
    for (const s of [-1, 1]) {
      part(root, G.cyl(0.012, 0.012, 0.96, 6), chrome, { pos: [wx + 0.52, 1.9, s * 1.16], rot: [0, 0, PI / 2], outline: false });
    }
  }

  // Passengers seated inside looking out
  const skin = ['#B07A50', '#C98A5E', '#A86E45', '#D29A6E'];
  const shirt = ['#FFFFFF', '#E8B53E', '#3E7FB1', '#C9423A', '#428B55'];
  for (let i = 0; i < 7; i++) {
    const px = -3.7 + i * 1.05;
    const pz = i % 2 === 0 ? -0.82 : 0.82;
    // Head & hair
    const pHead = group(root, [px, 2.04, pz]);
    part(pHead, G.sphere(0.16, 10, 8), toon(skin[i % 4]), { outline: false });
    part(pHead, G.sphere(0.17, 10, 6, 0, PI * 0.45), dark, { pos: [0, 0.02, -0.01], rot: [-0.2, 0, 0], outline: false });
    // Shoulders
    part(root, G.box(0.24, 0.22, 0.36), toon(shirt[i % 5]), { pos: [px, 1.76, pz], outline: false });
  }

  // Split front windscreens with center rubber mullion & dual wipers
  const fFront = L / 2 + 0.01;
  part(root, G.box(0.06, 0.94, 0.94), glass(), { pos: [fFront, 1.9, -0.52], outline: false });
  part(root, G.box(0.06, 0.94, 0.94), glass(), { pos: [fFront, 1.9, 0.52], outline: false });
  part(root, G.box(0.08, 0.96, 0.12), dark, { pos: [fFront + 0.01, 1.9, 0], outline: false }); // center mullion
  for (const wz of [-0.52, 0.52]) {
    limb(root, [fFront + 0.04, 1.48, wz - 0.2], [fFront + 0.04, 1.95, wz + 0.2], 0.018, dark);
  }

  // Front Destination Board ("MUNNAR മൂന്നാർ")
  if (!destTex) destTex = destinationTexture('MUNNAR', 'മൂന്നാർ');
  part(root, G.box(0.06, 0.28, 1.8), toonUnique('#ffffff', { map: destTex }), { pos: [fFront + 0.02, 2.52, 0], outline: false });
  // Route number plaque ("FP 108")
  part(root, G.box(0.06, 0.16, 0.38), toon('#181816'), { pos: [fFront + 0.02, 2.26, 0.78], outline: false });

  // Front Chrome Grille with KSRTC Emblem
  const grille = group(root, [fFront + 0.02, 0.98, 0]);
  part(grille, G.box(0.04, 0.34, 1.1), chrome, { pos: [0, 0, 0] });
  part(grille, G.cyl(0.06, 0.06, 0.06, 12), gold, { pos: [0.02, 0, 0], rot: [0, 0, PI / 2] }); // logo badge
  // Dual round sealed beam headlamps & lower amber fog lights
  for (const s of [-0.78, 0.78]) {
    part(grille, G.cyl(0.13, 0.13, 0.06, 12), chrome, { pos: [0.02, 0, s], rot: [0, 0, PI / 2] });
    part(grille, G.sphere(0.1, 10, 8, 0, PI / 2), new THREE.MeshBasicMaterial({ color: '#FFF8D0' }), {
      pos: [0.05, 0, s],
      rot: [0, 0, -PI / 2],
      outline: false,
    });
    part(grille, G.sphere(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: '#FFA826' }), { pos: [0.03, -0.18, s], outline: false });
  }

  // Heavy rugged front and rear bumpers
  const fBmp = group(root, [fFront + 0.06, 0.48, 0]);
  part(fBmp, G.box(0.24, 0.28, 2.34), dark, { pos: [0, 0, 0] });
  for (const s of [-0.85, 0.85]) part(fBmp, G.box(0.26, 0.3, 0.16), dark, { pos: [0, 0, s] }); // rubber overriders
  const rBmp = group(root, [-L / 2 - 0.06, 0.48, 0]);
  part(rBmp, G.box(0.24, 0.28, 2.34), dark, { pos: [0, 0, 0] });

  // Roof Luggage Carrier & Rear Access Ladder
  const roofRack = group(root, [-0.5, 2.72, 0]);
  part(roofRack, G.box(5.8, 0.04, 1.8), chrome, { pos: [0, 0, 0] });
  for (const rz of [-0.9, 0.9]) part(roofRack, G.box(5.82, 0.14, 0.04), chrome, { pos: [0, 0.07, rz] });
  // Metal rear ladder
  const ladder = group(root, [-L / 2 - 0.04, 1.7, 0.65]);
  for (const lz of [-0.2, 0.2]) part(ladder, G.cyl(0.018, 0.018, 1.8, 6), chrome, { pos: [0, 0, lz] });
  for (let r = 0; r < 6; r++) part(ladder, G.cyl(0.014, 0.014, 0.4, 6), chrome, { pos: [0, -0.75 + r * 0.3, 0], rot: [PI / 2, 0, 0] });

  // Rear Windows & Taillights
  part(root, G.box(0.06, 0.62, 1.6), glass(), { pos: [-L / 2 - 0.01, 1.95, 0], outline: false });
  for (const s of [-0.95, 0.95]) {
    // Vertical taillight stack (Red, Amber, White)
    part(root, G.box(0.06, 0.14, 0.1), new THREE.MeshBasicMaterial({ color: '#E8281E' }), { pos: [-L / 2 - 0.02, 1.05, s], outline: false });
    part(root, G.box(0.06, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: '#FFA826' }), { pos: [-L / 2 - 0.02, 0.9, s], outline: false });
    part(root, G.box(0.06, 0.08, 0.1), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), { pos: [-L / 2 - 0.02, 0.78, s], outline: false });
    // Heavy rubber mudflaps with white stripes
    const flap = group(root, [-3.4, 0.28, s]);
    part(flap, G.box(0.04, 0.44, 0.38), dark, { pos: [0, 0, 0] });
    part(flap, G.box(0.045, 0.05, 0.34), toon(PALETTE.softWhite), { pos: [0, -0.12, 0], outline: false });
  }

  // Passenger Doors on left side (-z in local vehicle orientation when driving +x)
  part(root, G.box(0.92, 1.65, 0.04), toon('#7C2620'), { pos: [L / 2 - 1.55, 1.28, -1.16], outline: false }); // front entrance
  part(root, G.box(0.92, 1.65, 0.04), toon('#7C2620'), { pos: [-L / 2 + 1.85, 1.28, -1.16], outline: false }); // rear exit

  // Number Plates
  addLicensePlates(root, fFront + 0.18, -L / 2 - 0.18, 0.46, 'KL 15 A 7201', true);

  // Wheels: Single front axle, Dual rear axle!
  const wheels = [
    wheel(root, 3.1, -1.02, 0.52, 0.3, false),
    wheel(root, 3.1, 1.02, 0.52, 0.3, false),
    wheel(root, -2.5, -1.02, 0.52, 0.3, true),
    wheel(root, -2.5, 1.02, 0.52, 0.3, true),
  ];

  return {
    kind: 'bus',
    root,
    wheels,
    length: L,
    dir: 1,
    laneZ: 0,
    speed: 0,
    maxSpeed: 7.5 + Math.random() * 1.5,
    bus: { state: 'driving', wait: 0, stops: false },
  };
}

const BUILDERS: Record<Kind, () => Vehicle> = { car: buildCar, auto: buildAuto, scooter: buildScooter, jeep: buildJeep, bus: buildBus };

/** Bus centre when stopped so its front door lines up with the shelter. */
const BUS_STOP_X = BUS_STOP.x - 2.9;
const BUS_WAIT = 6;

export class Traffic {
  vehicles: Vehicle[] = [];
  /** Called once each time the bus opens its door at the stop. */
  onBusStop: (door: THREE.Vector3) => void = () => {};
  onHorn: () => void = () => {};
  /** Multiplayer: the host announces buses so guests see the same one. */
  onBusSpawn: (dir: 1 | -1, x: number) => void = () => {};
  /** Guests turn this off and spawn buses when the host says so. */
  autoBus = true;

  private timers = [1, 3];
  private busTimer = 8;

  constructor(private scene: THREE.Scene) {
    // start with a little traffic already on the road
    for (const [kind, x, dir] of [
      ['car', -20, 1],
      ['auto', 25, -1],
      ['scooter', 8, 1],
    ] as [Kind, number, 1 | -1][])
      this.spawn(kind, dir, x);
  }

  private spawn(kind: Kind, dir: 1 | -1, x = -dir * END): Vehicle {
    const v = BUILDERS[kind]();
    v.dir = dir;
    v.laneZ = dir === 1 ? ROAD.laneEast : ROAD.laneWest;
    v.speed = v.maxSpeed;
    v.root.position.set(x, 0, v.laneZ);
    v.root.rotation.y = dir === 1 ? 0 : PI;
    addOutline(v.root);
    if (v.bus) v.bus.stops = dir === 1;
    this.scene.add(v.root);
    this.vehicles.push(v);
    return v;
  }

  /** Guests: mirror the host's bus. */
  spawnBus(dir: 1 | -1, x: number) {
    this.spawn('bus', dir, x);
  }

  private laneClear(dir: 1 | -1): boolean {
    const startX = -dir * END;
    return !this.vehicles.some((v) => v.dir === dir && Math.abs(v.root.position.x - startX) < 12);
  }

  private randomKind(): Kind {
    const r = Math.random();
    return r < 0.36 ? 'car' : r < 0.6 ? 'auto' : r < 0.85 ? 'scooter' : 'jeep';
  }

  update(dt: number) {
    // spawning
    for (const lane of [0, 1]) {
      this.timers[lane] -= dt;
      const dir = lane === 0 ? 1 : -1;
      if (this.timers[lane] <= 0 && this.laneClear(dir)) {
        this.spawn(this.randomKind(), dir);
        this.timers[lane] = 4 + Math.random() * 6;
      }
    }
    this.busTimer -= dt;
    if (this.busTimer <= 0 && this.autoBus) {
      const dir: 1 | -1 = Math.random() < 0.7 ? 1 : -1;
      if (this.laneClear(dir)) {
        const bus = this.spawn('bus', dir);
        this.onBusSpawn(dir, bus.root.position.x);
        this.busTimer = 35 + Math.random() * 20;
      } else this.busTimer = 2;
    }

    for (const v of this.vehicles) {
      const x = v.root.position.x;
      // follow the vehicle ahead at a safe gap
      let gap = Infinity;
      for (const o of this.vehicles) {
        if (o === v || o.dir !== v.dir) continue;
        const d = (o.root.position.x - x) * v.dir;
        if (d > 0) gap = Math.min(gap, d - (o.length + v.length) / 2);
      }
      let desired = Math.min(v.maxSpeed, Math.max(0, (gap - 2.5) * 1.6));

      if (v.bus && v.bus.stops) {
        const b = v.bus;
        const toStop = (BUS_STOP_X - x) * v.dir;
        if (b.state === 'driving' && toStop > 0 && toStop < 26) b.state = 'stopping';
        if (b.state === 'stopping') {
          desired = Math.min(desired, Math.sqrt(Math.max(0, 2 * 2.2 * toStop)));
          if (toStop < 0.08) {
            v.root.position.x = BUS_STOP_X;
            v.speed = 0;
            b.state = 'stopped';
            b.wait = BUS_WAIT;
            this.onBusStop(new THREE.Vector3(BUS_STOP_X + 2.9, 0, v.laneZ - 1.25));
          }
        }
        if (b.state === 'stopped') {
          desired = 0;
          b.wait -= dt;
          if (b.wait <= 0) {
            b.state = 'leaving';
            this.onHorn();
          }
        }
      }

      const accel = desired > v.speed ? 3 : 9;
      v.speed += THREE.MathUtils.clamp(desired - v.speed, -accel * dt, accel * dt);
      v.root.position.x += v.speed * v.dir * dt;
      for (const w of v.wheels) w.g.rotation.z -= (v.speed * dt) / w.r;
      // a gentle sway for the small ones
      if (v.kind === 'scooter' || v.kind === 'auto') v.root.position.y = Math.sin(x * 1.3) * 0.015;
    }

    for (const v of this.vehicles.filter((o) => o.root.position.x * o.dir > END + 4)) this.scene.remove(v.root);
    this.vehicles = this.vehicles.filter((o) => o.root.position.x * o.dir <= END + 4);
  }
}
