/**
 * Rise of the Raccoons! - Rooftop Celebration Modal
 * Dynamic, glorious celebration scene for when the raccoon scales all 25 floors and reaches the roof!
 */

import React, { useEffect } from 'react';
import { Trophy, Crown, Sparkles, RotateCcw, Home, Star, PartyPopper } from 'lucide-react';

interface RoofCelebrationModalProps {
  climbTimeSeconds: number;
  altitudeMeters: number;
  onClimbAgain: () => void;
  onMainMenu: () => void;
}

export const RoofCelebrationModal: React.FC<RoofCelebrationModalProps> = ({
  climbTimeSeconds,
  altitudeMeters,
  onClimbAgain,
  onMainMenu,
}) => {
  const minutes = Math.floor(climbTimeSeconds / 60);
  const seconds = Math.floor(climbTimeSeconds % 60);
  const formattedTime = `${minutes > 0 ? `${minutes}m ` : ''}${seconds}s`;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md pointer-events-auto select-none animate-fadeIn">
      {/* Decorative Fireworks & Light Sparks In Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-36 h-36 bg-emerald-500/20 rounded-full blur-3xl animate-pulse delay-500" />
        <div className="absolute bottom-1/3 left-1/3 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-2 border-amber-400/60 rounded-3xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.3)] flex flex-col items-center text-center space-y-4">
        {/* Floating Crown & Mascot Badge */}
        <div className="relative mt-1">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 p-1 shadow-lg shadow-amber-500/30 flex items-center justify-center animate-bounce-short">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center relative">
              <span className="text-3xl">🦝</span>
              <Crown className="w-6 h-6 text-amber-300 absolute -top-3.5 fill-amber-300 drop-shadow-md animate-pulse" />
            </div>
          </div>
          <span className="absolute -bottom-1 -right-1 text-xl animate-spin-slow">✨</span>
          <span className="absolute -top-1 -left-2 text-xl">🎉</span>
        </div>

        {/* Victory Headline */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-[10px] font-black tracking-widest text-amber-300 uppercase font-mono-nums mb-1.5 shadow-sm">
            <PartyPopper className="w-3.5 h-3.5 text-amber-300" />
            <span>ROOFTOP CONQUERED! 25/25 FLOORS</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 tracking-tight drop-shadow">
            TOP RACCOON OF THE CITY!
          </h2>

          <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed">
            You braved all 25 floors, outmaneuvered every barrier, and claimed the crown atop the skyline water tower!
          </p>
        </div>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-2 gap-2.5 p-3.5 bg-slate-950/80 border border-amber-500/30 rounded-2xl font-mono-nums shadow-inner">
          <div className="text-center p-2 bg-slate-900/60 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase tracking-tight flex items-center justify-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>Conquest Time</span>
            </div>
            <div className="text-base font-black text-white mt-0.5">{formattedTime}</div>
          </div>

          <div className="text-center p-2 bg-slate-900/60 rounded-xl border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase tracking-tight flex items-center justify-center gap-1">
              <Star className="w-3 h-3 text-emerald-400 fill-emerald-400" />
              <span>Peak Altitude</span>
            </div>
            <div className="text-base font-black text-emerald-400 mt-0.5">{altitudeMeters}m</div>
          </div>
        </div>

        {/* Celebratory Raccoon Praise */}
        <div className="px-3 py-2 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-[11px] font-medium italic">
          "All hail the King of the Penthouse Dumpsters! The city sparkles below your royal paws." 🍕👑
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2 pt-1">
          <button
            onClick={onClimbAgain}
            className="w-full py-3 px-4 rounded-xl font-black text-xs text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:from-yellow-300 hover:to-amber-300 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer shadow-lg shadow-amber-500/25 active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Climb Again</span>
          </button>

          <button
            onClick={onMainMenu}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-400 hover:text-white bg-transparent hover:bg-slate-800/60 transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
