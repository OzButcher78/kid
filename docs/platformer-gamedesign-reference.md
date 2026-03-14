# 2D Platformer — Game Design Reference

> Practical game design principles for 2D platformers, with recommended values and implementation notes for Phaser 3.

---

## Feel & Controls

### Game Feel — The Invisible Systems

"Game feel" is everything that happens between pressing a button and the player's intended action completing. Great platformers hide generous forgiveness windows and responsive micro-feedback. Players rarely notice these systems consciously; they just say the game "feels good."

---

### Coyote Time

Allow the player to jump for a short window after walking off a ledge. Without this, players feel punished for near-misses that visually looked like they should have worked.

```js
// In player update():
const COYOTE_TIME = 100; // ms

if (this.body.blocked.down) {
  this.lastGroundedTime = this.scene.time.now;
}

get canJump() {
  const withinCoyoteWindow = (this.scene.time.now - this.lastGroundedTime) < COYOTE_TIME;
  return this.body.blocked.down || withinCoyoteWindow;
}
```

**Recommended range:** 80–150ms. Below 80ms players don't notice it. Above 150ms it feels "floaty" and abusable.

---

### Jump Buffering

If the player presses jump slightly before landing, queue the jump and execute it the moment they touch the ground. Without buffering, fast players who spam jump early get no response and have to re-press.

```js
const JUMP_BUFFER_TIME = 120; // ms

// On jump key press (JustDown):
this.jumpPressedTime = this.scene.time.now;

// In update(), check ground state:
const jumpBuffered = (this.scene.time.now - this.jumpPressedTime) < JUMP_BUFFER_TIME;

if (this.isGrounded && jumpBuffered) {
  this.executeJump();
  this.jumpPressedTime = 0; // consume the buffer
}
```

**Recommended range:** 100–150ms. This covers ~6–9 frames at 60fps, which matches human reaction time variance.

---

### Variable Jump Height

Cutting the jump velocity when the player releases the jump key early gives "light tap = short hop, hold = full jump." This feels far more expressive than a fixed-height jump.

```js
// On jump key release (JustUp):
if (this.sprite.body.velocity.y < 0) {
  // Player released early — apply a multiplier to reduce upward momentum
  this.sprite.body.setVelocityY(this.sprite.body.velocity.y * 0.45);
}
```

**Tuning:** the multiplier controls minimum jump height. `0.5` = roughly half height. `0.3` = very short hop. `1.0` = no variable height.

---

### Recommended Physics Values

These are starting points for a standard-feel platformer. Adjust to match your character scale and world scale.

| Parameter | Recommended Range | Notes |
|---|---|---|
| Gravity (Y) | 600–900 px/s² | Lower = floaty, higher = heavy |
| Jump velocity (Y) | -400 to -600 px/s | Negative = upward in Phaser |
| Walk speed (X) | 150–250 px/s | Sprint: 300–400 px/s |
| Max fall speed | 800–1200 px/s | `setMaxVelocity(500, 1000)` |
| Ground friction | 0.85–0.95 | Apply as velocity * factor each frame |
| Air control (X) | 60–80% of ground | Reduce acceleration when airborne |
| Coyote time | 80–150ms | |
| Jump buffer | 100–150ms | |

```js
// Phaser 3 setup in create()
this.physics.world.gravity.y = 800;

player.body.setMaxVelocity(400, 1000);
player.body.setDragX(800);      // horizontal deceleration (ground)

// In update():
if (cursors.left.isDown) {
  const accel = isGrounded ? 1000 : 700; // less air control
  player.body.setAccelerationX(-accel);
} else if (cursors.right.isDown) {
  const accel = isGrounded ? 1000 : 700;
  player.body.setAccelerationX(accel);
} else {
  player.body.setAccelerationX(0);
}
```

---

### Double Jump

A second jump in the air is one of the single highest-impact feel improvements in a platformer:

