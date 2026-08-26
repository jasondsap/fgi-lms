<?php
// Course 132 "Foundations for Developing Recovery Housing" fixes (Jason, 8-25):
//  1. add the 12-Step Support Definitions PDF (copied from course 58 cmid 477)
//     as a handout right after the 12-Steps video page (cmid 665);
//  2. replace the Coordinating Care: Treatment Plans *resource* (cmid 669)
//     with a *page* embedding the same PDF, so the player treats it as its own
//     lesson instead of nesting it under Why Evaluation Matters;
//  3. replace the course summary with Jason's description.
// Usage: php fdrh825.php [--dry]
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/course/modlib.php');
require_once($CFG->libdir . '/filelib.php');
require_once($CFG->libdir . '/resourcelib.php');

$DRY = in_array('--dry', $argv);
$COURSEID = 132;
$AFTER_CMID = 665;          // 12-Steps video page
$OLD_CC_CMID = 669;         // Coordinating Care resource to replace
$SRC_DEFS_CMID = 477;       // course 58: 12-Step Support Definitions resource

$admin = get_admin();
\core\session\manager::set_user($admin);
$fs = get_file_storage();
$usercontext = context_user::instance($admin->id);
$course = $DB->get_record('course', ['id' => $COURSEID], '*', MUST_EXIST);
$section0 = $DB->get_record('course_sections', ['course' => $COURSEID, 'section' => 0], '*', MUST_EXIST);
$resmodule = $DB->get_field('modules', 'id', ['name' => 'resource'], MUST_EXIST);
$pagemodule = $DB->get_field('modules', 'id', ['name' => 'page'], MUST_EXIST);

function place_after(int $sectionid, int $newcmid, int $anchorcmid): void {
    global $DB;
    $section = $DB->get_record('course_sections', ['id' => $sectionid], '*', MUST_EXIST);
    $seq = array_values(array_filter(array_map('intval', explode(',', $section->sequence))));
    $seq = array_values(array_diff($seq, [$newcmid]));
    $pos = array_search($anchorcmid, $seq);
    if ($pos === false) { $seq[] = $newcmid; } else { array_splice($seq, $pos + 1, 0, [$newcmid]); }
    $DB->set_field('course_sections', 'sequence', implode(',', $seq), ['id' => $sectionid]);
}

// ---- 1. 12-Step Support Definitions handout --------------------------------
$srccm = get_coursemodule_from_id('resource', $SRC_DEFS_CMID, 0, false, MUST_EXIST);
$srcctx = context_module::instance($srccm->id);
$srcfiles = $fs->get_area_files($srcctx->id, 'mod_resource', 'content', 0, 'sortorder', false);
$srcfile = reset($srcfiles);
mtrace("source handout: cmid {$srccm->id} '{$srccm->name}' file=" . $srcfile->get_filename() . ' (' . $srcfile->get_filesize() . ' bytes)');

$exists = $DB->record_exists_select('course_modules',
    'course = ? AND module = ? AND deletioninprogress = 0 AND instance IN (SELECT id FROM {resource} WHERE course = ? AND name = ?)',
    [$COURSEID, $resmodule, $COURSEID, $srccm->name]);
if ($exists) {
    mtrace("SKIP handout: '{$srccm->name}' already exists in course $COURSEID");
} else if ($DRY) {
    mtrace("DRY: would add resource '{$srccm->name}' after cmid $AFTER_CMID (EMBED, no completion)");
} else {
    $draftid = file_get_unused_draft_itemid();
    $fs->create_file_from_storedfile([
        'contextid' => $usercontext->id, 'component' => 'user', 'filearea' => 'draft',
        'itemid' => $draftid, 'filepath' => '/', 'filename' => $srcfile->get_filename(),
    ], $srcfile);
    $d = new stdClass();
    $d->course = $COURSEID; $d->modulename = 'resource'; $d->module = $resmodule;
    $d->section = 0; $d->visible = 1; $d->visibleoncoursepage = 1; $d->cmidnumber = '';
    $d->groupmode = 0; $d->groupingid = 0;
    $d->name = $srccm->name; $d->intro = ''; $d->introformat = FORMAT_HTML;
    $d->files = $draftid;
    $d->display = RESOURCELIB_DISPLAY_EMBED;
    $d->printintro = 0; $d->showsize = 1; $d->showtype = 1; $d->showdate = 0;
    $d->filterfiles = 0; $d->popupwidth = 620; $d->popupheight = 450;
    $d->completion = COMPLETION_TRACKING_NONE; $d->completionview = 0;
    $d->completionusegrade = 0; $d->completionexpected = 0;
    $mi = add_moduleinfo($d, $course);
    place_after($section0->id, $mi->coursemodule, $AFTER_CMID);
    mtrace("added handout cmid {$mi->coursemodule} after $AFTER_CMID");
}

