/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  KeyRound,
  Hammer,
  Search,
  Sparkles,
  AlertTriangle,
  Award,
  Heart,
  CheckCircle2,
  XCircle,
  Dices,
  Flame,
  Zap,
} from 'lucide-react';
import { HeroCharacter, StatType } from '../types/game';
import { RollResult, rollDice, getStatModifier } from '../utils/dice';
import { DiceVisualizer } from './DiceVisualizer';
import { DieShape } from './DieShape';
import { sounds } from '../utils/audio';

export type ChallengeType =
  | 'TRAP_DISARM'
  | 'CHEST_PICK'
  | 'CHEST_BASH'
  | 'ROOM_SEARCH'
  | 'WALL_SMASH';

export interface ActionChallengeConfig {
  type: ChallengeType;
  title: string;
  subtitle: string;
  iconType: 'trap' | 'chest' | 'search' | 'smash';
  stat: StatType;
  dc: number;
  bonus: number;
  bonusBreakdown: string;
  successOutcomeTitle: string;
  successOutcomeDesc: string;
  failureOutcomeTitle: string;
  failureOutcomeDesc: string;
  onSuccess: () => void;
  onFailure: () => void;
}

interface ActionChallengeModalProps {
  isOpen: boolean;
  hero: HeroCharacter;
  config: ActionChallengeConfig | null;
  onClose: () => void;
}

export const ActionChallengeModal: React.FC<ActionChallengeModalProps> = ({
  isOpen,
  hero,
  config,
  onClose,
}) => {
  const [step, setStep] = useState<'PREPARE' | 'ROLLING' | 'RESOLVED'>('PREPARE');
  const [rollResult, setRollResult] = useState<RollResult | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (isOpen && config) {
      setStep('PREPARE');
      setRollResult(null);
      setIsSuccess(null);
    }
  }, [isOpen, config]);

  if (!isOpen || !config) return null;

  const handleStartRoll = () => {
    setStep('ROLLING');
    sounds.playDiceRoll();

    const roll = rollDice(1, 20, config.bonus);
    setRollResult(roll);

    setTimeout(() => {
      const success = roll.total >= config.dc;
      setIsSuccess(success);
      setStep('RESOLVED');

      if (success) {
        sounds.playLevelUp();
      } else {
        sounds.playTrap();
      }
    }, 750);
  };

  const handleFinish = () => {
    if (isSuccess) {
      config.onSuccess();
    } else {
      config.onFailure();
    }
    onClose();
  };

  const renderIcon = () => {
    switch (config.iconType) {
      case 'trap':
        return <AlertTriangle className="w-6 h-6 text-yellow-400" />;
      case 'chest':
        return <KeyRound className="w-6 h-6 text-amber-400" />;
      case 'smash':
        return <Hammer className="w-6 h-6 text-orange-400" />;
      case 'search':
      default:
        return <Search className="w-6 h-6 text-cyan-400" />;
    }
  };

  return (
    <div
      id="action-challenge-modal"
      className="fixed inset-0 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 z-[60] animate-fadeIn"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="w-full max-w-xl bg-gradient-to-b from-[#251912] via-[#1a120c] to-[#120d09] border-2 border-amber-500/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-serif"
      >
        {/* Header Ribbon */}
        <div className="bg-[#311f14] border-b-2 border-amber-700/60 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#452b1b] rounded-xl border border-amber-600/70 shadow-inner">
              {renderIcon()}
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300/80 font-bold block">
                Focused Action Resolution
              </span>
              <h2 className="text-lg sm:text-xl font-black text-amber-100 leading-tight">
                {config.title}
              </h2>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] font-mono text-stone-400">Target DC</div>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-300">
              {config.dc}
            </div>
          </div>
        </div>

        {/* Challenge Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Context & Description */}
          <div className="bg-stone-950/60 border border-amber-900/50 rounded-xl p-4 text-xs sm:text-sm text-stone-200 leading-relaxed">
            <p className="font-serif">{config.subtitle}</p>
            <div className="mt-2.5 pt-2.5 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-amber-300/90">
              <span>Approach: <strong>{config.stat} Check</strong></span>
              <span>Modifier: <strong>{config.bonusBreakdown}</strong> ({config.bonus >= 0 ? `+${config.bonus}` : config.bonus})</span>
            </div>
          </div>

          {/* Action Stages */}
          {step === 'PREPARE' && (
            <div className="space-y-4 text-center py-2">
              <div className="flex items-center justify-center gap-4">
                <DieShape
                  sides={20}
                  value={20}
                  size="lg"
                />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-amber-200">
                  Ready to test your {config.stat}?
                </h4>
                <p className="text-xs text-stone-400 font-mono">
                  Roll 1d20 + {config.bonus} to beat Difficulty Class {config.dc}.
                </p>
              </div>

              <button
                id="btn-execute-challenge-roll"
                onClick={handleStartRoll}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-stone-950 font-black font-serif text-base rounded-xl shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Dices className="w-5 h-5" />
                <span>Roll Action Dice (1d20)</span>
              </button>
            </div>
          )}

          {step === 'ROLLING' && (
            <div className="py-2">
              <DiceVisualizer
                currentRoll={rollResult}
                isRolling={true}
                allowCustomDice={false}
                label={`${config.stat} Check (1d20+${config.bonus})`}
              />
              <p className="text-center text-xs text-amber-300/80 font-mono mt-3 animate-pulse">
                Tumbling d20 against DC {config.dc}...
              </p>
            </div>
          )}

          {step === 'RESOLVED' && rollResult && (
            <div className="space-y-4 animate-fadeIn">
              {/* Google Dice Visualizer Showing Final Result */}
              <DiceVisualizer
                currentRoll={rollResult}
                isRolling={false}
                allowCustomDice={false}
                label={`${config.stat} Roll vs DC ${config.dc}`}
              />

              {/* Outcome Badge Card */}
              <div
                className={`p-4 rounded-xl border-2 flex items-start gap-3.5 shadow-xl ${
                  isSuccess
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-100'
                    : 'bg-red-950/80 border-red-500 text-red-100'
                }`}
              >
                <div className="p-2 rounded-lg bg-stone-950/60 shrink-0">
                  {isSuccess ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold uppercase px-2 py-0.5 rounded bg-stone-950/80">
                      {isSuccess ? 'SUCCESS' : 'FAILURE'}
                    </span>
                    <h3 className="font-serif font-black text-base sm:text-lg">
                      {isSuccess ? config.successOutcomeTitle : config.failureOutcomeTitle}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed opacity-90 font-serif">
                    {isSuccess ? config.successOutcomeDesc : config.failureOutcomeDesc}
                  </p>
                </div>
              </div>

              {/* Acknowledge Button */}
              <button
                id="btn-confirm-challenge-outcome"
                onClick={handleFinish}
                className={`w-full py-3.5 px-6 font-black font-serif text-base rounded-xl shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 ${
                  isSuccess
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 text-stone-950'
                    : 'bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 text-stone-100'
                }`}
              >
                <span>Continue Quest ➔</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
