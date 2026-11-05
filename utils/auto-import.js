import { application, email } from './models.js';
import { normalizeIdentity } from './application-detector.js';

export function importDetectedMessages(state, events) {
  const automation = state.automation;
  for (const event of [...events].sort((a, b) => Date.parse(a.dateReceived) - Date.parse(b.dateReceived))) {
    const key = `${event.account}:${event.messageId}`;
    if (Object.hasOwn(automation.processed, key)) continue;
    const timestamp = Date.parse(event.dateReceived);
    if (!event.messageId || !event.account || !event.threadId || !Number.isFinite(timestamp)
      || !['Applied', 'Rejected'].includes(event.status)) throw new Error('Invalid detected email event.');
    let thread = state.tracked_emails.find(item => item.threadId === event.threadId);
    let item = thread?.applicationId ? state.applications.find(record => record.id === thread.applicationId) : null;
    const company = normalizeIdentity(event.company);
    const role = normalizeIdentity(event.role);
    if (!item && company && role) {
      const candidates = state.applications.filter(record => normalizeIdentity(record.company) === company && normalizeIdentity(record.role) === role);
      if (candidates.length === 1) item = candidates[0];
      else if (!candidates.length) {
        item = application({ company: event.company, role: event.role, dateApplied: event.dateReceived,
          status: event.status, url: '', notes: 'Detected from application email. Review the extracted details.' });
        state.applications.push(item);
      }
    }
    // A rejection omitting the role may match one known company application, never several.
    if (!item && company && !role) {
      const candidates = state.applications.filter(record => normalizeIdentity(record.company) === company);
      if (candidates.length === 1) item = candidates[0];
    }
    if (item) {
      const metadata = automation.applications[item.id] || {};
      if (event.status === 'Applied' && timestamp < Date.parse(item.dateApplied)) item.dateApplied = event.dateReceived;
      if (timestamp >= (metadata.lastStatusAt || 0) && (event.status === 'Rejected' || item.status === 'Applied')) {
        item.status = event.status;
        metadata.lastStatusAt = timestamp;
      }
      automation.applications[item.id] = metadata;
    }
    if (!thread || timestamp >= Date.parse(thread.dateReceived)) {
      const next = email({ ...event, applicationId: item?.id || '', actionRequired: !item }, thread || {});
      if (thread) Object.assign(thread, next);
      else { thread = next; state.tracked_emails.push(thread); }
      automation.threads[event.threadId] = { status: event.status, account: event.account,
        company: event.company, role: event.role, dateReceived: event.dateReceived };
    } else if (item && !thread.applicationId) thread.applicationId = item.id;
    automation.processed[key] = true;
  }
}
