// ---------------------------------------------------------------------------
// Procedural audio - no external assets required.
// ---------------------------------------------------------------------------

export class AudioEngine {
  constructor() {
    this.ctx = null
    this.master = null
    this.sfx = null
    this.music = null
    this.noiseBuffer = null
    this.enabled = true
    this.musicEnabled = true
    this.musicTimer = null
    this.step = 0
    this.nextNote = 0
    this.bpm = 96
    this.formLevel = 0
    this.startedMusic = false
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume()
      return
    }
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    this.ctx = new AC()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.65
    this.master.connect(this.ctx.destination)

    this.sfx = this.ctx.createGain()
    this.sfx.gain.value = 0.8
    this.sfx.connect(this.master)

    this.music = this.ctx.createGain()
    this.music.gain.value = 0.14
    this.music.connect(this.master)

    const len = this.ctx.sampleRate * 2
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = this.noiseBuffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    this.startMusic()
  }

  setEnabled(value) {
    this.enabled = value
    if (this.master) this.master.gain.setTargetAtTime(value ? 0.65 : 0, this.ctx.currentTime, 0.05)
  }

  setMusicEnabled(value) {
    this.musicEnabled = value
    if (this.music) this.music.gain.setTargetAtTime(value ? 0.14 : 0, this.ctx.currentTime, 0.05)
  }

  setForm(level) {
    this.formLevel = level
  }

  now() {
    return this.ctx ? this.ctx.currentTime : 0
  }

  // -------------------------------------------------------------- primitives
  tone({ freq = 440, freqEnd = null, type = 'sine', dur = 0.2, vol = 0.2, when = 0, attack = 0.005, release = 0.1, detune = 0, filter = 0, dest = null }) {
    if (!this.ctx || !this.enabled) return
    const t = this.now() + when
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(Math.max(20, freq), t)
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + dur)
    if (detune) osc.detune.value = detune
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    let node = osc
    if (filter) {
      const bq = this.ctx.createBiquadFilter()
      bq.type = 'lowpass'
      bq.frequency.value = filter
      node.connect(bq)
      node = bq
    }
    node.connect(gain)
    gain.connect(dest || this.sfx)
    osc.start(t)
    osc.stop(t + dur + 0.05)
  }

  noise({ dur = 0.15, vol = 0.2, when = 0, filter = 1800, filterEnd = null, type = 'lowpass', q = 1, dest = null }) {
    if (!this.ctx || !this.enabled || !this.noiseBuffer) return
    const t = this.now() + when
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const bq = this.ctx.createBiquadFilter()
    bq.type = type
    bq.Q.value = q
    bq.frequency.setValueAtTime(filter, t)
    if (filterEnd) bq.frequency.exponentialRampToValueAtTime(Math.max(40, filterEnd), t + dur)
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(bq)
    bq.connect(gain)
    gain.connect(dest || this.sfx)
    src.start(t)
    src.stop(t + dur + 0.05)
  }

  // -------------------------------------------------------------- SFX
  ui() {
    this.tone({ freq: 620, freqEnd: 880, type: 'triangle', dur: 0.08, vol: 0.12 })
  }

  punch() {
    this.noise({ dur: 0.09, vol: 0.28, filter: 2200, filterEnd: 300 })
    this.tone({ freq: 150, freqEnd: 52, type: 'sine', dur: 0.14, vol: 0.3 })
  }

  heavy() {
    this.noise({ dur: 0.18, vol: 0.36, filter: 1600, filterEnd: 220 })
    this.tone({ freq: 110, freqEnd: 38, type: 'sine', dur: 0.26, vol: 0.42 })
    this.tone({ freq: 220, freqEnd: 90, type: 'triangle', dur: 0.12, vol: 0.12 })
  }

  hit() {
    this.noise({ dur: 0.08, vol: 0.2, filter: 3200, filterEnd: 600 })
    this.tone({ freq: 260, freqEnd: 80, type: 'sawtooth', dur: 0.08, vol: 0.08 })
  }

  block() {
    this.tone({ freq: 1250, freqEnd: 620, type: 'square', dur: 0.1, vol: 0.09, filter: 3000 })
    this.noise({ dur: 0.06, vol: 0.1, filter: 5200, type: 'highpass' })
  }

  whoosh() {
    this.noise({ dur: 0.17, vol: 0.16, filter: 380, filterEnd: 2600, type: 'bandpass', q: 1.8 })
  }

  dash() {
    this.noise({ dur: 0.22, vol: 0.22, filter: 600, filterEnd: 4200, type: 'bandpass', q: 1.2 })
    this.tone({ freq: 300, freqEnd: 900, type: 'sine', dur: 0.16, vol: 0.06 })
  }

  jump() {
    this.tone({ freq: 240, freqEnd: 480, type: 'triangle', dur: 0.16, vol: 0.08 })
  }

  ki() {
    this.tone({ freq: 1100, freqEnd: 260, type: 'sine', dur: 0.2, vol: 0.14 })
    this.tone({ freq: 2200, freqEnd: 900, type: 'triangle', dur: 0.12, vol: 0.05 })
  }

  beamCharge() {
    this.tone({ freq: 160, freqEnd: 640, type: 'sawtooth', dur: 0.65, vol: 0.1, filter: 1200 })
    this.noise({ dur: 0.6, vol: 0.08, filter: 300, filterEnd: 2600, type: 'bandpass', q: 2 })
  }

  beam() {
    this.tone({ freq: 720, freqEnd: 140, type: 'sawtooth', dur: 0.75, vol: 0.18, filter: 1800 })
    this.tone({ freq: 1400, freqEnd: 220, type: 'square', dur: 0.6, vol: 0.06, filter: 2600 })
    this.noise({ dur: 0.7, vol: 0.18, filter: 1800, filterEnd: 260, type: 'lowpass' })
  }

  explosion() {
    this.noise({ dur: 0.6, vol: 0.5, filter: 1200, filterEnd: 90 })
    this.tone({ freq: 90, freqEnd: 28, type: 'sine', dur: 0.7, vol: 0.5 })
    this.tone({ freq: 200, freqEnd: 50, type: 'sawtooth', dur: 0.3, vol: 0.12, filter: 600 })
  }

  flash() {
    this.tone({ freq: 1800, freqEnd: 3600, type: 'sine', dur: 0.4, vol: 0.18 })
    this.noise({ dur: 0.35, vol: 0.2, filter: 6000, type: 'highpass' })
  }

  teleport() {
    this.tone({ freq: 1300, freqEnd: 180, type: 'sine', dur: 0.24, vol: 0.16 })
    this.tone({ freq: 600, freqEnd: 1600, type: 'triangle', dur: 0.18, vol: 0.08, when: 0.1 })
  }

  transform(level = 1) {
    if (!this.ctx || !this.enabled) return
    const base = 130 + level * 12
    for (let i = 0; i < 7; i++) {
      this.tone({ freq: base * Math.pow(1.26, i), freqEnd: base * Math.pow(1.26, i) * 1.5, type: 'sawtooth', dur: 1.2 - i * 0.08, vol: 0.055, when: i * 0.055, filter: 2200 })
    }
    this.tone({ freq: 65, freqEnd: 42, type: 'sine', dur: 1.4, vol: 0.45 })
    this.noise({ dur: 1.3, vol: 0.32, filter: 500, filterEnd: 5000, type: 'bandpass', q: 0.7 })
    this.noise({ dur: 0.8, vol: 0.18, filter: 7000, type: 'highpass', when: 0.1 })
  }

  spirit() {
    if (!this.ctx || !this.enabled) return
    for (let i = 0; i < 10; i++) {
      this.tone({ freq: 400 + i * 110, freqEnd: 800 + i * 130, type: 'sine', dur: 1.6, vol: 0.04, when: i * 0.06 })
    }
  }

  ko() {
    this.tone({ freq: 220, freqEnd: 40, type: 'sawtooth', dur: 1.4, vol: 0.24, filter: 900 })
    this.tone({ freq: 110, freqEnd: 28, type: 'sine', dur: 1.6, vol: 0.3 })
    this.noise({ dur: 1.0, vol: 0.2, filter: 900, filterEnd: 120 })
  }

  victory() {
    if (!this.ctx || !this.enabled) return
    const notes = [261.6, 329.6, 392, 523.25, 659.25, 783.99]
    notes.forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 1.4, vol: 0.11, when: i * 0.12, filter: 4000 }))
    this.tone({ freq: 130.8, type: 'sine', dur: 2.2, vol: 0.18, when: 0.1 })
  }

  defeat() {
    const notes = [220, 196, 174.6, 146.8]
    notes.forEach((f, i) => this.tone({ freq: f, type: 'sawtooth', dur: 1.2, vol: 0.09, when: i * 0.24, filter: 700 }))
  }

  // -------------------------------------------------------------- music
  startMusic() {
    if (!this.ctx || this.startedMusic) return
    this.startedMusic = true
    this.nextNote = this.ctx.currentTime + 0.15
    this.musicTimer = setInterval(() => this.scheduleMusic(), 45)
  }

  scheduleMusic() {
    if (!this.ctx) return
    const ahead = 0.3
    while (this.nextNote < this.ctx.currentTime + ahead) {
      if (this.musicEnabled) this.playStep(this.step, this.nextNote - this.now())
      this.nextNote += 60 / this.bpm / 4
      this.step = (this.step + 1) % 32
    }
  }

  playStep(step, when) {
    const bar = Math.floor(step / 8) % 4
    const roots = [55, 43.65, 65.41, 49] // A F C G
    const chords = [
      [220, 261.63, 329.63],
      [174.61, 220, 261.63],
      [261.63, 329.63, 392],
      [196, 246.94, 293.66]
    ]
    const root = roots[bar]
    // Kick
    if (step % 4 === 0) {
      this.tone({ freq: 120, freqEnd: 42, type: 'sine', dur: 0.22, vol: 0.3, when, dest: this.music })
    }
    // Snare
    if (step % 8 === 4) {
      this.noise({ dur: 0.1, vol: 0.075, filter: 2400, filterEnd: 800, when, dest: this.music })
    }
    // Hats
    if (step % 2 === 1) {
      this.noise({ dur: 0.035, vol: 0.022, filter: 8000, type: 'highpass', when, dest: this.music })
    }
    // Bass pulse
    if (step % 2 === 0) {
      this.tone({ freq: root, type: 'sawtooth', dur: 0.14, vol: 0.11, when, filter: 240, dest: this.music })
    }
    // Arpeggio
    if (step % 2 === 0) {
      const chord = chords[bar]
      const note = chord[(step / 2) % 3]
      this.tone({ freq: note * 2, type: 'triangle', dur: 0.18, vol: 0.035, when, filter: 3200, dest: this.music })
    }
    // Pad at bar start
    if (step % 8 === 0) {
      const chord = chords[bar]
      chord.forEach((f, i) => {
        this.tone({ freq: f, type: 'sawtooth', dur: 1.25, vol: 0.018, when, filter: 900, detune: i * 5, dest: this.music })
      })
    }
    // Tension lines in higher forms
    if (this.formLevel >= 5 && step % 4 === 2) {
      this.tone({ freq: 880 + this.formLevel * 40, type: 'sine', dur: 0.1, vol: 0.012, when, dest: this.music })
    }
  }
}
