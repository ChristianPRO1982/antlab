import { expect, test } from '@playwright/test';

test('quatre affichages indépendants et contours seuls', async ({ page }) => {
  await page.goto('/#/jeu');
  const buttons = page
    .getByRole('group', { name: 'Affichage', exact: true })
    .getByRole('button');
  await expect(buttons).toHaveCount(4);
  for (const button of await buttons.all())
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  const grid = page.getByRole('button', { name: 'Grille simple', exact: true });
  const outlines = page.getByRole('button', {
    name: 'Grille « + »',
    exact: true,
  });
  await page
    .getByRole('button', { name: 'Repérer l’origine', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Afficher Lanto', exact: true })
    .click();
  const canvas = page.locator('canvas');
  const colors = () =>
    canvas.evaluate((e) => {
      const data = e
        .getContext('2d')
        .getImageData(0, 0, e.width, e.height).data;
      let gray = 0,
        blue = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 250 && data[i] === data[i + 1] && data[i] === data[i + 2])
          gray++;
        if (data[i + 2] > data[i + 1] && data[i + 1] > data[i]) blue++;
      }
      return { gray: gray > 0, blue: blue > 0 };
    });
  await expect.poll(colors).toEqual({ gray: true, blue: true });
  await grid.click();
  await expect.poll(colors).toEqual({ gray: false, blue: true });
  await outlines.click();
  await expect.poll(colors).toEqual({ gray: false, blue: false });
  await grid.press('Enter');
  await expect.poll(colors).toEqual({ gray: true, blue: false });
  await outlines.press('Space');
  await expect.poll(colors).toEqual({ gray: true, blue: true });
  for (const viewport of [
    { width: 1600, height: 900 },
    { width: 1000, height: 430 },
    { width: 390, height: 700 },
  ]) {
    await page.setViewportSize(viewport);
    if (await buttons.first().isHidden())
      await page
        .getByRole('button', { name: 'Redimensionner ou replier les options' })
        .click();
    const boxes = await Promise.all(
      (await buttons.all()).map((b) => b.boundingBox()),
    );
    expect(new Set(boxes.map((b) => b.y)).size).toBe(1);
    expect(
      boxes.every((b) => b.width > 0 && b.x + b.width <= viewport.width),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/affichage-${viewport.width}.png`,
    });
  }
});

test('affichage conservé et état scientifique inchangé', async ({ page }) => {
  test.skip(
    Boolean(process.env.TEST_BASE_URL),
    'Lecture de session sous Vite.',
  );
  await page.goto('/#/jeu');
  await expect(page.locator('[data-action="step"]')).toBeEnabled();
  await page.locator('[data-action="step"]').click();
  await expect(page.locator('#step-count')).toHaveText('1');
  const state = () =>
    page.evaluate(async () => {
      const { getGameSession } = await import('/src/main.js');
      return (await getGameSession()).simulation.getState();
    });
  const before = await state();
  for (const name of [
    'Grille simple',
    'Grille « + »',
    'Repérer l’origine',
    'Afficher Lanto',
  ])
    await page.getByRole('button', { name, exact: true }).click();
  expect(await state()).toEqual(before);
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Aide' })
    .click();
  await page.getByRole('navigation').getByRole('link', { name: 'Jeu' }).click();
  await page.locator('[data-action="reset"]').click();
  await expect(page.locator('#step-count')).toHaveText('0');
  for (const button of await page
    .getByRole('group', { name: 'Affichage', exact: true })
    .getByRole('button')
    .all())
    await expect(button).toHaveAttribute('aria-pressed', 'false');
  expect(
    await page.evaluate(async () => {
      const { getGameSession } = await import('/src/main.js');
      const { view } = await getGameSession();
      try {
        view.updateOptions({ grid: 'yes' });
      } catch (error) {
        return error.name;
      }
    }),
  ).toBe('TypeError');
});
