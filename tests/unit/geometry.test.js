import { describe, expect, test } from 'vitest';
import {
  getCellGeometry,
  getCrossCells,
  isCenter,
} from '../../src/geometry.js';

describe('pavage en croix', () => {
  test.each([
    [0, 0, 0, 0, 'center'],
    [0, 1, 0, 0, 'north'],
    [1, 0, 0, 0, 'east'],
    [0, -1, 0, 0, 'south'],
    [-1, 0, 0, 0, 'west'],
    [-2, 1, -2, 1, 'center'],
    [-3, 1, -2, 1, 'west'],
    [2, -1, 2, -1, 'center'],
  ])('case (%i, %i)', (x, y, cx, cy, position) => {
    expect(getCellGeometry(x, y)).toEqual({
      center: { x: cx, y: cy },
      position,
    });
    expect(isCenter(x, y)).toBe(position === 'center');
  });

  test('croix ordonnée centre, nord, est, sud, ouest', () => {
    expect(getCrossCells(0, 0)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: -1, y: 0 },
    ]);
    expect(() => getCrossCells(1, 0)).toThrow(RangeError);
  });

  test('couverture sans trou ni chevauchement, y compris dans les négatifs', () => {
    // Oracle indépendant : énumérer les centres et leur voisinage avec une marge.
    const coverage = new Map();
    for (let y = -22; y <= 22; y++) {
      for (let x = -22; x <= 22; x++) {
        if ((x + 2 * y) % 5 !== 0) continue;
        for (const [dx, dy] of [
          [0, 0],
          [0, 1],
          [1, 0],
          [0, -1],
          [-1, 0],
        ]) {
          const key = `${x + dx},${y + dy}`;
          const owners = coverage.get(key) ?? [];
          owners.push({ x, y });
          coverage.set(key, owners);
        }
      }
    }
    for (let y = -20; y <= 20; y++) {
      for (let x = -20; x <= 20; x++) {
        const owners = coverage.get(`${x},${y}`);
        expect(owners).toHaveLength(1);
        expect(getCellGeometry(x, y).center).toEqual(owners[0]);
        expect(getCrossCells(owners[0].x, owners[0].y)).toContainEqual({
          x,
          y,
        });
      }
    }
  });

  test('congruences exactes près des limites numériques', () => {
    const max = Number.MAX_SAFE_INTEGER;
    for (const x of [max, max - 1, -max, -max + 1]) {
      for (const y of [max, max - 1, -max, -max + 1]) {
        const expected = (BigInt(x) + 2n * BigInt(y)) % 5n === 0n;
        expect(isCenter(x, y)).toBe(expected);
      }
    }
    expect(getCellGeometry(max, 0)).toEqual({
      center: { x: max - 1, y: 0 },
      position: 'east',
    });
    // Résidu 3 à (max, 1) : le centre (max, 2) reste représentable.
    expect(getCellGeometry(max, 1)).toEqual({
      center: { x: max, y: 2 },
      position: 'south',
    });
    // Résidu 4 à (max, 4) : propriétaire à x=max+1, hors domaine.
    expect(() => getCellGeometry(max, 4)).toThrow(RangeError);
    expect(() => getCellGeometry(-max, -4)).toThrow(RangeError);
    expect(() => getCrossCells(max, 2)).toThrow(RangeError);
  });

  test.each([undefined, null, '1', 1n, true, {}, []])(
    'refuse un type invalide : %s',
    (value) => {
      for (const fn of [isCenter, getCellGeometry, getCrossCells]) {
        expect(() => fn(value, 0)).toThrow(TypeError);
        expect(() => fn(0, value)).toThrow(TypeError);
      }
    },
  );

  test.each([NaN, Infinity, -Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1])(
    'refuse un nombre invalide : %s',
    (value) => {
      for (const fn of [isCenter, getCellGeometry, getCrossCells]) {
        expect(() => fn(value, 0)).toThrow(RangeError);
        expect(() => fn(0, value)).toThrow(RangeError);
      }
    },
  );

  test('normalise le zéro négatif et ne partage pas les objets retournés', () => {
    expect(Object.is(getCellGeometry(-0, -0).center.x, -0)).toBe(false);
    const cells = getCrossCells(0, 0);
    cells[0].x = 100;
    expect(getCrossCells(0, 0)[0]).toEqual({ x: 0, y: 0 });
  });
});
