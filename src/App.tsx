/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Volume2,
  VolumeX,
  BookOpen,
  Trophy,
  RotateCcw,
  Sparkles,
  Flame,
  Package,
  Dices,
} from 'lucide-react';
import {
  CombatState,
  DungeonFloor,
  DungeonRoom,
  GameItem,
  GameState,
  HeroCharacter,
  Monster,
  StatType,
} from './types/game';
import { CharacterCreation } from './components/CharacterCreation';
import { CharacterSheet } from './components/CharacterSheet';
import { DungeonMap } from './components/DungeonMap';
import { RoomView } from './components/RoomView';
import { CombatView } from './components/CombatView';
import { MerchantModal } from './components/MerchantModal';
import { InventoryModal } from './components/InventoryModal';
import { LevelUpModal } from './components/LevelUpModal';
import { GameOverModal } from './components/GameOverModal';
import { RulebookModal } from './components/RulebookModal';
import { HallOfFameModal } from './components/HallOfFameModal';
import { JournalModal } from './components/JournalModal';
import { TableInspectorModal } from './components/TableInspectorModal';
import { generateDungeonFloor } from './utils/generator';
import { saveGameState, loadGameState, clearGameState } from './utils/storage';
import { sounds } from './utils/audio';
import { rollDice, getStatModifier } from './utils/dice';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = loadGameState();
    if (saved && saved.hero && saved.floors) {
      return saved;
    }
    return {
      phase: 'CHARACTER_CREATION',
      hero: null as unknown as HeroCharacter,
      currentFloor: 1,
      maxFloors: 3,
      floors: {},
      currentRoomId: '',
      combat: null,
      historyLog: ['Game Initialized.'],
      highScores: [],
      soundEnabled: true,
    };
  });

  // Modal Dialog UI state
  const [showInventory, setShowInventory] = useState(false);
  const [showMerchant, setShowMerchant] = useState(false);
  const [showRulebook, setShowRulebook] = useState(false);
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [showTableInspector, setShowTableInspector] = useState(false);
  const [pendingLevelUp, setPendingLevelUp] = useState(false);

  // Track previous room for fleeing
  const [previousRoomId, setPreviousRoomId] = useState<string>('');

  // Persist state to localStorage on update
  useEffect(() => {
    if (gameState.phase !== 'CHARACTER_CREATION' && gameState.hero) {
      saveGameState(gameState);
    }
  }, [gameState]);

  // Sync sound setting
  useEffect(() => {
    sounds.setEnabled(gameState.soundEnabled);
  }, [gameState.soundEnabled]);

  // Check for Level-Up condition
  useEffect(() => {
    if (!gameState.hero) return;
    if (gameState.hero.xp >= gameState.hero.xpToNextLevel && !pendingLevelUp) {
      sounds.playLevelUp();
      setPendingLevelUp(true);
    }
  }, [gameState.hero?.xp, gameState.hero?.xpToNextLevel, pendingLevelUp]);

  // Check for Hero Death
  useEffect(() => {
    if (!gameState.hero) return;
    if (gameState.hero.currentHp <= 0 && gameState.phase !== 'GAME_OVER') {
      sounds.playDeath();
      setGameState((prev) => ({
        ...prev,
        phase: 'GAME_OVER',
        combat: null,
      }));
    }
  }, [gameState.hero?.currentHp, gameState.phase]);

  // Start new run from Character Creation
  const handleCharacterCreated = (hero: HeroCharacter) => {
    const floor1 = generateDungeonFloor(1);
    const startRoomId = floor1.startRoomId;

    setGameState({
      phase: 'EXPLORATION',
      hero,
      currentFloor: 1,
      maxFloors: 3,
      floors: { 1: floor1 },
      currentRoomId: startRoomId,
      combat: null,
      historyLog: [`${hero.name} entered Floor 1: ${floor1.floorName}`],
      highScores: [],
      soundEnabled: gameState.soundEnabled,
    });
    setPreviousRoomId(startRoomId);
  };

  // Toggle Sound FX
  const handleToggleSound = () => {
    const next = !gameState.soundEnabled;
    sounds.setEnabled(next);
    setGameState((prev) => ({ ...prev, soundEnabled: next }));
  };

  // Peek a single room card without moving into it
  const handlePeekRoom = (targetRoomId: string) => {
    const floorObj = gameState.floors[gameState.currentFloor];
    if (!floorObj || !floorObj.rooms[targetRoomId]) return;

    const targetRoom = floorObj.rooms[targetRoomId];
    targetRoom.isRevealed = true;

    setGameState((prev) => ({
      ...prev,
      floors: {
        ...prev.floors,
        [prev.currentFloor]: {
          ...floorObj,
          rooms: {
            ...floorObj.rooms,
            [targetRoomId]: targetRoom,
          },
        },
      },
    }));
  };

  // Light Torch to peek and reveal all 4 adjacent rooms
  const handleUseTorch = () => {
    if (!gameState.hero || gameState.hero.torches <= 0) return;
    const currentFloorObj = gameState.floors[gameState.currentFloor];
    const currentRoom = currentFloorObj?.rooms[gameState.currentRoomId];
    if (!currentRoom) return;

    const hero = { ...gameState.hero, torches: gameState.hero.torches - 1 };

    // Reveal 4 cardinal neighbors
    const deltas = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    deltas.forEach((d) => {
      const nx = currentRoom.gridX + d.dx;
      const ny = currentRoom.gridY + d.dy;
      const nId = `floor_${gameState.currentFloor}_r${nx}_${ny}`;
      if (currentFloorObj.rooms[nId]) {
        currentFloorObj.rooms[nId].isRevealed = true;
      }
    });

    setGameState((prev) => ({
      ...prev,
      hero,
      floors: {
        ...prev.floors,
        [prev.currentFloor]: { ...currentFloorObj },
      },
    }));
  };

  // Cast Clairvoyance Scroll to peek any room card on the 4x4 board
  const handleUseClairvoyance = (targetRoomId: string) => {
    if (!gameState.hero) return;
    const hero = { ...gameState.hero };
    const scrollIdx = hero.inventory.findIndex((i) => i.item.id === 'scroll_of_clairvoyance');
    if (scrollIdx === -1) return;

    if (hero.inventory[scrollIdx].quantity > 1) {
      hero.inventory[scrollIdx].quantity -= 1;
    } else {
      hero.inventory.splice(scrollIdx, 1);
    }

    const floorObj = gameState.floors[gameState.currentFloor];
    if (floorObj && floorObj.rooms[targetRoomId]) {
      floorObj.rooms[targetRoomId].isRevealed = true;
    }

    setGameState((prev) => ({
      ...prev,
      hero,
      floors: {
        ...prev.floors,
        [prev.currentFloor]: { ...floorObj },
      },
    }));
  };

  // Smash an interior stone wall with sledgehammer or pickaxe
  const handleSmashWall = (wallId: string, item: GameItem) => {
    if (!gameState.hero) return;
    const hero = { ...gameState.hero };
    const floorObj = gameState.floors[gameState.currentFloor];
    if (!floorObj) return;

    const wall = (floorObj.walls || []).find((w) => w.id === wallId);
    if (!wall) return;

    wall.isBroken = true;

    // Deduct charge or item
    const itemInv = hero.inventory.find((i) => i.item.id === item.id);
    if (itemInv) {
      if (itemInv.chargesLeft !== undefined) {
        itemInv.chargesLeft -= 1;
        if (itemInv.chargesLeft <= 0) {
          hero.inventory = hero.inventory.filter((i) => i !== itemInv);
        }
      } else if (item.charges && item.charges > 1) {
        itemInv.chargesLeft = item.charges - 1;
      } else {
        if (itemInv.quantity > 1) itemInv.quantity -= 1;
        else hero.inventory = hero.inventory.filter((i) => i !== itemInv);
      }
    }

    // Recompute doors for affected rooms
    const roomAId = `floor_${gameState.currentFloor}_r${wall.roomA.x}_${wall.roomA.y}`;
    const roomBId = `floor_${gameState.currentFloor}_r${wall.roomB.x}_${wall.roomB.y}`;

    const roomA = floorObj.rooms[roomAId];
    const roomB = floorObj.rooms[roomBId];

    if (roomA && !roomA.doors.some((d) => d.targetRoomId === roomBId)) {
      roomA.doors.push({
        targetRoomId: roomBId,
        direction: wall.type === 'vertical' ? 'east' : 'south',
      });
    }
    if (roomB && !roomB.doors.some((d) => d.targetRoomId === roomAId)) {
      roomB.doors.push({
        targetRoomId: roomAId,
        direction: wall.type === 'vertical' ? 'west' : 'north',
      });
    }

    setGameState((prev) => ({
      ...prev,
      hero,
      floors: {
        ...prev.floors,
        [prev.currentFloor]: { ...floorObj },
      },
    }));
  };

  // Phase through a solid stone wall into adjacent room
  const handlePhaseThroughWall = (targetRoomId: string, item?: GameItem) => {
    if (!gameState.hero) return;
    const hero = { ...gameState.hero };

    if (item && item.id === 'potion_of_phasing') {
      const pIdx = hero.inventory.findIndex((i) => i.item.id === 'potion_of_phasing');
      if (pIdx !== -1) {
        if (hero.inventory[pIdx].quantity > 1) hero.inventory[pIdx].quantity -= 1;
        else hero.inventory.splice(pIdx, 1);
      }
    }

    handleNavigateToRoom(targetRoomId);
  };

  // Navigate to an adjacent room (reveals tile face-up and enters directly)
  const handleNavigateToRoom = (targetRoomId: string) => {
    const floorObj = gameState.floors[gameState.currentFloor];
    if (!floorObj || !floorObj.rooms[targetRoomId]) return;

    // Check if current room has undefeated monster or active trap blocking passage
    const currentRoom = floorObj.rooms[gameState.currentRoomId];
    if (currentRoom) {
      if (currentRoom.monster && currentRoom.monster.hp > 0) {
        sounds.playBlock();
        return;
      }
      if (currentRoom.trap && !currentRoom.trap.disarmed && !currentRoom.trap.triggered) {
        sounds.playTrap();
        return;
      }
    }

    const targetRoom = { ...floorObj.rooms[targetRoomId] };
    const wasExplored = targetRoom.isExplored;
    
    targetRoom.isRevealed = true; // Turn over room card face-up!
    targetRoom.isExplored = true;
    sounds.playTileReveal();

    const updatedHero = { ...gameState.hero };
    if (!wasExplored) {
      updatedHero.statsHistory.roomsExplored += 1;
    }

    setPreviousRoomId(gameState.currentRoomId);
    setGameState((prev) => ({
      ...prev,
      hero: updatedHero,
      currentRoomId: targetRoomId,
      floors: {
        ...prev.floors,
        [prev.currentFloor]: {
          ...floorObj,
          currentRoomId: targetRoomId,
          rooms: {
            ...floorObj.rooms,
            [targetRoomId]: targetRoom,
          },
        },
      },
    }));
  };

  // Initiate Combat
  const handleEnterCombat = (room: DungeonRoom) => {
    if (!room.monster) return;
    sounds.playDiceRoll();

    const heroInitiative = rollDice(1, 20, getStatModifier(gameState.hero.stats.DEX));
    const monsterInitiative = rollDice(1, 20, getStatModifier(room.monster.dexterity ?? 10));
    const isHeroTurn = heroInitiative.total >= monsterInitiative.total;

    const combatState: CombatState = {
      isActive: true,
      turnNumber: 1,
      monster: JSON.parse(JSON.stringify(room.monster)),
      isHeroTurn,
      initiative: {
        hero: heroInitiative.total,
        monster: monsterInitiative.total,
      },
      combatLogs: [
        {
          id: `log_init_${Date.now()}`,
          turn: 1,
          sender: 'system',
          actionName: 'Initiative Rolled',
          message: `You face ${room.monster.name} (${room.monster.title})! Initiative: You rolled [${heroInitiative.individualRolls[0]}] ${heroInitiative.modifier >= 0 ? '+' : ''}${heroInitiative.modifier} = ${heroInitiative.total}; ${room.monster.name} rolled [${monsterInitiative.individualRolls[0]}] ${monsterInitiative.modifier >= 0 ? '+' : ''}${monsterInitiative.modifier} = ${monsterInitiative.total}. ${isHeroTurn ? 'You act first.' : `${room.monster.name} acts first.`}`,
          rollDetails: {
            diceType: 'd20 initiative',
            rolls: [heroInitiative.individualRolls[0], monsterInitiative.individualRolls[0]],
            modifier: heroInitiative.modifier,
            total: heroInitiative.total,
          },
        },
      ],
      heroDefending: false,
    };

    setGameState((prev) => ({
      ...prev,
      phase: 'COMBAT',
      combat: combatState,
    }));
  };

  // Combat Victory
  const handleCombatVictory = (
    monster: Monster,
    reward: { xp: number; gold: number; items: GameItem[] }
  ) => {
    const currentFloorObj = gameState.floors[gameState.currentFloor];
    const currentRoom = currentFloorObj.rooms[gameState.currentRoomId];

    if (currentRoom) {
      currentRoom.isCleared = true;
      if (currentRoom.monster) {
        currentRoom.monster.hp = 0;
      }
      if (currentRoom.isBossRoom) {
        currentRoom.isStairsUnlocked = true;
        currentFloorObj.bossDefeated = true;
      }
    }

    const updatedHero = { ...gameState.hero };
    updatedHero.xp += reward.xp;
    updatedHero.gold += reward.gold;
    updatedHero.statsHistory.goldCollected += reward.gold;

    reward.items.forEach((item) => {
      updatedHero.inventory.push({ item, quantity: 1 });
    });

    // Check if this was the Dragon boss on Floor 3 (Final Victory!)
    if (monster.id === 'crimson_dragon') {
      setGameState((prev) => ({
        ...prev,
        hero: updatedHero,
        phase: 'VICTORY',
        combat: null,
      }));
      return;
    }

    setGameState((prev) => ({
      ...prev,
      hero: updatedHero,
      phase: 'EXPLORATION',
      combat: null,
      floors: {
        ...prev.floors,
        [prev.currentFloor]: { ...currentFloorObj },
      },
    }));
  };

  // Flee from Combat (Retreats to previous room or start room)
  const handleCombatFlee = () => {
    const floorObj = gameState.floors[gameState.currentFloor];
    const safeRoomId =
      previousRoomId && previousRoomId !== gameState.currentRoomId
        ? previousRoomId
        : floorObj.startRoomId;

    setGameState((prev) => ({
      ...prev,
      phase: 'EXPLORATION',
      combat: null,
      currentRoomId: safeRoomId,
    }));
  };

  // Descend to Next Floor
  const handleDescendFloor = () => {
    const nextFloorNumber = gameState.currentFloor + 1;
    if (nextFloorNumber > gameState.maxFloors) {
      // Completed Floor 3 Dragon
      setGameState((prev) => ({ ...prev, phase: 'VICTORY' }));
      return;
    }

    sounds.playLevelUp();
    const nextFloorObj = generateDungeonFloor(nextFloorNumber);

    setGameState((prev) => ({
      ...prev,
      currentFloor: nextFloorNumber,
      currentRoomId: nextFloorObj.startRoomId,
      floors: {
        ...prev.floors,
        [nextFloorNumber]: nextFloorObj,
      },
      phase: 'EXPLORATION',
    }));
    setPreviousRoomId(nextFloorObj.startRoomId);
  };

  // Confirm Level Up
  const handleConfirmLevelUp = (chosenStat: StatType) => {
    if (!gameState.hero) return;
    const hero = { ...gameState.hero };

    hero.level += 1;
    hero.xp -= hero.xpToNextLevel;
    hero.xpToNextLevel = Math.floor(hero.xpToNextLevel * 1.5);
    hero.maxHp += 8;
    hero.currentHp = hero.maxHp;
    hero.maxMana += 6;
    hero.currentMana = hero.maxMana;
    hero.stats[chosenStat] += 2;
    hero.rerollTokens += 1;

    setPendingLevelUp(false);
    setGameState((prev) => ({ ...prev, hero }));
  };

  // Restart Quest / Character Creation
  const handleRestartNewGame = () => {
    clearGameState();
    setGameState({
      phase: 'CHARACTER_CREATION',
      hero: null as unknown as HeroCharacter,
      currentFloor: 1,
      maxFloors: 3,
      floors: {},
      currentRoomId: '',
      combat: null,
      historyLog: [],
      highScores: [],
      soundEnabled: gameState.soundEnabled,
    });
  };

  const currentFloorObj = gameState.floors[gameState.currentFloor];
  const currentRoom = currentFloorObj?.rooms[gameState.currentRoomId];

  return (
    <div className="min-h-screen bg-[#140e08] text-[#f4ecd8] font-serif flex flex-col selection:bg-amber-800 selection:text-amber-100">
      {/* Top Medieval Header Bar */}
      <header className="bg-[#21170f] border-b-2 border-[#6d4f32] px-4 py-2.5 shadow-md flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#422c19] rounded border border-[#7d5836] text-amber-300">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-serif font-black text-[#fae9cb] tracking-wide leading-none">
              DUNGEON DICE CRAWLER
            </h1>
            <span className="text-[10px] text-[#c9a674] font-mono block mt-0.5">
              Burgle Bros Grid & Old School Solo Paper RPG
            </span>
          </div>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Tables Codex Inspector Button */}
          <button
            id="btn-nav-tables-codex"
            onClick={() => setShowTableInspector(true)}
            className="px-2.5 py-1 bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-600 rounded text-xs font-serif flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            title="Lookup Tables & Dice Codex"
          >
            <Dices className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Lookup Tables</span>
          </button>

          {gameState.phase !== 'CHARACTER_CREATION' && (
            <button
              id="btn-nav-inventory"
              onClick={() => setShowInventory(true)}
              className="px-2.5 py-1 bg-[#332214] hover:bg-[#4a321e] text-amber-200 border border-[#6b4a2b] rounded text-xs font-serif flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Inventory & Equipment"
            >
              <Package className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Backpack</span>
            </button>
          )}

          <button
            id="btn-nav-rulebook"
            onClick={() => setShowRulebook(true)}
            className="px-2.5 py-1 bg-[#332214] hover:bg-[#4a321e] text-amber-200 border border-[#6b4a2b] rounded text-xs font-serif flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Field Manual & Rules"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Rules</span>
          </button>

          <button
            id="btn-nav-hall-of-fame"
            onClick={() => setShowHallOfFame(true)}
            className="px-2 py-1 bg-[#332214] hover:bg-[#4a321e] text-amber-200 border border-[#6b4a2b] rounded text-xs font-serif flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Hall of Fame"
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
          </button>

          <button
            id="btn-toggle-sound"
            onClick={handleToggleSound}
            className="p-1.5 bg-[#332214] hover:bg-[#4a321e] text-amber-200 border border-[#6b4a2b] rounded text-xs transition-colors cursor-pointer"
            title={gameState.soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {gameState.soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-stone-500" />
            )}
          </button>

          {gameState.phase !== 'CHARACTER_CREATION' && (
            <button
              id="btn-restart-game-top"
              onClick={handleRestartNewGame}
              className="p-1.5 bg-[#332214] hover:bg-[#4a321e] text-stone-400 hover:text-amber-200 border border-[#6b4a2b] rounded text-xs transition-colors cursor-pointer"
              title="Restart New Quest"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-3 md:p-5 max-w-7xl w-full mx-auto">
        {gameState.phase === 'CHARACTER_CREATION' && (
          <CharacterCreation onCharacterCreated={handleCharacterCreated} />
        )}

        {gameState.phase !== 'CHARACTER_CREATION' && gameState.hero && currentFloorObj && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Sidebar (Desktop): Character Sheet & 4x4 Floor Map */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <CharacterSheet
                hero={gameState.hero}
                onOpenInventory={() => setShowInventory(true)}
                onOpenJournal={() => setShowJournal(true)}
              />

              <DungeonMap
                floor={currentFloorObj}
                currentRoomId={gameState.currentRoomId}
                hero={gameState.hero}
                onPeekRoom={handlePeekRoom}
                onSelectAdjacentRoom={handleNavigateToRoom}
                onSmashWall={handleSmashWall}
                onPhaseThroughWall={handlePhaseThroughWall}
                onUseTorch={handleUseTorch}
                onUseClairvoyance={handleUseClairvoyance}
              />
            </div>

            {/* Right Main Stage: Room Exploration or Combat */}
            <div className="lg:col-span-7">
              {gameState.phase === 'EXPLORATION' && currentRoom && (
                <RoomView
                  floor={currentFloorObj}
                  room={currentRoom}
                  hero={gameState.hero}
                  onUpdateHero={(updatedHero) =>
                    setGameState((prev) => ({ ...prev, hero: updatedHero }))
                  }
                  onUpdateRoom={(updatedRoom) => {
                    setGameState((prev) => ({
                      ...prev,
                      floors: {
                        ...prev.floors,
                        [prev.currentFloor]: {
                          ...currentFloorObj,
                          rooms: {
                            ...currentFloorObj.rooms,
                            [updatedRoom.id]: updatedRoom,
                          },
                        },
                      },
                    }));
                  }}
                  onEnterCombat={handleEnterCombat}
                  onOpenMerchant={() => setShowMerchant(true)}
                  onNavigateToRoom={handleNavigateToRoom}
                  onPeekRoom={handlePeekRoom}
                  onSmashWall={handleSmashWall}
                  onPhaseThroughWall={handlePhaseThroughWall}
                  onDescendFloor={handleDescendFloor}
                />
              )}

              {gameState.phase === 'COMBAT' && gameState.combat && (
                <CombatView
                  hero={gameState.hero}
                  combat={gameState.combat}
                  onUpdateHero={(updatedHero) =>
                    setGameState((prev) => ({ ...prev, hero: updatedHero }))
                  }
                  onUpdateCombat={(updatedCombat) =>
                    setGameState((prev) => ({ ...prev, combat: updatedCombat }))
                  }
                  onCombatVictory={handleCombatVictory}
                  onCombatFlee={handleCombatFlee}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modals & Overlays */}
      {showInventory && gameState.hero && (
        <InventoryModal
          hero={gameState.hero}
          onUpdateHero={(updatedHero) => setGameState((prev) => ({ ...prev, hero: updatedHero }))}
          onClose={() => setShowInventory(false)}
        />
      )}

      {showMerchant && gameState.hero && (
        <MerchantModal
          hero={gameState.hero}
          floorNumber={gameState.currentFloor}
          onUpdateHero={(updatedHero) => setGameState((prev) => ({ ...prev, hero: updatedHero }))}
          onClose={() => setShowMerchant(false)}
        />
      )}

      {showRulebook && <RulebookModal onClose={() => setShowRulebook(false)} />}

      {showHallOfFame && <HallOfFameModal onClose={() => setShowHallOfFame(false)} />}

      {showJournal && gameState.hero && (
        <JournalModal
          hero={gameState.hero}
          currentFloor={gameState.currentFloor}
          onClose={() => setShowJournal(false)}
        />
      )}

      {showTableInspector && (
        <TableInspectorModal
          isOpen={showTableInspector}
          onClose={() => setShowTableInspector(false)}
        />
      )}

      {pendingLevelUp && gameState.hero && (
        <LevelUpModal hero={gameState.hero} onConfirmLevelUp={handleConfirmLevelUp} />
      )}

      {(gameState.phase === 'GAME_OVER' || gameState.phase === 'VICTORY') && gameState.hero && (
        <GameOverModal
          hero={gameState.hero}
          isVictory={gameState.phase === 'VICTORY'}
          floorsCleared={gameState.currentFloor}
          onRestartNewGame={handleRestartNewGame}
          onOpenHallOfFame={() => {
            setShowHallOfFame(true);
          }}
        />
      )}
    </div>
  );
}
