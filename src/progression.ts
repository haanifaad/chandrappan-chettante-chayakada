/**
 * 25-Stage Progression & Era Engine for Chandrappan Chettante Chayakkada.
 * Manages the 52-60 hour journey across 5 eras from Cycle Flask to 5-Star Resort.
 */

export type EraId = 1 | 2 | 3 | 4 | 5;

export interface StageDef {
  stage: number;
  era: EraId;
  name: string;
  malayalam: string;
  tagline: string;
  targetHours: number;
  capitalRequired: number;
  reputationRequired: number;
  prerequisites: string[];
  signatureDish: string;
  keyUnlocks: string[];
  description: string;
}

export const STAGES: StageDef[] = [
  // --- ERA 1: THE STREET HUSTLE ---
  {
    stage: 1,
    era: 1,
    name: 'The Cycle Flask',
    malayalam: 'സൈക്കിൾ ഫ്ലാസ്ക്',
    tagline: 'A humble beginning with hot tea on two wheels',
    targetHours: 1.0,
    capitalRequired: 0,
    reputationRequired: 1.0,
    prerequisites: [],
    signatureDish: 'Kattan Chaya',
    keyUnlocks: ['Bicycle Sales Point', 'Black Tea Brewing', 'Paper Cups', 'Basic Pricing'],
    description: 'Pedal to the roadside bus stop with a thermos flask and paper cups. Serve hurried commuters and learn the fundamentals of profit margin.',
  },
  {
    stage: 2,
    era: 1,
    name: 'The Wooden Pushcart',
    malayalam: 'തടി ഉന്തുവണ്ടി',
    tagline: 'Rolling through the tea estates with fresh milk tea',
    targetHours: 2.0,
    capitalRequired: 400,
    reputationRequired: 1.8,
    prerequisites: ['Sell 30 teas'],
    signatureDish: 'Paal Chaya & Rusk',
    keyUnlocks: ['Mobile Pushcart', 'Milk Tea Boiling', 'Glass Biscuit Jars', 'Estate Worker Spot'],
    description: 'Invest in a hand-pushed wooden cart fitted with a kerosene burner. Boil fresh cow milk for rich Paal Chaya and display crunchy rusks in glass jars.',
  },
  {
    stage: 3,
    era: 1,
    name: 'The Blue Tarpaulin Corner',
    malayalam: 'നീല ടാർപോളിൻ കട',
    tagline: 'A sheltered roadside stop under the monsoon rains',
    targetHours: 3.2,
    capitalRequired: 1000,
    reputationRequired: 2.4,
    prerequisites: ['stage_2_completed'],
    signatureDish: 'Parippuvada & Ullivada',
    keyUnlocks: ['Roadside Tarp Shelter', 'Wooden Benches', 'Frying Kadai', 'Rain Surge Demand'],
    description: 'Erect a permanent bamboo frame with a classic blue tarpaulin roof. Fry crispy parippuvada and ullivada as heavy rains drive wet travelers to your bench.',
  },
  {
    stage: 4,
    era: 1,
    name: 'The Brass Samovar Kada',
    malayalam: 'പിച്ചള സാമോവാർ കട',
    tagline: 'The gleaming pride of traditional Malabar tea stalls',
    targetHours: 4.5,
    capitalRequired: 2500,
    reputationRequired: 2.8,
    prerequisites: ['stage_3_completed', 'panchayat_permit'],
    signatureDish: 'Meter Chaya & Pazhampori',
    keyUnlocks: ['Authentic Brass Samovar', 'Tea Pulling Meter', 'Radio Broadcasts', 'Extended Customer Queue'],
    description: 'Mount a shining brass samovar with a constant stream of aromatic steam. Master the high-arc tea pull and play classic Malayalam radio songs to captivate the crowd.',
  },
  {
    stage: 5,
    era: 1,
    name: "Night Thatcher's Shack",
    malayalam: 'രാത്രി തട്ടുകട',
    tagline: 'The glowing beacon for night-shift drivers and travelers',
    targetHours: 6.0,
    capitalRequired: 5000,
    reputationRequired: 3.2,
    prerequisites: ['repay_starter_loan'],
    signatureDish: 'Thatte Dosa & Red Chammanthi',
    keyUnlocks: ['Night Shift Hours (20:00-04:00)', 'Hurricane Lamps', 'Cast Iron Tawa', 'Long-haul Truckers'],
    description: 'Install bright lanterns and fire up the cast-iron tawa late into the night. Feed tired lorry drivers, plantation watchmen, and late-night highway travelers.',
  },

  // --- ERA 2: THE LOCAL MESS AND CAFE ---
  {
    stage: 6,
    era: 2,
    name: 'The One-Shutter Petty Shop',
    malayalam: 'ഒരു ഷട്ടർ പെട്ടിക്കട',
    tagline: 'Your first permanent commercial storefront',
    targetHours: 8.0,
    capitalRequired: 10000,
    reputationRequired: 3.5,
    prerequisites: ['commercial_lease_cleared'],
    signatureDish: 'Neyyappam & Ela Ada',
    keyUnlocks: ['Permanent Concrete Floor', 'Rolling Metal Shutter', 'Indoor Tables', 'Helper Appu (Cleaning)'],
    description: 'Move into a solid roadside masonry shop with a rolling steel shutter. Hire young helper Appu to clear tables and install wall-mounted ceiling fans for customer comfort.',
  },
  {
    stage: 7,
    era: 2,
    name: 'The Morning Breakfast Counter',
    malayalam: 'പ്രഭാത ഭക്ഷണ ശാല',
    tagline: 'Steaming puttu and soft appams for early risers',
    targetHours: 10.2,
    capitalRequired: 18000,
    reputationRequired: 3.8,
    prerequisites: ['breakfast_health_license'],
    signatureDish: 'Puttu, Kadala & Egg Roast',
    keyUnlocks: ['Bamboo Puttu Kutti', 'Appam Chatti Station', 'Morning Rush Surge (06:30-09:30)'],
    description: 'Introduce authentic breakfast service. Manage the early morning rush of plantation supervisors, students, and government clerks craving steaming hot puttu and spicy kadala.',
  },
  {
    stage: 8,
    era: 2,
    name: 'The Bakery and Coolbar Front',
    malayalam: 'ബേക്കറിയും കൂൾബാറും',
    tagline: 'Crisp meat puffs and chilled nannari sarbath',
    targetHours: 12.5,
    capitalRequired: 30000,
    reputationRequired: 4.0,
    prerequisites: ['commercial_3phase_power'],
    signatureDish: 'Egg Puffs & Kulukki Sarbath',
    keyUnlocks: ['Pastry Display Counter', 'Single-Door Refrigerator', 'Juice Blender', 'Afternoon Footfall Surge'],
    description: 'Expand the shop front with an illuminated glass pastry cabinet and an ice-cold refrigerator. Sell flaky egg puffs, cream buns, and hand-shaken kulukki sarbath.',
  },
  {
    stage: 9,
    era: 2,
    name: 'The Banana Leaf Lunch Mess',
    malayalam: 'വാഴയില ഊട്ടുപുര',
    tagline: 'A hearty noon feast served on fresh green plantain leaves',
    targetHours: 14.0,
    capitalRequired: 50000,
    reputationRequired: 4.2,
    prerequisites: ['hire_chaya_master_vijayan'],
    signatureDish: 'Kerala Rice Meals & Karimeen Fry',
    keyUnlocks: ['Rice Cauldrons', 'Bain-Marie Curry Counter', 'Chaya Master Vijayan', 'Staff Shift Scheduling'],
    description: 'Open for full noon lunch service. Hire dedicated Chaya Master Vijayan to handle beverages while you oversee the chaotic, profitable 12:00-14:30 banana-leaf meal rush.',
  },
  {
    stage: 10,
    era: 2,
    name: 'The Delivery and Parcel Hub',
    malayalam: 'പാഴ്സൽ ഡെലിവറി കേന്ദ്രം',
    tagline: 'Supplying homes, offices, and lodges across the valley',
    targetHours: 16.0,
    capitalRequired: 75000,
    reputationRequired: 4.4,
    prerequisites: ['fssai_registration'],
    signatureDish: 'Malabar Parotta Box & Chatti Choru',
    keyUnlocks: ['Thermal Parcel Sealer', 'App Delivery Dispatch', 'Delivery Boy Jaleel', 'Simultaneous Dine-In & Parcel'],
    description: 'Launch a streamlined takeaway and delivery wing. Partner with delivery runner Jaleel to dispatch foil-wrapped meals and hot tea thermoses across town.',
  },

  // --- ERA 3: THE HIGHWAY AND CITY RESTAURANT ---
  {
    stage: 11,
    era: 3,
    name: 'The Double-Shutter Fast Food Restaurant',
    malayalam: 'ഡബിൾ ഷട്ടർ ഫാസ്റ്റ് ഫുഡ്',
    tagline: 'Wok fire, sizzle, and fast-paced street favorites',
    targetHours: 18.2,
    capitalRequired: 130000,
    reputationRequired: 4.4,
    prerequisites: ['viral_vlogger_feature', 'acquire_adjacent_plot'],
    signatureDish: 'Kerala Style Chicken Fried Rice & Chilli Chicken',
    keyUnlocks: ['Triple-Burner High Flame Wok', 'Deep Fryer Station', 'Student Youth Demographics'],
    description: 'Knock down the adjoining wall to double your dining floor space. Install high-pressure Chinese wok burners to delight evening college crowds and late-night road trippers.',
  },
  {
    stage: 12,
    era: 3,
    name: 'The AC Family Cabin',
    malayalam: 'എ.സി ഫാമിലി ക്യാബിൻ',
    tagline: 'Cool comfort and private dining for families',
    targetHours: 20.8,
    capitalRequired: 200000,
    reputationRequired: 4.5,
    prerequisites: ['install_split_inverters'],
    signatureDish: 'Malabar Mutton Curry & Falooda',
    keyUnlocks: ['Soundproof AC Dining Room', 'Plush Booths', 'Multigenerational Family Groups', 'Tip Multiplier'],
    description: 'Construct a climate-controlled glassed-in family cabin. Families gladly pay premium prices for privacy, chilled air, and generous multi-plate feasts.',
  },
  {
    stage: 13,
    era: 3,
    name: 'The Live Al-Faham and Shawarma Grill',
    malayalam: 'ലൈവ് അൽ-ഫഹാം & ഷവർമ',
    tagline: 'Smoky Arabian charcoal aromas filling the night air',
    targetHours: 23.5,
    capitalRequired: 300000,
    reputationRequired: 4.6,
    prerequisites: ['hire_grill_usthad'],
    signatureDish: 'Peri-Peri Al-Faham & Rumali Shawarma',
    keyUnlocks: ['Outdoor Charcoal BBQ Pit', 'Vertical Rotating Shawarma Spit', 'Grill Usthad Rasheed'],
    description: 'Set up an eye-catching open-air grill right by the highway frontage. The aroma of smoky spiced chicken and vertical rotating shawarma draws travelers from kilometers away.',
  },
  {
    stage: 14,
    era: 3,
    name: 'The Mandi and Biriyani House',
    malayalam: 'കുഴിമന്തി & ബിരിയാണി ഭവനം',
    tagline: 'Sealed dum pots and underground tandoori pits',
    targetHours: 25.8,
    capitalRequired: 450000,
    reputationRequired: 4.7,
    prerequisites: ['wholesale_jeerakasala_contract'],
    signatureDish: 'Thalassery Dum Biriyani & Kuzhimandi',
    keyUnlocks: ['Underground Mandi Kuzhi Pit', 'Heavy Copper Dum Degs', 'Wholesale Bulk Rice Contracts'],
    description: 'Excavate traditional charcoal-heated underground Mandi pits. Seal fragrant Wayanad Jeerakasala rice in heavy copper cauldrons with aromatic whole spices.',
  },
  {
    stage: 15,
    era: 3,
    name: 'The Highway Drive-In Landmark',
    malayalam: 'ഹൈവേ ഡ്രൈവ്-ഇൻ ലാൻഡ്മാർക്ക്',
    tagline: 'The essential pit-stop for tourist coaches and interstate road trips',
    targetHours: 28.0,
    capitalRequired: 700000,
    reputationRequired: 4.7,
    prerequisites: ['land_lease_highway'],
    signatureDish: 'Highway Drive Combo & Tender Coconut Delight',
    keyUnlocks: ['Paved Car Park (40 Vehicles)', 'Car-Window Tray Service', 'Tourist Coach Contracts', 'Valet Staff'],
    description: 'Acquire roadside parking land along the NH highway. Equip runners with magnetic car window trays to serve hundreds of passengers without them needing to step out.',
  },

  // --- ERA 4: THE HOTEL AND HOSPITALITY BUSINESS ---
  {
    stage: 16,
    era: 4,
    name: 'The Tourist Home and Lodge',
    malayalam: 'ടൂറിസ്റ്റ് ഹോമും ലോഡ്ജും',
    tagline: 'Clean rooms and warm hospitality for weary travelers',
    targetHours: 30.5,
    capitalRequired: 1100000,
    reputationRequired: 4.75,
    prerequisites: ['lodging_sanction_permit', 'build_first_floor'],
    signatureDish: '24-Hour Room Service Chaya & Appam',
    keyUnlocks: ['12 Guest Rooms', 'Reception & Key Rack', 'Room Reservations', 'Housekeeping Staff'],
    description: 'Build two upper floors above the restaurant. Offer clean, welcoming rooms with 24-hour room service, entering the lucrative hospitality market.',
  },
  {
    stage: 17,
    era: 4,
    name: 'The Kalyana Mandapam (Banquet Hall)',
    malayalam: 'കല്യാണ മണ്ഡപം',
    tagline: 'Grand celebrations, festive weddings, and milestone gatherings',
    targetHours: 33.2,
    capitalRequired: 1800000,
    reputationRequired: 4.8,
    prerequisites: ['banquet_license'],
    signatureDish: '24-Item Royal Wedding Sadya',
    keyUnlocks: ['300-Capacity Banquet Hall', 'Wedding Stage & PA System', 'Bulk Event Deposits', 'Event Coordinators'],
    description: 'Construct a state-of-the-art banquet hall. Host lavish Kerala weddings and corporate jubilees, receiving massive advance cash contracts.',
  },
  {
    stage: 18,
    era: 4,
    name: 'The Rooftop Sky-Cafe',
    malayalam: 'റൂഫ്-ടോപ്പ് സ്കൈ കഫേ',
    tagline: 'Spectacular mountain sunsets paired with artisanal estate teas',
    targetHours: 36.0,
    capitalRequired: 2800000,
    reputationRequired: 4.85,
    prerequisites: ['terrace_safety_audit'],
    signatureDish: 'Single-Estate Munnar White Tea & Gourmet Sliders',
    keyUnlocks: ['Open-Air Terrace Gazebos', 'Barista Espresso Counter', 'Live Acoustic Music', 'Sunset Viewpoint'],
    description: 'Transform your rooftop terrace into a scenic sky-lounge. Foreign tourists and young couples gather for golden-hour views of tea-covered mountain ranges.',
  },
  {
    stage: 19,
    era: 4,
    name: 'The Three-Star Executive Hotel',
    malayalam: 'ത്രീ-സ്റ്റാർ എക്സിക്യൂട്ടീവ് ഹോട്ടൽ',
    tagline: 'High standards, seamless service, and modern comforts',
    targetHours: 39.0,
    capitalRequired: 4200000,
    reputationRequired: 4.88,
    prerequisites: ['tourism_dept_certification', 'install_generator_backup'],
    signatureDish: 'Multi-Course Executive Thali & Club Sandwich',
    keyUnlocks: ['Elevator Lift System', 'Centralized Hot Water', 'Corporate Invoicing', 'Souvenir Spice Emporium'],
    description: 'Upgrade the facility to official 3-star standards with automatic guest elevators, backup diesel generators, and dedicated conference amenities.',
  },
  {
    stage: 20,
    era: 4,
    name: 'The Heritage and Backwater Retreat',
    malayalam: 'പൈതൃക ബാക്ക്-വാട്ടർ റിട്രീറ്റ്',
    tagline: 'Traditional Kerala teak architecture nestled in tranquil beauty',
    targetHours: 42.0,
    capitalRequired: 6500000,
    reputationRequired: 4.9,
    prerequisites: ['acquire_scenic_valley_estate'],
    signatureDish: 'Karimeen Mappas & Duck Roast with Appam',
    keyUnlocks: ['Nalukettu Teak Cottages', 'Ayurvedic Massage Spa', 'Shikkara Boat Excursions', 'Luxury Foreign Bookings'],
    description: 'Acquire prime valley land and build traditional wooden Nalukettu villas with central courtyards. Offer holistic Ayurvedic spa treatments and scenic boat transfers.',
  },

  // --- ERA 5: THE LUXURY HOTEL EMPIRE ---
  {
    stage: 21,
    era: 5,
    name: 'The Four-Star Luxury Tower',
    malayalam: 'ഫോർ-സ്റ്റാർ ലക്ഷ്വറി ടവർ',
    tagline: 'Imposing luxury hospitality rising above the tea hills',
    targetHours: 45.5,
    capitalRequired: 10500000,
    reputationRequired: 4.92,
    prerequisites: ['banking_consortium_loan_approved'],
    signatureDish: 'Lobster Pollichathu & Saffron Malabar Biriyani',
    keyUnlocks: ['Grand Marble Atrium Lobby', 'Concierge & Valet Fleets', 'VIP Suite Floors', 'Luxury Limousine Transfers'],
    description: 'Construct a magnificent multistory hotel tower. Welcome international diplomats, movie stars, and high-net-worth travelers with personalized 24-hour butler service.',
  },
  {
    stage: 22,
    era: 5,
    name: 'The Infinity Pool and Wellness Resort',
    malayalam: 'ഇൻഫിനിറ്റി പൂൾ & വെൽനെസ്സ് റിസോർട്ട്',
    tagline: 'Heated waters suspended above mist-shrouded green valleys',
    targetHours: 49.0,
    capitalRequired: 16000000,
    reputationRequired: 4.95,
    prerequisites: ['hill_slope_engineering_clearance'],
    signatureDish: 'Tropical Wellness Bowls & Artisan Herbal Infusions',
    keyUnlocks: ['Cliff-Edge Heated Infinity Pool', 'Hydrotherapy & Steam Suites', 'Resort Day Passes', 'Yoga Pavilion'],
    description: 'Carve a jaw-dropping heated infinity pool into the cliffside overlooking tea plantations. Monetize wellness retreats, poolside cocktails, and day-pass luxury guests.',
  },
  {
    stage: 23,
    era: 5,
    name: 'Multi-Cuisine Fine Dining',
    malayalam: 'മൾട്ടി-ക്യുസീൻ ഫൈൻ ഡൈനിംഗ്',
    tagline: 'World-class gastronomy crafted by international master chefs',
    targetHours: 52.5,
    capitalRequired: 24000000,
    reputationRequired: 4.97,
    prerequisites: ['hire_executive_chef_kulkarni'],
    signatureDish: 'Woodfired Truffle Parotta & Gold-Flake Falooda',
    keyUnlocks: ['3 Specialized Kitchens (Pan-Asian, Mediterranean, Malabar)', 'Sommelier Cellar', 'Michelin-Caliber Reviews'],
    description: 'Open three distinct gourmet specialty restaurants under your hotel roof. Attract discerning culinary enthusiasts from around the globe.',
  },
  {
    stage: 24,
    era: 5,
    name: 'The Grand Convention Center',
    malayalam: 'ഗ്രാൻഡ് കൺവെൻഷൻ സെന്റർ',
    tagline: 'Hosting international summits and multi-day global conferences',
    targetHours: 56.5,
    capitalRequired: 36000000,
    reputationRequired: 4.99,
    prerequisites: ['state_convention_accreditation'],
    signatureDish: 'Global Gala Banquet & International High Tea',
    keyUnlocks: ['1,000-Seat Column-Free Auditorium', 'Multi-Language Audio Booths', 'Corporate Tech Summit Contracts'],
    description: 'Build a colossal international convention center capable of hosting mega destination weddings and global summits with millions in advance contracting revenue.',
  },
  {
    stage: 25,
    era: 5,
    name: 'The Five-Star Crown and Golden Samovar',
    malayalam: 'സുവർണ്ണ സാമോവാറും ഫൈവ്-സ്റ്റാർ കിരീടവും',
    tagline: 'From a roadside cycle to the pinnacle of world hospitality',
    targetHours: 60.0,
    capitalRequired: 55000000,
    reputationRequired: 5.0,
    prerequisites: ['stage_24_completed', 'reach_5_star_audit'],
    signatureDish: 'The Founder’s Kattan Chaya (Gold Rim Glass) & Heritage Parippuvada',
    keyUnlocks: ['Founder’s Kada in Grand Lobby', 'Golden Samovar Installation', 'Endgame Tycoon Mode', 'Franchise Empire'],
    description: 'The monumental culmination. At the center of your marble 5-star resort atrium stands the fully restored Founder\'s Chayakkada, where world travelers sip ₹12 Kattan Chaya pulled from the legendary Golden Samovar.',
  },
];

