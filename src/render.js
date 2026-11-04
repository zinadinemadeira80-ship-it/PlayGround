import { WORLD, FORMS } from './data.js'
import { drawFighter } from './characters.js'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const TAU = Math.PI * 2

let STARS = null
function stars() {
  if (STARS) return STARS
  STARS = Array.from({ length: 170 }, () => ({
    x: Math.random(), y: Math.random(),
    r: 0.5 + Math.random() * 1.8,
    tw: Math.random() * TAU,
    sp: 0.3 + Math.random() * 0.9,
    depth: 0.4 + Math.random() * 0.8
  }))
  return STARS
}

function screenPoint(game, x, y) {
  const cam = game.s.camera
  return {
    x: game.cw / 2 + (x - cam.x) * cam.scale + cam.shakeX,
    y: game.ch / 2 + (y - cam.y) * cam.scale + cam.shakeY
  }
}

function worldTransform(ctx, game) {
  const cam = game.s.camera
  ctx.save()
  ctx.translate(game.cw / 2 + cam.shakeX, game.ch / 2 + cam.shakeY)
  ctx.scale(cam.scale, cam.scale)
  ctx.translate(-cam.x, -cam.y)
}

export function renderTitle(game) {
  const ctx = game.ctx
  const { cw, ch, dpr } = game
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cw, ch)
  drawBackground(game)
  drawTitleDragon(ctx, game.s.time, cw, ch)

  worldTransform(ctx, game)
  drawArena(game, ctx)
  if (cw >= 600) {
    const hero = game.titleHero
    hero.animT = game.s.time
    hero.stateT = game.s.time
    hero.state = 'charge'
    hero.anim = 'charge'
    hero.x = cw / ch < 0.9 ? 1010 : 1110
    hero.facing = -1
    // aura ground ring
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const g = ctx.createRadialGradient(hero.x, WORLD.ground, 8, hero.x, WORLD.ground, 170)
    g.addColorStop(0, 'rgba(42,200,255,.5)')
    g.addColorStop(0.5, 'rgba(42,160,255,.16)')
    g.addColorStop(1, 'rgba(42,160,255,0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.ellipse(hero.x, WORLD.ground, 170, 28, 0, 0, TAU); ctx.fill()
    ctx.restore()
    drawFighter(ctx, hero, game.s.time)
  }
  drawArenaForeground(ctx, game)
  ctx.restore()

  drawScreenVignette(game)
  drawFlash(game)
}

export function renderGame(game) {
  const ctx = game.ctx
  const s = game.s
  const { cw, ch, dpr } = game
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cw, ch)
  drawBackground(game)

  worldTransform(ctx, game)
  drawArena(game, ctx)
  drawTelegraphs(game, ctx)
  drawAfterimages(game, ctx)
  const fighters = [s.enemy, s.player].filter(Boolean).sort((a, b) => (a.kind === 'enemy' ? -1 : 1))
  for (const f of fighters) {
    if (f) drawFighter(ctx, f, s.time)
  }
  drawBeams(game, ctx)
  drawProjectiles(game, ctx)
  drawSpeedLines(game, ctx)
  drawParticles(game, ctx)
  drawRings(game, ctx)
  drawTexts(game, ctx)
  drawWorldUI(game, ctx)
  drawArenaForeground(ctx, game)
  ctx.restore()

  drawOffscreen(game)
  drawLetterbox(game)
  drawFlash(game)
}

