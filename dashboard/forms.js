import { localDate, node } from '../utils/dom.js';
import { STATUSES } from '../utils/models.js';

function field(label, name, value = '', options = {}) {
  const wrapper = node('label', label);
  const input = document.createElement(options.tag || 'input');
  input.name = name;
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
