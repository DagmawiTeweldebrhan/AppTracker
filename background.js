import { mutate } from './utils/storage.js';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'apptracker:mutate') return;
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(''))) {
    sendResponse({ ok: false, error: 'Only AppTracker pages may update records.' });
    return;
  }
  mutate(message.operation, message.payload)
    .then(state => sendResponse({ ok: true, state }))
    .catch(error => sendResponse({ ok: false, error: error.message }));
  return true;
});
