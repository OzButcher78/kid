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
