# local_fgiembed

Moodle local plugin that strips Moodle's own navigation chrome from pages
rendered inside the FGI course player's iframe, so a learner sees the activity
and nothing else.

This lives in the Next.js repo rather than the Moodle server alone because it is
load-bearing for `components/course/CoursePlayer.tsx` — the two are one feature.
It is **not** part of the Next.js build; nothing imports it.

## How it decides a page is embedded

The `Sec-Fetch-Dest: iframe` request header, which every current browser sends on
iframe navigation. This matters more than it looks:

- It is **per-request**, so it cannot leak into an admin's normal top-level
  Moodle session in the same browser — which a `$SESSION` flag or a site-wide
  theme change would.
- It survives sub-navigation. A quiz attempt walks `attempt.php` →
  `processattempt.php` → `review.php`; a one-off query parameter would only
  cover the first hop.

`?fgiembed=1` is accepted as a fallback for browsers without Sec-Fetch metadata,
and is the only way to preview the embedded styling in a normal top-level tab.

## Why CSS, not `$PAGE->set_pagelayout('embedded')`

The embedded layout also drops block regions, which would take the **quiz
navigation block** with it. Hiding chrome in CSS leaves question navigation
working. For the same reason only the left (course index) drawer is hidden — the
right-hand block drawer is deliberately left alone.

## Deploying

```bash
scp -r moodle/local_fgiembed/* bitnami@<host>:/tmp/fgiembed/
ssh bitnami@<host> '
  sudo cp -r /tmp/fgiembed /opt/bitnami/moodle/local/fgiembed
  sudo chown -R daemon:daemon /opt/bitnami/moodle/local/fgiembed
  sudo -u daemon /opt/bitnami/php/bin/php /opt/bitnami/moodle/admin/cli/upgrade.php --non-interactive
  sudo /opt/bitnami/ctlscript.sh restart php-fpm'
```

Two traps, both learned the hard way:

- **Never run Moodle's CLI under plain `sudo`** — it leaves root-owned files in
  `/bitnami/moodledata` and breaks the site with "Invalid permissions". Run as
  `daemon`. Recovery: `sudo find /bitnami/moodledata -user root -exec chown
  daemon:daemon {} +`.
- **`purge_caches.php` does not clear PHP opcache.** After editing a class the
  old CSS keeps being served, which looks exactly like a selector that doesn't
  match. Restart php-fpm.

## Verifying

Load an activity twice — top level and in an iframe — and confirm the chrome is
present in the first and gone in the second:

```js
// Run in the console on any fgi-lms.made180.dev page (same-origin iframe).
const f = document.createElement('iframe');
f.src = 'https://fgi-lms.made180.dev/mod/page/view.php?id=<cmid>';
document.body.appendChild(f);
f.onload = () => console.log({
  styled: !!f.contentDocument.querySelector('#fgiembed'),
  navbar: getComputedStyle(f.contentDocument.querySelector('nav.navbar')).display,
});
```
