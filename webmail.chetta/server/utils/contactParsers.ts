export interface ParsedContact {
  name?: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
}

/**
 * Split CSV line handling quotes and delimiters (comma, semicolon, tab)
 */
function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        current += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Detect delimiter: comma, semicolon, tab
 */
function detectDelimiter(headerLine: string): string {
  const semicolons = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  const tabs = (headerLine.match(/\t/g) || []).length;

  if (tabs > commas && tabs > semicolons) return '\t';
  if (semicolons > commas) return ';';
  return ',';
}

/**
 * Parse vCard (.vcf) formatted text (supports vCard 2.1, 3.0, 4.0)
 */
export function parseVCard(vcfText: string): ParsedContact[] {
  const contacts: ParsedContact[] = [];
  const cards = vcfText.split(/BEGIN:VCARD/i).slice(1);

  for (const card of cards) {
    const lines = card.split(/\r?\n/);
    let name = '';
    let email = '';
    let phone = '';
    let company = '';
    let notes = '';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      // Handle folded lines (RFC 2426)
      while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
        i++;
        line += lines[i].trim();
      }

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const propFull = line.slice(0, colonIdx).toUpperCase();
      const value = line.slice(colonIdx + 1).replace(/\\n/g, '\n').replace(/\\,/g, ',').trim();

      if (propFull.startsWith('FN') && !name) {
        name = value;
      } else if (propFull.startsWith('N') && !name) {
        // N:Last;First;Middle;Prefix;Suffix
        const parts = value.split(';').map(p => p.trim()).filter(Boolean);
        if (parts.length > 0) {
          name = parts.reverse().join(' ');
        }
      } else if (propFull.startsWith('EMAIL') && !email) {
        email = value.toLowerCase();
      } else if (propFull.startsWith('TEL') && !phone) {
        phone = value;
      } else if (propFull.startsWith('ORG') && !company) {
        company = value.split(';')[0].trim();
      } else if (propFull.startsWith('NOTE') && !notes) {
        notes = value;
      }
    }

    if (email && email.includes('@')) {
      contacts.push({ name: name || email.split('@')[0], email, phone, company, notes });
    }
  }

  return contacts;
}

/**
 * Parse CSV text from various sources (Google, Outlook, or Generic)
 */
