import test from 'node:test';
import assert from 'node:assert/strict';
import { application, email, safeUrl } from '../utils/models.js';

const input = { company: ' Example ', role: ' Engineer ', status: 'Applied', dateApplied: '2026-11-05', url: '' };
test('application follows architecture schema and preserves identity on edit', () => {
  const item = application(input);
  assert.equal(item.company, 'Example');
  assert.equal(item.role, 'Engineer');
  assert.deepEqual(item.linkedEmailThreadIds, []);
  assert.equal(application({ ...input, status: 'Rejected' }, item).id, item.id);
  assert.deepEqual(Object.keys(item).sort(), ['id','company','role','status','dateApplied','url','notes','linkedEmailThreadIds'].sort());
});
test('invalid required fields statuses and dates fail before persistence', () => {
  for (const patch of [{ company: '  ' }, { role: '' }, { status: 'Hired' }, { dateApplied: 'invalid' }]) {
    assert.throws(() => application({ ...input, ...patch }));
  }
});
test('job URLs reject executable and browser-internal schemes', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'file:///secret', 'chrome://settings', 'not-a-url']) assert.throws(() => safeUrl(url));
  assert.equal(safeUrl('https://example.com/job'), 'https://example.com/job');
});
test('email requires metadata and uses a strict boolean action flag', () => {
  assert.throws(() => email({ subject: '', sender: 'test', dateReceived: '2026-11-05' }));
  const item = email({ subject: 'Interview', sender: 'Recruiter', dateReceived: '2026-11-05', actionRequired: 'false' });
  assert.equal(item.actionRequired, false);
  assert.equal(item.applicationId, '');
});
