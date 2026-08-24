/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Skull, RefreshCw, Award, BookOpen, Crown } from 'lucide-react';
import { HeroCharacter } from '../types/game';
import { addScoreRecord } from '../utils/storage';
import { sounds } from '../utils/audio';

interface GameOverModalProps {
  hero: HeroCharacter;
  isVictory: boolean;
  floorsCleared: number;
  onRestartNewGame: () => void;
  onOpenHallOfFame: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  hero,
  isVictory,
  floorsCleared,
  onRestartNewGame,
  onOpenHallOfFame,
}) => {
  // Calculate final adventure score
  const finalScore =
    hero.level * 150 +
    hero.statsHistory.monstersSlain * 50 +
    hero.statsHistory.roomsExplored * 25 +
    hero.statsHistory.chestsOpened * 30 +
    hero.statsHistory.trapsDisarmed * 20 +
    hero.gold +
    (isVictory ? 1500 : 0);

  useEffect(() => {
    if (isVictory) {
      sounds.playLevelUp();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    } else {
      sounds.playTrap();
    }

    // Save run to Hall of Fame
    addScoreRecord({
      id: `score_${Date.now()}`,
      heroName: hero.name,
      heroClass: hero.classId.toUpperCase(),
      level: hero.level,
      score: finalScore,
      victory: isVictory,
      date: new Date().toLocaleDateString(),
      floorsCleared,
      monstersSlain: hero.statsHistory.monstersSlain,
      goldAccumulated: hero.statsHistory.goldCollected,
    });
  }, [isVictory]);

  return (
    <div
      id="game-over-modal-overlay"
      className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
    >
      <div
        className={`border-4 rounded-xl max-w-xl w-full p-6 text-stone-200 shadow-2xl relative text-center ${
          isVictory
            ? 'bg-gradient-to-b from-[#3a2914] to-[#1e1509] border-[#f5c862] ring-2 ring-amber-500/40'
            : 'bg-gradient-to-b from-[#2e1410] to-[#170907] border-stone-700 ring-2 ring-red-950'
        }`}
      >
        {isVictory ? (
          <>
            <Crown className="w-14 h-14 text-yellow-400 mx-auto mb-2 animate-bounce" />
            <h2 className="text-3xl font-serif font-black text-[#fff5db] tracking-wide mb-1">
              THE DRAGON IS SLAIN!
            </h2>
            <p className="text-sm font-serif text-amber-200 mb-4 max-w-md mx-auto">
              With a final thunderous strike, <strong className="text-yellow-300">{hero.name}</strong> has defeated Ignis the Crimson Wyrm. The realm is saved and your name shall echo through eternity!
            </p>
          </>
        ) : (
          <>
            <Skull className="w-14 h-14 text-red-500 mx-auto mb-2" />
            <h2 className="text-3xl font-serif font-black text-red-300 tracking-wide mb-1">
              FALLEN IN THE DEPTHS
            </h2>
            <p className="text-sm font-serif text-stone-300 mb-4 max-w-md mx-auto">
              The darkness of the labyrinth claimed <strong className="text-red-300">{hero.name}</strong>. Your bones join the silent centuries of adventurers who came before.
            </p>
          </>
        )}

        {/* Score Card */}
        <div className="bg-[#120b06] border border-[#4d3623] rounded-lg p-4 mb-5 text-left font-serif">
          <div className="flex items-center justify-between border-b border-[#3b2716] pb-2 mb-3">
            <span className="text-xs text-stone-400 uppercase tracking-wider font-mono">Final Run Score</span>
            <span className="text-2xl font-mono font-black text-yellow-400">{finalScore} PTS</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-stone-300">
            <div>• Adventurer: <span className="font-bold text-amber-200">{hero.name} (Lv. {hero.level})</span></div>
            <div>• Archetype: <span className="font-bold text-amber-200 capitalize">{hero.classId}</span></div>
            <div>• Floors Descended: <span className="font-bold text-amber-200">{floorsCleared} / 3</span></div>
            <div>• Monsters Slain: <span className="font-bold text-amber-200">{hero.statsHistory.monstersSlain}</span></div>
            <div>• Vaults Looted: <span className="font-bold text-amber-200">{hero.statsHistory.chestsOpened}</span></div>
            <div>• Traps Disarmed: <span className="font-bold text-amber-200">{hero.statsHistory.trapsDisarmed}</span></div>
            <div>• Crits Rolled: <span className="font-bold text-amber-200">{hero.statsHistory.critsRolled}</span></div>
            <div>• Gold Amassed: <span className="font-bold text-yellow-300">{hero.statsHistory.goldCollected} G</span></div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            id="btn-restart-quest"
            onClick={onRestartNewGame}
            className="flex-1 py-3 bg-gradient-to-b from-[#b38542] to-[#6b471c] hover:from-[#c9984e] hover:to-[#7f5523] text-amber-100 font-serif font-bold text-sm rounded-lg border-2 border-[#ffd782] shadow-xl flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Roll New Character</span>
          </button>

          <button
            id="btn-view-hall-of-fame"
            onClick={onOpenHallOfFame}
            className="py-3 px-4 bg-[#291e14] hover:bg-[#3d2c1d] text-amber-200 font-serif font-bold text-sm rounded-lg border border-[#6b4e2d] flex items-center justify-center gap-2"
          >
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span>Hall of Fame</span>
          </button>
        </div>
      </div>
    </div>
  );
};
