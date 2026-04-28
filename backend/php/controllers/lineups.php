<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/models/Lineup.php';

require_once ROOT_DIR . '/config/database.php';
global $cnx;
if (($_GET['group'] ?? '') === 'lineups') {
    $action = $_GET['action'] ?? '';
    if ($action === 'my') {
        lineups_my();
    } elseif ($action === 'create') {
        lineups_create();
    } elseif ($action === 'update') {
        lineups_update();
    } elseif ($action === 'delete') {
        lineups_delete();
    } elseif ($action === 'set_active') {
        lineups_set_active();
    } elseif ($action === 'deactivate') {
        lineups_deactivate();
    } elseif ($action === 'duplicate') {
        lineups_duplicate();
    } elseif ($action === 'public') {
        lineups_public();
    } elseif ($action === 'meta_pulse') {
        lineups_meta_pulse();
    } elseif ($action === 'view') {
        lineups_view();
    } elseif ($action === 'like') {
        lineups_like();
    } else {
        send_err('Not found', 404);
    }
}

function lineups_my(): void {
    global $cnx;
    $user = require_auth();
    
    $stmt = $cnx->prepare(
        'SELECT l.*, (SELECT COUNT(*) FROM lineup_slots ls WHERE ls.lineup_id=l.id AND ls.player_id IS NOT NULL) as filled_count
         FROM lineups l WHERE l.user_id=? ORDER BY l.updated_at DESC'
    );
    $stmt->execute([$user['id']]);
    $rows = $stmt->fetchAll();
    
    $lineups = [];
    foreach ($rows as $l) {
        $stmt2 = $cnx->prepare(
            'SELECT ls.slot_code, ls.position_required, p.id as player_id, p.name, p.overall,
                    p.position, p.nation, p.league, p.club,
                    p.pace, p.shooting, p.passing, p.dribbling, p.defending, p.physical,
                    p.rarity, p.card_type, p.card_url, p.image_url
             FROM lineup_slots ls LEFT JOIN players p ON p.id = ls.player_id
             WHERE ls.lineup_id=? ORDER BY ls.id'
        );
        $stmt2->execute([$l['id']]);
        $slots = $stmt2->fetchAll();
        
        $l['slots'] = $slots;
        $lineups[] = $l;
    }
    send_ok(['lineups' => $lineups]);
}


function lineup_input_model(): Lineup {
    $input = new Lineup();
    $input->lineup_id = (int)($_POST['lineup_id'] ?? 0);
    $input->name = safe_str($_POST['name'] ?? '');
    $input->formation = safe_str($_POST['formation'] ?? '');
    $input->is_public = isset($_POST['is_public'])
        ? ($_POST['is_public'] === true || $_POST['is_public'] === 1 || $_POST['is_public'] === '1' || $_POST['is_public'] === 'true')
        : null;
    $input->slots = [];

    if (isset($_POST['slots'])) {
        $slots = json_decode((string)$_POST['slots'], true);
        if (is_array($slots)) {
            $input->slots = $slots;
        }
    }

    return $input;
}

function lineup_ensure_slots(int $lineup_id, string $formation): void {
    global $cnx;
    
    $slots_def = FORMATIONS[$formation] ?? FORMATIONS['4-3-3'];
    if (!is_array($slots_def)) {
        throw new Exception("Invalid formation: {$formation}");
    }
    
    $pos_map = POSITION_MAP;
    if (!is_array($pos_map)) {
        throw new Exception("POSITION_MAP not loaded");
    }
    
    foreach ($slots_def as $slot_code) {
                                                 
        $pos_req = $slot_code;
        if (isset($pos_map[$slot_code]) && is_array($pos_map[$slot_code]) && count($pos_map[$slot_code]) > 0) {
            $pos_req = (string)$pos_map[$slot_code][0];
        }
        
                                                                       
        $query = 'INSERT INTO lineup_slots (lineup_id, slot_code, position_required) 
                  VALUES (?, ?, ?)
                  ON CONFLICT DO NOTHING';
        
                                                         
        try {
            $stmt = $cnx->prepare('INSERT INTO lineup_slots (lineup_id, slot_code, position_required) VALUES (?, ?, ?)');
            $stmt->execute([$lineup_id, $slot_code, $pos_req]);
        } catch (Exception $e) {
                                                 
            if (strpos($e->getMessage(), 'duplicate') === false) {
                throw $e;
            }
        }
    }
}

