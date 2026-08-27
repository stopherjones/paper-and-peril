/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Award, Sparkles, Heart, Wand2, Dices, Zap, ChevronRight } from 'lucide-react';
import { HeroCharacter, StatType } from '../types/game';
import { sounds } from '../utils/audio';
import { getSkillUpgradeList } from '../utils/skills';

interface LevelUpModalProps {
  hero: HeroCharacter;
  onConfirmLevelUp: (chosenStat: StatType) => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ hero, onConfirmLevelUp }) => {
  const [selectedStat, setSelectedStat] = useState<StatType>('STR');

  const statsList: { key: StatType; label: string; desc: string }[] = [
    { key: 'STR', label: 'Strength', desc: '+Melee attack damage, weapon checks' },
    { key: 'DEX', label: 'Dexterity', desc: '+Armor Class (AC), trap disarm, ranged accuracy' },
    { key: 'CON', label: 'Constitution', desc: '+Max Health Points, poison/wound resistance' },
    { key: 'INT', label: 'Intelligence', desc: '+Max Energy, magic spell damage, rune deciphering' },
    { key: 'LCK', label: 'Luck', desc: '+Critical hit chance, bonus loot rolls, escape checks' },
  ];

  const nextLevel = hero.level + 1;
  const upgradedSkills = getSkillUpgradeList(hero.classId, hero.level, nextLevel);

  const handleConfirm = () => {
    sounds.playLevelUp();
    onConfirmLevelUp(selectedStat);
  };

  return (
    <div
      id="level-up-modal-overlay"
      className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
    >
      <div className="bg-gradient-to-b from-[#382618] to-[#1e140c] border-4 border-[#dfb15b] rounded-xl max-w-lg w-full p-5 text-stone-200 shadow-2xl relative text-center max-h-[95vh] overflow-y-auto">
        <Sparkles className="w-10 h-10 text-[#ffd782] mx-auto mb-1 animate-bounce" />
        <h2 className="text-2xl md:text-3xl font-serif font-black text-[#fff5e0] tracking-wide mb-1">
          LEVEL UP!
        </h2>
        <p className="text-xs sm:text-sm font-serif text-amber-200 mb-3">
          You have achieved <strong className="text-yellow-300">Level {nextLevel}</strong>! Your combat mastery, spells, and vigor grow stronger.
        </p>

        {/* Automatic Benefits */}
        <div className="grid grid-cols-3 gap-2 bg-[#140e08] p-2.5 rounded-lg border border-[#4d3623] mb-3 text-xs font-serif">
          <div className="flex flex-col items-center">
            <Heart className="w-4 h-4 text-red-400 mb-0.5" />
            <span className="font-mono font-bold text-red-200">+8 Max HP</span>
          </div>
          <div className="flex flex-col items-center">
            <Zap className="w-4 h-4 text-cyan-400 mb-0.5" />
            <span className="font-mono font-bold text-cyan-200">+6 Max Energy</span>
          </div>
          <div className="flex flex-col items-center">
            <Dices className="w-4 h-4 text-purple-400 mb-0.5" />
            <span className="font-mono font-bold text-purple-200">+1 Fate Die</span>
          </div>
        </div>

        {/* Upgraded Spells & Skills List */}
        {upgradedSkills.length > 0 && (
          <div className="bg-[#1b120a] border border-[#52391e] rounded-lg p-2.5 mb-3 text-left">
            <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-amber-300 uppercase tracking-wider mb-2">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span>Spells & Martial Skills Upgraded (Rank {nextLevel})</span>
            </div>
            <div className="space-y-1.5">
              {upgradedSkills.map((skill) => (
                <div
                  key={skill.skillId}
                  className="bg-[#24170d] border border-[#3d2917] rounded px-2.5 py-1.5 flex items-center justify-between text-xs"
                >
                  <span className="font-serif font-bold text-stone-200 flex items-center gap-1.5">
                    <span className="text-amber-400">✦</span>
                    {skill.name}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-700/60 px-2 py-0.5 rounded">
                    {skill.upgradeSummary}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stat Selection */}
        <div className="text-left mb-4">
          <label className="text-xs font-serif font-bold text-amber-300 uppercase tracking-wider block mb-1.5">
            Select Attribute to Increase (+2):
          </label>
          <div className="space-y-1.5">
            {statsList.map(({ key, label, desc }) => {
              const isSelected = selectedStat === key;
              return (
                <button
                  key={key}
                  id={`btn-levelup-stat-${key}`}
                  onClick={() => {
                    setSelectedStat(key);
                    sounds.playBlock();
                  }}
                  className={`w-full p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-[#5c3e21] border-[#dfb15b] ring-1 ring-amber-400 text-amber-100 shadow'
                      : 'bg-[#19110a] border-[#442e1d] text-stone-300 hover:bg-[#2c1d12]'
                  }`}
                >
                  <div>
                    <span className="font-serif font-bold text-xs">
                      {label} ({key}) — Current: {hero.stats[key]}
                    </span>
                    <span className="text-[10px] text-stone-400 block">{desc}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">+2</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Confirm Button */}
        <button
          id="btn-confirm-level-up"
          onClick={handleConfirm}
          className="w-full py-2.5 bg-gradient-to-b from-[#b38542] to-[#6b471c] hover:from-[#c9984e] hover:to-[#7f5523] text-amber-100 font-serif font-bold text-sm rounded-lg border-2 border-[#ffd782] shadow-xl active:translate-y-0.5 transition-all"
        >
          CLAIM ADVANCEMENT & RESUME CRAWL
        </button>
      </div>
    </div>
  );
};