export class ProgressionManager {
  currentStage: number = 1;
  completedPrerequisites: Set<string> = new Set();

  constructor(initialStage = 1, initialPrereqs: string[] = []) {
    this.currentStage = Math.max(1, Math.min(25, initialStage));
    for (const p of initialPrereqs) this.completedPrerequisites.add(p);
  }

  getCurrentStageDef(): StageDef {
    return STAGES[this.currentStage - 1] ?? STAGES[0];
  }

  getNextStageDef(): StageDef | null {
    if (this.currentStage >= 25) return null;
    return STAGES[this.currentStage];
  }

  getEra(stage = this.currentStage): EraId {
    const s = STAGES[stage - 1];
    return s ? s.era : 1;
  }

  getEraName(era: EraId = this.getEra()): string {
    switch (era) {
      case 1:
        return 'Era 1: The Street Hustle (തെരുവ് കച്ചവടം)';
      case 2:
        return 'Era 2: The Local Mess & Cafe (നാടൻ കഫേ)';
      case 3:
        return 'Era 3: Tourism & Highway Expansion (ടൂറിസം വികസനം)';
      case 4:
        return 'Era 4: Boutique Dining & Plantation (പ്ലാന്റേഷൻ എസ്റ്റേറ്റ്)';
      case 5:
        return 'Era 5: The Hospitality & Resort Empire (റിസോർട്ട് സാമ്രാജ്യം)';
      default:
        return 'Era 1: The Street Hustle';
    }
  }

