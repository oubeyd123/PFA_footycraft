<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/models/User.php';

                                                                 
require_once ROOT_DIR . '/config/database.php';
global $cnx;

if (($_GET['group'] ?? '') === 'auth') {
    $action = $_GET['action'] ?? '';
    if ($action === 'register') {
        auth_register();
    } elseif ($action === 'login') {
        auth_login();
    } elseif ($action === 'logout') {
        auth_logout();
    } elseif ($action === 'me') {
        auth_me();
    } elseif ($action === 'google') {
        auth_google();
    } elseif ($action === 'facebook') {
        auth_facebook();
    } elseif ($action === 'apple') {
        auth_apple();
    } else {
        send_err('Not found', 404);
    }
}

function auth_register(): void
{
    global $cnx;

    if (is_maintenance_mode()) {
        send_err('MAINTENANCE_MODE', 503);
    }

    $username = safe_str($_POST['username'] ?? '');
    $email = strtolower(safe_str($_POST['email'] ?? ''));
    $password = safe_str($_POST['password'] ?? '');

    if ($username === '' || $email === '' || $password === '') {
        send_err('Username, email and password required');
    }

    if (strlen($password) < 6) {
        send_err('Password must be at least 6 characters');
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        send_err('Invalid email');
    }

    $stmt = $cnx->prepare('SELECT id FROM users WHERE username=? LIMIT 1');
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        send_err('Username already taken');
    }

    $stmt = $cnx->prepare('SELECT id FROM users WHERE email=? LIMIT 1');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        send_err('Email already registered');
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $cnx->prepare('INSERT INTO users (username, email, password_hash) VALUES (?,?,?) RETURNING *');
    $stmt->execute([$username, $email, $passwordHash]);
    $user = $stmt->fetch();

    if (!$user) {
        send_err('Failed to create user', 500);
    }

    $token = create_session((int) $user['id']);

                                                
    give_starter_pack((int) $user['id']);

    unset($user['password_hash']);

    send_ok([
        'token' => $token,
        'user' => $user,
    ]);
}

function give_starter_pack(int $user_id): void
{
    global $cnx;

    $starterPositions = [
        ['GK', 1],
        ['LB', 1],
        ['CB', 2],
        ['RB', 1],
        ['CM', 3],
        ['LW', 1],
        ['ST', 2],
        ['RW', 1],
    ];

    foreach ($starterPositions as [$position, $count]) {
        $stmt = $cnx->prepare(
            "SELECT id FROM players WHERE position=? AND rarity IN ('common','rare')
             ORDER BY overall DESC OFFSET 10 LIMIT ?"
        );
        $stmt->execute([$position, $count * 5]);
        $candidates = $stmt->fetchAll();

        if (!$candidates) {
            continue;
        }

        shuffle($candidates);

        $insertStmt = $cnx->prepare('INSERT INTO user_players (user_id, player_id, source) VALUES (?,?,?)');
        foreach (array_slice($candidates, 0, $count) as $player) {
            $insertStmt->execute([$user_id, $player['id'], 'starter']);
        }
    }
}

