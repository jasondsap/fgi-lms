<?php
// Replace each docx-download resource with a Page that shows the PDF preview
// in-page and keeps the ORIGINAL Word file as a download button (Jason, 8-23:
// learners use these as templates to edit, so the .docx must stay).
// Expects /tmp/docxprev/<oldcmid>.docx + <oldcmid>.pdf. Idempotent: an old
// cmid that no longer exists is skipped.
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/course/modlib.php');
require_once($CFG->libdir . '/filelib.php');
require_once($CFG->libdir . '/resourcelib.php');

$MAP = [
    // oldcmid => [course, activity name, original docx filename]
    260 => [19,  'Journal Exercise for Cultural Humility', 'Journal Exercise for Cultural Humility.docx'],
    266 => [56,  'Daily Affirmation', 'Daily Affirmation.docx'],
    268 => [60,  'SMART Goal Action Plan Template', 'SMART Goal Action Plan Template.docx'],
    270 => [60,  'Simple Action Plan Template', 'Simple Action Plan Template.docx'],
    285 => [65,  'Sponsor Enagement FGI', 'Sponsor Enagement_FGI.docx'],
    290 => [62,  'Project Charter Template FGI', 'Project Charter Template_FGI.docx'],
    291 => [62,  'Project Kickoff Checklist', 'Project Kickoff Checklist.docx'],
    444 => [103, 'Behavior Contract Template', '2-handout.docx'],
    445 => [103, 'Self-Discovery Template', '3-handout.docx'],
    458 => [89,  'Simple Action Plan Template', 'Simple Action Plan Template.docx'],
    459 => [89,  'SMART Goal Action Plan Template', 'SMART Goal Action Plan Template.docx'],
];

$admin = get_admin();
\core\session\manager::set_user($admin);
$fs = get_file_storage();
$usercontext = context_user::instance($admin->id);
$pagemodule = $DB->get_field('modules', 'id', ['name' => 'page'], MUST_EXIST);
$touchedcourses = [];

foreach ($MAP as $oldcmid => [$courseid, $name, $docxname]) {
    if (!$DB->record_exists('course_modules', ['id' => $oldcmid])) {
        mtrace("SKIP (old cm gone): $oldcmid $name");
        continue;
    }
    $course = $DB->get_record('course', ['id' => $courseid], '*', MUST_EXIST);
    $oldcm = $DB->get_record('course_modules', ['id' => $oldcmid], '*', MUST_EXIST);

    // Stage both files into one draft area for the page's content filearea.
    $draftid = file_get_unused_draft_itemid();
    foreach ([["/tmp/docxprev/{$oldcmid}.pdf", 'preview.pdf'],
              ["/tmp/docxprev/{$oldcmid}.docx", $docxname]] as [$path, $filename]) {
        if (!file_exists($path)) { mtrace("ABORT: $path missing"); exit(1); }
        $fs->create_file_from_pathname([
            'contextid' => $usercontext->id, 'component' => 'user',
            'filearea' => 'draft', 'itemid' => $draftid,
            'filepath' => '/', 'filename' => $filename,
        ], $path);
    }

    $downloadname = s($docxname);
    $content = '
<div style="margin-bottom:14px;">
  <a href="@@PLUGINFILE@@/' . rawurlencode($docxname) . '?forcedownload=1"
     style="display:inline-block;background:#163d5b;color:#ffffff;font-weight:600;
            padding:10px 24px;border-radius:999px;text-decoration:none;">
    &#11015;&#65039; Download the Word document to fill out
  </a>
  <span style="margin-left:10px;color:#555;font-size:13px;">(' . $downloadname . ')</span>
</div>
<iframe src="@@PLUGINFILE@@/preview.pdf" title="' . s($name) . ' preview"
        style="width:100%;height:900px;border:1px solid #ddd;border-radius:6px;background:#fff;"></iframe>';

    $d = new stdClass();
    $d->course = $courseid;
    $d->modulename = 'page';
    $d->module = $pagemodule;
    $d->section = 0;
    $d->visible = $oldcm->visible;
    $d->visibleoncoursepage = 1;
    $d->cmidnumber = '';
    $d->groupmode = 0;
    $d->groupingid = 0;
    $d->name = $name;
    $d->intro = '';
    $d->introformat = FORMAT_HTML;
    $d->page = ['text' => $content, 'format' => FORMAT_HTML, 'itemid' => $draftid];
    $d->display = RESOURCELIB_DISPLAY_AUTO;
    $d->printintro = 0;
    $d->printlastmodified = 0;
    $d->popupwidth = 620;
    $d->popupheight = 450;
    // Mirror the old handout's completion config.
    $d->completion = $oldcm->completion;
    $d->completionview = $oldcm->completionview;
    $d->completionusegrade = 0;
    $d->completionexpected = 0;
    $mi = add_moduleinfo($d, $course);

    // §6an gotcha: add_moduleinfo's $d->page['text'] silently saves empty —
    // write page.content directly, then move the draft files into the page's
    // own content area so @@PLUGINFILE@@ resolves.
    $pagectx = context_module::instance($mi->coursemodule);
    file_save_draft_area_files($draftid, $pagectx->id, 'mod_page', 'content', 0);
    $DB->set_field('page', 'content', $content, ['id' => $mi->instance]);
    $DB->set_field('page', 'contentformat', FORMAT_HTML, ['id' => $mi->instance]);

    // Put the new page exactly where the old resource sat, then delete it.
    $section = $DB->get_record('course_sections', ['id' => $oldcm->section], '*', MUST_EXIST);
    $seq = array_map('intval', explode(',', $section->sequence));
    $seq = array_values(array_diff($seq, [$mi->coursemodule]));
    $pos = array_search($oldcmid, $seq);
    if ($pos === false) { $seq[] = $mi->coursemodule; } else { array_splice($seq, $pos, 0, [$mi->coursemodule]); }
    $DB->set_field('course_sections', 'sequence', implode(',', $seq), ['id' => $section->id]);

    course_delete_module($oldcmid);
    $touchedcourses[$courseid] = true;
    mtrace("course $courseid: page cmid {$mi->coursemodule} replaces resource $oldcmid — $name");
}

foreach (array_keys($touchedcourses) as $cid) {
    rebuild_course_cache($cid, true);
}
purge_all_caches();
mtrace('Done.');
