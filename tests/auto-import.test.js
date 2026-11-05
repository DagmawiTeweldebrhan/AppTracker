import test from 'node:test';
import assert from 'node:assert/strict';
import { importDetectedMessages } from '../utils/auto-import.js';
import { application } from '../utils/models.js';

const fresh = () => ({ applications: [], tracked_emails: [], automation: { processed: {}, applications: {}, threads: {} } });
const event = patch => ({ account: 'me@example.com', messageId: 'm1', threadId: 't1', company: 'Acme', role: 'Engineer', subject: 'Application received', sender: 'jobs@acme.example', dateReceived: '2026-11-01T10:00:00.000Z', status: 'Applied', ...patch });

test('repeated scans create one application and email; bodies are never stored', () => {
  const state = fresh();
  importDetectedMessages(state, [event({ body: 'private' }), event({ body: 'private' })]);
  assert.equal(state.applications.length, 1); assert.equal(state.tracked_emails.length, 1);
  assert.equal(state.tracked_emails[0].applicationId, state.applications[0].id);
  assert.ok(!JSON.stringify(state).includes('private'));
});
test('newest rejection wins even when an older confirmation is scanned later', () => {
  const state = fresh();
  importDetectedMessages(state, [event({ messageId: 'm2', threadId: 't2', status: 'Rejected', dateReceived: '2026-11-04T10:00:00.000Z' })]);
  importDetectedMessages(state, [event()]);
  assert.equal(state.applications.length, 1);
  assert.equal(state.applications[0].status, 'Rejected');
  assert.equal(state.applications[0].dateApplied, '2026-11-01T10:00:00.000Z');
});
test('role ambiguity never links a rejection to one of several jobs at a company', () => {
  const state = fresh();
  importDetectedMessages(state, [event(), event({ messageId: 'm2', threadId: 't2', role: 'Designer' })]);
  importDetectedMessages(state, [event({ messageId: 'm3', threadId: 't3', role: '', status: 'Rejected' })]);
  assert.equal(state.applications.length, 2);
  assert.ok(state.applications.every(item => item.status === 'Applied'));
  assert.equal(state.tracked_emails[2].applicationId, '');
  assert.equal(state.tracked_emails[2].actionRequired, true);
});
test('one known company application can receive a rejection missing its role', () => {
  const state = fresh(); importDetectedMessages(state, [event()]);
  importDetectedMessages(state, [event({ messageId: 'm2', threadId: 't2', role: '', status: 'Rejected', dateReceived: '2026-11-05T10:00:00.000Z' })]);
  assert.equal(state.applications[0].status, 'Rejected');
});
test('old mail does not overwrite a more recent manual status change', () => {
  const state = fresh();
  const item = application({ company: 'Acme', role: 'Engineer', status: 'Interviewing', dateApplied: '2026-11-01' });
  state.applications.push(item);
  state.automation.applications[item.id] = { lastStatusAt: Date.parse('2026-11-05T12:00:00Z') };
  importDetectedMessages(state, [event({ status: 'Rejected' })]);
  assert.equal(item.status, 'Interviewing');
});
test('a newer unlinked rejection remains rejected after an older clear confirmation resolves its thread', () => {
  const state = fresh();
  importDetectedMessages(state, [event({ messageId: 'm2', company: '', role: '', status: 'Rejected', dateReceived: '2026-11-05T10:00:00.000Z' })]);
  importDetectedMessages(state, [event()]);
  assert.equal(state.applications[0].status, 'Rejected');
  assert.equal(state.tracked_emails[0].applicationId, state.applications[0].id);
});
test('account-scoped identifiers avoid collisions and deletion tombstones survive rescans', () => {
  const state = fresh(); importDetectedMessages(state, [event()]);
  state.applications = []; state.tracked_emails = [];
  importDetectedMessages(state, [event()]);
  assert.equal(state.applications.length, 0);
  importDetectedMessages(state, [event({ account: 'other@example.com', threadId: 'other:t1' })]);
  assert.equal(state.applications.length, 1);
});
