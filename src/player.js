import { WORLD, FORMS, TECHNIQUES, formatNumber } from './data.js'
import { GROUND, JUMP_V, clamp, rand, sign } from './game.js'

const approach = (v, target, amount) => v < target ? Math.min(v + amount, target) : Math.max(v - amount, target)

export const playerMethods = {
  updatePlayer(dt) {
    const s = this.s
    const p = s.player
    if (!p) return
    p.stateT += dt
    p.animT += dt
    if (p.invuln > 0) p.invuln -= dt
    if (p.hitstun > 0) p.hitstun -= dt
    if (p.dashCd > 0) p.dashCd -= dt
    if (p.dodgeCd > 0) p.dodgeCd -= dt
    if (p.critWindow > 0) p.critWindow -= dt
    for (let i = 0; i < p.cooldowns.length; i++) if (p.cooldowns[i] > 0) p.cooldowns[i] -= dt

    if (p.dead) {
      p.state = 'ko'
      this.stepFighterPhysics(p, dt)
      if (p.grounded && Math.random() < dt * 14) {
        this.burst(p.x + rand(-40, 40), GROUND - 4, 1, {
          colors: ['#8a8172', '#4b4741'], speed: 35, size: 5, life: 0.8, gravity: -30, glow: false
        })
      }
      return
    }

    const form = FORMS[p.form]

    if (s.finish) {
      p.state = 'victory'
      p.vx = 0
      p.blocking = false
      this.stepFighterPhysics(p, dt)
      return
    }

    if (p.form > 0 && Math.random() < dt * (5 + p.form * 2.4)) {
      this.burst(
        p.x + rand(-26, 26), p.y - rand(18, 180 * p.scale),
        1, { colors: [form.aura, form.aura2], speed: rand(20, 65), size: rand(2.5, 5), life: rand(0.35, 0.75), gravity: -rand(80, 180), glow: true, drag: 0.8 }
      )
    }
    if (p.formFx > 0 && Math.random() < dt * 40) {
      this.burst(p.x + rand(-50, 50), p.y - rand(0, 210), 1, {
        colors: [form.aura, '#ffffff'], speed: rand(60, 220), size: rand(3, 7), life: rand(0.4, 0.9), gravity: rand(-60, 60), glow: true
      })
    }

    if (p.hitstun > 0) {
      p.state = 'hurt'
      p.blocking = false
      p.anim = 'hurt'
      this.stepFighterPhysics(p, dt)
      if (p.hitstun <= 0) { p.state = 'idle'; p.anim = 'idle'; p.animT = 0 }
      return
    }

    if (p.dashT > 0) {
      p.dashT -= dt
      p.state = 'dash'
      p.anim = 'dash'
      p.invuln = Math.max(p.invuln, 0.06)
      p.afterimageCd -= dt
      if (p.afterimageCd <= 0) {
        p.afterimageCd = 0.035
        this.afterimage(p)
      }
      this.stepFighterPhysics(p, dt)
      if (p.dashT <= 0) { p.state = 'idle'; p.anim = 'idle'; p.animT = 0 }
      return
    }

    if (p.state === 'transform') {
      p.vx = 0
      p.blocking = false
      this.stepFighterPhysics(p, dt)
      if (p.stateT > 0.8) { p.state = 'idle'; p.anim = 'idle'; p.animT = 0 }
      return
    }

    if (p.state === 'beamCharge') {
      p.beamHold += dt
      p.vx *= Math.pow(0.02, dt)
      p.facing = sign(s.enemy.x - p.x)
      const handX = p.x + p.facing * 46
      const handY = p.y - 126
      if (Math.random() < dt * 55) {
        this.burst(handX + rand(-14, 14), handY + rand(-14, 14), 1, {
          colors: [form.aura, form.aura2, '#ffffff'], speed: rand(60, 170), size: rand(3, 6), life: 0.3, glow: true,
          dir: p.facing > 0 ? Math.PI : 0, spread: 1.5
        })
      }
      if (p.beamHold >= 1.15) this.firePlayerBeam()
      this.stepFighterPhysics(p, dt)
      return
    }

    if (p.state === 'beam') {
      p.beamT -= dt
      p.anim = 'beam'
      p.vx *= Math.pow(0.02, dt)
      p.facing = sign(s.enemy.x - p.x)
      if (p.beamT <= 0) { p.state = 'idle'; p.anim = 'idle'; p.animT = 0 }
      this.stepFighterPhysics(p, dt)
      return
    }

    if (p.state === 'attack') {
      p.attackT += dt
      p.vx *= Math.pow(0.03, dt)
      if (!p.attackHit && p.attackT >= p.attackHitAt) {
        p.attackHit = true
        this.spawnPlayerMelee(p.attackKind, p.chain)
      }
      if (p.attackT >= p.attackDuration) {
        p.state = 'idle'
        p.anim = 'idle'
        p.animT = 0
      }
      this.stepFighterPhysics(p, dt)
      return
    }

    if (p.state === 'cast') {
      p.castT -= dt
      p.vx *= Math.pow(0.1, dt)
      if (p.castT <= 0) { p.state = 'idle'; p.anim = 'idle'; p.animT = 0 }
      this.stepFighterPhysics(p, dt)
      return
    }

    if (p.state === 'skill') {
      this.updatePlayerSkill(dt)
      this.stepFighterPhysics(p, dt)
      return
    }

    p.blocking = false
    const axis = this.input.x
    p.facing = sign(s.enemy.x - p.x)

    if (this.input.charge && p.grounded && Math.abs(axis) < 0.3) {
      p.state = 'charge'
      p.anim = 'charge'
      p.chargeT += dt
      p.vx = 0
      p.power = Math.min(100, p.power + 34 * dt)
      p.ki = Math.min(p.maxKi, p.ki + 29 * dt)
      if (Math.random() < dt * 75) {
        this.burst(p.x + rand(-34, 34), p.y - rand(0, 200), 1, {
          colors: [form.aura, form.aura2, '#ffffff'], speed: rand(30, 150), size: rand(2, 6),
          life: rand(0.3, 0.8), gravity: -rand(80, 260), glow: true, drag: 0.8
        })
      }
      if (p.power >= 99.5 && !s.readyNotified) {
        s.readyNotified = true
        this.toast(this.isTouch() ? 'POWER FULL — TAP ASCEND' : 'POWER FULL — PRESS Q TO ASCEND', 2.4)
        this.ring(p.x, p.y - 100, { max: 130, life: 0.45, color: form.aura2, width: 4 })
        this.audio.ui()
      }
      this.stepFighterPhysics(p, dt)
      return
    }

    if (this.input.guard && p.grounded) {
      p.state = 'guard'
      p.anim = 'guard'
      p.blocking = true
      p.vx = approach(p.vx, 0, 2400 * dt)
      this.stepFighterPhysics(p, dt)
      return
    }

    const speed = 360 * form.speed
    if (Math.abs(axis) > 0.05) {
      p.vx = axis * speed
      p.state = p.grounded ? 'walk' : 'jump'
      p.anim = p.grounded ? 'walk' : 'jump'
    } else {
      p.vx = approach(p.vx, 0, 2600 * dt)
      p.state = p.grounded ? 'idle' : 'jump'
      p.anim = p.grounded ? 'idle' : 'jump'
    }
    p.ki = Math.min(p.maxKi, p.ki + form.kiRegen * dt)
    if (p.power < 100) p.power = Math.min(100, p.power + 0.22 * dt)
    this.stepFighterPhysics(p, dt)
  },

  playerLight() {
    const p = this.s.player
    if (!p || this.s.mode !== 'fight' || this.s.finish) return
    if (p.hitstun > 0 || p.dead) return
    const busy = ['dash', 'beam', 'skill', 'transform', 'hurt', 'ko', 'cast'].includes(p.state)
    if (busy) return
    if (p.state === 'attack' && p.attackT < p.attackDuration * 0.42) return
    const chain = p.state === 'attack' || (p.lastAttackAt && this.s.time - p.lastAttackAt < 0.65)
      ? ((p.chain || 0) + 1) % 3 : 0
    p.chain = chain
    p.lastAttackAt = this.s.time
    p.blocking = false
    p.facing = sign(this.s.enemy.x - p.x)
    p.state = 'attack'
    p.anim = chain === 2 ? 'kick' : 'punch'
    p.animT = 0
    p.stateT = 0
    p.attackKind = 'light'
    p.attackT = 0
    p.attackDuration = chain === 2 ? 0.31 : 0.25
    p.attackHitAt = chain === 2 ? 0.11 : 0.06
    p.attackHit = false
    p.vx = p.facing * 90
    this.audio.whoosh()
  },

  playerHeavy() {
    const p = this.s.player
    if (!p || this.s.mode !== 'fight' || this.s.finish) return
    if (p.hitstun > 0 || p.dead) return
    const busy = ['dash', 'beam', 'skill', 'transform', 'hurt', 'ko', 'cast'].includes(p.state)
    if (busy) return
    if (p.state === 'attack' && p.attackT < p.attackDuration * 0.5) return
    p.blocking = false
    p.facing = sign(this.s.enemy.x - p.x)
    p.state = 'attack'
    p.anim = 'heavy'
    p.animT = 0
    p.stateT = 0
    p.attackKind = 'heavy'
    p.attackT = 0
    p.attackDuration = 0.44
    p.attackHitAt = 0.19
    p.attackHit = false
    p.vx = p.facing * 130
    this.audio.whoosh()
  },

  spawnPlayerMelee(kind, chain) {
    const p = this.s.player
    const form = FORMS[p.form]
    const crit = p.critWindow > 0
    if (kind === 'heavy') {
      this.spawnHitbox(p, {
        damage: 64 * form.dmg, range: 96, heightY: 118, w: 128, h: 104,
        stun: 0.44, knock: 300, lift: 90, crit, life: 0.14
      })
      this.ring(p.x + p.facing * 90, p.y - 118, { max: 62, life: 0.24, color: form.aura2, width: 3 })
    } else if (chain === 2) {
      this.spawnHitbox(p, {
        damage: 40 * form.dmg, range: 98, heightY: 118, w: 118, h: 92,
        stun: 0.32, knock: 210, lift: 35, crit, life: 0.13
      })
      this.ring(p.x + p.facing * 92, p.y - 118, { max: 48, life: 0.2, color: form.aura2, width: 2 })
    } else {
      this.spawnHitbox(p, {
        damage: (25 + chain * 4) * form.dmg, range: 85, heightY: 128, w: 96, h: 78,
        stun: 0.24, knock: 130, lif: 0, crit, life: 0.12
      })
    }
  },

  playerJump() {
    const p = this.s.player
    if (!p || this.s.mode !== 'fight' || this.s.finish || p.dead || p.hitstun > 0) return
    if (['beam', 'skill', 'transform', 'ko', 'hurt'].includes(p.state)) return
    if (p.grounded) {
      p.vy = -JUMP_V
      p.grounded = false
      p.jumps = 1
      p.state = 'jump'
      p.anim = 'jump'
      p.animT = 0
      this.audio.jump()
      this.burst(p.x, GROUND - 2, 8, { colors: ['#d8c8a8', '#8c7c62'], speed: 170, size: 4, life: 0.35, gravity: 260, dir: Math.PI / 2, spread: 1.5 })
    } else if (p.jumps < 2) {
      p.vy = -JUMP_V * 0.9
      p.jumps = 2
      p.state = 'jump'
      this.audio.jump()
      this.ring(p.x, p.y - 20, { max: 55, life: 0.32, color: FORMS[p.form].aura2, width: 3 })
      this.burst(p.x, p.y - 10, 10, { colors: [FORMS[p.form].aura, '#ffffff'], speed: 150, size: 3, life: 0.3, dir: Math.PI / 2, spread: 1.6 })
    }
  },

  playerDash() {
    const p = this.s.player
    if (!p || this.s.mode !== 'fight' || this.s.finish) return
    if (!this.canAct(p) || p.dashCd > 0) return
    let dir = this.input.x
    if (Math.abs(dir) < 0.2) dir = p.facing
    dir = sign(dir)
    p.dashT = 0.2
    p.dashCd = 0.72
    p.invuln = Math.max(p.invuln, 0.28)
    p.state = 'dash'
    p.anim = 'dash'
    p.animT = 0
    p.vx = dir * 980
    p.vy = 0
    p.grounded = false
    p.y = Math.min(p.y, GROUND - 8)
    p.facing = dir
    p.afterimageCd = 0
    this.audio.dash()
    this.afterimage(p)
    this.speedLines(10)
    this.burst(p.x, p.y - 110, 14, {
      colors: [FORMS[p.form].aura, '#ffffff'], speed: 280, size: 4, life: 0.3,
      dir: dir > 0 ? Math.PI : 0, spread: 0.8, glow: true
    })
  },

  playerKi() {
    const p = this.s.player
    if (!p || this.s.mode !== 'fight' || this.s.finish) return
    if (!this.canAct(p)) return
    if (p.ki < 8) { this.toast('NOT ENOUGH KI', 1.2); return }
    const form = FORMS[p.form]
    p.ki -= 8
    p.state = 'cast'
    p.castT = 0.19
    p.anim = 'cast'
    p.animT = 0
    p.vx = p.facing * 30
    p.facing = sign(this.s.enemy.x - p.x)
    const crit = p.critWindow > 0
    this.spawnProjectile(p, {
      x: p.x + p.facing * 62, y: p.y - 128,
      vx: p.facing * 1080, r: 15, damage: 28 * form.dmg,
      color: form.aura, color2: form.aura2, stun: 0.28, knock: 165, life: 2.2, crit
    })
    this.audio.ki()
    this.burst(p.x + p.facing * 58, p.y - 128, 9, {
      colors: [form.aura, '#ffffff'], speed: 230, size: 4, life: 0.25,
      dir: p.facing > 0 ? 0 : Math.PI, spread: 0.9, glow: true
    })
  },

  playerBeamStart() {
    const p = this.s.player
    if (!p || this.s.mode !== 'fight' || this.s.finish) return
    if (p.state === 'beamCharge' || p.state === 'beam') return
    if (!this.canAct(p)) return
    if (p.ki < 30) { this.toast('NOT ENOUGH KI FOR KAMEHAMEHA', 1.4); return }
    p.state = 'beamCharge'
    p.anim = 'beamCharge'
    p.animT = 0
    p.stateT = 0
    p.beamHold = 0
    p.beamT = 0
    p.vx = 0
    p.blocking = false
    p.facing = sign(this.s.enemy.x - p.x)
    this.audio.beamCharge()
    this.toast('HOLD TO CHARGE · RELEASE TO FIRE', 1.2)
  },

  playerBeamRelease() {
    const p = this.s.player
    if (!p || p.state !== 'beamCharge') return
    this.firePlayerBeam()
  },

  firePlayerBeam() {
    const p = this.s.player
    if (!p || p.state !== 'beamCharge') return
    const form = FORMS[p.form]
    const ratio = clamp(p.beamHold / 1.15, 0, 1)
    p.ki = Math.max(0, p.ki - 30)
    p.state = 'beam'
    p.anim = 'beam'
    p.animT = 0
    p.stateT = 0
    p.beamT = 0.74
    p.beamFired = true
    p.lastBeamRatio = ratio
    p.vx = -p.facing * 30
    p.facing = sign(this.s.enemy.x - p.x)
    const dmg = (33 + 23 * ratio) * form.dmg
    this.spawnBeam(p, {
      damage: dmg, color: form.aura, color2: form.aura2,
      width: 44 + 34 * ratio, height: 62 + 40 * ratio,
      life: 0.72, stun: 0.2, knock: 120
    })
    this.flash(form.aura2, 0.18 + ratio * 0.2, 4)
    this.audio.beam()
    this.shake(11)
    this.ring(p.x + p.facing * 70, p.y - 126, { max: 95 + ratio * 80, life: 0.35, color: form.aura2, width: 5 })
  },

  playerSkill(index) {
    const s = this.s
    const p = s.player
    if (!p || s.mode !== 'fight' || s.finish || p.dead) return
    const tech = TECHNIQUES[index]
    if (!tech) return
    if (p.form < tech.minForm) {
      this.toast(`${tech.name} UNLOCKS AT ${FORMS[tech.minForm].name}`, 2.3)
      return
    }
    if (p.cooldowns[index] > 0) {
      this.toast(`${tech.name} RECHARGING · ${p.cooldowns[index].toFixed(1)}s`, 1.2)
      return
    }
    if (tech.cost && p.ki < tech.cost) {
      this.toast('NOT ENOUGH KI', 1.2)
      return
    }
    if (tech.spirit && p.spirit < tech.spirit) {
      this.toast(`SPIRIT GAUGE ${Math.round(p.spirit)}% — DEAL DAMAGE TO FILL IT`, 2.2)
      return
    }
    if (!this.canAct(p) && !['charge', 'guard'].includes(p.state)) return
    const form = FORMS[p.form]
    p.facing = sign(s.enemy.x - p.x)
    p.blocking = false
    p.cooldowns[index] = tech.cooldown

    if (tech.id === 'solar') {
      p.ki -= tech.cost
      p.state = 'skill'
      p.skillId = 'solar'
      p.skillT = 0
      p.skillDuration = 0.6
      p.skillDone = false
      p.anim = 'solar'
      p.animT = 0
      p.vx = 0
      this.audio.flash()
      return
    }

    if (tech.id === 'teleport') {
      p.ki -= tech.cost
      const enemy = s.enemy
      this.afterimage(p)
      this.burst(p.x, p.y - 105, 24, { colors: ['#8ad8ff', '#ffffff'], speed: 300, size: 5, life: 0.4, glow: true })
      const behind = clamp(enemy.x + enemy.facing * 112, WORLD.left + 40, WORLD.right - 40)
      p.x = behind
      p.y = GROUND
      p.grounded = true
      p.vy = 0
      p.vx = 0
      p.facing = sign(enemy.x - p.x)
      p.invuln = Math.max(p.invuln, 0.62)
      p.critWindow = 3.4
      p.state = 'idle'
      p.anim = 'idle'
      p.animT = 0
      this.afterimage(p)
      this.burst(p.x, p.y - 105, 28, { colors: ['#8ad8ff', '#ffffff'], speed: 320, size: 5, life: 0.45, glow: true })
      this.audio.teleport()
      this.textPop(p.x, p.y - 220, 'BEHIND YOU', '#8ad8ff', 15)
      this.toast('CRITICAL STRIKE READY', 1.3)
      return
    }

    if (tech.id === 'dragonfist') {
      p.ki -= tech.cost
      p.state = 'skill'
      p.skillId = 'dragonfist'
      p.skillT = 0
      p.skillDuration = 0.66
      p.skillDone = false
      p.anim = 'dragon'
      p.animT = 0
      p.invuln = Math.max(p.invuln, 0.42)
      p.vx = 0
      this.audio.beamCharge()
      this.announce('DRAGON FIST', 'GOLDEN DRAGON STRIKE', 1.3)
      return
    }

    if (tech.id === 'spiritbomb') {
      p.spirit = 0
      p.state = 'skill'
      p.skillId = 'spirit'
      p.skillT = 0
      p.skillDuration = 1.85
      p.skillDone = false
      p.spiritCharge = 0
      p.anim = 'spirit'
      p.animT = 0
      // The full Spirit Bomb wind-up is protected; it is a committed ultimate.
      p.invuln = Math.max(p.invuln, 1.95)
      p.vx = 0
      this.audio.spirit()
      this.announce('SPIRIT BOMB', 'LEND ME YOUR ENERGY', 1.8)
      return
    }
  },

  updatePlayerSkill(dt) {
    const s = this.s
    const p = s.player
    const form = FORMS[p.form]
    p.skillT += dt
    if (p.skillId === 'solar') {
      if (!p.skillDone && p.skillT >= 0.13) {
        p.skillDone = true
        this.flash('#fff9c4', 0.95, 3.4)
        this.ring(p.x, p.y - 120, { max: 560, life: 0.55, color: '#fff2a0', width: 18 })
        this.ring(p.x, p.y - 120, { max: 380, life: 0.4, color: '#ffffff', width: 7 })
        this.burst(p.x, p.y - 140, 70, { colors: ['#fff6c2', '#ffe066', '#ffffff'], speed: 640, size: 6, life: 0.65, glow: true })
        this.shake(17)
        this.audio.flash()
        const e = s.enemy
        if (e && !e.dead && Math.abs(e.x - p.x) < 560) {
          this.damageFighter(e, 12 * form.dmg, { source: p, stun: 2.2, knock: 40, sound: 'hit' })
          if (!e.dead) {
            e.state = 'hurt'
            e.hitstun = Math.max(e.hitstun, 2.2)
            e.blocking = false
            e.attackName = null
            e.special = null
          }
          this.textPop(e.x, e.y - 225, 'BLINDED', '#fff2a0', 18)
        }
      }
      if (p.skillT >= p.skillDuration) { p.state = 'idle'; p.skillId = null; p.anim = 'idle'; p.animT = 0 }
      return
    }
    if (p.skillId === 'dragonfist') {
      if (!p.skillDone && p.skillT >= 0.12) {
        p.skillDone = true
        p.vx = p.facing * 900
        p.invuln = Math.max(p.invuln, 0.26)
        const crit = p.critWindow > 0
        this.spawnHitbox(p, {
          damage: 165 * form.dmg, range: 128, heightY: 118, w: 170, h: 118,
          stun: 0.62, knock: 420, lift: 170, crit, life: 0.22, unblockable: false
        })
        this.burst(p.x + p.facing * 30, p.y - 105, 36, {
          colors: ['#ffe066', '#ffb021', '#fff6c2'], speed: 520, size: 6, life: 0.55,
          dir: p.facing > 0 ? 0 : Math.PI, spread: 0.85, glow: true
        })
        this.ring(p.x + p.facing * 80, p.y - 108, { max: 150, life: 0.45, color: '#ffe066', width: 8 })
        this.speedLines(14)
        this.audio.beam()
        this.shake(16)
        if (crit) p.critWindow = 0
      }
      if (p.skillT >= 0.4) p.vx *= Math.pow(0.01, dt)
      if (p.skillT >= p.skillDuration) { p.state = 'idle'; p.skillId = null; p.anim = 'idle'; p.animT = 0 }
      return
    }
    if (p.skillId === 'spirit') {
      if (p.skillT < 1.18) {
        p.spiritCharge = p.skillT / 1.18
        const handX = p.x
        const handY = p.y - 232
        for (let i = 0; i < 2; i++) {
          const ang = rand(0, Math.PI * 2)
          const r = rand(30, 120)
          this.s.particles.push({
            x: handX + Math.cos(ang) * r, y: handY + Math.sin(ang) * r * 0.6,
            vx: -Math.cos(ang) * r * 1.6, vy: -Math.sin(ang) * r * 0.9 - 60,
            life: 0.5, maxLife: 0.5, size: rand(3, 6), color: i ? '#b6f4ff' : '#4b9bff',
            gravity: 0, drag: 0.8, glow: true
          })
        }
      }
      if (!p.skillDone && p.skillT >= 1.18) {
        p.skillDone = true
        this.spawnProjectile(p, {
          x: p.x + p.facing * 30, y: p.y - 210,
          vx: p.facing * 640, vy: -20, r: 66,
          damage: 340 * form.dmg, color: '#9fe8ff', color2: '#ffffff',
          life: 3, explode: 250, kind: 'spirit', stun: 0.9, knock: 500,
          unblockable: false
        })
        this.flash('#c8f4ff', 0.5, 3)
        this.shake(20)
        this.audio.explosion()
        p.vx = -p.facing * 60
      }
      if (p.skillT >= p.skillDuration) { p.state = 'idle'; p.skillId = null; p.anim = 'idle'; p.animT = 0 }
      return
    }
    if (p.skillT >= p.skillDuration) { p.state = 'idle'; p.skillId = null; p.anim = 'idle'; p.animT = 0 }
  }
}
