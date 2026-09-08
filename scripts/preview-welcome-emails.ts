/**
 * Preview / test-send the per-surface welcome emails (lib/notify.ts,
 * Jennifer's "registration pop-ups and welcome emails 9-4-26" copy).
 *
 *   npx tsx scripts/preview-welcome-emails.ts                     # write HTML previews to scripts/data/welcome-preview/
 *   npx tsx scripts/preview-welcome-emails.ts you@example.com     # ...and send all three to that address via Resend
 *
 * Loads .env.local (RESEND_API_KEY / RESEND_FROM_EMAIL / NEXT_PUBLIC_APP_URL).
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
config({ path: '.env.local', override: true });

async function main() {
  // Import after dotenv so BASE_URL / emailEnabled see .env.local.
  const { welcomeEmail, sendEmail, emailEnabled } = await import('../lib/notify');
  const to = process.argv[2];
  const outDir = join(__dirname, 'data', 'welcome-preview');
  mkdirSync(outDir, { recursive: true });

  const cases = [
    { surface: 'fgi' as const,      switchedToPortal: false },
    { surface: 'scarr' as const,    switchedToPortal: false },
    { surface: 'colorado' as const, switchedToPortal: true  },
  ];
  for (const c of cases) {
    const { subject, html } = welcomeEmail({ firstName: 'Jordan', ...c });
    const file = join(outDir, `${c.surface}${c.switchedToPortal ? '-switched' : ''}.html`);
    writeFileSync(file, `<!doctype html><title>${subject}</title>${html}`);
    console.log(`${c.surface.padEnd(9)} ${subject}  ->  ${file}`);
    if (to) {
      if (!emailEnabled) { console.log('  (Resend not configured — skipping send)'); continue; }
      const ok = await sendEmail({ to: [to], subject: `[TEST] ${subject}`, html });
      console.log(`  sent to ${to}: ${ok}`);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
