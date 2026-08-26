/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  X,
  MapPin,
  Heart,
  Sparkles,
  Shield,
  Coins,
  Flame,
  Key,
  Skull,
  AlertTriangle,
  Package,
  Store,
  Tent,
  Sun,
  Crown,
  HelpCircle,
  Footprints,
  Maximize2,
  ChevronLeft,
} from 'lucide-react';
import {
  CombatState,
  DungeonFloor,
  DungeonRoom,
  GameItem,
  HeroCharacter,
  Monster,
} from '../types/game';
import { RoomView } from './RoomView';
import { CombatView } from './CombatView';
import { getStatModifier } from '../utils/dice';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  floor: DungeonFloor;
  room: DungeonRoom;
  hero: HeroCharacter;
  combat: CombatState | null;
  previousRoomId?: string;
  onUpdateHero: (hero: HeroCharacter) => void;
  onUpdateRoom: (room: DungeonRoom) => void;
  onEnterCombat: (room: DungeonRoom) => void;
  onUpdateCombat: (combat: CombatState | null) => void;
  onCombatVictory: (monster: Monster, reward: { xp: number; gold: number; items: GameItem[] }) => void;
  onCombatFlee: () => void;
  onOpenMerchant: () => void;
  onNavigateToRoom: (targetRoomId: string) => void;
  onUseTorch?: (targetRoomId: string) => void;
  onSmashWall: (wallId: string, item: GameItem) => void;
  onPhaseThroughWall: (targetRoomId: string, item?: GameItem) => void;
  onDescendFloor: () => void;
  onOpenInventory?: () => void;
}

