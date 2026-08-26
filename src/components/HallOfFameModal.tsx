/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trophy, X, Crown, Skull } from 'lucide-react';
import { getHallOfFame } from '../utils/storage';

interface HallOfFameModalProps {
  onClose: () => void;
}

export const HallOfFameModal: React.FC<HallOfFameModalProps> = ({ onClose }) => {
  const scores = getHallOfFame();

  // Escape key listener to close modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      id="hall-of-fame-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[90] bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
    >
      <div className="bg-[#241a12] border-4 border-[#8c6b45] rounded-xl max-w-2xl w-full p-4 md:p-6 text-stone-200 shadow-2xl relative max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#523924] pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-serif font-black text-[#f5e4c6]">Dungeon Hall of Fame</h2>
          </div>
          <button
            id="btn-close-hof"
            onClick={onClose}
            className="p-1.5 hover:bg-[#3d2a1c] rounded-md text-stone-400 hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs font-serif text-stone-400 mb-3">
          The chronicled deeds of heroes who dared to challenge the Dragon's Lair.
        </p>

        {/* Scores Table */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          {scores.map((record, idx) => (
            <div
              key={record.id || idx}
              className="bg-[#19110a] border border-[#442e1d] p-3 rounded-lg flex items-center justify-between font-serif text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 font-mono font-bold text-center text-amber-500">#{idx + 1}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-200 text-sm">{record.heroName}</span>
                    <span className="text-[10px] font-mono bg-[#2a1d13] text-stone-400 px-1.5 py-0.2 rounded">
                      Lv. {record.level} {record.heroClass}
                    </span>
                    {record.victory ? (
                      <span className="flex items-center gap-1 text-[10px] text-yellow-400 font-bold">
                        <Crown className="w-3 h-3 text-yellow-400" /> Victor
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-stone-500">
                        <Skull className="w-3 h-3 text-stone-500" /> Fallen
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {record.monstersSlain} beasts slain • {record.goldAccumulated} gold • {record.date}
                  </span>
                </div>
              </div>

              <div className="font-mono text-base font-black text-yellow-300">{record.score} PTS</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
