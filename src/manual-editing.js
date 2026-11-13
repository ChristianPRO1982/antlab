import { coordinate } from './coordinates.js';
export const EDIT_LIMIT = 100000;
export function cellsValidated(cells) {
  if (!Array.isArray(cells) || cells.length > EDIT_LIMIT)
    throw new RangeError('Maximum : 100 000 cases.');
  const unique = new Map();
  for (const cell of cells) {
    const x = coordinate(cell?.x, 'x');
    const y = coordinate(cell?.y, 'y');
    unique.set(`${x},${y}`, { x, y });
  }
  return [...unique.values()];
}
export function rectangleChanges(options) {
  if (!options || typeof options !== 'object')
    throw new TypeError('Rectangle invalide.');
  let { minX, maxX, minY, maxY, mode, probability = 50, seed = 1 } = options;
  for (const value of [minX, maxX, minY, maxY]) coordinate(value);
  [minX, maxX] = [Math.min(minX, maxX), Math.max(minX, maxX)];
  [minY, maxY] = [Math.min(minY, maxY), Math.max(minY, maxY)];
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  if (!Number.isSafeInteger(width * height) || width * height > EDIT_LIMIT)
    throw new RangeError('Maximum : 100 000 cases.');
  if (!['black', 'white', 'random'].includes(mode))
    throw new TypeError('Remplissage invalide.');
  if (!Number.isInteger(probability) || probability < 1 || probability > 99)
    throw new RangeError('Probabilité : 1 à 99 %.');
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295)
    throw new RangeError('Graine : entier de 0 à 4294967295.');
  let state = seed;
  function draw() {
    let value;
    do {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      value = (t ^ (t >>> 14)) >>> 0;
    } while (value >= 4294967200);
    return value % 100;
  }
  const changes = [];
  for (let row = 0; row < height; row++)
    for (let col = 0; col < width; col++)
      changes.push({
        x: minX + col,
        y: minY + row,
        color:
          mode === 'random' ? (draw() < probability ? 'black' : 'white') : mode,
      });
  return changes;
}
export function editingAllowed(status, options) {
  return (
    !['error', 'disposed'].includes(status) &&
    (status !== 'running' ||
      (options.batchDelayMs > 0 &&
        options.batchSize * 1000 <= 100 * options.batchDelayMs))
  );
}
