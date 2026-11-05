# Privacy and permissions

AppTracker stores application and email metadata in `chrome.storage.local` for the current browser profile. It has no backend, telemetry, remote scripts, fonts, or outbound API calls. Data is not uploaded to this GitHub repository.

| Permission | Purpose |
| --- | --- |
| `storage` | Persist application and tracked-email arrays locally. |
| `activeTab` | Read the URL of the active page after opening the extension. |
| `scripting` | Inject `content.js` into an active Gmail conversation when Capture is clicked. |

No persistent host permissions or automatic Gmail content scripts are registered. Gmail OAuth and background mailbox monitoring are not implemented. Capturing a Gmail conversation reads its visible subject, sender address, thread identifier, and available date; the capture script does not read message bodies or attachments. Users may enter notes manually.

Applications contain company, role, date, URL, status, notes, and linked thread IDs. Tracked emails contain thread ID, application ID, subject, sender, received date, and an action-required flag. Captured Gmail thread IDs include the account slot to distinguish accounts open in the same browser session.

Delete an individual record through the dashboard. Application deletion retains associated email records as unlinked; delete those separately if desired. To erase all records, clear extension storage through browser developer tools or uninstall the extension. Local storage is not a backup service; browser-profile deletion and extension removal may remove all data.
