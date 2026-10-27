/**
 * Rise of the Raccoons! - Central Configuration
 * All visual styles, colors, dimensions, and physics are isolated here
 * for easy modification and tuning.
 */

export const GAME_CONFIG = {
  // Canvas & Display
  ASPECT_RATIO: 9 / 16, // Vertical arcade aspect ratio
  VIRTUAL_WIDTH: 450,
  VIRTUAL_HEIGHT: 800,

  // Skyscraper Architecture
  SKYSCRAPER: {
    TOTAL_FLOORS: 25,
    FLOOR_HEIGHT_RATIO: 0.52, // Height of one floor relative to canvas height
    BUILDING_WIDTH_RATIO: 2.25, // Building is wider than screen (~2.25x viewport), entire width not visible at once
    BUILDING_CENTER_X: 0.5,
    GROUND_HEIGHT_RATIO: 0.28, // Ground level height
    ROOFTOP_HEIGHT_RATIO: 0.65, // Roof deck & water tower height
    
    // Windows per floor: 6 windows across with wide spacious brick climbing lanes between them
    WINDOWS_PER_FLOOR: 6,
    WINDOW_WIDTH_RATIO: 0.14, // Neat, crisp window dimensions
    WINDOW_HEIGHT_RATIO: 0.22,
    WINDOW_TOP_OFFSET_RATIO: 0.14, // Distance from floor ceiling to window top
    WINDOW_ROUNDING: 6,
    
    // Window Sill Architecture
    SILL_HEIGHT_RATIO: 0.024,
    SILL_OVERHANG_RATIO: 0.015, // Extends beyond window edges
    
    // Architectural Details
    CORNICE_HEIGHT_RATIO: 0.035,
    LEDGE_DEPTH_RATIO: 0.015,
    BALCONY_FREQUENCY: 0, // Unobstructed windows across all floors
    AC_UNIT_FREQUENCY: 0, // All window sills are completely clear and identically accessible
    FIRE_ESCAPE_SIDE: 'right' as const, // Fire escape side
  },

  // Raccoon Character Proportions & Physics
  RACCOON: {
    WIDTH_RATIO: 0.078, // Proportional width matching sill and trash can scale
    HEIGHT_RATIO: 0.096, // Proportional height matching sill and trash can scale
    COLLISION_RADIUS_X: 0.024, // Narrow collision box allows smooth climbing through lanes
    COLLISION_RADIUS_Y: 0.030, // Vertical collision box half-height
    
    // Movement Physics: Vertical speed is 0.18; horizontal movement speed strictly matches vertical speed (0.18)
    CLIMB_SPEED_UP: 0.18, // Vertical climb "up" speed (screens per second)
    CLIMB_SPEED_Y: 0.18, // General vertical reference
    CLIMB_SPEED_DOWN: 0.18, // Vertical climb "down" speed (matched to vertical speed 0.18)
    MOVE_SPEED_X: 0.18, // Horizontal move speed (matched to vertical speed 0.18)
    CLIMB_SPEED_DIAGONAL: 0.18, // Diagonal climb speed (matched to horizontal and vertical speed 0.18)
    FAST_CLIMB_MULTIPLIER: 1.0, // Fixed single speed across all inputs
    BOOST_SPEED_MULTIPLIER: 1.65, // Slither.io style speed boost (double-tap, two fingers, or shift)
    
    // Adjusted Floor-Based Speed Rates:
    // Floors 1–5: 1.00 (100%)
    // Floors 6–10: 0.90 (90%)
    // Floors 11–15: 0.80 (80%)
    // Floors 16–20: 0.70 (70%)
    // Floors 21–Roof: 0.50 (50%)
    FLOOR_SPEED_RATES: {
      FLOORS_1_5: 1.00,
      FLOORS_6_10: 0.90,
      FLOORS_11_15: 0.80,
      FLOORS_16_20: 0.70,
      FLOORS_21_ROOF: 0.50,
    },
    ACCELERATION: 12.0,
    DECELERATION: 12.0,
    DRAG_FOLLOW_LERP: 8.0, // Smooth interpolation toward drag pointer
    KEYBOARD_PRIORITY_SMOOTHING: 0.85, // Smooth weight when keyboard is active
    
    // Window Frame & Glass Obstacle Collision Clearance (prevent body and paws from overlapping window frame or glass while climbing)
    WINDOW_FRAME_THICKNESS_X: 0.008, // Visual outer thickness of window frame
    WINDOW_FRAME_THICKNESS_Y: 0.008,
    GLASS_CLEARANCE_X: 0.064, // Clearance preventing body/paws from overlapping window frame or glass horizontally
    GLASS_CLEARANCE_Y: 0.064, // Clearance preventing body/paws from overlapping window frame or glass vertically
    SILL_MIDDLE_REST_RATIO: 0.95, // Middle 95% of sill allows resting; either end nudges raccoon outward onto wall
    
    // Resting on sill physics & side profile
    SILL_SNAP_DISTANCE_Y: 0.072, // Allowable vertical distance strictly above the window sill at the glass area (decreased slightly from 0.090 to 0.072), not below it
    SILL_SNAP_DISTANCE_X: 0.024, // Horizontal tolerance extending sill reach
    SILL_WALK_SPEED: 0.18, // Speed when walking along sill (matched to horizontal/vertical speed 0.18)
    SIDE_PROFILE_WIDTH_RATIO: 0.134, // Side profile length
    SIDE_PROFILE_HEIGHT_RATIO: 0.100, // Side profile height
    
    // Animation timings & Grounded Climbing Kinematics
    // Leg cycle distance matches physical vertical/horizontal/diagonal translation
    VERTICAL_CYCLE_DISTANCE: 0.0768, // 0.80 of HEIGHT_RATIO (0.096 * 0.80) - distance traveled per 2-step cycle
    HORIZONTAL_CYCLE_DISTANCE: 0.0768, // Cadence matches physical horizontal speed 1:1 with vertical stride
    DIAGONAL_CYCLE_DISTANCE: 0.1086, // Cadence matches physical diagonal speed 1:1 (0.0768 * sqrt(2))
    SILL_CYCLE_DISTANCE: 0.0768, // Distance per cycle when walking along window sill
    PAW_CYCLE_SPEED: 0.75, // Fallback cycle rate
    TAIL_SWAY_FREQUENCY: 2.0,
    IDLE_BREATHE_SPEED: 2.0,
    SIDEWAYS_TILT_ANGLE: 0.12, // Subtle tilt in radians (~6.9 degrees) when moving sideways, closer to original angle
    DIAGONAL_TILT_ANGLE: 0.18, // Distinct diagonal body tilt (~10.3 degrees) when climbing diagonally
    
    // Boundary constraints (relative to building edges)
    HORIZONTAL_MARGIN: 0.05, // Padding inside building wall
  },

  // Slice 2 & 3: The Energy & Snack System
  ENERGY: {
    MAX_ENERGY: 100, // Maximum energy capacity
    // Exact floor bracket energy drain rates (% per second) as instructed by user:
    FLOOR_DRAIN_RATES: {
      FLOORS_1_5: 1.00,   // Floors 1 through 5: 1.00% per second
      FLOORS_6_10: 1.50,  // Floors 6 through 10: 1.50% per second
      FLOORS_11_15: 2.00, // Floors 11 through 15: 2.00% per second
      FLOORS_16_20: 2.25, // Floors 16 through 20: 2.25% per second
      FLOORS_21_ROOF: 3.00, // Floors 21 through roof: 3.00% per second
    },
    STILL_DRAIN_MULTIPLIER: 0.50, // 50% drain rate when clinging to wall but stationary
    BOOST_DRAIN_MULTIPLIER: 1.50, // Energy drain rate multiplier during speed boost
    RECHARGE_RATE_ON_SILL: 1.0, // Energy increases 1% per second (+1.0%/s) whenever on window sill or balcony
    EXHAUSTION_SPEED_MULTIPLIER: 0.65, // Speed factor when energy is depleted
    SNACK_RECOVERY: 20, // Restores energy instantly when touching a snack
    SPOOK_PENALTY: 15, // Energy setback when startled by a window spook
    IVY_SPEED_MULTIPLIER: 1.25, // Moves slightly faster in creeping ivy without losing extra energy
  },

  // Interactive Building Features & Props
  INTERACTIVE_ELEMENTS: {
    // 1. Drainpipes / Downspouts
    DRAINPIPES: {
      PIPE_RADIUS: 0.016,
      LEFT_OFFSET_RATIO: 0.035, // Distance from left building corner
      RIGHT_OFFSET_RATIO: 0.035, // Distance from right building corner
    },
    // 2. Diagonal Window Slide (Floor 7 to Floor 6)
    SLIDE_7_TO_4: {
      START_FLOOR: 7,
      START_WIN_INDEX: 1, // Window 1 on Floor 7
      END_FLOOR: 6,
      END_WIN_INDEX: 3, // Window 3 on Floor 6
      TUBE_RADIUS: 0.024,
      DURATION: 0.65, // Travel duration in seconds
    },
    // 3. Street Crates and Stacked Recycling Bins
    STREET_STACKS: {
      RECYCLING_BINS_X: 0.35, // Left of dumpster
      RECYCLING_BINS_W: 0.080,
      RECYCLING_BINS_H: 0.070,
      WOODEN_CRATES_X: 0.68, // Right of dumpster
      WOODEN_CRATES_W: 0.085,
      WOODEN_CRATES_H: 0.075,
    },
    // 4. Street Double Doors (Ground level lobby entrance - unclimbable glass)
    LOBBY_DOUBLE_DOORS: {
      CENTER_X: 0.16,
      WIDTH_RATIO: 0.175,
      HEIGHT_RATIO: 0.155, // Height from ground line
    },
    // 5. Electrified Telephone Cable
    ELECTRIC_CABLES: {
      POLE_X_OFFSET: -0.22, // Distance left of building edge
      POLE_HEIGHT: 0.72, // Pole height from ground
      BUILDING_JUNCTION_Y: 0.55, // Conduit junction on building facade
      SHOCK_RADIUS: 0.036,
    },
    // 6. Cellphone Base Transceiver Station (BTS antenna)
    CELL_TOWER_BTS: {
      FLOOR: 14,
      WIN_GAP_INDEX: 1, // Between window 1 and 2
      WIDTH_RATIO: 0.065,
      HEIGHT_RATIO: 0.135,
    },
    // 7. Level 7 Laundry Clothesline
    LAUNDRY_LINE: {
      FLOOR: 7,
      START_WIN_INDEX: 2,
      END_WIN_INDEX: 4,
    },
    // 8. Creeping Ivy / Grapevines (Natural ladders)
    IVY_VINES: [
      { startFloor: 2, endFloor: 6, winGapIndex: 0, width: 0.055 }, // Left brick lane
      { startFloor: 9, endFloor: 13, winGapIndex: 5, width: 0.055 }, // Right brick lane
    ],
    // 9. Fire Escape & Balconies (Zero energy loss when climbing!)
    FIRE_ESCAPE: {
      FLOORS: [3, 6, 9, 12, 15, 18], // Balconies acting like window sills
      WIN_GAP_INDEX: 5, // Outer right brick lane
      BALCONY_WIDTH: 0.125,
      BALCONY_DEPTH: 0.024,
      LADDER_WIDTH: 0.032,
    },
  },

  // Slice 3: Snacks on Window Sills
  SNACKS: {
    TYPES: ['pizza', 'donut', 'mystery_bag', 'pretzel', 'fish_taco'] as const,
    SPAWN_INTERVAL: 3.5, // Seconds between checking to spawn snacks
    MAX_ACTIVE_SNACKS: 6, // Maximum concurrent snacks on skyscraper sills
    MIN_LIFETIME: 9.0, // Disappear at different random rates (9s - 22s)
    MAX_LIFETIME: 22.0,
    COLLECT_RADIUS: 0.046, // Proportional touch distance
    WIDTH_RATIO: 0.050, // Snack width proportional to unitW
    HEIGHT_RATIO: 0.038, // Snack height proportional to screen H
  },

  // Slice 3: Skyscraper Window Spook Events & Physical Setbacks
  SPOOKS: {
    TYPES: [
      'curious_person', // Most frequent! Diverse ages, races, and genders
      'photo_flash',
      'shower_singer',
      'watching_tv',
      'twin_raccoon',
      'circus_clown',
      'angry_cat',
      'sleeping_dog',
      'disco_party',
      'alien_observer',
    ] as const,
    SPAWN_INTERVAL: 0.55, // High frequency so windows near raccoon actively trigger challenges
    MAX_ACTIVE_BUILDING_SPOOKS: 28, // High concurrent active events across skyscraper
    AUDIO_HEARING_DISTANCE: 0.45, // Proximity audio threshold (only heard when raccoon is near)
    NEAR_DETECTION_DIST_X: 0.135, // Vicinity threshold: includes sill and immediate left/right wall climbing
    NEAR_DETECTION_DIST_Y: 0.115, // Vertical span covering window level
    INVULNERABILITY_DURATION: 3.2, // Protection seconds after setback
    TUMBLE_FALL_SPEED: 0.52,
    TOAST_DURATION: 5.2, // Duration of popup messages
  },

  // Alley Ground, Trash Cans & Commercial Dumpster
  TRASH_CAN: {
    WIDTH_RATIO: 0.118, // Trash can width matching raccoon scale
    HEIGHT_RATIO: 0.098, // Trash can height
    GROUND_Y: 0.00, // Ground level Y coordinate at the very bottom of the building
    LEFT_CAN_OFFSET: 0.16, // Placed near left side of building
    RIGHT_CAN_OFFSET: 0.16, // Placed near right side of building
    DUMPSTER_WIDTH_RATIO: 0.23, // Large industrial dumpster between trash cans
    DUMPSTER_HEIGHT_RATIO: 0.105,
    POP_COUNT: 8, // Number of trash items launched per climb-out
    GRAVITY: 2.2, // Gravity for bouncing debris
  },

  // Street Level Scenery & Vehicles
  STREET: {
    // Sidewalk Trees
    TREE_WIDTH_RATIO: 0.16, // Width of tree foliage
    TREE_HEIGHT_RATIO: 0.24, // Height of tree
    // Classic Streetlamps
    LAMPPOST_WIDTH_RATIO: 0.052,
    LAMPPOST_HEIGHT_RATIO: 0.17,
    // Vehicles
    VEHICLE_SPAWN_INTERVAL_MIN: 3.5,
    VEHICLE_SPAWN_INTERVAL_MAX: 7.0,
    MAX_ACTIVE_VEHICLES: 3,
    BUS_WIDTH_RATIO: 0.38,
    BUS_HEIGHT_RATIO: 0.072,
    CAR_WIDTH_RATIO: 0.20,
    CAR_HEIGHT_RATIO: 0.052,
    VAN_WIDTH_RATIO: 0.24,
    VAN_HEIGHT_RATIO: 0.062,
  },

  // Camera Scrolling (Both Vertical & Horizontal across the wide skyscraper)
  CAMERA: {
    VERTICAL_LEAD_OFFSET: 0.62, // Keep raccoon at ~62% from top when climbing
    HORIZONTAL_LEAD_OFFSET: 0.5, // Center raccoon horizontally
    SMOOTH_LERP: 5.5, // Vertical camera follow speed
    HORIZONTAL_SMOOTH_LERP: 4.8, // Horizontal camera follow speed
    LOOKAHEAD_FACTOR: 0.08,
    HORIZONTAL_LOOKAHEAD_FACTOR: 0.12,
  },

  // Color Palette & Visual Styles (Vibrant Daytime Urban Theme)
  PALETTE: {
    // Daytime Sky gradient: deep rich azure aloft, warm bright sunny horizon below
    SKY_TOP: '#1d4ed8', // Deep azure blue aloft
    SKY_MID: '#38bdf8', // Vibrant sunny sky blue
    SKY_DUSK: '#7dd3fc', // Soft daytime mid-sky
    SKY_HORIZON: '#e0f2fe', // Bright sunny horizon glow
    SUN_COLOR: '#fffbeb', // Brilliant warm golden-white sun
    SUN_GLOW: 'rgba(254, 240, 138, 0.45)', // Warm radiant solar corona
    SUN_CORONA: '#fef08a', // Radiant golden rim
    CLOUD_BODY: '#ffffff', // Billowy white cumulus clouds
    CLOUD_SHADOW: 'rgba(203, 213, 225, 0.75)', // Soft light blue-gray cloud undersides
    
    // Distant City in Daytime Atmosphere
    CITY_FAR_SILHOUETTE: '#93c5fd', // Soft atmospheric blue distant skyline
    CITY_NEAR_SILHOUETTE: '#64748b', // Modern steel and glass midground towers
    CITY_WINDOW_LIT: '#ffffff', // Daytime glass reflections
    CITY_WINDOW_DIM: '#cbd5e1', // Architectural window tint
    
    // Skyscraper Architecture (Warm Rich Daytime Brick & Limestone)
    FACADE_PRIMARY: '#a33c16', // Warm rich red/terracotta brick
    FACADE_SECONDARY: '#7c2d12', // Architectural deep brick pillar accents
    FACADE_BRICK_LINE: 'rgba(255, 248, 235, 0.15)', // Clean light mortar courses
    CORNICE_LIGHT: '#f8fafc', // Bright limestone architectural cornices
    CORNICE_DARK: '#94a3b8', // Limestone shadow
    LEDGE_COLOR: '#f1f5f9', // Clean light stone ledges
    PILLAR_SHADOW: 'rgba(67, 20, 7, 0.28)', // Warm brick shadow
    
    // Windows & Glass (All windows uniform vibrant blue)
    WINDOW_FRAME: '#1e293b', // Crisp slate window frames
    WINDOW_VIBRANT_BLUE: '#0284c7', // Uniform vibrant electric blue for all windows
    WINDOW_LIT_WARM: '#0284c7',
    WINDOW_LIT_AMBER: '#0284c7',
    WINDOW_LIT_CYAN: '#0284c7',
    WINDOW_DARK: '#0369a1',
    WINDOW_GLOW_OPACITY: 0.25,
    WINDOW_GLASS_SHINE: 'rgba(255, 255, 255, 0.55)', // Bright daytime sunlight glare strip
    WINDOW_SILL_TOP: '#f8fafc', // Bright sunlit limestone sill surface
    WINDOW_SILL_FACE: '#cbd5e1', // Front edge of stone sill
    WINDOW_SILL_SHADOW: 'rgba(69, 26, 3, 0.35)', // Shadow on red brick below
    
    // Metal, Railings & AC Units
    METAL_DARK: '#334155',
    METAL_LIGHT: '#64748b',
    METAL_RUST: '#854d0e',
    NEON_SIGN_CYAN: '#0284c7',
    NEON_SIGN_PINK: '#e11d48',
    NEON_SIGN_AMBER: '#d97706',
    
    // Ground Street Level (Sunny daytime pavement & street furniture)
    STREET_ASPHALT: '#334155', // Sunlit asphalt road
    STREET_CURB: '#94a3b8', // Bright concrete sidewalk curb
    STREET_MARKING_YELLOW: '#fbbf24', // Continental lane divider
    STREET_MARKING_WHITE: '#f8fafc', // Crosswalk stripes
    LOBBY_INTERIOR_GLOW: '#ffffff', // Bright daytime entrance lobby
    TREE_TRUNK: '#78350f',
    TREE_TRUNK_DARK: '#451a03',
    TREE_LEAF_PRIMARY: '#15803d',
    TREE_LEAF_SECONDARY: '#16a34a',
    TREE_LEAF_HIGHLIGHT: '#4ade80',
    TREE_LEAF_SHADOW: '#14532d',
    TREE_GRATE: '#1e293b',
    LAMPPOST_IRON: '#0f172a',
    LAMPPOST_BRACKET: '#1e293b',
    LAMPPOST_LANTERN: '#fef08a',
    LAMPPOST_GLOW: 'rgba(254, 240, 138, 0.45)',
    HYDRANT_RED: '#ef4444',
    HYDRANT_SHADOW: '#991b1b',
    NEWSBOX_BLUE: '#2563eb',
    
    // Rooftop
    WATER_TOWER_WOOD: '#78350f', // Cedar wood water tower
    WATER_TOWER_BANDS: '#334155',
    ANTENNA_BEACON: '#ef4444',
    
    // Raccoon Character (Rich warm tones inspired by "PAWS UP! Rise of the Raccoon")
    RACCOON: {
      FUR_MAIN: '#66574a', // Warm earthy brown-gray fur coat
      FUR_DARK: '#302822', // Deep dark brown-charcoal for spine stripe and ear backs
      FUR_LIGHT: '#9e8c7c', // Soft warm highlights on fur edges and cheek tufts
      BELLY: '#f6f0e6', // Warm cream belly and cheek fur
      MASK: '#181513', // Deep velvety bandit mask
      EYEBROWS: '#faf8f5', // Crisp clean warm white brow tufts
      SNOUT: '#eee4d6', // Warm cream muzzle
      NOSE: '#14110f', // Glossy black button nose
      EYE_WHITE: '#ffffff',
      EYE_PUPIL: '#100d0b',
      EYE_IRIS: '#e27d14', // Vibrant glowing amber/hazel
      EAR_INNER: '#fda4af', // Soft tender pink inner ear fluff
      PAWS: '#221c17', // Warm dark paws
      CLAWS: '#d5cec5',
      TAIL_RING_LIGHT: '#9e8d7d', // Warm tan-gray tail ring
      TAIL_RING_DARK: '#241e19', // Rich dark brown-black tail ring
      SWEAT_DROP: '#38bdf8',
    },

    // UI & Arcade Cabinet Margins
    CABINET_BG: '#05070c',
    CABINET_BORDER: '#1e293b',
    CABINET_ACCENT: '#10b981',
    CABINET_TEXT_MUTED: '#64748b',
    CABINET_TEXT_LIGHT: '#f8fafc',
  },

  // Audio Volumes & Synthesizer Frequencies
  AUDIO: {
    ENABLED: true,
    MASTER_VOLUME: 0.35,
  },
} as const;

export type GameConfig = typeof GAME_CONFIG;

/**
 * Calculates horizontal coordinate for the alley trash can and start scene,
 * centered on the right side of the building between the furthest window and the building edge.
 */
export function getTrashCanStartX(): number {
  const { BUILDING_CENTER_X, BUILDING_WIDTH_RATIO, WINDOW_WIDTH_RATIO, WINDOWS_PER_FLOOR } = GAME_CONFIG.SKYSCRAPER;
  const buildingLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
  const buildingRight = buildingLeft + BUILDING_WIDTH_RATIO;
  const totalWinsWidth = WINDOWS_PER_FLOOR * WINDOW_WIDTH_RATIO;
  const remainingSpace = BUILDING_WIDTH_RATIO - totalWinsWidth;
  const gap = remainingSpace / (WINDOWS_PER_FLOOR + 1);
  const furthestWindowRight = buildingRight - gap;
  return (furthestWindowRight + buildingRight) / 2;
}
