# AppTracker

A Chrome Manifest V3 extension for tracking job applications, email threads, and rejection feedback. Built directly from [the supplied architecture](tracker_extension_architecture.md) with vanilla JavaScript, HTML, CSS, and `chrome.storage.local`. No runtime dependencies or build step.

## Load in Chrome

1. Clone this repository or download and extract its source archive.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select the repository folder containing `manifest.json`.
4. Pin AppTracker. Click its icon for quick add, then **Open dashboard** for the full workspace.

## Use

- **Applications:** Add company, role, date, job URL, status, and notes. Search, filter by status, sort, edit, or delete records.
- **Emails:** Add subject, sender, received date, and action flag manually. Use **Edit / link** to associate a thread with an application. Both sides of the link update together.
- **Rejection log:** Shows exactly the applications marked **Rejected**. Record rejection stage and feedback in the notes field.
- **Quick add:** **Use current page URL** copies the active job posting URL; fill in the company and role yourself.
- **Gmail capture:** Open a conversation on `mail.google.com`, click AppTracker, then **Capture Gmail thread**. Open the Emails dashboard to link it. Already tracked conversations are preserved.

Gmail capture reads the visible subject, sender, thread identifier, and date on demand. It does not read message bodies. Gmail markup changes can break capture; manual email entry remains available. Captured dates fall back to capture time if Gmail exposes no readable date. Keyword status suggestions are labeled and never change application status automatically.

## Development

Use Node.js 22 or newer. No dependency installation is needed.

```sh
npm test
npm run check
npm run package
```

`dist/AppTracker` is the clean unpacked extension folder. GitHub Actions checks tests, manifest references, CSP markup, syntax, and packaging on pushes and pull requests. See [manual checks](docs/manual-testing.md) for browser acceptance steps.

## Structure

`background.js` serializes writes; `content.js` captures Gmail metadata only when injected by the popup. `utils/` contains validation, local storage, parsing, and rendering helpers. `popup/` is quick add; `dashboard/` contains Applications, Emails, and Rejections.

The data models retain the architecture's `applications` and `tracked_emails` arrays. Deleting an application keeps its emails and clears their link. Deleting or relinking an email reconciles `linkedEmailThreadIds`.

## Scope and data

Data stays in the current browser profile. There is no server, analytics, cross-device sync, or Gmail OAuth. Clearing extension storage or uninstalling removes records. OAuth is future work in the architecture and is intentionally deferred. See [privacy and permissions](docs/privacy.md).
