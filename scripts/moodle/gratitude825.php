<?php
// Gratitude for Life (course 56), Jason 8-25: "How Gratitude Changes You and
// Your Brain" must be WITH Principle Lesson 1 — i.e. inside the lesson, not a
// separate sidebar item. Copies the PDF from resource cmid 267 into page 11
// (cmid 107) and appends it under the video; hides cmid 267 (reversible).
// Usage: php gratitude825.php [--dry]
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->libdir . '/filelib.php');

$DRY = in_array('--dry', $argv);
$COURSEID = 56;
$PAGE_CMID = 107;  $PAGE_ID = 11;
$RES_CMID  = 267;
$HEADING   = 'How Gratitude Changes You and Your Brain';

$admin = get_admin();
\core\session\manager::set_user($admin);
$fs = get_file_storage();

$resctx  = context_module::instance($RES_CMID);
$pagectx = context_module::instance($PAGE_CMID);
$files = $fs->get_area_files($resctx->id, 'mod_resource', 'content', 0, 'sortorder', false);
$pdf = reset($files);
if (!$pdf) { mtrace('ABORT: resource has no file'); exit(1); }
$name = $pdf->get_filename();
mtrace("source: cmid $RES_CMID file '$name' " . $pdf->get_filesize() . ' bytes');

$page = $DB->get_record('page', ['id' => $PAGE_ID], '*', MUST_EXIST);
if (strpos($page->content, rawurlencode($name)) !== false) {
    mtrace('SKIP: page already embeds the PDF');
    exit(0);
}
$block = "\n<h3 style=\"margin:28px 0 12px;font-size:20px;\">" . s($HEADING) . "</h3>\n"
       . '<iframe src="@@PLUGINFILE@@/' . rawurlencode($name) . '" title="' . s($HEADING) . '"'
       . ' style="width:100%;height:900px;border:1px solid #ddd;border-radius:6px;background:#fff;"></iframe>';
$newcontent = $page->content . $block;

if ($DRY) {
    mtrace("DRY: would copy '$name' into page $PAGE_ID (cmid $PAGE_CMID) content area");
    mtrace("DRY: would append:\n$block");
    mtrace("DRY: would hide cmid $RES_CMID");
    mtrace('DRY RUN complete.');
    exit(0);
}

if (!$fs->file_exists($pagectx->id, 'mod_page', 'content', 0, '/', $name)) {
    $fs->create_file_from_storedfile([
        'contextid' => $pagectx->id, 'component' => 'mod_page', 'filearea' => 'content',
        'itemid' => 0, 'filepath' => '/', 'filename' => $name,
    ], $pdf);
    mtrace("copied '$name' into page content area");
}
$DB->set_field('page', 'content', $newcontent, ['id' => $PAGE_ID]);
$DB->set_field('page', 'timemodified', time(), ['id' => $PAGE_ID]);
mtrace("page $PAGE_ID content updated");

set_coursemodule_visible($RES_CMID, 0);
mtrace("cmid $RES_CMID hidden");

rebuild_course_cache($COURSEID, true);
purge_all_caches();
mtrace('Done.');
