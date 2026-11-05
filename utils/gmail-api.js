export async function gmailGet(token, resource, parameters = {}, fetcher = fetch) {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/${resource}`);
  url.search = new URLSearchParams(parameters);
  const response = await fetcher(url.href, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    const error = new Error(response.status === 401 ? 'Inbox session expired. Reconnect this account.'
      : response.status === 403 ? 'Gmail access was denied. Check API setup and Workspace admin restrictions.'
      : response.status === 429 ? 'Gmail rate limit reached. The scan will retry automatically.'
      : `Gmail request failed (${response.status}). The scan will retry.`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export function scanQuery(scan) {
  // Scan all incoming mail, including archive and read mail, without a keyword/date cap.
  const after = scan.since ? ` after:${Math.max(0, Math.floor(scan.since / 1000) - 86400)}` : '';
  return `-in:sent -in:drafts before:${Math.floor(scan.until / 1000) + 1}${after}`;
}
