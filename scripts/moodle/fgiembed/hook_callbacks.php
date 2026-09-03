<?php
namespace local_fgiembed;

/**
 * Hide Moodle's own navigation chrome when a page is rendered inside the FGI
 * course player's iframe, so the learner sees the activity and nothing else.
 *
 * Why CSS and not $PAGE->set_pagelayout('embedded'):
 *   the embedded layout also drops block regions, which would take the quiz
 *   navigation block with it. Hiding chrome in CSS leaves question navigation
 *   working.
 *
 * Why Sec-Fetch-Dest and not a session flag:
 *   the decision is per-request, so it cannot leak into an admin's normal
 *   top-level Moodle session in the same browser.
 */
class hook_callbacks {

    /** Is this request being rendered inside our iframe? */
    public static function is_embedded(): bool {
        // Sent by every current browser on iframe navigation, including the
        // sub-navigation a quiz attempt does (attempt.php -> processattempt.php
        // -> review.php), which a one-off query param could not cover.
        $dest = $_SERVER['HTTP_SEC_FETCH_DEST'] ?? '';
        if ($dest === 'iframe' || $dest === 'frame') {
            return true;
        }
        // Explicit fallback for browsers without Sec-Fetch metadata, and the
        // only way to preview the embedded styling in a normal top-level tab.
        return !empty($_GET['fgiembed']);
    }

    public static function before_standard_head_html_generation(
        \core\hook\output\before_standard_head_html_generation $hook
    ): void {
        // The watch gate runs on every request, embedded or not: a learner who
        // lands on a gated page outside the player must not be able to mark
        // it done by hand either.
        $hook->add_html('<script id="fgiembed-watchgate">' . self::watchgate() . '</script>');
        if (!self::is_embedded()) {
            return;
        }
        $hook->add_html('<style id="fgiembed">' . self::css() . '</style>');
        $hook->add_html('<script id="fgiembed-pdf">' . self::pdfjs() . '</script>');
    }

