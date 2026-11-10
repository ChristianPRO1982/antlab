import { expect, test, vi } from 'vitest';
import { createGameSession } from '../../src/game-session.js';

function fixture() {
  const clients = [];
  const connectors = [];
  const view = { setActive: vi.fn(), setError: vi.fn(), dispose: vi.fn() };
  const createClient = vi.fn(async (configuration, execution) => {
    let progress = {
      status: 'ready',
      stepCount: 0,
      blackCellCount: 0,
      targetStep: null,
    };
    const client = {
      configuration,
      execution,
      getProgress: vi.fn(async () => progress),
      subscribe: vi.fn((callback) => {
        client.notify = callback;
        return vi.fn();
      }),
      subscribeErrors: vi.fn((callback) => {
        client.fail = callback;
        return vi.fn();
      }),
      dispose: vi.fn(async () => {}),
      emit(value) {
        progress = value;
        client.notify(value);
      },
    };
    clients.push(client);
    return client;
  });
  const connect = vi.fn(() => {
    const connector = { dispose: vi.fn(), setActive: vi.fn() };
    connectors.push(connector);
    return connector;
  });
  return { clients, connectors, view, createClient, connect };
}

test('remplace le Worker à zéro, conserve la vue et ignore les notifications périmées', async () => {
  const f = fixture();
  const session = await createGameSession(f.view, f);
  const seen = [];
  session.subscribe(() => seen.push(session.progress));
  const old = session.simulation;
  session.setActive(false);
  await session.reset({ central: 'majority-wins', threshold: 2 });
  expect(old.dispose).toHaveBeenCalledOnce();
  expect(f.connectors[0].dispose).toHaveBeenCalledOnce();
  expect(session.view).toBe(f.view);
  expect(session.simulation).not.toBe(old);
  expect(session.simulation.configuration.rules).toEqual({
    central: 'majority-wins',
    optional: [],
    threshold: 2,
  });
  expect(session.progress.stepCount).toBe(0);
  expect(f.connectors[1].setActive).toHaveBeenLastCalledWith(false);
  const count = seen.length;
  old.notify({ status: 'completed', stepCount: 99 });
  old.fail(new Error('ancienne panne'));
  expect(seen).toHaveLength(count);
  expect(session.error).toBe(null);
  await session.dispose();
  await session.dispose();
  expect(f.view.dispose).toHaveBeenCalledOnce();
  expect(session.simulation.dispose).toHaveBeenCalledOnce();
  await expect(session.reset()).rejects.toThrow(/fermée/);
});

test('validation avant remplacement et panne explicite sans recréation automatique', async () => {
  const f = fixture();
  const session = await createGameSession(f.view, f);
  await expect(session.reset({ central: 'unknown' })).rejects.toThrow();
  expect(session.simulation.dispose).not.toHaveBeenCalled();
  session.simulation.fail(new Error('Worker perdu'));
  expect(session.error.message).toBe('Worker perdu');
  expect(f.createClient).toHaveBeenCalledOnce();
  await session.reset();
  expect(session.error).toBe(null);
  expect(f.createClient).toHaveBeenCalledTimes(2);
  await session.dispose();
});

test('fermer pendant une création termine aussi le client tardif', async () => {
  const f = fixture();
  const session = await createGameSession(f.view, f);
  let finish;
  const late = { dispose: vi.fn(async () => {}) };
  f.createClient.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const replacement = session.reset();
  await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
  await session.dispose();
  finish(late);
  await expect(replacement).rejects.toThrow(/fermée/);
  expect(late.dispose).toHaveBeenCalledOnce();
});

test('panne à la création : vue conservée, erreur visible et reprise uniquement explicite', async () => {
  const f = fixture();
  f.createClient.mockRejectedValueOnce(new Error('Worker non chargé'));
  const session = await createGameSession(f.view, f);
  expect(session.error.message).toBe('Worker non chargé');
  expect(f.view.dispose).not.toHaveBeenCalled();
  expect(f.createClient).toHaveBeenCalledOnce();
  await session.reset();
  expect(session.progress.stepCount).toBe(0);
  expect(session.error).toBe(null);
  await session.dispose();
});

test('la cadence acquittée est conservée lors du remplacement', async () => {
  const f = fixture();
  const session = await createGameSession(f.view, f);
  session.simulation.setExecutionOptions = vi.fn(async () => ({
    batchSize: 1,
    batchDelayMs: 1000,
    progressIntervalMs: 100,
  }));
  await session.setExecutionOptions({ batchSize: 1, batchDelayMs: 1000 });
  await session.reset();
  expect(session.simulation.execution).toEqual({
    batchSize: 1,
    batchDelayMs: 1000,
    progressIntervalMs: 100,
  });
  await session.dispose();
});
