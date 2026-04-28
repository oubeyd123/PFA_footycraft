<?php
declare(strict_types=1);

const FORMATIONS = [
    '4-3-3' => ['GK', 'LB', 'CB1', 'CB2', 'RB', 'LCM', 'CM', 'RCM', 'LW', 'ST', 'RW'],
    '4-4-2' => ['GK', 'LB', 'CB1', 'CB2', 'RB', 'LM', 'LCM', 'RCM', 'RM', 'ST1', 'ST2'],
    '4-2-3-1' => ['GK', 'LB', 'CB1', 'CB2', 'RB', 'CDM1', 'CDM2', 'LAM', 'CAM', 'RAM', 'ST'],
    '3-5-2' => ['GK', 'CB1', 'CB2', 'CB3', 'LWB', 'LCM', 'CM', 'RCM', 'RWB', 'ST1', 'ST2'],
    '3-4-3' => ['GK', 'CB1', 'CB2', 'CB3', 'LM', 'LCM', 'RCM', 'RM', 'LW', 'ST', 'RW'],
    '4-1-2-1-2' => ['GK', 'LB', 'CB1', 'CB2', 'RB', 'CDM', 'LCM', 'RCM', 'CAM', 'ST1', 'ST2'],
    '5-3-2' => ['GK', 'LWB', 'CB1', 'CB2', 'CB3', 'RWB', 'LCM', 'CM', 'RCM', 'ST1', 'ST2'],
    '4-5-1' => ['GK', 'LB', 'CB1', 'CB2', 'RB', 'LM', 'LCM', 'CM', 'RCM', 'RM', 'ST'],
    '4-3-2-1' => ['GK', 'LB', 'CB1', 'CB2', 'RB', 'LCM', 'CM', 'RCM', 'LAM', 'RAM', 'ST'],
    '4-2-2-2' => ['GK', 'LB', 'CB1', 'CB2', 'RB', 'CDM1', 'CDM2', 'LAM', 'RAM', 'ST1', 'ST2'],
];

const POSITION_MAP = [
    'GK' => ['GK'],
    'LB' => ['LB', 'LWB', 'CB'],
    'CB1' => ['CB', 'LB', 'RB'],
    'CB2' => ['CB', 'LB', 'RB'],
    'CB3' => ['CB'],
    'RB' => ['RB', 'RWB', 'CB'],
    'LWB' => ['LWB', 'LB'],
    'RWB' => ['RWB', 'RB'],
    'CDM1' => ['CDM', 'CM'],
    'CDM2' => ['CDM', 'CM'],
    'CDM' => ['CDM', 'CM'],
    'LCM' => ['CM', 'CAM', 'CDM'],
    'CM' => ['CM', 'CAM', 'CDM'],
    'RCM' => ['CM', 'CAM', 'CDM'],
    'LM' => ['LM', 'LW', 'CM'],
    'RM' => ['RM', 'RW', 'CM'],
    'CAM' => ['CAM', 'CM', 'LW', 'RW'],
    'LAM' => ['CAM', 'CM', 'LW'],
    'RAM' => ['CAM', 'CM', 'RW'],
    'LW' => ['LW', 'LM', 'ST', 'CAM'],
    'RW' => ['RW', 'RM', 'ST', 'CAM'],
    'ST' => ['ST', 'LW', 'RW'],
    'ST1' => ['ST', 'LW', 'RW'],
    'ST2' => ['ST', 'LW', 'RW'],
];

