# Phaser 3 Platformer — Best Practices Reference

> Practical, opinionated guidance for building production-quality 2D platformers with Phaser 3.

---

## Asset Loading

### Spritesheets vs Individual PNG Frames

| Approach | HTTP Requests | Memory | Atlas overhead | Best for |
|---|---|---|---|---|
| Individual PNGs | 1 per frame | Low per file | None | Dev/prototyping |
| Spritesheet (uniform grid) | 1 total | 1 texture | None | Simple animations |
| Texture Atlas (JSON+PNG) | 2 total | 1 texture | Tiny JSON | Production |

**Use spritesheets or texture atlases in production.** Each individual PNG is a separate HTTP request and a separate WebGL texture bind. On a mobile connection, 40 individual frames can add hundreds of milliseconds of load time vs a single spritesheet.

```js
// BAD: 8 separate requests, 8 texture binds
this.load.image('walk_0', 'assets/player/walk_0.png');
this.load.image('walk_1', 'assets/player/walk_1.png');
// ...

// GOOD: 1 request, 1 texture
this.load.spritesheet('player', 'assets/player/player.png', {
  frameWidth: 48,
  frameHeight: 48
});

// BEST (mixed sizes, packed): 2 requests, 1 texture
this.load.atlas('player', 'assets/player/atlas.png', 'assets/player/atlas.json');
```

**When to keep individual images:** static background elements, large one-off images, or images that are only sometimes loaded (lazy-loaded level sections).

---

### Case-Sensitive Paths on Linux Servers

Windows file systems are case-insensitive. Linux servers (Vercel, Netlify, AWS) are case-sensitive. A path that works locally will silently 404 in production.

**Rules:**
- Pick a convention and enforce it project-wide. Recommended: all lowercase, hyphens for spaces.
- `assets/Player/Walk.png` locally, `assets/player/walk.png` on Vercel — these are **different files** on Linux.
- Add a lint step or naming convention doc. CI won't catch this without a tool.

```
assets/
  player/
    player-idle.png      # lowercase, hyphenated
    player-run.png
  tiles/
    tileset-world1.png
```

---

### `load.on('loaderror')` for Debugging

Phaser silently skips assets that fail to load. Add this in every Preloader scene during development:

```js
// PreloaderScene.js
preload() {
  this.load.on('loaderror', (file) => {
    console.error(`[Loader] Failed to load: ${file.type} key="${file.key}" url="${file.url}"`);
  });

  // Also log progress
  this.load.on('progress', (value) => {
    console.log(`[Loader] Progress: ${Math.round(value * 100)}%`);
  });

  // Flag for runtime checks
  this.load.on('filecomplete', (key, type, data) => {
    // optional: track which keys loaded successfully
  });
}
```

Strip or gate these behind a `DEBUG` flag before shipping.

---

### Preloader Pattern with Progress Bar

Always use a dedicated `PreloaderScene`. Never load assets in `GameScene.preload()` — it blocks the scene and you get no visual feedback.

```js
// PreloaderScene.js
export class PreloaderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloaderScene' });
  }

  preload() {
    const { width, height } = this.scale;

    // Background bar
    this.add.rectangle(width / 2, height / 2, 400, 20, 0x222222);

    // Progress bar (fill)
    const bar = this.add.rectangle(width / 2 - 200, height / 2, 0, 16, 0x00ff88);
    bar.setOrigin(0, 0.5);

    // Loading text
    const text = this.add.text(width / 2, height / 2 + 30, 'Loading...', {
      fontSize: '16px', color: '#ffffff'
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      bar.width = 400 * value;
      text.setText(`Loading... ${Math.round(value * 100)}%`);
    });

    this.load.on('loaderror', (file) => {
      console.error(`Asset load failed: ${file.key} @ ${file.url}`);
    });

    this.load.on('complete', () => {
      this.scene.start('GameScene');
    });

    // --- Queue all assets here ---
    this.load.spritesheet('player', 'assets/player/player.png', {
      frameWidth: 48, frameHeight: 48
    });
    this.load.image('tiles', 'assets/tiles/world1.png');
    this.load.tilemapTiledJSON('map1', 'assets/maps/level1.json');
    this.load.audio('music', 'assets/audio/bgm.ogg');
  }

  create() {
    // create() runs after preload completes — scene.start in 'complete' handles transition
  }
}
```

