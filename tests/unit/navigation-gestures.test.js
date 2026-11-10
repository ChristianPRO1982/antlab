import { expect, test } from 'vitest';
import { PointerGestures } from '../../src/navigation-gestures.js';
import { Camera } from '../../src/camera.js';

test('translation à un contact, identifiants inconnus et mouvements nuls', () => {
  const gesture = new PointerGestures();
  expect(gesture.begin(1, 10, 20)).toBe(true);
  expect(gesture.move(9, 30, 40)).toBeNull();
  expect(gesture.move(1, 10, 20)).toBeNull();
  expect(gesture.move(1, 40, 10)).toEqual({
    from: { x: 10, y: 20 },
    to: { x: 40, y: 10 },
    factor: 1,
  });
  gesture.end(1);
  expect(gesture.ids).toEqual([]);
  expect(gesture.move(1, 50, 50)).toBeNull();
});

test('deux contacts combinent translation et zoom autour du milieu', () => {
  const gesture = new PointerGestures();
  gesture.begin(1, 0, 0);
  gesture.begin(2, 100, 0);
  expect(gesture.move(2, 200, 0)).toEqual({
    from: { x: 50, y: 0 },
    to: { x: 100, y: 0 },
    factor: 2,
  });
  expect(gesture.begin(3, 999, 999)).toBe(false);
  expect(gesture.begin(2, 300, 300)).toBe(false);
  expect(gesture.move(3, 500, 500)).toBeNull();
  gesture.end(3);
  expect(gesture.ids).toEqual([1, 2]);
  gesture.end(1);
  expect(gesture.move(2, 210, 5)).toEqual({
    from: { x: 200, y: 0 },
    to: { x: 210, y: 5 },
    factor: 1,
  });
  gesture.clear();
  expect(gesture.ids).toEqual([]);
});

test('distances nulles, annulations et coordonnées invalides sans corruption', () => {
  const gesture = new PointerGestures();
  gesture.begin(1, 0, 0);
  gesture.begin(2, 0, 0);
  expect(gesture.move(2, 20, 0).factor).toBe(1);
  expect(gesture.move(2, 0, 0).factor).toBe(1);
  expect(() => gesture.move(1, NaN, 0)).toThrow();
  expect(gesture.move(1, 10, 0)).toEqual({
    from: { x: 0, y: 0 },
    to: { x: 5, y: 0 },
    factor: 1,
  });
  gesture.clear();
  expect(() => gesture.begin(1, Infinity, 0)).toThrow();
  expect(gesture.ids).toEqual([]);
});

test('caméra : transformation combinée atomique et ancrage même aux bornes de zoom', () => {
  const camera = new Camera(800, 600);
  const from = { x: 123, y: 456 };
  const to = { x: 150, y: 430 };
  const anchor = camera.screenToWorld(from.x, from.y);
  camera.panZoomAt(from, to, 2);
  expect(camera.scale).toBe(64);
  expect(camera.screenToWorld(to.x, to.y)).toEqual(anchor);
  const next = camera.screenToWorld(to.x, to.y);
  camera.panZoomAt(to, from, 1000);
  expect(camera.scale).toBe(160);
  expect(camera.screenToWorld(from.x, from.y).x).toBeCloseTo(next.x, 10);
  expect(camera.screenToWorld(from.x, from.y).y).toBeCloseTo(next.y, 10);
  const before = camera.screenToWorld(0, 0);
  for (const operation of [
    () => camera.panZoomAt(from, { x: Infinity, y: 0 }, 2),
    () => camera.panZoomAt(from, to, 0),
    () => camera.panZoomAt(from, { x: Number.MAX_SAFE_INTEGER, y: 0 }, 0.01),
  ]) {
    expect(operation).toThrow();
    expect(camera.screenToWorld(0, 0)).toEqual(before);
    expect(camera.scale).toBe(160);
    expect(camera.minimumScale).toBe(1);
  }
});
