/**
 * Rise of the Raccoons! - Canvas Renderer
 * Pure canvas 2D rendering pipeline with zero hardcoded pixel offsets.
 * All positions and scales are strictly proportional to canvas width & height.
 */

import { GAME_CONFIG } from './config';
import {
  AtmosphereState,
  ClimbingSquirrel,
  FloorData,
  GameEngineState,
  GeeseFlock,
  HighMistCloud,
  HotAirBalloon,
  LightningStrike,
  RaccoonPosition,
  SnackItem,
  SoaringBird,
  SpookEvent,
  StreetVehicle,
  TrashParticle,
  ElectricSpark,
  FallingLaundryItem,
  LaundryLineState,
} from './types';
import { ENCOUNTERS_BY_ID } from './encounterData';

export class GameRenderer {
  private birdSeeds: Array<{ x: number; y: number; speed: number; phase: number; scale: number }> = [];
  private cloudSeeds: Array<{ x: number; y: number; width: number; height: number; speed: number; opacity: number }> = [];

  constructor() {
    // Generate deterministic daytime birds gliding across the open city sky
    for (let i = 0; i < 14; i++) {
      this.birdSeeds.push({
        x: (i * 0.18 + 0.08) % 1.6 - 0.3,
        y: 0.06 + (i * 0.085) % 0.88,
        speed: 0.025 + (i % 3) * 0.012,
        phase: i * 1.7,
        scale: 0.75 + (i % 4) * 0.22,
      });
    }

    // Generate deterministic drifting daytime cumulus clouds
    for (let i = 0; i < 16; i++) {
      this.cloudSeeds.push({
        x: (i * 0.16 + 0.04) % 1.5,
        y: 0.04 + (i * 0.07) % 0.92,
        width: 0.38 + (i % 3) * 0.14,
        height: 0.09 + (i % 2) * 0.035,
        speed: 0.006 + (i % 4) * 0.003,
        opacity: 0.85 + (i % 3) * 0.1,
      });
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    state: GameEngineState,
    floors: FloorData[],
    timeSeconds: number
  ) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Clear frame
    ctx.clearRect(0, 0, W, H);

    // Save initial state
    ctx.save();

    // Camera shake if any (disabled when inside trash can or dumpster)
    if (state.camera.shake > 0 && !state.raccoon.isInTrashCan) {
      const shakeMag = state.camera.shake * W * 0.015;
      const ox = (Math.random() - 0.5) * shakeMag;
      const oy = (Math.random() - 0.5) * shakeMag;
      ctx.translate(ox, oy);
    }

    const cameraX = state.camera.x;
    const cameraY = state.camera.y;

    // 1. Draw Atmospheric Sunny Sky, Radiant Sun, Drifting Clouds, Sunbeams & Urban Birds
    this.drawSkyAndParallax(ctx, W, H, cameraX, cameraY, timeSeconds);

    // 2. Draw Distant City Silhouettes (Parallax on both sides of the skyscraper)
    this.drawDistantCity(ctx, W, H, cameraX, cameraY, timeSeconds);

    // 3. Draw The 25-Floor Skyscraper (Wider than viewport, scrolling horizontally)
    this.drawSkyscraper(ctx, W, H, cameraX, cameraY, floors, timeSeconds, state.spooks);

    // Altitude Atmospheric Features: Climbing Squirrels scurrying on building walls
    if (state.atmosphere) {
      this.drawClimbingSquirrels(ctx, W, H, state.atmosphere.squirrels, cameraX, cameraY, timeSeconds);
    }

    // Slice 3: Draw Window Spook Hazard Events
    this.drawSpooks(ctx, W, H, state.spooks, cameraX, cameraY, timeSeconds);

    // Slice 3: Draw Snacks Resting on Window Sills
    this.drawSnacks(ctx, W, H, state.snacks, cameraX, cameraY, timeSeconds);

    // Level 7 Laundry Clothesline
    if (state.laundryLine) {
      this.drawLevel7LaundryLine(ctx, W, H, state.laundryLine, floors, cameraX, cameraY);
    }

    // 4. Draw Alley Trash Cans, Large Commercial Dumpster & Popping Animated Trash Debris
    this.drawAlleyTrashCanAndDebris(ctx, W, H, state, cameraX, cameraY, timeSeconds);

    // 5. Draw Cute Illustrated Raccoon Character
    this.drawRaccoon(ctx, W, H, state.raccoon, cameraX, cameraY, timeSeconds);

    // Slice 3: Draw Floating Badges & Sparkle Particles (drawn above raccoon)
    this.drawSnackParticlesAndText(ctx, W, H, state, cameraX, cameraY, timeSeconds);

    // Electric Sparks from telephone wire contact
    if (state.electricSparks && state.electricSparks.length > 0) {
      this.drawElectricSparks(ctx, W, H, state.electricSparks, cameraX, cameraY);
    }

    // Altitude Atmospheric Features (Foreground: Hot Air Balloons, Geese Flocks, Soaring Hawks, Thick Opaque Clouds & Lightning Flash - in front of building and raccoon, visibly blocking raccoon)
    if (state.atmosphere) {
      this.drawAtmosphereForeground(ctx, W, H, state.atmosphere, cameraX, cameraY, timeSeconds);
    }

    ctx.restore();
  }

  /**
   * Reference width unit for horizontal world coordinates (maintains 1:1 undistorted aspect ratio on widescreen)
   */
  public getUnitW(W: number, H: number): number {
    return Math.min(W, H * GAME_CONFIG.ASPECT_RATIO);
  }

  /**
   * Converts a world X coordinate to screen X coordinate (Horizontal camera tracking)
   */
  public worldToScreenX(worldX: number, cameraX: number, W: number, H?: number): number {
    const refH = H ?? (W / GAME_CONFIG.ASPECT_RATIO);
    const unitW = this.getUnitW(W, refH);
    return W * 0.5 + (worldX - cameraX) * unitW;
  }

  /**
   * Converts a world Y coordinate (in height units) to screen Y coordinate
   */
  private worldToScreenY(worldY: number, cameraY: number, H: number): number {
    const leadOffset = GAME_CONFIG.CAMERA.VERTICAL_LEAD_OFFSET;
    return H * leadOffset - (worldY - cameraY) * H;
  }

