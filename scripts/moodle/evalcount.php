<?php
// READ-ONLY: how many mod_feedback responses exist, by whom and when.
// Run on the box: sudo -u daemon /opt/bitnami/php/bin/php /tmp/evalcount.php
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
$rows = $DB->get_records_sql("
    SELECT fc.id, fc.userid, fc.timemodified, fc.anonymous_response, f.course, f.name,
           u.email, (SELECT COUNT(*) FROM {feedback_value} v WHERE v.completed = fc.id) AS answers
      FROM {feedback_completed} fc
      JOIN {feedback} f ON f.id = fc.feedback
      JOIN {user} u ON u.id = fc.userid
  ORDER BY fc.timemodified");
echo "total completed: " . count($rows) . "\n";
foreach ($rows as $r) {
    // Domain only — this is a count, not an export.
    $dom = substr(strrchr($r->email, '@'), 1);
    echo date('Y-m-d', $r->timemodified) . " course={$r->course} user={$r->userid} @{$dom} anon={$r->anonymous_response} answers={$r->answers}\n";
}
echo "in-progress (completedtmp): " . $DB->count_records('feedback_completedtmp') . "\n";
