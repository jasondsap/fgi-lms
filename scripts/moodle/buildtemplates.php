<?php
// Build the four site-level customcert templates from the SharePoint designs
// (8-8-26 PDFs rendered as full-page backgrounds at /tmp/certbg/*.png).
// Page = US Letter landscape (279 x 216 mm). Elements over the art:
//   studentname (centered, in the gap under "PRESENTED TO")
//   coursename  (centered, in the empty band above the signature block —
//               the designs never carried the course title)
//   date        (issue date, centered above the "Issued On" line)
// Idempotent: a template whose name already exists is skipped.
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');

$BRANDS = [
    'fgi'    => 'FGI Certificate',
    'naadac' => 'NAADAC Certificate',
    'orhco'  => 'ORH-CO Certificate',
    'scarr'  => 'SCARR Certificate',
];

$admin = get_admin();
\core\session\manager::set_user($admin);
$fs = get_file_storage();
$ctx = context_system::instance();
$now = time();

foreach ($BRANDS as $key => $name) {
    if ($DB->record_exists('customcert_templates', ['name' => $name])) {
        mtrace("SKIP (exists): $name");
        continue;
    }
    $png = "/tmp/certbg/{$key}-bg.png";
    if (!file_exists($png)) { mtrace("ABORT: $png missing"); exit(1); }

    // Shared image area (what the element file picker browses).
    $filename = "{$key}-bg.png";
    if (!$fs->file_exists($ctx->id, 'mod_customcert', 'image', 0, '/', $filename)) {
        $fs->create_file_from_pathname([
            'contextid' => $ctx->id, 'component' => 'mod_customcert',
            'filearea' => 'image', 'itemid' => 0, 'filepath' => '/',
            'filename' => $filename,
        ], $png);
    }

    $tid = $DB->insert_record('customcert_templates', (object) [
        'name' => $name, 'contextid' => $ctx->id,
        'timecreated' => $now, 'timemodified' => $now,
    ]);
    $pid = $DB->insert_record('customcert_pages', (object) [
        'templateid' => $tid, 'width' => 279, 'height' => 216,
        'leftmargin' => 0, 'rightmargin' => 0, 'sequence' => 1,
        'timecreated' => $now, 'timemodified' => $now,
    ]);

    $el = function ($seq, $name, $element, $data, $font, $size, $posx, $posy) use ($DB, $pid, $now) {
        $DB->insert_record('customcert_elements', (object) [
            'pageid' => $pid, 'name' => $name, 'element' => $element,
            'data' => $data, 'font' => $font, 'fontsize' => $size,
            'colour' => '#000000', 'posx' => $posx, 'posy' => $posy,
            'width' => 0, 'refpoint' => 1 /* top-center */, 'alignment' => 'C',
            'sequence' => $seq, 'timecreated' => $now, 'timemodified' => $now,
        ]);
    };

    $bgdata = json_encode([
        'width' => 0, 'height' => 0,
        'contextid' => $ctx->id, 'filearea' => 'image', 'itemid' => 0,
        'filepath' => '/', 'filename' => $filename,
    ]);
    $DB->insert_record('customcert_elements', (object) [
        'pageid' => $pid, 'name' => 'Background', 'element' => 'bgimage',
        'data' => $bgdata, 'font' => null, 'fontsize' => null, 'colour' => null,
        'posx' => 0, 'posy' => 0, 'width' => 0, 'refpoint' => 0,
        'alignment' => 'L', 'sequence' => 1,
        'timecreated' => $now, 'timemodified' => $now,
    ]);

    $el(2, 'Learner name', 'studentname', null, 'freeserifb', 30, 140, 95);
    $el(3, 'Course name', 'coursename', null, 'freeserif', 16, 140, 137);
    $el(4, 'Issued date', 'date',
        json_encode(['dateitem' => '-1', 'dateformat' => 1]),
        'freeserif', 14, 186, 164);

    mtrace("created: $name (template $tid, page $pid)");
}
mtrace('Done.');