function auth_login(): void
{
    global $cnx;

    $email = strtolower(safe_str($_POST['email'] ?? ''));
    $password = safe_str($_POST['password'] ?? '');

    if ($email === '' || $password === '') {
        send_err('Email and password required');
    }

    $defaultAdmin = default_admin_credentials();
    if ($email === strtolower($defaultAdmin['email'])) {
        ensure_default_admin_account($cnx);
    }

    $stmt = $cnx->prepare('SELECT * FROM users WHERE email=? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    $ok = $user && password_verify($password, (string) ($user['password_hash'] ?? ''));
    if (!$ok && $user) {
        $ok = md5($password) === (string) ($user['password_hash'] ?? '');
    }

    if (!$user || !$ok) {
        send_err('Invalid credentials', 401);
    }

    enforce_maintenance_access($user);

    send_authenticated_user($user);
}

function auth_logout(): void
{
    global $cnx;

    $token = get_token();

    if ($token) {
        $stmt = $cnx->prepare('DELETE FROM sessions WHERE session_token=?');
        $stmt->execute([$token]);
    }

    remove_session_cookie();
    send_ok(['message' => 'Logged out']);
}

function auth_me(): void
{
    $user = current_user();

    if (!$user) {
        send_err('Unauthorized', 401);
    }

    unset($user['password_hash']);

    send_ok(['user' => $user]);
}

function auth_google(): void
{
    global $cnx;

    $accessToken = safe_str($_POST['access_token'] ?? '');

    if ($accessToken === '') {
        send_err('Access token required');
    }

    $googleUser = verify_google_token($accessToken);

    if (!$googleUser) {
        send_err('Invalid Google token');
    }

    $stmt = $cnx->prepare('SELECT * FROM users WHERE google_id=? OR email=? LIMIT 1');
    $stmt->execute([$googleUser['id'], $googleUser['email']]);
    $user = $stmt->fetch();

    if (!$user) {
        if (is_maintenance_mode()) {
            send_err('MAINTENANCE_MODE', 503);
        }

        $stmt = $cnx->prepare(
            'INSERT INTO users (username, email, google_id, auth_provider, first_name, last_name, profile_picture_url)
             VALUES (?,?,?,?,?,?,?) RETURNING *'
        );
        $stmt->execute([
            generate_unique_username($googleUser['email']),
            $googleUser['email'],
            $googleUser['id'],
            'google',
            $googleUser['given_name'] ?? '',
            $googleUser['family_name'] ?? '',
            $googleUser['picture'] ?? '',
        ]);
        $user = $stmt->fetch();

        if (!$user) {
            send_err('Failed to create user', 500);
        }

        give_starter_pack((int) $user['id']);
        send_authenticated_user($user);
        return;
    }

    if (!$user['google_id']) {
        $stmt = $cnx->prepare(
            'UPDATE users SET google_id=?, auth_provider=COALESCE(auth_provider, ?),
             first_name=COALESCE(first_name, ?), last_name=COALESCE(last_name, ?),
             profile_picture_url=COALESCE(profile_picture_url, ?)
             WHERE id=?'
        );
        $stmt->execute([
            $googleUser['id'],
            'google',
            $googleUser['given_name'] ?? $user['first_name'],
            $googleUser['family_name'] ?? $user['last_name'],
            $googleUser['picture'] ?? $user['profile_picture_url'],
            $user['id'],
        ]);
    }

    send_authenticated_user($user);
}

function auth_facebook(): void
{
    global $cnx;

    $accessToken = safe_str($_POST['access_token'] ?? '');

    if ($accessToken === '') {
        send_err('Access token required');
    }

    $facebookUser = verify_facebook_token($accessToken);

    if (!$facebookUser) {
        send_err('Invalid Facebook token');
    }

    $stmt = $cnx->prepare('SELECT * FROM users WHERE facebook_id=? OR email=? LIMIT 1');
    $stmt->execute([$facebookUser['id'], $facebookUser['email']]);
    $user = $stmt->fetch();

    if (!$user) {
        if (is_maintenance_mode()) {
            send_err('MAINTENANCE_MODE', 503);
        }

        $stmt = $cnx->prepare(
            'INSERT INTO users (username, email, facebook_id, auth_provider, first_name, last_name, profile_picture_url)
             VALUES (?,?,?,?,?,?,?) RETURNING *'
        );
        $stmt->execute([
            generate_unique_username($facebookUser['email']),
            $facebookUser['email'],
            $facebookUser['id'],
            'facebook',
            $facebookUser['first_name'] ?? '',
            $facebookUser['last_name'] ?? '',
            $facebookUser['picture']['data']['url'] ?? '',
        ]);
        $user = $stmt->fetch();

        if (!$user) {
            send_err('Failed to create user', 500);
        }

        give_starter_pack((int) $user['id']);
        send_authenticated_user($user);
        return;
    }

    if (!$user['facebook_id']) {
        $stmt = $cnx->prepare(
            'UPDATE users SET facebook_id=?, auth_provider=COALESCE(auth_provider, ?),
             first_name=COALESCE(first_name, ?), last_name=COALESCE(last_name, ?),
             profile_picture_url=COALESCE(profile_picture_url, ?)
             WHERE id=?'
        );
        $stmt->execute([
            $facebookUser['id'],
            'facebook',
            $facebookUser['first_name'] ?? $user['first_name'],
            $facebookUser['last_name'] ?? $user['last_name'],
            $facebookUser['picture']['data']['url'] ?? $user['profile_picture_url'],
            $user['id'],
        ]);
    }

    send_authenticated_user($user);
}

function auth_apple(): void
{
    global $cnx;

    $idToken = safe_str($_POST['id_token'] ?? '');

    if ($idToken === '') {
        send_err('ID token required');
    }

    $appleUser = verify_apple_token($idToken);

    if (!$appleUser) {
        send_err('Invalid Apple token');
    }

    $stmt = $cnx->prepare('SELECT * FROM users WHERE apple_id=? LIMIT 1');
    $stmt->execute([$appleUser['sub']]);
    $user = $stmt->fetch();

    if (!$user) {
        if (is_maintenance_mode()) {
            send_err('MAINTENANCE_MODE', 503);
        }

        $email = $appleUser['email'] ?? null;
        $username = $email !== null
            ? generate_unique_username($email)
            : 'apple_user_' . rand(1000, 9999);

        $stmt = $cnx->prepare(
            'INSERT INTO users (username, email, apple_id, auth_provider, first_name, last_name)
             VALUES (?,?,?,?,?,?) RETURNING *'
        );
        $stmt->execute([
            $username,
            $email,
            $appleUser['sub'],
            'apple',
            $appleUser['given_name'] ?? '',
            $appleUser['family_name'] ?? '',
        ]);
        $user = $stmt->fetch();

        if (!$user) {
            send_err('Failed to create user', 500);
        }

        give_starter_pack((int) $user['id']);
    }

    send_authenticated_user($user);
}

function verify_google_token(string $access_token): ?array
{
    return fetch_json_from_url(
        'https://www.googleapis.com/oauth2/v2/userinfo?access_token=' . urlencode($access_token),
        'id'
    );
}

function verify_facebook_token(string $access_token): ?array
{
    return fetch_json_from_url(
        'https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture&access_token=' . urlencode($access_token),
        'id'
    );
}

function verify_apple_token(string $id_token): ?array
{
                                                     
    $parts = explode('.', $id_token);

    if (count($parts) !== 3) {
        return null;
    }

    $payload = json_decode(
        base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])),
        true
    );

    return is_array($payload) && isset($payload['sub']) ? $payload : null;
}

