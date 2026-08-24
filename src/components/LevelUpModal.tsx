/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Award, Sparkles, Heart, Wand2, Dices } from 'lucide-react';
import { HeroCharacter, StatType } from '../types/game';
import { sounds } from '../utils/audio';

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
    { key: 'INT', label: 'Intelligence', desc: '+Max Mana, magic spell damage, rune deciphering' },
    { key: 'LCK', label: 'Luck', desc: '+Critical hit chance, bonus loot rolls, escape checks' },
  ];

  const handleConfirm = () => {
    sounds.playLevelUp();
    onConfirmLevelUp(selectedStat);
  };

  return (
    <div
      id="level-up-modal-overlay"
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
    >
      <div className="bg-gradient-to-b from-[#382618] to-[#1e140c] border-4 border-[#dfb15b] rounded-xl max-w-lg w-full p-6 text-stone-200 shadow-2xl relative text-center">
        <Sparkles className="w-12 h-12 text-[#ffd782] mx-auto mb-2 animate-bounce" />
        <h2 className="text-2xl md:text-3xl font-serif font-black text-[#fff5e0] tracking-wide mb-1">
          LEVEL UP!
        </h2>
        <p className="text-sm font-serif text-amber-200 mb-4">
          You have achieved <strong className="text-yellow-300">Level {hero.level + 1}</strong>! Your combat mastery and vigor grow stronger.
        </p>

        {/* Automatic Benefits */}
        <div className="grid grid-cols-3 gap-2 bg-[#140e08] p-3 rounded-lg border border-[#4d3623] mb-4 text-xs font-serif">
          <div className="flex flex-col items-center">
            <Heart className="w-4 h-4 text-red-400 mb-0.5" />
            <span className="font-mono font-bold text-red-200">+8 Max HP</span>
          </div>
          <div className="flex flex-col items-center">
            <Wand2 className="w-4 h-4 text-cyan-400 mb-0.5" />
            <span className="font-mono font-bold text-cyan-200">+6 Max Mana</span>
          </div>
          <div className="flex flex-col items-center">
            <Dices className="w-4 h-4 text-purple-400 mb-0.5" />
            <span className="font-mono font-bold text-purple-200">+1 Fate Die</span>
          </div>
        </div>

        {/* Stat Selection */}
        <div className="text-left mb-5">
          <label className="text-xs font-serif font-bold text-amber-300 uppercase tracking-wider block mb-2">
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
                  className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
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
          className="w-full py-3 bg-gradient-to-b from-[#b38542] to-[#6b471c] hover:from-[#c9984e] hover:to-[#7f5523] text-amber-100 font-serif font-bold text-sm rounded-lg border-2 border-[#ffd782] shadow-xl active:translate-y-0.5 transition-all"
        >
          CLAIM ADVANCEMENT & RESUME CRAWL
        </button>
      </div>
    </div>
  );
};
