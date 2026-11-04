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
    
    // Energy-Dependent Climbing Speeds:
    BASE_CLIMB_SPEED: 0.20, // Base vertical climb speed (screens/sec) at 100% speed
    CLIMB_SPEED_UP: 0.20,
    CLIMB_SPEED_Y: 0.20,
    CLIMB_SPEED_DOWN: 0.20,
    MOVE_SPEED_X: 0.20, // Matched horizontal climb speed
    CLIMB_SPEED_DIAGONAL: 0.20, // Matched diagonal climb speed
    SILL_WALK_SPEED: 0.22, // Agile crawling speed along window sill ledges
    
    // Speed Burst Configuration:
    // - Allowed only up to Floor 17
    // - Duration: 1.0 second per burst
    // - Cooldown: 4.0 seconds between bursts
    // - Speed multiplier: 1.50 (50% speed boost)
    BOOST_MULTIPLIER: 1.50,
    SPEED_BURST: {
      MAX_FLOOR: 17, // Burst only allowed up to Floor 17
      MAX_DURATION: 1.0, // 1.0 second duration per burst
      COOLDOWN: 4.0, // 4.0 seconds cooldown before next burst
    },
    
    // Energy-Dependent Speed Brackets:
    // >= 90%: 100%
    // 80% - 89%: 90%
    // 70% - 79%: 80%
    // 60% - 69%: 70%
    // 50% - 59%: 60%
    // 40% - 49%: 50%
    // 30% - 39%: 40%
    // 20% - 29%: 30%
    // 0% - 19%: 20%
    ENERGY_SPEED_TIERS: [
      { min: 90, ratio: 1.00 },
      { min: 80, ratio: 0.90 },
      { min: 70, ratio: 0.80 },
      { min: 60, ratio: 0.70 },
      { min: 50, ratio: 0.60 },
      { min: 40, ratio: 0.50 },
      { min: 30, ratio: 0.40 },
      { min: 20, ratio: 0.30 },
      { min: 0,  ratio: 0.20 },
    ],
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
    // Tuned floor bracket energy drain rates (% per second) for satisfyingly challenging vertical ascent:
    FLOOR_DRAIN_RATES: {
      FLOORS_1_5: 0.60,   // Floors 1 through 5: 0.60% per second (reduced so energy doesn't run out too soon)
      FLOORS_6_10: 0.90,  // Floors 6 through 10: 0.90% per second
      FLOORS_11_15: 1.25, // Floors 11 through 15: 1.25% per second
      FLOORS_16_20: 1.60, // Floors 16 through 20: 1.60% per second
      FLOORS_21_ROOF: 2.00, // Floors 21 through roof: 2.00% per second
    },
    STILL_DRAIN_MULTIPLIER: 0.45, // 45% drain rate when clinging to wall but stationary
    BOOST_DRAIN_MULTIPLIER: 1.50, // Energy drain rate multiplier during speed boost
    RECHARGE_RATE_ON_SILL: 1.60, // Energy increases 1.60% per second whenever perched on window sill or balcony
    EXHAUSTION_SPEED_MULTIPLIER: 0.75, // Speed factor when energy is depleted
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
    // 7. Level 9 Laundry Clothesline (Moved up two floors from Floor 7 to Floor 9)
    LAUNDRY_LINE: {
      FLOOR: 9,
      START_WIN_INDEX: 2,
      END_WIN_INDEX: 4,
    },
    // 8. Swinging "Tarzan" Vine (Floor 8: Swings 4 window sills over from Win 0 to Win 4)
    TARZAN_VINE: {
      FLOOR: 8,
      START_WIN_INDEX: 0,
      END_WIN_INDEX: 4,
      SWING_DURATION: 1.15, // Smooth 1.15s pendulum arc
    },
    // 9. "Star Trek" Teleport (Transporter beam connecting Floor 12 Window 3 to Floor 16 Window 3)
    TELEPORT: {
      START_FLOOR: 12,
      START_WIN_INDEX: 3,
      END_FLOOR: 16,
      END_WIN_INDEX: 3,
      DURATION: 0.85,
    },
    // 10. Eagle Nest at Floor 17
    EAGLE_NEST: {
      FLOOR: 17,
      WIN_GAP_INDEX: 2, // Architectural ledge between windows 2 and 3
    },
    // 11. Child Flying Kite from Street Level (Floors 1-2 up to Floor 4)
    STREET_KITE: {
      CHILD_X: 0.82, // Positioned on open sidewalk further away from dumpster and trash can
      CHILD_Y: 0.015,
      KITE_BASE_X: 0.225, // Kite horizontal position shifted leftward by one window bay
      MIN_WORLD_Y: 0.38, // Begins hovering between the first and second floor (Floor 1-2)
      MAX_WORLD_Y: 2.08, // Highest point reached as raccoon climbs is Floor 4 (~2.08)
      KITE_WIDTH_RATIO: 0.11, // Large visible size
      KITE_HEIGHT_RATIO: 0.16, // Proportional height
    },
  },

  // Slice 3: Snacks on Window Sills
  SNACKS: {
    TYPES: ['pizza', 'donut', 'mystery_bag', 'pretzel', 'fish_taco'] as const,
    SPAWN_INTERVAL: 1.8, // Seconds between checking to spawn snacks (tuned for more active snack distribution)
    MAX_ACTIVE_SNACKS: 14, // Maximum concurrent snacks on skyscraper sills
    MIN_LIFETIME: 10.0, // Disappear at different random rates (10s - 24s)
    MAX_LIFETIME: 24.0,
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
    SPAWN_INTERVAL: 0.38, // High frequency so windows near raccoon actively trigger challenges
    MAX_ACTIVE_BUILDING_SPOOKS: 36, // Plentiful concurrent active events across skyscraper
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
    // Vehicles - Scaled properly relative to lower levels (entrance doors ~0.18, dumpster ~0.105)
    VEHICLE_SPAWN_INTERVAL_MIN: 3.5,
    VEHICLE_SPAWN_INTERVAL_MAX: 7.0,
    MAX_ACTIVE_VEHICLES: 3,
    BUS_WIDTH_RATIO: 0.64,
    BUS_HEIGHT_RATIO: 0.170,
    CAR_WIDTH_RATIO: 0.34,
    CAR_HEIGHT_RATIO: 0.112,
    VAN_WIDTH_RATIO: 0.40,
    VAN_HEIGHT_RATIO: 0.142,
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

  // Dominant Color Palette Extracted Directly from "Raccoon! Raccoon! By E.Q. Wright"
  BOOK_COVER_PALETTE: {
    // Sky tones (behind raccoon in the trapezoidal skylight/window):
    SKY_CYAN: '#1ea7e1', // Primary luminous cerulean/cyan sky
    SKY_CYAN_LIGHT: '#38bdf8', // Sunny sky highlight
    SKY_BLUE_DEEP: '#0284c7', // Deep storybook window depth
    
    // Brick & Walls: Warm storybook apricot salmon terracotta & parchment paper
    BRICK_TERRACOTTA: '#ea733d', // Primary warm storybook terracotta brick
    BRICK_APRICOT: '#f5925d', // Sunlit apricot brick tone
    BRICK_SHADOW: '#c25526', // Deep rich clay brick shadow
    WALL_PARCHMENT: '#fdf6ed', // Warm creamy vintage book paper wash
    MORTAR_CREAM: '#fae6d3', // Soft peach mortar lines
    
    // Shadows & Linework: Hand-drawn storybook charcoal & ink
    INK_BLACK: '#18181b', // Deep rich linework ink
    INK_CHARCOAL: '#27272a', // Window frame & sill shadow ink
    PENCIL_SHADOW: '#475569', // Subtle pencil sketch shadow
    
    // Accents: Classic storybook crimson title red & retro apparel
    CRIMSON_RED: '#e51a24', // "Raccoon! Raccoon!" vivid title red
    CRIMSON_SHADOW: '#b91c1c', // Deep crimson bevel
    HAT_GREEN: '#16a34a', // Emerald green ballcap
    HAT_STRAW_YELLOW: '#facc15', // Boater straw hat
    HAT_BAND_ORANGE: '#ea580c', // Boater ribbon band
    
    // Faces / Crowd Skin Tones (the onlooking crowd looking up):
    SKIN_FAIR: '#fde0cb', // Fair peachy skin
    SKIN_APRICOT: '#f7b282', // Warm golden apricot skin
    SKIN_TAN: '#c88756', // Caramel honey tan skin
    SKIN_UMBER: '#784421', // Deep rich umber skin
    
    // Hair tones from onlookers:
    HAIR_BLONDE: '#facc15',
    HAIR_LIGHT_BROWN: '#b47b4c',
    HAIR_DARK_BROWN: '#451a03',
    HAIR_BLACK: '#18181b',
    HAIR_SILVER: '#f1f5f9',
    
    // Raccoon Illustration Fur:
    RACCOON_GREY: '#94a3b8',
    RACCOON_DARK: '#1e293b',
    RACCOON_WHITE: '#f8fafc',
  },

  // Color Palette & Visual Styles (Themed to "Raccoon! Raccoon!" Book Cover)
  PALETTE: {
    // Storybook Sky gradient: deep rich cerulean aloft, luminous cyan mid-sky, warm parchment horizon
    SKY_TOP: '#0284c7', // Deep storybook azure aloft
    SKY_MID: '#1ea7e1', // Luminous storybook window sky blue
    SKY_DUSK: '#38bdf8', // Soft daytime mid-sky cyan
    SKY_HORIZON: '#fdf6ed', // Warm book paper parchment horizon glow
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
    
    // Skyscraper Architecture (Warm Apricot Terracotta & Limestone)
    FACADE_PRIMARY: '#ea733d', // Warm storybook terracotta brick
    FACADE_SECONDARY: '#c25526', // Rich deep clay brick shadow accents
    FACADE_BRICK_LINE: 'rgba(253, 246, 237, 0.28)', // Cream peach mortar courses
    CORNICE_LIGHT: '#fdf6ed', // Warm parchment limestone cornices
    CORNICE_DARK: '#94a3b8', // Limestone shadow
    LEDGE_COLOR: '#f1f5f9', // Clean light stone ledges
    PILLAR_SHADOW: 'rgba(39, 39, 42, 0.25)', // Storybook ink shadow
    
    // Windows & Glass (Uniform vibrant storybook sky cyan from cover)
    WINDOW_FRAME: '#18181b', // Crisp storybook ink black window frames
    WINDOW_VIBRANT_BLUE: '#1ea7e1', // Exact luminous cyan from "Raccoon! Raccoon!" window
    WINDOW_BLUE_LIGHT: '#38bdf8', // Luminous top cyan highlight from book cover window
    WINDOW_BLUE_DEEP: '#0284c7', // Deep rich azure depth from book cover window
    WINDOW_LIT_WARM: '#1ea7e1',
    WINDOW_LIT_AMBER: '#1ea7e1',
    WINDOW_LIT_CYAN: '#1ea7e1',
    WINDOW_DARK: '#0284c7',
    WINDOW_GLOW_OPACITY: 0.25,
    WINDOW_GLASS_SHINE: 'rgba(255, 255, 255, 0.55)', // Bright sunlight glare strip
    WINDOW_SILL_TOP: '#fdf6ed', // Sunlit parchment limestone sill surface
    WINDOW_SILL_FACE: '#e2e8f0', // Front edge of stone sill
    WINDOW_SILL_SHADOW: 'rgba(24, 24, 27, 0.35)', // Shadow on terracotta brick below
    
    // Metal, Railings & Interactive Features
    METAL_DARK: '#27272a',
    METAL_LIGHT: '#64748b',
    METAL_RUST: '#854d0e',
    NEON_SIGN_CYAN: '#1ea7e1',
    NEON_SIGN_PINK: '#e51a24',
    NEON_SIGN_AMBER: '#facc15',
    
    // Ground Street Level (Warm sunny pavement & street furniture)
    STREET_ASPHALT: '#27272a', // Sunlit asphalt road
    STREET_CURB: '#94a3b8', // Concrete sidewalk curb
    STREET_MARKING_YELLOW: '#facc15', // Continental lane divider
    STREET_MARKING_WHITE: '#fdf6ed', // Crosswalk stripes
    LOBBY_INTERIOR_GLOW: '#ffffff', // Bright daytime entrance lobby
    TREE_TRUNK: '#78350f',
    TREE_TRUNK_DARK: '#451a03',
    TREE_LEAF_PRIMARY: '#15803d',
    TREE_LEAF_SECONDARY: '#16a34a',
    TREE_LEAF_HIGHLIGHT: '#4ade80',
    TREE_LEAF_SHADOW: '#14532d',
    TREE_GRATE: '#18181b',
    LAMPPOST_IRON: '#18181b',
    LAMPPOST_BRACKET: '#27272a',
    LAMPPOST_LANTERN: '#fef08a',
    LAMPPOST_GLOW: 'rgba(254, 240, 138, 0.45)',
    HYDRANT_RED: '#e51a24',
    HYDRANT_SHADOW: '#b91c1c',
    NEWSBOX_BLUE: '#1ea7e1',
    
    // Rooftop
    WATER_TOWER_WOOD: '#78350f',
    WATER_TOWER_BANDS: '#27272a',
    ANTENNA_BEACON: '#e51a24',
    
    // Raccoon Character (Rich storybook palette)
    RACCOON: {
      FUR_MAIN: '#66574a', // Warm earthy brown-gray fur coat
      FUR_DARK: '#18181b', // Deep storybook charcoal for spine stripe & ear backs
      FUR_LIGHT: '#94a3b8', // Storybook silver-grey cheek tufts
      BELLY: '#fdf6ed', // Warm cream belly
      MASK: '#18181b', // Deep velvety bandit mask
      EYEBROWS: '#ffffff', // Crisp white brow tufts
      SNOUT: '#fdf6ed', // Warm cream muzzle
      NOSE: '#18181b', // Glossy black button nose
      EYE_WHITE: '#ffffff',
      EYE_PUPIL: '#18181b',
      EYE_IRIS: '#e51a24', // Storybook crimson sparkle
      EAR_INNER: '#fda4af', // Soft tender pink inner ear
      PAWS: '#18181b', // Storybook dark ink paws
      CLAWS: '#d5cec5',
      TAIL_RING_LIGHT: '#94a3b8',
      TAIL_RING_DARK: '#18181b',
      SWEAT_DROP: '#1ea7e1',
    },

    // UI & Arcade Cabinet Margins (Storybook Vermilion Crimson & Terracotta Accents)
    CABINET_BG: '#18181b',
    CABINET_BORDER: '#ea733d',
    CABINET_ACCENT: '#e51a24',
    CABINET_TEXT_MUTED: '#94a3b8',
    CABINET_TEXT_LIGHT: '#fdf6ed',
  },

  // Audio Volumes & Synthesizer Frequencies
  AUDIO: {
    ENABLED: true,
    MASTER_VOLUME: 0.35,
  },

  // Dynamic Weather System (Rain, Snow, Slick Grip, and Speed Modifiers)
  WEATHER: {
    RAIN_SPEED_MULTIPLIER: 0.92, // Mild speed reduction (was 0.85) - climbing remains agile
    RAIN_SLIP_CHANCE: 0.008,     // Micro-slip chance on wet brick (reduced from 0.015)
    THUNDERSTORM_SLIP_CHANCE: 0.012, // Reduced slip chance during thunderstorm (reduced from 0.024)
    SNOW_SPEED_MULTIPLIER: 0.88, // Mild speed reduction (was 0.80) - agile climbing in snow
    SNOW_SLIP_CHANCE: 0.005,     // Micro-slip on frost (reduced from 0.008)
    BLIZZARD_SLIP_CHANCE: 0.011, // Reduced slip chance during blizzard (reduced from 0.022)
    MAX_RAIN_DROPS: 180,         // Enhanced drop pool for pronounced, visible rain
    MAX_SNOW_FLAKES: 260,        // Dense snow flurries and nearly white-out blizzard
    THUNDER_INTERVAL_MIN: 2.2,   // Seconds between thunderclaps during storm climax
    THUNDER_INTERVAL_MAX: 4.8,
    BLIZZARD_WIND_FORCE: 0.14,   // Gentle challenging lateral push (reduced from 0.28 so climbing is responsive)
    BLIZZARD_SILL_WIND_FORCE: 0.07, // Subtle drift on sill (reduced from 0.16)
    THUNDERSTORM_WIND_FORCE: 0.09, // Light wind push during thunderstorm (reduced from 0.18)
    THUNDERSTORM_SILL_WIND_FORCE: 0.04, // Light wind push on sill (reduced from 0.09)
    SNOWFLAKE_BASE_SIZE_MIN: 4.5, // Visibly larger snowflakes for clear visual distinction
    SNOWFLAKE_BASE_SIZE_MAX: 10.5,
  },
} as const;

