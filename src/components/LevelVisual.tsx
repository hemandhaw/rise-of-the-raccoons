/**
 * Rise of the Raccoons! - Level Visual Mini Preview
 * 
 * Provides rich, colorful procedural vector previews for each level:
 * - St. Paul Skyscraper: Detailed skyscraper silhouette with lit windows and rooftop antenna.
 * - Hollywood Sign: Hillside backdrop with white "RACCOON" lettering.
 * - Eiffel Tower, Big Ben, Pyramids, Space Station, Blue Whale, Micro World, etc.
 * Designed to look cohesive and polished at both small and enlarged card sizes.
 */

import React from 'react';
import { LevelConfig } from '../game/levelConfig';
import { Building2, Sparkles, Lock } from 'lucide-react';

interface LevelVisualProps {
  level: LevelConfig;
  size?: 'small' | 'large';
  showBadge?: boolean;
}

export const LevelVisual: React.FC<LevelVisualProps> = ({
  level,
  size = 'small',
  showBadge = true,
}) => {
  const isLarge = size === 'large';

  return (
    <div
      className={`relative rounded-xl overflow-hidden flex items-center justify-center select-none shadow-inner border border-white/10 ${
        isLarge ? 'w-40 h-28 xs:w-48 xs:h-32 sm:w-56 sm:h-36' : 'w-full h-full min-h-[56px]'
      }`}
      style={{
        background: `radial-gradient(circle at 50% 20%, ${level.themeColor}33, #090d16 90%)`,
      }}
    >
      {/* Background Gradient Mesh & Glow */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${level.gradient} opacity-40`}
      />

      {/* Decorative ambient sky glow */}
      <div
        style={{ backgroundColor: level.accentColor }}
        className={`absolute rounded-full blur-xl pointer-events-none opacity-20 ${
          isLarge ? 'w-32 h-32' : 'w-16 h-16'
        }`}
      />

      {/* Procedural Silhouette & Iconic Representation based on iconType */}
      <div className="relative z-10 flex flex-col items-center justify-center p-1.5 text-center">
        {level.iconType === 'skyscraper' ? (
          // St. Paul Skyscraper representation
          <div className="flex flex-col items-center">
            {/* Antenna & Beacon */}
            <div className="flex flex-col items-center -mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              <div className="w-0.5 h-3 bg-slate-300" />
            </div>
            {/* Skyscraper Building Body */}
            <div className={`bg-gradient-to-b from-slate-700 to-slate-900 border border-amber-400/60 rounded-t-sm flex flex-col items-center justify-between p-1 shadow-lg ${
              isLarge ? 'w-20 h-20' : 'w-12 h-11'
            }`}>
              {/* Window grid */}
              <div className="grid grid-cols-3 gap-0.5 w-full h-full">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-[1px] ${
                      i % 2 === 0 ? 'bg-amber-300 shadow-[0_0_3px_#fde047]' : 'bg-sky-400/70'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : level.iconType === 'hollywood' ? (
          // Hollywood Sign ("RACCOON")
          <div className="flex flex-col items-center">
            <div className={`px-2 py-1 rounded bg-stone-900/90 border border-rose-500/60 shadow-lg ${
              isLarge ? 'tracking-widest' : 'tracking-wider'
            }`}>
              <span className={`font-black text-white font-sans ${isLarge ? 'text-xs xs:text-sm' : 'text-[9px]'}`}>
                R-A-C-C-O-O-N
              </span>
            </div>
            <div className="w-16 h-2 bg-emerald-800 rounded-b mt-0.5" />
          </div>
        ) : level.iconType === 'space' ? (
          // International Space Station
          <div className="flex items-center gap-1">
            <div className="w-3 h-6 bg-gradient-to-b from-amber-400 to-amber-600 rounded-xs border border-white/30" />
            <div className="w-6 h-3 bg-slate-300 rounded border border-white/50 flex items-center justify-center text-[8px]">
              🛰️
            </div>
            <div className="w-3 h-6 bg-gradient-to-b from-amber-400 to-amber-600 rounded-xs border border-white/30" />
          </div>
        ) : level.iconType === 'atom' ? (
          // Micro World Atom
          <div className="relative flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border border-cyan-400/60 animate-spin" style={{ animationDuration: '4s' }} />
            <div className="absolute w-8 h-8 rounded-full border border-indigo-400/60 rotate-45" />
            <span className="absolute text-sm">🔬</span>
          </div>
        ) : (
          // Generalized iconic representation with vibrant landmark glyph
          <div className="flex flex-col items-center">
            <span className={`filter drop-shadow-md transition-transform group-hover:scale-110 ${
              isLarge ? 'text-4xl xs:text-5xl' : 'text-2xl xs:text-3xl'
            }`}>
              {level.badge}
            </span>
          </div>
        )}

        {/* Small location sub-tag for enlarged view */}
        {isLarge && (
          <div className="mt-1 px-2 py-0.5 rounded-full bg-black/60 border border-white/10 text-[10px] text-slate-300 font-medium">
            {level.location}
          </div>
        )}
      </div>

      {/* Status Overlay Badge */}
      {showBadge && (
        <div className="absolute top-1.5 right-1.5 z-20">
          {level.status === 'playable' ? (
            <span className="px-1.5 py-0.5 text-[8px] xs:text-[9px] font-black uppercase tracking-wider bg-emerald-500/90 text-white rounded-md shadow-md border border-emerald-300/60 flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" />
              <span>PLAYABLE</span>
            </span>
          ) : (
            <span className="px-1.5 py-0.5 text-[8px] xs:text-[9px] font-black uppercase tracking-wider bg-slate-900/90 text-amber-300 rounded-md shadow-md border border-amber-400/40 flex items-center gap-0.5">
              <Lock className="w-2 h-2 text-amber-400" />
              <span>SOON</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
