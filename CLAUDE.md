# CLAUDE.md — Kid vs. Mütter

This file tells Claude Code how to work with this project.

## Project overview

A single-page Phaser 3 platformer game. All game code lives in `index.html`. Assets are in `assets/`. No build step — open `index.html` directly in a browser or via a local HTTP server.

## Architecture

```
index.html
├── <style>          CSS: full-screen canvas, pixel rendering
├── SFX              Web Audio API procedural sound effects (no audio files)
├── BootScene        Preloads all assets, defines all animations
├── MenuScene        Title screen with controls and item guide
├── GameScene        Main gameplay (platforms, player, enemies, collectibles)
│   ├── buildLevel   Static platform layout for the 5200px level
│   ├── spawnEnemies Enemy placement and initial AI state
│   ├── handlePlayer Per-frame player movement and animation FSM
│   ├── handleEnemies Per-frame enemy chase/patrol AI and projectiles
│   └── respawnEnemy Delayed enemy respawn after stomp kill
├── HUDScene         Overlaid HUD (lives, score, power-up bars) — runs in parallel with GameScene
└── GameOverScene    Win/lose screen
```

## Key constants

| Constant | Value | Purpose |
|---|---|---|
| `GAME_W / GAME_H` | 800 × 560 | Canvas size |
| `LEVEL_W` | 5200 | Horizontal level width |
| `CHAR.frameW/H` | 32 × 32 | Player sprite frame size |
| `NPC.frameW/H` | 48 × 48 | Enemy sprite frame size |
| Gravity | 750 | Arcade physics gravity Y |
| First jump | -510 | Player jump velocity (normal) |
| Double jump | -370 | Second jump velocity |
| Super boot | -660 | First jump with boots power-up |

## Asset requirements

Place all assets in the `assets/` folder:

| File | Dimensions | Layout |
|---|---|---|
| `character.png` | 224 × 544 | 7 cols × 17 rows, 32×32 per frame |
| `NPC_OldWoman_01.png` | 288 × 288 | 6 cols × 6 rows, 48×48 per frame |
| `NPC_OldWoman_02.png` | 288 × 288 | 6 cols × 6 rows, 48×48 per frame |
| `Background.png` | any | Static background image |
| `Background-sheet.png` | 384 × 864 | 1 col × 4 rows, 384×216 per frame |
| `PineTrees.png` | 1024 × 641 | 8 cols × 5 rows, 128×128 per frame |
| `Allpieces.png` | any | Platform/tile sheet (loaded, not yet used) |

## Animation map (player)

| Key | Frames | FPS | Repeat |
|---|---|---|---|
| `p-idle` | 0–3 | 6 | loop |
| `p-walk` | 35–41 | 10 | loop |
| `p-jump` | 14 | 1 | once |
| `p-hurt` | 42–43 | 8 | once |

## Animation map (enemies, both NPC sheets share same layout)

| Key | Frames | FPS | Repeat |
|---|---|---|---|
| `e1/e2-idle` | 0–1 | 4 | loop |
| `e1/e2-walk` | 6–10 | 8 | loop |
| `e1/e2-attack` | 12–14 | 8 | once |

## Animation state machine (player)

```
IDLE ←──────────────────┐
  │ move              land│
  ▼                       │
WALK ──── jump ──→ JUMP ──┘
  │                  │
  └── jump ──→ JUMP (double)

Any state ──── damage ──→ HURT (800 ms) ──→ restore previous
```

- `setPlayerAnim(key)` is the ONLY way to change player animation — never call `player.play()` directly except in `takeDamage()`, and immediately sync `this.playerAnim` after.
- `this.groundFrames` debounces `body.blocked.down` — requires 2 consecutive grounded frames before treating player as on-ground.

## Enemy AI

- **Patrol mode**: walks patrol range at speed 52 × speedMult
- **Chase mode**: triggered when player within 350px horizontal AND 120px vertical
  - enemy1: speed 115 × speedMult, shoots shoes (faster timer when chasing)
  - enemy2: speed 140 × speedMult, runs directly at player
- **On kill**: respawns after 3 s, 800–1200px away, speedMult × 1.3 (capped at 1.6)

## Sound effects (SFX object)

All sounds are procedurally generated via Web Audio API. No audio files needed. Replace by loading real audio files in BootScene and calling `this.sound.play(key)` in GameScene when ready.

| Method | Trigger |
|---|---|
| `SFX.jump()` | Player jumps |
| `SFX.land()` | Player lands |
| `SFX.stomp()` | Enemy stomped |
| `SFX.hurt()` | Player takes damage |
| `SFX.shoe()` | Enemy throws shoe |
| `SFX.blocked()` | Shield absorbs hit |
| `SFX.collect()` | Collectible picked up |
| `SFX.win()` | Goal reached |
| `SFX.gameover()` | Player dies |

