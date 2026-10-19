<?php
// Web-service functions for the FGI front end (1.2.0, 8-30-26; 1.3.0, 10-18-26).
// mark_complete lets the site record the Learning Center evaluation — or a
// course acknowledgment (config ack_cmids) — in its own database and still
// complete the Moodle activity, so the certificate availability gate and the
// progress bar keep working.
defined('MOODLE_INTERNAL') || die();

$functions = [
    'local_fgiembed_mark_complete' => [
        'classname'   => 'local_fgiembed\external\mark_complete',
        'description' => 'Override-complete an evaluation or acknowledgment activity for a learner '
                       . '(the survey / agreement itself was answered on the FGI site).',
        'type'        => 'write',
        'ajax'        => false,
        'capabilities'=> 'moodle/course:overridecompletion',
    ],
];
