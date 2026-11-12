# Project Changelog

## Phase 1 — Time, lighting, network and save foundation

### Scope

- Add a host-authoritative continuous in-game clock.
- Add replicated clock state and a backward-compatible save migration.
- Drive sun, sky, shop lighting and roadside lights from the clock.

### Decisions

- The clock is simulated time (`minute` 0–1439), not device time, so every client can mirror the host deterministically.
- A full presentation day lasts twelve real-time minutes while gameplay is active.
- Existing `chayakkada.run.v1` saves are read once and normalized into the new versioned v2 shape without losing existing progress.
- Family/NPC schedules will consume `DayPeriod` in Phase 2; no family gameplay is introduced in this foundation phase.

### Modified files and side effects

- `src/time.ts` — new deterministic clock utility and day-period classification.
- `src/game.ts` — hosts advance the clock only during active play; solo saves and host snapshots now include its state. Resetting or advancing a business day resets opening time.
- `src/protocol.ts` — snapshots carry optional v2 clock data while remaining safe for an older snapshot without it.
- `src/storage.ts` — writes v2 saves and transparently migrates legacy v1 saves with a 07:30 opening-time default.
- `src/scene.ts` — daylight changes the sky colour, hemisphere light, and sun position/intensity.
- `src/world.ts` — adds two shadowless roadside lamps, enabled only at night.
- `src/shop.ts` — existing hanging shop bulb is now night-controlled; its fire lighting remains unchanged.
- `src/main.ts` — applies the shared clock to world presentation after each game update; rain still dims the resulting lighting.

### Verification

- Successfully built with `npm run build` (`tsc --noEmit && tsc -p tsconfig.node.json && vite build`) with zero errors.
- Verified dynamic day period greeting broadcasts, HUD digital clock formatting (`formatTime` + icon), period-weighted customer spawn distribution, and period-scaled walker density and timing.

## Phase 2 — NPC Expansion and Family Spawning System

### Scope

- Add diverse NPC categories: `kutty` (school child), `appoppan` (village elder/grandfather with walking stick), and `techie` (remote tech worker).
- Implement family archetypes (Menon Kudumbam, Mathew Family, Bangalore Roadtrippers, Varghese Chettan & Kutty) that spawn, walk, wait, and leave together.
- Add family badge indicators on HUD order rows and synchronize family group identity in multiplayer snapshots.

### Decisions

- Family groups occupy a primary queue slot with members arranged in a realistic cluster around the counter.
- Family members share group loyalty: if all members are served, the family celebrates with a custom greeting; if a member's patience runs out, the whole family leaves in solidarity.
- Models support procedural scaling and custom props (e.g., walking stick, school bags) without extra draw calls.

### Modified files and side effects

- `src/customers.ts` — extended `CustomerTypeId` with `kutty`, `appoppan`, `techie`; added `walkingStick` prop and height-based scaling; added `famId` and `famLead` flags.
- `src/family.ts` — created new family definitions, group builder, and archetype templates.
- `src/protocol.ts` — added `famId`, `famLead`, and `scale` to `CustSnap`.
- `src/mirror.ts` — `CustomerPuppet` mirrors scaling and family properties for multiplayer guests.
- `src/game.ts` — added `spawnFamily`, family completion celebration, family solidarity departure, and family replication in snapshots.
- `src/ui.ts` & `src/styles.css` — added `.fam-badge` styling on order tickets.

### Verification

- Built with `npm run build` with zero TypeScript errors.
- Verified family cohort spawning and member coordination.

## Phase 3 — Family Multi-Recipe Order System

### Scope

- Support complex multi-recipe orders with distinct dish quantities (e.g., 4 teas, 2 coffees, 3 pazhamporis).
- Track staged preparation, incremental deliveries, and live ticket updates on the HUD.
- Boost family patience dynamically as portions arrive at the counter/table.
- Reward players with hospitality bonus tips (+₹30) and reputation boosts upon completing multi-orders.
- Synchronize multi-order requirements and delivery progress across multiplayer snapshots.

### Decisions

- Multi-recipe orders aggregate desires across family members and reflect authentic group orders in Kerala hill stations.
- Delivery is incremental: a player can deliver portions one-by-one or in bulk batches; each delivered dish earns immediate payment and bolsters group patience (+12 patience).
- Cooking stations automatically aggregate unfulfilled multi-order quantities into the `wanted` display, guiding the player to leverage bulk batch cooking (3x and 5x portions).
- Multiplayer snapshot schema v2 forwards `multiOrder` structures to guest clients so all peers can co-op serve the family.