## Best practices for this project

### Never do this

- **Do not call `player.play()` directly** — always use `setPlayerAnim()` so `this.playerAnim` stays in sync with the guard logic. Direct calls desync the guard and cause animation flicker.
- **Do not add per-object physics colliders inside `respawnEnemy`** — the group colliders registered in `create()` automatically cover all group members. Adding extras creates duplicates that accumulate.
- **Do not set `this.playerAnim = ''`** to force an animation — instead call `setPlayerAnim('p-hurt')` or set `this.playerAnim` to the actual key you want to resume.
- **Do not register HUD event listeners without adding them to the cleanup list** in the `events.on('shutdown', ...)` block — they will leak across scene restarts.

### Always do this

- **Use `Phaser.Input.Keyboard.JustDown()`** for one-shot input (jump) and `.isDown` for held input (movement).
- **Null-check active objects** before accessing their body or calling methods — use `if (!e.active) return` at the top of any per-enemy loop.
- **Test with `debug: true`** in the arcade physics config to visualise all hitboxes when adjusting body size/offset.
- **Keep SFX calls after state changes**, not before — e.g. call `SFX.hurt()` after setting `this.isHurt = true` so the flag is correct if the sound system queries game state.

### Adding a new level

1. Change `LEVEL_W` and add new `addPlat(...)` calls in `buildLevel()`
2. Add enemy entries to `spawnEnemies()`
3. Add collectible entries to `spawnCollectibles()`
4. Move the goal zone `this.goalZone` to the new end position

### Adding a new power-up

1. Add a new type string to `spawnCollectibles()` with a color and label
2. Handle the new `case` in `onCollect()`
3. Emit a HUD event and add a matching listener in `HUDScene.create()`
4. Add the event key to the HUD shutdown cleanup list

### Adding real audio files

1. Load them in `BootScene.preload()`: `this.load.audio('jump', 'assets/jump.mp3')`
2. In `GameScene.create()`, create sound instances: `this.sndJump = this.sound.add('jump', { volume: 0.4 })`
3. Replace `SFX.jump()` calls with `this.sndJump.play()`
4. Remove or keep the `SFX` object as fallback

## Running locally

```bash
# Python (no install needed)
python -m http.server 8080
# Then open http://localhost:8080

# Node (npx, no install needed)
npx serve .
```

Do NOT open `index.html` as a `file://` URL — browser security blocks spritesheet loading.

## Debugging tips

- Set `debug: true` in the Phaser arcade physics config to see all hitboxes
- Set `this.physics.world.drawDebug = true` in `create()` at runtime
- Use browser DevTools → Performance tab to profile update loop frame times
- Check browser console for Phaser warnings about missing frames or animation keys

---

## Troubleshooting Log

<!-- Add entries here as problems are encountered and investigated.
     Use the format below for each entry. -->

<!--
### [Problem title]
**Symptom:** [what the user sees]
**Root cause:** [what actually caused it, once known]
**Attempts:**
- [ ] Description of fix tried — FAILED / ✅ FIXED / 🔄 IN PROGRESS
**Status:** Open / Resolved
-->

### Game stuck on "LADEN..." load screen — never transitions to menu
**Symptom:** Progress bar visible, "LADEN..." text shows, game never reaches MenuScene.
**Root cause:** `this.load.audio('music', ...)` in `BootScene.preload()`. Phaser 3.60 uses `audioContext.decodeAudioData()` internally; if `AudioContext` is still suspended (no user gesture yet), decoding can hang indefinitely and the Phaser loader never fires `complete`.
**Attempts:**
- ✅ FIXED — Move `this.load.audio('music', ...)` out of BootScene and into GameScene's `create()`, loading it after the user has already clicked "SPIEL STARTEN" (AudioContext is active). Use `this.load.once('complete', ...)` + `this.load.start()` for the lazy load.
**Status:** Resolved (2026-03-14)

---

## Anti-loop Rules

Rules derived from the troubleshooting log and reference docs to prevent getting stuck in repeated failed attempts at the same class of problem.

- **Rule:** Never call `player.play()` directly — always go through `setPlayerAnim()`.
  **Why:** Direct calls to `play()` desync `this.playerAnim` from the actual animation state, causing the guard logic in `handlePlayer` to make wrong decisions and producing animation flicker. (Project best practices; phaser3-platformer-bestpractices.md — "Animation Priority" section.)
  **Applies to:** Any code path that changes the player's animation.

