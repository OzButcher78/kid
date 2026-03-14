// ════════════════════════════════════
//  BOOT SCENE — preloads all assets, defines all animations
// ════════════════════════════════════
class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'Boot' }); }

  preload() {
    const bar = this.add.rectangle(GAME_W / 2 - 200, GAME_H / 2, 0, 14, 0x4ecdc4).setOrigin(0, 0.5);
    this.add.rectangle(GAME_W / 2, GAME_H / 2, 404, 18, 0x223322).setOrigin(0.5);
    this.add.text(GAME_W / 2, GAME_H / 2 - 30, 'LADEN...', {
      fontSize: '18px', fill: '#aaffaa', fontFamily: '"Nunito", sans-serif', fontWeight: '800'
    }).setOrigin(0.5);
    this.load.on('progress', v => { bar.width = 400 * v; });

    // Log and display load/process errors on-screen (up to 5 visible)
    const failedFiles = [];
    this.load.on('loaderror', (file) => {
      console.error('Load error:', file.type, file.key, '→', file.src);
      failedFiles.push(file.key);
      if (failedFiles.length <= 5) {
        this.add.text(GAME_W / 2, GAME_H / 2 + 30 + failedFiles.length * 14,
          `FAIL: ${file.key} — ${file.src?.split('/').slice(-2).join('/')}`,
          { fontSize: '7px', fill: '#ff4444', fontFamily: 'monospace' }
        ).setOrigin(0.5);
      }
    });

    // Player individual frames (64×64 each)
    const pBase = 'assets/char1/Character1M_1_';
    ['idle','walk','run'].forEach(anim => {
      for (let i = 0; i < 8; i++)
        this.load.image(`p-${anim}-${i}`, `${pBase}${anim}_${i}.png`);
    });
    for (let i = 0; i < 2; i++) this.load.image(`p-jump-${i}`, `${pBase}jump_${i}.png`);
    for (let i = 0; i < 2; i++) this.load.image(`p-fall-${i}`, `${pBase}fall_${i}.png`);
    for (let i = 0; i < 2; i++) this.load.image(`p-hurt-${i}`, `${pBase}damage_${i}.png`);

    // Enemy individual frames (64×64 each)
    const eBase = 'assets/enemy/Character1F_1_';
    ['idle','walk','run'].forEach(anim => {
      for (let i = 0; i < 8; i++)
        this.load.image(`e-${anim}-${i}`, `${eBase}${anim}_${i}.png`);
    });
    for (let i = 0; i < 6; i++) this.load.image(`e-punch-${i}`, `${eBase}punch_${i}.png`);
    for (let i = 0; i < 2; i++) this.load.image(`e-hurt-${i}`, `${eBase}damage_${i}.png`);

    // Fruits (spritesheets 544×32, 17 frames at 32×32)
    const fruits = ['Apple','Bananas','Cherries','Kiwi','Melon','Orange','Pineapple','Strawberry'];
    fruits.forEach(name => {
      this.load.spritesheet(`fruit-${name.toLowerCase()}`, `assets/Fruits/${name}.png`,
        { frameWidth: 32, frameHeight: 32 });
    });

    this.load.spritesheet('bgsheet',   'assets/Background-sheet.png', { frameWidth: 384, frameHeight: 216 });
    this.load.spritesheet('pinetrees', 'assets/PineTrees.png',        { frameWidth: 128, frameHeight: 128 });

    // Boxes — three visual styles, each with Idle / Hit / Break frames
    ['Box1','Box2','Box3'].forEach((box, i) => {
      const k = `box${i + 1}`;
      this.load.image(`${k}-idle`,  `assets/Boxes/${box}/Idle.png`);
      this.load.image(`${k}-hit`,   encodeURI(`assets/Boxes/${box}/Hit (28x24).png`));
      this.load.image(`${k}-break`, `assets/Boxes/${box}/Break.png`);
    });

    // Checkpoints & end marker — load flagged versions as spritesheets so only one frame shows
    this.load.image('cp-noflag', encodeURI('assets/Checkpoints/Checkpoint/Checkpoint (No Flag).png'));
    this.load.spritesheet('cp-idle', encodeURI('assets/Checkpoints/Checkpoint/Checkpoint (Flag Idle)(64x64).png'), { frameWidth: 64, frameHeight: 64 });
    this.load.image('end-idle',  encodeURI('assets/Checkpoints/End/End (Idle).png'));
    this.load.spritesheet('end-press', encodeURI('assets/Checkpoints/End/End (Pressed) (64x64).png'), { frameWidth: 64, frameHeight: 64 });

    // UI assets
    this.load.spritesheet('shield-ring', 'assets/03.png', { frameWidth: 48, frameHeight: 36 });
    this.load.spritesheet('health-bar',  'assets/05.png', { frameWidth: 48, frameHeight: 32 });
    this.load.spritesheet('bonus-bars',  'assets/06.png', { frameWidth: 128, frameHeight: 24 });
  }

  create() {
    try {
      // Helper: build frames array from image keys
      const imgFrames = (prefix, count) =>
        Array.from({ length: count }, (_, i) => ({ key: `${prefix}-${i}` }));

      // Player animations
      this.anims.create({ key: 'p-idle', frames: imgFrames('p-idle', 8), frameRate: 8,  repeat: -1 });
      this.anims.create({ key: 'p-walk', frames: imgFrames('p-walk', 8), frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'p-run',  frames: imgFrames('p-run',  8), frameRate: 12, repeat: -1 });
      this.anims.create({ key: 'p-jump', frames: imgFrames('p-jump', 2), frameRate: 8,  repeat: 0  });
      this.anims.create({ key: 'p-fall', frames: imgFrames('p-fall', 2), frameRate: 8,  repeat: -1 });
      this.anims.create({ key: 'p-hurt', frames: imgFrames('p-hurt', 2), frameRate: 10, repeat: 0  });

      // Enemy animations
      this.anims.create({ key: 'e-idle',  frames: imgFrames('e-idle',  8), frameRate: 8,  repeat: -1 });
      this.anims.create({ key: 'e-walk',  frames: imgFrames('e-walk',  8), frameRate: 8,  repeat: -1 });
      this.anims.create({ key: 'e-run',   frames: imgFrames('e-run',   8), frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'e-punch', frames: imgFrames('e-punch', 6), frameRate: 10, repeat: 0  });
      this.anims.create({ key: 'e-hurt',  frames: imgFrames('e-hurt',  2), frameRate: 10, repeat: 0  });

      // Fruit animations
      ['apple','bananas','cherries','kiwi','melon','orange','pineapple','strawberry'].forEach(name => {
        const frames = this.anims.generateFrameNumbers(`fruit-${name}`, { start: 0, end: 16 });
        if (!frames || frames.length === 0) {
          console.warn(`Skipping animation fruit-${name}: spritesheet not loaded`);
          return;
        }
        this.anims.create({ key: `fruit-${name}`, frames, frameRate: 15, repeat: -1 });
      });

      // Shield ring animation
      this.anims.create({ key: 'shield-ring', frames: this.anims.generateFrameNumbers('shield-ring', { start: 0, end: 4 }), frameRate: 8, repeat: -1 });

      this.scene.start('Menu');
    } catch(err) {
      console.error('BootScene create error:', err);
      this.add.text(GAME_W/2, GAME_H/2 + 60, 'ERROR: ' + err.message, {
        fontSize: '8px', fill: '#ff0000', fontFamily: 'monospace', wordWrap: { width: 700 }
      }).setOrigin(0.5);
    }
  }
}
