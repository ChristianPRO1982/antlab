import { coordinate } from './coordinates.js';

function cellKey(x, y) {
  return `${coordinate(x, 'x')},${coordinate(y, 'y')}`;
}

export class SparseWorld {
  #blackCells = new Set();

  get blackCellCount() {
    return this.#blackCells.size;
  }

  *blackCells() {
    for (const key of this.#blackCells) {
      const [x, y] = key.split(',').map(Number);
      yield { x, y };
    }
  }

  getColor(x, y) {
    return this.#blackCells.has(cellKey(x, y)) ? 'black' : 'white';
  }

  setColor(x, y, color) {
    const key = cellKey(x, y);
    if (color !== 'white' && color !== 'black') {
      throw new TypeError('La couleur doit être white ou black.');
    }
    if (color === 'black') this.#blackCells.add(key);
    else this.#blackCells.delete(key);
    return color;
  }

  toggleColor(x, y) {
    const key = cellKey(x, y);
    if (this.#blackCells.delete(key)) return 'white';
    this.#blackCells.add(key);
    return 'black';
  }
}
