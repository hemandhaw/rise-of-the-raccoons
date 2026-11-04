/**
 * Rise of the Raccoons! - Animated Raccoon Preview
 * 
 * Renders the raccoon avatar with optional idle resting animation:
 * - Breathing torso bobbing & scaling (similar to sill resting animation during gameplay)
 * - Ear twitch & tail sway
 * - Smiling or focused face
 * - Modular sprite support via characterConfig
 */

import React from 'react';
import { CharacterConfig } from '../game/characterConfig';

interface RaccoonPreviewProps {
  char: CharacterConfig;
  size?: 'small' | 'medium' | 'large';
  isSmiling?: boolean;
  animated?: boolean;
}

export const RaccoonPreview: React.FC<RaccoonPreviewProps> = ({
  char,
  size = 'small',
  isSmiling = false,
  animated = false,
}) => {
  // Modular art hook: If custom external image is provided, display it
  if (char.imageUrl) {
    const dimClass = size === 'large' ? 'w-32 h-32' : size === 'medium' ? 'w-24 h-24' : 'w-16 h-16';
    return (
      <div className={`relative flex items-center justify-center ${dimClass} ${animated ? 'animate-bounce' : ''}`}>
        <img
          src={char.imageUrl}
          alt={char.name}
          className="w-full h-full object-contain filter drop-shadow-md"
        />
      </div>
    );
  }

  const isLarge = size === 'large';
  const isMed = size === 'medium';

  // Dimension scaling
  const earW = isLarge ? 'w-5 h-7' : isMed ? 'w-4 h-5.5' : 'w-3 h-4';
  const earInnerW = isLarge ? 'w-2.5 h-3.5' : isMed ? 'w-2 h-2.5' : 'w-1.5 h-2';
  const headW = isLarge ? 'w-24 h-20' : isMed ? 'w-18 h-15' : 'w-12 h-10';
  const maskW = isLarge ? 'w-20 h-8' : isMed ? 'w-15 h-6' : 'w-10 h-4';
  const snoutW = isLarge ? 'w-11 h-7' : isMed ? 'w-8 h-5' : 'w-5.5 h-3.5';
  const noseW = isLarge ? 'w-3 h-2' : isMed ? 'w-2.5 h-1.5' : 'w-1.5 h-1';

  return (
    <div
      className={`relative flex items-center justify-center select-none ${
        isLarge ? 'py-2' : isMed ? 'py-1.5' : 'py-1'
      }`}
    >
      {/* Outer ambient theme glow */}
      <div
        style={{ backgroundColor: char.themeColor }}
        className={`absolute rounded-full blur-xl pointer-events-none transition-all duration-300 ${
          isLarge ? 'w-32 h-32 opacity-35' : isMed ? 'w-24 h-24 opacity-30' : 'w-14 h-14 opacity-25'
        }`}
      />

      {/* Decorative effect for rainbow or sparkles */}
      {char.accessory.type === 'rainbow_trail' && (
        <div
          className={`absolute rounded-full blur-md opacity-40 pointer-events-none ${
            isLarge
              ? 'w-40 h-40 bg-gradient-to-r from-red-500 via-yellow-400 to-purple-500 animate-spin'
              : 'w-20 h-20 bg-gradient-to-r from-pink-500 to-cyan-500'
          }`}
          style={{ animationDuration: '8s' }}
        />
      )}

      {/* Character Vector Silhouette with Resting Breathing Animation */}
      <div
        className={`relative flex flex-col items-center transition-transform duration-300 ${
          animated ? 'animate-[resting_2.8s_ease-in-out_infinite]' : ''
        }`}
        style={animated ? {
          animation: 'raccoonResting 2.6s ease-in-out infinite',
        } : undefined}
      >
        {/* Inline CSS style for smooth keyframe breathing */}
        {animated && (
          <style>{`
            @keyframes raccoonResting {
              0%, 100% {
                transform: translateY(0px) scale(1.0);
              }
              50% {
                transform: translateY(-3px) scale(1.03);
              }
            }
            @keyframes tailSway {
              0%, 100% {
                transform: rotate(-6deg);
              }
              50% {
                transform: rotate(6deg);
              }
            }
          `}</style>
        )}

        {/* Ears */}
        <div className={`flex justify-between ${isLarge ? 'w-18 -mb-1.5' : isMed ? 'w-14 -mb-1.5' : 'w-9 -mb-1'}`}>
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
            className={`absolute ${isLarge ? 'top-3' : isMed ? 'top-2' : 'top-1.5'} ${maskW} rounded-full flex items-center justify-around px-1 z-10 shadow-inner`}
          >
            {/* Eyes */}
            {isSmiling && (isLarge || isMed) ? (
              // Smiling happy anime/cartoon eyes
              <>
                <div className="relative flex flex-col items-center justify-center">
                  <svg className={`${isLarge ? 'w-5 h-3.5' : 'w-4 h-2.5'}`} viewBox="0 0 20 14" fill="none">
                    <path
                      d="M 2 11 Q 10 2 18 11"
                      stroke={char.palette.eyePupil || '#18181b'}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="w-3.5 h-1.5 rounded-full bg-rose-400/60 blur-[0.5px] mt-0.5" />
                </div>
                <div className="relative flex flex-col items-center justify-center">
                  <svg className={`${isLarge ? 'w-5 h-3.5' : 'w-4 h-2.5'}`} viewBox="0 0 20 14" fill="none">
                    <path
                      d="M 2 11 Q 10 2 18 11"
                      stroke={char.palette.eyePupil || '#18181b'}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="w-3.5 h-1.5 rounded-full bg-rose-400/60 blur-[0.5px] mt-0.5" />
                </div>
              </>
            ) : (
              // Normal eyes
              <>
                <div
                  style={{ backgroundColor: char.palette.eyeWhite }}
                  className={`${isLarge ? 'w-4.5 h-4.5' : isMed ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'} rounded-full flex items-center justify-center relative shadow-xs`}
                >
                  <div
                    style={{ backgroundColor: char.palette.eyeIris }}
                    className={`${isLarge ? 'w-2.5 h-2.5' : isMed ? 'w-2 h-2' : 'w-1.5 h-1.5'} rounded-full flex items-center justify-center`}
                  >
                    <div
                      style={{ backgroundColor: char.palette.eyePupil }}
                      className={`${isLarge ? 'w-1.5 h-1.5' : isMed ? 'w-1 h-1' : 'w-1 h-1'} rounded-full`}
                    />
                  </div>
                </div>

                <div
                  style={{ backgroundColor: char.palette.eyeWhite }}
                  className={`${isLarge ? 'w-4.5 h-4.5' : isMed ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'} rounded-full flex items-center justify-center relative shadow-xs`}
                >
                  <div
                    style={{ backgroundColor: char.palette.eyeIris }}
                    className={`${isLarge ? 'w-2.5 h-2.5' : isMed ? 'w-2 h-2' : 'w-1.5 h-1.5'} rounded-full flex items-center justify-center`}
                  >
                    <div
                      style={{ backgroundColor: char.palette.eyePupil }}
                      className={`${isLarge ? 'w-1.5 h-1.5' : isMed ? 'w-1 h-1' : 'w-1 h-1'} rounded-full`}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Snout & Nose */}
          <div
            style={{ backgroundColor: char.palette.snout }}
            className={`absolute ${isLarge ? 'bottom-1.5' : isMed ? 'bottom-1' : 'bottom-0.5'} ${snoutW} rounded-full flex flex-col items-center justify-start pt-0.5 z-20 shadow-md border border-black/20`}
          >
            {/* Button Nose */}
            <div
              style={{ backgroundColor: char.palette.nose }}
              className={`${noseW} rounded-full`}
            />

            {/* Mouth */}
            {isSmiling && (isLarge || isMed) ? (
              // Open cheerful happy smile
              <svg className="w-3.5 h-2 mt-0.5" viewBox="0 0 16 10" fill="none">
                <path
                  d="M 1 2 Q 8 10 15 2"
                  stroke="#18181b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="#f43f5e"
                />
              </svg>
            ) : (
              // Subtle gentle mouth line
              <div className="w-1.5 h-0.5 bg-black/40 rounded-full mt-0.5" />
            )}
          </div>
        </div>

        {/* Resting Paws on Wall / Sill */}
        <div className={`flex justify-between items-center ${isLarge ? 'w-16 -mt-1' : isMed ? 'w-12 -mt-1' : 'w-8 -mt-0.5'}`}>
          <div
            style={{ backgroundColor: char.palette.paws }}
            className={`${isLarge ? 'w-3.5 h-2.5' : isMed ? 'w-3 h-2' : 'w-2 h-1.5'} rounded-full border border-black/30 shadow-xs`}
          />
          <div
            style={{ backgroundColor: char.palette.paws }}
            className={`${isLarge ? 'w-3.5 h-2.5' : isMed ? 'w-3 h-2' : 'w-2 h-1.5'} rounded-full border border-black/30 shadow-xs`}
          />
        </div>
      </div>
    </div>
  );
};
