/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArcadeFrame } from './components/ArcadeFrame';
import { GameHUD } from './components/GameHUD';
import { PauseModal } from './components/PauseModal';
import { TitleScreen } from './components/TitleScreen';
import { CharacterSelectScreen } from './components/CharacterSelectScreen';
import { LevelSelectScreen } from './components/LevelSelectScreen';
import { VictoryModal } from './components/VictoryModal';
import { GameOverModal } from './components/GameOverModal';
import { RoofCelebrationModal } from './components/RoofCelebrationModal';
import { GameEngine } from './game/GameEngine';
import { GameEngineState } from './game/types';
import { DailyMissionsModal } from './components/DailyMissionsModal';
import { BetaFeedbackModal } from './components/BetaFeedbackModal';
import { EarlyAccessModal } from './components/EarlyAccessModal';
import { loadDailyMissions } from './game/dailyMissions';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameEngineState | null>(null);
  const [showMissionsModal, setShowMissionsModal] = useState<boolean>(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [showEarlyAccessModal, setShowEarlyAccessModal] = useState<boolean>(false);
  const [titleMenuMode, setTitleMenuMode] = useState<'ROOT' | 'ARCADE' | 'BRAINPOWER'>('ROOT');

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

  const handleSpeedBoost = useCallback((isBoosted: boolean) => {
    engineRef.current?.setSpeedBoost(isBoosted);
  }, []);

  const handleStartGameWithCharacter = useCallback((charId: string) => {
    engineRef.current?.startGameWithCharacter(charId);
    try {
      const missions = loadDailyMissions();
      if (missions.autoShowOnStart) {
        setShowMissionsModal(true);
      }
    } catch {}
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

      {/* Screen: Main Menu Title Screen & Sub-Menus */}
      {gameState?.screen === 'MAIN_MENU' && (
        <TitleScreen
          onClimb={handleClimb}
          isMuted={gameState.isMuted}
          onToggleMute={handleToggleMute}
          bestFloor={gameState.bestFloor}
          onOpenFeedback={() => setShowFeedbackModal(true)}
          onOpenEarlyAccess={() => setShowEarlyAccessModal(true)}
          selectedCharacterId={gameState.selectedCharacterId || 'mprraccoon'}
          onSelectCharacter={(charId) => engineRef.current?.selectCharacter(charId)}
          onOpenCharacterSelect={() => engineRef.current?.openCharacterSelect()}
          selectedLevelId={gameState.selectedLevelId || 'st_paul'}
          onSelectLevel={(levelId) => engineRef.current?.selectLevel(levelId)}
          onOpenLevelSelect={() => engineRef.current?.openLevelSelect()}
          initialMenuMode={titleMenuMode}
          onMenuModeChange={setTitleMenuMode}
        />
      )}

      {/* Screen: Choose Your Raccoon Character Selection Screen */}
      {gameState?.screen === 'CHARACTER_SELECT' && (
        <CharacterSelectScreen
          selectedCharacterId={gameState.selectedCharacterId || 'mprraccoon'}
          onSelectCharacter={(charId) => engineRef.current?.selectCharacter(charId)}
          onStartGame={handleStartGameWithCharacter}
          onBackToMenu={handleMainMenu}
          isMuted={gameState.isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Screen: Choose Level Selection Screen */}
      {gameState?.screen === 'LEVEL_SELECT' && (
        <LevelSelectScreen
          selectedLevelId={gameState.selectedLevelId || 'st_paul'}
          onSelectLevel={(levelId) => engineRef.current?.selectLevel(levelId)}
          onStartGame={(levelId) => {
            if (levelId) engineRef.current?.selectLevel(levelId);
            handleStartGameWithCharacter(gameState.selectedCharacterId || 'mprraccoon');
          }}
          onBackToMenu={handleMainMenu}
          isMuted={gameState.isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Screen: Active Play HUD */}
      {(gameState?.screen === 'PLAYING' || gameState?.screen === 'PAUSED') && (
        <GameHUD
          currentFloor={gameState.currentFloor}
          totalFloors={gameState.totalFloors}
          energy={gameState.raccoon.energy ?? 100}
          isRestingOnSill={gameState.raccoon.isRestingOnSill}
          currentSpeedRatio={gameState.raccoon.currentSpeedRatio ?? 1.0}
          isSpeedBoosted={gameState.raccoon.isSpeedBoosted ?? false}
          boostCooldownTimer={gameState.raccoon.boostCooldownTimer ?? 0}
          boostActiveTimer={gameState.raccoon.boostActiveTimer ?? 0}
          isMuted={gameState.isMuted}
          activeToast={gameState.activeToast}
          interactionPrompt={gameState.interactionPrompt}
          halfwayMilestoneTimer={gameState.halfwayMilestoneTimer}
          onDismissHalfwayMilestone={() => engineRef.current?.dismissHalfwayMilestone()}
          weather={gameState.atmosphere?.weather}
          onCycleWeather={() => engineRef.current?.cycleWeather()}
          onOpenMissions={() => setShowMissionsModal(true)}
          onPause={handlePause}
          onToggleMute={handleToggleMute}
          onSpeedBoost={handleSpeedBoost}
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
          onOpenMissions={() => setShowMissionsModal(true)}
          onOpenFeedback={() => setShowFeedbackModal(true)}
          onOpenEarlyAccess={() => setShowEarlyAccessModal(true)}
        />
      )}

      {/* Modal: Public Beta Feedback Screen */}
      {showFeedbackModal && (
        <BetaFeedbackModal onClose={() => setShowFeedbackModal(false)} />
      )}

      {/* Modal: Early Access Club Screen */}
      {showEarlyAccessModal && (
        <EarlyAccessModal onClose={() => setShowEarlyAccessModal(false)} />
      )}

      {/* Modal: Daily Missions Screen */}
      {showMissionsModal && (
        <DailyMissionsModal
          onClose={() => setShowMissionsModal(false)}
          onStartGame={() => setShowMissionsModal(false)}
          isGameStart={gameState?.screen === 'PLAYING'}
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

      {/* Modal: Roof Celebration Scene */}
      {gameState?.screen === 'ROOF_CELEBRATION' && (
        <RoofCelebrationModal
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
