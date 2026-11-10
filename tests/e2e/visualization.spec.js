import { expect, test } from '@playwright/test';
import { LangtonEngine } from '../../src/engine.js';

const external = Boolean(process.env.TEST_BASE_URL);
async function openSession(page) {
  await page.goto('/#/jeu');
  await page.evaluate(async () => {
    const { getGameSession } = await import('/src/main.js');
    window.sceneSession = await getGameSession();
    await window.sceneSession.simulation.setExecutionOptions({
      batchSize: 1000,
      batchDelayMs: 0,
    });
  });
  await expect
    .poll(() => page.evaluate(() => window.sceneSession.view.stepCount))
    .toBe(0);
}
async function pixel(canvas, x, y) {
  return canvas.evaluate(
    (element, { x, y }) => {
      const box = element.getBoundingClientRect();
      return [
        ...element
          .getContext('2d')
          .getImageData(
            Math.round((x * element.width) / box.width),
            Math.round((y * element.height) / box.height),
            1,
            1,
          ).data,
      ];
    },
    { x, y },
  );
}

test('session unique, cinq premiers pas affichés et suivi de Lanto', async ({
  page,
}) => {
  test.skip(external, 'Pilotage source par API sous Vite.');
  await openSession(page);
  const canvas = page.getByRole('img', { name: 'Pavage en croix navigable' });
  await page.getByLabel('Grille', { exact: true }).selectOption('none');
  await page.getByLabel('Repérer l’origine').uncheck();
  const reference = new LangtonEngine();
  await page
    .getByRole('button', { name: 'Centrer sur la fourmi', exact: true })
    .dblclick();
  for (let index = 1; index <= 5; index++) {
    await page.evaluate(() => window.sceneSession.simulation.step());
    reference.step();
    await expect
      .poll(() => page.evaluate(() => window.sceneSession.view.stepCount))
      .toBe(index);
    expect(
      await page.evaluate(() => window.sceneSession.simulation.getState()),
    ).toEqual(reference.getState());
    const box = await canvas.boundingBox();
    await expect
      .poll(async () => {
        const [red, , blue] = await pixel(
          canvas,
          box.width / 2,
          box.height / 2,
        );
        return blue > red;
      })
      .toBe(true);
  }
  await canvas.screenshot({
    path: 'test-results/visualisation-premiers-pas.png',
  });
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Aide' })
    .click();
  await page.getByRole('navigation').getByRole('link', { name: 'Jeu' }).click();
  expect(
    await page.evaluate(async () => {
      const { getGameSession } = await import('/src/main.js');
      return (
        (await getGameSession()).simulation === window.sceneSession.simulation
      );
    }),
  ).toBe(true);
  expect(page.workers()).toHaveLength(1);
});

test('scènes remplacées atomiquement et cadrage des bornes qui grandissent puis rétrécissent', async ({
  page,
}) => {
  test.skip(external, 'Fixtures de scène sous Vite.');
  await openSession(page);
  await page.evaluate(() =>
    window.sceneSession.view.updateScene({
      ant: { x: -3, y: -1, orientation: 'west' },
      stepCount: 10,
      blackCells: [
        { x: -3, y: -1 },
        { x: 100, y: 40 },
      ],
    }),
  );
  await page.getByRole('button', { name: 'Taille max', exact: true }).click();
  const large = Number(
    await page.getByLabel('Zoom', { exact: true }).inputValue(),
  );
  await page.evaluate(() =>
    window.sceneSession.view.updateScene({
      ant: { x: -3, y: -1, orientation: 'south' },
      stepCount: 11,
      blackCells: [{ x: -3, y: -1 }],
    }),
  );
  await expect(page.getByLabel('Zoom', { exact: true })).toHaveValue('160');
  expect(large).toBeLessThan(160);
  expect(
    await page.evaluate(() => {
      try {
        window.sceneSession.view.updateScene({
          ant: { x: 0, y: 0, orientation: 'bad' },
          stepCount: 12,
          blackCells: [],
        });
      } catch (error) {
        return error.name;
      }
    }),
  ).toBe('TypeError');
  expect(await page.evaluate(() => window.sceneSession.view.stepCount)).toBe(
    11,
  );
  await page.evaluate(() =>
    window.sceneSession.view.updateScene({
      ant: { x: 0, y: 0, orientation: 'north' },
      stepCount: 12,
      blackCells: [],
    }),
  );
  await expect(page.getByLabel('Zoom', { exact: true })).toHaveValue('32');
});

