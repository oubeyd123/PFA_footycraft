<?php
declare(strict_types=1);

   
                           
   

function executeQuery(PDO $cnx, string $sql, array $params = []): PDOStatement
{
    $stmt = $cnx->prepare($sql);
    $stmt->execute($params);
    return $stmt;
}

function execute(PDO $cnx, string $sql, array $params = []): int
{
    $stmt = executeQuery($cnx, $sql, $params);
    return $stmt->rowCount();
}

function getRow(PDO $cnx, string $sql, array $params = []): ?array
{
    $stmt = executeQuery($cnx, $sql, $params);
    return $stmt->fetch() ?: null;
}

function getRows(PDO $cnx, string $sql, array $params = []): array
{
    $stmt = executeQuery($cnx, $sql, $params);
    return $stmt->fetchAll() ?: [];
}

                                                                       
                                   
                                                                       

function json_out(mixed $data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($data);
    exit;
}

                                                                       
function send_response(bool $success, mixed $data, ?string $error, int $code = 200): void {
    json_out(['success' => $success, 'data' => $data, 'error' => $error], $code);
}

function send_ok(mixed $data = null): void {
    send_response(true, $data, null);
}

function send_err(string $msg, int $code = 400): void {
    send_response(false, null, $msg, $code);
}

function get_platform_setting(string $key, mixed $default = null): mixed {
    global $cnx;

    if (!$cnx instanceof PDO) {
        return $default;
    }

    try {
        $stmt = $cnx->prepare('SELECT value FROM platform_settings WHERE key = ? LIMIT 1');
        $stmt->execute([$key]);
        $row = $stmt->fetch();
    } catch (Throwable $e) {
        return $default;
    }

    if (!$row || !array_key_exists('value', $row)) {
        return $default;
    }

    return $row['value'];
}

function is_staff_role(?string $role): bool {
    $normalized = strtolower(trim((string)($role ?? '')));
    return $normalized === 'admin' || $normalized === 'support';
}

function is_maintenance_mode(): bool {
    $value = get_platform_setting('maintenance_mode', '0');
    $normalized = strtolower(trim((string)$value));
    return in_array($normalized, ['1', 'true', 'yes', 'on'], true);
}

function clear_session_token(?string $token = null): void {
    global $cnx;

    $sessionToken = $token ?? get_token();
    if ($sessionToken && $cnx instanceof PDO) {
        try {
            $stmt = $cnx->prepare('DELETE FROM sessions WHERE session_token = ?');
            $stmt->execute([$sessionToken]);
        } catch (Throwable $e) {
        }
    }

    remove_session_cookie();
}

function send_maintenance_mode_error(?string $token = null): void {
    clear_session_token($token);
    send_err('MAINTENANCE_MODE', 503);
}

function enforce_maintenance_access(array $user, ?string $token = null): void {
    if (!is_maintenance_mode()) {
        return;
    }

    if (is_staff_role((string)($user['role'] ?? ''))) {
        return;
    }

    send_maintenance_mode_error($token);
}

                                                        

function get_token(): ?string {
                                                        
                                                                                   
    $header = $_SERVER['HTTP_X_FC_SESSION'] ?? null;
    $cookie = $_COOKIE['fc_session'] ?? null;
    
    return $header ?? $cookie;
}

function current_user(): ?array {
    $token = get_token();
    if (!$token) {
        return null;
    }

    global $cnx;
    $stmt = $cnx->prepare(
        "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.session_token = ? AND s.expires_at > NOW() LIMIT 1"
    );
    $stmt->execute([$token]);

    $user = $stmt->fetch() ?: null;
    if (!$user) {
        return null;
    }

    enforce_maintenance_access($user, $token);

    return $user;
}

function require_auth(): array {
    $user = current_user();
    if (!$user) {
        send_err('Unauthorized', 401);
    }

                                           
    validate_user_status($user);

    return $user;
}

