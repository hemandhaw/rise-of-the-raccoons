/**
 * Rise of the Raccoons! - Main Menu / Title Screen
 * Minimalist, elegant title page:
 * Replaces start scene text with "Tap anywhere to start. Good luck!"
 * Removes personal best score and "Climb!" button to provide a completely unobstructed view of the raccoon.
 */

import React, { useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface TitleScreenProps {
  onClimb: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  bestFloor?: number;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onClimb,
  isMuted,
  onToggleMute,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') return;
      e.preventDefault();
      onClimb();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClimb]);

  return (
    <div
      onClick={onClimb}
      className="absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-5 pointer-events-auto cursor-pointer select-none bg-gradient-to-b from-slate-950/80 via-slate-950/20 to-transparent transition-opacity"
      role="button"
      tabIndex={0}
      aria-label="Tap anywhere to start. Good luck!"
    >
      {/* Top Header Row with Title & Unobtrusive Sound Toggle */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-400 uppercase">
              Vertical Arcade
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-none drop-shadow-md">
            RISE OF THE{' '}
            <span className="text-emerald-400 drop-shadow-[0_2px_10px_rgba(16,185,129,0.5)]">
              RACCOONS!
            </span>
          </h1>
        </div>

        {/* Sound Toggle Button (stops click propagation so sound can be toggled without launching) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMute();
          }}
          className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer shadow-md"
          aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
          title={isMuted ? 'Unmute sound' : 'Mute sound'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      {/* Prominent single call-to-action banner: "Tap anywhere to start. Good luck!" */}
      <div className="mt-3 sm:mt-4 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-950/75 border border-emerald-400/40 shadow-xl backdrop-blur-md animate-pulse">
          <span className="text-xs sm:text-sm font-bold tracking-wide text-emerald-300">
            Tap anywhere to start. Good luck!
          </span>
        </div>
      </div>

      {/* Vast unobstructed open area leaving full view of the skyscraper, ground, and peeking raccoon */}
      <div className="flex-1 pointer-events-none min-h-[160px]" />
    </div>
  );
};
