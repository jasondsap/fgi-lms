// Client-safe helper for the lockdown's `?next=` param (lib/lockdown.ts is
// server-only — it pulls in the session — so this lives apart).

/**
 * Client-side guard for the `next` value coming back off the URL: same-site
 * path only (no scheme, no protocol-relative `//host`), so the param can't be
 * turned into an open redirect.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null;
  return raw;
}