function lineups_create(): void {
    global $cnx;
    $user      = require_auth();
    $input     = lineup_input_model();
    $name      = safe_str($input->name ?? 'My Lineup');
    $formation = safe_str($input->formation ?? '4-3-3');
    if ($name === '') $name = 'My Lineup';
    if (!array_key_exists($formation, FORMATIONS)) $formation = '4-3-3';

    try {
        $stmt = $cnx->prepare('INSERT INTO lineups (user_id, name, formation) VALUES (?,?,?) RETURNING id');
        $stmt->execute([$user['id'], $name, $formation]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$row) send_err('Failed to create lineup', 500);
        $newId = (int)$row['id'];
        
        lineup_ensure_slots($newId, $formation);
        
                                         
        $stmt2 = $cnx->prepare('SELECT * FROM lineups WHERE id=? LIMIT 1');
        $stmt2->execute([$newId]);
        $lineup = $stmt2->fetch(PDO::FETCH_ASSOC);
        
        if (!$lineup) send_err('Failed to fetch lineup after creation', 500);
        
                                         
        $stmt3 = $cnx->prepare(
            'SELECT ls.slot_code, ls.position_required, p.id as player_id, p.name, p.overall,
                    p.position, p.nation, p.league, p.club,
                    p.pace, p.shooting, p.passing, p.dribbling, p.defending, p.physical,
                    p.rarity, p.card_type, p.card_url, p.image_url
             FROM lineup_slots ls LEFT JOIN players p ON p.id = ls.player_id
             WHERE ls.lineup_id=? ORDER BY ls.id'
        );
        $stmt3->execute([$newId]);
        $slots = $stmt3->fetchAll(PDO::FETCH_ASSOC) ?: [];
        
        $lineup['slots'] = $slots;
        
                                        
        send_ok([
            'lineup_id' => $newId,
            'lineup' => $lineup
        ]);
    } catch (Exception $e) {
        send_err('Error creating lineup: ' . $e->getMessage(), 500);
    }
}

function lineups_update(): void {
    global $cnx;
    $user = require_auth();
    $input = lineup_input_model();
    $lid   = (int)($input->lineup_id ?? 0);

    $stmt = $cnx->prepare('SELECT * FROM lineups WHERE id=? AND user_id=? LIMIT 1');
    $stmt->execute([$lid, $user['id']]);
    $lineup = $stmt->fetch();
    if (!$lineup) send_err('Lineup not found', 404);

    $formation = safe_str($input->formation ?? $lineup['formation']);
    $posted_name = array_key_exists('name', $_POST) ? safe_str($_POST['name']) : '';
    $name = $posted_name !== '' ? $posted_name : safe_str($lineup['name'] ?? 'My Lineup');
    if ($name === '') $name = 'My Lineup';
    if (!array_key_exists($formation, FORMATIONS)) $formation = $lineup['formation'];

                              
    if ($input->is_public !== null) {
        $is_public = $input->is_public ? 'TRUE' : 'FALSE';
        $stmt2 = $cnx->prepare("UPDATE lineups SET is_public=$is_public, updated_at=NOW() WHERE id=?");
        $stmt2->execute([$lid]);
    }

    if ($formation !== $lineup['formation']) {
        $stmt3 = $cnx->prepare('UPDATE lineups SET formation=?, name=?, updated_at=NOW() WHERE id=?');
        $stmt3->execute([$formation, $name, $lid]);
        lineup_ensure_slots($lid, $formation);
    } else {
        $stmt3 = $cnx->prepare('UPDATE lineups SET name=?, updated_at=NOW() WHERE id=?');
        $stmt3->execute([$name, $lid]);
    }

                         
    $slots = $input->slots ?? [];
    foreach ($slots as $slot) {
        $sc  = safe_str($slot['slot_code'] ?? '');
        $pid = isset($slot['player_id']) && $slot['player_id'] !== null ? (int)$slot['player_id'] : null;
        if (!$sc) continue;
        if ($pid !== null) {
            $stmt4 = $cnx->prepare('SELECT id FROM user_players WHERE user_id=? AND player_id=? LIMIT 1');
            $stmt4->execute([$user['id'], $pid]);
            $owns = $stmt4->fetch();
            if (!$owns) continue;
            
            $stmt5 = $cnx->prepare('UPDATE lineup_slots SET player_id=? WHERE lineup_id=? AND slot_code=?');
            $stmt5->execute([$pid, $lid, $sc]);
        } else {
            $stmt5 = $cnx->prepare('UPDATE lineup_slots SET player_id=NULL WHERE lineup_id=? AND slot_code=?');
            $stmt5->execute([$lid, $sc]);
        }
    }

    [$chem, $rating] = calc_chemistry($lid);
    $stmt6 = $cnx->prepare('UPDATE lineups SET chemistry=?, rating=?, updated_at=NOW() WHERE id=?');
    $stmt6->execute([$chem, $rating, $lid]);
    
    $stmt7 = $cnx->prepare('SELECT * FROM lineups WHERE id=? LIMIT 1');
    $stmt7->execute([$lid]);
    $updated = $stmt7->fetch();
    
    $challenge_updates = function_exists('validate_sbc_challenges_for_lineup')
        ? validate_sbc_challenges_for_lineup((int)$user['id'], $lid)
        : [];
    send_ok(['lineup' => $updated, 'chemistry' => $chem, 'rating' => $rating, 'challenge_updates' => $challenge_updates]);
}

