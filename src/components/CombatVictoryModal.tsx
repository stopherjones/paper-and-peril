/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  Award,
  Coins,
  Sparkles,
  Check,
  Package,
  Skull,
  Heart,
  Shield,
  Sword,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { GameItem, HeroCharacter, Monster } from '../types/game';
import { sounds } from '../utils/audio';

interface CombatVictoryModalProps {
  isOpen: boolean;
  monster: Monster;
  reward: {
    xp: number;
    gold: number;
    items: GameItem[];
  };
  hero: HeroCharacter;
  onClaim: () => void;
}

export const CombatVictoryModal: React.FC<CombatVictoryModalProps> = ({
  isOpen,
  monster,
  reward,
  hero,
  onClaim,
}) => {
  useEffect(() => {
    if (isOpen) {
      sounds.playLevelUp();
      sounds.playCoins();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClaim();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClaim]);

  if (!isOpen) return null;

  const currentXpPercent = Math.min(100, (hero.xp / hero.xpToNextLevel) * 100);
  const nextXpPercent = Math.min(100, ((hero.xp + reward.xp) / hero.xpToNextLevel) * 100);
  const willLevelUp = hero.xp + reward.xp >= hero.xpToNextLevel;

  return (
    <div
      id="combat-victory-modal-backdrop"
      className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
    >
      <div
        id="combat-victory-modal-card"
        className="bg-[#1c140d] border-4 border-amber-500/90 rounded-2xl max-w-xl w-full p-6 text-amber-100 shadow-[0_0_60px_rgba(245,158,11,0.3)] relative flex flex-col gap-4 animate-scaleUp"
      >
        {/* Victory Ribbon & Header */}
        <div className="text-center space-y-1.5 pb-3 border-b border-amber-900/60">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs font-mono font-bold uppercase tracking-wider shadow">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>Chamber Cleared • Monster Defeated</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black font-serif text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 drop-shadow">
            Victory Over {monster.name}!
          </h2>
          <p className="text-xs text-stone-400 font-serif">
            The hostile threat has been vanquished. Search the lair and claim your hard-earned spoils.
          </p>
        </div>

        {/* Spoils Overview Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* XP Reward Card */}
          <div className="p-3.5 bg-stone-950/80 border border-amber-900/60 rounded-xl space-y-1.5 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-stone-400 uppercase">Experience</span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                +{reward.xp} XP
              </span>
            </div>
            <div className="text-lg font-black font-mono text-cyan-300">
              {hero.xp + reward.xp} / {hero.xpToNextLevel} XP
            </div>
            {/* Progress bar */}
            <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden border border-stone-800">
              <div
                className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${nextXpPercent}%` }}
              />
            </div>
            {willLevelUp && (
              <div className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1 animate-pulse pt-0.5">
                <TrendingUp className="w-3 h-3" />
                <span>Ready to Level Up!</span>
              </div>
            )}
          </div>

          {/* Gold Bounty Card */}
          <div className="p-3.5 bg-stone-950/80 border border-amber-900/60 rounded-xl space-y-1.5 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-stone-400 uppercase">Gold Spoils</span>
              <Coins className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="text-lg font-black font-mono text-amber-300">
              +{reward.gold} Gold Pieces
            </div>
            <div className="text-[11px] text-stone-400 font-mono">
              Total Wealth: <span className="text-yellow-300 font-bold">{hero.gold + reward.gold} GP</span>
            </div>
          </div>
        </div>

        {/* Dropped Items Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-serif font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-4 h-4 text-amber-400" />
              <span>Loot Drops & Spoils ({reward.items.length})</span>
            </span>
          </div>

          {reward.items.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {reward.items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-stone-950/90 border border-amber-700/70 rounded-xl flex items-center justify-between gap-3 shadow-md animate-fadeIn"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-500/20 border border-amber-500/50 rounded-lg text-amber-400 shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-amber-200 text-sm">
                          {item.name}
                        </span>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-950 border border-amber-700 text-amber-400">
                          {item.rarity} {item.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-300 font-serif leading-tight mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono text-xs text-stone-400">
                    {item.damageDice && (
                      <span className="text-red-400 font-bold block">{item.damageDice} Dmg</span>
                    )}
                    {item.armorBonus && (
                      <span className="text-blue-400 font-bold block">+{item.armorBonus} AC</span>
                    )}
                    {item.healHp && (
                      <span className="text-emerald-400 font-bold block">+{item.healHp} HP</span>
                    )}
                    <span className="text-yellow-400 font-bold text-[11px]">{item.value} GP</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-stone-950/60 border border-stone-800 rounded-xl text-center text-xs text-stone-400 font-serif">
              No rare equipment recovered from this creature, but you collected {reward.gold} gold coins!
            </div>
          )}
        </div>

        {/* Claim Action Button */}
        <div className="pt-2">
          <button
            id="btn-claim-combat-loot"
            onClick={onClaim}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-400 text-stone-950 font-serif font-black text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transform active:scale-98 transition-all"
          >
            <Check className="w-5 h-5" />
            <span>Claim Spoils & Return to Dungeon (Space / Enter) ➔</span>
          </button>
        </div>
      </div>
    </div>
  );
};