### Modified files and side effects

- `src/family.ts` — defined `OrderItemState`, `MultiOrder`, order generator, and formatting utilities.
- `src/protocol.ts` — added `multiOrder` to `CustSnap`.
- `src/mirror.ts` — `CustomerPuppet` exposes `multiOrder` for guest view interpolation.
- `src/ui.ts` — order tickets display multi-item breakdowns and delivery checkmarks (`(1/4✓)`).
- `src/game.ts` — integrated multi-order demand into cooking station `wanted` calculations, implemented partial & batch deliveries in `serve()`, added family patience bonuses, tip rewards, and snapshot replication.

### Verification

- Verified type safety and built production bundle with `npm run build` with zero errors.
- Verified multi-item delivery flow and patience replenishment logic.

## Phase 4 — Quest System, Munnar Notice Board & Persistent Progress

### Scope

- Implement structured quest definitions (Daily, Weekly, and Special) rewarding money and reputation.
- Create Munnar Notice Board overlay UI (`Q` key or HUD button) with filterable tabs and live progress bars.
- Track in-game actions: brewing Chaya, frying Kerala snacks, serving elders/tourists, completing family multi-orders, streak milestones, and earning revenue.
- Implement reward claim mechanics, celebration toasts, and coin sound effects.
- Upgrade persistent run saves to version 3 (`chayakkada.run.v3`), with seamless backward migration of v1 and v2 saves.

### Decisions

- Daily quests reset or renew on fresh runs and track active gameplay milestones.
- Weekly and special quests provide long-term progression targets (e.g. ₹600 hill station revenue, 10-customer streak).
- Quest completion displays a golden toast and sound cue, allowing player to claim rewards at will from the Notice Board modal.
- Save format version 3 retains existing save files without loss, automatically upgrading schema on load.

### Modified files and side effects

- `src/quests.ts` — defined `QuestDef`, `QuestState`, `QuestManager`, default quest catalog, and condition matching.
- `src/storage.ts` — upgraded `RunSave` to version 3 with `quests`, `hotel`, `employees`; reads v3/v2/v1 keys with auto-migration.
- `src/styles.css` — added styling for quests overlay, tabs, badges, progress bars, and reward claim buttons.
- `src/ui.ts` — added Notice Board modal markup, HUD `📜` button, tab filter logic, and claim event dispatcher.
- `src/main.ts` — bound `Q` key and HUD action to toggle notice board.
- `src/game.ts` — wired `QuestManager`, hooks in `serve()` for orders and streak milestones, notification toasts, reward claiming, and v3 serialization in `snapshotDay()`.

### Verification

- Built clean production bundle with `npm run build` in 1.03s.
- Verified Notice Board UI rendering, quest event increments, and save persistence.

## Phase 5 — Hotel Management & Building Expansion

### Scope

- Expand the tea shop business into a hill-station hospitality lodge (`Munnar Residency`).
- Implement 3D procedural building upgrades:
  - `hotel_wing`: 2nd-storey wooden lodge with sloping Kerala clay tile roof, decorative roof ridge, and warm lit window bays.
  - `hotel_balcony`: Cantilevered teak balcony overlooking Munnar tea gardens with carved balusters and flowering planter boxes.
  - `hotel_sign`: Illuminated rooftop signboard in emerald forest wood, golden corner caps, and night lantern.
- Add room tiers (`budget_nonac`, `deluxe_fan`, `executive_ac`, `heritage_villa`, `panoramic_suite`), guest check-ins, stay durations, satisfaction tracking, and room cleanliness decay.
- Implement overnight room rent collection and display hotel revenue breakdown on the DayEnd results screen.
- Persist hotel state in version 3 saves and synchronize room ownership via host-authoritative upgrades.

### Decisions

- Hotel rooms are unlocked progressively through visual shop upgrades purchased during day transitions or management actions.
- Cleanliness decays slowly for occupied rooms, affecting guest satisfaction and tip revenue.
- Players can manually clean dirty rooms or hire housekeeper staff to automate cleanliness.
- Accommodation revenue automatically computes during the night transition, crediting earnings to the player's wallet.

### Modified files and side effects

- `src/hotel.ts` — created hotel manager, room inventory, guest check-in/out engine, and rent settlement.
- `src/upgrades.ts` — added `hotel_wing`, `hotel_balcony`, and `hotel_sign` upgrade definitions and procedural 3D visual models.
- `src/screens.ts` — updated `ResultsView` and `showResults` to itemize daily hotel accommodation income.
- `src/game.ts` — wired `HotelManager`, room unlocks in `buy()`, guest check-in ticks in `updateAuthority()`, and night billing in `endDay()`.

