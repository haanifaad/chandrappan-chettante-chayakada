import * as THREE from 'three';
import { PALETTE, TONES } from './palette';
import { G, addOutline, group, part, toon, toonUnique } from './toon';

export type FurnitureCategory = 'seating' | 'cooking' | 'service' | 'decor' | 'facility';

export interface FurnitureTierDef {
  level: number;
  name: string;
  malayalam: string;
  cost: number;
  buildTimeSeconds: number;
  stageRequired: number;
  reputationRequired: number;
  perkDescription: string;
  comfortBonus?: number;
  speedBonus?: number;
}

export interface FurnitureDef {
  id: string;
  name: string;
  malayalam: string;
  category: FurnitureCategory;
  description: string;
  defaultPosition: [number, number, number];
  defaultRotationY: number;
  tiers: FurnitureTierDef[];
}

export const FURNITURE_CATALOG: FurnitureDef[] = [
  {
    id: 'table_teak',
    name: 'Customer Dining Table',
    malayalam: 'ടേബിൾ',
    category: 'seating',
    description: 'Where customers sit and enjoy hot tea and snacks.',
    defaultPosition: [1.8, 0.35, 1.2],
    defaultRotationY: 0,
    tiers: [
      {
        level: 1,
        name: 'Rough Wooden Plank Table',
        malayalam: 'തടി മേശ',
        cost: 120,
        buildTimeSeconds: 5,
        stageRequired: 1,
        reputationRequired: 1.0,
        perkDescription: 'Rustic wooden planks. Basic customer comfort.',
        comfortBonus: 1.0,
      },
      {
        level: 2,
        name: 'Polished Teak Table',
        malayalam: 'പോളിഷ് ചെയ്ത തേക്ക് മേശ',
        cost: 320,
        buildTimeSeconds: 15,
        stageRequired: 2,
        reputationRequired: 1.8,
        perkDescription: 'Varnished teak wood with ceramic cups. Customers wait +10s.',
        comfortBonus: 1.2,
      },
      {
        level: 3,
        name: 'Heritage Glass & Brass Table',
        malayalam: 'പിച്ചള അലങ്കരിച്ച ഗ്ലാസ് മേശ',
        cost: 850,
        buildTimeSeconds: 30,
        stageRequired: 5,
        reputationRequired: 2.8,
        perkDescription: 'Tempered glass top with brass corner cuffs and fresh flower vase. Customers tip +25%.',
        comfortBonus: 1.5,
      },
    ],
  },
  {
    id: 'wood_bench',
    name: 'Kerala Tea Stall Bench',
    malayalam: 'തടി ബെഞ്ച്',
    category: 'seating',
    description: 'Long wooden bench for village regulars to chat and sip tea.',
    defaultPosition: [1.8, 0.35, 2.05],
    defaultRotationY: 0,
    tiers: [
      {
        level: 1,
        name: 'Rough Jackwood Bench',
        malayalam: 'പിലാവ് തടി ബെഞ്ച്',
        cost: 80,
        buildTimeSeconds: 4,
        stageRequired: 1,
        reputationRequired: 1.0,
        perkDescription: 'Traditional jackwood plank bench.',
        comfortBonus: 1.0,
      },
      {
        level: 2,
        name: 'Sanded Bench with Backrest',
        malayalam: 'ചാരു ബെഞ്ച്',
        cost: 220,
        buildTimeSeconds: 12,
        stageRequired: 2,
        reputationRequired: 1.6,
        perkDescription: 'Ergonomic wooden backrest for comfortable morning discussions.',
        comfortBonus: 1.25,
      },
      {
        level: 3,
        name: 'Cushioned Heritage Bench',
        malayalam: 'കുഷ്യൻ ഹെറിറ്റേജ് ബെഞ്ച്',
        cost: 600,
        buildTimeSeconds: 25,
        stageRequired: 4,
        reputationRequired: 2.6,
        perkDescription: 'Hand-carved rosewood with brass studs and burgundy cushions.',
        comfortBonus: 1.5,
      },
    ],
  },
  {
    id: 'gas_stove',
    name: 'Cooking Stove & Burner',
    malayalam: 'പാചക അടുപ്പ്',
    category: 'cooking',
    description: 'The culinary powerhouse for simmering tea, frying vadas, and heating tawas.',
    defaultPosition: [-2.78, 1.35, -0.15],
    defaultRotationY: 0,
    tiers: [
      {
        level: 1,
        name: 'Single Kerosene Stove',
        malayalam: 'മണ്ണെണ്ണ അടുപ്പ്',
        cost: 140,
        buildTimeSeconds: 8,
        stageRequired: 1,
        reputationRequired: 1.0,
        perkDescription: 'Manual pressure burner. Steady heat.',
        speedBonus: 1.0,
      },
      {
        level: 2,
        name: 'Double Brass LPG Gas Stove',
        malayalam: 'ഇരട്ട ഗ്യാസ് സ്റ്റൗ',
        cost: 380,
        buildTimeSeconds: 20,
        stageRequired: 2,
        reputationRequired: 2.0,
        perkDescription: 'Dual blue-flame brass burners with LPG cylinder. Cooking speed +25%.',
        speedBonus: 1.25,
      },
      {
        level: 3,
        name: 'Commercial Triple-Burner Range',
        malayalam: 'കൊമേഴ്സ്യൽ സ്റ്റെയിൻലെസ്സ് റേഞ്ച്',
        cost: 950,
        buildTimeSeconds: 40,
        stageRequired: 5,
        reputationRequired: 3.0,
        perkDescription: 'High-pressure stainless steel commercial burner. Cooking speed +50%.',
        speedBonus: 1.5,
      },
    ],
  },
  {
    id: 'chaya_samovar',
    name: 'Tea Samovar Boiler',
    malayalam: 'ചായ സാമോവാർ',
    category: 'cooking',
    description: 'Continuous boiling water reservoir for the authentic Malabar tea pull.',
    defaultPosition: [-2.65, 1.37, 1.42],
    defaultRotationY: 0,
    tiers: [
      {
        level: 1,
        name: 'Aluminum Boiler Kettle',
        malayalam: 'അലുമിനിയം കെറ്റിൽ',
        cost: 110,
        buildTimeSeconds: 5,
        stageRequired: 1,
        reputationRequired: 1.0,
        perkDescription: 'Standard aluminum kettle with single brass spigot.',
        speedBonus: 1.0,
      },
      {
        level: 2,
        name: 'Traditional Brass Samovar',
        malayalam: 'പിച്ചള സാമോവാർ',
        cost: 360,
        buildTimeSeconds: 18,
        stageRequired: 3,
        reputationRequired: 2.2,
        perkDescription: 'Gleaming cylindrical brass body with steam valve and twin handles.',
        speedBonus: 1.2,
      },
      {
        level: 3,
        name: 'Royal Golden 3-Tap Samovar',
        malayalam: 'റോയൽ ഗോൾഡൻ സാമോവാർ',
        cost: 880,
        buildTimeSeconds: 35,
        stageRequired: 6,
        reputationRequired: 3.2,
        perkDescription: 'Mirror-polished gold finish with crown finial and 3 serving spigots.',
        speedBonus: 1.45,
      },
    ],
  },
  {
    id: 'snack_cabinet',
    name: 'Glass Display Showcase',
    malayalam: 'പലഹാര കൂട്',
    category: 'service',
    description: 'Showcases fresh hot snacks like banana fry, parippuvada, and samosas.',
    defaultPosition: [-0.4, 1.37, 1.6],
    defaultRotationY: 0,
    tiers: [
      {
        level: 1,
        name: 'Wooden Wire Mesh Box',
        malayalam: 'കമ്പി വല കൂട്',
        cost: 90,
        buildTimeSeconds: 6,
        stageRequired: 1,
        reputationRequired: 1.0,
        perkDescription: 'Traditional wooden frame with fine wire mesh.',
        comfortBonus: 1.0,
      },
      {
        level: 2,
        name: 'Slanted Glass Showcase',
        malayalam: 'ഗ്ലാസ് പലഹാര കൂട്',
        cost: 290,
        buildTimeSeconds: 15,
        stageRequired: 2,
        reputationRequired: 1.8,
        perkDescription: 'Hygienic angled glass front showing crunchy golden snacks.',
        comfortBonus: 1.15,
      },
      {
        level: 3,
        name: 'Illuminated Heated Showcase',
        malayalam: 'ഹീറ്റിംഗ് ഗ്ലാസ് കാബിനറ്റ്',
        cost: 750,
        buildTimeSeconds: 30,
        stageRequired: 4,
        reputationRequired: 2.8,
        perkDescription: 'Interior warm halogen lamps keep snacks crispy hot. Snack sales +20%.',
        comfortBonus: 1.35,
      },
    ],
  },
  {
    id: 'water_filter',
    name: 'Drinking Water Station',
    malayalam: 'ശുദ്ധജല ഫിൽട്ടർ',
    category: 'facility',
    description: 'Refreshing cool mountain water for thirsty visitors.',
    defaultPosition: [3.1, 0.35, -0.6],
    defaultRotationY: -Math.PI / 2,
    tiers: [
      {
        level: 1,
        name: 'Terracotta Clay Kooja',
        malayalam: 'മൺ കൂജ',
        cost: 60,
        buildTimeSeconds: 4,
        stageRequired: 1,
        reputationRequired: 1.0,
        perkDescription: 'Earthen pot naturally chilling water on an iron ring stand.',
        comfortBonus: 1.0,
      },
      {
        level: 2,
        name: 'Dual Chamber Steel Filter',
        malayalam: 'സ്റ്റീൽ വാട്ടർ ഫിൽട്ടർ',
        cost: 240,
        buildTimeSeconds: 14,
        stageRequired: 2,
        reputationRequired: 1.6,
        perkDescription: 'Twin polished stainless steel barrels with brass lever tap.',
        comfortBonus: 1.2,
      },
      {
        level: 3,
        name: 'Purified Water Dispenser',
        malayalam: 'പ്യൂരിഫയർ കൂളർ',
        cost: 620,
        buildTimeSeconds: 28,
        stageRequired: 4,
        reputationRequired: 2.6,
        perkDescription: 'Electric UV filtered cold/hot water dispenser with cup tray.',
        comfortBonus: 1.4,
      },
    ],
  },
  {
    id: 'waste_bin',
    name: 'Waste & Recycling Bin',
    malayalam: 'വേസ്റ്റ് ബിൻ',
    category: 'facility',
    description: 'Maintains shop hygiene by providing clean disposal for tea cups and wrappers.',
    defaultPosition: [3.1, 0.35, 1.8],
    defaultRotationY: 0,
    tiers: [
      {
        level: 1,
        name: 'Woven Bamboo Basket',
        malayalam: 'ഈറ്റ കൊട്ട',
        cost: 40,
        buildTimeSeconds: 3,
        stageRequired: 1,
        reputationRequired: 1.0,
        perkDescription: 'Rustic woven basket for leaf plates and cups.',
        comfortBonus: 1.0,
      },
      {
        level: 2,
        name: 'Galvanized Pedal Bin',
        malayalam: 'പെഡൽ ബിൻ',
        cost: 150,
        buildTimeSeconds: 10,
        stageRequired: 2,
        reputationRequired: 1.5,
        perkDescription: 'Enamelled steel bin with sanitary foot pedal opening.',
        comfortBonus: 1.15,
      },
      {
        level: 3,
        name: 'Eco-Sort Dual Recycling Station',
        malayalam: 'ഇക്കോ വേസ്റ്റ് സ്റ്റേഷൻ',
        cost: 450,
        buildTimeSeconds: 22,
        stageRequired: 4,
        reputationRequired: 2.5,
        perkDescription: 'Dual compartment stainless station for compost and recyclables.',
        comfortBonus: 1.3,
      },
    ],
  },
  {
    id: 'wall_signboard',
    name: 'Chalk Menu & Daily Specials Board',
    malayalam: 'മെനു ബോർഡ്',
    category: 'decor',
    description: 'Displays the day\'s fresh items and tea pricing in authentic Malayalam script.',
    defaultPosition: [-1.2, 2.5, -2.35],
    defaultRotationY: 0,
    tiers: [
      {
        level: 1,
        name: 'Painted Plywood Board',
        malayalam: 'പ്ലൈവുഡ് ബോർഡ്',
        cost: 70,
        buildTimeSeconds: 5,
        stageRequired: 1,
        reputationRequired: 1.0,
        perkDescription: 'Simple painted board with chalked tea rates.',
        comfortBonus: 1.0,
      },
      {
        level: 2,
        name: 'Framed Teak Menu Board',
        malayalam: 'തേക്ക് ഫ്രെയിം ചെയ്ത മെനു ബോർഡ്',
        cost: 200,
        buildTimeSeconds: 12,
        stageRequired: 2,
        reputationRequired: 1.8,
        perkDescription: 'Carved teak frame with white calligraphy and brass corner brackets.',
        comfortBonus: 1.15,
      },
      {
        level: 3,
        name: 'Retro Neon & Teak Signboard',
        malayalam: 'നിയോൺ ബോർഡ്',
        cost: 550,
        buildTimeSeconds: 26,
        stageRequired: 5,
        reputationRequired: 2.8,
        perkDescription: 'Warm golden neon glow framing with illuminated specials banner.',
        comfortBonus: 1.35,
      },
    ],
  },
  {
    id: 'vintage_radio',
    name: 'Kerala Village Radio',
    malayalam: 'റേഡിയോ',
    category: 'decor',
    description: 'Broadcasts classic Malayalam film hits and morning news bulletin.',
    defaultPosition: [-2.1, 1.4, 0.4],
    defaultRotationY: Math.PI / 4,
    tiers: [
      {
        level: 1,
        name: 'Transistor Pocket Radio',
        malayalam: 'ട്രാൻസിസ്റ്റർ റേഡിയോ',
        cost: 130,
        buildTimeSeconds: 6,
        stageRequired: 1,
        reputationRequired: 1.0,
        perkDescription: 'Telescopic chrome antenna playing AIR All India Radio.',
        comfortBonus: 1.1,
      },
      {
        level: 2,
        name: 'Teak Valve Table Radio',
        malayalam: 'തേക്ക് ടേബിൾ റേഡിയോ',
        cost: 350,
        buildTimeSeconds: 16,
        stageRequired: 3,
        reputationRequired: 2.0,
        perkDescription: '1960s wooden cabinet with glowing analog dial and rich acoustics.',
        comfortBonus: 1.25,
      },
      {
        level: 3,
        name: 'Master Gramophone & Stereo Receiver',
        malayalam: 'ഗ്രാമഫോൺ & ഹൈ-ഫൈ',
        cost: 820,
        buildTimeSeconds: 32,
        stageRequired: 5,
        reputationRequired: 3.0,
        perkDescription: 'Fluted brass horn gramophone and stereo speakers. Customer wait +15s.',
        comfortBonus: 1.45,
      },
    ],
  },
  {
    id: 'billing_counter',
    name: 'Cash Desk & Money Till',
    malayalam: 'പണപ്പെട്ടി മേശ',
    category: 'service',
    description: 'Chandrappan Chettan\'s billing table for counting revenue and keeping order slips.',
    defaultPosition: [-1.2, 0.35, 1.6],
    defaultRotationY: 0,
    tiers: [
      {
        level: 1,
        name: 'Small Teak Cash Box',
        malayalam: 'തടി പണപ്പെട്ടി',
        cost: 100,
        buildTimeSeconds: 5,
        stageRequired: 1,
        reputationRequired: 1.0,
        perkDescription: 'Sturdy wooden money box with brass hasp and padlock.',
        comfortBonus: 1.0,
      },
      {
        level: 2,
        name: 'Glass-Top Billing Desk',
        malayalam: 'ഗ്ലാസ് ടോപ്പ് ക്യാഷ് ഡെസ്ക്',
        cost: 300,
        buildTimeSeconds: 15,
        stageRequired: 2,
        reputationRequired: 1.8,
        perkDescription: 'Polished desk with bill spindle, stamp pad, and sliding cash drawer.',
        comfortBonus: 1.15,
      },
      {
        level: 3,
        name: 'Carved Rosewood Executive Till',
        malayalam: 'റോസ് വുഡ് എക്സിക്യൂട്ടീവ് കൗണ്ടർ',
        cost: 780,
        buildTimeSeconds: 30,
        stageRequired: 4,
        reputationRequired: 2.8,
        perkDescription: 'Intricate Kerala floral carvings, brass railing, and antique bell till.',
        comfortBonus: 1.35,
      },
    ],
  },
];

