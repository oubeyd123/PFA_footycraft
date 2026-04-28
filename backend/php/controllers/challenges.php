<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/models/Challenge.php';

require_once ROOT_DIR . '/config/database.php';
global $cnx;
seed_default_challenges($cnx);

if (($_GET['group'] ?? '') === 'challenges') {
    $action = $_GET['action'] ?? '';
    if ($action === 'list') {
        challenges_list();
    } elseif ($action === 'claim') {
        challenges_claim();
    } else {
        send_err('Not found', 404);
    }
}

function seed_default_challenges(PDO $cnx): void {
    static $done = false;
    if ($done) return;

    $defaults = [
        [
            'First Win',
            'Win any match in any mode.',
            'easy',
            ['type' => 'win', 'count' => 1, 'label' => 'Win 1 match'],
            ['division_points' => 2],
            '+2 Division Points',
            '+30 days',
        ],
        [
            'Goal Rush',
            'Score 5 goals across any match mode.',
            'daily',
            ['type' => 'goals', 'count' => 5, 'label' => 'Score 5 goals'],
            ['division_points' => 3],
            '+3 Division Points',
            '+7 days',
        ],
        [
            'Division Grind',
            'Earn 15 division points from matches and mode bonuses.',
            'weekly',
            ['type' => 'division_points', 'count' => 15, 'label' => 'Earn 15 division points'],
            ['division_points' => 4],
            '+4 Division Points',
            '+14 days',
        ],
        [
            'Pack Starter',
            'Open any chest.',
            'easy',
            ['type' => 'chests', 'count' => 1, 'label' => 'Open 1 chest'],
            ['division_points' => 1],
            '+1 Division Point',
            '+30 days',
        ],
        [
            'Silver Ceiling SBC',
            'Complete a full starting XI using only players rated under 80.',
            'sbc',
            [
                'type' => 'lineup_rule',
                'required_slots' => 11,
                'label' => 'Full XI, every player 79 OVR or lower',
                'rules' => [['rule' => 'max_player_rating', 'value' => 79]],
            ],
            ['division_points' => 3],
            '+3 Division Points',
            '+60 days',
        ],
        [
            'Midfield Core SBC',
            'Complete a lineup with at least 3 midfielders.',
            'sbc',
            [
                'type' => 'lineup_rule',
                'required_slots' => 11,
                'label' => 'Full XI with at least 3 midfielders',
                'rules' => [['rule' => 'min_position_group', 'group' => 'midfielder', 'count' => 3]],
            ],
            ['division_points' => 2],
            '+2 Division Points',
            '+60 days',
        ],
        [
            'Elite Rating SBC',
            'Complete a full starting XI with a minimum team rating of 85.',
            'sbc',
            [
                'type' => 'lineup_rule',
                'required_slots' => 11,
                'label' => 'Full XI with 85+ average OVR',
                'rules' => [['rule' => 'min_team_rating', 'value' => 85]],
            ],
            ['division_points' => 5],
            '+5 Division Points',
            '+60 days',
        ],
        [
            'Club Mix SBC',
            'Complete a full starting XI with players from at least 2 different clubs.',
            'sbc',
            [
                'type' => 'lineup_rule',
                'required_slots' => 11,
                'label' => 'Full XI from at least 2 clubs',
                'rules' => [['rule' => 'min_distinct_clubs', 'count' => 2]],
            ],
            ['division_points' => 2],
            '+2 Division Points',
            '+60 days',
        ],
        [
            'Icon Chase Event',
            'Win 3 matches in any mode to earn a random icon player.',
            'event',
            ['type' => 'win', 'count' => 3, 'label' => 'Win 3 matches'],
            ['player_rarity' => 'icon'],
            'Random Icon Player',
            '+21 days',
        ],
        [
            'Brazil Trio Pack',
            'Score 8 goals across any mode to earn 3 Brazilian players.',
            'special',
            ['type' => 'goals', 'count' => 8, 'label' => 'Score 8 goals'],
            ['player_pack' => ['count' => 3, 'nation' => 'Brazil']],
            '3-Player Brazil Pack',
            '+21 days',
        ],
        [
            'Super League Pack',
            'Earn 12 division points to unlock a 5-player Super League pack.',
            'weekly',
            ['type' => 'division_points', 'count' => 12, 'label' => 'Earn 12 division points'],
            ['player_pack' => ['count' => 5, 'league' => 'Super League']],
            '5-Player Super League Pack',
            '+21 days',
        ],
        [
            'Daegu Club Pack SBC',
            'Build a full XI with at least 2 Daegu FC players to earn a Daegu player pack.',
            'sbc',
            [
                'type' => 'lineup_rule',
                'required_slots' => 11,
                'label' => 'Full XI with at least 2 Daegu FC players',
                'rules' => [['rule' => 'min_players_from_club', 'club' => 'Daegu FC', 'count' => 2]],
            ],
            ['player_pack' => ['count' => 3, 'club' => 'Daegu FC']],
            '3-Player Daegu FC Pack',
            '+60 days',
        ],
    ];

    foreach ($defaults as [$title, $description, $type, $condition, $reward, $rewardLabel, $ttl]) {
        $stmt = $cnx->prepare('SELECT id FROM challenges WHERE title=? LIMIT 1');
        $stmt->execute([$title]);
        $exists = $stmt->fetch();
        if ($exists) continue;

        $stmt2 = $cnx->prepare(
            "INSERT INTO challenges
             (title, description, type, condition_type, condition_value, condition_json,
              reward_type, reward_value, reward_json, active, start_at, end_at, expiration_date, created_at)
             VALUES (?,?,?,?,?,?,?,?,?,TRUE,NOW(),NOW() + (?::interval),NOW() + (?::interval),NOW())"
        );
        $stmt2->execute([
            $title,
            $description,
            $type,
            (string)($condition['type'] ?? ''),
            json_encode($condition),
            json_encode($condition),
            'division_points',
            $rewardLabel,
            json_encode($reward),
            $ttl,
            $ttl,
        ]);
    }

    $done = true;
}

