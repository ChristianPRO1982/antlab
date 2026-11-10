import { describe, expect, test, vi } from 'vitest';
import { LangtonEngine } from '../../src/engine.js';

const rotation = 'rotate-branches-clockwise';
const configurations = [
  { central: 'single-flip', optional: [] },
  { central: 'cross-flip', optional: [] },
  { central: 'center-master', optional: [] },
  { central: 'inverted-majority', optional: [] },
  { central: 'majority-wins', optional: [] },
  { central: 'single-flip', optional: [rotation] },
];
const patterns = Array.from({ length: 32 }, (_, mask) =>
  Array.from({ length: 5 }, (_, index) => Boolean(mask & (1 << index))),
);

// Oracle géométrique explicite, indépendant du module utilisé par le moteur.
function crossAt(x, y) {
  return [
    { x, y },
    { x, y: y + 1 },
    { x: x + 1, y },
    { x, y: y - 1 },
    { x: x - 1, y },
  ];
}

function cellKeys(cells) {
  return cells.map(({ x, y }) => `${x},${y}`).sort();
}

for (const { x, y } of [
  { x: 0, y: 0 },
  { x: -3, y: -1 },
]) {
  describe(`transformations au centre (${x}, ${y}), sur tous les motifs`, () => {
    const cells = crossAt(x, y);
    const outside = { x: x + 7, y: y + 11 };
    const cases = [
      ['single-flip', [], (colors) => [!colors[0], ...colors.slice(1)]],
      ['cross-flip', [], (colors) => colors.map((black) => !black)],
      ['center-master', [], (colors) => Array(5).fill(!colors[0])],
      [
        'inverted-majority',
        [],
        (colors) => Array(5).fill(colors.filter(Boolean).length < 3),
      ],
      [
        'single-flip',
        [rotation],
        (colors) => [!colors[0], colors[4], colors[1], colors[2], colors[3]],
      ],
    ];
    for (const [central, optional, expectedColors] of cases) {
      test.each(patterns.map((colors, mask) => [mask, colors]))(
        `${central} ${optional.join()} motif %i`,
        (_mask, colors) => {
          const engine = new LangtonEngine({
            ant: { x, y, orientation: 'north' },
            blackCells: [...cells.filter((_, index) => colors[index]), outside],
            rules: { central, optional },
          });
          const result = expectedColors(colors);
          expect(engine.step()).toBe(1);
          const state = engine.getState();
          expect(state.ant).toEqual({
            x: x + (colors[0] ? -1 : 1),
            y,
            orientation: colors[0] ? 'west' : 'east',
          });
          expect(state.stepCount).toBe(1);
          expect(cellKeys(state.blackCells)).toEqual(
            cellKeys([...cells.filter((_, index) => result[index]), outside]),
          );
          if (optional.length) {
            const branches = new Set(cellKeys(cells.slice(1)));
            expect(
              state.blackCells.filter((cell) =>
                branches.has(`${cell.x},${cell.y}`),
              ),
            ).toHaveLength(colors.slice(1).filter(Boolean).length);
          }
        },
      );
    }
  });
}

test.each(configurations)(
  'branches : inversion seule pour %j, sur blanc et noir',
  (rules) => {
    const cells = crossAt(-3, -1);
    for (const visited of cells.slice(1)) {
      for (const isBlack of [false, true]) {
        const blackCells = isBlack
          ? cells
          : cells.filter((cell) => cell !== visited);
        const engine = new LangtonEngine({
          ant: { ...visited, orientation: 'east' },
          blackCells,
          rules,
        });
        engine.step();
        expect(engine.getState().ant).toEqual({
          x: visited.x,
          y: visited.y + (isBlack ? 1 : -1),
          orientation: isBlack ? 'north' : 'south',
        });
        expect(cellKeys(engine.getState().blackCells)).toEqual(
          cellKeys(isBlack ? cells.filter((cell) => cell !== visited) : cells),
        );
      }
    }
  },
);

