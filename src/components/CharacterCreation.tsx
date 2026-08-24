/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Shield,
  Zap,
  Sparkles,
  Sun,
  ShieldAlert,
  Target,
  Dices,
  RefreshCw,
  UserCheck,
  Heart,
  Wand2,
  Check,
  ChevronRight,
  HelpCircle,
  Coins,
  Key,
  Package,
} from 'lucide-react';
import { CharacterStats, HeroCharacter, HeroClassId, StatType } from '../types/game';
import { HERO_CLASSES } from '../data/classes';
import { ITEMS_DATABASE } from '../data/items';
import {
  CHARACTER_CLASS_TABLE,
  STARTING_BOON_TABLE,
  StartingBoon,
  lookupTableRow,
  TableRow,
} from '../data/tables';
import { LookupTableRoller } from './LookupTableRoller';
import { roll4d6DropLowest, getStatModifier, RollResult, rollDice } from '../utils/dice';
import { sounds } from '../utils/audio';
import { DieShape } from './DieShape';
import { DiceVisualizer } from './DiceVisualizer';

const FANTASY_NAMES = [
  'Alden the Bold',
  'Lyra Swiftfoot',
  'Theron of Highgate',
  'Elowen Starwatcher',
  'Garrick Stoneheart',
  'Vesper Shadowveil',
  'Bram the Undaunted',
  'Kaelen Ashveil',
  'Morgana Ironwill',
  'Finnian Silverbow',
  'Roland the Just',
  'Zephyr of the Peaks',
];

interface CharacterCreationProps {
  onCharacterCreated: (hero: HeroCharacter) => void;
}

type CreationStep = 'CLASS_ROLL' | 'STATS_ROLL' | 'BOON_ROLL' | 'FINALIZE';

const STAT_ORDER: { key: StatType; label: string; desc: string }[] = [
  { key: 'STR', label: 'Strength', desc: 'Melee weapon damage, physical checks & bash' },
  { key: 'DEX', label: 'Dexterity', desc: 'Agility, armor class bonus & trap disarm' },
  { key: 'CON', label: 'Constitution', desc: 'Health points, stamina & poison resilience' },
  { key: 'INT', label: 'Intelligence', desc: 'Arcane spell power, mana capacity & lore' },
  { key: 'LCK', label: 'Luck', desc: 'Critical strike chance & dungeon loot rolls' },
];

