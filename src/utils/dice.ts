/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CharacterStats, StatType } from '../types/game';

export interface RollResult {
  diceCount: number;
  diceSides: number;
  individualRolls: number[];
  modifier: number;
  total: number;
  isCrit: boolean; // Natural max on primary die (e.g. 20 on d20)
  isFumble: boolean; // Natural 1 on primary die
  formulaString: string;
}

/**
 * Rolls a single die of specified sides (e.g. d6, d20)
 */
export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Rolls multiple dice (e.g. 3d6, 2d8) and returns roll details
 */
export function rollDice(count: number, sides: number, modifier: number = 0): RollResult {
  const rolls: number[] = [];
  let sum = 0;

  for (let i = 0; i < count; i++) {
    const r = rollDie(sides);
    rolls.push(r);
    sum += r;
  }

  const total = Math.max(1, sum + modifier);
  const isCrit = count === 1 && sides === 20 && rolls[0] === 20;
  const isFumble = count === 1 && sides === 20 && rolls[0] === 1;

  const modSign = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : '';
  const formulaString = `${count}d${sides}${modSign}`;

  return {
    diceCount: count,
    diceSides: sides,
    individualRolls: rolls,
    modifier,
    total,
    isCrit,
    isFumble,
    formulaString,
  };
}

/**
 * Classic 4d6 drop lowest for heroic character creation
 */
export function roll4d6DropLowest(): { rolls: number[]; dropped: number; total: number } {
  const rolls = [rollDie(6), rollDie(6), rollDie(6), rollDie(6)];
  const minVal = Math.min(...rolls);
  const droppedIndex = rolls.indexOf(minVal);
  const kept = rolls.filter((_, idx) => idx !== droppedIndex);
  const total = kept.reduce((a, b) => a + b, 0);

  return {
    rolls,
    dropped: minVal,
    total,
  };
}

/**
 * Calculates standard D&D / OSR ability modifier
 * 10-11: +0, 12-13: +1, 14-15: +2, 16-17: +3, 18-19: +4, 20+: +5
 * 8-9: -1, 6-7: -2, 4-5: -3
 */
export function getStatModifier(statValue: number): number {
  return Math.floor((statValue - 10) / 2);
}

/**
 * Parses and evaluates formulas like "1d8+3", "2d6+STR", "1d20+DEX"
 */
export function parseAndRollFormula(
  formula: string,
  stats?: CharacterStats,
  extraBonus: number = 0
): RollResult {
  let clean = formula.trim();

  // Replace stat placeholders if present
  let statMod = 0;
  if (stats) {
    const statKeys: StatType[] = ['STR', 'DEX', 'CON', 'INT', 'LCK'];
    for (const key of statKeys) {
      if (clean.includes(key)) {
        const mod = getStatModifier(stats[key]);
        statMod += mod;
        clean = clean.replace(new RegExp(`\\+?\\s*${key}`, 'g'), '');
      }
    }
  }

  // Match NdS+M or NdS-M or NdS
  const match = clean.match(/^(\d+)d(\d+)(?:([+-])(\d+))?$/i);
  if (!match) {
    // Fallback: 1d6
    return rollDice(1, 6, extraBonus + statMod);
  }

  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  let staticMod = 0;

  if (match[3] && match[4]) {
    const sign = match[3] === '-' ? -1 : 1;
    staticMod = sign * parseInt(match[4], 10);
  }

  const totalMod = staticMod + statMod + extraBonus;
  return rollDice(count, sides, totalMod);
}

/**
 * D100 roll for loot tables and encounter chances
 */
export function rollD100(): number {
  return rollDie(100);
}
