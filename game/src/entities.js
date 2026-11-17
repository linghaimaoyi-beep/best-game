// LUMEN DRIFT — the things that live in the arena.
// One clear job: the player ship, the enemy kinds, bullets, shards and
// particles, and how each one moves and looks. No spawning, waves or
// collisions here; world.js owns those.

import { ENEMIES, PLAYER, COLORS } from './config.js';
import { clamp, distance, range } from './random.js';

/** The player's ship. */
export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = PLAYER.radius;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.hull = PLAYER.maxHull;
    this.maxHull = PLAYER.maxHull;
    this.speed = PLAYER.speed;
    this.fireInterval = PLAYER.fireInterval;
    this.fireTimer = 0;
    this.bulletDamage = PLAYER.bulletDamage;
    this.bulletSpeed = PLAYER.bulletSpeed;
    this.bulletRadius = PLAYER.bulletRadius;
    this.multishot = 1;
    this.pierce = 0;
    this.magnetRadius = PLAYER.magnetRadius;
    this.haloOrbs = PLAYER.haloOrbs;
    this.haloRadius = PLAYER.haloRadius;
    this.haloDamage = PLAYER.haloDamage;
    this.haloTimer = 0;
    this.haloAngle = 0;
    this.dashCooldown = 0;
    this.dashTimer = 0;
    this.dashX = 0;
    this.dashY = 0;
    this.invulnerableTimer = 0;
    this.alive = true;
  }

  get dashReady() {
    return this.dashCooldown <= 0;
  }

  get dashFraction() {
    return clamp(1 - this.dashCooldown / PLAYER.dashCooldown, 0, 1);
  }

  /** Start a dash in the given direction. */
  startDash(dx, dy) {
    if (!this.dashReady || (dx === 0 && dy === 0)) return false;
    const length = Math.hypot(dx, dy) || 1;
    this.dashX = dx / length;
    this.dashY = dy / length;
    this.dashTimer = PLAYER.dashTime;
    this.dashCooldown = PLAYER.dashCooldown;
    this.invulnerableTimer = Math.max(this.invulnerableTimer, PLAYER.dashTime + 0.1);
    return true;
  }

  takeDamage(amount) {
    if (this.invulnerableTimer > 0 || !this.alive) return false;
    this.hull -= amount;
    this.invulnerableTimer = PLAYER.invulnerableTime;
    if (this.hull <= 0) {
      this.hull = 0;
      this.alive = false;
    }
    return true;
  }

  heal(amount) {
    this.hull = Math.min(this.maxHull, this.hull + amount);
  }
}

/** An enemy. `kind` picks its stats from ENEMIES. */
export class Enemy {
  constructor(kind, x, y, rng) {
    const stats = ENEMIES[kind];
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.radius = stats.radius;
    this.speed = stats.speed * range(rng, 0.9, 1.1);
    this.hull = stats.hull;
    this.maxHull = stats.hull;
    this.damage = stats.damage;
    this.score = stats.score;
    this.shards = stats.shards;
    this.color = stats.color;
    this.angle = 0;
    this.orbitAngle = range(rng, 0, Math.PI * 2);
    this.orbitRadius = range(rng, 150, 220);
    this.shootTimer = range(rng, 1.2, 2.4);
    this.weavePhase = range(rng, 0, Math.PI * 2);
    this.weaveSpeed = range(rng, 2.2, 3.4);
    this.flash = 0;
    this.dead = false;
    this.spawnTimer = 0.25;
  }

  /** Steer toward the player, per kind. Returns nothing; world.js moves it. */
  steer(player, dt, rng) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    switch (this.kind) {
      case 'drifter':
      case 'speeder':
      case 'mite':
        this.vx = nx * this.speed;
        this.vy = ny * this.speed;
        this.angle = Math.atan2(dy, dx);
        break;
      case 'orbiter': {
        this.orbitAngle += dt * 0.9;
        const targetX = player.x + Math.cos(this.orbitAngle) * this.orbitRadius;
        const targetY = player.y + Math.sin(this.orbitAngle) * this.orbitRadius;
        const tx = targetX - this.x;
        const ty = targetY - this.y;
        const td = Math.hypot(tx, ty) || 1;
        this.vx = (tx / td) * this.speed;
        this.vy = (ty / td) * this.speed;
        this.angle = Math.atan2(dy, dx);
        break;
      }
      case 'splitter':
        this.vx = nx * this.speed;
        this.vy = ny * this.speed;
        this.angle = Math.atan2(dy, dx);
        break;
      case 'weaver': {
        this.weavePhase += dt * this.weaveSpeed;
        const perpendicular = Math.atan2(dy, dx) + Math.PI / 2;
        const weave = Math.sin(this.weavePhase) * 0.7;
        this.vx = nx * this.speed + Math.cos(perpendicular) * weave * this.speed;
        this.vy = ny * this.speed + Math.sin(perpendicular) * weave * this.speed;
        this.angle = Math.atan2(dy, dx);
        break;
      }
      default:
        this.vx = nx * this.speed;
        this.vy = ny * this.speed;
        break;
    }
  }
}

/** A projectile. `friendly` bullets hurt enemies; enemy bullets hurt the player. */
export class Bullet {
  constructor(x, y, vx, vy, radius, damage, friendly, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.damage = damage;
    this.friendly = friendly;
    this.color = color;
    this.pierce = 0;
    this.dead = false;
    this.life = 2.5;
  }
}

/** A star shard: the currency enemies drop. */
export class Shard {
  constructor(x, y, value, rng) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.vx = range(rng, -60, 60);
    this.vy = range(rng, -60, 60);
    this.radius = 8;
    this.dead = false;
    this.age = 0;
    this.bob = range(rng, 0, Math.PI * 2);
  }
}

/** A short-lived spark, ring or puff for hits, deaths and pickups. */
export class Particle {
  constructor(x, y, vx, vy, life, size, color, kind = 'spark') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.color = color;
    this.kind = kind;
    this.dead = false;
  }
}

/** A floating score or message that rises and fades. */
export class Floater {
  constructor(x, y, text, color) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.life = 0.9;
    this.maxLife = 0.9;
    this.dead = false;
  }
}

/** A background star for the parallax starfield. */
export class Star {
  constructor(rng, width, height) {
    this.x = range(rng, 0, width);
    this.y = range(rng, 0, height);
    this.depth = range(rng, 0.2, 1);
    this.size = range(rng, 0.6, 2.2) * this.depth;
    this.twinkle = range(rng, 0, Math.PI * 2);
    this.color = rng() < 0.75 ? COLORS.starDim : COLORS.starBright;
  }
}
