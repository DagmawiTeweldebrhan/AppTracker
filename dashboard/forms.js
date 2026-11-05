import { localDate, node } from '../utils/dom.js';
import { STATUSES } from '../utils/models.js';

function field(label, name, value = '', options = {}) {
  const wrapper = node('label');
  const caption = node('span', label);
  caption.id = `label-${name}`;
  wrapper.append(caption);
  const input = document.createElement(options.tag || 'input');
  input.name = name;
  input.setAttribute('aria-labelledby', caption.id);
  if (options.tag !== 'textarea' && options.tag !== 'select') input.type = options.type || 'text';
  if (options.required) input.required = true;
  if (options.maxLength) input.maxLength = options.maxLength;
  for (const item of options.choices || []) {
    const option = node('option', typeof item === 'string' ? item : item.label);
    option.value = typeof item === 'string' ? item : item.value;
    input.append(option);
  }
  if (options.type === 'checkbox') { input.checked = Boolean(value); wrapper.className = 'checkbox'; }
  else input.value = value;
  wrapper.append(input);
  return wrapper;
}

export function applicationFields(container, item = {}) {
  container.replaceChildren(
    field('Company', 'company', item.company, { required: true, maxLength: 200 }),
    field('Role', 'role', item.role, { required: true, maxLength: 200 }),
    field('Date applied', 'dateApplied', localDate(item.dateApplied || new Date()), { type: 'date', required: true }),
    field('Status', 'status', item.status || 'Applied', { tag: 'select', choices: STATUSES }),
    field('Job URL', 'url', item.url, { type: 'url' }),
    field('Notes · rejection stage and feedback', 'notes', item.notes, { tag: 'textarea', maxLength: 5000 })
  );
}

export function emailFields(container, applications, item = {}) {
  container.replaceChildren(
    field('Subject', 'subject', item.subject, { required: true, maxLength: 500 }),
    field('Sender', 'sender', item.sender, { required: true, maxLength: 320 }),
    field('Date received', 'dateReceived', localDate(item.dateReceived || new Date()), { type: 'date', required: true }),
    field('Linked application', 'applicationId', item.applicationId || '', { tag: 'select', choices: [
      { label: 'Unlinked', value: '' },
      ...applications.map(application => ({ label: `${application.company} · ${application.role}`, value: application.id }))
    ] }),
    field('Action required', 'actionRequired', item.actionRequired, { type: 'checkbox' })
  );
}
