<?php
// Strips Moodle's own chrome from pages requested inside the FGI course-player
// iframe, so a learner sees only the activity.
defined('MOODLE_INTERNAL') || die();

$plugin->component = 'local_fgiembed';
$plugin->version   = 2026073100;
$plugin->requires  = 2024042200;   // Moodle 4.4 — first release with the output hooks used here
$plugin->maturity  = MATURITY_STABLE;
$plugin->release   = '1.0.0';
