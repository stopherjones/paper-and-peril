/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, X, Award, Skull, Package, Key, Flame, Dices, Coins } from 'lucide-react';
import { HeroCharacter } from '../types/game';

interface JournalModalProps {
  hero: HeroCharacter;
  currentFloor: number;
  onClose: () => void;
}

export const JournalModal: React.FC<JournalModalProps> = ({ hero, currentFloor, onClose }) => {
  return (
    <div
      id="journal-modal-overlay"
      className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
    >
      <div className="bg-[#241a12] border-4 border-[#8c6b45] rounded-xl max-w-2xl w-full p-4 md:p-6 text-stone-200 shadow-2xl relative max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#523924] pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-xl font-serif font-black text-[#f5e4c6]">{hero.name}'s Adventure Journal</h2>
              <span className="text-[11px] text-stone-400 font-mono">Floor {currentFloor} • Level {hero.level} {hero.classId}</span>
            </div>
          </div>
          <button
            id="btn-close-journal"
            onClick={onClose}
            className="p-1.5 hover:bg-[#3d2a1c] rounded-md text-stone-400 hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
          <div className="bg-[#19110a] border border-[#442e1d] p-2.5 rounded-lg text-center font-serif">
            <Skull className="w-4 h-4 text-red-400 mx-auto mb-1" />
            <span className="text-[10px] text-stone-400 uppercase block">Monsters Slain</span>
            <span className="text-lg font-mono font-bold text-red-200">{hero.statsHistory.monstersSlain}</span>
          </div>

          <div className="bg-[#19110a] border border-[#442e1d] p-2.5 rounded-lg text-center font-serif">
            <Package className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <span className="text-[10px] text-stone-400 uppercase block">Chests Looted</span>
            <span className="text-lg font-mono font-bold text-amber-200">{hero.statsHistory.chestsOpened}</span>
          </div>

          <div className="bg-[#19110a] border border-[#442e1d] p-2.5 rounded-lg text-center font-serif">
            <Key className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <span className="text-[10px] text-stone-400 uppercase block">Traps Disarmed</span>
            <span className="text-lg font-mono font-bold text-cyan-200">{hero.statsHistory.trapsDisarmed}</span>
          </div>

          <div className="bg-[#19110a] border border-[#442e1d] p-2.5 rounded-lg text-center font-serif">
            <Coins className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
            <span className="text-[10px] text-stone-400 uppercase block">Gold Found</span>
            <span className="text-lg font-mono font-bold text-yellow-300">{hero.statsHistory.goldCollected} G</span>
          </div>
        </div>

        {/* Extra Combat Records */}
        <div className="bg-[#19110a] border border-[#442e1d] p-3 rounded-lg mb-3 font-serif text-xs text-stone-300 space-y-1.5">
          <div className="flex justify-between border-b border-[#332215] pb-1">
            <span>Critical Hits Rolled (Natural 20s):</span>
            <span className="font-mono text-amber-300 font-bold">{hero.statsHistory.critsRolled}</span>
          </div>
          <div className="flex justify-between border-b border-[#332215] pb-1">
            <span>Highest Single Strike Damage:</span>
            <span className="font-mono text-red-400 font-bold">{hero.statsHistory.highestDamageDealt} Dmg</span>
          </div>
          <div className="flex justify-between">
            <span>Rooms Explored on Current Run:</span>
            <span className="font-mono text-emerald-400 font-bold">{hero.statsHistory.roomsExplored}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
