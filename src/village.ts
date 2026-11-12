import * as THREE from 'three';
import { PALETTE, TONES } from './palette';
import { G, addOutline, group, limb, part, toon, toonUnique } from './toon';
import { PhysicsWorld } from './physics';
import { terrainHeight } from './world';

export interface InteractiveObject {
  id: string;
  type: 'door' | 'chair' | 'bed' | 'water' | 'clean' | 'vehicle' | 'sign' | 'counter';
  name: string;
  position: THREE.Vector3;
  interactionDistance: number;
  facingYaw?: number;
  isOpen?: boolean;
  mesh?: THREE.Object3D;
  businessId?: number;
  actionPrompt: string;
}

export interface VillageLocation {
  id: number;
  name: string;
  ownerId: string | null;
  shopName: string;
  center: THREE.Vector3;
  counterPos: THREE.Vector3;
  queueSlots: THREE.Vector3[];
  serveSlots: THREE.Vector3[];
  seatSlots: THREE.Vector3[];
  isOpen: boolean;
  money: number;
  reputation: number;
  colorTrim: string;
}

export class Village {
  readonly root = new THREE.Group();
  readonly interactives: InteractiveObject[] = [];
  readonly businessLocations: VillageLocation[] = [];
  private doors: Map<string, { root: THREE.Object3D; pivot: THREE.Group; isOpen: boolean; targetRot: number }> = new Map();
  private physics: PhysicsWorld;

  constructor(scene: THREE.Scene) {
    this.root.name = 'Village';
    scene.add(this.root);
    this.physics = PhysicsWorld.getInstance();

    this.registerOriginalShopColliders();
    this.buildVillageTrails();
    this.buildPlayerHouse();
    this.buildSecondaryShops();
    this.buildRoadsideVehicles();
    this.registerFurnitureInteractives();
  }

  private registerOriginalShopColliders() {
    const pw = this.physics;
    // Shop plinth (walkable floor)
    pw.addBox({
      id: 'shop_plinth',
      min: new THREE.Vector3(-3.5, 0, -2.7),
      max: new THREE.Vector3(3.5, 0.35, 2.25),
      isFloor: true,
      floorY: 0.35,
    });
    // Annex plinth
    pw.addBox({
      id: 'shop_annex_plinth',
      min: new THREE.Vector3(3.25, 0, -2.35),
      max: new THREE.Vector3(6.05, 0.1, 1.05),
      isFloor: true,
      floorY: 0.1,
    });

    // Walls & static furniture of main shop
    pw.addBox({ id: 'wall_left', min: new THREE.Vector3(-3.35, 0.35, -2.6), max: new THREE.Vector3(-3.05, 3.2, 2.12) });
    pw.addBox({ id: 'wall_right', min: new THREE.Vector3(3.05, 0.35, -2.6), max: new THREE.Vector3(3.35, 3.2, 2.12) });
    pw.addBox({ id: 'wall_back', min: new THREE.Vector3(-3.35, 0.35, -2.65), max: new THREE.Vector3(3.35, 3.2, -2.25) });
    pw.addBox({ id: 'counter_main', min: new THREE.Vector3(-3.2, 0.35, 1.06), max: new THREE.Vector3(1.98, 1.4, 1.92) });
    pw.addBox({ id: 'hearth_main', min: new THREE.Vector3(-3.2, 0.35, -2.25), max: new THREE.Vector3(-2.36, 1.35, 0.8) });
    pw.addBox({ id: 'prep_table', min: new THREE.Vector3(1.6, 0.35, -1.4), max: new THREE.Vector3(3.0, 1.3, -0.6) });
    pw.addBox({ id: 'bus_shelter', min: new THREE.Vector3(-8.9, 0, 2.35), max: new THREE.Vector3(-6.3, 2.4, 3.8) });
  }

  private buildVillageTrails() {
    // Footpath to hillside house: winding stone pavers
    const pathGroup = group(this.root);
    const stoneColor = '#8A867A';
    for (let t = 0; t <= 1; t += 0.04) {
      const x = THREE.MathUtils.lerp(-4.5, -28, t);
      const z = THREE.MathUtils.lerp(1.2, -15, t) + Math.sin(t * Math.PI * 2) * 2.2;
      const y = terrainHeight(x, z) + 0.02;

      part(pathGroup, G.box(1.2, 0.04, 0.9), toon(stoneColor), {
        pos: [x, y, z],
        rot: [0, t * 0.45, 0],
      });
    }

    // Footpath to second shop (Valley View)
    for (let x = 6.5; x <= 25; x += 1.4) {
      const z = 2.4 + Math.sin(x * 0.3) * 0.4;
      const y = terrainHeight(x, z) + 0.015;
      part(pathGroup, G.box(1.1, 0.03, 0.8), toon('#7B7062'), { pos: [x, y, z] });
    }
  }

