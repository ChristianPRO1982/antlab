import { mountEditing } from './editing-controls.js';
import { getRuleCatalog } from './rules.js';

const SPEEDS = {
  1: [1, 1000],
  10: [1, 100],
  100: [10, 100],
  1000: [100, 100],
  10000: [1000, 100],
  maximum: [1000, 0],
};
const STATUS = {
  ready: 'Prêt',
  running: 'Calcul en cours',
  paused: 'En pause',
  completed: 'Cible atteinte',
  cancelled: 'Calcul annulé',
  error: 'Erreur de calcul',
};

export function mountLaboratory(session) {
  const find = (selector) => document.querySelector(selector);
  const central = find('#central-rule');
  const threshold = find('#majority-threshold');
  const rotation = find('#branch-rotation');
  const speed = find('#speed');
  const target = find('#target-step');
  const catalog = getRuleCatalog();
  const optional = catalog.find((rule) => rule.category === 'optional');
  const actions = [...document.querySelectorAll('[data-action]')];
  const lifecycle = new AbortController();
  let pending = false;
  let launching = false;
  let commandId = 0;
  let speedValue = '100';
  let locked = false;
  let commandError = '';
  let progress = session.progress;
  let taskStart = progress?.stepCount ?? 0;
  function listen(element, type, callback) {
    element.addEventListener(type, callback, { signal: lifecycle.signal });
  }
  function option(select, value, label) {
    const item = document.createElement('option');
    item.value = String(value);
    item.textContent = label;
    select.append(item);
  }
  for (const rule of catalog.filter((rule) => rule.category === 'central'))
    option(central, rule.id, rule.name);
  for (const value of catalog.find((rule) => rule.parameters?.threshold)
    .parameters.threshold.choices)
    option(threshold, value, String(value));

  function render() {
    const failed = Boolean(session.error);
    const unavailable = session.busy || session.closed || failed;
    const working =
      progress?.status === 'running' || progress?.status === 'paused';
    const blocked = unavailable || pending;
    const playLabel =
      progress?.status === 'running'
        ? 'Pause'
        : progress?.status === 'paused'
          ? 'Reprendre'
          : 'Lancer';
    const selection = session.rules;
    if (!session.busy && !pending) {
      central.value = selection.central;
      threshold.value = String(selection.threshold ?? 3);
      rotation.checked = selection.optional.includes(optional.id);
    }
    const rule = catalog.find((item) => item.id === selection.central);
    find('#rule-description').textContent = rule.description;
    find('#threshold-row').hidden = !rule.parameters?.threshold;
    rotation.disabled = !optional.compatibleCentralRules.includes(rule.id);
    rotation.setAttribute('aria-describedby', 'rotation-description');
    find('#rotation-description').textContent =
      `${optional.description} Compatible uniquement avec l’inversion simple.`;
    find('#rules-fields').disabled = blocked || locked || working;
    find('#rules-lock').textContent =
      locked || working ? 'Réinitialisez pour modifier les règles.' : '';
    speed.disabled = blocked;
    speed.value = speedValue;
    target.disabled = blocked || working;
    find('#reach-target').disabled = blocked || working;
    for (const button of document.querySelectorAll('[data-target]'))
      button.disabled = blocked || working;
    for (const button of actions) {
      const action = button.dataset.action;
      button.disabled =
        blocked ||
        (action === 'step' && working) ||
        (action === 'cancel' && !working);
      if (action === 'reset')
        button.disabled = session.busy || session.closed || pending;
      if (action === 'play' || action === 'floating') {
        button.setAttribute(
          'aria-label',
          playLabel + (action === 'floating' ? ' flottante' : ''),
        );
        button.title = playLabel;
        const label = button.querySelector('span');
        if (label) label.textContent = playLabel;
        button
          .querySelector('use')
          ?.setAttribute(
            'href',
            progress?.status === 'running' ? '#pause' : '#play',
          );
      }
    }
    find('#simulation-status').textContent = session.closed
      ? 'Session fermée'
      : session.busy
        ? 'Préparation…'
        : failed
          ? 'Worker indisponible'
          : (STATUS[progress?.status] ?? 'Préparation…');
    find('#step-count').textContent = progress
      ? String(progress.stepCount)
      : '—';
    find('#black-count').textContent = progress
      ? String(progress.blackCellCount)
      : '—';
    find('#displayed-step').textContent =
      session.view.drawnStepCount !== null &&
      progress &&
      session.view.drawnStepCount !== progress.stepCount
        ? `Étape affichée : ${session.view.drawnStepCount}`
        : '';
    const bar = find('#target-progress');
    bar.hidden = !progress || progress.targetStep === null;
    if (!bar.hidden) {
      // La barre exprime le numéro absolu ; le texte garde le départ explicite.
      bar.max = Math.max(1, progress.targetStep);
      bar.value = progress.stepCount;
      bar.setAttribute(
        'aria-valuetext',
        `${progress.stepCount} sur ${progress.targetStep}, départ ${taskStart}`,
      );
    }
    find('#simulation-error').textContent =
      session.error?.message ?? progress?.error?.message ?? commandError;
  }
  const unsubscribe = session.subscribe(() => {
    const next = session.progress;
    if (next && next.status === 'running') {
      locked = true;
      if (launching) {
        pending = false;
        launching = false;
      }
    }
    if (session.busy) {
      commandId++;
      pending = false;
      launching = false;
    }
    locked =
      (next?.editRevision ?? 0) > 0 ||
      next?.stepCount > 0 ||
      next?.status === 'running' ||
      next?.status === 'paused';
    progress = next;
    render();
  });

  async function invoke(operation, { long = false, targetError = false } = {}) {
    if (pending || session.busy || session.closed) return;
    const id = ++commandId;
    const client = session.simulation;
    pending = true;
    launching = long;
    commandError = '';
    render();
    try {
      await operation();
    } catch (error) {
      if (
        id === commandId &&
        client === session.simulation &&
        !session.closed &&
        !session.busy
      ) {
        if (targetError) find('#target-error').textContent = error.message;
        else commandError = error.message;
      }
    } finally {
      if (id === commandId) {
        pending = false;
        launching = false;
      }
      render();
    }
  }
  async function changeRules() {
    const selection = { central: central.value, optional: [] };
    let removed = false;
    if (rotation.checked) {
      if (optional.compatibleCentralRules.includes(selection.central))
        selection.optional.push(optional.id);
      else removed = true;
    }
    if (
      catalog.find((rule) => rule.id === selection.central).parameters
        ?.threshold
    )
      selection.threshold = Number(threshold.value);
    find('#rules-notice').textContent = removed
      ? 'Rotation horaire retirée : incompatible avec cette règle centrale.'
      : '';
    await invoke(() => session.reset(selection));
  }
  for (const input of [central, threshold, rotation])
    listen(input, 'change', changeRules);
  listen(speed, 'change', () => {
    const requested = speed.value;
    const [batchSize, batchDelayMs] = SPEEDS[requested];
    void invoke(async () => {
      await session.setExecutionOptions({ batchSize, batchDelayMs });
      speedValue = requested;
    });
  });
  for (const button of document.querySelectorAll('[data-target]'))
    listen(button, 'click', () => {
      target.value = button.dataset.target;
      target.setAttribute('aria-invalid', 'false');
      find('#target-error').textContent = '';
    });
  listen(find('#target-form'), 'submit', (event) => {
    event.preventDefault();
    const number = Number(target.value);
    let message = '';
    if (
      target.value.trim() === '' ||
      !Number.isSafeInteger(number) ||
      number < 0
    )
      message =
        'Saisissez une étape entière positive ou nulle, dans les entiers sûrs JavaScript.';
    else if (number < progress.stepCount)
      message =
        'Impossible de calculer vers une étape passée sans état disponible.';
    find('#target-error').textContent = message;
    target.setAttribute('aria-invalid', String(Boolean(message)));
    if (message) {
      target.focus();
      return;
    }
    taskStart = progress.stepCount;
    void invoke(() => session.simulation.runUntil(number), {
      long: true,
      targetError: true,
    });
  });
  for (const button of actions)
    listen(button, 'click', () => {
      const action = button.dataset.action;
      if (action === 'reset') {
        find('#target-error').textContent = '';
        find('#rules-notice').textContent = '';
        void invoke(() => session.reset());
      } else if (action === 'cancel')
        void invoke(() => session.simulation.cancel());
      else if (action === 'step') {
        taskStart = progress.stepCount;
        void invoke(() => session.simulation.step(), { long: true });
      } else {
        const status = progress.status;
        taskStart = status === 'paused' ? taskStart : progress.stepCount;
        void invoke(() =>
          session.simulation[
            status === 'running'
              ? 'pause'
              : status === 'paused'
                ? 'resume'
                : 'start'
          ](),
        );
      }
    });
  const editing = mountEditing(session);
  return {
    refresh() {
      render();
      editing.refresh();
    },
    dispose() {
      editing.dispose();
      lifecycle.abort();
      unsubscribe();
    },
  };
}
