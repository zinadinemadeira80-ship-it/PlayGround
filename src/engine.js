// ============================================================
// RUCKUS RUGBY — match simulation
// ============================================================
import {
  clamp, dist, dist2, rand, chance, pick, angleOf,
  angleLerp, wrapAngle, lerp,
} from './utils.js';
import { STYLE_ATTACK, STYLE_DEFENSE } from './data.js';
import { audio } from './audio.js';
import { input } from './input.js';

export const FIELD = {
  minX: -10, maxX: 110, minY: 0, maxY: 70,
  midY: 35, leftTry: 0, rightTry: 100, inGoal: 10,
};

const G = 9.8;
const TOUCH = 0.45;

const clampToField = (p) => {
  p.x = clamp(p.x, FIELD.minX + 0.5, FIELD.maxX - 0.5);
  p.y = clamp(p.y, 0.32, FIELD.maxY - 0.32);
};

function nearestOf(list, x, y, filter) {
  let best = null;
  let bd = Infinity;
  for (const p of list) {
    if (filter && !filter(p)) continue;
    const d = dist2(p.x, p.y, x, y);
    if (d < bd) { bd = d; best = p; }
  }
  return { player: best, dist: Math.sqrt(bd) };
}

export class Player {
  constructor(data, team, slot, bench = false) {
    this.data = data;
    this.id = data.id;
    this.name = data.name;
    this.number = data.number;
    this.position = data.position;
    this.stats = { ...data.stats };
    this.appearance = { ...data.appearance };
    this.trait = data.trait;
    this.team = team;
    this.slot = slot;
    this.bench = bench;

    this.x = 50;
    this.y = 35;
    this.vx = 0;
    this.vy = 0;
    this.facing = team.dir > 0 ? 0 : Math.PI;
    this.state = 'run';
    this.staminaMax = 100 * (this.trait === 'engine' ? 1.3 : 1);
    this.stamina = this.staminaMax;
    this.speedBase = (5.75 + (this.stats.pace - 1) * 0.315) * (this.trait === 'speedster' ? 1.08 : 1);

    this.sprintReq = false;
    this.mx = 0;
    this.my = 0;
    this.runPhase = rand(0, Math.PI * 2);
    this.invuln = 0;
    this.tackleCd = 0;
    this.sidestepCd = 0;
    this.sidestep = 0;
    this.speedBoost = 0;
    this.diveTimer = 0;
    this.downTimer = 0;
    this.getupTimer = 0;
    this.stunTimer = 0;
    this.pickupCd = 0;
    this.kickCd = 0;
    this.celebrate = 0;

    this.scripted = false;
    this.route = null;
    this.routeIndex = 0;
    this.scriptTime = 0;
    this.aiDecision = rand(0, 0.5);
    this.prevX = this.x;
    this.ms = { tries: 0, tackles: 0, meters: 0, passes: 0, kicks: 0, turnovers: 0, points: 0 };
  }

  get hasBall() {
    return this.team.match?.ball?.owner === this;
  }

  get ovr() {
    const ks = ['pace', 'strength', 'handling', 'kicking', 'tackling', 'stamina'];
    const avg = ks.reduce((s, k) => s + this.stats[k], 0) / ks.length;
    return clamp(Math.round(45 + avg * 5.5), 40, 99);
  }

  resetAt(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.state = 'run';
    this.facing = this.team.dir > 0 ? 0 : Math.PI;
    this.sprintReq = false;
    this.mx = 0;
    this.my = 0;
    this.invuln = 0;
    this.tackleCd = 0;
    this.sidestepCd = 0;
    this.sidestep = 0;
    this.speedBoost = 0;
    this.diveTimer = 0;
    this.downTimer = 0;
    this.getupTimer = 0;
    this.stunTimer = 0;
    this.pickupCd = 0;
    this.kickCd = 0;
    this.celebrate = 0;
    this.scripted = false;
    this.route = null;
    this.routeIndex = 0;
    this.scriptTime = 0;
    clampToField(this);
  }
}

function makeTeam(data, dir, isUser) {
  const team = {
    id: data.id || (isUser ? 'home' : 'away'),
    name: data.name,
    abbr: data.abbr,
    colors: { primary: '#f2c53d', secondary: '#0d2b1c', shorts: '#0d2b1c', socks: '#f2c53d', pattern: 'sash', ...(data.colors || {}) },
    dir,
    isUser,
    score: 0,
    players: [],
    bench: [],
    subbed: [],
    squad: data.squad,
    match: null,
    attackStyle: STYLE_ATTACK[data.tactics?.attack] || STYLE_ATTACK.balanced,
    defenseStyle: STYLE_DEFENSE[data.tactics?.defense] || STYLE_DEFENSE.line,
    aiTimer: 0,
    defRoles: new Map(),
    aiPassCd: 0,
    aiKickCd: 0,
    aiTackleCd: 0,
    stats: {
      possession: 0, tries: 0, conversions: 0, tackles: 0, passes: 0, kicks: 0,
      meters: 0, turnovers: 0, lineouts: 0, lineoutsWon: 0, scrums: 0, scrumsWon: 0, errors: 0,
    },
  };
  const squad = Array.isArray(data.squad) && data.squad.length >= 7 ? data.squad : [];
  while (squad.length < 10) squad.push(squad[0]);
  team.players = squad.slice(0, 7).map((pd, i) => new Player(pd, team, i, false));
  team.bench = squad.slice(7, 10).map((pd, i) => new Player(pd, team, 7 + i, true));
  return team;
}

export class Match {
  constructor(homeData, awayData, settings = {}, opts = {}) {
    this.settings = settings;
    this.halfLength = Number(settings.half) || 180;
    this.difficulty = settings.difficulty || 'normal';
    this.weather = settings.weather || 'clear';
    this.onEvent = opts.onEvent || (() => {});
    this.equippedPlays = Array.isArray(opts.plays) ? opts.plays : [];
    this.aiSpeed = { easy: 0.93, normal: 1, hard: 1.055 }[this.difficulty] || 1;
    this.aiSkill = { easy: 0.8, normal: 1, hard: 1.14 }[this.difficulty] || 1;

    const home = makeTeam(homeData, 1, true);
    const away = makeTeam(awayData, -1, false);
    home.match = this;
    away.match = this;
    this.teams = [home, away];
    this.userTeam = home;
    this.opponentTeam = away;

    this.ball = {
      x: 50, y: 35, z: 0.25, vx: 0, vy: 0, vz: 0,
      state: 'held', owner: null, target: null, passFrom: null,
      lastKicker: null, lastTouchTeam: null, rot: 0, spin: 0,
      passTime: 0, passDur: 0, flight: 0, bounce: 0,
    };

    this.clock = 0;
    this.half = 1;
    this.state = 'kickoff';
    this.controlled = null;
    this.kickCharging = false;
    this.kickPower = 0;
    this.aimAngle = null;
    this.kickoffTeam = home;
    this.firstKickoffTeam = home;
    this.kickoffTimer = 2.2;
    this.kickoffReady = false;
    this.kickoffPromptDone = false;
    this.contact = null;
    this.ruck = null;
    this.setpiece = null;
    this.conversion = null;
    this.tryState = null;
    this.activePlay = null;
    this.playCd = 0;
    this.playBannerTime = 0;
    this.particles = [];
    this.rings = [];
    this.floaters = [];
    this.shake = 0;
    this.flash = 0;
    this.commentaryCd = 0;
    this.trySpot = null;
    this.lastScorer = null;
    this.ended = false;
    this.startDelay = 0;
    this.crowdHushTimer = 0;
    this.lastControlled = null;

    this.resetForKickoff(home);
  }

  emit(type, data = {}) {
    try { this.onEvent(type, data); } catch (e) { console.warn(e); }
  }

  // ------------------------------------------------------------
  // lifecycle & formations
  // ------------------------------------------------------------
  resetForKickoff(kickTeam) {
    this.state = 'kickoff';
    this.contact = null;
    this.ruck = null;
    this.setpiece = null;
    this.conversion = null;
    this.tryState = null;
    this.activePlay = null;
    this.kickCharging = false;
    this.kickPower = 0;
    this.aimAngle = null;
    this.kickoffTimer = 2.2;
    this.kickoffReady = false;
    this.kickoffPromptDone = false;
    this.kickoffTeam = kickTeam;
    this.playCd = 0;
    this.trySpot = null;
    this.ball.state = 'held';
    this.ball.owner = null;
    this.ball.target = null;
    this.ball.passFrom = null;
    this.ball.vx = this.ball.vy = this.ball.vz = 0;
    this.ball.z = 0.25;
    this.ball.x = 50;
    this.ball.y = 35;

    for (const team of this.teams) {
      const base = [
        [10, 14], [16, 56], [22, 28], [28, 46],
        [34, 17], [41, 59], [45, 38],
      ];
      team.players.forEach((p, i) => {
        let x = team.dir > 0 ? base[i][0] : 100 - base[i][0];
        let y = base[i][1];
        p.resetAt(x, y);
      });
      // keep stamina fatigue between restarts but never fully empty
      team.players.forEach((p) => {
        p.stamina = Math.max(p.stamina, p.staminaMax * 0.25);
      });
      this.trySubstitution(team);
    }

    const kicker = this.bestKicker(kickTeam);
    kicker.resetAt(50 - kickTeam.dir * 0.9, 35);
    kicker.facing = kickTeam.dir > 0 ? 0 : Math.PI;
    this.ball.owner = kicker;
    this.ball.lastTouchTeam = kickTeam;
    this.controlled = kickTeam.isUser ? kicker : nearestOf(this.userTeam.players, 50, 35).player;
    if (this.controlled) this.controlled.facing = this.userTeam.dir > 0 ? 0 : Math.PI;
    this.emit('kickoff', { team: kickTeam, half: this.half });
    this.emit('score', { home: this.teams[0].score, away: this.teams[1].score });
  }

  bestKicker(team) {
    const order = { flyhalf: 0, scrumhalf: 1, centre: 2, winger: 3, utility: 4, back: 5, flanker: 6, hooker: 7, prop: 8, forward: 9 };
    return team.players.slice().sort((a, b) => {
      const pa = (order[a.position] ?? 5) - a.stats.kicking * 0.8;
      const pb = (order[b.position] ?? 5) - b.stats.kicking * 0.8;
      return pa - pb;
    })[0];
  }

  trySubstitution(team) {
    if (!team.bench.length) return;
    const tired = team.players
      .filter((p) => p.state === 'run' && p.stamina < p.staminaMax * 0.28)
      .sort((a, b) => a.stamina - b.stamina)[0];
    if (!tired) return;
    const fresh = team.bench.slice().sort((a, b) => b.stamina - a.stamina)[0];
    if (!fresh || fresh.stamina < 55) return;
    const idx = team.players.indexOf(tired);
    if (idx < 0) return;
    fresh.bench = false;
    fresh.resetAt(tired.x, tired.y);
    fresh.stamina = Math.max(fresh.stamina, fresh.staminaMax * 0.9);
    team.players[idx] = fresh;
    team.bench.splice(team.bench.indexOf(fresh), 1);
    team.subbed.push(tired);
    if (team.isUser) {
      this.emit('toast', { text: `SUB — ${fresh.name.toUpperCase()} ON`, kind: 'small' });
      this.emit('commentary', { text: `Fresh legs: ${fresh.name} replaces ${tired.name}.` });
    }
    if (this.controlled === tired) this.controlled = fresh;
  }

  startSecondHalf() {
    if (this.half !== 1) return;
    this.half = 2;
    for (const t of this.teams) t.dir *= -1;
    for (const t of this.teams) {
      t.players.forEach((p) => {
        p.stamina = Math.min(p.staminaMax, p.stamina + p.staminaMax * 0.45);
      });
    }
    const kicker = this.teams.find((t) => t !== this.firstKickoffTeam) || this.teams[1];
    this.emit('toast', { text: 'SECOND HALF', kind: 'small' });
    this.resetForKickoff(kicker);
    audio.whistle(true);
  }

