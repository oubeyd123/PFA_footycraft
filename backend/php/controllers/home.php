<?php
declare(strict_types=1);

require_once ROOT_DIR . '/config/database.php';
global $cnx;
if (($_GET['group'] ?? '') === 'home') {
    $action = $_GET['action'] ?? '';
    if ($action === 'summary') {
        home_summary();
    } else {
        send_err('Not found', 404);
    }
}

function home_summary(): void {
    global $cnx;
    $user = require_auth();
    $stmt = $cnx->prepare('SELECT * FROM users WHERE id=? LIMIT 1');
    $stmt->execute([$user['id']]);
    $u = $stmt->fetch();

    $active_lineup = null;
    if ($u['active_lineup_id']) {
        $stmt = $cnx->prepare('SELECT * FROM lineups WHERE id=? LIMIT 1');
        $stmt->execute([$u['active_lineup_id']]);
        $al = $stmt->fetch();
        if ($al) {
            $stmt = $cnx->prepare(
                'SELECT ls.slot_code, p.name, p.overall, p.position, p.nation, p.club
                 FROM lineup_slots ls LEFT JOIN players p ON p.id=ls.player_id
                 WHERE ls.lineup_id=? ORDER BY ls.id'
            );
            $stmt->execute([$al['id']]);
            $slots = $stmt->fetchAll();
            $al['slots']   = $slots;
            $active_lineup = $al;
        }
    }

    $stmt = $cnx->prepare("SELECT COUNT(*) as cnt FROM matches WHERE user_id=? AND result='W'");
    $stmt->execute([$u['id']]);
    $wins_row = $stmt->fetch();

    $stmt = $cnx->prepare("SELECT COUNT(*) as cnt FROM matches WHERE user_id=? AND result='D'");
    $stmt->execute([$u['id']]);
    $draws_row = $stmt->fetch();

    $stmt = $cnx->prepare("SELECT COUNT(*) as cnt FROM matches WHERE user_id=? AND result='L'");
    $stmt->execute([$u['id']]);
    $losses_row = $stmt->fetch();

    $stmt = $cnx->prepare('SELECT COUNT(*) as cnt FROM user_players WHERE user_id=?');
    $stmt->execute([$u['id']]);
    $inv_row = $stmt->fetch();
    $wins       = (int)($wins_row['cnt'] ?? 0);
    $draws      = (int)($draws_row['cnt'] ?? 0);
    $losses     = (int)($losses_row['cnt'] ?? 0);
    $inv_count  = (int)($inv_row['cnt'] ?? 0);

    unset($u['password_hash']);
    send_ok([
        'user'           => $u,
        'active_lineup'  => $active_lineup,
        'stats'          => ['wins' => $wins, 'draws' => $draws, 'losses' => $losses, 'inventory' => $inv_count],
        'division_name'  => DIVISION_NAMES[division_level_from_row($u)] ?? 'Division 5',
    ]);
}
