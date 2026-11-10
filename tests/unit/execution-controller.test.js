import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ExecutionController } from '../../src/execution-controller.js';
import { LangtonEngine } from '../../src/engine.js';
import { RULE_CONFIGURATIONS } from '../fixtures/rule-configurations.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

test('lecture compacte indépendante du moteur et sans copie du monde', async () => {
  const engine = new LangtonEngine();
  expect(engine.getProgress()).toEqual({
    ant: { x: 0, y: 0, orientation: 'north' },
    stepCount: 0,
    blackCellCount: 0,
  });
  const copy = engine.getProgress();
  copy.ant.x = 100;
  expect(engine.getProgress().ant.x).toBe(0);
  vi.spyOn(LangtonEngine.prototype, 'getState').mockImplementation(() => {
    throw new Error('Copie complète interdite pendant la progression.');
  });
  const runner = new ExecutionController(
    {},
    { batchSize: 7, progressIntervalMs: 0 },
  );
  const events = [];
  runner.subscribe((progress) => events.push(progress));
  const operation = runner.advance(18);
  await vi.runAllTimersAsync();
  expect(await operation).toMatchObject({
    status: 'completed',
    stepCount: 18,
    targetStep: 18,
  });
  expect(events.map(({ stepCount }) => stepCount)).toEqual([0, 7, 14, 18]);
  expect(events.every((event) => !('blackCells' in event))).toBe(true);
  await runner.dispose();
});

test('un pas, zéro pas, cible courante et refus des sauts vers le passé', async () => {
  const runner = new ExecutionController();
  expect(await runner.getProgress()).toMatchObject({
    status: 'ready',
    stepCount: 0,
    targetStep: null,
  });
  expect(await runner.advance(0)).toMatchObject({
    status: 'completed',
    stepCount: 0,
  });
  const one = runner.step();
  await vi.runAllTimersAsync();
  expect(await one).toMatchObject({ stepCount: 1, targetStep: 1 });
  expect(await runner.runUntil(1)).toMatchObject({
    stepCount: 1,
    status: 'completed',
  });
  await expect(runner.runUntil(0)).rejects.toThrow(RangeError);
  expect((await runner.getState()).stepCount).toBe(1);
});

test('pause conserve la cible et la promesse ; reprise sans perte ni doublon', async () => {
  const runner = new ExecutionController({}, { batchSize: 4 });
  let settled = false;
  const operation = runner.advance(11).then((progress) => {
    settled = true;
    return progress;
  });
  await vi.advanceTimersToNextTimerAsync();
  expect(await runner.pause()).toMatchObject({
    status: 'paused',
    stepCount: 4,
    targetStep: 11,
  });
  const frozen = await runner.getState();
  expect(await runner.pause()).toMatchObject({ status: 'paused' });
  await vi.runAllTimersAsync();
  expect(settled).toBe(false);
  expect(await runner.getState()).toEqual(frozen);
  await expect(runner.start()).rejects.toThrow(/cours|active|pause/i);
  await expect(runner.advance(1)).rejects.toThrow();
  expect(await runner.resume()).toMatchObject({
    status: 'running',
    targetStep: 11,
  });
  await vi.runAllTimersAsync();
  expect(await operation).toMatchObject({ status: 'completed', stepCount: 11 });
  const reference = new LangtonEngine();
  reference.advance(11);
  expect(await runner.getState()).toEqual(reference.getState());
  await expect(runner.resume()).rejects.toThrow();
});

