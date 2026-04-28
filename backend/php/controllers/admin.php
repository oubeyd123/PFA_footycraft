<?php
declare(strict_types=1);
error_reporting(0);
ini_set('display_errors', '0');

require_once dirname(__DIR__) . '/models/Admin.php';
require_once dirname(__DIR__) . '/models/Player.php';
require_once dirname(__DIR__) . '/models/CommunityPost.php';
require_once dirname(__DIR__) . '/models/CommunityComment.php';
require_once dirname(__DIR__) . '/models/CommunityReport.php';


global $cnx;

if (($_GET['group'] ?? '') === 'admin') {
    $action = $_GET['action'] ?? '';
    
    try {
        switch ($action) {
            case 'dashboard':
                admin_dashboard();
                break;
            case 'users_list':
                admin_users_list();
                break;
            case 'users_ban':
                admin_users_ban();
                break;
            case 'users_unban':
                admin_users_unban();
                break;
            case 'users_timeout':
                admin_users_timeout();
                break;
            case 'users_delete':
                admin_users_delete();
                break;
            case 'users_edit':
                admin_users_edit();
                break;
            case 'players_list':
                admin_players_list();
                break;
            case 'players_add':
                admin_players_add();
                break;
            case 'players_edit':
                admin_players_edit();
                break;
            case 'players_delete':
                admin_players_delete();
                break;
            case 'announcements_list':
                admin_announcements_list();
                break;
            case 'announcements_add':
                admin_announcements_add();
                break;
            case 'announcements_delete':
                admin_announcements_delete();
                break;
            case 'settings_get':
                admin_settings_get();
                break;
            case 'settings_update':
                admin_settings_update();
                break;
            case 'reports_list':
                admin_reports_list();
                break;
            case 'roles_list':
                admin_roles_list();
                break;
            case 'roles_assign':
                admin_roles_assign();
                break;
            case 'role_requests_list':
                admin_role_requests_list();
                break;
            case 'role_requests_approve':
                admin_role_requests_approve();
                break;
            case 'role_requests_reject':
                admin_role_requests_reject();
                break;
            case 'community_posts_list':
                admin_community_posts_list();
                break;
            case 'community_posts_delete':
                admin_community_posts_delete();
                break;
            case 'community_comments_delete':
                admin_community_comments_delete();
                break;
            case 'community_reports_list':
                admin_community_reports_list();
                break;
            case 'community_reports_create':
                admin_community_reports_create();
                break;
            case 'community_reports_resolve':
                admin_community_reports_resolve();
                break;
            case 'send_notification':
                admin_send_notification();
                break;
            default:
                send_err('Action not found', 404);
        }
    } catch (Throwable $e) {
        send_err('Admin error: ' . $e->getMessage());
    }
}

function admin_now_expression(PDO $cnx): string {
    return ((string) $cnx->getAttribute(PDO::ATTR_DRIVER_NAME)) === 'pgsql' ? 'NOW()' : 'CURRENT_TIMESTAMP';
}

function normalize_platform_role(string $role): ?string {
    $normalized = strtolower(trim($role));

    return match ($normalized) {
        'admin', 'administrator' => 'admin',
        'support', 'support staff' => 'support',
        'user', 'player', '' => 'player',
        default => null,
    };
}

function platform_role_label(string $role): string {
    return match (normalize_platform_role($role) ?? 'player') {
        'admin' => 'Administrator',
        'support' => 'Support',
        default => 'User',
    };
}

