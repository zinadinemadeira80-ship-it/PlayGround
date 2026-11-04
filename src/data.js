// ============================================================
// RUCKUS RUGBY — game data, defaults & content
// ============================================================
import { clamp, uid, shuffle } from './utils.js';

export const STAT_KEYS = ['pace', 'strength', 'handling', 'kicking', 'tackling', 'stamina'];
export const STAT_LABELS = {
  pace: 'Pace',
  strength: 'Strength',
  handling: 'Handling',
  kicking: 'Kicking',
  tackling: 'Tackling',
  stamina: 'Stamina',
};
export const STAT_BUDGET = 46;
export const STAT_MIN = 1;
export const STAT_MAX = 10;

export const SKIN_TONES = ['#f4d6ba', '#e8bb93', '#d99e70', '#bd7d4e', '#96592f', '#6c3d21', '#472816'];
export const HAIR_COLORS = ['#111111', '#241811', '#4a2d1a', '#7a5230', '#b48a52', '#d9d4c8', '#8a2f1d'];
export const HAIR_STYLES = [
  { id: 'short', name: 'Short' },
  { id: 'buzz', name: 'Buzz' },
  { id: 'curly', name: 'Curly' },
  { id: 'long', name: 'Long' },
  { id: 'bald', name: 'Bald' },
  { id: 'afro', name: 'Afro' },
];
export const BUILDS = ['slim', 'athletic', 'power'];
export const GEAR = ['none', 'headband', 'scrumcap'];

export const TRAITS = [
  { id: 'none', name: 'No Trait', desc: 'A clean slate.', icon: '—' },
  { id: 'speedster', name: 'Speedster', desc: '+8% top speed and quicker acceleration.', icon: '⚡' },
  { id: 'bigboot', name: 'Big Boot', desc: '+14% kick power and a wider conversion window.', icon: '🦵' },
  { id: 'playmaker', name: 'Playmaker', desc: '+12% pass accuracy and longer pass range.', icon: '🎯' },
  { id: 'enforcer', name: 'Enforcer', desc: '+15% tackle success and bigger hits.', icon: '💥' },
  { id: 'magician', name: 'Magician', desc: '+18% sidestep success and quicker feet.', icon: '✨' },
  { id: 'engine', name: 'Engine', desc: '+30% stamina and faster recovery.', icon: '🫁' },
  { id: 'safehands', name: 'Safe Hands', desc: 'Half the chance of a knock-on.', icon: '🧤' },
];

export const POSITIONS = [
  { id: 'prop', name: 'Prop', abbr: 'PR', group: 'Forward', stats: { pace: 4, strength: 9, handling: 5, kicking: 2, tackling: 8, stamina: 7 } },
  { id: 'hooker', name: 'Hooker', abbr: 'HK', group: 'Forward', stats: { pace: 5, strength: 8, handling: 7, kicking: 3, tackling: 8, stamina: 8 } },
  { id: 'flanker', name: 'Flanker', abbr: 'FL', group: 'Forward', stats: { pace: 7, strength: 7, handling: 6, kicking: 3, tackling: 8, stamina: 9 } },
  { id: 'scrumhalf', name: 'Scrum-Half', abbr: 'SH', group: 'Back', stats: { pace: 8, strength: 5, handling: 9, kicking: 7, tackling: 5, stamina: 8 } },
  { id: 'flyhalf', name: 'Fly-Half', abbr: 'FH', group: 'Back', stats: { pace: 7, strength: 4, handling: 9, kicking: 9, tackling: 5, stamina: 7 } },
  { id: 'centre', name: 'Centre', abbr: 'CE', group: 'Back', stats: { pace: 8, strength: 7, handling: 7, kicking: 5, tackling: 8, stamina: 7 } },
  { id: 'winger', name: 'Winger', abbr: 'WG', group: 'Back', stats: { pace: 10, strength: 5, handling: 7, kicking: 4, tackling: 6, stamina: 7 } },
  { id: 'utility', name: 'Utility', abbr: 'UT', group: 'Bench', stats: { pace: 7, strength: 6, handling: 7, kicking: 5, tackling: 6, stamina: 7 } },
  { id: 'forward', name: 'Forward', abbr: 'FW', group: 'Bench', stats: { pace: 5, strength: 8, handling: 6, kicking: 3, tackling: 7, stamina: 8 } },
  { id: 'back', name: 'Back', abbr: 'BK', group: 'Bench', stats: { pace: 8, strength: 5, handling: 7, kicking: 6, tackling: 5, stamina: 7 } },
];

