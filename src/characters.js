import { FORMS, WORLD } from './data.js'
import { GROUND } from './game.js'

const TAU = Math.PI * 2
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

function pal(f) {
  const isPlayer = f.kind === 'player'
  const look = f.look || f.def?.look || {}
  const v = isPlayer ? 'goku' : (look.body || 'goku')
  const form = FORMS[f.form || 0]
  const base = {
    v,
    skin: look.skin || '#f0c198',
    skin2: look.skin2 || '#c99066',
    gi: look.suit || '#e86a1f',
    gi2: look.suit2 || '#a9410c',
    under: '#173b93',
    pants: look.suit || '#e86a1f',
    pants2: look.suit2 || '#a9410c',
    boot: '#172347',
    boot2: '#0d1428',
    belt: '#f1e6c8',
    wrist: '#1d3b8f',
    hair: v === 'black' ? (look.hair || '#ff70b8') : (isPlayer ? form.hair : (look.hair || '#15161c')),
    hair2: v === 'black' ? '#ffd0e5' : (isPlayer ? form.hair2 : '#3a3b46'),
    accent: look.accent || '#ffcf4a',
    aura: isPlayer ? form.aura : (f.def?.aura || look.accent || '#ffcf4a'),
    aura2: isPlayer ? form.aura2 : (f.def?.aura2 || '#ffffff'),
    eye: isPlayer ? form.eye : (look.eye || '#ff5555'),
    eyeWhite: '#f7f4ec',
    outline: '#070810'
  }
  if (v === 'black') {
    base.gi = '#17151d'
    base.gi2 = '#0a0910'
    base.pants = '#17151d'
    base.pants2 = '#0a0910'
    base.under = '#ff5d9e'
    base.boot = '#0b0a10'
    base.wrist = '#ff5d9e'
    base.belt = '#ffd0e5'
  }
  if (v === 'frieza') {
    base.skin = look.skin
    base.skin2 = look.skin2
    base.armor = look.armor
    base.accent = look.accent
    base.eye = look.eye
    base.gi = look.skin
    base.hair = look.hair
  }
  if (v === 'cell') {
    base.skin = look.skin
    base.skin2 = look.skin2
    base.accent = look.accent
    base.armor = look.armor
    base.eye = look.eye
  }
  if (v === 'buu') {
    base.skin = look.skin
    base.skin2 = look.skin2
    base.gi = look.skin
    base.pants = '#f2ebdc'
    base.pants2 = '#c9bfa9'
    base.boot = '#2b1a34'
    base.eye = look.eye
  }
  if (v === 'broly') {
    base.skin = look.skin
    base.skin2 = look.skin2
    base.pants = '#332f28'
    base.pants2 = '#1c1915'
    base.boot = '#181713'
    base.wrist = '#1c1915'
    base.hair = look.hair
    base.hair2 = '#f1ffb8'
    base.eye = look.eye
  }
  if (v === 'beerus') {
    base.skin = look.skin
    base.skin2 = look.skin2
    base.pants = '#241b31'
    base.pants2 = '#120c1b'
    base.boot = '#120c1b'
    base.belt = '#e7c35c'
    base.eye = look.eye
    base.accent = look.accent
  }
  if (v === 'jiren') {
    base.skin = look.skin
    base.skin2 = look.skin2
    base.gi = '#20242b'
    base.gi2 = '#101216'
    base.pants = '#20242b'
    base.pants2 = '#101216'
    base.boot = '#0e1013'
    base.wrist = '#0e1013'
    base.eye = look.eye
    base.accent = look.accent
  }
  return base
}

function limb(ctx, x, y, a1, a2, l1, l2, w1, w2, color, outline, capColor, capW) {
  const kx = x + Math.sin(a1) * l1
  const ky = y + Math.cos(a1) * l1
  const fx = kx + Math.sin(a2) * l2
  const fy = ky + Math.cos(a2) * l2
  ctx.lineCap = 'round'
  ctx.strokeStyle = outline
  ctx.lineWidth = w1 + 5
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke()
  ctx.strokeStyle = color
  ctx.lineWidth = w1
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(kx, ky); ctx.stroke()
  ctx.lineWidth = w2
  ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke()
  if (capColor) {
    ctx.strokeStyle = capColor
    ctx.lineWidth = w2 + 1
    ctx.beginPath()
    ctx.moveTo(kx, ky)
    ctx.lineTo(kx + Math.sin(a2) * l2 * 0.26, ky + Math.cos(a2) * l2 * 0.26)
    ctx.stroke()
  }
  return { kx, ky, fx, fy }
}

function hand(ctx, x, y, r, color, outline) {
  ctx.beginPath(); ctx.arc(x, y, r + 2.2, 0, TAU); ctx.fillStyle = outline; ctx.fill()
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = color; ctx.fill()
}

function foot(ctx, x, y, facing, color, dark, outline, big = false) {
  ctx.save()
  ctx.translate(x, y)
  ctx.beginPath()
  ctx.moveTo(-7, -4)
  ctx.quadraticCurveTo(-10, 4, -2, 6)
  ctx.lineTo(11 + (big ? 4 : 0), 5)
  ctx.quadraticCurveTo(16 + (big ? 4 : 0), 2, 12 + (big ? 4 : 0), -3)
  ctx.lineTo(3, -6)
  ctx.closePath()
  ctx.fillStyle = outline
  ctx.fill()
  ctx.translate(1, 0)
  ctx.beginPath()
  ctx.moveTo(-7, -4)
  ctx.quadraticCurveTo(-9, 3, -2, 5)
  ctx.lineTo(10 + (big ? 4 : 0), 4)
  ctx.quadraticCurveTo(14 + (big ? 4 : 0), 1, 11 + (big ? 4 : 0), -3)
  ctx.lineTo(3, -5)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.fillStyle = dark
  ctx.fillRect(-5, 3, 14 + (big ? 4 : 0), 2)
  ctx.restore()
}

