/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Package, X, Sword, Shield, Sparkles, Heart, Wand2, ArrowUpCircle } from 'lucide-react';
import { GameItem, HeroCharacter, ItemType } from '../types/game';
import { sounds } from '../utils/audio';

interface InventoryModalProps {
  hero: HeroCharacter;
  onUpdateHero: (hero: HeroCharacter) => void;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  hero,
  onUpdateHero,
  onClose,
}) => {
  const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);

  const selectedInv = selectedItemIdx !== null ? hero.inventory[selectedItemIdx] : null;

  // Equip Item
  const handleEquipItem = (invIdx: number) => {
    const inv = hero.inventory[invIdx];
    if (!inv) return;
    const item = inv.item;
    sounds.playBlock();

    let slotKey: keyof HeroCharacter['equipment'] | null = null;
    if (item.type === 'weapon') slotKey = 'weapon';
    else if (item.type === 'shield') slotKey = 'offhand';
    else if (item.type === 'armor') slotKey = 'armor';
    else if (item.type === 'helmet') slotKey = 'helmet';
    else if (item.type === 'boots') slotKey = 'boots';
    else if (item.type === 'ring') slotKey = 'ring';
    else if (item.type === 'amulet') slotKey = 'amulet';

    if (!slotKey) return;

    // Swap old item into inventory
    const oldItem = hero.equipment[slotKey];
    hero.equipment[slotKey] = item;

    // Remove from inventory
    if (inv.quantity > 1) {
      inv.quantity -= 1;
    } else {
      hero.inventory.splice(invIdx, 1);
    }

    if (oldItem) {
      hero.inventory.push({ item: oldItem, quantity: 1 });
    }

    setSelectedItemIdx(null);
    onUpdateHero({ ...hero });
  };

  // Unequip slot
  const handleUnequipSlot = (slotKey: keyof HeroCharacter['equipment']) => {
    const item = hero.equipment[slotKey];
    if (!item) return;
    if (hero.inventory.length >= hero.maxInventorySlots) {
      sounds.playBlock();
      return;
    }

    sounds.playBlock();
    hero.equipment[slotKey] = undefined;
    hero.inventory.push({ item, quantity: 1 });
    onUpdateHero({ ...hero });
  };

  // Use consumable item outside combat
  const handleUseItem = (invIdx: number) => {
    const inv = hero.inventory[invIdx];
    if (!inv || !inv.item.usableOutOfCombat) return;
    const item = inv.item;

    if (item.healHp) {
      sounds.playHeal();
      hero.currentHp = Math.min(hero.maxHp, hero.currentHp + item.healHp);
    }
    if (item.healMana) {
      sounds.playSpell();
      hero.currentMana = Math.min(hero.maxMana, hero.currentMana + item.healMana);
    }

    if (inv.quantity > 1) {
      inv.quantity -= 1;
    } else {
      hero.inventory.splice(invIdx, 1);
      setSelectedItemIdx(null);
    }

    onUpdateHero({ ...hero });
  };

  return (
    <div
      id="inventory-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-[#241a12] border-4 border-[#8c6b45] rounded-xl max-w-3xl w-full p-4 md:p-6 text-stone-200 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#523924] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-serif font-black text-[#f5e4c6]">Adventurer's Pack & Equipment</h2>
          </div>
          <button
            id="btn-close-inventory"
            onClick={onClose}
            className="p-1.5 hover:bg-[#3d2a1c] rounded-md text-stone-400 hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 overflow-y-auto pr-1">
          {/* Left Column: Equipped Slots */}
          <div className="md:col-span-5 space-y-2">
            <h3 className="text-xs font-serif font-bold text-[#e6c898] uppercase tracking-wider mb-2">
              Equipped Armor & Weapons
            </h3>

            <div className="space-y-1.5">
              {(
                [
                  { slot: 'weapon', label: 'Main Hand (Weapon)' },
                  { slot: 'offhand', label: 'Offhand (Shield/Tome)' },
                  { slot: 'armor', label: 'Body Armor' },
                  { slot: 'helmet', label: 'Headgear' },
                  { slot: 'boots', label: 'Footwear' },
                  { slot: 'ring', label: 'Finger Ring' },
                  { slot: 'amulet', label: 'Necklace / Amulet' },
                ] as const
              ).map(({ slot, label }) => {
                const item = hero.equipment[slot];
                return (
                  <div
                    key={slot}
                    className="p-2 bg-[#19110a] border border-[#442e1d] rounded-md flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-mono text-stone-500 block uppercase">{label}</span>
                      <span className="text-xs font-serif font-bold text-amber-200">
                        {item ? item.name : '— Empty —'}
                      </span>
                    </div>

                    {item && (
                      <button
                        id={`btn-unequip-${slot}`}
                        onClick={() => handleUnequipSlot(slot)}
                        className="text-[10px] font-serif bg-[#382618] hover:bg-[#4d3521] text-stone-300 px-2 py-0.5 rounded border border-[#593d25] transition-colors"
                      >
                        Unequip
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Backpack Slots & Detail */}
          <div className="md:col-span-7 flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-serif font-bold text-[#e6c898] uppercase tracking-wider">
                  Backpack Storage ({hero.inventory.length} / {hero.maxInventorySlots})
                </h3>
              </div>

              {/* Grid of items */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {hero.inventory.map((inv, idx) => {
                  const isSelected = selectedItemIdx === idx;
                  return (
                    <button
                      key={idx}
                      id={`btn-inv-item-${idx}`}
                      onClick={() => {
                        setSelectedItemIdx(idx);
                        sounds.playBlock();
                      }}
                      className={`p-2 rounded-lg border text-left flex flex-col justify-between min-h-[64px] transition-all ${
                        isSelected
                          ? 'bg-[#47301c] border-[#dfb15b] ring-1 ring-amber-400 text-amber-100 shadow'
                          : 'bg-[#19110a] border-[#442e1d] text-stone-300 hover:bg-[#2e1f13]'
                      }`}
                    >
                      <span className="font-serif font-bold text-xs line-clamp-1">{inv.item.name}</span>
                      <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono mt-1">
                        <span className="capitalize">{inv.item.type}</span>
                        {inv.quantity > 1 && <span className="text-amber-300 font-bold">x{inv.quantity}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {hero.inventory.length === 0 && (
                <div className="text-center py-8 text-stone-500 font-serif text-xs">
                  Your backpack is empty.
                </div>
              )}
            </div>

            {/* Item Inspector Panel */}
            {selectedInv && (
              <div className="bg-[#17100a] border border-[#5c4028] p-3 rounded-lg mt-auto">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-serif font-bold text-sm text-amber-200">{selectedInv.item.name}</span>
                  <span className="text-xs font-mono text-yellow-400">{selectedInv.item.value} Gold</span>
                </div>

                <p className="text-xs text-stone-300 font-serif leading-tight mb-2">
                  {selectedInv.item.description}
                </p>

                <div className="flex flex-wrap gap-2 text-[11px] font-mono text-stone-400 mb-3">
                  {selectedInv.item.damageDice && (
                    <span className="bg-[#24170e] px-2 py-0.5 rounded border border-[#442d1b] text-red-300">
                      Damage: {selectedInv.item.damageDice}
                    </span>
                  )}
                  {selectedInv.item.armorBonus && (
                    <span className="bg-[#24170e] px-2 py-0.5 rounded border border-[#442d1b] text-blue-300">
                      Armor: +{selectedInv.item.armorBonus} AC
                    </span>
                  )}
                  {selectedInv.item.healHp && (
                    <span className="bg-[#24170e] px-2 py-0.5 rounded border border-[#442d1b] text-emerald-300">
                      Heals: +{selectedInv.item.healHp} HP
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {['weapon', 'shield', 'armor', 'helmet', 'boots', 'ring', 'amulet'].includes(
                    selectedInv.item.type
                  ) && (
                    <button
                      id="btn-equip-selected"
                      onClick={() => handleEquipItem(selectedItemIdx!)}
                      className="flex-1 py-1.5 bg-[#8f6437] hover:bg-[#a67440] text-amber-100 font-serif font-bold text-xs rounded border border-[#dfb15b] shadow transition-colors"
                    >
                      Equip Item
                    </button>
                  )}

                  {selectedInv.item.usableOutOfCombat && (
                    <button
                      id="btn-use-selected"
                      onClick={() => handleUseItem(selectedItemIdx!)}
                      className="flex-1 py-1.5 bg-[#2d5930] hover:bg-[#386e3c] text-emerald-100 font-serif font-bold text-xs rounded border border-emerald-500 shadow transition-colors"
                    >
                      Consume / Drink
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
