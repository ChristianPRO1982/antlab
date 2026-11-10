import { expect, test } from '@playwright/test';

test('trois boutons alignés, suivi exclusif et annulation manuelle', async ({
  page,
}) => {
  await page.goto('/#/jeu');
  const origin = page.getByRole('button', {
    name: 'Centrer le monde',
    exact: true,
  });
  const ant = page.getByRole('button', {
    name: 'Centrer sur la fourmi',
    exact: true,
  });
  const fit = page.getByRole('button', { name: 'Taille max', exact: true });
  await expect(origin).toBeVisible();
  const boxes = await Promise.all([
    origin.boundingBox(),
    ant.boundingBox(),
    fit.boundingBox(),
  ]);
  expect(boxes[0].y).toBe(boxes[1].y);
  expect(boxes[1].y).toBe(boxes[2].y);
  await ant.click();
  await expect(ant).toHaveAttribute('aria-pressed', 'false');
  await ant.dblclick();
  await expect(ant).toHaveAttribute('aria-pressed', 'true');
  await expect(ant).toHaveCSS('color', 'rgb(8, 123, 255)');
  await fit.click();
  await expect(ant).toHaveAttribute('aria-pressed', 'false');
  await expect(fit).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: 'test-results/cadrage-actif.png' });
  await expect(page.getByLabel('Zoom', { exact: true })).toHaveValue('32');
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Aide' })
    .click();
  await page.getByRole('navigation').getByRole('link', { name: 'Jeu' }).click();
  await expect(fit).toHaveAttribute('aria-pressed', 'true');
  await origin.click();
  await expect(fit).toHaveAttribute('aria-pressed', 'false');
  await ant.press('Shift+Enter');
  await expect(ant).toHaveAttribute('aria-pressed', 'true');
  const canvas = page.getByRole('img', { name: 'Pavage en croix navigable' });
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + 100, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 150, box.y + 120);
  await page.mouse.up();
  await expect(ant).toHaveAttribute('aria-pressed', 'false');
  await fit.click();
  await page.mouse.move(box.x + 100, box.y + 100);
  await page.mouse.wheel(0, 100);
  await expect(fit).toHaveAttribute('aria-pressed', 'false');
  await fit.click();
  await page.getByLabel('Zoom', { exact: true }).fill('64');
  await expect(fit).toHaveAttribute('aria-pressed', 'false');
  await fit.click();
  await page.setViewportSize({ width: 1000, height: 600 });
  await expect(fit).toHaveAttribute('aria-pressed', 'true');
});

test('trois grilles distinctes et commandes fixes pendant le défilement des règles', async ({
  page,
}) => {
  await page.goto('/#/jeu');
  const selector = page.getByLabel('Grille', { exact: true });
  await expect(selector).toHaveValue('crosses');
  await page.getByLabel('Afficher Lanto').uncheck();
  await page.getByLabel('Repérer l’origine').uncheck();
  const canvas = page.getByRole('img', { name: 'Pavage en croix navigable' });
  const picture = () => canvas.evaluate((element) => element.toDataURL());
  const crosses = await picture();
  await selector.selectOption('simple');
  await expect.poll(picture).not.toBe(crosses);
  const simple = await picture();
  await selector.selectOption('none');
  await expect.poll(picture).not.toBe(simple);
  await expect
    .poll(() =>
      canvas.evaluate((element) =>
        element
          .getContext('2d')
          .getImageData(0, 0, element.width, element.height)
          .data.every((value) => value === 255),
      ),
    )
    .toBe(true);
  await page.setViewportSize({ width: 1000, height: 430 });
  const rules = page.getByRole('region', { name: 'Règles du jeu' });
  // Du contenu de règles est ajouté uniquement à la fixture navigateur.
  await rules.evaluate((element) => {
    const content = document.createElement('div');
    content.textContent = 'Règle de test';
    content.style.height = '1000px';
    element.append(content);
  });
  const controls = page.getByRole('group', { name: 'Vue et cadrage' });
  const simulation = page.getByRole('group', {
    name: 'Commandes de simulation',
  });
  const before = [await controls.boundingBox(), await simulation.boundingBox()];
  await rules.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  expect(await controls.boundingBox()).toEqual(before[0]);
  expect(await simulation.boundingBox()).toEqual(before[1]);
  expect(before[1].y + before[1].height).toBeLessThanOrEqual(430);
  await page.screenshot({ path: 'test-results/cadrage-petite-hauteur.png' });
});

test('bouton flottant agrandi en bas à droite et suivi conservé au repli', async ({
  page,
}) => {
  await page.goto('/#/jeu');
  const fit = page.getByRole('button', { name: 'Taille max', exact: true });
  await fit.click();
  const handle = page.getByRole('button', {
    name: 'Redimensionner ou replier les options',
  });
  await handle.click();
  const button = page.getByRole('button', {
    name: 'Lecture / pause flottante',
  });
  await expect(button).toBeVisible();
  const box = await button.boundingBox();
  const grid = await page
    .getByRole('img', { name: 'Pavage en croix navigable' })
    .boundingBox();
  expect(box.width).toBe(56);
  expect(box.height).toBe(56);
  expect(grid.x + grid.width - box.x - box.width).toBeCloseTo(20, 0);
  expect(grid.y + grid.height - box.y - box.height).toBeCloseTo(20, 0);
  await page.screenshot({ path: 'test-results/cadrage-replie.png' });
  await handle.click();
  await expect(fit).toHaveAttribute('aria-pressed', 'true');
  await expect(button).toBeHidden();
});