function drawBackground(game) {
  const ctx = game.ctx
  const { cw, ch } = game
  const t = game.s.time
  const cam = game.s.camera
  const g = ctx.createLinearGradient(0, 0, 0, ch)
  g.addColorStop(0, '#04040e')
  g.addColorStop(0.32, '#0a0c27')
  g.addColorStop(0.62, '#1b0f36')
  g.addColorStop(0.84, '#371436')
  g.addColorStop(1, '#160a1d')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, cw, ch)

  // Nebula clouds
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const ox = (cam.x - 800) * 0.05
  const oy = (cam.y - 450) * 0.04
  const clouds = [
    [cw * 0.18 - ox, ch * 0.22 - oy, cw * 0.38, 'rgba(85,40,190,0.18)'],
    [cw * 0.78 - ox * 1.4, ch * 0.32 - oy, cw * 0.42, 'rgba(20,90,190,0.15)'],
    [cw * 0.5 - ox * 0.6, ch * 0.08 - oy, cw * 0.5, 'rgba(180,30,110,0.1)']
  ]
  for (const [x, y, r, color] of clouds) {
    const rg = ctx.createRadialGradient(x, y, 10, x, y, r)
    rg.addColorStop(0, color)
    rg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = rg
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill()
  }
  ctx.restore()

  // Stars
  ctx.save()
  for (const st of stars()) {
    const parallax = (cam.x - 800) * 0.08 * st.depth
    const x = ((st.x * cw - parallax) % cw + cw) % cw
    const y = st.y * ch * 0.78
    const alpha = 0.35 + 0.65 * (0.5 + Math.sin(t * st.sp + st.tw) * 0.5)
    ctx.fillStyle = `rgba(220,230,255,${alpha * 0.8})`
    ctx.beginPath(); ctx.arc(x, y, st.r, 0, TAU); ctx.fill()
    if (st.r > 1.6) {
      ctx.strokeStyle = `rgba(180,210,255,${alpha * 0.25})`
      ctx.lineWidth = 0.7
      ctx.beginPath(); ctx.moveTo(x - st.r * 3, y); ctx.lineTo(x + st.r * 3, y); ctx.stroke()
    }
  }
  ctx.restore()

  // Ringed planet
  const px = cw * 0.79 - (cam.x - 800) * 0.09
  const py = ch * 0.25 - (cam.y - 450) * 0.06
  const pr = Math.min(cw, ch) * 0.145
  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  const halo = ctx.createRadialGradient(px, py, pr * 0.6, px, py, pr * 2)
  halo.addColorStop(0, 'rgba(90,80,230,0.18)')
  halo.addColorStop(1, 'rgba(90,80,230,0)')
  ctx.fillStyle = halo
  ctx.beginPath(); ctx.arc(px, py, pr * 2, 0, TAU); ctx.fill()
  const pg = ctx.createLinearGradient(px - pr, py - pr, px + pr, py + pr)
  pg.addColorStop(0, '#7c5ad8')
  pg.addColorStop(0.42, '#4a2f9c')
  pg.addColorStop(0.7, '#231457')
  pg.addColorStop(1, '#100a2d')
  ctx.fillStyle = pg
  ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill()
  ctx.strokeStyle = 'rgba(160,180,255,0.28)'
  ctx.lineWidth = 2
  ctx.stroke()
  // planet bands
  ctx.save()
  ctx.beginPath(); ctx.arc(px, py, pr - 1, 0, TAU); ctx.clip()
  ctx.strokeStyle = 'rgba(20,12,60,0.35)'
  ctx.lineWidth = pr * 0.08
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath()
    ctx.ellipse(px, py + i * pr * 0.36, pr * 0.98, pr * 0.12, -0.15, 0, TAU)
    ctx.stroke()
  }
  ctx.restore()
  // ring
  ctx.save()
  ctx.translate(px, py)
  ctx.rotate(-0.32)
  ctx.strokeStyle = 'rgba(190,170,255,0.38)'
  ctx.lineWidth = pr * 0.09
  ctx.beginPath(); ctx.ellipse(0, 0, pr * 1.75, pr * 0.3, 0, 0, TAU); ctx.stroke()
  ctx.strokeStyle = 'rgba(110,190,255,0.16)'
  ctx.lineWidth = pr * 0.035
  ctx.beginPath(); ctx.ellipse(0, 0, pr * 2.02, pr * 0.35, 0, 0, TAU); ctx.stroke()
  ctx.restore()
  ctx.restore()

  // Floating islands / debris
  const islands = [
    [250, 535, 150, 0.30], [1180, 490, 180, 0.25], [1500, 600, 120, 0.36],
    [690, 390, 100, 0.18], [50, 680, 130, 0.42]
  ]
  for (let i = 0; i < islands.length; i++) {
    const [x, y, size, par] = islands[i]
    const sx = cw / 2 + (x - cam.x * par - (1 - par) * 800) * cam.scale
    const sy = ch / 2 + (y - cam.y * par - (1 - par) * 450) * cam.scale
    if (sx < -size || sx > cw + size) continue
    drawFloatingRock(ctx, sx, sy, size * cam.scale, t + i * 2.3, i)
  }

  // Horizon mist
  const horizon = ch / 2 + (WORLD.ground - cam.y) * cam.scale
  ctx.save()
  const hg = ctx.createLinearGradient(0, horizon - ch * 0.18, 0, horizon + 40)
  hg.addColorStop(0, 'rgba(255,120,60,0)')
  hg.addColorStop(0.7, 'rgba(255,110,60,0.045)')
  hg.addColorStop(1, 'rgba(90,200,255,0.08)')
  ctx.fillStyle = hg
  ctx.fillRect(0, horizon - ch * 0.18, cw, ch * 0.18 + 40)
  ctx.restore()
}