  private buildPlayerHouse() {
    const pw = this.physics;
    const hx = -28;
    const hz = -16;
    const hy = terrainHeight(hx, hz);
    const house = group(this.root, [hx, hy, hz], [0, 0.25, 0]);

    const plinthW = 9.2;
    const plinthD = 7.6;
    const plinthH = 0.55;
    const floorY = hy + plinthH;

    // Foundation plinth (laterite stone)
    part(house, G.box(plinthW, plinthH, plinthD), toon('#8C4B33'), { pos: [0, plinthH / 2, 0] });
    pw.addBox({
      id: 'house_plinth',
      min: new THREE.Vector3(hx - plinthW / 2, hy, hz - plinthD / 2),
      max: new THREE.Vector3(hx + plinthW / 2, floorY, hz + plinthD / 2),
      isFloor: true,
      floorY: floorY,
    });

    // Front steps (walkable into verandah)
    part(house, G.box(2.2, plinthH * 0.5, 1.2), toon('#9E5A3E'), { pos: [0, plinthH * 0.25, plinthD / 2 + 0.5] });
    pw.addBox({
      id: 'house_step',
      min: new THREE.Vector3(hx - 1.2, hy, hz + plinthD / 2),
      max: new THREE.Vector3(hx + 1.2, hy + plinthH * 0.55, hz + plinthD / 2 + 1.2),
      isFloor: true,
      floorY: hy + plinthH * 0.55,
    });

    // House walls (Kerala cream lime plaster)
    const wallMat = toon('#F4ECE1');
    const woodMat = toon('#5C3D28');
    const tileMat = toon('#B84A32');

    // Back wall
    part(house, G.box(plinthW - 0.4, 2.9, 0.25), wallMat, { pos: [0, plinthH + 1.45, -plinthD / 2 + 0.2] });
    pw.addBox({
      id: 'house_back_wall',
      min: new THREE.Vector3(hx - 4.4, floorY, hz - 3.7),
      max: new THREE.Vector3(hx + 4.4, floorY + 3.0, hz - 3.3),
    });

    // Left wall
    part(house, G.box(0.25, 2.9, plinthD - 0.4), wallMat, { pos: [-plinthW / 2 + 0.2, plinthH + 1.45, 0] });
    pw.addBox({
      id: 'house_left_wall',
      min: new THREE.Vector3(hx - 4.5, floorY, hz - 3.7),
      max: new THREE.Vector3(hx - 4.1, floorY + 3.0, hz + 3.7),
    });

    // Right wall
    part(house, G.box(0.25, 2.9, plinthD - 0.4), wallMat, { pos: [plinthW / 2 - 0.2, plinthH + 1.45, 0] });
    pw.addBox({
      id: 'house_right_wall',
      min: new THREE.Vector3(hx + 4.1, floorY, hz - 3.7),
      max: new THREE.Vector3(hx + 4.5, floorY + 3.0, hz + 3.7),
    });

    // Dividing interior wall between Verandah and Living room with door opening
    part(house, G.box(3.2, 2.9, 0.22), wallMat, { pos: [-2.6, plinthH + 1.45, 1.2] });
    part(house, G.box(3.2, 2.9, 0.22), wallMat, { pos: [2.6, plinthH + 1.45, 1.2] });
    part(house, G.box(2.2, 0.7, 0.22), wallMat, { pos: [0, plinthH + 2.55, 1.2] }); // transom above door
    pw.addBox({
      id: 'house_mid_wall_left',
      min: new THREE.Vector3(hx - 4.3, floorY, hz + 0.9),
      max: new THREE.Vector3(hx - 1.1, floorY + 3.0, hz + 1.4),
    });
    pw.addBox({
      id: 'house_mid_wall_right',
      min: new THREE.Vector3(hx + 1.1, floorY, hz + 0.9),
      max: new THREE.Vector3(hx + 4.3, floorY + 3.0, hz + 1.4),
    });

    // Verandah wooden carved pillars
    for (const px of [-plinthW / 2 + 0.4, -1.4, 1.4, plinthW / 2 - 0.4]) {
      part(house, G.cyl(0.08, 0.1, 2.7, 8), woodMat, { pos: [px, plinthH + 1.35, plinthD / 2 - 0.3] });
    }

    // Kerala Sloped Clay Tile Roof
    part(house, G.box(plinthW + 1.2, 0.18, plinthD + 1.4), tileMat, {
      pos: [0, plinthH + 3.15, 0],
      rot: [-0.08, 0, 0],
    });
    // Roof ridge
    part(house, G.box(plinthW + 1.4, 0.4, 0.4), toon('#8C3220'), { pos: [0, plinthH + 3.45, -0.6] });

    // Interactive Front Door
    const doorPivot = group(house, [0.85, plinthH, 1.2]);
    const doorMesh = part(doorPivot, G.box(0.9, 2.15, 0.06), woodMat, { pos: [-0.45, 1.1, 0] });
    // brass handle
    part(doorPivot, G.sphere(0.04), toon(PALETTE.gold), { pos: [-0.8, 1.1, 0.05] });

    const doorId = 'house_front_door';
    this.doors.set(doorId, { root: doorMesh, pivot: doorPivot, isOpen: false, targetRot: 0 });
    this.interactives.push({
      id: doorId,
      type: 'door',
      name: "Front Door",
      position: new THREE.Vector3(hx, floorY, hz + 1.2),
      interactionDistance: 2.2,
      isOpen: false,
      mesh: doorMesh,
      actionPrompt: 'Open Door',
    });

    // Living Room Furniture: Table & Chairs
    part(house, G.box(1.6, 0.08, 1.0), woodMat, { pos: [2.2, plinthH + 0.75, -0.8] });
    for (const [cx, cz] of [
      [1.5, -0.4],
      [2.9, -0.4],
      [1.5, -1.2],
      [2.9, -1.2],
    ]) {
      part(house, G.cyl(0.035, 0.035, 0.72, 6), woodMat, { pos: [cx, plinthH + 0.36, cz] });
    }

    // Traditional Kerala hurricane lamp on table
    const lamp = group(house, [2.2, plinthH + 0.95, -0.8]);
    part(lamp, G.cyl(0.07, 0.09, 0.28, 8), toon(TONES.brass), { pos: [0, 0, 0] });
    const lampLight = new THREE.PointLight('#FFB852', 0.9, 6, 1.8);
    lampLight.position.set(0, 0.2, 0);
    lamp.add(lampLight);

    // Wall calendar (Chithira masam)
    part(house, G.plane(0.45, 0.65), toonUnique('#FFF9EE'), { pos: [2.2, plinthH + 1.8, -plinthD / 2 + 0.34] });

    // Bedroom Furniture: Wooden Bed / Cot
    const bedGroup = group(house, [-2.4, plinthH, -1.8]);
    // Bed frame
    part(bedGroup, G.box(1.8, 0.45, 2.3), woodMat, { pos: [0, 0.225, 0] });
    // Headboard
    part(bedGroup, G.box(1.85, 0.9, 0.12), woodMat, { pos: [0, 0.65, -1.1] });
    // Soft Mattress
    part(bedGroup, G.box(1.65, 0.22, 2.1), toon(PALETTE.cream), { pos: [0, 0.52, 0] });
    // Kerala Kasavu Bedsheet fold
    part(bedGroup, G.box(1.66, 0.06, 1.4), toon('#4A708B'), { pos: [0, 0.64, 0.3] });
    // Soft Pillow
    part(bedGroup, G.box(0.7, 0.14, 0.4), toon(PALETTE.softWhite), { pos: [0, 0.68, -0.75] });

    // Bed interaction: Sleep
    const bedWorldPos = new THREE.Vector3(hx - 2.4, floorY, hz - 1.8);
    this.interactives.push({
      id: 'player_bed',
      type: 'bed',
      name: 'Cozy Bed',
      position: bedWorldPos,
      interactionDistance: 2.2,
      actionPrompt: 'Sleep until Morning',
    });

    // Nightstand with brass water pitcher and tumbler (for hydration)
    const stand = group(house, [-3.6, plinthH, -1.8]);
    part(stand, G.box(0.65, 0.65, 0.65), woodMat, { pos: [0, 0.325, 0] });
    part(stand, G.cyl(0.08, 0.12, 0.32, 12), toon(TONES.brass), { pos: [0, 0.8, 0] }); // Pitcher (Koosa)
    part(stand, G.cyl(0.04, 0.045, 0.12, 10), toon(TONES.steel), { pos: [0.15, 0.72, 0.1] }); // Tumbler

    this.interactives.push({
      id: 'home_water_pitcher',
      type: 'water',
      name: 'Fresh Mountain Water',
      position: new THREE.Vector3(hx - 3.6, floorY, hz - 1.8),
      interactionDistance: 2.0,
      actionPrompt: 'Drink Fresh Water',
    });

    // Verandah Easy Chair (Charu Kasera) for resting and reducing fatigue
    const verandahPos = new THREE.Vector3(hx + 2.2, floorY, hz + 2.4);
    const chair = group(house, [2.2, plinthH, 2.4], [0, Math.PI, 0]);
    part(chair, G.box(0.65, 0.06, 0.65), woodMat, { pos: [0, 0.4, 0] });
    part(chair, G.box(0.65, 0.75, 0.06), woodMat, { pos: [0, 0.75, -0.3], rot: [-0.25, 0, 0] });
    for (const [cx, cz] of [
      [-0.28, -0.28],
      [0.28, -0.28],
      [-0.28, 0.28],
      [0.28, 0.28],
    ]) {
      part(chair, G.cyl(0.03, 0.03, 0.4, 6), woodMat, { pos: [cx, 0.2, cz] });
    }

    this.interactives.push({
      id: 'verandah_chair',
      type: 'chair',
      name: 'Verandah Easy Chair',
      position: verandahPos,
      interactionDistance: 1.8,
      facingYaw: 0,
      actionPrompt: 'Sit and Rest',
    });

    addOutline(house);
  }

