export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

export function validateClientId(value) {
  const clientId = String(value || '').trim();
  if (!/^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId)) {
    throw new Error('Enter the Google OAuth web client ID ending in .apps.googleusercontent.com.');
  }
  return clientId;
}

export function parseAuthorizationResponse(response, redirect, state) {
  const url = new URL(response);
  const expected = new URL(redirect);
  if (url.origin !== expected.origin || url.pathname !== expected.pathname) throw new Error('Unexpected Google sign-in redirect.');
  const parameters = new URLSearchParams(url.hash.slice(1));
  if (parameters.get('state') !== state) throw new Error('Google sign-in state did not match. Try connecting again.');
  if (parameters.get('error')) throw new Error('Google sign-in was declined or requires reconnecting.');
  if (parameters.get('token_type')?.toLowerCase() !== 'bearer' || !parameters.get('access_token')) throw new Error('Google did not return an access token.');
  if (!parameters.get('scope')?.split(' ').includes(GMAIL_SCOPE)) throw new Error('Read-only Gmail access is required to scan application emails.');
  const seconds = Number(parameters.get('expires_in'));
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Google returned an invalid token lifetime.');
  return { accessToken: parameters.get('access_token'), expiresAt: Date.now() + Math.min(seconds, 86400) * 1000 };
}

export async function authorizeGmail(clientId, { interactive = false, email = '' } = {}) {
  const redirect = chrome.identity.getRedirectURL('gmail');
  const state = crypto.randomUUID();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({ client_id: validateClientId(clientId), redirect_uri: redirect,
    response_type: 'token', scope: GMAIL_SCOPE, state,
    prompt: interactive ? 'select_account consent' : 'none', ...(email ? { login_hint: email } : {}) });
  const response = await chrome.identity.launchWebAuthFlow({ url: url.href, interactive,
    ...(!interactive ? { abortOnLoadForNonInteractive: false, timeoutMsForNonInteractive: 15000 } : {}) });
  if (!response) throw new Error('Google sign-in did not complete. Reconnect this inbox.');
  return parseAuthorizationResponse(response, redirect, state);
}
