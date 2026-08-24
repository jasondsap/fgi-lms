<?php
// Replace the SCORM package on ONE course-module (for courses that carry
// several SCORM activities). Keeps the cmid/completion config; reparses.
//   sudo -u daemon php replace-cm.php <cmid> <zippath>
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/mod/scorm/lib.php');
require_once($CFG->dirroot . '/mod/scorm/locallib.php');
require_once($CFG->libdir . '/filelib.php');

$cmid = (int)($argv[1] ?? 0);
$ZIP = $argv[2] ?? '';
if (!$cmid || !file_exists($ZIP)) { mtrace('usage: replace-cm.php <cmid> <zippath>'); exit(1); }
$check = new ZipArchive();
if ($check->open($ZIP, ZipArchive::CHECKCONS) !== true) { mtrace('ABORT: zip fails consistency check'); exit(1); }
mtrace('zip OK: ' . $check->numFiles . ' entries');
$check->close();

$admin = get_admin();
\core\session\manager::set_user($admin);

$cm = get_coursemodule_from_id('scorm', $cmid, 0, false, MUST_EXIST);
$scorm = $DB->get_record('scorm', ['id' => $cm->instance], '*', MUST_EXIST);
$context = context_module::instance($cm->id);
mtrace("cmid {$cm->id} (course {$cm->course}): scorm {$scorm->id} '{$scorm->name}' — old reference: {$scorm->reference}");

$fs = get_file_storage();
$fs->delete_area_files($context->id, 'mod_scorm', 'package');
$fs->delete_area_files($context->id, 'mod_scorm', 'content');
$fs->create_file_from_pathname([
    'contextid' => $context->id, 'component' => 'mod_scorm',
    'filearea' => 'package', 'itemid' => 0, 'filepath' => '/',
    'filename' => basename($ZIP),
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

rebuild_course_cache($cm->course, true);
purge_all_caches();
mtrace('Done.');
