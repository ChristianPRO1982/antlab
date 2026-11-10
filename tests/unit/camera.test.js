import { expect, test } from 'vitest';
import { Camera } from '../../src/camera.js';

test('vue initiale et conversions écran/monde avec Y vers le haut', () => {
  const camera = new Camera(800, 600);
  expect(camera.scale).toBe(32);
  expect(camera.worldToScreen(0.5, 0.5)).toEqual({ x: 400, y: 300 });
  expect(camera.worldToScreen(1.5, 1.5)).toEqual({ x: 432, y: 268 });
  for (const [x, y] of [
    [0, 0],
    [-120.25, 3.75],
    [3000, -1234],
  ]) {
    const screen = camera.worldToScreen(x, y);
    expect(camera.screenToWorld(screen.x, screen.y)).toEqual({ x, y });
  }
});

test('le pavage suit le déplacement et le redimensionnement conserve le centre', () => {
  const camera = new Camera(800, 600);
  camera.moveBy(64, -32);
  expect(camera.worldToScreen(0.5, 0.5)).toEqual({ x: 464, y: 268 });
  expect(camera.screenToWorld(400, 300)).toEqual({ x: -1.5, y: -0.5 });
  camera.resize(1000, 800);
  expect(camera.screenToWorld(500, 400)).toEqual({ x: -1.5, y: -0.5 });
});

test('zoom ancré sous le pointeur, y compris aux bornes', () => {
  const camera = new Camera(800, 600);
  const anchor = camera.screenToWorld(123, 456);
  for (const factor of [2, 0.7, 1000, 1000, 0.000001, 0.1, 2]) {
    camera.zoomAt(123, 456, factor);
    const after = camera.screenToWorld(123, 456);
    expect(after.x).toBeCloseTo(anchor.x, 10);
    expect(after.y).toBeCloseTo(anchor.y, 10);
    expect(camera.scale).toBeGreaterThanOrEqual(1);
    expect(camera.scale).toBeLessThanOrEqual(160);
  }
});

test('dézoome jusqu’à un pixel par case et conserve le point visé', () => {
  const camera = new Camera(800, 600);
  const anchor = camera.screenToWorld(123, 456);
  camera.zoomAt(123, 456, 1 / 32);
  expect(camera.scale).toBe(1);
  expect(camera.screenToWorld(123, 456)).toEqual(anchor);
  camera.zoomAt(123, 456, 0.01);
  expect(camera.scale).toBe(1);
  expect(camera.screenToWorld(123, 456)).toEqual(anchor);
});

test('erreurs et dépassements de caméra sans changement partiel', () => {
  const camera = new Camera(800, 600);
  const before = camera.screenToWorld(0, 0);
  for (const operation of [
    () => camera.moveBy(Infinity, 0),
    () => camera.moveBy(Number.MAX_SAFE_INTEGER, 0),
    () => camera.zoomAt(100, 100, 0),
    () => camera.zoomAt(100, 100, NaN),
    () => camera.resize(0, 600),
    () => camera.resize(800, Infinity),
    () => camera.screenToWorld('0', 0),
    () => camera.worldToScreen(0, NaN),
  ]) {
    expect(operation).toThrow();
    expect(camera.screenToWorld(0, 0)).toEqual(before);
    expect(camera.scale).toBe(32);
  }
  const edge = new Camera(800, 600, { x: 2 ** 40 - 20, y: 0 });
  expect(() => edge.zoomAt(400, 300, 0.25)).toThrow(RangeError);
  expect(() => edge.resize(10000, 600)).toThrow(RangeError);
  expect(edge.scale).toBe(32);
  expect(edge.width).toBe(800);
});