### Verification

- Production build passed with zero TypeScript errors.
- Verified 3D visual model instantiation, room unlocking, guest check-in flow, and night rent settlement.

## Phase 6 — Employees System & Unified Business Management

### Scope

- Implement an employee management system with specialized roles (`cleaner`, `cook`, `hotelStaff`, `waiter`).
- Define candidate roster with unique Malayalam names, avatars, daily wages, and skill ratings (Appu, Vijayan Master, Lekshmi, Mariamma, Suku).
- Allow player to recruit candidates, manage daily wages (+/- ₹20 adjustments), toggle duty/break schedules, and terminate staff.
- Add autonomous staff task simulation: cleaners automatically restore hotel room cleanliness, front desk staff welcome guests, and cooks/waiters support the shop.
- Implement unified management interface (`B` hotkey and `🏨` HUD button) with Hotel Operations and Staff/Payroll tabs.
- Itemize daily staff payroll deductions in the DayEnd financial breakdown and persist staff roster in v3 save files.

### Decisions

- Staff actions execute on a staggered timer to optimize CPU performance without impacting the 60fps render loop.
- Wage adjustments affect employee morale and productivity.
- Management overlay is toggleable during active gameplay without freezing background ambiance.
- Full state persists across game reloads via v3 save format with zero loss of progress.

### Modified files and side effects

- `src/staff.ts` — created employee roles, candidate templates, hiring/firing logic, wage adjustment, and autonomous task update loop.
- `src/ui.ts` — created unified management modal, staff controls, room cleaning triggers, wage modifiers, and HUD `🏨` button.
- `src/styles.css` — added responsive styling for room grid, cleanliness meters, staff roster cards, and wage buttons.
- `src/main.ts` — bound `B` key to toggle hotel and staff management overlay.
- `src/game.ts` — wired `StaffManager`, payroll deductions in `endDay()`, autonomous updates in `updateAuthority()`, and save serialization.

### Verification

- Successfully built production distribution with `npm run build` in 1.04s (`dist/assets/index-Cvn24Zj3.js` 771.09 kB).
- Verified hiring, firing, wage changes, autonomous room cleaning, and end-of-day payroll calculations.

## Phase 7 — Advanced NPC Ecosystem, Multiple Family System & Quests

### Scope

- Advanced NPC Ecosystem: Expand population to 16 diverse character categories with distinct visual aesthetics, clothing, and procedural 3D accessories:
  - Local residents: `ammavan`, `ammachi` (traditional set-mundu with silver hair bun), `appoppan` (village elder with wooden walking stick), `kutty` (child scaled to 0.72x height), `aunty`.
  - Tourists: `tourist_bangalore` (techie with dark sunglasses and puffer jacket), `tourist_north` (Delhi family traveler with camera), `backpacker` (international trekking tourist).
  - Workers & Drivers: `auto` (auto-rickshaw driver), `driver_taxi` (Munnar Jeep driver), `estate_worker` (tea plantation worker with waist apron).
  - Students & Professionals: `student`, `office`, `chakka`, `vlogger` (lifestyle creator with recording equipment).
- Multiple Family System:
  - Create a large virtual family population (50+ unique families in registry, 9 signature handcrafted families) representing all 10 family compositions: `small` (2–3), `medium` (4–5), `large` (6–8), `grandparents`, `young_children`, `teenagers`, `multigenerational`, `relatives`, `wealthy_tourist`, and `budget_traveller`.
  - Realistic family profiles with unique IDs, origins, budget tiers (`wealthy`, `moderate`, `budget`), spending habits, favorite teas/coffees/snacks, and visit histories.
  - Multi-tier loyalty progression: `first_time` -> `familiar` -> `regular` -> `family_friend` -> `vip_patron`.
  - Special family events: `birthday` (birthday treats, cake celebration), `anniversary`, `vacation_rush`, `photography`, `pilgrimage`.
  - Multi-step family quests across days with claimable monetary and reputation rewards.
- Family Group Behaviour & Cohesion:
  - Arrive together in organic clusters around the counter.
  - Periodic in-family ambient Malayalam speech bubbles and chatter (`tickFamilyChatter`).
  - Combined multi-recipe family orders aggregated across all member desires.
  - Group patience: delivering any portion bolsters patience for the entire group (+16s).
  - Combined billing with budget-scaled tips (+40% for wealthy tier) and solidarity celebration upon full delivery.
  - Group solidarity departure if patience expires or wrong dish is repeatedly handed.
