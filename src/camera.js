const MAX_SCALE = 160;
// Plus conservateur que le monde discret pour conserver une précision sous-pixel.
const VIEW_LIMIT = 2 ** 40;

function finite(value, name) {
  if (typeof value !== 'number')
    throw new TypeError(`${name} doit être un nombre.`);
  if (!Number.isFinite(value)) throw new RangeError(`${name} doit être fini.`);
  return value;
}

export class Camera {
  #x;
  #y;
  #scale;
  #width;
  #height;
  #minimumScale = 1;

  constructor(width, height, { x = 0.5, y = 0.5 } = {}) {
    this.#update(x, y, 32, width, height);
  }

  get scale() {
    return this.#scale;
  }
  get minimumScale() {
    return this.#minimumScale;
  }
  get width() {
    return this.#width;
  }
  get height() {
    return this.#height;
  }

  #update(x, y, scale, width, height) {
    for (const [name, value] of Object.entries({ x, y, scale, width, height }))
      finite(value, name);
    if (width <= 0 || height <= 0 || scale <= 0 || scale > MAX_SCALE) {
      throw new RangeError('Dimensions ou échelle de caméra invalides.');
    }
    if (
      Math.abs(x) + width / (2 * scale) + 3 > VIEW_LIMIT ||
      Math.abs(y) + height / (2 * scale) + 3 > VIEW_LIMIT
    ) {
      throw new RangeError('Limite numérique de navigation atteinte.');
    }
    this.#x = x;
    this.#y = y;
    this.#scale = scale;
    this.#width = width;
    this.#height = height;
    this.#minimumScale = Math.min(this.#minimumScale, scale);
  }

  screenToWorld(x, y) {
    return {
      x: this.#x + (finite(x, 'x écran') - this.#width / 2) / this.#scale,
      y: this.#y - (finite(y, 'y écran') - this.#height / 2) / this.#scale,
    };
  }

  worldToScreen(x, y) {
    return {
      x: this.#width / 2 + (finite(x, 'x monde') - this.#x) * this.#scale,
      y: this.#height / 2 - (finite(y, 'y monde') - this.#y) * this.#scale,
    };
  }

  moveBy(dx, dy) {
    this.#update(
      this.#x - finite(dx, 'dx') / this.#scale,
      this.#y + finite(dy, 'dy') / this.#scale,
      this.#scale,
      this.#width,
      this.#height,
    );
  }

  resize(width, height) {
    this.#update(this.#x, this.#y, this.#scale, width, height);
  }

  recenter() {
    this.#update(0.5, 0.5, this.#scale, this.#width, this.#height);
  }

  frame(x, y, scale = this.#scale) {
    this.#update(x, y, scale, this.#width, this.#height);
  }

  zoomAt(x, y, factor) {
    this.panZoomAt({ x, y }, { x, y }, factor);
  }

  panZoomAt(from, to, factor) {
    finite(factor, 'facteur de zoom');
    if (factor <= 0)
      throw new RangeError('Le facteur de zoom doit être positif.');
    const anchor = this.screenToWorld(from.x, from.y);
    const x = finite(to.x, 'x écran');
    const y = finite(to.y, 'y écran');
    const scale = Math.min(
      MAX_SCALE,
      Math.max(this.#minimumScale, this.#scale * factor),
    );
    this.#update(
      anchor.x - (x - this.#width / 2) / scale,
      anchor.y + (y - this.#height / 2) / scale,
      scale,
      this.#width,
      this.#height,
    );
  }
}
