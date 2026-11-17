// LUMEN DRIFT — drawing the game.
// One clear job: turn the world into pixels. Background, arena, ships,
// enemies, bullets, shards, particles and the HUD all live here.

import { ARENA, COLORS, PLAYER, VIEW } from './config.js';
import { clamp } from './random.js';

/** Draw a glowing circle (a radial gradient halo). */
function glowCircle(ctx, x, y, radius, color, alpha = 0.55) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Draw a polygon from a list of [x, y] points. */
function polygon(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.nebula = [];
  }

  /** Pre-render soft nebula blobs for the background. */
  buildNebula(rng) {
    this.nebula = [];
    const blobs = [
      { x: 220, y: 150, r: 260, color: 'rgba(64, 80, 200, 0.20)' },
      { x: 1080, y: 560, r: 300, color: 'rgba(150, 60, 180, 0.16)' },
      { x: 900, y: 120, r: 200, color: 'rgba(40, 160, 180, 0.14)' },
      { x: 300, y: 600, r: 220, color: 'rgba(60, 60, 160, 0.18)' },
    ];
    for (const blob of blobs) this.nebula.push(blob);
  }

  draw(world, input) {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);

    // Screen shake.
    if (world.shake > 0.2) {
      const magnitude = world.shake;
      ctx.translate((Math.random() - 0.5) * magnitude, (Math.random() - 0.5) * magnitude);
    }

    this.drawBackground(world);
    this.drawArena();
    this.drawShards(world);
    this.drawEnemies(world);
    this.drawBullets(world);
    this.drawPlayer(world, input);
    this.drawParticles(world);
    this.drawFloaters(world);
    ctx.restore();

    this.drawHud(world);
    if (world.flash > 0) {
      ctx.fillStyle = `rgba(255, 60, 90, ${world.flash * 0.22})`;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
    if (world.waveBanner > 0 && world.state === 'playing') {
      const alpha = clamp(world.waveBanner / 0.6, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = COLORS.text;
      ctx.font = '700 54px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = COLORS.accent;
      ctx.shadowBlur = 24;
      ctx.fillText(world.waveBannerText, VIEW.width / 2, VIEW.height / 2 - 60);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  drawBackground(world) {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    gradient.addColorStop(0, COLORS.backgroundEdge);
    gradient.addColorStop(0.5, COLORS.background);
    gradient.addColorStop(1, '#05070f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    for (const blob of this.nebula) {
      const nebulaGradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
      nebulaGradient.addColorStop(0, blob.color);
      nebulaGradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = nebulaGradient;
      ctx.fillRect(blob.x - blob.r, blob.y - blob.r, blob.r * 2, blob.r * 2);
    }
    for (const star of world.stars) {
      const twinkle = 0.55 + 0.45 * Math.sin(star.twinkle);
      ctx.globalAlpha = twinkle * star.depth;
      ctx.fillStyle = star.color;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawArena() {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(55, 244, 228, 0.28)';
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 10]);
    ctx.strokeRect(ARENA.left, ARENA.top, ARENA.right - ARENA.left, ARENA.bottom - ARENA.top);
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(55, 244, 228, 0.10)';
    ctx.lineWidth = 6;
    ctx.strokeRect(ARENA.left, ARENA.top, ARENA.right - ARENA.left, ARENA.bottom - ARENA.top);
  }

  drawShards(world) {
    const ctx = this.ctx;
    for (const shard of world.shards) {
      const bob = Math.sin(shard.bob) * 2;
      const x = shard.x;
      const y = shard.y + bob;
      glowCircle(ctx, x, y, 18, 'rgba(255, 217, 74, 0.5)', 0.5);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(shard.bob * 0.6);
      ctx.fillStyle = COLORS.shard;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = COLORS.shardCore;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(3, 0);
      ctx.lineTo(0, 4);
      ctx.lineTo(-3, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  drawEnemies(world) {
    const ctx = this.ctx;
    for (const enemy of world.enemies) {
      if (enemy.spawnTimer > 0) {
        const alpha = 1 - enemy.spawnTimer / 0.25;
        ctx.globalAlpha = alpha * 0.8;
      }
      glowCircle(ctx, enemy.x, enemy.y, enemy.radius * 2.1, enemy.color, 0.35);
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(enemy.angle);
      ctx.fillStyle = enemy.flash > 0 ? '#ffffff' : enemy.color;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.5;
      switch (enemy.kind) {
        case 'drifter': {
          // Spiked circle.
          ctx.beginPath();
          for (let i = 0; i < 8; i += 1) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = i % 2 === 0 ? enemy.radius + 5 : enemy.radius - 2;
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        }
        case 'speeder': {
          // Dart.
          polygon(ctx, [[enemy.radius + 6, 0], [-enemy.radius, -enemy.radius * 0.7], [-enemy.radius * 0.5, 0], [-enemy.radius, enemy.radius * 0.7]]);
          ctx.fill();
          ctx.stroke();
          break;
        }
        case 'orbiter': {
          // Ring with a core.
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = COLORS.background;
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius * 0.45, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = enemy.color;
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius * 0.2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'splitter': {
          // Hexagon.
          ctx.beginPath();
          for (let i = 0; i < 6; i += 1) {
            const angle = (i / 6) * Math.PI * 2;
            const px = Math.cos(angle) * enemy.radius;
            const py = Math.sin(angle) * enemy.radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius * 0.4, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'weaver': {
          // Diamond.
          polygon(ctx, [[enemy.radius, 0], [0, enemy.radius * 0.8], [-enemy.radius, 0], [0, -enemy.radius * 0.8]]);
          ctx.fill();
          ctx.stroke();
          break;
        }
        case 'mite': {
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        default: {
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }
      ctx.restore();
      // Hull bar for tougher enemies.
      if (enemy.maxHull >= 26 && enemy.hull < enemy.maxHull) {
        const width = enemy.radius * 2;
        const fraction = clamp(enemy.hull / enemy.maxHull, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 12, width, 4);
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 12, width * fraction, 4);
      }
      ctx.globalAlpha = 1;
    }
  }

  drawBullets(world) {
    const ctx = this.ctx;
    ctx.lineCap = 'round';
    for (const bullet of world.bullets) {
      glowCircle(ctx, bullet.x, bullet.y, bullet.radius * 3, 'rgba(165, 243, 255, 0.6)', 0.5);
      ctx.strokeStyle = COLORS.bullet;
      ctx.lineWidth = bullet.radius;
      ctx.beginPath();
      ctx.moveTo(bullet.x - bullet.vx * 0.02, bullet.y - bullet.vy * 0.02);
      ctx.lineTo(bullet.x, bullet.y);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const bullet of world.enemyBullets) {
      glowCircle(ctx, bullet.x, bullet.y, bullet.radius * 3, 'rgba(255, 143, 176, 0.55)', 0.5);
      ctx.fillStyle = COLORS.enemyBullet;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPlayer(world, input) {
    const ctx = this.ctx;
    const player = world.player;
    if (!player.alive) return;
    const blink = player.invulnerableTimer > 0 && Math.floor(world.time * 14) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.35;

    // Engine trail.
    const backX = player.x - Math.cos(player.angle) * player.radius;
    const backY = player.y - Math.sin(player.angle) * player.radius;
    const trailLength = player.dashTimer > 0 ? 46 : 22;
    const trailGradient = ctx.createLinearGradient(backX, backY, backX - Math.cos(player.angle) * trailLength, backY - Math.sin(player.angle) * trailLength);
    trailGradient.addColorStop(0, 'rgba(55, 244, 228, 0.85)');
    trailGradient.addColorStop(1, 'rgba(55, 244, 228, 0)');
    ctx.strokeStyle = trailGradient;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(backX, backY);
    ctx.lineTo(backX - Math.cos(player.angle) * trailLength, backY - Math.sin(player.angle) * trailLength);
    ctx.stroke();

    // Halo orbs.
    if (player.haloOrbs > 0) {
      for (let i = 0; i < player.haloOrbs; i += 1) {
        const angle = player.haloAngle + (i * Math.PI * 2) / player.haloOrbs;
        const orbX = player.x + Math.cos(angle) * player.haloRadius;
        const orbY = player.y + Math.sin(angle) * player.haloRadius;
        glowCircle(ctx, orbX, orbY, 16, 'rgba(255, 217, 74, 0.6)', 0.6);
        ctx.fillStyle = COLORS.shard;
        ctx.beginPath();
        ctx.arc(orbX, orbY, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255, 217, 74, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.haloRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    glowCircle(ctx, player.x, player.y, player.radius * 2.4, 'rgba(55, 244, 228, 0.5)', 0.5);

    // Ship: a sleek dart.
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = COLORS.player;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.5;
    polygon(ctx, [[player.radius + 6, 0], [-player.radius * 0.7, -player.radius * 0.75], [-player.radius * 0.35, 0], [-player.radius * 0.7, player.radius * 0.75]]);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = COLORS.playerCore;
    ctx.beginPath();
    ctx.arc(4, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;

    // Aim reticle at the mouse.
    if (input && world.state === 'playing') {
      ctx.strokeStyle = 'rgba(234, 242, 255, 0.65)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(input.mouseX, input.mouseY, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(input.mouseX - 16, input.mouseY);
      ctx.lineTo(input.mouseX - 7, input.mouseY);
      ctx.moveTo(input.mouseX + 7, input.mouseY);
      ctx.lineTo(input.mouseX + 16, input.mouseY);
      ctx.moveTo(input.mouseX, input.mouseY - 16);
      ctx.lineTo(input.mouseX, input.mouseY - 7);
      ctx.moveTo(input.mouseX, input.mouseY + 7);
      ctx.lineTo(input.mouseX, input.mouseY + 16);
      ctx.stroke();
    }
  }

  drawParticles(world) {
    const ctx = this.ctx;
    for (const particle of world.particles) {
      const fraction = clamp(particle.life / particle.maxLife, 0, 1);
      if (particle.kind === 'ring') {
        ctx.globalAlpha = fraction * 0.8;
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = 3 * fraction + 1;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * (1 - fraction) + 6, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.globalAlpha = fraction;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, Math.max(0.5, particle.size * fraction), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawFloaters(world) {
    const ctx = this.ctx;
    ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const floater of world.floaters) {
      const fraction = clamp(floater.life / floater.maxLife, 0, 1);
      ctx.globalAlpha = fraction;
      ctx.fillStyle = floater.color;
      ctx.fillText(floater.text, floater.x, floater.y);
    }
    ctx.globalAlpha = 1;
  }

  drawHud(world) {
    const ctx = this.ctx;
    if (world.state !== 'playing' && world.state !== 'paused' && world.state !== 'upgrade') return;
    const player = world.player;

    // Top bar.
    ctx.fillStyle = 'rgba(5, 8, 24, 0.72)';
    ctx.fillRect(0, 0, VIEW.width, 52);
    ctx.strokeStyle = 'rgba(55, 244, 228, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 52);
    ctx.lineTo(VIEW.width, 52);
    ctx.stroke();

    ctx.textBaseline = 'middle';

    // Hull bar.
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('HULL', 24, 20);
    const hullWidth = 220;
    const hullFraction = clamp(player.hull / player.maxHull, 0, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(24, 28, hullWidth, 12);
    ctx.fillStyle = hullFraction > 0.35 ? COLORS.hull : COLORS.hullLow;
    ctx.fillRect(24, 28, hullWidth * hullFraction, 12);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(24, 28, hullWidth, 12);
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`${Math.ceil(player.hull)} / ${player.maxHull}`, 252, 34);

    // Wave.
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('WAVE', VIEW.width / 2 - 90, 20);
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 22px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(String(world.wave), VIEW.width / 2 - 90, 36);
    const remaining = world.enemies.length + world.spawnQueue.length;
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(remaining > 0 ? `${remaining} hostiles` : 'clear!', VIEW.width / 2 + 10, 34);

    // Score. (Kept clear of the mute button at the top-right corner.)
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('SCORE', VIEW.width - 340, 20);
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 22px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(String(world.score), VIEW.width - 340, 36);

    // Shards.
    ctx.fillStyle = COLORS.shard;
    ctx.beginPath();
    ctx.moveTo(VIEW.width - 310, 34);
    ctx.lineTo(VIEW.width - 304, 28);
    ctx.lineTo(VIEW.width - 298, 34);
    ctx.lineTo(VIEW.width - 304, 40);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 18px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(String(world.shardCount), VIEW.width - 292, 35);

    // Dash cooldown.
    const dashX = VIEW.width - 250;
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('DASH', dashX, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(dashX, 28, 96, 12);
    ctx.fillStyle = player.dashReady ? COLORS.accent : 'rgba(55, 244, 228, 0.45)';
    ctx.fillRect(dashX, 28, 96 * player.dashFraction, 12);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.strokeRect(dashX, 28, 96, 12);
    ctx.fillStyle = player.dashReady ? COLORS.accent : COLORS.textDim;
    ctx.font = '700 11px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(player.dashReady ? 'READY [Space]' : 'charging…', dashX, 48 - 2);
  }
}