function drawFloatingRock(ctx, x, y, size, t, seed) {
  const bob = Math.sin(t * 0.55 + seed) * 7
  ctx.save()
  ctx.translate(x, y + bob)
  ctx.fillStyle = 'rgba(8,9,22,0.85)'
  ctx.beginPath()
  ctx.moveTo(-size * 0.6, -size * 0.04)
  ctx.lineTo(-size * 0.42, -size * 0.13)
  ctx.lineTo(size * 0.05, -size * 0.16)
  ctx.lineTo(size * 0.5, -size * 0.09)
  ctx.lineTo(size * 0.63, 0.02 * size)
  ctx.lineTo(size * 0.32, size * 0.34)
  ctx.lineTo(-size * 0.04, size * 0.46)
  ctx.lineTo(-size * 0.36, size * 0.23)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(80,130,220,0.2)'
  ctx.lineWidth = 1.4
  ctx.stroke()
  // top moss/glow
  ctx.strokeStyle = 'rgba(90,220,255,0.3)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-size * 0.42, -size * 0.12)
  ctx.lineTo(size * 0.05, -size * 0.15)
  ctx.lineTo(size * 0.5, -size * 0.08)
  ctx.stroke()
  // little shards
  ctx.fillStyle = 'rgba(12,14,30,0.7)'
  for (let i = 0; i < 3; i++) {
    const ax = (Math.sin(seed * 3 + i * 2) * size * 0.55)
    const ay = size * 0.48 + i * 8
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(ax + 5, ay + 8)
    ctx.lineTo(ax - 4, ay + 7)
    ctx.closePath(); ctx.fill()
  }
  ctx.restore()
}

