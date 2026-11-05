import { chromium } from '../.tools/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import path from 'node:path';

const root = process.cwd();
const context = await chromium.launchPersistentContext(path.join(root, '.tools', 'inbox-test-profile'), {
  channel: 'chromium', headless: true,
  args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`]
});
const errors = [];
context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
try {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  await worker.evaluate(() => chrome.storage.local.clear());
  const id = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${id}/dashboard/index.html`);
  await page.getByRole('heading', { name: 'Automatic inbox tracking' }).waitFor();
  await page.getByRole('button', { name: 'Connect Gmail inbox', exact: true }).click();
  await page.getByText('Complete Gmail connection setup first, then connect your inbox.').waitFor();
  await page.evaluate(async () => {
    const { createInboxService } = await import(chrome.runtime.getURL('utils/inbox-sync.js'));
    // All credentials and Gmail responses here are fixtures in a disposable test profile.
    const originalContains = chrome.permissions.contains;
    chrome.permissions.contains = async () => true;
    let rejected = false;
    const service = createInboxService({
      authorize: async () => ({ accessToken: 'fixture-only', expiresAt: Date.now() + 3600000 }),
      api: async (token, resource) => {
        if (token !== 'fixture-only') throw new Error('Unexpected fixture token');
        if (resource === 'profile') return { emailAddress: 'fixture@example.com' };
        if (resource === 'messages') return { messages: [{ id: rejected ? 'rejection' : 'confirmation' }] };
        return {
          id: rejected ? 'rejection' : 'confirmation', threadId: 'fixture-thread', internalDate: String(Date.now()),
          payload: { mimeType: 'text/plain', headers: [{ name: 'Subject', value: 'Your application for Engineer at Fixture Labs' }, { name: 'From', value: 'Fixture Labs <jobs@fixture.example>' }],
            body: { data: btoa(rejected ? 'Unfortunately, we will not be moving forward with your application.' : 'Thank you for applying. We received your application.') } }
        };
      }
    });
    try {
      await service.handle('configure', { clientId: 'fixture.apps.googleusercontent.com' });
      await service.handle('connect');
      await service.handle('sync');
      rejected = true;
      await service.handle('sync');
      await service.handle('pause', { email: 'fixture@example.com' });
    } finally { chrome.permissions.contains = originalContains; }
  });
  await page.getByRole('cell', { name: 'Fixture Labs', exact: false }).waitFor();
  await page.getByRole('cell', { name: 'Rejected', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Rejection log' }).click();
  await page.getByRole('cell', { name: 'Fixture Labs', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Emails', exact: false }).click();
  await page.getByText('Detected in fixture@example.com', { exact: true }).waitFor();
  assert.equal(await page.locator('#records tbody tr').count(), 1, 'Messages in one thread must deduplicate');
  await page.reload();
  await page.getByText('fixture@example.com', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Resume', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Disconnect', exact: true }).click();
  await page.getByText('Inbox disconnected. Previously imported applications and emails were kept.').waitFor();
  assert.equal(await page.locator('#records tbody tr').count(), 1);
  assert.deepEqual(errors, []);
  console.log('PASS: actual extension scan/import/storage/UI pipeline with fixture Gmail responses, automatic rejection, deduplication, connection controls, persistence, and disconnect. No live mailbox accessed.');
} finally { await context.close(); }
