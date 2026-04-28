<?php
declare(strict_types=1);

require_once ROOT_DIR . '/config/database.php';
global $cnx;
$method = $_SERVER['REQUEST_METHOD'];

$user = require_auth();

                
$uri_raw = strtok($_SERVER['REQUEST_URI'], '?');
$path = ltrim(substr($uri_raw, strlen(API_PREFIX . '/notifications')), '/');
$parts = $path !== '' ? explode('/', $path) : [];
$sub_action = $parts[0] ?? '';

if ($method === 'GET') {
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $filter = safe_str($_GET['filter'] ?? '');
    $limit = max(1, min(100, $limit));
    
    $sql = "SELECT * FROM notifications WHERE user_id = ?";
    $params = [(int)$user['id']];

                                                                                          
    if ($filter !== '' && $filter !== 'all') {
        $filterMap = [
            'admin' => [
                'types' => ['admin', 'announcement'],
                'sources' => ['admin'],
            ],
            'challenge' => [
                'types' => ['challenge', 'chest'],
                'sources' => ['challenge'],
            ],
            'community' => [
                'types' => ['mention', 'reaction', 'community'],
                'sources' => ['community'],
            ],
            'system' => [
                'types' => ['system', 'red_card', 'support', 'match', 'division'],
                'sources' => ['system', 'support'],
            ],
        ];
        if (isset($filterMap[$filter])) {
            $clauses = [];
            $types = $filterMap[$filter]['types'];
            $sources = $filterMap[$filter]['sources'];
            if ($types) {
                $clauses[] = 'type IN (' . implode(',', array_fill(0, count($types), '?')) . ')';
                $params = array_merge($params, $types);
            }
            if ($sources) {
                $clauses[] = 'source IN (' . implode(',', array_fill(0, count($sources), '?')) . ')';
                $params = array_merge($params, $sources);
            }
            if ($clauses) {
                $sql .= ' AND (' . implode(' OR ', $clauses) . ')';
            }
        }
    }

    $sql .= " ORDER BY created_at DESC LIMIT ?";
    $params[] = $limit;

    $notifs = getRows($cnx, $sql, $params);

                                             
    $unreadCountRaw = getRow(
        $cnx,
        "SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = false",
        [(int)$user['id']]
    );
    $unreadCount = $unreadCountRaw ? (int)$unreadCountRaw['unread'] : 0;

    send_ok(['notifications' => $notifs, 'unread_count' => $unreadCount]);

} elseif ($method === 'POST') {
    if ($sub_action === 'mark_read') {
        $input = $_POST;
        if (isset($input['id'])) {
            executeQuery($cnx, "UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?", [(int)$input['id'], (int)$user['id']]);
        } else {
                       
            executeQuery($cnx, "UPDATE notifications SET is_read = true WHERE user_id = ?", [(int)$user['id']]);
        }
        send_ok(['success' => true]);
    } elseif ($sub_action === 'delete') {
        $input = $_POST;
        if (isset($input['id'])) {
            executeQuery($cnx, "DELETE FROM notifications WHERE id = ? AND user_id = ?", [(int)$input['id'], (int)$user['id']]);
            send_ok(['success' => true, 'message' => 'Notification deleted']);
        } else {
            send_err('Missing notification id');
        }
    } elseif ($sub_action === 'clear_all') {
        executeQuery($cnx, "DELETE FROM notifications WHERE user_id = ? AND is_read = true", [(int)$user['id']]);
        send_ok(['success' => true, 'message' => 'Read notifications cleared']);
    } else {
        send_err('Not found', 404);
    }
} else {
    send_err('Method not allowed', 405);
}
