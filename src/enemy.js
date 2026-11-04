import { WORLD, FORMS } from './data.js'
import { GROUND, GROUND as _G, clamp, rand, sign, choose } from './game.js'

const approach = (v, target, amount) => v < target ? Math.min(v + amount, target) : Math.max(v - amount, target)

export const enemyMethods = {
  updateEnemy(dt) {
    const s = this.s
    const e = s.enemy
    const p = s.player
    if (!e) return
    e.stateT += dt
    e.animT += dt
    if (e.invuln > 0) e.invuln -= dt
    if (e.hitstun > 0) e.hitstun -= dt
    if (e.attackCd > 0) e.attackCd -= dt
    if (e.kiCd > 0) e.kiCd -= dt
    if (e.specialCd > 0) e.specialCd -= dt
    if (e.guardCd > 0) e.guardCd -= dt
    if (e.jumpCd > 0) e.jumpCd -= dt
    if (e.hitFlash > 0) e.hitFlash -= dt
    if (e.guardFlash > 0) e.guardFlash -= dt
    if (e.formFx > 0) e.formFx -= dt
    e.auraPulse += dt

    if (e.dead) {
      e.state = 'ko'
      this.stepFighterPhysics(e, dt)
      if (e.grounded && Math.random() < dt * 12) {
        this.burst(e.x + rand(-50, 50), GROUND - 4, 1, {
          colors: ['#8a8172', '#4b4741'], speed: 32, size: 6, life: 1, gravity: -25, glow: false
        })
      }
      return
    }

    if (s.finish) {
      if (e.state !== 'victory') e.state = 'victory'
      e.vx = 0
      e.blocking = false
      this.stepFighterPhysics(e, dt)
      return
    }

    if (e.def.regen) e.hp = Math.min(e.maxHp, e.hp + e.def.regen * dt)

    if (e.hitstun > 0) {
      e.state = 'hurt'
      e.blocking = false
      e.anim = 'hurt'
      if (e.special) { e.special = null; e.attackName = null }
      this.stepFighterPhysics(e, dt)
      if (e.hitstun <= 0) { e.state = 'idle'; e.anim = 'idle'; e.animT = 0 }
      return
    }

    if (!e.enraged && e.hp < e.maxHp * 0.38) {
      e.enraged = true
      e.damage *= 1.18
      e.speed *= 1.14
      e.attackCd = 0.2
      e.specialCd = 0.7
      e.invuln = Math.max(e.invuln, 0.7)
      e.formFx = 1.2
      e.state = 'transform'
      e.stateT = 0
      this.announce(`${e.name} POWER UP`, 'A DEEPER RESERVE OF POWER', 1.8)
      this.ring(e.x, e.y - 100, { max: 230, life: 0.7, color: e.def.aura, width: 7 })
      this.burst(e.x, e.y - 100, 38, { colors: [e.def.aura, e.def.aura2, '#ffffff'], speed: 420, size: 6, life: 0.8, glow: true })
      this.flash(e.def.aura, 0.3, 4)
      this.shake(16)
      this.audio.transform(4)
      this.stepFighterPhysics(e, dt)
      return
    }

    if (p) e.facing = sign(p.x - e.x)
    else e.facing = -1

    if (e.state === 'transform') {
      e.vx = 0
      this.stepFighterPhysics(e, dt)
      if (e.stateT > 1) { e.state = 'idle'; e.anim = 'idle'; e.animT = 0 }
      return
    }

    if (e.state === 'special') {
      this.updateEnemySpecial(dt)
      this.stepFighterPhysics(e, dt)
      return
    }

    if (e.state === 'attack') {
      e.attackT += dt
      e.vx *= Math.pow(0.02, dt)
      if (!e.attackHit && e.attackT >= e.attackHitAt) {
        e.attackHit = true
        this.spawnEnemyMelee(e.attackKind)
      }
      if (e.attackT >= e.attackDuration) { e.state = 'idle'; e.anim = 'idle'; e.animT = 0 }
      this.stepFighterPhysics(e, dt)
      return
    }

    if (e.state === 'cast') {
      e.castT -= dt
      e.vx *= Math.pow(0.1, dt)
      if (e.castT <= 0) { e.state = 'idle'; e.anim = 'idle'; e.animT = 0 }
      this.stepFighterPhysics(e, dt)
      return
    }

    if (e.state === 'guard') {
      e.guardT -= dt
      e.blocking = true
      e.vx = approach(e.vx, 0, 3000 * dt)
      if (e.guardT <= 0) { e.state = 'idle'; e.blocking = false; e.anim = 'idle'; e.animT = 0 }
      this.stepFighterPhysics(e, dt)
      return
    }

    if (e.state === 'dash') {
      e.dashT -= dt
      e.vx *= Math.pow(0.08, dt)
      if (e.dashT <= 0) { e.state = 'idle'; e.anim = 'idle'; e.animT = 0 }
      this.stepFighterPhysics(e, dt)
      return
    }

    e.blocking = false
    this.updateEnemyAI(dt)
    this.stepFighterPhysics(e, dt)
  },

  updateEnemyAI(dt) {
    const s = this.s
    const e = s.enemy
    const p = s.player
    if (!p || p.dead) return
    const dist = Math.abs(p.x - e.x)
    const dir = sign(p.x - e.x)
    e.facing = dir

    // Opening grace period: let the player charge and transform before the
    // first exchange. The enemy still tracks the player and holds its ground.
    if (s.fightTime < 2.6 && p.state !== 'attack' && p.state !== 'beam') {
      let target = 0
      if (dist < 360) target = -dir * 120
      if (e.grounded) e.vx = approach(e.vx, target, 1400 * dt)
      if (Math.abs(e.vx) > 30) { e.state = 'walk'; e.anim = 'walk' }
      else { e.state = 'idle'; e.anim = 'idle' }
      return
    }

    // Desperate evasive hop when the player is charging a beam.
    if (e.grounded && e.jumpCd <= 0 && p.state === 'beamCharge' && dist < 620 && Math.random() < 0.035) {
      e.vy = -860
      e.grounded = false
      e.jumpCd = 2.4
      e.state = 'jump'
      this.burst(e.x, GROUND - 2, 8, { colors: ['#d8c8a8', '#8c7c62'], speed: 160, size: 4, life: 0.3, gravity: 250, dir: Math.PI / 2, spread: 1.5 })
      this.audio.jump()
    }
    if (e.grounded && e.jumpCd <= 0 && s.projectiles.some(pr => pr.side === 'player' && Math.abs(pr.x - e.x) < 260) && Math.random() < 0.06) {
      e.vy = -820
      e.grounded = false
      e.jumpCd = 2.2
      e.state = 'jump'
      this.audio.jump()
    }

    // Guard reaction.
    if (e.guardCd <= 0 && dist < 260 && (p.state === 'attack' || p.state === 'beamCharge') && Math.random() < 0.018 + e.aggression * 0.02) {
      e.state = 'guard'
      e.guardT = 0.5
      e.guardCd = 1.3 + Math.random()
      e.blocking = true
      e.vx = 0
      this.audio.ui()
      return
    }

    if (e.specialCd <= 0 && dist < 980 && Math.random() < 0.35 + e.aggression * 0.2) {
      const attacks = e.def.attacks
      let atk = choose(attacks)
      if (attacks.length > 1 && e.lastSpecial === atk.id) atk = attacks[(attacks.indexOf(atk) + 1) % attacks.length]
      e.lastSpecial = atk.id
      this.useEnemySpecial(atk)
      return
    }

    if (dist < 230 && e.attackCd <= 0) {
      const heavy = Math.random() < 0.24 + e.aggression * 0.14
      this.enemyMelee(heavy ? 'heavy' : 'light')
      return
    }

    if (dist > 250 && e.kiCd <= 0 && Math.random() < 0.12) {
      this.enemyBasicKi()
      return
    }

    let target = 0
    if (dist > 168) target = dir * 315 * e.speed
    else if (dist < 95) target = -dir * 250 * e.speed
    if (dist > 720) target = dir * 390 * e.speed
    if (e.grounded) e.vx = approach(e.vx, target, 2200 * dt)
    else e.vx = approach(e.vx, target * 0.7, 1300 * dt)
    if (Math.abs(target) > 20) {
      e.state = 'walk'
      e.anim = 'walk'
    } else {
      e.state = 'idle'
      e.anim = 'idle'
    }
  },

  enemyMelee(kind) {
    const e = this.s.enemy
    if (!e) return
    e.facing = sign(this.s.player.x - e.x)
    e.state = 'attack'
    e.anim = kind === 'heavy' ? 'heavy' : 'punch'
    e.animT = 0
    e.stateT = 0
    e.attackKind = kind
    e.attackT = 0
    e.attackDuration = kind === 'heavy' ? 0.58 : 0.42
    e.attackHitAt = kind === 'heavy' ? 0.33 : 0.2
    e.attackHit = false
    e.vx = e.facing * (kind === 'heavy' ? 150 : 100)
    e.attackCd = (kind === 'heavy' ? 1.05 : 0.65) + Math.random() * 0.5
    this.audio.whoosh()
  },

  spawnEnemyMelee(kind) {
    const e = this.s.enemy
    if (!e) return
    const dmg = e.damage * (kind === 'heavy' ? 5.8 : 3.5)
    this.spawnHitbox(e, {
      damage: dmg, range: kind === 'heavy' ? 96 : 86,
      heightY: 120, w: kind === 'heavy' ? 130 : 100, h: kind === 'heavy' ? 108 : 82,
      stun: kind === 'heavy' ? 0.5 : 0.28, knock: kind === 'heavy' ? 330 : 160,
      lift: kind === 'heavy' ? 110 : 0, life: 0.14
    })
    this.ring(e.x + e.facing * 92, e.y - 118, {
      max: kind === 'heavy' ? 60 : 42, life: 0.2, color: e.def.accent, width: 3
    })
  },

  enemyBasicKi() {
    const e = this.s.enemy
    const p = this.s.player
    if (!e || !p) return
    e.kiCd = 2.6 + Math.random() * 2.2
    e.state = 'cast'
    e.castT = 0.3
    e.anim = 'cast'
    e.animT = 0
    e.vx = 0
    e.facing = sign(p.x - e.x)
    const dir = e.facing
    this.spawnProjectile(e, {
      x: e.x + dir * 60, y: e.y - 130, vx: dir * 820, vy: rand(-45, 15),
      r: 17, damage: e.damage * 3.1, color: e.def.aura, color2: '#ffffff',
      life: 2.6, stun: 0.32, knock: 180
    })
    this.audio.ki()
  },

  useEnemySpecial(attack) {
    const e = this.s.enemy
    if (!e) return
    e.state = 'special'
    e.special = attack
    e.specialT = 0
    e.specialFired = false
    e.specialHitDone = false
    e.attackName = attack.name
    e.attackT = 0
    e.vx = 0
    e.facing = sign(this.s.player.x - e.x)
    e.specialCd = attack.cd + rand(1.2, 3.4)
    this.audio.beamCharge()
    this.textPop(e.x, e.y - (235 * e.scale), attack.name, attack.color, 12)
    this.ring(e.x, e.y - 110, { max: 100, life: 0.4, color: attack.color, width: 3 })
  },

  updateEnemySpecial(dt) {
    const e = this.s.enemy
    const p = this.s.player
    const a = e.special
    if (!a) { e.state = 'idle'; return }
    e.specialT += dt
    e.vx *= Math.pow(0.02, dt)
    const t = e.specialT

    if (a.type === 'beam') {
      if (!e.specialFired && t >= 1.02) {
        e.specialFired = true
        this.spawnBeam(e, {
          damage: e.damage * 1.55, color: a.color, color2: '#ffffff',
          width: 60, height: 78, life: 0.8, stun: 0.22, knock: 120
        })
        this.flash(a.color, 0.22, 4)
        this.audio.beam()
      }
      if (t >= 2.0) { e.state = 'idle'; e.special = null; e.attackName = null; e.anim = 'idle'; e.animT = 0 }
      return
    }

    if (a.type === 'orb') {
      if (!e.specialFired && t >= 0.48) {
        e.specialFired = true
        this.spawnProjectile(e, {
          x: e.x + e.facing * 62, y: e.y - 145,
          vx: e.facing * 500, vy: -20, r: 46,
          damage: e.damage * 8.2, color: a.color, color2: '#ffffff',
          life: 3.6, explode: 180, stun: 0.7, knock: 380, kind: 'orb'
        })
        this.audio.ki()
        this.shake(8)
      }
      if (t >= 0.95) { e.state = 'idle'; e.special = null; e.attackName = null; e.anim = 'idle'; e.animT = 0 }
      return
    }

    if (a.type === 'volley') {
      if (!e.specialFired && t >= 0.46) {
        e.specialFired = true
        const dir = e.facing
        for (let i = -1; i <= 1; i++) {
          this.spawnProjectile(e, {
            x: e.x + dir * 58, y: e.y - 138 + i * 24,
            vx: dir * 860, vy: i * 150, r: 15,
            damage: e.damage * 3.3, color: a.color, color2: '#ffffff',
            life: 2.6, stun: 0.26, knock: 150
          })
        }
        this.audio.ki()
        this.shake(5)
      }
      if (t >= 1.1) { e.state = 'idle'; e.special = null; e.attackName = null; e.anim = 'idle'; e.animT = 0 }
      return
    }

    if (a.type === 'aoe') {
      if (!e.specialFired && t >= 0.16) {
        e.specialFired = true
        this.spawnTelegraph(e, {
          radius: 310, time: 1.15, damage: e.damage * 8.6,
          color: a.color, stun: 0.7, knock: 430, label: a.name
        })
        this.audio.beamCharge()
      }
      if (t >= 1.55) { e.state = 'idle'; e.special = null; e.attackName = null; e.anim = 'idle'; e.animT = 0 }
      return
    }

    if (a.type === 'dash') {
      if (!e.specialFired && t >= 0.3) {
        e.specialFired = true
        e.vx = e.facing * 1080
        e.invuln = Math.max(e.invuln, 0.35)
        this.speedLines(12)
        this.afterimage(e)
        this.audio.dash()
      }
      if (!e.specialHitDone && t >= 0.38) {
        e.specialHitDone = true
        this.spawnHitbox(e, {
          damage: e.damage * 7.2, range: 105, heightY: 112, w: 145, h: 120,
          stun: 0.62, knock: 420, lift: 180, life: 0.2
        })
        this.burst(e.x + e.facing * 60, e.y - 110, 24, { colors: [a.color, '#ffffff'], speed: 400, size: 5, life: 0.5, glow: true })
      }
      if (t >= 0.95) { e.state = 'idle'; e.special = null; e.attackName = null; e.anim = 'idle'; e.animT = 0 }
    }
  }
}
