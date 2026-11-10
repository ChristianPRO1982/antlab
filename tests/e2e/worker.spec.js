import { expect, test } from '@playwright/test';
import { LangtonEngine } from '../../src/engine.js';
import { RULE_CONFIGURATIONS } from '../fixtures/rule-configurations.js';

// Ces fixtures importent les modules source ; le branchement au site vient au lot 07.
test.skip(
  Boolean(process.env.TEST_BASE_URL),
  'Les fixtures du Worker nécessitent le serveur source Vite.',
);

async function createClient(page, configuration = {}, execution = {}) {
  await page.goto('/#/jeu');
  await page.evaluate(
    async ({ configuration, execution }) => {
      const { createSimulationClient } =
        await import('/src/simulation-client.js');
      window.workerFixture = await createSimulationClient(
        configuration,
        execution,
      );
      window.workerEvents = [];
      window.workerFixture.subscribe((progress) =>
        window.workerEvents.push(progress),
      );
    },
    { configuration, execution },
  );
}

for (const rules of RULE_CONFIGURATIONS) {
  test(`vrai Worker identique au moteur sans affichage : ${JSON.stringify(rules)}`, async ({
    page,
  }) => {
    const configuration = {
      rules,
      ant: { x: -3, y: -1, orientation: 'east' },
      blackCells: [{ x: -3, y: -1 }],
    };
    await createClient(page, configuration, { batchSize: 113 });
    const result = await page.evaluate(async () => {
      await window.workerFixture.advance(10000);
      const result = {
        state: await window.workerFixture.getState(),
        rules: await window.workerFixture.getRules(),
      };
      await window.workerFixture.dispose();
      return result;
    });
    const reference = new LangtonEngine(configuration);
    for (let index = 0; index < 10000; index++) reference.step();
    expect(result).toEqual({
      state: reference.getState(),
      rules: reference.getRules(),
    });
  });
}

test('paliers réels exacts jusqu’à un million, étape libre et refus du passé', async ({
  page,
}) => {
  test.setTimeout(120000);
  await createClient(page, {}, { batchSize: 10000 });
  const reference = new LangtonEngine();
  for (const target of [10000, 100000, 1000000, 1000007]) {
    const result = await page.evaluate(async (target) => {
      const progress = await window.workerFixture.runUntil(target);
      return { progress, state: await window.workerFixture.getState() };
    }, target);
    reference.advance(target - reference.getProgress().stepCount);
    expect(result.progress).toMatchObject({
      status: 'completed',
      stepCount: target,
      targetStep: target,
    });
    expect(result.state).toEqual(reference.getState());
  }
  expect(
    await page.evaluate(async () => {
      try {
        await window.workerFixture.runUntil(1);
      } catch (error) {
        return error.name;
      }
    }),
  ).toBe('RangeError');
  await page.evaluate(() => window.workerFixture.dispose());
});

test('page réactive, calcul continu, pause/reprise et annulation sans perte', async ({
  page,
}) => {
  await createClient(page, {}, { batchSize: 101, progressIntervalMs: 0 });
  await page.evaluate(() => window.workerFixture.start());
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.workerEvents.some((event) => event.stepCount > 0),
      ),
    )
    .toBe(true);
  await page.getByLabel('Zoom', { exact: true }).fill('64');
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Aide' })
    .click();
  await expect(page).toHaveTitle('AntLab — Aide');
  await page.getByRole('navigation').getByRole('link', { name: 'Jeu' }).click();
  const paused = await page.evaluate(() => window.workerFixture.pause());
  expect(paused.status).toBe('paused');
  const frozen = await page.evaluate(() => window.workerFixture.getState());
  expect(await page.evaluate(() => window.workerFixture.getState())).toEqual(
    frozen,
  );
  await page.evaluate(() => window.workerFixture.resume());
  const cancelled = await page.evaluate(() => window.workerFixture.cancel());
  expect(cancelled).toMatchObject({ status: 'cancelled', targetStep: null });
  const state = await page.evaluate(() => window.workerFixture.getState());
  expect(state.stepCount).toBe(cancelled.stepCount);
  const reference = new LangtonEngine();
  reference.advance(state.stepCount);
  expect(state).toEqual(reference.getState());
  const target = cancelled.stepCount + 137;
  await page.evaluate(
    (target) => window.workerFixture.runUntil(target),
    target,
  );
  reference.advance(137);
  expect(await page.evaluate(() => window.workerFixture.getState())).toEqual(
    reference.getState(),
  );
  expect(
    await page.evaluate(() =>
      window.workerEvents.every((event) => !('blackCells' in event)),
    ),
  ).toBe(true);
  await page.evaluate(() => window.workerFixture.dispose());
});

