import { node } from '../utils/dom.js';

const list = document.querySelector('#connected-inboxes');
const message = document.querySelector('#inbox-message');
const connect = document.querySelector('#connect-inbox');
const scan = document.querySelector('#sync-inboxes');
let current = { clientId: '', accounts: [] };
let busy = false;

async function command(operation, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type: 'apptracker:inbox', operation, payload });
  if (!response?.ok) throw new Error(response?.error || 'Could not reach inbox tracking. Reload the extension and try again.');
  return response.state;
}

function showMessage(value, error = false) {
  message.textContent = value;
  message.dataset.error = String(error);
  message.setAttribute('role', error ? 'alert' : 'status');
}

function render(settings) {
  current = settings;
  if (settings.redirectUri) document.querySelector('#gmail-redirect').value = settings.redirectUri;
  if (document.activeElement !== document.querySelector('#gmail-client-id')) document.querySelector('#gmail-client-id').value = settings.clientId;
  if (!settings.clientId) document.querySelector('#inbox-setup').open = true;
  scan.disabled = busy || !settings.accounts.some(account => !account.paused);
  connect.disabled = busy;
  list.replaceChildren(...settings.accounts.map(account => {
    const item = node('li', '', 'connected-inbox');
    const info = node('div'); info.append(node('strong', account.email));
    const progress = account.paused ? 'Paused' : account.scan
      ? 'Scanning older mail — continues automatically each minute'
      : account.completedAt ? `Up to date · Checked ${new Date(account.lastCheckedAt).toLocaleString()}` : 'Waiting for first scan';
    info.append(node('p', `${progress} · ${account.checked || 0} messages checked · ${account.detected || 0} application emails found`, 'account-progress'));
    if (account.error) info.append(node('p', account.error, 'inbox-error'));
    const buttons = node('div', '', 'inbox-actions');
    for (const [label, operation] of [[account.paused ? 'Resume' : 'Pause', 'pause'], ['Reconnect', 'connect'], ['Disconnect', 'disconnect']]) {
      const button = node('button', label, 'action-button'); button.type = 'button';
      button.dataset.operation = operation; button.dataset.email = account.email; button.disabled = busy;
      buttons.append(button);
    }
    item.append(info, buttons);
    return item;
  }));
}

async function run(operation, payload = {}) {
  if (busy) return;
  busy = true; render(current);
  showMessage(operation === 'sync' ? 'Scanning the next batch in each active inbox…' : 'Updating inbox connection…');
  try {
    if (operation === 'connect') {
      if (!current.clientId) {
        document.querySelector('#inbox-setup').open = true;
        document.querySelector('#gmail-client-id').focus();
        throw new Error('Complete Gmail connection setup first, then connect your inbox.');
      }
      const granted = await chrome.permissions.request({ origins: ['https://gmail.googleapis.com/*'] });
      if (!granted) throw new Error('Gmail access was not allowed. Your existing records are unchanged.');
    }
    const settings = await command(operation, payload);
    render(settings);
    showMessage(operation === 'connect' ? 'Inbox connected. Scanning starts automatically; detected applications will appear below.'
      : operation === 'disconnect' ? 'Inbox disconnected. Previously imported applications and emails were kept.'
      : operation === 'sync' ? 'Batch checked. Larger inboxes continue scanning automatically. Check each inbox for errors or progress.' : 'Inbox settings updated.');
  } catch (error) { showMessage(error.message, true); }
  finally { busy = false; render(current); }
}

connect.addEventListener('click', () => run('connect'));
scan.addEventListener('click', () => run('sync'));
document.querySelector('#inbox-settings').addEventListener('submit', event => {
  event.preventDefault(); run('configure', { clientId: document.querySelector('#gmail-client-id').value });
});
list.addEventListener('click', event => {
  const button = event.target.closest('button[data-operation]');
  if (button) run(button.dataset.operation, { email: button.dataset.email });
});
async function load() {
  try { render(await command('status')); }
  catch (error) { showMessage(error.message, true); }
}
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.inboxSettings && !busy) load();
});
load();
