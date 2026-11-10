import './style.css';
import lantoTopURL from './assets/lanto/Lanto-top.webp';
import { SparseWorld } from './world.js';
import { mountPaving } from './paving-view.js';
import { mountOptionsPanel } from './options-panel.js';

const pages = [...document.querySelectorAll('[data-page]')];
const links = [...document.querySelectorAll('[data-route]')];
const status = document.querySelector('[role="status"]');
const zoom = document.querySelector('#zoom');
const zoomValue = document.querySelector('#zoom-value');
const framingButtons = [...document.querySelectorAll('[data-framing]')];
const world = new SparseWorld();
const sprite = new Image();
sprite.src = lantoTopURL;
let view = null;

const panel = mountOptionsPanel(
  document.querySelector('.sidebar'),
  document.querySelector('.panel-handle'),
  document.querySelector('#game-options'),
  document.querySelector('.floating-play'),
);

function renderRoute(focus = false) {
  const requested = window.location.hash.slice(2);
  const route = ['accueil', 'jeu', 'aide'].includes(requested)
    ? requested
    : 'accueil';
  panel.cancel();
  view?.setActive(false);
  for (const page of pages) page.hidden = page.dataset.page !== route;
  for (const link of links) {
    if (link.dataset.route === route) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  document.body.dataset.page = route;
  document.title = `AntLab — ${{ accueil: 'Accueil', jeu: 'Jeu', aide: 'Aide' }[route]}`;
  if (route === 'jeu') {
    try {
      if (!view)
        view = mountPaving(document.querySelector('canvas'), status, world, {
          sprite,
          onScaleChange(scale, minimumScale) {
            zoom.min = String(minimumScale);
            zoom.value = String(scale);
            const value =
              scale < 0.01
                ? scale.toExponential(2)
                : new Intl.NumberFormat('fr', {
                    maximumSignificantDigits: 3,
                  }).format(scale);
            zoomValue.textContent = `${value} px / case`;
          },
          onFramingChange(mode) {
            for (const button of framingButtons) {
              button.setAttribute(
                'aria-pressed',
                String(button.dataset.framing === mode),
              );
            }
          },
        });
      else view.setActive(true);
    } catch (error) {
      status.textContent = `Impossible d’afficher le pavage : ${error.message}`;
      status.classList.remove('sr-only');
      status.classList.add('view-error');
      console.error(error);
    }
  }
  if (focus)
    document
      .querySelector(`[data-page="${route}"] h1`)
      .focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

zoom.addEventListener('input', () => view?.setZoom(Number(zoom.value)));
for (const button of framingButtons) {
  button.addEventListener('click', () =>
    view?.selectFraming(button.dataset.framing),
  );
  if (button.dataset.framing === 'ant') {
    button.addEventListener('dblclick', () =>
      view?.selectFraming('follow-ant'),
    );
    button.addEventListener('keydown', (event) => {
      if (event.shiftKey && event.key === 'Enter') {
        event.preventDefault();
        view?.selectFraming('follow-ant');
      }
    });
  }
}
document.querySelector('#grid-mode').addEventListener('change', (event) => {
  view?.updateOptions({ gridMode: event.target.value });
});
for (const input of document.querySelectorAll('[data-option]')) {
  input.addEventListener('change', () =>
    view?.updateOptions({ [input.dataset.option]: input.checked }),
  );
}
window.addEventListener('hashchange', () => renderRoute(true));
renderRoute();
