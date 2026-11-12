/**
 * Staff and Employee Automation System for Chandrappan Chettante Chayakkada.
 * Coordinates hiring, daily wages, schedules, productivity, levels (1-10), experience, and autonomous tasks.
 */

export type EmployeeRole = 'cook' | 'cleaner' | 'hotelStaff' | 'waiter';

export interface EmployeeCandidate {
  id: string;
  name: string;
  malayalam: string;
  role: EmployeeRole;
  dailyWage: number;
  skillLevel: number; // 1 to 5 base skill
  level: number; // 1 to 10 progression level
  experience: number;
  totalTasksCompleted: number;
  avatarColor: string;
  description: string;
}

export interface Employee extends EmployeeCandidate {
  isWorking: boolean;
  stamina01: number;
  currentTask: string;
}

export const CANDIDATES: EmployeeCandidate[] = [
  {
    id: 'emp_appu',
    name: 'Appu',
    malayalam: 'അപ്പു',
    role: 'cleaner',
    dailyWage: 120,
    skillLevel: 2,
    level: 1,
    experience: 0,
    totalTasksCompleted: 0,
    avatarColor: '#5E93B6',
    description: 'Energetic village helper who cleans dirty tables, sweeps, and maintains hotel rooms.',
  },
  {
    id: 'emp_vijayan',
    name: 'Vijayan Master',
    malayalam: 'വിജയൻ മാസ്റ്റർ',
    role: 'cook',
    dailyWage: 280,
    skillLevel: 4,
    level: 2,
    experience: 40,
    totalTasksCompleted: 12,
    avatarColor: '#B97336',
    description: 'Expert tea puller and kitchen helper who assists at cooking stations and speeds up prep.',
  },
  {
    id: 'emp_suku',
    name: 'Suku',
    malayalam: 'സുകു',
    role: 'waiter',
    dailyWage: 160,
    skillLevel: 3,
    level: 1,
    experience: 0,
    totalTasksCompleted: 0,
    avatarColor: '#428B55',
    description: 'Prompt server who physically picks up food from the counter and delivers to customers.',
  },
  {
    id: 'emp_lekshmi',
    name: 'Lekshmi',
    malayalam: 'ലക്ഷ്മി',
    role: 'hotelStaff',
    dailyWage: 220,
    skillLevel: 3,
    level: 1,
    experience: 0,
    totalTasksCompleted: 0,
    avatarColor: '#A7C9B8',
    description: 'Hospitable receptionist managing lodge guest check-ins & luggage.',
  },
  {
    id: 'emp_mariamma',
    name: 'Mariamma',
    malayalam: 'മറിയാമ്മ',
    role: 'cleaner',
    dailyWage: 180,
    skillLevel: 4,
    level: 2,
    experience: 80,
    totalTasksCompleted: 24,
    avatarColor: '#8E4A2F',
    description: 'Senior housekeeper maintaining 5-star room cleanliness.',
  },
];

export class StaffManager {
  hired: Employee[] = [];
  private taskTimer: number = 2;

  hire(id: string, currentMoney: number): { success: boolean; message: string; employee?: Employee } {
    if (this.isHired(id)) {
      return { success: false, message: 'Already hired.' };
    }
    const cand = CANDIDATES.find((c) => c.id === id);
    if (!cand) return { success: false, message: 'Candidate not found.' };
    if (currentMoney < cand.dailyWage) {
      return { success: false, message: `Need ₹${cand.dailyWage} advance wage.` };
    }

    const emp: Employee = {
      ...cand,
      isWorking: true,
      stamina01: 1.0,
      currentTask: 'On duty',
    };
    this.hired.push(emp);
    return { success: true, message: `Hired ${emp.name} (${emp.role})!`, employee: emp };
  }

  fire(id: string): boolean {
    const idx = this.hired.findIndex((e) => e.id === id);
    if (idx < 0) return false;
    this.hired.splice(idx, 1);
    return true;
  }

  isHired(id: string): boolean {
    return this.hired.some((e) => e.id === id);
  }

  getEmployee(id: string): Employee | undefined {
    return this.hired.find((e) => e.id === id);
  }

