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
        if (!self::is_embedded()) {
            return;
        }
        $hook->add_html('<style id="fgiembed">' . self::css() . '</style>');
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
CSS;
    }
}
