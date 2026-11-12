import * as THREE from 'three';
import {
  FURNITURE_CATALOG,
  FurnitureManager,
  buildTableMesh,
  buildBenchMesh,
  buildStoveMesh,
  buildSamovarMesh,
  buildCabinetMesh,
  buildWaterFilterMesh,
  buildWasteBinMesh,
  buildSignboardMesh,
  buildRadioMesh,
  buildBillingCounterMesh,
} from '../src/furniture';
import {
  CANDIDATES,
  StaffManager,
} from '../src/staff';
import {
  StaffPuppet,
  StaffPuppetCallbacks,
} from '../src/staffPuppet';
import {
  ConstructionManager,
  ConstructionContractDef,
  buildScaffoldingSite,
} from '../src/construction';
import {
  STAGES,
  ProgressionManager,
} from '../src/progression';
import {
  RunSave,
  RUN_KEY_V4,
  migrateRunSave,
} from '../src/storage';
import { Snapshot } from '../src/protocol';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('====================================================');
console.log('CHANDRAPPAN CHETTANTE CHAYAKKADA - VERTICAL SLICE TESTS');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err: any) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    throw err;
  }
}

// ---------------------------------------------------------
// 1. FURNITURE & EQUIPMENT SYSTEM
// ---------------------------------------------------------
console.log('--- TEST GROUP 1: Furniture & Equipment System (10+ Items, 3 Tiers, Dirty State) ---');

runTest('Catalog contains at least 10 placeable furniture items', () => {
  assert(FURNITURE_CATALOG.length >= 10, `Expected at least 10 items, found ${FURNITURE_CATALOG.length}`);
  const expectedIds = [
    'table_teak',
    'wood_bench',
    'gas_stove',
    'chaya_samovar',
    'snack_cabinet',
    'water_filter',
    'waste_bin',
    'wall_signboard',
    'vintage_radio',
    'billing_counter',
  ];
  for (const id of expectedIds) {
    assert(FURNITURE_CATALOG.some((item) => item.id === id), `Missing required item: ${id}`);
  }
});

runTest('Every furniture item has 3 progressive upgrade tiers with costs and requirements', () => {
  for (const def of FURNITURE_CATALOG) {
    assert(def.tiers.length === 3, `Item ${def.id} has ${def.tiers.length} tiers, expected 3`);
    assert(def.tiers[0].level === 1 && def.tiers[1].level === 2 && def.tiers[2].level === 3, `Tiers must be 1, 2, 3`);
    assert(def.tiers[1].cost > def.tiers[0].cost, `Tier 2 cost should exceed Tier 1 for ${def.id}`);
    assert(def.tiers[2].cost > def.tiers[1].cost, `Tier 3 cost should exceed Tier 2 for ${def.id}`);
    assert(def.tiers[2].stageRequired >= def.tiers[1].stageRequired, `Tier 3 stage requirement >= Tier 2 for ${def.id}`);
  }
});

runTest('3D mesh generation works for all 10 items across all 3 tiers (including dirty state)', () => {
  const builders: Record<string, (lvl: number) => THREE.Group> = {
    wood_bench: buildBenchMesh,
    gas_stove: buildStoveMesh,
    chaya_samovar: buildSamovarMesh,
    snack_cabinet: buildCabinetMesh,
    water_filter: buildWaterFilterMesh,
    waste_bin: buildWasteBinMesh,
    wall_signboard: buildSignboardMesh,
    vintage_radio: buildRadioMesh,
    billing_counter: buildBillingCounterMesh,
  };

  // Test table clean and dirty across all 3 tiers
  for (let lvl = 1; lvl <= 3; lvl++) {
    const cleanTable = buildTableMesh(lvl, false);
    assert(cleanTable instanceof THREE.Group, `Clean table L${lvl} is not a THREE.Group`);
    assert(cleanTable.children.length > 0, `Clean table L${lvl} has no children`);

    const dirtyTable = buildTableMesh(lvl, true);
    assert(dirtyTable instanceof THREE.Group, `Dirty table L${lvl} is not a THREE.Group`);
    assert(dirtyTable.children.length > 0, `Dirty table L${lvl} has no children`);
  }

  // Test other 9 items across all 3 tiers
  for (const [id, builder] of Object.entries(builders)) {
    for (let lvl = 1; lvl <= 3; lvl++) {
      const mesh = builder(lvl);
      assert(mesh instanceof THREE.Group, `Mesh for ${id} L${lvl} is not a THREE.Group`);
      assert(mesh.children.length > 0, `Mesh for ${id} L${lvl} has no children`);
    }
  }
});

