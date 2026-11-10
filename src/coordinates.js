// Domaine discret commun à la géométrie et au monde, sans coercition implicite.
export function coordinate(value, name) {
  if (typeof value !== 'number') {
    throw new TypeError(`${name} doit être un nombre.`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${name} doit être un entier sûr JavaScript.`);
  }
  return value === 0 ? 0 : value;
}