test('calcul masqué puis reprise de l’image et monde au million de pas', async ({
  page,
}) => {
  test.setTimeout(120000);
  test.skip(external, 'Pilotage source par API sous Vite.');
  await openSession(page);
  await page.getByLabel('Zoom', { exact: true }).fill('64');
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Aide' })
    .click();
  await page.evaluate(() => window.sceneSession.simulation.runUntil(1000000));
  expect(await page.evaluate(() => window.sceneSession.view.stepCount)).toBe(0);
  await page.getByRole('navigation').getByRole('link', { name: 'Jeu' }).click();
  await expect
    .poll(() => page.evaluate(() => window.sceneSession.view.stepCount))
    .toBe(1000000);
  await expect(page.getByLabel('Zoom', { exact: true })).toHaveValue('64');
  const reference = new LangtonEngine();
  reference.advance(1000000);
  expect(
    await page.evaluate(() => window.sceneSession.simulation.getState()),
  ).toEqual(reference.getState());
  await page.getByRole('button', { name: 'Taille max', exact: true }).click();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const overview = page.getByRole('img', { name: 'Pavage en croix navigable' });
  await expect
    .poll(() =>
      overview.evaluate((canvas) => {
        const pixels = canvas
          .getContext('2d')
          .getImageData(0, 0, canvas.width, canvas.height).data;
        return pixels.some((value, index) => index % 4 === 0 && value < 100);
      }),
    )
    .toBe(true);
  await overview.screenshot({ path: 'test-results/visualisation-million.png' });
});

test('vrais gestes tactiles : translation, pincement, annulation et retour à un doigt', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 430, height: 800 },
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  try {
    const page = await context.newPage();
    await page.goto('/#/jeu');
    await expect(
      page.getByRole('status', { name: 'État du pavage' }),
    ).toHaveText('Pavage prêt.');
    const canvas = page.getByRole('img', { name: 'Pavage en croix navigable' });
    const box = await canvas.boundingBox();
    const session = await context.newCDPSession(page);
    const touch = (type, touchPoints) =>
      session.send('Input.dispatchTouchEvent', { type, touchPoints });
    const a = { id: 1, x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await touch('touchStart', [a]);
    await touch('touchMove', [{ ...a, x: a.x + 40, y: a.y + 20 }]);
    await touch('touchEnd', []);
    await expect
      .poll(() =>
        pixel(canvas, box.width / 2 + 40 - 10, box.height / 2 + 20 + 10),
      )
      .toEqual([102, 102, 102, 255]);
    const left = { id: 1, x: a.x - 40, y: a.y };
    const right = { id: 2, x: a.x + 40, y: a.y };
    await touch('touchStart', [left, right]);
    await touch('touchMove', [
      { ...left, x: a.x - 80 },
      { ...right, x: a.x + 80 },
    ]);
    await touch('touchCancel', []);
    // Échelle observable via le panneau, même lorsqu'il est replié sur mobile.
    await expect(page.locator('#zoom')).toHaveValue('64');
    await touch('touchStart', [a]);
    await touch('touchMove', [{ ...a, x: a.x + 10 }]);
    await touch('touchEnd', []);
    await expect(canvas).not.toHaveClass(/dragging/);
    await page.screenshot({ path: 'test-results/visualisation-tactile.png' });
  } finally {
    await context.close();
  }
});

test('Worker réellement chargé par le site, y compris le build statique', async ({
  page,
}) => {
  await page.goto('/#/jeu');
  await expect.poll(() => page.workers().length).toBe(1);
  const worker = page.workers()[0];
  const request = (command, fields = {}) =>
    worker.evaluate(
      ({ command, fields }) =>
        new Promise((resolve) => {
          const id = 9000000;
          const post = self.postMessage.bind(self);
          self.postMessage = (message, ...args) => {
            post(message, ...args);
            if (message.type === 'response' && message.id === id) {
              self.postMessage = post;
              resolve(message);
            }
          };
          self.dispatchEvent(
            new MessageEvent('message', { data: { id, command, ...fields } }),
          );
        }),
      { command, fields },
    );
  await expect
    .poll(async () => (await request('getProgress')).result?.status)
    .toBe('ready');
  expect((await request('advance', { count: 5 })).result).toMatchObject({
    stepCount: 5,
    status: 'completed',
  });
  const canvas = page.getByRole('img', { name: 'Pavage en croix navigable' });
  const box = await canvas.boundingBox();
  await expect
    .poll(async () => {
      const [red, , blue] = await pixel(
        canvas,
        box.width / 2 - 32,
        box.height / 2,
      );
      return blue > red;
    })
    .toBe(true);
});

