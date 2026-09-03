<?php
// 9-2-26 (Jason): "Download Your Certificate" rows could never tick — every
// customcert module had completion tracking OFF (completion=0), so the player
// had no state to show and the course sat at "2 of 3" forever.
//
// This flips every customcert cm to automatic completion on VIEW (customcert
// issues the certificate on first view, so "viewed" == "issued"), rebuilds the
// course caches, and back-fills a completion row for anyone already issued.
//
// Run on the Moodle box:
//   scp -i C:/Users/Unity/fgi-moodle-key.pem scripts/moodle/certcompletion.php bitnami@98.94.159.62:/tmp/
//   ssh -i C:/Users/Unity/fgi-moodle-key.pem bitnami@98.94.159.62 'sudo -u daemon /opt/bitnami/php/bin/php /tmp/certcompletion.php'
//
// Site side needs no change: the player already treats completion>0 modules
// as tracked, CourseView excludes customcert from the certificate gate, and
// lib/progress.ts excludes customcert from the mirror's tracked list.
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
require_once($CFG->libdir . '/completionlib.php');
global $DB;

$cms = $DB->get_records_sql(
    "SELECT cm.id, cm.course, cm.instance, cm.completion, cm.completionview
       FROM {course_modules} cm
       JOIN {modules} m ON m.id = cm.module
      WHERE m.name = 'customcert'
   ORDER BY cm.course, cm.id");

$changed = 0; $courses = [];
foreach ($cms as $cm) {
    if ($cm->completion == COMPLETION_TRACKING_AUTOMATIC && $cm->completionview == 1) continue;
    $DB->update_record('course_modules', (object) [
        'id' => $cm->id,
        'completion' => COMPLETION_TRACKING_AUTOMATIC,
        'completionview' => 1,
    ]);
    $changed++;
    $courses[$cm->course] = true;
}
echo "customcert cms: " . count($cms) . ", switched to complete-on-view: $changed\n";

foreach (array_keys($courses) as $courseid) {
    rebuild_course_cache($courseid, true);
}
echo "course caches rebuilt: " . count($courses) . "\n";

// Back-fill: anyone already holding an issue has, by definition, viewed it.
$issues = $DB->get_records_sql(
    "SELECT ci.id, ci.userid, cm.id AS cmid, cm.course
       FROM {customcert_issues} ci
       JOIN {customcert} c ON c.id = ci.customcertid
       JOIN {course_modules} cm ON cm.instance = c.id
       JOIN {modules} m ON m.id = cm.module AND m.name = 'customcert'");
foreach ($issues as $i) {
    $course = get_course($i->course);
    $modinfo = get_fast_modinfo($course, $i->userid);
    $cm = $modinfo->get_cm($i->cmid);
    $completion = new completion_info($course);
    $completion->set_module_viewed($cm, $i->userid);
    $data = $completion->get_data($cm, false, $i->userid);
    echo "backfill user {$i->userid} cm {$i->cmid} (course {$i->course}) -> state {$data->completionstate}\n";
}
echo "done\n";
