/**
 * Rise of the Raccoons! - Pause Modal
 */

import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';

interface PauseModalProps {
  currentFloor: number;
  altitudeMeters: number;
  bestFloor?: number;
  isMuted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  currentFloor,
  altitudeMeters,
  bestFloor,
  isMuted,
  onResume,
  onRestart,
  onMainMenu,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center space-y-5">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Game Paused
          </h2>
          <div className="text-xs font-mono-nums text-slate-400 mt-1">
            Current: Floor {currentFloor} {bestFloor ? `· Best: Floor ${bestFloor}` : ''} · {altitudeMeters} m
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2.5">
          <button
            onClick={onResume}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Resume Climb</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart from Ground</span>
          </button>

          <button
            onClick={onMainMenu}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-slate-400 hover:text-white bg-transparent hover:bg-slate-800/60 transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Main Menu</span>
          </button>
        </div>

        {/* Audio Toggle Footer */}
        <div className="pt-2 border-t border-slate-800 w-full flex items-center justify-between text-xs text-slate-400">
          <span>Audio Effects</span>
          <button
            onClick={onToggleMute}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                <span>Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Active</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