  getAllStages(): StageDef[] {
    return STAGES;
  }

  canAdvance(currentMoney: number, currentRep: number): { canAdvance: boolean; reason?: string; nextStage?: StageDef } {
    if (this.currentStage >= 25) {
      return { canAdvance: false, reason: 'Already reached maximum progression (Stage 25: Golden Samovar Palace).' };
    }
    const next = STAGES[this.currentStage];
    if (!next) return { canAdvance: false, reason: 'Unknown next stage.' };

    if (currentMoney < next.capitalRequired) {
      return { canAdvance: false, reason: `Need ₹${next.capitalRequired.toLocaleString()} capital (Current: ₹${Math.floor(currentMoney).toLocaleString()}).`, nextStage: next };
    }
    if (currentRep < next.reputationRequired) {
      return { canAdvance: false, reason: `Need ${next.reputationRequired.toFixed(1)} reputation (Current: ${currentRep.toFixed(1)}).`, nextStage: next };
    }
    for (const req of next.prerequisites) {
      if (!this.completedPrerequisites.has(req)) {
        return { canAdvance: false, reason: `Milestone requirement pending: "${req.replace(/_/g, ' ')}".`, nextStage: next };
      }
    }
    return { canAdvance: true, nextStage: next };
  }

  isStageUnlocked(stageNum: number, currentMoney: number, currentRep: number): boolean {
    if (stageNum <= this.currentStage) return true;
    if (stageNum > this.currentStage + 1) return false;

    const next = STAGES[stageNum - 1];
    if (!next) return false;

    if (currentMoney < next.capitalRequired) return false;
    if (currentRep < next.reputationRequired) return false;

    for (const req of next.prerequisites) {
      if (!this.completedPrerequisites.has(req)) return false;
    }

    return true;
  }

