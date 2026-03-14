# Bug Tracker -- Kind vs Müttern

This is a learning-by-doing project. This file tracks known issues, reported bugs, and their resolution status.

---

## Table of Contents

- [Fixed Bugs](#fixed-bugs)
  - [BUG-001: Characters floating above ground](#bug-001-characters-floating-above-ground)
  - [BUG-002: Checkpoint shows multiple flags](#bug-002-checkpoint-shows-multiple-flags)
  - [BUG-003: Music too loud, SFX barely audible](#bug-003-music-too-loud-sfx-barely-audible)
  - [BUG-004: Apple throw UI looks poor](#bug-004-apple-throw-ui-looks-poor)
  - [BUG-005: Shooting/throwing uses wrong sound](#bug-005-shootingthrowing-uses-wrong-sound)

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