const FORMATION_ADJACENCY = [
    '4-3-3' => [
        'GK' => ['CB1', 'CB2'],
        'LB' => ['CB1', 'LCM'],
        'CB1' => ['GK', 'LB', 'CM'],
        'CB2' => ['GK', 'RB', 'CM'],
        'RB' => ['CB2', 'RCM'],
        'LCM' => ['LB', 'CM', 'LW'],
        'CM' => ['LCM', 'RCM', 'ST', 'CB1', 'CB2'],
        'RCM' => ['RB', 'CM', 'RW'],
        'LW' => ['LCM', 'ST'],
        'ST' => ['LW', 'RW', 'CM'],
        'RW' => ['RCM', 'ST'],
    ],
    '4-4-2' => [
        'GK' => ['CB1', 'CB2'],
        'LB' => ['CB1', 'LM'],
        'CB1' => ['GK', 'LB', 'LCM'],
        'CB2' => ['GK', 'RB', 'RCM'],
        'RB' => ['CB2', 'RM'],
        'LM' => ['LB', 'LCM', 'ST1'],
        'LCM' => ['CB1', 'LM', 'RCM'],
        'RCM' => ['CB2', 'RM', 'LCM'],
        'RM' => ['RB', 'RCM', 'ST2'],
        'ST1' => ['LM', 'ST2'],
        'ST2' => ['RM', 'ST1'],
    ],
    '4-2-3-1' => [
        'GK' => ['CB1', 'CB2'],
        'LB' => ['CB1', 'CDM1'],
        'CB1' => ['GK', 'LB', 'CDM1'],
        'CB2' => ['GK', 'RB', 'CDM2'],
        'RB' => ['CB2', 'CDM2'],
        'CDM1' => ['LB', 'CB1', 'CDM2', 'CAM'],
        'CDM2' => ['RB', 'CB2', 'CDM1', 'CAM'],
        'LAM' => ['CAM', 'ST'],
        'CAM' => ['CDM1', 'CDM2', 'LAM', 'RAM', 'ST'],
        'RAM' => ['CAM', 'ST'],
        'ST' => ['CAM', 'LAM', 'RAM'],
    ],
    '3-5-2' => [
        'GK' => ['CB2'],
        'CB1' => ['CB2', 'LWB', 'LCM'],
        'CB2' => ['GK', 'CB1', 'CB3', 'CM'],
        'CB3' => ['CB2', 'RWB', 'RCM'],
        'LWB' => ['CB1', 'LCM'],
        'LCM' => ['LWB', 'CM', 'ST1'],
        'CM' => ['CB2', 'LCM', 'RCM', 'ST1', 'ST2'],
        'RCM' => ['RWB', 'CM', 'ST2'],
        'RWB' => ['CB3', 'RCM'],
        'ST1' => ['LCM', 'CM', 'ST2'],
        'ST2' => ['RCM', 'CM', 'ST1'],
    ],
    '3-4-3' => [
        'GK' => ['CB2'],
        'CB1' => ['CB2', 'LM'],
        'CB2' => ['GK', 'CB1', 'CB3', 'CM'],
        'CB3' => ['CB2', 'RM'],
        'LM' => ['CB1', 'CM', 'LW'],
        'LCM' => [],
        'RCM' => [],
        'RM' => ['CB3', 'CM', 'RW'],
        'LW' => ['LM', 'ST'],
        'ST' => ['LW', 'RW', 'CM'],
        'RW' => ['RM', 'ST'],
        'CM' => ['CB2', 'LM', 'RM', 'ST'],
    ],
    '4-1-2-1-2' => [
        'GK' => ['CB1', 'CB2'],
        'LB' => ['CB1', 'LCM'],
        'CB1' => ['GK', 'LB', 'CDM'],
        'CB2' => ['GK', 'RB', 'CDM'],
        'RB' => ['CB2', 'RCM'],
        'CDM' => ['CB1', 'CB2', 'LCM', 'RCM'],
        'LCM' => ['LB', 'CDM', 'CAM'],
        'RCM' => ['RB', 'CDM', 'CAM'],
        'CAM' => ['LCM', 'RCM', 'ST1', 'ST2'],
        'ST1' => ['CAM', 'ST2'],
        'ST2' => ['CAM', 'ST1'],
    ],
    '5-3-2' => [
        'GK' => ['CB2'],
        'LWB' => ['CB1', 'LCM'],
        'CB1' => ['CB2', 'LWB', 'LCM'],
        'CB2' => ['GK', 'CB1', 'CB3', 'CM'],
        'CB3' => ['CB2', 'RWB', 'RCM'],
        'RWB' => ['CB3', 'RCM'],
        'LCM' => ['LWB', 'CM', 'ST1'],
        'CM' => ['CB2', 'LCM', 'RCM'],
        'RCM' => ['RWB', 'CM', 'ST2'],
        'ST1' => ['LCM', 'ST2'],
        'ST2' => ['RCM', 'ST1'],
    ],
    '4-5-1' => [
        'GK' => ['CB1', 'CB2'],
        'LB' => ['CB1', 'LM'],
        'CB1' => ['GK', 'LB', 'LCM'],
        'CB2' => ['GK', 'RB', 'RCM'],
        'RB' => ['CB2', 'RM'],
        'LM' => ['LB', 'LCM', 'ST'],
        'LCM' => ['CB1', 'LM', 'CM'],
        'CM' => ['LCM', 'RCM', 'ST'],
        'RCM' => ['CB2', 'RM', 'CM'],
        'RM' => ['RB', 'RCM', 'ST'],
        'ST' => ['LM', 'RM', 'CM'],
    ],
    '4-3-2-1' => [
        'GK' => ['CB1', 'CB2'],
        'LB' => ['CB1', 'LCM'],
        'CB1' => ['GK', 'LB', 'CM'],
        'CB2' => ['GK', 'RB', 'CM'],
        'RB' => ['CB2', 'RCM'],
        'LCM' => ['LB', 'CM', 'LAM'],
        'CM' => ['LCM', 'RCM', 'ST', 'CB1', 'CB2'],
        'RCM' => ['RB', 'CM', 'RAM'],
        'LAM' => ['LCM', 'ST'],
        'RAM' => ['RCM', 'ST'],
        'ST' => ['LAM', 'RAM', 'CM'],
    ],
    '4-2-2-2' => [
        'GK' => ['CB1', 'CB2'],
        'LB' => ['CB1', 'LAM'],
        'CB1' => ['GK', 'LB', 'CDM1'],
        'CB2' => ['GK', 'RB', 'CDM2'],
        'RB' => ['CB2', 'RAM'],
        'CDM1' => ['CB1', 'CDM2', 'LAM'],
        'CDM2' => ['CB2', 'CDM1', 'RAM'],
        'LAM' => ['LB', 'CDM1', 'RAM', 'ST1'],
        'RAM' => ['RB', 'CDM2', 'LAM', 'ST2'],
        'ST1' => ['LAM', 'ST2'],
        'ST2' => ['RAM', 'ST1'],
    ],
];

