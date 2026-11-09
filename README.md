# AppTracker

A Chrome Manifest V3 extension for tracking job applications, email threads, and rejection feedback. Requires Chrome 116 or newer. 

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
- **Automatic Gmail tracking:** Connect each Gmail/Google Workspace inbox in the dashboard. AppTracker scans historical incoming mail, reads bodies locally to detect confirmations and rejections, creates application records, and updates matched rejections. Follow the [one-time Gmail OAuth setup](docs/gmail-setup.md).

Manual Gmail capture reads visible metadata on demand. The separate automatic integration uses the read-only Gmail API, with consent for each connected account. It scans in resumable batches and checks new mail roughly every five minutes while Chrome is running. Bodies are processed in memory and discarded. Ambiguous detected messages are flagged for review. Automatic status changes apply to matched rejection emails; subject-only suggestions from manual capture remain suggestions.

## Development

Use Node.js 22 or newer. No dependency installation is needed.

```sh
npm test
npm run check
npm run package
```

`dist/AppTracker` is the clean unpacked extension folder. GitHub Actions checks tests, manifest references, CSP markup, syntax, and packaging on pushes and pull requests. See [manual checks](docs/manual-testing.md) for browser acceptance steps.

## Structure

`background.js` serializes writes and schedules inbox scans; `content.js` captures Gmail metadata only when injected by the popup. `utils/` contains validation, local storage, Gmail authorization/API/sync, detection, and rendering helpers. `popup/` is quick add; `dashboard/` contains Applications, Emails, Rejections, and connected-inbox controls.

The data models retain the architecture's `applications` and `tracked_emails` arrays. Deleting an application keeps its emails and clears their link. Deleting or relinking an email reconciles `linkedEmailThreadIds`.

## Scope and data

Application records stay in the current browser profile. There is no AppTracker server, analytics, or cross-device sync. Automatic Gmail tracking implements the architecture’s optional Gmail integration, expanded at the user’s request. It requires a configured Google OAuth client and per-account consent before it can access email. Tokens are session-only; Google may require reconnecting after expiry or a browser restart. Clearing extension storage or uninstalling removes records. See [privacy and permissions](docs/privacy.md).