function challenge_condition($challenge): array {
    $cond = json_decode((string)($challenge['condition_json'] ?? '{}'), true);
    if (!is_array($cond)) $cond = [];

    $value = json_decode((string)($challenge['condition_value'] ?? '{}'), true);
    if (is_array($value)) {
        $cond = array_replace($value, $cond);
    } elseif (($challenge['condition_value'] ?? '') !== '' && !isset($cond['count'])) {
        $cond['count'] = (int)$challenge['condition_value'];
    }

    if (!isset($cond['type']) || $cond['type'] === '') {
        $cond['type'] = (string)($challenge['condition_type'] ?? '');
    }

    return $cond;
}

function challenge_truthy(mixed $value): bool {
    return $value === true || $value === 1 || $value === '1' || $value === 't' || $value === 'true';
}

function challenge_reward($challenge): array {
    $reward = json_decode((string)($challenge['reward_json'] ?? '{}'), true);
    if (!is_array($reward)) $reward = [];

    $type = (string)($challenge['reward_type'] ?? '');
    $value = (string)($challenge['reward_value'] ?? '');
    if ($type !== '' && !$reward) {
        if (in_array($type, ['points', 'division_points', 'bonus_points'], true)) {
            $reward['division_points'] = (int)$value;
        } elseif ($type === 'player') {
            $reward['player_rarity'] = $value;
        } elseif ($type === 'chest') {
            $reward['chest'] = $value;
        }
    }

    return $reward;
}

function challenge_active_where(): string {
    return "c.active=TRUE
        AND COALESCE(c.start_at, NOW() - INTERVAL '1 day') <= NOW()
        AND COALESCE(c.expiration_date, c.end_at, NOW() + INTERVAL '1 day') > NOW()";
}

function challenge_event_matches(string $conditionType, string $eventType): bool {
    $conditionType = strtolower($conditionType);
    $eventType = strtolower($eventType);
    if ($conditionType === $eventType) return true;

    $aliases = [
        'win' => ['wins', 'win_streak', 'match_win'],
        'wins' => ['win', 'win_streak', 'match_win'],
        'goals_scored' => ['goals'],
        'points' => ['division_points'],
    ];

    return in_array($eventType, $aliases[$conditionType] ?? [], true);
}