// ---- 2. Coordinating Care resource -> page ---------------------------------
if (!$DB->record_exists('course_modules', ['id' => $OLD_CC_CMID])) {
    mtrace("SKIP page: old cmid $OLD_CC_CMID already gone");
} else {
    $oldcm = get_coursemodule_from_id('resource', $OLD_CC_CMID, 0, false, MUST_EXIST);
    $oldctx = context_module::instance($oldcm->id);
    $oldfiles = $fs->get_area_files($oldctx->id, 'mod_resource', 'content', 0, 'sortorder', false);
    $pdf = reset($oldfiles);
    $pdfname = $pdf->get_filename();
    mtrace("old resource: cmid {$oldcm->id} '{$oldcm->name}' file=$pdfname completion={$oldcm->completion}/{$oldcm->completionview}");
    $content = '<iframe src="@@PLUGINFILE@@/' . rawurlencode($pdfname) . '" title="' . s($oldcm->name) . '"'
        . ' style="width:100%;height:900px;border:1px solid #ddd;border-radius:6px;background:#fff;"></iframe>';
    if ($DRY) {
        mtrace("DRY: would replace cmid $OLD_CC_CMID with page '{$oldcm->name}' embedding $pdfname");
    } else {
        $draftid = file_get_unused_draft_itemid();
        $fs->create_file_from_storedfile([
            'contextid' => $usercontext->id, 'component' => 'user', 'filearea' => 'draft',
            'itemid' => $draftid, 'filepath' => '/', 'filename' => $pdfname,
        ], $pdf);
        $d = new stdClass();
        $d->course = $COURSEID; $d->modulename = 'page'; $d->module = $pagemodule;
        $d->section = 0; $d->visible = $oldcm->visible; $d->visibleoncoursepage = 1; $d->cmidnumber = '';
        $d->groupmode = 0; $d->groupingid = 0;
        $d->name = $oldcm->name; $d->intro = ''; $d->introformat = FORMAT_HTML;
        $d->page = ['text' => $content, 'format' => FORMAT_HTML, 'itemid' => $draftid];
        $d->display = RESOURCELIB_DISPLAY_AUTO; $d->printintro = 0; $d->printlastmodified = 0;
        $d->popupwidth = 620; $d->popupheight = 450;
        $d->completion = $oldcm->completion; $d->completionview = $oldcm->completionview;
        $d->completionusegrade = 0; $d->completionexpected = 0;
        $mi = add_moduleinfo($d, $course);
        $pagectx = context_module::instance($mi->coursemodule);
        file_save_draft_area_files($draftid, $pagectx->id, 'mod_page', 'content', 0);
        // 6an gotcha: $d->page['text'] silently saves empty - write it directly.
        $DB->set_field('page', 'content', $content, ['id' => $mi->instance]);
        $DB->set_field('page', 'contentformat', FORMAT_HTML, ['id' => $mi->instance]);
        // Same slot as the old resource, then drop the old one.
        $section = $DB->get_record('course_sections', ['id' => $oldcm->section], '*', MUST_EXIST);
        $seq = array_values(array_filter(array_map('intval', explode(',', $section->sequence))));
        $seq = array_values(array_diff($seq, [$mi->coursemodule]));
        $pos = array_search($OLD_CC_CMID, $seq);
        if ($pos === false) { $seq[] = $mi->coursemodule; } else { array_splice($seq, $pos, 0, [$mi->coursemodule]); }
        $DB->set_field('course_sections', 'sequence', implode(',', $seq), ['id' => $section->id]);
        course_delete_module($OLD_CC_CMID);
        mtrace("page cmid {$mi->coursemodule} replaces resource $OLD_CC_CMID");
    }
}

// ---- 3. Course summary -----------------------------------------------------
$summary = <<<HTML
<p>Developing a recovery house can be an overwhelming venture. These courses explore different aspects to consider when you start planning recovery housing development.</p>
<p><strong>An Introduction to the 12-Steps as a Recovery Pathway</strong> — This course provides a brief overview of the 12-steps' history and how it is used as a recovery pathway. The course is not intended to promote any particular fellowship or recovery pathway, nor is it intended as a substitute for individual participation.</p>
<p><strong>Why Evaluation Matters</strong> — This course shows the importance of collecting data on a rural recovery house and how it can improve your house. Find out why evaluation matters to your rural recovery house, what data is the most valuable to collect, and how to evaluate and use the data you secure.</p>
<p><strong>Coordinating Care: Treatment Plans</strong> — This course will review how a rural recovery house can implement treatment plans for residents. While traditionally a part of clinical settings, rural recovery houses can benefit from establishing goals with residents based on their needs.</p>
<p><strong>How to Solve Funding Problems with LIHTC</strong> — Some folks want to build larger recovery housing units. If that's you, or even if it's not, you may be interested in knowing about Low Income Housing Tax Credits (LIHTC). LIHTC may help your organization build a recovery house as part of your community's ecosystem. This course explains what LIHTC is and how it can be used in recovery housing development.</p>
HTML;
if ($DRY) {
    mtrace('DRY: would set course summary (' . strlen($summary) . ' chars)');
} else {
    $DB->set_field('course', 'summary', $summary, ['id' => $COURSEID]);
    $DB->set_field('course', 'summaryformat', FORMAT_HTML, ['id' => $COURSEID]);
    rebuild_course_cache($COURSEID, true);
    purge_all_caches();
    mtrace('summary updated; caches rebuilt');
}
mtrace($DRY ? 'DRY RUN complete.' : 'Done.');
