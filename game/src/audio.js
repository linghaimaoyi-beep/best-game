// LUMEN DRIFT — synthesized sound effects.
// One clear job: every sound the game makes, built with the Web Audio API,
// so the game needs no audio files and works fully offline.

/** A tiny synth: oscillators and noise shaped into game sounds. */
export class SoundBank {
  constructor() {
    this.context = null;
    this.muted = false;
    this.master = null;
  }

  /** Create the audio context on the first user gesture (browsers require it). */
  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0.32;
    this.master.connect(this.context.destination);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.32;
  }

  /** A short oscillator blip that slides from one frequency to another. */
  blip({ type = 'sine', from = 440, to = 220, duration = 0.12, volume = 0.5, delay = 0 }) {
    if (!this.context || this.muted) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  /** A burst of filtered noise, for explosions and impacts. */
  noise({ duration = 0.2, volume = 0.5, frequency = 1200, delay = 0 }) {
    if (!this.context || this.muted) return;
    const start = this.context.currentTime + delay;
    const length = Math.max(1, Math.floor(this.context.sampleRate * duration));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(start);
  }

  shoot() {
    this.blip({ type: 'square', from: 880, to: 520, duration: 0.07, volume: 0.14 });
  }

  enemyHit() {
    this.blip({ type: 'triangle', from: 320, to: 180, duration: 0.06, volume: 0.2 });
  }

  enemyDie() {
    this.noise({ duration: 0.22, volume: 0.4, frequency: 900 });
    this.blip({ type: 'sawtooth', from: 220, to: 55, duration: 0.22, volume: 0.25 });
  }

  playerHit() {
    this.noise({ duration: 0.3, volume: 0.5, frequency: 700 });
    this.blip({ type: 'sawtooth', from: 160, to: 40, duration: 0.3, volume: 0.4 });
  }

  pickup() {
    this.blip({ type: 'sine', from: 660, to: 990, duration: 0.09, volume: 0.22 });
    this.blip({ type: 'sine', from: 990, to: 1320, duration: 0.1, volume: 0.18, delay: 0.07 });
  }

  dash() {
    this.noise({ duration: 0.14, volume: 0.22, frequency: 2400 });
  }

  waveStart() {
    this.blip({ type: 'triangle', from: 392, to: 392, duration: 0.12, volume: 0.3 });
    this.blip({ type: 'triangle', from: 523, to: 523, duration: 0.12, volume: 0.3, delay: 0.12 });
    this.blip({ type: 'triangle', from: 659, to: 659, duration: 0.2, volume: 0.3, delay: 0.24 });
  }

  waveClear() {
    this.blip({ type: 'sine', from: 523, to: 523, duration: 0.12, volume: 0.28 });
    this.blip({ type: 'sine', from: 659, to: 659, duration: 0.12, volume: 0.28, delay: 0.1 });
    this.blip({ type: 'sine', from: 784, to: 784, duration: 0.22, volume: 0.28, delay: 0.2 });
  }

  upgrade() {
    this.blip({ type: 'sine', from: 440, to: 880, duration: 0.18, volume: 0.3 });
    this.blip({ type: 'sine', from: 660, to: 1320, duration: 0.22, volume: 0.22, delay: 0.1 });
  }

  gameOver() {
    this.blip({ type: 'sawtooth', from: 330, to: 220, duration: 0.3, volume: 0.3 });
    this.blip({ type: 'sawtooth', from: 220, to: 147, duration: 0.35, volume: 0.3, delay: 0.28 });
    this.blip({ type: 'sawtooth', from: 147, to: 98, duration: 0.5, volume: 0.3, delay: 0.6 });
  }

  victory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((note, index) => {
      this.blip({ type: 'triangle', from: note, to: note, duration: 0.22, volume: 0.3, delay: index * 0.14 });
    });
  }
}
