import { WORLD, FORMS, formatNumber } from './data.js'
import { GROUND, GRAVITY, bodyBox, overlap, clamp, rand, sign } from './game.js'

export const combatMethods = {
  stepFighterPhysics(f, dt) {
    if (!f) return
    const wasAir = !f.grounded
    if (!f.grounded) {
      f.vy += GRAVITY * dt
      f.y += f.vy * dt
      if (f.y >= GROUND) {
        f.y = GROUND
        f.vy = 0
        f.grounded = true
        f.jumps = 0
        if (wasAir && !f.dead) {
          this.burst(f.x, GROUND - 2, 8, { colors: ['#cdb99c', '#8d7a63'], speed: 140, size: 4, life: 0.35, gravity: 260, dir: Math.PI / 2, spread: 1.7 })
          if (f.kind === 'player' && f.state === 'jump') f.state = 'idle'
        }
      }
    }
    f.x += f.vx * dt
    if (f.grounded) f.vx *= Math.pow(0.18, dt)
    else f.vx *= Math.pow(0.55, dt)
    if (f.x < WORLD.left + 20) { f.x = WORLD.left + 20; f.vx = Math.abs(f.vx) * 0.2 }
    if (f.x > WORLD.right - 20) { f.x = WORLD.right - 20; f.vx = -Math.abs(f.vx) * 0.2 }
    if (f.y > GROUND) { f.y = GROUND; f.vy = 0; f.grounded = true }
    if (f.hitFlash > 0) f.hitFlash -= dt
    if (f.guardFlash > 0) f.guardFlash -= dt
    if (f.formFx > 0) f.formFx -= dt
    if (f.koT !== undefined) f.koT += dt
  },

  updateCombat(dt) {
    const s = this.s
    for (let i = s.hitboxes.length - 1; i >= 0; i--) {
      const h = s.hitboxes[i]
      h.life -= dt
      if (h.life <= 0) { s.hitboxes.splice(i, 1); continue }
      const target = h.side === 'player' ? s.enemy : s.player
      if (!target || target.dead) continue
      const box = { x: h.x - h.w / 2, y: h.y - h.h / 2, w: h.w, h: h.h }
      if (overlap(box, bodyBox(target))) {
        const hit = this.damageFighter(target, h.damage, {
          source: h.owner, stun: h.stun, knock: h.knock, lift: h.lift,
          crit: h.crit, unblockable: h.unblockable, aoe: h.aoe
        })
        if (hit && !h.pierce) s.hitboxes.splice(i, 1)
      }
    }
    for (let i = s.projectiles.length - 1; i >= 0; i--) {
      const p = s.projectiles[i]
      p.life -= dt
      p.trailTimer = (p.trailTimer || 0) - dt
      p.vy += (p.gravity || 0) * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.spin = (p.spin || 0) + dt * 8
      if (p.trailTimer <= 0) {
        p.trailTimer = 0.025
        this.burst(p.x, p.y, 1, { colors: [p.color, p.color2 || '#ffffff'], speed: 30, size: p.r * 0.8, life: 0.28, gravity: -15, glow: true })
      }
      const target = p.side === 'player' ? s.enemy : s.player
      let hit = false
      if (target && !target.dead) {
        const tb = bodyBox(target)
        if (p.x + p.r > tb.x && p.x - p.r < tb.x + tb.w && p.y + p.r > tb.y && p.y - p.r < tb.y + tb.h) {
          this.damageFighter(target, p.damage, {
            source: p.owner, stun: p.stun || 0.32, knock: p.knock || 180,
            unblockable: p.unblockable, crit: p.crit
          })
          hit = true
        }
      }
      const groundHit = p.y + p.r >= GROUND && p.kind !== 'spirit'
      if (hit || p.life <= 0 || groundHit || p.x < WORLD.left - 100 || p.x > WORLD.right + 100) {
        if (p.explode) this.projectileExplosion(p)
        s.projectiles.splice(i, 1)
      }
    }
    for (let i = s.beams.length - 1; i >= 0; i--) {
      const b = s.beams[i]
      b.life -= dt
      b.tick -= dt
      const o = b.owner
      if (!o) { s.beams.splice(i, 1); continue }
      b.x = o.x + o.facing * 56
      b.y = o.y - 126
      b.dir = o.facing
      if (o.hitstun > 0.12 || o.dead) b.life = Math.min(b.life, 0.08)
      const target = b.side === 'player' ? s.enemy : s.player
      if (target && !target.dead && b.tick <= 0) {
        const tb = bodyBox(target)
        const inFront = (target.x - b.x) * b.dir > -18
        const vert = tb.y < b.y + b.height / 2 && tb.y + tb.h > b.y - b.height / 2
        if (inFront && vert) {
          b.tick = 0.115
          this.damageFighter(target, b.damage, {
            source: o, stun: b.stun || 0.22, knock: b.knock || 80,
            unblockable: false, sound: b.firstTick ? 'beam' : 'hit'
          })
          b.firstTick = false
          this.burst(b.x + b.dir * 60, b.y + rand(-b.height / 3, b.height / 3), 4, {
            colors: [b.color, '#ffffff'], speed: 260, size: 5, life: 0.25, glow: true, dir: b.dir > 0 ? 0 : Math.PI, spread: 1.1
          })
        }
      }
      if (b.life <= 0) {
        this.ring(b.x + b.dir * 60, b.y, { max: 120, life: 0.3, color: b.color, width: 4 })
        s.beams.splice(i, 1)
      }
    }
    for (let i = s.telegraphs.length - 1; i >= 0; i--) {
      const t = s.telegraphs[i]
      t.t += dt
      if (t.t >= t.max) {
        if (!t.fired) {
          t.fired = true
          const target = t.side === 'player' ? s.enemy : s.player
          if (target && !target.dead) {
            const tb = bodyBox(target)
            if (tb.x < t.x + t.radius && tb.x + tb.w > t.x - t.radius) {
              this.damageFighter(target, t.damage, {
                source: t.owner, stun: t.stun || 0.4, knock: t.knock || 260,
                unblockable: t.unblockable, crit: false
              })
            }
          }
          this.burst(t.x, GROUND - 12, 34, { colors: [t.color, '#ffffff', '#ffd28a'], speed: 480, size: 6, life: 0.8, gravity: 300, floor: GROUND })
          this.ring(t.x, GROUND - 8, { max: t.radius, life: 0.65, color: t.color, width: 8 })
          this.ring(t.x, GROUND - 8, { max: t.radius * 0.72, life: 0.45, color: '#ffffff', width: 3 })
          this.shake(20)
          this.audio.explosion()
        }
        if (t.t >= t.max + 0.2) s.telegraphs.splice(i, 1)
      }
    }
  },

  spawnHitbox(owner, opts) {
    const dir = owner.facing
    const scale = owner.scale || 1
    const h = {
      owner, side: owner.kind, life: opts.life || 0.12,
      x: opts.x ?? owner.x + dir * (opts.range || 84) * scale,
      y: opts.y ?? owner.y - (opts.heightY || 128) * scale,
      w: (opts.w || 100) * scale, h: (opts.h || 84) * scale,
      damage: opts.damage, stun: opts.stun, knock: opts.knock, lift: opts.lift,
      crit: !!opts.crit, unblockable: !!opts.unblockable, pierce: !!opts.pierce
    }
    this.s.hitboxes.push(h)
    return h
  },

  spawnProjectile(owner, opts) {
    const dir = opts.dir ?? owner.facing
    const p = {
      owner, side: owner.kind, x: opts.x, y: opts.y,
      vx: opts.vx ?? dir * 900, vy: opts.vy ?? 0,
      r: opts.r || 16, damage: opts.damage, color: opts.color || '#69e9ff',
      color2: opts.color2 || '#ffffff', life: opts.life || 2.4,
      gravity: opts.gravity || 0, kind: opts.kind || 'ki',
      stun: opts.stun, knock: opts.knock, explode: opts.explode || 0,
      unblockable: !!opts.unblockable, crit: !!opts.crit, spin: 0, trailTimer: 0
    }
    this.s.projectiles.push(p)
    this.burst(p.x, p.y, 6, { colors: [p.color, p.color2], speed: 130, size: 5, life: 0.3, glow: true })
    return p
  },

  spawnBeam(owner, opts) {
    const b = {
      owner, side: owner.kind, x: owner.x + owner.facing * 56, y: owner.y - 126,
      dir: owner.facing, life: opts.life || 0.72, maxLife: opts.life || 0.72,
      tick: 0, firstTick: true, damage: opts.damage,
      color: opts.color || '#69e9ff', color2: opts.color2 || '#ffffff',
      width: opts.width || 52, height: opts.height || 68,
      stun: opts.stun || 0.2, knock: opts.knock || 100
    }
    this.s.beams.push(b)
    this.shake(12)
    this.ring(b.x, b.y, { max: 100, life: 0.35, color: b.color, width: 5 })
    this.burst(b.x, b.y, 22, { colors: [b.color, b.color2], speed: 360, size: 5, life: 0.45, glow: true, dir: owner.facing > 0 ? 0 : Math.PI, spread: 1.2 })
    return b
  },

  spawnTelegraph(owner, opts) {
    this.s.telegraphs.push({
      owner, side: owner.kind, x: opts.x ?? owner.x, y: GROUND,
      radius: opts.radius || 260, t: 0, max: opts.time || 1.2,
      damage: opts.damage, color: opts.color || '#ff6450',
      stun: opts.stun, knock: opts.knock, unblockable: !!opts.unblockable,
      label: opts.label || null, fired: false
    })
  },

  damageFighter(target, raw, opts = {}) {
    const s = this.s
    if (!target || target.dead || target.invuln > 0 || s.finish) return false
    const source = opts.source
    let dmg = Math.max(1, raw)
    let blocked = false
    if (target.blocking && target.grounded && !opts.unblockable) {
      const fromFront = !source || sign(source.x - target.x) === target.facing
      if (fromFront) { blocked = true; dmg *= 0.16 }
    }
    if (opts.crit) dmg *= 1.9
    const dir = source ? sign(target.x - source.x) : -target.facing
    let dodged = false
    if (target.kind === 'player' && !blocked && !opts.unblockable) {
      const form = FORMS[target.form]
      if (target.form >= 5 && target.dodgeCd <= 0 && Math.random() < form.dodge) {
        dodged = true
        target.invuln = Math.max(target.invuln, 0.38)
        target.dodgeCd = 1.35
        this.afterimage(target)
        this.burst(target.x, target.y - 105, 14, { colors: [form.aura2, '#ffffff'], speed: 240, size: 4, life: 0.4, glow: true })
        this.textPop(target.x, target.y - 218, 'EVADED', form.aura2, 15)
        this.audio.teleport()
      }
    }
    if (!dodged) {
      if (target.kind === 'player') {
        const form = FORMS[target.form]
        dmg /= form.defense
        target.hp -= dmg
        target.power = Math.min(100, target.power + dmg * 0.035)
        target.spirit = Math.min(100, target.spirit + dmg * 0.018)
        s.combo = 0
      } else {
        target.hp -= dmg
        s.damageDealt += dmg
        s.fightDamage += dmg
        s.combo++
        s.comboTimer = 2.3
        s.maxCombo = Math.max(s.maxCombo, s.combo)
        const p = s.player
        if (p) {
          p.power = Math.min(100, p.power + 2.1 + Math.min(4, s.combo * 0.12))
          p.spirit = Math.min(100, p.spirit + 0.75 + Math.min(2.4, s.combo * 0.05))
        }
        target.recoil = 0.25
      }
      target.hitFlash = 0.12
      target.hp = Math.max(0, target.hp)
      if (!blocked) {
        target.hitstun = Math.max(target.hitstun, opts.stun ?? 0.25)
        target.state = 'hurt'
        target.stateT = 0
        target.anim = 'hurt'
        target.animT = 0
        target.vx = dir * (opts.knock ?? 140)
        if (opts.lift) target.vy -= opts.lift
        target.blocking = false
        if (target.kind === 'enemy') {
          target.special = null
          target.attackName = null
        }
      } else {
        target.hitstun = Math.max(target.hitstun, 0.08)
        target.vx += dir * 34
        target.guardFlash = 0.2
      }
      const hy = target.y - 108 * (target.scale || 1)
      const hx = target.x - dir * 8
      if (blocked) {
        this.burst(hx, hy, 9, { colors: ['#8fdcff', '#ffffff', '#3a8bff'], speed: 250, size: 4, life: 0.3, glow: true })
        this.ring(hx, hy, { max: 48, life: 0.26, color: '#83d8ff', width: 3 })
        this.textPop(hx, hy - 28, 'GUARD', '#9fe6ff', 12)
        this.audio.block()
        this.s.hitstop = Math.max(s.hitstop, 0.025)
        this.shake(4)
      } else {
        this.burst(hx, hy, opts.crit ? 20 : 12, {
          colors: [target.kind === 'enemy' ? '#ffcf5a' : '#ff6470', '#ffffff', opts.crit ? '#ffe98a' : '#ffb15a'],
          speed: 320, size: 5, life: 0.35, glow: true
        })
        this.ring(hx, hy, { max: opts.crit ? 80 : 46, life: 0.28, color: opts.crit ? '#ffe98a' : '#ffb66a', width: opts.crit ? 5 : 3 })
        this.textPop(hx + rand(-12, 12), hy - 16, (opts.crit ? 'CRIT ' : '') + Math.round(dmg), opts.crit ? '#ffe066' : '#ffffff', opts.crit ? 21 : 15)
        this.audio[opts.sound === 'beam' ? 'beam' : opts.crit ? 'heavy' : 'hit']()
        this.s.hitstop = Math.max(s.hitstop, opts.crit ? 0.09 : Math.min(0.075, 0.03 + dmg / 3000))
        this.shake(opts.crit ? 14 : 7)
      }
      if (opts.crit && source && source.kind === 'player') source.critWindow = 0
      if (target.hp <= 0) this.knockOut(target, source)
    }
    return !dodged
  },

  knockOut(target, source) {
    const s = this.s
    if (target.dead) return
    target.dead = true
    target.state = 'ko'
    target.anim = 'ko'
    target.koT = 0
    target.hitstun = 999
    target.invuln = 999
    target.hp = 0
    target.blocking = false
    target.vx = sign(target.x - (source?.x ?? target.x)) * 300
    target.vy = -430
    target.grounded = false
    this.audio.ko()
    this.shake(30)
    this.flash('#ffffff', 0.55, 3)
    this.burst(target.x, target.y - 105, 54, {
      colors: target.kind === 'enemy' ? ['#ffe066', '#ff9a3c', '#ffffff'] : ['#ff5a70', '#ffb0b8', '#ffffff'],
      speed: 520, size: 6, life: 1, gravity: 160, floor: GROUND
    })
    this.ring(target.x, target.y - 100, { max: 230, life: 0.8, color: target.kind === 'enemy' ? '#ffe066' : '#ff5a70', width: 8 })
    s.slowmo = 1.35
    s.finishTimer = 3.2
    if (target.kind === 'enemy') {
      s.finish = 'victory'
      this.announce('K.O.', `${target.name} DEFEATED`, 2.5)
      if (s.player) {
        s.player.state = 'victory'
        s.player.vx = 0
      }
    } else {
      s.finish = 'defeat'
      this.announce('K.O.', 'YOUR KI HAS FADED', 2.5)
      if (s.enemy) s.enemy.state = 'victory'
    }
  },

  projectileExplosion(p) {
    const radius = p.explode
    this.ring(p.x, p.y, { max: radius, life: 0.65, color: p.color, width: 9 })
    this.ring(p.x, p.y, { max: radius * 0.62, life: 0.45, color: '#ffffff', width: 4 })
    this.burst(p.x, p.y, 40, { colors: [p.color, p.color2, '#ffffff', '#ffd28a'], speed: 500, size: 7, life: 0.9, gravity: 180, glow: true })
    this.flash(p.color, 0.25, 5)
    this.shake(20)
    this.audio.explosion()
    const s = this.s
    const target = p.side === 'player' ? s.enemy : s.player
    if (target && !target.dead) {
      const tb = bodyBox(target)
      const cx = clamp(p.x, tb.x, tb.x + tb.w)
      const cy = clamp(p.y, tb.y, tb.y + tb.h)
      const d = Math.hypot(cx - p.x, cy - p.y)
      if (d < radius) {
        this.damageFighter(target, p.damage * 0.7, {
          source: p.owner, stun: 0.5, knock: 320, lift: 160, unblockable: false
        })
      }
    }
  },

  burst(x, y, count, opts = {}) {
    const colors = opts.colors || ['#ffffff']
    const baseAngle = opts.dir ?? -Math.PI / 2
    const spread = opts.spread ?? Math.PI * 2
    for (let i = 0; i < count; i++) {
      const ang = baseAngle + rand(-spread / 2, spread / 2)
      const speed = (opts.speed || 220) * rand(0.25, 1)
      const life = (opts.life || 0.5) * rand(0.55, 1.15)
      this.s.particles.push({
        x: x + rand(-4, 4), y: y + rand(-4, 4),
        vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        life, maxLife: life, size: (opts.size || 4) * rand(0.6, 1.3),
        color: colors[(Math.random() * colors.length) | 0],
        gravity: opts.gravity || 0, drag: opts.drag ?? 0.55,
        glow: opts.glow !== false, floor: opts.floor, type: opts.type || 'spark'
      })
    }
  },

  ring(x, y, opts = {}) {
    const life = opts.life || 0.5
    this.s.rings.push({
      x, y, t: 0, life, maxLife: life,
      max: opts.max || 90, color: opts.color || '#ffd23f',
      width: opts.width || 4, fill: !!opts.fill
    })
  },

  textPop(x, y, text, color = '#fff', size = 16) {
    this.s.texts.push({ x, y, text, color, size, life: 0.85, maxLife: 0.85, vy: -90 })
  },

  afterimage(f) {
    this.s.afterimages.push({
      x: f.x, y: f.y, facing: f.facing, scale: f.scale, form: f.form,
      kind: f.kind, look: f.look, def: f.def, state: f.state, anim: f.anim, animT: f.animT,
      stateT: f.stateT, hp: f.hp, maxHp: f.maxHp, dead: false, blocking: f.blocking,
      grounded: f.grounded, hitFlash: 0, formFx: 0, koT: 0, life: 0.32, maxLife: 0.32
    })
  },

  speedLines(count = 8) {
    for (let i = 0; i < count; i++) {
      this.s.speedlines.push({
        x: rand(WORLD.left, WORLD.right), y: rand(240, GROUND - 30),
        len: rand(70, 200), angle: rand(-0.12, 0.12), life: rand(0.2, 0.45), maxLife: 0.45,
        color: '#ffffff'
      })
    }
  },

  shake(amount) {
    this.s.camera.shake = Math.max(this.s.camera.shake, amount)
  }
}
