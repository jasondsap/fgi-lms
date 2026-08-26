<?php
// Switch the seven video Pages in each pre-certification course from
// automatic (on-view) completion to MANUAL, which is what opts them into
// local_fgiembed's watch gate (completed by script at 90% watched).
// Existing completion rows are left alone. Usage: php watchgate825.php [--dry]
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
require_once($CFG->dirroot . '/course/lib.php');

$DRY = in_array('--dry', $argv);
$COURSES = [127 => 'scarr-pre-certification-requirements', 133 => 'co-pre-certification-requirements'];

foreach ($COURSES as $courseid => $short) {
    $c = $DB->get_record('course', ['id' => $courseid, 'shortname' => $short], '*', MUST_EXIST);
    mtrace("course {$c->id} {$c->shortname}");
    foreach (get_fast_modinfo($courseid)->get_cms() as $cm) {
        if ($cm->modname !== 'page') { continue; }
        $p = $DB->get_record('page', ['id' => $cm->instance], 'id, content', MUST_EXIST);
        if (strpos($p->content, 'player.vimeo.com') === false) { mtrace("  skip (no vimeo): cmid {$cm->id} {$cm->name}"); continue; }
        if ((int)$cm->completion === COMPLETION_TRACKING_MANUAL) { mtrace("  already manual: cmid {$cm->id} {$cm->name}"); continue; }
        $who = $DB->get_fieldset_sql("SELECT u.username FROM {course_modules_completion} cmc JOIN {user} u ON u.id = cmc.userid WHERE cmc.coursemoduleid = ? AND cmc.completionstate > 0", [$cm->id]);
        $done = $who ? ' (already completed by: ' . implode(', ', $who) . ')' : '';
        if ($DRY) { mtrace("  DRY would set manual: cmid {$cm->id} {$cm->name}$done"); continue; }
        $DB->set_field('course_modules', 'completion', COMPLETION_TRACKING_MANUAL, ['id' => $cm->id]);
        $DB->set_field('course_modules', 'completionview', 0, ['id' => $cm->id]);
        mtrace("  manual: cmid {$cm->id} {$cm->name}$done");
    }
    if (!$DRY) { rebuild_course_cache($courseid, true); }
}
if (!$DRY) { purge_all_caches(); }
mtrace($DRY ? 'DRY RUN complete.' : 'Done.');
