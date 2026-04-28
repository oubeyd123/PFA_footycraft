<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/models/User.php';

require_once ROOT_DIR . '/config/database.php';
global $cnx;
if (($_GET['group'] ?? '') === 'play') {
    $action = $_GET['action'] ?? '';
    if ($action === 'kickoff') {
        play_kickoff();
    } elseif ($action === 'tournament') {
        play_tournament();
    } elseif ($action === 'season') {
        play_season();
    } elseif ($action === 'shootout') {
        play_shootout();
    } elseif ($action === 'forfeit') {
        play_forfeit();
    } else {
        send_err('Not found', 404);
    }
}

function match_engine_clamp(float $value, float $min, float $max): float
{
    return max($min, min($max, $value));
}

function match_poisson_sample(float $lambda): int
{
    if ($lambda <= 0) {
        return 0;
    }

    $limit = exp(-$lambda);
    $product = 1.0;
    $goals = 0;

    do {
        $goals++;
        $product *= rand_float();
    } while ($product > $limit && $goals < 12);

    return max(0, $goals - 1);
}

function match_sample_goals_from_xg(float $xg): int
{
    $tempo = rand_uniform(0.84, 1.18);
    $finishing = rand_uniform(0.92, 1.10);
    $chaos = rand_float() < 0.14 ? rand_uniform(1.08, 1.28) : 1.0;
    $realized_xg = match_engine_clamp(
        ($xg * $tempo * $finishing * $chaos) + rand_uniform(0.0, 0.18),
        0.05,
        5.2
    );

    $goals = match_poisson_sample($realized_xg);

    if ($realized_xg >= 2.3 && rand_float() < 0.18) {
        $goals++;
    }

    return min(7, max(0, $goals));
}

function play_current_user_and_row(): array {
    global $cnx;
    $user = require_auth();
    $stmt = $cnx->prepare('SELECT * FROM users WHERE id=? LIMIT 1');
    $stmt->execute([$user['id']]);
    $row = $stmt->fetch();

    return [$cnx, $user, $row ?: new User()];
}

function play_active_lineup($cnx, array $user, ?array $row, string $missingMsg): array {
    $lid = (int)($row['active_lineup_id'] ?? 0);
    if (!$lid) {
        send_err($missingMsg);
    }

    $stmt = $cnx->prepare('SELECT * FROM lineups WHERE id=? AND user_id=? LIMIT 1');
    $stmt->execute([$lid, $user['id']]);
    $lineup = $stmt->fetch();

    if (!$lineup) {
        send_err('Selected active lineup is no longer available. Pick a valid lineup and try again.');
    }

    return [$lid, $lineup];
}

function lineup_required_player_count($lineup): int {
    $formation = (string)($lineup['formation'] ?? '4-3-3');
    return count(FORMATIONS[$formation] ?? FORMATIONS['4-3-3']);
}

function lineup_filled_player_count($cnx, int $lineup_id): int {
    $stmt = $cnx->prepare(
        'SELECT COUNT(DISTINCT slot_code) AS cnt
         FROM lineup_slots
         WHERE lineup_id=? AND player_id IS NOT NULL'
    );
    $stmt->execute([$lineup_id]);
    $row = $stmt->fetch();

    return (int)($row['cnt'] ?? 0);
}

function play_require_lineup_players($cnx, int $lineup_id, $lineup, int $required, string $modeLabel): void {
    $filled = lineup_filled_player_count($cnx, $lineup_id);
    if ($filled >= $required) {
        return;
    }

    $expected = $required === 11 ? lineup_required_player_count($lineup) : $required;
    $label = $required === 11 ? 'starting XI' : 'players';
    send_err("Add {$expected} {$label} to your active lineup before playing {$modeLabel}. Current lineup has {$filled}/{$expected}.", 400);
}