// ===================================================================== 3D Models

export function buildTableMesh(level: number, isDirty: boolean): THREE.Group {
  const root = new THREE.Group();
  root.name = 'table_model';

  if (level === 1) {
    // Level 1: Rough wooden plank table
    const wood = toon(TONES.woodMid);
    const dark = toon(TONES.woodDark);
    // Plank tabletop
    part(root, G.box(1.2, 0.06, 0.75), wood, { pos: [0, 0.72, 0] });
    // 4 square sturdy legs
    for (const x of [-0.5, 0.5]) {
      for (const z of [-0.28, 0.28]) {
        part(root, G.box(0.08, 0.7, 0.08), dark, { pos: [x, 0.35, z] });
      }
    }
    // Under-table stretchers
    part(root, G.box(0.95, 0.04, 0.04), dark, { pos: [0, 0.2, 0] });
  } else if (level === 2) {
    // Level 2: Sanded Teak Table with smooth round edges
    const teak = toon(TONES.woodLight);
    const darkTeak = toon(TONES.woodDark);
    // Beveled smooth tabletop
    part(root, G.box(1.3, 0.08, 0.8), teak, { pos: [0, 0.73, 0] });
    // Turned cylindrical teak legs
    for (const x of [-0.52, 0.52]) {
      for (const z of [-0.3, 0.3]) {
        part(root, G.cyl(0.045, 0.04, 0.7, 12), darkTeak, { pos: [x, 0.35, z] });
        part(root, G.sphere(0.05, 8, 6), toon(PALETTE.gold), { pos: [x, 0.03, z] }); // brass feet
      }
    }
    // Table runner cloth
    part(root, G.box(0.3, 0.005, 0.82), toon(PALETTE.cream), { pos: [0, 0.775, 0], outline: false });
    // Ceramic cup
    part(root, G.cyl(0.03, 0.025, 0.07, 10), toon(PALETTE.softWhite), { pos: [0.35, 0.81, 0.15] });
  } else {
    // Level 3: Heritage Glass & Brass Table
    const rosewood = toon(TONES.woodDark);
    const brass = toon(PALETTE.gold);
    const glass = toonUnique(TONES.glass, { opacity: 0.7, side: THREE.DoubleSide });
    // Rosewood border frame
    part(root, G.box(1.35, 0.07, 0.85), rosewood, { pos: [0, 0.71, 0] });
    // Inset tempered glass plate
    part(root, G.box(1.22, 0.02, 0.72), glass, { pos: [0, 0.75, 0], outline: false });
    // Brass corner braces
    for (const x of [-0.62, 0.62]) {
      for (const z of [-0.38, 0.38]) {
        part(root, G.box(0.12, 0.075, 0.12), brass, { pos: [x, 0.71, z] });
      }
    }
    // Carved fluted legs with brass caps
    for (const x of [-0.54, 0.54]) {
      for (const z of [-0.32, 0.32]) {
        part(root, G.cyl(0.05, 0.04, 0.68, 12), rosewood, { pos: [x, 0.34, z] });
        part(root, G.cyl(0.055, 0.055, 0.08, 12), brass, { pos: [x, 0.04, z] });
      }
    }
    // Brass flower vase with red hibiscus
    part(root, G.cyl(0.03, 0.05, 0.14, 10), brass, { pos: [0, 0.83, 0] });
    part(root, G.sphere(0.035, 8, 6), toon(PALETTE.terracotta), { pos: [0, 0.92, 0], outline: false });
  }

  // Dirty table overlay (used plates, tea stains, biscuit crumbs)
  if (isDirty) {
    const stain = toonUnique('#7A4520', { opacity: 0.85 });
    part(root, G.cyl(0.07, 0.07, 0.005, 12), stain, { pos: [-0.2, 0.78, -0.1], outline: false });
    part(root, G.cyl(0.05, 0.05, 0.005, 12), stain, { pos: [0.15, 0.78, 0.1], outline: false });
    // Used tea glass
    part(root, G.cyl(0.03, 0.025, 0.065, 8), toon(TONES.glass), { pos: [-0.2, 0.81, -0.1] });
    // Crumbs
    for (let i = 0; i < 4; i++) {
      part(root, G.box(0.015, 0.008, 0.015), toon(TONES.friedDark), {
        pos: [-0.1 + i * 0.08, 0.78, 0.05 - (i % 2) * 0.06],
        outline: false,
      });
    }
  }

  addOutline(root);
  return root;
}