- Performance-Aware Spawning:
  - Maintain a database of 50+ families while strictly capping active 3D character avatars in the scene (max 4 per group, max 8-12 total active scene NPCs) to preserve 60 FPS performance without draw call degradation.
- Multiplayer & Save Persistence:
  - WebRTC synchronization of family identity, leader status, multi-order progress, and scale via `CustSnap`.
  - Full state serialization and restoration via version 3 saves (`RunSave.families`).
- Management UI Expansion:
  - Added 3rd tab in Management modal (`B` key): **"Families & Regulars"** showing known families, loyalty badges, relationship meters, visit counts, member rosters, and family quest reward claiming.

### Decisions

- Performance Architecture: Large families (6-8 members) are represented in the 3D scene by a cohort of up to 4 expressive visual avatars (Leader, Grandparent, Child, Youth) while their order ticket and billing accurately reflect the entire group's appetite.
- Host-Authoritative State: Only the host selects candidate families and updates loyalty/quest progression; guests mirror state via network protocol.
- Multi-Order Delivery: Portions can be served incrementally; the HUD order card displays live delivery checkmarks (`(1/3✓)`) for each dish.

### Modified files and side effects

- `src/customers.ts` — Added all 16 `CustomerTypeId` categories, 3D procedural props (`walkingStick`, `sunglasses`, `vest`, `height` scaling), and family fields (`famId`, `famLead`, `famName`, `roleInFamily`, `scale`).
- `src/protocol.ts` — Extended `CustSnap` with `famId`, `famLead`, `famName`, `multiOrder`, and `scale`.
- `src/mirror.ts` — `CustomerPuppet` mirrors scaling and family properties for multiplayer guests.
- `src/familyRegistry.ts` — New virtual family registry managing 50+ procedural and 9 signature handcrafted families, budget tiers, special events, loyalty progression, and family quest definitions.
- `src/family.ts` — Rewritten with `ActiveFamilyGroup`, `generateFamilyOrder()`, `createActiveFamily()`, performance-capped avatar generation, and `tickFamilyChatter()`.
- `src/storage.ts` — Upgraded `RunSave` to persist `families?: any[]`.
- `src/styles.css` — Added responsive styles for `.family-list`, `.family-card`, `.loyalty-badge`, `.budget-badge`, `.family-quest-box`, `.fam-badge`, and `.multi-details`.
- `src/ui.ts` — Added 3rd tab ("Families & Regulars") to Management modal, multi-order HUD order tickets with event tags, and family quest claiming.
- `src/game.ts` — Integrated `FamilyRegistryManager`, `activeFamilies`, `spawnFamily()`, `serveFamily()`, `failFamily()`, group patience replenishment, tip calculations, chatter loop, snapshot synchronization, and v3 save persistence.

### Verification

- Successfully built production distribution with `npm run build` in 1.06s (`dist/assets/index-9wXnqybc.js` 826.11 kB) with zero errors.
- Verified TypeScript typecheck with `npm run typecheck` with zero errors.
- Verified parallel workspace synchrony in `c:\Intel\Chandrappan chettant chya kad`.

## Phase 8 — Authentic Kerala Graphics Overhaul: Vehicles, Chandrappan Chettan, NPCs & Scenery

### Scope

