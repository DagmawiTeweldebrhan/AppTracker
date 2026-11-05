import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCapturedEmail, inferEmailStatus } from '../utils/email-parser.js';

test('capture requires a real thread subject and sender', () => {
  assert.throws(() => parseCapturedEmail({}), /Open a Gmail conversation/);
  assert.throws(() => parseCapturedEmail({ subject: 'Jobs', sender: 'HR' }));
  const result = parseCapturedEmail({ threadId: '0:abc', subject: ' Hello ', sender: 'hr@example.com' });
  assert.equal(result.threadId, 'gmail:0:abc');
  assert.equal(result.subject, 'Hello');
  assert.equal(result.applicationId, '');
  assert.equal(result.actionRequired, false);
  assert.ok(!Number.isNaN(Date.parse(result.dateReceived)));
});
test('status suggestions classify common subjects without modifying input', () => {
  assert.equal(inferEmailStatus('Unfortunately, we are not moving forward'), 'Rejected');
  assert.equal(inferEmailStatus('Schedule an interview'), 'Interviewing');
  assert.equal(inferEmailStatus('Your offer is ready'), 'Offer');
  assert.equal(inferEmailStatus('Thanks for applying'), 'Applied');
});
