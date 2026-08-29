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

## Video watch gate (1.1.0, August 2026)

A second script, `fgiembed-watchgate`, is injected on **every** request (not
just embedded ones). It activates only on a page that has BOTH a manual
completion toggle (`[data-action="toggle-manual-completion"]`, i.e. the
activity's completion is set to *manual*) AND a Vimeo `<iframe>`. On such a
page it:

- hides Moodle's "Mark as done" control — the script owns completion;
- attaches Vimeo's player API to the existing iframe and accumulates *played*
  seconds from `timeupdate` deltas (a jump larger than 2 s is a seek and is
  not counted), persisting partial progress in `localStorage` per cmid;
- shows a status line under the video ("Watched 42% — this lesson is marked
  complete once you have watched 90% of the video.");
- at `THRESHOLD` (0.9) calls `core_completion_update_activity_completion_status_manually`
  via `core/ajax`, which sets the learner's completion exactly as the manual
  button would.

Opt an activity in by switching its completion from automatic-on-view to
manual (`scripts/moodle/watchgate825.php` does this for the SCARR and
Colorado pre-certification video pages). Pages with automatic completion are
untouched. Chosen over Video Time Pro (paid, €229+/yr) on 8-25-26.

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
// Run in the console on any lms.fgilearn.org page (same-origin iframe).
const f = document.createElement('iframe');
f.src = 'https://lms.fgilearn.org/mod/page/view.php?id=<cmid>';
document.body.appendChild(f);
f.onload = () => console.log({
  styled: !!f.contentDocument.querySelector('#fgiembed'),
  navbar: getComputedStyle(f.contentDocument.querySelector('nav.navbar')).display,
});
```