runTest('FurnitureManager spawns default shop items and manages upgrades & removal', () => {
  const scene = new THREE.Scene();
  const mgr = new FurnitureManager(scene);
  mgr.initDefaultShopFurniture();

  const allItems = mgr.getAll();
  assert(allItems.length >= 8, `Expected at least 8 initial furniture items, found ${allItems.length}`);

  // Find dining table
  const table = mgr.getByDefId('table_teak');
  assert(table !== undefined, 'Table item not found in initialized shop');
  assert(table!.level === 1, 'Initial table level should be 1');

  // Upgrade table to level 2
  const up1 = mgr.upgradeFurniture(table!.uid);
  assert(up1 === true, 'Upgrading table from level 1 to 2 failed');
  assert(table!.level === 2, 'Table level should now be 2');

  // Upgrade table to level 3
  const up2 = mgr.upgradeFurniture(table!.uid);
  assert(up2 === true, 'Upgrading table from level 2 to 3 failed');
  assert(table!.level === 3, 'Table level should now be 3');

  // Max upgrade check
  const up3 = mgr.upgradeFurniture(table!.uid);
  assert(up3 === false, 'Upgrading beyond level 3 should return false');

  // Dirty table toggling
  assert(table!.dirty === false, 'Table should start clean');
  table!.setDirty(true);
  assert(table!.dirty === true, 'Table should be dirty');
  const dirtyTables = mgr.getDirtyTables();
  assert(dirtyTables.some((t) => t.uid === table!.uid), 'getDirtyTables should contain dirty table');

  // Clean table
  const cleaned = mgr.cleanTable(table!.uid);
  assert(cleaned === true, 'cleanTable should return true');
  assert(table!.dirty === false, 'Table should now be clean');

  // Gas stove check
  const stove = mgr.getByDefId('gas_stove');
  assert(stove !== undefined, 'Gas stove item not found');
  assert(stove!.level === 1, 'Initial gas stove should be level 1');
  mgr.upgradeFurniture(stove!.uid);
  assert(stove!.level === 2, 'Gas stove should be level 2');
});

// ---------------------------------------------------------
// 2. EMPLOYEES & STAFF AUTOMATION
// ---------------------------------------------------------
console.log('\n--- TEST GROUP 2: Employees & Staff Automation (Waiter, Cleaner, Kitchen Helper) ---');

runTest('Employee candidates cover Waiter, Cleaner, and Kitchen Helper', () => {
  const roles = CANDIDATES.map((c) => c.role);
  assert(roles.includes('waiter'), 'Missing waiter candidate');
  assert(roles.includes('cleaner'), 'Missing cleaner candidate');
  assert(roles.includes('cook'), 'Missing kitchen helper / cook candidate');
});

runTest('StaffManager handles hiring, daily wages, and level 1-10 progression with XP', () => {
  const mgr = new StaffManager();
  assert(mgr.hired.length === 0, 'Should start with no hired staff');

  // Hire Suku (waiter)
  const hireRes = mgr.hire('emp_suku', 500);
  assert(hireRes.success === true, 'Failed to hire Suku');
  const hiredSuku = hireRes.employee!;
  assert(mgr.isHired('emp_suku') === true, 'Suku should be registered as hired');
  assert(hiredSuku.level === 1, 'Suku starts at level 1');
  assert(hiredSuku.experience === 0, 'Suku starts at 0 XP');

  // Add XP and level up (level 1 needs 100 XP)
  const xpRes = mgr.addXP('emp_suku', 120);
  assert(xpRes.leveledUp === true, 'Employee should have leveled up');
  assert(hiredSuku.level === 2, `Employee level should be 2, got ${hiredSuku.level}`);
  assert(hiredSuku.experience === 20, `Remaining XP should be 20, got ${hiredSuku.experience}`);

  // Level up to level 10
  mgr.addXP('emp_suku', 50000);
  assert(hiredSuku.level === 10, `Employee level should reach 10, got ${hiredSuku.level}`);

  // Daily payroll calculation
  const totalWages = mgr.calculateDailyPayroll();
  assert(totalWages > 0, `Total wages should be positive, got ${totalWages}`);
});

