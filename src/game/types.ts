/**
 * Rise of the Raccoons! - Types & Interfaces
 */

export type GameScreen = 'MAIN_MENU' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAME_OVER';

export interface RaccoonPosition {
  x: number; // Proportional horizontal position (0.0 to 1.0)
  y: number; // Proportional vertical position within world (0.0 to totalWorldHeight)
  vx: number; // Horizontal velocity
  vy: number; // Vertical velocity
  targetX?: number; // Target x from dragging
  targetY?: number; // Target y from dragging
  facing: 'left' | 'right' | 'up' | 'down';
  lastSideFacing: 'left' | 'right';
  climbPhase: number; // 0.0 to 1.0 animation cycle for paws
  tailAngle: number; // Radians for tail sway physics
  isClimbing: boolean;
  isScrambling: boolean;
  isKeyboardControlled: boolean;
  isRestingOnSill: boolean;
  restingSillFloor: number | null;
  restingSillWindowIndex?: number | null;
  climbGaitMode: 'vertical' | 'horizontal' | 'diagonal'; // Preserved climbing gait style
  diagonalDirection: { x: 1 | -1; y: 1 | -1 }; // Direction when climbing diagonally
  lastHeadingDirection: 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right'; // Preserved 8-way climbing heading direction
  lastVerticalDirection: 1 | -1; // 1 for upward, -1 for downward (used for realistic grip completion)
  slipEffectTimer: number;
  squashFactor: number; // Stretch/squash when climbing or stopping
  isInTrashCan: boolean; // Starts inside the alley trash can
  containerType?: 'left_can' | 'dumpster' | 'right_can' | null; // Which receptacle raccoon is inside
  climbOutOfCanTimer: number; // Animation timer when climbing out of the trash can
  isSpeedBoosted?: boolean; // Speed boost active (double-tap / two fingers / shift)
  isTumbling?: boolean; // Physical setback tumbling down floors
  tumbleTimer?: number;
  tumbleTargetY?: number;
  energy: number; // Slither.io style sprint energy (0 to 100)
  isSlidingDown?: boolean; // Currently sliding down the diagonal slide (floor 7 to 4)
  slideTimer?: number;
  slideDuration?: number;
  slideStartX?: number;
  slideStartY?: number;
  slideTargetX?: number;
  slideTargetY?: number;
  isOnFireEscape?: boolean; // On fire escape ladder (zero energy loss!)
  isOnIvy?: boolean; // On creeping ivy/grapevine (1.25x speed boost without extra energy drain)
  isElectrified?: boolean; // Shocked by telephone cables
  electrifiedTimer?: number;
  pawPositions: {
    frontLeft: { x: number; y: number };
    frontRight: { x: number; y: number };
    backLeft: { x: number; y: number };
    backRight: { x: number; y: number };
  };
}

export interface InputState {
  keys: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    shift: boolean;
    space: boolean;
  };
  isDragging: boolean;
  dragTarget: {
    x: number;
    y: number;
  } | null;
  joystick: {
    active: boolean;
    x: number; // -1.0 to 1.0 (left to right)
    y: number; // -1.0 to 1.0 (down to up)
    distance: number; // 0.0 to 1.0 magnitude
    isBoosted?: boolean;
    isHoldingInPlace?: boolean;
  };
  isSpeedBoosted?: boolean;
  lastInputSource: 'keyboard' | 'drag' | 'joystick' | 'none';
  keyboardActiveTimer: number; // Seconds since last keyboard press to smoothly prioritize
}

export type CurtainStyle = 'none' | 'closed' | 'partially_open' | 'fully_open';