export function buildBenchMesh(level: number): THREE.Group {
  const root = new THREE.Group();
  root.name = 'bench_model';

  if (level === 1) {
    // Level 1: Rough Jackwood Bench
    const wood = toon(TONES.woodMid);
    part(root, G.box(1.2, 0.05, 0.32), wood, { pos: [0, 0.45, 0] });
    for (const x of [-0.5, 0.5]) {
      part(root, G.box(0.07, 0.44, 0.28), wood, { pos: [x, 0.22, 0] });
    }
  } else if (level === 2) {
    // Level 2: Sanded Bench with Backrest
    const teak = toon(TONES.woodLight);
    const dark = toon(TONES.woodDark);
    part(root, G.box(1.3, 0.06, 0.36), teak, { pos: [0, 0.46, 0] });
    for (const x of [-0.52, 0.52]) {
      part(root, G.cyl(0.035, 0.035, 0.45, 8), dark, { pos: [x, 0.23, -0.12] });
      part(root, G.cyl(0.035, 0.035, 0.85, 8), dark, { pos: [x, 0.43, 0.15] });
    }
    // Backrest slatted panel
    part(root, G.box(1.3, 0.16, 0.03), teak, { pos: [0, 0.78, 0.15] });
  } else {
    // Level 3: Cushioned Heritage Bench
    const rosewood = toon(TONES.woodDark);
    const cushion = toon(PALETTE.terracotta);
    const brass = toon(PALETTE.gold);
    // Base frame
    part(root, G.box(1.35, 0.08, 0.4), rosewood, { pos: [0, 0.44, 0] });
    // Burgundy padded cushion
    part(root, G.box(1.28, 0.07, 0.36), cushion, { pos: [0, 0.5, 0] });
    // Brass studs
    for (let i = 0; i < 6; i++) {
      part(root, G.sphere(0.015, 6, 4), brass, { pos: [-0.55 + i * 0.22, 0.44, 0.205], outline: false });
    }
    // Curved backrest with carved finials
    for (const x of [-0.55, 0.55]) {
      part(root, G.cyl(0.04, 0.04, 0.9, 10), rosewood, { pos: [x, 0.45, 0.17] });
      part(root, G.sphere(0.05, 8, 6), brass, { pos: [x, 0.92, 0.17] });
    }
    part(root, G.box(1.28, 0.22, 0.04), rosewood, { pos: [0, 0.75, 0.17] });
    part(root, G.box(1.15, 0.16, 0.02), cushion, { pos: [0, 0.75, 0.15], outline: false });
  }

  addOutline(root);
  return root;
}

