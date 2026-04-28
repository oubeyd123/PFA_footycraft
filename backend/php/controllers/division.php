<?php
declare(strict_types=1);

require_once ROOT_DIR . '/config/database.php';
global $cnx;
if (($_GET['group'] ?? '') === 'division') {
    $action = $_GET['action'] ?? '';
    if ($action === 'status') {
        division_status();
    } elseif ($action === 'leaderboard') {
        division_leaderboard();
    } else {
        send_err('Not found', 404);
    }
}

function division_status(): void {
    global $cnx;
    $user = require_auth();
    send_ok(division_status_payload($cnx, (int)$user['id']));
}

function division_leaderboard(): void {
    global $cnx;

    $viewer = current_user();
    $division = (int)($_GET['division'] ?? 0);
    if ($division < 1 || $division > 5) {
        $division = $viewer ? division_level_from_row($viewer) : 5;
    }

    $stmt = $cnx->prepare(
        'SELECT id, username, division_points, division_level, division_level AS division_rank,
                division_matches_played, division_form
         FROM users
         WHERE division_level=?
         ORDER BY division_points DESC, username ASC
         LIMIT 50'
    );
    $stmt->execute([$division]);
    $rows = $stmt->fetchAll();

    $total = count($rows);
    $leaderboard = [];
    foreach ($rows as $idx => $row) {
        $position = $idx + 1;
        $zone = 'safe';
        if ($division === 1 && $position <= 3) {
            $zone = 'title';
        } elseif ($division > 1 && $position <= 3) {
            $zone = 'promotion';
        } elseif ($division < 5 && $total >= 6 && $position > max(3, $total - 3)) {
            $zone = 'relegation';
        }

        $row['position'] = $position;
        $row['division_name'] = DIVISION_NAMES[$division] ?? "Division {$division}";
        $row['matches_played'] = (int)($row['division_matches_played'] ?? 0);
        $row['form'] = division_form_from_row($row);
        $row['is_current_user'] = $viewer && (int)$row['id'] === (int)$viewer['id'];
        $row['zone'] = $zone;
        $leaderboard[] = $row;
    }

    send_ok([
        'division' => $division,
        'division_name' => DIVISION_NAMES[$division] ?? "Division {$division}",
        'leaderboard' => $leaderboard,
    ]);
}
