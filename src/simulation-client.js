function receivedError(value) {
  if (
    !value ||
    typeof value.name !== 'string' ||
    typeof value.message !== 'string'
  ) {
    throw new TypeError('Erreur Worker mal formée.');
  }
  const constructors = { Error, TypeError, RangeError };
  const ErrorType = Object.hasOwn(constructors, value.name)
    ? constructors[value.name]
    : Error;
  const error = new ErrorType(value.message);
  error.name = value.name;
  return error;
}

function validProgress(progress) {
  return (
    progress &&
    typeof progress === 'object' &&
    ['ready', 'running', 'paused', 'completed', 'cancelled', 'error'].includes(
      progress.status,
    ) &&
    Number.isSafeInteger(progress.stepCount) &&
    progress.stepCount >= 0 &&
    Number.isSafeInteger(progress.blackCellCount) &&
    progress.blackCellCount >= 0 &&
    (progress.targetStep === null ||
      (Number.isSafeInteger(progress.targetStep) &&
        progress.targetStep >= 0)) &&
    progress.ant &&
    Number.isSafeInteger(progress.ant.x) &&
    Number.isSafeInteger(progress.ant.y) &&
    ['north', 'east', 'south', 'west'].includes(progress.ant.orientation) &&
    !('blackCells' in progress)
  );
}

class SimulationClient {
  #worker;
  #nextId = 1;
  #pending = new Map();
  #listeners = new Set();
  #failure = null;

  static async create(configuration, execution) {
    const worker = new Worker(
      new URL('./simulation-worker.js', import.meta.url),
      { type: 'module' },
    );
    const client = new SimulationClient(worker);
    try {
      await client.#request('initialize', { configuration, execution });
      return client;
    } catch (error) {
      await client.dispose();
      throw error;
    }
  }

  constructor(worker) {
    this.#worker = worker;
    worker.addEventListener('message', this.#onMessage);
    worker.addEventListener('error', this.#onError);
    worker.addEventListener('messageerror', this.#onError);
  }

  #close(error) {
    if (this.#failure) return;
    this.#failure = error;
    this.#worker.removeEventListener('message', this.#onMessage);
    this.#worker.removeEventListener('error', this.#onError);
    this.#worker.removeEventListener('messageerror', this.#onError);
    this.#worker.terminate();
    for (const request of this.#pending.values()) request.reject(error);
    this.#pending.clear();
    this.#listeners.clear();
  }

  #onError = (event) => {
    event.preventDefault?.();
    this.#close(
      new Error(
        event.message ||
          'Le Worker est indisponible ou son message est illisible.',
      ),
    );
  };

  #onMessage = ({ data }) => {
    try {
      if (!data || typeof data !== 'object')
        throw new TypeError('Message Worker mal formé.');
      if (data.type === 'progress') {
        if (!validProgress(data.progress))
          throw new TypeError('Progression Worker mal formée.');
        if (data.progress.error) receivedError(data.progress.error);
        for (const callback of [...this.#listeners]) {
          try {
            callback(structuredClone(data.progress));
          } catch (error) {
            queueMicrotask(() => {
              throw error;
            });
          }
        }
      } else if (
        data.type === 'response' &&
        Number.isSafeInteger(data.id) &&
        data.id > 0
      ) {
        const request = this.#pending.get(data.id);
        if (!request) return; // Réponse tardive/dupliquée, sans demande correspondante.
        if (Object.hasOwn(data, 'error') && !Object.hasOwn(data, 'result')) {
          const error = receivedError(data.error);
          this.#pending.delete(data.id);
          request.reject(error);
        } else if (
          Object.hasOwn(data, 'result') &&
          !Object.hasOwn(data, 'error')
        ) {
          this.#pending.delete(data.id);
          request.resolve(data.result);
        } else throw new TypeError('Réponse Worker mal formée.');
      } else throw new TypeError('Type de message Worker inconnu.');
    } catch (error) {
      this.#close(error);
    }
  };

  #request(command, fields = {}) {
    if (this.#failure) return Promise.reject(this.#failure);
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      try {
        this.#worker.postMessage({ id, command, ...fields });
      } catch (error) {
        this.#pending.delete(id);
        reject(error);
      }
    });
  }

  step() {
    return this.#request('step');
  }
  advance(count) {
    return this.#request('advance', { count });
  }
  runUntil(targetStep) {
    return this.#request('runUntil', { targetStep });
  }
  start() {
    return this.#request('start');
  }
  pause() {
    return this.#request('pause');
  }
  resume() {
    return this.#request('resume');
  }
  cancel() {
    return this.#request('cancel');
  }
  getProgress() {
    return this.#request('getProgress');
  }
  getState() {
    return this.#request('getState');
  }
  getRules() {
    return this.#request('getRules');
  }

  subscribe(callback) {
    if (this.#failure) throw this.#failure;
    if (typeof callback !== 'function')
      throw new TypeError('L’abonné doit être une fonction.');
    this.#listeners.add(callback);
    return () => this.#listeners.delete(callback);
  }

  async dispose() {
    this.#close(new Error('Le client de simulation est fermé.'));
  }
}

export function createSimulationClient(configuration = {}, execution = {}) {
  return SimulationClient.create(configuration, execution);
}
