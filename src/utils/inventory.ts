/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameItem, HeroCharacter, InventoryItem } from '../types/game';

/**
 * Ensures:
 * 1. Dice of Fate / Fate Reroll Tokens are separated out into hero.rerollTokens (never in backpack slots).
 * 2. Every single physical item takes up exactly 1 inventory slot.
 * 3. Supply counters (rations, lockpicks, torches) accurately mirror backpack contents.
 */
export function syncHeroSupplies(hero: HeroCharacter): void {
  if (!hero || !hero.inventory) return;

  // Migrate any legacy dice_of_fate items out of backpack into hero.rerollTokens
  let migratedTokens = 0;
  const filteredInventory: InventoryItem[] = [];

  for (const inv of hero.inventory) {
    if (inv.item.id === 'dice_of_fate') {
      migratedTokens += inv.quantity || 1;
    } else if (inv.quantity && inv.quantity > 1) {
      // Unstack any multi-quantity items so each item occupies 1 individual slot
      for (let i = 0; i < inv.quantity; i++) {
        filteredInventory.push({ ...inv, quantity: 1 });
      }
    } else {
      filteredInventory.push({ ...inv, quantity: 1 });
    }
  }

  if (migratedTokens > 0) {
    hero.rerollTokens = (hero.rerollTokens || 0) + migratedTokens;
  }

  hero.inventory = filteredInventory;

  // Derive supply counters strictly from individual physical items in backpack
  let totalRations = 0;
  let totalLockpicks = 0;
  let totalTorches = 0;

  for (const inv of hero.inventory) {
    if (inv.item.id === 'dungeon_ration') {
      totalRations += 1;
    } else if (inv.item.id === 'iron_lockpick') {
      totalLockpicks += 1;
    } else if (inv.item.id === 'dungeon_torch') {
      totalTorches += 1;
    }
  }

  hero.rations = totalRations;
  hero.lockpicks = totalLockpicks;
  hero.torches = totalTorches;
}

/**
 * Returns the total count of an item ID in the hero's backpack
 */
export function getItemCount(hero: HeroCharacter, itemId: string): number {
  if (!hero || !hero.inventory) return 0;
  return hero.inventory.filter((inv) => inv.item.id === itemId).length;
}

/**
 * Adds items to the hero's backpack inventory.
 * Each item occupies exactly 1 slot.
 * Dice of Fate tokens do not occupy backpack slots and are routed to hero.rerollTokens.
 */
export function addItemToHero(
  hero: HeroCharacter,
  item: GameItem,
  quantity = 1
): { success: boolean; message: string; addedCount: number } {
  if (!hero || !item) return { success: false, message: 'Invalid item or hero', addedCount: 0 };

  // Dice of Fate is a special currency / token (separated from backpack slots)
  if (item.id === 'dice_of_fate') {
    hero.rerollTokens = (hero.rerollTokens || 0) + quantity;
    return {
      success: true,
      message: `+${quantity} Fate Reroll Token${quantity > 1 ? 's' : ''} added to your purse!`,
      addedCount: quantity,
    };
  }

  const freeSlots = Math.max(0, hero.maxInventorySlots - hero.inventory.length);
  if (freeSlots <= 0) {
    return {
      success: false,
      message: `Backpack is full! (${hero.inventory.length}/${hero.maxInventorySlots} slots used). Drop an item first.`,
      addedCount: 0,
    };
  }

  const toAdd = Math.min(quantity, freeSlots);
  for (let i = 0; i < toAdd; i++) {
    hero.inventory.push({ item, quantity: 1 });
  }

  syncHeroSupplies(hero);

  if (toAdd < quantity) {
    return {
      success: true,
      message: `Added ${toAdd}x ${item.name}. Backpack reached full capacity (${hero.maxInventorySlots}/${hero.maxInventorySlots} slots)!`,
      addedCount: toAdd,
    };
  }

  return {
    success: true,
    message: `Added ${toAdd > 1 ? `${toAdd}x ` : ''}${item.name} into backpack.`,
    addedCount: toAdd,
  };
}

/**
 * Removes an item or quantity of individual items from the hero's backpack
 */
export function removeItemFromHero(
  hero: HeroCharacter,
  itemId: string,
  quantity = 1
): boolean {
  if (!hero || !hero.inventory) return false;

  let removed = 0;
  for (let i = hero.inventory.length - 1; i >= 0 && removed < quantity; i--) {
    if (hero.inventory[i].item.id === itemId) {
      hero.inventory.splice(i, 1);
      removed++;
    }
  }

  syncHeroSupplies(hero);
  return removed > 0;
}

/**
 * Consumes 1 ration from the backpack to restore HP
 */
export function consumeHeroRation(hero: HeroCharacter): { success: boolean; hpHealed: number } {
  const hasRation = removeItemFromHero(hero, 'dungeon_ration', 1);
  if (!hasRation) return { success: false, hpHealed: 0 };

  const hpHealed = 8;
  hero.currentHp = Math.min(hero.maxHp, hero.currentHp + hpHealed);
  return { success: true, hpHealed };
}

/**
 * Consumes 1 torch from the backpack
 */
export function consumeHeroTorch(hero: HeroCharacter): boolean {
  return removeItemFromHero(hero, 'dungeon_torch', 1);
}

/**
 * Consumes 1 Fate Reroll Token (currency)
 */
export function consumeHeroFateToken(hero: HeroCharacter): boolean {
  if (hero.rerollTokens > 0) {
    hero.rerollTokens -= 1;
    return true;
  }
  return false;
}

/**
 * Drops an item completely from backpack inventory to free up 1 slot space
 */
export function dropItemFromHero(hero: HeroCharacter, inventoryIdx: number): boolean {
  if (!hero || !hero.inventory || inventoryIdx < 0 || inventoryIdx >= hero.inventory.length) {
    return false;
  }
  hero.inventory.splice(inventoryIdx, 1);
  syncHeroSupplies(hero);
  return true;
}

