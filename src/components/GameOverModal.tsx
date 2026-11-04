/**
 * Rise of the Raccoons! - Game Over / Out of Energy Modal
 * Displays a close-up vector illustration of the cute raccoon in the alley trash can,
 * dozens of funny/snarky encouraging messages to never give up, climb stats, and "Climb Again" button.
 */

import React, { useMemo } from 'react';
import { RotateCcw, Home, Sparkles } from 'lucide-react';

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
  "Paws slipped, pride hurt. But the shiny water tower at the top won't conquer itself. Never give up!",
  "Look on the bright side: at least the trash can broke your fall! Now climb out and show that building some hustle!",
  "A minor setback for a major raccoon! The rooftop buffet is calling your name. Dust off your whiskers!",
  "Did a curious cat stare you down? Don't let a house pet intimidate a certified skyscraper bandit!",
  "Out of breath? Remember, window sills aren't just for looking cute—they restore your stamina for free!",
  "The view from floor 25 has gourmet bagels and warm sunshine. You really gonna quit down here in the alley?",
  "Paws cramp up? Grab a donut snack next time! Legends are forged in the climb, not in the can!",
  "Not bad for an amateur trash panda, but champions reach the water tower! Paws up, let's roll!",
  "That window washer was cheering for you! Don't let them see you give up now. Take a breath and scramble!",
  "You were so close you could practically smell the penthouse leftovers! Jump back onto that brick!",
  "Resting is allowed, quitting is strictly forbidden by the Raccoon Climbing Association!",
  "One does not simply walk away from a 25-floor skyscraper. Climb back out of that can, champ!",
  "Your little bandit mask wasn't made for sulking in the garbage. Get back on that wall and climb!",
  "Even superheroes slip on wet bricks. Real bandits bounce back faster than a launched pizza crust!",
  "The eagle at Floor 17 was expecting you! Don't leave him hanging. Climb again!",
  "Whoops! Looks like your sprint button got a little too enthusiastic. Pace yourself and conquer the peak!",
  "Stamina meter hit rock bottom, but your raccoon spirit never hits zero! Paws ready? Go!",
  "Those city pigeons are laughing at you from the telegraph wire. Are you gonna let them have the last laugh?",
  "A little brick dust in your fur builds character. The roof deck awaits the PAW-some chosen one!",
  "Nap time is over, little bandit! That water tower won't tag itself. One more try!",
  "You've survived alley cats, curious kids, and slipping squirrels. This skyscraper has nothing on you!",
  "Raccoon rule #1: If you fall into a trash can, pop back out with style and keep climbing!",
  "Snacks restore stamina, sills restore sanity. Use both and you'll be king of the skyline in no time!",
  "Failure is just nature's way of telling you to find a bigger pizza slice on floor 8. Let's go!",
  "Did the slide send you flying? That's what we call an express elevator! Climb right back up!",
  "Your ancestors scaled hollow oaks; you're tackling 25 floors of reinforced brick. You've got this!",
  "Shake your tail, flex those little black paws, and show this skyscraper who owns the night!",
  "Rooftop glory is only 25 floors away. What's a couple thousand bricks between friends? Climb again!",
  "Rome wasn't raided in a day, and neither is this high-rise. Brush off the banana peel and scramble!",
  "Every great bandit has an origin story. This is yours. Now climb back out of that dumpster!"
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
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md pointer-events-auto animate-fade-in">
      <div className="w-full max-w-sm max-h-[92vh] overflow-y-auto bg-slate-900 border-2 border-amber-500/50 rounded-2xl xs:rounded-3xl p-3.5 sm:p-5 shadow-2xl flex flex-col items-center text-center space-y-2.5 sm:space-y-3.5">
        
        {/* Close-Up Vector Illustration of Raccoon Nestled in Trash Can */}
        <div className="relative w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-xl" xmlns="http://www.w3.org/2000/svg">
            {/* Trash can body rim & interior */}
            <ellipse cx="80" cy="115" rx="55" ry="16" fill="#1e293b" />
            <path d="M 28 115 L 34 152 Q 80 162 126 152 L 132 115 Z" fill="#475569" stroke="#334155" strokeWidth="3" />
            <ellipse cx="80" cy="115" rx="52" ry="14" fill="#334155" />
            
            {/* Trash debris poking out */}
            {/* Fish skeleton */}
            <path d="M 42 108 L 26 95 M 34 102 L 30 96 M 38 105 L 36 99" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="26,95 21,90 22,99" fill="#f8fafc" />
            
            {/* Banana peel */}
            <path d="M 124 106 Q 138 98 142 110 Q 132 116 122 112" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
            <circle cx="140" cy="108" r="2" fill="#78350f" />

            {/* Apple core */}
            <ellipse cx="118" cy="118" rx="5" ry="7" fill="#ef4444" />
            <line x1="118" y1="111" x2="119" y2="107" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />

            {/* Raccoon Head poking out */}
            {/* Left ear */}
            <polygon points="46,62 38,32 64,48" fill="#302822" />
            <polygon points="48,58 42,38 60,49" fill="#fda4af" />
            
            {/* Right ear */}
            <polygon points="114,62 122,32 96,48" fill="#302822" />
            <polygon points="112,58 118,38 100,49" fill="#fda4af" />

            {/* Head base */}
            <ellipse cx="80" cy="68" rx="36" ry="30" fill="#66574a" />
            {/* Fluffy cheek tufts */}
            <polygon points="44,72 32,76 46,84" fill="#9e8c7c" />
            <polygon points="116,72 128,76 114,84" fill="#9e8c7c" />

            {/* Bandit Mask */}
            <path d="M 46 64 Q 80 58 114 64 Q 106 82 80 78 Q 54 82 46 64 Z" fill="#181513" />

            {/* White Eyebrows */}
            <ellipse cx="62" cy="55" rx="8" ry="4" transform="rotate(-10 62 55)" fill="#faf8f5" />
            <ellipse cx="98" cy="55" rx="8" ry="4" transform="rotate(10 98 55)" fill="#faf8f5" />

            {/* Cute big anime eyes */}
            <ellipse cx="63" cy="68" rx="8" ry="9" fill="#ffffff" />
            <ellipse cx="63" cy="67" rx="7" ry="8" fill="#e27d14" />
            <circle cx="63" cy="67" r="5" fill="#100d0b" />
            <circle cx="65" cy="65" r="2.5" fill="#ffffff" />

            <ellipse cx="97" cy="68" rx="8" ry="9" fill="#ffffff" />
            <ellipse cx="97" cy="67" rx="7" ry="8" fill="#e27d14" />
            <circle cx="97" cy="67" r="5" fill="#100d0b" />
            <circle cx="99" cy="65" r="2.5" fill="#ffffff" />

            {/* Snout */}
            <ellipse cx="80" cy="80" rx="14" ry="10" fill="#eee4d6" />
            <ellipse cx="80" cy="76" rx="5" ry="3.5" fill="#14110f" />
            <circle cx="78.5" cy="75" r="1" fill="#ffffff" />
            
            {/* Wistful determined mouth */}
            <path d="M 75 83 Q 80 86 85 83" fill="none" stroke="#302822" strokeWidth="2" strokeLinecap="round" />

            {/* Little band-aid on cheek */}
            <rect x="94" y="78" width="9" height="4" rx="1.5" transform="rotate(25 94 78)" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8" />

            {/* Paws gripping trash can rim */}
            <ellipse cx="50" cy="108" rx="9" ry="7" fill="#221c17" />
            <circle cx="45" cy="104" r="1.5" fill="#d5cec5" />
            <circle cx="49" cy="103" r="1.5" fill="#d5cec5" />
            <circle cx="53" cy="104" r="1.5" fill="#d5cec5" />

            <ellipse cx="110" cy="108" rx="9" ry="7" fill="#221c17" />
            <circle cx="107" cy="104" r="1.5" fill="#d5cec5" />
            <circle cx="111" cy="103" r="1.5" fill="#d5cec5" />
            <circle cx="115" cy="104" r="1.5" fill="#d5cec5" />

            {/* Silver Trash Can Rim Highlight */}
            <path d="M 28 115 Q 80 124 132 115" fill="none" stroke="#94a3b8" strokeWidth="3" />
          </svg>

          {/* Comedic sweat drop badge */}
          <span className="absolute -top-1 -right-1 text-2xl animate-bounce-short">💧</span>
        </div>

        {/* Header & Snarky Quip */}
        <div>
          <div className="text-[10px] font-black tracking-widest text-amber-400 uppercase font-mono-nums">
            STAMINA DEPLETED • ALLEY REBOUND
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
            OUT OF ENERGY!
          </h2>
          <div className="mt-2 px-3.5 py-2.5 bg-slate-950/80 border border-amber-500/30 rounded-2xl shadow-inner">
            <p className="text-xs text-amber-200/95 font-medium leading-relaxed italic">
              "{cheekyMessage}"
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-3 gap-2 p-3 bg-slate-950/70 border border-slate-800 rounded-2xl font-mono-nums">
          <div className="text-center">
            <div className="text-[9px] text-slate-400 uppercase tracking-tight">Reached</div>
            <div className="text-sm font-extrabold text-slate-100 mt-0.5">
              Floor {currentFloor < 10 ? `0${currentFloor}` : currentFloor}
              <span className="text-[10px] text-slate-500 block font-normal">of {totalFloors}</span>
            </div>
          </div>
          <div className="text-center border-x border-slate-800/80">
            <div className="text-[9px] text-slate-400 uppercase tracking-tight">Altitude</div>
            <div className="text-sm font-extrabold text-amber-400 mt-0.5">{altitudeMeters}m</div>
            <span className="text-[10px] text-slate-500 block font-normal">above street</span>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-slate-400 uppercase tracking-tight">Best Record</div>
            <div className="text-sm font-extrabold text-emerald-400 mt-0.5">Floor {bestFloor}</div>
            <span className="text-[10px] text-slate-500 block font-normal">personal best</span>
          </div>
        </div>

        {/* Pro Tip */}
        <div className="text-[11px] text-slate-300 flex items-center justify-center gap-1.5 px-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Rest or crawl on window sills to recharge +1%/sec!</span>
        </div>

        {/* Action Buttons - shrink-0 to guarantee they are never clipped */}
        <div className="shrink-0 w-full space-y-2 pt-1">
          <button
            onClick={onClimbAgain}
            className="w-full py-3.5 px-4 rounded-xl font-black text-sm text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer shadow-lg shadow-amber-500/25 active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Climb Again</span>
          </button>

          <button
            onClick={onMainMenu}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-400 hover:text-white bg-slate-950/60 hover:bg-slate-800/60 transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer border border-slate-800/60"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
