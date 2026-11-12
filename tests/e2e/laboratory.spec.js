import { expect, test } from '@playwright/test';
import { LangtonEngine } from '../../src/engine.js';

async function open(page) {
  await page.goto('/#/jeu');
  if (await page.locator('#game-options').isHidden())
    await page
      .getByRole('button', { name: 'Redimensionner ou replier les options' })
      .click();
  await expect(page.locator('[data-action="step"]')).toBeEnabled();
}
async function stepCount(page, count) {
  await expect(page.locator('#step-count')).toHaveText(String(count), {
    timeout: 30000,
  });
}

test('le vrai sprite suit les quatre orientations, la pause et le reset', async ({
  page,
}) => {
  await open(page);
  await page.getByLabel('Zoom', { exact: true }).fill('128');
  await page
    .getByRole('button', { name: 'Grille simple', exact: true })
    .click();
  await page.getByRole('button', { name: 'Grille « + »', exact: true }).click();
  await page
    .getByRole('button', { name: 'Repérer l’origine', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Centrer sur la fourmi', exact: true })
    .dblclick();

  async function expectSprite(count, direction) {
    await stepCount(page, count);
    await expect
      .poll(() =>
        page.evaluate(async (direction) => {
          const canvas = document.querySelector('canvas');
          const url = performance
            .getEntriesByType('resource')
            .find(
              ({ name, initiatorType }) =>
                initiatorType === 'img' && /Lanto-top.*\.webp/.test(name),
            )?.name;
          if (!url) return 1;
          const sprite = new Image();
          sprite.src = url;
          await sprite.decode();
          const expected = document.createElement('canvas');
          expected.width = canvas.width;
          expected.height = canvas.height;
          const context = expected.getContext('2d');
          const box = canvas.getBoundingClientRect();
          context.fillStyle = 'white';
          context.fillRect(0, 0, expected.width, expected.height);
          context.setTransform(
            canvas.width / box.width,
            0,
            0,
            canvas.height / box.height,
            canvas.width / 2,
            canvas.height / 2,
          );
          context.rotate((direction * Math.PI) / 2);
          const size = 0.9 * Number(document.querySelector('#zoom').value);
          context.drawImage(sprite, -size / 2, -size / 2, size, size);
          const actual = canvas
            .getContext('2d')
            .getImageData(0, 0, canvas.width, canvas.height).data;
          const reference = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          ).data;
          const blue = (pixels, i) =>
            pixels[i + 2] > pixels[i] + 30 &&
            pixels[i + 2] > pixels[i + 1] + 10;
          let mismatch = 0;
          let total = 0;
          for (let i = 0; i < actual.length; i += 4) {
            const a = blue(actual, i);
            const b = blue(reference, i);
            if (a || b) total++;
            if (a !== b) mismatch++;
          }
          return total ? mismatch / total : 1;
        }, direction),
      )
      .toBeLessThan(0.03);
  }

  await expectSprite(0, 0);
  for (let step = 1; step <= 5; step++) {
    await page.locator('[data-action="step"]').click();
    await expectSprite(step, [0, 1, 2, 3, 0, 3][step]);
    if (step <= 4)
      await page.locator('canvas').screenshot({
        path: `test-results/lanto-orientation-${step}.png`,
      });
  }
  await page.getByLabel('Vitesse d’exécution').selectOption('1');
  await page.locator('[data-action="play"]').click();
  await page.locator('[data-action="play"]').click();
  await expect(page.locator('#simulation-status')).toHaveText('En pause');
  const count = Number(await page.locator('#step-count').textContent());
  const reference = new LangtonEngine();
  reference.advance(count);
  await expectSprite(
    count,
    ['north', 'east', 'south', 'west'].indexOf(
      reference.getState().ant.orientation,
    ),
  );
  await page.locator('[data-action="reset"]').click();
  await expectSprite(0, 0);
});

test('règles, incompatibilités, premiers pas et réinitialisation', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await open(page);
  await page
    .getByLabel('Rotation horaire des branches', { exact: true })
    .check();
  await expect(
    page.getByLabel('Rotation horaire des branches', { exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel('Règle centrale', { exact: true })
    .selectOption('majority-wins');
  await expect(
    page.getByLabel('Rotation horaire des branches', { exact: true }),
  ).toBeDisabled();
  await expect(page.locator('#rules-notice')).toContainText('retirée');
  await page.getByLabel('Seuil de majorité').selectOption('2');
  await page
    .getByLabel('Règle centrale', { exact: true })
    .selectOption('single-flip');
  await page.locator('[data-action="step"]').click();
  await stepCount(page, 1);
  await expect(page.locator('#black-count')).toHaveText('1');
  await expect(
    page.getByLabel('Règle centrale', { exact: true }),
  ).toBeDisabled();
  await expect(page.locator('#rules-lock')).toContainText('Réinitialisez');
  await page
    .getByRole('button', { name: 'Réinitialiser la simulation' })
    .click();
  await stepCount(page, 0);
  await expect(
    page.getByLabel('Règle centrale', { exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel('Règle centrale', { exact: true })
    .selectOption('cross-flip');
  await page.locator('[data-action="step"]').click();
  await stepCount(page, 1);
  await expect(page.locator('#black-count')).toHaveText('5');
  expect(errors).toEqual([]);
});

test('cibles exactes, valeurs invalides, pause, vitesse, annulation et bouton flottant', async ({
  page,
}) => {
  await open(page);
  await page.getByLabel('Vitesse d’exécution').selectOption('maximum');
  await page.getByLabel('Étape cible', { exact: true }).fill('12');
  await page.getByRole('button', { name: 'Atteindre', exact: true }).click();
  await stepCount(page, 12);
  await expect(page.locator('#simulation-status')).toHaveText('Cible atteinte');
  await page.getByLabel('Étape cible', { exact: true }).fill('11');
  await page.getByRole('button', { name: 'Atteindre', exact: true }).click();
  await expect(page.locator('#target-error')).toContainText('passée');
  await stepCount(page, 12);
  for (const invalid of ['', '1.5', '-1', '9007199254740992']) {
    await page.getByLabel('Étape cible', { exact: true }).fill(invalid);
    await page.getByRole('button', { name: 'Atteindre', exact: true }).click();
    await expect(page.locator('#target-error')).not.toBeEmpty();
  }
  await page.getByLabel('Vitesse d’exécution').selectOption('1');
  await page.locator('[data-action="play"]').click();
  await expect(page.locator('#simulation-status')).toHaveText(
    'Calcul en cours',
  );
  await page.locator('[data-action="play"]').click();
  await expect(page.locator('#simulation-status')).toHaveText('En pause');
  await expect(page.locator('[data-action="step"]')).toBeDisabled();
  await page.getByLabel('Vitesse d’exécution').selectOption('1000');
  await page.locator('[data-action="play"]').click();
  await expect(page.locator('#simulation-status')).toHaveText(
    'Calcul en cours',
  );
  await page.locator('[data-action="cancel"]').click();
  await expect(page.locator('#simulation-status')).toHaveText('Calcul annulé');
  await page
    .getByRole('button', { name: 'Redimensionner ou replier les options' })
    .click();
  const floating = page.locator('.floating-play');
  await floating.click();
  await expect(floating).toHaveAttribute('aria-label', 'Pause flottante');
  await floating.click();
  await expect(floating).toHaveAttribute('aria-label', 'Reprendre flottante');
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Aide' })
    .click();
  await page.getByRole('navigation').getByRole('link', { name: 'Jeu' }).click();
  await expect(floating).toHaveAttribute('aria-label', 'Reprendre flottante');
});

test('paliers et progression interrompue conservent la cible', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('button', { name: '1 000 000', exact: true }).click();
  await page.getByRole('button', { name: 'Atteindre', exact: true }).click();
  await expect(page.locator('#simulation-status')).toHaveText(
    'Calcul en cours',
  );
  await page.locator('[data-action="play"]').click();
  await expect(page.locator('#simulation-status')).toHaveText('En pause');
  await expect(page.locator('#target-progress')).toBeVisible();
  await page.getByLabel('Vitesse d’exécution').selectOption('maximum');
  await page.locator('[data-action="play"]').click();
  await stepCount(page, 1000000);
  await expect(page.locator('#black-count')).toHaveText('114952');
  await expect(page.locator('#target-progress')).toHaveAttribute(
    'value',
    '1000000',
  );
});

test('clavier et mobile : commandes accessibles et caméra indépendante', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await open(page);
  await page.locator('[data-action="step"]').focus();
  await page.keyboard.press('Enter');
  await stepCount(page, 1);
  await page.screenshot({ path: 'test-results/laboratoire-mobile.png' });
  await page
    .getByRole('button', { name: 'Redimensionner ou replier les options' })
    .press('Escape');
  const canvas = page.locator('canvas');
  await canvas.focus();
  const before = await canvas.evaluate((element) => element.toDataURL());
  await canvas.press('ArrowLeft');
  await expect
    .poll(() => canvas.evaluate((element) => element.toDataURL()))
    .not.toBe(before);
  await canvas.press('+');
  await page
    .getByRole('button', { name: 'Redimensionner ou replier les options' })
    .click();
  await stepCount(page, 1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1000, height: 430 });
  const controls = await page.locator('.simulation-controls').boundingBox();
  expect(controls.y + controls.height).toBeLessThanOrEqual(430);
  await page.screenshot({ path: 'test-results/laboratoire-bureau.png' });
});

test('panne du Worker : dernier état conservé et réinitialisation explicite', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await open(page);
  await page.locator('[data-action="step"]').click();
  await stepCount(page, 1);
  await page.workers()[0].evaluate(() => self.postMessage({ type: 'invalid' }));
  await expect(page.locator('#simulation-status')).toHaveText(
    'Worker indisponible',
  );
  await expect(page.locator('#simulation-error')).not.toBeEmpty();
  await expect(page.locator('[data-action="play"]')).toBeDisabled();
  await expect(page.locator('#zoom')).toBeEnabled();
  await stepCount(page, 1);
  await page.locator('[data-action="reset"]').click();
  await stepCount(page, 0);
  await expect(page.locator('[data-action="step"]')).toBeEnabled();
  await expect(page.locator('#simulation-error')).toBeEmpty();
  expect(errors).toEqual([]);
});

test('chargement du Worker refusé : aucune valeur inventée et reprise volontaire', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*simulation-worker*', (route) => route.abort());
  await page.goto('/#/jeu');
  await expect(page.locator('#simulation-status')).toHaveText(
    'Worker indisponible',
  );
  await expect(page.locator('#step-count')).toHaveText('—');
  await expect(page.locator('[data-action="reset"]')).toBeEnabled();
  await page.unroute('**/*simulation-worker*');
  await page.locator('[data-action="reset"]').click();
  await stepCount(page, 0);
  await expect(page.locator('[data-action="step"]')).toBeEnabled();
  expect(errors).toEqual([]);
});

test('réinitialiser un calcul actif ignore son ancien rejet et conserve vitesse et caméra', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await open(page);
  await page.getByLabel('Zoom', { exact: true }).fill('64');
  await page.getByLabel('Vitesse d’exécution').selectOption('1');
  await page.getByRole('button', { name: '1 000 000', exact: true }).click();
  await page.getByRole('button', { name: 'Atteindre', exact: true }).click();
  await expect(page.locator('#simulation-status')).toHaveText(
    'Calcul en cours',
  );
  await page.locator('[data-action="reset"]').click();
  await expect(page.locator('#simulation-status')).toHaveText('Prêt');
  await stepCount(page, 0);
  await expect(page.locator('#simulation-error')).toBeEmpty();
  await expect(page.locator('#target-error')).toBeEmpty();
  await expect(page.getByLabel('Vitesse d’exécution')).toHaveValue('1');
  await expect(page.getByLabel('Zoom', { exact: true })).toHaveValue('64');
  await expect(
    page.getByLabel('Règle centrale', { exact: true }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
});

test('les paramètres choisis dans le formulaire produisent les états scientifiques attendus', async ({
  page,
}) => {
  await open(page);
  for (const rules of [
    { central: 'center-master' },
    { central: 'inverted-majority', threshold: 1 },
    { central: 'inverted-majority', threshold: 5 },
    { central: 'majority-wins', threshold: 2 },
    { central: 'single-flip', optional: ['rotate-branches-clockwise'] },
  ]) {
    await page.locator('[data-action="reset"]').click();
    await expect(page.locator('#central-rule')).toBeEnabled();
    await page.locator('#central-rule').selectOption(rules.central);
    if (rules.threshold)
      await page
        .locator('#majority-threshold')
        .selectOption(String(rules.threshold));
    if (rules.optional) await page.locator('#branch-rotation').check();
    await page.locator('#speed').selectOption('maximum');
    await page.locator('#target-step').fill('30');
    await page.locator('#reach-target').click();
    await stepCount(page, 30);
    const state = await page.workers()[0].evaluate(
      () =>
        new Promise((resolve) => {
          const post = self.postMessage.bind(self);
          const id = 9000001;
          self.postMessage = (message, ...args) => {
            post(message, ...args);
            if (message.type === 'response' && message.id === id) {
              self.postMessage = post;
              resolve(message.result);
            }
          };
          self.dispatchEvent(
            new MessageEvent('message', { data: { id, command: 'getState' } }),
          );
        }),
    );
    const reference = new LangtonEngine({ rules });
    reference.advance(30);
    expect(state).toEqual(reference.getState());
  }
});
