<?php
// Replace the SCORM package on an existing course in place — keeps the same
// activity (cmid, completion config, grades), swaps the package, reparses.
//   sudo -u daemon php replace-scorm.php <courseid> <zippath>
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/mod/scorm/lib.php');
require_once($CFG->dirroot . '/mod/scorm/locallib.php');
require_once($CFG->libdir . '/filelib.php');

$courseid = (int)($argv[1] ?? 0);
$ZIP = $argv[2] ?? '';
if (!$courseid || !file_exists($ZIP)) { mtrace('usage: replace-scorm.php <courseid> <zippath>'); exit(1); }
$check = new ZipArchive();
if ($check->open($ZIP, ZipArchive::CHECKCONS) !== true) { mtrace('ABORT: zip fails consistency check'); exit(1); }
mtrace('zip OK: ' . $check->numFiles . ' entries');
$check->close();

$admin = get_admin();
\core\session\manager::set_user($admin);

$cm = $DB->get_record_sql(
    "SELECT cm.* FROM {course_modules} cm JOIN {modules} m ON m.id = cm.module
      WHERE cm.course = ? AND m.name = 'scorm'", [$courseid], MUST_EXIST);
$scorm = $DB->get_record('scorm', ['id' => $cm->instance], '*', MUST_EXIST);
$context = context_module::instance($cm->id);
mtrace("course {$courseid}: scorm {$scorm->id} cmid {$cm->id} '{$scorm->name}' — old reference: {$scorm->reference}");

$fs = get_file_storage();
$fs->delete_area_files($context->id, 'mod_scorm', 'package');
$fs->delete_area_files($context->id, 'mod_scorm', 'content');
$fs->create_file_from_pathname([
    'contextid' => $context->id,
    'component' => 'mod_scorm',
    'filearea'  => 'package',
    'itemid'    => 0,
    'filepath'  => '/',
    'filename'  => basename($ZIP),
], $ZIP);

$scorm->reference = basename($ZIP);
$scorm->revision = ($scorm->revision ?? 0) + 1;
$scorm->timemodified = time();
$DB->update_record('scorm', $scorm);
scorm_parse($scorm, true);

$scos = $DB->get_records('scorm_scoes', ['scorm' => $scorm->id, 'scormtype' => 'sco']);
foreach ($scos as $sco) {
    mtrace("new sco {$sco->id}: '{$sco->title}' launch={$sco->launch}");
}
if (!$scos) { mtrace('!! WARNING: no SCOes after reparse'); exit(1); }

rebuild_course_cache($courseid, true);
purge_all_caches();
mtrace('Done.');
