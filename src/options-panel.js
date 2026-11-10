import { PanelState } from './panel-state.js';

export function mountOptionsPanel(root, handle, panel, floatingButton) {
  const media = matchMedia('(max-width: 767px)');
  const state = new PanelState({ mobile: media.matches });
  let pointerId = null;

  function render() {
    root.style.setProperty('--panel-width', `${state.width}vw`);
    root.classList.toggle('is-collapsed', state.collapsed);
    panel.hidden = state.collapsed;
    floatingButton.hidden = !state.collapsed;
    handle.setAttribute('aria-expanded', String(!state.collapsed));
    handle.title = state.collapsed
      ? 'Ouvrir les options'
      : 'Glisser pour redimensionner · Cliquer pour replier';
  }

  function cancel() {
    state.cancelDrag();
    const id = pointerId;
    pointerId = null;
    if (id !== null && handle.hasPointerCapture(id))
      handle.releasePointerCapture(id);
    root.classList.remove('is-resizing');
    render();
  }

  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || pointerId !== null) return;
    event.preventDefault();
    handle.focus();
    pointerId = event.pointerId;
    state.beginDrag(event.clientX);
    handle.setPointerCapture(pointerId);
    root.classList.add('is-resizing');
  });
  handle.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    state.moveDrag(event.clientX, window.innerWidth);
    render();
  });
  handle.addEventListener('pointerup', (event) => {
    if (event.pointerId !== pointerId) return;
    state.endDrag(event.clientX, window.innerWidth);
    const id = pointerId;
    pointerId = null;
    if (handle.hasPointerCapture(id)) handle.releasePointerCapture(id);
    root.classList.remove('is-resizing');
    render();
  });
  handle.addEventListener('pointercancel', cancel);
  handle.addEventListener('lostpointercapture', cancel);
  handle.addEventListener('click', (event) => {
    // Les technologies d'assistance peuvent activer sans événement de pointeur.
    if (event.detail === 0) {
      state.toggle();
      render();
    }
  });
  handle.addEventListener('keydown', (event) => {
    if (['Enter', ' ', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Enter' || event.key === ' ') state.toggle();
      else state.nudge(event.key === 'ArrowLeft' ? 2 : -2);
      render();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (
      event.key === 'Escape' &&
      state.mobile &&
      !state.collapsed &&
      !root.closest('[hidden]')
    ) {
      state.close();
      render();
      handle.focus();
    }
  });
  media.addEventListener('change', () => {
    cancel();
    state.setMobile(media.matches);
    render();
  });
  render();
  return { cancel };
}
