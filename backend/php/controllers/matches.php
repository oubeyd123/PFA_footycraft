<?php
declare(strict_types=1);

require_once ROOT_DIR . '/config/database.php';
global $cnx;
if (($_GET['group'] ?? '') === 'matches') {
    $action = $_GET['action'] ?? '';
    if ($action === 'history') {
        matches_history();
    } elseif ($action === 'detail') {
        matches_detail();
    } else {
        send_err('Not found', 404);
    }
}

function match_row_bool($value): bool {
    return $value === true || $value === 1 || $value === '1' || $value === 't' || $value === 'true';
}

function match_row_mode($row, array $stats): string {
    $mode = trim((string)($row['match_type'] ?? ''));
    $json_mode = trim((string)($stats['mode'] ?? ''));

    if ($json_mode !== '' && ($mode === '' || ($mode === 'quickmatch' && $json_mode !== 'quickmatch'))) {
        return $json_mode;
    }

    return $mode !== '' ? $mode : 'quickmatch';
}

function match_row_stage($row, array $stats): ?string {
    $stage = trim((string)($row['match_stage'] ?? ''));

    return $stage !== '' ? $stage : ($stats['stage'] ?? null);
}

function matches_history(): void {
    global $cnx;
    try {
        $user = require_auth();
        $limit = max(1, min(250, (int)($_GET['limit'] ?? 100)));
        
                                                                                 
        $stmt = $cnx->prepare(
            "SELECT m.*, u.username as opponent_username
             FROM matches m LEFT JOIN users u ON u.id=m.opponent_user_id
             WHERE m.user_id=? ORDER BY m.created_at DESC LIMIT " . $limit
        );
        $stmt->execute([$user['id']]);
        $rows = $stmt->fetchAll();
        
        $result = [];
        foreach ($rows as $r) {
            $stats = json_decode($r['stats_json'] ?? '{}', true) ?: [];
            $r['stats']      = $stats;
            $r['events']     = json_decode($r['events_json'] ?? '[]', true) ?: [];
            $r['dp_change']  = $stats['dp_change']  ?? null;
            $r['new_points'] = $stats['new_points'] ?? null;
            $r['new_rank']   = $stats['new_rank']   ?? null;
            $r['mode']       = match_row_mode($r, $stats);
            $r['stage']      = match_row_stage($r, $stats);
            $r['forfeit']    = $r['is_forfeit'] !== null ? match_row_bool($r['is_forfeit']) : !empty($stats['forfeit']);
            if (!$r['opponent_username']) {
                $r['opponent_username'] = $stats['opponent'] ?? 'AI Opponent';
            }
            $result[] = $r;
        }
        send_ok(['matches' => $result]);
    } catch (Exception $e) {
        send_err('Failed to load match history: ' . $e->getMessage(), 500);
    }
}

function matches_detail(): void {
    global $cnx;
    try {
        $user = require_auth();
        $mid  = (int)($_GET['id'] ?? 0);
        
        if ($mid <= 0) send_err('Invalid match ID', 400);
        
        $stmt = $cnx->prepare(
            'SELECT m.*, u.username as opponent_username
             FROM matches m LEFT JOIN users u ON u.id=m.opponent_user_id
             WHERE m.id=? AND m.user_id=? LIMIT 1'
        );
        $stmt->execute([$mid, $user['id']]);
        $row = $stmt->fetch();
        
        if (!$row) send_err('Match not found', 404);
        
        $stats = json_decode($row['stats_json'] ?? '{}', true) ?: [];
        $row['stats']      = $stats;
        $row['events']     = json_decode($row['events_json'] ?? '[]', true) ?: [];
        $row['dp_change']  = $stats['dp_change']  ?? null;
        $row['new_points'] = $stats['new_points'] ?? null;
        $row['new_rank']   = $stats['new_rank']   ?? null;
        $row['mode']       = match_row_mode($row, $stats);
        $row['stage']      = match_row_stage($row, $stats);
        $row['forfeit']    = $row['is_forfeit'] !== null ? match_row_bool($row['is_forfeit']) : !empty($stats['forfeit']);
        if (!$row['opponent_username']) {
            $row['opponent_username'] = $stats['opponent'] ?? 'AI Opponent';
        }
        send_ok(['match' => $row]);
    } catch (Exception $e) {
        send_err('Failed to load match details: ' . $e->getMessage(), 500);
    }
}
