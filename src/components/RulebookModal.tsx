/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, X, Dices, Shield, Sword, Sparkles, Heart, Compass, Hammer, Eye, Footprints, Crown } from 'lucide-react';

interface RulebookModalProps {
  onClose: () => void;
}

export const RulebookModal: React.FC<RulebookModalProps> = ({ onClose }) => {
  return (
    <div
      id="rulebook-modal-overlay"
      className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
    >
      <div className="bg-[#241a12] border-4 border-[#8c6b45] rounded-xl max-w-2xl w-full p-4 md:p-6 text-stone-200 shadow-2xl relative max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#523924] pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-serif font-black text-[#f5e4c6]">
              Adventurer's Field Manual & Dice Rules
            </h2>
          </div>
          <button
            id="btn-close-rules"
            onClick={onClose}
            className="p-1.5 hover:bg-[#3d2a1c] rounded-md text-stone-400 hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4 font-serif text-xs text-stone-300 leading-relaxed">
          {/* Burgle Bros 4x4 Grid System */}
          <div className="bg-[#19110a] p-3.5 rounded-lg border border-[#442e1d]">
            <h3 className="text-amber-300 font-bold text-sm mb-1.5 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-amber-400" /> 4x4 Floor Grid & Hidden Room Cards
            </h3>
            <p>
              Each dungeon floor is a <strong>4x4 board containing 16 pre-determined room tiles</strong> laid face-down. You begin at the entrance Hearth [1,1]. As you explore, you turn over cards to reveal their perils or treasures.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-stone-300">
              <li>
                <strong>Peeking & Scouting:</strong> Click <Eye className="w-3 h-3 inline text-cyan-400" /> <em>Peek</em> on an adjacent tile or light a <strong>Torch / Spyglass</strong> to flip room cards face-up without stepping onto them!
              </li>
              <li>
                <strong>Clairvoyance:</strong> Cast a <em>Scroll of Clairvoyance</em> to peek at any room tile anywhere on the board.
              </li>
            </ul>
          </div>

          {/* Maze Walls & Breaching */}
          <div className="bg-[#19110a] p-3.5 rounded-lg border border-[#442e1d]">
            <h3 className="text-amber-300 font-bold text-sm mb-1.5 flex items-center gap-1.5">
              <Hammer className="w-4 h-4 text-orange-400" /> Solid Stone Walls & Special Tools
            </h3>
            <p>
              Interior stone walls divide certain chambers, blocking movement and forcing you to navigate through winding corridors:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-stone-300">
              <li>
                <strong>Breaching Walls:</strong> Equip a <em>Dwarven Breaching Sledge</em> or <em>Iron Pickaxe</em> to smash down any wall into a permanent passageway.
              </li>
              <li>
                <strong>Phasing:</strong> Drink a <em>Potion of Phasing</em> or slip on the <em>Ring of the Ethereal Strider</em> to walk straight through solid stone walls.
              </li>
            </ul>
          </div>

          {/* Boss & Stairs Down */}
          <div className="bg-[#19110a] p-3.5 rounded-lg border border-[#442e1d]">
            <h3 className="text-amber-300 font-bold text-sm mb-1.5 flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-yellow-400" /> Map Bosses & Spiral Stairs
            </h3>
            <p>
              Your objective on each floor is to locate the <strong>Boss Chamber [4,4]</strong>. The spiral descent staircase to the next level is locked and guarded by the Floor Boss (Hobgoblin Chieftain, Necromancer Lord, or the Crimson Dragon).
            </p>
            <p className="mt-1.5 text-amber-200">
              You must defeat the Map Boss to unlock the stairs and descend into the deeper abyss!
            </p>
          </div>

          {/* Dice & Combat Rules */}
          <div className="bg-[#19110a] p-3.5 rounded-lg border border-[#442e1d]">
            <h3 className="text-amber-300 font-bold text-sm mb-1.5 flex items-center gap-1.5">
              <Dices className="w-4 h-4 text-amber-400" /> Core Dice Mechanics & Combat
            </h3>
            <div className="bg-[#120b06] p-2 rounded my-1.5 font-mono text-[11px] text-amber-200">
              Total = [1d20 Roll] + [Ability Modifier] + [Equipment Bonus] vs [Target AC / DC]
            </div>
            <p>
              Combat is step-by-step turn-based. Strike with weapons, raise a shield into <strong>Defend Stance (+4 AC)</strong>, cast spells, or drink potions. You cannot leave a monster chamber without attempting to <em>Flee</em> (requiring a DEX check).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
