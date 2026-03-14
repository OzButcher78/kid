# 👦 Kid vs. Mütter – Plattformspiel

Ein 2D-Plattformspiel mit Phaser.js – gebaut für GitHub + Vercel Deployment.

---

## 📁 Projektstruktur

```
/
├── index.html              ← Das komplette Spiel
├── vercel.json             ← Vercel-Konfiguration
├── README.md               ← Diese Datei
└── assets/
    ├── character.png       ← Spieler-Spritesheet (224×544, 32×32/Frame)
    ├── NPC_OldWoman_01.png ← Gegner 1: Schuh-Werferin (288×288, 48×48/Frame)
    └── NPC_OldWoman_02.png ← Gegner 2: Stock-Kämpferin (288×288, 48×48/Frame)
```

---

## 🎮 Spielmechanik

### Steuerung
| Taste           | Aktion                  |
|----------------|--------------------------|
| ← → / A D      | Bewegen                  |
| Leertaste / ↑  | Springen (2× möglich!)   |

### Gegner
| Typ                  | Sprite           | Angriff                          |
|---------------------|------------------|----------------------------------|
| 🥿 Schuh-Werferin   | NPC_OldWoman_01  | Wirft Schuh (Projektil)          |
| 🪄 Stock-Kämpferin  | NPC_OldWoman_02  | Verfolgt Spieler, Nahkampf       |

**Tipp:** Auf Gegner draufspringen → Gegner besiegt + 100 Punkte!

### Bonus-Items
| Item  | Effekt                          | Dauer     |
|-------|---------------------------------|-----------|
| 🛡️   | Schild – nächsten Treffer blockt | einmalig |
| ⭐    | Stern – komplett unverwundbar    | 5 Sek.   |
| ❤️    | Herz – +1 Leben (max. 5)        | sofort   |
| 👟    | Stiefel – extra hoher Sprung    | 10 Sek.  |

---

## 🚀 Deployment auf Vercel

### Methode 1: GitHub → Vercel (empfohlen)
1. Diesen Ordner als GitHub-Repository pushen
2. Auf [vercel.com](https://vercel.com) anmelden
3. „New Project" → GitHub-Repo auswählen → „Deploy"
4. ✅ Fertig! Automatisches Deployment bei jedem `git push`

### Methode 2: Lokal testen
```bash
# Mit Python (kein Installation nötig)
python3 -m http.server 8080
# Dann im Browser: http://localhost:8080

# Oder mit Node.js
npx serve .
```

> ⚠️ **Wichtig:** Direkt `index.html` per Doppelklick öffnen funktioniert NICHT wegen Browser-Sicherheitsregeln für lokale Dateien. Immer einen lokalen Server benutzen!

---

## 🔧 Sprite-Anpassung

Falls die Animationen falsch aussehen, öffne `index.html` und suche nach:

```javascript
const CHAR = {
  frameW: 32, frameH: 32,
  idle:  { start: 0,  end: 3  },  // ← Zeilen-/Frame-Index anpassen
  walkR: { start: 35, end: 41 },
  jump:  { start: 14, end: 14 },
  hurt:  { start: 42, end: 43 },
};
```

**Hitboxen sichtbar machen** (zum Debuggen):
```javascript
arcade: { gravity: { y: 620 }, debug: true }  // false → true
```

---

## 🗺️ Level erweitern

Level-Plattformen sind in `buildLevel()` als Array definiert:
```javascript
const platData = [
  // [x, y, breite]
  [340, H-110, 180],
  // neue Plattform hinzufügen:
  [600, H-200, 150],
];
```

Neue Gegner in `spawnEnemies()`:
```javascript
// [x, y, typ, patrouille-Halbbreite]
[420, H-75, 'enemy1', 100],  // Schuh-Werferin
[820, H-75, 'enemy2', 80 ],  // Stock-Kämpferin
```

---

## 📦 Technologien

- **[Phaser 3](https://phaser.io/)** – Game Framework (via CDN, kein npm nötig)
- **Vanilla HTML/JS** – kein Build-Tool erforderlich
- **[Vercel](https://vercel.com)** – Hosting
- **[GitHub](https://github.com)** – Versionskontrolle