  endHalf() {
    if (this.state === 'halftime' || this.state === 'fulltime') return;
    this.state = 'halftime';
    this.clock = this.halfLength;
    this.controlled = null;
    this.kickCharging = false;
    audio.whistle(true);
    audio.crowdSwell(0.22, 2.4);
    this.emit('halftime', this.buildSnapshot());
  }

  finishMatch() {
    if (this.state === 'fulltime') return;
    this.state = 'fulltime';
    this.controlled = null;
    this.ended = true;
    audio.whistle(true);
    audio.crowdSwell(0.3, 4);
    this.emit('fulltime', this.buildResults());
  }

  buildSnapshot() {
    return {
      clock: this.clock,
      half: this.half,
      teams: this.teams.map((t) => ({
        name: t.name, abbr: t.abbr, score: t.score,
        colors: t.colors, stats: { ...t.stats }, isUser: t.isUser,
      })),
    };
  }

  buildResults() {
    const all = [];
    for (const team of this.teams) {
      for (const p of [...team.players, ...team.bench, ...team.subbed]) {
        const impact = p.ms.tries * 24 + p.ms.tackles * 3 + p.ms.meters * 0.18 + p.ms.passes * 0.9 + p.ms.turnovers * 6 + p.ms.kicks * 0.7;
        all.push({ player: p, team, impact });
      }
    }
    all.sort((a, b) => b.impact - a.impact);
    const top = all[0];
    const motm = top ? {
      name: top.player.name,
      number: top.player.number,
      team: top.team.name,
      isUser: top.team.isUser,
      tries: top.player.ms.tries,
      tackles: top.player.ms.tackles,
      meters: Math.round(top.player.ms.meters),
      rating: Math.min(10, Math.round((6.4 + top.impact / 28) * 10) / 10),
      position: top.player.position,
    } : null;
    const home = this.teams[0];
    const away = this.teams[1];
    const winner = home.score > away.score ? 'home' : away.score > home.score ? 'away' : 'draw';
    return {
      clock: this.clock,
      half: this.half,
      winner,
      motm,
      teams: this.teams.map((t) => ({
        name: t.name, abbr: t.abbr, score: t.score, colors: t.colors,
        stats: { ...t.stats }, isUser: t.isUser,
        squad: [...t.players, ...t.subbed].map((p) => ({
          name: p.name, number: p.number, tries: p.ms.tries,
          tackles: p.ms.tackles, meters: Math.round(p.ms.meters),
        })),
      })),
    };
  }

  // ------------------------------------------------------------
  // main loop
  // ------------------------------------------------------------
  update(dt) {
    dt = Math.min(dt, 0.05);
    this.playCd = Math.max(0, this.playCd - dt);
    this.controlLock = Math.max(0, (this.controlLock || 0) - dt);
    this.updateFx(dt);

    if (this.state === 'halftime' || this.state === 'fulltime' || this.state === 'paused') return;

    if (['play', 'ruck', 'contact'].includes(this.state)) {
      this.clock += dt;
      if (this.clock >= this.halfLength * this.half) {
        if (this.half === 1) { this.endHalf(); return; }
        this.finishMatch();
        return;
      }
    }

    this.handleStateInput();

    switch (this.state) {
      case 'kickoff': this.updateKickoff(dt); break;
      case 'play': this.updatePlay(dt); break;
      case 'contact': this.updateContact(dt); break;
      case 'ruck': this.updateRuck(dt); break;
      case 'lineout':
      case 'scrum': this.updateSetPiece(dt); break;
      case 'try': this.updateTry(dt); break;
      case 'conversion': this.updateConversion(dt); break;
      default: break;
    }

    if (this.teamHasBall() && this.ball.owner) {
      this.ball.owner.team.stats.possession += dt * 0.6;
    }
  }

  teamHasBall() {
    return this.ball.state === 'held' && this.ball.owner;
  }

  // ------------------------------------------------------------
  // kickoff
  // ------------------------------------------------------------
  updateKickoff(dt) {
    this.kickoffTimer -= dt;
    const kicker = this.ball.owner;
    for (const team of this.teams) {
      for (const p of team.players) {
        p.runPhase += dt * 0.5;
        p.vx *= 0.9;
        p.vy *= 0.9;
      }
    }
    if (kicker) {
      this.ball.x = kicker.x + kicker.team.dir * 0.55;
      this.ball.y = kicker.y;
    }
    if (this.kickoffTimer < 0.45 && !this.kickoffPromptDone) {
      this.kickoffPromptDone = true;
      this.emit('toast', { text: 'KICK OFF', kind: 'small' });
      this.emit('commentary', { text: 'The whistle goes. We are under way.' });
    }
    if (this.kickoffTimer > 0) return;

    if (this.kickoffTeam.isUser && kicker) {
      const axis = input.axis();
      if ((input.down('kick') || input.pressed('kick')) && kicker.kickCd <= 0) {
        if (!this.kickCharging) {
          this.kickCharging = true;
          this.kickPower = 0.06;
          this.aimAngle = axis.magnitude > 0.2 ? angleOf(axis.x, axis.y) : kicker.team.dir > 0 ? 0 : Math.PI;
        } else {
          this.kickPower = Math.min(1, this.kickPower + dt / 0.9);
          if (axis.magnitude > 0.2) this.aimAngle = angleOf(axis.x, axis.y);
        }
      }
      if (this.kickCharging && input.released('kick')) {
        this.kickoffKick();
        return;
      }
      if (this.kickoffTimer < -3.2) this.kickoffKick(true);
    } else if (this.kickoffTimer < -1.2) {
      this.kickoffKick(true);
    }
  }

  kickoffKick(auto = false) {
    const kicker = this.ball.owner;
    if (!kicker) return;
    let angle;
    let power;
    if (auto) {
      const targetY = pick([10, 60]);
      angle = angleOf(kicker.team.dir * 38, targetY - 35);
      power = 0.84;
    } else {
      angle = this.aimAngle ?? (kicker.team.dir > 0 ? 0 : Math.PI);
      power = clamp(this.kickPower, 0.2, 1);
      const dot = Math.cos(angle) * kicker.team.dir;
      if (dot < 0.3) angle = kicker.team.dir > 0 ? 0 : Math.PI;
    }
    const txt = auto ? 'The kick-off is launched deep.' : 'Kick-off! Here we go.';
    this.launchKick(kicker, angle, power, { kickoff: true });
    this.state = 'play';
    this.kickCharging = false;
    this.kickPower = 0;
    this.aimAngle = null;
    this.emit('commentary', { text: txt });
    this.forceControlSwitch();
  }

  // ------------------------------------------------------------
  // input orchestration
  // ------------------------------------------------------------
  handleStateInput() {
    if (this.state === 'play') {
      for (let i = 0; i < 4; i++) {
        if (input.pressed(`tactic${i + 1}`)) this.triggerPlay(i);
      }
    }
    if (this.state === 'ruck' && this.ruck) {
      const attack = this.userTeam === this.ruck.atk;
      if (input.pressed('pass') || input.pressed('tackle') || input.pressed('kick')) {
        this.ruck.tug += attack ? 0.075 : -0.075;
        audio.ui();
        this.addFloater(this.ruck.x, this.ruck.y - 2, attack ? 'DRIVE' : 'JACKAL', attack ? '#d8f36a' : '#ff8b7f', 0.7);
      }
    }
    if (this.setpiece && (this.state === 'lineout' || this.state === 'scrum')) {
      const sp = this.setpiece;
      if (sp.phase === 'timing') {
        if (input.pressed('tackle') || input.pressed('pass') || input.pressed('kick')) {
          this.stopSetpieceBar();
        }
      }
    }
    if (this.state === 'conversion' && this.conversion && !this.conversion.locked) {
      if (input.pressed('kick') || input.pressed('tackle')) {
        this.lockConversion();
      }
    }
    if (this.state === 'contact' && this.contact && this.contact.carrier.team.isUser) {
      if (input.pressed('offload')) this.offload(this.contact.carrier);
    }
  }

  ensureControl() {
    const userHasBall = this.ball.owner && this.ball.owner.team === this.userTeam;
    if (userHasBall) {
      if (this.state === 'contact' && this.contact) return;
      this.controlled = this.ball.owner;
      return;
    }
    if (this.controlLock > 0) return;
    const cur = this.controlled;
    const need =
      !cur ||
      cur.bench ||
      cur.state === 'down' ||
      cur.state === 'stunned' ||
      cur.state === 'getup' ||
      dist(cur.x, cur.y, this.ball.x, this.ball.y) > 26;
    if (need) this.forceControlSwitch();
  }

  forceControlSwitch() {
    const pool = this.userTeam.players.filter((p) => p.state !== 'down' && p.state !== 'bench');
    if (!pool.length) return;
    const nearest = nearestOf(pool, this.ball.x, this.ball.y).player;
    if (nearest) {
      this.controlled = nearest;
      this.controlLock = 0.7;
    }
  }

  switchControlled() {
    const pool = this.userTeam.players
      .filter((p) => p.state === 'run' || p.state === 'dive')
      .sort((a, b) => dist2(a.x, a.y, this.ball.x, this.ball.y) - dist2(b.x, b.y, this.ball.x, this.ball.y));
    if (!pool.length) return;
    const idx = pool.indexOf(this.controlled);
    this.controlled = pool[(idx + 1) % pool.length];
    this.controlLock = 1.0;
    audio.ui();
    this.addFloater(this.controlled.x, this.controlled.y - 2, 'SWITCH', '#f5f0e3', 0.5);
  }

  handleUserInput(dt) {
    const p = this.controlled;
    if (!p || p.team !== this.userTeam || p.state !== 'run') return;
    const axis = input.axis();
    const userHasBall = this.ball.owner && this.ball.owner.team === this.userTeam;
    const isCarrier = this.ball.owner === p;
    if (this.kickCharging) {
      p.mx = axis.x * 0.45;
      p.my = axis.y * 0.45;
      p.sprintReq = false;
    } else {
      p.mx = axis.x;
      p.my = axis.y;
      p.sprintReq = input.down('sprint');
    }
    if (this.state !== 'play') return;

    if (isCarrier) {
      if (input.pressed('pass') && !this.kickCharging) this.passBall(p);
      if (input.pressed('tackle') && !this.kickCharging) this.sidestepPlayer(p, axis);
      if (p.kickCd <= 0 && (input.down('kick') || input.pressed('kick'))) {
        if (!this.kickCharging) {
          this.kickCharging = true;
          this.kickPower = 0.05;
          this.aimAngle = axis.magnitude > 0.2 ? angleOf(axis.x, axis.y) : p.facing;
        } else {
          this.kickPower = Math.min(1, this.kickPower + dt / 0.9);
          if (axis.magnitude > 0.2) this.aimAngle = angleOf(axis.x, axis.y);
        }
      }
      if (this.kickCharging && input.released('kick')) {
        const power = clamp(this.kickPower, 0.05, 1);
        const angle = this.aimAngle ?? p.facing;
        this.kickBall(p, power, angle);
      }
    } else if (!userHasBall) {
      if (input.pressed('tackle') && p.tackleCd <= 0) this.startDive(p);
      if (input.pressed('switch')) this.switchControlled();
    }
  }

  // ------------------------------------------------------------
  // open play
  // ------------------------------------------------------------
  updatePlay(dt) {
    this.ensureControl();
    this.handleUserInput(dt);
    this.runAI(dt);
    this.updateActivePlay(dt);
    this.updatePlayers(dt);
    this.separatePlayers();
    this.checkTackles(dt);
    this.updateBall(dt);
    this.checkFieldEvents();
  }

