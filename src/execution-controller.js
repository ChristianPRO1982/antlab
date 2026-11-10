import { LangtonEngine } from './engine.js';
import { coordinate } from './coordinates.js';

function executionOptions(options) {
  if (
    options === null ||
    typeof options !== 'object' ||
    Array.isArray(options)
  ) {
    throw new TypeError('Les options de pilotage doivent être un objet.');
  }
  const defaults = {
    batchSize: 1000,
    batchDelayMs: 0,
    progressIntervalMs: 100,
  };
  if (Reflect.ownKeys(options).some((key) => !Object.hasOwn(defaults, key))) {
    throw new TypeError('Option de pilotage inconnue.');
  }
  const result = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = coordinate(
      options[key] === undefined ? fallback : options[key],
      key,
    );
    const minimum = key === 'batchSize' ? 1 : 0;
    const maximum = key === 'batchSize' ? 10000 : 2147483647;
    if (value < minimum || value > maximum) {
      throw new RangeError(
        `${key} doit être compris entre ${minimum} et ${maximum}.`,
      );
    }
    result[key] = value;
  }
  return result;
}

export class ExecutionController {
  #engine;
  #options;
  #status = 'ready';
  #targetStep = null;
  #error = null;
  #timer = null;
  #generation = 0;
  #task = null;
  #listeners = new Set();
  #lastEmittedAt = -Infinity;

  constructor(configuration = {}, options = {}) {
    this.#options = executionOptions(options);
    this.#engine = new LangtonEngine(configuration);
  }

  #assertOpen() {
    if (this.#status === 'disposed')
      throw new Error('Le contrôleur est fermé.');
  }

  #assertIdle() {
    this.#assertOpen();
    if (this.#status === 'running' || this.#status === 'paused') {
      throw new Error('Une tâche est déjà en cours ou en pause.');
    }
  }

  #progress() {
    return {
      ...this.#engine.getProgress(),
      status: this.#status,
      targetStep: this.#targetStep,
      ...(this.#error && {
        error: { name: this.#error.name, message: this.#error.message },
      }),
    };
  }

  #emit(force = false, progress = this.#progress()) {
    const now = performance.now();
    if (!force && now - this.#lastEmittedAt < this.#options.progressIntervalMs)
      return;
    this.#lastEmittedAt = now;
    for (const callback of [...this.#listeners]) {
      try {
        callback(structuredClone(progress));
      } catch (error) {
        // Signaler une erreur d'abonné sans la confondre avec une erreur du moteur.
        queueMicrotask(() => {
          throw error;
        });
      }
    }
  }

  #invalidateTimer() {
    this.#generation++;
    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#timer = null;
  }

  #schedule() {
    if (this.#status !== 'running' || this.#timer !== null) return;
    const generation = this.#generation;
    this.#timer = setTimeout(() => {
      if (generation !== this.#generation || this.#status !== 'running') return;
      this.#timer = null;
      this.#tick();
    }, this.#options.batchDelayMs);
  }

  #tick() {
    const current = this.#engine.getProgress().stepCount;
    const count =
      this.#targetStep === null
        ? this.#options.batchSize
        : Math.min(this.#options.batchSize, this.#targetStep - current);
    try {
      this.#engine.advance(count);
    } catch (error) {
      this.#finish('error', error);
      return;
    }
    if (
      this.#targetStep !== null &&
      this.#engine.getProgress().stepCount === this.#targetStep
    ) {
      this.#finish('completed');
    } else {
      this.#emit();
      this.#schedule();
    }
  }

  #finish(status, error = null) {
    this.#invalidateTimer();
    this.#status = status;
    this.#error = error;
    if (status === 'cancelled') this.#targetStep = null;
    const task = this.#task;
    this.#task = null;
    const progress = this.#progress();
    this.#emit(true, progress);
    if (error) task?.reject(error);
    else task?.resolve(progress);
    return progress;
  }

  #begin(targetStep, finite = true) {
    this.#invalidateTimer();
    this.#targetStep = targetStep;
    this.#error = null;
    let result;
    if (finite) {
      result = new Promise((resolve, reject) => {
        this.#task = { resolve, reject };
      });
    }
    if (targetStep === this.#engine.getProgress().stepCount) {
      this.#finish('completed');
    } else {
      this.#status = 'running';
      this.#emit(true);
      this.#schedule();
    }
    return result;
  }

  step() {
    return this.advance(1);
  }

  async advance(count) {
    this.#assertIdle();
    count = coordinate(count, 'Le nombre de transitions');
    const current = this.#engine.getProgress().stepCount;
    if (count < 0 || count > Number.MAX_SAFE_INTEGER - current) {
      throw new RangeError(
        'Le nombre de transitions doit conserver un compteur entier sûr positif ou nul.',
      );
    }
    return this.#begin(current + count);
  }

  async runUntil(targetStep) {
    this.#assertIdle();
    targetStep = coordinate(targetStep, 'L’étape cible');
    if (targetStep < this.#engine.getProgress().stepCount) {
      throw new RangeError(
        'Impossible de calculer vers une étape passée sans état disponible.',
      );
    }
    return this.#begin(targetStep);
  }

  async start() {
    this.#assertIdle();
    this.#begin(null, false);
    return this.#progress();
  }

  async pause() {
    this.#assertOpen();
    if (this.#status === 'running') {
      this.#invalidateTimer();
      this.#status = 'paused';
      this.#emit(true);
    }
    return this.#progress();
  }

  async resume() {
    this.#assertOpen();
    if (this.#status !== 'paused')
      throw new Error('Aucune tâche en pause à reprendre.');
    this.#status = 'running';
    this.#emit(true);
    this.#schedule();
    return this.#progress();
  }

  async cancel() {
    this.#assertOpen();
    if (this.#status === 'running' || this.#status === 'paused')
      return this.#finish('cancelled');
    return this.#progress();
  }

  async getProgress() {
    this.#assertOpen();
    return this.#progress();
  }

  async getState() {
    this.#assertOpen();
    return this.#engine.getState();
  }

  async getRules() {
    this.#assertOpen();
    return this.#engine.getRules();
  }

  subscribe(callback) {
    this.#assertOpen();
    if (typeof callback !== 'function')
      throw new TypeError('L’abonné doit être une fonction.');
    this.#listeners.add(callback);
    return () => this.#listeners.delete(callback);
  }

  async dispose() {
    if (this.#status === 'disposed') return;
    this.#invalidateTimer();
    this.#status = 'disposed';
    this.#task?.reject(new Error('Le contrôleur est fermé.'));
    this.#task = null;
    this.#listeners.clear();
    this.#engine = null;
  }
}
