// ---------------------------------------------------------------------------
// DRAGON BALL SUPER: ULTRA CLASH - game data
// ---------------------------------------------------------------------------

export const WORLD = {
  width: 1600,
  height: 900,
  ground: 762,
  left: 150,
  right: 1450
}

export const FORMS = [
  {
    id: 'base',
    name: 'BASE FORM',
    full: 'Base Form',
    hair: '#17181d',
    hair2: '#2b2d36',
    aura: '#fff1bd',
    aura2: '#ffffff',
    auraAlpha: 0.30,
    eye: '#141821',
    lightning: false,
    longHair: false,
    dmg: 1,
    speed: 1,
    defense: 1,
    kiRegen: 8,
    power: 1,
    powerLevel: 3000000,
    dodge: 0,
    tag: 'Earth-raised Saiyan',
    hint: 'The legendary warrior awakens.'
  },
  {
    id: 'ssj',
    name: 'SUPER SAIYAN',
    full: 'Super Saiyan',
    hair: '#ffd23f',
    hair2: '#ffe886',
    aura: '#ffc928',
    aura2: '#fff2a8',
    auraAlpha: 0.55,
    eye: '#24b6b0',
    lightning: false,
    longHair: false,
    dmg: 1.34,
    speed: 1.12,
    defense: 1.06,
    kiRegen: 10,
    power: 1.8,
    powerLevel: 150000000,
    dodge: 0,
    tag: 'The golden awakening',
    hint: 'Golden fury. Power surges through every cell.'
  },
  {
    id: 'ssj2',
    name: 'SUPER SAIYAN 2',
    full: 'Super Saiyan 2',
    hair: '#ffe14d',
    hair2: '#fff6ae',
    aura: '#ffd63a',
    aura2: '#ffffff',
    auraAlpha: 0.66,
    eye: '#39d7c9',
    lightning: true,
    longHair: false,
    dmg: 1.72,
    speed: 1.22,
    defense: 1.11,
    kiRegen: 11,
    power: 2.9,
    powerLevel: 600000000,
    dodge: 0.04,
    tag: 'Lightning of the Saiyan elite',
    hint: 'The air cracks. Lightning answers your call.'
  },
  {
    id: 'ssj3',
    name: 'SUPER SAIYAN 3',
    full: 'Super Saiyan 3',
    hair: '#ffdd43',
    hair2: '#fff3a0',
    aura: '#ffcf1f',
    aura2: '#fff6c4',
    auraAlpha: 0.78,
    eye: '#39d7c9',
    lightning: true,
    longHair: true,
    dmg: 2.22,
    speed: 1.28,
    defense: 1.15,
    kiRegen: 8,
    power: 4.7,
    powerLevel: 2400000000,
    dodge: 0.06,
    tag: 'Beyond the limit',
    hint: 'Hair to the earth, ki like a sun.'
  },
  {
    id: 'god',
    name: 'SUPER SAIYAN GOD',
    full: 'Super Saiyan God',
    hair: '#e4465d',
    hair2: '#ff7d8c',
    aura: '#ff4c6e',
    aura2: '#ffd3df',
    auraAlpha: 0.58,
    eye: '#ff5b65',
    lightning: false,
    longHair: false,
    dmg: 2.75,
    speed: 1.38,
    defense: 1.22,
    kiRegen: 14,
    power: 7.4,
    powerLevel: 8000000000,
    dodge: 0.10,
    tag: 'Divine ki, mortal will',
    hint: 'God ki burns clean and silent.'
  },
  {
    id: 'blue',
    name: 'SUPER SAIYAN BLUE',
    full: 'Super Saiyan Blue',
    hair: '#45d8ff',
    hair2: '#b7f3ff',
    aura: '#28c8ff',
    aura2: '#d6f8ff',
    auraAlpha: 0.68,
    eye: '#7ff3ff',
    lightning: true,
    longHair: false,
    dmg: 3.45,
    speed: 1.48,
    defense: 1.28,
    kiRegen: 16,
    power: 11.5,
    powerLevel: 40000000000,
    dodge: 0.14,
    tag: 'God ki, Saiyan rage',
    hint: 'Divine power under perfect control.'
  },
  {
    id: 'bluekk',
    name: 'BLUE KAIOKEN',
    full: 'Super Saiyan Blue Kaioken',
    hair: '#55e2ff',
    hair2: '#d2fbff',
    aura: '#ff3048',
    aura2: '#5ce9ff',
    auraAlpha: 0.86,
    eye: '#9afaff',
    lightning: true,
    longHair: false,
    dmg: 4.35,
    speed: 1.68,
    defense: 1.14,
    kiRegen: 13,
    power: 16.5,
    powerLevel: 80000000000,
    dodge: 0.17,
    tag: 'Kaio-ken times twenty',
    hint: 'Crimson aura. The body screams. Power answers.'
  },
  {
    id: 'ui',
    name: 'ULTRA INSTINCT -SIGN-',
    full: 'Ultra Instinct -Sign-',
    hair: '#b9c7dc',
    hair2: '#eef3fb',
    aura: '#9cc3ff',
    aura2: '#ffffff',
    auraAlpha: 0.72,
    eye: '#d7e7ff',
    lightning: false,
    longHair: false,
    dmg: 5.35,
    speed: 1.78,
    defense: 1.38,
    kiRegen: 18,
    power: 22,
    powerLevel: 200000000000,
    dodge: 0.28,
    tag: 'The body moves without thought',
    hint: 'No wasted motion. No hesitation.'
  },
  {
    id: 'mui',
    name: 'MASTERED ULTRA INSTINCT',
    full: 'Mastered Ultra Instinct',
    hair: '#f4f7ff',
    hair2: '#ffffff',
    aura: '#ffffff',
    aura2: '#cfe3ff',
    auraAlpha: 0.92,
    eye: '#ffffff',
    lightning: true,
    longHair: false,
    dmg: 6.6,
    speed: 1.9,
    defense: 1.5,
    kiRegen: 22,
    power: 30,
    powerLevel: 500000000000,
    dodge: 0.38,
    tag: 'The angelic state',
    hint: 'Silence. Then the universe moves around you.'
  }
]