  updatePlayers(dt) {
    for (const team of this.teams) {
      for (const p of team.players) {
        p.invuln = Math.max(0, p.invuln - dt);
        p.tackleCd = Math.max(0, p.tackleCd - dt);
        p.sidestepCd = Math.max(0, p.sidestepCd - dt);
        p.sidestep = Math.max(0, p.sidestep - dt);
        p.speedBoost = Math.max(0, p.speedBoost - dt);
        p.pickupCd = Math.max(0, p.pickupCd - dt);
        p.kickCd = Math.max(0, p.kickCd - dt);
        p.celebrate = Math.max(0, p.celebrate - dt);

        if (p.state === 'dive') {
          p.diveTimer -= dt;
          const sp = 10.2;
          p.vx = Math.cos(p.diveAngle) * sp;
          p.vy = Math.sin(p.diveAngle) * sp;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.runPhase += dt * 10;
          if (p.diveTimer <= 0) {
            p.state = 'run';
            p.vx *= 0.2;
            p.vy *= 0.2;
          }
          clampToField(p);
          continue;
        }
        if (p.state === 'down') {
          p.downTimer -= dt;
          p.vx = 0; p.vy = 0;
          if (p.downTimer <= 0) {
            p.state = 'getup';
            p.getupTimer = 0.42;
          }
          continue;
        }
        if (p.state === 'getup') {
          p.getupTimer -= dt;
          p.vx = 0; p.vy = 0;
          if (p.getupTimer <= 0) { p.state = 'run'; p.invuln = 0.25; }
          continue;
        }
        if (p.state === 'stunned') {
          p.stunTimer -= dt;
          p.vx *= 0.85; p.vy *= 0.85;
          if (p.stunTimer <= 0) p.state = 'run';
          continue;
        }
        if (p.state !== 'run') continue;

        if (p.scripted && p.route) this.followRoute(p, dt);

        let dx = p.mx;
        let dy = p.my;
        const mag = Math.hypot(dx, dy);
        if (mag > 1) { dx /= mag; dy /= mag; }
        const moving = Math.hypot(dx, dy) > 0.08;

        const fatigue = 0.775 + 0.225 * (p.stamina / p.staminaMax);
        let sp = p.speedBase * fatigue;
        if (!p.team.isUser) sp *= this.aiSpeed;
        const canSprint = p.sprintReq && p.stamina > 1.5 && moving;
        if (canSprint) sp *= 1.24;
        if (p.speedBoost > 0) sp *= 1.11;
        if (p === this.ball.owner) sp *= 0.965;
        if (this.kickCharging && p === this.controlled && p.team.isUser) sp *= 0.55;

        const accel = 34;
        const tvx = dx * sp;
        const tvy = dy * sp;
        p.vx += clamp(tvx - p.vx, -accel * dt, accel * dt);
        p.vy += clamp(tvy - p.vy, -accel * dt, accel * dt);
        if (!moving && Math.hypot(p.vx, p.vy) < 0.4) { p.vx *= 0.8; p.vy *= 0.8; }
        const realSpeed = Math.hypot(p.vx, p.vy);
        if (realSpeed > 0.2) {
          p.facing = angleLerp(p.facing, angleOf(p.vx, p.vy), Math.min(1, 14 * dt));
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.runPhase += realSpeed * dt * 2.5;

        if (canSprint) p.stamina -= 6.4 * dt;
        else if (moving) p.stamina -= 1.15 * dt;
        else p.stamina += 6.2 * dt * (p.trait === 'engine' ? 1.3 : 1);
        p.stamina = clamp(p.stamina, 0, p.staminaMax);

        if (p === this.ball.owner && this.ball.state === 'held') {
          const forward = (p.x - p.prevX) * p.team.dir;
          if (forward > 0) {
            p.ms.meters += forward;
            p.team.stats.meters += forward;
          }
        }
        p.prevX = p.x;
        clampToField(p);
        p.mx = 0;
        p.my = 0;
      }
    }
  }

  followRoute(p, dt) {
    const pt = p.route[p.routeIndex];
    if (!pt) { p.scripted = false; p.route = null; return; }
    const dx = pt.x - p.x;
    const dy = pt.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.85) {
      p.routeIndex++;
      if (p.routeIndex >= p.route.length) {
        p.scripted = false;
        p.route = null;
        p.sprintReq = false;
      }
      return;
    }
    p.mx = dx / d;
    p.my = dy / d;
    p.sprintReq = true;
    p.scriptTime += dt;
  }

