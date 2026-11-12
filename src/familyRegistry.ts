import type { CustomerTypeId, Look } from './customers';
import type { RecipeId } from './recipes';

export type FamilyComposition =
  | 'small'
  | 'medium'
  | 'large'
  | 'grandparents'
  | 'young_children'
  | 'teenagers'
  | 'multigenerational'
  | 'relatives'
  | 'wealthy_tourist'
  | 'budget_traveller';

export type BudgetTier = 'wealthy' | 'moderate' | 'budget';

export type FamilySpecialEvent =
  | 'none'
  | 'birthday'
  | 'anniversary'
  | 'vacation_rush'
  | 'photography'
  | 'pilgrimage';

export type LoyaltyTier = 'first_time' | 'familiar' | 'regular' | 'family_friend' | 'vip_patron';

export interface FamilyMemberDef {
  name: string;
  relation: string; // e.g. "Father", "Mother", "Grandpa", "Grandma", "Son", "Daughter", "Uncle", "Friend"
  typeId: CustomerTypeId;
  favouriteDishes: RecipeId[];
  customLook?: Partial<Look>;
  personalityLine?: string;
}

export interface FamilyQuestDef {
  id: string;
  title: string;
  description: string;
  rewardMoney: number;
  rewardReputation: number;
  completed: boolean;
  claimed: boolean;
}

export interface FamilyProfile {
  id: string;
  name: string;
  origin: string;
  composition: FamilyComposition;
  budgetTier: BudgetTier;
  members: FamilyMemberDef[];
  arrivalGreeting: string;
  happyGreeting: string;
  angryGreeting: string;
  specialEvent: FamilySpecialEvent;
  visitCount: number;
  relationshipScore: number; // 0 to 100
  loyaltyTier: LoyaltyTier;
  lastVisitedDay: number;
  hotelNightsStayed: number;
  favouriteMemory?: string;
  quest?: FamilyQuestDef;
}

// ------------------------------------------------------------- Handmade Signature Roster

