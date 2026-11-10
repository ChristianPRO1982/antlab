import { expect, test, vi } from 'vitest';
import { Camera } from '../../src/camera.js';
import { drawPaving } from '../../src/renderer.js';

test.each([1, 2])(
  'aperçu sous-pixel : cases présentes sur les pixels physiques, densité %i',
  (density) => {
    const camera = new Camera(800, 600);
    camera.frame(0.5, 0.5, 0.01);
    const context = {
      canvas: { width: 800 * density, height: 600 * density },
      fillRect: vi.fn(),
    };
    const world = { blackCells: () => [{ x: 0, y: 0 }].values() };
    drawPaving(context, camera, world, {
      gridMode: 'none',
      origin: false,
      lanto: false,
    });
    const [x, y, width, height] = context.fillRect.mock.calls.at(-1);
    expect(Number.isInteger(x * density)).toBe(true);
    expect(Number.isInteger(y * density)).toBe(true);
    expect(width * density).toBeGreaterThanOrEqual(1);
    expect(height * density).toBeGreaterThanOrEqual(1);
    expect(width * density).toBeLessThanOrEqual(2);
    expect(height * density).toBeLessThanOrEqual(2);
  },
);
