// LUMEN DRIFT — keyboard and mouse input.
// One clear job: read the player's keys and pointer and hand the game a
// clean, per-frame picture of what is pressed and where the mouse is.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.mousePressed = false;
    this.rightDown = false;

    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(event.code);
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });

    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
      this.mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
    });
    canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0) {
        this.mouseDown = true;
        this.mousePressed = true;
      }
      if (event.button === 2) this.rightDown = true;
    });
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.mouseDown = false;
      if (event.button === 2) this.rightDown = false;
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  /** True while the key is held down. */
  down(code) {
    return this.keys.has(code);
  }

  /** True only on the frame the key was pressed. */
  wasPressed(code) {
    return this.pressed.has(code);
  }

  /** True only on the frame the left mouse button was pressed. */
  get mouseWasPressed() {
    return this.mousePressed;
  }

  /** Movement vector from WASD or arrow keys, normalized. */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) y -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const length = Math.hypot(x, y);
      x /= length;
      y /= length;
    }
    return { x, y };
  }

  /** True when the player wants to dash (Space, Shift, or right mouse). */
  get dashRequested() {
    return this.wasPressed('Space') || this.wasPressed('ShiftLeft') || this.wasPressed('ShiftRight') || this.rightDown;
  }

  /** Clear the per-frame "pressed" flags; call once per frame after update. */
  endFrame() {
    this.pressed.clear();
    this.mousePressed = false;
  }
}
