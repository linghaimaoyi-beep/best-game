// LUMEN DRIFT — the entry point.
// One clear job: wire the canvas, the world, the renderer, the input and
// the sound together; run the game loop; own the screens (title, upgrade,
// game over, victory, pause) and the ?shot= scenes used for screenshots.

import { STEP, VIEW } from './config.js';
import { Input } from './input.js';
import { Renderer } from './render.js';
import { SoundBank } from './audio.js';
import { STATE_GAMEOVER, STATE_PAUSED, STATE_PLAYING, STATE_TITLE, STATE_UPGRADE, STATE_VICTORY, World } from './world.js';
import { stageShot } from './shots.js';
import { makeRng } from './random.js';

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
const overlays = {
  title: document.getElementById('screen-title'),
  upgrade: document.getElementById('screen-upgrade'),
  gameover: document.getElementById('screen-gameover'),
  victory: document.getElementById('screen-victory'),
  pause: document.getElementById('screen-pause'),
};
const upgradeCards = document.getElementById('upgrade-cards');
const muteButton = document.getElementById('mute-button');

const params = new URLSearchParams(window.location.search);
const seedParam = Number.parseInt(params.get('seed') || '1', 10);
const seed = Number.isFinite(seedParam) ? seedParam : 1;
const shotName = params.get('shot');

const world = new World(seed);
const renderer = new Renderer(canvas);
renderer.buildNebula(makeRng(seed));
const input = new Input(canvas);
const sounds = new SoundBank();

let frozen = false;
let pausedFrom = null;
let lastTime = 0;
let accumulator = 0;

try {
  world.best = Number.parseInt(window.localStorage.getItem('lumendrift.best') || '0', 10) || 0;
} catch {
  world.best = 0;
}

function saveBest() {
  try {
    window.localStorage.setItem('lumendrift.best', String(world.best));
  } catch {
    // Storage may be unavailable; the best score is a nicety, not a rule.
  }
}

function showOnly(name) {
  for (const [key, element] of Object.entries(overlays)) {
    if (!element) continue;
    element.classList.toggle('hidden', key !== name);
  }
  if (!name) {
    for (const element of Object.values(overlays)) {
      if (element) element.classList.add('hidden');
    }
  }
}

function announce(text) {
  if (statusLine) statusLine.textContent = text;
}

function fillTitle() {
  const bestElement = document.getElementById('title-best');
  if (bestElement) bestElement.textContent = world.best > 0 ? `Best score: ${world.best}` : 'No runs yet — set the first best score.';
}

function fillGameOver() {
  const set = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
  };
  set('final-score', world.score);
  set('final-wave', world.wave);
  set('final-kills', world.kills);
  set('final-shards', world.shardCount);
  set('final-best', Math.max(world.best, world.score));
  const newBest = document.getElementById('new-best');
  if (newBest) newBest.classList.toggle('hidden', world.score <= world.best);
}

function fillVictory() {
  const set = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
  };
  set('victory-score', world.score);
  set('victory-kills', world.kills);
  set('victory-best', Math.max(world.best, world.score));
}

function fillUpgrades() {
  if (!upgradeCards) return;
  upgradeCards.innerHTML = '';
  world.upgradeChoices.forEach((upgrade, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'upgrade-card';
    card.dataset.index = String(index);
    const icon = document.createElement('span');
    icon.className = 'upgrade-icon';
    icon.textContent = upgrade.icon;
    const name = document.createElement('span');
    name.className = 'upgrade-name';
    name.textContent = upgrade.name;
    const description = document.createElement('span');
    description.className = 'upgrade-description';
    description.textContent = upgrade.description;
    const key = document.createElement('span');
    key.className = 'upgrade-key';
    key.textContent = `Press ${index + 1}`;
    card.append(icon, name, description, key);
    card.addEventListener('click', () => {
      sounds.ensure();
      sounds.upgrade();
      world.chooseUpgrade(upgrade);
      showOnly(null);
      announce(`Chose ${upgrade.name}. Wave ${world.wave} begins.`);
    });
    upgradeCards.appendChild(card);
  });
}

function showForState(state) {
  if (state === STATE_TITLE) {
    fillTitle();
    showOnly('title');
    announce('Lumen Drift. Press Enter or click Start to play.');
  } else if (state === STATE_UPGRADE) {
    fillUpgrades();
    showOnly('upgrade');
    announce('Wave cleared. Choose one upgrade.');
  } else if (state === STATE_GAMEOVER) {
    fillGameOver();
    saveBest();
    showOnly('gameover');
    announce(`Game over. Score ${world.score}. Press R to restart.`);
  } else if (state === STATE_VICTORY) {
    fillVictory();
    saveBest();
    showOnly('victory');
    announce(`Victory! You cleared wave 10 with ${world.score} points.`);
  } else if (state === STATE_PAUSED) {
    showOnly('pause');
    announce('Paused.');
  } else {
    showOnly(null);
  }
}

