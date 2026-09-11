<?php
// SCARR Pre-Certification course (127) — 9-10-26, Jennifer's SCARR Portal changes:
//   * remove "SCARR Document Checklist" (cmid 598) + "SCARR Field Inspection
//     Checklist" (cmid 599)
//   * add "SCARR Certification Handbook" (mod_resource, EMBED, completion on
//     view) in the slot the checklists held (right after Part 7)
//   * re-point the certificate (cmid 688) availability gate: drop 598/599,
//     require the handbook
// Usage: sudo -u daemon /opt/bitnami/php/bin/php precert127-handbook.php [--dry]
// Idempotent: handbook skipped by name, deletes skipped if already gone.
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/course/modlib.php');
require_once($CFG->libdir . '/filelib.php');
require_once($CFG->libdir . '/resourcelib.php');
require_once($CFG->libdir . '/completionlib.php');

$DRY = in_array('--dry', $argv);
$COURSEID = 127; $CERTCM = 688; $AFTERCM = 597; $REMOVE = [598, 599];
$NAME = 'SCARR Certification Handbook'; $SRC = '/tmp/scarr127/handbook.pdf';
$FILENAME = 'SCARR-Certification-Handbook.pdf';
if (!file_exists($SRC)) { cli_error("missing $SRC"); }

$admin = get_admin();
\core\session\manager::set_user($admin);
$fs = get_file_storage();
$usercontext = context_user::instance($admin->id);
$course = $DB->get_record('course', ['id' => $COURSEID], '*', MUST_EXIST);

// ---- 1. add the handbook -----------------------------------------------------
$existing = $DB->get_field_sql(
    "SELECT cm.id FROM {course_modules} cm JOIN {modules} m ON m.id = cm.module JOIN {resource} r ON r.id = cm.instance
      WHERE cm.course = ? AND m.name = 'resource' AND r.name = ? AND cm.deletioninprogress = 0", [$COURSEID, $NAME]);
if ($existing) {
    $newcm = (int) $existing; mtrace("handbook already present: cmid $newcm");
} else if ($DRY) {
    $newcm = 0; mtrace("[dry] would add resource '$NAME' from $SRC (" . filesize($SRC) . " bytes)");
} else {
    $draftid = file_get_unused_draft_itemid();
    $fs->create_file_from_pathname([
        'contextid' => $usercontext->id, 'component' => 'user', 'filearea' => 'draft',
        'itemid' => $draftid, 'filepath' => '/', 'filename' => $FILENAME,
    ], $SRC);
    $d = new stdClass();
    $d->course = $COURSEID; $d->modulename = 'resource';
    $d->module = $DB->get_field('modules', 'id', ['name' => 'resource'], MUST_EXIST);
    $d->name = $NAME; $d->intro = ''; $d->introformat = FORMAT_HTML;
    $d->section = 0; $d->visible = 1; $d->visibleoncoursepage = 1;
    $d->groupmode = 0; $d->groupingid = 0; $d->cmidnumber = '';
    $d->completion = COMPLETION_TRACKING_AUTOMATIC; $d->completionview = 1;
    $d->completionexpected = 0;
    $d->files = $draftid;
    $d->display = RESOURCELIB_DISPLAY_EMBED;
    $d->printintro = 0; $d->showsize = 0; $d->showtype = 0; $d->showdate = 0;
    $d->filterfiles = 0; $d->popupwidth = 620; $d->popupheight = 450;
    $mi = add_moduleinfo($d, $course);
    $newcm = (int) $mi->coursemodule;
    mtrace("resource '$NAME' cmid $newcm [$FILENAME, " . filesize($SRC) . " bytes]");
}

// ---- 2. delete the two checklists ------------------------------------------
foreach ($REMOVE as $cmid) {
    $cm = $DB->get_record('course_modules', ['id' => $cmid, 'course' => $COURSEID]);
    if (!$cm) { mtrace("cmid $cmid already gone"); continue; }
    $n = $DB->get_field('resource', 'name', ['id' => $cm->instance]);
    if ($DRY) { mtrace("[dry] would delete cmid $cmid '$n'"); continue; }
    course_delete_module($cmid);
    mtrace("deleted cmid $cmid '$n'");
}

// ---- 3. section order: handbook right after Part 7 -------------------------
$s0 = $DB->get_record('course_sections', ['course' => $COURSEID, 'section' => 0], '*', MUST_EXIST);
$seq = array_values(array_filter(array_map('intval', explode(',', $s0->sequence))));
$seq = array_values(array_diff($seq, $REMOVE, [$newcm]));
$pos = array_search($AFTERCM, $seq);
if ($pos === false) { cli_error("cmid $AFTERCM not in section 0"); }
if ($newcm) { array_splice($seq, $pos + 1, 0, [$newcm]); }
mtrace(($DRY ? '[dry] ' : '') . 'sequence: ' . implode(',', $seq));
if (!$DRY) { $DB->set_field('course_sections', 'sequence', implode(',', $seq), ['id' => $s0->id]); }

// ---- 4. certificate gate ----------------------------------------------------
$cert = $DB->get_record('course_modules', ['id' => $CERTCM, 'course' => $COURSEID], '*', MUST_EXIST);
$av = json_decode($cert->availability, true);
$conds = array_values(array_filter($av['c'], fn($c) => !in_array((int) ($c['cm'] ?? 0), $REMOVE)));
$have = array_map(fn($c) => (int) ($c['cm'] ?? 0), $conds);
if ($newcm && !in_array($newcm, $have)) { $conds[] = ['type' => 'completion', 'cm' => $newcm, 'e' => 1]; }
$av['c'] = $conds; $av['showc'] = array_fill(0, count($conds), true);
mtrace(($DRY ? '[dry] ' : '') . 'cert gate: ' . count($conds) . ' conditions -> ' . json_encode($av));
if (!$DRY) {
    $DB->set_field('course_modules', 'availability', json_encode($av), ['id' => $CERTCM]);
    rebuild_course_cache($COURSEID, true);
}
mtrace('done');
