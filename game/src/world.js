// LUMEN DRIFT — the game world.
// One clear job: the state of a run (player, enemies, bullets, shards,
// waves, score) and how it changes each frame: spawning, movement,
// collisions, pickups, wave flow and the win/lose conditions.

import { ARENA, COLORS, ENEMIES, PLAYER, STEP, VIEW, WAVES } from './config.js';
import { Bullet, Enemy, Floater, Particle, Player, Shard, Star } from './entities.js';
import { clamp, distance, makeRng, pick, range, rangeInt, weighted } from './random.js';
import { rollUpgrades } from './upgrades.js';

export const STATE_TITLE = 'title';
export const STATE_PLAYING = 'playing';
export const STATE_UPGRADE = 'upgrade';
export const STATE_GAMEOVER = 'gameover';
export const STATE_VICTORY = 'victory';
export const STATE_PAUSED = 'paused';

export class World {
  constructor(seed = 1) {
    this.rng = makeRng(seed);
    this.seed = seed;
    this.state = STATE_TITLE;
    this.player = new Player(VIEW.width / 2, VIEW.height / 2);
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.shards = [];
    this.particles = [];
    this.floaters = [];
    this.stars = [];
    for (let i = 0; i < 110; i += 1) this.stars.push(new Star(this.rng, VIEW.width, VIEW.height));
    this.wave = 0;
    this.score = 0;
    this.shardCount = 0;
    this.kills = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveActive = false;
    this.waveBanner = 0;
    this.waveBannerText = '';
    this.upgradeChoices = [];
    this.upgradesTaken = {};
    this.shake = 0;
    this.flash = 0;
    this.time = 0;
    this.best = 0;
    this.victoryShown = false;
    this.endless = false;
  }

  reset(seed = 1) {
    const fresh = new World(seed);
    fresh.best = this.best;
    Object.assign(this, fresh);
    this.state = STATE_TITLE;
  }

  /** Begin a new run from the title screen. */
  startGame() {
    this.reset(this.seed);
    this.state = STATE_PLAYING;
    this.startWave(1);
  }

  /** Build the spawn list for a wave and start it. */
  startWave(number) {
    this.wave = number;
    this.waveActive = true;
    const count = WAVES.baseCount + WAVES.perWave * (number - 1);
    const table = WAVES.mix.map((entry) => ({
      value: entry.kind,
      weight: entry.start + ((entry.end - entry.start) * Math.min(1, (number - 1) / 8)),
    }));
    this.spawnQueue = [];
    for (let i = 0; i < count; i += 1) this.spawnQueue.push(weighted(this.rng, table));
    this.spawnTimer = 0.5;
    this.waveBanner = 2.2;
    this.waveBannerText = `WAVE ${number}`;
  }

  /** The wave is over: award the bonus and offer upgrades (or victory). */
  endWave() {
    this.waveActive = false;
    const bonus = WAVES.waveClearBonus + this.wave * 20;
    this.score += bonus;
    this.addFloater(this.player.x, this.player.y - 40, `WAVE BONUS +${bonus}`, COLORS.gold);
    if (this.wave >= WAVES.victoryWave && !this.victoryShown) {
      this.victoryShown = true;
      this.state = STATE_VICTORY;
      return 'victory';
    }
    this.upgradeChoices = rollUpgrades(this.rng, this.upgradesTaken);
    this.state = STATE_UPGRADE;
    return 'upgrade';
  }

  /** Apply the chosen upgrade and start the next wave. */
  chooseUpgrade(upgrade) {
    if (!upgrade) return;
    upgrade.apply(this.player);
    this.upgradesTaken[upgrade.id] = (this.upgradesTaken[upgrade.id] || 0) + 1;
    this.upgradeChoices = [];
    this.state = STATE_PLAYING;
    this.startWave(this.wave + 1);
  }

  /** Continue past wave 10 in endless mode. */
  continueEndless() {
    this.endless = true;
    this.state = STATE_PLAYING;
    this.startWave(this.wave + 1);
  }

  addFloater(x, y, text, color) {
    this.floaters.push(new Floater(x, y, text, color));
  }

