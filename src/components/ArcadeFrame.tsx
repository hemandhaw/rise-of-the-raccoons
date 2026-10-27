/**
 * Rise of the Raccoons! - Responsive Adaptive Arcade Frame
 * - Mobile & Tablet: Kept strictly vertical (portrait). Horizontal orientation is blocked with a rotate device prompt.
 * - Desktop: Horizontal / widescreen, filling the full screen to optimize desktop screen proportions.
 */

import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw } from 'lucide-react';
import { GAME_CONFIG } from '../game/config';

interface ArcadeFrameProps {
  children: React.ReactNode;
}

export const ArcadeFrame: React.FC<ArcadeFrameProps> = ({ children }) => {
  const [isLandscapeBlocked, setIsLandscapeBlocked] = useState(false);
  const [isDesktopWidescreen, setIsDesktopWidescreen] = useState(false);

  useEffect(() => {
    // Attempt programmatic screen orientation lock on mobile devices if supported
    const lockPortrait = () => {
      try {
        if ('orientation' in screen && screen.orientation && 'lock' in screen.orientation) {
          (screen.orientation as any).lock('portrait').catch(() => {
            // Orientation lock may require full screen or user gesture; ignore failure gracefully
          });
        }
      } catch {}
    };

    lockPortrait();

    const checkLayout = () => {
      const isFinePointer = window.matchMedia('(pointer: fine)').matches;
      const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isHorizontal = width > height;

      // Desktop: fine pointer (mouse/trackpad) and landscape, or wide display (>= 960px) that is not purely coarse touch
      const desktopMode = (isFinePointer && isHorizontal && width >= 850) || (!isCoarsePointer && width >= 800);
      setIsDesktopWidescreen(desktopMode);

      // Mobile/Tablet: only block if it's mobile/tablet AND held horizontally (landscape)
      const isMobileTablet = !desktopMode;
      const blockMobileLandscape = isMobileTablet && isHorizontal;
      setIsLandscapeBlocked(blockMobileLandscape);
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
        - Desktop: Widescreen, fills 100% of the screen horizontally and vertically.
        - Mobile/Tablet: Centered vertical portrait view (9:16).
      */}
      <main
        className={`relative z-10 flex items-center justify-center overflow-hidden transition-all duration-300 ${
          isDesktopWidescreen
            ? 'w-full h-full'
            : 'w-full h-full max-h-screen'
        }`}
        style={
          isDesktopWidescreen
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

      {/* 
        Mandatory Vertical Lock Modal for Mobile & Tablet in Horizontal/Landscape Mode:
        Displayed ONLY when a mobile or tablet device is turned horizontally.
      */}
      {isLandscapeBlocked && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md text-center pointer-events-auto">
          <div className="relative mb-5 flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.3)]">
              <Smartphone className="w-10 h-10 animate-pulse" />
            </div>
            <div
              className="absolute -top-2 -right-2 p-1.5 rounded-full bg-emerald-500 text-slate-950 animate-spin"
              style={{ animationDuration: '3s' }}
            >
              <RotateCw className="w-4 h-4 stroke-[3]" />
            </div>
          </div>

          <div className="max-w-xs space-y-2">
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-mono-nums font-bold tracking-widest text-emerald-300 uppercase">
              Vertical Mobile Mode Only
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              ROTATE YOUR DEVICE
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Mobile and tablet versions of Rise of the Raccoons! are designed strictly for vertical play. Please rotate your device vertically to portrait mode to climb.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