export const SIGNATURE_FAMILIES: Omit<FamilyProfile, 'visitCount' | 'relationshipScore' | 'loyaltyTier' | 'lastVisitedDay' | 'hotelNightsStayed'>[] = [
  // 1. Multi-Generational Traditional Kerala Family
  {
    id: 'fam_menon',
    name: 'Menon Kudumbam',
    origin: 'Kottayam, Kerala',
    composition: 'multigenerational',
    budgetTier: 'moderate',
    specialEvent: 'none',
    members: [
      { name: 'Keshava Menon', relation: 'Father', typeId: 'ammavan', favouriteDishes: ['chaya', 'kattan', 'parippuvada'] },
      { name: 'Saraswathi Amma', relation: 'Mother', typeId: 'aunty', favouriteDishes: ['puttu', 'chaya', 'dosa'] },
      { name: 'Madhavan Appoppan', relation: 'Grandfather', typeId: 'appoppan', favouriteDishes: ['kattan', 'parippuvada'] },
      { name: 'Anu', relation: 'Daughter', typeId: 'kutty', favouriteDishes: ['pazhampori', 'chaya'] },
    ],
    arrivalGreeting: 'Menon family: "Munnar sightseeing kazhinju chaya kudikkan vannatha!"',
    happyGreeting: 'Menon family: "Adipoli chayakkada! Appoppanum kuttikkum nannaayi ishtappettu."',
    angryGreeting: 'Menon family: "Kudumbathode vannittu ithrem kaathirikkendi vannallo!"',
    quest: {
      id: 'quest_menon_3visits',
      title: 'Menon Family Tradition',
      description: 'Serve the Menon Kudumbam across 3 separate days and earn their lifelong loyalty.',
      rewardMoney: 180,
      rewardReputation: 2,
      completed: false,
      claimed: false,
    },
  },

  // 2. Wealthy Tourists from Delhi (Birthday Event)
  {
    id: 'fam_sharma',
    name: 'The Sharma Family',
    origin: 'Delhi',
    composition: 'wealthy_tourist',
    budgetTier: 'wealthy',
    specialEvent: 'birthday',
    members: [
      { name: 'Rajesh Sharma', relation: 'Father', typeId: 'tourist_north', favouriteDishes: ['chaya', 'dosa'], customLook: { shirt: '#3B82F6' } },
      { name: 'Pooja Sharma', relation: 'Mother', typeId: 'tourist_north', favouriteDishes: ['chaya', 'pazhampori'], customLook: { shirt: '#EC4899' } },
      { name: 'Aarav (Birthday Boy!)', relation: 'Son', typeId: 'kutty', favouriteDishes: ['pazhampori', 'dosa'], customLook: { shirt: '#F59E0B' } },
      { name: 'Simran', relation: 'Daughter', typeId: 'student', favouriteDishes: ['coffee', 'pazhampori'] },
    ],
    arrivalGreeting: 'Sharma family: "Namaste! Today is Aarav\'s 9th birthday! We wanted authentic Kerala tea & snacks!"',
    happyGreeting: 'Sharma family: "Shukriya! Aarav is so happy! Best birthday evening in Munnar hills!"',
    angryGreeting: 'Sharma family: "Our birthday celebration got spoiled by waiting too long…"',
    quest: {
      id: 'quest_sharma_bday',
      title: "Aarav's Birthday Feast",
      description: 'Fulfill the Sharma family birthday order promptly with high satisfaction.',
      rewardMoney: 250,
      rewardReputation: 3,
      completed: false,
      claimed: false,
    },
  },

  // 3. Bangalore Techies & Cousins Roadtrip
  {
    id: 'fam_bangalore_buddies',
    name: 'Bangalore Roadtrip Kudumbam',
    origin: 'Indiranagar, Bangalore',
    composition: 'teenagers',
    budgetTier: 'wealthy',
    specialEvent: 'photography',
    members: [
      { name: 'Naveen', relation: 'Driver & Techie', typeId: 'tourist_bangalore', favouriteDishes: ['coffee', 'pazhampori'] },
      { name: 'Divya', relation: 'Wife', typeId: 'tourist_bangalore', favouriteDishes: ['chaya', 'dosa'] },
      { name: 'Karthik', relation: 'Cousin', typeId: 'student', favouriteDishes: ['coffee', 'parippuvada'] },
      { name: 'Rohan', relation: 'Vlogger Friend', typeId: 'vlogger', favouriteDishes: ['chaya', 'pazhampori'] },
    ],
    arrivalGreeting: 'Bangalore Roadtrippers: "Left Bangalore at 4 AM! Heard this chayakkada has the best mist view!"',
    happyGreeting: 'Bangalore Roadtrippers: "Bro, 10/10 chaya and vibes! Tagging you in our viral Munnar reel!"',
    angryGreeting: 'Bangalore Roadtrippers: "We need to catch our resort check-in, moving on."',
    quest: {
      id: 'quest_blr_vlog',
      title: 'Munnar Viral Sensation',
      description: 'Satisfy the Bangalore Roadtrip group to earn high-tier social media tips.',
      rewardMoney: 220,
      rewardReputation: 2,
      completed: false,
      claimed: false,
    },
  },

  // 4. International European Family on Tea Trail
  {
    id: 'fam_miller',
    name: 'The Miller Family',
    origin: 'Munich, Germany',
    composition: 'relatives',
    budgetTier: 'wealthy',
    specialEvent: 'vacation_rush',
    members: [
      { name: 'Lukas Miller', relation: 'Father', typeId: 'backpacker', favouriteDishes: ['kattan', 'puttu'] },
      { name: 'Elena Miller', relation: 'Mother', typeId: 'backpacker', favouriteDishes: ['chaya', 'dosa'] },
      { name: 'Mia', relation: 'Child', typeId: 'kutty', favouriteDishes: ['pazhampori', 'chaya'] },
    ],
    arrivalGreeting: 'The Millers: "Guten Tag! We are hiking the tea plantations. Can we try traditional tea & snacks?"',
    happyGreeting: 'The Millers: "Wunderbar! Incredible Kerala hospitality! We will recommend this in our travel book!"',
    angryGreeting: 'The Millers: "Our trekking guide says we must move immediately. Auf Wiedersehen."',
  },

  // 5. Senior Grandparents Pilgrim Family
  {
    id: 'fam_iyer',
    name: 'Iyer Kudumbam',
    origin: 'Mylapore, Chennai',
    composition: 'grandparents',
    budgetTier: 'moderate',
    specialEvent: 'pilgrimage',
    members: [
      { name: 'Subramanian Appoppan', relation: 'Grandfather', typeId: 'appoppan', favouriteDishes: ['kattan', 'dosa'] },
      { name: 'Meenakshi Ammachi', relation: 'Grandmother', typeId: 'ammachi', favouriteDishes: ['kattan', 'puttu'] },
      { name: 'Venkatesh', relation: 'Son', typeId: 'office', favouriteDishes: ['coffee', 'dosa'] },
    ],
    arrivalGreeting: 'Iyer Kudumbam: "Vanakkam! Returning from Palani Murugan temple. Looking for pure hot filter chaya & snacks."',
    happyGreeting: 'Iyer Kudumbam: "Bhesh! Romba nalla chaya! May Lord Muruga bless your business!"',
    angryGreeting: 'Iyer Kudumbam: "Very delayed… elders cannot stand in this cool hill wind."',
  },

  // 6. Hardworking Local Father & School Kid
  {
    id: 'fam_varghese',
    name: 'Varghese Chettan & Mone',
    origin: 'Adimali, Kerala',
    composition: 'young_children',
    budgetTier: 'budget',
    specialEvent: 'none',
    members: [
      { name: 'Varghese Chettan', relation: 'Father', typeId: 'ammavan', favouriteDishes: ['kattan', 'parippuvada'] },
      { name: 'Toby', relation: 'Son', typeId: 'kutty', favouriteDishes: ['pazhampori', 'chaya'] },
    ],
    arrivalGreeting: 'Varghese Chettan: "Kochinu school vidunnathinu munpe pazhamporiyum enikku oru choodu kattanum!"',
    happyGreeting: 'Varghese Chettan: "Mone, pazhampori kettikkondu povan parcel undaakki tharumo adutha thavana?"',
    angryGreeting: 'Varghese Chettan: "Koche vaa, bus vanne poyi."',
  },

  // 7. Large Joint Family from Malappuram
  {
    id: 'fam_koya',
    name: 'Koya Hajiyar & Family',
    origin: 'Malappuram, Kerala',
    composition: 'large',
    budgetTier: 'wealthy',
    specialEvent: 'vacation_rush',
    members: [
      { name: 'Koya Hajiyar', relation: 'Family Head', typeId: 'ammavan', favouriteDishes: ['chaya', 'parippuvada'] },
      { name: 'Fathima', relation: 'Wife', typeId: 'aunty', favouriteDishes: ['puttu', 'chaya'] },
      { name: 'Nasar (Gulf)', relation: 'Son', typeId: 'tourist_bangalore', favouriteDishes: ['coffee', 'pazhampori'] },
      { name: 'Shameem', relation: 'Daughter-in-law', typeId: 'aunty', favouriteDishes: ['dosa', 'chaya'] },
      { name: 'Rayan', relation: 'Grandson', typeId: 'kutty', favouriteDishes: ['pazhampori', 'puttu'] },
      { name: 'Ameera', relation: 'Granddaughter', typeId: 'kutty', favouriteDishes: ['pazhampori', 'chaya'] },
    ],
    arrivalGreeting: 'Koya Hajiyar: "Kudumbam muzhuvan vannekkuvaanu! 6 perkkum choodu chayayum kadikalum poratte!"',
    happyGreeting: 'Koya Hajiyar: "Mashallah! Ithanu nalla Kerala chaya! Gulf-il polum ithra ruchi kandoottilla!"',
    angryGreeting: 'Koya Hajiyar: "Kudumbathode vannal ithra thamasamo? Venda!"',
    quest: {
      id: 'quest_koya_banquet',
      title: 'Grand Joint Family Feast',
      description: 'Successfully fulfill the 6-portion multi-recipe order for Koya Hajiyar’s family gathering.',
      rewardMoney: 300,
      rewardReputation: 3,
      completed: false,
      claimed: false,
    },
  },

  // 8. Goan Couple & Relatives
  {
    id: 'fam_fernandez',
    name: 'The Fernandez Family',
    origin: 'Panaji, Goa',
    composition: 'medium',
    budgetTier: 'moderate',
    specialEvent: 'anniversary',
    members: [
      { name: 'Savio Fernandez', relation: 'Husband', typeId: 'tourist', favouriteDishes: ['coffee', 'dosa'] },
      { name: 'Maria Fernandez', relation: 'Wife', typeId: 'tourist', favouriteDishes: ['chaya', 'pazhampori'] },
      { name: 'Uncle Tony', relation: 'Uncle', typeId: 'ammavan', favouriteDishes: ['kattan', 'parippuvada'] },
      { name: 'Chloe', relation: 'Daughter', typeId: 'student', favouriteDishes: ['coffee', 'pazhampori'] },
    ],
    arrivalGreeting: 'The Fernandez Family: "Celebrating our 20th anniversary in Munnar! We heard your tea is legendary!"',
    happyGreeting: 'The Fernandez Family: "Viva Kerala! Amazing tea and snacks. Such warm hospitality!"',
    angryGreeting: 'The Fernandez Family: "We are getting delayed for our evening resort dinner."',
  },

  // 9. Budget Backpacking Friends Kudumbam
  {
    id: 'fam_college_gang',
    name: 'Kochi College Biker Kudumbam',
    origin: 'Kochi, Kerala',
    composition: 'budget_traveller',
    budgetTier: 'budget',
    specialEvent: 'none',
    members: [
      { name: 'Abhijith', relation: 'Lead Rider', typeId: 'student', favouriteDishes: ['chaya', 'parippuvada'] },
      { name: 'Jitin', relation: 'Rider', typeId: 'student', favouriteDishes: ['kattan', 'pazhampori'] },
      { name: 'Rahul', relation: 'Rider', typeId: 'student', favouriteDishes: ['chaya', 'parippuvada'] },
    ],
    arrivalGreeting: 'Biker Gang: "Enfield-il Gap Road vazhi vannathaanu! Kadu choodu chayayum parippuvadayum poratte!"',
    happyGreeting: 'Biker Gang: "Poli item chetta! Gap Road thണുപ്പു മുഴുവൻ maari!"',
    angryGreeting: 'Biker Gang: "Bike start aakki povaan samayam aayi."',
  },
];

