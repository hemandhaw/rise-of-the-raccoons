/**
 * Rise of the Raccoons! - Low-Occlusion Game HUD
 * Replaces 'FL' with 'Floor', replaces Altitude meter and Boost badge with an Energy meter,
 * keeping >85% of playfield unobstructed.
 */

import React, { useState, useEffect } from 'react';
import { Pause, Volume2, VolumeX, Zap, Target } from 'lucide-react';
import { FloatingPawController } from './FloatingPawController';
import { SpookToast } from '../game/types';

interface GameHUDProps {
  currentFloor: number;
  totalFloors: number;
  energy: number;
  isRestingOnSill: boolean;
  currentSpeedRatio?: number;
  isSpeedBoosted?: boolean;
  boostCooldownTimer?: number;
  boostActiveTimer?: number;
  isMuted: boolean;
  activeToast?: SpookToast | null;
  interactionPrompt?: string | null;
  halfwayMilestoneTimer?: number;
  onDismissHalfwayMilestone?: () => void;
  weather?: import('../game/types').WeatherState;
  onCycleWeather?: () => void;
  onOpenMissions?: () => void;
  onPause: () => void;
  onToggleMute: () => void;
  onSpeedBoost?: (isBoosted: boolean) => void;
  onJoystickMove?: (x: number, y: number, distance: number, isBoosted?: boolean, isHolding?: boolean) => void;
  onJoystickEnd?: (wasQuickTap?: boolean) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  currentFloor,
  totalFloors,
  energy = 100,
  isRestingOnSill,
  currentSpeedRatio = 1.0,
  isSpeedBoosted = false,
  boostCooldownTimer = 0,
  boostActiveTimer = 0,
  isMuted,
  activeToast,
  interactionPrompt,
  halfwayMilestoneTimer,
  onDismissHalfwayMilestone,
  weather,
  onCycleWeather,
  onOpenMissions,
  onPause,
  onToggleMute,
  onSpeedBoost,
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
  const displaySpeedPct = Math.round((currentSpeedRatio ?? 1.0) * 100);

  const isBurstAllowed = currentFloor <= 17;
  const isBurstOnCooldown = (boostCooldownTimer ?? 0) > 0.05;