---

## Animation System

### `generateFrameNumbers` vs Image-Key Frame Arrays

```js
// Spritesheet: frames are numbered automatically
this.anims.create({
  key: 'player-run',
  frames: this.anims.generateFrameNumbers('player', { start: 8, end: 13 }),
  frameRate: 12,
  repeat: -1
});

// Non-contiguous frames from a spritesheet
this.anims.create({
  key: 'player-hurt',
  frames: this.anims.generateFrameNumbers('player', { frames: [20, 21, 20, 22] }),
  frameRate: 8,
  repeat: 0
});

// Texture atlas: frames have string names
this.anims.create({
  key: 'player-idle',
  frames: [
    { key: 'player', frame: 'idle_0' },
    { key: 'player', frame: 'idle_1' },
    { key: 'player', frame: 'idle_2' },
  ],
  frameRate: 8,
  repeat: -1
});
```

**Prefer texture atlases for mixed-size frames** (e.g., attack animation with larger hitbox frame). Spritesheets require uniform frame dimensions.

---

### `play(key, ignoreIfPlaying)`

```js
// ignoreIfPlaying = true: do NOT restart the animation if it's already playing
// Use this for: idle, run, fall — looping animations that shouldn't reset
sprite.play('player-run', true);

// ignoreIfPlaying = false (default): restart from frame 0
// Use this for: attack, hurt, death — one-shots that should always play from start
sprite.play('player-attack');
```

**Common mistake:** calling `play('run', false)` every frame resets the animation to frame 0 every update tick. The character appears frozen on frame 0.

---

### One-Shot vs Looping Animations

```js
// Looping: repeat: -1
this.anims.create({
  key: 'player-run',
  frames: this.anims.generateFrameNumbers('player', { start: 8, end: 13 }),
  frameRate: 12,
  repeat: -1  // loop forever
});

// One-shot: repeat: 0
this.anims.create({
  key: 'player-attack',
  frames: this.anims.generateFrameNumbers('player', { start: 14, end: 19 }),
  frameRate: 14,
  repeat: 0   // play once, stop on last frame
});

// Listen for one-shot completion
sprite.on('animationcomplete-player-attack', () => {
  this.isAttacking = false;
  sprite.play('player-idle', true);
});
```

---

### Animation Priority — Preventing Lower-Priority Overrides

The naive approach (if/else chain in `update()`) breaks down as complexity grows. Use explicit priority levels:

```js
// Animation priority constants (higher = more important)
const ANIM_PRIORITY = {
  IDLE:   0,
  WALK:   1,
  JUMP:   2,
  FALL:   3,
  HURT:   8,
  ATTACK: 9,
  DEATH:  10
};

class Player {
  constructor() {
    this.currentAnimPriority = -1;
  }

  playAnim(key, priority, ignoreIfPlaying = false) {
    if (priority < this.currentAnimPriority) return; // blocked by higher priority

    if (this.sprite.anims.currentAnim?.key !== key || !ignoreIfPlaying) {
      this.sprite.play(key, ignoreIfPlaying);
      this.currentAnimPriority = priority;
    }
  }

  onAttackStart() {
    this.playAnim('player-attack', ANIM_PRIORITY.ATTACK);
    this.sprite.once('animationcomplete', () => {
      this.currentAnimPriority = -1; // release lock when attack ends
    });
  }
}
```

---

### State Machine Pattern for Player Animations

Avoid a sprawling `if/else` chain in `update()`. A minimal state machine keeps animation logic clean:

