/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DungeonFloor, DungeonRoom, GameItem, Monster, RoomDoor, RoomType } from '../types/game';
import { ITEMS_DATABASE } from '../data/items';
import { MONSTERS_DATABASE } from '../data/monsters';
import { SHRINE_EVENTS, TRAPS_DATABASE } from '../data/events';
import { rollDie, rollDice } from './dice';

// Floor themes and names
export const FLOOR_METADATA = [
  {
    floorNumber: 1,
    name: 'Upper Catacombs & Mossy Crypts',
    theme: 'Ancient damp stone corridors overgrown with luminescent fungi and echoing with rat squeaks.',
    targetRooms: 8,
    minibossId: 'hobgoblin_chieftain',
  },
  {
    floorNumber: 2,
    name: 'The Sunken Mines & Forgotten Vaults',
    theme: 'Deep subterranean fissures, abandoned mining carts, dark chasms, and lingering wraiths.',
    targetRooms: 9,
    minibossId: 'necromancer_lord',
  },
  {
    floorNumber: 3,
    name: 'Infernal Sanctum & Dragon\'s Lair',
    theme: 'Molten rivers, obsidian pillars, ash-filled air, and the volcanic throne of the Crimson Wyrm.',
    targetRooms: 9,
    minibossId: 'crimson_dragon',
  },
];

/**
 * Weighted room selection with anti-streak mechanics
 */
export function chooseNextRoomType(
  floorNumber: number,
  roomIndex: number,
  totalRoomsInFloor: number,
  recentRoomTypes: RoomType[],
  heroHpPercent: number
): RoomType {
  // If last room in floor, it's always Boss / Stairs
  if (roomIndex >= totalRoomsInFloor - 1) {
    return floorNumber === 3 ? 'BOSS_ROOM' : 'STAIRS';
  }

  // First room of floor 1 is safe entry
  if (floorNumber === 1 && roomIndex === 0) {
    return 'CAMPFIRE';
  }

  // Base weights
  const weights: Record<RoomType, number> = {
    MONSTER: 40,
    TREASURE: 18,
    MERCHANT: 14,
    TRAP: 12,
    SHRINE: 10,
    CAMPFIRE: 6,
    SECRET: 8,
    STAIRS: 0,
    BOSS_ROOM: 0,
  };

  // Anti-streak: If last 2 rooms were monsters, drastically lower monster chance
  const monsterStreak = recentRoomTypes.slice(-2).filter((t) => t === 'MONSTER').length;
  if (monsterStreak >= 2) {
    weights.MONSTER = 5;
    weights.CAMPFIRE += 15;
    weights.TREASURE += 15;
    weights.MERCHANT += 20;
  }

  // Anti-streak: If no merchant seen in last 4 rooms, boost merchant chance
  const hasMerchantRecently = recentRoomTypes.slice(-4).includes('MERCHANT');
  if (!hasMerchantRecently && roomIndex >= 3) {
    weights.MERCHANT += 30;
  }

  // Anti-streak: If treasure just occurred, reduce treasure
  if (recentRoomTypes[recentRoomTypes.length - 1] === 'TREASURE') {
    weights.TREASURE = 5;
  }

  // Player health adaptive pacing: boost safe spots when injured
  if (heroHpPercent < 0.4) {
    weights.CAMPFIRE += 20;
    weights.SHRINE += 15;
    weights.MERCHANT += 15;
    weights.MONSTER = Math.max(10, weights.MONSTER - 20);
  }

  // Calculate weighted random
  const validTypes = Object.keys(weights) as RoomType[];
  const totalWeight = validTypes.reduce((sum, key) => sum + weights[key], 0);

  let rand = Math.random() * totalWeight;
  for (const type of validTypes) {
    if (rand < weights[type]) {
      return type;
    }
    rand -= weights[type];
  }

  return 'MONSTER';
}

/**
 * Pick monster for floor depth
 */