  return (
    <div className="absolute inset-0 pointer-events-none p-3 sm:p-4 flex flex-col justify-between z-10">
      {/* Top Perimeter Status Cluster */}
      <div className="flex items-start justify-between gap-2">
        {/* Left Status: Floor, Energy & Dynamic Climb Speed Meter in Tabular Numerals */}
        <div className="bg-[#18181b]/95 border border-[#ea733d]/50 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3 shadow-xl backdrop-blur-md max-w-[calc(100%-105px)] sm:max-w-none flex-wrap sm:flex-nowrap">
          {/* Mini Vertical Skyscraper Progress Gauge (Storybook Sky Cyan) */}
          <div className="w-1.5 h-8 bg-[#27272a] rounded-full overflow-hidden flex flex-col justify-end">
            <div
              className="w-full bg-[#1ea7e1] rounded-full transition-all duration-300"
              style={{ height: `${progressPct}%` }}
            />
          </div>

          <div>
            <div className="text-[10px] text-[#ea733d] font-mono-nums font-bold uppercase tracking-wider">
              Floor
            </div>
            <div className="text-sm sm:text-base font-black text-[#fdf6ed] font-mono-nums flex items-baseline gap-1">
              <span>{currentFloor < 10 ? `0${currentFloor}` : currentFloor}</span>
              <span className="text-xs text-[#94a3b8] font-medium">/ {totalFloors}</span>
            </div>
          </div>

          <div className="h-6 w-px bg-[#3f3f46]/60 mx-0.5" />

          {/* Energy Meter with Book Cover Palette */}
          <div className="flex flex-col justify-center">
            <div className="text-[10px] text-[#fdf6ed]/80 font-mono-nums uppercase tracking-wider flex items-center gap-1 font-bold">
              <Zap
                className={`w-3 h-3 ${
                  clampedEnergy > 20
                    ? 'text-[#16a34a] fill-[#16a34a]'
                    : 'text-[#e51a24] fill-[#e51a24]'
                }`}
              />
              <span>Energy</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
              <div className="w-14 sm:w-20 h-2 bg-[#27272a] rounded-full overflow-hidden border border-[#3f3f46]/40">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    clampedEnergy > 45
                      ? 'bg-[#16a34a]'
                      : clampedEnergy > 18
                      ? 'bg-[#facc15]'
                      : 'bg-[#e51a24] animate-pulse'
                  }`}
                  style={{ width: `${clampedEnergy}%` }}
                />
              </div>
              <span className="text-xs font-black font-mono-nums text-[#fdf6ed]">
                {clampedEnergy}%
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-[#3f3f46]/60 mx-0.5" />

          {/* Energy-Dependent Speed Indicator & Active Boost Badge */}
          <div className="flex flex-col justify-center">
            <div className="text-[9px] uppercase tracking-wider font-mono-nums font-bold text-[#94a3b8] flex items-center gap-1">
              Speed
              {isSpeedBoosted && (
                <span className="text-[8px] bg-[#facc15] text-[#18181b] font-black px-1 rounded-sm animate-pulse">
                  BURST
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-10 sm:w-12 h-1.5 bg-[#27272a] rounded-full overflow-hidden border border-[#3f3f46]/40">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    isSpeedBoosted
                      ? 'bg-[#facc15] shadow-[0_0_8px_#facc15]'
                      : displaySpeedPct >= 80
                      ? 'bg-[#16a34a]'
                      : displaySpeedPct >= 50
                      ? 'bg-[#facc15]'
                      : 'bg-[#ea733d]'
                  }`}
                  style={{ width: `${Math.min(100, isSpeedBoosted ? 100 : displaySpeedPct)}%` }}
                />
              </div>
              <span
                className={`text-[10px] font-black font-mono-nums ${
                  isSpeedBoosted
                    ? 'text-[#facc15]'
                    : displaySpeedPct >= 80
                    ? 'text-[#16a34a]'
                    : displaySpeedPct >= 50
                    ? 'text-[#facc15]'
                    : 'text-[#ea733d]'
                }`}
              >
                {displaySpeedPct}%
              </span>
            </div>
          </div>

          {isRestingOnSill && (
            <>
              <div className="h-6 w-px bg-[#3f3f46]/60 mx-0.5" />
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
                <span className="text-[10px] font-black text-[#16a34a] uppercase tracking-wider font-mono-nums">
                  Resting +⚡
                </span>
              </div>
            </>
          )}

          {weather && (
            <>
              <div className="h-6 w-px bg-[#3f3f46]/60 mx-0.5" />
              <button
                onClick={onCycleWeather}
                title={`Current Weather: ${weather.type.toUpperCase()} (Click to toggle)`}
                className="pointer-events-auto flex items-center gap-1.5 bg-[#27272a]/90 hover:bg-[#3f3f46] border border-[#ea733d]/40 rounded-lg px-2 py-0.5 transition-all cursor-pointer active:scale-95"
              >
                <span className="text-xs">
                  {weather.type === 'rain' ? '🌧️' : weather.type === 'snow' ? '❄️' : '☀️'}
                </span>
                <span className={`text-[9px] font-black uppercase font-mono-nums tracking-wide ${
                  weather.type === 'rain' ? 'text-[#38bdf8]' : weather.type === 'snow' ? 'text-[#e0f2fe]' : 'text-[#facc15]'
                }`}>
                  {weather.type === 'rain' ? 'Rain (-15%)' : weather.type === 'snow' ? 'Snow (-20%)' : 'Clear'}
                </span>
              </button>
            </>
          )}
        </div>

        {/* Right Status: Interactive Buttons (Missions, Mute & Pause) - Prominently visible on mobile & desktop */}
        <div className="flex items-center gap-2 pointer-events-auto flex-shrink-0 z-20">
          {onOpenMissions && (
            <button
              onClick={onOpenMissions}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#18181b]/95 hover:bg-[#27272a] border-2 border-[#ea733d]/70 flex items-center justify-center text-[#facc15] transition-all focus:outline-none focus:ring-2 focus:ring-[#ea733d] cursor-pointer shadow-xl backdrop-blur-md active:scale-95"
              aria-label="Daily Missions"
              title="Daily Missions"
            >
              <Target className="w-5 h-5 text-[#ea733d]" />
            </button>
          )}

          <button
            onClick={onToggleMute}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#18181b]/95 hover:bg-[#27272a] border-2 border-[#ea733d]/70 flex items-center justify-center text-[#fdf6ed] transition-all focus:outline-none focus:ring-2 focus:ring-[#e51a24] cursor-pointer shadow-xl backdrop-blur-md active:scale-95"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-[#e51a24]" /> : <Volume2 className="w-5 h-5 text-[#16a34a]" />}
          </button>

          <button
            onClick={onPause}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#18181b]/95 hover:bg-[#27272a] border-2 border-[#ea733d]/70 flex items-center justify-center text-white transition-all focus:outline-none focus:ring-2 focus:ring-[#e51a24] cursor-pointer shadow-xl backdrop-blur-md active:scale-95"
            aria-label="Pause Game"
            title="Pause Game (Esc)"
          >
            <Pause className="w-5 h-5 text-white fill-current" />
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

      {/* Large Halfway Milestone Pop-up Message */}
      {halfwayMilestoneTimer !== undefined && halfwayMilestoneTimer > 0 && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50 p-4">
          <div
            onClick={onDismissHalfwayMilestone}
            className="pointer-events-auto max-w-sm sm:max-w-md w-full p-5 sm:p-7 rounded-3xl bg-gradient-to-b from-slate-900/98 via-slate-950/98 to-slate-900/98 border-3 border-yellow-400 shadow-[0_0_60px_rgba(250,204,21,0.55)] text-center transform animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden backdrop-blur-xl cursor-pointer"
          >
            {/* Ambient golden glow */}
            <div className="absolute -top-12 -left-12 w-36 h-36 bg-yellow-400/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/20 border border-yellow-300/60 text-yellow-300 text-[11px] sm:text-xs font-black uppercase tracking-widest mb-2.5 shadow-sm">
              <span className="text-yellow-400">⭐</span>
              <span>HALFWAY MILESTONE</span>
              <span className="text-yellow-400">⭐</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white font-sans tracking-tight drop-shadow-[0_2px_10px_rgba(250,204,21,0.5)]">
              You're halfway there!
            </h2>

            <p className="text-xs sm:text-sm text-amber-200 font-semibold mt-2 leading-snug">
              Floor 13 of 25 conquered! The rooftop is within reach!
            </p>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-center gap-2 sm:gap-3">
              <span className="text-xl sm:text-2xl">🦝</span>
              <div className="h-3 w-36 sm:w-44 bg-slate-800 rounded-full overflow-hidden border border-yellow-400/40 p-0.5">
                <div className="h-full bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 rounded-full w-1/2 animate-pulse" />
              </div>
              <span className="text-xl sm:text-2xl">🏆</span>
            </div>

            <div className="mt-3 text-[10px] sm:text-xs text-yellow-300/80 font-bold uppercase tracking-wider">
              Tap anywhere to dismiss
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Floating Guidance Hint & Interactive Element Prompts */}
      <div className="pointer-events-none mt-auto flex flex-col items-center mb-2 w-full z-30">
        {interactionPrompt && (
          <div className="mb-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 font-black text-xs shadow-2xl animate-bounce border-2 border-amber-200 pointer-events-auto">
            {interactionPrompt}
          </div>
        )}
        {isRestingOnSill ? (
          <div className="mb-1 px-3 py-1.5 rounded-lg bg-emerald-950/90 border border-emerald-500/50 text-[11px] font-mono-nums text-emerald-200 shadow-xl text-center">
            Perched on Sill: <span className="text-white font-semibold">A / D</span> walk · <span className="text-white font-semibold">S / Down</span> descend
          </div>
        ) : showControlsHint ? (
          <div className="mb-1 px-3 py-1.5 rounded-lg bg-[#18181b]/95 border border-[#ea733d]/50 text-[11px] font-mono-nums text-[#fdf6ed] shadow-xl transition-opacity duration-500 text-center">
            <span className="text-[#1ea7e1] font-semibold">WASD / Arrows</span> · <span className="text-[#16a34a] font-semibold">Speed depends on Energy</span> · <span className="text-[#facc15] font-semibold">Space / Shift: ⚡ Burst (Floors 1-17)</span>
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