test('ordre déterministe des écritures : centre, nord, est, sud, ouest', () => {
  const engine = new LangtonEngine({ rules: { central: 'cross-flip' } });
  engine.step();
  expect(engine.getState().blackCells).toEqual(crossAt(0, 0));
  const rotated = new LangtonEngine({
    blackCells: [
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ],
    rules: { optional: [rotation] },
  });
  rotated.step();
  expect(rotated.getState().blackCells).toEqual([
    { x: 0, y: 1 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ]);
});

test.each(configurations)(
  'répétabilité et 10 000 transitions pas à pas/en lots : %j',
  (rules) => {
    const initial = {
      ant: { x: -3, y: -1, orientation: 'south' },
      blackCells: [
        { x: -3, y: -1 },
        { x: -3, y: 0 },
        { x: 7, y: -2 },
      ],
      rules,
    };
    const individual = new LangtonEngine(initial);
    const repeated = new LangtonEngine(initial);
    const batch = new LangtonEngine(initial);
    const batches = new LangtonEngine(initial);
    for (let index = 0; index < 10000; index++) {
      individual.step();
      repeated.step();
      if (index < 100)
        expect(JSON.stringify(individual.getState())).toBe(
          JSON.stringify(repeated.getState()),
        );
    }
    expect(batch.advance(10000)).toBe(10000);
    for (const count of [0, 1, 99, 2300, 0, 7600]) batches.advance(count);
    expect(JSON.stringify(repeated.getState())).toBe(
      JSON.stringify(individual.getState()),
    );
    expect(batch.getState()).toEqual(individual.getState());
    expect(batches.getState()).toEqual(individual.getState());
  },
);

test.each(configurations)(
  'aucune dépendance à une horloge ou au hasard pour %j',
  (rules) => {
    const engine = new LangtonEngine({ rules });
    const forbidden = () => {
      throw new Error('Horloge ou hasard appelé.');
    };
    const spies = [
      vi.spyOn(Date, 'now').mockImplementation(forbidden),
      vi.spyOn(performance, 'now').mockImplementation(forbidden),
      vi.spyOn(Math, 'random').mockImplementation(forbidden),
    ];
    let count;
    try {
      count = engine.advance(100);
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
    expect(count).toBe(100);
    expect(typeof document).toBe('undefined');
  },
);

test.each(configurations)(
  'destination hors domaine : état intact pour %j',
  (rules) => {
    // (MAX_SAFE_INTEGER, 2) est un centre ; droite depuis north dépasse X.
    const engine = new LangtonEngine({
      ant: { x: Number.MAX_SAFE_INTEGER, y: 2, orientation: 'north' },
      rules,
    });
    const before = engine.getState();
    expect(() => engine.step()).toThrow(RangeError);
    expect(engine.getState()).toEqual(before);
  },
);

test.each(configurations.slice(1))(
  'croix hors domaine avec destination valide : état intact pour %j',
  (rules) => {
    const engine = new LangtonEngine({
      ant: { x: Number.MAX_SAFE_INTEGER, y: 2, orientation: 'west' },
      rules,
    });
    const before = engine.getState();
    expect(() => engine.step()).toThrow(RangeError);
    expect(engine.getState()).toEqual(before);
    expect(() => engine.advance(2)).toThrow(RangeError);
    expect(engine.getState()).toEqual(before);
  },
);

test('inversion simple : pas de calcul de croix superflu aux limites numériques', () => {
  const max = Number.MAX_SAFE_INTEGER;
  const center = new LangtonEngine({
    ant: { x: max, y: 2, orientation: 'west' },
  });
  center.step();
  expect(center.getState()).toEqual({
    ant: { x: max, y: 3, orientation: 'north' },
    stepCount: 1,
    blackCells: [{ x: max, y: 2 }],
  });
  // Propriétaire de croix hors domaine, mais case visitée et destination valides.
  for (const rules of configurations) {
    const branch = new LangtonEngine({
      ant: { x: max, y: 4, orientation: 'west' },
      rules,
    });
    branch.step();
    expect(branch.getState()).toEqual({
      ant: { x: max, y: 5, orientation: 'north' },
      stepCount: 1,
      blackCells: [{ x: max, y: 4 }],
    });
  }
});

test.each(configurations.slice(1))(
  'un lot conserve les pas terminés avant une croix hors domaine : %j',
  (rules) => {
    const max = Number.MAX_SAFE_INTEGER;
    const config = {
      ant: { x: max - 1, y: 2, orientation: 'north' },
      blackCells: [{ x: max, y: 2 }],
      rules,
    };
    const individual = new LangtonEngine(config);
    individual.step();
    expect(individual.getState().ant).toEqual({
      x: max,
      y: 2,
      orientation: 'east',
    });
    // Centre noir : tourner à gauche conduit au nord, une destination valide.
    const engine = new LangtonEngine(config);
    expect(() => engine.advance(2)).toThrow(RangeError);
    expect(engine.getState()).toEqual(individual.getState());
  },
);
