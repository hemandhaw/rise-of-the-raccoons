/**
 * Rise of the Raccoons! - Skyscraper Data Generator
 * Builds the 25-floor architectural model with deterministic procedural details.
 */

import { GAME_CONFIG } from './config';
import { FloorData, WindowDecoration } from './types';

export function generateSkyscraperFloors(): FloorData[] {
  const { TOTAL_FLOORS, FLOOR_HEIGHT_RATIO, WINDOWS_PER_FLOOR } = GAME_CONFIG.SKYSCRAPER;
  const floors: FloorData[] = [];

  const neonSigns: Record<number, { text: string; color: string }> = {
    4: { text: 'PAW MOTEL', color: GAME_CONFIG.PALETTE.NEON_SIGN_CYAN },
    9: { text: 'NIGHT ROAST', color: GAME_CONFIG.PALETTE.NEON_SIGN_AMBER },
    14: { text: 'MIDNIGHT DINER', color: GAME_CONFIG.PALETTE.NEON_SIGN_PINK },
    19: { text: 'SKYLINE LOUNGE', color: GAME_CONFIG.PALETTE.NEON_SIGN_CYAN },
    24: { text: 'PENTHOUSE SUITE', color: GAME_CONFIG.PALETTE.NEON_SIGN_AMBER },
  };

  const windowColors = [
    GAME_CONFIG.PALETTE.WINDOW_LIT_WARM,
    GAME_CONFIG.PALETTE.WINDOW_LIT_AMBER,
    GAME_CONFIG.PALETTE.WINDOW_LIT_CYAN,
  ];

  for (let floorNum = 1; floorNum <= TOTAL_FLOORS; floorNum++) {
    // Floor 1 is ground level, Floor 25 is rooftop
    let theme: FloorData['theme'] = 'residential';
    if (floorNum === 1) theme = 'ground_lobby';
    else if (floorNum === TOTAL_FLOORS) theme = 'rooftop';
    else if (floorNum % 3 === 0) theme = 'office';
    else if (floorNum >= 22) theme = 'penthouse';

    const windows: WindowDecoration[] = [];
    
    // Calculate window geometry in world space
    const buildingWidth = GAME_CONFIG.SKYSCRAPER.BUILDING_WIDTH_RATIO;
    const buildingLeft = GAME_CONFIG.SKYSCRAPER.BUILDING_CENTER_X - buildingWidth / 2;
    const winW = GAME_CONFIG.SKYSCRAPER.WINDOW_WIDTH_RATIO;
    const winH = GAME_CONFIG.SKYSCRAPER.WINDOW_HEIGHT_RATIO;
    const totalWinsWidth = WINDOWS_PER_FLOOR * winW;
    const remainingSpace = buildingWidth - totalWinsWidth;
    const gap = remainingSpace / (WINDOWS_PER_FLOOR + 1);

    const worldY = (floorNum - 1) * FLOOR_HEIGHT_RATIO;
    const floorTopWorldY = worldY + FLOOR_HEIGHT_RATIO;
    const windowTopWorldY = floorTopWorldY - GAME_CONFIG.SKYSCRAPER.WINDOW_TOP_OFFSET_RATIO * FLOOR_HEIGHT_RATIO;
    const windowBottomWorldY = windowTopWorldY - winH;
    const sillY = windowBottomWorldY;

    // Generate identical accessible windows for all skyscraper floors (Floor 1 to 24)
    if (theme !== 'rooftop') {
      for (let w = 0; w < WINDOWS_PER_FLOOR; w++) {
        // Deterministic seed based on floor and window for pleasant interior lighting
        const seed = Math.sin(floorNum * 17 + w * 29) * 10000;
        const rand = seed - Math.floor(seed);

        // All windows uniform vibrant blue
        const lit = true;
        const color = GAME_CONFIG.PALETTE.WINDOW_VIBRANT_BLUE;

        const type: WindowDecoration['type'] = 'none';
        const curtainStyle: WindowDecoration['curtainStyle'] = 'none';
        const curtainColor = '';

        const worldLeft = buildingLeft + gap * (w + 1) + winW * w;
        const worldRight = worldLeft + winW;
        const sillOverhang = GAME_CONFIG.SKYSCRAPER.SILL_OVERHANG_RATIO;

        windows.push({
          index: w,
          lit,
          color,
          type,
          curtainStyle,
          curtainColor,
          sashOpenRatio: 0.0,
          hasACUnit: false, // All window sills are identically accessible and unobstructed
          worldLeft,
          worldRight,
          worldBottom: windowBottomWorldY,
          worldTop: windowTopWorldY,
          sillY,
          sillLeft: worldLeft - sillOverhang,
          sillRight: worldRight + sillOverhang,
        });
      }
    }

    // Window sills remain unobstructed by railings
    const hasBalcony = false;
    const balconySide = floorNum % 2 === 0 ? 'left' : 'right';

    const neon = neonSigns[floorNum];

    floors.push({
      floorNumber: floorNum,
      worldY,
      height: FLOOR_HEIGHT_RATIO,
      theme,
      windows,
      hasBalcony,
      balconySide,
      neonSignText: neon?.text,
      neonColor: neon?.color,
    });
  }

  return floors;
}