function drawArena(game, ctx) {
  const t = game.s.time
  const top = WORLD.ground
  // Under-glow
  ctx.save()
  const ug = ctx.createLinearGradient(0, top - 10, 0, top + 90)
  ug.addColorStop(0, 'rgba(55,200,255,0.18)')
  ug.addColorStop(1, 'rgba(30,90,200,0)')
  ctx.fillStyle = ug
  ctx.fillRect(0, top - 10, WORLD.width, 100)
  ctx.restore()

  // front face
  const face = ctx.createLinearGradient(0, top, 0, 1150)
  face.addColorStop(0, '#2b3350')
  face.addColorStop(0.06, '#1c233c')
  face.addColorStop(0.5, '#0d1225')
  face.addColorStop(1, '#05060f')
  ctx.fillStyle = face
  ctx.beginPath()
  ctx.moveTo(55, top + 10)
  ctx.lineTo(1545, top + 10)
  ctx.lineTo(1485, 1170)
  ctx.lineTo(118, 1170)
  ctx.closePath()
  ctx.fill()

  // top slab
  const slab = ctx.createLinearGradient(0, top - 18, 0, top + 22)
  slab.addColorStop(0, '#3b4567')
  slab.addColorStop(0.35, '#232b47')
  slab.addColorStop(1, '#11172b')
  ctx.fillStyle = slab
  ctx.fillRect(50, top - 12, 1500, 34)

  // glowing rim
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const rim = ctx.createLinearGradient(0, top - 14, 0, top + 10)
  rim.addColorStop(0, 'rgba(120,230,255,0)')
  rim.addColorStop(0.55, 'rgba(100,220,255,0.55)')
  rim.addColorStop(1, 'rgba(40,110,255,0)')
  ctx.fillStyle = rim
  ctx.fillRect(55, top - 14, 1490, 24)
  ctx.restore()
  ctx.strokeStyle = 'rgba(130,235,255,0.7)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(56, top - 11); ctx.lineTo(1544, top - 11); ctx.stroke()

  // top surface tiles
  ctx.save()
  ctx.globalAlpha = 0.4
  ctx.strokeStyle = '#63749d'
  ctx.lineWidth = 1
  for (let x = 90; x < 1520; x += 118) {
    ctx.beginPath(); ctx.moveTo(x, top - 10); ctx.lineTo(x + 22, top + 20); ctx.stroke()
  }
  ctx.beginPath(); ctx.moveTo(60, top + 5); ctx.lineTo(1540, top + 5); ctx.stroke()
  ctx.restore()

  // front face panels
  ctx.save()
  ctx.strokeStyle = 'rgba(90,120,180,0.18)'
  ctx.lineWidth = 1.5
  for (let x = 80; x < 1540; x += 162) {
    ctx.beginPath(); ctx.moveTo(x, top + 30); ctx.lineTo(x + 20, 1170); ctx.stroke()
  }
  for (let y = top + 92; y < 1160; y += 92) {
    ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(1540, y); ctx.stroke()
  }
  // glowing cracks
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = 'rgba(70,190,255,0.24)'
  ctx.lineWidth = 1.6
  const cracks = [
    [180, top + 60, 220, top + 170, 200, top + 250],
    [1210, top + 44, 1170, top + 180, 1235, top + 320],
    [690, top + 120, 730, top + 220, 690, top + 360]
  ]
  for (const c of cracks) {
    ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[2], c[3]); ctx.lineTo(c[4], c[5]); ctx.stroke()
  }
  ctx.restore()

  // rune circle on top
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = `rgba(90,210,255,${0.18 + Math.sin(t * 1.4) * 0.04})`
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.ellipse(800, top + 2, 590, 19, 0, 0, TAU); ctx.stroke()
  ctx.strokeStyle = 'rgba(255,180,70,0.12)'
  ctx.beginPath(); ctx.ellipse(800, top + 4, 430, 13, 0, 0, TAU); ctx.stroke()
  ctx.restore()

  // floating debris at arena edge
  ctx.save()
  ctx.fillStyle = '#10162a'
  for (let i = 0; i < 7; i++) {
    const x = 60 + i * 235 + Math.sin(t * 0.8 + i) * 16
    const y = top + 35 + Math.cos(t * 0.7 + i * 2) * 10
    const s = 5 + (i % 3) * 4
    ctx.beginPath()
    ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s * 0.6); ctx.lineTo(x - s * 0.8, y)
    ctx.closePath(); ctx.fill()
  }
  ctx.restore()
}

function drawArenaForeground(ctx, game) {
  const t = game.s.time
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  // ambient motes close to the floor
  for (let i = 0; i < 18; i++) {
    const x = ((i * 173 + t * (8 + i % 5)) % WORLD.width)
    const y = WORLD.ground + 10 + Math.sin(t * 0.8 + i) * 12
    ctx.fillStyle = `rgba(100,210,255,${0.06 + (i % 4) * 0.02})`
    ctx.beginPath(); ctx.arc(x, y, 1.4 + (i % 3), 0, TAU); ctx.fill()
  }
  ctx.restore()
}

function drawTelegraphs(game, ctx) {
  for (const t of game.s.telegraphs) {
    const ratio = clamp(t.t / t.max, 0, 1)
    const pulse = 0.5 + Math.sin(t.t * 18) * 0.5
    ctx.save()
    ctx.translate(t.x, WORLD.ground - 2)
    ctx.scale(1, 0.24)
    ctx.fillStyle = `rgba(255,50,70,${0.08 + ratio * 0.12 + pulse * 0.04})`
    ctx.beginPath(); ctx.arc(0, 0, t.radius, 0, TAU); ctx.fill()
    ctx.strokeStyle = `rgba(255,90,110,${0.55 + pulse * 0.2})`
    ctx.lineWidth = 5
    ctx.beginPath(); ctx.arc(0, 0, t.radius, 0, TAU); ctx.stroke()
    ctx.strokeStyle = `rgba(255,230,140,${0.8 - ratio * 0.4})`
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(0, 0, t.radius * (1 - ratio), 0, TAU); ctx.stroke()
    ctx.restore()
  }
}

