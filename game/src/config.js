// LUMEN DRIFT — tuning and constants.
// One clear job: every number the game balances on lives here, so tuning
// never means hunting through the update or draw code.

export const VIEW = {
  width: 1280,
  height: 720,
};

export const ARENA = {
  // Playfield margin inside the canvas; the ship stays within these bounds.
  left: 24,
  top: 64,
  right: 1256,
  bottom: 696,
};

export const COLORS = {
  background: '#070b1d',
  backgroundEdge: '#0b1030',
  starDim: '#2a3560',
  starBright: '#8fa2ff',
  player: '#37f4e4',
  playerCore: '#eafffb',
  bullet: '#a5f3ff',
  shard: '#ffd94a',
  shardCore: '#fff7cc',
  hull: '#37f4e4',
  hullLow: '#ff5d73',
  enemyDrifter: '#ff5d73',
  enemySpeeder: '#ff9f43',
  enemyOrbiter: '#c26bff',
  enemySplitter: '#ff6b9d',
  enemyWeaver: '#7dff6b',
  enemyBullet: '#ff8fb0',
  text: '#eaf2ff',
  textDim: '#9db1d8',
  panel: 'rgba(10, 16, 44, 0.82)',
  panelEdge: '#2a3a6e',
  accent: '#37f4e4',
  gold: '#ffd94a',
};

export const PLAYER = {
  radius: 16,
  speed: 330,
  maxHull: 100,
  fireInterval: 0.16,
  bulletSpeed: 640,
  bulletRadius: 5,
  bulletDamage: 12,
  dashSpeed: 900,
  dashTime: 0.16,
  dashCooldown: 1.6,
  invulnerableTime: 1.0,
  magnetRadius: 90,
  pickupRadius: 26,
  haloOrbs: 0,
  haloRadius: 64,
  haloDamage: 10,
  haloInterval: 0.45,
};

export const WAVES = {
  // How many enemies each wave spawns, and how the mix shifts as waves rise.
  baseCount: 8,
  perWave: 4,
  spawnInterval: 0.45,
  // Chance weights by enemy kind, interpolated as waves progress.
  mix: [
    { kind: 'drifter', start: 1.0, end: 0.35 },
    { kind: 'speeder', start: 0.0, end: 0.22 },
    { kind: 'orbiter', start: 0.0, end: 0.18 },
    { kind: 'splitter', start: 0.0, end: 0.15 },
    { kind: 'weaver', start: 0.0, end: 0.10 },
  ],
  victoryWave: 10,
  waveClearBonus: 100,
  killScore: 10,
  shardScore: 5,
};

export const ENEMIES = {
  drifter: { radius: 16, speed: 95, hull: 26, damage: 12, score: 10, shards: 1, color: COLORS.enemyDrifter },
  speeder: { radius: 12, speed: 215, hull: 14, damage: 8, score: 15, shards: 1, color: COLORS.enemySpeeder },
  orbiter: { radius: 15, speed: 120, hull: 36, damage: 10, score: 20, shards: 2, color: COLORS.enemyOrbiter },
  splitter: { radius: 26, speed: 60, hull: 64, damage: 18, score: 25, shards: 2, color: COLORS.enemySplitter },
  weaver: { radius: 13, speed: 150, hull: 20, damage: 10, score: 20, shards: 2, color: COLORS.enemyWeaver },
  mite: { radius: 9, speed: 170, hull: 8, damage: 6, score: 5, shards: 0, color: COLORS.enemySplitter },
};

export const STEP = 1 / 60;