function lineups_delete(): void {
    global $cnx;
    $user = require_auth();
    $input = lineup_input_model();
    $lid   = (int)($input->lineup_id ?? 0);

    $stmt = $cnx->prepare('SELECT * FROM lineups WHERE id=? AND user_id=? LIMIT 1');
    $stmt->execute([$lid, $user['id']]);
    $lineup = $stmt->fetch();
    if (!$lineup) send_err('Lineup not found', 404);

    $stmt2 = $cnx->prepare('SELECT active_lineup_id FROM users WHERE id=? LIMIT 1');
    $stmt2->execute([$user['id']]);
    $u = $stmt2->fetch();
    if ((int)($u['active_lineup_id'] ?? 0) === $lid) {
        $stmt3 = $cnx->prepare('UPDATE users SET active_lineup_id=NULL WHERE id=?');
        $stmt3->execute([$user['id']]);
    }
    
    $stmt4 = $cnx->prepare('DELETE FROM lineup_slots WHERE lineup_id=?');
    $stmt4->execute([$lid]);
    
    $stmt5 = $cnx->prepare('DELETE FROM lineups WHERE id=?');
    $stmt5->execute([$lid]);
    
    send_ok(['message' => 'Lineup deleted']);
}

function lineups_set_active(): void {
    global $cnx;
    $user = require_auth();
    $input = lineup_input_model();
    $lid   = (int)($input->lineup_id ?? 0);

    $stmt = $cnx->prepare('SELECT * FROM lineups WHERE id=? AND user_id=? LIMIT 1');
    $stmt->execute([$lid, $user['id']]);
    $lineup = $stmt->fetch();
    if (!$lineup) send_err('Lineup not found', 404);

    $stmt2 = $cnx->prepare('UPDATE users SET active_lineup_id=? WHERE id=?');
    $stmt2->execute([$lid, $user['id']]);
    
    $challenge_updates = function_exists('validate_sbc_challenges_for_lineup')
        ? validate_sbc_challenges_for_lineup((int)$user['id'], $lid)
        : [];
    send_ok(['message' => 'Active lineup set', 'lineup_id' => $lid, 'challenge_updates' => $challenge_updates]);
}

function lineups_deactivate(): void {
    global $cnx;
    $user = require_auth();
    
    $stmt = $cnx->prepare('UPDATE users SET active_lineup_id=NULL WHERE id=?');
    $stmt->execute([$user['id']]);
    
    send_ok(['message' => 'Active lineup deactivated']);
}