const CHEST_COOLDOWNS_HRS = ['bronze' => 24, 'silver' => 120, 'gold' => 168];

const CHEST_POOL = [
    'bronze' => [
        ['rarity' => 'common', 'weight' => 700],
        ['rarity' => 'rare', 'weight' => 250],
        ['rarity' => 'epic', 'weight' => 48],
        ['rarity' => 'legend', 'weight' => 2],
    ],
    'silver' => [
        ['rarity' => 'common', 'weight' => 380],
        ['rarity' => 'rare', 'weight' => 440],
        ['rarity' => 'epic', 'weight' => 130],
        ['rarity' => 'legend', 'weight' => 45],
        ['rarity' => 'icon', 'weight' => 5],
    ],
    'gold' => [
        ['rarity' => 'common', 'weight' => 80],
        ['rarity' => 'rare', 'weight' => 360],
        ['rarity' => 'epic', 'weight' => 380],
        ['rarity' => 'legend', 'weight' => 155],
        ['rarity' => 'icon', 'weight' => 25],
    ],
];

const CHEST_REWARD_COUNT = ['bronze' => 3, 'silver' => 5, 'gold' => 8];

const DIVISION_NAMES = [
    1 => 'Division 1',
    2 => 'Division 2',
    3 => 'Division 3',
    4 => 'Division 4',
    5 => 'Division 5',
];

