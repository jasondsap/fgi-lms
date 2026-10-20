<?php
/**
 * Let learners retake SCORM quizzes: set "Force new attempt" to
 * "When previous attempt completed, passed or failed" (1) on every SCORM
 * module that still has it at "No" (0), and make that the site default.
 *
 * Why: our SCORM modules skip the entry page (skipview=Always) and resume the
 * last attempt, so a learner who failed the embedded quiz re-opens the course
 * straight onto the failed result screen with no way to start over
 * (ticket from Matthew Minton, 10-20-26, "Pregnant and Parenting..." cm 38).
 * Moodle already allows unlimited attempts; this makes a fresh attempt start
 * automatically once the previous one is completed/passed/failed. In-progress
 * (incomplete) attempts still resume, so nobody loses a half-watched course.
 *
 * Usage (on the Moodle box):
 *   sudo -u daemon /opt/bitnami/php/bin/php /tmp/scorm-forcenewattempt.php          # dry run
 *   sudo -u daemon /opt/bitnami/php/bin/php /tmp/scorm-forcenewattempt.php --apply
 */
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');

$apply = in_array('--apply', $argv ?? [], true);

$rs = $DB->get_records_sql("
    SELECT s.id, s.course, c.shortname, s.name, s.maxattempt, s.forcenewattempt,
           s.lastattemptlock, s.skipview, cm.id AS cmid
      FROM {scorm} s
      JOIN {course} c ON c.id = s.course
      JOIN {course_modules} cm ON cm.instance = s.id
       AND cm.module = (SELECT id FROM {modules} WHERE name = 'scorm')
  ORDER BY s.course");

$todo = [];
foreach ($rs as $r) {
    $flag = ($r->forcenewattempt == 0) ? 'FIX' : 'ok ';
    printf("%s scorm%-4d cm%-4d c%-4d max=%d force=%d lock=%d skip=%d  %s\n",
        $flag, $r->id, $r->cmid, $r->course, $r->maxattempt, $r->forcenewattempt,
        $r->lastattemptlock, $r->skipview, substr($r->name, 0, 60));
    if ($r->forcenewattempt == 0) $todo[] = $r->id;
}
echo count($rs) . " SCORM modules, " . count($todo) . " to fix.\n";
echo "site default scorm/forcenewattempt = " . get_config('scorm', 'forcenewattempt') . "\n";

if (!$apply) { echo "Dry run. Re-run with --apply to change.\n"; exit; }

foreach ($todo as $id) {
    $DB->set_field('scorm', 'forcenewattempt', 1, ['id' => $id]);
    $DB->set_field('scorm', 'timemodified', time(), ['id' => $id]);
}
set_config('forcenewattempt', 1, 'scorm');
echo "Applied: " . count($todo) . " modules set to forcenewattempt=1; site default set to 1.\n";
