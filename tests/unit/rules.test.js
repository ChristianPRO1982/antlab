import { expect, test } from 'vitest';
import { getRuleCatalog } from '../../src/rules.js';
import { LangtonEngine } from '../../src/engine.js';

const centralIds = [
  'single-flip',
  'cross-flip',
  'center-master',
  'inverted-majority',
  'majority-wins',
];
const rotation = 'rotate-branches-clockwise';

test('catalogue de six règles versionnées, catégories et compatibilités explicites', () => {
  const catalog = getRuleCatalog();
  expect(catalog.map(({ id }) => id)).toEqual([...centralIds, rotation]);
  for (const rule of catalog) {
    expect(rule.version).toBe(rule.id === 'inverted-majority' ? 2 : 1);
    expect(rule.name).toEqual(expect.any(String));
    expect(rule.name.length).toBeGreaterThan(0);
    expect(rule.description).toEqual(expect.any(String));
    expect(rule.description.length).toBeGreaterThan(0);
    expect(
      Object.values(rule).some((value) => typeof value === 'function'),
    ).toBe(false);
    expect(rule.category).toBe(rule.id === rotation ? 'optional' : 'central');
  }
  expect(catalog.at(-1).compatibleCentralRules).toEqual(['single-flip']);
});

test('les métadonnées retournées ne permettent pas de modifier le catalogue', () => {
  const initial = getRuleCatalog();
  const catalog = getRuleCatalog();
  catalog[0].id = 'changed';
  catalog[0].version = 99;
  catalog.at(-1).compatibleCentralRules.push('cross-flip');
  catalog.pop();
  expect(getRuleCatalog()).toEqual(initial);
  expect(() => new LangtonEngine({ rules: { central: 'changed' } })).toThrow(
    TypeError,
  );
  expect(
    () =>
      new LangtonEngine({
        rules: { central: 'cross-flip', optional: [rotation] },
      }),
  ).toThrow(TypeError);
});

test('configuration par défaut et normalisation des propriétés omises', () => {
  for (const rules of [
    undefined,
    {},
    { central: undefined },
    { optional: undefined },
  ]) {
    expect(new LangtonEngine({ rules }).getRules()).toEqual({
      central: 'single-flip',
      optional: [],
    });
  }
  for (const central of centralIds) {
    expect(new LangtonEngine({ rules: { central } }).getRules()).toEqual({
      central,
      optional: [],
      ...(['inverted-majority', 'majority-wins'].includes(central) && {
        threshold: 3,
      }),
    });
  }
  expect(
    new LangtonEngine({ rules: { optional: [rotation] } }).getRules(),
  ).toEqual({
    central: 'single-flip',
    optional: [rotation],
  });
});

test('configuration copiée et lecture indépendante, sans altération des états existants', () => {
  const rules = { central: 'single-flip', optional: [rotation] };
  const engine = new LangtonEngine({ rules });
  const expectedRules = engine.getRules();
  rules.central = 'cross-flip';
  rules.optional.length = 0;
  const copy = engine.getRules();
  copy.central = 'center-master';
  copy.optional.push('unknown');
  expect(engine.getRules()).toEqual(expectedRules);
  expect(Object.keys(engine.getState())).toEqual([
    'ant',
    'stepCount',
    'blackCells',
  ]);
  expect(engine.step()).toBe(1);
  expect(engine.getState()).toEqual({
    ant: { x: 1, y: 0, orientation: 'east' },
    stepCount: 1,
    blackCells: [{ x: 0, y: 0 }],
  });
  expect(new LangtonEngine().getRules()).toEqual({
    central: 'single-flip',
    optional: [],
  });
});

test('configurations mal formées, identifiants et catégories incorrectes refusés', () => {
  for (const rules of [
    null,
    false,
    1,
    'single-flip',
    [],
    { center: 'single-flip' },
    { optionals: [] },
    { extra: true },
    { central: null },
    { central: false },
    { central: 1 },
    { central: {} },
    { central: [] },
    { central: centralIds },
    { central: '' },
    { central: 'unknown' },
    { central: rotation },
    { optional: null },
    { optional: false },
    { optional: 1 },
    { optional: {} },
    { optional: rotation },
    { optional: [null] },
    { optional: [undefined] },
    { optional: [1] },
    { optional: [{}] },
    { optional: ['unknown'] },
    { optional: ['single-flip'] },
    { optional: [rotation, rotation] },
  ]) {
    expect(() => new LangtonEngine({ rules })).toThrow(TypeError);
    expect(() => new LangtonEngine({ rules })).toThrow(
      /règle|configuration|option/i,
    );
  }
});

test.each([
  'cross-flip',
  'center-master',
  'inverted-majority',
  'majority-wins',
])('rotation des branches incompatible avec %s', (central) => {
  expect(
    () => new LangtonEngine({ rules: { central, optional: [rotation] } }),
  ).toThrow(TypeError);
  expect(
    () => new LangtonEngine({ rules: { central, optional: [rotation] } }),
  ).toThrow(/incompatible/i);
});