function challenge_progress_payload(array $progress, int $count, bool $completed): string {
    $progress['count'] = $count;
    $progress['completed'] = $completed;
    return json_encode($progress);
}

function challenge_reward_label(array $reward): string {
    $parts = [];
    $points = (int)($reward['division_points'] ?? 0) + (int)($reward['bonus_points'] ?? 0);
    if ($points > 0) $parts[] = '+' . $points . ' Division Points';
    if (!empty($reward['chest'])) $parts[] = ucfirst((string)$reward['chest']) . ' Chest';
    if (!empty($reward['player_rarity'])) {
        $rarity = ucfirst((string)$reward['player_rarity']);
        $parts[] = $rarity === 'Icon' ? 'Random Icon Player' : $rarity . ' Player';
    }
    if (!empty($reward['player_pack']) && is_array($reward['player_pack'])) {
        $pack = $reward['player_pack'];
        $count = max(1, (int)($pack['count'] ?? 1));
        $filter = '';
        if (!empty($pack['nation'])) $filter = (string)$pack['nation'] . ' ';
        elseif (!empty($pack['league'])) $filter = (string)$pack['league'] . ' ';
        elseif (!empty($pack['club'])) $filter = (string)$pack['club'] . ' ';
        elseif (!empty($pack['rarity'])) $filter = ucfirst((string)$pack['rarity']) . ' ';
        $parts[] = $count . '-Player ' . $filter . 'Pack';
    }
    if (!empty($reward['player_id'])) $parts[] = 'Special Player';
    return $parts ? implode(' + ', $parts) : 'Reward';
}

function challenge_condition_label(array $condition): string {
    if (!empty($condition['label'])) return (string)$condition['label'];
    if (($condition['type'] ?? '') !== 'lineup_rule') {
        return ucfirst(str_replace('_', ' ', (string)($condition['type'] ?? 'challenge'))) . ': ' . (int)($condition['count'] ?? 1);
    }

    $labels = [];
    foreach (($condition['rules'] ?? []) as $rule) {
        $name = (string)($rule['rule'] ?? '');
        if ($name === 'max_player_rating') $labels[] = 'Every player ' . (int)($rule['value'] ?? 79) . ' OVR or lower';
        if ($name === 'min_team_rating') $labels[] = 'Team rating at least ' . (int)($rule['value'] ?? 85);
        if ($name === 'min_distinct_clubs') $labels[] = 'At least ' . (int)($rule['count'] ?? 2) . ' clubs';
        if ($name === 'min_distinct_teams') $labels[] = 'At least ' . (int)($rule['count'] ?? 2) . ' clubs';
        if ($name === 'min_position_group') $labels[] = 'At least ' . (int)($rule['count'] ?? 1) . ' ' . (string)($rule['group'] ?? 'players');
        if ($name === 'min_players_from_nation') $labels[] = 'At least ' . (int)($rule['count'] ?? 1) . ' players from ' . (string)($rule['nation'] ?? 'one nation');
        if ($name === 'min_players_from_league') $labels[] = 'At least ' . (int)($rule['count'] ?? 1) . ' players from ' . (string)($rule['league'] ?? 'one league');
        if ($name === 'min_players_from_club') $labels[] = 'At least ' . (int)($rule['count'] ?? 1) . ' players from ' . (string)($rule['club'] ?? 'one club');
    }
    return $labels ? implode('; ', $labels) : 'Lineup rule';
}

