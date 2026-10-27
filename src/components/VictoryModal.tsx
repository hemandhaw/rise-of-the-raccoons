/**
 * Rise of the Raccoons! - Victory / Rooftop Reached Modal
 */

import React from 'react';
import { Trophy, RotateCcw, Home } from 'lucide-react';

interface VictoryModalProps {
  climbTimeSeconds: number;
  altitudeMeters: number;
  onClimbAgain: () => void;
  onMainMenu: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  climbTimeSeconds,
  altitudeMeters,
  onClimbAgain,
  onMainMenu,
}) => {
  const minutes = Math.floor(climbTimeSeconds / 60);
  const seconds = Math.floor(climbTimeSeconds % 60);
  const formattedTime = `${minutes > 0 ? `${minutes}m ` : ''}${seconds}s`;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-xs bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center space-y-5">
        {/* Trophy Emblem */}
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
          <Trophy className="w-7 h-7" />
        </div>

        <div>
          <div className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase font-mono-nums">
            CONQUEST COMPLETE
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mt-1">
            ROOFTOP REACHED!
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            You scaled all 25 floors of the skyscraper to the top water tower.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-2 gap-2 p-3 bg-slate-950/70 border border-slate-800 rounded-xl font-mono-nums">
          <div className="text-left">
            <div className="text-[10px] text-slate-400 uppercase">Climb Time</div>
            <div className="text-sm font-bold text-slate-100">{formattedTime}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase">Peak Altitude</div>
            <div className="text-sm font-bold text-amber-400">{altitudeMeters} m</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2.5">
          <button
            onClick={onClimbAgain}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Climb Again</span>
          </button>

          <button
            onClick={onMainMenu}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-slate-400 hover:text-white bg-transparent hover:bg-slate-800/60 transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
