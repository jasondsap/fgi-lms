<?php
/**
 * Give Jennifer and both Josephs site-wide Manager access to Moodle (Jennifer,
 * burn-down 9-28 rows 2 and 34: "Need access for Jennifer, Joseph & Joseph").
 *
 * Creates the account if the email is unknown (auth = manual, random password,
 * forced change on first login — Moodle emails them a set-password link via
 * the "new user" flow when $sendmail is true) and assigns the Manager role in
 * the system context. Re-running is safe: existing users just get the role.
 *
 * On the box (WRITES — run it yourself, Jason; the classifier won't let me):
 *   scp -i C:/Users/Unity/fgi-moodle-key.pem scripts/moodle/add-managers.php bitnami@98.94.159.62:/tmp/
 *   ssh -i C:/Users/Unity/fgi-moodle-key.pem bitnami@98.94.159.62 'sudo -u daemon /opt/bitnami/php/bin/php /tmp/add-managers.php'
 *
 * Add --dry-run to see what would happen without changing anything.
 */
define('CLI_SCRIPT', true);
require('/opt/bitnami/moodle/config.php');
require_once($CFG->libdir . '/clilib.php');
require_once($CFG->dirroot . '/user/lib.php');

$people = [
    ['email' => 'jwhite@fletchergroup.org',  'firstname' => 'Jennifer', 'lastname' => 'White'],
    ['email' => 'jallred@fletchergroup.org', 'firstname' => 'Joseph',   'lastname' => 'Allred'],
    ['email' => 'joseph.ellis@uky.edu',      'firstname' => 'Joseph',   'lastname' => 'Ellis'],
];
$dryrun = in_array('--dry-run', $argv ?? [], true);
$sendmail = true;

$managerrole = $DB->get_record('role', ['shortname' => 'manager'], '*', MUST_EXIST);
$syscontext = context_system::instance();

foreach ($people as $p) {
    $user = $DB->get_record('user', ['email' => $p['email'], 'deleted' => 0]);
    if (!$user) {
        echo "create  {$p['email']}" . ($dryrun ? " (dry run)\n" : "\n");
        if ($dryrun) { continue; }
        $new = new stdClass();
        $new->auth = 'manual';
        $new->confirmed = 1;
        $new->mnethostid = $CFG->mnet_localhost_id;
        $new->username = strtolower($p['email']);
        $new->email = $p['email'];
        $new->firstname = $p['firstname'];
        $new->lastname = $p['lastname'];
        $new->password = hash_internal_user_password(bin2hex(random_bytes(12)) . 'Aa1!');
        $new->timecreated = time();
        $new->timemodified = time();
        $id = user_create_user($new, false, true);
        set_user_preference('auth_forcepasswordchange', 1, $id);
        $user = $DB->get_record('user', ['id' => $id]);
        if ($sendmail) {
            setnew_password_and_mail($user);
        }
    } else {
        echo "exists  {$p['email']} (user {$user->id})\n";
    }
    if ($dryrun) { continue; }
    if (!user_has_role_assignment($user->id, $managerrole->id, $syscontext->id)) {
        role_assign($managerrole->id, $user->id, $syscontext->id);
        echo "        -> Manager role assigned\n";
    } else {
        echo "        already a Manager\n";
    }
}
