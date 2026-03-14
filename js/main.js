// ════════════════════════════════════
//  GAME INITIALIZATION
// ════════════════════════════════════
new Phaser.Game({
  type: Phaser.AUTO,
  width:  GAME_W,
  height: GAME_H,
  parent: 'game',
  backgroundColor: '#6aadbb',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 750 },
      debug: false   // true = Hitboxen sichtbar machen
    }
  },
  scene: [BootScene, MenuScene, GameScene, HUDScene, GameOverScene]
});
