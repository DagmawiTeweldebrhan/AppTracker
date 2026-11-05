import { readState, request } from '../utils/storage.js';
import { notify } from '../utils/dom.js';
import { renderApplications, renderEmails, renderRejections } from './views.js';
import { applicationFields, emailFields } from './forms.js';
import { filterRecords } from '../utils/filters.js';
import { renderSummary } from './summary.js';

let state = { applications: [], tracked_emails: [] };
let tab = 'applications';
let editingId = '';
let editingType = 'application';
const dialog = document.querySelector('#editor');
const form = document.querySelector('#record-form');
function openApplication(item) {
  editingType = 'application';
  editingId = item?.id || '';
  document.querySelector('#editor-title').textContent = item ? 'Edit application' : 'Add application';
  document.querySelector('#form-error').textContent = '';
  applicationFields(document.querySelector('#form-fields'), item || { status: tab === 'rejections' ? 'Rejected' : 'Applied' });
  dialog.showModal();
}
function openEmail(item) {
  editingType = 'email'; editingId = item?.threadId || '';
  document.querySelector('#editor-title').textContent = item ? 'Edit and link email' : 'Add email';
  document.querySelector('#form-error').textContent = '';
  emailFields(document.querySelector('#form-fields'), state.applications, item);
  dialog.showModal();
}
document.querySelector('#add-record').addEventListener('click', () => tab === 'emails' ? openEmail() : openApplication());
document.querySelector('#close-editor').addEventListener('click', () => dialog.close());
document.querySelector('#cancel-editor').addEventListener('click', () => dialog.close());
form.addEventListener('submit', async event => {
  event.preventDefault();
  const submit = form.querySelector('[type=submit]');
  submit.disabled = true;
  try {
    const payload = Object.fromEntries(new FormData(form));
    if (editingType === 'email') {
      if (editingId) payload.threadId = editingId;
      payload.actionRequired = form.elements.actionRequired.checked;
    } else if (editingId) payload.id = editingId;
    state = await request(editingType === 'email' ? 'saveEmail' : 'saveApplication', payload);
    dialog.close(); render(); notify(editingType === 'email' ? 'Email saved and links updated.' : 'Application saved.');
  } catch (error) { document.querySelector('#form-error').textContent = error.message; }
  finally { submit.disabled = false; }
});
document.querySelector('#records').addEventListener('click', async event => {
  const button = event.target.closest('button[data-operation]');
  if (!button) return;
  const { operation, id } = button.dataset;
  const thread = state.tracked_emails.find(record => record.threadId === id);
  if (operation === 'editEmail' && thread) return openEmail(thread);
  if (operation === 'toggleEmail' || operation === 'deleteEmail') {
    if (!thread) return notify('This email no longer exists. Refresh the dashboard.', true);
    if (operation === 'deleteEmail' && !confirm(`Delete the tracked email “${thread.subject}”?`)) return;
    button.disabled = true;
    try {
      state = await request(operation === 'toggleEmail' ? 'saveEmail' : operation,
        operation === 'toggleEmail' ? { ...thread, actionRequired: !thread.actionRequired } : { threadId: id });
      render(); notify(operation === 'toggleEmail' ? 'Email action status updated.' : 'Email deleted.');
    } catch (error) { notify(error.message, true); button.disabled = false; }
    return;
  }
  const item = state.applications.find(record => record.id === id);
  if (operation === 'editApplication' && item) return openApplication(item);
  if (operation === 'deleteApplication') {
    if (!confirm(`Delete ${item?.company || 'this application'}? Linked emails will be kept.`)) return;
    button.disabled = true;
    try { state = await request(operation, { id }); render(); notify('Application deleted. Linked emails were kept.'); }
    catch (error) { notify(error.message, true); button.disabled = false; }
  }
});
const labels = {
  applications: ['Your applications', 'A little structure for your next big opportunity.', 'All applications', '+ Add application'],
  emails: ['Your email threads', 'Keep the conversations connected to your next move.', 'Tracked emails', '+ Add email'],
  rejections: ['Rejection log', 'Save feedback, reflect, and keep moving forward.', 'Rejected applications', '+ Add application']
};

function render() {
  tab = Object.hasOwn(labels, location.hash.slice(1)) ? location.hash.slice(1) : 'applications';
  const [title, description, tableTitle, addLabel] = labels[tab];
  document.querySelector('#page-title').textContent = title;
  document.querySelector('#page-description').textContent = description;
  document.querySelector('#table-title').textContent = tableTitle;
  document.querySelector('#add-record').textContent = addLabel;
  document.querySelector('#crumb').textContent = tab === 'rejections' ? 'Rejection log' : tab === 'emails' ? 'Emails' : 'Applications';
  document.title = `AppTracker · ${title}`;
  for (const link of document.querySelectorAll('[data-tab]')) {
    if (link.dataset.tab === tab) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  document.querySelector('#status-filter').hidden = tab !== 'applications';
  document.querySelector('#search').placeholder = tab === 'emails' ? 'Search subject or sender…' : 'Search company or role…';
  document.querySelector('#nav-count').textContent = state.applications.length;
  renderSummary(document.querySelector('#summary'), state.applications);
  const records = filterRecords(tab === 'emails' ? state.tracked_emails : state.applications, {
    query: document.querySelector('#search').value,
    status: tab === 'rejections' ? 'Rejected' : tab === 'applications' ? document.querySelector('#status-filter').value : '',
    sort: document.querySelector('#sort').value, emails: tab === 'emails'
  });
  document.querySelector('#result-count').textContent = `${records.length} ${records.length === 1 ? 'record' : 'records'}`;
  if (tab === 'emails') renderEmails(document.querySelector('#records'), records, state.applications);
  else if (tab === 'rejections') renderRejections(document.querySelector('#records'), records);
  else renderApplications(document.querySelector('#records'), records);
}

for (const id of ['search', 'status-filter', 'sort']) document.querySelector(`#${id}`).addEventListener('input', render);

window.addEventListener('hashchange', render);
async function load() {
  try { state = await readState(); render(); }
  catch (error) { notify(`Could not load your records: ${error.message}`, true); }
}
load();
