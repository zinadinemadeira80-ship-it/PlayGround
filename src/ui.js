// ============================================================
// RUCKUS RUGBY — screens, HUD & playbook interaction
// ============================================================
import {
  clamp, formatClock, uid, pick, clone,
} from './utils.js';
import {
  STAT_KEYS, STAT_LABELS, STAT_BUDGET, STAT_MIN, STAT_MAX,
  POSITIONS, POSITION_BY_ID, TRAITS, TIPS,
  SKIN_TONES, HAIR_COLORS, HAIR_STYLES, BUILDS, GEAR,
  ATTACK_STYLES, DEFENSE_STYLES, OPPONENTS,
  STYLE_ATTACK, STYLE_DEFENSE,
  playerOverall, statTotal, teamOverall,
  defaultSquad, buildRivalTeam,
} from './data.js';
import { save as persist } from './storage.js';
import {
  drawPortrait, drawTacticsDiagram, drawPlayEditor, playEditorTransform,
} from './renderer.js';
import { audio } from './audio.js';
import { input } from './input.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const starString = (rating) => {
  const filled = clamp(Math.round((rating - 60) / 7), 1, 5);
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
};

function defaultShape() {
  return [
    { start: [-4, -8], route: [] },
    { start: [-5, 6], route: [] },
    { start: [-9, -14], route: [] },
    { start: [-10, 12], route: [] },
    { start: [-14, -3], route: [] },
    { start: [-15, 8], route: [] },
  ];
}

export class GameUI {
  constructor({ save, renderer, onStartMatch, onQuit, onRestart }) {
    this.save = save;
    this.renderer = renderer;
    this.onStartMatch = onStartMatch;
    this.onQuit = onQuit;
    this.onRestart = onRestart;

    this.team = save.team;
    this.settings = save.settings;
    this.screen = 'menu';
    this.match = null;
    this.paused = false;
    this.overlayOpen = false;
    this.overlayActions = {};
    this.selectedPlayer = 3;
    this.selectedPlayId = (save.equipped && save.equipped[0]) || save.plays[0]?.id || null;
    this.editorSel = 0;
    this.dragging = null;
    this.tab = 'tactics';
    this.commentTimer = 0;
    this.bannerTimer = 0;
    this.toastTimers = new Set();
    this.interval = null;

    this.cacheDom();
    this.bindNavigation();
    this.bindSetup();
    this.bindSquad();
    this.bindPlaybook();
    this.bindSettings();
    this.bindHud();
    this.bindTouch();
    this.syncAll();
    this.interval = window.setInterval(() => {
      if (this.screen === 'menu') this.updateMenuTip();
    }, 9000);
  }

  // ------------------------------------------------------------
  // helpers
  // ------------------------------------------------------------
  cacheDom() {
    this.hud = $('hud');
    this.touch = $('touch');
    this.screensRoot = $('screens');
    this.overlay = $('overlay');
    this.overlayCard = $('overlay-card');
  }

  persist() {
    persist(this.save);
  }

  showScreen(name) {
    this.screen = name;
    this.screensRoot.style.display = '';
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    const screen = $(`screen-${name}`);
    if (screen) screen.classList.add('active');
    this.hud.classList.add('hidden');
    this.touch.classList.add('hidden');
    document.body.classList.remove('touch-mode');
    this.hideOverlay();

    if (name === 'menu') this.refreshMenu();
    if (name === 'setup') this.renderSetup();
    if (name === 'squad') this.renderSquad();
    if (name === 'playbook') this.renderPlaybook();
    if (name === 'settings') this.syncSettings();
    if (name === 'help') this.renderHelpBits();
    window.scrollTo(0, 0);
  }

  syncAll() {
    this.ensureEquipped();
    this.refreshMenu();
    this.renderSetup();
    this.renderSquad();
    this.renderPlaybook();
    this.syncSettings();
  }

  ensureEquipped() {
    const raw = Array.isArray(this.save.equipped) ? this.save.equipped.slice(0, 4) : [];
    while (raw.length < 4) raw.push(null);
    // Keep key slots stable: an empty slot stays empty instead of shifting later plays up.
    this.save.equipped = raw.map((id) => (this.save.plays.some((p) => p.id === id) ? id : null));
    if (!this.selectedPlayId || !this.save.plays.some((p) => p.id === this.selectedPlayId)) {
      this.selectedPlayId = this.save.plays[0]?.id || null;
    }
  }

  currentPlay() {
    return this.save.plays.find((p) => p.id === this.selectedPlayId) || null;
  }

  // ------------------------------------------------------------
  // navigation & menu
  // ------------------------------------------------------------
  bindNavigation() {
    document.addEventListener('click', (e) => {
      const go = e.target.closest('[data-go]');
      if (go) {
        audio.init();
        if (this.settings.sound) audio.setEnabled(true);
        audio.ui();
        const target = go.dataset.go;
        if (target === 'setup') {
          this.applySetupDefaults();
        }
        this.showScreen(target);
        return;
      }
      const tabJump = e.target.closest('[data-tab-jump]');
      if (tabJump) {
        this.switchTab(tabJump.dataset.tabJump);
        return;
      }
    });
    $('sound-toggle')?.addEventListener('click', () => this.toggleSetting('sound'));
    $('fullscreen-btn')?.addEventListener('click', () => this.toggleFullscreen());
  }

  refreshMenu() {
    const t = this.team;
    const captain = t.squad.slice().sort((a, b) => playerOverall(b) - playerOverall(a))[0] || t.squad[0];
    const kit = $('menu-kit-chip');
    if (kit) kit.style.background = `linear-gradient(160deg, ${t.colors.primary} 0 52%, ${t.colors.secondary} 52% 100%)`;
    const name = $('menu-team-name');
    if (name) name.textContent = t.name.toUpperCase();
    const cap = $('menu-captain');
    if (cap) cap.textContent = captain?.name?.toUpperCase() || 'YOUR CAPTAIN';
    const style = $('menu-style');
    if (style) style.textContent = (STYLE_ATTACK[t.tactics.attack]?.name || 'BALANCED').toUpperCase();
    this.updateMenuTip();
    const canvas = $('menu-player-canvas');
    if (canvas) drawPortrait(canvas, captain, t, { ball: true });
    const toggle = $('sound-toggle');
    if (toggle) toggle.textContent = this.settings.sound ? '♪' : '∅';
  }

  updateMenuTip() {
    const tip = $('menu-tip');
    if (tip) tip.textContent = pick(TIPS);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }

