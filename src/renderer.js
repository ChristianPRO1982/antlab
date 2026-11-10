import { getCellGeometry } from './geometry.js';

const patternCache = new WeakMap();

function sameCross(a, b) {
  return a.x === b.x && a.y === b.y;
}

function gridPattern(context, scale, density, grid, outlines) {
  const cached = patternCache.get(context);
  if (
    cached?.scale === scale &&
    cached.density === density &&
    cached.grid === grid &&
    cached.outlines === outlines
  )
    return cached;

  // Le pavage se répète tous les cinq entiers sur chacun des deux axes.
  const tile = document.createElement('canvas');
  tile.width = tile.height = Math.ceil(5 * scale * density);
  const tileContext = tile.getContext('2d');
  if (!tileContext)
    throw new Error('Le rendu du motif Canvas est indisponible.');
  const ratio = tile.width / (5 * scale);
  tileContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  const inner = new Path2D();
  const outer = new Path2D();

  // La marge inclut les demi-traits coupés aux bords du motif répétitif.
  for (let y = -1; y <= 5; y++) {
    for (let x = -1; x <= 5; x++) {
      const px = x * scale;
      const py = (4 - y) * scale;
      const owner = getCellGeometry(x, y).center;
      const horizontal = sameCross(owner, getCellGeometry(x, y + 1).center)
        ? inner
        : outer;
      horizontal.moveTo(px, py);
      horizontal.lineTo(px + scale, py);
      const vertical = sameCross(owner, getCellGeometry(x + 1, y).center)
        ? inner
        : outer;
      vertical.moveTo(px + scale, py);
      vertical.lineTo(px + scale, py + scale);
    }
  }
  // En dessous de huit pixels/case, réduire aussi les traits pour ne pas tout masquer.
  tileContext.lineWidth = Math.min(1, scale / 8);
  tileContext.strokeStyle = '#cccccc';
  if (grid) tileContext.stroke(inner);
  if (outlines) {
    tileContext.lineWidth = Math.min(2, scale / 4);
    tileContext.strokeStyle = '#555555';
  }
  if (grid || outlines) tileContext.stroke(outer);
  const pattern = context.createPattern(tile, 'repeat');
  if (!pattern) throw new Error('Impossible de créer le motif du pavage.');
  const entry = { scale, density, grid, outlines, pattern, ratio: 1 / ratio };
  patternCache.set(context, entry);
  return entry;
}

export function drawPaving(
  context,
  camera,
  world,
  {
    grid = true,
    outlines = true,
    origin: showOrigin = true,
    lanto = true,
  } = {},
  sprite = null,
) {
  const { width, height, scale } = camera;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  const topLeft = camera.screenToWorld(0, 0);
  const bottomRight = camera.screenToWorld(width, height);
  context.fillStyle = '#000000';
  for (const { x, y } of world.blackCells()) {
    if (
      x + 1 < topLeft.x ||
      x > bottomRight.x ||
      y + 1 < bottomRight.y ||
      y > topLeft.y
    )
      continue;
    const point = camera.worldToScreen(x, y + 1);
    context.fillRect(point.x, point.y, scale, scale);
  }

  const origin = camera.worldToScreen(0, 0);
  if (grid || outlines) {
    const { pattern, ratio } = gridPattern(
      context,
      scale,
      context.canvas.width / width,
      grid,
      outlines,
    );
    pattern.setTransform({
      a: ratio,
      d: ratio,
      e: origin.x % (5 * scale),
      f: origin.y % (5 * scale),
    });
    context.fillStyle = pattern;
    context.fillRect(0, 0, width, height);
  }

  if (lanto && sprite?.complete && sprite.naturalWidth > 0) {
    const center = camera.worldToScreen(0.5, 0.5);
    const size = 0.9 * scale;
    context.drawImage(
      sprite,
      center.x - size / 2,
      center.y - size / 2,
      size,
      size,
    );
  }

  if (showOrigin) {
    const inset = Math.min(6, scale / 4);
    context.beginPath();
    context.arc(
      origin.x + inset,
      origin.y - inset,
      Math.min(3, scale / 8),
      0,
      2 * Math.PI,
    );
    context.fillStyle = '#666666';
    context.fill();
  }
}
