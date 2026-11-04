/**
 * Rise of the Raccoons! - Responsive Adaptive Arcade Frame
 * - Mobile & Tablet: Kept strictly vertical (portrait). Horizontal orientation is blocked with a rotate device prompt.
 * - Desktop: Horizontal / widescreen, filling the full screen to optimize desktop screen proportions.
 */

import React, { useState, useEffect } from 'react';
import { GAME_CONFIG } from '../game/config';

interface ArcadeFrameProps {
  children: React.ReactNode;
}

export const ArcadeFrame: React.FC<ArcadeFrameProps> = ({ children }) => {
  const [isWidescreen, setIsWidescreen] = useState(false);

  useEffect(() => {
    const checkLayout = () => {
      const isFinePointer = window.matchMedia('(pointer: fine)').matches;
      const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isHorizontal = width > height;

      // Desktop / wide landscape mode
      const desktopMode = (isFinePointer && isHorizontal && width >= 850) || (!isCoarsePointer && width >= 800);
      setIsWidescreen(desktopMode);
    };

    checkLayout();

    window.addEventListener('resize', checkLayout);
    window.addEventListener('orientationchange', checkLayout);
    if ('orientation' in screen && screen.orientation) {
      screen.orientation.addEventListener?.('change', checkLayout);
    }

    return () => {
      window.removeEventListener('resize', checkLayout);
      window.removeEventListener('orientationchange', checkLayout);
      if ('orientation' in screen && screen.orientation) {
        screen.orientation.removeEventListener?.('change', checkLayout);
      }
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 flex items-center justify-center select-none">
      {/* 
        Central Arcade Viewport:
        - Desktop/Wide: Widescreen, fills screen horizontally and vertically.
        - Mobile/Tablet (Portrait or Landscape): Proportionately scales to fit screen height and width without clipping buttons.
      */}
      <main
        className={`relative z-10 flex items-center justify-center overflow-hidden transition-all duration-300 ${
          isWidescreen
            ? 'w-full h-full'
            : 'w-full h-full max-h-screen'
        }`}
        style={
          isWidescreen
            ? { width: '100vw', height: '100vh' }
            : {
                maxHeight: '100vh',
                maxWidth: `calc(100vh * ${GAME_CONFIG.ASPECT_RATIO})`,
                aspectRatio: `${GAME_CONFIG.ASPECT_RATIO}`,
              }
        }
      >
        <div className="relative w-full h-full overflow-hidden bg-slate-950">
          {children}
        </div>
      </main>
    </div>
  );
};