export type GameConfig = typeof GAME_CONFIG;

/**
 * Calculates altitude-scaled energy boost for snacks.
 * To make the ascent progressively more challenging, snacks provide decreasing energy boosts
 * as the raccoon climbs higher toward the summit:
 * - Floor 1: 100% of base boost
 * - Floor 13 (mid-skyscraper): ~65% of base boost
 * - Floor 25 (rooftop summit): ~35% of base boost
 */
export function getScaledSnackEnergy(baseRecovery: number, floor: number): number {
  const totalFloors = GAME_CONFIG.SKYSCRAPER.TOTAL_FLOORS;
  const progress = Math.max(0, Math.min(1, (floor - 1) / Math.max(1, totalFloors - 1)));
  const scale = Math.max(0.35, 1.0 - progress * 0.65);
  return Math.max(2, Math.round(baseRecovery * scale));
}

/**
 * Calculates horizontal coordinate for the alley trash can and start scene,
 * positioned directly underneath the nearest window on Floor 1.
 */
export function getTrashCanStartX(): number {
  const { BUILDING_CENTER_X, BUILDING_WIDTH_RATIO, WINDOW_WIDTH_RATIO, WINDOWS_PER_FLOOR } = GAME_CONFIG.SKYSCRAPER;
  const buildingLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
  const totalWinsWidth = WINDOWS_PER_FLOOR * WINDOW_WIDTH_RATIO;
  const remainingSpace = BUILDING_WIDTH_RATIO - totalWinsWidth;
  const gap = remainingSpace / (WINDOWS_PER_FLOOR + 1);
  // Center directly underneath the nearest window (furthest right window index 5 on Floor 1)
  const nearestWinIndex = WINDOWS_PER_FLOOR - 1;
  return buildingLeft + gap + (WINDOW_WIDTH_RATIO + gap) * nearestWinIndex + WINDOW_WIDTH_RATIO * 0.5;
}

/**
 * Calculates raccoon climbing speed multiplier strictly based on its current energy level.
 * Tuned to prevent sluggishness when energy dips below 20%:
 * - 89% to 100%: 100% (1.00)
 * - 78% to 88%: 95% (0.95)
 * - 66% to 77%: 90% (0.90)
 * - 40% to 65%: 82% (0.82)
 * - 20% to 39%: 74% (0.74)
 * - 15% to 19%: 65% (0.65)
 * - 10% to 14%: 58% (0.58)
 * - 5% to 9%: 50% (0.50)
 * - 4% or less: 40% (0.40)
 */
export function getEnergySpeedRatio(energy: number): number {
  if (energy >= 89) return 1.00;
  if (energy >= 78) return 0.95;
  if (energy >= 66) return 0.90;
  if (energy >= 40) return 0.82;
  if (energy >= 20) return 0.74;
  if (energy >= 15) return 0.65;
  if (energy >= 10) return 0.58;
  if (energy >= 5) return 0.50;
  return 0.40;
}