// ------------------------------------------------------------- Procedural Family Generator

const REGIONAL_ORIGINS = [
  'Kottayam, Kerala', 'Thrissur, Kerala', 'Alappuzha, Kerala', 'Kozhikode, Kerala',
  'Trivandrum, Kerala', 'Indiranagar, Bangalore', 'Koramangala, Bangalore',
  'Mylapore, Chennai', 'Coimbatore, Tamil Nadu', 'Madurai, Tamil Nadu',
  'Bandra, Mumbai', 'Kothrud, Pune', 'South Delhi', 'Connaught Place, Delhi',
  'London, UK', 'Berlin, Germany', 'Sydney, Australia', 'Dubai, UAE'
];

const SURNAME_POOLS = [
  'Nambiar', 'Pillai', 'Panicker', 'Kurup', 'Tharakan', 'Mathew', 'Vaidyan',
  'Kulkarni', 'Deshmukh', 'Patil', 'Iyer', 'Iyengar', 'Reddy', 'Chowdhury',
  'Bannerjee', 'D\'Souza', 'Lobo', 'Fernandez', 'Kapoor', 'Bhatia', 'Malhotra',
  'Schneider', 'Weber', 'Becker', 'Wilson', 'Davies', 'Taylor'
];

export class FamilyRegistryManager {
  families: Map<string, FamilyProfile> = new Map();

