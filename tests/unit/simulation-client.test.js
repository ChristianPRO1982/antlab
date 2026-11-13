import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createSimulationClient } from '../../src/simulation-client.js';

const ready = {
  ant: { x: 0, y: 0, orientation: 'north' },
  stepCount: 0,
  blackCellCount: 0,
  status: 'ready',
  targetStep: null,
};

class TestWorker extends EventTarget {
  static instances = [];
  sent = [];
  terminated = false;
  constructor(url, options) {
    super();
    this.url = url;
    this.options = options;
    TestWorker.instances.push(this);
  }
  postMessage(message) {
    this.sent.push(structuredClone(message));
  }
  terminate() {
    this.terminated = true;
  }
  receive(data) {
    this.dispatchEvent(new MessageEvent('message', { data }));
  }
  respond(message, result) {
    this.receive({ type: 'response', id: message.id, result });
  }
}

beforeEach(() => {
  TestWorker.instances = [];
  vi.stubGlobal('Worker', TestWorker);
});
afterEach(() => vi.unstubAllGlobals());

async function initialized() {
  const pending = createSimulationClient({}, { batchSize: 7 });
  const worker = TestWorker.instances.at(-1);
  expect(worker.options).toEqual({ type: 'module' });
  expect(worker.sent[0]).toMatchObject({
    command: 'initialize',
    configuration: {},
    execution: { batchSize: 7 },
  });
  worker.respond(worker.sent[0], ready);
  return { client: await pending, worker };
}

test('réponses corrélées malgré leur ordre, lecture pendant un calcul', async () => {
  const { client, worker } = await initialized();
  const finite = client.advance(7);
  const read = client.getProgress();
  const [calculation, inspection] = worker.sent.slice(1);
  expect(calculation).toMatchObject({ command: 'advance', count: 7 });
  worker.respond(inspection, { ...ready, status: 'running' });
  expect(await read).toMatchObject({ status: 'running' });
  worker.respond(calculation, { ...ready, status: 'completed', stepCount: 7 });
  expect(await finite).toMatchObject({ status: 'completed', stepCount: 7 });
  worker.respond(calculation, ready); // Une réponse tardive ne résout aucune autre demande.
  await client.dispose();
  expect(worker.terminated).toBe(true);
});

test('toutes les commandes publiques utilisent le transport', async () => {
  const { client, worker } = await initialized();
  for (const [method, argument, field] of [
    ['step'],
    ['runUntil', 10000, 'targetStep'],
    ['start'],
    ['pause'],
    ['resume'],
    ['cancel'],
    ['getState'],
    ['getRules'],
    ['setExecutionOptions', { batchSize: 10 }, 'options'],
  ]) {
    const operation = client[method](argument);
    const request = worker.sent.at(-1);
    expect(request.command).toBe(method);
    if (field) expect(request[field]).toEqual(argument);
    worker.respond(request, ready);
    expect(await operation).toEqual(ready);
  }
  await client.dispose();
});

test('notifications indépendantes et désabonnement', async () => {
  const { client, worker } = await initialized();
  expect(() => client.subscribe(null)).toThrow(TypeError);
  const observed = [];
  const unsubscribe = client.subscribe((progress) => {
    observed.push(progress.stepCount);
    progress.ant.x = 99;
  });
  const second = vi.fn();
  client.subscribe(second);
  worker.receive({
    type: 'progress',
    progress: { ...ready, status: 'running', stepCount: 7 },
  });
  expect(observed).toEqual([7]);
  expect(second.mock.calls[0][0].ant.x).toBe(0);
  unsubscribe();
  worker.receive({ type: 'progress', progress: { ...ready, stepCount: 8 } });
  expect(observed).toEqual([7]);
  await client.dispose();
});

test('erreurs de commande typées sans détruire la connexion', async () => {
  const { client, worker } = await initialized();
  const operation = client.runUntil(-1);
  worker.receive({
    type: 'response',
    id: worker.sent.at(-1).id,
    error: { name: 'RangeError', message: 'Cible passée.' },
  });
  await expect(operation).rejects.toThrow(RangeError);
  expect(worker.terminated).toBe(false);
  const read = client.getProgress();
  worker.respond(worker.sent.at(-1), ready);
  expect(await read).toEqual(ready);
  await client.dispose();
});

test.each(['error', 'messageerror', 'protocol'])(
  'panne %s : demandes en attente rejetées, Worker terminé, aucun calcul de secours',
  async (kind) => {
    const { client, worker } = await initialized();
    const first = client.advance(100).catch((error) => error);
    const second = client.getState().catch((error) => error);
    if (kind === 'protocol') worker.receive({ type: 'invalid' });
    else
      worker.dispatchEvent(
        Object.assign(new Event(kind), { message: 'Worker indisponible.' }),
      );
    expect(await first).toBeInstanceOf(Error);
    expect(await second).toBeInstanceOf(Error);
    expect(worker.terminated).toBe(true);
    await expect(client.getProgress()).rejects.toThrow();
    await client.dispose();
  },
);

test('fermeture explicite pendant une demande et fermeture répétée', async () => {
  const { client, worker } = await initialized();
  const pending = client.advance(100).catch((error) => error);
  await client.dispose();
  await client.dispose();
  expect(await pending).toBeInstanceOf(Error);
  expect(worker.terminated).toBe(true);
  expect(() => client.subscribe(() => {})).toThrow(/ferm/i);
});

test('une panne est observable même au repos ; fermeture volontaire sans fausse erreur', async () => {
  const { client, worker } = await initialized();
  const onError = vi.fn();
  client.subscribeErrors(onError);
  worker.dispatchEvent(
    Object.assign(new Event('error'), { message: 'Panne au repos.' }),
  );
  expect(onError).toHaveBeenCalledWith(
    expect.objectContaining({ message: 'Panne au repos.' }),
  );
  await client.dispose();
  expect(onError).toHaveBeenCalledOnce();
  const other = await initialized();
  const callback = vi.fn();
  other.client.subscribeErrors(callback);
  await other.client.dispose();
  expect(callback).not.toHaveBeenCalled();
});

test('initialisation refusée ou données non transférables : libération du Worker', async () => {
  const pending = createSimulationClient({ rules: { central: 'unknown' } });
  const worker = TestWorker.instances.at(-1);
  worker.receive({
    type: 'response',
    id: worker.sent[0].id,
    error: { name: 'TypeError', message: 'Règle inconnue.' },
  });
  await expect(pending).rejects.toThrow(TypeError);
  expect(worker.terminated).toBe(true);
  await expect(createSimulationClient({ ant: () => {} })).rejects.toThrow();
  expect(TestWorker.instances.at(-1).terminated).toBe(true);
});