function validate_user_status(array $user): void {
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

function require_admin(): array {
    $user = require_auth();
    if (($user['role'] ?? '') !== 'admin') {
        send_err('Forbidden', 403);
    }

    return $user;
}

function require_support(): array {
    $user = require_auth();
    $role = $user['role'] ?? '';
    if ($role !== 'admin' && $role !== 'support') {
        send_err('Forbidden', 403);
    }

    return $user;
}

function default_admin_credentials(): array
{
    return [
        'username' => 'admin',
        'email' => 'admin@footycraft.com',
        'password' => 'admin123',
    ];
}

function create_notification(PDO $cnx, int $userId, string $type, string $content, ?string $link = null, string $source = 'system'): void
{
    try {
        executeQuery(
            $cnx,
            'INSERT INTO notifications (user_id, type, content, link, source) VALUES (?, ?, ?, ?, ?)',
            [$userId, $type, $content, $link, $source]
        );
    } catch (Throwable $e) {
                                                                 
    }
}

function broadcast_notification(PDO $cnx, string $type, string $content, ?string $link = null, string $source = 'admin', ?int $excludeUserId = null): int
{
    try {
        $users = getRows($cnx, 'SELECT id FROM users');
        $count = 0;
        foreach ($users as $u) {
            $uid = (int)$u['id'];
            if ($excludeUserId !== null && $uid === $excludeUserId) {
                continue;
            }
            create_notification($cnx, $uid, $type, $content, $link, $source);
            $count++;
        }
        return $count;
    } catch (Throwable $e) {
        return 0;
    }
}

function moderation_detect_text(string $content): array
{
    if (trim($content) === '') {
        return ['violation' => false, 'reason' => '', 'severity' => 'none'];
    }

    $descriptorSpec = [
        0 => ["pipe", "r"],
        1 => ["pipe", "w"],
        2 => ["pipe", "w"]
    ];

    $process = proc_open('python3 ' . ROOT_DIR . '/detector/main.py', $descriptorSpec, $pipes);

    if (is_resource($process)) {
        fwrite($pipes[0], json_encode(['text' => $content]));
        fclose($pipes[0]);

        $output = stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        
        $error = stream_get_contents($pipes[2]);
        fclose($pipes[2]);

        proc_close($process);

        $result = json_decode($output, true);
        if ($result && isset($result['violation']) && $result['violation'] === true) {
            $matches = $result['matches'] ?? [];
            $reasonText = empty($matches) ? 'policy violation' : implode(', ', $matches);
            return [
                'violation' => true,
                'reason' => 'inappropriate content spotted: ' . $reasonText,
                'severity' => 'yellow'
            ];
        }
    }

    return ['violation' => false, 'reason' => '', 'severity' => 'none'];
}

function moderation_apply_violation(PDO $cnx, int $userId, string $reason = 'policy violation', string $severity = 'yellow'): array
{
    executeQuery(
        $cnx,
        'INSERT INTO community_moderation_strikes (user_id, reason, severity) VALUES (?, ?, ?)',
        [$userId, $reason, $severity]
    );

    $row = getRow(
        $cnx,
        "SELECT
            SUM(CASE WHEN severity = 'yellow' THEN 1 ELSE 0 END) AS yellow_count,
            SUM(CASE WHEN severity = 'red' THEN 1 ELSE 0 END) AS red_count
         FROM community_moderation_strikes
         WHERE user_id = ?",
        [$userId]
    );

    $yellowCount = (int)($row['yellow_count'] ?? 0);
    $redCount = (int)($row['red_count'] ?? 0);


    $is_red_card = $redCount > 0 || $yellowCount >= 3;
    

    if ($yellowCount >= 3 && $redCount === 0) {
        executeQuery(
            $cnx,
            'WITH limited_strikes AS (
                SELECT id FROM community_moderation_strikes 
                WHERE user_id = $2 AND severity = $3 
                LIMIT 3
            )
            UPDATE community_moderation_strikes SET severity = $1 
            WHERE id IN (SELECT id FROM limited_strikes)',
            ['red', $userId, 'yellow']
        );
        $redCount = 1;
    }

    $notificationMsg = '';
    if ($redCount > 0) {
        $notificationMsg = "You have received a RED CARD and your account has been banned for: $reason.";

        executeQuery(
            $cnx,
            'UPDATE users SET status = ? WHERE id = ?',
            ['banned', $userId]
        );
    } else {
        $notificationMsg = "You have received a YELLOW CARD warning ($yellowCount/3) for: $reason. Receive 3 yellow cards to get banned.";
    }

    create_notification(
        $cnx,
        $userId,
        $is_red_card ? 'red_card' : 'yellow_card',
        $notificationMsg,
        '#community'
    );

    return [
        'yellow_count' => $is_red_card ? 0 : $yellowCount,
        'red_count' => $is_red_card ? 1 : 0,
        'red_card' => $is_red_card,
        'severity' => $is_red_card ? 'red' : 'yellow',
        'reason' => $reason,
    ];
}

