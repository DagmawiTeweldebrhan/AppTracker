import { readFile, access, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions, ['storage', 'activeTab', 'scripting']);
assert.equal(manifest.host_permissions, undefined, 'No standing host access is required');
for (const file of [manifest.background.service_worker, manifest.action.default_popup, manifest.options_page, ...Object.values(manifest.icons)]) {
  await access(path.join(root, file));
}
async function checkDirectory(directory) {
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await checkDirectory(file);
    else if (file.endsWith('.js') || file.endsWith('.mjs')) {
      const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
    } else if (file.endsWith('.html')) {
      const html = await readFile(path.join(root, file), 'utf8');
      assert.ok(!/<script\b[^>]*>\s*[^<\s]/i.test(html), `${file}: use external scripts for MV3 CSP`);
      assert.ok(!/\son\w+\s*=/i.test(html), `${file}: inline event handlers violate CSP`);
      for (const match of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css|png))"/g)) await access(path.resolve(root, directory, match[1]));
    }
  }
}
for (const directory of ['utils', 'popup', 'dashboard', 'scripts', 'tests']) await checkDirectory(directory);
for (const file of ['background.js', 'content.js']) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}
console.log('Manifest, referenced assets, CSP markup, and JavaScript syntax passed.');
