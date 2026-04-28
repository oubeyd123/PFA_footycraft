<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/models/Lineup.php';

require_once ROOT_DIR . '/config/database.php';
global $cnx;
if (($_GET['group'] ?? '') === 'team') {
    $action = $_GET['action'] ?? '';
    if ($action === 'chemistry') {
        team_chemistry();
    } elseif ($action === 'advice') {
        team_advice();
    } elseif ($action === 'autobuild') {
        team_autobuild();
    } else {
        send_err('Not found', 404);
    }
}

function formation_adjacency_map(string $formation): array {
    return FORMATION_ADJACENCY[$formation] ?? FORMATION_ADJACENCY['4-3-3'];
}

function player_slot_links($player, array $adj_codes, array $by_slot, string $slot_code): int {
    if (!($player['nation'] ?? null)) {
        return 0;
    }

    $links = 0;
    foreach ($adj_codes as $adj) {
        $nb = $by_slot[$adj] ?? null;
        if (!$nb || !($nb['nation'] ?? null)) {
            continue;
        }
        if (($player['club'] ?? '') !== '' && $player['club'] === $nb['club']) {
            $links += 3;
        } elseif (($player['league'] ?? '') !== '' && $player['league'] === $nb['league']) {
            $links += 2;
        } elseif (($player['nation'] ?? '') !== '' && $player['nation'] === $nb['nation']) {
            $links += 2;
        }
    }

    $pos_ok = POSITION_MAP[$slot_code] ?? [$player['position'] ?? ''];
    if (!in_array($player['position'] ?? '', $pos_ok, true)) {
        $links = max(0, $links - 2);
    }

    return $links;
}

function links_to_slot_chem(int $links): int {
    if ($links >= 6) return 3;
    if ($links >= 3) return 2;
    if ($links >= 1) return 1;
    return 0;
}

function lineup_slots_with_players(int $lineup_id, string $fields): array {
    global $cnx;
    $stmt = $cnx->prepare(
        "SELECT ls.slot_code, ls.position_required, {$fields}
         FROM lineup_slots ls LEFT JOIN players p ON p.id = ls.player_id
         WHERE ls.lineup_id=?"
    );
    $stmt->execute([$lineup_id]);
    return $stmt->fetchAll();
}

function calc_chemistry(int $lineup_id): array {
    global $cnx;
    $stmt = $cnx->prepare('SELECT formation FROM lineups WHERE id=? LIMIT 1');
    $stmt->execute([$lineup_id]);
    $lineup = $stmt->fetch();
    $formation = $lineup['formation'] ?? '4-3-3';
    $adjacency = formation_adjacency_map($formation);

    $slots = lineup_slots_with_players(
        $lineup_id,
        'p.nation, p.league, p.club, p.position, p.overall'
    );

    $by_slot = [];
    foreach ($slots as $s) {
        $by_slot[$s['slot_code']] = $s;
    }

    $team_chem = 0;
    $filled = [];

    foreach ($by_slot as $slot_code => $player) {
        if (!($player['nation'] ?? null)) {
            continue;
        }

        $filled[] = $player;
        $adj_codes = $adjacency[$slot_code] ?? [];
        $links = player_slot_links($player, $adj_codes, $by_slot, $slot_code);
        $team_chem += links_to_slot_chem($links);
    }

    $overalls = array_filter(array_column($filled, 'overall'));
    $team_rating = count($overalls) > 0 ? round(array_sum($overalls) / count($overalls), 1) : 0.0;

    return [min(33, $team_chem), (float)$team_rating];
}

function team_input_model(): Lineup {
    $input = new Lineup();
    $input->lineup_id = (int)($_POST['lineup_id'] ?? 0);

    return $input;
}

