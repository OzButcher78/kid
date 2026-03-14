// ════════════════════════════════════
//  TOUCH CONTROLS SCENE — on-screen buttons for mobile
//  Launched in parallel with HUD when IS_TOUCH is true.
//  All buttons in one horizontal row at the bottom.
// ════════════════════════════════════
class TouchControlsScene extends Phaser.Scene {
  constructor() { super({ key: 'TouchControls' }); }

  create() {
    this.input.addPointer(1);  // 3 total pointers for multi-touch

    this._jumpRaw   = false;
    this._jumpPrev  = false;
    this._shootRaw  = false;
    this._shootPrev = false;

    const Y = 500;  // single row Y position
    const R = 42;   // uniform radius

    // ── LEFT: movement buttons ──────────────────────────────────
    this.createButton(55,  Y, R, 0xffffff, '◀', {
      down: () => { TOUCH_INPUT.left = true; },
      up:   () => { TOUCH_INPUT.left = false; },
    });

    this.createButton(155, Y, R, 0xffffff, '▶', {
      down: () => { TOUCH_INPUT.right = true; },
      up:   () => { TOUCH_INPUT.right = false; },
    });

    // ── RIGHT: action buttons (inline, same row) ────────────────
    this.createButton(645, Y, R, 0xff8800, '●', {
      down: () => { this._shootRaw = true; },
      up:   () => { this._shootRaw = false; },
    });

    this.createButton(745, Y, R + 5, 0x44cc44, '⬆', {
      down: () => { this._jumpRaw = true; },
      up:   () => { this._jumpRaw = false; },
    });

    // Labels
    this.add.text(105, Y + 48, 'BEWEGEN', {
      fontSize: '9px', fill: '#ffffff', fontFamily: '"Nunito", sans-serif', fontWeight: '700'
    }).setOrigin(0.5).setAlpha(0.35);

    this.add.text(645, Y + 48, 'WURF', {
      fontSize: '9px', fill: '#ffffff', fontFamily: '"Nunito", sans-serif', fontWeight: '700'
    }).setOrigin(0.5).setAlpha(0.35);

    this.add.text(745, Y + 48, 'SPRING', {
      fontSize: '9px', fill: '#ffffff', fontFamily: '"Nunito", sans-serif', fontWeight: '700'
    }).setOrigin(0.5).setAlpha(0.35);
  }

  createButton(x, y, radius, color, label, handlers) {
    const gfx = this.add.graphics();
    gfx.fillStyle(color, 0.2);
    gfx.fillCircle(x, y, radius);
    gfx.lineStyle(2, 0xffffff, 0.35);
    gfx.strokeCircle(x, y, radius);

    const txt = this.add.text(x, y, label, {
      fontSize: `${Math.round(radius * 0.7)}px`, fill: '#ffffff',
      fontFamily: '"Bangers", cursive'
    }).setOrigin(0.5).setAlpha(0.5);

    const zone = this.add.zone(x, y, radius * 2, radius * 2)
      .setInteractive().setOrigin(0.5);

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
