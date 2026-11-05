import { text } from './models.js';

// Suggestions are visible to the user; capture never changes application status.
export function inferEmailStatus(subject) {
  const value = text(subject).toLowerCase();
  if (/unfortunately|not moving forward|unsuccessful|rejection/.test(value)) return 'Rejected';
  if (/interview|schedule a call|assessment/.test(value)) return 'Interviewing';
  if (/offer|congratulations/.test(value)) return 'Offer';
  return 'Applied';
}

export function parseCapturedEmail(capture) {
  const subject = text(capture.subject, 500);
  const sender = text(capture.sender, 320);
  if (!subject || !sender || !capture.threadId) {
    throw new Error('Open a Gmail conversation with a visible subject and sender, then try again.');
  }
  return {
    threadId: `gmail:${text(capture.threadId, 480)}`,
    subject, sender, dateReceived: capture.dateReceived || new Date().toISOString(),
    applicationId: '', actionRequired: false
  };
}
