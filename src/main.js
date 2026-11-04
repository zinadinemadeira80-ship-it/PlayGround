// ============================================================
// RUCKUS RUGBY — bootstrap, match lifecycle & game loop
// ============================================================
import { loadSave, setSaveState, save as persist } from './storage.js';
import { OPPONENTS, buildRivalTeam } from './data.js';
import { Match } from './engine.js';
import { Renderer } from './renderer.js';
import { GameUI } from './ui.js';
import { input } from './input.js';
import { audio } from './audio.js';

const canvas = document.getElementById('game');
const save = loadSave();
setSaveState(save);
audio.setEnabled(!!save.settings.sound);

const renderer = new Renderer(canvas);
let match = null;
let lastMatchSettings = null;
let ui = null;

function buildHomeData() {
  return {
    id: 'home',
    name: save.team.name,
    abbr: save.team.abbr,
    colors: { ...save.team.colors },
    squad: save.team.squad,
    tactics: { ...save.team.tactics },
    isAI: false,
  };
}

function startMatch(rawSettings = {}) {
  const opponent = OPPONENTS.find((o) => o.id === rawSettings.opponent) || OPPONENTS[0];
  const settings = {
    opponent: opponent.id,
    half: Number(rawSettings.half) || 180,
    difficulty: rawSettings.difficulty || 'normal',
    weather: rawSettings.weather || 'clear',
  };
  lastMatchSettings = { ...settings };
  save.match = { ...settings };
  persist(save);

  const away = buildRivalTeam(opponent, settings.difficulty, Math.floor(Math.random() * 7));
  const plays = (save.equipped || []).slice(0, 4).map((id) => save.plays.find((p) => p.id === id) || null);
  match = new Match(buildHomeData(), away, settings, {
    plays,
    onEvent: (type, data) => ui?.handleMatchEvent(type, data),
  });
  ui.enterMatch(match);
  audio.init();
  audio.setEnabled(!!save.settings.sound);
  if (save.settings.sound) audio.crowdSwell(0.2, 3.2);
}

function restartMatch() {
  if (lastMatchSettings) startMatch(lastMatchSettings);
}

function quitToMenu() {
  match = null;
  input.clear();
  ui.showScreen('menu');
}

ui = new GameUI({
  save,
  renderer,
  onStartMatch: (settings) => startMatch(settings),
  onRestart: () => restartMatch(),
  onQuit: () => quitToMenu(),
});

input.attach();
input.onPause = () => ui.pauseMatch();

// Unlock audio on the first real gesture (browser autoplay policy).
let audioUnlocked = false;
const unlockAudio = () => {
  if (audioUnlocked) return;
  audioUnlocked = true;
  audio.init();
  audio.setEnabled(!!save.settings.sound);
  window.removeEventListener('pointerdown', unlockAudio);
  window.removeEventListener('keydown', unlockAudio);
};
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

// Keep the menu's captain portrait crisp if the device pixel ratio changes.
window.addEventListener('resize', () => {
  if (!match && ui.screen === 'menu') ui.refreshMenu();
});

let last = performance.now();
let running = true;

function frame(now) {
  if (!running) return;
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)) || 0.016;
  last = now;

  if (match) {
    if (input.pressed('pause')) {
      if (ui.paused) ui.resumeFromOverlay();
      else if (!ui.overlayOpen) ui.pauseMatch();
    }
    if (!ui.paused) match.update(dt);
    if (match) {
      renderer.render(match, dt, {
        reducedMotion: !!save.settings.reducedMotion,
        shake: !!save.settings.shake,
      });
      ui.updateHud(dt);
    }
  } else {
    renderer.renderMenu(dt);
  }

  input.endFrame();
  requestAnimationFrame(frame);
}

// Pause the simulation when the tab goes away, but only outside an existing overlay.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && match && !ui.paused && !ui.overlayOpen) {
    if (match.state === 'play' || match.state === 'kickoff' || match.state === 'ruck' || match.state === 'contact' || match.state === 'lineout' || match.state === 'scrum') {
      ui.pauseMatch();
    }
  }
});

ui.showScreen('menu');
requestAnimationFrame(frame);

// Small debug handle for development, automated checks and curious tinkerers.
window.__ruckus = {
  get match() { return match; },
  get lastSettings() { return lastMatchSettings; },
  ui,
  renderer,
  save,
  startMatch,
  restartMatch,
};
