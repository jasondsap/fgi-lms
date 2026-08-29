<?php
// Course 139 "Project Best Practices: Communication & Tracking" (Jason, 8-29):
// the bundle got the two video Pages from courses 52 + 64 but not their
// handouts. Copy every file resource across, nested under its own lesson:
//   Communication page (731) ← course 52 resources 294, 295, 296
//   Project Logs page  (732) ← course 64 resources 279..284
// A resource with the same name already in 139 is skipped, which also
// dedupes the Stakeholder Analysis matrix that both sources carry.
// Display settings are copied from each source resource. Sources untouched.
// Usage: sudo -u daemon php pbp139.php [--dry]
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/course/modlib.php');
require_once($CFG->libdir . '/filelib.php');
require_once($CFG->libdir . '/resourcelib.php');

$DRY = in_array('--dry', $argv);
$COURSEID = 139;
$PLAN = [
    731 => [294, 295, 296],                 // after Communication page
    732 => [279, 280, 281, 282, 283, 284],  // after Project Logs page
];

$admin = get_admin();
\core\session\manager::set_user($admin);
$fs = get_file_storage();
$usercontext = context_user::instance($admin->id);
$course = $DB->get_record('course', ['id' => $COURSEID], '*', MUST_EXIST);
if ($course->format === 'singleactivity') {
    cli_error("course $COURSEID is singleactivity — switch to topics first (§6ax sweep gotcha)");
}
$section0 = $DB->get_record('course_sections', ['course' => $COURSEID, 'section' => 0], '*', MUST_EXIST);
$resmodule = $DB->get_field('modules', 'id', ['name' => 'resource'], MUST_EXIST);

function place_after(int $sectionid, int $newcmid, int $anchorcmid): void {
    global $DB;
    $section = $DB->get_record('course_sections', ['id' => $sectionid], '*', MUST_EXIST);
    $seq = array_values(array_filter(array_map('intval', explode(',', $section->sequence))));
    $seq = array_values(array_diff($seq, [$newcmid]));
    $pos = array_search($anchorcmid, $seq);
    if ($pos === false) { $seq[] = $newcmid; } else { array_splice($seq, $pos + 1, 0, [$newcmid]); }
    $DB->set_field('course_sections', 'sequence', implode(',', $seq), ['id' => $sectionid]);
}

$added = 0;
foreach ($PLAN as $anchor => $srccmids) {
    if (!$DB->record_exists('course_modules', ['id' => $anchor, 'course' => $COURSEID])) {
        cli_error("anchor cmid $anchor is not in course $COURSEID");
    }
    $prev = $anchor; // each handout goes right after the previous one
    foreach ($srccmids as $srccmid) {
        $srccm = get_coursemodule_from_id('resource', $srccmid, 0, false, MUST_EXIST);
        $srcres = $DB->get_record('resource', ['id' => $srccm->instance], '*', MUST_EXIST);
        $srcctx = context_module::instance($srccm->id);
        $srcfiles = $fs->get_area_files($srcctx->id, 'mod_resource', 'content', 0, 'sortorder', false);
        $srcfile = reset($srcfiles);
        if (!$srcfile) { mtrace("SKIP $srccmid '{$srccm->name}': no file"); continue; }
        $label = "'{$srccm->name}' [" . $srcfile->get_filename() . ' ' . $srcfile->get_filesize() . 'b] from course ' . $srccm->course;

        $existing = $DB->get_field_sql(
            "SELECT cm.id FROM {course_modules} cm JOIN {resource} r ON r.id = cm.instance
              WHERE cm.course = ? AND cm.module = ? AND cm.deletioninprogress = 0 AND r.name = ?",
            [$COURSEID, $resmodule, $srccm->name]);
        if ($existing) {
            mtrace("SKIP (already in $COURSEID as cmid $existing): $label");
            $prev = (int) $existing;
            continue;
        }
        if ($DRY) {
            mtrace("DRY: would add $label after cmid $prev");
            continue;
        }

        $draftid = file_get_unused_draft_itemid();
        $fs->create_file_from_storedfile([
            'contextid' => $usercontext->id, 'component' => 'user', 'filearea' => 'draft',
            'itemid' => $draftid, 'filepath' => '/', 'filename' => $srcfile->get_filename(),
        ], $srcfile);

        $d = new stdClass();
        $d->course = $COURSEID; $d->modulename = 'resource'; $d->module = $resmodule;
        $d->section = 0; $d->visible = 1; $d->visibleoncoursepage = 1; $d->cmidnumber = '';
        $d->groupmode = 0; $d->groupingid = 0;
        $d->name = $srccm->name; $d->intro = $srcres->intro ?? ''; $d->introformat = $srcres->introformat ?? FORMAT_HTML;
        $d->files = $draftid;
        $d->display = (int) $srcres->display;
        $opts = $srcres->displayoptions ? (array) unserialize($srcres->displayoptions) : [];
        $d->printintro = (int) ($opts['printintro'] ?? 0);
        $d->showsize = (int) ($opts['showsize'] ?? 1);
        $d->showtype = (int) ($opts['showtype'] ?? 1);
        $d->showdate = (int) ($opts['showdate'] ?? 0);
        $d->popupwidth = (int) ($opts['popupwidth'] ?? 620);
        $d->popupheight = (int) ($opts['popupheight'] ?? 450);
        $d->filterfiles = (int) $srcres->filterfiles;
        // Handouts are reference material — untracked, like the sources.
        $d->completion = COMPLETION_TRACKING_NONE; $d->completionview = 0;
        $d->completionusegrade = 0; $d->completionexpected = 0;

        $mi = add_moduleinfo($d, $course);
        place_after($section0->id, $mi->coursemodule, $prev);
        mtrace("added cmid {$mi->coursemodule} after $prev: $label");
        $prev = (int) $mi->coursemodule;
        $added++;
    }
}

if (!$DRY) {
    rebuild_course_cache($COURSEID, true);
    $section0 = $DB->get_record('course_sections', ['id' => $section0->id]);
    mtrace("done: $added added; section 0 sequence = {$section0->sequence}");
}