function team_chemistry(): void {
    global $cnx;
    $user = require_auth();
    $input = team_input_model();
    $lid   = (int)($input->lineup_id ?? 0);

    $stmt = $cnx->prepare('SELECT * FROM lineups WHERE id=? AND user_id=? LIMIT 1');
    $stmt->execute([$lid, $user['id']]);
    $lineup = $stmt->fetch();
    if (!$lineup) send_err('Lineup not found', 404);

    [$chem, $rating] = calc_chemistry($lid);
    $adjacency = formation_adjacency_map($lineup['formation'] ?? '4-3-3');

    $slots = lineup_slots_with_players(
        $lid,
        'p.nation, p.league, p.club, p.position'
    );

    $by_slot = [];
    foreach ($slots as $s) {
        $by_slot[$s['slot_code']] = $s;
    }

    $slot_chem = [];
    foreach ($by_slot as $slot_code => $player) {
        if (!($player['nation'] ?? null)) {
            $slot_chem[$slot_code] = 0;
            continue;
        }

        $adj_codes = $adjacency[$slot_code] ?? [];
        $links = player_slot_links($player, $adj_codes, $by_slot, $slot_code);
        $slot_chem[$slot_code] = links_to_slot_chem($links);
    }

    send_ok(['chemistry' => $chem, 'rating' => $rating, 'slot_chemistry' => $slot_chem]);
}

function team_advice(): void {
    global $cnx;
    $user = require_auth();
    $input = team_input_model();
    $lid   = (int)($input->lineup_id ?? 0);

    $stmt = $cnx->prepare('SELECT * FROM lineups WHERE id=? AND user_id=? LIMIT 1');
    $stmt->execute([$lid, $user['id']]);
    $lineup = $stmt->fetch();
    if (!$lineup) send_err('Lineup not found', 404);

    $adjacency = formation_adjacency_map($lineup['formation'] ?? '4-3-3');
    $slots = lineup_slots_with_players(
        $lid,
        'p.name, p.nation, p.league, p.club, p.position, p.overall'
    );

    $by_slot = [];
    foreach ($slots as $s) {
        $by_slot[$s['slot_code']] = $s;
    }

    $filled = array_filter($by_slot, fn($s) => ($s['nation'] ?? null));
    $empty = array_keys(array_filter($by_slot, fn($s) => !($s['nation'] ?? null)));
    $tips = [];

    if ($empty) {
        $tips[] = 'You have ' . count($empty) . ' empty slot(s): ' . implode(', ', $empty) . '. Fill them to improve chemistry and rating.';
    }

    foreach ($by_slot as $slot_code => $player) {
        if (!($player['nation'] ?? null)) {
            continue;
        }

        $adj_codes = $adjacency[$slot_code] ?? [];
        $links = player_slot_links($player, $adj_codes, $by_slot, $slot_code);
        if ($links >= 3) {
            continue;
        }

        $neighbors = array_filter(
            array_map(fn($a) => $by_slot[$a] ?? null, $adj_codes),
            fn($n) => $n && ($n['nation'] ?? null)
        );
        if (!$neighbors) {
            continue;
        }

        $leagues = array_filter(array_column(array_values($neighbors), 'league'));
        $league_freq = $leagues ? array_count_values($leagues) : [];
        arsort($league_freq);
        $common = array_key_first($league_freq) ?? 'a common league';
        $tips[] = "{$player['name']} ({$slot_code}) has weak chemistry. Consider replacing that slot with a player from {$common}.";
    }

    [$chem, $rating] = calc_chemistry($lid);
    if ($chem < 15) {
        $tips[] = 'Team chemistry is low. Build around shared club, league, or nation links first.';
    } elseif ($chem < 24) {
        $tips[] = 'Chemistry is decent. Strengthen the central spine to push the squad higher.';
    } else {
        $tips[] = 'Chemistry is strong. Focus on upgrading the lowest-rated starters next.';
    }

    if ($rating < 80) {
        $sorted = array_values($filled);
        usort($sorted, fn($a, $b) => ($a['overall'] ?? 0) <=> ($b['overall'] ?? 0));
        foreach (array_slice($sorted, 0, 2) as $p) {
            $tips[] = "{$p['name']} ({$p['overall']} OVR) is one of the weaker starters. Upgrade that slot if possible.";
        }
    }

    send_ok(['tips' => array_values(array_unique($tips)), 'chemistry' => $chem, 'rating' => $rating]);
}

