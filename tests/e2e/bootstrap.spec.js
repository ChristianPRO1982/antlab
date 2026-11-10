import { expect, test } from '@playwright/test';

test('le socle charge HTML, JavaScript et CSS sans erreur', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  const response = await page.goto('/');
  expect(response.status()).toBe(200);
  await expect(page).toHaveTitle('AntLab — Socle technique');
  await expect(
    page.getByRole('heading', { name: 'AntLab', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Socle technique chargé.');
  await expect
    .poll(() => page.evaluate(() => document.styleSheets.length))
    .toBeGreaterThan(0);
  await expect(
    page.getByText('La simulation sera développée dans les prochaines étapes.'),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
