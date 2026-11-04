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
  AtmosphericBat,
  NavigationBarrier,
  CelebrationFirework,
} from './types';
import { ENCOUNTERS_BY_ID } from './encounterData';
import { getCharacterConfig, CharacterConfig, RACCOON_ROSTER } from './characterConfig';

export class GameRenderer {
  private birdSeeds: Array<{ x: number; y: number; speed: number; phase: number; scale: number }> = [];
  private cloudSeeds: Array<{ x: number; y: number; width: number; height: number; speed: number; opacity: number }> = [];
  private characterImageCache: Record<string, HTMLImageElement> = {};
  private activeCharacterConfig: CharacterConfig = RACCOON_ROSTER[0];

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
    this.activeCharacterConfig = getCharacterConfig(state.selectedCharacterId);
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
    this.drawSkyAndParallax(ctx, W, H, cameraX, cameraY, timeSeconds, state.atmosphere?.weather);

    // Weather ambient sky tint (moody storm darkness during rain, frosty winter haze during snow)
    if (state.atmosphere?.weather) {
      this.drawWeatherBackdrop(ctx, W, H, state.atmosphere.weather);
      this.drawRainbow(ctx, W, H, cameraX, cameraY, state.atmosphere.weather, timeSeconds);
    }

    // 2. Draw Distant City Silhouettes (Parallax on both sides of the skyscraper)
    this.drawDistantCity(ctx, W, H, cameraX, cameraY, timeSeconds);

    // 3. Draw The 25-Floor Skyscraper (Wider than viewport, scrolling horizontally)
    this.drawSkyscraper(ctx, W, H, cameraX, cameraY, floors, timeSeconds, state.spooks, state.navigationBarriers);

    // Altitude Atmospheric Features: Climbing Squirrels scurrying on building walls & Dusk Bats
    if (state.atmosphere) {
      this.drawClimbingSquirrels(ctx, W, H, state.atmosphere.squirrels, cameraX, cameraY, timeSeconds);
      if (state.atmosphere.bats && state.atmosphere.bats.length > 0) {
        this.drawAtmosphericBats(ctx, W, H, state.atmosphere.bats, cameraX, cameraY, timeSeconds);
      }
    }

    // Slice 3: Draw Window Spook Hazard Events
    this.drawSpooks(ctx, W, H, state.spooks, cameraX, cameraY, timeSeconds);

    // Slice 3: Draw Snacks Resting on Window Sills
    this.drawSnacks(ctx, W, H, state.snacks, cameraX, cameraY, timeSeconds);

    // Level 7 Laundry Clothesline
    if (state.laundryLine) {
      this.drawLevel7LaundryLine(ctx, W, H, state.laundryLine, floors, cameraX, cameraY);
    }

    // Dozen Napping Pigeons on Floor 2 Window Sill (or scattering away)
    if (state.atmosphere?.sillPigeons) {
      this.drawSillPigeons(ctx, W, H, state.atmosphere.sillPigeons, floors, cameraX, cameraY, timeSeconds);
    }

    // 4. Draw Alley Trash Cans, Large Commercial Dumpster & Popping Animated Trash Debris
    this.drawAlleyTrashCanAndDebris(ctx, W, H, state, cameraX, cameraY, timeSeconds);

    // Street Kite Flying from Street Level (Floors 1-2 up to Floor 4)
    if (state.atmosphere?.kite) {
      this.drawStreetKiteAndChild(ctx, W, H, state.atmosphere.kite, cameraX, cameraY, timeSeconds);
    }

    // 5. Draw Cute Illustrated Raccoon Character
    this.drawRaccoon(ctx, W, H, state.raccoon, cameraX, cameraY, timeSeconds);

    // Weather Grip Slipping Effect (paw splash/skid on wet rain or icy frost)
    if (state.raccoon.isGripSlipping) {
      this.drawGripSlipEffect(ctx, W, H, state.raccoon, cameraX, cameraY, state.atmosphere?.weather?.type);
    }

    // Dial-shaped Speed Burst Meter directly above raccoon's head when bursting
    if (state.raccoon.isSpeedBoosted && (state.raccoon.boostActiveTimer ?? 0) > 0) {
      this.drawSpeedBurstDial(ctx, W, H, state.raccoon, cameraX, cameraY);
    }

    // Electrocuted Visual Effects (shock sparks & flashing skeleton)
    if (state.raccoon.isElectrified || (state.raccoon.electrifiedTimer ?? 0) > 0) {
      this.drawElectrocutionEffect(ctx, W, H, state.raccoon, cameraX, cameraY, timeSeconds);
    }

    // Slice 3: Draw Floating Badges & Sparkle Particles (drawn above raccoon)
    this.drawSnackParticlesAndText(ctx, W, H, state, cameraX, cameraY, timeSeconds);

    // Electric Sparks from telephone wire contact
    if (state.electricSparks && state.electricSparks.length > 0) {
      this.drawElectricSparks(ctx, W, H, state.electricSparks, cameraX, cameraY);
    }

    // Altitude Atmospheric Features (Foreground: Hot Air Balloons, Geese Flocks, Soaring Hawks, Thick Opaque Clouds & Lightning Flash - in front of building and raccoon, visibly blocking raccoon)
    if (state.atmosphere) {
      this.drawAtmosphereForeground(ctx, W, H, state.atmosphere, cameraX, cameraY, timeSeconds);

      // Ambient Weather Scene Darkening: Darkens everything slightly relative to active weather (rain, thunderstorm, snow, blizzard)
      // and returns smoothly to a bright, vibrant, and sunny daytime environment when weather ends
      if (state.atmosphere.weather) {
        this.drawWeatherAmbientLighting(ctx, W, H, state.atmosphere.weather, state.atmosphere.lightningFlashAlpha);
      }

      // Weather Precipitation (Rain streaks, splash ripples, and drifting snow flurries)
      if (state.atmosphere.weather) {
        this.drawWeatherPrecipitation(ctx, W, H, state.atmosphere.weather, cameraX, cameraY, timeSeconds);
        this.drawWindGusts(ctx, W, H, state.atmosphere.weather, cameraX, cameraY, timeSeconds);
        if (state.atmosphere.weather.stormPhase === 'blizzard') {
          this.drawBlizzardWhiteout(ctx, W, H, state.atmosphere.weather, timeSeconds);
        }
      }
    }

    // Rooftop Celebration Fireworks
    if (state.celebrationFireworks && state.celebrationFireworks.length > 0) {
      this.drawCelebrationFireworks(ctx, W, H, state.celebrationFireworks, cameraX, cameraY, timeSeconds);
    }

    // Brief Rooftop Celebration Banner on canvas before Win Menu appears
    if (state.celebrationTimer > 0 && state.celebrationTimer < 3.8 && state.screen === 'PLAYING') {
      this.drawRooftopCelebrationBanner(ctx, W, H, state.celebrationTimer, timeSeconds);
    }

