/**
 * Rise of the Raccoons! - Daily Missions System
 * Generates and tracks daily challenges seeded by calendar date.
 * Persists progress in localStorage and rewards the player for replayability.
 */

export type MissionCategory = 'ascent' | 'snack' | 'agility' | 'weather' | 'energy' | 'stunt';

export interface DailyMission {
  id: string;
  category: MissionCategory;
  title: string;
  description: string;
  icon: string;
  target: number;
  current: number;
  unit: string;
  completed: boolean;
  reward: number; // Star points / Acorn currency
  claimed: boolean;
}

export interface DailyMissionsData {
  date: string; // YYYY-MM-DD
  missions: DailyMission[];
  totalStars: number;
  autoShowOnStart: boolean;
}

interface MissionTemplate {
  id: string;
  category: MissionCategory;
  title: string;
  descriptionTemplate: (target: number) => string;
  icon: string;
  targetOptions: number[];
  unit: string;
  rewardOptions: number[];
}

const MISSION_POOL: MissionTemplate[] = [
  {
    id: 'reach_floor',
    category: 'ascent',
    title: 'High Climber',
    descriptionTemplate: (t) => `Climb up to Floor ${t} or higher`,
    icon: '🏢',
    targetOptions: [8, 10, 12, 15],
    unit: 'Floor',
    rewardOptions: [40, 50, 60, 75],
  },
  {
    id: 'collect_snacks',
    category: 'snack',
    title: 'Dumpster Gourmet',
    descriptionTemplate: (t) => `Collect ${t} tasty snacks on window sills`,
    icon: '🍕',
    targetOptions: [3, 5, 8],
    unit: 'Snacks',
    rewardOptions: [35, 50, 65],
  },
  {
    id: 'rest_on_sills',
    category: 'energy',
    title: 'Ledge Lounger',
    descriptionTemplate: (t) => `Rest on ${t} different window sills to recharge`,
    icon: '🐾',
    targetOptions: [3, 4, 6],
    unit: 'Sills',
    rewardOptions: [30, 45, 60],
  },
  {
    id: 'use_bursts',
    category: 'agility',
    title: 'Speed Demon',
    descriptionTemplate: (t) => `Activate the Speed Burst ${t} times`,
    icon: '⚡',
    targetOptions: [3, 5, 6],
    unit: 'Bursts',
    rewardOptions: [35, 50, 65],
  },
  {
    id: 'weather_climber',
    category: 'weather',
    title: 'Storm Chaser',
    descriptionTemplate: (t) => `Climb ${t} floors during rain or snow weather`,
    icon: '🌧️',
    targetOptions: [3, 4, 5],
    unit: 'Floors',
    rewardOptions: [40, 55, 70],
  },
  {
    id: 'dodge_spooks',
    category: 'agility',
    title: 'Nimble Whiskers',
    descriptionTemplate: (t) => `Encounter ${t} window spooks without tumbling`,
    icon: '👀',
    targetOptions: [2, 3, 4],
    unit: 'Spooks',
    rewardOptions: [45, 60, 75],
  },
  {
    id: 'scatter_pigeons',
    category: 'stunt',
    title: 'Pigeon Startler',
    descriptionTemplate: () => `Startle the roosting pigeons on Floor 2 sill`,
    icon: '🐦',
    targetOptions: [1],
    unit: 'Flock',
    rewardOptions: [40],
  },
  {
    id: 'slide_or_vine',
    category: 'stunt',
    title: 'Tarzan Bandit',
    descriptionTemplate: () => `Ride the window tube slide or Tarzan vine`,
    icon: '🛝',
    targetOptions: [1],
    unit: 'Ride',
    rewardOptions: [50],
  },
  {
    id: 'trash_pop',
    category: 'stunt',
    title: 'Alley Rocket',
    descriptionTemplate: (t) => `Launch out of the dumpster or alley trash can ${t} times`,
    icon: '🗑️',
    targetOptions: [2, 3],
    unit: 'Leaps',
    rewardOptions: [30, 45],
  },
  {
    id: 'energy_master',
    category: 'energy',
    title: 'Full Battery',
    descriptionTemplate: () => `Reach Floor 6 while keeping energy above 70%`,
    icon: '🔋',
    targetOptions: [6],
    unit: 'Floor',
    rewardOptions: [60],
  },
];

const STORAGE_KEY = 'rotr_daily_missions_data_v1';

/**
 * Returns YYYY-MM-DD formatted date string in player's local timezone
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Time remaining until midnight local reset
 */
export function getTimeUntilMidnight(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diffMs = midnight.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

/**
 * Simple deterministic pseudo-random number generator for daily seeding
 */
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Converts date string "2026-11-01" to an integer seed
 */
function dateToSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) + 12345;
}

/**
 * Generates 3 unique daily missions seeded by today's date
 */
