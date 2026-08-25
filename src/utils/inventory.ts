/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameItem, HeroCharacter, InventoryItem } from '../types/game';
import { ITEMS_DATABASE } from '../data/items';

/**
 * Ensures all supplies (rations, lockpicks, torches, fate tokens) exist as tangible
 * items inside the hero's backpack inventory and that numeric counters stay in sync.
 */
export function syncHeroSupplies(hero: HeroCharacter): void {
  if (!hero || !hero.inventory) return;

  // 1. Back-populate if hero has legacy numeric values but missing inventory entries
  if (hero.rations > 0 && !hero.inventory.some((i) => i.item.id === 'dungeon_ration')) {
    const rationItem = ITEMS_DATABASE['dungeon_ration'];
    if (rationItem) hero.inventory.push({ item: rationItem, quantity: hero.rations });
  }

  if (hero.lockpicks > 0 && !hero.inventory.some((i) => i.item.id === 'iron_lockpick')) {
    const pickItem = ITEMS_DATABASE['iron_lockpick'];
    if (pickItem) hero.inventory.push({ item: pickItem, quantity: hero.lockpicks });
  }

  if (hero.torches > 0 && !hero.inventory.some((i) => i.item.id === 'dungeon_torch')) {
    const torchItem = ITEMS_DATABASE['dungeon_torch'];
    if (torchItem) hero.inventory.push({ item: torchItem, quantity: hero.torches });
  }

  if (hero.rerollTokens > 0 && !hero.inventory.some((i) => i.item.id === 'dice_of_fate')) {
    const fateItem = ITEMS_DATABASE['dice_of_fate'];
    if (fateItem) hero.inventory.push({ item: fateItem, quantity: hero.rerollTokens });
  }

  // 2. Derive hero supply counters from the backpack inventory
  let totalRations = 0;
  let totalLockpicks = 0;
  let totalTorches = 0;
  let totalFateTokens = 0;

  for (const inv of hero.inventory) {
    if (inv.item.id === 'dungeon_ration') {
      totalRations += inv.quantity;
    } else if (inv.item.id === 'iron_lockpick') {
      totalLockpicks += inv.quantity;
    } else if (inv.item.id === 'dungeon_torch') {
      totalTorches += inv.quantity;
    } else if (inv.item.id === 'dice_of_fate') {
      totalFateTokens += inv.quantity;
    }
  }

  hero.rations = totalRations;
  hero.lockpicks = totalLockpicks;
  hero.torches = totalTorches;
  hero.rerollTokens = totalFateTokens;
}

/**
 * Returns the total count of an item ID in the hero's backpack
 */
export function getItemCount(hero: HeroCharacter, itemId: string): number {
  if (!hero || !hero.inventory) return 0;
  return hero.inventory
    .filter((inv) => inv.item.id === itemId)
    .reduce((sum, inv) => sum + inv.quantity, 0);
}

/**
 * Adds an item to the hero's backpack inventory taking up slot space.
 * Stackable items (potions, scrolls, supplies, tools, treasures) stack into existing slots.
 */
export function addItemToHero(
  hero: HeroCharacter,
  item: GameItem,
  quantity = 1
): { success: boolean; message: string } {
  if (!hero || !item) return { success: false, message: 'Invalid item or hero' };

  const isStackable = ['potion', 'scroll', 'tool', 'treasure'].includes(item.type);
  const existing = isStackable ? hero.inventory.find((inv) => inv.item.id === item.id) : null;

  if (existing) {
    existing.quantity += quantity;
    syncHeroSupplies(hero);
    return { success: true, message: `Added ${quantity}x ${item.name} to backpack stack.` };
  }

  // Check if backpack is full
  if (hero.inventory.length >= hero.maxInventorySlots) {
    return {
      success: false,
      message: `Backpack is full! (${hero.inventory.length}/${hero.maxInventorySlots} slots used). Drop an item first.`,
    };
  }

  hero.inventory.push({ item, quantity });
  syncHeroSupplies(hero);
  return { success: true, message: `Added ${item.name} into backpack.` };
}

/**
 * Removes an item or quantity of items from the hero's backpack
 */
export function removeItemFromHero(
  hero: HeroCharacter,
  itemId: string,
  quantity = 1
): boolean {
  if (!hero || !hero.inventory) return false;

  const idx = hero.inventory.findIndex((inv) => inv.item.id === itemId);
  if (idx === -1) return false;

  const inv = hero.inventory[idx];
  if (inv.quantity > quantity) {
    inv.quantity -= quantity;
  } else {
    hero.inventory.splice(idx, 1);
  }

  syncHeroSupplies(hero);
  return true;
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
 * Consumes 1 Fate Reroll Token from the backpack
 */
export function consumeHeroFateToken(hero: HeroCharacter): boolean {
  return removeItemFromHero(hero, 'dice_of_fate', 1);
}

/**
 * Drops an item completely from backpack inventory to free up slot space
 */
export function dropItemFromHero(hero: HeroCharacter, inventoryIdx: number): boolean {
  if (!hero || !hero.inventory || inventoryIdx < 0 || inventoryIdx >= hero.inventory.length) {
    return false;
  }
  hero.inventory.splice(inventoryIdx, 1);
  syncHeroSupplies(hero);
  return true;
}
