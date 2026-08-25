<?php
// Batch fix (8-23): every singleactivity course whose extra modules (the
// Course Evaluation, mainly) were swept into the hidden orphaned section.
// For each: switch format -> topics (the sweep lives in the format), move the
// orphaned modules into section 0 after the existing ones, unhide them.
//
// Skips: course 9 (carr-standards, admin-only). Course 19 already fixed.
// 8-24: course 17 (hipaa-42-cfr) REMOVED from the skip list — it had been
// skipped as "hidden on Jennifer's 8-22 instruction" but no such instruction
// exists; it is a normal published fgi+colorado course and Jason reported
// its eval missing.
//
//   sudo -u daemon php /tmp/fixsweep.php --dry     # report only
//   sudo -u daemon php /tmp/fixsweep.php           # apply
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->libdir . '/completionlib.php');

$dry = in_array('--dry', $argv);
$SKIP = [9];

$admin = get_admin();
\core\session\manager::set_user($admin);

$courses = $DB->get_records('course', ['format' => 'singleactivity'], 'id');
$fixed = 0;
foreach ($courses as $course) {
    if (in_array($course->id, $SKIP)) {
        mtrace("SKIP (deliberate): {$course->id} {$course->shortname}");
        continue;
    }
    // Modules sitting in hidden sections (the orphaned sweep target).
    $sql = "SELECT cm.id, m.name AS modtype, cm.visible
              FROM {course_modules} cm
              JOIN {modules} m ON m.id = cm.module
              JOIN {course_sections} cs ON cs.id = cm.section
             WHERE cm.course = ? AND cs.visible = 0 AND cm.deletioninprogress = 0
             ORDER BY cm.id";
    $orphans = $DB->get_records_sql($sql, [$course->id]);
    $orphans = array_filter($orphans, fn($o) => $o->modtype !== 'forum');
    if (!$orphans) {
        mtrace("OK (nothing orphaned): {$course->id} {$course->shortname}");
        continue;
    }

    $names = [];
    foreach ($orphans as $o) {
        $inst = $DB->get_record('course_modules', ['id' => $o->id]);
        $r = $DB->get_record($o->modtype, ['id' => $inst->instance], 'id,name');
        $names[] = "{$o->modtype}:" . ($r ? $r->name : '?') . " (cmid {$o->id})";
    }
    mtrace(($dry ? 'WOULD FIX' : 'FIX') . ": {$course->id} {$course->shortname} -> " . implode(', ', $names));
    if ($dry) { $fixed++; continue; }

    // 1. Format switch kills the sweep.
    $c = $DB->get_record('course', ['id' => $course->id], '*', MUST_EXIST);
    $c->format = 'topics';
    update_course($c);

    // 2. Move each orphan into section 0 (appends after existing modules), unhide.
    $section0 = $DB->get_record('course_sections',
        ['course' => $course->id, 'section' => 0], '*', MUST_EXIST);
    foreach ($orphans as $o) {
        $cm = get_coursemodule_from_id('', $o->id, $course->id, false, MUST_EXIST);
        if ($cm->section != $section0->id) {
            moveto_module($cm, $section0);
        }
        set_coursemodule_visible($o->id, 1);
    }

    rebuild_course_cache($course->id, true);
    $fixed++;
}

if (!$dry) purge_all_caches();
mtrace('');
mtrace(($dry ? 'Would fix ' : 'Fixed ') . $fixed . ' course(s).');
