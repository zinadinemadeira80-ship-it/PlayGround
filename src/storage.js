// ============================================================
// RUCKUS RUGBY — persistence
// ============================================================
import { deepMerge, clone } from './utils.js';
import { defaultTeam, defaultPlaybook, STAT_KEYS, STAT_MIN, STAT_MAX, STAT_BUDGET } from './data.js';

const KEY = 'ruckus-rugby-save-v1';

export const DEFAULT_SETTINGS = {
  sound: true,
  commentary: true,
  shake: true,
  reducedMotion: false,
  hints: true,
  difficulty: 'normal',
};

export const DEFAULT_MATCH = {
  opponent: 'bulls',
  half: 180,
  difficulty: 'normal',
  weather: 'clear',
};

export function freshSave() {
  const team = defaultTeam();
  const plays = defaultPlaybook();
  return {
    version: 1,
    team,
    plays,
    equipped: [...plays.map((p) => p.id), null, null, null, null].slice(0, 4),
    settings: { ...DEFAULT_SETTINGS },
    match: { ...DEFAULT_MATCH },
  };
}

function sanitizePlayer(p) {
  if (!p || typeof p !== 'object') return null;
  const stats = {};
  for (const k of STAT_KEYS) {
    stats[k] = Math.max(STAT_MIN, Math.min(STAT_MAX, Number(p.stats?.[k]) || 6));
  }
  return {
    id: String(p.id || ''),
    name: String(p.name || 'Player').slice(0, 18),
    number: Math.max(1, Math.min(99, Number(p.number) || 1)),
    position: String(p.position || 'utility'),
    trait: String(p.trait || 'none'),
    appearance: {
      skin: String(p.appearance?.skin || '#d99e70'),
      hair: String(p.appearance?.hair || '#241811'),
      hairStyle: String(p.appearance?.hairStyle || 'short'),
      build: String(p.appearance?.build || 'athletic'),
      gear: String(p.appearance?.gear || 'none'),
    },
    stats,
    bench: Boolean(p.bench),
  };
}

function sanitizePlay(play) {
  if (!play || typeof play !== 'object') return null;
  const players = Array.isArray(play.players) ? play.players.slice(0, 6).map((pl) => ({
    start: [Number(pl?.start?.[0]) || 0, Number(pl?.start?.[1]) || 0],
    route: Array.isArray(pl?.route) ? pl.route.slice(0, 8).map((pt) => [Number(pt?.[0]) || 0, Number(pt?.[1]) || 0]) : [],
  })) : [];
  return {
    id: String(play.id || ''),
    name: String(play.name || 'UNTITLED').slice(0, 26).toUpperCase(),
    receiver: Math.max(0, Math.min(5, Number(play.receiver) || 0)),
    players,
  };
}

export function sanitizeSave(raw) {
  const base = freshSave();
  if (!raw || typeof raw !== 'object') return base;

  const out = deepMerge(base, {});
  out.team = {
    ...out.team,
    name: String(raw.team?.name || out.team.name).slice(0, 22),
    abbr: String(raw.team?.abbr || out.team.abbr).slice(0, 4).toUpperCase(),
    colors: deepMerge(out.team.colors, raw.team?.colors || {}),
    tactics: deepMerge(out.team.tactics, raw.team?.tactics || {}),
  };

  if (Array.isArray(raw.team?.squad) && raw.team.squad.length) {
    const squad = raw.team.squad.map(sanitizePlayer).filter(Boolean).slice(0, 10);
    if (squad.length === 10) out.team.squad = squad;
  }

  if (Array.isArray(raw.plays)) {
    const plays = raw.plays.map(sanitizePlay).filter((p) => p && p.players.length === 6);
    if (plays.length) out.plays = plays;
  }

  if (Array.isArray(raw.equipped)) {
    const valid = Array.from({ length: 4 }, (_, i) => {
      const id = raw.equipped[i];
      return out.plays.some((p) => p.id === id) ? id : null;
    });
    out.equipped = valid;
  }
  if (!out.equipped.some(Boolean)) {
    const fallback = out.plays.slice(0, 4).map((p) => p.id);
    while (fallback.length < 4) fallback.push(null);
    out.equipped = fallback;
  }

  out.settings = { ...DEFAULT_SETTINGS, ...(raw.settings || {}) };
  out.match = { ...DEFAULT_MATCH, ...(raw.match || {}) };
  out.settings.sound = Boolean(out.settings.sound);
  out.settings.commentary = Boolean(out.settings.commentary);
  out.settings.shake = Boolean(out.settings.shake);
  out.settings.hints = Boolean(out.settings.hints);
  out.settings.reducedMotion = Boolean(out.settings.reducedMotion);
  if (!['easy', 'normal', 'hard'].includes(out.settings.difficulty)) out.settings.difficulty = 'normal';
  if (!['clear', 'rain', 'night'].includes(out.match.weather)) out.match.weather = 'clear';
  if (!['easy', 'normal', 'hard'].includes(out.match.difficulty)) out.match.difficulty = 'normal';
  if (![90, 180, 300].includes(Number(out.match.half))) out.match.half = 180;

  // clamp budget overall across starters (soft guard against edited saves)
  return out;
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const fresh = freshSave();
      queueMicrotask(() => save(fresh));
      return fresh;
    }
    return sanitizeSave(JSON.parse(raw));
  } catch (e) {
    console.warn('Save load failed, starting fresh', e);
    return freshSave();
  }
}

export let saveState = null;

export function setSaveState(s) {
  saveState = s;
}

export function save(state) {
  const target = state || saveState;
  if (!target) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(target));
  } catch (e) {
    console.warn('Save failed', e);
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

export function exportSaveSummary(team) {
  return {
    name: team.name,
    abbr: team.abbr,
    squad: clone(team.squad),
    budget: STAT_BUDGET,
  };
}
