import { node, formatDate } from '../utils/dom.js';
import { inferEmailStatus } from '../utils/email-parser.js';

export function empty(container, title, description) {
  const wrapper = node('div', '', 'empty');
  wrapper.append(node('div', '◇', 'empty-mark'), node('h3', title), node('p', description));
  container.replaceChildren(wrapper);
}

export function renderEmails(container, emails, applications, detectedThreads = {}) {
  if (!emails.length) return empty(container, 'Keep your conversations together', 'Add an email manually or capture an open Gmail thread from the popup.');
  const body = table(container, ['Subject', 'Sender', 'Received', 'Linked application', 'Status', 'Actions']);
  for (const item of emails) {
    const row = node('tr');
    const subject = node('td', item.subject, 'email-subject');
    if (item.actionRequired) subject.append(node('div', '● Action required', 'attention'));
    const linked = applications.find(application => application.id === item.applicationId);
    const detected = detectedThreads[item.threadId];
    if (detected) subject.append(node('div', `Detected in ${detected.account}${!linked ? ' · Review company / role and link an application' : ''}`, 'account-progress'));
    const status = linked?.status || detected?.status || inferEmailStatus(item.subject);
    const statusCell = node('td');
    const badge = node('span', linked ? status : `${status} (${detected ? 'detected' : 'suggested'})`, `badge ${status.toLowerCase()}`);
    badge.title = linked ? 'Linked application status' : 'Keyword suggestion only; no application was changed.';
    statusCell.append(badge);
    const actions = node('td');
    actions.append(action('Edit / link', 'editEmail', item.threadId), action(item.actionRequired ? 'Mark done' : 'Needs action', 'toggleEmail', item.threadId), action('Delete', 'deleteEmail', item.threadId, true));
    row.append(subject, node('td', item.sender), node('td', formatDate(item.dateReceived)), node('td', linked ? `${linked.company} · ${linked.role}` : 'Unlinked'), statusCell, actions);
    body.append(row);
  }
}

export function table(container, headings) {
  const wrapper = node('div', '', 'table-wrap');
  const element = node('table');
  const head = node('thead');
  const row = node('tr');
  for (const title of headings) {
    const th = node('th', title);
    th.scope = 'col';
    row.append(th);
  }
  head.append(row);
  const body = node('tbody');
  element.append(head, body);
  wrapper.append(element);
  container.replaceChildren(wrapper);
  return body;
}

export function action(label, operation, id, danger = false) {
  const button = node('button', label, `action-button${danger ? ' danger' : ''}`);
  button.type = 'button';
  button.dataset.operation = operation;
  button.dataset.id = id;
  return button;
}

export function renderApplications(container, applications) {
  if (!applications.length) return empty(container, 'A fresh start', 'Add an application to begin, or adjust your filters.');
  const body = table(container, ['Company', 'Role', 'Date applied', 'Status', 'Emails', 'Actions']);
  for (const item of applications) {
    const row = node('tr');
    const company = node('td');
    const label = node('div', '', 'company-cell');
    label.append(node('span', item.company.slice(0, 1).toUpperCase(), 'avatar'), node('span', item.company, 'company-name'));
    company.append(label);
    const role = node('td');
    if (item.url && /^https?:\/\//i.test(item.url)) {
      const link = node('a', item.role); link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; role.append(link);
    } else role.textContent = item.role;
    const status = node('td'); status.append(node('span', item.status, `badge ${item.status.toLowerCase()}`));
    const actions = node('td'); actions.append(action('Edit', 'editApplication', item.id), action('Delete', 'deleteApplication', item.id, true));
    row.append(company, role, node('td', formatDate(item.dateApplied)), status, node('td', String(item.linkedEmailThreadIds.length)), actions);
    body.append(row);
  }
}

export function renderRejections(container, applications) {
  if (!applications.length) return empty(container, 'No rejections to show', 'Applications marked Rejected will appear here with your notes and feedback.');
  const body = table(container, ['Company', 'Role', 'Date applied', 'Rejection stage / feedback', 'Actions']);
  for (const item of applications) {
    const row = node('tr');
    const actions = node('td'); actions.append(action('Edit feedback', 'editApplication', item.id), action('Delete', 'deleteApplication', item.id, true));
    row.append(node('td', item.company, 'company-name'), node('td', item.role), node('td', formatDate(item.dateApplied)), node('td', item.notes || 'No feedback recorded yet.', 'notes'), actions);
    body.append(row);
  }
}
