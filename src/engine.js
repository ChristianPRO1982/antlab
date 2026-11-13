import { cellsValidated, rectangleChanges } from './manual-editing.js';
import { coordinate } from './coordinates.js';
import { SparseWorld } from './world.js';
import { resolveRules } from './rules.js';

// Ordre horaire, dans le repère du monde (Y vers le haut).
const DIRECTIONS = [
  { orientation: 'north', dx: 0, dy: 1 },
  { orientation: 'east', dx: 1, dy: 0 },
  { orientation: 'south', dx: 0, dy: -1 },
  { orientation: 'west', dx: -1, dy: 0 },
];

function requireObject(value, name) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} doit être un objet.`);
  }
}

export class LangtonEngine {
  #world = new SparseWorld();
  #x;
  #y;
  #direction;
  #stepCount = 0;
  #rules;
  #interventions = [];

  constructor(options = {}) {
    requireObject(options, 'La configuration');
    const {
      ant = { x: 0, y: 0, orientation: 'north' },
      blackCells = [],
      rules,
    } = options;
    this.#rules = resolveRules(rules);
    requireObject(ant, 'La fourmi');
    this.#x = coordinate(ant.x, 'fourmi.x');
    this.#y = coordinate(ant.y, 'fourmi.y');
    this.#direction = DIRECTIONS.findIndex(
      ({ orientation }) => orientation === ant.orientation,
    );
    if (this.#direction === -1) {
      throw new TypeError(
        'L’orientation doit être north, east, south ou west.',
      );
    }
    if (!Array.isArray(blackCells)) {
      throw new TypeError('Les cases noires doivent être un tableau.');
    }
    for (const cell of blackCells) {
      requireObject(cell, 'Une case noire');
      this.#world.setColor(cell.x, cell.y, 'black');
    }
  }

  getInterventions() {
    return structuredClone(this.#interventions);
  }

  #edit(operation, changes) {
    const recorded = structuredClone(operation);
    const changed = changes.filter(
      (cell) => this.#world.getColor(cell.x, cell.y) !== cell.color,
    );
    const order = changed.length ? this.#interventions.length + 1 : null;
    if (changed.length) {
      for (const cell of changed)
        this.#world.setColor(cell.x, cell.y, cell.color);
      this.#interventions.push({
        stepCount: this.#stepCount,
        order,
        ...recorded,
      });
    }
    return {
      stepCount: this.#stepCount,
      order,
      changedCellCount: changed.length,
    };
  }

  toggleCells(cells) {
    cells = cellsValidated(cells);
    return this.#edit(
      { type: 'toggle', cells },
      cells.map((cell) => ({
        ...cell,
        color:
          this.#world.getColor(cell.x, cell.y) === 'black' ? 'white' : 'black',
      })),
    );
  }

  fillRectangle(options) {
    const changes = rectangleChanges(options);
    return this.#edit(
      { type: 'rectangle', options, generator: 'mulberry32-v1' },
      changes,
    );
  }

  step() {
    if (this.#stepCount === Number.MAX_SAFE_INTEGER) {
      throw new RangeError('Le compteur d’étapes dépasse les entiers sûrs.');
    }
    // Lire, décider de la rotation, puis valider la destination avant écriture.
    const color = this.#world.getColor(this.#x, this.#y);
    const direction = (this.#direction + (color === 'white' ? 1 : 3)) % 4;
    const { dx, dy } = DIRECTIONS[direction];
    const x = coordinate(this.#x + dx, 'destination.x');
    const y = coordinate(this.#y + dy, 'destination.y');
    const changes = this.#rules.prepareChanges(this.#world, this.#x, this.#y);

    // Une transition complète : tourner, transformer, avancer, incrémenter.
    this.#direction = direction;
    for (const cell of changes)
      this.#world.setColor(cell.x, cell.y, cell.color);
    this.#x = x;
    this.#y = y;
    return ++this.#stepCount;
  }

  advance(count) {
    count = coordinate(count, 'Le nombre de transitions');
    if (count < 0 || count > Number.MAX_SAFE_INTEGER - this.#stepCount) {
      throw new RangeError(
        'Le nombre de transitions doit être positif ou nul et conserver un compteur entier sûr.',
      );
    }
    for (let index = 0; index < count; index++) this.step();
    return this.#stepCount;
  }

  getState() {
    return {
      ant: {
        x: this.#x,
        y: this.#y,
        orientation: DIRECTIONS[this.#direction].orientation,
      },
      stepCount: this.#stepCount,
      blackCells: [...this.#world.blackCells()],
    };
  }

  getProgress() {
    return {
      ant: {
        x: this.#x,
        y: this.#y,
        orientation: DIRECTIONS[this.#direction].orientation,
      },
      stepCount: this.#stepCount,
      blackCellCount: this.#world.blackCellCount,
      editRevision: this.#interventions.length,
    };
  }

  getRules() {
    const configuration = this.#rules.configuration;
    return { ...configuration, optional: [...configuration.optional] };
  }
}
