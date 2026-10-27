/**
 * Rise of the Raccoons! - Procedural Web Audio Synth
 * Pure browser Web Audio API oscillator synthesis.
 * Zero external audio assets, zero network latency.
 */

class SoundSystem {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private lastStepTime: number = 0;

  constructor() {
    try {
      const saved = localStorage.getItem('rotr_muted');
      if (saved !== null) {
        this.muted = saved === 'true';
      }
    } catch {
      this.muted = false;
    }
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('rotr_muted', String(this.muted));
    } catch {}
    return this.muted;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem('rotr_muted', String(this.muted));
    } catch {}
  }

  public playMenuClick() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playGameStart() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [330, 440, 554, 660, 880];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.06;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  public playPawStep(isScrambling = false) {
    if (this.muted) return;
    const nowMs = performance.now();
    const minInterval = isScrambling ? 320 : 550;
    if (nowMs - this.lastStepTime < minInterval) return;
    this.lastStepTime = nowMs;

    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Subtle tactile scuff sound
    osc.type = 'triangle';
    const baseFreq = 160 + Math.random() * 50;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.04);

    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  }

  public playGlassSqueak() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // High rubbery pitch slide mimicking paw slipping on smooth glass
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(1400, now + 0.05);
    osc.frequency.linearRampToValueAtTime(950, now + 0.09);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playSillLand() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Solid pleasant stone thud
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.07);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playFloorChime(floorNum: number) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Pentatonic scale frequency calculation
    const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const freq = pentatonic[(floorNum - 1) % pentatonic.length];

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  public playChimeSuccess() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [
      { freq: 587.33, dur: 0.08 },
      { freq: 739.99, dur: 0.08 },
      { freq: 880.00, dur: 0.10 },
      { freq: 1174.66, dur: 0.26 },
    ];

    let t = this.ctx.currentTime;
    notes.forEach((note) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, t);

      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.dur + 0.10);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + note.dur + 0.10);
      t += note.dur;
    });
  }

  public playRoofVictory() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const melody = [
      { freq: 523.25, dur: 0.12 },
      { freq: 659.25, dur: 0.12 },
      { freq: 783.99, dur: 0.14 },
      { freq: 1046.5, dur: 0.35 },
    ];

    let t = this.ctx.currentTime;
    melody.forEach((note) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, t);

      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + note.dur);

      t += note.dur * 0.85;
    });
  }

  public playTrashPop() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Comic springy cartoon pop
    const oscPop = this.ctx.createOscillator();
    const gainPop = this.ctx.createGain();
    oscPop.type = 'sine';
    oscPop.frequency.setValueAtTime(140, now);
    oscPop.frequency.exponentialRampToValueAtTime(720, now + 0.12);

    gainPop.gain.setValueAtTime(0.22, now);
    gainPop.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    oscPop.connect(gainPop);
    gainPop.connect(this.ctx.destination);
    oscPop.start(now);
    oscPop.stop(now + 0.14);

    // 2. Metallic lid rattle clang
    const oscMetal = this.ctx.createOscillator();
    const gainMetal = this.ctx.createGain();
    oscMetal.type = 'square';
    oscMetal.frequency.setValueAtTime(420, now);
    oscMetal.frequency.exponentialRampToValueAtTime(180, now + 0.18);

    gainMetal.gain.setValueAtTime(0.12, now);
    gainMetal.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    oscMetal.connect(gainMetal);
    gainMetal.connect(this.ctx.destination);
    oscMetal.start(now);
    oscMetal.stop(now + 0.18);
  }

  public playTrashLand() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const baseFreq = 220 + Math.random() * 80;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, now + 0.05);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playGameOver() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    // Snarky comical slide down / sad trombone pitch slide
    const notes = [440, 415, 392, 330];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.16;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.88, t + 0.18);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  /**
   * Slice 3: Comedic Snack Crunch Sound
   * Multi-layered procedural synthesis:
   * 1. Rapid crunchy bursts (crust/crisp impact)
   * 2. Resonant cartoon chomp tone
   * 3. Sparkling energy recovery chime
   */
  public playSnackCrunch() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Layer 1: Rapid crunchy bursts (3 staggered micro-crunches)
    for (let i = 0; i < 4; i++) {
      const crunchTime = now + i * 0.028;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Sharp, crunchy triangle/saw bursts
      osc.type = i % 2 === 0 ? 'triangle' : 'sawtooth';
      const startFreq = 280 + Math.random() * 220;
      osc.frequency.setValueAtTime(startFreq, crunchTime);
      osc.frequency.exponentialRampToValueAtTime(70 + Math.random() * 40, crunchTime + 0.045);

      gain.gain.setValueAtTime(0.18, crunchTime);
      gain.gain.exponentialRampToValueAtTime(0.001, crunchTime + 0.045);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(crunchTime);
      osc.stop(crunchTime + 0.045);
    }

    // Layer 2: Comedic "chomp" throat resonant slide
    const chompOsc = this.ctx.createOscillator();
    const chompGain = this.ctx.createGain();
    chompOsc.type = 'sine';
    chompOsc.frequency.setValueAtTime(140, now);
    chompOsc.frequency.exponentialRampToValueAtTime(360, now + 0.06);
    chompOsc.frequency.exponentialRampToValueAtTime(120, now + 0.14);

    chompGain.gain.setValueAtTime(0.16, now);
    chompGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    chompOsc.connect(chompGain);
    chompGain.connect(this.ctx.destination);
    chompOsc.start(now);
    chompOsc.stop(now + 0.14);

    // Layer 3: Cheerful +20% Energy Sparkle Chime (harmonic arpeggio)
    const chimes = [784, 988, 1175]; // G5, B5, D6
    chimes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const chimeOsc = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      const t = now + 0.08 + idx * 0.035;

      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(freq, t);

      chimeGain.gain.setValueAtTime(0.10, t);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.ctx.destination);

      chimeOsc.start(t);
      chimeOsc.stop(t + 0.15);
    });
  }

  /**
   * Slice 3: Spook Warning Alert
   * Comedic cartoon warning rattle / whoop
   */
  public playSpookAlert() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.09);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * Slice 3: Spook Hit / Startled Setback Sound
   * Comedic cartoon spring boing / startled cat screech
   */
  public playSpookHit() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Descending startled screech
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(620, now);
    osc1.frequency.exponentialRampToValueAtTime(140, now + 0.22);

    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // 2. Comedic wobble spring
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(220, now + 0.05);
    osc2.frequency.linearRampToValueAtTime(380, now + 0.12);
    osc2.frequency.linearRampToValueAtTime(180, now + 0.24);

    gain2.gain.setValueAtTime(0.12, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.24);
  }

  /**
   * Proximity volume attenuation: only heard when raccoon is close enough to the window
   */
  public getProximityVolume(distance: number, maxDist: number = 0.45): number {
    if (this.muted) return 0;
    this.initCtx();
    if (!this.ctx) return 0;
    if (distance >= maxDist) return 0;
    const f = Math.max(0, 1 - distance / maxDist);
    return f * f; // Natural distance falloff
  }

  /**
   * Proximity: Camera shutter click and capacitor flash whine
   */
  public playProximityCamera(distance: number) {
    const vol = this.getProximityVolume(distance);
    if (vol <= 0 || !this.ctx) return;

    const now = this.ctx.currentTime;

    // Click 1 (shutter open)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1400, now);
    osc1.frequency.exponentialRampToValueAtTime(300, now + 0.02);
    gain1.gain.setValueAtTime(0.25 * vol, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.02);

    // Click 2 (shutter close)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1800, now + 0.04);
    osc2.frequency.exponentialRampToValueAtTime(400, now + 0.06);
    gain2.gain.setValueAtTime(0.20 * vol, now + 0.04);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now + 0.04);
    osc2.stop(now + 0.06);

    // Capacitor flash whine
    const oscFlash = this.ctx.createOscillator();
    const gainFlash = this.ctx.createGain();
    oscFlash.type = 'sine';
    oscFlash.frequency.setValueAtTime(2400, now + 0.02);
    oscFlash.frequency.exponentialRampToValueAtTime(4200, now + 0.12);
    gainFlash.gain.setValueAtTime(0.10 * vol, now + 0.02);
    gainFlash.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    oscFlash.connect(gainFlash);
    gainFlash.connect(this.ctx.destination);
    oscFlash.start(now + 0.02);
    oscFlash.stop(now + 0.12);
  }

  /**
   * Proximity: Steamy shower opera vibrato singing
   */
  public playProximitySinging(distance: number) {
    const vol = this.getProximityVolume(distance);
    if (vol <= 0 || !this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.14;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      // Vibrato simulation
      osc.frequency.linearRampToValueAtTime(freq * 1.04, t + 0.06);
      osc.frequency.linearRampToValueAtTime(freq * 0.96, t + 0.10);
      osc.frequency.linearRampToValueAtTime(freq, t + 0.14);

      gain.gain.setValueAtTime(0.14 * vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  /**
   * Proximity: TV sitcom chatter and laughter murmur
   */
  public playProximityTV(distance: number) {
    const vol = this.getProximityVolume(distance);
    if (vol <= 0 || !this.ctx) return;

    const now = this.ctx.currentTime;
    // Comedic dialogue pitch wobbles
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + i * 0.07;

      osc.type = 'triangle';
      const base = 280 + (i % 2 === 0 ? 80 : -40);
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.linearRampToValueAtTime(base * 1.3, t + 0.04);
      osc.frequency.linearRampToValueAtTime(base * 0.8, t + 0.07);

      gain.gain.setValueAtTime(0.12 * vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.07);
    }
  }

  /**
   * Proximity: Circus calliope / juggling horn
   */
  public playProximityCircus(distance: number) {
    const vol = this.getProximityVolume(distance);
    if (vol <= 0 || !this.ctx) return;

    const now = this.ctx.currentTime;
    const hornNotes = [587.33, 783.99, 880.0, 783.99];

    hornNotes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.08;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.11 * vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    });
  }

  /**
   * Proximity: Twin Raccoon cute squeak / chitter
   */
  public playProximityRaccoon(distance: number) {
    const vol = this.getProximityVolume(distance);
    if (vol <= 0 || !this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.linearRampToValueAtTime(1450, now + 0.05);
    osc.frequency.linearRampToValueAtTime(1100, now + 0.10);

    gain.gain.setValueAtTime(0.14 * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.10);
  }

  /**
   * Proximity: Sleeping dog BOOF bark
   */
  public playProximityDog(distance: number) {
    const vol = this.getProximityVolume(distance);
    if (vol <= 0 || !this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.12);

    gain.gain.setValueAtTime(0.22 * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  /**
   * Proximity: Disco party bass pluck
   */
  public playProximityDisco(distance: number) {
    const vol = this.getProximityVolume(distance);
    if (vol <= 0 || !this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.15);

    gain.gain.setValueAtTime(0.16 * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Proximity: Alien observer theremin warble
   */
  public playProximityAlien(distance: number) {
    const vol = this.getProximityVolume(distance);
    if (vol <= 0 || !this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(1250, now + 0.08);
    osc.frequency.linearRampToValueAtTime(950, now + 0.16);

    gain.gain.setValueAtTime(0.12 * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  /**
   * Proximity: Curious person "Hey!" / gasp
   */
  public playProximityCurious(distance: number) {
    const vol = this.getProximityVolume(distance);
    if (vol <= 0 || !this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.08);

    gain.gain.setValueAtTime(0.12 * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Physical Setback: Cartoon slide whistle down + recovery wall catch thud
   */
  public playTumbleSlideWhistle() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Classic comedic slide whistle down
    const whistle = this.ctx.createOscillator();
    const whistleGain = this.ctx.createGain();

    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(880, now);
    whistle.frequency.exponentialRampToValueAtTime(180, now + 0.65);

    whistleGain.gain.setValueAtTime(0.18, now);
    whistleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);

    whistle.connect(whistleGain);
    whistleGain.connect(this.ctx.destination);
    whistle.start(now);
    whistle.stop(now + 0.68);

    // 2. Wall grip catch thud at bottom
    const catchOsc = this.ctx.createOscillator();
    const catchGain = this.ctx.createGain();

    catchOsc.type = 'triangle';
    catchOsc.frequency.setValueAtTime(220, now + 0.62);
    catchOsc.frequency.exponentialRampToValueAtTime(80, now + 0.74);

    catchGain.gain.setValueAtTime(0.15, now + 0.62);
    catchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.74);

    catchOsc.connect(catchGain);
    catchGain.connect(this.ctx.destination);
    catchOsc.start(now + 0.62);
    catchOsc.stop(now + 0.74);
  }

  /**
   * Atmospheric: Distant rolling thunder rumble during high-altitude lightning
   */
  public playDistantThunder(vol = 0.22) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(68, now);
    osc.frequency.linearRampToValueAtTime(42, now + 0.9);
    osc.frequency.linearRampToValueAtTime(22, now + 2.2);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol * 0.9, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(vol * 0.38, now + 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 2.3);
  }

  /**
   * Atmospheric: Subtle Canadian goose honk as flock flies past
   */
  public playGeeseHonk(vol = 0.07) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(410, now);
    osc1.frequency.linearRampToValueAtTime(540, now + 0.06);
    osc1.frequency.linearRampToValueAtTime(450, now + 0.16);

    osc2.frequency.setValueAtTime(620, now);
    osc2.frequency.linearRampToValueAtTime(820, now + 0.06);
    osc2.frequency.linearRampToValueAtTime(670, now + 0.16);

    gain.gain.setValueAtTime(vol * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.18);
    osc2.stop(now + 0.18);
  }

  /**
   * Street-level: Soft friendly city car horn
   */
  public playCarHorn(vol = 0.05) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sawtooth';
    // Classic dual-tone city car horn (F4 and A4)
    osc1.frequency.setValueAtTime(349.23, now);
    osc2.frequency.setValueAtTime(440.0, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.02);
    gain.gain.setValueAtTime(vol * 0.85, now + 0.11);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.20);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.20);
    osc2.stop(now + 0.20);
  }

  /**
   * Atmospheric: Gentle bird wing flutter / chirp when brushing past harmlessly
   */
  public playBirdFlutter(vol = 0.12) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(2200, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.12);

    gain.gain.setValueAtTime(vol * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  /**
   * Comic electric shock buzz & zap for electrified telephone wire contact
   */
  public playElectricShock() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.setValueAtTime(120, now + 0.05);
    osc.frequency.setValueAtTime(60, now + 0.10);
    osc.frequency.setValueAtTime(180, now + 0.15);
    osc.frequency.setValueAtTime(90, now + 0.20);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  /**
   * Fast comedic descending whoosh / slide whistle for the Floor 7 to 4 diagonal slide
   */
  public playSlideDownWhoosh() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.95);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 1.0);
  }

  /**
   * Clothespin snap / cloth fluttering sound when laundry is dislodged
   */
  public playLaundryPop() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  /**
   * Metallic step clink for climbing fire escape ladders
   */
  public playMetalStep() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1180, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.05);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }
}

export const sound = new SoundSystem();
