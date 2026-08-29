<?php
// Post-fix after augment_course.php adds a quiz to a course: pass mark 80% ->
// 70% of the quiz grade (gradepass is absolute, §6ab) and order the section-0
// sequence page/resource → qbank → quiz → feedback → certificate so the
// player groups the quiz under Evaluation. Generalised from post100.php.
// Usage: sudo -u daemon php postquiz.php <courseid> [--dry]
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
require_once($CFG->dirroot . '/course/lib.php');

$COURSEID = (int) ($argv[1] ?? 0);
if (!$COURSEID) { cli_error('usage: postquiz.php <courseid> [--dry]'); }
$DRY = in_array('--dry', $argv);

$quizzes = $DB->get_records('quiz', ['course' => $COURSEID]);
if (count($quizzes) !== 1) { cli_error('expected exactly one quiz in course ' . $COURSEID . ', found ' . count($quizzes)); }
$quiz = reset($quizzes);
$gi = $DB->get_record('grade_items', [
    'itemtype' => 'mod', 'itemmodule' => 'quiz', 'iteminstance' => $quiz->id, 'courseid' => $COURSEID,
], '*', MUST_EXIST);
$pass = round($quiz->grade * 0.7, 2);
mtrace("quiz {$quiz->id} '{$quiz->name}': grade {$quiz->grade}, sumgrades {$quiz->sumgrades}, gradepass {$gi->gradepass} -> $pass");
mtrace('slots: ' . $DB->count_records('quiz_slots', ['quizid' => $quiz->id]));

$s0 = $DB->get_record('course_sections', ['course' => $COURSEID, 'section' => 0], '*', MUST_EXIST);
$seq = array_values(array_filter(array_map('intval', explode(',', $s0->sequence))));
$cms = $DB->get_records_list('course_modules', 'id', $seq, '', 'id, module');
$modnames = [];
foreach ($DB->get_records('modules') as $m) { $modnames[$m->id] = $m->name; }
$by = [];
foreach ($seq as $cmid) { $by[$modnames[$cms[$cmid]->module]][] = $cmid; }
$order = array_merge(
    $by['forum'] ?? [], $by['page'] ?? [], $by['scorm'] ?? [], $by['resource'] ?? [], $by['url'] ?? [],
    $by['qbank'] ?? [], $by['quiz'] ?? [], $by['feedback'] ?? [], $by['customcert'] ?? []);
$order = array_merge($order, array_values(array_diff($seq, $order)));
mtrace('sequence: ' . implode(',', $seq) . ' -> ' . implode(',', $order));

if ($DRY) { mtrace('DRY: no changes'); exit(0); }
$gi->gradepass = $pass;
$DB->update_record('grade_items', $gi);
$DB->set_field('course_sections', 'sequence', implode(',', $order), ['id' => $s0->id]);
rebuild_course_cache($COURSEID, true);
mtrace('done');
