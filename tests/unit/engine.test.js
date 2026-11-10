import { describe, expect, test, vi } from 'vitest';
import { LangtonEngine } from '../../src/engine.js';

test('départ standard et calcul de zéro transition', () => {
  const engine = new LangtonEngine();
  const initial = {
    ant: { x: 0, y: 0, orientation: 'north' },
    stepCount: 0,
    blackCells: [],
  };
  expect(engine.getState()).toEqual(initial);
  expect(engine.advance(0)).toBe(0);
  expect(engine.advance(-0)).toBe(0);
  expect(engine.getState()).toEqual(initial);
});

test('conditions personnalisées copiées, doublons noirs et instances indépendantes', () => {
  const ant = { x: -3, y: -2, orientation: 'west' };
  const blackCells = [
    { x: -3, y: -2 },
    { x: -3, y: -2 },
  ];
  const engine = new LangtonEngine({ ant, blackCells });
  const initial = engine.getState();
  expect(initial).toEqual({ ant, stepCount: 0, blackCells: [blackCells[0]] });
  ant.x = 100;
  blackCells[0].x = 100;
  blackCells.push({ x: 100, y: 100 });
  expect(engine.getState()).toEqual(initial);
  const state = engine.getState();
  state.ant.orientation = 'south';
  state.stepCount = 100;
  state.blackCells[0].y = 100;
  state.blackCells.push({ x: 100, y: 100 });
  expect(engine.getState()).toEqual(initial);
  const other = new LangtonEngine({
    ant: initial.ant,
    blackCells: initial.blackCells,
  });
  expect(engine.step()).toBe(1);
  expect(engine.getState()).toEqual({
    ant: { x: -3, y: -3, orientation: 'south' },
    stepCount: 1,
    blackCells: [],
  });
  expect(other.getState()).toEqual(initial);
  expect(initial.blackCells).toEqual([{ x: -3, y: -2 }]);
});

describe('couleur observée avant inversion, rotation puis déplacement', () => {
  test.each([
    ['white', 'north', 'east', 1, 0],
    ['white', 'east', 'south', 0, -1],
    ['white', 'south', 'west', -1, 0],
    ['white', 'west', 'north', 0, 1],
    ['black', 'north', 'west', -1, 0],
    ['black', 'east', 'north', 0, 1],
    ['black', 'south', 'east', 1, 0],
    ['black', 'west', 'south', 0, -1],
  ])('%s, %s → %s', (color, before, after, x, y) => {
    const engine = new LangtonEngine({
      ant: { x: 0, y: 0, orientation: before },
      blackCells: color === 'black' ? [{ x: 0, y: 0 }] : [],
    });
    expect(engine.step()).toBe(1);
    expect(engine.getState()).toEqual({
      ant: { x, y, orientation: after },
      stepCount: 1,
      blackCells: color === 'black' ? [] : [{ x: 0, y: 0 }],
    });
  });
});

test('cinq premiers pas connus et retour au blanc de la case visitée deux fois', () => {
  const engine = new LangtonEngine();
  const expected = [
    { x: 1, y: 0, orientation: 'east' },
    { x: 1, y: -1, orientation: 'south' },
    { x: 0, y: -1, orientation: 'west' },
    { x: 0, y: 0, orientation: 'north' },
    { x: -1, y: 0, orientation: 'west' },
  ];
  const visited = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: -1 },
    { x: 0, y: -1 },
  ];
  for (const [index, ant] of expected.entries()) {
    expect(engine.step()).toBe(index + 1);
    expect(engine.getState()).toEqual({
      ant,
      stepCount: index + 1,
      blackCells: index < 4 ? visited.slice(0, index + 1) : visited.slice(1),
    });
  }
});

test('un centre ne transforme que la case visitée et conserve les branches', () => {
  const branches = [
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];
  const engine = new LangtonEngine({ blackCells: branches });
  engine.step();
  expect(engine.getState().blackCells).toEqual([...branches, { x: 0, y: 0 }]);
});

test('même configuration, même séquence complète et mêmes données bit à bit', () => {
  const config = {
    ant: { x: -7, y: 3, orientation: 'south' },
    blackCells: [
      { x: -7, y: 3 },
      { x: -8, y: 3 },
      { x: 2, y: -4 },
    ],
  };
  const first = new LangtonEngine(config);
  const second = new LangtonEngine(config);
  for (let index = 0; index < 250; index++) {
    first.step();
    second.step();
    expect(JSON.stringify(first.getState())).toBe(
      JSON.stringify(second.getState()),
    );
  }
});

test.each([
  {},
  {
    ant: { x: -5, y: -3, orientation: 'east' },
    blackCells: [
      { x: -5, y: -3 },
      { x: 2, y: 7 },
    ],
  },
])(
  '10 000 pas identiques un par un, en un lot ou en lots successifs : %j',
  (config) => {
    const individual = new LangtonEngine(config);
    const batch = new LangtonEngine(config);
    const batches = new LangtonEngine(config);
    for (let index = 0; index < 10000; index++) individual.step();
    expect(batch.advance(10000)).toBe(10000);
    for (const count of [0, 1, 99, 2300, 0, 7600]) batches.advance(count);
    expect(batch.getState()).toEqual(individual.getState());
    expect(batches.getState()).toEqual(individual.getState());
  },
);