  private buildSecondaryShops() {
    // Business Site 0: Chandrappan's Chayakkada (Original)
    this.businessLocations.push({
      id: 0,
      name: "Chandrappan's Chayakkada",
      ownerId: 'local',
      shopName: 'Chandrappan Chettante Chayakkada',
      center: new THREE.Vector3(0, 0.35, 0),
      counterPos: new THREE.Vector3(-0.6, 0.35, 0.6),
      queueSlots: [
        new THREE.Vector3(-0.35, 0, 2.8),
        new THREE.Vector3(0.95, 0, 2.8),
        new THREE.Vector3(2.2, 0, 2.8),
        new THREE.Vector3(3.3, 0, 2.95),
      ],
      serveSlots: [-2.1, -1.66, -1.22].map((x) => new THREE.Vector3(x, 1.37, 1.64)),
      seatSlots: [
        new THREE.Vector3(3.8, 0.1, -0.6),
        new THREE.Vector3(4.5, 0.1, -0.6),
        new THREE.Vector3(5.2, 0.1, -0.6),
      ],
      isOpen: true,
      money: 100,
      reputation: 5,
      colorTrim: '#245C3C',
    });

    // Business Site 1: Valley View Chayakkada
    const s1x = 28;
    const s1z = -0.5;
    const s1y = terrainHeight(s1x, s1z);
    this.buildShopBuilding(1, 'Valley View Chayakkada', '#9E4A28', s1x, s1y, s1z);

    this.businessLocations.push({
      id: 1,
      name: 'Valley View Chayakkada',
      ownerId: null,
      shopName: 'Valley View Chayakkada',
      center: new THREE.Vector3(s1x, s1y + 0.35, s1z),
      counterPos: new THREE.Vector3(s1x - 0.5, s1y + 0.35, s1z + 0.6),
      queueSlots: [
        new THREE.Vector3(s1x - 0.4, s1y, s1z + 2.8),
        new THREE.Vector3(s1x + 0.9, s1y, s1z + 2.8),
        new THREE.Vector3(s1x + 2.2, s1y, s1z + 2.8),
      ],
      serveSlots: [s1x - 1.8, s1x - 1.4, s1x - 1.0].map((x) => new THREE.Vector3(x, s1y + 1.37, s1z + 1.64)),
      seatSlots: [
        new THREE.Vector3(s1x + 4.2, s1y, s1z - 0.5),
        new THREE.Vector3(s1x + 4.9, s1y, s1z - 0.5),
      ],
      isOpen: false,
      money: 0,
      reputation: 4,
      colorTrim: '#9E4A28',
    });

    // Business Site 2: Hilltop Stall
    const s2x = -52;
    const s2z = -6.5;
    const s2y = terrainHeight(s2x, s2z);
    this.buildShopBuilding(2, 'Hilltop Tea Stall', '#2B5E7A', s2x, s2y, s2z);

    this.businessLocations.push({
      id: 2,
      name: 'Hilltop Tea Stall',
      ownerId: null,
      shopName: 'Hilltop Tea Stall',
      center: new THREE.Vector3(s2x, s2y + 0.35, s2z),
      counterPos: new THREE.Vector3(s2x - 0.5, s2y + 0.35, s2z + 0.6),
      queueSlots: [
        new THREE.Vector3(s2x - 0.4, s2y, s2z + 2.8),
        new THREE.Vector3(s2x + 0.9, s2y, s2z + 2.8),
      ],
      serveSlots: [s2x - 1.8, s2x - 1.4].map((x) => new THREE.Vector3(x, s2y + 1.37, s2z + 1.64)),
      seatSlots: [new THREE.Vector3(s2x + 3.8, s2y, s2z - 0.4)],
      isOpen: false,
      money: 0,
      reputation: 4,
      colorTrim: '#2B5E7A',
    });

    // Business Site 3: Highland Lodge & Chayakkada (Tea Shop + Hotel Lodge)
    const s3x = 58;
    const s3z = -3.5;
    const s3y = terrainHeight(s3x, s3z);
    this.buildLodgeBuilding(3, 'Highland Lodge & Chayakkada', '#5A3D28', s3x, s3y, s3z);

    this.businessLocations.push({
      id: 3,
      name: 'Highland Lodge & Chayakkada',
      ownerId: null,
      shopName: 'Highland Lodge & Chayakkada',
      center: new THREE.Vector3(s3x, s3y + 0.35, s3z),
      counterPos: new THREE.Vector3(s3x - 0.5, s3y + 0.35, s3z + 0.6),
      queueSlots: [
        new THREE.Vector3(s3x - 0.4, s3y, s3z + 2.8),
        new THREE.Vector3(s3x + 0.9, s3y, s3z + 2.8),
        new THREE.Vector3(s3x + 2.2, s3y, s3z + 2.8),
      ],
      serveSlots: [s3x - 1.8, s3x - 1.4, s3x - 1.0].map((x) => new THREE.Vector3(x, s3y + 1.37, s3z + 1.64)),
      seatSlots: [
        new THREE.Vector3(s3x + 4.2, s3y, s3z - 0.5),
        new THREE.Vector3(s3x + 5.0, s3y, s3z - 0.5),
      ],
      isOpen: false,
      money: 0,
      reputation: 5,
      colorTrim: '#5A3D28',
    });
  }