export const TECHNIQUES = [
  {
    id: 'solar',
    key: '1',
    name: 'SOLAR FLARE',
    short: 'SOLAR',
    glyph: '☀',
    cost: 20,
    cooldown: 9,
    minForm: 0,
    color: '#ffe066',
    desc: 'A blinding flash that stuns the enemy.'
  },
  {
    id: 'teleport',
    key: '2',
    name: 'INSTANT TRANSMISSION',
    short: 'TELEPORT',
    glyph: '瞬',
    cost: 15,
    cooldown: 6,
    minForm: 0,
    color: '#8ad8ff',
    desc: 'Vanish and reappear behind the enemy. Next hit is a critical.'
  },
  {
    id: 'dragonfist',
    key: '3',
    name: 'DRAGON FIST',
    short: 'DRAGON',
    glyph: '龍',
    cost: 35,
    cooldown: 11,
    minForm: 1,
    color: '#ffc93c',
    desc: 'A golden dragon charges with your fist. Massive damage.'
  },
  {
    id: 'spiritbomb',
    key: '4',
    name: 'SPIRIT BOMB',
    short: 'SPIRIT',
    glyph: '✦',
    cost: 0,
    cooldown: 26,
    minForm: 2,
    spirit: 100,
    color: '#8fe9ff',
    desc: 'Gather the energy of the living. Requires a full spirit gauge.'
  }
]