export function generateDailyMissions(dateStr: string): DailyMission[] {
  const seed = dateToSeed(dateStr);
  const rand = seededRandom(seed);

  const shuffledPool = [...MISSION_POOL];
  // Fisher-Yates shuffle with seeded PRNG
  for (let i = shuffledPool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]];
  }

  // Pick top 3 missions ensuring category diversity
  const picked: MissionTemplate[] = [];
  const categories = new Set<string>();

  for (const m of shuffledPool) {
    if (!categories.has(m.category)) {
      picked.push(m);
      categories.add(m.category);
      if (picked.length === 3) break;
    }
  }

  // Fallback if 3 diverse categories couldn't be filled
  if (picked.length < 3) {
    for (const m of shuffledPool) {
      if (!picked.includes(m)) {
        picked.push(m);
        if (picked.length === 3) break;
      }
    }
  }

  return picked.map((t, idx) => {
    const optIdx = Math.floor(rand() * t.targetOptions.length);
    const target = t.targetOptions[optIdx];
    const reward = t.rewardOptions[Math.min(optIdx, t.rewardOptions.length - 1)];

    return {
      id: `${t.id}_${idx}`,
      category: t.category,
      title: t.title,
      description: t.descriptionTemplate(target),
      icon: t.icon,
      target,
      current: 0,
      unit: t.unit,
      completed: false,
      reward,
      claimed: false,
    };
  });
}

/**
 * Loads daily missions from localStorage or generates new ones for today
 */
export function loadDailyMissions(): DailyMissionsData {
  const today = getTodayDateString();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data: DailyMissionsData = JSON.parse(raw);
      if (data && data.date === today && Array.isArray(data.missions) && data.missions.length === 3) {
        return data;
      }
      // Date changed: carry over totalStars, generate new missions for today
      const previousStars = typeof data.totalStars === 'number' ? data.totalStars : 0;
      const newMissions = generateDailyMissions(today);
      const newData: DailyMissionsData = {
        date: today,
        missions: newMissions,
        totalStars: previousStars,
        autoShowOnStart: true,
      };
      saveDailyMissions(newData);
      return newData;
    }
  } catch (err) {
    console.warn('Failed to load daily missions from storage:', err);
  }

  // Initial first-time generation
  const initialData: DailyMissionsData = {
    date: today,
    missions: generateDailyMissions(today),
    totalStars: 0,
    autoShowOnStart: true,
  };
  saveDailyMissions(initialData);
  return initialData;
}

/**
 * Saves daily missions to localStorage and dispatches change notification
 */
export function saveDailyMissions(data: DailyMissionsData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('rotr_missions_updated', { detail: data }));
  } catch (err) {
    console.warn('Failed to save daily missions to storage:', err);
  }
}

export type MissionEventType =
  | 'floor_reached'
  | 'snack_collected'
  | 'sill_rested'
  | 'burst_used'
  | 'weather_climb'
  | 'spook_dodged'
  | 'pigeons_scattered'
  | 'slide_or_vine'
  | 'trash_pop';

/**
 * Updates daily missions according to an in-game event and returns newly completed missions
 */
export function reportDailyMissionEvent(
  eventType: MissionEventType,
  amount: number = 1,
  metadata?: { floor?: number; energy?: number }
): DailyMission[] {
  const data = loadDailyMissions();
  const newlyCompleted: DailyMission[] = [];
  let changed = false;

  for (const m of data.missions) {
    if (m.completed) continue;

    let progressIncrement = 0;

    switch (eventType) {
      case 'floor_reached':
        if (m.id.startsWith('reach_floor')) {
          const currentFloor = metadata?.floor ?? amount;
          if (currentFloor > m.current) {
            m.current = currentFloor;
            changed = true;
          }
        } else if (m.id.startsWith('energy_master')) {
          const currentFloor = metadata?.floor ?? 1;
          const energy = metadata?.energy ?? 100;
          if (energy >= 70) {
            m.current = Math.max(m.current, currentFloor);
            changed = true;
          }
        }
        break;

      case 'snack_collected':
        if (m.id.startsWith('collect_snacks')) {
          progressIncrement = amount;
        }
        break;

      case 'sill_rested':
        if (m.id.startsWith('rest_on_sills')) {
          progressIncrement = amount;
        }
        break;

      case 'burst_used':
        if (m.id.startsWith('use_bursts')) {
          progressIncrement = amount;
        }
        break;

      case 'weather_climb':
        if (m.id.startsWith('weather_climber')) {
          progressIncrement = amount;
        }
        break;

      case 'spook_dodged':
        if (m.id.startsWith('dodge_spooks')) {
          progressIncrement = amount;
        }
        break;

      case 'pigeons_scattered':
        if (m.id.startsWith('scatter_pigeons')) {
          progressIncrement = amount;
        }
        break;

      case 'slide_or_vine':
        if (m.id.startsWith('slide_or_vine')) {
          progressIncrement = amount;
        }
        break;

      case 'trash_pop':
        if (m.id.startsWith('trash_pop')) {
          progressIncrement = amount;
        }
        break;
    }

    if (progressIncrement > 0) {
      m.current = Math.min(m.target, m.current + progressIncrement);
      changed = true;
    }

    if (!m.completed && m.current >= m.target) {
      m.completed = true;
      data.totalStars += m.reward;
      newlyCompleted.push(m);
      changed = true;
    }
  }

  if (changed) {
    saveDailyMissions(data);
  }

  return newlyCompleted;
}

/**
 * Claims a completed mission reward
 */
export function claimMissionReward(missionId: string): DailyMissionsData {
  const data = loadDailyMissions();
  const m = data.missions.find((item) => item.id === missionId);
  if (m && m.completed && !m.claimed) {
    m.claimed = true;
    saveDailyMissions(data);
  }
  return data;
}

/**
 * Updates autoShowOnStart preference
 */
export function setAutoShowMissions(autoShow: boolean): void {
  const data = loadDailyMissions();
  data.autoShowOnStart = autoShow;
  saveDailyMissions(data);
}
