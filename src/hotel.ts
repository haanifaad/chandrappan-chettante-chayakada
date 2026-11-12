/**
 * Hotel and Hospitality Management System for Chandrappan Chettante Chayakkada.
 * Operates room inventory, reservations, housekeeping, guest satisfaction, and accommodation income.
 */

export type RoomTier =
  | 'budget_nonac'
  | 'deluxe_fan'
  | 'executive_ac'
  | 'heritage_villa'
  | 'panoramic_suite';

export interface RoomDef {
  tier: RoomTier;
  name: string;
  basePricePerNight: number;
  maxGuests: number;
  comfortRating: number;
}

export const ROOM_TIER_DEFS: Record<RoomTier, RoomDef> = {
  budget_nonac: {
    tier: 'budget_nonac',
    name: 'Budget Room (Non-AC)',
    basePricePerNight: 450,
    maxGuests: 2,
    comfortRating: 1.2,
  },
  deluxe_fan: {
    tier: 'deluxe_fan',
    name: 'Deluxe Room (Valley View & Fan)',
    basePricePerNight: 850,
    maxGuests: 2,
    comfortRating: 1.6,
  },
  executive_ac: {
    tier: 'executive_ac',
    name: 'Executive AC Suite',
    basePricePerNight: 1600,
    maxGuests: 3,
    comfortRating: 2.2,
  },
  heritage_villa: {
    tier: 'heritage_villa',
    name: 'Kerala Heritage Villa',
    basePricePerNight: 3500,
    maxGuests: 4,
    comfortRating: 3.0,
  },
  panoramic_suite: {
    tier: 'panoramic_suite',
    name: 'Panoramic Mist Suite',
    basePricePerNight: 7500,
    maxGuests: 4,
    comfortRating: 4.0,
  },
};

export interface HotelGuest {
  id: string;
  name: string;
  origin: string; // 'Bangalore', 'Kochi', 'UK', 'Chennai', etc.
  groupSize: number;
  stayDaysRemaining: number;
  satisfaction01: number;
  billPending: number;
}

export interface HotelRoomInstance {
  roomNumber: number;
  tier: RoomTier;
  isOccupied: boolean;
  currentGuest: HotelGuest | null;
  cleanliness01: number; // 0 to 1
  isClean: boolean;
}

const GUEST_NAMES = [
  'Arun & Family',
  'Dr. Koshy & Wife',
  'Pooja (Bangalore)',
  'Sneha & Friends',
  'Smith & Clara (UK)',
  'Rahul & Divya',
  'Kiran Kumar',
  'Anand from Kochi',
  'German Trekker Hans',
];

const GUEST_ORIGINS = ['Bangalore', 'Kochi', 'Chennai', 'Mumbai', 'London', 'Berlin', 'Kozhikode'];

export class HotelManager {
  rooms: HotelRoomInstance[] = [];
  dailyHotelRevenue: number = 0;
  totalHistoricalGuestsServed: number = 0;
  private checkInTimer: number = 5;

  constructor() {
    // Rooms are unlocked when hotel upgrades are built
  }

  unlockRooms(tier: RoomTier, count: number) {
    const existing = this.rooms.filter((r) => r.tier === tier).length;
    const baseNum = tier === 'budget_nonac' ? 100 : tier === 'deluxe_fan' ? 200 : tier === 'executive_ac' ? 300 : 400;
    for (let i = 1; i <= count; i++) {
      const roomNumber = baseNum + existing + i;
      if (!this.rooms.some((r) => r.roomNumber === roomNumber)) {
        this.rooms.push({
          roomNumber,
          tier,
          isOccupied: false,
          currentGuest: null,
          cleanliness01: 1.0,
          isClean: true,
        });
      }
    }
  }

