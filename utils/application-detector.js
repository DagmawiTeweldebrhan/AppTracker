import { text } from './models.js';

export function htmlToText(value) {
  return String(value || '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ').trim();
}

export function decodeBody(data = '') {
  try {
    const bytes = Uint8Array.from(atob(data.replace(/-/g, '+').replace(/_/g, '/')), character => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch { return ''; }
}

export function gmailMessage(message, account) {
  const headers = message.payload?.headers || [];
  const header = name => headers.find(item => item.name.toLowerCase() === name)?.value || '';
  const parts = [];
  function visit(part) {
    if (!part || part.filename) return;
    if (part.body?.data && ['text/plain', 'text/html'].includes(part.mimeType)) {
      parts.push(part.mimeType === 'text/html' ? htmlToText(decodeBody(part.body.data)) : decodeBody(part.body.data));
    }
    for (const child of part.parts || []) visit(child);
  }
  visit(message.payload);
  return {
    messageId: message.id, threadId: `gmail-api:${account}:${message.threadId}`,
    subject: header('subject'), sender: header('from'), account,
    dateReceived: new Date(Number(message.internalDate)).toISOString(),
    body: parts.join('\n').slice(0, 100000),
    outgoing: Boolean(message.labelIds?.some(label => ['SENT', 'DRAFT', 'SPAM', 'TRASH'].includes(label)))
  };
}

const clean = value => text(value, 200).replace(/^["'“”\s]+|["'“”\s.!:,]+$/g, '').trim();
const normalized = value => String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export const normalizeIdentity = normalized;

// Deliberately require an application-specific event; newsletters are not applications.
export function detectApplication(message) {
  if (message.outgoing) return null;
  const subject = text(message.subject, 500);
  const body = htmlToText(message.body);
  const content = `${subject}\n${body}`;
  const confirmation = /thank(?:s| you) for (?:applying|your (?:job )?application)|(?:we(?:'ve| have) |has been |was )received your application|your application (?:has been|was) (?:received|submitted)|application (?:received|confirmation)|successfully (?:applied|submitted your application)/i.test(content);
  const jobContext = /\b(?:application|applying|candidate|candidacy|position|role|interview|hiring|recruitment)\b/i.test(content);
  const rejection = /(?:not|won't|will not|unable to) (?:be )?(?:moving|move|proceed|progress|continue|offer)|decided (?:not to|to (?:move forward|proceed) with other)|(?:other|another) candidate|unsuccessful|regret to inform|application.{0,60}(?:rejected|not selected)|position.{0,40}(?:filled|closed)/i.test(content);
  if (!(confirmation || (jobContext && rejection))) return null;
  // Discard quoted historical mail so an old rejection cannot classify a new message.
  const current = content.split(/\bOn .{5,120}wrote:|-----Original Message-----/i)[0];
  const status = rejection && /not|other candidate|another candidate|unsuccessful|regret|rejected|not selected|filled|closed/i.test(current) ? 'Rejected' : 'Applied';
  let company = '';
  let role = '';
  const roleAtCompany = content.match(/(?:applying|application|interest|applied)(?: for| in)?(?: the)?\s+(.{2,100}?)\s+(?:position |role )?at\s+([^.!\n|]{2,100})/i);
  if (roleAtCompany && !/^(?:a |an |the )?(?:job|position|role|opportunity)$/i.test(clean(roleAtCompany[1]))) {
    role = clean(roleAtCompany[1]).replace(/\s+(?:position|role)$/i, '');
    company = clean(roleAtCompany[2]);
  }
  const companyMatch = content.match(/(?:thank(?:s| you) for applying (?:to|with)|your (?:interest|application) (?:in|to|with)|application (?:to|with))\s+([^.!\n|]{2,100}?)(?=\s+(?:for|has|was|is|we|and|our)\b|[.!\n|]|$)/i);
  if (!company && companyMatch) company = clean(companyMatch[1]);
  const roleMatch = content.match(/(?:application for|applied for|applying for|interest in)(?: the)?\s+([^.!\n|]{2,120}?)(?=\s+(?:position|role|at|with|has|was|is)\b|[.!\n|]|$)/i)
    || content.match(/(?:position|role|job title)\s*:\s*([^\n.!|]{2,100})/i);
  if (!role && roleMatch) role = clean(roleMatch[1]);
  if (!company) {
    const senderName = message.sender?.match(/^\s*"?([^"<]+?)"?\s*</)?.[1]?.trim();
    if (senderName && !/greenhouse|lever|workday|linkedin|indeed|recruit|talent|no.?reply|hiring team|careers|jobs|notifications/i.test(senderName)) company = clean(senderName);
  }
  // Missing or ambiguous details stay visible as an unlinked email for review.
  if (/^(?:the|a|an|this|our|your)\s*(?:position|role|job|company|team)?$/i.test(role)) role = '';
  if (/^(?:the|a|an|this|our|your)\s*(?:company|team|position|role)?$/i.test(company)) company = '';
  return { ...message, body: undefined, status, company, role, actionRequired: !company || !role };
}
