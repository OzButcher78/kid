// ════════════════════════════════════
//  GAME INITIALIZATION
// ════════════════════════════════════
new Phaser.Game({
  type: Phaser.AUTO,
  pixelArt: true,
  width:  GAME_W,
  height: GAME_H,
  parent: 'game',
  backgroundColor: '#6aadbb',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 3,   // support 3 simultaneous touch points
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 750 },
      debug: false   // true = Hitboxen sichtbar machen
    }
  },
  scene: [BootScene, MenuScene, StoryScene, GameScene, HUDScene, GameOverScene, TouchControlsScene]
});
