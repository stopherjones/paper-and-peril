/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Compass,
  Flame,
  Skull,
  Package,
  Store,
  Tent,
  Sun,
  AlertTriangle,
  HelpCircle,
  Footprints,
  Eye,
  Hammer,
  Sparkles,
  ShieldAlert,
  Crown,
  ChevronRight,
  Info,
  Maximize2,
  CheckCircle2,
  ArrowDownCircle,
} from 'lucide-react';
import { DungeonFloor, DungeonRoom, GameItem, HeroCharacter, RoomType } from '../types/game';
import { sounds } from '../utils/audio';
import {
  areCoordinatesAdjacent,
  hasWallBetween,
  isBossCandidatePosition,
  isRoomPassedThrough,
  getRoomDisplayInfo,
} from '../utils/generator';

interface DungeonMapProps {
  floor: DungeonFloor;
  currentRoomId: string;
  hero: HeroCharacter;
  onSelectAdjacentRoom: (targetRoomId: string) => void;
  onSmashWall: (wallId: string, item: GameItem) => void;
  onPhaseThroughWall: (targetRoomId: string, item?: GameItem) => void;
  onUseTorch: (targetRoomId: string) => void;
  onUseClairvoyance: (targetRoomId: string) => void;
  onOpenCurrentRoom?: () => void;
  onDescendFloor?: () => void;
}