export const POSITION_BY_ID = Object.fromEntries(POSITIONS.map((p) => [p.id, p]));

const DEFAULT_APPEARANCES = [
  { skin: SKIN_TONES[5], hair: HAIR_COLORS[0], hairStyle: 'curly', build: 'power', gear: 'none' },
  { skin: SKIN_TONES[4], hair: HAIR_COLORS[1], hairStyle: 'buzz', build: 'power', gear: 'headband' },
  { skin: SKIN_TONES[2], hair: HAIR_COLORS[2], hairStyle: 'short', build: 'athletic', gear: 'none' },
  { skin: SKIN_TONES[4], hair: HAIR_COLORS[0], hairStyle: 'afro', build: 'slim', gear: 'none' },
  { skin: SKIN_TONES[0], hair: HAIR_COLORS[3], hairStyle: 'short', build: 'athletic', gear: 'none' },
  { skin: SKIN_TONES[1], hair: HAIR_COLORS[0], hairStyle: 'long', build: 'athletic', gear: 'headband' },
  { skin: SKIN_TONES[3], hair: HAIR_COLORS[2], hairStyle: 'buzz', build: 'slim', gear: 'none' },
  { skin: SKIN_TONES[2], hair: HAIR_COLORS[1], hairStyle: 'short', build: 'athletic', gear: 'none' },
  { skin: SKIN_TONES[0], hair: HAIR_COLORS[5], hairStyle: 'buzz', build: 'power', gear: 'scrumcap' },
  { skin: SKIN_TONES[5], hair: HAIR_COLORS[0], hairStyle: 'short', build: 'slim', gear: 'none' },
];

const DEFAULT_SQUAD_DEF = [
  ['Tama Rangi', 'prop', 1, 'enforcer'],
  ['Liam Okafor', 'hooker', 2, 'engine'],
  ['Diego Salas', 'flanker', 3, 'speedster'],
  ['Jonah Mbeki', 'scrumhalf', 4, 'playmaker'],
  ['Finn Callahan', 'flyhalf', 5, 'bigboot'],
  ['Kaito Mori', 'centre', 6, 'magician'],
  ['Elias Vaka', 'winger', 7, 'speedster'],
  ['Mateo Cruz', 'utility', 8, 'safehands'],
  ['Sam Whitlock', 'forward', 9, 'engine'],
  ['Noa Bergman', 'back', 10, 'magician'],
];

const STAT_VARIANCE = {
  prop: { pace: -1, strength: 1, handling: -1, kicking: -3, tackling: 1, stamina: 0 },
  hooker: { pace: 0, strength: 0, handling: 0, kicking: -2, tackling: 0, stamina: 0 },
  flanker: { pace: 0, strength: -1, handling: 0, kicking: -2, tackling: 1, stamina: 1 },
  scrumhalf: { pace: 1, strength: -1, handling: 1, kicking: 1, tackling: -1, stamina: 1 },
  flyhalf: { pace: 0, strength: -2, handling: 1, kicking: 1, tackling: -1, stamina: 0 },
  centre: { pace: 1, strength: 0, handling: 0, kicking: 0, tackling: 1, stamina: 0 },
  winger: { pace: 1, strength: -1, handling: 1, kicking: 0, tackling: -1, stamina: 0 },
  utility: { pace: 0, strength: 0, handling: 0, kicking: 0, tackling: 0, stamina: 0 },
  forward: { pace: -1, strength: 1, handling: 0, kicking: -1, tackling: 1, stamina: 1 },
  back: { pace: 1, strength: -1, handling: 0, kicking: 0, tackling: -1, stamina: 0 },
};