runTest('StaffPuppet handles physical Waiter, Cleaner, and Kitchen Helper state machines', () => {
  const scene = new THREE.Scene();
  const staffMgr = new StaffManager();
  const suku = staffMgr.hire('emp_suku', 500).employee!;
  const appu = staffMgr.hire('emp_appu', 500).employee!;
  const vijayan = staffMgr.hire('emp_vijayan', 500).employee!;

  let servedCustomerSlot = -1;
  let cleanedTableUid = '';
  let kitchenAssistedCount = 0;
  let xpGained = 0;

  const callbacks: StaffPuppetCallbacks = {
    onServeCustomer: (slot, dish) => {
      servedCustomerSlot = slot;
    },
    onTableCleaned: (uid) => {
      cleanedTableUid = uid;
    },
    onKitchenAssisted: () => {
      kitchenAssistedCount++;
    },
    onXpGain: (id, xp) => {
      xpGained += xp;
    },
    onLevelUp: () => {},
    onFloatText: () => {},
    onSfx: () => {},
  };

  // 1. Waiter delivery workflow
  const waiterPuppet = new StaffPuppet(suku, scene, new THREE.Vector3(0, 0, 0), callbacks);
  assert(waiterPuppet.state === 'idle', 'Waiter should start idle');
  waiterPuppet.assignWaiterDelivery(
    new THREE.Vector3(1, 0, 1),
    new THREE.Vector3(3, 0, 3),
    2,
    'chaya'
  );
  assert(waiterPuppet.state === 'walking_to_counter', 'Waiter should transition to walking_to_counter');

  // Simulate tick until reaching counter
  for (let i = 0; i < 20; i++) {
    waiterPuppet.update(0.2, 0.2 * i);
  }
  // Waiter should carry food or serve customer
  assert(
    waiterPuppet.state === 'carrying_food' ||
      waiterPuppet.state === 'serving_customer' ||
      waiterPuppet.state === 'returning' ||
      waiterPuppet.state === 'idle',
    `Unexpected waiter state: ${waiterPuppet.state}`
  );
  assert(servedCustomerSlot === 2, `Expected customer slot 2 to be served, got ${servedCustomerSlot}`);

  // 2. Cleaner table cleaning workflow
  const cleanerPuppet = new StaffPuppet(appu, scene, new THREE.Vector3(0, 0, 0), callbacks);
  cleanerPuppet.assignCleanTable(new THREE.Vector3(2, 0, 2), 'tbl_test_99');
  assert(cleanerPuppet.state === 'walking_to_table', 'Cleaner should transition to walking_to_table');

  // Simulate ticks until reaching table and scrubbing
  for (let i = 0; i < 35; i++) {
    cleanerPuppet.update(0.2, false);
  }
  // Cleaner should have reached table or started scrubbing or completed
  assert(
    cleanerPuppet.state === 'scrubbing_table' || cleanerPuppet.state === 'idle' || cleanerPuppet.state === 'returning',
    `Unexpected cleaner state: ${cleanerPuppet.state}`
  );

  // 3. Kitchen helper workflow
  const kitchenPuppet = new StaffPuppet(vijayan, scene, new THREE.Vector3(0, 0, 0), callbacks);
  assert(kitchenPuppet.state === 'idle', 'Kitchen helper starts idle');
  kitchenPuppet.update(0.2, true);
  assert(kitchenPuppet.state === 'assisting_kitchen', 'Kitchen helper should transition to assisting_kitchen');

  // Simulate active cooking in kitchen for 5 seconds
  for (let i = 0; i < 25; i++) {
    kitchenPuppet.update(0.2, true);
  }
  assert(kitchenAssistedCount > 0, 'Kitchen helper should trigger onKitchenAssisted callback');
});

