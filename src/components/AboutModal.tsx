/**
 * Rise of the Raccoons! - About Modal
 */

import React from 'react';
import { X, Info, Trophy, Heart, Sparkles, Building2 } from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md pointer-events-auto select-none"
    >
      <div className="w-full max-w-sm max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight leading-none">
                ABOUT THE GAME
              </h2>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">
                Rise of the Raccoons!
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-slate-300 text-xs leading-relaxed">
          {/* Backstory */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400 text-xs">
              <Building2 className="w-4 h-4" />
              <span>The Great Urban Heist</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Deep in the neon-lit heart of the city, one brave trash panda decided that alley garbage cans simply weren't enough. Legend speaks of the golden rooftop banquet atop the 25-floor Pinnacle Tower.
            </p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Equipped with agile paws, an unquenchable appetite, and pure bandit determination, your mission is to conquer every single floor, dodge window surprises, solve navigation barriers, and reach the crowning water tower!
            </p>
          </div>

          {/* Highlights */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400 text-xs">
              <Trophy className="w-4 h-4" />
              <span>Features & Physics</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-300">
              <li>• Pure procedural physics & responsive 8-way climbing kinetics</li>
              <li>• 90% transparent glass with living room inhabitants inside</li>
              <li>• Interactive Star Trek teleport & swinging Tarzan vine shortcuts</li>
              <li>• Authentic eagle nest atop Floor 17 & street traffic below</li>
              <li>• 100% browser-synthesized Web Audio procedural sound design</li>
            </ul>
          </div>

          {/* Credits */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl text-center space-y-1.5">
            <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 font-bold">
              <Heart className="w-3.5 h-3.5 fill-rose-400" />
              <span>Created for True Arcade Bandits</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono-nums">
              Version 2.0 · Vertical Arcade Series
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
