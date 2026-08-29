<?php
// Add a PDF as a "Presentation Slides" resource to a webinar course, placed
// right after a given module (normally the Webinar Transcript). Same settings
// as the other webinar shells: embed display, no intro, untracked. Idempotent
// by name. Generalised from addslides99.php.
// Usage: sudo -u daemon php addslides.php <courseid> <after_cmid> <src.pdf> "<stored filename>" [--dry]
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/course/modlib.php');
require_once($CFG->libdir . '/filelib.php');
require_once($CFG->libdir . '/resourcelib.php');

[$COURSEID, $AFTER_CMID, $SRC, $FILENAME] = [(int) ($argv[1] ?? 0), (int) ($argv[2] ?? 0), $argv[3] ?? '', $argv[4] ?? ''];
$DRY = in_array('--dry', $argv);
$NAME = 'Presentation Slides';
if (!$COURSEID || !$AFTER_CMID || !$SRC || !$FILENAME) { cli_error('usage: addslides.php <courseid> <after_cmid> <src.pdf> "<filename>" [--dry]'); }
if (!file_exists($SRC)) { cli_error("missing $SRC"); }

$admin = get_admin();
\core\session\manager::set_user($admin);
$fs = get_file_storage();
$usercontext = context_user::instance($admin->id);
$course = $DB->get_record('course', ['id' => $COURSEID], '*', MUST_EXIST);
if ($course->format === 'singleactivity') { cli_error('singleactivity course — switch to topics first (§6ax)'); }
$section0 = $DB->get_record('course_sections', ['course' => $COURSEID, 'section' => 0], '*', MUST_EXIST);
$resmodule = $DB->get_field('modules', 'id', ['name' => 'resource'], MUST_EXIST);
if (!$DB->record_exists('course_modules', ['id' => $AFTER_CMID, 'course' => $COURSEID])) { cli_error("cmid $AFTER_CMID is not in course $COURSEID"); }

$existing = $DB->get_field_sql(
    "SELECT cm.id FROM {course_modules} cm JOIN {resource} r ON r.id = cm.instance
      WHERE cm.course = ? AND cm.module = ? AND cm.deletioninprogress = 0 AND r.name = ?",
    [$COURSEID, $resmodule, $NAME]);
if ($existing) { mtrace("SKIP: '$NAME' already exists as cmid $existing"); exit(0); }
mtrace("would add '$NAME' [$FILENAME, " . filesize($SRC) . " bytes] after cmid $AFTER_CMID in course $COURSEID");
if ($DRY) { exit(0); }

$draftid = file_get_unused_draft_itemid();
$fs->create_file_from_pathname([
    'contextid' => $usercontext->id, 'component' => 'user', 'filearea' => 'draft',
    'itemid' => $draftid, 'filepath' => '/', 'filename' => $FILENAME,
], $SRC);

$d = new stdClass();
$d->course = $COURSEID; $d->modulename = 'resource'; $d->module = $resmodule;
$d->section = 0; $d->visible = 1; $d->visibleoncoursepage = 1; $d->cmidnumber = '';
$d->groupmode = 0; $d->groupingid = 0;
$d->name = $NAME; $d->intro = ''; $d->introformat = FORMAT_HTML;
$d->files = $draftid;
$d->display = RESOURCELIB_DISPLAY_EMBED;
$d->printintro = 0; $d->showsize = 0; $d->showtype = 0; $d->showdate = 0;
$d->filterfiles = 0; $d->popupwidth = 620; $d->popupheight = 450;
$d->completion = COMPLETION_TRACKING_NONE; $d->completionview = 0;
$d->completionusegrade = 0; $d->completionexpected = 0;
$mi = add_moduleinfo($d, $course);

$section = $DB->get_record('course_sections', ['id' => $section0->id], '*', MUST_EXIST);
$seq = array_values(array_filter(array_map('intval', explode(',', $section->sequence))));
$seq = array_values(array_diff($seq, [$mi->coursemodule]));
$pos = array_search($AFTER_CMID, $seq);
if ($pos === false) { $seq[] = $mi->coursemodule; } else { array_splice($seq, $pos + 1, 0, [$mi->coursemodule]); }
$DB->set_field('course_sections', 'sequence', implode(',', $seq), ['id' => $section0->id]);
rebuild_course_cache($COURSEID, true);
mtrace("added cmid {$mi->coursemodule}; sequence = " . implode(',', $seq));
