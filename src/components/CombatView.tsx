/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Skull,
  Shield,
  Sword,
  Sparkles,
  Heart,
  Wand2,
  Dices,
  Flame,
  ArrowRight,
  RefreshCw,
  Zap,
  Package,
  Award,
  ChevronRight,
  AlertCircle,
  Footprints,
  Check,
} from 'lucide-react';
import { CombatLogEntry, CombatState, GameItem, HeroCharacter, HeroSkill, Monster } from '../types/game';
import { ITEMS_DATABASE } from '../data/items';
import { DiceVisualizer } from './DiceVisualizer';
import { rollDice, getStatModifier, parseAndRollFormula, RollResult } from '../utils/dice';
import { sounds } from '../utils/audio';

interface CombatViewProps {
  hero: HeroCharacter;
  combat: CombatState;
  onUpdateHero: (hero: HeroCharacter) => void;
  onUpdateCombat: (combat: CombatState | null) => void;
  onCombatVictory: (monster: Monster, reward: { xp: number; gold: number; items: GameItem[] }) => void;
  onCombatFlee: () => void;
}

type CombatStep =
  | 'HERO_CHOICE'
  | 'HERO_ROLLING'
  | 'HERO_RESULT'
  | 'ENEMY_ROLLING'
  | 'ENEMY_RESULT'
  | 'FLEE_RESULT'
  | 'VICTORY_SCREEN';

