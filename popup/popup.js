import { request } from '../utils/storage.js';
import { localDate, notify } from '../utils/dom.js';

const form = document.querySelector('#quick-add');
form.elements.dateApplied.value = localDate();

form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('[type=submit]');
  button.disabled = true;
  try {
    await request('saveApplication', Object.fromEntries(new FormData(form)));
    form.reset();
    form.elements.dateApplied.value = localDate();
    notify('Application saved. Keep going!');
    form.elements.company.focus();
  } catch (error) { notify(error.message, true); }
  finally { button.disabled = false; }
});

document.querySelector('#open-dashboard').addEventListener('click', () => chrome.runtime.openOptionsPage());
document.querySelector('#capture-page').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url?.match(/^https?:\/\//)) throw new Error('Open a job posting on an http or https page first.');
    form.elements.url.value = tab.url;
    notify('URL added. Fill in the company and role, then save.');
  } catch (error) { notify(error.message, true); }
});
