/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Store, Coins, X, Heart, Shield, Sword, Package, Sparkles, Wand2 } from 'lucide-react';
import { GameItem, HeroCharacter } from '../types/game';
import { generateMerchantStock } from '../utils/generator';
import { MERCHANT_QUOTES } from '../data/events';
import { sounds } from '../utils/audio';
import { addItemToHero, syncHeroSupplies } from '../utils/inventory';

interface MerchantModalProps {
  hero: HeroCharacter;
  floorNumber: number;
  onUpdateHero: (hero: HeroCharacter) => void;
  onClose: () => void;
}

export const MerchantModal: React.FC<MerchantModalProps> = ({
  hero,
  floorNumber,
  onUpdateHero,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'service'>('buy');
  const [stock] = useState<GameItem[]>(() => generateMerchantStock(floorNumber));
  const [merchantQuote] = useState(
    () => MERCHANT_QUOTES[Math.floor(Math.random() * MERCHANT_QUOTES.length)]
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  // Buy Item
  const handleBuy = (item: GameItem) => {
    if (hero.gold < item.value) {
      setFeedback('“Not enough gold in your purse for that fine item, adventurer!”');
      sounds.playBlock();
      return;
    }

    if (item.id !== 'dice_of_fate' && hero.inventory.length >= hero.maxInventorySlots) {
      setFeedback(`“Your backpack is stuffed to the brim! (${hero.inventory.length}/${hero.maxInventorySlots} slots used). Make room first.”`);
      sounds.playBlock();
      return;
    }

    sounds.playCoins();
    hero.gold -= item.value;

    const res = addItemToHero(hero, item, 1);
    if (!res.success) {
      // Refund if adding failed
      hero.gold += item.value;
      setFeedback(`“${res.message}”`);
      sounds.playBlock();
      return;
    }

    setFeedback(`“A fine choice! The ${item.name} has been stowed in your pack.”`);
    onUpdateHero({ ...hero });
  };

  // Sell Item
  const handleSell = (inventoryIdx: number) => {
    const invItem = hero.inventory[inventoryIdx];
    if (!invItem) return;

    const sellPrice = Math.max(1, Math.floor(invItem.item.value * 0.6));
    sounds.playCoins();
    hero.gold += sellPrice;

    hero.inventory.splice(inventoryIdx, 1);

    syncHeroSupplies(hero);
    setFeedback(`“Pleasure doing business! +${sellPrice} Gold paid for ${invItem.item.name}.”`);
    onUpdateHero({ ...hero });
  };

  // Tavern Rest Service
  const handleMerchantRest = () => {
    const cost = 12;
    if (hero.gold < cost) {
      setFeedback('“Warm broth and fresh bandages cost 12 Gold, friend.”');
      sounds.playBlock();
      return;
    }

    sounds.playHeal();
    hero.gold -= cost;
    hero.currentHp = hero.maxHp;
    hero.currentMana = hero.maxMana;
    setFeedback('“Enjoy the hearty stew! Your wounds are patched and stamina fully restored.”');
    onUpdateHero({ ...hero });
  };

  // Backpack Upgrade Service
  const getBackpackUpgradeCost = () => {
    if (hero.maxInventorySlots < 20) return 25;
    if (hero.maxInventorySlots < 25) return 45;
    if (hero.maxInventorySlots < 30) return 75;
    return null; // Max reached
  };

  const handleUpgradeBackpack = () => {
    const cost = getBackpackUpgradeCost();
    if (cost === null) {
      setFeedback('“Your rucksack has already reached maximum reinforced capacity (30 Slots)!”');
      sounds.playBlock();
      return;
    }

    if (hero.gold < cost) {
      setFeedback(`“Reinforcing and expanding your backpack with reinforced leather straps costs ${cost} Gold.”`);
      sounds.playBlock();
      return;
    }

    sounds.playLevelUp();
    hero.gold -= cost;
    hero.maxInventorySlots += 5;
    setFeedback(`“Backpack expanded! Capacity increased to ${hero.maxInventorySlots} Slots (+5 Slots).”`);
    onUpdateHero({ ...hero });
  };

  return (
    <div
      id="merchant-modal-overlay"
      className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-[#241a12] border-4 border-[#8c6b45] rounded-xl max-w-2xl w-full p-4 md:p-6 text-stone-200 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#523924] pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-700">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-serif font-black text-[#f5e4c6]">
                Olaf's Wandering Trading Post
              </h2>
              <p className="text-xs text-stone-400 font-serif italic">{merchantQuote}</p>
            </div>
          </div>

          <button
            id="btn-close-merchant"
            onClick={onClose}
            className="p-1.5 hover:bg-[#3d2a1c] rounded-md text-stone-400 hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currency & Tabs */}
        <div className="flex items-center justify-between bg-[#19110a] p-2.5 rounded-lg border border-[#4d341f] mb-3">
          <div className="flex gap-2">
            <button
              id="btn-merchant-tab-buy"
              onClick={() => {
                setActiveTab('buy');
                sounds.playBlock();
              }}
              className={`px-3 py-1 rounded text-xs font-serif font-bold transition-all ${
                activeTab === 'buy'
                  ? 'bg-[#dfb15b] text-[#241a12] shadow'
                  : 'bg-[#291c12] text-stone-300 hover:bg-[#3d2a1b]'
              }`}
            >
              Buy Wares
            </button>
            <button
              id="btn-merchant-tab-sell"
              onClick={() => {
                setActiveTab('sell');
                sounds.playBlock();
              }}
              className={`px-3 py-1 rounded text-xs font-serif font-bold transition-all ${
                activeTab === 'sell'
                  ? 'bg-[#dfb15b] text-[#241a12] shadow'
                  : 'bg-[#291c12] text-stone-300 hover:bg-[#3d2a1b]'
              }`}
            >
              Sell Loot ({hero.inventory.length})
            </button>
            <button
              id="btn-merchant-tab-service"
              onClick={() => {
                setActiveTab('service');
                sounds.playBlock();
              }}
              className={`px-3 py-1 rounded text-xs font-serif font-bold transition-all ${
                activeTab === 'service'
                  ? 'bg-[#dfb15b] text-[#241a12] shadow'
                  : 'bg-[#291c12] text-stone-300 hover:bg-[#3d2a1b]'
              }`}
            >
              Rest & Heal
            </button>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-yellow-300 bg-[#120c07] px-3 py-1 rounded border border-[#3b2716]">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span>{hero.gold} Gold</span>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div className="mb-3 p-2 bg-[#17120a] border border-[#785934] rounded text-xs font-serif text-amber-200">
            {feedback}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'buy' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {stock.map((item) => {
                const canAfford = hero.gold >= item.value;
                return (
                  <div
                    key={item.id}
                    className="bg-[#1b130c] border border-[#4d3623] p-2.5 rounded-lg flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-serif font-bold text-xs text-amber-200">{item.name}</span>
                        <span className="text-xs font-mono font-bold text-yellow-400">{item.value} G</span>
                      </div>
                      <p className="text-[11px] text-stone-300 font-serif leading-tight mb-2">
                        {item.description}
                      </p>
                    </div>

                    <button
                      id={`btn-buy-${item.id}`}
                      disabled={!canAfford}
                      onClick={() => handleBuy(item)}
                      className="w-full py-1 bg-[#3a2818] hover:bg-[#523922] text-amber-100 rounded text-xs font-serif font-bold border border-[#6b4b2b] transition-colors disabled:opacity-40"
                    >
                      {canAfford ? 'Buy' : 'Not enough Gold'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'sell' && (
            <div className="space-y-2">
              {hero.inventory.length === 0 ? (
                <div className="text-center py-8 text-stone-400 font-serif text-xs">
                  Your backpack is empty. Defeat monsters and loot chests to find items to trade!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {hero.inventory.map((inv, idx) => {
                    const sellPrice = Math.max(1, Math.floor(inv.item.value * 0.6));
                    return (
                      <div
                        key={idx}
                        className="bg-[#1b130c] border border-[#4d3623] p-2.5 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <span className="font-serif font-bold text-xs text-amber-200 block">
                            {inv.item.name}
                          </span>
                          <span className="text-[10px] text-stone-400 font-serif">
                            Value: {sellPrice} Gold (1 Slot)
                          </span>
                        </div>

                        <button
                          id={`btn-sell-${inv.item.id}-${idx}`}
                          onClick={() => handleSell(idx)}
                          className="px-3 py-1 bg-[#472d17] hover:bg-[#613e20] text-amber-100 rounded text-xs font-serif font-bold border border-[#784e27] transition-colors cursor-pointer"
                        >
                          Sell (+{sellPrice}G)
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'service' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tavern Rest */}
              <div className="bg-[#1b130c] border border-[#4d3623] p-3.5 rounded-lg flex flex-col justify-between text-center space-y-2">
                <Heart className="w-6 h-6 text-red-400 mx-auto" />
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#f5e4c6]">Tavern Hearth & Bandages</h3>
                  <p className="text-[11px] text-stone-300 font-serif leading-tight mt-1">
                    Hot herbal tonic and fresh bandages. Instantly restores 100% of your Hit Points and Mana.
                  </p>
                </div>
                <div className="pt-2">
                  <div className="font-mono text-xs text-yellow-300 font-bold mb-1.5">Cost: 12 Gold</div>
                  <button
                    id="btn-buy-tavern-rest"
                    disabled={hero.gold < 12}
                    onClick={handleMerchantRest}
                    className="w-full py-1.5 bg-gradient-to-b from-[#8f6437] to-[#593b1d] hover:from-[#a67440] hover:to-[#6d4924] text-amber-100 font-serif font-bold text-xs rounded border border-[#dfb15b] shadow disabled:opacity-40 cursor-pointer"
                  >
                    Pay 12 Gold & Rest
                  </button>
                </div>
              </div>

              {/* Backpack Expansion */}
              <div className="bg-[#1b130c] border border-[#4d3623] p-3.5 rounded-lg flex flex-col justify-between text-center space-y-2">
                <Package className="w-6 h-6 text-amber-400 mx-auto" />
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#f5e4c6]">Reinforced Leather Rucksack</h3>
                  <p className="text-[11px] text-stone-300 font-serif leading-tight mt-1">
                    Olaf adds sturdy leather pouches and strap reinforcements (+5 Max Backpack Slots).
                  </p>
                </div>
                <div className="pt-2">
                  {getBackpackUpgradeCost() !== null ? (
                    <>
                      <div className="font-mono text-xs text-yellow-300 font-bold mb-1.5">
                        Capacity: {hero.maxInventorySlots} ➔ {hero.maxInventorySlots + 5} Slots ({getBackpackUpgradeCost()} Gold)
                      </div>
                      <button
                        id="btn-upgrade-backpack"
                        disabled={hero.gold < getBackpackUpgradeCost()!}
                        onClick={handleUpgradeBackpack}
                        className="w-full py-1.5 bg-gradient-to-b from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-amber-100 font-serif font-bold text-xs rounded border border-amber-500 shadow disabled:opacity-40 cursor-pointer"
                      >
                        Expand (+5 Slots) — {getBackpackUpgradeCost()}G
                      </button>
                    </>
                  ) : (
                    <div className="p-2 bg-[#120b07] border border-[#3b2716] rounded text-xs font-mono text-emerald-400 font-bold">
                      ✓ Maximum Capacity Reached ({hero.maxInventorySlots} Slots)
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
