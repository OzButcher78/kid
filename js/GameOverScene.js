// ════════════════════════════════════
//  GAME OVER SCENE — win/lose screen
// ════════════════════════════════════
class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOver' }); }
  init(d) { this.won = d.won; this.score = d.score || 0; }

  create() {
    const W = GAME_W, H = GAME_H;
    this.add.tileSprite(0, 0, W, H, 'bgsheet', 0).setOrigin(0);
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, this.won ? 0.4 : 0.65);

    if (this.won) {
      for (let i = 0; i < 50; i++) {
        const s = this.add.text(
          Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
          '*', { fontSize: `${Phaser.Math.Between(12, 28)}px`, fill: '#ffd700' }
        );
        this.tweens.add({ targets: s, alpha: 0.1, duration: Phaser.Math.Between(600, 1400), yoyo: true, repeat: -1 });
      }
    }

    this.add.text(W / 2, 120, this.won ? 'GEWONNEN!' : 'GAME OVER', {
      fontSize: '42px', fill: this.won ? '#ffd700' : '#ff4444',
      fontFamily: '"Bangers", cursive', stroke: '#000', strokeThickness: 5, letterSpacing: 3
    }).setOrigin(0.5);

    this.add.text(W / 2, 205, 'PUNKTE: ' + this.score, {
      fontSize: '28px', fill: '#ffffff', fontFamily: '"Bangers", cursive', letterSpacing: 2
    }).setOrigin(0.5);

    this.add.text(W / 2, 300,
      this.won
        ? 'Du hast alle Mütter überlebt!\n    HELD DES SPIELPLATZES!'
        : 'Die Mütter waren zu stark...\n      Versuch es nochmal!',
      { fontSize: '16px', fill: '#cccccc', fontFamily: '"Nunito", sans-serif', fontWeight: '700', align: 'center', lineSpacing: 10 }
    ).setOrigin(0.5);

    this.makeBtn(W / 2, 420, 'NOCHMAL',     this.won ? '#1e6e3a' : '#8b1a1a',
      () => { this.fade(() => this.scene.start('Game')); });
    this.makeBtn(W / 2, 490, 'HAUPTMENUE',  '#1a2a3a',
      () => { this.fade(() => this.scene.start('Menu')); });
  }

  fade(cb) {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(300, cb);
  }

  makeBtn(x, y, label, bg, cb) {
    const btn = this.add.text(x, y, '  ' + label + '  ', {
      fontSize: '22px', fill: '#fff', fontFamily: '"Bangers", cursive',
      backgroundColor: bg, padding: { x: 14, y: 10 }, letterSpacing: 2
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerover',  () => btn.setAlpha(0.8));
    btn.on('pointerout',   () => btn.setAlpha(1.0));
    btn.on('pointerdown',  cb);
  }
}
