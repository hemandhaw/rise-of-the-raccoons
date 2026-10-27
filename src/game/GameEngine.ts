/**
 * Rise of the Raccoons! - Game Engine
 * Decoupled 60fps game simulation loop, physics, input smoothing, and floor tracking.
 */

import { sound } from './audio';
import { GAME_CONFIG, getTrashCanStartX } from './config';
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
        geeseFlocks: [],
        soaringBirds: [],
        balloons: [],
        lightning: null,
        mistClouds: [],
        lightningFlashAlpha: 0,
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
      currentFloor: 1,
      highestFloorReached: 1,
      bestFloor: this.bestFloor,
      bestScore: this.bestScore,
      altitudeMeters: 0,
      climbTimeSeconds: 0,
      totalFloors: GAME_CONFIG.SKYSCRAPER.TOTAL_FLOORS,
      isMuted: sound.isMuted(),
    };

    // Seed initial snacks on lower window sills
    this.seedInitialSnacks();
    this.seedInitialSquirrels();

    // Attach input listeners
    this.input.attach(canvas, {
      onPause: () => this.togglePause(),
      onAction: () => {
        if (this.state.screen === 'MAIN_MENU') {
          this.startGame();
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

  /**
   * Seeds an initial climbing squirrel above the starting position with enough space to react & avoid
   */
  private seedInitialSquirrels() {
    const startX = getTrashCanStartX();
    const floor1Halfway = GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO * 0.5; // 0.26
    this.state.atmosphere.squirrels = [
      {
        id: this.nextAtmosphereId++,
        x: startX,
        y: Math.max(0.36, floor1Halfway + 0.10), // Placed on brick wall well above floor 1 halfway point
        targetY: 0.44,
        vy: 0.06,
        facing: 'up',
        side: 'right',
        tailAngle: 0,
        climbPhase: 0,
        pauseTimer: 0.5,
        acorn: true,
      },
    ];
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
    this.state.camera.targetX = this.state.trashCan.x;
    this.state.camera.targetY = 0.08;
    this.seedInitialSquirrels();
    this.notifyState();
  }

  public resetGame() {
    sound.playGameStart();
    this.encounterDirector.reset();
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
      geeseFlocks: [],
      soaringBirds: [],
      balloons: [],
      lightning: null,
      mistClouds: [],
      lightningFlashAlpha: 0,
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
    if (this.state.screen === 'PLAYING' || this.state.screen === 'MAIN_MENU') {
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
    // Allow raccoon to crawl on the ground (sidewalk level) bounded by the side trash cans
    const groundSurfaceY = GAME_CONFIG.TRASH_CAN.GROUND_Y;
    const minY = groundSurfaceY;
    const maxY = (SKYSCRAPER.TOTAL_FLOORS - 1) * SKYSCRAPER.FLOOR_HEIGHT_RATIO + 0.48;

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

    if (this.state.screen === 'MAIN_MENU') {
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

        // If raccoon tumbled down to the ground (e.g. from floor 1 spook):
        // Safely land on the ground below and immediately continue playing!
        if (targetY <= groundSurfaceY + 0.02) {
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

    // Universal Input Handling with Smooth Priority:
    // Speed boost requires user input (two fingers / Shift / Space) and available energy
    const wantsBoost = Boolean(
      inputState.isSpeedBoosted ||
      inputState.keys.space ||
      inputState.keys.shift ||
      inputState.joystick.isBoosted
    );

    const isBoosted = wantsBoost && (this.state.raccoon.energy > 0);
    this.state.raccoon.isSpeedBoosted = isBoosted;
    const boostMult = isBoosted ? (RACCOON.BOOST_SPEED_MULTIPLIER || 1.65) : 1.0;

    // Adjusted Floor-Based Speed Rates:
    // Floors 1–5: 1.00 (100%), Floors 6–10: 0.90 (90%), Floors 11–15: 0.80 (80%),
    // Floors 16–20: 0.70 (70%), Floors 21–Roof: 0.50 (50%)
    const floorSpeedMult = this.getFloorSpeedMultiplier(this.state.currentFloor);

    // Natural ivy ladder speed boost (moves slightly faster in creeping ivy without losing extra energy)
    const ivyMult = this.state.raccoon.isOnIvy ? (GAME_CONFIG.ENERGY.IVY_SPEED_MULTIPLIER || 1.25) : 1.0;

    // Exhaustion penalty if energy is completely depleted
    const exhaustMult = this.state.raccoon.energy <= 0 ? (GAME_CONFIG.ENERGY.EXHAUSTION_SPEED_MULTIPLIER || 0.65) : 1.0;

    const netSpeedMult = boostMult * floorSpeedMult * ivyMult * exhaustMult;

    const climbSpeedUp = RACCOON.CLIMB_SPEED_UP * netSpeedMult;
    const climbSpeedDown = RACCOON.CLIMB_SPEED_DOWN * netSpeedMult;
    const moveSpeedX = RACCOON.MOVE_SPEED_X * netSpeedMult;
    const sillWalkSpeed = RACCOON.SILL_WALK_SPEED * netSpeedMult;
    const diagSpeed = RACCOON.CLIMB_SPEED_DIAGONAL * netSpeedMult;

    // 2. Universal Input Handling with Smooth Priority:
    // If keyboard is actively used or recently pressed, prioritize keyboard smoothly
    // to prevent any jitter from concurrent mouse dragging
    const isKeyboardActive = this.input.hasActiveKeyboardMove() || inputState.keyboardActiveTimer > 0;
    const hasKeyboard = this.input.hasActiveKeyboardMove();
    const hasJoystick = inputState.joystick.active && inputState.joystick.distance > 0.05;
    const hasDrag = !isKeyboardActive && inputState.isDragging && inputState.dragTarget !== null;

    let targetVx = 0;
    let targetVy = 0;
    let isScrambling = isBoosted;

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

    // 0. DIAGONAL SLIDE DESCENT (Floor 7 Window 1 to Floor 4 Window 4)
    if (this.state.raccoon.isSlidingDown) {
      this.state.raccoon.slideTimer = (this.state.raccoon.slideTimer || 0) + dt;
      const duration = this.state.raccoon.slideDuration || 0.95;
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
        this.state.raccoon.restingSillFloor = 4;
        this.state.raccoon.restingSillWindowIndex = 4;
        sound.playSillLand();
        this.spawnFloatingText('SLIDE TOUCHDOWN! 🛝✨', targetX, targetY + 0.04, '#10b981');
      }
      return;
    }

    // Check creeping ivy vines (Natural ladders: 1.25x speed boost without extra energy drain)
    let onIvy = false;
    const { BUILDING_CENTER_X, BUILDING_WIDTH_RATIO } = GAME_CONFIG.SKYSCRAPER;
    const { IVY_VINES, FIRE_ESCAPE, LOBBY_DOUBLE_DOORS, ELECTRIC_CABLES, CELL_TOWER_BTS, LAUNDRY_LINE, SLIDE_7_TO_4 } = GAME_CONFIG.INTERACTIVE_ELEMENTS;
    const bLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
    const bRight = BUILDING_CENTER_X + BUILDING_WIDTH_RATIO / 2;
    const winW = GAME_CONFIG.SKYSCRAPER.WINDOW_WIDTH_RATIO;
    const nWins = GAME_CONFIG.SKYSCRAPER.WINDOWS_PER_FLOOR;
    const totalWinW = nWins * winW;
    const gap = (BUILDING_WIDTH_RATIO - totalWinW) / (nWins + 1);

    for (const vine of IVY_VINES) {
      const vStartY = (vine.startFloor - 1) * SKYSCRAPER.FLOOR_HEIGHT_RATIO;
      const vEndY = vine.endFloor * SKYSCRAPER.FLOOR_HEIGHT_RATIO;
      const vineCenterX = vine.winGapIndex === 0
        ? bLeft + gap * 0.55
        : bLeft + gap + (winW + gap) * vine.winGapIndex + gap * 0.45;
      if (
        this.state.raccoon.y >= vStartY &&
        this.state.raccoon.y <= vEndY &&
        Math.abs(this.state.raccoon.x - vineCenterX) <= vine.width * 0.65
      ) {
        onIvy = true;
        break;
      }
    }
    this.state.raccoon.isOnIvy = onIvy;
    if (onIvy) {
      targetVx *= GAME_CONFIG.ENERGY.IVY_SPEED_MULTIPLIER;
      targetVy *= GAME_CONFIG.ENERGY.IVY_SPEED_MULTIPLIER;
      this.state.raccoon.vx *= GAME_CONFIG.ENERGY.IVY_SPEED_MULTIPLIER;
      this.state.raccoon.vy *= GAME_CONFIG.ENERGY.IVY_SPEED_MULTIPLIER;
    }

    // Check climbable fire escape ladder (Floors 3 through 18 - 0% energy drain!)
    let onFireEscape = false;
    const feMinY = (FIRE_ESCAPE.FLOORS[0] - 1) * SKYSCRAPER.FLOOR_HEIGHT_RATIO;
    const feMaxY = (FIRE_ESCAPE.FLOORS[FIRE_ESCAPE.FLOORS.length - 1]) * SKYSCRAPER.FLOOR_HEIGHT_RATIO + 0.12;
    const feLadderX = bRight - gap * 0.60;
    if (
      this.state.raccoon.y >= feMinY &&
      this.state.raccoon.y <= feMaxY &&
      Math.abs(this.state.raccoon.x - feLadderX) <= FIRE_ESCAPE.LADDER_WIDTH * 0.85
    ) {
      onFireEscape = true;
    }
    this.state.raccoon.isOnFireEscape = onFireEscape;

    // Check Diagonal Slide Trigger (Floor 7 Window 1 to Floor 6 Window 3)
    const floor7 = this.floors.find((f) => f.floorNumber === 7);
    const floor6 = this.floors.find((f) => f.floorNumber === 6);
    if (floor7 && floor6 && floor7.windows[1] && floor6.windows[3]) {
      const slideStartWin = floor7.windows[1];
      const slideEndWin = floor6.windows[3];
      const slideStartX = slideStartWin.worldRight - 0.015;
      const slideStartY = slideStartWin.sillY + 0.012;
      const slideTargetX = slideEndWin.worldLeft + 0.025;
      const slideTargetY = slideEndWin.sillY;

      if (
        !this.state.raccoon.isSlidingDown &&
        !this.state.raccoon.isTumbling &&
        Math.abs(this.state.raccoon.x - slideStartX) <= 0.038 &&
        Math.abs(this.state.raccoon.y - slideStartY) <= 0.045 &&
        (targetVx > 0.02 || targetVy < -0.02 || this.state.raccoon.vx > 0.02 || this.state.raccoon.vy < -0.02)
      ) {
        this.state.raccoon.isSlidingDown = true;
        this.state.raccoon.slideTimer = 0;
        this.state.raccoon.slideDuration = SLIDE_7_TO_4.DURATION;
        this.state.raccoon.slideStartX = this.state.raccoon.x;
        this.state.raccoon.slideStartY = this.state.raccoon.y;
        this.state.raccoon.slideTargetX = slideTargetX;
        this.state.raccoon.slideTargetY = slideTargetY;
        this.state.raccoon.isRestingOnSill = false;
        sound.playSlideDownWhoosh();
        this.spawnFloatingText('SWOOOSH! 🛝', this.state.raccoon.x, this.state.raccoon.y + 0.05, '#38bdf8');
        return;
      }
    }
    const prevX = this.state.raccoon.x;
    const prevY = this.state.raccoon.y;
    let nextX = prevX + this.state.raccoon.vx * dt;
    let nextY = prevY + this.state.raccoon.vy * dt;

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

    // Fire Escape Balconies (acting like window sills for resting and energy recharge)
    if (!landedOnSill) {
      const feBalconyW = FIRE_ESCAPE.BALCONY_WIDTH;
      const feBalconyX = bRight - gap * 0.60;
      for (const fNum of FIRE_ESCAPE.FLOORS) {
        const bFloor = this.floors.find((f) => f.floorNumber === fNum);
        if (!bFloor) continue;
        const bSillY = bFloor.windows[0] ? bFloor.windows[0].sillY : (fNum - 1) * SKYSCRAPER.FLOOR_HEIGHT_RATIO + 0.18;
        if (
          Math.abs(nextX - feBalconyX) <= feBalconyW * 0.55 &&
          prevY >= bSillY - 0.015 &&
          nextY <= bSillY + 0.035 &&
          (targetVy <= 0 || this.state.raccoon.vy <= 0)
        ) {
          nextY = bSillY;
          this.state.raccoon.y = bSillY;
          this.state.raccoon.vy = 0;
          landedOnSill = true;
          this.state.raccoon.isRestingOnSill = true;
          this.state.raccoon.restingSillFloor = fNum;
          this.state.raccoon.restingSillWindowIndex = 5;
          sound.playMetalStep();
          break;
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
        for (let s = 0; s < 14; s++) {
          this.state.electricSparks.push({
            id: Math.random(),
            x: this.state.raccoon.x,
            y: this.state.raccoon.y,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            color: Math.random() < 0.5 ? '#facc15' : '#67e8f9',
            age: 0,
            maxAge: 0.45,
          });
        }
        this.state.raccoon.isElectrified = true;
        this.state.raccoon.electrifiedTimer = 0.65;
        this.state.camera.shake = 18;
        this.state.raccoon.isTumbling = true;
        this.state.raccoon.tumbleTimer = 0;
        this.state.raccoon.tumbleTargetY = groundSurfaceY + 0.015;
        this.state.raccoon.isRestingOnSill = false;
        this.state.raccoon.energy = Math.max(0, this.state.raccoon.energy - 15);
        this.state.spookInvulnerabilityTimer = 2.5;
        this.spawnFloatingText('⚡ ZZZZZT! SHOCKED! ⚡', this.state.raccoon.x, this.state.raccoon.y + 0.05, '#facc15');
      }
    }

    // Level 7 Laundry Clothesline: Each clothing item is treated separately - only the touched item falls!
    const f7 = this.floors.find((f) => f.floorNumber === 7);
    if (f7 && f7.windows[2] && f7.windows[4] && this.state.laundryLine) {
      const lineLeftX = f7.windows[2].worldLeft;
      const lineRightX = f7.windows[4].worldRight;
      const lineY = f7.windows[2].sillY;

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
          const hitRadius = (bird.type === 'hawk' ? 0.065 : 0.045) * (bird.scale / 1.8);
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
          const hitRadius = 0.038 * (gooseScale / 1.8);
          let flockHit = false;

          for (let i = 0; i < nGeese; i++) {
            const side = i % 2 === 0 ? 1 : -1;
            const rank = Math.floor((i + 1) / 2);
            const gx = flock.x - flock.direction * rank * 0.045;
            const gy = flock.y + side * rank * 0.032;

            if (Math.hypot(racX - gx, racY - gy) < hitRadius + racW * 0.45) {
              this.triggerBirdContact('goose', gx, gy);
              flockHit = true;
              break;
            }
          }
          if (flockHit) break;
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
      } else if (this.state.raccoon.isOnFireEscape) {
        // Connected climbable fire escape ladder: 0% energy loss!
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
        } else if (isBoosted && !this.state.raccoon.isOnIvy) {
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

      // If energy reaches 0%, game ends immediately
      if (this.state.raccoon.energy <= 0) {
        this.state.raccoon.energy = 0;
        this.state.screen = 'GAME_OVER';
        this.state.raccoon.vx = 0;
        this.state.raccoon.vy = 0;
        this.state.raccoon.isClimbing = false;
        sound.playGameOver();
        this.notifyState();
        return;
      }
    }

    // Slice 3: Snacks & Spooks simulation update
    if (this.state.screen === 'PLAYING') {
      this.updateSlice3SnacksAndSpooks(dt, timeSeconds);
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

    // Check Rooftop Arrival Victory Condition (roof acts like a window sill)
    if (
      currentFloor === SKYSCRAPER.TOTAL_FLOORS &&
      this.state.raccoon.y >= (SKYSCRAPER.TOTAL_FLOORS - 1) * SKYSCRAPER.FLOOR_HEIGHT_RATIO + 0.12
    ) {
      this.state.raccoon.isRestingOnSill = true;
      this.state.raccoon.restingSillFloor = SKYSCRAPER.TOTAL_FLOORS;
      this.state.raccoon.restingSillWindowIndex = null;
      this.state.raccoon.facing = this.state.raccoon.lastSideFacing || 'right';
      this.state.raccoon.vx = 0;
      this.state.raccoon.vy = 0;
      if (this.state.screen === 'PLAYING') {
        this.state.screen = 'VICTORY';
        sound.playRoofVictory();
        this.notifyState();
      }
    }
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
    const availableWindows = floor.windows.filter(
      (w) => !this.state.snacks.some((s) => s.floorNumber === floor.floorNumber && s.windowIndex === w.index)
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

    // Spawn a delicious snack right on the ledge beside the raccoon
    const snackOptions = [
      { id: 'snack_donut', name: 'Fresh Glazed Donut', energy: 30, icon: '🍩' },
      { id: 'snack_pizza_ledge', name: 'Hot Pizza Slice', energy: 35, icon: '🍕' },
      { id: 'snack_cookie', name: 'Chocolate Chip Cookie', energy: 25, icon: '🍪' },
      { id: 'snack_sandwich', name: 'Tasty Club Sandwich', energy: 30, icon: '🥪' },
      { id: 'snack_bagel', name: 'Toasted Bagel', energy: 25, icon: '🥯' },
      { id: 'snack_handed_snack', name: 'Warm Pretzel Snack', energy: 30, icon: '🥨' },
    ];
    const chosen = snackOptions[Math.floor(Math.random() * snackOptions.length)];

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
      energyEffect: chosen.energy,
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
      `"HERE YOU GO, LITTLE FRIEND!" ${chosen.icon}✨`,
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
    const skinTones = ['#ffd1b3', '#fcd5b8', '#dca182', '#a06e52', '#6b442a', '#442b1a'];
    const hairColors = ['#1c1917', '#451a03', '#92400e', '#d97706', '#9ca3af', '#facc15', '#b91c1c'];
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
    const shirtColors = [
      '#ef4444',
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#8b5cf6',
      '#ec4899',
      '#14b8a6',
      '#64748b',
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
    sound.playTumbleSlideWhistle();
    this.state.camera.shake = 0.45;
    this.state.spookInvulnerabilityTimer = GAME_CONFIG.SPOOKS.INVULNERABILITY_DURATION;

    const groundSurfaceY = GAME_CONFIG.TRASH_CAN.GROUND_Y; // 0.0
    let targetY: number;
    let floorsDown = 1;

    if (this.state.currentFloor <= 1) {
      targetY = groundSurfaceY;
      floorsDown = 1;
    } else {
      const targetFloor = Math.max(0, this.state.currentFloor - 1);
      if (targetFloor <= 0) {
        targetY = groundSurfaceY;
      } else {
        targetY = (targetFloor - 1) * GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO + 0.055;
      }
    }

    this.state.raccoon.isTumbling = true;
    this.state.raccoon.tumbleTimer = 0;
    this.state.raccoon.tumbleTargetY = targetY;
    this.state.raccoon.isRestingOnSill = false;
    this.state.raccoon.restingSillFloor = null;
    this.state.raccoon.restingSillWindowIndex = null;

    this.spawnFloatingText('SQUIRREL SLIP! 🐿️', this.state.raccoon.x, this.state.raccoon.y + 0.05, '#f59e0b');
    this.showSpookToast(
      'angry_cat',
      floorsDown,
      undefined,
      'SQUIRREL SLIP! 🐿️',
      'Bumped into a scurrying brick squirrel! Slipped downward!',
      '🐿️'
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
    const { FLOOR_SPEED_RATES } = GAME_CONFIG.RACCOON;
    if (floorNumber <= 5) return FLOOR_SPEED_RATES.FLOORS_1_5;
    if (floorNumber <= 10) return FLOOR_SPEED_RATES.FLOORS_6_10;
    if (floorNumber <= 15) return FLOOR_SPEED_RATES.FLOORS_11_15;
    if (floorNumber <= 20) return FLOOR_SPEED_RATES.FLOORS_16_20;
    return FLOOR_SPEED_RATES.FLOORS_21_ROOF;
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
    if (this.state.spooks.length >= GAME_CONFIG.SPOOKS.MAX_ACTIVE_BUILDING_SPOOKS) return;

    // RULE 4: PACING - Occasional quiet climbing moment breathing room
    if (Math.random() < 0.22) {
      return;
    }

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
        // Protect window nearest starting trash can on floor 1 from fall hazards
        !(floor!.floorNumber === 1 && w.index === startingCanWinIndex && enc.canCauseFall)
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
    // 1. Spawning timers
    this.snackSpawnTimer -= dt;
    if (this.snackSpawnTimer <= 0) {
      this.snackSpawnTimer = GAME_CONFIG.SNACKS.SPAWN_INTERVAL + Math.random() * 2.0;
      this.spawnRandomSnack();
    }

    this.spookSpawnTimer -= dt;
    if (this.spookSpawnTimer <= 0) {
      this.spookSpawnTimer = GAME_CONFIG.SPOOKS.SPAWN_INTERVAL + Math.random() * 1.5;
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
        // Instantly restore energy based on encounter definition or fallback
        const recovery = snack.energyEffect ?? GAME_CONFIG.ENERGY.SNACK_RECOVERY;
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

          const encId = spook.encounterId || '';
          const isFlashSpook =
            spook.visibilityEffect === 'camera_flash' ||
            encId.includes('flash') ||
            encId.includes('camera') ||
            encId === 'spook_flash_photography' ||
            spook.type === 'photo_flash';
          const causesFall = spook.canCauseFall === true || (isFlashSpook && spook.floorNumber >= 10);
          const energyEffect = spook.energyEffect ?? (spook.valence === 'negative' ? -10 : 0);
          const movementEffect = causesFall ? 'fall' : (isFlashSpook && spook.floorNumber >= 10 ? 'drop_one_floor' : (spook.movementEffect || 'none'));

          if (causesFall) {
            // Full tumble fall hazard
            let targetY: number;
            let floorsDown = 1;
            const groundSurfaceY = GAME_CONFIG.TRASH_CAN.GROUND_Y; // 0.0

            if (spook.floorNumber === 1) {
              targetY = groundSurfaceY;
              floorsDown = 1;
            } else {
              floorsDown = Math.random() < 0.65 ? 1 : 2;
              const targetFloor = Math.max(0, this.state.currentFloor - floorsDown);
              if (targetFloor <= 0) {
                targetY = groundSurfaceY;
              } else {
                targetY = (targetFloor - 1) * GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO + 0.055;
              }
            }

            // Trigger physical tumble
            this.state.raccoon.isTumbling = true;
            this.state.raccoon.tumbleTimer = 0;
            this.state.raccoon.tumbleTargetY = targetY;
            this.state.raccoon.isRestingOnSill = false;
            this.state.raccoon.restingSillFloor = null;
            this.state.raccoon.restingSillWindowIndex = null;

            sound.playTumbleSlideWhistle();
            this.state.camera.shake = 0.45;
            this.state.spookInvulnerabilityTimer = GAME_CONFIG.SPOOKS.INVULNERABILITY_DURATION;

            this.showSpookToast(spook.type, floorsDown, spook.personVariant);
            this.spawnFloatingText(
              spook.floorNumber === 1 ? 'GROUND TUMBLE! 🙀' : `-${floorsDown} FL! WHOA! 🙀`,
              racX,
              racY + 0.05,
              '#f43f5e'
            );

            if (energyEffect < 0) {
              this.state.raccoon.energy = Math.max(0, this.state.raccoon.energy + energyEffect);
            }
          } else if (movementEffect === 'drop_one_floor' || movementEffect === 'drop_half_floor') {
            // Drop down half floor or one floor (does not knock completely off building)
            const groundSurfaceY = GAME_CONFIG.TRASH_CAN.GROUND_Y;
            let targetY: number;
            const floorsDown = movementEffect === 'drop_half_floor' ? 0.5 : 1;

            if (spook.floorNumber === 1) {
              targetY = groundSurfaceY;
            } else {
              const targetFloor = Math.max(0, this.state.currentFloor - floorsDown);
              if (targetFloor <= 0) {
                targetY = groundSurfaceY;
              } else {
                targetY = (targetFloor - 1) * GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO + 0.055;
              }
            }

            this.state.raccoon.isTumbling = true;
            this.state.raccoon.tumbleTimer = 0;
            this.state.raccoon.tumbleTargetY = targetY;
            this.state.raccoon.isRestingOnSill = false;
            this.state.raccoon.restingSillFloor = null;
            this.state.raccoon.restingSillWindowIndex = null;

            sound.playTumbleSlideWhistle();
            this.state.camera.shake = 0.35;
            this.state.spookInvulnerabilityTimer = GAME_CONFIG.SPOOKS.INVULNERABILITY_DURATION;

            this.showSpookToast(spook.type, Math.ceil(floorsDown), spook.personVariant);
            this.spawnFloatingText(
              `-${floorsDown} FL! 🙀`,
              racX,
              racY + 0.05,
              '#f43f5e'
            );

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

      // SQUIRRELS: Scurry strictly on brick mullions across building face (cannot climb window glass) on lower-to-mid floors (Floors 1 to 10)
      if (currentFloor <= 10 && atmo.squirrels.length < (currentFloor <= 5 ? 3 : 2)) {
        const mullions = this.getBrickMullionLanes();
        const x = mullions[Math.floor(Math.random() * mullions.length)];
        const side = x < bCenter ? 'left' : 'right';
        const startCanX = getTrashCanStartX();
        const floor1HalfwayY = GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO * 0.5; // 0.26
        const isNearStartCan = Math.abs(x - startCanX) < 0.08;
        const minSpawnY = isNearStartCan ? floor1HalfwayY : 0.08;
        const baseY = Math.max(minSpawnY, camera.y + (Math.random() - 0.3) * 0.35);
        const targetY = Math.max(minSpawnY, baseY + (Math.random() - 0.45) * 0.4);

        atmo.squirrels.push({
          id: this.nextAtmosphereId++,
          x,
          y: baseY,
          targetY,
          vy: 0.12 + Math.random() * 0.05,
          facing: targetY >= baseY ? 'up' : 'down',
          side,
          tailAngle: 0,
          climbPhase: Math.random(),
          pauseTimer: Math.random() * 0.8,
          acorn: Math.random() < 0.4,
        });
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

      // HOT AIR BALLOON: Large majestic striped balloon in foreground (Floors 16 to 22)
      // Strictly adheres to Master Content Bible: sky_hot_air_balloon (Floors 16 to 22)
      if (currentFloor >= 16 && currentFloor <= 22 && atmo.balloons.length < 1) {
        if (Math.random() < 0.65) {
          const direction = Math.random() > 0.5 ? 1 : -1;
          const startX = direction === 1 ? camera.x - 1.05 : camera.x + 1.05;
          const startY = camera.y + 0.08 + (Math.random() - 0.25) * 0.35;
          const patterns: HotAirBalloon['colorPattern'][] = ['rainbow', 'sunset', 'ocean', 'candy'];
          atmo.balloons.push({
            id: this.nextAtmosphereId++,
            x: startX,
            y: startY,
            vx: direction * (0.034 + Math.random() * 0.018),
            scale: 1.9 + Math.random() * 0.5, // Large, opaque, foreground balloon
            colorPattern: patterns[Math.floor(Math.random() * patterns.length)],
            bobblePhase: Math.random() * Math.PI * 2,
            isForeground: true,
          });
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

    // 2. LIGHTNING: Active in upper storm layer (Floors 16 to 25), peaking in frequency at the summit
    if (currentFloor >= 16) {
      this.nextLightningTimer -= dt;
      // Frequency ramps up: Floor 16 is ~14s, Floor 25 is ~4.5s
      const floorProgress = (currentFloor - 16) / 9; // 0.0 to 1.0
      const strikeInterval = 14.0 - floorProgress * 9.5; // 14s down to 4.5s

      if (this.nextLightningTimer <= 0) {
        this.nextLightningTimer = strikeInterval + (Math.random() - 0.5) * 2.0;
        this.triggerLightning(camera.x, camera.y);
      }
    }

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

    // 3. Update Entities
    // Squirrels
    const startCanX = getTrashCanStartX();
    const floor1HalfwayY = GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO * 0.5; // 0.26
    for (const sq of atmo.squirrels) {
      // The squirrel above the trash can where the raccoon begins cannot go lower than vertical halfway point of floor 1
      const isStartSquirrel = Math.abs(sq.x - startCanX) < 0.08;
      const minY = isStartSquirrel ? floor1HalfwayY : 0.08;

      if (sq.pauseTimer > 0) {
        sq.pauseTimer -= dt;
        sq.tailAngle = Math.sin(timeSeconds * 14 + sq.id) * 0.45;
      } else {
        const distToTarget = sq.targetY - sq.y;
        if (Math.abs(distToTarget) < 0.015) {
          sq.pauseTimer = 0.8 + Math.random() * 1.6;
          // Pick new target on building (strictly above minY)
          sq.targetY = Math.max(minY, Math.min(0.65, sq.y + (Math.random() - 0.5) * 0.35));
          sq.facing = sq.targetY >= sq.y ? 'up' : 'down';
        } else {
          const moveDir = Math.sign(distToTarget);
          sq.y += moveDir * sq.vy * dt;
          if (sq.y < minY) {
            sq.y = minY;
            sq.targetY = Math.max(minY + 0.08, sq.targetY);
            sq.pauseTimer = 0.4;
          }
          sq.facing = moveDir > 0 ? 'up' : 'down';
          sq.climbPhase = (sq.climbPhase + dt * 9.5) % 1.0;
          sq.tailAngle = Math.sin(timeSeconds * 8 + sq.id) * 0.3;
        }
      }
      if (sq.y < minY) {
        sq.y = minY;
      }
    }
    atmo.squirrels = atmo.squirrels.filter((sq) => Math.abs(sq.y - camera.y) < 1.3 && currentFloor <= 12);

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

    // Hot Air Balloons (Strictly Floors 16 to 22)
    if (currentFloor < 16 || currentFloor > 22) {
      atmo.balloons = [];
    } else {
      for (const b of atmo.balloons) {
        b.x += b.vx * dt;
        b.bobblePhase += dt * 0.8;
      }
      atmo.balloons = atmo.balloons.filter(
        (b) => Math.abs(b.x - camera.x) < 1.8 && currentFloor >= 16 && currentFloor <= 22
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
      if (c.x > camera.x + 1.5) {
        c.x = camera.x - 1.5;
        c.y = camera.y + (Math.random() - 0.3) * 0.6;
      }
    }
    atmo.mistClouds = atmo.mistClouds.filter((c) => Math.abs(c.y - camera.y) < 1.4 && currentFloor >= 9);
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
      const startX = direction === 1 ? camera.x - 1.25 : camera.x + 1.25;

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
      (v) => Math.abs(v.x - camera.x) < 2.0
    );
  }

  public getState(): GameEngineState {
    return { ...this.state };
  }
}
