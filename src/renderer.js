// ============================================================
// RUCKUS RUGBY — canvas renderer & art helpers
// ============================================================
import { clamp, lerp, alpha, shade, roundRect, dist, pointSegDist } from './utils.js';
import { FIELD } from './engine.js';
import { POSITION_BY_ID } from './data.js';

const TAU = Math.PI * 2;

// ------------------------------------------------------------
// shared jersey art
// ------------------------------------------------------------
function jerseyPattern(ctx, x, y, w, h, colors, pattern) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = colors.primary;
  ctx.fillRect(x, y, w, h);
  const sec = colors.secondary;
  ctx.fillStyle = sec;
  if (pattern === 'hoops') {
    const n = 4;
    for (let i = 0; i < n; i += 2) ctx.fillRect(x, y + (h / n) * i, w, h / n);
  } else if (pattern === 'stripes') {
    const n = 5;
    for (let i = 0; i < n; i += 2) ctx.fillRect(x + (w / n) * i, y, w / n, h);
  } else if (pattern === 'sash') {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(-0.55);
    ctx.fillRect(-w * 1.2, -h * 0.13, w * 2.4, h * 0.26);
    ctx.restore();
  } else if (pattern === 'shoulders') {
    ctx.fillRect(x, y, w, h * 0.3);
  }
  ctx.restore();
}

function hairShape(ctx, style, color, x, y, r) {
  ctx.fillStyle = color;
  if (style === 'bald') return;
  if (style === 'buzz' || style === 'short') {
    ctx.beginPath();
    ctx.arc(x - r * 0.15, y, r * 1.05, Math.PI * 0.55, Math.PI * 1.55);
    ctx.fill();
    return;
  }
  if (style === 'curly') {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 0.45 + (i / 7) * Math.PI * 1.1;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, r * 0.42, 0, TAU);
      ctx.fill();
    }
    return;
  }
  if (style === 'long') {
    ctx.beginPath();
    ctx.ellipse(x - r * 0.15, y + r * 0.25, r * 1.25, r * 1.5, 0, 0, TAU);
    ctx.fill();
    return;
  }
  if (style === 'afro') {
    ctx.beginPath();
    ctx.arc(x - r * 0.2, y, r * 1.55, 0, TAU);
    ctx.fill();
    return;
  }
}

