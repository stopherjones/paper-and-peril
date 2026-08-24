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

    if (hero.inventory.length >= hero.maxInventorySlots) {
      setFeedback('“Your backpack is stuffed to the brim! Make some room first.”');
      sounds.playBlock();
      return;
    }

    sounds.playCoins();
    hero.gold -= item.value;

    const existing = hero.inventory.find((inv) => inv.item.id === item.id);
    if (existing && item.type === 'potion') {
      existing.quantity += 1;
    } else {
      hero.inventory.push({ item, quantity: 1 });
    }

    setFeedback(`“A fine choice! The ${item.name} is yours.”`);
    onUpdateHero({ ...hero });
  };

  // Sell Item
  const handleSell = (inventoryIdx: number) => {
    const invItem = hero.inventory[inventoryIdx];
    if (!invItem) return;

    const sellPrice = Math.max(1, Math.floor(invItem.item.value * 0.6));
    sounds.playCoins();
    hero.gold += sellPrice;

    if (invItem.quantity > 1) {
      invItem.quantity -= 1;
    } else {
      hero.inventory.splice(inventoryIdx, 1);
    }

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

  return (
    <div
      id="merchant-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
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
                            {inv.item.name} {inv.quantity > 1 ? `(x${inv.quantity})` : ''}
                          </span>
                          <span className="text-[10px] text-stone-400 font-serif">
                            Value: {sellPrice} Gold each
                          </span>
                        </div>

                        <button
                          id={`btn-sell-${inv.item.id}`}
                          onClick={() => handleSell(idx)}
                          className="px-3 py-1 bg-[#472d17] hover:bg-[#613e20] text-amber-100 rounded text-xs font-serif font-bold border border-[#784e27] transition-colors"
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
            <div className="bg-[#1b130c] border border-[#4d3623] p-4 rounded-lg text-center space-y-3">
              <Heart className="w-8 h-8 text-red-400 mx-auto" />
              <h3 className="text-base font-serif font-bold text-[#f5e4c6]">Tavern Hearth & Bandages</h3>
              <p className="text-xs text-stone-300 font-serif max-w-md mx-auto">
                Olaf brews a hot herbal tonic and expertly dresses all your wounds. Instantly restores 100% of your Hit Points and Mana.
              </p>
              <div className="font-mono text-sm text-yellow-300 font-bold">Cost: 12 Gold</div>
              <button
                id="btn-buy-tavern-rest"
                disabled={hero.gold < 12}
                onClick={handleMerchantRest}
                className="px-6 py-2 bg-gradient-to-b from-[#8f6437] to-[#593b1d] hover:from-[#a67440] hover:to-[#6d4924] text-amber-100 font-serif font-bold text-xs rounded border border-[#dfb15b] shadow disabled:opacity-40"
              >
                Pay 12 Gold & Rest
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
