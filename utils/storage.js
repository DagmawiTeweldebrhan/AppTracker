import { application, email } from './models.js';
import { importDetectedMessages } from './auto-import.js';

let pending = Promise.resolve();
export async function readState() {
  const result = await chrome.storage.local.get(['applications', 'tracked_emails', 'automation']);
  return {
    applications: Array.isArray(result.applications) ? result.applications : [],
    tracked_emails: Array.isArray(result.tracked_emails) ? result.tracked_emails : [],
    automation: { processed: {}, applications: {}, threads: {}, ...result.automation }
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
    reconcileLinks(state);
    await chrome.storage.local.set(state);
    return state;
  });
  pending = task.catch(() => {});
  return task;
}

function reconcileLinks(state) {
  state.applications = state.applications.map(item => ({
    ...item,
    linkedEmailThreadIds: state.tracked_emails
      .filter(thread => thread.applicationId === item.id).map(thread => thread.threadId)
  }));
}

function applyOperation(state, operation, payload) {
  if (operation === 'importDetectedEmails') {
    importDetectedMessages(state, payload.events || []);
    return;
  }
  if (operation === 'saveApplication') {
    const existing = payload.id ? state.applications.find(item => item.id === payload.id) : null;
    if (payload.id && !existing) throw new Error('This application no longer exists.');
    const next = application(payload, existing || {});
    if (existing && existing.status !== next.status) {
      state.automation.applications[next.id] = { lastStatusAt: Date.now() };
    }
    state.applications = existing
      ? state.applications.map(item => item.id === existing.id ? next : item)
      : [...state.applications, next];
    return;
  }
  if (operation === 'deleteApplication') {
    state.applications = state.applications.filter(item => item.id !== payload.id);
    state.tracked_emails = state.tracked_emails.map(item => item.applicationId === payload.id
      ? { ...item, applicationId: '' } : item);
    return;
  }
  if (operation === 'saveEmail') {
    const existing = state.tracked_emails.find(item => item.threadId === payload.threadId);
    const next = email(payload, existing || {});
    if (next.applicationId && !state.applications.some(item => item.id === next.applicationId)) {
      throw new Error('The linked application no longer exists.');
    }
    const detection = state.automation.threads[next.threadId];
    if (detection && next.applicationId && next.applicationId !== existing?.applicationId) {
      const linked = state.applications.find(item => item.id === next.applicationId);
      const timestamp = Date.parse(detection.dateReceived);
      const metadata = state.automation.applications[linked.id] || {};
      if (timestamp >= (metadata.lastStatusAt || 0) && (detection.status === 'Rejected' || linked.status === 'Applied')) {
        linked.status = detection.status;
        state.automation.applications[linked.id] = { lastStatusAt: timestamp };
      }
    }
    state.tracked_emails = existing
      ? state.tracked_emails.map(item => item.threadId === existing.threadId ? next : item)
      : [...state.tracked_emails, next];
    return;
  }
  if (operation === 'deleteEmail') {
    state.tracked_emails = state.tracked_emails.filter(item => item.threadId !== payload.threadId);
    return;
  }
  throw new Error('Unknown storage operation.');
}
