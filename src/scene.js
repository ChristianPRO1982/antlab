import { coordinate } from './coordinates.js';

function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError(`${name} doit être un objet.`);
}

export function createScene(snapshot) {
  object(snapshot, 'L’instantané');
  object(snapshot.ant, 'La fourmi');
  const { orientation } = snapshot.ant;
  if (!['north', 'east', 'south', 'west'].includes(orientation))
    throw new TypeError('Orientation de scène invalide.');
  const ant = Object.freeze({
    x: coordinate(snapshot.ant.x, 'fourmi.x'),
    y: coordinate(snapshot.ant.y, 'fourmi.y'),
    orientation,
  });
  const stepCount = coordinate(snapshot.stepCount, 'L’étape affichée');
  if (stepCount < 0)
    throw new RangeError('L’étape affichée doit être positive ou nulle.');
  if (!Array.isArray(snapshot.blackCells))
    throw new TypeError('Les cases noires doivent être un tableau.');
  const cells = snapshot.blackCells.map((cell) => {
    object(cell, 'Une case');
    return Object.freeze({
      x: coordinate(cell.x, 'case.x'),
      y: coordinate(cell.y, 'case.y'),
    });
  });
  // La vue ne dispose d'aucune opération d'écriture sur ce cache.
  const world = Object.freeze({
    blackCells: () => cells.values(),
    blackCellCount: cells.length,
  });
  return Object.freeze({ ant, stepCount, world });
}
