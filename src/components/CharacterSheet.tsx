/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Heart,
  Wand2,
  Shield,
  Coins,
  Dices,
  Utensils,
  Flame,
  Key,
  Package,
  BookOpen,
  Sword,
  Sparkles,
} from 'lucide-react';
import { GameItem, HeroCharacter, StatType } from '../types/game';
import { getStatModifier } from '../utils/dice';

interface CharacterSheetProps {
  hero: HeroCharacter;
  onOpenInventory: () => void;
  onOpenJournal: () => void;
}

export const CharacterSheet: React.FC<CharacterSheetProps> = ({
  hero,
  onOpenInventory,
  onOpenJournal,
}) => {
  // Calculate total stats including equipment
  const computedStats = { ...hero.stats };
  let computedArmor = 10 + getStatModifier(computedStats.DEX); // Base AC = 10 + DEX mod

  // Apply equipment bonuses
  (Object.values(hero.equipment) as (GameItem | undefined)[]).forEach((item) => {
    if (!item) return;
    if (item.armorBonus) computedArmor += item.armorBonus;
    if (item.statBonuses) {
      (Object.keys(item.statBonuses) as StatType[]).forEach((stat) => {
        computedStats[stat] += item.statBonuses![stat] || 0;
      });
    }
  });

  const hpPercent = Math.max(0, Math.min(100, (hero.currentHp / hero.maxHp) * 100));
  const manaPercent = Math.max(0, Math.min(100, (hero.currentMana / hero.maxMana) * 100));
  const xpPercent = Math.max(0, Math.min(100, (hero.xp / hero.xpToNextLevel) * 100));

  return (
    <div
      id="hero-character-sheet"
      className="bg-[#241a12] border-2 border-[#735438] rounded-lg p-3.5 text-stone-200 shadow-xl"
    >
      {/* Top Hero Identity Banner */}
      <div className="flex items-center justify-between border-b border-[#4d3723] pb-2.5 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-serif font-bold text-[#f5e4c6] tracking-wide">{hero.name}</h2>
            <span className="text-[10px] font-mono font-bold bg-[#3d2a19] text-[#e5b967] px-2 py-0.5 rounded border border-[#6b4c2b] uppercase">
              Lv. {hero.level} {hero.classId}
            </span>
          </div>
          <div className="text-[11px] text-stone-400 font-serif">AC {computedArmor} • Total Defense</div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-1.5">
          <button
            id="btn-open-inventory"
            onClick={onOpenInventory}
            className="px-2.5 py-1 bg-[#3a2818] hover:bg-[#523922] text-amber-200 border border-[#6e4e2d] rounded text-xs font-serif flex items-center gap-1 transition-colors"
            title="Open Backpack Inventory"
          >
            <Package className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Pack</span>
            <span className="text-[10px] font-mono text-stone-400">({hero.inventory.length})</span>
          </button>

          <button
            id="btn-open-journal"
            onClick={onOpenJournal}
            className="px-2 py-1 bg-[#3a2818] hover:bg-[#523922] text-amber-200 border border-[#6e4e2d] rounded text-xs font-serif flex items-center gap-1 transition-colors"
            title="Adventure Log & Stats"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Vitals Bars: HP, Mana, XP */}
      <div className="space-y-2 mb-3">
        {/* Health */}
        <div>
          <div className="flex justify-between text-[11px] font-mono mb-0.5">
            <span className="text-red-300 flex items-center gap-1">
              <Heart className="w-3 h-3 text-red-500 fill-red-500" /> HP
            </span>
            <span className="font-bold text-red-200">
              {hero.currentHp} / {hero.maxHp}
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#140e0a] rounded-full overflow-hidden border border-[#442e1d]">
            <div
              className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-300"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* Mana */}
        <div>
          <div className="flex justify-between text-[11px] font-mono mb-0.5">
            <span className="text-cyan-300 flex items-center gap-1">
              <Wand2 className="w-3 h-3 text-cyan-400" /> Mana
            </span>
            <span className="font-bold text-cyan-200">
              {hero.currentMana} / {hero.maxMana}
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#140e0a] rounded-full overflow-hidden border border-[#442e1d]">
            <div
              className="h-full bg-gradient-to-r from-blue-700 to-cyan-500 transition-all duration-300"
              style={{ width: `${manaPercent}%` }}
            />
          </div>
        </div>

        {/* XP */}
        <div>
          <div className="flex justify-between text-[10px] font-mono mb-0.5 text-stone-400">
            <span>Experience</span>
            <span>
              {hero.xp} / {hero.xpToNextLevel} XP
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#140e0a] rounded-full overflow-hidden border border-[#382618]">
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-300"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-5 gap-1.5 text-center mb-3 bg-[#17100a] p-1.5 rounded border border-[#422e1d]">
        {(['STR', 'DEX', 'CON', 'INT', 'LCK'] as const).map((stat) => {
          const val = computedStats[stat];
          const mod = getStatModifier(val);
          return (
            <div key={stat} className="flex flex-col">
              <span className="text-[9px] font-mono text-stone-400">{stat}</span>
              <span className="text-xs font-mono font-bold text-[#f5dfb8]">{val}</span>
              <span className={`text-[9px] font-mono ${mod >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {mod >= 0 ? `+${mod}` : mod}
              </span>
            </div>
          );
        })}
      </div>

      {/* Active Equipment Summary */}
      <div className="border-t border-[#44301d] pt-2 mb-2.5">
        <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block mb-1.5">
          Equipped Gear:
        </span>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <div className="bg-[#1a120b] p-1.5 rounded border border-[#3b2818] flex items-center gap-1.5 truncate">
            <Sword className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate text-[11px] font-serif text-stone-300">
              {hero.equipment.weapon?.name || 'Bare Fists'}
            </span>
          </div>
          <div className="bg-[#1a120b] p-1.5 rounded border border-[#3b2818] flex items-center gap-1.5 truncate">
            <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate text-[11px] font-serif text-stone-300">
              {hero.equipment.armor?.name || hero.equipment.offhand?.name || 'Simple Cloth'}
            </span>
          </div>
        </div>
      </div>

      {/* Consumables Belt */}
      <div className="grid grid-cols-5 gap-1 pt-2 border-t border-[#44301d] text-center">
        <div className="bg-[#150e09] p-1 rounded border border-[#382618]" title="Gold Coins">
          <Coins className="w-3 h-3 text-yellow-400 mx-auto mb-0.5" />
          <span className="text-[11px] font-mono font-bold text-yellow-200">{hero.gold}</span>
        </div>
        <div className="bg-[#150e09] p-1 rounded border border-[#382618]" title="Fate Dice (Reroll Tokens)">
          <Dices className="w-3 h-3 text-purple-400 mx-auto mb-0.5" />
          <span className="text-[11px] font-mono font-bold text-purple-200">{hero.rerollTokens}</span>
        </div>
        <div className="bg-[#150e09] p-1 rounded border border-[#382618]" title="Dungeon Rations">
          <Utensils className="w-3 h-3 text-amber-500 mx-auto mb-0.5" />
          <span className="text-[11px] font-mono font-bold text-amber-200">{hero.rations}</span>
        </div>
        <div className="bg-[#150e09] p-1 rounded border border-[#382618]" title="Torches">
          <Flame className="w-3 h-3 text-orange-400 mx-auto mb-0.5" />
          <span className="text-[11px] font-mono font-bold text-orange-200">{hero.torches}</span>
        </div>
        <div className="bg-[#150e09] p-1 rounded border border-[#382618]" title="Lockpicks">
          <Key className="w-3 h-3 text-cyan-400 mx-auto mb-0.5" />
          <span className="text-[11px] font-mono font-bold text-cyan-200">{hero.lockpicks}</span>
        </div>
      </div>
    </div>
  );
};