function drawAfterimages(game, ctx) {
  for (const a of game.s.afterimages) {
    const alpha = clamp(a.life / a.maxLife, 0, 1) * 0.36
    drawFighter(ctx, a, game.s.time, { alpha, noShadow: true, tint: '#8fe8ff' })
  }
}

function drawBeams(game, ctx) {
  const t = game.s.time
  for (const b of game.s.beams) {
    const lifeR = clamp(b.life / b.maxLife, 0, 1)
    const len = WORLD.width + 500
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.scale(b.dir, 1)
    ctx.globalCompositeOperation = 'lighter'
    const flick = 0.9 + Math.sin(t * 30 + b.x) * 0.08
    const w = (b.width / 2) * flick
    const h = (b.height / 2) * flick
    // outer
    const grad = ctx.createLinearGradient(0, 0, 1200, 0)
    grad.addColorStop(0, hexA(b.color2, 0.85 * lifeR))
    grad.addColorStop(0.08, hexA(b.color, 0.7 * lifeR))
    grad.addColorStop(0.65, hexA(b.color, 0.32 * lifeR))
    grad.addColorStop(1, hexA(b.color, 0))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(0, -w * 1.85)
    for (let x = 0; x <= len; x += 70) {
      ctx.lineTo(x, -w * 1.85 + Math.sin(x * 0.026 - t * 20) * 7)
    }
    for (let x = len; x >= 0; x -= 70) {
      ctx.lineTo(x, w * 1.85 + Math.sin(x * 0.026 - t * 20) * 7)
    }
    ctx.closePath(); ctx.fill()

    // core
    const core = ctx.createLinearGradient(0, 0, 1000, 0)
    core.addColorStop(0, `rgba(255,255,255,${0.95 * lifeR})`)
    core.addColorStop(0.12, hexA(b.color2, 0.9 * lifeR))
    core.addColorStop(0.7, hexA(b.color2, 0.4 * lifeR))
    core.addColorStop(1, hexA(b.color2, 0))
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.moveTo(0, -h * 0.46)
    for (let x = 0; x <= len; x += 80) {
      ctx.lineTo(x, -h * 0.46 + Math.sin(x * 0.04 - t * 26) * 4)
    }
    for (let x = len; x >= 0; x -= 80) {
      ctx.lineTo(x, h * 0.46 + Math.sin(x * 0.04 - t * 26) * 4)
    }
    ctx.closePath(); ctx.fill()

    // energy rings travelling
    for (let i = 0; i < 5; i++) {
      const x = ((t * 950 + i * 220) % 1300)
      const a = (1 - x / 1300) * 0.55 * lifeR
      ctx.strokeStyle = hexA(b.color2, a)
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.ellipse(x, 0, 10, h * 0.7, 0, 0, TAU); ctx.stroke()
    }
    // source flare
    const flare = ctx.createRadialGradient(0, 0, 1, 0, 0, b.width * 2.2)
    flare.addColorStop(0, `rgba(255,255,255,${0.95 * lifeR})`)
    flare.addColorStop(0.3, hexA(b.color2, 0.8 * lifeR))
    flare.addColorStop(0.7, hexA(b.color, 0.35 * lifeR))
    flare.addColorStop(1, hexA(b.color, 0))
    ctx.fillStyle = flare
    ctx.beginPath(); ctx.arc(0, 0, b.width * 2.2, 0, TAU); ctx.fill()
    ctx.restore()
  }
}