function lineups_duplicate(): void {
    global $cnx;
    $user = require_auth();
    $input = lineup_input_model();
    $lid   = (int)($input->lineup_id ?? 0);

    $stmt = $cnx->prepare('SELECT * FROM lineups WHERE id=? AND user_id=? LIMIT 1');
    $stmt->execute([$lid, $user['id']]);
    $lineup = $stmt->fetch();
    if (!$lineup) send_err('Lineup not found', 404);

    $new_name = ($lineup['name'] ?? 'Lineup') . ' (Copy)';
    $stmt2 = $cnx->prepare('INSERT INTO lineups (user_id, name, formation, chemistry, rating) VALUES (?,?,?,?,?) RETURNING id');
    $stmt2->execute([$user['id'], $new_name, $lineup['formation'], $lineup['chemistry'], $lineup['rating']]);
    $new_row = $stmt2->fetch();
    
    if (!$new_row) send_err('Failed to duplicate', 500);
    $new_lid = (int)$new_row['id'];

    lineup_ensure_slots($new_lid, $lineup['formation']);

    $stmt3 = $cnx->prepare('SELECT slot_code, player_id FROM lineup_slots WHERE lineup_id=?');
    $stmt3->execute([$lid]);
    $orig_slots = $stmt3->fetchAll();
    
    foreach ($orig_slots as $s) {
        if ($s['player_id']) {
            $stmt4 = $cnx->prepare('UPDATE lineup_slots SET player_id=? WHERE lineup_id=? AND slot_code=?');
            $stmt4->execute([$s['player_id'], $new_lid, $s['slot_code']]);
        }
    }
    
    $stmt5 = $cnx->prepare('SELECT * FROM lineups WHERE id=? LIMIT 1');
    $stmt5->execute([$new_lid]);
    $new_lineup = $stmt5->fetch();
    
    $challenge_updates = function_exists('validate_sbc_challenges_for_lineup')
        ? validate_sbc_challenges_for_lineup((int)$user['id'], $new_lid)
        : [];
    send_ok(['lineup' => $new_lineup, 'challenge_updates' => $challenge_updates]);
}

