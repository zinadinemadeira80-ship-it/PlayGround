import { WORLD, FORMS, TECHNIQUES, ENEMIES, formatPower, formatNumber, formatTime } from './data.js'
import { AudioEngine } from './audio.js'
import { renderTitle, renderGame } from './render.js'
import { playerMethods } from './player.js'
import { enemyMethods } from './enemy.js'
import { combatMethods } from './combat.js'
import { eventMethods } from './events.js'

export const GRAVITY = 2550
export const JUMP_V = 920
export const GROUND = WORLD.ground
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const lerp = (a, b, t) => a + (b - a) * t
export const rand = (a, b) => a + Math.random() * (b - a)
export const choose = (arr) => arr[(Math.random() * arr.length) | 0]
export const sign = (v) => (v < 0 ? -1 : 1)

export function bodyBox(f) {
  const s = f.scale || 1
  return { x: f.x - 32 * s, y: f.y - 196 * s, w: 64 * s, h: 196 * s }
}

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

const $ = (id) => document.getElementById(id)

const FORM_ABBR = ['BASE', 'SSJ', 'SS2', 'SS3', 'SSG', 'SSB', 'KK×20', 'UI', 'MUI']

export class Game {
  constructor() {
    this.canvas = $('game')
    this.ctx = this.canvas.getContext('2d', { alpha: false })
    this.cw = 0
    this.ch = 0
    this.dpr = 1
    this.audio = new AudioEngine()
    this.keys = new Set()
    this.input = { x: 0, guard: false, charge: false, stickX: 0, stickY: 0, jumpLatch: false }
    this.last = performance.now()
    this.best = Number(localStorage.getItem('dbs_best') || 0)
    this.soundOn = localStorage.getItem('dbs_sound') !== 'off'
    this.helpReturn = 'title'
    this.timers = {}
    this.s = {
      mode: 'title',
      paused: false,
      time: 0,
      titleTime: 0,
      fightTime: 0,
      introTimer: 0,
      finishTimer: 0,
      finish: null,
      player: null,
      enemy: null,
      enemyIndex: 0,
      particles: [],
      rings: [],
      texts: [],
      afterimages: [],
      speedlines: [],
      projectiles: [],
      beams: [],
      hitboxes: [],
      telegraphs: [],
      combo: 0,
      comboTimer: 0,
      maxCombo: 0,
      camera: { x: 800, y: 520, scale: 1, shake: 0, shakeX: 0, shakeY: 0 },
      hitstop: 0,
      slowmo: 0,
      flash: 0,
      flashColor: '#ffffff',
      flashDecay: 4,
      readyNotified: false,
      damageDealt: 0,
      runTime: 0,
      fightDamage: 0,
      fightStartForm: 0,
      retryForm: 0,
      deaths: 0,
      lastResult: null
    }
    this.dom = {}
    this.cacheDom()
    this.resize()
    this.bindEvents()
    this.titleHero = this.makeTitleHero()
    this.updateSoundButton()
    this.updateBestLabel()
  }

  cacheDom() {
    const ids = [
      'hud', 'enemy-stage', 'enemy-power', 'enemy-name', 'enemy-title', 'enemy-hp-fill', 'enemy-hp-ghost',
      'stage-label', 'timer-label', 'form-badge', 'form-abbr', 'form-name', 'player-hp-fill', 'player-hp-ghost',
      'player-hp-text', 'player-ki-fill', 'player-power-fill', 'player-spirit-fill', 'player-power-level',
      'transform-hint', 'combo', 'combo-num', 'combo-timer', 'combo-timer-wrap', 'skillbar', 'toast',
      'enemy-card', 'ec-stage', 'ec-name', 'ec-title', 'ec-quote', 'announce', 'announce-main', 'announce-sub',
      'flash', 'screen-title', 'screen-help', 'screen-pause', 'screen-victory', 'screen-defeat', 'screen-complete',
      'best-stage', 'btn-sound', 'pause-form', 'victory-kicker', 'victory-sub', 'victory-damage', 'victory-combo',
      'victory-time', 'victory-form', 'next-card', 'next-name', 'next-title', 'btn-next', 'defeat-sub',
      'defeat-damage', 'defeat-combo', 'defeat-stage', 'defeat-form', 'complete-damage', 'complete-combo',
      'complete-time', 'complete-form', 'stick-ring', 'stick-knob', 'touch-controls',
      'btn-start', 'btn-help', 'btn-resume', 'btn-pause-help', 'btn-quit', 'btn-victory-quit',
      'btn-retry', 'btn-defeat-quit', 'btn-again', 'btn-complete-quit'
    ]
    for (const id of ids) this.dom[id] = $(id)
    this.skillButtons = Array.from(document.querySelectorAll('.skill'))
  }