```js
const PlayerState = {
  IDLE:    'idle',
  RUNNING: 'running',
  JUMPING: 'jumping',
  FALLING: 'falling',
  HURT:    'hurt',
  DEAD:    'dead',
  ATTACK:  'attack',
};

class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, 'player');
    this.state = PlayerState.IDLE;
  }

  setState(newState) {
    if (this.state === newState) return;

    // Exit old state
    switch (this.state) {
      case PlayerState.ATTACK:
        this.sprite.off('animationcomplete');
        break;
    }

    this.state = newState;

    // Enter new state
    switch (newState) {
      case PlayerState.IDLE:
        this.sprite.play('player-idle', true);
        break;
      case PlayerState.RUNNING:
        this.sprite.play('player-run', true);
        break;
      case PlayerState.JUMPING:
        this.sprite.play('player-jump');
        break;
      case PlayerState.FALLING:
        this.sprite.play('player-fall', true);
        break;
      case PlayerState.ATTACK:
        this.sprite.play('player-attack');
        this.sprite.once('animationcomplete', () => {
          this.setState(PlayerState.IDLE);
        });
        break;
      case PlayerState.HURT:
        this.sprite.play('player-hurt');
        this.sprite.once('animationcomplete', () => {
          this.setState(PlayerState.IDLE);
        });
        break;
      case PlayerState.DEAD:
        this.sprite.play('player-death');
        break;
    }
  }

  update(cursors) {
    const onGround = this.sprite.body.blocked.down;
    const moving = cursors.left.isDown || cursors.right.isDown;

    // State transitions (priority order — most important first)
    if (this.state === PlayerState.DEAD) return;
    if (this.state === PlayerState.HURT) return;
    if (this.state === PlayerState.ATTACK) return;

    if (!onGround && this.sprite.body.velocity.y < 0) {
      this.setState(PlayerState.JUMPING);
    } else if (!onGround && this.sprite.body.velocity.y > 0) {
      this.setState(PlayerState.FALLING);
    } else if (onGround && moving) {
      this.setState(PlayerState.RUNNING);
    } else if (onGround) {
      this.setState(PlayerState.IDLE);
    }
  }
}
```

---

## Physics (Arcade)

### `body.blocked.down` Flickering — Debounce with `groundFrames`

`body.blocked.down` is computed per-frame and can flicker false for 1-2 frames during collision resolution, especially on moving platforms or corners. This causes jitter in landing detection and animation.

```js
class Player {
  constructor() {
    this.groundFrames = 0;          // frames since last confirmed ground contact
    this.GROUND_GRACE = 4;          // frames to treat as "still grounded"
  }

  get isGrounded() {
    return this.groundFrames > 0;
  }

  update() {
    if (this.sprite.body.blocked.down) {
      this.groundFrames = this.GROUND_GRACE; // reset grace period
    } else {
      this.groundFrames = Math.max(0, this.groundFrames - 1);
    }

    // Use this.isGrounded instead of body.blocked.down for animation/jump logic
  }
}
```

This also doubles as "coyote time" — see the Game Design reference for details.

---

### Body Size vs Visual Size: `setSize()` and `setOffset()`

**Critical:** `setSize()` and `setOffset()` operate in **unscaled pixel units of the original texture**, regardless of any `setScale()` applied to the sprite.

```js
// Player sprite is 48x48 pixels, displayed at scale 2 (96x96 on screen)
const player = this.physics.add.sprite(x, y, 'player');
player.setScale(2);

// WRONG: assumes setSize respects scale — it does not
player.setSize(20, 40);     // hitbox is 20x40 in TEXTURE space = 40x80 on screen

// RIGHT: work in texture-space units
// If you want a 24x40 hitbox at screen size, divide by scale
player.setSize(12, 20);     // 12x20 texture units × scale 2 = 24x40 on screen

// Offset: centers the hitbox horizontally, aligns to feet
// Texture is 48px wide. Body is 12px wide. Center offset = (48-12)/2 = 18
player.setOffset(18, 8);    // 8px from top of texture to top of body
```

**Tip:** Disable `setScale()` during development and work at 1:1 scale until hitboxes are correct. Add scale last.

---

### Static vs Dynamic Groups for Platforms

