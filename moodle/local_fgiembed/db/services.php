<?php
// Web-service functions for the FGI front end (1.2.0, 8-30-26).
// mark_complete lets the site record the Learning Center evaluation in its
// own database and still complete the Moodle feedback activity, so the
// certificate availability gate and the progress bar keep working.
defined('MOODLE_INTERNAL') || die();

$functions = [
    'local_fgiembed_mark_complete' => [
        'classname'   => 'local_fgiembed\external\mark_complete',
        'description' => 'Override-complete an evaluation activity for a learner '
                       . '(the survey itself was answered on the FGI site).',
        'type'        => 'write',
        'ajax'        => false,
        'capabilities'=> 'moodle/course:overridecompletion',
    ],
];
