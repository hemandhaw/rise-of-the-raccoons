/**
 * Rise of the Raccoons! - Character Selection Screen
 * 
 * Features:
 * - Condensed 2-column scrolling grid of square-shaped raccoon buttons.
 * - Shows strictly: Raccoon avatar, Name, and Sub-name (all clutter removed).
 * - When tapped/selected, enlarges the raccoon with a smiling expression.
 * - Displays exactly two buttons in the enlarged view: "Let's Climb!" and "Back".
 * - All 12 raccoons share identical physics and climbing hitboxes.
 * - Modular art replacement hooks: Supports custom image URLs/sprites via characterConfig.
 */

import React, { useState } from 'react';
import { ArrowLeft, Volume2, VolumeX, Play, Sparkles } from 'lucide-react';
import { RACCOON_ROSTER, CharacterConfig, getCharacterConfig } from '../game/characterConfig';

interface CharacterSelectScreenProps {
  selectedCharacterId: string;
  onSelectCharacter: (characterId: string) => void;
  onStartGame: (characterId: string) => void;
  onBackToMenu: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

/**
 * Procedural & Modular Raccoon Visual Renderer
 * Renders vector placeholder or modular custom sprite image.
 * In enlarged view, renders a smiling, happy expression with rosy cheeks and open smile.
 */
const RaccoonVisual: React.FC<{
  char: CharacterConfig;
  size?: 'small' | 'large';
  isSmiling?: boolean;
}> = ({ char, size = 'small', isSmiling = false }) => {
  // Modular art hook: If custom external image is provided, display it
  if (char.imageUrl) {
    return (
      <div className={`relative flex items-center justify-center ${size === 'large' ? 'w-36 h-36' : 'w-16 h-16'}`}>
        <img
          src={char.imageUrl}
          alt={char.name}
          className="w-full h-full object-contain filter drop-shadow-md"
        />
      </div>
    );
  }

  const isLarge = size === 'large';

  // Dimension scaling
  const earW = isLarge ? 'w-5 h-7' : 'w-3 h-4';
  const earInnerW = isLarge ? 'w-2.5 h-3.5' : 'w-1.5 h-2';
  const headW = isLarge ? 'w-24 h-20' : 'w-12 h-10';
  const maskW = isLarge ? 'w-20 h-8' : 'w-10 h-4';
  const snoutW = isLarge ? 'w-11 h-7' : 'w-5.5 h-3.5';
  const noseW = isLarge ? 'w-3 h-2' : 'w-1.5 h-1';

  return (
    <div className={`relative flex items-center justify-center select-none ${isLarge ? 'py-2' : 'py-1'}`}>
      {/* Outer ambient theme glow */}
      <div
        style={{ backgroundColor: char.themeColor }}
        className={`absolute rounded-full blur-xl pointer-events-none transition-all duration-300 ${
          isLarge ? 'w-32 h-32 opacity-35' : 'w-14 h-14 opacity-25 group-hover:opacity-50'
        }`}
      />

      {/* Decorative effect for rainbow or sparkles */}
      {char.accessory.type === 'rainbow_trail' && (
        <div
          className={`absolute rounded-full blur-md opacity-40 pointer-events-none ${
            isLarge ? 'w-40 h-40 bg-gradient-to-r from-red-500 via-yellow-400 to-purple-500 animate-spin' : 'w-16 h-16 bg-gradient-to-r from-pink-500 to-cyan-500'
          }`}
          style={{ animationDuration: '8s' }}
        />
      )}

      {/* Character Vector Silhouette Representation */}
      <div className="relative flex flex-col items-center">
        {/* Ears */}
        <div className={`flex justify-between ${isLarge ? 'w-18 -mb-1.5' : 'w-9 -mb-1'}`}>
          <div
            style={{ backgroundColor: char.palette.furDark }}
            className={`${earW} rounded-t-full border border-black/40 flex items-center justify-center shadow-sm`}
          >
            <div
              style={{ backgroundColor: char.palette.earInner }}
              className={`${earInnerW} rounded-t-full`}
            />
          </div>
          <div
            style={{ backgroundColor: char.palette.furDark }}
            className={`${earW} rounded-t-full border border-black/40 flex items-center justify-center shadow-sm`}
          >
            <div
              style={{ backgroundColor: char.palette.earInner }}
              className={`${earInnerW} rounded-t-full`}
            />
          </div>
        </div>

        {/* Head */}
        <div
          style={{ backgroundColor: char.palette.furMain }}
          className={`relative ${headW} rounded-2xl flex items-center justify-center shadow-lg border-2 border-black/40`}
        >
          {/* Bandit Mask */}
          <div
            style={{ backgroundColor: char.palette.mask }}
            className={`absolute ${isLarge ? 'top-3' : 'top-1.5'} ${maskW} rounded-full flex items-center justify-around px-1 z-10 shadow-inner`}
          >
            {/* Eyes */}
            {isSmiling && isLarge ? (
              // Smiling happy anime/cartoon eyes
              <>
                <div className="relative flex flex-col items-center justify-center">
                  <svg className="w-5 h-3.5" viewBox="0 0 20 14" fill="none">
                    <path
                      d="M 2 11 Q 10 2 18 11"
                      stroke={char.palette.eyePupil || '#18181b'}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Rosy blush cheek */}
                  <div className="w-3.5 h-1.5 rounded-full bg-rose-400/60 blur-[0.5px] mt-0.5" />
                </div>
                <div className="relative flex flex-col items-center justify-center">
                  <svg className="w-5 h-3.5" viewBox="0 0 20 14" fill="none">
                    <path
                      d="M 2 11 Q 10 2 18 11"
                      stroke={char.palette.eyePupil || '#18181b'}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Rosy blush cheek */}
                  <div className="w-3.5 h-1.5 rounded-full bg-rose-400/60 blur-[0.5px] mt-0.5" />
                </div>
              </>
            ) : (
              // Normal eyes
              <>
                <div
                  style={{ backgroundColor: char.palette.eyeWhite }}
                  className={`${isLarge ? 'w-4.5 h-4.5' : 'w-2.5 h-2.5'} rounded-full flex items-center justify-center relative shadow-xs`}
                >
                  <div
                    style={{ backgroundColor: char.palette.eyeIris }}
                    className={`${isLarge ? 'w-3 h-3' : 'w-1.5 h-1.5'} rounded-full flex items-center justify-center`}
                  >
                    <div
                      style={{ backgroundColor: char.palette.eyePupil }}
                      className={`${isLarge ? 'w-1.5 h-1.5' : 'w-1 h-1'} rounded-full`}
                    />
                  </div>
                </div>
                <div
                  style={{ backgroundColor: char.palette.eyeWhite }}
                  className={`${isLarge ? 'w-4.5 h-4.5' : 'w-2.5 h-2.5'} rounded-full flex items-center justify-center relative shadow-xs`}
                >
                  <div
                    style={{ backgroundColor: char.palette.eyeIris }}
                    className={`${isLarge ? 'w-3 h-3' : 'w-1.5 h-1.5'} rounded-full flex items-center justify-center`}
                  >
                    <div
                      style={{ backgroundColor: char.palette.eyePupil }}
                      className={`${isLarge ? 'w-1.5 h-1.5' : 'w-1 h-1'} rounded-full`}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Snout & Nose & Smile */}
          <div
            style={{ backgroundColor: char.palette.snout }}
            className={`absolute ${isLarge ? '-bottom-1.5' : '-bottom-0.5'} ${snoutW} rounded-full flex flex-col items-center justify-start pt-0.5 z-20 shadow-md border border-black/10`}
          >
            {/* Nose */}
            <div
              style={{ backgroundColor: char.palette.nose }}
              className={`${noseW} rounded-full`}
            />

            {/* Cheerful Smiling Expression */}
            {isSmiling && isLarge ? (
              <svg className="w-6 h-3.5 -mt-0.5" viewBox="0 0 24 14" fill="none">
                {/* Cheerful open mouth with pink tongue */}
                <path
                  d="M 3 2 Q 12 14 21 2"
                  stroke="#18181b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="#991b1b"
                />
                <path
                  d="M 7 7 Q 12 12 17 7"
                  fill="#f472b6"
                />
              </svg>
            ) : isSmiling ? (
              <svg className="w-3.5 h-2 mt-0.5" viewBox="0 0 16 8" fill="none">
                <path
                  d="M 2 2 Q 8 8 14 2"
                  stroke="#18181b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            ) : null}
          </div>

          {/* Unique Character Accessories */}
          {char.accessory.type === 'tiara' && (
            <div className={`absolute ${isLarge ? '-top-5 text-2xl' : '-top-3 text-xs'} filter drop-shadow animate-bounce`} style={{ animationDuration: '2s' }}>
              👑
            </div>
          )}
          {char.accessory.type === 'chef_hat' && (
            <div className={`absolute ${isLarge ? '-top-7 text-3xl' : '-top-3.5 text-sm'} filter drop-shadow`}>
              👨‍🍳
            </div>
          )}
          {char.accessory.type === 'horn' && (
            <div className={`absolute ${isLarge ? '-top-6 text-2xl' : '-top-3 text-xs'} filter drop-shadow`}>
              🦄
            </div>
          )}
          {char.accessory.type === 'helmet' && (
            <div className={`absolute ${isLarge ? '-inset-2' : '-inset-1'} rounded-full border-2 border-cyan-400/80 bg-cyan-400/20 backdrop-blur-[1px] pointer-events-none z-30 shadow-[0_0_12px_rgba(34,211,238,0.5)]`} />
          )}
          {char.accessory.type === 'headband' && (
            <div className={`absolute top-0.5 ${isLarge ? 'w-24 h-2.5' : 'w-12 h-1'} bg-red-600 rounded-sm shadow-sm z-30`}>
              {isLarge && <div className="absolute -right-3 top-0 text-[10px] text-red-500 font-bold">▶</div>}
            </div>
          )}
          {char.accessory.type === 'cap' && (
            <div className={`absolute ${isLarge ? '-top-4 w-20 h-5' : '-top-2 w-10 h-2.5'} bg-orange-600 rounded-t-xl shadow-md z-30 border-b-2 border-blue-700`} />
          )}
          {char.accessory.type === 'tie' && (
            <div className={`absolute ${isLarge ? '-bottom-4 w-3.5 h-6' : '-bottom-2 w-1.5 h-3'} bg-red-600 rounded-b-sm shadow-md z-30`} />
          )}
          {char.accessory.type === 'cape' && (
            <div className={`absolute ${isLarge ? '-bottom-3 -left-3 w-5 h-9 -rotate-12' : '-bottom-1 -left-1 w-2.5 h-4 -rotate-12'} bg-rose-600 rounded-b-sm shadow-md z-0`} />
          )}
          {char.accessory.type === 'sparkles' && (
            <div className={`absolute ${isLarge ? '-top-3 -right-3 text-lg' : '-top-1.5 -right-1.5 text-xs'} filter drop-shadow`}>
              ✨
            </div>
          )}
          {char.accessory.type === 'fluff' && (
            <div className={`absolute -inset-1 rounded-2xl border-2 border-dashed border-stone-300/40 pointer-events-none`} />
          )}
        </div>

        {/* Fluffy Striped Tail Peeking */}
        <div className={`flex gap-0.5 ${isLarge ? 'mt-1.5' : 'mt-0.5'}`}>
          <div
            style={{ backgroundColor: char.palette.tailRingDark }}
            className={`${isLarge ? 'w-4 h-2' : 'w-2 h-1'} rounded-xs`}
          />
          <div
            style={{ backgroundColor: char.palette.tailRingLight }}
            className={`${isLarge ? 'w-4 h-2' : 'w-2 h-1'} rounded-xs`}
          />
          <div
            style={{ backgroundColor: char.palette.tailRingDark }}
            className={`${isLarge ? 'w-4 h-2' : 'w-2 h-1'} rounded-xs`}
          />
        </div>
      </div>
    </div>
  );
};

export const CharacterSelectScreen: React.FC<CharacterSelectScreenProps> = ({
  selectedCharacterId,
  onSelectCharacter,
  onStartGame,
  onBackToMenu,
  isMuted,
  onToggleMute,
}) => {
  // Currently enlarged/previewed character (null when viewing the 2-column roster grid)
  const [selectedForDetail, setSelectedForDetail] = useState<CharacterConfig | null>(null);

  // When a square raccoon button is clicked:
  const handleSelectRaccoon = (char: CharacterConfig) => {
    setSelectedForDetail(char);
    onSelectCharacter(char.id);
  };

  // Start climbing with the selected character
  const handleStartClimbing = () => {
    const charToStart = selectedForDetail ? selectedForDetail.id : selectedCharacterId;
    onStartGame(charToStart);
  };

  // Return back from the enlarged detail view to the 2-column square grid
  const handleBackToGrid = () => {
    setSelectedForDetail(null);
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-2 xs:p-2.5 sm:p-4 bg-slate-950/92 backdrop-blur-md text-[#fdf6ed] select-none overflow-hidden max-h-[100dvh]">
      {/* Top Header Bar */}
      <div className="shrink-0 flex items-center justify-between w-full max-w-xl mx-auto py-1 sm:py-1.5 px-1 border-b border-slate-800/60">
        <button
          onClick={selectedForDetail ? handleBackToGrid : onBackToMenu}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#18181b]/95 hover:bg-[#27272a] text-[#fdf6ed] border border-[#ea733d]/50 hover:border-[#e51a24] transition-all cursor-pointer shadow-md text-xs font-bold active:scale-95"
          aria-label={selectedForDetail ? 'Back to Raccoon List' : 'Back to Main Menu'}
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#ea733d]" />
          <span>{selectedForDetail ? 'ROSTER' : 'BACK'}</span>
        </button>

        <div className="text-center px-1">
          <h1 className="text-base xs:text-lg sm:text-xl font-black text-[#ffffff] tracking-tight font-sans drop-shadow-[0_2px_10px_rgba(229,26,36,0.5)] flex items-center justify-center gap-1">
            <span>🦝</span>
            <span>CHOOSE RACCOON</span>
          </h1>
          <p className="text-[10px] text-[#fed7aa] font-medium hidden xs:block">
            {selectedForDetail ? 'Ready to scale the tower!' : 'Tap a raccoon to select'}
          </p>
        </div>

        <button
          onClick={onToggleMute}
          className="p-1.5 sm:p-2 rounded-xl bg-[#18181b]/95 hover:bg-[#27272a] text-[#fdf6ed] border border-[#ea733d]/50 hover:border-[#e51a24] transition-all cursor-pointer shadow-md active:scale-95"
          aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-[#e51a24]" /> : <Volume2 className="w-4 h-4 text-[#16a34a]" />}
        </button>
      </div>

      {/* Main Content Area */}
      {selectedForDetail ? (
        /* ========================================================================= */
        /* ENLARGED SELECTED RACCOON VIEW (SMILING RACCOON + TWO ACTION BUTTONS)     */
        /* ========================================================================= */
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full max-w-md mx-auto py-1 px-2 animate-fade-in my-auto overflow-y-auto max-h-full">
          <div
            style={{
              borderColor: selectedForDetail.themeColor,
              boxShadow: `0 0 35px ${selectedForDetail.themeColor}40, 0 12px 36px rgba(0,0,0,0.8)`,
            }}
            className="w-full max-h-[88vh] overflow-y-auto flex flex-col items-center justify-between p-3 xs:p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#18181b] via-[#111827] to-[#090d16] border-2 shadow-2xl relative"
          >
            {/* Background ambient badge */}
            <div className="absolute top-2 right-3 text-3xl opacity-20 filter blur-[0.5px]">
              {selectedForDetail.badge}
            </div>

            {/* Enlarged Raccoon Smiling Presentation */}
            <div className="w-full flex flex-col items-center justify-center py-1">
              <RaccoonVisual
                char={selectedForDetail}
                size="large"
                isSmiling={true}
              />
            </div>

            {/* Character Details: Name & Sub-name */}
            <div className="w-full text-center mt-2 mb-3">
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-xl filter drop-shadow">{selectedForDetail.badge}</span>
                <h2 className="text-xl xs:text-2xl font-black text-white tracking-tight font-sans">
                  {selectedForDetail.name}
                </h2>
              </div>
              <p
                style={{ color: selectedForDetail.themeColor }}
                className="text-xs xs:text-sm font-extrabold tracking-tight mt-0.5"
              >
                {selectedForDetail.subtitle}
              </p>
              <p className="text-[11px] text-slate-300 italic max-w-xs mx-auto mt-1 line-clamp-2">
                "{selectedForDetail.tagline}"
              </p>
            </div>

            {/* Exactly Two Buttons: "Let's Climb!" and "Back" */}
            <div className="w-full grid grid-cols-2 gap-2.5 xs:gap-3 pt-1">
              <button
                onClick={handleBackToGrid}
                className="w-full py-2.5 xs:py-3 px-3 rounded-2xl bg-[#27272a] hover:bg-[#3f3f46] text-white text-xs xs:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer border border-slate-700"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

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
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* CONDENSED 2-COLUMN SCROLLING GRID OF SQUARE BUTTONS                      */
        /* Shows ONLY: Raccoon, Name, and Sub-name (Remove everything else)          */
        /* ========================================================================= */
        <div className="flex-1 min-h-0 w-full max-w-xl mx-auto overflow-y-auto px-1 sm:px-2 py-2">
          <div className="grid grid-cols-2 gap-2 xs:gap-2.5 sm:gap-3 pb-3">
            {RACCOON_ROSTER.map((char) => {
              const isSelected = char.id === selectedCharacterId;

              return (
                <button
                  key={char.id}
                  onClick={() => handleSelectRaccoon(char)}
                  style={{
                    borderColor: isSelected ? char.themeColor : 'rgba(255, 255, 255, 0.12)',
                    boxShadow: isSelected
                      ? `0 0 15px ${char.themeColor}40, 0 4px 14px rgba(0,0,0,0.6)`
                      : '0 4px 10px rgba(0,0,0,0.4)',
                  }}
                  className={`aspect-square w-full rounded-2xl bg-gradient-to-b from-[#18181b] to-[#0f172a] border-2 flex flex-col items-center justify-between p-2 xs:p-2.5 transition-all duration-150 cursor-pointer active:scale-95 hover:border-[#ea733d] focus:outline-none focus:ring-2 focus:ring-[#facc15] group relative overflow-hidden ${
                    isSelected ? 'ring-2 ring-offset-2 ring-offset-slate-950 ring-[#facc15]' : ''
                  }`}
                  aria-label={`Select ${char.name}`}
                >
                  {/* Subtle top indicator if already equipped */}
                  {isSelected && (
                    <div
                      style={{ backgroundColor: char.themeColor }}
                      className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full shadow-sm"
                    />
                  )}

                  {/* 1. The Raccoon Preview Visual */}
                  <div className="flex-1 flex items-center justify-center w-full min-h-0">
                    <RaccoonVisual
                      char={char}
                      size="small"
                      isSmiling={false}
                    />
                  </div>

                  {/* 2. Name & 3. Sub-name ONLY (all other clutter removed) */}
                  <div className="w-full text-center shrink-0 pt-0.5 pb-0.5">
                    <h3 className="text-xs xs:text-sm font-black text-white tracking-tight truncate w-full px-1 group-hover:text-[#fde047] transition-colors">
                      {char.name}
                    </h3>
                    <p
                      style={{ color: char.themeColor }}
                      className="text-[10px] xs:text-[11px] font-bold tracking-tight truncate w-full px-1 mt-0.5"
                    >
                      {char.subtitle}
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
          All 12 raccoons share identical physics & speed
        </div>
      )}
    </div>
  );
};
