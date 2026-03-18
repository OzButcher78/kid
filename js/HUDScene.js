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
    const hbY = H - 24;
    this.add.rectangle(CX, hbY, 120, 24, 0x000000, 0.5).setDepth(10);
    this.livesBar = this.add.image(CX, hbY, 'health-bar', this.livesToFrame(this.gs.lives))
      .setOrigin(0.5).setScale(2.2).setDepth(11);
    // Crop to show only the top bar (green health), hiding the bottom bar (red)
    this.livesBar.setCrop(0, 0, 48, 16);

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

    // ── APPLE COUNT (bottom-right, always visible when > 0) ───────
    this.appleContainer = this.add.container(W - 80, H - 28).setVisible(false).setDepth(10);
    const appleBg = this.add.graphics();
    appleBg.fillStyle(0x000000, 0.6);
    appleBg.fillRoundedRect(-50, -14, 100, 28, 8);
    appleBg.lineStyle(1.5, 0xff6600, 0.8);
    appleBg.strokeRoundedRect(-50, -14, 100, 28, 8);
    this.appleContainer.add(appleBg);
    const spaceBadge = this.add.text(-42, -9, 'SPACE', {
      fontSize: '10px', fill: '#ffffff', fontFamily: '"Nunito", sans-serif', fontWeight: '800',
      backgroundColor: '#cc5500', padding: { x: 2, y: 1 }
    });
    this.appleContainer.add(spaceBadge);
    this.appleIcons = [];
    for (let i = 0; i < 3; i++) {
      const icon = this.add.sprite(10 + i * 22, 0, 'fruit-apple', 0).setScale(0.9);
      this.appleIcons.push(icon);
      this.appleContainer.add(icon);
    }

    // ── EVENT LISTENERS ──────────────────────────────────────────
    this.gs.events.on('livesChanged', n => this.livesBar.setFrame(this.livesToFrame(n)));

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

    this.gs.events.on('appleOn',    n => this.updateAppleUI(n));
    this.gs.events.on('appleCount', n => this.updateAppleUI(n));
    this.gs.events.on('appleOff',  () => this.appleContainer.setVisible(false));

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
       'appleOn','appleCount','appleOff']
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

  livesToFrame(n) {
    return Math.min(7, Math.max(0, Math.round((5 - Math.min(n, 5)) * 1.4)));
  }

  updateAppleUI(count) {
    this.appleContainer.setVisible(count > 0);
    if (count <= 0) return;
    this.appleIcons.forEach((icon, i) => {
      if (i < count) { icon.setAlpha(1.0).clearTint(); }
      else { icon.setAlpha(0.3).setTint(0x444444); }
    });
  }
}
