<?php
namespace local_fgiembed\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Override-complete one activity for one learner.
 *
 * Used for the Learning Center evaluation (mod_feedback/mod_questionnaire)
 * only: the learner answers the survey on the FGI site (stored in the site's
 * own database), and this marks the corresponding Moodle activity complete so
 * the certificate availability gate and the course progress stay truthful.
 * The caller (the FGI server, via the fgi_frontend service token) restricts
 * itself to evaluation modules; this function additionally refuses any
 * module type outside the allow-list as defence in depth.
 */
class mark_complete extends external_api {

    /** Module types the site evaluation may complete on a learner's behalf. */
    const ALLOWED_MODNAMES = ['feedback', 'questionnaire'];

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'cmid'   => new external_value(PARAM_INT, 'Course-module id of the evaluation activity'),
            'userid' => new external_value(PARAM_INT, 'Moodle user id of the learner'),
        ]);
    }

    public static function execute(int $cmid, int $userid): array {
        global $DB;
        require_once(__DIR__ . '/../../../../lib/completionlib.php');

        $params = self::validate_parameters(self::execute_parameters(), ['cmid' => $cmid, 'userid' => $userid]);

        [$course, $cm] = get_course_and_cm_from_cmid($params['cmid']);
        $context = \context_course::instance($course->id);
        self::validate_context($context);
        require_capability('moodle/course:overridecompletion', $context);

        if (!in_array($cm->modname, self::ALLOWED_MODNAMES, true)) {
            throw new \invalid_parameter_exception('Not an evaluation activity: ' . $cm->modname);
        }
        $user = $DB->get_record('user', ['id' => $params['userid'], 'deleted' => 0], '*', MUST_EXIST);
        if (!is_enrolled($context, $user)) {
            throw new \invalid_parameter_exception('User is not enrolled in this course');
        }

        $completion = new \completion_info($course);
        if (!$completion->is_enabled($cm)) {
            throw new \invalid_parameter_exception('Completion is not enabled on this activity');
        }
        // Override (4th arg): sets the state directly, recorded with overrideby,
        // exactly as a teacher's manual override would be.
        $completion->update_state($cm, COMPLETION_COMPLETE, $user->id, true);
        $data = $completion->get_data($cm, false, $user->id);

        return ['state' => (int) $data->completionstate];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'state' => new external_value(PARAM_INT, 'Resulting completion state (1 = complete)'),
        ]);
    }
}