test('pause d’un calcul fini conserve sa cible, annulation résout sa promesse', async ({
  page,
}) => {
  await createClient(page, {}, { batchSize: 37 });
  await page.evaluate(() => {
    window.workerOperation = window.workerFixture.runUntil(1000000);
  });
  const paused = await page.evaluate(() => window.workerFixture.pause());
  expect(paused).toMatchObject({ status: 'paused', targetStep: 1000000 });
  const cancelled = await page.evaluate(() => window.workerFixture.cancel());
  expect(await page.evaluate(() => window.workerOperation)).toEqual(cancelled);
  const target = cancelled.stepCount + 10000;
  await page.evaluate((target) => {
    window.workerOperation = window.workerFixture.runUntil(target);
  }, target);
  await page.evaluate(() => window.workerFixture.pause());
  await page.evaluate(() => window.workerFixture.resume());
  expect(await page.evaluate(() => window.workerOperation)).toMatchObject({
    status: 'completed',
    stepCount: target,
  });
  const reference = new LangtonEngine();
  reference.advance(target);
  expect(await page.evaluate(() => window.workerFixture.getState())).toEqual(
    reference.getState(),
  );
  await page.evaluate(() => window.workerFixture.dispose());
});

test('erreur scientifique transmise avec l’état partiel réellement atteint', async ({
  page,
}) => {
  const configuration = {
    ant: { x: Number.MAX_SAFE_INTEGER, y: 0, orientation: 'east' },
    blackCells: [{ x: Number.MAX_SAFE_INTEGER, y: -1 }],
  };
  await createClient(page, configuration);
  const result = await page.evaluate(async () => {
    let failure;
    try {
      await window.workerFixture.advance(3);
    } catch (error) {
      failure = error.name;
    }
    return {
      failure,
      progress: await window.workerFixture.getProgress(),
      state: await window.workerFixture.getState(),
    };
  });
  expect(result.failure).toBe('RangeError');
  expect(result.progress).toMatchObject({ status: 'error', stepCount: 1 });
  const reference = new LangtonEngine(configuration);
  reference.step();
  expect(result.state).toEqual(reference.getState());
  await page.evaluate(() => window.workerFixture.dispose());
});

test('validation réelle du protocole sans perdre l’expérience', async ({
  page,
}) => {
  await page.goto('/');
  const replies = await page.evaluate(async () => {
    const worker = new Worker('/src/simulation-worker.js', { type: 'module' });
    let id = 0;
    const request = (message) =>
      new Promise((resolve) => {
        const requestId = ++id;
        const listener = ({ data }) => {
          if (data.type === 'response' && data.id === requestId) {
            worker.removeEventListener('message', listener);
            resolve(data);
          }
        };
        worker.addEventListener('message', listener);
        worker.postMessage({ id: requestId, ...message });
      });
    const results = [];
    for (const message of [
      { command: 'getState' },
      { command: 'unknown' },
      { command: 'initialize', configuration: {}, execution: {} },
      { command: 'initialize' },
      { command: 'advance', count: '1' },
      { command: 'start', extra: true },
      { command: 'getProgress' },
    ])
      results.push(await request(message));
    worker.terminate();
    return results;
  });
  expect(replies[0].error).toBeTruthy();
  expect(replies[1].error.name).toBe('TypeError');
  expect(replies[2].result).toMatchObject({ status: 'ready', stepCount: 0 });
  expect(replies[3].error).toBeTruthy();
  expect(replies[4].error.name).toBe('TypeError');
  expect(replies[5].error.name).toBe('TypeError');
  expect(replies[6].result).toMatchObject({ status: 'ready', stepCount: 0 });
});