const DIVISION_RULES = [
    1 => ['promotion' => 30, 'minimum' => 15, 'matches' => 10],
    2 => ['promotion' => 27, 'minimum' => 13, 'matches' => 10],
    3 => ['promotion' => 24, 'minimum' => 11, 'matches' => 10],
    4 => ['promotion' => 21, 'minimum' => 9, 'matches' => 10],
    5 => ['promotion' => 18, 'minimum' => 0, 'matches' => 10],
];

const GOAL_COMMENTARY = [
    '{player} finds the net! Absolutely stunning finish!',
    '{player} scores! The crowd goes absolutely wild!',
    '{player} with a powerful strike! It\'s in the back of the net!',
    'GOAL! {player} makes no mistake from close range!',
    '{player} latches on and slots it home with precision!',
    'What a moment! {player} puts it away with confidence!',
    '{player} curls it into the top corner - unstoppable!',
    'Clinical finishing from {player}! That\'s a brilliant goal!',
];

const OPP_GOAL_COMMENTARY = [
    'The opponent pulls one back through {player}. Danger!',
    '{player} equalises for the opposition - game on!',
    'Goal conceded! {player} punishes a defensive lapse.',
    'That hurts! {player} fires home to swing momentum.',
    'The keeper had no chance - {player} scores for the opponents.',
    '{player} with a composed finish. The opponent is alive!',
];

const SAVE_COMMENTARY = [
    'Incredible save! The keeper denies {player} at point blank range!',
    '{player} thought he had scored but the goalkeeper is equal to it!',
    'The goalkeeper flies to his right - brilliant stop to deny {player}!',
    'What a reflex save! {player}\'s effort tipped over the bar!',
    'Point-blank save! Outstanding goalkeeping against {player}!',
];

const MISS_COMMENTARY = [
    '{player} blazes over the bar! Should have scored there.',
    'So close! {player} rattles the woodwork - agonising!',
    '{player} curls just wide - that was a golden chance!',
    'Incredible miss! {player} somehow puts that over the bar!',
    '{player} hits the post! The frame of the goal keeps it out!',
    'A chance squandered by {player} - that could prove costly.',
];

const FOUL_COMMENTARY = [
    '{player} brings down the attacker. Referee points to the spot? No - free kick.',
    'Reckless challenge by {player}. The referee has a word.',
    '{player} clips his man and the referee awards a free kick.',
    'A dangerous tackle from {player} earns a yellow card!',
];

const CORNER_COMMENTARY = [
    'Corner won by the attacking side. Ball swings in...',
    'Another corner - pressure is mounting in the box!',
    'Set-piece situation from the flag. Can they capitalise?',
];

const PRESSURE_COMMENTARY = [
    'The tempo is relentless - both sides pushing for the opener.',
    'End-to-end football here as neither side gives an inch.',
    'A cagey start to proceedings - both managers setting up carefully.',
    'The game is opening up. Quality on display from both teams.',
    'Brilliant interchange of passes before the chance breaks down.',
    'It\'s a chess match out there - tactics are key tonight.',
    'The crowd is on their feet! This is an incredible match!',
    'Both keepers have been tested - quality football on show.',
];

