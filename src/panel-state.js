function finite(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError('La dimension du panneau doit être un nombre fini.');
  }
}

// État d'interface uniquement : les largeurs sont des pourcentages de la fenêtre.
export class PanelState {
  #width = 28;
  #mobile;
  #closed = { desktop: false, mobile: true };
  #drag = null;

  constructor({ mobile = false } = {}) {
    this.setMobile(mobile);
  }
  get width() {
    return this.#width;
  }
  get mobile() {
    return this.#mobile;
  }
  get collapsed() {
    return this.#closed[this.#mobile ? 'mobile' : 'desktop'];
  }

  setMobile(mobile) {
    if (typeof mobile !== 'boolean')
      throw new TypeError('Mode mobile invalide.');
    this.cancelDrag();
    this.#mobile = mobile;
  }

  close() {
    this.#closed[this.#mobile ? 'mobile' : 'desktop'] = true;
  }
  toggle() {
    this.#closed[this.#mobile ? 'mobile' : 'desktop'] = !this.collapsed;
  }

  resize(percent) {
    finite(percent);
    if (percent < 15) {
      this.close();
      return;
    }
    this.#width = Math.min(50, percent);
    this.#closed[this.#mobile ? 'mobile' : 'desktop'] = false;
  }

  nudge(delta) {
    finite(delta);
    if (this.mobile) return;
    if (this.collapsed) {
      if (delta > 0) this.toggle();
      return;
    }
    this.resize(this.#width + delta);
  }

  beginDrag(x) {
    finite(x);
    this.#drag = {
      x,
      width: this.#width,
      collapsed: this.collapsed,
      moved: false,
    };
  }

  moveDrag(x, viewportWidth) {
    finite(x);
    finite(viewportWidth);
    if (viewportWidth <= 0)
      throw new RangeError('La fenêtre doit avoir une largeur positive.');
    if (!this.#drag) return;
    const delta = x - this.#drag.x;
    if (Math.abs(delta) >= 4) this.#drag.moved = true;
    if (this.#drag.moved && !this.mobile) {
      this.resize(
        (this.#drag.collapsed ? 0 : this.#drag.width) -
          (delta / viewportWidth) * 100,
      );
    }
  }

  endDrag(x, viewportWidth) {
    if (!this.#drag) return;
    this.moveDrag(x, viewportWidth);
    if (!this.#drag.moved) this.toggle();
    this.#drag = null;
  }

  cancelDrag() {
    if (!this.#drag) return;
    this.#width = this.#drag.width;
    this.#closed[this.#mobile ? 'mobile' : 'desktop'] = this.#drag.collapsed;
    this.#drag = null;
  }
}
