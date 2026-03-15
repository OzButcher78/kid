// ════════════════════════════════════
//  STORY SCENE — retro RPG-style intro cutscene
//  3 panels with sprites, speech bubbles, and typewriter text
//  Mandatory — no skipping, auto-advances on timers
// ════════════════════════════════════
class StoryScene extends Phaser.Scene {
  constructor() { super({ key: 'Story' }); }

  create() {
    const W = GAME_W, H = GAME_H;

    // Dark background
    this.add.tileSprite(0, 0, W, H, 'bgsheet', 0).setOrigin(0).setAlpha(0.4);
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6);

    this.step = -1;
    this.stepObjects = [];

    // Skip hint + skip on spacebar, any key, or tap
    const skipHint = this.add.text(W / 2, H - 16, 'LEERTASTE drücken zum Überspringen', {
      fontSize: '13px', fill: '#888888', fontFamily: '"Nunito", sans-serif', fontWeight: '700',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: skipHint, alpha: 0.4, duration: 800, yoyo: true, repeat: -1 });

    this._skipped = false;
    const doSkip = () => { if (!this._skipped) { this._skipped = true; this.startGame(); } };
    this.input.on('pointerdown', doSkip);
    this.input.keyboard.on('keydown', doSkip);

    // Start the sequence
    this.showNextStep();
  }

  showNextStep() {
    // Clean up previous step
    this.stepObjects.forEach(obj => obj.destroy());
    this.stepObjects = [];

    this.step++;
    if (this.step >= 3) {
      // Final pause then start game
      this.time.delayedCall(800, () => this.startGame());
      return;
    }

    const W = GAME_W, H = GAME_H;
    const CY = H / 2 + 20;

    switch (this.step) {
      case 0: this.showScene1(W, H, CY); break;
      case 1: this.showScene2(W, H, CY); break;
      case 2: this.showScene3(W, H, CY); break;
    }
  }

  // ── SCENE 1: Noah at home, excited (5s) ───────────────────────
  showScene1(W, H, CY) {
    const noah = this.add.sprite(W / 2, CY + 30, 'p-idle-0').setScale(3).play('p-idle');
    this.stepObjects.push(noah);

    const bx = W / 2 + 20, by = CY - 80;
    this.stepObjects.push(this.drawBubble(bx, by, 320, 60, 'down'));
    this.typewriter(bx, by, 'Endlich Ferien! Ab nach draußen!', {
      fontSize: '18px', fill: '#222222', fontFamily: '"Nunito", sans-serif', fontWeight: '800'
    }, 320);

    this.time.delayedCall(4500, () => this.showNextStep());
  }

  // ── SCENE 2: Mum blocks the door (7s) ────────────────────────
  showScene2(W, H, CY) {
    const mum = this.add.sprite(W / 3, CY + 30, 'e-idle-0').setScale(3).play('e-idle');
    this.stepObjects.push(mum);

    const bx1 = W / 3 + 30, by1 = CY - 80;
    this.stepObjects.push(this.drawBubble(bx1, by1, 340, 60, 'down'));
    this.typewriter(bx1, by1, 'STOPP! Du bleibst hier!', {
      fontSize: '17px', fill: '#cc0000', fontFamily: '"Nunito", sans-serif', fontWeight: '800'
    }, 340);

    const noah = this.add.sprite(W * 0.75, CY + 30, 'p-idle-0').setScale(3).play('p-walk');
    noah.setFlipX(false);
    this.stepObjects.push(noah);

    // Noah's reply after mum speaks
    this.time.delayedCall(2500, () => {
      if (this.step !== 1) return;
      const bx2 = W * 0.75 - 20, by2 = CY - 80;
      const bubble2 = this.drawBubble(bx2, by2, 220, 50, 'down');
      this.stepObjects.push(bubble2);
      this.typewriter(bx2, by2, 'Nein! Ich gehe!', {
        fontSize: '17px', fill: '#222222', fontFamily: '"Nunito", sans-serif', fontWeight: '800'
      }, 220);
      // Noah runs off screen
      this.tweens.add({ targets: noah, x: W + 60, duration: 1500, ease: 'Quad.In' });
    });

    this.time.delayedCall(6000, () => this.showNextStep());
  }

  // ── SCENE 3: Mum calls all the other mums (6s) ───────────────
  showScene3(W, H, CY) {
    const mum = this.add.sprite(W / 2, CY + 30, 'e-idle-0').setScale(3).play('e-idle').setTint(0xff8888);
    this.stepObjects.push(mum);

    const bx = W / 2 + 10, by = CY - 85;
    this.stepObjects.push(this.drawBubble(bx, by, 380, 60, 'down'));
    this.typewriter(bx, by, 'ALLE MÜTTER! Schnappt ihn euch!', {
      fontSize: '18px', fill: '#cc0000', fontFamily: '"Nunito", sans-serif', fontWeight: '800'
    }, 380);

    // Narrative text
    this.time.delayedCall(3000, () => {
      if (this.step !== 2) return;
      const narr = this.add.text(W / 2, H - 130, '...und so begann die Jagd.', {
        fontSize: '40px', fill: '#ffd700', fontFamily: '"Bangers", cursive',
        stroke: '#000', strokeThickness: 5, letterSpacing: 2
      }).setOrigin(0.5).setAlpha(0);
      this.stepObjects.push(narr);
      this.tweens.add({ targets: narr, alpha: 1, duration: 800 });
    });

    this.time.delayedCall(6000, () => this.showNextStep());
  }

  // ── HELPERS ───────────────────────────────────────────────────

  drawBubble(cx, cy, w, h, pointerDir) {
    const g = this.add.graphics();
    const x = cx - w / 2, y = cy - h / 2;
    g.fillStyle(0xffffff, 0.95);
    g.fillRoundedRect(x, y, w, h, 12);
    g.lineStyle(2, 0x333333, 0.6);
    g.strokeRoundedRect(x, y, w, h, 12);
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