function fetch_eligible_opponents(int $currentUserId, ?int $divisionPoints = null, int $limit = 10, int $minFilledSlots = 11): array
{
    global $cnx;
    $orderBy = $divisionPoints === null
        ? 'RANDOM()'
        : 'ABS(u.division_points - ?), RANDOM()';

    $params = [$currentUserId];

    $params[] = $minFilledSlots;

    if ($divisionPoints !== null) {
        $params[] = $divisionPoints;
    }

    $params[] = $limit;

                                                                                 
    return getRows($cnx,
        "SELECT
            u.id,
            u.username,
            u.division_points,
            u.division_level,
            u.active_lineup_id,
            l.chemistry,
            l.rating,
            l.formation,
            COUNT(DISTINCT ls.slot_code) AS filled_slots
         FROM users u
         JOIN lineups l
           ON l.id = u.active_lineup_id
          AND l.user_id = u.id
         LEFT JOIN lineup_slots ls
           ON ls.lineup_id = l.id
          AND ls.player_id IS NOT NULL
         WHERE u.id != ?
         GROUP BY u.id, u.username, u.division_points, u.division_level,
                  u.active_lineup_id, l.id, l.chemistry, l.rating, l.formation
         HAVING COUNT(DISTINCT ls.slot_code) >= ?
         ORDER BY {$orderBy}
         LIMIT ?",
        $params
    );
}

function pick_match_opponent(int $currentUserId, int $divisionPoints, int $limit = 10, int $minFilledSlots = 11)
{
    global $cnx;
    $eligibleOpponents = fetch_eligible_opponents($currentUserId, $divisionPoints, max($limit, 20), $minFilledSlots);
    $lastMatch = getRow(
        $cnx,
        'SELECT opponent_user_id FROM matches WHERE user_id=? AND opponent_user_id IS NOT NULL ORDER BY created_at DESC, id DESC LIMIT 1',
        [$currentUserId]
    );
    $lastOpponentId = (int)($lastMatch['opponent_user_id'] ?? 0);
    if ($lastOpponentId && count($eligibleOpponents) > 1) {
        $filtered = array_values(array_filter(
            $eligibleOpponents,
            fn($opponent) => (int)($opponent['id'] ?? 0) !== $lastOpponentId
        ));
        if ($filtered) {
            $eligibleOpponents = $filtered;
        }
    }
    return $eligibleOpponents ? $eligibleOpponents[array_rand($eligibleOpponents)] : null;
}

function pick_tournament_opponents(int $currentUserId, int $divisionPoints, int $count = 3, int $limit = 20, int $minFilledSlots = 11): array
{
    $eligibleOpponents = fetch_eligible_opponents($currentUserId, $divisionPoints, max($count, $limit), $minFilledSlots);

    if (count($eligibleOpponents) < $count) {
        return [];
    }

    shuffle($eligibleOpponents);

    return array_slice($eligibleOpponents, 0, $count);
}

function opponent_match_data($opponent): array
{
    return [
        'uid' => (int) $opponent['id'],
        'username' => (string) $opponent['username'],
        'lineup_id' => (int) $opponent['active_lineup_id'],
        'chem' => (float) ($opponent['chemistry'] ?? 0),
        'division_points' => (int) ($opponent['division_points'] ?? 0),
        'division_rank' => (int) ($opponent['division_level'] ?? $opponent['division_rank'] ?? 0),
        'filled_slots' => (int) ($opponent['filled_slots'] ?? 0),
    ];
}

function division_level_from_row($row): int
{
    $level = (int)($row['division_level'] ?? $row['division_rank'] ?? 5);
    return max(1, min(5, $level));
}

function division_rules(int $level): array
{
    $level = max(1, min(5, $level));
    return DIVISION_RULES[$level];
}

function division_form_from_row($row): array
{
    $decoded = json_decode((string)($row['division_form'] ?? '[]'), true);
    if (!is_array($decoded)) return [];
    return array_slice(array_values(array_filter($decoded, fn($v) => in_array($v, ['W', 'D', 'L'], true))), -5);
}

