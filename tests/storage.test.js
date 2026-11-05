import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mutate, readState } from '../utils/storage.js';

let data;
let failNext;
globalThis.chrome = { storage: { local: {
  async get() { await new Promise(resolve => setTimeout(resolve, 2)); return structuredClone(data); },
  async set(next) {
    if (failNext) { failNext = false; throw new Error('Quota exceeded'); }
    data = structuredClone(next);
  }
} } };
beforeEach(() => { data = {}; failNext = false; });
const applicationInput = company => ({ company, role: 'Engineer', status: 'Applied', dateApplied: '2026-11-05' });
const emailInput = (threadId, applicationId = '') => ({ threadId, applicationId, subject: 'Interview', sender: 'Recruiter', dateReceived: '2026-11-05' });

test('concurrent writers preserve every application', async () => {
  await Promise.all(Array.from({ length: 15 }, (_, i) => mutate('saveApplication', applicationInput(`Company ${i}`))));
  assert.equal((await readState()).applications.length, 15);
});
test('relinking and deleting email reconcile both application link arrays', async () => {
  await mutate('saveApplication', applicationInput('A'));
  let state = await mutate('saveApplication', applicationInput('B'));
  const [a,b] = state.applications;
  state = await mutate('saveEmail', emailInput('thread', a.id));
  assert.deepEqual(state.applications[0].linkedEmailThreadIds, ['thread']);
  state = await mutate('saveEmail', emailInput('thread', b.id));
  assert.deepEqual(state.applications[0].linkedEmailThreadIds, []);
  assert.deepEqual(state.applications[1].linkedEmailThreadIds, ['thread']);
  state = await mutate('deleteEmail', { threadId: 'thread' });
  assert.deepEqual(state.applications[1].linkedEmailThreadIds, []);
});
test('application deletion retains email and clears its foreign key', async () => {
  let state = await mutate('saveApplication', applicationInput('A'));
  const id = state.applications[0].id;
  await mutate('saveEmail', emailInput('thread', id));
  state = await mutate('deleteApplication', { id });
  assert.equal(state.tracked_emails.length, 1);
  assert.equal(state.tracked_emails[0].applicationId, '');
});
test('invalid links fail atomically and queue recovers after errors', async () => {
  await assert.rejects(mutate('saveEmail', emailInput('thread', 'missing')), /no longer exists/);
  assert.deepEqual((await readState()).tracked_emails, []);
  failNext = true;
  await assert.rejects(mutate('saveApplication', applicationInput('Failed')), /Quota/);
  await mutate('saveApplication', applicationInput('Success'));
  assert.equal((await readState()).applications.length, 1);
});
test('stale application edits cannot recreate deleted records', async () => {
  await assert.rejects(mutate('saveApplication', { ...applicationInput('A'), id: 'deleted' }), /no longer exists/);
  await assert.rejects(mutate('unsupported', {}), /Unknown/);
});
test('manually resolving an ambiguous detected rejection applies its status to the selected application', async () => {
  let state = await mutate('saveApplication', applicationInput('A'));
  const id = state.applications[0].id;
  const event = { ...emailInput('detected'), messageId: 'm1', account: 'me@example.com', company: '', role: '', status: 'Rejected' };
  state = await mutate('importDetectedEmails', { events: [event] });
  assert.equal(state.tracked_emails[0].applicationId, '');
  state = await mutate('saveEmail', { ...state.tracked_emails[0], applicationId: id });
  assert.equal(state.applications[0].status, 'Rejected');
  assert.deepEqual(state.applications[0].linkedEmailThreadIds, ['detected']);
});