export const ENEMIES = [
  {
    id: 'frieza',
    name: 'FRIEZA',
    title: 'EMPEROR OF EVIL',
    quote: '“You will learn what true terror feels like.”',
    hp: 920,
    damage: 8.4,
    speed: 0.94,
    scale: 0.98,
    stage: 'THE TYRANT',
    powerLevel: 120000000,
    aura: '#a050ff',
    aura2: '#e3b7ff',
    look: {
      body: 'frieza',
      skin: '#d9c7ef',
      skin2: '#b49bd8',
      armor: '#f5f0ff',
      accent: '#7a3bd6',
      eye: '#ff2d55',
      hair: '#6d2bb8',
      suit: '#f2edff',
      suit2: '#cbb9ea'
    },
    attacks: [
      { id: 'deathbeam', name: 'DEATH BEAM', type: 'beam', color: '#ff315f', cd: 5.5 },
      { id: 'deathball', name: 'DEATH BALL', type: 'orb', color: '#b04bff', cd: 8 }
    ],
    intro: 'The galaxy’s cruelest emperor descends on the arena.'
  },
  {
    id: 'cell',
    name: 'PERFECT CELL',
    title: 'THE PERFECT WARRIOR',
    quote: '“Perfection has no equal.”',
    hp: 1260,
    damage: 9.6,
    speed: 1.0,
    scale: 1.06,
    stage: 'THE BIO-ANDROID',
    powerLevel: 900000000,
    aura: '#69ff8a',
    aura2: '#d7ffe3',
    look: {
      body: 'cell',
      skin: '#69c96d',
      skin2: '#3d8d4a',
      armor: '#1a2220',
      accent: '#74ff8e',
      eye: '#ff4d4d',
      hair: '#16211b',
      suit: '#1a2220',
      suit2: '#0f1413'
    },
    attacks: [
      { id: 'cellbeam', name: 'SOLAR KAMEHAMEHA', type: 'beam', color: '#7bff9c', cd: 6 },
      { id: 'barrier', name: 'PERFECT BARRIER', type: 'aoe', color: '#8affad', cd: 9 }
    ],
    intro: 'Perfection, reconstructed from the strongest cells in the universe.'
  },
  {
    id: 'buu',
    name: 'KID BUU',
    title: 'THE ANCIENT CALAMITY',
    quote: '“Buu will turn you into candy!”',
    hp: 1500,
    damage: 10.2,
    speed: 1.10,
    scale: 1.05,
    stage: 'THE MAJIN',
    powerLevel: 3000000000,
    aura: '#ff7cc6',
    aura2: '#ffd1ec',
    regen: 4,
    look: {
      body: 'buu',
      skin: '#f7a8d4',
      skin2: '#d77bb0',
      armor: '#2b1a34',
      accent: '#ff87cf',
      eye: '#7b2c5a',
      hair: '#f7a8d4',
      suit: '#2b1a34',
      suit2: '#1a1020'
    },
    attacks: [
      { id: 'candybeam', name: 'CANDY BEAM', type: 'beam', color: '#ff7bd6', cd: 6.5, stun: 1.6 },
      { id: 'angry', name: 'ANGRY EXPLOSION', type: 'aoe', color: '#ff5fba', cd: 8.5 }
    ],
    intro: 'A pink nightmare with the power to erase worlds.'
  },
  {
    id: 'golden',
    name: 'GOLDEN FRIEZA',
    title: 'THE GOLDEN EMPEROR',
    quote: '“I will paint this arena with your ashes.”',
    hp: 1840,
    damage: 12.2,
    speed: 1.16,
    scale: 1.0,
    stage: 'THE GOLDEN TYRANT',
    powerLevel: 25000000000,
    aura: '#ffd23f',
    aura2: '#fff1a8',
    look: {
      body: 'frieza',
      skin: '#ffd95a',
      skin2: '#d6a91e',
      armor: '#fff2a8',
      accent: '#ffb300',
      eye: '#ff3050',
      hair: '#c98f00',
      suit: '#ffe889',
      suit2: '#c9a12f'
    },
    attacks: [
      { id: 'goldbeam', name: 'DEATH BEAM BARRAGE', type: 'volley', color: '#ffcf3f', cd: 5 },
      { id: 'emperor', name: 'EMPEROR’S BLAST', type: 'beam', color: '#ffdc5e', cd: 8 }
    ],
    intro: 'Frieza has unlocked his golden form. The arena will not survive.'
  },
  {
    id: 'black',
    name: 'GOKU BLACK',
    title: 'THE FALSE GOD',
    quote: '“Your body will serve a higher purpose.”',
    hp: 2180,
    damage: 13.2,
    speed: 1.24,
    scale: 1.03,
    stage: 'THE ROSE',
    powerLevel: 60000000000,
    aura: '#ff5d9e',
    aura2: '#ffd0e5',
    look: {
      body: 'black',
      skin: '#f0c49c',
      skin2: '#c9946c',
      armor: '#1a1820',
      accent: '#ff5d9e',
      eye: '#ffd0e5',
      hair: '#ff70b8',
      suit: '#17151d',
      suit2: '#0d0c11'
    },
    attacks: [
      { id: 'blackbeam', name: 'BLACK KAMEHAMEHA', type: 'beam', color: '#ff6aae', cd: 5.5 },
      { id: 'divine', name: 'DIVINE RETRIBUTION', type: 'volley', color: '#ff8cc4', cd: 7 }
    ],
    intro: 'A stolen body, a stolen power, and a god complex without limits.'
  },
  {
    id: 'broly',
    name: 'BROLY',
    title: 'THE LEGENDARY SUPER SAIYAN',
    quote: '“KAKAROT!!!”',
    hp: 2620,
    damage: 15.4,
    speed: 1.06,
    scale: 1.28,
    stage: 'THE BERSERKER',
    powerLevel: 120000000000,
    aura: '#a5ff4b',
    aura2: '#e8ffbf',
    look: {
      body: 'broly',
      skin: '#f0c39b',
      skin2: '#c48c64',
      armor: '#2c2b25',
      accent: '#a5ff4b',
      eye: '#d7ff6a',
      hair: '#d8ff68',
      suit: '#3a3830',
      suit2: '#24231d'
    },
    attacks: [
      { id: 'mouth', name: 'GIGANTIC ROAR', type: 'beam', color: '#b8ff56', cd: 6 },
      { id: 'gigantic', name: 'GIGANTIC IMPACT', type: 'dash', color: '#d3ff77', cd: 8 }
    ],
    intro: 'The Legendary Super Saiyan. Rage given flesh.'
  },
  {
    id: 'beerus',
    name: 'BEERUS',
    title: 'GOD OF DESTRUCTION',
    quote: '“Entertain me, or be erased.”',
    hp: 2960,
    damage: 16.8,
    speed: 1.3,
    scale: 1.09,
    stage: 'DESTRUCTION',
    powerLevel: 220000000000,
    aura: '#c45bff',
    aura2: '#f0c8ff',
    look: {
      body: 'beerus',
      skin: '#b98ad8',
      skin2: '#8b5ea8',
      armor: '#221a2e',
      accent: '#c86bff',
      eye: '#ffd75e',
      hair: '#744296',
      suit: '#241b31',
      suit2: '#15101d'
    },
    attacks: [
      { id: 'sphere', name: 'SPHERE OF DESTRUCTION', type: 'orb', color: '#c86bff', cd: 5.5 },
      { id: 'hakai', name: 'HAKAI', type: 'beam', color: '#e5a6ff', cd: 8 }
    ],
    intro: 'The God of Destruction has taken an interest in your power.'
  },
  {
    id: 'jiren',
    name: 'JIREN',
    title: 'THE MORTAL STRONGER THAN A GOD',
    quote: '“Strength is the only truth.”',
    hp: 3520,
    damage: 18.6,
    speed: 1.36,
    scale: 1.12,
    stage: 'THE FINAL WALL',
    powerLevel: 500000000000,
    aura: '#ff5b4d',
    aura2: '#ffd0c8',
    look: {
      body: 'jiren',
      skin: '#a9b0b8',
      skin2: '#747d88',
      armor: '#1b1e24',
      accent: '#ff5b4d',
      eye: '#ff624d',
      hair: '#171a20',
      suit: '#20242b',
      suit2: '#101216'
    },
    attacks: [
      { id: 'powerimpact', name: 'POWER IMPACT', type: 'orb', color: '#ff6250', cd: 4.8 },
      { id: 'heatwave', name: 'HEATWAVE', type: 'aoe', color: '#ff8a5c', cd: 8 }
    ],
    intro: 'The strongest mortal in the multiverse. One last wall stands in your way.'
  }
]

export function formatPower(value) {
  if (value >= 1e12) return (value / 1e12).toFixed(value >= 1e13 ? 0 : 1) + 'T'
  if (value >= 1e9) return (value / 1e9).toFixed(value >= 1e10 ? 0 : 1) + 'B'
  if (value >= 1e6) return (value / 1e6).toFixed(value >= 1e7 ? 0 : 1) + 'M'
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K'
  return String(Math.round(value))
}

export function formatNumber(value) {
  return Math.round(value).toLocaleString('en-US')
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