```js
// Static group: immovable, no physics simulation, best for terrain
const platforms = this.physics.add.staticGroup();
platforms.create(400, 568, 'ground');
platforms.create(600, 400, 'platform');

// Dynamic group: simulates gravity/velocity, can be pushed/moved
// Use for: moving platforms, falling blocks, physics objects
const movingPlatforms = this.physics.add.group();
const plat = movingPlatforms.create(300, 300, 'platform');
plat.body.setAllowGravity(false);      // moving but not falling
plat.body.setVelocityX(100);
plat.body.setBounce(1);                // bounces off world bounds

// After modifying static group (position, scale), MUST refresh
platforms.refresh();  // recomputes static body positions
```

**Never use a dynamic body where a static one is sufficient.** Static bodies skip physics simulation entirely and cost almost nothing.

---

### `setCollideWorldBounds` and `setBounds`

```js
// World bounds default to (0, 0, gameWidth, gameHeight)
// If your camera scrolls and your world is larger, you must resize the world:
this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

// Then set the camera to follow within those bounds
this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

// Player stays within world bounds (can't fall off the edge of the physics world)
player.body.setCollideWorldBounds(true);

// setCollideWorldBounds does NOT prevent falling unless the world bottom bound is set
// For bottomless pits: do NOT setCollideWorldBounds, instead detect when player.y > worldHeight
if (player.y > this.physics.world.bounds.height + 100) {
  this.playerDied();
}
```

---

## Performance

### Object Pools for Projectiles and Particles

Never `destroy()` and re-create frequently spawned objects. Use Phaser's built-in group pooling:

```js
// Create pool in scene.create()
this.bullets = this.physics.add.group({
  classType: Bullet,      // custom class extending Phaser.Physics.Arcade.Sprite
  maxSize: 20,            // pool cap
  runChildUpdate: true,   // calls update() on active children
  createCallback: (bullet) => {
    bullet.setActive(false).setVisible(false);
    bullet.body.setAllowGravity(false);
  }
});

// Firing
fireBullet(x, y, dirX) {
  const bullet = this.bullets.get(x, y, 'bullet');
  if (!bullet) return; // pool exhausted — fail silently or expand pool

  bullet.setActive(true).setVisible(true);
  bullet.body.setVelocityX(dirX * 400);
  bullet.lifespan = 2000; // ms before auto-return
}

// Bullet.update() — return to pool when offscreen or expired
update(time, delta) {
  if (!this.active) return;
  this.lifespan -= delta;

  if (this.lifespan <= 0 || this.x < 0 || this.x > worldWidth) {
    this.setActive(false).setVisible(false);
    this.body.setVelocity(0, 0);
  }
}
```

---

### `setActive/setVisible` vs `destroy()`

| Method | Use when | Cost |
|---|---|---|
| `setActive(false).setVisible(false)` | Object will be reused (projectile, enemy, pickup) | Near-zero |
| `destroy()` | Object is truly gone and will never return (cutscene object, one-time trigger) | Full GC pressure |
| `group.killAndHide(obj)` | Shorthand for the pool pattern | Near-zero |

```js
// Pool return
this.bullets.killAndHide(bullet);
bullet.body.stop();  // also stop the physics body

// True destruction (rare)
this.bossSprite.destroy();  // one boss, never comes back
```

**Destroying hundreds of objects per second (e.g., particle effects) will stall the garbage collector.** Use `setActive/setVisible` or Phaser's `ParticleEmitter` (which pools internally).

---

### Limit `getChildren()` forEach Calls

```js
// BAD: getChildren() allocates a new array; arrow function closure every call
update() {
  this.enemies.getChildren().forEach(enemy => enemy.update());
}

// GOOD: cache the children array, iterate with index
create() {
  this.enemyList = this.enemies.getChildren(); // reference, not copy
}

update(time, delta) {
  const list = this.enemyList;
  for (let i = 0, len = list.length; i < len; i++) {
    if (list[i].active) list[i].update(time, delta);
  }
}
```

For 10-20 enemies the difference is negligible. For 200+ objects updated every frame, it's measurable.

---

### Depth / Layer Management