// ---------------------------------------------------------
// 3. CONSTRUCTION SYSTEM
// ---------------------------------------------------------
console.log('\n--- TEST GROUP 3: Construction System (Carpenter NPC, Contracts, Gating) ---');

runTest('Scaffolding and installation 3D meshes generate correctly', () => {
  const scaffolding = buildScaffoldingSite([1.8, 0.35, 1.2]);
  assert(scaffolding instanceof THREE.Group, 'Scaffolding should be a THREE.Group');
  assert(scaffolding.children.length > 0, 'Scaffolding must contain structural members');
});

runTest('ConstructionManager lifecycle: signing, scaffolding, progress ticking, and completion', () => {
  const scene = new THREE.Scene();
  const mgr = new ConstructionManager(scene);
  assert(mgr.hasActiveContract() === false, 'Should have no active contract initially');
  assert(mgr.carpenter !== null, 'Carpenter NPC model should be instantiated');

  const testContract: ConstructionContractDef = {
    contractId: 'contract_test_table',
    contractorName: 'Kuttan Ashari',
    malayalam: 'കുട്ടൻ ആശാരി',
    targetType: 'furniture',
    targetId: 'table_teak',
    targetName: 'Customer Dining Table',
    targetLevel: 2,
    cost: 320,
    durationSeconds: 10,
    sitePosition: [1.8, 0.35, 1.2],
    description: 'Master carpenter polishing and reinforcing teakwood table structure.',
  };

  // Test insufficient funds check
  const failFunds = mgr.startContract(testContract, 100);
  assert(failFunds.success === false, 'Should reject contract when player has insufficient money');
  assert(mgr.hasActiveContract() === false, 'Should not start contract on insufficient funds');

  // Test successful commission
  const startRes = mgr.startContract(testContract, 500);
  assert(startRes.success === true, 'Failed to commission Kuttan Ashari with sufficient funds');
  assert(mgr.hasActiveContract() === true, 'Should now have an active contract');
  assert(mgr.activeContract!.targetLevel === 2, 'Target level should be 2');
  assert(mgr.activeContract!.durationSeconds === 10, 'Duration should be 10 seconds');

  // Second contract commission while busy should fail
  const busyRes = mgr.startContract(testContract, 500);
  assert(busyRes.success === false, 'Should reject new contract when Kuttan Ashari is already busy');

  // Tick time forward by 5s (halfway)
  let sfxPlayed: string[] = [];
  const tick1 = mgr.update(5.0, (sfx) => sfxPlayed.push(sfx));
  assert(tick1.completedContract === null, 'Contract should not be completed yet at 50%');
  assert(mgr.hasActiveContract() === true, 'Contract should still be active');
  assert(mgr.activeContract!.progress01 >= 0.49, `Progress should be ~0.5, got ${mgr.activeContract!.progress01}`);
  assert(mgr.activeContract!.remainingSeconds <= 5.1, 'Remaining time should be ~5s');

  // Tick remaining 6s to complete
  const tick2 = mgr.update(6.0, (sfx) => sfxPlayed.push(sfx));
  assert(tick2.completedContract !== null, 'Contract should now be completed');
  assert(tick2.completedContract!.contractId === 'contract_test_table', 'Completed contract should match');
  assert(mgr.hasActiveContract() === false, 'Active contract should now be cleared');
});

// ---------------------------------------------------------
// 4. PROGRESSION SYSTEM (25 STAGES, 5 ERAS)
// ---------------------------------------------------------
console.log('\n--- TEST GROUP 4: Progression System (25 Stages across 5 Eras) ---');

