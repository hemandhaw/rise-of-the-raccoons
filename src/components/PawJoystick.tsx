/**
 * Rise of the Raccoons! - Interactive On-Screen Paw Joystick
 * Responsive touch & pointer controller with styled raccoon paw graphic,
 * directional glow indicators, and radial displacement tracking.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';

interface PawJoystickProps {
  onMove: (x: number, y: number, distance: number) => void;
  onEnd: () => void;
  className?: string;
}

export const PawJoystick: React.FC<PawJoystickProps> = ({
  onMove,
  onEnd,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const activePointerIdRef = useRef<number | null>(null);

  const maxRadius = 38; // Max knob displacement radius in pixels

  // 8-Way directional snap: cardinals (Up, Down, Left, Right) and 45-degree diagonals
  const calculate8WayOffset = (rawDx: number, rawDy: number, maxR: number) => {
    const dist = Math.hypot(rawDx, rawDy);
    if (dist < 6) {
      return { x: 0, y: 0, normX: 0, normY: 0, normDist: 0 };
    }

    const clampedDist = Math.min(dist, maxR);
    const rawAngle = Math.atan2(rawDy, rawDx);
    const step = Math.PI / 4; // 45 degrees
    const snappedAngle = Math.round(rawAngle / step) * step;

    const x = Math.cos(snappedAngle) * clampedDist;
    const y = Math.sin(snappedAngle) * clampedDist;

    const cosVal = Math.cos(snappedAngle);
    const sinVal = Math.sin(snappedAngle);

    // Exact quantized outputs (clean numbers: 0, 1, -1, 0.7071, -0.7071)
    const normX = Math.abs(cosVal) < 0.05 ? 0 : Math.round(cosVal * 1000) / 1000;
    // Invert Y so up is positive and down is negative
    const normY = Math.abs(sinVal) < 0.05 ? 0 : -Math.round(sinVal * 1000) / 1000;
    const normDist = clampedDist / maxR;

    return { x, y, normX, normY, normDist };
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      container.setPointerCapture?.(e.pointerId);
      activePointerIdRef.current = e.pointerId;
      setIsActive(true);

      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const rawDx = e.clientX - centerX;
      const rawDy = e.clientY - centerY;
      const { x, y, normX, normY, normDist } = calculate8WayOffset(rawDx, rawDy, maxRadius);

      setKnobOffset({ x, y });
      onMove(normX, normY, normDist);
    },
    [maxRadius, onMove]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isActive || activePointerIdRef.current !== e.pointerId) return;
      e.stopPropagation();
      e.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const rawDx = e.clientX - centerX;
      const rawDy = e.clientY - centerY;
      const { x, y, normX, normY, normDist } = calculate8WayOffset(rawDx, rawDy, maxRadius);

      setKnobOffset({ x, y });
      onMove(normX, normY, normDist);
    },
    [isActive, maxRadius, onMove]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current === e.pointerId) {
        try {
          containerRef.current?.releasePointerCapture?.(e.pointerId);
        } catch {
          // Ignore
        }
        activePointerIdRef.current = null;
        setIsActive(false);
        setKnobOffset({ x: 0, y: 0 });
        onEnd();
      }
    },
    [onEnd]
  );

  // Safety cleanup if window loses focus or pointer is canceled
  useEffect(() => {
    const handleGlobalCancel = () => {
      if (activePointerIdRef.current !== null) {
        activePointerIdRef.current = null;
        setIsActive(false);
        setKnobOffset({ x: 0, y: 0 });
        onEnd();
      }
    };

    window.addEventListener('blur', handleGlobalCancel);
    window.addEventListener('pointercancel', handleGlobalCancel);

    return () => {
      window.removeEventListener('blur', handleGlobalCancel);
      window.removeEventListener('pointercancel', handleGlobalCancel);
    };
  }, [onEnd]);

  // 8-Directional active states for glowing indicators
  const isUp = isActive && knobOffset.y < -12 && Math.abs(knobOffset.x) < 10;
  const isDown = isActive && knobOffset.y > 12 && Math.abs(knobOffset.x) < 10;
  const isLeft = isActive && knobOffset.x < -12 && Math.abs(knobOffset.y) < 10;
  const isRight = isActive && knobOffset.x > 12 && Math.abs(knobOffset.y) < 10;
  const isUpRight = isActive && knobOffset.x > 8 && knobOffset.y < -8;
  const isUpLeft = isActive && knobOffset.x < -8 && knobOffset.y < -8;
  const isDownRight = isActive && knobOffset.x > 8 && knobOffset.y > 8;
  const isDownLeft = isActive && knobOffset.x < -8 && knobOffset.y > 8;

  return (
    <div
      className={`flex flex-col items-center select-none touch-none will-change-transform origin-bottom transition-all ${
        isActive
          ? 'scale-[0.80] opacity-90 duration-150 ease-out'
          : 'scale-100 opacity-100 duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)]'
      } ${className}`}
    >
      {/* Outer Joystick Ring */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-28 h-28 rounded-full border-2 transition-all duration-150 flex items-center justify-center cursor-grab active:cursor-grabbing backdrop-blur-md ${
          isActive
            ? 'bg-slate-900/85 border-emerald-400 ring-4 ring-emerald-500/25 shadow-xl shadow-emerald-950/60'
            : 'bg-slate-950/80 border-slate-700/80 hover:border-slate-600 shadow-lg shadow-black/60'
        }`}
      >
        {/* Subtle 8-Way Crosshair Tracks (Cardinals & 45-degree Diagonals) */}
        <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 h-px bg-slate-800/80 pointer-events-none" />
        <div className="absolute inset-y-3 left-1/2 -translate-x-1/2 w-px bg-slate-800/80 pointer-events-none" />
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-px bg-slate-800/50 rotate-45 pointer-events-none" />
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-px bg-slate-800/50 -rotate-45 pointer-events-none" />

        {/* Cardinal Directional Tick Markers */}
        <span
          className={`absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-bold tracking-widest transition-colors ${
            isUp ? 'text-emerald-400 font-extrabold scale-125 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'text-slate-500'
          }`}
        >
          ▲
        </span>
        <span
          className={`absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold tracking-widest transition-colors ${
            isDown ? 'text-emerald-400 font-extrabold scale-125 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'text-slate-500'
          }`}
        >
          ▼
        </span>
        <span
          className={`absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold transition-colors ${
            isLeft ? 'text-emerald-400 font-extrabold scale-125 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'text-slate-500'
          }`}
        >
          ◀
        </span>
        <span
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold transition-colors ${
            isRight ? 'text-emerald-400 font-extrabold scale-125 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'text-slate-500'
          }`}
        >
          ▶
        </span>

        {/* 45-Degree Diagonal Directional Tick Markers */}
        <span
          className={`absolute top-2.5 right-2.5 text-[8px] font-bold transition-colors ${
            isUpRight ? 'text-emerald-400 font-extrabold scale-125 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'text-slate-600'
          }`}
        >
          ◥
        </span>
        <span
          className={`absolute top-2.5 left-2.5 text-[8px] font-bold transition-colors ${
            isUpLeft ? 'text-emerald-400 font-extrabold scale-125 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'text-slate-600'
          }`}
        >
          ◤
        </span>
        <span
          className={`absolute bottom-2.5 right-2.5 text-[8px] font-bold transition-colors ${
            isDownRight ? 'text-emerald-400 font-extrabold scale-125 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'text-slate-600'
          }`}
        >
          ◢
        </span>
        <span
          className={`absolute bottom-2.5 left-2.5 text-[8px] font-bold transition-colors ${
            isDownLeft ? 'text-emerald-400 font-extrabold scale-125 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'text-slate-600'
          }`}
        >
          ◣
        </span>

        {/* Styled Raccoon Paw Knob */}
        <div
          className={`absolute w-14 h-14 rounded-full flex items-center justify-center pointer-events-none will-change-transform ${
            isActive
              ? 'transition-none shadow-xl shadow-emerald-500/40'
              : 'transition-transform duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-md shadow-black/80'
          }`}
          style={{
            transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
          }}
        >
          {/* Base Knob Shell */}
          <div
            className={`w-full h-full rounded-full border flex flex-col items-center justify-center p-1.5 ${
              isActive
                ? 'bg-gradient-to-b from-slate-800 via-slate-900 to-emerald-950 border-emerald-400'
                : 'bg-gradient-to-b from-slate-800 to-slate-900 border-slate-600'
            }`}
          >
            {/* Cute Raccoon Paw Print SVG Graphic */}
            <svg
              viewBox="0 0 36 36"
              className={`w-9 h-9 transition-colors ${
                isActive ? 'text-emerald-400' : 'text-slate-300'
              }`}
              fill="currentColor"
            >
              {/* Claws */}
              <path d="M9 7 C9 5 10 4 10.5 3 C11 4 12 5 12 7 Z" className="fill-slate-400" />
              <path d="M15 5 C15 3 16 2 16.5 1 C17 2 18 3 18 5 Z" className="fill-slate-400" />
              <path d="M21 5 C21 3 22 2 22.5 1 C23 2 24 3 24 5 Z" className="fill-slate-400" />
              <path d="M27 7 C27 5 28 4 28.5 3 C29 4 30 5 30 7 Z" className="fill-slate-400" />

              {/* 4 Toe Beans */}
              <ellipse cx="10.5" cy="8.5" rx="2.5" ry="3.5" transform="rotate(-15 10.5 8.5)" />
              <ellipse cx="16.5" cy="6.8" rx="2.6" ry="3.8" transform="rotate(-5 16.5 6.8)" />
              <ellipse cx="22.5" cy="6.8" rx="2.6" ry="3.8" transform="rotate(5 22.5 6.8)" />
              <ellipse cx="28.5" cy="8.5" rx="2.5" ry="3.5" transform="rotate(15 28.5 8.5)" />

              {/* Large Central Palm Bean */}
              <path
                d="M12 16
                   C9 17, 7 21, 9 26
                   C10.5 29.5, 15 31, 19.5 31
                   C24 31, 28.5 29.5, 30 26
                   C32 21, 30 17, 27 16
                   C24 18, 21 16.5, 19.5 16.5
                   C18 16.5, 15 18, 12 16 Z"
              />

              {/* Paw Highlight Details */}
              <ellipse
                cx="19.5"
                cy="23"
                rx="4.5"
                ry="3"
                className={isActive ? 'fill-emerald-200/50' : 'fill-slate-400/40'}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Styled Micro-Label */}
      <div
        className={`mt-1 flex items-center gap-1 text-[9px] font-mono-nums font-bold tracking-wider uppercase transition-all duration-200 ${
          isActive ? 'text-emerald-400/80 scale-95' : 'text-slate-400 scale-100'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full transition-colors ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
        PAW JOYSTICK
      </div>
    </div>
  );
};
