<?php
// Add a gated Completion Certificate (customcert) to courses. Pilot: the two
// pre-certification courses. Brand comes from the site template named in the
// manifest below. The cert is availability-restricted on completion of every
// content activity in the course (pages, resources, scorms, quizzes,
// feedback — not forums), making "complete every item" real.
// Idempotent: a course that already has a customcert is skipped.
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/course/modlib.php');

$TARGETS = [
    127 => 'SCARR Certificate',
    133 => 'ORH-CO Certificate',
];

$admin = get_admin();
\core\session\manager::set_user($admin);

foreach ($TARGETS as $courseid => $templatename) {
    $course = $DB->get_record('course', ['id' => $courseid], '*', MUST_EXIST);
    if ($DB->record_exists_sql(
        "SELECT 1 FROM {course_modules} cm JOIN {modules} m ON m.id = cm.module
          WHERE cm.course = ? AND m.name = 'customcert'", [$courseid])) {
        mtrace("SKIP (has customcert): {$course->shortname}");
        continue;
    }
    $sitetemplate = $DB->get_record('customcert_templates', ['name' => $templatename], '*', MUST_EXIST);

    // Every completion-tracked content activity gates the certificate.
    $gates = $DB->get_records_sql(
        "SELECT cm.id FROM {course_modules} cm JOIN {modules} m ON m.id = cm.module
          WHERE cm.course = ? AND m.name <> 'forum' AND cm.completion > 0
          ORDER BY cm.id", [$courseid]);
    $conds = [];
    $showc = [];
    foreach ($gates as $g) {
        $conds[] = ['type' => 'completion', 'cm' => (int) $g->id, 'e' => 1];
        $showc[] = true;
    }

    $d = new stdClass();
    $d->course = $courseid;
    $d->modulename = 'customcert';
    $d->module = $DB->get_field('modules', 'id', ['name' => 'customcert'], MUST_EXIST);
    $d->section = 0;
    $d->visible = 1;
    $d->visibleoncoursepage = 1;
    $d->cmidnumber = '';
    $d->groupmode = 0;
    $d->groupingid = 0;
    $d->name = 'Download Your Certificate';
    $d->intro = '';
    $d->introformat = FORMAT_HTML;
    $d->requiredtime = 0;
    $d->verifyany = 0;
    $d->deliveryoption = 'I';
    $d->usecustomfilename = 0;
    $d->customfilenamepattern = '';
    $d->emailstudents = 0;
    $d->emailteachers = 0;
    $d->emailothers = '';
    $d->protection_print = 0;
    $d->protection_modify = 0;
    $d->protection_copy = 0;
    $d->language = '';
    $d->completion = COMPLETION_TRACKING_NONE;
    $d->completionexpected = 0;
    $mi = add_moduleinfo($d, $course);
    mtrace("{$course->shortname}: customcert cmid {$mi->coursemodule} (instance {$mi->instance})");

    // Load the brand template into the module's own template, then drop the
    // blank page add_instance created (copy_to_template adds the real one).
    $cert = $DB->get_record('customcert', ['id' => $mi->instance], '*', MUST_EXIST);
    $modtemplaterec = $DB->get_record('customcert_templates', ['id' => $cert->templateid], '*', MUST_EXIST);
    $modtemplate = new \mod_customcert\template($modtemplaterec);
    $site = new \mod_customcert\template($sitetemplate);
    $site->copy_to_template($modtemplate);
    $pages = $DB->get_records('customcert_pages', ['templateid' => $cert->templateid], 'id');
    foreach ($pages as $p) {
        if (!$DB->record_exists('customcert_elements', ['pageid' => $p->id])) {
            $DB->delete_records('customcert_pages', ['id' => $p->id]);
            mtrace("   dropped blank page {$p->id}");
        }
    }

    // Gate on everything.
    $availability = json_encode(['op' => '&', 'c' => $conds, 'showc' => $showc]);
    $DB->set_field('course_modules', 'availability', $availability, ['id' => $mi->coursemodule]);
    mtrace('   gated on ' . count($conds) . ' activities');

    rebuild_course_cache($courseid, true);
}
purge_all_caches();
mtrace('Done.');
