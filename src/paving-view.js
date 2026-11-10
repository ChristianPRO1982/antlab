import { Camera } from './camera.js';
import { drawPaving } from './renderer.js';

export function mountPaving(canvas, status, world) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Le rendu Canvas 2D est indisponible.');
  const initial = canvas.getBoundingClientRect();
  const camera = new Camera(initial.width, initial.height);
  let frame = null;
  let drag = null;

  function requestDraw() {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      const { width, height } = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const pixelWidth = Math.round(width * ratio);
      const pixelHeight = Math.round(height * ratio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      // Utiliser les rapports réels après arrondi des dimensions physiques.
      context.setTransform(
        pixelWidth / width,
        0,
        0,
        pixelHeight / height,
        0,
        0,
      );
      drawPaving(context, camera, world);
      if (
        !status.textContent ||
        status.textContent === 'Chargement du pavage…'
      ) {
        status.textContent = 'Pavage prêt.';
      }
    });
  }

  function navigate(operation) {
    try {
      operation();
      status.textContent = 'Pavage prêt.';
      requestDraw();
    } catch (error) {
      // Une limite de navigation est visible ; les autres erreurs restent explicites.
      if (!(error instanceof RangeError)) throw error;
      status.textContent = error.message;
    }
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || drag) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.classList.add('dragging');
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    navigate(() =>
      camera.moveBy(event.clientX - drag.x, event.clientY - drag.y),
    );
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
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);
  canvas.addEventListener('lostpointercapture', stopDrag);

  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const unit =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
      const delta = Math.max(-10000, Math.min(10000, event.deltaY * unit));
      navigate(() =>
        camera.zoomAt(
          event.clientX - rect.left,
          event.clientY - rect.top,
          Math.exp(-delta * 0.001),
        ),
      );
    },
    { passive: false },
  );

  const resizeObserver = new ResizeObserver(() => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0)
      navigate(() => camera.resize(rect.width, rect.height));
  });
  resizeObserver.observe(canvas);
  window.addEventListener('resize', requestDraw);

  // Changer d'écran peut modifier la densité sans redimensionner le Canvas CSS.
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
  requestDraw();
}