  constructor() {
    this.initDefaultRoster();
  }

  initDefaultRoster() {
    // Populate signature families
    for (const sig of SIGNATURE_FAMILIES) {
      this.families.set(sig.id, {
        ...sig,
        visitCount: 0,
        relationshipScore: 10,
        loyaltyTier: 'first_time',
        lastVisitedDay: 0,
        hotelNightsStayed: 0,
      });
    }

    // Procedurally generate 30 additional unique families across all compositions
    for (let i = 1; i <= 30; i++) {
      const generated = this.generateProceduralFamily(i);
      this.families.set(generated.id, generated);
    }
  }

  private generateProceduralFamily(index: number): FamilyProfile {
    const origin = REGIONAL_ORIGINS[index % REGIONAL_ORIGINS.length];
    const surname = SURNAME_POOLS[index % SURNAME_POOLS.length];
    const isMalayali = origin.includes('Kerala');
    const isInternational = origin.includes('UK') || origin.includes('Germany') || origin.includes('Australia');
    const familyName = isMalayali ? `${surname} Kudumbam` : `The ${surname} Family`;

    const compTypes: FamilyComposition[] = [
      'small', 'medium', 'large', 'grandparents', 'young_children', 'teenagers',
      'multigenerational', 'relatives', 'wealthy_tourist', 'budget_traveller'
    ];
    const composition = compTypes[index % compTypes.length];
    const budgetTier: BudgetTier = index % 5 === 0 ? 'wealthy' : index % 4 === 0 ? 'budget' : 'moderate';

    // Build member hierarchy based on composition
    const members: FamilyMemberDef[] = [];
    if (composition === 'grandparents' || composition === 'multigenerational') {
      members.push({
        name: isMalayali ? `${surname} Appoppan` : `Grandpa ${surname}`,
        relation: 'Grandfather',
        typeId: 'appoppan',
        favouriteDishes: ['kattan', 'chaya', 'parippuvada'],
      });
      members.push({
        name: isMalayali ? 'Ammachi' : 'Grandma',
        relation: 'Grandmother',
        typeId: 'ammachi',
        favouriteDishes: ['kattan', 'puttu', 'chaya'],
      });
    }

    // Parents / Adults
    const adultTypeId: CustomerTypeId = isInternational
      ? 'backpacker'
      : origin.includes('Delhi') || origin.includes('Mumbai')
      ? 'tourist_north'
      : origin.includes('Bangalore')
      ? 'tourist_bangalore'
      : isMalayali
      ? 'ammavan'
      : 'tourist';

    members.push({
      name: isMalayali ? `Chettan ${surname}` : `Mr. ${surname}`,
      relation: 'Father',
      typeId: adultTypeId,
      favouriteDishes: ['chaya', 'coffee', 'dosa'],
    });

    members.push({
      name: isMalayali ? 'Aunty' : `Mrs. ${surname}`,
      relation: 'Mother',
      typeId: isMalayali ? 'aunty' : adultTypeId,
      favouriteDishes: ['chaya', 'pazhampori', 'puttu'],
    });

    // Kids / Youth
    if (composition === 'young_children' || composition === 'multigenerational' || composition === 'medium' || composition === 'large') {
      members.push({
        name: isMalayali ? 'Kutty' : 'Junior',
        relation: 'Child',
        typeId: 'kutty',
        favouriteDishes: ['pazhampori', 'chaya', 'puttu'],
      });
    }

    if (composition === 'teenagers' || composition === 'large') {
      members.push({
        name: 'Teen',
        relation: 'Youth',
        typeId: 'student',
        favouriteDishes: ['coffee', 'pazhampori', 'parippuvada'],
      });
    }

    const specialEvents: FamilySpecialEvent[] = ['none', 'birthday', 'vacation_rush', 'photography', 'anniversary'];
    const specialEvent = index % 4 === 0 ? specialEvents[index % specialEvents.length] : 'none';

    return {
      id: `fam_proc_${index}`,
      name: familyName,
      origin,
      composition,
      budgetTier,
      members,
      specialEvent,
      arrivalGreeting: `${familyName} from ${origin}: "We've arrived in Munnar! Can we get hot tea and snacks?"`,
      happyGreeting: `${familyName}: "Wonderful hospitality at Chandrappan Chettan's shop! We loved the food!"`,
      angryGreeting: `${familyName}: "Too crowded and long wait for a travelling family… leaving."`,
      visitCount: 0,
      relationshipScore: 10,
      loyaltyTier: 'first_time',
      lastVisitedDay: 0,
      hotelNightsStayed: 0,
    };
  }

