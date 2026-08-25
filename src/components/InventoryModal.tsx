/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Package,
  X,
  Sword,
  Shield,
  Sparkles,
  Heart,
  Wand2,
  Coins,
  Flame,
  Key,
  Utensils,
  Dices,
  Eye,
  Compass,
  Hammer,
  Trash2,
} from 'lucide-react';
import { GameItem, HeroCharacter, ItemType } from '../types/game';
import { sounds } from '../utils/audio';
import { dropItemFromHero, syncHeroSupplies } from '../utils/inventory';

interface InventoryModalProps {
  hero: HeroCharacter;
  onUpdateHero: (hero: HeroCharacter) => void;
  onClose: () => void;
  onActivateMapAction?: (
    action: 'TORCH' | 'CLAIRVOYANCE' | 'SPYGLASS' | 'SMASH_WALL' | 'PHASE_WALL'
  ) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  hero,
  onUpdateHero,
  onClose,
  onActivateMapAction,
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

    syncHeroSupplies(hero);
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
    syncHeroSupplies(hero);
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

    syncHeroSupplies(hero);
    onUpdateHero({ ...hero });
  };

  // Drop / Discard item to free backpack slot
  const handleDropItem = (invIdx: number) => {
    sounds.playTrap();
    dropItemFromHero(hero, invIdx);
    setSelectedItemIdx(null);
    onUpdateHero({ ...hero });
  };

  const getItemCategoryLabel = (item: GameItem) => {
    if (item.id === 'dungeon_ration') return 'Supply / Food';
    if (item.id === 'iron_lockpick') return 'Tool / Picks';
    if (item.id === 'dungeon_torch') return 'Tool / Torch';
    if (item.id === 'dice_of_fate') return 'Relic / Fate';
    if (item.type === 'potion') return 'Potion';
    if (item.type === 'scroll') return 'Spell Scroll';
    if (item.type === 'weapon') return 'Weapon';
    if (item.type === 'shield') return 'Shield';
    if (item.type === 'armor') return 'Armor';
    if (item.type === 'treasure') return 'Treasure';
    return item.type;
  };

  const getItemIcon = (item: GameItem) => {
    if (item.id === 'dungeon_ration') return <Utensils className="w-4 h-4 text-amber-500 shrink-0" />;
    if (item.id === 'iron_lockpick') return <Key className="w-4 h-4 text-cyan-400 shrink-0" />;
    if (item.id === 'dungeon_torch') return <Flame className="w-4 h-4 text-orange-400 shrink-0" />;
    if (item.id === 'dice_of_fate') return <Dices className="w-4 h-4 text-purple-400 shrink-0" />;
    if (item.type === 'potion') return <Heart className="w-4 h-4 text-red-400 shrink-0" />;
    if (item.type === 'scroll') return <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />;
    if (item.type === 'weapon') return <Sword className="w-4 h-4 text-red-300 shrink-0" />;
    if (item.type === 'shield') return <Shield className="w-4 h-4 text-blue-300 shrink-0" />;
    if (item.specialEffect === 'SMASH_WALL') return <Hammer className="w-4 h-4 text-amber-400 shrink-0" />;
    return <Package className="w-4 h-4 text-stone-400 shrink-0" />;
  };

  return (
    <div
      id="inventory-modal-overlay"
      className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-[#241a12] border-4 border-[#8c6b45] rounded-xl max-w-3xl w-full p-4 md:p-6 text-stone-200 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header with Coin Purse */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#523924] pb-3 mb-3 gap-2">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-lg md:text-xl font-serif font-black text-[#f5e4c6] leading-tight">
                Adventurer's Backpack & Gear
              </h2>
              <span className="text-[11px] font-mono text-stone-400 block">
                {hero.name} • Level {hero.level} {hero.classId}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Prominent Gold Coin Purse Display */}
            <div
              id="inv-gold-display"
              className="flex items-center gap-2 bg-[#171008] px-3 py-1.5 rounded-lg border-2 border-amber-500/80 text-amber-300 font-mono shadow-inner"
              title="Wealth Purse (Coins carry no slot weight)"
            >
              <Coins className="w-4 h-4 text-yellow-400 animate-pulse" />
              <div className="flex flex-col text-left leading-none">
                <span className="text-[9px] text-amber-400/80 uppercase font-sans font-bold">Coin Purse</span>
                <span className="text-sm font-bold text-yellow-300">{hero.gold} GP</span>
              </div>
            </div>

            <button
              id="btn-close-inventory"
              onClick={onClose}
              className="p-1.5 hover:bg-[#3d2a1c] rounded-md text-stone-400 hover:text-stone-200 transition-colors cursor-pointer shrink-0"
              title="Close backpack (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Backpack Capacity & Quick Supplies Strip */}
        <div className="bg-[#181109] border border-[#4d321d] rounded-lg p-2.5 mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-400" />
            <span className="text-stone-300 font-serif font-bold">Backpack Capacity:</span>
            <span className="font-mono font-bold text-amber-300">
              {hero.inventory.length} / {hero.maxInventorySlots} Slots
            </span>
            <div className="w-24 h-2 bg-[#120b07] rounded-full overflow-hidden border border-[#3d2817] hidden sm:block">
              <div
                className={`h-full ${
                  hero.inventory.length >= hero.maxInventorySlots
                    ? 'bg-red-500'
                    : hero.inventory.length >= hero.maxInventorySlots - 2
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (hero.inventory.length / hero.maxInventorySlots) * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-stone-300">
            {hero.rations > 0 && (
              <button
                id="inv-quick-ration"
                onClick={() => {
                  const res = handleUseItem(hero.inventory.findIndex((i) => i.item.id === 'dungeon_ration'));
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#24160d] hover:bg-[#382315] border border-[#4d2f1b] transition-colors cursor-pointer text-amber-200"
                title="Eat 1 Ration from pack (+8 HP)"
              >
                <Utensils className="w-3.5 h-3.5 text-amber-500" />
                <span>Eat Ration ({hero.rations})</span>
              </button>
            )}

            {hero.torches > 0 && (
              <button
                id="inv-quick-torch"
                onClick={() => {
                  onClose();
                  onActivateMapAction?.('TORCH');
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#2a170a] hover:bg-[#42230e] border border-[#5e3212] transition-colors cursor-pointer text-orange-200"
                title="Light 1 Torch from pack (Reveal adjacent room on map)"
              >
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>Light Torch ({hero.torches})</span>
              </button>
            )}
          </div>
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
                        className="text-[10px] font-serif bg-[#382618] hover:bg-[#4d3521] text-stone-300 px-2 py-0.5 rounded border border-[#593d25] transition-colors cursor-pointer"
                      >
                        Unequip
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Active Modifiers & Spells */}
            <div className="pt-2 border-t border-[#442e1d] mt-3">
              <div className="flex items-center gap-1.5 text-cyan-300 font-serif font-bold text-xs mb-1.5">
                <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Spellbook & Active Enchantments</span>
              </div>
              <div className="space-y-1">
                {hero.skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="p-1.5 bg-[#161220] border border-[#3b2d54] rounded text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-200 font-serif">{skill.name}</span>
                      <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950 px-1 py-0.2 rounded border border-cyan-800">
                        {skill.manaCost} MP
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-400 font-serif">{skill.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Backpack Slots & Detail */}
          <div className="md:col-span-7 flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-serif font-bold text-[#e6c898] uppercase tracking-wider">
                  Backpack Storage ({hero.inventory.length} / {hero.maxInventorySlots} Items)
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
                      className={`p-2 rounded-lg border text-left flex flex-col justify-between min-h-[68px] transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#47301c] border-[#dfb15b] ring-1 ring-amber-400 text-amber-100 shadow'
                          : 'bg-[#19110a] border-[#442e1d] text-stone-300 hover:bg-[#2e1f13]'
                      }`}
                    >
                      <div className="flex items-start gap-1.5">
                        {getItemIcon(inv.item)}
                        <span className="font-serif font-bold text-xs line-clamp-2 leading-tight">
                          {inv.item.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono mt-1 pt-1 border-t border-[#362315]/60">
                        <span className="text-[9px] text-amber-400/80 truncate">{getItemCategoryLabel(inv.item)}</span>
                        {inv.quantity > 1 && (
                          <span className="text-amber-300 font-bold bg-[#29170a] px-1 rounded border border-[#4d2c12]">
                            x{inv.quantity}
                          </span>
                        )}
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
                  <div className="flex items-center gap-1.5">
                    {getItemIcon(selectedInv.item)}
                    <span className="font-serif font-bold text-sm text-amber-200">{selectedInv.item.name}</span>
                  </div>
                  <span className="text-xs font-mono text-yellow-400">{selectedInv.item.value} Gold</span>
                </div>

                <div className="text-[10px] font-mono text-amber-400/80 uppercase mb-1">
                  Category: {getItemCategoryLabel(selectedInv.item)} {selectedInv.quantity > 1 ? `• Stack: ${selectedInv.quantity}` : ''}
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

                <div className="flex flex-wrap gap-2">
                  {['weapon', 'shield', 'armor', 'helmet', 'boots', 'ring', 'amulet'].includes(
                    selectedInv.item.type
                  ) && (
                    <button
                      id="btn-equip-selected"
                      onClick={() => handleEquipItem(selectedItemIdx!)}
                      className="flex-1 py-1.5 bg-[#8f6437] hover:bg-[#a67440] text-amber-100 font-serif font-bold text-xs rounded border border-[#dfb15b] shadow transition-colors cursor-pointer"
                    >
                      Equip Item
                    </button>
                  )}

                  {/* Healing, rations, and mana consumables */}
                  {(selectedInv.item.healHp || selectedInv.item.healMana || selectedInv.item.id === 'dungeon_ration') && (
                    <button
                      id="btn-use-selected"
                      onClick={() => handleUseItem(selectedItemIdx!)}
                      className="flex-1 py-1.5 bg-[#2d5930] hover:bg-[#386e3c] text-emerald-100 font-serif font-bold text-xs rounded border border-emerald-500 shadow transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {selectedInv.item.id === 'dungeon_ration' ? (
                        <>
                          <Utensils className="w-3.5 h-3.5 text-amber-400" />
                          <span>Eat Salted Ration (+8 HP)</span>
                        </>
                      ) : (
                        <>
                          <Heart className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Consume / Drink</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Clairvoyance Scroll */}
                  {(selectedInv.item.id === 'scroll_of_clairvoyance' ||
                    selectedInv.item.specialEffect === 'PEEK_ANY_ROOM') && (
                    <button
                      id="btn-clairvoyance-inv"
                      onClick={() => {
                        onClose();
                        onActivateMapAction?.('CLAIRVOYANCE');
                      }}
                      className="flex-1 py-1.5 bg-[#49275e] hover:bg-[#5f327a] text-purple-100 font-serif font-bold text-xs rounded border border-purple-400 shadow transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-purple-300" />
                      <span>Cast Clairvoyance ➔ Reveal Map Tile</span>
                    </button>
                  )}

                  {/* Dungeon Pitch Torch */}
                  {selectedInv.item.id === 'dungeon_torch' && (
                    <button
                      id="btn-torch-inv"
                      onClick={() => {
                        onClose();
                        onActivateMapAction?.('TORCH');
                      }}
                      className="flex-1 py-1.5 bg-[#5e3818] hover:bg-[#78471e] text-orange-100 font-serif font-bold text-xs rounded border border-orange-500 shadow transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      <span>Light Torch ➔ Reveal Adjacent Room</span>
                    </button>
                  )}

                  {/* Burglar's Spyglass */}
                  {selectedInv.item.id === 'brass_spyglass' && (
                    <button
                      id="btn-spyglass-inv"
                      onClick={() => {
                        onClose();
                        onActivateMapAction?.('SPYGLASS');
                      }}
                      className="flex-1 py-1.5 bg-[#4d3a22] hover:bg-[#634b2b] text-amber-100 font-serif font-bold text-xs rounded border border-amber-400 shadow transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Compass className="w-3.5 h-3.5 text-amber-300" />
                      <span>Use Spyglass ➔ Scout Adjacent Room</span>
                    </button>
                  )}

                  {/* Wall Breaching Tools (Pickaxe / Sledgehammer) */}
                  {selectedInv.item.specialEffect === 'SMASH_WALL' && (
                    <button
                      id="btn-smash-wall-inv"
                      onClick={() => {
                        onClose();
                        onActivateMapAction?.('SMASH_WALL');
                      }}
                      className="flex-1 py-1.5 bg-[#54231b] hover:bg-[#6e2e23] text-amber-200 border border-red-500 rounded text-xs font-serif font-bold flex items-center justify-center gap-1.5 shadow transition-colors cursor-pointer"
                    >
                      <Hammer className="w-3.5 h-3.5 text-amber-400" />
                      <span>Smash Wall ➔ Open Map</span>
                    </button>
                  )}

                  {/* Wall Phasing Potion */}
                  {selectedInv.item.specialEffect === 'PHASE_WALL' && (
                    <button
                      id="btn-phase-wall-inv"
                      onClick={() => {
                        onClose();
                        onActivateMapAction?.('PHASE_WALL');
                      }}
                      className="flex-1 py-1.5 bg-[#3f2252] hover:bg-[#532d6b] text-purple-200 border border-purple-400 rounded text-xs font-serif font-bold flex items-center justify-center gap-1.5 shadow transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                      <span>Phase Wall ➔ Open Map</span>
                    </button>
                  )}

                  {/* Drop / Discard Button */}
                  <button
                    id="btn-drop-selected"
                    onClick={() => handleDropItem(selectedItemIdx!)}
                    className="px-3 py-1.5 bg-[#2d1a16] hover:bg-[#42221b] text-red-300 font-serif text-xs rounded border border-red-800/80 transition-colors cursor-pointer flex items-center justify-center gap-1 shrink-0"
                    title="Discard this item to free 1 backpack slot"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Drop</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