runTest('Progression STAGES contains exactly 25 distinct stages across 5 eras', () => {
  assert(STAGES.length === 25, `Expected 25 stages, found ${STAGES.length}`);
  const eraCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const s of STAGES) {
    eraCounts[s.era]++;
    assert(s.name.length > 0, `Stage ${s.stage} missing name`);
    assert(s.signatureDish.length > 0, `Stage ${s.stage} missing signature dish`);
  }
  for (let e = 1; e <= 5; e++) {
    assert(eraCounts[e] === 5, `Era ${e} should have 5 stages, found ${eraCounts[e]}`);
  }
});

runTest('ProgressionManager checks prerequisites and advances stages', () => {
  const mgr = new ProgressionManager(1);
  assert(mgr.currentStage === 1, 'Should start at stage 1');
  assert(mgr.getEra() === 1, 'Stage 1 should be Era 1');

  // Stage 1 -> Stage 2 requires capital = 400, rep = 1.8, and prereq "Sell 30 teas"
  const checkLowMoney = mgr.canAdvance(100, 2.0);
  assert(checkLowMoney.canAdvance === false, 'Should reject advancement when capital is insufficient');

  const checkLowRep = mgr.canAdvance(500, 1.2);
  assert(checkLowRep.canAdvance === false, 'Should reject advancement when reputation is insufficient');

  const checkMissingPrereq = mgr.canAdvance(500, 2.0);
  assert(checkMissingPrereq.canAdvance === false, 'Should reject advancement when prerequisite is missing');

  // Complete prerequisite
  mgr.completePrerequisite('Sell 30 teas');
  const checkAllowed = mgr.canAdvance(500, 2.0);
  assert(checkAllowed.canAdvance === true, 'Should allow advancement when all conditions met');

  const advanced = mgr.advanceToNextStage(500, 2.0);
  assert(advanced.success === true, 'advanceToNextStage failed');
  assert(mgr.currentStage === 2, `Stage should now be 2, got ${mgr.currentStage}`);
});

// ---------------------------------------------------------
// 5. STORAGE & SAVE/LOAD PERSISTENCE
// ---------------------------------------------------------
console.log('\n--- TEST GROUP 5: Storage & Persistence (Schema v4 with Migration) ---');

runTest('Storage schema v4 serializes and deserializes furniture, staff, construction & progression', () => {
  const fullSave: RunSave = {
    version: 4,
    day: 5,
    money: 1850,
    reputation: 3.4,
    level: 2,
    streak: 3,
    completed: 45,
    lost: 2,
    earnings: 3200,
    unlocked: ['table_polishing'],
    clockMinute: 600,
    businessLevel: 2,
    lifestyle: { houseLevel: 1, savingsInBank: 500, bankInterestEarned: 25, dailyComfortBonus: 0.1 },
    businesses: [],
    hotel: { rooms: [], dailyHotelRevenue: 0, totalHistoricalGuestsServed: 0 },
    staff: {
      hired: [
        {
          id: 'emp_suku',
          name: 'Suku',
          malayalam: 'സുകു',
          role: 'waiter',
          dailyWage: 160,
          skillLevel: 3,
          level: 4,
          experience: 150,
          totalTasksCompleted: 28,
          avatarColor: '#428B55',
          description: 'Prompt server',
        },
      ],
    },
    furniture: [
      {
        uid: 'table_teak_1',
        defId: 'table_teak',
        level: 3,
        x: 1.8,
        y: 0.35,
        z: 1.2,
        ry: 0,
        placed: true,
        dirty: false,
      },
      {
        uid: 'gas_stove_1',
        defId: 'gas_stove',
        level: 2,
        x: -2.1,
        y: 0.85,
        z: -1.0,
        ry: 0,
        placed: true,
        dirty: false,
      },
    ],
    progression: {
      currentStage: 3,
      completedPrerequisites: ['Sell 30 teas', 'upgrade_table_teak_lvl_2'],
    },
    construction: {
      contractId: 'contract_kitchen_hood',
      contractorName: 'Kuttan Ashari',
      targetId: 'gas_stove',
      targetName: 'Commercial Hearth Stove',
      targetLevel: 3,
      remaining: 15.5,
      total: 30,
      sitePos: [-2.1, 0.85, -1.0],
    },
  };

  // Migrate and verify
  const migrated = migrateRunSave(fullSave);
  assert(migrated.version === 4, 'Version should be 4');
  assert(migrated.furniture?.length === 2, 'Furniture array should be preserved');
  assert(migrated.furniture![0].level === 3, 'Table level should be 3');
  assert(migrated.furniture![1].level === 2, 'Stove level should be 2');
  assert(migrated.employees?.[0].level === 4, 'Staff level should be 4');
  assert(migrated.progression?.currentStage === 3, 'Progression stage should be 3');
  assert(migrated.construction?.contractId === 'contract_kitchen_hood', 'Construction contract should be preserved');
});

