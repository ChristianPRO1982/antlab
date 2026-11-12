import { expect, test } from '@playwright/test';

const external = Boolean(process.env.TEST_BASE_URL);
const layouts = [
  { name: 'large', width: 1440, height: 900, panel: '28vw' },
  { name: 'étroit', width: 1000, height: 800, panel: '15vw' },
  { name: 'mobile', width: 390, height: 700 },
  { name: 'faible hauteur', width: 1000, height: 430, panel: '28vw' },
];

for (const layout of layouts) {
  test(`panneau stable pendant le retard de dessin : ${layout.name}`, async ({
    page,
  }) => {
    test.skip(external, 'Instantanés retenus par fixture sous Vite.');
    await page.setViewportSize({ width: layout.width, height: layout.height });
    await page.goto('/#/jeu');
    if (await page.locator('#game-options').isHidden())
      await page
        .getByRole('button', { name: 'Redimensionner ou replier les options' })
        .click();
    await expect(page.locator('[data-action="step"]')).toBeEnabled();
    if (layout.panel)
      await page.locator('.sidebar').evaluate((element, width) => {
        element.style.setProperty('--panel-width', width);
      }, layout.panel);
    await page.evaluate(async () => {
      const { getGameSession } = await import('/src/main.js');
      window.panelSession = await getGameSession();
    });
    await expect
      .poll(() => page.evaluate(() => window.panelSession.view.drawnStepCount))
      .toBe(0);
    // Retenir une vraie réponse du Worker rend le retard observable, quel que soit le CPU.
    await page.evaluate(() => {
      const client = window.panelSession.simulation;
      const getState = client.getState.bind(client);
      client.getState = async () => {
        const snapshot = await getState();
        return new Promise((resolve) => {
          window.releasePanelSnapshot = () => {
            client.getState = getState;
            window.releasePanelSnapshot = null;
            resolve(snapshot);
          };
        });
      };
      window.panelPositions = [];
      function sample() {
        window.panelPositions.push(
          ['.display-controls', '.view-controls', '.simulation-controls'].map(
            (selector) =>
              document.querySelector(selector).getBoundingClientRect().y,
          ),
        );
        window.panelFrame = requestAnimationFrame(sample);
      }
      window.samplePanel = sample;
      sample();
    });
    await page.locator('[data-action="step"]').click();
    await expect(page.locator('#displayed-step')).toHaveText(
      'Étape affichée : 0',
    );
    await page.waitForFunction(() => Boolean(window.releasePanelSnapshot));
    await page.evaluate(() => window.releasePanelSnapshot());
    await expect
      .poll(() => page.evaluate(() => window.panelSession.view.drawnStepCount))
      .toBe(1);
    await expect(page.locator('#displayed-step')).toBeEmpty();
    const ranges = await page.evaluate(() => {
      cancelAnimationFrame(window.panelFrame);
      return [0, 1, 2].map((index) => {
        const values = window.panelPositions.map((sample) => sample[index]);
        return Math.max(...values) - Math.min(...values);
      });
    });
    expect(ranges).toEqual([0, 0, 0]);

    await page.getByLabel('Vitesse d’exécution').selectOption('1');
    await page.evaluate(() => {
      window.panelPositions = [];
      window.samplePanel();
    });
    await page.locator('[data-action="play"]').click();
    await expect
      .poll(() => page.locator('#step-count').textContent().then(Number))
      .toBeGreaterThanOrEqual(3);
    await page.locator('[data-action="play"]').click();
    await expect(page.locator('#simulation-status')).toHaveText('En pause');
    const paused = Number(await page.locator('#step-count').textContent());
    await page.locator('[data-action="play"]').click();
    await expect
      .poll(() => page.locator('#step-count').textContent().then(Number))
      .toBeGreaterThan(paused);
    await page.locator('[data-action="play"]').click();
    await expect(page.locator('#simulation-status')).toHaveText('En pause');
    await page.locator('[data-action="cancel"]').click();
    await page.getByLabel('Vitesse d’exécution').selectOption('maximum');
    await page.locator('#target-step').fill('5000');
    await page.locator('#reach-target').click();
    await expect(page.locator('#step-count')).toHaveText('5000');
    await expect(page.locator('#simulation-status')).toHaveText(
      'Cible atteinte',
    );
    await expect
      .poll(() => page.evaluate(() => window.panelSession.view.drawnStepCount))
      .toBe(5000);
    expect(
      await page.evaluate(() => {
        cancelAnimationFrame(window.panelFrame);
        return [0, 1, 2].map((index) => {
          const values = window.panelPositions.map((sample) => sample[index]);
          return Math.max(...values) - Math.min(...values);
        });
      }),
    ).toEqual([0, 0, 0]);

    // Valeurs d’interface uniquement, sans calcul scientifique démesuré.
    const fixture = await page.evaluate(async () => {
      const selectors = [
        '.display-controls',
        '.view-controls',
        '.simulation-controls',
      ];
      const positions = () =>
        selectors.map(
          (s) => document.querySelector(s).getBoundingClientRect().y,
        );
      const before = positions();
      for (const value of ['9', '10000', String(Number.MAX_SAFE_INTEGER)]) {
        for (const selector of ['#step-count', '#black-count'])
          document.querySelector(selector).textContent = value;
        document.querySelector('#displayed-step').textContent =
          `Étape affichée : ${value}`;
        await new Promise(requestAnimationFrame);
        const current = positions();
        if (current.some((y, i) => y !== before[i])) return { stable: false };
      }
      const elements = [
        ...document.querySelectorAll(
          '.simulation-counts output, #displayed-step, .fixed-controls',
        ),
      ];
      return {
        stable: true,
        fits: elements.every((e) => e.scrollWidth <= e.clientWidth),
        bottom: document
          .querySelector('.fixed-controls')
          .getBoundingClientRect().bottom,
        top: document.querySelector('.fixed-controls').getBoundingClientRect()
          .top,
        panelTop: document
          .querySelector('#game-options')
          .getBoundingClientRect().top,
      };
    });
    expect(fixture.stable).toBe(true);
    expect(fixture.fits).toBe(true);
    expect(fixture.top).toBeGreaterThanOrEqual(fixture.panelTop);
    expect(fixture.bottom).toBeLessThanOrEqual(layout.height);
    await page.screenshot({
      path: `test-results/panneau-stable-${layout.name}.png`,
    });
  });
}
