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
  Coins,
  Key,
  Package,
  Sword,
  Flame,
  ArrowRight,
  Sparkle,
  Hammer,
  Shirt,
  ShieldCheck,
  Crown,
  Footprints,
  BookOpen,
} from 'lucide-react';
import { CharacterStats, HeroCharacter, HeroClassId, StatType } from '../types/game';
import { HERO_CLASSES } from '../data/classes';
import { ITEMS_DATABASE } from '../data/items';
import { syncHeroSupplies } from '../utils/inventory';
import {
  CHARACTER_CLASS_TABLE,
  STARTING_BOON_TABLE,
  StartingBoon,
  TableRow,
} from '../data/tables';
import { LookupTableRoller } from './LookupTableRoller';
import { roll4d6DropLowest, getStatModifier, RollResult } from '../utils/dice';
import { sounds } from '../utils/audio';
import { DieShape } from './DieShape';
import { DiceVisualizer } from './DiceVisualizer';

const FANTASY_NAMES: Record<HeroClassId, string[]> = {
  warrior: ['Alden Ironbreaker', 'Garrick Stoneheart', 'Bram the Undaunted', 'Valerius of the Vanguard', 'Theron Bloodaxe'],
  rogue: ['Lyra Swiftfoot', 'Vesper Shadowveil', 'Kaelen Nightshade', 'Corvin Daggerfall', 'Sariel Lockpick'],
  wizard: ['Elowen Starwatcher', 'Theron Spellweaver', 'Zephyr of the Peaks', 'Ignis Flamebearer', 'Morwen Arcane'],
  cleric: ['Brother Matthew', 'Elysia the Devout', 'Althea of the Dawn', 'Cedric Lightbringer', 'Gideon the Pure'],
  paladin: ['Sir Roland the Just', 'Morgana Ironwill', 'Lucian Sunshield', 'Lady Vivienne', 'Arthur Goldenheart'],
  ranger: ['Finnian Silverbow', 'Hawthorne Trailfinder', 'Sylvia Wildwood', 'Ronan Bowstrider', 'Talon Keeneye'],
};

interface CharacterCreationProps {
  onCharacterCreated: (hero: HeroCharacter) => void;
}

type CreationStep = 'CLASS_SELECT' | 'STATS_ROLL' | 'BOON_ROLL' | 'FINALIZE';

const STAT_ORDER: { key: StatType; label: string; desc: string }[] = [
  { key: 'STR', label: 'Strength', desc: 'Melee weapon damage, physical checks & bash' },
  { key: 'DEX', label: 'Dexterity', desc: 'Agility, armor class bonus & trap disarm' },
  { key: 'CON', label: 'Constitution', desc: 'Health points, stamina & poison resilience' },
  { key: 'INT', label: 'Intelligence', desc: 'Arcane spell power, mana capacity & lore' },
  { key: 'LCK', label: 'Luck', desc: 'Critical strike chance & dungeon loot rolls' },
];

