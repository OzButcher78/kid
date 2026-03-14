// ════════════════════════════════════
//  HUD SCENE — overlaid UI (lives, score, power-up indicators)
// ════════════════════════════════════
class HUDScene extends Phaser.Scene {
  constructor() { super({ key: 'HUD' }); }
  init(data) { this.gs = data.gameScene; }

  create() {
    const W = GAME_W;
    this.add.rectangle(W / 2, 22, W, 44, 0x000000, 0.52);

    // Health bar
    this.livesBar = this.add.image(14, 22, 'health-bar', this.livesToFrame(3))
      .setOrigin(0, 0.5).setScale(1.8);

    // Shield indicator
    this.shieldIcon = this.add.text(14, 38, 'SCHILD x3', {
      fontSize: '11px', fill: '#ffd700', fontFamily: '"Nunito", sans-serif', fontWeight: '800'
    }).setVisible(false);

    // Speed bar
    this.speedBar = this.createBar(115, 36, 0x00ffff, 'TURBO');

    // ── APPLE UI (BUG-004 redesign) ──────────────────────────────
    this.appleContainer = this.add.container(115, 30).setVisible(false).setDepth(5);
    // Dark pill background
    const appleBg = this.add.graphics();
    appleBg.fillStyle(0x000000, 0.65);
    appleBg.fillRoundedRect(-6, -10, 108, 24, 8);
    appleBg.lineStyle(1.5, 0xff6600, 0.8);
    appleBg.strokeRoundedRect(-6, -10, 108, 24, 8);
    this.appleContainer.add(appleBg);
    // Q key badge
    const qBadge = this.add.text(0, -8, 'Q', {
      fontSize: '12px', fill: '#ffffff', fontFamily: '"Bangers", cursive',
      backgroundColor: '#cc5500', padding: { x: 4, y: 1 }
    });
    this.appleContainer.add(qBadge);
    // 3 apple sprite indicators
    this.appleIcons = [];
    for (let i = 0; i < 3; i++) {
      const icon = this.add.sprite(30 + i * 24, 2, 'fruit-apple', 0).setScale(0.8);
      this.appleIcons.push(icon);
      this.appleContainer.add(icon);
    }

    // Score
    this.scoreTxt = this.add.text(W - 14, 9, 'PUNKTE: 0', {
      fontSize: '16px', fill: '#ffffff', fontFamily: '"Bangers", cursive', letterSpacing: 1
    }).setOrigin(1, 0);

    // ── EVENT LISTENERS ──────────────────────────────────────────
    this.gs.events.on('livesChanged', n  => this.livesBar.setFrame(this.livesToFrame(n)));
    this.gs.events.on('shieldOn',  n  => { this.shieldIcon.setText('SCHILD x' + n); this.shieldIcon.setVisible(true); });
    this.gs.events.on('shieldHit', n => { this.shieldIcon.setText('SCHILD x' + n); });
    this.gs.events.on('shieldOff',    () => this.shieldIcon.setVisible(false));
    this.gs.events.on('speedOn',  ms => this.startBar(this.speedBar, ms, 'TURBO'));
    this.gs.events.on('speedOff', ()  => this.speedBar.setVisible(false));
    this.gs.events.on('appleOn',  n   => this.updateAppleUI(n));
    this.gs.events.on('appleCount', n => this.updateAppleUI(n));
    this.gs.events.on('appleOff',  ()  => this.appleContainer.setVisible(false));

    this.time.addEvent({
      delay: 120, loop: true,
      callback: () => { if (this.gs) this.scoreTxt.setText('PUNKTE: ' + this.gs.score); }
    });

    this.events.on('shutdown', () => {
      ['livesChanged','shieldOn','shieldHit','shieldOff','speedOn','speedOff','appleOn','appleCount','appleOff']
        .forEach(ev => this.gs.events.off(ev));
    });
  }

  livesToFrame(n) {
    return Math.min(7, Math.max(0, Math.round((5 - Math.min(n, 5)) * 1.4)));
  }

  // BUG-004: redesigned apple UI with sprites
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

  createBar(x, y, color) {
    const g = this.add.graphics();
    g.bx = x; g.by = y; g.bc = color;
    return g.setVisible(false).setDepth(5);
  }

  startBar(bar, duration, label) {
    bar.setVisible(true);
    const started = this.time.now;
    const lbl = this.add.text(bar.bx, bar.by - 12, label, {
      fontSize: '11px', fill: '#ffffff', fontFamily: '"Nunito", sans-serif', fontWeight: '800'
    }).setDepth(6);
    const interval = this.time.addEvent({
      delay: 50, loop: true,
      callback: () => {
        const t = Math.max(0, 1 - (this.time.now - started) / duration);
        bar.clear();
        bar.fillStyle(0x000000, 0.5);
        bar.fillRect(bar.bx, bar.by, 90, 7);
        bar.fillStyle(bar.bc);
        bar.fillRect(bar.bx, bar.by, 90 * t, 7);
        if (t <= 0) { bar.setVisible(false); lbl.destroy(); interval.remove(); }
      }
    });
  }
}