- Recovers from missed ledges — reduces frustration dramatically
- Extends traversal options without changing level geometry
- Allows precise height control: one small hop + one big jump to reach a high platform

```js
class Player {
  constructor() {
    this.jumpsRemaining = 2; // or 1 if no double jump
  }

  onGrounded() {
    this.jumpsRemaining = 2; // reset on land
  }

  jump() {
    if (this.jumpsRemaining <= 0) return;

    const isFirstJump = this.jumpsRemaining === 2;
    const jumpVelocity = isFirstJump ? -550 : -450; // second jump slightly weaker
    this.sprite.body.setVelocityY(jumpVelocity);
    this.jumpsRemaining--;

    if (!isFirstJump) {
      // Trigger double-jump particle burst / sound
      this.scene.events.emit('player-doublejump', this.sprite.x, this.sprite.y);
    }
  }
}
```

**Design note:** the double jump velocity should be ~80% of the first jump to feel like a recovery move, not a second full jump.

---

## Level Design

### Platform Gap and Height Rules

Before designing levels, calculate the maximum distances your physics values allow. This defines your design envelope.

```
Given: gravity = 800, jumpVelocity = -550, walkSpeed = 200

Time to apex:      t = |jumpVelocity| / gravity = 550/800 = 0.6875s
Apex height:       h = jumpVelocity²/(2*gravity) = 302500/1600 ≈ 189px
Total air time:    T = 2 * t = 1.375s
Horizontal range:  R = walkSpeed * T = 200 * 1.375 = 275px
```

**Build your gap and platform sizes from these numbers.** A "comfortably reachable" gap should be 60–70% of maximum range. A "challenging" gap is 85–90%. A "pixel-perfect" gap (only for expert sections) is 95%+.

| Difficulty | Max Gap | Max Step Up | Notes |
|---|---|---|---|
| Easy (tutorial) | ≤ 40% range | ≤ 30% apex | Player always has margin |
| Normal | 50–70% range | 40–60% apex | Requires commitment, not skill |
| Hard | 70–85% range | 60–80% apex | Requires good timing |
| Expert | 85–95% range | 80–95% apex | Precise execution required |

---

### Difficulty Curve — Introduce Before Challenging

Every mechanic must appear in a safe, low-stakes context before it's tested under pressure.

**The 3-step pattern:**
1. **Introduce** — player sees the mechanic with no threat, infinite retries implied
2. **Develop** — mechanic used with light pressure (a slow enemy, a small gap)
3. **Challenge** — mechanic tested under real pressure (timer, enemy, precise jump)

**Concrete example for moving platforms:**
- Room 1: One slow moving platform over a safe ledge (fall = harmless)
- Room 2: Two moving platforms at different speeds, small gap below
- Room 3: Moving platforms + gap + a spike obstacle

Never combine two new mechanics in the same challenge — players can't diagnose which one killed them.

---

### Visual Language: Parallax Layers

Parallax depth creates a sense of world scale and guides the player's eye. Typical setup:

| Layer | Scroll Factor | Content |
|---|---|---|
| Sky / distant BG | 0.0–0.1 | Clouds, mountains, stars |
| Far background | 0.2–0.4 | Distant trees, buildings |
| Mid background | 0.5–0.7 | Background structures, foliage |
| Gameplay layer | 1.0 | Tiles, platforms, enemies, player |
| Foreground | 1.1–1.3 | Leaves, foreground props (rare) |

```js
// Phaser 3 tilesprite parallax
const bgFar = this.add.tileSprite(0, 0, worldWidth, gameHeight, 'bg-mountains')
  .setOrigin(0, 0)
  .setScrollFactor(0);  // Fixed to camera — update tilePositionX manually

// In update():
bgFar.tilePositionX = this.cameras.main.scrollX * 0.2;
bgMid.tilePositionX = this.cameras.main.scrollX * 0.5;
```

