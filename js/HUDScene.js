// ════════════════════════════════════
//  HUD SCENE — overlaid UI (health bar center-bottom, power-ups, score)
// ════════════════════════════════════
class HUDScene extends Phaser.Scene {
  constructor() { super({ key: 'HUD' }); }
  init(data) { this.gs = data.gameScene; this.level = data.level || 1; }

  create() {
    const W = GAME_W, H = GAME_H;
    const CX = W / 2;

    // ── TOP BAR (level + score only) ──────────────────────────────
    this.add.rectangle(W / 2, 20, W, 40, 0x000000, 0.5);

    // Level indicator — centered
    this.add.text(CX, 8, 'LEVEL ' + this.level, {
      fontSize: '22px', fill: '#ffd700', fontFamily: '"Bangers", cursive', letterSpacing: 2,
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5, 0);

    // Score — right-aligned
    this.scoreTxt = this.add.text(W - 16, 8, 'PUNKTE: 0', {
      fontSize: '20px', fill: '#ffffff', fontFamily: '"Bangers", cursive', letterSpacing: 1,
      stroke: '#000', strokeThickness: 3
    }).setOrigin(1, 0);

    this._lastAnimatedScore = 0;

    // ── CENTER-BOTTOM: HEALTH BAR + BONUS PIPS ──────────────────
    const hbY = H - 22;
    const hbW = 160, hbH = 20;
    this.add.rectangle(CX, hbY, hbW + 8, hbH + 8, 0x000000, 0.5).setDepth(10);
    this.livesBarImg = this.add.image(CX, hbY, 'healthbar-bg')
      .setOrigin(0.5).setDisplaySize(hbW, hbH).setDepth(11);
    const frame = this.livesBarImg.frame;
    this._hbFullW = frame.width;
    this._hbFullH = frame.height;
    this._hbMaxLives = this.gs.lives;
    this.updateHealthBar(this.gs.lives);

    // Bonus pips (3 dots) — right of health bar
    this.bonusPips = this.add.graphics().setDepth(12);
    this._pipX = CX + hbW / 2 + 20;
    this._pipY = hbY;
    this.drawBonusPips(0);

    // Selected item name — big yellow text, right side of bottom bar
    this.selectedTxt = this.add.text(CX + hbW / 2 + 70, hbY, '', {
      fontSize: '16px', fill: '#ffd700', fontFamily: '"Bangers", cursive',
      stroke: '#000', strokeThickness: 3, letterSpacing: 1
    }).setOrigin(0, 0.5).setDepth(12);

    // Collected items list — left side of bottom bar, same style
    this.collectedTxt = this.add.text(CX - hbW / 2 - 10, hbY, '', {
      fontSize: '16px', fill: '#ffd700', fontFamily: '"Bangers", cursive',
      stroke: '#000', strokeThickness: 3, letterSpacing: 1
    }).setOrigin(1, 0.5).setDepth(12);

    // Switch hint
    this.switchHint = this.add.text(CX + hbW / 2 + 70, hbY + 14, '↓ wechseln', {
      fontSize: '9px', fill: '#aaaaaa', fontFamily: '"Nunito", sans-serif', fontWeight: '700',
      stroke: '#000', strokeThickness: 1
    }).setOrigin(0, 0.5).setDepth(12).setVisible(false);

    // ── ACTIVE POWER-UP INDICATOR (top-left) ──────────────────────
    this.activePowerBg = this.add.graphics().setVisible(false).setDepth(10);
    this.activePowerBg.fillStyle(0x000000, 0.6);
    this.activePowerBg.fillRoundedRect(-80, -16, 160, 32, 8);
    this.activePowerBg.lineStyle(1.5, 0xffd700, 0.7);
    this.activePowerBg.strokeRoundedRect(-80, -16, 160, 32, 8);
    this.activePowerBg.setPosition(14 + 80, 60);

    this.activePowerTxt = this.add.text(94, 60, '', {
      fontSize: '14px', fill: '#ffffff', fontFamily: '"Nunito", sans-serif', fontWeight: '800',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setVisible(false).setDepth(11);

    // Timer bar for active power-up
    this.powerTimerGfx = this.add.graphics().setDepth(11);
    this.powerTimerStart = 0;
    this.powerTimerDuration = 0;

    // ── QUEUED POWER-UPS (small text below active) ───────────────
    this.queueTxt = this.add.text(94, 84, '', {
      fontSize: '11px', fill: '#aaaaaa', fontFamily: '"Nunito", sans-serif', fontWeight: '700',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setVisible(false).setDepth(11);

    // ── EVENT LISTENERS ──────────────────────────────────────────
    this.gs.events.on('livesChanged', n => this.updateHealthBar(n));

    this.gs.events.on('activePower', (name, duration) => {
      this.activePowerTxt.setText(name).setVisible(true);
      this.activePowerBg.setVisible(true);
      this.powerTimerStart = this.time.now;
      this.powerTimerDuration = duration;
    });
    this.gs.events.on('activePowerOff', () => {
      this.activePowerTxt.setVisible(false);
      this.activePowerBg.setVisible(false);
      this.powerTimerDuration = 0;
      this.powerTimerGfx.clear();
    });
    this.gs.events.on('queueUpdate', (names) => {
      if (names.length > 0) {
        this.queueTxt.setText('Nächste: ' + names.join(', ')).setVisible(true);
      } else {
        this.queueTxt.setVisible(false);
      }
    });

    this.gs.events.on('shieldOn', n => {
      this.activePowerTxt.setText('SCHILD x' + n).setVisible(true);
      this.activePowerBg.setVisible(true);
      this.powerTimerDuration = 0;
      this.powerTimerGfx.clear();
    });
    this.gs.events.on('shieldHit', n => this.activePowerTxt.setText('SCHILD x' + n));
    this.gs.events.on('shieldOff', () => {
      this.activePowerTxt.setVisible(false);
      this.activePowerBg.setVisible(false);
      this.powerTimerGfx.clear();
    });

    // Item inventory update — shows selected item + pips + collected list
    this.gs.events.on('itemUpdate', (data) => {
      // Pips show count of selected item
      this.drawBonusPips(data.count);
      // Selected item name (right of pips)
      if (data.label) {
        this.selectedTxt.setText(data.label + ' x' + data.count);
        this.switchHint.setVisible(data.slots.length > 1);
      } else {
        this.selectedTxt.setText('');
        this.switchHint.setVisible(false);
      }
      // Collected items list (left of health bar)
      const labels = { apple: 'ÄPFEL', banana: 'BANANE', dash: 'DASH', teleport: 'TELEPORT' };
      const list = data.slots.map((s, i) => {
        const name = labels[s.type] || s.type.toUpperCase();
        return i === data.selected ? `▶${name}` : name;
      });
      this.collectedTxt.setText(list.join('  '));
    });

    // Score update loop with milestone animation
    this.time.addEvent({
      delay: 120, loop: true,
      callback: () => {
        if (!this.gs) return;
        const score = this.gs.score;
        this.scoreTxt.setText('PUNKTE: ' + score);
        const milestone = Math.floor(score / 500);
        const lastMilestone = Math.floor(this._lastAnimatedScore / 500);
        if (milestone > lastMilestone && score > 0) this.animateScore();
        this._lastAnimatedScore = score;
      }
    });

    // Power timer bar update
    this.time.addEvent({
      delay: 50, loop: true,
      callback: () => {
        if (this.powerTimerDuration <= 0) return;
        const t = Math.max(0, 1 - (this.time.now - this.powerTimerStart) / this.powerTimerDuration);
        const g = this.powerTimerGfx;
        const bx = 14, by = 76, bw = 160, bh = 6;
        g.clear();
        g.fillStyle(0x000000, 0.4);
        g.fillRoundedRect(bx, by, bw, bh, 3);
        g.fillStyle(0x00ff88, 0.8);
        g.fillRoundedRect(bx, by, bw * t, bh, 3);
        if (t <= 0) { this.powerTimerDuration = 0; g.clear(); }
      }
    });

    this.events.on('shutdown', () => {
      ['livesChanged','activePower','activePowerOff','queueUpdate',
       'shieldOn','shieldHit','shieldOff','itemUpdate']
        .forEach(ev => this.gs.events.off(ev));
    });
  }

  animateScore() {
    this.tweens.add({
      targets: this.scoreTxt,
      scaleX: 1.4, scaleY: 1.4,
      duration: 150, yoyo: true,
      onStart: () => this.scoreTxt.setStyle({ fill: '#ffd700' }),
      onComplete: () => this.scoreTxt.setStyle({ fill: '#ffffff' })
    });
  }

  updateHealthBar(lives) {
    const frac = Math.max(0, Math.min(lives, this._hbMaxLives)) / this._hbMaxLives;
    const cropW = Math.round(this._hbFullW * frac);
    this.livesBarImg.setCrop(0, 0, cropW, this._hbFullH);
  }

  // Draw 3 pips: filled = available, empty outline = used
  drawBonusPips(count) {
    const g = this.bonusPips;
    g.clear();
    const r = 5, gap = 16;
    for (let i = 0; i < 3; i++) {
      const px = this._pipX + i * gap;
      const py = this._pipY;
      if (i < count) {
        // Filled pip — bright orange
        g.fillStyle(0xff8800, 1);
        g.fillCircle(px, py, r);
        g.lineStyle(1.5, 0xffd700, 1);
        g.strokeCircle(px, py, r);
      } else {
        // Empty pip — dark outline
        g.fillStyle(0x222222, 0.6);
        g.fillCircle(px, py, r);
        g.lineStyle(1.5, 0x666666, 0.5);
        g.strokeCircle(px, py, r);
      }
    }
  }
}