function ensure_default_admin_account(?PDO $cnx = null): ?array
{
    if (!$cnx instanceof PDO) {
        $cnx = $GLOBALS['cnx'] ?? null;
    }

    if (!$cnx instanceof PDO) {
        return null;
    }
    $defaults = default_admin_credentials();

    $user = getRow(
        $cnx,
        'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
        [$defaults['email']]
    );

    $passwordHash = password_hash($defaults['password'], PASSWORD_BCRYPT);

    if (!$user) {
        executeQuery(
            $cnx,
            'INSERT INTO users (username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
            [$defaults['username'], $defaults['email'], $passwordHash, 'admin', 'active']
        );
    } else {
        $updates = [];
        $params = [];
        $storedHash = (string)($user['password_hash'] ?? '');
        $passwordMatches = false;

        if ($storedHash !== '') {
            $passwordMatches = password_verify($defaults['password'], $storedHash)
                || md5($defaults['password']) === $storedHash;
        }

        $needsPasswordRefresh = !$passwordMatches;
        if (!$needsPasswordRefresh && password_get_info($storedHash)['algo'] !== PASSWORD_BCRYPT) {
            $needsPasswordRefresh = true;
        }

        if (($user['username'] ?? '') !== $defaults['username']) {
            $updates[] = 'username = ?';
            $params[] = $defaults['username'];
        }

        if ($needsPasswordRefresh) {
            $updates[] = 'password_hash = ?';
            $params[] = $passwordHash;
        }

        if (($user['role'] ?? '') !== 'admin') {
            $updates[] = 'role = ?';
            $params[] = 'admin';
        }

        if (($user['status'] ?? '') !== 'active') {
            $updates[] = 'status = ?';
            $params[] = 'active';
        }

        if (!empty($user['timeout_until'])) {
            $updates[] = 'timeout_until = ?';
            $params[] = null;
        }

        if ($updates) {
            $params[] = $user['id'];
            $sql = 'UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?';
            executeQuery($cnx, $sql, $params);
        }
    }

    return getRow(
        $cnx,
        'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
        [$defaults['email']]
    );
}

function set_session_cookie(string $token): void {
    setcookie('fc_session', $token, [
        'expires'  => time() + 30 * 86400,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function remove_session_cookie(): void {
    setcookie('fc_session', '', ['expires' => time() - 3600, 'path' => '/']);
}

                                                                       
                           
                                                                       

function safe_str(mixed $v): string {
    return trim((string) ($v ?? ''));
}

function rand_token(): string {
    return bin2hex(random_bytes(48));
}

function rand_float(): float {
    return mt_rand() / mt_getrandmax();
}

function rand_uniform(float $lo, float $hi): float {
    return $lo + rand_float() * ($hi - $lo);
}

function array_random(array $arr): mixed {
    if (empty($arr)) {
        return null;
    }

    return $arr[array_rand($arr)];
}

function weighted_choice(array $choices, array $weights): mixed {
    $total = array_sum($weights);
    $r = rand_float() * $total;
    $cum = 0.0;

    foreach ($choices as $i => $choice) {
        $cum += $weights[$i] ?? 0;
        if ($r <= $cum) {
            return $choice;
        }
    }

    return end($choices);
}
