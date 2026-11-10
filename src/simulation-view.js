export function connectSimulationView(
  simulation,
  view,
  { intervalMs = 100, onError = () => {} } = {},
) {
  if (
    !Number.isSafeInteger(intervalMs) ||
    intervalMs < 100 ||
    intervalMs > 2147483647
  ) {
    throw new RangeError(
      'L’intervalle des instantanés doit être un entier entre 100 et 2147483647 ms.',
    );
  }
  let active = true;
  let disposed = false;
  let failed = false;
  let generation = 0;
  let timer = null;
  let pending = false;
  let dirty = true;
  let running = false;
  let desiredStep = 0;
  let lastRequestAt = -Infinity;

  function schedule() {
    if (
      disposed ||
      failed ||
      !active ||
      pending ||
      timer !== null ||
      (!dirty && !running)
    )
      return;
    const delay = Math.max(0, intervalMs - (performance.now() - lastRequestAt));
    timer = setTimeout(() => {
      timer = null;
      void read();
    }, Math.ceil(delay));
  }

  function fail(error) {
    if (disposed || failed) return;
    failed = true;
    generation++;
    running = false;
    dirty = false;
    if (timer !== null) clearTimeout(timer);
    timer = null;
    view.setError?.(error.message);
    onError(error);
  }

  async function read() {
    if (disposed || failed || !active || pending) return;
    // Un timer peut être arrondi : vérifier l’échéance avant chaque demande.
    if (performance.now() - lastRequestAt < intervalMs) {
      schedule();
      return;
    }
    const current = generation;
    pending = true;
    dirty = false;
    lastRequestAt = performance.now();
    try {
      const snapshot = await simulation.getState();
      if (!disposed && active && current === generation) {
        view.updateScene(snapshot);
        if (snapshot.stepCount < desiredStep) dirty = true;
      }
    } catch (error) {
      fail(error);
    } finally {
      pending = false;
      schedule();
    }
  }

  const unsubscribe = simulation.subscribe((progress) => {
    if (disposed || failed) return;
    running = progress.status === 'running';
    desiredStep = progress.stepCount;
    dirty = true;
    view.setError?.(progress.error?.message || null);
    if (progress.error) {
      const error = new Error(progress.error.message);
      error.name = progress.error.name;
      onError(error);
    }
    schedule();
  });
  const unsubscribeErrors = simulation.subscribeErrors?.(fail);
  schedule();

  return {
    setActive(value) {
      if (typeof value !== 'boolean')
        throw new TypeError('État de visibilité invalide.');
      if (disposed) return;
      if (active !== value) generation++;
      active = value;
      view.setActive(value);
      if (!active && timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (active) {
        dirty = true;
        schedule();
      }
    },
    refresh() {
      if (!disposed) {
        dirty = true;
        schedule();
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      generation++;
      if (timer !== null) clearTimeout(timer);
      timer = null;
      unsubscribe();
      unsubscribeErrors?.();
    },
  };
}
