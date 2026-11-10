import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { connectSimulationView } from '../../src/simulation-view.js';
import { ExecutionController } from '../../src/execution-controller.js';
import { LangtonEngine } from '../../src/engine.js';
import { RULE_CONFIGURATIONS } from '../fixtures/rule-configurations.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
const state = (stepCount) => ({
  ant: { x: stepCount, y: 0, orientation: 'east' },
  stepCount,
  blackCells: [{ x: stepCount - 1, y: 0 }],
});
function fixture(getState = async () => state(0)) {
  let progress;
  const simulation = {
    getState: vi.fn(getState),
    subscribe: vi.fn((callback) => {
      progress = callback;
      return vi.fn();
    }),
  };
  const view = { updateScene: vi.fn(), setActive: vi.fn(), setError: vi.fn() };
  return { simulation, view, emit: (value) => progress(value) };
}

test.each([1, 99])(
  'un intervalle de %i ms ne peut pas contourner la limite de dix demandes par seconde',
  (intervalMs) => {
    const f = fixture();
    expect(() =>
      connectSimulationView(f.simulation, f.view, { intervalMs }),
    ).toThrow(RangeError);
    expect(f.simulation.subscribe).not.toHaveBeenCalled();
    expect(f.simulation.getState).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  },
);

test('un timer déclenché trop tôt ne lance pas un deuxième instantané avant 100 ms', async () => {
  let now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  const f = fixture();
  const sync = connectSimulationView(f.simulation, f.view);
  await vi.advanceTimersByTimeAsync(0);
  f.emit({ status: 'running', stepCount: 0 });
  now = 99;
  await vi.advanceTimersByTimeAsync(100);
  expect(f.simulation.getState).toHaveBeenCalledOnce();
  now = 100;
  await vi.advanceTimersByTimeAsync(1);
  expect(f.simulation.getState).toHaveBeenCalledTimes(2);
  sync.dispose();
});

test('cadence bornée, une requête en vol et aucune fourmi issue de la progression compacte', async () => {
  const reads = [];
  const f = fixture(() => new Promise((resolve) => reads.push(resolve)));
  const sync = connectSimulationView(f.simulation, f.view);
  await vi.advanceTimersByTimeAsync(0);
  expect(f.simulation.getState).toHaveBeenCalledTimes(1);
  for (let index = 0; index < 30; index++)
    f.emit({ status: 'running', stepCount: 100, ant: { x: 999, y: 999 } });
  await vi.advanceTimersByTimeAsync(1000);
  expect(f.simulation.getState).toHaveBeenCalledTimes(1);
  expect(f.view.updateScene).not.toHaveBeenCalled();
  reads.shift()(state(50));
  await vi.advanceTimersByTimeAsync(0);
  expect(f.view.updateScene).toHaveBeenCalledWith(state(50));
  expect(f.simulation.getState).toHaveBeenCalledTimes(2);
  f.emit({ status: 'completed', stepCount: 101 });
  reads.shift()(state(100));
  await vi.advanceTimersByTimeAsync(99);
  expect(f.simulation.getState).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1);
  expect(f.simulation.getState).toHaveBeenCalledTimes(3);
  reads.shift()(state(101));
  await vi.advanceTimersByTimeAsync(0);
  expect(f.view.updateScene).toHaveBeenLastCalledWith(state(101));
  await vi.advanceTimersByTimeAsync(1000);
  expect(f.simulation.getState).toHaveBeenCalledTimes(3);
  sync.dispose();
});

test('masquage, retour et fermeture : demandes supprimées, réponses périmées ignorées', async () => {
  let respond;
  const f = fixture(
    () =>
      new Promise((resolve) => {
        respond = resolve;
      }),
  );
  const sync = connectSimulationView(f.simulation, f.view);
  await vi.advanceTimersByTimeAsync(0);
  sync.setActive(false);
  f.emit({ status: 'running', stepCount: 10 });
  respond(state(0));
  await vi.advanceTimersByTimeAsync(1000);
  expect(f.view.updateScene).not.toHaveBeenCalled();
  expect(f.simulation.getState).toHaveBeenCalledTimes(1);
  sync.setActive(true);
  await vi.advanceTimersByTimeAsync(0);
  expect(f.simulation.getState).toHaveBeenCalledTimes(2);
  sync.dispose();
  respond(state(10));
  await vi.runAllTimersAsync();
  expect(f.view.updateScene).not.toHaveBeenCalled();
  expect(f.simulation.subscribe.mock.results[0].value).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

test('erreurs de lecture affichées sans boucle de requêtes ni commande scientifique', async () => {
  const f = fixture(async () => {
    throw new Error('Worker fermé.');
  });
  const onError = vi.fn();
  const sync = connectSimulationView(f.simulation, f.view, { onError });
  await vi.runAllTimersAsync();
  expect(onError).toHaveBeenCalledWith(
    expect.objectContaining({ message: 'Worker fermé.' }),
  );
  expect(f.simulation.getState).toHaveBeenCalledOnce();
  expect(f.view.updateScene).not.toHaveBeenCalled();
  sync.dispose();
});

test('une panne au repos est affichée et le canal d’erreurs est libéré', async () => {
  const f = fixture();
  let fail;
  const unsubscribe = vi.fn();
  f.simulation.subscribeErrors = (callback) => {
    fail = callback;
    return unsubscribe;
  };
  const onError = vi.fn();
  const sync = connectSimulationView(f.simulation, f.view, { onError });
  await vi.runAllTimersAsync();
  fail(new Error('Worker interrompu.'));
  expect(f.view.setError).toHaveBeenCalledWith('Worker interrompu.');
  expect(onError).toHaveBeenCalledOnce();
  sync.setActive(false);
  sync.setActive(true);
  await vi.runAllTimersAsync();
  expect(f.simulation.getState).toHaveBeenCalledOnce();
  sync.dispose();
  expect(unsubscribe).toHaveBeenCalledOnce();
});

test.each(RULE_CONFIGURATIONS)(
  'calcul inchangé avec vue active, ralentie ou masquée : %j',
  async (rules) => {
    const configuration = { rules, ant: { x: -3, y: -1, orientation: 'east' } };
    const reference = new LangtonEngine(configuration);
    reference.advance(10000);
    for (const [active, intervalMs] of [
      [true, 100],
      [true, 500],
      [false, 100],
    ]) {
      const simulation = new ExecutionController(configuration, {
        batchSize: 137,
      });
      const view = {
        updateScene: vi.fn(),
        setActive: vi.fn(),
        setError: vi.fn(),
      };
      const sync = connectSimulationView(simulation, view, { intervalMs });
      sync.setActive(active);
      const operation = simulation.runUntil(10000);
      await vi.runAllTimersAsync();
      await operation;
      expect(await simulation.getState()).toEqual(reference.getState());
      expect(await simulation.getRules()).toEqual(reference.getRules());
      if (active)
        expect(view.updateScene).toHaveBeenLastCalledWith(reference.getState());
      else expect(view.updateScene).not.toHaveBeenCalled();
      sync.dispose();
      await simulation.dispose();
    }
  },
);