function getPose(f, form, t) {
  const state = f.state || 'idle'
  const anim = f.anim || state
  const bob = Math.sin(t * 2.4) * 1.6
  const p = {
    bob, lean: 0.02, head: 0, hipY: -86,
    armF: [0.28, 0.5], armB: [-0.28, -0.48],
    legF: [0.16, 0.02], legB: [-0.22, -0.08],
    armScale: 1, legScale: 1, crouch: 0
  }
  const walk = Math.sin(t * 10.5)
  if (state === 'walk') {
    p.lean = 0.07
    p.armF = [0.35 + walk * 0.4, 0.5 + walk * 0.5]
    p.armB = [-0.35 - walk * 0.4, -0.55 - walk * 0.5]
    p.legF = [0.42 * walk + 0.1, 0.42 * walk - 0.08]
    p.legB = [-0.42 * walk - 0.1, -0.42 * walk - 0.08]
    p.bob = Math.abs(walk) * 2
  } else if (state === 'jump') {
    const rising = f.vy < 0
    p.lean = 0.02
    p.armF = [rising ? 1.1 : 0.8, rising ? 0.7 : 0.4]
    p.armB = [rising ? -1.05 : -0.8, rising ? -0.6 : -0.3]
    p.legF = [0.72, 0.95]
    p.legB = [-0.42, 0.8]
    p.bob = -2
  } else if (state === 'dash') {
    p.lean = 0.3
    p.armF = [-0.3, -0.7]
    p.armB = [0.8, 1.2]
    p.legF = [0.85, 1.1]
    p.legB = [-0.65, -0.85]
    p.bob = -3
  } else if (state === 'charge') {
    p.lean = -0.07
    p.armF = [0.8, 1.55]
    p.armB = [-0.8, -1.55]
    p.legF = [0.32, 0.18]
    p.legB = [-0.4, -0.25]
    p.bob = Math.sin(t * 14) * 1.2
  } else if (state === 'guard') {
    p.lean = -0.03
    p.armF = [0.95, 2.4]
    p.armB = [0.45, 2.6]
    p.legF = [0.25, 0.1]
    p.legB = [-0.3, -0.18]
  } else if (state === 'hurt') {
    p.lean = -0.28
    p.head = -0.16
    p.armF = [0.9, 1.5]
    p.armB = [-1.1, -1.5]
    p.legF = [0.35, 0.55]
    p.legB = [-0.5, -0.2]
  } else if (state === 'beam') {
    p.lean = -0.05
    p.armF = [1.47, 1.48]
    p.armB = [1.22, 1.34]
    p.legF = [0.3, 0.2]
    p.legB = [-0.42, -0.28]
  } else if (state === 'beamCharge') {
    p.lean = -0.06
    p.armF = [0.72, 1.3]
    p.armB = [0.48, 1.55]
    p.legF = [0.32, 0.18]
    p.legB = [-0.42, -0.27]
  } else if (state === 'cast') {
    p.lean = 0.07
    p.armF = [1.4, 1.52]
    p.armB = [-0.25, -0.58]
    p.legF = [0.28, 0.16]
    p.legB = [-0.36, -0.2]
  } else if (state === 'attack') {
    const kind = f.attackKind || 'light'
    const prog = clamp((f.attackT || 0) / Math.max(0.01, f.attackDuration || 0.3), 0, 1)
    if (kind === 'heavy') {
      if (prog < 0.42) {
        p.lean = -0.14
        p.armF = [-0.9, -1.25]
        p.armB = [0.55, 0.9]
        p.legF = [0.25, 0.15]
        p.legB = [-0.35, -0.15]
      } else {
        p.lean = 0.2
        p.armF = [1.5, 1.52]
        p.armB = [-0.7, -1.0]
        p.legF = [0.38, 0.22]
        p.legB = [-0.5, -0.32]
      }
    } else if (f.anim === 'kick') {
      p.lean = -0.03
      p.legF = [1.34, 1.42]
      p.legB = [-0.25, -0.12]
      p.armF = [0.55, 0.9]
      p.armB = [-0.7, -1.15]
    } else {
      const wind = prog < 0.2
      p.lean = wind ? -0.05 : 0.13
      p.armF = wind ? [0.55, 0.9] : [1.5, 1.6]
      p.armB = wind ? [-0.8, -1.15] : [-0.5, -0.85]
      p.legF = [0.25, 0.12]
      p.legB = [-0.38, -0.22]
    }
  } else if (state === 'transform') {
    p.lean = -0.02
    p.armF = [2.35, 2.5]
    p.armB = [-2.35, -2.5]
    p.legF = [0.4, 0.28]
    p.legB = [-0.45, -0.3]
    p.bob = Math.sin(t * 18) * 2
  } else if (state === 'solar') {
    p.lean = -0.04
    p.armF = [1.45, 2.35]
    p.armB = [1.2, 2.5]
    p.legF = [0.28, 0.14]
    p.legB = [-0.36, -0.2]
  } else if (state === 'spirit') {
    p.lean = -0.03
    p.armF = [2.65, 2.75]
    p.armB = [-2.65, -2.75]
    p.legF = [0.32, 0.2]
    p.legB = [-0.4, -0.26]
    p.bob = Math.sin(t * 5) * 2
  } else if (state === 'dragon') {
    p.lean = 0.26
    p.armF = [1.52, 1.58]
    p.armB = [-0.95, -1.3]
    p.legF = [0.62, 0.72]
    p.legB = [-0.62, -0.5]
  } else if (state === 'victory') {
    p.armF = [2.75, 2.85]
    p.armB = [-2.7, -2.8]
    p.legF = [0.2, 0.08]
    p.legB = [-0.24, -0.12]
    p.bob = Math.sin(t * 3.2) * 2
  } else if (state === 'ko') {
    p.lean = 0
    p.armF = [0.4, 0.8]
    p.armB = [-0.6, -0.9]
    p.legF = [0.3, 0.5]
    p.legB = [-0.3, -0.5]
  }
  return p
}

export function drawFighter(ctx, f, t, opts = {}) {
  const form = FORMS[f.form || 0]
  const p = pal(f)
  const scale = f.scale || 1
  const facing = f.facing || 1
  const pose = getPose(f, form, t)
  const isPlayer = f.kind === 'player'

  // Ground shadow
  if (!opts.noShadow) {
    const lift = clamp((GROUND - f.y) / 480, 0, 1)
    const alpha = 0.4 * (1 - lift * 0.72)
    const rx = 50 * scale * (1 - lift * 0.2)
    const shine = ctx.createRadialGradient(f.x, GROUND + 4, 2, f.x, GROUND + 4, rx)
    shine.addColorStop(0, `rgba(2,3,10,${alpha})`)
    shine.addColorStop(0.65, `rgba(3,4,12,${alpha * 0.55})`)
    shine.addColorStop(1, 'rgba(3,4,12,0)')
    ctx.save()
    ctx.translate(f.x, GROUND + 3)
    ctx.scale(1, 0.23)
    ctx.fillStyle = shine
    ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill()
    ctx.restore()
  }

  ctx.save()
  ctx.translate(f.x, f.y)
  if (f.state === 'ko' && (f.koT || 0) > 0.12) {
    const fall = clamp((f.koT - 0.12) * 3.4, 0, 1)
    ctx.rotate(-facing * fall * 1.42)
    ctx.translate(0, -8 * fall)
  }
  ctx.scale(facing * scale, scale)
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha
  if (opts.tint) ctx.globalAlpha = (opts.alpha ?? 1) * 0.55

  drawAura(ctx, f, p, form, t, opts)
  drawBackExtras(ctx, f, p, pose, t)
  drawBody(ctx, f, p, pose, form, t, opts)
  drawFrontExtras(ctx, f, p, pose, form, t, opts)
  drawChargeOrb(ctx, f, p, pose, form, t)

  // Cheap hit / transformation flash: a bright core overlay beats a canvas
  // filter here, which is far too expensive on low-end GPUs and software.
  if (f.hitFlash > 0.03) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = Math.min(0.5, f.hitFlash * 2.4)
    ctx.fillStyle = '#fff4dd'
    ctx.beginPath()
    ctx.ellipse(0, -102, 30, 84, 0, 0, TAU)
    ctx.fill()
    ctx.restore()
  } else if (f.formFx > 0) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = Math.min(0.4, f.formFx * 0.24)
    ctx.strokeStyle = form.aura2
    ctx.lineWidth = 10
    ctx.beginPath()
    ctx.ellipse(0, -102, 40, 96, 0, 0, TAU)
    ctx.stroke()
    ctx.restore()
  }
  ctx.restore()
}

