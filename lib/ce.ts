/**
 * NAADAC CE wording for the shells (Jennifer, 8-29-26): "for 1 CE." on every
 * CE course except the two-hour ones, which read "for 2 CEs." A row with no
 * ceu_credits is a 1-CE course — the catalogue never stored the default.
 */
export function ceLabel(credits: number | null | undefined): string {
  const n = credits && credits > 0 ? credits : 1;
  const shown = Number.isInteger(n) ? String(n) : String(n).replace(/\.0$/, '');
  return `${shown} CE${n === 1 ? '' : 's'}`;
}