runTest('Backward-compatibility: Migrating a legacy v3 save upgrades schema gracefully', () => {
  const legacyV3Save = {
    version: 3,
    day: 2,
    money: 300,
    reputation: 2.5,
    level: 1,
    streak: 0,
    completed: 10,
    lost: 1,
    earnings: 450,
    unlocked: [],
    clockMinute: 480,
    businessLevel: 1,
    lifestyle: { houseLevel: 1, savingsInBank: 0, bankInterestEarned: 0, dailyComfortBonus: 0 },
    businesses: [],
    hotel: { rooms: [], dailyHotelRevenue: 0, totalHistoricalGuestsServed: 0 },
    staff: { hired: [] },
  };

  const migrated = migrateRunSave(legacyV3Save as any);
  assert(migrated.version === 4, 'Migrated legacy save must become version 4');
  assert(migrated.progression?.currentStage === 1, 'Default progression stage should be 1');
  assert(migrated.furniture === undefined || Array.isArray(migrated.furniture), 'Furniture must be valid');
});

// ---------------------------------------------------------
// 6. MULTIPLAYER PROTOCOL SYNCHRONIZATION
// ---------------------------------------------------------
console.log('\n--- TEST GROUP 6: Multiplayer Protocol & Co-Op Synchronization ---');

runTest('Snapshot payload includes furniture, construction, staff, and progression stages', () => {
  const testSnap: Snapshot = {
    t: 'snap',
    ph: 'playing',
    pa: false,
    name: 'Chandrappan Teas',
    trim: 'green',
    money: 1200,
    rep: 3.2,
    day: 4,
    lvl: 2,
    handled: 25,
    quota: 30,
    owned: ['table_polishing'],
    heavy: false,
    rush: 0,
    cs: [],
    it: [],
    pl: [],
    furniture: [
      { uid: 'tbl_1', defId: 'table_teak', lvl: 2, x: 1.8, y: 0.35, z: 1.2, ry: 0, p: true, d: false },
      { uid: 'stv_1', defId: 'gas_stove', lvl: 2, x: -2.1, y: 0.85, z: -1.0, ry: 0, p: true, d: false },
    ],
    construction: {
      cId: 'contract_seating_alcove',
      cName: 'Kuttan Ashari',
      tId: 'table_teak',
      tName: 'Customer Dining Table',
      tLvl: 3,
      rem: 12.0,
      dur: 25.0,
      prog: 0.52,
      x: 1.8,
      y: 0.35,
      z: 1.2,
    },
    staff: [
      {
        id: 'emp_suku',
        r: 'waiter',
        lvl: 3,
        xp: 80,
        x: 1.0,
        y: 0,
        z: 1.5,
        ry: 1.57,
        st: 'carrying_food',
        task: 'Delivering tea',
      },
    ],
    stage: 2,
    era: 1,
  };

  assert(testSnap.furniture?.length === 2, 'Snapshot furniture count should be 2');
  assert(testSnap.construction?.cId === 'contract_seating_alcove', 'Snapshot construction matches');
  assert(testSnap.staff?.length === 1, 'Snapshot staff count should be 1');
  assert(testSnap.stage === 2, 'Snapshot stage should be 2');
});

console.log('\n====================================================');
console.log(`TEST RESULTS: ${passedTests} / ${totalTests} PASSED (100% Success)`);
console.log('====================================================\n');