  getFamily(id: string): FamilyProfile | undefined {
    return this.families.get(id);
  }

  recordVisit(id: string, currentDay: number, satisfaction01: number): { loyaltyChanged: boolean; newTier?: LoyaltyTier } {
    const fam = this.families.get(id);
    if (!fam) return { loyaltyChanged: false };

    fam.visitCount++;
    fam.lastVisitedDay = currentDay;
    const oldTier = fam.loyaltyTier;

    // Gain relationship score
    const delta = Math.round(satisfaction01 * 25);
    fam.relationshipScore = Math.min(100, fam.relationshipScore + delta);

    if (fam.relationshipScore >= 80 || fam.visitCount >= 4) {
      fam.loyaltyTier = 'vip_patron';
    } else if (fam.relationshipScore >= 60 || fam.visitCount >= 3) {
      fam.loyaltyTier = 'family_friend';
    } else if (fam.relationshipScore >= 40 || fam.visitCount >= 2) {
      fam.loyaltyTier = 'regular';
    } else {
      fam.loyaltyTier = 'familiar';
    }

    const loyaltyChanged = fam.loyaltyTier !== oldTier;
    return { loyaltyChanged, newTier: loyaltyChanged ? fam.loyaltyTier : undefined };
  }

  claimQuest(famId: string): { money: number; reputation: number } | null {
    const fam = this.families.get(famId);
    if (!fam || !fam.quest || !fam.quest.completed || fam.quest.claimed) return null;
    fam.quest.claimed = true;
    return { money: fam.quest.rewardMoney, reputation: fam.quest.rewardReputation };
  }

