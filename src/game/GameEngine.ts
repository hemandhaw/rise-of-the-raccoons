/**
 * Rise of the Raccoons! - Game Engine
 * Decoupled 60fps game simulation loop, physics, input smoothing, and floor tracking.
 */

import { sound } from './audio';
import { getSavedCharacterId, saveSelectedCharacterId } from './characterConfig';
import { getSavedLevelId, saveSelectedLevelId } from './levelConfig';
import { GAME_CONFIG, getTrashCanStartX, getEnergySpeedRatio, getScaledSnackEnergy } from './config';
import {
  EncounterDirector,
  EncounterDefinition,
  ENCOUNTERS_BY_ID,
  MASTER_ENCOUNTERS,
} from './encounterData';
import { InputController } from './input';
import { GameRenderer } from './renderer';
import { generateSkyscraperFloors } from './skyscraper';
import {
  FloatingTextEffect,
  FloorData,
  GameEngineState,
  GameScreen,
  HotAirBalloon,
  PersonVariant,
  SnackItem,
  SnackParticle,
  SnackType,
  SpookEvent,
  SpookToast,
  SpookType,
  VehicleType,
  WindowDecoration,
} from './types';
import { reportDailyMissionEvent, MissionEventType } from './dailyMissions';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: GameRenderer;
  private input: InputController;
  private floors: FloorData[];

  private state: GameEngineState;
  private animationFrameId: number | null = null;
  private lastTimeMs: number = 0;
  private onStateChange?: (state: GameEngineState) => void;
  private lastNotifiedFloor: number = 1;
  private bestFloor: number = 1;
  private bestScore: number = 0;
  private lastUiNotifyTime: number = 0;

  // Master Content Bible Encounter Director (Enforces Height, Cooldown, Anti-Spam & Pacing rules)
  private encounterDirector: EncounterDirector = new EncounterDirector();

  // Slice 3: Snack & Spook spawning timers
  private snackSpawnTimer: number = 0.5;
  private spookSpawnTimer: number = 4.5;
  private nextSnackId: number = 1;
  private nextSpookId: number = 1;
  private nextParticleId: number = 1;
  private nextTextId: number = 1;

  // Atmospheric features (Scale as raccoon ascends higher)
  private atmosphereSpawnTimer: number = 0.5;
  private nextLightningTimer: number = 10.0;
  private nextAtmosphereId: number = 1;
  private trashTossCooldown: number = 0;

  // Street-level features
  private vehicleSpawnTimer: number = 1.8;
  private nextVehicleId: number = 1;

  // Window ledge resting reward
  private sillRestDuration: number = 0;
  private hasSpawnedRestSnack: boolean = false;
  private lastRestingSillKey: string = '';

  // Cooldowns and special event triggers
  private snackCollectionCooldown: number = 0;
  private spookGlobalCooldown: number = 0;
  private hasPlayedEagleScreech: boolean = false;
  private roofCelebrationActive: boolean = false;
  private roofCelebrationTimer: number = 0;
  private hasTriggeredHalfwayMilestone: boolean = false;

  constructor(canvas: HTMLCanvasElement, onStateChange?: (state: GameEngineState) => void) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Failed to obtain 2D rendering context');
    }
    this.ctx = context;
    this.renderer = new GameRenderer();
    this.input = new InputController();
    this.floors = generateSkyscraperFloors();
    this.onStateChange = onStateChange;

    // Load persistent best floor and score from browser localStorage
    try {
      const savedFloor = localStorage.getItem('rotr_best_floor');
      if (savedFloor !== null) {
        this.bestFloor = Math.max(1, parseInt(savedFloor, 10) || 1);
      }
      const savedScore = localStorage.getItem('rotr_best_score');
      if (savedScore !== null) {
        this.bestScore = parseInt(savedScore, 10) || 0;
      }
    } catch {
      this.bestFloor = 1;
      this.bestScore = 0;
    }

    const trashCanY = GAME_CONFIG.TRASH_CAN.GROUND_Y;
    const initialY = trashCanY + 0.015; // Starting tucked inside alley trash can
    const trashCanStartX = getTrashCanStartX();
    const { BUILDING_CENTER_X, BUILDING_WIDTH_RATIO } = GAME_CONFIG.SKYSCRAPER;
    const bLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
    const leftCanX = bLeft + GAME_CONFIG.TRASH_CAN.LEFT_CAN_OFFSET;
    const rightCanX = trashCanStartX; // Single right trash can on the right side of the building
    const dumpsterX = 0.50; // In between the side trash cans

    this.state = {
      screen: 'MAIN_MENU',
      raccoon: {
        x: trashCanStartX,
        y: initialY,
        vx: 0,
        vy: 0,
        facing: 'up',
        lastSideFacing: 'right',
        climbPhase: 0,
        tailAngle: 0,
        isClimbing: false,
        isScrambling: false,
        isKeyboardControlled: false,
        isRestingOnSill: false,
        restingSillFloor: null,
        restingSillWindowIndex: null,
        climbGaitMode: 'vertical',
        diagonalDirection: { x: 1, y: 1 },
        lastHeadingDirection: 'up',
        lastVerticalDirection: 1,
        slipEffectTimer: 0,
        squashFactor: 1.0,
        isInTrashCan: true,
        climbOutOfCanTimer: 0,
        energy: GAME_CONFIG.ENERGY.MAX_ENERGY,
        continuousClimbDuration: 0,
        currentSpeedRatio: 1.0,
        isSpeedBoosted: false,
        pawPositions: {
          frontLeft: { x: 0, y: 0 },
          frontRight: { x: 0, y: 0 },
          backLeft: { x: 0, y: 0 },
          backRight: { x: 0, y: 0 },
        },
      },
      camera: {
        x: trashCanStartX,
        y: 0.08,
        targetX: trashCanStartX,
        targetY: 0.08,
        shake: 0,
      },
      trashCan: {
        x: trashCanStartX,
        y: trashCanY,
        width: GAME_CONFIG.TRASH_CAN.WIDTH_RATIO,
        height: GAME_CONFIG.TRASH_CAN.HEIGHT_RATIO,
        lidAngle: 0.35,
        lidRattleTimer: 0,
      },
      leftTrashCan: {
        x: leftCanX,
        y: trashCanY,
        width: GAME_CONFIG.TRASH_CAN.WIDTH_RATIO,
        height: GAME_CONFIG.TRASH_CAN.HEIGHT_RATIO,
        lidAngle: 0.25,
        lidRattleTimer: 0,
      },
      rightTrashCan: {
        x: rightCanX,
        y: trashCanY,
        width: GAME_CONFIG.TRASH_CAN.WIDTH_RATIO,
        height: GAME_CONFIG.TRASH_CAN.HEIGHT_RATIO,
        lidAngle: 0.35,
        lidRattleTimer: 0,
      },
      dumpster: {
        x: dumpsterX,
        y: trashCanY,
        width: GAME_CONFIG.TRASH_CAN.DUMPSTER_WIDTH_RATIO,
        height: GAME_CONFIG.TRASH_CAN.DUMPSTER_HEIGHT_RATIO,
        lidRattleTimer: 0,
      },
      trashParticles: [],
      snacks: [],
      spooks: [],
      floatingTexts: [],
      snackParticles: [],
      spookInvulnerabilityTimer: 0,
      activeToast: null,
      atmosphere: {
        squirrels: [],
        bats: [],
        geeseFlocks: [],
        soaringBirds: [],
        balloons: [],
        lightning: null,
        mistClouds: [],
        lightningFlashAlpha: 0,
        kite: this.initStreetKite(),
        sillPigeons: this.initSillPigeons(),
        superhero: null,
        weather: this.initWeather(),
      },
      streetVehicles: [],
      laundryLine: {
        hasDropped: false,
        clothes: [
          { id: 1, offsetRatio: 0.12, type: 'shirt', color: '#f43f5e', dropped: false },
          { id: 2, offsetRatio: 0.28, type: 'socks', color: '#facc15', dropped: false },
          { id: 3, offsetRatio: 0.44, type: 'sheet', color: '#f8fafc', dropped: false },
          { id: 4, offsetRatio: 0.62, type: 'pants', color: '#3b82f6', dropped: false },
          { id: 5, offsetRatio: 0.78, type: 'shirt', color: '#a855f7', dropped: false },
          { id: 6, offsetRatio: 0.90, type: 'socks', color: '#ec4899', dropped: false },
        ],
        fallingItems: [],
      },
      electricSparks: [],
      navigationBarriers: this.initNavigationBarriers(),
      celebrationFireworks: [],
      celebrationTimer: 0,
      interactionPrompt: null,
      currentFloor: 1,
      highestFloorReached: 1,
      bestFloor: this.bestFloor,
      bestScore: this.bestScore,
      altitudeMeters: 0,
      climbTimeSeconds: 0,
      totalFloors: GAME_CONFIG.SKYSCRAPER.TOTAL_FLOORS,
      isMuted: sound.isMuted(),
      selectedCharacterId: getSavedCharacterId(),
      selectedLevelId: getSavedLevelId(),
      halfwayMilestoneTimer: 0,
    };

    // Seed initial snacks on lower window sills
    this.seedInitialSnacks();
    this.seedInitialSquirrels();

    // Attach input listeners
    this.input.attach(canvas, {
      onPause: () => this.togglePause(),
      onAction: () => {
        if (this.state.screen === 'MAIN_MENU') {
          this.openCharacterSelect();
        }
      },
    });

    this.resizeCanvas();
  }

  public resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const rect = this.canvas.getBoundingClientRect();

    if (rect.width > 0 && rect.height > 0) {
      const displayW = Math.round(rect.width * dpr);
      const displayH = Math.round(rect.height * dpr);

      if (this.canvas.width !== displayW || this.canvas.height !== displayH) {
        this.canvas.width = displayW;
        this.canvas.height = displayH;
      }
    }
  }

  public start() {
    this.lastTimeMs = performance.now();
    this.loop = this.loop.bind(this);
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  public stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.input.detach();
  }

  public setJoystickVector(x: number, y: number, active: boolean, isBoosted = false) {
    this.input.setJoystickVector(x, y, active, isBoosted);
  }

  public setSpeedBoost(isBoosted: boolean) {
    this.input.setSpeedBoost(isBoosted);
  }

  /**
   * Seeds an initial climbing squirrel above the starting position with enough space to react & avoid
   */
  private seedInitialSquirrels() {
    const mullions = this.getBrickMullionLanes();
    // Keep squirrels away from the window nearest the starting position (Floor 1 Window 5):
    // Place initial squirrel on Column 1 (left side of building) climbing downward
    const initialCol = 1;
    const initialX = mullions[initialCol];
    this.state.atmosphere.squirrels = [
      {
        id: this.nextAtmosphereId++,
        x: initialX,
        y: 0.95,
        targetY: 0.65, // Actively climbing downward!
        vx: 0,
        vy: 0.08,
        facing: 'down',
        side: 'left',
        state: 'climbing_wall',
        currentColumn: initialCol,
        tailAngle: 0,
        climbPhase: 0,
        pauseTimer: 0.4,
        acorn: true,
      },
    ];
  }

  /**
   * Initializes navigation barriers across the skyscraper ascent.
   * Enforces rule: raccoon cannot climb straight upward more than 4 floors without encountering
   * elements that force it to move left/right one or more window bays/columns.
   * Floor 13 features a full-width traversal barrier forcing crossing to the far right.
   * Barriers cause NO slipping or energy loss—they simply block direct vertical passage.
   */
  private initNavigationBarriers(): import('./types').NavigationBarrier[] {
    const { FLOOR_HEIGHT_RATIO, WINDOW_WIDTH_RATIO, WINDOWS_PER_FLOOR, BUILDING_WIDTH_RATIO, BUILDING_CENTER_X } = GAME_CONFIG.SKYSCRAPER;
    const bLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
    const bRight = BUILDING_CENTER_X + BUILDING_WIDTH_RATIO / 2;
    const winW = WINDOW_WIDTH_RATIO;
    const totalWinsW = WINDOWS_PER_FLOOR * winW;
    const gap = (BUILDING_WIDTH_RATIO - totalWinsW) / (WINDOWS_PER_FLOOR + 1);

    const getColSpan = (col: number) => {
      if (col === 0) {
        return { left: bLeft, right: bLeft + gap * 0.95 };
      } else if (col === 6) {
        const lastWinRight = bLeft + gap + 5 * (winW + gap) + winW;
        return { left: lastWinRight + gap * 0.05, right: bRight };
      } else {
        const winIdx = col - 1;
        const colLeft = bLeft + gap + winIdx * (winW + gap) + winW;
        return { left: colLeft - 0.01, right: colLeft + gap + 0.01 };
      }
    };

    const getColumnsSpan = (cols: number[]) => {
      let minX = Infinity;
      let maxX = -Infinity;
      for (const c of cols) {
        const s = getColSpan(c);
        if (s.left < minX) minX = s.left;
        if (s.right > maxX) maxX = s.right;
      }
      return { minX, maxX };
    };

    const barriers: import('./types').NavigationBarrier[] = [];

    // Barrier 1 (Floor 3): Scaffolding with window cleaner (blocks cols 4, 5, 6)
    const b1Cols = [4, 5, 6];
    const b1Span = getColumnsSpan(b1Cols);
    barriers.push({
      id: 'barrier_scaffolding_f3',
      floor: 3,
      type: 'scaffolding',
      blockedColumns: b1Cols,
      worldY: 2 * FLOOR_HEIGHT_RATIO + 0.16,
      height: 0.14,
      leftX: b1Span.minX,
      rightX: b1Span.maxX,
      label: 'WINDOW WASHER',
    });

    // Barrier 2 (Floor 5): Drone Patrol (blocks cols 0, 1)
    const b2Cols = [0, 1];
    const b2Span = getColumnsSpan(b2Cols);
    barriers.push({
      id: 'barrier_drone_f5',
      floor: 5,
      type: 'drone',
      blockedColumns: b2Cols,
      worldY: 4 * FLOOR_HEIGHT_RATIO + 0.20,
      height: 0.12,
      leftX: b2Span.minX,
      rightX: b2Span.maxX,
      label: 'SECURITY DRONE',
    });

    // Barrier 3 (Floor 7): Banner "Never Give Up!" (blocks cols 2, 3, 4)
    const b3Cols = [2, 3, 4];
    const b3Span = getColumnsSpan(b3Cols);
    barriers.push({
      id: 'barrier_banner_never_give_up_f7',
      floor: 7,
      type: 'banner_never_give_up',
      blockedColumns: b3Cols,
      worldY: 6 * FLOOR_HEIGHT_RATIO + 0.22,
      height: 0.13,
      leftX: b3Span.minX,
      rightX: b3Span.maxX,
      label: 'NEVER GIVE UP!',
    });

    // Barrier 4 (Floor 10): Hovering Inspection Drone & Scaffolding (blocks cols 0, 1, 6)
    const b4SpanL = getColumnsSpan([0, 1]);
    const b4SpanR = getColSpan(6);
    barriers.push({
      id: 'barrier_drone_f10_left',
      floor: 10,
      type: 'drone',
      blockedColumns: [0, 1],
      worldY: 9 * FLOOR_HEIGHT_RATIO + 0.20,
      height: 0.12,
      leftX: b4SpanL.minX,
      rightX: b4SpanL.maxX,
      label: 'INSPECTION DRONE',
    });
    barriers.push({
      id: 'barrier_scaffold_f10_right',
      floor: 10,
      type: 'scaffolding',
      blockedColumns: [6],
      worldY: 9 * FLOOR_HEIGHT_RATIO + 0.20,
      height: 0.12,
      leftX: b4SpanR.left,
      rightX: b4SpanR.right,
      label: 'MAINTENANCE',
    });

    // Barrier 5 (Floor 13): Full-Width Mandatory Traversal Barrier!
    // Blocks columns 0, 1, 2, 3, 4, 5! Leaves ONLY Column 6 (far right) open!
    // Forces any player climbing on the left or center to traverse all the way across.
    const b5Cols = [0, 1, 2, 3, 4, 5];
    const b5Span = getColumnsSpan(b5Cols);
    barriers.push({
      id: 'barrier_crossover_f13',
      floor: 13,
      type: 'full_width_mesh',
      blockedColumns: b5Cols,
      worldY: 12 * FLOOR_HEIGHT_RATIO + 0.15,
      height: 0.16,
      leftX: b5Span.minX,
      rightX: b5Span.maxX,
      label: 'CROSSOVER TO FAR RIGHT ➔',
    });

    // Barrier 6 (Floor 16): Suspended Maintenance Platform (blocks cols 4, 5, 6)
    const b6Cols = [4, 5, 6];
    const b6Span = getColumnsSpan(b6Cols);
    barriers.push({
      id: 'barrier_platform_f16',
      floor: 16,
      type: 'maintenance_platform',
      blockedColumns: b6Cols,
      worldY: 15 * FLOOR_HEIGHT_RATIO + 0.20,
      height: 0.12,
      leftX: b6Span.minX,
      rightX: b6Span.maxX,
      label: 'MAINTENANCE PLATFORM',
    });

    // Barrier 7 (Floor 17): Eagle Nest (blocks cols 1, 2, 3)
    const b7Cols = [1, 2, 3];
    const b7Span = getColumnsSpan(b7Cols);
    barriers.push({
      id: 'barrier_eagle_nest_f17',
      floor: 17,
      type: 'eagle_nest',
      blockedColumns: b7Cols,
      worldY: 16 * FLOOR_HEIGHT_RATIO + 0.18,
      height: 0.14,
      leftX: b7Span.minX,
      rightX: b7Span.maxX,
      label: 'EAGLE NEST 🦅',
    });

    // Barrier 8 (Floor 20): Banner "You can do it!" (blocks cols 3, 4, 5, 6)
    const b8Cols = [3, 4, 5, 6];
    const b8Span = getColumnsSpan(b8Cols);
    barriers.push({
      id: 'barrier_banner_you_can_do_it_f20',
      floor: 20,
      type: 'banner_you_can_do_it',
      blockedColumns: b8Cols,
      worldY: 19 * FLOOR_HEIGHT_RATIO + 0.22,
      height: 0.13,
      leftX: b8Span.minX,
      rightX: b8Span.maxX,
      label: 'YOU CAN DO IT!',
    });

    // Barrier 9 (Floor 23): High-Rise Drone Fleet (blocks cols 0, 1, 2)
    const b9Cols = [0, 1, 2];
    const b9Span = getColumnsSpan(b9Cols);
    barriers.push({
      id: 'barrier_drone_f23',
      floor: 23,
      type: 'drone',
      blockedColumns: b9Cols,
      worldY: 22 * FLOOR_HEIGHT_RATIO + 0.20,
      height: 0.12,
      leftX: b9Span.minX,
      rightX: b9Span.maxX,
      label: 'SURVEILLANCE DRONE',
    });

    return barriers;
  }

  private initStreetKite(): import('./types').StreetKite {
    const { STREET_KITE } = GAME_CONFIG.INTERACTIVE_ELEMENTS;
    const initialTargetY = STREET_KITE.MIN_WORLD_Y + 0.35;
    return {
      childX: STREET_KITE.CHILD_X,
      childY: STREET_KITE.CHILD_Y,
      kiteX: STREET_KITE.KITE_BASE_X,
      kiteY: STREET_KITE.MIN_WORLD_Y, // Begins at second floor
      targetY: initialTargetY,
      speedY: 0.045,
      targetTimer: 3.5,
      swayPhase: 0,
    };
  }

  private initSillPigeons(): import('./types').SillPigeonsGroup {
    const pigeons: import('./types').NappingPigeon[] = [];
    for (let i = 0; i < 12; i++) {
      pigeons.push({
        id: i,
        offsetRatio: 0.08 + (i / 11) * 0.84,
        facing: (i % 2 === 0 ? 1 : -1) as (1 | -1),
        state: 'napping',
        flyX: 0,
        flyY: 0,
        flyVx: 0,
        flyVy: 0,
        wingPhase: (i * 0.55) % (Math.PI * 2),
      });
    }
    return {
      floorNumber: 2,
      windowIndex: 2,
      isScattered: false,
      scatterTimer: 0,
      pigeons,
    };
  }

  private initWeather(): import('./types').WeatherState {
    return {
      type: 'clear',
      intensity: 1.0,
      targetType: 'clear',
      transitionTimer: 0,
      drops: [],
      splashes: [],
      wind: 0.15,
      groundWetness: 0,
      frostLevel: 0,
      mode: 'auto',
    };
  }

  private initCelebrationFireworks() {
    this.state.celebrationFireworks = [];
    this.state.celebrationTimer = 0;
    const colors = ['#f43f5e', '#38bdf8', '#facc15', '#4ade80', '#c084fc', '#fb923c', '#ffffff'];
    for (let i = 0; i < 45; i++) {
      const angle = (Math.PI * 2 * i) / 45 + (Math.random() - 0.5) * 0.3;
      const speed = 0.08 + Math.random() * 0.22;
      this.state.celebrationFireworks.push({
        id: i + 1,
        x: this.state.raccoon.x,
        y: this.state.raccoon.y + 0.08,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[i % colors.length],
        size: 3 + Math.random() * 4,
        alpha: 1.0,
        age: 0,
        maxAge: 2.2 + Math.random() * 1.5,
      });
    }
  }

  private updateCelebrationFireworks(dt: number) {
    if (!this.state.celebrationFireworks || this.state.celebrationFireworks.length === 0) return;
    this.state.celebrationTimer = (this.state.celebrationTimer || 0) + dt;
    for (const fw of this.state.celebrationFireworks) {
      fw.age += dt;
      fw.x += fw.vx * dt;
      fw.y += fw.vy * dt;
      fw.vy -= 0.06 * dt;
      fw.alpha = Math.max(0, 1.0 - fw.age / fw.maxAge);
    }
    if (Math.random() < 0.12 && this.state.celebrationFireworks.length < 80) {
      const colors = ['#f43f5e', '#38bdf8', '#facc15', '#4ade80', '#c084fc', '#fb923c', '#ffffff'];
      const burstX = this.state.raccoon.x + (Math.random() - 0.5) * 0.35;
      const burstY = this.state.raccoon.y + 0.05 + Math.random() * 0.18;
      for (let j = 0; j < 18; j++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 0.06 + Math.random() * 0.18;
        this.state.celebrationFireworks.push({
          id: Math.floor(Math.random() * 100000),
          x: burstX,
          y: burstY,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 2.5 + Math.random() * 3.5,
          alpha: 1.0,
          age: 0,
          maxAge: 1.8 + Math.random() * 1.2,
        });
      }
    }
    this.state.celebrationFireworks = this.state.celebrationFireworks.filter((f) => f.age < f.maxAge);
  }

  /**
   * Seamlessly transitions raccoon from crawling on the ground into climbing up or diagonally up the building,
   * identical to the feel of climbing out of a trash can or dumpster.
   */
  public climbUpFromGround(dirX: number = 0) {
    const groundSurfaceY = GAME_CONFIG.TRASH_CAN.GROUND_Y;
    this.state.raccoon.isRestingOnSill = false;
    this.state.raccoon.restingSillFloor = null;
    this.state.raccoon.restingSillWindowIndex = null;
    this.state.raccoon.isInTrashCan = false;
    this.state.raccoon.isClimbing = true;
    this.state.raccoon.y = Math.max(this.state.raccoon.y, groundSurfaceY + GAME_CONFIG.RACCOON.HEIGHT_RATIO * 0.45);

    const { MOVE_SPEED_X, CLIMB_SPEED_UP } = GAME_CONFIG.RACCOON;
    if (dirX !== 0) {
      const sX = Math.sign(dirX);
      this.state.raccoon.facing = sX > 0 ? 'right' : 'left';
      this.state.raccoon.lastSideFacing = sX > 0 ? 'right' : 'left';
      this.state.raccoon.diagonalDirection = { x: sX as 1 | -1, y: 1 };
      this.state.raccoon.climbGaitMode = 'diagonal';
      this.state.raccoon.vx = sX * MOVE_SPEED_X;
      this.state.raccoon.vy = MOVE_SPEED_X;
    } else {
      this.state.raccoon.facing = 'up';
      this.state.raccoon.lastHeadingDirection = 'up';
      this.state.raccoon.climbGaitMode = 'vertical';
      this.state.raccoon.vx = 0;
      this.state.raccoon.vy = CLIMB_SPEED_UP;
    }
    sound.playPawStep(false);
  }

  public popOutOfTrashCan(dirX: number = 0) {
    if (!this.state.raccoon.isInTrashCan) return;
    this.state.raccoon.isInTrashCan = false;
    this.state.raccoon.climbOutOfCanTimer = 0.50;
    this.state.raccoon.isRestingOnSill = false;
    this.state.raccoon.restingSillFloor = null;
    this.state.raccoon.restingSillWindowIndex = null;

    const cType = this.state.raccoon.containerType || 'right_can';
    let canTop: number;
    let canX: number;
    if (cType === 'left_can') {
      canTop = this.state.leftTrashCan.y + this.state.leftTrashCan.height;
      canX = this.state.leftTrashCan.x;
      this.state.leftTrashCan.lidRattleTimer = 0.65;
    } else if (cType === 'dumpster') {
      canTop = this.state.dumpster.y + this.state.dumpster.height;
      canX = this.state.dumpster.x;
      this.state.dumpster.lidRattleTimer = 0.65;
    } else {
      canTop = this.state.rightTrashCan.y + this.state.rightTrashCan.height;
      canX = this.state.rightTrashCan.x;
      this.state.rightTrashCan.lidRattleTimer = 0.65;
      this.state.trashCan.lidRattleTimer = 0.65;
    }

    // Position cleanly above the trash can so raccoon begins climbing above the trash can
    this.state.raccoon.y = canTop + GAME_CONFIG.RACCOON.HEIGHT_RATIO * 0.70;
    const { MOVE_SPEED_X, CLIMB_SPEED_UP } = GAME_CONFIG.RACCOON;

    if (dirX !== 0) {
      const sX = Math.sign(dirX);
      this.state.raccoon.facing = sX > 0 ? 'right' : 'left';
      this.state.raccoon.lastSideFacing = sX > 0 ? 'right' : 'left';
      this.state.raccoon.diagonalDirection = { x: sX as 1 | -1, y: 1 };
      this.state.raccoon.climbGaitMode = 'diagonal';
      this.state.raccoon.vx = sX * MOVE_SPEED_X;
      this.state.raccoon.vy = MOVE_SPEED_X;
    } else {
      this.state.raccoon.facing = 'up';
      this.state.raccoon.lastHeadingDirection = 'up';
      this.state.raccoon.climbGaitMode = 'vertical';
      this.state.raccoon.vx = 0;
      this.state.raccoon.vy = CLIMB_SPEED_UP;
    }

    this.state.camera.targetY = Math.max(0.12, this.state.raccoon.y);
    this.triggerTrashPop(canX, canTop, dirX);
    this.checkDailyMissionEvent('trash_pop', 1);
  }

  public openCharacterSelect() {
    sound.playMenuClick();
    this.state.screen = 'CHARACTER_SELECT';
    this.notifyState();
  }

  public openLevelSelect() {
    sound.playMenuClick();
    this.state.screen = 'LEVEL_SELECT';
    this.notifyState();
  }

  public selectCharacter(characterId: string) {
    this.state.selectedCharacterId = characterId;
    saveSelectedCharacterId(characterId);
    this.notifyState();
  }

  public selectLevel(levelId: string) {
    this.state.selectedLevelId = levelId;
    saveSelectedLevelId(levelId);
    this.notifyState();
  }

  public startGameWithCharacter(characterId: string) {
    this.selectCharacter(characterId);
    this.startGame();
  }

  public startGameWithLevel(levelId: string) {
    this.selectLevel(levelId);
    this.startGame();
  }

  public startGame() {
    sound.playGameStart();
    this.encounterDirector.reset();
    this.state.screen = 'PLAYING';
    this.state.climbTimeSeconds = 0;
    this.state.raccoon.energy = 100;
    // When the game begins, the raccoon is inside the trash can with its head poking out!
    this.state.raccoon.isInTrashCan = true;
    this.state.raccoon.containerType = 'right_can';
    this.state.raccoon.x = this.state.trashCan.x;
    this.state.raccoon.y = GAME_CONFIG.TRASH_CAN.GROUND_Y + 0.015;
    this.state.raccoon.vx = 0;
    this.state.raccoon.vy = 0;
    this.state.raccoon.isRestingOnSill = false;
    this.state.raccoon.restingSillFloor = null;
    this.state.raccoon.restingSillWindowIndex = null;
    this.state.raccoon.facing = 'up';
    this.state.raccoon.isSpeedBoosted = false;
    this.state.raccoon.boostActiveTimer = 0;
    this.state.raccoon.boostCooldownTimer = 0;
    this.state.raccoon.continuousClimbDuration = 0;
    this.state.raccoon.currentSpeedRatio = 1.0;
    this.state.camera.targetX = this.state.trashCan.x;
    this.state.camera.targetY = 0.08;
    this.state.interactionPrompt = null;
    this.state.celebrationFireworks = [];
    this.state.celebrationTimer = 0;
    this.roofCelebrationActive = false;
    this.roofCelebrationTimer = 0;
    this.state.navigationBarriers = this.initNavigationBarriers();
    this.snackCollectionCooldown = 0;
    this.spookGlobalCooldown = 0;
    this.hasPlayedEagleScreech = false;
    this.seedInitialSquirrels();
    this.notifyState();
  }

  public resetGame() {
    sound.playGameStart();
    this.encounterDirector.reset();
    this.roofCelebrationActive = false;
    this.roofCelebrationTimer = 0;
    const trashCanY = GAME_CONFIG.TRASH_CAN.GROUND_Y;
    const trashCanStartX = getTrashCanStartX();
    this.state.screen = 'PLAYING';
    // When starting from 'Climb Again', raccoon begins inside the trash can with head poking out
    this.state.raccoon.x = trashCanStartX;
    this.state.raccoon.y = trashCanY + 0.015;
    this.state.raccoon.vx = 0;
    this.state.raccoon.vy = 0;
    this.state.raccoon.facing = 'up';
    this.state.raccoon.lastSideFacing = 'right';
    this.state.raccoon.isRestingOnSill = false;
    this.state.raccoon.restingSillFloor = null;
    this.state.raccoon.restingSillWindowIndex = null;
    this.state.raccoon.climbGaitMode = 'vertical';
    this.state.raccoon.diagonalDirection = { x: 1, y: 1 };
    this.state.raccoon.lastHeadingDirection = 'up';
    this.state.raccoon.lastVerticalDirection = 1;
    this.state.raccoon.climbPhase = 0;
    this.state.raccoon.slipEffectTimer = 0;
    this.state.raccoon.isInTrashCan = true;
    this.state.raccoon.containerType = 'right_can';
    this.state.raccoon.climbOutOfCanTimer = 0;
    this.state.raccoon.energy = 100;
    this.state.raccoon.isSpeedBoosted = false;
    this.state.raccoon.boostActiveTimer = 0;
    this.state.raccoon.boostCooldownTimer = 0;
    this.state.raccoon.continuousClimbDuration = 0;
    this.state.raccoon.currentSpeedRatio = 1.0;
    this.state.trashCan.lidAngle = 0.35;
    this.state.trashCan.lidRattleTimer = 0;
    const { BUILDING_CENTER_X, BUILDING_WIDTH_RATIO } = GAME_CONFIG.SKYSCRAPER;
    const bLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
    const leftCanX = bLeft + GAME_CONFIG.TRASH_CAN.LEFT_CAN_OFFSET;
    const rightCanX = trashCanStartX;
    const dumpsterX = 0.50;
    this.state.trashCan = {
      x: trashCanStartX,
      y: trashCanY,
      width: GAME_CONFIG.TRASH_CAN.WIDTH_RATIO,
      height: GAME_CONFIG.TRASH_CAN.HEIGHT_RATIO,
      lidAngle: 0.35,
      lidRattleTimer: 0,
    };
    this.state.leftTrashCan = {
      x: leftCanX,
      y: trashCanY,
      width: GAME_CONFIG.TRASH_CAN.WIDTH_RATIO,
      height: GAME_CONFIG.TRASH_CAN.HEIGHT_RATIO,
      lidAngle: 0.25,
      lidRattleTimer: 0,
    };
    this.state.rightTrashCan = this.state.trashCan;
    this.state.dumpster = {
      x: dumpsterX,
      y: trashCanY,
      width: GAME_CONFIG.TRASH_CAN.DUMPSTER_WIDTH_RATIO,
      height: GAME_CONFIG.TRASH_CAN.DUMPSTER_HEIGHT_RATIO,
      lidRattleTimer: 0,
    };
    this.state.camera.x = trashCanStartX;
    this.state.camera.targetX = trashCanStartX;
    this.state.camera.y = 0.08;
    this.state.camera.targetY = 0.08;
    this.state.currentFloor = 1;
    this.state.bestFloor = this.bestFloor;
    this.state.bestScore = this.bestScore;
    this.state.altitudeMeters = 0;
    this.state.climbTimeSeconds = 0;
    this.lastNotifiedFloor = 1;
    this.state.trashParticles = [];
    this.state.snacks = [];
    this.state.spooks = [];
    this.state.floatingTexts = [];
    this.state.snackParticles = [];
    this.state.spookInvulnerabilityTimer = 0;
    this.state.activeToast = null;
    this.state.atmosphere = {
      squirrels: [],
      bats: [],
      geeseFlocks: [],
      soaringBirds: [],
      balloons: [],
      lightning: null,
      mistClouds: [],
      lightningFlashAlpha: 0,
      kite: this.initStreetKite(),
      sillPigeons: this.initSillPigeons(),
      superhero: null,
      weather: this.initWeather(),
    };
    this.state.streetVehicles = [];
    this.state.laundryLine = {
      hasDropped: false,
      clothes: [
        { id: 1, offsetRatio: 0.12, type: 'shirt', color: '#f43f5e', dropped: false },
        { id: 2, offsetRatio: 0.28, type: 'socks', color: '#facc15', dropped: false },
        { id: 3, offsetRatio: 0.44, type: 'sheet', color: '#f8fafc', dropped: false },
        { id: 4, offsetRatio: 0.62, type: 'pants', color: '#3b82f6', dropped: false },
        { id: 5, offsetRatio: 0.78, type: 'shirt', color: '#a855f7', dropped: false },
        { id: 6, offsetRatio: 0.90, type: 'socks', color: '#ec4899', dropped: false },
      ],
      fallingItems: [],
    };
    this.state.electricSparks = [];
    this.state.navigationBarriers = this.initNavigationBarriers();
    this.state.celebrationFireworks = [];
    this.state.celebrationTimer = 0;
    this.state.halfwayMilestoneTimer = 0;
    this.hasTriggeredHalfwayMilestone = false;
    this.state.interactionPrompt = null;
    this.snackCollectionCooldown = 0;
    this.spookGlobalCooldown = 0;
    this.hasPlayedEagleScreech = false;
    this.atmosphereSpawnTimer = 0.5;
    this.nextLightningTimer = 10.0;
    this.snackSpawnTimer = 0.8;
    this.spookSpawnTimer = 4.5;
    this.vehicleSpawnTimer = 1.8;
    this.seedInitialSnacks();
    this.seedInitialSquirrels();
    this.notifyState();
  }

  /**
   * Explodes fun animated trash debris popping out of the trash can onto the ground
   */
  public triggerTrashPop(sourceX?: number, sourceY?: number, biasDirectionX: number = 0) {
    sound.playTrashPop();
    const cType = this.state.raccoon.containerType || 'right_can';
    const canX = sourceX ?? (cType === 'left_can' ? this.state.leftTrashCan.x : cType === 'dumpster' ? this.state.dumpster.x : this.state.trashCan.x);
    const canY = sourceY ?? (GAME_CONFIG.TRASH_CAN.GROUND_Y + GAME_CONFIG.TRASH_CAN.HEIGHT_RATIO * 0.82);

    const count = GAME_CONFIG.TRASH_CAN.POP_COUNT;
    const types: ('banana' | 'fishbone' | 'can' | 'apple_core' | 'paper' | 'pizza' | 'bottle')[] = [
      'banana',
      'fishbone',
      'can',
      'apple_core',
      'paper',
      'pizza',
      'bottle',
      'can',
    ];

    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const spreadX = biasDirectionX !== 0
        ? biasDirectionX * (0.05 + Math.random() * 0.18) + (Math.random() - 0.5) * 0.1
        : (Math.random() - 0.5) * 0.22;
      const popVy = 0.24 + Math.random() * 0.22;
      const groundY = 0.008 + Math.random() * 0.010;

      this.state.trashParticles.push({
        id: Date.now() + Math.random(),
        type,
        x: canX + (Math.random() - 0.5) * 0.035,
        y: canY,
        vx: spreadX,
        vy: popVy,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 12,
        scale: 0.85 + Math.random() * 0.3,
        groundY,
        bounces: 0,
        landed: false,
      });
    }

    if (this.state.trashParticles.length > 45) {
      this.state.trashParticles = this.state.trashParticles.slice(this.state.trashParticles.length - 45);
    }

    if (cType === 'left_can') {
      this.state.leftTrashCan.lidAngle = -0.55;
      this.state.leftTrashCan.lidRattleTimer = 0.65;
    } else if (cType === 'dumpster') {
      this.state.dumpster.lidRattleTimer = 0.65;
    } else {
      this.state.trashCan.lidAngle = -0.55;
      this.state.trashCan.lidRattleTimer = 0.65;
      this.state.rightTrashCan.lidAngle = -0.55;
      this.state.rightTrashCan.lidRattleTimer = 0.65;
    }
  }

  /**
   * Tosses fun trash debris out of the can or dumpster when the player presses down / diagonally down
   */
  public tossTrash(directionX: number = 0) {
    sound.playTrashPop();
    const cType = this.state.raccoon.containerType || 'right_can';
    let canX = this.state.rightTrashCan.x;
    let canY = this.state.rightTrashCan.y;
    let canH = this.state.rightTrashCan.height;

    if (cType === 'left_can') {
      canX = this.state.leftTrashCan.x;
      canY = this.state.leftTrashCan.y;
      canH = this.state.leftTrashCan.height;
      this.state.leftTrashCan.lidAngle = -0.45;
      this.state.leftTrashCan.lidRattleTimer = 0.45;
    } else if (cType === 'dumpster') {
      canX = this.state.dumpster.x;
      canY = this.state.dumpster.y;
      canH = this.state.dumpster.height;
      this.state.dumpster.lidRattleTimer = 0.55;
    } else {
      this.state.trashCan.lidAngle = -0.45;
      this.state.trashCan.lidRattleTimer = 0.45;
      this.state.rightTrashCan.lidAngle = -0.45;
      this.state.rightTrashCan.lidRattleTimer = 0.45;
    }

    const types: ('banana' | 'fishbone' | 'can' | 'apple_core' | 'paper' | 'pizza' | 'bottle')[] = [
      'banana',
      'fishbone',
      'can',
      'apple_core',
      'paper',
      'pizza',
      'bottle',
    ];

    const numItems = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numItems; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const spreadX = directionX !== 0
        ? directionX * (0.10 + Math.random() * 0.16) + (Math.random() - 0.5) * 0.08
        : (Math.random() - 0.5) * 0.24;
      const popVy = 0.20 + Math.random() * 0.18;
      const groundY = 0.008 + Math.random() * 0.010;

      this.state.trashParticles.push({
        id: Date.now() + Math.random(),
        type,
        x: canX + (Math.random() - 0.5) * 0.03,
        y: canY + canH * 0.75,
        vx: spreadX,
        vy: popVy,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 14,
        scale: 0.85 + Math.random() * 0.35,
        groundY,
        bounces: 0,
        landed: false,
      });
    }

    if (this.state.trashParticles.length > 45) {
      this.state.trashParticles = this.state.trashParticles.slice(this.state.trashParticles.length - 45);
    }

    const labels = ['TOSS! 🍕', 'BONK! 🥫', 'RUMMAGE! 🍌', 'CHUCK! 🐟', 'TRASH FLYING! 🗑️'];
    const label = labels[Math.floor(Math.random() * labels.length)];
    this.spawnFloatingText(label, canX + (Math.random() - 0.5) * 0.04, canY + canH + 0.04, '#10b981');
  }

  /**
   * Raccoon enters inside a trash can or commercial dumpster on the ground
   */
  public enterContainer(containerType: 'left_can' | 'dumpster' | 'right_can') {
    this.state.raccoon.isInTrashCan = true;
    this.state.raccoon.containerType = containerType;
    this.state.raccoon.isTumbling = false;
    this.state.raccoon.tumbleTimer = 0;
    this.state.camera.shake = 0; // Screen does NOT shake when falling into a trash can or dumpster
    this.state.raccoon.vx = 0;
    this.state.raccoon.vy = 0;
    this.state.raccoon.isClimbing = false;
    this.state.raccoon.isRestingOnSill = false;
    this.state.raccoon.restingSillFloor = null;
    this.state.raccoon.restingSillWindowIndex = null;
    this.state.raccoon.energy = 100;
    this.state.raccoon.y = GAME_CONFIG.TRASH_CAN.GROUND_Y + 0.015;

    let targetX = this.state.rightTrashCan.x;
    if (containerType === 'left_can') {
      targetX = this.state.leftTrashCan.x;
      this.state.leftTrashCan.lidRattleTimer = 0.5;
    } else if (containerType === 'dumpster') {
      targetX = this.state.dumpster.x;
      this.state.dumpster.lidRattleTimer = 0.5;
    } else {
      targetX = this.state.rightTrashCan.x;
      this.state.rightTrashCan.lidRattleTimer = 0.5;
      this.state.trashCan.lidRattleTimer = 0.5;
    }
    this.state.raccoon.x = targetX;
    sound.playTrashPop();
  }

  public togglePause() {
    if (this.state.screen === 'PLAYING') {
      sound.playMenuClick();
      this.state.screen = 'PAUSED';
      this.notifyState();
    } else if (this.state.screen === 'PAUSED') {
      sound.playMenuClick();
      this.state.screen = 'PLAYING';
      this.notifyState();
    }
  }

  public resumeGame() {
    if (this.state.screen === 'PAUSED') {
      sound.playMenuClick();
      this.state.screen = 'PLAYING';
      this.notifyState();
    }
  }

  public returnToMainMenu() {
    sound.playMenuClick();
    this.roofCelebrationActive = false;
    this.roofCelebrationTimer = 0;
    this.state.screen = 'MAIN_MENU';
    this.state.raccoon.isInTrashCan = true;
    this.state.raccoon.x = this.state.trashCan.x;
    this.state.raccoon.y = GAME_CONFIG.TRASH_CAN.GROUND_Y + 0.015;
    this.state.raccoon.vx = 0;
    this.state.raccoon.vy = 0;
    this.state.camera.targetX = this.state.trashCan.x;
    this.state.camera.targetY = 0.08;
    this.notifyState();
  }

  public toggleMute(): boolean {
    const muted = sound.toggleMute();
    this.state.isMuted = muted;
    this.notifyState();
    return muted;
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  private loop(currentTimeMs: number) {
    const rawDt = (currentTimeMs - this.lastTimeMs) / 1000;
    this.lastTimeMs = currentTimeMs;

    // Clamp delta time to avoid physics tunneling during tab switches
    const dt = Math.min(rawDt, 0.05);

    // Update input priorities
    this.input.update(dt);

    // Run simulation
    if (this.state.screen === 'PLAYING' || this.state.screen === 'MAIN_MENU' || this.state.screen === 'CHARACTER_SELECT') {
      this.updateSimulation(dt, currentTimeMs / 1000);
    }

    // Render frame
    this.renderer.render(this.ctx, this.state, this.floors, currentTimeMs / 1000);

    // Request next frame
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  private updateSimulation(dt: number, timeSeconds: number) {
    const inputState = this.input.getState();
    const { RACCOON, SKYSCRAPER, CAMERA } = GAME_CONFIG;

    // Building horizontal bounds
    const bWidth = SKYSCRAPER.BUILDING_WIDTH_RATIO;
    const minX = SKYSCRAPER.BUILDING_CENTER_X - bWidth / 2 + RACCOON.HORIZONTAL_MARGIN;
    const maxX = SKYSCRAPER.BUILDING_CENTER_X + bWidth / 2 - RACCOON.HORIZONTAL_MARGIN;

    // Skyscraper vertical bounds:
    // Allow raccoon to crawl on the ground (sidewalk level) bounded by the side trash cans,
    // and climb all the way to the top of the building (Floor 25 rooftop ledge)
    const groundSurfaceY = GAME_CONFIG.TRASH_CAN.GROUND_Y;
    const minY = groundSurfaceY;
    const roofSillY = SKYSCRAPER.TOTAL_FLOORS * SKYSCRAPER.FLOOR_HEIGHT_RATIO;
    const maxY = roofSillY + 0.04;

    // Update trash particles physics
    const gravity = GAME_CONFIG.TRASH_CAN.GRAVITY;
    for (const p of this.state.trashParticles) {
      if (!p.landed) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy -= gravity * dt;
        p.rotation += p.vRot * dt;

        // Sidewalk pavement landing & bounce
        if (p.y <= p.groundY) {
          p.y = p.groundY;
          if (p.bounces < 2 && Math.abs(p.vy) > 0.08) {
            p.vy = -p.vy * 0.42;
            p.vx *= 0.65;
            p.vRot *= 0.5;
            p.bounces++;
            sound.playTrashLand();
          } else {
            p.vy = 0;
            p.vx = 0;
            p.vRot = 0;
            p.landed = true;
          }
        }
      }
    }

    // Trash can and dumpster lid rattle animation decay
    if (this.state.trashCan.lidRattleTimer > 0) {
      this.state.trashCan.lidRattleTimer -= dt;
      this.state.trashCan.lidAngle = Math.sin(timeSeconds * 20) * 0.2 - 0.35;
    } else if (this.state.raccoon.isInTrashCan) {
      this.state.trashCan.lidAngle = 0.35 + Math.sin(timeSeconds * 2.2) * 0.03;
    }

    if (this.state.leftTrashCan.lidRattleTimer > 0) {
      this.state.leftTrashCan.lidRattleTimer -= dt;
      this.state.leftTrashCan.lidAngle = Math.sin(timeSeconds * 20) * 0.2 - 0.35;
    } else {
      this.state.leftTrashCan.lidAngle = 0.25;
    }

    if (this.state.rightTrashCan.lidRattleTimer > 0) {
      this.state.rightTrashCan.lidRattleTimer -= dt;
      this.state.rightTrashCan.lidAngle = Math.sin(timeSeconds * 20) * 0.2 - 0.35;
    } else {
      this.state.rightTrashCan.lidAngle = 0.25;
    }

    if (this.state.dumpster.lidRattleTimer > 0) {
      this.state.dumpster.lidRattleTimer -= dt;
    }

    if (this.state.screen === 'MAIN_MENU' || this.state.screen === 'CHARACTER_SELECT') {
      // Gentle atmospheric idle animation for raccoon peeking from trash can at base on right side of building
      this.state.raccoon.x = this.state.trashCan.x;
      this.state.raccoon.y = GAME_CONFIG.TRASH_CAN.GROUND_Y + 0.015 + Math.sin(timeSeconds * 1.5) * 0.003;
      this.state.raccoon.tailAngle = Math.sin(timeSeconds * RACCOON.TAIL_SWAY_FREQUENCY) * 0.15;
      this.state.camera.targetY = 0.08;
      this.state.camera.y += (this.state.camera.targetY - this.state.camera.y) * dt * CAMERA.SMOOTH_LERP;
      this.state.camera.targetX = this.state.trashCan.x;
      this.state.camera.x += (this.state.camera.targetX - this.state.camera.x) * dt * CAMERA.HORIZONTAL_SMOOTH_LERP;
      this.updateAtmosphere(dt, timeSeconds);
      this.updateStreetVehicles(dt);
      return;
    }

    this.state.climbTimeSeconds += dt;
    this.state.raccoon.slipEffectTimer = Math.max(0, this.state.raccoon.slipEffectTimer - dt);
    if (this.state.halfwayMilestoneTimer && this.state.halfwayMilestoneTimer > 0) {
      this.state.halfwayMilestoneTimer = Math.max(0, this.state.halfwayMilestoneTimer - dt);
    }
    if (this.state.raccoon.climbOutOfCanTimer > 0) {
      this.state.raccoon.climbOutOfCanTimer -= dt;
    }

    // Physical setback: If raccoon is tumbling down floors from an unexpected spook
    if (this.state.raccoon.isTumbling) {
      this.state.raccoon.isRestingOnSill = false;
      this.state.raccoon.restingSillFloor = null;
      this.state.raccoon.restingSillWindowIndex = null;
      this.state.raccoon.isClimbing = true;
      this.state.raccoon.isScrambling = true;
      this.state.raccoon.facing = 'down';
      this.state.raccoon.climbPhase = (this.state.raccoon.climbPhase + dt * 12.0) % 1.0;
      this.state.raccoon.tailAngle = Math.sin(timeSeconds * 18.0) * 0.45;
      this.state.raccoon.squashFactor = 0.88 + Math.sin(timeSeconds * 20.0) * 0.12;

      const fallSpeed = GAME_CONFIG.SPOOKS.TUMBLE_FALL_SPEED;
      this.state.raccoon.vy = -fallSpeed;
      this.state.raccoon.vx = 0;
      this.state.raccoon.y -= fallSpeed * dt;

      if (this.state.raccoon.isFallingToTrashCan) {
        const { BUILDING_CENTER_X, BUILDING_WIDTH_RATIO } = GAME_CONFIG.SKYSCRAPER;
        const bLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
        const canX = this.state.leftTrashCan?.x ?? (bLeft + GAME_CONFIG.TRASH_CAN.LEFT_CAN_OFFSET);
        this.state.raccoon.x += (canX - this.state.raccoon.x) * dt * 5.0;
      }

      // Camera follows raccoon smoothly without infinite shaking
      this.state.camera.shake = Math.min(this.state.camera.shake, 0.15);
      this.state.camera.targetY = Math.max(0.12, this.state.raccoon.y);
      this.state.camera.y += (this.state.camera.targetY - this.state.camera.y) * dt * CAMERA.SMOOTH_LERP;

      const targetY = this.state.raccoon.tumbleTargetY ?? groundSurfaceY;
      if (this.state.raccoon.y <= targetY) {
        this.state.raccoon.y = targetY;
        this.state.raccoon.isTumbling = false;
        this.state.raccoon.vy = 0;
        this.state.raccoon.squashFactor = 1.25;

        // If raccoon was shocked and falling into the trashcan:
        if (this.state.raccoon.isFallingToTrashCan) {
          const { BUILDING_CENTER_X, BUILDING_WIDTH_RATIO } = GAME_CONFIG.SKYSCRAPER;
          const bLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
          const canX = this.state.leftTrashCan?.x ?? (bLeft + GAME_CONFIG.TRASH_CAN.LEFT_CAN_OFFSET);
          this.state.raccoon.x = canX;
          this.state.raccoon.y = groundSurfaceY + 0.015;
          this.state.raccoon.isFallingToTrashCan = false;
          this.state.raccoon.isInTrashCan = true;
          this.state.raccoon.containerType = 'left_can';
          this.state.raccoon.isRestingOnSill = false;
          this.state.raccoon.isClimbing = false;
          this.state.raccoon.facing = 'up';
          sound.playLidRattle?.();
          this.spawnTrashParticles(canX, groundSurfaceY + 0.08);
          this.spawnFloatingText('LANDED IN TRASH CAN! 🗑️⚡', canX, groundSurfaceY + 0.12, '#38bdf8');
        } else if (targetY <= groundSurfaceY + 0.02) {
          // If raccoon tumbled down to the ground (e.g. from floor 1 spook):
          // Safely land on the ground below and immediately continue playing!
          this.state.raccoon.y = groundSurfaceY;
          this.state.raccoon.isRestingOnSill = true;
          this.state.raccoon.restingSillFloor = 1;
          this.state.raccoon.restingSillWindowIndex = null;
          this.state.raccoon.facing = this.state.raccoon.lastSideFacing || 'right';
          this.state.raccoon.climbGaitMode = 'horizontal';
          this.spawnFloatingText('SAFE LANDING! 🐾', this.state.raccoon.x, this.state.raccoon.y + 0.05, '#34d399');
        } else {
          // Recover wall climbing grip safely!
          this.state.raccoon.facing = 'up';
          this.state.raccoon.climbGaitMode = 'vertical';
        }
      }

      this.updateSlice3SnacksAndSpooks(dt, timeSeconds);
      this.updateAtmosphere(dt, timeSeconds);
      this.updateStreetVehicles(dt);
      this.updateFloorAndAltitude(timeSeconds);
      return;
    }

    // Energy-Dependent Climbing Speed & Re-enabled Speed Burst System:
    // 1. Climbing speed is determined by energy level brackets:
    //    >=90%: 100%, 80-89%: 90%, 70-79%: 80%, 60-69%: 70%, 50-59%: 60%, 40-49%: 50%, 30-39%: 40%, 20-29%: 30%, 0-19%: 20%
    // 2. Speed Burst:
    //    - Allowed up to Floor 17
    //    - Duration: 2.0s per burst
    //    - Cooldown: 4.0s before next burst
    //    - Boost multiplier: 1.65 (65% speed boost)
    const currentFloor = this.state.currentFloor;
    const burstConfig = RACCOON.SPEED_BURST;
    const isBurstAllowedOnFloor = currentFloor <= burstConfig.MAX_FLOOR;

    // Tick down burst cooldown timer
    if (this.state.raccoon.boostCooldownTimer && this.state.raccoon.boostCooldownTimer > 0) {
      this.state.raccoon.boostCooldownTimer = Math.max(0, this.state.raccoon.boostCooldownTimer - dt);
    }

    const wantsBoost = Boolean(
      inputState.isSpeedBoosted ||
      inputState.keys.shift ||
      inputState.keys.space ||
      inputState.joystick.isBoosted
    );

    let isBoosted = false;

    if (
      wantsBoost &&
      isBurstAllowedOnFloor &&
      (!this.state.raccoon.boostCooldownTimer || this.state.raccoon.boostCooldownTimer <= 0) &&
      this.state.raccoon.energy > 0 &&
      !this.state.raccoon.isTumbling &&
      !this.state.raccoon.isInTrashCan
    ) {
      if (!this.state.raccoon.isSpeedBoosted) {
        this.state.raccoon.isSpeedBoosted = true;
        this.state.raccoon.boostActiveTimer = burstConfig.MAX_DURATION;
        sound.playSpeedBoost?.();
        this.spawnFloatingText('⚡ SPEED BURST! ⚡', this.state.raccoon.x, this.state.raccoon.y + 0.05, '#facc15');
        this.checkDailyMissionEvent('burst_used', 1);
      }

      this.state.raccoon.boostActiveTimer = Math.max(0, (this.state.raccoon.boostActiveTimer ?? burstConfig.MAX_DURATION) - dt);

      if (this.state.raccoon.boostActiveTimer <= 0) {
        this.state.raccoon.isSpeedBoosted = false;
        this.state.raccoon.boostActiveTimer = 0;
        this.state.raccoon.boostCooldownTimer = burstConfig.COOLDOWN;
        isBoosted = false;
      } else {
        isBoosted = true;
      }
    } else {
      if (this.state.raccoon.isSpeedBoosted) {
        this.state.raccoon.isSpeedBoosted = false;
        this.state.raccoon.boostActiveTimer = 0;
        this.state.raccoon.boostCooldownTimer = burstConfig.COOLDOWN;
      }
      isBoosted = false;
    }

    this.state.raccoon.isSpeedBoosted = isBoosted;

    const energy = Math.max(0, Math.min(100, this.state.raccoon.energy));
    const energySpeedRatio = getEnergySpeedRatio(energy);
    const boostMultiplier = isBoosted ? (RACCOON.BOOST_MULTIPLIER || 1.50) : 1.00;

    // Weather impact on climbing speed and grip:
    const weather = this.state.atmosphere?.weather;
    let weatherSpeedMultiplier = 1.00;
    if (weather) {
      if (weather.type === 'rain') {
        weatherSpeedMultiplier = GAME_CONFIG.WEATHER.RAIN_SPEED_MULTIPLIER; // 0.92 (-8%)
      } else if (weather.type === 'snow') {
        weatherSpeedMultiplier = GAME_CONFIG.WEATHER.SNOW_SPEED_MULTIPLIER; // 0.88 (-12%)
      }
    }

    const baseClimbSpeed = RACCOON.BASE_CLIMB_SPEED || 0.20;
    const currentClimbSpeed = baseClimbSpeed * energySpeedRatio * boostMultiplier * weatherSpeedMultiplier;
    const climbSpeedUp = currentClimbSpeed;
    const climbSpeedDown = currentClimbSpeed;
    const moveSpeedX = currentClimbSpeed;
    const diagSpeed = currentClimbSpeed;
    const sillWalkSpeed = (RACCOON.SILL_WALK_SPEED || 0.22) * energySpeedRatio * (isBoosted ? 1.25 : 1.00) * (weather?.type === 'snow' ? 0.95 : 1.00);

    this.state.raccoon.currentSpeedRatio = energySpeedRatio * boostMultiplier * weatherSpeedMultiplier;

    // 2. Universal Input Handling with Smooth Priority:
    // If keyboard is actively used or recently pressed, prioritize keyboard smoothly
    // to prevent any jitter from concurrent mouse dragging
    const isKeyboardActive = this.input.hasActiveKeyboardMove() || inputState.keyboardActiveTimer > 0;
    const hasKeyboard = this.input.hasActiveKeyboardMove();
    const hasJoystick = inputState.joystick.active && inputState.joystick.distance > 0.05;
    const hasDrag = !isKeyboardActive && inputState.isDragging && inputState.dragTarget !== null;

    let targetVx = 0;
    let targetVy = 0;
    let isScrambling = (this.state.raccoon.currentSpeedRatio ?? 1.0) > 0.85;

    // Check if player wants to descend/leave sill
    const wantsDown =
      inputState.keys.down ||
      (hasJoystick && inputState.joystick.y < -0.3) ||
      (hasDrag && inputState.dragTarget!.y > 0.65);

    // Decrement trash toss rummaging cooldown
    if (this.trashTossCooldown > 0) {
      this.trashTossCooldown = Math.max(0, this.trashTossCooldown - dt);
    }

    // Container interaction when raccoon is inside a trash can or dumpster
    if (this.state.raccoon.isInTrashCan) {
      let wantsToss = false;
      let tossDirX = 0;
      let wantsPop = false;
      let popDirX = 0;

      if (hasKeyboard) {
        const kDown = inputState.keys.down;
        const kUp = inputState.keys.up;
        const kLeft = inputState.keys.left;
        const kRight = inputState.keys.right;

        if (kDown) {
          wantsToss = true;
          tossDirX = kLeft ? -1 : kRight ? 1 : 0;
        } else if (kUp) {
          wantsPop = true;
          popDirX = kLeft ? -1 : kRight ? 1 : 0;
        }
      } else if (hasJoystick) {
        const joy = inputState.joystick;
        if (joy.y < -0.25) {
          wantsToss = true;
          tossDirX = joy.x < -0.25 ? -1 : joy.x > 0.25 ? 1 : 0;
        } else if (joy.y > 0.25) {
          wantsPop = true;
          popDirX = joy.x < -0.25 ? -1 : joy.x > 0.25 ? 1 : 0;
        }
      } else if (hasDrag) {
        const screenTargetY = inputState.dragTarget!.y;
        const screenTargetX = inputState.dragTarget!.x;
        const worldTargetY = this.state.camera.y + (CAMERA.VERTICAL_LEAD_OFFSET - screenTargetY);
        const canvasW = this.canvas.width;
        const canvasH = this.canvas.height;
        const unitW = Math.min(canvasW, canvasH * GAME_CONFIG.ASPECT_RATIO);
        const widthRatio = canvasW / Math.max(1, unitW);
        const worldTargetX = this.state.camera.x + (screenTargetX - 0.5) * widthRatio;
        const dy = worldTargetY - this.state.raccoon.y;
        const dx = worldTargetX - this.state.raccoon.x;

        if (dy < -0.025 || screenTargetY > 0.65) {
          wantsToss = true;
          tossDirX = dx < -0.02 ? -1 : dx > 0.02 ? 1 : 0;
        } else if (dy > 0.025) {
          wantsPop = true;
          popDirX = dx < -0.02 ? -1 : dx > 0.02 ? 1 : 0;
        }
      }

      if (wantsToss) {
        if (this.trashTossCooldown <= 0) {
          this.trashTossCooldown = 0.22;
          this.tossTrash(tossDirX);
        }
      } else if (wantsPop) {
        this.popOutOfTrashCan(popDirX);
      }

      // Raccoon remains nestled in container while isInTrashCan is true
      if (this.state.raccoon.isInTrashCan) {
        this.state.raccoon.vx = 0;
        this.state.raccoon.vy = 0;
        this.state.raccoon.isClimbing = false;
        this.state.raccoon.energy = 100;
        this.updateSlice3SnacksAndSpooks(dt, timeSeconds);
        this.updateAtmosphere(dt, timeSeconds);
        this.updateStreetVehicles(dt);
        this.updateFloorAndAltitude(timeSeconds);
        return;
      }
    }

    if (hasKeyboard) {
      // 1. Direct Keyboard Control (W, A, S, D / Arrow keys) - Takes smooth priority over mouse dragging
      this.state.raccoon.isKeyboardControlled = true;

      const keyUp = inputState.keys.up;
      const keyDown = inputState.keys.down;
      const keyLeft = inputState.keys.left;
      const keyRight = inputState.keys.right;

      const isVerticalKey = (keyUp || keyDown) && !this.state.raccoon.isRestingOnSill;
      const isHorizontalKey = keyLeft || keyRight;

      if (keyLeft) this.state.raccoon.lastSideFacing = 'left';
      if (keyRight) this.state.raccoon.lastSideFacing = 'right';

      const isOnGround =
        (this.state.raccoon.isRestingOnSill &&
          this.state.raccoon.restingSillFloor === 1 &&
          (this.state.raccoon.restingSillWindowIndex === null || this.state.raccoon.restingSillWindowIndex === undefined)) ||
        (this.state.raccoon.y <= groundSurfaceY + 0.035);

      // If on ground and player presses up or diagonally up: immediately climb up onto building wall!
      if (isOnGround && keyUp) {
        const dirX = isHorizontalKey ? (keyRight ? 1 : -1) : 0;
        this.climbUpFromGround(dirX);
        targetVx = this.state.raccoon.vx;
        targetVy = this.state.raccoon.vy;
      } else if (this.state.raccoon.isRestingOnSill) {
        if (false) {
        } else {
          // On window sill or ground: horizontal crawl directly upon sill/ground (never float or hover above it)
          if (keyLeft) targetVx = -sillWalkSpeed;
          else if (keyRight) targetVx = sillWalkSpeed;
          else targetVx = 0;
          targetVy = 0;
          this.state.raccoon.vx = targetVx;
          this.state.raccoon.vy = 0;

          if (keyLeft) this.state.raccoon.facing = 'left';
          else if (keyRight) this.state.raccoon.facing = 'right';
        }
      } else if (isVerticalKey && isHorizontalKey) {
        // Desktop diagonal climbing: matches horizontal climbing speed regardless of which key is pressed first!
        const dirX = keyRight ? 1 : -1;
        const dirY = keyUp ? 1 : -1;

        // Diagonal movements must not go off the right/left sides of the building
        const atLeftEdge = this.state.raccoon.x <= minX + 0.002 && dirX < 0;
        const atRightEdge = this.state.raccoon.x >= maxX - 0.002 && dirX > 0;

        if (atLeftEdge || atRightEdge) {
          targetVx = 0;
          this.state.raccoon.vx = 0;
          targetVy = dirY > 0 ? moveSpeedX : -moveSpeedX;
          this.state.raccoon.vy = targetVy;
          this.state.raccoon.facing = dirY > 0 ? 'up' : 'down';
          this.state.raccoon.climbGaitMode = 'vertical';
        } else {
          // Diagonal movement matches horizontal climbing speed in both components
          targetVx = dirX * moveSpeedX;
          targetVy = dirY * moveSpeedX;
          // Apply velocity immediately to ensure exact same speed and movement regardless of input order
          this.state.raccoon.vx = targetVx;
          this.state.raccoon.vy = targetVy;
          this.state.raccoon.facing = dirX > 0 ? 'right' : 'left';
          this.state.raccoon.diagonalDirection = { x: dirX as 1 | -1, y: dirY as 1 | -1 };
          this.state.raccoon.climbGaitMode = 'diagonal';
        }
      } else if (isHorizontalKey) {
        // Pure horizontal movement
        const dirX = keyRight ? 1 : -1;
        const atLeftEdge = this.state.raccoon.x <= minX + 0.002 && dirX < 0;
        const atRightEdge = this.state.raccoon.x >= maxX - 0.002 && dirX > 0;
        if (atLeftEdge || atRightEdge) {
          targetVx = 0;
          this.state.raccoon.vx = 0;
        } else {
          targetVx = dirX * moveSpeedX;
          this.state.raccoon.vx = targetVx;
        }
        targetVy = 0;
        this.state.raccoon.vy = 0;
        this.state.raccoon.facing = dirX > 0 ? 'right' : 'left';
      } else if (isVerticalKey) {
        // Pure vertical movement
        const dirY = keyUp ? 1 : -1;
        targetVx = 0;
        this.state.raccoon.vx = 0;
        targetVy = dirY > 0 ? climbSpeedUp : -climbSpeedDown;
        this.state.raccoon.vy = targetVy;
        this.state.raccoon.facing = dirY > 0 ? 'up' : 'down';
      }
    } else if (hasJoystick) {
      // 2. Floating Touch Control (Slither.io style) - 8-Way navigation (cardinals & 45-degree diagonals)
      this.state.raccoon.isKeyboardControlled = false;
      const joy = inputState.joystick;

      // 8-Way directional snap: cardinals & 45 degree diagonals
      const rawAngle = Math.atan2(joy.y, joy.x);
      const step = Math.PI / 4;
      const snappedAngle = Math.round(rawAngle / step) * step;

      let dirX = Math.cos(snappedAngle);
      let dirY = Math.sin(snappedAngle);
      if (Math.abs(dirX) < 0.05) dirX = 0;
      if (Math.abs(dirY) < 0.05) dirY = 0;
      if (Math.abs(Math.abs(dirX) - 1) < 0.05) dirX = Math.sign(dirX);
      if (Math.abs(Math.abs(dirY) - 1) < 0.05) dirY = Math.sign(dirY);

      const isOnGround =
        (this.state.raccoon.isRestingOnSill &&
          this.state.raccoon.restingSillFloor === 1 &&
          (this.state.raccoon.restingSillWindowIndex === null || this.state.raccoon.restingSillWindowIndex === undefined)) ||
        (this.state.raccoon.y <= groundSurfaceY + 0.035);

      if (isOnGround && joy.y > 0.15) {
        const dirX = Math.abs(joy.x) > 0.15 ? Math.sign(joy.x) : 0;
        this.climbUpFromGround(dirX);
        targetVx = this.state.raccoon.vx;
        targetVy = this.state.raccoon.vy;
      } else if (this.state.raccoon.isRestingOnSill) {
        if (false) {
        } else {
          // On window sill or ground, horizontal crawl
          dirY = 0;
          if (dirX !== 0) dirX = Math.sign(dirX);
          targetVx = dirX * sillWalkSpeed;
          targetVy = 0;
          this.state.raccoon.vy = 0;
          if (dirX !== 0) this.state.raccoon.facing = dirX < 0 ? 'left' : 'right';
        }
      } else if (dirX !== 0 && dirY !== 0) {
        // Diagonal movement matching horizontal climbing speed
        const atLeftEdge = this.state.raccoon.x <= minX + 0.002 && dirX < 0;
        const atRightEdge = this.state.raccoon.x >= maxX - 0.002 && dirX > 0;
        if (atLeftEdge || atRightEdge) {
          targetVx = 0;
          targetVy = Math.sign(dirY) * moveSpeedX;
          this.state.raccoon.facing = dirY < 0 ? 'down' : 'up';
          this.state.raccoon.climbGaitMode = 'vertical';
        } else {
          targetVx = Math.sign(dirX) * moveSpeedX;
          targetVy = Math.sign(dirY) * moveSpeedX;
          this.state.raccoon.facing = dirX < 0 ? 'left' : 'right';
          this.state.raccoon.diagonalDirection = { x: Math.sign(dirX) as 1 | -1, y: Math.sign(dirY) as 1 | -1 };
          this.state.raccoon.climbGaitMode = 'diagonal';
        }
      } else if (dirX !== 0) {
        const atLeftEdge = this.state.raccoon.x <= minX + 0.002 && dirX < 0;
        const atRightEdge = this.state.raccoon.x >= maxX - 0.002 && dirX > 0;
        targetVx = (atLeftEdge || atRightEdge) ? 0 : Math.sign(dirX) * moveSpeedX;
        targetVy = 0;
        this.state.raccoon.facing = dirX < 0 ? 'left' : 'right';
      } else if (dirY !== 0) {
        targetVx = 0;
        targetVy = dirY > 0 ? climbSpeedUp : -climbSpeedDown;
        this.state.raccoon.facing = dirY < 0 ? 'down' : 'up';
      }

      if (Math.abs(dirX) > 0.05) {
        this.state.raccoon.lastSideFacing = dirX < 0 ? 'left' : 'right';
      }

      if (this.state.raccoon.isRestingOnSill) {
        if (Math.abs(dirX) > 0.05) this.state.raccoon.facing = dirX < 0 ? 'left' : 'right';
      } else if (Math.abs(dirX) > Math.abs(dirY)) {
        this.state.raccoon.facing = dirX < 0 ? 'left' : 'right';
      } else {
        this.state.raccoon.facing = dirY < 0 ? 'down' : 'up';
      }
    } else if (hasDrag) {
      // 3. Desktop Mouse Dragging on Canvas (Click & Drag toward cursor)
      this.state.raccoon.isKeyboardControlled = false;
      const screenTargetX = inputState.dragTarget!.x;
      const screenTargetY = inputState.dragTarget!.y;

      // Invert screen-to-world mapping for both horizontal and vertical
      const worldTargetY = this.state.camera.y + (CAMERA.VERTICAL_LEAD_OFFSET - screenTargetY);
      const canvasW = this.canvas.width;
      const canvasH = this.canvas.height;
      const unitW = Math.min(canvasW, canvasH * GAME_CONFIG.ASPECT_RATIO);
      const widthRatio = canvasW / Math.max(1, unitW);
      const worldTargetX = this.state.camera.x + (screenTargetX - 0.5) * widthRatio;

      const dx = worldTargetX - this.state.raccoon.x;
      const dy = worldTargetY - this.state.raccoon.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const isOnGround =
        (this.state.raccoon.isRestingOnSill &&
          this.state.raccoon.restingSillFloor === 1 &&
          (this.state.raccoon.restingSillWindowIndex === null || this.state.raccoon.restingSillWindowIndex === undefined)) ||
        (this.state.raccoon.y <= groundSurfaceY + 0.035);

      if (dist > 0.015) {
        const dirX = dx / dist;
        const dirY = dy / dist;

        if (isOnGround && dirY > 0.15) {
          this.state.raccoon.isRestingOnSill = false;
          this.state.raccoon.restingSillFloor = null;
          this.state.raccoon.restingSillWindowIndex = null;
          this.state.raccoon.isInTrashCan = false;
          // Drag up or diagonally up while on ground: climb up building wall
          this.state.raccoon.isRestingOnSill = false;
          this.state.raccoon.restingSillFloor = null;
          this.state.raccoon.restingSillWindowIndex = null;
          if (Math.abs(dirX) > 0.25) {
            const sX = Math.sign(dirX);
            targetVx = sX * moveSpeedX;
            targetVy = moveSpeedX;
            this.state.raccoon.vx = targetVx;
            this.state.raccoon.vy = targetVy;
            this.state.raccoon.facing = sX > 0 ? 'right' : 'left';
            this.state.raccoon.diagonalDirection = { x: sX as 1 | -1, y: 1 };
            this.state.raccoon.climbGaitMode = 'diagonal';
          } else {
            this.state.raccoon.facing = 'up';
            this.state.raccoon.lastHeadingDirection = 'up';
            this.state.raccoon.climbGaitMode = 'vertical';
            targetVx = 0;
            targetVy = climbSpeedUp;
            this.state.raccoon.vx = 0;
            this.state.raccoon.vy = targetVy;
          }
        } else {
          const vertSpeed = dirY >= 0 ? (this.state.raccoon.isRestingOnSill ? sillWalkSpeed : climbSpeedUp) : (this.state.raccoon.isRestingOnSill ? sillWalkSpeed : climbSpeedDown);
          targetVx = dirX * (this.state.raccoon.isRestingOnSill ? sillWalkSpeed : moveSpeedX);
          targetVy = this.state.raccoon.isRestingOnSill ? 0 : dirY * vertSpeed;
        }

        if (Math.abs(dx) > 0.02) {
          this.state.raccoon.lastSideFacing = dx < 0 ? 'left' : 'right';
        }

        if (Math.abs(dx) > Math.abs(dy)) {
          this.state.raccoon.facing = dx < 0 ? 'left' : 'right';
        } else {
          this.state.raccoon.facing = dy < 0 ? 'down' : 'up';
        }
      }
    } else {
      this.state.raccoon.isKeyboardControlled = false;
    }

    // Apply Acceleration & Immediate Stop when no input
    if (!this.state.raccoon.isKeyboardControlled) {
      const accel = RACCOON.ACCELERATION;

      if (Math.abs(targetVx) > 0.01) {
        this.state.raccoon.vx += (targetVx - this.state.raccoon.vx) * dt * accel;
      } else {
        this.state.raccoon.vx = 0;
      }

      if (Math.abs(targetVy) > 0.01) {
        this.state.raccoon.vy += (targetVy - this.state.raccoon.vy) * dt * accel;
      } else {
        this.state.raccoon.vy = 0;
      }
    } else {
      // For keyboard controls, directly apply target velocities (instant responsive movement without lag)
      this.state.raccoon.vx = targetVx;
      this.state.raccoon.vy = targetVy;
    }

    // 0a. Smooth Game Over Fall before hitting ground
    if (this.state.raccoon.isFallingToGameOver) {
      this.state.raccoon.y -= 0.45 * dt;
      this.state.raccoon.gameOverFadeAlpha = Math.min(1.0, (this.state.raccoon.gameOverFadeAlpha || 0) + dt * 0.95);
      if (this.state.raccoon.y <= 0.08 || (this.state.raccoon.gameOverFadeAlpha || 0) >= 0.98) {
        this.state.raccoon.isFallingToGameOver = false;
        this.state.raccoon.isInTrashCan = true;
        this.state.raccoon.y = groundSurfaceY + 0.015;
        this.state.raccoon.x = this.state.trashCan.x;
        this.state.screen = 'GAME_OVER';
        sound.playGameOver();
        this.notifyState();
        return;
      }
      return;
    }

    // 0b. DIAGONAL SLIDE DESCENT (Floor 7 Window 1 to Floor 6 Window 3)
    if (this.state.raccoon.isSlidingDown) {
      this.state.raccoon.slideTimer = (this.state.raccoon.slideTimer || 0) + dt;
      const duration = this.state.raccoon.slideDuration || 0.65;
      const progress = Math.min(1.0, this.state.raccoon.slideTimer / duration);
      const startX = this.state.raccoon.slideStartX ?? this.state.raccoon.x;
      const startY = this.state.raccoon.slideStartY ?? this.state.raccoon.y;
      const targetX = this.state.raccoon.slideTargetX ?? this.state.raccoon.x;
      const targetY = this.state.raccoon.slideTargetY ?? this.state.raccoon.y;

      this.state.raccoon.x = startX + (targetX - startX) * progress;
      this.state.raccoon.y = startY + (targetY - startY) * Math.pow(progress, 1.25);
      this.state.raccoon.facing = 'right';
      this.state.raccoon.lastSideFacing = 'right';
      this.state.raccoon.isClimbing = true;
      this.state.raccoon.climbPhase = (this.state.raccoon.climbPhase + dt * 4.0) % 1.0;

      if (progress >= 1.0) {
        this.state.raccoon.isSlidingDown = false;
        this.state.raccoon.x = targetX;
        this.state.raccoon.y = targetY;
        this.state.raccoon.vx = 0;
        this.state.raccoon.vy = 0;
        this.state.raccoon.isRestingOnSill = true;
        this.state.raccoon.restingSillFloor = 6;
        this.state.raccoon.restingSillWindowIndex = 3;
        sound.playSillLand();
        this.spawnFloatingText('SLIDE TOUCHDOWN! 🛝✨', targetX, targetY + 0.04, '#10b981');
      }
      // Keep camera tightly centered on raccoon during slide transition
      this.state.camera.targetX = this.state.raccoon.x;
      this.state.camera.targetY = this.state.raccoon.y;
      this.state.camera.x += (this.state.raccoon.x - this.state.camera.x) * dt * 9.0;
      this.state.camera.y += (this.state.raccoon.y - this.state.camera.y) * dt * 9.0;
      this.updateFloorAndAltitude(timeSeconds);
      return;
    }

    // 0c. STAR TREK TELEPORT (Floor 12 Win 3 <-> Floor 16 Win 3)
    if (this.state.raccoon.isTeleporting) {
      this.state.raccoon.teleportTimer = (this.state.raccoon.teleportTimer || 0) + dt;
      const duration = this.state.raccoon.teleportDuration || 0.85;
      const progress = Math.min(1.0, this.state.raccoon.teleportTimer / duration);
      this.state.raccoon.vx = 0;
      this.state.raccoon.vy = 0;

      if (progress >= 1.0) {
        this.state.raccoon.isTeleporting = false;
        this.state.raccoon.x = this.state.raccoon.teleportTargetX!;
        this.state.raccoon.y = this.state.raccoon.teleportTargetY!;
        this.state.raccoon.isRestingOnSill = true;
        this.state.raccoon.restingSillFloor = this.state.raccoon.teleportTargetFloor!;
        this.state.raccoon.restingSillWindowIndex = this.state.raccoon.teleportTargetWin!;
        sound.playSillLand();
        this.spawnFloatingText(`BEAMED TO FLOOR ${this.state.raccoon.restingSillFloor}! 🖖✨`, this.state.raccoon.x, this.state.raccoon.y + 0.05, '#38bdf8');
      }
      return;
    }

    // 0d. SWINGING TARZAN VINE (Floor 8: Win 0 <-> Win 4)
    if (this.state.raccoon.isSwingingVine) {
      this.state.raccoon.vineSwingTimer = (this.state.raccoon.vineSwingTimer || 0) + dt;
      const duration = this.state.raccoon.vineSwingDuration || 1.15;
      const progress = Math.min(1.0, this.state.raccoon.vineSwingTimer / duration);
      const startX = this.state.raccoon.vineStartX ?? this.state.raccoon.x;
      const targetX = this.state.raccoon.vineTargetX ?? this.state.raccoon.x;
      const startY = this.state.raccoon.vineStartY ?? this.state.raccoon.y;
      const targetY = this.state.raccoon.vineTargetY ?? this.state.raccoon.y;

      const currentX = startX + (targetX - startX) * progress;
      const sag = 0.08 * Math.sin(progress * Math.PI);
      const currentY = startY + (targetY - startY) * progress - sag;

      this.state.raccoon.x = currentX;
      this.state.raccoon.y = currentY;
      this.state.raccoon.facing = targetX >= startX ? 'right' : 'left';
      this.state.raccoon.lastSideFacing = this.state.raccoon.facing;

      if (progress >= 1.0) {
        this.state.raccoon.isSwingingVine = false;
        this.state.raccoon.x = targetX;
        this.state.raccoon.y = targetY;
        this.state.raccoon.isRestingOnSill = true;
        this.state.raccoon.restingSillFloor = 8;
        this.state.raccoon.restingSillWindowIndex = targetX > startX ? 4 : 0;
        sound.playSillLand();
        this.spawnFloatingText('TARZAN LANDING! 🌿✨', targetX, targetY + 0.05, '#22c55e');
      }
      // Keep camera tightly centered on raccoon during vine swing transition
      this.state.camera.targetX = this.state.raccoon.x;
      this.state.camera.targetY = this.state.raccoon.y;
      this.state.camera.x += (this.state.raccoon.x - this.state.camera.x) * dt * 9.0;
      this.state.camera.y += (this.state.raccoon.y - this.state.camera.y) * dt * 9.0;
      this.updateFloorAndAltitude(timeSeconds);
      return;
    }

    const { BUILDING_CENTER_X, BUILDING_WIDTH_RATIO } = GAME_CONFIG.SKYSCRAPER;
    const { LOBBY_DOUBLE_DOORS, ELECTRIC_CABLES, CELL_TOWER_BTS, LAUNDRY_LINE, SLIDE_7_TO_4, TELEPORT, TARZAN_VINE } = GAME_CONFIG.INTERACTIVE_ELEMENTS;
    const bLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
    const bRight = BUILDING_CENTER_X + BUILDING_WIDTH_RATIO / 2;
    const winW = GAME_CONFIG.SKYSCRAPER.WINDOW_WIDTH_RATIO;
    const nWins = GAME_CONFIG.SKYSCRAPER.WINDOWS_PER_FLOOR;
    const totalWinW = nWins * winW;
    const gap = (BUILDING_WIDTH_RATIO - totalWinW) / (nWins + 1);

    // Active Shortcut Interaction Triggers (Only activated by pressing "down" while on related sill)
    let hasPrompt = false;

    // 1. Diagonal Slide Trigger (Floor 7 Window 1 to Floor 6 Window 3)
    const floor7 = this.floors.find((f) => f.floorNumber === 7);
    const floor6 = this.floors.find((f) => f.floorNumber === 6);
    if (floor7 && floor6 && floor7.windows[1] && floor6.windows[3]) {
      const slideStartWin = floor7.windows[1];
      const slideEndWin = floor6.windows[3];
      const isOnSlideSill =
        this.state.raccoon.isRestingOnSill &&
        this.state.raccoon.restingSillFloor === 7 &&
        this.state.raccoon.restingSillWindowIndex === 1;

      if (isOnSlideSill && !this.state.raccoon.isSlidingDown) {
        this.state.interactionPrompt = 'Press DOWN to slide! 🛝';
        hasPrompt = true;
        const isPressingDown = this.input.isDownPressed() || targetVy < -0.15;
        if (isPressingDown) {
          this.state.raccoon.isSlidingDown = true;
          this.state.raccoon.slideTimer = 0;
          this.state.raccoon.slideDuration = SLIDE_7_TO_4.DURATION;
          this.state.raccoon.slideStartX = this.state.raccoon.x;
          this.state.raccoon.slideStartY = this.state.raccoon.y;
          this.state.raccoon.slideTargetX = slideEndWin.worldLeft + 0.025;
          this.state.raccoon.slideTargetY = slideEndWin.sillY;
          this.state.raccoon.isRestingOnSill = false;
          sound.playSlideDownWhoosh();
          this.spawnFloatingText('SWOOOSH! 🛝', this.state.raccoon.x, this.state.raccoon.y + 0.05, '#38bdf8');
          this.checkDailyMissionEvent('slide_or_vine', 1);
          this.state.interactionPrompt = null;
          return;
        }
      }
    }

    // 2. Star Trek Teleport Trigger (Floor 12 Win 3 <-> Floor 16 Win 3)
    const floor12 = this.floors.find((f) => f.floorNumber === 12);
    const floor16 = this.floors.find((f) => f.floorNumber === 16);
    if (floor12 && floor16 && floor12.windows[3] && floor16.windows[3]) {
      const win12 = floor12.windows[3];
      const win16 = floor16.windows[3];
      const isOnF12Win3 =
        this.state.raccoon.isRestingOnSill &&
        this.state.raccoon.restingSillFloor === 12 &&
        this.state.raccoon.restingSillWindowIndex === 3;
      const isOnF16Win3 =
        this.state.raccoon.isRestingOnSill &&
        this.state.raccoon.restingSillFloor === 16 &&
        this.state.raccoon.restingSillWindowIndex === 3;

      if ((isOnF12Win3 || isOnF16Win3) && !this.state.raccoon.isTeleporting) {
        const destFloor = isOnF12Win3 ? 16 : 12;
        this.state.interactionPrompt = `Press DOWN to Teleport to Floor ${destFloor}! 🖖⚡`;
        hasPrompt = true;
        const isPressingDown = this.input.isDownPressed() || targetVy < -0.15;
        if (isPressingDown) {
          const targetWin = isOnF12Win3 ? win16 : win12;
          this.state.raccoon.isTeleporting = true;
          this.state.raccoon.teleportTimer = 0;
          this.state.raccoon.teleportDuration = 0.85;
          this.state.raccoon.teleportTargetX = (targetWin.sillLeft + targetWin.sillRight) * 0.5;
          this.state.raccoon.teleportTargetY = targetWin.sillY;
          this.state.raccoon.teleportTargetFloor = destFloor;
          this.state.raccoon.teleportTargetWin = 3;
          sound.playTeleport();
          this.spawnFloatingText('BEAM ME UP! 🖖⚡', this.state.raccoon.x, this.state.raccoon.y + 0.05, '#38bdf8');
          this.state.interactionPrompt = null;
          return;
        }
      }
    }

    // 3. Swinging Tarzan Vine Trigger (Floor 8: Win 0 <-> Win 4)
    const floor8 = this.floors.find((f) => f.floorNumber === 8);
    if (floor8 && floor8.windows[0] && floor8.windows[4] && floor8.windows[2]) {
      const win0 = floor8.windows[0];
      const win4 = floor8.windows[4];
      const win2 = floor8.windows[2];
      const isOnF8Win0 =
        this.state.raccoon.isRestingOnSill &&
        this.state.raccoon.restingSillFloor === 8 &&
        this.state.raccoon.restingSillWindowIndex === 0;
      const isOnF8Win4 =
        this.state.raccoon.isRestingOnSill &&
        this.state.raccoon.restingSillFloor === 8 &&
        this.state.raccoon.restingSillWindowIndex === 4;

      if ((isOnF8Win0 || isOnF8Win4) && !this.state.raccoon.isSwingingVine) {
        const destWinIdx = isOnF8Win0 ? 4 : 0;
        this.state.interactionPrompt = `Press DOWN to Tarzan Swing across! 🌿`;
        hasPrompt = true;
        const isPressingDown = this.input.isDownPressed() || targetVy < -0.15;
        if (isPressingDown) {
          const destWin = isOnF8Win0 ? win4 : win0;
          this.state.raccoon.isSwingingVine = true;
          this.state.raccoon.vineSwingTimer = 0;
          this.state.raccoon.vineSwingDuration = 1.15;
          this.state.raccoon.vineStartX = this.state.raccoon.x;
          this.state.raccoon.vineStartY = this.state.raccoon.y;
          this.state.raccoon.vineTargetX = (destWin.sillLeft + destWin.sillRight) * 0.5;
          this.state.raccoon.vineTargetY = destWin.sillY;
          this.state.raccoon.vineAnchorX = (win2.sillLeft + win2.sillRight) * 0.5;
          this.state.raccoon.vineAnchorY = win2.sillY + 0.12;
          this.state.raccoon.isRestingOnSill = false;
          sound.playTarzanSwing();
          this.spawnFloatingText('AHOOO-AHOO! 🌿', this.state.raccoon.x, this.state.raccoon.y + 0.05, '#22c55e');
          this.checkDailyMissionEvent('slide_or_vine', 1);
          this.state.interactionPrompt = null;
          return;
        }
      }
    }

    if (!hasPrompt) {
      this.state.interactionPrompt = null;
    }

    const prevX = this.state.raccoon.x;
    const prevY = this.state.raccoon.y;
    let nextX = prevX + this.state.raccoon.vx * dt;
    let nextY = prevY + this.state.raccoon.vy * dt;

    // Dynamic Weather Wind: push raccoon in horizontal wind direction with increased force to make climbing more challenging
    const isBlizzardActive = weather && (weather.isBlizzard || weather.stormPhase === 'blizzard');
    const isThunderstormActive = weather && (weather.isThunderstorm || weather.stormPhase === 'thunderstorm');
    if (
      weather &&
      !this.state.raccoon.isInTrashCan &&
      !this.state.raccoon.isTumbling &&
      !this.state.raccoon.isSlidingDown &&
      !this.state.raccoon.isSwingingVine &&
      !this.state.raccoon.isTeleporting &&
      !this.state.raccoon.isFallingToTrashCan &&
      !this.state.raccoon.isFallingToGameOver
    ) {
      const isResting = this.state.raccoon.isRestingOnSill;
      let windPushRate = 0;
      if (isBlizzardActive) {
        windPushRate = isResting
          ? GAME_CONFIG.WEATHER.BLIZZARD_SILL_WIND_FORCE
          : GAME_CONFIG.WEATHER.BLIZZARD_WIND_FORCE;
      } else if (isThunderstormActive) {
        windPushRate = isResting
          ? GAME_CONFIG.WEATHER.THUNDERSTORM_SILL_WIND_FORCE
          : GAME_CONFIG.WEATHER.THUNDERSTORM_WIND_FORCE;
      } else if (Math.abs(weather.wind || 0) > 0.05 && weather.type !== 'clear') {
        windPushRate = isResting ? 0.03 : 0.06;
      }

      if (windPushRate > 0) {
        const windPushX = (weather.wind || 0) * windPushRate * dt;
        nextX += windPushX;
      }
    }

    // Approximate floor index to test nearby windows
    const approxFloor = Math.max(1, Math.min(SKYSCRAPER.TOTAL_FLOORS, Math.floor(prevY / SKYSCRAPER.FLOOR_HEIGHT_RATIO) + 1));
    const nearbyFloors = this.floors.filter(
      (f) => Math.abs(f.floorNumber - approxFloor) <= 1
    );

    const colRx = RACCOON.COLLISION_RADIUS_X;
    const colRy = RACCOON.COLLISION_RADIUS_Y;

    // 1. Check Window Sill Resting & Nudging:
    // The allowable vertical distance is situated strictly ABOVE the window sill, at the glass area (NOT below it).
    // vertDistAboveSill = RACCOON.SILL_SNAP_DISTANCE_Y (0.090 - doubled from 0.045).
    // When resting on a window sill, the raccoon stays on that SAME floor's window sill across frames.
    // Middle 95% of window sill allows resting; contacting either end nudges raccoon outward onto wall to continue climbing.
    // Exiting a sill nudges raccoon fully onto the wall clear of the window frame.
    let landedOnSill = false;
    const clearanceX = RACCOON.GLASS_CLEARANCE_X;
    const clearanceY = RACCOON.GLASS_CLEARANCE_Y;
    const vertDistAboveSill = RACCOON.SILL_SNAP_DISTANCE_Y; // 0.090 - Allowable vertical distance strictly ABOVE the sill at the glass area

    if (this.state.raccoon.isRestingOnSill) {
      if (
        this.state.raccoon.restingSillFloor === 1 &&
        (this.state.raccoon.restingSillWindowIndex === null || this.state.raccoon.restingSillWindowIndex === undefined)
      ) {
        // Locked onto ground surface (sidewalk level)
        nextY = groundSurfaceY;
        this.state.raccoon.y = groundSurfaceY;
        this.state.raccoon.vy = 0;
        landedOnSill = true;
        const groundLeftLimit = this.state.leftTrashCan.x - this.state.leftTrashCan.width * 0.20;
        const groundRightLimit = this.state.rightTrashCan.x + this.state.rightTrashCan.width * 0.20;
        nextX = Math.max(groundLeftLimit, Math.min(groundRightLimit, nextX));
      } else if (
        this.state.raccoon.restingSillFloor === SKYSCRAPER.TOTAL_FLOORS &&
        (this.state.raccoon.restingSillWindowIndex === null || this.state.raccoon.restingSillWindowIndex === undefined)
      ) {
        // Locked onto the Rooftop sill / cornice surface!
        // Crawls horizontally along the roof similar to a window sill
        nextY = roofSillY;
        this.state.raccoon.y = roofSillY;
        this.state.raccoon.vy = 0;
        landedOnSill = true;
        const overhang = bWidth * 0.04;
        const roofLedgeLeft = minX - overhang;
        const roofLedgeRight = maxX + overhang;
        nextX = Math.max(roofLedgeLeft, Math.min(roofLedgeRight, nextX));
      } else {
        // The raccoon is ALREADY resting on a window sill:
        // Stay on this exact same floor's window sill!
        const currentFloorNum = this.state.raccoon.restingSillFloor;
        const currentFloor = this.floors.find((f) => f.floorNumber === currentFloorNum);
        const currentWin = currentFloor?.windows.find((w) =>
          this.state.raccoon.restingSillWindowIndex !== undefined && this.state.raccoon.restingSillWindowIndex !== null
            ? w.index === this.state.raccoon.restingSillWindowIndex
            : (prevX >= w.sillLeft - 0.05 && prevX <= w.sillRight + 0.05)
        );

        if (currentFloor && currentWin) {
          // Locked onto this same window sill
          if (nextX >= currentWin.sillLeft && nextX <= currentWin.sillRight) {
            // Whenever the raccoon is upon the window sill it must be resting or crawling directly upon it (never float or hover above it)
            nextY = currentWin.sillY;
            this.state.raccoon.vy = 0;
            landedOnSill = true;
          } else if (nextX < currentWin.sillLeft) {
            // Walked off left edge of sill: exits window sill and begins climbing
            this.state.raccoon.isRestingOnSill = false;
            this.state.raccoon.restingSillFloor = null;
            this.state.raccoon.restingSillWindowIndex = null;
            // Nudge fully onto wall to avoid window frame
            nextX = currentWin.worldLeft - clearanceX;
            this.state.raccoon.x = nextX;
            this.state.raccoon.vx = Math.min(0, this.state.raccoon.vx);
            this.state.raccoon.climbGaitMode = 'vertical';
            this.state.raccoon.facing = 'up';
            landedOnSill = false;
          } else if (nextX > currentWin.sillRight) {
            // Walked off right edge of sill: exits window sill and begins climbing
            this.state.raccoon.isRestingOnSill = false;
            this.state.raccoon.restingSillFloor = null;
            this.state.raccoon.restingSillWindowIndex = null;
            // Nudge fully onto wall to avoid window frame
            nextX = currentWin.worldRight + clearanceX;
            this.state.raccoon.x = nextX;
            this.state.raccoon.vx = Math.max(0, this.state.raccoon.vx);
            this.state.raccoon.climbGaitMode = 'vertical';
            this.state.raccoon.facing = 'up';
            landedOnSill = false;
          }
        } else {
          this.state.raccoon.isRestingOnSill = false;
          this.state.raccoon.restingSillFloor = null;
          this.state.raccoon.restingSillWindowIndex = null;
        }
      }
    } else {
      // Check if descending onto the ground surface
      if (nextY <= groundSurfaceY + 0.005) {
        nextY = groundSurfaceY;
        this.state.raccoon.y = groundSurfaceY;
        this.state.raccoon.vy = 0;
        landedOnSill = true;
        this.state.raccoon.isRestingOnSill = true;
        this.state.raccoon.restingSillFloor = 1;
        this.state.raccoon.restingSillWindowIndex = null;
        this.state.raccoon.facing = this.state.raccoon.lastSideFacing || 'right';
        const groundLeftLimit = this.state.leftTrashCan.x - this.state.leftTrashCan.width * 0.20;
        const groundRightLimit = this.state.rightTrashCan.x + this.state.rightTrashCan.width * 0.20;
        nextX = Math.max(groundLeftLimit, Math.min(groundRightLimit, nextX));
      }

      // Check if reaching the Rooftop ledge (Floor 25 top of the skyscraper):
      const overhang = bWidth * 0.04;
      const roofLedgeLeft = minX - overhang;
      const roofLedgeRight = maxX + overhang;
      const isClimbingUp = (targetVy > 0 || this.state.raccoon.vy > 0);
      const reachedRoofFromBelow = (isClimbingUp || nextY >= roofSillY - 0.015) && prevY <= roofSillY + 0.02 && nextY >= roofSillY;

      if (!landedOnSill && nextX >= roofLedgeLeft && nextX <= roofLedgeRight && (reachedRoofFromBelow || nextY >= roofSillY)) {
        nextY = roofSillY;
        this.state.raccoon.y = roofSillY;
        this.state.raccoon.vy = 0;
        landedOnSill = true;
        sound.playSillLand();
        this.state.raccoon.isRestingOnSill = true;
        this.state.raccoon.restingSillFloor = SKYSCRAPER.TOTAL_FLOORS;
        this.state.raccoon.restingSillWindowIndex = null;
        this.state.raccoon.facing = this.state.raccoon.lastSideFacing || 'right';
      }

      // Raccoon is climbing on the building wall (not resting on sill).
      // Check candidate floors near the raccoon's vertical altitude:
      for (const floor of this.floors) {
        if (Math.abs(floor.worldY - prevY) > SKYSCRAPER.FLOOR_HEIGHT_RATIO * 1.5) continue;

        for (const win of floor.windows) {
          const sillWidth = win.sillRight - win.sillLeft;
          // Middle 95% of the window sill (2.5% on each end)
          const middleMargin = sillWidth * 0.025;
          const middleLeft = win.sillLeft + middleMargin;
          const middleRight = win.sillRight - middleMargin;

          const onExtendedSillSpan = nextX >= win.sillLeft - colRx - 0.015 && nextX <= win.sillRight + colRx + 0.015;
          const isClimbingUp = (targetVy > 0 || this.state.raccoon.vy > 0);

          // 1. Approaching window sill from BELOW (on the brick wall):
          // Tolerance is NOT below the window sill! Must actually reach the sill:
          const reachedSillFromBelow = isClimbingUp && prevY <= win.sillY + 0.015 && nextY >= win.sillY;

          // 2. Approaching horizontally within the allowable vertical distance ABOVE the sill at the glass area:
          const inAboveSillGlassZone = nextY >= win.sillY && nextY <= win.sillY + vertDistAboveSill;

          if (onExtendedSillSpan && reachedSillFromBelow) {
            // Reached sill while climbing up from below:
            if (nextX >= middleLeft && nextX <= middleRight) {
              // Collided with middle 95% -> rest directly atop this window sill!
              nextY = win.sillY;
              this.state.raccoon.vy = 0;
              landedOnSill = true;
              sound.playSillLand();
              this.state.raccoon.isRestingOnSill = true;
              this.state.raccoon.restingSillFloor = floor.floorNumber;
              this.state.raccoon.restingSillWindowIndex = win.index;
              break;
            } else if (nextX < middleLeft) {
              // Contact with left end -> nudge horizontally to the left fully onto wall
              nextX = win.worldLeft - clearanceX;
              this.state.raccoon.x = nextX;
              this.state.raccoon.vx = Math.min(0, this.state.raccoon.vx);
              landedOnSill = false;
              break;
            } else if (nextX > middleRight) {
              // Contact with right end -> nudge horizontally to the right fully onto wall
              nextX = win.worldRight + clearanceX;
              this.state.raccoon.x = nextX;
              this.state.raccoon.vx = Math.max(0, this.state.raccoon.vx);
              landedOnSill = false;
              break;
            }
          } else if (inAboveSillGlassZone && nextX >= win.sillLeft && nextX <= win.sillRight && !wantsDown) {
            // Stepping horizontally onto the sill from the side wall slightly above the window sill:
            // Falls directly to the related window sill rather than floating or hovering above it
            nextY = win.sillY;
            this.state.raccoon.y = win.sillY;
            this.state.raccoon.vy = 0;
            landedOnSill = true;
            sound.playSillLand();
            this.state.raccoon.isRestingOnSill = true;
            this.state.raccoon.restingSillFloor = floor.floorNumber;
            this.state.raccoon.restingSillWindowIndex = win.index;
            break;
          }
        }
        if (landedOnSill) break;
      }
    }

    // Navigation Barriers Collision Check:
    // Elements like window-washer scaffolding, banners, and Floor 13 full-width crossover.
    // Blocks upward climb through barrier without causing slipping or energy loss!
    // Note: 'drone' barriers are dynamic moving patrols handled separately via triggerDroneSlip!
    if (this.state.navigationBarriers && this.state.navigationBarriers.length > 0) {
      for (const barrier of this.state.navigationBarriers) {
        if (barrier.type === 'drone') continue;
        const bBottomY = barrier.worldY;
        const bTopY = barrier.worldY + barrier.height;
        const bLeftX = barrier.leftX - colRx;
        const bRightX = barrier.rightX + colRx;

        if (nextX >= bLeftX && nextX <= bRightX) {
          // If moving upward into bottom of barrier
          if ((targetVy > 0 || this.state.raccoon.vy > 0) && prevY <= bBottomY + 0.015 && nextY >= bBottomY) {
            nextY = bBottomY;
            this.state.raccoon.vy = 0;
            break;
          }
          // If within the vertical span of the barrier while ascending
          if (nextY >= bBottomY && nextY <= bTopY && (targetVy > 0 || this.state.raccoon.vy > 0)) {
            nextY = bBottomY;
            this.state.raccoon.vy = 0;
            break;
          }
        }
      }
    }

    // Street Double Doors (Unclimbable glass obstacle into the building lobby)
    const doorsCenterX = LOBBY_DOUBLE_DOORS.CENTER_X;
    const doorsHalfW = LOBBY_DOUBLE_DOORS.WIDTH_RATIO / 2;
    const doorsMaxY = groundSurfaceY + LOBBY_DOUBLE_DOORS.HEIGHT_RATIO;
    if (
      nextY >= groundSurfaceY + 0.012 &&
      nextY <= doorsMaxY &&
      nextX >= doorsCenterX - doorsHalfW &&
      nextX <= doorsCenterX + doorsHalfW
    ) {
      if (prevX < doorsCenterX - doorsHalfW + 0.012) {
        nextX = doorsCenterX - doorsHalfW;
        this.state.raccoon.vx = 0;
      } else if (prevX > doorsCenterX + doorsHalfW - 0.012) {
        nextX = doorsCenterX + doorsHalfW;
        this.state.raccoon.vx = 0;
      } else {
        nextY = groundSurfaceY;
        this.state.raccoon.vy = 0;
      }
      if (this.state.raccoon.slipEffectTimer <= 0) {
        sound.playGlassSqueak();
        this.state.raccoon.slipEffectTimer = 0.30;
      }
    }

    // Cellphone Base Transceiver Station (BTS on Floor 14 between windows 1 & 2 - unclimbable)
    const fl14 = this.floors.find((f) => f.floorNumber === CELL_TOWER_BTS.FLOOR);
    if (fl14 && fl14.windows[1] && fl14.windows[2]) {
      const btsCenterX = (fl14.windows[1].worldRight + fl14.windows[2].worldLeft) / 2;
      const btsCenterY = fl14.worldY + SKYSCRAPER.FLOOR_HEIGHT_RATIO * 0.50;
      const btsHalfW = CELL_TOWER_BTS.WIDTH_RATIO / 2;
      const btsHalfH = CELL_TOWER_BTS.HEIGHT_RATIO / 2;
      if (
        nextX >= btsCenterX - btsHalfW &&
        nextX <= btsCenterX + btsHalfW &&
        nextY >= btsCenterY - btsHalfH &&
        nextY <= btsCenterY + btsHalfH
      ) {
        if (prevX <= btsCenterX - btsHalfW + 0.012) {
          nextX = btsCenterX - btsHalfW;
          this.state.raccoon.vx = 0;
        } else if (prevX >= btsCenterX + btsHalfW - 0.012) {
          nextX = btsCenterX + btsHalfW;
          this.state.raccoon.vx = 0;
        } else {
          nextY = btsCenterY - btsHalfH;
          this.state.raccoon.vy = 0;
        }
      }
    }

    // Electrified Telephone Cables (From pole on left to building conduit junction)
    const poleX = bLeft + ELECTRIC_CABLES.POLE_X_OFFSET;
    const poleY = groundSurfaceY + ELECTRIC_CABLES.POLE_HEIGHT;
    const junctionX = bLeft;
    const junctionY = groundSurfaceY + ELECTRIC_CABLES.BUILDING_JUNCTION_Y;
    if (
      !this.state.raccoon.isTumbling &&
      this.state.spookInvulnerabilityTimer <= 0 &&
      this.state.raccoon.x >= poleX - 0.02 &&
      this.state.raccoon.x <= junctionX + 0.02
    ) {
      const cableSpan = junctionX - poleX;
      const t = Math.max(0, Math.min(1, (this.state.raccoon.x - poleX) / cableSpan));
      const cableY = poleY + (junctionY - poleY) * t - 0.045 * 4 * t * (1 - t);
      if (Math.abs(this.state.raccoon.y - cableY) <= ELECTRIC_CABLES.SHOCK_RADIUS) {
        sound.playElectricShock();
        for (let s = 0; s < 18; s++) {
          this.state.electricSparks.push({
            id: Math.random(),
            x: this.state.raccoon.x,
            y: this.state.raccoon.y,
            vx: (Math.random() - 0.5) * 0.45,
            vy: (Math.random() - 0.5) * 0.45,
            color: Math.random() < 0.5 ? '#facc15' : '#67e8f9',
            age: 0,
            maxAge: 0.65,
          });
        }
        this.state.raccoon.isElectrified = true;
        this.state.raccoon.electrifiedTimer = 2.4;
        this.state.camera.shake = 24;
        this.state.raccoon.isTumbling = true;
        this.state.raccoon.isFallingToTrashCan = false; // Electrocuted raccoon falls straight to the ground!
        this.state.raccoon.tumbleTimer = 0;
        this.state.raccoon.tumbleTargetY = groundSurfaceY;
        this.state.raccoon.isRestingOnSill = false;
        this.state.raccoon.restingSillFloor = null;
        this.state.raccoon.restingSillWindowIndex = null;
        this.state.raccoon.energy = Math.max(0, this.state.raccoon.energy - 15);
        this.state.spookInvulnerabilityTimer = 3.5;
        this.spawnFloatingText('⚡ ELECTROCUTED! ⚡', this.state.raccoon.x, this.state.raccoon.y + 0.05, '#facc15');
      }
    }

    // Dozen Pigeons Napping on Floor 2 Window Sill (Fly away if raccoon crawls on that specific window ledge)
    const sp = this.state.atmosphere.sillPigeons;
    if (sp && !sp.isScattered) {
      const f2 = this.floors.find((f) => f.floorNumber === sp.floorNumber);
      const win = f2?.windows[sp.windowIndex];
      if (win) {
        const sillTop = win.sillY;
        const sillLeft = win.worldLeft;
        const sillRight = win.worldRight;
        const onThisSill =
          (this.state.raccoon.isRestingOnSill &&
            this.state.raccoon.restingSillFloor === sp.floorNumber &&
            this.state.raccoon.restingSillWindowIndex === sp.windowIndex) ||
          (Math.abs(this.state.raccoon.y - sillTop) < 0.045 &&
            this.state.raccoon.x >= sillLeft - 0.02 &&
            this.state.raccoon.x <= sillRight + 0.02);

        if (onThisSill) {
          sp.isScattered = true;
          sp.scatterTimer = 0;
          sound.playGeeseHonk?.(0.12);
          this.spawnFloatingText('🐦 PIGEON SCATTER! 🐦', (sillLeft + sillRight) * 0.5, sillTop + 0.06, '#94a3b8');
          this.checkDailyMissionEvent('pigeons_scattered', 1);
          sp.pigeons.forEach((p, idx) => {
            p.state = 'flying';
            p.flyX = sillLeft + (sillRight - sillLeft) * p.offsetRatio;
            p.flyY = sillTop + 0.01;
            const spread = (idx - 5.5) / 5.5; // -1 to +1
            p.flyVx = spread * 0.32 + (Math.random() - 0.5) * 0.08;
            p.flyVy = 0.22 + Math.random() * 0.16;
          });
        }
      }
    }

    // Level 9 Laundry Clothesline: Each clothing item is treated separately - only the touched item falls!
    const laundryFloor = GAME_CONFIG.INTERACTIVE_ELEMENTS.LAUNDRY_LINE.FLOOR; // Floor 9
    const fLaundry = this.floors.find((f) => f.floorNumber === laundryFloor);
    if (fLaundry && fLaundry.windows[2] && fLaundry.windows[4] && this.state.laundryLine) {
      const lineLeftX = fLaundry.windows[2].worldLeft;
      const lineRightX = fLaundry.windows[4].worldRight;
      const lineY = fLaundry.windows[2].sillY;

      const racX = this.state.raccoon.x;
      const racY = this.state.raccoon.y;
      const racW = RACCOON.WIDTH_RATIO;
      const racH = RACCOON.HEIGHT_RATIO;

      for (const cloth of this.state.laundryLine.clothes) {
        if (cloth.dropped) continue;
        const clothX = lineLeftX + (lineRightX - lineLeftX) * cloth.offsetRatio;
        const clothW = cloth.type === 'sheet' ? 0.055 : cloth.type === 'pants' ? 0.040 : 0.034;
        const clothH = cloth.type === 'sheet' ? 0.075 : cloth.type === 'pants' ? 0.070 : 0.048;
        const clothTop = lineY + 0.02;
        const clothBottom = lineY - clothH;

        const xHit = (racX + racW * 0.40) >= (clothX - clothW * 0.5) && (racX - racW * 0.40) <= (clothX + clothW * 0.5);
        const yHit = (racY + racH * 0.40) >= clothBottom && (racY - racH * 0.40) <= clothTop;

        if (xHit && yHit) {
          cloth.dropped = true;
          sound.playLaundryPop();
          this.state.laundryLine.fallingItems.push({
            id: cloth.id,
            type: cloth.type,
            x: clothX,
            y: lineY - 0.01,
            vx: (Math.random() - 0.5) * 0.08,
            vy: -0.16 - Math.random() * 0.12,
            rotation: (Math.random() - 0.5) * 0.6,
            vRot: (Math.random() - 0.5) * 5.0,
            color: cloth.color,
            landed: false,
            groundY: groundSurfaceY + 0.012 + Math.random() * 0.018,
            age: 0,
          });
          const icon = cloth.type === 'shirt' ? '👕' : cloth.type === 'pants' ? '👖' : cloth.type === 'sheet' ? '🛏️' : '🧦';
          this.spawnFloatingText(`${icon} DROPPED!`, clothX, lineY + 0.04, '#f472b6');
        }
      }
      this.state.laundryLine.hasDropped = this.state.laundryLine.clothes.every((c) => c.dropped);
    }

    // 2. Window Frame & Glass Obstacle Collision:
    // Paws and body cannot overlap onto window frame or glass while climbing.
    // The unclimbable glass obstacle is situated ABOVE the allowable sill band:
    // from (win.sillY + vertDistAboveSill) up to (win.worldTop + clearanceY)
    let blockedByGlassX = false;

    if (!this.state.raccoon.isRestingOnSill) {
      for (const floor of this.floors) {
        if (Math.abs(floor.worldY - prevY) > SKYSCRAPER.FLOOR_HEIGHT_RATIO * 1.5) continue;

        for (const win of floor.windows) {
          const frameMinX = win.worldLeft - clearanceX;
          const frameMaxX = win.worldRight + clearanceX;
          // Unclimbable glass obstacle begins ABOVE the allowable window sill vertical distance:
          const frameMinY = win.sillY + vertDistAboveSill;
          const frameMaxY = win.worldTop + clearanceY;

          // Check if candidate position penetrates forbidden window frame/glass area
          if (nextX > frameMinX && nextX < frameMaxX && nextY >= frameMinY && nextY <= frameMaxY) {
            let bumpedGlass = false;

            if (prevX <= frameMinX + 0.012) {
              nextX = frameMinX;
              this.state.raccoon.vx = 0;
              bumpedGlass = true;
              blockedByGlassX = true;
            } else if (prevX >= frameMaxX - 0.012) {
              nextX = frameMaxX;
              this.state.raccoon.vx = 0;
              bumpedGlass = true;
              blockedByGlassX = true;
            } else if (prevY >= frameMaxY - 0.012) {
              nextY = frameMaxY;
              this.state.raccoon.vy = 0;
              bumpedGlass = true;
            } else {
              const dLeft = Math.abs(nextX - frameMinX);
              const dRight = Math.abs(nextX - frameMaxX);
              const dTop = Math.abs(nextY - frameMaxY);
              const minD = Math.min(dLeft, dRight, dTop);

              if (minD === dLeft) {
                nextX = frameMinX;
                this.state.raccoon.vx = 0;
                blockedByGlassX = true;
              } else if (minD === dRight) {
                nextX = frameMaxX;
                this.state.raccoon.vx = 0;
                blockedByGlassX = true;
              } else {
                nextY = frameMaxY;
                this.state.raccoon.vy = 0;
              }
              bumpedGlass = true;
            }

            if (bumpedGlass && this.state.raccoon.slipEffectTimer <= 0) {
              sound.playGlassSqueak();
              this.state.raccoon.slipEffectTimer = 0.32;
            }
          }
        }
      }
    }

    // Apply resolved position
    this.state.raccoon.x = nextX;
    this.state.raccoon.y = nextY;

    // Clamp horizontal position: bounded by trash cans on ground, or skyscraper walls while climbing
    let blockedByBuildingEdgeX = false;
    const groundLeftLimit = this.state.leftTrashCan.x - this.state.leftTrashCan.width * 0.20;
    const groundRightLimit = this.state.rightTrashCan.x + this.state.rightTrashCan.width * 0.20;

    if (this.state.raccoon.y <= groundSurfaceY + 0.005) {
      if (this.state.raccoon.x <= groundLeftLimit) {
        this.state.raccoon.x = groundLeftLimit;
        this.state.raccoon.vx = 0;
        blockedByBuildingEdgeX = true;
      } else if (this.state.raccoon.x >= groundRightLimit) {
        this.state.raccoon.x = groundRightLimit;
        this.state.raccoon.vx = 0;
        blockedByBuildingEdgeX = true;
      }
    } else {
      if (this.state.raccoon.x <= minX) {
        this.state.raccoon.x = minX;
        this.state.raccoon.vx = 0;
        if (targetVx < -0.005 || prevX <= minX + 0.002) {
          blockedByBuildingEdgeX = true;
        }
      } else if (this.state.raccoon.x >= maxX) {
        this.state.raccoon.x = maxX;
        this.state.raccoon.vx = 0;
        if (targetVx > 0.005 || prevX >= maxX - 0.002) {
          blockedByBuildingEdgeX = true;
        }
      }
    }

    // Clamp vertical position
    this.state.raccoon.y = Math.max(minY, Math.min(maxY, this.state.raccoon.y));

    // Ground container collision: only enter when descending or stepping down into it, NEVER when climbing up!
    const wantsUp = targetVy > 0.01 || this.state.raccoon.vy > 0.01;
    if (
      !this.state.raccoon.isInTrashCan &&
      this.state.raccoon.climbOutOfCanTimer <= 0 &&
      !wantsUp
    ) {
      const racX = this.state.raccoon.x;
      const racY = this.state.raccoon.y;
      const leftCanX = this.state.leftTrashCan.x;
      const dumpsterX = this.state.dumpster.x;
      const rightCanX = this.state.rightTrashCan.x;

      const isDownward = wantsDown || this.state.raccoon.vy <= -0.01;
      const dumpsterTopY = this.state.dumpster.y + this.state.dumpster.height;
      const leftCanTopY = this.state.leftTrashCan.y + this.state.leftTrashCan.height;
      const rightCanTopY = this.state.rightTrashCan.y + this.state.rightTrashCan.height;

      // 1. Dumpster check (crawl in or downward descend)
      if (
        Math.abs(racX - dumpsterX) <= this.state.dumpster.width * 0.42 &&
        ((racY <= groundSurfaceY + 0.025 && !wantsUp) || (racY <= dumpsterTopY + 0.025 && isDownward))
      ) {
        this.enterContainer('dumpster');
        return;
      }

      // 2. Left Trash Can check
      if (
        Math.abs(racX - leftCanX) <= this.state.leftTrashCan.width * 0.45 &&
        ((racY <= groundSurfaceY + 0.025 && !wantsUp) || (racY <= leftCanTopY + 0.025 && isDownward))
      ) {
        this.enterContainer('left_can');
        return;
      }

      // 3. Right Trash Can check
      if (
        Math.abs(racX - rightCanX) <= this.state.rightTrashCan.width * 0.45 &&
        ((racY <= groundSurfaceY + 0.025 && !wantsUp) || (racY <= rightCanTopY + 0.025 && isDownward))
      ) {
        this.enterContainer('right_can');
        return;
      }
    }

    // Squirrel collision check: squirrels cannot climb glass; raccoon contact causes slip setback
    if (
      this.state.atmosphere?.squirrels &&
      this.state.atmosphere.squirrels.length > 0 &&
      !this.state.raccoon.isTumbling &&
      !this.state.raccoon.isInTrashCan &&
      this.state.spookInvulnerabilityTimer <= 0
    ) {
      const racW = RACCOON.WIDTH_RATIO;
      const racH = RACCOON.HEIGHT_RATIO;
      for (const sq of this.state.atmosphere.squirrels) {
        const dx = Math.abs(this.state.raccoon.x - sq.x);
        const dy = Math.abs(this.state.raccoon.y - sq.y);
        if (dx < racW * 0.52 && dy < racH * 0.52) {
          this.triggerSquirrelSlip(sq);
          break;
        }
      }
    }

    // Drone collision check: Moving surveillance drone patrols cause slip setback when bumped
    if (
      this.state.navigationBarriers &&
      this.state.navigationBarriers.length > 0 &&
      !this.state.raccoon.isTumbling &&
      !this.state.raccoon.isInTrashCan &&
      this.state.spookInvulnerabilityTimer <= 0
    ) {
      const racX = this.state.raccoon.x;
      const racY = this.state.raccoon.y;
      for (const barrier of this.state.navigationBarriers) {
        if (barrier.type !== 'drone') continue;
        const bW = barrier.rightX - barrier.leftX;
        const margin = 0.040;
        const travelWidth = Math.max(0.05, bW - margin * 2);
        const cyclePeriod = 4.2;
        const patrolAngle = (timeSeconds * (Math.PI * 2 / cyclePeriod)) - Math.PI / 2;
        const patrolT = (Math.sin(patrolAngle) + 1) * 0.5;
        const droneX = barrier.leftX + margin + patrolT * travelWidth;
        const droneY = barrier.worldY + barrier.height * 0.5;

        // Collision radius check: ~0.065 world units
        if (Math.hypot(racX - droneX, racY - droneY) < 0.065) {
          this.triggerDroneSlip(droneX, droneY);
          break;
        }
      }
    }

    // Bird collision check: soaring birds & geese flocks in foreground cause slip setback
    if (
      this.state.atmosphere &&
      !this.state.raccoon.isTumbling &&
      !this.state.raccoon.isInTrashCan &&
      this.state.spookInvulnerabilityTimer <= 0
    ) {
      const racX = this.state.raccoon.x;
      const racY = this.state.raccoon.y;
      const racW = RACCOON.WIDTH_RATIO;

      // 1. Soaring birds (hawks, pigeons, swallows)
      if (this.state.atmosphere.soaringBirds) {
        for (const bird of this.state.atmosphere.soaringBirds) {
          const hitRadius = (bird.type === 'hawk' ? 0.105 : 0.075) * (bird.scale / 1.8);
          const dist = Math.hypot(racX - bird.x, racY - bird.y);
          if (dist < hitRadius + racW * 0.45) {
            this.triggerBirdContact(bird.type, bird.x, bird.y);
            break;
          }
        }
      }

      // 2. Geese flocks (V-formation)
      if (
        !this.state.raccoon.isTumbling &&
        this.state.spookInvulnerabilityTimer <= 0 &&
        this.state.atmosphere.geeseFlocks
      ) {
        for (const flock of this.state.atmosphere.geeseFlocks) {
          const nGeese = flock.count;
          const gooseScale = flock.scale;
          const hitRadius = 0.065 * (gooseScale / 1.8);
          let flockHit = false;

          for (let i = 0; i < nGeese; i++) {
            const side = i % 2 === 0 ? 1 : -1;
            const rank = Math.floor((i + 1) / 2);
            const gx = flock.x - flock.direction * rank * 0.070;
            const gy = flock.y + side * rank * 0.048;

            if (Math.hypot(racX - gx, racY - gy) < hitRadius + racW * 0.45) {
              this.triggerBirdContact('goose', gx, gy);
              flockHit = true;
              break;
            }
          }
          if (flockHit) break;
        }
      }

      // 3. Street Kite (Floors 3 to 4) - Scaled collision box proportional to doubled visual size
      if (
        !this.state.raccoon.isTumbling &&
        !this.state.raccoon.isInTrashCan &&
        this.state.atmosphere.kite
      ) {
        const kite = this.state.atmosphere.kite;
        const kw = (GAME_CONFIG.INTERACTIVE_ELEMENTS.STREET_KITE.KITE_WIDTH_RATIO || 0.11);
        const kh = (GAME_CONFIG.INTERACTIVE_ELEMENTS.STREET_KITE.KITE_HEIGHT_RATIO || 0.16);
        const dx = Math.abs(racX - kite.kiteX);
        const dy = Math.abs(racY - kite.kiteY);

        if (dx < kw * 0.5 + racW * 0.35 && dy < kh * 0.5 + racW * 0.35) {
          // Playful contact with the kite: causes kite to swoop upward with a wind whoosh
          kite.targetY = Math.min(GAME_CONFIG.INTERACTIVE_ELEMENTS.STREET_KITE.MAX_WORLD_Y, kite.kiteY + 0.18);
          kite.speedY = 0.085;
          sound.playChimeSuccess?.();
          this.spawnFloatingText('🪁 KITE WHOOSH!', kite.kiteX, kite.kiteY + 0.06, '#facc15');
        }
      }

      // 4. Street-level Passing Vehicles Collision Box:
      // Proportionally sized collision boxes based on enlarged vehicle widths and heights
      if (
        this.state.streetVehicles &&
        this.state.streetVehicles.length > 0 &&
        !this.state.raccoon.isInTrashCan &&
        racY <= 0.08
      ) {
        for (const v of this.state.streetVehicles) {
          const halfW = v.width * 0.5;
          const halfH = v.height * 0.65;
          const vWorldY = -0.015; // Street level world coordinates below sidewalk curb
          if (
            Math.abs(racX - v.x) < halfW + racW * 0.30 &&
            Math.abs(racY - vWorldY) < halfH + 0.02
          ) {
            // Nudge raccoon safely back onto sidewalk curb
            this.state.raccoon.y = Math.max(0.012, this.state.raccoon.y);
            this.state.raccoon.vy = 0;
            sound.playCarHorn(0.08);
            const icon = v.type === 'bus' ? '🚎' : v.type === 'garbage_truck' ? '🗑️' : v.type === 'taxi' ? '🚖' : '🚗';
            this.spawnFloatingText(`${icon} HONK!`, v.x, 0.06, '#facc15');
            break;
          }
        }
      }
    }

    // Movement state: legs immediately stop moving when the body stops moving
    const actualDx = this.state.raccoon.x - prevX;
    const actualDy = this.state.raccoon.y - prevY;
    const actualDist = Math.hypot(actualDx, actualDy);
    const hasInput = Math.abs(targetVx) > 0.01 || Math.abs(targetVy) > 0.01;

    // Detect if horizontal movement is blocked at building edge or glass area
    const isBlockedHorizontally = blockedByBuildingEdgeX || blockedByGlassX || (Math.abs(actualDx) < 0.0004 && Math.abs(actualDy) > 0.0001);

    // Moving only if there is intentional input AND the body actually displaced
    const isMoving = hasInput && actualDist > 0.0001;
    this.state.raccoon.isClimbing = isMoving;
    this.state.raccoon.isScrambling = isMoving && isBoosted;

    // If body stopped moving horizontally or completely, halt velocity immediately so paws freeze instantly
    if (isBlockedHorizontally) {
      this.state.raccoon.vx = 0;
    }
    if (!isMoving) {
      this.state.raccoon.vx = 0;
      this.state.raccoon.vy = 0;
    }

    // Animation: Paw climbing cycle (strictly synchronized 1:1 with vertical/horizontal/diagonal translation)
    if (isMoving) {
      const prevPhase = this.state.raccoon.climbPhase;
      let dPhase = 0;

      if (this.state.raccoon.isRestingOnSill) {
        // Walking or adjusting position along window sill ledge
        dPhase = Math.hypot(actualDx, actualDy) / RACCOON.SILL_CYCLE_DISTANCE;
      } else {
        const absX = Math.abs(actualDx);
        const absY = Math.abs(actualDy);

        // Detect diagonal climbing when both vertical and horizontal components are active,
        // UNLESS the raccoon is at the building edge or glass area:
        // "If raccoon is climbing diagonally up/down at the right or left edge of the building,
        // show only moving up or down animations (no diagonal animations at the edge).
        // This should apply to any non-climbable glass areas as well."
        const isDiagonal = !isBlockedHorizontally &&
          absX > 0.0001 && absY > 0.0001 &&
          (absX / absY >= 0.20) && (absY / absX >= 0.20);

        if (isDiagonal) {
          this.state.raccoon.climbGaitMode = 'diagonal';
          const diagX = actualDx >= 0 ? 1 : -1;
          const diagY = actualDy >= 0 ? 1 : -1;
          this.state.raccoon.diagonalDirection = { x: diagX, y: diagY };
          this.state.raccoon.lastHeadingDirection = (diagY >= 0 ? 'up-' : 'down-') + (diagX >= 0 ? 'right' : 'left') as any;
          // Diagonal phase progression proportional to Euclidean displacement
          dPhase = (actualDy >= 0 ? actualDist : -actualDist) / RACCOON.DIAGONAL_CYCLE_DISTANCE;
        } else if (absY >= absX || isBlockedHorizontally) {
          // Pure vertical climbing: show only moving up or down animations!
          this.state.raccoon.climbGaitMode = 'vertical';
          const vertDir = (actualDy !== 0 ? actualDy : targetVy) >= 0 ? 1 : -1;
          this.state.raccoon.lastVerticalDirection = vertDir;
          this.state.raccoon.facing = vertDir >= 0 ? 'up' : 'down';
          this.state.raccoon.lastHeadingDirection = vertDir >= 0 ? 'up' : 'down';
          dPhase = actualDy / RACCOON.VERTICAL_CYCLE_DISTANCE;
        } else {
          this.state.raccoon.climbGaitMode = 'horizontal';
          this.state.raccoon.lastHeadingDirection = actualDx >= 0 ? 'right' : 'left';
          this.state.raccoon.facing = actualDx >= 0 ? 'right' : 'left';
          dPhase = (actualDx >= 0 ? actualDist : -actualDist) / RACCOON.HORIZONTAL_CYCLE_DISTANCE;
        }
      }

      let nextPhase = (prevPhase + dPhase) % 1.0;
      if (nextPhase < 0) nextPhase += 1.0;
      this.state.raccoon.climbPhase = nextPhase;

      // Tactile paw step sound plays synchronously on paw touchdown (phase 0.0 and 0.5)
      if (
        (prevPhase < 0.5 && nextPhase >= 0.5) ||
        (prevPhase > 0.75 && nextPhase < 0.25) ||
        (prevPhase < 0.25 && nextPhase > 0.75) // Descending
      ) {
        sound.playPawStep(isBoosted);
      }
    } else {
      // When the body stops climbing and is clinging to the wall,
      // arms and legs also stop in whichever position they're in at that exact moment.
    }

    // Slice 2: The Energy System
    // While the raccoon is actively climbing, energy drains at a rate of 1% per 0.5s (2.0% / sec).
    // If the raccoon stops moving while climbing, energy drain slows to 1% per 1.0s (1.0% / sec).
    // Energy increases 1% per every second whenever on the window sill (either moving or resting).
    // If energy reaches 0%, game ends immediately (screen = 'GAME_OVER').
    // Slice 2: The Energy System
    // Exact floor-based drain rates:
    // Floors 1-5: 0.50% / s
    // Floors 6-10: 0.75% / s
    // Floors 11-15: 1.00% / s
    // Floors 16-20: 1.25% / s
    // Floors 21-roof: 1.50% / s
    // Balconies and window sills recharge energy +1.0%/s
    // Climbable fire escape ladder: 0% energy loss
    // Creeping ivy / grapevines: 1.25x speed without extra energy loss
    const {
      MAX_ENERGY,
      FLOOR_DRAIN_RATES,
      STILL_DRAIN_MULTIPLIER,
      BOOST_DRAIN_MULTIPLIER,
      RECHARGE_RATE_ON_SILL,
    } = GAME_CONFIG.ENERGY;

    if (this.state.screen === 'PLAYING' && !this.state.raccoon.isInTrashCan) {
      if (this.state.raccoon.isRestingOnSill) {
        // Balconies and window sills recharge energy +1.0%/s
        this.state.raccoon.energy = Math.min(
          MAX_ENERGY,
          this.state.raccoon.energy + RECHARGE_RATE_ON_SILL * dt
        );
      } else {
        // Clinging to or climbing on building wall
        const floorNum = this.state.currentFloor;
        let baseRate: number = FLOOR_DRAIN_RATES.FLOORS_1_5;
        if (floorNum <= 5) {
          baseRate = FLOOR_DRAIN_RATES.FLOORS_1_5;
        } else if (floorNum <= 10) {
          baseRate = FLOOR_DRAIN_RATES.FLOORS_6_10;
        } else if (floorNum <= 15) {
          baseRate = FLOOR_DRAIN_RATES.FLOORS_11_15;
        } else if (floorNum <= 20) {
          baseRate = FLOOR_DRAIN_RATES.FLOORS_16_20;
        } else {
          baseRate = FLOOR_DRAIN_RATES.FLOORS_21_ROOF;
        }

        let drainRate = baseRate;
        if (!isMoving) {
          drainRate = baseRate * STILL_DRAIN_MULTIPLIER;
        } else if (isBoosted) {
          drainRate = baseRate * BOOST_DRAIN_MULTIPLIER;
        }

        this.state.raccoon.energy = Math.max(0, this.state.raccoon.energy - drainRate * dt);
      }

      // All trash cans and the large commercial dumpster fully restore energy to 100%
      if (this.state.raccoon.y <= groundSurfaceY + 0.045) {
        const racX = this.state.raccoon.x;
        const dumpster = this.state.dumpster;
        const leftCan = this.state.leftTrashCan;
        const rightCan = this.state.rightTrashCan;
        const centerCan = this.state.trashCan;

        const isNearDumpster = Math.abs(racX - dumpster.x) <= dumpster.width * 0.55;
        const isNearLeftCan = Math.abs(racX - leftCan.x) <= leftCan.width * 0.65;
        const isNearRightCan = Math.abs(racX - rightCan.x) <= rightCan.width * 0.65;
        const isNearCenterCan = Math.abs(racX - centerCan.x) <= centerCan.width * 0.65;

        if (isNearDumpster || isNearLeftCan || isNearRightCan || isNearCenterCan) {
          if (this.state.raccoon.energy < 100) {
            const hadLowEnergy = this.state.raccoon.energy < 98;
            this.state.raccoon.energy = 100;
            if (hadLowEnergy) {
              sound.playTrashPop();
              const label = isNearDumpster ? '+100% DUMPSTER FEAST! 🍕🗑️' : '+100% CAN BUFFET! ⚡🗑️';
              this.spawnFloatingText(label, racX, this.state.raccoon.y + 0.05, '#10b981');
              if (isNearDumpster) dumpster.lidRattleTimer = 0.6;
              if (isNearLeftCan) leftCan.lidRattleTimer = 0.6;
              if (isNearRightCan) rightCan.lidRattleTimer = 0.6;
              if (isNearCenterCan) centerCan.lidRattleTimer = 0.6;
            }
          }
        }
      }

      // If energy reaches 0%, trigger smooth tumble fall fading into Game Over before hitting ground
      if (this.state.raccoon.energy <= 0 && !this.state.raccoon.isFallingToGameOver) {
        this.state.raccoon.energy = 0;
        this.state.raccoon.isFallingToGameOver = true;
        this.state.raccoon.gameOverFadeAlpha = 0.0;
        this.state.raccoon.isClimbing = false;
        this.state.raccoon.isRestingOnSill = false;
        this.state.raccoon.restingSillFloor = null;
        this.state.raccoon.restingSillWindowIndex = null;
        this.state.raccoon.vx = 0;
        this.state.raccoon.vy = -0.45;
        sound.playTumbleSlideWhistle();
        this.spawnFloatingText('EXHAUSTED! 💤', this.state.raccoon.x, this.state.raccoon.y + 0.05, '#f43f5e');
      }
    }

    // Slice 3: Snacks & Spooks simulation update
    if (this.state.screen === 'PLAYING') {
      this.updateSlice3SnacksAndSpooks(dt, timeSeconds);
    }

    // Brief rooftop celebration before the Win menu dialog appears
    if (this.roofCelebrationActive) {
      this.roofCelebrationTimer += dt;
      this.updateCelebrationFireworks(dt);

      // Keep raccoon in crawling mode on roof with 100% full energy
      const roofSillY = GAME_CONFIG.SKYSCRAPER.TOTAL_FLOORS * GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO;
      this.state.raccoon.isRestingOnSill = true;
      this.state.raccoon.restingSillFloor = GAME_CONFIG.SKYSCRAPER.TOTAL_FLOORS;
      this.state.raccoon.y = roofSillY;
      this.state.raccoon.energy = 100;

      // After brief celebration (~3.8s), transition to the Win menu!
      if (this.roofCelebrationTimer >= 3.8 && this.state.screen === 'PLAYING') {
        this.roofCelebrationActive = false;
        this.state.screen = 'ROOF_CELEBRATION';
        this.notifyState();
      }
    } else if (this.state.screen === 'ROOF_CELEBRATION') {
      this.updateCelebrationFireworks(dt);
    }

    // Dynamic atmospheric features (scaling with altitude)
    this.updateAtmosphere(dt, timeSeconds);
    this.updateStreetVehicles(dt);

    // Squash & Stretch dynamics: Relax into cute comfy resting pose on sill
    let targetSquash = 1.0;
    if (this.state.raccoon.isRestingOnSill && !isMoving) {
      targetSquash = 0.92; // Comfy perched crouch on sill
    } else if (this.state.raccoon.isClimbing) {
      targetSquash = 1.08;
    }
    this.state.raccoon.squashFactor += (targetSquash - this.state.raccoon.squashFactor) * dt * 8;

    // Tail Sway Physics: Reacts to velocity and adds organic sway
    const velocityTailInfluence = -this.state.raccoon.vx * 0.9;
    const naturalSway = Math.sin(timeSeconds * (this.state.raccoon.isRestingOnSill ? 2.5 : RACCOON.TAIL_SWAY_FREQUENCY)) * (isMoving ? 0.35 : 0.18);
    const targetTailAngle = velocityTailInfluence + naturalSway;
    this.state.raccoon.tailAngle += (targetTailAngle - this.state.raccoon.tailAngle) * dt * 9;

    // Camera follow with lookahead (Both Vertical and Horizontal)
    const targetCamY = this.state.raccoon.y + this.state.raccoon.vy * CAMERA.LOOKAHEAD_FACTOR;
    this.state.camera.targetY = targetCamY;
    this.state.camera.y += (this.state.camera.targetY - this.state.camera.y) * dt * CAMERA.SMOOTH_LERP;

    const targetCamX = this.state.raccoon.x + this.state.raccoon.vx * CAMERA.HORIZONTAL_LOOKAHEAD_FACTOR;
    // Allow camera to smoothly pan past building walls so sky and skyline are visible on both sides
    const buildingLeft = SKYSCRAPER.BUILDING_CENTER_X - bWidth / 2;
    const buildingRight = SKYSCRAPER.BUILDING_CENTER_X + bWidth / 2;
    const minCamX = buildingLeft;
    const maxCamX = buildingRight;
    this.state.camera.targetX = Math.max(minCamX, Math.min(maxCamX, targetCamX));
    this.state.camera.x += (this.state.camera.targetX - this.state.camera.x) * dt * CAMERA.HORIZONTAL_SMOOTH_LERP;

    // Decay camera shake
    if (this.state.raccoon.isInTrashCan) {
      this.state.camera.shake = 0;
    } else if (this.state.camera.shake > 0) {
      this.state.camera.shake = Math.max(0, this.state.camera.shake - dt * 3);
    }

    this.updateFloorAndAltitude(timeSeconds);
  }

  /**
   * Tracks raccoon altitude, skyscraper floor transitions, scoring, and victory condition
   */
  private updateFloorAndAltitude(timeSeconds: number) {
    const { SKYSCRAPER } = GAME_CONFIG;
    // Calculate current floor (1 to 25)
    const floorIndex = Math.floor(this.state.raccoon.y / SKYSCRAPER.FLOOR_HEIGHT_RATIO) + 1;
    const currentFloor = Math.max(1, Math.min(SKYSCRAPER.TOTAL_FLOORS, floorIndex));

    if (currentFloor !== this.state.currentFloor) {
      this.state.currentFloor = currentFloor;
      if (currentFloor > this.state.highestFloorReached) {
        this.state.highestFloorReached = currentFloor;
      }
      if (currentFloor > this.bestFloor) {
        this.bestFloor = currentFloor;
        try {
          localStorage.setItem('rotr_best_floor', String(this.bestFloor));
        } catch {}
        this.state.bestFloor = this.bestFloor;
      }
      if (currentFloor !== this.lastNotifiedFloor) {
        this.lastNotifiedFloor = currentFloor;
        sound.playFloorChime(currentFloor);
        this.encounterDirector.tickTurn();
        this.checkDailyMissionEvent('floor_reached', currentFloor, { floor: currentFloor, energy: this.state.raccoon.energy });
        if (this.state.atmosphere.weather.type === 'rain' || this.state.atmosphere.weather.type === 'snow') {
          this.checkDailyMissionEvent('weather_climb', 1);
        }

        // Halfway Milestone: Floor 13 of 25 floors
        if (currentFloor === 13 && !this.hasTriggeredHalfwayMilestone) {
          this.hasTriggeredHalfwayMilestone = true;
          this.triggerHalfwayMilestone();
        }
      }
      this.notifyState();
    }

    // Altitude calculation in meters & best score
    this.state.altitudeMeters = Math.max(0, Math.floor(this.state.raccoon.y * 35));
    const currentScore = (this.state.highestFloorReached - 1) * 1000 + Math.floor(this.state.altitudeMeters * 10);
    if (currentScore > this.bestScore) {
      this.bestScore = currentScore;
      try {
        localStorage.setItem('rotr_best_score', String(this.bestScore));
      } catch {}
      this.state.bestScore = this.bestScore;
    }

    // Throttle React HUD state sync to ~12Hz for smooth energy and altitude meter updates
    if (timeSeconds - this.lastUiNotifyTime >= 0.08) {
      this.lastUiNotifyTime = timeSeconds;
      this.notifyState();
    }

    // Check Eagle Nest arrival sound on Floor 17
    if (currentFloor === 17 && !this.hasPlayedEagleScreech) {
      this.hasPlayedEagleScreech = true;
      sound.playEagleScreech();
      this.spawnFloatingText('EAGLE SCREECH! 🦅', this.state.raccoon.x, this.state.raccoon.y + 0.05, '#f59e0b');
    }

    // Check Rooftop Arrival Condition:
    // The raccoon must reach the top of the building to win.
    // The raccoon enters crawling mode when it reaches the roof similar to a window sill,
    // and there is a brief celebration before the Win menu appears.
    const roofSillY = SKYSCRAPER.TOTAL_FLOORS * SKYSCRAPER.FLOOR_HEIGHT_RATIO;
    if (
      currentFloor === SKYSCRAPER.TOTAL_FLOORS &&
      this.state.raccoon.y >= roofSillY - 0.02 &&
      !this.roofCelebrationActive &&
      this.state.screen === 'PLAYING'
    ) {
      // Enter crawling mode on the roof similar to a window sill
      this.state.raccoon.isRestingOnSill = true;
      this.state.raccoon.restingSillFloor = SKYSCRAPER.TOTAL_FLOORS;
      this.state.raccoon.restingSillWindowIndex = null;
      this.state.raccoon.facing = this.state.raccoon.lastSideFacing || 'right';
      this.state.raccoon.y = roofSillY;
      this.state.raccoon.vx = 0;
      this.state.raccoon.vy = 0;
      this.state.raccoon.energy = 100;

      // Start brief celebration
      this.roofCelebrationActive = true;
      this.roofCelebrationTimer = 0;
      sound.playCelebrationFanfare();
      this.initCelebrationFireworks();
      this.spawnFloatingText('ROOFTOP CONQUERED! 🏆👑', this.state.raccoon.x, roofSillY + 0.08, '#facc15');
      this.spawnFloatingText('TOP RACCOON! 🎉', this.state.raccoon.x, roofSillY + 0.15, '#22c55e');
      this.checkDailyMissionEvent('floor_reached', SKYSCRAPER.TOTAL_FLOORS, { floor: SKYSCRAPER.TOTAL_FLOORS });
      this.notifyState();
    }
  }

  /**
   * Triggers large pop-up milestone celebration when raccoon reaches the halfway mark (Floor 13 of 25)
   */
  public triggerHalfwayMilestone() {
    this.state.halfwayMilestoneTimer = 4.5;
    sound.playCelebrationFanfare?.();

    // Spawn celebratory colorful fireworks burst around the climbing raccoon
    const racX = this.state.raccoon.x;
    const racY = this.state.raccoon.y;
    const colors = ['#facc15', '#38bdf8', '#4ade80', '#f43f5e', '#a855f7', '#fb923c'];
    for (let i = 0; i < 20; i++) {
      const angle = (i * Math.PI * 2) / 20 + Math.random() * 0.2;
      const speed = 0.22 + Math.random() * 0.32;
      this.state.celebrationFireworks.push({
        id: Math.random(),
        x: racX,
        y: racY + 0.04,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[i % colors.length],
        size: 3 + Math.random() * 3,
        alpha: 1,
        age: 0,
        maxAge: 1.5 + Math.random() * 0.6,
      });
    }

    this.spawnFloatingText("YOU'RE HALFWAY THERE! 🌟", racX, racY + 0.08, '#fde047');
    this.notifyState();
  }

  public dismissHalfwayMilestone() {
    this.state.halfwayMilestoneTimer = 0;
    this.notifyState();
  }

  /**
   * Slice 3: Seeds initial snacks onto lower floors using the Master Content Bible
   */
  private seedInitialSnacks() {
    const floorsToSeed = [2, 3, 4, 5];
    for (const floorNum of floorsToSeed) {
      const floor = this.floors.find((f) => f.floorNumber === floorNum);
      if (!floor || floor.windows.length === 0) continue;

      const winIdx = Math.floor(Math.random() * floor.windows.length);
      const win = floor.windows[winIdx];
      const enc = this.encounterDirector.selectEncounter({
        currentFloor: floorNum,
        category: 'snack',
      });
      if (!enc) continue;

      // RULE 1: STRICT HEIGHT ENFORCEMENT
      if (floorNum < enc.minimumFloor || floorNum > enc.maximumFloor) continue;

      const lifetime =
        GAME_CONFIG.SNACKS.MIN_LIFETIME +
        Math.random() * (GAME_CONFIG.SNACKS.MAX_LIFETIME - GAME_CONFIG.SNACKS.MIN_LIFETIME);
      const offset = (Math.random() - 0.5) * 0.4;
      const x = (win.sillLeft + win.sillRight) * 0.5 + offset * (win.sillRight - win.sillLeft);

      this.state.snacks.push({
        id: this.nextSnackId++,
        type: enc.id,
        encounterId: enc.id,
        name: enc.name,
        energyEffect: enc.energyEffect,
        rarity: enc.rarity,
        movementEffect: enc.movementEffect,
        floorNumber: floorNum,
        windowIndex: win.index,
        x,
        y: win.sillY,
        sillY: win.sillY,
        sillLeft: win.sillLeft,
        sillRight: win.sillRight,
        lifetime,
        age: 0,
        bobblePhase: Math.random() * Math.PI * 2,
        isExpiring: false,
        collected: false,
      });

      this.encounterDirector.recordTrigger(enc);
    }
  }

  /**
   * Slice 3: Spawns a random snack resting on a window sill within active climbing range
   * Strictly enforces Rule 1 (Height Filter) and Rule 2 (Cooldown Check) from Master Content Bible
   */
  private spawnRandomSnack() {
    if (this.snackCollectionCooldown > 0) return;
    const camY = this.state.camera.y;
    const visibleSnacks = this.state.snacks.filter((s) => Math.abs(s.y - camY) <= 0.60);
    if (visibleSnacks.length >= 5) return;
    if (this.state.snacks.length >= GAME_CONFIG.SNACKS.MAX_ACTIVE_SNACKS) return;

    // Pick candidate floor near active climbing range first
    const currentFloor = this.state.currentFloor;
    const minFloor = Math.max(1, currentFloor - 1);
    const maxFloor = Math.min(GAME_CONFIG.SKYSCRAPER.TOTAL_FLOORS - 1, currentFloor + 4);

    const candidateFloors = this.floors.filter(
      (f) => f.floorNumber >= minFloor && f.floorNumber <= maxFloor && f.theme !== 'rooftop'
    );
    if (candidateFloors.length === 0) return;

    const floor = candidateFloors[Math.floor(Math.random() * candidateFloors.length)];
    const startingCanWinIndex = this.getStartingTrashCanWindowIndex();
    const availableWindows = floor.windows.filter(
      (w) =>
        !this.state.snacks.some((s) => s.floorNumber === floor.floorNumber && s.windowIndex === w.index) &&
        !(floor.floorNumber === 1 && w.index === startingCanWinIndex)
    );
    if (availableWindows.length === 0) return;

    // RULE 1: STRICT HEIGHT ENFORCEMENT
    // Query EncounterDirector with the exact floor where snack will spawn
    const enc = this.encounterDirector.selectEncounter({
      currentFloor: floor.floorNumber,
      category: 'snack',
    });
    if (!enc) return;

    // Strict validation: discard immediately if floor outside [minimumFloor, maximumFloor]
    if (floor.floorNumber < enc.minimumFloor || floor.floorNumber > enc.maximumFloor) {
      console.warn(`[DEBUG: Discarded snack "${enc.name}" - Floor ${floor.floorNumber} outside range [${enc.minimumFloor}, ${enc.maximumFloor}]]`);
      return;
    }

    const win = availableWindows[Math.floor(Math.random() * availableWindows.length)];
    const lifetime =
      GAME_CONFIG.SNACKS.MIN_LIFETIME +
      Math.random() * (GAME_CONFIG.SNACKS.MAX_LIFETIME - GAME_CONFIG.SNACKS.MIN_LIFETIME);
    const offset = (Math.random() - 0.5) * 0.45;
    const x = (win.sillLeft + win.sillRight) * 0.5 + offset * (win.sillRight - win.sillLeft);

    this.state.snacks.push({
      id: this.nextSnackId++,
      type: enc.id,
      encounterId: enc.id,
      name: enc.name,
      energyEffect: enc.energyEffect,
      rarity: enc.rarity,
      movementEffect: enc.movementEffect,
      floorNumber: floor.floorNumber,
      windowIndex: win.index,
      x,
      y: win.sillY,
      sillY: win.sillY,
      sillLeft: win.sillLeft,
      sillRight: win.sillRight,
      lifetime,
      age: 0,
      bobblePhase: Math.random() * Math.PI * 2,
      isExpiring: false,
      collected: false,
    });

    this.encounterDirector.recordTrigger(enc);
  }

  /**
   * If the raccoon rests on a window ledge long enough (~2.5s), a friendly person appears in the window
   * and offers a delicious snack right beside the raccoon!
   */
  private triggerWindowLedgeSnackGift() {
    this.hasSpawnedRestSnack = true;
    const floorNum = this.state.raccoon.restingSillFloor;
    const winIdx = this.state.raccoon.restingSillWindowIndex;
    if (floorNum == null || winIdx == null) return;

    // Window nearest starter trash can never has any activity
    const startingCanWinIndex = this.getStartingTrashCanWindowIndex();
    if (floorNum === 1 && winIdx === startingCanWinIndex) return;

    // Random chance (~35%) - not guaranteed every time
    if (Math.random() > 0.35) return;

    const floor = this.floors.find((f) => f.floorNumber === floorNum);
    const win = floor?.windows.find((w) => w.index === winIdx);
    if (!floor || !win) return;

    // Gently open window sash
    win.sashOpenRatio = 0.58;

    // Friendly person appears in window with smile
    const personVariant = this.generateRandomPersonVariant();
    // Clear any negative spook on this window
    this.state.spooks = this.state.spooks.filter(
      (s) => !(s.floorNumber === floorNum && s.windowIndex === winIdx)
    );

    this.state.spooks.push({
      id: this.nextSpookId++,
      encounterId: 'snack_handed_snack',
      type: 'curious_person',
      name: 'Friendly Resident with Snack',
      valence: 'positive',
      energyEffect: 0,
      movementEffect: 'none',
      canCauseFall: false,
      floorNumber: floorNum,
      windowIndex: winIdx,
      x: (win.sillLeft + win.sillRight) * 0.5,
      y: win.sillY + 0.04,
      sillY: win.sillY,
      sillLeft: win.sillLeft,
      sillRight: win.sillRight,
      state: 'active',
      timer: 6.5,
      totalDuration: 6.5,
      maxTimer: 6.5,
      sashCurrent: 0.58,
      sashTarget: 0.58,
      soundPlayed: false,
      hasAdverselyAffected: false,
      personVariant,
    });

    // Modest crumb / nibble (scales down with altitude to match higher challenge)
    const crumbOptions = [
      { id: 'snack_crumb', name: 'Cookie Crumb', energy: 8, icon: '🍪' },
      { id: 'snack_pretzel_nibble', name: 'Pretzel Nibble', energy: 8, icon: '🥨' },
      { id: 'snack_bagel_bite', name: 'Bagel Bite', energy: 8, icon: '🥯' },
      { id: 'snack_donut_crumb', name: 'Donut Crumb', energy: 8, icon: '🍩' },
    ];
    const chosen = crumbOptions[Math.floor(Math.random() * crumbOptions.length)];
    const crumbEnergy = getScaledSnackEnergy(chosen.energy, floorNum);

    const offset = this.state.raccoon.x < (win.sillLeft + win.sillRight) * 0.5 ? 0.032 : -0.032;
    const snackX = Math.max(win.sillLeft + 0.014, Math.min(win.sillRight - 0.014, this.state.raccoon.x + offset));

    // Remove any existing snack on this window to avoid clutter
    this.state.snacks = this.state.snacks.filter(
      (s) => !(s.floorNumber === floorNum && s.windowIndex === winIdx)
    );

    this.state.snacks.push({
      id: this.nextSnackId++,
      type: chosen.id,
      encounterId: chosen.id,
      name: chosen.name,
      energyEffect: crumbEnergy,
      rarity: 'rare',
      movementEffect: 'none',
      floorNumber: floorNum,
      windowIndex: winIdx,
      x: snackX,
      y: win.sillY,
      sillY: win.sillY,
      sillLeft: win.sillLeft,
      sillRight: win.sillRight,
      lifetime: 35.0,
      age: 0,
      bobblePhase: 0,
      isExpiring: false,
      collected: false,
    });

    sound.playChimeSuccess();
    this.spawnFloatingText(
      `"HERE'S A CRUMB!" ${chosen.icon}✨ (+${crumbEnergy}%)`,
      this.state.raccoon.x,
      this.state.raccoon.y + 0.065,
      '#34d399'
    );
  }

  /**
   * Slice 3: Generates diverse demographic person variants for curious window onlookers
   * (High rate of kids waving and residents snapping photos)
   */
  private generateRandomPersonVariant(): PersonVariant {
    const { BOOK_COVER_PALETTE } = GAME_CONFIG;
    const skinTones = [
      BOOK_COVER_PALETTE.SKIN_FAIR, // #fde0cb
      BOOK_COVER_PALETTE.SKIN_APRICOT, // #f7b282
      BOOK_COVER_PALETTE.SKIN_TAN, // #c88756
      BOOK_COVER_PALETTE.SKIN_UMBER, // #784421
    ];
    const hairColors = [
      BOOK_COVER_PALETTE.HAIR_BLACK, // #18181b
      BOOK_COVER_PALETTE.HAIR_DARK_BROWN, // #451a03
      BOOK_COVER_PALETTE.HAIR_LIGHT_BROWN, // #b47b4c
      BOOK_COVER_PALETTE.HAIR_BLONDE, // #facc15
      BOOK_COVER_PALETTE.HAIR_SILVER, // #f1f5f9
      BOOK_COVER_PALETTE.CRIMSON_RED, // #e51a24
    ];
    const hairStyles: PersonVariant['hairStyle'][] = [
      'short',
      'curly',
      'bald',
      'bun',
      'afro',
      'bob',
      'ponytail',
    ];
    // 50% chance of kid waving, rest adult/elder/teen
    const ageRoll = Math.random();
    const age: PersonVariant['age'] =
      ageRoll < 0.50 ? 'kid' : ageRoll < 0.75 ? 'adult' : ageRoll < 0.90 ? 'elder' : 'teen';

    const genders: PersonVariant['gender'][] = ['female', 'male', 'androgynous'];
    const accessories: PersonVariant['accessory'][] = [
      'glasses',
      'phone',
      'coffee',
      'pointing',
      'curlers',
      'none',
    ];

    // Hat choices directly from book cover illustration:
    // Red bonnet, emerald green cap, straw boater with ribbon, or black bowler
    const hatRoll = Math.random();
    let hatType: PersonVariant['hatType'] = 'none';
    let hatColor: string | undefined = undefined;

    if (hatRoll < 0.15) {
      hatType = 'red_bonnet';
      hatColor = BOOK_COVER_PALETTE.CRIMSON_RED; // #e51a24
    } else if (hatRoll < 0.30) {
      hatType = 'green_cap';
      hatColor = BOOK_COVER_PALETTE.HAT_GREEN; // #16a34a
    } else if (hatRoll < 0.42) {
      hatType = 'straw_boater';
      hatColor = BOOK_COVER_PALETTE.HAT_STRAW_YELLOW; // #facc15
    } else if (hatRoll < 0.50) {
      hatType = 'bowler';
      hatColor = BOOK_COVER_PALETTE.INK_BLACK; // #18181b
    }

    const shirtColors = [
      BOOK_COVER_PALETTE.CRIMSON_RED, // #e51a24
      BOOK_COVER_PALETTE.SKY_CYAN, // #1ea7e1
      BOOK_COVER_PALETTE.HAT_GREEN, // #16a34a
      BOOK_COVER_PALETTE.BRICK_APRICOT, // #f5925d
      BOOK_COVER_PALETTE.HAT_STRAW_YELLOW, // #facc15
      BOOK_COVER_PALETTE.WALL_PARCHMENT, // #fdf6ed
      BOOK_COVER_PALETTE.INK_CHARCOAL, // #27272a
    ];

    let accessory: PersonVariant['accessory'] = accessories[Math.floor(Math.random() * accessories.length)];
    if (age === 'kid') {
      accessory = Math.random() < 0.75 ? 'pointing' : 'phone'; // Waving or holding camera
    }

    return {
      skinTone: skinTones[Math.floor(Math.random() * skinTones.length)],
      hairColor: hairColors[Math.floor(Math.random() * hairColors.length)],
      hairStyle: hairStyles[Math.floor(Math.random() * hairStyles.length)],
      age,
      gender: genders[Math.floor(Math.random() * genders.length)],
      accessory,
      shirtColor: shirtColors[Math.floor(Math.random() * shirtColors.length)],
      hatType,
      hatColor,
    };
  }

  /**
   * Slice 3: Displays a humorous pop-up toast describing the unexpected window event & setback
   */
  private showSpookToast(
    type: SpookType,
    floorsDown: number,
    personVariant?: PersonVariant,
    customTitle?: string,
    customMessage?: string,
    customIcon?: string
  ) {
    if (customTitle && customMessage) {
      this.state.activeToast = {
        id: Date.now(),
        icon: customIcon || '🐿️',
        title: customTitle,
        message: customMessage,
        floorsDown,
        age: 0,
        lifetime: GAME_CONFIG.SPOOKS.TOAST_DURATION,
        color: '#f59e0b',
      };
      return;
    }

    const bibleEncounter = ENCOUNTERS_BY_ID.get(type);
    if (bibleEncounter) {
      const icon = customIcon || bibleEncounter.icon || '⚡';
      const title = customTitle || bibleEncounter.name.toUpperCase();
      let color = bibleEncounter.valence === 'positive' ? '#10b981' : bibleEncounter.valence === 'negative' ? '#f43f5e' : '#38bdf8';
      let message = customMessage;
      if (!message) {
        if (floorsDown > 0) {
          message = `${bibleEncounter.name}! Tumbled down ${floorsDown} floor${floorsDown > 1 ? 's' : ''}!`;
        } else if (bibleEncounter.energyEffect > 0) {
          message = `${bibleEncounter.name}! Energy boosted +${bibleEncounter.energyEffect}%!`;
        } else if (bibleEncounter.energyEffect < 0) {
          message = `${bibleEncounter.name}! Energy startled ${bibleEncounter.energyEffect}%!`;
        } else {
          message = `${bibleEncounter.name}!`;
        }
      }
      this.state.activeToast = {
        id: Date.now(),
        icon,
        title,
        message,
        floorsDown,
        age: 0,
        lifetime: GAME_CONFIG.SPOOKS.TOAST_DURATION,
        color,
      };
      return;
    }

    const isKid = personVariant?.age === 'kid';
    const toastDetails: Record<SpookType, { icon: string; title: string; message: string; color: string }> = {
      curious_person: {
        icon: isKid
          ? '👋'
          : personVariant?.accessory === 'phone'
          ? '📱'
          : personVariant?.accessory === 'coffee'
          ? '☕'
          : '🙋',
        title: isKid ? 'KID WAVING!' : 'SURPRISE TENANT!',
        message: isKid
          ? `An excited kid waved enthusiastically from the window! Slipped down ${floorsDown} floor${
              floorsDown > 1 ? 's' : ''
            }!`
          : personVariant
          ? `A friendly ${personVariant.age} resident popped up to wave! Slipped down ${floorsDown} floor${
              floorsDown > 1 ? 's' : ''
            }!`
          : `A friendly resident waved energetically! Slipped down ${floorsDown} floor${
              floorsDown > 1 ? 's' : ''
            }!`,
        color: '#f59e0b',
      },
      photo_flash: {
        icon: '📸',
        title: 'SMILE FOR THE CAMERA!',
        message: `A tenant snapped a blinding flash photo of you! Tumbled down ${floorsDown} floor${
          floorsDown > 1 ? 's' : ''
        }!`,
        color: '#38bdf8',
      },
      shower_singer: {
        icon: '🚿',
        title: 'STEAMY SHOWER OPERA!',
        message: `High C soprano vibrato broke your concentration! Slipped down ${floorsDown} floor${
          floorsDown > 1 ? 's' : ''
        }!`,
        color: '#06b6d4',
      },
      watching_tv: {
        icon: '📺',
        title: 'LATE-NIGHT TV JUMPSCARE!',
        message: `A scary commercial blared through the glass! Tumbled down ${floorsDown} floor${
          floorsDown > 1 ? 's' : ''
        }!`,
        color: '#818cf8',
      },
      twin_raccoon: {
        icon: '🦝',
        title: 'FELLOW RACCOON LOOKING OUT!',
        message: `Another raccoon peered curiously through the glass! Startled down ${floorsDown} floor${
          floorsDown > 1 ? 's' : ''
        }!`,
        color: '#fbbf24',
      },
      circus_clown: {
        icon: '🎪',
        title: 'MID-AIR CIRCUS HONK!',
        message: `A clown honked a red nose horn in your whiskers! Tumbled down ${floorsDown} floor${
          floorsDown > 1 ? 's' : ''
        }!`,
        color: '#f43f5e',
      },
      angry_cat: {
        icon: '🐱',
        title: 'CURIOUS WINDOW CAT!',
        message: `A feisty tabby cat swatted at the window screen! Slipped down ${floorsDown} floor${
          floorsDown > 1 ? 's' : ''
        }!`,
        color: '#fb923c',
      },
      sleeping_dog: {
        icon: '🐶',
        title: 'WINDOW DOG BOOF!',
        message: `A golden retriever pressed its snout against the window and barked! Tumbled down ${floorsDown} floor${
          floorsDown > 1 ? 's' : ''
        }!`,
        color: '#eab308',
      },
      disco_party: {
        icon: '🪩',
        title: 'MIDNIGHT DISCO PARTY!',
        message: `Synth beats and spinning lasers shook your grip! Down ${floorsDown} floor${
          floorsDown > 1 ? 's' : ''
        }!`,
        color: '#ec4899',
      },
      alien_observer: {
        icon: '🛸',
        title: 'INTERGALACTIC OBSERVER!',
        message: `An extraterrestrial beamed: "Fascinating trash mammal!" Startled down ${floorsDown} floor${
          floorsDown > 1 ? 's' : ''
        }!`,
        color: '#a855f7',
      },
    };

    const info = toastDetails[type] || {
      icon: '⚡',
      title: 'SPOOKED!',
      message: `Unexpected window surprise! Tumbled down ${floorsDown} floor${
        floorsDown > 1 ? 's' : ''
      }!`,
      color: '#ef4444',
    };

    this.state.activeToast = {
      id: Date.now(),
      icon: info.icon,
      title: info.title,
      message: info.message,
      floorsDown,
      age: 0,
      lifetime: GAME_CONFIG.SPOOKS.TOAST_DURATION,
      color: info.color,
    };
  }

  /**
   * Physical setback when the raccoon collides with a climbing squirrel
   */
  private triggerSquirrelSlip(squirrel: { x: number; y: number }) {
    sound.playSquirrelChatter();
    sound.playTumbleSlideWhistle();
    this.state.camera.shake = 0.20;
    this.state.spookInvulnerabilityTimer = GAME_CONFIG.SPOOKS.INVULNERABILITY_DURATION;

    const groundSurfaceY = GAME_CONFIG.TRASH_CAN.GROUND_Y; // 0.0
    const floorH = GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO;
    // Slips from 0.25 of a level to 0.85 of a level
    const slipDistance = (0.25 + Math.random() * 0.60) * floorH;
    const targetY = Math.max(groundSurfaceY, this.state.raccoon.y - slipDistance);
    const floorsDown = Math.round((slipDistance / floorH) * 10) / 10;

    this.state.raccoon.isTumbling = true;
    this.state.raccoon.tumbleTimer = 0;
    this.state.raccoon.tumbleTargetY = targetY;
    this.state.raccoon.isRestingOnSill = false;
    this.state.raccoon.restingSillFloor = null;
    this.state.raccoon.restingSillWindowIndex = null;

    this.spawnFloatingText('PESKY SQUIRREL! 🐿️💥', this.state.raccoon.x, this.state.raccoon.y + 0.05, '#f59e0b');
    this.showSpookToast(
      'angry_cat',
      floorsDown,
      undefined,
      'PESKY SQUIRREL! 🐿️',
      'A mischievous brick squirrel swatted your whiskers! Slipped downward!',
      '🐿️'
    );
    this.state.raccoon.energy = Math.max(0, this.state.raccoon.energy - 12);
  }

  /**
   * Physical setback when the raccoon collides with an active patrol drone
   */
  private triggerDroneSlip(droneX: number, droneY: number) {
    sound.playTumbleSlideWhistle();
    sound.playGlassSqueak();
    this.state.camera.shake = 0.16;
    this.state.spookInvulnerabilityTimer = GAME_CONFIG.SPOOKS.INVULNERABILITY_DURATION;

    const groundSurfaceY = GAME_CONFIG.TRASH_CAN.GROUND_Y; // 0.0
    const floorH = GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO;
    const slipDistance = (0.20 + Math.random() * 0.55) * floorH;
    const targetY = Math.max(groundSurfaceY, this.state.raccoon.y - slipDistance);
    const floorsDown = Math.round((slipDistance / floorH) * 10) / 10;

    this.state.raccoon.isTumbling = true;
    this.state.raccoon.tumbleTimer = 0;
    this.state.raccoon.tumbleTargetY = targetY;
    this.state.raccoon.isRestingOnSill = false;
    this.state.raccoon.restingSillFloor = null;
    this.state.raccoon.restingSillWindowIndex = null;

    this.spawnFloatingText('DRONE BUMP! 🚁', this.state.raccoon.x, this.state.raccoon.y + 0.05, '#ef4444');
    this.showSpookToast(
      'angry_cat',
      floorsDown,
      undefined,
      'DRONE COLLISION! 🚁',
      'Bumped into a whirring surveillance drone! Slipped downward!',
      '🚁'
    );
    this.state.raccoon.energy = Math.max(0, this.state.raccoon.energy - 10);
  }

  /**
   * Harmless atmospheric encounter when the raccoon contacts a soaring bird or goose.
   * Birds do not cause falling or slipping.
   */
  private triggerBirdContact(birdType: string, birdX: number, birdY: number) {
    if (birdType === 'goose') {
      sound.playGeeseHonk(0.14);
    } else {
      sound.playBirdFlutter(0.16);
    }

    // Brief grace timer so contact isn't spammed across multiple frames
    this.state.spookInvulnerabilityTimer = 1.0;

    const birdLabel = birdType === 'hawk' ? 'HAWK GLIDE! 🦅' : birdType === 'goose' ? 'GEESE FLYOVER! 🪿' : 'PIGEON FLUTTER! 🐦';
    const birdIcon = birdType === 'hawk' ? '🦅' : birdType === 'goose' ? '🪿' : '🐦';
    const birdMessage = birdType === 'hawk'
      ? 'A soaring hawk brushed harmlessly past your whiskers!'
      : birdType === 'goose'
      ? 'A migrating goose honked friendly as it glided past!'
      : 'A city pigeon fluttered by without disturbing your climb!';

    this.spawnFloatingText(birdLabel, this.state.raccoon.x, this.state.raccoon.y + 0.05, '#38bdf8');
    this.showSpookToast(
      'curious_person',
      0, // 0 floors down - no slip or fall!
      undefined,
      birdLabel,
      birdMessage,
      birdIcon
    );
  }

  /**
   * Atmospheric contact when a Floor 3/4 dusk bat flits past the raccoon
   */
  private triggerBatContact(batX: number, batY: number) {
    sound.playBatSqueak();
    this.state.spookInvulnerabilityTimer = 1.0;
    this.spawnFloatingText('BAT FLUTTER! 🦇', batX, batY + 0.05, '#c084fc');
    this.showSpookToast(
      'curious_person',
      0, // 0 floors down - harmless atmospheric encounter
      undefined,
      'BAT FLUTTER! 🦇',
      'A dusk bat flitted past with quick leathery wingbeats!',
      '🦇'
    );
  }

  /**
   * Returns window index on Floor 1 nearest to the starting trash can
   * Used to guarantee that no fall-causing spooks occur near the starting trash can.
   */
  private getStartingTrashCanWindowIndex(): number {
    const floor1 = this.floors.find((f) => f.floorNumber === 1);
    if (!floor1) return -1;
    const canX = this.state?.trashCan?.x ?? getTrashCanStartX();
    let nearestIndex = -1;
    let minDist = Infinity;
    for (const win of floor1.windows) {
      const winCenterX = (win.sillLeft + win.sillRight) * 0.5;
      const dist = Math.abs(winCenterX - canX);
      if (dist < minDist) {
        minDist = dist;
        nearestIndex = win.index;
      }
    }
    return nearestIndex;
  }

  /**
   * Calculates floor-based speed multiplier:
   * Floors 1–5: 1.00 (100%)
   * Floors 6–10: 0.90 (90%)
   * Floors 11–15: 0.80 (80%)
   * Floors 16–20: 0.70 (70%)
   * Floors 21–Roof: 0.50 (50%)
   */
  public getFloorSpeedMultiplier(floorNumber: number): number {
    if (floorNumber <= 5) return 1.00;
    if (floorNumber <= 10) return 0.95;
    if (floorNumber <= 15) return 0.90;
    if (floorNumber <= 20) return 0.85;
    return 0.80;
  }

  /**
   * Calculates the current world vertical elevation (world Y) of the raccoon's head.
   * - In top-down climbing on building walls, head is located at the top of the body.
   * - When resting in cute side profile perched on a window sill, head is raised comfortably above the sill surface.
   */
  public getRaccoonHeadY(): number {
    const { raccoon } = this.state;
    if (raccoon.isRestingOnSill) {
      return raccoon.y + GAME_CONFIG.RACCOON.SIDE_PROFILE_HEIGHT_RATIO * 0.36;
    }
    const squash = raccoon.squashFactor || 1.0;
    const bodyHeight = GAME_CONFIG.RACCOON.HEIGHT_RATIO * squash;
    return raccoon.y + bodyHeight * 0.38;
  }

  /**
   * Calculates world X coordinates for brick mullion lanes between windows and outer building edges.
   * Squirrels climb strictly on these brick lanes and cannot climb on window glass.
   */
  private getBrickMullionLanes(): number[] {
    const { BUILDING_CENTER_X, BUILDING_WIDTH_RATIO, WINDOW_WIDTH_RATIO, WINDOWS_PER_FLOOR } = GAME_CONFIG.SKYSCRAPER;
    const bLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
    const bRight = bLeft + BUILDING_WIDTH_RATIO;
    const winW = WINDOW_WIDTH_RATIO;
    const totalWinsWidth = WINDOWS_PER_FLOOR * winW;
    const remainingSpace = BUILDING_WIDTH_RATIO - totalWinsWidth;
    const gap = remainingSpace / (WINDOWS_PER_FLOOR + 1);

    const mullions: number[] = [];
    // Outer left brick lane (well away from window glass)
    mullions.push(bLeft + gap * 0.45);
    // Brick mullions between each pair of windows
    for (let w = 0; w < WINDOWS_PER_FLOOR - 1; w++) {
      const winRight = bLeft + gap + w * (winW + gap) + winW;
      mullions.push(winRight + gap * 0.5);
    }
    // Outer right brick lane (well away from window glass)
    mullions.push(bRight - gap * 0.45);
    return mullions;
  }

  /**
   * Slice 3: Plays proximity-scaled audio for a spook event (volume scales with distance, silent when far)
   */
  private playSpookProximitySound(type: SpookType, distance: number) {
    switch (type) {
      case 'curious_person':
        sound.playProximityCurious(distance);
        break;
      case 'photo_flash':
        sound.playProximityCamera(distance);
        break;
      case 'shower_singer':
        sound.playProximitySinging(distance);
        break;
      case 'watching_tv':
        sound.playProximityTV(distance);
        break;
      case 'twin_raccoon':
        sound.playProximityRaccoon(distance);
        break;
      case 'circus_clown':
        sound.playProximityCircus(distance);
        break;
      case 'angry_cat':
        sound.playSpookHit();
        break;
      case 'sleeping_dog':
        sound.playProximityDog(distance);
        break;
      case 'disco_party':
        sound.playProximityDisco(distance);
        break;
      case 'alien_observer':
        sound.playProximityAlien(distance);
        break;
    }
  }

  /**
   * Slice 3: Spawns unexpected window encounters (spooks, visual one-liners, humans, animals, signs, spectacles)
   * Strictly enforces Rules 1-4 from the Master Content Bible:
   * 1. Height Filter: Never select an encounter where current_floor is outside [min_floor, max_floor]
   * 2. Cooldown Check: Do not repeat an encounter ID until its cooldown turn counter has expired
   * 3. Anti-Spam Rule: If the previous event had "never_after_spook": true, current event CANNOT be a spook
   * 4. Pacing: Balance visual one-liners, snacks, and quiet climbing moments; no back-to-back negative events
   */
  private spawnRandomSpook() {
    if (this.spookGlobalCooldown > 0) return;
    const isUpper = this.state.currentFloor >= 15;
    const maxSpooks = isUpper ? 6 : GAME_CONFIG.SPOOKS.MAX_ACTIVE_BUILDING_SPOOKS;
    if (this.state.spooks.length >= maxSpooks) return;

    // Pick candidate floor near the raccoon (or along skyscraper)
    let floor: FloorData | undefined;
    let win: WindowDecoration | undefined;

    const currentFloor = this.state.currentFloor;
    let targetFloorNum = currentFloor;

    if (currentFloor >= 2 && Math.random() < 0.80) {
      targetFloorNum = Math.random() < 0.55 ? currentFloor : Math.min(GAME_CONFIG.SKYSCRAPER.TOTAL_FLOORS - 1, currentFloor + 1);
    } else {
      const minFloor = Math.max(1, currentFloor - 2);
      const maxFloor = Math.min(GAME_CONFIG.SKYSCRAPER.TOTAL_FLOORS - 1, currentFloor + 4);
      targetFloorNum = minFloor + Math.floor(Math.random() * (maxFloor - minFloor + 1));
    }

    floor = this.floors.find((f) => f.floorNumber === targetFloorNum);
    if (!floor || floor.theme === 'rooftop') return;

    // Query EncounterDirector for an encounter valid for targetFloorNum
    // Enforces Rules 1, 2, 3, 4!
    const enc = this.encounterDirector.selectEncounter({
      currentFloor: targetFloorNum,
      requiresWindow: true,
    });
    if (!enc) return;

    // RULE 1: STRICT HEIGHT ENFORCEMENT & LEVEL 10 CHECK FOR SLIP-CAUSING SPOOKS & FLASHES
    if (targetFloorNum < enc.minimumFloor || targetFloorNum > enc.maximumFloor) {
      console.warn(`[DEBUG: Discarded spook "${enc.name}" - Floor ${targetFloorNum} outside range [${enc.minimumFloor}, ${enc.maximumFloor}]]`);
      return;
    }

    const isSlipOrFlash =
      enc.canCauseFall ||
      enc.movementEffect === 'drop_one_floor' ||
      enc.movementEffect === 'drop_half_floor' ||
      enc.visibilityEffect === 'camera_flash' ||
      enc.id.includes('flash') ||
      (enc.id.includes('camera') && enc.valence === 'negative');

    if (targetFloorNum < 10 && isSlipOrFlash) {
      return;
    }

    // Filter available windows on candidate floor
    const startingCanWinIndex = this.getStartingTrashCanWindowIndex();
    const availableWindows = floor.windows.filter(
      (w) =>
        !this.state.spooks.some((s) => s.floorNumber === floor!.floorNumber && s.windowIndex === w.index) &&
        // Protect window nearest starting trash can on floor 1 from ANY spook activity
        !(floor!.floorNumber === 1 && w.index === startingCanWinIndex)
    );
    if (availableWindows.length === 0) return;

    // Sort by horizontal closeness to raccoon
    availableWindows.sort((a, b) => {
      const da = Math.abs((a.sillLeft + a.sillRight) * 0.5 - this.state.raccoon.x);
      const db = Math.abs((b.sillLeft + b.sillRight) * 0.5 - this.state.raccoon.x);
      return da - db;
    });
    win = availableWindows[Math.random() < 0.70 ? 0 : Math.min(1, availableWindows.length - 1)];

    // Person demographic variant for people / window encounters
    let personVariant: PersonVariant | undefined;
    if (enc.category === 'human' || enc.category === 'window' || enc.id.includes('person') || enc.id.includes('human')) {
      personVariant = this.generateRandomPersonVariant();
    }

    // Determine event duration based on metadata
    let totalDuration = 4.0;
    if (enc.duration === 'instant') {
      totalDuration = 2.5 + Math.random() * 1.5;
    } else if (enc.duration === 'short') {
      totalDuration = 5.0 + Math.random() * 2.5;
    } else if (enc.duration === 'sustained') {
      totalDuration = 12.0 + Math.random() * 15.0;
    }

    // Window sash target
    let sashTarget = 0.40 + Math.random() * 0.22;
    if (enc.id.includes('shower') || enc.id.includes('tv') || enc.id.includes('blinds') || enc.id.includes('closed')) {
      sashTarget = 0.0;
    }

    // Sign text for window signs
    let signText: string | undefined;
    if (enc.id === 'absurd_sign_why') signText = 'WHY?';
    else if (enc.id === 'absurd_sign_keep_going') signText = 'KEEP GOING.';
    else if (enc.id === 'absurd_sign_my_hero') signText = 'MY HERO.';
    else if (enc.id === 'absurd_sign_get_job') signText = 'GET A JOB.';
    else if (enc.id === 'human_go_raccoon_sign') signText = 'GO RACCOON!';
    else if (enc.id === 'spook_newspaper') signText = 'DAILY RACCOON';

    const warningDuration = 0.35;

    this.state.spooks.push({
      id: this.nextSpookId++,
      type: enc.id,
      encounterId: enc.id,
      category: enc.category,
      name: enc.name,
      floorNumber: floor.floorNumber,
      windowIndex: win.index,
      x: (win.worldLeft + win.worldRight) * 0.5,
      y: (win.worldBottom + win.worldTop) * 0.5,
      sillY: win.sillY,
      state: 'warning',
      timer: warningDuration,
      maxTimer: warningDuration,
      totalDuration,
      personVariant,
      sashCurrent: 0.0,
      sashTarget,
      soundPlayed: false,
      hasAdverselyAffected: false,
      canCauseFall: enc.canCauseFall,
      energyEffect: enc.energyEffect,
      movementEffect: enc.movementEffect,
      visibilityEffect: enc.visibilityEffect,
      humorLevel: enc.humorLevel,
      valence: enc.valence,
      signText,
    });

    this.encounterDirector.recordTrigger(enc);
  }

  /**
   * Slice 3: Simulation loop for snacks, spooks, particle bursts, and floating badges
   */
  private updateSlice3SnacksAndSpooks(dt: number, timeSeconds: number) {
    // 1. Spawning timers & cooldowns
    if (this.snackCollectionCooldown > 0) {
      this.snackCollectionCooldown = Math.max(0, this.snackCollectionCooldown - dt);
    }
    if (this.spookGlobalCooldown > 0) {
      this.spookGlobalCooldown = Math.max(0, this.spookGlobalCooldown - dt);
    }

    this.snackSpawnTimer -= dt;
    if (this.snackSpawnTimer <= 0) {
      this.snackSpawnTimer = GAME_CONFIG.SNACKS.SPAWN_INTERVAL + Math.random() * 2.0;
      this.spawnRandomSnack();
    }

    this.spookSpawnTimer -= dt;
    if (this.spookSpawnTimer <= 0) {
      const isUpper = this.state.currentFloor >= 15;
      this.spookSpawnTimer = isUpper
        ? 2.8 + Math.random() * 2.2
        : GAME_CONFIG.SPOOKS.SPAWN_INTERVAL + Math.random() * 1.5;
      this.spawnRandomSpook();
    }

    // 2. Invulnerability timer decay
    if (this.state.spookInvulnerabilityTimer > 0) {
      this.state.spookInvulnerabilityTimer = Math.max(0, this.state.spookInvulnerabilityTimer - dt);
    }

    // 3. Update active snacks & collision detection
    const racX = this.state.raccoon.x;
    const racY = this.state.raccoon.y;
    const collectRadius = GAME_CONFIG.SNACKS.COLLECT_RADIUS;

    for (const snack of this.state.snacks) {
      snack.age += dt;
      const timeLeft = snack.lifetime - snack.age;
      snack.isExpiring = timeLeft <= 3.0;
      snack.bobblePhase += dt * 4.0;

      // Touch collision: check horizontal distance along sill & vertical closeness to sill
      const dx = Math.abs(racX - snack.x);
      const dy = Math.abs(racY - snack.sillY);
      const isTouching = dx < collectRadius + 0.016 && dy < 0.065;

      if (isTouching && !snack.collected) {
        snack.collected = true;
        this.checkDailyMissionEvent('snack_collected', 1);
        // Short cooldown before next snack spawn
        this.snackCollectionCooldown = 1.5;
        // Instantly restore energy scaled down with altitude to make higher climbs more challenging
        const baseRecovery = snack.energyEffect ?? GAME_CONFIG.ENERGY.SNACK_RECOVERY;
        const recovery = getScaledSnackEnergy(baseRecovery, this.state.currentFloor);
        this.state.raccoon.energy = Math.min(
          GAME_CONFIG.ENERGY.MAX_ENERGY,
          this.state.raccoon.energy + recovery
        );

        // Audio: Web Audio API synthesized comedic crunch sound
        sound.playSnackCrunch();

        // Visual effects: Floating badge + particle burst
        const snackDisplayName = snack.name || snack.type.replace('_', ' ').toUpperCase();
        this.spawnFloatingText(`+${recovery}% ${snackDisplayName}! ⚡`, snack.x, snack.sillY + 0.05, '#34d399');
        this.triggerSnackCollectParticles(snack.x, snack.sillY, snack.type);
      }
    }

    // Filter out collected or expired snacks (disappear at different random rates)
    this.state.snacks = this.state.snacks.filter((s) => !s.collected && s.age < s.lifetime);

    // 3b. Window Ledge Resting Reward: If raccoon rests on a window ledge long enough (~2.5s), a friendly resident appears with a snack!
    const isRestingOnWindowLedge =
      this.state.raccoon.isRestingOnSill &&
      this.state.raccoon.restingSillFloor !== null &&
      this.state.raccoon.restingSillFloor >= 1 &&
      this.state.raccoon.restingSillWindowIndex !== null &&
      !this.state.raccoon.isInTrashCan &&
      !this.state.raccoon.isTumbling;

    if (isRestingOnWindowLedge) {
      const sillKey = `${this.state.raccoon.restingSillFloor}_${this.state.raccoon.restingSillWindowIndex}`;
      if (this.lastRestingSillKey !== sillKey) {
        this.lastRestingSillKey = sillKey;
        this.sillRestDuration = 0;
        this.hasSpawnedRestSnack = false;
        this.checkDailyMissionEvent('sill_rested', 1);
      }

      this.sillRestDuration += dt;

      if (this.sillRestDuration >= 2.5 && !this.hasSpawnedRestSnack) {
        this.triggerWindowLedgeSnackGift();
      }
    } else {
      this.sillRestDuration = 0;
      this.hasSpawnedRestSnack = false;
      this.lastRestingSillKey = '';
    }

    // 4. Update spooks across all windows & near-vs-far hazard logic
    const hearingDist = GAME_CONFIG.SPOOKS.AUDIO_HEARING_DISTANCE;
    const nearDistX = GAME_CONFIG.SPOOKS.NEAR_DETECTION_DIST_X;
    const nearDistY = GAME_CONFIG.SPOOKS.NEAR_DETECTION_DIST_Y;

    for (const spook of this.state.spooks) {
      spook.timer -= dt;

      // Animate sliding window sash
      if (spook.state === 'active') {
        spook.sashCurrent += (spook.sashTarget - spook.sashCurrent) * dt * 4.0;
      } else if (spook.state === 'retreating') {
        spook.sashCurrent += (0 - spook.sashCurrent) * dt * 5.0;
      }

      // Sync window decoration sashOpenRatio
      const floor = this.floors.find((f) => f.floorNumber === spook.floorNumber);
      const win = floor?.windows.find((w) => w.index === spook.windowIndex);
      if (win) {
        win.sashOpenRatio = Math.max(0, Math.min(0.70, spook.sashCurrent));
      }

      // Distance from raccoon to this spook
      const dist = Math.hypot(racX - spook.x, racY - spook.sillY);

      if (spook.state === 'warning' && spook.timer <= 0) {
        spook.state = 'active';
        spook.timer = spook.totalDuration;
        spook.maxTimer = spook.totalDuration;

        // Proximity audio: trigger entrance sound ONLY if raccoon is close enough to hear it
        if (dist <= hearingDist && !spook.soundPlayed) {
          this.playSpookProximitySound(spook.type, dist);
          spook.soundPlayed = true;
        }
      } else if (spook.state === 'active') {
        // Spatial proximity audio for events that the raccoon climbs past while active
        if (dist <= hearingDist && !spook.soundPlayed) {
          this.playSpookProximitySound(spook.type, dist);
          spook.soundPlayed = true;
        }

        // Near vs Far check:
        // Spooks that occur far away are HARMLESS (so building feels alive without unfair difficulty)
        // REQUIREMENT: If the raccoon encounters a window spook, it will only react/fall if the raccoon's head is within the same vertical elevation as the related window.
        const isOnSameSill =
          this.state.raccoon.isRestingOnSill &&
          this.state.raccoon.restingSillFloor === spook.floorNumber &&
          this.state.raccoon.restingSillWindowIndex === spook.windowIndex;

        // Window vertical elevation bounds
        const windowBottom = win ? win.worldBottom : spook.sillY;
        const windowTop = win ? win.worldTop : spook.sillY + GAME_CONFIG.SKYSCRAPER.WINDOW_HEIGHT_RATIO;

        // Calculate raccoon head vertical elevation in world space
        const headY = this.getRaccoonHeadY();
        const isHeadWithinWindowElevation = headY >= windowBottom && headY <= windowTop;

        // Horizontal encounter: Raccoon is resting on this window's sill, or climbing along the wall
        // immediately adjacent to this window (left/right frame or across the window span)
        let isHorizontallyAdjacent = false;
        if (win) {
          const isImmediateLeft = racX >= win.worldLeft - 0.125 && racX <= win.worldLeft + 0.025;
          const isImmediateRight = racX >= win.worldRight - 0.025 && racX <= win.worldRight + 0.125;
          const isAtWindowSpan = racX >= win.sillLeft - 0.03 && racX <= win.sillRight + 0.03;
          isHorizontallyAdjacent = isImmediateLeft || isImmediateRight || isAtWindowSpan;
        } else {
          isHorizontallyAdjacent = Math.abs(racX - spook.x) <= nearDistX;
        }

        const groundSurfaceY = GAME_CONFIG.TRASH_CAN.GROUND_Y; // 0.0
        const isClimbingOnBuilding = this.state.raccoon.y > groundSurfaceY + 0.005 || isOnSameSill;

        // Only react/fall if the raccoon's head is within the same vertical elevation as the window
        const isNear = (isOnSameSill || isHorizontallyAdjacent) && isHeadWithinWindowElevation && isClimbingOnBuilding;

        const startingCanWinIndex = this.getStartingTrashCanWindowIndex();
        const isNearStarterCan = spook.floorNumber === 1 && spook.windowIndex === startingCanWinIndex;

        if (
          isNear &&
          !isNearStarterCan &&
          !this.state.raccoon.isInTrashCan &&
          !spook.hasAdverselyAffected &&
          this.state.spookInvulnerabilityTimer <= 0 &&
          !this.state.raccoon.isTumbling
        ) {
          spook.hasAdverselyAffected = true;
          const isUpperFloor = spook.floorNumber >= 15 || this.state.currentFloor >= 15;
          // Shorter cooldown on upper floors so more random spooks can appear
          this.spookGlobalCooldown = isUpperFloor ? 3.0 : 7.0;

          const encId = spook.encounterId || '';
          const isFlashSpook =
            spook.visibilityEffect === 'camera_flash' ||
            encId.includes('flash') ||
            encId.includes('camera') ||
            encId === 'spook_flash_photography' ||
            spook.type === 'photo_flash';
          const causesFall = spook.canCauseFall === true || (isFlashSpook && spook.floorNumber >= 10);
          // In upper floors, any negative spook, surprise noise, or window hazard triggers a slip!
          const causesUpperSlip = isUpperFloor && (
            causesFall ||
            spook.valence === 'negative' ||
            spook.category === 'spook' ||
            encId.includes('spook') ||
            encId.includes('shutter') ||
            encId.includes('pigeon') ||
            encId.includes('hawk') ||
            encId.includes('vacuum') ||
            encId.includes('cat') ||
            encId.includes('dog') ||
            encId.includes('drip') ||
            encId.includes('water')
          );
          const movementEffect = spook.movementEffect || 'none';
          const energyEffect = spook.energyEffect ?? (spook.valence === 'negative' ? -10 : 0);

          if (causesUpperSlip || causesFall || movementEffect === 'drop_one_floor' || movementEffect === 'drop_half_floor') {
            const groundSurfaceY = GAME_CONFIG.TRASH_CAN.GROUND_Y; // 0.0
            const floorH = GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO;

            // Slips vary from a small distance (0.15 - 0.40 floor) up to two full floors
            let floorsDown: number;
            const slipRoll = Math.random();
            if (slipRoll < 0.35) {
              // Small slip (loss of footing: 0.15 - 0.40 floor)
              floorsDown = 0.15 + Math.random() * 0.25;
            } else if (slipRoll < 0.70) {
              // Moderate slip (0.50 - 1.05 floors)
              floorsDown = 0.50 + Math.random() * 0.55;
            } else {
              // Major slip (up to 2 full floors: 1.10 - 2.00 floors)
              floorsDown = 1.10 + Math.random() * 0.90;
            }

            let targetY = Math.max(groundSurfaceY, this.state.raccoon.y - floorsDown * floorH);
            if (targetY <= groundSurfaceY + 0.02) {
              targetY = groundSurfaceY;
            }

            // Trigger physical tumble/slip
            this.state.raccoon.isTumbling = true;
            this.state.raccoon.tumbleTimer = 0;
            this.state.raccoon.tumbleTargetY = targetY;
            this.state.raccoon.isRestingOnSill = false;
            this.state.raccoon.restingSillFloor = null;
            this.state.raccoon.restingSillWindowIndex = null;

            sound.playTumbleSlideWhistle();
            this.state.camera.shake = Math.min(0.55, 0.20 + floorsDown * 0.18);
            this.state.spookInvulnerabilityTimer = GAME_CONFIG.SPOOKS.INVULNERABILITY_DURATION;

            const slipFloorsText = floorsDown < 0.45
              ? 'SLIP! 🐾'
              : `-${floorsDown < 1.0 ? floorsDown.toFixed(1) : (Math.round(floorsDown * 10) / 10).toFixed(1)} FL! 🙀`;

            this.showSpookToast(spook.type, Math.max(1, Math.round(floorsDown)), spook.personVariant);
            this.spawnFloatingText(slipFloorsText, racX, racY + 0.05, '#f43f5e');

            if (energyEffect < 0) {
              this.state.raccoon.energy = Math.max(0, this.state.raccoon.energy + energyEffect);
            }
          } else if (movementEffect === 'slight_flinch' || movementEffect === 'minor_spook') {
            // Flinch / slip in place without dropping floors
            sound.playSpookHit();
            this.state.camera.shake = 0.22;
            this.state.spookInvulnerabilityTimer = 1.2;

            if (energyEffect < 0) {
              this.state.raccoon.energy = Math.max(0, this.state.raccoon.energy + energyEffect);
            }

            this.showSpookToast(spook.type, 0, spook.personVariant);
            this.spawnFloatingText(
              `${energyEffect < 0 ? energyEffect + '% ' : ''}FLINCH! 🦝`,
              racX,
              racY + 0.05,
              '#f97316'
            );
          } else {
            // Neutral or positive encounter (e.g. human waving, friendly sign, photography, cheering onlookers)
            this.state.spookInvulnerabilityTimer = 1.0;
            if (energyEffect > 0) {
              this.state.raccoon.energy = Math.min(
                GAME_CONFIG.ENERGY.MAX_ENERGY,
                this.state.raccoon.energy + energyEffect
              );
              sound.playSnackCrunch();
              this.spawnFloatingText(
                `+${energyEffect}% ${spook.name || 'CHEER'}! ✨`,
                racX,
                racY + 0.05,
                '#34d399'
              );
            } else if (energyEffect < 0) {
              this.state.raccoon.energy = Math.max(0, this.state.raccoon.energy + energyEffect);
              this.spawnFloatingText(
                `${energyEffect}% ${spook.name || 'OOPS'}!`,
                racX,
                racY + 0.05,
                '#fb923c'
              );
            } else {
              this.spawnFloatingText(
                `${spook.name || 'HELLO!'} 👋`,
                racX,
                racY + 0.05,
                '#38bdf8'
              );
            }
            this.showSpookToast(spook.type, 0, spook.personVariant);
          }
        }

        if (spook.timer <= 0) {
          spook.state = 'retreating';
          spook.timer = 0.50;
          spook.maxTimer = 0.50;
          if (!spook.hasAdverselyAffected && dist < 0.45) {
            this.checkDailyMissionEvent('spook_dodged', 1);
          }
        }
      }
    }

    // Reset window sash for removed spooks
    for (const spook of this.state.spooks) {
      if (spook.state === 'retreating' && spook.timer <= 0) {
        const floor = this.floors.find((f) => f.floorNumber === spook.floorNumber);
        const win = floor?.windows.find((w) => w.index === spook.windowIndex);
        if (win) {
          win.sashOpenRatio = 0.0;
        }
      }
    }

    // Filter finished spooks
    this.state.spooks = this.state.spooks.filter((s) => s.state !== 'retreating' || s.timer > 0);

    // 5. Update active toast decay
    if (this.state.activeToast) {
      this.state.activeToast.age += dt;
      if (this.state.activeToast.age >= this.state.activeToast.lifetime) {
        this.state.activeToast = null;
      }
    }

    // 5. Update floating text effects
    for (const ft of this.state.floatingTexts) {
      ft.age += dt;
      ft.y += dt * 0.045; // Drift upward
      ft.scale = Math.min(1.25, 0.6 + (ft.age / ft.lifetime) * 0.8);
    }
    this.state.floatingTexts = this.state.floatingTexts.filter((ft) => ft.age < ft.lifetime);

    // 6. Update snack particles
    for (const p of this.state.snackParticles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 0.6 * dt; // Gravity
    }
    this.state.snackParticles = this.state.snackParticles.filter((p) => p.age < p.lifetime);

    // 7. Update falling laundry items
    if (this.state.laundryLine && this.state.laundryLine.fallingItems) {
      for (const item of this.state.laundryLine.fallingItems) {
        if (!item.landed) {
          item.x += item.vx * dt;
          item.y += item.vy * dt;
          item.vy -= 0.65 * dt;
          item.rotation += item.vRot * dt;
          if (item.y <= item.groundY) {
            item.y = item.groundY;
            item.landed = true;
            item.vx = 0;
            item.vy = 0;
          }
        }
        item.age += dt;
      }
    }

    // 8. Update electric sparks
    if (this.state.electricSparks) {
      for (const spark of this.state.electricSparks) {
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.age += dt;
      }
      this.state.electricSparks = this.state.electricSparks.filter((s) => s.age < s.maxAge);
    }
    if (this.state.raccoon.electrifiedTimer && this.state.raccoon.electrifiedTimer > 0) {
      this.state.raccoon.electrifiedTimer -= dt;
      if (this.state.raccoon.electrifiedTimer <= 0) {
        this.state.raccoon.isElectrified = false;
      }
    }
  }

  /**
   * Reports an event to the Daily Missions system and displays notifications if a challenge is completed
   */
  private checkDailyMissionEvent(eventType: MissionEventType, amount: number = 1, metadata?: { floor?: number; energy?: number }) {
    try {
      const newlyCompleted = reportDailyMissionEvent(eventType, amount, metadata);
      if (newlyCompleted.length > 0) {
        sound.playCelebrationFanfare();
        for (const m of newlyCompleted) {
          this.spawnFloatingText(`🎯 MISSION: ${m.title}! ⭐+${m.reward}`, this.state.raccoon.x, this.state.raccoon.y + 0.08, '#facc15');
          this.showSpookToast(
            'curious_person',
            0,
            undefined,
            '🎯 MISSION COMPLETED!',
            `${m.title} — Earned ${m.reward} Stars!`,
            '⭐'
          );
        }
      }
    } catch (e) {
      console.warn('Daily mission event error:', e);
    }
  }

  /**
   * Slice 3: Spawns upward drifting floating text effect
   */
  private spawnFloatingText(text: string, x: number, y: number, color: string) {
    this.state.floatingTexts.push({
      id: this.nextTextId++,
      text,
      x,
      y,
      color,
      age: 0,
      lifetime: 1.85,
      scale: 0.8,
    });
  }

  /**
   * Spawns comedic trash particles when raccoon falls into a trash can
   */
  private spawnTrashParticles(x: number, y: number) {
    const trashColors = ['#94a3b8', '#64748b', '#cbd5e1', '#fef08a', '#86efac', '#e2e8f0'];
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 0.09 + Math.random() * 0.16;
      this.state.snackParticles.push({
        id: this.nextParticleId++,
        x,
        y: y + 0.01,
        vx: Math.cos(angle) * speed,
        vy: Math.abs(Math.sin(angle)) * speed + 0.06,
        color: trashColors[i % trashColors.length],
        size: 0.007 + Math.random() * 0.009,
        age: 0,
        lifetime: 0.55 + Math.random() * 0.35,
        shape: 'crumb',
      });
    }
  }

  /**
   * Slice 3: Triggers sparkling crumb and energy burst particles on snack touch
   */
  private triggerSnackCollectParticles(x: number, y: number, type: SnackType) {
    const palette: Record<SnackType, string[]> = {
      pizza: ['#fbbf24', '#f59e0b', '#ef4444', '#10b981'],
      donut: ['#f472b6', '#ec4899', '#38bdf8', '#fbbf24'],
      mystery_bag: ['#a855f7', '#6366f1', '#10b981', '#fbbf24'],
      pretzel: ['#d97706', '#b45309', '#ffffff', '#fcd34d'],
      fish_taco: ['#34d399', '#f59e0b', '#fbbf24', '#ffffff'],
    };

    const colors = palette[type] || ['#34d399', '#fbbf24', '#ffffff'];

    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 0.08 + Math.random() * 0.14;
      this.state.snackParticles.push({
        id: this.nextParticleId++,
        x,
        y: y + 0.015,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 0.04,
        color: colors[i % colors.length],
        size: 0.006 + Math.random() * 0.008,
        age: 0,
        lifetime: 0.45 + Math.random() * 0.35,
        shape: i % 3 === 0 ? 'sparkle' : 'crumb',
      });
    }

    // Expanding energy ring
    this.state.snackParticles.push({
      id: this.nextParticleId++,
      x,
      y: y + 0.015,
      vx: 0,
      vy: 0,
      color: '#34d399',
      size: 0.02,
      age: 0,
      lifetime: 0.32,
      shape: 'ring',
    });
  }

  /**
   * Atmospheric Animated Features that dynamically scale and increase as the raccoon climbs higher:
   * - Lower floors (1–9): Scurrying squirrels climbing building edges/pipes, urban pigeons.
   * - Mid floors (6–18): Flocks of Canadian geese in V-formation, drifting colorful hot air balloons.
   * - High floors (12–25): Soaring hawks, thick drifting cloud strata & foreground mist.
   * - Rooftop storm peak (16–25): Dramatic lightning arcs, sky illumination flashes & rolling thunder.
   */
  private updateAtmosphere(dt: number, timeSeconds: number) {
    const currentFloor = this.state.currentFloor;
    const camera = this.state.camera;
    const { SKYSCRAPER } = GAME_CONFIG;
    const bWidth = SKYSCRAPER.BUILDING_WIDTH_RATIO;
    const bCenter = SKYSCRAPER.BUILDING_CENTER_X;
    const bLeft = bCenter - bWidth / 2;
    const bRight = bCenter + bWidth / 2;
    const atmo = this.state.atmosphere;

    // 1. Spawning Timers
    this.atmosphereSpawnTimer -= dt;
    if (this.atmosphereSpawnTimer <= 0) {
      this.atmosphereSpawnTimer = 1.8 + Math.random() * 2.2;

      // SQUIRRELS: Scurry strictly on brick mullions across building face and crawl on window sills on lower floors (Floors 1 to 7 only, never past Floor 7)
      const maxSquirrelY = 7.0 * GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO;
      if (currentFloor <= 7 && camera.y <= maxSquirrelY && atmo.squirrels.length < (currentFloor <= 5 ? 4 : 2)) {
        const mullions = this.getBrickMullionLanes();
        // Keep squirrels away from the window nearest raccoon's starting position (Columns 5 and 6 on Floor 1 & 2)
        const allowedCols = currentFloor <= 2 ? [0, 1, 2, 3] : [0, 1, 2, 3, 4, 5, 6];
        const colIdx = allowedCols[Math.floor(Math.random() * allowedCols.length)];
        const x = mullions[colIdx];
        const side = x < bCenter ? 'left' : 'right';
        const startCanX = getTrashCanStartX();
        const floor1BufferY = GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO * 0.85; // Keeps safely above Floor 1 Window 5
        const isNearStartCol = colIdx >= 4 || Math.abs(x - startCanX) < 0.08;
        const minSpawnY = isNearStartCol ? floor1BufferY : 0.08;
        const baseY = Math.min(maxSquirrelY - 0.04, Math.max(minSpawnY, camera.y + (Math.random() - 0.2) * 0.35));
        // If near floor 7 ceiling, climb down; otherwise 50/50
        const willClimbDown = baseY > maxSquirrelY - 0.12 || Math.random() < 0.5;
        const delta = (0.22 + Math.random() * 0.32) * (willClimbDown ? -1 : 1);
        let targetY = Math.min(maxSquirrelY, Math.max(minSpawnY, baseY + delta));

        atmo.squirrels.push({
          id: this.nextAtmosphereId++,
          x,
          y: baseY,
          targetY,
          vx: 0,
          vy: 0.16 + Math.random() * 0.06, // Faster pesky scurry speed
          facing: targetY >= baseY ? 'up' : 'down',
          side,
          state: 'climbing_wall',
          currentColumn: colIdx,
          tailAngle: 0,
          climbPhase: Math.random(),
          pauseTimer: Math.random() * 0.5,
          acorn: Math.random() < 0.55,
          peskyTauntTimer: 2.0 + Math.random() * 3.0,
        });
      }

      // RANDOM BATS: Active around Floor 3 and Floor 4 swooping across building facade
      if (
        currentFloor >= 2 &&
        currentFloor <= 6 &&
        atmo.bats.length < (currentFloor === 3 || currentFloor === 4 ? 3 : 2)
      ) {
        if (Math.random() < 0.70) {
          const dir = Math.random() > 0.5 ? 1 : -1;
          const startX = dir === 1 ? camera.x - 0.95 : camera.x + 0.95;
          const spawnFloor = Math.random() < 0.5 ? 3 : 4;
          const baseY = (spawnFloor - 1) * GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO + 0.16 + (Math.random() - 0.5) * 0.22;
          atmo.bats.push({
            id: this.nextAtmosphereId++,
            x: startX,
            y: baseY,
            vx: dir * (0.16 + Math.random() * 0.09),
            vy: 0,
            baseY,
            wingPhase: Math.random() * Math.PI * 2,
            wingSpeed: 18 + Math.random() * 8,
            facing: dir === 1 ? 'right' : 'left',
            scale: 0.85 + Math.random() * 0.35,
            swoopPhase: Math.random() * Math.PI * 2,
            squeakCooldown: 1.0 + Math.random() * 3.0,
          });
        }
      }

      // GEESE FLOCK: Flying in V-formation across open mid-sky in foreground (Floors 4 to 20)
      if (currentFloor >= 4 && currentFloor <= 20 && atmo.geeseFlocks.length < 1) {
        if (Math.random() < 0.75) {
          const direction = Math.random() > 0.5 ? 1 : -1;
          const startX = direction === 1 ? camera.x - 0.95 : camera.x + 0.95;
          const startY = camera.y + 0.10 + (Math.random() - 0.3) * 0.35;
          atmo.geeseFlocks.push({
            id: this.nextAtmosphereId++,
            x: startX,
            y: startY,
            vx: direction * (0.19 + Math.random() * 0.05),
            vy: (Math.random() - 0.5) * 0.02,
            direction,
            count: 6 + Math.floor(Math.random() * 4), // 6 to 9 geese
            scale: 1.8 + Math.random() * 0.45, // Large foreground geese
            flapPhase: Math.random() * Math.PI,
            honkTimer: 1.0 + Math.random() * 2.0,
            isForeground: true,
          });
        }
      }

      // HOT AIR BALLOON: Floats gracefully between the thunderstorm and the blizzard (Floors 11 to 13)
      if (currentFloor >= 11 && currentFloor <= 13 && atmo.balloons.length < 1) {
        if (Math.random() < 0.85) {
          const direction = Math.random() > 0.5 ? 1 : -1;
          // Starting position adjusted to be slightly more centered in the horizontal direction
          const startX = camera.x + (direction === 1 ? -0.28 : 0.28) + (Math.random() - 0.5) * 0.12;
          const startY = camera.y + 0.08 + (Math.random() - 0.25) * 0.35;
          const patterns: HotAirBalloon['colorPattern'][] = ['rainbow', 'sunset', 'ocean', 'candy'];
          atmo.balloons.push({
            id: this.nextAtmosphereId++,
            x: startX,
            y: startY,
            vx: direction * (0.034 + Math.random() * 0.018),
            scale: 1.0 + Math.random() * 0.2, // Proportionate mid-sky scale
            colorPattern: patterns[Math.floor(Math.random() * patterns.length)],
            bobblePhase: Math.random() * Math.PI * 2,
            isForeground: true,
          });
        }
      }

      // CAPED SUPERHERO: Flies across screen at level 15 (similar in actions to geese flyover)
      if (currentFloor >= 14 && currentFloor <= 16 && !atmo.superhero) {
        if (Math.random() < 0.40) {
          const fromLeft = Math.random() < 0.5;
          const heroFloorY = 15.0 * GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO - 0.22;
          atmo.superhero = {
            x: fromLeft ? camera.x - 1.15 : camera.x + 1.15,
            y: heroFloorY + (Math.random() - 0.5) * 0.08,
            vx: fromLeft ? 0.38 : -0.38,
            scale: 1.45,
            direction: fromLeft ? 'right' : 'left',
            capeFlutterPhase: 0,
          };
          this.spawnFloatingText('🦸 CAPED HERO FLYOVER! 🦸', atmo.superhero.x, atmo.superhero.y + 0.08, '#38bdf8');
        }
      }

      // SOARING BIRDS: Large foreground hawks and birds (Floors 2 to 25)
      const birdCap = currentFloor >= 12 ? 3 : 2;
      if (atmo.soaringBirds.length < birdCap) {
        const isHawk = currentFloor >= 10 && Math.random() < 0.70;
        const direction = Math.random() > 0.5 ? 1 : -1;
        atmo.soaringBirds.push({
          id: this.nextAtmosphereId++,
          type: isHawk ? 'hawk' : Math.random() < 0.5 ? 'pigeon' : 'swallow',
          x: direction === 1 ? camera.x - 0.85 : camera.x + 0.85,
          y: camera.y + (Math.random() - 0.2) * 0.45,
          vx: direction * (isHawk ? 0.09 + Math.random() * 0.04 : 0.15 + Math.random() * 0.08),
          vy: (Math.random() - 0.5) * 0.03,
          scale: isHawk ? 2.3 : 1.6 + Math.random() * 0.3, // Large foreground hawks/birds
          flapPhase: Math.random() * Math.PI * 2,
          isForeground: true,
        });
      }

      // MIST CLOUDS: Large, opaque foreground clouds that block view of raccoon (Floors 8 to 25)
      const targetMistCount = currentFloor < 8 ? 0 : currentFloor < 15 ? 3 : currentFloor < 20 ? 5 : 7;
      if (atmo.mistClouds.length < targetMistCount) {
        atmo.mistClouds.push({
          id: this.nextAtmosphereId++,
          x: camera.x - 0.85 + Math.random() * 1.7,
          y: camera.y + (Math.random() - 0.3) * 0.6,
          vx: 0.035 + Math.random() * 0.05,
          width: 0.75 + Math.random() * 0.55,
          height: 0.18 + Math.random() * 0.14,
          opacity: 0.90 + Math.random() * 0.08, // Thick, opaque foreground clouds
          isForeground: true,
        });
      }
    }

    // Lightning is strictly part of the thunderstorm (Floor 10), handled in updateWeather

    // Lightning Flash Decay
    if (atmo.lightningFlashAlpha > 0) {
      atmo.lightningFlashAlpha = Math.max(0, atmo.lightningFlashAlpha - dt * 3.6);
    }
    if (atmo.lightning) {
      atmo.lightning.timer -= dt;
      if (atmo.lightning.timer <= 0) {
        atmo.lightning = null;
      }
    }

    // Street Kite Flying from Street Level:
    // Child moved further away from dumpster to open sidewalk (CHILD_X = 0.82)
    // Kite begins hovering between Floor 1 and Floor 2 (MIN_WORLD_Y = 0.38)
    // As the raccoon climbs, kite floats higher in proportion, reaching Floor 4 (MAX_WORLD_Y = 2.08)
    if (!atmo.kite) {
      atmo.kite = this.initStreetKite();
    }
    const kite = atmo.kite;
    const { STREET_KITE } = GAME_CONFIG.INTERACTIVE_ELEMENTS;
    kite.swayPhase = (kite.swayPhase + dt * 1.5) % (Math.PI * 2);

    // Calculate raccoon climbing progress towards Floor 4 (0.0 to 1.0)
    const floor4Height = 4.0 * GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO;
    const raccoonClimbProgress = Math.min(1.0, Math.max(0, this.state.raccoon.y / floor4Height));

    // Base hover height elevates as raccoon climbs from ground/first floor up to Floor 4
    const baseHoverY = STREET_KITE.MIN_WORLD_Y + raccoonClimbProgress * (STREET_KITE.MAX_WORLD_Y - STREET_KITE.MIN_WORLD_Y);
    // Subtle gentle thermal hover and random atmospheric breeze bobbing
    const thermalHover = Math.sin(timeSeconds * 1.35 + kite.swayPhase) * 0.045 + Math.cos(timeSeconds * 0.65) * 0.025;
    kite.targetY = Math.max(STREET_KITE.MIN_WORLD_Y, Math.min(STREET_KITE.MAX_WORLD_Y, baseHoverY + thermalHover));

    // Smooth gliding towards target height
    kite.kiteY += (kite.targetY - kite.kiteY) * dt * 2.0;
    kite.kiteY = Math.max(STREET_KITE.MIN_WORLD_Y, Math.min(STREET_KITE.MAX_WORLD_Y, kite.kiteY));

    // Horizontal wind drift: kite sways gently around the base position
    kite.childX = STREET_KITE.CHILD_X;
    kite.kiteX = STREET_KITE.KITE_BASE_X + Math.sin(timeSeconds * 0.85) * 0.045 + Math.cos(timeSeconds * 1.9) * 0.015;

    // 3. Update Entities
    // Squirrels: cannot climb upon glass! They climb on building surfaces and crawl on window sills
    const startCanX = getTrashCanStartX();
    const floor1HalfwayY = GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO * 0.5; // 0.26
    const mullions = this.getBrickMullionLanes();

    for (const sq of atmo.squirrels) {
      const isStartCol = (sq.currentColumn !== undefined && sq.currentColumn >= 4) || Math.abs(sq.x - startCanX) < 0.08;
      const floor1BufferY = GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO * 0.85; // Keeps safely above Floor 1 Window 5
      const minY = isStartCol ? floor1BufferY : 0.08;

      if (sq.pauseTimer > 0) {
        sq.pauseTimer -= dt;
        sq.tailAngle = Math.sin(timeSeconds * 14 + sq.id) * 0.45;
        continue;
      }

      if (sq.state === 'climbing_wall' || !sq.state) {
        // Climbing vertically along a brick wall column
        const colIdx = Math.max(0, Math.min(6, sq.currentColumn ?? (sq.x < bCenter ? 1 : 5)));
        sq.currentColumn = colIdx;
        sq.x = mullions[colIdx]; // strictly on brick wall column, never on glass!

        // Pesky awareness of raccoon
        const racDistX = Math.abs(this.state.raccoon.x - sq.x);
        const racDistY = Math.abs(this.state.raccoon.y - sq.y);
        const isNearRaccoon = racDistX < 0.16 && racDistY < 0.40;

        if (isNearRaccoon) {
          sq.peskyTauntTimer = (sq.peskyTauntTimer || 0) - dt;
          if (sq.peskyTauntTimer <= 0) {
            sq.peskyTauntTimer = 3.2 + Math.random() * 2.5;
            sound.playSquirrelChatter();
            this.spawnFloatingText('CHITTER! 🐿️💨', sq.x, sq.y + 0.04, '#f59e0b');
          }
          // Pesky pursuit: actively dart toward raccoon along the brick column
          if (Math.abs(this.state.raccoon.y - sq.y) > 0.04 && Math.random() < 0.35) {
            sq.targetY = this.state.raccoon.y + (sq.y > this.state.raccoon.y ? -0.04 : 0.04);
          }
        }

        const maxSquirrelY = 7.0 * GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO;
        const distToTarget = (sq.targetY ?? sq.y) - sq.y;
        if (Math.abs(distToTarget) < 0.015 || sq.y >= maxSquirrelY) {
          sq.pauseTimer = 0.25 + Math.random() * 0.65; // Shorter, twitchy pauses
          // Equal 50/50 probability of climbing downward as much as upward; force down if at floor 7 top
          const willClimbDown = sq.y >= maxSquirrelY - 0.08 || Math.random() < 0.5;
          const verticalSpan = 0.22 + Math.random() * 0.35;
          if (willClimbDown && sq.y > minY + 0.15) {
            sq.targetY = Math.max(minY, sq.y - verticalSpan);
            sq.facing = 'down';
          } else {
            sq.targetY = Math.min(maxSquirrelY, sq.y + verticalSpan);
            sq.facing = 'up';
          }
        } else {
          const moveDir = Math.sign(distToTarget);
          sq.y += moveDir * sq.vy * dt;
          if (sq.y > maxSquirrelY) {
            sq.y = maxSquirrelY;
            sq.targetY = Math.max(minY, maxSquirrelY - (0.20 + Math.random() * 0.25));
            sq.facing = 'down';
            sq.pauseTimer = 0.3;
          }
          if (sq.y < minY) {
            sq.y = minY;
            sq.targetY = minY + (0.20 + Math.random() * 0.30);
            sq.facing = 'up';
            sq.pauseTimer = 0.3;
          }
          sq.facing = moveDir > 0 ? 'up' : 'down';
          sq.climbPhase = (sq.climbPhase + dt * 12.0) % 1.0;
          sq.tailAngle = Math.sin(timeSeconds * 12 + sq.id) * 0.4;

          // Check if intersecting a window sill on floors 1-7 to branch onto crawling along the sill!
          for (const floor of this.floors) {
            if (floor.floorNumber > 7) continue;
            if (Math.abs(floor.worldY - sq.y) > GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO * 1.5) continue;
            for (const win of floor.windows) {
              // Keep squirrels away from the window nearest raccoon's starting position (Floor 1 Window 5)
              if (floor.floorNumber === 1 && win.index >= 4) continue;

              if (Math.abs(sq.y - win.sillY) < 0.014 && Math.random() < 0.20) {
                if (colIdx === win.index) {
                  // Turn right onto window sill
                  sq.state = 'crawling_sill';
                  sq.sillFloor = floor.floorNumber;
                  sq.sillWindowIndex = win.index;
                  sq.y = win.sillY;
                  sq.x = win.sillLeft + 0.006;
                  sq.facing = 'right';
                  sq.side = 'right';
                  sq.vx = 0.08 + Math.random() * 0.03;
                  sq.pauseTimer = 0.25;
                  break;
                } else if (colIdx === win.index + 1) {
                  // Turn left onto window sill
                  sq.state = 'crawling_sill';
                  sq.sillFloor = floor.floorNumber;
                  sq.sillWindowIndex = win.index;
                  sq.y = win.sillY;
                  sq.x = win.sillRight - 0.006;
                  sq.facing = 'left';
                  sq.side = 'left';
                  sq.vx = -(0.08 + Math.random() * 0.03);
                  sq.pauseTimer = 0.25;
                  break;
                }
              }
            }
            if (sq.state === 'crawling_sill') break;
          }
        }
      } else {
        // Crawling horizontally on a window sill (never climbing upon glass!)
        const floor = this.floors.find((f) => f.floorNumber === sq.sillFloor);
        const win = floor?.windows.find((w) => w.index === sq.sillWindowIndex);

        if (!win) {
          sq.state = 'climbing_wall';
          sq.currentColumn = 0;
          sq.x = mullions[0];
        } else {
          sq.y = win.sillY; // strictly atop window sill, never on glass!
          sq.x += sq.vx * dt;
          sq.climbPhase = (sq.climbPhase + dt * 8.0) % 1.0;
          sq.tailAngle = Math.sin(timeSeconds * 10 + sq.id) * 0.25;

          // Reached left end of window sill (Column win.index)
          if (sq.x <= win.sillLeft) {
            sq.x = win.sillLeft;
            sq.pauseTimer = 0.4 + Math.random() * 0.6;
            if (Math.random() < 0.65) {
              // Transition to climbing wall on column win.index!
              sq.state = 'climbing_wall';
              sq.currentColumn = win.index;
              sq.x = mullions[win.index];
              // Equal 50/50 probability of climbing downward vs upward
              const willClimbDown = Math.random() < 0.5;
              const verticalSpan = 0.22 + Math.random() * 0.30;
              if (willClimbDown && sq.y > minY + 0.15) {
                sq.facing = 'down';
                sq.targetY = Math.max(minY, sq.y - verticalSpan);
              } else {
                sq.facing = 'up';
                sq.targetY = sq.y + verticalSpan;
              }
            } else {
              // Turn around and crawl back right along the sill
              sq.facing = 'right';
              sq.side = 'right';
              sq.vx = Math.abs(sq.vx);
            }
          }
          // Reached right end of window sill (Column win.index + 1)
          else if (sq.x >= win.sillRight) {
            sq.x = win.sillRight;
            sq.pauseTimer = 0.4 + Math.random() * 0.6;
            if (Math.random() < 0.65) {
              // Transition to climbing wall on column win.index + 1!
              sq.state = 'climbing_wall';
              sq.currentColumn = win.index + 1;
              sq.x = mullions[win.index + 1];
              // Equal 50/50 probability of climbing downward vs upward
              const willClimbDown = Math.random() < 0.5;
              const verticalSpan = 0.22 + Math.random() * 0.30;
              if (willClimbDown && sq.y > minY + 0.15) {
                sq.facing = 'down';
                sq.targetY = Math.max(minY, sq.y - verticalSpan);
              } else {
                sq.facing = 'up';
                sq.targetY = sq.y + verticalSpan;
              }
            } else {
              // Turn around and crawl back left along the sill
              sq.facing = 'left';
              sq.side = 'left';
              sq.vx = -Math.abs(sq.vx);
            }
          }
        }
      }

      if (sq.y < minY) {
        sq.y = minY;
      }
    }
    atmo.squirrels = atmo.squirrels.filter((sq) => Math.abs(sq.y - camera.y) < 1.4 && sq.y <= 7.0 * GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO + 0.05 && currentFloor <= 7);

    // Random Bats (Floor 3 & 4)
    if (atmo.bats) {
      for (const bat of atmo.bats) {
        bat.x += bat.vx * dt;
        bat.swoopPhase += dt * 3.8;
        bat.y = bat.baseY + Math.sin(bat.swoopPhase) * 0.055 + Math.cos(bat.swoopPhase * 2.2) * 0.025;
        bat.wingPhase += dt * bat.wingSpeed;

        bat.squeakCooldown -= dt;
        if (bat.squeakCooldown <= 0 && Math.abs(bat.x - camera.x) < 0.5) {
          sound.playBatSqueak();
          bat.squeakCooldown = 4.0 + Math.random() * 4.0;
        }

        // Harmless contact with raccoon
        if (
          !this.state.raccoon.isTumbling &&
          !this.state.raccoon.isInTrashCan &&
          this.state.spookInvulnerabilityTimer <= 0
        ) {
          const dx = Math.abs(this.state.raccoon.x - bat.x);
          const dy = Math.abs(this.state.raccoon.y - bat.y);
          if (dx < 0.045 && dy < 0.045) {
            this.triggerBatContact(bat.x, bat.y);
          }
        }
      }
      atmo.bats = atmo.bats.filter((b) => Math.abs(b.x - camera.x) < 1.8 && Math.abs(b.y - camera.y) < 1.6);
    }

    // Geese
    for (const flock of atmo.geeseFlocks) {
      flock.x += flock.vx * dt;
      flock.y += flock.vy * dt;
      flock.flapPhase += dt * 7.2;
      flock.honkTimer -= dt;
      if (flock.honkTimer <= 0 && Math.abs(flock.x - camera.x) < 0.5) {
        sound.playGeeseHonk();
        flock.honkTimer = 5.0 + Math.random() * 4.0;
      }
    }
    atmo.geeseFlocks = atmo.geeseFlocks.filter((f) => Math.abs(f.x - camera.x) < 1.6);

    // Hot Air Balloons (Strictly between thunderstorm and blizzard: Floors 11 to 13)
    if (currentFloor < 11 || currentFloor > 13) {
      atmo.balloons = [];
    } else {
      for (const b of atmo.balloons) {
        b.x += b.vx * dt;
        b.bobblePhase += dt * 0.8;
      }
      atmo.balloons = atmo.balloons.filter(
        (b) => Math.abs(b.x - camera.x) < 1.8 && currentFloor >= 11 && currentFloor <= 13
      );
    }

    // Soaring Birds
    for (const bird of atmo.soaringBirds) {
      bird.x += bird.vx * dt;
      bird.y += bird.vy * dt;
      bird.flapPhase += dt * (bird.type === 'hawk' ? 3.0 : 8.5);
    }
    atmo.soaringBirds = atmo.soaringBirds.filter((b) => Math.abs(b.x - camera.x) < 1.5);

    // Mist Clouds
    for (const c of atmo.mistClouds) {
      c.x += c.vx * dt;
    }
    atmo.mistClouds = atmo.mistClouds.filter((c) => Math.abs(c.y - camera.y) < 1.4 && currentFloor >= 9);

    // Caped Superhero Movement (Level 15 flyover)
    if (atmo.superhero) {
      atmo.superhero.x += atmo.superhero.vx * dt;
      atmo.superhero.capeFlutterPhase = (atmo.superhero.capeFlutterPhase + dt * 14.0) % (Math.PI * 2);
      if (Math.abs(atmo.superhero.x - camera.x) > 1.8) {
        atmo.superhero = null;
      }
    }

    // Dozen Pigeons on Floor 2 Sill Movement (Flap and scatter outward when startled)
    if (atmo.sillPigeons && atmo.sillPigeons.isScattered) {
      atmo.sillPigeons.scatterTimer += dt;
      for (const p of atmo.sillPigeons.pigeons) {
        if (p.state === 'flying') {
          p.flyX += p.flyVx * dt;
          p.flyY += p.flyVy * dt;
          p.wingPhase = (p.wingPhase + dt * 16.0) % (Math.PI * 2);
        }
      }
    }

    // Dynamic Weather Simulation (Rain streaks, Snowflakes, Slick Grip & Frost Slowdown)
    this.updateWeather(dt, timeSeconds);
  }

  /**
   * Weather System:
   * Dynamic city weather changes (Rain, Snow, Clear skies)
   * Affects climbing speed (Rain -15%, Snow -20%) and grip (occasional paw slips on slick surfaces)
   */
  private updateWeather(dt: number, timeSeconds: number) {
    const atmo = this.state.atmosphere;
    if (!atmo || !atmo.weather) return;
    const weather = atmo.weather;
    const camera = this.state.camera;
    const currentFloor = this.state.currentFloor;

    // Automatic weather progression by skyscraper altitude zone if in auto mode:
    // Floors 1-8: Clear daytime ascent (sunny skies)
    // Floor 9: Light rain begins
    // Floor 10: Climax into thunderstorm with lightning and thunder
    // Floor 11: Rain ends and a radiant rainbow appears in the sky
    // Floors 12-13: Clear, sunny skies
    // Floors 14-16: Snowstorm begins with gentle flurries
    // Floors 17-20: Flurries turn into a windy winter blizzard
    // Floors 21-Roof: Crisp, sunny clear summit skies
    if (weather.mode === 'auto') {
      let expected: import('./types').WeatherType = 'clear';
      let phase: import('./types').StormPhase = 'none';

      if (currentFloor <= 8) {
        expected = 'clear';
        phase = 'none';
      } else if (currentFloor === 9) {
        expected = 'rain';
        phase = 'light_rain';
      } else if (currentFloor === 10) {
        expected = 'rain';
        phase = 'thunderstorm';
      } else if (currentFloor === 11) {
        expected = 'clear';
        phase = 'rainbow';
      } else if (currentFloor >= 12 && currentFloor <= 13) {
        expected = 'clear';
        phase = 'none';
      } else if (currentFloor === 14) {
        expected = 'snow';
        phase = 'snow_flurries';
      } else if (currentFloor === 15) {
        expected = 'snow';
        phase = 'blizzard'; // Reduced duration: 1 floor only (floor 15)
      } else {
        expected = 'clear';
        phase = 'none';
      }

      weather.stormPhase = phase;
      weather.isThunderstorm = phase === 'thunderstorm';
      weather.isBlizzard = phase === 'blizzard';

      if (expected !== weather.targetType) {
        this.setWeather(expected, 'auto');
      }
    }

    // Rainbow alpha fade: arch appears prominently when rain ends (Floor 11)
    if (weather.stormPhase === 'rainbow') {
      weather.rainbowAlpha = Math.min(1.0, (weather.rainbowAlpha || 0) + dt * 1.5);
    } else {
      weather.rainbowAlpha = Math.max(0, (weather.rainbowAlpha || 0) - dt * 0.40);
    }

    // Thunderstorm Climax: periodic lightning strikes, booming thunder crashes, and screen tremors
    if (weather.type === 'rain' && weather.stormPhase === 'thunderstorm') {
      weather.thunderTimer = (weather.thunderTimer || 3.0) - dt;
      if (weather.thunderTimer <= 0) {
        weather.thunderTimer = GAME_CONFIG.WEATHER.THUNDER_INTERVAL_MIN + Math.random() * (GAME_CONFIG.WEATHER.THUNDER_INTERVAL_MAX - GAME_CONFIG.WEATHER.THUNDER_INTERVAL_MIN);
        sound.playThunder();
        this.triggerLightning(camera.x, camera.y);
        this.state.camera.shake = Math.max(this.state.camera.shake, 0.24);
        this.spawnFloatingText('⚡ THUNDER! ⛈️', this.state.raccoon.x, this.state.raccoon.y + 0.08, '#facc15');
      }
    }

    // Smooth transition between weather types & milestone announcement badges
    if (weather.type !== weather.targetType) {
      weather.transitionTimer -= dt;
      if (weather.transitionTimer <= 0) {
        weather.type = weather.targetType;
        weather.intensity = 1.0;
        sound.playWeatherChange(weather.type);
        if (weather.stormPhase === 'light_rain') {
          sound.playRainPatter();
          this.spawnFloatingText('🌧️ LIGHT RAIN BEGINS (-8% SPD)', this.state.raccoon.x, this.state.raccoon.y + 0.08, '#38bdf8');
        } else if (weather.stormPhase === 'thunderstorm') {
          sound.playThunder();
          this.spawnFloatingText('⛈️ THUNDERSTORM CLIMAX! ⚡', this.state.raccoon.x, this.state.raccoon.y + 0.08, '#facc15');
        } else if (weather.stormPhase === 'rainbow') {
          sound.playRainbowSparkle();
          this.spawnFloatingText('🌈 DOUBLE RAINBOW CELEBRATION! ✨', this.state.raccoon.x, this.state.raccoon.y + 0.08, '#f472b6');
        } else if (weather.stormPhase === 'snow_flurries') {
          this.spawnFloatingText('🌨️ GENTLE SNOW FLURRIES (-12% SPD)', this.state.raccoon.x, this.state.raccoon.y + 0.08, '#e0f2fe');
        } else if (weather.stormPhase === 'blizzard') {
          sound.playBlizzardShiver();
          sound.playWindHowl();
          this.spawnFloatingText('❄️ WINDY BLIZZARD! ICY GUSTS', this.state.raccoon.x, this.state.raccoon.y + 0.08, '#38bdf8');
        } else {
          this.spawnFloatingText('☀️ SKIES CLEARED! FULL GRIP', this.state.raccoon.x, this.state.raccoon.y + 0.08, '#fef08a');
        }
      }
    }

    // Dynamic wind sway (wind gusts during blizzard or thunderstorm)
    if (weather.stormPhase === 'blizzard') {
      // Dynamic blizzard wind with strong sustained gusts and buffeting shifts
      weather.wind = 0.58 * Math.sin(timeSeconds * 0.7) + 0.18 * Math.sin(timeSeconds * 1.6);
    } else {
      const baseWind = weather.stormPhase === 'thunderstorm'
        ? 0.40
        : weather.type === 'snow'
        ? 0.28
        : weather.type === 'rain'
        ? 0.22
        : 0.08;
      weather.wind = baseWind * Math.sin(timeSeconds * 0.55);
    }

    // Update ground wetness and frost level
    if (weather.type === 'rain') {
      weather.groundWetness = Math.min(1.0, weather.groundWetness + dt * 0.25);
      weather.frostLevel = Math.max(0, weather.frostLevel - dt * 0.20);
    } else if (weather.type === 'snow') {
      weather.frostLevel = Math.min(1.0, weather.frostLevel + dt * 0.25);
      weather.groundWetness = Math.max(0, weather.groundWetness - dt * 0.20);
    } else {
      weather.groundWetness = Math.max(0, weather.groundWetness - dt * 0.15);
      weather.frostLevel = Math.max(0, weather.frostLevel - dt * 0.15);
    }

    // Particle pool management
    const isThunderstorm = weather.stormPhase === 'thunderstorm';
    const isBlizzard = weather.stormPhase === 'blizzard';
    const isFlurries = weather.stormPhase === 'snow_flurries';
    const isLightRain = weather.stormPhase === 'light_rain';

    const maxDrops = weather.type === 'rain'
      ? (isThunderstorm ? GAME_CONFIG.WEATHER.MAX_RAIN_DROPS : isLightRain ? 80 : 130)
      : weather.type === 'snow'
      ? (isBlizzard ? GAME_CONFIG.WEATHER.MAX_SNOW_FLAKES : isFlurries ? 65 : 95)
      : 0;

    // Spawn new drops if under cap
    while (weather.drops.length < maxDrops) {
      const dropX = camera.x + (Math.random() - 0.5) * 1.8;
      const dropY = camera.y + 0.55 + Math.random() * 0.35;
      if (weather.type === 'rain') {
        const fallVy = isThunderstorm ? -(1.85 + Math.random() * 0.65) : -(1.30 + Math.random() * 0.40);
        weather.drops.push({
          x: dropX,
          y: dropY,
          vx: weather.wind * 0.9 + (Math.random() - 0.5) * 0.05,
          vy: fallVy,
          length: (isThunderstorm ? 0.055 : 0.042) + Math.random() * 0.024,
          size: (isThunderstorm ? 2.0 : 1.5) + Math.random() * 1.0,
          alpha: 0.65 + Math.random() * 0.35, // Pronounced glistening alpha
        });
      } else if (weather.type === 'snow') {
        const fallVy = isBlizzard ? -(0.45 + Math.random() * 0.40) : -(0.18 + Math.random() * 0.15);
        const minFlakeSize = GAME_CONFIG.WEATHER.SNOWFLAKE_BASE_SIZE_MIN;
        const maxFlakeSize = GAME_CONFIG.WEATHER.SNOWFLAKE_BASE_SIZE_MAX;
        const flakeSize = minFlakeSize + Math.random() * (maxFlakeSize - minFlakeSize) * (isBlizzard ? 1.15 : 0.85);
        weather.drops.push({
          x: dropX,
          y: dropY,
          vx: weather.wind * (isBlizzard ? 1.45 : 0.45) + (Math.random() - 0.5) * 0.12,
          vy: fallVy,
          length: 0,
          size: flakeSize,
          alpha: 0.80 + Math.random() * 0.20,
          swayPhase: Math.random() * Math.PI * 2,
        });
      }
    }

    // Update existing drops
    for (const drop of weather.drops) {
      drop.x += drop.vx * dt;
      drop.y += drop.vy * dt;
      if (drop.swayPhase !== undefined) {
        drop.swayPhase = (drop.swayPhase + dt * (isBlizzard ? 5.5 : 3.0)) % (Math.PI * 2);
        drop.x += Math.sin(drop.swayPhase) * dt * (isBlizzard ? 0.12 : 0.06);
      }

      // Check rain impact on window sills or ground to trigger splash
      if (weather.type === 'rain' && weather.splashes.length < 32 && Math.random() < 0.25) {
        const hitFloor = this.floors.find((f) => Math.abs(drop.y - f.worldY) < 0.03);
        if (hitFloor && drop.x >= 0.20 && drop.x <= 0.80) {
          weather.splashes.push({
            x: drop.x,
            y: drop.y,
            vx: (Math.random() - 0.5) * 0.10,
            vy: 0.06 + Math.random() * 0.08,
            life: 0,
            maxLife: 0.18,
            color: 'rgba(186, 230, 253, 0.8)',
          });
        }
      }
    }

    // Filter drops that fell below viewport
    weather.drops = weather.drops.filter(
      (d) => d.y > camera.y - 0.60 && Math.abs(d.x - camera.x) < 1.25
    );

    // Update and filter splashes
    for (const sp of weather.splashes) {
      sp.life += dt;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
    }
    weather.splashes = weather.splashes.filter((sp) => sp.life < sp.maxLife);

    // Grip slip mechanics while climbing in wet rain or icy snow
    const rac = this.state.raccoon;
    if (rac.gripSlipTimer && rac.gripSlipTimer > 0) {
      rac.gripSlipTimer -= dt;
      if (rac.gripSlipTimer <= 0) {
        rac.isGripSlipping = false;
      }
    }

    const isActivelyClimbing =
      !rac.isRestingOnSill &&
      !rac.isInTrashCan &&
      !rac.isTumbling &&
      !rac.isSlidingDown &&
      !rac.isSwingingVine &&
      rac.isClimbing &&
      (Math.abs(rac.vx) > 0.02 || Math.abs(rac.vy) > 0.02);

    if (isActivelyClimbing && (!rac.gripSlipTimer || rac.gripSlipTimer <= 0)) {
      if (weather.type === 'rain') {
        const slipChance = isThunderstorm ? GAME_CONFIG.WEATHER.THUNDERSTORM_SLIP_CHANCE : GAME_CONFIG.WEATHER.RAIN_SLIP_CHANCE;
        const slipRoll = Math.random();
        if (slipRoll < slipChance * dt * 60) {
          rac.isGripSlipping = true;
          rac.gripSlipTimer = 0.32;
          rac.y -= isThunderstorm ? 0.009 : 0.005;
          sound.playPawSlip();
          this.spawnTrashParticles(rac.x, rac.y);
          this.spawnFloatingText(isThunderstorm ? 'STORM SLIP! 💧' : 'SLIP! 💧', rac.x, rac.y + 0.05, '#38bdf8');
        }
      } else if (weather.type === 'snow') {
        const slipChance = isBlizzard ? GAME_CONFIG.WEATHER.BLIZZARD_SLIP_CHANCE : GAME_CONFIG.WEATHER.SNOW_SLIP_CHANCE;
        const slipRoll = Math.random();
        if (slipRoll < slipChance * dt * 60) {
          rac.isGripSlipping = true;
          rac.gripSlipTimer = 0.32;
          rac.y -= isBlizzard ? 0.008 : 0.004;
          sound.playPawSlip();
          this.spawnTrashParticles(rac.x, rac.y);
          this.spawnFloatingText(isBlizzard ? 'BLIZZARD SLIP! ❄️' : 'FROST SLIP! ❄️', rac.x, rac.y + 0.05, '#e0f2fe');
        }
      }
    }
  }

  /**
   * Toggle or set the active weather condition
   */
  public cycleWeather() {
    const atmo = this.state.atmosphere;
    if (!atmo || !atmo.weather) return;
    const types: import('./types').WeatherType[] = ['clear', 'rain', 'snow'];
    const nextIdx = (types.indexOf(atmo.weather.type) + 1) % types.length;
    this.setWeather(types[nextIdx], 'manual');
  }

  public setWeather(type: import('./types').WeatherType, mode: 'auto' | 'manual' = 'manual') {
    const atmo = this.state.atmosphere;
    if (!atmo || !atmo.weather) return;
    atmo.weather.targetType = type;
    atmo.weather.transitionTimer = 0.8;
    atmo.weather.mode = mode;
    this.notifyState();
  }

  /**
   * Generates a jagged branching lightning strike and thunder
   */
  private triggerLightning(camX: number, camY: number) {
    const startX = camX + (Math.random() - 0.5) * 0.9;
    const startY = camY + 0.45;
    const branches: { x1: number; y1: number; x2: number; y2: number }[] = [];

    let currX = startX;
    let currY = startY;
    const segments = 8 + Math.floor(Math.random() * 6);
    const segH = 0.055;

    for (let s = 0; s < segments; s++) {
      const nextX = currX + (Math.random() - 0.5) * 0.08;
      const nextY = currY - segH;
      branches.push({ x1: currX, y1: currY, x2: nextX, y2: nextY });

      // Fork sub-branch
      if (Math.random() < 0.45) {
        const forkEndX = nextX + (Math.random() - 0.5) * 0.09;
        const forkEndY = nextY - segH * 0.65;
        branches.push({ x1: nextX, y1: nextY, x2: forkEndX, y2: forkEndY });
      }

      currX = nextX;
      currY = nextY;
    }

    this.state.atmosphere.lightning = {
      id: this.nextAtmosphereId++,
      x: startX,
      y: startY,
      branches,
      timer: 0.24,
      maxTimer: 0.24,
      intensity: 1.0,
    };
    this.state.atmosphere.lightningFlashAlpha = 0.65;
    sound.playDistantThunder(0.24);
    this.state.camera.shake = Math.max(this.state.camera.shake, 0.22);
  }

  /**
   * Street-Level Vehicles:
   * Occasional city transit busses, taxis, sedans, delivery vans, and sports cars driving across the asphalt street
   */
  private updateStreetVehicles(dt: number) {
    const camera = this.state.camera;
    // Culling when raccoon climbs higher than floor 4 (camera.y > 0.85)
    if (camera.y > 0.85) {
      if (this.state.streetVehicles.length > 0) {
        this.state.streetVehicles = [];
      }
      return;
    }

    this.vehicleSpawnTimer -= dt;
    const maxVehicles = GAME_CONFIG.STREET.MAX_ACTIVE_VEHICLES;

    if (this.vehicleSpawnTimer <= 0 && this.state.streetVehicles.length < maxVehicles) {
      this.vehicleSpawnTimer =
        GAME_CONFIG.STREET.VEHICLE_SPAWN_INTERVAL_MIN +
        Math.random() * (GAME_CONFIG.STREET.VEHICLE_SPAWN_INTERVAL_MAX - GAME_CONFIG.STREET.VEHICLE_SPAWN_INTERVAL_MIN);

      const rand = Math.random();
      let type: VehicleType = 'sedan';
      let width: number = GAME_CONFIG.STREET.CAR_WIDTH_RATIO;
      let height: number = GAME_CONFIG.STREET.CAR_HEIGHT_RATIO;
      let label: string | undefined;

      const colors = ['#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#64748b', '#f97316', '#06b6d4'];
      let color = colors[Math.floor(Math.random() * colors.length)];

      if (rand < 0.22) {
        type = 'bus';
        width = GAME_CONFIG.STREET.BUS_WIDTH_RATIO;
        height = GAME_CONFIG.STREET.BUS_HEIGHT_RATIO;
        color = '#0284c7'; // Vibrant city transit blue
        label = 'DOWNTOWN RACCOONS';
      } else if (rand < 0.40) {
        type = 'taxi';
        width = GAME_CONFIG.STREET.CAR_WIDTH_RATIO * 1.05;
        height = GAME_CONFIG.STREET.CAR_HEIGHT_RATIO;
        color = '#eab308'; // Classic taxi yellow
        label = 'TAXI';
      } else if (rand < 0.58) {
        type = 'garbage_truck';
        width = GAME_CONFIG.STREET.VAN_WIDTH_RATIO * 1.35;
        height = GAME_CONFIG.STREET.VAN_HEIGHT_RATIO * 1.15;
        color = '#15803d'; // Sanitation green
        label = 'CITY SANITATION 🗑️';
      } else if (rand < 0.74) {
        type = 'delivery_van';
        width = GAME_CONFIG.STREET.VAN_WIDTH_RATIO;
        height = GAME_CONFIG.STREET.VAN_HEIGHT_RATIO;
        color = '#475569';
        label = 'ACORN EXPRESS';
      } else if (rand < 0.88) {
        type = 'sedan';
        width = GAME_CONFIG.STREET.CAR_WIDTH_RATIO;
        height = GAME_CONFIG.STREET.CAR_HEIGHT_RATIO;
        color = colors[Math.floor(Math.random() * colors.length)];
      } else {
        type = 'sports_car';
        width = GAME_CONFIG.STREET.CAR_WIDTH_RATIO * 0.95;
        height = GAME_CONFIG.STREET.CAR_HEIGHT_RATIO * 0.85;
        color = '#dc2626';
      }

      // 'near' lane drives right (+vx, lower on asphalt street)
      // 'far' lane drives left (-vx, higher on asphalt street)
      const lane: 'far' | 'near' = Math.random() > 0.5 ? 'near' : 'far';
      const direction = lane === 'near' ? 1 : -1;
      const baseSpeed = type === 'sports_car' ? 0.38 : (type === 'bus' || type === 'garbage_truck') ? 0.22 : 0.29;
      const vx = direction * (baseSpeed + Math.random() * 0.08);

      // Start position offscreen relative to camera view
      const spawnOffset = 1.35 + width * 0.6;
      const startX = direction === 1 ? camera.x - spawnOffset : camera.x + spawnOffset;

      this.state.streetVehicles.push({
        id: this.nextVehicleId++,
        type,
        x: startX,
        vx,
        lane,
        color,
        width,
        height,
        wheelRotation: 0,
        label,
      });

      // Occasional soft honk from a taxi or bus when passing near the building
      if ((type === 'taxi' || type === 'bus') && Math.random() < 0.40 && Math.abs(camera.x - 0.5) < 0.4) {
        sound.playCarHorn(0.04);
      }
    }

    // Update positions and wheel rotations
    for (const v of this.state.streetVehicles) {
      v.x += v.vx * dt;
      v.wheelRotation += v.vx * dt * 35;
    }

    // Filter vehicles that drove far offscreen
    this.state.streetVehicles = this.state.streetVehicles.filter(
      (v) => Math.abs(v.x - camera.x) < 2.5 + v.width
    );
  }

  public getState(): GameEngineState {
    return { ...this.state };
  }
}
