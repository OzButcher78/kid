// ════════════════════════════════════
//  MENU SCENE — title screen with controls and item guide
//  Adapts layout for mobile (IS_TOUCH) vs desktop
// ════════════════════════════════════
class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'Menu' }); }

  create() {
    const W = GAME_W, H = GAME_H;

    // Start music on first interaction anywhere (browser requires a gesture)
    this.input.once('pointerdown', () => this.startMusic());
    this.input.keyboard.once('keydown', () => this.startMusic());

    // Spacebar starts the game
    this.input.keyboard.on('keydown-SPACE', () => {
      this.startMusic();
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => this.scene.start('Story'));
    });

    // ── BACKGROUND ──────────────────────────────────────────────
    this.add.tileSprite(0, 0, W, H, 'bgsheet', 0).setOrigin(0).setAlpha(0.9);
    this.add.tileSprite(0, H - 216, W, 216, 'bgsheet', 2).setOrigin(0).setAlpha(0.7);

    const treeFrames = [0, 8, 16, 1, 9];
    for (let i = 0; i < 6; i++) {
      this.add.image(60 + i * 130, H - 80, 'pinetrees', treeFrames[i % 5])
        .setScale(1.4).setAlpha(0.65);
    }

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.42);
    overlay.fillRoundedRect(8, 8, W - 16, H - 16, 16);

    // ── CHARACTERS ──────────────────────────────────────────────
    this.add.sprite(200, H - 64, 'p-idle-0').setScale(1.5).play('p-idle');
    const e1 = this.add.sprite(500, H - 58, 'e-walk-0').setScale(1.5).play('e-walk');
    const e2 = this.add.sprite(630, H - 58, 'e-walk-0').setScale(1.5).play('e-walk').setTint(0xffbbcc);
    e1.setFlipX(true);

    if (IS_TOUCH) {
      this.createMobileMenu(W, H);
    } else {
      this.createDesktopMenu(W, H);
    }
  }

  createMobileMenu(W, H) {
    // Big title
    this.add.text(W / 2, 55, 'Kind vs Müttern', {
      fontSize: '52px', fill: '#ffd700', fontFamily: '"Bangers", cursive',
      stroke: '#5a0000', strokeThickness: 7, letterSpacing: 3
    }).setOrigin(0.5);

    this.add.text(W / 2, 110, 'von Noah B.', {
      fontSize: '24px', fill: '#ffffff', fontFamily: '"Bangers", cursive',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5);

    // Minimal controls hint
    this.add.text(W / 2, 160, '◀ ▶ Bewegen   ⬆ Springen   ● Werfen', {
      fontSize: '16px', fill: '#aaddff', fontFamily: '"Nunito", sans-serif', fontWeight: '700',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5);

    // Compact power-up list
    this.add.rectangle(W / 2, 230, 520, 80, 0x000000, 0.55);
    this.add.text(W / 2, 216, 'Schild  |  Turbo  |  Äpfel  |  Herz  |  Regenbogen', {
      fontSize: '15px', fill: '#ffffff', fontFamily: '"Nunito", sans-serif', fontWeight: '800',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5);
    this.add.text(W / 2, 240, 'Teleport  |  Mini  |  Banane  |  Rakete  |  Dash', {
      fontSize: '15px', fill: '#ffffff', fontFamily: '"Nunito", sans-serif', fontWeight: '800',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5);

    // BIG START BUTTON
    const btn = this.add.text(W / 2, 330, '  SPIEL STARTEN  ', {
      fontSize: '38px', fill: '#ffffff', fontFamily: '"Bangers", cursive',
      backgroundColor: '#8b1a1a', padding: { x: 30, y: 16 }, letterSpacing: 3
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      this.startMusic();
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => this.scene.start('Story'));
    });
    this.tweens.add({ targets: btn, scaleX: 1.03, scaleY: 1.03, duration: 600, yoyo: true, repeat: -1 });
  }

  startMusic() {
    // Start global background music (persists across scenes)
    if (!window._gameMusic) {
      try {
        window._gameMusic = this.sound.add('music', { loop: true, volume: 0.15 });
        window._gameMusic.play();
      } catch(e) { console.warn('Music failed:', e); }
    } else if (!window._gameMusic.isPlaying) {
      window._gameMusic.play();
    }
  }

  createDesktopMenu(W, H) {
    const txts = { // shared text styles
      head: { fontSize: '18px', fill: '#ffd700', fontFamily: '"Bangers", cursive', stroke: '#000', strokeThickness: 3, letterSpacing: 1 },
      item: { fontSize: '15px', fill: '#ffffff', fontFamily: '"Nunito", sans-serif', fontWeight: '800', stroke: '#000', strokeThickness: 2 },
      key:  { fontSize: '15px', fill: '#aaddff', fontFamily: '"Nunito", sans-serif', fontWeight: '700', stroke: '#000', strokeThickness: 2 },
    };

    // ── TITLE ──────────────────────────────────────────────────
    this.add.text(W / 2, 50, 'Kind vs Müttern', {
      fontSize: '46px', fill: '#ffd700', fontFamily: '"Bangers", cursive',
      stroke: '#5a0000', strokeThickness: 6, letterSpacing: 2
    }).setOrigin(0.5);
    this.add.text(W / 2, 98, 'Entkommt die Müttern!', {
      fontSize: '16px', fill: '#ffcccc', fontFamily: '"Nunito", sans-serif', fontWeight: '700',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5);
    this.add.text(W / 2, 122, 'von Noah B.', {
      fontSize: '22px', fill: '#ffffff', fontFamily: '"Bangers", cursive',
      stroke: '#000000', strokeThickness: 3, letterSpacing: 1
    }).setOrigin(0.5);

    // ── LEFT PANEL: POWER-UPS ──────────────────────────────────
    const panelG = this.add.graphics();
    // Left panel
    panelG.fillStyle(0x000000, 0.55);
    panelG.fillRoundedRect(16, 150, 260, 260, 12);
    panelG.lineStyle(1.5, 0xffd700, 0.4);
    panelG.strokeRoundedRect(16, 150, 260, 260, 12);
    // Right panel
    panelG.fillStyle(0x000000, 0.55);
    panelG.fillRoundedRect(W - 276, 150, 260, 260, 12);
    panelG.lineStyle(1.5, 0xaaddff, 0.4);
    panelG.strokeRoundedRect(W - 276, 150, 260, 260, 12);

    this.add.text(146, 162, 'POWER-UPS', txts.head).setOrigin(0.5, 0);

    const powers = [
      ['🛡️', 'Schild', '3x Blocken'],
      ['⚡', 'Turbo', 'Schneller laufen'],
      ['🍎', 'Äpfel', 'Werfen (Space)'],
      ['❤️', 'Herz', '+1 Leben'],
      ['🌈', 'Regenbogen', 'Bunter Trail'],
      ['🔮', 'Teleport', 'Teleport-Apfel'],
      ['🔹', 'Mini', 'Schrumpfen'],
      ['🍌', 'Banane', 'Gegner einfrieren'],
      ['🚀', 'Rakete', 'Langsam schweben'],
      ['💨', 'Dash', 'Sprint-Angriff'],
    ];
    powers.forEach(([icon, name, desc], i) => {
      const y = 190 + i * 22;
      this.add.text(30, y, `${icon} ${name}`, txts.item).setOrigin(0, 0);
      this.add.text(158, y, desc, { ...txts.item, fill: '#cccccc', fontSize: '13px' }).setOrigin(0, 0);
    });

    // ── RIGHT PANEL: CONTROLS ──────────────────────────────────
    this.add.text(W - 146, 162, 'STEUERUNG', txts.head).setOrigin(0.5, 0);

    const controls = [
      ['← →', 'Bewegen'],
      ['↑ / W', 'Springen'],
      ['↑↑ / WW', 'Doppelsprung'],
      ['SPACE', 'Äpfel werfen'],
      ['SPACE', 'Banane werfen'],
      ['SPACE', 'Dash ausführen'],
      ['Q', 'Teleport-Apfel'],
      ['', ''],
      ['ESC', 'Pause'],
    ];
    controls.forEach(([key, action], i) => {
      if (!key && !action) return;
      const y = 190 + i * 24;
      // Key badge
      if (key) {
        this.add.text(W - 262, y, key, {
          fontSize: '13px', fill: '#ffffff', fontFamily: '"Nunito", sans-serif', fontWeight: '800',
          backgroundColor: '#444466', padding: { x: 4, y: 2 }, stroke: '#000', strokeThickness: 1
        }).setOrigin(0, 0);
      }
      this.add.text(W - 190, y, action, txts.key).setOrigin(0, 0);
    });

    // ── START BUTTON ───────────────────────────────────────────
    const btn = this.add.text(W / 2, 468, ' SPIEL STARTEN ', {
      fontSize: '24px', fill: '#ffffff', fontFamily: '"Bangers", cursive',
      backgroundColor: '#8b1a1a', padding: { x: 22, y: 10 }, letterSpacing: 2
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setStyle({ fill: '#ffd700' }));
    btn.on('pointerout',  () => btn.setStyle({ fill: '#ffffff' }));
    btn.on('pointerdown', () => {
      this.startMusic();
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => this.scene.start('Story'));
    });
    this.tweens.add({ targets: btn, alpha: 0.75, duration: 700, yoyo: true, repeat: -1 });

    // Spacebar hint
    this.add.text(W / 2, 500, 'oder LEERTASTE drücken', {
      fontSize: '12px', fill: '#888888', fontFamily: '"Nunito", sans-serif', fontWeight: '700',
      stroke: '#000', strokeThickness: 1
    }).setOrigin(0.5);
  }
}
