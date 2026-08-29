/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BookOpen,
  X,
  Dices,
  Shield,
  Sword,
  Sparkles,
  Heart,
  Compass,
  Hammer,
  Eye,
  Footprints,
  Crown,
  Zap,
  Flame,
  Award,
  AlertTriangle,
  Coins,
  RefreshCw,
  Scroll,
} from 'lucide-react';
import { DieShape } from './DieShape';

interface RulebookModalProps {
  onClose: () => void;
}

type RuleTab = 'dice' | 'fate' | 'dungeon' | 'combat' | 'loot_classes';

export const RulebookModal: React.FC<RulebookModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<RuleTab>('dice');

  return (
    <div
      id="rulebook-modal-overlay"
      className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md animate-fade-in"
    >
      <div className="bg-[#1e150f] border-2 sm:border-4 border-[#8c6b45] rounded-2xl max-w-3xl w-full p-4 sm:p-6 text-stone-200 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#523924] pb-3 mb-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 rounded-lg bg-[#302115] border border-amber-600/50 text-amber-400">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-mono text-amber-400/80 uppercase tracking-wide">
                Adventurer's Field Guide
              </span>
              <h2 className="text-lg sm:text-xl font-serif font-black text-[#f5e4c6] leading-tight">
                Complete Rules & Codex
              </h2>
            </div>
          </div>
          <button
            id="btn-close-rules"
            onClick={onClose}
            className="p-1.5 hover:bg-[#3d2a1c] rounded-lg text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2 mb-3 border-b border-stone-800 shrink-0 no-scrollbar">
          <button
            id="tab-rule-dice"
            onClick={() => setActiveTab('dice')}
            className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'dice'
                ? 'bg-amber-600 text-stone-950 shadow-md'
                : 'bg-stone-900/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <Dices className="w-3.5 h-3.5" />
            Dice & Resolution
          </button>

          <button
            id="tab-rule-fate"
            onClick={() => setActiveTab('fate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'fate'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-stone-900/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Fate Rerolls
          </button>

          <button
            id="tab-rule-dungeon"
            onClick={() => setActiveTab('dungeon')}
            className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'dungeon'
                ? 'bg-emerald-600 text-stone-950 shadow-md'
                : 'bg-stone-900/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            4x4 Grid & Walls
          </button>

          <button
            id="tab-rule-combat"
            onClick={() => setActiveTab('combat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'combat'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-stone-900/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <Sword className="w-3.5 h-3.5" />
            Combat & Actions
          </button>

          <button
            id="tab-rule-loot"
            onClick={() => setActiveTab('loot_classes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'loot_classes'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'bg-stone-900/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            Vault Loot & Classes
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 font-serif text-xs text-stone-300 leading-relaxed">
          {/* TAB 1: DICE & RESOLUTION */}
          {activeTab === 'dice' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="bg-[#140e09] p-4 rounded-xl border border-[#3e2b1c]">
                <h3 className="text-amber-300 font-bold text-sm mb-2 flex items-center gap-2">
                  <Dices className="w-4 h-4 text-amber-400" />
                  The 1d20 Resolution System
                </h3>
                <p>
                  Every challenge in the dungeon—attacking monsters, dodging swinging blades, picking ancient locks, or resisting arcane hexes—is determined by a fair d20 dice roll.
                </p>
                <div className="bg-[#0c0805] p-3 rounded-lg my-2.5 font-mono text-[11px] sm:text-xs text-amber-200 border border-[#382618]">
                  <strong>Total Check</strong> = [1d20 Roll] + [Stat Modifier] + [Equipment Bonuses] vs [Target AC / DC]
                </div>
                <p>
                  If your total equals or exceeds the target’s <strong>Armor Class (AC)</strong> or the challenge's <strong>Difficulty Class (DC)</strong>, the action succeeds!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Natural 20 */}
                <div className="bg-[#140e09] p-3.5 rounded-xl border border-amber-500/40">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h4 className="font-bold text-amber-300 text-xs uppercase tracking-wide">
                      Natural 20 (Critical Hit)
                    </h4>
                  </div>
                  <p className="text-stone-300 text-[11px]">
                    Rolling a <strong>20</strong> on a d20 attack is an automatic strike regardless of enemy AC. It deals <strong>Maximum Base Weapon Damage</strong> plus an extra weapon damage die roll!
                  </p>
                </div>

                {/* Natural 1 */}
                <div className="bg-[#140e09] p-3.5 rounded-xl border border-red-800/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <h4 className="font-bold text-red-300 text-xs uppercase tracking-wide">
                      Natural 1 (Critical Fumble)
                    </h4>
                  </div>
                  <p className="text-stone-300 text-[11px]">
                    Rolling a <strong>1</strong> on a d20 is an automatic failure. On tactical escape attempts, a fumble stumbles you, forfeiting your next turn while scrambling to your feet. <em>Fate cannot avert a Natural 1 fumble!</em>
                  </p>
                </div>
              </div>

              <div className="bg-[#140e09] p-3.5 rounded-xl border border-[#3e2b1c]">
                <h4 className="text-amber-300 font-bold text-xs mb-2 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  Visual Polyhedral Dice Suite
                </h4>
                <p className="text-[11px] text-stone-300 mb-2">
                  All rolls render authentic geometric polyhedral dice (d4, d6, d8, d10, d12, d20, d100) with visual roll animations that remain clearly visible on results screens.
                </p>
                <div className="flex items-center justify-center gap-2 sm:gap-4 py-2 bg-[#0d0906] rounded-lg border border-[#2b1d12]">
                  <DieShape sides={4} value={4} size="sm" />
                  <DieShape sides={6} value={6} size="sm" />
                  <DieShape sides={8} value={8} size="sm" />
                  <DieShape sides={10} value={10} size="sm" />
                  <DieShape sides={12} value={12} size="sm" />
                  <DieShape sides={20} value={20} size="sm" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FATE REROLL TOKENS */}
          {activeTab === 'fate' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="bg-gradient-to-br from-[#1a0e23] via-[#140e09] to-[#1a0e23] p-4 rounded-xl border-2 border-purple-500/50">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-5 h-5 text-purple-400" />
                  <h3 className="text-purple-300 font-bold text-sm">
                    Fate Reroll Tokens & Destiny
                  </h3>
                </div>
                <p className="text-stone-300">
                  Fate Tokens represent a hero's uncanny knack for cheating death. When a roll goes wrong, you can expend 1 Fate Token to immediately re-roll the die and take the new result!
                </p>
              </div>

              <div className="bg-[#140e09] p-3.5 rounded-xl border border-[#3e2b1c] space-y-2">
                <h4 className="text-amber-300 font-bold text-xs">
                  Where Can Fate Rerolls Be Used?
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-[11px] text-stone-300">
                  <li>
                    <strong className="text-purple-300">Missed Weapon Attacks:</strong> Reroll your attack d20 before the monster counter-attacks.
                  </li>
                  <li>
                    <strong className="text-purple-300">Failed Tactical Escapes:</strong> Re-roll a failed flee check to safely retreat from deadly foes.
                  </li>
                  <li>
                    <strong className="text-purple-300">Action Challenge Hazards:</strong> Reroll failed trap disarms, lockpicking checks, chasm leaps, and glyph deciphering.
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#140e09] p-3 rounded-xl border border-stone-700">
                  <h4 className="font-bold text-amber-300 text-xs mb-1">
                    Starting Fate Allotment
                  </h4>
                  <p className="text-[11px] text-stone-300">
                    • <strong>Standard Classes</strong> (Warrior, Paladin, Wizard, Cleric, Ranger) start with <strong>1 Fate Token</strong>.
                    <br />• <strong>Rogue</strong> starts with <strong>2 Fate Tokens</strong>.
                  </p>
                </div>

                <div className="bg-[#140e09] p-3 rounded-xl border border-stone-700">
                  <h4 className="font-bold text-amber-300 text-xs mb-1">
                    How to Find More Fate Tokens
                  </h4>
                  <p className="text-[11px] text-stone-300">
                    The elusive <strong>Dice of Fate</strong> relic is not sold in shops—it can only be discovered as a rare prize in <strong>Vault Chests</strong> (Roll #12 on the d20 Vault Loot Table).
                  </p>
                </div>
              </div>

              <div className="p-3 bg-red-950/40 rounded-xl border border-red-900/60 flex items-start gap-2.5 text-[11px] text-red-200">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Critical Fumble Exemption:</strong> Fate cannot alter a Natural 1 Critical Fumble. When destiny collapses completely, no reroll is permitted.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 4x4 GRID & WALLS */}
          {activeTab === 'dungeon' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="bg-[#140e09] p-4 rounded-xl border border-[#3e2b1c]">
                <h3 className="text-amber-300 font-bold text-sm mb-2 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-400" />
                  4x4 Dungeon Grid & Hidden Chamber Cards
                </h3>
                <p>
                  Each dungeon floor is a <strong>4x4 board containing 16 pre-determined room tiles</strong> laid face-down. You begin at the entrance Hearth [1,1]. Step onto cards to reveal their perils, treasures, merchants, and shrines.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#140e09] p-3.5 rounded-xl border border-[#3e2b1c]">
                  <h4 className="text-cyan-300 font-bold text-xs mb-1.5 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    Chamber Scouting & Vision
                  </h4>
                  <p className="text-[11px] text-stone-300">
                    Chambers remain dark and hidden until scouted. Light a <strong>Torch</strong> to reveal an adjacent room, use the reusable <strong>Burglar's Spyglass</strong> to scout without torches, or cast a <strong>Scroll of Clairvoyance</strong> to uncover any room anywhere on the 4x4 grid!
                  </p>
                </div>

                <div className="bg-[#140e09] p-3.5 rounded-xl border border-[#3e2b1c]">
                  <h4 className="text-orange-300 font-bold text-xs mb-1.5 flex items-center gap-1.5">
                    <Hammer className="w-4 h-4 text-orange-400" />
                    Wall Breaching & Phasing
                  </h4>
                  <p className="text-[11px] text-stone-300">
                    Interior stone walls block passage. Smash them down permanently with an <strong>Iron Pickaxe</strong> or <strong>Dwarven Breaching Sledge</strong>, or phase through them using <strong>Potion of Phasing</strong> or the <strong>Ring of the Ethereal Strider</strong>.
                  </p>
                </div>
              </div>

              <div className="bg-[#140e09] p-3.5 rounded-xl border border-[#3e2b1c] space-y-2">
                <h4 className="text-yellow-300 font-bold text-xs flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  Boss Chambers & Spiral Stairs
                </h4>
                <p className="text-[11px] text-stone-300">
                  The spiral descent staircase is located at <strong>Chamber [4,4]</strong>, locked and guarded by the Floor Boss (Hobgoblin Chieftain on F1, Necromancer Lord on F2, Crimson Dragon on F3). Defeating the boss unlocks the stairs to descend.
                </p>
              </div>

              <div className="bg-[#140e09] p-3.5 rounded-xl border border-[#3e2b1c]">
                <h4 className="text-emerald-300 font-bold text-xs mb-1 flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-emerald-400" />
                  Hearth Sanctuary & Healing
                </h4>
                <p className="text-[11px] text-stone-300">
                  Descending the stairs to a new dungeon floor triggers the <strong>Entrance Hearth Sanctuary</strong>, completely replenishing your <strong>HP and Mana</strong>. Mid-floor healing requires rations, potions, or divine shrines.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: COMBAT & ACTIONS */}
          {activeTab === 'combat' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="bg-[#140e09] p-4 rounded-xl border border-[#3e2b1c]">
                <h3 className="text-red-300 font-bold text-sm mb-2 flex items-center gap-2">
                  <Sword className="w-4 h-4 text-red-400" />
                  Turn-Based Combat & Energy Management
                </h3>
                <p>
                  Combat is fully turn-based. Each action consumes <strong>Energy Points (EP / Mana)</strong>. Manage your stamina wisely between physical strikes, defensive stances, magical spells, and retreat checks.
                </p>
              </div>

              <div className="space-y-2">
                <div className="bg-[#140e09] p-3 rounded-xl border border-stone-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 text-xs">1. Standard Weapon Strike</span>
                    <span className="font-mono text-[10px] text-amber-400 bg-stone-900 px-1.5 py-0.5 rounded border border-stone-700">1 EP</span>
                  </div>
                  <p className="text-[11px] text-stone-300 mt-1">
                    Roll 1d20 + Attack Stat vs Monster AC. On hit, roll weapon damage dice + modifiers minus monster Damage Reduction (DR).
                  </p>
                </div>

                <div className="bg-[#140e09] p-3 rounded-xl border border-stone-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300 text-xs">2. Class Spells & Powers</span>
                    <span className="font-mono text-[10px] text-cyan-400 bg-stone-900 px-1.5 py-0.5 rounded border border-stone-700">2-3 EP</span>
                  </div>
                  <p className="text-[11px] text-stone-300 mt-1">
                    Unleash potent class specials like <em>Fireball</em>, <em>Smite Evil</em>, <em>Power Cleave</em>, <em>Holy Radiance</em>, <em>Shadow Ambush</em>, or <em>Aimed Volley</em>.
                  </p>
                </div>

                <div className="bg-[#140e09] p-3 rounded-xl border border-stone-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-300 text-xs">3. Defend Guard & Counter-Attack</span>
                    <span className="font-mono text-[10px] text-blue-400 bg-stone-900 px-1.5 py-0.5 rounded border border-blue-800">5 EP</span>
                  </div>
                  <p className="text-[11px] text-stone-300 mt-1">
                    Brace your guard for 5 EP, granting <strong>+4 Armor Class (AC)</strong>, absorbing incoming damage, and automatically launching a class-specific <strong>Counter-Attack</strong> retaliatory strike when the monster attacks!
                  </p>
                </div>

                <div className="bg-[#140e09] p-3 rounded-xl border border-stone-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 text-xs">4. Catch Breath (Exhaustion Recovery)</span>
                    <span className="font-mono text-[10px] text-emerald-400 bg-stone-900 px-1.5 py-0.5 rounded border border-emerald-700 font-bold">+2 EP (0 Cost)</span>
                  </div>
                  <p className="text-[11px] text-stone-300 mt-1">
                    When your energy falls below 5 EP, <strong>Catch Breath</strong> automatically replaces the Counter-Attack option. It costs <strong>0 EP</strong>, recovers <strong>+2 Energy</strong>, grants <strong>+4 AC</strong>, and absorbs damage, focusing purely on defense without dealing counter damage.
                  </p>
                </div>

                <div className="bg-[#140e09] p-3 rounded-xl border border-stone-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 text-xs">5. Tactical Escape (Flee)</span>
                    <span className="font-mono text-[10px] text-amber-400 bg-stone-900 px-1.5 py-0.5 rounded border border-stone-700">0 EP (Free)</span>
                  </div>
                  <p className="text-[11px] text-stone-300 mt-1">
                    Roll 1d20 + DEX/LCK vs <strong>Escape DC (10 + Monster Level)</strong>. Costs 0 EP. Success retreats you safely to the previous chamber. A Natural 1 fumble stumbles you and forfeits your next turn!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: VAULT LOOT & CLASSES */}
          {activeTab === 'loot_classes' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="bg-[#140e09] p-4 rounded-xl border border-[#3e2b1c]">
                <h3 className="text-amber-300 font-bold text-sm mb-2 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  20-Tier Vault Loot System (d20)
                </h3>
                <p className="text-[11px] text-stone-300 mb-2">
                  Every chest in the dungeon rolls on a fully distinct 20-tier loot table, with 1 unique reward per d20 outcome scaling from 5 to 150 gold value:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[10px] text-stone-300">
                  <div className="p-1.5 bg-[#0c0805] rounded border border-stone-800">1: Copper Pouch (5g)</div>
                  <div className="p-1.5 bg-[#0c0805] rounded border border-stone-800">2: Minor Potion (10g)</div>
                  <div className="p-1.5 bg-[#0c0805] rounded border border-stone-800">3: Iron Dagger (15g)</div>
                  <div className="p-1.5 bg-[#0c0805] rounded border border-stone-800">4: Leather Boots (20g)</div>
                  <div className="p-1.5 bg-[#0c0805] rounded border border-stone-800">5: Wooden Buckler (25g)</div>
                  <div className="p-1.5 bg-[#0c0805] rounded border border-stone-800">6: Silver Coinage (30g)</div>
                  <div className="p-1.5 bg-[#0c0805] rounded border border-stone-800">7: Greater Potion (35g)</div>
                  <div className="p-1.5 bg-[#0c0805] rounded border border-stone-800">8: Reinforced Shield (40g)</div>
                  <div className="p-1.5 bg-[#0c0805] rounded border border-stone-800">9: Steel Broadsword (45g)</div>
                  <div className="p-1.5 bg-[#0c0805] rounded border border-stone-800">10: Chainmail Vest (50g)</div>
                  <div className="p-1.5 bg-[#0c0805] rounded border border-stone-800">11: Ring of Luck (55g)</div>
                  <div className="p-1.5 bg-[#0c0805] rounded border border-purple-900/60 text-purple-300 font-bold">12: Dice of Fate (60g)</div>
                  <div className="p-1.5 bg-[#0c0805] rounded border border-stone-800">13: Elixir of Vigor (70g)</div>
                  <div className="p-1.5 bg-[#0c0805] rounded border border-stone-800">14: Boots of Swiftness (80g)</div>
                  <div className="p-1.5 bg-[#0c0805] rounded border border-stone-800">15: Amulet of Warding (90g)</div>
                  <div className="p-1.5 bg-[#0c0805] rounded border border-stone-800">16: Breaching Sledge (100g)</div>
                  <div className="p-1.5 bg-[#0c0805] rounded border border-stone-800">17: Mythril Hauberk (115g)</div>
                  <div className="p-1.5 bg-[#0c0805] rounded border border-stone-800">18: Sunforged Blade (130g)</div>
                  <div className="p-1.5 bg-[#0c0805] rounded border border-stone-800">19: Ring of Titans (140g)</div>
                  <div className="p-1.5 bg-[#0c0805] rounded border border-amber-500/80 text-amber-300 font-bold">20: King's Hoard (150g)</div>
                </div>
              </div>

              <div className="bg-[#140e09] p-3.5 rounded-xl border border-[#3e2b1c]">
                <h4 className="text-amber-300 font-bold text-xs mb-2">
                  Hero Classes & Starting Traits
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-[#0c0805] rounded border border-stone-800">
                    <strong className="text-amber-200">Warrior:</strong> +3 STR, +2 CON • Cleaving Melee • 1 Fate Token
                  </div>
                  <div className="p-2 bg-[#0c0805] rounded border border-stone-800">
                    <strong className="text-amber-200">Paladin:</strong> +3 STR, +2 WIS • Smite & Heavy Armor • 1 Fate Token
                  </div>
                  <div className="p-2 bg-[#0c0805] rounded border border-stone-800">
                    <strong className="text-amber-200">Wizard:</strong> +3 INT, +2 WIS • Arcane Spells • 1 Fate Token
                  </div>
                  <div className="p-2 bg-[#0c0805] rounded border border-stone-800">
                    <strong className="text-amber-200">Cleric:</strong> +3 WIS, +2 CON • Healing & Turn Undead • 1 Fate Token
                  </div>
                  <div className="p-2 bg-[#0c0805] rounded border border-purple-900/60">
                    <strong className="text-purple-300">Rogue:</strong> +3 DEX, +2 LCK • Spyglass & 1 Reusable Lockpick Kit • <span className="text-amber-300 font-bold">2 Fate Tokens</span>
                  </div>
                  <div className="p-2 bg-[#0c0805] rounded border border-stone-800">
                    <strong className="text-amber-200">Ranger:</strong> +3 DEX, +2 WIS • Ranged Volleys • 1 Fate Token
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#523924] pt-3 mt-3 flex items-center justify-between text-xs text-stone-400 font-mono shrink-0">
          <span>Rulebook v2.4 • All rolls are fair & transparent</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

