<?php
// Grant additional web-service functions to the "FGI Front-End API" external
// service (shortname fgi_frontend) — idempotent. Added 8-29-26 for the My
// Learning page: quiz scores come from gradereport_user_get_grade_items.
//
// Run on the Moodle box:
//   sudo -u daemon /opt/bitnami/php/bin/php /tmp/grantws.php          # dry run
//   sudo -u daemon /opt/bitnami/php/bin/php /tmp/grantws.php --apply  # write
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');

$FUNCTIONS = [
    'gradereport_user_get_grade_items',   // per-learner grade items (quiz best grade)
];

$apply = in_array('--apply', $argv, true);
$service = $DB->get_record('external_services', ['shortname' => 'fgi_frontend'], '*', MUST_EXIST);

foreach ($FUNCTIONS as $fn) {
    if (!$DB->record_exists('external_functions', ['name' => $fn])) {
        mtrace("MISSING in this Moodle: $fn");
        continue;
    }
    if ($DB->record_exists('external_services_functions',
            ['externalserviceid' => $service->id, 'functionname' => $fn])) {
        mtrace("already granted: $fn");
        continue;
    }
    if ($apply) {
        $DB->insert_record('external_services_functions',
            (object) ['externalserviceid' => $service->id, 'functionname' => $fn]);
        mtrace("GRANTED: $fn");
    } else {
        mtrace("would grant: $fn  (re-run with --apply)");
    }
}