  /**
   * Draw atmospheric daytime sky, radiant sun, drifting cumulus clouds, sunbeams, and gliding urban birds
   */
  private drawSkyAndParallax(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const maxClimb = GAME_CONFIG.SKYSCRAPER.TOTAL_FLOORS * GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO;
    const climbRatio = Math.max(0, Math.min(1, cameraY / maxClimb));
    const unitW = this.getUnitW(W, H);

    // Sky gradient: brilliant high-altitude cobalt/azure shifting to warm sunny horizon at ground
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    if (climbRatio < 0.4) {
      grad.addColorStop(0, GAME_CONFIG.PALETTE.SKY_MID);
      grad.addColorStop(0.65, GAME_CONFIG.PALETTE.SKY_DUSK);
      grad.addColorStop(1, GAME_CONFIG.PALETTE.SKY_HORIZON);
    } else {
      grad.addColorStop(0, GAME_CONFIG.PALETTE.SKY_TOP);
      grad.addColorStop(0.55, GAME_CONFIG.PALETTE.SKY_MID);
      grad.addColorStop(1, GAME_CONFIG.PALETTE.SKY_DUSK);
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 1. Radiant Daytime Sun with Corona, Solar Flares and Parallax
    const sunX = W * 0.5 + (0.32 - (cameraX - 0.5) * 0.08) * unitW;
    const sunY = H * 0.15 - (cameraY * 0.018) * H;
    const sunRadius = Math.max(22, unitW * 0.048);

    // Soft outer solar corona
    const outerCorona = ctx.createRadialGradient(
      sunX,
      sunY,
      sunRadius * 0.3,
      sunX,
      sunY,
      sunRadius * 4.2
    );
    outerCorona.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
    outerCorona.addColorStop(0.35, 'rgba(253, 224, 71, 0.18)');
    outerCorona.addColorStop(0.75, 'rgba(56, 189, 248, 0.08)');
    outerCorona.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = outerCorona;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius * 4.2, 0, Math.PI * 2);
    ctx.fill();

    // Warm rotating solar flare rays
    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.rotate(time * 0.05);
    const rayCount = 8;
    for (let r = 0; r < rayCount; r++) {
      ctx.rotate((Math.PI * 2) / rayCount);
      const rayGrad = ctx.createLinearGradient(0, 0, sunRadius * 2.8, 0);
      rayGrad.addColorStop(0, 'rgba(254, 240, 138, 0.18)');
      rayGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(0, -sunRadius * 0.16);
      ctx.lineTo(sunRadius * 2.8, 0);
      ctx.lineTo(0, sunRadius * 0.16);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Brilliant golden-white Sun Disk
    const sunCoreGrad = ctx.createRadialGradient(
      sunX - sunRadius * 0.15,
      sunY - sunRadius * 0.15,
      sunRadius * 0.1,
      sunX,
      sunY,
      sunRadius
    );
    sunCoreGrad.addColorStop(0, '#ffffff');
    sunCoreGrad.addColorStop(0.7, GAME_CONFIG.PALETTE.SUN_COLOR);
    sunCoreGrad.addColorStop(1, GAME_CONFIG.PALETTE.SUN_CORONA);
    ctx.fillStyle = sunCoreGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    // Subtle sun flare ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = Math.max(1, W * 0.002);
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius * 1.3, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Daytime Sunbeams Filtering Across Sky
    this.drawSunbeams(ctx, W, H, cameraX, time);

    // 3. Drifting Cumulus Clouds
    this.cloudSeeds.forEach((cloud, idx) => {
      // Slow drift + camera parallax
      const cx = (((cloud.x + time * cloud.speed - (cameraX - 0.5) * 0.12) % 1.6 + 1.6) % 1.6 - 0.3) * W;
      const cloudWorldY = cloud.y * (maxClimb + 1.2);
      const cy = this.worldToScreenY(cloudWorldY, cameraY * 0.42, H);
      const cw = cloud.width * W;
      const ch = cloud.height * H;

      if (cy + ch > -H * 0.25 && cy < H * 1.25) {
        ctx.save();
        ctx.globalAlpha = Math.min(1.0, cloud.opacity * (0.85 + 0.15 * Math.sin(time * 0.4 + idx)));

        // Soft shaded cloud base (gentle ambient sky tone)
        ctx.fillStyle = 'rgba(186, 230, 253, 0.38)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + ch * 0.14, cw * 0.46, ch * 0.4, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - cw * 0.22, cy + ch * 0.18, cw * 0.34, ch * 0.35, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + cw * 0.25, cy + ch * 0.16, cw * 0.36, ch * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fluffy cumulus body
        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, cw * 0.42, ch * 0.42, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - cw * 0.22, cy + ch * 0.06, cw * 0.32, ch * 0.36, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + cw * 0.24, cy + ch * 0.05, cw * 0.34, ch * 0.38, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - cw * 0.08, cy - ch * 0.15, cw * 0.26, ch * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();

        // Crisp sunlight rim on top edge
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cx + cw * 0.05, cy - ch * 0.18, cw * 0.34, ch * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    });

    // 4. Gliding Urban Birds (Swallows, Pigeons) Soaring in the Sunny Sky
    this.drawUrbanBirds(ctx, W, H, cameraX, cameraY, time);
  }

  /**
   * Subtle atmospheric sunbeams filtering diagonally across the daytime skyline
   */
  private drawSunbeams(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    time: number
  ) {
    const unitW = this.getUnitW(W, H);
    const sunX = W * 0.5 + (0.32 - (cameraX - 0.5) * 0.08) * unitW;
    const sunY = H * 0.15;

    const beams = [
      { angleOffset: -0.22, width: 0.16, alpha: 0.032, speed: 0.2 },
      { angleOffset: 0.06, width: 0.22, alpha: 0.042, speed: 0.25 },
      { angleOffset: 0.32, width: 0.18, alpha: 0.028, speed: 0.18 },
    ];

    beams.forEach((beam) => {
      const pulse = 0.7 + 0.3 * Math.sin(time * beam.speed);
      const angle = 0.55 + beam.angleOffset;
      const length = H * 1.5;
      const endX = sunX - Math.sin(angle) * length;
      const endY = sunY + Math.cos(angle) * length;
      const beamW = W * beam.width;

      const beamGrad = ctx.createLinearGradient(sunX, sunY, endX, endY);
      beamGrad.addColorStop(0, `rgba(254, 240, 138, ${beam.alpha * pulse * 1.5})`);
      beamGrad.addColorStop(0.6, `rgba(255, 255, 255, ${beam.alpha * pulse})`);
      beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.save();
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(endX - beamW * 0.5, endY);
      ctx.lineTo(endX + beamW * 0.5, endY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }

  /**
   * Urban birds (pigeons/swallows) soaring and flapping across the sunny sky with parallax
   */
  private drawUrbanBirds(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const maxClimb = GAME_CONFIG.SKYSCRAPER.TOTAL_FLOORS * GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO;
    const unitW = this.getUnitW(W, H);

    ctx.save();
    this.birdSeeds.forEach((bird) => {
      // Horizontal flight across sky with parallax
      const bx = (((bird.x + time * bird.speed - (cameraX - 0.5) * 0.1) % 1.5 + 1.5) % 1.5 - 0.25) * W;
      const birdWorldY = bird.y * (maxClimb * 0.85 + 0.5);
      const by = this.worldToScreenY(birdWorldY, cameraY * 0.35, H);

      if (by > -H * 0.1 && by < H * 1.1) {
        const wingSpan = Math.max(9, unitW * 0.018 * bird.scale);
        const flap = Math.sin(time * 6.5 + bird.phase);

        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = Math.max(1.5, unitW * 0.002 * bird.scale);
        ctx.lineCap = 'round';

        // Draw classic elegant gliding bird silhouette (curved wings)
        ctx.beginPath();
        const wingYOffset = flap * wingSpan * 0.35;
        ctx.moveTo(bx - wingSpan, by - wingYOffset);
        ctx.quadraticCurveTo(bx - wingSpan * 0.5, by - wingSpan * 0.42, bx, by);
        ctx.quadraticCurveTo(bx + wingSpan * 0.5, by - wingSpan * 0.42, bx + wingSpan, by - wingYOffset);
        ctx.stroke();

        // Tiny body
        ctx.beginPath();
        ctx.ellipse(bx, by + 1, wingSpan * 0.15, wingSpan * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  /**
   * Distant layered parallax city skyline visible on both sides of the skyscraper
   */
  private drawDistantCity(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    // Ground horizon level in screen space
    const groundScreenY = this.worldToScreenY(0, cameraY * 0.15, H);

    // Layer 1: Far Silhouette (Daytime atmospheric blue haze skyline)
    ctx.fillStyle = GAME_CONFIG.PALETTE.CITY_FAR_SILHOUETTE;
    const farCount = 24;
    const farWidth = W / 4.5;
    const farParallax = (cameraX - 0.5) * W * 0.16;

    for (let i = -7; i <= farCount; i++) {
      const bx = i * farWidth - farParallax;
      const bHeight = H * (0.32 + Math.sin(i * 2.3) * 0.14);
      const by = groundScreenY - bHeight;

      if (by < H && by + bHeight > 0) {
        ctx.fillRect(bx, by, farWidth * 0.94, bHeight);

        // Sky reflections in distant daytime glass towers
        ctx.fillStyle = GAME_CONFIG.PALETTE.CITY_WINDOW_DIM;
        const cols = 3;
        const rows = 14;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (Math.sin(i * 13 + r * 7 + c * 3) > 0.28) {
              const wx = bx + (c + 0.5) * (farWidth * 0.24);
              const wy = by + (r + 0.5) * (bHeight / rows);
              ctx.fillRect(wx, wy, W * 0.007, H * 0.007);
            }
          }
        }
        ctx.fillStyle = GAME_CONFIG.PALETTE.CITY_FAR_SILHOUETTE;

        // Rooftop antenna / spire
        if (i % 3 === 0) {
          const antennaX = bx + farWidth * 0.5;
          const antennaH = H * 0.05;
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(antennaX, by);
          ctx.lineTo(antennaX, by - antennaH);
          ctx.stroke();

          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(antennaX, by - antennaH, W * 0.004, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Layer 2: Near Silhouette (Daytime slate steel & architectural structures)
    ctx.fillStyle = GAME_CONFIG.PALETTE.CITY_NEAR_SILHOUETTE;
    const nearCount = 18;
    const nearWidth = W / 3.8;
    const nearParallax = (cameraX - 0.5) * W * 0.24;

    for (let i = -6; i <= nearCount; i++) {
      const bx = i * nearWidth - nearParallax;
      const bHeight = H * (0.22 + Math.cos(i * 3.1) * 0.08);
      const by = groundScreenY - bHeight;

      if (by < H && by + bHeight > 0) {
        ctx.fillRect(bx, by, nearWidth * 0.9, bHeight);

        // Daytime sunlit glass windows
        for (let w = 0; w < 4; w++) {
          if (Math.sin(i * 17 + w * 11) > 0.35) {
            ctx.fillStyle = GAME_CONFIG.PALETTE.CITY_WINDOW_LIT;
            const wx = bx + (w + 0.5) * (nearWidth * 0.2);
            const wy = by + (w * 0.2 + 0.3) * bHeight;
            ctx.fillRect(wx, wy, W * 0.009, H * 0.009);
            ctx.fillStyle = GAME_CONFIG.PALETTE.CITY_NEAR_SILHOUETTE;
          }
        }

        // Rooftop water tank on selected buildings
        if ((i + 7) % 4 === 1) {
          const tankX = bx + nearWidth * 0.65;
          const tankW = nearWidth * 0.16;
          const tankH = H * 0.026;
          const tankY = by - tankH - H * 0.008;

          // Stilts
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(tankX + tankW * 0.2, by);
          ctx.lineTo(tankX + tankW * 0.2, tankY + tankH);
          ctx.moveTo(tankX + tankW * 0.8, by);
          ctx.lineTo(tankX + tankW * 0.8, tankY + tankH);
          ctx.stroke();

          // Tank cylinder
          ctx.fillStyle = '#b45309';
          ctx.fillRect(tankX, tankY, tankW, tankH);

          // Conical roof
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.moveTo(tankX - tankW * 0.05, tankY);
          ctx.lineTo(tankX + tankW * 0.5, tankY - H * 0.012);
          ctx.lineTo(tankX + tankW * 1.05, tankY);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = GAME_CONFIG.PALETTE.CITY_NEAR_SILHOUETTE;
        }
      }
    }
  }

  /**
   * Render the 25-floor skyscraper architecture
   */
  private drawSkyscraper(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    cameraY: number,
    floors: FloorData[],
    time: number,
    spooks?: SpookEvent[]
  ) {
    const { BUILDING_WIDTH_RATIO, BUILDING_CENTER_X } = GAME_CONFIG.SKYSCRAPER;
    const unitW = this.getUnitW(W, H);
    const buildingWidth = unitW * BUILDING_WIDTH_RATIO;
    const buildingLeft = this.worldToScreenX(BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2, cameraX, W, H);
    const buildingRight = buildingLeft + buildingWidth;

    // Filter floors that intersect current viewport
    floors.forEach((floor) => {
      const floorBottomScreenY = this.worldToScreenY(floor.worldY, cameraY, H);
      const floorHeightScreen = floor.height * H;
      const floorTopScreenY = floorBottomScreenY - floorHeightScreen;

      // Frustum culling: skip if offscreen
      if (floorBottomScreenY < -H * 0.2 || floorTopScreenY > H * 1.2) {
        return;
      }

      // Draw Main Floor Facade
      this.drawFloorFacade(
        ctx,
        W,
        H,
        buildingLeft,
        buildingWidth,
        floorTopScreenY,
        floorHeightScreen,
        floor,
        time
      );

      // Draw Floor Separation Cornice & Floor Number Badge
      this.drawFloorCornice(
        ctx,
        W,
        H,
        buildingLeft,
        buildingWidth,
        floorTopScreenY,
        floor.floorNumber
      );

      // Draw Windows & Architectural Details
      this.drawFloorWindows(
        ctx,
        W,
        H,
        cameraX,
        cameraY,
        floorTopScreenY,
        floorHeightScreen,
        floor,
        time,
        spooks
      );

      // Fire Escape on the right flank
      this.drawFireEscape(
        ctx,
        W,
        H,
        buildingRight,
        floorTopScreenY,
        floorHeightScreen,
        floor.floorNumber
      );

      // Optional Balcony
      if (floor.hasBalcony) {
        this.drawBalcony(
          ctx,
          W,
          H,
          buildingLeft,
          buildingWidth,
          floorBottomScreenY,
          floor.balconySide
        );
      }

      // Neon Sign if present
      if (floor.neonSignText && floor.neonColor) {
        this.drawNeonSign(
          ctx,
          W,
          H,
          buildingLeft + buildingWidth * 0.5,
          floorTopScreenY + floorHeightScreen * 0.25,
          floor.neonSignText,
          floor.neonColor,
          time
        );
      }

      // Rooftop Details on Floor 25
      if (floor.floorNumber === GAME_CONFIG.SKYSCRAPER.TOTAL_FLOORS) {
        this.drawRooftop(
          ctx,
          W,
          H,
          buildingLeft,
          buildingWidth,
          floorTopScreenY,
          time
        );
      }

      // Ground Lobby on Floor 1
      if (floor.floorNumber === 1) {
        this.drawGroundEntrance(
          ctx,
          W,
          H,
          buildingLeft,
          buildingWidth,
          floorBottomScreenY,
          floorHeightScreen
        );
      }
    });

    // Building Interactive Features & Props
    this.drawIvyVines(ctx, W, H, cameraX, cameraY, time);
    this.drawDrainpipes(ctx, W, H, cameraX, cameraY);
    this.drawFireEscapeSystem(ctx, W, H, cameraX, cameraY);
    this.drawDiagonalSlide(ctx, W, H, cameraX, cameraY);
    this.drawCellTowerBTS(ctx, W, H, cameraX, cameraY, time);
  }

  /**
   * Facade background with subtle brick mortar lines and crisp edge quoins against the open sky
   */
  private drawFloorFacade(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    left: number,
    width: number,
    top: number,
    height: number,
    floor: FloorData,
    time: number
  ) {
    // Drop shadow cast by skyscraper into the evening sky on the left
    const leftShadow = ctx.createLinearGradient(left - W * 0.035, 0, left, 0);
    leftShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
    leftShadow.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = leftShadow;
    ctx.fillRect(left - W * 0.035, top, W * 0.035, height);

    // Primary wall background
    ctx.fillStyle = GAME_CONFIG.PALETTE.FACADE_PRIMARY;
    ctx.fillRect(left, top, width, height);

    // Drop shadow cast on the right into the sky
    const rightShadow = ctx.createLinearGradient(left + width, 0, left + width + W * 0.035, 0);
    rightShadow.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
    rightShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rightShadow;
    ctx.fillRect(left + width, top, W * 0.035, height);

    // Subtle side pillars for 3D depth
    const pillarWidth = width * 0.05;
    ctx.fillStyle = GAME_CONFIG.PALETTE.FACADE_SECONDARY;
    ctx.fillRect(left, top, pillarWidth, height);
    ctx.fillRect(left + width - pillarWidth, top, pillarWidth, height);

    // Vertical shadows along pillars
    ctx.fillStyle = GAME_CONFIG.PALETTE.PILLAR_SHADOW;
    ctx.fillRect(left + pillarWidth, top, width * 0.02, height);
    ctx.fillRect(left + width - pillarWidth - width * 0.02, top, width * 0.02, height);

    // Classic stone quoins running vertically up the left and right building edges
    const quoinCount = 5;
    const quoinHeight = height / quoinCount;
    for (let q = 0; q < quoinCount; q++) {
      const qy = top + q * quoinHeight;
      const isWide = (floor.floorNumber * 5 + q) % 2 === 0;
      const qw = isWide ? W * 0.024 : W * 0.015;

      // Left corner quoin
      ctx.fillStyle = isWide ? '#f1f5f9' : '#e2e8f0';
      ctx.fillRect(left, qy + quoinHeight * 0.05, qw, quoinHeight * 0.9);
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(left, qy + quoinHeight * 0.05, qw, quoinHeight * 0.9);

      // Right corner quoin
      ctx.fillStyle = isWide ? '#f1f5f9' : '#e2e8f0';
      ctx.fillRect(left + width - qw, qy + quoinHeight * 0.05, qw, quoinHeight * 0.9);
      ctx.strokeRect(left + width - qw, qy + quoinHeight * 0.05, qw, quoinHeight * 0.9);
    }

    // Subtle brick courses
    ctx.strokeStyle = GAME_CONFIG.PALETTE.FACADE_BRICK_LINE;
    ctx.lineWidth = Math.max(1, H * 0.0015);
    const brickRows = 8;
    for (let r = 1; r < brickRows; r++) {
      const by = top + (r / brickRows) * height;
      ctx.beginPath();
      ctx.moveTo(left + pillarWidth, by);
      ctx.lineTo(left + width - pillarWidth, by);
      ctx.stroke();
    }
  }

  /**
   * Architectural stone cornice with floor number badge
   */
  private drawFloorCornice(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    left: number,
    width: number,
    top: number,
    floorNum: number
  ) {
    const corniceHeight = H * GAME_CONFIG.SKYSCRAPER.CORNICE_HEIGHT_RATIO;
    const overhang = width * 0.025;

    // Cornice body
    ctx.fillStyle = GAME_CONFIG.PALETTE.CORNICE_LIGHT;
    ctx.fillRect(left - overhang, top, width + overhang * 2, corniceHeight);

    // Cornice shadow underneath
    ctx.fillStyle = GAME_CONFIG.PALETTE.CORNICE_DARK;
    ctx.fillRect(left - overhang, top + corniceHeight, width + overhang * 2, corniceHeight * 0.35);

    // Floor Number Plaque (Centered brass/stone plate)
    const plaqueWidth = width * 0.24;
    const plaqueHeight = corniceHeight * 0.85;
    const plaqueX = left + width * 0.5 - plaqueWidth / 2;
    const plaqueY = top + (corniceHeight - plaqueHeight) / 2;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(plaqueX, plaqueY, plaqueWidth, plaqueHeight);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = Math.max(1, W * 0.002);
    ctx.strokeRect(plaqueX, plaqueY, plaqueWidth, plaqueHeight);

    // Floor Text
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `bold ${Math.max(10, Math.floor(H * 0.015))}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const floorStr = floorNum < 10 ? `Floor 0${floorNum}` : `Floor ${floorNum}`;
    ctx.fillText(floorStr, left + width * 0.5, plaqueY + plaqueHeight * 0.52);
  }

  /**
   * Rhythmic windows with 90% transparent glass, ambient room interiors,
   * residents and spooks behind the glass (full vivid color only when slid open),
   * architectural dividers, sills, and AC units.
   */
  private drawFloorWindows(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    cameraY: number,
    floorTopScreenY: number,
    floorHeightScreen: number,
    floor: FloorData,
    time: number,
    spooks?: SpookEvent[]
  ) {
    if (floor.theme === 'rooftop') return;

    const unitW = this.getUnitW(W, H);

    floor.windows.forEach((win, winIdx) => {
      const wx = this.worldToScreenX(win.worldLeft, cameraX, W, H);
      const winW = (win.worldRight - win.worldLeft) * unitW;
      const winTopScreenY = this.worldToScreenY(win.worldTop, cameraY, H);
      const winBottomScreenY = this.worldToScreenY(win.worldBottom, cameraY, H);
      const winH = winBottomScreenY - winTopScreenY;

      // Frustum culling: skip window if offscreen horizontally
      if (wx + winW < -W * 0.15 || wx > W * 1.15) {
        return;
      }

      const isOpen = (win.sashOpenRatio || 0) > 0.08;
      // People appear in full vivid color ONLY when the window is slid up / open
      const personAlpha = isOpen ? 1.0 : 0.48;

      // 1. Window Frame (Dark outer architectural recess border)
      ctx.fillStyle = GAME_CONFIG.PALETTE.WINDOW_FRAME;
      ctx.fillRect(wx - W * 0.005, winTopScreenY - H * 0.004, winW + W * 0.01, winH + H * 0.008);

      // 2. Interior Room Space Behind the Glass (Deep room atmosphere & cozy indoor glow)
      const roomGrad = ctx.createLinearGradient(wx, winTopScreenY, wx, winBottomScreenY);
      roomGrad.addColorStop(0, '#0f172a'); // Top shadow of ceiling
      roomGrad.addColorStop(0.5, '#1e293b'); // Interior living room
      roomGrad.addColorStop(1, '#0f172a'); // Floor shadow
      ctx.fillStyle = roomGrad;
      ctx.fillRect(wx, winTopScreenY, winW, winH);

      // Warm indoor ambient tint
      ctx.fillStyle = 'rgba(254, 243, 199, 0.14)';
      ctx.fillRect(wx, winTopScreenY, winW, winH);

      // 3. Spawn People Behind The Glass
      const winCenterX = (win.worldLeft + win.worldRight) * 0.5;
      const winSpook = spooks?.find(
        (s) =>
          (s.floorNumber === floor.floorNumber || (s as any).floor === floor.floorNumber) &&
          Math.abs(s.x - winCenterX) < 0.06
      );

      ctx.save();
      ctx.beginPath();
      ctx.rect(wx, winTopScreenY, winW, winH);
      ctx.clip();

      if (winSpook && (winSpook.state === 'active' || winSpook.state === 'retreating' || winSpook.state === 'warning')) {
        this.renderSingleSpookBehindGlass(
          ctx,
          W,
          H,
          winSpook,
          wx + winW * 0.5,
          winBottomScreenY,
          winW,
          winH,
          time,
          personAlpha,
          isOpen
        );
      } else {
        // Deterministic ambient resident inside apartment
        const residentSeed = (floor.floorNumber * 13 + winIdx * 7) % 10;
        if (residentSeed < 4) {
          this.drawAmbientResidentBehindGlass(
            ctx,
            W,
            H,
            wx + winW * 0.5,
            winBottomScreenY,
            winW,
            winH,
            residentSeed,
            time,
            personAlpha,
            isOpen
          );
        }
      }
      ctx.restore();

      // 4. 90% Transparency Glass Layer (10% opacity)
      // When the lower sash slides up, the opened gap has NO glass in front of the person
      const sashOffset = (win.sashOpenRatio || 0) * winH * 0.44;
      const sashCrossY = winTopScreenY + winH * 0.48 - sashOffset;

      ctx.save();
      ctx.beginPath();
      ctx.rect(wx, winTopScreenY, winW, winH);
      ctx.clip();

      // 90% transparent glass gradient (10% opacity)
      const glassGrad = ctx.createLinearGradient(wx, winTopScreenY, wx, winBottomScreenY);
      glassGrad.addColorStop(0, 'rgba(56, 189, 248, 0.10)'); // 90% transparent sky blue highlight
      glassGrad.addColorStop(0.4, 'rgba(14, 165, 233, 0.10)'); // 90% transparent azure
      glassGrad.addColorStop(1, 'rgba(2, 132, 199, 0.10)'); // 90% transparent deep blue
      ctx.fillStyle = glassGrad;

      // Upper fixed pane: always has 90% transparent glass
      ctx.fillRect(wx, winTopScreenY, winW, winH * 0.48);

      // Sliding lower pane: slides up with sashCrossY
      const slidingPaneH = winBottomScreenY - sashOffset - sashCrossY;
      if (slidingPaneH > 0) {
        ctx.fillRect(wx, sashCrossY, winW, slidingPaneH);
      }

      // 90% transparent diagonal sheen reflection strip (10% opacity)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.beginPath();
      ctx.moveTo(wx + winW * 0.12, winTopScreenY);
      ctx.lineTo(wx + winW * 0.42, winTopScreenY);
      ctx.lineTo(wx + winW * 0.12, winBottomScreenY - sashOffset);
      ctx.lineTo(wx - winW * 0.18, winBottomScreenY - sashOffset);
      ctx.closePath();
      ctx.fill();

      // Subtle pane perimeter stroke
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(wx, winTopScreenY, winW, winH * 0.48);
      if (slidingPaneH > 0) {
        ctx.strokeRect(wx, sashCrossY, winW, slidingPaneH);
      }

      // Horizontal & vertical window pane dividers (with sliding lower sash)
      ctx.strokeStyle = GAME_CONFIG.PALETTE.WINDOW_FRAME;
      ctx.lineWidth = Math.max(1.5, W * 0.0025);
      ctx.beginPath();
      // Upper fixed vertical divider
      ctx.moveTo(wx + winW * 0.5, winTopScreenY);
      ctx.lineTo(wx + winW * 0.5, winTopScreenY + winH * 0.48);
      // Sliding middle horizontal rail
      ctx.moveTo(wx, sashCrossY);
      ctx.lineTo(wx + winW, sashCrossY);
      // Sliding lower vertical divider
      ctx.moveTo(wx + winW * 0.5, sashCrossY);
      ctx.lineTo(wx + winW * 0.5, winBottomScreenY - sashOffset);
      ctx.stroke();

      ctx.restore();

      // 5. Air Conditioner Unit (in front of glass, mounted on window frame)
      if (win.hasACUnit) {
        const acW = winW * 0.65;
        const acH = winH * 0.36;
        const acX = wx + (winW - acW) / 2;
        const acY = winTopScreenY + winH - acH * 0.35;

        ctx.fillStyle = '#475569';
        ctx.fillRect(acX, acY, acW, acH);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(acX + acW * 0.1, acY + acH * 0.2, acW * 0.45, acH * 0.6);

        // Slats
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        for (let s = 1; s <= 3; s++) {
          const sy = acY + (s / 4) * acH;
          ctx.beginPath();
          ctx.moveTo(acX + acW * 0.12, sy);
          ctx.lineTo(acX + acW * 0.5, sy);
          ctx.stroke();
        }
      }

      // 6. Distinctive Window Sill (Solid tangible ledge in front of glass where snacks rest and raccoon climbs)
      const sillX = this.worldToScreenX(win.sillLeft, cameraX, W, H);
      const sillW = (win.sillRight - win.sillLeft) * unitW;
      const sillScreenY = winBottomScreenY;
      const sillH = H * GAME_CONFIG.SKYSCRAPER.SILL_HEIGHT_RATIO;

      // Top highlighted surface of the sill
      ctx.fillStyle = GAME_CONFIG.PALETTE.WINDOW_SILL_TOP;
      ctx.fillRect(sillX, sillScreenY, sillW, sillH * 0.42);

      // Front face of the sill
      ctx.fillStyle = GAME_CONFIG.PALETTE.WINDOW_SILL_FACE;
      ctx.fillRect(sillX, sillScreenY + sillH * 0.42, sillW, sillH * 0.58);

      // Deep drop shadow onto brick below
      ctx.fillStyle = GAME_CONFIG.PALETTE.WINDOW_SILL_SHADOW;
      ctx.fillRect(sillX + sillW * 0.04, sillScreenY + sillH, sillW * 0.92, sillH * 0.4);
    });
  }

  /**
   * Spawn ambient apartment residents behind the glass:
   * Drawn behind the 90% transparent glass, appearing in full vivid color only when open.
   */
  private drawAmbientResidentBehindGlass(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cx: number,
    sillY: number,
    winW: number,
    winH: number,
    seed: number,
    time: number,
    personAlpha: number,
    isOpen: boolean
  ) {
    ctx.save();
    ctx.globalAlpha = personAlpha;

    const headR = winW * 0.22;
    const headY = sillY - winH * 0.48;
    const bodyY = headY + headR * 0.8;

    switch (seed) {
      case 0: {
        // Tech worker / student with glowing laptop & warm coffee mug
        ctx.fillStyle = '#2563eb'; // Royal blue sweater
        ctx.beginPath();
        ctx.ellipse(cx, bodyY + headR * 0.6, winW * 0.35, winH * 0.22, 0, 0, Math.PI);
        ctx.fill();

        // Face & neck
        ctx.fillStyle = '#ffd1b3';
        ctx.beginPath();
        ctx.arc(cx, headY, headR, 0, Math.PI * 2);
        ctx.fill();

        // Dark hair
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.arc(cx, headY - headR * 0.35, headR * 1.02, Math.PI, 0);
        ctx.fill();

        // Laptop base & glowing screen
        const lapW = winW * 0.48;
        const lapH = winH * 0.18;
        const lapX = cx - lapW * 0.5;
        const lapY = sillY - lapH - winH * 0.02;
        ctx.fillStyle = '#334155';
        ctx.fillRect(lapX, lapY + lapH * 0.7, lapW, lapH * 0.3);
        ctx.fillStyle = '#38bdf8'; // Cyan screen glow
        ctx.fillRect(lapX + lapW * 0.1, lapY, lapW * 0.8, lapH * 0.7);

        // Coffee mug
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(cx + winW * 0.28, sillY - winH * 0.12, winW * 0.12, winH * 0.1);
        break;
      }

      case 1: {
        // Avid bookworm wearing spectacles and reading an open book
        ctx.fillStyle = '#059669'; // Emerald green sweater
        ctx.beginPath();
        ctx.ellipse(cx, bodyY + headR * 0.6, winW * 0.36, winH * 0.24, 0, 0, Math.PI);
        ctx.fill();

        // Face & neck
        ctx.fillStyle = '#fcd34d';
        ctx.beginPath();
        ctx.arc(cx, headY, headR, 0, Math.PI * 2);
        ctx.fill();

        // Curly auburn hair
        ctx.fillStyle = '#92400e';
        for (let i = 0; i < 6; i++) {
          const ang = Math.PI + (i / 5) * Math.PI;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(ang) * headR * 0.95, headY + Math.sin(ang) * headR * 0.95, headR * 0.32, 0, Math.PI * 2);
          ctx.fill();
        }

        // Glasses
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - headR * 0.7, headY - headR * 0.15, headR * 0.55, headR * 0.38);
        ctx.strokeRect(cx + headR * 0.15, headY - headR * 0.15, headR * 0.55, headR * 0.38);
        ctx.beginPath();
        ctx.moveTo(cx - headR * 0.15, headY);
        ctx.lineTo(cx + headR * 0.15, headY);
        ctx.stroke();

        // Open book held up
        const bookW = winW * 0.44;
        const bookH = winH * 0.18;
        const bookX = cx - bookW * 0.5;
        const bookY = sillY - bookH - winH * 0.04;
        ctx.fillStyle = '#f59e0b'; // Gold book cover
        ctx.fillRect(bookX, bookY, bookW, bookH);
        ctx.fillStyle = '#ffffff'; // White pages
        ctx.fillRect(bookX + 2, bookY + 2, bookW * 0.46, bookH - 4);
        ctx.fillRect(bookX + bookW * 0.52, bookY + 2, bookW * 0.46, bookH - 4);
        break;
      }

      case 2: {
        // Cheerful neighbor waving towards window with smartphone
        ctx.fillStyle = '#ea580c'; // Vibrant orange hoodie
        ctx.beginPath();
        ctx.ellipse(cx, bodyY + headR * 0.6, winW * 0.36, winH * 0.24, 0, 0, Math.PI);
        ctx.fill();

        // Face
        ctx.fillStyle = '#fbcfe8';
        ctx.beginPath();
        ctx.arc(cx, headY, headR, 0, Math.PI * 2);
        ctx.fill();

        // Blonde hair bun
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(cx, headY - headR * 0.35, headR * 1.05, Math.PI, 0);
        ctx.arc(cx, headY - headR * 1.05, headR * 0.42, 0, Math.PI * 2);
        ctx.fill();

        // Eyes & smile
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx - headR * 0.3, headY, 2, 0, Math.PI * 2);
        ctx.arc(cx + headR * 0.3, headY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, headY + headR * 0.3, headR * 0.28, 0, Math.PI);
        ctx.stroke();

        // Animated waving hand
        const waveAngle = Math.sin(time * 8) * 0.35;
        ctx.save();
        ctx.translate(cx + headR * 0.9, headY - headR * 0.2);
        ctx.rotate(waveAngle);
        ctx.fillStyle = '#fbcfe8';
        ctx.beginPath();
        ctx.arc(0, 0, headR * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-2, -headR * 0.4, 4, headR * 0.4);
        ctx.restore();
        break;
      }

      case 3:
      default: {
        // Apartment resident with indoor potted succulent / plant on the sill
        ctx.fillStyle = '#9333ea'; // Purple shirt
        ctx.beginPath();
        ctx.ellipse(cx, bodyY + headR * 0.6, winW * 0.36, winH * 0.24, 0, 0, Math.PI);
        ctx.fill();

        // Face
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(cx, headY, headR, 0, Math.PI * 2);
        ctx.fill();

        // Afro hairstyle
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(cx, headY - headR * 0.35, headR * 1.15, 0, Math.PI * 2);
        ctx.fill();
        // Redraw center face over hair
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(cx, headY, headR * 0.88, 0, Math.PI * 2);
        ctx.fill();

        // Terracotta plant pot & green leafy plant on inside ledge
        const potW = winW * 0.28;
        const potH = winH * 0.16;
        const potX = cx + winW * 0.15;
        const potY = sillY - potH - winH * 0.02;
        ctx.fillStyle = '#ea580c'; // Terracotta
        ctx.beginPath();
        ctx.moveTo(potX, potY);
        ctx.lineTo(potX + potW, potY);
        ctx.lineTo(potX + potW * 0.85, potY + potH);
        ctx.lineTo(potX + potW * 0.15, potY + potH);
        ctx.closePath();
        ctx.fill();

        // Lush green leaves
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.ellipse(potX + potW * 0.5, potY - 4, potW * 0.45, potH * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.ellipse(potX + potW * 0.3, potY - 8, potW * 0.35, potH * 0.45, -0.4, 0, Math.PI * 2);
        ctx.ellipse(potX + potW * 0.7, potY - 8, potW * 0.35, potH * 0.45, 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }

  /**
   * Render active Spook inhabitant behind the glass:
   * Full vivid color when open, muted when closed behind glass.
   */
  private renderSingleSpookBehindGlass(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    spook: SpookEvent,
    sx: number,
    sillScreenY: number,
    winW: number,
    winH: number,
    time: number,
    personAlpha: number,
    isOpen: boolean
  ) {
    ctx.save();
    const retreatAlpha = spook.state === 'retreating' ? Math.max(0, spook.timer / 0.45) : 1.0;
    ctx.globalAlpha = personAlpha * retreatAlpha;

    if (spook.signText) {
      // Person holding up cartoon window sign or newspaper
      const headY = sillScreenY - winH * 0.55;
      const pv = spook.personVariant || {
        skinTone: '#ffd1b3',
        hairColor: '#1c1917',
        hairStyle: 'short',
        age: 'adult',
        gender: 'female',
        accessory: 'none',
        shirtColor: '#3b82f6',
      };
      // Shoulders & Shirt
      ctx.fillStyle = pv.shirtColor;
      ctx.beginPath();
      ctx.ellipse(sx, headY + winW * 0.32, winW * 0.36, winH * 0.22, 0, 0, Math.PI);
      ctx.fill();
      // Face
      ctx.fillStyle = pv.skinTone;
      ctx.beginPath();
      ctx.arc(sx, headY, winW * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Sign board or Newspaper
      const isNewspaper = spook.signText === 'DAILY RACCOON' || spook.type === 'spook_newspaper';
      const signW = winW * 0.88;
      const signH = winH * 0.38;
      const signX = sx - signW * 0.5;
      const signY = sillScreenY - winH * 0.42;

      ctx.fillStyle = isNewspaper ? '#f8fafc' : '#fef08a';
      ctx.strokeStyle = isNewspaper ? '#64748b' : '#ca8a04';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(signX, signY, signW, signH, 4);
      ctx.fill();
      ctx.stroke();

      // Sign Text
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.max(8, Math.floor(signW * 0.15))}px 'JetBrains Mono', monospace`;
      ctx.fillText(spook.signText, sx, signY + signH * 0.32);

      if (isNewspaper) {
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(sx, signY + signH * 0.68, signH * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(sx - signH * 0.18, signY + signH * 0.64, signH * 0.36, signH * 0.1);
      } else {
        ctx.fillStyle = '#ea580c';
        ctx.font = `bold ${Math.max(8, Math.floor(signW * 0.11))}px sans-serif`;
        ctx.fillText('★ ★ ★', sx, signY + signH * 0.72);
      }

      // Hands holding sign
      ctx.fillStyle = pv.skinTone;
      ctx.beginPath();
      ctx.arc(signX + 6, signY + signH * 0.5, 6, 0, Math.PI * 2);
      ctx.arc(signX + signW - 6, signY + signH * 0.5, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      switch (spook.type) {
        case 'curious_person': {
          const pv = spook.personVariant || {
            skinTone: '#f59e0b',
            hairColor: '#0f172a',
            hairStyle: 'curly',
            age: 'adult',
            gender: 'female',
            accessory: 'phone',
            shirtColor: '#3b82f6',
          };

          const headR = winW * (pv.age === 'kid' ? 0.22 : pv.age === 'elder' ? 0.25 : 0.27);
          const headY = sillScreenY - winH * 0.48;
          const bodyY = headY + headR * 0.8;

          // Shoulders & Shirt
          ctx.fillStyle = pv.shirtColor;
          ctx.beginPath();
          ctx.ellipse(sx, bodyY + headR * 0.6, winW * 0.36, winH * 0.25, 0, 0, Math.PI);
          ctx.fill();

          // Neck
          ctx.fillStyle = pv.skinTone;
          ctx.fillRect(sx - headR * 0.28, headY + headR * 0.5, headR * 0.56, headR * 0.5);

          // Head & Face
          ctx.beginPath();
          ctx.arc(sx, headY, headR, 0, Math.PI * 2);
          ctx.fill();

          // Hair
          ctx.fillStyle = pv.hairColor;
          if (pv.hairStyle === 'afro') {
            ctx.beginPath();
            ctx.arc(sx, headY - headR * 0.4, headR * 1.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = pv.skinTone;
            ctx.beginPath();
            ctx.arc(sx, headY, headR * 0.88, 0, Math.PI * 2);
            ctx.fill();
          } else if (pv.hairStyle === 'bun') {
            ctx.beginPath();
            ctx.arc(sx, headY - headR * 1.1, headR * 0.45, 0, Math.PI * 2);
            ctx.arc(sx, headY - headR * 0.4, headR * 1.02, Math.PI, 0);
            ctx.fill();
          } else if (pv.hairStyle === 'curly') {
            for (let i = 0; i < 7; i++) {
              const ang = Math.PI + (i / 6) * Math.PI;
              ctx.beginPath();
              ctx.arc(sx + Math.cos(ang) * headR * 0.95, headY + Math.sin(ang) * headR * 0.95, headR * 0.35, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            ctx.beginPath();
            ctx.arc(sx, headY - headR * 0.35, headR * 1.02, Math.PI, 0);
            ctx.fill();
          }

          // Eyes
          const eyeSpacing = headR * 0.38;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(sx - eyeSpacing, headY - headR * 0.05, headR * 0.26, 0, Math.PI * 2);
          ctx.arc(sx + eyeSpacing, headY - headR * 0.05, headR * 0.26, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(sx - eyeSpacing + 1, headY - headR * 0.05 + 1.5, headR * 0.12, 0, Math.PI * 2);
          ctx.arc(sx + eyeSpacing + 1, headY - headR * 0.05 + 1.5, headR * 0.12, 0, Math.PI * 2);
          ctx.fill();

          // Mouth
          ctx.fillStyle = '#881337';
          ctx.beginPath();
          ctx.arc(sx, headY + headR * 0.42, headR * 0.22, 0, Math.PI);
          ctx.fill();
          break;
        }

        case 'photo_flash': {
          const headY = sillScreenY - winH * 0.48;
          const camW = winW * 0.42;
          const camH = winH * 0.24;
          const camX = sx - camW * 0.5;
          const camY = headY + winH * 0.05;

          // Photographer silhouette
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.arc(sx, headY, winW * 0.22, 0, Math.PI * 2);
          ctx.fill();

          // Camera body
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.roundRect(camX, camY, camW, camH, 4);
          ctx.fill();

          // Lens ring
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(sx, camY + camH * 0.5, camH * 0.42, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'watching_tv': {
          const chairY = sillScreenY - winH * 0.42;
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.ellipse(sx - winW * 0.1, chairY + winH * 0.15, winW * 0.28, winH * 0.2, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(sx - winW * 0.1, chairY - winH * 0.08, winW * 0.16, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'twin_raccoon': {
          const rw = winW * 0.65;
          const rh = winH * 0.48;
          const ry = sillScreenY - rh * 0.88;

          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.ellipse(sx, ry + rh * 0.5, rw * 0.45, rh * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.ellipse(sx, ry + rh * 0.38, rw * 0.42, rh * 0.15, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        default: {
          const headY = sillScreenY - winH * 0.48;
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.ellipse(sx, headY + winW * 0.3, winW * 0.36, winH * 0.24, 0, 0, Math.PI);
          ctx.fill();
          ctx.fillStyle = '#ffd1b3';
          ctx.beginPath();
          ctx.arc(sx, headY, winW * 0.22, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }
    }

    ctx.restore();
  }

  /**
   * Fire Escape on building flank
   */
  private drawFireEscape(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    buildingRight: number,
    floorTop: number,
    floorHeight: number,
    floorNum: number
  ) {
    if (floorNum === 1 || floorNum === GAME_CONFIG.SKYSCRAPER.TOTAL_FLOORS) return;

    const platformWidth = W * 0.085;
    const platformX = buildingRight - platformWidth * 0.85;
    const platformY = floorTop + floorHeight * 0.75;
    const platformThickness = H * 0.008;

    // Platform grating
    ctx.fillStyle = GAME_CONFIG.PALETTE.METAL_DARK;
    ctx.fillRect(platformX, platformY, platformWidth, platformThickness);

    // Railing
    const railingHeight = H * 0.035;
    ctx.strokeStyle = GAME_CONFIG.PALETTE.METAL_LIGHT;
    ctx.lineWidth = Math.max(1, W * 0.003);
    ctx.strokeRect(platformX, platformY - railingHeight, platformWidth, railingHeight);

    // Vertical balusters
    const balusterCount = 4;
    for (let b = 1; b < balusterCount; b++) {
      const bx = platformX + (b / balusterCount) * platformWidth;
      ctx.beginPath();
      ctx.moveTo(bx, platformY);
      ctx.lineTo(bx, platformY - railingHeight);
      ctx.stroke();
    }

    // Connecting Ladder
    const ladderWidth = W * 0.022;
    const ladderX = platformX + platformWidth * 0.2;
    ctx.strokeStyle = GAME_CONFIG.PALETTE.METAL_LIGHT;
    ctx.lineWidth = Math.max(1, W * 0.002);
    ctx.beginPath();
    ctx.moveTo(ladderX, platformY);
    ctx.lineTo(ladderX, platformY + floorHeight * 0.7);
    ctx.moveTo(ladderX + ladderWidth, platformY);
    ctx.lineTo(ladderX + ladderWidth, platformY + floorHeight * 0.7);
    ctx.stroke();

    // Ladder rungs
    for (let r = 1; r <= 5; r++) {
      const ry = platformY + (r / 6) * (floorHeight * 0.7);
      ctx.beginPath();
      ctx.moveTo(ladderX, ry);
      ctx.lineTo(ladderX + ladderWidth, ry);
      ctx.stroke();
    }
  }

  /**
   * Balcony on selected floors
   */
  private drawBalcony(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    left: number,
    width: number,
    bottomScreenY: number,
    side: 'left' | 'right' | 'center'
  ) {
    const balcWidth = width * 0.32;
    let balcX = left + width * 0.1;
    if (side === 'right') balcX = left + width * 0.58;
    else if (side === 'center') balcX = left + (width - balcWidth) / 2;

    const balcY = bottomScreenY - H * 0.04;
    const balcHeight = H * 0.035;

    // Platform slab
    ctx.fillStyle = GAME_CONFIG.PALETTE.LEDGE_COLOR;
    ctx.fillRect(balcX, balcY, balcWidth, H * 0.012);

    // Wrought iron railing
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = Math.max(1, W * 0.003);
    ctx.strokeRect(balcX, balcY - balcHeight, balcWidth, balcHeight);

    // Decorative balusters
    const spokes = 6;
    for (let i = 1; i < spokes; i++) {
      const sx = balcX + (i / spokes) * balcWidth;
      ctx.beginPath();
      ctx.moveTo(sx, balcY);
      ctx.lineTo(sx, balcY - balcHeight);
      ctx.stroke();
    }
  }

  /**
   * Vibrant Neon Signs
   */
  private drawNeonSign(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    centerX: number,
    centerY: number,
    text: string,
    color: string,
    time: number
  ) {
    const fontSize = Math.max(10, Math.floor(H * 0.017));
    ctx.font = `900 ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Gentle neon flicker
    const flicker = 0.85 + 0.15 * Math.sin(time * 12 + centerX);

    // Outer Neon Glow
    ctx.shadowColor = color;
    ctx.shadowBlur = W * 0.025 * flicker;
    ctx.fillStyle = color;
    ctx.fillText(text, centerX, centerY);

    // Bright White Core
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = W * 0.01;
    ctx.fillText(text, centerX, centerY);

    // Reset shadow
    ctx.shadowBlur = 0;
  }

  /**
   * Rooftop with water tower, helipad and antenna beacon
   */
  private drawRooftop(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    left: number,
    width: number,
    roofTopScreenY: number,
    time: number
  ) {
    // Grand Roof Cornice & Roof Sill Ledge (acts similar to a window sill for the raccoon to stand/rest upon)
    const corniceH = H * 0.055;
    const overhang = width * 0.04;
    const roofSillW = width + overhang * 2;
    const roofSillX = left - overhang;

    // 1. Top highlighted stone surface of the roof sill (where the raccoon stands and walks in side profile)
    ctx.fillStyle = GAME_CONFIG.PALETTE.WINDOW_SILL_TOP;
    ctx.fillRect(roofSillX, roofTopScreenY, roofSillW, corniceH * 0.38);

    // 2. Front face of the roof sill
    ctx.fillStyle = GAME_CONFIG.PALETTE.WINDOW_SILL_FACE;
    ctx.fillRect(roofSillX, roofTopScreenY + corniceH * 0.38, roofSillW, corniceH * 0.62);

    // 3. Deep drop shadow onto the facade brick below
    ctx.fillStyle = GAME_CONFIG.PALETTE.WINDOW_SILL_SHADOW;
    ctx.fillRect(roofSillX, roofTopScreenY + corniceH, roofSillW, corniceH * 0.35);

    // Helipad Platform on Roof
    const helipadY = roofTopScreenY - H * 0.02;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(left + width * 0.15, helipadY, width * 0.7, H * 0.02);

    // Helipad "H"
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = Math.max(2, W * 0.005);
    const circleRadius = width * 0.11;
    const hCenterX = left + width * 0.5;
    const hCenterY = helipadY - H * 0.005;

    ctx.beginPath();
    ctx.arc(hCenterX, hCenterY, circleRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Letter H
    ctx.fillStyle = '#facc15';
    ctx.font = `bold ${Math.floor(circleRadius * 1.2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', hCenterX, hCenterY);

    // Classic Water Tower
    const towerW = width * 0.22;
    const towerH = H * 0.12;
    const towerX = left + width * 0.18;
    const towerY = roofTopScreenY - towerH - H * 0.04;

    // Metal stilts
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = Math.max(2, W * 0.004);
    ctx.beginPath();
    ctx.moveTo(towerX + towerW * 0.1, roofTopScreenY);
    ctx.lineTo(towerX + towerW * 0.25, towerY + towerH);
    ctx.moveTo(towerX + towerW * 0.9, roofTopScreenY);
    ctx.lineTo(towerX + towerW * 0.75, towerY + towerH);
    ctx.stroke();

    // Wooden barrel
    ctx.fillStyle = GAME_CONFIG.PALETTE.WATER_TOWER_WOOD;
    ctx.fillRect(towerX, towerY, towerW, towerH);

    // Steel bands
    ctx.fillStyle = GAME_CONFIG.PALETTE.WATER_TOWER_BANDS;
    ctx.fillRect(towerX, towerY + towerH * 0.25, towerW, H * 0.006);
    ctx.fillRect(towerX, towerY + towerH * 0.65, towerW, H * 0.006);

    // Conical roof
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.moveTo(towerX - towerW * 0.08, towerY);
    ctx.lineTo(towerX + towerW * 0.5, towerY - H * 0.035);
    ctx.lineTo(towerX + towerW * 1.08, towerY);
    ctx.closePath();
    ctx.fill();

    // Graffiti on water tower: "RACCOON PRIDE"
    ctx.fillStyle = '#22c55e';
    ctx.font = `900 ${Math.floor(W * 0.024)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('TOP RACCOON!', towerX + towerW * 0.5, towerY + towerH * 0.48);

    // Communication Antenna with pulsing beacon
    const antennaX = left + width * 0.78;
    const antennaBaseY = roofTopScreenY;
    const antennaHeight = H * 0.22;

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = Math.max(1, W * 0.003);
    ctx.beginPath();
    ctx.moveTo(antennaX, antennaBaseY);
    ctx.lineTo(antennaX, antennaBaseY - antennaHeight);
    ctx.stroke();

    // Flashing Red Beacon Light
    const beaconY = antennaBaseY - antennaHeight;
    const beaconPulse = 0.5 + 0.5 * Math.sin(time * 6);
    ctx.fillStyle = GAME_CONFIG.PALETTE.ANTENNA_BEACON;
    ctx.beginPath();
    ctx.arc(antennaX, beaconY, W * 0.012, 0, Math.PI * 2);
    ctx.fill();

    // Halo
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.beginPath();
    ctx.arc(antennaX, beaconY, W * 0.03 * beaconPulse, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Ground floor entrance, doors, marquee and sidewalk
   */
  /**
   * Ground floor entrance area:
   * Keeps building facade completely visible at the trash can area before the game starts
   */
  private drawGroundEntrance(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    left: number,
    width: number,
    bottomScreenY: number,
    floorHeight: number
  ) {
    // Decorative street lamps on far sides beyond building edges (no rectangles covering building facade)
    this.drawStreetLamp(ctx, W, H, left - W * 0.04, bottomScreenY);
    this.drawStreetLamp(ctx, W, H, left + width + W * 0.04, bottomScreenY);
  }

  private drawStreetLamp(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    x: number,
    groundY: number
  ) {
    const lampH = H * 0.09;
    // Cast iron lamp post
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = Math.max(2.5, W * 0.0045);
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x, groundY - lampH);
    ctx.stroke();

    // Ornate base
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - W * 0.008, groundY - H * 0.012, W * 0.016, H * 0.012);

    // Decorative arm & lantern casing
    ctx.fillStyle = '#334155';
    ctx.fillRect(x - W * 0.012, groundY - lampH - H * 0.005, W * 0.024, H * 0.005);

    // Frosted daylight glass globe (clean translucent white-blue, unlit)
    ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, groundY - lampH + H * 0.008, W * 0.012, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Decorative top finial
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(x, groundY - lampH - H * 0.012);
    ctx.lineTo(x - W * 0.004, groundY - lampH - H * 0.005);
    ctx.lineTo(x + W * 0.004, groundY - lampH - H * 0.005);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Alley Trash Can & Popping Animated Trash Debris:
   * Raccoon starts nestled inside the alley trash can with paws on the rim;
   * Each time it climbs out, colorful trash debris pops out into arcs and lands on the ground.
   */
  private drawAlleyTrashCanAndDebris(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    state: GameEngineState,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const unitW = this.getUnitW(W, H);

    // 0. Draw Concrete Sidewalk, Curb, Road Markings & Asphalt Street
    this.drawAlleyPavement(ctx, W, H, cameraX, cameraY);

    // 1. Draw Street-Level Moving Vehicles (Busses, Taxis, Cars) on Asphalt
    if (state.streetVehicles && state.streetVehicles.length > 0) {
      this.drawStreetVehicles(ctx, W, H, state.streetVehicles, cameraX, cameraY, time);
    }

    // 2. Draw Sidewalk Trees Planted in Cast-Iron Grates
    this.drawStreetTrees(ctx, W, H, cameraX, cameraY, time);

    // 3. Draw Victorian City Lampposts with Glowing Lanterns
    this.drawStreetLamps(ctx, W, H, cameraX, cameraY, time);

    // 4. Draw Street Furniture (Fire Hydrant, Newspaper Box)
    this.drawStreetFurniture(ctx, W, H, cameraX, cameraY, time);

    // Check which container raccoon is nestled inside
    const inLeftCan = state.raccoon.isInTrashCan && state.raccoon.containerType === 'left_can';
    const inDumpster = state.raccoon.isInTrashCan && state.raccoon.containerType === 'dumpster';
    const inRightCan = state.raccoon.isInTrashCan && (!state.raccoon.containerType || state.raccoon.containerType === 'right_can');

    // 5. Draw Left Trash Can (near left side of building)
    if (state.leftTrashCan) {
      this.drawSingleTrashCan(ctx, W, H, unitW, state.leftTrashCan, cameraX, cameraY, inLeftCan, time);
    }

    // 6. Draw Large Commercial Dumpster (in between trash cans)
    if (state.dumpster) {
      this.drawCommercialDumpster(ctx, W, H, unitW, state.dumpster, cameraX, cameraY, inDumpster, time);
    }

    // 7. Draw Right Trash Can (ONLY ONE trash can on the right side of the building, where raccoon begins)
    const rightCan = state.rightTrashCan || state.trashCan;
    if (rightCan) {
      this.drawSingleTrashCan(ctx, W, H, unitW, rightCan, cameraX, cameraY, inRightCan, time);
    }

    // 8. Ground level double doors into building (unclimbable glass)
    this.drawStreetDoubleDoors(ctx, W, H, cameraX, cameraY);

    // 9. Stacked recycling bins and wooden crates flanking the dumpster
    this.drawStreetCratesAndRecyclingBins(ctx, W, H, cameraX, cameraY);

    // 10. Electrified telephone pole and sagging cables
    this.drawElectricPoleAndCables(ctx, W, H, cameraX, cameraY, time);

    // 11. Draw Landed & Airborne Trash Particles (Visibly in FRONT of trash cans and dumpster)
    this.drawTrashParticles(ctx, W, H, state.trashParticles, cameraX, cameraY);

    // 12. Fallen laundry items resting on the ground
    if (state.laundryLine && state.laundryLine.fallingItems && state.laundryLine.fallingItems.length > 0) {
      this.drawFallenLaundry(ctx, W, H, state.laundryLine.fallingItems, cameraX, cameraY);
    }
  }

  /**
   * Draw the ground level pavement:
   * The ground line occurs at the very bottom of the building (worldY = 0).
   * Renders the sidewalk slabs, curb, asphalt street, road markings, and crosswalk.
   */
  private drawAlleyPavement(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    cameraY: number
  ) {
    const groundScreenY = this.worldToScreenY(0, cameraY, H);
    if (groundScreenY > H + 120 || groundScreenY < -H * 0.5) return; // Viewport culling

    const unitW = this.getUnitW(W, H);
    const { BUILDING_CENTER_X, BUILDING_WIDTH_RATIO } = GAME_CONFIG.SKYSCRAPER;
    const bLeft = this.worldToScreenX(BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2, cameraX, W, H);

    ctx.save();

    // 1. Concrete sidewalk slab extending across the ground line (from worldY = 0 downward)
    const sidewalkHeight = Math.max(34, H * 0.052);
    const curbHeight = Math.max(14, H * 0.022);

    // Sidewalk base concrete
    const sidewalkGrad = ctx.createLinearGradient(0, groundScreenY, 0, groundScreenY + sidewalkHeight);
    sidewalkGrad.addColorStop(0, '#cbd5e1'); // Crisp light concrete sidewalk top surface
    sidewalkGrad.addColorStop(0.25, '#94a3b8');
    sidewalkGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = sidewalkGrad;
    ctx.fillRect(-W * 0.3, groundScreenY, W * 1.6, sidewalkHeight);

    // Clean crisp ground line right at the building bottom edge
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = Math.max(2, W * 0.004);
    ctx.beginPath();
    ctx.moveTo(-W * 0.3, groundScreenY);
    ctx.lineTo(W * 1.6, groundScreenY);
    ctx.stroke();

    // Sidewalk paving slabs / vertical score lines
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.45)';
    ctx.lineWidth = Math.max(1, W * 0.0025);
    const slabWidth = unitW * 0.16;
    const startSlab = Math.floor((-W * 0.3 - bLeft) / slabWidth);
    const endSlab = Math.ceil((W * 1.3 - bLeft) / slabWidth);
    for (let s = startSlab; s <= endSlab; s++) {
      const sx = bLeft + s * slabWidth;
      ctx.beginPath();
      ctx.moveTo(sx, groundScreenY);
      ctx.lineTo(sx, groundScreenY + sidewalkHeight);
      ctx.stroke();
    }

    // 2. Concrete Curb Edge
    const curbY = groundScreenY + sidewalkHeight;
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-W * 0.3, curbY, W * 1.6, curbHeight);

    // Curb top highlight
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = Math.max(1.5, W * 0.003);
    ctx.beginPath();
    ctx.moveTo(-W * 0.3, curbY);
    ctx.lineTo(W * 1.6, curbY);
    ctx.stroke();

    // 3. Sunlit Asphalt Street (below the sidewalk and curb to bottom of screen)
    const streetY = curbY + curbHeight;
    const streetH = Math.max(60, H - streetY + 140);
    if (streetH > 0) {
      const asphaltGrad = ctx.createLinearGradient(0, streetY, 0, streetY + streetH);
      asphaltGrad.addColorStop(0, GAME_CONFIG.PALETTE.STREET_ASPHALT);
      asphaltGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = asphaltGrad;
      ctx.fillRect(-W * 0.3, streetY, W * 1.6, streetH);

      // Gutter shadow line under curb
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(-W * 0.3, streetY, W * 1.6, Math.max(3, H * 0.005));

      // 4. Road Markings: Continental Crosswalk Stripes
      const crosswalkLeft = this.worldToScreenX(BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2 - 0.06, cameraX, W, H);
      const barW = unitW * 0.028;
      const barH = streetH * 0.82;
      ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
      for (let b = 0; b < 7; b++) {
        const bx = crosswalkLeft + b * (barW * 1.7);
        if (bx > -W * 0.2 && bx < W * 1.2) {
          ctx.fillRect(bx, streetY + streetH * 0.08, barW, barH);
        }
      }

      // 5. Road Markings: Dashed Yellow Centerline
      const dividerY = streetY + streetH * 0.44;
      ctx.strokeStyle = GAME_CONFIG.PALETTE.STREET_MARKING_YELLOW;
      ctx.lineWidth = Math.max(3, H * 0.0055);
      ctx.setLineDash([Math.max(14, W * 0.045), Math.max(10, W * 0.032)]);
      ctx.beginPath();
      ctx.moveTo(-W * 0.3, dividerY);
      ctx.lineTo(W * 1.6, dividerY);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash

      // 6. Stormwater Sewer Grate along curb gutter
      const sewerX = this.worldToScreenX(BUILDING_CENTER_X + 0.12, cameraX, W, H);
      const sewerW = unitW * 0.055;
      const sewerH = Math.max(8, H * 0.015);
      if (sewerX > -W * 0.1 && sewerX < W * 1.1) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(sewerX, streetY, sewerW, sewerH);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = Math.max(1, W * 0.002);
        for (let g = 1; g < 5; g++) {
          ctx.beginPath();
          ctx.moveTo(sewerX + (g / 5) * sewerW, streetY);
          ctx.lineTo(sewerX + (g / 5) * sewerW, streetY + sewerH);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  /**
   * Street-Level Sidewalk Trees planted in decorative cast-iron geometric grates
   */
  private drawStreetTrees(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const groundScreenY = this.worldToScreenY(0, cameraY, H);
    if (groundScreenY > H + 120 || groundScreenY < -H * 0.5) return;

    const unitW = this.getUnitW(W, H);
    const { BUILDING_CENTER_X, BUILDING_WIDTH_RATIO } = GAME_CONFIG.SKYSCRAPER;
    const bLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
    const bRight = BUILDING_CENTER_X + BUILDING_WIDTH_RATIO / 2;

    // Tree positions flanking the building and along the sidewalk
    const treePositions = [
      bLeft - 0.16,  // Left sidewalk flank
      bLeft + 0.025, // Near left building corner
      bRight + 0.16, // Right sidewalk flank
    ];

    const sidewalkHeight = Math.max(34, H * 0.052);

    ctx.save();

    for (let i = 0; i < treePositions.length; i++) {
      const treeWorldX = treePositions[i];
      const treeX = this.worldToScreenX(treeWorldX, cameraX, W, H);
      if (treeX < -W * 0.25 || treeX > W * 1.25) continue;

      const treeBaseY = groundScreenY;
      const trunkW = unitW * 0.022;
      const trunkH = H * 0.19;
      const trunkTopY = treeBaseY - trunkH;

      // 1. Cast-Iron Square Tree Grate on Sidewalk Pavement
      const grateW = unitW * 0.082;
      const grateH = sidewalkHeight * 0.75;
      const grateY = treeBaseY;

      // Dark cast iron surround
      ctx.fillStyle = GAME_CONFIG.PALETTE.TREE_GRATE;
      ctx.beginPath();
      ctx.roundRect(treeX - grateW / 2, grateY + sidewalkHeight * 0.1, grateW, grateH, 3);
      ctx.fill();

      // Radiating vent slots
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = Math.max(1, W * 0.002);
      const slots = 5;
      for (let s = 1; s < slots; s++) {
        const offX = (s / slots - 0.5) * grateW * 0.85;
        ctx.beginPath();
        ctx.moveTo(treeX + offX, grateY + sidewalkHeight * 0.16);
        ctx.lineTo(treeX + offX, grateY + sidewalkHeight * 0.16 + grateH * 0.75);
        ctx.stroke();
      }

      // Fallen leaves on grate
      const leafColors = ['#f59e0b', '#10b981', '#d97706', '#84cc16'];
      for (let l = 0; l < 4; l++) {
        ctx.fillStyle = leafColors[(i + l) % leafColors.length];
        const lx = treeX + ((l * 17) % 30 - 15) * (grateW * 0.025);
        const ly = grateY + sidewalkHeight * 0.25 + (l * 5) % (grateH * 0.55);
        ctx.beginPath();
        ctx.ellipse(lx, ly, unitW * 0.006, unitW * 0.0035, l * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Trunk with gnarled textured wood and branch bifurcations
      const trunkGrad = ctx.createLinearGradient(treeX - trunkW / 2, 0, treeX + trunkW / 2, 0);
      trunkGrad.addColorStop(0, GAME_CONFIG.PALETTE.TREE_TRUNK_DARK);
      trunkGrad.addColorStop(0.35, GAME_CONFIG.PALETTE.TREE_TRUNK);
      trunkGrad.addColorStop(0.7, '#92400e');
      trunkGrad.addColorStop(1, GAME_CONFIG.PALETTE.TREE_TRUNK_DARK);

      ctx.fillStyle = trunkGrad;
      ctx.beginPath();
      // Root flare into grate
      ctx.moveTo(treeX - trunkW * 0.85, treeBaseY + sidewalkHeight * 0.18);
      ctx.quadraticCurveTo(treeX - trunkW * 0.5, treeBaseY - trunkH * 0.2, treeX - trunkW * 0.45, trunkTopY);
      ctx.lineTo(treeX + trunkW * 0.45, trunkTopY);
      ctx.quadraticCurveTo(treeX + trunkW * 0.5, treeBaseY - trunkH * 0.2, treeX + trunkW * 0.85, treeBaseY + sidewalkHeight * 0.18);
      ctx.closePath();
      ctx.fill();

      // Bark texture lines
      ctx.strokeStyle = '#291104';
      ctx.lineWidth = Math.max(1, W * 0.0015);
      ctx.beginPath();
      ctx.moveTo(treeX - trunkW * 0.15, treeBaseY);
      ctx.quadraticCurveTo(treeX - trunkW * 0.2, treeBaseY - trunkH * 0.4, treeX - trunkW * 0.1, trunkTopY);
      ctx.moveTo(treeX + trunkW * 0.15, treeBaseY);
      ctx.quadraticCurveTo(treeX + trunkW * 0.1, treeBaseY - trunkH * 0.5, treeX + trunkW * 0.2, trunkTopY + trunkH * 0.2);
      ctx.stroke();

      // Spreading main branches
      ctx.strokeStyle = trunkGrad;
      ctx.lineWidth = trunkW * 0.65;
      ctx.beginPath();
      // Left branch
      ctx.moveTo(treeX, trunkTopY + trunkH * 0.15);
      ctx.quadraticCurveTo(treeX - trunkW * 1.4, trunkTopY - trunkH * 0.15, treeX - unitW * 0.05, trunkTopY - trunkH * 0.35);
      // Right branch
      ctx.moveTo(treeX, trunkTopY + trunkH * 0.1);
      ctx.quadraticCurveTo(treeX + trunkW * 1.4, trunkTopY - trunkH * 0.18, treeX + unitW * 0.055, trunkTopY - trunkH * 0.4);
      ctx.stroke();

      // 3. Billowy Layered Foliage Canopies with Organic Breeze Rustle
      const breeze = Math.sin(time * 1.8 + treeWorldX * 5) * (unitW * 0.008);
      const canopyCenterY = trunkTopY - trunkH * 0.35;
      const canopyRadius = unitW * 0.075;

      // Canopy puff clusters: [offsetX, offsetY, radiusMult, color]
      const puffs: [number, number, number, string][] = [
        [-canopyRadius * 0.55 + breeze * 0.6, canopyRadius * 0.2, 0.75, GAME_CONFIG.PALETTE.TREE_LEAF_SHADOW],
        [canopyRadius * 0.6 + breeze * 0.6, canopyRadius * 0.15, 0.78, GAME_CONFIG.PALETTE.TREE_LEAF_SHADOW],
        [-canopyRadius * 0.4 + breeze * 0.8, -canopyRadius * 0.3, 0.85, GAME_CONFIG.PALETTE.TREE_LEAF_PRIMARY],
        [canopyRadius * 0.45 + breeze * 0.8, -canopyRadius * 0.25, 0.82, GAME_CONFIG.PALETTE.TREE_LEAF_PRIMARY],
        [breeze, -canopyRadius * 0.55, 0.92, GAME_CONFIG.PALETTE.TREE_LEAF_SECONDARY],
        [breeze * 1.2 - canopyRadius * 0.15, -canopyRadius * 0.65, 0.65, GAME_CONFIG.PALETTE.TREE_LEAF_HIGHLIGHT],
      ];

      for (const [px, py, radMult, leafCol] of puffs) {
        ctx.fillStyle = leafCol;
        ctx.beginPath();
        ctx.arc(treeX + px, canopyCenterY + py, canopyRadius * radMult, 0, Math.PI * 2);
        ctx.fill();
      }

      // Small dappled sunlit leaf highlights
      ctx.fillStyle = 'rgba(187, 247, 208, 0.55)';
      for (let d = 0; d < 5; d++) {
        const dx = treeX + breeze + Math.cos(d * 1.4) * (canopyRadius * 0.45);
        const dy = canopyCenterY + Math.sin(d * 1.4) * (canopyRadius * 0.45);
        ctx.beginPath();
        ctx.ellipse(dx, dy, unitW * 0.007, unitW * 0.004, d * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Street-Level Victorian / City Cast-Iron Streetlamps with Glowing Lanterns
   */
  private drawStreetLamps(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const groundScreenY = this.worldToScreenY(0, cameraY, H);
    if (groundScreenY > H + 120 || groundScreenY < -H * 0.5) return;

    const unitW = this.getUnitW(W, H);
    const { BUILDING_CENTER_X, BUILDING_WIDTH_RATIO } = GAME_CONFIG.SKYSCRAPER;
    const bLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
    const bRight = BUILDING_CENTER_X + BUILDING_WIDTH_RATIO / 2;

    const lampPositions = [
      bLeft - 0.28,  // Far left sidewalk
      bLeft + 0.32,  // Between left can and dumpster
      bRight - 0.01, // Right corner sidewalk
      bRight + 0.28, // Far right sidewalk
    ];

    const sidewalkHeight = Math.max(34, H * 0.052);

    ctx.save();

    for (const lampWorldX of lampPositions) {
      const lampX = this.worldToScreenX(lampWorldX, cameraX, W, H);
      if (lampX < -W * 0.15 || lampX > W * 1.15) continue;

      const lampBaseY = groundScreenY + sidewalkHeight * 0.2;
      const lampH = H * 0.16;
      const lanternY = lampBaseY - lampH;
      const postW = Math.max(3, unitW * 0.009);

      // 1. Soft Warm Light Corona Casting on Sidewalk & Lamppost
      const glowGrad = ctx.createRadialGradient(lampX, lanternY + H * 0.02, 0, lampX, lanternY + H * 0.02, unitW * 0.09);
      glowGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      glowGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.15)');
      glowGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(lampX, lanternY + H * 0.02, unitW * 0.09, 0, Math.PI * 2);
      ctx.fill();

      // Soft light pool on sidewalk below
      const groundGlow = ctx.createRadialGradient(lampX, groundScreenY + sidewalkHeight * 0.5, 0, lampX, groundScreenY + sidewalkHeight * 0.5, unitW * 0.065);
      groundGlow.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
      groundGlow.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = groundGlow;
      ctx.beginPath();
      ctx.ellipse(lampX, groundScreenY + sidewalkHeight * 0.5, unitW * 0.065, sidewalkHeight * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Heavy Cast-Iron Flanged Pedestal Base
      const baseW = postW * 3.2;
      const baseH = H * 0.022;
      ctx.fillStyle = GAME_CONFIG.PALETTE.LAMPPOST_IRON;
      ctx.beginPath();
      ctx.moveTo(lampX - baseW / 2, lampBaseY);
      ctx.lineTo(lampX - postW * 0.8, lampBaseY - baseH);
      ctx.lineTo(lampX + postW * 0.8, lampBaseY - baseH);
      ctx.lineTo(lampX + baseW / 2, lampBaseY);
      ctx.closePath();
      ctx.fill();

      // Pedestal molding collar
      ctx.fillStyle = '#334155';
      ctx.fillRect(lampX - postW * 1.1, lampBaseY - baseH - H * 0.003, postW * 2.2, H * 0.003);

      // 3. Fluted Tapered Column
      const colGrad = ctx.createLinearGradient(lampX - postW / 2, 0, lampX + postW / 2, 0);
      colGrad.addColorStop(0, '#0f172a');
      colGrad.addColorStop(0.4, '#334155');
      colGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = colGrad;
      ctx.fillRect(lampX - postW / 2, lanternY + H * 0.032, postW, lampH - baseH - H * 0.032);

      // Decorative cast rings along the post
      ctx.fillStyle = '#64748b';
      for (let r = 1; r <= 3; r++) {
        const ringY = lampBaseY - baseH - (r / 4) * (lampH - baseH - H * 0.032);
        ctx.fillRect(lampX - postW * 0.8, ringY, postW * 1.6, Math.max(1.5, H * 0.003));
      }

      // 4. Horizontal Ladder Rest Bar (Crossbar)
      const crossbarW = unitW * 0.032;
      const crossbarY = lanternY + H * 0.045;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(lampX - crossbarW / 2, crossbarY, crossbarW, Math.max(2, H * 0.0035));
      // End finials on crossbar
      ctx.beginPath();
      ctx.arc(lampX - crossbarW / 2, crossbarY + H * 0.0017, H * 0.003, 0, Math.PI * 2);
      ctx.arc(lampX + crossbarW / 2, crossbarY + H * 0.0017, H * 0.003, 0, Math.PI * 2);
      ctx.fill();

      // 5. Classic Lantern Housing
      const lanternW = unitW * 0.026;
      const lanternH = H * 0.032;

      // Glowing Glass Core
      ctx.fillStyle = GAME_CONFIG.PALETTE.LAMPPOST_LANTERN;
      ctx.beginPath();
      ctx.moveTo(lampX - lanternW * 0.42, lanternY + lanternH);
      ctx.lineTo(lampX - lanternW * 0.50, lanternY + lanternH * 0.25);
      ctx.lineTo(lampX + lanternW * 0.50, lanternY + lanternH * 0.25);
      ctx.lineTo(lampX + lanternW * 0.42, lanternY + lanternH);
      ctx.closePath();
      ctx.fill();

      // Luminous filament
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(lampX, lanternY + lanternH * 0.6, lanternW * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Dark Iron Lantern Frame Struts
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = Math.max(1, W * 0.002);
      ctx.beginPath();
      ctx.moveTo(lampX - lanternW * 0.42, lanternY + lanternH);
      ctx.lineTo(lampX - lanternW * 0.50, lanternY + lanternH * 0.25);
      ctx.moveTo(lampX + lanternW * 0.42, lanternY + lanternH);
      ctx.lineTo(lampX + lanternW * 0.50, lanternY + lanternH * 0.25);
      ctx.moveTo(lampX, lanternY + lanternH);
      ctx.lineTo(lampX, lanternY + lanternH * 0.25);
      ctx.stroke();

      // Lantern Top Cap & Ornamental Spire Finial
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(lampX - lanternW * 0.58, lanternY + lanternH * 0.25);
      ctx.lineTo(lampX, lanternY);
      ctx.lineTo(lampX + lanternW * 0.58, lanternY + lanternH * 0.25);
      ctx.closePath();
      ctx.fill();

      // Spire spear
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = Math.max(1.5, W * 0.0025);
      ctx.beginPath();
      ctx.moveTo(lampX, lanternY);
      ctx.lineTo(lampX, lanternY - H * 0.012);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Street Furniture: Fire Hydrant & Newspaper Vending Box
   */
  private drawStreetFurniture(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const groundScreenY = this.worldToScreenY(0, cameraY, H);
    if (groundScreenY > H + 120 || groundScreenY < -H * 0.5) return;

    const unitW = this.getUnitW(W, H);
    const { BUILDING_CENTER_X, BUILDING_WIDTH_RATIO } = GAME_CONFIG.SKYSCRAPER;
    const bLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
    const bRight = BUILDING_CENTER_X + BUILDING_WIDTH_RATIO / 2;

    const sidewalkHeight = Math.max(34, H * 0.052);
    const curbY = groundScreenY + sidewalkHeight;

    ctx.save();

    // 1. Classic Red Fire Hydrant on the Curb (Left side)
    const hydWorldX = bLeft - 0.05;
    const hydX = this.worldToScreenX(hydWorldX, cameraX, W, H);
    if (hydX > -W * 0.1 && hydX < W * 1.1) {
      const hydW = unitW * 0.024;
      const hydH = H * 0.038;
      const hydBaseY = curbY + Math.max(2, H * 0.004);

      // Hydrant shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(hydX, hydBaseY, hydW * 0.85, hydH * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Base flange
      ctx.fillStyle = GAME_CONFIG.PALETTE.HYDRANT_SHADOW;
      ctx.fillRect(hydX - hydW * 0.65, hydBaseY - hydH * 0.16, hydW * 1.3, hydH * 0.16);

      // Barrel Body (Red with cylinder gradient)
      const hydGrad = ctx.createLinearGradient(hydX - hydW / 2, 0, hydX + hydW / 2, 0);
      hydGrad.addColorStop(0, GAME_CONFIG.PALETTE.HYDRANT_SHADOW);
      hydGrad.addColorStop(0.35, GAME_CONFIG.PALETTE.HYDRANT_RED);
      hydGrad.addColorStop(0.7, '#f87171');
      hydGrad.addColorStop(1, GAME_CONFIG.PALETTE.HYDRANT_SHADOW);

      ctx.fillStyle = hydGrad;
      ctx.fillRect(hydX - hydW * 0.48, hydBaseY - hydH * 0.85, hydW * 0.96, hydH * 0.7);

      // Side nozzle ports
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(hydX - hydW * 0.72, hydBaseY - hydH * 0.65, hydW * 0.28, hydH * 0.24);
      ctx.fillRect(hydX + hydW * 0.44, hydBaseY - hydH * 0.65, hydW * 0.28, hydH * 0.24);

      // Bonnet dome
      ctx.fillStyle = hydGrad;
      ctx.beginPath();
      ctx.arc(hydX, hydBaseY - hydH * 0.85, hydW * 0.48, Math.PI, 0);
      ctx.fill();

      // Top pentagonal operating nut
      ctx.fillStyle = '#facc15';
      ctx.fillRect(hydX - hydW * 0.18, hydBaseY - hydH * 1.02, hydW * 0.36, hydH * 0.18);
    }

    // 2. Blue Newspaper Vending Box on the Sidewalk (Right side)
    const newsWorldX = bRight + 0.055;
    const newsX = this.worldToScreenX(newsWorldX, cameraX, W, H);
    if (newsX > -W * 0.1 && newsX < W * 1.1) {
      const newsW = unitW * 0.034;
      const newsH = H * 0.055;
      const newsBaseY = groundScreenY + sidewalkHeight * 0.65;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(newsX, newsBaseY, newsW * 0.65, newsH * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Base pedestal & stand
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(newsX - newsW * 0.35, newsBaseY - newsH * 0.3, newsW * 0.7, newsH * 0.3);

      // Metal box body (Vibrant Royal Blue)
      ctx.fillStyle = GAME_CONFIG.PALETTE.NEWSBOX_BLUE;
      ctx.fillRect(newsX - newsW * 0.5, newsBaseY - newsH, newsW, newsH * 0.72);

      // Plexiglass display window
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(newsX - newsW * 0.42, newsBaseY - newsH * 0.92, newsW * 0.84, newsH * 0.42);

      // Newspaper headline: "DAILY RACCOON"
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${Math.max(6, Math.floor(newsW * 0.22))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('RACCOON', newsX, newsBaseY - newsH * 0.78);
      ctx.fillText('TIMES 📰', newsX, newsBaseY - newsH * 0.62);

      // Coin slot & pull handle
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(newsX - newsW * 0.35, newsBaseY - newsH * 0.42, newsW * 0.7, Math.max(1.5, H * 0.003));
    }

    ctx.restore();
  }

  /**
   * Occasional Street Vehicles Driving on the Asphalt Road:
   * City Transit Busses, NYC Taxis, Sedans, Delivery Vans & Sports Cars
   */
  private drawStreetVehicles(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    vehicles: StreetVehicle[],
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const groundScreenY = this.worldToScreenY(0, cameraY, H);
    if (groundScreenY > H + 120 || groundScreenY < -H * 0.5) return;

    const unitW = this.getUnitW(W, H);
    const sidewalkHeight = Math.max(34, H * 0.052);
    const curbHeight = Math.max(14, H * 0.022);
    const streetY = groundScreenY + sidewalkHeight + curbHeight;
    const streetH = Math.max(60, H - streetY + 120);

    ctx.save();

    for (const v of vehicles) {
      const isNearLane = v.lane === 'near';
      const scale = isNearLane ? 1.05 : 0.90;
      const vW = v.width * unitW * scale;
      const vH = v.height * H * scale;
      const vxCenter = this.worldToScreenX(v.x, cameraX, W, H);
      const laneCenterY = isNearLane ? streetY + streetH * 0.62 : streetY + streetH * 0.22;
      const vBottomY = laneCenterY + vH * 0.48;
      const vTopY = vBottomY - vH;

      // Culling
      if (vxCenter + vW < -W * 0.25 || vxCenter - vW > W * 1.25) continue;

      const isFacingRight = v.vx > 0;

      ctx.save();

      // 1. Vehicle Drop Shadow on Asphalt
      ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
      ctx.beginPath();
      ctx.ellipse(vxCenter, vBottomY, vW * 0.52, vH * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Headlight Beam Casting on Asphalt Street in Direction of Travel
      const beamDir = isFacingRight ? 1 : -1;
      const frontX = vxCenter + beamDir * (vW * 0.50);
      const beamLen = vW * 0.85;
      const beamGrad = ctx.createLinearGradient(frontX, 0, frontX + beamDir * beamLen, 0);
      beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.40)');
      beamGrad.addColorStop(0.35, 'rgba(254, 240, 138, 0.18)');
      beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(frontX, vBottomY - vH * 0.35);
      ctx.lineTo(frontX + beamDir * beamLen, vBottomY - vH * 0.1);
      ctx.lineTo(frontX + beamDir * beamLen, vBottomY + vH * 0.35);
      ctx.lineTo(frontX, vBottomY);
      ctx.closePath();
      ctx.fill();

      // Draw according to vehicle type
      if (v.type === 'bus') {
        this.renderCityBus(ctx, W, H, vxCenter, vTopY, vBottomY, vW, vH, isFacingRight, v.wheelRotation, time);
      } else if (v.type === 'garbage_truck') {
        this.renderGarbageTruck(ctx, W, H, vxCenter, vTopY, vBottomY, vW, vH, isFacingRight, v.wheelRotation, time);
      } else if (v.type === 'taxi') {
        this.renderTaxiCab(ctx, W, H, vxCenter, vTopY, vBottomY, vW, vH, isFacingRight, v.wheelRotation);
      } else if (v.type === 'delivery_van') {
        this.renderDeliveryVan(ctx, W, H, vxCenter, vTopY, vBottomY, vW, vH, isFacingRight, v.wheelRotation, v.color);
      } else if (v.type === 'sports_car') {
        this.renderSportsCar(ctx, W, H, vxCenter, vTopY, vBottomY, vW, vH, isFacingRight, v.wheelRotation, v.color);
      } else {
        this.renderSedan(ctx, W, H, vxCenter, vTopY, vBottomY, vW, vH, isFacingRight, v.wheelRotation, v.color);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Classic City Transit Bus
   */
  private renderCityBus(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cx: number,
    topY: number,
    bottomY: number,
    bw: number,
    bh: number,
    facingRight: boolean,
    wheelRot: number,
    time: number
  ) {
    const bodyH = bh * 0.85;
    const bodyY = bottomY - bodyH;
    const busX = cx - bw * 0.5;

    // Bus lower body (Transit blue)
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.roundRect(busX, bodyY + bodyH * 0.45, bw, bodyH * 0.55, [0, 0, 4, 4]);
    ctx.fill();

    // Bus upper body (Crisp white)
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(busX, bodyY, bw, bodyH * 0.48, [8, 8, 0, 0]);
    ctx.fill();

    // Destination LED Sign
    const signW = bw * 0.28;
    const signH = bodyH * 0.16;
    const signX = facingRight ? busX + bw - signW - bw * 0.04 : busX + bw * 0.04;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(signX, bodyY + bodyH * 0.05, signW, signH);
    ctx.fillStyle = '#facc15';
    ctx.font = `bold ${Math.max(6, Math.floor(signH * 0.75))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('METRO 42', signX + signW * 0.5, bodyY + bodyH * 0.13);

    // Row of Passenger Windows
    const winCount = 6;
    const winW = (bw * 0.75) / winCount;
    const winH = bodyH * 0.32;
    const winStartY = bodyY + bodyH * 0.22;
    const winStartX = busX + bw * 0.05;

    for (let i = 0; i < winCount; i++) {
      const wx = winStartX + i * (winW + bw * 0.015);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(wx, winStartY, winW, winH);
      // Window tint highlight
      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.fillRect(wx + 2, winStartY + 2, winW - 4, winH * 0.45);
    }

    // Wheels
    const wheelR = bh * 0.24;
    const wheelY = bottomY - wheelR * 0.55;
    const frontWheelX = facingRight ? busX + bw * 0.82 : busX + bw * 0.18;
    const rearWheelX1 = facingRight ? busX + bw * 0.22 : busX + bw * 0.78;
    const rearWheelX2 = facingRight ? busX + bw * 0.34 : busX + bw * 0.66;

    [frontWheelX, rearWheelX1, rearWheelX2].forEach((wx) => {
      this.drawWheel(ctx, wx, wheelY, wheelR, wheelRot);
    });

    // Lights
    if (facingRight) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(busX + bw - 4, bodyY + bodyH * 0.7, 4, bodyH * 0.2);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(busX, bodyY + bodyH * 0.7, 4, bodyH * 0.2);
    } else {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(busX, bodyY + bodyH * 0.7, 4, bodyH * 0.2);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(busX + bw - 4, bodyY + bodyH * 0.7, 4, bodyH * 0.2);
    }
  }

  /**
   * Heavy City Sanitation Garbage Truck
   */
  private renderGarbageTruck(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cx: number,
    topY: number,
    bottomY: number,
    bw: number,
    bh: number,
    facingRight: boolean,
    wheelRot: number,
    time: number
  ) {
    const bodyH = bh * 0.85;
    const bodyY = bottomY - bodyH;

    // Dimensions: Cab takes 28% of length, Hopper / Compactor takes 72%
    const cabW = bw * 0.28;
    const hopperW = bw * 0.72;
    const cabX = facingRight ? cx + bw / 2 - cabW : cx - bw / 2;
    const hopperX = facingRight ? cx - bw / 2 : cx - bw / 2 + cabW;

    // 1. Large Sanitation Green Compactor Body
    const compGrad = ctx.createLinearGradient(hopperX, bodyY, hopperX, bottomY);
    compGrad.addColorStop(0, '#15803d'); // Sanitation green highlight
    compGrad.addColorStop(0.5, '#166534');
    compGrad.addColorStop(1, '#14532d');
    ctx.fillStyle = compGrad;
    ctx.beginPath();
    ctx.roundRect(hopperX, bodyY, hopperW, bodyH * 0.88, [6, 6, 4, 4]);
    ctx.fill();

    // Steel reinforcement ribs along compactor
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = Math.max(1.5, H * 0.003);
    const ribCount = 4;
    for (let r = 1; r <= ribCount; r++) {
      const rx = hopperX + (r / (ribCount + 1)) * hopperW;
      ctx.beginPath();
      ctx.moveTo(rx, bodyY + 4);
      ctx.lineTo(rx, bodyY + bodyH * 0.88 - 4);
      ctx.stroke();
    }

    // Yellow / Black Hazard Chevrons on rear hopper bumper
    const rearX = facingRight ? hopperX : hopperX + hopperW - bw * 0.08;
    const stripeW = bw * 0.08;
    const stripeH = bodyH * 0.32;
    const stripeY = bottomY - stripeH - bodyH * 0.12;
    ctx.fillStyle = '#eab308';
    ctx.fillRect(rearX, stripeY, stripeW, stripeH);
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    for (let s = 0; s < 3; s++) {
      const sy = stripeY + (s / 3) * stripeH;
      ctx.moveTo(rearX, sy);
      ctx.lineTo(rearX + stripeW, sy + stripeH * 0.25);
      ctx.lineTo(rearX + stripeW, sy + stripeH * 0.45);
      ctx.lineTo(rearX, sy + stripeH * 0.2);
    }
    ctx.fill();

    // White Truck Cab with Heavy Bumper
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(cabX, bodyY + bodyH * 0.12, cabW, bodyH * 0.76, [8, 8, 4, 4]);
    ctx.fill();

    // Windshield
    const wsX = facingRight ? cabX + cabW * 0.45 : cabX + cabW * 0.08;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(wsX, bodyY + bodyH * 0.20, cabW * 0.48, bodyH * 0.32);
    // Driver silhouette
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(wsX + cabW * 0.24, bodyY + bodyH * 0.38, bh * 0.10, 0, Math.PI * 2);
    ctx.fill();

    // Sanitation logo text on compactor side
    ctx.fillStyle = '#fef08a';
    ctx.font = `bold ${Math.max(6, Math.floor(bh * 0.14))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('CITY SANITATION 🗑️', hopperX + hopperW * 0.5, bodyY + bodyH * 0.45);

    // Flashing Amber Rooftop Warning Beacon Light
    const beaconX = cabX + cabW * 0.5;
    const beaconY = bodyY + bodyH * 0.05;
    const flashAlpha = 0.5 + Math.sin(time * 16) * 0.5;
    ctx.fillStyle = `rgba(245, 158, 11, ${flashAlpha})`;
    ctx.beginPath();
    ctx.arc(beaconX, beaconY, Math.max(4, bh * 0.09), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(beaconX - 3, beaconY, 6, bodyH * 0.08);

    // Wheels (3 axles for heavy garbage truck)
    const wheelR = bh * 0.24;
    const wheelY = bottomY - wheelR * 0.6;
    const wheelPositions = facingRight
      ? [hopperX + hopperW * 0.25, hopperX + hopperW * 0.65, cabX + cabW * 0.65]
      : [hopperX + hopperW * 0.75, hopperX + hopperW * 0.35, cabX + cabW * 0.35];

    wheelPositions.forEach((wx) => {
      this.drawWheel(ctx, wx, wheelY, wheelR, wheelRot);
    });

    // Headlight and Taillight
    if (facingRight) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cabX + cabW - bw * 0.02, bodyY + bodyH * 0.65, bw * 0.02, bodyH * 0.20);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(hopperX, bodyY + bodyH * 0.65, bw * 0.02, bodyH * 0.20);
    } else {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cabX, bodyY + bodyH * 0.65, bw * 0.02, bodyH * 0.20);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(hopperX + hopperW - bw * 0.02, bodyY + bodyH * 0.65, bw * 0.02, bodyH * 0.20);
    }
  }

  /**
   * NYC Yellow Cab / Taxi
   */
  private renderTaxiCab(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cx: number,
    topY: number,
    bottomY: number,
    cw: number,
    ch: number,
    facingRight: boolean,
    wheelRot: number
  ) {
    const bodyH = ch * 0.72;
    const bodyY = bottomY - bodyH;
    const wheelR = ch * 0.26;
    const wheelY = bottomY - wheelR * 0.55;

    // Taxi Yellow Body
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.roundRect(cx - cw * 0.48, bodyY + bodyH * 0.35, cw * 0.96, bodyH * 0.65, 4);
    ctx.fill();

    // Cabin Greenhouse (Roof & Windows)
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    const cabinStart = facingRight ? cx - cw * 0.32 : cx - cw * 0.18;
    ctx.roundRect(cabinStart, bodyY, cw * 0.50, bodyH * 0.42, [6, 6, 0, 0]);
    ctx.fill();

    // Windows
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cabinStart + cw * 0.03, bodyY + bodyH * 0.05, cw * 0.21, bodyH * 0.32);
    ctx.fillRect(cabinStart + cw * 0.26, bodyY + bodyH * 0.05, cw * 0.21, bodyH * 0.32);

    // Checkerboard stripe along side doors
    const checkY = bodyY + bodyH * 0.45;
    const checkSize = cw * 0.032;
    for (let c = 0; c < 8; c++) {
      ctx.fillStyle = c % 2 === 0 ? '#000000' : '#ffffff';
      ctx.fillRect(cx - cw * 0.25 + c * checkSize, checkY, checkSize, checkSize);
    }

    // Illuminated "TAXI" Roof Sign
    const signX = cabinStart + cw * 0.18;
    const signY = bodyY - ch * 0.14;
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.roundRect(signX, signY, cw * 0.14, ch * 0.14, 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${Math.max(5, Math.floor(ch * 0.13))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', signX + cw * 0.07, signY + ch * 0.11);

    // Headlight & Taillight
    if (facingRight) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cx + cw * 0.46, bodyY + bodyH * 0.48, cw * 0.03, bodyH * 0.22);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx - cw * 0.48, bodyY + bodyH * 0.48, cw * 0.02, bodyH * 0.22);
    } else {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cx - cw * 0.48, bodyY + bodyH * 0.48, cw * 0.03, bodyH * 0.22);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx + cw * 0.46, bodyY + bodyH * 0.48, cw * 0.02, bodyH * 0.22);
    }

    // Wheels
    const frontWheelX = facingRight ? cx + cw * 0.28 : cx - cw * 0.28;
    const rearWheelX = facingRight ? cx - cw * 0.28 : cx + cw * 0.28;
    this.drawWheel(ctx, frontWheelX, wheelY, wheelR, wheelRot);
    this.drawWheel(ctx, rearWheelX, wheelY, wheelR, wheelRot);
  }

  /**
   * Modern City Sedan
   */
  private renderSedan(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cx: number,
    topY: number,
    bottomY: number,
    cw: number,
    ch: number,
    facingRight: boolean,
    wheelRot: number,
    color: string
  ) {
    const bodyH = ch * 0.72;
    const bodyY = bottomY - bodyH;
    const wheelR = ch * 0.26;
    const wheelY = bottomY - wheelR * 0.55;

    // Lower body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(cx - cw * 0.48, bodyY + bodyH * 0.35, cw * 0.96, bodyH * 0.65, 4);
    ctx.fill();

    // Aerodynamic Greenhouse
    const cabinStart = facingRight ? cx - cw * 0.30 : cx - cw * 0.20;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(cabinStart, bodyY, cw * 0.50, bodyH * 0.42, [8, 8, 0, 0]);
    ctx.fill();

    // Tinted Windows
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cabinStart + cw * 0.03, bodyY + bodyH * 0.06, cw * 0.21, bodyH * 0.30);
    ctx.fillRect(cabinStart + cw * 0.26, bodyY + bodyH * 0.06, cw * 0.21, bodyH * 0.30);

    // Headlight & Taillight
    if (facingRight) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cx + cw * 0.46, bodyY + bodyH * 0.45, cw * 0.03, bodyH * 0.22);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx - cw * 0.48, bodyY + bodyH * 0.45, cw * 0.02, bodyH * 0.22);
    } else {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cx - cw * 0.48, bodyY + bodyH * 0.45, cw * 0.03, bodyH * 0.22);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx + cw * 0.46, bodyY + bodyH * 0.45, cw * 0.02, bodyH * 0.22);
    }

    // Wheels
    const frontWheelX = facingRight ? cx + cw * 0.28 : cx - cw * 0.28;
    const rearWheelX = facingRight ? cx - cw * 0.28 : cx + cw * 0.28;
    this.drawWheel(ctx, frontWheelX, wheelY, wheelR, wheelRot);
    this.drawWheel(ctx, rearWheelX, wheelY, wheelR, wheelRot);
  }

  /**
   * Commercial Delivery Van
   */
  private renderDeliveryVan(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cx: number,
    topY: number,
    bottomY: number,
    cw: number,
    ch: number,
    facingRight: boolean,
    wheelRot: number,
    color: string
  ) {
    const bodyH = ch * 0.85;
    const bodyY = bottomY - bodyH;
    const wheelR = ch * 0.26;
    const wheelY = bottomY - wheelR * 0.55;

    // Commercial Cargo Van Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(cx - cw * 0.48, bodyY, cw * 0.96, bodyH, 5);
    ctx.fill();

    // Windshield
    const windX = facingRight ? cx + cw * 0.28 : cx - cw * 0.46;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(windX, bodyY + bodyH * 0.15, cw * 0.18, bodyH * 0.35);

    // Stencil Branding: "ACORN EXPRESS 📦"
    const logoX = facingRight ? cx - cw * 0.12 : cx + cw * 0.12;
    ctx.fillStyle = '#f8fafc';
    ctx.font = `bold ${Math.max(6, Math.floor(ch * 0.15))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ACORN EXP 📦', logoX, bodyY + bodyH * 0.52);

    // Headlight & Taillight
    if (facingRight) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cx + cw * 0.46, bodyY + bodyH * 0.65, cw * 0.03, bodyH * 0.20);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx - cw * 0.48, bodyY + bodyH * 0.65, cw * 0.02, bodyH * 0.20);
    } else {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cx - cw * 0.48, bodyY + bodyH * 0.65, cw * 0.03, bodyH * 0.20);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx + cw * 0.46, bodyY + bodyH * 0.65, cw * 0.02, bodyH * 0.20);
    }

    // Wheels
    const frontWheelX = facingRight ? cx + cw * 0.30 : cx - cw * 0.30;
    const rearWheelX = facingRight ? cx - cw * 0.30 : cx + cw * 0.30;
    this.drawWheel(ctx, frontWheelX, wheelY, wheelR, wheelRot);
    this.drawWheel(ctx, rearWheelX, wheelY, wheelR, wheelRot);
  }

  /**
   * Aerodynamic Sports Car
   */
  private renderSportsCar(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cx: number,
    topY: number,
    bottomY: number,
    cw: number,
    ch: number,
    facingRight: boolean,
    wheelRot: number,
    color: string
  ) {
    const bodyH = ch * 0.68;
    const bodyY = bottomY - bodyH;
    const wheelR = ch * 0.28;
    const wheelY = bottomY - wheelR * 0.55;

    // Sleek sports body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - cw * 0.48, bodyY + bodyH);
    ctx.lineTo(cx - cw * 0.48, bodyY + bodyH * 0.35);
    ctx.lineTo(facingRight ? cx - cw * 0.20 : cx + cw * 0.20, bodyY + bodyH * 0.05);
    ctx.lineTo(facingRight ? cx + cw * 0.15 : cx - cw * 0.15, bodyY + bodyH * 0.05);
    ctx.lineTo(facingRight ? cx + cw * 0.42 : cx - cw * 0.42, bodyY + bodyH * 0.40);
    ctx.lineTo(cx + (facingRight ? cw * 0.48 : -cw * 0.48), bodyY + bodyH);
    ctx.closePath();
    ctx.fill();

    // Low profile windshield
    ctx.fillStyle = '#0f172a';
    const windStart = facingRight ? cx - cw * 0.05 : cx - cw * 0.18;
    ctx.fillRect(windStart, bodyY + bodyH * 0.12, cw * 0.22, bodyH * 0.30);

    // Rear Spoiler Wing
    const spoilerX = facingRight ? cx - cw * 0.46 : cx + cw * 0.40;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(spoilerX, bodyY + bodyH * 0.15, cw * 0.08, bodyH * 0.10);

    // Wheels
    const frontWheelX = facingRight ? cx + cw * 0.30 : cx - cw * 0.30;
    const rearWheelX = facingRight ? cx - cw * 0.30 : cx + cw * 0.30;
    this.drawWheel(ctx, frontWheelX, wheelY, wheelR, wheelRot);
    this.drawWheel(ctx, rearWheelX, wheelY, wheelR, wheelRot);
  }

  /**
   * Reusable Rubber Wheel with Rotating Hubcap
   */
  private drawWheel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    rotation: number
  ) {
    ctx.save();
    ctx.translate(x, y);

    // Rubber Tire
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Wheel Rim
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Rotating Hubcap / Spokes
    ctx.rotate(rotation);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = Math.max(1, radius * 0.25);
    ctx.beginPath();
    ctx.moveTo(-radius * 0.5, 0);
    ctx.lineTo(radius * 0.5, 0);
    ctx.moveTo(0, -radius * 0.5);
    ctx.lineTo(0, radius * 0.5);
    ctx.stroke();

    // Chrome center lug nut
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw a single galvanized metal alley trash can
   */
  private drawSingleTrashCan(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    unitW: number,
    can: { x: number; y: number; width: number; height: number; lidAngle: number },
    cameraX: number,
    cameraY: number,
    showRaccoon: boolean,
    time: number
  ) {
    const canScreenX = this.worldToScreenX(can.x, cameraX, W, H);
    const canScreenBottomY = this.worldToScreenY(can.y, cameraY, H);
    const canW = can.width * unitW;
    const canH = can.height * H;
    const canTopY = canScreenBottomY - canH;

    // Viewport culling
    if (canScreenX + canW < -W * 0.1 || canScreenX - canW > W * 1.1) return;

    ctx.save();

    // 1. Trash Can Shadow on Sidewalk
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(canScreenX, canScreenBottomY, canW * 0.58, canH * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Galvanized Trash Can Body
    const canGrad = ctx.createLinearGradient(canScreenX - canW / 2, 0, canScreenX + canW / 2, 0);
    canGrad.addColorStop(0, '#334155');
    canGrad.addColorStop(0.25, '#64748b');
    canGrad.addColorStop(0.55, '#94a3b8');
    canGrad.addColorStop(0.8, '#475569');
    canGrad.addColorStop(1, '#1e293b');

    // Cylinder body with slight taper
    ctx.fillStyle = canGrad;
    ctx.beginPath();
    ctx.moveTo(canScreenX - canW * 0.46, canScreenBottomY);
    ctx.lineTo(canScreenX - canW * 0.5, canTopY);
    ctx.lineTo(canScreenX + canW * 0.5, canTopY);
    ctx.lineTo(canScreenX + canW * 0.46, canScreenBottomY);
    ctx.closePath();
    ctx.fill();

    // Corrugation ribs
    const ridgeCount = 7;
    for (let r = 1; r < ridgeCount; r++) {
      const rxTop = canScreenX - canW * 0.5 + (r / ridgeCount) * canW;
      const rxBot = canScreenX - canW * 0.46 + (r / ridgeCount) * (canW * 0.92);
      ctx.strokeStyle = r % 2 === 0 ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = Math.max(1, W * 0.0035);
      ctx.beginPath();
      ctx.moveTo(rxTop, canTopY + canH * 0.08);
      ctx.lineTo(rxBot, canScreenBottomY - canH * 0.06);
      ctx.stroke();
    }

    // Horizontal reinforcement steel rings
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = Math.max(1.5, W * 0.005);
    ctx.beginPath();
    ctx.ellipse(canScreenX, canTopY + canH * 0.35, canW * 0.48, canH * 0.08, 0, 0, Math.PI * 2);
    ctx.ellipse(canScreenX, canTopY + canH * 0.72, canW * 0.46, canH * 0.08, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Side handles
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = Math.max(2, W * 0.006);
    ctx.beginPath();
    ctx.arc(canScreenX - canW * 0.52, canTopY + canH * 0.45, canW * 0.08, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(canScreenX + canW * 0.52, canTopY + canH * 0.45, canW * 0.08, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();

    // Dark interior rim
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(canScreenX, canTopY, canW * 0.5, canH * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Raccoon peeking from inside trash can if nestled in
    if (showRaccoon) {
      this.drawRaccoonInTrashCan(ctx, W, H, canScreenX, canTopY, canW, canH, time);
    }

    // Metal Trash Can Lid (Tilted or Rattling)
    this.drawTrashCanLid(ctx, W, H, canScreenX, canTopY, canW, canH, can.lidAngle);

    ctx.restore();
  }

  /**
   * Draw large commercial industrial dumpster (fully restores raccoon's energy)
   */
  private drawCommercialDumpster(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    unitW: number,
    dumpster: { x: number; y: number; width: number; height: number; lidRattleTimer: number },
    cameraX: number,
    cameraY: number,
    showRaccoon: boolean,
    time: number
  ) {
    const dx = this.worldToScreenX(dumpster.x, cameraX, W, H);
    const bottomY = this.worldToScreenY(dumpster.y, cameraY, H);
    const dw = dumpster.width * unitW;
    const dh = dumpster.height * H;
    const topY = bottomY - dh;

    // Viewport culling
    if (dx + dw < -W * 0.1 || dx - dw > W * 1.1) return;

    ctx.save();

    // 1. Shadow on Sidewalk
    ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
    ctx.beginPath();
    ctx.ellipse(dx, bottomY, dw * 0.54, dh * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Heavy Duty Skid Channels / Bottom Skids
    ctx.fillStyle = '#0f172a';
    const wheelW = dw * 0.10;
    const wheelH = dh * 0.14;
    ctx.fillRect(dx - dw * 0.44, bottomY - wheelH * 0.5, wheelW, wheelH);
    ctx.fillRect(dx + dw * 0.34, bottomY - wheelH * 0.5, wheelW, wheelH);
    ctx.fillRect(dx - dw * 0.05, bottomY - wheelH * 0.5, wheelW, wheelH);

    // 3. Welded Steel Body (Hunter green commercial finish)
    const bodyGrad = ctx.createLinearGradient(dx - dw * 0.5, topY, dx + dw * 0.5, bottomY);
    bodyGrad.addColorStop(0, '#15803d');
    bodyGrad.addColorStop(0.3, '#166534');
    bodyGrad.addColorStop(0.7, '#14532d');
    bodyGrad.addColorStop(1, '#052e16');
    ctx.fillStyle = bodyGrad;

    // Slanted top dumpster trapezoid body
    ctx.beginPath();
    ctx.moveTo(dx - dw * 0.48, bottomY - wheelH * 0.3);
    ctx.lineTo(dx - dw * 0.50, topY + dh * 0.22);
    ctx.lineTo(dx + dw * 0.50, topY + dh * 0.22);
    ctx.lineTo(dx + dw * 0.48, bottomY - wheelH * 0.3);
    ctx.closePath();
    ctx.fill();

    // Steel edge reinforcement outline
    ctx.strokeStyle = '#022c22';
    ctx.lineWidth = Math.max(2, W * 0.004);
    ctx.stroke();

    // Side Forklift Lift Channels / Heavy Pockets
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(dx - dw * 0.51, topY + dh * 0.45, dw * 0.08, dh * 0.22);
    ctx.fillRect(dx + dw * 0.43, topY + dh * 0.45, dw * 0.08, dh * 0.22);

    // Vertical corrugation weld creases
    const creases = [-0.3, -0.15, 0, 0.15, 0.3];
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = Math.max(1.5, W * 0.003);
    creases.forEach((c) => {
      ctx.beginPath();
      ctx.moveTo(dx + c * dw, topY + dh * 0.24);
      ctx.lineTo(dx + c * dw * 0.98, bottomY - wheelH * 0.3);
      ctx.stroke();
    });

    // 4. Stencil Typography: "100% ENERGY DUMPSTER"
    ctx.save();
    ctx.fillStyle = '#fde047';
    ctx.font = `bold ${Math.max(10, Math.floor(dh * 0.19))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ 100% ENERGY DUMPSTER ★', dx, topY + dh * 0.65);
    ctx.restore();

    // 5. Dual Black Plastic Ribbed Lids (One cracked open with pizza box & fishbone!)
    const lidW = dw * 0.51;
    const lidH = dh * 0.28;
    const rattleOffset = dumpster.lidRattleTimer > 0 ? Math.sin(time * 30) * (dh * 0.08) : 0;

    // Left lid (closed flat)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(dx - dw * 0.50, topY + dh * 0.06, lidW, lidH * 0.6);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = Math.max(1, W * 0.002);
    for (let r = 1; r < 4; r++) {
      ctx.beginPath();
      ctx.moveTo(dx - dw * 0.50 + (r / 4) * lidW, topY + dh * 0.06);
      ctx.lineTo(dx - dw * 0.50 + (r / 4) * lidW, topY + dh * 0.06 + lidH * 0.6);
      ctx.stroke();
    }

    // Right lid (propped open with golden energy aura)
    ctx.save();
    ctx.translate(dx + dw * 0.50, topY + dh * 0.18);
    const lidOpenAngle = -0.28 + rattleOffset * 0.02;
    ctx.rotate(lidOpenAngle);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-lidW, -lidH * 0.3, lidW, lidH * 0.5);

    // Pizza slice sticking out of the crack
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-lidW * 0.6, -lidH * 0.35);
    ctx.lineTo(-lidW * 0.45, -lidH * 0.65);
    ctx.lineTo(-lidW * 0.3, -lidH * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(-lidW * 0.45, -lidH * 0.45, Math.max(2, W * 0.004), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Golden green full-energy sparkles / aura
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
    ctx.lineWidth = Math.max(1.5, W * 0.003);
    ctx.strokeRect(dx - dw * 0.50, topY + dh * 0.18, dw, dh * 0.7);

    // Raccoon peeking from inside the open dumpster lid
    if (showRaccoon) {
      this.drawRaccoonInTrashCan(ctx, W, H, dx + dw * 0.18, topY + dh * 0.16, dw * 0.40, dh * 0.75, time);
    }

    ctx.restore();
  }

  /**
   * Adorable raccoon peeking out of the alley trash can with paws gripping the rim
   */
  private drawRaccoonInTrashCan(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    canX: number,
    rimY: number,
    canW: number,
    canH: number,
    time: number
  ) {
    ctx.save();
    // Head peeking out of trash can opening (enlarged to match climbing scale)
    const headRadius = canW * 0.38;
    const breathe = Math.sin(time * 2.5) * (canH * 0.04);
    const headX = canX;
    const headY = rimY - headRadius * 0.45 + breathe;

    // Ears sticking up
    const earH = headRadius * 0.95;
    const earTwitch = Math.sin(time * 6) * 0.08;

    // Left Ear
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_DARK;
    ctx.beginPath();
    ctx.moveTo(headX - headRadius * 0.7, headY - headRadius * 0.3);
    ctx.lineTo(headX - headRadius * 0.85 + earTwitch * headRadius, headY - earH);
    ctx.lineTo(headX - headRadius * 0.25, headY - headRadius * 0.7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EAR_INNER;
    ctx.beginPath();
    ctx.moveTo(headX - headRadius * 0.62, headY - headRadius * 0.35);
    ctx.lineTo(headX - headRadius * 0.75 + earTwitch * headRadius, headY - earH * 0.85);
    ctx.lineTo(headX - headRadius * 0.32, headY - headRadius * 0.65);
    ctx.closePath();
    ctx.fill();

    // Right Ear
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_DARK;
    ctx.beginPath();
    ctx.moveTo(headX + headRadius * 0.25, headY - headRadius * 0.7);
    ctx.lineTo(headX + headRadius * 0.85 - earTwitch * headRadius, headY - earH);
    ctx.lineTo(headX + headRadius * 0.7, headY - headRadius * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EAR_INNER;
    ctx.beginPath();
    ctx.moveTo(headX + headRadius * 0.32, headY - headRadius * 0.65);
    ctx.lineTo(headX + headRadius * 0.75 - earTwitch * headRadius, headY - earH * 0.85);
    ctx.lineTo(headX + headRadius * 0.62, headY - headRadius * 0.35);
    ctx.closePath();
    ctx.fill();

    // Fluffy Head Base
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_MAIN;
    ctx.beginPath();
    ctx.ellipse(headX, headY, headRadius, headRadius * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bandit Mask across eyes
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.MASK;
    ctx.beginPath();
    ctx.ellipse(headX, headY - headRadius * 0.05, headRadius * 0.9, headRadius * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // White Brow tufts
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EYEBROWS;
    ctx.beginPath();
    ctx.ellipse(headX - headRadius * 0.42, headY - headRadius * 0.35, headRadius * 0.28, headRadius * 0.16, -0.15, 0, Math.PI * 2);
    ctx.ellipse(headX + headRadius * 0.42, headY - headRadius * 0.35, headRadius * 0.28, headRadius * 0.16, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Curious Round Eyes looking up
    const eyeOffsetX = headRadius * 0.42;
    const eyeY = headY - headRadius * 0.08;
    const eyeR = headRadius * 0.22;

    [-1, 1].forEach((dir) => {
      const ex = headX + dir * eyeOffsetX;
      // White sclera
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EYE_WHITE;
      ctx.beginPath();
      ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fill();

      // Iris
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EYE_IRIS;
      ctx.beginPath();
      ctx.arc(ex, eyeY - eyeR * 0.15, eyeR * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // Pupil
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EYE_PUPIL;
      ctx.beginPath();
      ctx.arc(ex, eyeY - eyeR * 0.2, eyeR * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // Sparkle catchlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + eyeR * 0.22, eyeY - eyeR * 0.35, eyeR * 0.25, 0, Math.PI * 2);
      ctx.fill();
    });

    // Cream Snout
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.SNOUT;
    ctx.beginPath();
    ctx.ellipse(headX, headY + headRadius * 0.3, headRadius * 0.45, headRadius * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Button Nose
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.NOSE;
    ctx.beginPath();
    ctx.arc(headX, headY + headRadius * 0.22, headRadius * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Two little black paws clutching the trash can rim!
    const pawR = canW * 0.135;
    const pawY = rimY + canH * 0.035;
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.PAWS;
    ctx.beginPath();
    ctx.ellipse(headX - canW * 0.25, pawY, pawR, pawR * 0.7, -0.2, 0, Math.PI * 2);
    ctx.ellipse(headX + canW * 0.25, pawY, pawR, pawR * 0.7, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Cute tiny claws on rim
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.CLAWS;
    [-1, 1].forEach((dir) => {
      const px = headX + dir * canW * 0.24;
      for (let c = -1; c <= 1; c++) {
        ctx.beginPath();
        ctx.arc(px + c * (pawR * 0.45), pawY - pawR * 0.4, pawR * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();
  }

  /**
   * Metal Trash Can Lid (Pivoted open, tilted, or rattling)
   */
  private drawTrashCanLid(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    canX: number,
    rimY: number,
    canW: number,
    canH: number,
    lidAngle: number
  ) {
    ctx.save();
    // Pivot lid around rim
    ctx.translate(canX + canW * 0.38, rimY);
    ctx.rotate(lidAngle);

    const lidW = canW * 1.12;
    const lidH = canH * 0.14;

    // Metallic lid rim
    const lidGrad = ctx.createLinearGradient(-lidW / 2, 0, lidW / 2, 0);
    lidGrad.addColorStop(0, '#475569');
    lidGrad.addColorStop(0.5, '#94a3b8');
    lidGrad.addColorStop(1, '#334155');

    ctx.fillStyle = lidGrad;
    ctx.beginPath();
    ctx.ellipse(0, -lidH * 0.3, lidW * 0.5, lidH * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = Math.max(1, W * 0.003);
    ctx.stroke();

    // Central top handle
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = Math.max(2, W * 0.005);
    ctx.beginPath();
    ctx.arc(0, -lidH * 0.65, lidW * 0.14, Math.PI, 0);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Animated popped trash debris with rotation and contact shadows
   */
  private drawTrashParticles(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    particles: TrashParticle[],
    cameraX: number,
    cameraY: number
  ) {
    const unitW = this.getUnitW(W, H);
    particles.forEach((p) => {
      const px = this.worldToScreenX(p.x, cameraX, W, H);
      const py = this.worldToScreenY(p.y, cameraY, H);

      // Frustum check
      if (px < -W * 0.15 || px > W * 1.15 || py < -H * 0.15 || py > H * 1.15) return;

      const baseSize = unitW * 0.052 * p.scale;

      ctx.save();

      // Soft ground shadow under landed or falling trash
      const groundScreenY = this.worldToScreenY(p.groundY, cameraY, H);
      const shadowDist = Math.max(0, groundScreenY - py);
      const shadowAlpha = Math.max(0.08, 0.42 - shadowDist / (H * 0.25));
      const shadowWidth = baseSize * (1 + shadowDist / (H * 0.35));

      ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(px, groundScreenY, shadowWidth * 0.6, baseSize * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw particle in its local rotated coordinate space
      ctx.translate(px, py);
      ctx.rotate(p.rotation);

      switch (p.type) {
        case 'banana':
          // Cartoon Banana Peel: yellow peels splayed
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.ellipse(0, 0, baseSize * 0.55, baseSize * 0.22, 0.3, 0, Math.PI * 2);
          ctx.fill();
          // Flaps
          ctx.beginPath();
          ctx.moveTo(-baseSize * 0.4, 0);
          ctx.quadraticCurveTo(-baseSize * 0.7, -baseSize * 0.35, -baseSize * 0.8, -baseSize * 0.1);
          ctx.quadraticCurveTo(-baseSize * 0.5, 0, -baseSize * 0.3, baseSize * 0.15);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(baseSize * 0.2, 0);
          ctx.quadraticCurveTo(baseSize * 0.6, baseSize * 0.4, baseSize * 0.8, baseSize * 0.25);
          ctx.quadraticCurveTo(baseSize * 0.45, 0, baseSize * 0.2, -baseSize * 0.1);
          ctx.fill();
          // Brown stem tip
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-baseSize * 0.5, -baseSize * 0.06, baseSize * 0.18, baseSize * 0.12);
          break;

        case 'fishbone':
          // Cartoon Fish Skeleton
          ctx.fillStyle = '#f8fafc';
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = Math.max(1.5, baseSize * 0.1);
          // Head triangle
          ctx.beginPath();
          ctx.moveTo(baseSize * 0.6, 0);
          ctx.lineTo(baseSize * 0.25, -baseSize * 0.35);
          ctx.lineTo(baseSize * 0.25, baseSize * 0.35);
          ctx.closePath();
          ctx.fill();
          // Eye
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(baseSize * 0.4, -baseSize * 0.08, baseSize * 0.08, 0, Math.PI * 2);
          ctx.fill();
          // Spine
          ctx.beginPath();
          ctx.moveTo(baseSize * 0.25, 0);
          ctx.lineTo(-baseSize * 0.5, 0);
          ctx.stroke();
          // Ribs
          for (let r = 0; r < 3; r++) {
            const rx = baseSize * 0.15 - r * (baseSize * 0.22);
            ctx.beginPath();
            ctx.moveTo(rx, -baseSize * 0.32);
            ctx.lineTo(rx, baseSize * 0.32);
            ctx.stroke();
          }
          // Tail fin
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.moveTo(-baseSize * 0.5, 0);
          ctx.lineTo(-baseSize * 0.75, -baseSize * 0.35);
          ctx.lineTo(-baseSize * 0.65, 0);
          ctx.lineTo(-baseSize * 0.75, baseSize * 0.35);
          ctx.closePath();
          ctx.fill();
          break;

        case 'can':
          // Crushed soda can (red with silver rim)
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.ellipse(0, 0, baseSize * 0.45, baseSize * 0.3, 0.2, 0, Math.PI * 2);
          ctx.fill();
          // Silver rims
          ctx.fillStyle = '#cbd5e1';
          ctx.beginPath();
          ctx.ellipse(-baseSize * 0.3, -baseSize * 0.15, baseSize * 0.14, baseSize * 0.22, 0, 0, Math.PI * 2);
          ctx.ellipse(baseSize * 0.3, baseSize * 0.15, baseSize * 0.14, baseSize * 0.22, 0, 0, Math.PI * 2);
          ctx.fill();
          // Pull tab
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = Math.max(1, baseSize * 0.08);
          ctx.beginPath();
          ctx.arc(-baseSize * 0.3, -baseSize * 0.15, baseSize * 0.08, 0, Math.PI * 2);
          ctx.stroke();
          break;

        case 'apple_core':
          // Red bitten apple core
          ctx.fillStyle = '#dc2626';
          // Top lobe
          ctx.beginPath();
          ctx.arc(0, -baseSize * 0.35, baseSize * 0.28, Math.PI, 0);
          ctx.fill();
          // Bottom lobe
          ctx.beginPath();
          ctx.arc(0, baseSize * 0.35, baseSize * 0.28, 0, Math.PI);
          ctx.fill();
          // Core flesh (yellow/white)
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.ellipse(0, 0, baseSize * 0.14, baseSize * 0.32, 0, 0, Math.PI * 2);
          ctx.fill();
          // Stem
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = Math.max(1, baseSize * 0.08);
          ctx.beginPath();
          ctx.moveTo(0, -baseSize * 0.35);
          ctx.lineTo(baseSize * 0.1, -baseSize * 0.6);
          ctx.stroke();
          // Apple seeds
          ctx.fillStyle = '#451a03';
          ctx.beginPath();
          ctx.arc(-baseSize * 0.04, -baseSize * 0.08, baseSize * 0.05, 0, Math.PI * 2);
          ctx.arc(baseSize * 0.04, baseSize * 0.08, baseSize * 0.05, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'pizza':
          // Golden pizza slice with pepperoni
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(0, -baseSize * 0.55);
          ctx.lineTo(baseSize * 0.45, baseSize * 0.45);
          ctx.lineTo(-baseSize * 0.45, baseSize * 0.45);
          ctx.closePath();
          ctx.fill();
          // Crust
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.ellipse(0, baseSize * 0.45, baseSize * 0.48, baseSize * 0.12, 0, 0, Math.PI * 2);
          ctx.fill();
          // Pepperoni spots
          ctx.fillStyle = '#b91c1c';
          ctx.beginPath();
          ctx.arc(0, 0, baseSize * 0.12, 0, Math.PI * 2);
          ctx.arc(-baseSize * 0.18, baseSize * 0.24, baseSize * 0.1, 0, Math.PI * 2);
          ctx.arc(baseSize * 0.16, baseSize * 0.2, baseSize * 0.11, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'bottle':
          // Green glass soda bottle
          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.roundRect(-baseSize * 0.2, -baseSize * 0.2, baseSize * 0.4, baseSize * 0.65, baseSize * 0.08);
          ctx.fill();
          // Neck
          ctx.fillRect(-baseSize * 0.09, -baseSize * 0.55, baseSize * 0.18, baseSize * 0.38);
          // White cap
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(-baseSize * 0.12, -baseSize * 0.62, baseSize * 0.24, baseSize * 0.08);
          // Label
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(-baseSize * 0.2, -baseSize * 0.05, baseSize * 0.4, baseSize * 0.22);
          break;

        case 'paper':
        default:
          // Crumpled paper / bag
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.moveTo(-baseSize * 0.38, -baseSize * 0.3);
          ctx.lineTo(baseSize * 0.25, -baseSize * 0.42);
          ctx.lineTo(baseSize * 0.45, -baseSize * 0.1);
          ctx.lineTo(baseSize * 0.32, baseSize * 0.38);
          ctx.lineTo(-baseSize * 0.28, baseSize * 0.42);
          ctx.lineTo(-baseSize * 0.45, baseSize * 0.05);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = Math.max(1, baseSize * 0.06);
          ctx.stroke();
          break;
      }

      ctx.restore();
    });
  }

  /**
   * Draw the cute illustrated raccoon character:
   * Changes to side profile when resting on a window sill (facing left/right based on movement),
   * and returns to the normal top-down climbing position on building walls.
   */
  private drawRaccoon(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    raccoon: RaccoonPosition,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    if (raccoon.isInTrashCan) {
      // Raccoon is rendered peeking from alley trash can in drawAlleyTrashCanAndDebris
      return;
    }
    if (raccoon.isRestingOnSill) {
      this.drawRaccoonSideProfile(ctx, W, H, raccoon, cameraX, cameraY, time);
    } else {
      this.drawRaccoonTopDown(ctx, W, H, raccoon, cameraX, cameraY, time);
    }
  }

  /**
   * Raccoon perched on window sill in cute side profile view:
   * Bottom of feet atop the sill's top surface (y = 0 in local space).
   * Faces right when moving right, faces left when moving left.
   */
  private drawRaccoonSideProfile(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    raccoon: RaccoonPosition,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const unitW = this.getUnitW(W, H);
    const screenX = this.worldToScreenX(raccoon.x, cameraX, W, H);
    const screenY = this.worldToScreenY(raccoon.y, cameraY, H);

    const baseW = unitW * GAME_CONFIG.RACCOON.SIDE_PROFILE_WIDTH_RATIO;
    const baseH = H * GAME_CONFIG.RACCOON.SIDE_PROFILE_HEIGHT_RATIO;

    const isFacingLeft = raccoon.lastSideFacing === 'left';
    const isWalking = Math.abs(raccoon.vx) > 0.02;

    ctx.save();
    ctx.translate(screenX, screenY);

    // Mirror horizontally if facing left so side profile faces direction of movement
    if (isFacingLeft) {
      ctx.scale(-1, 1);
    }

    // Gentle breathing rise/fall when resting
    const breatheY = isWalking ? 0 : Math.sin(time * 3) * (baseH * 0.025);

    // Contact shadow resting directly on the top surface of the window sill (y = 0)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 0, baseW * 0.38, baseH * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1. Bushy Ringed Tail (Draped behind, curling gracefully above the sill)
    this.drawSideProfileTail(ctx, baseW, baseH, time, isWalking);

    // Quadruped scooting/crawling kinematics along the horizontal sill ledge:
    // Paws glide/shuffle along the sill surface without high vertical pumping/stepping.
    // Near Front Arm and Near Rear Leg operate in opposing scooting rhythm (Pair 1 vs Pair 2).
    // Positions evaluate directly from climbPhase, freezing immediately whenever crawling stops.
    const getSillScootStep = (phaseOffset: number, maxReach: number) => {
      const p = ((raccoon.climbPhase + phaseOffset) % 1.0 + 1.0) % 1.0;
      if (p < 0.5) {
        // Grounded pull/push phase: paw glides firmly along the sill surface
        const t = p / 0.5;
        const ease = 0.5 * (1 - Math.cos(t * Math.PI));
        const offsetX = maxReach * (1 - 2 * ease);
        return { offsetX, liftY: 0 };
      } else {
        // Shuffle/scoot recovery phase: paw skims forward along the sill surface without pumping up
        const s = (p - 0.5) / 0.5;
        const ease = 0.5 * (1 - Math.cos(s * Math.PI));
        const offsetX = -maxReach + 2 * maxReach * ease;
        // Barely 0.5px surface glide (near zero vertical lift) so it looks like crawling/scooting, not stepping high
        const liftY = Math.sin(s * Math.PI) * (baseH * 0.005);
        return { offsetX, liftY };
      }
    };

    // Opposing limb pairs:
    // Pair 1 (phase 0.0): Near Front Arm & Far Rear Leg
    // Pair 2 (phase 0.5): Far Front Arm & Near Rear Leg
    // Near Front Arm and Near Rear Leg are in 180-degree opposition!
    const farRearStep = getSillScootStep(0.0, baseW * 0.058);
    const farFrontStep = getSillScootStep(0.5, baseW * 0.068);
    const nearRearStep = getSillScootStep(0.5, baseW * 0.058);
    const nearFrontStep = getSillScootStep(0.0, baseW * 0.068);

    // Subtle crawl flex as spine scoots forward
    const crawlFlex = isWalking ? Math.sin(raccoon.climbPhase * Math.PI * 2) * (baseW * 0.015) : 0;
    const lowCrouchY = -baseH * 0.32 + breatheY;

    // 2. Far (Background) Limbs - shaded darker behind body, scooting low along the sill
    // Far Rear Leg & Paw
    ctx.fillStyle = '#262f40';
    ctx.beginPath();
    ctx.ellipse(-baseW * 0.22 + farRearStep.offsetX * 0.4, -baseH * 0.21 + breatheY, baseW * 0.16, baseH * 0.15, -0.2, 0, Math.PI * 2);
    ctx.fill();

    const farRearPawY = -baseH * 0.058 - farRearStep.liftY;
    ctx.fillStyle = '#1e2430';
    ctx.beginPath();
    ctx.ellipse(-baseW * 0.22 + farRearStep.offsetX, farRearPawY, baseW * 0.075, baseH * 0.058, 0, 0, Math.PI * 2);
    ctx.fill();

    // Far Front Leg & Paw
    const farFrontPawX = baseW * 0.16 + farFrontStep.offsetX;
    const farFrontPawY = -baseH * 0.058 - farFrontStep.liftY;
    ctx.fillStyle = '#262f40';
    ctx.beginPath();
    ctx.moveTo(baseW * 0.10, -baseH * 0.26 + breatheY);
    ctx.lineTo(farFrontPawX, farFrontPawY);
    ctx.lineTo(farFrontPawX + baseW * 0.06, farFrontPawY);
    ctx.lineTo(baseW * 0.18, -baseH * 0.24 + breatheY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1e2430';
    ctx.beginPath();
    ctx.arc(farFrontPawX + baseW * 0.03, farFrontPawY, baseW * 0.055, 0, Math.PI * 2);
    ctx.fill();

    // 3. Fluffy Main Body in Low Crawling Crouch (Poised low above the stone sill)
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_MAIN;
    ctx.beginPath();
    ctx.ellipse(-baseW * 0.04 + crawlFlex * 0.5, lowCrouchY, baseW * 0.28 + crawlFlex * 0.5, baseH * 0.21, -0.10, 0, Math.PI * 2);
    ctx.fill();

    // Lighter cream belly contour hugging close to sill
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.BELLY;
    ctx.beginPath();
    ctx.ellipse(baseW * 0.04 + crawlFlex * 0.3, -baseH * 0.22 + breatheY, baseW * 0.16, baseH * 0.12, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // 4. Near (Foreground) Limbs - scooting low along the sill
    // Near Rear Haunch & Paw (opposite motion to Near Front Arm)
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_DARK;
    ctx.beginPath();
    ctx.ellipse(-baseW * 0.18 + nearRearStep.offsetX * 0.4, -baseH * 0.22 + breatheY, baseW * 0.18, baseH * 0.18, -0.2, 0, Math.PI * 2);
    ctx.fill();

    const nearRearPawCenterY = -baseH * 0.062 - nearRearStep.liftY;
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.PAWS;
    ctx.beginPath();
    ctx.ellipse(-baseW * 0.18 + nearRearStep.offsetX, nearRearPawCenterY, baseW * 0.085, baseH * 0.062, 0, 0, Math.PI * 2);
    ctx.fill();

    // Near Front Leg & Paw (opposite motion to Near Rear Leg)
    const frontPawX = baseW * 0.20 + nearFrontStep.offsetX;
    const frontPawR = baseW * 0.062;
    const frontPawCenterY = -frontPawR - nearFrontStep.liftY;

    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_DARK;
    ctx.beginPath();
    ctx.moveTo(baseW * 0.14, -baseH * 0.28 + breatheY);
    ctx.lineTo(frontPawX, frontPawCenterY);
    ctx.lineTo(frontPawX + baseW * 0.08, frontPawCenterY);
    ctx.lineTo(baseW * 0.22, -baseH * 0.26 + breatheY);
    ctx.closePath();
    ctx.fill();

    // Front Paw pad resting atop sill
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.PAWS;
    ctx.beginPath();
    ctx.arc(frontPawX + baseW * 0.04, frontPawCenterY, frontPawR, 0, Math.PI * 2);
    ctx.fill();

    // Tiny claws touching sill edge
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.CLAWS;
    for (let c = 0; c < 3; c++) {
      ctx.beginPath();
      ctx.arc(frontPawX + baseW * 0.01 + c * (baseW * 0.03), frontPawCenterY + frontPawR * 0.85, baseW * 0.014, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Head in Side Profile with Bandit Mask, Ears, and Snout (poised low in crawl posture)
    this.drawSideProfileHead(ctx, baseW, baseH, breatheY, time);

    // 6. Cute Resting Badge / Sparkle above head
    if (!isWalking) {
      this.drawSillRestEffect(ctx, baseW, baseH, time);
    }

    // 7. Glass slip streaks if bumping glass
    if (raccoon.slipEffectTimer > 0) {
      this.drawGlassSlipEffects(ctx, baseW, baseH, raccoon.slipEffectTimer);
    }

    ctx.restore();
  }

  /**
   * Bushy ringed tail in side profile, curling comfortably above the sill surface
   */
  private drawSideProfileTail(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
    isWalking: boolean
  ) {
    ctx.save();
    // Anchor to rear hip of body
    ctx.translate(-w * 0.28, -h * 0.25);
    const tailSway = Math.sin(time * (isWalking ? 6.5 : 2.5)) * 0.18 - 0.2;
    ctx.rotate(tailSway);

    const tailLen = w * 0.62;
    const tailThick = h * 0.26;
    const rings = 5;

    for (let i = 0; i < rings; i++) {
      const rx = -(i / rings) * tailLen;
      // Tail stays between -h * 0.25 and -h * 0.08 (never penetrating sill)
      const ry = Math.sin((i / rings) * Math.PI * 0.5) * (h * 0.18) - (i === rings - 1 ? h * 0.08 : 0);
      const segW = tailLen / rings;
      const isDark = i % 2 === 0;

      ctx.fillStyle = isDark
        ? GAME_CONFIG.PALETTE.RACCOON.TAIL_RING_DARK
        : GAME_CONFIG.PALETTE.RACCOON.TAIL_RING_LIGHT;

      ctx.beginPath();
      const taper = 1.0 - (i / rings) * 0.25;
      ctx.ellipse(rx, ry, segW * 0.65, (tailThick * taper) / 2, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tail tip curled slightly upwards
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.TAIL_RING_DARK;
    ctx.beginPath();
    ctx.arc(-tailLen, -h * 0.06, tailThick * 0.24, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Cute side-profile raccoon head with bandit mask, snout, and perky ears
   */
  /**
   * Cute side-profile raccoon head with bandit mask, snout, and perky ears
   * Matches the trash can raccoon cuteness with big sparkling eyes and charming facial details
   */
  private drawSideProfileHead(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    breatheY: number,
    time: number
  ) {
    const headX = w * 0.22;
    const headY = -h * 0.58 + breatheY;
    const headRadius = w * 0.18;

    // 1. Back Ear (in perspective, slightly darker with soft rose inner shadow)
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_DARK;
    ctx.beginPath();
    ctx.moveTo(headX - headRadius * 0.2, headY - headRadius * 0.6);
    ctx.lineTo(headX - headRadius * 0.1, headY - headRadius * 1.55);
    ctx.lineTo(headX + headRadius * 0.4, headY - headRadius * 0.8);
    ctx.closePath();
    ctx.fill();

    // 2. Main Head & Fluffy Cheeks
    // Soft fluffy cheek tuft at jaw line
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_MAIN;
    ctx.beginPath();
    ctx.ellipse(headX - headRadius * 0.32, headY + headRadius * 0.38, headRadius * 0.42, headRadius * 0.32, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Fluffy Head Base
    ctx.beginPath();
    ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // Soft cream chin contour under jaw
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.BELLY;
    ctx.beginPath();
    ctx.ellipse(headX + headRadius * 0.15, headY + headRadius * 0.62, headRadius * 0.36, headRadius * 0.18, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 3. Front Ear with dark border, gray face, and soft pink inner fluff
    const earTwitch = Math.sin(time * 5) * (headRadius * 0.05);

    // Dark outer ear rim
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_DARK;
    ctx.beginPath();
    ctx.moveTo(headX + headRadius * 0.08, headY - headRadius * 0.52);
    ctx.lineTo(headX + headRadius * 0.35 + earTwitch, headY - headRadius * 1.62);
    ctx.lineTo(headX + headRadius * 0.88, headY - headRadius * 0.68);
    ctx.closePath();
    ctx.fill();

    // Main ear fill
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_MAIN;
    ctx.beginPath();
    ctx.moveTo(headX + headRadius * 0.14, headY - headRadius * 0.52);
    ctx.lineTo(headX + headRadius * 0.36 + earTwitch, headY - headRadius * 1.55);
    ctx.lineTo(headX + headRadius * 0.82, headY - headRadius * 0.70);
    ctx.closePath();
    ctx.fill();

    // Soft pink inner ear fluff
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EAR_INNER;
    ctx.beginPath();
    ctx.moveTo(headX + headRadius * 0.24, headY - headRadius * 0.56);
    ctx.lineTo(headX + headRadius * 0.40 + earTwitch * 0.7, headY - headRadius * 1.35);
    ctx.lineTo(headX + headRadius * 0.72, headY - headRadius * 0.74);
    ctx.closePath();
    ctx.fill();

    // 4. Black Bandit Mask across side profile
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.MASK;
    ctx.beginPath();
    ctx.moveTo(headX - headRadius * 0.12, headY - headRadius * 0.32);
    ctx.lineTo(headX + headRadius * 1.15, headY - headRadius * 0.12);
    ctx.lineTo(headX + headRadius * 0.95, headY + headRadius * 0.46);
    ctx.lineTo(headX - headRadius * 0.12, headY + headRadius * 0.22);
    ctx.closePath();
    ctx.fill();

    // 5. White brow patch above mask
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EYEBROWS;
    ctx.beginPath();
    ctx.ellipse(headX + headRadius * 0.42, headY - headRadius * 0.42, headRadius * 0.28, headRadius * 0.16, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 6. Cute Cream Snout extending forward in profile
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.SNOUT;
    ctx.beginPath();
    ctx.moveTo(headX + headRadius * 0.5, headY - headRadius * 0.1);
    ctx.lineTo(headX + headRadius * 1.48, headY + headRadius * 0.2);
    ctx.lineTo(headX + headRadius * 0.6, headY + headRadius * 0.6);
    ctx.closePath();
    ctx.fill();

    // 7. Shiny Black Button Nose with specular highlight
    const noseX = headX + headRadius * 1.44;
    const noseY = headY + headRadius * 0.18;
    const noseR = headRadius * 0.15;
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.NOSE;
    ctx.beginPath();
    ctx.arc(noseX, noseY, noseR, 0, Math.PI * 2);
    ctx.fill();

    // Tiny white highlight glint on button nose
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(noseX - noseR * 0.3, noseY - noseR * 0.35, noseR * 0.32, 0, Math.PI * 2);
    ctx.fill();

    // Subtle sweet smile curve under nose
    ctx.strokeStyle = GAME_CONFIG.PALETTE.RACCOON.NOSE;
    ctx.lineWidth = Math.max(1, w * 0.008);
    ctx.beginPath();
    ctx.moveTo(noseX - noseR * 0.4, noseY + noseR * 0.7);
    ctx.quadraticCurveTo(noseX - noseR * 1.2, noseY + noseR * 1.4, headX + headRadius * 1.05, headY + headRadius * 0.42);
    ctx.stroke();

    // 8. Large, Expressive Anime-Cute Eye (matching the trash can raccoon!)
    const eyeX = headX + headRadius * 0.46;
    const eyeY = headY + headRadius * 0.04;
    const eyeR = headRadius * 0.28;

    // Pure white sclera
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EYE_WHITE;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Amber Iris looking forward along the sill
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EYE_IRIS;
    ctx.beginPath();
    ctx.arc(eyeX + eyeR * 0.18, eyeY, eyeR * 0.85, 0, Math.PI * 2);
    ctx.fill();

    // Dark Pupil
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EYE_PUPIL;
    ctx.beginPath();
    ctx.arc(eyeX + eyeR * 0.22, eyeY, eyeR * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Primary Bright Sparkle Catchlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeX + eyeR * 0.32, eyeY - eyeR * 0.30, eyeR * 0.26, 0, Math.PI * 2);
    ctx.fill();

    // Secondary cute micro-sparkle twinkle
    ctx.beginPath();
    ctx.arc(eyeX - eyeR * 0.08, eyeY + eyeR * 0.25, eyeR * 0.13, 0, Math.PI * 2);
    ctx.fill();

  }

  /**
   * Draw the top-of-body climbing view of the raccoon when scaling the building surface
   */
  private drawRaccoonTopDown(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    raccoon: RaccoonPosition,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const unitW = this.getUnitW(W, H);
    const screenX = this.worldToScreenX(raccoon.x, cameraX, W, H);
    const screenY = this.worldToScreenY(raccoon.y, cameraY, H);

    const baseW = unitW * GAME_CONFIG.RACCOON.WIDTH_RATIO;
    const baseH = H * GAME_CONFIG.RACCOON.HEIGHT_RATIO;

    // Squash & Stretch
    const currentW = baseW / raccoon.squashFactor;
    const currentH = baseH * raccoon.squashFactor;

    ctx.save();
    ctx.translate(screenX, screenY);

    // Rotate body towards movement direction (subtle sideways tilt or distinct diagonal tilt)
    const sidewaysTilt = GAME_CONFIG.RACCOON.SIDEWAYS_TILT_ANGLE;
    const diagonalTilt = GAME_CONFIG.RACCOON.DIAGONAL_TILT_ANGLE;
    let tiltAngle = 0;
    if (raccoon.climbGaitMode === 'diagonal' && raccoon.diagonalDirection) {
      tiltAngle = raccoon.diagonalDirection.x * diagonalTilt;
    } else if (raccoon.climbGaitMode === 'vertical') {
      tiltAngle = 0; // Pure vertical climbing: straight body alignment, zero diagonal tilt!
    } else if (raccoon.facing === 'left' || raccoon.vx < -0.015) {
      tiltAngle = -sidewaysTilt;
    } else if (raccoon.facing === 'right' || raccoon.vx > 0.015) {
      tiltAngle = sidewaysTilt;
    } else if (Math.abs(raccoon.vx) > 0.005) {
      tiltAngle = (raccoon.vx / 0.015) * sidewaysTilt;
    }
    ctx.rotate(tiltAngle);

    // Soft drop shadow against building wall
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, currentH * 0.12, currentW * 0.52, currentH * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1. Bushy Striped Tail (Sways with physics and inertia)
    this.drawRaccoonTail(ctx, currentW, currentH, raccoon.tailAngle);

    // 2. Animated Agile Paws (Reach and grasp building, freezing in position when stopped)
    this.drawRaccoonPaws(
      ctx,
      currentW,
      currentH,
      raccoon.climbPhase,
      raccoon.isClimbing,
      false,
      raccoon.facing,
      raccoon.vx,
      raccoon.vy,
      raccoon.climbGaitMode,
      raccoon.diagonalDirection
    );

    // 3. Fluffy Body
    this.drawRaccoonBody(ctx, currentW, currentH);

    // 4. Head with Ears, Bandit Mask, Eyes, Snout & Whiskers (Expressive cuteness & dynamic directional gaze)
    this.drawRaccoonHead(ctx, currentW, currentH, raccoon, time);

    // 5. Scramble Dust / Speed Trails / Sparks when speed boosted or scrambling
    if (raccoon.isScrambling || raccoon.isSpeedBoosted) {
      this.drawScrambleEffects(ctx, currentW, currentH, time);
    }

    // 6. Glass Paw Slip Effect when trying to climb unclimbable glass
    if (raccoon.slipEffectTimer > 0) {
      this.drawGlassSlipEffects(ctx, currentW, currentH, raccoon.slipEffectTimer);
    }

    ctx.restore();
  }

  /**
   * Bushy ringed raccoon tail
   */
  private drawRaccoonTail(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    tailAngle: number
  ) {
    ctx.save();
    // Anchor tail to bottom center of body
    ctx.translate(0, h * 0.36);
    ctx.rotate(tailAngle);

    const tailLen = h * 0.82;
    const tailWidth = w * 0.42;

    // Draw 5 striped segments of the tail
    const segments = 5;
    for (let i = 0; i < segments; i++) {
      const segY = (i / segments) * tailLen;
      const segH = tailLen / segments;
      const isDark = i % 2 === 0;

      ctx.fillStyle = isDark
        ? GAME_CONFIG.PALETTE.RACCOON.TAIL_RING_DARK
        : GAME_CONFIG.PALETTE.RACCOON.TAIL_RING_LIGHT;

      ctx.beginPath();
      const taper = 1.0 - (i / segments) * 0.38;
      ctx.ellipse(0, segY + segH * 0.5, (tailWidth * taper) / 2, segH * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fluffy tail tip
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.TAIL_RING_DARK;
    ctx.beginPath();
    ctx.arc(0, tailLen, tailWidth * 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Front and back paws with climb stepping or resting pose:
   * - When body stops moving: legs immediately stop moving and hold wall grip
   * - When climbing left/right: legs move slightly left/right rather than up/down
   * - When climbing up/down: legs move up/down reaching and pulling
   */
  private drawRaccoonPaws(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    climbPhase: number,
    isClimbing: boolean,
    isRestingOnSill: boolean,
    facing: 'left' | 'right' | 'up' | 'down' = 'up',
    vx: number = 0,
    vy: number = 0,
    gaitMode: 'vertical' | 'horizontal' | 'diagonal' = 'vertical',
    diagonalDirection?: { x: 1 | -1; y: 1 | -1 }
  ) {
    const pawRadius = w * 0.13;

    let flX = -w * 0.48;
    let flY = -h * 0.32;
    let frX = w * 0.48;
    let frY = -h * 0.32;
    let blX = -w * 0.52;
    let blY = h * 0.22;
    let brX = w * 0.52;
    let brY = h * 0.22;

    if (isRestingOnSill && !isClimbing) {
      // Paws rest forward on window sill ledge
      flX = -w * 0.36;
      flY = -h * 0.1;
      frX = w * 0.36;
      frY = -h * 0.1;
      blX = -w * 0.42;
      blY = h * 0.24;
      brX = w * 0.42;
      brY = h * 0.24;
    } else {
      // Clinging to wall: whether climbing or stopped/paused, paws always maintain
      // and freeze at their remembered progress positions!
      if (gaitMode === 'diagonal') {
        // Distinct Diagonal Climbing Gait:
        // Contralateral synchronization: opposite arm and leg move in unison.
        // Pair 1: Front Right arm (FR) and Back Left hind leg (BL) reach and step together.
        // Pair 2: Front Left arm (FL) and Back Right hind leg (BR) reach and step together.
        const diagDir = diagonalDirection || {
          x: vx >= 0 ? 1 : -1,
          y: vy >= 0 ? 1 : -1,
        };

        const screenXSign = diagDir.x;
        // In screen canvas, upward movement is negative Y
        const screenYSign = diagDir.y >= 0 ? -1 : 1;

        const reachDiagX = w * 0.16;
        const reachDiagY = h * 0.18;

        const getDiagonalPawDisp = (phaseOffset: number) => {
          const p = ((climbPhase + phaseOffset) % 1.0 + 1.0) % 1.0;
          if (p < 0.5) {
            // STANCE / PUSH PHASE: Firmly holds wall while body translates diagonally
            const t = p / 0.5;
            const offsetX = -screenXSign * reachDiagX + t * (2 * screenXSign * reachDiagX);
            const offsetY = -screenYSign * reachDiagY + t * (2 * screenYSign * reachDiagY);
            return { offsetX, offsetY, flare: 0 };
          } else {
            // SWING / REACH PHASE: Lifts and reaches forward diagonally with outward grasping arc
            const s = (p - 0.5) / 0.5;
            const swingEase = 0.5 * (1 - Math.cos(s * Math.PI));
            const offsetX = screenXSign * reachDiagX - swingEase * (2 * screenXSign * reachDiagX);
            const offsetY = screenYSign * reachDiagY - swingEase * (2 * screenYSign * reachDiagY);
            const flare = Math.sin(s * Math.PI) * (w * 0.065);
            return { offsetX, offsetY, flare };
          }
        };

        // Strict contralateral synchronization:
        // Pair 1: Front Right & Back Left on phase 0.5
        // Pair 2: Front Left & Back Right on phase 0.0
        const dFL = getDiagonalPawDisp(0.0);
        const dFR = getDiagonalPawDisp(0.5);
        const dBL = getDiagonalPawDisp(0.5);
        const dBR = getDiagonalPawDisp(0.0);

        flX += dFL.offsetX - dFL.flare;
        flY += dFL.offsetY;
        frX += dFR.offsetX + dFR.flare;
        frY += dFR.offsetY;
        blX += dBL.offsetX * 0.85 - dBL.flare * 0.6;
        blY += dBL.offsetY * 0.85;
        brX += dBR.offsetX * 0.85 + dBR.flare * 0.6;
        brY += dBR.offsetY * 0.85;
      } else if (gaitMode === 'horizontal' || (facing === 'left' || facing === 'right' || Math.abs(vx) > Math.abs(vy))) {
        // Horizontal climbing across brick facade:
        // Contralateral pairing: FR + BL in sync, FL + BR in sync
        const reachMaxX = w * 0.18;
        const isMovingLeft = facing === 'left' || vx < 0;
        const dirSign = isMovingLeft ? 1 : -1;

        const getHorizontalPawDisp = (phaseOffset: number) => {
          const p = ((climbPhase + phaseOffset) % 1.0 + 1.0) % 1.0;
          if (p < 0.5) {
            // Grounded stance phase: moves opposite to travel direction at constant velocity
            const t = p / 0.5;
            const offsetX = dirSign * (-reachMaxX + t * (2 * reachMaxX));
            return { offsetX, offsetY: 0 };
          } else {
            // Swing phase: reaches forward to next grip hold
            const s = (p - 0.5) / 0.5;
            const swingEase = 0.5 * (1 - Math.cos(s * Math.PI));
            const offsetX = dirSign * (reachMaxX - swingEase * (2 * reachMaxX));
            const offsetY = Math.sin(s * Math.PI) * (h * 0.03);
            return { offsetX, offsetY };
          }
        };

        // Strict contralateral synchronization:
        const dFL = getHorizontalPawDisp(0.0);
        const dFR = getHorizontalPawDisp(0.5);
        const dBL = getHorizontalPawDisp(0.5);
        const dBR = getHorizontalPawDisp(0.0);

        flX += dFL.offsetX;
        flY += dFL.offsetY;
        frX += dFR.offsetX;
        frY -= dFR.offsetY;
        blX += dBL.offsetX * 0.85;
        blY -= dBL.offsetY * 0.6;
        brX += dBR.offsetX * 0.85;
        brY += dBR.offsetY * 0.6;
      } else {
        // Vertical climbing up/down building wall:
        // Grounded Stance Kinematics with strict contralateral limb pairing:
        // When Left Hind Leg (BL) reaches upward, Right Arm (FR) reaches upward together.
        // At the exact same time, Left Arm (FL) and Right Hind Leg (BR) reach downward together!
        const reachMaxY = h * 0.20;

        const getVerticalPawDisp = (phaseOffset: number) => {
          const p = ((climbPhase + phaseOffset) % 1.0 + 1.0) % 1.0;
          if (p < 0.5) {
            // STANCE / PULL PHASE: Firmly grounded on the brick wall
            // Linear velocity cancels vertical body translation 1:1
            const t = p / 0.5;
            const offsetY = -reachMaxY + t * (2 * reachMaxY);
            return { offsetY, liftSpread: 0 };
          } else {
            // SWING / REACH PHASE: Lifts off wall and swings forward to next grip hold
            const s = (p - 0.5) / 0.5;
            const swingEase = 0.5 * (1 - Math.cos(s * Math.PI));
            const offsetY = reachMaxY - swingEase * (2 * reachMaxY);
            const liftSpread = Math.sin(s * Math.PI) * (w * 0.07);
            return { offsetY, liftSpread };
          }
        };

        // Strict contralateral synchronization:
        // Pair 1: Front Right Arm (FR) and Back Left Hind Leg (BL) at phase 0.5
        // Pair 2: Front Left Arm (FL) and Back Right Hind Leg (BR) at phase 0.0
        const dFL = getVerticalPawDisp(0.0);
        const dFR = getVerticalPawDisp(0.5);
        const dBL = getVerticalPawDisp(0.5);
        const dBR = getVerticalPawDisp(0.0);

        flY += dFL.offsetY;
        flX -= dFL.liftSpread;
        frY += dFR.offsetY;
        frX += dFR.liftSpread;
        blY += dBL.offsetY * 0.85;
        blX -= dBL.liftSpread * 0.6;
        brY += dBR.offsetY * 0.85;
        brX += dBR.liftSpread * 0.6;
      }
    }

    // Draw furry limbs connecting shoulders & hips to paws (seen from behind)
    const limbs = [
      { bodyX: -w * 0.26, bodyY: -h * 0.14, pawX: flX, pawY: flY, width: w * 0.16 }, // Front Left arm
      { bodyX: w * 0.26, bodyY: -h * 0.14, pawX: frX, pawY: frY, width: w * 0.16 },  // Front Right arm
      { bodyX: -w * 0.30, bodyY: h * 0.14, pawX: blX, pawY: blY, width: w * 0.18 },   // Back Left leg
      { bodyX: w * 0.30, bodyY: h * 0.14, pawX: brX, pawY: brY, width: w * 0.18 },    // Back Right leg
    ];

    limbs.forEach((l) => {
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_MAIN;
      ctx.beginPath();
      const angle = Math.atan2(l.pawY - l.bodyY, l.pawX - l.bodyX);
      const perpX = Math.sin(angle) * (l.width * 0.5);
      const perpY = -Math.cos(angle) * (l.width * 0.5);
      const wristPerpX = Math.sin(angle) * (pawRadius * 0.8);
      const wristPerpY = -Math.cos(angle) * (pawRadius * 0.8);

      ctx.moveTo(l.bodyX - perpX, l.bodyY - perpY);
      ctx.lineTo(l.bodyX + perpX, l.bodyY + perpY);
      ctx.lineTo(l.pawX + wristPerpX, l.pawY + wristPerpY);
      ctx.lineTo(l.pawX - wristPerpX, l.pawY - wristPerpY);
      ctx.closePath();
      ctx.fill();

      // Darker shading on limb edge
      ctx.strokeStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_DARK;
      ctx.lineWidth = Math.max(1, w * 0.012);
      ctx.beginPath();
      ctx.moveTo(l.bodyX + perpX, l.bodyY + perpY);
      ctx.lineTo(l.pawX + wristPerpX, l.pawY + wristPerpY);
      ctx.stroke();
    });

    const paws = [
      { x: flX, y: flY },
      { x: frX, y: frY },
      { x: blX, y: blY },
      { x: brX, y: brY },
    ];

    paws.forEach((p) => {
      // Paw pad
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.PAWS;
      ctx.beginPath();
      ctx.arc(p.x, p.y, pawRadius, 0, Math.PI * 2);
      ctx.fill();

      // Tiny grip claws
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.CLAWS;
      for (let c = -1; c <= 1; c++) {
        ctx.beginPath();
        ctx.arc(p.x + c * (pawRadius * 0.55), p.y - pawRadius * 0.85, pawRadius * 0.24, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  /**
   * Friction / slip motion lines when bumping against unclimbable glass
   */
  private drawGlassSlipEffects(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    timer: number
  ) {
    const alpha = Math.min(1, timer / 0.25);
    ctx.save();
    ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
    ctx.lineWidth = Math.max(1.5, w * 0.035);
    ctx.lineCap = 'round';

    // Slip friction streaks near paws
    const streakLength = h * 0.18;
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, -h * 0.45);
    ctx.lineTo(-w * 0.5, -h * 0.45 + streakLength);
    ctx.moveTo(w * 0.5, -h * 0.45);
    ctx.lineTo(w * 0.5, -h * 0.45 + streakLength);
    ctx.stroke();

    // Small "SLIP!" cue
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
    ctx.font = `bold ${Math.max(8, Math.floor(w * 0.22))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('SLIP!', 0, -h * 0.62);

    ctx.restore();
  }

  /**
   * Subtle calm breathing sparkle when resting on a sill (no text popup)
   */
  private drawSillRestEffect(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number
  ) {
    ctx.save();
    const pulse = 0.5 + 0.5 * Math.sin(time * 3);

    // Two tiny green resting sparkles (clean and unobtrusive, zero text popup)
    const sparkAlpha = 0.35 + 0.45 * pulse;
    ctx.fillStyle = `rgba(52, 211, 153, ${sparkAlpha})`;
    ctx.beginPath();
    ctx.arc(-w * 0.25, -h * 0.95, w * 0.035, 0, Math.PI * 2);
    ctx.arc(w * 0.25, -h * 0.95, w * 0.035, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Fluffy raccoon body viewed from behind while climbing:
   * Displays the warm furry back, rounded rump, shoulder blades, flank tufts, and dorsal spine stripe (no belly)
   */
  private drawRaccoonBody(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ) {
    // 1. Main warm furry back (shoulders and rump)
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_MAIN;
    // Upper back / shoulders
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.08, w * 0.44, h * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chubby lower back & rounded rump
    ctx.beginPath();
    ctx.ellipse(0, h * 0.12, w * 0.48, h * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Cute fluffy fur tufts on left and right flanks
    ctx.beginPath();
    ctx.ellipse(-w * 0.43, h * 0.05, w * 0.12, h * 0.18, -0.22, 0, Math.PI * 2);
    ctx.ellipse(w * 0.43, h * 0.05, w * 0.12, h * 0.18, 0.22, 0, Math.PI * 2);
    ctx.fill();

    // 3. Iconic dark dorsal spine stripe (characteristic of raccoons from behind)
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_DARK;
    ctx.beginPath();
    ctx.ellipse(0, h * 0.04, w * 0.23, h * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Soft warm fur highlights on shoulder blades and flank edges
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_LIGHT;
    ctx.beginPath();
    ctx.ellipse(-w * 0.22, -h * 0.06, w * 0.12, h * 0.16, -0.2, 0, Math.PI * 2);
    ctx.ellipse(w * 0.22, -h * 0.06, w * 0.12, h * 0.16, 0.2, 0, Math.PI * 2);
    ctx.ellipse(0, -h * 0.16, w * 0.18, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Raccoon head viewed from behind during climbing mode:
   * - Keeps its head looking in the same direction as it was last heading towards (persistent gaze on pause).
   * - When climbing down: tilts downward toward paws/wall so NO face is seen, keeping this until direction changes.
   * - Proportions: Wide, chubby, cute rounded raccoon head (not oblong!).
   * - Emphasized perky ears with bold contrasting light rim trim and pink fluff.
   * - Whiskers are clean, steady, and static (not moving).
   */
  /**
   * Raccoon head viewed from behind during climbing mode:
   * - Proportional dimensions: wide, chubby, cute rounded raccoon head matching sill/trash can scale.
   * - Diagonal climbing: head and eyes look dynamically in the related diagonal direction (up-left, up-right, down-left, down-right).
   * - Pure vertical down: tilts downward toward paws/wall so no face is seen.
   * - No whiskers at all (clean cute cheeks and snout).
   * - Emphasized perky ears with bold contrasting light rim trim and pink fluff.
   */
  private drawRaccoonHead(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    raccoon: RaccoonPosition,
    time: number
  ) {
    // Proportional dimensions: base head scale on w (horizontal scale)
    // so head remains chubby, cute, and round, completely preventing oblong vertical stretching
    const headW = w * 0.48;
    const headH = w * 0.38; // Chubby horizontal roundness (wider than tall)
    const headY = -h * 0.38;

    // 1. Determine persistent heading direction
    // Always keep head looking in the same direction it was last heading towards!
    const heading = raccoon.lastHeadingDirection || 'up';

    let turnX = 0; // -1 (fully left) to +1 (fully right)
    let tiltY = -0.92; // -1 (looking up) to +1 (looking down)
    let isDown = false; // Pure vertical down: no face seen
    let headTiltAngle = 0; // Dynamic head rotation angle (radians)

    if (heading === 'up') {
      turnX = 0;
      tiltY = -0.95;
    } else if (heading === 'down') {
      // Pure vertical down: back of head only, no face seen
      turnX = 0;
      tiltY = 0.85;
      isDown = true;
    } else if (heading === 'left') {
      turnX = -0.94;
      tiltY = -0.15;
    } else if (heading === 'right') {
      turnX = 0.94;
      tiltY = -0.15;
    } else if (heading === 'up-left') {
      // Diagonally up and left: head tilts cocked upward-left and lifts up
      turnX = -0.74;
      tiltY = -0.85;
      headTiltAngle = -0.20; // ~-11.5 degrees cocked upward-left
    } else if (heading === 'up-right') {
      // Diagonally up and right: head tilts cocked upward-right and lifts up
      turnX = 0.74;
      tiltY = -0.85;
      headTiltAngle = 0.20; // ~+11.5 degrees cocked upward-right
    } else if (heading === 'down-left') {
      // Diagonally down and left
      turnX = -0.74;
      tiltY = 0.65;
      headTiltAngle = 0.12; // tilted chin-downward
    } else if (heading === 'down-right') {
      // Diagonally down and right
      turnX = 0.74;
      tiltY = 0.65;
      headTiltAngle = -0.12; // tilted chin-downward
    }

    const absTurnX = Math.abs(turnX);
    const isUpDiagonal = heading === 'up-left' || heading === 'up-right';
    const isDownDiagonal = heading === 'down-left' || heading === 'down-right';

    let headCenterY = headY;
    if (isDown) {
      headCenterY = headY + headH * 0.12;
    } else if (isDownDiagonal) {
      headCenterY = headY + headH * 0.10;
    } else if (isUpDiagonal) {
      headCenterY = headY - headH * 0.16; // Visibly lifted upward toward climbing path!
    } else if (heading === 'up') {
      headCenterY = headY - headH * 0.08;
    } else {
      headCenterY = headY - headH * 0.02;
    }

    const headCenterX = turnX * (isUpDiagonal || isDownDiagonal ? headW * 0.16 : headW * 0.12);

    // 2. Emphasized Perky Ears (Prominent, larger, and with contrasting light outer trim)
    const earH = headW * 0.64; // Perky, prominent ears!
    const earTwitch = Math.sin(time * 4) * (headW * 0.025); // Gentle subtle ear perk

    // Left Ear Tip
    let leftEarTipX = headCenterX - headW * 0.78 - (turnX < 0 ? headW * 0.06 : 0) - earTwitch;
    let leftEarTipY = headCenterY - earH;

    // Right Ear Tip
    let rightEarTipX = headCenterX + headW * 0.78 + (turnX > 0 ? headW * 0.06 : 0) + earTwitch;
    let rightEarTipY = headCenterY - earH;

    if (isDown) {
      leftEarTipY += headH * 0.14;
      rightEarTipY += headH * 0.14;
    } else if (isDownDiagonal) {
      leftEarTipY += headH * 0.08;
      rightEarTipY += headH * 0.08;
    } else if (heading === 'up-left') {
      // Left ear (leading) perks higher and reaches upward-left; right ear settles
      leftEarTipX -= headW * 0.08;
      leftEarTipY -= headH * 0.15;
      rightEarTipY += headH * 0.06;
    } else if (heading === 'up-right') {
      // Right ear (leading) perks higher and reaches upward-right; left ear settles
      rightEarTipX += headW * 0.08;
      rightEarTipY -= headH * 0.15;
      leftEarTipY += headH * 0.06;
    }

    if (turnX < -0.22 && !isDown) {
      // Left ear rotated into 3/4 front view as head turns left!
      // Dark outer frame
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_DARK;
      ctx.beginPath();
      ctx.moveTo(headCenterX - headW * 0.74, headCenterY);
      ctx.lineTo(leftEarTipX - headW * 0.04, leftEarTipY - headH * 0.04);
      ctx.lineTo(headCenterX - headW * 0.22, headCenterY - earH * 0.35);
      ctx.closePath();
      ctx.fill();

      // Main ear face
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_MAIN;
      ctx.beginPath();
      ctx.moveTo(headCenterX - headW * 0.70, headCenterY);
      ctx.lineTo(leftEarTipX, leftEarTipY);
      ctx.lineTo(headCenterX - headW * 0.25, headCenterY - earH * 0.38);
      ctx.closePath();
      ctx.fill();

      // Soft pink inner ear fluff
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EAR_INNER;
      ctx.beginPath();
      ctx.moveTo(headCenterX - headW * 0.62, headCenterY - earH * 0.08);
      ctx.lineTo(leftEarTipX + headW * 0.08, leftEarTipY + earH * 0.20);
      ctx.lineTo(headCenterX - headW * 0.35, headCenterY - earH * 0.38);
      ctx.closePath();
      ctx.fill();

      // Bold contrasting crisp light rim trim outlining the ear!
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = Math.max(1.5, w * 0.018);
      ctx.beginPath();
      ctx.moveTo(headCenterX - headW * 0.74, headCenterY);
      ctx.lineTo(leftEarTipX, leftEarTipY);
      ctx.lineTo(headCenterX - headW * 0.22, headCenterY - earH * 0.35);
      ctx.stroke();

    } else {
      // Left ear seen from behind: dark back of ear with bold light rim trim & inner fluff peeking over
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_DARK;
      ctx.beginPath();
      ctx.moveTo(headCenterX - headW * 0.74, headCenterY);
      ctx.lineTo(leftEarTipX, leftEarTipY);
      ctx.lineTo(headCenterX - headW * 0.24, headCenterY - earH * 0.36);
      ctx.closePath();
      ctx.fill();

      // Emphasized light rim trim along the outer contour of the ear
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = Math.max(1.5, w * 0.018);
      ctx.beginPath();
      ctx.moveTo(headCenterX - headW * 0.74, headCenterY);
      ctx.lineTo(leftEarTipX, leftEarTipY);
      ctx.lineTo(headCenterX - headW * 0.24, headCenterY - earH * 0.36);
      ctx.stroke();

      // Soft pink/white ear tuft peeking over the top edge
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EAR_INNER;
      ctx.beginPath();
      ctx.arc(leftEarTipX + headW * 0.05, leftEarTipY + earH * 0.16, headW * 0.075, 0, Math.PI * 2);
      ctx.fill();
    }

    // Right Ear
    if (turnX > 0.22 && !isDown) {
      // Right ear rotated into 3/4 front view as head turns right!
      // Dark outer frame
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_DARK;
      ctx.beginPath();
      ctx.moveTo(headCenterX + headW * 0.74, headCenterY);
      ctx.lineTo(rightEarTipX + headW * 0.04, rightEarTipY - headH * 0.04);
      ctx.lineTo(headCenterX + headW * 0.22, headCenterY - earH * 0.35);
      ctx.closePath();
      ctx.fill();

      // Main ear face
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_MAIN;
      ctx.beginPath();
      ctx.moveTo(headCenterX + headW * 0.70, headCenterY);
      ctx.lineTo(rightEarTipX, rightEarTipY);
      ctx.lineTo(headCenterX + headW * 0.25, headCenterY - earH * 0.38);
      ctx.closePath();
      ctx.fill();

      // Soft pink inner ear fluff
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EAR_INNER;
      ctx.beginPath();
      ctx.moveTo(headCenterX + headW * 0.62, headCenterY - earH * 0.08);
      ctx.lineTo(rightEarTipX - headW * 0.08, rightEarTipY + earH * 0.20);
      ctx.lineTo(headCenterX + headW * 0.35, headCenterY - earH * 0.38);
      ctx.closePath();
      ctx.fill();

      // Bold contrasting crisp light rim trim outlining the ear!
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = Math.max(1.5, w * 0.018);
      ctx.beginPath();
      ctx.moveTo(headCenterX + headW * 0.74, headCenterY);
      ctx.lineTo(rightEarTipX, rightEarTipY);
      ctx.lineTo(headCenterX + headW * 0.22, headCenterY - earH * 0.35);
      ctx.stroke();

    } else {
      // Right ear seen from behind: dark back of ear with bold light rim trim & inner fluff peeking over
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_DARK;
      ctx.beginPath();
      ctx.moveTo(headCenterX + headW * 0.74, headCenterY);
      ctx.lineTo(rightEarTipX, rightEarTipY);
      ctx.lineTo(headCenterX + headW * 0.24, headCenterY - earH * 0.36);
      ctx.closePath();
      ctx.fill();

      // Emphasized light rim trim along the outer contour of the ear
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = Math.max(1.5, w * 0.018);
      ctx.beginPath();
      ctx.moveTo(headCenterX + headW * 0.74, headCenterY);
      ctx.lineTo(rightEarTipX, rightEarTipY);
      ctx.lineTo(headCenterX + headW * 0.24, headCenterY - earH * 0.36);
      ctx.stroke();

      // Soft pink/white ear tuft peeking over the top edge
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EAR_INNER;
      ctx.beginPath();
      ctx.arc(rightEarTipX - headW * 0.05, rightEarTipY + earH * 0.16, headW * 0.075, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Cute Chubby Crown & Rounded Back of Head (viewed from behind)
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_MAIN;
    // Wide, fluffy cheek tufts flaring out horizontally
    ctx.beginPath();
    ctx.ellipse(
      headCenterX - headW * 0.72,
      headCenterY + headH * (isUpDiagonal ? -0.04 : 0.10),
      headW * 0.36,
      headH * 0.28,
      -0.25 + headTiltAngle,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(
      headCenterX + headW * 0.72,
      headCenterY + headH * (isUpDiagonal ? -0.04 : 0.10),
      headW * 0.36,
      headH * 0.28,
      0.25 + headTiltAngle,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Round chubby crown base (wider than tall, delightfully cute and round)
    ctx.beginPath();
    ctx.ellipse(headCenterX, headCenterY, headW * 0.96, headH * 0.88, headTiltAngle, 0, Math.PI * 2);
    ctx.fill();

    // Darker nape of the neck connecting into the dorsal stripe
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_DARK;
    ctx.beginPath();
    ctx.ellipse(headCenterX, headCenterY + headH * 0.34, headW * 0.44, headH * 0.28, headTiltAngle, 0, Math.PI * 2);
    ctx.fill();

    // Soft lighter cheek fur tufts on sides
    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_LIGHT;
    ctx.beginPath();
    ctx.ellipse(
      headCenterX - headW * 0.78,
      headCenterY + headH * (isUpDiagonal ? 0.02 : 0.14),
      headW * 0.18,
      headH * 0.14,
      -0.35 + headTiltAngle,
      0,
      Math.PI * 2
    );
    ctx.ellipse(
      headCenterX + headW * 0.78,
      headCenterY + headH * (isUpDiagonal ? 0.02 : 0.14),
      headW * 0.18,
      headH * 0.14,
      0.35 + headTiltAngle,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Crown fur tufts (soft fluffy hairs at top of head)
    ctx.beginPath();
    ctx.ellipse(
      headCenterX - Math.sin(headTiltAngle) * (headH * 0.65),
      headCenterY - Math.cos(headTiltAngle) * (headH * 0.65),
      headW * 0.28,
      headH * 0.16,
      headTiltAngle,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // 4. Face Reveal or Downward Look
    if (isDown) {
      // ===== PURE VERTICAL DOWN: Head tilted downward toward paws/brick =====
      // Face is completely concealed from behind
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_DARK;
      ctx.beginPath();
      ctx.ellipse(headCenterX, headCenterY - headH * 0.20, headW * 0.48, headH * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.FUR_MAIN;
      ctx.beginPath();
      ctx.ellipse(headCenterX, headCenterY - headH * 0.15, headW * 0.42, headH * 0.30, 0, 0, Math.PI * 2);
      ctx.fill();

    } else if (turnX < -0.20) {
      // ===== HEAD TURNED LEFT / DIAGONALLY LEFT: Left 3/4 Face Swings into View =====
      const faceShift = Math.min(1.0, (absTurnX - 0.20) / 0.70);
      let snoutX = headCenterX - headW * (0.36 + faceShift * 0.42);
      let snoutY = headCenterY + headH * 0.12;
      let snoutAngle = -0.22;
      let eyeGazeOffsetX = -headW * 0.06;
      let eyeGazeOffsetY = 0;
      let noseOffsetY = -headH * 0.05;
      let eyeOffsetY = -headH * 0.16;
      let maskAngle = -0.18;
      let eyebrowAngle = -0.22;

      if (heading === 'up-left') {
        // Upper-left diagonal: entire snout, nose, mask, eye, and eyebrow lift and angle upward!
        snoutX = headCenterX - headW * 0.78;
        snoutY = headCenterY - headH * 0.12; // Above head center!
        snoutAngle = -0.48; // Distinct ~28° upward tilt!
        noseOffsetY = -headH * 0.10;
        eyeOffsetY = -headH * 0.14;
        maskAngle = -0.38;
        eyebrowAngle = -0.38;
        eyeGazeOffsetX = -headW * 0.07;
        eyeGazeOffsetY = -headH * 0.07;
      } else if (heading === 'down-left') {
        // Downward-left diagonal: snout points downward
        snoutX = headCenterX - headW * 0.72;
        snoutY = headCenterY + headH * 0.24;
        snoutAngle = -0.10;
        noseOffsetY = headH * 0.06;
        eyeOffsetY = -headH * 0.14;
        maskAngle = -0.10;
        eyebrowAngle = -0.14;
        eyeGazeOffsetX = -headW * 0.07;
        eyeGazeOffsetY = headH * 0.065;
      }

      // Cream Snout projecting in direction of heading
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.SNOUT;
      ctx.beginPath();
      ctx.ellipse(snoutX, snoutY, headW * 0.38, headH * 0.26, snoutAngle, 0, Math.PI * 2);
      ctx.fill();

      // Shiny Black Button Nose
      const noseX = snoutX - headW * 0.14;
      const noseY = snoutY + noseOffsetY;
      const noseR = headW * 0.11;
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.NOSE;
      ctx.beginPath();
      ctx.arc(noseX, noseY, noseR, 0, Math.PI * 2);
      ctx.fill();

      // White nose highlight glint
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(noseX - noseR * 0.3, noseY - noseR * 0.35, noseR * 0.32, 0, Math.PI * 2);
      ctx.fill();

      // Black Bandit Mask around left eye
      const eyeX = snoutX + headW * (heading === 'up-left' ? 0.22 : 0.20);
      const eyeY = snoutY + eyeOffsetY;
      const eyeR = headW * 0.21;

      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.MASK;
      ctx.beginPath();
      ctx.ellipse(eyeX, eyeY, headW * 0.34, headH * 0.30, maskAngle, 0, Math.PI * 2);
      ctx.fill();

      // White Eyebrow marking
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EYEBROWS;
      ctx.beginPath();
      ctx.ellipse(eyeX - headW * 0.02, eyeY - headH * 0.32, headW * 0.18, headH * 0.10, eyebrowAngle, 0, Math.PI * 2);
      ctx.fill();

      // Big Sparkling Anime Eye looking in the related direction (including diagonal!)
      // Pure white sclera
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EYE_WHITE;
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Amber Iris looking diagonally / along heading
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EYE_IRIS;
      ctx.beginPath();
      ctx.arc(eyeX + eyeGazeOffsetX, eyeY + eyeGazeOffsetY, eyeR * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // Deep dark pupil
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EYE_PUPIL;
      ctx.beginPath();
      ctx.arc(eyeX + eyeGazeOffsetX * 1.15, eyeY + eyeGazeOffsetY * 1.15, eyeR * 0.54, 0, Math.PI * 2);
      ctx.fill();

      // Primary bright sparkle catchlight aligned with gaze
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeX + eyeGazeOffsetX + eyeR * 0.22, eyeY + eyeGazeOffsetY - eyeR * 0.20, eyeR * 0.26, 0, Math.PI * 2);
      ctx.fill();

      // Secondary micro-sparkle
      ctx.beginPath();
      ctx.arc(eyeX + eyeGazeOffsetX - eyeR * 0.18, eyeY + eyeGazeOffsetY + eyeR * 0.22, eyeR * 0.12, 0, Math.PI * 2);
      ctx.fill();

      // (No whiskers per user request - clean cute snout & cheeks!)

    } else if (turnX > 0.20) {
      // ===== HEAD TURNED RIGHT / DIAGONALLY RIGHT: Right 3/4 Face Swings into View =====
      const faceShift = Math.min(1.0, (absTurnX - 0.20) / 0.70);
      let snoutX = headCenterX + headW * (0.36 + faceShift * 0.42);
      let snoutY = headCenterY + headH * 0.12;
      let snoutAngle = 0.22;
      let eyeGazeOffsetX = headW * 0.06;
      let eyeGazeOffsetY = 0;
      let noseOffsetY = -headH * 0.05;
      let eyeOffsetY = -headH * 0.16;
      let maskAngle = 0.18;
      let eyebrowAngle = 0.22;

      if (heading === 'up-right') {
        // Upper-right diagonal: entire snout, nose, mask, eye, and eyebrow lift and angle upward!
        snoutX = headCenterX + headW * 0.78;
        snoutY = headCenterY - headH * 0.12; // Above head center!
        snoutAngle = 0.48; // Distinct ~28° upward tilt!
        noseOffsetY = -headH * 0.10;
        eyeOffsetY = -headH * 0.14;
        maskAngle = 0.38;
        eyebrowAngle = 0.38;
        eyeGazeOffsetX = headW * 0.07;
        eyeGazeOffsetY = -headH * 0.07;
      } else if (heading === 'down-right') {
        // Downward-right diagonal: snout points downward
        snoutX = headCenterX + headW * 0.72;
        snoutY = headCenterY + headH * 0.24;
        snoutAngle = 0.10;
        noseOffsetY = headH * 0.06;
        eyeOffsetY = -headH * 0.14;
        maskAngle = 0.10;
        eyebrowAngle = 0.14;
        eyeGazeOffsetX = headW * 0.07;
        eyeGazeOffsetY = headH * 0.065;
      }

      // Cream Snout projecting in direction of heading
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.SNOUT;
      ctx.beginPath();
      ctx.ellipse(snoutX, snoutY, headW * 0.38, headH * 0.26, snoutAngle, 0, Math.PI * 2);
      ctx.fill();

      // Shiny Black Button Nose
      const noseX = snoutX + headW * 0.14;
      const noseY = snoutY + noseOffsetY;
      const noseR = headW * 0.11;
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.NOSE;
      ctx.beginPath();
      ctx.arc(noseX, noseY, noseR, 0, Math.PI * 2);
      ctx.fill();

      // White nose highlight glint
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(noseX - noseR * 0.3, noseY - noseR * 0.35, noseR * 0.32, 0, Math.PI * 2);
      ctx.fill();

      // Black Bandit Mask around right eye
      const eyeX = snoutX - headW * (heading === 'up-right' ? 0.22 : 0.20);
      const eyeY = snoutY + eyeOffsetY;
      const eyeR = headW * 0.21;

      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.MASK;
      ctx.beginPath();
      ctx.ellipse(eyeX, eyeY, headW * 0.34, headH * 0.30, maskAngle, 0, Math.PI * 2);
      ctx.fill();

      // White Eyebrow marking
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EYEBROWS;
      ctx.beginPath();
      ctx.ellipse(eyeX + headW * 0.02, eyeY - headH * 0.32, headW * 0.18, headH * 0.10, eyebrowAngle, 0, Math.PI * 2);
      ctx.fill();

      // Big Sparkling Anime Eye looking in the related direction (including diagonal!)
      // Pure white sclera
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EYE_WHITE;
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Amber Iris looking diagonally / along heading
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EYE_IRIS;
      ctx.beginPath();
      ctx.arc(eyeX + eyeGazeOffsetX, eyeY + eyeGazeOffsetY, eyeR * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // Deep dark pupil
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EYE_PUPIL;
      ctx.beginPath();
      ctx.arc(eyeX + eyeGazeOffsetX * 1.15, eyeY + eyeGazeOffsetY * 1.15, eyeR * 0.54, 0, Math.PI * 2);
      ctx.fill();

      // Primary bright sparkle catchlight aligned with gaze
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeX + eyeGazeOffsetX + eyeR * 0.22, eyeY + eyeGazeOffsetY - eyeR * 0.20, eyeR * 0.26, 0, Math.PI * 2);
      ctx.fill();

      // Secondary micro-sparkle
      ctx.beginPath();
      ctx.arc(eyeX + eyeGazeOffsetX - eyeR * 0.18, eyeY + eyeGazeOffsetY + eyeR * 0.22, eyeR * 0.12, 0, Math.PI * 2);
      ctx.fill();

      // (No whiskers per user request - clean cute snout & cheeks!)

    } else {
      // ===== HEAD DIRECTED UPWARD: Head tilted back looking up at the summit =====
      // Viewed from behind: the back of the head is tilted back toward the wall
      // The white eyebrow tufts peek subtly along the top forehead rim
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.EYEBROWS;
      ctx.beginPath();
      ctx.ellipse(headCenterX - headW * 0.32, headCenterY - headH * 0.62, headW * 0.22, headH * 0.12, -0.15, 0, Math.PI * 2);
      ctx.ellipse(headCenterX + headW * 0.32, headCenterY - headH * 0.62, headW * 0.22, headH * 0.12, 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Tip of cream snout and button nose just peeking slightly over the top horizon
      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.SNOUT;
      ctx.beginPath();
      ctx.ellipse(headCenterX, headCenterY - headH * 0.72, headW * 0.24, headH * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.NOSE;
      ctx.beginPath();
      ctx.arc(headCenterX, headCenterY - headH * 0.78, headW * 0.09, 0, Math.PI * 2);
      ctx.fill();

      // Tiny white highlight glint on tip of nose
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(headCenterX - headW * 0.025, headCenterY - headH * 0.80, headW * 0.03, 0, Math.PI * 2);
      ctx.fill();

      // (No whiskers per user request - clean cute snout & cheeks!)
    }
  }

  /**
   * Scramble sweat drops, dynamic speed lines & paw scuff trails when speed boosted / climbing fast
   */
  private drawScrambleEffects(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number
  ) {
    ctx.save();

    // 1. Aerodynamic Speed Boost Streaks trailing behind paws
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
    ctx.lineWidth = Math.max(1.5, w * 0.025);
    ctx.lineCap = 'round';

    const streakOffsets = [
      { x: -w * 0.45, y: h * 0.25, len: h * 0.35, phase: 0 },
      { x: -w * 0.25, y: h * 0.35, len: h * 0.45, phase: 1.5 },
      { x: w * 0.25, y: h * 0.35, len: h * 0.45, phase: 0.8 },
      { x: w * 0.45, y: h * 0.25, len: h * 0.35, phase: 2.2 },
    ];

    streakOffsets.forEach((s) => {
      const pulse = 0.5 + 0.5 * Math.sin(time * 24 + s.phase);
      const sy = s.y + pulse * (h * 0.12);
      ctx.beginPath();
      ctx.moveTo(s.x, sy);
      ctx.lineTo(s.x, sy + s.len);
      ctx.stroke();
    });

    // 2. Energetic micro-sparks near paws
    for (let i = 0; i < 3; i++) {
      const sparkX = (Math.sin(time * 18 + i * 2) * 0.4) * w;
      const sparkY = h * 0.30 + (i * 0.08) * h;
      ctx.fillStyle = i % 2 === 0 ? '#34d399' : '#fef08a';
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, Math.max(1, w * 0.02), 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Cute animated effort sweat drop
    const dropY = -h * 0.55 + Math.sin(time * 12) * (h * 0.04);
    const dropX = w * 0.42;

    ctx.fillStyle = GAME_CONFIG.PALETTE.RACCOON.SWEAT_DROP;
    ctx.beginPath();
    ctx.arc(dropX, dropY, w * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(dropX - w * 0.06, dropY);
    ctx.lineTo(dropX, dropY - h * 0.06);
    ctx.lineTo(dropX + w * 0.06, dropY);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * Slice 3: Draw Snacks resting upon window sills across the building
   */
  private drawSnacks(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    snacks: SnackItem[],
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    if (!snacks || snacks.length === 0) return;

    const unitW = this.getUnitW(W, H);
    const snackW = unitW * GAME_CONFIG.SNACKS.WIDTH_RATIO;
    const snackH = H * GAME_CONFIG.SNACKS.HEIGHT_RATIO;

    snacks.forEach((snack) => {
      const sx = this.worldToScreenX(snack.x, cameraX, W, H);
      const sillScreenY = this.worldToScreenY(snack.sillY, cameraY, H);

      // Frustum culling
      if (sx < -snackW * 2 || sx > W + snackW * 2 || sillScreenY < -snackH * 2 || sillScreenY > H + snackH * 2) {
        return;
      }

      ctx.save();

      // Expiring warning: blink rapidly if less than 3s remain
      if (snack.isExpiring) {
        const blinkPhase = Math.sin(time * 16 + snack.id);
        ctx.globalAlpha = blinkPhase > 0 ? 0.35 : 1.0;
      }

      // Gentle vertical bobble
      const bobble = Math.sin(time * 3.6 + snack.bobblePhase) * (snackH * 0.08);
      const sy = sillScreenY - snackH * 0.92 + bobble;

      // Contact shadow beneath snack directly on the sill ledge
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.beginPath();
      ctx.ellipse(sx, sillScreenY, snackW * 0.42, snackH * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Soft luminous aura so player spots the snack clearly
      const aura = ctx.createRadialGradient(sx, sy + snackH * 0.5, snackW * 0.15, sx, sy + snackH * 0.5, snackW * 0.85);
      aura.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
      aura.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(sx, sy + snackH * 0.5, snackW * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // Render specific snack type from Content Bible
      switch (snack.type) {
        case 'snack_huge_pizza':
        case 'snack_pizza_ledge':
        case 'pizza': {
          const isHuge = snack.type === 'snack_huge_pizza';
          const scale = isHuge ? 1.35 : 1.0;
          const halfW = snackW * 0.48 * scale;
          const curH = snackH * scale;

          if (isHuge) {
            // Golden champion shimmer aura
            ctx.fillStyle = 'rgba(250, 204, 21, 0.45)';
            ctx.beginPath();
            ctx.arc(sx, sy + curH * 0.35, halfW * 1.3, 0, Math.PI * 2);
            ctx.fill();
          }

          // Golden crust
          ctx.fillStyle = isHuge ? '#b45309' : '#d97706';
          ctx.beginPath();
          ctx.arc(sx, sy, halfW, 0, Math.PI);
          ctx.fill();

          // Cheese triangle
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(sx - halfW * 0.85, sy + curH * 0.08);
          ctx.lineTo(sx + halfW * 0.85, sy + curH * 0.08);
          ctx.lineTo(sx, sy + curH * 0.85);
          ctx.closePath();
          ctx.fill();

          // Melting cheese streaks
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.moveTo(sx - halfW * 0.55, sy + curH * 0.12);
          ctx.lineTo(sx + halfW * 0.55, sy + curH * 0.12);
          ctx.lineTo(sx, sy + curH * 0.72);
          ctx.closePath();
          ctx.fill();

          // Pepperoni slices
          const peps = [
            { x: sx - halfW * 0.28, y: sy + curH * 0.26, r: snackW * 0.09 * scale },
            { x: sx + halfW * 0.26, y: sy + curH * 0.28, r: snackW * 0.08 * scale },
            { x: sx - halfW * 0.02, y: sy + curH * 0.50, r: snackW * 0.075 * scale },
          ];
          peps.forEach((p) => {
            ctx.fillStyle = '#991b1b';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.arc(p.x - p.r * 0.15, p.y - p.r * 0.15, p.r * 0.75, 0, Math.PI * 2);
            ctx.fill();
          });
          break;
        }

        case 'snack_flying_donut':
        case 'snack_donut':
        case 'donut': {
          const isFlying = snack.type === 'snack_flying_donut';
          const r = snackW * 0.42;
          const cy = sy + snackH * 0.5;

          if (isFlying) {
            // Little cute animated angel wings on donut!
            const wingFlap = Math.sin(time * 16 + snack.id) * 0.35;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
            // Left wing
            ctx.save();
            ctx.translate(sx - r * 0.9, cy);
            ctx.rotate(-0.3 + wingFlap);
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.75, r * 0.35, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            // Right wing
            ctx.save();
            ctx.translate(sx + r * 0.9, cy);
            ctx.rotate(0.3 - wingFlap);
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.75, r * 0.35, 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // Dough base
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.arc(sx, cy, r, 0, Math.PI * 2);
          ctx.fill();

          // Glossy strawberry icing
          ctx.fillStyle = isFlying ? '#a855f7' : '#ec4899';
          ctx.beginPath();
          ctx.arc(sx, cy, r * 0.88, 0, Math.PI * 2);
          ctx.fill();

          // Inner donut hole cutout
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(sx, cy, r * 0.32, 0, Math.PI * 2);
          ctx.fill();

          // Sprinkles (white, golden, sky blue)
          const sprinkles = [
            { ox: -0.4, oy: -0.3, c: '#ffffff', rot: 0.3 },
            { ox: 0.35, oy: -0.35, c: '#fde047', rot: -0.4 },
            { ox: -0.38, oy: 0.28, c: '#38bdf8', rot: 0.8 },
            { ox: 0.32, oy: 0.25, c: '#ffffff', rot: -0.6 },
            { ox: 0.0, oy: -0.55, c: '#4ade80', rot: 0.1 },
            { ox: 0.05, oy: 0.55, c: '#fde047', rot: 0.7 },
          ];
          sprinkles.forEach((s) => {
            ctx.save();
            ctx.translate(sx + s.ox * r, cy + s.oy * r);
            ctx.rotate(s.rot);
            ctx.fillStyle = s.c;
            ctx.fillRect(-snackW * 0.05, -snackH * 0.02, snackW * 0.10, snackH * 0.04);
            ctx.restore();
          });
          break;
        }

        case 'snack_french_fries': {
          // Iconic red fries box with golden fries
          const boxW = snackW * 0.75;
          const boxH = snackH * 0.65;
          const boxY = sy + snackH * 0.35;

          // Crispy golden fries poking out
          ctx.fillStyle = '#fbbf24';
          const fries = [-0.28, -0.15, -0.02, 0.12, 0.25];
          fries.forEach((fx, i) => {
            const fHeight = snackH * (0.45 + (i % 2) * 0.15);
            ctx.fillRect(sx + fx * boxW, boxY - fHeight * 0.6, boxW * 0.14, fHeight);
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(sx + fx * boxW, boxY - fHeight * 0.6, boxW * 0.04, fHeight);
            ctx.fillStyle = '#fbbf24';
          });

          // Red carton box
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(sx - boxW * 0.5, boxY);
          ctx.lineTo(sx + boxW * 0.5, boxY);
          ctx.lineTo(sx + boxW * 0.42, boxY + boxH);
          ctx.lineTo(sx - boxW * 0.42, boxY + boxH);
          ctx.closePath();
          ctx.fill();

          // Yellow M arch / emblem
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(sx, boxY + boxH * 0.45, boxW * 0.18, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'snack_sandwich': {
          // Double decker club sandwich triangle
          const sw = snackW * 0.88;
          const sh = snackH * 0.72;
          const cy = sy + sh * 0.55;

          // Bottom bread
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.roundRect(sx - sw * 0.45, cy + sh * 0.15, sw * 0.9, sh * 0.22, 3);
          ctx.fill();

          // Ham / tomato
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(sx - sw * 0.42, cy + sh * 0.05, sw * 0.84, sh * 0.14);

          // Cheese
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.moveTo(sx - sw * 0.45, cy + sh * 0.05);
          ctx.lineTo(sx + sw * 0.45, cy + sh * 0.05);
          ctx.lineTo(sx + sw * 0.35, cy + sh * 0.22);
          ctx.lineTo(sx - sw * 0.35, cy + sh * 0.22);
          ctx.closePath();
          ctx.fill();

          // Lettuce
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(sx - sw * 0.44, cy - sh * 0.08, sw * 0.88, sh * 0.14);

          // Top bread
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.roundRect(sx - sw * 0.45, cy - sh * 0.28, sw * 0.9, sh * 0.22, 3);
          ctx.fill();
          // Sesame seeds
          ctx.fillStyle = '#fef3c7';
          ctx.fillRect(sx - sw * 0.2, cy - sh * 0.22, 2, 2);
          ctx.fillRect(sx + sw * 0.15, cy - sh * 0.22, 2, 2);
          break;
        }

        case 'snack_apple': {
          // Crisp red apple with shiny glint and green leaf
          const ar = snackW * 0.38;
          const ay = sy + snackH * 0.52;

          // Apple lobes
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(sx - ar * 0.35, ay, ar * 0.85, 0, Math.PI * 2);
          ctx.arc(sx + ar * 0.35, ay, ar * 0.85, 0, Math.PI * 2);
          ctx.fill();

          // Highlight
          ctx.fillStyle = '#f87171';
          ctx.beginPath();
          ctx.arc(sx - ar * 0.35, ay - ar * 0.25, ar * 0.35, 0, Math.PI * 2);
          ctx.fill();

          // Brown stem
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = Math.max(2, snackW * 0.06);
          ctx.beginPath();
          ctx.moveTo(sx, ay - ar * 0.6);
          ctx.lineTo(sx + ar * 0.15, ay - ar * 1.05);
          ctx.stroke();

          // Green leaf
          ctx.fillStyle = '#16a34a';
          ctx.beginPath();
          ctx.ellipse(sx + ar * 0.35, ay - ar * 0.85, ar * 0.35, ar * 0.18, 0.4, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'snack_cookie': {
          // Warm chocolate chip cookie
          const cr = snackW * 0.42;
          const cy = sy + snackH * 0.52;

          // Golden cookie base
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.arc(sx, cy, cr, 0, Math.PI * 2);
          ctx.fill();

          // Chocolate chips
          ctx.fillStyle = '#451a03';
          const chips = [
            [-0.4, -0.3], [0.35, -0.25], [-0.1, 0.2],
            [0.25, 0.35], [-0.35, 0.35], [0.0, -0.4]
          ];
          chips.forEach(([cx, cyOff]) => {
            ctx.beginPath();
            ctx.arc(sx + cx * cr, cy + cyOff * cr, cr * 0.18, 0, Math.PI * 2);
            ctx.fill();
          });
          break;
        }

        case 'snack_bagel': {
          // Toasted bagel with cream cheese & poppy seeds
          const br = snackW * 0.42;
          const by = sy + snackH * 0.52;

          ctx.fillStyle = '#b45309';
          ctx.beginPath();
          ctx.arc(sx, by, br, 0, Math.PI * 2);
          ctx.fill();

          // Cream cheese frosting layer
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.arc(sx, by, br * 0.82, 0, Math.PI * 2);
          ctx.fill();

          // Inner cutout
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(sx, by, br * 0.32, 0, Math.PI * 2);
          ctx.fill();

          // Everything seeds
          ctx.fillStyle = '#1e293b';
          for (let i = 0; i < 7; i++) {
            const ang = (i / 7) * Math.PI * 2;
            ctx.fillRect(sx + Math.cos(ang) * br * 0.6, by + Math.sin(ang) * br * 0.6, 2, 2);
          }
          break;
        }

        case 'snack_muffin': {
          // Blueberry muffin with paper liner
          const mw = snackW * 0.78;
          const mh = snackH * 0.78;
          const my = sy + mh * 0.35;

          // Cupcake pleated paper
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.moveTo(sx - mw * 0.42, my);
          ctx.lineTo(sx + mw * 0.42, my);
          ctx.lineTo(sx + mw * 0.32, my + mh * 0.6);
          ctx.lineTo(sx - mw * 0.32, my + mh * 0.6);
          ctx.closePath();
          ctx.fill();

          // Muffin fluffy top dome
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(sx, my, mw * 0.48, Math.PI, 0);
          ctx.fill();

          // Blueberries
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.arc(sx - mw * 0.22, my - mh * 0.18, mw * 0.1, 0, Math.PI * 2);
          ctx.arc(sx + mw * 0.18, my - mh * 0.25, mw * 0.1, 0, Math.PI * 2);
          ctx.arc(sx + mw * 0.02, my - mh * 0.08, mw * 0.08, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'snack_cat_food': {
          // Open tin can of cat food with fish badge
          const cw = snackW * 0.75;
          const ch = snackH * 0.55;
          const cy = sy + ch * 0.65;

          // Tin can body
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.roundRect(sx - cw * 0.5, cy - ch * 0.3, cw, ch, 3);
          ctx.fill();

          // Meat inside
          ctx.fillStyle = '#991b1b';
          ctx.beginPath();
          ctx.ellipse(sx, cy - ch * 0.3, cw * 0.48, ch * 0.22, 0, 0, Math.PI * 2);
          ctx.fill();

          // Fish badge
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.ellipse(sx, cy + ch * 0.1, cw * 0.25, ch * 0.15, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'snack_golden_snack': {
          // The legendary ultimate golden snack! Glowing pulsating halo & starry aura
          const gr = snackW * 0.52;
          const gy = sy + snackH * 0.5;

          // Radiant golden sunburst rays
          ctx.save();
          ctx.translate(sx, gy);
          ctx.rotate(time * 3);
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.75)';
          ctx.lineWidth = 2;
          for (let a = 0; a < 8; a++) {
            const ang = (a / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ang) * gr * 0.7, Math.sin(ang) * gr * 0.7);
            ctx.lineTo(Math.cos(ang) * gr * 1.5, Math.sin(ang) * gr * 1.5);
            ctx.stroke();
          }
          ctx.restore();

          // Golden orb / trophy snack
          const gGrad = ctx.createRadialGradient(sx - gr * 0.3, gy - gr * 0.3, 2, sx, gy, gr);
          gGrad.addColorStop(0, '#ffffff');
          gGrad.addColorStop(0.35, '#fef08a');
          gGrad.addColorStop(0.75, '#eab308');
          gGrad.addColorStop(1, '#ca8a04');
          ctx.fillStyle = gGrad;
          ctx.beginPath();
          ctx.arc(sx, gy, gr, 0, Math.PI * 2);
          ctx.fill();

          // Crown jewel badge
          ctx.fillStyle = '#f59e0b';
          ctx.font = `bold ${Math.max(12, Math.floor(snackH * 0.55))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('👑', sx, gy);
          break;
        }

        case 'snack_handed_snack':
        case 'snack_tossed_snack': {
          // Wrapped snack treat with radiant sparkles
          const tw = snackW * 0.82;
          const th = snackH * 0.65;
          const cy = sy + th * 0.55;

          // Wrapper
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.roundRect(sx - tw * 0.45, cy - th * 0.35, tw * 0.9, th * 0.7, 5);
          ctx.fill();

          // Ribbon bow
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(sx - tw * 0.45, cy - 2, tw * 0.9, 4);
          ctx.fillRect(sx - 2, cy - th * 0.35, 4, th * 0.7);
          break;
        }

        case 'snack_mystery_takeout':
        case 'mystery_bag': {
          // Crinkly takeout paper bag with mystery question mark
          const bw = snackW * 0.75;
          const bh = snackH * 0.88;
          const bx = sx - bw * 0.5;
          const by = sy + (snackH - bh);

          // Kraft brown paper bag body
          ctx.fillStyle = '#b45309';
          ctx.beginPath();
          ctx.roundRect(bx, by, bw, bh, 4);
          ctx.fill();

          // Bag front fold crease
          ctx.fillStyle = '#92400e';
          ctx.beginPath();
          ctx.moveTo(bx, by + bh * 0.25);
          ctx.lineTo(bx + bw * 0.5, by + bh * 0.35);
          ctx.lineTo(bx + bw, by + bh * 0.25);
          ctx.lineTo(bx + bw, by);
          ctx.lineTo(bx, by);
          ctx.closePath();
          ctx.fill();

          // Rolled top crinkle rim
          ctx.fillStyle = '#78350f';
          ctx.fillRect(bx - bw * 0.05, by - bh * 0.08, bw * 1.1, bh * 0.14);

          // Golden question mark badge
          ctx.fillStyle = '#fef08a';
          ctx.font = `bold ${Math.max(10, Math.floor(snackH * 0.45))}px 'JetBrains Mono', monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', sx, by + bh * 0.62);
          break;
        }

        case 'pretzel': {
          // Warm baked golden twisted pretzel with salt
          const pw = snackW * 0.85;
          const ph = snackH * 0.75;
          const cy = sy + ph * 0.55;

          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = Math.max(3, snackH * 0.22);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.beginPath();
          ctx.arc(sx - pw * 0.22, cy, ph * 0.32, 0.4, Math.PI * 1.8);
          ctx.arc(sx + pw * 0.22, cy, ph * 0.32, Math.PI * 1.2, Math.PI * 2.6);
          ctx.stroke();

          // Salt crystals
          ctx.fillStyle = '#ffffff';
          const saltPoints = [
            [-0.3, -0.2],
            [0.3, -0.2],
            [-0.15, 0.25],
            [0.15, 0.25],
            [0, -0.35],
          ];
          saltPoints.forEach(([ox, oy]) => {
            ctx.fillRect(sx + ox * pw - 1.5, cy + oy * ph - 1.5, 3, 3);
          });
          break;
        }

        case 'fish_taco': {
          // Curved taco shell with filling
          const tw = snackW * 0.85;
          const th = snackH * 0.75;
          const cy = sy + th * 0.55;

          // Crispy shell
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.ellipse(sx, cy, tw * 0.45, th * 0.35, 0, Math.PI, 0, true);
          ctx.fill();

          // Lettuce greens
          ctx.fillStyle = '#10b981';
          ctx.fillRect(sx - tw * 0.35, cy - th * 0.15, tw * 0.7, th * 0.2);

          // Sauce drizzle
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx - tw * 0.3, cy - th * 0.05);
          ctx.lineTo(sx - tw * 0.1, cy - th * 0.18);
          ctx.lineTo(sx + tw * 0.1, cy - th * 0.05);
          ctx.lineTo(sx + tw * 0.3, cy - th * 0.18);
          ctx.stroke();
          break;
        }

        default: {
          // Default tasty golden energy snack star
          const sr = snackW * 0.38;
          const syCenter = sy + snackH * 0.52;
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(sx, syCenter, sr, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(sx - sr * 0.25, syCenter - sr * 0.25, sr * 0.45, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }

      ctx.restore();
    });
  }

  /**
   * Slice 3: Draw unexpected window spook hazard setbacks
   */
  private drawSpooks(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    spooks: SpookEvent[],
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    if (!spooks || spooks.length === 0) return;

    const unitW = this.getUnitW(W, H);
    const winW = unitW * GAME_CONFIG.SKYSCRAPER.WINDOW_WIDTH_RATIO;
    const winH = H * GAME_CONFIG.SKYSCRAPER.WINDOW_HEIGHT_RATIO;

    spooks.forEach((spook) => {
      const sx = this.worldToScreenX(spook.x, cameraX, W, H);
      const sillScreenY = this.worldToScreenY(spook.sillY, cameraY, H);

      if (sx < -winW || sx > W + winW || sillScreenY < -winH || sillScreenY > H + winH) {
        return;
      }

      ctx.save();

      if (spook.state === 'warning') {
        // Warning alert: Trembling alert exclamation mark '!'
        const pulse = 1.0 + Math.sin(time * 18 + spook.id) * 0.12;
        const bubbleY = sillScreenY - winH * 0.75 - Math.abs(Math.sin(time * 8)) * (H * 0.015);
        const bubbleR = Math.max(12, winW * 0.28) * pulse;

        // Warning balloon
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(sx, bubbleY, bubbleR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Little pointer
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(sx - bubbleR * 0.35, bubbleY + bubbleR * 0.7);
        ctx.lineTo(sx, bubbleY + bubbleR * 1.3);
        ctx.lineTo(sx + bubbleR * 0.35, bubbleY + bubbleR * 0.7);
        ctx.closePath();
        ctx.fill();

        // '!' Text
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${Math.max(14, Math.floor(bubbleR * 1.2))}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', sx, bubbleY);
      } else if (spook.state === 'active' || spook.state === 'retreating') {
        const retreatAlpha = spook.state === 'retreating' ? Math.max(0, spook.timer / 0.45) : 1.0;
        ctx.globalAlpha = retreatAlpha;

        // Foreground overlay effects that burst outside into the air
        if (spook.type === 'photo_flash') {
          const flashActive = (spook.timer % 0.8) < 0.22;
          if (flashActive) {
            const camY = sillScreenY - winH * 0.48 + winH * 0.05;
            const flashR = winW * 0.95;
            const fGrad = ctx.createRadialGradient(sx, camY, 5, sx, camY, flashR);
            fGrad.addColorStop(0, '#ffffff');
            fGrad.addColorStop(0.35, 'rgba(254, 240, 138, 0.95)');
            fGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
            ctx.fillStyle = fGrad;
            ctx.beginPath();
            ctx.arc(sx, camY, flashR, 0, Math.PI * 2);
            ctx.fill();

            // Camera flash rays radiating outward
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            for (let a = 0; a < 8; a++) {
              const ang = (a / 8) * Math.PI * 2;
              ctx.beginPath();
              ctx.moveTo(sx + Math.cos(ang) * 10, camY + Math.sin(ang) * 10);
              ctx.lineTo(sx + Math.cos(ang) * flashR * 0.8, camY + Math.sin(ang) * flashR * 0.8);
              ctx.stroke();
            }
          }
        } else if (spook.type === 'shower_singer') {
          // Floating musical notes rising outside into the open air
          const noteY1 = sillScreenY - winH * 0.75 - ((time * 24 + spook.id * 10) % (winH * 0.35));
          const noteY2 = sillScreenY - winH * 0.65 - (((time + 0.4) * 22 + spook.id * 10) % (winH * 0.35));
          ctx.fillStyle = '#ec4899';
          ctx.font = `bold ${Math.max(12, Math.floor(winW * 0.26))}px sans-serif`;
          ctx.fillText('♪', sx - winW * 0.22, noteY1);
          ctx.fillText('♫', sx + winW * 0.20, noteY2);
        } else if (spook.type === 'disco_party') {
          // Colorful laser beams projecting out through window
          const lColors = ['#ec4899', '#06b6d4', '#10b981', '#facc15'];
          ctx.lineWidth = 2;
          for (let l = 0; l < 4; l++) {
            const lAng = time * 8 + (l / 4) * Math.PI * 2;
            ctx.strokeStyle = lColors[l];
            ctx.beginPath();
            ctx.moveTo(sx, sillScreenY - winH * 0.85);
            ctx.lineTo(sx + Math.cos(lAng) * (winW * 0.55), sillScreenY - winH * 0.2 + Math.sin(lAng) * (winH * 0.3));
            ctx.stroke();
          }
        } else if (spook.type === 'sleeping_dog') {
          // BOOF! speech bubble in front
          const dw = winW * 0.75;
          const dh = winH * 0.45;
          const dy = sillScreenY - dh * 0.8;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(sx + dw * 0.15, dy - dh * 0.45, winW * 0.4, winH * 0.22, 6);
          ctx.fill();
          ctx.fillStyle = '#0f172a';
          ctx.font = `bold ${Math.max(10, Math.floor(winW * 0.18))}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('BOOF!', sx + dw * 0.35, dy - dh * 0.34);
        } else if (spook.type === 'spook_fake_out_boom') {
          // Explosive comic POP/BOOM
          const boomR = winW * 0.75;
          const bGrad = ctx.createRadialGradient(sx, sillScreenY - winH * 0.5, 2, sx, sillScreenY - winH * 0.5, boomR);
          bGrad.addColorStop(0, '#ffffff');
          bGrad.addColorStop(0.4, '#ef4444');
          bGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.fillStyle = bGrad;
          ctx.beginPath();
          ctx.arc(sx, sillScreenY - winH * 0.5, boomR, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(14, Math.floor(winW * 0.28))}px 'JetBrains Mono', monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('💥 BOOM!', sx, sillScreenY - winH * 0.5);
        }
      }

      ctx.restore();
    });
  }

  /**
   * Slice 3: Draw floating text badges and sparkly snack crumb particles
   */
  private drawSnackParticlesAndText(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    state: GameEngineState,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const { snackParticles, floatingTexts } = state;

    // 1. Snack Particles (crumbs, stars, energy rings)
    snackParticles.forEach((p) => {
      const px = this.worldToScreenX(p.x, cameraX, W, H);
      const py = this.worldToScreenY(p.y, cameraY, H);
      const alpha = Math.max(0, 1.0 - p.age / p.lifetime);
      const sizePx = p.size * H;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      if (p.shape === 'ring') {
        const ringR = sizePx * (1.0 + (p.age / p.lifetime) * 2.5);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.5, H * 0.003);
        ctx.beginPath();
        ctx.arc(px, py, ringR, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.shape === 'sparkle') {
        ctx.beginPath();
        ctx.moveTo(px, py - sizePx);
        ctx.lineTo(px + sizePx * 0.35, py - sizePx * 0.35);
        ctx.lineTo(px + sizePx, py);
        ctx.lineTo(px + sizePx * 0.35, py + sizePx * 0.35);
        ctx.lineTo(px, py + sizePx);
        ctx.lineTo(px - sizePx * 0.35, py + sizePx * 0.35);
        ctx.lineTo(px - sizePx, py);
        ctx.lineTo(px - sizePx * 0.35, py - sizePx * 0.35);
        ctx.closePath();
        ctx.fill();
      } else {
        // Crumb
        ctx.beginPath();
        ctx.arc(px, py, sizePx * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    // 2. Floating Text Badges
    floatingTexts.forEach((ft) => {
      const tx = this.worldToScreenX(ft.x, cameraX, W, H);
      const ty = this.worldToScreenY(ft.y, cameraY, H);
      const progress = ft.age / ft.lifetime;
      const alpha = progress > 0.7 ? Math.max(0, 1.0 - (progress - 0.7) / 0.3) : 1.0;
      const scale = ft.scale;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(tx, ty);
      ctx.scale(scale, scale);

      // Rounded pill backdrop
      const fontSize = Math.max(12, Math.floor(H * 0.018));
      ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`;
      const textMetrics = ctx.measureText(ft.text);
      const padX = fontSize * 0.6;
      const padY = fontSize * 0.35;
      const badgeW = textMetrics.width + padX * 2;
      const badgeH = fontSize + padY * 2;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = ft.color;
      ctx.lineWidth = Math.max(1.5, H * 0.002);

      ctx.beginPath();
      ctx.roundRect(-badgeW * 0.5, -badgeH * 0.5, badgeW, badgeH, badgeH * 0.5);
      ctx.fill();
      ctx.stroke();

      // Text
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ft.text, 0, 0);
      ctx.restore();
    });
  }

  // =========================================================================
  // ATMOSPHERIC ANIMATED FEATURES (Dynamic with altitude)
  // =========================================================================

  /**
   * Draw atmospheric features behind the skyscraper:
   * Mist clouds, hot air balloons, geese flocks in V-formation, soaring hawks/birds, lightning arcs.
   */
  public drawAtmosphereBackground(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    atmosphere: AtmosphereState,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const unitW = this.getUnitW(W, H);

    // 1. Background Mist Clouds (drifting behind the skyscraper)
    const bgClouds = atmosphere.mistClouds.filter((c) => !c.isForeground);
    this.drawMistClouds(ctx, W, H, unitW, bgClouds, cameraX, cameraY);

    // 2. Hot Air Balloons (Floors 7–20)
    if (atmosphere.balloons.length > 0) {
      this.drawHotAirBalloons(ctx, W, H, unitW, atmosphere.balloons, cameraX, cameraY, time);
    }

    // 3. Geese Flocks in V-formation (Floors 5–19)
    if (atmosphere.geeseFlocks.length > 0) {
      this.drawGeeseFlocks(ctx, W, H, unitW, atmosphere.geeseFlocks, cameraX, cameraY);
    }

    // 4. Soaring Birds / Hawks (Floors 12–25)
    if (atmosphere.soaringBirds.length > 0) {
      this.drawSoaringBirds(ctx, W, H, unitW, atmosphere.soaringBirds, cameraX, cameraY, time);
    }

    // 5. Electric Lightning Arcs (Floors 16–25)
    if (atmosphere.lightning) {
      this.drawLightningStrike(ctx, W, H, unitW, atmosphere.lightning, cameraX, cameraY);
    }
  }

  /**
   * Draw atmospheric features in the foreground:
   * Hot air balloons, geese flocks in V-formation, soaring hawks/birds, thick opaque clouds,
   * electric lightning strikes, and screen flashes - all in front of the building and raccoon,
   * visibly blocking the view of the raccoon when crossing in front of it!
   */
  public drawAtmosphereForeground(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    atmosphere: AtmosphereState,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const unitW = this.getUnitW(W, H);

    // 1. Hot Air Balloons (large, vibrant, foreground)
    if (atmosphere.balloons && atmosphere.balloons.length > 0) {
      this.drawHotAirBalloons(ctx, W, H, unitW, atmosphere.balloons, cameraX, cameraY, time);
    }

    // 2. Geese Flocks in V-formation (large, foreground)
    if (atmosphere.geeseFlocks && atmosphere.geeseFlocks.length > 0) {
      this.drawGeeseFlocks(ctx, W, H, unitW, atmosphere.geeseFlocks, cameraX, cameraY);
    }

    // 3. Soaring Hawks / Birds (large, foreground)
    if (atmosphere.soaringBirds && atmosphere.soaringBirds.length > 0) {
      this.drawSoaringBirds(ctx, W, H, unitW, atmosphere.soaringBirds, cameraX, cameraY, time);
    }

    // 4. Large, Opaque Clouds (visibly blocks the view of the raccoon and windows)
    if (atmosphere.mistClouds && atmosphere.mistClouds.length > 0) {
      this.drawMistClouds(ctx, W, H, unitW, atmosphere.mistClouds, cameraX, cameraY);
    }

    // 5. Electric Atmospheric Lightning Arcs
    if (atmosphere.lightning) {
      this.drawLightningStrike(ctx, W, H, unitW, atmosphere.lightning, cameraX, cameraY);
    }

    // 6. Atmospheric Lightning Illumination Screen Flash
    if (atmosphere.lightningFlashAlpha > 0.005) {
      const alpha = Math.min(0.65, atmosphere.lightningFlashAlpha);
      ctx.save();
      const flashGrad = ctx.createLinearGradient(0, 0, 0, H);
      flashGrad.addColorStop(0, `rgba(235, 248, 255, ${alpha})`);
      flashGrad.addColorStop(0.5, `rgba(190, 225, 255, ${alpha * 0.75})`);
      flashGrad.addColorStop(1, `rgba(147, 197, 253, ${alpha * 0.4})`);
      ctx.fillStyle = flashGrad;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  /**
   * Draw climbing squirrels scurrying along the skyscraper walls/edges.
   */
  public drawClimbingSquirrels(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    squirrels: ClimbingSquirrel[],
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    if (!squirrels || squirrels.length === 0) return;
    const unitW = this.getUnitW(W, H);

    squirrels.forEach((sq) => {
      const sx = this.worldToScreenX(sq.x, cameraX, W, H);
      const sy = this.worldToScreenY(sq.y, cameraY, H);

      // Viewport culling
      if (sx < -unitW * 0.1 || sx > W + unitW * 0.1 || sy < -H * 0.1 || sy > H * 1.1) {
        return;
      }

      this.drawSingleSquirrel(ctx, sx, sy, unitW, H, sq, time);
    });
  }

  /**
   * Draw detailed vector climbing squirrel with bushy tail, furry body, paws and optional acorn.
   */
  private drawSingleSquirrel(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    unitW: number,
    H: number,
    sq: ClimbingSquirrel,
    time: number
  ) {
    const size = Math.max(22, unitW * 0.038);
    const flipX = sq.side === 'left' ? 1 : -1;
    const isClimbingUp = sq.facing === 'up';

    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(flipX, 1);

    // Scurry bobble
    const pawPhase = (sq.climbPhase * Math.PI * 4) % (Math.PI * 2);
    const climbOffset = Math.sin(pawPhase) * (size * 0.12);

    // 1. Bushy Tail (Large S-curve behind the body with dynamic twitch & sway)
    const tailSway = sq.tailAngle + Math.sin(time * 6 + sq.id) * 0.22;
    ctx.save();
    ctx.translate(-size * 0.1, size * 0.2);
    ctx.rotate(tailSway + (isClimbingUp ? 0.35 : -0.35));

    // Outer fluff
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-size * 0.6, -size * 0.4, -size * 1.1, -size * 1.2, -size * 0.3, -size * 1.4);
    ctx.bezierCurveTo(size * 0.2, -size * 1.5, size * 0.6, -size * 1.0, 0, -size * 0.3);
    ctx.closePath();
    ctx.fill();

    // Inner highlight fluff
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-size * 0.4, -size * 0.3, -size * 0.7, -size * 0.9, -size * 0.2, -size * 1.1);
    ctx.bezierCurveTo(size * 0.1, -size * 1.2, size * 0.4, -size * 0.8, 0, -size * 0.25);
    ctx.closePath();
    ctx.fill();

    // Tail tip soft white fluff
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(-size * 0.3, -size * 1.35, size * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Hind Leg & Paw (gripping wall)
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.ellipse(size * 0.15, size * 0.25 - climbOffset * 0.5, size * 0.22, size * 0.14, Math.PI * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Tiny hind claws
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(size * 0.32, size * 0.3 - climbOffset * 0.5, size * 0.04, 0, Math.PI * 2);
    ctx.arc(size * 0.36, size * 0.26 - climbOffset * 0.5, size * 0.04, 0, Math.PI * 2);
    ctx.fill();

    // 3. Squirrel Body (warm russet fur)
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.34, size * 0.5, isClimbingUp ? -0.15 : 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Pale Cream Belly patch
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.ellipse(size * 0.1, 0, size * 0.18, size * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Front Arm & Paw reaching up to grip
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    const reachY = isClimbingUp ? -size * 0.45 + climbOffset : size * 0.35 + climbOffset;
    ctx.ellipse(size * 0.28, reachY, size * 0.16, size * 0.1, isClimbingUp ? 0.3 : -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Front claws gripping wall edge
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(size * 0.42, reachY - size * 0.04, size * 0.04, 0, Math.PI * 2);
    ctx.arc(size * 0.44, reachY + size * 0.02, size * 0.04, 0, Math.PI * 2);
    ctx.fill();

    // 5. Head
    const headY = isClimbingUp ? -size * 0.45 : size * 0.4;
    ctx.save();
    ctx.translate(size * 0.12, headY);

    // Ears (perked rounded ears)
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.ellipse(-size * 0.08, -size * 0.24, size * 0.09, size * 0.14, -0.3, 0, Math.PI * 2);
    ctx.ellipse(size * 0.14, -size * 0.22, size * 0.08, size * 0.13, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Inner ear pink fluff
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.ellipse(-size * 0.08, -size * 0.23, size * 0.05, size * 0.09, -0.3, 0, Math.PI * 2);
    ctx.ellipse(size * 0.14, -size * 0.21, size * 0.04, size * 0.08, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Head oval
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.26, size * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cheek fluff
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.ellipse(size * 0.1, size * 0.06, size * 0.14, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(size * 0.24, size * 0.02, size * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Dark shiny eye with catchlight
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(size * 0.04, -size * 0.06, size * 0.065, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(size * 0.06, -size * 0.08, size * 0.025, 0, Math.PI * 2);
    ctx.fill();

    // Tiny whiskers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = Math.max(1, H * 0.001);
    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.02);
    ctx.lineTo(size * 0.38, -size * 0.04);
    ctx.moveTo(size * 0.2, size * 0.04);
    ctx.lineTo(size * 0.4, size * 0.06);
    ctx.stroke();

    // 6. Cute Acorn (if held by squirrel)
    if (sq.acorn) {
      ctx.save();
      ctx.translate(size * 0.2, size * 0.14);

      // Acorn nut
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.ellipse(0, size * 0.06, size * 0.08, size * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Acorn cap
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.02, size * 0.09, size * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();

      // Acorn stem
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = Math.max(1, H * 0.0015);
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.02);
      ctx.lineTo(size * 0.02, -size * 0.07);
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore(); // restore head
    ctx.restore(); // restore root squirrel
  }

  /**
   * Draw drifting mist clouds with soft translucent puffs.
   */
  private drawMistClouds(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    unitW: number,
    clouds: HighMistCloud[],
    cameraX: number,
    cameraY: number
  ) {
    if (!clouds || clouds.length === 0) return;

    clouds.forEach((cloud) => {
      const cx = this.worldToScreenX(cloud.x, cameraX, W, H);
      const cy = this.worldToScreenY(cloud.y, cameraY, H);
      const cw = cloud.width * unitW;
      const ch = cloud.height * H;

      // Viewport culling
      if (cx + cw < -W * 0.2 || cx - cw > W * 1.2 || cy + ch < -H * 0.2 || cy - ch > H * 1.2) {
        return;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0.90, cloud.opacity);

      // Dense opaque cloud gradient that blocks view of raccoon and skyscraper
      const cloudGrad = ctx.createRadialGradient(cx, cy, ch * 0.1, cx, cy, cw * 0.5);
      cloudGrad.addColorStop(0, '#ffffff');
      cloudGrad.addColorStop(0.55, '#f8fafc');
      cloudGrad.addColorStop(0.82, '#e2e8f0');
      cloudGrad.addColorStop(1, 'rgba(203, 213, 225, 0.35)');

      ctx.fillStyle = cloudGrad;

      // Puffy cloud silhouette
      ctx.beginPath();
      ctx.ellipse(cx, cy, cw * 0.45, ch * 0.38, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - cw * 0.22, cy + ch * 0.05, cw * 0.28, ch * 0.28, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + cw * 0.22, cy - ch * 0.03, cw * 0.3, ch * 0.3, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + cw * 0.08, cy - ch * 0.12, cw * 0.24, ch * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  /**
   * Draw vibrant hot air balloons drifting horizontally across mid-sky.
   */
  private drawHotAirBalloons(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    unitW: number,
    balloons: HotAirBalloon[],
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    balloons.forEach((b) => {
      const bx = this.worldToScreenX(b.x, cameraX, W, H);
      const bobble = Math.sin(time * 1.6 + b.bobblePhase) * (H * 0.008);
      const by = this.worldToScreenY(b.y, cameraY, H) + bobble;

      const balloonH = Math.max(48, H * 0.13 * b.scale);
      const balloonW = balloonH * 0.76;

      // Viewport culling
      if (bx + balloonW < -W * 0.2 || bx - balloonW > W * 1.2 || by + balloonH < -H * 0.2 || by - balloonH > H * 1.2) {
        return;
      }

      this.drawSingleBalloon(ctx, bx, by, balloonW, balloonH, b, time, H);
    });
  }

  /**
   * Draw a single detailed hot air balloon with striped envelope, burner flame, wicker basket and passenger.
   */
  private drawSingleBalloon(
    ctx: CanvasRenderingContext2D,
    bx: number,
    by: number,
    w: number,
    h: number,
    b: HotAirBalloon,
    time: number,
    H: number
  ) {
    ctx.save();
    ctx.translate(bx, by);

    // Color palettes for balloon stripes
    const palettes: Record<string, string[]> = {
      rainbow: ['#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#8b5cf6'],
      sunset: ['#dc2626', '#f97316', '#fbbf24', '#c026d3', '#7c3aed'],
      ocean: ['#1e3a8a', '#2563eb', '#06b6d4', '#14b8a6', '#f8fafc'],
      candy: ['#f43f5e', '#ec4899', '#f472b6', '#34d399', '#fef08a'],
    };
    const colors = palettes[b.colorPattern] || palettes.rainbow;

    // 1. Balloon Envelope (Teardrop shape)
    const envH = h * 0.74;
    const topRadius = w * 0.5;

    // Base envelope clipping path
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, -envH * 0.5);
    ctx.bezierCurveTo(topRadius * 1.05, -envH * 0.5, topRadius * 1.05, 0, w * 0.22, envH * 0.42);
    ctx.lineTo(-w * 0.22, envH * 0.42);
    ctx.bezierCurveTo(-topRadius * 1.05, 0, -topRadius * 1.05, -envH * 0.5, 0, -envH * 0.5);
    ctx.closePath();
    ctx.clip();

    // Draw vertical curved colored stripes
    const numStripes = colors.length;
    for (let i = 0; i < numStripes; i++) {
      const u0 = (i / numStripes) * 2 - 1;
      const u1 = ((i + 1) / numStripes) * 2 - 1;

      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.moveTo(u0 * topRadius * 0.1, -envH * 0.5);
      ctx.bezierCurveTo(u0 * topRadius, -envH * 0.2, u0 * topRadius * 0.9, envH * 0.2, u0 * w * 0.22, envH * 0.42);
      ctx.lineTo(u1 * w * 0.22, envH * 0.42);
      ctx.bezierCurveTo(u1 * topRadius * 0.9, envH * 0.2, u1 * topRadius, -envH * 0.2, u1 * topRadius * 0.1, -envH * 0.5);
      ctx.closePath();
      ctx.fill();
    }

    // 3D Shading overlay on envelope (light from top-left)
    const shadeGrad = ctx.createLinearGradient(-topRadius, 0, topRadius, 0);
    shadeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
    shadeGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.08)');
    shadeGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.05)');
    shadeGrad.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
    ctx.fillStyle = shadeGrad;
    ctx.fillRect(-topRadius, -envH * 0.55, topRadius * 2, envH * 1.1);
    ctx.restore();

    // Envelope outline
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
    ctx.lineWidth = Math.max(1.2, H * 0.0018);
    ctx.beginPath();
    ctx.moveTo(0, -envH * 0.5);
    ctx.bezierCurveTo(topRadius * 1.05, -envH * 0.5, topRadius * 1.05, 0, w * 0.22, envH * 0.42);
    ctx.lineTo(-w * 0.22, envH * 0.42);
    ctx.bezierCurveTo(-topRadius * 1.05, 0, -topRadius * 1.05, -envH * 0.5, 0, -envH * 0.5);
    ctx.closePath();
    ctx.stroke();

    // Throat collar
    ctx.fillStyle = '#334155';
    ctx.fillRect(-w * 0.24, envH * 0.41, w * 0.48, envH * 0.05);

    // 2. Flickering Burner Flame
    const flameH = envH * (0.08 + Math.sin(time * 16) * 0.03);
    const flameGrad = ctx.createRadialGradient(0, envH * 0.46 + flameH * 0.4, 0, 0, envH * 0.46, flameH);
    flameGrad.addColorStop(0, '#ffffff');
    flameGrad.addColorStop(0.4, '#fef08a');
    flameGrad.addColorStop(0.8, '#f97316');
    flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(-w * 0.07, envH * 0.46);
    ctx.quadraticCurveTo(0, envH * 0.46 + flameH, w * 0.07, envH * 0.46);
    ctx.closePath();
    ctx.fill();

    // 3. Rigging Ropes
    const basketY = envH * 0.58;
    const basketW = w * 0.28;
    const basketH = h * 0.16;

    ctx.strokeStyle = 'rgba(71, 85, 105, 0.85)';
    ctx.lineWidth = Math.max(1, H * 0.0012);
    ctx.beginPath();
    ctx.moveTo(-w * 0.2, envH * 0.45);
    ctx.lineTo(-basketW * 0.45, basketY);
    ctx.moveTo(-w * 0.08, envH * 0.45);
    ctx.lineTo(-basketW * 0.2, basketY);
    ctx.moveTo(w * 0.08, envH * 0.45);
    ctx.lineTo(basketW * 0.2, basketY);
    ctx.moveTo(w * 0.2, envH * 0.45);
    ctx.lineTo(basketW * 0.45, basketY);
    ctx.stroke();

    // 4. Wicker Basket
    ctx.fillStyle = '#b45309';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = Math.max(1, H * 0.0015);
    ctx.beginPath();
    ctx.roundRect(-basketW * 0.5, basketY, basketW, basketH, Math.max(2, basketH * 0.15));
    ctx.fill();
    ctx.stroke();

    // Basket cross-hatch texture
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.6)';
    ctx.lineWidth = Math.max(0.8, H * 0.001);
    ctx.beginPath();
    ctx.moveTo(-basketW * 0.45, basketY + basketH * 0.35);
    ctx.lineTo(basketW * 0.45, basketY + basketH * 0.35);
    ctx.moveTo(-basketW * 0.45, basketY + basketH * 0.7);
    ctx.lineTo(basketW * 0.45, basketY + basketH * 0.7);
    ctx.stroke();

    // 5. Tiny Waving Passenger
    const passengerX = 0;
    const passengerY = basketY - basketH * 0.2;
    // Head
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.arc(passengerX, passengerY, basketH * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Aviator cap/goggles
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(passengerX, passengerY - basketH * 0.05, basketH * 0.3, Math.PI, 0);
    ctx.fill();

    // Waving hand
    const handWave = Math.sin(time * 5) * (basketH * 0.25);
    ctx.strokeStyle = '#fbcfe8';
    ctx.lineWidth = Math.max(1.5, H * 0.002);
    ctx.beginPath();
    ctx.moveTo(passengerX + basketH * 0.25, passengerY + basketH * 0.1);
    ctx.lineTo(passengerX + basketH * 0.5, passengerY - basketH * 0.3 + handWave);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw geese flocks in V-formation flying across the mid-altitude sky.
   */
  private drawGeeseFlocks(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    unitW: number,
    flocks: GeeseFlock[],
    cameraX: number,
    cameraY: number
  ) {
    flocks.forEach((flock) => {
      const count = flock.count;
      const spacingX = unitW * 0.038 * flock.scale;
      const spacingY = H * 0.026 * flock.scale;

      // Draw all geese in the V
      for (let i = 0; i < count; i++) {
        let offsetX = 0;
        let offsetY = 0;

        if (i > 0) {
          const rank = Math.floor((i + 1) / 2);
          const side = i % 2 === 1 ? -1 : 1;
          offsetX = -flock.direction * rank * spacingX;
          offsetY = side * rank * spacingY;
        }

        const worldX = flock.x + offsetX / unitW;
        const worldY = flock.y + offsetY / H;

        const gx = this.worldToScreenX(worldX, cameraX, W, H);
        const gy = this.worldToScreenY(worldY, cameraY, H);

        // Viewport culling
        if (gx < -W * 0.1 || gx > W * 1.1 || gy < -H * 0.1 || gy > H * 1.1) {
          continue;
        }

        const gooseScale = Math.max(8, unitW * 0.016 * flock.scale);
        const flap = Math.sin(flock.flapPhase + i * 0.45);

        this.drawSingleGoose(ctx, gx, gy, gooseScale, flock.direction, flap, H);
      }
    });
  }

  /**
   * Draw a single Canadian Goose with black neck, white cheek patch, grey body and articulated wings.
   */
  private drawSingleGoose(
    ctx: CanvasRenderingContext2D,
    gx: number,
    gy: number,
    scale: number,
    direction: 1 | -1,
    flap: number,
    H: number
  ) {
    ctx.save();
    ctx.translate(gx, gy);
    ctx.scale(direction, 1);

    // Body (greyish-brown)
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.ellipse(0, 0, scale * 0.55, scale * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // White undertail coverts
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(-scale * 0.4, scale * 0.05, scale * 0.18, scale * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wings (articulated with flap cycle)
    const wingAngle = flap * 0.65;
    ctx.save();
    ctx.translate(-scale * 0.05, -scale * 0.08);

    // Wing strokes
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = Math.max(0.8, H * 0.001);

    // Upper wing
    ctx.save();
    ctx.rotate(wingAngle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-scale * 0.35, -scale * 0.9);
    ctx.lineTo(scale * 0.2, -scale * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Lower wing (in perspective)
    ctx.save();
    ctx.rotate(-wingAngle * 0.7);
    ctx.beginPath();
    ctx.moveTo(0, scale * 0.08);
    ctx.lineTo(-scale * 0.25, scale * 0.75);
    ctx.lineTo(scale * 0.15, scale * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore(); // restore wing origin

    // Long black neck & head
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(scale * 0.5, -scale * 0.18, scale * 0.3, scale * 0.12, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Iconic Canada Goose white cheek patch!
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(scale * 0.52, -scale * 0.2, scale * 0.1, scale * 0.07, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Dark bill
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(scale * 0.75, -scale * 0.25);
    ctx.lineTo(scale * 0.92, -scale * 0.22);
    ctx.lineTo(scale * 0.76, -scale * 0.16);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw soaring hawks and urban birds circling with thermals.
   */
  private drawSoaringBirds(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    unitW: number,
    birds: SoaringBird[],
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    birds.forEach((bird) => {
      const bx = this.worldToScreenX(bird.x, cameraX, W, H);
      const by = this.worldToScreenY(bird.y, cameraY, H);
      const size = Math.max(12, unitW * 0.024 * bird.scale);

      // Viewport culling
      if (bx < -W * 0.1 || bx > W * 1.1 || by < -H * 0.1 || by > H * 1.1) {
        return;
      }

      this.drawSingleSoaringBird(ctx, bx, by, size, bird, time, H);
    });
  }

  /**
   * Draw a single soaring bird (majestic thermal-gliding hawk, swallow, or pigeon).
   */
  private drawSingleSoaringBird(
    ctx: CanvasRenderingContext2D,
    bx: number,
    by: number,
    size: number,
    bird: SoaringBird,
    time: number,
    H: number
  ) {
    const dir = bird.vx >= 0 ? 1 : -1;
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(dir, 1);

    if (bird.type === 'hawk') {
      // Red-Tailed Hawk: broad soaring wings with slotted feather primaries, banking gently
      const bank = Math.sin(time * 1.4 + bird.id) * 0.2;
      ctx.rotate(bank);

      // Rufous-cinnamon fan tail
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(-size * 0.15, 0);
      ctx.lineTo(-size * 0.85, -size * 0.28);
      ctx.quadraticCurveTo(-size * 0.95, 0, -size * 0.85, size * 0.28);
      ctx.closePath();
      ctx.fill();

      // Broad wings (thermal glider)
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = Math.max(0.8, H * 0.001);

      // Left wing with slotted primaries
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-size * 0.2, -size * 0.7, -size * 0.5, -size * 1.2, -size * 0.1, -size * 1.4);
      // Slotted wingtip feathers
      ctx.lineTo(size * 0.05, -size * 1.35);
      ctx.lineTo(size * 0.12, -size * 1.15);
      ctx.bezierCurveTo(size * 0.2, -size * 0.6, size * 0.15, -size * 0.2, size * 0.2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right wing
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-size * 0.2, size * 0.7, -size * 0.5, size * 1.2, -size * 0.1, size * 1.4);
      ctx.lineTo(size * 0.05, size * 1.35);
      ctx.lineTo(size * 0.12, size * 1.15);
      ctx.bezierCurveTo(size * 0.2, size * 0.6, size * 0.15, size * 0.2, size * 0.2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Hawk Body
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.ellipse(size * 0.05, 0, size * 0.35, size * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Mottled belly band
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.16, size * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head & hooked beak
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(size * 0.38, 0, size * 0.14, size * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(size * 0.5, -size * 0.04);
      ctx.lineTo(size * 0.65, size * 0.02);
      ctx.lineTo(size * 0.48, size * 0.06);
      ctx.closePath();
      ctx.fill();
    } else if (bird.type === 'swallow') {
      // Forked-tail barn swallow: agile aerodynamic darting flight
      const flap = Math.sin(bird.flapPhase) * 0.5;

      // Dark glossy navy blue wings
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size * 0.1, -size * (0.9 + flap));
      ctx.lineTo(size * 0.3, 0);
      ctx.lineTo(size * 0.1, size * (0.9 + flap));
      ctx.closePath();
      ctx.fill();

      // Deeply forked tail
      ctx.beginPath();
      ctx.moveTo(-size * 0.2, 0);
      ctx.lineTo(-size * 0.8, -size * 0.25);
      ctx.lineTo(-size * 0.5, 0);
      ctx.lineTo(-size * 0.8, size * 0.25);
      ctx.closePath();
      ctx.fill();

      // Buff chest
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.ellipse(size * 0.1, 0, size * 0.2, size * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Urban pigeon: grey with green/purple neck sheen
      const flap = Math.sin(bird.flapPhase) * 0.6;
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size * 0.15, -size * (0.8 + flap));
      ctx.lineTo(size * 0.25, 0);
      ctx.lineTo(-size * 0.15, size * (0.8 + flap));
      ctx.closePath();
      ctx.fill();

      // Body
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(size * 0.05, 0, size * 0.3, size * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Draw electric atmospheric lightning strike with branching arcs and cyan/white glow.
   */
  private drawLightningStrike(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    unitW: number,
    strike: LightningStrike,
    cameraX: number,
    cameraY: number
  ) {
    if (!strike.branches || strike.branches.length === 0) return;

    ctx.save();
    const alpha = Math.min(1.0, strike.intensity);

    // Multi-pass neon electric rendering:
    // Pass 1: Broad soft blue outer glow
    ctx.strokeStyle = `rgba(147, 197, 253, ${alpha * 0.35})`;
    ctx.lineWidth = Math.max(7, unitW * 0.016);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    strike.branches.forEach((b) => {
      const x1 = this.worldToScreenX(b.x1, cameraX, W, H);
      const y1 = this.worldToScreenY(b.y1, cameraY, H);
      const x2 = this.worldToScreenX(b.x2, cameraX, W, H);
      const y2 = this.worldToScreenY(b.y2, cameraY, H);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    });
    ctx.stroke();

    // Pass 2: Electric cyan core
    ctx.strokeStyle = `rgba(186, 230, 253, ${alpha * 0.75})`;
    ctx.lineWidth = Math.max(3, unitW * 0.007);
    ctx.stroke();

    // Pass 3: White-hot center bolt
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
    ctx.lineWidth = Math.max(1.5, unitW * 0.003);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Drainpipes / Downspouts running down building outer corners for vertical climbing
   */
  private drawDrainpipes(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    cameraY: number
  ) {
    const unitW = this.getUnitW(W, H);
    const { BUILDING_CENTER_X, BUILDING_WIDTH_RATIO, TOTAL_FLOORS, FLOOR_HEIGHT_RATIO } = GAME_CONFIG.SKYSCRAPER;
    const { DRAINPIPES } = GAME_CONFIG.INTERACTIVE_ELEMENTS;

    const bLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
    const bRight = BUILDING_CENTER_X + BUILDING_WIDTH_RATIO / 2;

    const leftPipeX = this.worldToScreenX(bLeft + DRAINPIPES.LEFT_OFFSET_RATIO, cameraX, W, H);

    const pipeWidth = Math.max(7, DRAINPIPES.PIPE_RADIUS * 2 * unitW);
    const topScreenY = this.worldToScreenY(TOTAL_FLOORS * FLOOR_HEIGHT_RATIO, cameraY, H);
    const bottomScreenY = this.worldToScreenY(0, cameraY, H);

    // Only drainpipe on the left side of the building (right side removed per user instruction)
    [leftPipeX].forEach((pipeX) => {
      ctx.save();
      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.fillRect(pipeX + 2, topScreenY, pipeWidth, bottomScreenY - topScreenY);

      // Pipe body copper / cast iron gradient
      const pipeGrad = ctx.createLinearGradient(pipeX, 0, pipeX + pipeWidth, 0);
      pipeGrad.addColorStop(0, '#5c2b0c');
      pipeGrad.addColorStop(0.35, '#b45309');
      pipeGrad.addColorStop(0.65, '#d97706');
      pipeGrad.addColorStop(1, '#451a03');
      ctx.fillStyle = pipeGrad;
      ctx.fillRect(pipeX, topScreenY, pipeWidth, bottomScreenY - topScreenY);

      // Pipe segment ring brackets every floor
      for (let f = 1; f <= TOTAL_FLOORS; f++) {
        const ringY = this.worldToScreenY((f - 1) * FLOOR_HEIGHT_RATIO + 0.15, cameraY, H);
        if (ringY >= -40 && ringY <= H + 40) {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(pipeX - 2, ringY - 3, pipeWidth + 4, 6);
          ctx.fillStyle = '#fde68a';
          ctx.fillRect(pipeX, ringY - 2, 2, 4);
          ctx.fillRect(pipeX + pipeWidth - 2, ringY - 2, 2, 4);
        }
      }

      // Curved storm discharge shoe at bottom
      ctx.beginPath();
      ctx.moveTo(pipeX, bottomScreenY - 14);
      ctx.lineTo(pipeX + pipeWidth, bottomScreenY - 14);
      ctx.lineTo(pipeX + pipeWidth - 10, bottomScreenY);
      ctx.lineTo(pipeX - 10, bottomScreenY);
      ctx.closePath();
      ctx.fillStyle = '#78350f';
      ctx.fill();

      ctx.restore();
    });
  }

  /**
   * Diagonal Slide from Floor 7 Window 1 to Floor 4 Window 4
   */
  private drawDiagonalSlide(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    cameraY: number
  ) {
    const unitW = this.getUnitW(W, H);
    const { WINDOW_WIDTH_RATIO, WINDOWS_PER_FLOOR, BUILDING_WIDTH_RATIO, BUILDING_CENTER_X, FLOOR_HEIGHT_RATIO } = GAME_CONFIG.SKYSCRAPER;

    const bLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
    const totalWinsW = WINDOWS_PER_FLOOR * WINDOW_WIDTH_RATIO;
    const gap = (BUILDING_WIDTH_RATIO - totalWinsW) / (WINDOWS_PER_FLOOR + 1);

    // Floor 7 Window 1 coordinates
    const f7Y = 6 * FLOOR_HEIGHT_RATIO;
    const win1X = bLeft + gap + (WINDOW_WIDTH_RATIO + gap) * 1 + WINDOW_WIDTH_RATIO * 0.5;
    const f7SillY = f7Y + 0.18;

    // Floor 6 Window 3 coordinates (Bottom of slide at Floor 6 per user instruction)
    const f6Y = 5 * FLOOR_HEIGHT_RATIO;
    const win3X = bLeft + gap + (WINDOW_WIDTH_RATIO + gap) * 3 + WINDOW_WIDTH_RATIO * 0.5;
    const f6SillY = f6Y + 0.18;

    const startScreenX = this.worldToScreenX(win1X, cameraX, W, H);
    const startScreenY = this.worldToScreenY(f7SillY, cameraY, H);
    const endScreenX = this.worldToScreenX(win3X, cameraX, W, H);
    const endScreenY = this.worldToScreenY(f6SillY, cameraY, H);

    // Frustum culling
    const minY = Math.min(startScreenY, endScreenY);
    const maxY = Math.max(startScreenY, endScreenY);
    if (maxY < -80 || minY > H + 80) return;

    ctx.save();

    // 1. Diagonal support steel struts
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = Math.max(3, unitW * 0.008);
    ctx.beginPath();
    const midX = (startScreenX + endScreenX) * 0.5;
    const midY = (startScreenY + endScreenY) * 0.5;
    ctx.moveTo(midX, midY);
    ctx.lineTo(midX - 25, midY + 40);
    ctx.stroke();

    // 2. Chute shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = Math.max(16, unitW * 0.045);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startScreenX + 6, startScreenY + 6);
    ctx.quadraticCurveTo(midX + 18, midY + 22, endScreenX + 6, endScreenY + 6);
    ctx.stroke();

    // 3. Stainless steel chute base tube
    const chuteGrad = ctx.createLinearGradient(startScreenX, startScreenY, endScreenX, endScreenY);
    chuteGrad.addColorStop(0, '#94a3b8');
    chuteGrad.addColorStop(0.5, '#f1f5f9');
    chuteGrad.addColorStop(1, '#cbd5e1');

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = Math.max(16, unitW * 0.042);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startScreenX, startScreenY);
    ctx.quadraticCurveTo(midX + 12, midY + 16, endScreenX, endScreenY);
    ctx.stroke();

    ctx.strokeStyle = chuteGrad;
    ctx.lineWidth = Math.max(11, unitW * 0.030);
    ctx.beginPath();
    ctx.moveTo(startScreenX, startScreenY);
    ctx.quadraticCurveTo(midX + 12, midY + 16, endScreenX, endScreenY);
    ctx.stroke();

    // 4. Clear transparent acrylic canopy cover
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = Math.max(5, unitW * 0.015);
    ctx.beginPath();
    ctx.moveTo(startScreenX, startScreenY - 4);
    ctx.quadraticCurveTo(midX + 12, midY + 12, endScreenX, endScreenY - 4);
    ctx.stroke();

    // 5. Entrance Funnel at Floor 7
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(startScreenX, startScreenY, 14, 18, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Entrance mini sign
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(startScreenX - 24, startScreenY - 32, 48, 14);
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SLIDE 🛝', startScreenX, startScreenY - 22);

    // 6. Exit landing lip at Floor 4
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.ellipse(endScreenX, endScreenY, 12, 10, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Street Double Doors into building at ground level (unclimbable glass obstacle)
   */
  private drawStreetDoubleDoors(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    cameraY: number
  ) {
    const unitW = this.getUnitW(W, H);
    const { LOBBY_DOUBLE_DOORS } = GAME_CONFIG.INTERACTIVE_ELEMENTS;

    const doorsX = this.worldToScreenX(LOBBY_DOUBLE_DOORS.CENTER_X, cameraX, W, H);
    const doorsW = LOBBY_DOUBLE_DOORS.WIDTH_RATIO * unitW;
    const doorsH = LOBBY_DOUBLE_DOORS.HEIGHT_RATIO * H;
    const groundY = this.worldToScreenY(0, cameraY, H);
    const doorsY = groundY - doorsH;

    if (doorsY > H + 50 || groundY < -50) return;

    ctx.save();

    // Outer architectural bronze portal frame
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(doorsX - doorsW * 0.5 - 6, doorsY - 14, doorsW + 12, doorsH + 14);

    // Arch transom above doors
    ctx.fillStyle = '#ffecb3';
    ctx.fillRect(doorsX - doorsW * 0.5, doorsY - 12, doorsW, 10);
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    ctx.strokeRect(doorsX - doorsW * 0.5, doorsY - 12, doorsW, 10);

    // Plaque above entrance
    ctx.fillStyle = '#d97706';
    ctx.fillRect(doorsX - 32, doorsY - 24, 64, 11);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOBBY ENTRANCE', doorsX, doorsY - 16);

    // Double glass doors: Left door & Right door
    const doorW = (doorsW - 6) * 0.5;
    [doorsX - doorsW * 0.5 + 2, doorsX + 2].forEach((dX) => {
      // Dark door frame
      ctx.fillStyle = '#4e342e';
      ctx.fillRect(dX, doorsY, doorW, doorsH);

      // Glass pane
      const glassGrad = ctx.createLinearGradient(dX, doorsY, dX + doorW, doorsY + doorsH);
      glassGrad.addColorStop(0, '#0284c7');
      glassGrad.addColorStop(0.35, '#38bdf8');
      glassGrad.addColorStop(0.7, '#0369a1');
      glassGrad.addColorStop(1, '#075985');
      ctx.fillStyle = glassGrad;
      ctx.fillRect(dX + 3, doorsY + 3, doorW - 6, doorsH - 6);

      // Diagonal gloss reflection lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(dX + 5, doorsY + 12);
      ctx.lineTo(dX + doorW - 8, doorsY + doorsH * 0.65);
      ctx.stroke();

      // Brass horizontal push bar
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(dX + 5, doorsY + doorsH * 0.52, doorW - 10, 5);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(dX + 6, doorsY + doorsH * 0.52, doorW - 12, 1);
    });

    ctx.restore();
  }

  /**
   * Stacked recycling bins and wooden crates on street level flanking the dumpster
   */
  private drawStreetCratesAndRecyclingBins(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    cameraY: number
  ) {
    const unitW = this.getUnitW(W, H);
    const { STREET_STACKS } = GAME_CONFIG.INTERACTIVE_ELEMENTS;
    const groundY = this.worldToScreenY(0, cameraY, H);

    if (groundY > H + 90 || groundY < -90) return;

    ctx.save();

    // 1. Stacked Blue Recycling Bins (left of dumpster)
    const binsX = this.worldToScreenX(STREET_STACKS.RECYCLING_BINS_X, cameraX, W, H);
    const binsW = STREET_STACKS.RECYCLING_BINS_W * unitW;
    const binH = STREET_STACKS.RECYCLING_BINS_H * 0.52 * H;

    // Bottom bin
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(binsX - binsW * 0.5, groundY - binH, binsW, binH);
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(binsX - binsW * 0.5 + 2, groundY - binH + 2, binsW - 4, binH - 4);
    // Bin rim
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(binsX - binsW * 0.5 - 2, groundY - binH - 3, binsW + 4, 4);

    // Top bin (stacked slightly askew)
    const topBinX = binsX - 3;
    const topBinY = groundY - binH * 2 + 3;
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(topBinX - binsW * 0.46, topBinY, binsW * 0.92, binH);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(topBinX - binsW * 0.46 + 2, topBinY + 2, binsW * 0.92 - 4, binH - 4);
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(topBinX - binsW * 0.46 - 2, topBinY - 3, binsW * 0.92 + 4, 4);

    // Recycling symbol (white triangles)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('♻ RECYCLE', binsX, groundY - binH * 0.4);

    // 2. Stacked Wooden Shipping Crates (right of dumpster)
    const crateX = this.worldToScreenX(STREET_STACKS.WOODEN_CRATES_X, cameraX, W, H);
    const crateW = STREET_STACKS.WOODEN_CRATES_W * unitW;
    const crateH = STREET_STACKS.WOODEN_CRATES_H * 0.52 * H;

    // Bottom wooden crate
    ctx.fillStyle = '#78350f';
    ctx.fillRect(crateX - crateW * 0.5, groundY - crateH, crateW, crateH);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(crateX - crateW * 0.5 + 3, groundY - crateH + 3, crateW - 6, crateH - 6);
    // Wood slats & diagonal brace
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.strokeRect(crateX - crateW * 0.5 + 3, groundY - crateH + 3, crateW - 6, crateH - 6);
    ctx.beginPath();
    ctx.moveTo(crateX - crateW * 0.5 + 3, groundY - crateH + 3);
    ctx.lineTo(crateX + crateW * 0.5 - 3, groundY - 3);
    ctx.stroke();

    // Top wooden crate (stacked on top, slightly offset)
    const topCW = crateW * 0.82;
    const topCH = crateH * 0.88;
    const topCX = crateX + 4;
    const topCY = groundY - crateH - topCH;

    ctx.fillStyle = '#78350f';
    ctx.fillRect(topCX - topCW * 0.5, topCY, topCW, topCH);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(topCX - topCW * 0.5 + 2, topCY + 2, topCW - 4, topCH - 4);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(topCX - topCW * 0.5 + 2, topCY + 2, topCW - 4, topCH - 4);
    ctx.beginPath();
    ctx.moveTo(topCX + topCW * 0.5 - 2, topCY + 2);
    ctx.lineTo(topCX - topCW * 0.5 + 2, topCY + topCH - 2);
    ctx.stroke();

    // Stencil text
    ctx.fillStyle = '#451a03';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FRAGILE 📦', crateX, groundY - crateH * 0.45);

    ctx.restore();
  }

  /**
   * Wooden utility pole and electrified sagging telephone cables
   */
  private drawElectricPoleAndCables(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const unitW = this.getUnitW(W, H);
    const { BUILDING_CENTER_X, BUILDING_WIDTH_RATIO } = GAME_CONFIG.SKYSCRAPER;
    const { ELECTRIC_CABLES } = GAME_CONFIG.INTERACTIVE_ELEMENTS;

    const bLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
    const poleWorldX = bLeft + ELECTRIC_CABLES.POLE_X_OFFSET;
    const poleScreenX = this.worldToScreenX(poleWorldX, cameraX, W, H);
    const junctionScreenX = this.worldToScreenX(bLeft, cameraX, W, H);

    const groundY = this.worldToScreenY(0, cameraY, H);
    const poleTopY = this.worldToScreenY(ELECTRIC_CABLES.POLE_HEIGHT, cameraY, H);
    const junctionY = this.worldToScreenY(ELECTRIC_CABLES.BUILDING_JUNCTION_Y, cameraY, H);

    if (poleScreenX > W + 60 || junctionScreenX < -60) return;

    ctx.save();

    // 1. Tall weathered wooden telephone pole
    const poleW = Math.max(8, unitW * 0.022);
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(poleScreenX - poleW * 0.5, poleTopY, poleW, groundY - poleTopY);
    ctx.fillStyle = '#78472a';
    ctx.fillRect(poleScreenX - poleW * 0.5 + 2, poleTopY, poleW - 4, groundY - poleTopY);

    // Crossarms at pole top
    const crossarmW = unitW * 0.085;
    ctx.fillStyle = '#4a2c11';
    ctx.fillRect(poleScreenX - crossarmW * 0.5, poleTopY + 12, crossarmW, 8);
    ctx.fillRect(poleScreenX - crossarmW * 0.4, poleTopY + 32, crossarmW * 0.8, 7);

    // Ceramic insulators
    [-crossarmW * 0.4, -crossarmW * 0.15, crossarmW * 0.15, crossarmW * 0.4].forEach((ox) => {
      ctx.fillStyle = '#10b981';
      ctx.fillRect(poleScreenX + ox - 2, poleTopY + 6, 5, 8);
    });

    // Transformer canister
    ctx.fillStyle = '#64748b';
    ctx.fillRect(poleScreenX + 5, poleTopY + 45, 14, 22);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(poleScreenX + 7, poleTopY + 47, 10, 3);

    // High Voltage Warning Plate
    ctx.fillStyle = '#facc15';
    ctx.fillRect(poleScreenX - 8, poleTopY + 80, 16, 12);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', poleScreenX, poleTopY + 89);

    // 2. Building conduit junction box
    ctx.fillStyle = '#334155';
    ctx.fillRect(junctionScreenX - 4, junctionY - 8, 10, 16);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(junctionScreenX - 2, junctionY - 6, 6, 12);

    // 3. Sagging electrified power lines (3 heavy cables)
    for (let wireIdx = 0; wireIdx < 3; wireIdx++) {
      const startY = poleTopY + 14 + wireIdx * 10;
      const endY = junctionY + wireIdx * 4;
      const sag = 28 + wireIdx * 6;
      const midX = (poleScreenX + junctionScreenX) * 0.5;
      const midY = (startY + endY) * 0.5 + sag;

      // Outer glow when electrified
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(poleScreenX, startY);
      ctx.quadraticCurveTo(midX, midY, junctionScreenX, endY);
      ctx.stroke();

      // Subtle cyan/yellow electric spark glints traveling along wire
      const sparkPhase = (time * 1.8 + wireIdx * 0.33) % 1.0;
      const sx = poleScreenX + (junctionScreenX - poleScreenX) * sparkPhase;
      const sy = startY + (endY - startY) * sparkPhase + sag * 4 * sparkPhase * (1 - sparkPhase);

      ctx.fillStyle = wireIdx === 1 ? '#facc15' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Cellphone Base Transceiver Station (BTS on Floor 14 between windows 1 & 2)
   */
  private drawCellTowerBTS(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const unitW = this.getUnitW(W, H);
    const { CELL_TOWER_BTS } = GAME_CONFIG.INTERACTIVE_ELEMENTS;
    const { FLOOR_HEIGHT_RATIO, WINDOW_WIDTH_RATIO, WINDOWS_PER_FLOOR, BUILDING_WIDTH_RATIO, BUILDING_CENTER_X } = GAME_CONFIG.SKYSCRAPER;

    const bLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
    const totalWinsW = WINDOWS_PER_FLOOR * WINDOW_WIDTH_RATIO;
    const gap = (BUILDING_WIDTH_RATIO - totalWinsW) / (WINDOWS_PER_FLOOR + 1);

    const btsWorldX = bLeft + gap + (WINDOW_WIDTH_RATIO + gap) * CELL_TOWER_BTS.WIN_GAP_INDEX + WINDOW_WIDTH_RATIO + gap * 0.5;
    const btsWorldY = (CELL_TOWER_BTS.FLOOR - 1) * FLOOR_HEIGHT_RATIO + 0.26;

    const btsScreenX = this.worldToScreenX(btsWorldX, cameraX, W, H);
    const btsScreenY = this.worldToScreenY(btsWorldY, cameraY, H);

    if (btsScreenY < -60 || btsScreenY > H + 60) return;

    ctx.save();

    // Steel mounting pole & wall standoff struts
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(btsScreenX - 8, btsScreenY - 25);
    ctx.lineTo(btsScreenX, btsScreenY - 25);
    ctx.moveTo(btsScreenX - 8, btsScreenY + 25);
    ctx.lineTo(btsScreenX, btsScreenY + 25);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.fillRect(btsScreenX - 2, btsScreenY - 32, 5, 64);

    // White sector antennas
    [-8, 8].forEach((ox) => {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(btsScreenX + ox - 5, btsScreenY - 26, 10, 52);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(btsScreenX + ox - 5, btsScreenY - 26, 10, 52);
    });

    // Radio equipment box & blinking LEDs
    ctx.fillStyle = '#334155';
    ctx.fillRect(btsScreenX - 10, btsScreenY + 6, 20, 16);

    // Blinking status LEDs
    const isGreenBlink = Math.sin(time * 6) > 0;
    ctx.fillStyle = isGreenBlink ? '#22c55e' : '#14532d';
    ctx.fillRect(btsScreenX - 6, btsScreenY + 10, 3, 3);

    const isRedBlink = Math.sin(time * 3) > 0.4;
    ctx.fillStyle = isRedBlink ? '#ef4444' : '#7f1d1d';
    ctx.fillRect(btsScreenX + 3, btsScreenY + 10, 3, 3);

    ctx.restore();
  }

  /**
   * Level 7 Laundry Clothesline strung between Windows 2, 3, 4
   */
  private drawLevel7LaundryLine(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    laundryLine: LaundryLineState,
    floors: FloorData[],
    cameraX: number,
    cameraY: number
  ) {
    const unitW = this.getUnitW(W, H);
    const { WINDOW_WIDTH_RATIO, WINDOWS_PER_FLOOR, BUILDING_WIDTH_RATIO, BUILDING_CENTER_X, FLOOR_HEIGHT_RATIO } = GAME_CONFIG.SKYSCRAPER;

    const bLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
    const totalWinsW = WINDOWS_PER_FLOOR * WINDOW_WIDTH_RATIO;
    const gap = (BUILDING_WIDTH_RATIO - totalWinsW) / (WINDOWS_PER_FLOOR + 1);

    const f7Floor = floors ? floors.find((f) => f.floorNumber === 7) : undefined;
    const f7WorldY = f7Floor && f7Floor.windows[2] ? f7Floor.windows[2].sillY : (6 * FLOOR_HEIGHT_RATIO + 0.18);
    const lineStartX = f7Floor && f7Floor.windows[2] ? f7Floor.windows[2].worldLeft : (bLeft + gap + (WINDOW_WIDTH_RATIO + gap) * 2);
    const lineEndX = f7Floor && f7Floor.windows[4] ? f7Floor.windows[4].worldRight : (bLeft + gap + (WINDOW_WIDTH_RATIO + gap) * 4 + WINDOW_WIDTH_RATIO);

    const startScreenX = this.worldToScreenX(lineStartX, cameraX, W, H);
    const endScreenX = this.worldToScreenX(lineEndX, cameraX, W, H);
    const lineScreenY = this.worldToScreenY(f7WorldY, cameraY, H);

    if (lineScreenY < -60 || lineScreenY > H + 60) return;

    ctx.save();

    // Taut steel clothesline wire
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const sag = laundryLine.hasDropped ? 12 : 4;
    const midX = (startScreenX + endScreenX) * 0.5;
    ctx.moveTo(startScreenX, lineScreenY);
    ctx.quadraticCurveTo(midX, lineScreenY + sag, endScreenX, lineScreenY);
    ctx.stroke();

    // Wall eyelets
    ctx.fillStyle = '#475569';
    ctx.fillRect(startScreenX - 3, lineScreenY - 3, 6, 6);
    ctx.fillRect(endScreenX - 3, lineScreenY - 3, 6, 6);

    // Draw each cloth item that hasn't been individually knocked off yet
    for (const item of laundryLine.clothes) {
      if (item.dropped) continue;
        const itemX = startScreenX + (endScreenX - startScreenX) * item.offsetRatio;
        const itemY = lineScreenY + sag * 0.8;

        // Clothespins
        ctx.fillStyle = '#b45309';
        ctx.fillRect(itemX - 5, itemY - 3, 3, 5);
        ctx.fillRect(itemX + 2, itemY - 3, 3, 5);

        ctx.fillStyle = item.color;
        if (item.type === 'shirt') {
          // T-Shirt shape
          ctx.beginPath();
          ctx.moveTo(itemX - 10, itemY + 2);
          ctx.lineTo(itemX + 10, itemY + 2);
          ctx.lineTo(itemX + 8, itemY + 20);
          ctx.lineTo(itemX - 8, itemY + 20);
          ctx.closePath();
          ctx.fill();
        } else if (item.type === 'pants') {
          // Jeans
          ctx.fillRect(itemX - 7, itemY + 2, 14, 22);
          ctx.clearRect(itemX - 1, itemY + 12, 2, 12);
        } else if (item.type === 'sheet') {
          // Bed sheet
          ctx.fillRect(itemX - 12, itemY + 2, 24, 24);
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.fillRect(itemX - 10, itemY + 8, 20, 2);
        } else {
          // Socks
          ctx.fillRect(itemX - 4, itemY + 2, 4, 10);
          ctx.fillRect(itemX + 2, itemY + 2, 4, 10);
        }
      }

    ctx.restore();
  }

  /**
   * Fallen / Falling laundry clothes that were detached from Level 7
   */
  private drawFallenLaundry(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    items: FallingLaundryItem[],
    cameraX: number,
    cameraY: number
  ) {
    items.forEach((item) => {
      const sx = this.worldToScreenX(item.x, cameraX, W, H);
      const sy = this.worldToScreenY(item.y, cameraY, H);
      if (sy < -40 || sy > H + 40) return;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(item.rotation);

      ctx.fillStyle = item.color;
      if (item.type === 'shirt') {
        ctx.fillRect(-8, -8, 16, 16);
      } else if (item.type === 'pants') {
        ctx.fillRect(-6, -10, 12, 20);
      } else if (item.type === 'sheet') {
        ctx.fillRect(-12, -12, 24, 24);
      } else {
        ctx.fillRect(-3, -6, 6, 12);
      }

      ctx.restore();
    });
  }

  /**
   * Creeping ivy / grapevines crawling up brick columns (Natural ladders)
   */
  private drawIvyVines(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const unitW = this.getUnitW(W, H);
    const { IVY_VINES } = GAME_CONFIG.INTERACTIVE_ELEMENTS;
    const { FLOOR_HEIGHT_RATIO, WINDOW_WIDTH_RATIO, WINDOWS_PER_FLOOR, BUILDING_WIDTH_RATIO, BUILDING_CENTER_X } = GAME_CONFIG.SKYSCRAPER;

    const bLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
    const totalWinsW = WINDOWS_PER_FLOOR * WINDOW_WIDTH_RATIO;
    const gap = (BUILDING_WIDTH_RATIO - totalWinsW) / (WINDOWS_PER_FLOOR + 1);

    IVY_VINES.forEach((vine, vineIdx) => {
      const startWorldY = (vine.startFloor - 1) * FLOOR_HEIGHT_RATIO;
      const endWorldY = vine.endFloor * FLOOR_HEIGHT_RATIO;
      const vineCenterX = vine.winGapIndex === 0
        ? bLeft + gap * 0.55
        : bLeft + gap + (WINDOW_WIDTH_RATIO + gap) * vine.winGapIndex + gap * 0.45;

      const vineScreenX = this.worldToScreenX(vineCenterX, cameraX, W, H);
      const bottomScreenY = this.worldToScreenY(startWorldY, cameraY, H);
      const topScreenY = this.worldToScreenY(endWorldY, cameraY, H);

      if (bottomScreenY < -60 || topScreenY > H + 60) return;

      ctx.save();

      // Main woody vine stems
      ctx.strokeStyle = '#3e2723';
      ctx.lineWidth = Math.max(2, unitW * 0.005);
      ctx.beginPath();
      const nNodes = (vine.endFloor - vine.startFloor + 1) * 6;
      for (let n = 0; n <= nNodes; n++) {
        const prog = n / nNodes;
        const curY = bottomScreenY + (topScreenY - bottomScreenY) * prog;
        const sway = Math.sin(prog * 18 + vineIdx * 3) * 12;
        if (n === 0) ctx.moveTo(vineScreenX + sway, curY);
        else ctx.lineTo(vineScreenX + sway, curY);
      }
      ctx.stroke();

      // Lush clusters of ivy leaves & grape clusters
      const leafCount = (vine.endFloor - vine.startFloor + 1) * 16;
      for (let l = 0; l < leafCount; l++) {
        const lProg = l / leafCount;
        const ly = bottomScreenY + (topScreenY - bottomScreenY) * lProg;
        if (ly < -30 || ly > H + 30) continue;

        const lx = vineScreenX + Math.sin(l * 12 + vineIdx) * 16;
        const leafColor = l % 3 === 0 ? '#15803d' : l % 3 === 1 ? '#16a34a' : '#22c55e';
        ctx.fillStyle = leafColor;
        ctx.beginPath();
        ctx.ellipse(lx, ly, 6, 4, l * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Occasional purple grape cluster
        if (l % 7 === 0) {
          ctx.fillStyle = '#7e22ce';
          for (let g = 0; g < 4; g++) {
            ctx.beginPath();
            ctx.arc(lx + (g % 2) * 3, ly + 6 + Math.floor(g / 2) * 3, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.restore();
    });
  }

  /**
   * Connected Fire Escape System with Balconies (acting as sills) & Climbable Ladders (0% energy loss)
   */
  private drawFireEscapeSystem(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    cameraY: number
  ) {
    const unitW = this.getUnitW(W, H);
    const { FIRE_ESCAPE } = GAME_CONFIG.INTERACTIVE_ELEMENTS;
    const { FLOOR_HEIGHT_RATIO, WINDOW_WIDTH_RATIO, WINDOWS_PER_FLOOR, BUILDING_WIDTH_RATIO, BUILDING_CENTER_X } = GAME_CONFIG.SKYSCRAPER;

    const bRight = BUILDING_CENTER_X + BUILDING_WIDTH_RATIO / 2;
    const totalWinsW = WINDOWS_PER_FLOOR * WINDOW_WIDTH_RATIO;
    const gap = (BUILDING_WIDTH_RATIO - totalWinsW) / (WINDOWS_PER_FLOOR + 1);

    const feX = this.worldToScreenX(bRight - gap * 0.60, cameraX, W, H);
    const balconyW = FIRE_ESCAPE.BALCONY_WIDTH * unitW;
    const ladderW = FIRE_ESCAPE.LADDER_WIDTH * unitW;

    ctx.save();

    // 1. Continuous vertical ladder connecting all fire escape floors
    const firstFloorY = this.worldToScreenY((FIRE_ESCAPE.FLOORS[0] - 1) * FLOOR_HEIGHT_RATIO + 0.18, cameraY, H);
    const lastFloorY = this.worldToScreenY(FIRE_ESCAPE.FLOORS[FIRE_ESCAPE.FLOORS.length - 1] * FLOOR_HEIGHT_RATIO, cameraY, H);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = Math.max(2, unitW * 0.004);
    ctx.beginPath();
    ctx.moveTo(feX - ladderW * 0.5, firstFloorY);
    ctx.lineTo(feX - ladderW * 0.5, lastFloorY);
    ctx.moveTo(feX + ladderW * 0.5, firstFloorY);
    ctx.lineTo(feX + ladderW * 0.5, lastFloorY);
    ctx.stroke();

    // Ladder rungs every few pixels
    const totalLadderDist = firstFloorY - lastFloorY;
    const nRungs = Math.max(10, Math.floor(totalLadderDist / 12));
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    for (let r = 0; r < nRungs; r++) {
      const ry = lastFloorY + (r / nRungs) * totalLadderDist;
      if (ry >= -20 && ry <= H + 20) {
        ctx.beginPath();
        ctx.moveTo(feX - ladderW * 0.5, ry);
        ctx.lineTo(feX + ladderW * 0.5, ry);
        ctx.stroke();
      }
    }

    // 2. Balconies on specified floors (acting as resting window sills)
    FIRE_ESCAPE.FLOORS.forEach((fNum) => {
      const balconyY = this.worldToScreenY((fNum - 1) * FLOOR_HEIGHT_RATIO + 0.18, cameraY, H);
      if (balconyY < -40 || balconyY > H + 40) return;

      // Balcony diamond grating platform
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(feX - balconyW * 0.5, balconyY, balconyW, 6);

      // Guardrail & pickets
      const railH = 18;
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(feX - balconyW * 0.5, balconyY - railH, balconyW, railH);

      // Pickets
      for (let p = 1; p < 7; p++) {
        const px = feX - balconyW * 0.5 + (p / 7) * balconyW;
        ctx.beginPath();
        ctx.moveTo(px, balconyY);
        ctx.lineTo(px, balconyY - railH);
        ctx.stroke();
      }

      // Metallic top rail highlight
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(feX - balconyW * 0.5, balconyY - railH - 2, balconyW, 3);
    });

    ctx.restore();
  }

  /**
   * Electric spark particles burst
   */
  private drawElectricSparks(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    sparks: ElectricSpark[],
    cameraX: number,
    cameraY: number
  ) {
    ctx.save();
    sparks.forEach((s) => {
      const sx = this.worldToScreenX(s.x, cameraX, W, H);
      const sy = this.worldToScreenY(s.y, cameraY, H);
      const alpha = Math.max(0, 1.0 - s.age / s.maxAge);

      ctx.fillStyle = s.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx - 5, sy);
      ctx.lineTo(sx + 5, sy);
      ctx.moveTo(sx, sy - 5);
      ctx.lineTo(sx, sy + 5);
      ctx.stroke();
    });
    ctx.restore();
  }

}
