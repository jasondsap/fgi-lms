/**
 * Copy a string to the clipboard, falling back to a hidden textarea for
 * older or locked-down browsers where navigator.clipboard is unavailable
 * (or refused outside a secure context). Client-only.
 */
export async function copyText(text: string): Promise<void> {
  try {
    // Race a short timeout: without a user gesture (or in an unfocused
    // document) Chrome can leave writeText pending instead of rejecting.
    await Promise.race([
      navigator.clipboard.writeText(text),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 800)),
    ]);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } finally { document.body.removeChild(ta); }
  }
}
