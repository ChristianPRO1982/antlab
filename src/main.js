import './style.css';
import lantoTopURL from './assets/lanto/Lanto-top.webp';
import { SparseWorld } from './world.js';
import { mountPaving } from './paving-view.js';
import { mountOptionsPanel } from './options-panel.js';
import { createGameSession } from './game-session.js';
import { mountLaboratory } from './laboratory-controls.js';
import { updateReleaseLink } from './release-link.js';

void updateReleaseLink(document.querySelector('.release-link'));

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
let session = null;
let laboratory = null;
let sessionDisposed = false;
const gameLifecycle = new AbortController();

function listenGame(target, type, callback) {
  target.addEventListener(type, callback, { signal: gameLifecycle.signal });
}

function updateVisibility() {
  if (sessionDisposed) return;
  const active = document.body.dataset.page === 'jeu' && !document.hidden;
  if (session) session.setActive(active);
  else view?.setActive(active);
}

export async function getGameSession() {
  if (sessionDisposed) throw new Error('La session de simulation est fermée.');
  if (!view)
    throw new Error('Ouvrir la page Jeu avant de demander sa session.');
  if (!sessionPromise) {
    sessionPromise = (async () => {
      session = await createGameSession(view, {
        onClose() {
          sessionDisposed = true;
          gameLifecycle.abort();
          laboratory?.dispose();
          for (const control of document.querySelectorAll(
            '#zoom, [data-framing], [data-option]',
          ))
            control.disabled = true;
        },
      });
      laboratory = mountLaboratory(session);
      updateVisibility();
      return session;
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
  if (session) session.setActive(false);
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
          onSceneChange() {
            laboratory?.refresh();
          },
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
for (const button of document.querySelectorAll('[data-option]')) {
  listenGame(button, 'click', () => {
    const enabled = button.getAttribute('aria-pressed') !== 'true';
    view?.updateOptions({ [button.dataset.option]: enabled });
    button.setAttribute('aria-pressed', String(enabled));
  });
}
window.addEventListener('hashchange', () => renderRoute(true));
listenGame(document, 'visibilitychange', updateVisibility);
renderRoute();
