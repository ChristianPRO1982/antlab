import { expect, test } from '@playwright/test';

const handleName = 'Redimensionner ou replier les options';

test('navigation commune, images, favicon et historique', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const navigation = page.getByRole('navigation', {
    name: 'Navigation principale',
  });
  await expect(
    navigation.getByRole('link', { name: 'Accueil', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(
    page.getByRole('heading', { name: 'AntLab', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Lanto, la mascotte d’AntLab' }),
  ).toBeVisible();
  const favicon = await page.locator('link[rel="icon"]').getAttribute('href');
  expect((await page.request.get(favicon)).ok()).toBe(true);
  expect(
    await page
      .locator('img')
      .evaluateAll((images) =>
        images.every((image) => image.complete && image.naturalWidth > 0),
      ),
  ).toBe(true);
  await page.getByRole('link', { name: 'Explorer le jeu' }).click();
  await expect(page).toHaveURL(/#\/jeu$/);
  const active = navigation.getByRole('link', { name: 'Jeu', exact: true });
  await expect(active).toHaveAttribute('aria-current', 'page');
  await expect(active).toHaveCSS('border-top-style', 'solid');
  await navigation.getByRole('link', { name: 'Aide', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Quelques repères pour explorer' }),
  ).toBeVisible();
  await page.goBack();
  await expect(active).toHaveAttribute('aria-current', 'page');
  await page.getByRole('link', { name: 'Lanto — Accueil' }).click();
  await expect(
    navigation.getByRole('link', { name: 'Accueil', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/design-accueil.png' });
  await navigation.getByRole('link', { name: 'Aide', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Quelques repères pour explorer' }),
  ).toBeVisible();
  await page.screenshot({
    path: 'test-results/design-aide.png',
    fullPage: true,
  });
});

test('panneau redimensionnable, seuil, commandes et clavier', async ({
  page,
}) => {
  await page.goto('/#/jeu');
  const handle = page.getByRole('button', { name: handleName });
  const panel = page.getByRole('complementary', { name: 'Options du jeu' });
  const canvas = page.getByRole('img', { name: 'Pavage en croix navigable' });
  await expect(panel).toBeVisible();
  let box = await panel.boundingBox();
  expect(box.width).toBeCloseTo(1280 * 0.28 - 14, 0);
  await expect(page.getByRole('status', { name: 'État du pavage' })).toHaveText(
    'Pavage prêt.',
  );
  await page.screenshot({ path: 'test-results/design-jeu-initial.png' });
  await expect(
    page.getByRole('button', { name: 'Lecture / pause', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Réinitialiser la simulation' }),
  ).toBeDisabled();
  await expect(page.getByLabel('Vitesse d’exécution')).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Lecture / pause flottante' }),
  ).toBeHidden();
  const handleBox = await handle.boundingBox();
  await page.mouse.move(handleBox.x + 7, handleBox.y + 150);
  await page.mouse.down();
  await page.mouse.move(1280 * 0.6, handleBox.y + 150);
  await page.mouse.up();
  box = await panel.boundingBox();
  expect(box.width).toBeGreaterThan(1280 * 0.38);
  const grid = await canvas.boundingBox();
  expect(grid.x + grid.width).toBeLessThanOrEqual(box.x);
  await handle.click();
  await expect(panel).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Lecture / pause flottante' }),
  ).toBeVisible();
  await handle.press('Enter');
  await expect(panel).toBeVisible();
  const before = await panel.boundingBox();
  await handle.press('ArrowLeft');
  expect((await panel.boundingBox()).width).toBeGreaterThan(before.width);
  const current = await handle.boundingBox();
  await page.mouse.move(current.x + 7, current.y + 150);
  await page.mouse.down();
  await page.mouse.move(1280 * 0.92, current.y + 150);
  await page.mouse.up();
  await expect(panel).toBeHidden();
  await handle.press('Space');
  await expect(panel).toBeVisible();
  const rememberedWidth = (await panel.boundingBox()).width;
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Aide' })
    .click();
  await page.getByRole('navigation').getByRole('link', { name: 'Jeu' }).click();
  expect((await panel.boundingBox()).width).toBe(rememberedWidth);
  await page.screenshot({ path: 'test-results/design-jeu.png' });
});

test('panneau minimal sans débordement sur petit ordinateur', async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto('/#/jeu');
  const handle = page.getByRole('button', { name: handleName });
  const start = await handle.boundingBox();
  await page.mouse.move(start.x + 7, start.y + 100);
  await page.mouse.down();
  await page.mouse.move(start.x + 7 + 800 * 0.13, start.y + 100);
  await page.mouse.up();
  const panel = page.getByRole('complementary', { name: 'Options du jeu' });
  await expect(panel).toBeVisible();
  expect((await panel.boundingBox()).width).toBeCloseTo(800 * 0.15 - 14, 0);
  for (const region of [
    page.locator('.panel-heading'),
    page.getByRole('region', { name: 'Règles du jeu' }),
    page.getByRole('group', { name: 'Commandes de simulation' }),
  ]) {
    expect(
      await region.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
  }
});

test('options visuelles, zoom synchronisé et conservation entre pages', async ({
  page,
}) => {
  await page.goto('/#/jeu');
  const canvas = page.getByRole('img', { name: 'Pavage en croix navigable' });
  await expect(page.getByRole('status', { name: 'État du pavage' })).toHaveText(
    'Pavage prêt.',
  );
  const image = () => canvas.evaluate((element) => element.toDataURL());
  const before = await image();
  await page.getByLabel('Afficher Lanto').uncheck();
  await expect.poll(image).not.toBe(before);
  await page.getByLabel('Grille', { exact: true }).selectOption('none');
  await page.getByLabel('Repérer l’origine').uncheck();
  await expect
    .poll(() =>
      canvas.evaluate((element) => {
        const pixels = element
          .getContext('2d')
          .getImageData(0, 0, element.width, element.height).data;
        return pixels.every((value) => value === 255);
      }),
    )
    .toBe(true);
  await page.getByLabel('Grille', { exact: true }).selectOption('crosses');
  const zoom = page.getByLabel('Zoom', { exact: true });
  await zoom.fill('64');
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, Math.log(2) * 1000);
  await expect
    .poll(async () => Number(await zoom.inputValue()))
    .toBeCloseTo(32, 1);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2);
  await page.mouse.up();
  const moved = await image();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Aide' })
    .click();
  await page.getByRole('navigation').getByRole('link', { name: 'Jeu' }).click();
  await expect.poll(image).toBe(moved);
  await expect(page.getByLabel('Afficher Lanto')).not.toBeChecked();
  const zoomBeforeCenter = await zoom.inputValue();
  await page
    .getByRole('button', { name: 'Centrer le monde', exact: true })
    .click();
  await expect(zoom).toHaveValue(zoomBeforeCenter);
  await expect.poll(image).not.toBe(moved);
});

test('options défilantes et commandes toujours visibles', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 430 });
  await page.goto('/#/jeu');
  const scroller = page.getByRole('region', { name: 'Règles du jeu' });
  await scroller.evaluate((element) => {
    const content = document.createElement('div');
    content.style.height = '1000px';
    element.append(content);
  });
  expect(
    await scroller.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);
  const controls = page.getByRole('group', { name: 'Commandes de simulation' });
  const before = await controls.boundingBox();
  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  expect(await controls.boundingBox()).toEqual(before);
  expect(before.y + before.height).toBeLessThanOrEqual(430);
});

test('tiroir mobile et captures des trois pages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.screenshot({ path: 'test-results/design-accueil-mobile.png' });
  await page.getByRole('link', { name: 'Explorer le jeu' }).click();
  const panel = page.getByRole('complementary', { name: 'Options du jeu' });
  const handle = page.getByRole('button', { name: handleName });
  const canvas = page.getByRole('img', { name: 'Pavage en croix navigable' });
  await expect(panel).toBeHidden();
  const before = await canvas.boundingBox();
  await handle.click();
  await expect(panel).toBeVisible();
  expect((await canvas.boundingBox()).width).toBe(before.width);
  await page.screenshot({ path: 'test-results/design-jeu-mobile.png' });
  await handle.press('Escape');
  await expect(panel).toBeHidden();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Aide' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Quelques repères pour explorer' }),
  ).toBeVisible();
  await page.screenshot({
    path: 'test-results/design-aide-mobile.png',
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
