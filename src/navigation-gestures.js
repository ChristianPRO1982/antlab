function point(x, y) {
  if (typeof x !== 'number' || typeof y !== 'number')
    throw new TypeError('Position de pointeur invalide.');
  if (!Number.isFinite(x) || !Number.isFinite(y))
    throw new RangeError('Position de pointeur non finie.');
  return { x, y };
}

function measure(points) {
  const [a, b = a] = points;
  return {
    center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    distance: Math.hypot(b.x - a.x, b.y - a.y),
  };
}

export class PointerGestures {
  #points = new Map();
  get ids() {
    return [...this.#points.keys()];
  }
  begin(id, x, y) {
    if (this.#points.has(id) || this.#points.size === 2) return false;
    this.#points.set(id, point(x, y));
    return true;
  }
  move(id, x, y) {
    if (!this.#points.has(id)) return null;
    const next = point(x, y);
    const previous = this.#points.get(id);
    if (previous.x === x && previous.y === y) return null;
    const before = measure([...this.#points.values()]);
    this.#points.set(id, next);
    const after = measure([...this.#points.values()]);
    return {
      from: before.center,
      to: after.center,
      factor:
        before.distance > 0 && after.distance > 0
          ? after.distance / before.distance
          : 1,
    };
  }
  end(id) {
    this.#points.delete(id);
  }
  clear() {
    this.#points.clear();
  }
}