export function getMonsterForFloor(floorNumber: number, tier: 'low' | 'mid' | 'boss' = 'mid'): Monster {
  if (tier === 'boss') {
    if (floorNumber === 1) return JSON.parse(JSON.stringify(MONSTERS_DATABASE['hobgoblin_chieftain']));
    if (floorNumber === 2) return JSON.parse(JSON.stringify(MONSTERS_DATABASE['necromancer_lord']));
    return JSON.parse(JSON.stringify(MONSTERS_DATABASE['crimson_dragon']));
  }

  let pool: string[] = [];
  if (floorNumber === 1) {
    pool =
      tier === 'low'
        ? ['f1_sewer_rat', 'f1_cave_bat', 'f1_crypt_beetle', 'f1_slime_glob']
        : ['f1_goblin_skirmisher', 'f1_skeleton_sentinel', 'f1_crypt_weaver'];
  } else if (floorNumber === 2) {
    pool =
      tier === 'low'
        ? ['f2_mine_crawler', 'f2_cave_leech', 'f2_ghoul_scavenger', 'f2_shadow_skulk']
        : ['f2_orc_berserker', 'f2_cave_troll', 'f2_shadow_wraith'];
  } else {
    pool =
      tier === 'low'
        ? ['f3_magma_crawler', 'f3_ash_imp', 'f3_charred_skeleton', 'f3_hellhound_pup']
        : ['f3_fire_drake', 'f3_death_knight', 'f3_abyssal_golem'];
  }

  const selectedId = pool[Math.floor(Math.random() * pool.length)];
  const template = MONSTERS_DATABASE[selectedId] || MONSTERS_DATABASE['f1_sewer_rat'];
  return JSON.parse(JSON.stringify(template));
}

/**
 * Generate random loot items for chests & rewards
 */
export function generateLootForFloor(floorNumber: number, isMajorChest: boolean = false): { gold: number; items: GameItem[] } {
  const gold = floorNumber * 12 + rollDie(16) + (isMajorChest ? 35 : 0);
  const items: GameItem[] = [];

  const commonPool = ['minor_healing_potion', 'dungeon_ration', 'dungeon_torch', 'iron_lockpick', 'mana_draught'];
  const uncommonPool = ['iron_shortsword', 'steel_broadsword', 'wooden_buckler', 'iron_kite_shield', 'leather_tunic', 'hunting_bow', 'scroll_of_fireball', 'scroll_of_teleport', 'potion_of_phasing'];
  const rarePool = ['plate_armor_of_the_champion', 'crown_of_clarity', 'boots_of_haste', 'ring_of_vitality', 'ring_of_fortune', 'amulet_of_power', 'shadow_stiletto', 'gem_ruby', 'dice_of_fate', 'elixir_of_heroism', 'dwarven_sledgehammer'];
  const epicPool = ['dragonslayer_greatsword', 'aegis_of_light', 'amulet_of_the_archon', 'gem_diamond', 'archmage_scepter', 'dragonscale_armor'];

  // Always drop 1 potion/supply
  const potId = commonPool[Math.floor(Math.random() * commonPool.length)];
  if (ITEMS_DATABASE[potId]) items.push(ITEMS_DATABASE[potId]);

  // Roll for equipment/relic
  const roll = rollDie(100);
  let gearId = '';
  if (floorNumber === 1) {
    if (roll > 55) gearId = uncommonPool[Math.floor(Math.random() * uncommonPool.length)];
    else if (isMajorChest && roll > 35) gearId = rarePool[Math.floor(Math.random() * rarePool.length)];
  } else if (floorNumber === 2) {
    if (roll > 65) gearId = rarePool[Math.floor(Math.random() * rarePool.length)];
    else if (roll > 30) gearId = uncommonPool[Math.floor(Math.random() * uncommonPool.length)];
  } else {
    if (roll > 60) gearId = epicPool[Math.floor(Math.random() * epicPool.length)];
    else if (roll > 25) gearId = rarePool[Math.floor(Math.random() * rarePool.length)];
  }

  if (gearId && ITEMS_DATABASE[gearId]) {
    items.push(ITEMS_DATABASE[gearId]);
  }

  return { gold, items };
}

/**
 * Creates merchant stock tailored to current floor depth
 */
