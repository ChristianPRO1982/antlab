import { expect, test } from 'vitest';
import { Camera } from '../../src/camera.js';
import { SparseWorld } from '../../src/world.js';
import { ViewFraming, getBlackBounds } from '../../src/view-framing.js';

function scene(cells = [], ant = { x: 0, y: 0 }) {
  const world = new SparseWorld();
  for (const [x, y] of cells) world.setColor(x, y, 'black');
  return { world, ant };
}

function center(camera) {
  return camera.screenToWorld(camera.width / 2, camera.height / 2);
}

test('bornes des seules cases noires actuelles, sans mutation du monde', () => {
  const { world } = scene([
    [-12, 7],
    [9, -5],
    [0, 0],
  ]);
  const before = [...world.blackCells()];
  expect(getBlackBounds(world)).toEqual({
    minX: -12,
    minY: -5,
    maxX: 9,
    maxY: 7,
  });
  expect([...world.blackCells()]).toEqual(before);
  world.setColor(-12, 7, 'white');
  expect(getBlackBounds(world)).toEqual({
    minX: 0,
    minY: -5,
    maxX: 9,
    maxY: 0,
  });
  expect(getBlackBounds(new SparseWorld())).toBeNull();
});

test('centrage ponctuel du monde et de la fourmi sans changer le zoom', () => {
  const camera = new Camera(800, 600);
  const framing = new ViewFraming(camera);
  const current = scene([], { x: 20, y: -10 });
  camera.zoomAt(400, 300, 2);
  framing.select('ant', current);
  expect(center(camera)).toEqual({ x: 20.5, y: -9.5 });
  expect(camera.scale).toBe(64);
  expect(framing.mode).toBe('free');
  framing.select('origin', current);
  expect(center(camera)).toEqual({ x: 0.5, y: 0.5 });
  expect(camera.scale).toBe(64);
});

test('suivi de positions successives et exclusivité des modes', () => {
  const camera = new Camera(800, 600);
  const framing = new ViewFraming(camera);
  const current = scene([[50, 80]], { x: 4, y: -3 });
  framing.select('follow-ant', current);
  expect(framing.mode).toBe('ant');
  current.ant = { x: 8, y: -7 };
  framing.apply(current);
  expect(center(camera)).toEqual({ x: 8.5, y: -6.5 });
  expect(camera.scale).toBe(32);
  framing.select('ant', current);
  expect(framing.mode).toBe('ant');
  framing.select('world', current);
  expect(framing.mode).toBe('world');
  framing.select('world', current);
  expect(framing.mode).toBe('world');
  framing.select('ant', current);
  expect(framing.mode).toBe('free');
  framing.select('follow-ant', current);
  framing.select('origin', current);
  expect(framing.mode).toBe('free');
});

test('taille max inclut les carrés entiers et exclut origine et fourmi', () => {
  const camera = new Camera(800, 600);
  const framing = new ViewFraming(camera);
  const current = scene(
    [
      [-10, 20],
      [9, 24],
    ],
    { x: 1000000, y: -1000000 },
  );
  const before = [...current.world.blackCells()];
  framing.select('world', current);
  expect(center(camera)).toEqual({ x: 0, y: 22.5 });
  expect(camera.scale).toBeCloseTo(752 / 20, 10);
  expect(camera.worldToScreen(-10, 25).x).toBeCloseTo(24, 10);
  expect(camera.worldToScreen(10, 20).x).toBeCloseTo(776, 10);
  expect(camera.worldToScreen(-10, 25).y).toBeGreaterThanOrEqual(24);
  expect(camera.worldToScreen(10, 20).y).toBeLessThanOrEqual(576);
  expect([...current.world.blackCells()]).toEqual(before);
});

test('agrandissement, rétrécissement et disparition de la dernière case noire', () => {
  const camera = new Camera(800, 600);
  const framing = new ViewFraming(camera);
  const current = scene([[0, 0]]);
  framing.select('world', current);
  expect(camera.scale).toBe(160);
  current.world.setColor(9999, 9999, 'black');
  framing.apply(current);
  expect(camera.scale).toBeCloseTo(552 / 10000, 12);
  expect(camera.minimumScale).toBeCloseTo(552 / 10000, 12);
  current.world.setColor(9999, 9999, 'white');
  framing.apply(current);
  expect(camera.scale).toBe(160);
  current.world.setColor(0, 0, 'white');
  framing.apply(current);
  expect(center(camera)).toEqual({ x: 0.5, y: 0.5 });
  expect(camera.scale).toBe(32);
  expect(framing.mode).toBe('world');
  expect(current.world.blackCellCount).toBe(0);
});

test('la reprise manuelle sous un pixel ne saute pas à un pixel', () => {
  const camera = new Camera(800, 600);
  const framing = new ViewFraming(camera);
  const current = scene([
    [0, 0],
    [9999, 9999],
  ]);
  framing.select('world', current);
  const scale = camera.scale;
  framing.release();
  camera.zoomAt(123, 456, 2);
  expect(camera.scale).toBeCloseTo(scale * 2, 12);
  camera.zoomAt(123, 456, 0.0001);
  expect(camera.scale).toBeCloseTo(scale, 12);
  camera.moveBy(50, 50);
  const manuallyMoved = center(camera);
  framing.apply(current);
  expect(center(camera)).toEqual(manuallyMoved);
  expect(framing.mode).toBe('free');
});

test('redimensionnement : le cadrage actif utilise la nouvelle fenêtre', () => {
  const camera = new Camera(800, 600);
  const framing = new ViewFraming(camera);
  const current = scene([
    [0, 0],
    [0, 99],
  ]);
  framing.select('world', current);
  camera.resize(500, 300);
  framing.apply(current);
  expect(camera.scale).toBeCloseTo(252 / 100, 10);
  expect(framing.mode).toBe('world');
});

test('petite fenêtre : marge adaptée pour garder un cadrage positif', () => {
  const camera = new Camera(20, 20);
  const framing = new ViewFraming(camera);
  framing.select(
    'world',
    scene([
      [0, 0],
      [3, 0],
    ]),
  );
  expect(camera.scale).toBe(2.5);
  expect(camera.worldToScreen(0, 0).x).toBe(5);
  expect(camera.worldToScreen(4, 1).x).toBe(15);
});

test('erreurs numériques et choix invalides sans changement partiel', () => {
  const camera = new Camera(800, 600);
  const framing = new ViewFraming(camera);
  framing.select('follow-ant', scene([], { x: 5, y: 8 }));
  const before = center(camera);
  for (const operation of [
    () => framing.select('unknown', scene()),
    () => framing.select('ant', scene([], { x: NaN, y: 0 })),
    () => framing.select('world', scene([[Number.MAX_SAFE_INTEGER, 0]])),
    () =>
      framing.select(
        'world',
        scene([
          [-Number.MAX_SAFE_INTEGER, 0],
          [Number.MAX_SAFE_INTEGER, 0],
        ]),
      ),
  ]) {
    expect(operation).toThrow();
    expect(center(camera)).toEqual(before);
    expect(camera.scale).toBe(32);
    expect(camera.minimumScale).toBe(1);
    expect(framing.mode).toBe('ant');
  }
});
