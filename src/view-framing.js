import { coordinate } from './coordinates.js';

// Bornes courantes uniquement ; aucune mesure historique ni écriture du monde.
export function getBlackBounds(world) {
  let bounds = null;
  for (const { x, y } of world.blackCells()) {
    if (!bounds) bounds = { minX: x, minY: y, maxX: x, maxY: y };
    else {
      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.maxY = Math.max(bounds.maxY, y);
    }
  }
  return bounds;
}

function centerAnt(camera, ant) {
  const x = coordinate(ant?.x, 'fourmi.x');
  const y = coordinate(ant?.y, 'fourmi.y');
  camera.frame(x + 0.5, y + 0.5);
}

function fitWorld(camera, world) {
  const bounds = getBlackBounds(world);
  if (!bounds) {
    camera.frame(0.5, 0.5, 32);
    return;
  }
  const { minX, minY, maxX, maxY } = bounds;
  const width = coordinate(maxX - minX + 1, 'largeur du monde');
  const height = coordinate(maxY - minY + 1, 'hauteur du monde');
  const margin = Math.min(24, camera.width / 4, camera.height / 4);
  const scale = Math.min(
    160,
    (camera.width - 2 * margin) / width,
    (camera.height - 2 * margin) / height,
  );
  camera.frame(minX + width / 2, minY + height / 2, scale);
}

export class ViewFraming {
  #camera;
  #mode = 'free';

  constructor(camera) {
    this.#camera = camera;
  }
  get mode() {
    return this.#mode;
  }

  select(action, { world, ant }) {
    // Ne valider le mode qu'une fois le cadrage réussi.
    switch (action) {
      case 'origin':
        this.#camera.recenter();
        this.#mode = 'free';
        break;
      case 'ant':
      case 'follow-ant':
        centerAnt(this.#camera, ant);
        this.#mode =
          action === 'follow-ant' || this.#mode === 'ant' ? 'ant' : 'free';
        break;
      case 'world':
        fitWorld(this.#camera, world);
        this.#mode = 'world';
        break;
      default:
        throw new RangeError('Mode de cadrage inconnu.');
    }
  }

  apply({ world, ant }) {
    if (this.#mode === 'ant') centerAnt(this.#camera, ant);
    else if (this.#mode === 'world') fitWorld(this.#camera, world);
  }

  release() {
    this.#mode = 'free';
  }
}
