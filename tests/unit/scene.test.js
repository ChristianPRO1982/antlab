import { expect, test, vi } from 'vitest';
import { createScene } from '../../src/scene.js';
import { drawPaving } from '../../src/renderer.js';
import { Camera } from '../../src/camera.js';

test('scène indépendante, cohérente et immuable pour le rendu', () => {
  const snapshot = {
    ant: { x: -2, y: -3, orientation: 'east' },
    stepCount: 12,
    blackCells: [{ x: -1, y: -3 }],
  };
  const scene = createScene(snapshot);
  snapshot.ant.x = 50;
  snapshot.blackCells[0].x = 50;
  snapshot.blackCells.push({ x: 40, y: 40 });
  expect(scene.ant).toEqual({ x: -2, y: -3, orientation: 'east' });
  expect(scene.stepCount).toBe(12);
  expect([...scene.world.blackCells()]).toEqual([{ x: -1, y: -3 }]);
  expect(() => {
    scene.ant.x = 10;
  }).toThrow(TypeError);
  expect(() => {
    [...scene.world.blackCells()][0].x = 10;
  }).toThrow(TypeError);
});

test('instantanés invalides refusés avant remplacement de scène', () => {
  const valid = {
    ant: { x: 0, y: 0, orientation: 'north' },
    stepCount: 0,
    blackCells: [],
  };
  for (const snapshot of [
    null,
    [],
    {},
    { ...valid, stepCount: -1 },
    { ...valid, stepCount: '0' },
    { ...valid, ant: { x: 0, y: 0, orientation: 'bad' } },
    { ...valid, blackCells: [null] },
    { ...valid, blackCells: [{ x: Infinity, y: 0 }] },
  ]) {
    expect(() => createScene(snapshot)).toThrow();
  }
});

test.each([
  ['north', 0],
  ['east', Math.PI / 2],
  ['south', Math.PI],
  ['west', (3 * Math.PI) / 2],
])(
  'Lanto orienté %s, taille conservée et dessin limité au champ visible',
  (orientation, angle) => {
    const context = Object.fromEntries(
      ['fillRect', 'save', 'restore', 'translate', 'rotate', 'drawImage'].map(
        (key) => [key, vi.fn()],
      ),
    );
    const camera = new Camera(800, 600);
    context.canvas = { width: 800, height: 600 };
    const world = {
      blackCells: () =>
        [
          { x: 0, y: 0 },
          { x: 1000000, y: 0 },
        ].values(),
    };
    const options = { gridMode: 'none', origin: false };
    const sprite = { complete: true, naturalWidth: 100 };
    drawPaving(context, camera, world, options, sprite, {
      x: 0,
      y: 0,
      orientation,
    });
    expect(context.fillRect).toHaveBeenCalledTimes(2); // Fond et une seule case noire.
    expect(context.translate).toHaveBeenCalledWith(400, 300);
    expect(context.rotate).toHaveBeenCalledWith(angle);
    expect(context.drawImage).toHaveBeenCalledWith(
      sprite,
      -14.4,
      -14.4,
      28.8,
      28.8,
    );
    expect(context.restore).toHaveBeenCalledOnce();
    context.drawImage.mockClear();
    drawPaving(context, camera, world, options, sprite, {
      x: 1000000,
      y: 0,
      orientation,
    });
    expect(context.drawImage).not.toHaveBeenCalled();
  },
);
