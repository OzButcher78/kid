// ════════════════════════════════════
//  HUD SCENE — overlaid UI (lives, score, power-up indicators)
// ════════════════════════════════════
class HUDScene extends Phaser.Scene {
  constructor() { super({ key: 'HUD' }); }
  init(data) { this.gs = data.gameScene; this.level = data.level || 1; }

  create() {
    const W = GAME_W;
    const CX = W / 2;

    // ── TOP BAR (lives + level + score) ─────────────────────────
    // Taller bar pushed down so nothing clips at the top edge
    this.add.rectangle(W / 2, 26, W, 52, 0x000000, 0.55);

    this.livesBar = this.add.image(14, 28, 'health-bar', this.livesToFrame(this.gs.lives))
      .setOrigin(0, 0.5).setScale(1.8);

    // Level indicator — centered, with padding from top
    this.add.text(W / 2, 12, 'LEVEL ' + this.level, {
      fontSize: '22px', fill: '#ffd700', fontFamily: '"Bangers", cursive', letterSpacing: 2,
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5, 0);

    // Score — bigger, right-aligned with breathing room
    this.scoreTxt = this.add.text(W - 16, 12, 'PUNKTE: 0', {
      fontSize: '20px', fill: '#ffffff', fontFamily: '"Bangers", cursive', letterSpacing: 1,
      stroke: '#000', strokeThickness: 3
    }).setOrigin(1, 0);

    // Track score for milestone animations
    this._lastAnimatedScore = 0;

    // ── CENTER POWER-UP INDICATORS (stacked, no overlap) ────────

    // Shield indicator
    this.shieldBg = this.add.graphics().setVisible(false).setDepth(10);
    this.shieldBg.fillStyle(0x000000, 0.6);
    this.shieldBg.fillRoundedRect(-70, -14, 140, 28, 8);
    this.shieldBg.lineStyle(1.5, 0xffd700, 0.7);
    this.shieldBg.strokeRoundedRect(-70, -14, 140, 28, 8);
    this.shieldIcon = this.add.text(CX, 66, 'SCHILD x3', {
      fontSize: '15px', fill: '#ffffff', fontFamily: '"Nunito", sans-serif', fontWeight: '800',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setVisible(false).setDepth(11);

    // Turbo bar
    this.turboContainer = this.add.container(CX, 88).setVisible(false).setDepth(10);
    this.turboGfx = this.add.graphics();
    this.turboContainer.add(this.turboGfx);
    this.turboLbl = this.add.text(0, -14, 'TURBO', {
      fontSize: '14px', fill: '#00ffff', fontFamily: '"Bangers", cursive',
      stroke: '#000000', strokeThickness: 2, letterSpacing: 1
    }).setOrigin(0.5);
    this.turboContainer.add(this.turboLbl);

    // Apple UI
    this.appleContainer = this.add.container(CX, 88).setVisible(false).setDepth(10);
    const appleBg = this.add.graphics();
    appleBg.fillStyle(0x000000, 0.65);
    appleBg.fillRoundedRect(-80, -14, 160, 30, 8);
    appleBg.lineStyle(1.5, 0xff6600, 0.8);
    appleBg.strokeRoundedRect(-80, -14, 160, 30, 8);
    this.appleContainer.add(appleBg);
    const spaceBadge = this.add.text(-68, -10, 'SPACE', {
      fontSize: '10px', fill: '#ffffff', fontFamily: '"Nunito", sans-serif', fontWeight: '800',
      backgroundColor: '#cc5500', padding: { x: 3, y: 2 }
    });
    this.appleContainer.add(spaceBadge);
    this.appleIcons = [];
    for (let i = 0; i < 3; i++) {
      const icon = this.add.sprite(10 + i * 28, 1, 'fruit-apple', 0).setScale(1.0);
      this.appleIcons.push(icon);
      this.appleContainer.add(icon);
    }

    // ── EVENT LISTENERS ──────────────────────────────────────────
    this.gs.events.on('livesChanged', n  => this.livesBar.setFrame(this.livesToFrame(n)));
    this.gs.events.on('shieldOn',  n  => { this.shieldIcon.setText('SCHILD x' + n); this.shieldIcon.setVisible(true); this.shieldBg.setVisible(true); this.layoutPowerups(); });
    this.gs.events.on('shieldHit', n => { this.shieldIcon.setText('SCHILD x' + n); });
    this.gs.events.on('shieldOff',    () => { this.shieldIcon.setVisible(false); this.shieldBg.setVisible(false); this.layoutPowerups(); });
    this.gs.events.on('speedOn',  ms => { this.startTurboBar(ms); this.layoutPowerups(); });
    this.gs.events.on('speedOff', ()  => { this.turboContainer.setVisible(false); this.layoutPowerups(); });
    this.gs.events.on('appleOn',  n   => { this.updateAppleUI(n); this.layoutPowerups(); });
    this.gs.events.on('appleCount', n => this.updateAppleUI(n));
    this.gs.events.on('appleOff',  ()  => { this.appleContainer.setVisible(false); this.layoutPowerups(); });

    // Score update loop with milestone animation
    this.time.addEvent({
      delay: 120, loop: true,
      callback: () => {
        if (!this.gs) return;
        const score = this.gs.score;
        this.scoreTxt.setText('PUNKTE: ' + score);
        // Animate every 500 points
        const milestone = Math.floor(score / 500);
        const lastMilestone = Math.floor(this._lastAnimatedScore / 500);
        if (milestone > lastMilestone && score > 0) {
          this.animateScore();
        }
        this._lastAnimatedScore = score;
      }
    });

    this.events.on('shutdown', () => {
      ['livesChanged','shieldOn','shieldHit','shieldOff','speedOn','speedOff','appleOn','appleCount','appleOff']
        .forEach(ev => this.gs.events.off(ev));
    });
  }

  animateScore() {
    // Pop + gold flash
    this.tweens.add({
      targets: this.scoreTxt,
      scaleX: 1.4, scaleY: 1.4,
      duration: 150, yoyo: true,
      onStart: () => this.scoreTxt.setStyle({ fill: '#ffd700' }),
      onComplete: () => this.scoreTxt.setStyle({ fill: '#ffffff' })
    });
  }

  layoutPowerups() {
    const CX = GAME_W / 2;
    let y = 66;
    if (this.shieldIcon.visible) {
      this.shieldIcon.setPosition(CX, y);
      this.shieldBg.setPosition(CX, y);
      y += 32;
    }
    if (this.turboContainer.visible) {
      this.turboContainer.setPosition(CX, y + 4);
      y += 32;
    }
    if (this.appleContainer.visible) {
      this.appleContainer.setPosition(CX, y + 4);
    }
  }

  livesToFrame(n) {
    return Math.min(7, Math.max(0, Math.round((5 - Math.min(n, 5)) * 1.4)));
  }

  updateAppleUI(count) {
    this.appleContainer.setVisible(count > 0);
    if (count <= 0) return;
    this.appleIcons.forEach((icon, i) => {
      if (i < count) {
        icon.setAlpha(1.0).clearTint();
      } else {
        icon.setAlpha(0.3).setTint(0x444444);
      }
    });
  }

  startTurboBar(duration) {
    this.turboContainer.setVisible(true);
    const started = this.time.now;
    const barW = 120, barH = 10;
    if (this._turboInterval) this._turboInterval.remove();
    this._turboInterval = this.time.addEvent({
      delay: 50, loop: true,
      callback: () => {
        const t = Math.max(0, 1 - (this.time.now - started) / duration);
        const g = this.turboGfx;
        g.clear();
        g.fillStyle(0x000000, 0.55);
        g.fillRoundedRect(-barW / 2, -barH / 2, barW, barH, 4);
        g.fillStyle(0x00ffff, 0.85);
        g.fillRoundedRect(-barW / 2, -barH / 2, barW * t, barH, 4);
        g.lineStyle(1, 0x00ffff, 0.5);
        g.strokeRoundedRect(-barW / 2, -barH / 2, barW, barH, 4);
        if (t <= 0) {
          this.turboContainer.setVisible(false);
          this._turboInterval.remove();
          this._turboInterval = null;
        }
      }
    });
  }
}