  makeTitleHero() {
    return {
      kind: 'player', x: 1110, y: GROUND, facing: 1, scale: 1.16, form: 5, vx: 0, vy: 0,
      state: 'idle', stateT: 0, animT: 0, anim: 'idle', hp: 1000, maxHp: 1000, dead: false,
      grounded: true, blocking: false, hitFlash: 0, koT: 0, invuln: 0
    }
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.cw = window.innerWidth
    this.ch = window.innerHeight
    this.canvas.width = Math.floor(this.cw * this.dpr)
    this.canvas.height = Math.floor(this.ch * this.dpr)
    this.canvas.style.width = this.cw + 'px'
    this.canvas.style.height = this.ch + 'px'
  }

  start() {
    window.addEventListener('resize', () => this.resize())
    this.last = performance.now()
    this.loop = this.loop.bind(this)
    requestAnimationFrame(this.loop)
  }

  loop(now) {
    requestAnimationFrame(this.loop)
    const raw = Math.min((now - this.last) / 1000, 0.05)
    this.last = now
    if (!this.s.paused) {
      if (this.s.hitstop > 0) {
        this.s.hitstop -= raw
        this.updateEffects(raw * 0.2)
      } else {
        let scale = 1
        if (this.s.slowmo > 0) {
          scale = 0.3
          this.s.slowmo -= raw
        }
        this.update(raw * scale)
      }
    }
    this.updateCamera(raw)
    if (this.s.mode === 'title') renderTitle(this)
    else renderGame(this)
    this.updateUI()
  }

  update(dt) {
    const s = this.s
    s.time += dt
    s.titleTime += dt
    if (s.mode === 'title') {
      this.updateEffects(dt)
      return
    }
    if (s.combo > 0) {
      s.comboTimer -= dt
      if (s.comboTimer <= 0) s.combo = 0
    }
    if (s.mode === 'intro') {
      s.introTimer -= dt
      this.updateEffects(dt)
      this.stepFighterPhysics(s.player, dt)
      this.stepFighterPhysics(s.enemy, dt)
      if (s.introTimer <= 0) {
        s.mode = 'fight'
        this.announce('FIGHT!', 'SHOW ME YOUR TRUE POWER', 1.5)
        this.audio.ui()
      }
      return
    }
    if (s.mode === 'fight') {
      this.readInput()
      if (!s.finish) s.fightTime += dt
      s.runTime += dt
      this.updatePlayer(dt)
      this.updateEnemy(dt)
      this.updateCombat(dt)
      this.updateEffects(dt)
      if (s.finishTimer > 0) {
        s.finishTimer -= dt
        if (s.finishTimer <= 0) this.showResult(s.finish)
      }
      return
    }
    this.updateEffects(dt)
  }