**Visual language rules:**
- High-contrast, desaturated colors for background; saturated for foreground/interactive elements
- Interactive platforms should have a distinct visual marker (bright edge, different texture)
- Hazards (spikes, lava) should read at a glance — use universally dangerous color cues (red, orange)
- Collectibles should glow or animate — make them pop against the environment

---

### Safe Zones and Checkpoints

- **Place checkpoints before hard segments, not after.** Players feel rewarded when a save point appears as they approach danger.
- **Safe zones** (no enemies, no hazards) should appear after every difficult section. Give the player a moment to breathe and process what they learned.
- **Checkpoint density guidelines:**

| Segment type | Checkpoint spacing |
|---|---|
| Tutorial | Every 20–30 seconds |
| Normal | Every 60–90 seconds |
| Hard section | Before each major obstacle |
| Boss room | At entrance, always |

- Show checkpoint activation clearly: animation, sound, color change. Players need to know their progress was saved.

---

## Enemy Design

### Patrol vs Chase AI

**Patrol (simple, predictable):**
- Enemy moves between two points at constant speed
- Player can observe the pattern and time their movement
- Best for: introductory enemies, background threats
- Make the patrol area visible or implied (shadow/footstep marks at turn points)

```js
// Simple patrol
update() {
  if (this.sprite.x >= this.rightBound) {
    this.sprite.body.setVelocityX(-this.speed);
    this.sprite.setFlipX(true);
  } else if (this.sprite.x <= this.leftBound) {
    this.sprite.body.setVelocityX(this.speed);
    this.sprite.setFlipX(false);
  }
}
```

**Chase (reactive, dynamic):**
- Enemy detects player and pursues
- Creates urgency and forces player to move
- Must have a "give up" range, otherwise chasing enemies stack up and become unavoidable

```js
// Chase with leash
update() {
  const dist = Phaser.Math.Distance.Between(
    this.sprite.x, this.sprite.y,
    this.target.x, this.target.y
  );

  if (dist < this.DETECT_RANGE && dist > this.GIVE_UP_RANGE) {
    const dir = this.target.x > this.sprite.x ? 1 : -1;
    this.sprite.body.setVelocityX(dir * this.chaseSpeed);
    this.state = 'chasing';
  } else {
    this.sprite.body.setVelocityX(0);
    this.state = 'patrol';
  }
}
```

---

### Telegraphing Attacks

**Players must be able to react to enemy attacks.** The minimum reaction time is ~250ms (human reflex floor). For intentional gameplay, aim for 500–1000ms of wind-up.

| Attack type | Minimum wind-up | Telegraph cue |
|---|---|---|
| Melee strike | 500ms | Wind-up animation + exclamation mark |
| Projectile | 400ms | Aim indicator, glow on muzzle |
| Jump attack | 600ms | Crouch + shake before launch |
| Area explosion | 1000ms | Warning circle on ground |

```js
// Enemy attack state machine
startAttack() {
  this.state = 'windup';
  this.sprite.play('enemy-windup');        // visible wind-up animation
  this.scene.time.delayedCall(600, () => {
    if (this.state !== 'windup') return;   // interrupted check
    this.state = 'attacking';
    this.sprite.play('enemy-attack');
    this.dealDamage();
  });
}
```

**Golden rule:** if the player can't see it coming, it's not a challenge — it's a punishment.

---

### Projectile Design

| Parameter | Slow (easy) | Medium | Fast (hard) |
|---|---|---|---|
| Speed | 100–200 px/s | 250–350 px/s | 400–600 px/s |
| Gravity | 0 (homing arc) | 200 (arc) | 0 (straight) |
| Lifetime | 3–4s | 2–3s | 1.5–2s |
| Player warning | Large sprite | Medium sprite | Distinctive color |

**Design rules:**
- Slow projectiles with arc (gravity) → dodgeable by jumping
- Fast straight projectiles → dodgeable by timing/positioning, not reaction
- Never spawn projectiles directly on the player's position
- Limit simultaneous on-screen projectiles (3–5 per enemy max) to prevent unavoidable coverage