export function buildStoveMesh(level: number): THREE.Group {
  const root = new THREE.Group();
  root.name = 'stove_model';

  if (level === 1) {
    // Level 1: Kerosene Single Burner
    const iron = toon(TONES.iron);
    const brass = toon(PALETTE.gold);
    // Base cylinder reservoir
    part(root, G.cyl(0.18, 0.2, 0.15, 14), toon(PALETTE.terracotta), { pos: [0, 0.075, 0] });
    // Pump cylinder handle
    part(root, G.cyl(0.02, 0.02, 0.15, 8), brass, { pos: [0.18, 0.12, 0], rot: [0, 0, Math.PI / 4] });
    // Sturdy pot riser rods
    for (let a = 0; a < 3; a++) {
      const angle = (a * Math.PI * 2) / 3;
      part(root, G.box(0.02, 0.2, 0.02), iron, { pos: [Math.cos(angle) * 0.14, 0.2, Math.sin(angle) * 0.14] });
    }
    // Burner head
    part(root, G.cyl(0.06, 0.08, 0.06, 12), brass, { pos: [0, 0.22, 0] });
    // Small orange flame
    part(root, G.cone(0.05, 0.08, 8), toonUnique('#FF9532', { emissive: '#FF7700', emissiveIntensity: 1.5 }), {
      pos: [0, 0.28, 0],
      outline: false,
    });
  } else if (level === 2) {
    // Level 2: Double Brass LPG Gas Stove with Red Cylinder
    const steel = toon(TONES.steel);
    const brass = toon(PALETTE.gold);
    const red = toon(PALETTE.terracotta);
    // Double burner steel chassis
    part(root, G.box(0.65, 0.08, 0.36), steel, { pos: [0, 0.04, 0] });
    // Control knobs
    part(root, G.cyl(0.02, 0.02, 0.02, 8), toon(PALETTE.charcoal), { pos: [-0.15, 0.04, 0.185], rot: [Math.PI / 2, 0, 0] });
    part(root, G.cyl(0.02, 0.02, 0.02, 8), toon(PALETTE.charcoal), { pos: [0.15, 0.04, 0.185], rot: [Math.PI / 2, 0, 0] });
    // Dual brass burners
    for (const x of [-0.16, 0.16]) {
      part(root, G.cyl(0.07, 0.07, 0.03, 14), brass, { pos: [x, 0.09, 0] });
      part(root, G.torus(0.06, 0.012, 6, 16), toonUnique('#4CA3FF', { emissive: '#0066FF', emissiveIntensity: 2.0 }), {
        pos: [x, 0.11, 0],
        rot: [Math.PI / 2, 0, 0],
        outline: false,
      });
    }
    // Red LPG cylinder standing beside
    const cyl = group(root, [0.48, -0.15, 0.05]);
    part(cyl, G.cyl(0.12, 0.12, 0.45, 14), red, { pos: [0, 0.225, 0] });
    part(cyl, G.sphere(0.12, 14, 8, 0, Math.PI / 2), red, { pos: [0, 0.45, 0] });
    part(cyl, G.torus(0.06, 0.015, 4, 14), toon(TONES.steelDark), { pos: [0, 0.56, 0], rot: [Math.PI / 2, 0, 0] });
  } else {
    // Level 3: Commercial 3-Burner Heavy Duty Stainless Range
    const steel = toon(TONES.steel);
    const darkSteel = toon(TONES.steelDark);
    const brass = toon(PALETTE.gold);
    // Heavy wide stainless chassis
    part(root, G.box(0.95, 0.12, 0.42), steel, { pos: [0, 0.06, 0] });
    // High-pressure brass valves
    for (let i = 0; i < 3; i++) {
      const x = -0.3 + i * 0.3;
      part(root, G.cyl(0.025, 0.025, 0.03, 10), brass, { pos: [x, 0.06, 0.22], rot: [Math.PI / 2, 0, 0] });
      // Heavy cast iron pan grates
      part(root, G.box(0.24, 0.02, 0.24), darkSteel, { pos: [x, 0.13, 0] });
      // High heat blue dual-ring flame
      part(root, G.torus(0.08, 0.014, 6, 20), toonUnique('#3894FF', { emissive: '#0077FF', emissiveIntensity: 2.5 }), {
        pos: [x, 0.13, 0],
        rot: [Math.PI / 2, 0, 0],
        outline: false,
      });
    }
  }

  addOutline(root);
  return root;
}

