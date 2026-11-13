import { ExecutionController } from './execution-controller.js';

const COMMAND_FIELDS = {
  initialize: ['configuration', 'execution'],
  step: [],
  advance: ['count'],
  runUntil: ['targetStep'],
  start: [],
  pause: [],
  resume: [],
  cancel: [],
  getProgress: [],
  getState: [],
  getRules: [],
  setExecutionOptions: ['options'],
  dispose: [],
};
let controller = null;

function replyError(id, error) {
  self.postMessage({
    type: 'response',
    id,
    error: { name: error.name, message: error.message },
  });
}

self.addEventListener('message', ({ data }) => {
  let id = null;
  try {
    if (
      data === null ||
      typeof data !== 'object' ||
      Array.isArray(data) ||
      !Number.isSafeInteger(data.id) ||
      data.id <= 0
    ) {
      throw new TypeError(
        'Une commande doit contenir un identifiant entier sûr positif.',
      );
    }
    id = data.id;
    if (
      typeof data.command !== 'string' ||
      !Object.hasOwn(COMMAND_FIELDS, data.command)
    ) {
      throw new TypeError('Commande de simulation inconnue.');
    }
    const fields = ['id', 'command', ...COMMAND_FIELDS[data.command]];
    if (Reflect.ownKeys(data).some((key) => !fields.includes(key))) {
      throw new TypeError('Champ de commande inconnu.');
    }
    let result;
    if (data.command === 'initialize') {
      if (controller) throw new Error('L’expérience est déjà initialisée.');
      controller = new ExecutionController(data.configuration, data.execution);
      controller.subscribe((progress) =>
        self.postMessage({ type: 'progress', progress }),
      );
      result = controller.getProgress();
    } else {
      if (!controller) throw new Error('L’expérience doit être initialisée.');
      const argument =
        data.command === 'setExecutionOptions'
          ? data.options
          : data.command === 'advance'
            ? data.count
            : data.targetStep;
      result = controller[data.command](argument);
    }
    // Ne pas attendre une tâche longue avant de recevoir les commandes suivantes.
    Promise.resolve(result).then(
      (result) => {
        self.postMessage({ type: 'response', id, result });
        if (data.command === 'dispose') self.close();
      },
      (error) => replyError(id, error),
    );
  } catch (error) {
    replyError(id, error);
  }
});
