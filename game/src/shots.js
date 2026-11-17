// LUMEN DRIFT — the screenshot scenes behind ?shot=start|play|upgrade|end.
// One clear job: set the world to a named scene by playing the real rules
// forward from a fresh run with a simple autopilot, so each screenshot is
// what a real game looks like and the same seed always gives the same frame.

import { ARENA, STEP, VIEW } from './config.js';
import { STATE_GAMEOVER, STATE_PLAYING, STATE_TITLE, STATE_UPGRADE, STATE_VICTORY } from './world.js';

/** An input stand-in the autopilot drives, matching the Input interface. */
class AutopilotInput {
  constructor(world, skill) {
    this.world = world;
    this.skill = skill;
    this.mouseX = VIEW.width / 2;
    this.mouseY = VIEW.height / 2;
    this._dash = false;
  }

  moveVector() {
    const world = this.world;
    const player = world.player;
    let x = 0;
    let y = 0;
    // Nearest threat.
    let threat = null;
    let threatDist = Infinity;
    for (const enemy of world.enemies) {
      if (enemy.dead || enemy.spawnTimer > 0) continue;
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < threatDist) {
        threatDist = dist;
        threat = enemy;
      }
    }
    if (this.skill === 'careless') {
      // Drift toward the centre and never dodge: it gets caught out.
      x = (VIEW.width / 2 - player.x) / 400;
      y = (VIEW.height / 2 - player.y) / 400;
    } else if (threat && threatDist < 170) {
      // Back away from the nearest enemy.
      x = (player.x - threat.x) / threatDist;
      y = (player.y - threat.y) / threatDist;
    } else {
      // Chase the nearest shard, else hold near the centre.
      let shard = null;
      let shardDist = Infinity;
      for (const item of world.shards) {
        if (item.dead) continue;
        const dist = Math.hypot(item.x - player.x, item.y - player.y);
        if (dist < shardDist) {
          shardDist = dist;
          shard = item;
        }
      }
      const targetX = shard ? shard.x : VIEW.width / 2;
      const targetY = shard ? shard.y : VIEW.height / 2;
      const dx = targetX - player.x;
      const dy = targetY - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 24) {
        x = dx / dist;
        y = dy / dist;
      }
    }
    // Keep inside the arena.
    if (player.x < ARENA.left + 60) x += 0.8;
    if (player.x > ARENA.right - 60) x -= 0.8;
    if (player.y < ARENA.top + 60) y += 0.8;
    if (player.y > ARENA.bottom - 60) y -= 0.8;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    return { x, y };
  }

  get dashRequested() {
    const world = this.world;
    const player = world.player;
    if (this.skill === 'careless' || !player.dashReady) return false;
    for (const enemy of world.enemies) {
      if (enemy.dead || enemy.spawnTimer > 0) continue;
      if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < 95) return true;
    }
    return false;
  }

  /** Aim at the nearest enemy so the ship actually shoots. */
  updateAim() {
    const world = this.world;
    const player = world.player;
    let target = null;
    let best = Infinity;
    for (const enemy of world.enemies) {
      if (enemy.dead || enemy.spawnTimer > 0) continue;
      const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (dist < best) {
        best = dist;
        target = enemy;
      }
    }
    if (target) {
      this.mouseX = target.x;
      this.mouseY = target.y;
    } else {
      this.mouseX = player.x;
      this.mouseY = player.y - 100;
    }
  }

  wasPressed() { return false; }
  down() { return false; }
  endFrame() {}
}

const PLAY_SECONDS = 30;
const UPGRADE_SECONDS = 60;
const END_LIMIT_SECONDS = 300;

/**
 * Set `world` to the named scene and return the state to show.
 * start: the title screen. play: mid-fight in wave 2. upgrade: the card
 * choice after a wave clears. end: the game-over screen.
 */
export function stageShot(name, world) {
  world.reset(world.seed);
  if (name !== 'play' && name !== 'upgrade' && name !== 'end') {
    world.state = STATE_TITLE;
    return { state: STATE_TITLE };
  }
  world.startGame();
  const skill = name === 'end' ? 'careless' : 'steady';
  const limit = name === 'play' ? PLAY_SECONDS : name === 'upgrade' ? UPGRADE_SECONDS : END_LIMIT_SECONDS;
  const input = new AutopilotInput(world, skill);
  const events = [];
  for (let step = 0; step < limit / STEP; step += 1) {
    input.updateAim();
    if (world.state === STATE_UPGRADE) break;
    if (world.state === STATE_GAMEOVER) break;
    if (world.state === STATE_VICTORY) break;
    if (world.state !== STATE_PLAYING) break;
    // The play scene wants a busy frame: stop once wave 3 is under way
    // with several hostiles on screen, instead of after a fixed time.
    if (name === 'play' && world.wave >= 3 && world.enemies.length >= 8) break;
    world.step(STEP, input, events);
    // The upgrade screen is a choice: pick the first card and keep playing
    // only when staging the end scene, so the run reaches a game over.
    if (world.state === STATE_UPGRADE) {
      if (name === 'upgrade') break;
      world.chooseUpgrade(world.upgradeChoices[0]);
    }
  }
  if (name === 'upgrade' && world.state !== STATE_UPGRADE) {
    // The run ended before a wave cleared; fall back to a play frame.
    return { state: STATE_PLAYING };
  }
  if (name === 'end' && world.state !== STATE_GAMEOVER) {
    // Force a game over: the careless pilot survived, so end it plainly.
    world.player.hull = 0;
    world.player.alive = false;
    world.state = STATE_GAMEOVER;
    if (world.score > world.best) world.best = world.score;
  }
  if (name === 'play' && world.state !== STATE_PLAYING) {
    world.startGame();
    return { state: STATE_PLAYING };
  }
  return { state: world.state };
}
