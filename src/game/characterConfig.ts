/**
 * Rise of the Raccoons! - Character & Skin Configuration
 * 
 * Centralized roster of 12 cosmetic raccoon skins with modular art replacement hooks.
 * All characters share identical physics, hitboxes, climbing speeds, and behaviors.
 * 
 * MODULAR ART REPLACEMENT:
 * To replace the procedural vector placeholders with custom art:
 * Simply set `imageUrl`, `climbSpriteUrl`, and/or `sillSpriteUrl` to your local .png path
 * (e.g., "/assets/characters/my_raccoon.png") or any external image URL.
 * The renderer automatically loads and draws the sprite without altering core engine physics!
 */

export interface CharacterPalette {
  furMain: string;
  furDark: string;
  furLight: string;
  belly: string;
  mask: string;
  eyebrows: string;
  snout: string;
  nose: string;
  eyeWhite: string;
  eyePupil: string;
  eyeIris: string;
  earInner: string;
  paws: string;
  claws: string;
  tailRingLight: string;
  tailRingDark: string;
  accent?: string;
}

export type AccessoryType =
  | 'none'
  | 'rainbow_trail'
  | 'sparkles'
  | 'tie'
  | 'cape'
  | 'helmet'
  | 'headband'
  | 'cap'
  | 'chef_hat'
  | 'horn'
  | 'tiara'
  | 'fluff';

export interface CharacterAccessory {
  type: AccessoryType;
  color: string;
  secondaryColor?: string;
  label?: string;
}

export interface CharacterConfig {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  tagline: string;
  badge: string; // Emoji or glyph
  themeColor: string; // Accent color for cards, glow, and HUD
  
  // Modular Image Replacement Hooks (set to .png paths or external image URLs):
  imageUrl?: string;        // Universal preview/avatar sprite
  climbSpriteUrl?: string;  // Custom top-down wall climbing sprite
  sillSpriteUrl?: string;   // Custom side-profile window sill sprite
  
  // Vector & CSS Shape Placeholder Appearance:
  palette: CharacterPalette;
  accessory: CharacterAccessory;
}