function drawProjectiles(game, ctx) {
  const t = game.s.time
  for (const p of game.s.projectiles) {
    const r = p.r
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    // streak
    const ang = Math.atan2(p.vy, p.vx)
    ctx.strokeStyle = hexA(p.color, 0.28)
    ctx.lineWidth = r * 0.33
    ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(p.x - Math.cos(ang) * r * 3.4, p.y - Math.sin(ang) * r * 3.4); ctx.lineTo(p.x, p.y); ctx.stroke()
    const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, r * 2.8)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.15, p.color2)
    g.addColorStop(0.45, hexA(p.color, 0.7))
    g.addColorStop(1, hexA(p.color, 0))
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 2.8, 0, TAU); ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.5, 0, TAU); ctx.fill()
    ctx.strokeStyle = hexA(p.color2, 0.8)
    ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke()
    if (p.kind === 'spirit' || p.kind === 'orb') {
      ctx.strokeStyle = hexA(p.color2, 0.5)
      ctx.lineWidth = 2
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.ellipse(p.x, p.y, r * (1.1 + i * 0.18), r * 0.4, t * (1 + i * 0.2) + i, 0, TAU)
        ctx.stroke()
      }
    }
    ctx.restore()
  }
}

function drawParticles(game, ctx) {
  for (const p of game.s.particles) {
    const a = clamp(p.life / p.maxLife, 0, 1)
    ctx.save()
    if (p.glow) ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = a
    ctx.fillStyle = p.color
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.4, p.size * (0.4 + a * 0.8)), 0, TAU); ctx.fill()
    ctx.restore()
  }
}

function drawRings(game, ctx) {
  for (const r of game.s.rings) {
    const p = clamp(r.t / r.life, 0, 1)
    const radius = r.max * (1 - Math.pow(1 - p, 2.4))
    const a = (1 - p) * 0.9
    ctx.save()
    ctx.translate(r.x, r.y)
    if (r.y > WORLD.ground - 35) ctx.scale(1, 0.34)
    ctx.globalCompositeOperation = 'lighter'
    if (r.fill) {
      const g = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius)
      g.addColorStop(0, hexA(r.color, a * 0.28))
      g.addColorStop(0.7, hexA(r.color, a * 0.1))
      g.addColorStop(1, hexA(r.color, 0))
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.fill()
    }
    ctx.strokeStyle = hexA(r.color, a)
    ctx.lineWidth = r.width * (0.6 + (1 - p) * 0.8)
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.stroke()
    ctx.restore()
  }
}