  applySetupDefaults() {
    this.save.match = this.save.match || {};
    if (!this.save.match.opponent) this.save.match.opponent = OPPONENTS[0].id;
    if (!this.save.match.difficulty) this.save.match.difficulty = this.settings.difficulty || 'normal';
    if (!this.save.match.half) this.save.match.half = 180;
    if (!this.save.match.weather) this.save.match.weather = 'clear';
  }

  // ------------------------------------------------------------
  // match setup
  // ------------------------------------------------------------
  bindSetup() {
    $('start-match-btn')?.addEventListener('click', () => {
      audio.init();
      this.save.match.opponent = this.setupOpponent || this.save.match.opponent || OPPONENTS[0].id;
      this.persist();
      this.onStartMatch?.({
        ...this.save.match,
        settings: { ...this.settings },
      });
    });
    const bindSeg = (id, dataKey, onPick) => {
      const root = $(id);
      if (!root) return;
      root.addEventListener('click', (e) => {
        const btn = e.target.closest(`[data-${dataKey}]`);
        if (!btn) return;
        const v = btn.dataset[dataKey];
        onPick(v);
        audio.ui();
      });
    };
    bindSeg('half-seg', 'half', (v) => { this.save.match.half = Number(v); this.renderSetup(); this.persist(); });
    bindSeg('diff-seg', 'diff', (v) => { this.save.match.difficulty = v; this.settings.difficulty = v; this.renderSetup(); this.persist(); });
    bindSeg('weather-seg', 'weather', (v) => { this.save.match.weather = v; this.renderSetup(); this.persist(); });
  }