---

### Respawn Timing and Difficulty Scaling

**Enemy respawn options:**

| Strategy | Use case | Risk |
|---|---|---|
| No respawn (dead = gone) | Methodical clearing gameplay | World feels "solved" after first pass |
| Respawn on room re-entry | Metroidvania / room-based | Consistent challenge on revisit |
| Respawn on timer | Open-world exploration | Can create softlocks if timed poorly |
| Respawn on checkpoint | Linear platformer | Cleanest — predictable for player |

**Difficulty scaling approaches:**
- **Simple:** increase enemy speed and health by +10–20% per world/zone
- **Additive:** add more enemies per room at later zones
- **Behavioral:** introduce new enemy variants that use more complex patterns
- **Compound:** combine health, speed, and count scaling — use sparingly, can feel unfair

---

## Audio

### Positional Audio Feedback Priorities

Sound feedback is critical for game feel. Every physical interaction should have a sound cue. In priority order:

| Sound | Priority | Why |
|---|---|---|
| Jump | Critical | Confirms input registered |
| Land | Critical | Confirms safe landing; frames grounded state |
| Hurt / death | Critical | Communicates failure state |
| Collect pickup | High | Positive reinforcement |
| Attack / hit | High | Confirms action, communicates damage |
| Enemy alert | Medium | Telegraph incoming threat |
| Footsteps | Medium | Adds weight and presence |
| Ambient environment | Low | Atmosphere only |

**Land sound tip:** vary land sound by fall distance. Short fall = light tap; long fall = heavy thud. This requires tracking fall height:

```js
// Track y position when leaving ground
onLeaveGround() {
  this.fallStartY = this.sprite.y;
}

onLand() {
  const fallDist = this.sprite.y - this.fallStartY;
  if (fallDist > 200) {
    this.scene.sound.play('land-heavy');
  } else if (fallDist > 60) {
    this.scene.sound.play('land-medium');
  } else {
    this.scene.sound.play('land-soft');
  }
}
```

---

### Looping Music Tips

**Seamless loops are non-negotiable for background music.** An audible gap breaks immersion immediately.

- Edit music so the loop end sample matches the loop start (fade/crossfade in your audio editor)
- Use OGG Vorbis format for web — best compression/quality ratio, supported by all modern browsers
- Provide MP3 fallback for Safari compatibility:

```js
this.load.audio('bgm', ['assets/audio/bgm.ogg', 'assets/audio/bgm.mp3']);

// In create():
this.bgm = this.sound.add('bgm', { loop: true, volume: 0.4 });
this.bgm.play();

// Guard against re-playing on scene restart:
if (!this.bgm.isPlaying) {
  this.bgm.play();
}
```

**Volume mixing guidelines:**
- Music: 30–50% of max (`volume: 0.35`)
- SFX: 70–100% of max (`volume: 0.8`)
- UI sounds: 50–70% (`volume: 0.6`)

Music should never overpower SFX — players rely on SFX for gameplay feedback.

---

### Procedural SFX with Web Audio API

When you don't have SFX assets yet, generate placeholder sounds in code. These are surprisingly usable as final assets for simple platformers.

```js
// Utility: generate a simple jump beep
function playJumpSFX(audioContext) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.type = 'square';
  osc.frequency.setValueAtTime(300, audioContext.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);

  gain.gain.setValueAtTime(0.3, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);

  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + 0.2);
}

// Coin/collect SFX
function playCoinSFX(audioContext) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, audioContext.currentTime);
  osc.frequency.setValueAtTime(1320, audioContext.currentTime + 0.05);

  gain.gain.setValueAtTime(0.4, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);

  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + 0.15);
}
```

**Tools for placeholder audio:** bfxr.net, jsfxr (web), ChipTone — all free, export WAV/MP3.

