/**
 * "Did you mean …?" for the email field (Jason, 9-7-26: people were
 * registering with mistyped addresses, and the Cognito account is created
 * already confirmed, so nothing else catches it). Typing the address twice
 * catches slips; this catches the consistent ones — gmail.con, gmial.com,
 * comcast.ne. Returns the corrected address or null.
 */
const DOMAIN_FIXES: Record<string, string> = {
  'gmail.con': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.om': 'gmail.com',
  'gmial.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gnail.com': 'gmail.com',
  'gmaill.com': 'gmail.com', 'gmali.com': 'gmail.com', 'gimail.com': 'gmail.com', 'googlemail.con': 'googlemail.com',
  'yahoo.con': 'yahoo.com', 'yahoo.co': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'ymail.con': 'ymail.com',
  'hotmail.con': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmali.com': 'hotmail.com',
  'outlook.con': 'outlook.com', 'outlook.co': 'outlook.com', 'outlok.com': 'outlook.com',
  'aol.con': 'aol.com', 'aol.co': 'aol.com', 'icloud.con': 'icloud.com', 'icloud.co': 'icloud.com', 'me.con': 'me.com',
  'comcast.ne': 'comcast.net', 'comcast.nte': 'comcast.net', 'comcast.com': 'comcast.net',
  'att.ne': 'att.net', 'att.nte': 'att.net', 'verizon.ne': 'verizon.net', 'sbcglobal.ne': 'sbcglobal.net',
  'live.con': 'live.com', 'msn.con': 'msn.com', 'protonmail.con': 'protonmail.com', 'proton.m': 'proton.me',
};

// Generic last-label slips when the domain itself isn't in the table.
const TLD_FIXES: Record<string, string> = {
  con: 'com', cmo: 'com', ocm: 'com', vom: 'com', xom: 'com', comm: 'com', 'co,': 'com',
  nte: 'net', ent: 'net', ogr: 'org', orh: 'org', og: 'org',
};

export function suggestEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (DOMAIN_FIXES[domain]) return `${local}@${DOMAIN_FIXES[domain]}`;
  const dot = domain.lastIndexOf('.');
  if (dot > 0) {
    const tld = domain.slice(dot + 1);
    if (TLD_FIXES[tld]) return `${local}@${domain.slice(0, dot)}.${TLD_FIXES[tld]}`;
  }
  return null;
}