export function parseContactsCsv(csvText: string): ParsedContact[] {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map(h => h.toLowerCase().replace(/['"]/g, '').trim());

  // Find column indices
  let nameIdx = -1;
  let firstNameIdx = -1;
  let lastNameIdx = -1;
  let emailIdx = -1;
  let email2Idx = -1;
  let phoneIdx = -1;
  let companyIdx = -1;
  let notesIdx = -1;

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    // Google: "name", "given name", "family name", "e-mail 1 - value", "phone 1 - value"
    // Outlook EN: "first name", "last name", "e-mail address", "mobile phone", "company"
    // Outlook IT: "nome", "cognome", "indirizzo di posta elettronica", "cellulare", "società"
    if (h === 'name' || h === 'nome' || h === 'display name' || h === 'nominativo' || h === 'full name') {
      nameIdx = i;
    } else if (h === 'first name' || h === 'given name' || h === 'nome di battesimo') {
      firstNameIdx = i;
    } else if (h === 'last name' || h === 'family name' || h === 'cognome') {
      lastNameIdx = i;
    } else if (
      h === 'e-mail 1 - value' ||
      h === 'e-mail address' ||
      h === 'indirizzo di posta elettronica' ||
      h === 'email' ||
      h === 'e-mail' ||
      h === 'mail' ||
      h === 'posta elettronica'
    ) {
      if (emailIdx === -1) emailIdx = i;
    } else if (h === 'e-mail 2 - value' || h === 'e-mail 2 address' || h === 'indirizzo posta 2') {
      email2Idx = i;
    } else if (
      h === 'phone 1 - value' ||
      h === 'mobile phone' ||
      h === 'business phone' ||
      h === 'cellulare' ||
      h === 'telefono' ||
      h === 'telefono ufficio' ||
      h === 'phone' ||
      h === 'tel'
    ) {
      if (phoneIdx === -1) phoneIdx = i;
    } else if (
      h === 'organization 1 - name' ||
      h === 'company' ||
      h === 'società' ||
      h === 'azienda' ||
      h === 'ragione sociale'
    ) {
      companyIdx = i;
    } else if (h === 'notes' || h === 'note' || h === 'description' || h === 'commenti') {
      notesIdx = i;
    }
  }

  // Fallback: if no email header detected, search for the column that contains an '@' in the first few data rows
  if (emailIdx === -1) {
    for (let col = 0; col < headers.length; col++) {
      let atCount = 0;
      for (let r = 1; r < Math.min(lines.length, 6); r++) {
        const row = splitCsvLine(lines[r], delimiter);
        if (row[col] && row[col].includes('@')) atCount++;
      }
      if (atCount > 0) {
        emailIdx = col;
        break;
      }
    }
  }

  if (emailIdx === -1) return [];

  const contacts: ParsedContact[] = [];

  for (let r = 1; r < lines.length; r++) {
    const row = splitCsvLine(lines[r], delimiter);
    let email = (row[emailIdx] || '').trim().toLowerCase();
    if (!email && email2Idx !== -1) {
      email = (row[email2Idx] || '').trim().toLowerCase();
    }

    if (!email || !email.includes('@')) continue;

    let name = '';
    if (nameIdx !== -1 && row[nameIdx]) {
      name = row[nameIdx].trim();
    } else {
      const first = firstNameIdx !== -1 ? (row[firstNameIdx] || '').trim() : '';
      const last = lastNameIdx !== -1 ? (row[lastNameIdx] || '').trim() : '';
      name = `${first} ${last}`.trim();
    }

    if (!name) {
      name = email.split('@')[0];
    }

    const phone = phoneIdx !== -1 ? (row[phoneIdx] || '').trim() : undefined;
    const company = companyIdx !== -1 ? (row[companyIdx] || '').trim() : undefined;
    const notes = notesIdx !== -1 ? (row[notesIdx] || '').trim() : undefined;

    contacts.push({
      name,
      email,
      phone: phone || undefined,
      company: company || undefined,
      notes: notes || undefined
    });
  }

  return contacts;
}

/**
 * Universal Parser: automatically determines if text is vCard or CSV and parses contacts
 */
export function parseAnyContactSource(text: string): ParsedContact[] {
  const trimmed = text.trim();
  if (trimmed.includes('BEGIN:VCARD')) {
    return parseVCard(trimmed);
  }
  return parseContactsCsv(trimmed);
}

/**
 * Format contacts to CSV with UTF-8 BOM for Microsoft Excel / Outlook
 */
export function formatContactsToCsv(contacts: Array<{ name?: string; email: string; phone?: string; company?: string; notes?: string }>): string {
  const header = ['Nome', 'Indirizzo di posta elettronica', 'Telefono', 'Società', 'Note'];
  const rows = contacts.map(c => [
    `"${(c.name || '').replace(/"/g, '""')}"`,
    `"${c.email.replace(/"/g, '""')}"`,
    `"${(c.phone || '').replace(/"/g, '""')}"`,
    `"${(c.company || '').replace(/"/g, '""')}"`,
    `"${(c.notes || '').replace(/"/g, '""')}"`
  ]);

  // \uFEFF is UTF-8 Byte Order Mark so Excel opens it with accented characters correctly
  return '\uFEFF' + [header.join(','), ...rows.map(r => r.join(','))].join('\r\n');
}

/**
 * Format contacts to vCard 3.0 (.vcf)
 */
export function formatContactsToVCard(contacts: Array<{ name?: string; email: string; phone?: string; company?: string; notes?: string }>): string {
  return contacts.map(c => {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${c.name || c.email.split('@')[0]}`,
      `EMAIL;TYPE=INTERNET,PREF:${c.email}`
    ];
    if (c.phone) lines.push(`TEL;TYPE=CELL:${c.phone}`);
    if (c.company) lines.push(`ORG:${c.company}`);
    if (c.notes) lines.push(`NOTE:${c.notes.replace(/\r?\n/g, '\\n')}`);
    lines.push('END:VCARD');
    return lines.join('\r\n');
  }).join('\r\n');
}
