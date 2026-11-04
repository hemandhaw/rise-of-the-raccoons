/**
 * Rise of the Raccoons! - Level Selection Screen
 * 
 * Features:
 * - Condensed 2-column scrolling grid of square-shaped level buttons.
 * - Shows: Level mini preview, Name, and Sub-name / status ("Playable" vs "Coming Soon!").
 * - When tapped/selected, enlarges the level with rich preview, landmark details, and:
 *   - Playable level: Two buttons: "Let's Climb!" and "Back".
 *   - Coming Soon level: Shows "Coming Soon!" info, and buttons "Back" and "Play St. Paul Now".
 * - Fully responsive for both portrait and horizontal mobile/desktop.
 */

import React, { useState } from 'react';
import { ArrowLeft, Volume2, VolumeX, Play, Lock, Sparkles, MapPin, Globe } from 'lucide-react';
import { LEVELS_ROSTER, LevelConfig, getLevelConfig } from '../game/levelConfig';
import { LevelVisual } from './LevelVisual';

interface LevelSelectScreenProps {
  selectedLevelId: string;
  onSelectLevel: (levelId: string) => void;
  onStartGame: (levelId?: string) => void;
  onBackToMenu: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const LevelSelectScreen: React.FC<LevelSelectScreenProps> = ({
  selectedLevelId,
  onSelectLevel,
  onStartGame,
  onBackToMenu,
  isMuted,
  onToggleMute,
}) => {
  const [selectedForDetail, setSelectedForDetail] = useState<LevelConfig | null>(null);

  const handleSelectLevel = (level: LevelConfig) => {
    setSelectedForDetail(level);
  };

  const handleBackToGrid = () => {
    setSelectedForDetail(null);
  };

  const handleStartClimbing = () => {
    if (selectedForDetail?.status === 'playable') {
      onSelectLevel(selectedForDetail.id);
      onStartGame(selectedForDetail.id);
    } else {
      // Default to St. Paul if currently selected level is coming soon
      onSelectLevel('st_paul');
      onStartGame('st_paul');
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md text-[#fdf6ed] select-none overflow-hidden max-h-[100dvh]">
      {/* Top Header */}
      <header className="shrink-0 flex items-center justify-between w-full max-w-xl mx-auto py-1 px-1 gap-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={selectedForDetail ? handleBackToGrid : onBackToMenu}
            className="p-1.5 sm:p-2 rounded-xl bg-[#18181b]/90 hover:bg-[#27272a] text-[#fdf6ed] border border-[#ea733d]/50 hover:border-[#e51a24] transition-all focus:outline-none focus:ring-2 focus:ring-[#e51a24] cursor-pointer shadow-md backdrop-blur-md active:scale-95 flex items-center gap-1 text-xs font-bold"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 text-[#ea733d]" />
            <span className="hidden xs:inline">{selectedForDetail ? 'All Levels' : 'Back'}</span>
          </button>

          <div>
            <h1 className="text-base xs:text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-1.5 font-sans">
              <span>{selectedForDetail ? selectedForDetail.name : 'Choose Level'}</span>
            </h1>
            <p className="text-[10px] text-amber-300 font-medium">
              {selectedForDetail ? selectedForDetail.subtitle : '44 Vertical Ascents Around the World & Beyond'}
            </p>
          </div>
        </div>

        <button
          onClick={onToggleMute}
          className="p-1.5 sm:p-2 rounded-xl bg-[#18181b]/90 hover:bg-[#27272a] text-[#fdf6ed] border border-[#ea733d]/50 hover:border-[#e51a24] transition-all focus:outline-none focus:ring-2 focus:ring-[#e51a24] cursor-pointer shadow-md backdrop-blur-md active:scale-95"
          aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
          title={isMuted ? 'Unmute sound' : 'Mute sound'}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-[#e51a24]" />
          ) : (
            <Volume2 className="w-4 h-4 text-[#16a34a]" />
          )}
        </button>
      </header>

      {/* Main Content: Enlarged View or 2-Column Scrolling Grid */}
      {selectedForDetail ? (
        /* ========================================================================= */
        /* ENLARGED LEVEL PREVIEW MODAL / VIEW                                      */
        /* ========================================================================= */
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-2 px-2 overflow-y-auto my-auto w-full max-w-md mx-auto">
          <div
            style={{
              borderColor: selectedForDetail.themeColor,
            }}
            className="w-full max-h-[88vh] overflow-y-auto flex flex-col items-center justify-between p-3 xs:p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#18181b] via-[#111827] to-[#090d16] border-2 shadow-2xl relative"
          >
            {/* Enlarged Level Visual Preview */}
            <div className="w-full flex flex-col items-center justify-center py-1">
              <LevelVisual level={selectedForDetail} size="large" showBadge={false} />
            </div>

            {/* Level Information */}
            <div className="w-full text-center mt-2.5 mb-3">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <span className="text-xl">{selectedForDetail.badge}</span>
                <h2 className="text-lg xs:text-xl sm:text-2xl font-black text-white tracking-tight font-sans">
                  {selectedForDetail.name}
                </h2>
              </div>

              <div className="flex items-center justify-center gap-2 mt-1">
                {selectedForDetail.status === 'playable' ? (
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500/90 text-white rounded-md shadow-md border border-emerald-300/60 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>PLAYABLE LEVEL</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 rounded-md shadow-md border border-amber-400/50 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>COMING SOON!</span>
                  </span>
                )}
                {selectedForDetail.heightLabel && (
                  <span className="px-2 py-0.5 text-[10px] font-bold text-slate-300 bg-white/5 rounded-md border border-white/10">
                    {selectedForDetail.heightLabel}
                  </span>
                )}
              </div>

              <p
                style={{ color: selectedForDetail.themeColor }}
                className="text-xs xs:text-sm font-extrabold tracking-tight mt-1.5"
              >
                {selectedForDetail.subtitle}
              </p>

              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mt-0.5">
                <MapPin className="w-3 h-3 text-red-400" />
                <span>{selectedForDetail.location}</span>
              </div>

              <p className="text-[11px] xs:text-xs text-slate-300 leading-relaxed max-w-sm mx-auto mt-2 p-2 rounded-xl bg-white/5 border border-white/10">
                {selectedForDetail.description}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="w-full grid grid-cols-2 gap-2.5 xs:gap-3 pt-1">
              <button
                onClick={handleBackToGrid}
                className="w-full py-2.5 xs:py-3 px-3 rounded-2xl bg-[#27272a] hover:bg-[#3f3f46] text-white text-xs xs:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer border border-slate-700"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              {selectedForDetail.status === 'playable' ? (
                <button
                  onClick={handleStartClimbing}
                  style={{
                    background: `linear-gradient(135deg, ${selectedForDetail.themeColor}, #ea580c)`,
                  }}
                  className="w-full py-2.5 xs:py-3 px-3 rounded-2xl text-slate-950 text-xs xs:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg hover:brightness-110 active:scale-95 cursor-pointer ring-2 ring-yellow-300/40"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Let's Climb!</span>
                </button>
              ) : (
                <button
                  onClick={handleStartClimbing}
                  className="w-full py-2.5 xs:py-3 px-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-700 text-white text-xs xs:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg hover:brightness-110 active:scale-95 cursor-pointer border border-yellow-400/50"
                  title="Climb St. Paul now while this level is under development"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play St. Paul</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* CONDENSED 2-COLUMN SCROLLING GRID OF SQUARE BUTTONS                      */
        /* ========================================================================= */
        <div className="flex-1 min-h-0 w-full max-w-xl mx-auto overflow-y-auto px-1 sm:px-2 py-2">
          <div className="grid grid-cols-2 gap-2 xs:gap-2.5 sm:gap-3 pb-3">
            {LEVELS_ROSTER.map((lvl) => {
              const isSelected = lvl.id === selectedLevelId;

              return (
                <button
                  key={lvl.id}
                  onClick={() => handleSelectLevel(lvl)}
                  style={{
                    borderColor: isSelected ? lvl.themeColor : 'rgba(255, 255, 255, 0.12)',
                    boxShadow: isSelected
                      ? `0 0 15px ${lvl.themeColor}40, 0 4px 14px rgba(0,0,0,0.6)`
                      : '0 4px 10px rgba(0,0,0,0.4)',
                  }}
                  className={`aspect-square w-full rounded-2xl bg-gradient-to-b from-[#18181b] to-[#0f172a] border-2 flex flex-col items-center justify-between p-2 xs:p-2.5 transition-all duration-150 cursor-pointer active:scale-95 hover:border-[#ea733d] focus:outline-none focus:ring-2 focus:ring-[#facc15] group relative overflow-hidden ${
                    isSelected ? 'ring-2 ring-offset-2 ring-offset-slate-950 ring-[#facc15]' : ''
                  }`}
                  aria-label={`Select level ${lvl.name}`}
                >
                  {/* Subtle top indicator if already equipped */}
                  {isSelected && (
                    <div
                      style={{ backgroundColor: lvl.themeColor }}
                      className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full shadow-sm z-30"
                    />
                  )}

                  {/* 1. Level Mini Preview Visual */}
                  <div className="flex-1 w-full min-h-0 flex items-center justify-center p-0.5">
                    <LevelVisual level={lvl} size="small" showBadge={true} />
                  </div>

                  {/* 2. Name & 3. Subtitle / Status */}
                  <div className="w-full text-center shrink-0 pt-1 pb-0.5">
                    <h3 className="text-xs xs:text-sm font-black text-white tracking-tight truncate w-full px-1 group-hover:text-[#fde047] transition-colors">
                      {lvl.name}
                    </h3>
                    <p
                      style={{ color: lvl.themeColor }}
                      className="text-[10px] xs:text-[11px] font-bold tracking-tight truncate w-full px-1 mt-0.5"
                    >
                      {lvl.status === 'playable' ? lvl.subtitle : 'Coming Soon!'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Safe bottom area tip */}
      {!selectedForDetail && (
        <div className="shrink-0 text-center py-1 text-[10px] text-slate-400 font-mono-nums">
          44 vertical landmarks · St. Paul Skyscraper ready to climb!
        </div>
      )}
    </div>
  );
};