export const RACCOON_ROSTER: CharacterConfig[] = [
  // 1. #mprraccoon - The Default OG Raccoon
  {
    id: 'mprraccoon',
    name: '#mprraccoon',
    subtitle: '(OG who started it all)',
    description: 'The legendary Minnesota daredevil who scaled 25 stories of the UBS skyscraper in downtown St. Paul.',
    tagline: 'Classic climb. Zero fear. Total legend.',
    badge: '🦝',
    themeColor: '#ea733d',
    palette: {
      furMain: '#66574a',
      furDark: '#18181b',
      furLight: '#94a3b8',
      belly: '#fdf6ed',
      mask: '#18181b',
      eyebrows: '#ffffff',
      snout: '#fdf6ed',
      nose: '#18181b',
      eyeWhite: '#ffffff',
      eyePupil: '#18181b',
      eyeIris: '#e51a24',
      earInner: '#fda4af',
      paws: '#18181b',
      claws: '#d5cec5',
      tailRingLight: '#94a3b8',
      tailRingDark: '#18181b',
      accent: '#ea733d',
    },
    accessory: {
      type: 'none',
      color: '#ea733d',
    },
  },

  // 2. Rainbow Rascal
  {
    id: 'rainbow_rascal',
    name: 'Rainbow Rascal',
    subtitle: 'Vibrant prism climber',
    description: 'Infuses every brick climb with dazzling technicolor brilliance and a shimmering spectral tail.',
    tagline: 'Why climb in grayscale when you can scale in full spectrum?',
    badge: '🌈',
    themeColor: '#a855f7',
    palette: {
      furMain: '#7c3aed',
      furDark: '#4c1d95',
      furLight: '#c084fc',
      belly: '#fae8ff',
      mask: '#3b0764',
      eyebrows: '#fef08a',
      snout: '#fdf4ff',
      nose: '#ec4899',
      eyeWhite: '#ffffff',
      eyePupil: '#1e1b4b',
      eyeIris: '#facc15',
      earInner: '#f472b6',
      paws: '#581c87',
      claws: '#fbcfe8',
      tailRingLight: '#f43f5e',
      tailRingDark: '#06b6d4',
      accent: '#a855f7',
    },
    accessory: {
      type: 'rainbow_trail',
      color: '#ec4899',
      secondaryColor: '#38bdf8',
    },
  },

  // 3. Glittertail
  {
    id: 'glittertail',
    name: 'Glittertail',
    subtitle: 'Shimmering starlight tail',
    description: 'Coated in frost-silver sheen and diamond flecks that catch sunlight across the upper tower glass.',
    tagline: 'Sparkling high above the city skyline.',
    badge: '✨',
    themeColor: '#38bdf8',
    palette: {
      furMain: '#64748b',
      furDark: '#1e293b',
      furLight: '#e2e8f0',
      belly: '#f8fafc',
      mask: '#0f172a',
      eyebrows: '#ffffff',
      snout: '#f8fafc',
      nose: '#0f172a',
      eyeWhite: '#ffffff',
      eyePupil: '#0f172a',
      eyeIris: '#38bdf8',
      earInner: '#bae6fd',
      paws: '#334155',
      claws: '#e2e8f0',
      tailRingLight: '#e0f2fe',
      tailRingDark: '#0284c7',
      accent: '#38bdf8',
    },
    accessory: {
      type: 'sparkles',
      color: '#38bdf8',
      secondaryColor: '#ffffff',
    },
  },

  // 4. Business Tycoon
  {
    id: 'business_tycoon',
    name: 'Business Tycoon',
    subtitle: 'Executive rooftop negotiator',
    description: 'Always dressed for the C-suite in a tailored charcoal coat and sharp crimson silk power tie.',
    tagline: 'Literally scaling the corporate ladder.',
    badge: '💼',
    themeColor: '#f59e0b',
    palette: {
      furMain: '#27272a',
      furDark: '#09090b',
      furLight: '#71717a',
      belly: '#ffffff',
      mask: '#18181b',
      eyebrows: '#f4f4f5',
      snout: '#f4f4f5',
      nose: '#000000',
      eyeWhite: '#ffffff',
      eyePupil: '#000000',
      eyeIris: '#eab308',
      earInner: '#fca5a5',
      paws: '#18181b',
      claws: '#e4e4e7',
      tailRingLight: '#52525b',
      tailRingDark: '#18181b',
      accent: '#dc2626',
    },
    accessory: {
      type: 'tie',
      color: '#dc2626',
      secondaryColor: '#facc15',
    },
  },

  // 5. Crusty Cape
  {
    id: 'crusty_cape',
    name: 'Crusty Cape',
    subtitle: 'The pizza-crust crusader',
    description: 'Sporting a heroic flowing marinara cape and an unquenchable thirst for rooftop pizza crusts.',
    tagline: 'With high elevation comes high appetite.',
    badge: '🦸',
    themeColor: '#ef4444',
    palette: {
      furMain: '#1e293b',
      furDark: '#020617',
      furLight: '#475569',
      belly: '#fef2f2',
      mask: '#090d16',
      eyebrows: '#ffffff',
      snout: '#fee2e2',
      nose: '#7f1d1d',
      eyeWhite: '#ffffff',
      eyePupil: '#020617',
      eyeIris: '#ef4444',
      earInner: '#fca5a5',
      paws: '#0f172a',
      claws: '#fecaca',
      tailRingLight: '#64748b',
      tailRingDark: '#0f172a',
      accent: '#ef4444',
    },
    accessory: {
      type: 'cape',
      color: '#e11d48',
      secondaryColor: '#f59e0b',
    },
  },

  // 6. Space Trash Panda
  {
    id: 'space_trash_panda',
    name: 'Space Trash Panda',
    subtitle: 'Galactic orbit scavenger',
    description: 'Equipped with a futuristic bubble visor and micro-gravity thruster paws for stratosphere climbs.',
    tagline: 'To the rooftop and into low Earth orbit!',
    badge: '🚀',
    themeColor: '#06b6d4',
    palette: {
      furMain: '#cbd5e1',
      furDark: '#1e293b',
      furLight: '#f1f5f9',
      belly: '#f8fafc',
      mask: '#0f172a',
      eyebrows: '#38bdf8',
      snout: '#f8fafc',
      nose: '#0284c7',
      eyeWhite: '#ffffff',
      eyePupil: '#0f172a',
      eyeIris: '#06b6d4',
      earInner: '#67e8f9',
      paws: '#0f172a',
      claws: '#38bdf8',
      tailRingLight: '#94a3b8',
      tailRingDark: '#0284c7',
      accent: '#06b6d4',
    },
    accessory: {
      type: 'helmet',
      color: 'rgba(56, 189, 248, 0.45)',
      secondaryColor: '#0284c7',
    },
  },

  // 7. Ninja Bandit
  {
    id: 'ninja_bandit',
    name: 'Ninja Bandit',
    subtitle: 'Shadow of the sill',
    description: 'Silent claws glide along brick cornices so quietly that even nesting hawks fail to notice.',
    tagline: 'Silent steps. Swift ascents.',
    badge: '🥷',
    themeColor: '#10b981',
    palette: {
      furMain: '#18181b',
      furDark: '#09090b',
      furLight: '#3f3f46',
      belly: '#27272a',
      mask: '#000000',
      eyebrows: '#10b981',
      snout: '#27272a',
      nose: '#000000',
      eyeWhite: '#ffffff',
      eyePupil: '#000000',
      eyeIris: '#10b981',
      earInner: '#3f3f46',
      paws: '#09090b',
      claws: '#71717a',
      tailRingLight: '#27272a',
      tailRingDark: '#09090b',
      accent: '#10b981',
    },
    accessory: {
      type: 'headband',
      color: '#dc2626',
      secondaryColor: '#facc15',
    },
  },

  // 8. Larry
  {
    id: 'larry',
    name: 'Larry',
    subtitle: 'Just an honest working raccoon',
    description: 'Sporting high-vis trucker cap and rugged determination. Never met a dumpster he couldn’t conquer.',
    tagline: 'Clock in, climb up, clock out.',
    badge: '🧢',
    themeColor: '#f97316',
    palette: {
      furMain: '#78350f',
      furDark: '#451a03',
      furLight: '#b45309',
      belly: '#fef3c7',
      mask: '#291404',
      eyebrows: '#ffffff',
      snout: '#fef3c7',
      nose: '#18181b',
      eyeWhite: '#ffffff',
      eyePupil: '#18181b',
      eyeIris: '#d97706',
      earInner: '#fed7aa',
      paws: '#451a03',
      claws: '#d97706',
      tailRingLight: '#b45309',
      tailRingDark: '#451a03',
      accent: '#f97316',
    },
    accessory: {
      type: 'cap',
      color: '#ea580c',
      secondaryColor: '#1d4ed8',
    },
  },

  // 9. Chef Scraps
  {
    id: 'chef_scraps',
    name: 'Chef Scraps',
    subtitle: 'Five-star dumpster gourmet',
    description: 'Wearing a tall pristine chef toque. Connoisseur of half-eaten baguettes and gourmet alley treats.',
    tagline: 'Every trash can is a tasting menu.',
    badge: '👨‍🍳',
    themeColor: '#e11d48',
    palette: {
      furMain: '#854d0e',
      furDark: '#422006',
      furLight: '#ca8a04',
      belly: '#fefce8',
      mask: '#2e1065',
      eyebrows: '#ffffff',
      snout: '#fefce8',
      nose: '#18181b',
      eyeWhite: '#ffffff',
      eyePupil: '#18181b',
      eyeIris: '#e11d48',
      earInner: '#fbcfe8',
      paws: '#422006',
      claws: '#e2e8f0',
      tailRingLight: '#ca8a04',
      tailRingDark: '#422006',
      accent: '#e11d48',
    },
    accessory: {
      type: 'chef_hat',
      color: '#ffffff',
      secondaryColor: '#ef4444',
    },
  },

  // 10. Unicorny
  {
    id: 'unicorny',
    name: 'Unicorny',
    subtitle: 'Magical rooftop dreamer',
    description: 'Believes with all its heart in rooftop rainbows, pastel miracles, and enchanted pretzel finds.',
    tagline: 'Pure magic on all 25 skyscraper floors.',
    badge: '🦄',
    themeColor: '#ec4899',
    palette: {
      furMain: '#f472b6',
      furDark: '#db2777',
      furLight: '#fbcfe8',
      belly: '#fff1f2',
      mask: '#be185d',
      eyebrows: '#ffffff',
      snout: '#fff1f2',
      nose: '#ec4899',
      eyeWhite: '#ffffff',
      eyePupil: '#581c87',
      eyeIris: '#8b5cf6',
      earInner: '#fdf2f8',
      paws: '#db2777',
      claws: '#fef08a',
      tailRingLight: '#fbcfe8',
      tailRingDark: '#c084fc',
      accent: '#facc15',
    },
    accessory: {
      type: 'horn',
      color: '#facc15',
      secondaryColor: '#f472b6',
    },
  },

  // 11. Trash Queen
  {
    id: 'trash_queen',
    name: 'Trash Queen',
    subtitle: 'Monarch of the metropolis',
    description: 'Reigns supreme over downtown masonry with a polished golden tiara and majestic royal presence.',
    tagline: 'Bow before her royal fluffiness.',
    badge: '👑',
    themeColor: '#eab308',
    palette: {
      furMain: '#581c87',
      furDark: '#2e1065',
      furLight: '#9333ea',
      belly: '#faf5ff',
      mask: '#1e1b4b',
      eyebrows: '#ffffff',
      snout: '#faf5ff',
      nose: '#0f172a',
      eyeWhite: '#ffffff',
      eyePupil: '#1e1b4b',
      eyeIris: '#facc15',
      earInner: '#f5d0fe',
      paws: '#2e1065',
      claws: '#fef08a',
      tailRingLight: '#c084fc',
      tailRingDark: '#3b0764',
      accent: '#eab308',
    },
    accessory: {
      type: 'tiara',
      color: '#facc15',
      secondaryColor: '#ef4444',
    },
  },

  // 12. Hairball
  {
    id: 'hairball',
    name: 'Hairball',
    subtitle: 'Maximum fluff, minimum aerodynamic',
    description: '100% extra fur volume. Catches skyscraper thermals like an adorable spherical cloud of fuzz.',
    tagline: 'Too round to fail, too fluffy to fall.',
    badge: '🧶',
    themeColor: '#84cc16',
    palette: {
      furMain: '#a8a29e',
      furDark: '#57534e',
      furLight: '#e7e5e4',
      belly: '#fafaf9',
      mask: '#44403c',
      eyebrows: '#ffffff',
      snout: '#fafaf9',
      nose: '#1c1917',
      eyeWhite: '#ffffff',
      eyePupil: '#1c1917',
      eyeIris: '#65a30d',
      earInner: '#f5d0fe',
      paws: '#44403c',
      claws: '#d6d3d1',
      tailRingLight: '#d6d3d1',
      tailRingDark: '#57534e',
      accent: '#84cc16',
    },
    accessory: {
      type: 'fluff',
      color: '#d6d3d1',
      secondaryColor: '#a8a29e',
    },
  },
];

/**
 * Retrieve a character configuration by its unique ID.
 * Defaults to '#mprraccoon' if not found.
 */
export function getCharacterConfig(characterId?: string | null): CharacterConfig {
  if (!characterId) return RACCOON_ROSTER[0];
  const found = RACCOON_ROSTER.find((c) => c.id === characterId);
  return found || RACCOON_ROSTER[0];
}

/**
 * Read the user's saved character choice from localStorage, defaulting to 'mprraccoon'.
 */
export function getSavedCharacterId(): string {
  try {
    const saved = localStorage.getItem('rotr_selected_character');
    if (saved && RACCOON_ROSTER.some((c) => c.id === saved)) {
      return saved;
    }
  } catch {}
  return 'mprraccoon';
}

/**
 * Persist the user's character choice to localStorage.
 */
export function saveSelectedCharacterId(characterId: string) {
  try {
    localStorage.setItem('rotr_selected_character', characterId);
  } catch {}
}