test('annulation conserve l’état, abandonne la cible et autorise un nouveau calcul', async () => {
  const runner = new ExecutionController({}, { batchSize: 3 });
  const operation = runner.runUntil(100);
  await vi.advanceTimersToNextTimerAsync();
  await runner.pause();
  expect(await runner.cancel()).toMatchObject({
    status: 'cancelled',
    stepCount: 3,
    targetStep: null,
  });
  expect(await operation).toMatchObject({ status: 'cancelled', stepCount: 3 });
  expect(await runner.cancel()).toMatchObject({ stepCount: 3 });
  const next = runner.advance(5);
  await vi.runAllTimersAsync();
  expect(await next).toMatchObject({ stepCount: 8, status: 'completed' });
  const reference = new LangtonEngine();
  reference.advance(8);
  expect(await runner.getState()).toEqual(reference.getState());
});

test('calcul continu acquitté sans attente, commandes concurrentes refusées', async () => {
  const runner = new ExecutionController({}, { batchSize: 5 });
  expect(await runner.start()).toMatchObject({
    status: 'running',
    targetStep: null,
    stepCount: 0,
  });
  await expect(runner.runUntil(10)).rejects.toThrow();
  await expect(runner.step()).rejects.toThrow();
  await expect(runner.start()).rejects.toThrow();
  await vi.advanceTimersToNextTimerAsync();
  expect(await runner.cancel()).toMatchObject({
    status: 'cancelled',
    stepCount: 5,
  });
  await vi.runAllTimersAsync();
  expect((await runner.getProgress()).stepCount).toBe(5);
});

test('un callback périmé ne peut reprendre après pause, annulation ou nouveau lancement', async () => {
  const scheduled = vi.spyOn(globalThis, 'setTimeout');
  const runner = new ExecutionController({}, { batchSize: 2 });
  await runner.start();
  const oldTick = scheduled.mock.calls.at(-1)[0];
  await runner.pause();
  oldTick();
  expect((await runner.getProgress()).stepCount).toBe(0);
  await runner.cancel();
  const next = runner.advance(3);
  oldTick();
  await vi.runAllTimersAsync();
  expect(await next).toMatchObject({ stepCount: 3 });
  await runner.dispose();
  oldTick();
  expect(vi.getTimerCount()).toBe(0);
});

test('un abonné peut interrompre au changement de statut sans lancer de lot résiduel', async () => {
  const runner = new ExecutionController();
  runner.subscribe((progress) => {
    progress.ant.x = 999;
    if (progress.status === 'running') void runner.pause();
  });
  const operation = runner.advance(10);
  expect(await runner.getProgress()).toMatchObject({
    status: 'paused',
    stepCount: 0,
    ant: { x: 0 },
  });
  expect(vi.getTimerCount()).toBe(0);
  await runner.cancel();
  expect(await operation).toMatchObject({ stepCount: 0, status: 'cancelled' });
});

test('fréquence de progression distincte du débit ; notifications finales forcées', async () => {
  const run = async (progressIntervalMs) => {
    const runner = new ExecutionController(
      {},
      { batchSize: 2, batchDelayMs: 10, progressIntervalMs },
    );
    const events = [];
    const unsubscribe = runner.subscribe((progress) => events.push(progress));
    const operation = runner.advance(11);
    await vi.runAllTimersAsync();
    await operation;
    unsubscribe();
    const state = await runner.getState();
    await runner.dispose();
    return { events, state };
  };
  const frequent = await run(0);
  const infrequent = await run(1000);
  expect(frequent.state).toEqual(infrequent.state);
  expect(frequent.events.length).toBeGreaterThan(infrequent.events.length);
  expect(infrequent.events.map(({ status }) => status)).toEqual([
    'running',
    'completed',
  ]);
});

