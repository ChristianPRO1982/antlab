import { expect, test } from '@playwright/test';

async function pixel(canvas, x, y) {
  return canvas.evaluate(
    (element, point) => {
      const rect = element.getBoundingClientRect();
      return Array.from(
        element
          .getContext('2d')
          .getImageData(
            Math.round((point.x * element.width) / rect.width),
            Math.round((point.y * element.height) / rect.height),
            1,
            1,
          ).data,
      );
    },
    { x, y },
  );
}

async function expectMarker(canvas, x, y) {
  await expect.poll(() => pixel(canvas, x, y)).toEqual([102, 102, 102, 255]);
}

test('pavage chargé, point origine et frontières des croix', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const response = await page.goto('/#/jeu');
  expect(response.status()).toBe(200);
  await expect(page).toHaveTitle('AntLab — Jeu');
  await expect(
    page.getByRole('heading', { name: 'Jeu', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('status', { name: 'État du pavage' })).toHaveText(
    'Pavage prêt.',
  );
  const canvas = page.getByRole('img', { name: 'Pavage en croix navigable' });
  const box = await canvas.boundingBox();
  await expectMarker(canvas, box.width / 2 - 10, box.height / 2 + 10);
  // Comparer les bandes réellement dessinées, loin des intersections.
  const bands = await canvas.evaluate((element) => {
    const { width, height } = element.getBoundingClientRect();
    const context = element.getContext('2d');
    const ratio = element.width / width;
    function band(cy) {
      let weight = 0;
      for (let offset = -3; offset <= 3; offset++) {
        const [red] = context.getImageData(
          // Croix voisine identique (période 5), à l'écart du sprite de Lanto.
          Math.round((width / 2 + 5 * 32 + 4) * ratio),
          Math.round((cy + offset) * ratio),
          1,
          1,
        ).data;
        weight += 255 - red;
      }
      return weight;
    }
    return { inner: band(height / 2 - 16), outer: band(height / 2 - 48) };
  });
  expect(bands.inner).toBeGreaterThan(0);
  // Normaliser par les couleurs pour mesurer aussi l'épaisseur, pas seulement le contraste.
  expect(bands.outer / (255 - 85)).toBeGreaterThan(
    (bands.inner / (255 - 204)) * 1.6,
  );
  const [red, , blue] = await pixel(canvas, box.width / 2, box.height / 2);
  expect(blue).toBeGreaterThan(red);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/pavage.png' });
});

test('glissement, capture hors zone et fin du geste', async ({ page }) => {
  await page.goto('/#/jeu');
  const canvas = page.getByRole('img', { name: 'Pavage en croix navigable' });
  await expect(page.getByRole('status', { name: 'État du pavage' })).toHaveText(
    'Pavage prêt.',
  );
  const box = await canvas.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 90, y - 40, { steps: 5 });
  await expect(canvas).toHaveCSS('cursor', 'grabbing');
  await expectMarker(canvas, box.width / 2 + 80, box.height / 2 - 30);
  await page.mouse.move(x + 90, box.y - 12, { steps: 5 });
  await page.mouse.up();
  await expect(canvas).toHaveCSS('cursor', 'grab');
  const markerX = box.width / 2 + 80;
  const markerY = -2;
  // Revenir sans bouton ne déplace plus le monde, puis ramener le repère à l'écran.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 80, { steps: 3 });
  await page.mouse.up();
  await expectMarker(canvas, markerX, markerY + 80);
});

test('molette dans les deux sens et redimensionnement', async ({ page }) => {
  await page.goto('/#/jeu');
  const canvas = page.getByRole('img', { name: 'Pavage en croix navigable' });
  await expect(page.getByRole('status', { name: 'État du pavage' })).toHaveText(
    'Pavage prêt.',
  );
  let box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -Math.log(2) * 1000);
  await expectMarker(canvas, box.width / 2 - 26, box.height / 2 + 26);
  await page.mouse.wheel(0, Math.log(2) * 1000);
  await expectMarker(canvas, box.width / 2 - 10, box.height / 2 + 10);
  await page.setViewportSize({ width: 800, height: 600 });
  box = await canvas.boundingBox();
  await expectMarker(canvas, box.width / 2 - 10, box.height / 2 + 10);
  expect(await canvas.evaluate((element) => element.width)).toBeGreaterThan(0);
});

test('annulation du pointeur et autres boutons sans déplacement', async ({
  page,
}) => {
  await page.goto('/#/jeu');
  const canvas = page.getByRole('img', { name: 'Pavage en croix navigable' });
  await expect(page.getByRole('status', { name: 'État du pavage' })).toHaveText(
    'Pavage prêt.',
  );
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2);
  await page.mouse.up({ button: 'right' });
  await expectMarker(canvas, box.width / 2 - 10, box.height / 2 + 10);
  await page.mouse.down();
  await expect(canvas).toHaveCSS('cursor', 'grabbing');
  await canvas.dispatchEvent('pointercancel', { pointerId: 1 });
  await expect(canvas).toHaveCSS('cursor', 'grab');
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2);
  await page.mouse.up();
  await expectMarker(canvas, box.width / 2 - 10, box.height / 2 + 10);
  await page.mouse.down();
  await expect(canvas).toHaveCSS('cursor', 'grabbing');
  await canvas.dispatchEvent('lostpointercapture', { pointerId: 1 });
  await expect(canvas).toHaveCSS('cursor', 'grab');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.up();
  await expectMarker(canvas, box.width / 2 - 10, box.height / 2 + 10);
});

test('dézoom étendu puis retour à la vue initiale', async ({ page }) => {
  await page.goto('/#/jeu');
  const canvas = page.getByRole('img', { name: 'Pavage en croix navigable' });
  await expect(page.getByRole('status', { name: 'État du pavage' })).toHaveText(
    'Pavage prêt.',
  );
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const before = await canvas.evaluate((element) => element.toDataURL());
  await page.mouse.wheel(0, 10000);
  await expect
    .poll(() => canvas.evaluate((element) => element.toDataURL()))
    .not.toBe(before);
  // Un second geste synchronise le contrôle avec la fin du dézoom à sa borne.
  await page.mouse.wheel(0, Math.log(2) * 1000);
  await page.screenshot({ path: 'test-results/pavage-dezoom.png' });
  await page.mouse.wheel(0, -Math.log(32) * 1000);
  await expectMarker(canvas, box.width / 2 - 10, box.height / 2 + 10);
});

test('rendu à forte densité et fenêtre étroite', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 480, height: 640 },
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
    expect(box.x + box.width).toBeLessThanOrEqual(480);
    expect(await canvas.evaluate((element) => element.width)).toBe(
      Math.round(box.width * 2),
    );
    await expectMarker(canvas, box.width / 2 - 10, box.height / 2 + 10);
    await page.screenshot({ path: 'test-results/pavage-densite-2.png' });
  } finally {
    await context.close();
  }
});