  renderSetup() {
    this.applySetupDefaults();
    const m = this.save.match;
    this.setupOpponent = m.opponent;
    const grid = $('opponent-grid');
    if (grid) {
      grid.innerHTML = OPPONENTS.map((o) => `
        <button class="opp-card ${o.id === m.opponent ? 'active' : ''}" data-opp="${o.id}">
          <b><i class="oc-kit" style="background:${esc(o.colors.primary)}"></i>${esc(o.name)}</b>
          <small>${esc(o.blurb)}</small>
        </button>`).join('');
      grid.querySelectorAll('[data-opp]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.setupOpponent = btn.dataset.opp;
          this.save.match.opponent = btn.dataset.opp;
          this.persist();
          this.renderSetup();
          audio.ui();
        });
      });
    }

    const opp = OPPONENTS.find((o) => o.id === m.opponent) || OPPONENTS[0];
    const userRating = teamOverall(this.team);
    const awayRating = opp.rating;
    this.setText('setup-name-home', this.team.name);
    this.setText('setup-name-away', opp.name);
    this.setText('setup-rating-home', userRating);
    this.setText('setup-rating-away', awayRating);
    this.setText('setup-stars-home', starString(userRating));
    this.setText('setup-stars-away', starString(awayRating));
    const hk = $('setup-kit-home');
    if (hk) hk.style.background = `linear-gradient(160deg, ${this.team.colors.primary} 0 55%, ${this.team.colors.secondary} 55% 100%)`;
    const ak = $('setup-kit-away');
    if (ak) ak.style.background = `linear-gradient(160deg, ${opp.colors.primary} 0 55%, ${opp.colors.secondary} 55% 100%)`;

    this.setSegActive('half-seg', 'half', String(m.half));
    this.setSegActive('diff-seg', 'diff', m.difficulty);
    this.setSegActive('weather-seg', 'weather', m.weather);
    const halfText = m.half === 90 ? '1:30' : m.half === 300 ? '5:00' : '3:00';
    const diffText = { easy: 'Rookie', normal: 'Pro', hard: 'Elite' }[m.difficulty] || 'Pro';
    const weatherText = { clear: 'Clear', rain: 'Rain', night: 'Night' }[m.weather] || 'Clear';
    this.setText('setup-summary', `${halfText} halves · ${diffText} · ${weatherText} · 7 v 7`);
  }

  setSegActive(id, dataKey, value) {
    const root = $(id);
    if (!root) return;
    root.querySelectorAll(`[data-${dataKey}]`).forEach((b) => {
      b.classList.toggle('active', b.dataset[dataKey] === value);
    });
  }

  setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  // ------------------------------------------------------------
  // squad builder
  // ------------------------------------------------------------
  bindSquad() {
    $('prev-player')?.addEventListener('click', () => this.cyclePlayer(-1));
    $('next-player')?.addEventListener('click', () => this.cyclePlayer(1));
    $('reset-squad-btn')?.addEventListener('click', () => {
      this.confirm('Reset squad?', 'This restores the ten default players and their attributes. Your club colours and playbook stay put.', () => {
        this.team.squad = defaultSquad();
        this.selectedPlayer = 3;
        this.persist();
        this.renderSquad();
        this.renderSetup();
        this.refreshMenu();
      });
    });

    const editName = $('edit-name');
    editName?.addEventListener('input', () => {
      const p = this.currentPlayer();
      if (!p) return;
      p.name = editName.value.slice(0, 18);
      this.persist();
      this.renderPlayerIdentityOnly();
    });
    $('edit-number')?.addEventListener('input', (e) => {
      const p = this.currentPlayer();
      if (!p) return;
      p.number = clamp(Number(e.target.value) || 1, 1, 99);
      this.persist();
      this.renderPlayerIdentityOnly();
    });
    $('edit-position')?.addEventListener('change', (e) => {
      const p = this.currentPlayer();
      if (!p) return;
      p.position = e.target.value;
      this.persist();
      this.renderSquad();
    });
    $('edit-trait')?.addEventListener('change', (e) => {
      const p = this.currentPlayer();
      if (!p) return;
      p.trait = e.target.value;
      this.persist();
      this.renderSquad();
    });

    $('hair-style')?.addEventListener('change', (e) => {
      const p = this.currentPlayer();
      if (!p) return;
      p.appearance.hairStyle = e.target.value;
      this.persist();
      this.renderPortrait();
    });

    $('build-seg')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-build]');
      if (!btn) return;
      const p = this.currentPlayer();
      if (!p) return;
      p.appearance.build = btn.dataset.build;
      this.persist();
      this.renderSquad();
      audio.ui();
    });
    $('gear-seg')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-gear]');
      if (!btn) return;
      const p = this.currentPlayer();
      if (!p) return;
      p.appearance.gear = btn.dataset.gear;
      this.persist();
      this.renderSquad();
      audio.ui();
    });

    $('stat-list')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-stat]');
      if (!btn) return;
      const p = this.currentPlayer();
      if (!p) return;
      const key = btn.dataset.stat;
      const delta = Number(btn.dataset.delta);
      const total = statTotal(p);
      if (delta > 0 && total >= STAT_BUDGET) {
        this.toast('NO POINTS LEFT', 'small bad');
        audio.negative();
        return;
      }
      p.stats[key] = clamp((p.stats[key] || STAT_MIN) + delta, STAT_MIN, STAT_MAX);
      this.persist();
      this.renderStats();
      this.renderPortrait();
      this.renderRoster();
      audio.ui();
    });

    this.bindTeamIdentity();
  }

  bindTeamIdentity() {
    const nameInput = $('team-name-input');
    nameInput?.addEventListener('input', () => {
      this.team.name = nameInput.value.slice(0, 22) || 'Ruckus RFC';
      this.persist();
      this.refreshMenu();
      this.renderSetup();
    });
    const abbrInput = $('team-abbr-input');
    abbrInput?.addEventListener('input', () => {
      this.team.abbr = (abbrInput.value || 'RUK').toUpperCase().slice(0, 4);
      abbrInput.value = this.team.abbr;
      this.persist();
      this.refreshMenu();
    });
    $('team-pattern-select')?.addEventListener('change', (e) => {
      this.team.colors.pattern = e.target.value;
      this.persist();
      this.renderPortrait();
      this.refreshMenu();
      this.renderSetup();
    });
    const colorBind = (id, key) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('input', () => {
        this.team.colors[key] = el.value;
        this.persist();
        this.renderPortrait();
        this.refreshMenu();
        this.renderSetup();
      });
    };
    colorBind('kit-primary', 'primary');
    colorBind('kit-secondary', 'secondary');
    colorBind('kit-shorts', 'shorts');
    colorBind('kit-socks', 'socks');
  }

  currentPlayer() {
    return this.team.squad[this.selectedPlayer] || this.team.squad[0] || null;
  }

  cyclePlayer(dir) {
    const n = this.team.squad.length;
    this.selectedPlayer = (this.selectedPlayer + dir + n) % n;
    this.renderSquad();
    audio.ui();
  }

  renderSquad() {
    this.ensureEquipped();
    this.renderRoster();
    this.renderPortrait();
    this.renderEditor();
    this.renderTeamIdentity();
    this.renderSquadBudget();
  }

  renderRoster() {
    const list = $('roster-list');
    if (!list) return;
    list.innerHTML = this.team.squad.map((p, i) => `
      <button class="roster-item ${i === this.selectedPlayer ? 'active' : ''}" data-player="${i}">
        <span class="ri-num" style="background:${esc(this.team.colors.primary)}">${esc(p.number)}</span>
        <span class="ri-body">
          <b>${esc(p.name)}</b>
          <small>${esc(POSITION_BY_ID[p.position]?.name || 'Utility')}${p.bench ? ' · <span class="ri-bench">BENCH</span>' : ''}</small>
        </span>
        <span class="ri-ovr">${playerOverall(p)}</span>
      </button>`).join('');
    list.querySelectorAll('[data-player]').forEach((b) => {
      b.addEventListener('click', () => {
        this.selectedPlayer = Number(b.dataset.player);
        this.renderSquad();
        audio.ui();
      });
    });
    this.setText('squad-count', `${this.team.squad.length} PLAYERS`);
  }

  renderPortrait() {
    const p = this.currentPlayer();
    if (!p) return;
    const canvas = $('portrait-canvas');
    if (canvas) drawPortrait(canvas, p, this.team);
    this.setText('portrait-pos', (POSITION_BY_ID[p.position]?.name || 'Utility').toUpperCase());
    this.setText('portrait-name', p.name);
    this.setText('portrait-ovr', playerOverall(p));
    this.setText('portrait-trait', TRAITS.find((t) => t.id === p.trait)?.name || 'No Trait');
    this.setText('player-index', `${this.selectedPlayer + 1} / ${this.team.squad.length}`);
  }

  renderPlayerIdentityOnly() {
    this.renderRoster();
    this.renderPortrait();
  }

  renderEditor() {
    const p = this.currentPlayer();
    if (!p) return;
    const name = $('edit-name');
    if (name && document.activeElement !== name) name.value = p.name;
    const num = $('edit-number');
    if (num && document.activeElement !== num) num.value = p.number;

    const posSel = $('edit-position');
    if (posSel) {
      posSel.innerHTML = POSITIONS.map((pos) => `<option value="${esc(pos.id)}">${esc(pos.name)}</option>`).join('');
      posSel.value = p.position;
    }
    const traitSel = $('edit-trait');
    if (traitSel) {
      traitSel.innerHTML = TRAITS.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
      traitSel.value = p.trait;
    }

    // appearance swatches
    const skinRow = $('skin-swatches');
    if (skinRow) {
      skinRow.innerHTML = SKIN_TONES.map((c) => `<button class="swatch ${p.appearance.skin === c ? 'active' : ''}" style="background:${c}" data-skin="${c}" title="${c}"></button>`).join('');
      skinRow.querySelectorAll('[data-skin]').forEach((b) => b.addEventListener('click', () => {
        p.appearance.skin = b.dataset.skin;
        this.persist();
        this.renderSquad();
        audio.ui();
      }));
    }
    const hairRow = $('hair-swatches');
    if (hairRow) {
      hairRow.innerHTML = HAIR_COLORS.map((c) => `<button class="swatch ${p.appearance.hair === c ? 'active' : ''}" style="background:${c}" data-hair="${c}" title="${c}"></button>`).join('');
      hairRow.querySelectorAll('[data-hair]').forEach((b) => b.addEventListener('click', () => {
        p.appearance.hair = b.dataset.hair;
        this.persist();
        this.renderSquad();
        audio.ui();
      }));
    }
    const hairStyle = $('hair-style');
    if (hairStyle) {
      hairStyle.innerHTML = HAIR_STYLES.map((h) => `<option value="${h.id}">${h.name}</option>`).join('');
      hairStyle.value = p.appearance.hairStyle;
    }
    const buildSeg = $('build-seg');
    if (buildSeg) buildSeg.querySelectorAll('[data-build]').forEach((b) => b.classList.toggle('active', b.dataset.build === p.appearance.build));
    const gearSeg = $('gear-seg');
    if (gearSeg) gearSeg.querySelectorAll('[data-gear]').forEach((b) => b.classList.toggle('active', b.dataset.gear === p.appearance.gear));

    this.renderStats();
  }

  renderStats() {
    const p = this.currentPlayer();
    const list = $('stat-list');
    if (!p || !list) return;
    const total = statTotal(p);
    const remaining = STAT_BUDGET - total;
    list.innerHTML = STAT_KEYS.map((key) => {
      const v = p.stats[key];
      const canMinus = v > STAT_MIN;
      const canPlus = v < STAT_MAX && remaining > 0;
      return `
        <div class="stat-row">
          <span>${STAT_LABELS[key]}</span>
          <div class="stat-bar"><i style="width:${(v / STAT_MAX) * 100}%"></i></div>
          <b class="stat-val">${v}</b>
          <button class="stat-btn" data-stat="${key}" data-delta="-1" ${canMinus ? '' : 'disabled'}>−</button>
          <button class="stat-btn" data-stat="${key}" data-delta="1" ${canPlus ? '' : 'disabled'}>+</button>
        </div>`;
    }).join('');
    const budget = $('stat-budget');
    if (budget) {
      budget.textContent = `${remaining} PTS LEFT`;
      budget.classList.toggle('over', remaining < 0);
    }
  }

  renderTeamIdentity() {
    const c = this.team.colors;
    const name = $('team-name-input');
    if (name && document.activeElement !== name) name.value = this.team.name;
    const abbr = $('team-abbr-input');
    if (abbr && document.activeElement !== abbr) abbr.value = this.team.abbr;
    const pattern = $('team-pattern-select');
    if (pattern) pattern.value = c.pattern || 'solid';
    const set = (id, v) => { const el = $(id); if (el) el.value = v; };
    set('kit-primary', c.primary);
    set('kit-secondary', c.secondary);
    set('kit-shorts', c.shorts);
    set('kit-socks', c.socks);
  }

  renderSquadBudget() {
    let rem = 0;
    for (const p of this.team.squad) rem += Math.max(0, STAT_BUDGET - statTotal(p));
    this.setText('squad-budget-pill', `${rem} PTS TO SPEND`);
  }

  // ------------------------------------------------------------
  // playbook
  // ------------------------------------------------------------
  bindPlaybook() {
    document.querySelectorAll('.playbook-tabs .tab').forEach((tab) => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    $('new-play-btn')?.addEventListener('click', () => {
      const play = {
        id: uid('play'),
        name: `NEW MOVE ${this.save.plays.length + 1}`,
        receiver: 1,
        players: defaultShape(),
      };
      this.save.plays.push(play);
      this.selectedPlayId = play.id;
      const empty = this.save.equipped.findIndex((id) => !id);
      if (empty >= 0) this.save.equipped[empty] = play.id;
      this.persist();
      this.renderPlaybook();
      this.switchTab('plays');
      audio.ui();
    });

    $('duplicate-play')?.addEventListener('click', () => {
      const src = this.currentPlay();
      if (!src) return;
      const copy = clone(src);
      copy.id = uid('play');
      copy.name = `${src.name} COPY`.slice(0, 26);
      this.save.plays.push(copy);
      this.selectedPlayId = copy.id;
      this.persist();
      this.renderPlaybook();
      audio.ui();
    });

    $('delete-play')?.addEventListener('click', () => {
      const play = this.currentPlay();
      if (!play) return;
      if (this.save.plays.length <= 1) {
        this.toast('KEEP ONE PLAY', 'small bad');
        return;
      }
      this.confirm('Delete this move?', `"${play.name}" will be removed from your playbook.`, () => {
        this.save.plays = this.save.plays.filter((p) => p.id !== play.id);
        this.save.equipped = this.save.equipped.map((id) => (id === play.id ? null : id));
        this.selectedPlayId = this.save.plays[0]?.id || null;
        this.ensureEquipped();
        this.persist();
        this.renderPlaybook();
      });
    });

    $('play-name')?.addEventListener('input', (e) => {
      const play = this.currentPlay();
      if (!play) return;
      play.name = e.target.value.toUpperCase().slice(0, 26);
      this.persist();
      this.renderPlayList();
      this.renderEquipSlots();
      this.renderEquippedMini();
    });

    $('receiver-select')?.addEventListener('change', (e) => {
      const play = this.currentPlay();
      if (!play) return;
      play.receiver = Number(e.target.value) || 0;
      this.persist();
      this.drawEditor();
    });

    $('undo-point')?.addEventListener('click', () => {
      const play = this.currentPlay();
      const pl = play?.players[this.editorSel];
      if (!pl || !pl.route?.length) return;
      pl.route.pop();
      this.persist();
      this.drawEditor();
      audio.ui();
    });
    $('clear-route')?.addEventListener('click', () => {
      const play = this.currentPlay();
      const pl = play?.players[this.editorSel];
      if (!pl) return;
      pl.route = [];
      this.persist();
      this.drawEditor();
      audio.ui();
    });
    $('clear-play')?.addEventListener('click', () => {
      const play = this.currentPlay();
      if (!play) return;
      play.players = defaultShape();
      this.editorSel = 0;
      this.persist();
      this.renderPlaybook();
      audio.ui();
    });

    const canvas = $('play-canvas');
    if (canvas) {
      const toLocal = (e) => {
        const rect = canvas.getBoundingClientRect();
        return {
          x: (e.clientX - rect.left) * (canvas.width / Math.max(1, rect.width)),
          y: (e.clientY - rect.top) * (canvas.height / Math.max(1, rect.height)),
        };
      };
      const hitPlayer = (pt) => {
        const play = this.currentPlay();
        if (!play) return -1;
        const t = playEditorTransform(canvas.width, canvas.height);
        let best = -1;
        let bd = 24;
        play.players.forEach((pl, i) => {
          if (!pl?.start) return;
          const s = t.toScreen(pl.start[0], pl.start[1]);
          const d = Math.hypot(s.x - pt.x, s.y - pt.y);
          if (d < bd) { bd = d; best = i; }
        });
        return best;
      };
      const move = (e) => {
        if (!this.dragging) return;
        const play = this.currentPlay();
        const pl = play?.players[this.dragging.idx];
        if (!pl) return;
        const local = toLocal(e);
        const t = playEditorTransform(canvas.width, canvas.height);
        const w = t.toWorld(local.x, local.y);
        pl.start = [clamp(w.x, -30, 48), clamp(w.y, -33, 33)];
        this.drawEditor();
      };
      canvas.addEventListener('pointerdown', (e) => {
        const play = this.currentPlay();
        if (!play) return;
        e.preventDefault();
        const local = toLocal(e);
        const hit = hitPlayer(local);
        if (hit >= 0) {
          this.editorSel = hit;
          this.dragging = { idx: hit };
          try { canvas.setPointerCapture?.(e.pointerId); } catch { /* synthetic pointer */ }
          this.drawEditor();
          this.renderSelectedLabel();
          audio.ui();
        } else {
          const pl = play.players[this.editorSel];
          if (!pl) return;
          const t = playEditorTransform(canvas.width, canvas.height);
          const w = t.toWorld(local.x, local.y);
          pl.route = pl.route || [];
          if (pl.route.length < 8) {
            pl.route.push([clamp(w.x, -30, 54), clamp(w.y, -33, 33)]);
            this.persist();
            this.drawEditor();
          }
        }
      });
      canvas.addEventListener('pointermove', move);
      const end = () => {
        if (this.dragging) {
          this.dragging = null;
          this.persist();
        }
      };
      canvas.addEventListener('pointerup', end);
      canvas.addEventListener('pointercancel', end);
      canvas.addEventListener('pointerleave', end);
    }
  }

  switchTab(tab) {
    this.tab = tab;
    document.querySelectorAll('.playbook-tabs .tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
    $('tab-tactics')?.classList.toggle('hidden', tab !== 'tactics');
    $('tab-plays')?.classList.toggle('hidden', tab !== 'plays');
    if (tab === 'plays') this.drawEditor();
  }

  renderPlaybook() {
    this.ensureEquipped();
    this.renderTactics();
    this.renderPlayList();
    this.renderEquipSlots();
    this.renderEquippedMini();
    this.renderSelectedLabel();
    this.drawEditor();
    this.switchTab(this.tab);
  }

  renderTactics() {
    const atkRoot = $('attack-cards');
    if (atkRoot) {
      atkRoot.innerHTML = ATTACK_STYLES.map((a) => `
        <button class="preset-card ${this.team.tactics.attack === a.id ? 'active' : ''}" data-attack="${a.id}">
          <span class="preset-icon">${a.icon}</span>
          <span class="preset-body"><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></span>
          <span class="preset-check"></span>
        </button>`).join('');
      atkRoot.querySelectorAll('[data-attack]').forEach((b) => b.addEventListener('click', () => {
        this.team.tactics.attack = b.dataset.attack;
        this.persist();
        this.renderTactics();
        this.refreshMenu();
        audio.ui();
      }));
    }
    const defRoot = $('defense-cards');
    if (defRoot) {
      defRoot.innerHTML = DEFENSE_STYLES.map((d) => `
        <button class="preset-card ${this.team.tactics.defense === d.id ? 'active' : ''}" data-defense="${d.id}">
          <span class="preset-icon">${d.icon}</span>
          <span class="preset-body"><b>${esc(d.name)}</b><small>${esc(d.desc)}</small></span>
          <span class="preset-check"></span>
        </button>`).join('');
      defRoot.querySelectorAll('[data-defense]').forEach((b) => b.addEventListener('click', () => {
        this.team.tactics.defense = b.dataset.defense;
        this.persist();
        this.renderTactics();
        audio.ui();
      }));
    }

    const atk = STYLE_ATTACK[this.team.tactics.attack] || ATTACK_STYLES[0];
    const def = STYLE_DEFENSE[this.team.tactics.defense] || DEFENSE_STYLES[0];
    this.setText('read-width', `${Math.round(atk.width * 100)}%`);
    this.setText('read-depth', `${Math.round(atk.depth * 100)}%`);
    this.setText('read-pass', `${Math.round(atk.pass * 100)}%`);
    this.setText('read-kick', `${Math.round(atk.kick * 100)}%`);
    this.setText('tactics-note', `${atk.desc} ${def.desc}`);
    const canvas = $('tactics-canvas');
    if (canvas) drawTacticsDiagram(canvas, atk, def);
  }

  renderPlayList() {
    const list = $('play-list');
    if (!list) return;
    list.innerHTML = this.save.plays.map((play) => {
      const key = this.save.equipped.indexOf(play.id);
      return `
        <button class="play-item ${play.id === this.selectedPlayId ? 'active' : ''}" data-play="${esc(play.id)}">
          <span class="pi-key">${key >= 0 ? key + 1 : '·'}</span>
          <span class="pi-name">${esc(play.name)}</span>
          ${key >= 0 ? '<span class="pi-dot"></span>' : ''}
        </button>`;
    }).join('');
    list.querySelectorAll('[data-play]').forEach((b) => b.addEventListener('click', () => {
      this.selectedPlayId = b.dataset.play;
      this.editorSel = 0;
      this.renderPlaybook();
      audio.ui();
    }));
  }

  renderEquipSlots() {
    const root = $('equip-slots');
    if (!root) return;
    root.innerHTML = [0, 1, 2, 3].map((i) => {
      const current = this.save.equipped[i] || '';
      return `
        <div class="equip-slot">
          <b>${i + 1}</b>
          <select data-slot="${i}">
            <option value="">— Empty —</option>
            ${this.save.plays.map((p) => `<option value="${esc(p.id)}" ${p.id === current ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
          </select>
        </div>`;
    }).join('');
    root.querySelectorAll('[data-slot]').forEach((sel) => sel.addEventListener('change', () => {
      const slot = Number(sel.dataset.slot);
      const id = sel.value || null;
      const eq = this.save.equipped.slice(0, 4);
      while (eq.length < 4) eq.push(null);
      if (id) {
        const other = eq.indexOf(id);
        if (other >= 0 && other !== slot) eq[other] = eq[slot] || null;
      }
      eq[slot] = id;
      this.save.equipped = eq;
      this.persist();
      this.renderPlayList();
      this.renderEquipSlots();
      this.renderEquippedMini();
      this.bindHudPlays();
      audio.ui();
    }));
  }

  renderEquippedMini() {
    const root = $('equipped-mini-list');
    if (!root) return;
    root.innerHTML = [0, 1, 2, 3].map((i) => {
      const play = this.save.plays.find((p) => p.id === this.save.equipped[i]);
      return `<div class="em-row"><b>${i + 1}</b><span>${play ? esc(play.name) : '— empty —'}</span></div>`;
    }).join('');
  }

  renderSelectedLabel() {
    const play = this.currentPlay();
    const p = play?.players[this.editorSel];
    const squad = this.team.squad;
    const sq = squad[Math.min(this.editorSel, squad.length - 1)] || {};
    this.setText('selected-player-label', `#${sq.number ?? this.editorSel + 1} ${(POSITION_BY_ID[sq.position]?.name || 'Player').toUpperCase()}`);
    const receiver = $('receiver-select');
    if (receiver) {
      receiver.innerHTML = (play?.players || []).map((_, i) => {
        const s = squad[Math.min(i, squad.length - 1)] || {};
        return `<option value="${i}">#${s.number ?? i + 1} ${esc((POSITION_BY_ID[s.position]?.name || 'Player').toUpperCase())}</option>`;
      }).join('');
      receiver.value = String(play?.receiver ?? 0);
    }
    const nameInput = $('play-name');
    if (nameInput && document.activeElement !== nameInput) nameInput.value = play?.name || '';
  }

  drawEditor() {
    const canvas = $('play-canvas');
    const play = this.currentPlay();
    if (!canvas) return;
    if (!play) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    drawPlayEditor(canvas, play, this.editorSel, { squad: this.team.squad });
  }

  // ------------------------------------------------------------
  // settings
  // ------------------------------------------------------------
  bindSettings() {
    const bindSwitch = (id, key, after) => {
      const btn = $(id);
      if (!btn) return;
      btn.addEventListener('click', () => {
        this.settings[key] = !this.settings[key];
        btn.classList.toggle('on', this.settings[key]);
        this.persist();
        after?.(this.settings[key]);
        audio.ui();
      });
    };
    bindSwitch('set-sound', 'sound', (on) => {
      audio.setEnabled(on);
      const toggle = $('sound-toggle');
      if (toggle) toggle.textContent = on ? '♪' : '∅';
    });
    bindSwitch('set-commentary', 'commentary', (on) => {
      if (!on) $('commentary')?.classList.remove('show');
    });
    bindSwitch('set-shake', 'shake');
    bindSwitch('set-motion', 'reducedMotion');
    bindSwitch('set-hints', 'hints', (on) => {
      const hint = $('hint');
      if (hint) hint.style.display = on ? '' : 'none';
    });
    const diffRoot = $('default-diff');
    if (diffRoot) {
      diffRoot.querySelectorAll('[data-diff]').forEach((b) => b.addEventListener('click', () => {
        this.settings.difficulty = b.dataset.diff;
        this.save.match.difficulty = b.dataset.diff;
        this.persist();
        this.syncSettings();
        this.renderSetup();
        audio.ui();
      }));
    }
    $('reset-all')?.addEventListener('click', () => {
      this.confirm('Delete your save?', 'Your squad, club identity, settings and custom plays will be wiped from this device.', () => {
        try { localStorage.removeItem('ruckus-rugby-save-v1'); } catch {}
        window.location.reload();
      }, 'Delete everything');
    });
  }

  toggleSetting(key) {
    this.settings[key] = !this.settings[key];
    this.persist();
    if (key === 'sound') {
      audio.init();
      audio.setEnabled(this.settings.sound);
    }
    this.syncSettings();
    if (this.screen === 'menu') this.refreshMenu();
  }

  syncSettings() {
    const set = (id, on) => $(id)?.classList.toggle('on', !!on);
    set('set-sound', this.settings.sound);
    set('set-commentary', this.settings.commentary);
    set('set-shake', this.settings.shake);
    set('set-motion', this.settings.reducedMotion);
    set('set-hints', this.settings.hints);
    const diffRoot = $('default-diff');
    if (diffRoot) diffRoot.querySelectorAll('[data-diff]').forEach((b) => {
      b.classList.toggle('active', b.dataset.diff === (this.settings.difficulty || 'normal'));
    });
    const hint = $('hint');
    if (hint) hint.style.display = this.settings.hints ? '' : 'none';
    const commentary = $('commentary');
    if (commentary && !this.settings.commentary) commentary.classList.remove('show');
  }

  renderHelpBits() {
    // static help copy lives in HTML; this keeps the screen future-proof.
  }

  // ------------------------------------------------------------
  // touch & HUD
  // ------------------------------------------------------------
  bindTouch() {
    const zone = $('stick-zone');
    const knob = $('stick-knob');
    const actions = document.querySelector('.touch-actions');
    const tactics = $('touch-tactics');
    input.bindTouch(zone, knob, actions, tactics, null);
  }

  bindHud() {
    $('btn-pause')?.addEventListener('click', () => this.pauseMatch());
  }

  bindHudPlays() {
    const bar = $('tactic-bar');
    if (!bar) return;
    bar.innerHTML = [0, 1, 2, 3].map((i) => {
      const play = this.save.plays.find((p) => p.id === this.save.equipped[i]);
      return `<div class="tactic-chip"><b>${i + 1}</b><small>${play ? esc(play.name) : 'EMPTY'}</small></div>`;
    }).join('');
    const touch = $('touch-tactics');
    if (touch) {
      touch.innerHTML = [0, 1, 2, 3].map((i) => {
        const play = this.save.plays.find((p) => p.id === this.save.equipped[i]);
        return `<button data-tactic="${i + 1}" title="${play ? esc(play.name) : 'Empty'}">${i + 1}</button>`;
      }).join('');
    }
  }

  enterMatch(match) {
    this.ensureEquipped();
    this.match = match;
    this.paused = false;
    this.overlayOpen = false;
    this.screen = 'match';
    this.screensRoot.style.display = 'none';
    this.hud.classList.remove('hidden');
    const coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches || window.innerWidth <= 820;
    this.touch.classList.toggle('hidden', !coarse);
    document.body.classList.toggle('touch-mode', coarse);
    this.hideOverlay();

    const home = match.teams[0];
    const away = match.teams[1];
    this.setText('sb-name-home', home.abbr || 'RUK');
    this.setText('sb-name-away', away.abbr || 'RIV');
    this.setText('score-home', 0);
    this.setText('score-away', 0);
    this.setText('clock', '00:00');
    this.setText('half-label', '1ST HALF');
    const crestHome = $('sb-crest-home');
    if (crestHome) { crestHome.textContent = (home.abbr || 'R')[0]; crestHome.style.background = home.colors.primary; crestHome.style.color = crestHome.style.color || '#07130d'; }
    const crestAway = $('sb-crest-away');
    if (crestAway) { crestAway.textContent = (away.abbr || 'R')[0]; crestAway.style.background = away.colors.primary; }
    this.setText('pc-controlled', 'YOU');
    this.bindHudPlays();
    const hint = $('hint');
    if (hint) {
      hint.style.display = this.settings.hints ? '' : 'none';
      hint.textContent = coarse ? 'TOUCH CONTROLS' : 'WASD move · J pass · K kick · L tackle';
    }
    this.setText('possession-pill', 'DEFEND');
    $('possession-pill')?.classList.remove('on');
    this.hideContext();
    this.updateHud(0);
  }

  exitMatch() {
    this.match = null;
    this.paused = false;
    this.hud.classList.add('hidden');
    this.touch.classList.add('hidden');
    document.body.classList.remove('touch-mode');
    this.screensRoot.style.display = '';
    this.hideOverlay();
  }

  hideContext() {
    $('ruck-widget')?.classList.add('hidden');
    $('kick-widget')?.classList.add('hidden');
  }

  updateHud(dt) {
    const m = this.match;
    if (!m) return;
    this.setText('score-home', m.teams[0].score);
    this.setText('score-away', m.teams[1].score);
    this.setText('clock', formatClock(Math.min(m.clock, m.halfLength * 2)));
    this.setText('half-label', m.state === 'fulltime' ? 'FULL TIME' : m.half === 1 ? '1ST HALF' : '2ND HALF');

    const p = m.controlled || m.ball.owner || m.userTeam.players[0];
    if (p) {
      this.setText('pc-number', p.number);
      this.setText('pc-name', p.name);
      this.setText('pc-pos', (POSITION_BY_ID[p.position]?.name || 'Player').toUpperCase());
      this.setText('pc-trait', TRAITS.find((t) => t.id === p.trait)?.name || 'No Trait');
      const stam = clamp((p.stamina / Math.max(1, p.staminaMax)) * 100, 0, 100);
      const fill = $('pc-stam-fill');
      if (fill) {
        fill.style.width = `${stam}%`;
        fill.style.background = stam < 28 ? '#ff8b7f' : stam < 55 ? '#f2c53d' : '#d8f36a';
      }
      const numEl = $('pc-number');
      if (numEl) numEl.style.background = m.userTeam.colors.primary;
      this.setText('pc-controlled', p === m.ball.owner ? (p.team.isUser ? 'CARRYING' : 'OPPOSITION') : 'YOU');
    }

    const userBall = m.ball.owner?.team?.isUser && m.ball.state === 'held';
    const pill = $('possession-pill');
    if (pill) {
      pill.classList.toggle('on', !!userBall);
      pill.textContent = userBall ? 'POSSESSION' : 'DEFENCE';
    }

    const ruck = m.state === 'ruck' && m.ruck;
    const ruckWidget = $('ruck-widget');
    if (ruckWidget) {
      ruckWidget.classList.toggle('hidden', !ruck);
      if (ruck) {
        const pct = clamp(50 + m.ruck.tug * 50, 2, 98);
        const fill = $('ruck-fill');
        if (fill) fill.style.width = `${pct}%`;
        const marker = $('ruck-marker');
        if (marker) marker.style.left = `${pct}%`;
        this.setText('ruck-label', 'RUCK — CONTEST');
        const atk = m.userTeam === m.ruck.atk;
        this.setText('ruck-sub', atk ? 'TAP PASS / TACKLE TO DRIVE' : 'TAP TACKLE TO JACKAL');
      }
    }

    const charging = m.kickCharging;
    const kickWidget = $('kick-widget');
    if (kickWidget) {
      kickWidget.classList.toggle('hidden', !charging);
      if (charging) {
        const fill = $('power-fill');
        if (fill) fill.style.width = `${clamp(m.kickPower, 0, 1) * 100}%`;
        this.setText('kick-sub', m.ball.state === 'kick' ? 'BOOTED' : 'RELEASE TO KICK');
      }
    }

    if ((ruck && ruckWidget) || charging) {
      // avoid both widgets competing for the same space
      if (ruck && kickWidget) kickWidget.classList.add('hidden');
    }

    const hint = $('hint');
    if (hint && this.settings.hints && !document.body.classList.contains('touch-mode')) {
      if (m.state === 'ruck') hint.textContent = 'TAP PASS / TACKLE TO WIN THE BREAKDOWN';
      else if (m.state === 'lineout' || m.state === 'scrum') hint.textContent = 'TAP IN THE GREEN TO SECURE THE SET PIECE';
      else if (userBall) hint.textContent = 'J pass · K kick · L sidestep · 1-4 set plays';
      else hint.textContent = 'WASD move · L tackle · Q switch · Shift sprint';
    }

    if (m.state === 'conversion' && m.conversion && !m.conversion.locked) {
      $('hint')?.setAttribute('data-conv', '1');
    } else {
      $('hint')?.removeAttribute('data-conv');
    }
  }

  handleMatchEvent(type, data) {
    if (type === 'score') {
      this.setText('score-home', data.home ?? 0);
      this.setText('score-away', data.away ?? 0);
    } else if (type === 'toast') {
      this.toast(data.text, data.kind || '');
    } else if (type === 'commentary') {
      if (this.settings.commentary) this.showCommentary(data.text);
    } else if (type === 'banner') {
      this.showBanner(data.name, data.small);
    } else if (type === 'kickoff') {
      this.setText('half-label', data.half === 1 ? '1ST HALF' : '2ND HALF');
    } else if (type === 'halftime') {
      this.showHalftime(data);
    } else if (type === 'fulltime') {
      this.showFulltime(data);
    }
  }

  showCommentary(text) {
    const el = $('commentary');
    if (!el) return;
    el.textContent = String(text || '').replace(/`/g, '');
    el.classList.add('show');
    clearTimeout(this.commentTimer);
    this.commentTimer = setTimeout(() => el.classList.remove('show'), 4200);
  }

  showBanner(name, small) {
    const el = $('play-banner');
    if (!el) return;
    this.setText('play-banner-name', name || '');
    const sub = el.querySelector('small');
    if (sub) sub.textContent = small || 'SET PLAY';
    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => el.classList.add('hidden'), 2600);
  }

  toast(text, kind = '') {
    const layer = $('toast-layer');
    if (!layer) return;
    const el = document.createElement('div');
    el.className = `toast ${kind.includes('bad') ? 'bad' : ''} ${kind.includes('small') ? 'small' : ''}`;
    el.textContent = text;
    layer.appendChild(el);
    const t = setTimeout(() => {
      el.remove();
      this.toastTimers.delete(t);
    }, 1500);
    this.toastTimers.add(t);
    while (layer.children.length > 4) layer.firstElementChild?.remove();
  }

  // ------------------------------------------------------------
  // overlays, pause, halftime & results
  // ------------------------------------------------------------
  hideOverlay() {
    this.overlayOpen = false;
    this.overlayActions = {};
    this.overlay.classList.add('hidden');
    this.overlayCard.innerHTML = '';
  }

  showOverlay(html, actions = {}) {
    this.overlayOpen = true;
    this.overlayActions = actions;
    this.overlayCard.innerHTML = html;
    this.overlay.classList.remove('hidden');
    this.overlayCard.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const fn = this.overlayActions[btn.dataset.act];
        if (fn) fn();
      });
    });
  }

  confirm(title, body, onConfirm, confirmLabel = 'Confirm') {
    this.showOverlay(`
      <div class="ov-kicker">ARE YOU SURE?</div>
      <h2>${esc(title)}</h2>
      <p>${esc(body)}</p>
      <div class="overlay-actions">
        <button class="btn btn-primary" data-act="ok">${esc(confirmLabel)}</button>
        <button class="btn btn-ghost" data-act="cancel">Cancel</button>
      </div>`, {
      ok: () => { this.hideOverlay(); onConfirm?.(); },
      cancel: () => this.hideOverlay(),
    });
  }

  pauseMatch() {
    if (!this.match || this.paused) return;
    if (this.match.state === 'halftime' || this.match.state === 'fulltime') return;
    this.paused = true;
    const m = this.match;
    this.showOverlay(`
      <div class="ov-kicker">MATCH PAUSED</div>
      <h2>Take a breath</h2>
      <p>${esc(m.teams[0].name)} ${m.teams[0].score} – ${m.teams[1].score} ${esc(m.teams[1].name)} · ${formatClock(m.clock)}</p>
      <div class="overlay-actions">
        <button class="btn btn-primary" data-act="resume">Resume match</button>
        <button class="btn btn-ghost" data-act="restart">Restart match</button>
        <button class="btn btn-ghost" data-act="settings">Settings</button>
        <button class="btn btn-ghost danger" data-act="quit">Quit to menu</button>
      </div>`, {
      resume: () => { this.paused = false; this.hideOverlay(); },
      restart: () => { this.hideOverlay(); this.paused = false; this.onRestart?.(); },
      settings: () => {
        this.paused = false;
        this.exitMatch();
        this.showScreen('settings');
      },
      quit: () => { this.hideOverlay(); this.paused = false; this.exitMatch(); this.onQuit?.(); },
    });
  }

  resumeFromOverlay() {
    this.hideOverlay();
    this.paused = false;
  }

  showHalftime(data) {
    const snap = data || this.match?.buildSnapshot();
    if (!snap) return;
    const home = snap.teams[0];
    const away = snap.teams[1];
    const stats = this.statGrid(home, away);
    this.showOverlay(`
      <div class="ov-kicker">HALF TIME</div>
      <h2>${home.score === away.score ? 'Locked up' : home.score > away.score ? 'In front' : 'Chasing'}</h2>
      <div class="final-score">
        <div class="fs-team"><small>${esc(home.abbr || home.name)}</small><b>${esc(home.name)}</b></div>
        <div class="fs-score">${home.score}–${away.score}</div>
        <div class="fs-team"><small>${esc(away.abbr || away.name)}</small><b>${esc(away.name)}</b></div>
      </div>
      ${stats}
      <div class="overlay-actions">
        <button class="btn btn-primary" data-act="second">Start second half</button>
        <button class="btn btn-ghost" data-act="quit">Quit to menu</button>
      </div>`, {
      second: () => {
        this.hideOverlay();
        this.paused = false;
        this.match?.startSecondHalf();
      },
      quit: () => { this.hideOverlay(); this.paused = false; this.exitMatch(); this.onQuit?.(); },
    });
  }

  showFulltime(data) {
    const res = data || this.match?.buildResults();
    if (!res) return;
    const home = res.teams[0];
    const away = res.teams[1];
    const won = res.winner === 'home';
    const draw = res.winner === 'draw';
    const kicker = draw ? 'HONOURS EVEN' : won ? 'YOU WIN' : 'DEFEAT';
    const motm = res.motm;
    this.showOverlay(`
      <div class="ov-kicker">FULL TIME · ${kicker}</div>
      <h2>${draw ? 'A share of the spoils' : won ? 'That is the win' : 'Tough one'}</h2>
      <div class="final-score">
        <div class="fs-team"><small>${esc(home.abbr || home.name)}</small><b>${esc(home.name)}</b></div>
        <div class="fs-score">${home.score}–${away.score}</div>
        <div class="fs-team"><small>${esc(away.abbr || away.name)}</small><b>${esc(away.name)}</b></div>
      </div>
      ${motm ? `<div class="motm"><div><small>PLAYER OF THE MATCH</small><b>${esc(motm.name)} · ${esc(motm.team)}</b><small>${motm.tries} TRIES · ${motm.tackles} TACKLES · ${motm.meters}m</small></div><div class="motm-rating">${motm.rating}</div></div>` : ''}
      ${this.statGrid(home, away)}
      <div class="overlay-actions">
        <button class="btn btn-primary" data-act="again">Run it back</button>
        <button class="btn btn-ghost" data-act="setup">Change match</button>
        <button class="btn btn-ghost" data-act="menu">Back to menu</button>
      </div>`, {
      again: () => { this.hideOverlay(); this.onRestart?.(); },
      setup: () => { this.hideOverlay(); this.exitMatch(); this.showScreen('setup'); },
      menu: () => { this.hideOverlay(); this.exitMatch(); this.onQuit?.(); },
    });
  }

  statGrid(home, away) {
    const h = home.stats || {};
    const a = away.stats || {};
    const possTotal = (h.possession || 0) + (a.possession || 0);
    const hPoss = possTotal > 0 ? Math.round((h.possession / possTotal) * 100) : 50;
    const cell = (label, hv, av) => `<div class="stat-cell"><span>${label}</span><b>${hv} · ${av}</b></div>`;
    return `<div class="stat-grid">
      ${cell('POSSESSION %', hPoss, 100 - hPoss)}
      ${cell('TRIES', h.tries || 0, a.tries || 0)}
      ${cell('TACKLES', h.tackles || 0, a.tackles || 0)}
      ${cell('METRES', Math.round(h.meters || 0), Math.round(a.meters || 0))}
      ${cell('PASSES', h.passes || 0, a.passes || 0)}
      ${cell('TURNOVERS', h.turnovers || 0, a.turnovers || 0)}
    </div>`;
  }
}

export default GameUI;