export function makePlayer({ name, position, number, trait, appearance, stats, id }) {
  const pos = POSITION_BY_ID[position] || POSITIONS[0];
  const base = { ...pos.stats };
  const variance = STAT_VARIANCE[position] || {};
  const finalStats = {};
  for (const k of STAT_KEYS) {
    finalStats[k] = clamp(Math.round(stats?.[k] ?? base[k] + (variance[k] || 0)), STAT_MIN, STAT_MAX);
  }
  return {
    id: id || uid('p'),
    name,
    number: Number(number) || 1,
    position,
    trait: trait || 'none',
    appearance: { ...(appearance || DEFAULT_APPEARANCES[0]) },
    stats: finalStats,
    bench: pos.group === 'Bench',
    stamina: 100,
  };
}

export function defaultSquad() {
  return DEFAULT_SQUAD_DEF.map(([name, pos, num, trait], i) => {
    const p = makePlayer({
      name,
      position: pos,
      number: num,
      trait,
      appearance: DEFAULT_APPEARANCES[i],
    });
    // trim to leave a few spendable points
    p.stats.stamina = clamp(p.stats.stamina, 1, 10);
    return p;
  });
}

export function playerOverall(p) {
  const avg = STAT_KEYS.reduce((s, k) => s + p.stats[k], 0) / STAT_KEYS.length;
  return clamp(Math.round(45 + avg * 5.5), 40, 99);
}

export function statTotal(p) {
  return STAT_KEYS.reduce((s, k) => s + p.stats[k], 0);
}

export function teamOverall(team) {
  const starters = team.squad.filter((p) => !p.bench).slice(0, 7);
  if (!starters.length) return 70;
  return Math.round(starters.reduce((s, p) => s + playerOverall(p), 0) / starters.length);
}

export function playerRatingLabel(p) {
  const ovr = playerOverall(p);
  if (ovr >= 90) return 'WORLD CLASS';
  if (ovr >= 84) return 'STANDOUT';
  if (ovr >= 78) return 'SOLID';
  if (ovr >= 70) return 'DEVELOPING';
  return 'PROJECT';
}

export function defaultPlaybook() {
  return [
    {
      id: uid('play'),
      name: 'WIDE SWEEP',
      receiver: 2,
      players: [
        { start: [-2, -4], route: [[-1, 2], [8, 6], [20, 10]] },
        { start: [-4, 4], route: [[-2, 8], [6, 14], [18, 18]] },
        { start: [-6, -9], route: [[-6, -4], [2, 2], [14, 8], [26, 12]] },
        { start: [-7, 0], route: [[-4, 2], [4, 0], [12, -4]] },
        { start: [-10, 6], route: [[-6, 4], [2, 2], [10, 0]] },
        { start: [-13, -6], route: [[-10, -4], [-2, -6], [8, -8]] },
      ],
    },
    {
      id: uid('play'),
      name: 'CRASH BALL',
      receiver: 0,
      players: [
        { start: [-3, -1], route: [[-1, 0], [4, 0], [10, -2]] },
        { start: [-3, 3], route: [[-1, 2], [4, 4], [10, 6]] },
        { start: [-5, -5], route: [[-2, -2], [6, 2], [14, 4]] },
        { start: [-7, 2], route: [[-4, 4], [4, 8], [12, 12]] },
        { start: [-10, 0], route: [[-6, 0], [2, 0], [10, 0]] },
        { start: [-12, 7], route: [[-8, 5], [0, 2], [8, 0]] },
      ],
    },
    {
      id: uid('play'),
      name: 'BLINDSIDE SNAP',
      receiver: 1,
      players: [
        { start: [-2, 2], route: [[-2, 6], [-1, 12], [2, 18]] },
        { start: [-4, -2], route: [[-4, -6], [0, -8], [6, -10]] },
        { start: [-5, 5], route: [[-3, 7], [3, 12], [10, 18]] },
        { start: [-8, 2], route: [[-5, 4], [2, 6], [10, 8]] },
        { start: [-11, -4], route: [[-7, -2], [0, 0], [8, 4]] },
        { start: [-13, 8], route: [[-9, 6], [-2, 4], [6, 2]] },
      ],
    },
  ];
}

