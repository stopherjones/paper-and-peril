/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

export type DieSides = 4 | 6 | 8 | 10 | 12 | 20 | number;

export interface DieConfig {
  sides: DieSides;
  color: string;
  darkColor: string;
  lightColor: string;
  textColor: string;
  name: string;
}

export const DICE_CONFIGS: Record<number, DieConfig> = {
  4: {
    sides: 4,
    color: '#2eac66',
    darkColor: '#1e7e48',
    lightColor: '#5cd292',
    textColor: '#ffffff',
    name: 'd4',
  },
  6: {
    sides: 6,
    color: '#12b5cb',
    darkColor: '#0b8292',
    lightColor: '#4fd2e4',
    textColor: '#ffffff',
    name: 'd6',
  },
  8: {
    sides: 8,
    color: '#9353d3',
    darkColor: '#6a34a0',
    lightColor: '#b783ea',
    textColor: '#ffffff',
    name: 'd8',
  },
  10: {
    sides: 10,
    color: '#e73879',
    darkColor: '#a81c50',
    lightColor: '#f375a5',
    textColor: '#ffffff',
    name: 'd10',
  },
  12: {
    sides: 12,
    color: '#ea4335',
    darkColor: '#b3261a',
    lightColor: '#f2796e',
    textColor: '#ffffff',
    name: 'd12',
  },
  20: {
    sides: 20,
    color: '#fa7a1e',
    darkColor: '#c35508',
    lightColor: '#fca15d',
    textColor: '#ffffff',
    name: 'd20',
  },
};

export const getDieConfig = (sides: number): DieConfig => {
  if (DICE_CONFIGS[sides]) return DICE_CONFIGS[sides];
  return {
    sides,
    color: '#fa7a1e',
    darkColor: '#c35508',
    lightColor: '#fca15d',
    textColor: '#ffffff',
    name: `d${sides}`,
  };
};

interface DieShapeProps {
  sides: number;
  value: number | string;
  isRolling?: boolean;
  isCrit?: boolean;
  isFumble?: boolean;
  isDropped?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  index?: number;
}

