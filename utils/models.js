export const STATUSES = Object.freeze(['Applied', 'Interviewing', 'Offer', 'Rejected']);

export function text(value, max = 5000) {
  return String(value ?? '').trim().slice(0, max);
}

export function safeUrl(value) {
  if (!text(value)) return '';
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error();
    return url.href;
  } catch {
    throw new Error('Enter a valid http or https URL.');
  }
}

export function isoDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new Error('Choose a valid date.');
  return date.toISOString();
}

export function application(input, existing = {}) {
  const company = text(input.company, 200);
  const role = text(input.role, 200);
  if (!company || !role) throw new Error('Company and role are required.');
  if (!STATUSES.includes(input.status)) throw new Error('Choose a valid application status.');
  return {
    id: existing.id || crypto.randomUUID(), company, role,
    dateApplied: isoDate(input.dateApplied), url: safeUrl(input.url),
    status: input.status, notes: text(input.notes),
    linkedEmailThreadIds: existing.linkedEmailThreadIds || []
  };
}

export function email(input, existing = {}) {
  const subject = text(input.subject, 500);
  const sender = text(input.sender, 320);
  if (!subject || !sender) throw new Error('Email subject and sender are required.');
  return {
    threadId: existing.threadId || text(input.threadId, 500) || crypto.randomUUID(),
    applicationId: text(input.applicationId, 100), subject, sender,
    dateReceived: isoDate(input.dateReceived), actionRequired: input.actionRequired === true
  };
}
