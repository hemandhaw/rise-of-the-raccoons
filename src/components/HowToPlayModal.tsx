/**
 * Rise of the Raccoons! - How to Play Guide Modal
 */

import React from 'react';
import { X, Gamepad2, ArrowUpCircle, ShieldAlert, Sparkles, Zap, Flame, Compass } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md pointer-events-auto select-none"
    >
      <div className="w-full max-w-sm max-h-[90vh] bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight leading-none">
                HOW TO PLAY
              </h2>
              <span className="text-[10px] text-emerald-400 font-semibold tracking-wide uppercase">
                Bandit Climbing Manual
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

        {/* Scrollable Guide Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-slate-300 text-xs leading-relaxed">
          {/* Controls */}
          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-white text-xs">
              <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
              <span>Climbing & Movement</span>
            </div>
            <ul className="space-y-1.5 text-slate-300 text-[11px]">
              <li>
                <span className="font-semibold text-emerald-300">Desktop:</span> Arrow Keys or <span className="font-semibold text-white">W, A, S, D</span> to climb in all 8 directions.
              </li>
              <li>
                <span className="font-semibold text-emerald-300">Mobile / Touch:</span> Drag your thumb on the screen or use the floating paw joystick.
              </li>
              <li>
                <span className="font-semibold text-[#1ea7e1]">Dynamic Climbing Momentum:</span> Your climb starts at maximum initial sprint speed! As you climb continuously, exertion causes your speed to gradually decay down to 40%. Rest upon any window sill to catch your breath and immediately restore your speed to <span className="text-[#16a34a] font-bold">100% full speed</span>!
              </li>
            </ul>
          </div>

          {/* Core Rules */}
          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-white text-xs">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Stamina & Window Sills</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Climbing depletes stamina faster as you climb higher. <strong className="text-white">Windows are unclimbable glass!</strong> Scale the 7 brick wall columns between the windows.
            </p>
            <p className="text-[11px] text-emerald-300/90">
              Perch on any window sill to rest and recharge <strong className="text-white">+1%/sec</strong> stamina. You can walk sideways across sills!
            </p>
          </div>

          {/* Navigation Barriers */}
          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-white text-xs">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Navigation Barriers</span>
            </div>
            <p className="text-[11px] text-slate-300">
              You cannot climb straight up more than 4 floors without encountering barriers! Watch out for:
            </p>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                <span className="font-bold text-slate-200">Floor 4:</span> Window-washer scaffolding
              </div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                <span className="font-bold text-slate-200">Floor 7:</span> Maintenance platform
              </div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                <span className="font-bold text-slate-200">Floor 10:</span> "Never Give Up!" Banner
              </div>
              <div className="p-1.5 bg-slate-900 rounded border border-amber-500/40 bg-amber-950/30">
                <span className="font-bold text-amber-300">Floor 13:</span> Across-building detour!
              </div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                <span className="font-bold text-slate-200">Floor 17:</span> Eagle Nest 🦅
              </div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                <span className="font-bold text-slate-200">Floor 20:</span> "You can do it!" Banner
              </div>
            </div>
          </div>

          {/* Special Gadgets & Props */}
          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-white text-xs">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Interactive Shortcuts</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-300">
              <li>
                <strong className="text-cyan-300">🛝 Diagonal Slide (Floor 7 ➔ 6):</strong> Stand on Floor 7 Window 1 sill and press <span className="font-bold text-white">DOWN</span> to swoosh down to Floor 6!
              </li>
              <li>
                <strong className="text-indigo-300">🛸 Star Trek Teleport (Floor 12 ➔ 16):</strong> Stand on Floor 12 Window 3 sill and press <span className="font-bold text-white">DOWN</span> to energize and beam straight to Floor 16!
              </li>
              <li>
                <strong className="text-emerald-300">🌿 Tarzan Vine (Floor 8):</strong> Stand on Floor 8 Window 0 sill and press <span className="font-bold text-white">DOWN</span> to swing across 4 window sills in an arc!
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            Got It, Let's Climb!
          </button>
        </div>
      </div>
    </div>
  );
};