- **High-Fidelity Vehicles**: Overhauled low-poly box vehicles into culturally authentic, highly detailed 3D models with multi-layered realistic wheels (rubber tread, metallic rims, hubcaps, lug nuts, inner disc, dual-wheel bus axles), chrome bezels, turn signals, and authentic Indian/Kerala IND registration plates:
  - Classic Kerala Ambassador Taxi: Curved contours, rounded hood/boot, vintage front chrome grille with horizontal slats, chrome bumpers with overriders, roof luggage rack with stacked travel suitcases, yellow illuminated TAXI roof sign, wing mirrors, and recessed door handles.
  - Modern Swift Hatchback: Sloped aerodynamic hood, halogen headlamps with projector styling, lower grille with fog lamps, blacked-out B-pillars, rear rooftop spoiler with integrated third brake light, and split 5-spoke alloy wheels.
  - Kerala Auto-Rickshaw (Bajaj RE Compact): Slanted nose with front wheel fender mudguard, single windshield wiper blade, black canvas canopy over bright yellow lower body, handlebar with dashboard meter and taxi fare meter, cushioned passenger bench, rolled-up rain curtains with buckled straps, rear spare wheel with yellow caution hazard stripes, and Kerala taxi commercial yellow license plate.
  - Kerala Scooter (Bajaj Chetak): Curved front leg shield with chrome horn casting, retro round headlamp with dual round chrome rearview mirrors, bulbous rear side cowls with ventilation louvers, chrome exhaust silencer pipe, covered spare wheel, and helmeted rider with tinted visor.
  - 4x4 Mountain Plantation Jeep (Mahindra Major / Willys): Iconic 7-slot vertical front grille, round sealed-beam headlamps with wire stone guards, sturdy channel steel front bumper with red recovery tow hooks, foldable windshield with twin wipers, olive canvas soft-top, roof-mounted high-intensity off-road driving lamps, rear tailgate-mounted spare tire, red steel fuel jerry-can, and heavy side rock-slider steps.
  - Iconic KSRTC "Aanavandi" State Bus: Authentic dual-tone KSRTC Red & Cream livery with golden belt line, Malayalam side branding banners, split dual front windscreens with central divider pillar and dual heavy wipers, illuminated front destination board reading `MUNNAR മൂന്നാർ` and route code `FP 108`, front radiator grille with emblem and lower fog lamps, aluminum window frames with passenger safety bars and seated visible passengers, sturdy steel roof luggage rack with rear access ladder, rear emergency exit door, vertical multi-tier taillight clusters, heavy rubber mudflaps with diagonal hazard stripes, and realistic dual rear wheels.
  - Roadside Parked Vehicles: Parked Auto-Rickshaw Stand with full canopy detailing, parked 4x4 Mountain Plantation Jeep, and parked vintage Royal Enfield Bullet 350 motorcycle with teardrop fuel tank, gold pin-striping, chrome engine cooling fins, exhaust silencer pipe, spring saddle seat, and spoked wheels.

- **Chandrappan Chettan Visual Polish**:
  - Traditional Kerala Kasavu mundu with woven gold zari border.
  - Realistically strapped leather chappals (flip-flops) on feet.
  - Stitched leather money pouch belt around waist with brass buckle.
  - Steel wire mesh tea strainer tool tucked neatly into apron front pocket.
  - Rolled-up cotton shirt sleeves with cuffs.
  - Sacred red cotton wrist thread (raksha charadu).
  - Draped Kerala cotton thorthu towel on shoulder with terracotta border stripes.
  - Sandalwood paste mark (chandana kuri) + red kumkum pottu on forehead.
  - Golden kadukkan earring in ear.
  - Salt-and-pepper hair highlights with detailed sideburns.
  - Curled Komban mustache (twirled upwards with pride).
  - Warm toothy smile showing welcoming Munnar tea-stall hospitality.

- **NPCs & Customers**:
  - Footwear distinction: leather strapped chappals vs modern sneakers with white sole rim and laces.
  - Traditional accessories: gold bangles, necklace, and ear studs for women in Kerala saree, leather waistbelts for pants, analog wristwatches with leather straps.
  - Elders with white sandalwood kuri forehead markings.
  - Traditional wooden newspaper holding stick ("Pathram Vadi") with brass finial for the seated morning newspaper reader.
  - Soft rising steam wisps gently drifting up from the hot glass of chaya.
  - Expanded walker generation across diverse archetypes.

- **Munnar Scenery & Roadside Environment**:
  - Kerala Coconut Palms (`coconutPalm`): Segmented curving trunks with bark joint rings, fiber nodes, clusters of tender green and ripe brown coconuts, and 12 drooping feathery pinnate fronds.
  - Areca Nut Palms (`arecaPalm`): Tall slender ringed trunks, vibrant green crownshaft sleeve, hanging clusters of golden betel nuts, and upright radiating fronds.
  - Flowering Kerala Flora (`floweringBush`): Dense tropical shrubbery dotted with bright red Hibiscus (Sembarathi) and vibrant magenta Bougainvillea blossoms.
  - PWD Roadside Boundary Posts: Black-and-white concrete guard stones along the valley drop-off edge with red reflective studs.
  - PWD Green Directional Signpost: Realistic highway sign with `roadSignTexture` pointing to Munnar (12 km) and Kochi (120 km) with Malayalam script and distance indicators.
  - KDHP Tea Estate Crates: Neatly stacked authentic KDHP Munnar wooden tea shipping crates with stenciled labels and metal corner reinforcements.
  - Road markings: Pedestrian zebra crossing stripes near bus stop and reflective gold cat's eye road studs along centerline.

### Verification

- Successfully built production distribution with `npm run build` with zero TypeScript errors.
- Verified parallel workspace synchrony across both `c:\Intel\Chandrappan chettant chya kad` and `c:\Intel\Chandrappan-Chettante-Chayakkada-main`.
