/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Package, Sparkles, Coins, Dices, Check, Heart, Shield, Sword, X } from 'lucide-react';
import { GameItem, HeroCharacter } from '../types/game';
import { LOOT_TABLE_CHEST, TableRow, lookupTableRow } from '../data/tables';
import { parseAndRollFormula, rollDice, RollResult } from '../utils/dice';
import { ITEMS_DATABASE } from '../data/items';
import { sounds } from '../utils/audio';
import { DieShape } from './DieShape';

interface LootRollerModalProps {
  isOpen: boolean;
  hero?: HeroCharacter;
  onUpdateHero?: (hero: HeroCharacter) => void;
  title: string;
  sourceDescription: string;
  floorNumber: number;
  guaranteedGold?: number;
  bonusItems?: GameItem[];
  onClaimLoot: (goldEarned: number, itemsEarned: GameItem[]) => void;
  onClose: () => void;
}

export const LootRollerModal: React.FC<LootRollerModalProps> = ({
  isOpen,
  hero,
  onUpdateHero,
  title,
  sourceDescription,
  floorNumber,
  guaranteedGold = 0,
  bonusItems = [],
  onClaimLoot,
  onClose,
}) => {
  const [hasRolled, setHasRolled] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [currentRoll, setCurrentRoll] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<TableRow | null>(null);
  const [awardedGold, setAwardedGold] = useState<number>(guaranteedGold);
  const [awardedItems, setAwardedItems] = useState<GameItem[]>(bonusItems);

  useEffect(() => {
    if (isOpen) {
      setHasRolled(false);
      setCurrentRoll(null);
      setSelectedRow(null);
      setAwardedGold(guaranteedGold);
      setAwardedItems(bonusItems);
    }
  }, [isOpen, guaranteedGold, bonusItems]);

  if (!isOpen) return null;

  const handleRollLootTable = () => {
    if (isRolling) return;
    setIsRolling(true);
    sounds.playDiceRoll();

    setTimeout(() => {
      const rollRes = rollDice(1, 20);
      setCurrentRoll(rollRes.total);
      const row = lookupTableRow(LOOT_TABLE_CHEST, rollRes.total);
      setSelectedRow(row);

      // Roll gold formula
      const goldRoll = parseAndRollFormula(row.data.goldFormula);
      const totalGold = guaranteedGold + goldRoll.total + (floorNumber - 1) * 10;
      setAwardedGold(totalGold);

      // Pick item from database
      const itemsList: GameItem[] = [...bonusItems];
      if (row.data.itemId && ITEMS_DATABASE[row.data.itemId]) {
        itemsList.push(ITEMS_DATABASE[row.data.itemId]);
      } else {
        // Fallback to floor loot
        itemsList.push(ITEMS_DATABASE['minor_healing_potion']);
      }
      setAwardedItems(itemsList);

      setIsRolling(false);
      setHasRolled(true);
      sounds.playLoot();
    }, 600);
  };

  const handleUseFateReroll = () => {
    if (!hero || hero.rerollTokens <= 0 || isRolling) return;
    hero.rerollTokens -= 1;
    onUpdateHero?.({ ...hero });
    handleRollLootTable();
  };

  const handleConfirmClaim = () => {
    onClaimLoot(awardedGold, awardedItems);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#18120c] border-2 border-amber-600/80 rounded-xl max-w-2xl w-full p-6 shadow-2xl text-amber-100 animate-fadeIn relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-900/60 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-950 border border-amber-700 text-amber-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono text-amber-400/80 uppercase">
                Treasure & Spoils Table (1d20)
              </span>
              <h2 className="text-xl font-bold font-serif text-amber-200">{title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-amber-200 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-stone-300 mb-4">{sourceDescription}</p>

        {/* Rolling Stage */}
        {!hasRolled ? (
          <div className="space-y-4">
            <div className="p-6 bg-[#161c26] border border-slate-700 rounded-xl text-center flex flex-col items-center justify-center">
              {isRolling ? (
                <div className="py-2">
                  <DieShape
                    sides={20}
                    value={Math.floor(Math.random() * 20) + 1}
                    isRolling={true}
                    size="lg"
                  />
                  <div className="text-xs text-amber-300 font-mono mt-3 flex items-center justify-center gap-1.5">
                    <Dices className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>Tumbling 1d20 in Vault...</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <DieShape
                      sides={20}
                      value={20}
                      size="md"
                    />
                  </div>
                  <h4 className="font-serif font-bold text-lg text-amber-200">
                    Roll on the Dungeon Vault Loot Table
                  </h4>
                  <p className="text-xs text-stone-400 max-w-md mx-auto mt-1 mb-4">
                    Roll 1d20 to determine the quality of gemstones, ancient coins, enchanted armaments, and elixirs discovered.
                  </p>
                  <button
                    onClick={handleRollLootTable}
                    disabled={isRolling}
                    className="px-6 py-3 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 text-stone-950 font-black font-serif rounded-xl shadow-xl transition-all cursor-pointer transform hover:scale-105 flex items-center gap-2 mx-auto"
                  >
                    <Dices className="w-5 h-5" />
                    Roll Loot Table (1d20)
                  </button>
                </>
              )}
            </div>

            {/* Table Reference Preview */}
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {LOOT_TABLE_CHEST.rows.map((row) => (
                <div
                  key={row.id}
                  className="p-2 rounded bg-stone-950/60 border border-stone-800 text-xs flex items-center justify-between text-stone-400"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-400/90 font-bold px-1.5 py-0.5 bg-stone-900 rounded">
                      [{row.minRoll}-{row.maxRoll}]
                    </span>
                    <span className="text-stone-300 font-semibold">{row.name}</span>
                  </div>
                  <span className="text-[11px] text-stone-400">{row.subtitle}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Result Award Screen */
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/90 via-stone-900 to-amber-950/90 border-2 border-amber-400 shadow-xl">
              <div className="flex items-center justify-between mb-3 border-b border-amber-900/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-stone-950 font-bold font-mono text-xs">
                    Rolled {currentRoll}
                  </span>
                  <span className="font-serif font-bold text-amber-200">
                    {selectedRow?.name}
                  </span>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  {selectedRow?.badge}
                </span>
              </div>

              {/* Loot contents */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {/* Gold Card */}
                <div className="p-3 bg-stone-950/80 rounded-lg border border-amber-800/60 flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-full text-amber-400">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-stone-400">Gold Acquired</div>
                    <div className="text-lg font-bold font-mono text-amber-300">
                      +{awardedGold} Gold
                    </div>
                  </div>
                </div>

                {/* Items Card */}
                <div className="p-3 bg-stone-950/80 rounded-lg border border-amber-800/60 flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-full text-purple-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-stone-400">Items Discovered</div>
                    <div className="text-sm font-bold text-purple-200 truncate">
                      {awardedItems.map((i) => i.name).join(', ') || 'Valuable Trinkets'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions: Fate Reroll & Claim */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              {hero && (
                <button
                  id="btn-loot-fate-reroll"
                  disabled={hero.rerollTokens <= 0 || isRolling}
                  onClick={handleUseFateReroll}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-serif font-bold flex items-center justify-center gap-2 border transition-all ${
                    hero.rerollTokens > 0
                      ? 'bg-purple-950/80 hover:bg-purple-900 border-purple-500/80 text-purple-200 shadow-md cursor-pointer active:scale-95'
                      : 'bg-stone-900 border-stone-800 text-stone-500 cursor-not-allowed opacity-60'
                  }`}
                  title={
                    hero.rerollTokens > 0
                      ? `Reroll 1d20 Loot Table (${hero.rerollTokens} Fate Tokens remaining)`
                      : 'No Fate Tokens available in inventory'
                  }
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>
                    {hero.rerollTokens > 0
                      ? `✦ Fate Reroll Loot (${hero.rerollTokens} Available)`
                      : '0 Fate Tokens Available'}
                  </span>
                </button>
              )}

              <button
                id="btn-confirm-loot-claim"
                onClick={handleConfirmClaim}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 text-stone-950 font-bold font-serif rounded-lg shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer transform hover:scale-105 active:scale-95 ml-auto"
              >
                <Check className="w-4 h-4" />
                <span>Claim Loot & Add to Backpack ➔</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
