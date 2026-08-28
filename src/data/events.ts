/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ShrineEvent {
  id: string;
  name: string;
  godName: string;
  description: string;
    options: {
    label: string;
    description: string;
    costType?: 'gold' | 'hp' | 'mana' | 'energy' | 'free';
    costAmount?: number;
    statCheck?: { stat: 'STR' | 'DEX' | 'CON' | 'INT' | 'LCK'; dc: number };
    successEffect: {
      message: string;
      hp?: number;
      mana?: number;
      energy?: number;
      gold?: number;
      rerollTokens?: number;
      buff?: string;
    };
    failEffect?: {
      message: string;
      damage?: number;
    };
  }[];
}

export const SHRINE_EVENTS: ShrineEvent[] = [
  {
    id: 'shrine_of_sun',
    name: 'Shrine of the Radiant Sun',
    godName: 'Solarius, Lord of Dawn',
    description: 'A sunstone altar surrounded by burning braziers that never dim.',
    options: [
      {
        label: 'Offer a Prayer (Free)',
        description: 'Bow your head and ask for divine protection.',
        costType: 'free',
        successEffect: {
          message: 'A warm golden light washes over your wounds, restoring 18 HP and cleansing fatigue.',
          hp: 18,
          buff: 'Solar Blessing (+2 AC for 5 rooms)',
        },
      },
      {
        label: 'Tithe 15 Gold',
        description: 'Toss shining gold coins onto the burning brazier.',
        costType: 'gold',
        costAmount: 15,
        successEffect: {
          message: 'Solarius smiles upon your offering. You receive full HP, 15 Energy, and a mystical Dice of Fate token!',
          hp: 999,
          mana: 15,
          energy: 15,
          rerollTokens: 1,
        },
      },
    ],
  },
  {
    id: 'fountain_of_mists',
    name: 'Subterranean Moonwell',
    godName: 'Lunaria, Mist Weaver',
    description: 'A pool of shimmering silver liquid bubbling quietly from a crystal fissure.',
    options: [
      {
        label: 'Drink the Cool Waters',
        description: 'Cup your hands and drink from the glowing well.',
        costType: 'free',
        successEffect: {
          message: 'The cool water revitalizes your spirit, restoring 20 Energy and 10 HP.',
          mana: 20,
          energy: 20,
          hp: 10,
        },
      },
      {
        label: 'Toss a Lucky Coin (5 Gold)',
        description: 'Make a wish for fortune in the depths.',
        costType: 'gold',
        costAmount: 5,
        statCheck: { stat: 'LCK', dc: 11 },
        successEffect: {
          message: 'The ripples glow bright cyan! 2 Reroll Tokens float to the surface!',
          rerollTokens: 2,
        },
        failEffect: {
          message: 'The coin sinks silently. A gentle calm washes over you.',
          damage: 0,
        },
      },
    ],
  },
  {
    id: 'blood_altar',
    name: 'Altar of the Blood Wyrm',
    godName: 'Valthor the Crimson',
    description: 'A jagged obsidian altar stained with ancient dragonsblood.',
    options: [
      {
        label: 'Offer Blood (Sacrifice 8 HP)',
        description: 'Cut your palm and let blood drip onto the obsidian runes.',
        costType: 'hp',
        costAmount: 8,
        successEffect: {
          message: 'The altar ignites in crimson flames! You gain +2 permanent Strength and 40 Gold!',
          gold: 40,
          buff: 'Blood Fury (+2 STR)',
        },
      },
      {
        label: 'Pass by Respectfully',
        description: 'Keep moving without disturbing the dark power.',
        costType: 'free',
        successEffect: {
          message: 'You leave the blood-stained altar undisturbed.',
        },
      },
    ],
  },
];

export interface TrapDefinition {
  id: string;
  name: string;
  description: string;
  statCheck: 'DEX' | 'INT' | 'STR';
  difficulty: number; // DC (Difficulty Class)
  damageFormula: string;
  disarmHint: string;
  failFlavor: string;
  successFlavor: string;
}

export const TRAPS_DATABASE: TrapDefinition[] = [
  {
    id: 'poison_darts',
    name: 'Pressure-Plate Poison Dart Gallery',
    description: 'Subtle floor tiles wired to spring-loaded tubes concealed in the stonework.',
    statCheck: 'DEX',
    difficulty: 12,
    damageFormula: '1d8+2',
    disarmHint: 'Carefully bypass or wedge a dagger into the trip mechanism (DEX check vs DC 12).',
    failFlavor: 'Click! A volley of green-tipped iron darts pecks through your armor!',
    successFlavor: 'With steady hands, you jam the spring plate and collect 2 intact darts.',
  },
  {
    id: 'spike_pit',
    name: 'Concealed Punji Spike Pit',
    description: 'A false stone floor over a 15-foot pit lined with sharpened iron spikes.',
    statCheck: 'DEX',
    difficulty: 13,
    damageFormula: '2d6+2',
    disarmHint: 'Leap across the weakened flagstones or tread along the narrow ledge (DEX check vs DC 13).',
    failFlavor: 'The stone floor crumbles beneath your boots! You plunge onto jagged iron spikes!',
    successFlavor: 'You spot the hairline fissures in time and vault gracefully across to safety.',
  },
  {
    id: 'arcane_rune',
    name: 'Glyph of Scorching Ruin',
    description: 'A glowing crimson rune etched into the threshold, humming with unstable pyromancy.',
    statCheck: 'INT',
    difficulty: 13,
    damageFormula: '2d8+3',
    disarmHint: 'Decipher the arcane glyph and carefully scratch out the power node (INT check vs DC 13).',
    failFlavor: 'The glyph flashes blinding scarlet! A blast wave of superheated fire scorches you!',
    successFlavor: 'You precisely scrape away the trigger sigil with your blade, neutralizing the magic safe and sound.',
  },
  {
    id: 'falling_portcullis',
    name: 'Iron Portcullis Deadfall',
    description: 'A heavy iron spiked gate held by a counterweight cord rigged to snap.',
    statCheck: 'STR',
    difficulty: 14,
    damageFormula: '2d10',
    disarmHint: 'Brace your shoulders or jam a heavy prybar into the track (STR check vs DC 14).',
    failFlavor: 'CRASH! The heavy iron gate drops like a guillotine, crushing down on you!',
    successFlavor: 'You catch the falling gate with immense physical power and prop it open safely!',
  },
];

export const MERCHANT_QUOTES = [
  '“Ah, a living face in these cursed halls! Care to inspect my wares?”',
  '“Gold is heavy, traveler, but health potions are priceless down here.”',
  '“Watch your step on floor three... they say the dragon\'s breath melts armor like butter.”',
  '“Fair trades only. Olaf doesn\'t barter with goblins, but an adventurer is always welcome.”',
  '“Got anything shiny you want to part with? I pay top copper for monster trinkets!”',
];
