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
  | 'HERO_ATTACK_ROLLING'
  | 'HERO_ATTACK_RESULT'
  | 'HERO_DAMAGE_ROLLING'
  | 'HERO_DAMAGE_RESULT'
  | 'HERO_NON_DAMAGE_RESULT'
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
  const [pendingAttack, setPendingAttack] = useState<{
    type: 'weapon' | 'spell';
    name: string;
    atkRoll: RollResult;
    isHit: boolean;
    isCrit: boolean;
    isFumble: boolean;
    damageFormula: string;
    damageBonus: number;
    skill?: HeroSkill;
  } | null>(null);

  const [actionSummary, setActionSummary] = useState<{
    title: string;
    details: string;
    damage?: number;
    isHit?: boolean;
    isCrit?: boolean;
    isFumble?: boolean;
    type: 'hero' | 'monster' | 'flee';
  } | null>(null);

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

  const strMod = getStatModifier(heroStats.STR);
  const dexMod = getStatModifier(heroStats.DEX);
  const conMod = getStatModifier(heroStats.CON);
  const intMod = getStatModifier(heroStats.INT);
  const lckMod = getStatModifier(heroStats.LCK);
  const fleeMod = Math.max(dexMod, lckMod);

  const primaryWeapon = hero.equipment.weapon;
  const weaponFormula = primaryWeapon?.damageDice || '1d4';
  const weaponBonus = (primaryWeapon?.bonusDamage || 0) + strMod;
  const totalWeaponAtkMod = strMod + (primaryWeapon?.bonusDamage || 0);

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

  // 1. HERO INITIATES WEAPON ATTACK (Step 1: Roll d20 to hit)
  const handleHeroAttack = () => {
    if (combatStep !== 'HERO_CHOICE' || monster.hp <= 0) return;
    setCombatStep('HERO_ATTACK_ROLLING');
    sounds.playDiceRoll();

    const atkRoll = rollDice(1, 20, totalWeaponAtkMod);
    setCurrentRoll(atkRoll);

    setTimeout(() => {
      const isHit = atkRoll.isCrit || (!atkRoll.isFumble && atkRoll.total >= monster.armorClass);
      setPendingAttack({
        type: 'weapon',
        name: primaryWeapon?.name || 'Unarmed Strike',
        atkRoll,
        isHit,
        isCrit: atkRoll.isCrit,
        isFumble: atkRoll.isFumble,
        damageFormula: weaponFormula,
        damageBonus: weaponBonus,
      });

      if (!isHit) {
        sounds.playBlock();
        setActionSummary({
          title: atkRoll.isFumble ? 'CRITICAL FUMBLE!' : 'ATTACK MISSED',
          details: `Attack Roll: [${atkRoll.individualRolls[0]}] ${atkRoll.modifier >= 0 ? `+ ${atkRoll.modifier}` : atkRoll.modifier} (STR + Weapon) = ${atkRoll.total} vs Enemy AC ${monster.armorClass}. The blow failed to penetrate!`,
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
      } else {
        sounds.playHit();
        setActionSummary({
          title: atkRoll.isCrit ? 'CRITICAL HIT!' : 'ATTACK HIT!',
          details: `Attack Roll: [${atkRoll.individualRolls[0]}] ${atkRoll.modifier >= 0 ? `+ ${atkRoll.modifier}` : atkRoll.modifier} (STR + Weapon) = ${atkRoll.total} vs Enemy AC ${monster.armorClass}. Strike connected! Proceed to roll damage dice.`,
          isHit: true,
          isCrit: atkRoll.isCrit,
          type: 'hero',
        });
      }

      setCombatStep('HERO_ATTACK_RESULT');
    }, 600);
  };

  // 2. HERO EXECUTES DAMAGE ROLL (Step 2: Roll Damage dice after confirming Hit)
  const handleHeroRollDamage = () => {
    if (!pendingAttack || combatStep !== 'HERO_ATTACK_RESULT' || !pendingAttack.isHit) return;
    setCombatStep('HERO_DAMAGE_ROLLING');
    sounds.playDiceRoll();

    setTimeout(() => {
      const dmgRes = parseAndRollFormula(pendingAttack.damageFormula, heroStats, pendingAttack.damageBonus);
      let dmg = dmgRes.total;

      if (pendingAttack.isCrit) {
        dmg = dmg * 2 + 3;
        sounds.playCriticalHit();
        hero.statsHistory.critsRolled += 1;
      } else {
        if (pendingAttack.type === 'spell') sounds.playFire();
        else sounds.playHit();
      }

      hero.statsHistory.highestDamageDealt = Math.max(hero.statsHistory.highestDamageDealt, dmg);
      const newMonsterHp = Math.max(0, monster.hp - dmg);
      monster.hp = newMonsterHp;
      setDamageRoll(dmgRes);

      setActionSummary({
        title: pendingAttack.isCrit ? 'CRITICAL HIT & DAMAGE!' : 'DAMAGE DEALT!',
        details: `Hit with ${pendingAttack.name}! Damage Dice: ${dmgRes.formulaString} (${dmgRes.individualRolls.join(' + ')}) ${dmgRes.modifier >= 0 ? `+ ${dmgRes.modifier}` : dmgRes.modifier} = ${dmg} damage dealt to ${monster.name}.`,
        damage: dmg,
        isHit: true,
        isCrit: pendingAttack.isCrit,
        type: 'hero',
      });

      addLog(
        'hero',
        `Hit with ${pendingAttack.name}`,
        `Attack roll ${pendingAttack.atkRoll.total} vs AC ${monster.armorClass}. Dealt ${dmg} damage (${dmgRes.formulaString}).`,
        {
          diceType: 'd20',
          rolls: pendingAttack.atkRoll.individualRolls,
          modifier: pendingAttack.atkRoll.modifier,
          total: pendingAttack.atkRoll.total,
          targetValue: monster.armorClass,
          isCrit: pendingAttack.isCrit,
        },
        dmg
      );

      onUpdateHero({ ...hero });
      onUpdateCombat({ ...combat });
      setCombatStep('HERO_DAMAGE_RESULT');
    }, 600);
  };

  // 3. HERO CAST SPELL / SKILL
  const handleHeroCastSkill = (skill: HeroSkill) => {
    if (combatStep !== 'HERO_CHOICE' || hero.currentMana < skill.manaCost) return;
    hero.currentMana -= skill.manaCost;

    if (skill.type === 'heal') {
      setCombatStep('HERO_ATTACK_ROLLING');
      sounds.playMagic();
      const healRoll = parseAndRollFormula(skill.diceFormula || '1d8+INT', heroStats);
      setCurrentRoll(healRoll);

      setTimeout(() => {
        const healed = healRoll.total;
        hero.currentHp = Math.min(hero.maxHp, hero.currentHp + healed);
        sounds.playLevelUp();

        setActionSummary({
          title: `${skill.name} Cast!`,
          details: `Channeled divine restorative light! Rolled ${healRoll.formulaString} = ${healed} HP restored. Current HP: ${hero.currentHp} / ${hero.maxHp}.`,
          type: 'hero',
        });

        addLog('hero', skill.name, `Restored ${healed} Hit Points.`);
        onUpdateHero({ ...hero });
        onUpdateCombat({ ...combat });
        setCombatStep('HERO_NON_DAMAGE_RESULT');
      }, 600);
      return;
    }

    if (skill.type === 'buff') {
      combat.heroDefending = true;
      sounds.playBlock();
      setActionSummary({
        title: `${skill.name} Activated!`,
        details: `Raised protective warding barrier (+4 Armor Class & 3 Damage Absorbed) for this round!`,
        type: 'hero',
      });
      addLog('hero', skill.name, `Raised defense ward (+4 AC).`);
      onUpdateHero({ ...hero });
      onUpdateCombat({ ...combat });
      setCombatStep('HERO_NON_DAMAGE_RESULT');
      return;
    }

    // Attack Spell (Two-Stage: To-Hit -> Damage)
    setCombatStep('HERO_ATTACK_ROLLING');
    sounds.playMagic();

    const spellAtkMod = intMod;
    const spellRoll = rollDice(1, 20, spellAtkMod);
    setCurrentRoll(spellRoll);

    setTimeout(() => {
      const isHit = spellRoll.isCrit || (!spellRoll.isFumble && spellRoll.total >= monster.armorClass);
      setPendingAttack({
        type: 'spell',
        name: skill.name,
        atkRoll: spellRoll,
        isHit,
        isCrit: spellRoll.isCrit,
        isFumble: spellRoll.isFumble,
        damageFormula: skill.diceFormula || '2d6+INT',
        damageBonus: intMod,
        skill,
      });

      if (!isHit) {
        sounds.playBlock();
        setActionSummary({
          title: `${skill.name} Fizzled`,
          details: `Spell Roll: [${spellRoll.individualRolls[0]}] ${spellRoll.modifier >= 0 ? `+ ${spellRoll.modifier}` : spellRoll.modifier} (INT) = ${spellRoll.total} vs AC ${monster.armorClass}. Deflected by monster wards!`,
          isHit: false,
          type: 'hero',
        });
        addLog('hero', `${skill.name} (Fizzle)`, `Spell failed to penetrate AC ${monster.armorClass}.`);
      } else {
        sounds.playFire();
        setActionSummary({
          title: spellRoll.isCrit ? `CRITICAL ${skill.name.toUpperCase()}!` : `${skill.name} Connected!`,
          details: `Spell Roll: [${spellRoll.individualRolls[0]}] ${spellRoll.modifier >= 0 ? `+ ${spellRoll.modifier}` : spellRoll.modifier} (INT) = ${spellRoll.total} vs AC ${monster.armorClass}. Spell penetrated wards! Proceed to roll damage dice.`,
          isHit: true,
          isCrit: spellRoll.isCrit,
          type: 'hero',
        });
      }

      setCombatStep('HERO_ATTACK_RESULT');
    }, 600);
  };

  // 4. HERO DEFEND STANCE
  const handleHeroDefend = () => {
    if (combatStep !== 'HERO_CHOICE') return;
    combat.heroDefending = true;
    sounds.playBlock();

    setActionSummary({
      title: 'Defensive Guard Raised',
      details: `Raised shield and braced for impact: +4 Armor Class (Your AC ${heroAc} ➔ ${heroAc + 4}) and reduces all incoming monster damage by 3 this round.`,
      type: 'hero',
    });

    addLog('hero', 'Defensive Guard', 'Raised shield for +4 AC & 3 dmg reduction.');
    onUpdateCombat({ ...combat });
    setCombatStep('HERO_NON_DAMAGE_RESULT');
  };

  // 5. ATTEMPT FLEE ACTION
  const handleAttemptFlee = () => {
    if (combatStep !== 'HERO_CHOICE') return;
    setCombatStep('HERO_ATTACK_ROLLING');
    sounds.playDiceRoll();

    const escapeDc = 10 + monster.level;
    const fleeRoll = rollDice(1, 20, fleeMod);
    setCurrentRoll(fleeRoll);

    setTimeout(() => {
      if (fleeRoll.total >= escapeDc) {
        // Success!
        sounds.playLoot();
        setActionSummary({
          title: '✦ ESCAPED THE ENCOUNTER!',
          details: `Flee Check: Rolled [${fleeRoll.individualRolls[0]}] ${fleeRoll.modifier >= 0 ? `+ ${fleeRoll.modifier}` : fleeRoll.modifier} = ${fleeRoll.total} vs Escape DC ${escapeDc}. You retreated safely to the previous chamber!`,
          type: 'flee',
          isHit: true,
        });
        addLog('hero', 'Escaped', `Fled combat successfully (DC ${escapeDc}).`);
        setCombatStep('FLEE_RESULT');
      } else {
        // Failure
        sounds.playTrap();
        setActionSummary({
          title: '✖ FLEE FAILED! ESCAPE CUT OFF!',
          details: `Flee Check: Rolled [${fleeRoll.individualRolls[0]}] ${fleeRoll.modifier >= 0 ? `+ ${fleeRoll.modifier}` : fleeRoll.modifier} = ${fleeRoll.total} vs Escape DC ${escapeDc}. ${monster.name} blocks your escape!`,
          type: 'flee',
          isHit: false,
        });
        addLog('hero', 'Flee Failed', `Failed to escape DC ${escapeDc}.`);
        setCombatStep('HERO_NON_DAMAGE_RESULT');
      }
    }, 600);
  };

  // 6. USE POTION / CONSUMABLE IN COMBAT
  const handleUseCombatItem = (invIdx: number) => {
    const inv = hero.inventory[invIdx];
    if (!inv || !inv.item.usableInCombat) return;
    const item = inv.item;

    if (item.healHp) {
      sounds.playHeal();
      hero.currentHp = Math.min(hero.maxHp, hero.currentHp + item.healHp);
      setActionSummary({
        title: `Drank ${item.name}!`,
        details: `Recovered ${item.healHp} Hit Points! Current HP: ${hero.currentHp}/${hero.maxHp}.`,
        type: 'hero',
      });
      addLog('hero', `Used ${item.name}`, `Restored ${item.healHp} HP.`);
    } else if (item.healMana) {
      sounds.playSpell();
      hero.currentMana = Math.min(hero.maxMana, hero.currentMana + item.healMana);
      setActionSummary({
        title: `Drank ${item.name}!`,
        details: `Restored ${item.healMana} Mana! Current Mana: ${hero.currentMana}/${hero.maxMana}.`,
        type: 'hero',
      });
      addLog('hero', `Used ${item.name}`, `Restored ${item.healMana} Mana.`);
    }

    if (inv.quantity > 1) {
      inv.quantity -= 1;
    } else {
      hero.inventory.splice(invIdx, 1);
    }

    onUpdateHero({ ...hero });
    onUpdateCombat({ ...combat });
    setCombatStep('HERO_NON_DAMAGE_RESULT');
  };

  // 7. TRIGGER ENEMY TURN
  const handleProceedToEnemyTurn = () => {
    if (monster.hp <= 0) {
      handleMonsterSlain();
      return;
    }

    setCombatStep('ENEMY_ROLLING');
    sounds.playDiceRoll();

    const actions = monster.actions;
    const action = actions[Math.floor(Math.random() * actions.length)] || actions[0];

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
          details: `${action.name}: Rolled [${atkRoll.individualRolls[0]}] ${atkRoll.modifier >= 0 ? `+ ${atkRoll.modifier}` : atkRoll.modifier} = ${atkRoll.total} vs your AC ${heroAc}. You took ${dmg} damage!`,
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
          details: `${action.name}: Rolled [${atkRoll.individualRolls[0]}] ${atkRoll.modifier >= 0 ? `+ ${atkRoll.modifier}` : atkRoll.modifier} = ${atkRoll.total} vs your AC ${heroAc}. The blow was deflected!`,
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

  // 8. BEGIN NEXT ROUND (Player Turn)
  const handleBeginNextHeroRound = () => {
    setCurrentRoll(null);
    setDamageRoll(null);
    setPendingAttack(null);
    setActionSummary(null);
    setCombatStep('HERO_CHOICE');
  };

  // 9. MONSTER SLAIN
  const handleMonsterSlain = () => {
    sounds.playLevelUp();
    sounds.playCoins();
    hero.statsHistory.monstersSlain += 1;

    const goldReward =
      Math.floor(Math.random() * (monster.goldMax - monster.goldMin + 1)) + monster.goldMin;
    const itemsAwarded: GameItem[] = [];

    if (Math.random() < monster.lootDropChance && monster.possibleLootIds?.length) {
      const lootId = monster.possibleLootIds[Math.floor(Math.random() * monster.possibleLootIds.length)];
      if (ITEMS_DATABASE[lootId]) {
        itemsAwarded.push(ITEMS_DATABASE[lootId]);
      }
    }

    hero.statsHistory.goldCollected += goldReward;

    onCombatVictory(monster, {
      xp: monster.xpReward,
      gold: goldReward,
      items: itemsAwarded,
    });
  };

  // Combat consumables in inventory
  const combatConsumables = hero.inventory
    .map((inv, idx) => ({ inv, idx }))
    .filter(({ inv }) => inv.item.usableInCombat);

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
                    Lvl {hero.level} {hero.classId}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-700 text-blue-300 font-bold">
                  AC {heroAc}
                </span>
                {combat.heroDefending && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 text-[10px] font-bold animate-pulse">
                    SHIELD +4
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
                  <span className="text-cyan-400 font-bold">Mana</span>
                  <span className="text-stone-300">
                    {hero.currentMana} / {hero.maxMana}
                  </span>
                </div>
                <div className="w-full bg-stone-900 rounded-full h-2 border border-stone-800 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full transition-all duration-500 rounded-full"
                    style={{ width: `${(hero.currentMana / hero.maxMana) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Active Spell Buffs / Modifiers Tracker in Hero HUD */}
            {hero.activeEffects && hero.activeEffects.length > 0 && (
              <div className="pt-1 flex flex-wrap gap-1">
                {hero.activeEffects.map((eff) => (
                  <span
                    key={eff.id}
                    className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700 flex items-center gap-1"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    {eff.name} ({eff.durationTurns}t)
                  </span>
                ))}
              </div>
            )}
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

      {/* Middle Interactive Zone: Combat Actions, Rolls & Outcome Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Main Combat Interaction & Step Card */}
        <div className="lg:col-span-2 space-y-4">
          {/* STEP 1: Hero Action Choice (With Detailed Explanatory Formulas) */}
          {combatStep === 'HERO_CHOICE' && (
            <div className="bg-[#18120c]/90 border-2 border-amber-800/60 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-amber-900/50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-400 font-mono text-xs font-bold uppercase">
                    Your Turn • Round {combat.turnNumber}
                  </span>
                  <h3 className="text-lg font-serif font-bold text-amber-200">
                    Select Your Combat Action
                  </h3>
                </div>
              </div>

              {/* Action Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Attack with Weapon */}
                <button
                  id="btn-combat-weapon-attack"
                  onClick={handleHeroAttack}
                  className="p-3.5 bg-gradient-to-r from-amber-950/70 via-stone-900 to-stone-900 border-2 border-amber-600 hover:border-amber-300 rounded-xl text-left transition-all cursor-pointer transform active:scale-98 group flex flex-col justify-between shadow-md"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 group-hover:scale-110 transition-transform shrink-0">
                      <Sword className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-serif font-bold text-amber-200 text-sm">
                        Attack with {primaryWeapon?.name || 'Bare Fists'}
                      </div>
                      <div className="text-[11px] text-amber-400/90 font-mono mt-0.5">
                        Roll: 1d20 {totalWeaponAtkMod >= 0 ? `+ ${totalWeaponAtkMod}` : totalWeaponAtkMod} vs AC {monster.armorClass}
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-[#130d08] p-1.5 rounded border border-[#3b2716] text-[10px] font-mono text-stone-300">
                    <span className="text-amber-400 font-bold">Damage:</span> {weaponFormula}{' '}
                    {weaponBonus >= 0 ? `+ ${weaponBonus}` : weaponBonus} ({strMod >= 0 ? `+${strMod}` : strMod} STR
                    {primaryWeapon?.bonusDamage ? ` +${primaryWeapon.bonusDamage} Wpn` : ''})
                  </div>
                </button>

                {/* 2. Defend Guard */}
                <button
                  id="btn-combat-defend"
                  onClick={handleHeroDefend}
                  className="p-3.5 bg-gradient-to-r from-blue-950/70 via-stone-900 to-stone-900 border-2 border-blue-600 hover:border-blue-300 rounded-xl text-left transition-all cursor-pointer transform active:scale-98 group flex flex-col justify-between shadow-md"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 group-hover:scale-110 transition-transform shrink-0">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-serif font-bold text-blue-200 text-sm">
                        Defensive Guard & Shield
                      </div>
                      <div className="text-[11px] text-blue-400/90 font-mono mt-0.5">
                        Guaranteed +4 AC (AC {heroAc} ➔ {heroAc + 4})
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-[#0d121a] p-1.5 rounded border border-[#1d2b40] text-[10px] font-mono text-stone-300">
                    <span className="text-blue-300 font-bold">Effect:</span> Absorbs 3 damage from monster attacks this turn.
                  </div>
                </button>

                {/* 3. Hero Spells & Class Skills */}
                {hero.skills.map((skill) => {
                  const canAfford = hero.currentMana >= skill.manaCost;
                  const isHeal = skill.type === 'heal';
                  const isBuff = skill.type === 'buff';

                  return (
                    <button
                      key={skill.id}
                      id={`btn-combat-skill-${skill.id}`}
                      onClick={() => handleHeroCastSkill(skill)}
                      disabled={!canAfford}
                      className={`p-3.5 border-2 rounded-xl text-left transition-all flex flex-col justify-between shadow-md ${
                        canAfford
                          ? 'bg-gradient-to-r from-purple-950/70 via-stone-900 to-stone-900 border-purple-600 hover:border-purple-300 cursor-pointer transform active:scale-98'
                          : 'bg-stone-950/40 border-stone-900 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 shrink-0">
                          <Wand2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-serif font-bold text-purple-200 text-sm flex items-center justify-between">
                            <span>{skill.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-purple-950 text-purple-300 rounded border border-purple-800">
                              {skill.manaCost} MP
                            </span>
                          </div>
                          <div className="text-[11px] text-purple-300/90 font-mono mt-0.5">
                            {isHeal
                              ? `Heals ${skill.diceFormula || '1d8+INT'}`
                              : isBuff
                              ? `Defensive Ward (+4 AC)`
                              : `Roll: 1d20 ${intMod >= 0 ? `+ ${intMod}` : intMod} (INT) vs AC ${monster.armorClass}`}
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-[#140e1c] p-1.5 rounded border border-[#3b284f] text-[10px] font-mono text-stone-300">
                        <span className="text-purple-300 font-bold">Effect:</span> {skill.description}
                      </div>
                    </button>
                  );
                })}

                {/* 4. Attempt Flee Button */}
                <button
                  id="btn-combat-flee"
                  onClick={handleAttemptFlee}
                  className="p-3.5 bg-gradient-to-r from-stone-900 via-stone-900 to-stone-900 border-2 border-stone-700 hover:border-amber-400 rounded-xl text-left transition-all cursor-pointer transform active:scale-98 group flex flex-col justify-between shadow-md"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="p-2 bg-stone-800 rounded-lg text-amber-300 group-hover:scale-110 transition-transform shrink-0">
                      <Footprints className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-serif font-bold text-stone-200 text-sm">
                        Attempt Tactical Escape
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                        Roll: 1d20 {fleeMod >= 0 ? `+ ${fleeMod}` : fleeMod} (DEX/LCK) vs DC {10 + monster.level}
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-[#14120f] p-1.5 rounded border border-[#38332a] text-[10px] font-mono text-stone-300">
                    <span className="text-amber-300 font-bold">Flee Rule:</span> Retreats to safety if check passes.
                  </div>
                </button>
              </div>

              {/* Combat Consumables in Pack */}
              {combatConsumables.length > 0 && (
                <div className="pt-3 border-t border-amber-900/40">
                  <span className="text-xs font-serif font-bold text-amber-300 uppercase tracking-wider block mb-2">
                    Adventurer's Pack • Combat Potions & Consumables:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {combatConsumables.map(({ inv, idx }) => (
                      <button
                        key={idx}
                        id={`btn-combat-item-${idx}`}
                        onClick={() => handleUseCombatItem(idx)}
                        className="px-3 py-1.5 bg-[#2a1a10] hover:bg-[#3d2718] text-amber-200 border border-[#6b4728] rounded-lg text-xs font-serif flex items-center gap-1.5 cursor-pointer shadow transition-colors"
                      >
                        <Package className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {inv.item.name} {inv.quantity > 1 ? `(x${inv.quantity})` : ''}
                        </span>
                        {inv.item.healHp && (
                          <span className="text-[10px] font-mono text-emerald-400">(+{inv.item.healHp} HP)</span>
                        )}
                        {inv.item.healMana && (
                          <span className="text-[10px] font-mono text-cyan-400">(+{inv.item.healMana} MP)</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Attack Dice Rolling Animation Phase */}
          {combatStep === 'HERO_ATTACK_ROLLING' && (
            <div className="space-y-3">
              <DiceVisualizer
                currentRoll={currentRoll}
                isRolling={true}
                allowCustomDice={false}
                label="Rolling d20 Attack Check vs Armor Class..."
              />
              <p className="text-center text-xs text-amber-300/80 font-mono animate-pulse">
                Rolling 1d20 + Modifiers against Target Armor Class...
              </p>
            </div>
          )}

          {/* STEP 3: Hero Attack Result (SHOWS THE DICE RESULT BEFORE CLICKING TO CONTINUE WITH DAMAGE ROLL) */}
          {combatStep === 'HERO_ATTACK_RESULT' && pendingAttack && actionSummary && (
            <div className="bg-[#18120c]/95 border-2 border-amber-500 rounded-xl p-6 shadow-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-amber-900/60 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase ${
                      pendingAttack.isHit
                        ? 'bg-emerald-950 border border-emerald-600 text-emerald-300'
                        : 'bg-red-950 border border-red-600 text-red-300'
                    }`}
                  >
                    {pendingAttack.isHit ? 'Attack Check: HIT' : 'Attack Check: MISSED'}
                  </span>
                  <h3 className="text-xl font-serif font-bold text-amber-200">
                    {actionSummary.title}
                  </h3>
                </div>
                <div className="font-mono text-xs font-bold px-2.5 py-1 bg-stone-900 rounded border border-stone-700 text-amber-300">
                  d20 Roll: [{pendingAttack.atkRoll.individualRolls[0]}]{' '}
                  {pendingAttack.atkRoll.modifier >= 0
                    ? `+ ${pendingAttack.atkRoll.modifier}`
                    : pendingAttack.atkRoll.modifier}{' '}
                  = {pendingAttack.atkRoll.total} vs AC {monster.armorClass}
                </div>
              </div>

              {/* Visual Attack Dice Breakdown */}
              <div className="p-4 bg-stone-900/80 rounded-lg border border-amber-900/60 space-y-2">
                <div className="text-sm text-stone-200 leading-relaxed font-serif">
                  {actionSummary.details}
                </div>
                <div className="text-xs font-mono text-stone-400 bg-[#120d09] p-2.5 rounded border border-[#3b2718]">
                  <div className="flex justify-between mb-1">
                    <span>Target Armor Class (AC):</span>
                    <span className="text-amber-300 font-bold">{monster.armorClass}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>Hero Total Attack Roll:</span>
                    <span className={`font-bold ${pendingAttack.isHit ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pendingAttack.atkRoll.total} ({pendingAttack.isHit ? '≥ Target AC' : '< Target AC'})
                    </span>
                  </div>
                  {pendingAttack.isHit && (
                    <div className="flex justify-between pt-1 border-t border-stone-800 text-amber-300">
                      <span>Weapon Damage Dice to Roll:</span>
                      <span className="font-bold">
                        {pendingAttack.damageFormula}{' '}
                        {pendingAttack.damageBonus >= 0 ? `+ ${pendingAttack.damageBonus}` : pendingAttack.damageBonus}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Action Controls */}
              <div className="flex justify-end pt-2">
                {pendingAttack.isHit ? (
                  <button
                    id="btn-roll-damage"
                    onClick={handleHeroRollDamage}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 text-stone-950 font-black font-serif rounded-xl shadow-xl flex items-center gap-2 transition-all cursor-pointer transform hover:scale-105"
                  >
                    <Dices className="w-5 h-5" />
                    <span>
                      Roll Damage Dice ({pendingAttack.damageFormula}
                      {pendingAttack.damageBonus >= 0 ? `+${pendingAttack.damageBonus}` : pendingAttack.damageBonus}) ➔
                    </span>
                  </button>
                ) : (
                  <button
                    id="btn-continue-missed-enemy-turn"
                    onClick={handleProceedToEnemyTurn}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 text-stone-100 font-black font-serif rounded-xl shadow-xl flex items-center gap-2 transition-all cursor-pointer transform hover:scale-105"
                  >
                    Continue to Enemy Turn ➔
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Damage Dice Rolling Animation */}
          {combatStep === 'HERO_DAMAGE_ROLLING' && (
            <div className="space-y-3">
              <DiceVisualizer
                currentRoll={damageRoll}
                isRolling={true}
                allowCustomDice={false}
                label="Rolling Damage Dice..."
              />
              <p className="text-center text-xs text-amber-300/80 font-mono animate-pulse">
                Rolling weapon damage dice + modifiers...
              </p>
            </div>
          )}

          {/* STEP 5: Damage Roll Result & Next Step */}
          {combatStep === 'HERO_DAMAGE_RESULT' && actionSummary && (
            <div className="bg-[#18120c]/95 border-2 border-emerald-500 rounded-xl p-6 shadow-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-amber-900/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase bg-emerald-950 border border-emerald-600 text-emerald-300">
                    Damage Dealt
                  </span>
                  <h3 className="text-xl font-serif font-bold text-amber-200">
                    {actionSummary.title}
                  </h3>
                </div>
                {actionSummary.damage !== undefined && (
                  <span className="font-mono text-sm font-bold px-3 py-1 bg-red-950 rounded border border-red-700 text-red-300">
                    -{actionSummary.damage} HP
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
                    id="btn-victory-claim-spoils"
                    onClick={handleMonsterSlain}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 text-stone-950 font-black font-serif rounded-xl shadow-xl flex items-center gap-2 transition-all cursor-pointer transform hover:scale-105"
                  >
                    <Award className="w-5 h-5" />
                    Victory! Claim Spoils & XP ➔
                  </button>
                ) : (
                  <button
                    id="btn-continue-after-damage"
                    onClick={handleProceedToEnemyTurn}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 text-stone-100 font-black font-serif rounded-xl shadow-xl flex items-center gap-2 transition-all cursor-pointer transform hover:scale-105"
                  >
                    Continue to Enemy Turn ➔
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Non-Damage Hero Action Result (e.g. Heal, Buff, Item) */}
          {combatStep === 'HERO_NON_DAMAGE_RESULT' && actionSummary && (
            <div className="bg-[#18120c]/95 border-2 border-amber-500 rounded-xl p-6 shadow-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-amber-900/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase bg-purple-950 border border-purple-600 text-purple-300">
                    Action Outcome
                  </span>
                  <h3 className="text-xl font-serif font-bold text-amber-200">
                    {actionSummary.title}
                  </h3>
                </div>
              </div>

              <div className="p-4 bg-stone-900/80 rounded-lg border border-amber-900/60 text-sm text-stone-200 leading-relaxed font-serif">
                {actionSummary.details}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  id="btn-proceed-enemy-from-support"
                  onClick={handleProceedToEnemyTurn}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 text-stone-100 font-black font-serif rounded-xl shadow-xl flex items-center gap-2 transition-all cursor-pointer transform hover:scale-105"
                >
                  Continue to Enemy Turn ➔
                </button>
              </div>
            </div>
          )}

          {/* Enemy Rolling Phase */}
          {combatStep === 'ENEMY_ROLLING' && (
            <div className="space-y-3">
              <DiceVisualizer
                currentRoll={currentRoll}
                isRolling={true}
                allowCustomDice={false}
                label={`${monster.name} Strike (1d20 + ${monster.attackBonus})`}
              />
              <p className="text-center text-xs text-red-400 font-mono animate-pulse">
                {monster.name} is rolling attack against your AC {heroAc}...
              </p>
            </div>
          )}

          {/* STEP 6: Enemy Result Card with Explicit "Begin Round" Button */}
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
                    id="btn-begin-next-round"
                    onClick={handleBeginNextHeroRound}
                    className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 text-stone-950 font-black font-serif rounded-xl shadow-xl flex items-center gap-2 transition-all cursor-pointer transform hover:scale-105"
                  >
                    Begin Round {combat.turnNumber} (Your Turn) ➔
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 7: Successful Flee Result */}
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
                  id="btn-flee-retreat"
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
        <div className="bg-[#18120c]/90 border-2 border-stone-800 rounded-xl p-4 shadow-xl flex flex-col h-[480px]">
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