function generate_unique_username(string $email): string
{
    global $cnx;

    $base = explode('@', $email)[0];
    $base = preg_replace('/[^a-zA-Z0-9]/', '', $base);
    $username = $base;
    $counter = 1;

    while (true) {
        $stmt = $cnx->prepare('SELECT id FROM users WHERE username=? LIMIT 1');
        $stmt->execute([$username]);
        if (!$stmt->fetch()) {
            return $username;
        }

        $username = $base . $counter;
        $counter++;
    }
}

function create_session(int $userId): string
{
    global $cnx;

    $token = rand_token();
    $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));

    $stmt = $cnx->prepare('INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?,?,?)');
    $stmt->execute([$userId, $token, $expiresAt]);

    set_session_cookie($token);

    return $token;
}

function send_authenticated_user(array $user): void
{
                                           
    check_user_status($user);
    enforce_maintenance_access($user);
    
    $token = create_session((int) $user['id']);
    unset($user['password_hash']);

    send_ok([
        'token' => $token,
        'user' => $user,
    ]);
}

function check_user_status(array $user): void
{
    global $cnx;
    
    $status = (string) ($user['status'] ?? 'active');
    $timeout_until = $user['timeout_until'] ?? null;
    
                                          
    if ($status === 'banned') {
        send_err('Your account has been banned. Contact support for more information.', 403);
    }
    
                                 
    if ($status === 'timeout') {
        if ($timeout_until) {
            $timeout_time = strtotime($timeout_until);
            $now = time();
            
                                                                   
            if ($now >= $timeout_time) {
                $stmt = $cnx->prepare('UPDATE users SET status = ?, timeout_until = NULL WHERE id = ?');
                $stmt->execute(['active', $user['id']]);
            } else {
                                                     
                $hours_left = ceil(($timeout_time - $now) / 3600);
                send_err("Your account is timed out for {$hours_left} more hours. Try again later.", 403);
            }
        } else {
                                                              
            $stmt = $cnx->prepare('UPDATE users SET status = ? WHERE id = ?');
            $stmt->execute(['active', $user['id']]);
        }
    }
}

function fetch_json_from_url(string $url, string $requiredKey): ?array
{
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => 'Accept: application/json',
            'timeout' => 10,
        ],
    ]);

    $response = file_get_contents($url, false, $context);

    if (!$response) {
        return null;
    }

    $data = json_decode($response, true);

    return is_array($data) && isset($data[$requiredKey]) ? $data : null;
}
