import { createSimulationClient } from './simulation-client.js';
import { connectSimulationView } from './simulation-view.js';
import { resolveRules } from './rules.js';

// Une session garde sa vue, mais remplace explicitement son expérience à zéro.
export async function createGameSession(
  view,
  {
    createClient = createSimulationClient,
    connect = connectSimulationView,
    onClose = () => {},
    execution = { batchSize: 10, batchDelayMs: 100, progressIntervalMs: 100 },
  } = {},
) {
  let simulation = null;
  let connector = null;
  let unsubscribe = () => {};
  let unsubscribeErrors = () => {};
  let rules = resolveRules().configuration;
  let options = { ...execution };
  let progress = null;
  let error = null;
  let closed = false;
  let busy = false;
  let active = true;
  let generation = 0;
  const listeners = new Set();

  function emit() {
    for (const callback of [...listeners]) {
      try {
        callback();
      } catch (failure) {
        queueMicrotask(() => {
          throw failure;
        });
      }
    }
  }
  function assertOpen() {
    if (closed) throw new Error('La session de simulation est fermée.');
  }
  function detach() {
    unsubscribe();
    unsubscribeErrors();
    connector?.dispose();
    connector = null;
  }
  const session = {
    view,
    get simulation() {
      return simulation;
    },
    get progress() {
      return progress && structuredClone(progress);
    },
    get rules() {
      return structuredClone(rules);
    },
    get error() {
      return error;
    },
    get busy() {
      return busy;
    },
    get closed() {
      return closed;
    },
    subscribe(callback) {
      assertOpen();
      if (typeof callback !== 'function')
        throw new TypeError('L’abonné doit être une fonction.');
      listeners.add(callback);
      callback();
      return () => listeners.delete(callback);
    },
    setActive(value) {
      if (closed) return;
      if (typeof value !== 'boolean')
        throw new TypeError('État de visibilité invalide.');
      active = value;
      if (connector) connector.setActive(value);
      else view.setActive(value);
    },
    async setExecutionOptions(changes) {
      assertOpen();
      if (busy) throw new Error('Une expérience est en cours de préparation.');
      const current = generation;
      const next = await simulation.setExecutionOptions(changes);
      if (!closed && current === generation) options = next;
      return next;
    },
    async reset(selection = rules) {
      assertOpen();
      if (busy) throw new Error('Une expérience est en cours de préparation.');
      const nextRules = resolveRules(selection).configuration;
      busy = true;
      const current = ++generation;
      detach();
      emit();
      let next = null;
      try {
        await simulation?.dispose();
        if (closed) throw new Error('La session de simulation est fermée.');
        next = await createClient({ rules: nextRules }, options);
        if (closed || current !== generation) {
          throw new Error('La session de simulation est fermée.');
        }
        simulation = next;
        rules = nextRules;
        error = null;
        view.setError(null);
        unsubscribe = simulation.subscribe((value) => {
          if (closed || current !== generation) return;
          progress = value;
          emit();
        });
        unsubscribeErrors = simulation.subscribeErrors((failure) => {
          if (closed || current !== generation) return;
          error = failure;
          view.setError(failure.message);
          emit();
        });
        connector = connect(simulation, view);
        connector.setActive(active);
        const initial = await simulation.getProgress();
        if (closed || current !== generation)
          throw new Error('La session de simulation est fermée.');
        progress = initial;
      } catch (failure) {
        await next?.dispose();
        if (!closed && current === generation) {
          detach();
          error = failure;
          view.setError(failure.message);
        }
        throw failure;
      } finally {
        busy = false;
        if (!closed) emit();
      }
    },
    async dispose() {
      if (closed) return;
      closed = true;
      generation++;
      detach();
      view.setError('La session de simulation est fermée.');
      view.dispose();
      emit();
      onClose();
      listeners.clear();
      await simulation?.dispose();
    },
  };
  try {
    await session.reset();
    return session;
  } catch (failure) {
    // reset a conservé l’erreur ; laisser la vue et Réinitialiser accessibles.
    if (closed) throw failure;
    return session;
  }
}