function division_match_points(string $result, int $score_for, int $score_against, array $stats, string $mode = 'quickmatch', array $options = []): array
{
    if (!empty($options['forfeit'])) {
        return ['points' => 0, 'base' => 0, 'bonus' => 0, 'bonuses' => []];
    }

    if (!empty($options['forfeit_award'])) {
        return ['points' => 3, 'base' => 3, 'bonus' => 0, 'bonuses' => ['forfeit win']];
    }

    if ($mode === 'shootout') {
        $points = $result === 'W' ? 1 : 0;
        return ['points' => $points, 'base' => $points, 'bonus' => 0, 'bonuses' => $points ? ['shootout win'] : []];
    }

    $base = $result === 'W' ? 3 : ($result === 'D' ? 1 : 0);
    $bonuses = [];
    $xg_for = (float)($stats['xg_for'] ?? 0);
    $xg_against = (float)($stats['xg_against'] ?? 0);
    $possession = (int)($stats['possession'] ?? 0);

    if ($xg_for > $xg_against || $possession > 60) {
        $bonuses[] = 'performance';
    }
    if ($score_against === 0) {
        $bonuses[] = 'clean sheet';
    }
    if ($result === 'W' && ($score_for - $score_against) >= 2) {
        $bonuses[] = 'goal margin';
    }

    $bonus = count($bonuses);
    return ['points' => $base + $bonus, 'base' => $base, 'bonus' => $bonus, 'bonuses' => $bonuses];
}

function division_status_payload(PDO $cnx, int $user_id): array
{
    $row = getRow($cnx, 'SELECT * FROM users WHERE id=? LIMIT 1', [$user_id]);
    $level = division_level_from_row($row);
    $rules = division_rules($level);
    $points = (int)($row['division_points'] ?? 0);
    $played = (int)($row['division_matches_played'] ?? 0);
    $promotion = (int)$rules['promotion'];
    $minimum = (int)$rules['minimum'];
    $limit = (int)$rules['matches'];
    $progress = min(100, (int)round(($points / max(1, $promotion)) * 100));
    $status = $points >= $promotion ? ($level === 1 ? 'Title pace' : 'Promotion zone') : ($points < $minimum && $played >= 6 ? 'Relegation risk' : 'On track');

    return [
        'division_level' => $level,
        'division_rank' => $level,
        'division_name' => DIVISION_NAMES[$level] ?? 'Division 5',
        'division_points' => $points,
        'points' => $points,
        'promotion_points' => $promotion,
        'minimum_points' => $minimum,
        'matches_played' => $played,
        'match_limit' => $limit,
        'wins' => (int)($row['division_wins'] ?? 0),
        'draws' => (int)($row['division_draws'] ?? 0),
        'losses' => (int)($row['division_losses'] ?? 0),
        'goals_for' => (int)($row['division_goals_for'] ?? 0),
        'goals_against' => (int)($row['division_goals_against'] ?? 0),
        'goal_difference' => (int)($row['division_goals_for'] ?? 0) - (int)($row['division_goals_against'] ?? 0),
        'form' => division_form_from_row($row),
        'progress' => $progress,
        'status' => $status,
        'last_outcome' => (string)($row['division_last_outcome'] ?? ''),
        'last_level' => (int)($row['division_last_level'] ?? $level),
        'last_points' => (int)($row['division_last_points'] ?? 0),
    ];
}

