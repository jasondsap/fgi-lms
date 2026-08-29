<?php
// Course 100 (PPW webinar) quiz post-fix, same as every augment: pass mark
// 80% -> 70% of the quiz's grade (gradepass is absolute, §6ab), and put the
// qbank + quiz before the Course Evaluation so the player groups them.
// Usage: sudo -u daemon php post100.php [--dry]
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
require_once($CFG->dirroot . '/course/lib.php');

$DRY = in_array('--dry', $argv);
$COURSEID = 100;

$quiz = $DB->get_record('quiz', ['course' => $COURSEID], '*', MUST_EXIST);
$gi = $DB->get_record('grade_items', [
    'itemtype' => 'mod', 'itemmodule' => 'quiz', 'iteminstance' => $quiz->id, 'courseid' => $COURSEID,
], '*', MUST_EXIST);
$pass = round($quiz->grade * 0.7, 2);
mtrace("quiz {$quiz->id} '{$quiz->name}': grade {$quiz->grade}, sumgrades {$quiz->sumgrades}, gradepass {$gi->gradepass} -> $pass");
$slots = $DB->count_records('quiz_slots', ['quizid' => $quiz->id]);
mtrace("slots: $slots");

$s0 = $DB->get_record('course_sections', ['course' => $COURSEID, 'section' => 0], '*', MUST_EXIST);
$seq = array_values(array_filter(array_map('intval', explode(',', $s0->sequence))));
$cms = $DB->get_records_list('course_modules', 'id', $seq, '', 'id, module');
$modnames = [];
foreach ($DB->get_records('modules') as $m) { $modnames[$m->id] = $m->name; }
$by = [];
foreach ($seq as $cmid) { $by[$modnames[$cms[$cmid]->module]][] = $cmid; }
$order = array_merge(
    $by['forum'] ?? [], $by['page'] ?? [], $by['resource'] ?? [], $by['url'] ?? [],
    $by['qbank'] ?? [], $by['quiz'] ?? [], $by['feedback'] ?? [], $by['customcert'] ?? []);
$rest = array_values(array_diff($seq, $order));
$order = array_merge($order, $rest);
mtrace('sequence: ' . implode(',', $seq) . ' -> ' . implode(',', $order));

if ($DRY) { mtrace('DRY: no changes'); exit(0); }
$gi->gradepass = $pass;
$DB->update_record('grade_items', $gi);
$DB->set_field('course_sections', 'sequence', implode(',', $order), ['id' => $s0->id]);
rebuild_course_cache($COURSEID, true);
mtrace('done');