export const CharacterCreation: React.FC<CharacterCreationProps> = ({ onCharacterCreated }) => {
  const [currentStep, setCurrentStep] = useState<CreationStep>('CLASS_SELECT');
  const [selectedClassId, setSelectedClassId] = useState<HeroClassId>('warrior');

  const selectedClass =
    HERO_CLASSES.find((c) => c.id === selectedClassId) || HERO_CLASSES[0];

  // Stat rolling state (4d6 drop lowest + class archetype boost)
  const [stats, setStats] = useState<CharacterStats>(() => ({ ...selectedClass.baseStats }));
  const [rolledStatBreakdowns, setRolledStatBreakdowns] = useState<
    Record<StatType, { rolls: number[]; dropped: number; subtotal: number; classBonus: number; total: number }>
  >({} as any);
  const [isRollingCurrentStat, setIsRollingCurrentStat] = useState(false);
  const [rollingStatKey, setRollingStatKey] = useState<StatType | null>(null);
  const [hasRolledAllStats, setHasRolledAllStats] = useState(false);

  // Boon table rolling state (1d6 table roll)
  const [rolledBoon, setRolledBoon] = useState<StartingBoon | null>(null);
  const [hasRolledBoon, setHasRolledBoon] = useState(false);

  // Character Name & Fate Tokens
  const [characterName, setCharacterName] = useState('Alden Ironbreaker');
  const [fateTokens, setFateTokens] = useState(2);

  // Helper to choose class
  const handleSelectClass = (classId: HeroClassId) => {
    setSelectedClassId(classId);
    sounds.playBlock();

    const newClass = HERO_CLASSES.find((c) => c.id === classId) || HERO_CLASSES[0];
    setStats({ ...newClass.baseStats });
    setRolledStatBreakdowns({} as any);
    setHasRolledAllStats(false);

    const nameList = FANTASY_NAMES[classId] || FANTASY_NAMES.warrior;
    setCharacterName(nameList[Math.floor(Math.random() * nameList.length)]);
  };

  // Roll Single Stat (4d6 drop lowest + Class Boost)
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
      const subtotal = rollRes.total;
      const classBonus = selectedClass.statBonuses?.[statKey] || 0;
      const finalTotal = subtotal + classBonus;

      const newBreakdowns = {
        ...rolledStatBreakdowns,
        [statKey]: {
          rolls: rollRes.rolls,
          dropped: droppedValue,
          subtotal,
          classBonus,
          total: finalTotal,
        },
      };
      setRolledStatBreakdowns(newBreakdowns);

      const newStats = {
        ...stats,
        [statKey]: finalTotal,
      };
      setStats(newStats);

      setIsRollingCurrentStat(false);
      setRollingStatKey(null);
      sounds.playCoins();

      // Check if all 5 stats are rolled
      const allRolled = STAT_ORDER.every((s) => newBreakdowns[s.key] !== undefined);
      if (allRolled) {
        setHasRolledAllStats(true);
      }
    }, 450);
  };

  // Roll all remaining attributes in turn
  const handleRollAllStatsInTurn = () => {
    if (isRollingCurrentStat) return;
    setIsRollingCurrentStat(true);
    sounds.playDiceRoll();

    const newBreakdowns: Record<StatType, { rolls: number[]; dropped: number; subtotal: number; classBonus: number; total: number }> = {
      ...rolledStatBreakdowns,
    };
    const newStats: CharacterStats = { ...stats };

    STAT_ORDER.forEach((item) => {
      const rollRes = roll4d6DropLowest();
      const rollsSorted = [...rollRes.rolls].sort((a, b) => a - b);
      const droppedValue = rollsSorted[0];
      const subtotal = rollRes.total;
      const classBonus = selectedClass.statBonuses?.[item.key] || 0;
      const finalTotal = subtotal + classBonus;

      newBreakdowns[item.key] = {
        rolls: rollRes.rolls,
        dropped: droppedValue,
        subtotal,
        classBonus,
        total: finalTotal,
      };
      newStats[item.key] = finalTotal;
    });

    setTimeout(() => {
      setRolledStatBreakdowns(newBreakdowns);
      setStats(newStats);
      setHasRolledAllStats(true);
      setIsRollingCurrentStat(false);
      setRollingStatKey(null);
      sounds.playCoins();
    }, 550);
  };

  // Handle Starting Boon Roll Complete
  const handleBoonRollComplete = (res: {
    roll: number;
    rollDetails: RollResult;
    selectedRow: TableRow<StartingBoon>;
  }) => {
    setRolledBoon(res.selectedRow.data);
    setHasRolledBoon(true);
    sounds.playCoins();
  };

  const handleRandomName = () => {
    sounds.playCoins();
    const names = FANTASY_NAMES[selectedClassId] || FANTASY_NAMES.warrior;
    const random = names[Math.floor(Math.random() * names.length)];
    setCharacterName(random);
  };

  // Finalize Hero & Enter Dungeon
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
      } else if (item.type === 'ring' && !equipment.ring) {
        equipment.ring = item;
      } else if (item.type === 'amulet' && !equipment.amulet) {
        equipment.amulet = item;
      } else {
        inventory.push({ item, quantity: 1 });
      }
    });

    // Apply Boon
    let startingGold = selectedClass.startingGold;
    let extraLockpicks = selectedClassId === 'rogue' ? 3 : 2;
    let extraRations = 3;
    let extraTorches = 2;
    let extraRerollTokens = selectedClassId === 'rogue' ? 2 : 1;

    const activeBoon = rolledBoon || STARTING_BOON_TABLE.rows[0].data;

    if (activeBoon) {
      if (activeBoon.type === 'gold') startingGold += activeBoon.value;
      if (activeBoon.type === 'lockpicks') extraLockpicks += activeBoon.value;
      if (activeBoon.type === 'supplies') {
        extraRations += 3;
        extraTorches += 2;
      }
      if (activeBoon.type === 'tokens') extraRerollTokens += activeBoon.value;
      if (activeBoon.type === 'item' && activeBoon.itemId) {
        const boonItem = ITEMS_DATABASE[activeBoon.itemId];
        if (boonItem) {
          if (boonItem.type === 'amulet' && !equipment.amulet) {
            equipment.amulet = boonItem;
          } else {
            inventory.push({ item: boonItem, quantity: 1 });
          }
        }
      }
    }

    // Add physical supplies into backpack inventory (each takes 1 slot)
    for (let i = 0; i < extraRations; i++) {
      if (ITEMS_DATABASE['dungeon_ration']) {
        inventory.push({ item: ITEMS_DATABASE['dungeon_ration'], quantity: 1 });
      }
    }
    for (let i = 0; i < extraLockpicks; i++) {
      if (ITEMS_DATABASE['iron_lockpick']) {
        inventory.push({ item: ITEMS_DATABASE['iron_lockpick'], quantity: 1 });
      }
    }
    for (let i = 0; i < extraTorches; i++) {
      if (ITEMS_DATABASE['dungeon_torch']) {
        inventory.push({ item: ITEMS_DATABASE['dungeon_torch'], quantity: 1 });
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
      maxInventorySlots: 15,
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

    syncHeroSupplies(hero);
    onCharacterCreated(hero);
  };

  const getClassIcon = (iconName: string) => {
    switch (iconName) {
      case 'Shield':
        return <Shield className="w-6 h-6" />;
      case 'Zap':
        return <Zap className="w-6 h-6" />;
      case 'Sparkles':
        return <Sparkles className="w-6 h-6" />;
      case 'Sun':
        return <Sun className="w-6 h-6" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-6 h-6" />;
      case 'Target':
        return <Target className="w-6 h-6" />;
      default:
        return <Sword className="w-6 h-6" />;
    }
  };

  const getGearIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sword':
        return <Sword className="w-3.5 h-3.5" />;
      case 'Shield':
        return <Shield className="w-3.5 h-3.5" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-3.5 h-3.5" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-3.5 h-3.5" />;
      case 'Zap':
        return <Zap className="w-3.5 h-3.5" />;
      case 'Wand':
        return <Wand2 className="w-3.5 h-3.5" />;
      case 'Target':
        return <Target className="w-3.5 h-3.5" />;
      case 'Hammer':
        return <Hammer className="w-3.5 h-3.5" />;
      case 'Shirt':
        return <Shirt className="w-3.5 h-3.5" />;
      case 'Crown':
        return <Crown className="w-3.5 h-3.5" />;
      case 'Footprints':
        return <Footprints className="w-3.5 h-3.5" />;
      case 'Key':
        return <Key className="w-3.5 h-3.5" />;
      case 'BookOpen':
        return <BookOpen className="w-3.5 h-3.5" />;
      case 'Sparkles':
        return <Sparkles className="w-3.5 h-3.5" />;
      default:
        return <Package className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0906] text-amber-100 flex flex-col justify-between p-4 md:p-8 font-sans selection:bg-amber-800 selection:text-amber-100">
      {/* Header */}
      <header className="max-w-4xl mx-auto w-full text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800/60 text-amber-300 text-xs font-mono mb-2">
          <Dices className="w-3.5 h-3.5" />
          Old School Tabletop Adventurer Creation
        </div>
        <h1 className="text-3xl md:text-5xl font-black font-serif text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 tracking-wide drop-shadow-md">
          CHOOSE YOUR ADVENTURER
        </h1>
        <p className="text-sm md:text-base text-stone-400 mt-1 max-w-xl mx-auto font-serif italic">
          Select your class archetype, roll your attributes (4d6 drop lowest + class archetype boost), and roll for your starting heirloom.
        </p>

        {/* Step Indicator */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-4 max-w-2xl mx-auto">
          {[
            { id: 'CLASS_SELECT', label: '1. Choose Class' },
            { id: 'STATS_ROLL', label: '2. Roll Attributes' },
            { id: 'BOON_ROLL', label: '3. Roll Heirloom' },
            { id: 'FINALIZE', label: '4. Embark' },
          ].map((s, idx) => {
            const stepKeys = ['CLASS_SELECT', 'STATS_ROLL', 'BOON_ROLL', 'FINALIZE'];
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
        {/* STEP 1: CHOOSE CLASS (Visual Card Gallery) */}
        {/* ==================================================== */}
        {currentStep === 'CLASS_SELECT' && (
          <div className="w-full space-y-4">
            <div className="text-center mb-1">
              <span className="text-xs font-mono text-amber-400 uppercase font-bold tracking-wider">
                Step 1: Select Adventurer Archetype
              </span>
              <h2 className="text-xl md:text-2xl font-serif font-black text-amber-200">
                Choose Your Hero Class
              </h2>
            </div>

            {/* 6 Class Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {HERO_CLASSES.map((heroClass) => {
                const isSelected = selectedClassId === heroClass.id;
                const bonusesList = Object.entries(heroClass.statBonuses || {})
                  .map(([st, val]) => `+${val} ${st}`)
                  .join(', ');

                return (
                  <button
                    key={heroClass.id}
                    id={`btn-select-class-${heroClass.id}`}
                    onClick={() => handleSelectClass(heroClass.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer relative flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-gradient-to-b from-[#2a1a0f] to-[#1a110a] border-amber-400 ring-2 ring-amber-400/40 shadow-xl scale-[1.02]'
                        : 'bg-[#16100a]/90 border-amber-900/50 hover:border-amber-700/80 hover:bg-[#1f150d]'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 p-1 rounded-full bg-amber-500 text-stone-950 shadow">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`p-2.5 rounded-lg border flex items-center justify-center transition-transform group-hover:scale-105 ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-stone-900 border-amber-900/60 text-stone-400'
                          }`}
                        >
                          {getClassIcon(heroClass.icon)}
                        </div>
                        <div>
                          <h3 className="font-serif font-black text-base text-amber-100 leading-tight">
                            {heroClass.name}
                          </h3>
                          <span className="text-[11px] font-mono text-amber-400/80 block">
                            {heroClass.title}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-stone-300 font-serif leading-relaxed mb-3">
                        {heroClass.description}
                      </p>

                      {/* Starting Equipment Highlight Box */}
                      <div className="mb-3 p-2 rounded-lg bg-stone-950/80 border border-amber-950 text-[11px] space-y-1">
                        <div className="text-[10px] font-mono font-bold text-amber-400/90 uppercase tracking-wider flex items-center gap-1">
                          <Sword className="w-3 h-3 text-amber-400" />
                          <span>Starting Arsenal & Gear</span>
                        </div>
                        {heroClass.gearHighlights.map((gear, gIdx) => (
                          <div key={gIdx} className="flex items-center justify-between gap-1 text-stone-300">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-amber-400">{getGearIcon(gear.icon)}</span>
                              <span className="font-medium truncate">{gear.name}</span>
                            </div>
                            <span className="text-[10px] font-mono text-amber-300/80 shrink-0 font-bold">
                              {gear.bonus}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-amber-900/40 text-[11px] font-mono">
                      <div className="flex justify-between items-center">
                        <span className="text-stone-400">Primary Stat:</span>
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-700 text-amber-300 font-bold">
                            {heroClass.primaryStat} (+{heroClass.primaryStatBoost} Boost)
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-stone-400">
                        <span>Stat Boosts:</span>
                        <span className="text-emerald-400 font-bold">
                          {bonusesList}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-stone-400">
                        <span>Base HP / Mana:</span>
                        <span className="text-stone-300 font-bold">
                          {heroClass.hpFormula.base} HP / {heroClass.manaFormula.base} MP
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-stone-400">
                        <span>Starting Gold:</span>
                        <span className="text-yellow-400 font-bold">
                          {heroClass.startingGold} Gold
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Class Details Preview & Proceed Button */}
            <div className="bg-[#18120c]/95 border-2 border-amber-700/80 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 border border-amber-500 rounded-xl text-amber-400 shrink-0">
                  {getClassIcon(selectedClass.icon)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-amber-400 uppercase font-bold">
                      Selected Hero Class
                    </span>
                    <span className="text-xs font-serif text-stone-400">• {selectedClass.title}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-700 text-amber-300 text-[10px] font-mono font-bold">
                      Primary {selectedClass.primaryStat} (+{selectedClass.primaryStatBoost} Boost)
                    </span>
                  </div>
                  <h4 className="text-xl font-serif font-black text-amber-200">
                    {selectedClass.name}
                  </h4>
                  <p className="text-xs text-stone-300 mt-0.5">
                    Starting Loadout: {selectedClass.startingEquipment.map((id) => ITEMS_DATABASE[id]?.name || id).join(', ')}
                  </p>
                </div>
              </div>

              <button
                id="btn-confirm-chosen-class"
                onClick={() => {
                  setCurrentStep('STATS_ROLL');
                }}
                className="px-6 py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 text-stone-950 font-serif font-black rounded-xl shadow-xl flex items-center gap-2 text-sm transition-all cursor-pointer transform hover:scale-105 shrink-0"
              >
                <span>Confirm {selectedClass.name} & Roll Boosted Attributes</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 2: ROLL ATTRIBUTES IN TURN (4d6 Drop Lowest + Class Boost) */}
        {/* ==================================================== */}
        {currentStep === 'STATS_ROLL' && (() => {
          const rolledCount = STAT_ORDER.filter((s) => rolledStatBreakdowns[s.key] !== undefined).length;
          const nextStatToRoll = STAT_ORDER.find((s) => rolledStatBreakdowns[s.key] === undefined);
          const allRolled = rolledCount === STAT_ORDER.length;

          return (
            <div className="w-full max-w-3xl bg-[#18120c]/95 border-2 border-amber-800/60 rounded-xl p-5 shadow-2xl backdrop-blur-md text-amber-100 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/50 pb-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded bg-amber-950/80 border border-amber-700/60 text-amber-400 font-mono text-xs tracking-wider uppercase">
                    Step 2: Roll Ability Scores (4d6 Drop Lowest + Archetype Boost)
                  </span>
                  <h3 className="text-xl font-bold font-serif text-amber-200 mt-1">
                    Rolling Attributes for {selectedClass.name}
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Roll 4d6 (drop the lowest die) for each stat, plus <span className="text-amber-300 font-bold">+{selectedClass.primaryStatBoost} {selectedClass.name} Primary Boost</span> on your defining attributes.
                  </p>
                </div>

                {/* Fate Tokens Indicator & Progress */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/80 border border-purple-800 text-purple-300 text-xs font-mono">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Fate Tokens: {fateTokens}</span>
                  </div>

                  <div className="px-3 py-1.5 rounded-lg bg-stone-900 border border-amber-900/60 text-amber-300 text-xs font-mono font-bold">
                    {rolledCount}/5 Rolled
                  </div>
                </div>
              </div>

              {/* Turn Sequence Steps Bar */}
              <div className="grid grid-cols-5 gap-1.5 p-2 bg-stone-950/80 rounded-xl border border-amber-950">
                {STAT_ORDER.map((item, idx) => {
                  const isDone = rolledStatBreakdowns[item.key] !== undefined;
                  const isCurrent = nextStatToRoll?.key === item.key;
                  const val = stats[item.key];
                  const bonus = selectedClass.statBonuses?.[item.key] || 0;

                  return (
                    <div
                      key={item.key}
                      className={`text-center py-1.5 px-1 rounded-lg border text-xs font-mono transition-all ${
                        isDone
                          ? 'bg-amber-950/40 border-amber-700/80 text-amber-200'
                          : isCurrent
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/60 animate-pulse'
                          : 'bg-stone-900/40 border-stone-800 text-stone-500'
                      }`}
                    >
                      <div className="text-[10px] font-bold">
                        {idx + 1}. {item.key} {bonus > 0 && <span className="text-amber-400">(+{bonus})</span>}
                      </div>
                      <div className="text-xs font-black mt-0.5">
                        {isDone ? `${val} (✓)` : isCurrent ? '➔ Roll' : 'Pending'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Stat Next-In-Turn Callout Banner */}
              {nextStatToRoll ? (
                <div className="bg-gradient-to-r from-amber-950/80 via-stone-900 to-amber-950/80 border border-amber-600/70 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500 text-amber-400 flex items-center justify-center font-serif font-black text-base animate-pulse shrink-0">
                      {nextStatToRoll.key}
                    </div>
                    <div>
                      <div className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <span>Current Stat in Turn ({rolledCount + 1} of 5)</span>
                        {(selectedClass.statBonuses?.[nextStatToRoll.key] || 0) > 0 && (
                          <span className="text-emerald-400 font-bold">
                            (+{selectedClass.statBonuses?.[nextStatToRoll.key]} {selectedClass.name} Boost)
                          </span>
                        )}
                      </div>
                      <div className="text-sm md:text-base font-serif font-bold text-amber-100">
                        Roll for {nextStatToRoll.label} (4d6 drop lowest + class bonus)
                      </div>
                      <div className="text-xs text-stone-400">
                        {nextStatToRoll.desc}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      id={`btn-roll-active-stat-${nextStatToRoll.key}`}
                      onClick={() => handleRollSingleStat(nextStatToRoll.key)}
                      disabled={isRollingCurrentStat}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-serif font-black rounded-lg text-xs md:text-sm flex items-center gap-2 shadow cursor-pointer transition-all shrink-0 hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                      <Dices className="w-4 h-4" />
                      <span>Roll {nextStatToRoll.label}</span>
                    </button>
                    {!allRolled && (
                      <button
                        id="btn-fast-roll-all-stats"
                        onClick={handleRollAllStatsInTurn}
                        disabled={isRollingCurrentStat}
                        className="px-3 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-xs rounded-lg border border-stone-600 flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                        title="Roll all 5 stats automatically"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Roll All</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-950/50 border border-emerald-700/60 rounded-xl p-3.5 flex items-center justify-between gap-3 text-emerald-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                      ✓
                    </div>
                    <div>
                      <div className="text-sm font-bold font-serif text-emerald-300">All 5 Attributes Rolled & Boosted!</div>
                      <div className="text-xs text-stone-300">
                        Class archetype bonuses have been added. You may spend Fate Tokens to reroll any attribute if desired, or proceed to the Heirloom Table.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Rolling 4d6 Visualizer Tray */}
              {isRollingCurrentStat && (
                <div className="mb-2">
                  <DiceVisualizer
                    isRolling={true}
                    allowCustomDice={false}
                    label={`Rolling 4d6 for ${rollingStatKey ? `${rollingStatKey} (${STAT_ORDER.find((s) => s.key === rollingStatKey)?.label})` : 'Attributes'}...`}
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
              <div className="space-y-2.5">
                {STAT_ORDER.map((item, idx) => {
                  const statKey = item.key;
                  const isRolled = rolledStatBreakdowns[statKey] !== undefined;
                  const isCurrentTurn = nextStatToRoll?.key === statKey;
                  const currentBreakdown = rolledStatBreakdowns[statKey];
                  const value = stats[statKey];
                  const modifier = getStatModifier(value);
                  const isPrimary = selectedClass.primaryStat === statKey;
                  const classBonus = selectedClass.statBonuses?.[statKey] || 0;

                  return (
                    <div
                      key={statKey}
                      className={`p-3 rounded-lg border transition-all ${
                        isCurrentTurn
                          ? 'bg-[#2b1c10] border-amber-500 shadow-md ring-1 ring-amber-500/60'
                          : isPrimary
                          ? 'bg-[#22160d] border-amber-600/80 shadow-md'
                          : 'bg-stone-950/60 border-stone-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Left: Stat Name & Info */}
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center font-serif font-bold text-sm ${
                            isCurrentTurn
                              ? 'bg-amber-600/30 border-amber-500 text-amber-200'
                              : isRolled
                              ? 'bg-stone-900 border-amber-800/80 text-amber-300'
                              : 'bg-stone-950 border-stone-800 text-stone-500'
                          }`}>
                            {statKey}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-serif font-bold text-stone-200 text-sm">
                                {idx + 1}. {item.label}
                              </span>
                              {isPrimary && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-900/80 border border-amber-600 text-amber-300 uppercase">
                                  Primary (+{selectedClass.primaryStatBoost} Boost)
                                </span>
                              )}
                              {!isPrimary && classBonus > 0 && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-950 border border-emerald-700 text-emerald-400 uppercase">
                                  +{classBonus} Archetype
                                </span>
                              )}
                              {isCurrentTurn && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/30 border border-amber-400 text-amber-300 uppercase animate-pulse">
                                  Active Turn
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-400">{item.desc}</p>
                          </div>
                        </div>

                        {/* Right: Score and Modifiers */}
                        <div className="flex items-center gap-3">
                          {isRolled ? (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1" title="Rolled 4d6 (dimmed = dropped lowest)">
                                {currentBreakdown.rolls.map((d, dIdx) => (
                                  <DieShape
                                    key={dIdx}
                                    sides={6}
                                    value={d}
                                    size="sm"
                                    isDropped={d === currentBreakdown.dropped}
                                  />
                                ))}
                              </div>
                              {currentBreakdown.classBonus > 0 && (
                                <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                                  +{currentBreakdown.classBonus} Boost
                                </span>
                              )}
                              <button
                                id={`btn-reroll-stat-${statKey}`}
                                onClick={() => handleRollSingleStat(statKey, true)}
                                disabled={isRollingCurrentStat || fateTokens <= 0}
                                title="Spend Fate token to reroll this stat"
                                className={`p-1.5 rounded transition-colors flex items-center gap-1 text-[11px] font-mono ${
                                  fateTokens > 0
                                    ? 'bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-700 cursor-pointer'
                                    : 'bg-stone-900 text-stone-600 border border-stone-800 cursor-not-allowed'
                                }`}
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Reroll</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              id={`btn-roll-stat-${statKey}`}
                              onClick={() => handleRollSingleStat(statKey)}
                              disabled={isRollingCurrentStat}
                              className={`px-3 py-1.5 font-bold rounded text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                                isCurrentTurn
                                  ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 border border-amber-400 shadow animate-pulse'
                                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700'
                              }`}
                            >
                              <Dices className="w-3.5 h-3.5" />
                              <span>Roll 4d6 {classBonus > 0 ? `(+${classBonus})` : ''}</span>
                            </button>
                          )}

                          <div className="text-right pl-3 border-l border-stone-800 min-w-[55px]">
                            <div className="text-lg font-black font-mono text-cyan-300 leading-none">
                              {isRolled ? value : '—'}
                            </div>
                            <div className="text-[10px] font-mono text-amber-400 font-bold mt-0.5">
                              {isRolled ? `${modifier >= 0 ? `+${modifier}` : modifier} Mod` : '—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between border-t border-amber-900/50 pt-4 mt-4">
                <button
                  onClick={() => setCurrentStep('CLASS_SELECT')}
                  className="text-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
                >
                  ← Back to Class Selection
                </button>
                <button
                  id="btn-confirm-stats"
                  disabled={!allRolled}
                  onClick={() => {
                    if (allRolled) {
                      setCurrentStep('BOON_ROLL');
                    }
                  }}
                  className={`px-6 py-2.5 font-serif font-black rounded-xl shadow-xl flex items-center gap-2 text-sm transition-all ${
                    allRolled
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 text-stone-950 cursor-pointer transform hover:scale-105'
                      : 'bg-stone-900 border border-stone-800 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  <span>{allRolled ? 'Confirm Attributes & Roll Heirloom Table (1d6)' : `Roll All Attributes (${rolledCount}/5 Done)`}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })()}

        {/* ==================================================== */}
        {/* STEP 3: ROLL STARTING BOON / HEIRLOOM (1d6 Table Roll) */}
        {/* ==================================================== */}
        {currentStep === 'BOON_ROLL' && (
          <div className="w-full space-y-4">
            <LookupTableRoller<StartingBoon>
              table={STARTING_BOON_TABLE}
              title="Roll Starting Heirloom & Boon Table"
              subtitle="Roll 1d6 to inherit a family heirloom, extra gold, lockpicks, or protective amulets for your expedition."
              actionButtonLabel="Roll Heirloom Table (1d6)"
              canReroll={true}
              rerollTokens={fateTokens}
              onUseRerollToken={() => setFateTokens((t) => Math.max(0, t - 1))}
              onRollComplete={handleBoonRollComplete}
            />

            <div className="flex items-center justify-between max-w-3xl mx-auto w-full pt-2">
              <button
                onClick={() => setCurrentStep('STATS_ROLL')}
                className="text-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
              >
                ← Back to Attributes Roll
              </button>
              <button
                id="btn-confirm-boon"
                onClick={() => {
                  if (!rolledBoon) {
                    setRolledBoon(STARTING_BOON_TABLE.rows[0].data);
                  }
                  setCurrentStep('FINALIZE');
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 text-stone-950 font-serif font-black rounded-xl shadow-xl flex items-center gap-2 text-sm transition-all cursor-pointer transform hover:scale-105"
              >
                <span>Finalize Adventurer Details</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 4: FINALIZE CHARACTER & ENTER DUNGEON */}
        {/* ==================================================== */}
        {currentStep === 'FINALIZE' && (
          <div className="w-full max-w-3xl bg-[#18120c]/95 border-2 border-amber-800/60 rounded-xl p-6 shadow-2xl backdrop-blur-md text-amber-100 space-y-6 animate-fadeIn">
            <div className="border-b border-amber-900/50 pb-4 flex items-center justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 font-mono text-xs uppercase">
                  Character Sheet Ready
                </span>
                <h3 className="text-2xl font-bold font-serif text-amber-200 mt-1">
                  Name Your Adventurer
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500 text-amber-400">
                {getClassIcon(selectedClass.icon)}
              </div>
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-amber-300/80 uppercase">
                Hero Name / Epithet
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="input-character-name"
                  type="text"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  className="flex-1 bg-stone-900/90 border-2 border-amber-800/80 rounded-lg px-4 py-2.5 text-amber-100 font-serif text-lg focus:outline-none focus:border-amber-400"
                  placeholder="Enter adventurer name..."
                />
                <button
                  id="btn-random-name"
                  onClick={handleRandomName}
                  className="px-3.5 py-2.5 bg-stone-900 hover:bg-stone-800 border border-amber-700/60 text-amber-300 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Random
                </button>
              </div>
            </div>

            {/* Character Snapshot Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-stone-900/80 border border-amber-900/60">
              <div className="space-y-2">
                <div>
                  <div className="text-[11px] font-mono text-stone-400 uppercase">CLASS & TITLE</div>
                  <div className="text-lg font-serif font-black text-amber-200">
                    {selectedClass.name} • {selectedClass.title}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-mono text-stone-400 uppercase">ROLLED HEIRLOOM BOON</div>
                  <div className="text-xs text-emerald-300 font-semibold flex items-center gap-1.5 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{rolledBoon?.grantText || STARTING_BOON_TABLE.rows[0].data.grantText}</span>
                  </div>
                </div>

                <div className="pt-1">
                  <div className="text-[11px] font-mono text-stone-400 uppercase">STARTING WEALTH & SUPPLIES</div>
                  <div className="text-xs font-mono text-yellow-300 font-bold mt-0.5">
                    {selectedClass.startingGold + (rolledBoon?.type === 'gold' ? rolledBoon.value : 0)} Gold • 3 Rations • 2 Torches
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-mono text-stone-400 uppercase mb-1.5">ROLLED ABILITY SCORES</div>
                <div className="grid grid-cols-5 gap-1.5 text-center font-mono">
                  {STAT_ORDER.map(({ key }) => (
                    <div key={key} className="p-1.5 bg-stone-950 rounded-lg border border-stone-800">
                      <div className="text-[10px] text-stone-400">{key}</div>
                      <div className="text-sm font-bold text-amber-300">{stats[key]}</div>
                      <div className="text-[9px] text-stone-500">
                        {getStatModifier(stats[key]) >= 0 ? `+${getStatModifier(stats[key])}` : getStatModifier(stats[key])}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <div className="text-[11px] font-mono text-stone-400 uppercase mb-1">STARTING PACK & GEAR</div>
                  <div className="flex flex-wrap gap-1 text-[10px] font-mono text-amber-300">
                    {selectedClass.startingEquipment.map((id) => (
                      <span key={id} className="px-1.5 py-0.5 bg-stone-950 rounded border border-stone-800">
                        {ITEMS_DATABASE[id]?.name || id}
                      </span>
                    ))}
                    {rolledBoon?.itemId && ITEMS_DATABASE[rolledBoon.itemId] && (
                      <span className="px-1.5 py-0.5 bg-purple-950 text-purple-300 rounded border border-purple-800">
                        {ITEMS_DATABASE[rolledBoon.itemId].name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between border-t border-amber-900/50 pt-4">
              <button
                onClick={() => setCurrentStep('BOON_ROLL')}
                className="text-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
              >
                ← Back to Heirloom Roll
              </button>
              <button
                id="btn-embark-adventure"
                onClick={handleStartAdventure}
                className="px-8 py-3.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-black font-serif tracking-wider text-base rounded-xl shadow-2xl transition-all cursor-pointer transform hover:scale-105 flex items-center gap-2"
              >
                <UserCheck className="w-5 h-5" />
                <span>ENTER THE DUNGEON (FLOOR 1) ➔</span>
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
