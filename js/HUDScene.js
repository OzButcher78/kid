// ════════════════════════════════════
//  HUD SCENE — overlaid UI (lives, score, power-up indicators)
// ════════════════════════════════════
class HUDScene extends Phaser.Scene {
  constructor() { super({ key: 'HUD' }); }
  init(data) { this.gs = data.gameScene; }

  create() {
    const W = GAME_W;
    const CX = W / 2;   // center X for power-up indicators

    // ── TOP BAR (lives + score) ─────────────────────────────────
    this.add.rectangle(W / 2, 22, W, 44, 0x000000, 0.52);

    this.livesBar = this.add.image(14, 22, 'health-bar', this.livesToFrame(3))
      .setOrigin(0, 0.5).setScale(1.8);

    this.scoreTxt = this.add.text(W - 14, 9, 'PUNKTE: 0', {
      fontSize: '16px', fill: '#ffffff', fontFamily: '"Bangers", cursive', letterSpacing: 1
    }).setOrigin(1, 0);

    // ── CENTER POWER-UP INDICATORS (stacked, no overlap) ────────
    // Each indicator is positioned relative to center-top of screen
    // They stack: shield at y=54, turbo at y=80, apple at y=106

    // Shield indicator — white on dark pill for readability
    this.shieldBg = this.add.graphics().setVisible(false).setDepth(10);
    this.shieldBg.fillStyle(0x000000, 0.6);
    this.shieldBg.fillRoundedRect(-70, -14, 140, 28, 8);
    this.shieldBg.lineStyle(1.5, 0xffd700, 0.7);
    this.shieldBg.strokeRoundedRect(-70, -14, 140, 28, 8);
    this.shieldIcon = this.add.text(CX, 58, 'SCHILD x3', {
      fontSize: '15px', fill: '#ffffff', fontFamily: '"Nunito", sans-serif', fontWeight: '800',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setVisible(false).setDepth(11);

    // Turbo bar — centered, wider
    this.turboContainer = this.add.container(CX, 80).setVisible(false).setDepth(10);
    this.turboGfx = this.add.graphics();
    this.turboContainer.add(this.turboGfx);
    this.turboLbl = this.add.text(0, -14, 'TURBO', {
      fontSize: '14px', fill: '#00ffff', fontFamily: '"Bangers", cursive',
      stroke: '#000000', strokeThickness: 2, letterSpacing: 1
    }).setOrigin(0.5);
    this.turboContainer.add(this.turboLbl);

    // Apple UI — centered
    this.appleContainer = this.add.container(CX, 80).setVisible(false).setDepth(10);
    const appleBg = this.add.graphics();
    appleBg.fillStyle(0x000000, 0.65);
    appleBg.fillRoundedRect(-68, -14, 136, 30, 8);
    appleBg.lineStyle(1.5, 0xff6600, 0.8);
    appleBg.strokeRoundedRect(-68, -14, 136, 30, 8);
    this.appleContainer.add(appleBg);
    const qBadge = this.add.text(-56, -10, 'SPACE', {
      fontSize: '11px', fill: '#ffffff', fontFamily: '"Nunito", sans-serif', fontWeight: '800',
      backgroundColor: '#cc5500', padding: { x: 4, y: 2 }
    });
    this.appleContainer.add(qBadge);
    this.appleIcons = [];
    for (let i = 0; i < 3; i++) {
      const icon = this.add.sprite(-20 + i * 30, 1, 'fruit-apple', 0).setScale(1.0);
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

    this.time.addEvent({
      delay: 120, loop: true,
      callback: () => { if (this.gs) this.scoreTxt.setText('PUNKTE: ' + this.gs.score); }
    });

    this.events.on('shutdown', () => {
      ['livesChanged','shieldOn','shieldHit','shieldOff','speedOn','speedOff','appleOn','appleCount','appleOff']
        .forEach(ev => this.gs.events.off(ev));
    });
  }

  // Dynamically stack visible power-up indicators below the top bar
  layoutPowerups() {
    const CX = GAME_W / 2;
    let y = 58;
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
        // Background
        g.fillStyle(0x000000, 0.55);
        g.fillRoundedRect(-barW / 2, -barH / 2, barW, barH, 4);
        // Fill
        g.fillStyle(0x00ffff, 0.85);
        g.fillRoundedRect(-barW / 2, -barH / 2, barW * t, barH, 4);
        // Border
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