export function buildSamovarMesh(level: number): THREE.Group {
  const root = new THREE.Group();
  root.name = 'samovar_model';

  if (level === 1) {
    // Level 1: Aluminum Kettle
    const alu = toon(TONES.steel);
    const brass = toon(PALETTE.gold);
    part(root, G.cyl(0.14, 0.16, 0.26, 16), alu, { pos: [0, 0.13, 0] });
    part(root, G.sphere(0.14, 16, 8, 0, Math.PI / 2), alu, { pos: [0, 0.26, 0] });
    part(root, G.cyl(0.02, 0.015, 0.12, 8), brass, { pos: [0, 0.06, 0.16], rot: [Math.PI / 4, 0, 0] });
    // Arc handle
    part(root, G.torus(0.12, 0.015, 4, 16, Math.PI), toon(PALETTE.charcoal), { pos: [0, 0.32, 0] });
  } else if (level === 2) {
    // Level 2: Traditional Brass Samovar
    const brass = toon(PALETTE.gold);
    const darkBrass = toon(TONES.brassDark);
    // Main boiler cylinder
    part(root, G.cyl(0.16, 0.18, 0.52, 18), brass, { pos: [0, 0.28, 0] });
    // Stepped domed lid
    part(root, G.cyl(0.14, 0.17, 0.06, 16), darkBrass, { pos: [0, 0.57, 0] });
    part(root, G.sphere(0.13, 16, 8, 0, Math.PI / 2), brass, { pos: [0, 0.6, 0] });
    // Crown finial & steam vent
    part(root, G.cone(0.04, 0.09, 8), brass, { pos: [0, 0.76, 0] });
    // Serving brass tap with turn valve
    part(root, G.cyl(0.02, 0.015, 0.08, 8), brass, { pos: [0, 0.12, 0.19], rot: [Math.PI / 3, 0, 0] });
    part(root, G.box(0.06, 0.01, 0.02), darkBrass, { pos: [0, 0.16, 0.22] });
    // Side carrying brass handles
    for (const s of [-1, 1]) {
      part(root, G.torus(0.05, 0.012, 4, 12, Math.PI), brass, { pos: [s * 0.18, 0.36, 0], rot: [0, 0, s * (Math.PI / 2)] });
    }
  } else {
    // Level 3: Royal Golden 3-Tap Samovar
    const gold = toonUnique('#F3C452', { emissive: '#553300', emissiveIntensity: 0.3 });
    const darkGold = toon(PALETTE.gold);
    // Ornate fluted base pedestal
    part(root, G.cyl(0.2, 0.24, 0.1, 18), darkGold, { pos: [0, 0.05, 0] });
    // Mirror-polished golden main cylinder
    part(root, G.cyl(0.18, 0.2, 0.58, 20), gold, { pos: [0, 0.39, 0] });
    // Ornamental crown top
    part(root, G.sphere(0.18, 20, 10, 0, Math.PI / 2), gold, { pos: [0, 0.68, 0] });
    part(root, G.cone(0.06, 0.14, 10), gold, { pos: [0, 0.88, 0] });
    part(root, G.sphere(0.03, 8, 6), darkGold, { pos: [0, 0.96, 0] });
    // 3 Golden Spigots
    for (let i = 0; i < 3; i++) {
      const angle = -0.45 + i * 0.45;
      const x = Math.sin(angle) * 0.19;
      const z = Math.cos(angle) * 0.19;
      part(root, G.cyl(0.022, 0.016, 0.09, 8), darkGold, { pos: [x, 0.16, z], rot: [Math.PI / 3, 0, -angle] });
    }
  }

  addOutline(root);
  return root;
}

