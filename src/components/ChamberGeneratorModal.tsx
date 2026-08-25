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
  Sparkles,
  Dices,
  Check,
  ChevronRight,
  Shield,
  Flame,
} from 'lucide-react';
import { DungeonRoom, HeroCharacter, Monster, RoomType } from '../types/game';
import {
  ROOM_TABLE_FLOOR_1,
  ROOM_TABLE_FLOOR_2,
  ROOM_TABLE_FLOOR_3,
  MONSTER_TABLE_FLOOR_1,
  MONSTER_TABLE_FLOOR_2,
  MONSTER_TABLE_FLOOR_3,
  MONSTER_TRAIT_TABLE,
  MonsterTrait,
  lookupTableRow,
  TableRow,
} from '../data/tables';
import { MONSTERS_DATABASE } from '../data/monsters';
import { rollDice, RollResult } from '../utils/dice';
import { sounds } from '../utils/audio';

interface ChamberGeneratorModalProps {
  isOpen: boolean;
  floorNumber: number;
  roomNumber: number;
  isBossRoom?: boolean;
  hero?: HeroCharacter;
  onUpdateHero?: (hero: HeroCharacter) => void;
  onGenerationComplete: (generatedRoomData: {
    roomType: RoomType;
    monster?: Monster;
  }) => void;
}

type GenStep = 'ROOM_ROLL' | 'MONSTER_ROLL' | 'TRAIT_ROLL' | 'COMPLETE';