export const CombatView: React.FC<CombatViewProps> = ({
  hero,
  combat,
  onUpdateHero,
  onUpdateCombat,
  onCombatVictory,
  onCombatFlee,
}) => {
  const [combatStep, setCombatStep] = useState<CombatStep>('HERO_CHOICE');
  const [currentRoll, setCurrentRoll] = useState<RollResult | null>(null);
  const [damageRoll, setDamageRoll] = useState<RollResult | null>(null);
  const [actionSummary, setActionSummary] = useState<{
    title: string;
    details: string;
    damage?: number;
    isHit?: boolean;
    isCrit?: boolean;
    isFumble?: boolean;
    type: 'hero' | 'monster' | 'flee';
  } | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<HeroSkill | null>(null);

  const monster = combat.monster;
  const monsterHpPercent = Math.max(0, Math.min(100, (monster.hp / monster.maxHp) * 100));
  const heroHpPercent = Math.max(0, Math.min(100, (hero.currentHp / hero.maxHp) * 100));

  // Active hero stats including gear
  const heroStats = { ...hero.stats };
  let heroAc = 10 + getStatModifier(heroStats.DEX);
  (Object.values(hero.equipment) as (GameItem | undefined)[]).forEach((item) => {
    if (!item) return;
    if (item.armorBonus) heroAc += item.armorBonus;
    if (item.statBonuses) {
      if (item.statBonuses.STR) heroStats.STR += item.statBonuses.STR;
      if (item.statBonuses.DEX) heroStats.DEX += item.statBonuses.DEX;
      if (item.statBonuses.CON) heroStats.CON += item.statBonuses.CON;
      if (item.statBonuses.INT) heroStats.INT += item.statBonuses.INT;
      if (item.statBonuses.LCK) heroStats.LCK += item.statBonuses.LCK;
    }
  });

  if (combat.heroDefending) {
    heroAc += 4; // Block stance
  }

  const primaryWeapon = hero.equipment.weapon;
  const weaponFormula = primaryWeapon?.damageDice || '1d4';
  const weaponBonus = (primaryWeapon?.bonusDamage || 0) + getStatModifier(heroStats.STR);

  // Helper to add combat log
  const addLog = (
    sender: 'hero' | 'monster' | 'system',
    actionName: string,
    message: string,
    rollDetails?: CombatLogEntry['rollDetails'],
    damageDealt?: number
  ) => {
    const entry: CombatLogEntry = {
      id: `log_${Date.now()}_${Math.random()}`,
      turn: combat.turnNumber,
      sender,
      actionName,
      message,
      rollDetails,
      damageDealt,
    };
    combat.combatLogs = [entry, ...combat.combatLogs];
  };

  // 1. HERO ATTACK ACTION
  const handleHeroAttack = () => {
    if (combatStep !== 'HERO_CHOICE' || monster.hp <= 0) return;
    setCombatStep('HERO_ROLLING');
    sounds.playDiceRoll();

    const atkMod = getStatModifier(heroStats.STR) + (primaryWeapon?.bonusDamage || 0);
    const atkRoll = rollDice(1, 20, atkMod);
    setCurrentRoll(atkRoll);

    setTimeout(() => {
      const isHit = atkRoll.isCrit || (!atkRoll.isFumble && atkRoll.total >= monster.armorClass);
      let dmg = 0;
      let dmgRes: RollResult | null = null;

      if (isHit) {
        dmgRes = parseAndRollFormula(weaponFormula, heroStats, primaryWeapon?.bonusDamage || 0);
        dmg = dmgRes.total;
        if (atkRoll.isCrit) {
          dmg = dmg * 2 + 3;
          sounds.playCriticalHit();
          hero.statsHistory.critsRolled += 1;
        } else {
          sounds.playHit();
        }

        hero.statsHistory.highestDamageDealt = Math.max(hero.statsHistory.highestDamageDealt, dmg);
        const newMonsterHp = Math.max(0, monster.hp - dmg);
        monster.hp = newMonsterHp;
        setDamageRoll(dmgRes);

        setActionSummary({
          title: atkRoll.isCrit ? 'CRITICAL HIT!' : 'ATTACK HIT!',
          details: `Rolled [${atkRoll.individualRolls[0]}] + ${atkRoll.modifier} = ${atkRoll.total} vs ${monster.name} AC ${monster.armorClass}. Dealt ${dmg} damage with ${primaryWeapon?.name || 'Weapon'}.`,
          damage: dmg,
          isHit: true,
          isCrit: atkRoll.isCrit,
          type: 'hero',
        });

        addLog(
          'hero',
          `Attack with ${primaryWeapon?.name || 'Weapon'}`,
          `Rolled [${atkRoll.individualRolls[0]}]+${atkRoll.modifier}=${atkRoll.total} vs AC ${monster.armorClass}. ${
            atkRoll.isCrit ? 'CRITICAL HIT! ' : 'HIT! '
          }Dealt ${dmg} damage.`,
          {
            diceType: 'd20',
            rolls: atkRoll.individualRolls,
            modifier: atkRoll.modifier,
            total: atkRoll.total,
            targetValue: monster.armorClass,
            isCrit: atkRoll.isCrit,
          },
          dmg
        );
      } else {
        sounds.playBlock();
        setActionSummary({
          title: atkRoll.isFumble ? 'CRITICAL MISS / FUMBLE!' : 'ATTACK MISSED',
          details: `Rolled [${atkRoll.individualRolls[0]}] + ${atkRoll.modifier} = ${atkRoll.total} vs AC ${monster.armorClass}. The strike sailed wide!`,
          isHit: false,
          isFumble: atkRoll.isFumble,
          type: 'hero',
        });

        addLog(
          'hero',
          `Attack with ${primaryWeapon?.name || 'Weapon'} (Miss)`,
          `Rolled [${atkRoll.individualRolls[0]}]+${atkRoll.modifier}=${atkRoll.total} vs AC ${monster.armorClass}. Missed!`,
          {
            diceType: 'd20',
            rolls: atkRoll.individualRolls,
            modifier: atkRoll.modifier,
            total: atkRoll.total,
            targetValue: monster.armorClass,
            isFumble: atkRoll.isFumble,
          }
        );
      }

      onUpdateHero({ ...hero });
      onUpdateCombat({ ...combat });
      setCombatStep('HERO_RESULT');
    }, 600);
  };

  // 2. HERO CAST SKILL
  const handleHeroCastSkill = (skill: HeroSkill) => {
    if (combatStep !== 'HERO_CHOICE' || hero.currentMana < skill.manaCost) return;
    setCombatStep('HERO_ROLLING');
    sounds.playMagic();

    hero.currentMana -= skill.manaCost;

    if (skill.type === 'heal') {
      const healRoll = parseAndRollFormula(skill.diceFormula || '1d8', heroStats);
      const healed = healRoll.total;
      hero.currentHp = Math.min(hero.maxHp, hero.currentHp + healed);
      sounds.playLevelUp();

      setActionSummary({
        title: `${skill.name} Cast!`,
        details: `Channeled divine healing energy! Restored ${healed} HP.`,
        type: 'hero',
      });

      addLog('hero', skill.name, `Restored ${healed} Hit Points.`);
      onUpdateHero({ ...hero });
      onUpdateCombat({ ...combat });
      setCombatStep('HERO_RESULT');
      return;
    }

    if (skill.type === 'buff') {
      combat.heroDefending = true;
      sounds.playBlock();
      setActionSummary({
        title: `${skill.name} Activated!`,
        details: `Raised magical warding barrier (+4 AC) for this turn!`,
        type: 'hero',
      });
      addLog('hero', skill.name, `Raised magical defense barrier (+4 AC).`);
      onUpdateHero({ ...hero });
      onUpdateCombat({ ...combat });
      setCombatStep('HERO_RESULT');
      return;
    }

    // Attack Spell / Skill
    const intMod = getStatModifier(heroStats.INT);
    const spellRoll = rollDice(1, 20, intMod);
    setCurrentRoll(spellRoll);

    setTimeout(() => {
      const isHit = spellRoll.isCrit || spellRoll.total >= monster.armorClass - 1;
      let dmg = 0;
      if (isHit) {
        const dmgRes = parseAndRollFormula(skill.diceFormula || '2d6', heroStats);
        dmg = dmgRes.total;
        if (spellRoll.isCrit) dmg = Math.floor(dmg * 1.5) + 3;
        sounds.playFire();

        const newMonsterHp = Math.max(0, monster.hp - dmg);
        monster.hp = newMonsterHp;

        setActionSummary({
          title: `${skill.name} Hit!`,
          details: `Spell roll [${spellRoll.individualRolls[0]}]+${spellRoll.modifier}=${spellRoll.total} vs AC ${monster.armorClass}. Blasted ${monster.name} for ${dmg} magical damage!`,
          damage: dmg,
          isHit: true,
          type: 'hero',
        });

        addLog('hero', skill.name, `Dealt ${dmg} damage with ${skill.name}.`, undefined, dmg);
      } else {
        sounds.playBlock();
        setActionSummary({
          title: `${skill.name} Fizzled`,
          details: `Spell roll [${spellRoll.individualRolls[0]}]+${spellRoll.modifier}=${spellRoll.total} was deflected by monster wards.`,
          isHit: false,
          type: 'hero',
        });
        addLog('hero', `${skill.name} (Fizzle)`, `Spell failed to penetrate.`);
      }

      onUpdateHero({ ...hero });
      onUpdateCombat({ ...combat });
      setCombatStep('HERO_RESULT');
    }, 600);
  };

  // 3. HERO DEFEND STANCE
  const handleHeroDefend = () => {
    if (combatStep !== 'HERO_CHOICE') return;
    combat.heroDefending = true;
    sounds.playBlock();

    setActionSummary({
      title: 'Defensive Guard Raised',
      details: 'You brace your shield and lower your center of gravity (+4 Armor Class & Reduced Damage taken).',
      type: 'hero',
    });

    addLog('hero', 'Defensive Guard', 'Raised shield for +4 AC.');
    onUpdateCombat({ ...combat });
    setCombatStep('HERO_RESULT');
  };

  // 4. ATTEMPT FLEE ACTION
  const handleAttemptFlee = () => {
    if (combatStep !== 'HERO_CHOICE') return;
    setCombatStep('HERO_ROLLING');
    sounds.playDiceRoll();

    const escapeDc = 10 + monster.level;
    const fleeMod = Math.max(getStatModifier(heroStats.DEX), getStatModifier(heroStats.LCK));
    const fleeRoll = rollDice(1, 20, fleeMod);
    setCurrentRoll(fleeRoll);

    setTimeout(() => {
      if (fleeRoll.total >= escapeDc) {
        // Success!
        sounds.playLoot();
        setActionSummary({
          title: '✦ ESCAPED THE ENCOUNTER!',
          details: `Flee Check: Rolled [${fleeRoll.individualRolls[0]}]+${fleeRoll.modifier}=${fleeRoll.total} vs Escape DC ${escapeDc}. You broke away safely!`,
          type: 'flee',
          isHit: true,
        });
        addLog('hero', 'Escaped', `Fled combat successfully (DC ${escapeDc}).`);
        setCombatStep('FLEE_RESULT');
      } else {
        // Failure: Monster opportunity attack!
        sounds.playTrap();
        setActionSummary({
          title: '✖ FLEE FAILED! ESCAPE BLOCKED!',
          details: `Flee Check: Rolled [${fleeRoll.individualRolls[0]}]+${fleeRoll.modifier}=${fleeRoll.total} vs Escape DC ${escapeDc}. ${monster.name} cuts off your retreat!`,
          type: 'flee',
          isHit: false,
        });
        addLog('hero', 'Flee Failed', `Failed to escape DC ${escapeDc}.`);
        setCombatStep('HERO_RESULT');
      }
    }, 600);
  };

  // 5. TRIGGER ENEMY TURN (Executed when user clicks "Continue to Enemy Turn")
  const handleProceedToEnemyTurn = () => {
    if (monster.hp <= 0) {
      handleMonsterSlain();
      return;
    }

    setCombatStep('ENEMY_ROLLING');
    sounds.playDiceRoll();

    // Pick monster action
    const actions = monster.actions;
    const action = actions[Math.floor(Math.random() * actions.length)] || actions[0];

    // Roll monster attack
    const atkRoll = rollDice(1, 20, monster.attackBonus);
    setCurrentRoll(atkRoll);

    setTimeout(() => {
      const isHit = atkRoll.isCrit || atkRoll.total >= heroAc;
      let dmg = 0;

      if (isHit) {
        const dmgRes = parseAndRollFormula(action.damageDice);
        dmg = dmgRes.total;
        if (atkRoll.isCrit) {
          dmg = Math.floor(dmg * 1.5) + 2;
          sounds.playCriticalHit();
        } else {
          sounds.playHit();
        }

        if (combat.heroDefending) {
          dmg = Math.max(1, dmg - 3);
          sounds.playBlock();
        }

        hero.currentHp = Math.max(0, hero.currentHp - dmg);

        setActionSummary({
          title: `${monster.name} Struck You!`,
          details: `${action.name}: Rolled [${atkRoll.individualRolls[0]}]+${atkRoll.modifier}=${atkRoll.total} vs your AC ${heroAc}. You took ${dmg} damage!`,
          damage: dmg,
          isHit: true,
          isCrit: atkRoll.isCrit,
          type: 'monster',
        });

        addLog(
          'monster',
          `${monster.name}: ${action.name}`,
          `Attack roll: [${atkRoll.individualRolls[0]}]+${atkRoll.modifier}=${atkRoll.total} vs your AC ${heroAc}. HIT for ${dmg} damage.`,
          {
            diceType: 'd20',
            rolls: atkRoll.individualRolls,
            modifier: atkRoll.modifier,
            total: atkRoll.total,
            targetValue: heroAc,
            isCrit: atkRoll.isCrit,
          },
          dmg
        );
      } else {
        sounds.playBlock();
        setActionSummary({
          title: `${monster.name} Missed!`,
          details: `${action.name}: Rolled [${atkRoll.individualRolls[0]}]+${atkRoll.modifier}=${atkRoll.total} vs your AC ${heroAc}. The blow deflected off your armor!`,
          isHit: false,
          type: 'monster',
        });

        addLog(
          'monster',
          `${monster.name} Missed`,
          `Attack roll: [${atkRoll.individualRolls[0]}]+${atkRoll.modifier}=${atkRoll.total} vs your AC ${heroAc}. Missed!`,
          {
            diceType: 'd20',
            rolls: atkRoll.individualRolls,
            modifier: atkRoll.modifier,
            total: atkRoll.total,
            targetValue: heroAc,
          }
        );
      }

      combat.heroDefending = false;
      combat.turnNumber += 1;
      onUpdateHero({ ...hero });
      onUpdateCombat({ ...combat });
      setCombatStep('ENEMY_RESULT');
    }, 650);
  };

  // 6. BEGIN NEXT ROUND (Player Turn)
  const handleBeginNextHeroRound = () => {
    setCurrentRoll(null);
    setDamageRoll(null);
    setActionSummary(null);
    setCombatStep('HERO_CHOICE');
  };

  // 7. MONSTER SLAIN
  const handleMonsterSlain = () => {
    sounds.playLevelUp();
    sounds.playCoins();

    const goldReward =
      Math.floor(Math.random() * (monster.goldMax - monster.goldMin + 1)) + monster.goldMin;
    const itemsAwarded: GameItem[] = [];

    if (Math.random() < monster.lootDropChance && monster.possibleLootIds?.length) {
      const lootId = monster.possibleLootIds[Math.floor(Math.random() * monster.possibleLootIds.length)];
      if (ITEMS_DATABASE[lootId]) {
        itemsAwarded.push(ITEMS_DATABASE[lootId]);
      }
    }

    hero.statsHistory.monstersSlain += 1;
    hero.statsHistory.goldCollected += goldReward;

    onCombatVictory(monster, {
      xp: monster.xpReward,
      gold: goldReward,
      items: itemsAwarded,
    });
  };

  return (
    <div className="max-w-5xl mx-auto w-full space-y-4 font-sans text-amber-100 animate-fadeIn">
      {/* Top Banner: Dual Combatant HUD (Hero vs Monster) */}
      <div className="bg-[#18120c]/95 border-2 border-red-900/80 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Left: Hero Combatant Card */}
          <div className="md:col-span-5 bg-stone-950/70 border border-amber-900/60 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/80 flex items-center justify-center text-amber-300 font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-amber-100 text-sm sm:text-base leading-tight">
                    {hero.name}
                  </h3>
                  <span className="text-[11px] font-mono text-amber-400/80">
                    Lvl {hero.level} {hero.className}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-700 text-blue-300 font-bold">
                  AC {heroAc}
                </span>
                {combat.heroDefending && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 text-[10px] font-bold animate-pulse">
                    GUARD
                  </span>
                )}
              </div>
            </div>

            {/* Hero HP & Mana */}
            <div className="space-y-1.5">
              <div>
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-emerald-400 font-bold">Hero HP</span>
                  <span className="text-stone-300">
                    {hero.currentHp} / {hero.maxHp}
                  </span>
                </div>
                <div className="w-full bg-stone-900 rounded-full h-2.5 border border-stone-800 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full transition-all duration-500 rounded-full"
                    style={{ width: `${heroHpPercent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-purple-400 font-bold">Mana</span>
                  <span className="text-stone-300">
                    {hero.currentMana} / {hero.maxMana}
                  </span>
                </div>
                <div className="w-full bg-stone-900 rounded-full h-2 border border-stone-800 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-cyan-400 h-full transition-all duration-500 rounded-full"
                    style={{ width: `${(hero.currentMana / hero.maxMana) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Center: VS & Round Badge */}
          <div className="md:col-span-2 flex flex-col items-center justify-center py-1">
            <span className="px-3 py-1 rounded-full bg-red-950 border-2 border-red-700 text-red-300 font-black font-mono text-xs shadow-lg uppercase tracking-wider">
              VS
            </span>
            <span className="text-[10px] font-mono text-stone-400 mt-1 font-bold">
              Round {combat.turnNumber}
            </span>
          </div>

          {/* Right: Monster Combatant Card */}
          <div className="md:col-span-5 bg-stone-950/70 border border-red-900/60 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-red-950/80 border border-red-600 flex items-center justify-center text-red-400 font-bold">
                  <Skull className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-serif font-black text-red-200 text-sm sm:text-base leading-tight">
                      {monster.name}
                    </h3>
                    {monster.isBoss && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-950 border border-amber-600 text-amber-300 text-[9px] font-mono font-bold">
                        BOSS
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-red-400/80">
                    Level {monster.level} Threat
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-amber-300 font-bold">
                  AC {monster.armorClass}
                </span>
                <span className="px-2 py-0.5 rounded bg-red-950 border border-red-800 text-red-300 font-bold">
                  +{monster.attackBonus}
                </span>
              </div>
            </div>

            {/* Monster HP */}
            <div className="space-y-1.5 pt-1">
              <div>
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-red-400 font-bold">Monster Vitality</span>
                  <span className="text-stone-300">
                    {monster.hp} / {monster.maxHp} HP
                  </span>
                </div>
                <div className="w-full bg-stone-900 rounded-full h-2.5 border border-stone-800 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-red-700 via-red-600 to-amber-600 h-full transition-all duration-500 rounded-full"
                    style={{ width: `${monsterHpPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Interactive Zone: Dice & Outcome Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Main Combat Interaction & Step Card */}
        <div className="lg:col-span-2 space-y-4">
          {/* STEP 1: Hero Action Choice */}
          {combatStep === 'HERO_CHOICE' && (
            <div className="bg-[#18120c]/90 border-2 border-amber-800/60 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-amber-900/50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-400 font-mono text-xs font-bold uppercase">
                    Your Turn • Round {combat.turnNumber}
                  </span>
                  <h3 className="text-lg font-serif font-bold text-amber-200">
                    Choose Your Combat Action
                  </h3>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Attack with Weapon */}
                <button
                  onClick={handleHeroAttack}
                  className="p-3.5 bg-gradient-to-r from-amber-900/60 to-stone-900 border-2 border-amber-600/80 hover:border-amber-400 rounded-xl text-left transition-all cursor-pointer transform active:scale-98 group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 group-hover:scale-110 transition-transform">
                      <Sword className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-serif font-bold text-amber-200 text-sm">
                        Attack with {primaryWeapon?.name || 'Weapon'}
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono">
                        Roll: 1d20+{weaponBonus} • Dmg: {weaponFormula}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-400" />
                </button>

                {/* 2. Defend Guard */}
                <button
                  onClick={handleHeroDefend}
                  className="p-3.5 bg-gradient-to-r from-blue-950/60 to-stone-900 border-2 border-blue-700/80 hover:border-blue-400 rounded-xl text-left transition-all cursor-pointer transform active:scale-98 group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-serif font-bold text-blue-200 text-sm">
                        Defensive Guard
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono">
                        +4 AC & Reduced Damage taken
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-blue-400" />
                </button>

                {/* 3. Class Skills */}
                {hero.skills.map((skill) => {
                  const canAfford = hero.currentMana >= skill.manaCost;
                  return (
                    <button
                      key={skill.id}
                      onClick={() => handleHeroCastSkill(skill)}
                      disabled={!canAfford}
                      className={`p-3.5 border-2 rounded-xl text-left transition-all flex items-center justify-between ${
                        canAfford
                          ? 'bg-gradient-to-r from-purple-950/60 to-stone-900 border-purple-600/80 hover:border-purple-400 cursor-pointer transform active:scale-98'
                          : 'bg-stone-950/40 border-stone-900 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                          <Wand2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-serif font-bold text-purple-200 text-sm flex items-center gap-2">
                            {skill.name}
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-purple-950 text-purple-300 rounded border border-purple-800">
                              {skill.manaCost} Mana
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-400 font-mono">
                            {skill.description}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-purple-400" />
                    </button>
                  );
                })}

                {/* 4. Attempt Flee Button */}
                <button
                  onClick={handleAttemptFlee}
                  className="p-3.5 bg-gradient-to-r from-amber-950/40 to-stone-900 border-2 border-stone-700 hover:border-amber-400 rounded-xl text-left transition-all cursor-pointer transform active:scale-98 group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-stone-800 rounded-lg text-amber-300 group-hover:scale-110 transition-transform">
                      <Footprints className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-serif font-bold text-stone-200 text-sm">
                        Attempt to Flee
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono">
                        DEX/LCK vs Escape DC {10 + monster.level}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Dice Rolling Animation Phase */}
          {(combatStep === 'HERO_ROLLING' || combatStep === 'ENEMY_ROLLING') && (
            <div className="space-y-3">
              <DiceVisualizer
                currentRoll={currentRoll}
                isRolling={true}
                allowCustomDice={false}
                label={combatStep === 'HERO_ROLLING' ? 'Hero Action Roll (1d20)' : `${monster.name} Strike (1d20)`}
              />
              <p className="text-center text-xs text-stone-400 font-mono">
                Calculating attack roll + modifiers against target Armor Class...
              </p>
            </div>
          )}

          {/* STEP 3: Hero Result Card with Explicit "Continue" Button */}
          {combatStep === 'HERO_RESULT' && actionSummary && (
            <div className="bg-[#18120c]/95 border-2 border-amber-500 rounded-xl p-6 shadow-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-amber-900/60 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase ${
                      actionSummary.isHit
                        ? 'bg-emerald-950 border border-emerald-600 text-emerald-300'
                        : 'bg-red-950 border border-red-600 text-red-300'
                    }`}
                  >
                    Your Action Outcome
                  </span>
                  <h3 className="text-xl font-serif font-bold text-amber-200">
                    {actionSummary.title}
                  </h3>
                </div>
                {currentRoll && (
                  <span className="font-mono text-xs font-bold px-2 py-1 bg-stone-900 rounded border border-stone-700 text-amber-300">
                    d20 Roll: {currentRoll.total}
                  </span>
                )}
              </div>

              <div className="p-4 bg-stone-900/80 rounded-lg border border-amber-900/60 text-sm text-stone-200 leading-relaxed font-serif">
                {actionSummary.details}
              </div>

              {/* Progress Controls */}
              <div className="flex justify-end pt-2">
                {monster.hp <= 0 ? (
                  <button
                    onClick={handleMonsterSlain}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 text-stone-950 font-black font-serif rounded-xl shadow-xl flex items-center gap-2 transition-all cursor-pointer transform hover:scale-105"
                  >
                    <Award className="w-5 h-5" />
                    Victory! Claim Spoils & XP ➔
                  </button>
                ) : (
                  <button
                    onClick={handleProceedToEnemyTurn}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 text-stone-100 font-black font-serif rounded-xl shadow-xl flex items-center gap-2 transition-all cursor-pointer transform hover:scale-105"
                  >
                    Continue to Enemy Turn ➔
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Enemy Result Card with Explicit "Begin Round" Button */}
          {combatStep === 'ENEMY_RESULT' && actionSummary && (
            <div className="bg-[#18120c]/95 border-2 border-red-600 rounded-xl p-6 shadow-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-red-950 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase ${
                      actionSummary.isHit
                        ? 'bg-red-950 border border-red-600 text-red-300'
                        : 'bg-emerald-950 border border-emerald-600 text-emerald-300'
                    }`}
                  >
                    Enemy Action Outcome
                  </span>
                  <h3 className="text-xl font-serif font-bold text-red-200">
                    {actionSummary.title}
                  </h3>
                </div>
                {currentRoll && (
                  <span className="font-mono text-xs font-bold px-2 py-1 bg-stone-900 rounded border border-stone-700 text-red-300">
                    Monster Roll: {currentRoll.total}
                  </span>
                )}
              </div>

              <div className="p-4 bg-stone-900/80 rounded-lg border border-red-900/60 text-sm text-stone-200 leading-relaxed font-serif">
                {actionSummary.details}
              </div>

              {/* Progress Controls */}
              <div className="flex justify-end pt-2">
                {hero.currentHp <= 0 ? (
                  <div className="text-sm font-bold text-red-400 flex items-center gap-2">
                    <Skull className="w-5 h-5 animate-bounce" />
                    Hero has fallen...
                  </div>
                ) : (
                  <button
                    onClick={handleBeginNextHeroRound}
                    className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 text-stone-950 font-black font-serif rounded-xl shadow-xl flex items-center gap-2 transition-all cursor-pointer transform hover:scale-105"
                  >
                    Begin Round {combat.turnNumber} (Your Turn) ➔
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: Successful Flee Result */}
          {combatStep === 'FLEE_RESULT' && actionSummary && (
            <div className="bg-[#18120c]/95 border-2 border-emerald-600 rounded-xl p-6 shadow-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 border-b border-emerald-950 pb-3">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase bg-emerald-950 border border-emerald-600 text-emerald-300">
                  Tactical Retreat
                </span>
                <h3 className="text-xl font-serif font-bold text-emerald-200">
                  {actionSummary.title}
                </h3>
              </div>

              <div className="p-4 bg-stone-900/80 rounded-lg border border-emerald-900/60 text-sm text-stone-200 leading-relaxed font-serif">
                {actionSummary.details}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={onCombatFlee}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 text-stone-950 font-black font-serif rounded-xl shadow-xl flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Footprints className="w-5 h-5" />
                  Retreat to Previous Room
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Combat Log History */}
        <div className="bg-[#18120c]/90 border-2 border-stone-800 rounded-xl p-4 shadow-xl flex flex-col h-[420px]">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-3">
            <span className="text-xs font-mono font-bold text-stone-400 uppercase tracking-wider">
              Turn & Dice Combat Log
            </span>
            <span className="text-[10px] font-mono text-stone-500">
              {combat.combatLogs.length} entries
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
            {combat.combatLogs.map((log) => {
              const isHero = log.sender === 'hero';
              const isMonster = log.sender === 'monster';

              return (
                <div
                  key={log.id}
                  className={`p-2.5 rounded-lg border text-[11px] leading-relaxed ${
                    isHero
                      ? 'bg-amber-950/30 border-amber-800/40 text-amber-200'
                      : isMonster
                      ? 'bg-red-950/30 border-red-800/40 text-red-200'
                      : 'bg-stone-900 border-stone-800 text-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[10px] text-stone-400 mb-1">
                    <span className="font-bold">{log.actionName}</span>
                    <span>Turn {log.turn}</span>
                  </div>
                  <div>{log.message}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
