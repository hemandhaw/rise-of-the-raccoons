/**
 * Rise of the Raccoons! - Game Over / Out of Energy Modal
 * Displays funny, snarky, cheeky raccoon messages to never give up,
 * along with climb stats and a "Climb Again" button.
 */

import React, { useMemo } from 'react';
import { ZapOff, RotateCcw, Home, Sparkles } from 'lucide-react';

interface GameOverModalProps {
  currentFloor: number;
  totalFloors: number;
  altitudeMeters: number;
  bestFloor: number;
  onClimbAgain: () => void;
  onMainMenu: () => void;
}

const SNARKY_RACCOON_QUIPS = [
  "Ran out of dumpster juice! Gravity wins this round. Shake off the brick dust, paws up, and get back up there!",
  "Zero stamina, 100% raccoon drama. Did you skip breakfast pizza crusts? True bandits never quit!",
  "Your paws said 'nope', but your inner trash panda says 'one more try'. Penthouse bins await!",
  "Gravity: 1, Trash Panda: 0. Even alley cats have 9 lives—time to show this skyscraper who's boss!",
  "Battery depleted! Pro tip: catch your breath on window sills to recharge stamina before scaling higher!",
  "You call that climbing? Even an overfed possum scrambles faster. Shake it off and climb again!",
  "Dumpster fire of an attempt! But legends don't surrender to red brick. Climb again and take the roof!",
  "Paws slipped, pride hurt. But the shiny water tower at the top won't conquer itself. Never give up!"
];

export const GameOverModal: React.FC<GameOverModalProps> = ({
  currentFloor,
  totalFloors,
  altitudeMeters,
  bestFloor,
  onClimbAgain,
  onMainMenu,
}) => {
  // Pick a random cheeky motivational quip for this game over screen
  const cheekyMessage = useMemo(() => {
    const idx = Math.floor(Math.random() * SNARKY_RACCOON_QUIPS.length);
    return SNARKY_RACCOON_QUIPS[idx];
  }, []);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-5 bg-slate-950/85 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-xs bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center space-y-4">
        {/* Out of Energy Icon Badge */}
        <div className="relative">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
            <ZapOff className="w-7 h-7" />
          </div>
          <span className="absolute -bottom-1 -right-1 text-base">🦝</span>
        </div>

        {/* Header & Snarky Quip */}
        <div>
          <div className="text-[10px] font-bold tracking-widest text-amber-400 uppercase font-mono-nums">
            STAMINA DEPLETED • 0%
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
            OUT OF ENERGY!
          </h2>
          <div className="mt-2.5 px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl">
            <p className="text-xs text-amber-200/90 font-medium leading-relaxed italic">
              "{cheekyMessage}"
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-3 gap-2 p-3 bg-slate-950/70 border border-slate-800 rounded-xl font-mono-nums">
          <div className="text-center">
            <div className="text-[9px] text-slate-400 uppercase tracking-tight">Reached</div>
            <div className="text-xs font-bold text-slate-100 mt-0.5">
              F{currentFloor}<span className="text-[10px] text-slate-500">/{totalFloors}</span>
            </div>
          </div>
          <div className="text-center border-x border-slate-800/80">
            <div className="text-[9px] text-slate-400 uppercase tracking-tight">Altitude</div>
            <div className="text-xs font-bold text-amber-400 mt-0.5">{altitudeMeters}m</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-slate-400 uppercase tracking-tight">Best Floor</div>
            <div className="text-xs font-bold text-emerald-400 mt-0.5">F{bestFloor}</div>
          </div>
        </div>

        {/* Pro Tip */}
        <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Rest or crawl on window sills to recharge +1%/sec!</span>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2 pt-1">
          <button
            onClick={onClimbAgain}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer shadow-lg shadow-amber-500/25 active:scale-[0.98]"
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