  private buildShopBuilding(id: number, name: string, trimColor: string, x: number, y: number, z: number) {
    const pw = this.physics;
    const root = group(this.root, [x, y, z]);
    const plinthW = 6.4;
    const plinthD = 4.8;
    const plinthH = 0.35;
    const floorY = y + plinthH;

    // Plinth floor
    part(root, G.box(plinthW, plinthH, plinthD), toon(TONES.soil), { pos: [0, plinthH / 2, 0] });
    pw.addBox({
      id: `shop_${id}_plinth`,
      min: new THREE.Vector3(x - plinthW / 2, y, z - plinthD / 2),
      max: new THREE.Vector3(x + plinthW / 2, floorY, z + plinthD / 2),
      isFloor: true,
      floorY: floorY,
    });

    // Wooden plank walls
    const wood = toon(TONES.woodLight);
    part(root, G.box(plinthW, 2.6, 0.15), wood, { pos: [0, plinthH + 1.3, -plinthD / 2 + 0.1] });
    part(root, G.box(0.15, 2.6, plinthD), wood, { pos: [-plinthW / 2 + 0.1, plinthH + 1.3, 0] });
    part(root, G.box(0.15, 2.6, plinthD), wood, { pos: [plinthW / 2 - 0.1, plinthH + 1.3, 0] });

    pw.addBox({
      id: `shop_${id}_back`,
      min: new THREE.Vector3(x - plinthW / 2, floorY, z - plinthD / 2),
      max: new THREE.Vector3(x + plinthW / 2, floorY + 2.8, z - plinthD / 2 + 0.2),
    });

    // Tin roof
    part(root, G.box(plinthW + 0.8, 0.08, plinthD + 1.0), toon(trimColor), {
      pos: [0, plinthH + 2.8, 0.2],
      rot: [0.12, 0, 0],
    });

    // Counter
    part(root, G.box(3.8, 1.02, 0.65), toon(TONES.woodMid), { pos: [-0.6, plinthH + 0.51, 1.4] });
    part(root, G.box(4.0, 0.06, 0.75), toon(trimColor), { pos: [-0.6, plinthH + 1.04, 1.4] });
    pw.addBox({
      id: `shop_${id}_counter`,
      min: new THREE.Vector3(x - 2.6, floorY, z + 1.0),
      max: new THREE.Vector3(x + 1.4, floorY + 1.2, z + 1.8),
    });

    // Shop signboard
    const sign = group(root, [0, plinthH + 3.1, 2.4]);
    part(sign, G.box(3.6, 0.65, 0.08), toon(trimColor), { pos: [0, 0, 0] });
    part(sign, G.plane(3.4, 0.55), toonUnique('#FFFFFF'), { pos: [0, 0, 0.045] });

    // Interactive Business Signboard
    this.interactives.push({
      id: `shop_sign_${id}`,
      type: 'sign',
      name: name,
      position: new THREE.Vector3(x, floorY + 1.5, z + 2.6),
      interactionDistance: 3.2,
      businessId: id,
      actionPrompt: 'Inspect Business Status / Lease',
    });

    // Drinking water drum
    part(root, G.cyl(0.25, 0.25, 0.7, 12), toon(TONES.steel), { pos: [2.2, plinthH + 0.35, 1.4] });
    this.interactives.push({
      id: `shop_water_${id}`,
      type: 'water',
      name: 'Shop Drinking Water',
      position: new THREE.Vector3(x + 2.2, floorY, z + 1.4),
      interactionDistance: 1.8,
      actionPrompt: 'Drink Clean Water',
    });

    addOutline(root);
  }

