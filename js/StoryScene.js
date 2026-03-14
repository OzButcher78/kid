// ════════════════════════════════════
//  STORY SCENE — retro RPG-style intro cutscene
//  3 panels with sprites, speech bubbles, and typewriter text
// ════════════════════════════════════
class StoryScene extends Phaser.Scene {
  constructor() { super({ key: 'Story' }); }

  create() {
    const W = GAME_W, H = GAME_H;

    // Dark background
    this.add.tileSprite(0, 0, W, H, 'bgsheet', 0).setOrigin(0).setAlpha(0.4);
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6);

    // Skip button (always visible)
    const skip = this.add.text(W - 20, 16, 'SKIP ▶', {
      fontSize: '16px', fill: '#888888', fontFamily: '"Nunito", sans-serif', fontWeight: '700'
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(50);
    skip.on('pointerdown', () => this.startGame());
    skip.on('pointerover', () => skip.setStyle({ fill: '#ffffff' }));
    skip.on('pointerout',  () => skip.setStyle({ fill: '#888888' }));

    // Track current step and objects to clean up
    this.step = -1;
    this.stepObjects = [];
    this.advancing = false;

    // Tap anywhere to advance (except skip button area)
    this.input.on('pointerdown', (ptr) => {
      if (ptr.x > W - 100 && ptr.y < 50) return; // skip button zone
      this.advance();
    });

    this.advance();
  }

  advance() {
    if (this.advancing) return;
    this.advancing = true;
    if (this._autoTimer) { this._autoTimer.remove(); this._autoTimer = null; }

    // Clean up previous step
    this.stepObjects.forEach(obj => obj.destroy());
    this.stepObjects = [];

    this.step++;
    if (this.step >= 3) {
      this.startGame();
      return;
    }

    // Small delay before showing next panel
    this.time.delayedCall(200, () => {
      this.showStep(this.step);
      this.advancing = false;
    });
  }

  showStep(n) {
    const W = GAME_W, H = GAME_H;
    const CY = H / 2 + 20;

    switch (n) {
      case 0: this.showScene1(W, H, CY); break;
      case 1: this.showScene2(W, H, CY); break;
      case 2: this.showScene3(W, H, CY); break;
    }

    // Auto-advance after 5 seconds
    this._autoTimer = this.time.delayedCall(5000, () => this.advance());
  }

  // ── SCENE 1: Noah at home, excited ────────────────────────────
  showScene1(W, H, CY) {
    // Noah sprite (large, center-left)
    const noah = this.add.sprite(W / 2, CY + 30, 'p-idle-0').setScale(3).play('p-idle');
    this.stepObjects.push(noah);

    // Speech bubble
    const bx = W / 2 + 20, by = CY - 80;
    this.stepObjects.push(this.drawBubble(bx, by, 320, 60, 'down'));
    this.typewriter(bx, by, 'Endlich Ferien! Ab nach draußen!', {
      fontSize: '18px', fill: '#222222', fontFamily: '"Nunito", sans-serif', fontWeight: '800'
    }, 320);

    // Tap hint
    const hint = this.add.text(W / 2, H - 30, '▶ Antippen zum Weitermachen', {
      fontSize: '12px', fill: '#666666', fontFamily: '"Nunito", sans-serif', fontWeight: '700'
    }).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });
    this.stepObjects.push(hint);
  }

  // ── SCENE 2: Mum blocks the door ─────────────────────────────
  showScene2(W, H, CY) {
    // Mum sprite (left side, large)
    const mum = this.add.sprite(W / 3, CY + 30, 'e-idle-0').setScale(3).play('e-idle');
    this.stepObjects.push(mum);

    // Mum speech bubble
    const bx1 = W / 3 + 30, by1 = CY - 80;
    this.stepObjects.push(this.drawBubble(bx1, by1, 340, 60, 'down'));
    this.typewriter(bx1, by1, 'STOPP! Du bleibst hier!', {
      fontSize: '17px', fill: '#cc0000', fontFamily: '"Nunito", sans-serif', fontWeight: '800'
    }, 340);

    // Noah running away (right side)
    const noah = this.add.sprite(W * 0.75, CY + 30, 'p-idle-0').setScale(3).play('p-walk');
    noah.setFlipX(false);
    this.stepObjects.push(noah);

    // Noah's reply appears after delay
    this.time.delayedCall(1800, () => {
      if (this.step !== 1) return;
      const bx2 = W * 0.75 - 20, by2 = CY - 80;
      const bubble2 = this.drawBubble(bx2, by2, 220, 50, 'down');
      this.stepObjects.push(bubble2);
      this.typewriter(bx2, by2, 'Nein! Tschüss Mama!', {
        fontSize: '17px', fill: '#222222', fontFamily: '"Nunito", sans-serif', fontWeight: '800'
      }, 220);
      // Noah runs off screen
      this.tweens.add({ targets: noah, x: W + 60, duration: 1500, ease: 'Quad.In' });
    });
  }

  // ── SCENE 3: Mum calls all the other mums ────────────────────
  showScene3(W, H, CY) {
    // Mum sprite (center, angry)
    const mum = this.add.sprite(W / 2, CY + 30, 'e-idle-0').setScale(3).play('e-idle').setTint(0xff8888);
    this.stepObjects.push(mum);

    // Mum on phone
    const bx = W / 2 + 10, by = CY - 85;
    this.stepObjects.push(this.drawBubble(bx, by, 380, 60, 'down'));
    this.typewriter(bx, by, 'ALLE MÜTTER! Schnappt ihn euch!', {
      fontSize: '18px', fill: '#cc0000', fontFamily: '"Nunito", sans-serif', fontWeight: '800'
    }, 380);

    // Narrative text after delay
    this.time.delayedCall(2500, () => {
      if (this.step !== 2) return;
      const narr = this.add.text(W / 2, H - 60, '...und so begann die Jagd.', {
        fontSize: '20px', fill: '#ffd700', fontFamily: '"Bangers", cursive',
        stroke: '#000', strokeThickness: 3, letterSpacing: 1
      }).setOrigin(0.5).setAlpha(0);
      this.stepObjects.push(narr);
      this.tweens.add({ targets: narr, alpha: 1, duration: 800 });
    });
  }

  // ── HELPERS ───────────────────────────────────────────────────

  drawBubble(cx, cy, w, h, pointerDir) {
    const g = this.add.graphics();
    const x = cx - w / 2, y = cy - h / 2;
    // White rounded rectangle
    g.fillStyle(0xffffff, 0.95);
    g.fillRoundedRect(x, y, w, h, 12);
    g.lineStyle(2, 0x333333, 0.6);
    g.strokeRoundedRect(x, y, w, h, 12);
    // Pointer triangle
    if (pointerDir === 'down') {
      g.fillStyle(0xffffff, 0.95);
      g.fillTriangle(cx - 10, y + h, cx + 10, y + h, cx, y + h + 16);
    }
    return g;
  }

  typewriter(cx, cy, text, style, maxW) {
    const txt = this.add.text(cx, cy, '', {
      ...style,
      wordWrap: { width: maxW - 20 }, align: 'center'
    }).setOrigin(0.5);
    this.stepObjects.push(txt);
    let i = 0;
    const timer = this.time.addEvent({
      delay: 35,
      repeat: text.length - 1,
      callback: () => { i++; txt.setText(text.slice(0, i)); }
    });
    this.stepObjects.push({ destroy: () => timer.remove() });
  }

  startGame() {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.time.delayedCall(400, () => this.scene.start('Game'));
  }
}