  checkInGuest(guest: HotelGuest, preferredTier?: RoomTier): { success: boolean; roomNumber?: number; message: string } {
    const candidate = this.rooms.find(
      (r) => !r.isOccupied && r.isClean && (!preferredTier || r.tier === preferredTier),
    );

    if (!candidate) {
      return { success: false, message: 'No clean rooms available in that category.' };
    }

    candidate.isOccupied = true;
    candidate.currentGuest = guest;
    candidate.cleanliness01 = 0.9;
    candidate.isClean = false;

    const tierDef = ROOM_TIER_DEFS[candidate.tier];
    guest.billPending += tierDef.basePricePerNight * guest.stayDaysRemaining;
    this.totalHistoricalGuestsServed += guest.groupSize;

    return {
      success: true,
      roomNumber: candidate.roomNumber,
      message: `Checked into Room ${candidate.roomNumber} (${tierDef.name}).`,
    };
  }

  cleanRoom(roomNumber: number): boolean {
    const room = this.rooms.find((r) => r.roomNumber === roomNumber);
    if (!room) return false;
    room.cleanliness01 = 1.0;
    room.isClean = true;
    return true;
  }

  update(dt: number): HotelGuest | null {
    if (this.rooms.length === 0) return null;

    // Cleanliness decay for occupied rooms
    for (const room of this.rooms) {
      if (room.isOccupied) {
        room.cleanliness01 = Math.max(0.1, room.cleanliness01 - dt * 0.002);
      }
    }

    // Auto-spawn incoming tourists looking for rooms
    this.checkInTimer -= dt;
    if (this.checkInTimer <= 0) {
      this.checkInTimer = 15 + Math.random() * 20;
      const vacantClean = this.rooms.filter((r) => !r.isOccupied && r.cleanliness01 > 0.4);
      if (vacantClean.length > 0) {
        const room = vacantClean[Math.floor(Math.random() * vacantClean.length)];
        const guest: HotelGuest = {
          id: `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          name: GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)],
          origin: GUEST_ORIGINS[Math.floor(Math.random() * GUEST_ORIGINS.length)],
          groupSize: Math.floor(Math.random() * 2) + 1,
          stayDaysRemaining: Math.floor(Math.random() * 3) + 1,
          satisfaction01: 1.0,
          billPending: 0,
        };
        const res = this.checkInGuest(guest, room.tier);
        if (res.success) {
          return guest;
        }
      }
    }
    return null;
  }

  processNightTick(): { totalRoomRentEarned: number; checkouts: HotelGuest[] } {
    let earned = 0;
    const checkouts: HotelGuest[] = [];

    for (const room of this.rooms) {
      if (!room.isOccupied || !room.currentGuest) continue;

      const g = room.currentGuest;
      const def = ROOM_TIER_DEFS[room.tier];
      // Cleanliness affects rent satisfaction & tips
      const satisfactionMultiplier = room.cleanliness01 > 0.7 ? 1.15 : room.cleanliness01 > 0.4 ? 1.0 : 0.8;
      const nightlyFee = Math.round(def.basePricePerNight * satisfactionMultiplier);
      earned += nightlyFee;

      g.stayDaysRemaining--;
      if (g.stayDaysRemaining <= 0) {
        checkouts.push(g);
        room.isOccupied = false;
        room.currentGuest = null;
        room.cleanliness01 = 0.2; // Needs cleaning after checkout
        room.isClean = false;
      }
    }

    this.dailyHotelRevenue = earned;
    return { totalRoomRentEarned: earned, checkouts };
  }

  exportState() {
    return {
      rooms: this.rooms.map((r) => ({
        roomNumber: r.roomNumber,
        tier: r.tier,
        isOccupied: r.isOccupied,
        currentGuest: r.currentGuest ? { ...r.currentGuest } : null,
        cleanliness01: r.cleanliness01,
        isClean: r.isClean,
      })),
      dailyHotelRevenue: this.dailyHotelRevenue,
      totalHistoricalGuestsServed: this.totalHistoricalGuestsServed,
    };
  }

  importState(data: any) {
    if (!data) return;
    if (Array.isArray(data.rooms)) {
      this.rooms = data.rooms;
    }
    if (typeof data.dailyHotelRevenue === 'number') {
      this.dailyHotelRevenue = data.dailyHotelRevenue;
    }
    if (typeof data.totalHistoricalGuestsServed === 'number') {
      this.totalHistoricalGuestsServed = data.totalHistoricalGuestsServed;
    }
  }
}