  private buildLodgeBuilding(id: number, name: string, trimColor: string, x: number, y: number, z: number) {
    const pw = this.physics;
    const root = group(this.root, [x, y, z]);
    const plinthW = 10.4;
    const plinthD = 7.2;
    const plinthH = 0.45;
    const floorY = y + plinthH;

    // Plinth floor
    part(root, G.box(plinthW, plinthH, plinthD), toon('#7C5A48'), { pos: [0, plinthH / 2, 0] });
    pw.addBox({
      id: `lodge_${id}_plinth`,
      min: new THREE.Vector3(x - plinthW / 2, y, z - plinthD / 2),
      max: new THREE.Vector3(x + plinthW / 2, floorY, z + plinthD / 2),
      isFloor: true,
      floorY: floorY,
    });

    // 2-story building walls
    const wallColor = toon('#EAE3D2');
    part(root, G.box(plinthW, 5.4, 0.25), wallColor, { pos: [0, plinthH + 2.7, -plinthD / 2 + 0.15] });
    part(root, G.box(0.25, 5.4, plinthD), wallColor, { pos: [-plinthW / 2 + 0.15, plinthH + 2.7, 0] });
    part(root, G.box(0.25, 5.4, plinthD), wallColor, { pos: [plinthW / 2 - 0.15, plinthH + 2.7, 0] });

    pw.addBox({
      id: `lodge_${id}_back`,
      min: new THREE.Vector3(x - plinthW / 2, floorY, z - plinthD / 2),
      max: new THREE.Vector3(x + plinthW / 2, floorY + 5.5, z - plinthD / 2 + 0.3),
    });

    // First floor balcony & railing
    part(root, G.box(plinthW + 0.4, 0.15, 1.8), toon(TONES.woodDark), { pos: [0, plinthH + 2.9, plinthD / 2 - 0.9] });
    part(root, G.box(plinthW + 0.4, 0.9, 0.08), toon(PALETTE.charcoal), { pos: [0, plinthH + 3.4, plinthD / 2] });

    // Large Kerala sloped roof
    part(root, G.box(plinthW + 1.2, 0.2, plinthD + 1.2), toon('#A34226'), {
      pos: [0, plinthH + 5.8, 0],
      rot: [-0.07, 0, 0],
    });

    // Restaurant counter on ground floor
    part(root, G.box(4.2, 1.02, 0.7), toon(TONES.woodMid), { pos: [-1.2, plinthH + 0.51, 1.8] });
    pw.addBox({
      id: `lodge_${id}_counter`,
      min: new THREE.Vector3(x - 3.4, floorY, z + 1.4),
      max: new THREE.Vector3(x + 1.0, floorY + 1.2, z + 2.2),
    });

    // Grand Signboard
    const sign = group(root, [0, plinthH + 4.9, plinthD / 2 + 0.1]);
    part(sign, G.box(5.8, 0.85, 0.1), toon(trimColor), { pos: [0, 0, 0] });
    part(sign, G.plane(5.6, 0.72), toonUnique('#FFFFFF'), { pos: [0, 0, 0.055] });

    this.interactives.push({
      id: `lodge_sign_${id}`,
      type: 'sign',
      name: name,
      position: new THREE.Vector3(x, floorY + 1.5, z + 3.0),
      interactionDistance: 3.5,
      businessId: id,
      actionPrompt: 'Inspect Lodge & Chayakkada',
    });

    addOutline(root);
  }

