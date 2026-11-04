// ============================================================
// RUCKUS RUGBY — keyboard + touch input
// ============================================================
import { clamp } from './utils.js';

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
  KeyJ: 'pass', KeyZ: 'pass',
  KeyK: 'kick', KeyX: 'kick',
  KeyL: 'tackle', KeyC: 'tackle', Space: 'tackle',
  KeyQ: 'switch',
  KeyE: 'offload',
  KeyR: 'tactic5',
  Digit1: 'tactic1', Digit2: 'tactic2', Digit3: 'tactic3', Digit4: 'tactic4',
  Escape: 'pause', KeyP: 'pause',
};

function isTyping(e) {
  const t = e.target;
  if (!t) return false;
  const tag = (t.tagName || '').toUpperCase();
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || t.isContentEditable;
}

export class InputManager {
  constructor() {
    this.kb = new Set();
    this.touch = new Set();
    this.edges = new Set();
    this.releases = new Set();
    this.touchVec = { x: 0, y: 0 };
    this.magnitude = 0;
    this.enabled = true;
    this.stickPointer = null;
    this.stickCenter = { x: 0, y: 0 };
    this.stickEls = null;
    this._bound = false;
    this.onPause = null;
  }

  attach() {
    if (this._bound) return;
    this._bound = true;
    window.addEventListener('keydown', (e) => {
      const action = KEYMAP[e.code];
      if (!action) return;
      if (isTyping(e)) return;
      if (action === 'up' || action === 'down' || action === 'left' || action === 'right' || action === 'tackle') {
        e.preventDefault();
      }
      if (!this.kb.has(action)) {
        this.kb.add(action);
        this.edges.add(action);
      }
      if (e.repeat) e.preventDefault();
    }, { passive: false });
    window.addEventListener('keyup', (e) => {
      const action = KEYMAP[e.code];
      if (!action) return;
      if (isTyping(e)) return;
      this.kb.delete(action);
      this.releases.add(action);
    });
    window.addEventListener('blur', () => {
      this.kb.clear();
      this.touch.clear();
      this.touchVec.x = 0;
      this.touchVec.y = 0;
      this.magnitude = 0;
      this.resetStickVisual();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.kb.clear();
        this.touch.clear();
        this.touchVec.x = 0;
        this.touchVec.y = 0;
        this.magnitude = 0;
        this.resetStickVisual();
      }
    });
    window.addEventListener('contextmenu', (e) => {
      if (document.body.classList.contains('touch-mode')) e.preventDefault();
    });
  }

  bindTouch(stickZone, stickKnob, buttonRoot, tacticRoot, onTactic) {
    this.stickEls = { zone: stickZone, knob: stickKnob };
    if (!stickZone) return;
    const updateStick = (clientX, clientY) => {
      const dx = clientX - this.stickCenter.x;
      const dy = clientY - this.stickCenter.y;
      const max = 46;
      const d = Math.hypot(dx, dy);
      const f = d > max ? max / d : 1;
      const nx = (dx * f) / max;
      const ny = (dy * f) / max;
      this.touchVec.x = nx;
      this.touchVec.y = ny;
      this.magnitude = clamp(d / max, 0, 1);
      if (stickKnob) stickKnob.style.transform = `translate(${nx * max}px, ${ny * max}px)`;
    };
    const start = (e) => {
      if (this.stickPointer !== null) return;
      this.stickPointer = e.pointerId;
      const rect = stickZone.getBoundingClientRect();
      this.stickCenter.x = rect.left + rect.width / 2;
      this.stickCenter.y = rect.top + rect.height / 2;
      updateStick(e.clientX, e.clientY);
      try { stickZone.setPointerCapture?.(e.pointerId); } catch { /* synthetic pointer */ }
      e.preventDefault();
    };
    const move = (e) => {
      if (e.pointerId !== this.stickPointer) return;
      updateStick(e.clientX, e.clientY);
      e.preventDefault();
    };
    const end = (e) => {
      if (e.pointerId !== this.stickPointer) return;
      this.stickPointer = null;
      this.touchVec.x = 0;
      this.touchVec.y = 0;
      this.magnitude = 0;
      this.resetStickVisual();
    };
    stickZone.addEventListener('pointerdown', start, { passive: false });
    stickZone.addEventListener('pointermove', move, { passive: false });
    stickZone.addEventListener('pointerup', end);
    stickZone.addEventListener('pointercancel', end);
    stickZone.addEventListener('lostpointercapture', end);

    const buttons = buttonRoot ? buttonRoot.querySelectorAll('[data-action]') : [];
    buttons.forEach((btn) => {
      const action = btn.dataset.action;
      const press = (e) => {
        e.preventDefault();
        btn.classList.add('down');
        if (!this.touch.has(action)) {
          this.touch.add(action);
          this.edges.add(action);
        }
        this.touch.add(action);
        try { btn.setPointerCapture?.(e.pointerId); } catch { /* synthetic pointer */ }
      };
      const release = (e) => {
        btn.classList.remove('down');
        this.touch.delete(action);
        this.releases.add(action);
      };
      btn.addEventListener('pointerdown', press, { passive: false });
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', (e) => {
        if (btn.classList.contains('down') && e.buttons === 0) release(e);
      });
    });

    if (tacticRoot) {
      // Delegate: the HUD rebuilds these buttons when loadouts change.
      tacticRoot.addEventListener('pointerdown', (e) => {
        const btn = e.target.closest('[data-tactic]');
        if (!btn) return;
        e.preventDefault();
        const i = Number(btn.dataset.tactic);
        if (!Number.isFinite(i)) return;
        this.edges.add(`tactic${i}`);
        if (onTactic) onTactic(i - 1);
      }, { passive: false });
    }
  }

  resetStickVisual() {
    if (this.stickEls?.knob) this.stickEls.knob.style.transform = 'translate(0px, 0px)';
  }

  down(action) {
    return this.kb.has(action) || this.touch.has(action);
  }

  pressed(action) {
    return this.edges.has(action);
  }

  released(action) {
    return this.releases.has(action);
  }

  axis() {
    let x = 0, y = 0;
    if (this.down('left')) x -= 1;
    if (this.down('right')) x += 1;
    if (this.down('up')) y -= 1;
    if (this.down('down')) y += 1;
    const d = Math.hypot(x, y);
    if (d > 0) {
      x /= d;
      y /= d;
    }
    if (this.magnitude > 0.12) {
      // slight deadzone / curve
      const m = Math.min(1, Math.pow(this.magnitude, 1.1) * 1.08);
      return { x: this.touchVec.x * m, y: this.touchVec.y * m, magnitude: m };
    }
    return { x, y, magnitude: d > 0 ? 1 : 0 };
  }

  endFrame() {
    this.edges.clear();
    this.releases.clear();
  }

  clear() {
    this.kb.clear();
    this.touch.clear();
    this.edges.clear();
    this.releases.clear();
    this.touchVec.x = 0;
    this.touchVec.y = 0;
    this.magnitude = 0;
    this.resetStickVisual();
  }
}

export const input = new InputManager();
