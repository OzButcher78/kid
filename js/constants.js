// ════════════════════════════════════
//  GAME CONSTANTS
// ════════════════════════════════════
const GAME_W  = 800;
const GAME_H  = 560;
const LEVEL_W = 5200;

// ── MOBILE / TOUCH DETECTION ────────────────────────────────────
// Strict check: must have touch AND be a small screen (rules out touch-capable laptops)
const IS_TOUCH = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0))
  && (window.matchMedia('(pointer: coarse)').matches);

// Shared touch input state — TouchControlsScene writes, GameScene reads
const TOUCH_INPUT = {
  left:  false,
  right: false,
  jump:  false,   // one-shot per press (rising edge)
  shoot: false,   // one-shot per press (rising edge)
};
