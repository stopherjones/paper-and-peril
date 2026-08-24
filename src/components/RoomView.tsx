/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Skull,
  Package,
  Store,
  Tent,
  Sun,
  AlertTriangle,
  HelpCircle,
  Footprints,
  Key,
  Shield,
  Dices,
  Flame,
  Sparkles,
  Heart,
  Wand2,
  Crown,
  Eye,
  Hammer,
} from 'lucide-react';
import { DungeonFloor, DungeonRoom, GameItem, HeroCharacter, StatType } from '../types/game';
import { DiceVisualizer } from './DiceVisualizer';
import { LootRollerModal } from './LootRollerModal';
import { ActionChallengeModal, ActionChallengeConfig } from './ActionChallengeModal';
import { rollDice, getStatModifier, RollResult } from '../utils/dice';
import { sounds } from '../utils/audio';

interface RoomViewProps {
  floor: DungeonFloor;
  room: DungeonRoom;
  hero: HeroCharacter;
  onUpdateHero: (hero: HeroCharacter) => void;
  onUpdateRoom: (room: DungeonRoom) => void;
  onEnterCombat: (room: DungeonRoom) => void;
  onOpenMerchant: () => void;
  onNavigateToRoom: (targetRoomId: string) => void;
  onUseTorch?: (targetRoomId: string) => void;
  onSmashWall: (wallId: string, item: GameItem) => void;
  onPhaseThroughWall: (targetRoomId: string, item?: GameItem) => void;
  onDescendFloor: () => void;
  onClose?: () => void;
}

