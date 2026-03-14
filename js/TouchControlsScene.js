// ════════════════════════════════════
//  TOUCH CONTROLS SCENE — on-screen buttons for mobile
//  Launched in parallel with HUD when IS_TOUCH is true.
// ════════════════════════════════════
class TouchControlsScene extends Phaser.Scene {
  constructor() { super({ key: 'TouchControls' }); }

  create() {
    // Need 3+ pointers for simultaneous move + jump + shoot
    this.input.addPointer(1);  // Phaser default is 2, add 1 more = 3 total

    this._jumpRaw   = false;
    this._jumpPrev  = false;
    this._shootRaw  = false;
    this._shootPrev = false;

    // ── LEFT D-PAD ──────────────────────────────────────────────
    this.createButton(70, 490, 45, 0xffffff, '◀', {
      down: () => { TOUCH_INPUT.left = true; },
      up:   () => { TOUCH_INPUT.left = false; },
    });

    this.createButton(180, 490, 45, 0xffffff, '▶', {
      down: () => { TOUCH_INPUT.right = true; },
      up:   () => { TOUCH_INPUT.right = false; },
    });

    // ── RIGHT ACTION BUTTONS ────────────────────────────────────
    this.createButton(720, 480, 50, 0x44cc44, '⬆', {
      down: () => { this._jumpRaw = true; },
      up:   () => { this._jumpRaw = false; },
    });

    this.createButton(620, 410, 40, 0xff8800, '●', {
      down: () => { this._shootRaw = true; },
      up:   () => { this._shootRaw = false; },
    });

    // Labels below buttons
    this.add.text(125, 530, 'BEWEGEN', {
      fontSize: '10px', fill: '#ffffff', fontFamily: '"Nunito", sans-serif',
      fontWeight: '700'
    }).setOrigin(0.5).setAlpha(0.4);

    this.add.text(720, 528, 'SPRING', {
      fontSize: '10px', fill: '#ffffff', fontFamily: '"Nunito", sans-serif',
      fontWeight: '700'
    }).setOrigin(0.5).setAlpha(0.4);

    this.add.text(620, 448, 'WURF', {
      fontSize: '10px', fill: '#ffffff', fontFamily: '"Nunito", sans-serif',
      fontWeight: '700'
    }).setOrigin(0.5).setAlpha(0.4);
  }

  createButton(x, y, radius, color, label, handlers) {
    const gfx = this.add.graphics();
    // Filled circle
    gfx.fillStyle(color, 0.2);
    gfx.fillCircle(x, y, radius);
    // Border
    gfx.lineStyle(2, 0xffffff, 0.35);
    gfx.strokeCircle(x, y, radius);

    // Label
    const txt = this.add.text(x, y, label, {
      fontSize: `${Math.round(radius * 0.7)}px`, fill: '#ffffff',
      fontFamily: '"Bangers", cursive'
    }).setOrigin(0.5).setAlpha(0.5);

    // Interactive zone
    const zone = this.add.zone(x, y, radius * 2, radius * 2)
      .setInteractive().setOrigin(0.5);

    // Press feedback
    zone.on('pointerdown', () => {
      gfx.clear();
      gfx.fillStyle(color, 0.45);
      gfx.fillCircle(x, y, radius);
      gfx.lineStyle(2, 0xffffff, 0.6);
      gfx.strokeCircle(x, y, radius);
      txt.setAlpha(0.9);
      handlers.down();
    });

    const release = () => {
      gfx.clear();
      gfx.fillStyle(color, 0.2);
      gfx.fillCircle(x, y, radius);
      gfx.lineStyle(2, 0xffffff, 0.35);
      gfx.strokeCircle(x, y, radius);
      txt.setAlpha(0.5);
      handlers.up();
    };
    zone.on('pointerup', release);
    zone.on('pointerout', release);
  }

  update() {
    // Rising-edge detection for one-shot inputs (jump, shoot)
    if (this._jumpRaw && !this._jumpPrev) {
      TOUCH_INPUT.jump = true;
    }
    this._jumpPrev = this._jumpRaw;

    if (this._shootRaw && !this._shootPrev) {
      TOUCH_INPUT.shoot = true;
    }
    this._shootPrev = this._shootRaw;
  }
}