function headgear(ctx, gear, colors, x, y, r) {
  if (gear === 'headband') {
    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = r * 0.34;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.92, -Math.PI * 0.9, Math.PI * 0.9);
    ctx.stroke();
  } else if (gear === 'scrumcap') {
    ctx.fillStyle = colors.secondary;
    ctx.beginPath();
    ctx.arc(x - r * 0.08, y, r * 1.13, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.24)';
    ctx.lineWidth = r * 0.1;
    ctx.beginPath();
    ctx.arc(x - r * 0.08, y, r * 1.13, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = colors.primary;
    ctx.beginPath();
    ctx.arc(x + r * 0.28, y, r * 0.5, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
  }
}

export function drawPlayerSprite(ctx, p, sx, sy, zoom, time = 0, opts = {}) {
  const colors = p.team?.colors || { primary: '#f2c53d', secondary: '#0d2b1c', shorts: '#0d2b1c', socks: '#f2c53d', pattern: 'sash' };
  const app = p.appearance || {};
  const scale = zoom * 1.34;
  const r = scale * 0.42;
  const state = p.state || 'run';
  const run = p.runPhase || 0;
  const speed = Math.hypot(p.vx || 0, p.vy || 0);
  const moving = speed > 0.6;
  const sprint = p.sprintReq && moving;
  const controlled = opts.controlled;
  const down = state === 'down';
  const diving = state === 'dive';

  ctx.save();
  ctx.translate(sx, sy);

  // ground shadow
  ctx.fillStyle = `rgba(0,0,0,${down ? 0.2 : 0.32})`;
  ctx.beginPath();
  ctx.ellipse(2, 4, r * 1.15, r * 0.8, 0, 0, TAU);
  ctx.fill();

  // selection / script rings
  if (opts.scripted) {
    ctx.strokeStyle = 'rgba(242,197,61,0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.75, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (controlled) {
    const pulse = 0.5 + Math.sin(time * 5) * 0.18;
    ctx.strokeStyle = `rgba(216,243,106,${pulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.75, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = 'rgba(216,243,106,0.1)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.75, 0, TAU);
    ctx.fill();
    // arrow
    ctx.fillStyle = '#d8f36a';
    ctx.beginPath();
    ctx.moveTo(0, -r * 2.55);
    ctx.lineTo(-r * 0.42, -r * 2.05);
    ctx.lineTo(r * 0.42, -r * 2.05);
    ctx.closePath();
    ctx.fill();
  }

  ctx.rotate((diving ? (p.diveAngle ?? p.facing ?? 0) : (p.facing ?? 0)));
  if (down) {
    ctx.rotate(1.15);
    ctx.scale(1, 0.7);
    ctx.globalAlpha = 0.85;
  }
  if (state === 'getup') {
    ctx.scale(0.82, 0.82);
  }
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const legSwing = moving ? Math.sin(run) * 0.26 : Math.sin(time * 1.4 + (p.slot || 0)) * 0.03;
  const armSwing = moving ? Math.sin(run + Math.PI) * 0.2 : 0;
  const sock = colors.socks || colors.primary;
  const shorts = colors.shorts || colors.secondary;
  const dark = shade(colors.secondary || '#111', -0.2);

  // legs
  if (!down) {
    ctx.strokeStyle = sock;
    ctx.lineWidth = 0.17;
    ctx.beginPath();
    ctx.moveTo(-0.18, -0.14);
    ctx.lineTo(-0.5 + legSwing, -0.19);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-0.18, 0.14);
    ctx.lineTo(-0.5 - legSwing, 0.19);
    ctx.stroke();
    ctx.strokeStyle = '#161616';
    ctx.lineWidth = 0.13;
    ctx.beginPath();
    ctx.moveTo(-0.5 + legSwing, -0.19);
    ctx.lineTo(-0.68 + legSwing, -0.22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-0.5 - legSwing, 0.19);
    ctx.lineTo(-0.68 - legSwing, 0.22);
    ctx.stroke();
    // shorts
    ctx.fillStyle = shorts;
    ctx.beginPath();
    ctx.ellipse(-0.17, 0, 0.19, 0.3, 0, 0, TAU);
    ctx.fill();
  }

  // arms behind torso
  if (!down) {
    const armY = diving ? 0.3 : 0.33;
    const armX = diving ? 0.65 : 0.05 + armSwing;
    ctx.strokeStyle = app.skin || '#d99e70';
    ctx.lineWidth = 0.14;
    ctx.beginPath();
    ctx.moveTo(0.05, -0.27);
    ctx.lineTo(armX, -armY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0.05, 0.27);
    ctx.lineTo(armX, armY);
    ctx.stroke();
    // sleeves
    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = 0.17;
    ctx.beginPath();
    ctx.moveTo(0.03, -0.26);
    ctx.lineTo(0.16, -0.29);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0.03, 0.26);
    ctx.lineTo(0.16, 0.29);
    ctx.stroke();
  }

  // torso
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.42, 0.32, 0, 0, TAU);
  ctx.save();
  ctx.clip();
  jerseyPattern(ctx, -0.5, -0.4, 1.0, 0.8, colors, colors.pattern);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.42, 0.32, 0, 0, TAU);
  ctx.stroke();

  // number
  ctx.save();
  ctx.rotate(Math.PI);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '700 0.27px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(p.number ?? ''), 0.02, 0);
  ctx.restore();

  // head
  const hx = 0.3;
  ctx.save();
  // hair behind
  hairShape(ctx, app.hairStyle, app.hair || '#241811', hx - 0.05, 0, 0.22);
  // neck
  ctx.fillStyle = app.skin || '#d99e70';
  ctx.beginPath();
  ctx.arc(hx, 0, 0.21, 0, TAU);
  ctx.fill();
  // face shading
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.beginPath();
  ctx.arc(hx + 0.08, 0.05, 0.14, 0, TAU);
  ctx.fill();
  headgear(ctx, app.gear, colors, hx, 0, 0.22);
  ctx.restore();

  if (state === 'celebrate' || p.celebrate > 0) {
    ctx.strokeStyle = app.skin || '#d99e70';
    ctx.lineWidth = 0.14;
    ctx.beginPath();
    ctx.moveTo(0.05, -0.22);
    ctx.lineTo(-0.05, -0.58);
    ctx.moveTo(0.05, 0.22);
    ctx.lineTo(-0.05, 0.58);
    ctx.stroke();
  }

  ctx.restore();

  if (down) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = 'rgba(245,240,227,0.75)';
    for (let i = 0; i < 3; i++) {
      const a = time * 2 + i * 2.1;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 1.2, -r * 1.6 + Math.sin(a) * 3, 1.5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------
// front-facing portrait (squad builder / menu)
// ------------------------------------------------------------
export function drawPortrait(canvas, player, team, opts = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.dataset.cssw !== String(canvas.clientWidth)) {
    canvas.dataset.cssw = String(canvas.clientWidth);
  }
  ctx.clearRect(0, 0, W, H);
  const colors = team?.colors || { primary: '#f2c53d', secondary: '#0d2b1c', shorts: '#0d2b1c', socks: '#f2c53d', pattern: 'sash' };
  const app = player?.appearance || { skin: '#d99e70', hair: '#241811', hairStyle: 'short', build: 'athletic', gear: 'none' };
  const S = Math.min(W, H);
  const cx = W / 2;
  const top = H * 0.1;

  // backdrop
  const g = ctx.createRadialGradient(cx, H * 0.42, S * 0.05, cx, H * 0.5, S * 0.7);
  g.addColorStop(0, alpha(colors.primary, 0.18));
  g.addColorStop(0.5, alpha(colors.primary, 0.05));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // pitch stripes
  ctx.save();
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < 9; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = '#d8f36a';
      ctx.fillRect(0, H * (i / 9), W, H / 9);
    }
  }
  ctx.restore();
  // big number
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = colors.primary;
  ctx.font = `900 ${S * 0.72}px "Arial Narrow", Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(player?.number ?? ''), cx, H * 0.48);
  ctx.restore();

  const build = app.build === 'power' ? 1.12 : app.build === 'slim' ? 0.9 : 1;
  const bodyW = S * 0.23 * build;
  const bodyH = S * 0.32;
  const bodyY = top + S * 0.26;
  const headR = S * 0.085 * (app.build === 'power' ? 1.04 : 1);
  const skin = app.skin || '#d99e70';

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, H * 0.925, bodyW * 1.45, S * 0.03, 0, 0, TAU);
  ctx.fill();

  // legs
  const legW = bodyW * 0.36;
  ctx.fillStyle = colors.shorts || '#0d2b1c';
  roundRect(ctx, cx - bodyW * 0.45, bodyY + bodyH * 0.72, legW, S * 0.12, legW * 0.25);
  ctx.fill();
  roundRect(ctx, cx + bodyW * 0.09, bodyY + bodyH * 0.72, legW, S * 0.12, legW * 0.25);
  ctx.fill();
  // thighs
  ctx.fillStyle = skin;
  roundRect(ctx, cx - bodyW * 0.43, bodyY + bodyH * 0.83, legW * 0.9, S * 0.16, legW * 0.3);
  ctx.fill();
  roundRect(ctx, cx + bodyW * 0.11, bodyY + bodyH * 0.83, legW * 0.9, S * 0.16, legW * 0.3);
  ctx.fill();
  // socks
  ctx.fillStyle = colors.socks || colors.primary;
  roundRect(ctx, cx - bodyW * 0.43, bodyY + bodyH * 0.95, legW * 0.92, S * 0.115, 3);
  ctx.fill();
  roundRect(ctx, cx + bodyW * 0.11, bodyY + bodyH * 0.95, legW * 0.92, S * 0.115, 3);
  ctx.fill();
  // boots
  ctx.fillStyle = '#171717';
  roundRect(ctx, cx - bodyW * 0.47, H * 0.885, legW * 1.1, S * 0.03, 4);
  ctx.fill();
  roundRect(ctx, cx + bodyW * 0.07, H * 0.885, legW * 1.1, S * 0.03, 4);
  ctx.fill();

  // torso
  ctx.save();
  const torsoPath = () => {
    ctx.beginPath();
    ctx.moveTo(cx - bodyW * 0.72, bodyY + S * 0.04);
    ctx.quadraticCurveTo(cx - bodyW * 0.98, bodyY + bodyH * 0.55, cx - bodyW * 0.55, bodyY + bodyH * 0.86);
    ctx.quadraticCurveTo(cx, bodyY + bodyH * 0.98, cx + bodyW * 0.55, bodyY + bodyH * 0.86);
    ctx.quadraticCurveTo(cx + bodyW * 0.98, bodyY + bodyH * 0.55, cx + bodyW * 0.72, bodyY + S * 0.04);
    ctx.quadraticCurveTo(cx, bodyY - S * 0.02, cx - bodyW * 0.72, bodyY + S * 0.04);
    ctx.closePath();
  };
  torsoPath();
  ctx.clip();
  jerseyPattern(ctx, cx - bodyW, bodyY - S * 0.03, bodyW * 2, bodyH * 1.02, colors, colors.pattern || opts.pattern);
  // subtle fabric shading
  const shadeGrad = ctx.createLinearGradient(cx - bodyW, 0, cx + bodyW, 0);
  shadeGrad.addColorStop(0, 'rgba(0,0,0,0.25)');
  shadeGrad.addColorStop(0.4, 'rgba(255,255,255,0.08)');
  shadeGrad.addColorStop(0.75, 'rgba(0,0,0,0.1)');
  shadeGrad.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = shadeGrad;
  ctx.fillRect(cx - bodyW, bodyY - S * 0.04, bodyW * 2, bodyH);
  ctx.restore();
  torsoPath();
  ctx.strokeStyle = 'rgba(0,0,0,0.32)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // collar
  ctx.fillStyle = colors.secondary;
  ctx.beginPath();
  ctx.ellipse(cx, bodyY + S * 0.025, headR * 0.75, headR * 0.32, 0, 0, TAU);
  ctx.fill();
  // sleeves
  ctx.fillStyle = colors.secondary;
  ctx.beginPath();
  ctx.ellipse(cx - bodyW * 0.82, bodyY + S * 0.08, bodyW * 0.23, S * 0.075, -0.4, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + bodyW * 0.82, bodyY + S * 0.08, bodyW * 0.23, S * 0.075, 0.4, 0, TAU);
  ctx.fill();

  // arms crossed
  ctx.strokeStyle = skin;
  ctx.lineWidth = bodyW * 0.27;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - bodyW * 0.82, bodyY + S * 0.085);
  ctx.quadraticCurveTo(cx - bodyW * 0.5, bodyY + bodyH * 0.48, cx - bodyW * 0.06, bodyY + bodyH * 0.37);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + bodyW * 0.82, bodyY + S * 0.085);
  ctx.quadraticCurveTo(cx + bodyW * 0.5, bodyY + bodyH * 0.5, cx + bodyW * 0.03, bodyY + bodyH * 0.47);
  ctx.stroke();
  // hands
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(cx - bodyW * 0.06, bodyY + bodyH * 0.37, bodyW * 0.15, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + bodyW * 0.03, bodyY + bodyH * 0.47, bodyW * 0.15, 0, TAU);
  ctx.fill();

  // number on chest
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `800 ${S * 0.16}px "Arial Narrow", Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(player?.number ?? ''), cx, bodyY + bodyH * 0.65);
  // crest
  ctx.fillStyle = colors.secondary;
  ctx.beginPath();
  ctx.arc(cx - bodyW * 0.42, bodyY + bodyH * 0.18, S * 0.023, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = colors.primary;
  ctx.lineWidth = 1;
  ctx.stroke();

  // neck & head
  ctx.fillStyle = shade(skin, -0.08);
  roundRect(ctx, cx - headR * 0.42, bodyY - headR * 0.45, headR * 0.84, headR * 0.8, headR * 0.2);
  ctx.fill();
  // hair back
  hairShape(ctx, app.hairStyle, app.hair || '#241811', cx - headR * 0.08, bodyY - headR * 1.55, headR * 1.05);
  // head
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(cx, bodyY - headR * 1.55, headR, headR * 1.15, 0, 0, TAU);
  ctx.fill();
  // ears
  ctx.beginPath();
  ctx.arc(cx - headR * 0.98, bodyY - headR * 1.52, headR * 0.22, 0, TAU);
  ctx.arc(cx + headR * 0.98, bodyY - headR * 1.52, headR * 0.22, 0, TAU);
  ctx.fill();
  // face
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.arc(cx - headR * 0.36, bodyY - headR * 1.62, headR * 0.075, 0, TAU);
  ctx.arc(cx + headR * 0.36, bodyY - headR * 1.62, headR * 0.075, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = Math.max(1, headR * 0.08);
  ctx.beginPath();
  ctx.arc(cx, bodyY - headR * 1.3, headR * 0.26, 0.25, Math.PI - 0.25);
  ctx.stroke();
  // hair front
  if (app.hairStyle !== 'bald') {
    ctx.fillStyle = app.hair || '#241811';
    ctx.beginPath();
    ctx.ellipse(cx - headR * 0.12, bodyY - headR * 2.05, headR * 0.95, headR * 0.48, -0.08, Math.PI, TAU);
    ctx.fill();
  }
  headgear(ctx, app.gear, colors, cx, bodyY - headR * 1.55, headR * 1.02);

  // ball under arm
  if (opts.ball) {
    ctx.save();
    ctx.translate(cx + bodyW * 0.95, bodyY + bodyH * 0.4);
    ctx.rotate(0.45);
    ctx.fillStyle = '#8a4b2a';
    ctx.beginPath();
    ctx.ellipse(0, 0, S * 0.075, S * 0.05, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#f5f0e3';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-S * 0.03, 0);
    ctx.lineTo(S * 0.03, 0);
    ctx.stroke();
    ctx.restore();
  }
  // vignette
  const v = ctx.createRadialGradient(cx, H * 0.5, S * 0.2, cx, H * 0.5, S * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------
// tactics diagram
// ------------------------------------------------------------
export function drawTacticsDiagram(canvas, attack, defense) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0e3a22');
  g.addColorStop(1, '#0a2a18');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // stripes
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.03)';
    ctx.fillRect((W / 12) * i, 0, W / 12, H);
  }
  // schematic field lines
  ctx.strokeStyle = 'rgba(245,240,227,0.18)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(14, 16, W - 28, H - 32);
  ctx.setLineDash([5, 6]);
  ctx.beginPath(); ctx.moveTo(W / 2, 16); ctx.lineTo(W / 2, H - 16); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(245,240,227,0.3)';
  ctx.font = '700 8px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ATTACK →', 20, 30);
  // defenders
  const dY = H * 0.5;
  const depth = Math.min(70, defense.depth * 4);
  for (let i = 0; i < 7; i++) {
    const x = W * 0.55 - depth * 0.5 + (i - 3) * ((W * 0.42) / 7) * (1.02 - defense.drift * 0.18);
    const y = dY + (i - 3) * 22;
    ctx.fillStyle = 'rgba(110,199,255,0.9)';
    ctx.beginPath();
    ctx.arc(clamp(x, 30, W - 40), clamp(y, 30, H - 30), 7, 0, TAU);
    ctx.fill();
    if (i === 0) {
      ctx.strokeStyle = 'rgba(110,199,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(clamp(x, 30, W - 40), clamp(y, 30, H - 30), 12, 0, TAU);
      ctx.stroke();
    }
  }
  // attackers
  const width = 150 * attack.width;
  for (let i = 0; i < 7; i++) {
    const y = dY + (i - 3) * (width / 7);
    const x = W * 0.38 - (i % 3) * 10 * attack.depth;
    ctx.fillStyle = '#d8f36a';
    ctx.beginPath();
    ctx.arc(clamp(x, 30, W - 30), clamp(y, 30, H - 30), 7, 0, TAU);
    ctx.fill();
  }
  // pass line
  ctx.strokeStyle = 'rgba(216,243,106,0.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(W * 0.38, dY + 3);
  ctx.quadraticCurveTo(W * 0.48, dY + 16, W * 0.56, dY + width * 0.42);
  ctx.stroke();
  ctx.setLineDash([]);
  // arrowhead
  const ax = W * 0.56, ay = dY + width * 0.42;
  ctx.fillStyle = '#d8f36a';
  ctx.beginPath();
  ctx.moveTo(ax + 7, ay + 2);
  ctx.lineTo(ax - 3, ay - 3);
  ctx.lineTo(ax - 1, ay + 7);
  ctx.closePath();
  ctx.fill();
  // labels
  ctx.fillStyle = 'rgba(245,240,227,0.6)';
  ctx.font = '800 9px Inter, system-ui, sans-serif';
  ctx.fillText('DEFENCE', W - 76, H - 22);
  ctx.fillStyle = '#d8f36a';
  ctx.fillText('ATTACK', 20, H - 22);
}

// ------------------------------------------------------------
// set play editor drawing
// ------------------------------------------------------------
export function playEditorTransform(w, h) {
  const pad = 26;
  const minX = -32, maxX = 58, minY = -35, maxY = 35;
  const s = Math.min((w - pad * 2) / (maxX - minX), (h - pad * 2) / (maxY - minY));
  const ox = (w - (maxX - minX) * s) / 2 - minX * s;
  const oy = (h - (maxY - minY) * s) / 2 - minY * s;
  return {
    s, ox, oy,
    toScreen: (x, y) => ({ x: ox + x * s, y: oy + y * s }),
    toWorld: (px, py) => ({ x: (px - ox) / s, y: (py - oy) / s }),
  };
}

export function drawPlayEditor(canvas, play, selected, opts = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const t = playEditorTransform(W, H);
  ctx.clearRect(0, 0, W, H);
  // background pitch
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0d3a21');
  g.addColorStop(1, '#082817');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.022)' : 'rgba(0,0,0,0.035)';
    ctx.fillRect((W / 16) * i, 0, W / 16, H);
  }
  // field lines
  const top = t.toScreen(0, -35).y;
  const bottom = t.toScreen(0, 35).y;
  ctx.strokeStyle = 'rgba(245,240,227,0.15)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 7]);
  for (let x = -20; x <= 40; x += 10) {
    const p = t.toScreen(x, 0);
    ctx.beginPath();
    ctx.moveTo(p.x, top);
    ctx.lineTo(p.x, bottom);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(245,240,227,0.26)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(t.toScreen(0, -35).x, top);
  ctx.lineTo(t.toScreen(0, -35).x, bottom);
  ctx.stroke();
  // try line
  const tryP = t.toScreen(48, 0);
  ctx.strokeStyle = 'rgba(245,240,227,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(tryP.x, top);
  ctx.lineTo(tryP.x, bottom);
  ctx.stroke();
  ctx.fillStyle = 'rgba(245,240,227,0.38)';
  ctx.font = '800 10px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('TRY LINE →', tryP.x - 10, top + 16);
  // scale marker
  ctx.fillStyle = 'rgba(245,240,227,0.28)';
  ctx.textAlign = 'left';
  ctx.fillText('10m grid', 16, H - 14);

  // origin / ball
  const ball = t.toScreen(0, 0);
  ctx.fillStyle = 'rgba(216,243,106,0.1)';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 18, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#8a4b2a';
  ctx.beginPath();
  ctx.ellipse(ball.x, ball.y, 9, 6, -0.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#f5f0e7';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(ball.x - 4, ball.y + 2);
  ctx.lineTo(ball.x + 4, ball.y - 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(216,243,106,0.75)';
  ctx.font = '800 8px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BALL', ball.x, ball.y + 24);

  const players = play?.players || [];
  const squad = opts.squad || [];
  // routes
  players.forEach((pl, i) => {
    if (!pl || !pl.start) return;
    const start = t.toScreen(pl.start[0], pl.start[1]);
    let prev = start;
    ctx.strokeStyle = selected === i ? '#d8f36a' : 'rgba(245,240,227,0.5)';
    ctx.lineWidth = selected === i ? 2.6 : 1.6;
    ctx.setLineDash([5, 5]);
    for (const pt of pl.route || []) {
      const s = t.toScreen(pt[0], pt[1]);
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
      prev = s;
    }
    ctx.setLineDash([]);
    if (prev !== start) {
      const a = Math.atan2(prev.y - start.y, prev.x - start.x);
      ctx.save();
      ctx.translate(prev.x, prev.y);
      ctx.rotate(a);
      ctx.fillStyle = selected === i ? '#d8f36a' : 'rgba(245,240,227,0.65)';
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-2, -5);
      ctx.lineTo(-2, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // waypoints
    (pl.route || []).forEach((pt, wi) => {
      const s = t.toScreen(pt[0], pt[1]);
      ctx.fillStyle = selected === i ? '#d8f36a' : 'rgba(245,240,227,0.55)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(245,240,227,0.32)';
      ctx.font = '700 7px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(String(wi + 1), s.x + 4, s.y - 4);
    });
  });

  // player tokens
  players.forEach((pl, i) => {
    if (!pl || !pl.start) return;
    const p = t.toScreen(pl.start[0], pl.start[1]);
    const sq = squad[Math.min(i, squad.length - 1)] || {};
    const isSel = selected === i;
    const isReceiver = play?.receiver === i;
    // halo
    if (isSel) {
      ctx.fillStyle = 'rgba(216,243,106,0.16)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 22, 0, TAU);
      ctx.fill();
    }
    if (isReceiver) {
      ctx.strokeStyle = '#f2c53d';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 18, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = isSel ? '#d8f36a' : '#f5f0e3';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 13, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#07130d';
    ctx.font = '800 10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(sq.number ?? i + 1), p.x, p.y + 0.5);
    // label
    ctx.fillStyle = isSel ? '#d8f36a' : 'rgba(245,240,227,0.62)';
    ctx.font = '800 7px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'top';
    const abbr = POSITION_BY_ID[sq.position]?.abbr || `P${i + 1}`;
    ctx.fillText(abbr, p.x, p.y + 17);
    if (isReceiver) {
      ctx.fillStyle = '#f2c53d';
      ctx.font = '800 7px Inter, system-ui, sans-serif';
      ctx.fillText('1ST', p.x, p.y - 27);
    }
  });
}

// ============================================================
// main renderer
// ============================================================
const camClamp = (v, a, b) => (a > b ? (a + b) / 2 : Math.max(a, Math.min(b, v)));
const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.time = 0;
    this.cam = { x: 50, y: 35, scale: 12 };
    this.reducedMotion = false;
    this.weather = 'clear';
    this.rainDrops = [];
    this.ballTrail = [];
    this.demo = null;
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(320, rect.width || window.innerWidth);
    const h = Math.max(240, rect.height || window.innerHeight);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  // ------------------------------------------------------------
  // camera
  // ------------------------------------------------------------
  worldToScreen(x, y) {
    const c = this.cam;
    return {
      x: this.w / 2 + (x - c.x) * c.scale,
      y: this.h / 2 + (y - c.y) * c.scale,
    };
  }

  groundScale() {
    return this.cam.scale;
  }

  focusCamera(match, dt) {
    const cam = this.cam;
    const b = match.ball;
    const portrait = this.h > this.w * 1.12;
    const visibleW = portrait ? 32 : 58;
    const visibleH = portrait ? 60 : 38;
    // Zoom in enough that the focus area never exceeds these world-space bounds.
    // (Math.min here would show the whole pitch on tall phones and shrink the players.)
    let targetScale = Math.max(this.w / visibleW, this.h / visibleH);
    targetScale = Math.max(4.2, Math.min(targetScale, 34));
    let fx;
    let fy;

    if (match.state === 'conversion' && match.conversion) {
      const c = match.conversion;
      fx = c.spot.x - c.dirSign * 9;
      fy = 35;
      targetScale *= 1.16;
    } else if (match.setpiece) {
      fx = match.setpiece.spot.x;
      fy = match.setpiece.spot.y;
      targetScale *= 0.96;
    } else {
      const ctrl = match.controlled && match.controlled.state !== 'down' ? match.controlled : null;
      const bx = b.x;
      const by = b.y;
      if (ctrl) {
        fx = bx * 0.58 + ctrl.x * 0.42 + (ctrl.vx || 0) * 0.22;
        fy = by * 0.58 + ctrl.y * 0.42 + (ctrl.vy || 0) * 0.22;
      } else {
        fx = bx + (b.vx || 0) * 0.25;
        fy = by + (b.vy || 0) * 0.25;
      }
      if (match.state === 'try') {
        targetScale *= 0.94;
      }
    }

    if (!Number.isFinite(fx) || !Number.isFinite(fy)) { fx = 50; fy = 35; }

    const halfW = this.w / (2 * targetScale);
    const halfH = this.h / (2 * targetScale);
    const minX = -10, maxX = 110, minY = 0, maxY = 70;
    fx = camClamp(fx, minX - 4 + halfW, maxX + 4 - halfW);
    fy = camClamp(fy, minY - 9 + halfH, maxY + 9 - halfH);

    if (this.reducedMotion) {
      cam.x = fx; cam.y = fy; cam.scale = targetScale;
    } else {
      const k = 1 - Math.exp(-(dt || 0.016) * 5.4);
      cam.x += (fx - cam.x) * k;
      cam.y += (fy - cam.y) * k;
      cam.scale += (targetScale - cam.scale) * Math.min(1, (dt || 0.016) * 3.6);
    }
  }

  // ------------------------------------------------------------
  // stadium & pitch
  // ------------------------------------------------------------
  drawStadium(match) {
    const ctx = this.ctx;
    const cam = this.cam;
    const s = cam.scale;
    const night = (match && match.weather === 'night') || this.weather === 'night';
    const rain = (match && match.weather === 'rain') || this.weather === 'rain';
    // base night sky / concourse
    const bg = ctx.createLinearGradient(0, 0, 0, this.h);
    if (night) {
      bg.addColorStop(0, '#050b09');
      bg.addColorStop(0.5, '#07150e');
      bg.addColorStop(1, '#040b07');
    } else if (rain) {
      bg.addColorStop(0, '#101c19');
      bg.addColorStop(0.55, '#0c2118');
      bg.addColorStop(1, '#07130d');
    } else {
      bg.addColorStop(0, '#0b2116');
      bg.addColorStop(0.55, '#0a1c12');
      bg.addColorStop(1, '#06110b');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);

    // main grass slab (slight border beyond touch)
    const p0 = this.worldToScreen(-11.5, -3.5);
    const p1 = this.worldToScreen(111.5, 73.5);
    ctx.fillStyle = night ? '#0c321f' : rain ? '#12442a' : '#14522f';
    ctx.fillRect(p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);

    // mow stripes across the field
    for (let i = 0; i < 13; i++) {
      const x = -10 + i * 10;
      const a = this.worldToScreen(x, -1);
      const bw = 10 * s;
      ctx.fillStyle = i % 2
        ? (night ? 'rgba(255,255,255,0.012)' : 'rgba(255,255,255,0.026)')
        : 'rgba(0,0,0,0.035)';
      ctx.fillRect(a.x, a.y, bw, 72 * s);
    }
    // in-goal shading
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    const igl = this.worldToScreen(-10, 0);
    const igr = this.worldToScreen(0, 70);
    ctx.fillRect(igl.x, igl.y, igr.x - igl.x, igr.y - igl.y);
    const igl2 = this.worldToScreen(100, 0);
    const igr2 = this.worldToScreen(110, 70);
    ctx.fillRect(igl2.x, igl2.y, igr2.x - igl2.x, igr2.y - igl2.y);

    // distant stands / advertising boards behind both touchlines
    this.drawTouchside(match, -8.5, -1);
    this.drawTouchside(match, 78.5, 1);

    // corner flags
    for (const x of [-10, 0, 100, 110]) {
      for (const y of [0, 70]) {
        const p = this.worldToScreen(x, y);
        ctx.fillStyle = 'rgba(245,240,227,0.5)';
        ctx.fillRect(p.x - 1, p.y - 7, 1.4, 7);
        ctx.fillStyle = x === 0 || x === 100 ? '#f2c53d' : '#d8f36a';
        ctx.fillRect(p.x, p.y - 7, 5, 3.2);
      }
    }
  }

  drawTouchside(match, y, side) {
    const ctx = this.ctx;
    const cam = this.cam;
    const s = cam.scale;
    const a = this.worldToScreen(-16, y + side * 0.7);
    const b = this.worldToScreen(116, y + side * 0.7);
    // ad ring
    const boardH = 1.5 * s;
    ctx.fillStyle = side < 0 ? '#0a1b12' : '#08170f';
    ctx.fillRect(a.x, side < 0 ? a.y : a.y - boardH, b.x - a.x, boardH);
    const home = match?.teams?.[0]?.colors || { primary: '#f2c53d', secondary: '#0d2b1c' };
    const away = match?.teams?.[1]?.colors || { primary: '#6ec7ff', secondary: '#f5f0e3' };
    const count = 24;
    for (let i = 0; i < count; i++) {
      const bx = -14 + i * 5.35;
      const p = this.worldToScreen(bx, y + side * 0.7);
      const colors = i % 4 === 0 ? ['#f2c53d', '#d8f36a'] : i % 4 === 1 ? ['#0e7d78', '#f5f0e3'] : i % 4 === 2 ? [home.primary, home.secondary] : [away.primary, away.secondary];
      ctx.fillStyle = colors[0];
      ctx.fillRect(p.x, side < 0 ? p.y : p.y - boardH, 4.25 * s, boardH);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(p.x + 1.2 * s, side < 0 ? p.y + boardH * 0.3 : p.y - boardH * 0.7, 1.8 * s, boardH * 0.4);
      ctx.fillStyle = colors[1];
      ctx.fillRect(p.x + 5.3 * s, side < 0 ? p.y : p.y - boardH, 0.55 * s, boardH);
    }

    // stands
    const standDepth = 24;
    const y0 = y + side * 2.2;
    const q0 = this.worldToScreen(-24, y0);
    const q1 = this.worldToScreen(124, y0 + side * standDepth);
    const top = Math.min(q0.y, q1.y);
    const bottom = Math.max(q0.y, q1.y);
    const grad = ctx.createLinearGradient(0, top, 0, bottom);
    if (side < 0) {
      grad.addColorStop(0, '#030b07');
      grad.addColorStop(0.35, '#0b1c13');
      grad.addColorStop(1, '#13251a');
    } else {
      grad.addColorStop(0, '#13251a');
      grad.addColorStop(0.65, '#0b1c13');
      grad.addColorStop(1, '#030b07');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(q0.x, top, q1.x - q0.x, bottom - top);

    // crowd flecks
    const rows = 14;
    const cols = 118;
    for (let r = 0; r < rows; r++) {
      const yy = top + ((r + 0.5) / rows) * (bottom - top);
      for (let c = 0; c < cols; c++) {
        if (hash(c * 31 + r * 7) < 0.28) continue;
        const xx = q0.x + ((c + 0.5) / cols) * (q1.x - q0.x);
        if (xx < -20 || xx > this.w + 20) continue;
        const h = hash(c * 3.3 + r * 9.1);
        const v = 0.16 + h * 0.28;
        ctx.fillStyle = h > 0.82 ? `rgba(242,197,61,${v})` : h > 0.7 ? `rgba(216,243,106,${v})` : `rgba(245,240,227,${v})`;
        const d = Math.max(1, s * 0.1);
        ctx.fillRect(xx, yy, d, d * 1.4);
      }
    }
    // rail
    ctx.strokeStyle = 'rgba(245,240,227,0.2)';
    ctx.lineWidth = Math.max(1, 0.13 * s);
    ctx.beginPath();
    ctx.moveTo(q0.x, side < 0 ? bottom : top);
    ctx.lineTo(q1.x, side < 0 ? bottom : top);
    ctx.stroke();
  }

  drawPitchLines(match) {
    const ctx = this.ctx;
    const cam = this.cam;
    const s = cam.scale;
    const lineW = Math.max(1, s * 0.115);
    const cream = 'rgba(245,240,227,0.78)';
    const dim = 'rgba(245,240,227,0.28)';

    const seg = (x1, y1, x2, y2, width = lineW, style = cream, dash = null) => {
      const a = this.worldToScreen(x1, y1);
      const b = this.worldToScreen(x2, y2);
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      if (dash) ctx.setLineDash(dash.map((v) => v * s));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    // touchlines
    seg(-10, 0, 110, 0, lineW * 0.9, dim);
    seg(-10, 70, 110, 70, lineW * 0.9, dim);
    // dead-ball lines
    seg(-10, 0, -10, 70, lineW, cream);
    seg(110, 0, 110, 70, lineW, cream);
    // try lines
    seg(0, 0, 0, 70, lineW * 1.8, cream);
    seg(100, 0, 100, 70, lineW * 1.8, cream);
    // halfway & 22s
    seg(50, 0, 50, 70, lineW, cream);
    seg(22, 0, 22, 70, lineW, dim);
    seg(78, 0, 78, 70, lineW, dim);
    // 10m lines broken
    seg(40, 0, 40, 70, lineW, dim, [2.2, 2.2]);
    seg(60, 0, 60, 70, lineW, dim, [2.2, 2.2]);
    // 5m / 15m channels
    for (const y of [5, 15, 55, 65]) {
      seg(0, y, 100, y, Math.max(1, lineW * 0.7), 'rgba(245,240,227,0.16)', [2.4, 3.2]);
    }
    // halfway circle
    const c = this.worldToScreen(50, 35);
    ctx.strokeStyle = dim;
    ctx.lineWidth = lineW * 0.8;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 9.8 * s, 0, TAU);
    ctx.stroke();
    // 22m circles / hash marks
    for (const x of [22, 78]) {
      for (const y of [0.7, 69.3]) {
        seg(x - 0.8, y, x + 0.8, y, lineW * 1.2, cream);
      }
    }
    // in-goal hatch
    ctx.save();
    ctx.globalAlpha = 0.05;
    for (const [x0, x1] of [[-10, 0], [100, 110]]) {
      for (let x = x0; x < x1; x += 2.4) seg(x, 0, x, 70, Math.max(0.5, s * 0.04), '#d8f36a');
    }
    ctx.restore();

    // goal posts
    this.drawGoalPosts(0, match?.teams?.[1]?.colors);
    this.drawGoalPosts(100, match?.teams?.[0]?.colors);
  }

  drawGoalPosts(x, colors) {
    const ctx = this.ctx;
    const s = this.cam.scale;
    const base = this.worldToScreen(x, 35);
    const z = s * 0.85;
    const postH = 7.4 * z;
    const crossH = 3.05 * z;
    const half = 2.8 * s;
    const left = { x: base.x, y: base.y - half };
    const right = { x: base.x, y: base.y + half };
    // shadow
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = Math.max(2, s * 0.28);
    ctx.beginPath();
    ctx.moveTo(left.x + 6, left.y + 3);
    ctx.lineTo(right.x + 6, right.y + 3);
    ctx.stroke();
    // pad bases
    ctx.fillStyle = colors?.primary || '#f2c53d';
    ctx.beginPath();
    ctx.arc(left.x, left.y, Math.max(2.5, s * 0.28), 0, TAU);
    ctx.arc(right.x, right.y, Math.max(2.5, s * 0.28), 0, TAU);
    ctx.fill();
    // posts
    ctx.strokeStyle = 'rgba(245,240,227,0.88)';
    ctx.lineWidth = Math.max(2, s * 0.26);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(left.x, left.y - postH);
    ctx.moveTo(right.x, right.y);
    ctx.lineTo(right.x, right.y - postH);
    ctx.stroke();
    // crossbar
    ctx.lineWidth = Math.max(1.5, s * 0.18);
    ctx.beginPath();
    ctx.moveTo(left.x, left.y - crossH);
    ctx.lineTo(right.x, right.y - crossH);
    ctx.stroke();
    // flags
    ctx.fillStyle = colors?.secondary || '#0d2b1c';
    ctx.fillRect(left.x - s * 0.25, left.y - postH, s * 0.5, s * 0.32);
    ctx.fillRect(right.x - s * 0.25, right.y - postH, s * 0.5, s * 0.32);
  }

  // ------------------------------------------------------------
  // match indicators
  // ------------------------------------------------------------
  drawAim(match) {
    if (!match.kickCharging) return;
    const ctx = this.ctx;
    const p = match.ball.owner;
    if (!p) return;
    const angle = match.aimAngle ?? p.facing ?? 0;
    const power = match.kickPower || 0;
    const a = this.worldToScreen(p.x, p.y);
    const reach = 9 + power * 30;
    const b = this.worldToScreen(p.x + Math.cos(angle) * reach, p.y + Math.sin(angle) * reach);
    const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    grad.addColorStop(0, 'rgba(216,243,106,0.95)');
    grad.addColorStop(1, 'rgba(216,243,106,0.12)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.max(2, this.cam.scale * 0.13);
    ctx.setLineDash([this.cam.scale * 0.55, this.cam.scale * 0.38]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    // arrow head
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(ang);
    ctx.fillStyle = '#d8f36a';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-3, -7);
    ctx.lineTo(-3, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // power ring around player
    ctx.strokeStyle = 'rgba(216,243,106,0.28)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(a.x, a.y, this.cam.scale * 1.7, -Math.PI / 2, -Math.PI / 2 + TAU * power);
    ctx.stroke();

    // projected landing
    if (match.ball.state === 'kick') {
      const land = match.predictLanding();
      const l = this.worldToScreen(land.x, land.y);
      const pulse = 0.65 + Math.sin(this.time * 7) * 0.18;
      ctx.strokeStyle = `rgba(216,243,106,${pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.ellipse(l.x, l.y, this.cam.scale * 1.6, this.cam.scale * 0.82, 0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(216,243,106,0.5)';
      ctx.beginPath();
      ctx.moveTo(l.x - 7, l.y);
      ctx.lineTo(l.x + 7, l.y);
      ctx.moveTo(l.x, l.y - 7);
      ctx.lineTo(l.x, l.y + 7);
      ctx.stroke();
    }
  }

  drawLanding(match) {
    if (match.ball.state !== 'kick') return;
    const land = match.predictLanding();
    const l = this.worldToScreen(land.x, land.y);
    const ctx = this.ctx;
    const pulse = 0.5 + Math.sin(this.time * 7) * 0.18;
    ctx.strokeStyle = `rgba(245,240,227,${pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.ellipse(l.x, l.y, this.cam.scale * 2, this.cam.scale, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawSetPlayRoutes(match) {
    const ap = match.activePlay;
    if (!ap || ap.time > 3.4) return;
    const ctx = this.ctx;
    for (const p of match.userTeam.players) {
      if (!p.scripted || !p.route) continue;
      const remaining = p.route.slice(p.routeIndex || 0);
      if (!remaining.length) continue;
      const isReceiver = ap.receiver === p;
      const from = this.worldToScreen(p.x, p.y);
      ctx.strokeStyle = isReceiver ? 'rgba(242,197,61,0.9)' : 'rgba(216,243,106,0.32)';
      ctx.lineWidth = isReceiver ? 2.8 : 1.5;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      for (const pt of remaining) {
        const sp = this.worldToScreen(pt.x, pt.y);
        ctx.lineTo(sp.x, sp.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      const last = remaining[remaining.length - 1];
      const lp = this.worldToScreen(last.x, last.y);
      if (isReceiver) {
        ctx.strokeStyle = '#f2c53d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(lp.x, lp.y, 8 + Math.sin(this.time * 5) * 2, 0, TAU);
        ctx.stroke();
      }
    }
  }

  drawPlayerRing(p) {
    const ctx = this.ctx;
    const s = this.cam.scale;
    const p0 = this.worldToScreen(p.x, p.y);
    ctx.fillStyle = alpha(p.team?.colors?.primary || '#f2c53d', p.team?.isUser ? 0.16 : 0.09);
    ctx.beginPath();
    ctx.ellipse(p0.x, p0.y + s * 0.2, s * 0.85, s * 0.31, 0, 0, TAU);
    ctx.fill();
  }

  drawPlayer(p, match) {
    const s = this.cam.scale;
    const sp = this.worldToScreen(p.x, p.y);
    this.drawPlayerRing(p);
    if (p.state === 'down') {
      // tackle splash under the player
      this.ctx.fillStyle = 'rgba(0,0,0,0.22)';
      this.ctx.beginPath();
      this.ctx.ellipse(sp.x, sp.y + s * 0.35, s * 0.95, s * 0.42, 0, 0, TAU);
      this.ctx.fill();
    }
    drawPlayerSprite(this.ctx, p, sp.x, sp.y, s * 0.94, this.time, {
      controlled: match.controlled === p && p.team?.isUser,
      scripted: p.scripted,
    });
    if (p.team?.isUser && match.controlled !== p && p.state === 'run') {
      // subtle marker for your side
      this.ctx.fillStyle = 'rgba(216,243,106,0.55)';
      this.ctx.beginPath();
      this.ctx.arc(sp.x, sp.y - s * 1.5, Math.max(1.4, s * 0.08), 0, TAU);
      this.ctx.fill();
    }
  }

  drawBall(match, dt) {
    const ctx = this.ctx;
    const b = match.ball;
    const s = this.cam.scale;
    const ground = this.worldToScreen(b.x, b.y);
    const lift = Math.max(0, b.z || 0) * s * 0.74;
    const bx = ground.x;
    const by = ground.y - lift;

    if (b.state === 'kick' || b.state === 'pass' || b.state === 'loose') {
      this.ballTrail.push({ x: bx, y: by, age: 0 });
    }
    for (const t of this.ballTrail) t.age += dt || 0.016;
    this.ballTrail = this.ballTrail.filter((t) => t.age < 0.24);
    if (this.ballTrail.length > 22) this.ballTrail.splice(0, this.ballTrail.length - 22);
    for (let i = 0; i < this.ballTrail.length; i++) {
      const t = this.ballTrail[i];
      const a = (1 - t.age / 0.24) * 0.18 * (i / this.ballTrail.length);
      ctx.fillStyle = `rgba(242,197,61,${a})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, Math.max(1, s * 0.14), 0, TAU);
      ctx.fill();
    }

    // ground shadow
    ctx.fillStyle = `rgba(0,0,0,${0.22 + Math.min(0.2, (b.z || 0) * 0.06)})`;
    ctx.beginPath();
    ctx.ellipse(ground.x + 2, ground.y + 2, Math.max(2.4, s * 0.23), Math.max(1.6, s * 0.13), 0, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate((b.rot || 0) * 0.55 + (b.state === 'held' ? (b.owner?.facing || 0) : 0));
    const bw = Math.max(4, s * 0.38);
    const bh = Math.max(2.6, s * 0.23);
    ctx.fillStyle = '#8a4b2a';
    ctx.beginPath();
    ctx.ellipse(0, 0, bw, bh, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = Math.max(0.7, s * 0.026);
    ctx.beginPath();
    ctx.moveTo(-bw * 0.6, 0);
    ctx.lineTo(bw * 0.6, 0);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 0, bw, bh, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  drawEffects(match, layer) {
    const ctx = this.ctx;
    const s = this.cam.scale;
    if (layer === 'ground') {
      for (const r of match.rings) {
        const t = Math.min(1, r.age / r.dur);
        const p = this.worldToScreen(r.x, r.y);
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = (1 - t) * 0.9;
        ctx.lineWidth = Math.max(1, s * 0.12);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, (r.r0 + (r.r1 - r.r0) * t) * s, (r.r0 + (r.r1 - r.r0) * t) * s * 0.55, 0, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      return;
    }

    for (const pt of match.particles) {
      const p = this.worldToScreen(pt.x, pt.y);
      const life = Math.max(0, Math.min(1, pt.life / Math.max(0.001, pt.maxLife)));
      const sz = Math.max(1, pt.size * s);
      ctx.globalAlpha = life;
      if (pt.type === 'confetti') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(pt.rot || 0);
        ctx.fillStyle = pt.color;
        ctx.fillRect(-sz, -sz * 0.4, sz * 2, sz * 0.8);
        ctx.restore();
      } else if (pt.type === 'dust') {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz, 0, TAU);
        ctx.fill();
      } else {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    for (const f of match.floaters) {
      const p = this.worldToScreen(f.x, f.y);
      const t = Math.min(1, f.age / f.dur);
      ctx.globalAlpha = Math.min(1, (1 - t) * 2.2);
      ctx.fillStyle = f.color;
      ctx.font = `800 ${Math.max(12, s * 0.62)}px "Arial Narrow", Impact, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  drawSetPieceUI(match) {
    const sp = match.setpiece;
    if (!sp) return;
    const ctx = this.ctx;
    const w = Math.min(360, this.w * 0.66);
    const x = (this.w - w) / 2;
    const y = this.h - (this.h > 600 ? 106 : 168);
    ctx.fillStyle = 'rgba(4,13,8,0.88)';
    roundRect(ctx, x, y, w, 46, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245,240,227,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#d8f36a';
    ctx.font = '800 9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${sp.label} — ${sp.team.isUser ? 'YOUR BALL' : 'CONTEST'}`, this.w / 2, y + 14);
    const bx = x + 18;
    const bw = w - 36;
    const by = y + 23;
    ctx.fillStyle = 'rgba(245,240,227,0.1)';
    roundRect(ctx, bx, by, bw, 9, 9);
    ctx.fill();
    ctx.fillStyle = 'rgba(216,243,106,0.35)';
    const zx = bx + bw * sp.zone[0];
    const zw = bw * (sp.zone[1] - sp.zone[0]);
    roundRect(ctx, zx, by, zw, 9, 9);
    ctx.fill();
    ctx.strokeStyle = 'rgba(216,243,106,0.9)';
    ctx.strokeRect(zx, by, zw, 9);
    ctx.fillStyle = '#fff';
    const mx = bx + bw * clamp(sp.bar, 0, 1);
    ctx.fillRect(mx - 2, by - 3, 4, 15);
    ctx.fillStyle = 'rgba(245,240,227,0.55)';
    ctx.font = '700 7px Inter, system-ui, sans-serif';
    ctx.fillText(sp.phase === 'timing' ? (sp.team.isUser ? 'TAP PASS / TACKLE IN THE GREEN' : 'TAP TACKLE TO CONTEST') : 'SET PIECE', this.w / 2, y + 41);
  }

  drawConversionUI(match) {
    const c = match.conversion;
    if (!c) return;
    const ctx = this.ctx;
    const w = Math.min(380, this.w * 0.7);
    const x = (this.w - w) / 2;
    const y = this.h - (this.h > 600 ? 104 : 168);

    // kicker backdrop / distance readout
    ctx.fillStyle = 'rgba(4,13,8,0.9)';
    roundRect(ctx, x, y - 26, w, 78, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245,240,227,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = c.userKicking ? '#d8f36a' : '#f5f0e3';
    ctx.font = '800 10px Inter, system-ui, sans-serif';
    ctx.fillText(c.userKicking ? 'CONVERSION — TAP KICK IN THE GREEN' : 'CONVERSION — THE KICK IS AWAY', this.w / 2, y - 8);
    ctx.fillStyle = 'rgba(245,240,227,0.55)';
    ctx.font = '700 7px Inter, system-ui, sans-serif';
    ctx.fillText(`${Math.round(8 + c.distance * 0.55)}m OUT · ${c.kicker?.name?.toUpperCase() || ''}`, this.w / 2, y + 4);

    const bx = x + 20;
    const bw = w - 40;
    const by = y + 16;
    ctx.fillStyle = 'rgba(245,240,227,0.1)';
    roundRect(ctx, bx, by, bw, 12, 12);
    ctx.fill();
    const gx = bx + bw * (0.7 - c.window);
    const gw = bw * c.window * 2;
    const grad = ctx.createLinearGradient(gx, 0, gx + gw, 0);
    grad.addColorStop(0, 'rgba(216,243,106,0.2)');
    grad.addColorStop(0.5, 'rgba(216,243,106,0.55)');
    grad.addColorStop(1, 'rgba(216,243,106,0.2)');
    ctx.fillStyle = grad;
    roundRect(ctx, gx, by, gw, 12, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(216,243,106,0.85)';
    ctx.strokeRect(gx, by, gw, 12);
    ctx.fillStyle = '#f5f0e3';
    const mx = bx + bw * clamp(c.power, 0, 1);
    ctx.fillRect(mx - 2, by - 4, 4, 20);
    ctx.fillStyle = 'rgba(245,240,227,0.5)';
    ctx.font = '700 7px Inter, system-ui, sans-serif';
    ctx.fillText(c.locked ? (c.success ? 'GOOD' : c.resolved ? 'MISSED' : 'KICKING…') : 'RELEASE AT THE RIGHT MOMENT', this.w / 2, y + 43);

    // posts target window during flight
    if (c.locked) {
      const postSide = c.lineX;
      const p = this.worldToScreen(postSide, 35);
      const s = this.cam.scale;
      if (c.success) {
        ctx.strokeStyle = `rgba(216,243,106,${0.4 + Math.sin(this.time * 8) * 0.2})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y - s * 3, s * 4.4, 0, TAU);
        ctx.stroke();
      }
    }
  }

  drawMinimap(match) {
    if (this.w < 620) return;
    const ctx = this.ctx;
    const w = 138;
    const h = 50;
    const x = 14;
    const y = 64;
    ctx.fillStyle = 'rgba(4,13,8,0.68)';
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245,240,227,0.14)';
    ctx.lineWidth = 1;
    ctx.stroke();
    const pad = 5;
    const fx = (v) => x + pad + ((v + 10) / 120) * (w - pad * 2);
    const fy = (v) => y + pad + (v / 70) * (h - pad * 2);
    ctx.fillStyle = 'rgba(216,243,106,0.14)';
    ctx.fillRect(fx(0), fy(0), fx(100) - fx(0), fy(70) - fy(0));
    ctx.strokeStyle = 'rgba(245,240,227,0.25)';
    ctx.beginPath();
    ctx.moveTo(fx(50), fy(0)); ctx.lineTo(fx(50), fy(70));
    ctx.stroke();
    for (const t of match.teams) {
      ctx.fillStyle = t.colors.primary;
      for (const p of t.players) {
        ctx.beginPath();
        ctx.arc(fx(p.x), fy(p.y), p === match.controlled ? 2.4 : 1.6, 0, TAU);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(fx(match.ball.x), fy(match.ball.y), 1.5, 0, TAU);
    ctx.fill();
  }

  drawWeather(match, dt) {
    const weather = match?.weather || this.weather;
    const ctx = this.ctx;
    if (weather === 'rain') {
      if (!this.rainDrops.length) {
        for (let i = 0; i < 120; i++) {
          this.rainDrops.push({ x: Math.random() * this.w, y: Math.random() * this.h, len: 8 + Math.random() * 18, sp: 420 + Math.random() * 280 });
        }
      }
      ctx.strokeStyle = 'rgba(190,220,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const d = dt || 0.016;
      for (const r of this.rainDrops) {
        r.y += r.sp * d;
        r.x -= r.sp * 0.16 * d;
        if (r.y > this.h + 20) { r.y = -20; r.x = Math.random() * this.w; }
        if (r.x < -20) r.x = this.w + 20;
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x + r.len * 0.16, r.y + r.len);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(25,58,60,0.07)';
      ctx.fillRect(0, 0, this.w, this.h);
    } else {
      this.rainDrops.length = 0;
    }
    if (weather === 'night') {
      ctx.fillStyle = 'rgba(2,9,18,0.26)';
      ctx.fillRect(0, 0, this.w, this.h);
      // floodlight pools
      const g = ctx.createRadialGradient(this.w * 0.12, this.h * 0.02, 0, this.w * 0.12, this.h * 0.02, this.h * 0.7);
      g.addColorStop(0, 'rgba(220,240,255,0.08)');
      g.addColorStop(1, 'rgba(220,240,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.w, this.h);
      const g2 = ctx.createRadialGradient(this.w * 0.88, this.h * 0.02, 0, this.w * 0.88, this.h * 0.02, this.h * 0.7);
      g2.addColorStop(0, 'rgba(220,240,255,0.08)');
      g2.addColorStop(1, 'rgba(220,240,255,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }

  drawKickoffPrompt(match) {
    if (match.state !== 'kickoff') return;
    const ctx = this.ctx;
    const c = match.controlled;
    if (!c) return;
    const p = this.worldToScreen(c.x, c.y);
    const pulse = 0.55 + Math.sin(this.time * 4) * 0.18;
    ctx.strokeStyle = `rgba(216,243,106,${pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, this.cam.scale * 2.2, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#d8f36a';
    ctx.font = '800 10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    if (c.team.isUser) {
      ctx.fillText(match.kickCharging ? 'RELEASE TO KICK OFF' : 'HOLD KICK TO CHARGE', p.x, p.y - this.cam.scale * 2.8);
    }
  }

  // ------------------------------------------------------------
  // public: match render
  // ------------------------------------------------------------
  render(match, dt, opts = {}) {
    this.time += dt || 0;
    this.reducedMotion = !!opts.reducedMotion;
    this.weather = match?.weather || 'clear';
    if (!match) return;
    this.focusCamera(match, dt);

    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    const shake = this.reducedMotion || opts.shake === false ? 0 : (match.shake || 0) * 8;
    ctx.save();
    if (shake > 0.05) {
      ctx.translate(
        Math.sin(this.time * 78) * shake + Math.sin(this.time * 31) * shake * 0.4,
        Math.cos(this.time * 67) * shake * 0.7,
      );
    }

    this.drawStadium(match);
    this.drawPitchLines(match);
    this.drawEffects(match, 'ground');
    this.drawSetPlayRoutes(match);

    // players sorted far-to-near (top to bottom)
    const players = [...match.teams[0].players, ...match.teams[1].players].filter((p) => !p.bench);
    players.sort((a, b) => a.y - b.y || a.slot - b.slot);
    for (const p of players) this.drawPlayer(p, match);

    this.drawBall(match, dt);
    this.drawLanding(match);
    this.drawAim(match);
    this.drawKickoffPrompt(match);
    this.drawEffects(match, 'air');

    // conversion flight ball is drawn by ball state above; ensure it's visible even when held
    if (match.conversion && match.conversion.locked) {
      this.drawConversionFlight(match);
    }

    ctx.restore();

    this.drawWeather(match, dt);
    this.drawSetPieceUI(match);
    if (match.state === 'conversion') this.drawConversionUI(match);
    this.drawMinimap(match);

    if (match.flash > 0) {
      ctx.fillStyle = `rgba(245,240,227,${Math.min(0.55, match.flash)})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }
    // lightweight scoreboard-safe top gradient
    const topGrad = ctx.createLinearGradient(0, 0, 0, 90);
    topGrad.addColorStop(0, 'rgba(3,10,6,0.42)');
    topGrad.addColorStop(1, 'rgba(3,10,6,0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, this.w, 90);
  }

  drawConversionFlight(match) {
    const c = match.conversion;
    if (!c) return;
    const ctx = this.ctx;
    const t = clamp(c.flight / 0.95, 0, 1);
    const s = this.cam.scale;
    const side = c.dirSign;
    const startX = c.kicker?.x ?? c.spot.x - side * 3.4;
    const endX = c.lineX + side * 1.5;
    const x = lerp(startX, endX, t);
    let y = lerp(c.spot.y, 35, t);
    if (!c.success) y += Math.sin(t * Math.PI) * 4.8 * side;
    const height = Math.sin(t * Math.PI) * 8.5 + t * 2.6;
    const p = this.worldToScreen(x, y);
    const py = p.y - height * s * 0.72;
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, s * 0.24, s * 0.12, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(p.x, py);
    ctx.rotate(t * 14);
    ctx.fillStyle = '#8a4b2a';
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(4, s * 0.36), Math.max(2.5, s * 0.22), 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, 0); ctx.lineTo(s * 0.2, 0);
    ctx.stroke();
    ctx.restore();
  }

  // ------------------------------------------------------------
  // public: menu attract mode
  // ------------------------------------------------------------
  makeDemo() {
    const home = { colors: { primary: '#f2c53d', secondary: '#0d2b1c', shorts: '#0d2b1c', socks: '#f2c53d', pattern: 'sash' }, isUser: true, dir: 1 };
    const away = { colors: { primary: '#24479b', secondary: '#f2ede1', shorts: '#132a5c', socks: '#24479b', pattern: 'hoops' }, isUser: false, dir: -1 };
    const apps = [
      { skin: '#96592f', hair: '#111111', hairStyle: 'curly', build: 'power', gear: 'none' },
      { skin: '#d99e70', hair: '#241811', hairStyle: 'buzz', build: 'athletic', gear: 'headband' },
      { skin: '#f4d6ba', hair: '#7a5230', hairStyle: 'short', build: 'athletic', gear: 'none' },
      { skin: '#6c3d21', hair: '#111111', hairStyle: 'afro', build: 'slim', gear: 'none' },
      { skin: '#e8bb93', hair: '#4a2d1a', hairStyle: 'long', build: 'athletic', gear: 'headband' },
      { skin: '#bd7d4e', hair: '#111111', hairStyle: 'short', build: 'power', gear: 'scrumcap' },
      { skin: '#d99e70', hair: '#b48a52', hairStyle: 'short', build: 'slim', gear: 'none' },
      { skin: '#6c3d21', hair: '#111111', hairStyle: 'buzz', build: 'power', gear: 'none' },
    ];
    const players = [];
    for (let i = 0; i < 7; i++) {
      players.push({
        team: home, slot: i, number: i + 1, appearance: apps[i % apps.length],
        state: 'run', x: 30 + i * 3.1, y: 20 + (i % 4) * 8.5, facing: 0,
        runPhase: Math.random() * TAU, vx: 0.8, vy: 0, sprintReq: false,
      });
      players.push({
        team: away, slot: i, number: i + 1, appearance: apps[(i + 4) % apps.length],
        state: 'run', x: 43 + i * 2.6, y: 17 + (i % 4) * 9.5, facing: Math.PI,
        runPhase: Math.random() * TAU, vx: -0.7, vy: 0, sprintReq: false,
      });
    }
    return { home, away, players, ball: { x: 33, y: 30, z: 0.3, rot: 0, state: 'held' } };
  }

  renderMenu(dt) {
    this.time += dt || 0;
    if (!this.demo) this.demo = this.makeDemo();
    const d = this.demo;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    // lazy camera pan across an attract-mode match
    const t = this.time;
    const visibleW = 106;
    const visibleH = 70;
    const scale = Math.max(this.w / visibleW, this.h / visibleH) * 1.02;
    this.cam.scale = scale;
    this.cam.x = 50 + Math.sin(t * 0.055) * 9;
    this.cam.y = 35 + Math.sin(t * 0.041 + 1.2) * 3.5;
    this.weather = 'clear';
    this.drawStadium(null);
    this.drawPitchLines(null);

    // attract players running a slow phase pattern
    d.ball.x = 36 + Math.sin(t * 0.4) * 14;
    d.ball.y = 33 + Math.sin(t * 0.31 + 0.8) * 10;
    d.ball.rot += dt * 2;
    for (const p of d.players) {
      const home = p.team === d.home;
      const phase = t * 0.35 + p.slot * 0.8;
      p.x = (home ? 30 : 46) + p.slot * 2.4 + Math.sin(phase) * 2.2;
      p.y = 18 + (p.slot % 4) * 9.5 + Math.cos(phase * 0.8) * 2.2;
      p.facing = home ? 0 : Math.PI;
      p.runPhase += dt * 5.2;
      p.x = clamp(p.x, -6, 106);
    }
    // give the ball to the closest home-looking carrier
    const carrier = d.players[3];
    d.players.sort((a, b) => a.y - b.y);
    for (const p of d.players) this.drawPlayer(p, { controlled: p === carrier, userTeam: d.home });
    this.drawBall({ ball: d.ball }, dt);
    this.drawWeather({ weather: 'clear' }, dt);

    // top/bottom gradients to keep menu text readable
    const lg = ctx.createLinearGradient(0, 0, this.w * 0.7, 0);
    lg.addColorStop(0, 'rgba(4,13,8,0.72)');
    lg.addColorStop(0.4, 'rgba(4,13,8,0.18)');
    lg.addColorStop(1, 'rgba(4,13,8,0.05)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, this.w, this.h);
  }
}

export default Renderer;