export const ChamberGeneratorModal: React.FC<ChamberGeneratorModalProps> = ({
  isOpen,
  floorNumber,
  roomNumber,
  isBossRoom = false,
  hero,
  onUpdateHero,
  onGenerationComplete,
}) => {
  const [step, setStep] = useState<GenStep>('ROOM_ROLL');
  const [isRolling, setIsRolling] = useState(false);

  // Room roll results
  const [roomRoll, setRoomRoll] = useState<number | null>(null);
  const [roomRow, setRoomRow] = useState<TableRow<RoomType> | null>(null);

  // Monster roll results
  const [monsterRoll, setMonsterRoll] = useState<number | null>(null);
  const [monsterRow, setMonsterRow] = useState<TableRow<string> | null>(null);
  const [baseMonster, setBaseMonster] = useState<Monster | null>(null);

  // Trait roll results
  const [traitRoll, setTraitRoll] = useState<number | null>(null);
  const [traitRow, setTraitRow] = useState<TableRow<MonsterTrait> | null>(null);
  const [finalMonster, setFinalMonster] = useState<Monster | null>(null);

  if (!isOpen) return null;

  const handleUseFateReroll = () => {
    if (!hero || !onUpdateHero || hero.rerollTokens <= 0) return;
    hero.rerollTokens -= 1;
    onUpdateHero({ ...hero });
    sounds.playLevelUp();

    setRoomRoll(null);
    setRoomRow(null);
    setMonsterRoll(null);
    setMonsterRow(null);
    setBaseMonster(null);
    setTraitRoll(null);
    setTraitRow(null);
    setFinalMonster(null);
    setStep('ROOM_ROLL');
  };

  // Pick floor table
  const roomTable =
    floorNumber === 1
      ? ROOM_TABLE_FLOOR_1
      : floorNumber === 2
      ? ROOM_TABLE_FLOOR_2
      : ROOM_TABLE_FLOOR_3;

  const monsterTable =
    floorNumber === 1
      ? MONSTER_TABLE_FLOOR_1
      : floorNumber === 2
      ? MONSTER_TABLE_FLOOR_2
      : MONSTER_TABLE_FLOOR_3;

  // 1. Roll Room Table
  const handleRollRoom = () => {
    if (isRolling) return;
    setIsRolling(true);
    sounds.playDiceRoll();

    setTimeout(() => {
      let finalRollVal = rollDice(1, 20).total;
      let matchedRow = lookupTableRow(roomTable, finalRollVal);

      if (isBossRoom) {
        matchedRow = {
          minRoll: 20,
          maxRoll: 20,
          id: 'boss_room',
          name: floorNumber === 3 ? "The Crimson Dragon's Throne" : 'Miniboss Lair',
          subtitle: 'Lethal Boss Encounter',
          description: 'A massive grand sanctum holding the master of this dungeon floor.',
          icon: 'Skull',
          badge: 'Boss Lair',
          data: 'BOSS_ROOM',
        };
        finalRollVal = 20;
      }

      setRoomRoll(finalRollVal);
      setRoomRow(matchedRow);
      setIsRolling(false);
      sounds.playLoot();

      if (matchedRow.data === 'MONSTER' || matchedRow.data === 'BOSS_ROOM') {
        // Proceed to monster roll
        setStep('MONSTER_ROLL');
      } else {
        setStep('COMPLETE');
      }
    }, 550);
  };

  // 2. Roll Monster Table
  const handleRollMonster = () => {
    if (isRolling) return;
    setIsRolling(true);
    sounds.playDiceRoll();

    setTimeout(() => {
      let rollVal = rollDice(1, 6).total;
      let mRow = lookupTableRow(monsterTable, rollVal);

      if (isBossRoom) {
        const bossId =
          floorNumber === 1
            ? 'hobgoblin_chieftain'
            : floorNumber === 2
            ? 'necromancer_lord'
            : 'crimson_dragon';
        const bossTemplate = MONSTERS_DATABASE[bossId] || MONSTERS_DATABASE['hobgoblin_chieftain'];
        mRow = {
          minRoll: 1,
          maxRoll: 6,
          id: bossId,
          name: bossTemplate.name,
          subtitle: bossTemplate.title,
          description: bossTemplate.description,
          icon: 'Crown',
          badge: 'Floor Boss',
          data: bossId,
        };
      }

      setMonsterRoll(rollVal);
      setMonsterRow(mRow);

      const mTemplate =
        MONSTERS_DATABASE[mRow.data] || MONSTERS_DATABASE['giant_rat'];
      const cloned = JSON.parse(JSON.stringify(mTemplate)) as Monster;
      setBaseMonster(cloned);

      setIsRolling(false);
      sounds.playHit();
      setStep('TRAIT_ROLL');
    }, 550);
  };

  // 3. Roll Trait Table
  const handleRollTrait = () => {
    if (isRolling || !baseMonster) return;
    setIsRolling(true);
    sounds.playDiceRoll();

    setTimeout(() => {
      const rollVal = rollDice(1, 6).total;
      const tRow = lookupTableRow(MONSTER_TRAIT_TABLE, rollVal);
      setTraitRoll(rollVal);
      setTraitRow(tRow);

      const trait = tRow.data;
      const modifiedMonster: Monster = {
        ...baseMonster,
        name: `${trait.prefix} ${baseMonster.name}`,
        hp: Math.max(8, baseMonster.hp + trait.hpMod),
        maxHp: Math.max(8, baseMonster.maxHp + trait.hpMod),
        armorClass: baseMonster.armorClass + trait.acMod,
        attackBonus: baseMonster.attackBonus + trait.attackMod,
        goldMin: Math.floor(baseMonster.goldMin * trait.goldBonusMultiplier),
        goldMax: Math.floor(baseMonster.goldMax * trait.goldBonusMultiplier),
      };

      setFinalMonster(modifiedMonster);
      setIsRolling(false);
      sounds.playCriticalHit();
      setStep('COMPLETE');
    }, 550);
  };

  const handleFinish = () => {
    onGenerationComplete({
      roomType: roomRow?.data || 'CAMPFIRE',
      monster: finalMonster || baseMonster || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#18120c] border-2 border-amber-600 rounded-xl max-w-2xl w-full p-6 shadow-2xl text-amber-100 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-900/60 pb-3 mb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded bg-amber-950 border border-amber-700/60 text-amber-400 font-mono text-xs uppercase">
              Tabletop Procedural Chamber Generation
            </span>
            <h2 className="text-xl font-bold font-serif text-amber-200 mt-1">
              Opening Chamber #{roomNumber} (Floor {floorNumber})
            </h2>
          </div>
          <div className="text-xs font-mono text-stone-400">
            Step {step === 'ROOM_ROLL' ? 1 : step === 'MONSTER_ROLL' ? 2 : step === 'TRAIT_ROLL' ? 3 : 4} of 4
          </div>
        </div>

        {/* Step 1: Roll Room */}
        {step === 'ROOM_ROLL' && (
          <div className="space-y-4">
            <div className="p-4 bg-stone-900/80 border border-amber-900/60 rounded-xl text-center">
              <Dices className={`w-10 h-10 text-amber-400 mx-auto mb-2 ${isRolling ? 'animate-spin' : ''}`} />
              <h4 className="font-serif font-bold text-lg text-amber-200">
                Roll on {roomTable.title}
              </h4>
              <p className="text-xs text-stone-400 max-w-md mx-auto mt-1 mb-4">
                Roll 1d20 to discover if this chamber holds monsters, gold chests, shrines, or traps.
              </p>
              <button
                onClick={handleRollRoom}
                disabled={isRolling}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 text-stone-950 font-bold rounded-lg shadow-xl transition-all cursor-pointer flex items-center gap-2 mx-auto"
              >
                <Dices className="w-4 h-4" />
                {isRolling ? 'Rolling 1d20...' : 'Roll Chamber (1d20)'}
              </button>
            </div>

            {/* Table reference preview */}
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {roomTable.rows.map((row) => (
                <div
                  key={row.id}
                  className="p-2 rounded bg-stone-950/60 border border-stone-800 text-xs flex items-center justify-between text-stone-400"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-400/90 font-bold px-1.5 py-0.5 bg-stone-900 rounded">
                      [{row.minRoll}-{row.maxRoll}]
                    </span>
                    <span className="text-stone-300 font-semibold">{row.name}</span>
                  </div>
                  <span className="text-[11px] text-stone-400">{row.subtitle}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Roll Monster */}
        {step === 'MONSTER_ROLL' && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-950/40 border border-amber-700/60 rounded-lg flex items-center justify-between">
              <span className="text-xs font-mono text-amber-300">
                Chamber Rolled: [{roomRoll}] {roomRow?.name}
              </span>
              <span className="text-xs font-bold text-red-400">Hostile Threat!</span>
            </div>

            <div className="p-4 bg-stone-900/80 border border-amber-900/60 rounded-xl text-center">
              <Skull className={`w-10 h-10 text-red-400 mx-auto mb-2 ${isRolling ? 'animate-bounce' : ''}`} />
              <h4 className="font-serif font-bold text-lg text-amber-200">
                Roll on {monsterTable.title}
              </h4>
              <p className="text-xs text-stone-400 max-w-md mx-auto mt-1 mb-4">
                Roll 1d6 to determine which dungeon beast guards this chamber.
              </p>
              <button
                onClick={handleRollMonster}
                disabled={isRolling}
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 text-stone-100 font-bold rounded-lg shadow-xl transition-all cursor-pointer flex items-center gap-2 mx-auto"
              >
                <Dices className="w-4 h-4" />
                {isRolling ? 'Rolling 1d6...' : 'Roll Monster (1d6)'}
              </button>
            </div>

            {/* Table reference preview */}
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {monsterTable.rows.map((row) => (
                <div
                  key={row.id}
                  className="p-2 rounded bg-stone-950/60 border border-stone-800 text-xs flex items-center justify-between text-stone-400"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-400/90 font-bold px-1.5 py-0.5 bg-stone-900 rounded">
                      [{row.minRoll}]
                    </span>
                    <span className="text-stone-300 font-semibold">{row.name}</span>
                  </div>
                  <span className="text-[11px] text-stone-400">{row.subtitle}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Roll Trait */}
        {step === 'TRAIT_ROLL' && (
          <div className="space-y-4">
            <div className="p-3 bg-stone-900 border border-stone-700 rounded-lg flex items-center justify-between">
              <span className="text-xs font-mono text-stone-300">
                Beast Encounter: {baseMonster?.name} (HP: {baseMonster?.maxHp}, AC: {baseMonster?.armorClass})
              </span>
            </div>

            <div className="p-4 bg-stone-900/80 border border-amber-900/60 rounded-xl text-center">
              <Flame className={`w-10 h-10 text-amber-400 mx-auto mb-2 ${isRolling ? 'animate-spin' : ''}`} />
              <h4 className="font-serif font-bold text-lg text-amber-200">
                Roll Monster Trait & Mutation Table
              </h4>
              <p className="text-xs text-stone-400 max-w-md mx-auto mt-1 mb-4">
                Roll 1d6 to see if this monster has special traits (Armored, Frenzied, Venomous, Wealthy Hoarder).
              </p>
              <button
                onClick={handleRollTrait}
                disabled={isRolling}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 text-stone-950 font-bold rounded-lg shadow-xl transition-all cursor-pointer flex items-center gap-2 mx-auto"
              >
                <Dices className="w-4 h-4" />
                {isRolling ? 'Rolling 1d6...' : 'Roll Trait (1d6)'}
              </button>
            </div>

            {/* Table reference preview */}
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {MONSTER_TRAIT_TABLE.rows.map((row) => (
                <div
                  key={row.id}
                  className="p-2 rounded bg-stone-950/60 border border-stone-800 text-xs flex items-center justify-between text-stone-400"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-400/90 font-bold px-1.5 py-0.5 bg-stone-900 rounded">
                      [{row.minRoll}]
                    </span>
                    <span className="text-stone-300 font-semibold">{row.name}</span>
                  </div>
                  <span className="text-[11px] text-stone-400">{row.subtitle}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'COMPLETE' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-xl bg-gradient-to-r from-stone-900 via-amber-950/60 to-stone-900 border-2 border-amber-500 shadow-xl">
              <div className="text-xs font-mono text-amber-400 mb-1">GENERATION SUMMARY</div>
              <h3 className="text-xl font-bold font-serif text-amber-200">
                {roomRow?.name}
              </h3>
              <p className="text-xs text-stone-300 mt-1">
                {roomRow?.description}
              </p>

              {finalMonster && (
                <div className="mt-3 p-3 bg-stone-950/80 rounded-lg border border-red-900/60 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-red-300 font-serif">{finalMonster.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-red-950 border border-red-800 text-red-300 rounded font-mono">
                        Level {finalMonster.level}
                      </span>
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      HP: {finalMonster.maxHp} • AC: {finalMonster.armorClass} • Attack Bonus: +{finalMonster.attackBonus}
                    </div>
                  </div>
                  {traitRow && (
                    <span className="text-xs font-mono text-amber-300 font-bold px-2 py-1 bg-amber-950 rounded border border-amber-700">
                      {traitRow.data.name}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              {hero && onUpdateHero && (
                <button
                  id="btn-fate-reroll-chamber"
                  disabled={hero.rerollTokens <= 0}
                  onClick={handleUseFateReroll}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-serif font-bold flex items-center justify-center gap-2 border shadow-md transition-all ${
                    hero.rerollTokens > 0
                      ? 'bg-purple-950/80 hover:bg-purple-900 border-purple-500/80 text-purple-200 cursor-pointer active:scale-95'
                      : 'bg-stone-900/80 border-stone-800 text-stone-500 cursor-not-allowed opacity-60'
                  }`}
                  title={
                    hero.rerollTokens > 0
                      ? `Reroll this chamber using 1 Fate Token (${hero.rerollTokens} available)`
                      : 'No Fate Tokens available in inventory'
                  }
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>
                    {hero.rerollTokens > 0
                      ? `✦ Fate Reroll Chamber (${hero.rerollTokens} Available)`
                      : '0 Fate Tokens Available'}
                  </span>
                </button>
              )}

              <button
                onClick={handleFinish}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 text-stone-950 font-black font-serif rounded-lg shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer transform hover:scale-105 ml-auto"
              >
                <Check className="w-4 h-4" />
                <span>Enter Chamber</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
