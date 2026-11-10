import { coordinate } from './coordinates.js';

const OFFSETS = [
  { dx: 0, dy: 0, position: 'center' },
  { dx: 0, dy: 1, position: 'north' },
  { dx: 1, dy: 0, position: 'east' },
  { dx: 0, dy: -1, position: 'south' },
  { dx: -1, dy: 0, position: 'west' },
];

function residue(x, y) {
  // Réduire avant de combiner : x + 2*y peut dépasser les entiers sûrs.
  return ((((x % 5) + 2 * (y % 5)) % 5) + 5) % 5;
}

export function isCenter(x, y) {
  return residue(coordinate(x, 'x'), coordinate(y, 'y')) === 0;
}

export function getCellGeometry(x, y) {
  x = coordinate(x, 'x');
  y = coordinate(y, 'y');
  // Les cinq positions ont les résidus 0, 2, 1, 3 et 4 respectivement.
  const offset = OFFSETS[[0, 2, 1, 3, 4][residue(x, y)]];
  return {
    center: {
      x: coordinate(x - offset.dx, 'centre.x'),
      y: coordinate(y - offset.dy, 'centre.y'),
    },
    position: offset.position,
  };
}

export function getCrossCells(centerX, centerY) {
  const x = coordinate(centerX, 'centre.x');
  const y = coordinate(centerY, 'centre.y');
  if (!isCenter(x, y)) {
    throw new RangeError(
      'Les coordonnées ne désignent pas un centre de croix.',
    );
  }
  return OFFSETS.map(({ dx, dy }) => ({
    x: coordinate(x + dx, 'case.x'),
    y: coordinate(y + dy, 'case.y'),
  }));
}
