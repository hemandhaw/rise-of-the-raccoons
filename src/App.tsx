/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArcadeFrame } from './components/ArcadeFrame';
import { GameHUD } from './components/GameHUD';
import { PauseModal } from './components/PauseModal';
import { TitleScreen } from './components/TitleScreen';
import { VictoryModal } from './components/VictoryModal';
import { GameOverModal } from './components/GameOverModal';
import { GameEngine } from './game/GameEngine';
import { GameEngineState } from './game/types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameEngineState | null>(null);

  // Initialize GameEngine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas, (nextState) => {
      setGameState(nextState);
    });

    engineRef.current = engine;
    engine.start();
    setGameState(engine.getState());

    // Window & Canvas resize observers
    const handleResize = () => {
      engine.resizeCanvas();
    };

    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      engine.resizeCanvas();
    });
    resizeObserver.observe(canvas);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  // Control Handlers
  const handleClimb = useCallback(() => {
    engineRef.current?.startGame();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resumeGame();
  }, []);

  const handleRestart = useCallback(() => {
    engineRef.current?.resetGame();
  }, []);

  const handleMainMenu = useCallback(() => {
    engineRef.current?.returnToMainMenu();
  }, []);

  const handleToggleMute = useCallback(() => {
    if (engineRef.current) {
      const isMuted = engineRef.current.toggleMute();
      setGameState((prev) => (prev ? { ...prev, isMuted } : null));
    }
  }, []);

  const handleJoystickMove = useCallback((x: number, y: number, distance: number, isBoosted = false) => {
    engineRef.current?.setJoystickVector(x, y, true, isBoosted);
  }, []);

  const handleJoystickEnd = useCallback(() => {
    engineRef.current?.setJoystickVector(0, 0, false, false);
  }, []);

  return (
    <ArcadeFrame>
      {/* 
        Isolated Game Canvas:
        React state updates never re-render the canvas or simulation loop!
      */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing touch-none select-none"
      />

      {/* Screen: Main Menu Title Screen */}
      {gameState?.screen === 'MAIN_MENU' && (
        <TitleScreen
          onClimb={handleClimb}
          isMuted={gameState.isMuted}
          onToggleMute={handleToggleMute}
          bestFloor={gameState.bestFloor}
        />
      )}

      {/* Screen: Active Play HUD */}
      {(gameState?.screen === 'PLAYING' || gameState?.screen === 'PAUSED') && (
        <GameHUD
          currentFloor={gameState.currentFloor}
          totalFloors={gameState.totalFloors}
          energy={gameState.raccoon.energy ?? 100}
          isRestingOnSill={gameState.raccoon.isRestingOnSill}
          isSpeedBoosted={gameState.raccoon.isSpeedBoosted}
          isMuted={gameState.isMuted}
          activeToast={gameState.activeToast}
          onPause={handlePause}
          onToggleMute={handleToggleMute}
          onJoystickMove={handleJoystickMove}
          onJoystickEnd={handleJoystickEnd}
        />
      )}

      {/* Modal: Pause Screen */}
      {gameState?.screen === 'PAUSED' && (
        <PauseModal
          currentFloor={gameState.currentFloor}
          altitudeMeters={gameState.altitudeMeters}
          bestFloor={gameState.bestFloor}
          isMuted={gameState.isMuted}
          onResume={handleResume}
          onRestart={handleRestart}
          onMainMenu={handleMainMenu}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Modal: Victory Screen */}
      {gameState?.screen === 'VICTORY' && (
        <VictoryModal
          climbTimeSeconds={gameState.climbTimeSeconds}
          altitudeMeters={gameState.altitudeMeters}
          onClimbAgain={handleRestart}
          onMainMenu={handleMainMenu}
        />
      )}

      {/* Modal: Game Over / Out of Energy Screen */}
      {gameState?.screen === 'GAME_OVER' && (
        <GameOverModal
          currentFloor={gameState.currentFloor}
          totalFloors={gameState.totalFloors}
          altitudeMeters={gameState.altitudeMeters}
          bestFloor={gameState.bestFloor}
          onClimbAgain={handleRestart}
          onMainMenu={handleMainMenu}
        />
      )}
    </ArcadeFrame>
  );
}
