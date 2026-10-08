import { simpleParser, ParsedMail } from 'mailparser';
import sanitizeHtml from 'sanitize-html';

export interface ParsedEmailData {
  subject: string;
  fromName: string;
  fromAddress: string;
  toAddresses: Array<{ name?: string; address?: string }>;
  ccAddresses: Array<{ name?: string; address?: string }>;
  bccAddresses: Array<{ name?: string; address?: string }>;
  date?: Date;
  messageId?: string;
  inReplyTo?: string;
  previewSnippet: string;
  html: string;
  text: string;
  hasAttachments: boolean;
  attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
    contentId?: string;
    checksum?: string;
  }>;
}

export function sanitizeEmailHtml(rawHtml: string, blockExternalImages = true): string {
  if (!rawHtml) return '';

  let sanitized = sanitizeHtml(rawHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img', 'style', 'font', 'center', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'div', 'span', 'hr', 'picture', 'source', 'figure', 'figcaption'
    ]),
    allowVulnerableTags: true,
    allowedAttributes: {
      '*': ['style', 'class', 'id', 'align', 'valign', 'width', 'height', 'bgcolor', 'color', 'dir', 'lang', 'title', 'alt', 'background'],
      'a': ['href', 'name', 'target', 'rel'],
      'img': ['src', 'alt', 'title', 'width', 'height', 'loading', 'data-original-src', 'data-blocked-src', 'style', 'class'],
      'source': ['src', 'srcset', 'type', 'media']
    },
    allowedSchemes: ['http', 'https', 'data', 'mailto', 'cid'],
    transformTags: {
      'a': sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
      'img': (tagName, attribs) => {
        const src = attribs.src || '';
        // If data: or cid:, NEVER block it (it is an inline/embedded image)
        if (src.startsWith('data:') || src.startsWith('cid:')) {
          return { tagName: 'img', attribs };
        }
        // If external image and block is enabled
        if (blockExternalImages && (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//'))) {
          return {
            tagName: 'img',
            attribs: {
              ...attribs,
              'data-blocked-src': src,
              'src': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
              'class': ((attribs.class || '') + ' external-image-blocked').trim()
            }
          };
        }
        return { tagName: 'img', attribs };
      }
    }
  });

  return sanitized;
}

/**
 * Replace inline CID references (e.g. src="cid:...") with self-contained base64 data URIs
 */
export function replaceCidImages(html: string, attachments: any[]): string {
  if (!html || !attachments || attachments.length === 0) return html;

  let result = html;

  for (const att of attachments) {
    if (!att.content) continue;

    const mime = att.contentType || 'image/png';
    const base64Data = `data:${mime};base64,${att.content.toString('base64')}`;

    const identifiers: string[] = [];

    if (att.cid) {
      const rawCid = String(att.cid).trim();
      const cleanCid = rawCid.replace(/^<|>$/g, '').trim();
      identifiers.push(rawCid, cleanCid);

      try {
        const decoded = decodeURIComponent(cleanCid);
        if (decoded !== cleanCid) identifiers.push(decoded);
      } catch {}

      const atIdx = cleanCid.indexOf('@');
      if (atIdx > 0) {
        identifiers.push(cleanCid.substring(0, atIdx));
      }
    }

    if (att.filename) {
      const rawFn = String(att.filename).trim();
      identifiers.push(rawFn);
      try {
        const decodedFn = decodeURIComponent(rawFn);
        if (decodedFn !== rawFn) identifiers.push(decodedFn);
      } catch {}
    }

    const uniqueIds = Array.from(new Set(identifiers.filter(Boolean)));

    for (const id of uniqueIds) {
      const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match src="cid:... " or src='cid:...' or src=cid:... with optional angle brackets
      const srcRegex = new RegExp(`(src\\s*=\\s*["']?)\\s*cid:(?:<)?${escaped}(?:>)?(["'\\s>])`, 'gi');
      result = result.replace(srcRegex, `$1${base64Data}$2`);

      // Match url("cid:...") or url('cid:...') or url(cid:...)
      const urlRegex = new RegExp(`(url\\(\\s*["']?)\\s*cid:(?:<)?${escaped}(?:>)?(["']?\\s*\\))`, 'gi');
      result = result.replace(urlRegex, `$1${base64Data}$2`);
    }
  }

  // Catch-all: check any remaining cid: in the document
  result = result.replace(/(src\s*=\s*["']?|url\(\s*["']?)\s*cid:(?:<)?([^"'\s)>]+)(?:>)?(["']?)/gi, (match, prefix, cidVal, suffix) => {
    const cleanCid = cidVal.replace(/^<|>$/g, '').trim();
    const found = attachments.find(a => {
      if (!a.content) return false;
      const aCid = (a.cid || '').replace(/^<|>$/g, '').trim();
      if (aCid === cleanCid) return true;
      try {
        if (decodeURIComponent(cleanCid) === aCid) return true;
      } catch {}
      if (a.filename === cleanCid) return true;
      try {
        if (decodeURIComponent(cleanCid) === a.filename) return true;
      } catch {}
      return false;
    });

    if (found && found.content) {
      const mime = found.contentType || 'image/png';
      const base64Data = `data:${mime};base64,${found.content.toString('base64')}`;
      return `${prefix}${base64Data}${suffix}`;
    }

    return match;
  });

  return result;
}

export async function parseRawEmail(source: Buffer | string): Promise<ParsedEmailData> {
  const parsed: ParsedMail = await simpleParser(source);

  const fromObj = parsed.from?.value?.[0];
  const fromName = fromObj?.name || fromObj?.address || 'Sconosciuto';
  const fromAddress = fromObj?.address || '';

  const toAddresses = (parsed.to ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to]) : [])
    .flatMap(item => item.value || [])
    .map(val => ({ name: val.name, address: val.address }));

  const ccAddresses = (parsed.cc ? (Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc]) : [])
    .flatMap(item => item.value || [])
    .map(val => ({ name: val.name, address: val.address }));

  const bccAddresses = (parsed.bcc ? (Array.isArray(parsed.bcc) ? parsed.bcc : [parsed.bcc]) : [])
    .flatMap(item => item.value || [])
    .map(val => ({ name: val.name, address: val.address }));

  const textBody = parsed.text || '';
  let htmlBody = parsed.html || (textBody ? `<pre style="font-family:inherit;white-space:pre-wrap;">${escapeHtml(textBody)}</pre>` : '');

  // Convert inline attachments (CID) to base64 Data URIs so browsers can render them natively
  if (parsed.attachments && parsed.attachments.length > 0) {
    htmlBody = replaceCidImages(htmlBody, parsed.attachments);
  }

  // Extract preview snippet (first 150 chars of plaintext)
  const previewSnippet = textBody
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);

  const attachments = (parsed.attachments || []).map(att => ({
    filename: att.filename || 'allegato',
    contentType: att.contentType || 'application/octet-stream',
    size: att.size || att.content?.length || 0,
    contentId: att.cid,
    checksum: att.checksum
  }));

  return {
    subject: parsed.subject || '(Nessun oggetto)',
    fromName,
    fromAddress,
    toAddresses,
    ccAddresses,
    bccAddresses,
    date: parsed.date || new Date(),
    messageId: parsed.messageId,
    inReplyTo: Array.isArray(parsed.inReplyTo) ? parsed.inReplyTo[0] : parsed.inReplyTo,
    previewSnippet,
    html: htmlBody,
    text: textBody,
    hasAttachments: attachments.length > 0,
    attachments
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