export function buildCabinetMesh(level: number): THREE.Group {
  const root = new THREE.Group();
  root.name = 'cabinet_model';

  if (level === 1) {
    // Level 1: Wooden Wire Mesh Box
    const wood = toon(TONES.woodMid);
    part(root, G.box(0.55, 0.42, 0.35), wood, { pos: [0, 0.21, 0] });
    // Open mesh front aperture
    part(root, G.box(0.45, 0.32, 0.01), toon(TONES.steelDark), { pos: [0, 0.21, 0.176], outline: false });
  } else if (level === 2) {
    // Level 2: Slanted Glass Showcase
    const wood = toon(TONES.woodLight);
    const glass = toonUnique(TONES.glass, { opacity: 0.65, side: THREE.DoubleSide });
    part(root, G.box(0.65, 0.06, 0.4), wood, { pos: [0, 0.03, 0] });
    part(root, G.box(0.65, 0.38, 0.38), glass, { pos: [0, 0.24, 0], outline: false });
    // Glass interior shelf
    part(root, G.box(0.6, 0.01, 0.3), glass, { pos: [0, 0.24, 0], outline: false });
    // Snacks on shelf: golden banana fritters
    for (let i = 0; i < 3; i++) {
      part(root, G.box(0.08, 0.03, 0.12), toon(TONES.banana), { pos: [-0.18 + i * 0.18, 0.26, 0] });
    }
  } else {
    // Level 3: Illuminated Heated Showcase
    const steel = toon(TONES.steel);
    const gold = toon(PALETTE.gold);
    const glass = toonUnique(TONES.glass, { opacity: 0.7, side: THREE.DoubleSide });
    part(root, G.box(0.75, 0.08, 0.45), steel, { pos: [0, 0.04, 0] });
    part(root, G.box(0.75, 0.48, 0.45), glass, { pos: [0, 0.32, 0], outline: false });
    // Gold trim frames
    for (const x of [-0.36, 0.36]) {
      part(root, G.box(0.03, 0.48, 0.03), gold, { pos: [x, 0.32, 0.22] });
    }
    // Warm top light hood
    part(root, G.box(0.75, 0.06, 0.45), toonUnique('#FFE79A', { emissive: '#FFB833', emissiveIntensity: 0.8 }), {
      pos: [0, 0.58, 0],
      outline: false,
    });
    // Tiered snacks
    for (let r = 0; r < 2; r++) {
      const y = 0.2 + r * 0.18;
      part(root, G.box(0.68, 0.015, 0.35), steel, { pos: [0, y, 0] });
      for (let i = 0; i < 4; i++) {
        part(root, G.sphere(0.04, 8, 6), toon(TONES.fried), { pos: [-0.22 + i * 0.15, y + 0.04, 0] });
      }
    }
  }

  addOutline(root);
  return root;
}

export function buildWaterFilterMesh(level: number): THREE.Group {
  const root = new THREE.Group();
  root.name = 'water_filter_model';

  if (level === 1) {
    // Level 1: Terracotta Clay Kooja
    const clay = toon(PALETTE.terracotta);
    const iron = toon(PALETTE.charcoal);
    // Wrought iron 3-legged ring stand
    part(root, G.torus(0.14, 0.015, 4, 16), iron, { pos: [0, 0.45, 0], rot: [Math.PI / 2, 0, 0] });
    for (let a = 0; a < 3; a++) {
      const ang = (a * Math.PI * 2) / 3;
      part(root, G.cyl(0.015, 0.015, 0.45, 6), iron, { pos: [Math.cos(ang) * 0.14, 0.225, Math.sin(ang) * 0.14] });
    }
    // Bulbous clay pot
    part(root, G.sphere(0.18, 16, 12), clay, { pos: [0, 0.58, 0] });
    part(root, G.cyl(0.07, 0.09, 0.12, 12), clay, { pos: [0, 0.74, 0] });
  } else if (level === 2) {
    // Level 2: Dual Chamber Stainless Steel Dispenser
    const steel = toon(TONES.steel);
    const brass = toon(PALETTE.gold);
    part(root, G.cyl(0.15, 0.16, 0.65, 18), steel, { pos: [0, 0.55, 0] });
    part(root, G.cyl(0.17, 0.17, 0.04, 18), steel, { pos: [0, 0.88, 0] });
    part(root, G.cyl(0.015, 0.012, 0.08, 8), brass, { pos: [0, 0.32, 0.16], rot: [Math.PI / 4, 0, 0] });
    // Sturdy pedestal
    part(root, G.box(0.36, 0.22, 0.36), toon(TONES.woodMid), { pos: [0, 0.11, 0] });
  } else {
    // Level 3: UV Cold/Hot Water Dispenser
    const white = toon(PALETTE.softWhite);
    const cyan = toonUnique('#35B8FF', { emissive: '#0088FF', emissiveIntensity: 1.0 });
    part(root, G.box(0.32, 0.85, 0.34), white, { pos: [0, 0.425, 0] });
    // Cup dispenser recess
    part(root, G.box(0.24, 0.24, 0.15), toon(TONES.steelDark), { pos: [0, 0.52, 0.1] });
    // Dual LED indicators (Blue = Cold, Red = Hot)
    part(root, G.sphere(0.012, 6, 6), cyan, { pos: [-0.05, 0.75, 0.172], outline: false });
    part(root, G.sphere(0.012, 6, 6), toonUnique('#FF3A3A', { emissive: '#FF0000', emissiveIntensity: 1.0 }), {
      pos: [0.05, 0.75, 0.172],
      outline: false,
    });
  }

  addOutline(root);
  return root;
}

export function buildWasteBinMesh(level: number): THREE.Group {
  const root = new THREE.Group();
  root.name = 'waste_bin_model';

  if (level === 1) {
    // Level 1: Woven Bamboo Frond Basket
    const bamboo = toon(PALETTE.cream);
    part(root, G.cyl(0.16, 0.12, 0.38, 12), bamboo, { pos: [0, 0.19, 0] });
    part(root, G.torus(0.16, 0.015, 4, 12), toon(TONES.woodLight), { pos: [0, 0.38, 0], rot: [Math.PI / 2, 0, 0] });
  } else if (level === 2) {
    // Level 2: Galvanized Steel Pedal Bin
    const steel = toon(TONES.steel);
    part(root, G.cyl(0.17, 0.17, 0.48, 16), steel, { pos: [0, 0.24, 0] });
    part(root, G.cyl(0.18, 0.18, 0.04, 16), toon(TONES.steelDark), { pos: [0, 0.49, 0] });
    // Foot pedal
    part(root, G.box(0.08, 0.02, 0.08), toon(PALETTE.charcoal), { pos: [0, 0.02, 0.2] });
  } else {
    // Level 3: Segregated Eco-Sort Stainless Dual Station
    const steel = toon(TONES.steel);
    const green = toon(PALETTE.leaf);
    const blue = toon(PALETTE.rain);
    // Green bin (Wet waste)
    part(root, G.box(0.24, 0.55, 0.28), steel, { pos: [-0.14, 0.275, 0] });
    part(root, G.box(0.22, 0.04, 0.26), green, { pos: [-0.14, 0.56, 0] });
    // Blue bin (Recyclables)
    part(root, G.box(0.24, 0.55, 0.28), steel, { pos: [0.14, 0.275, 0] });
    part(root, G.box(0.22, 0.04, 0.26), blue, { pos: [0.14, 0.56, 0] });
  }

  addOutline(root);
  return root;
}

