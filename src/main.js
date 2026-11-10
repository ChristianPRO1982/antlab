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
          onScaleChange(scale) {
            zoom.value = String(scale);
            zoomValue.textContent = `${new Intl.NumberFormat('fr', { maximumFractionDigits: 1 }).format(scale)} px / case`;
          },
        });
      else view.setActive(true);
    } catch (error) {
      status.textContent = `Impossible d’afficher le pavage : ${error.message}`;
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
document
  .querySelector('.recenter')
  .addEventListener('click', () => view?.recenter());
for (const input of document.querySelectorAll('[data-option]')) {
  input.addEventListener('change', () =>
    view?.updateOptions({ [input.dataset.option]: input.checked }),
  );
}
window.addEventListener('hashchange', () => renderRoute(true));
renderRoute();
