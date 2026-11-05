import { mutate } from './utils/storage.js';
import { createInboxService, SYNC_ALARM } from './utils/inbox-sync.js';

const inbox = createInboxService();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!['apptracker:mutate', 'apptracker:inbox'].includes(message?.type)) return;
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(''))) {
    sendResponse({ ok: false, error: 'Only AppTracker pages may update records.' });
    return;
  }
  const task = message.type === 'apptracker:inbox'
    ? inbox.handle(message.operation, message.payload) : mutate(message.operation, message.payload);
  task.then(state => {
    sendResponse({ ok: true, state });
    if (message.type === 'apptracker:inbox' && message.operation === 'connect') inbox.tick().catch(() => {});
  })
    .catch(error => sendResponse({ ok: false, error: error.message }));
  return true;
});

async function ensureAlarm() {
  if (!await chrome.alarms.get(SYNC_ALARM)) await chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 1 });
}
chrome.runtime.onInstalled.addListener(() => ensureAlarm().catch(() => {}));
chrome.runtime.onStartup.addListener(() => ensureAlarm().catch(() => {}));
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === SYNC_ALARM) inbox.tick().catch(() => {});
});
// Tokens are session-only; neither tokens nor inbox state are exposed to content scripts.
chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }).catch(() => {});
chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }).catch(() => {});
ensureAlarm().catch(() => {});