function drawAura(ctx, f, p, form, t, opts) {
  const isPlayer = f.kind === 'player'
  const level = isPlayer ? f.form || 0 : (f.enraged ? 4 : 2)
  const active = f.state === 'charge' || f.state === 'transform' || f.state === 'spirit' || f.formFx > 0
  if (level <= 0 && !active) return
  const color = p.aura
  const color2 = p.aura2
  const baseAlpha = isPlayer ? (level === 0 ? 0.18 : form.auraAlpha) : (f.enraged ? 0.7 : 0.42)
  const boost = f.state === 'charge' ? 1.25 : f.state === 'transform' ? 1.55 : f.formFx > 0 ? 1.35 : 1
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const glow = ctx.createRadialGradient(0, -108, 12, 0, -108, 128 * boost)
  glow.addColorStop(0, hexA(color, 0.34 * baseAlpha))
  glow.addColorStop(0.45, hexA(color, 0.16 * baseAlpha))
  glow.addColorStop(1, hexA(color, 0))
  ctx.fillStyle = glow
  ctx.beginPath(); ctx.ellipse(0, -108, 76 * boost, 142 * boost, 0, 0, TAU); ctx.fill()

  const n = isPlayer ? 12 + level * 2 : 10
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? 1 : -1
    const x = (i - n / 2) * 8 + Math.sin(t * 5 + i * 2.1) * 5
    const h = (70 + (i % 4) * 24 + Math.sin(t * 9 + i * 1.7) * 20 + level * 9) * boost
    const w = 7 + (i % 3) * 4
    const hue = i % 3 === 0 ? color2 : color
    const g = ctx.createLinearGradient(x, -10, x, -h - 40)
    g.addColorStop(0, hexA(hue, 0))
    g.addColorStop(0.3, hexA(hue, 0.22 * baseAlpha))
    g.addColorStop(0.75, hexA(hue, 0.34 * baseAlpha))
    g.addColorStop(1, hexA(hue, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(x - w, 0)
    ctx.quadraticCurveTo(x - w * 0.55, -h * 0.55, x - w * 0.16, -h)
    ctx.quadraticCurveTo(x + w * 0.6, -h * 0.5, x + w, 0)
    ctx.closePath()
    ctx.fill()
    if (side > 0 && i % 2 === 0) {
      ctx.strokeStyle = hexA(color2, 0.10 * baseAlpha)
      ctx.lineWidth = 1.4
      ctx.stroke()
    }
  }

  if (isPlayer && form.lightning) {
    for (let i = 0; i < 4; i++) {
      const sx = Math.sin(t * 7 + i * 4) * 58
      const sy = -40 - ((i * 43 + t * 60) % 150)
      const bolt = () => {
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        for (let j = 1; j <= 4; j++) {
          ctx.lineTo(sx + Math.sin(t * 30 + i * 9 + j) * 16, sy + j * 9)
        }
        ctx.stroke()
      }
      ctx.strokeStyle = hexA(color2, 0.18)
      ctx.lineWidth = 4.5
      bolt()
      ctx.strokeStyle = hexA(color2, 0.8)
      ctx.lineWidth = 1.4
      bolt()
    }
  }
  if (isPlayer && level >= 7) {
    ctx.strokeStyle = hexA('#ffffff', 0.24 + Math.sin(t * 4) * 0.06)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(0, -100 + Math.sin(t * 3) * 6, 48, 104, Math.sin(t * 1.4) * 0.12, 0, TAU)
    ctx.stroke()
  }
  ctx.restore()
}

function drawBackExtras(ctx, f, p, pose, t) {
  const v = p.v
  if (v === 'frieza') {
    ctx.save()
    ctx.strokeStyle = p.outline
    ctx.lineWidth = 15
    ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(-8, -78); ctx.bezierCurveTo(-70, -70, -82, -14, -48, 4); ctx.stroke()
    ctx.strokeStyle = p.skin; ctx.lineWidth = 10
    ctx.beginPath(); ctx.moveTo(-8, -78); ctx.bezierCurveTo(-70, -70, -82, -14, -48, 4); ctx.stroke()
    ctx.strokeStyle = p.armor; ctx.lineWidth = 5
    ctx.beginPath(); ctx.moveTo(-40, -6); ctx.bezierCurveTo(-48, 4, -54, 6, -60, 2); ctx.stroke()
    ctx.restore()
  }
  if (v === 'beerus') {
    ctx.strokeStyle = p.outline; ctx.lineWidth = 13; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(-10, -80); ctx.bezierCurveTo(-76, -70, -80, -18, -52, 0); ctx.stroke()
    ctx.strokeStyle = p.skin; ctx.lineWidth = 8
    ctx.beginPath(); ctx.moveTo(-10, -80); ctx.bezierCurveTo(-76, -70, -80, -18, -52, 0); ctx.stroke()
    ctx.restore()
  }
  if (v === 'cell') {
    ctx.save()
    ctx.fillStyle = p.outline
    ctx.beginPath()
    ctx.moveTo(-10, -64); ctx.quadraticCurveTo(-82, -108, -96, -46)
    ctx.quadraticCurveTo(-70, -42, -64, 8); ctx.quadraticCurveTo(-38, -24, -10, -30)
    ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#234b2a'
    ctx.beginPath()
    ctx.moveTo(-12, -64); ctx.quadraticCurveTo(-76, -102, -88, -48)
    ctx.quadraticCurveTo(-64, -44, -58, 2); ctx.quadraticCurveTo(-36, -24, -12, -32)
    ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#132d18'
    ctx.beginPath(); ctx.arc(-56, -68, 6, 0, TAU); ctx.arc(-72, -48, 4, 0, TAU); ctx.arc(-48, -36, 5, 0, TAU); ctx.fill()
    ctx.restore()
  }
  if (v === 'broly') {
    ctx.save()
    ctx.fillStyle = '#3a2a1e'
    ctx.beginPath()
    ctx.moveTo(-30, -64); ctx.quadraticCurveTo(-54, -40, -42, -8)
    ctx.lineTo(-20, -14); ctx.quadraticCurveTo(-30, -40, -16, -56)
    ctx.closePath(); ctx.fill()
    ctx.restore()
  }
}

function drawFrontExtras(ctx, f, p, pose, form, t, opts) {
  const v = p.v
  if (v === 'buu') {
    ctx.save()
    ctx.strokeStyle = p.outline; ctx.lineWidth = 5
    ctx.beginPath(); ctx.moveTo(2, -181); ctx.quadraticCurveTo(10 + Math.sin(t * 3) * 4, -212, 26, -214); ctx.stroke()
    ctx.strokeStyle = p.skin; ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.moveTo(2, -181); ctx.quadraticCurveTo(10 + Math.sin(t * 3) * 4, -212, 26, -214); ctx.stroke()
    ctx.fillStyle = p.outline; ctx.beginPath(); ctx.arc(27, -214, 6.5, 0, TAU); ctx.fill()
    ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(27, -214, 5, 0, TAU); ctx.fill()
    ctx.restore()
  }
  if (f.tinted && opts.alpha) {
    ctx.save(); ctx.globalAlpha *= 0.25
    ctx.restore()
  }
}

function drawChargeOrb(ctx, f, p, pose, form, t) {
  const handX = 48
  const handY = -128
  if (f.state === 'beamCharge') {
    const r = 9 + Math.min(1, (f.beamHold || 0) / 1.15) * 18
    drawOrb(ctx, handX, handY, r, p.aura, p.aura2)
  }
  if (f.state === 'skill' && f.skillId === 'spirit' && (f.spiritCharge || 0) > 0) {
    const r = 18 + (f.spiritCharge || 0) * 48
    drawOrb(ctx, 0, -232, r, '#8fe9ff', '#ffffff')
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(160,230,255,.5)'; ctx.lineWidth = 2
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.ellipse(0, -232, r + 12 + i * 8, r * 0.35 + 8, t * (0.7 + i * 0.2) + i, 0, TAU)
      ctx.stroke()
    }
    ctx.restore()
  }
  if (f.kind === 'enemy' && f.state === 'special' && f.special && (f.special.type === 'beam' || f.special.type === 'orb')) {
    const r = 8 + Math.min(1, (f.specialT || 0) / 1.1) * 20
    drawOrb(ctx, 52, -132, r, p.aura, p.aura2)
  }
}