  updateEffects(dt) {
    const s = this.s
    for (let i = s.particles.length - 1; i >= 0; i--) {
      const p = s.particles[i]
      p.life -= dt
      if (p.life <= 0) { s.particles.splice(i, 1); continue }
      p.vy += (p.gravity ?? 0) * dt
      p.vx *= Math.pow(p.drag ?? 0.6, dt)
      p.vy *= Math.pow(p.drag ?? 0.6, dt)
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.floor && p.y > p.floor) { p.y = p.floor; p.vy *= -0.25; p.vx *= 0.7 }
    }
    for (let i = s.rings.length - 1; i >= 0; i--) {
      const r = s.rings[i]
      r.life -= dt
      r.t += dt
      if (r.life <= 0) s.rings.splice(i, 1)
    }
    for (let i = s.texts.length - 1; i >= 0; i--) {
      const t = s.texts[i]
      t.life -= dt
      t.y += t.vy * dt
      t.vy *= Math.pow(0.3, dt)
      if (t.life <= 0) s.texts.splice(i, 1)
    }
    for (let i = s.afterimages.length - 1; i >= 0; i--) {
      const a = s.afterimages[i]
      a.life -= dt
      if (a.life <= 0) s.afterimages.splice(i, 1)
    }
    for (let i = s.speedlines.length - 1; i >= 0; i--) {
      const l = s.speedlines[i]
      l.life -= dt
      if (l.life <= 0) s.speedlines.splice(i, 1)
    }
    if (s.flash > 0) s.flash = Math.max(0, s.flash - dt * s.flashDecay)
    const shake = s.camera.shake
    if (shake > 0.05) {
      s.camera.shake *= Math.pow(0.12, dt)
      s.camera.shakeX = rand(-shake, shake)
      s.camera.shakeY = rand(-shake, shake)
    } else {
      s.camera.shake = 0
      s.camera.shakeX = 0
      s.camera.shakeY = 0
    }
    if (s.readyNotified) s.readyNotified = s.player && s.player.power < 99.5 ? false : s.readyNotified
  }

  readInput() {
    const k = this.keys
    const left = k.has('a') || k.has('arrowleft')
    const right = k.has('d') || k.has('arrowright')
    let x = (right ? 1 : 0) - (left ? 1 : 0)
    x += this.input.stickX
    this.input.x = clamp(x, -1, 1)
    this.input.guard = k.has('s') || k.has('arrowdown') || this.input.stickY > 0.45
    this.input.charge = k.has('e') || this.input.chargeTouch
  }

  startGame() {
    this.audio.init()
    this.audio.setEnabled(this.soundOn)
    this.audio.setMusicEnabled(this.soundOn)
    this.audio.ui()
    this.resetRun()
    this.hideScreens()
    this.dom.hud.classList.add('on')
    this.startFight(0)
  }

  resetRun() {
    const s = this.s
    s.player = this.createPlayer()
    s.enemy = null
    s.enemyIndex = 0
    s.particles.length = 0
    s.rings.length = 0
    s.texts.length = 0
    s.afterimages.length = 0
    s.speedlines.length = 0
    s.projectiles.length = 0
    s.beams.length = 0
    s.hitboxes.length = 0
    s.telegraphs.length = 0
    s.combo = 0
    s.comboTimer = 0
    s.maxCombo = 0
    s.damageDealt = 0
    s.runTime = 0
    s.deaths = 0
    s.finish = null
    s.finishTimer = 0
    s.slowmo = 0
    s.paused = false
    s.mode = 'title'
  }

  createPlayer() {
    return {
      kind: 'player', x: 550, y: GROUND, vx: 0, vy: 0, facing: 1, scale: 1.02,
      form: 0, hp: 1000, maxHp: 1000, ki: 100, maxKi: 100, power: 30, spirit: 30,
      state: 'idle', stateT: 0, anim: 'idle', animT: 0, hitstun: 0, invuln: 0,
      blocking: false, dead: false, grounded: true, jumps: 0, dashT: 0, dashCd: 0,
      attackT: 0, attackDuration: 0, attackHitAt: 0, attackHit: false, attackKind: 'light',
      chain: 0, castT: 0, beamHold: 0, beamT: 0, skillId: null, skillT: 0, skillDuration: 0,
      skillDone: false, cooldowns: [0, 0, 0, 0], critWindow: 0, dodgeCd: 0, koT: 0,
      hitFlash: 0, guardFlash: 0, formFx: 0, chargeT: 0, afterimageCd: 0, spiritCharge: 0,
      landDust: 0, lastBeamRatio: 0
    }
  }

  createEnemy(def, index) {
    return {
      kind: 'enemy', def, name: def.name, title: def.title, x: 1060, y: GROUND, vx: 0, vy: 0,
      facing: -1, scale: def.scale || 1, hp: def.hp, maxHp: def.hp, damage: def.damage, speed: def.speed,
      state: 'idle', stateT: 0, anim: 'idle', animT: 0, hitstun: 0, invuln: 0, blocking: false,
      dead: false, grounded: true, koT: 0, hitFlash: 0, guardFlash: 0, formFx: 0, afterimageCd: 0,
      attackT: 0, attackDuration: 0, attackHitAt: 0, attackHit: false, attackKind: 'light',
      special: null, specialT: 0, specialFired: false, specialCd: 2.6 + index * 0.3,
      attackCd: 0.9 + Math.random() * 0.7, kiCd: 1.6 + Math.random(), guardCd: 1.6,
      jumpCd: 0, guardT: 0, dashT: 0,
      think: 0.4, attackName: null, enraged: false, aggression: 0.48 + index * 0.06,
      auraPulse: Math.random() * 6, lastSpecial: null, aiDir: 0, recoil: 0
    }
  }

  startFight(index, retry = false) {
    const s = this.s
    const def = ENEMIES[index]
    s.enemyIndex = index
    if (!s.player) s.player = this.createPlayer()
    const p = s.player
    if (retry) p.form = s.fightStartForm
    const ratio = p.maxHp ? p.hp / p.maxHp : 1
    p.maxHp = 1000 + p.form * 55
    if (index === 0 && !retry) p.hp = p.maxHp
    else if (retry) p.hp = p.maxHp
    else p.hp = Math.min(p.maxHp, Math.max(p.hp, p.maxHp * ratio) + p.maxHp * 0.44)
    p.ki = p.maxKi
    p.spirit = Math.max(24, p.spirit)
    p.power = index === 0 ? 35 : Math.min(100, Math.max(28, p.power))
    p.x = 545
    p.y = GROUND
    p.vx = 0
    p.vy = 0
    p.facing = 1
    p.dead = false
    p.hitstun = 0
    p.invuln = 1.2
    p.blocking = false
    p.state = 'idle'
    p.anim = 'idle'
    p.animT = 0
    p.attackT = 0
    p.beamHold = 0
    p.beamT = 0
    p.dashT = 0
    p.dashCd = 0
    p.castT = 0
    p.skillId = null
    p.critWindow = 0
    p.koT = 0
    p.formFx = 0
    p.cooldowns = [0, 0, 0, 0]
    s.enemy = this.createEnemy(def, index)
    s.fightStartForm = p.form
    s.retryForm = p.form
    s.fightTime = 0
    s.fightDamage = 0
    s.combo = 0
    s.comboTimer = 0
    s.readyNotified = false
    s.finish = null
    s.finishTimer = 0
    s.slowmo = 0
    s.projectiles.length = 0
    s.beams.length = 0
    s.hitboxes.length = 0
    s.telegraphs.length = 0
    s.afterimages.length = 0
    s.mode = 'intro'
    s.introTimer = 2.65
    s.paused = false
    this.hideScreens()
    this.dom.hud.classList.add('on')
    this.audio.setForm(p.form)
    this.setFighterUI()
    this.showEnemyCard(def, index)
    if (index === 0 && !retry) {
      this.toast('HOLD  E  TO CHARGE · PRESS  Q  TO TRANSFORM', 4.3)
    }
  }

  setFighterUI() {
    const s = this.s
    if (!s.enemy) return
    const def = s.enemy.def
    this.dom['enemy-name'].textContent = def.name
    this.dom['enemy-title'].textContent = def.title
    this.dom['enemy-stage'].textContent = `STAGE ${s.enemyIndex + 1} · ${def.stage}`
    this.dom['enemy-power'].textContent = `POWER ${formatPower(def.powerLevel)}`
    this.dom['stage-label'].textContent = `STAGE ${s.enemyIndex + 1} / ${ENEMIES.length}`
    const f = FORMS[s.player.form]
    this.dom['form-name'].textContent = f.name
    this.dom['form-abbr'].textContent = FORM_ABBR[s.player.form]
    this.dom['form-badge'].style.setProperty('--form-color', f.aura2)
  }

  activeForm() {
    return FORMS[this.s.player?.form || 0]
  }

  canAct(p) {
    if (!p || p.dead || p.hitstun > 0 || p.state === 'ko' || p.state === 'hurt') return false
    return !['attack', 'dash', 'beam', 'skill', 'transform', 'cast'].includes(p.state)
  }

  canTransform() {
    const p = this.s.player
    return p && !p.dead && p.hitstun <= 0 && !['ko', 'hurt', 'beam', 'skill', 'transform'].includes(p.state)
  }

  playerTransform() {
    const p = this.s.player
    if (!p || this.s.mode !== 'fight') return
    if (!this.canTransform()) return
    if (p.form >= FORMS.length - 1) {
      this.toast('MASTERED ULTRA INSTINCT IS THE LIMIT', 2.2)
      return
    }
    if (p.power < 99.5) {
      this.toast(`POWER ${Math.round(p.power)}% — HOLD ${this.isTouch() ? 'POWER' : 'E'} TO CHARGE`, 2.2)
      return
    }
    this.setForm(p.form + 1)
  }

  setForm(index) {
    const s = this.s
    const p = s.player
    const oldMax = p.maxHp
    const ratio = clamp(p.hp / oldMax, 0, 1)
    const form = FORMS[index]
    p.form = index
    p.maxHp = 1000 + index * 55
    p.hp = Math.min(p.maxHp, p.maxHp * Math.max(ratio, 0.5) + p.maxHp * 0.18)
    p.power = 0
    p.ki = Math.min(p.maxKi, p.ki + 42)
    p.invuln = Math.max(p.invuln, 1.05)
    p.state = 'transform'
    p.stateT = 0
    p.anim = 'transform'
    p.animT = 0
    p.formFx = 1.5
    p.blocking = false
    s.readyNotified = false
    this.audio.transform(index)
    this.audio.setForm(index)
    this.flash(form.aura2, 0.82, 3.2)
    this.shake(28)
    this.ring(p.x, p.y - 105, { max: 210, life: 0.8, color: form.aura2, width: 7 })
    this.ring(p.x, p.y - 105, { max: 120, life: 0.5, color: '#ffffff', width: 3 })
    this.burst(p.x, p.y - 110, 48, { colors: [form.aura, form.aura2, '#ffffff'], speed: 520, size: 5, life: 0.9, gravity: -20 })
    this.burst(p.x, p.y - 10, 28, { colors: [form.aura, '#ffe9a8'], speed: 260, size: 4, life: 0.7, gravity: -60 })
    this.announce(form.name, form.tag, 2.3)
    this.setFighterUI()
    const e = s.enemy
    if (e && !e.dead && Math.abs(e.x - p.x) < 400) {
      e.state = 'hurt'
      e.hitstun = Math.max(e.hitstun, 0.7)
      e.vx = sign(e.x - p.x) * 290
      e.vy -= 120
      e.attackName = null
      e.special = null
      this.textPop(e.x, e.y - 205, 'BLASTED BACK', '#ffe98a', 16)
      this.burst(e.x, e.y - 100, 20, { colors: [form.aura2, '#ffffff'], speed: 350, size: 4, life: 0.6 })
    }
  }

  updateUI() {
    const s = this.s
    if (s.mode === 'title' || !s.player || !s.enemy) return
    const p = s.player
    const e = s.enemy
    const form = FORMS[p.form]
    const hpPct = clamp(p.hp / p.maxHp, 0, 1) * 100
    const kiPct = clamp(p.ki / p.maxKi, 0, 1) * 100
    const powerPct = clamp(p.power / 100, 0, 1) * 100
    const spiritPct = clamp(p.spirit / 100, 0, 1) * 100
    const ehpPct = clamp(e.hp / e.maxHp, 0, 1) * 100
    this.setBar('player-hp-fill', hpPct)
    this.setBar('player-hp-ghost', hpPct)
    this.setBar('player-ki-fill', kiPct)
    this.setBar('player-power-fill', powerPct)
    this.setBar('player-spirit-fill', spiritPct)
    this.setBar('enemy-hp-fill', ehpPct)
    this.setBar('enemy-hp-ghost', ehpPct)
    const hpBar = this.dom['player-hp-fill'].parentElement
    hpBar.classList.toggle('low', hpPct < 28)
    const powerBar = this.dom['player-power-fill'].parentElement
    powerBar.classList.toggle('ready', p.power >= 99.5 && p.form < FORMS.length - 1)
    if (this._hpText !== Math.ceil(p.hp)) {
      this._hpText = Math.ceil(p.hp)
      this.dom['player-hp-text'].textContent = Math.ceil(p.hp)
    }
    const pl = formatPower(form.powerLevel * (1 + p.power / 260))
    if (this._pl !== pl) {
      this._pl = pl
      this.dom['player-power-level'].textContent = pl
    }
    this.dom['form-name'].textContent = form.name
    this.dom['form-abbr'].textContent = FORM_ABBR[p.form]
    this.dom['form-badge'].style.setProperty('--form-color', form.aura2)
    this.dom['timer-label'].textContent = formatTime(s.fightTime)
    let hint
    if (p.form >= FORMS.length - 1) hint = 'MAXIMUM FORM · ULTRA INSTINCT MASTERED'
    else if (p.power >= 99.5) hint = `POWER FULL · ${this.isTouch() ? 'TAP POWER' : 'PRESS Q'} TO ASCEND`
    else hint = this.isTouch() ? 'HOLD POWER · TAP WHEN FULL TO ASCEND' : 'HOLD E TO CHARGE · Q TO ASCEND'
    if (this._hint !== hint) {
      this._hint = hint
      this.dom['transform-hint'].textContent = hint
    }
    this.dom.combo.classList.toggle('on', s.combo > 1)
    this.dom['combo-timer-wrap'].classList.toggle('on', s.combo > 1)
    if (this._combo !== s.combo) {
      this._combo = s.combo
      this.dom['combo-num'].textContent = s.combo
      this.dom['combo-timer'].style.width = '100%'
    }
    if (s.combo > 0) this.dom['combo-timer'].style.width = `${clamp(s.comboTimer / 2.3, 0, 1) * 100}%`
    for (let i = 0; i < this.skillButtons.length; i++) {
      const btn = this.skillButtons[i]
      const tech = TECHNIQUES[i]
      const locked = p.form < tech.minForm
      const cd = p.cooldowns[i]
      btn.classList.toggle('locked', locked)
      const ready = !locked && cd <= 0 && p.ki >= tech.cost && (!tech.spirit || p.spirit >= tech.spirit)
      btn.classList.toggle('ready', ready)
      btn.classList.toggle('pulse', !locked && tech.spirit && p.spirit >= 100 && cd <= 0)
      const cdEl = btn.querySelector('.skill-cd')
      if (cdEl) cdEl.style.setProperty('--cd', `${clamp(cd / tech.cooldown, 0, 1) * 100}%`)
    }
    const touchPower = document.querySelector('.tact[data-act="power"]')
    if (touchPower) {
      touchPower.classList.toggle('full', p.power >= 99.5 && p.form < FORMS.length - 1)
      touchPower.textContent = p.power >= 99.5 && p.form < FORMS.length - 1 ? 'ASCEND' : 'POWER'
    }
  }

  setBar(id, pct) {
    const el = this.dom[id]
    if (!el) return
    const key = '_bar_' + id
    if (this[key] !== pct) {
      this[key] = pct
      el.style.width = pct.toFixed(2) + '%'
    }
  }

  isTouch() {
    return document.body.classList.contains('touch')
  }

  announce(main, sub = '', duration = 2) {
    const el = this.dom.announce
    this.dom['announce-main'].textContent = main
    this.dom['announce-sub'].textContent = sub
    el.classList.remove('show')
    void el.offsetWidth
    el.style.animationDuration = duration + 's'
    el.classList.add('show')
  }

  toast(text, duration = 2.5) {
    const el = this.dom.toast
    el.textContent = text
    el.classList.remove('show')
    void el.offsetWidth
    el.classList.add('show')
    clearTimeout(this.timers.toast)
    this.timers.toast = setTimeout(() => el.classList.remove('show'), duration * 1000)
  }

  flash(color, strength = 0.6, decay = 4) {
    this.s.flashColor = color
    this.s.flash = Math.max(this.s.flash, strength)
    this.s.flashDecay = decay
  }

  showEnemyCard(def, index) {
    const el = this.dom['enemy-card']
    this.dom['ec-stage'].textContent = `STAGE ${index + 1} OF ${ENEMIES.length} · ${def.stage}`
    this.dom['ec-name'].textContent = def.name
    this.dom['ec-title'].textContent = def.title
    this.dom['ec-quote'].textContent = def.quote
    el.classList.remove('hidden', 'show')
    void el.offsetWidth
    el.classList.add('show')
    clearTimeout(this.timers.enemyCard)
    this.timers.enemyCard = setTimeout(() => el.classList.add('hidden'), 3100)
  }

  hideScreens() {
    for (const id of ['screen-title', 'screen-help', 'screen-pause', 'screen-victory', 'screen-defeat', 'screen-complete']) {
      const el = this.dom[id]
      if (el) el.classList.add('hidden')
    }
  }

  showOnly(id) {
    this.hideScreens()
    const el = this.dom[id]
    if (el) el.classList.remove('hidden')
  }

  pause() {
    if (this.s.mode !== 'fight' || this.s.paused) return
    this.s.paused = true
    this.dom['pause-form'].textContent = FORMS[this.s.player.form].name
    this.showOnly('screen-pause')
    this.audio.ui()
  }

  resume() {
    if (!this.s.paused) return
    this.s.paused = false
    this.hideScreens()
    this.dom.hud.classList.add('on')
    this.audio.ui()
  }

  togglePause() {
    if (this.s.mode !== 'fight') return
    if (this.s.paused) this.resume()
    else this.pause()
  }

  quitToTitle() {
    const s = this.s
    s.paused = false
    s.mode = 'title'
    s.player = null
    s.enemy = null
    s.finish = null
    s.projectiles.length = 0
    s.beams.length = 0
    s.hitboxes.length = 0
    s.telegraphs.length = 0
    s.afterimages.length = 0
    this.dom.hud.classList.remove('on')
    this.showOnly('screen-title')
    this.updateBestLabel()
    this.audio.ui()
  }

  openHelp(from) {
    this.helpReturn = from
    if (from === 'title') {
      this.showOnly('screen-help')
    } else {
      this.showOnly('screen-help')
    }
    this.audio.ui()
  }

  closeHelp() {
    if (this.helpReturn === 'pause') {
      this.showOnly('screen-pause')
    } else {
      this.showOnly('screen-title')
    }
    this.audio.ui()
  }

  updateBestLabel() {
    const el = this.dom['best-stage']
    if (!el) return
    if (this.best >= ENEMIES.length) el.textContent = 'BEST: MULTIVERSE CHAMPION'
    else if (this.best > 0) el.textContent = `BEST: STAGE ${this.best + 1}`
    else el.textContent = 'BEST: NO RUN YET'
  }

  recordBest(value) {
    if (value > this.best) {
      this.best = Math.min(value, ENEMIES.length)
      localStorage.setItem('dbs_best', String(this.best))
      this.updateBestLabel()
    }
  }

  updateSoundButton() {
    if (!this.dom['btn-sound']) return
    this.dom['btn-sound'].textContent = this.soundOn ? 'SOUND ON' : 'SOUND OFF'
  }

  toggleSound() {
    this.soundOn = !this.soundOn
    localStorage.setItem('dbs_sound', this.soundOn ? 'on' : 'off')
    this.audio.setEnabled(this.soundOn)
    this.audio.setMusicEnabled(this.soundOn)
    this.audio.init()
    this.updateSoundButton()
    if (this.soundOn) this.audio.ui()
  }

  showResult(kind) {
    const s = this.s
    s.mode = kind
    s.paused = false
    this.dom.hud.classList.remove('on')
    if (kind === 'victory') {
      const last = s.enemyIndex >= ENEMIES.length - 1
      this.recordBest(s.enemyIndex + 1)
      this.dom['victory-kicker'].textContent = last ? 'FINAL STAGE CLEAR' : `STAGE ${s.enemyIndex + 1} CLEAR`
      this.dom['victory-sub'].textContent = `${s.enemy.name} DEFEATED`
      this.dom['victory-damage'].textContent = formatNumber(s.fightDamage)
      this.dom['victory-combo'].textContent = s.maxCombo
      this.dom['victory-time'].textContent = formatTime(s.fightTime)
      this.dom['victory-form'].textContent = FORMS[s.player.form].name
      if (last) {
        this.dom['next-card'].classList.remove('hidden')
        this.dom['next-name'].textContent = 'THE MULTIVERSE IS SAFE'
        this.dom['next-title'].textContent = 'JIREN HAS FALLEN'
        this.dom['btn-next'].textContent = 'FINISH THE STORY'
      } else {
        const next = ENEMIES[s.enemyIndex + 1]
        this.dom['next-card'].classList.remove('hidden')
        this.dom['next-name'].textContent = next.name
        this.dom['next-title'].textContent = next.title
        this.dom['btn-next'].textContent = 'NEXT BATTLE'
      }
      this.showOnly('screen-victory')
      this.audio.victory()
    } else {
      // A defeat records only the stages actually cleared.
      this.recordBest(s.enemyIndex)
      s.deaths++
      this.dom['defeat-sub'].textContent = `${s.enemy.name} STANDS VICTORIOUS`
      this.dom['defeat-damage'].textContent = formatNumber(s.fightDamage)
      this.dom['defeat-combo'].textContent = s.maxCombo
      this.dom['defeat-stage'].textContent = `STAGE ${s.enemyIndex + 1}`
      this.dom['defeat-form'].textContent = FORMS[s.player.form].name
      this.showOnly('screen-defeat')
      this.audio.defeat()
    }
  }

  showComplete() {
    const s = this.s
    s.mode = 'complete'
    this.dom.hud.classList.remove('on')
    this.recordBest(ENEMIES.length)
    this.dom['complete-damage'].textContent = formatNumber(s.damageDealt)
    this.dom['complete-combo'].textContent = s.maxCombo
    this.dom['complete-time'].textContent = formatTime(s.runTime)
    this.dom['complete-form'].textContent = FORMS[s.player.form].name
    this.showOnly('screen-complete')
    this.audio.victory()
  }

  updateCamera(dt) {
    const s = this.s
    const cam = s.camera
    let targetX = 800
    let targetY = 470
    let targetScale = 1
    if (s.mode === 'title') {
      targetX = 900
      targetScale = clamp(this.ch / 900, 0.7, 1.1)
      if (this.cw / this.ch < 0.9) targetX = 930
    } else if (s.player && s.enemy) {
      const mid = (s.player.x + s.enemy.x) / 2
      const sep = Math.abs(s.player.x - s.enemy.x)
      const fitW = this.cw / (sep + 470)
      const fitH = this.ch / 710
      let scale = Math.min(fitW, fitH)
      scale = clamp(scale, 0.47, 1.18)
      if (this.ch / this.cw > 1.25) scale = Math.max(scale, 0.54)
      if (s.finish === 'victory') scale *= 1.08
      targetScale = scale
      targetX = mid
    }
    const k = 1 - Math.exp(-dt * 5.5)
    cam.x = lerp(cam.x, targetX, k)
    cam.scale = lerp(cam.scale, targetScale, k)
    const viewH = this.ch / cam.scale
    const viewW = this.cw / cam.scale
    targetY = GROUND - viewH * 0.36
    cam.y = lerp(cam.y, targetY, k)
    const half = viewW / 2
    if (viewW >= WORLD.width) cam.x = WORLD.width / 2
    else cam.x = clamp(cam.x, half, WORLD.width - half)
    if (viewH >= WORLD.height) cam.y = WORLD.height / 2 - 20
  }
}

Object.assign(Game.prototype, playerMethods, enemyMethods, combatMethods, eventMethods)