function getRowsReq($cnx, string $req, array $params = []): array {
    $stmt = $cnx->prepare($req);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function getRowReq($cnx, string $req, array $params = []): ?array {
    $stmt = $cnx->prepare($req);
    $stmt->execute($params);
    $row = $stmt->fetch();
    return $row ?: null;
}

                                  
function team_attack(array $by_slot): float {
    $total = 0.0;
    $count = 0.0;
    foreach (['LW','ST','RW','ST1','ST2','LAM','RAM'] as $sc) {
        $p = $by_slot[$sc] ?? null;
        if ($p && ($p['overall'] ?? null)) {
            $total += ($p['shooting'] ?? 70) * 0.5 + ($p['pace'] ?? 70) * 0.3 + ($p['overall'] ?? 70) * 0.2;
            $count += 1;
        }
    }
    foreach (['LCM','CM','RCM','CAM','CDM','CDM1','CDM2'] as $sc) {
        $p = $by_slot[$sc] ?? null;
        if ($p && ($p['overall'] ?? null)) {
            $total += (($p['passing'] ?? 70) * 0.5 + ($p['dribbling'] ?? 70) * 0.3) * 0.5;
            $count += 0.5;
        }
    }
    return $total / max($count, 1);
}

function team_defense(array $by_slot): float {
    $total = 0.0;
    $count = 0;
    foreach (['LB','CB1','CB2','CB3','RB','LWB','RWB'] as $sc) {
        $p = $by_slot[$sc] ?? null;
        if ($p && ($p['overall'] ?? null)) {
            $total += ($p['defending'] ?? 70) * 0.6 + ($p['physical'] ?? 70) * 0.4;
            $count++;
        }
    }
    $gk = $by_slot['GK'] ?? null;
    if ($gk && ($gk['overall'] ?? null)) {
        $total += ($gk['overall'] ?? 70) * 0.8;
        $count++;
    }
    return $total / max($count, 1);
}

function team_midfield(array $by_slot): float {
    $total = 0.0;
    $count = 0;
    foreach (['CDM','CDM1','CDM2','LCM','CM','RCM','LM','RM','CAM','LAM','RAM'] as $sc) {
        $p = $by_slot[$sc] ?? null;
        if ($p && ($p['overall'] ?? null)) {
            $total += ($p['passing'] ?? 70) * 0.45 + ($p['dribbling'] ?? 70) * 0.35 + ($p['overall'] ?? 70) * 0.2;
            $count++;
        }
    }
    return $total / max($count, 1);
}

function get_by_slot($cnx, int $lineup_id): array {
    $req = 'SELECT ls.slot_code, ls.position_required, p.id as player_id, p.overall, p.pace, p.shooting, p.passing,
                   p.dribbling, p.defending, p.physical, p.position, p.name, p.card_url, p.image_url
            FROM lineup_slots ls LEFT JOIN players p ON p.id=ls.player_id
            WHERE ls.lineup_id=?';
    $rows = getRowsReq($cnx, $req, [$lineup_id]);

    $map = [];
    foreach ($rows as $r) { $map[$r['slot_code']] = $r; }

    return $map;
}

function lineup_average_overall(array $by_slot): float {
    $players = array_filter($by_slot, fn($p) => (float)($p['overall'] ?? 0) > 0);
    if (!$players) return 0.0;
    $total = array_sum(array_map(fn($p) => (float)($p['overall'] ?? 0), $players));
    return round($total / count($players), 1);
}

function get_lineup_formation($cnx, int $lineup_id): string {
    $row = getRowReq($cnx, 'SELECT formation FROM lineups WHERE id=? LIMIT 1', [$lineup_id]);
    return (string)($row['formation'] ?? '4-3-3');
}

function apply_match_team_labels(array &$stats, string $homeTeam, string $awayTeam): void {
    if (isset($stats['lineups']['home'])) {
        $stats['lineups']['home']['team'] = $homeTeam;
    }
    if (isset($stats['lineups']['away'])) {
        $stats['lineups']['away']['team'] = $awayTeam;
    }
    $stats['home_team'] = $homeTeam;
    $stats['away_team'] = $awayTeam;
    $stats['opponent'] = $awayTeam;
}

function get_lineup_reserve_names($cnx, int $lineup_id, int $limit = 3): array {
    $limit = max(1, min(5, $limit));
    $rows = getRowsReq($cnx,
        "SELECT p.name
         FROM lineups l
         JOIN user_players up ON up.user_id = l.user_id
         JOIN players p ON p.id = up.player_id
         WHERE l.id = ?
           AND p.id NOT IN (
               SELECT player_id FROM lineup_slots WHERE lineup_id = ? AND player_id IS NOT NULL
           )
         ORDER BY p.overall DESC NULLS LAST, p.name ASC
         LIMIT {$limit}",
        [$lineup_id, $lineup_id]
    );
    return array_values(array_filter(array_map(fn($r) => (string)($r['name'] ?? ''), $rows)));
}

function match_role_weight(string $slot_code): int {
    if (in_array($slot_code, ['LW','ST','RW','ST1','ST2','LAM','RAM','CAM'], true)) return 3;
    if (in_array($slot_code, ['LCM','CM','RCM','LM','RM','CDM','CDM1','CDM2'], true)) return 2;
    if ($slot_code === 'GK') return 0;
    return 1;
}

function match_player_events(array $events, string $team, string $name, string $type): int {
    return count(array_filter($events, fn($e) =>
        ($e['team'] ?? '') === $team && ($e['type'] ?? '') === $type && ($e['player'] ?? '') === $name
    ));
}

function match_player_assists(array $events, string $team, string $name): int {
    return count(array_filter($events, fn($e) =>
        ($e['team'] ?? '') === $team && ($e['type'] ?? '') === 'goal' && ($e['assist'] ?? '') === $name
    ));
}

function match_pick_assister(array $players, string $scorerName): array {
    $candidates = array_values(array_filter($players, fn($player) =>
        (string)($player['name'] ?? '') !== '' && (string)($player['name'] ?? '') !== $scorerName
    ));
    if (!$candidates) return ['name' => '', 'player_id' => null];

    usort($candidates, function($a, $b) {
        $aScore = ((int)($a['passing'] ?? 0) * 2) + (int)($a['dribbling'] ?? 0) + (int)($a['overall'] ?? 0);
        $bScore = ((int)($b['passing'] ?? 0) * 2) + (int)($b['dribbling'] ?? 0) + (int)($b['overall'] ?? 0);
        return $bScore <=> $aScore;
    });

    $topPool = array_slice($candidates, 0, min(4, count($candidates)));
    $pick = $topPool[array_rand($topPool)] ?? $candidates[0];
    return [
        'name' => (string)($pick['name'] ?? ''),
        'player_id' => isset($pick['player_id']) ? (int)$pick['player_id'] : null,
    ];
}

function match_team_rating_average(array $player_stats): float {
    $ratings = array_values(array_filter(array_map(fn($p) => (float)($p['rating'] ?? 0), $player_stats), fn($r) => $r > 0));
    if (!$ratings) return 0.0;
    return round(array_sum($ratings) / count($ratings), 1);
}

function match_rating_color_class(float $rating): string {
    if ($rating >= 7.0) return 'good';
    if ($rating >= 6.3) return 'ok';
    return 'bad';
}

function add_substitution_ratings(array $subs, array $player_stats): array {
    $ratings_by_team_name = [];
    foreach ($player_stats as $p) {
        $team = (string)($p['team'] ?? '');
        $name = (string)($p['name'] ?? '');
        if ($team === '' || $name === '') continue;
        $ratings_by_team_name[$team][$name] = (float)($p['rating'] ?? 0);
    }

    return array_map(function($sub) use ($ratings_by_team_name) {
        $team = (string)($sub['team'] ?? '');
        $out = (string)($sub['player_out'] ?? '');
        $out_rating = (float)($ratings_by_team_name[$team][$out] ?? 0);
        $in_rating = max(5.8, min(8.4, round(($out_rating > 0 ? $out_rating : 6.5) + rand_uniform(-0.35, 0.55), 1)));

        $sub['player_out_rating'] = $out_rating > 0 ? $out_rating : null;
        $sub['player_in_rating'] = $in_rating;
        $sub['player_out_rating_class'] = $out_rating > 0 ? match_rating_color_class($out_rating) : 'ok';
        $sub['player_in_rating_class'] = match_rating_color_class($in_rating);

        return $sub;
    }, $subs);
}

function build_match_player_stats(array $by_slot, string $team, float $team_xg, int $team_shots, int $possession, array $events): array {
    $players = array_values(array_filter($by_slot, fn($p) => (string)($p['name'] ?? '') !== ''));
    if (!$players) return [];

    $total_weight = max(1, array_sum(array_map(fn($p) => max(1, match_role_weight((string)($p['slot_code'] ?? ''))), $players)));
    $rows = [];
    foreach ($players as $p) {
        $slot = (string)($p['slot_code'] ?? '');
        $role_weight = match_role_weight($slot);
        $name = (string)($p['name'] ?? 'Player');
        $overall = (float)($p['overall'] ?? 70);
        $goals = match_player_events($events, $team, $name, 'goal');
        $assists = match_player_assists($events, $team, $name);
        $cards = match_player_events($events, $team, $name, 'yellow_card');
        $base_shots = $role_weight === 0 ? 0 : (int)round($team_shots * max(1, $role_weight) / $total_weight);
        $shots = max($goals, min(6, $base_shots + mt_rand(0, $role_weight)));
        $xg = $shots > 0 ? round(max(0.01, ($team_xg * $shots / max(1, $team_shots)) * rand_uniform(0.65, 1.35)), 2) : 0.0;
        $passes = $role_weight === 0 ? mt_rand(18, 34) : mt_rand(18 + ($role_weight * 6), 42 + ($role_weight * 14));
        $accuracy = max(58, min(96, (int)round(68 + ($possession - 45) * 0.25 + (($p['passing'] ?? $overall) - 65) * 0.22 + mt_rand(-5, 5))));
        $touches = $passes + mt_rand(8, 28);
        $dribbles = $role_weight === 0 ? 0 : mt_rand(0, max(1, $role_weight * 2));
        $ability_floor = max(-0.35, min(0.85, ($overall - 75) / 22));
        $shot_impact = $role_weight > 0 ? min(0.65, ($xg * 0.28) + max(0, $shots - 1) * 0.08) : 0.0;
        $pass_impact = max(-0.45, min(0.45, ($accuracy - 75) / 38));
        $volume_impact = max(-0.20, min(0.30, ($touches - 42) / 95));
        $miss_penalty = ($goals === 0 && ($shots >= 3 || $xg >= 0.65)) ? rand_uniform(0.25, 0.65) : 0.0;
        $quiet_penalty = ($goals === 0 && $shots === 0 && $role_weight >= 2) ? rand_uniform(0.15, 0.45) : 0.0;
        $off_night = rand_float() < 0.18 ? rand_uniform(-1.05, -0.35) : 0.0;
        $standout = rand_float() < 0.12 ? rand_uniform(0.25, 0.8) : 0.0;
        $rating = max(4.1, min(10.0, round(
            6.05 + $ability_floor + $shot_impact + $pass_impact + $volume_impact + ($goals * 0.95) + ($dribbles * 0.04) - ($cards * 0.45) - $miss_penalty - $quiet_penalty + $off_night + $standout + rand_uniform(-0.45, 0.45),
            1
        )));

        $rows[] = [
            'team' => $team,
            'player_id' => isset($p['player_id']) ? (int)$p['player_id'] : null,
            'slot_code' => $slot,
            'name' => $name,
            'position' => (string)($p['position'] ?? $p['position_required'] ?? $slot),
            'rating' => $rating,
            'goals' => $goals,
            'assists' => $assists,
            'shots' => $shots,
            'xg' => $xg,
            'passes' => $passes,
            'accuracy' => $accuracy,
            'touches' => $touches,
            'dribbles' => $dribbles,
            'card_url' => (string)($p['card_url'] ?? ''),
            'image_url' => (string)($p['image_url'] ?? ''),
        ];
    }
    return $rows;
}

function build_match_substitutions(array $by_slot, array $reserve_names, string $team, int $count = 2): array {
    $starters = array_values(array_filter($by_slot, fn($p) =>
        (string)($p['name'] ?? '') !== '' && (string)($p['slot_code'] ?? '') !== 'GK'
    ));
    if (!$starters) return [];

    shuffle($starters);
    $minutes = [58, 64, 71, 78, 84];
    shuffle($minutes);
    $subs = [];
    for ($i = 0; $i < min($count, count($starters)); $i++) {
        $subs[] = [
            'team' => $team,
            'minute' => $minutes[$i] ?? mt_rand(55, 84),
            'player_out' => (string)($starters[$i]['name'] ?? 'Player'),
            'player_in' => $reserve_names[$i] ?? ('Reserve ' . ($i + 1)),
        ];
    }
    usort($subs, fn($a, $b) => $a['minute'] <=> $b['minute']);
    return $subs;
}

function match_payload(string $result, int $score_for, int $score_against, array $stats, array $events, string $opponent, array $extra = []): array {
    return array_merge([
        'result' => $result,
        'score_for' => $score_for,
        'score_against' => $score_against,
        'opponent' => $opponent,
        'stats' => $stats,
        'events' => $events,
        'dp_change' => $stats['dp_change'] ?? 0,
        'new_points' => $stats['new_points'] ?? null,
        'new_rank' => $stats['new_rank'] ?? null,
    ], $extra);
}

function collect_challenge_updates(array &$updates, array $new_updates): void {
    if ($new_updates) {
        $updates = array_merge($updates, $new_updates);
    }
}

function persist_user_match($cnx, int $user_id, ?int $opponent_user_id, int $lineup_id, ?int $opponent_lineup_id, string $result, int $score_for, int $score_against, array $stats, array $events) {
    $is_forfeit = !empty($stats['forfeit']);

    return getRowReq(
        $cnx,
        'INSERT INTO matches (user_id, opponent_user_id, lineup_id, opponent_lineup_id, result, score_for, score_against, stats_json, events_json, is_forfeit)
         VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id',
        [$user_id, $opponent_user_id, $lineup_id, $opponent_lineup_id, $result, $score_for, $score_against, json_encode($stats), json_encode($events), $is_forfeit ? 1 : 0]
    );
}

function settle_knockout_match(string $result, int $score_for, int $score_against, array &$stats, array &$events): array {
    if ($score_for !== $score_against) {
        return [$result, $score_for, $score_against];
    }

    if (rand_float() < 0.5) {
        $score_for++;
        $result = 'W';
    } else {
        $score_against++;
        $result = 'L';
    }

    $stats['knockout_tiebreak'] = 'A late knockout decider settled the tie.';
    $events[] = [
        'minute' => 120,
        'type' => 'fulltime',
        'team' => 'neutral',
        'player' => '',
        'commentary' => "Knockout decider! Final score after the tie-break: {$score_for} - {$score_against}."
    ];

    return [$result, $score_for, $score_against];
}

function get_penalty_shooters($cnx, int $lineup_id, int $limit = 5): array {
    $req = 'SELECT p.id AS player_id, p.name, p.overall, p.card_url, p.image_url, COALESCE(p.shooting, p.overall, 0) AS shooting
            FROM lineup_slots ls
            JOIN players p ON p.id=ls.player_id
            WHERE ls.lineup_id=?
            ORDER BY COALESCE(p.shooting, p.overall, 0) DESC, p.overall DESC
            LIMIT ?';

    return getRowsReq($cnx, $req, [$lineup_id, $limit]);
}

function commentary_fmt(string $tpl, array|string $vars = []): string {
    if (!is_array($vars)) {
        $vars = ['player' => (string)$vars];
    }

    $replacements = [];
    foreach ($vars as $key => $value) {
        $replacements['{' . $key . '}'] = (string)$value;
    }

    return strtr($tpl, $replacements);
}

function match_scoreline_text(int $userGoals, int $oppGoals): string {
    return "{$userGoals}-{$oppGoals}";
}

function build_goal_commentary(array $event, int $beforeUser, int $beforeOpp, int $afterUser, int $afterOpp, int $scorerGoals): string {
    $isUserGoal = ($event['team'] ?? '') === 'user';
    $player = (string)($event['player'] ?? 'Player');
    $assist = trim((string)($event['assist'] ?? ''));
    $minute = (int)($event['minute'] ?? 0);
    $scoreline = match_scoreline_text($afterUser, $afterOpp);

    if ($isUserGoal) {
        if ($beforeUser === 0 && $beforeOpp === 0) {
            $openers = [
                '{player} breaks the deadlock for your side.',
                '{player} delivers the breakthrough and lifts the stadium.',
                '{player} turns the first big opening into the opener.',
            ];
        } elseif ($beforeUser < $beforeOpp && $afterUser === $afterOpp) {
            $openers = [
                '{player} drags your side level with a huge equaliser.',
                '{player} responds under pressure and the match is level again.',
                '{player} restores parity for your side with a composed finish.',
            ];
        } elseif ($beforeUser === $beforeOpp) {
            $openers = [
                '{player} strikes to put your side in front.',
                '{player} finds the breakthrough at exactly the right moment.',
                '{player} nudges your side ahead with a clinical finish.',
            ];
        } elseif ($afterUser - $afterOpp >= 2) {
            $openers = [
                '{player} stretches the lead and gives your side breathing room.',
                '{player} adds another and the advantage starts to look serious.',
                '{player} punishes the opposition again to widen the gap.',
            ];
        } else {
            $openers = [
                '{player} finds the net again for your side.',
                '{player} keeps the attack flowing with another finish.',
                '{player} punishes the opening and your side cashes in.',
            ];
        }
    } else {
        if ($beforeUser === 0 && $beforeOpp === 0) {
            $openers = [
                '{player} gives the opposition the first punch of the match.',
                '{player} breaks through and your side is chasing early.',
                '{player} lands the opener for the opposition.',
            ];
        } elseif ($beforeOpp < $beforeUser && $afterOpp === $afterUser) {
            $openers = [
                '{player} levels it for the opposition and the momentum swings.',
                '{player} brings the opposition back on terms.',
                '{player} equalises and your side has been pegged back.',
            ];
        } elseif ($beforeUser === $beforeOpp) {
            $openers = [
                '{player} puts the opposition in front.',
                '{player} converts and your side is suddenly behind.',
                '{player} edges the opposition ahead with a calm finish.',
            ];
        } elseif ($afterOpp - $afterUser >= 2) {
            $openers = [
                '{player} extends the opposition lead and the pressure grows.',
                '{player} adds another for the opposition and the gap opens up.',
                '{player} makes your side pay again and this is getting away.',
            ];
        } else {
            $openers = [
                '{player} scores again for the opposition.',
                '{player} keeps the opposition moving with another finish.',
                '{player} punishes your side with a sharp finish.',
            ];
        }
    }

    if ($minute <= 12) {
        $timing = [
            'It is an early blow and the pattern of the game changes immediately.',
            'That has arrived inside the opening spell and the crowd is wide awake now.',
            'A fast start has produced a major moment already.',
        ];
    } elseif ($minute >= 88) {
        $timing = [
            'Late drama here, and there may be hardly any time to answer it.',
            'That is a massive late swing in the closing moments.',
            'Right at the death, the whole stadium erupts.',
        ];
    } elseif ($minute >= 70) {
        $timing = [
            'The late stages are opening up and that could be decisive.',
            'That may be the defining moment of the final stretch.',
            'With the clock running down, that is a brutal moment for the other side.',
        ];
    } else {
        $timing = [
            'The move had been building for a while and the finish is emphatic.',
            'That attacking spell finally turns into something concrete.',
            'The pressure tells and the finish is ruthless.',
        ];
    }

    $assistLines = $assist !== ''
        ? [
            commentary_fmt('The pass from {assist} was weighted perfectly.', ['assist' => $assist]),
            commentary_fmt('{assist} deserves real credit for the vision in the build-up.', ['assist' => $assist]),
            commentary_fmt('That chance was created beautifully by {assist}.', ['assist' => $assist]),
        ]
        : [];

    $special = [];
    if ($scorerGoals === 2) {
        $special[] = commentary_fmt('{player} has a brace and cannot stop influencing this match.', ['player' => $player]);
    } elseif ($scorerGoals >= 3) {
        $special[] = commentary_fmt('That is a hat-trick for {player}. This is becoming a personal showcase.', ['player' => $player]);
    }

    $scoreNote = [
        commentary_fmt('The score now reads {scoreline}.', ['scoreline' => $scoreline]),
        commentary_fmt('It is now {scoreline} on the scoreboard.', ['scoreline' => $scoreline]),
    ];

    $parts = [
        commentary_fmt(array_random($openers), ['player' => $player]),
        array_random($timing),
        $assistLines ? array_random($assistLines) : '',
        $special ? array_random($special) : '',
        array_random($scoreNote),
    ];

    return trim(implode(' ', array_filter($parts)));
}

function build_save_commentary(array $event, int $userGoals, int $oppGoals): string {
    $saveTeam = (string)($event['team'] ?? 'neutral');
    $player = (string)($event['player'] ?? 'the attacker');
    $scoreline = match_scoreline_text($userGoals, $oppGoals);

    if ($saveTeam === 'user') {
        $templates = [
            '{player} is denied by a big save from your keeper.',
            'A sharp stop keeps out {player} and protects your side.',
            'Your goalkeeper reacts brilliantly to keep out {player}.',
        ];
    } else {
        $templates = [
            'The opposition goalkeeper denies {player} with a strong save.',
            '{player} tests the keeper, but the opposition stands firm.',
            'A fine stop keeps {player} off the scoresheet for now.',
        ];
    }

    if ($userGoals === $oppGoals) {
        $context = [
            'That keeps the match finely balanced.',
            'The score stays level and the tension rises.',
        ];
    } elseif (($saveTeam === 'user' && $userGoals > $oppGoals) || ($saveTeam === 'opponent' && $oppGoals > $userGoals)) {
        $context = [
            commentary_fmt('That stop matters with the score at {scoreline}.', ['scoreline' => $scoreline]),
            'A vital intervention while protecting the lead.',
        ];
    } else {
        $context = [
            commentary_fmt('That save preserves the current {scoreline} scoreline.', ['scoreline' => $scoreline]),
            'That could easily have pushed the game further away.',
        ];
    }

    return trim(commentary_fmt(array_random($templates), ['player' => $player]) . ' ' . array_random($context));
}

function build_miss_commentary(array $event, int $userGoals, int $oppGoals): string {
    $team = (string)($event['team'] ?? 'neutral');
    $player = (string)($event['player'] ?? 'the attacker');
    $scoreline = match_scoreline_text($userGoals, $oppGoals);

    $templates = [
        '{player} cannot keep the effort down and that is a let-off.',
        '{player} misses the target and the chance goes begging.',
        '{player} gets the look at goal but cannot make it count.',
    ];

    if (($team === 'user' && $userGoals < $oppGoals) || ($team === 'opponent' && $oppGoals < $userGoals)) {
        $context = [
            'That felt like a chance the chasing side needed to take.',
            commentary_fmt('At {scoreline}, those misses start to feel expensive.', ['scoreline' => $scoreline]),
        ];
    } else {
        $context = [
            'The pressure had been there, but the finish never arrived.',
            'The move deserved a cleaner ending than that.',
        ];
    }

    return trim(commentary_fmt(array_random($templates), ['player' => $player]) . ' ' . array_random($context));
}

function build_card_commentary(array $event): string {
    $player = (string)($event['player'] ?? 'Player');
    $templates = [
        '{player} goes into the book after arriving late into the challenge.',
        'The referee reaches for the yellow and {player} cannot complain too much.',
        '{player} is shown a card after a clumsy foul in midfield.',
        'That challenge from {player} was always risky, and the booking follows.',
    ];

    return commentary_fmt(array_random($templates), ['player' => $player]);
}

function build_corner_commentary(array $event, int $userGoals, int $oppGoals): string {
    $team = (string)($event['team'] ?? 'user');
    $teamLabel = $team === 'user' ? 'your side' : 'the opposition';
    $scoreline = match_scoreline_text($userGoals, $oppGoals);
    $templates = [
        commentary_fmt('{team_label} win a corner and load the box.', ['team_label' => $teamLabel]),
        commentary_fmt('Another set piece for {team_label}; defenders are being asked serious questions.', ['team_label' => $teamLabel]),
        commentary_fmt('Corner to {team_label}. There is a sense that something might happen here.', ['team_label' => $teamLabel]),
    ];
    $context = [
        commentary_fmt('The scoreboard still reads {scoreline}.', ['scoreline' => $scoreline]),
        'The pressure phase continues.',
        'This is the kind of spell that can turn a match.',
    ];

    return trim(array_random($templates) . ' ' . array_random($context));
}

function build_atmosphere_commentary(array $event, int $userGoals, int $oppGoals): string {
    $minute = (int)($event['minute'] ?? 0);

    if ($userGoals === $oppGoals) {
        $templates = $minute >= 70
            ? [
                'The game is still hanging in the balance and every duel feels heavier now.',
                'Nobody wants to blink in these closing stages. One clean move could decide everything.',
                'The noise keeps rising because this match still feels there for either side.',
            ]
            : [
                'There is a real rhythm to the game now, but neither side has found the clean final action.',
                'The midfield battle is intense and every yard has to be earned.',
                'The match is being played on a knife edge, with both sides probing carefully.',
            ];
    } elseif ($userGoals > $oppGoals) {
        $templates = [
            'Your side is trying to control the tempo and squeeze the life out of the contest.',
            'The opposition keeps pushing, but your side is beginning to manage the space intelligently.',
            'There is urgency from the opposition now as your side looks to stay compact.',
        ];
    } else {
        $templates = [
            'Your side is pushing for a way back and the tempo is climbing again.',
            'The opposition has something to protect now, so patience becomes vital for your side.',
            'There is a nervous edge because your side still believes there is a route back into this.',
        ];
    }

    return array_random($templates);
}

function build_halftime_commentary(int $htUser, int $htOpp, array $stats): string {
    $possession = (int)($stats['possession'] ?? 50);
    $shots = (int)($stats['shots'] ?? 0);
    $oppShots = (int)($stats['opp_shots'] ?? 0);
    $scoreline = match_scoreline_text($htUser, $htOpp);

    if ($htUser === $htOpp) {
        $base = [
            commentary_fmt('Half-time arrives with the score locked at {scoreline}.', ['scoreline' => $scoreline]),
            commentary_fmt('The whistle goes for the break and it stays {scoreline}.', ['scoreline' => $scoreline]),
        ];
    } elseif ($htUser > $htOpp) {
        $base = [
            commentary_fmt('Half-time and your side leads {scoreline}.', ['scoreline' => $scoreline]),
            commentary_fmt('The break arrives with your side in front at {scoreline}.', ['scoreline' => $scoreline]),
        ];
    } else {
        $base = [
            commentary_fmt('Half-time and your side trails {scoreline}.', ['scoreline' => $scoreline]),
            commentary_fmt('The whistle goes and your side has work to do at {scoreline}.', ['scoreline' => $scoreline]),
        ];
    }

    $detail = [
        commentary_fmt('Possession sits around {possession}% for your side, with shots at {shots}-{opp_shots}.', [
            'possession' => $possession,
            'shots' => $shots,
            'opp_shots' => $oppShots,
        ]),
        commentary_fmt('The first-half shot count reads {shots}-{opp_shots}, so the margins remain fine.', [
            'shots' => $shots,
            'opp_shots' => $oppShots,
        ]),
    ];

    return trim(array_random($base) . ' ' . array_random($detail) . ' The second half should open up even more.');
}

function build_fulltime_commentary(int $userGoals, int $oppGoals, string $result, array $stats): string {
    $scoreline = match_scoreline_text($userGoals, $oppGoals);
    $xgFor = number_format((float)($stats['xg_for'] ?? 0), 2, '.', '');
    $xgAgainst = number_format((float)($stats['xg_against'] ?? 0), 2, '.', '');

    if ($result === 'W') {
        $base = [
            commentary_fmt('Full-time. Your side gets the job done at {scoreline}.', ['scoreline' => $scoreline]),
            commentary_fmt('That is the final whistle, and it ends {scoreline} in your favour.', ['scoreline' => $scoreline]),
        ];
    } elseif ($result === 'D') {
        $base = [
            commentary_fmt('Full-time, and the points are shared at {scoreline}.', ['scoreline' => $scoreline]),
            commentary_fmt('The whistle goes on a draw, with the scoreboard fixed at {scoreline}.', ['scoreline' => $scoreline]),
        ];
    } else {
        $base = [
            commentary_fmt('Full-time, and your side falls short at {scoreline}.', ['scoreline' => $scoreline]),
            commentary_fmt('That is the final whistle and the result ends {scoreline} against your side.', ['scoreline' => $scoreline]),
        ];
    }

    $detail = [
        commentary_fmt('The expected-goals story closes at {xg_for} to {xg_against}.', [
            'xg_for' => $xgFor,
            'xg_against' => $xgAgainst,
        ]),
        commentary_fmt('By the numbers, the xG battle finished {xg_for} against {xg_against}.', [
            'xg_for' => $xgFor,
            'xg_against' => $xgAgainst,
        ]),
    ];

    $ending = $result === 'W'
        ? ['A confident performance in the key moments makes the difference.', 'The finishing edge and game management carried your side home.']
        : ($result === 'D'
            ? ['Neither side quite found the knockout blow in the end.', 'It stayed competitive all the way and neither team could land the decisive final punch.']
            : ['There will be frustration because the game had stretches your side could have controlled better.', 'Your side will feel this one slipped away in the decisive moments.']);

    return trim(array_random($base) . ' ' . array_random($detail) . ' ' . array_random($ending));
}

function enrich_match_commentary(array $events, array $stats, string $result, int $userGoals, int $oppGoals): array {
    $scoreUser = 0;
    $scoreOpp = 0;
    $scorerCounts = ['user' => [], 'opponent' => []];

    foreach ($events as &$event) {
        $type = (string)($event['type'] ?? '');
        $team = (string)($event['team'] ?? 'neutral');

        if ($type === 'goal') {
            $beforeUser = $scoreUser;
            $beforeOpp = $scoreOpp;

            if ($team === 'user') {
                $scoreUser++;
            } elseif ($team === 'opponent') {
                $scoreOpp++;
            }

            $player = trim((string)($event['player'] ?? ''));
            if ($player !== '') {
                $scorerCounts[$team][$player] = (int)($scorerCounts[$team][$player] ?? 0) + 1;
            }

            $event['commentary'] = build_goal_commentary(
                $event,
                $beforeUser,
                $beforeOpp,
                $scoreUser,
                $scoreOpp,
                (int)($scorerCounts[$team][$player] ?? 1)
            );
            continue;
        }

        if ($type === 'save') {
            $event['commentary'] = build_save_commentary($event, $scoreUser, $scoreOpp);
            continue;
        }

        if ($type === 'miss') {
            $event['commentary'] = build_miss_commentary($event, $scoreUser, $scoreOpp);
            continue;
        }

        if ($type === 'yellow_card') {
            $event['commentary'] = build_card_commentary($event);
            continue;
        }

        if ($type === 'corner') {
            $event['commentary'] = build_corner_commentary($event, $scoreUser, $scoreOpp);
            continue;
        }

        if ($type === 'atmosphere') {
            $event['commentary'] = build_atmosphere_commentary($event, $scoreUser, $scoreOpp);
            continue;
        }

        if ($type === 'halftime') {
            $event['commentary'] = build_halftime_commentary($scoreUser, $scoreOpp, $stats);
            continue;
        }

        if ($type === 'fulltime') {
            $event['commentary'] = build_fulltime_commentary($userGoals, $oppGoals, $result, $stats);
        }
    }
    unset($event);

    return $events;
}

function simulate_match($cnx, int $user_lineup_id, int $opp_lineup_id, float $user_chem, float $opp_chem): array {
    $user_by_slot = get_by_slot($cnx, $user_lineup_id);
    $opp_by_slot  = get_by_slot($cnx, $opp_lineup_id);
    $user_formation = get_lineup_formation($cnx, $user_lineup_id);
    $opp_formation  = get_lineup_formation($cnx, $opp_lineup_id);

    $user_att = team_attack($user_by_slot) * (1 + $user_chem / 200);
    $user_def = team_defense($user_by_slot) * (1 + $user_chem / 200);
    $user_mid = team_midfield($user_by_slot) * (1 + $user_chem / 200);
    $opp_att  = team_attack($opp_by_slot) * (1 + $opp_chem / 200);
    $opp_def  = team_defense($opp_by_slot) * (1 + $opp_chem / 200);
    $opp_mid  = team_midfield($opp_by_slot) * (1 + $opp_chem / 200);

    $luck_factor = rand_uniform(0.85, 1.15);
    $user_xg = max(0.2, ($user_att - $opp_def) / 28 * $luck_factor + rand_uniform(0.4, 2.2));
    $opp_xg  = max(0.2, ($opp_att - $user_def) / 28 / $luck_factor + rand_uniform(0.4, 2.2));

    $user_goals = match_sample_goals_from_xg($user_xg);
    $opp_goals  = match_sample_goals_from_xg($opp_xg);

    $result = $user_goals > $opp_goals ? 'W' : ($user_goals === $opp_goals ? 'D' : 'L');

    $poss_base  = min(70.0, max(30.0, 50 + ($user_att - $opp_att) / 5));
    $possession = round($poss_base + rand_uniform(-5, 5));
    $shots      = mt_rand(max(4, $user_goals * 2), max(14, $user_goals * 4 + 5));
    $shots_on   = max($user_goals, mt_rand($user_goals, max($user_goals + 1, $shots - 2)));
    $opp_shots  = mt_rand(max(4, $opp_goals * 2), max(14, $opp_goals * 4 + 5));
    $opp_shots_on = max($opp_goals, mt_rand($opp_goals, max($opp_goals + 1, $opp_shots - 2)));
    $corners_val = mt_rand(3, 11);
    $opp_corners_val = mt_rand(2, 10);
    $fouls_val   = mt_rand(8, 20);
    $opp_fouls_val = mt_rand(8, 20);
    $pass_accuracy = max(60, min(95, (int)round(72 + ($possession - 50) * 0.25 + rand_uniform(-4, 6))));
    $opp_pass_accuracy = max(60, min(95, (int)round(72 + ((100 - $possession) - 50) * 0.25 + rand_uniform(-4, 6))));

    $stats = [
        'xg_for'           => round($user_xg, 2),
        'xg_against'       => round($opp_xg, 2),
        'possession'       => (int)$possession,
        'opp_possession'   => 100 - (int)$possession,
        'shots'            => $shots,
        'shots_on_target'  => $shots_on,
        'opp_shots'        => $opp_shots,
        'opp_shots_on_target' => $opp_shots_on,
        'corners'          => $corners_val,
        'opp_corners'      => $opp_corners_val,
        'fouls'            => $fouls_val,
        'opp_fouls'        => $opp_fouls_val,
        'pass_accuracy'    => $pass_accuracy,
        'opp_pass_accuracy' => $opp_pass_accuracy,
    ];
    $user_power = max(1, $user_att + $user_mid + $user_def);
    $opp_power = max(1, $opp_att + $opp_mid + $opp_def);
    $draw_chance = max(14, min(24, (int)round(22 - abs($user_power - $opp_power) / 12)));
    $user_win_chance = (int)round((100 - $draw_chance) * ($user_power / ($user_power + $opp_power)));
    $opp_win_chance = 100 - $draw_chance - $user_win_chance;
    $stats['preview'] = [
        'user' => [
            'attack' => round($user_att, 1),
            'midfield' => round($user_mid, 1),
            'defense' => round($user_def, 1),
            'win_chance' => $user_win_chance,
        ],
        'opponent' => [
            'attack' => round($opp_att, 1),
            'midfield' => round($opp_mid, 1),
            'defense' => round($opp_def, 1),
            'win_chance' => $opp_win_chance,
        ],
        'draw_chance' => $draw_chance,
    ];

                            
    $events       = [];
    $minutes_used = [];

    $rand_minute = function(int $lo = 1, int $hi = 90) use (&$minutes_used): int {
        $m       = mt_rand($lo, $hi);
        $tries   = 0;
        while (in_array($m, $minutes_used, true) && $tries < 50) { $m = mt_rand($lo, $hi); $tries++; }
        $minutes_used[] = $m;
        return $m;
    };

    $user_players   = array_values(array_filter($user_by_slot, fn($s) => ($s['name'] ?? null)));
    $opp_players    = array_values(array_filter($opp_by_slot,  fn($s) => ($s['name'] ?? null)));
    $user_scorers   = array_values(array_filter($user_players, fn($p) => ($p['shooting'] ?? 0) > 60)) ?: $user_players;
    $opp_scorers    = array_values(array_filter($opp_players,  fn($p) => ($p['shooting'] ?? 0) > 60)) ?: ($opp_players ?: [['name' => 'Opponent']]);
    $user_defenders = array_values(array_filter($user_players, fn($p) => ($p['defending'] ?? 0) > 60)) ?: $user_players;

    for ($i = 0; $i < $user_goals; $i++) {
        $scorer = $user_scorers ? ($user_scorers[array_rand($user_scorers)] ?? null) : null;
        $playerName = (string)($scorer['name'] ?? 'Our striker');
        $assist = match_pick_assister($user_players, $playerName);
        $events[] = ['minute' => $rand_minute(), 'type' => 'goal', 'team' => 'user', 'player' => $playerName, 'player_id' => isset($scorer['player_id']) ? (int)$scorer['player_id'] : null, 'assist' => (string)($assist['name'] ?? ''), 'assist_player_id' => $assist['player_id'] ?? null,
                     'commentary' => ''];
    }
    for ($i = 0; $i < $opp_goals; $i++) {
        $scorer = $opp_scorers ? ($opp_scorers[array_rand($opp_scorers)] ?? null) : null;
        $playerName = (string)($scorer['name'] ?? 'Opponent');
        $assist = match_pick_assister($opp_players, $playerName);
        $events[] = ['minute' => $rand_minute(), 'type' => 'goal', 'team' => 'opponent', 'player' => $playerName, 'player_id' => isset($scorer['player_id']) ? (int)$scorer['player_id'] : null, 'assist' => (string)($assist['name'] ?? ''), 'assist_player_id' => $assist['player_id'] ?? null,
                     'commentary' => ''];
    }
    for ($i = 0; $i < $shots_on - $user_goals; $i++) {
        $p = $user_scorers ? ($user_scorers[array_rand($user_scorers)]['name'] ?? 'Our striker') : 'Our striker';
        $events[] = ['minute' => $rand_minute(), 'type' => 'save', 'team' => 'opponent', 'player' => $p,
                     'commentary' => ''];
    }
    for ($i = 0; $i < $opp_shots_on - $opp_goals; $i++) {
        $p = $opp_scorers ? ($opp_scorers[array_rand($opp_scorers)]['name'] ?? 'Opponent') : 'Opponent';
        $events[] = ['minute' => $rand_minute(), 'type' => 'save', 'team' => 'user', 'player' => $p,
                     'commentary' => ''];
    }
    $missed_user = $shots - $shots_on;
    for ($i = 0; $i < min($missed_user, 3); $i++) {
        $p = $user_scorers ? ($user_scorers[array_rand($user_scorers)]['name'] ?? 'Our striker') : 'Our striker';
        $events[] = ['minute' => $rand_minute(), 'type' => 'miss', 'team' => 'user', 'player' => $p,
                     'commentary' => ''];
    }
    $missed_opp = $opp_shots - $opp_shots_on;
    for ($i = 0; $i < min($missed_opp, 2); $i++) {
        $p = $opp_scorers ? ($opp_scorers[array_rand($opp_scorers)]['name'] ?? 'Opponent') : 'Opponent';
        $events[] = ['minute' => $rand_minute(), 'type' => 'miss', 'team' => 'opponent', 'player' => $p,
                     'commentary' => ''];
    }
    $yc_count = mt_rand(0, min((int)($fouls_val / 5), 3));
    for ($i = 0; $i < $yc_count; $i++) {
        $team_choice = mt_rand(0,1) ? 'user' : 'opponent';
        $pool = $team_choice === 'user' ? $user_defenders : $opp_players;
        $p    = $pool ? ($pool[array_rand($pool)]['name'] ?? 'Player') : 'Player';
        $events[] = ['minute' => $rand_minute(), 'type' => 'yellow_card', 'team' => $team_choice, 'player' => $p,
                     'commentary' => ''];
    }
    for ($i = 0; $i < min($corners_val, 4); $i++) {
        $events[] = ['minute' => $rand_minute(), 'type' => 'corner', 'team' => 'user', 'player' => '',
                     'commentary' => ''];
    }
    for ($i = 0; $i < min($opp_corners_val, 3); $i++) {
        $events[] = ['minute' => $rand_minute(), 'type' => 'corner', 'team' => 'opponent', 'player' => '',
                     'commentary' => ''];
    }
    for ($i = 0; $i < mt_rand(3, 6); $i++) {
        $events[] = ['minute' => $rand_minute(), 'type' => 'atmosphere', 'team' => 'neutral', 'player' => '',
                     'commentary' => ''];
    }

    $ht_user = count(array_filter($events, fn($e) => $e['type'] === 'goal' && $e['team'] === 'user'     && $e['minute'] <= 45));
    $ht_opp  = count(array_filter($events, fn($e) => $e['type'] === 'goal' && $e['team'] === 'opponent' && $e['minute'] <= 45));
    $events[] = ['minute' => 45, 'type' => 'halftime', 'team' => 'neutral', 'player' => '',
                 'commentary' => ''];
    $ft_msg   = $result === 'W' ? 'A magnificent victory!' : ($result === 'D' ? 'A hard-fought draw!' : 'A painful defeat - the team will regroup.');
    $events[] = ['minute' => 90, 'type' => 'fulltime', 'team' => 'neutral', 'player' => '',
                 'commentary' => ''];

    $type_order = ['goal'=>0,'save'=>1,'miss'=>2,'yellow_card'=>3,'corner'=>4,'atmosphere'=>5,'halftime'=>6,'fulltime'=>7];
    usort($events, fn($a, $b) => $a['minute'] <=> $b['minute'] ?: ($type_order[$a['type']] ?? 5) <=> ($type_order[$b['type']] ?? 5));
    $events = enrich_match_commentary($events, $stats, $result, $user_goals, $opp_goals);

    $user_player_stats = build_match_player_stats($user_by_slot, 'user', $user_xg, $shots, (int)$possession, $events);
    $opp_player_stats  = build_match_player_stats($opp_by_slot, 'opponent', $opp_xg, $opp_shots, 100 - (int)$possession, $events);
    $player_stats = array_merge($user_player_stats, $opp_player_stats);
    $stats['cards'] = count(array_filter($events, fn($e) => ($e['team'] ?? '') === 'user' && ($e['type'] ?? '') === 'yellow_card'));
    $stats['opp_cards'] = count(array_filter($events, fn($e) => ($e['team'] ?? '') === 'opponent' && ($e['type'] ?? '') === 'yellow_card'));
    $stats['player_stats'] = $player_stats;
    $stats['lineups'] = [
        'home' => [
            'team' => 'You',
            'formation' => $user_formation,
            'overall' => lineup_average_overall($user_by_slot),
            'match_rating' => match_team_rating_average($user_player_stats),
            'players' => array_map(fn($p) => [
                'player_id' => $user_by_slot[$p['slot_code']]['player_id'] ?? null,
                'slot_code' => $p['slot_code'],
                'name' => $p['name'],
                'rating' => $p['rating'],
                'position' => $p['position'],
                'overall' => $user_by_slot[$p['slot_code']]['overall'] ?? null,
                'card_url' => $user_by_slot[$p['slot_code']]['card_url'] ?? '',
                'image_url' => $user_by_slot[$p['slot_code']]['image_url'] ?? '',
            ], $user_player_stats),
        ],
        'away' => [
            'team' => 'Opponent',
            'formation' => $opp_formation,
            'overall' => lineup_average_overall($opp_by_slot),
            'match_rating' => match_team_rating_average($opp_player_stats),
            'players' => array_map(fn($p) => [
                'player_id' => $opp_by_slot[$p['slot_code']]['player_id'] ?? null,
                'slot_code' => $p['slot_code'],
                'name' => $p['name'],
                'rating' => $p['rating'],
                'position' => $p['position'],
                'overall' => $opp_by_slot[$p['slot_code']]['overall'] ?? null,
                'card_url' => $opp_by_slot[$p['slot_code']]['card_url'] ?? '',
                'image_url' => $opp_by_slot[$p['slot_code']]['image_url'] ?? '',
            ], $opp_player_stats),
        ],
    ];
    $stats['substitutions'] = add_substitution_ratings(array_merge(
        build_match_substitutions($user_by_slot, get_lineup_reserve_names($cnx, $user_lineup_id), 'user'),
        build_match_substitutions($opp_by_slot, get_lineup_reserve_names($cnx, $opp_lineup_id), 'opponent')
    ), $player_stats);

    return [$result, $user_goals, $opp_goals, $stats, $events];
}

                      
function play_kickoff(): void {
    [$cnx, $user, $u] = play_current_user_and_row();
    [$lid, $lineup] = play_active_lineup($cnx, $user, $u, 'Pick a valid active lineup before kicking off.');
    play_require_lineup_players($cnx, $lid, $lineup, 11, 'quick match');

    $selectedOpponent = pick_match_opponent((int) $user['id'], (int) ($u['division_points'] ?? 0));

    if (!$selectedOpponent) send_err('No eligible opponents available right now', 404);

    $opponent = opponent_match_data($selectedOpponent);
    $opp_user_id = $opponent['uid'];
    $opp_lineup_id = $opponent['lineup_id'];
    $opp_username = $opponent['username'];
    $opp_chem = $opponent['chem'];

    $user_chem = (float)($lineup['chemistry'] ?? 0);
    [$result, $score_for, $score_against, $stats, $events] = simulate_match($cnx, $lid, $opp_lineup_id, $user_chem, $opp_chem);
    apply_match_team_labels($stats, (string)($u['username'] ?? 'You'), $opp_username);
    $stats['opponent']   = $opp_username;
    $stats['mode'] = 'quickmatch';
    $division = division_apply_result($cnx, (int)$user['id'], $result, $score_for, $score_against, $stats, 'quickmatch');
    $stats['dp_change']  = $division['points_awarded'];
    $stats['division_award'] = $division;
    $stats['new_points'] = $division['new_points'];
    $stats['new_rank']   = $division['new_rank'];

    $match_row = persist_user_match($cnx, (int)$user['id'], $opp_user_id, $lid, $opp_lineup_id, $result, $score_for, $score_against, $stats, $events);

    $challenge_updates = [];
    collect_challenge_updates($challenge_updates, update_challenge_progress($user['id'], 'goals', $score_for));
    if ($result === 'W') collect_challenge_updates($challenge_updates, update_challenge_progress($user['id'], 'win_streak', 1));
    collect_challenge_updates($challenge_updates, update_challenge_progress($user['id'], 'division_points', $division['points_awarded']));

    send_ok(match_payload($result, $score_for, $score_against, $stats, $events, $opp_username, [
        'match_id'      => $match_row['id'] ?? null,
        'opponent_user_id' => $opp_user_id,
        'opponent_lineup_id' => $opp_lineup_id,
        'challenge_updates' => $challenge_updates,
    ]));
}

function play_tournament(): void {
    [$cnx, $user, $u] = play_current_user_and_row();
    [$lid, $lineup] = play_active_lineup($cnx, $user, $u, 'Set an active lineup before starting a tournament!');
    play_require_lineup_players($cnx, $lid, $lineup, 11, 'tournament mode');
    $user_chem = (float)($lineup['chemistry'] ?? 50);
    $user_name = (string)($u['username'] ?? 'You');

    $selectedOpponents = pick_tournament_opponents((int) $user['id'], (int) ($u['division_points'] ?? 0), 3);
    if (count($selectedOpponents) < 3) send_err('Not enough eligible opponents available for a tournament right now', 404);

    [$oppAData, $oppBData, $oppCData] = array_map('opponent_match_data', $selectedOpponents);
    $opp_a = ['username' => $oppAData['username'], 'lineup_id' => $oppAData['lineup_id'], 'chem' => $oppAData['chem'], 'uid' => $oppAData['uid']];
    $opp_b = ['username' => $oppBData['username'], 'lineup_id' => $oppBData['lineup_id'], 'chem' => $oppBData['chem'], 'uid' => $oppBData['uid']];
    $opp_c = ['username' => $oppCData['username'], 'lineup_id' => $oppCData['lineup_id'], 'chem' => $oppCData['chem'], 'uid' => $oppCData['uid']];

    [$sf1_res, $sf1_sf, $sf1_sa, $sf1_stats, $sf1_evts] = simulate_match($cnx, $lid, $opp_a['lineup_id'], $user_chem, $opp_a['chem']);
    [$sf1_res, $sf1_sf, $sf1_sa] = settle_knockout_match($sf1_res, $sf1_sf, $sf1_sa, $sf1_stats, $sf1_evts);
    apply_match_team_labels($sf1_stats, $user_name, $opp_a['username']);
    $sf1_stats['mode'] = 'tournament';
    $sf1_stats['stage'] = 'Semi-final 1';
    $user_wins_sf = $sf1_res !== 'L';
    $sf1_win_name = $user_wins_sf ? $user_name : $opp_a['username'];
    $sf1_win_lid  = $user_wins_sf ? $lid : $opp_a['lineup_id'];
    $sf1_win_chem = $user_wins_sf ? $user_chem : $opp_a['chem'];
    $sf1_win_uid  = $user_wins_sf ? (int)$user['id'] : $opp_a['uid'];

    [$sf2_res, $sf2_sf, $sf2_sa, $sf2_stats, $sf2_evts] = simulate_match($cnx, $opp_b['lineup_id'], $opp_c['lineup_id'], $opp_b['chem'], $opp_c['chem']);
    [$sf2_res, $sf2_sf, $sf2_sa] = settle_knockout_match($sf2_res, $sf2_sf, $sf2_sa, $sf2_stats, $sf2_evts);
    apply_match_team_labels($sf2_stats, $opp_b['username'], $opp_c['username']);
    $sf2_stats['mode'] = 'tournament';
    $sf2_stats['stage'] = 'Semi-final 2';
    $b_wins       = $sf2_res !== 'L';
    $sf2_win_name = $b_wins ? $opp_b['username'] : $opp_c['username'];
    $sf2_win_lid  = $b_wins ? $opp_b['lineup_id'] : $opp_c['lineup_id'];
    $sf2_win_chem = $b_wins ? $opp_b['chem'] : $opp_c['chem'];
    $sf2_win_uid  = $b_wins ? $opp_b['uid'] : $opp_c['uid'];

    [$fin_res, $fin_sf, $fin_sa, $fin_stats, $fin_evts] = simulate_match($cnx, $sf1_win_lid, $sf2_win_lid, $sf1_win_chem, $sf2_win_chem);
    [$fin_res, $fin_sf, $fin_sa] = settle_knockout_match($fin_res, $fin_sf, $fin_sa, $fin_stats, $fin_evts);
    apply_match_team_labels($fin_stats, $sf1_win_name, $sf2_win_name);
    $fin_stats['mode'] = 'tournament';
    $fin_stats['stage'] = 'Final';
    $sf1_wins_final = $fin_res !== 'L';
    $user_wins_final = $user_wins_sf && $sf1_wins_final;
    $final_winner = $sf1_wins_final ? $sf1_win_name : $sf2_win_name;

    $sf1_division = division_apply_result($cnx, (int)$user['id'], $sf1_res, $sf1_sf, $sf1_sa, $sf1_stats, 'tournament');
    $sf1_stats['dp_change'] = $sf1_division['points_awarded'];
    $sf1_stats['division_award'] = $sf1_division;
    $sf1_stats['new_points'] = $sf1_division['new_points'];
    $sf1_stats['new_rank'] = $sf1_division['new_rank'];
    persist_user_match($cnx, (int)$user['id'], $opp_a['uid'], $lid, $opp_a['lineup_id'], $sf1_res, $sf1_sf, $sf1_sa, $sf1_stats, $sf1_evts);
    $challenge_updates = [];
    collect_challenge_updates($challenge_updates, update_challenge_progress($user['id'], 'goals', $sf1_sf));
    collect_challenge_updates($challenge_updates, update_challenge_progress($user['id'], 'division_points', $sf1_division['points_awarded']));

    $dp = $sf1_division['points_awarded'];
    $last_division = $sf1_division;
    if ($user_wins_sf) {
        collect_challenge_updates($challenge_updates, update_challenge_progress($user['id'], 'win_streak', 1));
        $fin_db = $user_wins_final ? 'W' : 'L';
        $user_final_for = $fin_sf;
        $user_final_against = $fin_sa;
        $fin_division = division_apply_result($cnx, (int)$user['id'], $fin_db, $user_final_for, $user_final_against, $fin_stats, 'tournament');
        $fin_stats['dp_change'] = $fin_division['points_awarded'];
        $fin_stats['division_award'] = $fin_division;
        $fin_stats['new_points'] = $fin_division['new_points'];
        $fin_stats['new_rank'] = $fin_division['new_rank'];
        persist_user_match($cnx, (int)$user['id'], $sf2_win_uid, $lid, $sf2_win_lid, $fin_db, $user_final_for, $user_final_against, $fin_stats, $fin_evts);
        $dp += $fin_division['points_awarded'];
        $last_division = $fin_division;
        collect_challenge_updates($challenge_updates, update_challenge_progress($user['id'], 'goals', $user_final_for));
        collect_challenge_updates($challenge_updates, update_challenge_progress($user['id'], 'division_points', $fin_division['points_awarded']));
        if ($user_wins_final) {
            collect_challenge_updates($challenge_updates, update_challenge_progress($user['id'], 'win_streak', 1));
            $bonus_division = division_apply_bonus($cnx, (int)$user['id'], 5, 'tournament win');
            $dp += $bonus_division['points_awarded'];
            $last_division = $bonus_division;
            collect_challenge_updates($challenge_updates, update_challenge_progress($user['id'], 'division_points', $bonus_division['points_awarded']));
        }
    }

    $new_pts = $last_division['new_points'];
    $new_rank = $last_division['new_rank'];

    send_ok([
        'mode'               => 'tournament',
        'sf1'                => ['home' => $user_name, 'away' => $opp_a['username'], 'score_home' => $sf1_sf, 'score_away' => $sf1_sa, 'winner' => $sf1_win_name],
        'sf2'                => ['home' => $opp_b['username'], 'away' => $opp_c['username'], 'score_home' => $sf2_sf, 'score_away' => $sf2_sa, 'winner' => $sf2_win_name],
        'final'              => ['home' => $sf1_win_name, 'away' => $sf2_win_name, 'score_home' => $fin_sf, 'score_away' => $fin_sa, 'winner' => $final_winner],
        'matches'            => [
            match_payload($sf1_res, $sf1_sf, $sf1_sa, $sf1_stats, $sf1_evts, $opp_a['username'], ['stage' => 'Semi-final 1']),
            match_payload($sf2_res, $sf2_sf, $sf2_sa, $sf2_stats, $sf2_evts, $opp_c['username'], ['stage' => 'Semi-final 2']),
            match_payload($fin_res, $fin_sf, $fin_sa, $fin_stats, $fin_evts, $sf2_win_name, ['stage' => 'Final']),
        ],
        'user_sf_result'     => $sf1_res,
        'user_sf_score'      => "{$sf1_sf}-{$sf1_sa}",
        'user_in_final'      => $user_wins_sf,
        'user_final_result'  => $user_wins_sf ? ($user_wins_final ? 'W' : 'L') : null,
        'user_final_score'   => $user_wins_sf ? "{$fin_sf}-{$fin_sa}" : null,
        'user_won_tournament' => $user_wins_sf && $user_wins_final,
        'final_opponent'     => $sf2_win_name,
        'key_events'         => array_slice($user_wins_sf ? $fin_evts : $sf1_evts, 0, 6),
        'dp_change'          => $dp,
        'new_points'         => $new_pts,
        'challenge_updates'  => $challenge_updates,
    ]);
}

function play_season(): void {
    [$cnx, $user, $u] = play_current_user_and_row();
    [$lid, $lineup] = play_active_lineup($cnx, $user, $u, 'Set an active lineup before starting a season!');
    play_require_lineup_players($cnx, $lid, $lineup, 11, 'season mode');
    $user_chem = (float)($lineup['chemistry'] ?? 50);
    $user_name = (string)($u['username'] ?? 'You');

    $selectedOpponents = pick_tournament_opponents((int)$user['id'], (int)($u['division_points'] ?? 0), 5, 30);
    if (count($selectedOpponents) < 5) send_err('Not enough eligible opponents available for a 5-match season right now', 404);

    $matches = [];
    $history = [];
    $table = [
        $user_name => ['team' => $user_name, 'played' => 0, 'wins' => 0, 'draws' => 0, 'losses' => 0, 'gf' => 0, 'ga' => 0, 'points' => 0],
    ];
    $total_dp = 0;
    $last_division = null;
    $challenge_updates = [];

    foreach (array_values($selectedOpponents) as $idx => $opponentRow) {
        $opp = opponent_match_data($opponentRow);
        $opp_name = $opp['username'];
        if (!isset($table[$opp_name])) {
            $table[$opp_name] = ['team' => $opp_name, 'played' => 0, 'wins' => 0, 'draws' => 0, 'losses' => 0, 'gf' => 0, 'ga' => 0, 'points' => 0];
        }

        [$result, $score_for, $score_against, $stats, $events] = simulate_match($cnx, $lid, $opp['lineup_id'], $user_chem, $opp['chem']);
        apply_match_team_labels($stats, $user_name, $opp_name);
        $match_no = $idx + 1;
        $match_points = $result === 'W' ? 3 : ($result === 'D' ? 1 : 0);
        $opp_points = $result === 'L' ? 3 : ($result === 'D' ? 1 : 0);
        $table[$user_name]['played']++;
        $table[$user_name]['gf'] += $score_for;
        $table[$user_name]['ga'] += $score_against;
        $table[$user_name]['points'] += $match_points;
        $table[$opp_name]['played']++;
        $table[$opp_name]['gf'] += $score_against;
        $table[$opp_name]['ga'] += $score_for;
        $table[$opp_name]['points'] += $opp_points;
        if ($result === 'W') {
            $table[$user_name]['wins']++;
            $table[$opp_name]['losses']++;
            collect_challenge_updates($challenge_updates, update_challenge_progress($user['id'], 'win_streak', 1));
        } elseif ($result === 'D') {
            $table[$user_name]['draws']++;
            $table[$opp_name]['draws']++;
        } else {
            $table[$user_name]['losses']++;
            $table[$opp_name]['wins']++;
        }

        $stats['mode'] = 'season';
        $stats['stage'] = "Season Match {$match_no}";
        $stats['season_match'] = $match_no;
        $stats['season_points'] = $table[$user_name]['points'];
        $division = division_apply_result($cnx, (int)$user['id'], $result, $score_for, $score_against, $stats, 'season');
        $dp_change = $division['points_awarded'];
        $total_dp += $dp_change;
        $last_division = $division;
        $stats['dp_change'] = $dp_change;
        $stats['division_award'] = $division;
        $stats['new_points'] = $division['new_points'];
        $stats['new_rank'] = $division['new_rank'];

        $match_row = persist_user_match($cnx, (int)$user['id'], $opp['uid'], $lid, $opp['lineup_id'], $result, $score_for, $score_against, $stats, $events);
        collect_challenge_updates($challenge_updates, update_challenge_progress($user['id'], 'goals', $score_for));
        collect_challenge_updates($challenge_updates, update_challenge_progress($user['id'], 'division_points', $dp_change));

        $matches[] = match_payload($result, $score_for, $score_against, $stats, $events, $opp_name, [
            'match_id' => $match_row['id'] ?? null,
            'stage' => "Season Match {$match_no}",
        ]);
        $history[] = [
            'match' => $match_no,
            'opponent' => $opp_name,
            'result' => $result,
            'score_for' => $score_for,
            'score_against' => $score_against,
            'points' => $match_points,
        ];
    }

    $standings = array_values($table);
    usort($standings, fn($a, $b) =>
        ($b['points'] <=> $a['points'])
        ?: (($b['gf'] - $b['ga']) <=> ($a['gf'] - $a['ga']))
        ?: ($b['gf'] <=> $a['gf'])
    );
    foreach ($standings as $idx => &$row) {
        $row['position'] = $idx + 1;
        $row['gd'] = $row['gf'] - $row['ga'];
    }
    unset($row);
    $current_position = 1;
    foreach ($standings as $row) {
        if ($row['team'] === $user_name) {
            $current_position = (int)$row['position'];
            break;
        }
    }

    $season_bonus = 0;
    if ($current_position === 1) {
        $bonus_division = division_apply_bonus($cnx, (int)$user['id'], 5, 'season top position');
        $season_bonus = $bonus_division['points_awarded'];
        $total_dp += $season_bonus;
        $last_division = $bonus_division;
        collect_challenge_updates($challenge_updates, update_challenge_progress($user['id'], 'division_points', $season_bonus));
    }

    $new_pts = $last_division['new_points'] ?? (int)($u['division_points'] ?? 0);
    $new_rank = $last_division['new_rank'] ?? (int)($u['division_level'] ?? $u['division_rank'] ?? 5);

    foreach ($matches as &$match) {
        $match['new_points'] = $new_pts;
        $match['new_rank'] = $new_rank;
        $match['stats']['new_points'] = $new_pts;
        $match['stats']['new_rank'] = $new_rank;
    }
    unset($match);

    send_ok([
        'mode' => 'season',
        'matches' => $matches,
        'history' => $history,
        'standings' => $standings,
        'current_position' => $current_position,
        'record' => [
            'wins' => $table[$user_name]['wins'],
            'draws' => $table[$user_name]['draws'],
            'losses' => $table[$user_name]['losses'],
            'points' => $table[$user_name]['points'],
            'gf' => $table[$user_name]['gf'],
            'ga' => $table[$user_name]['ga'],
        ],
        'dp_change' => $total_dp,
        'season_bonus' => $season_bonus,
        'new_points' => $new_pts,
        'new_rank' => $new_rank,
        'challenge_updates' => $challenge_updates,
    ]);
}

function play_forfeit(): void {
    [$cnx, $user, $u] = play_current_user_and_row();
    [$lid, $lineup] = play_active_lineup($cnx, $user, $u, 'Set an active lineup before forfeiting a match!');
    play_require_lineup_players($cnx, $lid, $lineup, 11, 'forfeit');

    $opponent_user_id = (int)($_POST['opponent_user_id'] ?? 0);
    $opponent_lineup_id = (int)($_POST['opponent_lineup_id'] ?? 0);
    $opponent_name = trim((string)($_POST['opponent'] ?? 'Opponent'));

    if (!$opponent_user_id || !$opponent_lineup_id) {
        $selectedOpponent = pick_match_opponent((int)$user['id'], (int)($u['division_points'] ?? 0));
        if ($selectedOpponent) {
            $opponent = opponent_match_data($selectedOpponent);
            $opponent_user_id = $opponent['uid'];
            $opponent_lineup_id = $opponent['lineup_id'];
            $opponent_name = $opponent['username'];
        }
    }

    $stats = [
        'mode' => (string)($_POST['mode'] ?? 'quickmatch'),
        'forfeit' => true,
        'forfeit_label' => 'Forfeit Win (3-0)',
        'opponent' => $opponent_name,
        'home_team' => (string)($u['username'] ?? 'You'),
        'away_team' => $opponent_name,
        'possession' => 0,
        'opp_possession' => 100,
        'shots' => 0,
        'shots_on_target' => 0,
        'opp_shots' => 0,
        'opp_shots_on_target' => 0,
        'xg_for' => 0,
        'xg_against' => 0,
        'pass_accuracy' => 0,
        'opp_pass_accuracy' => 0,
        'corners' => 0,
        'opp_corners' => 0,
        'cards' => 0,
        'opp_cards' => 0,
        'player_stats' => [],
        'lineups' => [
            'home' => ['team' => (string)($u['username'] ?? 'You'), 'formation' => '', 'overall' => null, 'match_rating' => null, 'players' => []],
            'away' => ['team' => $opponent_name, 'formation' => '', 'overall' => null, 'match_rating' => null, 'players' => []],
        ],
        'substitutions' => [],
        'dp_change' => 0,
    ];
    $events = [[
        'minute' => 0,
        'type' => 'fulltime',
        'team' => 'opponent',
        'player' => '',
        'commentary' => "Forfeit confirmed. {$opponent_name} is awarded a 3-0 win."
    ]];

    $division = division_apply_result($cnx, (int)$user['id'], 'L', 0, 3, $stats, (string)$stats['mode'], ['forfeit' => true]);
    $stats['dp_change'] = $division['points_awarded'];
    $stats['division_award'] = $division;
    $stats['new_points'] = $division['new_points'];
    $stats['new_rank'] = $division['new_rank'];

    if ($opponent_user_id > 0) {
        division_apply_result($cnx, $opponent_user_id, 'W', 3, 0, [
            'mode' => (string)$stats['mode'],
            'forfeit_award' => true,
        ], (string)$stats['mode'], ['forfeit_award' => true]);
    }

    $match_row = persist_user_match($cnx, (int)$user['id'], $opponent_user_id ?: null, $lid, $opponent_lineup_id ?: null, 'L', 0, 3, $stats, $events);
    $challenge_updates = [];
    collect_challenge_updates($challenge_updates, update_challenge_progress($user['id'], 'division_points', $division['points_awarded']));

    send_ok(match_payload('L', 0, 3, $stats, $events, $opponent_name, [
        'match_id' => $match_row['id'] ?? null,
        'forfeit' => true,
        'challenge_updates' => $challenge_updates,
    ]));
}

function play_shootout(): void {
    [$cnx, $user, $u] = play_current_user_and_row();
    [$lid, $lineup] = play_active_lineup($cnx, $user, $u, 'Set an active lineup first!');
    play_require_lineup_players($cnx, $lid, $lineup, 5, 'shootout mode');

    $selectedOpponent = pick_match_opponent((int) $user['id'], (int) ($u['division_points'] ?? 0), 10, 5);
    if (!$selectedOpponent) send_err('No eligible opponents available right now', 404);

    $opponent = opponent_match_data($selectedOpponent);
    $opp_name = $opponent['username'];

    $user_shooters = get_penalty_shooters($cnx, $lid);
    $opp_shooters = get_penalty_shooters($cnx, $opponent['lineup_id']);

    if (count($user_shooters) < 5) send_err('Active lineup needs at least 5 players available for a shootout');
    if (count($opp_shooters) < 5) send_err('Selected opponent needs at least 5 players for a shootout', 500);

    if (($_POST['preview'] ?? '') === '1') {
        send_ok([
            'mode' => 'shootout',
            'opponent' => $opp_name,
            'opponent_user_id' => $opponent['uid'],
            'opponent_lineup_id' => $opponent['lineup_id'],
            'shooters' => array_map(fn($s) => [
                'player_id' => (int)($s['player_id'] ?? 0),
                'name' => (string)($s['name'] ?? 'Player'),
                'shooting' => (int)($s['shooting'] ?? 0),
                'overall' => (int)($s['overall'] ?? 0),
                'card_url' => (string)($s['card_url'] ?? ''),
                'image_url' => (string)($s['image_url'] ?? ''),
            ], $user_shooters),
            'opponent_shooters' => array_map(fn($s) => [
                'player_id' => (int)($s['player_id'] ?? 0),
                'name' => (string)($s['name'] ?? 'Player'),
                'shooting' => (int)($s['shooting'] ?? 0),
                'overall' => (int)($s['overall'] ?? 0),
                'card_url' => (string)($s['card_url'] ?? ''),
                'image_url' => (string)($s['image_url'] ?? ''),
            ], $opp_shooters),
        ]);
    }

    $user_chem_bonus = min(0.08, (float)($lineup['chemistry'] ?? 50) / 600);
    $opp_chem_bonus = min(0.08, $opponent['chem'] / 600);
    $kicks       = []; $user_score = 0; $opp_score = 0;
    $selected_raw = $_POST['shooters'] ?? '[]';
    $selected_ids = is_string($selected_raw) ? json_decode($selected_raw, true) : $selected_raw;
    if (!is_array($selected_ids)) $selected_ids = [];
    $used_user_shooter_ids = [];
    $find_selected_shooter = function(int $round) use ($selected_ids, $user_shooters, &$used_user_shooter_ids) {
        $choice = $selected_ids[$round] ?? null;
        $choice_id = is_array($choice) ? (int)($choice['player_id'] ?? $choice['id'] ?? 0) : (int)$choice;
        if ($choice_id > 0 && !in_array($choice_id, $used_user_shooter_ids, true)) {
            foreach ($user_shooters as $shooter) {
                if ((int)($shooter['player_id'] ?? 0) === $choice_id) {
                    $used_user_shooter_ids[] = $choice_id;
                    return $shooter;
                }
            }
        }
        $available = array_values(array_filter($user_shooters, fn($s) => !in_array((int)($s['player_id'] ?? 0), $used_user_shooter_ids, true)));
        $picked = $available ? $available[array_rand($available)] : $user_shooters[array_rand($user_shooters)];
        $picked_id = (int)($picked['player_id'] ?? 0);
        if ($picked_id > 0) $used_user_shooter_ids[] = $picked_id;
        return $picked;
    };

    for ($i = 0; $i < 5; $i++) {
        $s       = $find_selected_shooter($i);
        $oppS    = $opp_shooters[$i % count($opp_shooters)];
        $u_rate  = min(0.90, max(0.50, ($s['shooting'] ?? 0) / 100 + $user_chem_bonus));
        $o_rate  = min(0.90, max(0.50, ($oppS['shooting'] ?? 0) / 100 + $opp_chem_bonus));
        $u_sc    = rand_float() < $u_rate;
        $o_sc    = rand_float() < $o_rate;
        if ($u_sc) $user_score++;
        if ($o_sc) $opp_score++;
        $kicks[] = [
            'round' => $i + 1,
            'player_id' => (int)($s['player_id'] ?? 0),
            'player' => $s['name'] ?? 'Player',
            'player_card_url' => (string)($s['card_url'] ?? ''),
            'player_image_url' => (string)($s['image_url'] ?? ''),
            'opp_player' => $oppS['name'] ?? 'Opponent',
            'opp_player_card_url' => (string)($oppS['card_url'] ?? ''),
            'opp_player_image_url' => (string)($oppS['image_url'] ?? ''),
            'user_scored' => $u_sc,
            'opp_scored' => $o_sc,
            'user_total' => $user_score,
            'opp_total' => $opp_score,
            'sudden' => false
        ];
    }
    $sd = 0;
    while ($user_score === $opp_score && $sd < 10) {
        $sd++;
        $s    = $user_shooters[array_rand($user_shooters)];
        $oppS = $opp_shooters[array_rand($opp_shooters)];
        $u_sc = rand_float() < min(0.92, max(0.52, ($s['shooting'] ?? 0) / 100 + $user_chem_bonus));
        $o_sc = rand_float() < min(0.92, max(0.52, ($oppS['shooting'] ?? 0) / 100 + $opp_chem_bonus));
        if ($u_sc) $user_score++;
        if ($o_sc) $opp_score++;
        $kicks[] = [
            'round' => $sd,
            'player_id' => (int)($s['player_id'] ?? 0),
            'player' => $s['name'] ?? 'Player',
            'player_card_url' => (string)($s['card_url'] ?? ''),
            'player_image_url' => (string)($s['image_url'] ?? ''),
            'opp_player' => $oppS['name'] ?? 'Opponent',
            'opp_player_card_url' => (string)($oppS['card_url'] ?? ''),
            'opp_player_image_url' => (string)($oppS['image_url'] ?? ''),
            'user_scored' => $u_sc,
            'opp_scored' => $o_sc,
            'user_total' => $user_score,
            'opp_total' => $opp_score,
            'sudden' => true
        ];
    }
    if ($user_score === $opp_score) $user_score++;
    $result   = $user_score > $opp_score ? 'W' : 'L';
    $shootout_stats = ['mode' => 'shootout', 'opponent' => $opp_name];
    $division = division_apply_result($cnx, (int)$user['id'], $result, $user_score, $opp_score, $shootout_stats, 'shootout');
    $dp = $division['points_awarded'];
    $new_pts = $division['new_points'];
    $new_rank = $division['new_rank'];
    $shootout_stats['dp_change'] = $dp;
    $shootout_stats['division_award'] = $division;
    $shootout_stats['new_points'] = $new_pts;
    $shootout_stats['new_rank'] = $new_rank;
    persist_user_match(
        $cnx,
        (int)$user['id'],
        (int)$opponent['uid'],
        $lid,
        (int)$opponent['lineup_id'],
        $result,
        $user_score,
        $opp_score,
        $shootout_stats,
        $kicks
    );
    $challenge_updates = [];
    if ($result === 'W') collect_challenge_updates($challenge_updates, update_challenge_progress($user['id'], 'win_streak', 1));
    collect_challenge_updates($challenge_updates, update_challenge_progress($user['id'], 'division_points', $dp));

    send_ok([
        'result'     => $result,
        'user_score' => $user_score,
        'opp_score'  => $opp_score,
        'opponent'   => $opp_name,
        'kicks'      => $kicks,
        'dp_change'  => $dp,
        'new_points' => $new_pts,
        'new_rank'   => $new_rank,
        'challenge_updates' => $challenge_updates,
    ]);
}