test('validation des options de pilotage et des nombres avant tout calcul', async () => {
  for (const execution of [
    null,
    [],
    'fast',
    { unknown: 1 },
    { batchSize: 0 },
    { batchSize: 10001 },
    { batchSize: 1.5 },
    { batchSize: '1' },
    { batchDelayMs: -1 },
    { batchDelayMs: Infinity },
    { progressIntervalMs: NaN },
    { progressIntervalMs: '100' },
    { batchDelayMs: 2147483648 },
  ]) {
    expect(() => new ExecutionController({}, execution)).toThrow();
  }
  const runner = new ExecutionController();
  const before = await runner.getState();
  for (const value of [
    undefined,
    null,
    '1',
    1n,
    false,
    -1,
    0.5,
    Infinity,
    NaN,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    await expect(runner.advance(value)).rejects.toThrow();
    await expect(runner.runUntil(value)).rejects.toThrow();
    expect(await runner.getState()).toEqual(before);
  }
  const one = runner.step();
  await vi.runAllTimersAsync();
  await one;
  await expect(runner.advance(Number.MAX_SAFE_INTEGER)).rejects.toThrow(
    RangeError,
  );
  expect((await runner.getProgress()).stepCount).toBe(1);
});

test('erreur scientifique : dernier pas valide et compteur réellement atteint conservés', async () => {
  const config = {
    ant: { x: Number.MAX_SAFE_INTEGER, y: 0, orientation: 'east' },
    blackCells: [{ x: Number.MAX_SAFE_INTEGER, y: -1 }],
  };
  const runner = new ExecutionController(config);
  const failure = runner.advance(3).catch((error) => error);
  await vi.runAllTimersAsync();
  expect(await failure).toBeInstanceOf(RangeError);
  expect(await runner.getProgress()).toMatchObject({
    status: 'error',
    stepCount: 1,
    error: { name: 'RangeError' },
  });
  const reference = new LangtonEngine(config);
  reference.step();
  expect(await runner.getState()).toEqual(reference.getState());
});

test('fermeture rejette le calcul en attente et libère timers et abonnements', async () => {
  const runner = new ExecutionController();
  const events = vi.fn();
  runner.subscribe(events);
  const result = runner.advance(100).catch((error) => error);
  await runner.dispose();
  expect(await result).toBeInstanceOf(Error);
  await runner.dispose();
  expect(vi.getTimerCount()).toBe(0);
  await expect(runner.getState()).rejects.toThrow(/ferm/i);
  await expect(runner.getProgress()).rejects.toThrow(/ferm/i);
  await expect(runner.getRules()).rejects.toThrow(/ferm/i);
  await expect(runner.start()).rejects.toThrow(/ferm/i);
  expect(() => runner.subscribe(events)).toThrow(/ferm/i);
});

test.each(RULE_CONFIGURATIONS)(
  'équivalence sans rendu, tous les paramètres scientifiques : %j',
  async (rules) => {
    const configuration = {
      rules,
      ant: { x: -3, y: -1, orientation: 'east' },
      blackCells: [{ x: -3, y: -1 }],
    };
    const reference = new LangtonEngine(configuration);
    for (let index = 0; index < 10000; index++) reference.step();
    for (const execution of [
      { batchSize: 37, batchDelayMs: 1, progressIntervalMs: 0 },
      { batchSize: 1000, batchDelayMs: 0, progressIntervalMs: 1000 },
    ]) {
      const runner = new ExecutionController(configuration, execution);
      const operation = runner.advance(10000);
      await vi.runAllTimersAsync();
      expect(await operation).toMatchObject({
        stepCount: 10000,
        status: 'completed',
      });
      expect(await runner.getState()).toEqual(reference.getState());
      expect(await runner.getRules()).toEqual(reference.getRules());
      await runner.dispose();
    }
  },
);

test('paliers exacts 10 000, 100 000, 1 000 000 puis cible libre', async () => {
  const runner = new ExecutionController({}, { batchSize: 10000 });
  const reference = new LangtonEngine();
  for (const target of [10000, 100000, 1000000, 1000007]) {
    const operation = runner.runUntil(target);
    await vi.runAllTimersAsync();
    expect(await operation).toMatchObject({
      stepCount: target,
      targetStep: target,
    });
    reference.advance(target - reference.getProgress().stepCount);
    expect(await runner.getState()).toEqual(reference.getState());
  }
  await runner.dispose();
}, 120000);