export const RoomModal: React.FC<RoomModalProps> = ({
  isOpen,
  onClose,
  floor,
  room,
  hero,
  combat,
  previousRoomId,
  onUpdateHero,
  onUpdateRoom,
  onEnterCombat,
  onUpdateCombat,
  onCombatVictory,
  onCombatFlee,
  onOpenMerchant,
  onNavigateToRoom,
  onUseTorch,
  onSmashWall,
  onPhaseThroughWall,
  onDescendFloor,
  onOpenInventory,
}) => {
  // Listen for Escape key to close modal if not in active attack animation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Compute live hero Armor Class
  let heroAc = 10 + getStatModifier(hero.stats.DEX);
  (Object.values(hero.equipment) as (GameItem | undefined)[]).forEach((item) => {
    if (item?.armorBonus) heroAc += item.armorBonus;
  });

  const hpPercent = Math.max(0, Math.min(100, (hero.currentHp / hero.maxHp) * 100));
  const mpPercent = Math.max(0, Math.min(100, (hero.currentMana / hero.maxMana) * 100));

  // Room status indicator
  const hasMonster = room.monster && room.monster.hp > 0;
  const hasTrap = room.trap && !room.trap.disarmed && !room.trap.triggered;
  const hasChest = room.chest && !room.chest.isOpened;

  const getRoomHeaderIcon = () => {
    if (room.isBossRoom) return <Crown className="w-5 h-5 text-amber-400 animate-pulse" />;
    if (hasMonster) return <Skull className="w-5 h-5 text-red-400 animate-bounce" />;
    if (hasTrap) return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    if (hasChest) return <Package className="w-5 h-5 text-amber-400" />;
    if (room.type === 'MERCHANT') return <Store className="w-5 h-5 text-emerald-400" />;
    if (room.type === 'CAMPFIRE') return <Tent className="w-5 h-5 text-amber-400" />;
    if (room.type === 'SHRINE') return <Sun className="w-5 h-5 text-cyan-400" />;
    if (room.type === 'SECRET') return <HelpCircle className="w-5 h-5 text-purple-400" />;
    if (room.hasStairs) return <Footprints className="w-5 h-5 text-blue-400" />;
    return <MapPin className="w-5 h-5 text-[#e5b967]" />;
  };

  return (
    <div
      id="room-modal-backdrop"
      className="fixed inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-fadeIn"
    >
      <div
        id="room-modal-container"
        className="bg-[#1c130c] border-2 border-[#785536] rounded-2xl w-full max-w-5xl shadow-[0_0_50px_rgba(0,0,0,0.85)] max-h-[92vh] flex flex-col overflow-hidden my-auto"
      >
        {/* Sticky Top Header Bar with Chamber Details & Hero Quick HUD */}
        <div className="bg-[#150e08] border-b-2 border-[#523821] p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 shadow-md">
          {/* Chamber Title & Location */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#2d1c10] rounded-lg border border-[#6b4725] text-amber-300 shrink-0">
              {getRoomHeaderIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-[#24150b] text-amber-400 px-2 py-0.5 rounded border border-[#523319] font-bold">
                  Tile [{room.gridX + 1},{room.gridY + 1}]
                </span>
                <h2 className="text-base sm:text-lg font-serif font-black text-[#f5e4c6] leading-tight">
                  {combat ? `Combat: ${combat.monster.name}` : room.title}
                </h2>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-400 font-serif">
                <span>Floor {floor.floorNumber}: {floor.floorName}</span>
                <span>•</span>
                <span className="capitalize text-amber-300/90 font-mono text-[11px]">
                  {room.isBossRoom
                    ? 'Floor Boss Chamber'
                    : hasMonster
                    ? 'Hostile Threat'
                    : hasTrap
                    ? 'Hazard Trap'
                    : room.isCleared
                    ? 'Cleared Chamber'
                    : room.type.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Hero Quick HUD + Close Button */}
          <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap sm:flex-nowrap">
            {/* Quick Stats Pill Strip */}
            <div className="flex items-center gap-2 bg-[#24170d] px-3 py-1.5 rounded-lg border border-[#4d321b] text-xs font-mono">
              {/* HP */}
              <div className="flex items-center gap-1.5" title="Hero Health Points">
                <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500/30" />
                <span className="font-bold text-red-300">
                  {hero.currentHp}/{hero.maxHp}
                </span>
                <div className="w-12 h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-800 hidden sm:block">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
                    style={{ width: `${hpPercent}%` }}
                  />
                </div>
              </div>

              <div className="w-px h-3.5 bg-stone-700 mx-1" />

              {/* Mana */}
              <div className="flex items-center gap-1.5" title="Hero Mana / Arcane Energy">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-bold text-cyan-300">
                  {hero.currentMana}/{hero.maxMana}
                </span>
              </div>

              <div className="w-px h-3.5 bg-stone-700 mx-1" />

              {/* AC */}
              <div className="flex items-center gap-1" title="Armor Class">
                <Shield className="w-3.5 h-3.5 text-stone-300" />
                <span className="font-bold text-stone-200">{heroAc}</span>
              </div>

              <div className="w-px h-3.5 bg-stone-700 mx-1 hidden sm:block" />

              {/* Gold */}
              <div className="hidden sm:flex items-center gap-1 text-amber-300" title="Collected Gold">
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                <span>{hero.gold}</span>
              </div>
            </div>

            {/* Close / Return to Map Button */}
            <button
              id="btn-close-room-modal"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-[#3b2314] hover:bg-[#52331d] text-amber-200 hover:text-amber-100 border border-[#7a4e28] rounded-lg text-xs font-serif font-bold flex items-center gap-1.5 cursor-pointer shadow transition-all hover:scale-105 shrink-0"
              title="Close Chamber pop-up and return to Dungeon Map overview (Esc)"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Return to Map</span>
              <span className="text-[10px] text-stone-400 font-mono hidden sm:inline">(Esc)</span>
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body: Combat View or Room View */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {combat ? (
            <CombatView
              hero={hero}
              combat={combat}
              onUpdateHero={onUpdateHero}
              onUpdateCombat={onUpdateCombat}
              onCombatVictory={onCombatVictory}
              onCombatFlee={onCombatFlee}
            />
          ) : (
            <RoomView
              floor={floor}
              room={room}
              hero={hero}
              previousRoomId={previousRoomId}
              onUpdateHero={onUpdateHero}
              onUpdateRoom={onUpdateRoom}
              onEnterCombat={onEnterCombat}
              onOpenMerchant={onOpenMerchant}
              onNavigateToRoom={onNavigateToRoom}
              onUseTorch={onUseTorch}
              onSmashWall={onSmashWall}
              onPhaseThroughWall={onPhaseThroughWall}
              onDescendFloor={onDescendFloor}
              onOpenInventory={onOpenInventory}
              onClose={onClose}
            />
          )}
        </div>

        {/* Modal Footer Note & Bottom Return to Map Action */}
        <div className="bg-[#140d08] border-t border-[#422c19] px-4 py-2.5 flex items-center justify-between text-xs font-serif text-stone-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-stone-300">
              {combat
                ? 'Combat in progress. Defeat the enemy or attempt a tactical escape.'
                : hasMonster
                ? 'Hostile beast blocking further passage through doors.'
                : hasTrap
                ? 'Active trap mechanism. Disarm or trigger to clear passage.'
                : 'Chamber is secure. You may explore, search, or move through open corridors.'}
            </span>
          </div>

          <button
            id="btn-footer-return-map"
            onClick={onClose}
            className="text-[11px] text-amber-300/90 hover:text-amber-100 underline underline-offset-2 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Dungeon Map Overview ➔</span>
          </button>
        </div>
      </div>
    </div>
  );
};
