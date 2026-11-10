import { expect, test } from 'vitest';
import { LangtonEngine } from '../../src/engine.js';
import { getRuleCatalog } from '../../src/rules.js';

const majorities = ['majority-wins', 'inverted-majority'];
const thresholds = [1, 2, 3, 4, 5];
const settings = majorities.flatMap((central) =>
  thresholds.map((threshold) => ({ central, threshold })),
);

test('seuils disponibles dans les métadonnées, version et copies indépendantes', () => {
  for (const central of majorities) {
    const rule = getRuleCatalog().find(({ id }) => id === central);
    expect(rule.name).toBe(
      central === 'majority-wins' ? 'Majorité l’emporte' : 'Majorité inversée',
    );
    expect(rule.version).toBe(central === 'majority-wins' ? 1 : 2);
    expect(rule.parameters).toEqual({
      threshold: { choices: thresholds, default: 3 },
    });
    rule.parameters.threshold.choices.push(0);
    rule.parameters.threshold.default = 5;
    expect(
      getRuleCatalog().find(({ id }) => id === central).parameters,
    ).toEqual({
      threshold: { choices: thresholds, default: 3 },
    });
  }
});

test.each(majorities)(
  'seuil par défaut égal à trois et configuration copiée : %s',
  (central) => {
    for (const rules of [{ central }, { central, threshold: undefined }]) {
      expect(new LangtonEngine({ rules }).getRules()).toEqual({
        central,
        optional: [],
        threshold: 3,
      });
    }
    const rules = { central, threshold: 2 };
    const engine = new LangtonEngine({ rules });
    rules.threshold = 5;
    const copy = engine.getRules();
    copy.threshold = 1;
    expect(engine.getRules()).toEqual({ central, optional: [], threshold: 2 });
    // Deux branches noires : au seuil 2 la décision doit déjà être déclenchée.
    const configured = new LangtonEngine({
      rules: engine.getRules(),
      blackCells: [
        { x: 0, y: 1 },
        { x: 1, y: 0 },
      ],
    });
    configured.step();
    expect(configured.getState().blackCells).toHaveLength(
      central === 'majority-wins' ? 5 : 0,
    );
  },
);

test.each(majorities)(
  'seuil invalide refusé sans conversion implicite : %s',
  (central) => {
    for (const threshold of [null, true, '3', 3n, {}, [], () => 3]) {
      expect(
        () => new LangtonEngine({ rules: { central, threshold } }),
      ).toThrow(TypeError);
    }
    for (const threshold of [
      0,
      -1,
      6,
      2.5,
      NaN,
      Infinity,
      -Infinity,
      Number.MAX_SAFE_INTEGER,
    ]) {
      expect(
        () => new LangtonEngine({ rules: { central, threshold } }),
      ).toThrow(RangeError);
    }
  },
);

test('un seuil ne peut pas être ignoré sur une règle sans majorité', () => {
  for (const central of ['single-flip', 'cross-flip', 'center-master']) {
    expect(
      () => new LangtonEngine({ rules: { central, threshold: 3 } }),
    ).toThrow(TypeError);
  }
  expect(() => new LangtonEngine({ rules: { threshold: 3 } })).toThrow(
    TypeError,
  );
});

for (const { central, threshold } of settings) {
  for (const [x, y] of [
    [0, 0],
    [-3, -1],
  ]) {
    const cells = [
      { x, y },
      { x, y: y + 1 },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x: x - 1, y },
    ];
    const outside = { x: x + 7, y: y + 11 };
    test.each(Array.from({ length: 32 }, (_, mask) => [mask]))(
      `${central}, seuil ${threshold}, centre (${x}, ${y}), motif %i`,
      (mask) => {
        const initial = cells.filter((_, index) => mask & (1 << index));
        const meetsThreshold = initial.length >= threshold;
        const expectedBlack =
          central === 'majority-wins' ? meetsThreshold : !meetsThreshold;
        const engine = new LangtonEngine({
          ant: { x, y, orientation: 'north' },
          blackCells: [...initial, outside],
          rules: { central, threshold },
        });
        expect(engine.step()).toBe(1);
        const state = engine.getState();
        const wasCenterBlack = Boolean(mask & 1);
        expect(state.ant).toEqual({
          x: x + (wasCenterBlack ? -1 : 1),
          y,
          orientation: wasCenterBlack ? 'west' : 'east',
        });
        expect(state.blackCells).toHaveLength(expectedBlack ? 6 : 1);
        expect(state.blackCells).toContainEqual(outside);
        for (const cell of cells) {
          expect(
            state.blackCells.some(
              (black) => black.x === cell.x && black.y === cell.y,
            ),
          ).toBe(expectedBlack);
        }
      },
    );
  }
}

test.each(settings)('pas à pas et lots reproductibles avec %j', (rules) => {
  const config = {
    rules,
    ant: { x: -3, y: -1, orientation: 'east' },
    blackCells: [
      { x: -3, y: -1 },
      { x: -2, y: -1 },
    ],
  };
  const individual = new LangtonEngine(config);
  const batch = new LangtonEngine(config);
  const repeated = new LangtonEngine(config);
  for (let index = 0; index < 10000; index++) individual.step();
  batch.advance(10000);
  for (const count of [1, 99, 2300, 0, 7600]) repeated.advance(count);
  expect(batch.getState()).toEqual(individual.getState());
  expect(repeated.getState()).toEqual(individual.getState());
  expect(batch.getRules()).toEqual({ ...rules, optional: [] });
});
