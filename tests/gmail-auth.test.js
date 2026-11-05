import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAuthorizationResponse, validateClientId, GMAIL_SCOPE } from '../utils/gmail-auth.js';
import { gmailGet } from '../utils/gmail-api.js';
const redirect = 'https://test.chromiumapp.org/gmail';
const callback = patch => `${redirect}#${new URLSearchParams({ state: 'expected', token_type: 'Bearer', access_token: 'fixture-token', expires_in: '3600', scope: GMAIL_SCOPE, ...patch })}`;
test('authorization checks exact redirect, state, granted scope, type and lifetime', () => {
  assert.equal(parseAuthorizationResponse(callback(), redirect, 'expected').accessToken, 'fixture-token');
  for (const patch of [{ state: 'wrong' }, { token_type: 'other' }, { expires_in: 'NaN' }, { scope: 'email' }, { access_token: '' }, { error: 'access_denied' }]) {
    assert.throws(() => parseAuthorizationResponse(callback(patch), redirect, 'expected'));
  }
  assert.throws(() => parseAuthorizationResponse(callback().replace('test.chromiumapp.org', 'evil.example'), redirect, 'expected'));
  assert.throws(() => parseAuthorizationResponse(callback().replace('/gmail#', '/gmail/extra#'), redirect, 'expected'));
});
test('client configuration accepts only Google OAuth client IDs', () => {
  assert.equal(validateClientId(' example.apps.googleusercontent.com '), 'example.apps.googleusercontent.com');
  assert.throws(() => validateClientId('https://evil.example'));
});
test('Gmail token is sent in the authorization header and never in the URL', async () => {
  const result = await gmailGet('fixture-token', 'messages', { q: 'application' }, async (url, options) => {
    assert.ok(!url.includes('fixture-token')); assert.ok(url.startsWith('https://gmail.googleapis.com/'));
    assert.equal(options.headers.Authorization, 'Bearer fixture-token');
    return { ok: true, json: async () => ({ messages: [] }) };
  });
  assert.deepEqual(result.messages, []);
});
test('Gmail permission, expiry and quota failures remain actionable', async () => {
  for (const status of [401, 403, 429, 500]) {
    await assert.rejects(gmailGet('token', 'messages', {}, async () => ({ ok: false, status })), error => error.status === status);
  }
});