  private buildRoadsideVehicles() {
    const PI = Math.PI;
    const chrome = toon(TONES.steel);
    const dark = toon(PALETTE.charcoal);
    const tireMat = toon('#181816');
    const glassMat = toon('#2C424E', { opacity: 0.85 });

    // ---------------- Parked Auto-Rickshaw Stand (Munnar Auto Stand) ----------------
    const autoGroup = group(this.root, [18, 0.05, 4.2], [0, -0.2, 0]);
    const autoYellow = toon('#F4C428');

    // Lower chassis & yellow nose
    part(autoGroup, G.box(1.36, 0.62, 1.68), autoYellow, { pos: [0, 0.62, -0.3] });
    part(autoGroup, G.box(0.96, 0.54, 0.96), autoYellow, { pos: [0, 0.58, 0.8] });
    // Front mudguard
    part(autoGroup, G.cyl(0.3, 0.3, 0.22, 12, false, 0, PI), dark, { pos: [0, 0.36, 0.98], rot: [0, PI / 2, 0] });

    // Black curved canopy
    part(autoGroup, G.box(1.4, 0.08, 2.38), dark, { pos: [0, 1.74, -0.02] });
    part(autoGroup, G.sphere(0.72, 16, 8, 0, PI / 2), dark, { pos: [0, 1.72, -0.02], scale: [0.98, 0.24, 1.62] });

    // Tubular pillars & side rolled rain curtains
    for (const x of [-0.62, 0.62]) {
      part(autoGroup, G.cyl(0.022, 0.022, 0.88, 8), dark, { pos: [x, 1.3, 0.58] });
      part(autoGroup, G.cyl(0.022, 0.022, 0.88, 8), dark, { pos: [x, 1.3, -1.05] });
      part(autoGroup, G.cyl(0.016, 0.016, 0.62, 6), chrome, { pos: [x * 0.98, 1.15, -0.35] }); // grab rail
      // Rolled weather curtain
      const curtain = group(autoGroup, [x * 0.95, 1.66, -0.2]);
      part(curtain, G.cyl(0.038, 0.038, 0.72, 8), toon('#D4C8A8'), { rot: [PI / 2, 0, 0] });
      for (const sz of [-0.22, 0.22]) {
        part(curtain, G.box(0.09, 0.04, 0.04), toon('#5A311E'), { pos: [0, 0, sz], outline: false });
      }
    }

    // Windscreen + single wiper
    part(autoGroup, G.box(1.08, 0.56, 0.05), glassMat, { pos: [0, 1.28, 0.96], rot: [-0.16, 0, 0], outline: false });
    part(autoGroup, G.cyl(0.012, 0.012, 0.44, 6), dark, { pos: [0.08, 1.26, 0.99], rot: [0, 0, 0.35], outline: false });

    // Handlebars & Taxi Meter
    const autoDash = group(autoGroup, [0, 1.08, 0.55]);
    part(autoDash, G.box(0.7, 0.22, 0.24), dark, { pos: [0, 0, 0] });
    part(autoDash, G.cyl(0.022, 0.022, 0.62, 6), chrome, { pos: [0, 0.12, 0.08], rot: [0, 0, PI / 2] });
    const autoMeter = group(autoDash, [0.28, 0.16, 0.08]);
    part(autoMeter, G.box(0.12, 0.12, 0.12), toon(PALETTE.gold), { pos: [0, 0, 0] });

    // Maroon passenger bench
    part(autoGroup, G.box(1.22, 0.22, 0.55), toon('#5C241E'), { pos: [0, 0.76, -0.68] });
    part(autoGroup, G.box(1.22, 0.52, 0.16), toon('#5C241E'), { pos: [0, 1.09, -0.9], rot: [-0.12, 0, 0] });

    // Headlight & indicators
    part(autoGroup, G.cyl(0.12, 0.12, 0.08, 12), chrome, { pos: [0, 0.74, 1.28], rot: [PI / 2, 0, 0] });
    part(autoGroup, G.sphere(0.09, 10, 8, 0, PI / 2), new THREE.MeshBasicMaterial({ color: '#FFF8D0' }), {
      pos: [0, 0.74, 1.32],
      rot: [-PI / 2, 0, 0],
      outline: false,
    });
    for (const s of [-0.32, 0.32]) {
      part(autoGroup, G.sphere(0.04, 6, 6), new THREE.MeshBasicMaterial({ color: '#FFA826' }), { pos: [s, 0.74, 1.24], outline: false });
    }

    // Rear spare tire & bumper
    const autoSpare = group(autoGroup, [0, 0.85, -1.22]);
    part(autoSpare, G.cyl(0.24, 0.24, 0.14, 14), tireMat, { rot: [PI / 2, 0, 0] });
    part(autoSpare, G.cyl(0.14, 0.14, 0.16, 10), chrome, { rot: [PI / 2, 0, 0], outline: false });
    part(autoGroup, G.box(1.36, 0.1, 0.08), dark, { pos: [0, 0.38, -1.22] });

    // Detailed Wheels with metallic rims & center hubs
    const addAutoWheel = (wx: number, wz: number, r = 0.26, w = 0.18) => {
      const wg = group(autoGroup, [wx, r, wz]);
      part(wg, G.cyl(r, r, w, 16), tireMat, { rot: [0, 0, PI / 2] });
      part(wg, G.cyl(r * 0.65, r * 0.65, w + 0.015, 12), chrome, { rot: [0, 0, PI / 2], outline: false });
      part(wg, G.cyl(r * 0.3, r * 0.3, w + 0.03, 8), dark, { rot: [0, 0, PI / 2], outline: false });
    };
    addAutoWheel(0, 0.98, 0.25, 0.16);
    addAutoWheel(-0.64, -0.72, 0.27, 0.18);
    addAutoWheel(0.64, -0.72, 0.27, 0.18);

    this.interactives.push({
      id: 'auto_stand',
      type: 'vehicle',
      name: 'Munnar Auto Stand',
      position: new THREE.Vector3(18, 0, 4.2),
      interactionDistance: 2.8,
      actionPrompt: 'Talk to Auto Chettan',
    });

    // ---------------- Parked Kerala Plantation 4x4 Jeep ----------------
    const jeepGroup = group(this.root, [-16, 0.05, 4.4], [0, 0.1, 0]);
    const jeepPaint = toon('#2E5339'); // Plantation dark green

    // Lower chassis & body
    part(jeepGroup, G.box(1.68, 0.68, 3.7), jeepPaint, { pos: [0, 0.74, 0] });
    // Black fender flares
    for (const [fx, fz] of [[0.88, 1.18], [-0.88, 1.18], [0.88, -1.15], [-0.88, -1.15]]) {
      part(jeepGroup, G.box(0.16, 0.14, 0.85), dark, { pos: [fx, 0.75, fz] });
    }

    // Raised hood / bonnet
    part(jeepGroup, G.box(1.54, 0.32, 1.22), jeepPaint, { pos: [0, 1.18, 1.24] });

    // 7-Slot Front Grille
    const jGrille = group(jeepGroup, [0, 0.88, 1.86]);
    part(jGrille, G.box(1.12, 0.44, 0.04), jeepPaint, { pos: [0, 0, 0] });
    for (let i = -3; i <= 3; i++) {
      part(jGrille, G.box(0.04, 0.32, 0.05), dark, { pos: [i * 0.13, 0, 0.01], outline: false });
    }

    // Sealed-beam round headlights & amber turn signals
    for (const s of [-0.62, 0.62]) {
      part(jeepGroup, G.cyl(0.14, 0.14, 0.06, 14), chrome, { pos: [s, 0.92, 1.86], rot: [PI / 2, 0, 0] });
      part(jeepGroup, G.sphere(0.11, 12, 8, 0, PI / 2), new THREE.MeshBasicMaterial({ color: '#FFF8E0' }), {
        pos: [s, 0.92, 1.89],
        rot: [-PI / 2, 0, 0],
        outline: false,
      });
      part(jeepGroup, G.sphere(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: '#FFA826' }), { pos: [s, 0.76, 1.88], outline: false });
    }

