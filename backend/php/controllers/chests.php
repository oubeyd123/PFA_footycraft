<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/models/Chest.php';
require_once dirname(__DIR__) . '/models/Player.php';

require_once ROOT_DIR . '/config/database.php';
global $cnx;
if (($_GET['group'] ?? '') === 'chests') {
    $action = $_GET['action'] ?? '';
    if ($action === 'status') {
        chests_status();
    } elseif ($action === 'open') {
        chests_open();
    } else {
        send_err('Not found', 404);
    }
}

function chests_status(): void {
    global $cnx;
    $user = require_auth();
    $disable_cooldown = chest_cooldown_disabled();
    
    $stmt = $cnx->prepare('SELECT * FROM chest_cooldowns WHERE user_id=?');
    $stmt->execute([$user['id']]);
    $rows = $stmt->fetchAll();

    $result = [];
    $now    = time();
    foreach ($rows as $r) {
        $ct   = $r['chest_type'];
        $nxt  = strtotime($r['next_available_at']);
        $avail = $disable_cooldown ? true : ($now >= $nxt);
        $result[$ct] = [
            'available'        => $avail,
            'next_available_at' => $disable_cooldown ? null : $r['next_available_at'],
            'seconds_remaining' => $disable_cooldown ? 0 : max(0, $nxt - $now),
        ];
    }
    foreach (['bronze','silver','gold'] as $ct) {
        if (!isset($result[$ct])) {
            $result[$ct] = ['available' => true, 'next_available_at' => null, 'seconds_remaining' => 0];
        }
    }
    send_ok($result);
}

function pick_rarity(string $chest_type): string {
    $pool    = CHEST_POOL[$chest_type];
    $choices = array_column($pool, 'rarity');
    $weights = array_column($pool, 'weight');
    return weighted_choice($choices, $weights);
}

function random_player_for_chest(?string $rarity = null, array $exclude_ids = []): ?array {
    global $cnx;

    $where = [];
    $params = [];

    if ($rarity !== null && $rarity !== '') {
        $where[] = 'rarity=?';
        $params[] = $rarity;
    }

    if (!empty($exclude_ids)) {
        $clean_ids = array_values(array_unique(array_map('intval', $exclude_ids)));
        $placeholders = implode(',', array_fill(0, count($clean_ids), '?'));
        $where[] = "id NOT IN ($placeholders)";
        $params = array_merge($params, $clean_ids);
    }

    $sql = 'SELECT * FROM players';
    if (!empty($where)) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY RANDOM() LIMIT 1';

    $stmt = $cnx->prepare($sql);
    $stmt->execute($params);
    $player = $stmt->fetch();

    return $player ?: null;
}

function normalize_chest_type(string $value): string {
    $value = strtolower(trim($value));

    if (in_array($value, ['bronze', 'silver', 'gold'], true)) {
        return $value;
    }

    if (str_contains($value, 'bronze')) return 'bronze';
    if (str_contains($value, 'silver')) return 'silver';
    if (str_contains($value, 'gold')) return 'gold';

    return '';
}

function chest_cooldown_disabled(): bool {
                                                                    
    return true;
}

function chest_input_model(): Chest {
    $input = new Chest();
    $raw_type = $_POST['chest_type'] ?? $_POST['chestType'] ?? $_REQUEST['chest_type'] ?? $_REQUEST['chestType'] ?? '';
    $input->chest_type = normalize_chest_type(safe_str($raw_type));

    return $input;
}

function chests_open(): void {
    global $cnx;
    $user       = require_auth();
    $input      = chest_input_model();
    $chest_type = safe_str($input->chest_type ?? '');
    if ($chest_type === '') {
        send_err('Invalid chest type');
    }

    $stmt = $cnx->prepare('SELECT * FROM chest_cooldowns WHERE user_id=? AND chest_type=? LIMIT 1');
    $stmt->execute([$user['id'], $chest_type]);
    $cd = $stmt->fetch();
    
    $now = time();
    $ignore_cooldown = chest_cooldown_disabled();
    if ($cd && !$ignore_cooldown) {
        $nxt = strtotime($cd['next_available_at']);
        if ($now < $nxt) {
            $secs = $nxt - $now;
            send_err("Chest not available yet. Try again in {$secs} seconds.");
        }
    }

    $count   = CHEST_REWARD_COUNT[$chest_type];
    $rewards = [];
    $picked_ids = [];
    for ($i = 0; $i < $count; $i++) {
        $rarity = pick_rarity($chest_type);

                                                             
        $player = random_player_for_chest($rarity, $picked_ids);
        if (!$player) {
            $player = random_player_for_chest(null, $picked_ids);
        }

                                                                                             
        if (!$player) {
            $player = random_player_for_chest($rarity, []);
        }
        if (!$player) {
            $player = random_player_for_chest(null, []);
        }

        if ($player) {
            $player['card_url'] = player_resolve_card_url((array)$player);
            $stmt4 = $cnx->prepare('INSERT INTO user_players (user_id, player_id, source) VALUES (?,?,?)');
            $stmt4->execute([$user['id'], $player['id'], $chest_type]);
            $rewards[] = $player;
            $picked_ids[] = (int) $player['id'];
        }
    }

    $hours    = CHEST_COOLDOWNS_HRS[$chest_type];
    if ($ignore_cooldown) {
        $hours = 0;
    }
    $next_ts  = date('Y-m-d H:i:s', $now + $hours * 3600);
    
    $stmt5 = $cnx->prepare(
        'INSERT INTO chest_cooldowns (user_id, chest_type, next_available_at) VALUES (?,?,?)
         ON CONFLICT (user_id, chest_type) DO UPDATE SET next_available_at=?'
    );
    $stmt5->execute([$user['id'], $chest_type, $next_ts, $next_ts]);
    
    $stmt6 = $cnx->prepare('INSERT INTO chest_log (user_id, chest_type, rewards_json) VALUES (?,?,?)');
    $stmt6->execute([$user['id'], $chest_type, json_encode(array_column($rewards, 'id'))]);

    $opened_chest = new Chest((int)$user['id'], $chest_type);
    $opened_chest->opened = true;
    $opened_chest->created_at = date('Y-m-d H:i:s', $now);
    $opened_chest->next_available_at = $next_ts;

    update_challenge_progress($user['id'], 'chests', 1);
    send_ok(['rewards' => $rewards, 'chest_type' => $chest_type, 'chest' => $opened_chest]);
}