  completePrerequisite(prereqId: string): void {
    this.completedPrerequisites.add(prereqId);
  }

  advanceToNextStage(currentMoney: number, currentRep: number): { success: boolean; newStage?: StageDef; reason?: string } {
    if (this.currentStage >= 25) {
      return { success: false, reason: 'Already reached maximum progression (Stage 25: Golden Samovar).' };
    }

    const next = STAGES[this.currentStage];
    if (!next) return { success: false, reason: 'Unknown next stage.' };

    if (currentMoney < next.capitalRequired) {
      return { success: false, reason: `Need ₹${next.capitalRequired.toLocaleString()} capital (Current: ₹${Math.floor(currentMoney).toLocaleString()}).` };
    }

    if (currentRep < next.reputationRequired) {
      return { success: false, reason: `Need ${next.reputationRequired.toFixed(1)} reputation (Current: ${currentRep.toFixed(1)}).` };
    }

    for (const req of next.prerequisites) {
      if (!this.completedPrerequisites.has(req)) {
        return { success: false, reason: `Missing milestone requirement: "${req.replace(/_/g, ' ')}".` };
      }
    }

    this.currentStage++;
    this.completedPrerequisites.add(`stage_${this.currentStage - 1}_completed`);
    return { success: true, newStage: next };
  }

  exportState() {
    return {
      currentStage: this.currentStage,
      prerequisites: [...this.completedPrerequisites],
    };
  }

  importState(data: { currentStage?: number; prerequisites?: string[] }) {
    if (data.currentStage) this.currentStage = Math.max(1, Math.min(25, data.currentStage));
    if (Array.isArray(data.prerequisites)) {
      this.completedPrerequisites = new Set(data.prerequisites);
    }
  }
}
