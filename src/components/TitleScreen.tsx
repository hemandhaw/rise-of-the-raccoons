/**
 * Rise of the Raccoons! - Main Menu Page & Sub-Menus
 * 
 * Flow:
 * 1. Root Main Menu:
 *    - Title centered at the top: "Rise of the Raccoons!" + "Public Beta"
 *    - Only two options underneath: "Arcade" or "Brainpower"
 * 
 * 2. Arcade Sub-"Main Menu":
 *    - Title centered at top with Back to Mode button
 *    - Raccoon selection: Current raccoon slightly animated (resting animation), with scrolling carousel & "See all raccoons" button
 *    - Level selection: Current level to play, with scrolling carousel of other levels & "See all levels" button
 *    - Bottom buttons: Beta Feedback, How to Play, About, Share, Early Access Club!
 * 
 * 3. Brainpower Sub-"Main Menu":
 *    - Remains unchanged as requested, showing the K-6 learning mode preview and options to return or play Arcade.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  HelpCircle,
  Info,
  Share2,
  Sparkles,
  BookOpen,
  Play,
  Lock,
  X,
  MessageSquare,
  Star,
  ArrowLeft,
  ChevronRight,
  Layers,
  MapPin,
  Compass,
} from 'lucide-react';
import { HowToPlayModal } from './HowToPlayModal';
import { AboutModal } from './AboutModal';
import { ShareModal } from './ShareModal';
import { BetaFeedbackModal } from './BetaFeedbackModal';
import { EarlyAccessModal } from './EarlyAccessModal';
import { RACCOON_ROSTER, CharacterConfig, getCharacterConfig } from '../game/characterConfig';
import { LEVELS_ROSTER, LevelConfig, getLevelConfig } from '../game/levelConfig';
import { RaccoonPreview } from './RaccoonPreview';
import { LevelVisual } from './LevelVisual';
import { sound } from '../game/audio';

interface TitleScreenProps {
  onClimb: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  bestFloor?: number;
  onOpenFeedback?: () => void;
  onOpenEarlyAccess?: () => void;
  selectedCharacterId?: string;
  onSelectCharacter?: (charId: string) => void;
  onOpenCharacterSelect?: () => void;
  selectedLevelId?: string;
  onSelectLevel?: (levelId: string) => void;
  onOpenLevelSelect?: () => void;
  initialMenuMode?: 'ROOT' | 'ARCADE' | 'BRAINPOWER';
  onMenuModeChange?: (mode: 'ROOT' | 'ARCADE' | 'BRAINPOWER') => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onClimb,
  isMuted,
  onToggleMute,
  bestFloor = 1,
  onOpenFeedback,
  onOpenEarlyAccess,
  selectedCharacterId = 'mprraccoon',
  onSelectCharacter,
  onOpenCharacterSelect,
  selectedLevelId = 'st_paul',
  onSelectLevel,
  onOpenLevelSelect,
  initialMenuMode = 'ROOT',
  onMenuModeChange,
}) => {
  // Navigation mode: 'ROOT' (only Arcade or Brainpower) | 'ARCADE' | 'BRAINPOWER'
  const [menuMode, setMenuMode] = useState<'ROOT' | 'ARCADE' | 'BRAINPOWER'>(initialMenuMode);
  const [activeModal, setActiveModal] = useState<'howToPlay' | 'about' | 'share' | 'feedback' | 'earlyAccess' | null>(null);

  useEffect(() => {
    if (initialMenuMode) {
      setMenuMode(initialMenuMode);
    }
  }, [initialMenuMode]);

  const switchMenuMode = (mode: 'ROOT' | 'ARCADE' | 'BRAINPOWER') => {
    sound.playMenuClick();
    setMenuMode(mode);
    onMenuModeChange?.(mode);
  };

  const currentRaccoon = getCharacterConfig(selectedCharacterId);
  const currentLevel = getLevelConfig(selectedLevelId);

  // Keyboard shortcut: Enter or Space to progress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeModal !== null) return;
      if (e.key === 'Tab') return;
      if (e.key === 'Escape') {
        if (menuMode !== 'ROOT') {
          switchMenuMode('ROOT');
        }
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (menuMode === 'ROOT') {
          switchMenuMode('ARCADE');
        } else if (menuMode === 'ARCADE') {
          onClimb();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClimb, activeModal, menuMode]);

  const handleSelectRaccoon = (char: CharacterConfig) => {
    sound.playMenuClick();
    if (onSelectCharacter) {
      onSelectCharacter(char.id);
    }
  };

  const handleSelectLevel = (lvl: LevelConfig) => {
    sound.playMenuClick();
    if (lvl.status === 'playable') {
      if (onSelectLevel) {
        onSelectLevel(lvl.id);
      }
    } else {
      if (onOpenLevelSelect) {
        onOpenLevelSelect();
      }
    }
  };

  return (
    <>
      <div className="absolute inset-0 z-30 flex flex-col justify-between p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md text-[#fdf6ed] select-none overflow-hidden max-h-[100dvh]">
        {/* ========================================================================= */}
        {/* 1. ROOT MAIN MENU: TITLE CENTERED AT TOP & ONLY TWO OPTIONS UNDERNEATH   */}
        {/* ========================================================================= */}
        {menuMode === 'ROOT' && (
          <div className="flex-1 flex flex-col justify-between w-full max-w-xl mx-auto h-full py-1">
            {/* Top Bar with Center Title & Utility Badges */}
            <header className="shrink-0 flex items-center justify-between w-full py-2 px-1">
              {bestFloor > 1 ? (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#18181b]/90 border border-amber-500/40 text-[10px] sm:text-xs font-mono-nums font-bold text-[#facc15] shadow-md">
                  <span>🏆 BEST:</span>
                  <span>F{bestFloor < 10 ? `0${bestFloor}` : bestFloor}</span>
                </div>
              ) : (
                <div className="w-10" />
              )}

              <div className="flex flex-col items-center text-center">
                <span className="px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-[#ea733d] to-[#e51a24] text-white rounded-full shadow-md border border-yellow-400/50 mb-1">
                  Public Beta
                </span>
                <h1 className="text-2xl xs:text-3xl sm:text-4xl font-black text-[#e51a24] tracking-tight flex items-center justify-center gap-2 font-sans drop-shadow-[0_2px_12px_rgba(229,26,36,0.6)]">
                  <span>🦝</span>
                  <span className="text-[#fdf6ed]">Rise of the Raccoons!</span>
                </h1>
                <p className="text-xs sm:text-sm text-amber-200/80 font-medium mt-0.5">
                  The Great Urban Vertical Climb
                </p>
              </div>

              <button
                onClick={onToggleMute}
                className="p-2 rounded-xl bg-[#18181b]/90 hover:bg-[#27272a] text-[#fdf6ed] border border-[#ea733d]/50 hover:border-[#e51a24] transition-all focus:outline-none focus:ring-2 focus:ring-[#e51a24] cursor-pointer shadow-md active:scale-95"
                aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
                title={isMuted ? 'Unmute sound' : 'Mute sound'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-[#e51a24]" /> : <Volume2 className="w-4 h-4 text-[#16a34a]" />}
              </button>
            </header>

            {/* Middle: ONLY TWO OPTIONS UNDERNEATH: Arcade or Brainpower */}
            <main className="flex-1 flex flex-col items-center justify-center min-h-0 py-2 sm:py-6 px-2 w-full my-auto">
              <div className="w-full max-w-md flex flex-col gap-3 sm:gap-4">
                {/* 1. ARCADE OPTION */}
                <button
                  onClick={() => switchMenuMode('ARCADE')}
                  className="w-full p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#b91c1c]/90 via-[#c2410c]/90 to-[#7f1d1d]/90 hover:brightness-110 border-2 border-yellow-400/70 shadow-[0_8px_30px_rgba(229,26,36,0.4)] cursor-pointer transition-all duration-200 active:scale-98 text-left group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform pointer-events-none" />

                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-400/20 border border-yellow-300/40 text-yellow-300 text-[10px] font-black uppercase tracking-wider">
                      <Sparkles className="w-3 h-3 text-yellow-400" />
                      <span>THE VERTICAL CLIMB</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                      <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight mt-2 flex items-center gap-2">
                    <span>ARCADE</span>
                    <span className="text-xl">🏙️</span>
                  </h2>

                  <p className="text-xs sm:text-sm text-amber-100 font-medium mt-1 leading-snug">
                    Action, snacks & rooftop celebrations! Choose your raccoon, scale 25 stories, and dodge city hazards.
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-xs font-black text-yellow-300">
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Enter Arcade Sub-Menu ➔</span>
                  </div>
                </button>

                {/* 2. BRAINPOWER OPTION */}
                <button
                  onClick={() => switchMenuMode('BRAINPOWER')}
                  className="w-full p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#075985]/80 via-[#0369a1]/80 to-[#134e4a]/80 hover:brightness-110 border-2 border-sky-400/60 shadow-[0_8px_30px_rgba(2,132,199,0.3)] cursor-pointer transition-all duration-200 active:scale-98 text-left group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-sky-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform pointer-events-none" />

                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-400/20 border border-sky-300/40 text-sky-300 text-[10px] font-black uppercase tracking-wider">
                      <Lock className="w-3 h-3 text-sky-300" />
                      <span>KIDS K-6 LEARNING</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                      <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight mt-2 flex items-center gap-2">
                    <span>BRAINPOWER</span>
                    <span className="text-xl">🧠</span>
                  </h2>

                  <p className="text-xs sm:text-sm text-sky-100 font-medium mt-1 leading-snug">
                    Think. Climb. Learn! STEM puzzles, math teasers, and reading trivia along the sills.
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-xs font-black text-sky-300">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Explore Brainpower ➔</span>
                  </div>
                </button>
              </div>
            </main>

            {/* Bottom Tip */}
            <footer className="shrink-0 text-center py-2 text-[11px] text-slate-400 font-mono-nums">
              Select Arcade to climb now or Brainpower to explore learning mode
            </footer>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. ARCADE SUB-"MAIN MENU"                                                */}
        {/* ========================================================================= */}
        {menuMode === 'ARCADE' && (
          <div className="flex-1 flex flex-col justify-between w-full max-w-2xl md:max-w-none landscape:max-w-none h-full overflow-hidden px-1 sm:px-2 md:px-4 lg:px-6">
            {/* Top Bar with Back Button, Centered Title, and Audio Toggle */}
            <header className="shrink-0 flex items-center justify-between w-full py-1.5 px-1 border-b border-white/10">
              <button
                onClick={() => switchMenuMode('ROOT')}
                className="p-1.5 sm:p-2 rounded-xl bg-[#18181b]/90 hover:bg-[#27272a] text-[#fdf6ed] border border-[#ea733d]/50 hover:border-[#e51a24] transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-1 text-xs font-bold"
                aria-label="Back to Mode Selection"
              >
                <ArrowLeft className="w-4 h-4 text-[#ea733d]" />
                <span className="hidden xs:inline">Mode</span>
              </button>

              <div className="flex flex-col items-center text-center">
                <h1 className="text-xl xs:text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2 font-sans drop-shadow-md">
                  <span>🦝</span>
                  <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
                    Rise of the Raccoons!
                  </span>
                </h1>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-400">
                  Arcade Mode
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {bestFloor > 1 && (
                  <div className="hidden xs:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#18181b]/90 border border-amber-500/40 text-[10px] font-mono-nums font-bold text-[#facc15]">
                    <span>F{bestFloor < 10 ? `0${bestFloor}` : bestFloor}</span>
                  </div>
                )}
                <button
                  onClick={onToggleMute}
                  className="p-1.5 sm:p-2 rounded-xl bg-[#18181b]/90 hover:bg-[#27272a] text-[#fdf6ed] border border-[#ea733d]/50 hover:border-[#e51a24] transition-all cursor-pointer shadow-md active:scale-95"
                  aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
                  title={isMuted ? 'Unmute sound' : 'Mute sound'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-[#e51a24]" /> : <Volume2 className="w-4 h-4 text-[#16a34a]" />}
                </button>
              </div>
            </header>

            {/* Main Body: Raccoon Selection, Level Selection, and Paw Region (Simplified & Borderless) */}
            {/* Portrait: Stacked vertically */}
            {/* Horizontal (Mobile/Tablet landscape & Desktop): Arranged side-by-side filling the screen */}
            <main className="flex-1 min-h-0 overflow-y-auto px-1 sm:px-2 py-1.5 md:py-2.5 flex flex-col md:flex-row landscape:flex-row items-stretch justify-between gap-2 sm:gap-2.5 md:gap-3.5 lg:gap-5 my-auto w-full">
              {/* ITEM 1: CURRENT RACCOON SELECTION REGION (NO BORDER, SIMPLIFIED) */}
              <div
                className="flex-1 min-w-0 min-h-[96px] md:min-h-0 landscape:min-h-0 w-full md:w-1/3 landscape:w-1/3 rounded-2xl bg-gradient-to-r md:bg-gradient-to-b landscape:bg-gradient-to-b from-[#18181b]/95 via-[#18181b]/90 to-[#0f172a]/95 p-3 sm:p-4 shadow-lg flex flex-col justify-between items-center text-center relative overflow-hidden group"
              >
                {/* Current Raccoon Presentation */}
                <div className="flex flex-row md:flex-col landscape:flex-row sm:landscape:flex-col lg:flex-row items-center justify-center gap-3 sm:gap-3.5 my-auto w-full">
                  <div className="w-14 h-14 xs:w-16 xs:h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                    <RaccoonPreview
                      char={currentRaccoon}
                      size="medium"
                      animated={true}
                      isSmiling={true}
                    />
                  </div>

                  <div className="min-w-0 text-left md:text-center landscape:text-left sm:landscape:text-center lg:text-left">
                    <div className="flex items-center gap-1.5 justify-start md:justify-center landscape:justify-start sm:landscape:justify-center lg:justify-start">
                      <span className="text-base sm:text-lg">{currentRaccoon.badge}</span>
                      <h3 className="text-base sm:text-lg lg:text-xl font-black text-white truncate">
                        {currentRaccoon.name}
                      </h3>
                    </div>
                    <p
                      style={{ color: currentRaccoon.themeColor }}
                      className="text-xs sm:text-sm font-bold truncate mt-0.5"
                    >
                      {currentRaccoon.subtitle}
                    </p>
                    <p className="text-[10px] sm:text-xs text-slate-300 italic line-clamp-1 mt-0.5">
                      "{currentRaccoon.tagline}"
                    </p>
                  </div>
                </div>

                {/* "Select Raccoon" Button */}
                <button
                  onClick={() => {
                    sound.playMenuClick();
                    if (onOpenCharacterSelect) {
                      onOpenCharacterSelect();
                    }
                  }}
                  className="w-full max-w-xs py-2 sm:py-2.5 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-400/50 text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow shrink-0 mt-2"
                  title="Select Raccoon"
                >
                  <Layers className="w-4 h-4" />
                  <span>Select Raccoon</span>
                </button>
              </div>

              {/* ITEM 2: CURRENT LEVEL SELECTION REGION (NO BORDER, SIMPLIFIED) */}
              <div
                className="flex-1 min-w-0 min-h-[96px] md:min-h-0 landscape:min-h-0 w-full md:w-1/3 landscape:w-1/3 rounded-2xl bg-gradient-to-r md:bg-gradient-to-b landscape:bg-gradient-to-b from-[#18181b]/95 via-[#18181b]/90 to-[#0f172a]/95 p-3 sm:p-4 shadow-lg flex flex-col justify-between items-center text-center relative overflow-hidden group"
              >
                {/* Current Level Presentation */}
                <div className="flex flex-row md:flex-col landscape:flex-row sm:landscape:flex-col lg:flex-row items-center justify-center gap-3 sm:gap-3.5 my-auto w-full">
                  <div className="w-16 h-12 xs:w-18 xs:h-14 sm:w-22 sm:h-16 rounded-xl overflow-hidden flex items-center justify-center shrink-0 bg-black/40 border border-white/10 shadow-sm">
                    <LevelVisual level={currentLevel} size="small" showBadge={false} />
                  </div>

                  <div className="min-w-0 text-left md:text-center landscape:text-left sm:landscape:text-center lg:text-left">
                    <div className="flex items-center gap-1.5 justify-start md:justify-center landscape:justify-start sm:landscape:justify-center lg:justify-start">
                      <span className="text-base sm:text-lg">{currentLevel.badge}</span>
                      <h3 className="text-base sm:text-lg lg:text-xl font-black text-white truncate">
                        {currentLevel.name}
                      </h3>
                    </div>
                    <p
                      style={{ color: currentLevel.themeColor }}
                      className="text-xs sm:text-sm font-bold truncate mt-0.5"
                    >
                      {currentLevel.subtitle}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-300 truncate mt-0.5 justify-start md:justify-center landscape:justify-start sm:landscape:justify-center lg:justify-start">
                      <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                      <span className="truncate">{currentLevel.location}</span>
                    </div>
                  </div>
                </div>

                {/* "Select Level" Button */}
                <button
                  onClick={() => {
                    sound.playMenuClick();
                    if (onOpenLevelSelect) {
                      onOpenLevelSelect();
                    }
                  }}
                  className="w-full max-w-xs py-2 sm:py-2.5 px-4 rounded-xl bg-sky-500/20 hover:bg-sky-500/35 text-sky-300 border border-sky-400/50 text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow shrink-0 mt-2"
                  title="Select Level"
                >
                  <Compass className="w-4 h-4" />
                  <span>Select Level</span>
                </button>
              </div>

              {/* ITEM 3: GREEN "LET'S CLIMB!" PAW REGION (NO BORDER, SIMPLIFIED) */}
              <button
                onClick={() => onClimb()}
                className="flex-1 min-w-0 min-h-[96px] md:min-h-0 landscape:min-h-0 w-full md:w-1/3 landscape:w-1/3 rounded-2xl bg-gradient-to-r md:bg-gradient-to-b landscape:bg-gradient-to-b from-[#18181b]/95 via-[#18181b]/90 to-[#0f172a]/95 p-3 sm:p-4 shadow-lg flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer focus:outline-none transition-all active:scale-[0.98]"
                title="Start Climbing Now!"
                aria-label="Let's Climb!"
              >
                {/* Ambient glow in background of paw card */}
                <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />

                {/* Natural proportional paw ratio (approx 1.1:1, not horizontally stretched) */}
                <div className="h-full max-h-[140px] md:max-h-[180px] lg:max-h-[200px] aspect-[1.1/1] relative flex items-center justify-center filter drop-shadow-[0_8px_24px_rgba(34,197,94,0.6)] group-hover:drop-shadow-[0_12px_36px_rgba(34,197,94,0.85)] transition-all">
                  <svg
                    viewBox="0 0 220 200"
                    className="w-full h-full overflow-visible select-none"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <defs>
                      <linearGradient id="pawPalmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#059669" />
                        <stop offset="35%" stopColor="#10b981" />
                        <stop offset="70%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#15803d" />
                      </linearGradient>
                      <linearGradient id="pawToeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="50%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#047857" />
                      </linearGradient>
                      <linearGradient id="pawShineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                        <stop offset="60%" stopColor="#ffffff" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* 5 Raccoon Toe Pads with Claws (Curved in a natural paw semi-circle) */}
                    {/* Toe 1 (Far Left / Thumb) */}
                    <g className="transition-transform duration-200 group-hover:-translate-y-1">
                      <path d="M 30,60 L 23,50 L 36,58 Z" fill="#bbf7d0" stroke="#4ade80" strokeWidth="1" />
                      <ellipse cx="38" cy="76" rx="12" ry="18" transform="rotate(-32 38 76)" fill="url(#pawToeGrad)" stroke="#86efac" strokeWidth="3" />
                      <ellipse cx="38" cy="72" rx="7" ry="12" transform="rotate(-32 38 72)" fill="url(#pawShineGrad)" />
                    </g>

                    {/* Toe 2 (Inner Left) */}
                    <g className="transition-transform duration-200 group-hover:-translate-y-1.5">
                      <path d="M 69,32 L 66,20 L 75,30 Z" fill="#bbf7d0" stroke="#4ade80" strokeWidth="1" />
                      <ellipse cx="73" cy="52" rx="13" ry="20" transform="rotate(-15 73 52)" fill="url(#pawToeGrad)" stroke="#86efac" strokeWidth="3" />
                      <ellipse cx="73" cy="48" rx="8" ry="13" transform="rotate(-15 73 48)" fill="url(#pawShineGrad)" />
                    </g>

                    {/* Toe 3 (Middle / Tallest) */}
                    <g className="transition-transform duration-200 group-hover:-translate-y-2">
                      <path d="M 108,20 L 110,8 L 112,20 Z" fill="#bbf7d0" stroke="#4ade80" strokeWidth="1" />
                      <ellipse cx="110" cy="42" rx="14" ry="21" transform="rotate(0 110 42)" fill="url(#pawToeGrad)" stroke="#86efac" strokeWidth="3" />
                      <ellipse cx="110" cy="38" rx="8" ry="14" transform="rotate(0 110 38)" fill="url(#pawShineGrad)" />
                    </g>

                    {/* Toe 4 (Inner Right) */}
                    <g className="transition-transform duration-200 group-hover:-translate-y-1.5">
                      <path d="M 145,30 L 154,20 L 151,32 Z" fill="#bbf7d0" stroke="#4ade80" strokeWidth="1" />
                      <ellipse cx="147" cy="52" rx="13" ry="20" transform="rotate(15 147 52)" fill="url(#pawToeGrad)" stroke="#86efac" strokeWidth="3" />
                      <ellipse cx="147" cy="48" rx="8" ry="13" transform="rotate(15 147 48)" fill="url(#pawShineGrad)" />
                    </g>

                    {/* Toe 5 (Far Right / Pinky) */}
                    <g className="transition-transform duration-200 group-hover:-translate-y-1">
                      <path d="M 184,58 L 197,50 L 190,60 Z" fill="#bbf7d0" stroke="#4ade80" strokeWidth="1" />
                      <ellipse cx="182" cy="76" rx="12" ry="18" transform="rotate(32 182 76)" fill="url(#pawToeGrad)" stroke="#86efac" strokeWidth="3" />
                      <ellipse cx="182" cy="72" rx="7" ry="12" transform="rotate(32 182 72)" fill="url(#pawShineGrad)" />
                    </g>

                    {/* Main Natural Chubby Raccoon Palm Pad */}
                    <path
                      d="M 54,104 C 80,90 140,90 166,104 C 188,118 194,148 178,174 C 160,194 135,194 110,194 C 85,194 60,194 42,174 C 26,148 32,118 54,104 Z"
                      fill="url(#pawPalmGrad)"
                      stroke="#86efac"
                      strokeWidth="3.5"
                    />

                    {/* Palm Top Shine/Highlight */}
                    <path
                      d="M 64,112 C 86,100 134,100 156,112 C 172,124 176,142 166,156 C 146,146 128,142 110,142 C 92,142 74,146 54,156 C 44,142 48,124 64,112 Z"
                      fill="url(#pawShineGrad)"
                    />
                  </svg>

                  {/* Centered Overlay: Play Icon + "LET'S CLIMB!" Text inside the Palm Pad */}
                  <div className="absolute inset-x-0 bottom-2 top-[48%] flex flex-col items-center justify-center text-white pointer-events-none select-none px-1">
                    <Play className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 fill-current text-white group-hover:scale-115 transition-transform drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
                    <span className="font-black text-xs xs:text-sm sm:text-base md:text-lg tracking-wider text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] font-sans uppercase whitespace-nowrap mt-0.5">
                      LET'S CLIMB!
                    </span>
                  </div>
                </div>
              </button>
            </main>

            {/* Bottom Footer: Feedback, How to Play, About, Share (unchanged at the bottom) */}
            <footer className="shrink-0 w-full pt-1 pb-1.5 xs:pb-2 px-1">
              <div className="grid grid-cols-4 gap-1 xs:gap-1.5 max-w-xl md:max-w-2xl mx-auto">
                <button
                  onClick={() => onOpenFeedback ? onOpenFeedback() : setActiveModal('feedback')}
                  className="py-1.5 xs:py-2 px-1 rounded-xl bg-[#18181b]/90 hover:bg-[#27272a] text-amber-300 border border-amber-400/60 hover:border-amber-300 transition-all flex flex-col items-center justify-center gap-0.5 text-[9px] xs:text-[10px] sm:text-xs font-bold cursor-pointer shadow-md active:scale-95"
                  title="Beta Feedback"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span className="truncate w-full text-center">Feedback</span>
                </button>

                <button
                  onClick={() => setActiveModal('howToPlay')}
                  className="py-1.5 xs:py-2 px-1 rounded-xl bg-[#18181b]/90 hover:bg-[#27272a] text-[#fdf6ed] border border-[#ea733d]/40 hover:border-[#16a34a] transition-all flex flex-col items-center justify-center gap-0.5 text-[9px] xs:text-[10px] sm:text-xs font-bold cursor-pointer shadow-md active:scale-95"
                  title="How to Play"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#16a34a]" />
                  <span className="truncate w-full text-center">How to Play</span>
                </button>

                <button
                  onClick={() => setActiveModal('about')}
                  className="py-1.5 xs:py-2 px-1 rounded-xl bg-[#18181b]/90 hover:bg-[#27272a] text-[#fdf6ed] border border-[#ea733d]/40 hover:border-[#1ea7e1] transition-all flex flex-col items-center justify-center gap-0.5 text-[9px] xs:text-[10px] sm:text-xs font-bold cursor-pointer shadow-md active:scale-95"
                  title="About the Game"
                >
                  <Info className="w-3.5 h-3.5 text-[#1ea7e1]" />
                  <span className="truncate w-full text-center">About</span>
                </button>

                <button
                  onClick={() => setActiveModal('share')}
                  className="py-1.5 xs:py-2 px-1 rounded-xl bg-[#18181b]/90 hover:bg-[#27272a] text-[#fdf6ed] border border-[#ea733d]/40 hover:border-[#facc15] transition-all flex flex-col items-center justify-center gap-0.5 text-[9px] xs:text-[10px] sm:text-xs font-bold cursor-pointer shadow-md active:scale-95"
                  title="Share Game"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#facc15]" />
                  <span className="truncate w-full text-center">Share</span>
                </button>
              </div>
            </footer>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. BRAINPOWER SUB-"MAIN MENU" (UNCHANGED AS REQUESTED)                     */}
        {/* ========================================================================= */}
        {menuMode === 'BRAINPOWER' && (
          <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-4 px-2 w-full max-w-md mx-auto my-auto animate-fade-in">
            <div className="relative w-full bg-[#18181b] border-2 border-[#0284c7] rounded-3xl p-5 sm:p-6 shadow-2xl text-[#fdf6ed]">
              <button
                onClick={() => setMenuMode('ROOT')}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[#94a3b8] hover:text-[#fdf6ed] hover:bg-[#27272a] transition-colors cursor-pointer"
                aria-label="Back to Main Menu"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-[#38bdf8] text-xs font-black uppercase tracking-wider mb-2">
                <BookOpen className="w-4 h-4" />
                <span>COMING SOON</span>
              </div>

              <h3 className="text-2xl font-black text-white font-sans">
                BRAINPOWER LEVEL
              </h3>
              <p className="text-sm font-bold text-[#38bdf8] mt-0.5">
                Think. Climb. Learn! (Kids K-6)
              </p>

              <p className="text-xs text-[#cbd5e1] leading-relaxed mt-3">
                We are actively developing educational climbs tailored for students in kindergarten through 6th grade! 
                You will solve fun STEM puzzles, math teasers, and reading trivia along the sills to unlock special snacks and energetic boosts.
              </p>

              <div className="mt-4 p-3 rounded-xl bg-sky-950/40 border border-sky-500/30 text-xs text-sky-200 flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <span>In the meantime, head over to <strong>ARCADE</strong> to master the climbing walls and collect tasty treats!</span>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setMenuMode('ROOT')}
                  className="px-4 py-2 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Main Menu</span>
                </button>
                <button
                  onClick={() => {
                    sound.playMenuClick();
                    setMenuMode('ARCADE');
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#e51a24] to-[#ea580c] hover:brightness-110 text-xs font-black text-white shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play Arcade Now</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Modals for Feedback, Early Access, How to Play, About, Share */}
      {activeModal === 'feedback' && (
        <BetaFeedbackModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'earlyAccess' && (
        <EarlyAccessModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'howToPlay' && (
        <HowToPlayModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'about' && (
        <AboutModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'share' && (
        <ShareModal bestFloor={bestFloor} onClose={() => setActiveModal(null)} />
      )}
    </>
  );
};
