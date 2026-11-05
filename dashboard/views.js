import { node, formatDate } from '../utils/dom.js';

export function empty(container, title, description) {
  const wrapper = node('div', '', 'empty');
  wrapper.append(node('div', '◇', 'empty-mark'), node('h3', title), node('p', description));
  container.replaceChildren(wrapper);
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
