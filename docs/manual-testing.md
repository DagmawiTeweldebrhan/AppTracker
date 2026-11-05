# Browser acceptance checklist

Load the repository as an unpacked extension in a clean Chrome profile. Open the service worker inspector from `chrome://extensions` to check for errors. Use throwaway records.

## Applications and popup

1. Open the popup. The date should be today in the device timezone. Blank company or role should block submission.
2. Open an ordinary job-posting page, click **Use current page URL**, enter company and role, then save.
3. Open the dashboard; confirm the saved fields, overview cards, and record count.
4. Edit the role, status, date, URL, and notes. Reload and verify persistence.
5. Search company, role, and notes; combine search with status; test each sort order and clear filters.
6. Keep the dashboard open while saving another application through the popup. It should appear without reloading.

## Emails and linking

1. Add an email manually, mark action required, and link it to an application.
2. Check the application email count; edit the link to a different application. Both counts should change.
3. Toggle action required; reload to check persistence. Delete the email and verify the count clears.
4. Delete a linked application. Its email should remain visible as **Unlinked**.
5. Open Gmail inbox and attempt capture without opening a conversation; expect an actionable error.
6. Open a Gmail conversation and capture it. Check subject, sender, date, and unlinked status. Link it manually.
7. Capture the same conversation again; it should remain one record and retain the existing link and action flag.
8. Try capture on a non-Gmail page and URL capture on a browser-internal page; expect clear errors.

## Rejections and accessibility

1. Mark an application Rejected and add stage/feedback notes. Only rejected applications should appear in the rejection log.
2. Change it back to Interviewing; confirm it disappears from that log and remains in Applications.
3. Test the empty state on each tab and a search with no results.
4. Use keyboard navigation, visible focus, Skip to applications, dialog Escape, and Cancel. Confirm focus returns to the initiating button.
5. Resize to 390px and desktop widths; tables should scroll horizontally without losing action buttons.
6. Enter HTML-like text in notes/subject/company; it should display as plain text. Try a `javascript:` job URL; saving must fail.

## Automated checks

Run `npm test`, `npm run check`, and `npm run package` with Node 22+. Automated unit tests cover model validation, concurrent writes, link reconciliation, storage failure recovery, parser validation, rejection filtering, searching, and sorting. Gmail DOM capture must also be checked against the current signed-in Gmail UI; no test needs mailbox credentials or live email access.

## Optional real-extension smoke test

```sh
npm install --prefix .tools playwright --no-audit --no-fund
npx --prefix .tools playwright install chromium
npm run test:browser
```

This launches headless Chromium with the real unpacked MV3 extension and a separate test profile in `.tools/browser-profile`. It clears only that test profile's extension storage. It exercises dashboard CRUD, email linking and action flags, rejection feedback, reload persistence, popup saves, cross-window updates, search, and email unlinking/deletion. Desktop and mobile screenshots are written to `.tools/`. It does not open your ordinary browser profile or access Gmail.
