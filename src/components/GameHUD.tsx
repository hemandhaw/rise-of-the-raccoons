/**
 * Rise of the Raccoons! - Low-Occlusion Game HUD
 * Replaces 'FL' with 'Floor', replaces Altitude meter and Boost badge with an Energy meter,
 * keeping >85% of playfield unobstructed.
 */

import React, { useState, useEffect } from 'react';
import { Pause, Volume2, VolumeX, Zap } from 'lucide-react';
import { FloatingPawController } from './FloatingPawController';
import { SpookToast } from '../game/types';

interface GameHUDProps {
  currentFloor: number;
  totalFloors: number;
  energy: number;
  isRestingOnSill: boolean;
  isSpeedBoosted?: boolean;
  isMuted: boolean;
  activeToast?: SpookToast | null;
  onPause: () => void;
  onToggleMute: () => void;
  onJoystickMove?: (x: number, y: number, distance: number, isBoosted?: boolean, isHolding?: boolean) => void;
  onJoystickEnd?: (wasQuickTap?: boolean) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  currentFloor,
  totalFloors,
  energy = 100,
  isRestingOnSill,
  isSpeedBoosted = false,
  isMuted,
  activeToast,
  onPause,
  onToggleMute,
  onJoystickMove,
  onJoystickEnd,
}) => {
  const [showControlsHint, setShowControlsHint] = useState(true);

  // Fade out bottom hint after 7 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowControlsHint(false), 7000);
    return () => clearTimeout(timer);
  }, []);

  const progressPct = Math.min(100, Math.round(((currentFloor - 1) / (totalFloors - 1)) * 100));
  const clampedEnergy = Math.max(0, Math.min(100, Math.round(energy)));

  return (
    <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between z-10">
      {/* Top Perimeter Status Cluster */}
      <div className="flex items-start justify-between">
        {/* Left Status: Floor & Energy Meter in Tabular Numerals */}
        <div className="bg-slate-950/85 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-3 shadow-md backdrop-blur-sm">
          {/* Mini Vertical Skyscraper Progress Gauge */}
          <div className="w-1.5 h-8 bg-slate-800 rounded-full overflow-hidden flex flex-col justify-end">
            <div
              className="w-full bg-emerald-400 rounded-full transition-all duration-300"
              style={{ height: `${progressPct}%` }}
            />
          </div>

          <div>
            <div className="text-[10px] text-slate-400 font-mono-nums uppercase tracking-wider">
              Skyscraper
            </div>
            <div className="text-base font-extrabold text-white font-mono-nums flex items-baseline gap-1">
              <span>Floor {currentFloor < 10 ? `0${currentFloor}` : currentFloor}</span>
              <span className="text-xs text-slate-400 font-medium">/ {totalFloors}</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 mx-0.5" />

          {/* Energy Meter (Replaces Altitude meter on desktop and Boost badge on mobile) */}
          <div className="flex flex-col justify-center">
            <div className="text-[10px] text-slate-400 font-mono-nums uppercase tracking-wider flex items-center gap-1">
              <Zap
                className={`w-3 h-3 ${
                  isSpeedBoosted
                    ? 'text-amber-400 fill-amber-400 animate-pulse'
                    : clampedEnergy > 20
                    ? 'text-emerald-400 fill-emerald-400'
                    : 'text-rose-400 fill-rose-400'
                }`}
              />
              <span>Energy</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-16 sm:w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    clampedEnergy > 45
                      ? 'bg-emerald-400'
                      : clampedEnergy > 18
                      ? 'bg-amber-400'
                      : 'bg-rose-500 animate-pulse'
                  }`}
                  style={{ width: `${clampedEnergy}%` }}
                />
              </div>
              <span className="text-xs font-bold font-mono-nums text-slate-200">
                {clampedEnergy}%
              </span>
            </div>
          </div>

          {isRestingOnSill && (
            <>
              <div className="h-6 w-px bg-slate-800 mx-0.5" />
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono-nums">
                  Sill Rest
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right Status: Interactive Buttons (pointer-events-auto) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleMute}
            className="w-9 h-9 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer backdrop-blur-sm"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={onPause}
            className="w-9 h-9 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer backdrop-blur-sm"
            aria-label="Pause Game"
            title="Pause Game (Esc)"
          >
            <Pause className="w-4 h-4 text-slate-200" />
          </button>
        </div>
      </div>

      {/* Humorous Spook Setback Pop-up Toast */}
      {activeToast && (
        <div className="pointer-events-none mt-2 w-full flex justify-center z-40 transition-all duration-300">
          <div
            className="px-4 py-2.5 rounded-xl border-2 shadow-2xl backdrop-blur-md flex items-center gap-3 bg-slate-950/95 max-w-md w-[92%] sm:w-auto animate-bounce-short"
            style={{ borderColor: activeToast.color || '#f59e0b' }}
          >
            <div className="text-2xl flex-shrink-0 animate-pulse">{activeToast.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  {activeToast.title}
                </span>
                <span
                  className="text-[10px] font-extrabold px-1.5 py-0.5 rounded text-white font-mono-nums flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: activeToast.color || '#ef4444' }}
                >
                  -{activeToast.floorsDown} {activeToast.floorsDown > 1 ? 'FLOORS' : 'FLOOR'}
                </span>
              </div>
              <p className="text-[11px] text-slate-200 font-medium leading-tight mt-0.5">
                {activeToast.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Floating Guidance Hint */}
      <div className="pointer-events-none mt-auto flex flex-col items-center mb-2 w-full z-30">
        {isRestingOnSill ? (
          <div className="mb-1 px-3 py-1.5 rounded-lg bg-emerald-950/90 border border-emerald-500/50 text-[11px] font-mono-nums text-emerald-200 shadow-xl text-center">
            Perched on Sill: <span className="text-white font-semibold">A / D</span> walk · <span className="text-white font-semibold">S / Down</span> descend
          </div>
        ) : showControlsHint ? (
          <div className="mb-1 px-3 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800/80 text-[11px] font-mono-nums text-slate-300 shadow-xl transition-opacity duration-500 text-center">
            <span className="text-emerald-400 font-semibold">WASD / Arrows</span> · <span className="text-emerald-400 font-semibold">Touch & Drag</span> · <span className="text-amber-400 font-semibold">⚡ Space / 2 Fingers to Boost</span>
          </div>
        ) : null}
      </div>

      {/* 
        Slither.io Style Floating Touch Controller:
        Spans the lower half of the screen; renders subtle semi-transparent paw where thumb lands
      */}
      {onJoystickMove && onJoystickEnd && (
        <FloatingPawController onMove={onJoystickMove} onEnd={onJoystickEnd} />
      )}
    </div>
  );
};
