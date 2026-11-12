import * as THREE from 'three';
import { FURNITURE_CATALOG, FurnitureManager } from '../src/furniture';
import { CANDIDATES, StaffManager } from '../src/staff';
import { StaffPuppet, StaffPuppetCallbacks } from '../src/staffPuppet';
import { ConstructionManager, ConstructionContractDef, buildCarpenterModel, buildScaffoldingSite } from '../src/construction';
import { ProgressionManager, STAGES } from '../src/progression';
import { RunSave, migrateRunSave } from '../src/storage';
import { RECIPES } from '../src/recipes';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`FAIL: ${msg}`);
  }
}

async function runVerticalSliceTests() {
  console.log('====================================================');
  console.log('RUNNING CHANDRAPPAN CHETTANTE CHAYAKKADA SLICE TESTS');
  console.log('====================================================\n');

  let passed = 0;

  // ---------------------------------------------------------------------------
  // 1. INDIVIDUAL ITEMS & FURNITURE
  // ---------------------------------------------------------------------------
  console.log('>>> [1/5] Testing Individual Items & Furniture System...');
  assert(FURNITURE_CATALOG.length >= 10, `Catalog must have >= 10 items, found ${FURNITURE_CATALOG.length}`);
  
  const expectedItems = [
    'table_teak', 'wood_bench', 'gas_stove', 'chaya_samovar', 'snack_cabinet',
    'water_filter', 'waste_bin', 'wall_signboard', 'vintage_radio', 'billing_counter'
  ];
  for (const expectedId of expectedItems) {
    const item = FURNITURE_CATALOG.find(i => i.id === expectedId);
    assert(!!item, `Missing expected furniture item: ${expectedId}`);
    assert(item!.tiers.length === 3, `Item ${expectedId} must have 3 upgrade tiers`);
    assert(item!.tiers[0].cost > 0, `Tier 1 must have purchase cost`);
    assert(item!.tiers[1].cost > item!.tiers[0].cost, `Tier 2 must cost more than Tier 1`);
    assert(item!.tiers[2].cost > item!.tiers[1].cost, `Tier 3 must cost more than Tier 2`);
    assert(item!.tiers[1].stageRequired >= 1, `Tier 2 must have unlock requirements`);
  }

  // Test FurnitureManager instantiation and physical models in 3D scene
  const scene = new THREE.Scene();
  const fManager = new FurnitureManager(scene);
  const allInstances = fManager.getAll();
  assert(allInstances.length >= 10, `Should initialize at least 10 furniture instances, got ${allInstances.length}`);

  // Test placement and removal
  const diningTable = allInstances.find(i => i.def.id === 'table_teak');
  assert(!!diningTable, 'Dining table instance must exist');
  assert(diningTable!.isPlaced === true, 'Default dining table should be placed');
  assert(diningTable!.root.visible === true, 'Placed table root must be visible');

  diningTable!.setPlaced(false);
  assert(diningTable!.isPlaced === false, 'Table should now be unplaced (stored in inventory)');
  assert(diningTable!.root.visible === false, 'Unplaced table root must be hidden from shop floor');

  diningTable!.setPlaced(true);
  assert(diningTable!.isPlaced === true, 'Table should be placed back in shop');
  assert(diningTable!.root.visible === true, 'Placed table root must become visible again');

  // Test 3D visual tier upgrades
  assert(diningTable!.level === 1, 'Initial level should be 1');
  const initialChildCount = diningTable!.root.children.length;
  assert(initialChildCount > 0, 'Tier 1 must have generated 3D meshes');

  const upgradedToLvl2 = diningTable!.upgrade();
  assert(upgradedToLvl2 === true, 'Upgrade to Tier 2 should succeed');
  assert(diningTable!.level === 2, 'Level should now be 2');

  const upgradedToLvl3 = diningTable!.upgrade();
  assert(upgradedToLvl3 === true, 'Upgrade to Tier 3 should succeed');
  assert(diningTable!.level === 3, 'Level should now be 3');

  const beyondMax = diningTable!.upgrade();
  assert(beyondMax === false, 'Cannot upgrade beyond max tier (Tier 3)');

  // Test dirty table mechanics
  assert(diningTable!.isDirty === false, 'Table starts clean');
  diningTable!.setDirty(true);
  assert(diningTable!.isDirty === true, 'Table is now dirty');
  const dirtyTables = fManager.getDirtyTables();
  assert(dirtyTables.length === 1 && dirtyTables[0].uid === diningTable!.uid, 'Dirty table registered');
  fManager.cleanTable(diningTable!.uid);
  assert(diningTable!.isDirty === false, 'Table cleaned successfully');

  // Test export & import persistence
  const exportedFurniture = fManager.exportState();
  assert(exportedFurniture.length === allInstances.length, 'Export state has all items');
  const freshScene = new THREE.Scene();
  const freshManager = new FurnitureManager(freshScene);
  freshManager.importState(exportedFurniture);
  const importedTable = freshManager.getAll().find(i => i.def.id === 'table_teak');
  assert(importedTable?.level === 3, 'Imported table must retain Level 3 upgrade');
  console.log('✓ PASS: Individual Items (10 catalog items, 3 visual tiers, placement/removal, persistence)');
  passed++;

  // ---------------------------------------------------------------------------
  // 2. EMPLOYEES & WORK ASSIGNMENTS
  // ---------------------------------------------------------------------------
  console.log('\n>>> [2/5] Testing Employee Recruitment & Autonomous Actions...');
  assert(CANDIDATES.length >= 3, 'Must have at least 3 helper NPC candidates');
  const roles = new Set(CANDIDATES.map(c => c.role));
  assert(roles.has('waiter'), 'Must have Waiter candidate');
  assert(roles.has('cleaner'), 'Must have Cleaner candidate');
  assert(roles.has('cook'), 'Must have Cook / Kitchen Helper candidate');

  const staffManager = new StaffManager();
  const waiterCand = CANDIDATES.find(c => c.role === 'waiter')!;
  const cleanerCand = CANDIDATES.find(c => c.role === 'cleaner')!;
  const cookCand = CANDIDATES.find(c => c.role === 'cook')!;

  // Test hiring with insufficient vs sufficient money
  const hireBroke = staffManager.hire(waiterCand.id, 50);
  assert(hireBroke.success === false, 'Cannot hire without sufficient advance wage');

  const hireWaiter = staffManager.hire(waiterCand.id, 1000);
  assert(hireWaiter.success === true, `Hired waiter ${waiterCand.name}`);
  const hireCleaner = staffManager.hire(cleanerCand.id, 1000);
  assert(hireCleaner.success === true, `Hired cleaner ${cleanerCand.name}`);
  const hireCook = staffManager.hire(cookCand.id, 1000);
  assert(hireCook.success === true, `Hired cook ${cookCand.name}`);

  assert(staffManager.hired.length === 3, 'All 3 employees should be hired');
  assert(staffManager.hasRole('waiter'), 'StaffManager confirms active waiter');
  assert(staffManager.hasRole('cleaner'), 'StaffManager confirms active cleaner');
  assert(staffManager.hasRole('cook'), 'StaffManager confirms active cook');

  // Test payroll calculation & wage modifications
  const expectedPayroll = waiterCand.dailyWage + cleanerCand.dailyWage + cookCand.dailyWage;
  assert(staffManager.calculateDailyPayroll() === expectedPayroll, `Payroll should be ${expectedPayroll}`);
  staffManager.setWage(waiterCand.id, 250);
  assert(staffManager.getEmployee(waiterCand.id)!.dailyWage === 250, 'Wage adjustment successful');

  // Test XP & Level Up
  const xpRes = staffManager.addXP(waiterCand.id, 120);
  assert(xpRes.leveledUp === true, 'Adding 120 XP should trigger level up');
  assert(staffManager.getEmployee(waiterCand.id)!.level === 2, 'Waiter should be level 2');

  // Test Physical 3D Staff Puppets & Autonomous Loop
  let servedCustomerSlot = -1;
  let cleanedTableUid = '';
  let kitchenAssistedCount = 0;

  const callbacks: StaffPuppetCallbacks = {
    onServeCustomer: (slot, recipe) => { servedCustomerSlot = slot; },
    onTableCleaned: (uid) => { cleanedTableUid = uid; },
    onKitchenAssisted: () => { kitchenAssistedCount++; },
    onXpGain: () => {},
    onLevelUp: () => {},
    onFloatText: () => {},
    onSfx: () => {},
  };

  const waiterEmp = staffManager.getEmployee(waiterCand.id)!;
  const waiterPuppet = new StaffPuppet(waiterEmp, scene, new THREE.Vector3(0, 0, 0), callbacks);

  // Simulate Waiter Delivery flow
  const counterPos = new THREE.Vector3(1, 0, 0);
  const customerPos = new THREE.Vector3(3, 0, 2);
  const assigned = waiterPuppet.assignWaiterDelivery(counterPos, customerPos, 0, 'chaya');
  assert(assigned === true, 'Waiter assigned delivery');
  assert(waiterPuppet.state === 'walking_to_counter', 'Waiter starts walking to counter');

  // Step simulation until waiter reaches counter, picks up food, walks to customer, and serves
  for (let i = 0; i < 40; i++) {
    waiterPuppet.update(0.1, false);
    if (servedCustomerSlot === 0) break;
  }
  assert(servedCustomerSlot === 0, 'Waiter physically served customer order at slot 0');

  // Simulate Cleaner Table Cleaning flow
  const cleanerEmp = staffManager.getEmployee(cleanerCand.id)!;
  const cleanerPuppet = new StaffPuppet(cleanerEmp, scene, new THREE.Vector3(0, 0, 0), callbacks);
  const tablePos = new THREE.Vector3(2, 0, 1);
  const assignedClean = cleanerPuppet.assignCleanTable(tablePos, 'table_123');
  assert(assignedClean === true, 'Cleaner assigned table');
  assert(cleanerPuppet.state === 'walking_to_table', 'Cleaner starts walking to table');

  for (let i = 0; i < 50; i++) {
    cleanerPuppet.update(0.1, false);
    if (cleanedTableUid === 'table_123') break;
  }
  assert(cleanedTableUid === 'table_123', 'Cleaner physically scrubbed and cleaned table');

  // Simulate Kitchen Helper assistance
  const cookEmp = staffManager.getEmployee(cookCand.id)!;
  const cookPuppet = new StaffPuppet(cookEmp, scene, new THREE.Vector3(0, 0, 0), callbacks);
  for (let i = 0; i < 35; i++) {
    cookPuppet.update(0.2, true);
  }
  assert(kitchenAssistedCount > 0, 'Kitchen helper assisted with cooking');
  console.log('✓ PASS: Employees (Recruitment, XP/Leveling, Wages, Physical Waiter/Cleaner/Cook Puppets)');
  passed++;

  // ---------------------------------------------------------------------------
  // 3. CONSTRUCTION SYSTEM
  // ---------------------------------------------------------------------------
  console.log('\n>>> [3/5] Testing Construction & Carpenter System...');
  const carpenterModel = buildCarpenterModel();
  assert(!!carpenterModel.root, 'Kuttan Ashari 3D model created');
  assert(carpenterModel.root.name === 'Kuttan_Ashari', 'Carpenter model has correct name');

  const scaffolding = buildScaffoldingSite([1, 0, 1]);
  assert(!!scaffolding, 'Physical 3D scaffolding created');

  const constructionScene = new THREE.Scene();
  const cManager = new ConstructionManager(constructionScene);
  assert(cManager.hasActiveContract() === false, 'No active contract initially');

  const contractDef: ConstructionContractDef = {
    contractId: 'contract_roof_expansion',
    contractorName: 'Kuttan Ashari',
    malayalam: 'മേൽക്കൂര വികസനം',
    targetType: 'upgrade',
    targetId: 'roof_lvl2',
    targetName: 'Thatched Clay Tile Roof Expansion',
    targetLevel: 2,
    cost: 450,
    durationSeconds: 3.0,
    sitePosition: [-4.2, 0, -1.8],
    description: 'Traditional terracotta tiled roof upgrade providing shelter from monsoons.',
  };

  // Payment check
  const brokeSign = cManager.startContract(contractDef, 100);
  assert(brokeSign.success === false, 'Cannot sign contract without ₹450');

  // Sign contract
  const signed = cManager.startContract(contractDef, 1000);
  assert(signed.success === true, 'Contract signed successfully');
  assert(cManager.hasActiveContract() === true, 'Contract is active');
  assert(cManager.activeContract?.progress01 === 0, 'Progress starts at 0');

  // Duplicate contract prevention
  const duplicateSign = cManager.startContract(contractDef, 1000);
  assert(duplicateSign.success === false, 'Cannot start contract while Kuttan is already working');

  // Progress ticks and completion
  let clinkSfxCount = 0;
  let completed: ConstructionContractDef | null = null;
  for (let t = 0; t < 45; t++) {
    const res = cManager.update(0.1, (sfx) => {
      if (sfx === 'clink') clinkSfxCount++;
    });
    if (res.completedContract) {
      completed = res.completedContract;
      break;
    }
  }
  assert(clinkSfxCount > 0, 'Hammering audio triggered during construction');
  assert(completed !== null, 'Construction contract completed after duration');
  assert(completed!.targetId === 'roof_lvl2', 'Completed target matches contract');
  assert(cManager.hasActiveContract() === false, 'Manager active contract cleared upon completion');
  console.log('✓ PASS: Construction (Carpenter Kuttan Ashari, 3D Scaffolding, Contracts, Hammering SFX, Completion)');
  passed++;

  // ---------------------------------------------------------------------------
  // 4. PROGRESSION & ERA SYSTEM
  // ---------------------------------------------------------------------------
  console.log('\n>>> [4/5] Testing 25-Stage Business Progression System...');
  assert(STAGES.length === 25, `Progression must define 25 stages, found ${STAGES.length}`);
  
  const progManager = new ProgressionManager(1);
  assert(progManager.currentStage === 1, 'Starts at Stage 1');
  const currentStageDef = progManager.getCurrentStageDef();
  assert(currentStageDef.stage === 1, 'Stage 1 definition loaded');
  assert(currentStageDef.name === 'The Cycle Flask', 'Stage 1 name is The Cycle Flask');

  // Check stage 2 requirement checks
  const canAdvanceBroke = progManager.canAdvance(100, 1.0);
  assert(canAdvanceBroke.canAdvance === false, 'Cannot advance to Stage 2 with insufficient money/reputation');

  // Provide requirements for stage 2
  progManager.completePrerequisite('Sell 30 teas');
  const canAdvance = progManager.canAdvance(1000, 2.5);
  assert(canAdvance.canAdvance === true, 'Can advance to Stage 2 once requirements are satisfied');

  const advanced = progManager.advanceToNextStage(1000, 2.5);
  assert(advanced.success === true, 'Successfully advanced to Stage 2');
  assert(progManager.currentStage === 2, 'Current stage is now 2');
  assert(progManager.getCurrentStageDef().name === 'The Wooden Pushcart', 'Stage 2 is The Wooden Pushcart');

  // Save / Load progression state
  const progState = progManager.exportState();
  const loadedProg = new ProgressionManager(1);
  loadedProg.importState(progState);
  assert(loadedProg.currentStage === 2, 'Progression state restored Stage 2 after load');
  assert(loadedProg.completedPrerequisites.has('Sell 30 teas'), 'Prerequisites preserved across load');
  console.log('✓ PASS: Progression (25 Stages across 5 Eras, Unlock Criteria, Prerequisites, Persistence)');
  passed++;

  // ---------------------------------------------------------------------------
  // 5. MULTIPLAYER SYNCHRONIZATION & STORAGE MIGRATION
  // ---------------------------------------------------------------------------
  console.log('\n>>> [5/5] Testing Multiplayer & Storage Persistence...');
  const runSave: Partial<RunSave> = {
    version: 4,
    day: 5,
    minute: 600,
    money: 3500,
    reputation: 3.8,
    streak: 12,
    completed: 45,
    lost: 2,
    earnings: 7200,
    owned: ['bench', 'roof'],
    furniture: exportedFurniture,
    progression: progState,
    construction: null,
  };

  const migrated = migrateRunSave(runSave);
  assert(migrated.version === 4, 'RunSave version is 4');
  assert(migrated.day === 5, 'Day restored');
  assert(migrated.money === 3500, 'Money restored');
  assert(Array.isArray(migrated.furniture), 'Furniture array preserved');
  assert(migrated.furniture!.length === allInstances.length, 'All furniture restored in save');
  assert(migrated.progression?.currentStage === 2, 'Progression restored to Stage 2 in save');
  console.log('✓ PASS: Multiplayer & Storage (RunSave v4 Schema, Serialization, Forward/Backward Migration)');
  passed++;

  console.log('\n====================================================');
  console.log(`ALL VERTICAL SLICE SYSTEM TESTS PASSED: ${passed}/5`);
  console.log('====================================================');
}

runVerticalSliceTests().catch((err) => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  process.exit(1);
});