Phaser renders objects in depth order (lower depth = behind). Define depth constants:

```js
// depths.js
export const Depth = {
  BACKGROUND:   0,
  PARALLAX_BG:  10,
  TILES_BG:     20,
  PICKUPS:      30,
  ENEMIES:      40,
  PLAYER:       50,
  TILES_FG:     60,   // foreground tiles drawn over player
  PARTICLES:    70,
  HUD:          100,
};

// Usage
player.setDepth(Depth.PLAYER);
this.hud.setDepth(Depth.HUD);
```

Avoid `bringToTop()` / `sendToBack()` in hot paths — they re-sort the display list. Set depth once in `create()`.

---

## Scene Management

### Scene Lifecycle

```
init(data)    ← receives data from scene.start('Key', data) or scene.launch('Key', data)
    ↓
preload()     ← load assets (skip if already loaded; Phaser caches by key)
    ↓
create()      ← set up game objects, physics, input, events
    ↓
update(t, dt) ← called every frame while scene is active
    ↓
shutdown      ← triggered by scene.stop() or scene.start() on this scene
    ↓
destroy       ← triggered by scene.remove(); full teardown
```

**`preload` is skipped if all assets are already in the cache.** This is why loading in a dedicated `PreloaderScene` is safe — assets stay cached across scene transitions.

---

### Parallel Scenes — HUD Pattern

```js
// Launch HUD as a separate scene that runs simultaneously with GameScene
// scene.launch() starts the scene without stopping the current one
// scene.start() stops the current scene before starting the new one

// In GameScene.create():
this.scene.launch('HUDScene', { lives: 3, score: 0 });

// In HUDScene, communicate via the EventBus (avoid tight coupling)
// EventBus.js — a simple shared Phaser.Events.EventEmitter
import { EventBus } from './EventBus';

// GameScene fires events
EventBus.emit('score-update', this.score);
EventBus.emit('player-hurt', this.lives);

// HUDScene listens
EventBus.on('score-update', this.updateScore, this);
EventBus.on('player-hurt', this.updateLives, this);
```

---

### Event Cleanup on `shutdown`

**Memory leak pattern:** event listeners added in `create()` persist if not removed on `shutdown`. After `scene.start('GameScene')` (restart), `create()` runs again — you now have duplicate listeners.

```js
create() {
  // Register events
  EventBus.on('score-update', this.updateScore, this);
  this.input.keyboard.on('keydown-SPACE', this.jump, this);

  // Clean up when this scene stops
  this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
}

shutdown() {
  EventBus.off('score-update', this.updateScore, this);
  // Phaser.Input.Keyboard events are cleaned up automatically when scene stops
  // but external event emitters (EventBus, DOM events) must be manually removed
}
```

**The `this.events.once(SHUTDOWN)` pattern is the safest approach** — it fires regardless of how the scene exits (restart, navigate away, game over).

---

### Passing Data Between Scenes

```js
// Sender
this.scene.start('GameOverScene', {
  score: this.score,
  level: this.currentLevel,
  cause: 'fell'
});

// Receiver — data arrives in init(), before preload/create
class GameOverScene extends Phaser.Scene {
  init(data) {
    this.finalScore = data.score ?? 0;
    this.level = data.level ?? 1;
    this.deathCause = data.cause ?? 'unknown';
  }

  create() {
    // this.finalScore is ready here
    this.add.text(400, 300, `Score: ${this.finalScore}`);
  }
}
```

---

## Input

### `JustDown` vs `isDown`

```js
const { JustDown } = Phaser.Input.Keyboard;

// isDown: true for every frame the key is held
// Use for: movement, sustained actions
if (cursors.right.isDown) {
  player.body.setVelocityX(200);
}

// JustDown: true only on the FIRST frame the key is pressed
// Use for: jump (prevents hold-to-fly), attack, menu navigation, pause
if (JustDown(cursors.up)) {
  this.jump();
}

// JustUp: true only on the FIRST frame the key is released
// Use for: variable-height jump (cut off velocity on release)
const { JustUp } = Phaser.Input.Keyboard;
if (JustUp(cursors.up) && player.body.velocity.y < 0) {
  player.body.setVelocityY(player.body.velocity.y * 0.4); // cut jump short
}
```

