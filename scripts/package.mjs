import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const destination = path.join(root, 'dist', 'AppTracker');
const allowed = ['manifest.json', 'background.js', 'content.js', 'assets', 'popup', 'dashboard', 'utils'];
await mkdir(destination, { recursive: true });
// Fail on unexpected stale output rather than shipping unrelated files.
for (const entry of await readdir(destination)) {
  if (!allowed.includes(entry)) throw new Error(`Unexpected package entry: ${entry}. Use a fresh output directory.`);
}
for (const entry of allowed) await cp(path.join(root, entry), path.join(destination, entry), { recursive: true });
console.log(`Unpacked extension ready: ${destination}`);
