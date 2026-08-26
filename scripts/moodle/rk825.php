<?php
// Recovery Kentucky standalone (course 107) + Intro to Recovery Housing
// bundle (course 90), Jason 8-25:
//  1. attach "2024 Recovery Center Outcome Study" PDF as an EMBED handout
//     right after the RK video page in 107 (cmid 479) AND after the intro
//     video page in 90 (cmid 246);
//  2. replace course 107's summary with Jason's description;
//  3. order 107 as page → RCOS → qbank → quiz → evaluation, and set the
//     new quiz's grade-to-pass to 70 (augment_course.php defaults to 80).
// Usage: php rk825.php [--dry]
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/course/modlib.php');
require_once($CFG->libdir . '/filelib.php');
require_once($CFG->libdir . '/resourcelib.php');

$DRY = in_array('--dry', $argv);
$PDF = '/tmp/fgi825/rcos-2024-findings-at-a-glance.pdf';
$NAME = '2024 Recovery Center Outcome Study (RCOS 10-Year Trend Findings at a Glance)';
$TARGETS = [107 => 479, 90 => 246];   // course => anchor cmid (video page)

if (!file_exists($PDF)) { mtrace("ABORT: $PDF missing"); exit(1); }
$admin = get_admin();
\core\session\manager::set_user($admin);
$fs = get_file_storage();
$usercontext = context_user::instance($admin->id);
$resmodule = $DB->get_field('modules', 'id', ['name' => 'resource'], MUST_EXIST);

function seq_of(int $courseid): array {
    global $DB;
    $s = $DB->get_record('course_sections', ['course' => $courseid, 'section' => 0], '*', MUST_EXIST);
    return [$s, array_values(array_filter(array_map('intval', explode(',', $s->sequence))))];
}
function place_after(int $courseid, int $newcmid, int $anchor): void {
    global $DB;
    [$s, $seq] = seq_of($courseid);
    $seq = array_values(array_diff($seq, [$newcmid]));
    $pos = array_search($anchor, $seq);
    if ($pos === false) { $seq[] = $newcmid; } else { array_splice($seq, $pos + 1, 0, [$newcmid]); }
    $DB->set_field('course_sections', 'sequence', implode(',', $seq), ['id' => $s->id]);
}

// ---- 1. RCOS handout in both courses -------------------------------------
foreach ($TARGETS as $courseid => $anchor) {
    $course = $DB->get_record('course', ['id' => $courseid], '*', MUST_EXIST);
    $exists = $DB->record_exists_select('course_modules',
        'course = ? AND module = ? AND deletioninprogress = 0 AND instance IN (SELECT id FROM {resource} WHERE course = ? AND name = ?)',
        [$courseid, $resmodule, $courseid, $NAME]);
    if ($exists) { mtrace("course $courseid: SKIP handout (exists)"); continue; }
    if ($DRY) { mtrace("course $courseid: DRY would add '$NAME' after cmid $anchor"); continue; }
    $draftid = file_get_unused_draft_itemid();
    $fs->create_file_from_pathname([
        'contextid' => $usercontext->id, 'component' => 'user', 'filearea' => 'draft',
        'itemid' => $draftid, 'filepath' => '/', 'filename' => 'RCOS-2024-Outcomes-and-Trends-Findings-at-a-Glance.pdf',
    ], $PDF);
    $d = new stdClass();
    $d->course = $courseid; $d->modulename = 'resource'; $d->module = $resmodule;
    $d->section = 0; $d->visible = 1; $d->visibleoncoursepage = 1; $d->cmidnumber = '';
    $d->groupmode = 0; $d->groupingid = 0;
    $d->name = $NAME; $d->intro = ''; $d->introformat = FORMAT_HTML;
    $d->files = $draftid;
    $d->display = RESOURCELIB_DISPLAY_EMBED;
    $d->printintro = 0; $d->showsize = 1; $d->showtype = 1; $d->showdate = 0;
    $d->filterfiles = 0; $d->popupwidth = 620; $d->popupheight = 450;
    $d->completion = COMPLETION_TRACKING_NONE; $d->completionview = 0;
    $d->completionusegrade = 0; $d->completionexpected = 0;
    $mi = add_moduleinfo($d, $course);
    place_after($courseid, $mi->coursemodule, $anchor);
    mtrace("course $courseid: handout cmid {$mi->coursemodule} after $anchor");
}

// ---- 2. course 107 summary ------------------------------------------------
$summary = '<p>This course provides a high-level overview of Recovery Kentucky’s peer-led social model. The 17 Recovery Kentucky centers located across the state were modeled after The Healing Place in Louisville and developed throughout the 2000s. For more than 15 years, third-party, evidence-based outcome studies have demonstrated the positive impact of combining long-term recovery education with stable housing to support sustained recovery while benefiting individuals and their communities.</p>';
if ($DRY) { mtrace('DRY: would set course 107 summary'); }
else {
    $DB->set_field('course', 'summary', $summary, ['id' => 107]);
    $DB->set_field('course', 'summaryformat', FORMAT_HTML, ['id' => 107]);
    mtrace('course 107 summary updated');
}

// ---- 3. order + gradepass in 107 -------------------------------------------
$modinfo = get_fast_modinfo(107);
$by = [];
foreach ($modinfo->get_cms() as $cm) { $by[$cm->modname][] = $cm->id; }
$order = array_merge($by['forum'] ?? [], $by['page'] ?? [], $by['resource'] ?? [], $by['qbank'] ?? [], $by['quiz'] ?? [], $by['feedback'] ?? []);
[$s, $seq] = seq_of(107);
$missing = array_diff($seq, $order);
if ($missing) { mtrace('ABORT: unplaced cmids ' . implode(',', $missing)); exit(1); }
if ($DRY) { mtrace('DRY: would set 107 sequence to ' . implode(',', $order)); }
else { $DB->set_field('course_sections', 'sequence', implode(',', $order), ['id' => $s->id]); mtrace('course 107 sequence: ' . implode(',', $order)); }

foreach ($by['quiz'] ?? [] as $qcmid) {
    $cm = get_coursemodule_from_id('quiz', $qcmid, 0, false, MUST_EXIST);
    $gi = $DB->get_record('grade_items', ['itemtype' => 'mod', 'itemmodule' => 'quiz', 'iteminstance' => $cm->instance, 'courseid' => 107]);
    if ($gi && (float)$gi->gradepass !== 70.0) {
        if ($DRY) { mtrace("DRY: would set quiz cmid $qcmid gradepass {$gi->gradepass} -> 70"); }
        else { $gi->gradepass = 70; $DB->update_record('grade_items', $gi); mtrace("quiz cmid $qcmid gradepass -> 70"); }
    }
}

if (!$DRY) { rebuild_course_cache(107, true); rebuild_course_cache(90, true); purge_all_caches(); }
mtrace($DRY ? 'DRY RUN complete.' : 'Done.');
