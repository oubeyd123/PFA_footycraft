<?php
declare(strict_types=1);

require_once ROOT_DIR . '/config/database.php';
global $cnx;
if (($_GET['group'] ?? '') === 'inventory') {
    $action = $_GET['action'] ?? '';
    if ($action === 'list') {
        inventory_list();
    } else {
        send_err('Not found', 404);
    }
}

function inventory_list(): void {
    global $cnx;
    $user   = require_auth();
    $page   = max(1, (int)($_GET['page'] ?? 1));
    $limit  = max(1, min(100, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;
    $pos    = safe_str($_GET['position'] ?? '');
    $rarity = safe_str($_GET['rarity'] ?? '');
    $sort   = safe_str($_GET['sort'] ?? 'overall');

    $allowed_sorts = ['overall', 'name', 'position', 'nation', 'acquired_at'];
    $sort_col = in_array($sort, $allowed_sorts, true) ? $sort : 'overall';

    $extra_where  = '';
    $count_params = [$user['id']];

    if ($pos)    { $extra_where .= ' AND p.position = ?'; $count_params[] = $pos; }
    if ($rarity) { $extra_where .= ' AND p.rarity = ?';   $count_params[] = $rarity; }

    $stmt = $cnx->prepare(
        "SELECT COUNT(*) as cnt FROM user_players up JOIN players p ON p.id = up.player_id
         WHERE up.user_id = ? {$extra_where}"
    );
    $stmt->execute($count_params);
    $total_row = $stmt->fetch();

    $sort_sql    = $sort_col === 'acquired_at' ? 'up.acquired_at' : "p.{$sort_col}";
    $list_params = array_merge($count_params, [$limit, $offset]);
    $stmt = $cnx->prepare(
        "SELECT p.*, up.acquired_at, up.source FROM user_players up
         JOIN players p ON p.id = up.player_id
         WHERE up.user_id = ? {$extra_where}
         ORDER BY {$sort_sql} DESC LIMIT ? OFFSET ?"
    );
    $stmt->execute($list_params);
    $rows = $stmt->fetchAll();

    send_ok([
        'players' => $rows,
        'total'   => (int)($total_row['cnt'] ?? 0),
        'page'    => $page,
        'limit'   => $limit,
    ]);
}