function complete_challenge(PDO $cnx, int $user_id, $challenge, array $progress): ?array {
    $reward = challenge_reward($challenge);
    $count = (int)($progress['count'] ?? $progress['satisfied'] ?? 1);
    $existing = getRow(
        $cnx,
        'SELECT completed_at, reward_claimed FROM user_challenges WHERE user_id = ? AND challenge_id = ? LIMIT 1',
        [$user_id, (int)$challenge['id']]
    );
    $wasAlreadyCompleted = !empty($existing['completed_at']);

    $uc = getRow(
        $cnx,
        'INSERT INTO user_challenges (user_id, challenge_id, progress_json, progress, completed, completed_at, reward_claimed)
         VALUES (?,?,?, ?, TRUE, NOW(), FALSE)
         ON CONFLICT (user_id, challenge_id) DO UPDATE SET
             progress_json=EXCLUDED.progress_json,
             progress=EXCLUDED.progress,
             completed=TRUE,
             completed_at=COALESCE(user_challenges.completed_at, NOW())
         RETURNING id, reward_claimed, completed_at',
        [$user_id, (int)$challenge['id'], json_encode($progress), $count]
    );

    if (!$uc || challenge_truthy($uc['reward_claimed'] ?? false)) {
        return null;
    }

    if (!$wasAlreadyCompleted) {
        create_notification(
            $cnx,
            $user_id,
            'challenge',
            "Challenge completed: " . (string)($challenge['title'] ?? 'Challenge') . ". Claim your reward from Challenges.",
            '#challenges',
            'challenge'
        );
    }

    return [
        'challenge_id' => (int)$challenge['id'],
        'title' => (string)$challenge['title'],
        'type' => (string)($challenge['type'] ?? 'easy'),
        'reward' => $reward,
        'reward_label' => challenge_reward_label($reward),
        'claimable' => true,
    ];
}

function grant_challenge_reward(PDO $cnx, int $user_id, array $reward, string $title): array {
    $grant = ['division_points' => 0, 'reward_player' => null, 'reward_players' => [], 'chest' => null, 'player_pack' => null];
    $points = max(0, (int)($reward['division_points'] ?? 0) + (int)($reward['bonus_points'] ?? 0));
    if ($points > 0) {
        $division = division_apply_bonus($cnx, $user_id, $points, 'challenge: ' . $title);
        $grant['division_points'] = $points;
        $grant['division'] = $division;
    }

    $chest_type = $reward['chest'] ?? null;
    if ($chest_type) {
        execute(
            $cnx,
            'INSERT INTO chest_cooldowns (user_id, chest_type, next_available_at) VALUES (?,?,NOW())
             ON CONFLICT (user_id, chest_type) DO UPDATE SET next_available_at=NOW()',
            [$user_id, (string)$chest_type]
        );
        $grant['chest'] = $chest_type;
    }

    $player = null;
    if (!empty($reward['player_id'])) {
        $player = getRow($cnx, 'SELECT * FROM players WHERE id=? LIMIT 1', [(int)$reward['player_id']]);
    } elseif (!empty($reward['player_rarity'])) {
        $player = getRow($cnx, 'SELECT * FROM players WHERE rarity=? ORDER BY RANDOM() LIMIT 1', [(string)$reward['player_rarity']]);
    }

    if ($player) {
        execute(
            $cnx,
            'INSERT INTO user_players (user_id, player_id, source) VALUES (?,?,?)',
            [$user_id, (int)$player['id'], 'challenge']
        );
        $grant['reward_player'] = $player;
    }

    if (!empty($reward['player_pack']) && is_array($reward['player_pack'])) {
        $players = challenge_pick_pack_players($cnx, $reward['player_pack']);
        foreach ($players as $pack_player) {
            execute(
                $cnx,
                'INSERT INTO user_players (user_id, player_id, source) VALUES (?,?,?)',
                [$user_id, (int)$pack_player['id'], 'challenge_pack']
            );
        }
        $grant['player_pack'] = $reward['player_pack'];
        $grant['reward_players'] = $players;
    }

    return $grant;
}

function challenge_pick_pack_players(PDO $cnx, array $pack): array {
    $count = max(1, min(12, (int)($pack['count'] ?? 1)));
    $where = [];
    $params = [];

    foreach (['nation', 'league', 'club', 'rarity'] as $field) {
        if (!empty($pack[$field])) {
            $where[] = "{$field} = ?";
            $params[] = (string)$pack[$field];
        }
    }
    if (isset($pack['min_overall'])) {
        $where[] = 'overall >= ?';
        $params[] = (int)$pack['min_overall'];
    }
    if (isset($pack['max_overall'])) {
        $where[] = 'overall <= ?';
        $params[] = (int)$pack['max_overall'];
    }

    $sql = 'SELECT * FROM players';
    if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
    $sql .= ' ORDER BY RANDOM() LIMIT ?';
    $params[] = $count;
    $rows = getRows($cnx, $sql, $params);

    if (count($rows) < $count && $where) {
        $fallback = getRows($cnx, 'SELECT * FROM players ORDER BY RANDOM() LIMIT ?', [$count - count($rows)]);
        $rows = array_merge($rows, $fallback);
    }

    return array_slice($rows, 0, $count);
}