    /**
     * Video watch gate (Jennifer, 8-25; Jason chose this over Video Time Pro):
     * a Page whose completion is MANUAL and whose content embeds a Vimeo
     * player is completed by this script once the learner has actually
     * played WATCH_THRESHOLD of the video — not by the "Mark as done"
     * button, which is hidden. Played time is accumulated from the player's
     * timeupdate deltas, so scrubbing forward does not count; partial
     * progress survives reloads via localStorage. Pages with automatic
     * (on-view) completion are untouched, so this is opt-in per activity
     * by switching its completion to manual.
     */
    private static function watchgate(): string {
        return <<<'JS'
(function () {
    var THRESHOLD = 0.9;
    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.querySelector('[data-action="toggle-manual-completion"]');
        var frame = document.querySelector('iframe[src*="player.vimeo.com"]');
        if (!btn || !frame) { return; }
        var cmid = parseInt(btn.getAttribute('data-cmid'), 10) ||
            (window.M && M.cfg && M.cfg.contextInstanceId);
        if (!cmid) { return; }

        // The script owns completion on this page; take the manual button away.
        var box = btn.closest('.completion-info') || btn.closest('[data-region="activity-information"]') || btn;
        box.style.display = 'none';
        var done = btn.getAttribute('data-toggletype') === 'manual:undo';

        var status = document.createElement('div');
        status.id = 'fgiembed-watchgate-status';
        status.setAttribute('role', 'status');
        status.style.cssText = 'margin:12px 0 0;font-size:14px;line-height:1.4;color:#4a5568;';
        var anchor = frame.parentNode;
        if (anchor && anchor.parentNode) { anchor.parentNode.insertBefore(status, anchor.nextSibling); }
        if (done) { status.textContent = '✓ Lesson complete.'; return; }

        var key = 'fgiwatch:' + cmid;
        var watched = 0;
        try { watched = parseFloat(localStorage.getItem(key)) || 0; } catch (e) {}
        var duration = 0, last = null, fired = false, saving = false;

        function pct() { return duration ? Math.min(100, Math.round(100 * watched / duration)) : 0; }
        function render() {
            if (fired) { status.textContent = '✓ Lesson complete.'; return; }
            status.textContent = 'Watched ' + pct() + '% — this lesson is marked complete once you have watched ' +
                Math.round(THRESHOLD * 100) + '% of the video.';
        }
        function complete() {
            if (fired || saving) { return; }
            saving = true;
            require(['core/ajax'], function (ajax) {
                ajax.call([{
                    methodname: 'core_completion_update_activity_completion_status_manually',
                    args: { cmid: cmid, completed: true }
                }])[0].then(function () {
                    fired = true; saving = false;
                    try { localStorage.removeItem(key); } catch (e) {}
                    render();
                }).catch(function () { saving = false; });
            });
        }
        function check() {
            if (!fired && duration && watched >= THRESHOLD * duration) { complete(); }
        }

        function attach(Player) {
            var player = new Player(frame);
            // player.js resolves ready() when the iframe answers its ping. If
            // the iframe was still loading when the ping went out, nothing
            // ever answers — so keep pinging until it does.
            var ready = false;
            player.ready().then(function () { ready = true; });
            var pinger = setInterval(function () {
                if (ready) { clearInterval(pinger); return; }
                try { frame.contentWindow.postMessage({ method: 'ping' }, '*'); } catch (e) {}
            }, 1000);
            player.getDuration().then(function (d) { duration = d; render(); check(); });
            player.on('seeked', function (e) { last = e.seconds; });
            player.on('timeupdate', function (e) {
                if (e.duration) { duration = e.duration; }
                if (last !== null) {
                    var delta = e.seconds - last;
                    // Normal playback advances ~0.25s per event; a jump is a seek.
                    if (delta > 0 && delta < 2) { watched += delta; }
                }
                last = e.seconds;
                try { localStorage.setItem(key, String(watched)); } catch (err) {}
                render(); check();
            });
        }
        render();
        // player.js is a UMD bundle: with Moodle's RequireJS on the page it
        // registers an anonymous define() instead of setting window.Vimeo, so
        // it must be loaded as a RequireJS module (no .js in the path).
        function loadApi() {
            if (window.require && window.require.config) {
                require.config({ paths: { 'fgiembed/vimeo-player': 'https://player.vimeo.com/api/player' } });
                require(['fgiembed/vimeo-player'], attach);
                return;
            }
            var s = document.createElement('script');
            s.src = 'https://player.vimeo.com/api/player.js';
            s.onload = function () { attach(window.Vimeo.Player); };
            document.head.appendChild(s);
        }
        // Wait for the page (and so, usually, the iframe) to finish loading
        // before attaching; the ping retry above covers the rest.
        if (document.readyState === 'complete') { loadApi(); }
        else { window.addEventListener('load', loadApi); }
    });
})();
JS;
    }

    /**
     * Route embedded PDFs through our bundled PDF.js viewer
     * (local/fgiembed/pdfjs/, toolbar trimmed in its viewer.html): learners
     * get zoom, page nav, search, print and download, but no annotation
     * tools, rotate, or open-file (Jason, 8-23). Only same-origin URLs are
     * rewritten — PDF.js refuses cross-origin file= anyway — and anything
     * else falls back to the browser viewer with its toolbar hidden.
     */
    private static function pdfjs(): string {
        return <<<'JS'
document.addEventListener('DOMContentLoaded', function() {
    var viewer = location.origin + '/local/fgiembed/pdfjs/web/viewer.html?file=';
    var frag = '#toolbar=0&navpanes=0&view=FitH';
    var els = document.querySelectorAll(
        'object[type="application/pdf"], embed[type="application/pdf"], ' +
        'object[data*=".pdf"], iframe[src*=".pdf"]'
    );
    els.forEach(function(el) {
        var attr = el.tagName === 'OBJECT' ? 'data' : 'src';
        var url = el.getAttribute(attr);
        if (!url || url.indexOf('/pdfjs/web/viewer.html') !== -1) {
            return;
        }
        var abs;
        try { abs = new URL(url, location.href); } catch (e) { return; }
        if (abs.origin !== location.origin) {
            if (url.indexOf('#') === -1) el.setAttribute(attr, url + frag);
            return;
        }
        var src = viewer + encodeURIComponent(abs.href);
        if (el.tagName === 'IFRAME') {
            el.setAttribute('src', src);
            return;
        }
        // object/embed render PDFs natively; swap in an iframe of the same
        // footprint so the PDF.js viewer (an HTML page) fills it instead.
        var frame = document.createElement('iframe');
        frame.src = src;
        frame.style.border = 'none';
        frame.style.width = el.getAttribute('width') || el.style.width || '100%';
        var h = el.getAttribute('height') || el.style.height ||
            (el.clientHeight > 200 ? el.clientHeight + 'px' : '80vh');
        frame.style.height = h;
        if (el.id) frame.id = el.id;
        el.parentNode.replaceChild(frame, el);
    });
});
JS;
    }

    private static function css(): string {
        return <<<'CSS'
/* --- Moodle chrome: site nav, breadcrumb, activity tabs, footer ----------- */
nav.navbar,
.navbar.fixed-top,
#page-navbar,
.breadcrumb,
.secondary-navigation,
.activity-navigation,
#page-footer,
.footer-popover,
.btn-footer-popover,
.dropdown-toggle.editmode-switch-form,
form.editmode-switch-form,
.usermenu,
#goto-top-link { display: none !important; }

/* --- Duplicated activity chrome -------------------------------------------
   The player sidebar already names the lesson and shows its completion state,
   so the page-level title and the "Completion requirements" box are pure
   duplication inside the frame.

   Only .activity-information is hidden, not the whole .activity-header — the
   header is also where an activity's description renders, and every activity
   we build today has an empty intro but a future one might not. */
#page-header,
.activity-header .activity-information,
[data-region="activity-information"] { display: none !important; }

/* With the header gone the content would otherwise start hard against the top. */
#region-main { padding-top: 24px !important; }

/* --- Course index drawer (left) ------------------------------------------
   The right-hand block drawer is deliberately left alone: on a quiz attempt
   it holds the quiz navigation block, which learners need. */
.drawer.drawer-left,
#courseindex,
[data-region="courseindex-drawer"],
.drawer-toggler.drawer-left-toggle { display: none !important; }

/* The fixed navbar and the open left drawer both reserve space. Reclaim it.
   Boost sets a hard margin-left on #page as well as the custom property, so
   zeroing the property alone leaves the content pushed right. margin-right is
   deliberately untouched — the right drawer still needs its space when open. */
body { padding-top: 0 !important; }
#page,
#page.drawers {
    padding-top: 0 !important;
    margin-top: 0 !important;
    top: 0 !important;
}
#page.drawers.show-drawer-left {
    --drawer-left-width: 0px !important;
    margin-left: 0 !important;
}
#page.drawers .main-inner { margin-top: 0 !important; }

/* Give the activity a little breathing room now the chrome is gone. */
#region-main { border: none !important; }
#topofscroll { margin-top: 0 !important; }

/* --- Certificate page (mod_customcert) -------------------------------------
   The "Recipients: N" heading, group selector, report table (or its
   "Nothing to display" notice) and "Download all" button render only for
   accounts holding mod/customcert:viewreport — staff. Learners never get
   them, but staff previewing a course through the player should see what a
   learner sees (Jason, 9-2-26). The learner-facing pieces — the
   "Received date" box and the "View certificate" button — are untouched. */
body#page-mod-customcert-view #region-main h3,
body#page-mod-customcert-view #mod-customcert-report-table,
body#page-mod-customcert-view #region-main .groupselector,
body#page-mod-customcert-view #region-main .paging,
body#page-mod-customcert-view #region-main .alert-info,
body#page-mod-customcert-view #region-main form:has(input[name="downloadall"]) { display: none !important; }
CSS;
    }
}
