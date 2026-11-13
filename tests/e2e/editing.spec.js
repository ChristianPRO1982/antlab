import { test, expect } from '@playwright/test';

test('clic, tracé, rectangle et reset au repos via le Worker', async ({
  page,
}) => {
  await page.goto('/#/jeu');
  await expect(page.locator('[data-action="step"]')).toBeEnabled();
  await page.getByRole('button', { name: 'Case', exact: true }).click();
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  const x = box.x + box.width / 2 + 64,
    y = box.y + box.height / 2;
  await page.mouse.click(x, y);
  await expect(page.locator('#black-count')).toHaveText('1');
  await expect(page.locator('#step-count')).toHaveText('0');
  await expect(page.locator('#central-rule')).toBeDisabled();
  await page
    .getByRole('button', { name: 'Tracé continu', exact: true })
    .click();
  await page.mouse.move(x, y + 64);
  await page.mouse.down();
  await page.mouse.move(x + 64, y + 64);
  await page.mouse.move(x, y + 64);
  await page.mouse.up();
  await expect(page.locator('#black-count')).toHaveText('4');
  await page.getByRole('button', { name: 'Rectangle', exact: true }).click();
  await page.locator('#edit-fill').selectOption('white');
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 64, y + 64);
  await page.mouse.up();
  await expect(page.locator('#black-count')).toHaveText('0');
  await page.locator('[data-action="reset"]').click();
  await expect(page.locator('#central-rule')).toBeEnabled();
});

test('édition en pause Maximum et désactivation à la reprise', async ({
  page,
}) => {
  await page.goto('/#/jeu');
  await expect(page.locator('[data-action="step"]')).toBeEnabled();
  await page.getByLabel('Vitesse d’exécution').selectOption('maximum');
  await page.locator('[data-action="play"]').click();
  await page.locator('[data-action="play"]').click();
  await expect(page.locator('#simulation-status')).toHaveText('En pause');
  const count = await page.locator('#step-count').textContent();
  await page.getByRole('button', { name: 'Case', exact: true }).click();
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.click(box.x + 20, box.y + 20);
  await expect(page.locator('#step-count')).toHaveText(count);
  await page.locator('[data-action="play"]').click();
  await expect(
    page.getByRole('button', { name: 'Case', exact: true }),
  ).toBeDisabled();
  await page.locator('[data-action="play"]').click();
});

test('rectangle annulé par Échap sans écriture', async ({ page }) => {
  await page.goto('/#/jeu');
  await expect(page.locator('[data-action="step"]')).toBeEnabled();
  await page.getByRole('button', { name: 'Rectangle', exact: true }).click();
  const b = await page.locator('canvas').boundingBox();
  await page.mouse.move(b.x + 50, b.y + 50);
  await page.mouse.down();
  await page.mouse.move(b.x + 150, b.y + 150);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('#black-count')).toHaveText('0');
});

test('dessin tactile et second contact annulent le rectangle', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1100, height: 800 },
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    await page.goto('/#/jeu');
    await expect(page.locator('[data-action="step"]')).toBeEnabled();
    await page.getByRole('button', { name: 'Case', exact: true }).click();
    const box = await page.locator('canvas').boundingBox();
    await page.touchscreen.tap(box.x + 30, box.y + 30);
    await expect(page.locator('#black-count')).toHaveText('1');
    await page.getByRole('button', { name: 'Rectangle', exact: true }).click();
    const cdp = await context.newCDPSession(page);
    const a = { id: 1, x: box.x + 100, y: box.y + 100 };
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [a],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [a, { id: 2, x: a.x + 60, y: a.y }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await expect(page.locator('#black-count')).toHaveText('1');
  } finally {
    await context.close();
  }
});

test('cadences demandées : édition active jusqu’à 100, refus au-delà', async ({
  page,
}) => {
  await page.goto('/#/jeu');
  await expect(page.locator('[data-action="step"]')).toBeEnabled();
  for (const speed of ['1', '10', '100', '1000', 'maximum']) {
    await page.getByLabel('Vitesse d’exécution').selectOption(speed);
    await page.locator('[data-action="play"]').click();
    const tool = page.getByRole('button', { name: 'Case', exact: true });
    if (['1', '10', '100'].includes(speed)) await expect(tool).toBeEnabled();
    else await expect(tool).toBeDisabled();
    await page.locator('[data-action="cancel"]').click();
    await expect(tool).toBeEnabled();
  }
});

test('caméra figée pendant le geste puis cadrage rétabli', async ({ page }) => {
  test.skip(
    Boolean(process.env.TEST_BASE_URL),
    'Inspection des coordonnées sous Vite.',
  );
  await page.goto('/#/jeu');
  await expect(page.locator('[data-action="step"]')).toBeEnabled();
  await page.getByRole('button', { name: 'Taille max', exact: true }).click();
  await page.getByRole('button', { name: 'Rectangle', exact: true }).click();
  const b = await page.locator('canvas').boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  expect(
    await page.evaluate(async () => {
      const { getGameSession } = await import('/src/main.js');
      const { view } = await getGameSession();
      const before = view.cellAt(20, 20);
      view.setZoom(128);
      return JSON.stringify(before) === JSON.stringify(view.cellAt(20, 20));
    }),
  ).toBe(true);
  await page.mouse.move(b.x + b.width / 2 + 32, b.y + b.height / 2 + 32);
  await page.mouse.up();
  await expect(page.getByLabel('Zoom', { exact: true })).toHaveValue('160');
  await page.getByRole('button', { name: 'Rectangle', exact: true }).click();
  await page.mouse.move(b.x + 100, b.y + 100);
  await page.mouse.down();
  await page.mouse.move(b.x + 130, b.y + 100);
  await page.mouse.up();
  await expect(
    page.getByRole('button', { name: 'Taille max', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
});