function playEventSounds(events) {
  for (const event of events) {
    switch (event) {
      case 'shoot': sounds.shoot(); break;
      case 'enemyhit': sounds.enemyHit(); break;
      case 'enemydie': sounds.enemyDie(); break;
      case 'playerhit': sounds.playerHit(); break;
      case 'pickup': sounds.pickup(); break;
      case 'dash': sounds.dash(); break;
      case 'waveclear': sounds.waveClear(); break;
      case 'victory': sounds.victory(); break;
      case 'gameover': sounds.gameOver(); break;
      default: break;
    }
  }
}

function startRun() {
  sounds.ensure();
  world.startGame();
  showOnly(null);
  announce(`Wave 1. Move with WASD, aim with the mouse, dash with Space.`);
}

function restart() {
  startRun();
}

function togglePause() {
  if (world.state === STATE_PLAYING) {
    pausedFrom = STATE_PLAYING;
    world.state = STATE_PAUSED;
    showForState(STATE_PAUSED);
  } else if (world.state === STATE_PAUSED) {
    world.state = pausedFrom || STATE_PLAYING;
    pausedFrom = null;
    showOnly(null);
    announce('Resumed.');
  }
}

// --- Buttons and keys ---
document.getElementById('start-button')?.addEventListener('click', () => startRun());
document.getElementById('restart-button')?.addEventListener('click', () => restart());
document.getElementById('again-button')?.addEventListener('click', () => restart());
document.getElementById('endless-button')?.addEventListener('click', () => {
  sounds.ensure();
  world.continueEndless();
  showOnly(null);
  announce(`Endless mode. Wave ${world.wave} begins.`);
});
document.getElementById('resume-button')?.addEventListener('click', () => togglePause());
document.getElementById('quit-button')?.addEventListener('click', () => {
  world.state = STATE_TITLE;
  world.reset(world.seed);
  showForState(STATE_TITLE);
});
muteButton?.addEventListener('click', () => {
  sounds.ensure();
  sounds.setMuted(!sounds.muted);
  muteButton.textContent = sounds.muted ? '🔇 Sound off' : '🔊 Sound on';
  muteButton.setAttribute('aria-pressed', String(sounds.muted));
});

window.addEventListener('keydown', (event) => {
  sounds.ensure();
  if (event.code === 'KeyM') {
    sounds.setMuted(!sounds.muted);
    if (muteButton) {
      muteButton.textContent = sounds.muted ? '🔇 Sound off' : '🔊 Sound on';
      muteButton.setAttribute('aria-pressed', String(sounds.muted));
    }
  }
  if (event.code === 'KeyP' || event.code === 'Escape') {
    if (world.state === STATE_PLAYING || world.state === STATE_PAUSED) togglePause();
  }
  if (event.code === 'Enter' || event.code === 'Space') {
    if (world.state === STATE_TITLE) startRun();
    else if (world.state === STATE_GAMEOVER || world.state === STATE_VICTORY) restart();
  }
  if (event.code === 'KeyR') {
    if (world.state === STATE_GAMEOVER || world.state === STATE_VICTORY) restart();
  }
  if (world.state === STATE_UPGRADE) {
    const index = ['Digit1', 'Digit2', 'Digit3'].indexOf(event.code);
    if (index >= 0 && world.upgradeChoices[index]) {
      const upgrade = world.upgradeChoices[index];
      sounds.upgrade();
      world.chooseUpgrade(upgrade);
      showOnly(null);
      announce(`Chose ${upgrade.name}. Wave ${world.wave} begins.`);
    }
  }
});

// --- The loop ---
function frame(timestamp) {
  requestAnimationFrame(frame);
  if (!lastTime) lastTime = timestamp;
  let elapsed = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  if (elapsed > 0.25) elapsed = 0.25;

  if (!frozen) {
    accumulator += elapsed;
    let guard = 0;
    while (accumulator >= STEP && guard < 5) {
      accumulator -= STEP;
      guard += 1;
      if (world.state === STATE_PLAYING) {
        const events = [];
        const previousState = world.state;
        world.step(STEP, input, events);
        playEventSounds(events);
        if (world.state !== previousState) showForState(world.state);
      } else {
        world.step(STEP, input, []);
      }
    }
    if (guard >= 5) accumulator = 0;
  }

  renderer.draw(world, input);
  input.endFrame();
}

// --- Screenshot scenes ---
if (shotName) {
  const staged = stageShot(shotName, world);
  showForState(staged.state);
  // Freeze the simulation so the frame stays exactly the staged moment.
  frozen = true;
  // Draw once now so the frame exists even before the first rAF tick.
  renderer.draw(world, input);
} else {
  world.state = STATE_TITLE;
  showForState(STATE_TITLE);
}

requestAnimationFrame(frame);
