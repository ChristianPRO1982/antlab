import { expect, test } from 'vitest';
import { SparseWorld } from '../../src/world.js';

test('monde blanc implicite et stockage des seules cases noires', () => {
  const world = new SparseWorld();
  expect(world.blackCellCount).toBe(0);
  expect(world.getColor(-1000000, 999999)).toBe('white');
  expect(world.setColor(1, -2, 'white')).toBe('white');
  expect(world.blackCellCount).toBe(0);
  expect(world.setColor(1, -2, 'black')).toBe('black');
  expect(world.getColor(1, -2)).toBe('black');
  world.setColor(1, -2, 'black');
  expect(world.blackCellCount).toBe(1);
  expect(world.setColor(1, -2, 'white')).toBe('white');
  expect(world.blackCellCount).toBe(0);
});

test('double inversion, coordonnées distinctes et instances indépendantes', () => {
  const world = new SparseWorld();
  for (const [x, y] of [
    [1, 23],
    [12, 3],
    [-1, 23],
    [1, -23],
    [Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER],
  ]) {
    expect(world.toggleColor(x, y)).toBe('black');
    expect(world.getColor(x, y)).toBe('black');
  }
  expect(world.blackCellCount).toBe(5);
  expect(world.toggleColor(1, 23)).toBe('white');
  expect(world.toggleColor(1, 23)).toBe('black');
  expect(world.blackCellCount).toBe(5);
  expect(new SparseWorld().blackCellCount).toBe(0);
  expect(() => {
    world.blackCellCount = 10;
  }).toThrow(TypeError);
});

test('zéros positif et négatif représentent la même case', () => {
  const world = new SparseWorld();
  world.setColor(-0, 0, 'black');
  expect(world.getColor(0, -0)).toBe('black');
  expect(world.toggleColor(0, 0)).toBe('white');
  expect(world.blackCellCount).toBe(0);
});

test('énumère uniquement les cases noires sans exposer le stockage', () => {
  const world = new SparseWorld();
  world.setColor(-2, 3, 'black');
  world.setColor(4, -5, 'black');
  world.setColor(10, 10, 'black');
  world.setColor(10, 10, 'white');
  expect([...world.blackCells()]).toEqual([
    { x: -2, y: 3 },
    { x: 4, y: -5 },
  ]);
  const [cell] = world.blackCells();
  cell.x = 100;
  expect(world.getColor(-2, 3)).toBe('black');
  expect(world.getColor(100, 3)).toBe('white');
  expect([...new SparseWorld().blackCells()]).toEqual([]);
});

test('entrées invalides refusées avant toute mutation', () => {
  const world = new SparseWorld();
  world.setColor(0, 0, 'black');
  for (const color of ['red', 0, null, undefined, true]) {
    expect(() => world.setColor(0, 0, color)).toThrow(TypeError);
  }
  for (const [value, error] of [
    ['0', TypeError],
    [NaN, RangeError],
    [Infinity, RangeError],
    [0.1, RangeError],
    [Number.MAX_SAFE_INTEGER + 1, RangeError],
  ]) {
    for (const [x, y] of [
      [value, 0],
      [0, value],
    ]) {
      expect(() => world.getColor(x, y)).toThrow(error);
      expect(() => world.setColor(x, y, 'white')).toThrow(error);
      expect(() => world.toggleColor(x, y)).toThrow(error);
    }
  }
  expect(world.getColor(0, 0)).toBe('black');
  expect(world.blackCellCount).toBe(1);
});