    // Heavy front bumper with red tow hooks
    const jBmp = group(jeepGroup, [0, 0.48, 1.9]);
    part(jBmp, G.box(1.74, 0.18, 0.12), dark, { pos: [0, 0, 0] });
    for (const s of [-0.55, 0.55]) {
      part(jBmp, G.torus(0.05, 0.018, 4, 10), toon('#C9382B'), { pos: [s, 0, 0.08], rot: [PI / 2, 0, 0] });
    }

    // Foldable windshield with frame and wipers
    const jWs = group(jeepGroup, [0, 1.52, 0.62], [-0.18, 0, 0]);
    part(jWs, G.box(1.52, 0.66, 0.06), jeepPaint, { pos: [0, 0, 0] });
    part(jWs, G.box(1.34, 0.52, 0.07), glassMat, { pos: [0, 0, 0], outline: false });

    // Canvas Soft-Top Canopy
    const jHood = group(jeepGroup, [0, 1.62, -0.62]);
    part(jHood, G.box(1.64, 0.82, 2.28), toon('#C8BC9D'), { pos: [0, 0, 0] });
    for (const s of [-1, 1]) {
      part(jHood, G.box(0.04, 0.44, 1.75), glassMat, { pos: [s * 0.83, 0.05, -0.08], outline: false });
    }

    // Roof roll-bar with auxiliary spotlights
    const jRack = group(jeepGroup, [0, 2.05, 0.55]);
    part(jRack, G.box(1.6, 0.06, 0.08), dark, { pos: [0, 0, 0] });
    for (const rz of [-0.48, -0.16, 0.16, 0.48]) {
      part(jRack, G.cyl(0.07, 0.07, 0.06, 10), chrome, { pos: [rz, 0.08, 0.04], rot: [PI / 2, 0, 0] });
      part(jRack, G.sphere(0.055, 8, 6, 0, PI / 2), new THREE.MeshBasicMaterial({ color: '#FFF6D8' }), {
        pos: [rz, 0.08, 0.07],
        rot: [-PI / 2, 0, 0],
        outline: false,
      });
    }

    // Rear tailgate spare tire & red fuel jerry-can
    const jSpare = group(jeepGroup, [-0.22, 0.95, -1.92]);
    part(jSpare, G.cyl(0.38, 0.38, 0.24, 16), tireMat, { rot: [PI / 2, 0, 0] });
    part(jSpare, G.cyl(0.24, 0.24, 0.26, 12), dark, { rot: [PI / 2, 0, 0], outline: false });

    const jCan = group(jeepGroup, [0.52, 0.98, -1.88]);
    part(jCan, G.box(0.28, 0.44, 0.18), toon('#C9382B'), { pos: [0, 0, 0] });
    part(jCan, G.cyl(0.025, 0.025, 0.08, 6), dark, { pos: [0.08, 0.24, 0] });

    // Chunky off-road wheels
    const addJeepWheel = (wx: number, wz: number) => {
      const wg = group(jeepGroup, [wx, 0.38, wz]);
      part(wg, G.cyl(0.38, 0.38, 0.26, 16), tireMat, { rot: [0, 0, PI / 2] });
      part(wg, G.torus(0.36, 0.1, 6, 18), tireMat, { rot: [0, PI / 2, 0], outline: false });
      part(wg, G.cyl(0.24, 0.24, 0.28, 12), chrome, { rot: [0, 0, PI / 2], outline: false });
      part(wg, G.cyl(0.12, 0.12, 0.3, 8), dark, { rot: [0, 0, PI / 2], outline: false });
    };
    for (const [wx, wz] of [[-0.78, 1.2], [0.78, 1.2], [-0.78, -1.15], [0.78, -1.15]]) {
      addJeepWheel(wx, wz);
    }

    this.interactives.push({
      id: 'plantation_jeep',
      type: 'vehicle',
      name: 'Plantation 4x4 Jeep',
      position: new THREE.Vector3(-16, 0, 4.4),
      interactionDistance: 3.0,
      actionPrompt: 'Inspect Jeep Cargo',
    });

    // ---------------- Parked Kerala Bullet Motorcycle beside the shop ----------------
    const bikeGroup = group(this.root, [5.2, 0.05, 2.6], [0, 0.4, 0]);
    const bulletPaint = toon('#1C3426'); // Royal Enfield British racing green

    // Engine crankcase & cooling fins
    const bEng = group(bikeGroup, [0, 0.42, 0]);
    part(bEng, G.box(0.26, 0.32, 0.42), chrome, { pos: [0, 0, 0] });
    for (let i = 0; i < 4; i++) {
      part(bEng, G.box(0.28, 0.02, 0.4), dark, { pos: [0, -0.08 + i * 0.06, 0], outline: false });
    }

