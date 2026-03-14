// ════════════════════════════════════
//  MENU SCENE — title screen with controls and item guide
// ════════════════════════════════════
class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'Menu' }); }

  create() {
    const W = GAME_W, H = GAME_H;

    this.add.tileSprite(0, 0, W, H, 'bgsheet', 0).setOrigin(0).setAlpha(0.9);
    this.add.tileSprite(0, H - 216, W, 216, 'bgsheet', 2).setOrigin(0).setAlpha(0.7);

    const treeFrames = [0, 8, 16, 1, 9];
    for (let i = 0; i < 6; i++) {
      this.add.image(60 + i * 130, H - 80, 'pinetrees', treeFrames[i % 5])
        .setScale(1.4).setAlpha(0.65);
    }

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.42);

    this.add.sprite(200, H - 64, 'p-idle-0').setScale(1.5).play('p-idle');
    const e1 = this.add.sprite(500, H - 58, 'e-walk-0').setScale(1.5).play('e-walk');
    const e2 = this.add.sprite(630, H - 58, 'e-walk-0').setScale(1.5).play('e-walk').setTint(0xffbbcc);
    e1.setFlipX(true);

    this.add.text(W / 2, 60, 'Kind vs Müttern', {
      fontSize: '42px', fill: '#ffd700', fontFamily: '"Bangers", cursive',
      stroke: '#5a0000', strokeThickness: 6, letterSpacing: 2
    }).setOrigin(0.5);
    this.add.text(W / 2, 108, 'Entkommt die Müttern!', {
      fontSize: '16px', fill: '#ffcccc', fontFamily: '"Nunito", sans-serif', fontWeight: '700'
    }).setOrigin(0.5);
    this.add.text(W / 2, 138, 'von Noah B.', {
      fontSize: '20px', fill: '#ffffff', fontFamily: '"Bangers", cursive',
      stroke: '#000000', strokeThickness: 3, letterSpacing: 1
    }).setOrigin(0.5);

    this.add.rectangle(W / 2, 215, 500, 95, 0x000000, 0.5);
    const controls = IS_TOUCH
      ? ['◀ ▶ Tasten   Bewegen', '⬆ Taste   Springen (2x möglich)', '● Taste   Äpfel werfen']
      : ['Pfeiltasten / WASD   Bewegen', '↑ / W   Springen (2x möglich)', 'LEERTASTE   Äpfel werfen'];
    controls.forEach((c, i) => this.add.text(W / 2, 186 + i * 27, c, {
        fontSize: '13px', fill: '#aaddff', fontFamily: '"Nunito", sans-serif', fontWeight: '700'
      }).setOrigin(0.5));

    this.add.text(W / 2, 298, 'EINSAMMELN:', {
      fontSize: '14px', fill: '#ffffff', fontFamily: '"Nunito", sans-serif', fontWeight: '800'
    }).setOrigin(0.5);
    [['Schild (gold)', 'Blockt 3 Treffer'],
     ['Turbo (cyan)', '8 Sek. schneller laufen'],
     ['Apfel (orange)', '3 Äpfel werfen — LEERTASTE'],
     ['Herz (rot)', '+1 Leben']]
      .forEach(([item, desc], i) => this.add.text(W / 2, 324 + i * 24, `• ${item}: ${desc}`, {
        fontSize: '12px', fill: '#cccccc', fontFamily: '"Nunito", sans-serif', fontWeight: '700'
      }).setOrigin(0.5));

    const btn = this.add.text(W / 2, 462, ' SPIEL STARTEN ', {
      fontSize: '22px', fill: '#ffffff', fontFamily: '"Bangers", cursive',
      backgroundColor: '#8b1a1a', padding: { x: 18, y: 10 }, letterSpacing: 2
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setStyle({ fill: '#ffd700' }));
    btn.on('pointerout',  () => btn.setStyle({ fill: '#ffffff' }));
    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => this.scene.start('Game'));
    });
    this.tweens.add({ targets: btn, alpha: 0.75, duration: 700, yoyo: true, repeat: -1 });
  }
}
