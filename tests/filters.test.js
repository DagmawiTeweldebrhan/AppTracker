import test from 'node:test';
import assert from 'node:assert/strict';
import { filterRecords } from '../utils/filters.js';
const records = [
  { company: 'Beta', role: 'Designer', notes: 'Final round', status: 'Rejected', dateApplied: '2026-11-04' },
  { company: 'Alpha', role: 'Engineer', notes: '', status: 'Applied', dateApplied: '2026-11-05' },
  { company: 'Gamma', role: 'Engineer', notes: '', status: 'Interviewing', dateApplied: '2026-11-03' }
];
test('rejection view includes only exact Rejected status', () => {
  assert.deepEqual(filterRecords(records, { status: 'Rejected' }).map(item => item.company), ['Beta']);
});
test('search includes role and feedback, ignores case, and combines with status', () => {
  assert.equal(filterRecords(records, { query: ' ENGINEER ' }).length, 2);
  assert.equal(filterRecords(records, { query: 'final round', status: 'Rejected' }).length, 1);
  assert.equal(filterRecords(records, { query: 'Engineer', status: 'Rejected' }).length, 0);
});
test('sorting leaves stored order untouched', () => {
  assert.deepEqual(filterRecords(records, { sort: 'company' }).map(item => item.company), ['Alpha','Beta','Gamma']);
  assert.equal(filterRecords(records)[0].company, 'Alpha');
  assert.equal(filterRecords(records, { sort: 'oldest' })[0].company, 'Gamma');
  assert.equal(records[0].company, 'Beta');
});
test('email searches and sorts use email schema fields', () => {
  const emails = [{ subject: 'Interview', sender: 'Zoe', dateReceived: '2026-11-05' }, { subject: 'Update', sender: 'Amy', dateReceived: '2026-11-04' }];
  assert.equal(filterRecords(emails, { emails: true, query: 'zoe' }).length, 1);
  assert.equal(filterRecords(emails, { emails: true, sort: 'company' })[0].sender, 'Amy');
});