export const ATTACK_STYLES = [
  {
    id: 'balanced', name: 'Balanced', icon: '⇄',
    short: 'KEEP IT ALIVE', desc: 'Width when it is on, direct when it is not. The complete attacking shape.',
    width: 1.0, depth: 1.0, pass: 0.5, kick: 0.3, supportRuns: 0.5,
  },
  {
    id: 'wide', name: 'Wide Channel', icon: '↔',
    short: 'STRETCH THE LINE', desc: 'Two pods of runners, huge width and quick hands to the edges.',
    width: 1.55, depth: 1.2, pass: 0.78, kick: 0.08, supportRuns: 0.72,
  },
  {
    id: 'direct', name: 'Tight Carry', icon: '▼',
    short: 'WIN THE COLLISION', desc: 'Pods close to the ruck, one-out carries and dominant collisions.',
    width: 0.55, depth: 0.65, pass: 0.28, kick: 0.12, supportRuns: 0.35,
  },
  {
    id: 'kicking', name: 'Kick & Chase', icon: '↟',
    short: 'PLAY THE CORNERS', desc: 'Territory first. Boot it deep and swarm the receiver.',
    width: 0.85, depth: 0.9, pass: 0.32, kick: 0.82, supportRuns: 0.4,
  },
  {
    id: 'expansive', name: 'Expansive', icon: '✦',
    short: 'ALL-OUT ATTACK', desc: 'Risky, fast and beautiful. Offloads, second touches, chaos.',
    width: 1.3, depth: 1.5, pass: 0.9, kick: 0.03, supportRuns: 0.9,
  },
];

export const DEFENSE_STYLES = [
  {
    id: 'line', name: 'Flat Line', icon: '━',
    short: 'HOLD THE SHAPE', desc: 'A connected flat line that slides together and shuts down the edges.',
    speed: 1.0, aggression: 0.72, depth: 9, drift: 0.35, rush: 0.35,
  },
  {
    id: 'blitz', name: 'Blitz', icon: '↯',
    short: 'PRESSURE THE BALL', desc: 'Fly up fast, close the space and force the mistake. High risk, high reward.',
    speed: 1.2, aggression: 0.96, depth: 5, drift: 0.15, rush: 0.9,
  },
  {
    id: 'drift', name: 'Drift', icon: '⤿',
    short: 'SHOW THEM OUTSIDE', desc: 'Slide off the ball and shepherd attackers toward the touchline.',
    speed: 1.03, aggression: 0.62, depth: 11, drift: 0.82, rush: 0.25,
  },
  {
    id: 'deep', name: 'Deep Cover', icon: '⌂',
    short: 'DEFEND THE SPACE', desc: 'Drop deep, protect the back field and trust the scramble.',
    speed: 0.94, aggression: 0.5, depth: 17, drift: 0.45, rush: 0.12,
  },
];

export const STYLE_ATTACK = Object.fromEntries(ATTACK_STYLES.map((s) => [s.id, s]));
export const STYLE_DEFENSE = Object.fromEntries(DEFENSE_STYLES.map((s) => [s.id, s]));

