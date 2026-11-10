import { Camera } from './camera.js';
import { drawPaving, GRID_MODES } from './renderer.js';
import { ViewFraming } from './view-framing.js';

export function mountPaving(
  canvas,
  status,
  world,
  {
    sprite = null,
    ant = { x: 0, y: 0 },
    onScaleChange = () => {},
    onFramingChange = () => {},
  } = {},
) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Le rendu Canvas 2D est indisponible.');
  const initial = canvas.getBoundingClientRect();
  const camera = new Camera(initial.width, initial.height);
  const framing = new ViewFraming(camera);
  const scene = { world, ant };
  const options = { gridMode: 'crosses', origin: true, lanto: true };
  let frame = null;
  let drag = null;
  let active = true;

  function report(message, error = false) {
    if (status.textContent !== message) status.textContent = message;
    status.classList.toggle('sr-only', !error);
    status.classList.toggle('view-error', error);
  }

  function notify() {
    onScaleChange(camera.scale, camera.minimumScale);
    onFramingChange(framing.mode);
  }

  function requestDraw() {
    if (!active || frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      const { width, height } = canvas.getBoundingClientRect();
      if (!active || width <= 0 || height <= 0 || (sprite && !sprite.complete))
        return;
      if (sprite && sprite.naturalWidth === 0) {
        report('Impossible de charger l’image de Lanto.', true);
        return;
      }
      try {
        camera.resize(width, height);
        framing.apply(scene);
        const density = window.devicePixelRatio || 1;
        const pixelWidth = Math.round(width * density);
        const pixelHeight = Math.round(height * density);
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
          canvas.width = pixelWidth;
          canvas.height = pixelHeight;
        }
        context.setTransform(
          pixelWidth / width,
          0,
          0,
          pixelHeight / height,
          0,
          0,
        );
        drawPaving(context, camera, world, options, sprite, ant);
        notify();
        report('Pavage prêt.');
      } catch (error) {
        if (!(error instanceof RangeError)) throw error;
        report(error.message, true);
      }
    });
  }

  function navigate(operation, manual = false) {
    try {
      operation();
      if (manual) framing.release();
      notify();
      requestDraw();
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      report(error.message, true);
    }
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (!active || event.button !== 0 || drag) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (dx || dy) navigate(() => camera.moveBy(dx, dy), true);
    drag.x = event.clientX;
    drag.y = event.clientY;
  });
  function stopDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const id = drag.id;
    drag = null;
    canvas.classList.remove('dragging');
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(type, stopDrag);
  }
  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      if (!event.deltaY) return;
      const rect = canvas.getBoundingClientRect();
      const unit =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
      const delta = Math.max(-10000, Math.min(10000, event.deltaY * unit));
      navigate(
        () =>
          camera.zoomAt(
            event.clientX - rect.left,
            event.clientY - rect.top,
            Math.exp(-delta * 0.001),
          ),
        true,
      );
    },
    { passive: false },
  );

  const resizeObserver = new ResizeObserver(requestDraw);
  resizeObserver.observe(canvas);
  window.addEventListener('resize', requestDraw);
  function watchDensity() {
    const query = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    query.addEventListener(
      'change',
      () => {
        requestDraw();
        watchDensity();
      },
      { once: true },
    );
  }
  watchDensity();
  if (sprite) {
    sprite.addEventListener('load', requestDraw);
    sprite.addEventListener('error', () => {
      report('Impossible de charger l’image de Lanto.', true);
      console.error(status.textContent);
    });
  }
  notify();
  requestDraw();
  return {
    setActive(value) {
      if (typeof value !== 'boolean')
        throw new TypeError('État de visibilité invalide.');
      active = value;
      if (!active) {
        if (drag) stopDrag({ pointerId: drag.id });
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
      } else requestDraw();
    },
    setZoom(scale) {
      if (typeof scale !== 'number' || !Number.isFinite(scale))
        throw new TypeError('Zoom invalide.');
      navigate(
        () =>
          camera.zoomAt(
            camera.width / 2,
            camera.height / 2,
            scale / camera.scale,
          ),
        true,
      );
    },
    selectFraming(action) {
      navigate(() => framing.select(action, scene));
    },
    updateOptions(changes) {
      for (const [key, value] of Object.entries(changes)) {
        const valid =
          key === 'gridMode'
            ? GRID_MODES.includes(value)
            : (key === 'origin' || key === 'lanto') &&
              typeof value === 'boolean';
        if (!valid) throw new TypeError('Réglage visuel invalide.');
      }
      Object.assign(options, changes);
      requestDraw();
    },
    // Point d'entrée des actualisations de scène ; aucune boucle de suivi au repos.
    refresh: requestDraw,
  };
}