function drawOrb(ctx, x, y, r, c1, c2) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createRadialGradient(x, y, 1, x, y, r * 2.6)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.18, c2)
  g.addColorStop(0.5, hexA(c1, 0.7))
  g.addColorStop(1, hexA(c1, 0))
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, TAU); ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.fill()
  ctx.strokeStyle = hexA(c2, 0.8); ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke()
  ctx.restore()
}

function drawBody(ctx, f, p, pose, form, t, opts) {
  const v = p.v
  const big = v === 'broly' ? 1.18 : v === 'jiren' ? 1.08 : 1
  const hipY = pose.hipY

  // ---- back leg
  const legW = (v === 'broly' ? 17 : v === 'buu' ? 16 : 14)
  const backLegColor = v === 'goku' || v === 'black' ? p.pants2 : p.skin2
  const bl = limb(ctx, -5, hipY, pose.legB[0], pose.legB[1], 43, 43, legW + 2, legW, backLegColor, p.outline,
    v === 'goku' || v === 'black' ? p.boot : v === 'buu' ? p.pants2 : null,
    v === 'goku' || v === 'black' ? 7 : 0)
  if (v === 'goku' || v === 'black') foot(ctx, bl.fx, bl.fy - 1, 1, p.boot, p.boot2, p.outline)
  else if (v === 'buu') {
    ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(bl.fx, bl.fy - 1, 7.5, 0, TAU); ctx.fill()
  } else if (v === 'frieza') foot(ctx, bl.fx, bl.fy - 1, 1, p.armor, p.accent, p.outline)

  // ---- upper body transform
  ctx.save()
  ctx.translate(0, hipY)
  ctx.rotate(pose.lean)
  ctx.translate(0, pose.bob)

  // back arm
  const shoulderY = -52
  drawArm(ctx, -7, shoulderY, pose.armB[0], pose.armB[1], p, v, false, big)
  // torso
  drawTorso(ctx, f, p, v, form, t, opts)
  // head
  drawHead(ctx, f, p, v, form, t)
  // front arm
  drawArm(ctx, 5, shoulderY - 2, pose.armF[0], pose.armF[1], p, v, true, big)

  ctx.restore()

  // ---- front leg (drawn after torso so it overlays the hip)
  const frontLegColor = v === 'goku' || v === 'black' ? p.pants : p.skin
  const fl = limb(ctx, 4, hipY, pose.legF[0], pose.legF[1], 43, 43, legW + 2, legW, frontLegColor, p.outline,
    v === 'goku' || v === 'black' ? p.boot : v === 'buu' ? p.pants2 : null,
    v === 'goku' || v === 'black' ? 7 : 0)
  if (v === 'goku' || v === 'black') foot(ctx, fl.fx, fl.fy - 1, 1, p.boot, p.boot2, p.outline)
  else if (v === 'buu') {
    ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(fl.fx, fl.fy - 1, 7.5, 0, TAU); ctx.fill()
  } else if (v === 'frieza') foot(ctx, fl.fx, fl.fy - 1, 1, p.armor, p.accent, p.outline)
  else if (v === 'broly') foot(ctx, fl.fx, fl.fy - 1, 1, p.boot, p.boot2, p.outline, true)
}

function drawArm(ctx, sx, sy, a1, a2, p, v, front, big) {
  const upper = big ? 37 : 33
  const fore = big ? 36 : 31
  const w1 = (front ? 11 : 9.5) * (big ? 1.2 : 1)
  const w2 = (front ? 9.5 : 8) * (big ? 1.2 : 1)
  let color = p.skin
  let cap = null
  if (v === 'goku') cap = p.wrist
  if (v === 'black') { color = p.gi; cap = p.wrist }
  if (v === 'frieza') { color = p.armor; cap = p.accent }
  if (v === 'cell') color = front ? p.skin : p.skin2
  if (v === 'buu') color = p.skin
  if (v === 'broly') { color = p.skin; cap = p.wrist }
  if (v === 'beerus') { color = p.skin; cap = p.accent }
  if (v === 'jiren') { color = p.skin; cap = p.wrist }
  const l = limb(ctx, sx, sy, a1, a2, upper, fore, w1, w2, color, p.outline, cap, v === 'goku' ? 6 : 7)
  const handColor = v === 'frieza' ? p.armor : v === 'cell' ? p.skin : p.skin
  hand(ctx, l.fx, l.fy, big ? 6.5 : 5.5, handColor, p.outline)
  if (v === 'jiren') {
    ctx.strokeStyle = p.accent; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(l.kx, l.ky); ctx.lineTo(l.fx, l.fy); ctx.stroke()
  }
  return l
}

