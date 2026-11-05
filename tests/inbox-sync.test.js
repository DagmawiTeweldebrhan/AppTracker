import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createInboxService } from '../utils/inbox-sync.js';
import { scanQuery } from '../utils/gmail-api.js';
let local, session, calls, failRead, failImport, clock;
const account = 'me@example.com';
const clientId = 'example.apps.googleusercontent.com';
const token = { accessToken: 'test-token', expiresAt: 9999999999999 };
beforeEach(() => {
  local = {}; session = {}; calls = []; failRead = false; failImport = false; clock = 1793872800000;
  globalThis.chrome = {
    storage: {
      local: { get: async () => structuredClone(local), set: async value => Object.assign(local, structuredClone(value)) },
      session: { get: async () => structuredClone(session), set: async value => Object.assign(session, structuredClone(value)) }
    },
    identity: { getRedirectURL: () => 'https://test.chromiumapp.org/gmail' },
    permissions: { contains: async () => true }
  };
});
const api = async (accessToken, resource, parameters) => {
  assert.equal(accessToken, token.accessToken); calls.push({ resource, parameters });
  if (resource === 'profile') return { emailAddress: account };
  if (resource === 'messages') return { messages: [{ id: parameters.pageToken ? 'm2' : 'm1' }], ...(parameters.pageToken ? {} : { nextPageToken: 'page2' }) };
  if (failRead) throw new Error('Temporary network failure');
  return { id: resource.split('/')[1], threadId: 't1', internalDate: String(clock - 1000), payload: {
    mimeType: 'text/plain', headers: [{ name: 'Subject', value: 'Thank you for applying for Engineer at Acme' }, { name: 'From', value: 'Acme <jobs@acme.example>' }], body: { data: Buffer.from('Application received').toString('base64url') }
  } };
};
const service = (overrides = {}) => createInboxService({ api, authorize: async () => token, now: () => clock,
  importMessages: async events => {
    if (failImport) throw new Error('Storage full');
    assert.equal(events[0].company, 'Acme');
    return { automation: { processed: { [`${account}:m1`]: true } } };
  }, ...overrides });
async function connected(instance) { await instance.handle('configure', { clientId }); await instance.handle('connect'); }

test('multi-page scans checkpoint and resume after a worker restart', async () => {
  const first = service(); await connected(first); await first.tick();
  assert.equal(local.inboxSettings.accounts[0].scan.pageToken, 'page2');
  assert.ok(!calls.find(call => call.resource === 'messages').parameters.q.includes('after:'));
  const restarted = service(); await restarted.tick();
  const saved = local.inboxSettings.accounts[0];
  assert.equal(saved.scan, null); assert.equal(saved.completedAt, clock); assert.equal(saved.checked, 2);
  assert.equal(calls.filter(call => call.resource === 'messages').at(-1).parameters.pageToken, 'page2');
  clock += 6 * 60000; await restarted.tick();
  assert.ok(calls.filter(call => call.resource === 'messages').at(-1).parameters.q.includes('after:'));
});
test('failed reads and failed local imports do not advance the page checkpoint', async () => {
  const instance = service(); await connected(instance);
  failRead = true; await instance.tick();
  assert.equal(local.inboxSettings.accounts[0].scan.pageToken, '');
  assert.match(local.inboxSettings.accounts[0].error, /network/);
  failRead = false; failImport = true; await instance.handle('sync');
  assert.equal(local.inboxSettings.accounts[0].scan.pageToken, '');
  failImport = false; await instance.handle('sync');
  assert.equal(local.inboxSettings.accounts[0].scan.pageToken, 'page2');
});
test('pause stops scanning; disconnect removes session tokens and account configuration', async () => {
  const instance = service(); await connected(instance);
  await instance.handle('pause', { email: account });
  const before = calls.length; await instance.handle('sync'); assert.equal(calls.length, before);
  await instance.handle('disconnect', { email: account });
  assert.equal(local.inboxSettings.accounts.length, 0); assert.equal(session.gmailTokens[account], undefined);
});
test('account status never contains access tokens and changing a connected client is rejected', async () => {
  const instance = service(); await connected(instance);
  assert.ok(!JSON.stringify(await instance.handle('status')).includes('test-token'));
  assert.ok(!JSON.stringify(local).includes('test-token'));
  await assert.rejects(instance.handle('configure', { clientId: 'other.apps.googleusercontent.com' }), /Disconnect/);
});
test('silent renewal rejects a different account and leaves the scan untouched', async () => {
  const instance = service(); await connected(instance); session = {};
  const wrong = service({ api: async (value, resource) => resource === 'profile' ? { emailAddress: 'wrong@example.com' } : api(value, resource) });
  await wrong.tick(); assert.match(local.inboxSettings.accounts[0].error, /different account/);
  assert.equal(local.inboxSettings.accounts[0].completedAt, 0);
});
test('incremental query includes read and archived mail and overlaps to catch delayed delivery', () => {
  const query = scanQuery({ until: clock, since: clock - 60000 });
  assert.ok(query.includes('before:')); assert.ok(query.includes('after:'));
  assert.ok(!query.includes('is:unread')); assert.ok(!query.includes('in:inbox'));
});