  hasRole(role: EmployeeRole): boolean {
    return this.hired.some((e) => e.role === role && e.isWorking);
  }

  calculateDailyPayroll(): number {
    return this.hired.filter((e) => e.isWorking).reduce((sum, e) => sum + e.dailyWage, 0);
  }

  setWage(id: string, newWage: number) {
    const emp = this.hired.find((e) => e.id === id);
    if (emp) {
      emp.dailyWage = Math.max(50, Math.min(1000, newWage));
    }
  }

  toggleDuty(id: string): boolean {
    const emp = this.hired.find((e) => e.id === id);
    if (!emp) return false;
    emp.isWorking = !emp.isWorking;
    emp.currentTask = emp.isWorking ? 'On duty' : 'On break';
    return emp.isWorking;
  }

  addXP(id: string, xp: number): { leveledUp: boolean; newLevel: number } {
    const emp = this.hired.find((e) => e.id === id);
    if (!emp) return { leveledUp: false, newLevel: 1 };
    emp.experience = (emp.experience ?? 0) + xp;
    emp.totalTasksCompleted = (emp.totalTasksCompleted ?? 0) + 1;

    let leveledUp = false;
    let lvl = emp.level ?? 1;
    while (lvl < 10) {
      const needed = lvl * 100;
      if (emp.experience >= needed) {
        emp.experience -= needed;
        lvl++;
        emp.level = lvl;
        leveledUp = true;
      } else {
        break;
      }
    }
    return { leveledUp, newLevel: emp.level };
  }

  update(
    dt: number,
    hotel: { rooms: { roomNumber: number; isOccupied: boolean; cleanliness01: number; isClean: boolean }[] },
  ) {
    this.taskTimer -= dt;
    if (this.taskTimer > 0) return;
    this.taskTimer = 3; // run background tasks every 3s

    for (const emp of this.hired) {
      if (!emp.isWorking) continue;

      // Cleaners maintain hotel rooms
      if (emp.role === 'cleaner') {
        const dirtyRoom = hotel.rooms.find((r) => r.cleanliness01 < 0.85);
        if (dirtyRoom) {
          dirtyRoom.cleanliness01 = Math.min(1.0, dirtyRoom.cleanliness01 + 0.15 * (emp.skillLevel + (emp.level ?? 1) * 0.2));
          if (dirtyRoom.cleanliness01 >= 0.8) dirtyRoom.isClean = true;
          emp.currentTask = `Cleaning Room ${dirtyRoom.roomNumber}`;
        } else {
          emp.currentTask = 'Rooms pristine ✨';
        }
      }

      // Front desk staff welcome lodge visitors
      if (emp.role === 'hotelStaff') {
        emp.currentTask = 'Front desk hospitality';
      }

      // Cooks and Waiters assist shop
      if (emp.role === 'cook') {
        emp.currentTask = 'Assisting cooking stations';
      }
      if (emp.role === 'waiter') {
        emp.currentTask = 'Serving counter attendant';
      }
    }
  }

  exportState() {
    return this.hired.map((e) => ({
      id: e.id,
      dailyWage: e.dailyWage,
      isWorking: e.isWorking,
      level: e.level ?? 1,
      experience: e.experience ?? 0,
      totalTasksCompleted: e.totalTasksCompleted ?? 0,
    }));
  }

  importState(data: any[]) {
    if (!Array.isArray(data)) return;
    this.hired = [];
    for (const item of data) {
      const cand = CANDIDATES.find((c) => c.id === item.id);
      if (cand) {
        this.hired.push({
          ...cand,
          dailyWage: typeof item.dailyWage === 'number' ? item.dailyWage : cand.dailyWage,
          isWorking: item.isWorking !== false,
          level: typeof item.level === 'number' ? item.level : cand.level,
          experience: typeof item.experience === 'number' ? item.experience : cand.experience,
          totalTasksCompleted: typeof item.totalTasksCompleted === 'number' ? item.totalTasksCompleted : 0,
          stamina01: 1.0,
          currentTask: 'On duty',
        });
      }
    }
  }
}