export const CharacterCreation: React.FC<CharacterCreationProps> = ({ onCharacterCreated }) => {
  const [currentStep, setCurrentStep] = useState<CreationStep>('CLASS_ROLL');
  const [rolledClassId, setRolledClassId] = useState<HeroClassId | null>(null);
  const [classRollDetails, setClassRollDetails] = useState<RollResult | null>(null);

  // Stat rolling state
  const [currentStatIndex, setCurrentStatIndex] = useState<number>(0);
  const [stats, setStats] = useState<CharacterStats>({
    STR: 10,
    DEX: 10,
    CON: 10,
    INT: 10,
    LCK: 10,
  });
  const [rolledStatBreakdowns, setRolledStatBreakdowns] = useState<
    Record<StatType, { rolls: number[]; dropped: number; total: number }>
  >({} as any);
  const [isRollingCurrentStat, setIsRollingCurrentStat] = useState(false);
  const [rollingStatKey, setRollingStatKey] = useState<StatType | null>(null);

  // Boon rolling state
  const [rolledBoon, setRolledBoon] = useState<StartingBoon | null>(null);
  const [boonRollNumber, setBoonRollNumber] = useState<number | null>(null);

  // Character Name
  const [characterName, setCharacterName] = useState('Alden the Bold');
  const [fateTokens, setFateTokens] = useState(2); // Tokens to reroll

  const selectedClass =
    HERO_CLASSES.find((c) => c.id === rolledClassId) || HERO_CLASSES[0];

  // 1. Handle Class Roll
  const handleClassRollComplete = (res: {
    roll: number;
    rollDetails: RollResult;
    selectedRow: TableRow<HeroClassId>;
  }) => {
    setRolledClassId(res.selectedRow.data);
    setClassRollDetails(res.rollDetails);
  };

  // 2. Handle Single Stat Roll (4d6 drop lowest)
  const handleRollSingleStat = (statKey: StatType, isFateReroll = false) => {
    if (isRollingCurrentStat) return;
    if (isFateReroll && fateTokens <= 0) return;

    setIsRollingCurrentStat(true);
    setRollingStatKey(statKey);
    if (isFateReroll) {
      setFateTokens((tokens) => Math.max(0, tokens - 1));
    }
    sounds.playDiceRoll();

    setTimeout(() => {
      const rollRes = roll4d6DropLowest();
      const rollsSorted = [...rollRes.rolls].sort((a, b) => a - b);
      const droppedValue = rollsSorted[0];

      setRolledStatBreakdowns((prev) => ({
        ...prev,
        [statKey]: {
          rolls: rollRes.rolls,
          dropped: droppedValue,
          total: rollRes.total,
        },
      }));

      setStats((prev) => ({
        ...prev,
        [statKey]: rollRes.total,
      }));

      setIsRollingCurrentStat(false);
      setRollingStatKey(null);
      sounds.playCoins();

      // If more stats to roll, advance index
      if (!isFateReroll && currentStatIndex < STAT_ORDER.length - 1) {
        setCurrentStatIndex((idx) => idx + 1);
      }
    }, 450);
  };

  // Roll All Stats in sequence quickly if player chooses
  const handleRollAllRemainingStats = () => {
    sounds.playDiceRoll();
    const newStats = { ...stats };
    const newBreakdowns = { ...rolledStatBreakdowns };

    STAT_ORDER.forEach(({ key }) => {
      const res = roll4d6DropLowest();
      const sorted = [...res.rolls].sort((a, b) => a - b);
      newBreakdowns[key] = {
        rolls: res.rolls,
        dropped: sorted[0],
        total: res.total,
      };
      newStats[key] = res.total;
    });

    setStats(newStats);
    setRolledStatBreakdowns(newBreakdowns);
    setCurrentStatIndex(STAT_ORDER.length - 1);
    sounds.playLoot();
  };

  // 3. Handle Starting Boon Roll
  const handleBoonRollComplete = (res: {
    roll: number;
    rollDetails: RollResult;
    selectedRow: TableRow<StartingBoon>;
  }) => {
    setBoonRollNumber(res.roll);
    setRolledBoon(res.selectedRow.data);
  };

  const handleRandomName = () => {
    sounds.playCoins();
    const random = FANTASY_NAMES[Math.floor(Math.random() * FANTASY_NAMES.length)];
    setCharacterName(random);
  };

  // Finalize Hero
  const handleStartAdventure = () => {
    sounds.playLevelUp();

    const conMod = getStatModifier(stats.CON);
    const intMod = getStatModifier(stats.INT);
    const maxHp = selectedClass.hpFormula.base + Math.max(0, conMod * 2);
    const maxMana = selectedClass.manaFormula.base + Math.max(0, intMod * 3);

    const equipment: HeroCharacter['equipment'] = {};
    const inventory: HeroCharacter['inventory'] = [];

    // Starting Class Gear
    selectedClass.startingEquipment.forEach((itemId) => {
      const item = ITEMS_DATABASE[itemId];
      if (!item) return;

      if (item.type === 'weapon' && !equipment.weapon) {
        equipment.weapon = item;
      } else if (item.type === 'shield' && !equipment.offhand) {
        equipment.offhand = item;
      } else if (item.type === 'armor' && !equipment.armor) {
        equipment.armor = item;
      } else if (item.type === 'helmet' && !equipment.helmet) {
        equipment.helmet = item;
      } else if (item.type === 'boots' && !equipment.boots) {
        equipment.boots = item;
      } else {
        inventory.push({ item, quantity: 1 });
      }
    });

    // Apply Boon
    let startingGold = selectedClass.startingGold;
    let extraLockpicks = 2;
    let extraRations = 3;
    let extraTorches = 2;
    let extraRerollTokens = 1;

    if (rolledBoon) {
      if (rolledBoon.type === 'gold') startingGold += rolledBoon.value;
      if (rolledBoon.type === 'lockpicks') extraLockpicks += rolledBoon.value;
      if (rolledBoon.type === 'supplies') {
        extraRations += 3;
        extraTorches += 2;
      }
      if (rolledBoon.type === 'tokens') extraRerollTokens += rolledBoon.value;
      if (rolledBoon.type === 'item' && rolledBoon.itemId) {
        const boonItem = ITEMS_DATABASE[rolledBoon.itemId];
        if (boonItem) {
          if (boonItem.type === 'amulet' && !equipment.amulet) {
            equipment.amulet = boonItem;
          } else {
            inventory.push({ item: boonItem, quantity: 1 });
          }
        }
      }
    }

    const hero: HeroCharacter = {
      name: characterName.trim() || 'Nameless Explorer',
      classId: selectedClass.id,
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      currentHp: maxHp,
      maxHp,
      currentMana: maxMana,
      maxMana,
      stats: { ...stats },
      baseStats: { ...stats },
      equipment,
      inventory,
      maxInventorySlots: 12,
      gold: startingGold,
      rerollTokens: extraRerollTokens,
      rations: extraRations,
      torches: extraTorches,
      lockpicks: extraLockpicks,
      skills: [...selectedClass.skills],
      activeEffects: [],
      statsHistory: {
        roomsExplored: 1,
        monstersSlain: 0,
        chestsOpened: 0,
        trapsDisarmed: 0,
        goldCollected: startingGold,
        highestDamageDealt: 0,
        critsRolled: 0,
        turnsSurvived: 0,
      },
    };

    onCharacterCreated(hero);
  };

  return (
    <div className="min-h-screen bg-[#0d0906] text-amber-100 flex flex-col justify-between p-4 md:p-8 font-sans selection:bg-amber-800 selection:text-amber-100">
      {/* Header */}
      <header className="max-w-4xl mx-auto w-full text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800/60 text-amber-300 text-xs font-mono mb-2">
          <Dices className="w-3.5 h-3.5" />
          Tabletop Dice Rolling System • Step-by-Step Creation
        </div>
        <h1 className="text-3xl md:text-5xl font-black font-serif text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 tracking-wide drop-shadow-md">
          DUNGEON DICE CRAWLER
        </h1>
        <p className="text-sm md:text-base text-stone-400 mt-1 max-w-xl mx-auto font-serif italic">
          Forge your hero through manual dice rolls on classic lookup tables.
        </p>

        {/* Step Indicator */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-4 max-w-2xl mx-auto">
          {[
            { id: 'CLASS_ROLL', label: '1. Class (1d6)' },
            { id: 'STATS_ROLL', label: '2. Stats (4d6)' },
            { id: 'BOON_ROLL', label: '3. Boon (1d6)' },
            { id: 'FINALIZE', label: '4. Embark' },
          ].map((s, idx) => {
            const stepKeys = ['CLASS_ROLL', 'STATS_ROLL', 'BOON_ROLL', 'FINALIZE'];
            const isActive = currentStep === s.id;
            const isDone = stepKeys.indexOf(currentStep) > idx;

            return (
              <div
                key={s.id}
                className={`text-center py-2 px-2 rounded-lg text-xs font-mono border transition-all ${
                  isActive
                    ? 'bg-amber-900/60 border-amber-400 text-amber-200 font-bold shadow-md'
                    : isDone
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
                    : 'bg-stone-900/40 border-stone-800 text-stone-500'
                }`}
              >
                <div className="truncate">{s.label}</div>
              </div>
            );
          })}
        </div>
      </header>

      {/* Main Content Step Container */}
      <main className="max-w-4xl mx-auto w-full flex-1 flex flex-col items-center justify-center">
        {/* ==================================================== */}
        {/* STEP 1: ROLL CLASS TABLE (1d6) */}
        {/* ==================================================== */}
        {currentStep === 'CLASS_ROLL' && (
          <div className="w-full space-y-4">
            <LookupTableRoller<HeroClassId>
              table={CHARACTER_CLASS_TABLE}
              title="Roll Adventurer Class Table"
              subtitle="Roll 1d6 to determine your class archetype, base health, mana, and starting gear."
              actionButtonLabel="Roll Archetype"
              canReroll={true}
              rerollTokens={fateTokens}
              onUseRerollToken={() => setFateTokens((t) => Math.max(0, t - 1))}
              onRollComplete={handleClassRollComplete}
            />

            {rolledClassId && (
              <div className="flex justify-end max-w-3xl mx-auto w-full">
                <button
                  onClick={() => setCurrentStep('STATS_ROLL')}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold rounded-lg shadow-xl flex items-center gap-2 text-sm transition-all cursor-pointer transform hover:scale-105"
                >
                  Confirm Class & Roll Attributes
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 2: ROLL STATS IN TURN (4d6 Drop Lowest) */}
        {/* ==================================================== */}
        {currentStep === 'STATS_ROLL' && (
          <div className="w-full max-w-3xl bg-[#18120c]/95 border-2 border-amber-800/60 rounded-xl p-5 shadow-2xl backdrop-blur-md text-amber-100">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/50 pb-4 mb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded bg-amber-950/80 border border-amber-700/60 text-amber-400 font-mono text-xs tracking-wider uppercase">
                  4d6 Drop Lowest Method
                </span>
                <h3 className="text-xl font-bold font-serif text-amber-200 mt-1">
                  Roll Core Attributes for {selectedClass.name}
                </h3>
                <p className="text-xs text-amber-400/80 mt-0.5">
                  Roll 4 six-sided dice for each attribute in turn, discarding the lowest die.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRollAllRemainingStats}
                  className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Dices className="w-3.5 h-3.5" />
                  Roll All Remaining
                </button>
              </div>
            </div>

            {/* Active Rolling 4d6 Tray if rolling single stat */}
            {isRollingCurrentStat && (
              <div className="mb-4">
                <DiceVisualizer
                  isRolling={true}
                  allowCustomDice={false}
                  label={`Rolling 4d6 for ${rollingStatKey} (${STAT_ORDER.find((stat) => stat.key === rollingStatKey)?.label})`}
                  currentRoll={{
                    diceCount: 4,
                    diceSides: 6,
                    modifier: 0,
                    individualRolls: [
                      Math.floor(Math.random() * 6) + 1,
                      Math.floor(Math.random() * 6) + 1,
                      Math.floor(Math.random() * 6) + 1,
                      Math.floor(Math.random() * 6) + 1,
                    ],
                    total: 0,
                    formulaString: '4d6 (Drop Lowest)',
                    isCrit: false,
                    isFumble: false,
                  }}
                />
              </div>
            )}

            {/* Attributes List */}
            <div className="space-y-3">
              {STAT_ORDER.map((item, idx) => {
                const statKey = item.key;
                const isCurrent = idx === currentStatIndex;
                const isRolled = rolledStatBreakdowns[statKey] !== undefined;
                const currentBreakdown = rolledStatBreakdowns[statKey];
                const value = stats[statKey];
                const modifier = getStatModifier(value);
                const isPrimary = selectedClass.primaryStat === statKey;

                return (
                  <div
                    key={statKey}
                    className={`p-3.5 rounded-lg border transition-all ${
                      isCurrent && !isRolled
                        ? 'bg-amber-900/40 border-amber-400 ring-1 ring-amber-400/50'
                        : isRolled
                        ? 'bg-stone-900/70 border-stone-800'
                        : 'bg-stone-950/40 border-stone-900 opacity-60'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* Left: Stat Name & Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-stone-900 border border-amber-800/80 flex items-center justify-center font-serif font-bold text-amber-300 text-sm">
                          {statKey}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-stone-200 text-sm">
                              {item.label}
                            </span>
                            {isPrimary && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-900/80 border border-amber-600 text-amber-300 uppercase">
                                Primary Stat
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-400">{item.desc}</p>
                        </div>
                      </div>

                      {/* Right: Roll Controls or Results */}
                      <div className="flex items-center gap-3">
                        {isRolled ? (
                          <div className="flex items-center gap-3">
                            {/* Dice breakdown with Google Die shapes */}
                            <div className="flex items-center gap-1.5">
                              {currentBreakdown.rolls.map((d, dIdx) => {
                                const isLowest = d === currentBreakdown.dropped;
                                return (
                                  <DieShape
                                    key={dIdx}
                                    sides={6}
                                    value={d}
                                    size="sm"
                                    isDropped={isLowest}
                                  />
                                );
                              })}
                            </div>

                            {/* Total Value */}
                            <div className="text-right pl-2 border-l border-stone-700">
                              <div className="text-xl font-black font-mono text-cyan-300">
                                {value}
                              </div>
                              <div className="text-[10px] font-mono text-amber-400/90 font-bold">
                                Mod: {modifier >= 0 ? `+${modifier}` : modifier}
                              </div>
                            </div>

                            {fateTokens > 0 && (
                              <button
                                onClick={() => handleRollSingleStat(statKey, true)}
                                disabled={isRollingCurrentStat}
                                title={`Spend a Fate token to reroll ${item.label}`}
                                className="px-2.5 py-1.5 bg-purple-950/70 hover:bg-purple-900 border border-purple-700/70 text-purple-200 font-bold rounded-lg text-[11px] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Fate Reroll
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRollSingleStat(statKey)}
                            disabled={isRollingCurrentStat}
                            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 text-stone-950 font-bold rounded-lg shadow-md text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Dices className={`w-3.5 h-3.5 ${isRollingCurrentStat ? 'animate-spin' : ''}`} />
                            Roll {statKey} (4d6)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Next Step Button */}
            {Object.keys(rolledStatBreakdowns).length >= 5 && (
              <div className="flex items-center justify-between border-t border-amber-900/50 pt-4 mt-4">
                <button
                  onClick={() => setCurrentStep('CLASS_ROLL')}
                  className="text-xs text-stone-400 hover:text-stone-200 transition-colors"
                >
                  ← Back to Class
                </button>
                <button
                  onClick={() => setCurrentStep('BOON_ROLL')}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 text-stone-950 font-bold rounded-lg shadow-xl flex items-center gap-2 text-sm transition-all cursor-pointer transform hover:scale-105"
                >
                  Confirm Stats & Roll Heirloom Boon
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 3: ROLL STARTING BOON TABLE (1d6) */}
        {/* ==================================================== */}
        {currentStep === 'BOON_ROLL' && (
          <div className="w-full space-y-4">
            <LookupTableRoller<StartingBoon>
              table={STARTING_BOON_TABLE}
              title="Roll Starting Heirloom Boon Table"
              subtitle="Roll 1d6 to inherit a family heirloom, extra gold, lockpicks, or protective amulets."
              actionButtonLabel="Roll Heirloom"
              canReroll={true}
              rerollTokens={fateTokens}
              onUseRerollToken={() => setFateTokens((t) => Math.max(0, t - 1))}
              onRollComplete={handleBoonRollComplete}
            />

            {rolledBoon && (
              <div className="flex items-center justify-between max-w-3xl mx-auto w-full">
                <button
                  onClick={() => setCurrentStep('STATS_ROLL')}
                  className="text-xs text-stone-400 hover:text-stone-200 transition-colors"
                >
                  ← Back to Stats
                </button>
                <button
                  onClick={() => setCurrentStep('FINALIZE')}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 text-stone-950 font-bold rounded-lg shadow-xl flex items-center gap-2 text-sm transition-all cursor-pointer transform hover:scale-105"
                >
                  Finalize Adventurer
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 4: FINALIZE CHARACTER & ENTER DUNGEON */}
        {/* ==================================================== */}
        {currentStep === 'FINALIZE' && (
          <div className="w-full max-w-3xl bg-[#18120c]/95 border-2 border-amber-800/60 rounded-xl p-6 shadow-2xl backdrop-blur-md text-amber-100 space-y-6">
            <div className="border-b border-amber-900/50 pb-4">
              <span className="px-2.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 font-mono text-xs uppercase">
                Character Summary & Parchment
              </span>
              <h3 className="text-2xl font-bold font-serif text-amber-200 mt-1">
                Name Your Adventurer
              </h3>
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-amber-300/80 uppercase">
                Hero Name / Epithet
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  className="flex-1 bg-stone-900/90 border-2 border-amber-800/80 rounded-lg px-4 py-2.5 text-amber-100 font-serif text-lg focus:outline-none focus:border-amber-400"
                  placeholder="Enter adventurer name..."
                />
                <button
                  onClick={handleRandomName}
                  className="px-3.5 py-2.5 bg-stone-900 hover:bg-stone-800 border border-amber-700/60 text-amber-300 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Random
                </button>
              </div>
            </div>

            {/* Character Snapshot Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-stone-900/60 border border-amber-900/60">
              <div>
                <div className="text-xs font-mono text-stone-400">CLASS & ARCHETYPE</div>
                <div className="text-lg font-serif font-bold text-amber-200">
                  {selectedClass.name}
                </div>
                <div className="text-xs text-amber-400/80">{selectedClass.title}</div>
                <div className="mt-3 text-xs font-mono text-stone-400">INHERITED BOON</div>
                <div className="text-xs text-emerald-300 font-semibold">
                  {rolledBoon?.grantText || 'Ancestral Pouch'}
                </div>
              </div>

              <div>
                <div className="text-xs font-mono text-stone-400 mb-1.5">ABILITY SCORES</div>
                <div className="grid grid-cols-5 gap-1.5 text-center font-mono">
                  {STAT_ORDER.map(({ key }) => (
                    <div key={key} className="p-1.5 bg-stone-950 rounded border border-stone-800">
                      <div className="text-[10px] text-stone-400">{key}</div>
                      <div className="text-sm font-bold text-amber-300">{stats[key]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between border-t border-amber-900/50 pt-4">
              <button
                onClick={() => setCurrentStep('BOON_ROLL')}
                className="text-xs text-stone-400 hover:text-stone-200 transition-colors"
              >
                ← Back to Boon
              </button>
              <button
                onClick={handleStartAdventure}
                className="px-8 py-3 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-black font-serif tracking-wider text-base rounded-xl shadow-2xl transition-all cursor-pointer transform hover:scale-105 flex items-center gap-2"
              >
                <UserCheck className="w-5 h-5" />
                ENTER THE DUNGEON
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-stone-500 font-mono mt-6">
        Dungeon Dice Crawler • Solo Tabletop Simulator
      </footer>
    </div>
  );
};
