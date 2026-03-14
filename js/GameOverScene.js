// ════════════════════════════════════
//  GAME OVER SCENE — win/lose screen with scoreboard
// ════════════════════════════════════
class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOver' }); }
  init(d) {
    this.won   = d.won;
    this.score = d.score || 0;
    this.level = d.level || 1;
    this.nameSubmitted = false;
    this.playerName = '';
  }

  create() {
    const W = GAME_W, H = GAME_H;
    this.add.tileSprite(0, 0, W, H, 'bgsheet', 0).setOrigin(0);
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, this.won ? 0.4 : 0.65);

    if (this.won) {
      for (let i = 0; i < 50; i++) {
        const s = this.add.text(
          Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
          '*', { fontSize: `${Phaser.Math.Between(12, 28)}px`, fill: '#ffd700' }
        );
        this.tweens.add({ targets: s, alpha: 0.1, duration: Phaser.Math.Between(600, 1400), yoyo: true, repeat: -1 });
      }
    }

    this.add.text(W / 2, 50, this.won ? 'GEWONNEN!' : 'GAME OVER', {
      fontSize: '42px', fill: this.won ? '#ffd700' : '#ff4444',
      fontFamily: '"Bangers", cursive', stroke: '#000', strokeThickness: 5, letterSpacing: 3
    }).setOrigin(0.5);

    this.add.text(W / 2, 100, `PUNKTE: ${this.score}   |   LEVEL: ${this.level}`, {
      fontSize: '22px', fill: '#ffffff', fontFamily: '"Bangers", cursive', letterSpacing: 2
    }).setOrigin(0.5);

    // ── NAME INPUT ───────────────────────────────────────────────
    this.add.text(W / 2, 145, 'Dein Name für die Bestenliste:', {
      fontSize: '14px', fill: '#aaddff', fontFamily: '"Nunito", sans-serif', fontWeight: '700'
    }).setOrigin(0.5);

    // Build a simple on-screen name input (max 10 chars)
    this.playerName = '';
    this.nameText = this.add.text(W / 2, 175, '|', {
      fontSize: '24px', fill: '#ffffff', fontFamily: '"Nunito", sans-serif', fontWeight: '800',
      backgroundColor: '#222244', padding: { x: 60, y: 6 }
    }).setOrigin(0.5);

    // Blinking cursor
    this.tweens.add({ targets: this.nameText, alpha: 0.7, duration: 500, yoyo: true, repeat: -1 });

    // Keyboard input for name
    this.input.keyboard.on('keydown', (event) => {
      if (this.nameSubmitted) return;
      if (event.key === 'Backspace') {
        this.playerName = this.playerName.slice(0, -1);
      } else if (event.key === 'Enter' && this.playerName.length > 0) {
        this.submitScore();
        return;
      } else if (event.key.length === 1 && this.playerName.length < 10) {
        this.playerName += event.key;
      }
      this.nameText.setText(this.playerName.length > 0 ? this.playerName : '|');
    });

    // Submit button
    this.submitBtn = this.makeBtn(W / 2, 215, 'EINTRAGEN', '#2a6e2a', () => {
      if (this.playerName.length > 0) this.submitScore();
    });

    // ── SCOREBOARD ───────────────────────────────────────────────
    this.add.text(W / 2, 260, 'BESTENLISTE', {
      fontSize: '18px', fill: '#ffd700', fontFamily: '"Bangers", cursive',
      stroke: '#000', strokeThickness: 3, letterSpacing: 1
    }).setOrigin(0.5);

    this.boardY = 288;
    this.drawScoreboard();

    // ── BUTTONS ──────────────────────────────────────────────────
    this.makeBtn(W / 2 - 110, H - 50, 'NOCHMAL', this.won ? '#1e6e3a' : '#8b1a1a',
      () => { this.fade(() => this.scene.start('Game')); });
    this.makeBtn(W / 2 + 110, H - 50, 'HAUPTMENÜ', '#1a2a3a',
      () => { this.fade(() => this.scene.start('Menu')); });
  }

  submitScore() {
    if (this.nameSubmitted) return;
    this.nameSubmitted = true;

    // Save to localStorage
    const scores = this.getScores();
    scores.push({ name: this.playerName, score: this.score, level: this.level });
    scores.sort((a, b) => b.score - a.score);
    // Keep top 10
    if (scores.length > 10) scores.length = 10;
    try { localStorage.setItem('kid-scores', JSON.stringify(scores)); } catch(e) {}

    // Visual feedback
    this.nameText.setStyle({ fill: '#00ff88', backgroundColor: '#224422' });
    this.nameText.setText(this.playerName + ' ✓');
    if (this.submitBtn) this.submitBtn.setAlpha(0.4);

    // Redraw scoreboard
    this.drawScoreboard();
  }

  getScores() {
    try {
      const raw = localStorage.getItem('kid-scores');
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  }

  drawScoreboard() {
    // Clear previous entries
    if (this._boardTexts) this._boardTexts.forEach(t => t.destroy());
    this._boardTexts = [];

    const scores = this.getScores();
    const W = GAME_W;
    const startY = this.boardY;

    if (scores.length === 0) {
      const t = this.add.text(W / 2, startY + 10, 'Noch keine Einträge', {
        fontSize: '12px', fill: '#888888', fontFamily: '"Nunito", sans-serif', fontWeight: '700'
      }).setOrigin(0.5);
      this._boardTexts.push(t);
      return;
    }

    // Header
    const hdr = this.add.text(W / 2, startY, '#     NAME          PUNKTE   LEVEL', {
      fontSize: '11px', fill: '#aaaaaa', fontFamily: '"Nunito", sans-serif', fontWeight: '700'
    }).setOrigin(0.5);
    this._boardTexts.push(hdr);

    const maxShow = Math.min(scores.length, 8);
    for (let i = 0; i < maxShow; i++) {
      const s = scores[i];
      const rank = `${i + 1}.`.padEnd(4);
      const name = s.name.padEnd(14).slice(0, 14);
      const pts  = String(s.score).padStart(7);
      const lvl  = String(s.level).padStart(4);
      const isNew = (s.name === this.playerName && s.score === this.score && this.nameSubmitted);
      const t = this.add.text(W / 2, startY + 20 + i * 20, `${rank} ${name} ${pts}   ${lvl}`, {
        fontSize: '12px', fill: isNew ? '#00ff88' : '#dddddd',
        fontFamily: '"Nunito", sans-serif', fontWeight: isNew ? '800' : '700'
      }).setOrigin(0.5);
      this._boardTexts.push(t);
    }
  }

  fade(cb) {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(300, cb);
  }

  makeBtn(x, y, label, bg, cb) {
    const btn = this.add.text(x, y, '  ' + label + '  ', {
      fontSize: '18px', fill: '#fff', fontFamily: '"Bangers", cursive',
      backgroundColor: bg, padding: { x: 10, y: 6 }, letterSpacing: 2
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerover',  () => btn.setAlpha(0.8));
    btn.on('pointerout',   () => btn.setAlpha(1.0));
    btn.on('pointerdown',  cb);
    return btn;
  }
}
