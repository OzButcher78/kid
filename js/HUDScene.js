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

    // ── CENTER-BOTTOM HEALTH BAR ──────────────────────────────────
    // Health bar using healthbar.jpg — crop width based on lives
    const hbY = H - 22;
    const hbW = 160, hbH = 20;
    this.add.rectangle(CX, hbY, hbW + 8, hbH + 8, 0x000000, 0.5).setDepth(10);
    this.livesBarImg = this.add.image(CX, hbY, 'healthbar-bg')
      .setOrigin(0.5).setDisplaySize(hbW, hbH).setDepth(11);
    // Use texture frame dimensions (not display size) for crop calculations
    const frame = this.livesBarImg.frame;
    this._hbFullW = frame.width;
    this._hbFullH = frame.height;
    this._hbMaxLives = this.gs.lives;  // starting lives = full bar
    this.updateHealthBar(this.gs.lives);

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

    // ── QUEUED POWER-UPS (small icons below active) ───────────────
    this.queueTxt = this.add.text(94, 84, '', {
      fontSize: '11px', fill: '#aaaaaa', fontFamily: '"Nunito", sans-serif', fontWeight: '700',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setVisible(false).setDepth(11);

    // ── ITEM INDICATORS (next to health bar, using bonus-bars spritesheet) ──
    // bonus-bars: 128x24 frames. Rows of dot/bar indicators.
    // We use frames from the dot-style rows: frame 18=empty(0), 19=1dot, 20=2dots, 21=3dots
    const indY = hbY;
    const indScale = 0.7;

    // Apple indicator (right of health bar)
    this.appleBar = this.add.image(CX + hbW / 2 + 55, indY - 8, 'bonus-bars', 18)
      .setScale(indScale).setDepth(11).setVisible(false);
    this.appleLbl = this.add.text(CX + hbW / 2 + 55, indY + 6, '🍎', {
      fontSize: '10px', stroke: '#000', strokeThickness: 1
    }).setOrigin(0.5).setDepth(11).setVisible(false);

    // Banana indicator (further right)
    this.bananaBar = this.add.image(CX + hbW / 2 + 120, indY - 8, 'bonus-bars', 18)
      .setScale(indScale).setDepth(11).setVisible(false);
    this.bananaLbl = this.add.text(CX + hbW / 2 + 120, indY + 6, '🍌', {
      fontSize: '10px', stroke: '#000', strokeThickness: 1
    }).setOrigin(0.5).setDepth(11).setVisible(false);

    // Dash indicator (left of health bar)
    this.dashInd = this.add.text(CX - hbW / 2 - 40, indY, '💨', {
      fontSize: '16px', stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(11).setVisible(false);

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
      this.powerTimerDuration = 0; // shield has no timer, uses hits
      this.powerTimerGfx.clear();
    });
    this.gs.events.on('shieldHit', n => this.activePowerTxt.setText('SCHILD x' + n));
    this.gs.events.on('shieldOff', () => {
      this.activePowerTxt.setVisible(false);
      this.activePowerBg.setVisible(false);
      this.powerTimerGfx.clear();
    });

    this.gs.events.on('appleOn',    n => this.updateItemBar('apple', n));
    this.gs.events.on('appleCount', n => this.updateItemBar('apple', n));
    this.gs.events.on('appleOff',  () => { this.appleBar.setVisible(false); this.appleLbl.setVisible(false); });

    // Banana events
    this.gs.events.on('bananaOn',    n => this.updateItemBar('banana', n));
    this.gs.events.on('bananaCount', n => this.updateItemBar('banana', n));
    this.gs.events.on('bananaOff',  () => { this.bananaBar.setVisible(false); this.bananaLbl.setVisible(false); });

    // Dash event
    this.gs.events.on('dashOn',  () => this.dashInd.setVisible(true));
    this.gs.events.on('dashOff', () => this.dashInd.setVisible(false));

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
       'shieldOn','shieldHit','shieldOff',
       'appleOn','appleCount','appleOff',
       'bananaOn','bananaCount','bananaOff','dashOn','dashOff']
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

  // Map count (0-3) to bonus-bars frame: 18=empty, 19=1, 20=2, 21=3
  updateItemBar(type, count) {
    const frameBase = 18; // empty dots frame
    const frame = Math.min(frameBase + Math.max(0, count), 21);
    if (type === 'apple') {
      this.appleBar.setFrame(frame).setVisible(count > 0);
      this.appleLbl.setVisible(count > 0);
    } else if (type === 'banana') {
      this.bananaBar.setFrame(frame).setVisible(count > 0);
      this.bananaLbl.setVisible(count > 0);
    }
  }
}