test('document masqué : aucune nouvelle scène, calcul conservé puis actualisation', async ({
  page,
}) => {
  test.skip(external, 'Pilotage source par API sous Vite.');
  await openSession(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.evaluate(() => window.sceneSession.simulation.runUntil(1234));
  expect(await page.evaluate(() => window.sceneSession.view.stepCount)).toBe(0);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect
    .poll(() => page.evaluate(() => window.sceneSession.view.stepCount))
    .toBe(1234);
  const reference = new LangtonEngine();
  reference.advance(1234);
  expect(
    await page.evaluate(() => window.sceneSession.simulation.getState()),
  ).toEqual(reference.getState());
});

test('fermer la session libère une capture en cours et les écouteurs de la vue', async ({
  page,
}) => {
  test.skip(external, 'Fermeture source par API sous Vite.');
  await openSession(page);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const canvas = page.getByRole('img', { name: 'Pavage en croix navigable' });
  await canvas.evaluate((element) =>
    element.addEventListener(
      'pointerdown',
      (event) => {
        window.capturedId = event.pointerId;
      },
      { once: true },
    ),
  );
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + 100, box.y + 100);
  await page.mouse.down();
  expect(
    await canvas.evaluate((element) =>
      element.hasPointerCapture(window.capturedId),
    ),
  ).toBe(true);
  await page.evaluate(() => window.sceneSession.dispose());
  expect(
    await canvas.evaluate((element) =>
      element.hasPointerCapture(window.capturedId),
    ),
  ).toBe(false);
  await page.mouse.move(box.x + 130, box.y + 120);
  await page.mouse.up();
  await page.setViewportSize({ width: 1100, height: 700 });
  await expect(canvas).not.toHaveClass(/dragging/);
  expect(errors).toEqual([]);
});

test('après fermeture, la navigation reste utilisable sans rappeler la vue détruite', async ({
  page,
}) => {
  test.skip(external, 'Fermeture source par API sous Vite.');
  await openSession(page);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.evaluate(async () => {
    await window.sceneSession.dispose();
    await window.sceneSession.dispose();
    // Les événements arrivant après fermeture ne doivent plus piloter la vue.
    document.querySelector('#zoom').dispatchEvent(new Event('input'));
    document.querySelector('[data-framing]').click();
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Aide' })
    .click();
  await expect(page.locator('section[data-page="aide"]')).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Jeu' }).click();
  await expect(page.locator('section[data-page="jeu"]')).toBeVisible();
  await expect(
    page.getByRole('status', { name: 'État du pavage' }),
  ).toContainText('fermée');
  expect(errors).toEqual([]);
  await expect(page.locator('#zoom')).toBeDisabled();
  expect(
    await page.evaluate(async () => {
      const { getGameSession } = await import('/src/main.js');
      try {
        await getGameSession();
      } catch (error) {
        return error.message;
      }
    }),
  ).toMatch(/fermée/);
  expect(page.workers()).toHaveLength(0);
});

test('le monde reste visible si le chargement de Lanto est retardé puis échoue', async ({
  page,
}) => {
  test.skip(
    external,
    'Pilotage source et interruption de ressource sous Vite.',
  );
  let receiveImage;
  const imageRequested = new Promise((resolve) => {
    receiveImage = resolve;
  });
  await page.route('**/Lanto-top.webp*', (route) => {
    if (route.request().resourceType() === 'image') receiveImage(route);
    else return route.continue();
  });
  await page.goto('/#/jeu', { waitUntil: 'domcontentloaded' });
  const imageRoute = await imageRequested;
  await page.evaluate(async () => {
    const { getGameSession } = await import('/src/main.js');
    window.sceneSession = await getGameSession();
    await window.sceneSession.simulation.setExecutionOptions({
      batchSize: 1000,
      batchDelayMs: 0,
    });
    window.sceneSession.view.updateOptions({ gridMode: 'none', origin: false });
    await window.sceneSession.simulation.advance(5);
  });
  await expect
    .poll(() => page.evaluate(() => window.sceneSession.view.stepCount))
    .toBe(5);
  const canvas = page.getByRole('img', { name: 'Pavage en croix navigable' });
  const box = await canvas.boundingBox();
  // La case (1, 0) est noire après cinq pas ; son rendu ne dépend pas du sprite.
  const blackCell = () => pixel(canvas, box.width / 2 + 32, box.height / 2);
  await expect.poll(blackCell).toEqual([0, 0, 0, 255]);
  await imageRoute.abort();
  await expect(
    page.getByRole('status', { name: 'État du pavage' }),
  ).toContainText('Impossible de charger');
  await expect.poll(blackCell).toEqual([0, 0, 0, 255]);
  await expect
    .poll(() => pixel(canvas, box.width / 2 - 32, box.height / 2))
    .toEqual([255, 255, 255, 255]);
  await page.evaluate(() => window.sceneSession.simulation.step());
  await expect
    .poll(() => page.evaluate(() => window.sceneSession.view.stepCount))
    .toBe(6);
  await expect.poll(blackCell).toEqual([0, 0, 0, 255]);
  await expect
    .poll(() => pixel(canvas, box.width / 2 - 32, box.height / 2))
    .toEqual([0, 0, 0, 255]);
});