export const RoomView: React.FC<RoomViewProps> = ({
  floor,
  room,
  hero,
  onUpdateHero,
  onUpdateRoom,
  onEnterCombat,
  onOpenMerchant,
  onNavigateToRoom,
  onUseTorch,
  onSmashWall,
  onPhaseThroughWall,
  onDescendFloor,
  onClose,
}) => {
  const [currentRoll, setCurrentRoll] = useState<RollResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [eventMessage, setEventMessage] = useState<string | null>(null);
  const [showLootModal, setShowLootModal] = useState(false);
  const [lootSourceTitle, setLootSourceTitle] = useState('Iron Vault Chest');
  const [lootSourceDesc, setLootSourceDesc] = useState('Opening the reinforced dungeon chest...');
  const [pendingGuaranteedGold, setPendingGuaranteedGold] = useState(0);
  const [pendingBonusItems, setPendingBonusItems] = useState<GameItem[]>([]);

  // Action Challenge Modal State for focused full-screen action resolution
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeConfig, setChallengeConfig] = useState<ActionChallengeConfig | null>(null);

  // Check inventory for wall tools
  const hasBreachingTool = hero.inventory.find(
    (i) => i.item.specialEffect === 'SMASH_WALL' && (i.chargesLeft ?? i.item.charges ?? 1) > 0
  );
  const hasPhasingPotion = hero.inventory.find((i) => i.item.id === 'potion_of_phasing' && i.quantity > 0);
  const isWearingEtherealRing = hero.equipment.ring?.id === 'ethereal_ring';

  const heroStats = { ...hero.stats };
  (Object.values(hero.equipment) as (GameItem | undefined)[]).forEach((item) => {
    if (!item?.statBonuses) return;
    if (item.statBonuses.STR) heroStats.STR += item.statBonuses.STR;
    if (item.statBonuses.DEX) heroStats.DEX += item.statBonuses.DEX;
    if (item.statBonuses.CON) heroStats.CON += item.statBonuses.CON;
    if (item.statBonuses.INT) heroStats.INT += item.statBonuses.INT;
    if (item.statBonuses.LCK) heroStats.LCK += item.statBonuses.LCK;
  });

  // Chest: Pick Lock (DEX) via Focused Modal
  const handlePickChestLock = () => {
    if (!room.chest || room.chest.isOpened) return;

    let bonus = getStatModifier(heroStats.DEX);
    const hasPicks = hero.lockpicks > 0;
    if (hasPicks) {
      bonus += 3;
      hero.lockpicks -= 1;
      onUpdateHero({ ...hero });
    }

    setChallengeConfig({
      type: 'CHEST_PICK',
      title: 'Pick Lock on Iron Chest Vault',
      subtitle:
        'You insert fine lockpicks into the heavy iron tumbler, carefully testing each pin against the tension wrench.',
      iconType: 'chest',
      stat: 'DEX',
      dc: room.chest.lockDifficulty,
      bonus,
      bonusBreakdown: hasPicks
        ? `DEX Mod (${getStatModifier(heroStats.DEX)}) + Lockpick Tool (+3)`
        : `DEX Mod (${getStatModifier(heroStats.DEX)})`,
      successOutcomeTitle: 'Tumbler Unlocked!',
      successOutcomeDesc: `With a satisfying mechanical click, the iron chest springs open! Ready to collect your spoils.`,
      failureOutcomeTitle: 'Lockpick Slipped',
      failureOutcomeDesc: `The stubborn pins refused to catch. The chest remains securely locked.`,
      onSuccess: () => {
        if (room.chest) {
          room.chest.isLocked = false;
        }
        setLootSourceTitle('Lock Picked: Iron Chest Vault');
        setLootSourceDesc('With a satisfying click, the heavy tumbler turns! Revealing the treasure within.');
        setPendingGuaranteedGold(room.chest?.gold || 15);
        setPendingBonusItems(room.chest?.items || []);
        setShowLootModal(true);
        onUpdateRoom({ ...room });
      },
      onFailure: () => {
        setEventMessage(`✖ Lockpick slipped! The iron chest remains locked.`);
      },
    });
    setShowChallengeModal(true);
  };

  // Chest: Force Open (STR) via Focused Modal
  const handleForceChest = () => {
    if (!room.chest || room.chest.isOpened) return;

    const bonus = getStatModifier(heroStats.STR);
    const dc = room.chest.lockDifficulty + 2;

    setChallengeConfig({
      type: 'CHEST_BASH',
      title: 'Smash Open Iron Chest Vault',
      subtitle:
        'You raise your weapon and strike with violent force at the reinforced latch and hinges.',
      iconType: 'smash',
      stat: 'STR',
      dc,
      bonus,
      bonusBreakdown: `STR Mod (${bonus})`,
      successOutcomeTitle: 'Iron Latch Splintered!',
      successOutcomeDesc:
        'Your strike shatters the locking mechanism completely! The heavy iron lid pops open.',
      failureOutcomeTitle: 'Recoil Shock!',
      failureOutcomeDesc:
        'The hardened iron chest deflects your blow with an echoing ring. You take 2 recoil damage!',
      onSuccess: () => {
        if (room.chest) {
          room.chest.isLocked = false;
        }
        setLootSourceTitle('Smashed Open: Iron Chest');
        setLootSourceDesc('You splinter the iron latch with brute force! Revealing the vault contents.');
        setPendingGuaranteedGold(room.chest?.gold || 15);
        setPendingBonusItems(room.chest?.items || []);
        setShowLootModal(true);
        onUpdateRoom({ ...room });
      },
      onFailure: () => {
        hero.currentHp = Math.max(1, hero.currentHp - 2);
        setEventMessage('✖ Failed to bash! The chest resisted your blow. Lost 2 HP from recoil.');
        onUpdateHero({ ...hero });
      },
    });
    setShowChallengeModal(true);
  };

  // Chest: Open Directly (if unlocked)
  const handleOpenUnlockedChest = () => {
    if (!room.chest || room.chest.isOpened) return;
    setLootSourceTitle('Dungeon Vault Chest');
    setLootSourceDesc('Lifting the creaking lid to reveal the hidden relics...');
    setPendingGuaranteedGold(room.chest.gold || 15);
    setPendingBonusItems(room.chest.items || []);
    setShowLootModal(true);
  };

  // Handle Loot Claim
  const handleClaimChestLoot = (goldEarned: number, itemsEarned: GameItem[]) => {
    if (room.chest) {
      room.chest.isOpened = true;
      room.chest.isLocked = false;
    }
    hero.gold += goldEarned;
    hero.statsHistory.chestsOpened += 1;
    hero.statsHistory.goldCollected += goldEarned;

    itemsEarned.forEach((item) => {
      hero.inventory.push({ item, quantity: 1 });
    });

    setShowLootModal(false);
    setEventMessage(
      `✦ Claimed ${goldEarned} Gold and ${itemsEarned.map((i) => i.name).join(', ') || 'valuable items'}!`
    );
    onUpdateHero({ ...hero });
    onUpdateRoom({ ...room });
  };

  // Trap: Disarm with chosen stat (DEX / INT / STR / LCK) via Focused Modal
  const handleDisarmTrap = (stat: StatType = 'DEX') => {
    if (!room.trap || room.trap.disarmed || room.trap.triggered) return;

    let bonus = getStatModifier(heroStats[stat]);
    const hasPicksBonus = stat === 'DEX' && hero.lockpicks > 0;
    if (hasPicksBonus) {
      bonus += 2;
    }

    const statName =
      stat === 'DEX'
        ? 'Dexterity'
        : stat === 'INT'
        ? 'Intelligence'
        : stat === 'STR'
        ? 'Strength'
        : 'Luck';

    setChallengeConfig({
      type: 'TRAP_DISARM',
      title: `Disarm ${room.trap.name}`,
      subtitle: room.trap.description,
      iconType: 'trap',
      stat,
      dc: room.trap.difficulty,
      bonus,
      bonusBreakdown: hasPicksBonus
        ? `${statName} Mod (${getStatModifier(heroStats[stat])}) + Lockpick Bonus (+2)`
        : `${statName} Mod (${bonus})`,
      successOutcomeTitle: 'Trap Neutralized!',
      successOutcomeDesc: `You carefully dismantle the trigger mechanism and sever the tripwires. Gained +20 XP!`,
      failureOutcomeTitle: 'Trap Triggered!',
      failureOutcomeDesc: `A click rings out as the trigger springs! Darts and blades deploy from the walls.`,
      onSuccess: () => {
        if (room.trap) {
          room.trap.disarmed = true;
        }
        hero.statsHistory.trapsDisarmed += 1;
        hero.xp += 20;
        setEventMessage(`✦ Trap Neutralized! Safe passage secured. Gained +20 XP.`);
        onUpdateHero({ ...hero });
        onUpdateRoom({ ...room });
      },
      onFailure: () => {
        if (room.trap) {
          room.trap.triggered = true;
        }
        const dmgRoll = rollDice(1, 8, 2);
        hero.currentHp = Math.max(0, hero.currentHp - dmgRoll.total);
        setEventMessage(`✖ Trap Triggered! Took ${dmgRoll.total} physical damage.`);
        onUpdateHero({ ...hero });
        onUpdateRoom({ ...room });
      },
    });
    setShowChallengeModal(true);
  };

  // Campfire: Rest & Recover
  const handleCampfireRest = () => {
    sounds.playHeal();
    const hpGain = 12 + getStatModifier(heroStats.CON) * 2;
    const manaGain = 10 + getStatModifier(heroStats.INT) * 2;
    hero.currentHp = Math.min(hero.maxHp, hero.currentHp + hpGain);
    hero.currentMana = Math.min(hero.maxMana, hero.currentMana + manaGain);
    room.isCleared = true;
    setEventMessage(`✦ Rested by the hearth. Restored ${hpGain} HP and ${manaGain} Mana!`);
    onUpdateHero({ ...hero });
    onUpdateRoom({ ...room });
  };

  // Campfire: Eat Rations
  const handleEatRation = () => {
    if (hero.rations <= 0) return;
    sounds.playHeal();
    hero.rations -= 1;
    hero.currentHp = Math.min(hero.maxHp, hero.currentHp + 10);
    setEventMessage(`✦ Ate salted dungeon rations. Restored 10 HP.`);
    onUpdateHero({ ...hero });
  };

  // Shrine: Pray
  const handlePrayAtShrine = () => {
    if (!room.shrine || room.shrine.used) return;
    sounds.playSpell();
    room.shrine.used = true;
    hero.currentHp = Math.min(hero.maxHp, hero.currentHp + 15);
    hero.currentMana = Math.min(hero.maxMana, hero.currentMana + 12);
    setEventMessage(`✦ The blessing of ${room.shrine.god} envelopes you! Restored 15 HP & 12 Mana.`);
    onUpdateHero({ ...hero });
    onUpdateRoom({ ...room });
  };

  // Secret: Search walls (INT / LCK) via Focused Modal
  const handleSearchSecret = () => {
    if (!room.secret || room.secret.discovered) return;

    const useInt = getStatModifier(heroStats.INT) >= getStatModifier(heroStats.LCK);
    const chosenStat: StatType = useInt ? 'INT' : 'LCK';
    const bonus = getStatModifier(heroStats[chosenStat]);

    setChallengeConfig({
      type: 'ROOM_SEARCH',
      title: 'Investigate Chamber for Hidden Vaults',
      subtitle:
        'You run your fingers along the stone masonry, inspecting floor grooves and mortar seams for concealed mechanisms.',
      iconType: 'search',
      stat: chosenStat,
      dc: room.secret.difficulty,
      bonus,
      bonusBreakdown: `${chosenStat} Mod (${bonus})`,
      successOutcomeTitle: 'Hidden Stash Discovered!',
      successOutcomeDesc:
        'A hollow block clicks inward, swinging open a hidden alcove containing ancient coins and treasures!',
      failureOutcomeTitle: 'Nothing Found',
      failureOutcomeDesc:
        'After thoroughly tapping the walls and cobblestones, you find no secret mechanisms.',
      onSuccess: () => {
        if (room.secret) {
          room.secret.discovered = true;
          room.secret.rewardClaimed = true;
        }
        setLootSourceTitle('Secret Masonry Vault');
        setLootSourceDesc('A hidden switch swings back a false wall, revealing an ancient cache!');
        setPendingGuaranteedGold(25);
        setPendingBonusItems([]);
        setShowLootModal(true);
        onUpdateRoom({ ...room });
      },
      onFailure: () => {
        setEventMessage('✖ You searched the cracked masonry, but found nothing hidden.');
      },
    });
    setShowChallengeModal(true);
  };

  return (
    <div id="room-view-container" className="max-w-4xl mx-auto space-y-4">
      {/* Room Narrative & Atmosphere Card */}
      <div className="bg-[#241a12] border-2 border-[#735438] rounded-xl p-4 md:p-5 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#4d3723] pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-[#19110a] text-amber-300 px-2 py-0.5 rounded border border-[#4d341f]">
              Chamber [{room.gridX + 1},{room.gridY + 1}]
            </span>
            <h2 className="text-lg md:text-xl font-serif font-black text-[#f5e4c6]">{room.title}</h2>
          </div>

          <span className="text-xs font-serif text-stone-400 capitalize bg-[#160f09] px-2.5 py-0.5 rounded border border-[#3b2716]">
            {room.isBossRoom ? 'Boss & Descent Chamber' : room.type.replace('_', ' ')}
          </span>
        </div>

        <p className="text-sm font-serif text-stone-300 leading-relaxed mb-2">{room.description}</p>
        <p className="text-xs font-serif text-[#d6b78d] italic">{room.flavorText}</p>

        {/* Dynamic Event Result Box */}
        {eventMessage && (
          <div className="mt-3 p-2.5 bg-[#17110a] border border-[#6b4e2d] rounded-md font-serif text-xs text-amber-200 animate-fade-in flex items-center justify-between">
            <span>{eventMessage}</span>
          </div>
        )}
      </div>

      {/* Main Room Interactive Encounter Area */}
      <div className="flex flex-col gap-4">
          {/* 1. Monster / Boss Encounter */}
          {room.monster && room.monster.hp > 0 && (
            <div
              className={`border-2 rounded-xl p-4 shadow-lg text-stone-200 ${
                room.isBossRoom
                  ? 'bg-[#3b1915] border-red-500 ring-1 ring-red-400'
                  : 'bg-[#2e1913] border-red-700/80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-red-300 font-serif font-bold text-sm">
                  {room.isBossRoom ? (
                    <Crown className="w-5 h-5 text-amber-400 animate-pulse" />
                  ) : (
                    <Skull className="w-5 h-5 text-red-500 animate-pulse" />
                  )}
                  <span>
                    {room.isBossRoom ? 'FLOOR MAP BOSS' : 'Hostile Encounter'}: {room.monster.name}
                  </span>
                </div>
                <span className="text-xs font-mono text-red-400 font-bold">
                  HP: {room.monster.hp}/{room.monster.maxHp}
                </span>
              </div>

              <p className="text-xs text-stone-300 font-serif mb-3.5 leading-relaxed">
                {room.monster.description}
              </p>

              {room.isBossRoom && (
                <div className="mb-3 p-2 bg-[#200e0b] border border-red-900 rounded text-[11px] font-serif text-amber-200 flex items-center gap-2">
                  <Footprints className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>The stairs to the next floor are locked behind this Boss. Defeat it to proceed!</span>
                </div>
              )}

              <button
                id="btn-engage-combat"
                onClick={() => onEnterCombat(room)}
                className="w-full py-2.5 bg-gradient-to-b from-[#8f2b1d] to-[#591910] hover:from-[#a63423] hover:to-[#6d2015] text-amber-100 font-serif font-bold text-sm rounded border border-red-500 shadow-md active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Skull className="w-4 h-4 text-red-300" />
                <span>DRAW WEAPON & ENTER COMBAT</span>
              </button>
            </div>
          )}

          {/* 2. Treasure Chest */}
          {room.chest && (
            <div className="bg-[#241a12] border-2 border-amber-600/70 rounded-xl p-4 shadow-lg text-stone-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-amber-300 font-serif font-bold text-sm">
                  <Package className="w-5 h-5 text-amber-400" />
                  <span>Iron-Bound Dungeon Chest</span>
                </div>
                <span className="text-[11px] font-mono text-stone-400">
                  {room.chest.isOpened
                    ? 'Opened'
                    : room.chest.isLocked
                    ? `Locked (DC ${room.chest.lockDifficulty})`
                    : 'Unlocked'}
                </span>
              </div>

              {!room.chest.isOpened ? (
                <div className="space-y-2 mt-3">
                  {room.chest.isLocked ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        id="btn-pick-lock"
                        disabled={isRolling}
                        onClick={handlePickChestLock}
                        className="p-2.5 bg-[#382617] hover:bg-[#4d3521] text-amber-200 border border-[#6b4c2b] rounded text-xs font-serif flex flex-col items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Key className="w-4 h-4 text-cyan-400" />
                        <span className="font-bold">Pick Lock (DEX)</span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {hero.lockpicks > 0 ? '+3 Lockpick' : 'Standard check'}
                        </span>
                      </button>

                      <button
                        id="btn-force-chest"
                        disabled={isRolling}
                        onClick={handleForceChest}
                        className="p-2.5 bg-[#382617] hover:bg-[#4d3521] text-amber-200 border border-[#6b4c2b] rounded text-xs font-serif flex flex-col items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Shield className="w-4 h-4 text-red-400" />
                        <span className="font-bold">Bash Open (STR)</span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          Roll vs DC {room.chest.lockDifficulty + 2}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <button
                      id="btn-open-unlocked-chest"
                      onClick={handleOpenUnlockedChest}
                      className="w-full py-2.5 bg-gradient-to-b from-[#8f6834] to-[#593f1c] hover:from-[#a6793d] hover:to-[#6d4d23] text-amber-100 font-serif font-bold text-xs rounded border border-[#dfb15b] shadow cursor-pointer"
                    >
                      Open Chest Lid & Roll Loot Table (1d20)
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-xs text-stone-400 font-serif italic py-1">
                  The chest lies empty, its treasures collected into your backpack.
                </div>
              )}
            </div>
          )}

          {/* 3. Trap Encounter */}
          {room.trap && (
            <div className="bg-[#241a12] border-2 border-yellow-700/70 rounded-xl p-4 shadow-lg text-stone-200">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 text-yellow-400 font-serif font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
                  <span>{room.trap.name}</span>
                </div>
                <span className="text-[11px] font-mono bg-[#181109] px-2 py-0.5 rounded border border-yellow-800/60 text-yellow-300">
                  DC {room.trap.difficulty}
                </span>
              </div>
              <p className="text-xs text-stone-300 font-serif mb-2.5">{room.trap.description}</p>

              {!room.trap.disarmed && !room.trap.triggered ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-serif text-amber-200/90 italic">
                    Choose your skill approach to deactivate the trap:
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Dexterity / Lockpick Disarm */}
                    <button
                      id="btn-trap-dex"
                      disabled={isRolling}
                      onClick={() => handleDisarmTrap('DEX')}
                      className="p-2 bg-[#332213] hover:bg-[#48301c] text-amber-200 border border-[#7a5836] rounded text-xs font-serif font-bold flex items-center justify-between cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="text-left">Dexterity Disarm</span>
                      </div>
                      <span className="font-mono text-[10px] text-cyan-300">
                        {getStatModifier(heroStats.DEX) + (hero.lockpicks > 0 ? 2 : 0) >= 0
                          ? `+${getStatModifier(heroStats.DEX) + (hero.lockpicks > 0 ? 2 : 0)}`
                          : getStatModifier(heroStats.DEX)}
                      </span>
                    </button>

                    {/* Intelligence Mechanism Analysis */}
                    <button
                      id="btn-trap-int"
                      disabled={isRolling}
                      onClick={() => handleDisarmTrap('INT')}
                      className="p-2 bg-[#332213] hover:bg-[#48301c] text-amber-200 border border-[#7a5836] rounded text-xs font-serif font-bold flex items-center justify-between cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center gap-1.5">
                        <Wand2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="text-left">Intelligence Analysis</span>
                      </div>
                      <span className="font-mono text-[10px] text-purple-300">
                        {getStatModifier(heroStats.INT) >= 0
                          ? `+${getStatModifier(heroStats.INT)}`
                          : getStatModifier(heroStats.INT)}
                      </span>
                    </button>

                    {/* Strength Jam Mechanism */}
                    <button
                      id="btn-trap-str"
                      disabled={isRolling}
                      onClick={() => handleDisarmTrap('STR')}
                      className="p-2 bg-[#332213] hover:bg-[#48301c] text-amber-200 border border-[#7a5836] rounded text-xs font-serif font-bold flex items-center justify-between cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center gap-1.5">
                        <Hammer className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span className="text-left">Strength Jam / Wedge</span>
                      </div>
                      <span className="font-mono text-[10px] text-orange-300">
                        {getStatModifier(heroStats.STR) >= 0
                          ? `+${getStatModifier(heroStats.STR)}`
                          : getStatModifier(heroStats.STR)}
                      </span>
                    </button>

                    {/* Luck Evasion */}
                    <button
                      id="btn-trap-lck"
                      disabled={isRolling}
                      onClick={() => handleDisarmTrap('LCK')}
                      className="p-2 bg-[#332213] hover:bg-[#48301c] text-amber-200 border border-[#7a5836] rounded text-xs font-serif font-bold flex items-center justify-between cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                        <span className="text-left">Fortune & Luck Leap</span>
                      </div>
                      <span className="font-mono text-[10px] text-yellow-300">
                        {getStatModifier(heroStats.LCK) >= 0
                          ? `+${getStatModifier(heroStats.LCK)}`
                          : getStatModifier(heroStats.LCK)}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-stone-400 font-serif italic">
                  {room.trap.disarmed ? '✓ Disarmed and safe to pass.' : '✖ Triggered and deactivated.'}
                </div>
              )}
            </div>
          )}

          {/* 4. Campfire Hearth */}
          {room.type === 'CAMPFIRE' && (
            <div className="bg-[#241a12] border-2 border-amber-700/70 rounded-xl p-4 shadow-lg text-stone-200">
              <div className="flex items-center gap-2 text-amber-400 font-serif font-bold text-sm mb-2">
                <Tent className="w-5 h-5 text-amber-500" />
                <span>Dungeon Hearth & Rest Spot</span>
              </div>
              <p className="text-xs text-stone-300 font-serif mb-3">
                Sheltered stone alcove where you can bandage battle wounds and cook provisions.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-rest-campfire"
                  onClick={handleCampfireRest}
                  className="py-2.5 px-3 bg-[#382617] hover:bg-[#4d3521] text-amber-200 border border-[#6b4c2b] rounded text-xs font-serif font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Heart className="w-4 h-4 text-red-400" />
                  <span>Rest & Bandage</span>
                </button>
                <button
                  id="btn-eat-ration"
                  disabled={hero.rations <= 0}
                  onClick={handleEatRation}
                  className="py-2.5 px-3 bg-[#382617] hover:bg-[#4d3521] text-amber-200 border border-[#6b4c2b] rounded text-xs font-serif font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                >
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Eat Rations ({hero.rations})</span>
                </button>
              </div>
            </div>
          )}

          {/* 5. Merchant Outpost */}
          {room.type === 'MERCHANT' && (
            <div className="bg-[#1c2419] border-2 border-emerald-700/70 rounded-xl p-4 shadow-lg text-stone-200">
              <div className="flex items-center gap-2 text-emerald-400 font-serif font-bold text-sm mb-2">
                <Store className="w-5 h-5 text-emerald-500" />
                <span>Olaf the Wandering Merchant</span>
              </div>
              <p className="text-xs text-stone-300 font-serif mb-3">
                “Welcome, traveler! My pack is full of potions, armor, pickaxes, and sharp steel.”
              </p>
              <button
                id="btn-open-merchant"
                onClick={onOpenMerchant}
                className="w-full py-2.5 bg-gradient-to-b from-[#29542a] to-[#1a381b] hover:from-[#356d36] hover:to-[#224723] text-emerald-100 font-serif font-bold text-sm rounded border border-emerald-500 shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Store className="w-4 h-4" />
                <span>TRADE WITH OLAF</span>
              </button>
            </div>
          )}

          {/* 6. Holy Shrine */}
          {room.shrine && (
            <div className="bg-[#1a2029] border-2 border-cyan-700/70 rounded-xl p-4 shadow-lg text-stone-200">
              <div className="flex items-center gap-2 text-cyan-300 font-serif font-bold text-sm mb-2">
                <Sun className="w-5 h-5 text-cyan-400" />
                <span>{room.shrine.name}</span>
              </div>
              <p className="text-xs text-stone-300 font-serif mb-3">{room.shrine.description}</p>
              {!room.shrine.used ? (
                <button
                  id="btn-pray-shrine"
                  onClick={handlePrayAtShrine}
                  className="w-full py-2.5 bg-[#253245] hover:bg-[#34455e] text-cyan-200 border border-[#486387] rounded text-xs font-serif font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Pray for Divine Blessing</span>
                </button>
              ) : (
                <div className="text-xs text-stone-400 font-serif italic">
                  The altar's celestial glow has faded into quiet stone.
                </div>
              )}
            </div>
          )}

          {/* 7. Secret Chamber */}
          {room.secret && (
            <div className="bg-[#241a29] border-2 border-purple-700/70 rounded-xl p-4 shadow-lg text-stone-200">
              <div className="flex items-center gap-2 text-purple-300 font-serif font-bold text-sm mb-1.5">
                <HelpCircle className="w-5 h-5 text-purple-400" />
                <span>Hidden Wall Compartment</span>
              </div>
              {!room.secret.discovered ? (
                <button
                  id="btn-search-secret"
                  disabled={isRolling}
                  onClick={handleSearchSecret}
                  className="w-full py-2.5 bg-[#362540] hover:bg-[#483354] text-purple-200 border border-[#68477a] rounded text-xs font-serif font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Dices className="w-4 h-4 text-purple-400" />
                  <span>Search Wall (INT/LCK vs DC {room.secret.difficulty})</span>
                </button>
              ) : (
                <div className="text-xs text-stone-400 font-serif italic">
                  ✓ Hidden compartment discovered and looted.
                </div>
              )}
            </div>
          )}

          {/* 8. Floor Descent Stairs (Boss Room) */}
          {room.hasStairs && (
            <div className="bg-[#1e1e2c] border-2 border-blue-600 rounded-xl p-4 shadow-lg text-stone-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-blue-300 font-serif font-bold text-sm">
                  <Footprints className="w-5 h-5 text-blue-400" />
                  <span>Spiral Descent Staircase</span>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    !room.monster || room.monster.hp <= 0
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                      : 'bg-red-950 text-red-300 border border-red-600'
                  }`}
                >
                  {!room.monster || room.monster.hp <= 0 ? 'UNLOCKED' : 'LOCKED BY BOSS'}
                </span>
              </div>

              <p className="text-xs text-stone-300 font-serif mb-3">
                {!room.monster || room.monster.hp <= 0
                  ? `The map boss has been defeated! The stone staircase opens downward into Floor ${
                      floor.floorNumber + 1
                    }.`
                  : `A heavy iron portcullis blocks the staircase. You must defeat ${room.monster.name} to unlock it.`}
              </p>

              {(!room.monster || room.monster.hp <= 0) && (
                <button
                  id="btn-descend-stairs"
                  onClick={onDescendFloor}
                  className="w-full py-2.5 bg-gradient-to-b from-[#2a3d66] to-[#182540] hover:from-[#354e82] hover:to-[#203154] text-blue-100 font-serif font-bold text-sm rounded border border-blue-400 shadow-md flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                >
                  <Footprints className="w-4 h-4" />
                  <span>
                    {floor.floorNumber === 3 ? 'CLAIM VICTORY & COMPLETE DUNGEON' : `DESCEND TO FLOOR ${floor.floorNumber + 1}`}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

      {/* Loot Roller Modal */}
      <LootRollerModal
        isOpen={showLootModal}
        title={lootSourceTitle}
        sourceDescription={lootSourceDesc}
        floorNumber={room.floor}
        guaranteedGold={pendingGuaranteedGold}
        bonusItems={pendingBonusItems}
        onClaimLoot={handleClaimChestLoot}
        onClose={() => setShowLootModal(false)}
      />

      {/* Focused Action Challenge Modal (Traps, Chests, Searches) */}
      <ActionChallengeModal
        isOpen={showChallengeModal}
        hero={hero}
        config={challengeConfig}
        onClose={() => {
          setShowChallengeModal(false);
          setChallengeConfig(null);
        }}
      />
    </div>
  );
};
