import { expect, test } from 'vitest';
import { PanelState } from '../../src/panel-state.js';

test('largeur initiale, limites, repli et restauration', () => {
  const panel = new PanelState();
  expect(panel.width).toBe(28);
  expect(panel.collapsed).toBe(false);
  panel.resize(42);
  panel.toggle();
  expect(panel.collapsed).toBe(true);
  panel.toggle();
  expect(panel.width).toBe(42);
  panel.resize(80);
  expect(panel.width).toBe(50);
  panel.resize(15);
  expect(panel.collapsed).toBe(false);
  panel.resize(14.9);
  expect(panel.collapsed).toBe(true);
  panel.toggle();
  expect(panel.width).toBe(15);
});

test('un clic bascule mais un glissement ne déclenche pas de clic supplémentaire', () => {
  const panel = new PanelState();
  panel.beginDrag(700);
  panel.endDrag(703, 1000);
  expect(panel.collapsed).toBe(true);
  panel.toggle();
  panel.beginDrag(700);
  panel.moveDrag(600, 1000);
  expect(panel.width).toBe(38);
  panel.endDrag(600, 1000);
  expect(panel.collapsed).toBe(false);
  expect(panel.width).toBe(38);
  panel.beginDrag(600);
  panel.endDrag(900, 1000);
  expect(panel.collapsed).toBe(true);
});

test('annulation du glissement et invalidité sans mutation', () => {
  const panel = new PanelState();
  panel.beginDrag(700);
  panel.moveDrag(500, 1000);
  panel.cancelDrag();
  expect(panel.width).toBe(28);
  expect(panel.collapsed).toBe(false);
  for (const value of [NaN, Infinity, '20']) {
    expect(() => panel.resize(value)).toThrow();
    expect(panel.width).toBe(28);
  }
  panel.beginDrag(700);
  expect(() => panel.moveDrag(600, 0)).toThrow();
  panel.cancelDrag();
});

test('clavier et états mobiles/ordinateur conservés indépendamment', () => {
  const panel = new PanelState();
  panel.nudge(2);
  expect(panel.width).toBe(30);
  panel.nudge(-2);
  expect(panel.width).toBe(28);
  panel.setMobile(true);
  expect(panel.collapsed).toBe(true);
  panel.toggle();
  expect(panel.collapsed).toBe(false);
  panel.setMobile(false);
  expect(panel.width).toBe(28);
  expect(panel.collapsed).toBe(false);
  panel.toggle();
  panel.setMobile(true);
  expect(panel.collapsed).toBe(false);
  panel.close();
  expect(panel.collapsed).toBe(true);
  panel.setMobile(false);
  expect(panel.collapsed).toBe(true);
  panel.nudge(2);
  expect(panel.collapsed).toBe(false);
});
