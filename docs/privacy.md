# Privacy and permissions

AppTracker stores application and email metadata in `chrome.storage.local` for the current browser profile. It has no backend, telemetry, remote scripts, or remote fonts. The opt-in automatic integration contacts Google for authorization and the Gmail API for read-only mailbox access. Data is not uploaded to this GitHub repository or an AI service.

| Permission | Purpose |
| --- | --- |
| `storage` | Persist application and tracked-email arrays locally. |
| `activeTab` | Read the URL of the active page after opening the extension. |
| `scripting` | Inject `content.js` into an active Gmail conversation when Capture is clicked. |
| `identity` | Open Google's authorization flow for each inbox the user chooses to connect. |
| `alarms` | Resume large mailbox scans and check connected accounts for new mail while Chrome runs. |
| Optional `https://gmail.googleapis.com/*` | Read messages through Gmail API after the user allows host access and authorizes each account. |

There are no mandatory host permissions or automatic Gmail DOM content scripts. The manual Capture action reads visible metadata. The separate opt-in background integration reads incoming mail, including archived and read messages, through Gmail API. It processes message bodies in memory to detect application confirmations/rejections and extract company and role. Bodies are discarded after processing; attachments are skipped. Gmail messages are never modified, deleted, or sent by AppTracker.

Applications contain company, role, date, URL, status, notes, and linked thread IDs. Tracked emails contain thread ID, application ID, subject, sender, received date, and an action-required flag. Automatically imported thread IDs include the connected account address. Additional local state includes account addresses, client ID, scan cursors, timestamps, detected application metadata, and processed message identifiers for deduplication. Deletion tombstones prevent the same processed messages from recreating deleted records during later scans.

OAuth access tokens are kept in `chrome.storage.session`, restricted to trusted extension contexts, and are never returned to the dashboard, written into persistent application records, or committed to GitHub. They are cleared when the browser session ends or the inbox is disconnected. The extension attempts silent renewal and asks for Reconnect when Google requires interaction; no client secret or long-lived refresh token is stored.

Delete an individual record through the dashboard. Application deletion retains associated email records as unlinked; delete those separately if desired. To erase all records, clear extension storage through browser developer tools or uninstall the extension. Local storage is not a backup service; browser-profile deletion and extension removal may remove all data.

Pause stops scans for that inbox. Disconnect removes its connection and session token while retaining already imported records. To revoke the Google consent grant itself, use [Google account connections](https://myaccount.google.com/connections). See [Gmail setup](gmail-setup.md) for account consent, session expiry, and setup requirements.