function division_apply_result(PDO $cnx, int $user_id, string $result, int $score_for, int $score_against, array $stats, string $mode, array $options = []): array
{
    $row = getRow($cnx, 'SELECT * FROM users WHERE id=? LIMIT 1', [$user_id]);
    $level = division_level_from_row($row);
    $rules = division_rules($level);
    $points_data = division_match_points($result, $score_for, $score_against, $stats, $mode, $options);
    $points = (int)$points_data['points'];
    $played = (int)($row['division_matches_played'] ?? 0) + 1;
    $cycle_points = (int)($row['division_points'] ?? 0) + $points;
    $wins = (int)($row['division_wins'] ?? 0) + ($result === 'W' ? 1 : 0);
    $draws = (int)($row['division_draws'] ?? 0) + ($result === 'D' ? 1 : 0);
    $losses = (int)($row['division_losses'] ?? 0) + ($result === 'L' ? 1 : 0);
    $gf = (int)($row['division_goals_for'] ?? 0) + $score_for;
    $ga = (int)($row['division_goals_against'] ?? 0) + $score_against;
    $form = division_form_from_row($row);
    $form[] = $result;
    $form = array_slice($form, -5);
    $outcome = '';
    $last_level = $level;
    $last_points = $cycle_points;

    if ($played >= (int)$rules['matches']) {
        if ($cycle_points >= (int)$rules['promotion'] && $level > 1) {
            $level--;
            $outcome = 'promoted';
        } elseif ($cycle_points < (int)$rules['minimum'] && $level < 5) {
            $level++;
            $outcome = 'relegated';
        } else {
            $outcome = $level === 1 && $cycle_points >= (int)$rules['promotion'] ? 'champion' : 'stayed';
        }

        $played = 0;
        $cycle_points = 0;
        $wins = 0;
        $draws = 0;
        $losses = 0;
        $gf = 0;
        $ga = 0;
    }

    execute(
        $cnx,
        'UPDATE users
         SET division_level=?, division_points=?, division_matches_played=?,
             division_wins=?, division_draws=?, division_losses=?,
             division_goals_for=?, division_goals_against=?, division_form=?,
             division_last_outcome=?, division_last_level=?, division_last_points=?
         WHERE id=?',
        [$level, $cycle_points, $played, $wins, $draws, $losses, $gf, $ga, json_encode($form), $outcome, $last_level, $last_points, $user_id]
    );

    $status = division_status_payload($cnx, $user_id);
    return [
        'points_awarded' => $points,
        'base_points' => (int)$points_data['base'],
        'bonus_points' => (int)$points_data['bonus'],
        'bonuses' => $points_data['bonuses'],
        'new_points' => (int)$status['division_points'],
        'new_rank' => (int)$status['division_level'],
        'new_division' => (int)$status['division_level'],
        'cycle_completed' => $outcome !== '',
        'cycle_outcome' => $outcome,
        'status' => $status,
    ];
}

function division_apply_bonus(PDO $cnx, int $user_id, int $points, string $reason): array
{
    $row = getRow($cnx, 'SELECT * FROM users WHERE id=? LIMIT 1', [$user_id]);
    $level = division_level_from_row($row);
    $points = max(0, $points);
    $matches_played = (int)($row['division_matches_played'] ?? 0);
    $last_outcome = (string)($row['division_last_outcome'] ?? '');

    if ($matches_played === 0 && $last_outcome !== '') {
        $last_level = division_level_from_row(['division_level' => (int)($row['division_last_level'] ?? $level)]);
        $last_points = (int)($row['division_last_points'] ?? 0) + $points;
        $rules = division_rules($last_level);
        $new_level = $last_level;
        $outcome = 'stayed';

        if ($last_points >= (int)$rules['promotion'] && $last_level > 1) {
            $new_level = $last_level - 1;
            $outcome = 'promoted';
        } elseif ($last_points < (int)$rules['minimum'] && $last_level < 5) {
            $new_level = $last_level + 1;
            $outcome = 'relegated';
        } elseif ($last_level === 1 && $last_points >= (int)$rules['promotion']) {
            $outcome = 'champion';
        }

        execute(
            $cnx,
            'UPDATE users
             SET division_level=?, division_last_points=?, division_last_outcome=?
             WHERE id=?',
            [$new_level, $last_points, $outcome, $user_id]
        );
    } else {
        $cycle_points = (int)($row['division_points'] ?? 0) + $points;
        execute(
            $cnx,
            'UPDATE users SET division_level=?, division_points=? WHERE id=?',
            [$level, $cycle_points, $user_id]
        );
    }

    $status = division_status_payload($cnx, $user_id);
    return [
        'points_awarded' => $points,
        'reason' => $reason,
        'new_points' => (int)$status['division_points'],
        'new_rank' => (int)$status['division_level'],
        'new_division' => (int)$status['division_level'],
        'status' => $status,
    ];
}
