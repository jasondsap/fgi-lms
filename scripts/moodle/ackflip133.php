<?php
// Colorado Pre-Certification Requirements (course 133): turn the "Colorado
// Certification Prerequisites" quiz (cm 804) into the marker activity behind
// the site's Certification Prerequisite Acknowledgment (10-18-26, Gino's
// ticket + Jennifer's 10-15 rewrite). The learner agrees on the FGI site; the
// site then calls local_fgiembed_mark_complete, which can only override to
// COMPLETE (1) — never COMPLETE_PASS (2). So:
//
//   1. cm 804 completion: automatic-on-pass-grade  ->  manual
//      (existing rows keep their state; prior passers stay state 2)
//   2. certificate cm 689 availability: {cm:804, e:2}  ->  {cm:804, e:1}
//      (e=1 "must be complete" also accepts COMPLETE_PASS, so nobody who
//      already passed loses the certificate — zero migration)
//   3. local_fgiembed | ack_cmids = 804  (the plugin's allow-list)
//   4. rename the activity + intro to Jennifer's wording, in case Moodle's
//      page is ever seen directly
//
// Idempotent. Usage (on the box):
//   sudo -u daemon /opt/bitnami/php/bin/php /tmp/ackflip133.php --dry
//   sudo -u daemon /opt/bitnami/php/bin/php /tmp/ackflip133.php
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->libdir . '/completionlib.php');

$COURSEID = 133;
$ACK_CMID = 804;
$CERT_CMID = 689;
$NAME = 'Certification Prerequisite Acknowledgment';
$INTRO = '<p>Before applying for recovery residence certification, please review the following four statements and indicate whether you agree with each one.</p>'
       . '<p>You must agree to all four statements to receive your Certificate of Completion (COC) and proceed with the certification process. Save your COC. You will need it to access the certification portal.</p>';
$DRY = in_array('--dry', $argv);

$cm = $DB->get_record('course_modules', ['id' => $ACK_CMID, 'course' => $COURSEID], '*', MUST_EXIST);
$modname = $DB->get_field('modules', 'name', ['id' => $cm->module]);
if ($modname !== 'quiz') { cli_error("cm $ACK_CMID is a $modname, expected quiz"); }
$quiz = $DB->get_record('quiz', ['id' => $cm->instance], '*', MUST_EXIST);
$cert = $DB->get_record('course_modules', ['id' => $CERT_CMID, 'course' => $COURSEID], '*', MUST_EXIST);

mtrace("quiz {$quiz->id} '{$quiz->name}' cm {$cm->id}: completion={$cm->completion} passgrade={$cm->completionpassgrade} gradeitemnumber=" . var_export($cm->completiongradeitemnumber, true));

// --- 1. completion -> manual ------------------------------------------------
$states = $DB->get_records_sql(
    "SELECT completionstate, COUNT(*) n FROM {course_modules_completion} WHERE coursemoduleid = ? GROUP BY completionstate",
    [$ACK_CMID]);
foreach ($states as $s) { mtrace("  existing completion rows: state {$s->completionstate} x {$s->n}"); }
$needcompletion = (int) $cm->completion !== COMPLETION_TRACKING_MANUAL
    || (int) $cm->completionpassgrade !== 0 || $cm->completiongradeitemnumber !== null;
mtrace($needcompletion ? '  -> set completion=1 (manual), passgrade=0, gradeitemnumber=NULL' : '  completion already manual');

// --- 2. certificate gate e:2 -> e:1 ------------------------------------------
$avail = json_decode($cert->availability ?? '', true);
if (!$avail || empty($avail['c'])) { cli_error("cert cm $CERT_CMID has no availability tree"); }
$changed = 0;
$found = 0;
$walk = function (&$node) use (&$walk, &$changed, &$found, $ACK_CMID) {
    if (isset($node['c']) && is_array($node['c'])) {
        foreach ($node['c'] as &$child) { $walk($child); }
        unset($child);
        return;
    }
    if (($node['type'] ?? '') === 'completion' && (int) ($node['cm'] ?? 0) === $ACK_CMID) {
        $found++;
        if ((int) ($node['e'] ?? 0) !== COMPLETION_COMPLETE) { $node['e'] = COMPLETION_COMPLETE; $changed++; }
        $node['cm'] = (int) $node['cm'];
    }
};
$walk($avail);
mtrace("cert gate: " . count($avail['c']) . " top-level conditions, cm $ACK_CMID found $found time(s), $changed to change");
if ($found === 0) { cli_error("cert gate does not reference cm $ACK_CMID — check the course"); }

// --- 3. plugin allow-list -----------------------------------------------------
$current = (string) get_config('local_fgiembed', 'ack_cmids');
$list = array_values(array_filter(array_map('intval', preg_split('/[\s,]+/', $current))));
$needcfg = !in_array($ACK_CMID, $list, true);
$newlist = $needcfg ? array_merge($list, [$ACK_CMID]) : $list;
mtrace("local_fgiembed ack_cmids: '" . $current . "'" . ($needcfg ? " -> '" . implode(',', $newlist) . "'" : ' (already set)'));

// --- 4. wording ---------------------------------------------------------------
$needname = $quiz->name !== $NAME || trim($quiz->intro) !== $INTRO;
mtrace($needname ? "rename: '{$quiz->name}' -> '$NAME' + intro" : 'name/intro already current');

if ($DRY) { mtrace('DRY: no changes'); exit(0); }

$tx = $DB->start_delegated_transaction();
if ($needcompletion) {
    $DB->set_field('course_modules', 'completion', COMPLETION_TRACKING_MANUAL, ['id' => $ACK_CMID]);
    $DB->set_field('course_modules', 'completionpassgrade', 0, ['id' => $ACK_CMID]);
    $DB->set_field('course_modules', 'completiongradeitemnumber', null, ['id' => $ACK_CMID]);
    $DB->set_field('course_modules', 'completionview', 0, ['id' => $ACK_CMID]);
}
if ($changed) {
    $DB->set_field('course_modules', 'availability', json_encode($avail), ['id' => $CERT_CMID]);
}
if ($needname) {
    $quiz->name = $NAME;
    $quiz->intro = $INTRO;
    $quiz->introformat = FORMAT_HTML;
    $quiz->timemodified = time();
    $DB->update_record('quiz', $quiz);
    // Keep the grade item's name in step (My Learning reads it).
    $DB->set_field('grade_items', 'itemname', $NAME,
        ['itemtype' => 'mod', 'itemmodule' => 'quiz', 'iteminstance' => $quiz->id, 'courseid' => $COURSEID]);
}
if ($needcfg) {
    set_config('ack_cmids', implode(',', $newlist), 'local_fgiembed');
}
$tx->allow_commit();

rebuild_course_cache($COURSEID, true);
\cache_helper::purge_by_event('changesincoursecat');
mtrace('done — now: php admin/cli/purge_caches.php');

// --- verify -------------------------------------------------------------------
$cm = $DB->get_record('course_modules', ['id' => $ACK_CMID]);
$cert = $DB->get_record('course_modules', ['id' => $CERT_CMID]);
mtrace("verify cm $ACK_CMID completion={$cm->completion} passgrade={$cm->completionpassgrade}");
mtrace("verify cert availability: " . (strpos($cert->availability, '"cm":' . $ACK_CMID . ',"e":1') !== false || strpos($cert->availability, '"e":1,"cm":' . $ACK_CMID) !== false ? 'e:1 OK' : 'CHECK MANUALLY: ' . $cert->availability));
mtrace("verify ack_cmids=" . get_config('local_fgiembed', 'ack_cmids'));
