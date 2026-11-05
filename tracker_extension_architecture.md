# Job Application & Email Tracker Extension - Architecture Specification

## 1. Project Overview
This project is a browser extension (Manifest V3) designed to help users track job applications, monitor associated email threads, and log rejections. The extension will feature a background service worker, a popup for quick entry, and a full dashboard (Options page) with dedicated tabs for tracking and emails.

## 2. Tech Stack
*   **Platform:** Chrome Extension (Manifest V3)
*   **Frontend:** HTML5, CSS3 (Tailwind CSS recommended), Vanilla JavaScript (or React/TypeScript depending on preference).
*   **Storage:** `chrome.storage.local` and/or `chrome.storage.sync` for cross-device state management.
*   **APIs (Optional but recommended):** Gmail API (if OAuth is implemented) or Content Scripts for DOM reading on `mail.google.com`.

## 3. Core Features & Tabs
1.  **Main Dashboard (Tracker):** Grid/Table view of all active applications (Company, Role, Date, Status).
2.  **Email Tab:** Displays tracked email threads (Subject, Date, Sender, Status). Allows user to link a specific email thread to a job application.
3.  **Rejection Log:** A filtered view of all applications with the status "Rejected", including notes on rejection stage and feedback.
4.  **Quick Add (Popup):** A small UI when clicking the extension icon to quickly manually add an application or scrape the current tab's URL (e.g., if on LinkedIn/Greenhouse).

## 4. Directory Structure
```text
/extension-root
├── manifest.json               # Extension configuration (Manifest V3)
├── background.js               # Service worker for background tasks/alarms
├── content.js                  # Content script (optional, for webmail scraping)
├── /assets
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── /popup                      # Quick-add interface
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── /dashboard                  # Main full-page application interface
│   ├── index.html              # Contains Tabs: Tracker, Emails, Rejections
│   ├── styles.css
│   └── app.js                  # Logic for rendering tabs and handling state
└── /utils
    ├── storage.js              # Wrapper for chrome.storage operations
    └── email-parser.js         # Logic for parsing/linking email data
```

## 5. Data Models (JSON Schema for Storage)

### 5.1 Application Object (`applications` array)
```json
{
  "id": "uuid-string",
  "company": "String",
  "role": "String",
  "dateApplied": "ISO-8601 String",
  "url": "String",
  "status": "Enum: [Applied, Interviewing, Offer, Rejected]",
  "notes": "String",
  "linkedEmailThreadIds": ["array of email thread ids"]
}
```

### 5.2 Email Object (`tracked_emails` array)
```json
{
  "threadId": "String",
  "applicationId": "uuid-string (foreign key)",
  "subject": "String",
  "sender": "String",
  "dateReceived": "ISO-8601 String",
  "actionRequired": "Boolean"
}
```

## 6. Implementation Steps for Codex/AI Agent
1.  **Initialize Manifest V3:** Create the `manifest.json` with permissions for `storage`, `activeTab`, and `scripting`.
2.  **Build Storage Utility:** Implement CRUD operations in `utils/storage.js` using `chrome.storage.local`.
3.  **Develop the Dashboard UI:** 
    *   Create `dashboard/index.html` with a tabbed layout (Applications, Emails, Rejections).
    *   Implement rendering logic in `app.js` to populate tables from storage.
4.  **Implement the Email Tab:** Build the logic to manually or automatically link email objects to specific application IDs.
5.  **Implement the Rejection Filter:** Create a view that specifically filters the `applications` array for `status === 'Rejected'`.
6.  **Create the Popup:** Build a minimal form in `popup.html` to push new entries into the storage array.

## 7. Future Expansion Notes
*   Implement OAuth2 in `background.js` to securely connect to the Gmail API for automatic detection of application confirmation emails and rejection emails based on keywords.

## 8. Authorized Gmail Expansion (November 5, 2026)

At the user's request, the optional Gmail integration is implemented for multiple Gmail/Google Workspace accounts. The dashboard includes per-account connection, scan progress, pause/resume, reconnect, and disconnect controls. A Manifest V3 alarm resumes historical mailbox scans and checks new mail through the read-only Gmail API. Explicit account consent and a configured Google OAuth client are required.

Confirmation and rejection detection reads message bodies locally, creates or updates matching application records, and links email threads. Uncertain company/role matches are flagged for manual review. The original application and email model fields remain intact; auxiliary storage tracks account scan checkpoints, deduplication, and status chronology. No email bodies are persisted, and no AppTracker backend or AI service is used. Setup and limitations are documented in `docs/gmail-setup.md`.