  /** Selects suitable recurring families to visit on a given business day and time period */
  pickCandidatesForDay(day: number): FamilyProfile[] {
    const list = Array.from(this.families.values());
    // Filter families that haven't visited today yet
    const available = list.filter((f) => f.lastVisitedDay < day);
    // Prioritize recurring regulars (30% weight) and fresh families
    return available.sort(() => Math.random() - 0.5);
  }

  exportState(): any[] {
    return Array.from(this.families.values()).map((f) => ({
      id: f.id,
      name: f.name,
      origin: f.origin,
      visitCount: f.visitCount,
      relationshipScore: f.relationshipScore,
      loyaltyTier: f.loyaltyTier,
      lastVisitedDay: f.lastVisitedDay,
      hotelNightsStayed: f.hotelNightsStayed,
      specialEvent: f.specialEvent,
      quest: f.quest,
    }));
  }

  importState(data: any[]) {
    if (!Array.isArray(data)) return;
    for (const saved of data) {
      const fam = this.families.get(saved.id);
      if (fam) {
        fam.visitCount = saved.visitCount ?? fam.visitCount;
        fam.relationshipScore = saved.relationshipScore ?? fam.relationshipScore;
        fam.loyaltyTier = saved.loyaltyTier ?? fam.loyaltyTier;
        fam.lastVisitedDay = saved.lastVisitedDay ?? fam.lastVisitedDay;
        fam.hotelNightsStayed = saved.hotelNightsStayed ?? fam.hotelNightsStayed;
        if (saved.specialEvent) fam.specialEvent = saved.specialEvent;
        if (saved.quest) fam.quest = saved.quest;
      }
    }
  }
}
