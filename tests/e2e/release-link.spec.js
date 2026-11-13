import { expect, test } from '@playwright/test';

const endpoint =
  'https://api.github.com/repos/ChristianPRO1982/antlab/releases/latest';

test('version entre Lanto et Accueil, lien exact et affichage mobile', async ({
  page,
}) => {
  let requests = 0;
  await page.route(endpoint, (route) => {
    requests++;
    return route.fulfill({ json: { tag_name: 'v1.5.0' } });
  });
  await page.goto('/');
  const release = page.locator('.release-link');
  await expect(release).toHaveText('1.5.0');
  await expect(release).toHaveAttribute(
    'href',
    'https://github.com/ChristianPRO1982/antlab/releases/tag/v1.5.0',
  );
  await expect(release).toHaveAccessibleName(
    'Dernière release publiée : 1.5.0',
  );
  expect(
    await release.evaluate(
      (link) =>
        link.previousElementSibling.classList.contains('brand') &&
        link.nextElementSibling.tagName === 'NAV',
    ),
  ).toBe(true);
  await page.getByRole('navigation').getByRole('link', { name: 'Jeu' }).click();
  await expect(release).toHaveText('1.5.0');
  expect(requests).toBe(1);
  await page.setViewportSize({ width: 320, height: 640 });
  await expect(release).toBeVisible();
  await expect(
    page.getByRole('navigation').getByRole('link', { name: 'Accueil' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('la version suit le tag retourné par GitHub', async ({ page }) => {
  await page.route(endpoint, (route) =>
    route.fulfill({ json: { tag_name: 'v1.6.0' } }),
  );
  await page.goto('/');
  await expect(page.locator('.release-link')).toHaveText('1.6.0');
  await expect(page.locator('.release-link')).toHaveAttribute(
    'href',
    'https://github.com/ChristianPRO1982/antlab/releases/tag/v1.6.0',
  );
});

for (const failure of ['http', 'network', 'invalid']) {
  test(`GitHub indisponible (${failure}) : lien de secours sans bloquer le jeu`, async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route(endpoint, (route) =>
      failure === 'network'
        ? route.abort()
        : route.fulfill({
            status: failure === 'http' ? 403 : 200,
            json: { tag_name: 'invalid' },
          }),
    );
    await page.goto('/#/jeu');
    const release = page.locator('.release-link');
    await expect(release).toHaveText('Releases');
    await expect(release).toHaveAttribute(
      'href',
      'https://github.com/ChristianPRO1982/antlab/releases',
    );
    await expect(release).toHaveAttribute('title', /Version indisponible/);
    await expect(page.locator('[data-action="step"]')).toBeEnabled();
    expect(errors).toEqual([]);
  });
}