function drawTorso(ctx, f, p, v, form, t, opts) {
  const outline = p.outline
  // Base torso silhouette
  ctx.beginPath()
  ctx.moveTo(-17, 4)
  ctx.quadraticCurveTo(-23, -28, -22, -48)
  ctx.quadraticCurveTo(-22, -58, -16, -61)
  ctx.lineTo(16, -61)
  ctx.quadraticCurveTo(23, -58, 22, -47)
  ctx.quadraticCurveTo(22, -26, 15, 4)
  ctx.closePath()
  ctx.fillStyle = v === 'goku' || v === 'black' ? p.gi : p.skin
  ctx.fill()
  ctx.strokeStyle = outline; ctx.lineWidth = 4; ctx.stroke()

  if (v === 'goku' || v === 'black') {
    // blue undershirt
    ctx.beginPath()
    ctx.moveTo(-16, -61); ctx.lineTo(-7, -61); ctx.lineTo(0, -43); ctx.lineTo(-12, -38); ctx.closePath()
    ctx.fillStyle = p.under; ctx.fill()
    ctx.beginPath()
    ctx.moveTo(16, -61); ctx.lineTo(7, -61); ctx.lineTo(0, -43); ctx.lineTo(12, -38); ctx.closePath()
    ctx.fillStyle = hexA(p.under, 0.92); ctx.fill()
    // gi shading
    ctx.beginPath()
    ctx.moveTo(6, -59); ctx.quadraticCurveTo(18, -40, 14, 3); ctx.lineTo(6, 3)
    ctx.quadraticCurveTo(13, -35, 1, -52); ctx.closePath()
    ctx.fillStyle = hexA(p.gi2, 0.55); ctx.fill()
    // belt
    ctx.fillStyle = p.belt
    ctx.fillRect(-17, -8, 33, 9)
    ctx.fillStyle = hexA('#000000', 0.25)
    ctx.fillRect(-17, 0, 33, 2)
    // knot
    ctx.beginPath(); ctx.arc(-10, -4, 5, 0, TAU); ctx.fillStyle = p.belt; ctx.fill()
    ctx.strokeStyle = hexA('#000000', 0.25); ctx.lineWidth = 1; ctx.stroke()
    // chest symbol
    if (v === 'goku') {
      ctx.save()
      ctx.globalAlpha = 0.7
      ctx.fillStyle = '#173b93'
      ctx.font = 'bold 20px "Trebuchet MS", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('悟', 12, -35)
      ctx.restore()
    }
    // folds
    ctx.strokeStyle = hexA('#ffffff', 0.22); ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(-13, -36); ctx.quadraticCurveTo(-8, -22, -11, -9); ctx.stroke()
  } else if (v === 'frieza') {
    // white chest armour
    ctx.beginPath()
    ctx.moveTo(-17, -58)
    ctx.quadraticCurveTo(-4, -45, 0, -29)
    ctx.quadraticCurveTo(5, -45, 17, -58)
    ctx.lineTo(18, -31)
    ctx.quadraticCurveTo(8, -20, 0, -16)
    ctx.quadraticCurveTo(-9, -20, -18, -32)
    ctx.closePath()
    ctx.fillStyle = p.armor; ctx.fill()
    ctx.strokeStyle = outline; ctx.lineWidth = 2.4; ctx.stroke()
    ctx.fillStyle = p.accent
    ctx.beginPath(); ctx.arc(-13, -49, 5, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.arc(13, -49, 5, 0, TAU); ctx.fill()
    ctx.strokeStyle = hexA(p.accent, 0.6); ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(-8, -24); ctx.lineTo(8, -24); ctx.stroke()
  } else if (v === 'cell') {
    // dark chest plates
    ctx.fillStyle = p.armor
    ctx.beginPath(); ctx.moveTo(-18, -56); ctx.lineTo(-3, -38); ctx.lineTo(-8, -19); ctx.lineTo(-19, -28); ctx.closePath(); ctx.fill()
    ctx.beginPath(); ctx.moveTo(18, -56); ctx.lineTo(3, -38); ctx.lineTo(8, -19); ctx.lineTo(19, -28); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#0d1411'
    ctx.beginPath(); ctx.moveTo(-7, -44); ctx.lineTo(7, -44); ctx.lineTo(10, -12); ctx.lineTo(-10, -12); ctx.closePath(); ctx.fill()
    // spots
    ctx.fillStyle = '#19301d'
    for (const [x, y, r] of [[-12, -51, 4], [13, -31, 3], [-10, -12, 3], [7, -54, 2.5]]) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill()
    }
    ctx.strokeStyle = p.accent; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(-14, -24); ctx.quadraticCurveTo(0, -17, 14, -24); ctx.stroke()
  } else if (v === 'buu') {
    // dark vest
    ctx.fillStyle = '#2b1a34'
    ctx.beginPath(); ctx.moveTo(-18, -58); ctx.lineTo(0, -43); ctx.lineTo(18, -58); ctx.lineTo(15, -8); ctx.lineTo(-15, -8); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = hexA('#ff9ad9', 0.5); ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(-11, -50); ctx.lineTo(-7, -14); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(11, -50); ctx.lineTo(7, -14); ctx.stroke()
    // baggy pants waist
    ctx.fillStyle = '#f2ebdc'
    ctx.beginPath(); ctx.moveTo(-18, 2); ctx.quadraticCurveTo(-24, -6, -15, -9); ctx.lineTo(15, -9); ctx.quadraticCurveTo(24, -6, 18, 2); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.stroke()
  } else if (v === 'broly') {
    // bare muscular chest
    ctx.fillStyle = p.skin2
    ctx.beginPath(); ctx.moveTo(-15, -48); ctx.quadraticCurveTo(0, -38, 15, -48); ctx.quadraticCurveTo(17, -22, 0, -15); ctx.quadraticCurveTo(-17, -22, -15, -48); ctx.fill()
    ctx.strokeStyle = hexA('#000000', 0.25); ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(0, -18); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(-16, -30); ctx.quadraticCurveTo(0, -23, 16, -30); ctx.stroke()
    // pelt
    ctx.fillStyle = '#4b3826'
    ctx.beginPath(); ctx.moveTo(-22, -4); ctx.quadraticCurveTo(-28, 8, -12, 10); ctx.lineTo(22, 8); ctx.quadraticCurveTo(28, -3, 18, -8); ctx.lineTo(-18, -8); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#2a1f15'; ctx.lineWidth = 2; ctx.stroke()
    ctx.strokeStyle = '#7b6043'; ctx.lineWidth = 1.5
    for (let i = -15; i < 18; i += 7) { ctx.beginPath(); ctx.moveTo(i, -5); ctx.lineTo(i + 2, 7); ctx.stroke() }
    // scar
    ctx.strokeStyle = '#a4564b'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(14, -50); ctx.lineTo(17, -38); ctx.stroke()
  } else if (v === 'beerus') {
    // dark chest + gold collar
    ctx.fillStyle = p.suit || '#241b31'
    ctx.fillRect(-17, -58, 34, 56)
    ctx.fillStyle = '#e7c35c'
    ctx.beginPath(); ctx.moveTo(-18, -61); ctx.lineTo(18, -61); ctx.lineTo(14, -52); ctx.lineTo(-14, -52); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#3b2b4d'
    ctx.beginPath(); ctx.moveTo(0, -52); ctx.lineTo(6, -42); ctx.lineTo(0, -12); ctx.lineTo(-6, -42); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = hexA('#c86bff', 0.5); ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(-12, -44); ctx.lineTo(-12, -8); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(12, -44); ctx.lineTo(12, -8); ctx.stroke()
  } else if (v === 'jiren') {
    // uniform
    ctx.fillStyle = p.gi
    ctx.beginPath(); ctx.moveTo(-18, -60); ctx.lineTo(0, -46); ctx.lineTo(18, -60); ctx.lineTo(16, 3); ctx.lineTo(-16, 3); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = p.accent; ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.moveTo(-15, -56); ctx.lineTo(-5, -42); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(15, -56); ctx.lineTo(5, -42); ctx.stroke()
    ctx.strokeStyle = '#d9dde2'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(-10, -30); ctx.lineTo(-7, 2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(10, -30); ctx.lineTo(7, 2); ctx.stroke()
    // muscular arms are skin; chest exposed
    ctx.fillStyle = p.skin
    ctx.beginPath(); ctx.moveTo(-10, -48); ctx.lineTo(0, -38); ctx.lineTo(10, -48); ctx.lineTo(8, -32); ctx.lineTo(-8, -32); ctx.closePath(); ctx.fill()
  }
}

function drawHead(ctx, f, p, v, form, t) {
  const hx = 4
  const hy = -84
  if (v === 'frieza') return drawFriezaHead(ctx, p, hx, hy, t)
  if (v === 'cell') return drawCellHead(ctx, p, hx, hy, t)
  if (v === 'buu') return drawBuuHead(ctx, p, hx, hy, t)
  if (v === 'beerus') return drawBeerusHead(ctx, p, hx, hy, t)
  if (v === 'jiren') return drawJirenHead(ctx, p, hx, hy, t)
  if (v === 'broly') return drawBrolyHead(ctx, p, hx, hy, t)
  drawGokuHead(ctx, f, p, v, form, hx, hy, t)
}

function drawGokuHead(ctx, f, p, v, form, hx, hy, t) {
  // neck
  ctx.fillStyle = p.skin
  ctx.fillRect(hx - 7, hy + 10, 14, 14)
  ctx.strokeStyle = p.outline; ctx.lineWidth = 3
  ctx.strokeRect(hx - 7, hy + 10, 14, 14)
  // hair behind
  drawHair(ctx, f, p, v, form, hx, hy, t, true)
  // head
  ctx.beginPath()
  ctx.ellipse(hx, hy, 18.5, 20, 0, 0, TAU)
  ctx.fillStyle = p.skin; ctx.fill()
  ctx.strokeStyle = p.outline; ctx.lineWidth = 3; ctx.stroke()
  // jaw
  ctx.beginPath()
  ctx.moveTo(hx - 12, hy + 8)
  ctx.quadraticCurveTo(hx - 2, hy + 21, hx + 12, hy + 9)
  ctx.strokeStyle = hexA(p.skin2, 0.55); ctx.lineWidth = 2; ctx.stroke()
  // ear
  ctx.beginPath(); ctx.ellipse(hx - 15, hy + 2, 4.4, 6, -0.25, 0, TAU)
  ctx.fillStyle = p.skin2; ctx.fill(); ctx.strokeStyle = p.outline; ctx.lineWidth = 1.5; ctx.stroke()
  // eye
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(hx + 8.5, hy - 1.5, 5.2, 4.2, -0.1, 0, TAU)
  ctx.fillStyle = p.eyeWhite; ctx.fill()
  ctx.strokeStyle = p.outline; ctx.lineWidth = 1.2; ctx.stroke()
  ctx.beginPath(); ctx.arc(hx + 9.6, hy - 1, 2.8, 0, TAU); ctx.fillStyle = p.eye; ctx.fill()
  ctx.beginPath(); ctx.arc(hx + 10.2, hy - 2, 1, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill()
  // brow
  ctx.strokeStyle = p.hair; ctx.lineWidth = 2.8; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(hx + 3, hy - 7); ctx.lineTo(hx + 14, hy - 5.5); ctx.stroke()
  // nose + mouth
  ctx.strokeStyle = hexA(p.skin2, 0.85); ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(hx + 16, hy + 1); ctx.lineTo(hx + 12, hy + 4); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(hx + 5, hy + 12); ctx.quadraticCurveTo(hx + 10, hy + 14, hx + 15, hy + 11); ctx.stroke()
  ctx.restore()
  // hair front
  drawHair(ctx, f, p, v, form, hx, hy, t, false)
}

const HAIR = {
  base: [[-19, 3], [-25, -5], [-21, -10], [-29, -17], [-17, -15], [-19, -26], [-8, -21], [-7, -33], [2, -23], [9, -31], [12, -20], [22, -23], [18, -12], [27, -8], [18, -3], [20, 7], [11, 3], [5, 9], [-3, 4], [-10, 8]],
  ssj: [[-23, 5], [-31, -7], [-24, -11], [-36, -24], [-21, -20], [-29, -38], [-13, -28], [-17, -50], [-4, -33], [0, -53], [9, -33], [15, -50], [19, -27], [31, -37], [28, -17], [38, -22], [33, -5], [42, 3], [28, 3], [22, 12], [12, 4], [4, 11], [-7, 10]],
  ssj2: [[-24, 5], [-34, -8], [-25, -12], [-38, -27], [-22, -22], [-31, -43], [-14, -31], [-19, -56], [-5, -36], [-1, -60], [8, -36], [15, -55], [19, -29], [33, -41], [30, -19], [41, -24], [35, -5], [45, 5], [30, 4], [24, 14], [13, 5], [4, 12], [-8, 11]],
  god: [[-21, 4], [-28, -6], [-22, -11], [-32, -21], [-18, -18], [-24, -33], [-10, -25], [-10, -41], [0, -28], [7, -42], [12, -26], [24, -32], [20, -14], [33, -18], [28, -2], [38, 4], [25, 3], [19, 11], [9, 4], [2, 10], [-8, 9]],
  blue: [[-22, 5], [-30, -6], [-23, -11], [-35, -23], [-20, -19], [-27, -37], [-12, -27], [-15, -47], [-3, -31], [1, -50], [10, -31], [16, -47], [20, -26], [31, -35], [28, -16], [38, -21], [32, -4], [41, 4], [27, 4], [21, 12], [11, 4], [3, 11], [-7, 10]],
  ui: [[-22, 5], [-30, -6], [-23, -11], [-34, -22], [-20, -19], [-27, -36], [-12, -26], [-14, -45], [-3, -30], [1, -48], [10, -30], [16, -45], [20, -25], [30, -33], [27, -15], [37, -20], [31, -4], [39, 4], [26, 4], [20, 11], [10, 4], [3, 10], [-7, 9]]
}

function drawHair(ctx, f, p, v, form, hx, hy, t, back) {
  const level = f.form || 0
  let set = HAIR.base
  if (v === 'black') set = HAIR.base
  else if (level === 1) set = HAIR.ssj
  else if (level === 2) set = HAIR.ssj2
  else if (level === 3) set = HAIR.ssj2
  else if (level === 4) set = HAIR.god
  else if (level === 5 || level === 6) set = HAIR.blue
  else if (level >= 7) set = HAIR.ui
  if (v === 'broly') set = HAIR.ssj2
  const color = p.hair
  const color2 = p.hair2
  ctx.save()
  if (back) {
    if (level === 3 && v !== 'broly') {
      // Super Saiyan 3 long mane
      ctx.fillStyle = color
      ctx.strokeStyle = p.outline
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(hx - 16, hy - 8)
      ctx.bezierCurveTo(hx - 44, hy + 18, hx - 42, hy + 76, hx - 24, hy + 108)
      ctx.lineTo(hx - 8, hy + 96)
      ctx.lineTo(hx + 1, hy + 116)
      ctx.lineTo(hx + 10, hy + 94)
      ctx.lineTo(hx + 20, hy + 104)
      ctx.bezierCurveTo(hx + 18, hy + 52, hx + 10, hy + 12, hx + 8, hy - 10)
      ctx.closePath()
      ctx.fill(); ctx.stroke()
      ctx.strokeStyle = hexA(color2, 0.6); ctx.lineWidth = 2
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(hx + i * 10, hy + 12); ctx.quadraticCurveTo(hx + i * 18, hy + 54, hx + i * 15, hy + 92); ctx.stroke()
      }
    } else if (v === 'broly') {
      ctx.fillStyle = color
      ctx.strokeStyle = p.outline
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.ellipse(hx - 3, hy - 14, 44, 38, 0, 0, TAU)
      ctx.fill(); ctx.stroke()
    } else {
      // back volume
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(hx - 5, hy - 5, 20, 22, 0, 0, TAU)
      ctx.fill()
    }
    ctx.restore()
    return
  }
  // spiky silhouette
  ctx.beginPath()
  set.forEach(([x, y], i) => {
    const px = hx + x * (v === 'broly' ? 1.5 : 1)
    const py = hy + y * (v === 'broly' ? 1.45 : 1)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  })
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = p.outline
  ctx.lineWidth = 2.8
  ctx.stroke()
  // hair shine / strands
  ctx.strokeStyle = hexA(color2, 0.75)
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(hx - 10, hy - 18); ctx.quadraticCurveTo(hx - 4, hy - 30, hx + 2, hy - 24); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(hx + 7, hy - 15); ctx.quadraticCurveTo(hx + 12, hy - 27, hx + 18, hy - 20); ctx.stroke()
  // front bangs
  ctx.fillStyle = color
  ctx.strokeStyle = p.outline
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(hx - 4, hy - 16)
  ctx.lineTo(hx + 7, hy - 33)
  ctx.lineTo(hx + 8, hy - 13)
  ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(hx + 9, hy - 17)
  ctx.lineTo(hx + 20, hy - 28)
  ctx.lineTo(hx + 18, hy - 8)
  ctx.closePath(); ctx.fill(); ctx.stroke()
  if (level >= 7) {
    ctx.strokeStyle = 'rgba(255,255,255,.7)'
    ctx.lineWidth = 2.4
    ctx.stroke()
    ctx.strokeStyle = 'rgba(220,235,255,.35)'
    ctx.lineWidth = 1
    ctx.stroke()
  }
  ctx.restore()
}

function drawFriezaHead(ctx, p, hx, hy, t) {
  // neck
  ctx.fillStyle = p.skin
  ctx.fillRect(hx - 6, hy + 10, 12, 14)
  ctx.strokeStyle = p.outline; ctx.lineWidth = 2.5; ctx.strokeRect(hx - 6, hy + 10, 12, 14)
  // purple dome
  ctx.beginPath(); ctx.ellipse(hx - 3, hy - 6, 20, 20, 0, 0, TAU)
  ctx.fillStyle = p.skin; ctx.fill(); ctx.strokeStyle = p.outline; ctx.lineWidth = 3; ctx.stroke()
  // white face
  ctx.beginPath(); ctx.ellipse(hx + 7, hy + 2, 13, 15, -0.1, 0, TAU)
  ctx.fillStyle = p.armor; ctx.fill(); ctx.strokeStyle = p.outline; ctx.lineWidth = 2; ctx.stroke()
  // horns
  ctx.fillStyle = p.armor
  ctx.beginPath(); ctx.moveTo(hx - 12, hy - 20); ctx.lineTo(hx - 2, hy - 14); ctx.lineTo(hx - 14, hy - 31); ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(hx + 5, hy - 20); ctx.lineTo(hx + 13, hy - 14); ctx.lineTo(hx + 10, hy - 30); ctx.closePath(); ctx.fill(); ctx.stroke()
  // eye
  ctx.beginPath(); ctx.ellipse(hx + 11, hy - 1, 5, 3.6, -0.1, 0, TAU)
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = p.outline; ctx.lineWidth = 1; ctx.stroke()
  ctx.beginPath(); ctx.arc(hx + 12, hy - 1, 2.2, 0, TAU); ctx.fillStyle = p.eye; ctx.fill()
  // mouth
  ctx.strokeStyle = p.outline; ctx.lineWidth = 1.7
  ctx.beginPath(); ctx.moveTo(hx + 5, hy + 11); ctx.quadraticCurveTo(hx + 10, hy + 13, hx + 15, hy + 10); ctx.stroke()
  // cheek line
  ctx.strokeStyle = hexA(p.skin2, 0.7); ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(hx - 2, hy + 5); ctx.lineTo(hx + 3, hy + 10); ctx.stroke()
}

function drawCellHead(ctx, p, hx, hy, t) {
  ctx.fillStyle = p.skin
  ctx.fillRect(hx - 6, hy + 8, 12, 16)
  ctx.strokeStyle = p.outline; ctx.lineWidth = 2.5; ctx.strokeRect(hx - 6, hy + 8, 12, 16)
  ctx.beginPath(); ctx.ellipse(hx + 2, hy, 19, 20, 0, 0, TAU)
  ctx.fillStyle = p.skin; ctx.fill(); ctx.strokeStyle = p.outline; ctx.lineWidth = 3; ctx.stroke()
  // crown horns
  ctx.fillStyle = p.armor
  ctx.beginPath(); ctx.moveTo(hx - 12, hy - 15); ctx.quadraticCurveTo(hx - 22, hy - 30, hx - 25, hy - 9); ctx.lineTo(hx - 11, hy - 6); ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(hx + 10, hy - 16); ctx.quadraticCurveTo(hx + 22, hy - 32, hx + 26, hy - 10); ctx.lineTo(hx + 10, hy - 5); ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(hx - 5, hy - 19); ctx.lineTo(hx + 2, hy - 32); ctx.lineTo(hx + 5, hy - 17); ctx.closePath(); ctx.fill(); ctx.stroke()
  // spots
  ctx.fillStyle = '#1b3320'
  ctx.beginPath(); ctx.arc(hx - 10, hy - 4, 3.3, 0, TAU); ctx.arc(hx - 2, hy + 10, 2.6, 0, TAU); ctx.arc(hx + 14, hy + 9, 2.2, 0, TAU); ctx.fill()
  // eye
  ctx.beginPath(); ctx.ellipse(hx + 9, hy - 2, 5.5, 4, -0.1, 0, TAU)
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = p.outline; ctx.lineWidth = 1.2; ctx.stroke()
  ctx.beginPath(); ctx.arc(hx + 10, hy - 1.5, 2.6, 0, TAU); ctx.fillStyle = p.eye; ctx.fill()
  // mouth
  ctx.strokeStyle = p.outline; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(hx + 2, hy + 11); ctx.quadraticCurveTo(hx + 8, hy + 14, hx + 14, hy + 10); ctx.stroke()
}

function drawBuuHead(ctx, p, hx, hy, t) {
  ctx.fillStyle = p.skin
  ctx.fillRect(hx - 6, hy + 8, 12, 15)
  ctx.beginPath(); ctx.ellipse(hx + 2, hy, 20, 20, 0, 0, TAU)
  ctx.fillStyle = p.skin; ctx.fill(); ctx.strokeStyle = p.outline; ctx.lineWidth = 3; ctx.stroke()
  // eyes (sly)
  ctx.strokeStyle = p.outline; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(hx + 4, hy - 2); ctx.quadraticCurveTo(hx + 9, hy - 6, hx + 14, hy - 1); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(hx - 4, hy - 2); ctx.quadraticCurveTo(hx + 1, hy - 6, hx + 5, hy - 1); ctx.stroke()
  ctx.strokeStyle = p.eye; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(hx + 5, hy - 1); ctx.lineTo(hx + 8, hy - 1); ctx.stroke()
  // mouth
  ctx.strokeStyle = p.outline; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(hx + 2, hy + 10); ctx.quadraticCurveTo(hx + 8, hy + 14, hx + 14, hy + 9); ctx.stroke()
  // cheek
  ctx.fillStyle = hexA('#ff5fba', 0.22)
  ctx.beginPath(); ctx.arc(hx + 10, hy + 5, 4, 0, TAU); ctx.fill()
}

function drawBeerusHead(ctx, p, hx, hy, t) {
  ctx.fillStyle = p.skin
  ctx.fillRect(hx - 6, hy + 8, 12, 15)
  ctx.beginPath(); ctx.ellipse(hx + 1, hy, 20, 19, 0, 0, TAU)
  ctx.fillStyle = p.skin; ctx.fill(); ctx.strokeStyle = p.outline; ctx.lineWidth = 3; ctx.stroke()
  // ears
  ctx.fillStyle = p.skin
  ctx.beginPath(); ctx.moveTo(hx - 14, hy - 12); ctx.lineTo(hx - 20, hy - 31); ctx.lineTo(hx - 4, hy - 18); ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(hx + 8, hy - 15); ctx.lineTo(hx + 12, hy - 33); ctx.lineTo(hx + 20, hy - 13); ctx.closePath(); ctx.fill(); ctx.stroke()
  // muzzle
  ctx.fillStyle = '#d9b7ec'
  ctx.beginPath(); ctx.ellipse(hx + 12, hy + 6, 10, 7, -0.1, 0, TAU); ctx.fill()
  // eyes
  ctx.strokeStyle = p.outline; ctx.lineWidth = 1.2
  ctx.beginPath(); ctx.ellipse(hx + 10, hy - 3, 5.5, 4, -0.2, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.arc(hx + 11, hy - 2.5, 2.6, 0, TAU); ctx.fillStyle = p.eye; ctx.fill()
  ctx.beginPath(); ctx.moveTo(hx - 2, hy - 6); ctx.lineTo(hx + 3, hy - 5); ctx.strokeStyle = p.outline; ctx.lineWidth = 2; ctx.stroke()
  // nose + mouth
  ctx.fillStyle = '#7a4a94'; ctx.beginPath(); ctx.ellipse(hx + 20, hy + 3, 2.4, 1.7, 0, 0, TAU); ctx.fill()
  ctx.strokeStyle = p.outline; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(hx + 7, hy + 11); ctx.quadraticCurveTo(hx + 13, hy + 14, hx + 18, hy + 10); ctx.stroke()
  // whiskers
  ctx.strokeStyle = '#e8d5f2'; ctx.lineWidth = 1
  for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(hx + 14, hy + 5 + i * 3); ctx.lineTo(hx + 30, hy + 2 + i * 5); ctx.stroke() }
}

function drawJirenHead(ctx, p, hx, hy, t) {
  ctx.fillStyle = p.skin
  ctx.fillRect(hx - 6, hy + 8, 12, 16)
  ctx.beginPath(); ctx.ellipse(hx + 2, hy, 19, 21, 0, 0, TAU)
  ctx.fillStyle = p.skin; ctx.fill(); ctx.strokeStyle = p.outline; ctx.lineWidth = 3; ctx.stroke()
  // head ridges
  ctx.strokeStyle = p.skin2; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(hx - 10, hy - 10); ctx.quadraticCurveTo(hx - 2, hy - 22, hx + 10, hy - 12); ctx.stroke()
  // eyes
  ctx.beginPath(); ctx.ellipse(hx + 10, hy - 2, 6, 4.5, -0.1, 0, TAU)
  ctx.fillStyle = '#f0e9df'; ctx.fill(); ctx.strokeStyle = p.outline; ctx.lineWidth = 1.2; ctx.stroke()
  ctx.beginPath(); ctx.arc(hx + 11, hy - 1, 2.7, 0, TAU); ctx.fillStyle = p.eye; ctx.fill()
  ctx.beginPath(); ctx.moveTo(hx + 2, hy - 8); ctx.lineTo(hx + 15, hy - 6); ctx.strokeStyle = p.outline; ctx.lineWidth = 2; ctx.stroke()
  // mouth + jaw
  ctx.strokeStyle = p.outline; ctx.lineWidth = 1.8
  ctx.beginPath(); ctx.moveTo(hx + 3, hy + 11); ctx.lineTo(hx + 14, hy + 11); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(hx - 7, hy + 5); ctx.lineTo(hx - 2, hy + 12); ctx.strokeStyle = p.skin2; ctx.stroke()
  // red uniform collar
  ctx.fillStyle = p.accent
  ctx.beginPath(); ctx.moveTo(hx - 15, hy + 18); ctx.lineTo(hx + 15, hy + 18); ctx.lineTo(hx + 10, hy + 25); ctx.lineTo(hx - 10, hy + 25); ctx.closePath(); ctx.fill()
}

function drawBrolyHead(ctx, p, hx, hy, t) {
  // hair behind
  drawHair(ctx, { form: 2, kind: 'enemy' }, p, 'broly', FORMS[2], hx, hy, t, true)
  ctx.fillStyle = p.skin
  ctx.fillRect(hx - 7, hy + 9, 14, 15)
  ctx.strokeStyle = p.outline; ctx.lineWidth = 2.5; ctx.strokeRect(hx - 7, hy + 9, 14, 15)
  ctx.beginPath(); ctx.ellipse(hx + 2, hy, 20, 21, 0, 0, TAU)
  ctx.fillStyle = p.skin; ctx.fill(); ctx.strokeStyle = p.outline; ctx.lineWidth = 3; ctx.stroke()
  // eyes
  ctx.beginPath(); ctx.ellipse(hx + 10, hy - 2, 6, 4.6, -0.1, 0, TAU)
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = p.outline; ctx.lineWidth = 1.2; ctx.stroke()
  ctx.beginPath(); ctx.arc(hx + 11, hy - 1, 2.8, 0, TAU); ctx.fillStyle = p.eye; ctx.fill()
  ctx.beginPath(); ctx.moveTo(hx + 2, hy - 8); ctx.lineTo(hx + 16, hy - 6); ctx.strokeStyle = p.outline; ctx.lineWidth = 2.4; ctx.stroke()
  // mouth / scar
  ctx.strokeStyle = p.outline; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(hx + 4, hy + 11); ctx.quadraticCurveTo(hx + 10, hy + 14, hx + 16, hy + 9); ctx.stroke()
  ctx.strokeStyle = '#a4564b'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(hx + 17, hy - 8); ctx.lineTo(hx + 15, hy + 5); ctx.stroke()
  // front hair
  drawHair(ctx, { form: 2, kind: 'enemy' }, p, 'broly', FORMS[2], hx, hy, t, false)
}

function hexA(hex, alpha) {
  if (!hex) return `rgba(255,255,255,${alpha})`
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const n = parseInt(h, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},${alpha})`
}