export const DungeonMap: React.FC<DungeonMapProps> = ({
  floor,
  currentRoomId,
  hero,
  onSelectAdjacentRoom,
  onSmashWall,
  onPhaseThroughWall,
  onUseTorch,
  onUseClairvoyance,
  onOpenCurrentRoom,
  onDescendFloor,
}) => {
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [isClairvoyanceMode, setIsClairvoyanceMode] = useState(false);
  const [isTorchTargetMode, setIsTorchTargetMode] = useState(false);
  const [showChamberMix, setShowChamberMix] = useState(false);

  const currentRoom = floor.rooms[currentRoomId] || floor.rooms[floor.startRoomId];
  const allRooms: DungeonRoom[] = Object.values(floor.rooms);

  // Calculate chamber mix stats for this floor
  const totalRooms = allRooms.length;
  const revealedCount = allRooms.filter((r) => r.isRevealed).length;
  const exploredCount = allRooms.filter((r) => r.isExplored).length;
  const hiddenCount = totalRooms - revealedCount;

  const monsters = allRooms.filter((r) => r.type === 'MONSTER' && !r.isBossRoom);
  const bossRoom = allRooms.find((r) => r.isBossRoom);
  const treasures = allRooms.filter((r) => r.type === 'TREASURE');
  const traps = allRooms.filter((r) => r.type === 'TRAP');
  const shrines = allRooms.filter((r) => r.type === 'SHRINE');
  const campfires = allRooms.filter((r) => r.type === 'CAMPFIRE');
  const merchants = allRooms.filter((r) => r.type === 'MERCHANT');
  const secrets = allRooms.filter((r) => r.type === 'SECRET');

  // Check inventory for special wall tools
  const hasBreachingTool = hero.inventory.find(
    (i) => i.item.specialEffect === 'SMASH_WALL' && (i.chargesLeft ?? i.item.charges ?? 1) > 0
  );
  const hasPhasingPotion = hero.inventory.find((i) => i.item.id === 'potion_of_phasing' && i.quantity > 0);
  const isWearingEtherealRing = hero.equipment.ring?.id === 'ethereal_ring';
  const hasClairvoyanceScroll = hero.inventory.find(
    (i) => i.item.id === 'scroll_of_clairvoyance' && i.quantity > 0
  );
  const hasSpyglass = hero.inventory.find((i) => i.item.id === 'brass_spyglass');

  // Build 4x4 matrix
  const gridMatrix: (DungeonRoom | null)[][] = [];
  for (let y = 0; y < 4; y++) {
    const row: (DungeonRoom | null)[] = [];
    for (let x = 0; x < 4; x++) {
      const match = allRooms.find((r) => r.gridX === x && r.gridY === y) || null;
      row.push(match);
    }
    gridMatrix.push(row);
  }

  // Get Room Type Icon
  const getRoomIcon = (type: RoomType, isCleared: boolean, isBoss: boolean = false) => {
    if (isBoss) {
      return <Crown className="w-4 h-4 text-amber-300 animate-pulse" />;
    }
    switch (type) {
      case 'MONSTER':
        return <Skull className={`w-3.5 h-3.5 ${isCleared ? 'text-stone-500' : 'text-red-400'}`} />;
      case 'BOSS_ROOM':
        return <Crown className="w-4 h-4 text-amber-300 animate-pulse" />;
      case 'TREASURE':
        return <Package className={`w-3.5 h-3.5 ${isCleared ? 'text-stone-500' : 'text-amber-400'}`} />;
      case 'MERCHANT':
        return <Store className="w-3.5 h-3.5 text-emerald-400" />;
      case 'CAMPFIRE':
        return <Tent className="w-3.5 h-3.5 text-amber-500" />;
      case 'SHRINE':
        return <Sun className="w-3.5 h-3.5 text-cyan-400" />;
      case 'TRAP':
        return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />;
      case 'SECRET':
        return <HelpCircle className="w-3.5 h-3.5 text-purple-400" />;
      case 'STAIRS':
        return <Footprints className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  const getRoomTypeLabel = (room: DungeonRoom) => {
    if (room.isBossRoom) return 'Boss & Stairs';
    return room.type.replace('_', ' ');
  };

  // Find wall between two rooms
  const findWallBetween = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    return (floor.walls || []).find(
      (w) =>
        (w.roomA.x === a.x && w.roomA.y === a.y && w.roomB.x === b.x && w.roomB.y === b.y) ||
        (w.roomA.x === b.x && w.roomA.y === b.y && w.roomB.x === a.x && w.roomB.y === a.y)
    );
  };

  const isCurrentRoomBlockedByMonster = Boolean(currentRoom?.monster && currentRoom.monster.hp > 0);
  const isCurrentRoomBlockedByTrap = Boolean(
    currentRoom?.trap && !currentRoom.trap.disarmed && !currentRoom.trap.triggered
  );
  const isCurrentRoomMovementBlocked = isCurrentRoomBlockedByMonster || isCurrentRoomBlockedByTrap;

  const handleTileClick = (targetRoom: DungeonRoom) => {
    if (!currentRoom) return;

    if (isClairvoyanceMode) {
      sounds.playSpell();
      onUseClairvoyance(targetRoom.id);
      setIsClairvoyanceMode(false);
      return;
    }

    if (isTorchTargetMode) {
      const isAdjacent = areCoordinatesAdjacent(
        { x: currentRoom.gridX, y: currentRoom.gridY },
        { x: targetRoom.gridX, y: targetRoom.gridY }
      );
      if (isAdjacent && !targetRoom.isRevealed) {
        sounds.playDiceRoll();
        onUseTorch(targetRoom.id);
        setIsTorchTargetMode(false);
        setSelectedCellId(targetRoom.id);
      } else if (targetRoom.isRevealed) {
        // Already revealed
        setSelectedCellId(targetRoom.id);
        setIsTorchTargetMode(false);
      } else {
        // Not adjacent
        sounds.playBlock();
      }
      return;
    }

    // If clicked current room, select/inspect it and trigger opening current room modal (except CAMPFIRE)
    if (targetRoom.id === currentRoomId) {
      setSelectedCellId(targetRoom.id);
      if (onOpenCurrentRoom && targetRoom.type !== 'CAMPFIRE') {
        onOpenCurrentRoom();
      }
      return;
    }

    const isAdjacent = areCoordinatesAdjacent(
      { x: currentRoom.gridX, y: currentRoom.gridY },
      { x: targetRoom.gridX, y: targetRoom.gridY }
    );

    if (isAdjacent) {
      // If blocked by combat or active trap in current room, just select and play error/block sound
      if (isCurrentRoomMovementBlocked) {
        if (isCurrentRoomBlockedByTrap) sounds.playTrap();
        else sounds.playBlock();
        setSelectedCellId(targetRoom.id);
        return;
      }

      const wall = findWallBetween(
        { x: currentRoom.gridX, y: currentRoom.gridY },
        { x: targetRoom.gridX, y: targetRoom.gridY }
      );

      const isWallBlocked = wall && !wall.isBroken;

      if (!isWallBlocked) {
        // Open passage: navigate directly
        sounds.playBlock();
        onSelectAdjacentRoom(targetRoom.id);
      } else {
        // Blocked by wall: select cell so user can smash or phase
        sounds.playBlock();
        setSelectedCellId(targetRoom.id);
      }
    } else {
      // Non-adjacent: select to view info
      setSelectedCellId(targetRoom.id);
    }
  };

  // Selected cell data for action drawer
  const selectedRoom = selectedCellId ? floor.rooms[selectedCellId] : null;
  const isSelectedAdjacent =
    selectedRoom && currentRoom
      ? areCoordinatesAdjacent(
          { x: currentRoom.gridX, y: currentRoom.gridY },
          { x: selectedRoom.gridX, y: selectedRoom.gridY }
        )
      : false;

  const wallToSelected =
    isSelectedAdjacent && selectedRoom && currentRoom
      ? findWallBetween(
          { x: currentRoom.gridX, y: currentRoom.gridY },
          { x: selectedRoom.gridX, y: selectedRoom.gridY }
        )
      : null;

  return (
    <div
      id="dungeon-map-container"
      className="bg-[#241a12] border-2 border-[#735438] rounded-xl p-3.5 text-stone-200 shadow-2xl relative"
    >
      {/* Burgle Bros Map Header */}
      <div className="flex items-center justify-between border-b border-[#4d3723] pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-[#3a2717] rounded border border-[#6b4724] text-amber-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-serif text-xs font-bold text-[#e5b967] tracking-wider uppercase">
              <span>Floor {floor.floorNumber} — 4x4 Floor Grid</span>
              <button
                id="btn-floor-chamber-mix-info"
                onClick={() => setShowChamberMix(!showChamberMix)}
                className="px-1.5 py-0.5 rounded bg-[#382515] hover:bg-[#52371f] text-amber-300 border border-[#6b4724] transition-colors flex items-center gap-1 cursor-pointer font-sans normal-case text-[10px]"
                title="View Room Mix Breakdown for Floor"
              >
                <Info className="w-3 h-3 text-amber-400" />
                <span>Chamber Mix</span>
              </button>
            </div>
            <span className="text-[10px] text-stone-400 font-mono">
              16 Room Tiles ({revealedCount} revealed, {hiddenCount} hidden)
            </span>
          </div>
        </div>

        {/* Quick Scout Tools & Legend */}
        <div className="flex items-center gap-1.5">
          <div
            className="hidden sm:flex items-center gap-1 text-[10px] font-serif text-amber-200/90 bg-[#26170d] px-2 py-1 rounded border border-[#6e3e18]"
            title="Candidate locations where the Floor Guardian & Descent Stairs can spawn (outer perimeter & deep alcoves)"
          >
            <Crown className="w-3 h-3 text-amber-400" />
            <span>8 Stairs Candidates</span>
          </div>

          {hero.torches > 0 && (
            <button
              id="btn-use-torch-map"
              onClick={() => {
                if (selectedRoom && isSelectedAdjacent && !selectedRoom.isRevealed) {
                  sounds.playDiceRoll();
                  onUseTorch(selectedRoom.id);
                } else {
                  setIsTorchTargetMode(!isTorchTargetMode);
                }
              }}
              className={`px-2 py-1 rounded text-[11px] font-serif flex items-center gap-1 transition-colors cursor-pointer shadow-sm border ${
                isTorchTargetMode
                  ? 'bg-orange-950 border-orange-500 text-orange-200 animate-pulse'
                  : 'bg-[#442d17] hover:bg-[#5a3c1f] text-orange-200 border-[#855427]'
              }`}
              title="Click an adjacent unrevealed room to light and reveal it (Uses 1 Torch)"
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>{isTorchTargetMode ? 'Select Room' : `Torch (${hero.torches})`}</span>
            </button>
          )}

          {hasClairvoyanceScroll && (
            <button
              id="btn-clairvoyance-mode"
              onClick={() => setIsClairvoyanceMode(!isClairvoyanceMode)}
              className={`px-2 py-1 rounded text-[11px] font-serif flex items-center gap-1 transition-colors cursor-pointer shadow-sm border ${
                isClairvoyanceMode
                  ? 'bg-purple-900 border-purple-400 text-purple-200 animate-pulse'
                  : 'bg-[#3b2347] hover:bg-[#4f2f5e] border-[#78468f] text-purple-200'
              }`}
              title="Cast Clairvoyance to reveal any card on the board"
            >
              <Eye className="w-3.5 h-3.5 text-purple-400" />
              <span>{isClairvoyanceMode ? 'Click Any Tile' : 'Clairvoyance'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Chamber Mix Info Overlay Modal */}
      {showChamberMix && (
        <div className="mb-3 p-3.5 bg-[#19110a] border-2 border-amber-600/70 rounded-lg text-stone-200 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#4d3622] pb-2 mb-2.5">
            <div className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-400" />
              <h3 className="font-serif font-bold text-xs text-amber-200 uppercase tracking-wider">
                Floor {floor.floorNumber} Chamber Distribution & Deck Mix
              </h3>
            </div>
            <button
              id="btn-close-chamber-mix"
              onClick={() => setShowChamberMix(false)}
              className="text-[10px] font-mono text-stone-400 hover:text-stone-100 px-1.5 py-0.5 bg-[#2a1a10] rounded border border-[#523821]"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-serif">
            <div className="bg-[#24170e] p-2 rounded border border-[#442b1a]">
              <div className="flex items-center gap-1.5 text-red-300 font-bold mb-1">
                <Skull className="w-3.5 h-3.5 text-red-400" />
                <span>Monsters ({monsters.length})</span>
              </div>
              <p className="text-[10px] text-stone-400">
                {monsters.filter((m) => m.isCleared).length} Cleared •{' '}
                {monsters.filter((m) => m.isRevealed && !m.isCleared).length} Active
              </p>
            </div>

            <div className="bg-[#24170e] p-2 rounded border border-[#442b1a]">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold mb-1">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Boss & Stairs (1)</span>
              </div>
              <p className="text-[10px] text-stone-400">
                {bossRoom?.isRevealed ? (bossRoom.isCleared ? 'Defeated' : 'Located') : 'In 1 of 8 Candidate Spots'}
              </p>
            </div>

            <div className="bg-[#24170e] p-2 rounded border border-[#442b1a]">
              <div className="flex items-center gap-1.5 text-yellow-300 font-bold mb-1">
                <Package className="w-3.5 h-3.5 text-yellow-400" />
                <span>Vaults ({treasures.length})</span>
              </div>
              <p className="text-[10px] text-stone-400">
                {treasures.filter((t) => t.isCleared).length} Looted •{' '}
                {treasures.filter((t) => !t.isCleared).length} Unopened
              </p>
            </div>

            <div className="bg-[#24170e] p-2 rounded border border-[#442b1a]">
              <div className="flex items-center gap-1.5 text-orange-300 font-bold mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                <span>Traps ({traps.length})</span>
              </div>
              <p className="text-[10px] text-stone-400">
                {traps.filter((t) => t.trap?.disarmed || t.trap?.triggered).length} Neutralized
              </p>
            </div>

            <div className="bg-[#24170e] p-2 rounded border border-[#442b1a]">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold mb-1">
                <Sun className="w-3.5 h-3.5 text-cyan-400" />
                <span>Shrines ({shrines.length})</span>
              </div>
              <p className="text-[10px] text-stone-400">Stat Blessings & Boons</p>
            </div>

            <div className="bg-[#24170e] p-2 rounded border border-[#442b1a]">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold mb-1">
                <Tent className="w-3.5 h-3.5 text-amber-500" />
                <span>Campfire ({campfires.length})</span>
              </div>
              <p className="text-[10px] text-stone-400">Safe Hearth & Rest</p>
            </div>

            <div className="bg-[#24170e] p-2 rounded border border-[#442b1a]">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold mb-1">
                <Store className="w-3.5 h-3.5 text-emerald-400" />
                <span>Shop ({merchants.length})</span>
              </div>
              <p className="text-[10px] text-stone-400">Merchant Goods</p>
            </div>

            <div className="bg-[#24170e] p-2 rounded border border-[#442b1a]">
              <div className="flex items-center gap-1.5 text-purple-300 font-bold mb-1">
                <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                <span>Secrets ({secrets.length})</span>
              </div>
              <p className="text-[10px] text-stone-400">Hidden Relic Chamber</p>
            </div>
          </div>
        </div>
      )}

      {/* Torch Mode Banner Notification */}
      {isTorchTargetMode && (
        <div className="mb-2.5 p-2 bg-orange-950/90 border border-orange-500 rounded text-center text-xs font-serif text-orange-200 animate-pulse flex items-center justify-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-400" />
          <span>Torch Lit: Click any adjacent unrevealed room to reveal it! (Uses 1 Torch)</span>
        </div>
      )}

      {/* Clairvoyance Banner Notification */}
      {isClairvoyanceMode && (
        <div className="mb-2.5 p-1.5 bg-purple-950/80 border border-purple-500 rounded text-center text-xs font-serif text-purple-200 animate-pulse flex items-center justify-center gap-1.5">
          <Eye className="w-4 h-4 text-purple-300" />
          <span>Select any room card on the 4x4 grid to peek with Clairvoyance!</span>
        </div>
      )}

      {/* Active Chamber Location Bar & Action Status */}
      {currentRoom && (() => {
        const currentInfo = getRoomDisplayInfo(currentRoom);
        const isCurrentPassed = isRoomPassedThrough(currentRoom);

        return (
          <div className="mb-2.5 p-2 bg-[#1b120a] border border-[#523820] rounded-lg flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isCurrentPassed ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
              <div className="text-xs font-serif truncate">
                <span className="text-stone-400">Current Chamber: </span>
                <strong className="text-amber-200 font-bold">{currentInfo.title}</strong>{' '}
                <span className="text-stone-500 font-mono text-[10px]">
                  [{currentRoom.gridX + 1},{currentRoom.gridY + 1}]
                </span>
              </div>
            </div>

            {/* Action buttons based on chamber completion state */}
            {currentRoom.type === 'CAMPFIRE' ? (
              <span className="text-[11px] font-serif text-amber-300 font-bold bg-[#26170d] px-2 py-0.5 rounded border border-[#5a3619]">
                Safe Hearth
              </span>
            ) : currentRoom.isBossRoom && currentRoom.isStairsUnlocked ? (
              <button
                id="btn-quick-descend"
                onClick={() => {
                  if (onDescendFloor) onDescendFloor();
                }}
                className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-serif font-black text-xs rounded-md shadow flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition-all"
                title="Descend to the next dungeon floor"
              >
                <ArrowDownCircle className="w-3.5 h-3.5 text-stone-950" />
                <span>Descend Stairs ➔</span>
              </button>
            ) : currentRoom.type === 'MERCHANT' ? (
              <button
                id="btn-quick-open-chamber"
                onClick={() => {
                  if (onOpenCurrentRoom) onOpenCurrentRoom();
                }}
                className="px-2.5 py-1 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 text-emerald-100 font-serif font-bold text-xs rounded-md shadow flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition-all"
                title="Trade with Olaf the Merchant"
              >
                <Store className="w-3.5 h-3.5 text-emerald-300" />
                <span>Trade with Merchant ➔</span>
              </button>
            ) : isCurrentPassed ? (
              <span className="text-[11px] font-serif text-emerald-300 font-bold bg-[#142214] px-2.5 py-0.5 rounded border border-emerald-700/60 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Chamber Cleared</span>
              </span>
            ) : (
              <button
                id="btn-quick-open-chamber"
                onClick={() => {
                  if (onOpenCurrentRoom) onOpenCurrentRoom();
                }}
                className="px-2.5 py-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-serif font-black text-xs rounded-md shadow flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition-all"
                title="Open full-screen pop-up for current chamber"
              >
                <span>Enter Chamber ➔</span>
              </button>
            )}
          </div>
        );
      })()}

      {/* 4x4 Burgle Bros Board with Interactive Tiles & Walls */}
      <div className="bg-[#170f09] p-3 rounded-lg border-2 border-[#422c19] relative overflow-hidden bg-[radial-gradient(#382414_1px,transparent_1px)] [background-size:14px_14px] flex justify-center">
        {/* Grid Container - Tightly Clustered and Centered */}
        <div className="inline-flex flex-col gap-1 sm:gap-1.5 mx-auto max-w-full overflow-x-auto py-1">
          {gridMatrix.map((row, rIdx) => (
            <div key={`row-${rIdx}`} className="flex flex-col gap-1 sm:gap-1.5">
              {/* Horizontal Wall Row Above (between rIdx-1 and rIdx) */}
              {rIdx > 0 && (
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 h-1.5 relative">
                  {row.map((cell, cIdx) => {
                    const aboveCell = gridMatrix[rIdx - 1][cIdx];
                    const hWall =
                      cell && aboveCell
                        ? findWallBetween(
                            { x: cell.gridX, y: cell.gridY },
                            { x: aboveCell.gridX, y: aboveCell.gridY }
                          )
                        : null;

                    return (
                      <React.Fragment key={`hwall-${rIdx}-${cIdx}`}>
                        <div
                          className="w-14 sm:w-16 flex items-center justify-center shrink-0"
                        >
                          {hWall ? (
                            hWall.isBroken ? (
                              <div
                                className="w-full h-1 bg-amber-800/40 border-t border-b border-dashed border-amber-500/60 rounded"
                                title="Broken Wall (Passable Archway)"
                              />
                            ) : (
                              <div
                                className="w-full h-2 bg-gradient-to-r from-[#8a5d3b] via-[#b58156] to-[#8a5d3b] border-y border-[#ffd29d] rounded-sm shadow-md ring-1 ring-[#3b2413]"
                                title="Solid Stone Wall (Blocks Movement)"
                              />
                            )
                          ) : (
                            <div className="w-full h-1 border-t border-stone-800/40" />
                          )}
                        </div>
                        {cIdx < 3 && <div className="w-2 shrink-0" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {/* Room Cards Row with Vertical Walls Between */}
              <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                {row.map((room, cIdx) => {
                  if (!room) return <div key={cIdx} className="w-14 h-14 sm:w-16 sm:h-16 opacity-0 shrink-0" />;

                  const isCurrent = room.id === currentRoomId;
                  const isRevealed = room.isRevealed;
                  const isExplored = room.isExplored;
                  const isBossCandidate = isBossCandidatePosition(room.gridX, room.gridY);
                  const isRoomPassed = isRoomPassedThrough(room);
                  const roomInfo = getRoomDisplayInfo(room);

                  const isAdjacent =
                    currentRoom &&
                    areCoordinatesAdjacent(
                      { x: currentRoom.gridX, y: currentRoom.gridY },
                      { x: room.gridX, y: room.gridY }
                    );

                  const wall =
                    isAdjacent && currentRoom
                      ? findWallBetween(
                          { x: currentRoom.gridX, y: currentRoom.gridY },
                          { x: room.gridX, y: room.gridY }
                        )
                      : null;

                  const isBlockedByWall = wall && !wall.isBroken;
                  const isSelected = selectedCellId === room.id;

                  // Vertical wall to the right of this cell
                  const rightCell = row[cIdx + 1];
                  const vWall =
                    rightCell &&
                    findWallBetween(
                      { x: room.gridX, y: room.gridY },
                      { x: rightCell.gridX, y: rightCell.gridY }
                    );

                  return (
                    <React.Fragment key={room.id}>
                      {/* Room Card Tile */}
                      <button
                        id={`map-card-tile-${room.id}`}
                        onClick={() => handleTileClick(room)}
                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-lg border-2 text-xs font-serif flex flex-col items-center justify-between p-1 relative transition-all duration-200 cursor-pointer shadow-md shrink-0 ${
                          isCurrent
                            ? 'bg-[#523315] border-[#fae498] ring-2 ring-amber-400 text-amber-100 shadow-amber-950/80 scale-105 z-20'
                            : isSelected
                            ? 'bg-[#3b2818] border-amber-400 ring-1 ring-amber-300 text-amber-200'
                            : isRevealed
                            ? room.isBossRoom
                              ? 'bg-[#361d18] border-red-500/80 text-amber-100 hover:border-red-400'
                              : isRoomPassed
                              ? 'bg-[#1b1712] border-[#4a3a2a] text-stone-300 hover:border-stone-400'
                              : 'bg-[#291c13] border-[#5e432b] text-stone-200 hover:border-amber-600'
                            : isAdjacent
                            ? isBossCandidate
                              ? 'bg-[#2b170c] border-[#9e5b29] border-dashed text-amber-300 hover:bg-[#381f10] hover:border-amber-400 bg-[radial-gradient(#9a3412_1px,transparent_1px)] [background-size:6px_6px]'
                              : 'bg-[#21150c] border-[#7d5329] border-dashed text-amber-300 hover:bg-[#332012] hover:border-amber-400'
                            : isBossCandidate
                            ? 'bg-[#20130a] border-[#6b3a16] text-amber-500/80 hover:border-amber-600 bg-[radial-gradient(#7c2d12_1px,transparent_1px)] [background-size:6px_6px]'
                            : 'bg-[#150e08] border-[#382516] text-stone-600 hover:border-stone-500'
                        }`}
                      >
                        {/* Pawn / Hero Marker */}
                        {isCurrent && (
                          <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-amber-400 border border-black rounded-full flex items-center justify-center text-[9px] font-black text-black shadow-md z-30 animate-bounce">
                            ★
                          </div>
                        )}

                        {/* Top Coordinate and Status Pin */}
                        <div className="w-full flex items-center justify-between text-[9px] font-mono leading-none">
                          <span className={`font-bold flex items-center gap-0.5 ${isBossCandidate && !isRevealed ? 'text-amber-400' : 'text-stone-400'}`}>
                            {room.gridX + 1},{room.gridY + 1}
                            {isBossCandidate && !isRevealed && (
                              <span className="text-amber-500 font-sans text-[8px]" title="Boss/Stairs Candidate Spot">★</span>
                            )}
                          </span>

                          {room.isBossRoom && isRevealed && (
                            <span className="w-2 h-2 bg-amber-400 rounded-full animate-ping" />
                          )}
                          {!isRevealed && isAdjacent && !isBlockedByWall && (
                            <span className="text-amber-400 text-[8px] font-serif">Open</span>
                          )}
                          {!isRevealed && isAdjacent && isBlockedByWall && (
                            <span className="text-stone-500 text-[8px] font-serif">Wall</span>
                          )}
                          {isRevealed && isRoomPassed && (
                            <span className="text-emerald-400 text-[8px] font-mono">✓</span>
                          )}
                        </div>

                        {/* Card Center Content */}
                        <div className="my-auto flex flex-col items-center justify-center">
                          {isRevealed ? (
                            <>
                              <div className="mb-0.5">{getRoomIcon(room.type, isRoomPassed, room.isBossRoom)}</div>
                              <span className="text-[9px] font-serif font-bold text-center leading-tight truncate max-w-[54px]">
                                {room.isBossRoom
                                  ? (isRoomPassed ? 'Stairs' : 'Boss')
                                  : room.type === 'CAMPFIRE'
                                  ? 'Hearth'
                                  : room.type.toLowerCase()}
                              </span>
                            </>
                          ) : isBossCandidate ? (
                            /* Unrevealed Boss / Stairs Candidate Card Back */
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-5 h-5 rounded border border-amber-600/70 bg-[#2c170a] flex items-center justify-center text-amber-300 font-serif font-bold text-[10px] shadow-sm">
                                ?
                              </div>
                              <div className="text-[6.5px] font-mono font-bold text-amber-400 flex items-center gap-0.5 mt-0.5 leading-none">
                                <Crown className="w-2 h-2 text-amber-400" />
                                <span>Stairs?</span>
                              </div>
                            </div>
                          ) : (
                            /* Standard Unrevealed Card Back (Burgle Bros Face-Down Tile) */
                            <div className="flex flex-col items-center justify-center opacity-80">
                              <div className="w-5 h-5 rounded border border-[#543b22] bg-[#1a1109] flex items-center justify-center text-amber-600 font-serif font-bold text-[10px]">
                                ?
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Bottom Tag */}
                        <div className="w-full text-center text-[8px] font-mono text-stone-400 leading-none">
                          {isRevealed ? (
                            isRoomPassed ? (
                              <span className="text-emerald-400/80">Cleared</span>
                            ) : room.isExplored ? (
                              <span className="text-stone-500">Seen</span>
                            ) : (
                              <span className="text-cyan-300">Peeked</span>
                            )
                          ) : isBossCandidate ? (
                            <span className="text-amber-500/90 font-serif">Candidate</span>
                          ) : (
                            <span className="text-stone-600">Hidden</span>
                          )}
                        </div>
                      </button>

                      {/* Vertical Wall Between Columns */}
                      {cIdx < 3 && (
                        <div className="w-2 flex items-center justify-center relative shrink-0">
                          {vWall ? (
                            vWall.isBroken ? (
                              <div
                                className="w-1.5 h-10 sm:h-12 bg-amber-800/40 border-l border-r border-dashed border-amber-500/60 rounded"
                                title="Broken Wall (Passable Archway)"
                              />
                            ) : (
                              <div
                                className="w-2 h-12 sm:h-14 bg-gradient-to-b from-[#8a5d3b] via-[#b58156] to-[#8a5d3b] border-x border-[#ffd29d] rounded-sm shadow-md ring-1 ring-[#3b2413]"
                                title="Solid Stone Wall (Blocks Movement)"
                              />
                            )
                          ) : (
                            <div className="w-0.5 h-10 sm:h-12 border-l border-stone-800/40" />
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Tile Inspector / Actions Panel */}
      {selectedRoom && (() => {
        const selectedInfo = getRoomDisplayInfo(selectedRoom);
        const isSelectedPassed = isRoomPassedThrough(selectedRoom);
        const isSelectedBossCandidate = isBossCandidatePosition(selectedRoom.gridX, selectedRoom.gridY);

        return (
          <div className="mt-3 p-3 bg-[#1c140c] border border-[#5e4228] rounded-lg shadow-inner text-xs font-serif animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#3d2a19] pb-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-amber-300 font-bold bg-[#120c07] px-1.5 py-0.5 rounded border border-[#442f1b]">
                  Tile [{selectedRoom.gridX + 1},{selectedRoom.gridY + 1}]
                </span>
                <span className="font-bold text-[#f5e4c6]">
                  {selectedRoom.isRevealed ? selectedInfo.title : 'Unrevealed Room Card'}
                </span>
              </div>
              <span className="text-[10px] text-stone-400 capitalize">
                {selectedRoom.isRevealed ? getRoomTypeLabel(selectedRoom) : isSelectedBossCandidate ? 'Stairs Candidate' : 'Hidden Face-Down'}
              </span>
            </div>

            {/* Candidate Spot Callout */}
            {!selectedRoom.isRevealed && isSelectedBossCandidate && (
              <div className="mb-2 p-2 bg-amber-950/40 border border-amber-600/50 rounded flex items-center gap-1.5 text-[11px] text-amber-200 font-serif">
                <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Candidate Boss & Stairs Chamber:</strong> This deep perimeter alcove is one of 8 potential locations where the floor guardian and descent stairway could be stationed.
                </span>
              </div>
            )}

            <p className="text-[11px] text-stone-300 mb-2.5">
              {selectedRoom.isRevealed
                ? selectedInfo.description
                : 'This room card lies face down. Peek at it with torches or spells, or enter directly to explore.'}
            </p>

            {/* Action Buttons for Selected Tile */}
            <div className="flex flex-wrap gap-2">
              {/* If Selected Room is Current Room */}
              {selectedRoom.id === currentRoomId && (
                selectedRoom.type === 'CAMPFIRE' ? (
                  <div className="text-[11px] text-amber-300 font-serif font-bold bg-[#26170d] px-2.5 py-1.5 rounded border border-[#5a3619] flex items-center gap-1.5">
                    <Tent className="w-3.5 h-3.5 text-amber-400" />
                    <span>Safe Hearth (Rest & Provisions Available Below)</span>
                  </div>
                ) : selectedRoom.isBossRoom && selectedRoom.isStairsUnlocked ? (
                  <button
                    id="btn-descend-from-inspector"
                    onClick={() => {
                      if (onDescendFloor) onDescendFloor();
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-serif font-black text-xs rounded border border-amber-300 flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
                  >
                    <ArrowDownCircle className="w-4 h-4 text-stone-950" />
                    <span>Descend Stairs to Floor {floor.floorNumber + 1} ➔</span>
                  </button>
                ) : selectedRoom.type === 'MERCHANT' ? (
                  <button
                    id="btn-inspect-selected-current-room"
                    onClick={() => {
                      if (onOpenCurrentRoom) onOpenCurrentRoom();
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 text-emerald-100 font-serif font-bold text-xs rounded border border-emerald-500 flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
                  >
                    <Store className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Trade with Merchant ➔</span>
                  </button>
                ) : isSelectedPassed ? (
                  <div className="text-[11px] text-emerald-400 font-serif font-bold bg-[#142214] px-2.5 py-1.5 rounded border border-emerald-700/60 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Chamber Cleared & Secure</span>
                  </div>
                ) : (
                  <button
                    id="btn-inspect-selected-current-room"
                    onClick={() => {
                      if (onOpenCurrentRoom) onOpenCurrentRoom();
                    }}
                    className="px-3 py-1.5 bg-gradient-to-b from-[#8f6333] to-[#5a3b1c] hover:from-[#a6753d] hover:to-[#6d4722] text-amber-100 font-serif font-bold text-xs rounded border border-[#dfb15b] flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
                    <span>Enter & Inspect Chamber (Open Pop-Up) ➔</span>
                  </button>
                )
              )}

              {/* If unrevealed & adjacent -> Torch Reveal Option */}
              {!selectedRoom.isRevealed && isSelectedAdjacent && (
                hero.torches > 0 ? (
                  <button
                    id="btn-torch-selected-room"
                    onClick={() => {
                      sounds.playDiceRoll();
                      onUseTorch(selectedRoom.id);
                    }}
                    className="px-3 py-1.5 bg-[#472a14] hover:bg-[#5e381b] text-orange-200 border border-[#915828] rounded text-xs font-serif font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                    title="Use 1 Torch to reveal this adjacent room without entering"
                  >
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span>Light Torch to Reveal ({hero.torches} left)</span>
                  </button>
                ) : (
                  <div className="text-[11px] font-serif text-stone-400 bg-[#140e09] px-2.5 py-1.5 rounded border border-[#3d2716] flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-stone-600" />
                    <span>Hidden Face-Down (Torch required to scout without entering)</span>
                  </div>
                )
              )}

              {/* If adjacent & NO unbroken wall -> Enter Room */}
              {isSelectedAdjacent && (!wallToSelected || wallToSelected.isBroken) && (
                isCurrentRoomMovementBlocked ? (
                  <div className="text-[11px] text-yellow-400 bg-[#281c12] px-2.5 py-1.5 rounded border border-yellow-800/60 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                    <span>
                      {isCurrentRoomBlockedByMonster
                        ? 'Defeat the monster in your chamber to proceed.'
                        : 'Deactivate the trap in your chamber before leaving.'}
                    </span>
                  </div>
                ) : (
                  <button
                    id="btn-move-to-selected"
                    onClick={() => {
                      sounds.playBlock();
                      onSelectAdjacentRoom(selectedRoom.id);
                    }}
                    className="px-3 py-1.5 bg-gradient-to-b from-[#7a5526] to-[#473014] hover:from-[#94682f] hover:to-[#5e401b] text-amber-100 font-serif font-bold text-xs rounded border border-amber-500 flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Footprints className="w-3.5 h-3.5 text-amber-300" />
                    <span>Enter Room</span>
                  </button>
                )
              )}

              {/* If adjacent & BLOCKED by Wall -> Smash Wall or Phase Options */}
              {isSelectedAdjacent && wallToSelected && !wallToSelected.isBroken && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-red-400 text-[11px] flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Blocked by Solid Stone Wall
                  </span>

                  {hasBreachingTool && (
                    <button
                      id="btn-smash-wall"
                      onClick={() => {
                        sounds.playHit();
                        onSmashWall(wallToSelected.id, hasBreachingTool.item);
                      }}
                      className="px-2.5 py-1.5 bg-[#54231b] hover:bg-[#6e2e23] text-amber-200 border border-red-500 rounded text-xs font-serif font-bold flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <Hammer className="w-3.5 h-3.5 text-amber-400" />
                      <span>Smash Wall ({hasBreachingTool.item.name})</span>
                    </button>
                  )}

                  {(isWearingEtherealRing || hasPhasingPotion) && (
                    <button
                      id="btn-phase-wall"
                      onClick={() => {
                        sounds.playSpell();
                        onPhaseThroughWall(selectedRoom.id, hasPhasingPotion?.item);
                      }}
                      className="px-2.5 py-1.5 bg-[#3f2252] hover:bg-[#532d6b] text-purple-200 border border-purple-400 rounded text-xs font-serif font-bold flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                      <span>Phase Through Wall</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Goal & Stairs Status Tracker */}
      <div className="mt-3 p-2.5 bg-[#17100a] border border-[#4d3622] rounded-lg flex items-center justify-between text-xs font-serif">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-stone-300">
            Goal: <strong className="text-amber-200">Defeat Boss & Take Stairs</strong>{' '}
            {(() => {
              const bossRoom = (Object.values(floor.rooms) as DungeonRoom[]).find((r) => r.isBossRoom);
              if (!bossRoom) return '';
              return bossRoom.isRevealed
                ? `[${bossRoom.gridX + 1},${bossRoom.gridY + 1}]`
                : '(Hidden)';
            })()}
          </span>
        </div>

        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
            floor.bossDefeated
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500'
              : 'bg-red-950/80 text-red-300 border border-red-800'
          }`}
        >
          {floor.bossDefeated ? '✓ Stairs Unlocked' : '✖ Boss Guards Stairs'}
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-[10px] font-serif text-stone-400 border-t border-[#44301d] mt-2.5">
        <span className="flex items-center gap-1">
          <div className="w-2.5 h-1 bg-[#b58156] border border-[#ffd29d] rounded-sm" /> Wall
        </span>
        <span className="flex items-center gap-1">
          <Crown className="w-3 h-3 text-amber-300" /> Boss & Stairs
        </span>
        <span className="flex items-center gap-1">
          <Skull className="w-3 h-3 text-red-400" /> Monster
        </span>
        <span className="flex items-center gap-1">
          <Package className="w-3 h-3 text-amber-400" /> Vault
        </span>
        <span className="flex items-center gap-1">
          <Store className="w-3 h-3 text-emerald-400" /> Shop
        </span>
        <span className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-yellow-500" /> Trap
        </span>
      </div>
    </div>
  );
};
