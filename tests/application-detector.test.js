import test from 'node:test';
import assert from 'node:assert/strict';
import { detectApplication, gmailMessage, htmlToText } from '../utils/application-detector.js';

const message = (subject, body = '', sender = 'Acme <jobs@acme.example>') => ({
  subject, body, sender, messageId: 'm1', threadId: 't1', account: 'me@example.com', dateReceived: '2026-11-05T10:00:00.000Z'
});
test('confirmation extracts company and role from application wording', () => {
  const event = detectApplication(message('Thank you for applying for Software Engineer at Acme', 'We received your application.'));
  assert.equal(event.status, 'Applied');
  assert.equal(event.company, 'Acme');
  assert.equal(event.role, 'Software Engineer');
  assert.equal(event.body, undefined, 'Bodies must not be persisted');
});
test('confirmation recognizes company-first templates and explicit job titles', () => {
  const event = detectApplication(message('Thank you for applying to Acme', 'Job title: Data Analyst. Your application has been received.'));
  assert.equal(event.company, 'Acme');
  assert.equal(event.role, 'Data Analyst');
});
test('rejection reads the body even with a neutral subject', () => {
  const event = detectApplication(message('Update on your application for Software Engineer at Acme', 'Unfortunately, we will not be moving forward with your application.'));
  assert.equal(event.status, 'Rejected');
  assert.equal(event.company, 'Acme');
  assert.equal(event.role, 'Software Engineer');
});
test('newsletters offers and unrelated regrets do not create applications', () => {
  for (const subject of ['Thank you for subscribing', 'Jobs you may like', 'Your offer code is ready', 'Unfortunately your payment failed', 'We received your support request']) {
    assert.equal(detectApplication(message(subject)), null);
  }
});
test('uncertain company or role is explicitly sent to review', () => {
  const event = detectApplication(message('Thank you for applying', 'We received your application.', 'Greenhouse <noreply@greenhouse.io>'));
  assert.equal(event.company, ''); assert.equal(event.role, ''); assert.equal(event.actionRequired, true);
});
test('quoted historical rejection cannot turn a new confirmation into rejection', () => {
  const event = detectApplication(message('Thank you for applying for Engineer at Acme', 'Do not reply. On Tuesday November 3, Recruiter wrote: We will not be moving forward with your application.'));
  assert.equal(event.status, 'Applied');
});
test('Gmail MIME decoder reads UTF-8 nested body parts, skips attachments and sent mail', () => {
  const payload = { mimeType: 'multipart/mixed', headers: [{ name: 'Subject', value: 'Application received' }, { name: 'From', value: 'Recruiter' }], parts: [
    { mimeType: 'multipart/alternative', parts: [{ mimeType: 'text/html', body: { data: Buffer.from('<p>Résumé for engineer</p>').toString('base64url') } }] },
    { mimeType: 'text/plain', filename: 'private.txt', body: { data: Buffer.from('private attachment').toString('base64url') } }
  ] };
  const decoded = gmailMessage({ id: 'm1', threadId: 't1', internalDate: '1793872800000', payload, labelIds: ['SENT'] }, 'me@example.com');
  assert.ok(decoded.body.includes('Résumé'));
  assert.ok(!decoded.body.includes('private attachment'));
  assert.equal(detectApplication(decoded), null);
  assert.equal(htmlToText('<script>evil()</script><p>Hello &amp; welcome</p>'), 'Hello & welcome');
});
