import { readState, request } from '../utils/storage.js';
import { notify } from '../utils/dom.js';
import { renderApplications } from './views.js';
import { applicationFields } from './forms.js';

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
document.querySelector('#add-record').addEventListener('click', () => openApplication());
document.querySelector('#close-editor').addEventListener('click', () => dialog.close());
document.querySelector('#cancel-editor').addEventListener('click', () => dialog.close());
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
  renderApplications(document.querySelector('#records'), state.applications);
}

window.addEventListener('hashchange', render);
async function load() {
  try { state = await readState(); render(); }
  catch (error) { notify(`Could not load your records: ${error.message}`, true); }
}
load();
