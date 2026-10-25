/**
 * The web game serves its own copy of CanvasKit's .wasm file (public/canvaskit.wasm), and the
 * preload names the version to fetch from unpkg. Both must match the CanvasKit that Skia
 * installs, or the web game fails to start. Upgrading Skia can change CanvasKit's version.
 */
import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..', '..');
const installed = path.join(root, 'node_modules', 'canvaskit-wasm');

describe('CanvasKit on the web', () => {
  it('public/canvaskit.wasm is the installed CanvasKit', () => {
    const served = fs.readFileSync(path.join(root, 'public', 'canvaskit.wasm'));
    const current = fs.readFileSync(path.join(installed, 'bin', 'full', 'canvaskit.wasm'));
    expect(served.equals(current)).toBe(true);
  });

  it('the preload and the wrapper name the installed version', () => {
    const { version } = JSON.parse(fs.readFileSync(path.join(installed, 'package.json'), 'utf8'));
    for (const file of ['src/skiaWasmPreload.web.ts', 'src/components/SkiaWrapper.web.tsx']) {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      expect(source).toContain(`const CANVASKIT_VERSION = '${version}';`);
    }
  });
});