export interface WindowDecoration {
  index: number;
  type: 'plant' | 'curtains' | 'blinds' | 'cat' | 'none';
  hasACUnit: boolean;
  lit: boolean;
  color: string;
  curtainStyle: CurtainStyle;
  curtainColor: string;
  sashOpenRatio: number; // 0.0 (closed) to 0.70 (slid upward)
  // World space bounding coordinates
  worldLeft: number;
  worldRight: number;
  worldBottom: number; // Bottom of glass
  worldTop: number;    // Top of glass
  sillY: number;       // Top of resting sill
  sillLeft: number;
  sillRight: number;
}

export interface FloorData {
  floorNumber: number; // 1 to 25
  worldY: number; // Base world Y coordinate
  height: number; // World height of floor
  theme: 'ground_lobby' | 'office' | 'residential' | 'penthouse' | 'rooftop';
  windows: WindowDecoration[];
  hasBalcony: boolean;
  balconySide: 'left' | 'right' | 'center';
  neonSignText?: string;
  neonColor?: string;
}

export interface CameraState {
  x: number; // World horizontal offset of camera center
  y: number; // World vertical offset of camera center
  targetX: number;
  targetY: number;
  shake: number;
}

export interface TrashParticle {
  id: number;
  type: 'banana' | 'fishbone' | 'can' | 'apple_core' | 'paper' | 'pizza' | 'bottle';
  x: number; // World X coordinate
  y: number; // World Y coordinate
  vx: number; // Horizontal velocity
  vy: number; // Vertical velocity
  rotation: number;
  vRot: number;
  scale: number;
  groundY: number;
  bounces: number;
  landed: boolean;
}

export interface TrashCanState {
  x: number;
  y: number;
  width: number;
  height: number;
  lidAngle: number;
  lidRattleTimer: number;
}

export type SnackType = string;

export interface SnackItem {
  id: number;
  type: string;
  encounterId?: string;
  name?: string;
  energyEffect: number; // Energy restored from content bible (+5 to +75)
  rarity?: string;
  movementEffect?: string;
  floorNumber: number;
  windowIndex: number;
  x: number; // World X coordinate (centered on sill)
  y: number; // World Y coordinate (resting directly atop sillY)
  sillY: number;
  sillLeft: number;
  sillRight: number;
  lifetime: number; // Disappear at different random rates
  age: number; // Elapsed active time in seconds
  bobblePhase: number;
  isExpiring: boolean; // True when less than 3s remain (flash/bobble faster)
  collected: boolean;
}

export interface PersonVariant {
  skinTone: string;
  hairColor: string;
  hairStyle: 'short' | 'curly' | 'bald' | 'bun' | 'afro' | 'bob' | 'ponytail';
  age: 'kid' | 'teen' | 'adult' | 'elder';
  gender: 'female' | 'male' | 'androgynous';
  accessory: 'glasses' | 'phone' | 'coffee' | 'pointing' | 'curlers' | 'none';
  shirtColor: string;
}

export type SpookType = string;

export interface SpookToast {
  id: number;
  icon: string;
  title: string;
  message: string;
  floorsDown: number;
  age: number;
  lifetime: number;
  color: string;
}

export interface SpookEvent {
  id: number;
  type: SpookType;
  encounterId?: string;
  category?: string;
  name?: string;
  floorNumber: number;
  windowIndex: number;
  x: number; // Center of window
  y: number;
  sillY: number;
  state: 'warning' | 'active' | 'retreating';
  timer: number;
  maxTimer: number;
  totalDuration: number;
  personVariant?: PersonVariant;
  sashCurrent: number; // 0.0 to 0.70 animated
  sashTarget: number;
  soundPlayed?: boolean;
  hasAdverselyAffected?: boolean;
  canCauseFall?: boolean;
  energyEffect?: number;
  movementEffect?: string;
  visibilityEffect?: string;
  humorLevel?: number;
  valence?: 'positive' | 'neutral' | 'negative';
  signText?: string;
}

export interface FloatingTextEffect {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  age: number;
  lifetime: number;
  scale: number;
}

export interface SnackParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  age: number;
  lifetime: number;
  shape: 'crumb' | 'sparkle' | 'ring';
}