    // Cinematic Game Over Fade (fades to dark alley right before ground impact)
    const fadeAlpha = state.raccoon.gameOverFadeAlpha ?? 0;
    if (state.raccoon.isFallingToGameOver && fadeAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(2, 6, 23, ${Math.min(1, fadeAlpha)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
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
   * Calculates progressive cloud darkening factor (0.0 = white fluffy sunny clouds, up to 1.0 = deep stormy charcoal/gray clouds)
   * Progressive darkening tied to storm intensification:
   * - Clear sky / before rain: 0.0 (pristine white)
   * - Light rain begins: ~0.45 (noticeably graying overcast clouds)
   * - Thunderstorm climax: ~0.88 - 1.0 (heavy, dark ominous charcoal/slate gray storm clouds)
   * - Rainbow / rain ended: quickly brightens back to 0.0
   * - Blizzard / Snow: cool slate-gray storm clouds (~0.55)
   */
  public getStormDarkness(weather?: import('./types').WeatherState): number {
    if (!weather) return 0;
    const intensity = weather.intensity ?? 1.0;
    if (weather.stormPhase === 'thunderstorm') {
      return Math.min(1.0, 0.88 * intensity);
    }
    if (weather.stormPhase === 'light_rain') {
      return Math.min(1.0, 0.45 * intensity);
    }
    if (weather.stormPhase === 'blizzard') {
      return Math.min(1.0, 0.58 * intensity);
    }
    if (weather.stormPhase === 'snow_flurries') {
      return Math.min(1.0, 0.28 * intensity);
    }
    if (weather.stormPhase === 'rainbow') {
      const rainbowAlpha = weather.rainbowAlpha || 0;
      return Math.max(0, 0.35 * (1.0 - rainbowAlpha));
    }
    if (weather.type === 'rain') {
      return Math.min(1.0, 0.70 * intensity);
    }
    if (weather.type === 'snow') {
      return Math.min(1.0, 0.40 * intensity);
    }
    return 0;
  }

  /**
   * Generates interpolated colors for clouds based on storm intensity:
   * Transitions from cheerful white cumulus before rain into dark ominous slate/charcoal storm clouds.
   */
  public getCloudColors(darkness: number) {
    const t = Math.max(0, Math.min(1, darkness));
    const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);

    // Rim on top edge: pure white #ffffff -> stormy slate-500 #64748b
    const rim = `rgb(${lerp(255, 100)}, ${lerp(255, 116)}, ${lerp(255, 139)})`;

    // Fluffy cumulus body: white (255, 255, 255, 0.94) -> stormy charcoal slate (40, 50, 68, 0.96)
    const bodyR = lerp(255, 40);
    const bodyG = lerp(255, 50);
    const bodyB = lerp(255, 68);
    const body = `rgba(${bodyR}, ${bodyG}, ${bodyB}, ${0.94 + 0.04 * t})`;

    // Shaded cloud base: sunny sky blue (186, 230, 253, 0.38) -> deep ominous storm navy (15, 23, 42, 0.88)
    const baseR = lerp(186, 15);
    const baseG = lerp(230, 23);
    const baseB = lerp(253, 42);
    const base = `rgba(${baseR}, ${baseG}, ${baseB}, ${0.38 + 0.50 * t})`;

    // Mist cloud gradient stops (radial gradient from center to edge)
    const mist0 = `rgb(${lerp(255, 75)}, ${lerp(255, 85)}, ${lerp(255, 102)})`;
    const mist1 = `rgb(${lerp(248, 51)}, ${lerp(250, 65)}, ${lerp(252, 85)})`;
    const mist2 = `rgb(${lerp(226, 30)}, ${lerp(232, 41)}, ${lerp(240, 59)})`;
    const mist3 = `rgba(${lerp(203, 15)}, ${lerp(213, 23)}, ${lerp(225, 42)}, ${0.35 + 0.55 * t})`;

    return { rim, body, base, mist0, mist1, mist2, mist3 };
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
    time: number,
    weather?: import('./types').WeatherState
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

    // 3. Drifting Cumulus Clouds (White before rain, progressively grayer/darker as storm intensifies)
    const stormDarkness = this.getStormDarkness(weather);
    const cloudColors = this.getCloudColors(stormDarkness);

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

        // Soft shaded cloud base (gentle ambient sky tone in fair weather, ominous dark slate in storm)
        ctx.fillStyle = cloudColors.base;
        ctx.beginPath();
        ctx.ellipse(cx, cy + ch * 0.14, cw * 0.46, ch * 0.4, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - cw * 0.22, cy + ch * 0.18, cw * 0.34, ch * 0.35, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + cw * 0.25, cy + ch * 0.16, cw * 0.36, ch * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fluffy cumulus body (white before rain, turns progressively darker gray as storm builds)
        ctx.fillStyle = cloudColors.body;
        ctx.beginPath();
        ctx.ellipse(cx, cy, cw * 0.42, ch * 0.42, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - cw * 0.22, cy + ch * 0.06, cw * 0.32, ch * 0.36, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + cw * 0.24, cy + ch * 0.05, cw * 0.34, ch * 0.38, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - cw * 0.08, cy - ch * 0.15, cw * 0.26, ch * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();

        // Top edge rim (crisp white in fair weather, moody silver/slate in storm)
        ctx.fillStyle = cloudColors.rim;
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
        const wingSpan = Math.max(16, unitW * 0.030 * bird.scale);
        const flap = Math.sin(time * 6.5 + bird.phase);

        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = Math.max(2.0, unitW * 0.003 * bird.scale);
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
    spooks?: SpookEvent[],
    navigationBarriers?: NavigationBarrier[]
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
    this.drawDrainpipes(ctx, W, H, cameraX, cameraY);
    this.drawDiagonalSlide(ctx, W, H, cameraX, cameraY);
    this.drawCellTowerBTS(ctx, W, H, cameraX, cameraY, time);
    this.drawTarzanVine(ctx, W, H, cameraX, cameraY, time);
    this.drawTeleportPads(ctx, W, H, cameraX, cameraY, time);
    this.drawEagleNest(ctx, W, H, cameraX, cameraY, time);
    if (navigationBarriers && navigationBarriers.length > 0) {
      this.drawNavigationBarriers(ctx, W, H, navigationBarriers, cameraX, cameraY, time);
    }
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

      // 2. Window Background Space Behind the Glass (Matching the iconic blue in "Raccoon! Raccoon!")
      const winGrad = ctx.createLinearGradient(wx, winTopScreenY, wx, winBottomScreenY);
      winGrad.addColorStop(0, GAME_CONFIG.PALETTE.WINDOW_BLUE_LIGHT); // #38bdf8 luminous cyan highlight
      winGrad.addColorStop(0.55, GAME_CONFIG.PALETTE.WINDOW_VIBRANT_BLUE); // #1ea7e1 exact book cover blue
      winGrad.addColorStop(1, GAME_CONFIG.PALETTE.WINDOW_BLUE_DEEP); // #0284c7 deep rich azure depth
      ctx.fillStyle = winGrad;
      ctx.fillRect(wx, winTopScreenY, winW, winH);

      // Luminous cyan ambient tint
      ctx.fillStyle = 'rgba(30, 167, 225, 0.15)';
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

      // 90% transparent glass gradient (10% opacity) matching book cover blue tones
      const glassGrad = ctx.createLinearGradient(wx, winTopScreenY, wx, winBottomScreenY);
      glassGrad.addColorStop(0, 'rgba(56, 189, 248, 0.10)'); // 90% transparent sky blue highlight
      glassGrad.addColorStop(0.5, 'rgba(30, 167, 225, 0.10)'); // 90% transparent book cover cyan (#1ea7e1)
      glassGrad.addColorStop(1, 'rgba(2, 132, 199, 0.10)'); // 90% transparent deep blue (#0284c7)
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

          // Storybook Hats from Book Cover ("Raccoon! Raccoon!")
          if (pv.hatType && pv.hatType !== 'none') {
            ctx.save();
            if (pv.hatType === 'red_bonnet') {
              // Red bonnet / beret with rim & tip
              ctx.fillStyle = pv.hatColor || '#e51a24';
              ctx.beginPath();
              ctx.ellipse(sx - headR * 0.1, headY - headR * 0.95, headR * 0.85, headR * 0.45, -0.15, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#b91c1c';
              ctx.beginPath();
              ctx.arc(sx - headR * 0.15, headY - headR * 1.35, headR * 0.12, 0, Math.PI * 2);
              ctx.fill();
            } else if (pv.hatType === 'green_cap') {
              // Emerald green ballcap with brim
              ctx.fillStyle = pv.hatColor || '#16a34a';
              ctx.beginPath();
              ctx.arc(sx, headY - headR * 0.55, headR * 0.95, Math.PI, 0);
              ctx.fill();
              // Visor / bill
              ctx.fillStyle = '#15803d';
              ctx.beginPath();
              ctx.ellipse(sx + headR * 0.45, headY - headR * 0.55, headR * 0.65, headR * 0.22, 0.12, 0, Math.PI);
              ctx.fill();
            } else if (pv.hatType === 'straw_boater') {
              // Straw yellow boater with orange ribbon band
              ctx.fillStyle = '#facc15';
              ctx.fillRect(sx - headR * 0.75, headY - headR * 1.35, headR * 1.5, headR * 0.65);
              // Ribbon band
              ctx.fillStyle = '#ea580c';
              ctx.fillRect(sx - headR * 0.75, headY - headR * 0.92, headR * 1.5, headR * 0.22);
              // Brim
              ctx.fillStyle = '#eab308';
              ctx.beginPath();
              ctx.ellipse(sx, headY - headR * 0.68, headR * 1.15, headR * 0.28, 0, 0, Math.PI * 2);
              ctx.fill();
            } else if (pv.hatType === 'bowler') {
              // Classic charcoal bowler hat
              ctx.fillStyle = '#18181b';
              ctx.beginPath();
              ctx.arc(sx, headY - headR * 0.85, headR * 0.8, Math.PI, 0);
              ctx.fill();
              // Brim
              ctx.beginPath();
              ctx.ellipse(sx, headY - headR * 0.78, headR * 1.05, headR * 0.24, 0, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
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

    // Roof Observation Deck Platform
    const deckY = roofTopScreenY - H * 0.02;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(left + width * 0.15, deckY, width * 0.7, H * 0.02);
    // Sleek perimeter safety curb
    ctx.fillStyle = '#334155';
    ctx.fillRect(left + width * 0.15, deckY, width * 0.7, Math.max(1, H * 0.003));

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
      // Scaled up substantially to match skyscraper lower levels
      const lampH = H * 0.28;
      const lanternY = lampBaseY - lampH;
      const postW = Math.max(6, unitW * 0.016);

      // 1. Soft Warm Light Corona Casting on Sidewalk & Lamppost
      const glowGrad = ctx.createRadialGradient(lampX, lanternY + H * 0.03, 0, lampX, lanternY + H * 0.03, unitW * 0.16);
      glowGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      glowGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.16)');
      glowGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(lampX, lanternY + H * 0.03, unitW * 0.16, 0, Math.PI * 2);
      ctx.fill();

      // Soft light pool on sidewalk below
      const groundGlow = ctx.createRadialGradient(lampX, groundScreenY + sidewalkHeight * 0.5, 0, lampX, groundScreenY + sidewalkHeight * 0.5, unitW * 0.11);
      groundGlow.addColorStop(0, 'rgba(254, 240, 138, 0.38)');
      groundGlow.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = groundGlow;
      ctx.beginPath();
      ctx.ellipse(lampX, groundScreenY + sidewalkHeight * 0.5, unitW * 0.11, sidewalkHeight * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Heavy Cast-Iron Flanged Pedestal Base
      const baseW = postW * 3.4;
      const baseH = H * 0.038;
      ctx.fillStyle = GAME_CONFIG.PALETTE.LAMPPOST_IRON;
      ctx.beginPath();
      ctx.moveTo(lampX - baseW / 2, lampBaseY);
      ctx.lineTo(lampX - postW * 0.85, lampBaseY - baseH);
      ctx.lineTo(lampX + postW * 0.85, lampBaseY - baseH);
      ctx.lineTo(lampX + baseW / 2, lampBaseY);
      ctx.closePath();
      ctx.fill();

      // Pedestal molding collar
      ctx.fillStyle = '#334155';
      ctx.fillRect(lampX - postW * 1.15, lampBaseY - baseH - H * 0.005, postW * 2.3, H * 0.005);

      // 3. Fluted Tapered Column
      const colGrad = ctx.createLinearGradient(lampX - postW / 2, 0, lampX + postW / 2, 0);
      colGrad.addColorStop(0, '#0f172a');
      colGrad.addColorStop(0.4, '#334155');
      colGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = colGrad;
      ctx.fillRect(lampX - postW / 2, lanternY + H * 0.054, postW, lampH - baseH - H * 0.054);

      // Decorative cast rings along the post
      ctx.fillStyle = '#64748b';
      for (let r = 1; r <= 3; r++) {
        const ringY = lampBaseY - baseH - (r / 4) * (lampH - baseH - H * 0.054);
        ctx.fillRect(lampX - postW * 0.85, ringY, postW * 1.7, Math.max(2, H * 0.004));
      }

      // 4. Horizontal Ladder Rest Bar (Crossbar)
      const crossbarW = unitW * 0.052;
      const crossbarY = lanternY + H * 0.072;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(lampX - crossbarW / 2, crossbarY, crossbarW, Math.max(3, H * 0.0045));
      // End finials on crossbar
      ctx.beginPath();
      ctx.arc(lampX - crossbarW / 2, crossbarY + H * 0.0022, H * 0.004, 0, Math.PI * 2);
      ctx.arc(lampX + crossbarW / 2, crossbarY + H * 0.0022, H * 0.004, 0, Math.PI * 2);
      ctx.fill();

      // 5. Classic Lantern Housing
      const lanternW = unitW * 0.046;
      const lanternH = H * 0.054;

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
      ctx.arc(lampX, lanternY + lanternH * 0.6, lanternW * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Dark Iron Lantern Frame Struts
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = Math.max(1.5, W * 0.003);
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
      ctx.lineWidth = Math.max(2, W * 0.0035);
      ctx.beginPath();
      ctx.moveTo(lampX, lanternY);
      ctx.lineTo(lampX, lanternY - H * 0.018);
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

    // 3. Street Signs on Each Side of the Building:
    // Left side: Intersection of "7th St E" & "Minnesota St"
    const leftSignWorldX = bLeft - 0.09;
    const leftSignX = this.worldToScreenX(leftSignWorldX, cameraX, W, H);
    if (leftSignX > -W * 0.15 && leftSignX < W * 1.15) {
      this.drawStreetSign(ctx, W, H, unitW, leftSignX, groundScreenY, sidewalkHeight, '7th St E', 'Minnesota St', false);
    }

    // Right side: Intersection of "7th St W" & "Cedar St"
    const rightSignWorldX = bRight + 0.09;
    const rightSignX = this.worldToScreenX(rightSignWorldX, cameraX, W, H);
    if (rightSignX > -W * 0.15 && rightSignX < W * 1.15) {
      this.drawStreetSign(ctx, W, H, unitW, rightSignX, groundScreenY, sidewalkHeight, '7th St W', 'Cedar St', true);
    }

    ctx.restore();
  }

  /**
   * Classic American City Street Sign Post (Green & White Blades with metal brackets)
   */
  private drawStreetSign(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    unitW: number,
    x: number,
    groundScreenY: number,
    sidewalkHeight: number,
    upperStreet: string,
    lowerStreet: string,
    isRightSide: boolean
  ) {
    const postBaseY = groundScreenY + sidewalkHeight * 0.70;
    // Scaled up substantially to match skyscraper lower levels
    const poleH = Math.max(140, H * 0.22);
    const poleTopY = postBaseY - poleH;
    const poleW = Math.max(7, unitW * 0.010);

    // 1. Post shadow on sidewalk
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(x, postBaseY, poleW * 3.6, poleW * 1.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Heavy Flanged Cast-Iron Post Base
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(x - poleW * 2.8, postBaseY);
    ctx.lineTo(x + poleW * 2.8, postBaseY);
    ctx.lineTo(x + poleW * 1.3, postBaseY - 18);
    ctx.lineTo(x - poleW * 1.3, postBaseY - 18);
    ctx.closePath();
    ctx.fill();

    // 3. Dark Cast-Iron Pole with realistic gradient
    const poleGrad = ctx.createLinearGradient(x - poleW * 0.5, 0, x + poleW * 0.5, 0);
    poleGrad.addColorStop(0, '#0f172a');
    poleGrad.addColorStop(0.35, '#334155');
    poleGrad.addColorStop(0.7, '#475569');
    poleGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = poleGrad;
    ctx.fillRect(x - poleW * 0.5, poleTopY, poleW, poleH - 18);

    // Decorative cast rings along the post
    ctx.fillStyle = '#64748b';
    ctx.fillRect(x - poleW * 0.9, poleTopY + poleH * 0.30, poleW * 1.8, 4);
    ctx.fillRect(x - poleW * 0.9, poleTopY + poleH * 0.60, poleW * 1.8, 4);

    // 4. City Traffic Light Signal Head attached to the post
    const tLightArmX = isRightSide ? x - poleW * 0.5 : x + poleW * 0.5;
    const armDir = isRightSide ? -1 : 1;
    const armLen = Math.max(22, unitW * 0.035);
    const armY = poleTopY + poleH * 0.42;

    // Traffic light mounting bracket
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(armDir > 0 ? tLightArmX : tLightArmX - armLen, armY - 3, armLen, 6);
    ctx.fillRect(armDir > 0 ? tLightArmX + armLen - 4 : tLightArmX - armLen, armY - 8, 4, 16);

    // Traffic light housing box
    const tlBoxW = Math.max(22, unitW * 0.032);
    const tlBoxH = Math.max(64, H * 0.098);
    const tlBoxX = armDir > 0 ? tLightArmX + armLen : tLightArmX - armLen - tlBoxW;
    const tlBoxY = armY - tlBoxH * 0.5;

    // Housing drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.roundRect(tlBoxX + 2, tlBoxY + 2, tlBoxW, tlBoxH, 4);
    ctx.fill();

    // Housing body (matte traffic signal black/dark grey)
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.roundRect(tlBoxX, tlBoxY, tlBoxW, tlBoxH, 4);
    ctx.fill();
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3 Signal Lenses (Red on top, Amber in middle, Green on bottom)
    const lensRadius = Math.max(6, tlBoxW * 0.28);
    const lensSpacing = tlBoxH / 3;
    const lensCenterX = tlBoxX + tlBoxW * 0.5;

    // Red lens (top)
    const redCenterY = tlBoxY + lensSpacing * 0.5;
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.arc(lensCenterX, redCenterY, lensRadius, 0, Math.PI * 2);
    ctx.fill();
    // Lens visor hood
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(lensCenterX, redCenterY, lensRadius + 1.5, Math.PI, 0);
    ctx.stroke();

    // Amber lens (middle)
    const amberCenterY = tlBoxY + lensSpacing * 1.5;
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(lensCenterX, amberCenterY, lensRadius, 0, Math.PI * 2);
    ctx.fill();
    // Lens visor hood
    ctx.beginPath();
    ctx.arc(lensCenterX, amberCenterY, lensRadius + 1.5, Math.PI, 0);
    ctx.stroke();

    // Green lens (bottom - softly illuminated)
    const greenCenterY = tlBoxY + lensSpacing * 2.5;
    // Green lens glow
    const greenGlow = ctx.createRadialGradient(lensCenterX, greenCenterY, 0, lensCenterX, greenCenterY, lensRadius * 2.2);
    greenGlow.addColorStop(0, 'rgba(34, 197, 94, 0.45)');
    greenGlow.addColorStop(1, 'rgba(34, 197, 94, 0)');
    ctx.fillStyle = greenGlow;
    ctx.beginPath();
    ctx.arc(lensCenterX, greenCenterY, lensRadius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Green lens core
    const greenGrad = ctx.createRadialGradient(lensCenterX - 2, greenCenterY - 2, 1, lensCenterX, greenCenterY, lensRadius);
    greenGrad.addColorStop(0, '#86efac');
    greenGrad.addColorStop(0.6, '#22c55e');
    greenGrad.addColorStop(1, '#15803d');
    ctx.fillStyle = greenGrad;
    ctx.beginPath();
    ctx.arc(lensCenterX, greenCenterY, lensRadius, 0, Math.PI * 2);
    ctx.fill();
    // Lens visor hood
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(lensCenterX, greenCenterY, lensRadius + 1.5, Math.PI, 0);
    ctx.stroke();

    // 5. Street Name Blades (Proportionally enlarged)
    const bladeH = Math.max(26, H * 0.038);
    const upperY = poleTopY + bladeH * 0.7;
    const lowerY = upperY + bladeH + 6;

    // Helper to draw an individual street name blade
    const drawBlade = (
      name: string,
      cy: number,
      alignOffset: number,
      angle: number,
      isCross: boolean
    ) => {
      ctx.save();
      ctx.translate(x + alignOffset, cy);
      ctx.rotate(angle);

      const fontSize = Math.max(13, Math.floor(bladeH * 0.58));
      ctx.font = `bold ${fontSize}px sans-serif`;
      const textMetrics = ctx.measureText(name);
      const textW = textMetrics.width;
      const bW = textW + 28;
      const halfW = bW * 0.5;
      const halfH = bladeH * 0.5;

      // Blade drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.beginPath();
      ctx.roundRect(-halfW + 3, -halfH + 3, bW, bladeH, 4);
      ctx.fill();

      // Green Street Sign Background
      ctx.fillStyle = isCross ? '#166534' : '#15803d';
      ctx.beginPath();
      ctx.roundRect(-halfW, -halfH, bW, bladeH, 4);
      ctx.fill();

      // Outer White Border Inset
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(-halfW + 2.5, -halfH + 2.5, bW - 5, bladeH - 5);

      // White Reflective Bold Street Name
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, 0, 0.5);

      ctx.restore();
    };

    // Upper Blade (parallel / facing viewer)
    const upperOffset = isRightSide ? 14 : -14;
    drawBlade(upperStreet, upperY, upperOffset, isRightSide ? 0.02 : -0.02, false);

    // Lower Blade (intersecting / cross street angled slightly)
    const lowerOffset = isRightSide ? -10 : 10;
    drawBlade(lowerStreet, lowerY, lowerOffset, isRightSide ? -0.05 : 0.05, true);

    // 6. Pole Cap Bracket & Finial Ball
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(x, poleTopY + 2, poleW * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(x, poleTopY - 6, poleW * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Child on street level flying a classic colorful diamond kite that ascends and hovers between Floor 3 and Floor 4
   */
  private drawStreetKiteAndChild(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    kite: import('./types').StreetKite,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const unitW = this.getUnitW(W, H);
    const childScreenX = this.worldToScreenX(kite.childX, cameraX, W, H);
    const childScreenY = this.worldToScreenY(kite.childY, cameraY, H);

    const kiteScreenX = this.worldToScreenX(kite.kiteX, cameraX, W, H);
    const kiteScreenY = this.worldToScreenY(kite.kiteY, cameraY, H);

    // 1. Draw Child on Street Sidewalk (if within or near viewport)
    const isChildNearScreen = childScreenY > -60 && childScreenY < H + 120 && childScreenX > -80 && childScreenX < W + 80;
    const handX = childScreenX + unitW * 0.012;
    const handY = childScreenY - H * 0.038;

    if (isChildNearScreen) {
      ctx.save();
      const childW = unitW * 0.060;
      const childH = H * 0.078;

      // Soft shadow on concrete sidewalk
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(childScreenX, childScreenY, childW * 0.55, childH * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sneakers (Navy blue with crisp white sole)
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.roundRect(childScreenX - childW * 0.36, childScreenY - childH * 0.14, childW * 0.30, childH * 0.14, 2);
      ctx.roundRect(childScreenX + childW * 0.06, childScreenY - childH * 0.14, childW * 0.30, childH * 0.14, 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(childScreenX - childW * 0.36, childScreenY - childH * 0.04, childW * 0.30, childH * 0.04);
      ctx.fillRect(childScreenX + childW * 0.06, childScreenY - childH * 0.04, childW * 0.30, childH * 0.04);

      // Denim blue rolled trousers
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(childScreenX - childW * 0.30, childScreenY - childH * 0.42, childW * 0.24, childH * 0.30);
      ctx.fillRect(childScreenX + childW * 0.06, childScreenY - childH * 0.42, childW * 0.24, childH * 0.30);

      // Striped storybook sweater (Crimson Red & Cream stripes)
      const sweaterTop = childScreenY - childH * 0.72;
      const sweaterH = childH * 0.32;
      ctx.fillStyle = '#e51a24';
      ctx.beginPath();
      ctx.roundRect(childScreenX - childW * 0.32, sweaterTop, childW * 0.64, sweaterH, 3);
      ctx.fill();

      // Cream stripes
      ctx.fillStyle = '#fae6d3';
      ctx.fillRect(childScreenX - childW * 0.30, sweaterTop + sweaterH * 0.25, childW * 0.60, sweaterH * 0.18);
      ctx.fillRect(childScreenX - childW * 0.30, sweaterTop + sweaterH * 0.65, childW * 0.60, sweaterH * 0.18);

      // Cute Apricot Head looking excitedly up toward the sky
      const headR = childW * 0.26;
      const headCenterY = sweaterTop - headR * 0.85;
      ctx.fillStyle = '#f7b282';
      ctx.beginPath();
      ctx.arc(childScreenX, headCenterY, headR, 0, Math.PI * 2);
      ctx.fill();

      // Cheerful rosy cheeks
      ctx.fillStyle = 'rgba(244, 63, 94, 0.45)';
      ctx.beginPath();
      ctx.arc(childScreenX - headR * 0.45, headCenterY + headR * 0.2, headR * 0.25, 0, Math.PI * 2);
      ctx.arc(childScreenX + headR * 0.45, headCenterY + headR * 0.2, headR * 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Big curious eyes looking up toward the kite
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(childScreenX - headR * 0.32, headCenterY - headR * 0.15, headR * 0.24, 0, Math.PI * 2);
      ctx.arc(childScreenX + headR * 0.32, headCenterY - headR * 0.15, headR * 0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(childScreenX - headR * 0.32 + 0.5, headCenterY - headR * 0.25, headR * 0.13, 0, Math.PI * 2);
      ctx.arc(childScreenX + headR * 0.32 + 0.5, headCenterY - headR * 0.25, headR * 0.13, 0, Math.PI * 2);
      ctx.fill();

      // Cute happy smile
      ctx.strokeStyle = '#881337';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(childScreenX, headCenterY + headR * 0.25, headR * 0.22, 0, Math.PI);
      ctx.stroke();

      // Backwards storybook green baseball cap with little brim
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(childScreenX, headCenterY - headR * 0.25, headR * 1.05, Math.PI, 0);
      ctx.fill();
      // Cap brim sticking backward
      ctx.beginPath();
      ctx.ellipse(childScreenX - headR * 0.65, headCenterY - headR * 0.35, headR * 0.55, headR * 0.18, -0.2, 0, Math.PI * 2);
      ctx.fill();
      // Cap button
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(childScreenX, headCenterY - headR * 1.25, headR * 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Both arms extended upward holding the wooden string reel
      ctx.strokeStyle = '#f7b282';
      ctx.lineWidth = Math.max(2, unitW * 0.005);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(childScreenX - childW * 0.25, sweaterTop + sweaterH * 0.2);
      ctx.lineTo(handX - 4, handY);
      ctx.moveTo(childScreenX + childW * 0.25, sweaterTop + sweaterH * 0.2);
      ctx.lineTo(handX + 4, handY);
      ctx.stroke();

      // Wooden kite string spool reel
      ctx.fillStyle = '#b45309';
      ctx.fillRect(handX - 7, handY - 4, 14, 8);
      // Wound white kite thread
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(handX - 5, handY - 3, 10, 6);
      // Red handles
      ctx.fillStyle = '#e51a24';
      ctx.fillRect(handX - 9, handY - 2, 2, 4);
      ctx.fillRect(handX + 7, handY - 2, 2, 4);

      ctx.restore();
    }

    // 2. Draw Taut Kite String connecting Child to Kite (with graceful wind bow)
    const isKiteNearScreen = kiteScreenY > -140 && kiteScreenY < H + 140;
    if (isChildNearScreen || isKiteNearScreen || (childScreenY >= H && kiteScreenY <= 0)) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.lineWidth = Math.max(1.6, W * 0.0022);
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      // Bow gently to the right with wind
      const midStringX = (handX + kiteScreenX) * 0.5 + Math.sin(time * 1.5) * 8 + 18;
      const midStringY = (handY + kiteScreenY) * 0.5;
      ctx.quadraticCurveTo(midStringX, midStringY, kiteScreenX, kiteScreenY);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Draw The Classic Diamond Kite & Fluttering Ribbon Tail (Floors 3 to 4)
    if (isKiteNearScreen) {
      ctx.save();
      ctx.translate(kiteScreenX, kiteScreenY);

      // Wind sway tilt
      const tilt = Math.sin(time * 1.8 + kite.swayPhase) * 0.12;
      ctx.rotate(tilt);

      const kw = unitW * (GAME_CONFIG.INTERACTIVE_ELEMENTS.STREET_KITE.KITE_WIDTH_RATIO || 0.11);
      const kh = kw * 1.45;

      const topPt = { x: 0, y: -kh * 0.55 };
      const rightPt = { x: kw * 0.5, y: -kh * 0.08 };
      const bottomPt = { x: 0, y: kh * 0.45 };
      const leftPt = { x: -kw * 0.5, y: -kh * 0.08 };
      const centerPt = { x: 0, y: -kh * 0.08 };

      // Soft aerial drop shadow on facade/sky
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.beginPath();
      ctx.moveTo(topPt.x + 4, topPt.y + 6);
      ctx.lineTo(rightPt.x + 4, rightPt.y + 6);
      ctx.lineTo(bottomPt.x + 4, bottomPt.y + 6);
      ctx.lineTo(leftPt.x + 4, leftPt.y + 6);
      ctx.closePath();
      ctx.fill();

      // Top-Left Quadrant: Storybook Crimson Red
      ctx.fillStyle = '#e51a24';
      ctx.beginPath();
      ctx.moveTo(centerPt.x, centerPt.y);
      ctx.lineTo(topPt.x, topPt.y);
      ctx.lineTo(leftPt.x, leftPt.y);
      ctx.closePath();
      ctx.fill();

      // Top-Right Quadrant: Sunny Straw Yellow
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(centerPt.x, centerPt.y);
      ctx.lineTo(topPt.x, topPt.y);
      ctx.lineTo(rightPt.x, rightPt.y);
      ctx.closePath();
      ctx.fill();

      // Bottom-Left Quadrant: Storybook Cerulean Cyan
      ctx.fillStyle = '#1ea7e1';
      ctx.beginPath();
      ctx.moveTo(centerPt.x, centerPt.y);
      ctx.lineTo(bottomPt.x, bottomPt.y);
      ctx.lineTo(leftPt.x, leftPt.y);
      ctx.closePath();
      ctx.fill();

      // Bottom-Right Quadrant: Vivid Emerald Green
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.moveTo(centerPt.x, centerPt.y);
      ctx.lineTo(bottomPt.x, bottomPt.y);
      ctx.lineTo(rightPt.x, rightPt.y);
      ctx.closePath();
      ctx.fill();

      // Cross struts / Bamboo frame spines
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = Math.max(2.4, W * 0.0035);
      ctx.beginPath();
      // Vertical spine
      ctx.moveTo(topPt.x, topPt.y);
      ctx.lineTo(bottomPt.x, bottomPt.y);
      // Horizontal spar
      ctx.moveTo(leftPt.x, leftPt.y);
      ctx.lineTo(rightPt.x, rightPt.y);
      ctx.stroke();

      // Outer hem border
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = Math.max(1, W * 0.0018);
      ctx.beginPath();
      ctx.moveTo(topPt.x, topPt.y);
      ctx.lineTo(rightPt.x, rightPt.y);
      ctx.lineTo(bottomPt.x, bottomPt.y);
      ctx.lineTo(leftPt.x, leftPt.y);
      ctx.closePath();
      ctx.stroke();

      // Center ring / bridle tie
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(centerPt.x, centerPt.y, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Flowing Ribbon Tail with Animated Bows
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(bottomPt.x, bottomPt.y);

      const bowCount = 5;
      const bowSpacing = kh * 0.42;
      const bowColors = ['#e51a24', '#facc15', '#1ea7e1', '#16a34a', '#ea580c'];
      const tailPoints: { x: number; y: number }[] = [];

      for (let b = 1; b <= bowCount; b++) {
        const wave = Math.sin(time * 3.5 - b * 0.7) * (kw * 0.45);
        const pt = {
          x: bottomPt.x + wave + (b * 2),
          y: bottomPt.y + b * bowSpacing,
        };
        tailPoints.push(pt);
      }

      // Stroke tail line
      for (const pt of tailPoints) {
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      // Draw colorful tied fabric bows along the tail
      tailPoints.forEach((pt, idx) => {
        const color = bowColors[idx % bowColors.length];
        const bowSize = kw * 0.28;
        const bowWave = Math.sin(time * 4 + idx) * 0.25;

        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(bowWave);

        // Center knot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();

        // Left bow wing
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-bowSize, -bowSize * 0.45);
        ctx.lineTo(-bowSize, bowSize * 0.45);
        ctx.closePath();
        ctx.fill();

        // Right bow wing
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(bowSize, -bowSize * 0.45);
        ctx.lineTo(bowSize, bowSize * 0.45);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      });

      ctx.restore();
    }
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
    const streetH = Math.max(80, H - streetY + 160);

    ctx.save();

    for (const v of vehicles) {
      const isNearLane = v.lane === 'near';
      const scale = isNearLane ? 1.05 : 0.90;
      const vW = v.width * unitW * scale;
      const vH = v.height * H * scale;
      const vxCenter = this.worldToScreenX(v.x, cameraX, W, H);
      const laneCenterY = isNearLane ? streetY + streetH * 0.70 : streetY + streetH * 0.26;
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
    const pal = this.raccoonPalette;
    // Head peeking out of trash can opening (enlarged to match climbing scale)
    const headRadius = canW * 0.38;
    const breathe = Math.sin(time * 2.5) * (canH * 0.04);
    const headX = canX;
    const headY = rimY - headRadius * 0.45 + breathe;

    // Ears sticking up
    const earH = headRadius * 0.95;
    const earTwitch = Math.sin(time * 6) * 0.08;

    // Left Ear
    ctx.fillStyle = pal.FUR_DARK;
    ctx.beginPath();
    ctx.moveTo(headX - headRadius * 0.7, headY - headRadius * 0.3);
    ctx.lineTo(headX - headRadius * 0.85 + earTwitch * headRadius, headY - earH);
    ctx.lineTo(headX - headRadius * 0.25, headY - headRadius * 0.7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = pal.EAR_INNER;
    ctx.beginPath();
    ctx.moveTo(headX - headRadius * 0.62, headY - headRadius * 0.35);
    ctx.lineTo(headX - headRadius * 0.75 + earTwitch * headRadius, headY - earH * 0.85);
    ctx.lineTo(headX - headRadius * 0.32, headY - headRadius * 0.65);
    ctx.closePath();
    ctx.fill();

    // Right Ear
    ctx.fillStyle = pal.FUR_DARK;
    ctx.beginPath();
    ctx.moveTo(headX + headRadius * 0.25, headY - headRadius * 0.7);
    ctx.lineTo(headX + headRadius * 0.85 - earTwitch * headRadius, headY - earH);
    ctx.lineTo(headX + headRadius * 0.7, headY - headRadius * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = pal.EAR_INNER;
    ctx.beginPath();
    ctx.moveTo(headX + headRadius * 0.32, headY - headRadius * 0.65);
    ctx.lineTo(headX + headRadius * 0.75 - earTwitch * headRadius, headY - earH * 0.85);
    ctx.lineTo(headX + headRadius * 0.62, headY - headRadius * 0.35);
    ctx.closePath();
    ctx.fill();

    // Fluffy Head Base
    ctx.fillStyle = pal.FUR_MAIN;
    ctx.beginPath();
    ctx.ellipse(headX, headY, headRadius, headRadius * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bandit Mask across eyes
    ctx.fillStyle = pal.MASK;
    ctx.beginPath();
    ctx.ellipse(headX, headY - headRadius * 0.05, headRadius * 0.9, headRadius * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // White Brow tufts
    ctx.fillStyle = pal.EYEBROWS;
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
      ctx.fillStyle = pal.EYE_WHITE;
      ctx.beginPath();
      ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fill();

      // Iris
      ctx.fillStyle = pal.EYE_IRIS;
      ctx.beginPath();
      ctx.arc(ex, eyeY - eyeR * 0.15, eyeR * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // Pupil
      ctx.fillStyle = pal.EYE_PUPIL;
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
    ctx.fillStyle = pal.SNOUT;
    ctx.beginPath();
    ctx.ellipse(headX, headY + headRadius * 0.3, headRadius * 0.45, headRadius * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Button Nose
    ctx.fillStyle = pal.NOSE;
    ctx.beginPath();
    ctx.arc(headX, headY + headRadius * 0.22, headRadius * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Optional Head Accessory on peeking raccoon
    const acc = this.activeCharacterConfig?.accessory;
    if (acc) {
      if (acc.type === 'chef_hat') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(headX, headY - headRadius * 0.9, headRadius * 0.5, headRadius * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(headX - headRadius * 0.35, headY - headRadius * 0.65, headRadius * 0.7, headRadius * 0.2);
      } else if (acc.type === 'horn') {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(headX, headY - headRadius * 1.5);
        ctx.lineTo(headX - headRadius * 0.2, headY - headRadius * 0.6);
        ctx.lineTo(headX + headRadius * 0.2, headY - headRadius * 0.6);
        ctx.closePath();
        ctx.fill();
      } else if (acc.type === 'tiara') {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(headX - headRadius * 0.4, headY - headRadius * 0.6);
        ctx.lineTo(headX - headRadius * 0.2, headY - headRadius * 0.95);
        ctx.lineTo(headX, headY - headRadius * 0.7);
        ctx.lineTo(headX + headRadius * 0.2, headY - headRadius * 0.95);
        ctx.lineTo(headX + headRadius * 0.4, headY - headRadius * 0.6);
        ctx.closePath();
        ctx.fill();
      } else if (acc.type === 'headband') {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(headX - headRadius * 0.65, headY - headRadius * 0.45, headRadius * 1.3, headRadius * 0.22);
      } else if (acc.type === 'helmet') {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = Math.max(2, headRadius * 0.12);
        ctx.beginPath();
        ctx.arc(headX, headY, headRadius * 1.25, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Two little black paws clutching the trash can rim!
    const pawR = canW * 0.135;
    const pawY = rimY + canH * 0.035;
    ctx.fillStyle = pal.PAWS;
    ctx.beginPath();
    ctx.ellipse(headX - canW * 0.25, pawY, pawR, pawR * 0.7, -0.2, 0, Math.PI * 2);
    ctx.ellipse(headX + canW * 0.25, pawY, pawR, pawR * 0.7, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Cute tiny claws on rim
    ctx.fillStyle = pal.CLAWS;
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
  private getLoadedCharacterImage(url?: string): HTMLImageElement | null {
    if (!url) return null;
    if (!this.characterImageCache[url]) {
      const img = new Image();
      img.src = url;
      this.characterImageCache[url] = img;
    }
    const cached = this.characterImageCache[url];
    return cached && cached.complete && cached.naturalWidth > 0 ? cached : null;
  }

  private get raccoonPalette() {
    const p = this.activeCharacterConfig?.palette || RACCOON_ROSTER[0].palette;
    return {
      furMain: p.furMain,
      furDark: p.furDark,
      furLight: p.furLight,
      belly: p.belly,
      mask: p.mask,
      eyebrows: p.eyebrows,
      snout: p.snout,
      nose: p.nose,
      eyeWhite: p.eyeWhite,
      eyePupil: p.eyePupil,
      eyeIris: p.eyeIris,
      earInner: p.earInner,
      paws: p.paws,
      claws: p.claws,
      tailRingLight: p.tailRingLight,
      tailRingDark: p.tailRingDark,
      accent: p.accent,
      FUR_MAIN: p.furMain,
      FUR_DARK: p.furDark,
      FUR_LIGHT: p.furLight,
      BELLY: p.belly,
      MASK: p.mask,
      EYEBROWS: p.eyebrows,
      SNOUT: p.snout,
      NOSE: p.nose,
      EYE_WHITE: p.eyeWhite,
      EYE_PUPIL: p.eyePupil,
      EYE_IRIS: p.eyeIris,
      EAR_INNER: p.earInner,
      PAWS: p.paws,
      CLAWS: p.claws,
      TAIL_RING_LIGHT: p.tailRingLight,
      TAIL_RING_DARK: p.tailRingDark,
    };
  }

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

    // Modular Art Replacement: check for custom image / sprite URL
    const char = this.activeCharacterConfig || RACCOON_ROSTER[0];
    const customSpriteUrl = raccoon.isRestingOnSill
      ? (char.sillSpriteUrl || char.imageUrl)
      : (char.climbSpriteUrl || char.imageUrl);
    const customImg = this.getLoadedCharacterImage(customSpriteUrl);

    if (customImg) {
      const unitW = this.getUnitW(W, H);
      const screenX = this.worldToScreenX(raccoon.x, cameraX, W, H);
      const screenY = this.worldToScreenY(raccoon.y, cameraY, H);
      const spriteW = unitW * (raccoon.isRestingOnSill ? GAME_CONFIG.RACCOON.SIDE_PROFILE_WIDTH_RATIO : GAME_CONFIG.RACCOON.WIDTH_RATIO);
      const spriteH = H * (raccoon.isRestingOnSill ? GAME_CONFIG.RACCOON.SIDE_PROFILE_HEIGHT_RATIO : GAME_CONFIG.RACCOON.HEIGHT_RATIO);
      ctx.save();
      ctx.translate(screenX, screenY);
      if (raccoon.isRestingOnSill && raccoon.lastSideFacing === 'left') {
        ctx.scale(-1, 1);
      }
      ctx.drawImage(customImg, -spriteW * 0.5, -spriteH * 0.5, spriteW, spriteH);
      ctx.restore();
      return;
    }

    if (raccoon.isRestingOnSill) {
      this.drawRaccoonSideProfile(ctx, W, H, raccoon, cameraX, cameraY, time);
    } else {
      this.drawRaccoonTopDown(ctx, W, H, raccoon, cameraX, cameraY, time);
    }
  }

  /**
   * Renders modular cosmetic accessories (cape, tie, astronaut helmet, ninja headband, chef hat, unicorn horn, crown, etc.)
   */
  private drawRaccoonAccessory(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    isSideProfile: boolean,
    raccoon: RaccoonPosition,
    time: number
  ) {
    const acc = this.activeCharacterConfig?.accessory;
    if (!acc || acc.type === 'none') return;

    ctx.save();
    switch (acc.type) {
      case 'cape': {
        const flutter = Math.sin(time * 8) * (w * 0.08);
        ctx.fillStyle = acc.color;
        ctx.beginPath();
        if (isSideProfile) {
          ctx.moveTo(-w * 0.15, -h * 0.28);
          ctx.quadraticCurveTo(-w * 0.45, -h * 0.22, -w * 0.65 + flutter, -h * 0.05);
          ctx.lineTo(-w * 0.55 + flutter, h * 0.02);
          ctx.quadraticCurveTo(-w * 0.35, -h * 0.15, -w * 0.08, -h * 0.22);
        } else {
          ctx.moveTo(-w * 0.32, -h * 0.15);
          ctx.quadraticCurveTo(-w * 0.55, h * 0.12, -w * 0.45 + flutter, h * 0.42);
          ctx.lineTo(w * 0.45 - flutter, h * 0.42);
          ctx.quadraticCurveTo(w * 0.55, h * 0.12, w * 0.32, -h * 0.15);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = acc.secondaryColor || '#facc15';
        ctx.lineWidth = Math.max(1, w * 0.02);
        ctx.stroke();
        break;
      }

      case 'tie': {
        ctx.fillStyle = acc.color;
        if (isSideProfile) {
          ctx.beginPath();
          ctx.moveTo(w * 0.16, -h * 0.28);
          ctx.lineTo(w * 0.14, -h * 0.12);
          ctx.lineTo(w * 0.18, -h * 0.08);
          ctx.lineTo(w * 0.22, -h * 0.12);
          ctx.lineTo(w * 0.20, -h * 0.28);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(0, -h * 0.28, w * 0.18, h * 0.06, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = acc.color;
          ctx.beginPath();
          ctx.moveTo(-w * 0.04, -h * 0.26);
          ctx.lineTo(-w * 0.06, -h * 0.14);
          ctx.lineTo(0, -h * 0.08);
          ctx.lineTo(w * 0.06, -h * 0.14);
          ctx.lineTo(w * 0.04, -h * 0.26);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }

      case 'helmet': {
        const helmRadius = isSideProfile ? w * 0.32 : w * 0.38;
        const helmY = isSideProfile ? -h * 0.56 : -h * 0.35;
        const helmX = isSideProfile ? w * 0.20 : 0;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = Math.max(1.5, w * 0.025);
        ctx.beginPath();
        ctx.arc(helmX, helmY, helmRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = Math.max(1.5, w * 0.03);
        ctx.beginPath();
        ctx.arc(helmX, helmY, helmRadius * 0.82, -Math.PI * 0.75, -Math.PI * 0.35);
        ctx.stroke();
        break;
      }

      case 'headband': {
        ctx.fillStyle = acc.color;
        const headY = isSideProfile ? -h * 0.62 : -h * 0.40;
        const headX = isSideProfile ? w * 0.20 : 0;
        ctx.fillRect(headX - w * 0.26, headY, w * 0.52, h * 0.05);

        const ribbonFlutter = Math.sin(time * 10) * (w * 0.06);
        ctx.beginPath();
        ctx.moveTo(headX - w * 0.26, headY + h * 0.02);
        ctx.lineTo(headX - w * 0.48 + ribbonFlutter, headY - h * 0.08);
        ctx.lineTo(headX - w * 0.42 + ribbonFlutter, headY - h * 0.02);
        ctx.lineTo(headX - w * 0.26, headY + h * 0.05);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'chef_hat': {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        const hatBaseY = isSideProfile ? -h * 0.70 : -h * 0.48;
        const hatX = isSideProfile ? w * 0.22 : 0;
        ctx.fillRect(hatX - w * 0.22, hatBaseY, w * 0.44, h * 0.06);
        ctx.beginPath();
        ctx.ellipse(hatX, hatBaseY - h * 0.12, w * 0.32, h * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'horn': {
        const hornX = isSideProfile ? w * 0.30 : 0;
        const hornBaseY = isSideProfile ? -h * 0.68 : -h * 0.46;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(hornX - w * 0.07, hornBaseY);
        ctx.lineTo(hornX, hornBaseY - h * 0.28);
        ctx.lineTo(hornX + w * 0.07, hornBaseY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = Math.max(1, w * 0.015);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(hornX, hornBaseY - h * 0.28, w * 0.03, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'tiara': {
        const crownX = isSideProfile ? w * 0.22 : 0;
        const crownY = isSideProfile ? -h * 0.70 : -h * 0.46;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(crownX - w * 0.22, crownY);
        ctx.lineTo(crownX - w * 0.22, crownY - h * 0.10);
        ctx.lineTo(crownX - w * 0.11, crownY - h * 0.05);
        ctx.lineTo(crownX, crownY - h * 0.14);
        ctx.lineTo(crownX + w * 0.11, crownY - h * 0.05);
        ctx.lineTo(crownX + w * 0.22, crownY - h * 0.10);
        ctx.lineTo(crownX + w * 0.22, crownY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(crownX, crownY - h * 0.04, w * 0.03, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'cap': {
        const capX = isSideProfile ? w * 0.22 : 0;
        const capY = isSideProfile ? -h * 0.65 : -h * 0.44;
        ctx.fillStyle = acc.color;
        ctx.beginPath();
        ctx.arc(capX, capY, w * 0.24, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = acc.secondaryColor || '#1d4ed8';
        if (isSideProfile) {
          ctx.beginPath();
          ctx.ellipse(capX + w * 0.18, capY, w * 0.16, h * 0.035, 0.15, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(capX - w * 0.26, capY, w * 0.52, h * 0.03);
        }
        break;
      }

      case 'sparkles': {
        const sparkPhase = time * 4;
        ctx.fillStyle = acc.color;
        for (let s = 0; s < 4; s++) {
          const ang = sparkPhase + s * (Math.PI / 2);
          const rad = w * 0.40 + Math.sin(time * 6 + s) * (w * 0.08);
          const sx = Math.cos(ang) * rad;
          const sy = (isSideProfile ? -h * 0.25 : 0) + Math.sin(ang) * rad * 0.6;
          ctx.beginPath();
          ctx.arc(sx, sy, w * 0.025, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'rainbow_trail': {
        const colors = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7'];
        ctx.lineWidth = Math.max(1.2, w * 0.02);
        colors.forEach((col, idx) => {
          ctx.strokeStyle = col;
          ctx.beginPath();
          const offset = (idx - 2.5) * (w * 0.04);
          ctx.arc(offset, isSideProfile ? -h * 0.25 : h * 0.15, w * 0.35, 0, Math.PI * 0.6);
          ctx.stroke();
        });
        break;
      }

      case 'fluff': {
        ctx.fillStyle = acc.color;
        [-w * 0.38, w * 0.38].forEach((fx) => {
          ctx.beginPath();
          ctx.arc(fx, isSideProfile ? -h * 0.35 : -h * 0.15, w * 0.14, 0, Math.PI * 2);
          ctx.fill();
        });
        break;
      }
    }
    ctx.restore();
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
    ctx.fillStyle = this.raccoonPalette.furMain;
    ctx.beginPath();
    ctx.ellipse(-baseW * 0.04 + crawlFlex * 0.5, lowCrouchY, baseW * 0.28 + crawlFlex * 0.5, baseH * 0.21, -0.10, 0, Math.PI * 2);
    ctx.fill();

    // Lighter cream belly contour hugging close to sill
    ctx.fillStyle = this.raccoonPalette.belly;
    ctx.beginPath();
    ctx.ellipse(baseW * 0.04 + crawlFlex * 0.3, -baseH * 0.22 + breatheY, baseW * 0.16, baseH * 0.12, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // 4. Near (Foreground) Limbs - scooting low along the sill
    // Near Rear Haunch & Paw (opposite motion to Near Front Arm)
    ctx.fillStyle = this.raccoonPalette.furDark;
    ctx.beginPath();
    ctx.ellipse(-baseW * 0.18 + nearRearStep.offsetX * 0.4, -baseH * 0.22 + breatheY, baseW * 0.18, baseH * 0.18, -0.2, 0, Math.PI * 2);
    ctx.fill();

    const nearRearPawCenterY = -baseH * 0.062 - nearRearStep.liftY;
    ctx.fillStyle = this.raccoonPalette.paws;
    ctx.beginPath();
    ctx.ellipse(-baseW * 0.18 + nearRearStep.offsetX, nearRearPawCenterY, baseW * 0.085, baseH * 0.062, 0, 0, Math.PI * 2);
    ctx.fill();

    // Near Front Leg & Paw (opposite motion to Near Rear Leg)
    const frontPawX = baseW * 0.20 + nearFrontStep.offsetX;
    const frontPawR = baseW * 0.062;
    const frontPawCenterY = -frontPawR - nearFrontStep.liftY;

    ctx.fillStyle = this.raccoonPalette.furDark;
    ctx.beginPath();
    ctx.moveTo(baseW * 0.14, -baseH * 0.28 + breatheY);
    ctx.lineTo(frontPawX, frontPawCenterY);
    ctx.lineTo(frontPawX + baseW * 0.08, frontPawCenterY);
    ctx.lineTo(baseW * 0.22, -baseH * 0.26 + breatheY);
    ctx.closePath();
    ctx.fill();

    // Front Paw pad resting atop sill
    ctx.fillStyle = this.raccoonPalette.paws;
    ctx.beginPath();
    ctx.arc(frontPawX + baseW * 0.04, frontPawCenterY, frontPawR, 0, Math.PI * 2);
    ctx.fill();

    // Tiny claws touching sill edge
    ctx.fillStyle = this.raccoonPalette.claws;
    for (let c = 0; c < 3; c++) {
      ctx.beginPath();
      ctx.arc(frontPawX + baseW * 0.01 + c * (baseW * 0.03), frontPawCenterY + frontPawR * 0.85, baseW * 0.014, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Head in Side Profile with Bandit Mask, Ears, and Snout (poised low in crawl posture)
    this.drawSideProfileHead(ctx, baseW, baseH, breatheY, time);

    // 6. Cosmetic Accessory (cape, tie, helmet, hat, crown, etc.)
    this.drawRaccoonAccessory(ctx, baseW, baseH, true, raccoon, time);

    // 7. Cute Resting Badge / Sparkle above head
    if (!isWalking) {
      this.drawSillRestEffect(ctx, baseW, baseH, time);
    }

    // 8. Glass slip streaks if bumping glass
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
        ? this.raccoonPalette.tailRingDark
        : this.raccoonPalette.tailRingLight;

      ctx.beginPath();
      const taper = 1.0 - (i / rings) * 0.25;
      ctx.ellipse(rx, ry, segW * 0.65, (tailThick * taper) / 2, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tail tip curled slightly upwards
    ctx.fillStyle = this.raccoonPalette.tailRingDark;
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
    ctx.fillStyle = this.raccoonPalette.furDark;
    ctx.beginPath();
    ctx.moveTo(headX - headRadius * 0.2, headY - headRadius * 0.6);
    ctx.lineTo(headX - headRadius * 0.1, headY - headRadius * 1.55);
    ctx.lineTo(headX + headRadius * 0.4, headY - headRadius * 0.8);
    ctx.closePath();
    ctx.fill();

    // 2. Main Head & Fluffy Cheeks
    // Soft fluffy cheek tuft at jaw line
    ctx.fillStyle = this.raccoonPalette.furMain;
    ctx.beginPath();
    ctx.ellipse(headX - headRadius * 0.32, headY + headRadius * 0.38, headRadius * 0.42, headRadius * 0.32, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Fluffy Head Base
    ctx.beginPath();
    ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // Soft cream chin contour under jaw
    ctx.fillStyle = this.raccoonPalette.belly;
    ctx.beginPath();
    ctx.ellipse(headX + headRadius * 0.15, headY + headRadius * 0.62, headRadius * 0.36, headRadius * 0.18, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 3. Front Ear with dark border, gray face, and soft pink inner fluff
    const earTwitch = Math.sin(time * 5) * (headRadius * 0.05);

    // Dark outer ear rim
    ctx.fillStyle = this.raccoonPalette.furDark;
    ctx.beginPath();
    ctx.moveTo(headX + headRadius * 0.08, headY - headRadius * 0.52);
    ctx.lineTo(headX + headRadius * 0.35 + earTwitch, headY - headRadius * 1.62);
    ctx.lineTo(headX + headRadius * 0.88, headY - headRadius * 0.68);
    ctx.closePath();
    ctx.fill();

    // Main ear fill
    ctx.fillStyle = this.raccoonPalette.furMain;
    ctx.beginPath();
    ctx.moveTo(headX + headRadius * 0.14, headY - headRadius * 0.52);
    ctx.lineTo(headX + headRadius * 0.36 + earTwitch, headY - headRadius * 1.55);
    ctx.lineTo(headX + headRadius * 0.82, headY - headRadius * 0.70);
    ctx.closePath();
    ctx.fill();

    // Soft pink inner ear fluff
    ctx.fillStyle = this.raccoonPalette.earInner;
    ctx.beginPath();
    ctx.moveTo(headX + headRadius * 0.24, headY - headRadius * 0.56);
    ctx.lineTo(headX + headRadius * 0.40 + earTwitch * 0.7, headY - headRadius * 1.35);
    ctx.lineTo(headX + headRadius * 0.72, headY - headRadius * 0.74);
    ctx.closePath();
    ctx.fill();

    // 4. Black Bandit Mask across side profile
    ctx.fillStyle = this.raccoonPalette.mask;
    ctx.beginPath();
    ctx.moveTo(headX - headRadius * 0.12, headY - headRadius * 0.32);
    ctx.lineTo(headX + headRadius * 1.15, headY - headRadius * 0.12);
    ctx.lineTo(headX + headRadius * 0.95, headY + headRadius * 0.46);
    ctx.lineTo(headX - headRadius * 0.12, headY + headRadius * 0.22);
    ctx.closePath();
    ctx.fill();

    // 5. White brow patch above mask
    ctx.fillStyle = this.raccoonPalette.eyebrows;
    ctx.beginPath();
    ctx.ellipse(headX + headRadius * 0.42, headY - headRadius * 0.42, headRadius * 0.28, headRadius * 0.16, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 6. Cute Cream Snout extending forward in profile
    ctx.fillStyle = this.raccoonPalette.snout;
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
    ctx.fillStyle = this.raccoonPalette.nose;
    ctx.beginPath();
    ctx.arc(noseX, noseY, noseR, 0, Math.PI * 2);
    ctx.fill();

    // Tiny white highlight glint on button nose
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(noseX - noseR * 0.3, noseY - noseR * 0.35, noseR * 0.32, 0, Math.PI * 2);
    ctx.fill();

    // Subtle sweet smile curve under nose
    ctx.strokeStyle = this.raccoonPalette.nose;
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
    ctx.fillStyle = this.raccoonPalette.eyeWhite;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Amber Iris looking forward along the sill
    ctx.fillStyle = this.raccoonPalette.eyeIris;
    ctx.beginPath();
    ctx.arc(eyeX + eyeR * 0.18, eyeY, eyeR * 0.85, 0, Math.PI * 2);
    ctx.fill();

    // Dark Pupil
    ctx.fillStyle = this.raccoonPalette.eyePupil;
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

    // 5. Head with Ears, Bandit Mask, Eyes, Snout & Whiskers (Expressive cuteness & dynamic directional gaze)
    this.drawRaccoonHead(ctx, currentW, currentH, raccoon, time);

    // 6. Cosmetic Accessory (cape, tie, astronaut helmet, headband, chef hat, unicorn horn, crown, etc.)
    this.drawRaccoonAccessory(ctx, currentW, currentH, false, raccoon, time);

    // 7. Scramble Dust / Speed Trails / Sparks when speed boosted or scrambling
    if (raccoon.isScrambling || raccoon.isSpeedBoosted) {
      this.drawScrambleEffects(ctx, currentW, currentH, time);
    }

    // 8. Glass Paw Slip Effect when trying to climb unclimbable glass
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
        ? this.raccoonPalette.tailRingDark
        : this.raccoonPalette.tailRingLight;

      ctx.beginPath();
      const taper = 1.0 - (i / segments) * 0.38;
      ctx.ellipse(0, segY + segH * 0.5, (tailWidth * taper) / 2, segH * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fluffy tail tip
    ctx.fillStyle = this.raccoonPalette.tailRingDark;
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
      ctx.fillStyle = this.raccoonPalette.furMain;
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
      ctx.strokeStyle = this.raccoonPalette.furDark;
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
      ctx.fillStyle = this.raccoonPalette.paws;
      ctx.beginPath();
      ctx.arc(p.x, p.y, pawRadius, 0, Math.PI * 2);
      ctx.fill();

      // Tiny grip claws
      ctx.fillStyle = this.raccoonPalette.claws;
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
    ctx.fillStyle = this.raccoonPalette.furMain;
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
    ctx.fillStyle = this.raccoonPalette.furDark;
    ctx.beginPath();
    ctx.ellipse(0, h * 0.04, w * 0.23, h * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Soft warm fur highlights on shoulder blades and flank edges
    ctx.fillStyle = this.raccoonPalette.furLight;
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
    const pal = this.raccoonPalette;
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
      ctx.fillStyle = pal.FUR_DARK;
      ctx.beginPath();
      ctx.moveTo(headCenterX - headW * 0.74, headCenterY);
      ctx.lineTo(leftEarTipX - headW * 0.04, leftEarTipY - headH * 0.04);
      ctx.lineTo(headCenterX - headW * 0.22, headCenterY - earH * 0.35);
      ctx.closePath();
      ctx.fill();

      // Main ear face
      ctx.fillStyle = pal.FUR_MAIN;
      ctx.beginPath();
      ctx.moveTo(headCenterX - headW * 0.70, headCenterY);
      ctx.lineTo(leftEarTipX, leftEarTipY);
      ctx.lineTo(headCenterX - headW * 0.25, headCenterY - earH * 0.38);
      ctx.closePath();
      ctx.fill();

      // Soft pink inner ear fluff
      ctx.fillStyle = pal.EAR_INNER;
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
      ctx.fillStyle = pal.FUR_DARK;
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
      ctx.fillStyle = pal.EAR_INNER;
      ctx.beginPath();
      ctx.arc(leftEarTipX + headW * 0.05, leftEarTipY + earH * 0.16, headW * 0.075, 0, Math.PI * 2);
      ctx.fill();
    }

    // Right Ear
    if (turnX > 0.22 && !isDown) {
      // Right ear rotated into 3/4 front view as head turns right!
      // Dark outer frame
      ctx.fillStyle = pal.FUR_DARK;
      ctx.beginPath();
      ctx.moveTo(headCenterX + headW * 0.74, headCenterY);
      ctx.lineTo(rightEarTipX + headW * 0.04, rightEarTipY - headH * 0.04);
      ctx.lineTo(headCenterX + headW * 0.22, headCenterY - earH * 0.35);
      ctx.closePath();
      ctx.fill();

      // Main ear face
      ctx.fillStyle = pal.FUR_MAIN;
      ctx.beginPath();
      ctx.moveTo(headCenterX + headW * 0.70, headCenterY);
      ctx.lineTo(rightEarTipX, rightEarTipY);
      ctx.lineTo(headCenterX + headW * 0.25, headCenterY - earH * 0.38);
      ctx.closePath();
      ctx.fill();

      // Soft pink inner ear fluff
      ctx.fillStyle = pal.EAR_INNER;
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
      ctx.fillStyle = pal.FUR_DARK;
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
      ctx.fillStyle = pal.EAR_INNER;
      ctx.beginPath();
      ctx.arc(rightEarTipX - headW * 0.05, rightEarTipY + earH * 0.16, headW * 0.075, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Cute Chubby Crown & Rounded Back of Head (viewed from behind)
    ctx.fillStyle = pal.FUR_MAIN;
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
    ctx.fillStyle = pal.FUR_DARK;
    ctx.beginPath();
    ctx.ellipse(headCenterX, headCenterY + headH * 0.34, headW * 0.44, headH * 0.28, headTiltAngle, 0, Math.PI * 2);
    ctx.fill();

    // Soft lighter cheek fur tufts on sides
    ctx.fillStyle = pal.FUR_LIGHT;
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
      ctx.fillStyle = pal.FUR_DARK;
      ctx.beginPath();
      ctx.ellipse(headCenterX, headCenterY - headH * 0.20, headW * 0.48, headH * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = pal.FUR_MAIN;
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
      ctx.fillStyle = pal.SNOUT;
      ctx.beginPath();
      ctx.ellipse(snoutX, snoutY, headW * 0.38, headH * 0.26, snoutAngle, 0, Math.PI * 2);
      ctx.fill();

      // Shiny Black Button Nose
      const noseX = snoutX - headW * 0.14;
      const noseY = snoutY + noseOffsetY;
      const noseR = headW * 0.11;
      ctx.fillStyle = pal.NOSE;
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

      ctx.fillStyle = pal.MASK;
      ctx.beginPath();
      ctx.ellipse(eyeX, eyeY, headW * 0.34, headH * 0.30, maskAngle, 0, Math.PI * 2);
      ctx.fill();

      // White Eyebrow marking
      ctx.fillStyle = pal.EYEBROWS;
      ctx.beginPath();
      ctx.ellipse(eyeX - headW * 0.02, eyeY - headH * 0.32, headW * 0.18, headH * 0.10, eyebrowAngle, 0, Math.PI * 2);
      ctx.fill();

      // Big Sparkling Anime Eye looking in the related direction (including diagonal!)
      // Pure white sclera
      ctx.fillStyle = pal.EYE_WHITE;
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Amber Iris looking diagonally / along heading
      ctx.fillStyle = pal.EYE_IRIS;
      ctx.beginPath();
      ctx.arc(eyeX + eyeGazeOffsetX, eyeY + eyeGazeOffsetY, eyeR * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // Deep dark pupil
      ctx.fillStyle = pal.EYE_PUPIL;
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
      ctx.fillStyle = pal.SNOUT;
      ctx.beginPath();
      ctx.ellipse(snoutX, snoutY, headW * 0.38, headH * 0.26, snoutAngle, 0, Math.PI * 2);
      ctx.fill();

      // Shiny Black Button Nose
      const noseX = snoutX + headW * 0.14;
      const noseY = snoutY + noseOffsetY;
      const noseR = headW * 0.11;
      ctx.fillStyle = pal.NOSE;
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

      ctx.fillStyle = pal.MASK;
      ctx.beginPath();
      ctx.ellipse(eyeX, eyeY, headW * 0.34, headH * 0.30, maskAngle, 0, Math.PI * 2);
      ctx.fill();

      // White Eyebrow marking
      ctx.fillStyle = pal.EYEBROWS;
      ctx.beginPath();
      ctx.ellipse(eyeX + headW * 0.02, eyeY - headH * 0.32, headW * 0.18, headH * 0.10, eyebrowAngle, 0, Math.PI * 2);
      ctx.fill();

      // Big Sparkling Anime Eye looking in the related direction (including diagonal!)
      // Pure white sclera
      ctx.fillStyle = pal.EYE_WHITE;
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Amber Iris looking diagonally / along heading
      ctx.fillStyle = pal.EYE_IRIS;
      ctx.beginPath();
      ctx.arc(eyeX + eyeGazeOffsetX, eyeY + eyeGazeOffsetY, eyeR * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // Deep dark pupil
      ctx.fillStyle = pal.EYE_PUPIL;
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
      ctx.fillStyle = pal.EYEBROWS;
      ctx.beginPath();
      ctx.ellipse(headCenterX - headW * 0.32, headCenterY - headH * 0.62, headW * 0.22, headH * 0.12, -0.15, 0, Math.PI * 2);
      ctx.ellipse(headCenterX + headW * 0.32, headCenterY - headH * 0.62, headW * 0.22, headH * 0.12, 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Tip of cream snout and button nose just peeking slightly over the top horizon
      ctx.fillStyle = pal.SNOUT;
      ctx.beginPath();
      ctx.ellipse(headCenterX, headCenterY - headH * 0.72, headW * 0.24, headH * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = pal.NOSE;
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
    this.drawMistClouds(ctx, W, H, unitW, bgClouds, cameraX, cameraY, atmosphere.weather);

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

    // 2b. Caped Superhero (Flies across screen at Level 15)
    if (atmosphere.superhero) {
      this.drawCapedSuperhero(ctx, W, H, unitW, atmosphere.superhero, cameraX, cameraY, time);
    }

    // 3. Soaring Hawks / Birds (large, foreground)
    if (atmosphere.soaringBirds && atmosphere.soaringBirds.length > 0) {
      this.drawSoaringBirds(ctx, W, H, unitW, atmosphere.soaringBirds, cameraX, cameraY, time);
    }

    // 4. Large, Opaque Clouds (visibly blocks the view of the raccoon and windows)
    if (atmosphere.mistClouds && atmosphere.mistClouds.length > 0) {
      this.drawMistClouds(ctx, W, H, unitW, atmosphere.mistClouds, cameraX, cameraY, atmosphere.weather);
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
    const isCrawlingSill = sq.state === 'crawling_sill' || sq.facing === 'left' || sq.facing === 'right';

    ctx.save();
    ctx.translate(sx, sy);

    if (isCrawlingSill) {
      // Crawling on window sills:
      // Uses the side profile scurrying body animation, mirrored left/right based on crawl direction
      const isFacingLeft = sq.facing === 'left';
      if (isFacingLeft) {
        ctx.scale(-1, 1);
      }
      this.drawSquirrelSideProfile(ctx, size, sq, time);
    } else {
      // Climbing on building brick wall columns:
      // Similar to the raccoon's top-down/dorsal climbing body animations with 4 splayed paws,
      // EXCEPT squirrels' bodies aim upside down when climbing downward!
      const isClimbingDown = sq.facing === 'down';
      if (isClimbingDown) {
        ctx.scale(1, -1); // Turn entire body upside down (head down, front paws reaching down)
      }
      this.drawSquirrelDorsalClimbing(ctx, size, sq, time, isClimbingDown);
    }

    ctx.restore();
  }

  /**
   * Squirrel crawling along window sill ledges in side profile (mirrored left/right based on crawl direction)
   */
  private drawSquirrelSideProfile(
    ctx: CanvasRenderingContext2D,
    size: number,
    sq: ClimbingSquirrel,
    time: number
  ) {
    const pawPhase = (sq.climbPhase * Math.PI * 4) % (Math.PI * 2);
    const crawlOffset = Math.sin(pawPhase) * (size * 0.12);

    // 1. Bushy Tail (S-curve trailing behind the body with dynamic twitch & sway)
    const tailSway = sq.tailAngle + Math.sin(time * 6 + sq.id) * 0.22;
    ctx.save();
    ctx.translate(-size * 0.35, -size * 0.08);
    ctx.rotate(-0.25 + tailSway);

    // Outer fluff
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-size * 0.5, -size * 0.5, -size * 0.9, -size * 1.0, -size * 0.2, -size * 1.3);
    ctx.bezierCurveTo(size * 0.2, -size * 1.4, size * 0.5, -size * 0.9, 0, -size * 0.2);
    ctx.closePath();
    ctx.fill();

    // Inner highlight fluff
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-size * 0.35, -size * 0.35, -size * 0.65, -size * 0.8, -size * 0.15, -size * 1.0);
    ctx.bezierCurveTo(size * 0.1, -size * 1.1, size * 0.35, -size * 0.7, 0, -size * 0.18);
    ctx.closePath();
    ctx.fill();

    // White fluffy tail tip
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(-size * 0.2, -size * 1.25, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Far Hind Leg (crawling on sill)
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.ellipse(-size * 0.18 - crawlOffset * 0.5, size * 0.18, size * 0.18, size * 0.10, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Squirrel Body (warm russet fur positioned horizontally along sill)
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.45, size * 0.26, -0.05, 0, Math.PI * 2);
    ctx.fill();

    // Pale Cream Belly patch
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.08, size * 0.32, size * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Near Hind Leg & Claws
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.ellipse(-size * 0.16 + crawlOffset * 0.5, size * 0.16, size * 0.20, size * 0.11, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(-size * 0.08 + crawlOffset * 0.5, size * 0.22, size * 0.035, 0, Math.PI * 2);
    ctx.arc(-size * 0.04 + crawlOffset * 0.5, size * 0.22, size * 0.035, 0, Math.PI * 2);
    ctx.fill();

    // 5. Front Paws reaching along sill
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.ellipse(size * 0.24 - crawlOffset * 0.5, size * 0.18, size * 0.15, size * 0.09, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(size * 0.32 - crawlOffset * 0.5, size * 0.22, size * 0.035, 0, Math.PI * 2);
    ctx.fill();

    // 6. Head in Profile (pointing in travel direction)
    const headX = size * 0.38;
    const headY = -size * 0.08;
    ctx.save();
    ctx.translate(headX, headY);

    // Perked Ears
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.ellipse(-size * 0.04, -size * 0.22, size * 0.08, size * 0.14, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.ellipse(-size * 0.04, -size * 0.21, size * 0.04, size * 0.09, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Head oval
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.24, size * 0.20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cheek fluff
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.ellipse(size * 0.06, size * 0.06, size * 0.12, size * 0.10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(size * 0.20, size * 0.02, size * 0.045, 0, Math.PI * 2);
    ctx.fill();

    // Shiny eye
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(size * 0.05, -size * 0.05, size * 0.055, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(size * 0.07, -size * 0.07, size * 0.022, 0, Math.PI * 2);
    ctx.fill();

    // Whiskers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size * 0.18, size * 0.02);
    ctx.lineTo(size * 0.34, -size * 0.03);
    ctx.moveTo(size * 0.18, size * 0.04);
    ctx.lineTo(size * 0.36, size * 0.06);
    ctx.stroke();

    // Acorn (if held)
    if (sq.acorn) {
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.ellipse(size * 0.14, size * 0.16, size * 0.07, size * 0.09, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(size * 0.11, size * 0.11, size * 0.07, size * 0.04, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // restore head
  }

  /**
   * Squirrel climbing brick wall columns in top-down/dorsal view (similar to raccoon's climbing posture),
   * with 4 splayed paws gripping the wall, and aiming upside down when climbing downward.
   */
  private drawSquirrelDorsalClimbing(
    ctx: CanvasRenderingContext2D,
    size: number,
    sq: ClimbingSquirrel,
    time: number,
    isClimbingDown: boolean
  ) {
    // Paw cycle phase (alternating left/right strides)
    const phase = sq.climbPhase % 1.0;
    const strideFL = Math.sin(phase * Math.PI * 2);
    const strideFR = -strideFL;
    const strideRL = -strideFL;
    const strideRR = strideFL;

    const reachLen = size * 0.18;
    const reachSpread = size * 0.32;

    // 1. Bushy Squirrel Tail (anchored at rear of body, arching and swaying)
    const tailSway = sq.tailAngle + Math.sin(time * 6 + sq.id) * 0.28;
    ctx.save();
    ctx.translate(0, size * 0.36);
    ctx.rotate(tailSway);

    // Fluffy arched tail
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-size * 0.3, size * 0.4, -size * 0.45, size * 0.9, -size * 0.1, size * 1.25);
    ctx.bezierCurveTo(size * 0.2, size * 1.35, size * 0.4, size * 0.8, 0, size * 0.2);
    ctx.closePath();
    ctx.fill();

    // Tail center highlight
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-size * 0.2, size * 0.35, -size * 0.3, size * 0.75, -size * 0.05, size * 0.95);
    ctx.bezierCurveTo(size * 0.15, size * 1.05, size * 0.25, size * 0.65, 0, size * 0.15);
    ctx.closePath();
    ctx.fill();

    // White fluffy tail tip
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(-size * 0.08, size * 1.20, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Splayed Agile Paws Gripping the Brick Column
    const drawPaw = (ox: number, oy: number, reachY: number) => {
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.ellipse(ox, oy + reachY, size * 0.11, size * 0.09, ox < 0 ? -0.3 : 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Sharp climbing claws
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(ox + (ox < 0 ? -3 : 3), oy + reachY - 3, size * 0.03, 0, Math.PI * 2);
      ctx.arc(ox, oy + reachY - 4, size * 0.03, 0, Math.PI * 2);
      ctx.fill();
    };

    // Rear paws
    drawPaw(-reachSpread * 0.9, size * 0.22, strideRL * reachLen * 0.6);
    drawPaw(reachSpread * 0.9, size * 0.22, strideRR * reachLen * 0.6);

    // Front paws (reaching up / forward to grip brick wall)
    drawPaw(-reachSpread * 0.95, -size * 0.32, strideFL * reachLen);
    drawPaw(reachSpread * 0.95, -size * 0.32, strideFR * reachLen);

    // 3. Symmetrical Furry Body
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.30, size * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cream Dorsal-side soft highlight
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.04, size * 0.18, size * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Head with Symmetrical Perked Ears, Eyes & Snout
    const headY = -size * 0.42;
    ctx.save();
    ctx.translate(0, headY);

    // Left and Right Perked Pointy Ears
    [-size * 0.16, size * 0.16].forEach((ex) => {
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.ellipse(ex, -size * 0.14, size * 0.07, size * 0.12, ex < 0 ? -0.25 : 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.ellipse(ex, -size * 0.13, size * 0.04, size * 0.08, ex < 0 ? -0.25 : 0.25, 0, Math.PI * 2);
      ctx.fill();
    });

    // Head base
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.24, size * 0.20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(0, -size * 0.12, size * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Cute Shiny Dark Eyes on either side of head
    [-size * 0.11, size * 0.11].forEach((eyeX) => {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(eyeX, -size * 0.04, size * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeX + (eyeX < 0 ? -1 : 1), -size * 0.055, size * 0.02, 0, Math.PI * 2);
      ctx.fill();
    });

    // Whiskers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-size * 0.06, -size * 0.10);
    ctx.lineTo(-size * 0.26, -size * 0.14);
    ctx.moveTo(-size * 0.06, -size * 0.08);
    ctx.lineTo(-size * 0.28, -size * 0.06);
    ctx.moveTo(size * 0.06, -size * 0.10);
    ctx.lineTo(size * 0.26, -size * 0.14);
    ctx.moveTo(size * 0.06, -size * 0.08);
    ctx.lineTo(size * 0.28, -size * 0.06);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw atmospheric dusk bats swooping and fluttering near Floors 3 and 4
   */
  private drawAtmosphericBats(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    bats: AtmosphericBat[],
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    if (!bats || bats.length === 0) return;
    const unitW = this.getUnitW(W, H);

    bats.forEach((bat) => {
      const sx = this.worldToScreenX(bat.x, cameraX, W, H);
      const sy = this.worldToScreenY(bat.y, cameraY, H);

      // Viewport culling with margin
      if (sx < -unitW * 0.2 || sx > W + unitW * 0.2 || sy < -H * 0.2 || sy > H * 1.2) {
        return;
      }

      this.drawSingleBat(ctx, sx, sy, unitW, H, bat, time);
    });
  }

  /**
   * Draw single detailed dusk bat with leathery scalloped wings, pointed ears, amber eyes and fangs
   */
  private drawSingleBat(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    unitW: number,
    H: number,
    bat: AtmosphericBat,
    time: number
  ) {
    const size = Math.max(18, unitW * 0.034 * (bat.scale || 1.0));
    const flap = Math.sin(bat.wingPhase); // -1 (up) to +1 (down)

    ctx.save();
    ctx.translate(sx, sy);
    if (bat.facing === 'left') {
      ctx.scale(-1, 1);
    }

    // Dynamic flight tilt based on swooping motion
    const tilt = Math.sin(bat.swoopPhase) * 0.16 + (bat.vy || 0) * 0.5;
    ctx.rotate(tilt);

    // 1. Leathery Scalloped Bat Wings
    const wingFlapAngle = flap * 0.55;

    // Left Wing (back wing in isometric perspective)
    ctx.save();
    ctx.translate(-size * 0.12, -size * 0.05);
    ctx.rotate(-wingFlapAngle * 0.9 - 0.1);
    this.drawBatWing(ctx, size, -1, flap);
    ctx.restore();

    // Right Wing (front wing)
    ctx.save();
    ctx.translate(size * 0.12, -size * 0.05);
    ctx.rotate(wingFlapAngle + 0.1);
    this.drawBatWing(ctx, size, 1, flap);
    ctx.restore();

    // 2. Bat Body (Velvety dark charcoal/plum fur)
    ctx.fillStyle = '#1e1b4b'; // Deep midnight indigo
    ctx.beginPath();
    ctx.ellipse(0, size * 0.1, size * 0.22, size * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly soft highlight
    ctx.fillStyle = '#312e81';
    ctx.beginPath();
    ctx.ellipse(size * 0.03, size * 0.12, size * 0.13, size * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tiny clawed feet tucked beneath
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-size * 0.08, size * 0.42, size * 0.045, 0, Math.PI * 2);
    ctx.arc(size * 0.08, size * 0.42, size * 0.045, 0, Math.PI * 2);
    ctx.fill();

    // 3. Bat Head
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.22, size * 0.24, size * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pointed Bat Ears
    // Left ear
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(-size * 0.18, -size * 0.25);
    ctx.lineTo(-size * 0.26, -size * 0.62);
    ctx.lineTo(-size * 0.06, -size * 0.35);
    ctx.closePath();
    ctx.fill();

    // Left ear inner pink/violet
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.moveTo(-size * 0.17, -size * 0.28);
    ctx.lineTo(-size * 0.23, -size * 0.54);
    ctx.lineTo(-size * 0.08, -size * 0.35);
    ctx.closePath();
    ctx.fill();

    // Right ear
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(size * 0.06, -size * 0.35);
    ctx.lineTo(size * 0.26, -size * 0.62);
    ctx.lineTo(size * 0.18, -size * 0.25);
    ctx.closePath();
    ctx.fill();

    // Right ear inner pink/violet
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.moveTo(size * 0.08, -size * 0.35);
    ctx.lineTo(size * 0.23, -size * 0.54);
    ctx.lineTo(size * 0.17, -size * 0.28);
    ctx.closePath();
    ctx.fill();

    // Cute Pug-like Bat Snout
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(size * 0.02, -size * 0.16, size * 0.09, size * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Amber Eyes
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(-size * 0.08, -size * 0.25, size * 0.055, 0, Math.PI * 2);
    ctx.arc(size * 0.12, -size * 0.25, size * 0.055, 0, Math.PI * 2);
    ctx.fill();

    // Eye catchlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-size * 0.07, -size * 0.27, size * 0.022, 0, Math.PI * 2);
    ctx.arc(size * 0.13, -size * 0.27, size * 0.022, 0, Math.PI * 2);
    ctx.fill();

    // Tiny white vampire fangs
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-size * 0.04, -size * 0.12);
    ctx.lineTo(-size * 0.02, -size * 0.04);
    ctx.lineTo(0, -size * 0.12);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(size * 0.04, -size * 0.12);
    ctx.lineTo(size * 0.06, -size * 0.04);
    ctx.lineTo(size * 0.08, -size * 0.12);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * Helper to draw a single articulated scalloped bat wing
   */
  private drawBatWing(ctx: CanvasRenderingContext2D, size: number, side: 1 | -1, flap: number) {
    const dir = side;
    const span = size * 1.55;
    const drop = size * 0.85;

    // Wing membrane
    ctx.fillStyle = '#312e81';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(dir * span * 0.5, -size * 0.38 - flap * size * 0.15);
    ctx.lineTo(dir * span, -size * 0.25 - flap * size * 0.2);

    // Scalloped trailing edge
    ctx.quadraticCurveTo(dir * span * 0.78, drop * 0.2, dir * span * 0.65, drop * 0.45);
    ctx.quadraticCurveTo(dir * span * 0.45, drop * 0.25, dir * span * 0.32, drop * 0.5);
    ctx.quadraticCurveTo(dir * span * 0.15, drop * 0.2, 0, size * 0.2);
    ctx.closePath();
    ctx.fill();

    // Bone struts / fingers
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = Math.max(1.2, size * 0.04);
    ctx.beginPath();
    // Arm bone to elbow to tip
    ctx.moveTo(0, 0);
    ctx.lineTo(dir * span * 0.5, -size * 0.38 - flap * size * 0.15);
    ctx.lineTo(dir * span, -size * 0.25 - flap * size * 0.2);
    // Finger 2
    ctx.moveTo(dir * span * 0.5, -size * 0.38 - flap * size * 0.15);
    ctx.lineTo(dir * span * 0.65, drop * 0.45);
    // Finger 3
    ctx.moveTo(dir * span * 0.5, -size * 0.38 - flap * size * 0.15);
    ctx.lineTo(dir * span * 0.32, drop * 0.5);
    ctx.stroke();

    // Tiny thumb claw at elbow
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(dir * span * 0.5, -size * 0.38 - flap * size * 0.15, size * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draw drifting mist clouds with soft translucent puffs.
   * Clouds are bright white in fair skies and progressively darken to gray/charcoal as storm intensifies.
   */
  private drawMistClouds(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    unitW: number,
    clouds: HighMistCloud[],
    cameraX: number,
    cameraY: number,
    weather?: import('./types').WeatherState
  ) {
    if (!clouds || clouds.length === 0) return;

    const stormDarkness = this.getStormDarkness(weather);
    const cloudColors = this.getCloudColors(stormDarkness);

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
      // Dynamic shading transitions from pristine white before rain into deep dark stormy charcoal
      const cloudGrad = ctx.createRadialGradient(cx, cy, ch * 0.1, cx, cy, cw * 0.5);
      cloudGrad.addColorStop(0, cloudColors.mist0);
      cloudGrad.addColorStop(0.55, cloudColors.mist1);
      cloudGrad.addColorStop(0.82, cloudColors.mist2);
      cloudGrad.addColorStop(1, cloudColors.mist3);

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

      // Scaled 1.5x to ~1.32 stories tall for prominent and majestic sky presence
      const storyH = H * GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO;
      const balloonH = storyH * 1.32 * (b.scale || 1.0);
      const balloonW = balloonH * 0.76;

      // Viewport culling
      if (bx + balloonW < -W * 0.6 || bx - balloonW > W * 1.6 || by + balloonH < -H * 1.5 || by - balloonH > H * 2.5) {
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
      const spacingX = unitW * 0.055 * flock.scale;
      const spacingY = H * 0.038 * flock.scale;

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

        const gooseScale = Math.max(14, unitW * 0.028 * flock.scale);
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
      const size = Math.max(20, unitW * 0.040 * bird.scale);

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
      glassGrad.addColorStop(0, GAME_CONFIG.PALETTE.WINDOW_BLUE_LIGHT);
      glassGrad.addColorStop(0.4, GAME_CONFIG.PALETTE.WINDOW_VIBRANT_BLUE);
      glassGrad.addColorStop(1, GAME_CONFIG.PALETTE.WINDOW_BLUE_DEEP);
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

    const laundryFloorNum = GAME_CONFIG.INTERACTIVE_ELEMENTS.LAUNDRY_LINE.FLOOR; // Floor 9
    const fLaundryFloor = floors ? floors.find((f) => f.floorNumber === laundryFloorNum) : undefined;
    const fLaundryWorldY = fLaundryFloor && fLaundryFloor.windows[2] ? fLaundryFloor.windows[2].sillY : ((laundryFloorNum - 1) * FLOOR_HEIGHT_RATIO + 0.18);
    const lineStartX = fLaundryFloor && fLaundryFloor.windows[2] ? fLaundryFloor.windows[2].worldLeft : (bLeft + gap + (WINDOW_WIDTH_RATIO + gap) * 2);
    const lineEndX = fLaundryFloor && fLaundryFloor.windows[4] ? fLaundryFloor.windows[4].worldRight : (bLeft + gap + (WINDOW_WIDTH_RATIO + gap) * 4 + WINDOW_WIDTH_RATIO);

    const startScreenX = this.worldToScreenX(lineStartX, cameraX, W, H);
    const endScreenX = this.worldToScreenX(lineEndX, cameraX, W, H);
    const lineScreenY = this.worldToScreenY(fLaundryWorldY, cameraY, H);

    if (lineScreenY < -60 || lineScreenY > H + 60) return;

    ctx.save();

    // Taut steel clothesline wire
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const sag = laundryLine.hasDropped ? 18 : 6;
    const midX = (startScreenX + endScreenX) * 0.5;
    ctx.moveTo(startScreenX, lineScreenY);
    ctx.quadraticCurveTo(midX, lineScreenY + sag, endScreenX, lineScreenY);
    ctx.stroke();

    // Wall eyelets
    ctx.fillStyle = '#475569';
    ctx.fillRect(startScreenX - 5, lineScreenY - 5, 10, 10);
    ctx.fillRect(endScreenX - 5, lineScreenY - 5, 10, 10);

    // Draw each cloth item that hasn't been individually knocked off yet
    // Scaled up to realistic human garment proportions relative to skyscraper windows
    for (const item of laundryLine.clothes) {
      if (item.dropped) continue;
      const itemX = startScreenX + (endScreenX - startScreenX) * item.offsetRatio;
      const itemY = lineScreenY + sag * 0.8;

      // Realistic wooden clothespins with metallic spring
      ctx.fillStyle = '#b45309';
      ctx.fillRect(itemX - 10, itemY - 6, 4, 11);
      ctx.fillRect(itemX + 6, itemY - 6, 4, 11);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(itemX - 10, itemY - 2, 4, 2);
      ctx.fillRect(itemX + 6, itemY - 2, 4, 2);

      ctx.fillStyle = item.color;
      if (item.type === 'shirt') {
        // T-Shirt shape (enlarged realistic proportions)
        ctx.beginPath();
        ctx.moveTo(itemX - 18, itemY + 3);
        ctx.lineTo(itemX - 8, itemY + 1);
        ctx.quadraticCurveTo(itemX, itemY + 5, itemX + 8, itemY + 1);
        ctx.lineTo(itemX + 18, itemY + 3);
        ctx.lineTo(itemX + 22, itemY + 14);
        ctx.lineTo(itemX + 14, itemY + 16);
        ctx.lineTo(itemX + 14, itemY + 38);
        ctx.lineTo(itemX - 14, itemY + 38);
        ctx.lineTo(itemX - 14, itemY + 16);
        ctx.lineTo(itemX - 22, itemY + 14);
        ctx.closePath();
        ctx.fill();

        // Collar accent
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (item.type === 'pants') {
        // Jeans / Trousers
        ctx.beginPath();
        ctx.roundRect(itemX - 13, itemY + 3, 26, 42, 2);
        ctx.fill();
        // Crotch split
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(itemX - 1.5, itemY + 18, 3, 27);
        // Beltline shading
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(itemX - 13, itemY + 3, 26, 4);
      } else if (item.type === 'sheet') {
        // Bed sheet / towel (prominent urban size)
        ctx.fillRect(itemX - 24, itemY + 3, 48, 46);
        // Hem and fold shadows
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.fillRect(itemX - 22, itemY + 16, 44, 3);
        ctx.fillRect(itemX - 22, itemY + 32, 44, 3);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(itemX - 24, itemY + 3, 48, 46);
      } else {
        // Pair of Tube Socks
        ctx.beginPath();
        ctx.roundRect(itemX - 9, itemY + 3, 8, 22, [1, 1, 4, 4]);
        ctx.roundRect(itemX + 1, itemY + 3, 8, 22, [1, 1, 4, 4]);
        ctx.fill();
        // Sock stripes
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillRect(itemX - 9, itemY + 7, 8, 3);
        ctx.fillRect(itemX + 1, itemY + 7, 8, 3);
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
      if (sy < -60 || sy > H + 60) return;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(item.rotation);

      ctx.fillStyle = item.color;
      if (item.type === 'shirt') {
        ctx.fillRect(-16, -18, 32, 36);
      } else if (item.type === 'pants') {
        ctx.fillRect(-12, -20, 24, 40);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(-1.5, -4, 3, 24);
      } else if (item.type === 'sheet') {
        ctx.fillRect(-22, -22, 44, 44);
      } else {
        ctx.fillRect(-6, -11, 12, 22);
      }

      ctx.restore();
    });
  }

  /**
   * Tarzan swinging vine on Floor 8
   * Connects Window 0 sill to Window 4 sill, pivoting from Floor 8 Window 2 top anchor
   */
  private drawTarzanVine(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const unitW = this.getUnitW(W, H);
    const { TARZAN_VINE } = GAME_CONFIG.INTERACTIVE_ELEMENTS;
    const { FLOOR_HEIGHT_RATIO, WINDOW_WIDTH_RATIO, WINDOWS_PER_FLOOR, BUILDING_WIDTH_RATIO, BUILDING_CENTER_X } = GAME_CONFIG.SKYSCRAPER;

    const bLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
    const totalWinsW = WINDOWS_PER_FLOOR * WINDOW_WIDTH_RATIO;
    const gap = (BUILDING_WIDTH_RATIO - totalWinsW) / (WINDOWS_PER_FLOOR + 1);

    // Floor 8 Window 0 sill
    const f8WorldY = (TARZAN_VINE.FLOOR - 1) * FLOOR_HEIGHT_RATIO + 0.18;
    const win0X = bLeft + gap + WINDOW_WIDTH_RATIO * 0.5;
    // Window 2 anchor (top cornice / masonry hook above window 2)
    const win2X = bLeft + gap + (WINDOW_WIDTH_RATIO + gap) * 2 + WINDOW_WIDTH_RATIO * 0.5;
    const anchorY = f8WorldY + 0.32;
    // Window 4 sill
    const win4X = bLeft + gap + (WINDOW_WIDTH_RATIO + gap) * 4 + WINDOW_WIDTH_RATIO * 0.5;

    const anchorScreenX = this.worldToScreenX(win2X, cameraX, W, H);
    const anchorScreenY = this.worldToScreenY(anchorY, cameraY, H);
    const win0ScreenX = this.worldToScreenX(win0X, cameraX, W, H);
    const win0ScreenY = this.worldToScreenY(f8WorldY, cameraY, H);
    const win4ScreenX = this.worldToScreenX(win4X, cameraX, W, H);
    const win4ScreenY = this.worldToScreenY(f8WorldY, cameraY, H);

    if (anchorScreenY > H + 100 || win0ScreenY < -100) return;

    ctx.save();

    // 1. Heavy wrought-iron wall anchor bracket at Window 2
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(anchorScreenX, anchorScreenY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#475569';
    ctx.fillRect(anchorScreenX - 8, anchorScreenY - 4, 16, 8);

    // 2. Thick jungle vine swinging cable
    const sway = Math.sin(time * 2) * 5;
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = Math.max(3, unitW * 0.007);
    ctx.beginPath();
    ctx.moveTo(anchorScreenX, anchorScreenY);
    ctx.quadraticCurveTo(win0ScreenX + 15 + sway, (anchorScreenY + win0ScreenY) * 0.5, win0ScreenX, win0ScreenY);
    ctx.stroke();

    // Vine inner fibrous highlight
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = Math.max(1.5, unitW * 0.0035);
    ctx.beginPath();
    ctx.moveTo(anchorScreenX, anchorScreenY);
    ctx.quadraticCurveTo(win0ScreenX + 15 + sway, (anchorScreenY + win0ScreenY) * 0.5, win0ScreenX, win0ScreenY);
    ctx.stroke();

    // Leaves clinging to the vine
    for (let l = 1; l <= 6; l++) {
      const p = l / 7;
      const lx = anchorScreenX + (win0ScreenX - anchorScreenX) * p + Math.sin(l + time) * 3;
      const ly = anchorScreenY + (win0ScreenY - anchorScreenY) * p;
      ctx.fillStyle = l % 2 === 0 ? '#16a34a' : '#22c55e';
      ctx.beginPath();
      ctx.ellipse(lx, ly, 6, 3, l * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Knotted wooden grip / loop at Window 0 sill
    ctx.fillStyle = '#854d0e';
    ctx.beginPath();
    ctx.arc(win0ScreenX, win0ScreenY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Interactive helper badge on window sill
    ctx.fillStyle = '#15803d';
    ctx.fillRect(win0ScreenX - 38, win0ScreenY - 26, 76, 16);
    ctx.strokeStyle = '#86efac';
    ctx.lineWidth = 1;
    ctx.strokeRect(win0ScreenX - 38, win0ScreenY - 26, 76, 16);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TARZAN VINE 🌿 [↓]', win0ScreenX, win0ScreenY - 15);

    // Target landing pad marker at Window 4
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(win4ScreenX, win4ScreenY, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  /**
   * Star Trek Teleport connecting Floor 12 Window 3 and Floor 16 Window 3
   */
  private drawTeleportPads(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const unitW = this.getUnitW(W, H);
    const { TELEPORT } = GAME_CONFIG.INTERACTIVE_ELEMENTS;
    const { FLOOR_HEIGHT_RATIO, WINDOW_WIDTH_RATIO, WINDOWS_PER_FLOOR, BUILDING_WIDTH_RATIO, BUILDING_CENTER_X } = GAME_CONFIG.SKYSCRAPER;

    const bLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
    const totalWinsW = WINDOWS_PER_FLOOR * WINDOW_WIDTH_RATIO;
    const gap = (BUILDING_WIDTH_RATIO - totalWinsW) / (WINDOWS_PER_FLOOR + 1);

    const padFloors = [
      { floor: TELEPORT.START_FLOOR, winIdx: TELEPORT.START_WIN_INDEX, label: 'TELEPORT ➔ F16' },
      { floor: TELEPORT.END_FLOOR, winIdx: TELEPORT.END_WIN_INDEX, label: 'TELEPORT ➔ F12' },
    ];

    padFloors.forEach(({ floor, winIdx, label }) => {
      const fWorldY = (floor - 1) * FLOOR_HEIGHT_RATIO + 0.18;
      const winX = bLeft + gap + (WINDOW_WIDTH_RATIO + gap) * winIdx + WINDOW_WIDTH_RATIO * 0.5;

      const screenX = this.worldToScreenX(winX, cameraX, W, H);
      const screenY = this.worldToScreenY(fWorldY, cameraY, H);

      if (screenY < -60 || screenY > H + 60) return;

      ctx.save();

      // Transporter platform metallic ring
      const padW = unitW * 0.055;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(screenX, screenY + 2, padW, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glowing outer energetic rim
      const pulse = 0.5 + 0.5 * Math.sin(time * 4);
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.7 + 0.3 * pulse})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Shimmering vertical transporter beam column
      const beamGrad = ctx.createLinearGradient(screenX, screenY - 45, screenX, screenY);
      beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      beamGrad.addColorStop(0.5, `rgba(56, 189, 248, ${0.15 + 0.15 * pulse})`);
      beamGrad.addColorStop(1, `rgba(186, 230, 253, ${0.4 + 0.2 * pulse})`);
      ctx.fillStyle = beamGrad;
      ctx.fillRect(screenX - padW * 0.8, screenY - 45, padW * 1.6, 45);

      // Vertical energy sparkles
      for (let s = 0; s < 4; s++) {
        const sparkOffset = ((time * 1.5 + s * 0.25) % 1.0) * 45;
        const sparkX = screenX - padW * 0.6 + ((s * 7) % (padW * 1.2));
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(sparkX, screenY - sparkOffset, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Starfleet transporter delta symbol & prompt badge
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(screenX - 42, screenY - 58, 84, 15);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX - 42, screenY - 58, 84, 15);

      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${label} 🖖 [↓]`, screenX, screenY - 47);

      ctx.restore();
    });
  }

  /**
   * Eagle nest on Floor 17 between Windows 1 & 2
   */
  private drawEagleNest(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const { EAGLE_NEST } = GAME_CONFIG.INTERACTIVE_ELEMENTS;
    const { FLOOR_HEIGHT_RATIO, WINDOW_WIDTH_RATIO, WINDOWS_PER_FLOOR, BUILDING_WIDTH_RATIO, BUILDING_CENTER_X } = GAME_CONFIG.SKYSCRAPER;

    const bLeft = BUILDING_CENTER_X - BUILDING_WIDTH_RATIO / 2;
    const totalWinsW = WINDOWS_PER_FLOOR * WINDOW_WIDTH_RATIO;
    const gap = (BUILDING_WIDTH_RATIO - totalWinsW) / (WINDOWS_PER_FLOOR + 1);

    const nestWorldX = bLeft + gap + (WINDOW_WIDTH_RATIO + gap) * EAGLE_NEST.WIN_GAP_INDEX + WINDOW_WIDTH_RATIO + gap * 0.5;
    const nestWorldY = (EAGLE_NEST.FLOOR - 1) * FLOOR_HEIGHT_RATIO + 0.22;

    const screenX = this.worldToScreenX(nestWorldX, cameraX, W, H);
    const screenY = this.worldToScreenY(nestWorldY, cameraY, H);

    if (screenY < -70 || screenY > H + 70) return;

    ctx.save();

    // 1. Heavy stone architectural cornice ledge supporting nest
    ctx.fillStyle = '#475569';
    ctx.fillRect(screenX - 28, screenY + 8, 56, 8);
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(screenX - 24, screenY + 16);
    ctx.lineTo(screenX + 24, screenY + 16);
    ctx.lineTo(screenX, screenY + 32);
    ctx.closePath();
    ctx.fill();

    // 2. Interlocking rustic twigs and branches
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + 2, 32, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Individual stick strokes
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2.5;
    for (let t = 0; t < 12; t++) {
      const ang = (t / 12) * Math.PI * 2;
      const r = 24 + (t % 4) * 4;
      ctx.beginPath();
      ctx.moveTo(screenX + Math.cos(ang) * (r - 12), screenY + Math.sin(ang) * 8);
      ctx.lineTo(screenX + Math.cos(ang) * r, screenY + Math.sin(ang) * 12);
      ctx.stroke();
    }

    // 3. Two speckled eagle eggs tucked inside
    [-6, 6].forEach((ex) => {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(screenX + ex, screenY + 2, 5, 7, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(screenX + ex - 1, screenY + 1, 2, 2);
    });

    // 4. Majestic Bald Eagle perched atop the nest
    const breathe = Math.sin(time * 3) * 1.5;
    const eagleY = screenY - 14 + breathe;

    // Chocolate brown body
    ctx.fillStyle = '#382215';
    ctx.beginPath();
    ctx.ellipse(screenX, eagleY + 8, 14, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Folded wing feathers
    ctx.fillStyle = '#26150b';
    ctx.beginPath();
    ctx.ellipse(screenX - 10, eagleY + 8, 6, 14, -0.2, 0, Math.PI * 2);
    ctx.ellipse(screenX + 10, eagleY + 8, 6, 14, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // White feathered head & crown
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(screenX, eagleY - 6, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Yellow curved beak
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.moveTo(screenX + 6, eagleY - 6);
    ctx.lineTo(screenX + 16, eagleY - 3);
    ctx.lineTo(screenX + 6, eagleY);
    ctx.closePath();
    ctx.fill();

    // Keen eagle eye
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.arc(screenX + 4, eagleY - 7, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(screenX + 5, eagleY - 7, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Nest name label
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(screenX - 30, screenY - 32, 60, 13);
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EAGLE NEST 🦅', screenX, screenY - 23);

    ctx.restore();
  }

  /**
   * Navigation Barriers preventing straight vertical climbing without switching columns
   */
  private drawNavigationBarriers(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    barriers: NavigationBarrier[],
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    barriers.forEach((barrier) => {
      const screenX1 = this.worldToScreenX(barrier.leftX, cameraX, W, H);
      const screenX2 = this.worldToScreenX(barrier.rightX, cameraX, W, H);
      const screenYTop = this.worldToScreenY(barrier.worldY + barrier.height, cameraY, H);
      const screenYBottom = this.worldToScreenY(barrier.worldY, cameraY, H);

      const bW = Math.abs(screenX2 - screenX1);
      const bH = Math.abs(screenYBottom - screenYTop);
      const bX = Math.min(screenX1, screenX2);
      const bY = Math.min(screenYTop, screenYBottom);
      const midX = bX + bW * 0.5;

      if (bY + bH < -50 || bY > H + 50) return;

      ctx.save();

      if (barrier.type === 'scaffolding') {
        // Window washer staging
        // Steel suspension ropes up
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bX + 8, bY);
        ctx.lineTo(bX + 8, bY - 80);
        ctx.moveTo(bX + bW - 8, bY);
        ctx.lineTo(bX + bW - 8, bY - 80);
        ctx.stroke();

        // Platform base
        ctx.fillStyle = '#334155';
        ctx.fillRect(bX, bY + bH - 6, bW, 6);

        // Yellow-black warning stripe toe-board
        ctx.fillStyle = '#eab308';
        ctx.fillRect(bX, bY + bH - 12, bW, 6);
        ctx.fillStyle = '#0f172a';
        for (let s = 0; s < bW; s += 14) {
          ctx.beginPath();
          ctx.moveTo(bX + s, bY + bH - 6);
          ctx.lineTo(bX + s + 6, bY + bH - 6);
          ctx.lineTo(bX + s + 10, bY + bH - 12);
          ctx.lineTo(bX + s + 4, bY + bH - 12);
          ctx.closePath();
          ctx.fill();
        }

        // Aluminum handrails
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.strokeRect(bX, bY + 4, bW, bH - 16);

        // Window cleaner figure
        const workerX = midX;
        const workerY = bY + bH - 16;
        // Orange safety vest
        ctx.fillStyle = '#f97316';
        ctx.fillRect(workerX - 5, workerY - 14, 10, 14);
        // Yellow hard hat
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.ellipse(workerX, workerY - 16, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Squeegee & bucket
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(workerX + 8, workerY - 6, 6, 6);
        ctx.strokeStyle = '#38bdf8';
        ctx.strokeRect(workerX - 10, workerY - 14, 2, 10);

        // Barrier sign
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(midX - 35, bY - 12, 70, 12);
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(barrier.label || 'WINDOW CLEANER', midX, bY - 3);

      } else if (barrier.type === 'banner_never_give_up' || barrier.type === 'banner_you_can_do_it') {
        // Festive encouragement vinyl banner
        const wave = Math.sin(time * 3 + barrier.floor) * 3;
        const bannerColor = barrier.type === 'banner_never_give_up' ? '#991b1b' : '#0369a1';
        const bannerBorder = barrier.type === 'banner_never_give_up' ? '#f59e0b' : '#38bdf8';

        // Corner tie-off ropes
        ctx.strokeStyle = '#78716c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bX, bY + 6);
        ctx.lineTo(bX - 8, bY - 4);
        ctx.moveTo(bX + bW, bY + 6);
        ctx.lineTo(bX + bW + 8, bY - 4);
        ctx.stroke();

        // Banner fabric
        ctx.fillStyle = bannerColor;
        ctx.fillRect(bX, bY + 4 + wave, bW, bH - 8);
        ctx.strokeStyle = bannerBorder;
        ctx.lineWidth = 2;
        ctx.strokeRect(bX, bY + 4 + wave, bW, bH - 8);

        // Gold grommets in corners
        ctx.fillStyle = '#fbbf24';
        [bX + 4, bX + bW - 4].forEach((gx) => {
          ctx.beginPath();
          ctx.arc(gx, bY + 8 + wave, 2.5, 0, Math.PI * 2);
          ctx.arc(gx, bY + bH - 8 + wave, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });

        // Banner bold text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(barrier.label || '', midX, bY + bH * 0.58 + wave);

      } else if (barrier.type === 'full_width_mesh') {
        // Floor 13 full-width detour obstacle forcing player across to Column 6!
        // Heavy steel beam
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(bX, bY + 2, bW, bH - 4);

        // High-vis yellow warning face
        ctx.fillStyle = '#facc15';
        ctx.fillRect(bX + 2, bY + 4, bW - 4, bH - 8);

        // Black hazard chevrons pointing RIGHT
        ctx.fillStyle = '#0f172a';
        for (let s = 0; s < bW - 12; s += 24) {
          ctx.beginPath();
          ctx.moveTo(bX + s, bY + 4);
          ctx.lineTo(bX + s + 10, bY + bH * 0.5);
          ctx.lineTo(bX + s, bY + bH - 4);
          ctx.lineTo(bX + s + 6, bY + bH - 4);
          ctx.lineTo(bX + s + 16, bY + bH * 0.5);
          ctx.lineTo(bX + s + 6, bY + 4);
          ctx.closePath();
          ctx.fill();
        }

        // Flashing amber strobes
        const strobe = Math.sin(time * 8) > 0;
        ctx.fillStyle = strobe ? '#ef4444' : '#7f1d1d';
        ctx.beginPath();
        ctx.arc(bX + 8, bY + bH * 0.5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = strobe ? '#f59e0b' : '#78350f';
        ctx.beginPath();
        ctx.arc(bX + bW - 8, bY + bH * 0.5, 5, 0, Math.PI * 2);
        ctx.fill();

        // Warning Label
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(midX - 65, bY - 14, 130, 14);
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🚧 DETOUR RIGHT ➔ (COL 6)', midX, bY - 4);

      } else if (barrier.type === 'drone') {
        // Quadcopter drone actively moving left to right across its patrol zone
        const margin = 20;
        const travelWidth = Math.max(24, bW - margin * 2);
        const cyclePeriod = 4.2; // 4.2s smooth patrol cycle
        // Ping-pong travel: smooth progression starting from left, flying to right, then returning
        const patrolAngle = (time * (Math.PI * 2 / cyclePeriod)) - Math.PI / 2;
        const patrolT = (Math.sin(patrolAngle) + 1) * 0.5; // 0 (left) to 1 (right)
        const droneX = bX + margin + patrolT * travelWidth;
        const droneVx = Math.cos(patrolAngle);
        const bankTilt = droneVx * 0.14; // Banks realistically in direction of horizontal travel

        const bob = Math.sin(time * 6) * 3.5;
        const dY = bY + bH * 0.5 + bob;

        ctx.save();
        ctx.translate(droneX, dY);
        ctx.rotate(bankTilt);

        // Drone central pod
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        // 4 carbon-fiber rotor arms
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-16, -8);
        ctx.lineTo(16, 8);
        ctx.moveTo(16, -8);
        ctx.lineTo(-16, 8);
        ctx.stroke();

        // Spinning rotor disc blurs
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        [-16, 16].forEach((rx) => {
          ctx.beginPath();
          ctx.ellipse(rx, -8, 8, 2.5, 0, 0, Math.PI * 2);
          ctx.ellipse(rx, 8, 8, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
        });

        // Blinking Navigation LEDs
        const isBlink = Math.sin(time * 7) > 0;
        ctx.fillStyle = isBlink ? '#22c55e' : '#14532d'; // Green starboard navigation light
        ctx.beginPath();
        ctx.arc(16, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isBlink ? '#ef4444' : '#7f1d1d'; // Red port navigation light
        ctx.beginPath();
        ctx.arc(-16, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Central status LED
        ctx.fillStyle = Math.sin(time * 12) > 0 ? '#38bdf8' : '#0284c7';
        ctx.beginPath();
        ctx.arc(0, -4, 2, 0, Math.PI * 2);
        ctx.fill();

        // Gimbal camera lens with forward cone
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, 5.5, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

      } else {
        // Maintenance platform / other
        ctx.fillStyle = '#334155';
        ctx.fillRect(bX, bY, bW, bH);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(bX, bY, bW, bH);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(barrier.label || 'MAINTENANCE', midX, bY + bH * 0.6);
      }

      ctx.restore();
    });
  }

  /**
   * Rooftop Celebration Fireworks & Confetti
   */
  private drawCelebrationFireworks(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    fireworks: CelebrationFirework[],
    cameraX: number,
    cameraY: number,
    _time: number
  ) {
    ctx.save();
    fireworks.forEach((fw) => {
      const alpha = Math.max(0, fw.alpha * (1.0 - fw.age / fw.maxAge));
      ctx.globalAlpha = alpha;

      const sx = this.worldToScreenX(fw.x, cameraX, W, H);
      const sy = this.worldToScreenY(fw.y, cameraY, H);

      // Frustum culling
      if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) return;

      ctx.fillStyle = fw.color;

      // Draw confetti ribbons and star bursts
      const isRibbon = fw.id % 3 === 0;
      if (isRibbon) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(fw.age * 5 + fw.id);
        ctx.fillRect(-fw.size * 0.8, -fw.size * 0.4, fw.size * 1.6, fw.size * 0.8);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, fw.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sparkle glow star on larger particles
      if (fw.size > 2.5) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy);
        ctx.lineTo(sx + 4, sy);
        ctx.moveTo(sx, sy - 4);
        ctx.lineTo(sx, sy + 4);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  /**
   * Brief on-canvas celebration banner before the Win menu dialog appears
   */
  private drawRooftopCelebrationBanner(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    celebrationTimer: number,
    time: number
  ) {
    ctx.save();
    const progress = Math.min(1.0, celebrationTimer / 0.4);
    ctx.globalAlpha = progress;

    const bannerW = Math.min(W * 0.88, 380);
    const bannerH = H * 0.082;
    const bannerX = (W - bannerW) * 0.5;
    const bannerY = H * 0.038;

    // Golden celebratory gradient container
    const grad = ctx.createLinearGradient(bannerX, bannerY, bannerX + bannerW, bannerY + bannerH);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.92)');
    grad.addColorStop(0.5, 'rgba(30, 41, 59, 0.96)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.92)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 16);
    ctx.fill();

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(250, 204, 21, 0.7)';
    ctx.shadowBlur = 12;
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Pulsing headline
    const pulse = 1.0 + Math.sin(time * 6) * 0.04;
    ctx.save();
    ctx.translate(W * 0.5, bannerY + bannerH * 0.38);
    ctx.scale(pulse, pulse);

    ctx.fillStyle = '#fde047';
    ctx.font = `900 ${Math.floor(W * 0.042)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ ROOFTOP CONQUERED! ★', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(W * 0.026)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👑 Top Raccoon of the City! 👑', W * 0.5, bannerY + bannerH * 0.74);

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

  /**
   * Dial-shaped Speed Burst Meter drawn right above the raccoon's head when bursting
   */
  private drawSpeedBurstDial(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    raccoon: RaccoonPosition,
    cameraX: number,
    cameraY: number
  ) {
    const screenX = this.worldToScreenX(raccoon.x, cameraX, W, H);
    const screenY = this.worldToScreenY(raccoon.y, cameraY, H);
    const dialY = screenY - H * 0.082; // Positioned right above raccoon's head
    const maxDuration = GAME_CONFIG.RACCOON.SPEED_BURST.MAX_DURATION || 1.0;
    const currentTimer = raccoon.boostActiveTimer ?? 0;
    const progress = Math.max(0, Math.min(1, currentTimer / maxDuration));

    ctx.save();
    ctx.translate(screenX, dialY);

    const dialRadius = Math.max(16, W * 0.022);

    // Outer glow
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 12;

    // Dial background circle
    ctx.fillStyle = 'rgba(24, 24, 27, 0.90)';
    ctx.beginPath();
    ctx.arc(0, 0, dialRadius, 0, Math.PI * 2);
    ctx.fill();

    // Background track
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(63, 63, 70, 0.65)';
    ctx.lineWidth = Math.max(3, dialRadius * 0.22);
    ctx.beginPath();
    ctx.arc(0, 0, dialRadius * 0.72, 0, Math.PI * 2);
    ctx.stroke();

    // Radial dial tick marks
    for (let a = 0; a < 8; a++) {
      const ang = (a * Math.PI) / 4;
      ctx.strokeStyle = a % 2 === 0 ? '#94a3b8' : '#52525b';
      ctx.lineWidth = a % 2 === 0 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * dialRadius * 0.82, Math.sin(ang) * dialRadius * 0.82);
      ctx.lineTo(Math.cos(ang) * dialRadius * 0.95, Math.sin(ang) * dialRadius * 0.95);
      ctx.stroke();
    }

    // Active Dial Arc (Meter decreasing clockwise)
    const startAngle = -Math.PI * 0.5;
    const endAngle = startAngle + Math.PI * 2 * progress;

    const arcGrad = ctx.createLinearGradient(-dialRadius, -dialRadius, dialRadius, dialRadius);
    arcGrad.addColorStop(0, '#fde047');
    arcGrad.addColorStop(1, '#f97316');
    ctx.strokeStyle = arcGrad;
    ctx.lineWidth = Math.max(3.5, dialRadius * 0.24);
    ctx.lineCap = 'round';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, dialRadius * 0.72, startAngle, endAngle, false);
    ctx.stroke();

    // Center dial lightning bolt icon
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fde047';
    const boltS = dialRadius * 0.42;
    ctx.beginPath();
    ctx.moveTo(boltS * 0.2, -boltS);
    ctx.lineTo(-boltS * 0.6, boltS * 0.1);
    ctx.lineTo(-boltS * 0.05, boltS * 0.1);
    ctx.lineTo(-boltS * 0.2, boltS);
    ctx.lineTo(boltS * 0.6, -boltS * 0.1);
    ctx.lineTo(boltS * 0.05, -boltS * 0.1);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * Electrocuted visual shock effects (lightning arcs, flashing skeleton aura, dazed eyes)
   */
  private drawElectrocutionEffect(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    raccoon: RaccoonPosition,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const screenX = this.worldToScreenX(raccoon.x, cameraX, W, H);
    const screenY = this.worldToScreenY(raccoon.y, cameraY, H);
    const rw = this.getUnitW(W, H) * GAME_CONFIG.RACCOON.WIDTH_RATIO;
    const rh = H * GAME_CONFIG.RACCOON.HEIGHT_RATIO;

    ctx.save();
    ctx.translate(screenX, screenY);

    // Flashing electric aura
    const auraColors = ['rgba(250, 204, 21, 0.45)', 'rgba(56, 189, 248, 0.45)', 'rgba(255, 255, 255, 0.6)'];
    ctx.fillStyle = auraColors[Math.floor(time * 30) % auraColors.length];
    ctx.beginPath();
    ctx.ellipse(0, 0, rw * 0.85, rh * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();

    // Classic Cartoon X-Ray Skeleton Strobe Animation
    const showSkeleton = Math.sin(time * 32) > -0.25;
    if (showSkeleton) {
      // 1. Dark silhouette backdrop to make white skeleton pop prominently
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      // Body
      ctx.ellipse(0, rh * 0.05, rw * 0.46, rh * 0.38, 0, 0, Math.PI * 2);
      // Head
      ctx.arc(0, -rh * 0.28, rw * 0.32, 0, Math.PI * 2);
      // Ears
      ctx.arc(-rw * 0.26, -rh * 0.44, rw * 0.12, 0, Math.PI * 2);
      ctx.arc(rw * 0.26, -rh * 0.44, rw * 0.12, 0, Math.PI * 2);
      ctx.fill();

      // 2. Bone-White Skeletal Bones
      ctx.strokeStyle = '#f8fafc';
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = '#67e8f9';
      ctx.shadowBlur = 8;
      ctx.lineWidth = Math.max(1.8, rw * 0.045);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // --- CRANIUM / SKULL ---
      ctx.beginPath();
      ctx.ellipse(0, -rh * 0.28, rw * 0.26, rh * 0.18, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Ear cartilage bones
      ctx.beginPath();
      ctx.moveTo(-rw * 0.16, -rh * 0.38);
      ctx.lineTo(-rw * 0.26, -rh * 0.48);
      ctx.lineTo(-rw * 0.08, -rh * 0.42);
      ctx.moveTo(rw * 0.16, -rh * 0.38);
      ctx.lineTo(rw * 0.26, -rh * 0.48);
      ctx.lineTo(rw * 0.08, -rh * 0.42);
      ctx.stroke();

      // Dark Hollow Eye Sockets
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(-rw * 0.11, -rh * 0.30, rw * 0.065, 0, Math.PI * 2);
      ctx.arc(rw * 0.11, -rh * 0.30, rw * 0.065, 0, Math.PI * 2);
      ctx.fill();

      // Little skeletal nasal cavity
      ctx.beginPath();
      ctx.moveTo(0, -rh * 0.25);
      ctx.lineTo(-rw * 0.025, -rh * 0.22);
      ctx.lineTo(rw * 0.025, -rh * 0.22);
      ctx.closePath();
      ctx.fill();

      // Skeletal Teeth (chattering jaw)
      ctx.strokeStyle = '#f8fafc';
      ctx.beginPath();
      const teethY = -rh * 0.18;
      ctx.moveTo(-rw * 0.10, teethY);
      ctx.lineTo(rw * 0.10, teethY);
      for (let t = -2; t <= 2; t++) {
        const tx = t * (rw * 0.045);
        ctx.moveTo(tx, teethY - rh * 0.025);
        ctx.lineTo(tx, teethY + rh * 0.025);
      }
      ctx.stroke();

      // --- SPINE (Vertebrae) ---
      const spineStartY = -rh * 0.12;
      const spineEndY = rh * 0.32;
      ctx.beginPath();
      ctx.moveTo(0, spineStartY);
      ctx.lineTo(0, spineEndY);
      ctx.stroke();

      // Vertebrae bumps
      for (let v = 0; v < 6; v++) {
        const vy = spineStartY + (v / 5) * (spineEndY - spineStartY);
        ctx.beginPath();
        ctx.arc(0, vy, rw * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- RIB CAGE ---
      for (let r = 0; r < 4; r++) {
        const ry = -rh * 0.08 + r * (rh * 0.07);
        const ribW = (rw * 0.22) * (1 - r * 0.12);
        // Left rib
        ctx.beginPath();
        ctx.moveTo(0, ry);
        ctx.quadraticCurveTo(-ribW * 1.1, ry - rh * 0.02, -ribW, ry + rh * 0.04);
        ctx.stroke();
        // Right rib
        ctx.beginPath();
        ctx.moveTo(0, ry);
        ctx.quadraticCurveTo(ribW * 1.1, ry - rh * 0.02, ribW, ry + rh * 0.04);
        ctx.stroke();
      }

      // --- PELVIS ---
      ctx.beginPath();
      ctx.ellipse(0, rh * 0.30, rw * 0.18, rh * 0.05, 0, 0, Math.PI * 2);
      ctx.stroke();

      // --- SKELETAL ARMS & CLAWS ---
      [-1, 1].forEach((side) => {
        const shoulderX = side * rw * 0.16;
        const shoulderY = -rh * 0.08;
        const elbowX = side * rw * 0.36;
        const elbowY = -rh * 0.14;
        const wristX = side * rw * 0.44;
        const wristY = -rh * 0.24;

        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY);
        ctx.lineTo(elbowX, elbowY);
        ctx.lineTo(wristX, wristY);
        ctx.stroke();

        // 3 finger bone claws
        for (let f = -1; f <= 1; f++) {
          ctx.beginPath();
          ctx.moveTo(wristX, wristY);
          ctx.lineTo(wristX + side * rw * 0.08, wristY + f * rh * 0.04);
          ctx.stroke();
        }
      });

      // --- SKELETAL LEGS & PAWS ---
      [-1, 1].forEach((side) => {
        const hipX = side * rw * 0.14;
        const hipY = rh * 0.30;
        const kneeX = side * rw * 0.34;
        const kneeY = rh * 0.38;
        const ankleX = side * rw * 0.40;
        const ankleY = rh * 0.46;

        ctx.beginPath();
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(kneeX, kneeY);
        ctx.lineTo(ankleX, ankleY);
        ctx.stroke();

        // Skeletal foot claws
        for (let f = -1; f <= 1; f++) {
          ctx.beginPath();
          ctx.moveTo(ankleX, ankleY);
          ctx.lineTo(ankleX + side * rw * 0.07, ankleY + f * rh * 0.035);
          ctx.stroke();
        }
      });

      // --- SKELETAL TAIL (Vertebrae chain) ---
      let tailX = 0;
      let tailY = rh * 0.34;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      for (let t = 0; t < 7; t++) {
        tailX += Math.sin(time * 16 + t) * (rw * 0.06) + rw * 0.05;
        tailY += rh * 0.055;
        ctx.lineTo(tailX, tailY);
      }
      ctx.stroke();
    }

    // Jagged electric lightning arcs wrapping the raccoon
    ctx.lineWidth = Math.max(1.8, rw * 0.05);
    const numArcs = 6;
    for (let i = 0; i < numArcs; i++) {
      ctx.strokeStyle = i % 2 === 0 ? '#facc15' : '#38bdf8';
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 12;
      const startAngle = (i * Math.PI * 2) / numArcs + time * 14;
      let lx = Math.cos(startAngle) * rw * 0.65;
      let ly = Math.sin(startAngle) * rh * 0.65;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      for (let seg = 0; seg < 4; seg++) {
        lx += (Math.random() - 0.5) * rw * 0.55;
        ly += (Math.random() - 0.5) * rh * 0.55;
        ctx.lineTo(lx, ly);
      }
      ctx.stroke();
    }

    // Dazed cartoon 'x' eyes
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    [-rw * 0.12, rw * 0.12].forEach((eyeX) => {
      const eyeY = -rh * 0.30;
      const sz = rw * 0.06;
      ctx.beginPath();
      ctx.moveTo(eyeX - sz, eyeY - sz);
      ctx.lineTo(eyeX + sz, eyeY + sz);
      ctx.moveTo(eyeX + sz, eyeY - sz);
      ctx.lineTo(eyeX - sz, eyeY + sz);
      ctx.stroke();
    });

    // Spinning Yellow Dizzy Stars above head
    for (let s = 0; s < 3; s++) {
      const starAngle = (s * Math.PI * 2) / 3 + time * 6;
      const starX = Math.cos(starAngle) * rw * 0.36;
      const starY = -rh * 0.54 + Math.sin(starAngle) * rh * 0.10;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(starX, starY, Math.max(2, rw * 0.04), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Caped Superhero flying across the screen at Level 15 (similar in actions to geese flyover)
   */
  private drawCapedSuperhero(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    unitW: number,
    hero: import('./types').CapedSuperhero,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const screenX = this.worldToScreenX(hero.x, cameraX, W, H);
    const screenY = this.worldToScreenY(hero.y, cameraY, H);
    const heroW = unitW * 0.16 * hero.scale;
    const heroH = heroW * 0.45;

    ctx.save();
    ctx.translate(screenX, screenY);
    if (hero.direction === 'left') {
      ctx.scale(-1, 1);
    }

    // 1. Aerodynamic supersonic contrail / speed lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
    ctx.lineWidth = 2.5;
    for (let l = 0; l < 3; l++) {
      const ly = (l - 1) * (heroH * 0.35);
      const lLen = heroW * (1.2 + Math.sin(time * 18 + l) * 0.3);
      ctx.beginPath();
      ctx.moveTo(-heroW * 0.4, ly);
      ctx.lineTo(-heroW * 0.4 - lLen, ly);
      ctx.stroke();
    }

    // 2. Billowing Caped Hero Cape (flowing behind hero)
    const flutter = Math.sin(hero.capeFlutterPhase) * (heroH * 0.35);
    const flutter2 = Math.cos(hero.capeFlutterPhase * 1.3) * (heroH * 0.28);
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-heroW * 0.12, -heroH * 0.25);
    ctx.quadraticCurveTo(-heroW * 0.55, -heroH * 0.45 + flutter, -heroW * 0.95, -heroH * 0.2 + flutter2);
    ctx.lineTo(-heroW * 0.90, heroH * 0.35 + flutter);
    ctx.quadraticCurveTo(-heroW * 0.5, heroH * 0.45 + flutter2, -heroW * 0.12, heroH * 0.2);
    ctx.closePath();
    ctx.fill();

    // Deep shadow folds on cape
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. Heroic Streamlined Body (Flying pose: royal blue suit, golden belt)
    // Legs streamlined back
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.ellipse(-heroW * 0.28, heroH * 0.05, heroW * 0.24, heroH * 0.22, -0.05, 0, Math.PI * 2);
    ctx.fill();

    // Boots
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.ellipse(-heroW * 0.48, heroH * 0.06, heroW * 0.12, heroH * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Torso & Chest
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.ellipse(heroW * 0.04, 0, heroW * 0.26, heroH * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Golden Belt
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-heroW * 0.08, -heroH * 0.32, heroW * 0.08, heroH * 0.64);
    // Golden chest shield emblem
    ctx.beginPath();
    ctx.moveTo(heroW * 0.06, -heroH * 0.24);
    ctx.lineTo(heroW * 0.18, -heroH * 0.24);
    ctx.lineTo(heroW * 0.12, heroH * 0.08);
    ctx.closePath();
    ctx.fill();

    // 4. Heroic Outstretched Flying Arm & Fist
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.ellipse(heroW * 0.35, -heroH * 0.08, heroW * 0.18, heroH * 0.18, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Clenched red heroic gauntlet/fist forward!
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.ellipse(heroW * 0.52, -heroH * 0.08, heroW * 0.09, heroH * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Masked Head & Cowl
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.arc(heroW * 0.22, -heroH * 0.12, heroH * 0.36, 0, Math.PI * 2);
    ctx.fill();
    // White determined hero mask lenses
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(heroW * 0.28, -heroH * 0.16, heroH * 0.14, heroH * 0.08, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Dozen pigeons napping on a window sill on the second level that fly away if raccoon crawls on that specific window ledge
   */
  private drawSillPigeons(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    group: import('./types').SillPigeonsGroup,
    floors: FloorData[],
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    const f2 = floors.find((f) => f.floorNumber === group.floorNumber);
    const win = f2?.windows[group.windowIndex];
    if (!win) return;

    const unitW = this.getUnitW(W, H);
    const pW = unitW * 0.024;
    const pH = pW * 0.72;

    ctx.save();

    for (const p of group.pigeons) {
      let sx = 0;
      let sy = 0;

      if (p.state === 'napping') {
        const worldX = win.worldLeft + (win.worldRight - win.worldLeft) * p.offsetRatio;
        const worldY = win.sillY;
        sx = this.worldToScreenX(worldX, cameraX, W, H);
        sy = this.worldToScreenY(worldY, cameraY, H);

        if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) continue;

        ctx.save();
        ctx.translate(sx, sy);
        if (p.facing === -1) {
          ctx.scale(-1, 1);
        }

        const breathe = Math.sin(time * 3 + p.id * 0.7) * (pH * 0.08);

        // Napping pigeon body (plump rounded slate-grey ellipse)
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.ellipse(0, -pH * 0.45 + breathe, pW * 0.48, pH * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();

        // Folded Wing with dual dark charcoal bars
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.ellipse(-pW * 0.08, -pH * 0.42 + breathe, pW * 0.32, pH * 0.28, 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-pW * 0.25, -pH * 0.38 + breathe);
        ctx.lineTo(-pW * 0.05, -pH * 0.22 + breathe);
        ctx.moveTo(-pW * 0.18, -pH * 0.48 + breathe);
        ctx.lineTo(pW * 0.02, -pH * 0.32 + breathe);
        ctx.stroke();

        // Iridescent emerald / amethyst neck sheen
        ctx.fillStyle = p.id % 2 === 0 ? '#059669' : '#7c3aed';
        ctx.beginPath();
        ctx.ellipse(pW * 0.18, -pH * 0.52 + breathe, pW * 0.20, pH * 0.26, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Tucked sleeping head
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(pW * 0.22, -pH * 0.68 + breathe, pW * 0.22, 0, Math.PI * 2);
        ctx.fill();

        // Closed sleepy eyelid arc (︶)
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(pW * 0.26, -pH * 0.70 + breathe, pW * 0.06, 0.2, Math.PI - 0.2);
        ctx.stroke();

        // Tucked tiny coral-pink beak
        ctx.fillStyle = '#fb7185';
        ctx.beginPath();
        ctx.moveTo(pW * 0.36, -pH * 0.65 + breathe);
        ctx.lineTo(pW * 0.46, -pH * 0.62 + breathe);
        ctx.lineTo(pW * 0.34, -pH * 0.58 + breathe);
        ctx.closePath();
        ctx.fill();

        // Tiny coral feet clutching sill
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(-pW * 0.12, -pH * 0.08, pW * 0.10, pH * 0.12);
        ctx.fillRect(pW * 0.06, -pH * 0.08, pW * 0.10, pH * 0.12);

        // Floating sleepy 'Z' on occasional birds
        if (p.id % 3 === 0) {
          const zOffset = (time * 0.8 + p.id) % 1.5;
          ctx.fillStyle = `rgba(148, 163, 184, ${Math.max(0, 1 - zOffset / 1.5)})`;
          ctx.font = 'bold 8px monospace';
          ctx.fillText('z', pW * 0.3 + zOffset * 4, -pH * 0.85 - zOffset * 8);
        }

        ctx.restore();
      } else {
        // Flying pigeon startled into sky
        sx = this.worldToScreenX(p.flyX, cameraX, W, H);
        sy = this.worldToScreenY(p.flyY, cameraY, H);

        if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;

        ctx.save();
        ctx.translate(sx, sy);
        if (p.flyVx < 0) {
          ctx.scale(-1, 1);
        }

        const wingFlap = Math.sin(p.wingPhase) * (pH * 0.9);

        // Body
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.ellipse(0, 0, pW * 0.45, pH * 0.35, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Wings outstretched & flapping
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(-pW * 0.15, -pH * 0.1);
        ctx.lineTo(-pW * 0.35, -pH * 0.7 + wingFlap);
        ctx.lineTo(pW * 0.15, -pH * 0.8 + wingFlap);
        ctx.lineTo(pW * 0.1, -pH * 0.1);
        ctx.closePath();
        ctx.fill();

        // Head outstretched forward
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(pW * 0.38, -pH * 0.15, pW * 0.18, 0, Math.PI * 2);
        ctx.fill();

        // Open eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(pW * 0.42, -pH * 0.18, pW * 0.05, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#fb7185';
        ctx.beginPath();
        ctx.moveTo(pW * 0.52, -pH * 0.18);
        ctx.lineTo(pW * 0.65, -pH * 0.15);
        ctx.lineTo(pW * 0.52, -pH * 0.12);
        ctx.closePath();
        ctx.fill();

        // Fan tail with white band
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(-pW * 0.35, 0);
        ctx.lineTo(-pW * 0.7, -pH * 0.2);
        ctx.lineTo(-pW * 0.7, pH * 0.2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }

    ctx.restore();
  }

  /**
   * Weather ambient sky wash (moody storm darkness during rain, frosty winter haze during snow)
   */
  private drawWeatherBackdrop(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    weather?: import('./types').WeatherState
  ) {
    if (!weather || weather.type === 'clear') return;

    ctx.save();
    if (weather.type === 'rain') {
      const isThunderstorm = weather.stormPhase === 'thunderstorm';
      // Overcast stormy tint - deep dramatic indigo/charcoal wash during thunderstorm climax
      const alpha = isThunderstorm ? 0.44 * weather.intensity : 0.20 * weather.intensity;
      ctx.fillStyle = `rgba(15, 23, 42, ${alpha})`;
      ctx.fillRect(0, 0, W, H);
      if (isThunderstorm) {
        // Dramatic violet tempest under-glow
        ctx.fillStyle = `rgba(49, 46, 129, ${0.14 * weather.intensity})`;
        ctx.fillRect(0, 0, W, H);
      }
    } else if (weather.type === 'snow') {
      const isBlizzard = weather.stormPhase === 'blizzard';
      if (isBlizzard) {
        // Deep arctic white-out fog backdrop behind the skyscraper
        ctx.fillStyle = `rgba(240, 248, 255, ${0.72 * weather.intensity})`;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = `rgba(224, 242, 254, ${0.40 * weather.intensity})`;
        ctx.fillRect(0, 0, W, H);
      } else {
        const alpha = 0.14 * weather.intensity;
        ctx.fillStyle = `rgba(224, 242, 254, ${alpha})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
    ctx.restore();
  }

  /**
   * Ambient scene darkening / white-out overlay:
   * When there is rain or a thunderstorm, darkens everything slightly relative to the weather condition.
   * When there is a blizzard, wraps the scene in a near white-out arctic veil.
   * When the related weather conditions end, returns smoothly to a bright, vibrant, and sunny daytime environment.
   */
  public drawWeatherAmbientLighting(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    weather?: import('./types').WeatherState,
    lightningFlashAlpha?: number
  ) {
    if (!weather) return;
    const darkness = this.getStormDarkness(weather);
    if (darkness <= 0.005) return;

    ctx.save();

    // Scale darkness slightly relative to the weather severity
    const baseDarkAlpha = darkness * 0.36;

    // Suppress darkness if a lightning bolt flashes, illuminating the scene
    const flashCut = Math.max(0, 1.0 - (lightningFlashAlpha || 0) * 1.6);
    const effectiveAlpha = baseDarkAlpha * flashCut;

    if (effectiveAlpha > 0.005) {
      if (weather.type === 'rain') {
        const isThunderstorm = weather.stormPhase === 'thunderstorm';
        // Atmospheric stormy charcoal slate overlay
        ctx.fillStyle = `rgba(15, 23, 42, ${effectiveAlpha})`;
        ctx.fillRect(0, 0, W, H);

        if (isThunderstorm) {
          // Dramatic tempest moody violet undertone
          ctx.fillStyle = `rgba(49, 46, 129, ${effectiveAlpha * 0.35})`;
          ctx.fillRect(0, 0, W, H);
        }
      } else if (weather.type === 'snow') {
        const isBlizzard = weather.stormPhase === 'blizzard';
        if (isBlizzard) {
          // Blizzard Near White-out Ambient Lighting:
          // Instead of dark slate, blizzard illuminates the world with blinding arctic white-out fog
          ctx.fillStyle = `rgba(255, 255, 255, ${0.52 * weather.intensity})`;
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = `rgba(224, 242, 254, ${0.22 * weather.intensity})`;
          ctx.fillRect(0, 0, W, H);
        } else {
          // Cold winter overcast dimming for gentle flurries
          ctx.fillStyle = `rgba(15, 23, 42, ${effectiveAlpha * 0.75})`;
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = `rgba(186, 230, 253, ${effectiveAlpha * 0.10})`;
          ctx.fillRect(0, 0, W, H);
        }
      }
    }

    ctx.restore();
  }

  /**
   * Radiant atmospheric rainbows appearing in the sky after the thunderstorm clears:
   * Features animated shimmering arches across the sky, secondary double-rainbow,
   * companion mini rainbows, fluffy iridescent clouds, and animated sparkle stars.
   */
  public drawRainbow(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cameraX: number,
    cameraY: number,
    weather?: import('./types').WeatherState,
    time: number = 0
  ) {
    if (!weather || !weather.rainbowAlpha || weather.rainbowAlpha <= 0.01) return;

    ctx.save();
    const alpha = Math.min(1.0, weather.rainbowAlpha);
    const unitW = this.getUnitW(W, H);

    const colors = [
      'rgba(239, 68, 68, ',   // Red
      'rgba(249, 115, 22, ',  // Orange
      'rgba(234, 179, 8, ',   // Yellow
      'rgba(34, 197, 94, ',   // Green
      'rgba(6, 182, 212, ',   // Cyan
      'rgba(59, 130, 246, ',  // Blue
      'rgba(168, 85, 247, ',  // Violet
    ];

    // Floor 10-12 World Y baseline
    const floor10WorldY = 9.5 * GAME_CONFIG.SKYSCRAPER.FLOOR_HEIGHT_RATIO;
    const baseCenterY = this.worldToScreenY(floor10WorldY - 0.35, cameraY * 0.45, H) + H * 0.35;

    // Helper to draw a single rainbow arch
    const renderArch = (cx: number, cy: number, baseRadius: number, bandWidth: number, archAlpha: number, reverseOrder = false) => {
      const activeColors = reverseOrder ? [...colors].reverse() : colors;
      activeColors.forEach((colPrefix, idx) => {
        const r = baseRadius + idx * bandWidth;
        ctx.strokeStyle = `${colPrefix}${0.55 * archAlpha * alpha})`;
        ctx.lineWidth = bandWidth * 1.15;
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI, 0);
        ctx.stroke();
      });

      // Soft shimmering glow overlay
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.18 * archAlpha * alpha})`;
      ctx.lineWidth = bandWidth * (colors.length + 1);
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius + (bandWidth * colors.length) * 0.5, Math.PI, 0);
      ctx.stroke();
    };

    // 1. Primary Majestic Rainbow Arch (Center)
    const mainCenterX = this.worldToScreenX(GAME_CONFIG.SKYSCRAPER.BUILDING_CENTER_X, cameraX, W, H);
    const mainRadius = unitW * 0.62;
    const mainBandW = Math.max(6, unitW * 0.016);
    renderArch(mainCenterX, baseCenterY, mainRadius, mainBandW, 1.0);

    // 2. Secondary Concentric Double-Rainbow Arch (Higher and wider, pastel shimmer)
    const secondaryRadius = mainRadius + mainBandW * 9.5;
    const secondaryBandW = mainBandW * 0.75;
    renderArch(mainCenterX, baseCenterY, secondaryRadius, secondaryBandW, 0.55, true);

    // 3. Companion Miniature Rainbows Everywhere (Left and Right sky)
    const leftCenterX = mainCenterX - unitW * 0.55;
    const rightCenterX = mainCenterX + unitW * 0.55;
    const miniRadius = unitW * 0.32;
    const miniBandW = Math.max(3.5, unitW * 0.009);

    renderArch(leftCenterX, baseCenterY - H * 0.08, miniRadius, miniBandW, 0.75);
    renderArch(rightCenterX, baseCenterY - H * 0.12, miniRadius * 1.1, miniBandW, 0.70);

    // 4. Animated Twinkling Prismatic Stars traveling along rainbow arches
    const starCount = 14;
    for (let s = 0; s < starCount; s++) {
      const starPhase = (time * 0.6 + s / starCount) % 1.0;
      const angle = Math.PI - starPhase * Math.PI; // Along arc from PI to 0
      const starRadius = mainRadius + (s % colors.length) * mainBandW;
      const starX = mainCenterX + Math.cos(angle) * starRadius;
      const starY = baseCenterY - Math.sin(angle) * starRadius;

      const twinkle = 0.5 + 0.5 * Math.sin(time * 6.0 + s * 1.7);
      const starAlpha = alpha * twinkle * 0.9;
      if (starAlpha > 0.05) {
        ctx.fillStyle = `rgba(255, 255, 255, ${starAlpha})`;
        const starSize = Math.max(3, unitW * 0.009);
        // Draw 4-point star
        ctx.beginPath();
        ctx.moveTo(starX, starY - starSize * 1.5);
        ctx.lineTo(starX + starSize * 0.35, starY - starSize * 0.35);
        ctx.lineTo(starX + starSize * 1.5, starY);
        ctx.lineTo(starX + starSize * 0.35, starY + starSize * 0.35);
        ctx.lineTo(starX, starY + starSize * 1.5);
        ctx.lineTo(starX - starSize * 0.35, starY + starSize * 0.35);
        ctx.lineTo(starX - starSize * 1.5, starY);
        ctx.lineTo(starX - starSize * 0.35, starY - starSize * 0.35);
        ctx.closePath();
        ctx.fill();

        // Prismatic core glow
        ctx.fillStyle = `rgba(254, 240, 138, ${starAlpha * 0.7})`;
        ctx.beginPath();
        ctx.arc(starX, starY, starSize * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Visible animated wind streamlines, curving gust ribbons, and drifting vapor eddy trails:
   * Visually communicates the horizontal wind force pushing against the raccoon during blizzards,
   * thunderstorms, and active high-altitude breezes.
   */
  public drawWindGusts(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    weather?: import('./types').WeatherState,
    cameraX: number = 0,
    cameraY: number = 0,
    time: number = 0
  ) {
    if (!weather) return;
    const windVal = weather.wind || 0;
    const windMag = Math.abs(windVal);
    if (windMag < 0.04) return;

    ctx.save();
    const isBlizzard = weather.stormPhase === 'blizzard';
    const isThunder = weather.stormPhase === 'thunderstorm';
    const windDir = Math.sign(windVal) || 1;
    const unitW = this.getUnitW(W, H);

    // Number of dynamic gust streamers based on storm intensity
    const gustCount = isBlizzard ? 18 : isThunder ? 14 : 9;
    const gustSpeed = (isBlizzard ? 2.4 : isThunder ? 1.8 : 1.2) * (windDir > 0 ? 1 : -1);

    for (let i = 0; i < gustCount; i++) {
      // Periodic cycling horizontal stream
      const rowYRatio = ((i * 0.117 + (time * 0.04 * (i % 2 === 0 ? 1 : -0.5))) % 1.0 + 1.0) % 1.0;
      const screenY = rowYRatio * H;

      // Horizontal flow progression
      const streamPhase = ((time * gustSpeed * 0.35 + (i * 0.173)) % 1.0 + 1.0) % 1.0;
      const startX = streamPhase * (W + 200) - 100;
      const streamLen = (isBlizzard ? 220 : 160) + (i % 4) * 45;

      const endX = startX + streamLen * windDir;
      const midX1 = startX + streamLen * 0.35 * windDir;
      const midY1 = screenY + Math.sin(time * 3.5 + i * 2.1) * 16;
      const midX2 = startX + streamLen * 0.70 * windDir;
      const midY2 = screenY + Math.cos(time * 2.8 + i * 1.5) * 14;

      // Gust streamer gradient (translucent tapered trail)
      const grad = ctx.createLinearGradient(startX, screenY, endX, midY2);
      const baseAlpha = (isBlizzard ? 0.38 : isThunder ? 0.28 : 0.18) * Math.min(1.0, windMag * 2.0);
      const colorHaze = isBlizzard ? '224, 242, 254' : isThunder ? '216, 180, 254' : '255, 255, 255';

      grad.addColorStop(0, `rgba(${colorHaze}, 0)`);
      grad.addColorStop(0.35, `rgba(${colorHaze}, ${baseAlpha * 0.7})`);
      grad.addColorStop(0.75, `rgba(${colorHaze}, ${baseAlpha})`);
      grad.addColorStop(1, `rgba(${colorHaze}, 0)`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(1.4, unitW * 0.0035 * (1 + (i % 3) * 0.4));
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(startX, screenY);
      ctx.bezierCurveTo(midX1, midY1, midX2, midY2, endX, midY2);
      ctx.stroke();

      // Swirling curly vortex loop at the leading tip of selected gusts
      if (i % 3 === 0) {
        const loopRadius = Math.max(4, unitW * 0.009);
        const curlAngle = time * 7.0 * windDir + i;
        ctx.strokeStyle = `rgba(${colorHaze}, ${baseAlpha * 0.65})`;
        ctx.lineWidth = Math.max(1.0, unitW * 0.0025);
        ctx.beginPath();
        ctx.arc(
          endX - windDir * loopRadius,
          midY2 + Math.sin(curlAngle) * 3,
          loopRadius,
          0,
          Math.PI * 1.4,
          windDir < 0
        );
        ctx.stroke();
      }

      // Fast drifting breeze particle speck riding along the gust
      const speckT = ((streamPhase + (i * 0.31)) % 1.0);
      const speckX = startX + speckT * streamLen * windDir;
      const speckY = screenY + Math.sin(time * 3.5 + i * 2.1) * (speckT * 14);
      ctx.fillStyle = `rgba(${colorHaze}, ${baseAlpha * 1.2})`;
      ctx.beginPath();
      ctx.arc(speckX, speckY, Math.max(1.2, unitW * 0.003), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Render dynamic weather precipitation:
   * Rain: Slanted high-velocity translucent streaks, bright droplet beads, and window sill impact splashes
   * Snow: Soft fluttering snowflakes and windy blizzard streaks
   */
  private drawWeatherPrecipitation(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    weather: import('./types').WeatherState,
    cameraX: number,
    cameraY: number,
    time: number
  ) {
    if (!weather || weather.type === 'clear') return;

    ctx.save();

    if (weather.type === 'rain') {
      const isThunderstorm = weather.stormPhase === 'thunderstorm';
      // 1. Slanted Rain Streaks - Made significantly more pronounced, thicker, and glistening
      const strokeW = isThunderstorm ? Math.max(2.6, W * 0.0036) : Math.max(2.0, W * 0.0028);
      ctx.lineWidth = strokeW;
      ctx.lineCap = 'round';

      for (const drop of weather.drops) {
        const sx = this.worldToScreenX(drop.x, cameraX, W, H);
        const sy = this.worldToScreenY(drop.y, cameraY, H);
        if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) continue;

        const tailLen = (drop.length * (isThunderstorm ? 1.4 : 1.1)) * H;
        const tailX = sx - drop.vx * 38;
        const tailY = sy - tailLen;

        const grad = ctx.createLinearGradient(sx, sy, tailX, tailY);
        grad.addColorStop(0, '#ffffff'); // Glistening leading droplet
        grad.addColorStop(0.3, '#bae6fd');
        grad.addColorStop(0.8, `rgba(56, 189, 248, ${0.75 * drop.alpha * weather.intensity})`);
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');

        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // Distinct droplet bead at the leading tip of the raindrop
        ctx.fillStyle = isThunderstorm ? '#ffffff' : '#e0f2fe';
        ctx.beginPath();
        ctx.arc(sx, sy, isThunderstorm ? 2.4 : 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Micro Rain Splashes on Window Sills and Ground
      for (const sp of weather.splashes) {
        const sx = this.worldToScreenX(sp.x, cameraX, W, H);
        const sy = this.worldToScreenY(sp.y, cameraY, H);
        if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;

        const progress = sp.life / sp.maxLife;
        const alpha = (1 - progress) * 0.85 * weather.intensity;
        const r = 3 + progress * 7;

        ctx.strokeStyle = `rgba(186, 230, 253, ${alpha})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(sx, sy, r, Math.PI, 0); // Upward splashing arc
        ctx.stroke();
      }
    } else if (weather.type === 'snow') {
      const isBlizzard = weather.stormPhase === 'blizzard';

      // Blizzard wind streaks during blizzard climax
      if (isBlizzard) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 * weather.intensity})`;
        ctx.lineWidth = Math.max(1.5, W * 0.0022);
        ctx.lineCap = 'round';
        for (let i = 0; i < 18; i++) {
          const gustSeed = (i * 97 + time * 3.5) % 1.0;
          const gustX = ((i * 137) % W) + weather.wind * 120;
          const gustY = (gustSeed * H);
          ctx.beginPath();
          ctx.moveTo(gustX, gustY);
          ctx.lineTo(gustX + weather.wind * 90 + 35, gustY + 12);
          ctx.stroke();
        }
      }

      // Snow Flurries & Fluttering Flakes (rendered visibly larger with distinct crystal structures)
      const unitW = this.getUnitW(W, H);
      const flakeScale = Math.max(0.9, unitW / 450);

      for (const flake of weather.drops) {
        const sx = this.worldToScreenX(flake.x, cameraX, W, H);
        const sy = this.worldToScreenY(flake.y, cameraY, H);
        if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) continue;

        const alpha = Math.min(1.0, flake.alpha * (0.85 + 0.15 * weather.intensity));
        // Generous snowflake radius scaling: 5.5px to 14.5px for unmistakable visual clarity
        const r = (isBlizzard ? flake.size * 1.35 : flake.size * 1.20) * flakeScale;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(time * 0.95 + (flake.swayPhase ?? 0));

        if (r >= 5.0) {
          // Large, ornate 6-pointed crystalline snowflake with branching chevron needles
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = Math.max(1.3, r * 0.14);
          ctx.lineCap = 'round';

          // Soft frosty blue glow so the flake pops prominently off the brick skyscraper
          ctx.shadowColor = 'rgba(186, 230, 253, 0.85)';
          ctx.shadowBlur = Math.max(3, r * 0.35);

          // 6 radial crystal arms
          for (let arm = 0; arm < 6; arm++) {
            ctx.rotate(Math.PI / 3);
            ctx.beginPath();
            // Main spine
            ctx.moveTo(0, 0);
            ctx.lineTo(r, 0);

            // Inner chevron needle pair (at 52% of radius)
            const b1 = r * 0.52;
            const bl1 = r * 0.30;
            ctx.moveTo(b1, 0);
            ctx.lineTo(b1 - bl1 * 0.65, bl1 * 0.70);
            ctx.moveTo(b1, 0);
            ctx.lineTo(b1 - bl1 * 0.65, -bl1 * 0.70);

            // Outer chevron needle pair (at 80% of radius)
            const b2 = r * 0.80;
            const bl2 = r * 0.20;
            ctx.moveTo(b2, 0);
            ctx.lineTo(b2 - bl2 * 0.65, bl2 * 0.70);
            ctx.moveTo(b2, 0);
            ctx.lineTo(b2 - bl2 * 0.65, -bl2 * 0.70);

            ctx.stroke();
          }

          // Crisp white hexagonal / circular central ice core
          ctx.shadowBlur = 0;
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(1.8, r * 0.24), 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(224, 242, 254, ${alpha * 0.9})`;
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(1.0, r * 0.12), 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Medium snowflake: 6-pointed star with glowing white center disc
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 1.3;
          for (let arm = 0; arm < 3; arm++) {
            ctx.rotate(Math.PI / 3);
            ctx.beginPath();
            ctx.moveTo(-r, 0);
            ctx.lineTo(r, 0);
            ctx.stroke();
          }
        }

        ctx.restore();
      }
    }

    ctx.restore();
  }

  /**
   * Visual feedback when raccoon's grip slips on slick wet brick or icy frost:
   * Splash droplets or ice shard particles radiating from paws and skid streaks
   */
  private drawGripSlipEffect(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    raccoon: import('./types').RaccoonPosition,
    cameraX: number,
    cameraY: number,
    weatherType?: import('./types').WeatherType
  ) {
    const rx = this.worldToScreenX(raccoon.x, cameraX, W, H);
    const ry = this.worldToScreenY(raccoon.y, cameraY, H);
    const unitW = this.getUnitW(W, H);
    const isSnow = weatherType === 'snow';

    ctx.save();
    ctx.translate(rx, ry);

    // Slipping paw splash/frost bursts
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (raccoon.gripSlipTimer ?? 0) * 10;
      const dist = unitW * 0.028 * (1 - (raccoon.gripSlipTimer ?? 0.3) / 0.32);
      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * dist;

      ctx.fillStyle = isSnow ? '#e0f2fe' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(px, py, isSnow ? 2.5 : 2.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Skid marks
    ctx.strokeStyle = isSnow ? 'rgba(255, 255, 255, 0.45)' : 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-unitW * 0.015, unitW * 0.01);
    ctx.lineTo(-unitW * 0.015, unitW * 0.035);
    ctx.moveTo(unitW * 0.015, unitW * 0.01);
    ctx.lineTo(unitW * 0.015, unitW * 0.035);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Nearly white-out blizzard visual atmosphere:
   * Howling snow sheet gusts, blinding white vapor curtains, frosty perimeter vignette,
   * and high-speed wind needle streaks obscuring the city and skyscraper.
   */
  public drawBlizzardWhiteout(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    weather: import('./types').WeatherState,
    time: number
  ) {
    if (!weather || weather.stormPhase !== 'blizzard') return;

    ctx.save();
    const intensity = weather.intensity || 1.0;
    const wind = weather.wind || 0.6;
    const windDir = Math.sign(wind) || 1;

    // 1. Overall White-out Veil (subtly pulsing with howling wind gusts)
    const gustPulse = Math.sin(time * 2.5) * 0.08 + Math.cos(time * 5.2) * 0.04;
    const whiteoutAlpha = Math.min(0.68, (0.50 + gustPulse) * intensity);
    ctx.fillStyle = `rgba(255, 255, 255, ${whiteoutAlpha})`;
    ctx.fillRect(0, 0, W, H);

    // 2. High-speed Blinding Snow Sheets / Wind Curtains Billowing Across Screen
    const numSheets = 6;
    for (let s = 0; s < numSheets; s++) {
      const sheetProgress = ((time * (1.6 + s * 0.4) * windDir + s * 0.22) % 1.0 + 1.0) % 1.0;
      const sheetX = sheetProgress * (W + 300) - 150;
      const sheetY = (s / numSheets) * H + Math.sin(time * 3 + s) * 25;
      const sheetW = W * (0.65 + (s % 3) * 0.2);
      const sheetH = H * (0.28 + (s % 2) * 0.15);

      const sheetGrad = ctx.createLinearGradient(sheetX, sheetY, sheetX + sheetW * windDir, sheetY + 30);
      sheetGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      sheetGrad.addColorStop(0.3, `rgba(255, 255, 255, ${0.40 * intensity})`);
      sheetGrad.addColorStop(0.7, `rgba(240, 249, 255, ${0.52 * intensity})`);
      sheetGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = sheetGrad;
      ctx.beginPath();
      ctx.ellipse(sheetX, sheetY, sheetW * 0.5, sheetH * 0.5, windDir * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Dense Rushing Blizzard Wind Needles (48 sharp horizontal white streaks)
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.68 * intensity})`;
    ctx.lineWidth = Math.max(1.8, W * 0.0028);
    ctx.lineCap = 'round';

    for (let i = 0; i < 48; i++) {
      const needleSeed = (i * 131 + time * (4.2 + (i % 5) * 0.8)) % 1.0;
      const nx = ((needleSeed * (W + 400) - 200) * (windDir > 0 ? 1 : -1) + W) % (W + 400) - 200;
      const ny = ((i * 37) % H) + Math.sin(time * 4.5 + i) * 12;
      const nLen = 65 + (i % 6) * 35;

      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.lineTo(nx + nLen * windDir, ny + Math.sin(time * 3 + i) * 6);
      ctx.stroke();
    }

    // 4. Frost / Ice Vignette Encroaching From Screen Edges
    const vigGrad = ctx.createRadialGradient(
      W * 0.5,
      H * 0.5,
      Math.min(W, H) * 0.32,
      W * 0.5,
      H * 0.5,
      Math.max(W, H) * 0.72
    );
    vigGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    vigGrad.addColorStop(0.5, 'rgba(240, 249, 255, 0.25)');
    vigGrad.addColorStop(0.85, 'rgba(255, 255, 255, 0.65)');
    vigGrad.addColorStop(1, 'rgba(255, 255, 255, 0.88)');

    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.restore();
  }
}
