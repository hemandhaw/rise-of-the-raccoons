/**
 * Rise of the Raccoons! - Slither.io Style Floating Touch Controller
 * 
 * - Mobile Touch: Floating relative drag control starting anywhere on the lower half of the screen.
 * - Renders a subtle, semi-transparent paw icon strictly where the player's primary thumb lands.
 * - Smoothly scales down (shrinks slightly) when pressed and springs back when released.
 * - Double-tap / two-finger detection triggers ONLY the speed boost without causing any additional visuals
 *   (no second paw, no jumping anchor, no extra visual cues).
 * - Direction is strictly and exclusively controlled by the player's first finger.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';

interface FloatingPawControllerProps {
  onMove: (x: number, y: number, distance: number, isBoosted?: boolean, isHolding?: boolean) => void;
  onEnd: (wasQuickTap?: boolean) => void;
  className?: string;
}

export const FloatingPawController: React.FC<FloatingPawControllerProps> = ({
  onMove,
  onEnd,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Floating anchor locked strictly to the first finger's touchdown location
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [isPressed, setIsPressed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Interaction tracking refs
  const activeTouchIdRef = useRef<number | null>(null);
  const isBoostActiveRef = useRef(false);
  const touchStartTimeRef = useRef<number>(0);
  const hasDraggedRef = useRef<boolean>(false);
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const fadeTimerRef = useRef<number | null>(null);
  const lastNormVectorRef = useRef<{ normX: number; normY: number; normDist: number }>({
    normX: 0,
    normY: 0,
    normDist: 0,
  });

  const maxRadius = 46; // Maximum drag displacement in pixels
  const deadzone = 5;

  // 8-Way directional quantization (cardinals & 45-degree diagonals)
  const calculate8WayOffset = useCallback(
    (rawDx: number, rawDy: number) => {
      const dist = Math.hypot(rawDx, rawDy);
      if (dist < deadzone) {
        return { normX: 0, normY: 0, normDist: 0 };
      }

      const clampedDist = Math.min(dist, maxRadius);
      const rawAngle = Math.atan2(rawDy, rawDx);
      const step = Math.PI / 4; // 45 degrees
      const snappedAngle = Math.round(rawAngle / step) * step;

      const cosVal = Math.cos(snappedAngle);
      const sinVal = Math.sin(snappedAngle);

      // Quantized normalized outputs
      const normX = Math.abs(cosVal) < 0.05 ? 0 : Math.round(cosVal * 1000) / 1000;
      // Invert Y so upward climb is positive and downward is negative
      const normY = Math.abs(sinVal) < 0.05 ? 0 : -Math.round(sinVal * 1000) / 1000;
      const normDist = (clampedDist - deadzone) / (maxRadius - deadzone);

      return { normX, normY, normDist };
    },
    [deadzone, maxRadius]
  );

  // Touch Start (Strictly mobile touch only, no duplicate pointer event listener)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      // Clear any fading cleanup timer
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }

      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      // Case A: First finger touches down
      if (activeTouchIdRef.current === null) {
        const touch = e.touches[0];
        activeTouchIdRef.current = touch.identifier;

        const localX = touch.clientX - rect.left;
        const localY = touch.clientY - rect.top;

        // Check for double-tap on primary finger
        const now = performance.now();
        touchStartTimeRef.current = now;
        hasDraggedRef.current = false;

        const dt = now - lastTapTimeRef.current;
        const distFromLast = Math.hypot(
          touch.clientX - lastTapPosRef.current.x,
          touch.clientY - lastTapPosRef.current.y
        );
        const isDoubleTap = dt < 320 && distFromLast < 60;
        lastTapTimeRef.current = now;
        lastTapPosRef.current = { x: touch.clientX, y: touch.clientY };

        const isBoosted = isDoubleTap || e.touches.length >= 2;
        isBoostActiveRef.current = isBoosted;

        // Anchor is set strictly to this first finger and will NOT move
        setAnchor({ x: localX, y: localY });
        setIsPressed(true);
        setIsVisible(true);

        lastNormVectorRef.current = { normX: 0, normY: 0, normDist: 0 };
        // Immediately trigger hold movement in current facing direction
        onMove(0, 0, 0, isBoosted, true);
      } else {
        // Case B: Second finger touches down while already steering
        // Triggers ONLY speed boost, NO extra visuals, NO change to anchor or direction!
        isBoostActiveRef.current = true;
        const { normX, normY, normDist } = lastNormVectorRef.current;
        onMove(normX, normY, normDist, true, !hasDraggedRef.current);
      }
    },
    [onMove]
  );

  // Touch Move (Direction is evaluated EXCLUSIVELY using the player's first finger)
  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!anchor || activeTouchIdRef.current === null) return;

      const container = containerRef.current;
      if (!container) return;

      // Find EXCLUSIVELY the primary touch
      const primaryTouch = Array.from(e.touches).find(
        (t) => t.identifier === activeTouchIdRef.current
      );
      if (!primaryTouch) return;

      const rect = container.getBoundingClientRect();
      const currentX = primaryTouch.clientX - rect.left;
      const currentY = primaryTouch.clientY - rect.top;

      // Displacement from the initial anchor of the FIRST finger only
      const rawDx = currentX - anchor.x;
      const rawDy = currentY - anchor.y;

      if (Math.hypot(rawDx, rawDy) >= deadzone) {
        hasDraggedRef.current = true;
      }

      const { normX, normY, normDist } = calculate8WayOffset(rawDx, rawDy);
      lastNormVectorRef.current = { normX, normY, normDist };

      // Boost is active if two or more fingers are on screen or double-tap was triggered
      const isBoosted = e.touches.length >= 2 || isBoostActiveRef.current;
      onMove(normX, normY, normDist, isBoosted, !hasDraggedRef.current);
    },
    [anchor, calculate8WayOffset, deadzone, onMove]
  );

  // Touch End / Cancel
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const now = performance.now();
      const touchDuration = now - touchStartTimeRef.current;
      const wasQuickTap = !hasDraggedRef.current && touchDuration < 280;

      // If all touches are lifted
      if (e.touches.length === 0) {
        setIsPressed(false);
        activeTouchIdRef.current = null;
        isBoostActiveRef.current = false;
        lastNormVectorRef.current = { normX: 0, normY: 0, normDist: 0 };
        onEnd(wasQuickTap);

        // Smooth spring back then gentle fade out
        if (fadeTimerRef.current !== null) window.clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = window.setTimeout(() => {
          setIsVisible(false);
          setAnchor(null);
        }, 220);
      } else {
        // A finger was lifted, but another finger remains:
        const isMultiTouch = e.touches.length >= 2;
        isBoostActiveRef.current = isMultiTouch;

        const primaryStillPresent = Array.from(e.touches).some(
          (t) => t.identifier === activeTouchIdRef.current
        );

        if (!primaryStillPresent) {
          setIsPressed(false);
          activeTouchIdRef.current = null;
          isBoostActiveRef.current = false;
          lastNormVectorRef.current = { normX: 0, normY: 0, normDist: 0 };
          onEnd(wasQuickTap);
          if (fadeTimerRef.current !== null) window.clearTimeout(fadeTimerRef.current);
          fadeTimerRef.current = window.setTimeout(() => {
            setIsVisible(false);
            setAnchor(null);
          }, 220);
        } else {
          const { normX, normY, normDist } = lastNormVectorRef.current;
          onMove(normX, normY, normDist, false, !hasDraggedRef.current);
        }
      }
    },
    [onEnd, onMove]
  );

  // Global blur / cancel safety
  useEffect(() => {
    const handleCancel = () => {
      if (isPressed || isVisible) {
        setIsPressed(false);
        setIsVisible(false);
        activeTouchIdRef.current = null;
        isBoostActiveRef.current = false;
        setAnchor(null);
        lastNormVectorRef.current = { normX: 0, normY: 0, normDist: 0 };
        onEnd();
      }
    };
    window.addEventListener('blur', handleCancel);
    return () => {
      window.removeEventListener('blur', handleCancel);
      if (fadeTimerRef.current !== null) window.clearTimeout(fadeTimerRef.current);
    };
  }, [isPressed, isVisible, onEnd]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`absolute inset-x-0 bottom-0 h-[52%] z-20 touch-none select-none pointer-events-auto overflow-hidden ${className}`}
      aria-label="Slither Style Floating Touch Control"
    >
      {/* 
        Subtle Semi-Transparent Anchor Paw:
        - Only a single paw graphic ever rendered
        - Anchored strictly at the first finger's initial touchdown
        - Smoothly scales down (shrinks slightly) when pressed
        - Springs back when released
        - No second paw, no tether line, no thumb pip
      */}
      {isVisible && anchor && (
        <div
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 will-change-transform"
          style={{
            left: `${anchor.x}px`,
            top: `${anchor.y}px`,
          }}
        >
          <div
            className={`relative flex items-center justify-center rounded-full transition-all ${
              isPressed
                ? 'scale-[0.86] opacity-95 duration-120 ease-out'
                : 'scale-100 opacity-0 duration-240 ease-[cubic-bezier(0.34,1.56,0.64,1)]'
            }`}
          >
            {/* Outer Subtle Glass Ring */}
            <div className="w-18 h-18 rounded-full flex items-center justify-center border transition-colors bg-slate-950/40 border-slate-400/30 shadow-[0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-[2px]">
              {/* Subtle Semi-Transparent Raccoon Paw Icon */}
              <svg
                viewBox="0 0 64 64"
                className="w-11 h-11 text-slate-300/80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
                fill="currentColor"
              >
                {/* 4 Little Rounded Toe Pads */}
                <ellipse cx="18" cy="18" rx="4.5" ry="6" transform="rotate(-22 18 18)" />
                <ellipse cx="27" cy="13" rx="4.5" ry="6.5" transform="rotate(-7 27 13)" />
                <ellipse cx="37" cy="13" rx="4.5" ry="6.5" transform="rotate(7 37 13)" />
                <ellipse cx="46" cy="18" rx="4.5" ry="6.5" transform="rotate(22 46 18)" />

                {/* Tiny Claws */}
                <path d="M16 11L18 8L19 11Z" fill="currentColor" opacity="0.85" />
                <path d="M25 6L27 3L28 6Z" fill="currentColor" opacity="0.85" />
                <path d="M36 6L37 3L39 6Z" fill="currentColor" opacity="0.85" />
                <path d="M45 11L46 8L48 11Z" fill="currentColor" opacity="0.85" />

                {/* Main Chubby Palm Pad */}
                <path
                  d="M19 32C19 26 24 23 32 23C40 23 45 26 45 32C45 39 41 46 32 46C23 46 19 39 19 32Z"
                  fill="currentColor"
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