export const OPPONENTS = [
  {
    id: 'bulls', name: 'Northern Bulls', abbr: 'BUL', rating: 78, style: 'direct', defense: 'blitz',
    colors: { primary: '#24479b', secondary: '#f2ede1', shorts: '#132a5c', socks: '#24479b', pattern: 'hoops' },
    blurb: 'Hard carriers, flat defence', names: ['V. King', 'R. Halloran', 'B. Achebe', 'T. Novak', 'J. Storm', 'K. Rewiti', 'M. Delgado'],
  },
  {
    id: 'sharks', name: 'Coastal Sharks', abbr: 'SHK', rating: 81, style: 'wide', defense: 'drift',
    colors: { primary: '#0e7d78', secondary: '#071f1d', shorts: '#071f1d', socks: '#0e7d78', pattern: 'sash' },
    blurb: 'Fast hands, wider than the sea', names: ['A. Tupou', 'S. Baptiste', 'L. Ferris', 'M. Nawaqa', 'D. Osei', 'R. Iona', 'C. Pike'],
  },
  {
    id: 'rams', name: 'Highland Rams', abbr: 'RAM', rating: 74, style: 'kicking', defense: 'deep',
    colors: { primary: '#7f2433', secondary: '#f2e7d5', shorts: '#3d121a', socks: '#7f2433', pattern: 'stripes' },
    blurb: 'Territory, pressure, penalties', names: ['G. MacLeod', 'P. Fraser', 'E. Dunbar', 'N. Kerr', 'H. Blair', 'O. Munro', 'W. Geddes'],
  },
  {
    id: 'kings', name: 'City Kings', abbr: 'KNG', rating: 85, style: 'expansive', defense: 'line',
    colors: { primary: '#4a2e75', secondary: '#e7c95c', shorts: '#241238', socks: '#e7c95c', pattern: 'shoulders' },
    blurb: 'The benchmark. Stars everywhere.', names: ['J. Adeyemi', 'T. Laurent', 'C. Silva', 'R. Ito', 'M. Baggio', 'S. Kriel', 'L. Voss'],
  },
];

export const RIVAL_FIRST_NAMES = ['J.', 'T.', 'M.', 'R.', 'S.', 'K.', 'D.', 'L.', 'A.', 'C.', 'N.', 'B.', 'E.', 'P.', 'H.', 'F.'];

export function buildRivalTeam(opp, difficulty = 'normal', seed = 0) {
  const players = [];
  const diffBump = difficulty === 'hard' ? 2 : difficulty === 'easy' ? -3 : 0;
  const baseRating = clamp(opp.rating + diffBump, 60, 92);
  const positions = ['prop', 'hooker', 'flanker', 'scrumhalf', 'flyhalf', 'centre', 'winger'];
  const benchPos = ['utility', 'forward', 'back'];
  const names = shuffle(opp.names);
  const usedNames = new Set();
  for (let i = 0; i < 7; i++) {
    const pos = positions[i];
    const base = POSITION_BY_ID[pos].stats;
    const targetAvg = (baseRating - 45) / 5.5;
    const stats = {};
    for (const k of STAT_KEYS) {
      // blend position template toward target average
      const v = base[k] * 0.55 + targetAvg * 0.45 + (i % 3 === 0 ? 0.4 : 0);
      stats[k] = clamp(Math.round(v + (Math.random() < 0.35 ? 1 : 0)), 2, 10);
    }
    let name = names.find((n) => !usedNames.has(n)) || `${RIVAL_FIRST_NAMES[i]} Rival`;
    usedNames.add(name);
    const p = makePlayer({
      name,
      position: pos,
      number: i + 1,
      trait: ['enforcer', 'speedster', 'engine', 'playmaker', 'bigboot', 'magician', 'safehands'][(i + seed) % 7],
      appearance: {
        skin: SKIN_TONES[(i + seed) % SKIN_TONES.length],
        hair: HAIR_COLORS[(i + seed + 2) % HAIR_COLORS.length],
        hairStyle: HAIR_STYLES[(i + seed) % HAIR_STYLES.length].id,
        build: i % 3 === 0 ? 'power' : i % 3 === 1 ? 'athletic' : 'slim',
        gear: i === 1 ? 'headband' : 'none',
      },
      stats,
    });
    players.push(p);
  }
  for (let i = 0; i < 3; i++) {
    const pos = benchPos[i];
    const base = POSITION_BY_ID[pos].stats;
    const stats = {};
    for (const k of STAT_KEYS) stats[k] = clamp(base[k] + (baseRating > 78 ? 1 : 0), 2, 10);
    players.push(makePlayer({
      name: `${RIVAL_FIRST_NAMES[(i + 5) % RIVAL_FIRST_NAMES.length]} ${opp.abbr === 'BUL' ? 'Storm' : opp.abbr === 'SHK' ? 'Reef' : opp.abbr === 'RAM' ? 'Braid' : 'Crown'}`,
      position: pos,
      number: 8 + i,
      trait: ['engine', 'safehands', 'speedster'][i],
      appearance: { ...DEFAULT_APPEARANCES[(i + 3) % DEFAULT_APPEARANCES.length] },
      stats,
    }));
  }
  return {
    id: opp.id,
    name: opp.name,
    abbr: opp.abbr,
    colors: { ...opp.colors },
    squad: players,
    tactics: { attack: opp.style, defense: opp.defense },
    overall: baseRating,
    isAI: true,
  };
}

