<?php
// One-off (9-2-26): re-run the site-evaluation completion override for the
// three evaluations submitted while local_fgiembed_mark_complete was broken
// (missing `global $CFG` in execute() — see docs/CLAUDE.md §6ds follow-up).
//
// Run on the Moodle box AFTER the plugin fix + purge_caches:
//   sudo -u daemon /opt/bitnami/php/bin/php /tmp/remark-evals.php
//
// Runs as the site admin (user 2, the fgi_frontend token user) so the
// override is recorded exactly as the web-service path would record it.
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
global $DB;

\core\session\manager::set_user($DB->get_record('user', ['id' => 2], '*', MUST_EXIST));

// [cmid of the feedback module, Moodle user id]
$pairs = [
    [335, 2],   // Jason,     course 24  Peer Support and Supervisor Boundaries
    [736, 2],   // Jason,     course 139 Project Best Practices
    [335, 12],  // Catherine, course 24
];

foreach ($pairs as [$cmid, $userid]) {
    try {
        $r = \local_fgiembed\external\mark_complete::execute($cmid, $userid);
        echo "cm $cmid user $userid -> state {$r['state']}\n";
    } catch (Throwable $e) {
        echo "cm $cmid user $userid -> FAILED " . get_class($e) . ': ' . $e->getMessage() . "\n";
    }
}

// Certificates are availability-gated on completion; report what unlocked.
foreach ([[823, 2, 24], [823, 12, 24]] as [$certcmid, $userid, $courseid]) {
    $cm = $DB->get_record('course_modules', ['id' => $certcmid]);
    $issued = $DB->count_records('customcert_issues', ['customcertid' => $cm->instance, 'userid' => $userid]);
    $done = $DB->get_records_sql(
        "SELECT coursemoduleid, completionstate FROM {course_modules_completion} WHERE userid = ? AND coursemoduleid IN (35, 335)",
        [$userid]);
    $states = [];
    foreach ($done as $d) $states[] = "cm{$d->coursemoduleid}={$d->completionstate}";
    echo "course $courseid user $userid: " . implode(' ', $states) . " | cert issues so far: $issued (issues on first open of the certificate page)\n";
}