function update_challenge_progress(int $user_id, string $event_type, int $increment): array {
    global $cnx;
    if ($increment <= 0) return [];

    $active = getRows($cnx,
        "SELECT c.*, uc.id as uc_id, uc.progress_json, uc.completed_at
         FROM challenges c
         LEFT JOIN user_challenges uc ON uc.challenge_id=c.id AND uc.user_id=?
         WHERE " . challenge_active_where() . " AND uc.completed_at IS NULL",
        [$user_id]
    );

    $completed = [];
    foreach ($active as $ch) {
        $cond = challenge_condition($ch);
        if (($cond['type'] ?? '') === 'lineup_rule' || ($ch['type'] ?? '') === 'sbc') continue;
        if (!challenge_event_matches((string)($cond['type'] ?? ''), $event_type)) continue;

        $prog = json_decode((string)($ch['progress_json'] ?? '{}'), true);
        if (!is_array($prog)) $prog = [];
        $count = (int)($prog['count'] ?? 0) + $increment;
        $required = max(1, (int)($cond['count'] ?? 1));
        $is_complete = $count >= $required;
        $prog_json = challenge_progress_payload($prog, $count, $is_complete);

        if ($is_complete) {
            $prog['count'] = $count;
            $prog['required'] = $required;
            $done = complete_challenge($cnx, $user_id, $ch, $prog);
            if ($done) $completed[] = $done;
        } else {
            execute(
                $cnx,
                'INSERT INTO user_challenges (user_id, challenge_id, progress_json, progress, completed)
                 VALUES (?,?,?,?,FALSE)
                 ON CONFLICT (user_id, challenge_id) DO UPDATE SET
                     progress_json=EXCLUDED.progress_json,
                     progress=EXCLUDED.progress',
                [$user_id, (int)$ch['id'], $prog_json, $count]
            );
        }
    }

    return $completed;
}

function challenge_lineup_slots(PDO $cnx, int $lineup_id): array {
    return getRows(
        $cnx,
        'SELECT ls.slot_code, ls.position_required, p.id as player_id, p.name, p.overall, p.position, p.club, p.league, p.nation
         FROM lineup_slots ls
         LEFT JOIN players p ON p.id=ls.player_id
         WHERE ls.lineup_id=?
         ORDER BY ls.id',
        [$lineup_id]
    );
}

function challenge_slot_is_midfielder($slot): bool {
    $position = strtoupper((string)($slot['position'] ?? ''));
    $code = strtoupper((string)($slot['slot_code'] ?? ''));
    return in_array($position, ['CDM', 'CM', 'CAM', 'LM', 'RM'], true)
        || preg_match('/^(CDM|LCM|CM|RCM|LM|RM|CAM|LAM|RAM)$/', $code) === 1;
}

function challenge_sbc_rule_passed(array $rule, array $players, array $slots, float $rating): bool {
    $name = (string)($rule['rule'] ?? '');

    if ($name === 'max_player_rating') {
        $max = (int)($rule['value'] ?? 79);
        foreach ($players as $player) {
            if ((int)($player['overall'] ?? 0) > $max) return false;
        }
        return true;
    }

    if ($name === 'min_team_rating') {
        return $rating >= (float)($rule['value'] ?? 0);
    }

    if ($name === 'min_distinct_clubs' || $name === 'min_distinct_teams') {
        $clubs = [];
        foreach ($players as $player) {
            $club = trim((string)($player['club'] ?? ''));
            if ($club !== '') $clubs[$club] = true;
        }
        return count($clubs) >= (int)($rule['count'] ?? 1);
    }

    if ($name === 'min_position_group') {
        $group = (string)($rule['group'] ?? '');
        $needed = (int)($rule['count'] ?? 1);
        if ($group === 'midfielder') {
            return count(array_filter($slots, 'challenge_slot_is_midfielder')) >= $needed;
        }
    }

    if ($name === 'min_players_from_nation') {
        $nation = (string)($rule['nation'] ?? '');
        $needed = (int)($rule['count'] ?? 1);
        return count(array_filter($players, fn($p) => (string)($p['nation'] ?? '') === $nation)) >= $needed;
    }

    if ($name === 'min_players_from_league') {
        $league = (string)($rule['league'] ?? '');
        $needed = (int)($rule['count'] ?? 1);
        return count(array_filter($players, fn($p) => (string)($p['league'] ?? '') === $league)) >= $needed;
    }

    if ($name === 'min_players_from_club') {
        $club = (string)($rule['club'] ?? '');
        $needed = (int)($rule['count'] ?? 1);
        return count(array_filter($players, fn($p) => (string)($p['club'] ?? '') === $club)) >= $needed;
    }

    return false;
}

