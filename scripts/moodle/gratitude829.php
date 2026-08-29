<?php
// Gratitude for Life (course 56), Jennifer via Jason 8-29: the "How Gratitude
// Changes You and Your Brain" PDF should be a *listed handout under Principle
// 1*, not embedded inside the lesson page. Reverses gratitude825.php:
//   1. strip the appended <h3> + PDF iframe block from page cmid 107 and drop
//      the PDF copy from the page's file area;
//   2. unhide resource cmid 267 (it already follows 107 in the sequence).
// Usage: sudo -u daemon php gratitude829.php [--dry]
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
require_once($CFG->dirroot . '/course/lib.php');

$DRY = in_array('--dry', $argv);
$COURSEID = 56;
$PAGE_CMID = 107;
$RES_CMID = 267;
$PDF = 'How Gratitude Changes You and Your Brain.pdf';

$admin = get_admin();
\core\session\manager::set_user($admin);
$fs = get_file_storage();

// ---- 1. page content -------------------------------------------------------
$cm = get_coursemodule_from_id('page', $PAGE_CMID, $COURSEID, false, MUST_EXIST);
$page = $DB->get_record('page', ['id' => $cm->instance], '*', MUST_EXIST);
$ctx = context_module::instance($cm->id);

// The 8-25 block: heading + iframe pointing at the @@PLUGINFILE@@ PDF.
$pattern = '~\s*<h3[^>]*>\s*How Gratitude Changes You and Your Brain\s*</h3>\s*<iframe[^>]*@@PLUGINFILE@@[^>]*>\s*(?:</iframe>)?\s*~is';
$new = preg_replace($pattern, "\n", $page->content, -1, $hits);
mtrace("page {$cm->id}: content " . strlen($page->content) . " bytes, block matches = $hits");
if ($hits !== 1) {
    cli_error("expected exactly one embedded block, found $hits — inspect before changing anything");
}
$file = $fs->get_file($ctx->id, 'mod_page', 'content', 0, '/', $PDF);
mtrace('page file area: ' . ($file ? "has $PDF (" . $file->get_filesize() . ' bytes)' : "no $PDF"));

if ($DRY) {
    mtrace("DRY: would set page content to " . strlen(trim($new)) . " bytes, delete the PDF copy, unhide cmid $RES_CMID");
} else {
    $DB->set_field('page', 'content', trim($new), ['id' => $page->id]);
    $DB->set_field('page', 'timemodified', time(), ['id' => $page->id]);
    if ($file) { $file->delete(); }
    mtrace('page content stripped' . ($file ? ', PDF copy removed' : ''));
}

// ---- 2. resource visibility -----------------------------------------------
$res = $DB->get_record('course_modules', ['id' => $RES_CMID, 'course' => $COURSEID], '*', MUST_EXIST);
mtrace("resource $RES_CMID visible = {$res->visible}");
if (!$DRY) {
    if (!$res->visible) {
        set_coursemodule_visible($RES_CMID, 1, 1);
        mtrace("resource $RES_CMID unhidden");
    }
    rebuild_course_cache($COURSEID, true);
    $section0 = $DB->get_record('course_sections', ['course' => $COURSEID, 'section' => 0]);
    mtrace("done: sequence = {$section0->sequence}");
}