  separatePlayers() {
    const all = [...this.teams[0].players, ...this.teams[1].players].filter((p) => p.state === 'run' || p.state === 'dive' || p.state === 'getup');
    for (let iter = 0; iter < 2; iter++) {
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const a = all[i], b = all[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy);
          const minD = 1.02;
          if (d > 0.001 && d < minD) {
            const push = (minD - d) * 0.5;
            const nx = dx / d, ny = dy / d;
            a.x -= nx * push;
            a.y -= ny * push;
            b.x += nx * push;
            b.y += ny * push;
            clampToField(a);
            clampToField(b);
          }
        }
      }
    }
  }

  checkTackles(dt) {
    if (this.state !== 'play' || this.ball.state !== 'held') return;
    const carrier = this.ball.owner;
    if (!carrier || carrier.state !== 'run' || carrier.invuln > 0) return;
    const defenders = this.teams.find((t) => t !== carrier.team).players;
    for (const d of defenders) {
      if (d.state === 'down' || d.state === 'getup' || d.state === 'stunned') continue;
      const dd = dist(d.x, d.y, carrier.x, carrier.y);
      if (d.state === 'dive' && dd < 1.55) {
        this.resolveTackle(d, carrier, true);
        return;
      }
      if (d.state === 'run' && dd < 1.02 && d.tackleCd <= 0) {
        d.tackleCd = 0.85;
        this.resolveTackle(d, carrier, false);
        return;
      }
    }
  }

  startDive(p) {
    if (!p || p.state !== 'run' || p.tackleCd > 0) return;
    const target = this.ball.owner && this.ball.owner.team !== p.team ? this.ball.owner : null;
    const tx = target ? target.x + target.vx * 0.12 : this.ball.x;
    const ty = target ? target.y + target.vy * 0.12 : this.ball.y;
    p.state = 'dive';
    p.diveTimer = 0.38;
    p.diveAngle = angleOf(tx - p.x, ty - p.y);
    p.tackleCd = 1.35;
    p.stamina = Math.max(0, p.stamina - 2.5);
    audio.pass();
    this.addParticles(p.x, p.y, 4, { color: '#b9a77a', speed: 1.6, size: 0.12, life: 0.4, type: 'dust' });
  }

  sidestepPlayer(p, axis) {
    if (p.sidestepCd > 0 || p.stamina < 5) return;
    p.sidestep = 0.5;
    p.sidestepCd = 2.2;
    p.stamina = Math.max(0, p.stamina - 8);
    p.speedBoost = Math.max(p.speedBoost, 0.35);
    const lateral = Math.abs(axis.x) > 0.2 ? (axis.x > 0 ? 1 : -1) : (Math.random() < 0.5 ? 1 : -1);
    p.vx += lateral * 2.4;
    p.vy += (Math.random() - 0.5) * 1.5;
    audio.pass();
    const color = '#d8f36a';
    this.addRing(p.x, p.y, 0.4, 2.0, color);
    this.addParticles(p.x, p.y, 7, { color, speed: 2.4, size: 0.14, life: 0.45, type: 'spark' });
  }

  resolveTackle(defender, carrier, isDive) {
    if (carrier.invuln > 0 || this.state !== 'play') return;
    const handling = carrier.stats.handling;
    const strength = carrier.stats.strength;
    let success =
      0.62 +
      defender.stats.tackling * 0.03 +
      defender.stats.strength * 0.006 -
      handling * 0.013 -
      strength * 0.012 +
      (isDive ? 0.09 : 0) +
      (defender.trait === 'enforcer' ? 0.08 : 0);
    if (carrier.sidestep > 0) success -= 0.28;
    if (carrier.trait === 'magician' && carrier.sidestep > 0) success -= 0.09;
    if (carrier.speedBoost > 0) success -= 0.04;
    if (this.weather === 'rain') success -= 0.025;
    success = clamp(success, 0.05, 0.94);

    if (Math.random() > success) {
      carrier.invuln = 0.85;
      carrier.speedBoost = Math.max(carrier.speedBoost, 1.1);
      defender.state = 'stunned';
      defender.stunTimer = 0.75;
      defender.vx = 0; defender.vy = 0;
      carrier.team.stats.turnovers += 0;
      if (carrier.team.isUser) this.emit('toast', { text: 'BROKEN TACKLE!', kind: 'small' });
      this.emit('commentary', { text: pick(['Broken tackle! He is away!', 'Slipped through the fingers!', 'The tackle does not stick!']) });
      this.addFloater(carrier.x, carrier.y - 2.5, 'BROKEN!', '#d8f36a', 1.1);
      this.addRing(carrier.x, carrier.y, 0.4, 2.4, '#d8f36a');
      this.addParticles(carrier.x, carrier.y, 10, { color: '#d8f36a', speed: 3, size: 0.14, life: 0.5, type: 'spark' });
      audio.tackle(false);
      return;
    }

    const big = defender.stats.strength >= 8 && (isDive || defender.sprintReq) && chance(0.35);
    carrier.state = 'down';
    carrier.downTimer = 1.05;
    carrier.vx = 0; carrier.vy = 0;
    carrier.sidestep = 0;
    defender.state = 'getup';
    defender.getupTimer = 0.42;
    defender.vx = 0; defender.vy = 0;
    defender.stats.tackling = defender.stats.tackling;

    defender.ms.tackles++;
    defender.team.stats.tackles++;
    carrier.team.stats.possession += 0;

    this.ball.owner = carrier;
    this.ball.state = 'held';
    this.contact = {
      carrier,
      defender,
      timer: 0.55,
      total: 0.55,
      big,
      spot: { x: carrier.x, y: carrier.y },
      offloadDone: false,
      aiOffloadChecked: false,
    };
    this.state = 'contact';
    this.kickCharging = false;
    this.kickPower = 0;
    this.aimAngle = null;

    if (big) {
      this.emit('toast', { text: 'BIG HIT!', kind: 'small' });
      this.addFloater(carrier.x, carrier.y - 2.6, 'BIG HIT', '#ff8b7f', 1.1);
      this.addRing(carrier.x, carrier.y, 0.6, 3.6, '#ffb199');
      this.addParticles(carrier.x, carrier.y, 14, { color: '#f5f0e3', speed: 3.6, size: 0.16, life: 0.55, type: 'spark' });
      this.shake = Math.max(this.shake, 0.55);
      audio.tackle(true);
      this.emit('commentary', { text: pick(['OH! What a collision!', 'A monster hit in midfield!', 'That is a huge tackle!']) });
    } else {
      this.addRing(carrier.x, carrier.y, 0.5, 2.4, 'rgba(245,240,227,0.7)');
      this.addParticles(carrier.x, carrier.y, 8, { color: '#c9bb9a', speed: 2.4, size: 0.14, life: 0.5, type: 'dust' });
      this.shake = Math.max(this.shake, 0.22);
      audio.tackle(false);
      if (chance(0.3)) this.emit('commentary', { text: pick(['Driven back in the tackle.', 'Textbook tackle in midfield.', 'The defence holds firm.']) });
    }
    if (defender.team.isUser) {
      this.addFloater(defender.x, defender.y - 2.4, 'TACKLE', '#d8f36a', 0.7);
    }
  }

  offload(carrier) {
    if (!this.contact || this.contact.offloadDone) return;
    this.contact.offloadDone = true;
    const ok = this.passBall(carrier, { offload: true });
    if (ok) {
      this.state = 'play';
      this.contact = null;
      carrier.invuln = 0.4;
      this.addFloater(carrier.x, carrier.y - 2.2, 'OFFLOAD!', '#d8f36a', 1);
      this.emit('commentary', { text: 'Great offload in the tackle!' });
    }
  }

  updateContact(dt) {
    if (!this.contact) { this.state = 'play'; return; }
    const c = this.contact;
    c.timer -= dt;
    this.ball.x = c.carrier.x;
    this.ball.y = c.carrier.y;
    this.ball.z = 0.3;
    if (!c.offloadDone && c.carrier.team.isUser && input.pressed('offload')) {
      this.offload(c.carrier);
      return;
    }
    if (!c.offloadDone && !c.carrier.team.isUser && !c.aiOffloadChecked && c.timer < 0.35) {
      c.aiOffloadChecked = true;
      const chanceOffload = 0.12 + c.carrier.stats.handling * 0.026;
      if (Math.random() < chanceOffload) {
        this.offload(c.carrier);
        return;
      }
    }
    if (c.timer <= 0) this.startRuck();
  }

  startRuck() {
    const c = this.contact;
    if (!c) { this.state = 'play'; return; }
    const carrier = c.carrier;
    const atk = carrier.team;
    const def = this.teams.find((t) => t !== atk);
    const active = (p) => p.state === 'run' || p.state === 'dive' || p.state === 'getup';
    const atkSupport = atk.players.filter((p) => p !== carrier && active(p) && dist(p.x, p.y, carrier.x, carrier.y) < 9).length;
    const defSupport = def.players.filter((p) => active(p) && dist(p.x, p.y, carrier.x, carrier.y) < 9).length;
    const handling = atk.players.reduce((s, p) => s + p.stats.handling, 0) / atk.players.length;
    const tackling = def.players.reduce((s, p) => s + p.stats.tackling, 0) / def.players.length;
    const initial = clamp((atkSupport - defSupport) * 0.17 + (handling - tackling) * 0.025 + rand(-0.16, 0.16), -0.85, 0.85);
    this.ruck = {
      x: carrier.x, y: carrier.y,
      timer: 1.15, total: 1.15, tug: initial,
      atk, def, atkSupport, defSupport, resolved: false,
    };
    this.ball.state = 'ruck';
    this.ball.owner = null;
    this.ball.x = carrier.x;
    this.ball.y = carrier.y;
    this.ball.z = 0.2;
    this.state = 'ruck';
    this.contact = null;
    this.addRing(carrier.x, carrier.y, 0.5, 2.2, 'rgba(216,243,106,0.4)');
    this.addParticles(carrier.x, carrier.y, 5, { color: '#b9a77a', speed: 1.2, size: 0.12, life: 0.6, type: 'dust' });
    if (atk.isUser || def.isUser) {
      this.emit('commentary', { text: atkSupport > defSupport ? 'The support arrives first. Quick ball.' : 'The defence is over the ball. Contest!' });
    }
  }

  updateRuck(dt) {
    const r = this.ruck;
    if (!r) { this.state = 'play'; return; }
    r.timer -= dt;
    r.tug += (Math.random() - 0.5) * dt * 0.24;
    r.tug = clamp(r.tug, -1, 1);
    if (r.timer > 0) return;

    const atkWins = r.tug >= 0;
    const winner = atkWins ? r.atk : r.def;
    const loser = atkWins ? r.def : r.atk;
    winner.stats.turnovers += atkWins ? 0 : 1;
    if (!atkWins) {
      this.addFloater(r.x, r.y - 2.7, 'TURNOVER!', '#ff8b7f', 1.3);
      this.emit('toast', { text: 'TURNOVER!', kind: 'small' });
      this.emit('commentary', { text: pick(['Stolen at the ruck!', 'Turnover! Great work at the breakdown.', 'The jackal gets the reward!']) });
      audio.positive();
      this.shake = Math.max(this.shake, 0.25);
    } else {
      if (winner.isUser) this.addFloater(r.x, r.y - 2.5, 'QUICK BALL', '#d8f36a', 0.8);
      if (chance(0.45)) this.emit('commentary', { text: pick(['Quick ball from the ruck.', 'Recycled cleanly.', 'The pack secures it.']) });
    }

    const pool = winner.players.filter((p) => p.state === 'run' || p.state === 'dive' || p.state === 'getup');
    const receiver = nearestOf(pool, r.x, r.y).player || winner.players[0];
    receiver.state = 'run';
    receiver.invuln = 0.9;
    receiver.x = clamp(r.x - winner.dir * 1.2, FIELD.minX + 1, FIELD.maxX - 1);
    receiver.y = clamp(r.y, 1, FIELD.maxY - 1);
    receiver.vx = 0; receiver.vy = 0;
    receiver.sprintReq = false;
    this.ball.state = 'held';
    this.ball.owner = receiver;
    this.ball.lastTouchTeam = winner;
    this.ball.z = 0.25;
    receiver.ms.passes += 0;
    for (const p of loser.players) {
      if (p.state === 'down') p.downTimer = Math.min(p.downTimer, 0.3);
    }
    this.ruck = null;
    this.state = 'play';
    this.controlLock = 0.3;
    if (winner.isUser) this.controlled = receiver;
    else this.forceControlSwitch();
    this.tryPlayReset();
  }

  // ------------------------------------------------------------
  // passing & kicking
  // ------------------------------------------------------------
  passBall(carrier, opts = {}) {
    if (!carrier || this.ball.owner !== carrier) return false;
    const team = carrier.team;
    const dir = team.dir;
    const axis = input.axis();
    const range = 23 + (carrier.trait === 'playmaker' ? 4 : 0);
    const candidates = [];
    for (const p of team.players) {
      if (p === carrier || p.state !== 'run' || p.bench) continue;
      const dx = p.x - carrier.x;
      const dy = p.y - carrier.y;
      const d = Math.hypot(dx, dy);
      const relX = dx * dir;
      if (!opts.force && relX > 1.4) continue;
      if (d < 2.2 || d > (opts.force ? 42 : range)) continue;
      const opp = nearestOf(this.teams.find((t) => t !== team).players, p.x, p.y).dist;
      let score = 20 - d * 0.18 - Math.abs(relX) * 0.2 + opp * 1.25;
      if (relX < -1) score += 3.5;
      if (p.stats.handling >= 8) score += 1;
      if (axis.magnitude > 0.25) {
        const dot = (dx * axis.x + dy * axis.y) / (d || 1);
        score += dot * 4;
      }
      if (opts.target && p === opts.target) score += 1000;
      candidates.push({ p, score, d, relX });
    }
    if (!candidates.length) {
      if (carrier.team.isUser && !opts.silent) {
        this.emit('toast', { text: 'NO PASS OPTION', kind: 'small bad' });
      }
      return false;
    }
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    const receiver = best.p;

    // forward-pass rule for open play (set plays are timed flat)
    if (!opts.force && best.relX > 1.2) {
      this.emit('commentary', { text: 'Forward pass! The scrum is awarded.' });
      this.scrumTo(this.teams.find((t) => t !== team), carrier.x, carrier.y, 'FORWARD PASS');
      return true;
    }
    const pressure = nearestOf(this.teams.find((t) => t !== team).players, carrier.x, carrier.y).dist;
    if (!opts.force && pressure < 1.8 && Math.random() < 0.06 - carrier.stats.handling * 0.004) {
      this.knockOn(carrier, 'Knocked on in the tackle.');
      return true;
    }

    const b = this.ball;
    b.state = 'pass';
    b.owner = null;
    b.target = receiver;
    b.passFrom = carrier;
    b.passTime = 0;
    b.passDur = clamp(best.d / 21, 0.16, 0.9);
    b.x = carrier.x;
    b.y = carrier.y;
    b.z = 0.3;
    b.lastTouchTeam = team;
    b.lastKicker = null;
    carrier.ms.passes++;
    team.stats.passes++;
    audio.pass();
    this.addParticles(carrier.x, carrier.y, 3, { color: '#f5f0e3', speed: 1.3, size: 0.09, life: 0.3, type: 'spark' });
    if (team.isUser) this.emit('commentary', { text: opts.offload ? 'Offload keeps it alive.' : 'Good hands. The ball is recycled.' });
    return true;
  }

  kickBall(p, power, angle) {
    if (this.state !== 'play' || this.ball.owner !== p) return;
    const spread = (1 - p.stats.kicking / 13) * (0.055 + power * 0.05) * (this.weather === 'rain' ? 1.5 : 1);
    const finalAngle = angle + rand(-spread, spread);
    this.launchKick(p, finalAngle, power, {});
    this.emit('commentary', { text: power < 0.3 ? 'Cheeky grubber in behind!' : pick(['That is a huge boot!', 'Good territory from the boot.', 'Kicked into space.']) });
  }

  launchKick(p, angle, power, opts = {}) {
    const b = this.ball;
    const dirVec = { x: Math.cos(angle), y: Math.sin(angle) };
    const isGrubber = power < 0.3;
    const speed = isGrubber ? 13 + power * 14 : 14 + power * 25;
    b.state = 'kick';
    b.owner = null;
    b.target = null;
    b.passFrom = null;
    b.x = p.x + dirVec.x * 0.7;
    b.y = p.y + dirVec.y * 0.7;
    b.z = isGrubber ? 0.25 : 0.5;
    b.vx = dirVec.x * speed;
    b.vy = dirVec.y * speed;
    b.vz = isGrubber ? 0.8 : 3.2 + power * 5.6;
    b.rot = rand(0, Math.PI);
    b.spin = -8 - power * 12;
    b.lastKicker = p;
    b.lastTouchTeam = p.team;
    b.flight = 0;
    b.bounce = 0;
    p.ms.kicks++;
    p.team.stats.kicks++;
    p.kickCd = 0.65;
    this.kickCharging = false;
    this.kickPower = 0;
    this.aimAngle = null;
    audio.kick(power);
    this.shake = Math.max(this.shake, 0.12 + power * 0.3);
    this.addRing(p.x, p.y, 0.3, 1.4, 'rgba(245,240,227,0.55)');
    this.addParticles(p.x, p.y, 6, { color: '#c9bb9a', speed: 2.4, size: 0.14, life: 0.4, type: 'dust' });
    if (opts.kickoff) this.emit('commentary', { text: 'The kick-off is away.' });
    this.controlKickChaser(p.team);
  }

  controlKickChaser(team) {
    if (!team.isUser) return;
    const landing = this.predictLanding();
    const pool = team.players.filter((p) => p !== this.ball.lastKicker && p.state === 'run');
    const nearest = nearestOf(pool, landing.x, landing.y).player;
    if (nearest) {
      this.controlled = nearest;
      this.controlLock = 1.2;
    }
  }

  predictLanding() {
    const b = this.ball;
    if (b.state !== 'kick') return { x: b.x, y: b.y };
    const t = b.vz > 0 ? (b.vz + Math.sqrt(Math.max(0, b.vz * b.vz + 2 * G * b.z))) / G : 0;
    return { x: b.x + b.vx * t, y: b.y + b.vy * t };
  }

  knockOn(player, text = 'Knocked on.') {
    this.emit('commentary', { text });
    this.emit('toast', { text: 'KNOCK-ON', kind: 'small bad' });
    this.scrumTo(this.teams.find((t) => t !== player.team), player.x, player.y, 'KNOCK-ON');
  }

  // ------------------------------------------------------------
  // ball physics
  // ------------------------------------------------------------
  updateBall(dt) {
    const b = this.ball;
    b.rot += (b.spin || 0) * dt;
    if (b.state === 'dead' || b.state === 'ruck') return;

    if (b.state === 'held') {
      const o = b.owner;
      if (!o) { b.state = 'loose'; return; }
      b.x = o.x + Math.cos(o.facing) * 0.42;
      b.y = o.y + Math.sin(o.facing) * 0.42;
      b.z = 0.25;
      b.vx = o.vx;
      b.vy = o.vy;
      return;
    }

    if (b.state === 'pass') {
      b.passTime += dt;
      const t = b.target;
      if (!t) { b.state = 'loose'; return; }
      const prog = clamp(b.passTime / Math.max(0.1, b.passDur), 0, 1.2);
      const lx = t.x + t.vx * 0.06;
      const ly = t.y + t.vy * 0.06;
      const dx = lx - b.x, dy = ly - b.y;
      const d = Math.hypot(dx, dy);
      const step = Math.min(d, (14 + prog * 10) * dt * 1.8);
      if (d > 0.01) { b.x += (dx / d) * step; b.y += (dy / d) * step; }
      b.z = 0.3 + Math.sin(clamp(prog, 0, 1) * Math.PI) * 0.55;
      b.spin = -14;
      // interception
      const opps = this.teams.find((team) => team !== t.team).players;
      for (const o of opps) {
        if (o.state === 'down' || o.state === 'getup' || o.state === 'stunned') continue;
        if (dist(o.x, o.y, b.x, b.y) < 1.05 && b.z < 1.4) {
          const pInt = 0.12 + o.stats.handling * 0.025;
          if (chance(pInt)) {
            b.state = 'held';
            b.owner = o;
            b.target = null;
            b.lastTouchTeam = o.team;
            o.pickupCd = 0.4;
            o.team.stats.turnovers++;
            this.emit('toast', { text: 'INTERCEPTED!', kind: 'bad' });
            this.emit('commentary', { text: 'Intercepted! A huge turn of events.' });
            this.addFloater(o.x, o.y - 2.4, 'INTERCEPT!', '#ff8b7f', 1.3);
            this.addRing(o.x, o.y, 0.4, 2.6, '#ff8b7f');
            audio.positive();
            if (o.team.isUser) this.controlled = o;
            else this.forceControlSwitch();
            return;
          }
        }
      }
      if (dist(b.x, b.y, t.x, t.y) < 0.95 || b.passTime > b.passDur + 0.7) {
        b.state = 'held';
        b.owner = t;
        b.target = null;
        b.lastTouchTeam = t.team;
        b.z = 0.25;
        t.pickupCd = 0.35;
        audio.pickup();
        this.addParticles(t.x, t.y, 3, { color: '#f5f0e3', speed: 1.2, size: 0.08, life: 0.3, type: 'spark' });
        if (t.team.isUser) this.controlled = t;
        else this.forceControlSwitch();
      }
      return;
    }

    if (b.state === 'kick' || b.state === 'loose') {
      if (b.state === 'kick') {
        b.flight += dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.z += b.vz * dt;
        b.vz -= G * dt;
        b.vx *= 1 - 0.045 * dt;
        b.vy *= 1 - 0.045 * dt;
        // air catch
        if (b.z < 3.2 && b.z > 0.4 && b.flight > 0.18) {
          const cand = nearestOf([...this.teams[0].players, ...this.teams[1].players], b.x, b.y, (p) => p.state === 'run' && p.pickupCd <= 0);
          if (cand.player && cand.dist < 1.6) {
            const p = cand.player;
            const catchChance = 0.28 + p.stats.handling * 0.045 + (p.trait === 'safehands' ? 0.15 : 0) - (this.weather === 'rain' ? 0.05 : 0);
            if (chance(catchChance)) {
              this.pickUp(p, true);
              return;
            }
          }
        }
        if (b.y < 0 || b.y > FIELD.maxY) {
          b.y = clamp(b.y, 0, FIELD.maxY);
          const throwTeam = this.lineoutThrowTeam();
          this.lineoutTo(throwTeam, clamp(b.x, 5, 95), b.y < 35 ? 0 : 70);
          return;
        }
        if (b.x < FIELD.minX || b.x > FIELD.maxX) {
          this.deadBallRestart(b.x > FIELD.maxX ? 100 : 0);
          return;
        }
        if (b.z <= 0) {
          const inGoal = this.inGoalAt(b.x);
          b.z = 0;
          if (inGoal) {
            b.state = 'loose';
            b.vx *= 0.35;
            b.vy *= 0.35;
            this.checkInGoalGrounding();
            if (this.state !== 'play') return;
            // becomes loose in the in-goal
          }
          if (Math.abs(b.vz) > 2.2 && b.bounce < 1) {
            b.vz = Math.abs(b.vz) * 0.32;
            b.z = 0.02;
            b.bounce++;
          } else {
            b.vz = 0;
          }
          b.vx *= 0.55;
          b.vy *= 0.55;
          const caught = this.tryCatchLanding(inGoal ? 2.8 : 2.2);
          if (caught) return;
          if (Math.abs(b.vz) < 1 && b.bounce >= 1) b.state = 'loose';
          this.addParticles(b.x, b.y, 4, { color: '#c9bb9a', speed: 1.6, size: 0.12, life: 0.4, type: 'dust' });
        }
        return;
      }

      // loose ball
      const speed = Math.hypot(b.vx, b.vy);
      const friction = 3.4;
      if (speed > 0.01) {
        const ns = Math.max(0, speed - friction * dt);
        b.vx = (b.vx / speed) * ns;
        b.vy = (b.vy / speed) * ns;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z = Math.max(0, b.z - 3 * dt);
      b.rot += Math.hypot(b.vx, b.vy) * dt * 1.2;
      if (b.x < FIELD.minX || b.x > FIELD.maxX) {
        this.deadBallRestart(b.x > FIELD.maxX ? 100 : 0);
        return;
      }
      if (b.y < 0 || b.y > FIELD.maxY) {
        const team = this.lineoutThrowTeam();
        this.lineoutTo(team, clamp(b.x, 5, 95), b.y < 35 ? 0 : 70);
        return;
      }
      if (this.inGoalAt(b.x)) {
        this.checkInGoalGrounding();
        if (this.state !== 'play') return;
      }
      const cand = nearestOf([...this.teams[0].players, ...this.teams[1].players], b.x, b.y, (p) => p.state === 'run' && p.pickupCd <= 0);
      if (cand.player && cand.dist < 1.05 && b.z < 0.7) {
        const p = cand.player;
        const chancePick = 0.72 + p.stats.handling * 0.035 + (p.trait === 'safehands' ? 0.1 : 0);
        if (chance(chancePick)) {
          this.pickUp(p);
        } else {
          p.pickupCd = 0.7;
          this.addFloater(p.x, p.y - 2, 'SPILL!', '#ff8b7f', 0.8);
          this.emit('commentary', { text: 'Spilled it! The ball is loose.' });
        }
      }
    }
  }

  tryCatchLanding(radius) {
    const cand = nearestOf([...this.teams[0].players, ...this.teams[1].players], this.ball.x, this.ball.y, (p) => p.state === 'run' && p.pickupCd <= 0);
    if (!cand.player || cand.dist > radius) return false;
    const p = cand.player;
    const catchChance = 0.62 + p.stats.handling * 0.04 + (p.trait === 'safehands' ? 0.14 : 0) - (this.weather === 'rain' ? 0.06 : 0);
    if (chance(catchChance)) {
      this.pickUp(p, true);
      return true;
    }
    p.pickupCd = 0.6;
    this.addFloater(p.x, p.y - 2, 'KNOCK-ON?', '#ff8b7f', 0.7);
    return false;
  }

  pickUp(p, fromAir = false) {
    const b = this.ball;
    b.state = 'held';
    b.owner = p;
    b.target = null;
    b.z = 0.25;
    b.lastTouchTeam = p.team;
    p.pickupCd = 0.4;
    audio.pickup();
    this.addParticles(p.x, p.y, 4, { color: '#f5f0e3', speed: 1.2, size: 0.08, life: 0.3, type: 'spark' });
    if (p.team.isUser) {
      this.controlled = p;
    } else {
      this.forceControlSwitch();
    }
    if (this.inGoalAt(b.x) === p.team) {
      this.scoreTry(p);
      return;
    }
    if (this.ownGoalAt(b.x) === p.team) {
      this.emit('commentary', { text: 'Touched down in the in-goal. Drop-out.' });
      this.deadBallRestart(p.team.dir > 0 ? 0 : 100);
      return;
    }
    if (p.team.isUser && fromAir) this.emit('commentary', { text: `${p.name} claims the high ball.` });
  }

  inGoalAt(x) {
    // returns the team that scores in this in-goal, or null
    if (x > 100 && x < 110) return this.teams.find((t) => t.dir > 0) || null;
    if (x < 0 && x > -10) return this.teams.find((t) => t.dir < 0) || null;
    return null;
  }

  ownGoalAt(x) {
    if (x > 100) return this.teams.find((t) => t.dir < 0) || null;
    if (x < 0) return this.teams.find((t) => t.dir > 0) || null;
    return null;
  }

  checkInGoalGrounding() {
    const scoring = this.inGoalAt(this.ball.x);
    if (!scoring) return;
    const cand = nearestOf([...this.teams[0].players, ...this.teams[1].players], this.ball.x, this.ball.y, (p) => p.state === 'run' && p.pickupCd <= 0);
    if (!cand.player || cand.dist > 1.4) return;
    const p = cand.player;
    if (p.team === scoring) {
      this.pickUp(p);
    } else {
      this.emit('commentary', { text: 'The defender grounds the ball in the in-goal. Drop-out.' });
      this.deadBallRestart(scoring.dir > 0 ? 100 : 0);
    }
  }

  lineoutThrowTeam() {
    const touchTeam = this.ball.lastTouchTeam || (this.ball.owner ? this.ball.owner.team : null);
    if (!touchTeam) return this.teams[0];
    return this.teams.find((t) => t !== touchTeam) || this.teams[0];
  }

  checkFieldEvents() {
    if (this.state !== 'play') return;
    const b = this.ball;
    const holder = b.owner;
    if (!holder || b.state !== 'held') return;
    const line = holder.team.dir > 0 ? FIELD.rightTry : FIELD.leftTry;
    const crossed = holder.team.dir > 0 ? holder.x >= line - 0.1 : holder.x <= line + 0.1;
    if (crossed) {
      this.trySpot = { x: clamp(holder.x, 1, 99), y: clamp(holder.y, 4, 66) };
      this.scoreTry(holder);
      return;
    }
    if (holder.y <= TOUCH || holder.y >= FIELD.maxY - TOUCH) {
      const opp = this.teams.find((t) => t !== holder.team);
      this.emit('commentary', { text: pick(['Into touch. Lineout time.', 'The ball finds the touchline.', 'Out it goes. Lineout.']) });
      this.lineoutTo(opp, clamp(holder.x, 5, 95), holder.y <= TOUCH ? 0 : FIELD.maxY);
    }
  }

  scoreTry(scorer) {
    if (this.state === 'try' || this.state === 'conversion' || this.state === 'fulltime') return;
    const team = scorer.team;
    team.score += 5;
    team.stats.tries++;
    scorer.ms.tries++;
    scorer.ms.points += 5;
    this.lastScorer = scorer;
    this.state = 'try';
    this.tryTimer = 3.0;
    this.ball.state = 'held';
    this.ball.owner = scorer;
    this.ball.lastTouchTeam = team;
    scorer.celebrate = 4;
    scorer.state = 'run';
    scorer.invuln = 5;
    this.controlled = scorer;
    for (const t of this.teams) {
      for (const p of t.players) {
        p.vx = 0;
        p.vy = 0;
        p.sprintReq = false;
      }
    }
    this.shake = Math.max(this.shake, 0.7);
    this.flash = 0.5;
    audio.tryScored();
    this.emit('score', { home: this.teams[0].score, away: this.teams[1].score });
    this.emit('toast', { text: 'TRY!', kind: '' });
    this.emit('commentary', { text: pick(['TRY! What a finish!', 'TRY! The line is broken!', 'That is a superb try!']) });
    this.addFloater(scorer.x, scorer.y - 3, '+5', '#d8f36a', 1.6);
    for (let i = 0; i < 42; i++) {
      this.addParticles(scorer.x + rand(-6, 6), scorer.y + rand(-4, 4), 1, {
        color: pick(['#d8f36a', '#f2c53d', '#f5f0e3', '#6ec7ff', '#ff8b7f']),
        speed: rand(1.5, 5.5), size: rand(0.1, 0.2), life: rand(1.4, 2.8), type: 'confetti', gravity: 1.2,
      });
    }
  }

  updateTry(dt) {
    this.tryTimer -= dt;
    const s = this.lastScorer;
    if (s) {
      s.runPhase += dt * 6;
      this.ball.x = s.x;
      this.ball.y = s.y;
      this.ball.z = 0.25;
    }
    if (this.tryTimer <= 0) this.startConversion(s);
  }

  // ------------------------------------------------------------
  // conversions
  // ------------------------------------------------------------
  startConversion(scorer) {
    if (!scorer) { this.afterScoreRestart(); return; }
    const team = scorer.team;
    const dir = team.dir;
    const lineX = dir > 0 ? FIELD.rightTry : FIELD.leftTry;
    const spot = {
      x: lineX - dir * 0.5,
      y: clamp(this.trySpot?.y ?? scorer.y, 6, 64),
    };
    const kicker = this.bestKicker(team);
    this.state = 'conversion';
    this.conversion = {
      timer: 6.0,
      power: 0.18,
      dir: 1,
      speed: 0.62,
      locked: false,
      resolved: false,
      success: false,
      flight: 0,
      endTimer: 0,
      userKicking: team.isUser,
      kicker,
      spot,
      lineX,
      dirSign: dir,
      postsY: 35,
      distance: Math.abs(spot.y - 35),
      window: 0.075 + kicker.stats.kicking * 0.0065 + (kicker.trait === 'bigboot' ? 0.032 : 0),
      reason: 'TRY',
    };
    this.ball.state = 'held';
    this.ball.owner = kicker;
    this.ball.x = spot.x;
    this.ball.y = spot.y;
    this.ball.z = 0.25;
    // place the kicker and a respectful audience
    kicker.x = clamp(spot.x - dir * 3.4, -8, 108);
    kicker.y = spot.y;
    kicker.facing = dir > 0 ? 0 : Math.PI;
    kicker.state = 'run';
    kicker.vx = kicker.vy = 0;
    const teamPlayers = team.players.filter((p) => p !== kicker);
    teamPlayers.forEach((p, i) => {
      p.x = clamp(lineX - dir * (10 + i * 3.2), -8, 108);
      p.y = clamp(spot.y + (i - 2) * 4.2, 5, 65);
      p.state = 'run';
      p.vx = p.vy = 0;
      p.celebrate = 0;
    });
    const defenders = this.teams.find((t) => t !== team).players;
    defenders.forEach((p, i) => {
      p.x = clamp(lineX + dir * 3.5, -8, 108);
      p.y = clamp(35 + (i - 3) * 7, 5, 65);
      p.state = 'run';
      p.vx = p.vy = 0;
    });
    this.controlled = kicker;
    audio.crowdHush();
    this.emit('banner', { name: 'CONVERSION', small: team.isUser ? 'YOUR KICK' : 'THEIR KICK' });
    this.emit('commentary', { text: `${scorer.name} goes over. ${kicker.name} will take the conversion.` });
  }

  lockConversion() {
    const c = this.conversion;
    if (!c || c.locked) return;
    c.locked = true;
    c.flight = 0;
    c.success = false;
    if (c.userKicking) {
      c.success = Math.abs(c.power - 0.7) <= c.window;
    } else {
      const prob = clamp(
        0.58 + c.kicker.stats.kicking * 0.033 + (c.kicker.trait === 'bigboot' ? 0.07 : 0)
        - c.distance * 0.0045 - (this.difficulty === 'hard' ? 0 : 0.03),
        0.18, 0.96,
      );
      c.success = Math.random() < prob;
    }
    audio.kick(0.55);
    this.shake = Math.max(this.shake, 0.1);
  }

  resolveConversion() {
    const c = this.conversion;
    if (!c || c.resolved) return;
    c.resolved = true;
    c.endTimer = 1.9;
    const team = c.kicker.team;
    if (c.success) {
      team.score += 2;
      team.stats.conversions++;
      c.kicker.ms.points += 2;
      this.emit('toast', { text: 'CONVERSION GOOD', kind: 'small' });
      this.emit('commentary', { text: 'The conversion is good. Two more points.' });
      audio.conversionGood();
      this.addFloater(c.spot.x, c.spot.y - 3, '+2', '#d8f36a', 1.4);
    } else {
      this.emit('toast', { text: 'CONVERSION MISSED', kind: 'small bad' });
      this.emit('commentary', { text: pick(['The conversion drifts wide.', 'No — it stays out.', 'Pushed it. Two points go begging.']) });
      audio.conversionMiss();
    }
    this.emit('score', { home: this.teams[0].score, away: this.teams[1].score });
  }

  updateConversion(dt) {
    const c = this.conversion;
    if (!c) { this.afterScoreRestart(); return; }
    this.shake = Math.max(0, this.shake - dt * 1.5);
    if (!c.locked) {
      c.timer -= dt;
      c.power += c.dir * dt * c.speed;
      if (c.power > 1) { c.power = 1; c.dir = -1; }
      if (c.power < 0) { c.power = 0; c.dir = 1; }
      if (!c.userKicking && c.timer < 4.1) this.lockConversion();
      if (c.timer <= 0) {
        c.locked = true;
        c.success = false;
        c.resolved = false;
        c.flight = 0;
        c.endTimer = 0;
        c.userKicking = false;
        this.emit('commentary', { text: 'He has run out of time. No conversion.' });
      }
      return;
    }
    c.flight += dt;
    if (c.flight >= 0.95 && !c.resolved) {
      this.resolveConversion();
    }
    if (c.resolved) {
      c.endTimer -= dt;
      if (c.endTimer <= 0) this.afterScoreRestart();
    }
  }

  afterScoreRestart() {
    const scorer = this.lastScorer;
    const conceding = scorer ? this.teams.find((t) => t !== scorer.team) : this.teams[1];
    this.conversion = null;
    this.trySpot = null;
    this.lastScorer = null;
    if (this.half === 2 && this.clock >= this.halfLength * 2) {
      this.finishMatch();
      return;
    }
    if (this.half === 1 && this.clock >= this.halfLength) {
      this.endHalf();
      return;
    }
    this.emit('toast', { text: 'KICK OFF', kind: 'small' });
    this.resetForKickoff(conceding);
  }

  deadBallRestart(lineX) {
    if (this.state === 'fulltime') return;
    const defTeam = lineX === 100
      ? this.teams.find((t) => t.dir < 0)
      : this.teams.find((t) => t.dir > 0);
    if (!defTeam) { this.resetForKickoff(this.teams[0]); return; }
    this.state = 'play';
    this.emit('toast', { text: '22 DROP-OUT', kind: 'small' });
    this.emit('commentary', { text: 'Dead ball. We restart with a drop-out on the 22.' });
    this.contact = null;
    this.ruck = null;
    this.conversion = null;
    this.setpiece = null;
    const x = defTeam.dir > 0 ? 22 : 78;
    const y = 35;
    const giver = this.bestKicker(defTeam);
    for (const team of this.teams) {
      team.players.forEach((p, i) => {
        if (team === defTeam) {
          p.resetAt(clamp(x - team.dir * (i * 4 + 2), 2, 98), clamp([20, 28, 36, 44, 52, 60, 32][i], 5, 65));
        } else {
          p.resetAt(clamp(x + team.dir * (14 + i * 5), 2, 98), clamp([12, 22, 32, 42, 52, 62, 35][i], 5, 65));
        }
      });
    }
    giver.resetAt(x, y);
    this.ball.state = 'held';
    this.ball.owner = giver;
    this.ball.x = x;
    this.ball.y = y;
    this.ball.z = 0.25;
    this.ball.lastTouchTeam = defTeam;
    giver.invuln = 1.2;
    this.controlled = defTeam.isUser ? giver : nearestOf(this.userTeam.players, x, y).player;
    this.forceControlSwitch();
    this.emit('score', { home: this.teams[0].score, away: this.teams[1].score });
  }

  // ------------------------------------------------------------
  // set pieces: lineout & scrum
  // ------------------------------------------------------------
  lineoutTo(team, x, y) {
    if (this.state === 'lineout' || this.state === 'scrum' || this.state === 'try' || this.state === 'conversion' || this.state === 'fulltime' || this.state === 'halftime') return;
    const side = y <= 35 ? 0 : FIELD.maxY;
    const inward = side === 0 ? 1 : -1;
    const spot = { x: clamp(x, 12, 88), y: side };
    team.stats.lineouts++;
    this.state = 'lineout';
    this.contact = null;
    this.ruck = null;
    this.setpiece = {
      kind: 'lineout', label: 'LINEOUT', team, opp: this.teams.find((t) => t !== team),
      spot, timer: 2.6, total: 2.6, bar: 0.5, dir: 1, zone: [0.36, 0.66],
      phase: 'timing', quality: null, userContest: null, resolved: false,
      aiStopAt: 1.0 + Math.random() * 0.7, side, inward,
      instruction: team.isUser ? 'TAP PASS / TACKLE IN THE GREEN' : 'TAP TACKLE TO CONTEST',
    };
    this.kickCharging = false;
    this.kickPower = 0;
    this.aimAngle = null;
    this.ball.state = 'set';
    this.ball.x = spot.x;
    this.ball.y = side + inward * 0.8;
    this.ball.z = 0.3;
    this.ball.owner = null;
    this.ball.vx = this.ball.vy = this.ball.vz = 0;

    const thrower = this.pickThrower(team);
    const opp = this.setpiece.opp;

    // thrower at the touchline
    thrower.x = spot.x;
    thrower.y = side + inward * 0.8;
    thrower.facing = angleOf(0, inward);
    thrower.state = 'run';
    thrower.vx = thrower.vy = 0;

    const lineY = side + inward * 5.2;
    const oppLineY = side + inward * 6.4;
    const xs = [-3.2, 0, 3.2];
    const fwds = team.players.filter((p) => p !== thrower).slice(0, 3);
    fwds.forEach((p, i) => {
      p.x = clamp(spot.x + xs[i], 2, 98);
      p.y = clamp(lineY, 1, 69);
      p.state = 'run';
      p.vx = p.vy = 0;
      p.facing = angleOf(0, -inward);
    });
    const backs = team.players.filter((p) => p !== thrower && !fwds.includes(p));
    backs.forEach((p, i) => {
      p.x = clamp(spot.x - team.dir * (6 + i * 3.4), 2, 98);
      p.y = clamp(side + inward * (11.5 + (i % 3) * 2.6), 2, 68);
      p.state = 'run';
      p.vx = p.vy = 0;
    });
    const oppFwds = opp.players.slice(0, 3);
    oppFwds.forEach((p, i) => {
      p.x = clamp(spot.x + xs[i], 2, 98);
      p.y = clamp(oppLineY, 1, 69);
      p.state = 'run';
      p.vx = p.vy = 0;
      p.facing = angleOf(0, -inward);
    });
    const oppBacks = opp.players.slice(3);
    oppBacks.forEach((p, i) => {
      p.x = clamp(spot.x + opp.dir * (7 + i * 3.4), 2, 98);
      p.y = clamp(side + inward * (11.5 + (i % 3) * 2.6), 2, 68);
      p.state = 'run';
      p.vx = p.vy = 0;
    });
    this.controlled = team.isUser ? thrower : nearestOf(this.userTeam.players, spot.x, spot.y).player;
    this.emit('banner', { name: 'LINEOUT', small: team.isUser ? 'YOUR THROW' : 'DEFEND THE THROW' });
    this.emit('commentary', { text: pick(['Into touch. Lineout time.', 'The ball finds the touchline.', 'Lineout. The pack lines up.']) });
    this.emit('toast', { text: 'LINEOUT', kind: 'small' });
  }

  pickThrower(team) {
    return team.players.slice().sort((a, b) => {
      const score = (p) => (p.position === 'hooker' ? 0 : p.position === 'prop' ? 1 : p.position === 'flanker' ? 2 : 4) + (10 - p.stats.handling) * 0.1;
      return score(a) - score(b);
    })[0];
  }

  scrumTo(team, x, y, reason = 'KNOCK-ON') {
    if (this.state === 'lineout' || this.state === 'scrum' || this.state === 'try' || this.state === 'conversion' || this.state === 'fulltime' || this.state === 'halftime') return;
    const spot = { x: clamp(x, 10, 90), y: clamp(y, 8, 62) };
    this.state = 'scrum';
    this.contact = null;
    this.ruck = null;
    this.activePlay = null;
    this.setpiece = {
      kind: 'scrum', label: 'SCRUM', team, opp: this.teams.find((t) => t !== team),
      spot, timer: 2.6, total: 2.6, bar: 0.5, dir: 1, zone: [0.38, 0.66],
      phase: 'timing', quality: null, userContest: null, resolved: false,
      aiStopAt: 1.0 + Math.random() * 0.7,
      instruction: team.isUser ? 'TAP PASS / TACKLE IN THE GREEN' : 'TAP TACKLE TO CONTEST',
      reason,
    };
    team.stats.scrums++;
    this.kickCharging = false;
    this.kickPower = 0;
    this.aimAngle = null;
    this.ball.state = 'set';
    this.ball.x = spot.x;
    this.ball.y = spot.y;
    this.ball.z = 0.25;
    this.ball.owner = null;
    this.ball.vx = this.ball.vy = this.ball.vz = 0;
    this.placeScrum(team, spot);
    this.controlled = team.isUser ? team.players[3] : nearestOf(this.userTeam.players, spot.x, spot.y).player;
    this.emit('banner', { name: 'SCRUM', small: team.isUser ? 'YOUR PUT-IN' : 'DEFEND THE PACK' });
    this.emit('commentary', { text: `${reason}. Scrum to ${team.name}.` });
    this.emit('toast', { text: 'SCRUM', kind: 'small' });
  }

  placeScrum(team, spot) {
    const opp = this.teams.find((t) => t !== team);
    const yOffsets = [-1.5, 0, 1.5];
    const backOffsets = [[5.5, -10], [8.5, 6], [11.5, -18], [14.5, 18]];
    const pitch = (p, x, y, facing) => {
      p.x = clamp(x, 2, 98);
      p.y = clamp(y, 2, 68);
      p.state = 'run';
      p.vx = p.vy = 0;
      p.facing = facing;
    };
    team.players.forEach((p, i) => {
      if (i < 3) pitch(p, spot.x - team.dir * 1.2, spot.y + yOffsets[i], team.dir > 0 ? 0 : Math.PI);
      else if (i === 3) pitch(p, spot.x - team.dir * 3.3, spot.y, team.dir > 0 ? 0 : Math.PI);
      else {
        const [off, lat] = backOffsets[(i - 4) % backOffsets.length];
        pitch(p, spot.x - team.dir * off, spot.y + lat, team.dir > 0 ? 0 : Math.PI);
      }
    });
    opp.players.forEach((p, i) => {
      if (i < 3) pitch(p, spot.x + opp.dir * 1.2, spot.y + yOffsets[i], opp.dir > 0 ? 0 : Math.PI);
      else if (i === 3) pitch(p, spot.x + opp.dir * 3.2, spot.y, opp.dir > 0 ? 0 : Math.PI);
      else {
        const [off, lat] = [[6, -12], [9, 10], [12, -20], [15, 16]][(i - 4) % 4];
        pitch(p, spot.x + opp.dir * off, spot.y + lat, opp.dir > 0 ? 0 : Math.PI);
      }
    });
  }

  stopSetpieceBar() {
    const sp = this.setpiece;
    if (!sp || sp.phase !== 'timing') return;
    sp.phase = 'result';
    sp.timer = 0.95;
    const zoneGood = sp.bar >= sp.zone[0] && sp.bar <= sp.zone[1];
    if (sp.team.isUser) sp.quality = zoneGood;
    else sp.userContest = zoneGood;
    audio.whistle(false);
    this.addRing(sp.spot.x, sp.spot.y, 0.4, 2.2, zoneGood ? '#d8f36a' : '#ff8b7f');
  }

  updateSetPiece(dt) {
    const sp = this.setpiece;
    if (!sp) { this.state = 'play'; return; }
    sp.timer -= dt;
    if (sp.phase === 'timing') {
      sp.bar += sp.dir * dt * 1.55;
      if (sp.bar > 1) { sp.bar = 1; sp.dir = -1; }
      if (sp.bar < 0) { sp.bar = 0; sp.dir = 1; }
      if (!sp.team.isUser && sp.timer <= sp.aiStopAt) {
        this.stopSetpieceBar();
        return;
      }
      if (sp.timer <= 0) this.stopSetpieceBar();
      return;
    }
    if (sp.phase === 'result' && sp.timer <= 0) {
      this.resolveSetPiece();
    }
  }

  resolveSetPiece() {
    const sp = this.setpiece;
    if (!sp) { this.state = 'play'; return; }
    const { team, opp, kind } = sp;
    let winner = team;
    let stolen = false;
    if (team.isUser) {
      const good = sp.quality === true;
      if (!good && Math.random() < (kind === 'scrum' ? 0.5 : 0.55)) { winner = opp; stolen = true; }
    } else if (opp.isUser) {
      if (sp.userContest === true && Math.random() < 0.72) { winner = opp; stolen = true; }
      else if (sp.userContest !== true && Math.random() < 0.12) { winner = opp; stolen = true; }
    } else if (Math.random() < 0.2) {
      winner = opp; stolen = true;
    }
    if (winner === team) {
      if (kind === 'lineout') team.stats.lineoutsWon++;
      else team.stats.scrumsWon++;
    }
    const pool = winner.players.filter((p) => p.state === 'run' || p.state === 'getup' || p.state === 'dive');
    const receiver = nearestOf(pool.length ? pool : winner.players, sp.spot.x, sp.spot.y).player || winner.players[0];
    receiver.state = 'run';
    receiver.x = clamp(sp.spot.x - winner.dir * (kind === 'scrum' ? 3.0 : 1.6), 2, 98);
    receiver.y = clamp(sp.spot.y + (kind === 'lineout' ? (sp.inward || 1) * 5 : 0), 2, 68);
    receiver.vx = receiver.vy = 0;
    receiver.invuln = 1.1;
    receiver.pickupCd = 0.3;
    this.ball.state = 'held';
    this.ball.owner = receiver;
    this.ball.x = receiver.x;
    this.ball.y = receiver.y;
    this.ball.z = 0.25;
    this.ball.lastTouchTeam = winner;
    this.setpiece = null;
    this.state = 'play';
    this.controlLock = 0.4;
    if (winner.isUser) {
      this.controlled = receiver;
      this.emit('toast', { text: stolen ? 'STOLEN!' : kind === 'scrum' ? 'SCRUM WON' : 'LINEOUT WON', kind: stolen ? 'bad' : 'small' });
      this.emit('commentary', { text: stolen ? 'Stolen! The defence pinches it at the set piece.' : pick(['The pack does the job. Ball away.', 'Clean ball from the set piece.']) });
      if (!stolen) audio.positive();
    } else {
      this.forceControlSwitch();
      if (stolen) {
        this.emit('toast', { text: 'TURNOVER!', kind: 'small' });
        this.emit('commentary', { text: 'The defence steals the set piece!' });
      } else {
        this.emit('commentary', { text: `${team.name} secure the set piece.` });
      }
    }
    this.addRing(receiver.x, receiver.y, 0.5, 2.6, winner.isUser ? '#d8f36a' : '#ff8b7f');
  }

  // ------------------------------------------------------------
  // set plays / moves
  // ------------------------------------------------------------
  triggerPlay(index) {
    if (this.state !== 'play' || this.playCd > 0 || this.activePlay) return;
    const play = this.equippedPlays[index];
    const carrier = this.ball.owner;
    if (!play || !carrier || carrier.team !== this.userTeam) return;
    const teammates = this.userTeam.players
      .filter((p) => p !== carrier && p.state === 'run')
      .sort((a, b) => a.slot - b.slot);
    if (teammates.length < 2) return;
    const bx = carrier.x;
    const by = carrier.y;
    const dir = this.userTeam.dir;
    const pts = play.players || [];
    for (let i = 0; i < Math.min(teammates.length, pts.length); i++) {
      const shape = pts[i];
      if (!shape || !shape.start) continue;
      const p = teammates[i];
      const route = [];
      route.push({
        x: clamp(bx + dir * shape.start[0], -9, 109),
        y: clamp(by + shape.start[1], 3, 67),
      });
      for (const pt of shape.route || []) {
        route.push({
          x: clamp(bx + dir * pt[0], -9, 109),
          y: clamp(by + pt[1], 3, 67),
        });
      }
      p.route = route;
      p.routeIndex = 0;
      p.scripted = true;
      p.scriptTime = 0;
      p.sprintReq = true;
    }
    const receiverIndex = clamp(Number(play.receiver) || 0, 0, teammates.length - 1);
    const receiver = teammates[receiverIndex];
    for (const p of this.userTeam.players) {
      if (p !== carrier) p.aiDecision = 0;
    }
    this.activePlay = {
      play, time: 0, receiver, passed: false, dir, bx, by, carrierAtStart: carrier,
    };
    this.playCd = 12;
    this.playBannerTime = 2.2;
    this.emit('banner', { name: play.name, small: 'SET PLAY — LIVE' });
    this.emit('commentary', { text: `${play.name}! The move is on.` });
    audio.ui();
    this.addRing(carrier.x, carrier.y, 0.6, 2.4, '#d8f36a');
  }

  updateActivePlay(dt) {
    const ap = this.activePlay;
    if (!ap) return;
    ap.time += dt;
    if (this.ball.state === 'held' && this.ball.owner && this.ball.owner.team !== this.userTeam) {
      this.tryPlayReset();
      return;
    }
    if (!ap.passed && ap.time > 0.62) {
      const carrier = this.ball.owner;
      if (carrier && carrier.team === this.userTeam && ap.receiver && ap.receiver !== carrier && !ap.receiver.bench) {
        const d = dist(carrier.x, carrier.y, ap.receiver.x, ap.receiver.y);
        if (d < 30 || ap.time > 1.7) {
          ap.passed = true;
          const ok = this.passBall(carrier, { force: true, target: ap.receiver, silent: true });
          if (ok) {
            this.addFloater(carrier.x, carrier.y - 2.4, 'MOVE!', '#d8f36a', 0.9);
          }
        }
      } else {
        ap.passed = true;
      }
    }
    if (ap.time > 4.8) this.tryPlayReset();
  }

  tryPlayReset() {
    if (!this.activePlay) return;
    for (const p of this.userTeam.players) {
      if (p.scripted) {
        p.scripted = false;
        p.route = null;
        p.sprintReq = false;
      }
    }
    this.activePlay = null;
  }

  // ------------------------------------------------------------
  // AI
  // ------------------------------------------------------------
  runAI(dt) {
    const b = this.ball;
    for (const team of this.teams) {
      team.aiTimer -= dt;
      team.aiPassCd = Math.max(0, team.aiPassCd - dt);
      team.aiKickCd = Math.max(0, team.aiKickCd - dt);
    }
    const attacking = b.owner ? b.owner.team : b.state === 'pass' && b.passFrom ? b.passFrom.team : null;

    for (const team of this.teams) {
      for (const p of team.players) {
        if (p.state !== 'run' || p.scripted) continue;
        if (team.isUser && p === this.controlled) continue;
        if (b.state === 'held' && b.owner) {
          if (team === b.owner.team) {
            if (p === b.owner) this.aiCarry(p, dt);
            else this.aiSupport(p, dt);
          } else {
            this.aiDefend(p, dt);
          }
        } else if (b.state === 'pass') {
          if (attacking && team === attacking) this.aiSupport(p, dt);
          else this.aiChase(p, dt);
        } else {
          this.aiChase(p, dt);
        }
      }
    }
  }

  refreshDefense(team) {
    const threat = this.ball.owner || { x: this.ball.x, y: this.ball.y };
    const active = team.players.filter((p) => p.state === 'run' || p.state === 'dive');
    const sorted = active.slice().sort((a, b) => dist2(a.x, a.y, threat.x, threat.y) - dist2(b.x, b.y, threat.x, threat.y));
    team.defRoles.clear();
    sorted.forEach((p, i) => team.defRoles.set(p.id, i < 2 ? 'chase' : 'line'));
    const line = sorted.filter((p) => team.defRoles.get(p.id) === 'line').sort((a, b) => a.y - b.y);
    line.forEach((p, i) => { p.defSlot = i - (line.length - 1) / 2; });
    team.aiTimer = 0.34 + Math.random() * 0.1;
  }

  aiDefend(p, dt) {
    const team = p.team;
    if (team.aiTimer <= 0) this.refreshDefense(team);
    const b = this.ball;
    const carrier = b.owner && b.owner.team !== team ? b.owner : null;
    const role = team.defRoles.get(p.id) || 'line';
    const def = team.defenseStyle;
    if (role === 'chase' && carrier) {
      const tx = carrier.x + carrier.vx * 0.2;
      const ty = carrier.y + carrier.vy * 0.2;
      const d = dist(p.x, p.y, tx, ty);
      if (d < 2.1 && p.tackleCd <= 0) {
        this.startDive(p);
        return;
      }
      if (d > 0.7) {
        p.mx = (tx - p.x) / d;
        p.my = (ty - p.y) / d;
      }
      p.sprintReq = d > 2.8 || d < 8;
      return;
    }
    // flat defensive line
    const ownLine = team.dir > 0 ? 0 : 100;
    let targetX = b.x - team.dir * def.depth;
    targetX += team.dir * def.rush * 3.4;
    if (team.dir > 0) targetX = clamp(targetX, ownLine + 4, 96);
    else targetX = clamp(targetX, 4, ownLine - 4);
    const slotGap = 10.6;
    let targetY = b.y + (p.defSlot || 0) * slotGap;
    targetY = lerp(targetY, b.y, def.drift * 0.28);
    targetY = clamp(targetY, 5, 65);
    const dx = targetX - p.x;
    const dy = targetY - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.9) {
      p.mx = dx / d;
      p.my = dy / d;
    }
    p.sprintReq = d > 9;
    if (carrier) {
      const dc = dist(p.x, p.y, carrier.x, carrier.y);
      if (dc < 1.9 && p.tackleCd <= 0 && (def.aggression > 0.8 || Math.random() < 0.04)) {
        this.startDive(p);
      }
    }
  }

  aiChase(p, dt) {
    const team = p.team;
    const b = this.ball;
    if (team.aiTimer <= 0) this.refreshDefense(team);
    const isChaser = team.defRoles.get(p.id) === 'chase' || team.players.length < 4;
    let tx, ty;
    if (b.state === 'kick') {
      const landing = this.predictLanding();
      tx = landing.x;
      ty = landing.y;
    } else {
      tx = b.x + (b.vx || 0) * 0.16;
      ty = b.y + (b.vy || 0) * 0.16;
    }
    if (isChaser) {
      const dx = tx - p.x;
      const dy = ty - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.4) { p.mx = dx / d; p.my = dy / d; }
      p.sprintReq = true;
    } else {
      const slot = (p.slot - 3) * 8.5;
      const tx2 = b.x - team.dir * 9;
      const ty2 = clamp(b.y + slot, 5, 65);
      const dx = tx2 - p.x;
      const dy = ty2 - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 1.2) { p.mx = dx / d; p.my = dy / d; }
      p.sprintReq = d > 14;
    }
    if (team.isUser && p === this.controlled) return;
    // catch/pickup is handled by ball physics
  }

  aiSupport(p, dt) {
    const team = p.team;
    const b = this.ball;
    const owner = b.owner;
    if (!owner) return;
    const style = team.attackStyle;
    const supports = team.players.filter((x) => x !== owner).sort((a, b2) => a.slot - b2.slot);
    const idx = Math.max(0, supports.indexOf(p));
    const slots = [-27, -18, -9, 0, 9, 18, 27];
    const spread = slots[Math.min(idx, slots.length - 1)] * style.width;
    const depth = 4.4 + (idx % 3) * 2.1 * style.depth;
    let tx = owner.x - team.dir * depth;
    let ty = owner.y + spread;
    // slide into the nearest gap
    const opps = this.teams.find((t) => t !== team).players;
    let shift = 0;
    let nearest = null;
    let nd = 11;
    for (const o of opps) {
      const d = dist(o.x, o.y, tx, ty);
      if (d < nd) { nd = d; nearest = o; }
    }
    if (nearest && nearest.y > ty) shift -= (1 - nd / 11) * 3.2;
    else if (nearest) shift += (1 - nd / 11) * 3.2;
    ty += shift;
    ty = clamp(ty, 6, 64);
    tx = clamp(tx, 3, 97);
    // if very close to the ball, hold the line instead of crowding
    const d = dist(p.x, p.y, tx, ty);
    if (d > 1.3) {
      p.mx = (tx - p.x) / d;
      p.my = (ty - p.y) / d;
    }
    p.sprintReq = d > 7 && p.stamina > p.staminaMax * 0.16;
    // support carries occasionally take a short line
    if (idx === 0 && d < 4 && Math.random() < 0.004) p.sprintReq = true;
  }

  aiCarry(p, dt) {
    const team = p.team;
    const b = this.ball;
    const dir = team.dir;
    const style = team.attackStyle;
    const opps = this.teams.find((t) => t !== team).players;
    let fx = dir * 1.25;
    let fy = (35 - p.y) * 0.012;
    let pressure = 99;
    for (const o of opps) {
      if (o.state === 'down' || o.state === 'stunned') continue;
      const dx = p.x - o.x;
      const dy = p.y - o.y;
      const d = Math.hypot(dx, dy);
      if (d < 10 && d > 0.4) {
        const strength = ((10 - d) / 10) * 1.45;
        fx += (dx / d) * strength;
        fy += (dy / d) * strength;
      }
      if (o.team !== team) pressure = Math.min(pressure, d);
    }
    if (p.y < 9) fy += (9 - p.y) * 0.18;
    if (p.y > 61) fy -= (p.y - 61) * 0.18;
    const goalX = dir > 0 ? FIELD.rightTry : FIELD.leftTry;
    const toGoal = Math.abs(goalX - p.x);
    if (toGoal < 13) {
      fy += (p.y < 35 ? -0.5 : 0.5) * 0.4;
      fx += dir * 0.8;
    }
    const mag = Math.hypot(fx, fy) || 1;
    p.mx = fx / mag;
    p.my = fy / mag;
    p.sprintReq = p.stamina > p.staminaMax * 0.12 && (pressure > 2.4 || toGoal < 22);

    p.aiDecision -= dt;
    if (p.aiDecision > 0) return;
    p.aiDecision = 0.32 + Math.random() * 0.28;

    const ownHalf = dir > 0 ? p.x < 50 : p.x > 50;
    const nearTry = toGoal < 16;
    if (nearTry) {
      if (pressure < 4 && team.aiPassCd <= 0 && Math.random() < 0.5) {
        if (this.passBall(p)) team.aiPassCd = 0.85;
      }
      return;
    }
    if (pressure < 5.2) {
      if (team.aiKickCd <= 0 && ownHalf && Math.random() < style.kick * 0.55) {
        this.aiKick(p, 0.72);
        return;
      }
      if (team.aiPassCd <= 0 && Math.random() < style.pass * 0.66) {
        if (this.passBall(p)) { team.aiPassCd = 0.8; return; }
      }
      if (Math.random() < 0.14 + (p.trait === 'magician' ? 0.1 : 0)) {
        p.sidestep = 0.42;
        p.speedBoost = Math.max(p.speedBoost, 0.4);
        p.sidestepCd = 2.2;
      }
    } else if (pressure < 8.5 && team.aiPassCd <= 0 && Math.random() < style.pass * 0.2) {
      if (this.passBall(p)) team.aiPassCd = 0.9;
    }
    if (ownHalf && team.aiKickCd <= 0 && p.x < (dir > 0 ? 26 : 74) && Math.random() < 0.05) {
      this.aiKick(p, 0.82);
    }
  }

  aiKick(p, power) {
    const dir = p.team.dir;
    const targetY = pick([10, 60]);
    const angle = angleOf(dir * 45, targetY - p.y);
    this.launchKick(p, angle, power + rand(-0.05, 0.08), {});
    p.team.aiKickCd = 4.2;
    this.emit('commentary', { text: pick(['The boot clears the danger.', 'Kicked for territory.']) });
  }

  // ------------------------------------------------------------
  // effects
  // ------------------------------------------------------------
  updateFx(dt) {
    this.shake = Math.max(0, this.shake - dt * 2.4);
    this.flash = Math.max(0, this.flash - dt * 1.8);
    for (const r of this.rings) r.age += dt;
    this.rings = this.rings.filter((r) => r.age < r.dur);
    for (const f of this.floaters) { f.age += dt; f.y -= dt * 1.15; }
    this.floaters = this.floaters.filter((f) => f.age < f.dur);
    for (const pt of this.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 1 - 1.1 * dt;
      pt.vy *= 1 - 1.1 * dt;
      if (pt.gravity) pt.vy += pt.gravity * dt;
      pt.rot += pt.spin * dt;
    }
    if (this.particles.length > 260) this.particles.splice(0, this.particles.length - 260);
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  addRing(x, y, r0, r1, color) {
    this.rings.push({ x, y, r0, r1, color, age: 0, dur: 0.55 });
  }

  addFloater(x, y, text, color, dur = 1) {
    this.floaters.push({ x, y, text, color, age: 0, dur });
  }

  addParticles(x, y, count, opts = {}) {
    const speed = opts.speed ?? 2;
    const life = opts.life ?? 0.5;
    const size = opts.size ?? 0.12;
    const color = opts.color ?? '#f5f0e3';
    const type = opts.type ?? 'spark';
    const gravity = opts.gravity ?? 0;
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(0.25, 1) * speed;
      this.particles.push({
        x: x + rand(-0.25, 0.25),
        y: y + rand(-0.25, 0.25),
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: life * rand(0.7, 1.25),
        maxLife: life,
        size: size * rand(0.7, 1.3),
        color,
        type,
        rot: rand(0, Math.PI * 2),
        spin: rand(-8, 8),
        gravity,
      });
    }
  }
}
