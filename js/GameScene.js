// ════════════════════════════════════
//  GAME SCENE — main gameplay
// ════════════════════════════════════
class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'Game' }); }

  init(data) {
    this.level        = (data && data.level) || 1;
    this.lives        = (data && data.lives != null) ? data.lives : 3;
    this.score        = (data && data.score) || 0;
    this.shieldHits   = 0;
    this.hasSpeed     = false;
    this.hasApple     = false;
    this.appleCount   = 0;
    this.playerApples = [];
    this.hasRainbow   = false;
    this.hasTeleport  = false;
    this.teleportCount = 0;
    this.isMini       = false;
    this.hasBanana    = false;
    this.bananaCount  = 0;
    this.hasRocket    = false;
    this.hasDash      = false;
    this.isDashing    = false;
    this.isHurt       = false;
    this.powerQueue   = [];      // queued timed power-ups
    this.activePower  = null;    // currently active timed power-up name
    this.jumpCount    = 0;
    this.gameOver     = false;
    this.playerAnim   = '';
    this.projectiles  = [];
    this.wasOnGround  = true;
    this.groundFrames = 0;
    this.respawnX     = 120;
    this.respawnY     = GAME_H - 72;

    // Difficulty scaling per level
    this.enemySpeedScale  = 1 + (this.level - 1) * 0.18;   // +18% per level
    this.boxHitScale      = this.level;                      // multiplier for box hits (capped at 6)
  }

  create() {
    const W = LEVEL_W;
    const H = GAME_H;

    this.physics.world.setBounds(0, 0, W, H + 300);

    // ── PARALLAX BACKGROUNDS ──────────────────────────────────────
    this.bg0 = this.add.tileSprite(0, 0, GAME_W, H, 'bgsheet', 0)
      .setOrigin(0).setScrollFactor(0).setDepth(0);
    this.bg1 = this.add.tileSprite(0, 0, GAME_W, H, 'bgsheet', 1)
      .setOrigin(0).setScrollFactor(0).setDepth(1).setAlpha(0.8);
    this.bg2 = this.add.tileSprite(0, H - 248, GAME_W, 248, 'bgsheet', 2)
      .setOrigin(0).setScrollFactor(0).setDepth(2).setAlpha(0.7);

    // Pine trees mid-ground
    const treeFrames = [0, 1, 2, 8, 9, 10, 16, 17, 18];
    for (let i = 0; i < 38; i++) {
      const x  = Phaser.Math.Between(0, W);
      const sc = Phaser.Math.FloatBetween(0.7, 1.5);
      this.add.image(x, H - 70 - sc * 52, 'pinetrees', treeFrames[i % treeFrames.length])
        .setScale(sc)
        .setScrollFactor(sc > 1.1 ? 0.25 : 0.15)
        .setDepth(3)
        .setAlpha(0.5 + sc * 0.08);
    }

    // ── PLATFORMS ────────────────────────────────────────────────
    this.platforms = this.physics.add.staticGroup();
    this.buildLevel(W, H);
    this.buildNavGraph();  // pre-compute platform connections for enemy AI

    // ── PLAYER ───────────────────────────────────────────────────
    // BUG-001 fix: setSize(30,40) so body bottom = texture row 48, matching feet at row 47
    this.player = this.physics.add.sprite(120, H - 72, 'p-idle-0');
    this.player.setScale(1.5).setCollideWorldBounds(true).setDepth(10);
    this.player.body.setSize(20, 32);    // narrower body (no air-standing), shorter (no early head bump)
    this.player.body.setOffset(22, 16); // centered horizontally, starts below head
    this.setPlayerAnim('p-idle');

    // Shield ring visual — programmatic rotating ring
    this.shieldGfx = this.add.graphics().setDepth(9).setVisible(false);
    this.shieldAngle = 0;

    // ── ENEMIES ──────────────────────────────────────────────────
    this.enemies = this.physics.add.group();
    this.spawnEnemies(H);

    // ── BOXES ─────────────────────────────────────────────────────
    this.boxes = this.physics.add.staticGroup();
    this.spawnBoxes(H);

    // ── CHECKPOINTS ───────────────────────────────────────────────
    this.spawnCheckpoints(H);

    // ── PROJECTILE POOL ──────────────────────────────────────────
    this.fruitPool = this.physics.add.group({
      classType: Phaser.GameObjects.Sprite,
      maxSize: 20,
      runChildUpdate: false,
    });

    this.collTriggers = this.physics.add.staticGroup();

    // ── GOAL ─────────────────────────────────────────────────────
    this.endSprite = this.add.image(W - 155, H - 48, 'end-idle').setScale(2).setDepth(5).setOrigin(0.5, 1);
    this.goalZone = this.add.zone(W - 155, H - 96, 80, 100).setOrigin(0.5);
    this.physics.world.enable(this.goalZone);
    this.goalZone.body.setAllowGravity(false);

    // ── COLLISIONS ───────────────────────────────────────────────
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.player, this.boxes, this.onBoxHit, null, this);
    this.physics.add.overlap(this.player, this.enemies,      this.onEnemyContact, null, this);
    this.physics.add.overlap(this.player, this.collTriggers, this.onCollect,       null, this);
    this.physics.add.overlap(this.player, this.goalZone,     this.onGoalReached,   null, this);

    // ── CAMERA ───────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, W, H);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.12);

    // ── BACKGROUND MUSIC & SOUND EFFECTS ─────────────────────────
    const sfxBase = 'assets/sound-effects/';
    this.load.audio('snd-jump',      sfxBase + 'Woosh_1.ogg');
    this.load.audio('snd-land',      sfxBase + 'Thud1.ogg');
    this.load.audio('snd-stomp',     sfxBase + 'Crunch_1.ogg');
    this.load.audio('snd-hurt',      sfxBase + 'Thudd1.mp3');
    this.load.audio('snd-throw',     sfxBase + 'Thudd2.ogg');       // BUG-005: dedicated throw sound
    this.load.audio('snd-box-bump',  sfxBase + 'Thudd1.mp3');       // box head-bump sound
    this.load.audio('snd-blocked',   sfxBase + 'Parry1.ogg');
    this.load.audio('snd-collect',   sfxBase + 'Clickandrelease_1.ogg');
    this.load.audio('snd-win',       sfxBase + 'sucess1.mp3');
    this.load.audio('snd-gameover',  sfxBase + 'RegularShowShort.ogg');
    this.load.audio('snd-box-hit',   sfxBase + 'Clang1.ogg');
    this.load.audio('snd-box-break', sfxBase + 'Snap_1.ogg');
    this.load.on('loaderror', (file) => {
      console.warn('[SFX] Failed to load audio:', file.key, '→', file.src);
    });
    this.load.once('complete', () => {
      // Music is managed globally from MenuScene (window._gameMusic)
      // Resume if it was stopped (e.g. game over → retry)
      if (window._gameMusic && !window._gameMusic.isPlaying) {
        try { window._gameMusic.play(); } catch(e) {}
      }
      const vol = (k, v) => {
        try { this[k] = this.sound.add(k, { volume: v }); }
        catch(e) { console.warn('[SFX] sound.add failed for key:', k, e); }
      };
      // BUG-003: all SFX volumes boosted ~50%
      vol('snd-jump',      0.45);
      vol('snd-land',      0.38);
      vol('snd-stomp',     0.70);
      vol('snd-hurt',      0.75);
      vol('snd-throw',     0.60);
      vol('snd-box-bump',  0.65);
      vol('snd-blocked',   0.70);
      vol('snd-collect',   0.60);
      vol('snd-win',       0.75);
      vol('snd-gameover',  0.75);
      vol('snd-box-hit',   0.65);
      vol('snd-box-break', 0.70);
    });
    this.load.start();
    this.events.once('shutdown', () => {});

    // ── INPUT ─────────────────────────────────────────────────────
    this.cursors  = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.aKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.dKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.wKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.qKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    this.scene.launch('HUD', { gameScene: this, level: this.level });
    if (IS_TOUCH) this.scene.launch('TouchControls');

    // Level start banner
    if (this.level > 1) {
      const banner = this.add.text(GAME_W / 2, GAME_H / 2 - 40, `LEVEL ${this.level}`, {
        fontSize: '48px', fill: '#ffd700', fontFamily: '"Bangers", cursive',
        stroke: '#000', strokeThickness: 6
      }).setOrigin(0.5).setScrollFactor(0).setDepth(50);
      const sub = this.add.text(GAME_W / 2, GAME_H / 2 + 10, 'Es wird schwerer!', {
        fontSize: '18px', fill: '#ffffff', fontFamily: '"Nunito", sans-serif', fontWeight: '700',
        stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setScrollFactor(0).setDepth(50);
      this.tweens.add({ targets: [banner, sub], alpha: 0, delay: 1800, duration: 600, onComplete: () => { banner.destroy(); sub.destroy(); } });
    }
  }

  // ── Only switch animation when it actually changes ──
  setPlayerAnim(key) {
    if (this.playerAnim !== key) {
      this.playerAnim = key;
      this.player.play(key, true);
    }
  }

  buildLevel(W, H) {
    const gfx = this.add.graphics().setDepth(4);

    // Store platform metadata for enemy navigation
    this.platData = [];

    const addPlat = (x, y, w, h = 20, col = 0x4a7c44) => {
      gfx.fillStyle(col);
      gfx.fillRect(x - w / 2, y - h / 2, w, h);
      if (h <= 22) { gfx.fillStyle(0x66bb6a); gfx.fillRect(x - w / 2, y - h / 2, w, 5); }
      const r = this.add.rectangle(x, y, w, h).setVisible(false);
      this.physics.add.existing(r, true);
      this.platforms.add(r);
      // Save platform info for AI pathfinding
      this.platData.push({
        x, y, w, h,
        top:   y - h / 2,
        left:  x - w / 2,
        right: x + w / 2,
      });
    };

    addPlat(W / 2, H - 24, W, 48, 0x3e2723);  // thicker ground (48px) to prevent fall-through

    [
      [340,  H-110, 180], [600,  H-185, 150], [860,  H-130, 200],
      [1150, H-210, 180], [1400, H-155, 200], [1660, H-248, 160], [1910, H-175, 220],
      [2210, H-295, 180], [2470, H-208, 200], [2720, H-158, 180], [2970, H-248, 220],
      [3260, H-192, 200], [3510, H-288, 180], [3760, H-203, 200], [4010, H-168, 180],
      [4290, H-243, 200], [4540, H-178, 180], [4790, H-298, 200], [5010, H-213, 220],
      [730,  H-325,  90], [1260, H-345,  90], [2060, H-395,  90],
      [2910, H-363,  90], [3660, H-415,  90], [4460, H-385,  90],
    ].forEach(([x, y, w]) => addPlat(x, y, w));
  }

  // ── PLATFORM-AWARE AI: NAV GRAPH + BFS PATHFINDING ───────────

  // Build navigation graph once after level is created
  buildNavGraph() {
    // Calculate nav limits from ACTUAL physics (not hardcoded)
    const gravity   = 750;
    const jumpV     = 520 + (this.level - 1) * 15;  // matches jumpPower in handleEnemies
    const maxJumpH  = Math.floor(jumpV * jumpV / (2 * gravity) * 0.95);  // 95% safety — enemies jump near max
    const jumpTime  = 2 * jumpV / gravity;
    const launchSpd = 90 * Math.min(this.enemySpeedScale, 1.6) * 2.2; // matches launch in handleEnemies
    const maxJumpDx = Math.floor(launchSpd * jumpTime * 0.9);   // 90% safety margin
    const plats = this.platData;

    // For each platform, find which other platforms are reachable
    for (let i = 0; i < plats.length; i++) {
      plats[i].id = i;
      plats[i].neighbors = [];
    }

    for (let i = 0; i < plats.length; i++) {
      for (let j = 0; j < plats.length; j++) {
        if (i === j) continue;
        const a = plats[i], b = plats[j];
        // Can jump UP from a to b?
        const hDiff = a.top - b.top; // positive = b is higher
        if (hDiff > 0 && hDiff <= maxJumpH) {
          // Horizontal gap: distance between closest edges
          const gap = Math.max(0, b.left - a.right, a.left - b.right);
          if (gap <= maxJumpDx) {
            a.neighbors.push({ plat: b, type: 'jump' });
          }
        }
        // Can DROP from a to b? (b is lower, and horizontally overlapping or close)
        if (hDiff < 0 && hDiff > -400) {
          const gap = Math.max(0, b.left - a.right, a.left - b.right);
          if (gap <= maxJumpDx) {
            a.neighbors.push({ plat: b, type: 'drop' });
          }
        }
      }
    }
  }

  // Find which platform an entity is standing on
  findPlatformAt(ex, ey) {
    let best = null, bestDist = Infinity;
    for (const p of this.platData) {
      if (ex >= p.left - 30 && ex <= p.right + 30) {
        const d = p.top - ey;
        if (d >= -15 && d < bestDist) { bestDist = d; best = p; }
      }
    }
    return best;
  }

  // BFS: find shortest path of platforms from start to goal
  findPlatPath(startPlat, goalPlat) {
    if (!startPlat || !goalPlat || startPlat === goalPlat) return null;

    const queue = [{ plat: startPlat, path: [] }];
    const visited = new Set([startPlat.id]);

    while (queue.length > 0) {
      const { plat, path } = queue.shift();
      for (const edge of plat.neighbors) {
        if (visited.has(edge.plat.id)) continue;
        const newPath = [...path, { from: plat, to: edge.plat, type: edge.type }];
        if (edge.plat === goalPlat) return newPath;
        visited.add(edge.plat.id);
        queue.push({ plat: edge.plat, path: newPath });
      }
    }
    return null; // no path found
  }

  // Get the next waypoint for an enemy chasing the player
  // Returns: { x, jumpDir, jump } or null
  // jumpDir = the direction to FACE and MOVE during the jump (toward next platform)
  getNavWaypoint(enemyX, enemyY, targetPlat, preferSide) {
    if (!targetPlat) return null;

    const ePlatform = this.findPlatformAt(enemyX, enemyY);
    if (!ePlatform) return null;
    if (ePlatform === targetPlat) return null;

    const path = this.findPlatPath(ePlatform, targetPlat);
    if (!path || path.length === 0) {
      return { x: targetPlat.x, dir: targetPlat.x > enemyX ? 1 : -1, jump: false, jumpDir: 0 };
    }

    const step = path[0];
    const next = step.to;
    const cur  = ePlatform;

    if (step.type === 'jump') {
      // CRITICAL: platforms are SOLID — can't jump through from below!
      // Must jump from BESIDE the target platform, arcing onto it from the side.

      let jumpX, jumpDir;

      if (preferSide === 1) {
        // Force approach from the LEFT
        jumpX = next.left - 50;
        jumpDir = 1;
      } else if (preferSide === 2) {
        // Force approach from the RIGHT
        jumpX = next.right + 50;
        jumpDir = -1;
      } else {
        // Auto: pick whichever side the enemy is closer to
        const distToLeft  = Math.abs(enemyX - next.left);
        const distToRight = Math.abs(enemyX - next.right);
        if (distToLeft <= distToRight) {
          jumpX = next.left - 50;
          jumpDir = 1;
        } else {
          jumpX = next.right + 50;
          jumpDir = -1;
        }
      }

      return {
        x: jumpX,
        dir: jumpX > enemyX ? 1 : (jumpX < enemyX ? -1 : jumpDir),
        jump: true,
        jumpDir: jumpDir,
      };
    } else {
      // Drop down — run off the edge toward the next platform
      const dropDir = next.x > enemyX ? 1 : -1;
      const edgeX = dropDir > 0 ? cur.right + 20 : cur.left - 20;
      return { x: edgeX, dir: dropDir, jump: false, jumpDir: dropDir };
    }
  }

  spawnEnemies(H) {
    // BUG-001 fix: spawn Y recalculated for body bottom at texture row 48
    // body.bottom = sprite.y + 24 → sprite.y = ground_top - 24
    // Ground top = H - 48 → spawn_y = H - 72
    [
      [500,  H-72,  'enemy1', 150],  // ground
      [860,  H-164, 'enemy2',  85],  // platform H-130 (top H-140)
      [1660, H-282, 'enemy1',  70],  // platform H-248 (top H-258)
      [2500, H-72,  'enemy2', 150],  // ground
      [3260, H-226, 'enemy1',  85],  // platform H-192 (top H-202)
      [4540, H-212, 'enemy2',  80],  // platform H-178 (top H-188)
    ].forEach(([x, y, key, patrol], idx) => {
      this.setupEnemy(
        this.physics.add.sprite(x, y, 'e-idle-0'),
        key, x, patrol, idx
      );
    });
  }

  // Shared enemy setup — used by spawnEnemies and respawnEnemy
  setupEnemy(e, key, x, patrol, idx) {
    e.setScale(1.5).setCollideWorldBounds(true).setDepth(8);
    e.enemyType    = key;
    e.patrolStart  = x - patrol;
    e.patrolEnd    = x + patrol;
    e.direction    = 1;
    e.shootTimer   = Phaser.Math.Between(80, Math.max(100, 250 - this.level * 20));
    e.attacking    = false;
    e.chasing      = false;
    e.jumpCooldown = 0;
    e.speedMult    = this.enemySpeedScale;

    // ── ENEMY POWERS (random, chance increases with level) ──────
    e.hasSpeedBoost = false;
    e.hasShield     = false;
    e.canShoot      = (key === 'enemy1');  // enemy1 always shoots

    if (this.level >= 2) {
      const roll = Math.random();
      const powerChance = Math.min(0.7, 0.2 + (this.level - 2) * 0.12);

      if (roll < powerChance) {
        // Pick a random power
        const powers = ['speed', 'shield'];
        // From level 3+, enemy2 can also throw fruit
        if (this.level >= 3 && key === 'enemy2') powers.push('shoot');
        const power = powers[Math.floor(Math.random() * powers.length)];

        if (power === 'speed') {
          e.hasSpeedBoost = true;
          e.setTint(0xff6666);
        } else if (power === 'shield') {
          e.hasShield = true;
          e.shieldHP  = 1;    // survives 1 stomp, then vulnerable
          e.setTint(0x66ccff);
        } else if (power === 'shoot') {
          e.canShoot = true;
          e.setTint(0xff88ff);
        }
      } else if (key === 'enemy2') {
        e.setTint(0xffbbcc);
      }
    } else {
      if (key === 'enemy2') e.setTint(0xffbbcc);
    }

    e.body.setSize(20, 32);
    e.body.setOffset(22, 16);
    this.setEnemyAnim(e, 'e-walk');
    this.enemies.add(e);
    return e;
  }

  setEnemyAnim(e, key) {
    e.play(key, true);
  }

  spawnCollectibles(H) {
    const colors = { shield: 0xffd700, star: 0xffff00, heart: 0xff3366, boots: 0x00ccff };
    const labels = { shield: 'SCHILD', star: 'STERN', heart: 'HERZ', boots: 'STIEFEL' };

    [
      [380,  H-165, 'shield'], [730,  H-378, 'star'  ],
      [1110, H-263, 'heart' ], [1660, H-308, 'boots' ],
      [2060, H-448, 'shield'], [2360, H-263, 'star'  ],
      [2720, H-213, 'heart' ], [3110, H-303, 'boots' ],
      [3510, H-343, 'shield'], [3760, H-468, 'star'  ],
      [4060, H-223, 'heart' ], [4460, H-438, 'boots' ],
    ].forEach(([x, y, type]) => {
      const col  = colors[type];
      const glow = this.add.circle(x, y, 22, col, 0.25).setDepth(5);
      const bg   = this.add.circle(x, y, 14, col, 0.95).setDepth(6);
      const lbl  = this.add.text(x, y, labels[type], {
        fontSize: '8px', fill: '#000000', fontFamily: '"Nunito", sans-serif', fontWeight: '800'
      }).setOrigin(0.5).setDepth(7);

      const rect = this.add.rectangle(x, y, 30, 30).setVisible(false);
      this.physics.add.existing(rect, true);
      rect.bonusType = type;
      rect.visuals   = [glow, bg, lbl];
      this.collTriggers.add(rect);

      const floatTween = this.tweens.add({
        targets: [bg, lbl, glow], y: y - 8,
        duration: 900, yoyo: true, repeat: -1,
        ease: 'Sine.inOut', delay: Phaser.Math.Between(0, 800)
      });
      rect.floatTween = floatTween;
    });
  }

  // ════════════════════════════════
  //  UPDATE
  // ════════════════════════════════
  update() {
    if (this.gameOver || !this.player?.active) return;

    const camX = this.cameras.main.scrollX;
    this.bg0.tilePositionX = camX * 0.05;
    this.bg1.tilePositionX = camX * 0.12;
    this.bg2.tilePositionX = camX * 0.22;

    this.handlePlayer();
    this.handleEnemies();
    this.checkProjectiles();
    this.handlePowerupEffects();

    // Draw shield ring around player
    if (this.shieldGfx) {
      this.shieldGfx.setVisible(this.shieldHits > 0);
      if (this.shieldHits > 0) {
        this.shieldAngle += 2;   // degrees per frame
        const cx = this.player.x;
        const cy = this.player.y - 6;
        const rx = 34, ry = 40;  // ellipse radii
        const g = this.shieldGfx;
        g.clear();
        // Outer glow
        g.lineStyle(5, 0xffd700, 0.2);
        g.strokeEllipse(cx, cy, rx * 2 + 6, ry * 2 + 6);
        // Main ring
        g.lineStyle(3, 0xffd700, 0.7);
        g.strokeEllipse(cx, cy, rx * 2, ry * 2);
        // Orbiting dots for rotation feel
        const dots = this.shieldHits;  // 1-3 dots showing remaining hits
        for (let i = 0; i < dots; i++) {
          const a = (this.shieldAngle + i * (360 / dots)) * Math.PI / 180;
          const dx = cx + Math.cos(a) * rx;
          const dy = cy + Math.sin(a) * ry;
          g.fillStyle(0xffffff, 0.9);
          g.fillCircle(dx, dy, 4);
          g.fillStyle(0xffd700, 0.5);
          g.fillCircle(dx, dy, 6);
        }
      }
    }
    this.checkPlayerApples();

    // Cap max fall speed to prevent tunneling through platforms
    if (this.player.body.velocity.y > 600) this.player.body.velocity.y = 600;

    // Fall-through safety net: if player is below ground surface, push them up
    const groundTop = GAME_H - 48;   // top of the brown ground platform (48px thick)
    const bodyBot   = this.player.body.bottom;
    if (bodyBot > groundTop + 4 && this.player.y < GAME_H + 50) {
      // Player clipped through ground — snap back onto it
      this.player.y = groundTop - (bodyBot - this.player.y) + 1;
      this.player.body.velocity.y = 0;
      this.player.body.blocked.down = true;
    }
    if (this.player.y > GAME_H + 100) {
      this.takeDamage();
      this.player.setPosition(this.respawnX, this.respawnY);
      this.player.setVelocity(0, 0);
    }
  }

  handlePlayer() {
    const rawOnGround = this.player.body.blocked.down;
    this.groundFrames = rawOnGround ? this.groundFrames + 1 : 0;
    const onGround = this.groundFrames >= 2;
    if (onGround) this.jumpCount = 0;

    if (onGround && !this.wasOnGround) this['snd-land']?.play();
    this.wasOnGround = onGround;

    const left  = this.cursors.left.isDown  || this.aKey.isDown  || TOUCH_INPUT.left;
    const right = this.cursors.right.isDown || this.dKey.isDown || TOUCH_INPUT.right;
    const jump  = Phaser.Input.Keyboard.JustDown(this.cursors.up)  ||
                  Phaser.Input.Keyboard.JustDown(this.wKey) || TOUCH_INPUT.jump;
    TOUCH_INPUT.jump = false;  // consume one-shot

    if (left) {
      this.player.setVelocityX(this.hasSpeed ? -310 : -190);
      this.player.setFlipX(true);
      if (onGround && !this.isHurt) this.setPlayerAnim('p-walk');
    } else if (right) {
      this.player.setVelocityX(this.hasSpeed ? 310 : 190);
      this.player.setFlipX(false);
      if (onGround && !this.isHurt) this.setPlayerAnim('p-walk');
    } else {
      this.player.setVelocityX(0);
      if (onGround && !this.isHurt) this.setPlayerAnim('p-idle');
    }

    if (!onGround && !this.isHurt && Math.abs(this.player.body.velocity.y) > 50) {
      this.setPlayerAnim(this.player.body.velocity.y < 0 ? 'p-jump' : 'p-fall');
    }

    if (jump && this.jumpCount < 2) {
      const vel = this.jumpCount === 0
        ? (this.hasSuperBoot ? -660 : -510)
        : -370;
      this.player.setVelocityY(vel);
      this.jumpCount++;
      this['snd-jump']?.play();
      this.spawnParticles(this.player.x, this.player.y + 30, 0xffffff, 4);
    }

    const shootPressed = Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.qKey) || TOUCH_INPUT.shoot;
    TOUCH_INPUT.shoot = false;
    if (shootPressed) {
      if (this.hasDash && !this.isDashing) {
        this.executeDash();
      } else if (this.hasBanana && this.bananaCount > 0) {
        this.throwBanana();
      } else if (this.hasApple && this.appleCount > 0) {
        this.throwPlayerApple();
      }
    }
  }

  throwPlayerApple() {
    this.appleCount--;
    this.events.emit('appleCount', this.appleCount);
    if (this.appleCount <= 0) {
      this.hasApple = false;
      this.events.emit('appleOff');
    }
    const dirX = this.player.flipX ? -1 : 1;
    const sx = this.player.x + dirX * 30;
    const sy = this.player.y - 10;
    const apple = this.fruitPool.get(sx, sy, 'fruit-apple');
    if (!apple) return;
    apple.setActive(true).setVisible(true).setScale(1.5).setDepth(12);
    apple.play('fruit-apple');
    apple.body.reset(sx, sy);
    apple.body.setAllowGravity(false);
    apple.body.setGravityY(0);
    apple.body.setVelocity(dirX * 380, 0);
    apple.body.setSize(24, 24);
    apple.dirX  = dirX;
    apple.isActive = true;
    apple.isPlayerApple = true;
    apple.isTeleport = this.hasTeleport && this.teleportCount > 0;
    if (apple.isTeleport) {
      this.teleportCount--;
      apple.setTint(0xaa00ff); // purple tint for teleport apple
      if (this.teleportCount <= 0) this.hasTeleport = false;
    }
    this.playerApples.push(apple);
    if (this['snd-throw']) this['snd-throw'].play(); else SFX.throw();
    this.time.delayedCall(2500, () => {
      // Teleport apple: player teleports to apple's position when it expires or hits
      if (apple.isTeleport && apple.isActive && this.player?.active) {
        this.spawnParticles(this.player.x, this.player.y, 0xaa00ff, 6);
        this.player.setPosition(apple.x, apple.y - 20);
        this.player.setVelocity(0, 0);
        this.spawnParticles(apple.x, apple.y, 0xaa00ff, 6);
        this.showFloat(apple.x, apple.y - 40, 'TELEPORT!', '#aa00ff');
        this.cameras.main.flash(150, 170, 0, 255);
      }
      this.destroyProjectile(apple);
    });
  }

  checkPlayerApples() {
    if (!this.playerApples.length) return;
    for (let i = this.playerApples.length - 1; i >= 0; i--) {
      const ap = this.playerApples[i];
      if (!ap?.active || !ap.isActive) { this.playerApples.splice(i, 1); continue; }
      if (ap.body?.blocked.down || ap.body?.blocked.left || ap.body?.blocked.right) {
        this.destroyProjectile(ap); this.playerApples.splice(i, 1); continue;
      }
      let hit = false;
      this.enemies.getChildren().forEach(e => {
        if (!e.active || !ap.isActive || hit) return;
        const ab = ap.body, eb = e.body;
        if (Phaser.Geom.Intersects.RectangleToRectangle(
            new Phaser.Geom.Rectangle(ab.x, ab.y, ab.width, ab.height),
            new Phaser.Geom.Rectangle(eb.x, eb.y, eb.width, eb.height))) {
          hit = true;
          ap.isActive = false;
          this.destroyProjectile(ap);
          this.playerApples.splice(i, 1);
          this.score += 150;
          this.showFloat(e.x, e.y - 20, '+150 TREFFER!', '#ff6600');
          this.spawnParticles(e.x, e.y, 0xff6600, 8);
          this['snd-stomp']?.play();
          this.respawnEnemy(e);
          e.destroy();
        }
      });
    }
  }

  handleEnemies() {
    this.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      if (e.stunned) { e.setVelocity(0, 0); return; }  // banana stun — fully frozen
      e.speedMult = e.speedMult || this.enemySpeedScale;

      // Boosted enemies get periodic speed surges
      if (e.hasSpeedBoost && !e.boosting) {
        if (!e._boostTimer) e._boostTimer = Phaser.Math.Between(180, 300);
        e._boostTimer--;
        if (e._boostTimer <= 0) {
          e.boosting = true;
          e.speedMult = this.enemySpeedScale * 1.8;
          e.setTint(0xff0000);
          this.time.delayedCall(2500, () => {
            if (!e?.active) return;
            e.boosting = false;
            e.speedMult = this.enemySpeedScale;
            e.setTint(e.enemyType === 'enemy2' ? 0xffbbcc : (e.hasSpeedBoost ? 0xff6666 : 0xffffff));
            e._boostTimer = Phaser.Math.Between(200, 350);
          });
        }
      }
      const distX = this.player.x - e.x;
      const distY = this.player.y - e.y;
      const dist  = Math.abs(distX);
      if (e.jumpCooldown > 0) e.jumpCooldown--;

      // Chase range widens with level — no Y restriction so enemies chase to higher platforms
      const chaseRange = 400 + (this.level - 1) * 30;
      const canChase = dist < chaseRange;   // removed distYAbs check — enemies must chase vertically
      const chaseLimitX = 600 + (this.level - 1) * 40;
      const patrolExtended = 200;

      if (canChase) {
        e.chasing = true;
      } else if (e.chasing) {
        if (dist > chaseLimitX ||
            e.x < e.patrolStart - patrolExtended ||
            e.x > e.patrolEnd   + patrolExtended) {
          e.chasing = false;
        }
      }

      if (e.chasing) {
        const baseSpeed = e.enemyType === 'enemy1' ? 75 : 90;
        const speed = baseSpeed * e.speedMult;
        const jumpPower = -520 - (this.level - 1) * 15;  // must match buildNavGraph() jumpV
        const jumpCD    = Math.max(25, 50 - this.level * 5);

        const onGround = e.body.blocked.down;

        // Check if ACTUALLY on the same platform (not just similar Y)
        const ePlat = onGround ? this.findPlatformAt(e.x, e.y) : null;
        const pPlat = this.findPlatformAt(this.player.x, this.player.y);
        const trueSamePlatform = ePlat && pPlat && ePlat === pPlat;

        if (!onGround) {
          // AIRBORNE: keep moving toward player
          const dir = distX > 0 ? 1 : -1;
          e.setVelocityX(dir * speed * 1.2);
          e.setFlipX(dir < 0);
          e.direction = dir;
          if (!e.attacking) this.setEnemyAnim(e, 'e-run');
        } else if (trueSamePlatform) {
          // ON THE SAME PLATFORM: run directly toward player
          const dir = distX > 0 ? 1 : -1;
          e.setVelocityX(dir * speed);
          e.setFlipX(dir < 0);
          e.direction = dir;
          if (!e.attacking) this.setEnemyAnim(e, 'e-run');
          // Jump over walls on this platform
          if ((e.body.blocked.left || e.body.blocked.right) && e.jumpCooldown === 0) {
            e.setVelocityY(jumpPower);
            e.jumpCooldown = jumpCD;
          }
        } else {
          // ── DIFFERENT PLATFORM: BFS pathfinding with escalating failure recovery ──

          // Init tracking state
          if (e._totalFails == null) e._totalFails = 0;
          if (!e._preferSide)  e._preferSide = 0;
          if (!e._retreating)  e._retreating = false;
          if (!e._retreatTarget) e._retreatTarget = 0;

          // ── STUCK DETECTOR: if barely moved in ~2 seconds, force big retreat ──
          if (!e._stuckCheckTimer) e._stuckCheckTimer = 0;
          if (!e._lastCheckX) e._lastCheckX = e.x;
          e._stuckCheckTimer++;
          if (e._stuckCheckTimer >= 120) { // ~2 seconds at 60fps
            const moved = Math.abs(e.x - e._lastCheckX);
            if (moved < 60 && onGround) {
              // STUCK! Spinning in place — force a big retreat
              e._retreating = true;
              const retreatDir = Math.random() < 0.5 ? -1 : 1;
              e._retreatTarget = Phaser.Math.Clamp(
                e.x + retreatDir * Phaser.Math.Between(250, 450), 50, LEVEL_W - 50
              );
              e._preferSide = Phaser.Math.Between(1, 2);
              e._totalFails = 0;
              e._navTimer = 0;
            }
            e._lastCheckX = e.x;
            e._stuckCheckTimer = 0;
          }

          // RETREAT MODE: run far away before re-attempting
          if (e._retreating) {
            const dx = e._retreatTarget - e.x;
            if (Math.abs(dx) < 30) {
              // Reached retreat point — try jumping from here
              e._retreating = false;
              e._navTimer = 0;
            } else {
              const dir = dx > 0 ? 1 : -1;
              e.setVelocityX(dir * speed * 1.5);
              e.setFlipX(dir < 0);
              e.direction = dir;
              if (!e.attacking) this.setEnemyAnim(e, 'e-run');
              // Jump over walls during retreat
              if ((e.body.blocked.left || e.body.blocked.right) && e.jumpCooldown === 0) {
                e.setVelocityY(jumpPower);
                e.jumpCooldown = jumpCD;
              }
              return; // skip normal nav while retreating
            }
          }

          if (!e._navTimer) e._navTimer = 0;
          e._navTimer--;
          if (e._navTimer <= 0) {
            e._navTimer = 50; // commit to waypoint for ~0.8s before reconsidering
            const targetPlat = this.findPlatformAt(this.player.x, this.player.y);
            e._navTarget = this.getNavWaypoint(e.x, e.y, targetPlat, e._preferSide);
          }

          const nav = e._navTarget;
          if (nav) {
            const dx = nav.x - e.x;
            const atWaypoint = Math.abs(dx) < 40;
            const dir = dx > 0 ? 1 : -1;

            e.setVelocityX(dir * speed * 1.3);
            e.setFlipX(dir < 0);
            e.direction = dir;
            if (!e.attacking) this.setEnemyAnim(e, 'e-run');

            if (atWaypoint && nav.jump && onGround && e.jumpCooldown === 0) {
              e.setVelocityY(jumpPower);
              const launchDir = nav.jumpDir || nav.dir;
              e.setVelocityX(launchDir * speed * 2.5);
              e.setFlipX(launchDir < 0);
              e.jumpCooldown = jumpCD;
              e._navTimer = 8;

              // Check after landing if we made progress
              this.time.delayedCall(900, () => {
                if (!e?.active) return;
                const ePlat = this.findPlatformAt(e.x, e.y);
                const tPlat = this.findPlatformAt(this.player.x, this.player.y);
                if (ePlat && tPlat && ePlat !== tPlat && ePlat.top >= (tPlat?.top || 0)) {
                  // FAILED — still below target
                  e._totalFails++;
                  e._navTimer = 0;

                  if (e._totalFails <= 2) {
                    // Attempt 1-2: switch sides (left ↔ right)
                    e._preferSide = (e._preferSide === 1) ? 2 : 1;
                  } else if (e._totalFails <= 4) {
                    // Attempt 3-4: retreat 150-250px in a random direction, then retry
                    e._retreating = true;
                    const retreatDir = Math.random() < 0.5 ? -1 : 1;
                    const retreatDist = 150 + e._totalFails * 50;
                    e._retreatTarget = Phaser.Math.Clamp(
                      e.x + retreatDir * retreatDist, 50, LEVEL_W - 50
                    );
                    e._preferSide = Phaser.Math.Between(0, 2);
                  } else {
                    // Attempt 5+: big random retreat (300-500px), fully random approach
                    e._retreating = true;
                    const retreatDir = Math.random() < 0.5 ? -1 : 1;
                    e._retreatTarget = Phaser.Math.Clamp(
                      e.x + retreatDir * Phaser.Math.Between(300, 500), 50, LEVEL_W - 50
                    );
                    e._preferSide = Phaser.Math.Between(0, 2);
                    e._totalFails = 0; // reset after big retreat
                  }
                } else {
                  // SUCCESS — made progress, reset everything
                  e._totalFails = 0;
                  e._preferSide = 0;
                }
              });
            }
            // Jump over walls
            if ((e.body.blocked.left || e.body.blocked.right) && onGround && e.jumpCooldown === 0) {
              e.setVelocityY(jumpPower);
              e.jumpCooldown = jumpCD;
              e._navTimer = 0;
            }
          } else {
            // No path found — run toward player as fallback
            const dir = distX > 0 ? 1 : -1;
            e.setVelocityX(dir * speed);
            e.setFlipX(dir < 0);
            e.direction = dir;
            if (!e.attacking) this.setEnemyAnim(e, 'e-run');
            if (distY < -50 && onGround && e.jumpCooldown === 0) {
              e.setVelocityY(jumpPower);
              e.jumpCooldown = jumpCD;
            }
          }
        }
      } else {
        e.setVelocityX(e.direction * 38 * e.speedMult);
        e.setFlipX(e.direction < 0);
        if (!e.attacking) this.setEnemyAnim(e, 'e-walk');
        if (e.x <= e.patrolStart) e.direction =  1;
        if (e.x >= e.patrolEnd)   e.direction = -1;

        // Patrol jumping: hop over obstacles and onto nearby platforms
        if ((e.body.blocked.left || e.body.blocked.right) && e.body.blocked.down && e.jumpCooldown === 0) {
          e.setVelocityY(-520);
          e.jumpCooldown = 50;
        }
        // Randomly jump to explore higher platforms (chance increases with level)
        if (e.body.blocked.down && e.jumpCooldown === 0 && Math.random() < 0.004 * this.level) {
          e.setVelocityY(-420);
          e.jumpCooldown = 120;
        }
      }

      if (e.canShoot) {
        e.shootTimer--;
        if (e.shootTimer <= 0 && dist < 400 && dist > 55) {
          e.shootTimer = e.chasing
            ? Phaser.Math.Between(100, 150)
            : Phaser.Math.Between(180, 280);
          this.throwFruit(e);
          e.attacking = true;
          this.setEnemyAnim(e, 'e-punch');
          this.time.delayedCall(650, () => {
            if (e?.active) {
              e.attacking = false;
              this.setEnemyAnim(e, 'e-walk');
            }
          });
        }
      }
    });
  }

  throwFruit(enemy) {
    const dirX = this.player.x < enemy.x ? -1 : 1;
    const sx   = enemy.x + dirX * 30;
    const sy   = enemy.y - 24;

    const fruitNames = ['apple','bananas','cherries','kiwi','melon','orange','pineapple','strawberry'];
    const fruitKey = 'fruit-' + Phaser.Utils.Array.GetRandom(fruitNames);

    const fruit = this.fruitPool.get(sx, sy, fruitKey);
    if (!fruit) return;

    fruit.setActive(true).setVisible(true).setScale(1.5).setDepth(12);
    fruit.play(fruitKey);

    fruit.body.reset(sx, sy);
    fruit.body.setAllowGravity(true);
    fruit.body.setGravityY(-600);
    fruit.body.setVelocity(dirX * 270, -50);
    fruit.body.setSize(24, 24);

    fruit.dirX     = dirX;
    fruit.isActive = true;
    this.projectiles.push(fruit);

    // BUG-005: use dedicated throw sound
    if (this['snd-throw']) this['snd-throw'].play(); else SFX.throw();
    this.time.delayedCall(3200, () => this.destroyProjectile(fruit));
  }

  destroyProjectile(projectile) {
    if (!projectile || !projectile.isActive) return;
    projectile.isActive = false;
    this.fruitPool.killAndHide(projectile);
    projectile.body.setVelocity(0, 0);
  }

  checkProjectiles() {
    const p = this.player.body;
    const pb = new Phaser.Geom.Rectangle(p.x, p.y, p.width, p.height);
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const shoe = this.projectiles[i];
      if (!shoe?.active || !shoe.isActive) {
        this.projectiles.splice(i, 1);
        continue;
      }
      if (shoe.body?.blocked.down || shoe.body?.blocked.left || shoe.body?.blocked.right) {
        this.destroyProjectile(shoe);
        this.projectiles.splice(i, 1);
        continue;
      }
      const sb = shoe.body;
      if (sb && Phaser.Geom.Intersects.RectangleToRectangle(
          new Phaser.Geom.Rectangle(sb.x, sb.y, sb.width, sb.height), pb)) {
        this.destroyProjectile(shoe);
        this.projectiles.splice(i, 1);
        this.takeDamage();
      }
    }
  }

  onEnemyContact(player, enemy) {
    if (!enemy.active) return;
    if (player.body.velocity.y > 20 && player.body.bottom < enemy.body.center.y + 14) {
      // Shielded enemy absorbs first stomp
      if (enemy.hasShield && enemy.shieldHP > 0) {
        enemy.shieldHP--;
        enemy.setTint(0xffffff);  // flash white, shield gone
        this.showFloat(enemy.x, enemy.y - 20, 'SCHILD!', '#66ccff');
        this['snd-blocked']?.play();
        player.setVelocityY(-300);
        this.cameras.main.shake(60, 0.004);
        return;
      }
      this.score += 100;
      this.showFloat(enemy.x, enemy.y - 20, '+100', '#ffd700');
      this.spawnParticles(enemy.x, enemy.y, 0xff6666, 8);
      this['snd-stomp']?.play();
      this.respawnEnemy(enemy);
      enemy.destroy();
      player.setVelocityY(-300);
    } else {
      this.takeDamage();
    }
  }

  respawnEnemy(deadEnemy) {
    const H = GAME_H;
    const px = this.player.x;
    const offset = Phaser.Math.Between(800, 1200) * (Math.random() < 0.5 ? -1 : 1);
    const spawnX = Phaser.Math.Clamp(px + offset, 60, LEVEL_W - 60);
    const spawnY = H - 72;
    const key    = deadEnemy.enemyType;
    const patrol = 100;

    this.time.delayedCall(3000, () => {
      if (this.gameOver) return;
      const e = this.physics.add.sprite(spawnX, spawnY, 'e-idle-0');
      this.setupEnemy(e, key, spawnX, patrol, Math.floor(Math.random() * 6));
      // Respawned enemies get a slight speed bump
      e.speedMult = Math.min(this.enemySpeedScale * 1.2, this.enemySpeedScale + 0.4);
      this.showFloat(spawnX, spawnY - 40, 'ZURÜCK!', '#ff6600');
    });
  }

  spawnBoxes(H) {
    // All possible rewards — randomized each game
    const allRewards = ['shield','speed','heart','apple','rainbow','teleport','mini','banana','rocket','dash'];
    const boxPositions = [
      [340,  H-209, 1], [600,  H-284, 2], [860,  H-229, 2],
      [1150, H-309, 3], [1400, H-254, 1], [1910, H-274, 1],
      [2210, H-394, 2], [2470, H-307, 2], [2970, H-347, 3],
      [3260, H-291, 1], [3760, H-302, 3], [4290, H-342, 1],
      [4790, H-397, 3],
    ];
    boxPositions.forEach(([x, y, type]) => {
      const reward = Phaser.Utils.Array.GetRandom(allRewards);
      const key = `box${type}`;
      const img = this.add.image(x, y, `${key}-idle`).setScale(2).setDepth(5).setOrigin(0.5, 1);
      this.physics.add.existing(img, true);
      img.boxKey       = key;
      img.boxReward    = reward;
      img.boxHit       = false;
      // Level scaling: base hits × level, capped at 6
      const baseHits = (type === 1) ? 1 : 3;
      img.hitsRequired = Math.min(baseHits * this.boxHitScale, 6);
      img.hitsTaken    = 0;
      this.boxes.add(img);
    });
  }

  spawnCheckpoints(H) {
    [1300, 2600, 3900].forEach((x, i) => {
      const y = H - 48;
      const img = this.add.image(x, y, 'cp-noflag').setScale(2).setDepth(5).setOrigin(0.5, 1);
      const zone = this.add.zone(x, y - 32, 64, 80).setOrigin(0.5, 1);
      this.physics.world.enable(zone);
      zone.body.setAllowGravity(false);
      zone.cpImage    = img;
      zone.cpActivated = false;
      zone.cpIndex    = i;
      zone.respawnX   = x;
      zone.respawnY   = H - 72;   // BUG-001 fix
      this.physics.add.overlap(this.player, zone, this.onCheckpoint, null, this);
    });
  }

  onCheckpoint(player, zone) {
    if (zone.cpActivated) return;
    zone.cpActivated = true;
    zone.cpImage.setTexture('cp-idle').setFrame(0);
    this.respawnX = zone.respawnX;
    this.respawnY = zone.respawnY;
    this.showFloat(zone.respawnX, zone.respawnY - 80, 'CHECKPOINT!', '#00ff88');
    this.cameras.main.flash(200, 0, 255, 100);
    if (this['snd-collect']) this['snd-collect'].play(); else SFX.checkpoint();
  }

  onBoxHit(player, box) {
    if (!box.active || box.boxHit) return;
    if (!this.player.body.blocked.up) return;

    box.hitsTaken++;
    // Play box bump sound on every hit
    if (this['snd-box-bump']) this['snd-box-bump'].play();

    if (box.hitsTaken >= box.hitsRequired) {
      box.boxHit = true;
      this.breakBox(box);
    } else {
      this['snd-box-hit']?.play();
      this.cameras.main.shake(40, 0.003);
      box.setTexture(`${box.boxKey}-hit`);
      const remaining = box.hitsRequired - box.hitsTaken;
      this.showFloat(box.x, box.y - box.displayHeight - 10, `${remaining} mehr!`, '#ffcc00');
      this.tweens.add({
        targets: box, y: box.y - 8, duration: 80, yoyo: true,
        onComplete: () => {
          if (box.active) {
            box.setTexture(`${box.boxKey}-idle`);
            this.boxes.refresh();
          }
        }
      });
    }
  }

  breakBox(box) {
    box.setTexture(`${box.boxKey}-hit`);
    this.cameras.main.shake(60, 0.005);
    this['snd-box-hit']?.play();

    this.time.delayedCall(100, () => {
      if (!box.active) return;
      box.setTexture(`${box.boxKey}-break`);
      this['snd-box-break']?.play();

      this.time.delayedCall(180, () => {
        if (!box.active) return;
        const rx = box.x;
        const ry = box.y - box.displayHeight;

        if (box.boxReward === 'fruit') {
          const fruitNames = ['apple','bananas','cherries','kiwi','melon','orange','pineapple','strawberry'];
          const fk = 'fruit-' + Phaser.Utils.Array.GetRandom(fruitNames);
          const f = this.add.sprite(rx, ry - 20, fk).setScale(1.5).setDepth(7);
          f.play(fk);
          this.tweens.add({ targets: f, y: ry - 60, alpha: 0, duration: 800, onComplete: () => f.destroy() });
          this.score += 50;
          this.showFloat(rx, ry - 30, '+50', '#ffd700');
        } else {
          this.applyPowerup(box.boxReward, rx, ry);
        }

        this.spawnParticles(rx, ry, 0xc8a050, 6);
        this.boxes.remove(box, true, true);
      });
    });
  }

  // Timed power-ups: only 1 active, rest queue. Instant items apply immediately.
  applyPowerup(type, x, y) {
    this['snd-collect']?.play();
    this.score += 50;
    this.spawnParticles(x, y, 0xffffff, 6);

    // Instant items — always apply immediately, no queue
    const instantTypes = ['heart', 'apple', 'banana', 'teleport', 'dash'];
    if (instantTypes.includes(type)) {
      this._applyInstant(type, x, y);
      return;
    }

    // Timed buffs — queue if one is already active
    const timedTypes = ['shield', 'speed', 'rainbow', 'mini', 'rocket'];
    if (timedTypes.includes(type)) {
      if (this.activePower) {
        // Queue it
        this.powerQueue.push({ type, x, y });
        const names = this.powerQueue.map(p => this._powerLabel(p.type));
        this.events.emit('queueUpdate', names);
        this.showFloat(x, y - 30, this._powerLabel(type) + ' (WARTESCHLANGE)', '#aaaaaa', true);
      } else {
        this._activateTimedPower(type, x, y);
      }
    }
  }

  _powerLabel(type) {
    const labels = { shield: 'SCHILD', speed: 'TURBO', rainbow: 'REGENBOGEN', mini: 'MINI', rocket: 'RAKETE' };
    return labels[type] || type.toUpperCase();
  }

  _applyInstant(type, x, y) {
    switch (type) {
      case 'heart':
        this.lives = Math.min(this.lives + 1, 5);
        this.events.emit('livesChanged', this.lives);
        this.showFloat(x, y - 30, '+1 LEBEN!', '#ff3366', true);
        break;
      case 'apple':
        this.hasApple = true;
        this.appleCount = 3;
        this.events.emit('appleOn', 3);
        this.showFloat(x, y - 30, '3 ÄPFEL! [SPACE]', '#ff6600', true);
        break;
      case 'banana':
        this.hasBanana = true;
        this.bananaCount = 3;
        this.showFloat(x, y - 30, 'BANANEN x3!', '#ffee00', true);
        break;
      case 'teleport':
        this.hasTeleport = true;
        this.teleportCount = 2;
        this.hasApple = true;
        this.appleCount = 2;
        this.events.emit('appleOn', 2);
        this.showFloat(x, y - 30, 'TELEPORT-APFEL x2!', '#aa00ff', true);
        break;
      case 'dash':
        this.hasDash = true;
        this.showFloat(x, y - 30, 'DASH BEREIT! [SPACE]', '#00ddff', true);
        break;
    }
  }

  _activateTimedPower(type, x, y) {
    this.activePower = type;
    const durations = { shield: 0, speed: 8000, rainbow: 10000, mini: 8000, rocket: 6000 };
    const dur = durations[type] || 8000;

    switch (type) {
      case 'shield':
        this.shieldHits = 3;
        this.events.emit('shieldOn', 3);
        this.showFloat(x, y - 30, 'SCHILD x3!', '#ffd700', true);
        // Shield ends when hits run out, not on timer — handled in takeDamage
        return;
      case 'speed':
        this.hasSpeed = true;
        this.player.setTint(0x00ffff);
        this.events.emit('activePower', 'TURBO', dur);
        this.showFloat(x, y - 30, 'TURBO!', '#00ffff', true);
        break;
      case 'rainbow':
        this.hasRainbow = true;
        this.events.emit('activePower', 'REGENBOGEN', dur);
        this.showFloat(x, y - 30, 'REGENBOGEN!', '#ff00ff', true);
        break;
      case 'mini':
        this.isMini = true;
        this.player.setScale(0.8);
        this.player.body.setSize(14, 24);
        this.player.body.setOffset(25, 24);
        this.events.emit('activePower', 'MINI-MODUS', dur);
        this.showFloat(x, y - 30, 'MINI-MODUS!', '#88ff88', true);
        break;
      case 'rocket':
        this.hasRocket = true;
        this.events.emit('activePower', 'RAKETENSTIEFEL', dur);
        this.showFloat(x, y - 30, 'RAKETENSTIEFEL!', '#ff4400', true);
        break;
    }

    // Timer to end this power and activate next in queue
    this.time.delayedCall(dur, () => this._endTimedPower(type));
  }

  _endTimedPower(type) {
    // Clean up the ending power
    switch (type) {
      case 'speed':
        this.hasSpeed = false;
        if (this.player?.active) this.player.clearTint();
        break;
      case 'rainbow':
        this.hasRainbow = false;
        break;
      case 'mini':
        this.isMini = false;
        if (this.player?.active) {
          this.player.setScale(1.5);
          this.player.body.setSize(20, 32);
          this.player.body.setOffset(22, 16);
        }
        break;
      case 'rocket':
        this.hasRocket = false;
        if (this.player?.active) this.player.clearTint();
        break;
    }

    this.activePower = null;
    this.events.emit('activePowerOff');

    // Activate next queued power
    if (this.powerQueue.length > 0) {
      const next = this.powerQueue.shift();
      const names = this.powerQueue.map(p => this._powerLabel(p.type));
      this.events.emit('queueUpdate', names);
      this._activateTimedPower(next.type, this.player?.x || next.x, this.player?.y || next.y);
    } else {
      this.events.emit('queueUpdate', []);
    }
  }

  onCollect(player, trigger) {
    if (!trigger.active) return;
    const type = trigger.bonusType;
    trigger.floatTween?.stop();
    trigger.visuals?.forEach(v => v.destroy());
    trigger.destroy();
    this.applyPowerup(type, player.x, player.y - 30);
  }

  onGoalReached() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.endSprite?.setTexture('end-press').setFrame(0);
    this.physics.pause();
    this['snd-win']?.play();
    this.cameras.main.flash(500, 255, 255, 100);

    // Level completion bonus
    const bonus = this.level * 500;
    this.score += bonus;
    this.showFloat(this.player.x, this.player.y - 60, `LEVEL ${this.level} GESCHAFFT! +${bonus}`, '#ffd700');

    this.time.delayedCall(1500, () => {
      this.scene.stop('HUD');
      this.scene.stop('TouchControls');
      window._gameMusic?.stop();
      // Advance to next level, carrying over score and lives
      this.scene.start('Game', {
        level: this.level + 1,
        score: this.score,
        lives: this.lives
      });
    });
  }

  takeDamage() {
    if (this.isHurt || this.isStarPow || this.gameOver) return;
    if (this.shieldHits > 0) {
      this.shieldHits--;
      this['snd-blocked']?.play();
      this.cameras.main.shake(100, 0.006);
      if (this.shieldHits > 0) {
        this.showFloat(this.player.x, this.player.y - 50, `GEBLOCKT! (${this.shieldHits} übrig)`, '#ffd700');
        this.events.emit('shieldHit', this.shieldHits);
      } else {
        this.showFloat(this.player.x, this.player.y - 50, 'SCHILD KAPUTT!', '#ff8800');
        this.events.emit('shieldOff');
        // Shield was a timed power — advance queue
        this.activePower = null;
        if (this.powerQueue.length > 0) {
          const next = this.powerQueue.shift();
          this.events.emit('queueUpdate', this.powerQueue.map(p => this._powerLabel(p.type)));
          this.time.delayedCall(500, () => this._activateTimedPower(next.type, this.player?.x || next.x, this.player?.y || next.y));
        } else {
          this.events.emit('queueUpdate', []);
        }
      }
      // Brief invulnerability after shield absorb so overlapping enemies
      // don't drain all hits in a single frame
      this.isHurt = true;
      this.time.delayedCall(400, () => { this.isHurt = false; });
      // Knockback to push player away from the source
      const kDir = this.player.flipX ? 1 : -1;
      this.player.setVelocity(kDir * 150, -180);
      return;
    }
    this.lives--;
    this.isHurt = true;
    this['snd-hurt']?.play();
    this.events.emit('livesChanged', this.lives);
    this.cameras.main.shake(220, 0.013);
    this.showFloat(this.player.x, this.player.y - 50, '-1 LEBEN', '#ff4444');

    this.player.play('p-hurt', true);
    this.playerAnim = 'p-hurt';
    this.player.setTint(0xff4444);

    const kDir = this.player.flipX ? 1 : -1;
    this.player.setVelocity(kDir * 200, -250);

    this.tweens.add({
      targets: this.player, alpha: 0.3, duration: 100, yoyo: true, repeat: 7,
      onComplete: () => {
        if (!this.player?.active) return;
        this.player.setAlpha(1);
        this.player.clearTint();
        this.isHurt = false;
        const onGround = this.player.body.blocked.down;
        const movingX = Math.abs(this.player.body.velocity.x) > 10;
        const airborne = Math.abs(this.player.body.velocity.y) > 50;
        if (!onGround && airborne) {
          this.playerAnim = this.player.body.velocity.y < 0 ? 'p-jump' : 'p-fall';
        } else if (onGround && movingX) {
          this.playerAnim = 'p-walk';
        } else {
          this.playerAnim = 'p-idle';
        }
      }
    });

    if (this.lives <= 0) {
      this.gameOver = true;
      window._gameMusic?.stop();
      this['snd-gameover']?.play();
      this.time.delayedCall(800, () => {
        this.scene.stop('HUD');
      this.scene.stop('TouchControls');
        this.scene.start('GameOver', { won: false, score: this.score, level: this.level });
      });
    }
  }

  showFloat(x, y, msg, color = '#fff', big = false) {
    const t = this.add.text(x, y, msg, {
      fontSize: big ? '42px' : '15px', fill: color,
      fontFamily: '"Bangers", cursive',
      stroke: '#000000', strokeThickness: big ? 5 : 3, letterSpacing: big ? 2 : 1
    }).setOrigin(0.5).setDepth(20).setScrollFactor(big ? 0 : 1);
    if (big) {
      // Start large in center of screen, shrink then fade
      t.setPosition(GAME_W / 2, GAME_H / 2 - 30).setScale(1.5);
      this.tweens.add({
        targets: t, scaleX: 0.6, scaleY: 0.6, alpha: 0, duration: 2000,
        ease: 'Cubic.Out', onComplete: () => t.destroy()
      });
    } else {
      this.tweens.add({
        targets: t, y: y - 55, alpha: 0, duration: 1200,
        ease: 'Cubic.Out', onComplete: () => t.destroy()
      });
    }
  }

  spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const p = this.add.circle(x, y, Phaser.Math.Between(3, 7), color).setDepth(15);
      const a = Phaser.Math.Between(0, 360);
      const s = Phaser.Math.Between(70, 170);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(a) * s * 0.8,
        y: y + Math.sin(a) * s * 0.8 - 35,
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: Phaser.Math.Between(400, 750),
        onComplete: () => p.destroy()
      });
    }
  }

  // ── NEW POWER-UP MECHANICS ──────────────────────────────────

  handlePowerupEffects() {
    // Rainbow trail — spawn colorful particles while moving
    if (this.hasRainbow && Math.abs(this.player.body.velocity.x) > 30) {
      const colors = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff, 0x8800ff];
      const c = colors[Math.floor(Math.random() * colors.length)];
      const p = this.add.circle(this.player.x - this.player.body.velocity.x * 0.05,
        this.player.y + 10, Phaser.Math.Between(3, 6), c).setDepth(8).setAlpha(0.8);
      this.tweens.add({ targets: p, alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: 400, onComplete: () => p.destroy() });
    }

    // Rocket boots — slow fall / hover
    if (this.hasRocket && !this.player.body.blocked.down) {
      if (this.player.body.velocity.y > 0) {
        this.player.body.velocity.y *= 0.85; // slow fall dramatically
      }
      this.player.setTint(0xff6600);
      // Flame particles under feet
      if (Math.random() < 0.4) {
        const flame = this.add.circle(
          this.player.x + Phaser.Math.Between(-8, 8),
          this.player.y + 25, Phaser.Math.Between(3, 6),
          Phaser.Utils.Array.GetRandom([0xff4400, 0xff8800, 0xffcc00])
        ).setDepth(8);
        this.tweens.add({ targets: flame, y: flame.y + 20, alpha: 0, scaleX: 0,
          duration: 300, onComplete: () => flame.destroy() });
      }
    }

    // Dash invulnerability visual
    if (this.isDashing) {
      this.player.setTint(0x00ddff);
    }
  }

  throwBanana() {
    this.bananaCount--;
    if (this.bananaCount <= 0) this.hasBanana = false;
    const dirX = this.player.flipX ? -1 : 1;
    const bx = this.player.x + dirX * 20;
    const by = this.player.y + 15;
    // Place a banana on the ground that enemies slip on
    const banana = this.add.sprite(bx, by, 'fruit-bananas', 0).setScale(1.2).setDepth(5);
    const bZone = this.add.zone(bx, by, 24, 24).setOrigin(0.5);
    this.physics.world.enable(bZone);
    bZone.body.setAllowGravity(false);
    this.showFloat(bx, by - 30, 'BANANE!', '#ffee00');
    if (this['snd-throw']) this['snd-throw'].play(); else SFX.throw();
    // Check overlap with enemies
    this.physics.add.overlap(bZone, this.enemies, (_z, enemy) => {
      if (!enemy.active) return;
      // Enemy slips! Freeze for 3 seconds — turn green, fully stuck
      enemy.setVelocity(0, 0);
      enemy.body.setAllowGravity(false);
      enemy.setTint(0x88ccff);
      enemy.stunned = true;
      this.showFloat(enemy.x, enemy.y - 30, 'AUSGERUTSCHT!', '#ffee00', true);
      this.spawnParticles(enemy.x, enemy.y, 0xffee00, 8);
      this['snd-stomp']?.play();
      const origSpeed = enemy.speedMult;
      enemy.speedMult = 0;
      this.time.delayedCall(3000, () => {
        if (enemy?.active) {
          enemy.speedMult = origSpeed;
          enemy.clearTint();
          enemy.body.setAllowGravity(true);
          enemy.stunned = false;
        }
      });
      banana.destroy();
      bZone.destroy();
    });
    // Banana disappears after 8s
    this.time.delayedCall(8000, () => { banana?.destroy(); bZone?.destroy(); });
  }

  executeDash() {
    this.isDashing = true;
    this.hasDash = false;
    const dirX = this.player.flipX ? -1 : 1;
    this.player.setVelocityX(dirX * 600);
    this.player.setVelocityY(-50);
    this.showFloat(this.player.x, this.player.y - 40, 'DASH!', '#00ddff');
    this['snd-jump']?.play();
    // Brief invulnerability during dash
    this.isHurt = true;
    // Dash particles
    for (let i = 0; i < 8; i++) {
      this.time.delayedCall(i * 40, () => {
        if (!this.player?.active) return;
        const p = this.add.circle(this.player.x, this.player.y, 5, 0x00ddff).setDepth(8).setAlpha(0.7);
        this.tweens.add({ targets: p, alpha: 0, scaleX: 3, scaleY: 0.3,
          duration: 300, onComplete: () => p.destroy() });
      });
    }
    this.time.delayedCall(350, () => {
      this.isDashing = false;
      this.isHurt = false;
      if (this.player?.active) this.player.clearTint();
    });
  }
}
