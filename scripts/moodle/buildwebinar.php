<?php
// Build a complete webinar CE course from a JSON spec (9-10-26). Replaces the
// lost /tmp/fgiweb/build_webinar.php + evalbuild808.php + addcerts trio — keep
// THIS copy in the repo; the box's /tmp gets wiped.
//
// Shape (identical to course 110, §6ao):
//   Announcements · Watch: <title> (Vimeo page, MANUAL completion → the
//   local_fgiembed watch gate) · Webinar Transcript · Presentation Slides ·
//   hidden question bank (XML import) · <title> — Quiz (grade 100, pass 70,
//   completion on pass, unlimited attempts) · Course Evaluation (the standard
//   9-item feedback) · Download Your Certificate (site template from the spec,
//   gated on page + quiz + evaluation, completion on view).
//
// Usage:  sudo -u daemon /opt/bitnami/php/bin/php buildwebinar.php <spec.json> [--dry]
// Spec:   {"shortname","fullname","summary","vimeo_id","padding":"56.25%",
//          "transcript":"/tmp/x/transcript.pdf","slides":"/tmp/x/slides.pdf",
//          "questions":"/tmp/x/questions.xml","cert_template":"NAADAC Certificate"}
// Idempotent: the course is reused by shortname, every module is skipped by
// name, the bank is only imported when empty, slots only added when none.
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/course/modlib.php');
require_once($CFG->libdir . '/filelib.php');
require_once($CFG->libdir . '/resourcelib.php');
require_once($CFG->libdir . '/completionlib.php');
require_once($CFG->libdir . '/questionlib.php');
require_once($CFG->dirroot . '/question/format.php');
require_once($CFG->dirroot . '/question/format/xml/format.php');
require_once($CFG->dirroot . '/mod/forum/lib.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');

$SPECFILE = $argv[1] ?? '';
$DRY = in_array('--dry', $argv);
if (!$SPECFILE || !file_exists($SPECFILE)) { cli_error('usage: buildwebinar.php <spec.json> [--dry]'); }
$spec = json_decode(file_get_contents($SPECFILE), true);
if (!$spec || empty($spec['shortname']) || empty($spec['fullname']) || empty($spec['vimeo_id'])) { cli_error('bad spec'); }
foreach (['transcript', 'slides', 'questions'] as $k) {
    if (!empty($spec[$k]) && !file_exists($spec[$k])) { cli_error("missing file: {$spec[$k]}"); }
}
$padding = $spec['padding'] ?? '56.25%';
$certtemplate = $spec['cert_template'] ?? 'NAADAC Certificate';

$admin = get_admin();
\core\session\manager::set_user($admin);
$fs = get_file_storage();
$usercontext = context_user::instance($admin->id);
$cat = $DB->get_record('course_categories', ['name' => 'CE Courses'], '*', MUST_EXIST);

