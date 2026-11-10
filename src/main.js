import './style.css';
import lantoTopURL from './assets/lanto/Lanto-top.webp';
import { SparseWorld } from './world.js';
import { mountPaving } from './paving-view.js';
import { mountOptionsPanel } from './options-panel.js';
import { createSimulationClient } from './simulation-client.js';
import { connectSimulationView } from './simulation-view.js';

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
let sessionPromise = null;
let synchronizer = null;
let sessionDisposed = false;
const gameLifecycle = new AbortController();

function listenGame(target, type, callback) {
  target.addEventListener(type, callback, { signal: gameLifecycle.signal });
}

function updateVisibility() {
  if (sessionDisposed) return;
  const active = document.body.dataset.page === 'jeu' && !document.hidden;
  if (synchronizer) synchronizer.setActive(active);
  else view?.setActive(active);
}

export async function getGameSession() {
  if (sessionDisposed) throw new Error('La session de simulation est fermée.');
  if (!view)
    throw new Error('Ouvrir la page Jeu avant de demander sa session.');
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const simulation = await createSimulationClient();
      try {
        synchronizer = connectSimulationView(simulation, view);
        updateVisibility();
        return {
          simulation,
          view,
          async dispose() {
            if (sessionDisposed) return;
            sessionDisposed = true;
            gameLifecycle.abort();
            synchronizer.dispose();
            view.setError('La session de simulation est fermée.');
            view.dispose();
            for (const control of document.querySelectorAll(
              '#zoom, #grid-mode, [data-framing], [data-option]',
            )) {
              control.disabled = true;
            }
            await simulation.dispose();
          },
        };
      } catch (error) {
        await simulation.dispose();
        throw error;
      }
    })();
  }
  return sessionPromise;
}

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
  if (synchronizer) synchronizer.setActive(false);
  else view?.setActive(false);
  for (const page of pages) page.hidden = page.dataset.page !== route;
  for (const link of links) {
    if (link.dataset.route === route) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  document.body.dataset.page = route;
  document.title = `AntLab — ${{ accueil: 'Accueil', jeu: 'Jeu', aide: 'Aide' }[route]}`;
  if (route === 'jeu' && !sessionDisposed) {
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
      updateVisibility();
      void getGameSession().catch((error) =>
        view.setError(`Simulation indisponible : ${error.message}`),
      );
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

listenGame(zoom, 'input', () => view?.setZoom(Number(zoom.value)));
for (const button of framingButtons) {
  listenGame(button, 'click', () =>
    view?.selectFraming(button.dataset.framing),
  );
  if (button.dataset.framing === 'ant') {
    listenGame(button, 'dblclick', () => view?.selectFraming('follow-ant'));
    listenGame(button, 'keydown', (event) => {
      if (event.shiftKey && event.key === 'Enter') {
        event.preventDefault();
        view?.selectFraming('follow-ant');
      }
    });
  }
}
listenGame(document.querySelector('#grid-mode'), 'change', (event) => {
  view?.updateOptions({ gridMode: event.target.value });
});
for (const input of document.querySelectorAll('[data-option]')) {
  listenGame(input, 'change', () =>
    view?.updateOptions({ [input.dataset.option]: input.checked }),
  );
}
window.addEventListener('hashchange', () => renderRoute(true));
listenGame(document, 'visibilitychange', updateVisibility);
renderRoute();
