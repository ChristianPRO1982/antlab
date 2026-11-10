import { getCrossCells, isCenter } from './geometry.js';

function opposite(color) {
  return color === 'white' ? 'black' : 'white';
}

const MAJORITY_THRESHOLD = { choices: [1, 2, 3, 4, 5], default: 3 };

function majorityColor(before, threshold) {
  const blackCount = before.filter((color) => color === 'black').length;
  return blackCount >= threshold ? 'black' : 'white';
}

// Les fonctions restent séparées des métadonnées exposées par le catalogue.
const RULES = [
  {
    metadata: {
      id: 'single-flip',
      version: 1,
      name: 'Inversion simple',
      description: 'Inverser uniquement la case centrale visitée.',
      category: 'central',
    },
    transform: (before) => [opposite(before[0]), ...before.slice(1)],
  },
  {
    metadata: {
      id: 'cross-flip',
      version: 1,
      name: 'Inversion collective',
      description: 'Inverser individuellement les cinq cases de la croix.',
      category: 'central',
    },
    transform: (before) => before.map(opposite),
  },
  {
    metadata: {
      id: 'center-master',
      version: 1,
      name: 'Centre maître',
      description:
        'Donner aux cinq cases la couleur opposée à l’ancienne couleur du centre.',
      category: 'central',
    },
    transform: (before) => Array(5).fill(opposite(before[0])),
  },
  {
    metadata: {
      id: 'inverted-majority',
      version: 2,
      name: 'Majorité inversée',
      description:
        'Donner aux cinq cases du blanc si le nombre de cases noires atteint le seuil choisi, sinon du noir.',
      category: 'central',
      parameters: { threshold: MAJORITY_THRESHOLD },
    },
    transform: (before, threshold) =>
      Array(5).fill(opposite(majorityColor(before, threshold))),
  },
  {
    metadata: {
      id: 'majority-wins',
      version: 1,
      name: 'Majorité l’emporte',
      description:
        'Donner aux cinq cases du noir si le nombre de cases noires atteint le seuil choisi, sinon du blanc.',
      category: 'central',
      parameters: { threshold: MAJORITY_THRESHOLD },
    },
    transform: (before, threshold) =>
      Array(5).fill(majorityColor(before, threshold)),
  },
  {
    metadata: {
      id: 'rotate-branches-clockwise',
      version: 1,
      name: 'Rotation horaire des branches',
      description:
        'Sur un centre, transférer les anciennes couleurs nord → est → sud → ouest → nord.',
      category: 'optional',
      compatibleCentralRules: ['single-flip'],
    },
    transform: (before, after) => [
      after[0],
      before[4],
      before[1],
      before[2],
      before[3],
    ],
  },
];

export function getRuleCatalog() {
  return RULES.map(({ metadata }) => structuredClone(metadata));
}

// Contrat interne avec le moteur : sélection validée et préparation sans écriture.
export function resolveRules(configuration = {}) {
  if (
    configuration === null ||
    typeof configuration !== 'object' ||
    Array.isArray(configuration)
  ) {
    throw new TypeError('La configuration des règles doit être un objet.');
  }
  if (
    Reflect.ownKeys(configuration).some(
      (key) => key !== 'central' && key !== 'optional' && key !== 'threshold',
    )
  ) {
    throw new TypeError(
      'La configuration des règles contient un champ inconnu.',
    );
  }
  const { central = 'single-flip', optional = [] } = configuration;
  const centralRule = RULES.find(
    ({ metadata }) =>
      metadata.id === central && metadata.category === 'central',
  );
  if (!centralRule) {
    throw new TypeError(
      'La règle centrale doit être un identifiant central du catalogue.',
    );
  }
  const thresholdParameter = centralRule.metadata.parameters?.threshold;
  const { threshold = thresholdParameter?.default } = configuration;
  if (thresholdParameter) {
    if (typeof threshold !== 'number') {
      throw new TypeError('Le seuil de majorité doit être un nombre.');
    }
    if (!thresholdParameter.choices.includes(threshold)) {
      throw new RangeError('Le seuil de majorité doit être 1, 2, 3, 4 ou 5.');
    }
  } else if (threshold !== undefined) {
    throw new TypeError('Le seuil est réservé aux règles de majorité.');
  }
  if (!Array.isArray(optional)) {
    throw new TypeError(
      'Les règles optionnelles doivent être un tableau d’identifiants.',
    );
  }
  const selected = new Set();
  for (const id of optional) {
    const rule = RULES.find(
      ({ metadata }) => metadata.id === id && metadata.category === 'optional',
    );
    if (!rule) {
      throw new TypeError(
        'Une règle optionnelle ne désigne pas une option du catalogue.',
      );
    }
    if (selected.has(id)) {
      throw new TypeError(
        'Une règle optionnelle ne peut pas être sélectionnée deux fois.',
      );
    }
    if (!rule.metadata.compatibleCentralRules.includes(central)) {
      throw new TypeError(
        `La règle optionnelle ${id} est incompatible avec ${central}.`,
      );
    }
    selected.add(id);
  }
  // Ordre du catalogue, indépendant de l'ordre de sélection des options.
  const optionalRules = RULES.filter(({ metadata }) =>
    selected.has(metadata.id),
  );
  return {
    configuration: {
      central,
      optional: optionalRules.map(({ metadata }) => metadata.id),
      ...(thresholdParameter && { threshold }),
    },
    prepareChanges(world, x, y) {
      if (
        (central === 'single-flip' && optionalRules.length === 0) ||
        !isCenter(x, y)
      ) {
        return [{ x, y, color: opposite(world.getColor(x, y)) }];
      }
      // Valider toute la croix puis lire un état initial commun avant tout effet.
      const cells = getCrossCells(x, y);
      const before = cells.map((cell) => world.getColor(cell.x, cell.y));
      let after = centralRule.transform(before, threshold);
      for (const rule of optionalRules) after = rule.transform(before, after);
      return cells.map((cell, index) => ({ ...cell, color: after[index] }));
    },
  };
}