---

## Progression

### Collectible Design Patterns

Collectibles serve multiple purposes. Define each collectible's role before placing it:

| Type | Purpose | Placement rule |
|---|---|---|
| Coins / gems | Currency, exploration reward | Sprinkled along natural path; detours reward extras |
| Health pickup | Risk/reward | Off the critical path; after difficult sections |
| Power-up | Gameplay expansion | Introduce in safe area; placed to demonstrate power |
| Key / unlock | Gating | Visible from gate; treasure hunt placement |
| Collectathon item (100%) | Completionist goal | One per hidden area; requires mastery to reach |

**The "line of coins" rule:** a trail of collectibles acts as a visual guide. Players follow them instinctively. Use this to guide players toward secrets or teach a safe path through a hazard.

**Coin vacuum radius:** at close range, collectibles should attract to the player rather than requiring pixel-perfect overlap. A 32–64px magnetic radius feels generous without being trivial.

```js
// Magnetic collection in update()
this.coins.getChildren().forEach(coin => {
  if (!coin.active) return;
  const dist = Phaser.Math.Distance.Between(coin.x, coin.y, player.x, player.y);

  if (dist < 32) {
    this.physics.overlap(player, coin, this.collectCoin, null, this);
  } else if (dist < 80) {
    // Magnetic pull
    this.physics.moveToObject(coin, player, 200);
  }
});
```

---

### Power-Up Design — Short Duration vs Permanent

| Type | Examples | Design considerations |
|---|---|---|
| Permanent (passive) | Double jump, wall jump, dash | Gate behind story/area; rebalances all subsequent content |
| Timed boost | Speed boost, invincibility star | 5–15 seconds; distinct visual/audio state; keep short to feel exciting |
| Consumable | Extra life, health refill | Single use; place after hard sections as relief valve |
| Stacking | Bigger shot, faster fire | Stack max 3–5 levels; visual feedback per tier |

**Design rules for permanent upgrades:**
- Test every prior level with the new power to ensure it doesn't trivialize earlier challenges
- Introduce the power in a no-risk sandbox immediately after gaining it
- Signal the upgrade clearly: fanfare, UI update, character visual change

**Timed boost rules:**
- Never let a timed boost expire mid-jump or mid-combat — give 1–2s of warning (flashing, sound warning)
- Duration should feel long enough to enjoy but short enough to create urgency

---

### Score Multipliers and Combos

Multipliers reward skilled play and create urgency. Common patterns:

**Combo chain (time-based):**
- Collect/hit something → start a timer (e.g., 3s)
- Each additional action before timer expires → multiply (×2, ×3, ×4…)
- Timer resets on each action; expires if player goes 3s without scoring
- Cap multiplier at ×8 or ×10 to prevent score inflation

```js
class ScoreSystem {
  constructor() {
    this.multiplier = 1;
    this.comboTimer = 0;
    this.COMBO_WINDOW = 3000; // ms
    this.MAX_MULTIPLIER = 8;
  }

  addScore(scene, basePoints) {
    const points = basePoints * this.multiplier;
    this.score += points;
    this.comboTimer = this.COMBO_WINDOW;       // reset window
    this.multiplier = Math.min(this.multiplier + 1, this.MAX_MULTIPLIER);

    scene.events.emit('score-update', this.score, this.multiplier);
    return points;
  }

  update(delta) {
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.multiplier = 1;                   // combo expired
        scene.events.emit('combo-break');
      }
    }
  }
}
```

**Display rules:**
- Show the current multiplier clearly near the score counter
- Flash the multiplier when it increases
- Play a distinct sound for each multiplier tier increase
- Show "+N pts" floating text at the collection point (not just at the HUD)

**Enemy bounce combo (classic Meat Boy / classic Mario variant):**
- Jump on enemy → bounce → if player jumps again before landing → combo multiplier
- This rewards aggressive aerial play and makes high-skill play visually spectacular