function evaluate_sbc_condition(PDO $cnx, int $lineup_id, array $condition): array {
    $slots = challenge_lineup_slots($cnx, $lineup_id);
    $players = array_values(array_filter($slots, fn($slot) => (int)($slot['player_id'] ?? 0) > 0));
    $filled = count($players);
    $required_slots = max(1, (int)($condition['required_slots'] ?? 11));
    $rating = $filled ? array_sum(array_map(fn($p) => (float)($p['overall'] ?? 0), $players)) / $filled : 0.0;
    $rules = $condition['rules'] ?? [];
    if (!is_array($rules) || !$rules) $rules = [];

    $checks = [];
    $checks[] = [
        'label' => 'Lineup has ' . $required_slots . ' filled slots',
        'passed' => $filled >= $required_slots,
    ];

    foreach ($rules as $rule) {
        if (!is_array($rule)) continue;
        $checks[] = [
            'label' => challenge_condition_label(['type' => 'lineup_rule', 'rules' => [$rule]]),
            'passed' => challenge_sbc_rule_passed($rule, $players, $slots, $rating),
        ];
    }

    $satisfied = count(array_filter($checks, fn($check) => !empty($check['passed'])));
    return [
        'valid' => $satisfied === count($checks),
        'satisfied' => $satisfied,
        'total' => count($checks),
        'filled_slots' => $filled,
        'team_rating' => round($rating, 1),
        'checks' => $checks,
    ];
}

function validate_sbc_challenges_for_lineup(int $user_id, int $lineup_id): array {
    global $cnx;

    $lineup = getRow($cnx, 'SELECT id FROM lineups WHERE id=? AND user_id=? LIMIT 1', [$lineup_id, $user_id]);
    if (!$lineup) return [];

    $active = getRows($cnx,
        "SELECT c.*, uc.id as uc_id, uc.progress_json, uc.completed_at
         FROM challenges c
         LEFT JOIN user_challenges uc ON uc.challenge_id=c.id AND uc.user_id=?
         WHERE " . challenge_active_where() . "
           AND COALESCE(c.type, '') = 'sbc'
           AND uc.completed_at IS NULL",
        [$user_id]
    );

    $completed = [];
    foreach ($active as $ch) {
        $cond = challenge_condition($ch);
        $eval = evaluate_sbc_condition($cnx, $lineup_id, $cond);
        $progress = [
            'count' => (int)$eval['satisfied'],
            'required' => (int)$eval['total'],
            'satisfied' => (int)$eval['satisfied'],
            'total' => (int)$eval['total'],
            'lineup_id' => $lineup_id,
            'filled_slots' => (int)$eval['filled_slots'],
            'team_rating' => (float)$eval['team_rating'],
            'checks' => $eval['checks'],
        ];

        if ($eval['valid']) {
            $done = complete_challenge($cnx, $user_id, $ch, $progress);
            if ($done) $completed[] = $done;
        } else {
            execute(
                $cnx,
                'INSERT INTO user_challenges (user_id, challenge_id, progress_json, progress, completed)
                 VALUES (?,?,?,?,FALSE)
                 ON CONFLICT (user_id, challenge_id) DO UPDATE SET
                     progress_json=EXCLUDED.progress_json,
                     progress=EXCLUDED.progress',
                [$user_id, (int)$ch['id'], json_encode($progress), (int)$eval['satisfied']]
            );
        }
    }

    return $completed;
}

