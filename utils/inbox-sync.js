import { authorizeGmail, validateClientId } from './gmail-auth.js';
import { gmailGet, scanQuery } from './gmail-api.js';
import { gmailMessage, detectApplication } from './application-detector.js';
import { mutate } from './storage.js';

const SETTINGS_KEY = 'inboxSettings';
const TOKENS_KEY = 'gmailTokens';
export const SYNC_ALARM = 'apptracker:inbox-sync';

export function createInboxService({ api = gmailGet, authorize = authorizeGmail,
  importMessages = events => mutate('importDetectedEmails', { events }), now = () => Date.now() } = {}) {
  let pending = Promise.resolve();
  const serialize = task => {
    const next = pending.then(task);
    pending = next.catch(() => {});
    return next;
  };
  const read = async () => {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    return result[SETTINGS_KEY] || { clientId: '', accounts: [] };
  };
  const save = settings => chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  const tokens = async () => (await chrome.storage.session.get(TOKENS_KEY))[TOKENS_KEY] || {};
  const saveTokens = value => chrome.storage.session.set({ [TOKENS_KEY]: value });

  async function accessToken(settings, account) {
    const cache = await tokens();
    if (cache[account.email]?.expiresAt > now() + 60000) return cache[account.email].accessToken;
    let token;
    try { token = await authorize(settings.clientId, { email: account.email }); }
    catch { throw new Error('Reconnect this inbox to renew read-only Gmail access.'); }
    const profile = await api(token.accessToken, 'profile');
    if (profile.emailAddress?.toLowerCase() !== account.email) throw new Error('Google selected a different account. Reconnect the intended inbox.');
    cache[account.email] = token;
    await saveTokens(cache);
    return token.accessToken;
  }

  async function scanAccount(settings, account) {
    try {
      if (!await chrome.permissions.contains({ origins: ['https://gmail.googleapis.com/*'] })) {
        throw new Error('Gmail access is disabled. Connect an inbox to allow read-only scanning.');
      }
      const token = await accessToken(settings, account);
      if (!account.scan) account.scan = { since: account.completedAt || 0, until: now(), pageToken: '' };
      const page = await api(token, 'messages', { maxResults: '25', q: scanQuery(account.scan),
        ...(account.scan.pageToken ? { pageToken: account.scan.pageToken } : {}) });
      const events = [];
      const messages = page.messages || [];
      // Small bounded groups keep rate limits and service-worker lifetime predictable.
      for (let offset = 0; offset < messages.length; offset += 5) {
        const batch = await Promise.all(messages.slice(offset, offset + 5).map(async item => {
          const message = await api(token, `messages/${encodeURIComponent(item.id)}`, { format: 'full' });
          return detectApplication(gmailMessage(message, account.email));
        }));
        events.push(...batch.filter(Boolean));
      }
      if (events.length) {
        const state = await importMessages(events);
        account.detected = Object.keys(state.automation.processed).filter(key => key.startsWith(`${account.email}:`)).length;
      }
      account.checked = (account.checked || 0) + messages.length;
      account.error = '';
      account.lastCheckedAt = now();
      if (page.nextPageToken) {
        account.scan.pageToken = page.nextPageToken;
        account.nextCheckAt = 0;
      } else {
        account.completedAt = account.scan.until;
        account.scan = null;
        account.nextCheckAt = now() + 5 * 60000;
      }
    } catch (error) {
      // Do not advance the checkpoint on partial reads or failed local writes.
      account.error = error.message;
      account.nextCheckAt = now() + 60000;
      if (error.status === 401) {
        const cache = await tokens(); delete cache[account.email]; await saveTokens(cache);
      }
    }
  }

  async function sync(force = false) {
    const settings = await read();
    for (const account of settings.accounts) {
      if (!account.paused && (force || !account.nextCheckAt || account.nextCheckAt <= now())) {
        await scanAccount(settings, account);
        await save(settings);
      }
    }
    return settings;
  }

  async function handle(operation, payload = {}) {
    if (operation === 'status') return { ...await read(), redirectUri: chrome.identity.getRedirectURL('gmail') };
    if (operation === 'sync') return sync(true);
    const settings = await read();
    if (operation === 'configure') {
      const clientId = validateClientId(payload.clientId);
      if (settings.accounts.length && settings.clientId !== clientId) throw new Error('Disconnect your inboxes before changing the Google client ID.');
      settings.clientId = clientId;
    } else if (operation === 'connect') {
      validateClientId(settings.clientId);
      if (!await chrome.permissions.contains({ origins: ['https://gmail.googleapis.com/*'] })) throw new Error('Allow Gmail access when connecting an inbox.');
      const token = await authorize(settings.clientId, { interactive: true, email: payload.email || '' });
      const profile = await api(token.accessToken, 'profile');
      const email = profile.emailAddress?.toLowerCase();
      if (!email) throw new Error('Gmail did not identify the connected inbox.');
      if (payload.email && email !== payload.email) throw new Error('A different account was selected. Connect that account separately.');
      const cache = await tokens(); cache[email] = token; await saveTokens(cache);
      let account = settings.accounts.find(item => item.email === email);
      if (!account) { account = { email, paused: false, checked: 0, detected: 0, completedAt: 0 }; settings.accounts.push(account); }
      account.error = ''; account.nextCheckAt = 0;
    } else {
      const account = settings.accounts.find(item => item.email === payload.email);
      if (!account) throw new Error('This inbox is no longer connected.');
      if (operation === 'pause') account.paused = !account.paused;
      else if (operation === 'disconnect') {
        settings.accounts = settings.accounts.filter(item => item !== account);
        const cache = await tokens(); delete cache[account.email]; await saveTokens(cache);
      } else throw new Error('Unknown inbox operation.');
    }
    await save(settings);
    return settings;
  }
  return {
    handle: (operation, payload) => serialize(() => handle(operation, payload)),
    tick: () => serialize(() => sync()),
  };
}