export function generateMerchantStock(floorNumber: number): GameItem[] {
  const stockIds: string[] = [
    'minor_healing_potion',
    'greater_healing_potion',
    'mana_draught',
    'dungeon_ration',
    'iron_lockpick',
    'dungeon_torch',
    'miner_pickaxe',
    'scroll_of_clairvoyance',
    'dice_of_fate',
  ];

  if (floorNumber === 1) {
    stockIds.push('iron_shortsword', 'iron_kite_shield', 'leather_tunic', 'brass_spyglass', 'scroll_of_fireball');
  } else if (floorNumber === 2) {
    stockIds.push('steel_broadsword', 'chainmail_hauberk', 'dwarven_sledgehammer', 'potion_of_phasing', 'ring_of_vitality', 'crown_of_clarity', 'scroll_of_teleport');
  } else {
    stockIds.push('plate_armor_of_the_champion', 'amulet_of_power', 'dwarven_sledgehammer', 'potion_of_phasing', 'boots_of_haste', 'elixir_of_heroism');
  }

  return stockIds.map((id) => ITEMS_DATABASE[id]).filter(Boolean);
}

/**
 * Helper to check if two grid coordinates are adjacent
 */
export function areCoordinatesAdjacent(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

/**
 * Get direction from posA to adjacent posB
 */
export function getDirectionBetween(a: { x: number; y: number }, b: { x: number; y: number }): 'north' | 'east' | 'south' | 'west' {
  if (b.y < a.y) return 'north';
  if (b.x > a.x) return 'east';
  if (b.y > a.y) return 'south';
  return 'west';
}

/**
 * Check if an unbroken wall exists between two adjacent cells
 */
export function hasWallBetween(walls: DungeonFloor['walls'] | undefined, a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return (walls || []).some(
    (w) =>
      !w.isBroken &&
      ((w.roomA.x === a.x && w.roomA.y === a.y && w.roomB.x === b.x && w.roomB.y === b.y) ||
        (w.roomA.x === b.x && w.roomA.y === b.y && w.roomB.x === a.x && w.roomB.y === a.y))
  );
}

type PrescriptiveRoomCard =
  | { kind: 'TREASURE' }
  | { kind: 'MERCHANT' }
  | { kind: 'SHRINE' }
  | { kind: 'SECRET' }
  | { kind: 'TRAP' }
  | { kind: 'LOW_MONSTER' }
  | { kind: 'MID_MONSTER' };

/**
 * Procedurally generates a 4x4 Burgle Bros-style dungeon floor grid (16 tiles) with walls & boss chamber
 * Prescriptive Composition:
 * - 1 Entrance (Dungeon Hearth) at (0,0) [1,1]
 * - 1 Boss / Stair room placed randomly in candidates
 * - 7 Monsters (4 Low-Strength / Grinding monsters + 3 Mid-Strength monsters)
 * - 3 Traps (Requiring Skill/DEX/INT/STR/LCK checks to deactivate)
 * - 1 Vault (Treasure chest)
 * - 1 Shop (Merchant outpost)
 * - 1 Shrine (Divine blessing altar)
 * - 1 Secrets room (Hidden wall compartment)
 * Total: 1 + 1 + 7 + 3 + 1 + 1 + 1 + 1 = 16 tiles!
 */
export function generateDungeonFloor(floorNumber: number): DungeonFloor {
  const meta = FLOOR_METADATA.find((m) => m.floorNumber === floorNumber) || FLOOR_METADATA[0];
  const gridWidth = 4;
  const gridHeight = 4;
  const totalTiles = gridWidth * gridHeight; // 16

  // 1. Entrance position: always (0, 0) in 0-indexed [1, 1 in 1-based]
  const startPos = { x: 0, y: 0 };

  // 2. Boss candidate positions (1-indexed: 4,1  4,2  4,3  4,4  3,3  3,4  2,4  1,4)
  // Converted to 0-indexed (x = col - 1, y = row - 1)
  const bossCandidates: { x: number; y: number }[] = [
    { x: 3, y: 0 }, // 4,1
    { x: 3, y: 1 }, // 4,2
    { x: 3, y: 2 }, // 4,3
    { x: 3, y: 3 }, // 4,4
    { x: 2, y: 2 }, // 3,3
    { x: 2, y: 3 }, // 3,4
    { x: 1, y: 3 }, // 2,4
    { x: 0, y: 3 }, // 1,4
  ];

  // Pick one boss candidate at random
  const bossPos = bossCandidates[Math.floor(Math.random() * bossCandidates.length)];

  // 3. Collect the remaining 14 positions (excluding startPos and bossPos)
  const allPositions: { x: number; y: number }[] = [];
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      allPositions.push({ x, y });
    }
  }

  const remainingPositions = allPositions.filter(
    (p) => !(p.x === startPos.x && p.y === startPos.y) && !(p.x === bossPos.x && p.y === bossPos.y)
  );

  // Shuffle remaining 14 positions
  for (let i = remainingPositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remainingPositions[i], remainingPositions[j]] = [remainingPositions[j], remainingPositions[i]];
  }

  // 4. Build the exact 14 prescriptive room cards deck:
  // - 1 Vault (Treasure chest)
  // - 1 Shop (Merchant)
  // - 1 Shrine (Divine blessing altar)
  // - 1 Secret room (Hidden wall compartment)
  // - 3 Traps
  // - 4 Low-strength grinding monsters (boosts XP, no loot)
  // - 3 Mid-strength monsters (impactful threat + loot)
  const roomDeck: PrescriptiveRoomCard[] = [
    { kind: 'TREASURE' },
    { kind: 'MERCHANT' },
    { kind: 'SHRINE' },
    { kind: 'SECRET' },
    { kind: 'TRAP' },
    { kind: 'TRAP' },
    { kind: 'TRAP' },
    { kind: 'LOW_MONSTER' },
    { kind: 'LOW_MONSTER' },
    { kind: 'LOW_MONSTER' },
    { kind: 'LOW_MONSTER' },
    { kind: 'MID_MONSTER' },
    { kind: 'MID_MONSTER' },
    { kind: 'MID_MONSTER' },
  ];

  // Shuffle the room card deck
  for (let i = roomDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roomDeck[i], roomDeck[j]] = [roomDeck[j], roomDeck[i]];
  }

  // Assign card deck to remaining positions map
  const positionCardMap = new Map<string, PrescriptiveRoomCard>();
  remainingPositions.forEach((pos, idx) => {
    positionCardMap.set(`${pos.x},${pos.y}`, roomDeck[idx]);
  });

  // 5. Generate Maze Walls (7 to 8 interior walls) while ensuring full 16-tile connectivity
  interface PotentialWall {
    id: string;
    type: 'vertical' | 'horizontal';
    roomA: { x: number; y: number };
    roomB: { x: number; y: number };
  }

  const potentialWalls: PotentialWall[] = [];

  // Vertical walls between (x, y) and (x+1, y)
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth - 1; x++) {
      potentialWalls.push({
        id: `wall_v_${x}_${y}`,
        type: 'vertical',
        roomA: { x, y },
        roomB: { x: x + 1, y },
      });
    }
  }

  // Horizontal walls between (x, y) and (x, y+1)
  for (let y = 0; y < gridHeight - 1; y++) {
    for (let x = 0; x < gridWidth; x++) {
      potentialWalls.push({
        id: `wall_h_${x}_${y}`,
        type: 'horizontal',
        roomA: { x, y },
        roomB: { x, y: y + 1 },
      });
    }
  }

  // Shuffle potential walls
  for (let i = potentialWalls.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [potentialWalls[i], potentialWalls[j]] = [potentialWalls[j], potentialWalls[i]];
  }

  // Check if graph is fully connected given a set of walls
  const isGraphConnected = (testWalls: PotentialWall[]): boolean => {
    const visited = new Set<string>();
    const queue: { x: number; y: number }[] = [{ x: 0, y: 0 }];
    visited.add('0,0');

    const deltas = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const d of deltas) {
        const next = { x: curr.x + d.x, y: curr.y + d.y };
        if (next.x >= 0 && next.x < gridWidth && next.y >= 0 && next.y < gridHeight) {
          const key = `${next.x},${next.y}`;
          if (!visited.has(key)) {
            const blocked = testWalls.some(
              (w) =>
                (w.roomA.x === curr.x && w.roomA.y === curr.y && w.roomB.x === next.x && w.roomB.y === next.y) ||
                (w.roomA.x === next.x && w.roomA.y === next.y && w.roomB.x === curr.x && w.roomB.y === curr.y)
            );
            if (!blocked) {
              visited.add(key);
              queue.push(next);
            }
          }
        }
      }
    }

    return visited.size === totalTiles;
  };

  const selectedWalls: PotentialWall[] = [];
  const targetWallCount = 8; // Burgle Bros standard 8 walls

  for (const pw of potentialWalls) {
    if (selectedWalls.length >= targetWallCount) break;
    const testWalls = [...selectedWalls, pw];
    if (isGraphConnected(testWalls)) {
      selectedWalls.push(pw);
    }
  }

  const dungeonWalls = selectedWalls.map((w) => ({
    ...w,
    isBroken: false,
  }));

  // 6. Populate the 16 DungeonRoom objects
  const rooms: Record<string, DungeonRoom> = {};
  const startRoomId = `floor_${floorNumber}_r${startPos.x}_${startPos.y}`;
  const stairsRoomId = `floor_${floorNumber}_r${bossPos.x}_${bossPos.y}`;

  // Pool of traps for trap rooms
  const shuffledTraps = [...TRAPS_DATABASE].sort(() => Math.random() - 0.5);
  let trapIndex = 0;

  for (const pos of allPositions) {
    const rId = `floor_${floorNumber}_r${pos.x}_${pos.y}`;
    const isStart = pos.x === startPos.x && pos.y === startPos.y;
    const isBoss = pos.x === bossPos.x && pos.y === bossPos.y;

    const roomNumber = pos.y * gridWidth + pos.x + 1;
    let type: RoomType = 'CAMPFIRE';
    let title = `Chamber ${pos.x + 1},${pos.y + 1}`;
    let description = 'Damp stone walls dripping with condensation.';
    let flavorText = 'The smell of ancient dust and iron hangs in the air.';

    let monster: Monster | undefined;
    let chest: DungeonRoom['chest'];
    let trap: DungeonRoom['trap'];
    let shrine: DungeonRoom['shrine'];
    let secret: DungeonRoom['secret'];

    if (isStart) {
      type = 'CAMPFIRE';
      title = 'Dungeon Hearth (Entrance)';
      description = 'A circle of warm embers and shelter at the entrance staircase.';
      flavorText = 'Safe haven to prepare your weapons, study spells, and rest before plunging deeper.';
    } else if (isBoss) {
      type = 'BOSS_ROOM';
      monster = getMonsterForFloor(floorNumber, 'boss');
      if (floorNumber === 3) {
        title = `The Crimson Dragon's Sanctum`;
        description = `The air scorches your lungs. Ahead lies an ocean of gold coins, the spiral descent gate, and atop it rests the colossal Ancient Crimson Wyrm!`;
        flavorText = 'Defeat the dragon to conquer the dungeon and claim ultimate victory!';
      } else {
        title = `Descent Gate & ${monster.name}`;
        description = `Guarding the spiral stairs to the deeper floor stands ${monster.name}. Defeat the boss to unlock the stairs!`;
        flavorText = monster.description;
      }
    } else {
      const card = positionCardMap.get(`${pos.x},${pos.y}`) || { kind: 'LOW_MONSTER' };

      if (card.kind === 'TREASURE') {
        type = 'TREASURE';
        title = 'Vault of Forgotten Relics';
        description = 'An ornate iron-bound chest sits upon a stone dais in the center of the room.';
        flavorText = 'Intricate carvings on the lid depict glorious adventurers and gold riches.';
        const loot = generateLootForFloor(floorNumber, true);
        chest = {
          isLocked: Math.random() > 0.4,
          lockDifficulty: 11 + floorNumber,
          isTrapped: Math.random() > 0.5,
          trapDifficulty: 12 + floorNumber,
          isOpened: false,
          gold: loot.gold,
          items: loot.items,
        };
      } else if (card.kind === 'MERCHANT') {
        type = 'MERCHANT';
        title = "Olaf's Wandering Trading Post";
        description = 'A colorful wooden pack cart illuminated by brass lanterns sits peacefully in the alcove.';
        flavorText = '“Greetings, adventurer! Trade your gathered gold for potions, keys, weapons, and iron rations.”';
      } else if (card.kind === 'SHRINE') {
        type = 'SHRINE';
        const shrineDef = SHRINE_EVENTS[(floorNumber - 1) % SHRINE_EVENTS.length] || SHRINE_EVENTS[0];
        title = shrineDef.name;
        description = shrineDef.description;
        flavorText = `A divine altar dedicated to ${shrineDef.godName}. Offering a prayer restores health and mana.`;
        shrine = {
          id: shrineDef.id,
          name: shrineDef.name,
          description: shrineDef.description,
          god: shrineDef.godName,
          used: false,
        };
      } else if (card.kind === 'SECRET') {
        type = 'SECRET';
        title = 'Chamber of Whispering Runes';
        description = 'Ancient stone masonry with unusual seams and hollow-sounding flagstones.';
        flavorText = 'Searching the masonry (INT/LCK test) might reveal a hidden cache of ancient gold and relics.';
        secret = {
          discovered: false,
          difficulty: 10 + floorNumber * 2,
          rewardDescription: 'Hidden Cache of Ancient Relics',
          rewardClaimed: false,
        };
      } else if (card.kind === 'TRAP') {
        type = 'TRAP';
        const trapDef = shuffledTraps[trapIndex++ % shuffledTraps.length];
        title = trapDef.name;
        description = trapDef.description;
        flavorText = trapDef.disarmHint;
        trap = {
          id: trapDef.id,
          name: trapDef.name,
          description: trapDef.description,
          difficulty: trapDef.difficulty,
          damageDice: trapDef.damageFormula,
          disarmed: false,
          triggered: false,
        };
      } else if (card.kind === 'LOW_MONSTER') {
        type = 'MONSTER';
        monster = getMonsterForFloor(floorNumber, 'low');
        title = `${monster.name}'s Burrow`;
        description = `You step into a shadowy alcove and spot a low-threat creature scuttling in the dust. Good for gaining combat experience!`;
        flavorText = `${monster.description} (Grinding monster • Grants ${monster.xpReward} XP upon defeat, yields no loot).`;
      } else if (card.kind === 'MID_MONSTER') {
        type = 'MONSTER';
        monster = getMonsterForFloor(floorNumber, 'mid');
        title = `${monster.name}'s Lair`;
        description = `A powerful and threatening dungeon predator stands ready with drawn weapons! High danger with valuable loot drops.`;
        flavorText = `${monster.description} (Formidable threat • Grants ${monster.xpReward} XP + Gold & Loot drops).`;
      }
    }

    // Doors to adjacent rooms (only where no unbroken wall exists)
    const deltas = [
      { x: 0, y: -1, dir: 'north' as const },
      { x: 1, y: 0, dir: 'east' as const },
      { x: 0, y: 1, dir: 'south' as const },
      { x: -1, y: 0, dir: 'west' as const },
    ];

    const doors: RoomDoor[] = [];
    for (const d of deltas) {
      const nx = pos.x + d.x;
      const ny = pos.y + d.y;
      if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
        const neighborId = `floor_${floorNumber}_r${nx}_${ny}`;
        const hasWall = dungeonWalls.some(
          (w) =>
            !w.isBroken &&
            ((w.roomA.x === pos.x && w.roomA.y === pos.y && w.roomB.x === nx && w.roomB.y === ny) ||
              (w.roomA.x === nx && w.roomA.y === ny && w.roomB.x === pos.x && w.roomB.y === pos.y))
        );

        if (!hasWall) {
          doors.push({
            targetRoomId: neighborId,
            direction: d.dir,
          });
        }
      }
    }

    rooms[rId] = {
      id: rId,
      floor: floorNumber,
      roomNumber,
      gridX: pos.x,
      gridY: pos.y,
      type,
      title,
      description,
      flavorText,
      isRevealed: isStart, // Starting tile is revealed immediately
      isExplored: isStart,
      isCleared: isStart,
      isBossRoom: isBoss,
      hasStairs: isBoss,
      isStairsUnlocked: false,
      doors,
      monster,
      chest,
      trap,
      shrine,
      secret,
    };
  }

  return {
    floorNumber,
    floorName: meta.name,
    theme: meta.theme,
    gridWidth: 4,
    gridHeight: 4,
    rooms,
    walls: dungeonWalls,
    startRoomId,
    stairsRoomId,
    currentRoomId: startRoomId,
    bossDefeated: false,
  };
}
