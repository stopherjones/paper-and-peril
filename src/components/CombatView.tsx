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
  AlertTriangle,
  Footprints,
  Check,
} from 'lucide-react';
import { CombatLogEntry, CombatState, GameItem, HeroCharacter, HeroSkill, Monster, StatType } from '../types/game';
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
  
  const fleeStatKey: StatType = dexMod >= lckMod ? 'DEX' : 'LCK';
  const fleeMod = Math.max(dexMod, lckMod);

  const primaryWeapon = hero.equipment.weapon;
  const isFinesseOrRanged = Boolean(
    primaryWeapon &&
      (primaryWeapon.name.toLowerCase().includes('bow') ||
        primaryWeapon.name.toLowerCase().includes('dagger') ||
        primaryWeapon.name.toLowerCase().includes('stiletto') ||
        primaryWeapon.name.toLowerCase().includes('rapier') ||
        primaryWeapon.name.toLowerCase().includes('dart') ||
        primaryWeapon.name.toLowerCase().includes('sling') ||
        primaryWeapon.name.toLowerCase().includes('crossbow'))
  );
  const weaponStatKey: StatType = isFinesseOrRanged && dexMod >= strMod ? 'DEX' : 'STR';
  const weaponStatMod = weaponStatKey === 'DEX' ? dexMod : strMod;
  const weaponItemBonus = primaryWeapon?.bonusDamage || 0;
  const weaponFormula = primaryWeapon?.damageDice || '1d4';
  const weaponBonus = weaponItemBonus + weaponStatMod;
  const totalWeaponAtkMod = weaponStatMod + weaponItemBonus;
  const weaponStatBreakdown = `${weaponStatMod >= 0 ? `+${weaponStatMod}` : weaponStatMod} ${weaponStatKey}${weaponItemBonus ? ` +${weaponItemBonus} Wpn` : ''}`;

  // Helper to compute deep breakdown for any skill
  const getSkillDetails = (skill: HeroSkill) => {
    let statKey: StatType = 'STR';
    if (skill.diceFormula?.includes('STR')) statKey = 'STR';
    else if (skill.diceFormula?.includes('DEX')) statKey = 'DEX';
    else if (skill.diceFormula?.includes('INT')) statKey = 'INT';
    else if (skill.diceFormula?.includes('CON')) statKey = 'CON';
    else if (skill.diceFormula?.includes('LCK')) statKey = 'LCK';
    else if (['aimed_shot', 'multishot', 'sneak_attack', 'smoke_bomb', 'poison_blade', 'survival_instinct'].includes(skill.id)) statKey = 'DEX';
    else if (['cleave', 'smite', 'holy_strike', 'shield_wall', 'bulwark', 'holy_blessing'].includes(skill.id)) statKey = 'STR';
    else if (['magic_missile', 'pyroblast', 'mana_shield'].includes(skill.id)) statKey = 'INT';
    else if (['heal_prayer', 'second_wind', 'lay_on_hands'].includes(skill.id)) statKey = 'CON';
    else if (hero.classId === 'wizard') statKey = 'INT';
    else if (hero.classId === 'ranger' || hero.classId === 'rogue') statKey = 'DEX';
    else if (hero.classId === 'cleric') statKey = 'CON';

    const statMod = getStatModifier(heroStats[statKey]);

    let extraAccuracy = 0;
    let extraAccuracyLabel = '';
    let isAutoHit = false;

    if (skill.id === 'aimed_shot') {
      extraAccuracy = 2;
      extraAccuracyLabel = '+2 Aim';
    } else if (skill.id === 'sneak_attack') {
      extraAccuracy = 1;
      extraAccuracyLabel = '+1 Stealth';
    } else if (skill.id === 'magic_missile') {
      isAutoHit = true;
    }

    const totalAtkMod = statMod + extraAccuracy;

    // Parse base dice from formula
    const match = skill.diceFormula?.match(/^(\d+d\d+)/i);
    const baseDice = match ? match[1] : (skill.diceFormula || '1d8');

    let damageBonus = statMod;
    let damageBreakdown = `${statMod >= 0 ? `+${statMod}` : statMod} ${statKey}`;

    if (skill.id === 'cleave' || skill.id === 'holy_strike') {
      damageBonus = statMod + weaponItemBonus;
      damageBreakdown = `${statMod >= 0 ? `+${statMod}` : statMod} ${statKey}${weaponItemBonus ? ` +${weaponItemBonus} Wpn` : ''}`;
    } else if (skill.id === 'smite') {
      damageBonus = statMod + weaponItemBonus;
      damageBreakdown = `${statMod >= 0 ? `+${statMod}` : statMod} ${statKey}${weaponItemBonus ? ` +${weaponItemBonus} Wpn` : ''} +1d6 Holy`;
    }

    let rollSubtitle = '';
    let boxLabel = 'Damage';
    let boxText = '';

    if (skill.type === 'heal') {
      boxLabel = 'Healing';
      if (skill.id === 'lay_on_hands') {
        rollSubtitle = `Heals Flat +15 HP (Sacred Vitality) • Target Self`;
        boxText = `Flat +15 HP • Restores Hit Points (Max ${hero.maxHp} HP)`;
      } else {
        rollSubtitle = `Heals: ${baseDice} ${statMod >= 0 ? `+ ${statMod}` : statMod} (${statMod >= 0 ? `+${statMod}` : statMod} ${statKey}) • Target Self`;
        boxText = `${baseDice} ${statMod >= 0 ? `+ ${statMod}` : statMod} (${statMod >= 0 ? `+${statMod}` : statMod} ${statKey}) • Restores Hit Points (Max ${hero.maxHp} HP)`;
      }
    } else if (skill.type === 'buff') {
      boxLabel = 'Effect';
      if (skill.id === 'survival_instinct') {
        rollSubtitle = `Defensive Ward (+4 AC & +15% Crit)`;
        boxText = `+4 AC & +15% Critical Strike Chance for 3 turns • Sharpens senses`;
      } else if (skill.id === 'shield_wall') {
        rollSubtitle = `Defensive Ward (+4 AC & 3 Dmg Absorb)`;
        boxText = `+4 AC & absorbs 3 incoming monster damage for 2 turns • Iron guard`;
      } else if (skill.id === 'smoke_bomb') {
        rollSubtitle = `Smoke Screen (+75% Evasion Chance)`;
        boxText = `75% Dodge evasion chance against monster's next attack • Tactical smoke`;
      } else if (skill.id === 'poison_blade') {
        rollSubtitle = `Viper Venom (+1d6 Poison DoT)`;
        boxText = `Weapon attacks coat foe in venom dealing 1d6 poison damage per turn`;
      } else if (skill.id === 'mana_shield') {
        rollSubtitle = `Mana Barrier (Absorbs 20 Dmg)`;
        boxText = `Mystic barrier absorbs up to 20 incoming damage before depleting`;
      } else if (skill.id === 'holy_blessing') {
        rollSubtitle = `Divine Favor (+3 Atk & Saves)`;
        boxText = `+3 bonus to all d20 attack rolls and saving throws for 3 turns`;
      } else if (skill.id === 'bulwark') {
        rollSubtitle = `Aura Barrier (-4 All Incoming Dmg)`;
        boxText = `Radiates holy aura reducing all incoming damage by 4 for 3 turns`;
      } else {
        rollSubtitle = `Defensive Ward (+4 AC)`;
        boxText = skill.description;
      }
    } else {
      boxLabel = 'Damage';
      if (isAutoHit) {
        rollSubtitle = `Guaranteed Hit (${statMod >= 0 ? `+${statMod}` : statMod} ${statKey} Force) vs AC ${monster.armorClass}`;
      } else {
        const modBreakdown = `${statMod >= 0 ? `+${statMod}` : statMod} ${statKey}${extraAccuracyLabel ? ` ${extraAccuracyLabel}` : ''}`;
        rollSubtitle = `Roll: 1d20 ${totalAtkMod >= 0 ? `+ ${totalAtkMod}` : totalAtkMod} (${modBreakdown}) vs AC ${monster.armorClass}`;
      }

      let flavor = 'Special Attack';
      if (skill.id === 'aimed_shot') flavor = 'Precision Vital Strike';
      else if (skill.id === 'multishot') flavor = '3x Rapid Arrow Barrage';
      else if (skill.id === 'sneak_attack') flavor = 'Double Crit Threat Strike';
      else if (skill.id === 'magic_missile') flavor = 'Unerring Force (Never Misses)';
      else if (skill.id === 'pyroblast') flavor = 'Roaring Fire Blast';
      else if (skill.id === 'cleave') flavor = 'Sweeping Heavy Cleave';
      else if (skill.id === 'smite') flavor = 'Radiant Solar Smite';
      else if (skill.id === 'holy_strike') flavor = 'Disciplined Crusader Blow';

      boxText = `${baseDice} ${damageBonus >= 0 ? `+ ${damageBonus}` : damageBonus} (${damageBreakdown}) • ${flavor}`;
    }

    return {
      statKey,
      statMod,
      extraAccuracy,
      extraAccuracyLabel,
      totalAtkMod,
      isAutoHit,
      baseDice,
      damageBonus,
      damageBreakdown,
      rollSubtitle,
      boxLabel,
      boxText,
    };
  };

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

    const staggerBonus = combat.monsterStumbled ? 2 : 0;
    if (combat.monsterStumbled) {
      combat.monsterStumbled = false;
      onUpdateCombat({ ...combat });
    }

    const atkRoll = rollDice(1, 20, totalWeaponAtkMod + staggerBonus);
    setCurrentRoll(atkRoll);

    setTimeout(() => {
      const isHit = atkRoll.isCrit || (!atkRoll.isFumble && atkRoll.total >= monster.armorClass);
      
      if (atkRoll.isFumble) {
        combat.heroStumbled = true;
        onUpdateCombat({ ...combat });
      }

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
          title: atkRoll.isFumble ? 'CRITICAL FUMBLE! (Natural 1)' : 'ATTACK MISSED',
          details: atkRoll.isFumble
            ? `Attack Roll: [1] (Natural 1 Fumble!) ${atkRoll.modifier >= 0 ? `+ ${atkRoll.modifier}` : atkRoll.modifier} (${weaponStatBreakdown}${staggerBonus ? ' +2 Staggered' : ''}) = ${atkRoll.total} vs Enemy AC ${monster.armorClass}.\n\n💥 STUMBLED & VULNERABLE: You overextended and lost your balance! You FORFEIT your next combat turn while recovering your stance, giving ${monster.name} a free round to strike!`
            : `Attack Roll: [${atkRoll.individualRolls[0]}] ${atkRoll.modifier >= 0 ? `+ ${atkRoll.modifier}` : atkRoll.modifier} (${weaponStatBreakdown}${staggerBonus ? ' +2 Staggered' : ''}) = ${atkRoll.total} vs Enemy AC ${monster.armorClass}. The blow failed to penetrate!`,
          isHit: false,
          isFumble: atkRoll.isFumble,
          type: 'hero',
        });
        addLog(
          'hero',
          atkRoll.isFumble ? `Attack Fumble (Natural 1)` : `Attack with ${primaryWeapon?.name || 'Weapon'} (Miss)`,
          atkRoll.isFumble
            ? `Rolled Natural 1! Critical Fumble — Hero is stumbled and forfeits next turn!`
            : `Rolled [${atkRoll.individualRolls[0]}]+${atkRoll.modifier}=${atkRoll.total} vs AC ${monster.armorClass}. Missed!`,
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
          title: atkRoll.isCrit ? 'CRITICAL HIT! (Natural 20)' : 'ATTACK HIT!',
          details: atkRoll.isCrit
            ? `Attack Roll: [20] (Natural 20 Critical!) ${atkRoll.modifier >= 0 ? `+ ${atkRoll.modifier}` : atkRoll.modifier} (${weaponStatBreakdown}${staggerBonus ? ' +2 Staggered' : ''}) = ${atkRoll.total} vs Enemy AC ${monster.armorClass}.\n\n⚔️ CRITICAL STRIKE: Maximum penetration! Your upcoming damage roll will be DOUBLED (2x Damage Multiplier + 3 Brutal Strike Bonus)!`
            : `Attack Roll: [${atkRoll.individualRolls[0]}] ${atkRoll.modifier >= 0 ? `+ ${atkRoll.modifier}` : atkRoll.modifier} (${weaponStatBreakdown}${staggerBonus ? ' +2 Staggered' : ''}) = ${atkRoll.total} vs Enemy AC ${monster.armorClass}. Strike connected! Proceed to roll damage dice.`,
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
      const baseDmg = dmgRes.total;
      let dmg = baseDmg;

      if (pendingAttack.isCrit) {
        // Critical Hit Effect: Double Damage + 3 Brutal Strike Bonus
        const critMultiplier = 2;
        const brutalBonus = 3;
        dmg = baseDmg * critMultiplier + brutalBonus;
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
        details: pendingAttack.isCrit
          ? `Hit with ${pendingAttack.name}! Base Dice: ${dmgRes.formulaString} (${dmgRes.individualRolls.join(' + ')}) ${dmgRes.modifier >= 0 ? `+ ${dmgRes.modifier}` : dmgRes.modifier} = ${baseDmg} Base Damage.\n\n⚔️ CRITICAL MULTIPLIER APPLIED: [${baseDmg} Base × 2 (Critical Multiplier) + 3 (Brutal Strike Bonus)] = ${dmg} Total Damage dealt to ${monster.name}!`
          : `Hit with ${pendingAttack.name}! Damage Dice: ${dmgRes.formulaString} (${dmgRes.individualRolls.join(' + ')}) ${dmgRes.modifier >= 0 ? `+ ${dmgRes.modifier}` : dmgRes.modifier} = ${dmg} damage dealt to ${monster.name}.`,
        damage: dmg,
        isHit: true,
        isCrit: pendingAttack.isCrit,
        type: 'hero',
      });

      addLog(
        'hero',
        pendingAttack.isCrit ? `Critical Hit with ${pendingAttack.name}` : `Hit with ${pendingAttack.name}`,
        pendingAttack.isCrit
          ? `CRITICAL HIT! Rolled ${baseDmg} base damage. Applied 2x Multiplier + 3 Brutal = ${dmg} total damage!`
          : `Attack roll ${pendingAttack.atkRoll.total} vs AC ${monster.armorClass}. Dealt ${dmg} damage (${dmgRes.formulaString}).`,
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
    const detail = getSkillDetails(skill);

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
          details: `Channeled restorative light! Rolled ${healRoll.formulaString} = ${healed} HP restored. Current HP: ${hero.currentHp} / ${hero.maxHp}.`,
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
        details: detail.boxText,
        type: 'hero',
      });
      addLog('hero', skill.name, `Activated ${skill.name} (${detail.rollSubtitle}).`);
      onUpdateHero({ ...hero });
      onUpdateCombat({ ...combat });
      setCombatStep('HERO_NON_DAMAGE_RESULT');
      return;
    }

    // Attack Spell / Skill (Two-Stage: To-Hit -> Damage)
    setCombatStep('HERO_ATTACK_ROLLING');
    sounds.playMagic();

    const staggerBonus = combat.monsterStumbled ? 2 : 0;
    if (combat.monsterStumbled) {
      combat.monsterStumbled = false;
      onUpdateCombat({ ...combat });
    }

    const skillRoll = rollDice(1, 20, detail.totalAtkMod + staggerBonus);
    if (detail.isAutoHit) {
      skillRoll.isCrit = false;
      skillRoll.isFumble = false;
      skillRoll.total = Math.max(skillRoll.total, monster.armorClass);
    }
    setCurrentRoll(skillRoll);

    setTimeout(() => {
      const isHit = detail.isAutoHit || skillRoll.isCrit || (!skillRoll.isFumble && skillRoll.total >= monster.armorClass);
      
      if (skillRoll.isFumble && !detail.isAutoHit) {
        combat.heroStumbled = true;
        onUpdateCombat({ ...combat });
      }

      setPendingAttack({
        type: 'spell',
        name: skill.name,
        atkRoll: skillRoll,
        isHit,
        isCrit: skillRoll.isCrit,
        isFumble: skillRoll.isFumble,
        damageFormula: detail.baseDice,
        damageBonus: detail.damageBonus,
        skill,
      });

      const statBreakdown = `${detail.statMod >= 0 ? `+${detail.statMod}` : detail.statMod} ${detail.statKey}${detail.extraAccuracyLabel ? ` ${detail.extraAccuracyLabel}` : ''}${staggerBonus ? ' +2 Staggered' : ''}`;

      if (!isHit) {
        sounds.playBlock();
        setActionSummary({
          title: skillRoll.isFumble ? `${skill.name} Critical Fumble! (Natural 1)` : `${skill.name} Missed / Evaded`,
          details: skillRoll.isFumble
            ? `Attack Roll: [1] (Natural 1 Fumble!) ${skillRoll.modifier >= 0 ? `+ ${skillRoll.modifier}` : skillRoll.modifier} (${statBreakdown}) = ${skillRoll.total} vs AC ${monster.armorClass}.\n\n💥 STUMBLED & VULNERABLE: The ability completely backfired! You lost your footing and FORFEIT your next combat turn while recovering balance!`
            : `Attack Roll: [${skillRoll.individualRolls[0]}] ${skillRoll.modifier >= 0 ? `+ ${skillRoll.modifier}` : skillRoll.modifier} (${statBreakdown}) = ${skillRoll.total} vs AC ${monster.armorClass}. Deflected by monster defenses!`,
          isHit: false,
          isFumble: skillRoll.isFumble,
          type: 'hero',
        });
        addLog(
          'hero',
          skillRoll.isFumble ? `${skill.name} (Fumble)` : `${skill.name} (Miss)`,
          skillRoll.isFumble
            ? `Rolled Natural 1 on ${skill.name}! Hero stumbled and forfeits next turn!`
            : `Failed to penetrate AC ${monster.armorClass} (Rolled ${skillRoll.total}).`
        );
      } else {
        sounds.playFire();
        setActionSummary({
          title: skillRoll.isCrit ? `CRITICAL ${skill.name.toUpperCase()}! (Natural 20)` : `${skill.name} Connected!`,
          details: detail.isAutoHit
            ? `Unerring Arcane strike automatically hit monster for full effect! Proceed to roll damage.`
            : skillRoll.isCrit
            ? `Attack Roll: [20] (Natural 20 Critical!) ${skillRoll.modifier >= 0 ? `+ ${skillRoll.modifier}` : skillRoll.modifier} (${statBreakdown}) = ${skillRoll.total} vs AC ${monster.armorClass}.\n\n⚔️ CRITICAL STRIKE: Devastating direct hit! Your upcoming damage roll will be DOUBLED (2x Damage Multiplier + 3 Brutal Strike Bonus)!`
            : `Attack Roll: [${skillRoll.individualRolls[0]}] ${skillRoll.modifier >= 0 ? `+ ${skillRoll.modifier}` : skillRoll.modifier} (${statBreakdown}) = ${skillRoll.total} vs AC ${monster.armorClass}. Hit connected! Proceed to roll damage dice.`,
          isHit: true,
          isCrit: skillRoll.isCrit,
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
      if (fleeRoll.isFumble) {
        sounds.playTrap();
        combat.heroStumbled = true;
        setActionSummary({
          title: '✖ CRITICAL FUMBLE! ESCAPE BOTCHED (Natural 1)!',
          details: `Flee Check: Rolled [1] (Natural 1 Fumble!) ${fleeRoll.modifier >= 0 ? `+ ${fleeRoll.modifier}` : fleeRoll.modifier} = ${fleeRoll.total} vs Escape DC ${escapeDc}.\n\n💥 STUMBLED & VULNERABLE: You tripped on the flagstones while fleeing! You FORFEIT your next combat turn while scrambling back to your feet! (Fate cannot avert a Critical Fumble!)`,
          type: 'flee',
          isHit: false,
          isFumble: true,
        });
        addLog('hero', 'Flee Fumbled (Natural 1)', `Rolled Natural 1! Hero tripped and is stumbled!`);
        setCombatStep('HERO_NON_DAMAGE_RESULT');
      } else if (fleeRoll.total >= escapeDc) {
        // Success!
        sounds.playLoot();
        setActionSummary({
          title: '✦ ESCAPED THE ENCOUNTER!',
          details: `Flee Check: Rolled [${fleeRoll.individualRolls[0]}] ${fleeRoll.modifier >= 0 ? `+ ${fleeRoll.modifier}` : fleeRoll.modifier} = ${fleeRoll.total} vs Escape DC ${escapeDc}. You retreated safely to the previous chamber!`,
          type: 'flee',
          isHit: true,
          isFumble: false,
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
          isFumble: false,
        });
        addLog('hero', 'Flee Failed', `Failed to escape DC ${escapeDc}.`);
        setCombatStep('HERO_NON_DAMAGE_RESULT');
      }
    }, 600);
  };

  // 6. USE POTION / CONSUMABLE / SCROLL IN COMBAT
  const handleUseCombatItem = (invIdx: number) => {
    const inv = hero.inventory[invIdx];
    if (!inv || !inv.item.usableInCombat) return;
    const item = inv.item;

    // A. OFFENSIVE SPELL SCROLLS (e.g. Scroll of Fireball)
    if (item.damageDice || item.id === 'scroll_of_fireball') {
      if (inv.quantity > 1) {
        inv.quantity -= 1;
      } else {
        hero.inventory.splice(invIdx, 1);
      }

      setCombatStep('HERO_DAMAGE_ROLLING');
      sounds.playFire();

      const intMod = getStatModifier(heroStats.INT);
      const formula = item.damageDice || '3d8';
      const dmgRes = parseAndRollFormula(formula, heroStats, intMod);
      setDamageRoll(dmgRes);

      setPendingAttack({
        type: 'spell',
        name: item.name,
        damageFormula: formula,
        damageBonus: intMod,
        atkRoll: rollDice(1, 20, 0),
        isHit: true,
        isCrit: false,
        isFumble: false,
      });

      setTimeout(() => {
        const dmg = Math.max(1, dmgRes.total);
        hero.statsHistory.highestDamageDealt = Math.max(hero.statsHistory.highestDamageDealt, dmg);
        monster.hp = Math.max(0, monster.hp - dmg);
        sounds.playFire();

        setActionSummary({
          title: `🔥 ${item.name.toUpperCase()} BLAST!`,
          details: `You unfurled the enchanted parchment and unleashed a searing blaze upon ${monster.name}!\n\nDamage Roll: ${dmgRes.formulaString} (${dmgRes.individualRolls.join(' + ')}) ${dmgRes.modifier >= 0 ? `+ ${dmgRes.modifier}` : dmgRes.modifier} (${intMod >= 0 ? `+${intMod}` : intMod} INT Power) = ${dmg} Fire Damage dealt!`,
          damage: dmg,
          isHit: true,
          isCrit: false,
          type: 'hero',
        });

        addLog(
          'hero',
          `Cast ${item.name}`,
          `Unfurled ${item.name} blasting ${monster.name} for ${dmg} Fire Damage (${dmgRes.formulaString}).`,
          {
            diceType: 'd8',
            rolls: dmgRes.individualRolls,
            modifier: dmgRes.modifier,
            total: dmgRes.total,
          },
          dmg
        );

        onUpdateHero({ ...hero });
        onUpdateCombat({ ...combat });
        setCombatStep('HERO_DAMAGE_RESULT');
      }, 600);
      return;
    }

    // B. ESCAPE SCROLLS (e.g. Scroll of Escape)
    if (item.id === 'scroll_of_teleport') {
      if (inv.quantity > 1) {
        inv.quantity -= 1;
      } else {
        hero.inventory.splice(invIdx, 1);
      }
      sounds.playMagic();
      setActionSummary({
        title: '✦ SCROLL OF ESCAPE TELEPORTATION!',
        details: 'You unfurled the Scroll of Escape! A dimensional rift opens and instantly transports you safely out of combat back to the previous chamber.',
        type: 'flee',
        isHit: true,
      });
      addLog('hero', 'Used Scroll of Escape', 'Safely teleported out of combat back to the previous chamber.');
      onUpdateHero({ ...hero });
      onUpdateCombat({ ...combat });
      setCombatStep('FLEE_RESULT');
      return;
    }

    // C. RESTORATIVE POTIONS / CONSUMABLES (HP & Mana)
    if (item.healHp && item.healMana) {
      sounds.playHeal();
      hero.currentHp = Math.min(hero.maxHp, hero.currentHp + item.healHp);
      hero.currentMana = Math.min(hero.maxMana, hero.currentMana + item.healMana);
      setActionSummary({
        title: `Consumed ${item.name}!`,
        details: `Restored ${item.healHp} HP and ${item.healMana} Mana! Current HP: ${hero.currentHp}/${hero.maxHp}, Mana: ${hero.currentMana}/${hero.maxMana}.`,
        type: 'hero',
      });
      addLog('hero', `Used ${item.name}`, `Restored ${item.healHp} HP and ${item.healMana} Mana.`);
    } else if (item.healHp) {
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
    } else {
      sounds.playMagic();
      setActionSummary({
        title: `Used ${item.name}!`,
        details: `Activated ${item.name}.`,
        type: 'hero',
      });
      addLog('hero', `Used ${item.name}`, `Activated ${item.name}.`);
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
      // Monster Attack Evaluation
      if (atkRoll.isFumble) {
        // Monster Critical Fumble (Natural 1)
        combat.monsterStumbled = true;
        sounds.playBlock();

        setActionSummary({
          title: 'CRITICAL ENEMY FUMBLE! (Natural 1)',
          details: `${monster.name} rolled a Natural 1 and slipped on the dungeon stones! The creature is STAGGERED and completely botched its attack, dealing 0 damage and leaving its guard wide open (+2 Advantage to your next attack roll)!`,
          isHit: false,
          isFumble: true,
          type: 'monster',
        });

        addLog(
          'monster',
          `${monster.name} Fumbled! (Natural 1)`,
          `Rolled Natural 1! The attack backfired — ${monster.name} is staggered (+2 advantage to hero next turn).`,
          {
            diceType: 'd20',
            rolls: atkRoll.individualRolls,
            modifier: atkRoll.modifier,
            total: atkRoll.total,
            targetValue: heroAc,
            isFumble: true,
          }
        );
      } else {
        const isHit = atkRoll.isCrit || atkRoll.total >= heroAc;
        let dmg = 0;

        if (isHit) {
          const dmgRes = parseAndRollFormula(action.damageDice);
          const baseDmg = dmgRes.total;
          dmg = baseDmg;

          if (atkRoll.isCrit) {
            // Monster Critical Strike: 1.5x damage + 2 brutality
            dmg = Math.floor(baseDmg * 1.5) + 2;
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
            title: atkRoll.isCrit ? 'CRITICAL ENEMY STRIKE! (Natural 20)' : `${monster.name} Struck You!`,
            details: atkRoll.isCrit
              ? `${action.name}: Rolled [20] + ${atkRoll.modifier} = ${atkRoll.total} (NATURAL 20 CRITICAL!). Penetrated all defenses!\n\n💥 CRITICAL DAMAGE: [${baseDmg} Base × 1.5 + 2 Brutality] = ${dmg} damage dealt to you!`
              : `${action.name}: Rolled [${atkRoll.individualRolls[0]}] ${atkRoll.modifier >= 0 ? `+ ${atkRoll.modifier}` : atkRoll.modifier} = ${atkRoll.total} vs your AC ${heroAc}. You took ${dmg} damage!`,
            damage: dmg,
            isHit: true,
            isCrit: atkRoll.isCrit,
            type: 'monster',
          });

          addLog(
            'monster',
            atkRoll.isCrit ? `Critical Strike from ${monster.name}` : `${monster.name}: ${action.name}`,
            atkRoll.isCrit
              ? `NATURAL 20 CRITICAL! Struck with ${action.name} for ${dmg} critical damage!`
              : `Attack roll: [${atkRoll.individualRolls[0]}]+${atkRoll.modifier}=${atkRoll.total} vs your AC ${heroAc}. HIT for ${dmg} damage.`,
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
      }

      combat.heroDefending = false;
      combat.turnNumber += 1;
      onUpdateHero({ ...hero });
      onUpdateCombat({ ...combat });
      setCombatStep('ENEMY_RESULT');
    }, 650);
  };

  // FATE REROLL HANDLERS
  const handleFateRerollHeroAttack = () => {
    if (hero.rerollTokens <= 0 || !pendingAttack || pendingAttack.isFumble || pendingAttack.atkRoll.isFumble) return;
    hero.rerollTokens -= 1;
    combat.heroStumbled = false;
    onUpdateHero({ ...hero });
    sounds.playDiceRoll();

    setCombatStep('HERO_ATTACK_ROLLING');

    if (pendingAttack.type === 'spell' && pendingAttack.skill) {
      const detail = getSkillDetails(pendingAttack.skill);
      const spellRoll = rollDice(1, 20, detail.totalAtkMod);
      if (detail.isAutoHit) {
        spellRoll.isCrit = false;
        spellRoll.isFumble = false;
        spellRoll.total = Math.max(spellRoll.total, monster.armorClass);
      }
      setCurrentRoll(spellRoll);
      const statBreakdown = `${detail.statMod >= 0 ? `+${detail.statMod}` : detail.statMod} ${detail.statKey}${detail.extraAccuracyLabel ? ` ${detail.extraAccuracyLabel}` : ''}`;

      setTimeout(() => {
        const isHit = detail.isAutoHit || spellRoll.isCrit || (!spellRoll.isFumble && spellRoll.total >= monster.armorClass);
        if (spellRoll.isFumble && !detail.isAutoHit) {
          combat.heroStumbled = true;
          onUpdateCombat({ ...combat });
        }

        setPendingAttack({
          ...pendingAttack,
          atkRoll: spellRoll,
          isHit,
          isCrit: spellRoll.isCrit,
          isFumble: spellRoll.isFumble,
        });

        if (!isHit) {
          sounds.playBlock();
          setActionSummary({
            title: spellRoll.isFumble ? `${pendingAttack.name} Critical Fumble (Fate Reroll)!` : `${pendingAttack.name} Missed (Fate Reroll)`,
            details: spellRoll.isFumble
              ? `Fate Reroll: [1] (Natural 1 Fumble!) ${spellRoll.modifier >= 0 ? `+ ${spellRoll.modifier}` : spellRoll.modifier} (${statBreakdown}) = ${spellRoll.total} vs AC ${monster.armorClass}.\n\n💥 STUMBLED & VULNERABLE: Botched the spell on reroll and lost balance! You FORFEIT your next combat turn!`
              : `Fate Reroll: [${spellRoll.individualRolls[0]}] ${spellRoll.modifier >= 0 ? `+ ${spellRoll.modifier}` : spellRoll.modifier} (${statBreakdown}) = ${spellRoll.total} vs AC ${monster.armorClass}. Deflected by monster defenses!`,
            isHit: false,
            isFumble: spellRoll.isFumble,
            type: 'hero',
          });
          addLog('hero', `${pendingAttack.name} (Fate Reroll Miss)`, `Spell failed to penetrate AC ${monster.armorClass}.`);
        } else {
          sounds.playFire();
          setActionSummary({
            title: spellRoll.isCrit ? `CRITICAL ${pendingAttack.name.toUpperCase()} (FATE REROLL)!` : `${pendingAttack.name} Connected (Fate Reroll)!`,
            details: spellRoll.isCrit
              ? `Fate Reroll: [20] (Natural 20 Critical!) ${spellRoll.modifier >= 0 ? `+ ${spellRoll.modifier}` : spellRoll.modifier} (${statBreakdown}) = ${spellRoll.total} vs AC ${monster.armorClass}.\n\n⚔️ CRITICAL STRIKE: Upcoming damage roll will be DOUBLED (2x Damage Multiplier + 3 Brutal Strike Bonus)!`
              : `Fate Reroll: [${spellRoll.individualRolls[0]}] ${spellRoll.modifier >= 0 ? `+ ${spellRoll.modifier}` : spellRoll.modifier} (${statBreakdown}) = ${spellRoll.total} vs AC ${monster.armorClass}. Strike connected! Proceed to roll damage dice.`,
            isHit: true,
            isCrit: spellRoll.isCrit,
            type: 'hero',
          });
        }
        setCombatStep('HERO_ATTACK_RESULT');
      }, 600);
    } else {
      const atkRoll = rollDice(1, 20, totalWeaponAtkMod);
      setCurrentRoll(atkRoll);

      setTimeout(() => {
        const isHit = atkRoll.isCrit || (!atkRoll.isFumble && atkRoll.total >= monster.armorClass);
        if (atkRoll.isFumble) {
          combat.heroStumbled = true;
          onUpdateCombat({ ...combat });
        }

        setPendingAttack({
          ...pendingAttack,
          atkRoll,
          isHit,
          isCrit: atkRoll.isCrit,
          isFumble: atkRoll.isFumble,
        });

        if (!isHit) {
          sounds.playBlock();
          setActionSummary({
            title: atkRoll.isFumble ? 'CRITICAL FUMBLE (FATE REROLL)!' : 'ATTACK MISSED (FATE REROLL)',
            details: atkRoll.isFumble
              ? `Fate Reroll: [1] (Natural 1 Fumble!) ${atkRoll.modifier >= 0 ? `+ ${atkRoll.modifier}` : atkRoll.modifier} (${weaponStatBreakdown}) = ${atkRoll.total} vs Enemy AC ${monster.armorClass}.\n\n💥 STUMBLED & VULNERABLE: Overextended on reroll! You FORFEIT your next combat turn!`
              : `Fate Reroll: [${atkRoll.individualRolls[0]}] ${atkRoll.modifier >= 0 ? `+ ${atkRoll.modifier}` : atkRoll.modifier} (${weaponStatBreakdown}) = ${atkRoll.total} vs Enemy AC ${monster.armorClass}. The blow failed to penetrate!`,
            isHit: false,
            isFumble: atkRoll.isFumble,
            type: 'hero',
          });
          addLog(
            'hero',
            `Fate Reroll Attack (Miss)`,
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
            title: atkRoll.isCrit ? 'CRITICAL HIT (FATE REROLL)!' : 'ATTACK HIT (FATE REROLL)!',
            details: atkRoll.isCrit
              ? `Fate Reroll: [20] (Natural 20 Critical!) ${atkRoll.modifier >= 0 ? `+ ${atkRoll.modifier}` : atkRoll.modifier} (${weaponStatBreakdown}) = ${atkRoll.total} vs Enemy AC ${monster.armorClass}.\n\n⚔️ CRITICAL STRIKE: Upcoming damage roll will be DOUBLED (2x Damage Multiplier + 3 Brutal Strike Bonus)!`
              : `Fate Reroll: [${atkRoll.individualRolls[0]}] ${atkRoll.modifier >= 0 ? `+ ${atkRoll.modifier}` : atkRoll.modifier} (${weaponStatBreakdown}) = ${atkRoll.total} vs Enemy AC ${monster.armorClass}. Strike connected! Proceed to roll damage dice.`,
            isHit: true,
            isCrit: atkRoll.isCrit,
            type: 'hero',
          });
        }
        setCombatStep('HERO_ATTACK_RESULT');
      }, 600);
    }
  };

  const handleFateRerollHeroDamage = () => {
    if (hero.rerollTokens <= 0 || !pendingAttack || !actionSummary) return;
    if (actionSummary.damage) {
      monster.hp = Math.min(monster.maxHp, monster.hp + actionSummary.damage);
    }
    hero.rerollTokens -= 1;
    onUpdateHero({ ...hero });
    sounds.playDiceRoll();

    setCombatStep('HERO_DAMAGE_ROLLING');

    setTimeout(() => {
      const dmgRes = parseAndRollFormula(pendingAttack.damageFormula, heroStats, pendingAttack.damageBonus);
      const baseDmg = dmgRes.total;
      let dmg = baseDmg;

      if (pendingAttack.isCrit) {
        dmg = baseDmg * 2 + 3;
        sounds.playCriticalHit();
      } else {
        if (pendingAttack.type === 'spell') sounds.playFire();
        else sounds.playHit();
      }

      hero.statsHistory.highestDamageDealt = Math.max(hero.statsHistory.highestDamageDealt, dmg);
      const newMonsterHp = Math.max(0, monster.hp - dmg);
      monster.hp = newMonsterHp;
      setDamageRoll(dmgRes);

      setActionSummary({
        title: pendingAttack.isCrit ? 'CRITICAL HIT & DAMAGE (FATE REROLL)!' : 'DAMAGE DEALT (FATE REROLL)!',
        details: pendingAttack.isCrit
          ? `Fate Reroll Base Dice: ${dmgRes.formulaString} (${dmgRes.individualRolls.join(' + ')}) ${dmgRes.modifier >= 0 ? `+ ${dmgRes.modifier}` : dmgRes.modifier} = ${baseDmg} Base Damage.\n\n⚔️ CRITICAL MULTIPLIER APPLIED: [${baseDmg} Base × 2 (Critical Multiplier) + 3 (Brutal Strike Bonus)] = ${dmg} Total Damage dealt to ${monster.name}!`
          : `Fate Reroll Damage Dice: ${dmgRes.formulaString} (${dmgRes.individualRolls.join(' + ')}) ${dmgRes.modifier >= 0 ? `+ ${dmgRes.modifier}` : dmgRes.modifier} = ${dmg} damage dealt to ${monster.name}.`,
        damage: dmg,
        isHit: true,
        isCrit: pendingAttack.isCrit,
        type: 'hero',
      });

      addLog(
        'hero',
        `Fate Reroll Damage on ${pendingAttack.name}`,
        pendingAttack.isCrit
          ? `CRITICAL REROLL! Rolled ${baseDmg} base damage. Applied 2x Multiplier + 3 Brutal = ${dmg} total damage!`
          : `New damage rolled: ${dmg} (${dmgRes.formulaString}).`,
        undefined,
        dmg
      );

      onUpdateHero({ ...hero });
      onUpdateCombat({ ...combat });
      setCombatStep('HERO_DAMAGE_RESULT');
    }, 600);
  };

  const handleHeroRecoverStumble = () => {
    combat.heroStumbled = false;
    sounds.playTrap();
    addLog('hero', 'Recovered Balance (Turn Forfeited)', `Spent turn regaining footing after Critical Fumble. Turn skipped!`);
    onUpdateCombat({ ...combat });
    handleProceedToEnemyTurn();
  };

  const handleFateRerollFlee = () => {
    if (hero.rerollTokens <= 0 || actionSummary?.isFumble) return;
    hero.rerollTokens -= 1;
    onUpdateHero({ ...hero });
    sounds.playDiceRoll();

    setCombatStep('HERO_ATTACK_ROLLING');

    const escapeDc = 10 + monster.level;
    const fleeRoll = rollDice(1, 20, fleeMod);
    setCurrentRoll(fleeRoll);

    setTimeout(() => {
      if (fleeRoll.total >= escapeDc) {
        sounds.playLoot();
        setActionSummary({
          title: '✦ ESCAPED THE ENCOUNTER (FATE REROLL)!',
          details: `Fate Reroll Flee Check: Rolled [${fleeRoll.individualRolls[0]}] ${fleeRoll.modifier >= 0 ? `+ ${fleeRoll.modifier}` : fleeRoll.modifier} = ${fleeRoll.total} vs Escape DC ${escapeDc}. You retreated safely to the previous chamber!`,
          type: 'flee',
          isHit: true,
        });
        addLog('hero', 'Escaped (Fate Reroll)', `Fled combat successfully (DC ${escapeDc}).`);
        setCombatStep('FLEE_RESULT');
      } else {
        sounds.playTrap();
        setActionSummary({
          title: '✖ FLEE FAILED (FATE REROLL)!',
          details: `Fate Reroll Flee Check: Rolled [${fleeRoll.individualRolls[0]}] ${fleeRoll.modifier >= 0 ? `+ ${fleeRoll.modifier}` : fleeRoll.modifier} = ${fleeRoll.total} vs Escape DC ${escapeDc}. ${monster.name} blocks your escape!`,
          type: 'flee',
          isHit: false,
        });
        addLog('hero', 'Flee Failed (Fate Reroll)', `Failed to escape DC ${escapeDc}.`);
        setCombatStep('HERO_NON_DAMAGE_RESULT');
      }
    }, 600);
  };

  const handleFateDodgeMonster = () => {
    if (hero.rerollTokens <= 0 || !actionSummary) return;
    if (actionSummary.damage) {
      hero.currentHp = Math.min(hero.maxHp, hero.currentHp + actionSummary.damage);
    }
    hero.rerollTokens -= 1;
    onUpdateHero({ ...hero });
    sounds.playDiceRoll();

    setCombatStep('ENEMY_ROLLING');

    const actions = monster.actions;
    const action = actions[Math.floor(Math.random() * actions.length)] || actions[0];

    const atkRoll = rollDice(1, 20, monster.attackBonus);
    setCurrentRoll(atkRoll);

    setTimeout(() => {
      const isHit = atkRoll.isCrit || (!atkRoll.isFumble && atkRoll.total >= heroAc);

      if (isHit) {
        const dmgRes = parseAndRollFormula(action.diceFormula);
        let dmg = dmgRes.total;

        if (atkRoll.isCrit) {
          dmg = dmg * 2;
          sounds.playCriticalHit();
        } else {
          sounds.playHit();
        }

        if (combat.heroDefending) {
          dmg = Math.max(1, dmg - 3);
        }

        hero.currentHp = Math.max(0, hero.currentHp - dmg);

        setActionSummary({
          title: atkRoll.isCrit ? `CRITICAL ${action.name.toUpperCase()}!` : `${action.name} Landed!`,
          details: `${action.name} (Forced Reroll): Rolled [${atkRoll.individualRolls[0]}] ${atkRoll.modifier >= 0 ? `+ ${atkRoll.modifier}` : atkRoll.modifier} = ${atkRoll.total} vs your AC ${heroAc}. Struck you for ${dmg} damage!`,
          damage: dmg,
          isHit: true,
          isCrit: atkRoll.isCrit,
          type: 'monster',
        });

        addLog(
          'monster',
          `${monster.name} Hit (After Fate Dodge)`,
          `Attack roll: ${atkRoll.total} vs your AC ${heroAc}. Dealt ${dmg} damage.`,
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
          title: '✦ FATE DEFLECTION SUCCESSFUL!',
          details: `Fate Dodge: ${monster.name} re-rolled [${atkRoll.individualRolls[0]}] ${atkRoll.modifier >= 0 ? `+ ${atkRoll.modifier}` : atkRoll.modifier} = ${atkRoll.total} vs your AC ${heroAc}. The blow was completely deflected by fate!`,
          isHit: false,
          type: 'monster',
        });

        addLog(
          'monster',
          `${monster.name} Missed (Fate Dodge)`,
          `Reroll: ${atkRoll.total} vs your AC ${heroAc}. Deflected with Fate!`,
          {
            diceType: 'd20',
            rolls: atkRoll.individualRolls,
            modifier: atkRoll.modifier,
            total: atkRoll.total,
            targetValue: heroAc,
          }
        );
      }

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

              {/* Rules summary banner for Critical Outcomes */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono px-3 py-1.5 bg-[#140f0a] rounded-lg border border-amber-900/50 text-stone-300 shadow-inner">
                <div className="flex items-center gap-1.5 text-yellow-300">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <span><strong>Crit Hit (Nat 20):</strong> 2x Damage Multiplier + 3 Brutal Strike</span>
                </div>
                <div className="flex items-center gap-1.5 text-red-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span><strong>Crit Fumble (Nat 1):</strong> Stumbled & forfeit next turn (No Fate Rerolls)</span>
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
                        Roll: 1d20 {totalWeaponAtkMod >= 0 ? `+ ${totalWeaponAtkMod}` : totalWeaponAtkMod} ({weaponStatBreakdown}) vs AC {monster.armorClass}
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-[#130d08] p-1.5 rounded border border-[#3b2716] text-[10px] font-mono text-stone-300">
                    <span className="text-amber-400 font-bold">Damage:</span> {weaponFormula}{' '}
                    {weaponBonus >= 0 ? `+ ${weaponBonus}` : weaponBonus} ({weaponStatBreakdown}) • Threat 20 (x2 Crit)
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
                    <span className="text-blue-300 font-bold">Effect:</span> Absorbs {3 + (hero.equipment.shield?.armorBonus || 0)} damage (+3 Guard{hero.equipment.shield?.armorBonus ? ` +${hero.equipment.shield.armorBonus} Shield` : ''}) from monster attacks this turn.
                  </div>
                </button>

                {/* 3. Hero Spells & Class Skills */}
                {hero.skills.map((skill) => {
                  const canAfford = hero.currentMana >= skill.manaCost;
                  const detail = getSkillDetails(skill);

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
                            {detail.rollSubtitle}
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-[#140e1c] p-1.5 rounded border border-[#3b284f] text-[10px] font-mono text-stone-300">
                        <span className="text-purple-300 font-bold">{detail.boxLabel}:</span> {detail.boxText}
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
                        Roll: 1d20 {fleeMod >= 0 ? `+ ${fleeMod}` : fleeMod} ({fleeMod >= 0 ? `+${fleeMod}` : fleeMod} {fleeStatKey}) vs DC {10 + monster.level}
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-[#14120f] p-1.5 rounded border border-[#38332a] text-[10px] font-mono text-stone-300">
                    <span className="text-amber-300 font-bold">Flee Rule:</span> DC {10 + monster.level} (Base 10 + Lvl {monster.level} Monster) • Retreats safely to previous chamber.
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
                        {inv.item.damageDice && (
                          <span className="text-[10px] font-mono text-orange-400">({inv.item.damageDice} Fire Dmg)</span>
                        )}
                        {inv.item.id === 'scroll_of_teleport' && (
                          <span className="text-[10px] font-mono text-purple-400">(Instant Escape)</span>
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
                <div className="text-sm text-stone-200 leading-relaxed font-serif whitespace-pre-line">
                  {actionSummary.details}
                </div>

                {/* Explicit Critical Hit Banner */}
                {pendingAttack.isCrit && (
                  <div className="p-3 bg-gradient-to-r from-amber-950/90 via-yellow-950/90 to-amber-950/90 border-2 border-yellow-500 rounded-lg text-amber-200 text-xs font-serif space-y-1 shadow-lg">
                    <div className="flex items-center gap-2 font-bold text-yellow-300">
                      <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                      <span>CRITICAL HIT EFFECT ACTIVE (Natural 20)</span>
                    </div>
                    <p className="text-yellow-100/90">
                      Your strike pierced armor cleanly! Upcoming damage roll will receive <strong>2x Double Damage Multiplier + 3 Brutal Strike Bonus</strong>!
                    </p>
                  </div>
                )}

                {/* Explicit Critical Fumble Warning Banner */}
                {pendingAttack.isFumble && (
                  <div className="p-3 bg-gradient-to-r from-red-950/90 via-amber-950/90 to-red-950/90 border-2 border-red-500 rounded-lg text-red-200 text-xs font-serif space-y-1 shadow-lg">
                    <div className="flex items-center gap-2 font-bold text-red-300">
                      <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
                      <span>CRITICAL FUMBLE PENALTY (Natural 1 Rolled)</span>
                    </div>
                    <p className="text-red-100/90">
                      You severely overextended and lost your footing! You are <strong>Off-Balance & Stumbled</strong>: you will <strong>FORFEIT your next combat turn</strong> while recovering your stance, allowing {monster.name} to strike freely! (A Critical Fumble cannot be rerolled with Fate)
                    </p>
                  </div>
                )}

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
                      <span>{pendingAttack.type === 'spell' ? 'Skill / Spell Damage Dice to Roll:' : 'Weapon Damage Dice to Roll:'}</span>
                      <span className="font-bold">
                        {pendingAttack.damageFormula}{' '}
                        {pendingAttack.damageBonus >= 0 ? `+ ${pendingAttack.damageBonus}` : pendingAttack.damageBonus}
                        {pendingAttack.isCrit ? ' [×2 + 3 Brutal Crit]' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Fate Reroll on Failed Attack (Blocked on Critical Fumbles) */}
              {!pendingAttack.isHit && (
                pendingAttack.isFumble ? (
                  <div className="p-3.5 bg-gradient-to-r from-red-950/70 via-[#210f0f] to-red-950/70 border-2 border-red-800/80 rounded-xl shadow-lg flex items-center gap-3 text-xs font-serif text-red-200">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                    <div>
                      <span className="font-bold text-red-300">Fate Cannot Alter a Critical Fumble (Natural 1):</span>
                      <p className="text-red-300/80 text-[11px] mt-0.5 leading-relaxed">
                        A Natural 1 represents an absolute, catastrophic blunder. Fate Rerolls cannot be spent to undo Critical Fumbles.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-gradient-to-r from-purple-950/80 via-[#261536] to-purple-950/80 border-2 border-purple-500/80 rounded-xl shadow-lg space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-purple-200 font-bold text-xs sm:text-sm">
                        <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
                        <span>Defy Fate & Alter Destiny</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-purple-200 bg-purple-900/90 px-2.5 py-0.5 rounded-full border border-purple-400/60 shadow">
                        {hero.rerollTokens} {hero.rerollTokens === 1 ? 'Token' : 'Tokens'} Available
                      </span>
                    </div>

                    <p className="text-xs text-purple-300/90 font-serif">
                      Spend 1 Fate Reroll from your inventory to immediately re-roll this attack check.
                    </p>

                    <button
                      id="btn-use-fate-reroll-attack"
                      disabled={hero.rerollTokens <= 0}
                      onClick={handleFateRerollHeroAttack}
                      className={`w-full py-2.5 px-4 rounded-xl font-serif font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all ${
                        hero.rerollTokens > 0
                          ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] border border-purple-300/40'
                          : 'bg-stone-900/80 border border-stone-800 text-stone-500 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <Dices className="w-4 h-4 text-purple-200" />
                      <span>
                        {hero.rerollTokens > 0
                          ? `✦ Use Fate Reroll (${hero.rerollTokens} Available)`
                          : 'No Fate Tokens in Inventory'}
                      </span>
                    </button>
                  </div>
                )
              )}

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

              <div className="p-4 bg-stone-900/80 rounded-lg border border-amber-900/60 text-sm text-stone-200 leading-relaxed font-serif space-y-2">
                <div className="whitespace-pre-line">{actionSummary.details}</div>

                {/* Explicit Critical Hit Damage Breakdown */}
                {actionSummary.isCrit && (
                  <div className="p-3 bg-gradient-to-r from-amber-950/90 via-yellow-950/80 to-amber-950/90 border-2 border-yellow-500/80 rounded-lg text-amber-200 text-xs font-serif space-y-1 shadow-md">
                    <div className="flex items-center justify-between text-yellow-300 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
                        CRITICAL DAMAGE MULTIPLIER APPLIED
                      </span>
                      <span className="px-2 py-0.5 bg-yellow-950 border border-yellow-600 rounded text-yellow-200 font-mono text-[11px]">
                        2x Multiplier + 3 Brutal Strike
                      </span>
                    </div>
                    <p className="text-yellow-100/90 leading-relaxed font-sans">
                      Base damage dice doubled and amplified by devastating kinetic momentum: <strong>[Base Roll × 2 + 3 Brutal Strike Bonus] = Total {actionSummary.damage} Damage!</strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Progress Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                {monster.hp > 0 && (
                  <button
                    id="btn-fate-reroll-damage"
                    disabled={hero.rerollTokens <= 0}
                    onClick={handleFateRerollHeroDamage}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-serif font-bold flex items-center justify-center gap-2 border shadow-md transition-all ${
                      hero.rerollTokens > 0
                        ? 'bg-purple-950/80 hover:bg-purple-900 border-purple-500/80 text-purple-200 cursor-pointer active:scale-95'
                        : 'bg-stone-900/80 border-stone-800 text-stone-500 cursor-not-allowed opacity-60'
                    }`}
                    title={
                      hero.rerollTokens > 0
                        ? `Reroll damage dice (${hero.rerollTokens} Fate Tokens remaining)`
                        : 'No Fate Tokens available in inventory'
                    }
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>
                      {hero.rerollTokens > 0
                        ? `✦ Fate Reroll Damage (${hero.rerollTokens} Available)`
                        : '0 Fate Tokens Available'}
                    </span>
                  </button>
                )}

                {monster.hp <= 0 ? (
                  <button
                    id="btn-victory-claim-spoils"
                    onClick={handleMonsterSlain}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 text-stone-950 font-black font-serif rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer transform hover:scale-105 ml-auto"
                  >
                    <Award className="w-5 h-5" />
                    <span>Victory! Claim Spoils & XP ➔</span>
                  </button>
                ) : (
                  <button
                    id="btn-continue-after-damage"
                    onClick={handleProceedToEnemyTurn}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 text-stone-100 font-black font-serif rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer transform hover:scale-105 ml-auto"
                  >
                    <span>Continue to Enemy Turn ➔</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Non-Damage Hero Action Result (e.g. Heal, Buff, Item, Flee Fail) */}
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

              {/* Fate Reroll on Failed Flee (Blocked on Critical Fumbles) */}
              {actionSummary.type === 'flee' && !actionSummary.isHit && (
                actionSummary.isFumble ? (
                  <div className="p-3.5 bg-gradient-to-r from-red-950/70 via-[#210f0f] to-red-950/70 border-2 border-red-800/80 rounded-xl shadow-lg flex items-center gap-3 text-xs font-serif text-red-200">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                    <div>
                      <span className="font-bold text-red-300">Fate Cannot Alter a Critical Fumble (Natural 1):</span>
                      <p className="text-red-300/80 text-[11px] mt-0.5 leading-relaxed">
                        Tripping on a Natural 1 cannot be reversed by Fate. You must recover your stance on the next turn.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-gradient-to-r from-purple-950/80 via-[#261536] to-purple-950/80 border-2 border-purple-500/80 rounded-xl shadow-lg space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-purple-200 font-bold text-xs sm:text-sm">
                        <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
                        <span>Defy Fate & Alter Destiny</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-purple-200 bg-purple-900/90 px-2.5 py-0.5 rounded-full border border-purple-400/60 shadow">
                        {hero.rerollTokens} {hero.rerollTokens === 1 ? 'Token' : 'Tokens'} Available
                      </span>
                    </div>

                    <p className="text-xs text-purple-300/90 font-serif">
                      Spend 1 Fate Reroll to re-attempt your escape roll immediately before the enemy attacks!
                    </p>

                    <button
                      id="btn-fate-reroll-flee"
                      disabled={hero.rerollTokens <= 0}
                      onClick={handleFateRerollFlee}
                      className={`w-full py-2.5 px-4 rounded-xl font-serif font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all ${
                        hero.rerollTokens > 0
                          ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] border border-purple-300/40'
                          : 'bg-stone-900/80 border border-stone-800 text-stone-500 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <Dices className="w-4 h-4 text-purple-200" />
                      <span>
                        {hero.rerollTokens > 0
                          ? `✦ Use Fate Reroll (${hero.rerollTokens} Available) - Reroll Escape`
                          : 'No Fate Tokens in Inventory'}
                      </span>
                    </button>
                  </div>
                )
              )}

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

          {/* STEP 6: Enemy Result Card with Fate Dodge and Explicit "Begin Round" Button */}
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

              <div className="p-4 bg-stone-900/80 rounded-lg border border-red-900/60 text-sm text-stone-200 leading-relaxed font-serif space-y-2">
                <div className="whitespace-pre-line">{actionSummary.details}</div>

                {/* Stumbled Turn Skipping Notification */}
                {combat.heroStumbled && (
                  <div className="p-3 bg-gradient-to-r from-red-950/90 via-amber-950/90 to-red-950/90 border-2 border-red-500 rounded-lg text-red-200 text-xs font-serif space-y-1 shadow-lg">
                    <div className="flex items-center gap-2 font-bold text-red-300">
                      <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
                      <span>STUMBLED & OFF-BALANCE (Turn Forfeit Required)</span>
                    </div>
                    <p className="text-red-100/90">
                      Because you rolled a Critical Fumble (Natural 1), you are off-balance and must <strong>FORFEIT Round {combat.turnNumber}</strong> to steady your stance while {monster.name} strikes again!
                    </p>
                  </div>
                )}

                {/* Monster Staggered Notification */}
                {combat.monsterStumbled && (
                  <div className="p-3 bg-gradient-to-r from-emerald-950/90 via-[#132c1c] to-emerald-950/90 border-2 border-emerald-500 rounded-lg text-emerald-200 text-xs font-serif space-y-1 shadow-lg">
                    <div className="flex items-center gap-2 font-bold text-emerald-300">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>ENEMY STAGGERED & DEFENSES OPEN!</span>
                    </div>
                    <p className="text-emerald-100/90">
                      {monster.name} rolled a Natural 1 Fumble! Its balance is broken, granting you <strong>+2 Advantage Bonus</strong> to your upcoming attack roll!
                    </p>
                  </div>
                )}
              </div>

              {/* Fate Dodge Opportunity when Monster lands a Hit on Hero */}
              {actionSummary.type === 'monster' && actionSummary.isHit && (
                <div className="p-3.5 bg-gradient-to-r from-purple-950/80 via-[#261536] to-purple-950/80 border-2 border-purple-500/80 rounded-xl shadow-lg space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-purple-200 font-bold text-xs sm:text-sm">
                      <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
                      <span>Fate Dodge: Force Enemy Reroll</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-purple-200 bg-purple-900/90 px-2.5 py-0.5 rounded-full border border-purple-400/60 shadow">
                      {hero.rerollTokens} {hero.rerollTokens === 1 ? 'Token' : 'Tokens'} Available
                    </span>
                  </div>

                  <p className="text-xs text-purple-300/90 font-serif">
                    Spend 1 Fate Reroll to rewind the strike, restore the damage taken, and force {monster.name} to re-roll their attack against your AC {heroAc}!
                  </p>

                  <button
                    id="btn-fate-dodge-monster"
                    disabled={hero.rerollTokens <= 0}
                    onClick={handleFateDodgeMonster}
                    className={`w-full py-2.5 px-4 rounded-xl font-serif font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all ${
                      hero.rerollTokens > 0
                        ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] border border-purple-300/40'
                        : 'bg-stone-900/80 border border-stone-800 text-stone-500 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-purple-200" />
                    <span>
                      {hero.rerollTokens > 0
                        ? `✦ Use Fate Reroll (${hero.rerollTokens} Available) - Fate Dodge`
                        : 'No Fate Tokens in Inventory'}
                    </span>
                  </button>
                </div>
              )}

              {/* Progress Controls */}
              <div className="flex justify-end pt-2">
                {hero.currentHp <= 0 ? (
                  <div className="text-sm font-bold text-red-400 flex items-center gap-2">
                    <Skull className="w-5 h-5 animate-bounce" />
                    Hero has fallen...
                  </div>
                ) : combat.heroStumbled ? (
                  <button
                    id="btn-forfeit-stumble-turn"
                    onClick={handleHeroRecoverStumble}
                    className="px-6 py-3 bg-gradient-to-r from-red-700 via-amber-700 to-red-700 hover:from-red-600 hover:to-amber-600 text-stone-100 font-black font-serif rounded-xl shadow-xl flex items-center gap-2 transition-all cursor-pointer transform hover:scale-105"
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-300 animate-pulse" />
                    <span>⚠️ Forfeit Round {combat.turnNumber} to Recover Balance ➔</span>
                  </button>
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