function validate_sbc_challenges_for_user(int $user_id): array {
    global $cnx;
    $row = getRow($cnx, 'SELECT active_lineup_id FROM users WHERE id=? LIMIT 1', [$user_id]);
    $lineup_id = (int)($row['active_lineup_id'] ?? 0);
    return $lineup_id > 0 ? validate_sbc_challenges_for_lineup($user_id, $lineup_id) : [];
}

function challenges_list(): void {
    global $cnx;
    $user = require_auth();
    validate_sbc_challenges_for_user((int)$user['id']);

    $rows = getRows($cnx,
        'SELECT c.*, uc.progress_json, uc.progress, uc.completed, uc.completed_at, uc.reward_claimed
         FROM challenges c
         LEFT JOIN user_challenges uc ON uc.challenge_id=c.id AND uc.user_id=?
         WHERE ' . challenge_active_where() . '
         ORDER BY CASE WHEN c.type = \'sbc\' THEN 0 ELSE 1 END, c.id',
        [$user['id']]
    );

    $result = [];
    foreach ($rows as $r) {
        $cond = challenge_condition($r);
        $reward = challenge_reward($r);
        $prog = json_decode((string)($r['progress_json'] ?? '{}'), true);
        if (!is_array($prog)) $prog = [];
        $is_sbc = (($r['type'] ?? '') === 'sbc') || (($cond['type'] ?? '') === 'lineup_rule');
        $required = $is_sbc ? (int)($prog['total'] ?? max(1, count($cond['rules'] ?? []) + 1)) : (int)($cond['count'] ?? 1);
        $progress = $is_sbc ? (int)($prog['satisfied'] ?? $prog['count'] ?? 0) : (int)($prog['count'] ?? $r['progress'] ?? 0);

        $r['condition'] = $cond;
        $r['condition_label'] = challenge_condition_label($cond);
        $r['reward'] = $reward;
        $r['reward_label'] = challenge_reward_label($reward);
        $r['progress'] = $progress;
        $r['required'] = max(1, $required);
        $r['completed'] = challenge_truthy($r['completed'] ?? false) || !empty($r['completed_at']);
        $r['reward_claimed'] = challenge_truthy($r['reward_claimed'] ?? false);
        $r['status'] = $r['completed'] ? ($r['reward_claimed'] ? 'Claimed' : 'Reward ready') : 'In progress';
        $r['sbc_checks'] = $is_sbc ? ($prog['checks'] ?? []) : [];
        $result[] = $r;
    }

    send_ok(['challenges' => $result]);
}

function challenges_claim(): void {
    global $cnx;
    $user = require_auth();
    $input = new Challenge();
    $input->id = (int)($_POST['challenge_id'] ?? 0);
    $cid = (int)($input->id ?? 0);

    $uc = getRow($cnx,
        'SELECT uc.*, c.reward_json, c.title FROM user_challenges uc
         JOIN challenges c ON c.id=uc.challenge_id
         WHERE uc.user_id=? AND uc.challenge_id=? LIMIT 1',
        [$user['id'], $cid]
    );
    if (!$uc) send_err('Challenge not found or not completed');
    if (!$uc['completed_at']) send_err('Challenge not completed yet');
    if (challenge_truthy($uc['reward_claimed'] ?? false)) send_ok(['reward' => challenge_reward($uc), 'message' => 'Reward already claimed.']);

    $reward = challenge_reward($uc);
    $grant = grant_challenge_reward($cnx, (int)$user['id'], $reward, (string)($uc['title'] ?? 'Challenge'));
    
    $stmt = $cnx->prepare('UPDATE user_challenges SET reward_claimed=TRUE WHERE id=?');
    $stmt->execute([$uc['id']]);

    create_notification(
        $cnx,
        (int)$user['id'],
        'challenge',
        "Reward claimed for challenge: " . (string)($uc['title'] ?? 'Challenge') . ".",
        '#challenges',
        'challenge'
    );
    
    send_ok(['reward' => $reward, 'grant' => $grant, 'message' => 'Reward granted!']);
}
