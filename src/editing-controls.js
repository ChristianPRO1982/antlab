import { EDIT_LIMIT } from './manual-editing.js';

export function mountEditing(session) {
  const canvas = document.querySelector('canvas');
  const section = document.createElement('section');
  section.innerHTML = `<h3>Modifier les cases</h3><div role="group" aria-label="Outils de dessin"><button type="button" data-tool="cell" aria-pressed="false">Case</button><button type="button" data-tool="stroke" aria-pressed="false">Tracé continu</button><button type="button" data-tool="rectangle" aria-pressed="false">Rectangle</button></div><label>Remplissage<select id="edit-fill"><option value="black">Tout en noir</option><option value="white">Tout en blanc</option><option value="random">Aléatoire</option></select></label><div id="edit-random" hidden><label>Probabilité de noir (%)<input id="edit-probability" type="number" min="1" max="99" value="50"></label><label>Graine<input id="edit-seed" type="number" min="0" max="4294967295" value="1"></label></div><p id="edit-message" role="status"></p>`;
  document.querySelector('.options-scroll').append(section);
  const buttons = [...section.querySelectorAll('[data-tool]')];
  const message = section.querySelector('#edit-message');
  const lifecycle = new AbortController();
  const contacts = new Set();
  let tool = null;
  let gesture = null;
  let serial = 0;
  let queue = Promise.resolve();
  const listen = (target, type, fn, capture = false) =>
    target.addEventListener(type, fn, { capture, signal: lifecycle.signal });
  function submit(client, fn, owner = null) {
    queue = queue.then(async () => {
      if (
        owner?.cancelled ||
        session.simulation !== client ||
        session.busy ||
        session.closed
      )
        return;
      try {
        await fn(client);
      } catch (error) {
        message.textContent = error.message;
        finish(false);
      }
    });
  }
  function finish(commit) {
    const current = gesture;
    gesture = null;
    if (current && !commit) current.cancelled = true;
    session.view.setEditingGesture(null);
    if (!current) return;
    if (current.tool === 'rectangle' && commit) {
      const mode = section.querySelector('#edit-fill').value;
      submit(current.client, (client) =>
        client.fillRectangle({
          minX: current.start.x,
          minY: current.start.y,
          maxX: current.last.x,
          maxY: current.last.y,
          mode,
          probability: Number(section.querySelector('#edit-probability').value),
          seed: Number(section.querySelector('#edit-seed').value),
        }),
      );
    }
    if (current.tool === 'stroke')
      submit(current.client, (client) => client.endStroke(current.id));
  }
  function refresh() {
    const speed = document.querySelector('#speed').value;
    const allowed =
      !session.busy &&
      !session.closed &&
      !session.error &&
      session.progress?.status !== 'error' &&
      (session.progress?.status !== 'running' ||
        ['1', '10', '100'].includes(speed));
    if (!allowed) {
      tool = null;
      finish(false);
    }
    for (const button of buttons) {
      button.disabled = !allowed;
      button.setAttribute('aria-pressed', String(tool === button.dataset.tool));
    }
    if ((session.progress?.editRevision ?? 0) > 0)
      document.querySelector('#rules-fields').disabled = true;
  }
  for (const button of buttons)
    listen(button, 'click', () => {
      finish(false);
      tool = tool === button.dataset.tool ? null : button.dataset.tool;
      refresh();
    });
  listen(section.querySelector('#edit-fill'), 'change', (event) => {
    section.querySelector('#edit-random').hidden =
      event.target.value !== 'random';
  });
  function point(event) {
    const rect = canvas.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX >= rect.right ||
      event.clientY < rect.top ||
      event.clientY >= rect.bottom
    )
      return null;
    return session.view.cellAt(
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
  }
  function extend(cell) {
    const g = gesture;
    if (!g || !cell) return;
    if (g.tool === 'rectangle') {
      g.last = cell;
      session.view.setEditingGesture({ start: g.start, end: cell });
      return;
    }
    if (g.tool !== 'stroke') return;
    const dx = cell.x - g.last.x,
      dy = cell.y - g.last.y;
    const count = Math.max(Math.abs(dx), Math.abs(dy));
    if (count > EDIT_LIMIT) {
      message.textContent = 'Maximum : 100 000 cases.';
      finish(false);
      return;
    }
    const cells = [];
    for (let i = 0; i <= count; i++) {
      const c = {
        x: Math.round(g.last.x + dx * (count ? i / count : 0)),
        y: Math.round(g.last.y + dy * (count ? i / count : 0)),
      };
      const key = `${c.x},${c.y}`;
      if (!g.seen.has(key)) {
        if (g.seen.size === EDIT_LIMIT) {
          message.textContent = 'Maximum : 100 000 cases.';
          finish(false);
          break;
        }
        g.seen.add(key);
        cells.push(c);
      }
    }
    g.last = cell;
    if (cells.length)
      submit(g.client, (client) => client.extendStroke({ id: g.id, cells }), g);
  }
  listen(
    canvas,
    'pointerdown',
    (event) => {
      if (!tool) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.button !== 0) return;
      contacts.add(event.pointerId);
      canvas.setPointerCapture(event.pointerId);
      if (contacts.size > 1) {
        finish(false);
        return;
      }
      const cell = point(event);
      if (!cell) return;
      canvas.setPointerCapture(event.pointerId);
      message.textContent = '';
      gesture = {
        id: ++serial,
        client: session.simulation,
        tool,
        start: cell,
        last: cell,
        seen: new Set(),
      };
      session.view.setEditingGesture({
        start: cell,
        end: cell,
        rectangle: tool === 'rectangle',
      });
      if (tool === 'stroke') {
        const g = gesture;
        submit(g.client, (client) => client.beginStroke(g.id), g);
        extend(cell);
      }
    },
    true,
  );
  listen(
    canvas,
    'pointermove',
    (event) => {
      if (!tool || !contacts.size) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const cell = point(event);
      if (!cell && gesture?.tool === 'stroke') finish(false);
      else extend(cell);
    },
    true,
  );
  function stop(event) {
    if (!contacts.has(event.pointerId)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    contacts.delete(event.pointerId);
    if (gesture?.tool === 'cell' && event.type === 'pointerup') {
      const g = gesture;
      submit(g.client, (client) => client.toggleCells([g.start]));
    }
    finish(event.type === 'pointerup');
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    listen(canvas, type, stop, true);
  listen(
    window,
    'keydown',
    (event) => {
      if (event.key === 'Escape') finish(false);
    },
    true,
  );
  listen(window, 'blur', () => finish(false));
  listen(window, 'hashchange', () => finish(false));
  listen(window, 'resize', () => finish(false));
  listen(document, 'visibilitychange', () => {
    if (document.hidden) finish(false);
  });
  listen(document.querySelector('#speed'), 'change', refresh);
  const unsubscribe = session.subscribe(refresh);
  return {
    refresh,
    dispose() {
      finish(false);
      unsubscribe();
      lifecycle.abort();
      section.remove();
    },
  };
}