export const DieShape: React.FC<DieShapeProps> = ({
  sides,
  value,
  isRolling = false,
  isCrit = false,
  isFumble = false,
  isDropped = false,
  size = 'md',
  className = '',
  index = 0,
}) => {
  const config = getDieConfig(sides);

  // Dimension scaling
  const sizeMap = {
    sm: { width: 44, height: 44, fontSize: 'text-sm' },
    md: { width: 68, height: 68, fontSize: 'text-2xl' },
    lg: { width: 92, height: 92, fontSize: 'text-4xl' },
    xl: { width: 120, height: 120, fontSize: 'text-5xl' },
  };

  const { width, height, fontSize } = sizeMap[size];

  // SVG Geometry per dice type
  const renderDieSVG = () => {
    switch (sides) {
      case 4:
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <polygon points="50,6 94,90 6,90" fill={config.color} stroke={config.darkColor} strokeWidth="3" strokeLinejoin="round" />
            {/* Facets */}
            <line x1="50" y1="6" x2="50" y2="58" stroke={config.lightColor} strokeWidth="2.5" opacity="0.6" />
            <line x1="94" y1="90" x2="50" y2="58" stroke={config.darkColor} strokeWidth="2.5" opacity="0.7" />
            <line x1="6" y1="90" x2="50" y2="58" stroke={config.lightColor} strokeWidth="2.5" opacity="0.7" />
            <polygon points="50,6 50,58 6,90" fill={config.lightColor} opacity="0.25" />
          </svg>
        );

      case 6:
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <rect
              x="6"
              y="6"
              width="88"
              height="88"
              rx="18"
              fill={config.color}
              stroke={config.darkColor}
              strokeWidth="3.5"
            />
            {/* Subtle top-left gloss/bevel */}
            <rect
              x="10"
              y="10"
              width="80"
              height="40"
              rx="12"
              fill={config.lightColor}
              opacity="0.2"
            />
            {/* Corner highlights */}
            <circle cx="22" cy="22" r="3" fill="#ffffff" opacity="0.3" />
          </svg>
        );

      case 8:
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <polygon
              points="50,4 94,50 50,96 6,50"
              fill={config.color}
              stroke={config.darkColor}
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* Inner diamond facets */}
            <line x1="50" y1="4" x2="50" y2="96" stroke={config.lightColor} strokeWidth="2" opacity="0.6" />
            <line x1="6" y1="50" x2="94" y2="50" stroke={config.darkColor} strokeWidth="2" opacity="0.6" />
            <polygon points="50,4 94,50 50,50" fill={config.lightColor} opacity="0.2" />
            <polygon points="6,50 50,50 50,96" fill={config.darkColor} opacity="0.25" />
          </svg>
        );

      case 10:
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <polygon
              points="50,4 94,36 50,96 6,36"
              fill={config.color}
              stroke={config.darkColor}
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* Facets */}
            <line x1="50" y1="4" x2="50" y2="52" stroke={config.lightColor} strokeWidth="2" opacity="0.7" />
            <line x1="94" y1="36" x2="50" y2="52" stroke={config.darkColor} strokeWidth="2" opacity="0.7" />
            <line x1="6" y1="36" x2="50" y2="52" stroke={config.lightColor} strokeWidth="2" opacity="0.7" />
            <line x1="50" y1="96" x2="50" y2="52" stroke={config.darkColor} strokeWidth="2" opacity="0.7" />
            <polygon points="50,4 94,36 50,52" fill={config.lightColor} opacity="0.25" />
          </svg>
        );

      case 12:
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <polygon
              points="50,4 88,18 96,60 68,96 32,96 4,60 12,18"
              fill={config.color}
              stroke={config.darkColor}
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* Facet polygon */}
            <polygon
              points="50,22 76,42 66,74 34,74 24,42"
              fill={config.lightColor}
              opacity="0.2"
              stroke={config.darkColor}
              strokeWidth="1.5"
            />
          </svg>
        );

      case 20:
      default:
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <polygon
              points="50,4 92,26 92,74 50,96 8,74 8,26"
              fill={config.color}
              stroke={config.darkColor}
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* Triangular facets */}
            <polygon
              points="50,22 80,68 20,68"
              fill="none"
              stroke={config.lightColor}
              strokeWidth="2"
              opacity="0.8"
            />
            <line x1="50" y1="4" x2="50" y2="22" stroke={config.lightColor} strokeWidth="2" opacity="0.7" />
            <line x1="92" y1="26" x2="50" y2="22" stroke={config.lightColor} strokeWidth="2" opacity="0.7" />
            <line x1="8" y1="26" x2="50" y2="22" stroke={config.lightColor} strokeWidth="2" opacity="0.7" />
            <line x1="92" y1="74" x2="80" y2="68" stroke={config.darkColor} strokeWidth="2" opacity="0.7" />
            <line x1="8" y1="74" x2="20" y2="68" stroke={config.darkColor} strokeWidth="2" opacity="0.7" />
            <line x1="50" y1="96" x2="50" y2="68" stroke={config.darkColor} strokeWidth="2" opacity="0.7" />
            <polygon points="50,4 92,26 50,22" fill={config.lightColor} opacity="0.3" />
          </svg>
        );
    }
  };

  // Tumbling physics keyframes for when isRolling is true
  const rollRotations = [
    { rotate: [0, 90, 180, 270, 360, 450, 540], scale: [0.9, 1.15, 0.85, 1.2, 0.95, 1.05, 1], x: [0, 8, -12, 10, -6, 4, 0], y: [0, -16, 8, -12, 6, -4, 0] },
    { rotate: [0, -90, -180, -270, -360, -450, -540], scale: [0.85, 1.2, 0.9, 1.15, 0.95, 1.1, 1], x: [0, -10, 12, -8, 6, -3, 0], y: [0, -12, 10, -16, 4, -2, 0] },
    { rotate: [0, 120, 240, 360, 480, 600, 720], scale: [1, 0.85, 1.25, 0.9, 1.15, 0.98, 1], x: [0, 12, -6, 14, -10, 5, 0], y: [0, -18, 6, -10, 8, -3, 0] },
    { rotate: [0, -120, -240, -360, -480, -600, -720], scale: [0.95, 1.18, 0.88, 1.22, 0.92, 1.06, 1], x: [0, -14, 8, -12, 6, -4, 0], y: [0, -14, 12, -14, 5, -2, 0] },
  ];
  const rot = rollRotations[index % rollRotations.length];

  return (
    <motion.div
      className={`relative select-none flex items-center justify-center ${className} ${
        isDropped ? 'opacity-40 grayscale' : ''
      }`}
      style={{ width, height }}
      animate={
        isRolling
          ? {
              rotate: rot.rotate,
              scale: rot.scale,
              x: rot.x,
              y: rot.y,
            }
          : {
              rotate: 0,
              scale: isCrit ? [1, 1.18, 1.05, 1.15, 1] : isFumble ? [1, 1.1, 0.95, 1] : 1,
              x: 0,
              y: [ -8, 0, -3, 0 ],
            }
      }
      transition={
        isRolling
          ? {
              duration: 0.65,
              repeat: Infinity,
              ease: 'easeInOut',
            }
          : {
              duration: 0.45,
              ease: 'easeOut',
            }
      }
    >
      {/* Background Die Polygon */}
      <div className="absolute inset-0 flex items-center justify-center">
        {renderDieSVG()}
      </div>

      {/* Die Number Text */}
      <div
        className={`relative z-10 flex flex-col items-center justify-center font-sans font-black tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] ${fontSize} ${
          isDropped ? 'line-through text-stone-300' : ''
        }`}
        style={{
          marginTop: sides === 4 ? '14%' : sides === 10 ? '4%' : '0%',
        }}
      >
        <span>{value}</span>
      </div>

      {/* Crit / Sparkle Effects */}
      {isCrit && !isRolling && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: 360 }}
          transition={{ duration: 0.5 }}
          className="absolute -top-2 -right-2 bg-amber-400 text-stone-950 p-1 rounded-full shadow-lg z-20"
        >
          <Sparkles className="w-4 h-4 text-amber-950" />
        </motion.div>
      )}

      {/* Critical Fumble Ring */}
      {isFumble && !isRolling && (
        <div className="absolute inset-0 rounded-full ring-4 ring-red-500 animate-ping opacity-75 pointer-events-none" />
      )}
    </motion.div>
  );
};