function lineups_public(): void {
    global $cnx;
    $page   = max(1, (int)($_GET['page'] ?? 1));
    $limit  = max(1, min(20, (int)($_GET['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;
    $sort   = $_GET['sort'] ?? 'views';
    $recent = ($_GET['recent'] ?? 'false') === 'true';

    $order_col = $sort === 'likes' ? 'l.likes_count' : 'l.views_count';
    $order = "$order_col DESC, l.updated_at DESC";

    $recent_cond = $recent ? "AND l.updated_at > NOW() - INTERVAL '90 DAY'" : "";

    $stmt = $cnx->prepare(
        "SELECT l.*, u.username FROM lineups l JOIN users u ON u.id=l.user_id
         WHERE l.is_public=TRUE $recent_cond ORDER BY $order LIMIT ? OFFSET ?"
    );
    $stmt->execute([$limit, $offset]);
    $rows = $stmt->fetchAll();
    
    if ($rows) {
        foreach ($rows as &$l) {
            $stmt2 = $cnx->prepare(
                'SELECT p.card_url, p.image_url FROM lineup_slots ls
                 JOIN players p ON p.id = ls.player_id
                 WHERE ls.lineup_id = ? AND ls.player_id IS NOT NULL
                 LIMIT 5'
            );
            $stmt2->execute([$l['id']]);
            $previews = $stmt2->fetchAll();
            $l['preview_cards'] = array_map(fn($r) => $r['card_url'] ?: $r['image_url'] ?: '', $previews);
        }
        unset($l);
    }
    
    $stmt3 = $cnx->prepare('SELECT COUNT(*) as cnt FROM lineups WHERE is_public=TRUE');
    $stmt3->execute([]);
    $total_row = $stmt3->fetch();
    
    send_ok(['lineups' => $rows, 'total' => (int)($total_row['cnt'] ?? 0)]);
}

function lineups_meta_pulse(): void {
    global $cnx;
    $recent = ($_GET['recent'] ?? 'true') === 'true';
    $limit  = max(1, min(20, (int)($_GET['limit'] ?? 10)));
    $top_per_formation = max(1, min(5, (int)($_GET['top_per_formation'] ?? 3)));

    $recent_cond = $recent ? "AND l.updated_at > NOW() - INTERVAL '30 DAY'" : "";

    $stmt_total = $cnx->prepare("SELECT COUNT(*) as total FROM lineups l WHERE l.is_public=TRUE $recent_cond");
    $stmt_total->execute();
    $total_public = (float)($stmt_total->fetch()['total'] ?? 0);

    if ($total_public <= 0) {
        send_ok(['formations' => [], 'total' => 0]);
        return;
    }

    $stmt = $cnx->prepare(
        "SELECT l.formation, COUNT(l.id) as count, AVG(l.chemistry) as avg_chem, AVG(l.rating) as avg_rating, SUM(l.views_count + l.likes_count) as engagement 
         FROM lineups l 
         WHERE l.is_public=TRUE $recent_cond 
         GROUP BY l.formation 
         ORDER BY count DESC, engagement DESC 
         LIMIT ?"
    );
    $stmt->execute([$limit]);
    $stats = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $formations = [];
    foreach ($stats as $stat) {
        $f = $stat['formation'];
        $count = (float)$stat['count'];
        $usageShare = round(($count / $total_public) * 100, 1);
        
        $stmt_top = $cnx->prepare(
            "SELECT l.*, u.username 
             FROM lineups l 
             JOIN users u ON u.id = l.user_id 
             WHERE l.formation = ? AND l.is_public=TRUE 
             ORDER BY (l.views_count + l.likes_count * 2) DESC, l.updated_at DESC
             LIMIT ?"
        );
        $stmt_top->execute([$f, $top_per_formation]);
        $top_lineups = $stmt_top->fetchAll(PDO::FETCH_ASSOC) ?: [];

        foreach ($top_lineups as &$l) {
            $stmt_preview = $cnx->prepare(
                "SELECT p.card_url, p.image_url 
                 FROM lineup_slots ls
                 JOIN players p ON p.id = ls.player_id
                 WHERE ls.lineup_id = ? AND ls.player_id IS NOT NULL
                 LIMIT 5"
            );
            $stmt_preview->execute([$l['id']]);
            $previews = $stmt_preview->fetchAll(PDO::FETCH_ASSOC) ?: [];
            $l['preview_cards'] = array_map(fn($r) => $r['card_url'] ?: $r['image_url'] ?: '', $previews);
        }
        unset($l);

        $formations[] = [
            'formation'    => $f,
            'lineup_count' => $count,
            'usage_share'  => $usageShare,
            'avg_chem'     => round((float)$stat['avg_chem'], 1),
            'avg_rating'   => round((float)$stat['avg_rating'], 1),
            'engagement'   => (int)$stat['engagement'],
            'top_lineups'  => $top_lineups
        ];
    }

    send_ok(['formations' => $formations, 'total' => $total_public]);
}

function lineups_view(): void {
    global $cnx;
    $input = lineup_input_model();
    $lid = (int)($input->lineup_id ?? (int)($_GET['id'] ?? 0));
    if (!$lid) send_err('Lineup ID required');

    $stmt = $cnx->prepare(
        'SELECT l.*, u.username FROM lineups l JOIN users u ON u.id=l.user_id WHERE l.id=? LIMIT 1'
    );
    $stmt->execute([$lid]);
    $lineup = $stmt->fetch();
    if (!$lineup) send_err('Lineup not found', 404);

    $stmt2 = $cnx->prepare('UPDATE lineups SET views_count=views_count+1 WHERE id=?');
    $stmt2->execute([$lid]);

    $stmt3 = $cnx->prepare(
        'SELECT ls.slot_code, ls.position_required, p.id as player_id, p.name, p.overall,
                p.position, p.nation, p.league, p.club,
                p.pace, p.shooting, p.passing, p.dribbling, p.defending, p.physical,
                p.rarity, p.card_type, p.card_url, p.image_url
         FROM lineup_slots ls LEFT JOIN players p ON p.id=ls.player_id
         WHERE ls.lineup_id=? ORDER BY ls.id'
    );
    $stmt3->execute([$lid]);
    $slots = $stmt3->fetchAll();
    
    $lineup['slots'] = $slots;
    send_ok(['lineup' => $lineup]);
}

function lineups_like(): void {
    global $cnx;
    $user = require_auth();
    $input = lineup_input_model();
    $lid   = (int)($input->lineup_id ?? 0);

    $stmt = $cnx->prepare('SELECT * FROM lineups WHERE id=? AND is_public=TRUE LIMIT 1');
    $stmt->execute([$lid]);
    $lineup = $stmt->fetch();
    if (!$lineup) send_err('Lineup not found', 404);

    $stmt2 = $cnx->prepare('UPDATE lineups SET likes_count=likes_count+1 WHERE id=?');
    $stmt2->execute([$lid]);
    
    send_ok(['message' => 'Liked', 'likes' => (int)($lineup['likes_count'] ?? 0) + 1]);
}