test('calcul sans DOM, horloge ou hasard', () => {
  const engine = new LangtonEngine();
  const unexpected = () => {
    throw new Error('Dépendance au temps ou au hasard.');
  };
  const spies = [
    vi.spyOn(Date, 'now').mockImplementation(unexpected),
    vi.spyOn(performance, 'now').mockImplementation(unexpected),
    vi.spyOn(Math, 'random').mockImplementation(unexpected),
  ];
  let count;
  try {
    count = engine.advance(100);
  } finally {
    for (const spy of spies) spy.mockRestore();
  }
  expect(typeof document).toBe('undefined');
  expect(typeof window).toBe('undefined');
  expect(count).toBe(100);
});

test('types de configuration, fourmi, orientation et liste noire invalides', () => {
  for (const value of [null, false, 1, 'north', []]) {
    expect(() => new LangtonEngine(value)).toThrow(TypeError);
    expect(() => new LangtonEngine({ ant: value })).toThrow(TypeError);
  }
  for (const orientation of [undefined, null, 0, 'N', 'North', '']) {
    expect(
      () => new LangtonEngine({ ant: { x: 0, y: 0, orientation } }),
    ).toThrow(TypeError);
  }
  for (const blackCells of [null, false, 1, '0,0', {}, new Set()]) {
    expect(() => new LangtonEngine({ blackCells })).toThrow(TypeError);
  }
  for (const cell of [null, false, 1, '0,0', []]) {
    expect(() => new LangtonEngine({ blackCells: [cell] })).toThrow(TypeError);
  }
});

test('coordonnées invalides refusées sans conversion implicite', () => {
  for (const value of [
    undefined,
    null,
    '1',
    1n,
    true,
    {},
    [],
    NaN,
    Infinity,
    -Infinity,
    0.5,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    const error = typeof value === 'number' ? RangeError : TypeError;
    for (const key of ['x', 'y']) {
      expect(
        () =>
          new LangtonEngine({
            ant: { x: 0, y: 0, orientation: 'north', [key]: value },
          }),
      ).toThrow(error);
      expect(
        () => new LangtonEngine({ blackCells: [{ x: 0, y: 0, [key]: value }] }),
      ).toThrow(error);
    }
  }
});

test('normalise le zéro négatif pour la fourmi et le monde', () => {
  const engine = new LangtonEngine({
    ant: { x: -0, y: -0, orientation: 'north' },
    blackCells: [{ x: -0, y: -0 }],
  });
  expect(engine.getState()).toEqual({
    ant: { x: 0, y: 0, orientation: 'north' },
    stepCount: 0,
    blackCells: [{ x: 0, y: 0 }],
  });
});

test('nombre de transitions invalide ou compteur final hors domaine : aucune mutation', () => {
  const engine = new LangtonEngine();
  engine.step();
  const before = engine.getState();
  for (const count of [
    undefined,
    null,
    '1',
    1n,
    true,
    {},
    [],
    -1,
    NaN,
    Infinity,
    0.5,
    Number.MAX_SAFE_INTEGER + 1,
    Number.MAX_SAFE_INTEGER,
  ]) {
    expect(() => engine.advance(count)).toThrow(
      typeof count === 'number' ? RangeError : TypeError,
    );
    expect(engine.getState()).toEqual(before);
  }
});

test.each([
  [Number.MAX_SAFE_INTEGER, 0, 'north'],
  [-Number.MAX_SAFE_INTEGER, 0, 'south'],
  [0, Number.MAX_SAFE_INTEGER, 'west'],
  [0, -Number.MAX_SAFE_INTEGER, 'east'],
])(
  'destination hors domaine depuis (%s, %s), %s : pas atomique',
  (x, y, orientation) => {
    const engine = new LangtonEngine({ ant: { x, y, orientation } });
    const before = engine.getState();
    expect(() => engine.step()).toThrow(RangeError);
    expect(engine.getState()).toEqual(before);
    expect(() => engine.advance(1)).toThrow(RangeError);
    expect(engine.getState()).toEqual(before);
  },
);

test('une limite représentable est atteignable ; un lot conserve ses pas terminés', () => {
  const max = Number.MAX_SAFE_INTEGER;
  const edge = new LangtonEngine({
    ant: { x: max - 1, y: 0, orientation: 'north' },
  });
  edge.step();
  expect(edge.getState().ant).toEqual({ x: max, y: 0, orientation: 'east' });
  const engine = new LangtonEngine({
    ant: { x: max, y: 0, orientation: 'east' },
    blackCells: [{ x: max, y: -1 }],
  });
  expect(() => engine.advance(2)).toThrow(RangeError);
  expect(engine.getState()).toEqual({
    ant: { x: max, y: -1, orientation: 'south' },
    stepCount: 1,
    blackCells: [
      { x: max, y: -1 },
      { x: max, y: 0 },
    ],
  });
});