---

### Keyboard State Persisting Across Scene Restarts

When a scene restarts, `cursors.up.isDown` can be `true` on the first frame if the player is still holding the key from before the restart. This causes an immediate jump on respawn.

```js
// Option 1: re-create cursors in create() (they are scene-specific objects)
create() {
  this.cursors = this.input.keyboard.createCursorKeys();
  // Fresh object, but the underlying key state can still be stale for 1 frame
}

// Option 2: skip input on the first frame after scene start
create() {
  this.inputLocked = true;
  this.time.delayedCall(50, () => { this.inputLocked = false; });
}

update() {
  if (this.inputLocked) return;
  // ... input processing
}

// Option 3: explicitly reset key state
create() {
  this.cursors = this.input.keyboard.createCursorKeys();
  this.input.keyboard.resetKeys();  // clears all key states
}
```

---

## Common Pitfalls

1. **`physics.add.sprite` vs `add.sprite`** — `add.sprite` has no physics body. Collision won't work, and `body` will be `null`. Always use `physics.add.sprite` for entities that need physics.

2. **Forgetting `group.refresh()` after moving static bodies** — If you reposition a static group member (e.g., a platform), call `platforms.refresh()`. Otherwise the physics body stays at the old position while the visual moves.

3. **Scale vs physics body mismatch** — `setScale(2)` doubles visual size but does NOT change the physics body. Call `setSize()` and `setOffset()` explicitly after scaling.

4. **`update()` not called on group children** — Children of a group don't automatically call their `update()` method. Either set `runChildUpdate: true` on the group, or iterate manually in the scene's `update()`.

5. **Z-ordering surprises** — Objects added later render on top by default. If a foreground tile appears behind the player, set explicit `setDepth()` values rather than relying on add order.

6. **Music restarting on scene restart** — Audio is tied to the scene. Call `this.sound.add('music', { loop: true })` and check if it's already playing before starting. Or manage music from a persistent scene (e.g., `BootScene`).

7. **`this.add.text` in the HUD scrolling with the camera** — Text (and all game objects) are in world space by default. For fixed HUD elements, call `textObject.setScrollFactor(0)`.

8. **`overlap` vs `collider`** — `addCollider` resolves collision (pushes objects apart). `addOverlap` only fires a callback, does NOT separate objects. Use `overlap` for pickups/triggers, `collider` for solid surfaces.

9. **Tilemap layer not in physics world** — After creating a tilemap layer, call `layer.setCollisionByProperty({ collides: true })` (or `setCollisionBetween`). Then pass the layer to `physics.add.collider(player, layer)`. Both steps are required.

10. **One-time setup in `update()` instead of `create()`** — Calling `this.physics.add.collider(...)` or `this.anims.create(...)` inside `update()` runs every frame, creating thousands of duplicate colliders/animations. Always set these up in `create()`.

11. **`destroy()` on a pooled object** — Calling `destroy()` on an object managed by a group removes it from the pool permanently. Use `killAndHide()` or `setActive(false).setVisible(false)` instead.

12. **Camera lerp causing visible lag** — `camera.startFollow(player)` with default lerp (1.0) snaps instantly. `camera.startFollow(player, true, 0.1, 0.1)` is smooth but adds perceived lag. For platformers, common values are lerp X: 0.1-0.15, lerp Y: 0.05-0.1. Too low makes the camera feel disconnected.

13. **World bounds vs camera bounds mismatch** — `physics.world.setBounds()` and `cameras.main.setBounds()` are separate calls. Forgetting one causes either the player to walk off camera or the camera to scroll past the level.

14. **`JustDown` missing fast presses** — `JustDown` is only true for exactly one frame. If your `update()` runs at 60fps and you check `JustDown` every other frame (e.g., after a condition check), you'll miss presses. Check `JustDown` unconditionally at the top of `update()` and store the result.
