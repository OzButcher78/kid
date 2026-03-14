// ════════════════════════════════════
//  SOUND FX  (Web Audio API – no files needed)
//  NOTE: SFX.ctx() creates/resumes the AudioContext. Per browser autoplay policy,
//  AudioContext starts suspended until a user gesture. SFX methods are only ever
//  called after the player clicks "SPIEL STARTEN", so this is safe.
// ════════════════════════════════════
const SFX = {
  _ctx: null,
  ctx() {
    if (!this._ctx) this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  },
  _tone(type, freqStart, freqEnd, dur, vol = 0.22, delay = 0) {
    try {
      const c = this.ctx(), t = c.currentTime + delay;
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = type;
      o.frequency.setValueAtTime(freqStart, t);
      if (freqEnd !== freqStart) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.start(t); o.stop(t + dur);
    } catch(e) {}
  },
  jump()     { this._tone('square',   180, 480, 0.14, 0.18); },
  land()     { this._tone('sine',     130,  65, 0.09, 0.28); },
  stomp()    { this._tone('sawtooth', 220,  80, 0.22, 0.30); },
  hurt()     { this._tone('sawtooth', 380, 140, 0.28, 0.28); },
  shoe()     { this._tone('triangle', 290, 170, 0.09, 0.14); },
  blocked()  { this._tone('sine',     550, 660, 0.10, 0.22); },
  collect()  {
    this._tone('sine', 520, 780, 0.10, 0.22, 0.00);
    this._tone('sine', 780, 960, 0.10, 0.22, 0.10);
  },
  win() {
    [261, 329, 392, 523].forEach((f, i) =>
      this._tone('sine', f, f, 0.22, 0.22, i * 0.13));
  },
  gameover() {
    [380, 280, 200, 140].forEach((f, i) =>
      this._tone('sawtooth', f, f * 0.7, 0.28, 0.28, i * 0.16));
  },
  checkpoint() {
    [523, 659, 784].forEach((f, i) =>
      this._tone('sine', f, f * 1.1, 0.18, 0.25, i * 0.10));
  },
  throw() {
    this._tone('triangle', 350, 550, 0.12, 0.18);
  },
};
