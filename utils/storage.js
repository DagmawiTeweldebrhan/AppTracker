import { application, email } from './models.js';

let pending = Promise.resolve();
export async function readState() {
  const result = await chrome.storage.local.get(['applications', 'tracked_emails']);
  return {
    applications: Array.isArray(result.applications) ? result.applications : [],
    tracked_emails: Array.isArray(result.tracked_emails) ? result.tracked_emails : []
  };
}

// All UI writes go through the worker so simultaneous popup/dashboard edits serialize.
export async function request(operation, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type: 'apptracker:mutate', operation, payload });
  if (!response?.ok) throw new Error(response?.error || 'Storage is unavailable. Please try again.');
  return response.state;
}

export function mutate(operation, payload = {}) {
  const task = pending.then(async () => {
    const state = await readState();
    applyOperation(state, operation, payload);
    await chrome.storage.local.set(state);
    return state;
  });
  pending = task.catch(() => {});
  return task;
}

function applyOperation(state, operation, payload) {
  throw new Error('Unknown storage operation.');
}
