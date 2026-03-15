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

    if (IS_TOUCH) {
      // Mobile: real DOM input overlaid on canvas so virtual keyboard activates
      this.nameText = this.add.text(W / 2, 175, 'Tippe hier ↓', {
        fontSize: '14px', fill: '#888888', fontFamily: '"Nunito", sans-serif', fontWeight: '700'
      }).setOrigin(0.5);

      this.domInput = document.createElement('input');
      this.domInput.type = 'text';
      this.domInput.maxLength = 10;
      this.domInput.placeholder = 'Dein Name...';
      this.domInput.autocomplete = 'off';
      this.domInput.autocapitalize = 'words';
      this.domInput.enterkeyhint = 'done';
      this.domInput.style.cssText =
        'position:fixed;z-index:10000;font-size:20px;font-family:"Nunito",sans-serif;font-weight:700;' +
        'text-align:center;width:220px;padding:12px 10px;border:3px solid #ffd700;' +
        'background:#222244;color:#fff;border-radius:10px;outline:none;' +
        'touch-action:auto;-webkit-user-select:text;user-select:text;' +
        'left:50%;transform:translateX(-50%);';
      document.body.appendChild(this.domInput);
      this.positionDomInput();

      // Auto-focus after a short delay (iOS needs this)
      this.time.delayedCall(500, () => {
        if (this.domInput) this.domInput.focus();
      });

      // Submit on Enter/Done key from virtual keyboard
      this.domInput.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          this.domInput.blur();
          this.playerName = this.domInput.value.slice(0, 10);
          if (this.playerName.length > 0) this.submitScore();
        }
      });

      this._resizeHandler = () => this.positionDomInput();
      window.addEventListener('resize', this._resizeHandler);
      // Also reposition when virtual keyboard opens/closes (iOS fires resize)
      window.visualViewport?.addEventListener('resize', this._resizeHandler);

      this.events.on('shutdown', () => {
        if (this.domInput) { this.domInput.remove(); this.domInput = null; }
        window.removeEventListener('resize', this._resizeHandler);
        window.visualViewport?.removeEventListener('resize', this._resizeHandler);
      });
    } else {
      // Desktop: Phaser text-based input
      this.nameText = this.add.text(W / 2, 175, '|', {
        fontSize: '24px', fill: '#ffffff', fontFamily: '"Nunito", sans-serif', fontWeight: '800',
        backgroundColor: '#222244', padding: { x: 60, y: 6 }
      }).setOrigin(0.5);
      this.tweens.add({ targets: this.nameText, alpha: 0.7, duration: 500, yoyo: true, repeat: -1 });
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
    }

    // Submit button
    this.submitBtn = this.makeBtn(W / 2, 215, 'EINTRAGEN', '#2a6e2a', () => {
      if (IS_TOUCH && this.domInput) this.playerName = this.domInput.value.slice(0, 10);
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

    // Auto-return to menu after 30s if no score submitted
    this._timeout = this.time.delayedCall(30000, () => {
      if (!this.nameSubmitted) this.fade(() => this.scene.start('Menu'));
    });
    // Countdown text
    this._countdownTxt = this.add.text(W / 2, H - 18, '', {
      fontSize: '11px', fill: '#666666', fontFamily: '"Nunito", sans-serif', fontWeight: '700'
    }).setOrigin(0.5);
    this._countdownStart = this.time.now;
    this.time.addEvent({ delay: 1000, loop: true, callback: () => {
      if (this.nameSubmitted) { this._countdownTxt.setVisible(false); return; }
      const left = Math.max(0, 30 - Math.floor((this.time.now - this._countdownStart) / 1000));
      this._countdownTxt.setText(`Hauptmenü in ${left}s...`);
    }});
  }

  positionDomInput() {
    if (!this.domInput) return;
    const rect = this.game.canvas.getBoundingClientRect();
    const scaleY = rect.height / GAME_H;
    // Position at ~30% from top of canvas, centered horizontally
    const topPos = rect.top + 165 * scaleY;
    // Clamp to visible viewport (important when iOS keyboard is open)
    const vvH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const maxTop = vvH - 60;
    this.domInput.style.top = Math.min(topPos, maxTop) + 'px';
  }

  submitScore() {
    if (this.nameSubmitted) return;
    // Read from DOM input on mobile
    if (IS_TOUCH && this.domInput) this.playerName = this.domInput.value.slice(0, 10);
    if (!this.playerName || this.playerName.length === 0) return;
    this.nameSubmitted = true;
    if (this._timeout) this._timeout.remove(); // cancel auto-return

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