export function defaultTeam() {
  return {
    name: 'Ruckus RFC',
    abbr: 'RUK',
    colors: { primary: '#f2c53d', secondary: '#0d2b1c', shorts: '#0d2b1c', socks: '#f2c53d', pattern: 'sash' },
    squad: defaultSquad(),
    tactics: { attack: 'balanced', defense: 'line' },
  };
}

export const TIPS = [
  "Get to the breakdown first. A quick ruck wins the next ruck.",
  "A grubber into space is worth more than a hospital pass.",
  "Press L just before contact to slip the tackle. Timing beats speed.",
  "The first receiver runs the line you draw in the Playbook. Give them space.",
  "Kick to the corners and chase in a line. Never chase alone.",
  "Stamina wins the last five minutes. Sprint with purpose, not panic.",
  "A forward pod close to the ruck drags defenders in. Then go wide.",
  "Hold the kick button to fill the power bar. Tap for a low grubber.",
  "Win the lineout timing bar and the whole pitch opens up.",
  "On defence, press Q to switch to the closest tackler.",
  "Set plays are free money in the 22. Equip one for the red zone.",
];

export const COMMENTARY = {
  kickoff: ['Kick-off! Here we go.', 'The whistle blows — we are under way.', 'First kick of the match.'],
  kick: ['That is a huge boot!', 'Good territory from the boot.', 'Kicked into space.'],
  grubber: ['Cheeky grubber in behind!', 'Low kick along the deck.'],
  try: ['TRY! What a finish!', 'TRY! The line is broken!', 'That is a superb try!'],
  conversion: ['The conversion is good.', 'Straight through the middle.'],
  miss: ['The conversion drifts wide.', 'No — it stays out.'],
  tackle: ['Big hit in midfield!', 'Driven back in the tackle.', 'Textbook tackle.'],
  bigHit: ['OH! What a collision!', 'That is a monster hit!', 'Knocked backwards!'],
  broken: ['Broken tackle! He is away!', 'Slipped through the fingers!'],
  turnover: ['Turnover! Great work at the breakdown.', 'Stolen at the ruck!'],
  lineout: ['Into touch. Lineout time.', 'The ball finds the touchline.'],
  scrum: ['Knock-on. Scrum it is.', 'Forward pass. We will pack down.'],
  scrumWon: ['The pack does the job.', 'Scrum won, ball away.'],
  ruckWon: ['Quick ball from the ruck.', 'Recycled cleanly.'],
  fifty: ['Halfway there.', 'A big forty minutes coming up.'],
};

export const STADIUM = {
  names: ['THE YARD', 'FORT RUCKUS', 'NORTH BANK'],
};