    // Teardrop fuel tank with gold pin-striping
    part(bikeGroup, G.sphere(0.22, 14, 10), bulletPaint, { pos: [0, 0.72, 0.24], scale: [0.7, 0.8, 1.4] });
    part(bikeGroup, G.torus(0.16, 0.012, 4, 16), toon(PALETTE.gold), { pos: [0, 0.72, 0.24], rot: [0, PI / 2, 0], outline: false });

    // Contoured spring saddle
    part(bikeGroup, G.box(0.28, 0.08, 0.46), toon('#2A1E14'), { pos: [0, 0.68, -0.22], rot: [0.12, 0, 0] });

    // Chrome sweeping exhaust pipe & silencer
    limb(bikeGroup, [0.14, 0.36, 0.1], [0.14, 0.24, -0.92], 0.042, chrome);

    // Front forks, round chrome headlamp & mirrors
    const bFork = group(bikeGroup, [0, 0.55, 0.68], [-0.3, 0, 0]);
    part(bFork, G.cyl(0.02, 0.02, 0.75, 8), chrome, { pos: [-0.08, 0, 0] });
    part(bFork, G.cyl(0.02, 0.02, 0.75, 8), chrome, { pos: [0.08, 0, 0] });
    // Headlamp
    part(bFork, G.sphere(0.09, 12, 10), chrome, { pos: [0, 0.38, 0.08] });
    part(bFork, G.sphere(0.075, 10, 8, 0, PI / 2), new THREE.MeshBasicMaterial({ color: '#FFF8E0' }), {
      pos: [0, 0.38, 0.15],
      rot: [-PI / 2, 0, 0],
      outline: false,
    });
    // Handlebar
    part(bFork, G.cyl(0.016, 0.016, 0.62, 8), chrome, { pos: [0, 0.46, 0.02], rot: [0, 0, PI / 2] });
    for (const s of [-0.28, 0.28]) {
      part(bFork, G.circle(0.04, 10), chrome, { pos: [s, 0.54, 0.02], rot: [0, -PI / 2, 0] });
    }

    // Spoked motorcycle wheels
    const addBikeWheel = (wz: number) => {
      const wg = group(bikeGroup, [0, 0.34, wz]);
      part(wg, G.torus(0.32, 0.045, 8, 20), tireMat, { rot: [0, PI / 2, 0] });
      part(wg, G.torus(0.28, 0.018, 6, 20), chrome, { rot: [0, PI / 2, 0], outline: false });
      part(wg, G.cyl(0.06, 0.06, 0.08, 8), chrome, { rot: [0, 0, PI / 2], outline: false });
    };
    addBikeWheel(0.85);
    addBikeWheel(-0.75);

    // Lean kickstand
    limb(bikeGroup, [0.05, 0.28, -0.05], [-0.18, 0.02, -0.05], 0.022, dark);

    this.interactives.push({
      id: 'vintage_bullet',
      type: 'vehicle',
      name: 'Kerala Vintage Bullet 350',
      position: new THREE.Vector3(5.2, 0, 2.6),
      interactionDistance: 2.2,
      actionPrompt: 'Admire Vintage Bullet',
    });

    addOutline(autoGroup);
    addOutline(jeepGroup);
    addOutline(bikeGroup);
  }

  private registerFurnitureInteractives() {
    // Bus stop bench
    this.interactives.push({
      id: 'bus_stop_bench',
      type: 'chair',
      name: 'Bus Stop Bench',
      position: new THREE.Vector3(-7.5, 0.1, 2.65),
      interactionDistance: 2.0,
      facingYaw: Math.PI,
      actionPrompt: 'Sit on Bus Stop Bench',
    });

    // Main shop annex benches
    this.interactives.push({
      id: 'shop_annex_bench_1',
      type: 'chair',
      name: 'Annex Bench',
      position: new THREE.Vector3(4.5, 0.1, -0.6),
      interactionDistance: 2.0,
      facingYaw: -Math.PI / 2,
      actionPrompt: 'Sit at Annex Table',
    });

    // Main shop water drum
    this.interactives.push({
      id: 'main_shop_water',
      type: 'water',
      name: 'Chayakkada Drinking Water',
      position: new THREE.Vector3(1.2, 0.35, -2.1),
      interactionDistance: 2.0,
      actionPrompt: 'Drink Fresh Water',
    });

    // Shop cleaning station (mop and cleaning bucket)
    this.interactives.push({
      id: 'shop_cleaning_bucket',
      type: 'clean',
      name: 'Cleaning Mop & Bucket',
      position: new THREE.Vector3(-3.5, 0.35, 2.9),
      interactionDistance: 2.0,
      actionPrompt: 'Clean Shop Tables & Floor',
    });
  }

  toggleDoor(doorId: string): boolean {
    const door = this.doors.get(doorId);
    if (!door) return false;
    door.isOpen = !door.isOpen;
    door.targetRot = door.isOpen ? -Math.PI * 0.45 : 0;

    const interactive = this.interactives.find((i) => i.id === doorId);
    if (interactive) {
      interactive.isOpen = door.isOpen;
      interactive.actionPrompt = door.isOpen ? 'Close Door' : 'Open Door';
    }
    return door.isOpen;
  }

  update(dt: number) {
    // Animate swinging doors smoothly
    for (const door of this.doors.values()) {
      door.pivot.rotation.y = THREE.MathUtils.damp(door.pivot.rotation.y, door.targetRot, 8, dt);
    }
  }

  getClosestInteractive(pos: THREE.Vector3, maxDist = 2.4): InteractiveObject | null {
    let closest: InteractiveObject | null = null;
    let closestDistSq = maxDist * maxDist;

    for (const item of this.interactives) {
      const dSq = pos.distanceToSquared(item.position);
      const limit = item.interactionDistance;
      if (dSq <= limit * limit && dSq < closestDistSq) {
        closestDistSq = dSq;
        closest = item;
      }
    }
    return closest;
  }
}
