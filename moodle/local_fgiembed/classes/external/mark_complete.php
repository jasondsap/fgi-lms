<?php
namespace local_fgiembed\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Override-complete one activity for one learner.
 *
 * Used when the learner does the work on the FGI site instead of in Moodle
 * (stored in the site's own database), and this marks the corresponding Moodle
 * activity complete so the certificate availability gate and the course
 * progress stay truthful. Two cases:
 *
 *  - the Learning Center evaluation (mod_feedback / mod_questionnaire), any
 *    course — allowed by module type (1.2.0);
 *  - a course acknowledgment (1.3.0, 10-18-26: the Colorado certification
 *    prerequisites, which used to be a Yes/No quiz) — allowed by an explicit
 *    cmid allow-list in plugin config:
 *      php admin/cli/cfg.php --component=local_fgiembed --name=ack_cmids --set=804
 *    Comma-separated cmids. Those activities must NOT complete on a grade:
 *    an override can only set complete / incomplete, never complete-with-pass,
 *    so their completion tracking is switched to manual and any availability
 *    condition on them uses e=1 (complete), not e=2 (pass).
 *
 * The caller (the FGI server, via the fgi_frontend service token) restricts
 * itself to those activities; this function refuses everything else as
 * defence in depth — a real quiz can never be self-completed this way.
 */
class mark_complete extends external_api {

    /** Module types the site evaluation may complete on a learner's behalf. */
    const ALLOWED_MODNAMES = ['feedback', 'questionnaire'];

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'cmid'   => new external_value(PARAM_INT, 'Course-module id of the evaluation / acknowledgment activity'),
            'userid' => new external_value(PARAM_INT, 'Moodle user id of the learner'),
        ]);
    }

    /** cmids allowed by config (local_fgiembed | ack_cmids), as ints. */
    public static function allowed_cmids(): array {
        $raw = (string) get_config('local_fgiembed', 'ack_cmids');
        return array_values(array_filter(array_map('intval', preg_split('/[\s,]+/', $raw))));
    }

    public static function execute(int $cmid, int $userid): array {
        // $CFG must be in scope: completionlib's own includes resolve through
        // $CFG->dirroot (the 9-2-26 bug — without it PHP died mid-require).
        global $DB, $CFG;
        require_once($CFG->dirroot . '/lib/completionlib.php');

        $params = self::validate_parameters(self::execute_parameters(), ['cmid' => $cmid, 'userid' => $userid]);

        [$course, $cm] = get_course_and_cm_from_cmid($params['cmid']);
        $context = \context_course::instance($course->id);
        self::validate_context($context);
        require_capability('moodle/course:overridecompletion', $context);

        $bytype = in_array($cm->modname, self::ALLOWED_MODNAMES, true);
        $bycmid = in_array((int) $cm->id, self::allowed_cmids(), true);
        if (!$bytype && !$bycmid) {
            throw new \invalid_parameter_exception('Not an evaluation or acknowledgment activity: ' . $cm->modname . ' cm ' . $cm->id);
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