function has_mod(int $courseid, string $modname, string $name) {
    global $DB;
    return $DB->get_field_sql(
        "SELECT cm.id FROM {course_modules} cm JOIN {modules} m ON m.id = cm.module JOIN {{$modname}} x ON x.id = cm.instance
          WHERE cm.course = ? AND m.name = ? AND x.name = ? AND cm.deletioninprogress = 0", [$courseid, $modname, $name]);
}
function base_mod(int $courseid, string $modname, string $name): stdClass {
    global $DB;
    $d = new stdClass();
    $d->course = $courseid; $d->modulename = $modname;
    $d->module = $DB->get_field('modules', 'id', ['name' => $modname], MUST_EXIST);
    $d->section = 0; $d->visible = 1; $d->visibleoncoursepage = 1; $d->cmidnumber = '';
    $d->groupmode = 0; $d->groupingid = 0;
    $d->name = $name; $d->intro = ''; $d->introformat = FORMAT_HTML;
    $d->completion = COMPLETION_TRACKING_NONE; $d->completionview = 0;
    $d->completionusegrade = 0; $d->completionexpected = 0;
    return $d;
}

// ---- 1. course -------------------------------------------------------------
$course = $DB->get_record('course', ['shortname' => $spec['shortname']]);
if ($course) {
    mtrace("course exists: {$course->id} ({$course->shortname})");
} else {
    mtrace("create course '{$spec['fullname']}' in '{$cat->name}'");
    if ($DRY) { mtrace('DRY: stop'); exit(0); }
    $course = create_course((object) [
        'category' => $cat->id, 'shortname' => $spec['shortname'], 'fullname' => $spec['fullname'],
        'idnumber' => '', 'summary' => $spec['summary'] ?? '', 'summaryformat' => FORMAT_HTML,
        'format' => 'topics', 'numsections' => 1, 'visible' => 1,
        'enablecompletion' => 1, 'showcompletionconditions' => 1, 'showgrades' => 1, 'newsitems' => 1,
    ]);
    mtrace("created course {$course->id}");
}
if ($DRY) { mtrace('DRY: stop'); exit(0); }
$course = $DB->get_record('course', ['id' => $course->id], '*', MUST_EXIST);
$courseid = (int) $course->id;

// ---- 2. announcements ------------------------------------------------------
$forum = forum_get_course_forum($courseid, 'news');
mtrace("announcements forum {$forum->id}");

// ---- 3. watch page (manual completion = watch gate) -------------------------
$pname = 'Watch: ' . $spec['fullname'];
$html = '<div style="padding:' . $padding . ' 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/'
    . $spec['vimeo_id'] . '?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" '
    . 'allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" '
    . 'referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe></div>';
if ($pagecm = has_mod($courseid, 'page', $pname)) {
    mtrace("skip page cmid $pagecm");
} else {
    $d = base_mod($courseid, 'page', $pname);
    $d->page = ['text' => $html, 'format' => FORMAT_HTML, 'itemid' => 0];
    $d->display = 0; $d->printintro = 0; $d->printlastmodified = 0;
    $d->completion = COMPLETION_TRACKING_MANUAL;
    $mi = add_moduleinfo($d, $course);
    $pagecm = (int) $mi->coursemodule;
    // add_moduleinfo saves page text empty from CLI (§6an gotcha) — write it directly.
    $DB->set_field('page', 'content', $html, ['id' => $mi->instance]);
    mtrace("page cmid $pagecm");
}

// ---- 4. handouts ------------------------------------------------------------
function add_pdf(stdClass $course, string $name, string $src, string $filename): int {
    global $DB, $fs, $usercontext;
    if ($cm = has_mod((int) $course->id, 'resource', $name)) { mtrace("skip resource '$name' cmid $cm"); return (int) $cm; }
    $draftid = file_get_unused_draft_itemid();
    $fs->create_file_from_pathname([
        'contextid' => $usercontext->id, 'component' => 'user', 'filearea' => 'draft',
        'itemid' => $draftid, 'filepath' => '/', 'filename' => $filename,
    ], $src);
    $d = base_mod((int) $course->id, 'resource', $name);
    $d->files = $draftid;
    $d->display = RESOURCELIB_DISPLAY_EMBED;
    $d->printintro = 0; $d->showsize = 0; $d->showtype = 0; $d->showdate = 0;
    $d->filterfiles = 0; $d->popupwidth = 620; $d->popupheight = 450;
    $mi = add_moduleinfo($d, $course);
    mtrace("resource '$name' cmid {$mi->coursemodule} [$filename, " . filesize($src) . " bytes]");
    return (int) $mi->coursemodule;
}
if (!empty($spec['transcript'])) { add_pdf($course, 'Webinar Transcript', $spec['transcript'], 'transcript.pdf'); }
if (!empty($spec['slides'])) { add_pdf($course, 'Presentation Slides', $spec['slides'], 'slides.pdf'); }

// ---- 5. question bank + import ---------------------------------------------
$qbname = $spec['fullname'] . ' — Question bank';
if ($qbcm = has_mod($courseid, 'qbank', $qbname)) {
    mtrace("skip qbank cmid $qbcm");
} else {
    $d = base_mod($courseid, 'qbank', $qbname);
    $d->visible = 0; $d->visibleoncoursepage = 0; $d->type = 'standard';
    $mi = add_moduleinfo($d, $course);
    $qbcm = (int) $mi->coursemodule;
    mtrace("qbank cmid $qbcm (hidden)");
}
$qbctx = context_module::instance($qbcm);
$qcat = question_make_default_categories([$qbctx]);
$qcount = $DB->count_records('question_bank_entries', ['questioncategoryid' => $qcat->id]);
if ($qcount === 0 && !empty($spec['questions'])) {
    $qformat = new qformat_xml();
    $qformat->setCategory($qcat);
    $qformat->setContexts([$qbctx]);
    $qformat->setCourse($course);
    $qformat->setFilename($spec['questions']);
    $qformat->setRealfilename(basename($spec['questions']));
    $qformat->setMatchgrades('error');
    $qformat->setCatfromfile(false);
    $qformat->setContextfromfile(false);
    $qformat->setStoponerror(true);
    if (!$qformat->importpreprocess()) { cli_error('import preprocess failed'); }
    if (!$qformat->importprocess()) { cli_error('import process failed'); }
    if (!$qformat->importpostprocess()) { cli_error('import postprocess failed'); }
    $qcount = $DB->count_records('question_bank_entries', ['questioncategoryid' => $qcat->id]);
    mtrace("\nimported $qcount questions into category {$qcat->id}");
} else {
    mtrace("bank category {$qcat->id} holds $qcount questions");
}

// ---- 6. quiz ----------------------------------------------------------------
$qname = $spec['fullname'] . ' — Quiz';
if ($quizcm = has_mod($courseid, 'quiz', $qname)) {
    mtrace("skip quiz cmid $quizcm");
    $quizid = (int) $DB->get_field('course_modules', 'instance', ['id' => $quizcm], MUST_EXIST);
} else {
    $d = base_mod($courseid, 'quiz', $qname);
    $d->timeopen = 0; $d->timeclose = 0; $d->timelimit = 0; $d->overduehandling = 'autosubmit'; $d->graceperiod = 0;
    $d->preferredbehaviour = 'deferredfeedback'; $d->canredoquestions = 0;
    $d->attempts = 0; $d->attemptonlast = 0; $d->grademethod = QUIZ_GRADEHIGHEST;
    $d->decimalpoints = 2; $d->questiondecimalpoints = -1;
    // Review options: only "the attempt" during the attempt (course 110: reviewattempt 65536, rest 0).
    foreach (['attempt', 'correctness', 'maxmarks', 'marks', 'specificfeedback', 'generalfeedback', 'rightanswer', 'overallfeedback'] as $opt) {
        foreach (['during', 'immediately', 'open', 'closed'] as $when) { $d->{$opt . $when} = 0; }
    }
    $d->attemptduring = 1;
    $d->showuserpicture = 0; $d->showblocks = 0; $d->quizpassword = ''; $d->subnet = ''; $d->browsersecurity = '-';
    $d->delay1 = 0; $d->delay2 = 0; $d->questionsperpage = 1; $d->navmethod = 'free'; $d->shuffleanswers = 1;
    $d->grade = 100; $d->sumgrades = 0;
    $d->feedbacktext = [['text' => '', 'format' => FORMAT_HTML]]; $d->feedbackboundaries = []; $d->boundary_repeats = 0;
    $d->completion = COMPLETION_TRACKING_AUTOMATIC; $d->completionusegrade = 1; $d->completionpassgrade = 1;
    $d->completiongradeitemnumber = 0; $d->completionminattempts = 0; $d->completionattemptsexhausted = 0;
    $mi = add_moduleinfo($d, $course);
    $quizcm = (int) $mi->coursemodule; $quizid = (int) $mi->instance;
    mtrace("quiz cmid $quizcm");
}
$quiz = $DB->get_record('quiz', ['id' => $quizid], '*', MUST_EXIST);
if ($DB->count_records('quiz_slots', ['quizid' => $quiz->id]) === 0 && $qcount > 0) {
    if (!function_exists('quiz_add_quiz_question')) { cli_error('quiz_add_quiz_question missing on this Moodle — add slots via structure API'); }
    $qids = $DB->get_fieldset_sql(
        "SELECT q.id FROM {question} q JOIN {question_versions} qv ON qv.questionid = q.id
           JOIN {question_bank_entries} qbe ON qbe.id = qv.questionbankentryid
          WHERE qbe.questioncategoryid = ? ORDER BY q.id", [$qcat->id]);
    foreach ($qids as $qid) { quiz_add_quiz_question((int) $qid, $quiz, 0, 1.0); }
    quiz_update_sumgrades($quiz);
    mtrace('quiz slots added: ' . count($qids));
}
$quiz = $DB->get_record('quiz', ['id' => $quizid], '*', MUST_EXIST);
$gi = $DB->get_record('grade_items', ['itemtype' => 'mod', 'itemmodule' => 'quiz', 'iteminstance' => $quiz->id, 'courseid' => $courseid]);
if ($gi) {
    $pass = round($quiz->grade * 0.7, 2);
    if ((float) $gi->gradepass !== $pass) { $gi->gradepass = $pass; $DB->update_record('grade_items', $gi); }
    mtrace("quiz grade {$quiz->grade}, sumgrades {$quiz->sumgrades}, gradepass $pass");
}

// ---- 7. course evaluation (standard 9-item feedback) -----------------------
$FB_INTRO = '<p>Thank you for visiting the Learning Center. Your feedback is greatly appreciated!</p>'
    . '<p>Please take a few minutes to share your thoughts so we can continue to improve and provide the content you find relevant.</p>';
$FB_AFTER = '<p>Thank you for your time. Have a great day!</p>';
$SCALE = 'r>>>>>0####0|1####1|2####2|3####3|4####4|5####5|6####6|7####7|8####8|9####9|10####10<<<<<1';
$FB_ITEMS = [
    ['q1', 'The information provided made sense to me', 'multichoicerated', $SCALE, 1, 'h'],
    ['q2', 'I will be able to apply the information', 'multichoicerated', $SCALE, 1, 'h'],
    ['q3', 'The information was presented effectively', 'multichoicerated', $SCALE, 1, 'h'],
    ['q4', 'My overall impression of the information is excellent', 'multichoicerated', $SCALE, 1, 'h'],
    ['q5', 'How likely are you to recommend this information to someone in a similar role?', 'multichoicerated', $SCALE, 1, 'h'],
    ['q6', 'What did you LIKE?', 'textarea', '60|5', 0, ''],
    ['q7', 'What did you NOT LIKE?', 'textarea', '60|5', 0, ''],
    ['q8', 'Are there other topics or suggestions for what you would like to see in the Learning Center in the future?', 'textarea', '60|5', 0, ''],
    ['q9', 'May a representative contact you about your experience?', 'multichoice', 'r>>>>>Yes|No<<<<<1', 1, 'h'],
];
if ($fbcm = has_mod($courseid, 'feedback', 'Course Evaluation')) {
    mtrace("skip feedback cmid $fbcm");
} else {
    $d = base_mod($courseid, 'feedback', 'Course Evaluation');
    $d->intro = $FB_INTRO;
    $d->anonymous = 2; $d->email_notification = 0; $d->multiple_submit = 0; $d->autonumbering = 1;
    // feedback_add_instance inserts page_after_submit as-is (the form's editor
    // post-processing never runs from CLI) and the column has no default.
    $d->site_after_submit = ''; $d->page_after_submit = $FB_AFTER; $d->page_after_submitformat = FORMAT_HTML;
    $d->publish_stats = 0; $d->timeopen = 0; $d->timeclose = 0;
    $d->completion = COMPLETION_TRACKING_AUTOMATIC; $d->completionsubmit = 1;
    $mi = add_moduleinfo($d, $course);
    $fbcm = (int) $mi->coursemodule;
    foreach ($FB_ITEMS as $i => [$label, $name, $typ, $pres, $req, $opts]) {
        $DB->insert_record('feedback_item', (object) [
            'feedback' => $mi->instance, 'template' => 0, 'name' => $name, 'label' => $label,
            'presentation' => $pres, 'typ' => $typ, 'hasvalue' => 1, 'position' => $i + 1,
            'required' => $req, 'dependitem' => 0, 'dependvalue' => '', 'options' => $opts,
        ]);
    }
    mtrace("feedback cmid $fbcm with " . count($FB_ITEMS) . ' items');
}

// ---- 8. certificate (gated on page + quiz + evaluation) ---------------------
if ($certcm = has_mod($courseid, 'customcert', 'Download Your Certificate')) {
    mtrace("skip customcert cmid $certcm");
} else {
    $sitetemplate = $DB->get_record('customcert_templates', ['name' => $certtemplate], '*', MUST_EXIST);
    $d = base_mod($courseid, 'customcert', 'Download Your Certificate');
    $d->requiredtime = 0; $d->verifyany = 0; $d->deliveryoption = 'I';
    $d->usecustomfilename = 0; $d->customfilenamepattern = '';
    $d->emailstudents = 0; $d->emailteachers = 0; $d->emailothers = '';
    $d->protection_print = 0; $d->protection_modify = 0; $d->protection_copy = 0; $d->language = '';
    $d->completion = COMPLETION_TRACKING_AUTOMATIC; $d->completionview = 1; // issued on first view (9-2 certcompletion)
    $mi = add_moduleinfo($d, $course);
    $certcm = (int) $mi->coursemodule;
    $cert = $DB->get_record('customcert', ['id' => $mi->instance], '*', MUST_EXIST);
    $modtemplate = new \mod_customcert\template($DB->get_record('customcert_templates', ['id' => $cert->templateid], '*', MUST_EXIST));
    (new \mod_customcert\template($sitetemplate))->copy_to_template($modtemplate);
    foreach ($DB->get_records('customcert_pages', ['templateid' => $cert->templateid], 'id') as $p) {
        if (!$DB->record_exists('customcert_elements', ['pageid' => $p->id])) { $DB->delete_records('customcert_pages', ['id' => $p->id]); }
    }
    $conds = []; $showc = [];
    foreach ([$pagecm, $quizcm, $fbcm] as $g) { $conds[] = ['type' => 'completion', 'cm' => (int) $g, 'e' => 1]; $showc[] = true; }
    $DB->set_field('course_modules', 'availability', json_encode(['op' => '&', 'c' => $conds, 'showc' => $showc]), ['id' => $certcm]);
    mtrace("customcert cmid $certcm from '$certtemplate', gated on page $pagecm + quiz $quizcm + feedback $fbcm");
}

// ---- 9. section order: forum · page · resources · qbank · quiz · feedback · cert
$s0 = $DB->get_record('course_sections', ['course' => $courseid, 'section' => 0], '*', MUST_EXIST);
$seq = array_values(array_filter(array_map('intval', explode(',', $s0->sequence))));
$cms = $DB->get_records_list('course_modules', 'id', $seq, '', 'id, module');
$modnames = [];
foreach ($DB->get_records('modules') as $m) { $modnames[$m->id] = $m->name; }
$by = [];
foreach ($seq as $cmid) { $by[$modnames[$cms[$cmid]->module]][] = $cmid; }
$order = array_merge($by['forum'] ?? [], $by['page'] ?? [], $by['resource'] ?? [], $by['qbank'] ?? [],
    $by['quiz'] ?? [], $by['feedback'] ?? [], $by['customcert'] ?? []);
$order = array_merge($order, array_values(array_diff($seq, $order)));
$DB->set_field('course_sections', 'sequence', implode(',', $order), ['id' => $s0->id]);
rebuild_course_cache($courseid, true);
mtrace("sequence: " . implode(',', $order));
mtrace("DONE course $courseid: {$course->shortname}");