function admin_get_user_by_id(PDO $cnx, int $userId): ?array {
    $stmt = $cnx->prepare('SELECT id, username, email, role, status, timeout_until FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function admin_assert_manageable_target(PDO $cnx, array $actor, int $targetUserId): array {
    if ($targetUserId <= 0) {
        send_err('Invalid user ID');
    }

    $target = admin_get_user_by_id($cnx, $targetUserId);
    if (!$target) {
        send_err('User not found', 404);
    }

    $actorRole = (string) ($actor['role'] ?? '');
    $actorId = (int) ($actor['id'] ?? 0);
    $targetRole = strtolower((string) ($target['role'] ?? 'player'));

    if ($actorId === (int) $target['id']) {
        send_err('You cannot apply this action to your own account', 403);
    }

    if ($actorRole !== 'admin' && in_array($targetRole, ['admin', 'support'], true)) {
        send_err('Support cannot moderate admin/support accounts', 403);
    }

    return $target;
}

   
                      
   
function admin_dashboard(): void {
    global $cnx;
    require_admin();
    
    try {
                      
        $stmt = $cnx->prepare('SELECT COUNT(*) as count FROM users');
        $stmt->execute([]);
        $result = $stmt->fetch();
        $totalUsers = isset($result['count']) ? (int)$result['count'] : 0;
        
                                                     
        $stmt = $cnx->prepare('SELECT COUNT(DISTINCT player_id) as count FROM user_players');
        $stmt->execute([]);
        $result = $stmt->fetch();
        $activePlayers = isset($result['count']) ? (int)$result['count'] : 0;
        
                        
        $stmt = $cnx->prepare('SELECT COUNT(*) as count FROM matches');
        $stmt->execute([]);
        $result = $stmt->fetch();
        $totalMatches = isset($result['count']) ? (int)$result['count'] : 0;
        
                                                               
        $pendingReports = 0;
        try {
            $stmt = $cnx->prepare('SELECT COUNT(*) as count FROM community_reports WHERE target_type = ? AND status = ?');
            $stmt->execute(['post', 'open']);
            $result = $stmt->fetch();
            $pendingReports = isset($result['count']) ? (int)$result['count'] : 0;
        } catch (Throwable $e) {
            error_log("Error fetching pending reports: " . $e->getMessage());
            $pendingReports = 0;
        }
        
                       
        $recentUsers = [];
        try {
            $stmt = $cnx->prepare('SELECT id, email, username, created_at FROM users ORDER BY created_at DESC LIMIT 10');
            $stmt->execute([]);
            $recentUsers = $stmt->fetchAll();
        } catch (Throwable $e) {
            error_log("Error fetching recent users: " . $e->getMessage());
        }

                           
        $topContributors = [];
        try {
            $stmt = $cnx->prepare("
                SELECT sub.id, sub.username, sub.rep
                FROM (
                    SELECT u.id, u.username,
                           COALESCE((SELECT COUNT(*) FROM community_posts WHERE user_id = u.id), 0) * 5 +
                           COALESCE((SELECT COUNT(*) FROM community_comments WHERE user_id = u.id), 0) * 2 +
                           COALESCE((SELECT SUM(likes_count) FROM community_posts WHERE user_id = u.id), 0) +
                           COALESCE((SELECT SUM(likes_count) FROM community_comments WHERE user_id = u.id), 0) as rep
                    FROM users u
                    WHERE u.role != 'admin' OR u.role IS NULL
                ) sub
                WHERE sub.rep > 0
                ORDER BY sub.rep DESC
                LIMIT 5
            ");
            $stmt->execute([]);
            $topContributors = $stmt->fetchAll();
        } catch (Throwable $e) {
            error_log("Error fetching top contributors: " . $e->getMessage());
        }
        
                                          
        $activity = [];
        $maxActivity = 0;
        
        for ($i = 6; $i >= 0; $i--) {
            $dateStart = date('Y-m-d', strtotime("-$i days"));
            $dateEnd = date('Y-m-d', strtotime("-" . ($i - 1) . " days"));
            $dayLabel = date('D', strtotime("-$i days"));
            
            try {
                $cMatches = $cnx->prepare("SELECT COUNT(*) as c FROM matches WHERE created_at >= ?::timestamp AND created_at < ?::timestamp");
                $cMatches->execute([$dateStart, $dateEnd]);
                $mc = (int)(($cMatches->fetch()['c']) ?? 0);
            } catch (Throwable $e) {
                $mc = 0;
            }

            try {
                $cUsers = $cnx->prepare("SELECT COUNT(*) as c FROM users WHERE created_at >= ?::timestamp AND created_at < ?::timestamp");
                $cUsers->execute([$dateStart, $dateEnd]);
                $uc = (int)(($cUsers->fetch()['c']) ?? 0);
            } catch (Throwable $e) {
                $uc = 0;
            }

            $pc = 0;
            try {
                $cPosts = $cnx->prepare("SELECT COUNT(*) as c FROM community_posts WHERE created_at >= ?::timestamp AND created_at < ?::timestamp");
                $cPosts->execute([$dateStart, $dateEnd]);
                $pc = (int)(($cPosts->fetch()['c']) ?? 0);
            } catch (Throwable $e) {
                $pc = 0;
            }

            $total = $mc + $uc + $pc;
            if ($total > $maxActivity) {
                $maxActivity = $total;
            }

            $activity[] = [
                'date' => $dateStart,
                'day' => $dayLabel,
                'count' => $total
            ];
        }

        send_ok([
            'total_users' => (int)$totalUsers,
            'active_players' => (int)$activePlayers,
            'total_matches' => (int)$totalMatches,
            'pending_reports' => (int)$pendingReports,
            'recent_users' => $recentUsers,
            'top_contributors' => $topContributors,
            'platform_activity' => $activity,
            'max_activity' => $maxActivity > 0 ? $maxActivity : 1
        ]);
    } catch (Throwable $e) {
        error_log("Admin dashboard error: " . $e->getMessage());
        send_err("Dashboard error: " . $e->getMessage());
    }
}

   
                            
   
function admin_users_list(): void {
    global $cnx;
    require_support();
    
    $search = safe_str($_GET['search'] ?? '');
    $status = strtolower(safe_str($_GET['status'] ?? 'all'));
    if (!in_array($status, ['all', 'active', 'timeout', 'banned'], true)) {
        $status = 'all';
    }
    $page = (int)($_GET['page'] ?? 1);
    $per_page = max(1, min(500, (int)($_GET['per_page'] ?? 20)));
    $offset = ($page - 1) * $per_page;
    
    $query = 'SELECT id, email, username, role, status, timeout_until, created_at FROM users';
    $params = [];
    $conditions = [];
    $driver = (string)$cnx->getAttribute(PDO::ATTR_DRIVER_NAME);
    
    if ($search) {
        if ($driver === 'pgsql') {
            $conditions[] = '(email ILIKE ? OR username ILIKE ? OR CAST(id AS TEXT) LIKE ?)';
        } else {
            $conditions[] = '(email LIKE ? OR username LIKE ? OR CAST(id AS TEXT) LIKE ?)';
        }
        $searchTerm = '%' . $search . '%';
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }

    if ($status !== 'all') {
        $conditions[] = 'status = ?';
        $params[] = $status;
    }

    if (!empty($conditions)) {
        $query .= ' WHERE ' . implode(' AND ', $conditions);
    }
    
    $query .= ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    $params[] = $per_page;
    $params[] = $offset;
    
    $stmt = $cnx->prepare($query);
    $stmt->execute($params);
    $users = $stmt->fetchAll();
    
    send_ok(['users' => $users, 'page' => $page]);
}

function admin_users_ban(): void {
    global $cnx;
    $actor = require_admin();
    
    $user_id = (int)($_POST['user_id'] ?? 0);
    $targetUser = admin_assert_manageable_target($cnx, $actor, $user_id);
    
                                   
    try {
        $stmt = $cnx->prepare('UPDATE users SET status = ? WHERE id = ?');
        $stmt->execute(['banned', $user_id]);
        
                                   
        $userStmt = $cnx->prepare('SELECT id, username, email, role, status FROM users WHERE id = ?');
        $userStmt->execute([$user_id]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);
        
        send_ok([
            'message' => 'User has been banned',
            'user' => $user
        ]);
    } catch (Exception $e) {
        send_err('Failed to ban user: ' . $e->getMessage());
    }

                             
    create_notification($cnx, $user_id, 'admin', 'Your account has been permanently banned by support/admin. Contact support if you believe this is an error.', null, 'admin');
}
function admin_users_unban(): void {
    global $cnx;
    $actor = require_admin();
    
    $user_id = (int)($_POST['user_id'] ?? 0);
    $targetUser = admin_assert_manageable_target($cnx, $actor, $user_id);
    
    try {
        $stmt = $cnx->prepare('UPDATE users SET status = \'active\', timeout_until = NULL WHERE id = ?');
        $stmt->execute([$user_id]);
        
        $userStmt = $cnx->prepare('SELECT id, username, email, role, status FROM users WHERE id = ?');
        $userStmt->execute([$user_id]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);
        
        send_ok([
            'message' => 'Ban/Timeout has been lifted',
            'user' => $user
        ]);

                                                       
        create_notification($cnx, $user_id, 'admin', 'Your account restriction has been lifted. Welcome back!', null, 'admin');
    } catch (PDOException $e) {
        send_err('Database error: ' . $e->getMessage());
    }
}
function admin_users_timeout(): void {
    global $cnx;
    $actor = require_admin();
    
    $user_id = (int)($_POST['user_id'] ?? 0);
    $hours = (int)($_POST['hours'] ?? 24);
    
    if ($hours < 1 || $hours > 8760) {              
        send_err('Hours must be between 1 and 8760');
    }
    
    $targetUser = admin_assert_manageable_target($cnx, $actor, $user_id);
    
    try {
                                           
        $timeout_until = date('Y-m-d H:i:s', time() + $hours * 3600);
        
        $stmt = $cnx->prepare('UPDATE users SET status = ?, timeout_until = ? WHERE id = ?');
        $stmt->execute(['timeout', $timeout_until, $user_id]);
        
                                   
        $userStmt = $cnx->prepare('SELECT id, username, email, role, status, timeout_until FROM users WHERE id = ?');
        $userStmt->execute([$user_id]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);
        
        send_ok([
            'message' => "User timed out for {$hours} hours until {$timeout_until}",
            'user' => $user,
            'timeout_until' => $timeout_until
        ]);

                                    
        create_notification($cnx, $user_id, 'admin', "Your account has been timed out for {$hours} hours by an administrator.", null, 'admin');
    } catch (Exception $e) {
        send_err('Failed to timeout user: ' . $e->getMessage());
    }
}

function admin_users_delete(): void {
    global $cnx;
    $actor = require_admin();
    
    $user_id = (int)($_POST['user_id'] ?? 0);
    $targetUser = admin_assert_manageable_target($cnx, $actor, $user_id);
    
    $stmt = $cnx->prepare('DELETE FROM users WHERE id=?');
    $stmt->execute([$user_id]);
    
    send_ok(['message' => 'User deleted']);
}

function admin_users_edit(): void {
    global $cnx;
    $actor = require_support();
    
    $user_id = (int)($_POST['user_id'] ?? 0);
    $requestedRole = normalize_platform_role(safe_str($_POST['role'] ?? 'player'));
    $reason = safe_str($_POST['reason'] ?? '');
    
    if (!$user_id) {
        send_err('Invalid user ID');
    }

    if ($requestedRole === null) {
        send_err('Invalid role');
    }

    $targetUser = admin_get_user_by_id($cnx, $user_id);
    if (!$targetUser) {
        send_err('User not found', 404);
    }

    $actorRole = strtolower((string)($actor['role'] ?? ''));
    $targetRole = strtolower((string)($targetUser['role'] ?? 'player'));
    $targetCurrentRole = normalize_platform_role($targetRole) ?? 'player';

    if ($actorRole !== 'admin') {
        if ($user_id === (int)$actor['id']) {
            send_err('Support cannot change their own role', 403);
        }
        if (in_array($targetRole, ['admin', 'support'], true)) {
            send_err('Support cannot request role changes for admin/support accounts', 403);
        }
    }

    if ($targetCurrentRole === $requestedRole) {
        send_ok(['message' => 'User already has this role']);
    }
    
    if ($actorRole === 'admin') {
        $stmt = $cnx->prepare('UPDATE users SET role=? WHERE id=?');
        $stmt->execute([$requestedRole, $user_id]);

        create_notification(
            $cnx,
            $user_id,
            'admin',
            "Your role has been updated to " . platform_role_label($requestedRole) . " by an administrator.",
            null,
            'admin'
        );

        send_ok([
            'message' => 'User role updated',
            'mode' => 'applied',
            'role' => $requestedRole
        ]);
    }

    $pendingStmt = $cnx->prepare(
        'SELECT id FROM role_change_requests
         WHERE user_id = ? AND requested_role = ? AND requested_by = ? AND status = ?
         LIMIT 1'
    );
    $pendingStmt->execute([$user_id, $requestedRole, (int)$actor['id'], 'pending']);
    if ($pendingStmt->fetch()) {
        send_err('A pending request already exists for this role change', 409);
    }

    $nowExpr = admin_now_expression($cnx);
    $insertStmt = $cnx->prepare(
        "INSERT INTO role_change_requests (user_id, requested_role, requested_by, status, reason, created_at)
         VALUES (?, ?, ?, 'pending', ?, {$nowExpr})"
    );
    $insertStmt->execute([$user_id, $requestedRole, (int)$actor['id'], $reason !== '' ? $reason : null]);

    $requestId = (int)$cnx->lastInsertId();
    if ((string)$cnx->getAttribute(PDO::ATTR_DRIVER_NAME) === 'pgsql') {
        $requestId = (int)getRow($cnx, 'SELECT currval(pg_get_serial_sequence(\'role_change_requests\', \'id\')) AS id')['id'];
    }

    $admins = getRows($cnx, "SELECT id FROM users WHERE role = 'admin'");
    foreach ($admins as $adminRow) {
        $adminId = (int)($adminRow['id'] ?? 0);
        if ($adminId <= 0) {
            continue;
        }
        create_notification(
            $cnx,
            $adminId,
            'admin',
            "Role change request #{$requestId}: {$targetUser['username']} => " . platform_role_label($requestedRole),
            null,
            'admin'
        );
    }

    send_ok([
        'message' => 'Role change request submitted for admin approval',
        'mode' => 'pending_approval',
        'request_id' => $requestId
    ]);
}

   
                              
   
function admin_players_list(): void {
    global $cnx;
    require_admin();
    
    $search = safe_str($_GET['search'] ?? '');
    $position = safe_str($_GET['position'] ?? '');
    $rarity = safe_str($_GET['rarity'] ?? '');
    $league = safe_str($_GET['league'] ?? '');
    $min_overall = (int)($_GET['min_overall'] ?? 0);
    $page = max(1, (int)($_GET['page'] ?? 1));
    $per_page = max(1, min(48, (int)($_GET['per_page'] ?? 20)));
    $offset = ($page - 1) * $per_page;
    
    $where = [];
    $params = [];
    
    if ($search) {
        $searchTerm = '%' . $search . '%';
        $where[] = '(name ILIKE ? OR full_name ILIKE ? OR nation ILIKE ? OR club ILIKE ? OR league ILIKE ?)';
        array_push($params, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm);
    }
    if ($position) {
        $where[] = 'position = ?';
        $params[] = $position;
    }
    if ($rarity) {
        $where[] = 'rarity = ?';
        $params[] = $rarity;
    }
    if ($league) {
        $where[] = 'league ILIKE ?';
        $params[] = '%' . $league . '%';
    }
    if ($min_overall > 0) {
        $where[] = 'overall >= ?';
        $params[] = $min_overall;
    }

    $whereSql = $where ? (' WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $cnx->prepare('SELECT COUNT(*)::int AS total FROM players' . $whereSql);
    $countStmt->execute($params);
    $total = (int)(($countStmt->fetch() ?: [])['total'] ?? 0);
    $pages = max(1, (int)ceil($total / $per_page));
    
    $query = 'SELECT id, name, overall, position, rarity, nation, club, league, pace, shooting, passing, dribbling, defending, physical, card_url, image_url
              FROM players' . $whereSql . '
              ORDER BY overall DESC, name ASC LIMIT ? OFFSET ?';
    $listParams = $params;
    $listParams[] = $per_page;
    $listParams[] = $offset;
    
    $stmt = $cnx->prepare($query);
    $stmt->execute($listParams);
    $players = $stmt->fetchAll();
    
    send_ok([
        'players' => $players,
        'page' => $page,
        'pages' => $pages,
        'total' => $total,
        'per_page' => $per_page
    ]);
}

if (!defined('ROOT_DIR')) {
    
}

function handle_player_image_upload(): ?string {
    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        return null;
    }

    $tmp_name = $_FILES['image']['tmp_name'];
    $name = basename($_FILES['image']['name']);
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    
    $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!in_array($ext, $allowed)) {
        return null;
    }

    $new_name = uniqid('player_', true) . '.' . $ext;
    $target_dir = ROOT_DIR . '/frontend/assets/images/players/';
    
    if (!is_dir($target_dir)) {
        @mkdir($target_dir, 0777, true);
    }

    $target_path = $target_dir . $new_name;
    if (@move_uploaded_file($tmp_name, $target_path)) {
        return '/frontend/assets/images/players/' . $new_name;
    }

    return null;
}

function admin_players_add(): void {
    global $cnx;
    require_admin();
    
    $name = safe_str($_POST['name'] ?? '');
    $overall = (int)($_POST['overall'] ?? 0);
    $position = safe_str($_POST['position'] ?? 'ST');
    $rarity = safe_str($_POST['rarity'] ?? 'common');
    $nation = safe_str($_POST['nation'] ?? '');
    $club = safe_str($_POST['club'] ?? '');
    $league = safe_str($_POST['league'] ?? '');
    
    $image_url = handle_player_image_upload() ?: safe_str($_POST['image_url'] ?? '');
    
    $pace = (int)($_POST['pace'] ?? 0);
    $shooting = (int)($_POST['shooting'] ?? 0);
    $passing = (int)($_POST['passing'] ?? 0);
    $dribbling = (int)($_POST['dribbling'] ?? 0);
    $defending = (int)($_POST['defending'] ?? 0);
    $physical = (int)($_POST['physical'] ?? 0);
    
    if (!$name || !$overall || !$league) {
        send_err('Missing required fields (name, overall, and league are required)');
    }
    
    $stmt = $cnx->prepare(
        'INSERT INTO players (name, overall, position, rarity, nation, club, league, image_url, pace, shooting, passing, dribbling, defending, physical) 
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *'
    );
    $stmt->execute([$name, $overall, $position, $rarity, $nation, $club, $league, $image_url, $pace, $shooting, $passing, $dribbling, $defending, $physical]);
    $player = $stmt->fetch();
    
    send_ok(['player' => $player, 'message' => 'Player added']);
}

function admin_players_edit(): void {
    global $cnx;
    require_admin();
    
    $player_id = (int)($_POST['player_id'] ?? 0);
    if (!$player_id) {
        send_err('Invalid player ID');
    }
    
    $updates = [];
    $params = [];
    
    $fields = ['name', 'position', 'rarity', 'nation', 'club', 'league', 'image_url'];
    $numFields = ['overall', 'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'];
    
    // Check for image upload
    $new_image = handle_player_image_upload();
    if ($new_image) {
        $_POST['image_url'] = $new_image;
    }
    
    foreach ($fields as $field) {
        if (isset($_POST[$field])) {
            $updates[] = "$field = ?";
            $params[] = safe_str($_POST[$field]);
        }
    }
    
    foreach ($numFields as $field) {
        if (isset($_POST[$field])) {
            $updates[] = "$field = ?";
            $params[] = (int)$_POST[$field];
        }
    }
    
    if (!$updates) {
        send_err('No fields to update');
    }
    
    $params[] = $player_id;
    $query = 'UPDATE players SET ' . implode(', ', $updates) . ' WHERE id=? RETURNING *';
    
    $stmt = $cnx->prepare($query);
    $stmt->execute($params);
    $player = $stmt->fetch();
    
    send_ok(['player' => $player, 'message' => 'Player updated']);
}

function admin_players_delete(): void {
    global $cnx;
    require_admin();
    
    $player_id = (int)($_POST['player_id'] ?? 0);
    if (!$player_id) {
        send_err('Invalid player ID');
    }
    
    try {
        $cnx->beginTransaction();
        
        // Delete ownership records first to satisfy foreign key constraints
        $stmt_users = $cnx->prepare('DELETE FROM user_players WHERE player_id=?');
        $stmt_users->execute([$player_id]);
        
        // Other tables like lineup_slots and chests use ON DELETE SET NULL, so this is safe
        $stmt = $cnx->prepare('DELETE FROM players WHERE id=?');
        $stmt->execute([$player_id]);
        
        $cnx->commit();
        send_ok(['message' => 'Player deleted']);
    } catch (Throwable $e) {
        $cnx->rollBack();
        send_err('Failed to delete player: ' . $e->getMessage());
    }
}

function admin_announcements_list(): void {
    global $cnx;
    require_admin();
    
    $page = (int)($_GET['page'] ?? 1);
    $per_page = 10;
    $offset = ($page - 1) * $per_page;
    
    $stmt = $cnx->prepare('SELECT id, content, created_at FROM community_posts WHERE category = ? ORDER BY created_at DESC LIMIT ? OFFSET ?');
    $stmt->execute(['announcement', $per_page, $offset]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $announcements = [];
    foreach ($rows as $row) {
        $fullContent = (string)($row['content'] ?? '');
        $title = '';
        $content = $fullContent;
        if (preg_match('/^<strong>(.*?)<\\/strong>\\s*(.*)$/s', $fullContent, $matches)) {
            $title = trim(html_entity_decode(strip_tags($matches[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
            $content = trim($matches[2]);
        }
        $announcements[] = [
            'id' => (int)$row['id'],
            'title' => $title,
            'content' => $content,
            'created_at' => $row['created_at'],
        ];
    }
    
    send_ok(['announcements' => $announcements, 'page' => $page]);
}

function admin_announcements_add(): void {
    global $cnx;
    require_admin();
    
    $user = require_admin();
    $title = safe_str($_POST['title'] ?? '');
    $content = safe_str($_POST['content'] ?? '');
    $category = safe_str($_POST['category'] ?? 'fa-bullhorn');
    
    if (!$title || !$content) {
        send_err('Missing required fields');
    }
    
                                                                           
    $fullContent = "<strong>{$title}</strong>\n\n{$content}";
    
    $stmt = $cnx->prepare('INSERT INTO community_posts (user_id, content, category, created_at) VALUES (?,?,?,?) RETURNING *');
    $stmt->execute([$user['id'], $fullContent, 'announcement', date('Y-m-d H:i:s')]);
    $announcement = $stmt->fetch();
    
    send_ok(['announcement' => $announcement, 'message' => 'Announcement posted']);

                                                                 
    broadcast_notification($cnx, 'announcement', "📣 New Announcement: {$title}", '#community', 'admin', (int)$user['id']);
}

function admin_announcements_delete(): void {
    global $cnx;
    require_admin();
    
    $announcement_id = (int)($_POST['announcement_id'] ?? 0);
    if (!$announcement_id) {
        send_err('Invalid announcement ID');
    }
    
    $stmt = $cnx->prepare('DELETE FROM community_posts WHERE id=? AND category = ?');
    $stmt->execute([$announcement_id, 'announcement']);
    
    send_ok(['message' => 'Announcement deleted']);
}

   
                    
   
function admin_reports_list(): void {
    global $cnx;
    require_admin();
    
    $page = (int)($_GET['page'] ?? 1);
    $per_page = 20;
    $offset = ($page - 1) * $per_page;
    
    send_ok(['reports' => [], 'page' => $page]);
}

   
                  
   
function admin_roles_list(): void {
    global $cnx;
    require_support();
    
    $roles = ['admin', 'support', 'player'];
    
    send_ok(['roles' => $roles]);
}

function admin_roles_assign(): void {
    global $cnx;
    require_admin();
    
    $user_id = (int)($_POST['user_id'] ?? 0);
    $role = normalize_platform_role(safe_str($_POST['role'] ?? 'player'));
    
    if (!$user_id) {
        send_err('Invalid user ID');
    }
    
    if ($role === null) {
        send_err('Invalid role');
    }
    
    $stmt = $cnx->prepare('UPDATE users SET role=? WHERE id=?');
    $stmt->execute([$role, $user_id]);
    
    send_ok(['message' => "User role set to " . platform_role_label($role)]);
}

function admin_role_requests_list(): void {
    global $cnx;
    $actor = require_support();

    $status = strtolower(safe_str($_GET['status'] ?? 'pending'));
    $allowedStatus = ['pending', 'approved', 'rejected', 'all'];
    if (!in_array($status, $allowedStatus, true)) {
        $status = 'pending';
    }

    $isAdmin = (($actor['role'] ?? '') === 'admin');
    $where = [];
    $params = [];

    if ($status !== 'all') {
        $where[] = 'r.status = ?';
        $params[] = $status;
    }

    if (!$isAdmin) {
        $where[] = 'r.requested_by = ?';
        $params[] = (int)$actor['id'];
    }

    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
    $stmt = $cnx->prepare(
        "SELECT
            r.id,
            r.user_id,
            r.requested_role,
            r.requested_by,
            r.status,
            r.reason,
            r.review_note,
            r.reviewed_by,
            r.created_at,
            r.reviewed_at,
            u.username AS target_username,
            u.email AS target_email,
            req.username AS requested_by_username,
            rev.username AS reviewed_by_username
         FROM role_change_requests r
         JOIN users u ON u.id = r.user_id
         JOIN users req ON req.id = r.requested_by
         LEFT JOIN users rev ON rev.id = r.reviewed_by
         {$whereSql}
         ORDER BY
            CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END,
            r.created_at DESC,
            r.id DESC
         LIMIT 200"
    );
    $stmt->execute($params);
    $requests = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $summary = ['pending' => 0, 'approved' => 0, 'rejected' => 0];
    foreach ($requests as $request) {
        $rs = strtolower((string)($request['status'] ?? ''));
        if (isset($summary[$rs])) {
            $summary[$rs]++;
        }
    }

    send_ok([
        'requests' => $requests,
        'summary' => $summary,
        'can_review' => $isAdmin,
    ]);
}

function admin_role_requests_approve(): void {
    global $cnx;
    $admin = require_admin();

    $requestId = (int)($_POST['request_id'] ?? 0);
    $reviewNote = safe_str($_POST['review_note'] ?? '');
    if ($requestId <= 0) {
        send_err('Invalid request ID');
    }

    $req = getRow(
        $cnx,
        'SELECT id, user_id, requested_role, requested_by, status FROM role_change_requests WHERE id = ? LIMIT 1',
        [$requestId]
    );
    if (!$req) {
        send_err('Request not found', 404);
    }
    if (($req['status'] ?? '') !== 'pending') {
        send_err('Only pending requests can be approved', 409);
    }

    $requestedRole = normalize_platform_role((string)($req['requested_role'] ?? ''));
    if ($requestedRole === null) {
        send_err('Invalid requested role', 422);
    }

    $nowExpr = admin_now_expression($cnx);
    $cnx->beginTransaction();
    try {
        executeQuery($cnx, 'UPDATE users SET role = ? WHERE id = ?', [$requestedRole, (int)$req['user_id']]);
        executeQuery(
            $cnx,
            "UPDATE role_change_requests
             SET status = 'approved', reviewed_by = ?, review_note = ?, reviewed_at = {$nowExpr}
             WHERE id = ?",
            [(int)$admin['id'], $reviewNote !== '' ? $reviewNote : null, $requestId]
        );
        $cnx->commit();
    } catch (Throwable $e) {
        if ($cnx->inTransaction()) {
            $cnx->rollBack();
        }
        throw $e;
    }

    create_notification(
        $cnx,
        (int)$req['requested_by'],
        'admin',
        "Your role change request #{$requestId} was approved.",
        null,
        'admin'
    );
    create_notification(
        $cnx,
        (int)$req['user_id'],
        'admin',
        "Your role was updated to " . platform_role_label($requestedRole) . " after admin approval.",
        null,
        'admin'
    );

    send_ok(['message' => 'Role request approved and applied']);
}

function admin_role_requests_reject(): void {
    global $cnx;
    $admin = require_admin();

    $requestId = (int)($_POST['request_id'] ?? 0);
    $reviewNote = safe_str($_POST['review_note'] ?? '');
    if ($requestId <= 0) {
        send_err('Invalid request ID');
    }

    $req = getRow($cnx, 'SELECT id, requested_by, status FROM role_change_requests WHERE id = ? LIMIT 1', [$requestId]);
    if (!$req) {
        send_err('Request not found', 404);
    }
    if (($req['status'] ?? '') !== 'pending') {
        send_err('Only pending requests can be rejected', 409);
    }

    $nowExpr = admin_now_expression($cnx);
    executeQuery(
        $cnx,
        "UPDATE role_change_requests
         SET status = 'rejected', reviewed_by = ?, review_note = ?, reviewed_at = {$nowExpr}
         WHERE id = ?",
        [(int)$admin['id'], $reviewNote !== '' ? $reviewNote : null, $requestId]
    );

    create_notification(
        $cnx,
        (int)$req['requested_by'],
        'admin',
        "Your role change request #{$requestId} was rejected.",
        null,
        'admin'
    );

    send_ok(['message' => 'Role request rejected']);
}

   
                            
   
function admin_community_posts_list(): void {
    global $cnx;
    require_admin();
    
    $search = safe_str($_GET['search'] ?? '');
    $category = safe_str($_GET['category'] ?? 'all');
    $page = (int)($_GET['page'] ?? 1);
    $per_page = 20;
    $offset = ($page - 1) * $per_page;
    
                 
    $query = 'SELECT p.id, p.user_id, p.content, p.image_url, p.category, p.likes_count, p.comment_count, p.created_at, p.updated_at, u.username FROM community_posts p JOIN users u ON u.id = p.user_id WHERE 1=1';
    $params = [];
    
                          
    if ($search) {
        $query .= ' AND (p.content ILIKE ? OR u.username ILIKE ?)';
        $searchTerm = '%' . $search . '%';
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
                            
    if ($category && $category !== 'all') {
        $query .= ' AND p.category = ?';
        $params[] = $category;
    }
    
                      
    $countQuery = 'SELECT COUNT(*) as total FROM community_posts p JOIN users u ON u.id = p.user_id WHERE 1=1';
    if ($search) {
        $countQuery .= ' AND (p.content ILIKE ? OR u.username ILIKE ?)';
    }
    if ($category && $category !== 'all') {
        $countQuery .= ' AND p.category = ?';
    }
    
    $countStmt = $cnx->prepare($countQuery);
    $countStmt->execute($params);
    $total = $countStmt->fetch()['total'] ?? 0;
    
                          
    $query .= ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    $params[] = $per_page;
    $params[] = $offset;
    
    $stmt = $cnx->prepare($query);
    $stmt->execute($params);
    $posts = $stmt->fetchAll();
    
                                 
    foreach ($posts as &$post) {
        $commentStmt = $cnx->prepare('SELECT c.id, c.post_id, c.user_id, c.content, c.likes_count, c.created_at, c.updated_at, u.username FROM community_comments c JOIN users u ON u.id = c.user_id WHERE c.post_id = ? LIMIT 4');
        $commentStmt->execute([$post['id']]);
        $post['comments'] = $commentStmt->fetchAll();
    }
    
    send_ok([
        'posts' => $posts,
        'page' => $page,
        'total' => (int)$total,
        'pages' => ceil($total / $per_page)
    ]);
}

function admin_community_posts_delete(): void {
    global $cnx;
    require_admin();
    
    $post_id = (int)($_POST['post_id'] ?? 0);
    if (!$post_id) {
        send_err('Invalid post ID');
    }
    
                         
    $stmt = $cnx->prepare('SELECT id FROM community_posts WHERE id = ?');
    $stmt->execute([$post_id]);
    if (!$stmt->fetch()) {
        send_err('Post not found', 404);
    }
    
                                                                                               
    $stmt = $cnx->prepare('DELETE FROM community_comments WHERE post_id = ?');
    $stmt->execute([$post_id]);
    
                      
    $stmt = $cnx->prepare('DELETE FROM community_posts WHERE id = ?');
    $stmt->execute([$post_id]);
    
    send_ok(['message' => 'Post deleted successfully']);
}

function admin_community_comments_delete(): void {
    global $cnx;
    require_admin();
    
    $comment_id = (int)($_POST['comment_id'] ?? 0);
    if (!$comment_id) {
        send_err('Invalid comment ID');
    }
    
                            
    $stmt = $cnx->prepare('SELECT id FROM community_comments WHERE id = ?');
    $stmt->execute([$comment_id]);
    if (!$stmt->fetch()) {
        send_err('Comment not found', 404);
    }
    
                         
    $stmt = $cnx->prepare('DELETE FROM community_comments WHERE id = ?');
    $stmt->execute([$comment_id]);
    
    send_ok(['message' => 'Comment deleted successfully']);
}

   
                              
   
function admin_community_reports_list(): void {
    global $cnx;
    require_support();
    
    $status = strtolower(safe_str($_GET['status'] ?? 'open'));
    $filterByStatus = in_array($status, ['open', 'resolved'], true);
    $page = (int)($_GET['page'] ?? 1);
    $per_page = (int)($_GET['per_page'] ?? 20);
    $offset = ($page - 1) * $per_page;
    
    $statusCondition = $filterByStatus ? 'AND r2.status = ?' : '';
    $statusConditionAlt = $filterByStatus ? 'AND r3.status = ?' : '';
    $joinStatusCondition = $filterByStatus ? 'AND r.status = ?' : '';
    $query = 'SELECT p.id, p.user_id, p.content, p.image_url, p.category, p.likes_count, p.comment_count, p.created_at, p.updated_at, u.username,
        COUNT(r.id) as report_count,
        MAX(r.created_at) as last_reported_at,
        (
            SELECT r2.category
            FROM community_reports r2
            WHERE r2.target_type = \'post\' AND r2.target_id = p.id ' . $statusCondition . '
            ORDER BY r2.created_at DESC
            LIMIT 1
        ) as report_reason,
        (
            SELECT ru.username
            FROM community_reports r3
            JOIN users ru ON ru.id = r3.reporter_id
            WHERE r3.target_type = \'post\' AND r3.target_id = p.id ' . $statusConditionAlt . '
            ORDER BY r3.created_at DESC
            LIMIT 1
        ) as reporter_username
        FROM community_posts p 
        JOIN users u ON u.id = p.user_id 
        LEFT JOIN community_reports r ON r.target_type = \'post\' AND r.target_id = p.id ' . $joinStatusCondition . '
        WHERE r.id IS NOT NULL
        GROUP BY p.id, u.username
        ORDER BY last_reported_at DESC
        LIMIT ? OFFSET ?';
    
    $stmt = $cnx->prepare($query);
    $params = [];
    if ($filterByStatus) {
        $params[] = $status;
        $params[] = $status;
        $params[] = $status;
    }
    $params[] = $per_page;
    $params[] = $offset;
    $stmt->execute($params);
    $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $countQuery = 'SELECT COUNT(DISTINCT p.id) as total FROM community_posts p 
        LEFT JOIN community_reports r ON r.target_type = \'post\' AND r.target_id = p.id ' . $joinStatusCondition . '
        WHERE r.id IS NOT NULL';
    $countStmt = $cnx->prepare($countQuery);
    $countStmt->execute($filterByStatus ? [$status] : []);
    $total = $countStmt->fetch()['total'] ?? 0;
    
    send_ok([
        'posts' => $posts,
        'pagination' => [
            'page' => $page,
            'per_page' => $per_page,
            'total' => (int)$total,
            'total_pages' => (int)ceil($total / $per_page)
        ]
    ]);
}

function admin_community_reports_create(): void {
    global $cnx;
    
    $user = current_user();
    if (!$user) {
        send_err('Unauthorized', 401);
    }
    
    $post_id = (int)($_POST['post_id'] ?? 0);
    $reason = safe_str($_POST['reason'] ?? '');
    $description = safe_str($_POST['description'] ?? '');
    
    if (!$post_id || !$reason) {
        send_err('Missing post_id or reason');
    }
    
                           
    $stmt = $cnx->prepare('SELECT id FROM community_posts WHERE id = ?');
    $stmt->execute([$post_id]);
    if (!$stmt->fetch()) {
        send_err('Post not found', 404);
    }
    
    $stmt = $cnx->prepare('SELECT id FROM community_reports WHERE target_type = ? AND target_id = ? AND reporter_id = ? AND status = ?');
    $stmt->execute(['post', $post_id, $user['id'], 'open']);
    if ($stmt->fetch()) {
        send_err('You already reported this post');
    }
    
    $stmt = $cnx->prepare('INSERT INTO community_reports (reporter_id, target_type, target_id, category, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW()) RETURNING id, reporter_id, target_id AS post_id, category AS reason, description, status, created_at, resolved_at');
    $stmt->execute([$user['id'], 'post', $post_id, $reason, $description, 'open']);
    $report = $stmt->fetch(PDO::FETCH_ASSOC);
    
    send_ok(['message' => 'Post reported successfully', 'report' => $report]);
}

function admin_community_reports_resolve(): void {
    global $cnx;
    require_support();
    
    $post_id = (int)($_POST['post_id'] ?? 0);
    $action = safe_str($_POST['action'] ?? '');
    
    if (!$post_id || !in_array($action, ['dismiss', 'delete'])) {
        send_err('Invalid post_id or action (must be dismiss or delete)');
    }
    
                         
    $stmt = $cnx->prepare('SELECT id FROM community_posts WHERE id = ?');
    $stmt->execute([$post_id]);
    if (!$stmt->fetch()) {
        send_err('Post not found', 404);
    }
    
    $stmt = $cnx->prepare('UPDATE community_reports SET status = ?, resolved_at = NOW() WHERE target_type = ? AND target_id = ? AND status = ?');
    $stmt->execute(['resolved', 'post', $post_id, 'open']);
    
                                      
    if ($action === 'delete') {
        $stmt = $cnx->prepare('DELETE FROM community_posts WHERE id = ?');
        $stmt->execute([$post_id]);
        send_ok(['message' => 'Post deleted and report resolved']);
    } else {
        send_ok(['message' => 'Report dismissed']);
    }
}

   
                          
   
function admin_send_notification(): void {
    global $cnx;
    $admin = require_admin();

    $input = $_POST;
    $target = safe_str($input['target'] ?? 'all');
    $user_id = (int)($input['user_id'] ?? 0);
    $type = safe_str($input['type'] ?? 'admin');
    $content = safe_str($input['content'] ?? '');
    $link = safe_str($input['link'] ?? '') ?: null;

    if ($content === '') {
        send_err('Notification content is required');
    }

    $allowedTypes = ['admin', 'announcement', 'system', 'challenge', 'chest', 'match', 'division', 'support'];
    if (!in_array($type, $allowedTypes)) {
        $type = 'admin';
    }

    if ($target === 'user' && $user_id > 0) {
                                
        $userExists = getRow($cnx, 'SELECT id FROM users WHERE id = ?', [$user_id]);
        if (!$userExists) {
            send_err('User not found', 404);
        }
        create_notification($cnx, $user_id, $type, $content, $link, 'admin');
        send_ok(['message' => 'Notification sent to user #' . $user_id, 'count' => 1]);
    } else {
                                 
        $count = broadcast_notification($cnx, $type, $content, $link, 'admin', (int)$admin['id']);
        send_ok(['message' => "Notification broadcast to {$count} users", 'count' => $count]);
    }
}

function admin_settings_get(): void {
    require_admin();
    global $cnx;
    
    $settings = [];
    $rows = getRows($cnx, 'SELECT key, value FROM platform_settings');
    foreach ($rows as $row) {
        $settings[$row['key']] = $row['value'];
    }
    
    send_ok($settings);
}

function admin_settings_update(): void {
    require_admin();
    global $cnx;
    
    $post_data = $_POST;
    if (empty($post_data)) {
        $json = file_get_contents('php://input');
        if ($json) $post_data = json_decode($json, true) ?? [];
    }
    
    $key = safe_str($post_data['key'] ?? '');
    $value = safe_str($post_data['value'] ?? '');
    
    if (!$key) {
        send_err('Key is required');
    }
    
    $stmt = $cnx->prepare('INSERT INTO platform_settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value');
    $stmt->execute([$key, $value]);
    
    send_ok(['message' => 'Setting updated successfully']);
}