- **Rule:** Never call `this.anims.create()` or `this.physics.add.collider()` inside `update()`.
  **Why:** These calls run every frame, creating thousands of duplicate animation definitions and colliders that accumulate silently. All setup must live in `create()`. (phaser3-platformer-bestpractices.md — Common Pitfall #10.)
  **Applies to:** Any new animation or physics collider being added to the game.

- **Rule:** Never add per-object colliders inside `respawnEnemy` — the group colliders registered in `create()` cover all group members automatically.
  **Why:** Adding extras creates duplicate colliders that stack up on every respawn, causing incorrect collision behaviour and memory growth. (Project best practices.)
  **Applies to:** `respawnEnemy()` and any future per-enemy setup code.

- **Rule:** Always register a `loaderror` listener in `BootScene.preload()` before queuing assets.
  **Why:** Phaser silently skips assets that fail to load. Without the listener, a missing or mis-cased file produces no console error, making the root cause invisible. (phaser3-platformer-bestpractices.md — "load.on('loaderror') for Debugging".)
  **Applies to:** Every asset load — spritesheets, images, audio.

- **Rule:** Asset file names and paths must exactly match the case used in `this.load.*` calls, including on Windows during development.
  **Why:** Windows file systems are case-insensitive; Linux servers (Vercel, Netlify) are case-sensitive. A path that works locally will silently 404 in production. (phaser3-platformer-bestpractices.md — "Case-Sensitive Paths on Linux Servers".)
  **Applies to:** All files in `assets/` and their references in `BootScene`.

- **Rule:** Always pass `ignoreIfPlaying = true` to `sprite.play()` for looping animations (idle, walk, fall); omit it (or pass `false`) only for one-shot animations (hurt, attack, death).
  **Why:** Calling `play('run', false)` every frame resets the animation to frame 0 on every update tick, freezing the character on frame 0. (phaser3-platformer-bestpractices.md — "play(key, ignoreIfPlaying)".)
  **Applies to:** All `sprite.play()` calls inside per-frame update logic.

- **Rule:** Always clean up external event listeners (scene EventEmitter, DOM events) in the `events.on('shutdown', ...)` block; never leave this block empty or absent.
  **Why:** Listeners added in `create()` persist through `scene.start()` restarts. Each restart adds a duplicate listener, causing handlers to fire multiple times and score/HUD values to compound. (phaser3-platformer-bestpractices.md — "Event Cleanup on shutdown"; project best practices.)
  **Applies to:** HUDScene and any scene that listens to cross-scene events.

- **Rule:** Use `Phaser.Input.Keyboard.JustDown()` for jump input; never use `.isDown` for one-shot actions.
  **Why:** `.isDown` is true for every frame the key is held, causing the player to multi-jump or trigger repeated actions unintentionally. `JustDown` fires only on the first frame of the press. (phaser3-platformer-bestpractices.md — "JustDown vs isDown"; project best practices.)
  **Applies to:** Jump, attack, pause, and any other single-trigger input.

- **Rule:** Null-check or active-check every enemy object before accessing its physics body or calling methods on it.
  **Why:** Inactive pooled objects still exist in the group's children array. Accessing `.body` on an inactive or destroyed object throws a runtime error and crashes the update loop. (Project best practices — "Null-check active objects".)
  **Applies to:** All loops over enemy groups in `handleEnemies()` and `respawnEnemy()`.

- **Rule:** Use `setActive(false).setVisible(false)` (or `group.killAndHide()`) to retire pooled objects — never `destroy()`.
  **Why:** `destroy()` permanently removes the object from the group pool. The next spawn attempt silently fails or creates a new object outside the pool, breaking the collider setup. (phaser3-platformer-bestpractices.md — "setActive/setVisible vs destroy()".)
  **Applies to:** Projectiles (shoes, fruit), enemy respawn flow, and any collectible recycling.

- **Rule:** When adjusting a physics body with `setSize()` / `setOffset()`, work in unscaled texture-space units, not screen pixels.
  **Why:** `setSize()` and `setOffset()` ignore any `setScale()` applied to the sprite. Using screen-pixel values produces a hitbox that is `scale` times larger than intended, invisible without `debug: true`. (phaser3-platformer-bestpractices.md — "Body Size vs Visual Size".)
  **Applies to:** Player and enemy hitbox adjustments whenever sprite scale is non-1.

- **Rule:** After repositioning a static group member at runtime, always call `group.refresh()`.
  **Why:** Static body positions are cached. Moving the game object visually does not update the physics body; the collision surface stays at the original position until `refresh()` is called. (phaser3-platformer-bestpractices.md — Common Pitfall #2.)
  **Applies to:** Any platform or static obstacle that is moved after `create()`.

- **Rule:** Do not rely on `body.blocked.down` alone for grounded/landing detection — use the `groundFrames` debounce counter.
  **Why:** `body.blocked.down` can flicker false for 1-2 frames during collision resolution (corners, moving surfaces), producing spurious jump resets and animation state jitter. The 2-frame debounce already in the project (`this.groundFrames`) is the correct gate. (phaser3-platformer-bestpractices.md — "body.blocked.down Flickering"; project architecture notes.)
  **Applies to:** Jump eligibility checks, landing animation triggers, and coyote-time logic.
