<?php
/**
 * Required-vs-optional activity report for every visible course (Jennifer,
 * burn-down 9-28 rows 7 and 10: "I can't tell what is required and what is
 * optional in the LMS courses" / "does not count PDF in course completion").
 *
 * READ-ONLY. Prints one CSV row per activity: course id, course name, section,
 * module type, activity name, whether it counts toward course completion
 * (criteria row exists), its completion mode (none / manual / automatic), and
 * the course-level aggregation (all / any). Pipe to a file and open in Excel.
 *
 * On the box:
 *   scp -i C:/Users/Unity/fgi-moodle-key.pem scripts/moodle/completion-report.php bitnami@98.94.159.62:/tmp/
 *   ssh -i C:/Users/Unity/fgi-moodle-key.pem bitnami@98.94.159.62 'sudo -u daemon /opt/bitnami/php/bin/php /tmp/completion-report.php' > docs/moodle-completion-report.csv
 */
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
require_once($CFG->libdir . '/completionlib.php');
require_once($CFG->dirroot . '/course/lib.php');

$out = fopen('php://stdout', 'w');
fputcsv($out, ['course_id', 'course', 'completion_enabled', 'aggregation', 'section', 'module', 'activity',
    'visible', 'completion_mode', 'required_for_course_completion', 'cmid']);

$courses = $DB->get_records_select('course', 'id > 1 AND visible = 1', [], 'fullname');
foreach ($courses as $course) {
    $info = new completion_info($course);
    $enabled = $info->is_enabled() ? 'yes' : 'no';
    // Course-level aggregation for the "activity completion" criteria type.
    $agg = $DB->get_field('course_completion_aggr_methd', 'method',
        ['course' => $course->id, 'criteriatype' => COMPLETION_CRITERIA_TYPE_ACTIVITY]);
    $aggLabel = $agg === null ? '' : ((int)$agg === COMPLETION_AGGREGATION_ANY ? 'any' : 'all');
    $required = $DB->get_fieldset_select('course_completion_criteria', 'moduleinstance',
        'course = ? AND criteriatype = ?', [$course->id, COMPLETION_CRITERIA_TYPE_ACTIVITY]);
    $required = array_map('intval', $required);

    $modinfo = get_fast_modinfo($course);
    foreach ($modinfo->get_section_info_all() as $section) {
        $sectionName = get_section_name($course, $section);
        foreach ($modinfo->sections[$section->section] ?? [] as $cmid) {
            $cm = $modinfo->get_cm($cmid);
            $mode = ['none', 'manual', 'automatic'][(int)$cm->completion] ?? (string)$cm->completion;
            fputcsv($out, [
                $course->id, $course->fullname, $enabled, $aggLabel, $sectionName, $cm->modname, $cm->name,
                $cm->visible ? 'yes' : 'no', $mode, in_array((int)$cmid, $required, true) ? 'yes' : 'no', $cmid,
            ]);
        }
    }
}
fclose($out);