export interface ClimbingSquirrel {
  id: number;
  x: number; // World X coordinate
  y: number; // World Y coordinate
  targetY: number;
  vy: number;
  facing: 'up' | 'down';
  side: 'left' | 'right';
  tailAngle: number;
  climbPhase: number;
  pauseTimer: number;
  acorn: boolean;
}

export interface GeeseFlock {
  id: number;
  x: number; // Lead goose world X
  y: number; // Lead goose world Y
  vx: number;
  vy: number;
  direction: 1 | -1;
  count: number; // 5 to 9 geese in V-formation
  scale: number;
  flapPhase: number;
  honkTimer: number;
  isForeground: boolean;
}

export interface SoaringBird {
  id: number;
  type: 'hawk' | 'pigeon' | 'swallow';
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  flapPhase: number;
  isForeground: boolean;
}

export interface HotAirBalloon {
  id: number;
  x: number;
  y: number;
  vx: number;
  scale: number;
  colorPattern: 'rainbow' | 'sunset' | 'ocean' | 'candy';
  bobblePhase: number;
  isForeground: boolean;
}

export interface LightningStrike {
  id: number;
  x: number;
  y: number;
  branches: { x1: number; y1: number; x2: number; y2: number }[];
  timer: number;
  maxTimer: number;
  intensity: number;
}

export interface HighMistCloud {
  id: number;
  x: number;
  y: number;
  vx: number;
  width: number;
  height: number;
  opacity: number;
  isForeground: boolean;
}

export interface AtmosphereState {
  squirrels: ClimbingSquirrel[];
  geeseFlocks: GeeseFlock[];
  soaringBirds: SoaringBird[];
  balloons: HotAirBalloon[];
  lightning: LightningStrike | null;
  mistClouds: HighMistCloud[];
  lightningFlashAlpha: number;
}

export type VehicleType = 'bus' | 'taxi' | 'sedan' | 'delivery_van' | 'sports_car' | 'garbage_truck';

export interface StreetVehicle {
  id: number;
  type: VehicleType;
  x: number; // World X coordinate
  vx: number; // World speed (positive = moving right in near lane, negative = moving left in far lane)
  lane: 'far' | 'near'; // Far lane = higher on street, Near lane = lower on street
  color: string;
  width: number;
  height: number;
  wheelRotation: number;
  label?: string;
}

export interface FallingLaundryItem {
  id: number;
  type: 'shirt' | 'pants' | 'socks' | 'sheet';
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  color: string;
  landed: boolean;
  groundY: number;
  age: number;
}

export interface LaundryLineState {
  hasDropped: boolean;
  clothes: { id: number; offsetRatio: number; type: 'shirt' | 'pants' | 'socks' | 'sheet'; color: string; dropped: boolean }[];
  fallingItems: FallingLaundryItem[];
}

export interface ElectricSpark {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  age: number;
  maxAge: number;
}

export interface GameEngineState {
  screen: GameScreen;
  raccoon: RaccoonPosition;
  camera: CameraState;
  trashCan: TrashCanState;
  leftTrashCan: TrashCanState;
  rightTrashCan: TrashCanState;
  dumpster: { x: number; y: number; width: number; height: number; lidRattleTimer: number };
  trashParticles: TrashParticle[];
  snacks: SnackItem[];
  spooks: SpookEvent[];
  floatingTexts: FloatingTextEffect[];
  snackParticles: SnackParticle[];
  spookInvulnerabilityTimer: number;
  activeToast: SpookToast | null;
  atmosphere: AtmosphereState;
  streetVehicles: StreetVehicle[];
  laundryLine: LaundryLineState;
  electricSparks: ElectricSpark[];
  currentFloor: number;
  highestFloorReached: number;
  bestFloor: number;
  bestScore: number;
  altitudeMeters: number;
  climbTimeSeconds: number;
  totalFloors: number;
  isMuted: boolean;
}
