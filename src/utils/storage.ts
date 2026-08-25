/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameState, ScoreRecord } from '../types/game';
import { syncHeroSupplies } from './inventory';

const SAVE_KEY = 'dungeon_dice_crawler_save_v1';
const SCORES_KEY = 'dungeon_dice_crawler_hall_of_fame_v1';

export function saveGameState(state: GameState): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(SAVE_KEY, serialized);
  } catch (err) {
    console.error('Failed to save game state to local storage', err);
  }
}

export function loadGameState(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as GameState;

    // Migrate and ensure backwards-compatible floor and room structures
    if (state && state.floors) {
      for (const floorKey of Object.keys(state.floors)) {
        const floor = state.floors[Number(floorKey)];
        if (floor) {
          if (!floor.walls) {
            floor.walls = [];
          }
          if (floor.rooms) {
            for (const rId of Object.keys(floor.rooms)) {
              const room = floor.rooms[rId];
              if (room) {
                if (room.isRevealed === undefined) {
                  room.isRevealed = true;
                }
                if (!room.doors) {
                  room.doors = [];
                }
              }
            }
          }
        }
      }
    }

    if (state && state.hero) {
      syncHeroSupplies(state.hero);
    }

    return state;
  } catch (err) {
    console.error('Failed to load game state from local storage', err);
    return null;
  }
}

export function clearGameState(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    console.error('Failed to clear game state', err);
  }
}

export function getHallOfFame(): ScoreRecord[] {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) {
      // Default initial legendary adventurers in the Hall of Fame
      return [
        {
          id: 'hof_1',
          heroName: 'Sir Galahad',
          heroClass: 'Paladin',
          level: 7,
          score: 1450,
          victory: true,
          date: 'Old Era',
          floorsCleared: 3,
          monstersSlain: 14,
          goldAccumulated: 420,
        },
        {
          id: 'hof_2',
          heroName: 'Lyra Shadowstep',
          heroClass: 'Rogue',
          level: 6,
          score: 980,
          victory: false,
          date: 'Old Era',
          floorsCleared: 2,
          monstersSlain: 9,
          goldAccumulated: 290,
        },
      ];
    }
    return JSON.parse(raw) as ScoreRecord[];
  } catch (err) {
    console.error('Failed to read Hall of Fame', err);
    return [];
  }
}

export function addScoreRecord(record: ScoreRecord): ScoreRecord[] {
  try {
    const current = getHallOfFame();
    const updated = [record, ...current].sort((a, b) => b.score - a.score).slice(0, 15);
    localStorage.setItem(SCORES_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save score record', err);
    return [];
  }
}
