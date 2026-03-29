/**
 * Remove Next.js output and webpack caches (fixes MODULE_NOT_FOUND / missing chunk *.js on Windows).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const targets = ['.next', path.join('node_modules', '.cache')];

for (const rel of targets) {
  const dir = path.join(root, rel);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('removed', rel);
  } catch (e) {
    if (e.code !== 'ENOENT') console.warn('clean:', rel, e.message);
  }
}
