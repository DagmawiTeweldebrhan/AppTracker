# Connect Gmail / Google Workspace

AppTracker 1.1 can scan multiple connected Gmail accounts, read application-related message bodies locally, create applications from confirmations, and mark matching applications Rejected. Google requires an OAuth client and consent for each account. A connection is not active until the account appears in the dashboard.

## One-time Google setup

1. Load the updated extension from the same folder you intend to keep using. If loading `dist/AppTracker`, run `npm run package` first. Click **Reload** on `chrome://extensions` after an update. Keep using your existing install folder: an unpacked extension's ID, redirect URI, and local records depend on that identity. Switching between source and packaged folders creates a different extension installation; use the redirect displayed by the one you actually loaded.
2. Open AppTracker’s dashboard and expand **Gmail connection setup**. Copy the **Redirect URI** displayed there.
3. Open [Google Cloud Console](https://console.cloud.google.com/), select or create a project, and enable the **Gmail API** in APIs & Services → Library.
4. Configure Google Auth Platform branding, audience, and data access for that project. For a personal project in **Testing**, add every Gmail account you want to connect as a test user. A Workspace-only internal project can be limited to your organization; your Workspace administrator may restrict Gmail API access.
5. Add the scope `https://www.googleapis.com/auth/gmail.readonly`. This is read-only access: the extension cannot send, delete, mark as read, or move email. Gmail bodies require more than the metadata-only scope. See [Google’s Gmail scope definitions](https://developers.google.com/workspace/gmail/api/auth/scopes).
6. Create an OAuth client of type **Web application**. Under **Authorized redirect URIs**, paste the exact dashboard URI, including `/gmail`. This connection uses Chrome’s protected OAuth redirect and Google’s client-side token flow. Do not enter a Chrome Extension client ID in this field; that is a different flow.
7. Copy the client ID ending in `.apps.googleusercontent.com` into AppTracker and click **Save client ID**. No client secret belongs in the extension or repository.
8. Click **Connect Gmail inbox**, allow the optional Gmail API host access, choose an account, and grant read-only Gmail access. Repeat for every account. These are the only mailboxes AppTracker scans.

Google may require verification before an application using restricted Gmail scopes can be made available broadly. Use the configured test users for personal development; a Workspace admin may also need to allow the application. Follow [Google’s authorization guidance](https://developers.google.com/workspace/gmail/api/auth/about-auth) for distribution.

## What runs automatically

- The first scan reads incoming messages across the account, including read and archived mail, with no historical cutoff. Sent mail, drafts, spam, and trash are excluded. Attachments are never downloaded.
- Scans run in batches of 25 messages. The worker saves a page checkpoint after each successful batch and continues about once per minute. Large mailboxes can take hours to complete. **Scan now** advances another batch in every active inbox.
- After a full pass, new-mail checks start roughly every five minutes while Chrome is running. Chrome alarms can be delayed by sleep and resume; the extension does not run while the browser is closed. See [Chrome alarm behavior](https://developer.chrome.com/docs/extensions/reference/api/alarms#concepts_and_usage).
- Straightforward English application confirmations create **Applied** records. Rejections update matching records to **Rejected**, even when the rejection wording is in the body rather than the subject.
- Messages are deduplicated by account and message ID. Earlier confirmation emails do not undo a later rejection. Manual status edits take precedence over mail received before the edit.
- Missing or ambiguous company/role information appears as an unlinked email marked **Action required**. Review it and use **Edit / link**; add an application manually if necessary. Different roles at the same company are kept separate. Detection is based on wording and cannot guarantee every template or language is recognized.

Bodies are inspected in memory, then discarded. Only extracted application fields, email metadata, and scan/deduplication state are stored. No email content is sent to an AI service or AppTracker server.

## Connections and session expiry

Each account has **Pause**, **Resume**, **Reconnect**, and **Disconnect** controls. Disconnect removes its local session token and stops scanning; imported records remain. To revoke the Google authorization itself, remove AppTracker from [Google account connections](https://myaccount.google.com/connections).

Access tokens live only in `chrome.storage.session`. When a token expires or Chrome restarts, AppTracker attempts a silent renewal for that account. If Google requires interaction, scanning stops for that account and its card asks you to reconnect. This extension has no backend, embedded client secret, or long-lived refresh token. Do not expect unattended scans to continue when Google requires renewed consent.

## Troubleshooting

| Problem | Check |
| --- | --- |
| `redirect_uri_mismatch` | The authorized redirect URI must exactly match the installed dashboard’s displayed URI. |
| Access denied / app in testing | Add that exact account as a Google test user, or check Workspace admin policy. |
| API access denied | Enable Gmail API in the client’s project and grant the read-only Gmail scope. |
| Reconnect requested | Click Reconnect for that account and select the same email address. |
| Large mailbox still scanning | Check the increasing message count; scans resume in batches. Gmail tabs may be closed. |
| Application missing | Check Emails for an unlinked detected message. Unsupported wording may need manual entry. |

The OAuth protocol is documented by [Google](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow); the protected callback is supplied by [Chrome Identity](https://developer.chrome.com/docs/extensions/reference/api/identity#method-launchWebAuthFlow). Live OAuth and mailbox scanning must be verified with your own registered client and consented test account. Automated tests use fixtures and never access a real mailbox.