  burst(x, y, color, count, speed = 260, size = 3) {
    for (let i = 0; i < count; i += 1) {
      const angle = range(this.rng, 0, Math.PI * 2);
      const velocity = range(this.rng, speed * 0.3, speed);
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * velocity, Math.sin(angle) * velocity,
        range(this.rng, 0.3, 0.7), range(this.rng, size * 0.6, size * 1.4), color, 'spark',
      ));
    }
  }

  ring(x, y, color, maxRadius = 60) {
    this.particles.push(new Particle(x, y, 0, 0, 0.4, maxRadius, color, 'ring'));
  }

  /** Pick a spawn point just outside the arena, away from the player. */
  spawnPoint() {
    const margin = 40;
    const side = rangeInt(this.rng, 0, 3);
    let x;
    let y;
    if (side === 0) { x = range(this.rng, ARENA.left, ARENA.right); y = ARENA.top - margin; }
    else if (side === 1) { x = range(this.rng, ARENA.left, ARENA.right); y = ARENA.bottom + margin; }
    else if (side === 2) { x = ARENA.left - margin; y = range(this.rng, ARENA.top, ARENA.bottom); }
    else { x = ARENA.right + margin; y = range(this.rng, ARENA.top, ARENA.bottom); }
    if (distance(x, y, this.player.x, this.player.y) < 220) {
      x = VIEW.width - x;
      y = VIEW.height - y;
    }
    return { x, y };
  }

  spawnEnemy(kind) {
    const point = this.spawnPoint();
    const enemy = new Enemy(kind, point.x, point.y, this.rng);
    this.enemies.push(enemy);
  }

  killEnemy(enemy, awardScore = true) {
    enemy.dead = true;
    this.kills += 1;
    if (awardScore) {
      this.score += enemy.score;
      this.addFloater(enemy.x, enemy.y - 14, `+${enemy.score}`, COLORS.text);
    }
    this.burst(enemy.x, enemy.y, enemy.color, enemy.kind === 'splitter' ? 26 : 14, 300, 3.5);
    this.ring(enemy.x, enemy.y, enemy.color, 46);
    this.shake = Math.min(10, this.shake + (enemy.kind === 'splitter' ? 6 : 3));
    for (let i = 0; i < enemy.shards; i += 1) {
      this.shards.push(new Shard(enemy.x + range(this.rng, -14, 14), enemy.y + range(this.rng, -14, 14), 1, this.rng));
    }
    if (enemy.kind === 'splitter') {
      for (let i = 0; i < 2; i += 1) {
        const mite = new Enemy('mite', enemy.x + range(this.rng, -20, 20), enemy.y + range(this.rng, -20, 20), this.rng);
        mite.spawnTimer = 0;
        this.enemies.push(mite);
      }
    }
  }

  firePlayerBullet() {
    const player = this.player;
    const shots = player.multishot;
    const spread = 0.14;
    for (let i = 0; i < shots; i += 1) {
      const offset = (i - (shots - 1) / 2) * spread;
      const angle = player.angle + offset;
      const muzzleX = player.x + Math.cos(player.angle) * (player.radius + 6);
      const muzzleY = player.y + Math.sin(player.angle) * (player.radius + 6);
      const bullet = new Bullet(
        muzzleX, muzzleY,
        Math.cos(angle) * player.bulletSpeed, Math.sin(angle) * player.bulletSpeed,
        player.bulletRadius, player.bulletDamage, true, COLORS.bullet,
      );
      bullet.pierce = player.pierce;
      this.bullets.push(bullet);
    }
  }

  /** One fixed step of the simulation. `events` collects sounds to play. */
  step(dt, input, events) {
    this.time += dt;
    if (this.waveBanner > 0) this.waveBanner -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 26);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.2);

    if (this.state !== STATE_PLAYING) {
      this.updateAmbient(dt);
      return;
    }

    const player = this.player;
    if (!player.alive) {
      this.state = STATE_GAMEOVER;
      if (this.score > this.best) this.best = this.score;
      events.push('gameover');
      return;
    }

    // --- Spawning ---
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnEnemy(this.spawnQueue.shift());
        this.spawnTimer = Math.max(0.25, WAVES.spawnInterval - this.wave * 0.04);
      }
    }

    // --- Player movement and dash ---
    const move = input.moveVector();
    if (player.dashTimer > 0) {
      player.dashTimer -= dt;
      player.vx = player.dashX * PLAYER.dashSpeed;
      player.vy = player.dashY * PLAYER.dashSpeed;
    } else {
      player.vx = move.x * player.speed;
      player.vy = move.y * player.speed;
    }
    player.x = clamp(player.x + player.vx * dt, ARENA.left + player.radius, ARENA.right - player.radius);
    player.y = clamp(player.y + player.vy * dt, ARENA.top + player.radius, ARENA.bottom - player.radius);
    if (input.dashRequested && player.startDash(move.x, move.y)) {
      events.push('dash');
      this.burst(player.x, player.y, COLORS.player, 10, 200, 2.5);
    }
    if (player.dashCooldown > 0) player.dashCooldown -= dt;
    if (player.invulnerableTimer > 0) player.invulnerableTimer -= dt;

    // Aim at the mouse; auto-fire.
    const aimDx = input.mouseX - player.x;
    const aimDy = input.mouseY - player.y;
    if (Math.hypot(aimDx, aimDy) > 4) player.angle = Math.atan2(aimDy, aimDx);
    player.fireTimer -= dt;
    if (player.fireTimer <= 0) {
      this.firePlayerBullet();
      player.fireTimer = player.fireInterval;
      events.push('shoot');
    }

    // Halo orbs: spin and burn enemies on contact.
    if (player.haloOrbs > 0) {
      player.haloAngle += dt * 2.6;
      player.haloTimer -= dt;
      if (player.haloTimer <= 0) {
        player.haloTimer = PLAYER.haloInterval;
        for (const enemy of this.enemies) {
          if (enemy.dead || enemy.spawnTimer > 0) continue;
          for (let i = 0; i < player.haloOrbs; i += 1) {
            const angle = player.haloAngle + (i * Math.PI * 2) / player.haloOrbs;
            const orbX = player.x + Math.cos(angle) * player.haloRadius;
            const orbY = player.y + Math.sin(angle) * player.haloRadius;
            if (distance(orbX, orbY, enemy.x, enemy.y) < enemy.radius + 12) {
              this.damageEnemy(enemy, player.haloDamage, events);
              break;
            }
          }
        }
      }
    }

    // --- Enemies ---
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      if (enemy.spawnTimer > 0) enemy.spawnTimer -= dt;
      if (enemy.flash > 0) enemy.flash -= dt;
      enemy.steer(player, dt, this.rng);
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      enemy.x = clamp(enemy.x, -60, VIEW.width + 60);
      enemy.y = clamp(enemy.y, -60, VIEW.height + 60);
      if (enemy.kind === 'orbiter') {
        enemy.shootTimer -= dt;
        if (enemy.shootTimer <= 0 && enemy.spawnTimer <= 0) {
          enemy.shootTimer = range(this.rng, 1.6, 2.6);
          const dx = player.x - enemy.x;
          const dy = player.y - enemy.y;
          const dist = Math.hypot(dx, dy) || 1;
          this.enemyBullets.push(new Bullet(
            enemy.x, enemy.y,
            (dx / dist) * 230, (dy / dist) * 230,
            6, enemy.damage, false, COLORS.enemyBullet,
          ));
        }
      }
    }

    // --- Bullets ---
    for (const bullet of this.bullets) {
      if (bullet.dead) continue;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      if (bullet.life <= 0 || bullet.x < -20 || bullet.x > VIEW.width + 20 || bullet.y < -20 || bullet.y > VIEW.height + 20) {
        bullet.dead = true;
      }
    }
    for (const bullet of this.enemyBullets) {
      if (bullet.dead) continue;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      if (bullet.life <= 0 || bullet.x < -20 || bullet.x > VIEW.width + 20 || bullet.y < -20 || bullet.y > VIEW.height + 20) {
        bullet.dead = true;
      }
    }

    // --- Collisions: player bullets vs enemies ---
    for (const bullet of this.bullets) {
      if (bullet.dead) continue;
      for (const enemy of this.enemies) {
        if (enemy.dead || enemy.spawnTimer > 0) continue;
        if (distance(bullet.x, bullet.y, enemy.x, enemy.y) < bullet.radius + enemy.radius) {
          this.damageEnemy(enemy, bullet.damage, events);
          this.burst(bullet.x, bullet.y, COLORS.bullet, 4, 160, 2);
          if (bullet.pierce > 0) {
            bullet.pierce -= 1;
          } else {
            bullet.dead = true;
          }
          break;
        }
      }
    }

    // --- Collisions: enemies vs player ---
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.spawnTimer > 0) continue;
      if (distance(enemy.x, enemy.y, player.x, player.y) < enemy.radius + player.radius - 2) {
        if (player.takeDamage(enemy.damage)) {
          events.push('playerhit');
          this.flash = 0.55;
          this.shake = Math.min(14, this.shake + 7);
          this.burst(player.x, player.y, COLORS.hullLow, 16, 320, 3);
          this.ring(player.x, player.y, COLORS.hullLow, 70);
        }
        // The enemy bounces off so it cannot drain the hull in one touch.
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.hypot(dx, dy) || 1;
        enemy.x = player.x + (dx / dist) * (enemy.radius + player.radius + 4);
        enemy.y = player.y + (dy / dist) * (enemy.radius + player.radius + 4);
      }
    }

    // --- Collisions: enemy bullets vs player ---
    for (const bullet of this.enemyBullets) {
      if (bullet.dead) continue;
      if (distance(bullet.x, bullet.y, player.x, player.y) < bullet.radius + player.radius - 2) {
        bullet.dead = true;
        if (player.takeDamage(bullet.damage)) {
          events.push('playerhit');
          this.flash = 0.55;
          this.shake = Math.min(14, this.shake + 6);
        }
      }
    }

    // --- Shards: magnet, pickup ---
    for (const shard of this.shards) {
      if (shard.dead) continue;
      shard.age += dt;
      shard.bob += dt * 4;
      const dist = distance(shard.x, shard.y, player.x, player.y);
      if (dist < player.magnetRadius) {
        const dx = player.x - shard.x;
        const dy = player.y - shard.y;
        const pull = 520 * (1 - dist / player.magnetRadius) + 120;
        shard.vx += (dx / (dist || 1)) * pull * dt * 4;
        shard.vy += (dy / (dist || 1)) * pull * dt * 4;
      } else {
        shard.vx *= (1 - dt * 2);
        shard.vy *= (1 - dt * 2);
      }
      shard.x += shard.vx * dt;
      shard.y += shard.vy * dt;
      if (dist < player.radius + shard.radius + 4) {
        shard.dead = true;
        this.shardCount += shard.value;
        this.score += WAVES.shardScore * shard.value;
        events.push('pickup');
        this.burst(shard.x, shard.y, COLORS.shard, 5, 140, 2);
      }
    }

    // --- Particles and floaters ---
    this.updateAmbient(dt);

    // --- Cleanup ---
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    this.bullets = this.bullets.filter((bullet) => !bullet.dead);
    this.enemyBullets = this.enemyBullets.filter((bullet) => !bullet.dead);
    this.shards = this.shards.filter((shard) => !shard.dead);

    // --- Wave complete? ---
    if (this.waveActive && this.spawnQueue.length === 0 && this.enemies.length === 0) {
      const result = this.endWave();
      events.push(result === 'victory' ? 'victory' : 'waveclear');
    }
  }

  damageEnemy(enemy, amount, events) {
    if (enemy.dead) return;
    enemy.hull -= amount;
    enemy.flash = 0.12;
    if (enemy.hull <= 0) {
      this.killEnemy(enemy, true);
      events.push('enemydie');
    } else {
      events.push('enemyhit');
    }
  }

  /** Particles, floaters and stars tick even when the game is not playing. */
  updateAmbient(dt) {
    for (const particle of this.particles) {
      if (particle.dead) continue;
      particle.life -= dt;
      if (particle.life <= 0) {
        particle.dead = true;
        continue;
      }
      if (particle.kind === 'spark') {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= (1 - dt * 2.5);
        particle.vy *= (1 - dt * 2.5);
      }
    }
    for (const floater of this.floaters) {
      if (floater.dead) continue;
      floater.life -= dt;
      floater.y -= 34 * dt;
      if (floater.life <= 0) floater.dead = true;
    }
    this.particles = this.particles.filter((particle) => !particle.dead);
    this.floaters = this.floaters.filter((floater) => !floater.dead);
    for (const star of this.stars) star.twinkle += dt * 2;
  }
}
