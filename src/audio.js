// ============================================================
// RUCKUS RUGBY — procedural audio (no external assets)
// ============================================================
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfx = null;
    this.crowd = null;
    this.enabled = true;
    this.crowdLevel = 0.055;
    this._crowdStarted = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.9 : 0;
      this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = 0.7;
      this.sfx.connect(this.master);
      this.crowd = this.ctx.createGain();
      this.crowd.gain.value = this.enabled ? this.crowdLevel : 0;
      this.crowd.connect(this.master);
      this._startCrowd();
    } catch (e) {
      console.warn('audio unavailable', e);
    }
  }

  setEnabled(on) {
    this.enabled = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.linearRampToValueAtTime(on ? 0.9 : 0, t + 0.18);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  _noiseBuffer(seconds = 2) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    return buf;
  }

  _startCrowd() {
    if (this._crowdStarted || !this.ctx) return;
    this._crowdStarted = true;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer(4);
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 620;
    bp.Q.value = 0.55;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2500;
    const g = ctx.createGain();
    g.gain.value = 0.55;
    src.connect(bp).connect(lp).connect(g).connect(this.crowd);
    src.start();
    // low stadium rumble
    const src2 = ctx.createBufferSource();
    src2.buffer = this._noiseBuffer(3);
    src2.loop = true;
    const lp2 = ctx.createBiquadFilter();
    lp2.type = 'lowpass';
    lp2.frequency.value = 140;
    const g2 = ctx.createGain();
    g2.gain.value = 0.8;
    src2.connect(lp2).connect(g2).connect(this.crowd);
    src2.start();
  }

  _env(node, peak, attack, decay, when = 0) {
    const t = this.ctx.currentTime + when;
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    node.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  _tone(freq, type, dur, gain, when = 0, slideTo = null) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    this._env(g, gain, 0.012, dur);
    osc.connect(g).connect(this.sfx);
    osc.start(t);
    osc.stop(t + dur + 0.08);
  }

  _burst(dur = 0.18, gain = 0.18, freq = 900, when = 0, type = 'bandpass') {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer(Math.max(0.25, dur + 0.1));
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = 0.9;
    const g = ctx.createGain();
    this._env(g, gain, 0.006, dur);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t);
    src.stop(t + dur + 0.12);
  }

  crowdSwell(amount = 0.22, duration = 2.4) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.crowd.gain.cancelScheduledValues(t);
    this.crowd.gain.setValueAtTime(this.crowd.gain.value, t);
    this.crowd.gain.linearRampToValueAtTime(amount, t + 0.22);
    this.crowd.gain.linearRampToValueAtTime(this.crowdLevel, t + duration);
  }

  crowdHush() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.crowd.gain.cancelScheduledValues(t);
    this.crowd.gain.setValueAtTime(this.crowd.gain.value, t);
    this.crowd.gain.linearRampToValueAtTime(this.crowdLevel * 0.55, t + 0.6);
    this.crowd.gain.linearRampToValueAtTime(this.crowdLevel, t + 7);
  }

  whistle(long = false) {
    if (!this.ctx || !this.enabled) return;
    this._tone(2350, 'sine', long ? 0.34 : 0.14, 0.05);
    this._tone(3120, 'sine', long ? 0.3 : 0.12, 0.028, 0.01);
    this._burst(0.07, 0.015, 3200, 0, 'highpass');
  }

  kick(power = 1) {
    if (!this.ctx || !this.enabled) return;
    this._tone(120 - power * 28, 'sine', 0.16, 0.16 + power * 0.1, 0, 55);
    this._burst(0.12, 0.15 + power * 0.08, 500);
    this._tone(180, 'triangle', 0.07, 0.05);
  }

  pass() {
    if (!this.ctx || !this.enabled) return;
    this._burst(0.1, 0.055, 1800, 0, 'bandpass');
  }

  tackle(big = false) {
    if (!this.ctx || !this.enabled) return;
    this._tone(big ? 74 : 92, 'sine', 0.18, big ? 0.24 : 0.14, 0, 38);
    this._burst(big ? 0.22 : 0.14, big ? 0.2 : 0.1, big ? 700 : 950);
  }

  pickup() {
    this._tone(420, 'triangle', 0.05, 0.04);
    this._tone(620, 'triangle', 0.06, 0.03, 0.03);
  }

  ui() {
    if (!this.ctx || !this.enabled) return;
    this._tone(760, 'sine', 0.045, 0.035);
  }

  positive() {
    if (!this.ctx || !this.enabled) return;
    this._tone(523, 'triangle', 0.1, 0.055);
    this._tone(659, 'triangle', 0.12, 0.05, 0.08);
    this._tone(784, 'triangle', 0.16, 0.045, 0.16);
  }

  negative() {
    if (!this.ctx || !this.enabled) return;
    this._tone(220, 'sawtooth', 0.18, 0.045, 0, 140);
    this._tone(180, 'sine', 0.2, 0.05, 0.06, 110);
  }

  tryScored() {
    if (!this.ctx || !this.enabled) return;
    this.crowdSwell(0.3, 3.4);
    this._tone(392, 'triangle', 0.18, 0.06);
    this._tone(523, 'triangle', 0.2, 0.06, 0.12);
    this._tone(659, 'triangle', 0.3, 0.07, 0.24);
    this._tone(784, 'triangle', 0.5, 0.06, 0.36);
    this._burst(0.4, 0.05, 1000, 0.05);
  }

  conversionGood() {
    if (!this.ctx || !this.enabled) return;
    this._tone(880, 'sine', 0.14, 0.05);
    this._tone(1174, 'sine', 0.24, 0.04, 0.11);
    this.crowdSwell(0.18, 1.8);
  }

  conversionMiss() {
    if (!this.ctx || !this.enabled) return;
    this._tone(320, 'sine', 0.3, 0.04, 0, 180);
    this._burst(0.2, 0.025, 400);
  }

  click() {
    this.ui();
  }
}

export const audio = new AudioManager();
