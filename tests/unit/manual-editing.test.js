import { expect, test } from 'vitest';
import { LangtonEngine } from '../../src/engine.js';

test('édition sans transition, journal indépendant et rectangle reproductible', () => {
  const engine = new LangtonEngine();
  engine.toggleCells([{ x: -1, y: 2 }]);
  expect(engine.getProgress().stepCount).toBe(0);
  expect(engine.getState().ant).toEqual({ x: 0, y: 0, orientation: 'north' });
  expect(engine.getInterventions()).toHaveLength(1);
  const options = {
    minX: -2,
    maxX: 2,
    minY: -2,
    maxY: 2,
    mode: 'random',
    probability: 50,
    seed: 1,
  };
  engine.fillRectangle(options);
  const other = new LangtonEngine();
  other.fillRectangle(options);
  expect(engine.getState()).toEqual(other.getState());
});

test('rectangle excessif et coordonnées invalides refusés sans mutation', () => {
  const engine = new LangtonEngine();
  expect(() =>
    engine.fillRectangle({
      minX: 0,
      maxX: 100000,
      minY: 0,
      maxY: 0,
      mode: 'black',
    }),
  ).toThrow();
  expect(() =>
    engine.toggleCells([
      { x: 0, y: 0 },
      { x: NaN, y: 1 },
    ]),
  ).toThrow();
  expect(engine.getState().blackCells).toEqual([]);
});

test('rejeu exact et journal protégé', () => {
  const a = new LangtonEngine();
  a.advance(7);
  a.toggleCells([
    { x: -4, y: 2 },
    { x: -4, y: 2 },
  ]);
  a.fillRectangle({
    minX: 1,
    maxX: -2,
    minY: 0,
    maxY: 2,
    mode: 'random',
    seed: 42,
    probability: 99,
  });
  a.advance(20);
  const b = new LangtonEngine();
  for (const entry of a.getInterventions()) {
    b.advance(entry.stepCount - b.getProgress().stepCount);
    if (entry.type === 'toggle') b.toggleCells(entry.cells);
    else b.fillRectangle(entry.options);
  }
  b.advance(27 - b.getProgress().stepCount);
  expect(a.getState()).toEqual(b.getState());
  const copy = a.getInterventions();
  copy.length = 0;
  expect(a.getInterventions()).toHaveLength(2);
});

test('contrôleur : pause Maximum, tracé dédupliqué et vitesse interdite', async () => {
  const { ExecutionController } =
    await import('../../src/execution-controller.js');
  const c = new ExecutionController();
  await c.beginStroke(1);
  await c.extendStroke({ id: 1, cells: [{ x: 0, y: 0 }] });
  await c.extendStroke({ id: 1, cells: [{ x: 0, y: 0 }] });
  expect((await c.getState()).blackCells).toEqual([{ x: 0, y: 0 }]);
  await c.endStroke(1);
  await c.start();
  await expect(c.toggleCells([{ x: 1, y: 0 }])).rejects.toThrow(/100/);
  await c.pause();
  await c.toggleCells([{ x: 1, y: 0 }]);
  expect((await c.getProgress()).status).toBe('paused');
  await c.dispose();
});

test.each([1, 50, 99])(
  'tirage stable à %i pour cent et graine zéro',
  (probability) => {
    const a = new LangtonEngine(),
      b = new LangtonEngine();
    const options = {
      minX: -5,
      maxX: 5,
      minY: -5,
      maxY: 5,
      mode: 'random',
      probability,
      seed: 0,
    };
    a.fillRectangle(options);
    b.fillRectangle(options);
    expect(a.getState()).toEqual(b.getState());
    expect(a.getInterventions()[0].generator).toBe('mulberry32-v1');
  },
);

test('validation de remplissage avant écriture et opérations sans effet', () => {
  const a = new LangtonEngine();
  const options = { minX: 0, maxX: 0, minY: 0, maxY: 0, mode: 'white' };
  expect(a.fillRectangle(options).changedCellCount).toBe(0);
  expect(a.getProgress().editRevision).toBe(0);
  for (const invalid of [
    { seed: -1 },
    { seed: 4294967296 },
    { probability: 0 },
    { probability: 100 },
    { probability: 1.5 },
    { mode: 'bad' },
    { minX: Infinity },
  ]) {
    expect(() => a.fillRectangle({ ...options, ...invalid })).toThrow();
  }
  expect(a.getInterventions()).toEqual([]);
  expect(a.getState().blackCells).toEqual([]);
});

test('100 000 cases acceptées, tracé excessif atomiquement refusé', async () => {
  const { ExecutionController } =
    await import('../../src/execution-controller.js');
  const c = new ExecutionController();
  await c.beginStroke(4);
  const cells = Array.from({ length: 100000 }, (_, x) => ({ x, y: -1 }));
  await c.extendStroke({ id: 4, cells });
  await expect(
    c.extendStroke({ id: 4, cells: [{ x: 100000, y: -1 }] }),
  ).rejects.toThrow(/100/);
  expect((await c.getProgress()).blackCellCount).toBe(100000);
  expect((await c.getProgress()).stepCount).toBe(0);
  await c.dispose();
});

test('interventions entre lots et cible conservée', async () => {
  const { ExecutionController } =
    await import('../../src/execution-controller.js');
  const c = new ExecutionController({}, { batchSize: 1, batchDelayMs: 100 });
  const done = c.runUntil(1);
  const ack = await c.toggleCells([{ x: 0, y: 0 }]);
  expect(ack.stepCount).toBe(0);
  expect((await c.getProgress()).targetStep).toBe(1);
  await done;
  const reference = new LangtonEngine();
  reference.toggleCells([{ x: 0, y: 0 }]);
  reference.step();
  expect(await c.getState()).toEqual(reference.getState());
  await c.dispose();
});

test('vecteur Mulberry32 v1, graine 1, seuil 50', () => {
  const a = new LangtonEngine();
  a.fillRectangle({
    minX: 0,
    maxX: 9,
    minY: 0,
    maxY: 0,
    mode: 'random',
    probability: 50,
    seed: 1,
  });
  expect(a.getState().blackCells.map((c) => c.x)).toEqual([1, 3, 4, 7, 9]);
});

test('argument non clonable refusé avant toute écriture', () => {
  const a = new LangtonEngine();
  expect(() =>
    a.fillRectangle({
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      mode: 'black',
      extra: () => {},
    }),
  ).toThrow();
  expect(a.getState().blackCells).toEqual([]);
});

test.each([
  [1, 2, 3, 4],
  [2, 1, 3, 4],
  [1, 2, 4, 3],
  [2, 1, 4, 3],
])(
  'rectangle inclusif dans les quatre directions %j',
  (minX, maxX, minY, maxY) => {
    const a = new LangtonEngine();
    a.fillRectangle({ minX, maxX, minY, maxY, mode: 'black' });
    expect(a.getState().blackCells).toEqual([
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 1, y: 4 },
      { x: 2, y: 4 },
    ]);
  },
);