export function buildSignboardMesh(level: number): THREE.Group {
  const root = new THREE.Group();
  root.name = 'signboard_model';

  if (level === 1) {
    // Level 1: Painted Plywood Board
    part(root, G.box(0.8, 0.45, 0.03), toon(TONES.woodMid), { pos: [0, 0, 0] });
    part(root, G.box(0.72, 0.37, 0.01), toon(PALETTE.charcoal), { pos: [0, 0, 0.02], outline: false });
  } else if (level === 2) {
    // Level 2: Framed Teak Menu Board
    const teak = toon(TONES.woodDark);
    const brass = toon(PALETTE.gold);
    part(root, G.box(0.9, 0.55, 0.05), teak, { pos: [0, 0, 0] });
    part(root, G.box(0.8, 0.45, 0.01), toon(PALETTE.charcoal), { pos: [0, 0, 0.03], outline: false });
    // Brass corner braces
    for (const x of [-0.42, 0.42]) {
      for (const y of [-0.24, 0.24]) {
        part(root, G.box(0.06, 0.06, 0.06), brass, { pos: [x, y, 0.02] });
      }
    }
  } else {
    // Level 3: Retro Neon & Teak Signboard
    const teak = toon(TONES.woodDark);
    const gold = toon(PALETTE.gold);
    const neon = toonUnique('#FFDE6A', { emissive: '#FFAA00', emissiveIntensity: 2.0 });
    part(root, G.box(1.05, 0.65, 0.06), teak, { pos: [0, 0, 0] });
    part(root, G.box(0.95, 0.55, 0.02), toon(PALETTE.charcoal), { pos: [0, 0, 0.035], outline: false });
    // Glowing neon tube border
    part(root, G.box(0.92, 0.02, 0.02), neon, { pos: [0, 0.25, 0.05], outline: false });
    part(root, G.box(0.92, 0.02, 0.02), neon, { pos: [0, -0.25, 0.05], outline: false });
    part(root, G.box(0.02, 0.52, 0.02), neon, { pos: [-0.46, 0, 0.05], outline: false });
    part(root, G.box(0.02, 0.52, 0.02), neon, { pos: [0.46, 0, 0.05], outline: false });
    // Top brass crown emblem
    part(root, G.sphere(0.06, 10, 8), gold, { pos: [0, 0.36, 0.02] });
  }

  addOutline(root);
  return root;
}

export function buildRadioMesh(level: number): THREE.Group {
  const root = new THREE.Group();
  root.name = 'radio_model';

  if (level === 1) {
    // Level 1: Transistor Pocket Radio
    const plastic = toon('#3A4B5A');
    part(root, G.box(0.18, 0.12, 0.06), plastic, { pos: [0, 0.06, 0] });
    // Speaker perforated circle
    part(root, G.cyl(0.04, 0.04, 0.005, 12), toon(PALETTE.charcoal), { pos: [-0.04, 0.06, 0.032], rot: [Math.PI / 2, 0, 0] });
    // Telescopic antenna
    part(root, G.cyl(0.005, 0.005, 0.22, 6), toon(TONES.steel), { pos: [0.07, 0.22, 0], rot: [0, 0, -0.15] });
  } else if (level === 2) {
    // Level 2: Teak Valve Table Radio
    const teak = toon(TONES.woodLight);
    const gold = toon(PALETTE.gold);
    part(root, G.box(0.32, 0.2, 0.14), teak, { pos: [0, 0.1, 0] });
    // Glowing radio frequency tuner glass
    part(root, G.box(0.24, 0.06, 0.01), toonUnique('#FFE89E', { emissive: '#FF8800', emissiveIntensity: 0.7 }), {
      pos: [0, 0.13, 0.072],
      outline: false,
    });
    // Twin tuning knobs
    for (const x of [-0.08, 0.08]) {
      part(root, G.cyl(0.02, 0.02, 0.02, 10), gold, { pos: [x, 0.04, 0.08], rot: [Math.PI / 2, 0, 0] });
    }
  } else {
    // Level 3: Master Gramophone & Stereo Receiver
    const wood = toon(TONES.woodDark);
    const brass = toon(PALETTE.gold);
    // Gramophone square cabinet base
    part(root, G.box(0.34, 0.14, 0.34), wood, { pos: [0, 0.07, 0] });
    // Vinyl turntable platter
    part(root, G.cyl(0.12, 0.12, 0.02, 18), toon(PALETTE.charcoal), { pos: [0, 0.15, 0] });
    // Large fluted brass horn
    part(root, G.cone(0.18, 0.35, 16), brass, { pos: [0, 0.38, -0.06], rot: [-Math.PI / 3, 0, 0] });
    part(root, G.torus(0.18, 0.02, 6, 20), brass, { pos: [0, 0.49, 0.05], rot: [Math.PI / 6, 0, 0] });
  }

  addOutline(root);
  return root;
}

export function buildBillingCounterMesh(level: number): THREE.Group {
  const root = new THREE.Group();
  root.name = 'billing_counter_model';

  if (level === 1) {
    // Level 1: Small Teak Cash Box
    const wood = toon(TONES.woodMid);
    part(root, G.box(0.35, 0.22, 0.25), wood, { pos: [0, 0.11, 0] });
    part(root, G.box(0.06, 0.04, 0.02), toon(TONES.steelDark), { pos: [0, 0.16, 0.13] });
  } else if (level === 2) {
    // Level 2: Glass-Top Billing Desk
    const teak = toon(TONES.woodLight);
    const glass = toonUnique(TONES.glass, { opacity: 0.7, side: THREE.DoubleSide });
    const brass = toon(PALETTE.gold);
    part(root, G.box(0.85, 0.72, 0.5), teak, { pos: [0, 0.36, 0] });
    part(root, G.box(0.8, 0.015, 0.45), glass, { pos: [0, 0.73, 0], outline: false });
    // Brass drawer handle & receipt spindle
    part(root, G.cyl(0.015, 0.015, 0.08, 6), brass, { pos: [0, 0.5, 0.26], rot: [0, 0, Math.PI / 2] });
    part(root, G.cyl(0.006, 0.006, 0.16, 6), toon(TONES.steel), { pos: [0.25, 0.81, -0.1] });
  } else {
    // Level 3: Carved Rosewood Executive Cash Counter
    const rosewood = toon(TONES.woodDark);
    const brass = toon(PALETTE.gold);
    part(root, G.box(1.05, 0.8, 0.58), rosewood, { pos: [0, 0.4, 0] });
    // Brass teller guard railing
    for (let i = 0; i < 5; i++) {
      part(root, G.cyl(0.012, 0.012, 0.22, 6), brass, { pos: [-0.4 + i * 0.2, 0.91, 0.26] });
    }
    part(root, G.cyl(0.015, 0.015, 0.85, 8), brass, { pos: [0, 1.02, 0.26], rot: [0, 0, Math.PI / 2] });
    // Antique brass till / bell register
    part(root, G.box(0.24, 0.16, 0.22), brass, { pos: [-0.2, 0.88, 0] });
  }

  addOutline(root);
  return root;
}

// ===================================================================== Furniture Instance