function team_autobuild(): void {
    global $cnx;
    try {
        $user = require_auth();
        $input = team_input_model();
        $lid   = (int)($input->lineup_id ?? 0);
        
        if ($lid <= 0) {
            send_err('Invalid lineup ID', 400);
        }

        $stmt = $cnx->prepare('SELECT * FROM lineups WHERE id=? AND user_id=? LIMIT 1');
        $stmt->execute([$lid, $user['id']]);
        $lineup = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$lineup) send_err('Lineup not found', 404);

        $formation = $lineup['formation'] ?? '4-3-3';
        $slots_order = FORMATIONS[$formation] ?? FORMATIONS['4-3-3'];
        $adjacency = formation_adjacency_map($formation);

        $stmt2 = $cnx->prepare('SELECT p.* FROM user_players up JOIN players p ON p.id=up.player_id WHERE up.user_id=?');
        $stmt2->execute([$user['id']]);
        $inventory = $stmt2->fetchAll(PDO::FETCH_ASSOC);
        if (!$inventory) send_err('No players in inventory. Open some chests first!', 400);
        $inventory = array_values(array_reduce($inventory, function (array $carry, array $player): array {
            $carry[(int)$player['id']] = $player;
            return $carry;
        }, []));

        $search = lineup_astar_search($slots_order, $adjacency, $inventory);
        $assignment = $search['assignment'] ?? [];

                                               
        foreach ($assignment as $slot_code => $player) {
            if ($player === null) {
                $stmt3 = $cnx->prepare('UPDATE lineup_slots SET player_id=NULL WHERE lineup_id=? AND slot_code=?');
                $stmt3->execute([$lid, $slot_code]);
            } else {
                $stmt3 = $cnx->prepare('UPDATE lineup_slots SET player_id=? WHERE lineup_id=? AND slot_code=?');
                $stmt3->execute([(int)$player['id'], $lid, $slot_code]);
            }
        }

                                                      
        [$chem, $rating] = calc_chemistry($lid);
        $stmt4 = $cnx->prepare('UPDATE lineups SET chemistry=?, rating=?, updated_at=NOW() WHERE id=?');
        $stmt4->execute([$chem, $rating, $lid]);

                                                
        $stmt5 = $cnx->prepare('SELECT * FROM lineups WHERE id=? LIMIT 1');
        $stmt5->execute([$lid]);
        $updated_lineup = $stmt5->fetch(PDO::FETCH_ASSOC);

                                                 
        $stmt6 = $cnx->prepare(
            'SELECT ls.slot_code, ls.position_required, p.id as player_id, p.name, p.overall,
                    p.position, p.nation, p.league, p.club,
                    p.pace, p.shooting, p.passing, p.dribbling, p.defending, p.physical,
                    p.rarity, p.card_type, p.card_url, p.image_url
             FROM lineup_slots ls LEFT JOIN players p ON p.id = ls.player_id
             WHERE ls.lineup_id=? ORDER BY ls.id'
        );
        $stmt6->execute([$lid]);
        $slots = $stmt6->fetchAll(PDO::FETCH_ASSOC);

                                                    
        $updated_lineup['slots'] = $slots;

        $challenge_updates = function_exists('validate_sbc_challenges_for_lineup')
            ? validate_sbc_challenges_for_lineup((int)$user['id'], $lid)
            : [];

                                                                           
        send_ok([
            'lineup' => $updated_lineup,
            'chemistry' => $chem,
            'rating' => $rating,
            'challenge_updates' => $challenge_updates
        ]);
    } catch (Exception $e) {
        send_err('Autobuild failed: ' . $e->getMessage(), 500);
    }
}
