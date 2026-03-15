# Bug Tracker -- Kind vs Müttern

This is a learning-by-doing project. This file tracks known issues, reported bugs, and their resolution status.

---

## Table of Contents

- [Open Bugs](#open-bugs)
  - [BUG-006: Enemies get stuck under platforms](#bug-006-enemies-get-stuck-under-platforms)
- [Fixed Bugs](#fixed-bugs)
  - [BUG-001: Characters floating above ground](#bug-001-characters-floating-above-ground)
  - [BUG-002: Checkpoint shows multiple flags](#bug-002-checkpoint-shows-multiple-flags)
  - [BUG-003: Music too loud, SFX barely audible](#bug-003-music-too-loud-sfx-barely-audible)
  - [BUG-004: Apple throw UI looks poor](#bug-004-apple-throw-ui-looks-poor)
  - [BUG-005: Shooting/throwing uses wrong sound](#bug-005-shootingthrowing-uses-wrong-sound)
  - [BUG-007: Player falls through ground](#bug-007-player-falls-through-ground)

---

## Open Bugs

### BUG-006: Enemies get stuck under platforms

| Field | Detail |
|---|---|
| **Status** | IN PROGRESS (attempt #7) |
| **Reported** | 2026-03-15 |
| **Category** | Enemy AI / Pathfinding |

**Description:**
Enemies attempting to reach the player on a higher platform get stuck in a loop — jumping, falling, repeating without making progress.

**Root causes found and fixed so far:**

1. **Nav graph too generous** (maxJumpH=200 but physics only allows ~154px) — BFS found impossible paths. **Fixed**: calculate limits from actual physics.
2. **Y distance restriction** (canChase required distYAbs<120) — enemies never entered chase mode for high platforms. **Fixed**: removed Y restriction.
3. **Jumping into platform bottoms** — enemies jumped from directly under solid platforms, hit the bottom, bounced back. **Fixed**: approach from the side (50px past edge).
4. **samePlatform false positive** — enemies on adjacent platforms at similar height were told to "run directly" instead of pathfinding across gaps. **Fixed**: check actual platform object identity.
5. **No failure recovery** — enemies retried the same failed approach indefinitely. **Fixed**: track _jumpAttempts, switch sides after 2 failures.
6. **Insufficient side-switching distance** — enemies don't move far enough away before re-attempting. **IN PROGRESS**: need escalating retreat distance on repeated failures + randomized approach routes.

**Lesson learned:** Enemy pathfinding requires: (a) nav graph limits matching real physics, (b) solid platform awareness, (c) actual platform identity checks, (d) failure escalation with diverse retry strategies.

---

## Fixed Bugs

### BUG-001: Characters floating above ground

| Field | Detail |
|---|---|
| **Status** | FIXED (attempt #3) |
| **Reported** | 2026-03-14 |
| **Resolved** | 2026-03-14 |
| **Category** | Physics / Hitbox |

**Description:**
Player and enemy sprites appeared to float ~13px above the brown ground and green platforms. Checkpoints sat correctly on the ground.

**Root cause:**
Physics body bottom extended below the character's drawn feet in the 64x64 sprite frame. With `setSize(30,48)/setOffset(17,8)`, the body bottom was at texture row 56, but character feet end at row 47. At 1.5x scale, this created a 13.5px visual gap.

**Fix attempts (learning log):**

1. Changed body from `setSize(30,42)/setOffset(17,14)` to `setSize(30,48)/setOffset(17,8)` -- body bottom at row 56, still past the feet. **Failed.**
2. Tried various offset values without measuring actual sprite feet position. **Failed.**
3. **Read the actual sprite PNGs** to find feet at texture row 47. Set `setSize(30,40)/setOffset(17,8)` so body bottom = row 48 (matching feet). Updated all `respawnY` from `H-68` to `H-56`. **SUCCESS.**

**Lesson learned:** Always inspect the actual sprite artwork to find where the character's feet are drawn, rather than guessing body dimensions. The CLAUDE.md "Body Size vs Visual Size" anti-loop rule applies.

**Files changed:** `js/GameScene.js` (player creation, spawnEnemies, respawnEnemy, spawnCheckpoints, init)

---

### BUG-002: Checkpoint shows multiple flags

| Field | Detail |
|---|---|
| **Status** | FIXED |
| **Resolved** | 2026-03-14 |
| **Category** | Assets / Loading |

**Description:**
When activating a checkpoint, the cp-idle texture showed the entire spritesheet strip (multiple flags) because it was loaded as a regular image instead of a spritesheet.

**Fix applied:**
Changed `load.image` to `load.spritesheet` with `frameWidth`/`frameHeight` 64x64, and added `.setFrame(0)` on activation.

---

### BUG-003: Music too loud, SFX barely audible

| Field | Detail |
|---|---|
| **Status** | FIXED |
| **Reported** | 2026-03-14 |
| **Resolved** | 2026-03-14 |
| **Category** | Audio |

**Description:**
Background music drowned out all sound effects making them barely audible.

**Fix applied:**
- Reduced music volume from `0.35` to `0.15` (halved)
- Increased all SFX volumes by ~50% (e.g. jump 0.30→0.45, stomp 0.50→0.70, hurt 0.55→0.75)

**Files changed:** `js/GameScene.js` (audio setup in create())

---

### BUG-004: Apple throw UI looks poor

| Field | Detail |
|---|---|
| **Status** | FIXED |
| **Reported** | 2026-03-14 |
| **Resolved** | 2026-03-14 |
| **Category** | HUD / UI |

**Description:**
The Apple [Q] HUD indicator used a crude graphics-drawn bar with filled circles. Looked unpolished.

**Fix applied:**
Redesigned with a Phaser Container:
- Dark semi-transparent rounded pill background with orange border
- "Q" key badge in Bangers font with orange background
- 3 actual `fruit-apple` sprites (scale 0.8) that dim/grey when used
- Clean show/hide transitions

**Files changed:** `js/HUDScene.js` (createAppleUI, updateAppleUI replaced old createAppleBar/updateAppleBar)

---

### BUG-005: Shooting/throwing uses wrong sound

| Field | Detail |
|---|---|
| **Status** | FIXED |
| **Reported** | 2026-03-14 |
| **Resolved** | 2026-03-14 |
| **Category** | Audio |

**Description:**
Both enemy fruit throws and player apple throws used `Woosh_2.ogg` (snd-shoe). User wanted `Thudd2.ogg` for throwing and `Thudd1.mp3` for box head-bump.

**Fix applied:**
- Added `snd-throw` loading `Thudd2.ogg` at volume 0.60 -- used in `throwFruit()` and `throwPlayerApple()`
- Added `snd-box-bump` loading `Thudd1.mp3` at volume 0.65 -- used in `onBoxHit()` for every box hit
- Removed old `snd-shoe` references

**Files changed:** `js/GameScene.js` (audio loading, throwFruit, throwPlayerApple, onBoxHit)

---

### BUG-007: Player falls through ground

| Field | Detail |
|---|---|
| **Status** | FIXED |
| **Reported** | 2026-03-15 |
| **Category** | Physics / Collision |

**Description:**
Player occasionally falls through the ground platform and keeps falling infinitely.

**Root cause analysis:**
Multiple contributing factors:
1. Ground platform was only 32px thick — thin enough for fast-falling bodies to tunnel through in a single physics step
2. Rocket boots power-up reduces fall velocity with `*= 0.85` each frame, creating edge cases near platform boundaries
3. No max fall velocity cap, allowing tunneling at high speeds
4. The existing fall detection (y > GAME_H + 100) only triggered respawn AFTER the player was already far below screen

**Fix applied:**
1. Increased ground platform thickness from 32px to 48px for larger collision surface
2. Added max fall velocity cap of 600px/s to prevent tunneling
3. Added per-frame safety net: if player body bottom exceeds ground top, snap back onto ground surface
4. Updated all spawn/respawn Y positions to match new ground height (H-72 instead of H-56)
5. Updated checkpoint, trophy, and goal zone positions

**Files changed:** `js/GameScene.js` (buildLevel, update, spawn positions, checkpoint/trophy positions)