function drawTexts(game, ctx) {
  for (const t of game.s.texts) {
    const a = clamp(t.life / t.maxLife, 0, 1)
    const pop = 1 + (1 - a) * 0.28
    ctx.save()
    ctx.globalAlpha = Math.min(1, a * 1.6)
    ctx.translate(t.x, t.y)
    ctx.scale(pop, pop)
    ctx.font = `900 ${t.size}px Impact, "Arial Black", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 4
    ctx.strokeStyle = 'rgba(0,0,0,0.85)'
    ctx.strokeText(t.text, 0, 0)
    ctx.fillStyle = t.color
    ctx.fillText(t.text, 0, 0)
    ctx.restore()
  }
}

function drawSpeedLines(game, ctx) {
  for (const l of game.s.speedlines) {
    const a = clamp(l.life / l.maxLife, 0, 1)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = a * 0.42
    ctx.strokeStyle = l.color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(l.x, l.y)
    ctx.lineTo(l.x + Math.cos(l.angle) * l.len, l.y + Math.sin(l.angle) * l.len)
    ctx.stroke()
    ctx.restore()
  }
}

function drawWorldUI(game, ctx) {
  const e = game.s.enemy
  if (e && !e.dead && e.state === 'special' && e.attackName) {
    const y = e.y - 252 * e.scale
    const pulse = 0.5 + Math.sin(game.s.time * 18) * 0.5
    ctx.save()
    ctx.translate(e.x, y)
    ctx.font = '900 17px Impact, "Arial Black", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 5
    ctx.strokeStyle = 'rgba(0,0,0,.8)'
    ctx.strokeText(e.attackName, 0, 0)
    ctx.fillStyle = e.special?.color || '#ff6a50'
    ctx.fillText(e.attackName, 0, 0)
    ctx.fillStyle = `rgba(255,60,60,${0.5 + pulse * 0.5})`
    ctx.beginPath()
    ctx.moveTo(0, -24)
    ctx.lineTo(8, -14)
    ctx.lineTo(3, -14)
    ctx.lineTo(3, -8)
    ctx.lineTo(-3, -8)
    ctx.lineTo(-3, -14)
    ctx.lineTo(-8, -14)
    ctx.closePath(); ctx.fill()
    ctx.restore()
  }
}

function drawOffscreen(game) {
  const s = game.s
  if (!s.enemy || s.mode === 'title') return
  const p = screenPoint(game, s.enemy.x, s.enemy.y - 105)
  const margin = 34
  if (p.x > margin && p.x < game.cw - margin) return
  const ctx = game.ctx
  const left = p.x <= margin
  const x = left ? margin : game.cw - margin
  const y = clamp(p.y, 110, game.ch - 130)
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = 'rgba(255,70,90,0.85)'
  ctx.beginPath()
  if (left) {
    ctx.moveTo(-18, 0); ctx.lineTo(8, -16); ctx.lineTo(8, 16)
  } else {
    ctx.moveTo(18, 0); ctx.lineTo(-8, -16); ctx.lineTo(-8, 16)
  }
  ctx.closePath(); ctx.fill()
  ctx.font = '800 10px "Trebuchet MS", sans-serif'
  ctx.textAlign = left ? 'left' : 'right'
  ctx.fillStyle = 'rgba(255,200,205,.9)'
  ctx.fillText(s.enemy.name, left ? 24 : -24, 4)
  ctx.restore()
}

function drawLetterbox(game) {
  if (!game.s.finish) return
  const ctx = game.ctx
  const h = game.ch * 0.055
  const g1 = ctx.createLinearGradient(0, 0, 0, h)
  g1.addColorStop(0, '#000'); g1.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g1
  ctx.fillRect(0, 0, game.cw, h)
  const g2 = ctx.createLinearGradient(0, game.ch - h, 0, game.ch)
  g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, '#000')
  ctx.fillStyle = g2
  ctx.fillRect(0, game.ch - h, game.cw, h)
}

function drawFlash(game) {
  if (game.s.flash <= 0.001) return
  const ctx = game.ctx
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.fillStyle = hexA(game.s.flashColor, Math.min(0.92, game.s.flash))
  ctx.fillRect(0, 0, game.cw, game.ch)
  ctx.restore()
}

function drawScreenVignette(game) {
  // CSS handles most of it; this adds a soft cinematic top glow.
  const ctx = game.ctx
  ctx.save()
  const g = ctx.createRadialGradient(game.cw * 0.62, game.ch * 0.3, 20, game.cw * 0.62, game.ch * 0.3, game.ch * 0.9)
  g.addColorStop(0, 'rgba(80,140,255,0.05)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, game.cw, game.ch)
  ctx.restore()
}

function drawTitleDragon(ctx, t, cw, ch) {
  if (cw < 560) return
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.strokeStyle = 'rgba(60,200,120,0.10)'
  ctx.lineWidth = 20
  ctx.lineCap = 'round'
  ctx.beginPath()
  const y0 = ch * 0.58
  ctx.moveTo(-30, y0)
  ctx.bezierCurveTo(cw * 0.18, ch * 0.28, cw * 0.3, ch * 0.72, cw * 0.48, ch * 0.44)
  ctx.bezierCurveTo(cw * 0.63, ch * 0.2, cw * 0.75, ch * 0.55, cw * 0.86, ch * 0.31)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(110,255,150,0.2)'
  ctx.lineWidth = 5
  ctx.stroke()
  // Fins
  for (let i = 0; i < 9; i++) {
    const x = cw * (0.06 + i * 0.09)
    const y = ch * (0.48 + Math.sin(i * 1.3 + t * 0.15) * 0.11)
    ctx.fillStyle = 'rgba(100,255,150,0.13)'
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 17, y - 20)
    ctx.lineTo(x + 26, y + 6)
    ctx.closePath(); ctx.fill()
  }
  ctx.restore()
}

function hexA(hex, alpha) {
  if (!hex) return `rgba(255,255,255,${alpha})`
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}
