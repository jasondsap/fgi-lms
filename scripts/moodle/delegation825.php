<?php
// The Secrets to Skilled Delegation (course 118), Jason 8-25:
//  1. add the HBS "How to Delegate Effectively" link as a url module right
//     after the SCORM (cmid 523) — new-window display, no completion, same
//     as the HBR links on course 117;
//  2. replace the course summary with Jason's description.
// Usage: php delegation825.php [--dry]
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/course/modlib.php');
require_once($CFG->libdir . '/resourcelib.php');

$DRY = in_array('--dry', $argv);
$COURSEID = 118;
$AFTER = 523;
$NAME = 'How to Delegate Effectively: 9 Tips for Managers';
$URL = 'https://online.hbs.edu/blog/post/how-to-delegate-effectively';

$admin = get_admin();
\core\session\manager::set_user($admin);
$course = $DB->get_record('course', ['id' => $COURSEID], '*', MUST_EXIST);
$urlmodule = $DB->get_field('modules', 'id', ['name' => 'url'], MUST_EXIST);

if ($DB->record_exists('url', ['course' => $COURSEID, 'name' => $NAME])) {
    mtrace("SKIP link: already exists");
} else if ($DRY) {
    mtrace("DRY: would add url '$NAME' -> $URL after cmid $AFTER (new window, no completion)");
} else {
    $d = new stdClass();
    $d->course = $COURSEID; $d->modulename = 'url'; $d->module = $urlmodule;
    $d->section = 0; $d->visible = 1; $d->visibleoncoursepage = 1; $d->cmidnumber = '';
    $d->groupmode = 0; $d->groupingid = 0;
    $d->name = $NAME; $d->intro = ''; $d->introformat = FORMAT_HTML;
    $d->externalurl = $URL;
    $d->display = RESOURCELIB_DISPLAY_NEW;
    $d->printintro = 0; $d->popupwidth = 620; $d->popupheight = 450;
    $d->parameters = [];
    $d->completion = COMPLETION_TRACKING_NONE; $d->completionview = 0;
    $d->completionusegrade = 0; $d->completionexpected = 0;
    $mi = add_moduleinfo($d, $course);
    $s = $DB->get_record('course_sections', ['course' => $COURSEID, 'section' => 0], '*', MUST_EXIST);
    $seq = array_values(array_filter(array_map('intval', explode(',', $s->sequence))));
    $seq = array_values(array_diff($seq, [$mi->coursemodule]));
    $pos = array_search($AFTER, $seq);
    if ($pos === false) { $seq[] = $mi->coursemodule; } else { array_splice($seq, $pos + 1, 0, [$mi->coursemodule]); }
    $DB->set_field('course_sections', 'sequence', implode(',', $seq), ['id' => $s->id]);
    mtrace("added url cmid {$mi->coursemodule} after $AFTER; sequence " . implode(',', $seq));
}

$summary = '<p>When you think of a leader in the rural recovery housing community, who do you imagine? Chances are, it’s someone who knows the difference between doing and leading. Great leaders strategically guide the team’s work—they don’t do the team’s work. That’s where delegation comes in. Delegation is assigning responsibility for specific activities to others. In this course, you’ll learn why you should delegate, how to do it, how to select the right people for the job, and how to get out of the way so they can complete their assignments.</p>';
if ($DRY) { mtrace('DRY: would set course summary'); }
else {
    $DB->set_field('course', 'summary', $summary, ['id' => $COURSEID]);
    $DB->set_field('course', 'summaryformat', FORMAT_HTML, ['id' => $COURSEID]);
    rebuild_course_cache($COURSEID, true);
    purge_all_caches();
    mtrace('summary updated');
}
mtrace($DRY ? 'DRY RUN complete.' : 'Done.');
