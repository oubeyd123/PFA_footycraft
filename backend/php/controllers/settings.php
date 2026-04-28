<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/models/User.php';

require_once ROOT_DIR . '/config/database.php';
global $cnx;
if (($_GET['group'] ?? '') === 'settings') {
    $action = $_GET['action'] ?? '';
    if ($action === 'change_email') {
        settings_change_email();
    } elseif ($action === 'change_password') {
        settings_change_password();
    } elseif ($action === 'delete_account') {
        settings_delete_account();
    } elseif ($action === 'complete_onboarding') {
        settings_complete_onboarding();
    } else {
        send_err('Not found', 404);
    }
}

function settings_change_email(): void {
    global $cnx;
    $user      = require_auth();
    $post_data = $_POST;
    if (empty($post_data)) {
        $json = file_get_contents('php://input');
        if ($json) $post_data = json_decode($json, true) ?? [];
    }

    $new_email = strtolower(safe_str($post_data['email'] ?? ''));
    $password  = safe_str($post_data['password'] ?? '');

    if (!$new_email || !$password) send_err('Email and current password required');
    if (!filter_var($new_email, FILTER_VALIDATE_EMAIL)) send_err('Invalid email');

    $stmt = $cnx->prepare('SELECT password_hash FROM users WHERE id=? LIMIT 1');
    $stmt->execute([$user['id']]);
    $u = $stmt->fetch();
    if (!password_verify($password, $u['password_hash'])) send_err('Incorrect password');

    $stmt2 = $cnx->prepare('SELECT id FROM users WHERE email=? AND id!=? LIMIT 1');
    $stmt2->execute([$new_email, $user['id']]);
    $existing = $stmt2->fetch();
    if ($existing) send_err('Email already in use');

    $stmt3 = $cnx->prepare('UPDATE users SET email=? WHERE id=?');
    $stmt3->execute([$new_email, $user['id']]);
    send_ok(['message' => 'Email updated']);
}

function settings_change_password(): void {
    global $cnx;
    $user       = require_auth();
    $post_data = $_POST;
    if (empty($post_data)) {
        $json = file_get_contents('php://input');
        if ($json) $post_data = json_decode($json, true) ?? [];
    }

    $current_pw = safe_str($post_data['current_password'] ?? '');
    $new_pw     = safe_str($post_data['new_password'] ?? '');

    if (!$current_pw || !$new_pw) send_err('Both passwords required');
    if (strlen($new_pw) < 6) send_err('New password too short');

    $stmt = $cnx->prepare('SELECT password_hash FROM users WHERE id=? LIMIT 1');
    $stmt->execute([$user['id']]);
    $u = $stmt->fetch();
    if (!password_verify($current_pw, $u['password_hash'])) send_err('Current password incorrect');

    $new_hash = password_hash($new_pw, PASSWORD_BCRYPT);
    $stmt2 = $cnx->prepare('UPDATE users SET password_hash=? WHERE id=?');
    $stmt2->execute([$new_hash, $user['id']]);
    send_ok(['message' => 'Password updated']);
}

function settings_delete_account(): void {
    global $cnx;
    $user     = require_auth();
    $post_data = $_POST;
    if (empty($post_data)) {
        $json = file_get_contents('php://input');
        if ($json) $post_data = json_decode($json, true) ?? [];
    }

    $password = safe_str($post_data['password'] ?? '');

    $stmt = $cnx->prepare('SELECT password_hash FROM users WHERE id=? LIMIT 1');
    $stmt->execute([$user['id']]);
    $u = $stmt->fetch();
    if (!password_verify($password, $u['password_hash'])) send_err('Incorrect password');

    $stmt2 = $cnx->prepare('DELETE FROM users WHERE id=?');
    $stmt2->execute([$user['id']]);
    remove_session_cookie();
    send_ok(['message' => 'Account deleted']);
}

function settings_complete_onboarding(): void {
    global $cnx;

    $user = require_auth();
    $stmt = $cnx->prepare(
        'UPDATE users
         SET onboarding_completed_at = COALESCE(onboarding_completed_at, NOW())
         WHERE id = ?
         RETURNING onboarding_completed_at'
    );
    $stmt->execute([$user['id']]);
    $row = $stmt->fetch();

    send_ok([
        'message' => 'Onboarding marked as complete',
        'completed_at' => $row['onboarding_completed_at'] ?? null,
    ]);
}
