import { Camera } from './camera.js';
import { drawPaving, GRID_MODES } from './renderer.js';
import { ViewFraming } from './view-framing.js';
import { PointerGestures } from './navigation-gestures.js';
import { createScene } from './scene.js';

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
  let scene = { world, ant, stepCount: null };
  const options = { gridMode: 'crosses', origin: true, lanto: true };
  let frame = null;
  let active = true;
  let disposed = false;
  let externalError = null;
  let pointerKind = null;
  const gestures = new PointerGestures();
  const lifecycle = new AbortController();
  function listen(target, type, callback, options = {}) {
    target.addEventListener(type, callback, {
      ...options,
      signal: lifecycle.signal,
    });
  }
  function assertOpen() {
    if (disposed) throw new Error('La vue est fermée.');
  }

  function report(message, error = false) {
    if (externalError) {
      message = externalError;
      error = true;
    } else if (!error && sprite?.complete && sprite.naturalWidth === 0) {
      message = 'Impossible de charger l’image de Lanto.';
      error = true;
    }
    if (status.textContent !== message) status.textContent = message;
    status.classList.toggle('sr-only', !error);
    status.classList.toggle('view-error', error);
  }

  function notify() {
    onScaleChange(camera.scale, camera.minimumScale);
    onFramingChange(framing.mode);
  }

  function requestDraw() {
    if (disposed || !active || frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      const { width, height } = canvas.getBoundingClientRect();
      if (disposed || !active || width <= 0 || height <= 0) return;
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
        drawPaving(context, camera, scene.world, options, sprite, scene.ant);
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

  function localPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  listen(canvas, 'pointerdown', (event) => {
    const kind = event.pointerType === 'touch' ? 'touch' : 'mouse';
    if (
      !active ||
      event.button !== 0 ||
      (pointerKind && pointerKind !== kind) ||
      (kind === 'mouse' && gestures.ids.length)
    )
      return;
    const { x, y } = localPoint(event);
    if (!gestures.begin(event.pointerId, x, y)) return;
    pointerKind = kind;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('dragging');
  });
  listen(canvas, 'pointermove', (event) => {
    if (!active) return;
    const { x, y } = localPoint(event);
    const transform = gestures.move(event.pointerId, x, y);
    if (transform)
      navigate(
        () => camera.panZoomAt(transform.from, transform.to, transform.factor),
        true,
      );
  });
  function stopPointer(event) {
    const id = event.pointerId;
    if (!gestures.ids.includes(id)) return;
    gestures.end(id);
    if (!gestures.ids.length) {
      pointerKind = null;
      canvas.classList.remove('dragging');
    }
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }
  function stopGestures() {
    const ids = gestures.ids;
    gestures.clear();
    pointerKind = null;
    canvas.classList.remove('dragging');
    for (const id of ids)
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    listen(canvas, type, stopPointer);
  }
  listen(
    canvas,
    'wheel',
    (event) => {
      if (!active) return;
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

  const onResize = () => {
    stopGestures();
    requestDraw();
  };
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(canvas);
  listen(window, 'resize', onResize);
  listen(window, 'blur', stopGestures);
  function watchDensity() {
    const query = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    listen(
      query,
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
    listen(sprite, 'load', requestDraw);
    listen(sprite, 'error', () => {
      report('Impossible de charger l’image de Lanto.', true);
      requestDraw();
      console.error(status.textContent);
    });
  }
  notify();
  requestDraw();
  return {
    get stepCount() {
      return scene.stepCount;
    },
    setActive(value) {
      assertOpen();
      if (typeof value !== 'boolean')
        throw new TypeError('État de visibilité invalide.');
      active = value;
      if (!active) {
        stopGestures();
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
      } else requestDraw();
    },
    setZoom(scale) {
      assertOpen();
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
      assertOpen();
      navigate(() => framing.select(action, scene));
    },
    updateOptions(changes) {
      assertOpen();
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
    updateScene(snapshot) {
      assertOpen();
      const next = createScene(snapshot);
      scene = next;
      requestDraw();
    },
    setError(message) {
      assertOpen();
      if (message !== null && typeof message !== 'string')
        throw new TypeError('Message d’erreur invalide.');
      externalError = message;
      report('Pavage prêt.');
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      active = false;
      stopGestures();
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      resizeObserver.disconnect();
      lifecycle.abort();
    },
    // Point d'entrée des actualisations de scène ; aucune boucle de suivi au repos.
    refresh: requestDraw,
  };
}
