// Injected only after a user clicks Capture in the popup on an active Gmail tab.
(() => {
  if (location.hostname !== 'mail.google.com') return null;
  const subjectNode = document.querySelector('h2.hP');
  const container = subjectNode?.closest('.nH') || document;
  const sender = container.querySelector('.gD[email]') || document.querySelector('.gD[email]');
  const message = document.querySelector('[data-legacy-thread-id], [data-thread-perm-id]');
  const route = location.hash.split('/').filter(Boolean);
  const routeId = route.length > 1 ? route.at(-1) : '';
  const account = location.pathname.match(/\/mail\/u\/(\d+)/)?.[1] || '0';
  const threadId = message?.getAttribute('data-legacy-thread-id')
    || message?.getAttribute('data-thread-perm-id') || routeId;
  const dateNode = document.querySelector('.g3[title]');
  const received = dateNode ? new Date(dateNode.title) : null;
  return {
    subject: subjectNode?.textContent?.trim() || '',
    sender: sender?.getAttribute('email') || '',
    threadId: threadId ? `${account}:${threadId}` : '',
    dateReceived: received && !Number.isNaN(received.getTime()) ? received.toISOString() : ''
  };
})();