export class FurnitureInstance {
  readonly uid: string;
  readonly def: FurnitureDef;
  level: number;
  position: THREE.Vector3;
  rotationY: number;
  isPlaced: boolean;
  isDirty: boolean = false;
  root: THREE.Group;
  private currentMesh: THREE.Group | null = null;

  constructor(def: FurnitureDef, level = 1, pos?: THREE.Vector3, rotY?: number, isPlaced = true, uid?: string) {
    this.uid = uid ?? `furn_${def.id}_${Math.random().toString(36).substring(2, 7)}`;
    this.def = def;
    this.level = Math.max(1, Math.min(3, level));
    this.position = pos ? pos.clone() : new THREE.Vector3(...def.defaultPosition);
    this.rotationY = rotY ?? def.defaultRotationY;
    this.isPlaced = isPlaced;

    this.root = new THREE.Group();
    this.root.name = `furniture:${this.uid}`;
    this.root.position.copy(this.position);
    this.root.rotation.y = this.rotationY;
    this.root.visible = this.isPlaced;
    this.root.userData.furnitureUid = this.uid;
    this.root.userData.defId = def.id;

    this.rebuildMesh();
  }

  getCurrentTierDef(): FurnitureTierDef {
    return this.def.tiers[this.level - 1] ?? this.def.tiers[0];
  }

  getNextTierDef(): FurnitureTierDef | null {
    if (this.level >= this.def.tiers.length) return null;
    return this.def.tiers[this.level];
  }

  get dirty(): boolean {
    return this.isDirty;
  }

  rebuildMesh(): void {
    if (this.currentMesh) {
      this.root.remove(this.currentMesh);
    }

    let mesh: THREE.Group;
    switch (this.def.id) {
      case 'table_teak':
        mesh = buildTableMesh(this.level, this.isDirty);
        break;
      case 'wood_bench':
        mesh = buildBenchMesh(this.level);
        break;
      case 'gas_stove':
        mesh = buildStoveMesh(this.level);
        break;
      case 'chaya_samovar':
        mesh = buildSamovarMesh(this.level);
        break;
      case 'snack_cabinet':
        mesh = buildCabinetMesh(this.level);
        break;
      case 'water_filter':
        mesh = buildWaterFilterMesh(this.level);
        break;
      case 'waste_bin':
        mesh = buildWasteBinMesh(this.level);
        break;
      case 'wall_signboard':
        mesh = buildSignboardMesh(this.level);
        break;
      case 'vintage_radio':
        mesh = buildRadioMesh(this.level);
        break;
      case 'billing_counter':
        mesh = buildBillingCounterMesh(this.level);
        break;
      default:
        mesh = buildTableMesh(this.level, this.isDirty);
    }

    this.currentMesh = mesh;
    this.root.add(mesh);
  }

  upgrade(): boolean {
    if (this.level >= this.def.tiers.length) return false;
    this.level++;
    this.rebuildMesh();
    return true;
  }

  setLevel(newLevel: number): void {
    this.level = Math.max(1, Math.min(this.def.tiers.length, newLevel));
    this.rebuildMesh();
  }

  setDirty(dirty: boolean): void {
    if (this.isDirty === dirty) return;
    this.isDirty = dirty;
    this.rebuildMesh();
  }

  setPlaced(placed: boolean): void {
    this.isPlaced = placed;
    this.root.visible = placed;
  }

  setPosition(pos: THREE.Vector3): void {
    this.position.copy(pos);
    this.root.position.copy(pos);
  }

  setRotationY(rotY: number): void {
    this.rotationY = rotY;
    this.root.rotation.y = rotY;
  }
}

// ===================================================================== Furniture Manager

export class FurnitureManager {
  items: Map<string, FurnitureInstance> = new Map();
  private sceneRoot: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.sceneRoot = new THREE.Group();
    this.sceneRoot.name = 'furniture_root';
    scene.add(this.sceneRoot);
    this.initDefaultShopFurniture();
  }

  initDefaultShopFurniture(): void {
    // Instantiate all 10 catalog items in their initial level 1 positions
    for (const def of FURNITURE_CATALOG) {
      const inst = new FurnitureInstance(def, 1);
      this.items.set(inst.uid, inst);
      this.sceneRoot.add(inst.root);
    }
  }

  get(uid: string): FurnitureInstance | undefined {
    return this.items.get(uid);
  }

  getByDefId(defId: string): FurnitureInstance | undefined {
    for (const inst of this.items.values()) {
      if (inst.def.id === defId) return inst;
    }
    return undefined;
  }

  getAll(): FurnitureInstance[] {
    return Array.from(this.items.values());
  }

  getPlaced(): FurnitureInstance[] {
    return Array.from(this.items.values()).filter((i) => i.isPlaced);
  }

  getDirtyTables(): FurnitureInstance[] {
    return Array.from(this.items.values()).filter((i) => i.isPlaced && i.def.id === 'table_teak' && i.isDirty);
  }

  cleanTable(uid: string): boolean {
    const table = this.items.get(uid);
    if (!table || !table.isDirty) return false;
    table.setDirty(false);
    return true;
  }

  upgradeFurniture(uid: string): boolean {
    const item = this.items.get(uid);
    if (!item) return false;
    return item.upgrade();
  }

  dirtyRandomTable(): FurnitureInstance | null {
    const tables = Array.from(this.items.values()).filter((i) => i.isPlaced && i.def.id === 'table_teak' && !i.isDirty);
    if (!tables.length) return null;
    const table = tables[Math.floor(Math.random() * tables.length)];
    table.setDirty(true);
    return table;
  }

  exportState(): any[] {
    return Array.from(this.items.values()).map((inst) => ({
      uid: inst.uid,
      defId: inst.def.id,
      level: inst.level,
      x: inst.position.x,
      y: inst.position.y,
      z: inst.position.z,
      ry: inst.rotationY,
      placed: inst.isPlaced,
      dirty: inst.isDirty,
    }));
  }

  importState(data: any[]): void {
    if (!Array.isArray(data) || !data.length) return;

    // Clear existing
    for (const inst of this.items.values()) {
      this.sceneRoot.remove(inst.root);
    }
    this.items.clear();

    for (const d of data) {
      const def = FURNITURE_CATALOG.find((c) => c.id === d.defId);
      if (!def) continue;
      const pos = new THREE.Vector3(d.x, d.y, d.z);
      const inst = new FurnitureInstance(def, d.level, pos, d.ry, d.placed !== false, d.uid);
      inst.isDirty = !!d.dirty;
      inst.rebuildMesh();
      this.items.set(inst.uid, inst);
      this.sceneRoot.add(inst.root);
    }
  }
}
